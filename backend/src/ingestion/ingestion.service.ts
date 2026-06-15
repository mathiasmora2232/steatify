import { Injectable, Logger } from '@nestjs/common';
import { Prisma, PlaySource } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyTokensService } from '../spotify/spotify-tokens.service';
import { SpotifyApiService } from '../spotify/spotify-api.service';
import { AggregationService } from '../stats/aggregation.service';
import { AchievementsService } from '../achievements/achievements.service';
import { CatalogService } from '../catalog/catalog.service';
import { MusicEventsService } from '../events/music-events.service';
import type { SpotifyPlayHistoryItem } from '../spotify/spotify.types';

export interface SyncResult {
  userId: string;
  fetched: number;
  inserted: number;
}

/**
 * ETL for a single user's recently-played stream.
 *  Extract — pull /me/player/recently-played since our last cursor.
 *  Transform/Load — upsert the catalog, then bulk-insert deduped play rows.
 *  Enrich — backfill artist genres + audio features for new entities.
 *
 * Incremental + idempotent: the (userId, playedAt) unique index makes
 * re-running a sync a no-op for already-stored plays.
 */
@Injectable()
export class IngestionService {
  private readonly logger = new Logger(IngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: SpotifyTokensService,
    private readonly api: SpotifyApiService,
    private readonly catalog: CatalogService,
    private readonly aggregation: AggregationService,
    private readonly achievements: AchievementsService,
    private readonly events: MusicEventsService,
  ) {}

