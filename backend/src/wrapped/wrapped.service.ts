import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DnaService } from '../dna/dna.service';
import { SteamService } from '../steam/steam.service';
import { MlClientService } from '../ml/ml-client.service';
import { RedisCacheService } from '../cache/redis-cache.service';

const WRAPPED_SYSTEM =
  'Eres el narrador de Sonora, el "diario de entretenimiento" de una persona. Escribe en ' +
  'español, segunda persona, cálido y celebratorio (es un recap tipo Wrapped). Convierte ' +
  'los datos en una historia emotiva de 2-4 frases. No menciones números técnicos crudos; ' +
  'usa los nombres reales de canciones, artistas y juegos. Sin markdown ni comillas, solo el párrafo.';

export interface NamedItem {
  name: string;
  subtitle?: string;
  imageUrl: string | null;
  plays?: number;
}

export interface PersonalityMix {
  key: string;
  label: string;
  emoji: string;
  pct: number;
}

export interface TimelineEvent {
  date: string | null; // ISO; null = "this period" with no single date
  emoji: string;
  title: string;
  sub: string;
}

export interface Award {
  key: string;
  emoji: string;
  label: string; // award name, e.g. "Rey del periodo"
  name: string; // the winner
  sub: string; // detail, e.g. "245 reproducciones"
  imageUrl: string | null;
}

export interface Wrapped {
  period: string;
  label: string;
  hasData: boolean;
  /** Dynamic, data-driven headline for the period (e.g. "Noches de Reggaetón Real"). */
  eraName: string;
  personalityName: string;
  /** The chosen archetype (1 of 12) with its emoji + one-line tagline. */
  personality: { key: string; label: string; emoji: string; tagline: string };
  /** ADN as a blend, not a single 100% bar (e.g. 45% Looper, 25% Nocturno…). */
  mix: PersonalityMix[];
  /** Dated story of the period (first listen, obsession born, record day…). */
  timeline: TimelineEvent[];
  /** Dynamic awards for the period, split music vs gaming. */
  awards: { music: Award[]; gaming: Award[] };
  music: {
    minutes: number;
    plays: number;
    uniqueArtists: number;
    songOfPeriod: NamedItem | null;
    topArtist: NamedItem | null;
    newObsession: NamedItem | null;
    personality: string;
  };
  gaming: {
    linked: boolean;
    hours: number;
    games: number;
    backlog: number;
    topGame: { name: string; headerUrl: string; hours: number } | null;
  } | null;
  /** AI-written recap of the period (null when the LLM is unavailable). */
  narrative: string | null;
}

const PERIODS: Record<string, { days: number | null; label: string; word: string }> = {
  week: { days: 7, label: 'Tu semana en Sonora', word: 'Semana' },
  month: { days: 30, label: 'Tu mes en Sonora', word: 'Mes' },
  season: { days: 90, label: 'Tu temporada en Sonora', word: 'Temporada' },
  year: { days: 365, label: 'Tu año en Sonora', word: 'Año' },
  all: { days: null, label: 'Tu vida en Sonora', word: 'Era' },
};

/** The 12 archetypes. Each scores 0-1 from the period's signals; the top wins. */
const ARCHETYPES: Record<string, { label: string; emoji: string; tagline: string }> = {
  loop: { label: 'Looper', emoji: '🔁', tagline: 'Cuando algo te atrapa, no lo sueltas.' },
  explorer: { label: 'Explorador', emoji: '🧭', tagline: 'Siempre buscando el próximo descubrimiento.' },
  collector: { label: 'Coleccionista', emoji: '🗃️', tagline: 'Tu biblioteca crece sin parar.' },
  nostalgic: { label: 'Nostálgico', emoji: '🕰️', tagline: 'Lo viejo nunca pasa de moda para ti.' },
  marathoner: { label: 'Maratonista', emoji: '🎧', tagline: 'Escuchas en sesiones que no terminan.' },
  nocturnal: { label: 'Nocturno', emoji: '🌙', tagline: 'Tu mejor música suena de madrugada.' },
  loyal: { label: 'Fiel', emoji: '👑', tagline: 'Tienes a los tuyos y les eres leal.' },
  gemhunter: { label: 'Cazador de joyas', emoji: '💎', tagline: 'Encuentras lo bueno antes que nadie.' },
  musicgamer: { label: 'Gamer musical', emoji: '🎮', tagline: 'Música y partidas, una sola banda sonora.' },
  chaotic: { label: 'Caótico', emoji: '🎲', tagline: 'Saltas de todo a todo, sin reglas.' },
  specialist: { label: 'Especialista', emoji: '🎯', tagline: 'Un género te define por completo.' },
  completist: { label: 'Completista', emoji: '✅', tagline: 'No paras hasta terminarlo todo.' },
};

