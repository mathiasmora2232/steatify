import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface TrackRef {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
}

export interface ChartRecord extends TrackRef {
  metric: string; // human value, e.g. "110 reproducciones" / "87% de noche"
}

export interface HallOfFameEntry extends TrackRef {
  plays: number;
  enteredYear: number;
  spanYears: number;
  reigns: number; // months this track was your #1
  alive: boolean; // played in the last 60 days
}

export interface AlbumCompletion {
  albumId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  listened: number;
  total: number;
  pct: number;
  plays: number;
}

export interface ChartsRecords {
  records: {
    mostPlayed: ChartRecord | null;
    mostNocturnal: ChartRecord | null;
    biggestLoop: ChartRecord | null;
    oldestAlive: ChartRecord | null;
  };
  hallOfFame: HallOfFameEntry[];
}

/**
 * "Sonora Charts" extras that the simple top() endpoint can't give: personal
 * records and a Hall of Fame — both computed from the full listening history.
 */
@Injectable()
export class ChartsService {
  constructor(private readonly prisma: PrismaService) {}

  async records(userId: string): Promise<ChartsRecords> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))
        ?.tzOffset ?? 0;

    const [mostPlayedRow, nocturnalRow, oldestRow, loopDays, hof, reigns] = await Promise.all([
      this.prisma.$queryRaw<Array<{ trackId: string; plays: number }>>`
        SELECT "trackId", COUNT(*)::int AS plays FROM listening_history
        WHERE "userId" = ${userId} GROUP BY "trackId" ORDER BY plays DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ trackId: string; pct: number }>>`
        SELECT "trackId",
               ROUND(100.0 * COUNT(*) FILTER (
                 WHERE EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) >= 22
                    OR EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6
               ) / COUNT(*))::int AS pct
        FROM listening_history WHERE "userId" = ${userId}
        GROUP BY "trackId" HAVING COUNT(*) >= 15 ORDER BY pct DESC, COUNT(*) DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ trackId: string; years: number }>>`
        SELECT "trackId",
               ROUND(EXTRACT(EPOCH FROM (now() - MIN("playedAt"))) / 31557600.0, 1)::float AS years
        FROM listening_history WHERE "userId" = ${userId}
        GROUP BY "trackId"
        HAVING COUNT(*) >= 10 AND MAX("playedAt") >= now() - interval '60 days'
        ORDER BY MIN("playedAt") ASC LIMIT 1
      `,
      // distinct play-days for the 40 most-played tracks → max streak in JS
      this.prisma.$queryRaw<Array<{ trackId: string; d: Date }>>`
        WITH top AS (
          SELECT "trackId" FROM listening_history WHERE "userId" = ${userId}
          GROUP BY "trackId" ORDER BY COUNT(*) DESC LIMIT 40
        )
        SELECT DISTINCT lh."trackId",
               date_trunc('day', lh."playedAt" + (${tz} || ' minutes')::interval)::date AS d
        FROM listening_history lh JOIN top ON top."trackId" = lh."trackId"
        WHERE lh."userId" = ${userId} ORDER BY lh."trackId", d
      `,
      this.prisma.$queryRaw<Array<{ trackId: string; plays: number; first: Date; last: Date }>>`
        SELECT "trackId", COUNT(*)::int AS plays, MIN("playedAt") AS first, MAX("playedAt") AS last
        FROM listening_history WHERE "userId" = ${userId}
        GROUP BY "trackId"
        HAVING COUNT(*) >= 50 AND (MAX("playedAt") - MIN("playedAt")) >= interval '300 days'
        ORDER BY plays DESC LIMIT 8
      `,
      this.prisma.$queryRaw<Array<{ trackId: string; reigns: number }>>`
        WITH monthly AS (
          SELECT "trackId",
                 ROW_NUMBER() OVER (PARTITION BY date_trunc('month', "playedAt") ORDER BY COUNT(*) DESC) AS rn
          FROM listening_history WHERE "userId" = ${userId}
          GROUP BY date_trunc('month', "playedAt"), "trackId"
        )
        SELECT "trackId", COUNT(*)::int AS reigns FROM monthly WHERE rn = 1 GROUP BY "trackId"
      `,
    ]);

    const biggestLoop = maxStreak(loopDays);
    const reignBy = new Map(reigns.map((r) => [r.trackId, r.reigns]));

    const ids = [
      mostPlayedRow[0]?.trackId,
      nocturnalRow[0]?.trackId,
      oldestRow[0]?.trackId,
      biggestLoop?.trackId,
      ...hof.map((h) => h.trackId),
    ].filter((x): x is string => Boolean(x));
    const meta = await this.trackMeta([...new Set(ids)]);

    const now = Date.now();
    return {
      records: {
        mostPlayed: mostPlayedRow[0]
          ? { ...meta(mostPlayedRow[0].trackId), metric: `${mostPlayedRow[0].plays} reproducciones` }
          : null,
        mostNocturnal: nocturnalRow[0]
          ? { ...meta(nocturnalRow[0].trackId), metric: `${nocturnalRow[0].pct}% de reproducciones de noche` }
          : null,
        biggestLoop: biggestLoop
          ? { ...meta(biggestLoop.trackId), metric: `${biggestLoop.days} días seguidos` }
          : null,
        oldestAlive: oldestRow[0]
          ? { ...meta(oldestRow[0].trackId), metric: `Escuchada por ${oldestRow[0].years} años` }
          : null,
      },
      hallOfFame: hof.map((h) => {
        const spanYears = Math.max(0, (new Date(h.last).getTime() - new Date(h.first).getTime()) / 31_557_600_000);
        return {
          ...meta(h.trackId),
          plays: h.plays,
          enteredYear: new Date(h.first).getFullYear(),
          spanYears: Math.round(spanYears * 10) / 10,
          reigns: reignBy.get(h.trackId) ?? 0,
          alive: now - new Date(h.last).getTime() <= 60 * 86_400_000,
        };
      }),
    };
  }

  /**
   * Album completion: how much of each album you've actually heard. Only albums
   * with full Spotify metadata (totalTracks) qualify — file-imported tracks lack
   * album linkage, so this covers your synced catalog.
   */
  async albums(userId: string): Promise<AlbumCompletion[]> {
    const rows = await this.prisma.$queryRaw<Array<{ albumId: string; total: number; listened: number; plays: number }>>`
      SELECT a.id AS "albumId", a."totalTracks" AS total,
             COUNT(DISTINCT lh."trackId")::int AS listened, COUNT(*)::int AS plays
      FROM listening_history lh
      JOIN tracks t ON t.id = lh."trackId"
      JOIN albums a ON a.id = t."albumId"
      WHERE lh."userId" = ${userId} AND a."totalTracks" > 0
      GROUP BY a.id, a."totalTracks"
      HAVING COUNT(DISTINCT lh."trackId") >= 2
      ORDER BY plays DESC LIMIT 30
    `;
    if (rows.length === 0) return [];
    const albums = await this.prisma.album.findMany({
      where: { id: { in: rows.map((r) => r.albumId) } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        artists: { include: { artist: { select: { name: true } } }, take: 1 },
      },
    });
    const byId = new Map(albums.map((a) => [a.id, a]));
    return rows.map((r) => {
      const a = byId.get(r.albumId);
      const listened = Math.min(r.listened, r.total);
      return {
        albumId: r.albumId,
        name: a?.name ?? 'Álbum',
        artist: a?.artists[0]?.artist.name ?? null,
        imageUrl: a?.imageUrl ?? null,
        listened,
        total: r.total,
        pct: Math.round((listened / r.total) * 100),
        plays: r.plays,
      };
    });
  }

  private async trackMeta(ids: string[]) {
    const tracks = ids.length
      ? await this.prisma.track.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            name: true,
            album: { select: { imageUrl: true } },
            artists: { include: { artist: { select: { name: true } } }, orderBy: { position: 'asc' }, take: 1 },
          },
        })
      : [];
    const byId = new Map(tracks.map((t) => [t.id, t]));
    return (id: string): TrackRef => {
      const t = byId.get(id);
      return {
        trackId: id,
        name: t?.name ?? 'Desconocida',
        artist: t?.artists[0]?.artist.name ?? null,
        imageUrl: t?.album?.imageUrl ?? null,
      };
    };
  }
}

/** Longest run of consecutive days across the (trackId, day) rows; returns the winner. */
function maxStreak(rows: Array<{ trackId: string; d: Date }>): { trackId: string; days: number } | null {
  const byTrack = new Map<string, number[]>();
  for (const r of rows) {
    const arr = byTrack.get(r.trackId) ?? [];
    arr.push(new Date(r.d).getTime());
    byTrack.set(r.trackId, arr);
  }
  let best: { trackId: string; days: number } | null = null;
  for (const [trackId, days] of byTrack) {
    days.sort((a, b) => a - b);
    let cur = 1;
    let longest = 1;
    for (let i = 1; i < days.length; i++) {
      const gap = Math.round((days[i] - days[i - 1]) / 86_400_000);
      cur = gap === 1 ? cur + 1 : 1;
      if (cur > longest) longest = cur;
    }
    if (!best || longest > best.days) best = { trackId, days: longest };
  }
  return best;
}
