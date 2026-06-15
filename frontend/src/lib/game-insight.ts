import type { SteamGame } from '@/lib/api';
import { matchesFranchise, titleTokens, lovedSagaTokens } from '@/lib/steam-derive';

/**
 * Game Insight Engine — generates a characterful, one-line "insight" for a game
 * from MANY signals (name, hours, genres, rating, popularity, franchise, and the
 * user's own profile), not just the hours bucket. The whole point: two different
 * games should almost never read the same — so messages are genre-categorised,
 * template-driven (with {game}/{hours}/{genre}), and de-duplicated per screen.
 *
 * Honest about data: it only uses fields that actually exist on a SteamGame
 * (genres/metacritic/recommendations/isFree + franchise inferred from the name).
 * It never claims "a saga you love" — at most "relacionado con juegos donde
 * tienes muchas horas", and only when there's real token evidence.
 */

export interface InsightProfile {
  favoriteGenres: Set<string>;
  averagePlaytime: number; // hours, across played games
  lovedTokens: Set<string>; // title tokens from games with ≥10h
}

export function buildInsightProfile(
  library: SteamGame[],
  topGenres?: { genre: string; hours: number }[],
): InsightProfile {
  const played = library.filter((g) => g.hoursForever > 0);
  const avg = played.length ? played.reduce((s, g) => s + g.hoursForever, 0) / played.length : 0;
  return {
    favoriteGenres: new Set((topGenres ?? []).slice(0, 5).map((x) => x.genre)),
    averagePlaytime: Math.round(avg * 10) / 10,
    lovedTokens: lovedSagaTokens(library),
  };
}

// ── categorisation ───────────────────────────────────────────────────────────
type Cat = 'rpg' | 'survival' | 'strategy' | 'competitive' | 'indie' | 'casual' | 'generic';
type Bucket = 'never' | 'low' | 'mid' | 'high' | 'legend';

const SURVIVAL_HINTS = [
  'survival', 'zomboid', 'rust', 'valheim', 'raft', 'the forest', 'sons of the forest',
  'ark', 'subnautica', "don't starve", 'green hell', 'grounded', 'the long dark', 'dayz',
  '7 days to die', 'palworld', 'icarus', 'stranded',
];
const COMPETITIVE_GENRES = new Set(['Massively Multiplayer', 'Sports', 'Racing']);

function categoryOf(g: SteamGame): Cat {
  const genres = g.genres ?? [];
  const name = g.name.toLowerCase();
  if (genres.includes('Survival') || SURVIVAL_HINTS.some((s) => name.includes(s))) return 'survival';
  if (genres.includes('RPG')) return 'rpg';
  if (genres.includes('Strategy')) return 'strategy';
  if (genres.some((x) => COMPETITIVE_GENRES.has(x))) return 'competitive';
  if (genres.includes('Indie')) return 'indie';
  if (genres.includes('Casual')) return 'casual';
  return 'generic';
}

function bucketOf(h: number): Bucket {
  if (h <= 0) return 'never';
  if (h < 5) return 'low';
  if (h < 30) return 'mid';
  if (h < 80) return 'high';
  return 'legend';
}

const GENRE_WORD: Record<Cat, string> = {
  rpg: 'RPG',
  survival: 'survival',
  strategy: 'estrategia',
  competitive: 'multijugador',
  indie: 'indie',
  casual: 'casual',
  generic: 'aventura',
};

