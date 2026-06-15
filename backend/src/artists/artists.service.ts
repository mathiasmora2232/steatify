import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ArtistProfile {
  artistId: string;
  name: string;
  imageUrl: string | null;
  firstListenAt: string;
  lastListenAt: string;
  daysSinceLast: number;
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  distinctTracks: number;
  recent30: number;
  allTimeRank: number; // #N among your artists by plays
  totalRankedArtists: number;
  pctOfLife: number; // % of all your plays
  byYear: { year: number; plays: number }[];
  peakMonth: { ym: string; plays: number } | null;
  favoriteHour: number | null;
  topTracks: { trackId: string; name: string; plays: number; imageUrl: string | null }[];
  topAlbum: { id: string; name: string; plays: number; imageUrl: string | null } | null;
  status: string; // 'principal' | 'activo' | 'dormido' | 'nuevo' | 'leyenda'
}

/**
 * Per-artist "relationship" profile — your full history with one artist from
 * listening_history: since when, total time together, a year-by-year timeline,
 * peak month, favourite tracks/album and a relationship status. Mirrors the Song
 * Profile so artists are as clickable and deep as songs and games.
 */
@Injectable()
export class ArtistsService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string, artistId: string): Promise<ArtistProfile> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;

    const [summary] = await this.prisma.$queryRaw<
      Array<{ first: Date; last: Date; plays: number; ms: bigint; tracks: number; recent30: number }>
    >`
      SELECT MIN("playedAt") AS first, MAX("playedAt") AS last,
             COUNT(*)::int AS plays,
             COALESCE(SUM("msPlayed"), 0)::bigint AS ms,
             COUNT(DISTINCT "trackId")::int AS tracks,
             COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '30 days')::int AS recent30
      FROM listening_history WHERE "userId" = ${userId} AND "artistId" = ${artistId}
    `;
    if (!summary || summary.plays === 0) throw new NotFoundException('Sin historial para este artista.');

    const artist = await this.prisma.artist.findUnique({ where: { id: artistId }, select: { name: true, imageUrl: true } });

    const [rankRow] = await this.prisma.$queryRaw<Array<{ higher: number; total_artists: number; total_plays: number }>>`
      SELECT
        (SELECT COUNT(*)::int FROM (
            SELECT "artistId" FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
            GROUP BY "artistId" HAVING COUNT(*) > ${summary.plays}
        ) x) AS higher,
        (SELECT COUNT(DISTINCT "artistId")::int FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL) AS total_artists,
        (SELECT COUNT(*)::int FROM listening_history WHERE "userId" = ${userId}) AS total_plays
    `;

    const [byYear, peak, favHour, topTracks, topAlbum] = await Promise.all([
      this.prisma.$queryRaw<Array<{ y: number; plays: number }>>`
        SELECT EXTRACT(YEAR FROM "playedAt")::int AS y, COUNT(*)::int AS plays
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" = ${artistId}
        GROUP BY 1 ORDER BY 1
      `,
      this.prisma.$queryRaw<Array<{ ym: string; plays: number }>>`
        SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym, COUNT(*)::int AS plays
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" = ${artistId}
        GROUP BY 1 ORDER BY 2 DESC, 1 DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ h: number }>>`
        SELECT EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval)::int AS h
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" = ${artistId}
        GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ trackId: string; name: string; plays: number; image: string | null }>>`
        SELECT lh."trackId", t.name, COUNT(*)::int AS plays, al."imageUrl" AS image
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId"
        LEFT JOIN albums al ON al.id = t."albumId"
        WHERE lh."userId" = ${userId} AND lh."artistId" = ${artistId}
        GROUP BY lh."trackId", t.name, al."imageUrl" ORDER BY plays DESC LIMIT 5
      `,
      this.prisma.$queryRaw<Array<{ id: string; name: string; plays: number; image: string | null }>>`
        SELECT al.id, al.name, COUNT(*)::int AS plays, al."imageUrl" AS image
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId" JOIN albums al ON al.id = t."albumId"
        WHERE lh."userId" = ${userId} AND lh."artistId" = ${artistId}
        GROUP BY al.id, al.name, al."imageUrl" ORDER BY plays DESC LIMIT 1
      `,
    ]);

    const now = Date.now();
    const lastMs = new Date(summary.last).getTime();
    const firstMs = new Date(summary.first).getTime();
    const daysSinceLast = Math.floor((now - lastMs) / 86_400_000);
    const totalMinutes = Math.round(Number(summary.ms) / 60000);
    const rank = (rankRow?.higher ?? 0) + 1;

    let status = 'activo';
    if (now - firstMs <= 30 * 86_400_000) status = 'nuevo';
    else if (rank <= 5) status = 'principal';
    else if (daysSinceLast >= 90) status = 'dormido';
    else if (summary.plays >= 200) status = 'leyenda';

    return {
      artistId,
      name: artist?.name ?? 'Desconocido',
      imageUrl: artist?.imageUrl ?? topTracks[0]?.image ?? null,
      firstListenAt: new Date(summary.first).toISOString(),
      lastListenAt: new Date(summary.last).toISOString(),
      daysSinceLast,
      totalPlays: summary.plays,
      totalMinutes,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      distinctTracks: summary.tracks,
      recent30: summary.recent30,
      allTimeRank: rank,
      totalRankedArtists: rankRow?.total_artists ?? 0,
      pctOfLife: rankRow?.total_plays ? Math.round((summary.plays / rankRow.total_plays) * 1000) / 10 : 0,
      byYear: byYear.map((r) => ({ year: r.y, plays: r.plays })),
      peakMonth: peak[0] ? { ym: peak[0].ym, plays: peak[0].plays } : null,
      favoriteHour: favHour[0]?.h ?? null,
      topTracks: topTracks.map((t) => ({ trackId: t.trackId, name: t.name, plays: t.plays, imageUrl: t.image })),
      topAlbum: topAlbum[0] ? { id: topAlbum[0].id, name: topAlbum[0].name, plays: topAlbum[0].plays, imageUrl: topAlbum[0].image } : null,
      status,
    };
  }
}
