import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SongProfile {
  trackId: string;
  name: string;
  artist: string | null;
  artistId: string | null;
  album: { id: string; name: string; imageUrl: string | null } | null;
  imageUrl: string | null;
  firstListenAt: string;
  lastListenAt: string;
  daysSinceLast: number;
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  recent30: number;
  skips: number;
  skipRate: number; // 0..100
  distinctDays: number;
  allTimeRank: number; // #N among your tracks by plays
  totalRankedTracks: number;
  pctOfLife: number; // % of all your plays this track represents (0..100)
  byYear: { year: number; plays: number }[];
  peakMonth: { ym: string; plays: number } | null;
  favoriteHour: number | null;
  longestStreakDays: number;
  maxGapDays: number;
  states: string[];
  explore: {
    sameArtist: ExploreTrack[];
    sameAlbum: ExploreTrack[];
    nearby: ExploreTrack[];
  };
}

export interface ExploreTrack {
  trackId: string;
  name: string;
  artist: string | null;
  plays: number;
  imageUrl: string | null;
}

/**
 * Per-song "profile" — the full history of one track in a user's listening life,
 * computed entirely from listening_history (every play has a timestamp). This is
 * the data behind the clickable Song Profile page: first listen, total time
 * together, a year-by-year timeline, peak month, favourite hour, longest streak
 * and derived life-states (obsession / comeback / classic / dormant / new).
 */