// ── message pools (≥20 per category: 5 buckets × 4) ──────────────────────────
const MESSAGES: Record<Cat, Record<Bucket, string[]>> = {
  rpg: {
    never: [
      'Un mundo de rol entero por descubrir. {game} no se ha abierto ni una vez.',
      'Cero horas en {game}. Toda una aventura de {genre} esperando a su héroe.',
      '{game} guarda decenas de horas de rol que aún no empiezas.',
      'Un RPG sin estrenar. La historia de {game} sigue en pausa total.',
    ],
    low: [
      'Probaste {game} apenas {hours}h. Los RPG piden más para mostrar lo bueno.',
      '{hours}h en {game}: apenas el prólogo de un rol que recién arranca.',
      'Un vistazo de {hours}h. {game} todavía no te mostró sus cartas.',
      'Los RPG maduran lento; {game} con {hours}h aún no despega.',
    ],
    mid: [
      '{hours}h en {game}. Ya entraste en la historia, el rol te atrapó.',
      'Con {hours}h, {game} dejó de ser prueba y se volvió aventura.',
      'Vas {hours}h dentro de {game}. La trama ya te tiene.',
      '{game} te lleva {hours}h de progreso. El mundo avanza contigo.',
    ],
    high: [
      '{hours}h en {game}. Esto ya es un RPG vivido, no jugado.',
      '{game} se ganó {hours}h tuyas. Un rol que dejó huella.',
      'Con {hours}h, {game} es de esas campañas que se recuerdan.',
      '{hours}h de rol en {game}. Dominas su mundo de memoria.',
    ],
    legend: [
      '{hours}h en {game}. Un RPG que se volvió tu segundo hogar.',
      '{game} con {hours}h: completaste y conquistaste su mundo.',
      'Cientos de horas de rol en {game}. Leyenda absoluta.',
      '{hours}h. {game} ya no es un juego, es otra vida.',
    ],
  },
  survival: {
    never: [
      'Uno de los survival más profundos de Steam sigue esperando sobreviviente.',
      '{game} no perdona a novatos, y aún no lo intentas. 0h.',
      'Cero horas en {game}. El survival empieza cuando te animas.',
      '{game} guarda noches de tensión que todavía no viviste.',
    ],
    low: [
      '{hours}h en {game}: apenas sobreviviste a la primera noche.',
      'Probaste {game} {hours}h. El survival recién se pone serio después.',
      '{hours}h y ya moriste un par de veces. {game} apenas calienta.',
      'Un asomo de {hours}h. {game} aún no te mostró su crueldad real.',
    ],
    mid: [
      '{hours}h aguantando en {game}. El survival ya te enganchó.',
      'Con {hours}h, {game} dejó de matarte tan fácil.',
      '{game} te lleva {hours}h de supervivencia. Aprendiste a vivir ahí.',
      '{hours}h en {game}: ya dominas lo básico de no morir.',
    ],
    high: [
      '{hours}h sobreviviendo en {game}. Esto es resistencia pura.',
      '{game} con {hours}h: pocos aguantan tanto en un survival.',
      'Con {hours}h, {game} es tu batalla contra los elementos.',
      '{hours}h. En {game} ya no sobrevives, dominas.',
    ],
    legend: [
      '{hours}h en {game}. Un survival que se volvió estilo de vida.',
      '{game} con {hours}h: maestro absoluto de la supervivencia.',
      'Cientos de horas resistiendo en {game}. Leyenda viva.',
      '{hours}h. {game} ya es tu segundo planeta.',
    ],
  },
  strategy: {
    never: [
      '{game} espera a su estratega. 0h sobre el tablero.',
      'Toda una guerra de {genre} sin librar en {game}.',
      'Cero horas en {game}. La gestión y el mando siguen sin empezar.',
      '{game} guarda partidas de estrategia que aún no planeaste.',
    ],
    low: [
      '{hours}h en {game}: apenas el tutorial de una gran estrategia.',
      'Probaste {game} {hours}h. La estrategia se complica más adelante.',
      '{hours}h y aún no dominas las reglas de {game}.',
      'Un vistazo de {hours}h. {game} esconde sistemas más profundos.',
    ],
    mid: [
      '{hours}h planeando en {game}. La estrategia ya te absorbió.',
      'Con {hours}h, {game} se volvió un duelo de cabeza.',
      '{game} te lleva {hours}h de decisiones. Piensas como comandante.',
      '{hours}h en {game}: cada partida te enseña algo nuevo.',
    ],
    high: [
      '{hours}h de estrategia en {game}. Mente fría y mano firme.',
      '{game} con {hours}h: dominas sus sistemas como pocos.',
      'Con {hours}h, {game} es ajedrez a tu medida.',
      '{hours}h. En {game} ya no improvisas, ejecutas.',
    ],
    legend: [
      '{hours}h en {game}. Un imperio de estrategia construido por ti.',
      '{game} con {hours}h: gran maestro del tablero.',
      'Cientos de horas de táctica en {game}. Leyenda estratega.',
      '{hours}h. {game} es tu mesa de mando permanente.',
    ],
  },
  competitive: {
    never: [
      '{game} espera tu primera partida competitiva. 0h en el ranking.',
      'Cero horas en {game}. La arena {genre} no te conoce aún.',
      '{game} guarda duelos que todavía no jugaste.',
      'Toda una escena competitiva sin estrenar en {game}.',
    ],
    low: [
      '{hours}h en {game}: apenas calentando para lo competitivo.',
      'Probaste {game} {hours}h. El nivel real empieza más arriba.',
      '{hours}h y aún aprendes los mapas de {game}.',
      'Un asomo de {hours}h. {game} pide muchas más para competir.',
    ],
    mid: [
      '{hours}h en {game}. Ya peleas de igual a igual.',
      'Con {hours}h, {game} dejó de intimidarte.',
      '{game} te lleva {hours}h de partidas. Tu nivel sube.',
      '{hours}h compitiendo en {game}: el rank ya te respeta.',
    ],
    high: [
      '{hours}h en {game}. Reflejos afilados y mapa memorizado.',
      '{game} con {hours}h: ya eres rival de cuidado.',
      'Con {hours}h, dominas la mecánica de {game}.',
      '{hours}h. En {game} no entras a jugar, entras a ganar.',
    ],
    legend: [
      '{hours}h en {game}. Habilidad forjada a sangre y rank.',
      '{game} con {hours}h: maestría competitiva absoluta.',
      'Cientos de horas en la arena de {game}. Leyenda del servidor.',
      '{hours}h. {game} es tu deporte.',
    ],
  },
  indie: {
    never: [
      '{game} es una joya indie que aún no abriste. 0h.',
      'Cero horas en {game}. Un {genre} con alma esperando su turno.',
      '{game} guarda una experiencia indie que todavía no probaste.',
      'Una propuesta de autor sin estrenar. {game} sigue en cero.',
    ],
    low: [
      '{hours}h en {game}: probaste el experimento, faltó más.',
      'Un vistazo de {hours}h a {game}. Los indies a veces piden paciencia.',
      '{hours}h y {game} apenas insinuó su idea.',
      'Probaste {game} {hours}h. Su magia suele crecer después.',
    ],
    mid: [
      '{hours}h en {game}. El indie te ganó con su propia voz.',
      'Con {hours}h, {game} demostró que lo pequeño también atrapa.',
      '{game} te lleva {hours}h. Una joya que sí conectó.',
      '{hours}h dentro de {game}: arte indie que disfrutas.',
    ],
    high: [
      '{hours}h en un indie como {game}. Eso es amor por el medio.',
      '{game} con {hours}h: pocos indies retienen tanto.',
      'Con {hours}h, {game} probó que lo de autor marca.',
      '{hours}h. {game} es de esos indies que no se olvidan.',
    ],
    legend: [
      '{hours}h en {game}. Un indie convertido en obsesión.',
      '{game} con {hours}h: le diste vida a un juego de autor.',
      'Cientos de horas en {game}. La joya indie es tuya.',
      '{hours}h. {game}, pequeño en tamaño, gigante en tu cuenta.',
    ],
  },
  casual: {
    never: [
      '{game} espera para un rato relajado. 0h por ahora.',
      'Cero horas en {game}. Un descanso pendiente.',
      '{game} guarda sesiones tranquilas que aún no tomaste.',
      'Un juego para desconectar sin estrenar: {game}.',
    ],
    low: [
      '{hours}h en {game}: un ratito y a otra cosa.',
      'Probaste {game} {hours}h. Suficiente para relajar un poco.',
      '{hours}h de descanso en {game}.',
      'Un asomo de {hours}h. {game} es de picar y soltar.',
    ],
    mid: [
      '{hours}h en {game}. Tu refugio casual favorito últimamente.',
      'Con {hours}h, {game} se volvió tu botón de relax.',
      '{game} te lleva {hours}h de ratos tranquilos.',
      '{hours}h en {game}: el descanso que repites.',
    ],
    high: [
      '{hours}h en algo casual como {game}. Te enganchó de verdad.',
      "{game} con {hours}h: el 'solo un ratito' se te fue de las manos.",
      'Con {hours}h, {game} es tu vicio relajado.',
      '{hours}h. {game} demostró que lo casual también absorbe.',
    ],
    legend: [
      '{hours}h en {game}. Lo casual se volvió ritual.',
      '{game} con {hours}h: tu compañero de fondo permanente.',
      'Cientos de horas casuales en {game}. Sin culpa.',
      '{hours}h. {game} es parte de tu rutina.',
    ],
  },
  generic: {
    never: [
      '{game} sigue sin estrenar en tu cuenta. 0h.',
      'Cero horas en {game}. Una aventura que no empezaste.',
      '{game} espera su primera partida contigo.',
      'Toda una experiencia pendiente: {game}, 0h.',
    ],
    low: [
      '{hours}h en {game}: apenas un primer vistazo.',
      'Probaste {game} {hours}h y no volvió a tu rotación.',
      'Un asomo de {hours}h. {game} no llegó a engancharte aún.',
      '{hours}h y {game} quedó esperando una segunda chance.',
    ],
    mid: [
      '{hours}h en {game}. Ya le tomaste el gusto.',
      'Con {hours}h, {game} se ganó un lugar en tu biblioteca.',
      '{game} te lleva {hours}h. La cosa va en serio.',
      '{hours}h dentro de {game}: enganchado.',
    ],
    high: [
      '{hours}h en {game}. Un favorito claro.',
      '{game} con {hours}h: de los que marcan tu cuenta.',
      'Con {hours}h, {game} es de tus grandes.',
      '{hours}h. {game} se volvió importante para ti.',
    ],
    legend: [
      '{hours}h en {game}. Un pilar de tu biblioteca.',
      '{game} con {hours}h: parte de tu identidad gamer.',
      'Cientos de horas en {game}. Leyenda personal.',
      '{hours}h. {game} es historia pura de tu cuenta.',
    ],
  },
};

