import { Injectable, Logger } from '@nestjs/common';
import { InsightKind, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MlClientService } from '../ml/ml-client.service';

/**
 * Insight Engine — deterministic FIRST, IA only narrates.
 *
 *  1. gatherSignals(): computes everything from real data (music + gaming),
 *     dedupes candidates by (type,id,normalizedName), and ranks obsession
 *     candidates by an obsessionScore — max 3 songs / 3 artists / 3 games.
 *  2. narrate(): hands the clean JSON to the LLM purely for prose; on any
 *     failure it falls back to local templates. The IA never discovers data.
 *  3. generate(): cached per (user, week) + rate-limited (auto 1/day, manual
 *     3/day), so refreshes don't burn tokens.
 */
@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);
  private static readonly AUTO_PER_DAY = 1;
  private static readonly MANUAL_PER_DAY = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlClientService,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.aiInsight.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 20 });
  }

  /** The current week's insight from cache; generates once (auto) if missing and allowed. */
  async current(userId: string) {
    const { periodStart } = this.weekPeriod();
    const existing = await this.prisma.aiInsight.findUnique({
      where: { uniq_user_insight_period: { userId, kind: InsightKind.WEEKLY_RECAP, periodStart } },
    });
    if (existing) return { insight: existing, rateLimited: false, remaining: this.remaining(existing, false) };
    // Respect the "insights automáticos" preference: don't auto-spend tokens.
    const u = await this.prisma.user.findUnique({ where: { id: userId }, select: { aiAuto: true } });
    if (u && !u.aiAuto) return { insight: null, rateLimited: false, remaining: InsightsService.MANUAL_PER_DAY };
    return this.generate(userId, false);
  }

  /** Delete all stored insights for the user (privacy / "borrar insights"). */
  async deleteAll(userId: string) {
    const { count } = await this.prisma.aiInsight.deleteMany({ where: { userId } });
    return { deleted: count };
  }

  /** Generate or refresh — rate-limited and cached. `manual` = user pressed Regenerar. */
  async generate(userId: string, manual: boolean) {
    const { periodStart, periodEnd } = this.weekPeriod();
    const existing = await this.prisma.aiInsight.findUnique({
      where: { uniq_user_insight_period: { userId, kind: InsightKind.WEEKLY_RECAP, periodStart } },
    });

    const gensToday = this.gensToday(existing);
    const limit = manual ? InsightsService.MANUAL_PER_DAY : InsightsService.AUTO_PER_DAY;
    if (existing && gensToday >= limit) {
      return { insight: existing, rateLimited: true, remaining: 0 };
    }

    const signals = await this.gatherSignals(userId);
    if (!signals) return { insight: existing ?? null, rateLimited: false, remaining: 0 };

    const narrative = await this.narrate(signals);
    const gens = [...this.gensList(existing), new Date().toISOString()].filter((iso) => this.isToday(iso));
    const data = { signals, narrative, generatedAt: new Date().toISOString(), gens } as unknown as Prisma.InputJsonValue;

    const insight = await this.prisma.aiInsight.upsert({
      where: { uniq_user_insight_period: { userId, kind: InsightKind.WEEKLY_RECAP, periodStart } },
      create: { userId, kind: InsightKind.WEEKLY_RECAP, periodStart, periodEnd, title: narrative.summary.slice(0, 120), body: narrative.summary, data, model: narrative.model },
      update: { title: narrative.summary.slice(0, 120), body: narrative.summary, data, model: narrative.model, periodEnd },
    });
    return { insight, rateLimited: false, remaining: Math.max(0, limit - gens.length) };
  }

  // ── 1. deterministic signals (music + gaming) ────────────────────────────────
  private async gatherSignals(userId: string): Promise<Signals | null> {
    const [week, prevMin, obsSongs, obsArtists, rising, comeback, drops, gaming] = await Promise.all([
      this.weekAgg(userId),
      this.prevWeekMinutes(userId),
      this.obsessionSongs(userId),
      this.obsessionArtists(userId),
      this.risingSongs(userId),
      this.weekComeback(userId),
      this.weekDrops(userId),
      this.gamingSignals(userId),
    ]);
    if (week.plays === 0 && gaming.hoursGained === 0) return null;

    const deltaPct = prevMin > 0 ? Math.round(((week.minutes - prevMin) / prevMin) * 100) : null;
    return {
      week: { minutes: week.minutes, plays: week.plays, uniqueArtists: week.uniqueArtists, prevMinutes: prevMin, deltaPct },
      topTracks: obsSongs.slice(0, 5).map((s) => ({ name: s.name, artist: s.artist, plays: s.plays })),
      topArtists: obsArtists.slice(0, 5).map((a) => ({ name: a.name, plays: a.plays })),
      rising,
      comeback,
      drops,
      gaming,
      obsessions: {
        songs: obsSongs.slice(0, 3).map((s) => ({ name: s.name, artist: s.artist, score: s.score })),
        artists: obsArtists.slice(0, 3).map((a) => ({ name: a.name, score: a.score })),
        games: gaming.obsessionGames.slice(0, 3),
      },
    };
  }

  /** Obsession candidates: plays + growth + active days, deduped by track. */
  private async obsessionSongs(userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ trackId: string; name: string; artist: string | null; plays: number; days: number; prev: number }>>`
      WITH tw AS (
        SELECT lh."trackId", COUNT(*)::int AS plays, COUNT(DISTINCT date_trunc('day', lh."playedAt"))::int AS days
        FROM listening_history lh WHERE lh."userId" = ${userId} AND lh."playedAt" >= now() - interval '7 days'
        GROUP BY lh."trackId"
      ),
      pw AS (
        SELECT "trackId", COUNT(*)::int AS prev FROM listening_history
        WHERE "userId" = ${userId} AND "playedAt" >= now() - interval '14 days' AND "playedAt" < now() - interval '7 days'
        GROUP BY "trackId"
      )
      SELECT tw."trackId", t.name, a.name AS artist, tw.plays, tw.days, COALESCE(pw.prev, 0) AS prev
      FROM tw JOIN tracks t ON t.id = tw."trackId"
      LEFT JOIN track_artists ta ON ta."trackId" = t.id AND ta.position = 0
      LEFT JOIN artists a ON a.id = ta."artistId"
      LEFT JOIN pw ON pw."trackId" = tw."trackId"
      ORDER BY tw.plays DESC LIMIT 20
    `;
    const scored = rows.map((r) => {
      const growth = r.prev > 0 ? Math.round(((r.plays - r.prev) / r.prev) * 100) : r.plays >= 4 ? 200 : 0;
      const score = r.plays * 3 + Math.min(60, growth * 0.3) + r.days * 5;
      return { trackId: r.trackId, name: r.name, artist: r.artist, plays: r.plays, score: Math.round(score) };
    });
    return this.dedupe(scored, (s) => s.name).sort((a, b) => b.score - a.score);
  }

  private async obsessionArtists(userId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ name: string; plays: number; days: number; prev: number }>>`
      WITH tw AS (
        SELECT lh."artistId", COUNT(*)::int AS plays, COUNT(DISTINCT date_trunc('day', lh."playedAt"))::int AS days
        FROM listening_history lh WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL AND lh."playedAt" >= now() - interval '7 days'
        GROUP BY lh."artistId"
      ),
      pw AS (
        SELECT "artistId", COUNT(*)::int AS prev FROM listening_history
        WHERE "userId" = ${userId} AND "artistId" IS NOT NULL AND "playedAt" >= now() - interval '14 days' AND "playedAt" < now() - interval '7 days'
        GROUP BY "artistId"
      )
      SELECT a.name, tw.plays, tw.days, COALESCE(pw.prev, 0) AS prev
      FROM tw JOIN artists a ON a.id = tw."artistId" LEFT JOIN pw ON pw."artistId" = tw."artistId"
      ORDER BY tw.plays DESC LIMIT 20
    `;
    const scored = rows.map((r) => {
      const growth = r.prev > 0 ? Math.round(((r.plays - r.prev) / r.prev) * 100) : r.plays >= 8 ? 150 : 0;
      return { name: r.name, plays: r.plays, score: Math.round(r.plays * 2 + Math.min(50, growth * 0.25) + r.days * 4) };
    });
    return this.dedupe(scored, (s) => s.name).sort((a, b) => b.score - a.score);
  }

  private async risingSongs(userId: string): Promise<{ name: string; artist: string | null; growthPct: number }[]> {
    const rows = await this.prisma.$queryRaw<Array<{ name: string; artist: string | null; recent: number; prior: number }>>`
      WITH counts AS (
        SELECT lh."trackId",
          COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '7 days')::int AS recent,
          COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '14 days' AND lh."playedAt" < now() - interval '7 days')::int AS prior
        FROM listening_history lh WHERE lh."userId" = ${userId} AND lh."playedAt" >= now() - interval '14 days'
        GROUP BY lh."trackId"
        HAVING COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '7 days') >= 3
      )
      SELECT t.name, a.name AS artist, c.recent, c.prior
      FROM counts c JOIN tracks t ON t.id = c."trackId"
      LEFT JOIN track_artists ta ON ta."trackId" = t.id AND ta.position = 0 LEFT JOIN artists a ON a.id = ta."artistId"
      WHERE c.recent > c.prior
    `;
    const scored = rows
      .map((r) => ({ name: r.name, artist: r.artist, growthPct: r.prior > 0 ? Math.round(((r.recent - r.prior) / r.prior) * 100) : 300 }))
      .sort((a, b) => b.growthPct - a.growthPct);
    return this.dedupe(scored, (s) => s.name).slice(0, 3);
  }

  private async weekComeback(userId: string): Promise<{ name: string; gapDays: number } | null> {
    const [row] = await this.prisma.$queryRaw<Array<{ name: string; gap_days: number }>>`
      WITH lb AS (
        SELECT a.name, MAX(lh."playedAt") FILTER (WHERE lh."playedAt" < now() - interval '7 days') AS prev,
               COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '7 days')::int AS tw
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL GROUP BY a.name
      )
      SELECT name, (EXTRACT(EPOCH FROM (now() - prev)) / 86400)::int AS gap_days
      FROM lb WHERE tw >= 3 AND prev IS NOT NULL AND prev < now() - interval '67 days'
      ORDER BY prev ASC LIMIT 1
    `;
    return row ? { name: row.name, gapDays: row.gap_days } : null;
  }

  private async weekDrops(userId: string): Promise<{ name: string; dropPct: number }[]> {
    const rows = await this.prisma.$queryRaw<Array<{ name: string; recent: number; prior: number }>>`
      SELECT a.name,
        COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '7 days')::int AS recent,
        COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '14 days' AND lh."playedAt" < now() - interval '7 days')::int AS prior
      FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
      WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL AND lh."playedAt" >= now() - interval '14 days'
      GROUP BY a.name HAVING COUNT(*) FILTER (WHERE lh."playedAt" >= now() - interval '14 days' AND lh."playedAt" < now() - interval '7 days') >= 10
    `;
    const scored = rows
      .filter((r) => r.recent <= r.prior * 0.4)
      .map((r) => ({ name: r.name, dropPct: Math.round(((r.recent - r.prior) / r.prior) * 100) }))
      .sort((a, b) => a.dropPct - b.dropPct);
    return this.dedupe(scored, (s) => s.name).slice(0, 3);
  }

  /** Gaming signals from Steam snapshots + library (0 when not linked). */
  private async gamingSignals(userId: string): Promise<GamingSignals> {
    const [rose] = await this.prisma.$queryRaw<Array<{ name: string; gained: number }>>`
      WITH base AS (
        SELECT DISTINCT ON ("appId") "appId", "playtimeForever" AS mins
        FROM steam_game_snapshots WHERE "userId" = ${userId} AND "capturedAt" <= now() - interval '6 days'
        ORDER BY "appId", "capturedAt" DESC
      )
      SELECT g.name, (ug."playtimeForever" - b.mins)::float / 60 AS gained
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId" JOIN base b ON b."appId" = g."appId"
      WHERE ug."userId" = ${userId} AND ug."playtimeForever" - b.mins > 0
      ORDER BY gained DESC LIMIT 1
    `;
    const [hrs] = await this.prisma.$queryRaw<Array<{ h: number }>>`
      WITH base AS (
        SELECT DISTINCT ON ("appId") "appId", "playtimeForever" AS mins
        FROM steam_game_snapshots WHERE "userId" = ${userId} AND "capturedAt" <= now() - interval '6 days'
        ORDER BY "appId", "capturedAt" DESC
      )
      SELECT COALESCE(SUM(GREATEST(0, ug."playtimeForever" - b.mins)), 0)::float / 60 AS h
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId" JOIN base b ON b."appId" = g."appId"
      WHERE ug."userId" = ${userId}
    `;
    const recent = await this.prisma.$queryRaw<Array<{ name: string; hours: number }>>`
      SELECT g.name, ROUND(ug."playtime2Weeks" / 60.0, 1)::float AS hours
      FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
      WHERE ug."userId" = ${userId} AND ug."playtime2Weeks" > 0
      ORDER BY ug."playtime2Weeks" DESC LIMIT 5
    `;
    const [unp] = await this.prisma.$queryRaw<Array<{ count: number; notable: string | null; mc: number | null }>>`
      SELECT COUNT(*) FILTER (WHERE ug."playtimeForever" = 0)::int AS count,
        (SELECT g2.name FROM user_games u2 JOIN steam_games g2 ON g2.id = u2."gameId"
         WHERE u2."userId" = ${userId} AND u2."playtimeForever" = 0 AND g2.metacritic IS NOT NULL
         ORDER BY g2.metacritic DESC LIMIT 1) AS notable,
        (SELECT MAX(g2.metacritic) FROM user_games u2 JOIN steam_games g2 ON g2.id = u2."gameId"
         WHERE u2."userId" = ${userId} AND u2."playtimeForever" = 0) AS mc
      FROM user_games ug WHERE ug."userId" = ${userId}
    `;
    const obsessionGames = this.dedupe(
      recent.map((r) => ({ name: r.name, score: Math.round(r.hours * 10) })),
      (s) => s.name,
    ).slice(0, 3);

    return {
      hoursGained: Math.round((hrs?.h ?? 0) * 10) / 10,
      topGrowthGame: rose ? { name: rose.name, hours: Math.round(rose.gained * 10) / 10 } : null,
      recentlyPlayed: recent.map((r) => r.name).slice(0, 3),
      unplayedCount: unp?.count ?? 0,
      notableUnplayed: unp?.notable ?? null,
      obsessionGames,
    };
  }

  // ── 2. narration (IA only writes; fallback to templates) ─────────────────────
  private async narrate(signals: Signals): Promise<Narrative> {
    const system =
      'Eres el narrador de Steatify. Recibes un JSON con datos YA calculados de música y gaming. ' +
      'NO inventes ni añadas datos: solo redacta con lo que se te da. Responde ÚNICAMENTE con un JSON válido ' +
      'con esta forma exacta: {"summary": string, "music": [string,string,string], "gaming": [string,string,string], ' +
      '"predictions": [string,string], "recommendation": string}. Tono cálido, breve, en español. Sin markdown.';
    const prompt = `Datos:\n${JSON.stringify(this.compactForLlm(signals))}`;

    const ai = await this.ml.narrate(prompt, system, 600);
    if (ai?.text) {
      const parsed = this.parseNarrative(ai.text);
      if (parsed) return { ...parsed, model: ai.model };
    }
    return { ...this.fallbackNarrative(signals), model: 'fallback' };
  }

  private parseNarrative(text: string): Omit<Narrative, 'model'> | null {
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start) return null;
      const obj = JSON.parse(text.slice(start, end + 1)) as Partial<Narrative>;
      if (typeof obj.summary !== 'string') return null;
      const arr = (x: unknown, n: number) => (Array.isArray(x) ? x.filter((s) => typeof s === 'string').slice(0, n) : []);
      return {
        summary: obj.summary,
        music: arr(obj.music, 3),
        gaming: arr(obj.gaming, 3),
        predictions: arr(obj.predictions, 2),
        recommendation: typeof obj.recommendation === 'string' ? obj.recommendation : '',
      };
    } catch {
      return null;
    }
  }

  /** Local templates so insights never break when the LLM is down. */
  private fallbackNarrative(s: Signals): Omit<Narrative, 'model'> {
    const w = s.week;
    const trend = w.deltaPct == null ? '' : w.deltaPct >= 10 ? ` (+${w.deltaPct}% vs la semana pasada)` : w.deltaPct <= -10 ? ` (${w.deltaPct}% vs la semana pasada)` : '';
    const summary = `Esta semana sumaste ${w.minutes} min en ${w.plays} reproducciones${trend}${s.gaming.hoursGained > 0 ? ` y +${s.gaming.hoursGained}h de juego` : ''}.`;

    const music: string[] = [];
    if (s.obsessions.songs[0]) music.push(`Tu obsesión: «${s.obsessions.songs[0].name}» de ${s.obsessions.songs[0].artist ?? '—'}.`);
    if (s.topArtists[0]) music.push(`${s.topArtists[0].name} lideró con ${s.topArtists[0].plays} reproducciones.`);
    if (s.rising[0]) music.push(`«${s.rising[0].name}» está despegando (+${s.rising[0].growthPct}%).`);
    if (s.comeback && music.length < 3) music.push(`${s.comeback.name} volvió tras ${s.comeback.gapDays} días.`);
    while (music.length < 3) music.push('Semana estable en tu rotación.');

    const gaming: string[] = [];
    if (s.gaming.topGrowthGame) gaming.push(`${s.gaming.topGrowthGame.name} sumó +${s.gaming.topGrowthGame.hours}h esta semana.`);
    if (s.gaming.recentlyPlayed[0]) gaming.push(`Volviste a ${s.gaming.recentlyPlayed[0]}.`);
    if (s.gaming.unplayedCount > 0) gaming.push(`Tienes ${s.gaming.unplayedCount} juegos sin abrir${s.gaming.notableUnplayed ? `, como ${s.gaming.notableUnplayed}` : ''}.`);
    while (gaming.length < 3) gaming.push('Sin novedades en Steam esta semana.');

    const predictions: string[] = [];
    if (s.obsessions.songs[0]) predictions.push(`«${s.obsessions.songs[0].name}» seguirá en tu top la próxima semana.`);
    if (s.drops[0]) predictions.push(`${s.drops[0].name} podría desaparecer de tu rotación (${s.drops[0].dropPct}%).`);
    while (predictions.length < 2) predictions.push('Tu rotación se mantendrá parecida.');

    const recommendation = s.gaming.notableUnplayed
      ? `Dale una oportunidad a ${s.gaming.notableUnplayed} esta semana.`
      : s.comeback
        ? `Reabre el capítulo de ${s.comeback.name}.`
        : 'Explora algo nuevo: rompe tu bucle esta semana.';

    return { summary, music: music.slice(0, 3), gaming: gaming.slice(0, 3), predictions: predictions.slice(0, 2), recommendation };
  }

  // ── helpers ──────────────────────────────────────────────────────────────────
  private compactForLlm(s: Signals) {
    return {
      semana: s.week,
      obsesiones: s.obsessions,
      top_artistas: s.topArtists,
      en_alza: s.rising,
      regreso: s.comeback,
      caidas: s.drops,
      gaming: { horas_ganadas: s.gaming.hoursGained, juego_que_subio: s.gaming.topGrowthGame, retomados: s.gaming.recentlyPlayed, sin_abrir: s.gaming.unplayedCount, destacado_sin_abrir: s.gaming.notableUnplayed },
    };
  }

  private dedupe<T>(items: T[], nameOf: (t: T) => string | null): T[] {
    const seen = new Set<string>();
    const out: T[] = [];
    for (const it of items) {
      const key = (nameOf(it) ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
    return out;
  }

  private weekPeriod() {
    const periodEnd = new Date();
    periodEnd.setUTCHours(0, 0, 0, 0);
    const periodStart = new Date(periodEnd);
    periodStart.setUTCDate(periodEnd.getUTCDate() - 6);
    return { periodStart, periodEnd };
  }

  private isToday(iso: string): boolean {
    return iso.slice(0, 10) === new Date().toISOString().slice(0, 10);
  }
  private gensList(insight: { data: Prisma.JsonValue } | null): string[] {
    const d = insight?.data as { gens?: unknown } | null;
    return Array.isArray(d?.gens) ? (d!.gens as string[]).filter((x) => typeof x === 'string') : [];
  }
  private gensToday(insight: { data: Prisma.JsonValue } | null): number {
    return this.gensList(insight).filter((iso) => this.isToday(iso)).length;
  }
  private remaining(insight: { data: Prisma.JsonValue } | null, manual: boolean): number {
    const limit = manual ? InsightsService.MANUAL_PER_DAY : InsightsService.AUTO_PER_DAY;
    return Math.max(0, limit - this.gensToday(insight));
  }

  private async weekAgg(userId: string) {
    const [row] = await this.prisma.$queryRaw<Array<{ minutes: number; plays: number; uniqueArtists: number }>>`
      SELECT (COALESCE(SUM("msPlayed"), 0) / 60000.0)::float AS minutes, COUNT(*)::int AS plays,
             COUNT(DISTINCT "artistId")::int AS "uniqueArtists"
      FROM listening_history WHERE "userId" = ${userId} AND "playedAt" >= now() - interval '7 days'
    `;
    return { minutes: Math.round(row?.minutes ?? 0), plays: row?.plays ?? 0, uniqueArtists: row?.uniqueArtists ?? 0 };
  }
  private async prevWeekMinutes(userId: string) {
    const [row] = await this.prisma.$queryRaw<Array<{ m: number }>>`
      SELECT (COALESCE(SUM("msPlayed"), 0) / 60000.0)::float AS m FROM listening_history
      WHERE "userId" = ${userId} AND "playedAt" >= now() - interval '14 days' AND "playedAt" < now() - interval '7 days'
    `;
    return Math.round(row?.m ?? 0);
  }
}

// ── types ──
interface GamingSignals {
  hoursGained: number;
  topGrowthGame: { name: string; hours: number } | null;
  recentlyPlayed: string[];
  unplayedCount: number;
  notableUnplayed: string | null;
  obsessionGames: { name: string; score: number }[];
}
interface Signals {
  week: { minutes: number; plays: number; uniqueArtists: number; prevMinutes: number; deltaPct: number | null };
  topTracks: { name: string; artist: string | null; plays: number }[];
  topArtists: { name: string; plays: number }[];
  rising: { name: string; artist: string | null; growthPct: number }[];
  comeback: { name: string; gapDays: number } | null;
  drops: { name: string; dropPct: number }[];
  gaming: GamingSignals;
  obsessions: {
    songs: { name: string; artist: string | null; score: number }[];
    artists: { name: string; score: number }[];
    games: { name: string; score: number }[];
  };
}
interface Narrative {
  summary: string;
  music: string[];
  gaming: string[];
  predictions: string[];
  recommendation: string;
  model: string | null;
}