@Injectable()
export class SongsService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string, trackId: string): Promise<SongProfile> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))
        ?.tzOffset ?? 0;

    const [summary] = await this.prisma.$queryRaw<
      Array<{ first: Date; last: Date; plays: number; ms: bigint; recent30: number; skips: number }>
    >`
      SELECT MIN("playedAt") AS first, MAX("playedAt") AS last,
             COUNT(*)::int AS plays,
             COALESCE(SUM("msPlayed"), 0)::bigint AS ms,
             COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '30 days')::int AS recent30,
             COUNT(*) FILTER (WHERE skipped)::int AS skips
      FROM listening_history WHERE "userId" = ${userId} AND "trackId" = ${trackId}
    `;
    if (!summary || summary.plays === 0) throw new NotFoundException('Sin historial para esta canción.');

    // All-time rank among your tracks + share of your whole listening life.
    const [rankRow] = await this.prisma.$queryRaw<Array<{ higher: number; total_tracks: number; total_plays: number }>>`
      SELECT
        (SELECT COUNT(*)::int FROM (
            SELECT "trackId" FROM listening_history WHERE "userId" = ${userId}
            GROUP BY "trackId" HAVING COUNT(*) > ${summary.plays}
        ) x) AS higher,
        (SELECT COUNT(DISTINCT "trackId")::int FROM listening_history WHERE "userId" = ${userId}) AS total_tracks,
        (SELECT COUNT(*)::int FROM listening_history WHERE "userId" = ${userId}) AS total_plays
    `;

    const track = await this.prisma.track.findUnique({
      where: { id: trackId },
      select: {
        name: true,
        album: { select: { id: true, name: true, imageUrl: true } },
        artists: { include: { artist: { select: { id: true, name: true } } }, orderBy: { position: 'asc' }, take: 1 },
      },
    });
    const primaryArtistId = track?.artists[0]?.artist.id ?? null;
    const albumId = track?.album?.id ?? null;

    const [byYear, peak, favHour, days] = await Promise.all([
      this.prisma.$queryRaw<Array<{ y: number; plays: number }>>`
        SELECT EXTRACT(YEAR FROM "playedAt")::int AS y, COUNT(*)::int AS plays
        FROM listening_history WHERE "userId" = ${userId} AND "trackId" = ${trackId}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ ym: string; plays: number }>>`
        SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym, COUNT(*)::int AS plays
        FROM listening_history WHERE "userId" = ${userId} AND "trackId" = ${trackId}
        GROUP BY 1 ORDER BY 2 DESC, 1 DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ h: number }>>`
        SELECT EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval)::int AS h
        FROM listening_history WHERE "userId" = ${userId} AND "trackId" = ${trackId}
        GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ d: Date }>>`
        SELECT DISTINCT date_trunc('day', "playedAt" + (${tz} || ' minutes')::interval)::date AS d
        FROM listening_history WHERE "userId" = ${userId} AND "trackId" = ${trackId} ORDER BY d
      `,
    ]);

    const { longestStreakDays, maxGapDays } = streakAndGap(days.map((x) => new Date(x.d).getTime()));

    const now = Date.now();
    const lastMs = new Date(summary.last).getTime();
    const firstMs = new Date(summary.first).getTime();
    const daysSinceLast = Math.floor((now - lastMs) / 86_400_000);
    const spanDays = Math.floor((lastMs - firstMs) / 86_400_000);
    const totalMinutes = Math.round(Number(summary.ms) / 60000);

    const states: string[] = [];
    if (now - firstMs <= 30 * 86_400_000) states.push('new');
    if (maxGapDays >= 60 && daysSinceLast <= 21) states.push('comeback');
    if (daysSinceLast >= 90) states.push('dormant');
    if (summary.plays >= 40 && spanDays >= 365) states.push('classic');
    if (summary.recent30 >= 10) states.push('obsession');
    if (states.length === 0) states.push('steady');

    const [sameArtist, sameAlbum, nearby] = await Promise.all([
      primaryArtistId ? this.sameArtist(userId, primaryArtistId, trackId) : Promise.resolve([]),
      albumId ? this.sameAlbum(userId, albumId, trackId) : Promise.resolve([]),
      this.nearbyTracks(userId, trackId),
    ]);

    return {
      trackId,
      name: track?.name ?? 'Desconocida',
      artist: track?.artists[0]?.artist.name ?? null,
      artistId: primaryArtistId,
      album: track?.album ? { id: track.album.id, name: track.album.name, imageUrl: track.album.imageUrl } : null,
      imageUrl: track?.album?.imageUrl ?? null,
      firstListenAt: new Date(summary.first).toISOString(),
      lastListenAt: new Date(summary.last).toISOString(),
      daysSinceLast,
      totalPlays: summary.plays,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      recent30: summary.recent30,
      skips: summary.skips,
      skipRate: summary.plays > 0 ? Math.round((summary.skips / summary.plays) * 100) : 0,
      distinctDays: days.length,
      allTimeRank: (rankRow?.higher ?? 0) + 1,
      totalRankedTracks: rankRow?.total_tracks ?? 0,
      pctOfLife: rankRow?.total_plays ? Math.round((summary.plays / rankRow.total_plays) * 1000) / 10 : 0,
      byYear: byYear.map((r) => ({ year: r.y, plays: r.plays })),
      peakMonth: peak[0] ? { ym: peak[0].ym, plays: peak[0].plays } : null,
      favoriteHour: favHour[0]?.h ?? null,
      longestStreakDays,
      maxGapDays,
      states,
      explore: { sameArtist, sameAlbum, nearby },
    };
  }

  private async sameArtist(userId: string, artistId: string, currentTrackId: string): Promise<ExploreTrack[]> {
    const rows = await this.prisma.$queryRaw<Array<{ trackId: string; name: string; artist: string | null; plays: number; image: string | null }>>`
      SELECT lh."trackId", t.name, a.name AS artist, COUNT(*)::int AS plays, al."imageUrl" AS image
      FROM listening_history lh
      JOIN tracks t ON t.id = lh."trackId"
      LEFT JOIN track_artists ta ON ta."trackId" = t.id AND ta.position = 0
      LEFT JOIN artists a ON a.id = ta."artistId"
      LEFT JOIN albums al ON al.id = t."albumId"
      WHERE lh."userId" = ${userId}
        AND lh."artistId" = ${artistId}
        AND lh."trackId" <> ${currentTrackId}
      GROUP BY lh."trackId", t.name, a.name, al."imageUrl"
      ORDER BY plays DESC, t.name ASC
      LIMIT 6
    `;
    return rows.map(rowToExplore);
  }

  private async sameAlbum(userId: string, albumId: string, currentTrackId: string): Promise<ExploreTrack[]> {
    const rows = await this.prisma.$queryRaw<Array<{ trackId: string; name: string; artist: string | null; plays: number; image: string | null }>>`
      SELECT t.id AS "trackId", t.name, a.name AS artist,
             COUNT(lh.id)::int AS plays,
             al."imageUrl" AS image
      FROM tracks t
      JOIN albums al ON al.id = t."albumId"
      LEFT JOIN listening_history lh ON lh."trackId" = t.id AND lh."userId" = ${userId}
      LEFT JOIN track_artists ta ON ta."trackId" = t.id AND ta.position = 0
      LEFT JOIN artists a ON a.id = ta."artistId"
      WHERE t."albumId" = ${albumId}
        AND t.id <> ${currentTrackId}
      GROUP BY t.id, t.name, a.name, al."imageUrl"
      ORDER BY plays DESC, t.name ASC
      LIMIT 6
    `;
    return rows.map(rowToExplore).filter((t) => t.plays > 0);
  }

  private async nearbyTracks(userId: string, currentTrackId: string): Promise<ExploreTrack[]> {
    const rows = await this.prisma.$queryRaw<Array<{ trackId: string; name: string; artist: string | null; plays: number; image: string | null }>>`
      WITH ordered AS (
        SELECT "trackId",
               LAG("trackId") OVER (ORDER BY "playedAt") AS prev,
               LEAD("trackId") OVER (ORDER BY "playedAt") AS next
        FROM listening_history
        WHERE "userId" = ${userId}
      ),
      neighbors AS (
        SELECT prev AS id FROM ordered WHERE "trackId" = ${currentTrackId} AND prev IS NOT NULL
        UNION ALL
        SELECT next AS id FROM ordered WHERE "trackId" = ${currentTrackId} AND next IS NOT NULL
      )
      SELECT n.id AS "trackId", t.name, a.name AS artist, COUNT(*)::int AS plays, al."imageUrl" AS image
      FROM neighbors n
      JOIN tracks t ON t.id = n.id
      LEFT JOIN track_artists ta ON ta."trackId" = t.id AND ta.position = 0
      LEFT JOIN artists a ON a.id = ta."artistId"
      LEFT JOIN albums al ON al.id = t."albumId"
      WHERE n.id <> ${currentTrackId}
      GROUP BY n.id, t.name, a.name, al."imageUrl"
      ORDER BY plays DESC, t.name ASC
      LIMIT 6
    `;
    return rows.map(rowToExplore);
  }
}

function rowToExplore(r: { trackId: string; name: string; artist: string | null; plays: number; image: string | null }): ExploreTrack {
  return { trackId: r.trackId, name: r.name, artist: r.artist, plays: r.plays, imageUrl: r.image };
}

/** Longest run of consecutive days + biggest gap (in days) from sorted day timestamps. */
function streakAndGap(dayMs: number[]): { longestStreakDays: number; maxGapDays: number } {
  let longest = dayMs.length ? 1 : 0;
  let cur = dayMs.length ? 1 : 0;
  let maxGap = 0;
  for (let i = 1; i < dayMs.length; i++) {
    const gapDays = Math.round((dayMs[i] - dayMs[i - 1]) / 86_400_000);
    if (gapDays === 1) cur += 1;
    else {
      cur = 1;
      if (gapDays - 1 > maxGap) maxGap = gapDays - 1;
    }
    if (cur > longest) longest = cur;
  }
  return { longestStreakDays: longest, maxGapDays: maxGap };
}