// Evidence-based pools for never-played games (chosen before the genre pool).
const NEVER_FRANCHISE = [
  '{game} es de una saga reconocida y sigue en 0h. Buen punto de entrada.',
  'Saga importante, cero horas. {game} tiene potencial sin validar.',
  '{game} pertenece a una franquicia con nombre. Sin estrenar en tu cuenta.',
  'Una saga conocida esperando turno: {game}, 0h.',
];
const NEVER_ACCLAIMED = [
  '{game} es aclamado por la crítica y lleva 0h. Crimen de biblioteca.',
  'Juego fuerte, cero horas. {game} es candidato serio para tu próxima etapa.',
  'Aclamado y sin abrir: {game} se está quedando en el banco.',
  '{game} tiene la crítica de su lado. Solo falta que lo juegues.',
];
const NEVER_POPULAR = [
  '{game} lo juega medio Steam. Tú aún no. 0h.',
  'Un éxito masivo sin tocar: {game}.',
  '{game} arrasa en popularidad y sigue en cero en tu cuenta.',
  'Popularidad probada, horas tuyas en cero: {game}.',
];
// Only used with REAL evidence (a title token shared with a ≥10h game).
const RELATED = [
  '{game} se relaciona con juegos donde tienes muchas horas. Podría encajar.',
  'Suena a lo tuyo: {game} comparte aire con cosas que ya juegas mucho.',
  'En la línea de lo que más juegas, pero {game} sigue en 0h.',
  '{game} encaja con tu historial. Vale una oportunidad.',
];