interface PeriodSignals {
  plays: number;
  tracks: number;
  artists: number;
  activeDays: number;
  nightRatio: number; // 0-1 share of plays at night
  repeat: number; // plays / distinct tracks
  exploration: number; // 0-1 new artists / artists
  loyalty: number; // 0-1 top-artist plays / plays
  volume: number; // plays per active day
  gamingShare: number; // 0-1 gaming minutes / total minutes
  topGenre: string | null;
  genreShare: number; // 0-1
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Score each of the 12 archetypes 0-1 from the period's signals. */
function archetypeScores(s: PeriodSignals): Record<string, number> {
  const breadth = s.activeDays > 0 ? s.artists / s.activeDays : 0;
  // Divisors are tuned so a heavy listener doesn't saturate every signal at 1.0
  // (which would flatten the blend); the genuinely dominant traits separate out.
  return {
    loop: clamp01((s.repeat - 1) / 4),
    explorer: clamp01(s.exploration * 1.7),
    collector: clamp01(breadth / 22),
    nostalgic: clamp01((1 - s.exploration - s.gamingShare) * 0.35),
    marathoner: clamp01(s.volume / 150),
    nocturnal: clamp01(s.nightRatio * 1.7),
    loyal: clamp01(s.loyalty * 3),
    gemhunter: clamp01(s.exploration * 1.2 * (1 - clamp01(s.volume / 150))),
    musicgamer: clamp01(s.gamingShare * 1.7),
    chaotic: clamp01((1 - s.loyalty) * (1 - s.genreShare) * clamp01(s.artists / 40)),
    specialist: clamp01(s.genreShare * 1.4),
    completist: clamp01(s.gamingShare * 1.1 * (s.repeat > 1.8 ? 1 : 0.5)),
  };
}

/** Turn the raw scores into a normalized blend of the top 4 (sums to 100%). */
function blendFromScores(scores: Record<string, number>): PersonalityMix[] {
  const entries = Object.entries(scores)
    .filter(([, v]) => v > 0.04)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    // Amplify differences so the dominant trait actually leads instead of a flat
    // 25/25/25/25 tie (power users saturate several raw signals at ~1.0).
    .map(([k, v]) => [k, Math.pow(v, 2.4)] as [string, number]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0) || 1;
  const mix = entries.map(([key, v]) => ({
    key,
    label: ARCHETYPES[key].label,
    emoji: ARCHETYPES[key].emoji,
    pct: Math.round((v / total) * 100),
  }));
  if (mix.length === 0) {
    return [{ key: 'loop', label: ARCHETYPES.loop.label, emoji: ARCHETYPES.loop.emoji, pct: 100 }];
  }
  mix[0].pct += 100 - mix.reduce((sum, m) => sum + m.pct, 0); // fix rounding drift
  return mix;
}

/** Choose a dynamic, period-specific headline from the dominant signals. */
function deriveEraName(
  word: string,
  scores: Record<string, number>,
  sig: PeriodSignals,
  ctx: { genre: string | null; artist: string | null },
): string {
  const genre = ctx.genre ? cap(ctx.genre) : null;
  const [k1, v1] = Object.entries(scores).sort((a, b) => b[1] - a[1])[0] ?? ['loop', 0];
  const seed = (sig.plays + sig.tracks * 3) | 0;
  const pick = (arr: string[]) => arr[seed % arr.length];

  if (sig.nightRatio >= 0.45 && genre) return pick([`Noches de ${genre} Real`, `${genre} a Medianoche`, `Madrugadas de ${genre}`]);
  if (k1 === 'musicgamer' || (sig.gamingShare >= 0.4 && sig.plays > 50)) return pick(['Entre Beats y Partidas', `${word} entre Mundos`, 'Banda Sonora de tus Partidas']);
  if (k1 === 'loop' && v1 > 0.5) return pick([`El ${word} del Replay Infinito`, 'Loop Eterno', 'La Canción que No Soltaste']);
  if (k1 === 'explorer' && v1 > 0.5) return pick(['Explorador sin Mapa', `${word} de Mil Descubrimientos`, 'Sin Rumbo, con Ritmo']);
  if (k1 === 'specialist' && genre) return pick([`${word} 100% ${genre}`, `Devoto del ${genre}`, `Solo ${genre}`]);
  if (k1 === 'loyal' && ctx.artist) return pick([`El Reinado de ${ctx.artist}`, `${ctx.artist} y Nadie Más`]);
  if (k1 === 'marathoner') return pick(['Maratón sin Fin', `El ${word} que No Paraste`]);
  if (k1 === 'nocturnal') return pick(['Criatura de la Noche', 'Todo Suena Mejor de Madrugada']);
  if (genre) return pick([`${word} de ${genre}`, `Puro ${genre}`]);
  return `Tu ${word} en Sonora`;
}

/**
 * The shareable "Wrapped" — combines music, gaming and personality into one
 * recap for a period. Reuses the DNA engine for the personality archetype and
 * the Steam service for gaming highlights.
 */
@Injectable()
export class WrappedService {
  /** Cache the AI narrative per (user, period) so repeated page loads don't re-call GPT. */
  private narrativeCache = new Map<string, { key: string; text: string | null; at: number }>();
  private static readonly NARRATIVE_TTL_MS = 6 * 60 * 60 * 1000; // 6h