  async syncRecentPlays(userId: string): Promise<SyncResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { syncEnabled: true },
    });
    if (!user?.syncEnabled) {
      return { userId, fetched: 0, inserted: 0 };
    }

    const accessToken = await this.tokens.getValidAccessToken(userId);
    const after = await this.lastPlayCursor(userId);
    const { items } = await this.api.getRecentlyPlayed(accessToken, after);

    if (items.length === 0) {
      await this.touchSynced(userId);
      return { userId, fetched: 0, inserted: 0 };
    }

    // Load the catalog for every track we just saw.
    const trackMap = await this.catalog.upsertTracks(items.map((i) => i.track));
    const artistMap = await this.resolveArtists(items);

    const rows: Prisma.ListeningHistoryCreateManyInput[] = [];
    for (const item of items) {
      const trackId = trackMap.get(item.track.id);
      if (!trackId) continue; // track failed to upsert — skip rather than orphan a play
      const primarySpotify = item.track.artists?.[0]?.id;
      rows.push({
        userId,
        trackId,
        artistId: primarySpotify ? artistMap.get(primarySpotify) : undefined,
        playedAt: new Date(item.played_at),
        // The API doesn't report listened duration; approximate with track length.
        msPlayed: item.track.duration_ms,
        source: PlaySource.SPOTIFY_RECENT,
        contextType: item.context?.type,
        contextUri: item.context?.uri,
      });
    }

    const { count } = await this.prisma.listeningHistory.createMany({
      data: rows,
      skipDuplicates: true, // dedup via the (userId, playedAt) unique index
    });

    // Best-effort enrichment; failures here must not fail the whole sync.
    await this.enrich(accessToken, items).catch((e) =>
      this.logger.warn(`Enrichment failed for ${userId}: ${e instanceof Error ? e.message : e}`),
    );

    // Refresh the daily rollups + re-evaluate achievements for the new plays.
    if (count > 0) {
      // Correct listened-minutes from play gaps before aggregating.
      await this.aggregation
        .recomputeMsPlayed(userId, 3)
        .catch((e) =>
          this.logger.warn(`msPlayed recompute failed for ${userId}: ${e instanceof Error ? e.message : e}`),
        );
      await this.aggregation
        .recomputeRecentDays(userId, 3)
        .catch((e) =>
          this.logger.warn(`Aggregation failed for ${userId}: ${e instanceof Error ? e.message : e}`),
        );
      await this.achievements
        .evaluate(userId)
        .catch((e) =>
          this.logger.warn(`Achievements failed for ${userId}: ${e instanceof Error ? e.message : e}`),
        );
      await this.events
        .generate(userId)
        .catch((e) =>
          this.logger.warn(`Events failed for ${userId}: ${e instanceof Error ? e.message : e}`),
        );
    }

    await this.touchSynced(userId);
    this.logger.log(`Sync ${userId}: fetched=${items.length} inserted=${count}`);
    return { userId, fetched: items.length, inserted: count };
  }

  /**
   * Backfill track durations for the user's played tracks that have durationMs=0
   * (imported tracks were created with 0). Fixes under-counted minutes: fetches
   * real durations from Spotify, then re-derives msPlayed for recent plays.
   */
  async backfillDurations(userId: string, limit = 600): Promise<{ scanned: number; updated: number }> {
    const rows = await this.prisma.$queryRaw<Array<{ id: string; sid: string }>>`
      SELECT t.id, t."spotifyId" AS sid
      FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
      WHERE lh."userId" = ${userId} AND t."durationMs" = 0 AND t."spotifyId" ~ '^[A-Za-z0-9]{22}$'
      GROUP BY t.id, t."spotifyId" ORDER BY MAX(lh."playedAt") DESC LIMIT ${limit}
    `;
    if (rows.length === 0) return { scanned: 0, updated: 0 };

    const accessToken = await this.tokens.getValidAccessToken(userId);
    const tracks = await this.api.getTracks(accessToken, rows.map((r) => r.sid));
    const durBySid = new Map(tracks.map((t) => [t.id, t.duration_ms]));

    let updated = 0;
    for (const r of rows) {
      const d = durBySid.get(r.sid);
      if (d && d > 0) {
        await this.prisma.track.update({ where: { id: r.id }, data: { durationMs: d } });
        updated += 1;
      }
    }
    // Re-derive listened minutes for recent plays now that durations are known.
    await this.aggregation.recomputeMsPlayed(userId, 400).catch(() => undefined);
    await this.aggregation.recomputeRecentDays(userId, 60).catch(() => undefined);
    this.logger.log(`Duration backfill ${userId}: ${updated}/${rows.length} fixed`);
    return { scanned: rows.length, updated };
  }

  /** Re-derive listened minutes for recent plays (no Spotify calls). */
  async recomputeMinutes(userId: string, days = 400): Promise<{ ok: true }> {
    await this.aggregation.recomputeMsPlayed(userId, days);
    await this.aggregation.recomputeRecentDays(userId, 60);
    return { ok: true };
  }

  /** What the user is playing right now (for the live "Now Playing" widget). */
  async nowPlaying(userId: string) {
    // Guests / unlinked users have no Spotify token — just report nothing playing.
    const account = await this.prisma.spotifyAccount.findUnique({ where: { userId } });
    if (!account) return { playing: false as const };

    const accessToken = await this.tokens.getValidAccessToken(userId);
    const cur = await this.api.getCurrentlyPlaying(accessToken);
    if (!cur?.item) return { playing: false as const };
    return {
      playing: cur.is_playing,
      progressMs: cur.progress_ms ?? 0,
      durationMs: cur.item.duration_ms,
      name: cur.item.name,
      artist: cur.item.artists?.[0]?.name ?? '',
      imageUrl: cur.item.album?.images?.[0]?.url ?? null,
      trackUrl: `https://open.spotify.com/track/${cur.item.id}`,
    };
  }

  /** Cursor for the next pull: the latest play we already have (Unix ms). */
  private async lastPlayCursor(userId: string): Promise<number | undefined> {
    const last = await this.prisma.listeningHistory.findFirst({
      where: { userId },
      orderBy: { playedAt: 'desc' },
      select: { playedAt: true },
    });
    return last ? last.playedAt.getTime() : undefined;
  }

  private async resolveArtists(items: SpotifyPlayHistoryItem[]): Promise<Map<string, string>> {
    const spotifyIds = [
      ...new Set(items.map((i) => i.track.artists?.[0]?.id).filter((x): x is string => Boolean(x))),
    ];
    const artists = await this.prisma.artist.findMany({
      where: { spotifyId: { in: spotifyIds } },
      select: { id: true, spotifyId: true },
    });
    return new Map(artists.map((a) => [a.spotifyId, a.id]));
  }

  private async enrich(accessToken: string, items: SpotifyPlayHistoryItem[]): Promise<void> {
    const trackIds = [...new Set(items.map((i) => i.track.id))];
    const artistIds = [
      ...new Set(items.flatMap((i) => (i.track.artists ?? []).map((a) => a.id))),
    ];
    await this.catalog.enrichArtists(accessToken, artistIds);
    await this.catalog.enrichFeatures(accessToken, trackIds);
  }

  private async touchSynced(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { lastSyncedAt: new Date() },
    });
  }
}
