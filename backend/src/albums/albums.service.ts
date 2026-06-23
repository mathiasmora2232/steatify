import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AlbumTrack {
  trackId: string;
  name: string;
  durationMs: number;
  plays: number;
  heard: boolean;
}

export interface AlbumJourney {
  albumId: string;
  name: string;
  imageUrl: string | null;
  artist: { id: string; name: string } | null;
  releaseDate: string | null;
  totalTracks: number | null;
  heardTracks: number;
  completion: number | null; // % of the album's tracks you've heard
  firstListenAt: string;
  lastListenAt: string;
  daysSinceLast: number;
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  allTimeRank: number;
  totalRankedAlbums: number;
  peakMonth: { ym: string; plays: number } | null;
  byMonth: { ym: string; plays: number }[];
  tracks: AlbumTrack[];
  explore: {
    artistAlbums: { id: string; name: string; plays: number; imageUrl: string | null }[];
    artistTracks: { trackId: string; name: string; plays: number; imageUrl: string | null }[];
  };
  status: string; // 'completo' | 'explorando' | 'iniciado' | 'dormido' | 'nuevo'
}

/**
 * Per-album "journey" — your relationship with one album: since when, total time,
 * a month-by-month play timeline, and how much of the album you've actually
 * explored (heard tracks vs the album's total). Mirrors the Artist/Song profiles
 * so albums are first-class, clickable entities with their own narrative.
 */