  /** Full-Wrapped cache: instant repeat loads. Short TTL keeps it fresh enough. */
  private static readonly CACHE_TTL_S = 30 * 60; // 30 min

  constructor(
    private readonly prisma: PrismaService,
    private readonly dna: DnaService,
    private readonly steam: SteamService,
    private readonly ml: MlClientService,
    private readonly cache: RedisCacheService,
  ) {}

  async generate(userId: string, period: string, opts?: { narrative?: boolean }): Promise<Wrapped> {
    // Serve the whole Wrapped from Redis when warm — the page does a lot of SQL
    // + an LLM call, so a cached payload turns a slow load into an instant one.
    const cacheKey = `wrapped:v5:${userId}:${period}:${opts?.narrative === false ? 'nonarr' : 'full'}`;
    const hit = await this.cache.getJson<Wrapped>(cacheKey);
    if (hit) return hit;

    const wrapped = await this.compute(userId, period, opts);
    if (wrapped.hasData) await this.cache.setJson(cacheKey, wrapped, WrappedService.CACHE_TTL_S);
    return wrapped;
  }

  private async compute(userId: string, period: string, opts?: { narrative?: boolean }): Promise<Wrapped> {
    const cfg = PERIODS[period] ?? PERIODS.month;
    const [music, dna, gaming] = await Promise.all([
      this.music(userId, cfg.days),
      this.dna.compute(userId),
      this.gaming(userId),
    ]);

    // Signal vector for THIS period → drives the era name, the 1-of-12 archetype
    // and the ADN blend. Period-aware: a week and a year score very differently.
    const sig = await this.analyzePeriod(userId, cfg.days, music.minutes, gaming?.hours ?? 0);
    const scores = archetypeScores(sig);
    const mix = blendFromScores(scores);
    const personalityKey = mix[0]?.key ?? 'loop';
    const arch = ARCHETYPES[personalityKey];
    const eraName = deriveEraName(cfg.word, scores, sig, {
      genre: sig.topGenre,
      artist: music.topArtist?.name ?? null,
    });

    const extras = music.plays > 0
      ? await this.periodExtras(userId, cfg.days, music, gaming)
      : { timeline: [], awards: { music: [], gaming: [] } };

    const wrapped: Wrapped = {
      period,
      label: cfg.label,
      eraName,
      personalityName: `${arch.label} ${arch.emoji}`,
      personality: { key: personalityKey, ...arch },
      mix,
      timeline: extras.timeline,
      awards: extras.awards,
      hasData: music.plays > 0,
      music: { ...music, personality: dna.personality },
      gaming,
      narrative: null,
    };

    if (wrapped.hasData && opts?.narrative !== false) {
      wrapped.narrative = await this.cachedNarrative(userId, wrapped, sig);
    }
    return wrapped;
  }

