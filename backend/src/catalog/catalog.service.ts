import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpotifyApiService } from '../spotify/spotify-api.service';
import type { SpotifyTrack } from '../spotify/spotify.types';

/**
 * The "Transform + Load" stage for the shared catalog. Given Spotify track
 * payloads, it idempotently upserts artists, albums, tracks and their links,
 * returning a map of Spotify track id → internal track id so the caller can
 * write listening_history rows. Enrichment (artist genres, audio features) is
 * done lazily, only for entities we haven't enriched yet.
 */
@Injectable()
export class CatalogService {
  private readonly logger = new Logger(CatalogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: SpotifyApiService,
  ) {}

  /**
   * Build the catalog straight from a Spotify Extended-History export, with NO
   * API calls. Dev-mode apps get 403/429 on /tracks, so historical imports must
   * rely on the names embedded in the file. Tracks key on their real Spotify id
   * (present in the export); artists/albums have no id in the export, so we
   * synthesize a stable key from their normalized name. Bulk createMany +
   * skipDuplicates keeps it fast (~thousands of rows in seconds) and idempotent.
   *
   * Returns spotifyTrackId → { trackId, artistId } for writing history rows.
   */
  async upsertTracksFromHistory(
    entries: { trackUri: string; trackName: string; artistName: string; albumName?: string }[],
  ): Promise<Map<string, { trackId: string; artistId: string }>> {
    const PREFIX = 'spotify:track:';
    const artistKey = (name: string) => `imported:artist:${name.trim().toLowerCase()}`;

    const artistNameByKey = new Map<string, string>();
    const trackInfo = new Map<string, { name: string; artistName: string }>();
    for (const e of entries) {
      const sid = e.trackUri.slice(PREFIX.length);
      const aName = (e.artistName || 'Unknown Artist').trim();
      artistNameByKey.set(artistKey(aName), aName);
      if (!trackInfo.has(sid)) trackInfo.set(sid, { name: e.trackName, artistName: aName });
    }

    // Artists — synthetic id per unique name.
    await this.prisma.artist.createMany({
      data: [...artistNameByKey].map(([spotifyId, name]) => ({ spotifyId, name })),
      skipDuplicates: true,
    });
    const artistRows = await this.prisma.artist.findMany({
      where: { spotifyId: { in: [...artistNameByKey.keys()] } },
      select: { id: true, spotifyId: true },
    });
    const artistIdByKey = new Map(artistRows.map((a) => [a.spotifyId, a.id]));

    // Tracks — real Spotify id; durationMs unknown in export, so 0 (history rows
    // carry the actual ms_played used for minutes).
    await this.prisma.track.createMany({
      data: [...trackInfo].map(([spotifyId, t]) => ({ spotifyId, name: t.name, durationMs: 0 })),
      skipDuplicates: true,
    });
    const trackRows = await this.prisma.track.findMany({
      where: { spotifyId: { in: [...trackInfo.keys()] } },
      select: { id: true, spotifyId: true },
    });
    const trackIdBySpotify = new Map(trackRows.map((t) => [t.spotifyId, t.id]));

    // Link each track to its primary artist + assemble the result map.
    const links: { trackId: string; artistId: string; position: number }[] = [];
    const result = new Map<string, { trackId: string; artistId: string }>();
    for (const [sid, t] of trackInfo) {
      const trackId = trackIdBySpotify.get(sid);
      const artistId = artistIdByKey.get(artistKey(t.artistName));
      if (!trackId || !artistId) continue;
      links.push({ trackId, artistId, position: 0 });
      result.set(sid, { trackId, artistId });
    }
    await this.prisma.trackArtist.createMany({ data: links, skipDuplicates: true });
    return result;
  }

  /** Upsert every track (and its album/artists), returning spotifyId → internalId. */
  async upsertTracks(tracks: SpotifyTrack[]): Promise<Map<string, string>> {
    const bySpotifyId = new Map<string, string>();
    // De-dupe within the batch first.
    const unique = new Map(tracks.map((t) => [t.id, t]));

    for (const track of unique.values()) {
      const albumId = await this.upsertAlbum(track);
      const internalId = await this.upsertTrack(track, albumId);
      await this.linkTrackArtists(track, internalId);
      bySpotifyId.set(track.id, internalId);
    }
    return bySpotifyId;
  }

  private async upsertAlbum(track: SpotifyTrack): Promise<string | undefined> {
    const album = track.album;
    if (!album?.id) return undefined;
    const row = await this.prisma.album.upsert({
      where: { spotifyId: album.id },
      create: {
        spotifyId: album.id,
        name: album.name,
        albumType: album.album_type,
        releaseDate: album.release_date,
        totalTracks: album.total_tracks,
        imageUrl: album.images?.[0]?.url,
      },
      update: { imageUrl: album.images?.[0]?.url },
      select: { id: true },
    });

    for (const a of album.artists ?? []) {
      const artistId = await this.upsertArtistRef(a.id, a.name);
      await this.prisma.albumArtist.upsert({
        where: { albumId_artistId: { albumId: row.id, artistId } },
        create: { albumId: row.id, artistId },
        update: {},
      });
    }
    return row.id;
  }

