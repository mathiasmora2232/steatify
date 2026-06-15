import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MlClientService } from '../ml/ml-client.service';

/**
 * Eras musicales — each month is its own chapter, named from MANY signals (not
 * just the #1 artist + a template). For each month we compute concentration,
 * repetition, exploration, nostalgia and time-of-day, then pick an era archetype
 * and write copy that explains WHY. Nothing is invented: with no genre/audio-
 * feature data we don't fake "urbana/alternativa/clásica" eras.
 */

type EraTypeKey =
  | 'construccion'
  | 'dominada'
  | 'deRegreso'
  | 'obsesiva'
  | 'nostalgica'
  | 'exploradora'
  | 'maratonista'
  | 'nocturna'
  | 'mananera'
  | 'mixta';

interface MonthSignals {
  dominantArtistShare: number;
  top3Share: number;
  repeatScore: number;
  explorationScore: number;
  nostalgiaScore: number;
  nightScore: number;
}

interface MonthProfile {
  ym: string;
  year: number;
  month: number;
  minutes: number;
  plays: number;
  uniqueArtists: number;
  top5: { name: string; plays: number; share: number }[];
  topTracks: { name: string; artist: string | null; plays: number }[];
  maxTrackPlays: number;
  newArtistCount: number;
  comeback: { name: string; retPlays: number } | null;
  parts: { madrugada: number; manana: number; tarde: number; noche: number };
  dominantPart: 'madrugada' | 'manana' | 'tarde' | 'noche';
  peakHour: number | null;
  signals: MonthSignals;
}

// theme key (used by the frontend's eraTheme) per archetype
const THEME_KEY: Record<EraTypeKey, string> = {
  nocturna: 'night',
  mananera: 'morning',
  exploradora: 'explorer',
  obsesiva: 'loop',
  maratonista: 'intense',
  nostalgica: 'nostalgic',
  dominada: 'dominada',
  deRegreso: 'regreso',
  mixta: 'steady',
  construccion: 'construccion',
};

@Injectable()
export class ErasService {
  private readonly logger = new Logger(ErasService.name);

  private static readonly NARRATIVE_SYSTEM =
    'Eres el narrador de un diario musical personal. Describe esta "era" mensual ' +
    'de quien escucha música de forma emocional, en 2 o 3 frases, en segunda ' +
    'persona, con un tono cálido e íntimo. Usa los nombres reales de los ' +
    'artistas. No uses markdown ni comillas. No inventes datos: cíñete a los ' +
    'hechos que se te dan.';