  /** Compute the period's behavioural signals in a few cheap aggregate queries. */
  private async analyzePeriod(
    userId: string,
    days: number | null,
    musicMinutes: number,
    gamingHours: number,
  ): Promise<PeriodSignals> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;

    const [agg] = await this.prisma.$queryRaw<
      Array<{ plays: number; tracks: number; artists: number; night: number; days: number; topplays: number }>
    >`
      WITH win AS (
        SELECT * FROM listening_history
        WHERE "userId" = ${userId}
          AND (${days}::int IS NULL OR "playedAt" >= now() - (${days} || ' days')::interval)
      )
      SELECT COUNT(*)::int AS plays,
             COUNT(DISTINCT "trackId")::int AS tracks,
             COUNT(DISTINCT "artistId")::int AS artists,
             COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) >= 22
                                 OR EXTRACT(HOUR FROM "playedAt" + (${tz} || ' minutes')::interval) < 6)::int AS night,
             COUNT(DISTINCT date_trunc('day', "playedAt"))::int AS days,
             COALESCE((SELECT COUNT(*)::int FROM win WHERE "artistId" IS NOT NULL
                       GROUP BY "artistId" ORDER BY COUNT(*) DESC LIMIT 1), 0) AS topplays
      FROM win
    `;

    // New artists discovered in-window (first-ever play lands inside it).
    const [na] = await this.prisma.$queryRaw<Array<{ c: number }>>`
      SELECT COUNT(*)::int AS c FROM (
        SELECT "artistId" FROM listening_history
        WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
        GROUP BY "artistId"
        HAVING MIN("playedAt") >= now() - (${days ?? 36500} || ' days')::interval
      ) x
    `;

    const [genre] = await this.prisma.$queryRaw<Array<{ genre: string; c: number }>>`
      SELECT g.name AS genre, COUNT(*)::int AS c
      FROM listening_history lh
      JOIN artist_genres ag ON ag."artistId" = lh."artistId"
      JOIN genres g ON g.id = ag."genreId"
      WHERE lh."userId" = ${userId}
        AND (${days}::int IS NULL OR lh."playedAt" >= now() - (${days} || ' days')::interval)
      GROUP BY g.name ORDER BY 2 DESC LIMIT 1
    `;

    // Recent gaming (last 2 weeks) — NOT lifetime hours, which would dwarf any
    // period's music and make everyone read as "Gamer musical".
    const [gm] = await this.prisma.$queryRaw<Array<{ mins: number }>>`
      SELECT COALESCE(SUM("playtime2Weeks"), 0)::int AS mins FROM user_games WHERE "userId" = ${userId}
    `;
    void gamingHours; // kept for signature symmetry; share uses recent gaming
    const gamingMin = gm?.mins ?? 0;

    const plays = agg?.plays ?? 0;
    const genreShare = genre && plays > 0 ? Math.min(1, genre.c / plays) : 0;
    return {
      plays,
      tracks: agg?.tracks ?? 0,
      artists: agg?.artists ?? 0,
      activeDays: agg?.days ?? 0,
      nightRatio: plays > 0 ? (agg?.night ?? 0) / plays : 0,
      repeat: agg && agg.tracks > 0 ? plays / agg.tracks : 0,
      exploration: agg && agg.artists > 0 ? Math.min(1, (na?.c ?? 0) / agg.artists) : 0,
      loyalty: plays > 0 ? (agg?.topplays ?? 0) / plays : 0,
      volume: agg && agg.days > 0 ? plays / agg.days : 0,
      gamingShare: musicMinutes + gamingMin > 0 ? gamingMin / (musicMinutes + gamingMin) : 0,
      topGenre: genre?.genre ?? null,
      genreShare,
    };
  }

