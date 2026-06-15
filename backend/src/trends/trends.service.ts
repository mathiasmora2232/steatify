import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ArtistStock {
  name: string;
  imageUrl: string | null;
  recent: number; // plays last 7d
  prior: number; // plays 8-14d ago
  trendPct: number | null; // null when it's brand new this week
  direction: 'up' | 'down' | 'flat' | 'new';
}

export interface GraveItem {
  name: string;
  artist: string;
  imageUrl: string | null;
  plays: number;
  lastPlayedAt: Date;
  daysSince: number;
}

export interface SongStock {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  recent: number;
  prior: number;
  trendPct: number | null;
}

export interface SongComeback {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  daysGone: number;
  lastBeforeAt: Date;
}

export interface DormantTrack {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  plays: number;
  daysSince: number;
  lastPlayedAt: Date;
}

export interface GraveCard {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  plays: number;
  daysSince: number;
  peakMonth: string | null;
  peakPlays: number;
  returnProb: number;
}

/**
 * "Market" + "graveyard" views over listening_history.
 *  - Artist Stock: who's rising / falling in your rotation (7d vs prior 7d).
 *  - Graveyard: tracks you clearly liked (several plays) but have abandoned,
 *    ranked by how long it's been — pure nostalgia bait.
 */
@Injectable()
export class TrendsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * "Mercado vivo" — richer artist signals beyond up/down: streaks (dominadores =
   * consecutive months in your top-3; constantes = consecutive months present),
   * fading (was hot 30d ago, cold now), and real comebacks scored by old
   * popularity + days away + new plays. Powers the Tendencias 2.0 category cards.
   */
  async market(userId: string, windowDays = 7): Promise<{
    dominators: Array<{ name: string; imageUrl: string | null; months: number }>;
    constants: Array<{ name: string; imageUrl: string | null; months: number }>;
    fading: Array<{ name: string; imageUrl: string | null; peakPlays: number; recentPlays: number; dropPct: number }>;
    comebacks: Array<{ name: string; imageUrl: string | null; daysAway: number; oldPlays: number; newPlays: number; score: number }>;
  }> {
    const days = Math.min(365, Math.max(1, Math.round(windowDays)));
    const [streakRows, fadingRows, comebackRows] = await Promise.all([
      this.prisma.$queryRaw<Array<{ ym: string; name: string; imageUrl: string | null; rn: number }>>`
        WITH monthly AS (
          SELECT date_trunc('month', lh."playedAt") AS m, a.name, a."imageUrl", COUNT(*) AS c
          FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
          WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL
          GROUP BY 1, a.name, a."imageUrl"
        ),
        ranked AS (
          SELECT m, name, "imageUrl", ROW_NUMBER() OVER (PARTITION BY m ORDER BY c DESC) AS rn FROM monthly
        )
        SELECT to_char(m, 'YYYY-MM') AS ym, name, "imageUrl", rn::int AS rn FROM ranked
      `,
      this.prisma.$queryRaw<Array<{ name: string; imageUrl: string | null; recent: number; prior: number }>>`
        SELECT a.name, a."imageUrl",
          COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '30 days')::int AS recent,
          COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '60 days' AND lh."playedAt" < now() - interval '30 days')::int AS prior
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL AND lh."playedAt" >= now() - interval '60 days'
        GROUP BY a.id, a.name, a."imageUrl"
        HAVING COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '60 days' AND lh."playedAt" < now() - interval '30 days') >= 15
      `,
      this.prisma.$queryRaw<Array<{ name: string; imageUrl: string | null; days_away: number; old_plays: number; new_plays: number }>>`
        WITH recent AS (
          SELECT "artistId", MIN("playedAt") AS first_recent, COUNT(*)::int AS new_plays
          FROM listening_history
          WHERE "userId" = ${userId} AND "artistId" IS NOT NULL AND "playedAt" >= now() - (${days} || ' days')::interval
          GROUP BY "artistId"
        ),
        prior AS (
          SELECT "artistId", MAX("playedAt") AS last_before, COUNT(*)::int AS old_plays
          FROM listening_history
          WHERE "userId" = ${userId} AND "artistId" IS NOT NULL AND "playedAt" < now() - (${days} || ' days')::interval
          GROUP BY "artistId" HAVING COUNT(*) >= 5
        )
        SELECT a.name, a."imageUrl",
          (EXTRACT(EPOCH FROM (r.first_recent - p.last_before)) / 86400)::int AS days_away,
          p.old_plays, r.new_plays
        FROM recent r JOIN prior p ON p."artistId" = r."artistId" JOIN artists a ON a.id = r."artistId"
        WHERE (r.first_recent - p.last_before) >= interval '30 days' AND r.new_plays >= 2
      `,
    ]);

    // Build consecutive streaks ending at the most recent month.
    const months = [...new Set(streakRows.map((r) => r.ym))].sort();
    const latest = months[months.length - 1];
    const presentBy = new Map<string, { img: string | null; set: Set<string>; top3: Set<string> }>();
    for (const r of streakRows) {
      const e = presentBy.get(r.name) ?? { img: r.imageUrl, set: new Set(), top3: new Set() };
      e.set.add(r.ym);
      if (r.rn <= 3) e.top3.add(r.ym);
      presentBy.set(r.name, e);
    }
    const streakFrom = (set: Set<string>): number => {
      if (!latest || !set.has(latest)) return 0;
      let n = 0;
      for (let i = months.length - 1; i >= 0; i--) {
        if (set.has(months[i])) n++;
        else break;
      }
      return n;
    };
    const dominators: Array<{ name: string; imageUrl: string | null; months: number }> = [];
    const constants: Array<{ name: string; imageUrl: string | null; months: number }> = [];
    for (const [name, e] of presentBy) {
      const t3 = streakFrom(e.top3);
      const pres = streakFrom(e.set);
      if (t3 >= 3) dominators.push({ name, imageUrl: e.img, months: t3 });
      if (pres >= 6) constants.push({ name, imageUrl: e.img, months: pres });
    }
    dominators.sort((a, b) => b.months - a.months);
    constants.sort((a, b) => b.months - a.months);

    const fading = fadingRows
      .filter((r) => r.recent <= r.prior * 0.4)
      .map((r) => ({ name: r.name, imageUrl: r.imageUrl, peakPlays: r.prior, recentPlays: r.recent, dropPct: Math.round(((r.recent - r.prior) / r.prior) * 100) }))
      .sort((a, b) => a.dropPct - b.dropPct)
      .slice(0, 8);

    const comebacks = comebackRows
      .map((r) => {
        // comebackScore = old popularity + days away + new plays (0–100).
        const pop = Math.min(40, Math.log10(r.old_plays + 1) * 22);
        const away = (Math.min(r.days_away, 365) / 365) * 35;
        const fresh = (Math.min(r.new_plays, 25) / 25) * 25;
        return { name: r.name, imageUrl: r.imageUrl, daysAway: r.days_away, oldPlays: r.old_plays, newPlays: r.new_plays, score: Math.round(pop + away + fresh) };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return { dominators: dominators.slice(0, 8), constants: constants.slice(0, 8), fading, comebacks };
  }

  async overview(userId: string, windowDays = 7) {
    // Clamp to a sane window (the comparison reaches back 2× this far).
    const days = Math.min(365, Math.max(1, Math.round(windowDays)));
    const [stocks, graveyard] = await Promise.all([
      this.stocks(userId, days),
      this.graveyard(userId),
    ]);
    return { stocks, graveyard };
  }

  /**
   * Artist movement over a window of `days`: plays in the last N days ("recent")
   * vs the N days immediately before that ("prior"). Parameterized so the UI can
   * offer 7d / 30d / 90d / year views over identical logic.
   */
  private async stocks(userId: string, days: number): Promise<ArtistStock[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ name: string; imageUrl: string | null; recent: number; prior: number }>
    >`
      SELECT a.name, a."imageUrl",
             COUNT(*) FILTER (WHERE lh."playedAt" >= now() - (${days} || ' days')::interval)::int AS recent,
             COUNT(*) FILTER (
               WHERE lh."playedAt" >= now() - (${2 * days} || ' days')::interval
                 AND lh."playedAt" <  now() - (${days} || ' days')::interval
             )::int AS prior
      FROM listening_history lh
      JOIN artists a ON a.id = lh."artistId"
      WHERE lh."userId" = ${userId}
        AND lh."artistId" IS NOT NULL
        AND lh."playedAt" >= now() - (${2 * days} || ' days')::interval
      GROUP BY a.id, a.name, a."imageUrl"
      HAVING COUNT(*) >= 2
    `;

    return rows
      .map((r) => {
        let trendPct: number | null = null;
        let direction: ArtistStock['direction'];
        if (r.prior === 0) {
          direction = r.recent > 0 ? 'new' : 'flat';
        } else {
          trendPct = Math.round(((r.recent - r.prior) / r.prior) * 100);
          direction = trendPct > 10 ? 'up' : trendPct < -10 ? 'down' : 'flat';
        }
        return { name: r.name, imageUrl: r.imageUrl, recent: r.recent, prior: r.prior, trendPct, direction };
      })
      .sort((a, b) => {
        // Rising first (by %), then new, then the rest.
        const score = (s: ArtistStock) => (s.trendPct ?? (s.direction === 'new' ? 999 : -1000));
        return score(b) - score(a);
      })
      .slice(0, 20);
  }

  private async graveyard(userId: string): Promise<GraveItem[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{ trackId: string; plays: number; last: Date }>
    >`
      SELECT lh."trackId", COUNT(*)::int AS plays, MAX(lh."playedAt") AS last
      FROM listening_history lh
      WHERE lh."userId" = ${userId}
      GROUP BY lh."trackId"
      HAVING COUNT(*) >= 2 AND MAX(lh."playedAt") < now() - interval '1 day'
      ORDER BY MAX(lh."playedAt") ASC, plays DESC
      LIMIT 20
    `;
    if (rows.length === 0) return [];

    const tracks = await this.prisma.track.findMany({
      where: { id: { in: rows.map((r) => r.trackId) } },
      include: {
        album: { select: { imageUrl: true } },
        artists: { include: { artist: { select: { name: true } } }, orderBy: { position: 'asc' }, take: 1 },
      },
    });
    const byId = new Map(tracks.map((t) => [t.id, t]));
    const now = Date.now();

    return rows.map((r) => {
      const t = byId.get(r.trackId);
      return {
        name: t?.name ?? 'Desconocido',
        artist: t?.artists[0]?.artist.name ?? '',
        imageUrl: t?.album?.imageUrl ?? null,
        plays: r.plays,
        lastPlayedAt: r.last,
        daysSince: Math.floor((now - new Date(r.last).getTime()) / 86_400_000),
      };
    });
  }

  /**
   * Song-level movers over a window of `days`:
   *  - rising: tracks accelerating (recent vs prior window) — "está despegando".
   *  - comebacks: tracks played again after a long silence (the previous play
   *    before the window was ≥45 days earlier) — "regresó después de N días".
   */
  async songMovers(userId: string, windowDays = 7): Promise<{ rising: SongStock[]; comebacks: SongComeback[] }> {
    const days = Math.min(365, Math.max(1, Math.round(windowDays)));

    const rows = await this.prisma.$queryRaw<Array<{ trackId: string; recent: number; prior: number }>>`
      SELECT lh."trackId",
             COUNT(*) FILTER (WHERE lh."playedAt" >= now() - (${days} || ' days')::interval)::int AS recent,
             COUNT(*) FILTER (
               WHERE lh."playedAt" >= now() - (${2 * days} || ' days')::interval
                 AND lh."playedAt" <  now() - (${days} || ' days')::interval
             )::int AS prior
      FROM listening_history lh
      WHERE lh."userId" = ${userId} AND lh."playedAt" >= now() - (${2 * days} || ' days')::interval
      GROUP BY lh."trackId"
      HAVING COUNT(*) FILTER (WHERE lh."playedAt" >= now() - (${days} || ' days')::interval) >= 2
    `;

    const comebackRows = await this.prisma.$queryRaw<
      Array<{ trackId: string; days_gone: number; last_before: Date }>
    >`
      WITH recent AS (
        SELECT "trackId", MIN("playedAt") AS first_recent
        FROM listening_history
        WHERE "userId" = ${userId} AND "playedAt" >= now() - (${days} || ' days')::interval
        GROUP BY "trackId"
      ),
      prior_last AS (
        -- Only tracks that were genuinely in rotation before (≥4 plays), so a
        -- one-off play years ago doesn't masquerade as a nostalgic comeback.
        SELECT "trackId", MAX("playedAt") AS last_before
        FROM listening_history
        WHERE "userId" = ${userId} AND "playedAt" < now() - (${days} || ' days')::interval
        GROUP BY "trackId"
        HAVING COUNT(*) >= 4
      )
      SELECT r."trackId",
             (EXTRACT(EPOCH FROM (r.first_recent - pl.last_before)) / 86400)::int AS days_gone,
             pl.last_before
      FROM recent r JOIN prior_last pl ON pl."trackId" = r."trackId"
      WHERE (r.first_recent - pl.last_before) >= interval '45 days'
      ORDER BY days_gone DESC LIMIT 12
    `;

    const rising = rows
      .map((r) => {
        const trendPct = r.prior > 0 ? Math.round(((r.recent - r.prior) / r.prior) * 100) : null;
        return { trackId: r.trackId, recent: r.recent, prior: r.prior, trendPct };
      })
      .filter((r) => r.recent > r.prior)
      .sort((a, b) => (b.trendPct ?? 9999) - (a.trendPct ?? 9999))
      .slice(0, 10);

    const ids = [...new Set([...rising.map((r) => r.trackId), ...comebackRows.map((r) => r.trackId)])];
    const meta = await this.trackMeta(ids);

    return {
      rising: rising.map((r) => ({ ...r, ...meta(r.trackId) })),
      comebacks: comebackRows.map((r) => ({
        trackId: r.trackId,
        daysGone: r.days_gone,
        lastBeforeAt: r.last_before,
        ...meta(r.trackId),
      })),
    };
  }

  /**
   * The graveyard page: tracks you clearly loved (≥10 plays) but have left
   * dormant (≥30 days silent), ranked by "loss" (plays × time gone), plus the
   * tracks that have RESURRECTED — the COMEBACK events we already logged.
   */
  async graveyardPage(userId: string): Promise<{ dormant: DormantTrack[]; resurrected: unknown[] }> {
    const rows = await this.prisma.$queryRaw<
      Array<{ trackId: string; plays: number; last: Date; days_since: number }>
    >`
      SELECT lh."trackId", COUNT(*)::int AS plays, MAX(lh."playedAt") AS last,
             (EXTRACT(EPOCH FROM (now() - MAX(lh."playedAt"))) / 86400)::int AS days_since
      FROM listening_history lh
      WHERE lh."userId" = ${userId}
      GROUP BY lh."trackId"
      HAVING COUNT(*) >= 10 AND MAX(lh."playedAt") < now() - interval '30 days'
      ORDER BY (COUNT(*)::float * EXTRACT(EPOCH FROM (now() - MAX(lh."playedAt")))) DESC
      LIMIT 24
    `;
    const meta = await this.trackMeta(rows.map((r) => r.trackId));
    const dormant: DormantTrack[] = rows.map((r) => ({
      trackId: r.trackId,
      plays: r.plays,
      daysSince: r.days_since,
      lastPlayedAt: r.last,
      ...meta(r.trackId),
    }));

    const resurrected = await this.prisma.musicEvent.findMany({
      where: { userId, type: 'COMEBACK' },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return { dormant, resurrected };
  }

  /**
   * Cementerio 2.0 — dormant tracks split into chapters (leyendas dormidas /
   * amores pasajeros / antiguos reyes), the endangered ones (about to die), the
   * resurrected, each dormant carrying a heuristic "probabilidad de regreso".
   */
  async graveyardCategories(userId: string) {
    const dormantRows = await this.prisma.$queryRaw<
      Array<{ trackId: string; plays: number; days_since: number; span_days: number; peak: number; peak_month: string }>
    >`
      WITH t AS (
        SELECT lh."trackId", COUNT(*)::int AS plays, MAX(lh."playedAt") AS last, MIN(lh."playedAt") AS first,
               (EXTRACT(EPOCH FROM (now() - MAX(lh."playedAt"))) / 86400)::int AS days_since
        FROM listening_history lh WHERE lh."userId" = ${userId}
        GROUP BY lh."trackId"
        HAVING COUNT(*) >= 10 AND MAX(lh."playedAt") < now() - interval '30 days'
      ),
      peak AS (
        SELECT "trackId", MAX(c)::int AS peak, (array_agg(ym ORDER BY c DESC))[1] AS peak_month
        FROM (
          SELECT lh."trackId", to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') AS ym, COUNT(*) AS c
          FROM listening_history lh WHERE lh."userId" = ${userId}
          GROUP BY 1, 2
        ) z WHERE "trackId" IN (SELECT "trackId" FROM t) GROUP BY "trackId"
      )
      SELECT t."trackId", t.plays, t.days_since, p.peak, p.peak_month,
             (EXTRACT(EPOCH FROM (t.last - t.first)) / 86400)::int AS span_days
      FROM t JOIN peak p ON p."trackId" = t."trackId"
      ORDER BY t.plays DESC LIMIT 60
    `;
    const kingRows = await this.prisma.$queryRaw<Array<{ trackId: string }>>`
      SELECT DISTINCT "trackId" FROM (
        SELECT "trackId", ROW_NUMBER() OVER (PARTITION BY date_trunc('month', "playedAt") ORDER BY COUNT(*) DESC) AS rn
        FROM listening_history WHERE "userId" = ${userId}
        GROUP BY date_trunc('month', "playedAt"), "trackId"
      ) z WHERE rn = 1
    `;
    const endangeredRows = await this.prisma.$queryRaw<Array<{ trackId: string; plays: number; days_since: number }>>`
      SELECT lh."trackId", COUNT(*)::int AS plays,
             (EXTRACT(EPOCH FROM (now() - MAX(lh."playedAt"))) / 86400)::int AS days_since
      FROM listening_history lh WHERE lh."userId" = ${userId}
      GROUP BY lh."trackId"
      HAVING COUNT(*) >= 8 AND MAX(lh."playedAt") < now() - interval '20 days' AND MAX(lh."playedAt") >= now() - interval '45 days'
      ORDER BY days_since DESC LIMIT 12
    `;

    const kingSet = new Set(kingRows.map((r) => r.trackId));
    const meta = await this.trackMeta([...dormantRows.map((r) => r.trackId), ...endangeredRows.map((r) => r.trackId)]);
    const prob = (plays: number, daysSince: number) =>
      Math.max(8, Math.min(92, Math.round(75 - daysSince * 0.12 + Math.log10(plays + 1) * 10)));

    const legends: GraveCard[] = [];
    const flings: GraveCard[] = [];
    const kings: GraveCard[] = [];
    for (const r of dormantRows) {
      const card: GraveCard = {
        trackId: r.trackId,
        ...meta(r.trackId),
        plays: r.plays,
        daysSince: r.days_since,
        peakMonth: r.peak_month,
        peakPlays: r.peak,
        returnProb: prob(r.plays, r.days_since),
      };
      if (kingSet.has(r.trackId)) kings.push(card);
      else if (r.span_days <= 75 && r.plays >= 15) flings.push(card);
      else legends.push(card);
    }

    const endangered: GraveCard[] = endangeredRows.map((r) => ({
      trackId: r.trackId,
      ...meta(r.trackId),
      plays: r.plays,
      daysSince: r.days_since,
      peakMonth: null,
      peakPlays: r.plays,
      returnProb: prob(r.plays, r.days_since),
    }));

    const resurrected = await this.prisma.musicEvent.findMany({
      where: { userId, type: 'COMEBACK' },
      orderBy: { createdAt: 'desc' },
      take: 12,
    });

    return {
      legends: legends.slice(0, 12),
      flings: flings.slice(0, 12),
      kings: kings.slice(0, 12),
      endangered,
      resurrected,
    };
  }

  /** Resolve trackId → { name, artist, imageUrl } for a set of tracks. */
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
    return (id: string) => {
      const t = byId.get(id);
      return {
        name: t?.name ?? 'Desconocida',
        artist: t?.artists[0]?.artist.name ?? null,
        imageUrl: t?.album?.imageUrl ?? null,
      };
    };
  }
}