  private narrativeCache = new Map<string, { text: string | null; model: string | null; at: number }>();
  private static readonly NARRATIVE_TTL_MS = 30 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlClientService,
  ) {}

  async listForUser(userId: string) {
    return this.prisma.musicEra.findMany({ where: { userId }, orderBy: { startDate: 'desc' } });
  }

  async narrative(userId: string, eraId: string): Promise<{ text: string | null; model: string | null }> {
    const cached = this.narrativeCache.get(eraId);
    if (cached && Date.now() - cached.at < ErasService.NARRATIVE_TTL_MS) {
      return { text: cached.text, model: cached.model };
    }
    const era = await this.prisma.musicEra.findFirst({ where: { id: eraId, userId } });
    if (!era) return { text: null, model: null };

    const monthYear = era.startDate.toLocaleDateString('es', { month: 'long', year: 'numeric' });
    const artists = ((era.dominantArtists as string[] | null) ?? []).filter(Boolean);
    const signals = (era.signals as MonthSignals | null) ?? null;
    const facts = [
      `Mes: ${monthYear}`,
      `Título de la era: ${era.title}`,
      `Tipo de era: ${era.eraType ?? '—'}`,
      artists.length ? `Artistas top: ${artists.join(', ')}` : null,
      signals ? `Concentración del artista #1: ${Math.round(signals.dominantArtistShare * 100)}%` : null,
      signals && signals.nightScore >= 0.3 ? `Actividad nocturna: ${Math.round(signals.nightScore * 100)}%` : null,
      era.peakHour != null ? `Hora pico: ${String(era.peakHour).padStart(2, '0')}:00` : null,
      era.summary ? `Resumen: ${era.summary}` : null,
    ].filter(Boolean);
    const prompt = `Narra esta era musical:\n${facts.join('\n')}`;

    const ai = await this.ml.narrate(prompt, ErasService.NARRATIVE_SYSTEM, 220);
    const result = { text: ai?.text ?? null, model: ai?.model ?? null };
    this.narrativeCache.set(eraId, { ...result, at: Date.now() });
    return result;
  }

  async rebuild(userId: string): Promise<{ eras: number }> {
    const profiles = await this.buildMonthlyProfiles(userId);
    if (profiles.length === 0) {
      await this.prisma.musicEra.deleteMany({ where: { userId } });
      return { eras: 0 };
    }

    // Baselines across the user's own months, so each month is labeled by its
    // MOST distinctive signal (a z-score), not a greedy fixed priority. This is
    // what makes types spread out and every month feel like its own chapter.
    const active = profiles.filter((p) => p.plays >= 30);
    const stats = {
      exploration: meanStd(active.map((p) => p.signals.explorationScore)),
      repeat: meanStd(active.map((p) => p.signals.repeatScore)),
      nostalgia: meanStd(active.map((p) => p.signals.nostalgiaScore)),
      night: meanStd(active.map((p) => p.signals.nightScore)),
      minutes: meanStd(active.map((p) => p.minutes)),
      morning: meanStd(active.map((p) => p.parts.manana)),
    };

    // Build chronologically so we can avoid repeating a title/description in
    // consecutive months.
    let prevTitle = '';
    let prevDesc = '';
    const rows = profiles.map((p, i) => {
      const data = this.toEra(userId, p, i, stats, prevTitle, prevDesc, i === profiles.length - 1);
      prevTitle = data.title;
      prevDesc = data.summary;
      return data;
    });

    await this.prisma.$transaction([
      this.prisma.musicEra.deleteMany({ where: { userId } }),
      ...rows.map((data) => this.prisma.musicEra.create({ data })),
    ]);
    this.logger.debug(`Rebuilt ${rows.length} eras for user ${userId}`);
    return { eras: rows.length };
  }

  // ── archetype + copy ────────────────────────────────────────────────────────

  private chooseType(p: MonthProfile, stats: SignalStats): { type: EraTypeKey; badges: string[] } {
    if (p.plays < 30 || p.minutes < 45) return { type: 'construccion', badges: [] };
    const s = p.signals;

    // Facets that pass an ABSOLUTE threshold — these feed the badges (a month can
    // wear several).
    const facets: string[] = [];
    if (s.dominantArtistShare >= 0.6) facets.push('dominada');
    if (p.maxTrackPlays >= 20 || s.repeatScore >= 0.6) facets.push('obsesiva');
    if (p.newArtistCount >= 25 || s.explorationScore >= 0.45) facets.push('exploradora');
    if (s.nostalgiaScore >= 0.25) facets.push('nostalgica');
    if (s.nightScore >= 0.4) facets.push('nocturna');
    if (p.comeback && p.comeback.retPlays >= 15) facets.unshift('deRegreso');

    // PRIMARY: absolute overrides first (a clear dominant artist or a strong
    // single-artist return are unambiguous), then the most distinctive signal
    // relative to THIS user's own months (z-score) — so types spread out.
    let type: EraTypeKey;
    if (s.dominantArtistShare >= 0.65) {
      type = 'dominada';
    } else if (p.comeback && p.comeback.retPlays >= 20) {
      type = 'deRegreso';
    } else {
      const z: Array<[EraTypeKey, number]> = [
        ['exploradora', zScore(s.explorationScore, stats.exploration)],
        ['obsesiva', zScore(s.repeatScore, stats.repeat)],
        ['nostalgica', zScore(s.nostalgiaScore, stats.nostalgia)],
        ['nocturna', zScore(s.nightScore, stats.night)],
        ['maratonista', zScore(p.minutes, stats.minutes)],
        ['mananera', zScore(p.parts.manana, stats.morning)],
      ];
      z.sort((a, b) => b[1] - a[1]);
      // Nothing clearly stands out → a genuinely balanced "mixta" month.
      type = z[0][1] >= 0.6 ? z[0][0] : 'mixta';
    }

    const badges = [type, ...facets].filter((v, idx, arr) => arr.indexOf(v) === idx && v !== 'construccion');
    return { type, badges: badges.length ? badges.slice(0, 4) : ['mixta'] };
  }

  private toEra(
    userId: string,
    p: MonthProfile,
    ordinal: number,
    stats: SignalStats,
    prevTitle: string,
    prevDesc: string,
    ongoing: boolean,
  ) {
    const { type, badges } = this.chooseType(p, stats);
    const leader = p.top5[0]?.name ?? null;
    const top3 = p.top5.slice(0, 3).map((a) => a.name);
    const secondary = p.top5.slice(1, 3).map((a) => a.name);
    const share = p.signals.dominantArtistShare;

    const ctx = {
      leader,
      artists: this.joinNames(top3),
      secondary: this.joinNames(secondary.length ? secondary : top3.slice(1)),
      sharePct: `${Math.round(share * 100)}%`,
      nostPct: `${Math.round(p.signals.nostalgiaScore * 100)}%`,
      newCount: String(p.newArtistCount),
      hours: String(Math.round(p.minutes / 60)),
      topTrack: p.topTracks[0]?.name ?? '',
      window: this.windowPhrase(p),
    };

    let title = this.pickVariant(TITLES[type], ordinal, ctx, prevTitle);
    // Naming rules: only lead with the artist if concentration ≥55%. Between
    // 55–65% we mention them "al frente"; ≥65% the title is already a "Dominio".
    if (type !== 'dominada' && type !== 'deRegreso' && type !== 'construccion') {
      if (share >= 0.55 && share < 0.65 && leader) title = `${title} · ${leader} al frente`;
    }
    const summary = this.pickVariant(DESCRIPTIONS[type], ordinal + 7, ctx, prevDesc);

    const start = new Date(`${p.ym}-01T00:00:00.000Z`);
    const end = this.endOfMonth(p.ym);

    return {
      userId,
      startDate: start,
      endDate: ongoing ? null : end,
      title,
      summary,
      eraType: type,
      dominantGenres: [THEME_KEY[type]],
      dominantArtists: p.top5.map((a) => a.name),
      topTracks: p.topTracks,
      signals: p.signals as unknown as object,
      badges,
      avgValence: null,
      avgEnergy: null,
      peakHour: p.peakHour,
      dominantMood: null,
      // "consistency" ring = how concentrated the month was (top-3 share).
      confidence: Number(p.signals.top3Share.toFixed(2)),
    };
  }

  /** Pick a copy variant by ordinal; bump if it would repeat the previous month. */
  private pickVariant(pool: string[], seed: number, ctx: Record<string, string>, prev: string): string {
    if (pool.length === 0) return '';
    let idx = ((seed % pool.length) + pool.length) % pool.length;
    let out = this.fill(pool[idx], ctx);
    if (out === prev && pool.length > 1) {
      idx = (idx + 1) % pool.length;
      out = this.fill(pool[idx], ctx);
    }
    return out;
  }

  private fill(t: string, ctx: Record<string, string>): string {
    return t.replace(/\{(\w+)\}/g, (_, k: string) => ctx[k] ?? '').replace(/\s+/g, ' ').trim();
  }

  private joinNames(names: string[]): string {
    const xs = names.filter(Boolean);
    if (xs.length === 0) return 'tus artistas';
    if (xs.length === 1) return xs[0];
    return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`;
  }

  private windowPhrase(p: MonthProfile): string {
    if (p.signals.nightScore >= 0.4) return 'entre las 22:00 y las 2:00';
    switch (p.dominantPart) {
      case 'madrugada':
        return 'en la madrugada, entre la 1:00 y las 5:00';
      case 'manana':
        return 'por las mañanas';
      case 'tarde':
        return 'por las tardes';
      case 'noche':
        return 'entre las 20:00 y la medianoche';
    }
  }

  // ── monthly profiles ─────────────────────────────────────────────────────────

  private async buildMonthlyProfiles(userId: string): Promise<MonthProfile[]> {
    const [base, artists, tracks, repeat, hours, news, comebacks, peak] = await Promise.all([
      this.qBase(userId),
      this.qTopArtists(userId),
      this.qTopTracks(userId),
      this.qRepeat(userId),
      this.qHours(userId),
      this.qNewArtists(userId),
      this.qComebacks(userId),
      this.qPeakHour(userId),
    ]);
    if (base.length === 0) return [];

    return base.map((b) => {
      const a5 = artists.get(b.ym) ?? [];
      const artistTotal = a5.reduce((s, x) => s + x.plays, 0) || b.plays || 1;
      const top5 = a5.map((x) => ({ name: x.name, plays: x.plays, share: x.plays / artistTotal }));
      const top3Plays = top5.slice(0, 3).reduce((s, x) => s + x.plays, 0);
      const rep = repeat.get(b.ym);
      const hb = hours.get(b.ym);
      const partsTotal = hb ? hb.madrugada + hb.manana + hb.tarde + hb.noche || 1 : 1;
      const parts = hb
        ? { madrugada: hb.madrugada / partsTotal, manana: hb.manana / partsTotal, tarde: hb.tarde / partsTotal, noche: hb.noche / partsTotal }
        : { madrugada: 0, manana: 0, tarde: 0, noche: 0 };
      const dominantPart = (['madrugada', 'manana', 'tarde', 'noche'] as const).reduce((best, k) =>
        parts[k] > parts[best] ? k : best,
      );
      const distinct = rep?.distinctTracks ?? Math.max(1, b.uniqueArtists);
      const repeatScore = clamp01((b.plays / distinct - 1) / 4);

      return {
        ym: b.ym,
        year: Number(b.ym.slice(0, 4)),
        month: Number(b.ym.slice(5, 7)),
        minutes: Math.round(b.minutes),
        plays: b.plays,
        uniqueArtists: b.uniqueArtists,
        top5,
        topTracks: tracks.get(b.ym) ?? [],
        maxTrackPlays: rep?.maxTrack ?? 0,
        newArtistCount: news.get(b.ym) ?? 0,
        comeback: comebacks.get(b.ym) ?? null,
        parts,
        dominantPart,
        peakHour: peak.get(b.ym) ?? null,
        signals: {
          dominantArtistShare: top5[0] ? top5[0].plays / artistTotal : 0,
          top3Share: top3Plays / artistTotal,
          repeatScore,
          explorationScore: b.uniqueArtists > 0 ? clamp01((news.get(b.ym) ?? 0) / b.uniqueArtists) : 0,
          nostalgiaScore: hb ? clamp01((comebacks.get(b.ym)?.monthScore ?? 0)) : (comebacks.get(b.ym)?.monthScore ?? 0),
          nightScore: hb && partsTotal > 0 ? clamp01(hb.nightWindow / partsTotal) : 0,
        },
      };
    });
  }

  private async qBase(userId: string) {
    return this.prisma.$queryRaw<Array<{ ym: string; minutes: number; plays: number; uniqueArtists: number }>>`
      SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym,
             (SUM("msPlayed") / 60000.0)::float AS minutes,
             COUNT(*)::int AS plays,
             COUNT(DISTINCT "artistId")::int AS "uniqueArtists"
      FROM listening_history WHERE "userId" = ${userId}
      GROUP BY 1 ORDER BY 1
    `;
  }

  private async qTopArtists(userId: string): Promise<Map<string, { name: string; plays: number }[]>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; name: string; plays: number; rn: number }>>`
      WITH counts AS (
        SELECT to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') AS ym, a.name, COUNT(*)::int AS plays
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL
        GROUP BY 1, a.name
      ),
      ranked AS (
        SELECT ym, name, plays, ROW_NUMBER() OVER (PARTITION BY ym ORDER BY plays DESC) AS rn FROM counts
      )
      SELECT ym, name, plays, rn::int AS rn FROM ranked WHERE rn <= 5 ORDER BY ym, rn
    `;
    const map = new Map<string, { name: string; plays: number }[]>();
    for (const r of rows) {
      const arr = map.get(r.ym) ?? [];
      arr.push({ name: r.name, plays: r.plays });
      map.set(r.ym, arr);
    }
    return map;
  }

  private async qTopTracks(userId: string): Promise<Map<string, { name: string; artist: string | null; plays: number }[]>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; name: string; artist: string | null; plays: number }>>`
      WITH counts AS (
        SELECT to_char(date_trunc('month', lh."playedAt"), 'YYYY-MM') AS ym, t.name, a.name AS artist, COUNT(*)::int AS plays
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId" LEFT JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId}
        GROUP BY 1, t.name, a.name
      ),
      ranked AS (
        SELECT ym, name, artist, plays, ROW_NUMBER() OVER (PARTITION BY ym ORDER BY plays DESC) AS rn FROM counts
      )
      SELECT ym, name, artist, plays FROM ranked WHERE rn <= 10 ORDER BY ym, plays DESC
    `;
    const map = new Map<string, { name: string; artist: string | null; plays: number }[]>();
    for (const r of rows) {
      const arr = map.get(r.ym) ?? [];
      arr.push({ name: r.name, artist: r.artist, plays: r.plays });
      map.set(r.ym, arr);
    }
    return map;
  }

  private async qRepeat(userId: string): Promise<Map<string, { maxTrack: number; distinctTracks: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; maxTrack: number; distinctTracks: number }>>`
      SELECT ym, MAX(c)::int AS "maxTrack", COUNT(*)::int AS "distinctTracks"
      FROM (
        SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym, "trackId", COUNT(*) AS c
        FROM listening_history WHERE "userId" = ${userId} GROUP BY 1, "trackId"
      ) s GROUP BY ym
    `;
    return new Map(rows.map((r) => [r.ym, { maxTrack: r.maxTrack, distinctTracks: r.distinctTracks }]));
  }

  private async qHours(userId: string): Promise<Map<string, { madrugada: number; manana: number; tarde: number; noche: number; nightWindow: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; madrugada: number; manana: number; tarde: number; noche: number; nightwindow: number }>>`
      SELECT ym,
        SUM(CASE WHEN h >= 0 AND h < 6 THEN 1 ELSE 0 END)::int AS madrugada,
        SUM(CASE WHEN h >= 6 AND h < 12 THEN 1 ELSE 0 END)::int AS manana,
        SUM(CASE WHEN h >= 12 AND h < 19 THEN 1 ELSE 0 END)::int AS tarde,
        SUM(CASE WHEN h >= 19 AND h < 24 THEN 1 ELSE 0 END)::int AS noche,
        SUM(CASE WHEN h >= 22 OR h < 6 THEN 1 ELSE 0 END)::int AS nightwindow
      FROM (
        SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym, EXTRACT(HOUR FROM "playedAt")::int AS h
        FROM listening_history WHERE "userId" = ${userId}
      ) s GROUP BY ym
    `;
    return new Map(rows.map((r) => [r.ym, { madrugada: r.madrugada, manana: r.manana, tarde: r.tarde, noche: r.noche, nightWindow: r.nightwindow }]));
  }

  private async qNewArtists(userId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; n: number }>>`
      WITH firsts AS (
        SELECT "artistId", date_trunc('month', MIN("playedAt")) AS fm
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
        GROUP BY "artistId"
      )
      SELECT to_char(fm, 'YYYY-MM') AS ym, COUNT(*)::int AS n FROM firsts GROUP BY 1
    `;
    return new Map(rows.map((r) => [r.ym, r.n]));
  }

  /** Per month: nostalgia score (share of plays after a 60d+ gap) + top comeback artist (90d+). */
  private async qComebacks(userId: string): Promise<Map<string, { name: string; retPlays: number; monthScore: number }>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; name: string; cb60: number; cb90: number; plays: number }>>`
      WITH gaps AS (
        SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym, "artistId",
               "playedAt" - LAG("playedAt") OVER (PARTITION BY "artistId" ORDER BY "playedAt") AS gap
        FROM listening_history WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
      )
      SELECT g.ym, a.name,
             COUNT(*) FILTER (WHERE gap >= INTERVAL '60 days')::int AS cb60,
             COUNT(*) FILTER (WHERE gap >= INTERVAL '90 days')::int AS cb90,
             COUNT(*)::int AS plays
      FROM gaps g JOIN artists a ON a.id = g."artistId"
      GROUP BY g.ym, a.name
    `;
    // Aggregate per month: total comeback plays for the score, top artist for "De regreso".
    const byMonth = new Map<string, { cb60: number; plays: number; top: { name: string; retPlays: number } }>();
    for (const r of rows) {
      const m = byMonth.get(r.ym) ?? { cb60: 0, plays: 0, top: { name: '', retPlays: 0 } };
      m.cb60 += r.cb60;
      m.plays += r.plays;
      if (r.cb90 > m.top.retPlays) m.top = { name: r.name, retPlays: r.cb90 };
      byMonth.set(r.ym, m);
    }
    const out = new Map<string, { name: string; retPlays: number; monthScore: number }>();
    for (const [ym, m] of byMonth) {
      out.set(ym, {
        name: m.top.name,
        retPlays: m.top.retPlays,
        monthScore: m.plays > 0 ? m.cb60 / m.plays : 0,
      });
    }
    return out;
  }

  private async qPeakHour(userId: string): Promise<Map<string, number>> {
    const rows = await this.prisma.$queryRaw<Array<{ ym: string; hour: number }>>`
      WITH ranked AS (
        SELECT to_char(date_trunc('month', "playedAt"), 'YYYY-MM') AS ym,
               EXTRACT(HOUR FROM "playedAt")::int AS hour,
               ROW_NUMBER() OVER (PARTITION BY date_trunc('month', "playedAt") ORDER BY COUNT(*) DESC) AS rn
        FROM listening_history WHERE "userId" = ${userId}
        GROUP BY ym, date_trunc('month', "playedAt"), hour
      )
      SELECT ym, hour FROM ranked WHERE rn = 1
    `;
    return new Map(rows.map((r) => [r.ym, r.hour]));
  }

  private endOfMonth(ym: string): Date {
    const [y, m] = ym.split('-').map(Number);
    return new Date(Date.UTC(y, m, 0));
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

interface MeanStd {
  mean: number;
  std: number;
}
type SignalStats = Record<'exploration' | 'repeat' | 'nostalgia' | 'night' | 'minutes' | 'morning', MeanStd>;

function meanStd(values: number[]): MeanStd {
  if (values.length === 0) return { mean: 0, std: 0 };
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return { mean, std: Math.sqrt(variance) };
}

function zScore(value: number, ms: MeanStd): number {
  return ms.std > 0 ? (value - ms.mean) / ms.std : 0;
}

// ── copy pools (≥5 variants per type; placeholders {leader}{artists}{secondary}
//    {sharePct}{nostPct}{newCount}{hours}{topTrack}{window}) ───────────────────
const TITLES: Record<EraTypeKey, string[]> = {
  dominada: ['Dominio {leader}', 'Mes territorio de {leader}', '{leader} sin competencia', 'Reinado de {leader}', 'Todo giró en torno a {leader}'],
  deRegreso: ['De regreso: {leader}', 'El retorno de {leader}', '{leader} volvió con fuerza', 'Reencuentro con {leader}', '{leader}, otra vez en bucle'],
  obsesiva: ['Era obsesiva', 'Mes en bucle', 'Una obsesión sonora', 'Repetición sin freno', 'El mes del repeat'],
  nostalgica: ['Era nostálgica', 'Vuelta al pasado', 'Nostalgia en rotación', 'Reencuentro con tus clásicos', 'El mes de los regresos'],
  exploradora: ['Era exploradora', 'Mes de descubrimientos', 'Territorio nuevo', 'Expansión sonora', 'El mes de lo desconocido'],
  maratonista: ['Era maratonista', 'Mes sin pausa', 'Maratón sonoro', 'Horas y horas', 'El mes de no parar'],
  nocturna: ['Era nocturna', 'Noches largas', 'Mes de madrugadas', 'El sonido de la noche', 'Después de medianoche'],
  mananera: ['Era mañanera', 'Mes de amaneceres', 'Bandas sonoras de mañana', 'Sonó temprano', 'Mañanas con ritmo'],
  mixta: ['Era mixta', 'Mes variado', 'Un poco de todo', 'Sin un solo dueño', 'Mes ecléctico'],
  construccion: ['Mes en construcción'],
};

const DESCRIPTIONS: Record<EraTypeKey, string[]> = {
  dominada: [
    '{leader} acaparó el {sharePct} de tus reproducciones; aun así sonaron {secondary}.',
    'Mes claramente de {leader} ({sharePct} de tus plays), con {secondary} de apoyo.',
    'Casi todo fue {leader} este mes, pero {secondary} también marcaron presencia.',
    '{leader} dominó tu rotación con un {sharePct}; {secondary} completaron el cuadro.',
    'Pocos discutieron el trono de {leader} ({sharePct}). Detrás, {secondary}.',
  ],
  deRegreso: [
    '{leader} volvió tras meses fuera y se metió de lleno en tu rotación, junto a {secondary}.',
    'Reapareció {leader} después de un buen tiempo; {artists} marcaron el mes.',
    'El regreso de {leader} definió la era, con {secondary} acompañando.',
    'Recuperaste a {leader} este mes. {artists} llevaron el peso.',
    'Después de un parón, {leader} volvió con fuerza; {secondary} le hicieron coro.',
  ],
  obsesiva: [
    'Repetiste tus favoritas sin parar — "{topTrack}" fue la más sonada. {artists} mandaron.',
    'Un mes en bucle: pocas canciones, muchísimas vueltas. {artists} al frente.',
    'Te quedaste pegado a lo mismo; "{topTrack}" giró una y otra vez. Lideraron {artists}.',
    'Obsesión pura: repetiste lo que te gustó hasta el cansancio, con {artists} arriba.',
    'Nada de variedad este mes — encontraste tu sonido ({artists}) y no lo soltaste.',
  ],
  nostalgica: [
    'Volviste a sonidos que tenías guardados: el {nostPct} de tus plays fueron regresos. {artists} marcaron el mes.',
    'Mes de mirar atrás — {nostPct} de tu música fue reencuentro. Sonaron {artists}.',
    'Rescataste viejos favoritos; buena parte del mes ({nostPct}) fueron retornos. {artists} al frente.',
    'La nostalgia pesó: {nostPct} de tus reproducciones venían del pasado, con {artists} arriba.',
    'Reabriste capítulos antiguos este mes ({nostPct} de regresos), liderados por {artists}.',
  ],
  exploradora: [
    'Sumaste {newCount} artistas nuevos este mes. {artists} lideraron la búsqueda.',
    'Mes de descubrir: {newCount} nombres frescos entraron a tu rotación, con {artists} arriba.',
    'Saliste a explorar — {newCount} artistas nuevos. {artists} fueron lo más sonado.',
    'Curiosidad alta: {newCount} debuts en tu historial este mes, encabezados por {artists}.',
    'Abriste la puerta a {newCount} artistas nuevos; aun así {artists} se llevaron las horas.',
  ],
  maratonista: [
    '{hours} h escuchadas: uno de tus meses más intensos. {artists} te acompañaron sin pausa.',
    'Mes maratón — {hours} h de música, con {artists} sonando de fondo todo el tiempo.',
    'No paraste: {hours} h en total. {artists} pusieron la banda sonora.',
    'Volumen altísimo este mes ({hours} h). Lideraron {artists}.',
    'Tus oídos no descansaron: {hours} h, con {artists} al frente.',
  ],
  nocturna: [
    'Tu actividad se concentró {window}, con {artists} dominando la rotación.',
    'Mes de noctámbulo: la música sonó {window}. {artists} llevaron las madrugadas.',
    'Escuchaste sobre todo {window}; {artists} fueron el sonido de esas horas.',
    'Las noches fueron tuyas {window}, acompañado de {artists}.',
    'Tu pico fue {window} — ahí mandaron {artists}.',
  ],
  mananera: [
    'Tu música sonó sobre todo por las mañanas, con {artists} al frente.',
    'Mes de empezar temprano: {artists} marcaron tus amaneceres.',
    'Las mañanas tuvieron banda sonora — {artists} la pusieron.',
    'Sonaste temprano este mes, liderado por {artists}.',
    'Tu rotación se activó de mañana, con {artists} arriba.',
  ],
  mixta: [
    'Un mes sin un dueño claro: {artists} se repartieron tu rotación.',
    'Variedad total — ningún artista se impuso. Sonaron {artists}.',
    'Mes ecléctico: saltaste entre estilos, con {artists} entre lo más jugado.',
    'Sin obsesiones ni dominios este mes; {artists} compartieron protagonismo.',
    'Equilibrio raro: {artists} convivieron sin que nadie mandara.',
  ],
  construccion: [
    'Mes en construcción: pocos datos todavía. Lo más sonado: {artists}.',
    'Aún con poca actividad registrada. Asomaron {artists}.',
    'Mes incompleto en datos — por ahora suenan {artists}.',
  ],
};