  /** AI narrative, cached per (user, period) and invalidated when the facts change. */
  private async cachedNarrative(userId: string, w: Wrapped, sig: PeriodSignals): Promise<string | null> {
    const cacheKey = `${userId}:${w.period}`;
    const prompt = this.buildPrompt(w, sig);
    const cached = this.narrativeCache.get(cacheKey);
    if (cached && cached.key === prompt && Date.now() - cached.at < WrappedService.NARRATIVE_TTL_MS) {
      return cached.text;
    }
    const ai = await this.ml.narrate(prompt, WRAPPED_SYSTEM);
    const text = ai?.text ?? null;
    this.narrativeCache.set(cacheKey, { key: prompt, text, at: Date.now() });
    return text;
  }

  /**
   * Grounded prompt for the narrator. Feeds ONLY real facts + the period's
   * behavioural signals (so the recap explains what HAPPENED, not vague vibes),
   * with explicit anti-genericity guardrails.
   */
  private buildPrompt(w: Wrapped, sig: PeriodSignals): string {
    const pct = (n: number) => Math.round(n * 100);
    const lines = [
      `Periodo: ${w.label} (${w.eraName}).`,
      `Arquetipo dominante: ${w.personality.label}. Mezcla: ${w.mix.map((m) => `${m.label} ${m.pct}%`).join(', ')}.`,
      `Música: ${w.music.minutes} minutos, ${w.music.plays} reproducciones, ${w.music.uniqueArtists} artistas, ${sig.tracks} canciones distintas.`,
      `Comportamiento: ${pct(sig.nightRatio)}% de noche, repites cada canción ${sig.repeat.toFixed(1)} veces, ${pct(sig.exploration)}% artistas nuevos, lealtad al #1 ${pct(sig.loyalty)}%.`,
    ];
    if (sig.topGenre) lines.push(`Género dominante: ${sig.topGenre} (${pct(sig.genreShare)}%).`);
    if (w.music.songOfPeriod) lines.push(`Canción más repetida: «${w.music.songOfPeriod.name}» (${w.music.songOfPeriod.plays} veces).`);
    if (w.music.topArtist) lines.push(`Artista que dominó: ${w.music.topArtist.name} (${w.music.topArtist.plays} reproducciones).`);
    if (w.music.newObsession) lines.push(`Obsesión emergente: «${w.music.newObsession.name}».`);
    if (w.gaming?.linked) {
      lines.push(`Gaming: ${w.gaming.hours} horas, ${w.gaming.games} juegos, ${w.gaming.backlog} pendientes.`);
      if (w.gaming.topGame) lines.push(`Juego del periodo: ${w.gaming.topGame.name} (${w.gaming.topGame.hours}h).`);
    }
    return (
      lines.join('\n') +
      '\n\nEscribe el recap (2-4 frases). Usa los nombres y números reales de arriba; explica QUÉ pasó este periodo y qué cambió. ' +
      'Prohibido empezar con "Tu pasión por la música" o frases de relleno genéricas. Nada inventado.'
    );
  }