// 1000h+ — a monument. Genre matters less than the sheer scale, so this pool is
// shared across categories (for the veterans with thousands of hours).
const MARATHON = [
  '{hours}h en {game}. Esto ya no se mide en sesiones, se mide en años.',
  '{game} con {hours}h: más de mil horas en un solo juego. Respeto absoluto.',
  'Mil y pico horas en {game}. Para ti esto es un segundo hogar.',
  '{hours}h. {game} es prácticamente un capítulo entero de tu vida.',
  '{game}: {hours}h. Hay quien no juega eso en toda su vida en Steam.',
  'Maratón infinito en {game}: {hours}h y sin línea de meta.',
];

// ── template fill + selection ────────────────────────────────────────────────
function fmtHours(h: number): string {
  return h >= 10 ? String(Math.round(h)) : String(Math.round(h * 10) / 10);
}

function fill(t: string, g: SteamGame, word: string): string {
  return t
    .replace(/\{game\}/g, g.name)
    .replace(/\{hours\}/g, fmtHours(g.hoursForever))
    .replace(/\{genre\}/g, word);
}

function selectPool(g: SteamGame, profile?: InsightProfile): { pool: string[]; key: string; word: string } {
  const cat = categoryOf(g);
  const bucket = bucketOf(g.hoursForever);
  const word = GENRE_WORD[cat];

  // 1000h+ is a monument — scale eclipses genre.
  if (g.hoursForever >= 1000) return { pool: MARATHON, key: 'marathon', word };

  if (bucket === 'never') {
    if (profile && profile.lovedTokens.size > 0 && titleTokens(g.name).some((t) => profile.lovedTokens.has(t)))
      return { pool: RELATED, key: 'related', word };
    if (matchesFranchise(g.name)) return { pool: NEVER_FRANCHISE, key: 'never-fr', word };
    if ((g.metacritic ?? 0) >= 80) return { pool: NEVER_ACCLAIMED, key: 'never-acc', word };
    if ((g.recommendations ?? 0) >= 50_000) return { pool: NEVER_POPULAR, key: 'never-pop', word };
  }
  return { pool: MESSAGES[cat][bucket], key: `${cat}-${bucket}`, word };
}

// Stable seed from a pool key so a list rotates deterministically (no Math.random,
// no hydration mismatch) yet varies between different pools.
function keySeed(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return h % 1009;
}

/** A single game's insight — deterministic per game (varies across the library). */
export function gameInsight(g: SteamGame, profile?: InsightProfile, offset = 0): string {
  const { pool, word } = selectPool(g, profile);
  return fill(pool[(g.appId + offset) % pool.length], g, word);
}

/**
 * Insights for a LIST, de-duplicated within each pool so two games on the same
 * screen don't read alike. Games sharing a pool get sequential, distinct lines
 * (until the pool — always ≥4 — is exhausted). Deterministic and SSR-safe.
 */
export function assignInsights(games: SteamGame[], profile?: InsightProfile): string[] {
  const used = new Map<string, number>();
  return games.map((g) => {
    const { pool, key, word } = selectPool(g, profile);
    const c = used.get(key) ?? 0;
    used.set(key, c + 1);
    return fill(pool[(keySeed(key) + c) % pool.length], g, word);
  });
}