@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async journey(userId: string, albumId: string): Promise<AlbumJourney> {
    const album = await this.prisma.album.findUnique({
      where: { id: albumId },
      select: { name: true, imageUrl: true, releaseDate: true, totalTracks: true },
    });
    if (!album) throw new NotFoundException('Álbum no encontrado.');

    const [summary] = await this.prisma.$queryRaw<
      Array<{ first: Date | null; last: Date | null; plays: number; ms: bigint; heard: number }>
    >`
      SELECT MIN(lh."playedAt") AS first, MAX(lh."playedAt") AS last,
             COUNT(*)::int AS plays,
             COALESCE(SUM(lh."msPlayed"), 0)::bigint AS ms,
             COUNT(DISTINCT lh."trackId")::int AS heard
      FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
      WHERE lh."userId" = ${userId} AND t."albumId" = ${albumId}
    `;
    if (!summary || summary.plays === 0) throw new NotFoundException('Sin historial para este álbum.');

    const [artist] = await this.prisma.$queryRaw<Array<{ id: string; name: string }>>`
      SELECT a.id, a.name FROM album_artists aa JOIN artists a ON a.id = aa."artistId"
      WHERE aa."albumId" = ${albumId} LIMIT 1
    `;

    const [rankRow] = await this.prisma.$queryRaw<Array<{ higher: number; total_albums: number }>>`
      SELECT
        (SELECT COUNT(*)::int FROM (
            SELECT t."albumId" FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
            WHERE lh."userId" = ${userId} AND t."albumId" IS NOT NULL
            GROUP BY t."albumId" HAVING COUNT(*) > ${summary.plays}
        ) x) AS higher,
        (SELECT COUNT(DISTINCT t."albumId")::int FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
         WHERE lh."userId" = ${userId} AND t."albumId" IS NOT NULL) AS total_albums
    `;

    const [peak, byMonth, tracks, artistAlbums, artistTracks] = await Promise.all([
      this.prisma.$queryRaw<Array<{ ym: string; plays: number }>>`
        SELECT to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') AS ym, COUNT(*)::int AS plays
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
        WHERE lh."userId" = ${userId} AND t."albumId" = ${albumId}
        GROUP BY 1 ORDER BY 2 DESC, 1 DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ ym: string; plays: number }>>`
        SELECT to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') AS ym, COUNT(*)::int AS plays
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
        WHERE lh."userId" = ${userId} AND t."albumId" = ${albumId}
        GROUP BY 1 ORDER BY 1
      `,
      // Every track on the album + how many times you've played it (0 = not yet).
      this.prisma.$queryRaw<Array<{ trackId: string; name: string; durationMs: number; plays: number }>>`
        SELECT t.id AS "trackId", t.name, t."durationMs",
               COUNT(lh.id) FILTER (WHERE lh."userId" = ${userId})::int AS plays
        FROM tracks t
        LEFT JOIN listening_history lh ON lh."trackId" = t.id
        WHERE t."albumId" = ${albumId}
        GROUP BY t.id, t.name, t."durationMs"
        ORDER BY plays DESC, t.name ASC
      `,
      artist ? this.prisma.$queryRaw<Array<{ id: string; name: string; plays: number; image: string | null }>>`
        SELECT al.id, al.name, COUNT(lh.id)::int AS plays, al."imageUrl" AS image
        FROM albums al
        JOIN album_artists aa ON aa."albumId" = al.id
        LEFT JOIN tracks t ON t."albumId" = al.id
        LEFT JOIN listening_history lh ON lh."trackId" = t.id AND lh."userId" = ${userId}
        WHERE aa."artistId" = ${artist.id}
          AND al.id <> ${albumId}
        GROUP BY al.id, al.name, al."imageUrl"
        HAVING COUNT(lh.id) > 0
        ORDER BY plays DESC, al.name ASC
        LIMIT 6
      ` : Promise.resolve([]),
      artist ? this.prisma.$queryRaw<Array<{ trackId: string; name: string; plays: number; image: string | null }>>`
        SELECT lh."trackId", t.name, COUNT(*)::int AS plays, al."imageUrl" AS image
        FROM listening_history lh
        JOIN tracks t ON t.id = lh."trackId"
        LEFT JOIN albums al ON al.id = t."albumId"
        WHERE lh."userId" = ${userId}
          AND lh."artistId" = ${artist.id}
          AND t."albumId" <> ${albumId}
        GROUP BY lh."trackId", t.name, al."imageUrl"
        ORDER BY plays DESC, t.name ASC
        LIMIT 8
      ` : Promise.resolve([]),
    ]);

    const now = Date.now();
    const lastMs = summary.last ? new Date(summary.last).getTime() : now;
    const firstMs = summary.first ? new Date(summary.first).getTime() : now;
    const daysSinceLast = Math.floor((now - lastMs) / 86_400_000);
    const totalMinutes = Math.round(Number(summary.ms) / 60000);
    const rank = (rankRow?.higher ?? 0) + 1;
    // Prefer Spotify's totalTracks; fall back to the tracks we actually know about.
    const totalTracks = album.totalTracks && album.totalTracks > 0 ? album.totalTracks : tracks.length || null;
    const completion = totalTracks ? Math.min(100, Math.round((summary.heard / totalTracks) * 100)) : null;

    let status = 'explorando';
    if (now - firstMs <= 30 * 86_400_000) status = 'nuevo';
    else if (completion != null && completion >= 90) status = 'completo';
    else if (daysSinceLast >= 90) status = 'dormido';
    else if (summary.heard <= 2) status = 'iniciado';

    return {
      albumId,
      name: album.name,
      imageUrl: album.imageUrl,
      artist: artist ? { id: artist.id, name: artist.name } : null,
      releaseDate: album.releaseDate ?? null,
      totalTracks,
      heardTracks: summary.heard,
      completion,
      firstListenAt: new Date(firstMs).toISOString(),
      lastListenAt: new Date(lastMs).toISOString(),
      daysSinceLast,
      totalPlays: summary.plays,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      allTimeRank: rank,
      totalRankedAlbums: rankRow?.total_albums ?? 0,
      peakMonth: peak[0] ? { ym: peak[0].ym, plays: peak[0].plays } : null,
      byMonth: byMonth.map((r) => ({ ym: r.ym, plays: r.plays })),
      tracks: tracks.map((t) => ({
        trackId: t.trackId,
        name: t.name,
        durationMs: t.durationMs,
        plays: t.plays,
        heard: t.plays > 0,
      })),
      explore: {
        artistAlbums: artistAlbums.map((al) => ({ id: al.id, name: al.name, plays: al.plays, imageUrl: al.image })),
        artistTracks: artistTracks.map((t) => ({ trackId: t.trackId, name: t.name, plays: t.plays, imageUrl: t.image })),
      },
      status,
    };
  }
}