  private async upsertTrack(track: SpotifyTrack, albumId?: string): Promise<string> {
    const row = await this.prisma.track.upsert({
      where: { spotifyId: track.id },
      create: {
        spotifyId: track.id,
        name: track.name,
        durationMs: track.duration_ms,
        explicit: track.explicit,
        popularity: track.popularity,
        isrc: track.external_ids?.isrc,
        previewUrl: track.preview_url,
        albumId,
      },
      // Backfill durationMs on update too: imported tracks are created with 0
      // (the export has no duration), so the first live sync that knows the real
      // length must heal it — otherwise minutes get under-counted.
      update: {
        popularity: track.popularity,
        albumId,
        ...(track.duration_ms ? { durationMs: track.duration_ms } : {}),
      },
      select: { id: true },
    });
    return row.id;
  }

  private async linkTrackArtists(track: SpotifyTrack, trackId: string): Promise<void> {
    let position = 0;
    for (const a of track.artists ?? []) {
      const artistId = await this.upsertArtistRef(a.id, a.name);
      await this.prisma.trackArtist.upsert({
        where: { trackId_artistId: { trackId, artistId } },
        create: { trackId, artistId, position },
        update: {},
      });
      position += 1;
    }
  }

  /** Create the artist shell if missing. Full details come from enrichArtists(). */
  private async upsertArtistRef(spotifyId: string, name: string): Promise<string> {
    const row = await this.prisma.artist.upsert({
      where: { spotifyId },
      create: { spotifyId, name },
      update: { name },
      select: { id: true },
    });
    return row.id;
  }

  /** Return the primary artist's internal id for a Spotify track, if known. */
  async primaryArtistId(track: SpotifyTrack): Promise<string | undefined> {
    const primary = track.artists?.[0];
    if (!primary) return undefined;
    const row = await this.prisma.artist.findUnique({
      where: { spotifyId: primary.id },
      select: { id: true },
    });
    return row?.id;
  }

  /**
   * Fill in genres / popularity / followers for artists we only have shells for.
   * Idempotent and bounded — only touches artists missing popularity.
   */
  async enrichArtists(accessToken: string, spotifyArtistIds: string[]): Promise<void> {
    const pending = await this.prisma.artist.findMany({
      where: { spotifyId: { in: spotifyArtistIds }, popularity: null },
      select: { spotifyId: true },
    });
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += 50) {
      const ids = pending.slice(i, i + 50).map((a) => a.spotifyId);
      const full = await this.api.getArtists(accessToken, ids);
      for (const artist of full) {
        await this.prisma.artist.update({
          where: { spotifyId: artist.id },
          data: {
            popularity: artist.popularity,
            followers: artist.followers?.total,
            imageUrl: artist.images?.[0]?.url,
          },
        });
        await this.attachGenres(artist.id, artist.genres ?? []);
      }
    }
  }

  private async attachGenres(spotifyArtistId: string, genres: string[]): Promise<void> {
    if (genres.length === 0) return;
    const artist = await this.prisma.artist.findUnique({
      where: { spotifyId: spotifyArtistId },
      select: { id: true },
    });
    if (!artist) return;
    for (const name of genres) {
      const genre = await this.prisma.genre.upsert({
        where: { name },
        create: { name },
        update: {},
        select: { id: true },
      });
      await this.prisma.artistGenre.upsert({
        where: { artistId_genreId: { artistId: artist.id, genreId: genre.id } },
        create: { artistId: artist.id, genreId: genre.id },
        update: {},
      });
    }
  }

  /**
   * Fetch + store audio features for tracks that don't have them yet.
   * These power mood/era/ML — without them those features degrade gracefully.
   */
  async enrichFeatures(accessToken: string, spotifyTrackIds: string[]): Promise<void> {
    const tracks = await this.prisma.track.findMany({
      where: { spotifyId: { in: spotifyTrackIds }, features: { is: null } },
      select: { id: true, spotifyId: true },
    });
    if (tracks.length === 0) return;
    const idMap = new Map(tracks.map((t) => [t.spotifyId, t.id]));

    const spotifyIds = [...idMap.keys()];
    for (let i = 0; i < spotifyIds.length; i += 100) {
      const batch = spotifyIds.slice(i, i + 100);
      const features = await this.api.getAudioFeatures(accessToken, batch);
      for (const f of features) {
        const trackId = idMap.get(f.id);
        if (!trackId) continue;
        await this.prisma.trackFeatures.upsert({
          where: { trackId },
          create: {
            trackId,
            danceability: f.danceability,
            energy: f.energy,
            valence: f.valence,
            tempo: f.tempo,
            acousticness: f.acousticness,
            instrumentalness: f.instrumentalness,
            speechiness: f.speechiness,
            liveness: f.liveness,
            loudness: f.loudness,
            musicalKey: f.key,
            mode: f.mode,
            timeSignature: f.time_signature,
          },
          update: {},
        });
      }
    }
  }
}