  /** Dated timeline + dynamic awards for the period. */
  private async periodExtras(
    userId: string,
    days: number | null,
    music: { topArtist: NamedItem | null; songOfPeriod: NamedItem | null; newObsession: NamedItem | null },
    gaming: Wrapped['gaming'],
  ): Promise<{ timeline: TimelineEvent[]; awards: { music: Award[]; gaming: Award[] } }> {
    const tz =
      (await this.prisma.user.findUnique({ where: { id: userId }, select: { tzOffset: true } }))?.tzOffset ?? 0;

    const [first, record, comeback, nightArtist, newArtist, marathon, debt] = await Promise.all([
      this.prisma.$queryRaw<Array<{ at: Date; artist: string | null; track: string }>>`
        SELECT lh."playedAt" AS at, a.name AS artist, t.name AS track
        FROM listening_history lh JOIN tracks t ON t.id = lh."trackId" LEFT JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND (${days}::int IS NULL OR lh."playedAt" >= now() - (${days} || ' days')::interval)
        ORDER BY lh."playedAt" ASC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ d: string; plays: number; minutes: number }>>`
        SELECT to_char(date_trunc('day', "playedAt"), 'YYYY-MM-DD') AS d, COUNT(*)::int AS plays,
               (COALESCE(SUM("msPlayed"),0)/60000.0)::int AS minutes
        FROM listening_history WHERE "userId" = ${userId}
          AND (${days}::int IS NULL OR "playedAt" >= now() - (${days} || ' days')::interval)
        GROUP BY 1 ORDER BY plays DESC LIMIT 1
      `,
      days == null
        ? Promise.resolve([])
        : this.prisma.$queryRaw<Array<{ name: string; c: number; back_at: Date; gap: number }>>`
            WITH win AS (
              SELECT * FROM listening_history
              WHERE "userId" = ${userId} AND "artistId" IS NOT NULL AND "playedAt" >= now() - (${days} || ' days')::interval
            ),
            prior AS (
              SELECT "artistId", MAX("playedAt") AS prev FROM listening_history
              WHERE "userId" = ${userId} AND "artistId" IS NOT NULL AND "playedAt" < now() - (${days} || ' days')::interval
              GROUP BY "artistId"
            )
            SELECT a.name, COUNT(*)::int AS c, MIN(win."playedAt") AS back_at,
                   EXTRACT(DAY FROM (MIN(win."playedAt") - p.prev))::int AS gap
            FROM win JOIN prior p ON p."artistId" = win."artistId" JOIN artists a ON a.id = win."artistId"
            GROUP BY a.name, p.prev
            HAVING EXTRACT(DAY FROM (MIN(win."playedAt") - p.prev)) >= 45
            ORDER BY gap DESC, c DESC LIMIT 1
          `,
      this.prisma.$queryRaw<Array<{ name: string; image: string | null; c: number }>>`
        SELECT a.name, a."imageUrl" AS image, COUNT(*)::int AS c
        FROM listening_history lh JOIN artists a ON a.id = lh."artistId"
        WHERE lh."userId" = ${userId} AND lh."artistId" IS NOT NULL
          AND (${days}::int IS NULL OR lh."playedAt" >= now() - (${days} || ' days')::interval)
          AND (EXTRACT(HOUR FROM lh."playedAt" + (${tz} || ' minutes')::interval) >= 22
            OR EXTRACT(HOUR FROM lh."playedAt" + (${tz} || ' minutes')::interval) < 6)
        GROUP BY a.name, a."imageUrl" ORDER BY c DESC LIMIT 1
      `,
      days == null
        ? Promise.resolve([])
        : this.prisma.$queryRaw<Array<{ name: string; image: string | null; c: number }>>`
            WITH firsts AS (
              SELECT "artistId", MIN("playedAt") AS fp FROM listening_history
              WHERE "userId" = ${userId} AND "artistId" IS NOT NULL GROUP BY "artistId"
            )
            SELECT a.name, a."imageUrl" AS image, COUNT(*)::int AS c
            FROM listening_history lh JOIN firsts f ON f."artistId" = lh."artistId" JOIN artists a ON a.id = lh."artistId"
            WHERE lh."userId" = ${userId} AND lh."playedAt" >= now() - (${days} || ' days')::interval
              AND f.fp >= now() - (${days} || ' days')::interval
            GROUP BY a.name, a."imageUrl" ORDER BY c DESC LIMIT 1
          `,
      this.prisma.$queryRaw<Array<{ name: string; appid: number; mins: number }>>`
        SELECT g.name, g."appId" AS appid, ug."playtime2Weeks" AS mins
        FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
        WHERE ug."userId" = ${userId} AND ug."playtime2Weeks" > 0
        ORDER BY ug."playtime2Weeks" DESC LIMIT 1
      `,
      this.prisma.$queryRaw<Array<{ name: string; appid: number }>>`
        SELECT g.name, g."appId" AS appid FROM user_games ug JOIN steam_games g ON g.id = ug."gameId"
        WHERE ug."userId" = ${userId} AND ug."playtimeForever" = 0
        ORDER BY g.name ASC LIMIT 1
      `,
    ]);

    const header = (appId: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`;
    const iso = (d: Date) => new Date(d).toISOString();

    // ── timeline ──
    const timeline: TimelineEvent[] = [];
    if (first[0]) timeline.push({ date: iso(first[0].at), emoji: '🎵', title: `Empezaste con ${first[0].artist ?? first[0].track}`, sub: first[0].track });
    if (music.newObsession) timeline.push({ date: null, emoji: '🔥', title: 'Nació una obsesión', sub: music.newObsession.name });
    if (comeback[0]) timeline.push({ date: iso(comeback[0].back_at), emoji: '🔁', title: `Regresó ${comeback[0].name}`, sub: `tras ${comeback[0].gap} días sin escucharlo` });
    if (marathon[0]) timeline.push({ date: null, emoji: '🎮', title: 'Maratón gaming', sub: `+${Math.round(marathon[0].mins / 60)}h en ${marathon[0].name}` });
    if (record[0]) timeline.push({ date: `${record[0].d}T00:00:00.000Z`, emoji: '🏆', title: 'Tu día más intenso', sub: `${record[0].plays} canciones · ${record[0].minutes} min` });
    timeline.sort((a, b) => (a.date ?? '9') < (b.date ?? '9') ? -1 : 1);

    // ── awards ──
    const musicAwards: Award[] = [];
    if (music.topArtist) musicAwards.push({ key: 'king', emoji: '👑', label: 'Rey del periodo', name: music.topArtist.name, sub: `${music.topArtist.plays} reproducciones`, imageUrl: music.topArtist.imageUrl });
    if (music.songOfPeriod) musicAwards.push({ key: 'obsession', emoji: '🔥', label: 'Obsesión', name: music.songOfPeriod.name, sub: `${music.songOfPeriod.plays} veces`, imageUrl: music.songOfPeriod.imageUrl });
    if (newArtist[0]) musicAwards.push({ key: 'discovery', emoji: '💎', label: 'Descubrimiento', name: newArtist[0].name, sub: `${newArtist[0].c} reproducciones, nuevo`, imageUrl: newArtist[0].image });
    if (comeback[0]) musicAwards.push({ key: 'comeback', emoji: '🔁', label: 'Regreso inesperado', name: comeback[0].name, sub: `volvió tras ${comeback[0].gap} días`, imageUrl: null });
    if (nightArtist[0]) musicAwards.push({ key: 'nocturnal', emoji: '🌙', label: 'Compañero nocturno', name: nightArtist[0].name, sub: `${nightArtist[0].c} veces de madrugada`, imageUrl: nightArtist[0].image });

    const gamingAwards: Award[] = [];
    if (gaming?.topGame) gamingAwards.push({ key: 'king', emoji: '🎮', label: 'Juego rey', name: gaming.topGame.name, sub: `${gaming.topGame.hours} h en total`, imageUrl: gaming.topGame.headerUrl });
    if (marathon[0]) gamingAwards.push({ key: 'marathon', emoji: '🔥', label: 'Maratón', name: marathon[0].name, sub: `+${Math.round(marathon[0].mins / 60)}h estas 2 semanas`, imageUrl: header(marathon[0].appid) });
    if (debt[0]) gamingAwards.push({ key: 'debt', emoji: '⏳', label: 'Deuda pendiente', name: debt[0].name, sub: 'en tu biblioteca, sin abrir', imageUrl: header(debt[0].appid) });

    return { timeline, awards: { music: musicAwards, gaming: gamingAwards } };
  }

  // ── music ──

  private async music(userId: string, days: number | null) {
    const [agg] = await this.prisma.$queryRaw<
      Array<{ plays: number; uniqueArtists: number; minutes: number }>
    >`
      SELECT COUNT(*)::int AS plays,
             COUNT(DISTINCT "artistId")::int AS "uniqueArtists",
             (COALESCE(SUM("msPlayed"),0)/60000.0)::float AS minutes
      FROM listening_history
      WHERE "userId" = ${userId}
        AND (${days}::int IS NULL OR "playedAt" >= now() - (${days} || ' days')::interval)
    `;

    const [songOfPeriod, topArtist, newObsession] = await Promise.all([
      this.topTrack(userId, days),
      this.topArtist(userId, days),
      this.risingTrack(userId),
    ]);

    return {
      minutes: Math.round(agg?.minutes ?? 0),
      plays: agg?.plays ?? 0,
      uniqueArtists: agg?.uniqueArtists ?? 0,
      songOfPeriod,
      topArtist,
      newObsession,
    };
  }

  private async topTrack(userId: string, days: number | null): Promise<NamedItem | null> {
    const [row] = await this.prisma.$queryRaw<Array<{ id: string; plays: number }>>`
      SELECT "trackId" AS id, COUNT(*)::int AS plays
      FROM listening_history
      WHERE "userId" = ${userId}
        AND (${days}::int IS NULL OR "playedAt" >= now() - (${days} || ' days')::interval)
      GROUP BY "trackId" ORDER BY plays DESC LIMIT 1
    `;
    if (!row) return null;
    return this.trackItem(row.id, row.plays);
  }

  private async risingTrack(userId: string): Promise<NamedItem | null> {
    const [row] = await this.prisma.$queryRaw<Array<{ id: string; recent: number }>>`
      SELECT "trackId" AS id,
             COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '7 days')::int AS recent,
             COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '14 days' AND "playedAt" < now() - interval '7 days')::int AS prior
      FROM listening_history
      WHERE "userId" = ${userId} AND "playedAt" >= now() - interval '14 days'
      GROUP BY "trackId"
      HAVING COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '7 days') >= 2
      ORDER BY (COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '7 days')
              - COUNT(*) FILTER (WHERE "playedAt" >= now() - interval '14 days' AND "playedAt" < now() - interval '7 days')) DESC
      LIMIT 1
    `;
    if (!row) return null;
    return this.trackItem(row.id, row.recent);
  }

  private async trackItem(trackId: string, plays: number): Promise<NamedItem | null> {
    const t = await this.prisma.track.findUnique({
      where: { id: trackId },
      include: {
        album: { select: { imageUrl: true } },
        artists: { include: { artist: { select: { name: true } } }, orderBy: { position: 'asc' }, take: 1 },
      },
    });
    if (!t) return null;
    return {
      name: t.name,
      subtitle: t.artists[0]?.artist.name,
      imageUrl: t.album?.imageUrl ?? null,
      plays,
    };
  }

  private async topArtist(userId: string, days: number | null): Promise<NamedItem | null> {
    const [row] = await this.prisma.$queryRaw<Array<{ id: string; plays: number }>>`
      SELECT "artistId" AS id, COUNT(*)::int AS plays
      FROM listening_history
      WHERE "userId" = ${userId} AND "artistId" IS NOT NULL
        AND (${days}::int IS NULL OR "playedAt" >= now() - (${days} || ' days')::interval)
      GROUP BY "artistId" ORDER BY plays DESC LIMIT 1
    `;
    if (!row) return null;
    const a = await this.prisma.artist.findUnique({
      where: { id: row.id },
      select: { name: true, imageUrl: true },
    });
    return a ? { name: a.name, imageUrl: a.imageUrl, plays: row.plays } : null;
  }

  // ── gaming ──

  private async gaming(userId: string): Promise<Wrapped['gaming']> {
    const account = await this.prisma.steamAccount.findUnique({ where: { userId } });
    if (!account) return { linked: false, hours: 0, games: 0, backlog: 0, topGame: null };

    const [stats, backlog] = await Promise.all([
      this.steam.stats(userId),
      this.steam.backlog(userId),
    ]);
    const top = stats.topGames[0];
    return {
      linked: true,
      hours: stats.totalHours,
      games: stats.gameCount,
      backlog: backlog.neverPlayedCount,
      topGame: top ? { name: top.name, headerUrl: top.headerUrl, hours: top.hoursForever } : null,
    };
  }
}
