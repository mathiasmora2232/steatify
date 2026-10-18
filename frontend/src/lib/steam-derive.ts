import { Compass, Library, Swords, BookOpen, CalendarCheck, Shapes, Flame, Skull, Crown, Hourglass, Gamepad2, Dices, Heart, Moon, RotateCcw, Gem, Medal, Archive } from 'lucide-react';
import type { LucideIcon } from '@/lib/icons';
import type { SteamStats, SteamGame } from '@/lib/api';

/**
 * Pure derivations for the Steam "gamer identity" dashboard. Built only from the
 * real data Steam gives us (per-game hours total + last-2-weeks, lastPlayedAt,
 * library size, played/unplayed counts). Where the design wants a richer signal
 * (RPG attributes, gamer class, completion) we derive a STABLE, defensible value
 * from those numbers — no genres, achievements or session data are invented.
 */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const COMPLETED_HOURS = 20; // proxy threshold for a "dominated" game

export interface Attribute {
  axis: string;
  value: number;
  icon: LucideIcon;
}

const COMPETITIVE_GENRES = new Set(['Action', 'Massively Multiplayer', 'Sports', 'Racing', 'Fighting']);
const STORY_GENRES = new Set(['RPG', 'Adventure']);

/**
 * Six RPG attributes for the gamer radar. Most come from library shape; when
 * real Steam genres are available, Competitivo (Action/MMO/Sports…) and Historia
 * (RPG/Adventure) are computed from actual hours-per-genre instead of a proxy.
 */
export function gamerAttributes(
  stats: SteamStats,
  library: SteamGame[],
  genres?: { genre: string; hours: number }[],
): Attribute[] {
  const games = stats.gameCount || 1;
  const totalH = stats.totalHours || 1;
  const topSum = stats.topGames.slice(0, 3).reduce((s, g) => s + g.hoursForever, 0);
  const concentration = topSum / totalH;
  const deep = library.filter((g) => g.hoursForever >= 10).length;
  const recent = stats.recentGames.length;

  const totalGenreH = genres?.reduce((s, g) => s + g.hours, 0) ?? 0;
  const share = (set: Set<string>) =>
    totalGenreH > 0 ? (genres ?? []).filter((g) => set.has(g.genre)).reduce((s, g) => s + g.hours, 0) / totalGenreH : 0;
  const hasGenres = totalGenreH > 0;

  return [
    { axis: 'Exploración', value: clamp(games / 4), icon: Compass },
    { axis: 'Colección', value: clamp(35 + (stats.unplayedCount / games) * 120 + games / 25), icon: Library },
    {
      axis: 'Competitivo',
      value: hasGenres ? clamp(share(COMPETITIVE_GENRES) * 180) : clamp(concentration * 260),
      icon: Swords,
    },
    {
      axis: 'Historia',
      value: hasGenres ? clamp(share(STORY_GENRES) * 180 + stats.avgHoursPlayed * 2) : clamp(stats.avgHoursPlayed * 5 + deep * 1.6),
      icon: BookOpen,
    },
    { axis: 'Constancia', value: clamp(recent * 9 + (stats.playedCount / games) * 38), icon: CalendarCheck },
    { axis: 'Variedad', value: clamp(games / 4.4), icon: Shapes },
  ];
}

const NOUN: Record<string, string> = {
  Exploración: 'Explorador',
  Colección: 'Coleccionista',
  Competitivo: 'Competidor',
  Historia: 'Narrador',
  Constancia: 'Veterano',
  Variedad: 'Aventurero',
};
const ADJ: Record<string, string> = {
  Exploración: 'Explorador',
  Colección: 'Coleccionista',
  Competitivo: 'Implacable',
  Historia: 'Narrativo',
  Constancia: 'Constante',
  Variedad: 'Versátil',
};
const TAGLINE: Record<string, string> = {
  Exploración: 'Descubres más de lo que completas. Tu biblioteca siempre está creciendo.',
  Colección: 'Te encanta descubrir, coleccionar y dejar juegos para “algún día”.',
  Competitivo: 'Cuando un juego te atrapa, lo llevas al límite.',
  Historia: 'Buscas mundos para perderte. Las horas no cuentan si la historia engancha.',
  Constancia: 'Vuelves una y otra vez. La constancia es tu sello.',
  Variedad: 'Saltas de un mundo a otro sin parar. Nunca dos partidas iguales.',
};

export interface GamerClass {
  name: string;
  tagline: string;
  tags: string[];
  color: string;
}

/** A gamer "class" from the two dominant attributes, e.g. "Coleccionista Explorador". */
export function gamerClass(attrs: Attribute[]): GamerClass {
  const sorted = [...attrs].sort((a, b) => b.value - a.value);
  const top = sorted[0];
  const second = sorted[1];
  const name = `${NOUN[top.axis] ?? 'Jugador'} ${ADJ[second.axis] ?? ''}`.trim();
  return {
    name,
    tagline: TAGLINE[top.axis] ?? 'Así juegas tú.',
    tags: sorted.slice(0, 4).map((a) => NOUN[a.axis] ?? a.axis),
    color: '#1db954',
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  ADN Gamer — reusable archetypes scored from REAL Steam metrics (works for
//  any user, reflects each user's own data). Nocturno is intentionally absent:
//  Steam exposes no play-time-of-day, so we don't invent it.
// ═══════════════════════════════════════════════════════════════════════════
export type GamerTypeKey =
  | 'constructor'
  | 'completista'
  | 'competitivo'
  | 'explorador'
  | 'coleccionista'
  | 'backlogMaster'
  | 'retomador';

export interface GamerType {
  key: GamerTypeKey;
  label: string;
  tagline: string;
  reason: string; // factual: what in the data makes you this
  color: string;
  icon: LucideIcon;
  score: number; // 0–100 of the winning type
}

const BUILD_GENRES = new Set(['Strategy', 'Simulation']);
const COMPETE_GENRES = new Set(['Action', 'Massively Multiplayer', 'Sports', 'Racing', 'Fighting']);

const GAMER_TYPE_META: Record<GamerTypeKey, { label: string; tagline: string; color: string; icon: LucideIcon }> = {
  constructor: { label: 'Constructor', tagline: 'Construyes, gestionas y planificas. El caos te aburre.', color: '#38bdf8', icon: Shapes },
  completista: { label: 'Completista', tagline: 'Lo que empiezas, lo llevas hasta el final.', color: '#34d399', icon: Crown },
  competitivo: { label: 'Competitivo', tagline: 'Juegas para ganar. La habilidad es el premio.', color: '#ff5d8f', icon: Swords },
  explorador: { label: 'Explorador', tagline: 'Saltas de mundo en mundo. La variedad es tu firma.', color: '#a78bfa', icon: Compass },
  coleccionista: { label: 'Coleccionista', tagline: 'Tu biblioteca crece más rápido de lo que la juegas.', color: '#f59e0b', icon: Library },
  backlogMaster: { label: 'Backlog Master', tagline: 'Maestro del “algún día lo juego”. Tu backlog es legendario.', color: '#fb7185', icon: Hourglass },
  retomador: { label: 'Retomador', tagline: 'Siempre vuelves. Ningún juego queda olvidado para siempre.', color: '#22d3ee', icon: RotateCcw },
};

/**
 * Scores the ADN Gamer archetypes from real metrics and returns the dominant one
 * plus the full ranked breakdown. `resumed` (from /steam/momentum) feeds
 * Retomador; without it that archetype simply scores low (not invented).
 */
export function gamerType(
  stats: SteamStats,
  library: SteamGame[],
  genres: { genre: string; hours: number }[],
  resumed = 0,
): { top: GamerType; ranked: GamerType[] } {
  const games = stats.gameCount || 1;
  const played = stats.playedCount || 0;
  const unplayed = stats.unplayedCount || 0;
  const totalGenreH = genres.reduce((s, x) => s + x.hours, 0) || 1;
  const share = (set: Set<string>) => genres.filter((x) => set.has(x.genre)).reduce((s, x) => s + x.hours, 0) / totalGenreH;
  const distinctGenres = new Set(library.flatMap((g) => g.genres ?? [])).size;
  const completed = library.filter((g) => g.hoursForever >= COMPLETED_HOURS).length;
  const recent = stats.recentGames.length;

  const scores: Record<GamerTypeKey, number> = {
    constructor: clamp(share(BUILD_GENRES) * 180),
    completista: clamp((completed / Math.max(1, played)) * 140 + completed * 1.5),
    competitivo: clamp(share(COMPETE_GENRES) * 150 + recent * 5),
    explorador: clamp(distinctGenres * 7 + games / 12),
    coleccionista: clamp(games / 4 + (unplayed / games) * 60),
    backlogMaster: clamp((unplayed / games) * 130 + unplayed / 6),
    retomador: clamp(resumed * 22 + recent * 4),
  };

  const ranked = (Object.keys(scores) as GamerTypeKey[])
    .map((key) => ({ key, ...GAMER_TYPE_META[key], score: scores[key], reason: gamerTypeReason(key, { completed, played, unplayed, games, distinctGenres, buildShare: share(BUILD_GENRES), competeShare: share(COMPETE_GENRES), resumed }) }))
    .sort((a, b) => b.score - a.score);

  return { top: ranked[0], ranked };
}

function gamerTypeReason(
  key: GamerTypeKey,
  m: { completed: number; played: number; unplayed: number; games: number; distinctGenres: number; buildShare: number; competeShare: number; resumed: number },
): string {
  const pct = (x: number) => `${Math.round(x * 100)}%`;
  switch (key) {
    case 'constructor':
      return `${pct(m.buildShare)} de tus horas son de estrategia y simulación.`;
    case 'completista':
      return `${m.completed} juegos llevados a +${COMPLETED_HOURS}h (${pct(m.completed / Math.max(1, m.played))} de los que juegas).`;
    case 'competitivo':
      return `${pct(m.competeShare)} de tus horas en géneros de acción y competitivos.`;
    case 'explorador':
      return `${m.distinctGenres} géneros distintos en ${m.games} juegos. Variedad pura.`;
    case 'coleccionista':
      return `${m.games} juegos en tu biblioteca, ${pct(m.unplayed / m.games)} sin abrir.`;
    case 'backlogMaster':
      return `${m.unplayed} juegos sin tocar (${pct(m.unplayed / m.games)} de tu colección).`;
    case 'retomador':
      return m.resumed > 0 ? `${m.resumed} juego(s) retomados tras estar dormidos.` : `Aún sin retomas registradas — se mide con cada sync.`;
  }
}

/** Six tiers by total hours: Nunca abierto → Leyenda. */
export type GameState = 'pending' | 'barely' | 'tried' | 'played' | 'heavy' | 'legend';

export interface StateMeta {
  key: GameState;
  label: string;
  color: string;
  icon: LucideIcon;
}

export const STATE_META: Record<GameState, StateMeta> = {
  pending: { key: 'pending', label: 'Nunca abierto', color: '#ff5d8f', icon: Skull },
  barely: { key: 'barely', label: 'Apenas tocado', color: '#7c5cff', icon: Hourglass },
  tried: { key: 'tried', label: 'Probado', color: '#38bdf8', icon: Dices },
  played: { key: 'played', label: 'Jugado', color: '#34d399', icon: Gamepad2 },
  heavy: { key: 'heavy', label: 'Muy jugado', color: '#1db954', icon: Flame },
  legend: { key: 'legend', label: 'Leyenda', color: '#f59e0b', icon: Crown },
};

export const STATE_ORDER: GameState[] = ['legend', 'heavy', 'played', 'tried', 'barely', 'pending'];

export function gameState(g: SteamGame): GameState {
  const h = g.hoursForever;
  if (h === 0) return 'pending';
  if (h < 2) return 'barely';
  if (h < 10) return 'tried';
  if (h < 50) return 'played';
  if (h < 100) return 'heavy';
  return 'legend';
}

/** Currently in your rotation (played in the last 2 weeks) — overlay on the tier. */
export function isObsession(g: SteamGame): boolean {
  return g.hours2Weeks > 0;
}

/**
 * Acclaimed franchises — a name matching one of these is almost always a safe,
 * high-value pick worth surfacing from the backlog. Lowercased, matched as a
 * substring of the game title.
 */
const LOVED_FRANCHISES = [
  'zelda', 'mario', 'grand theft auto', 'gta', 'witcher', 'dark souls', 'elden ring',
  'sekiro', 'bloodborne', 'red dead', 'cyberpunk', 'half-life', 'portal', 'doom',
  'resident evil', 'final fantasy', 'persona', 'fallout', 'elder scrolls', 'skyrim',
  'mass effect', 'dragon age', 'bioshock', 'dishonored', 'hitman', 'far cry',
  "assassin's creed", 'arkham', 'batman', 'god of war', 'horizon', 'hollow knight',
  'hades', 'celeste', 'stardew', 'terraria', 'civilization', 'total war', 'xcom',
  'frostpunk', 'factorio', 'rimworld', 'disco elysium', "baldur's gate", 'divinity',
  'monster hunter', 'nier', 'metal gear', 'silent hill', 'borderlands', 'left 4 dead',
  'counter-strike', 'deus ex', 'metro', 'outer wilds', 'control', 'death stranding',
  'sea of thieves', 'subnautica', 'ori and', 'cuphead', 'returnal', 'hi-fi rush',
];

const TOKEN_STOP = new Set([
  'the', 'of', 'and', 'a', 'an', 'game', 'edition', 'remastered', 'remake', 'definitive',
  'complete', 'goty', 'deluxe', 'ultimate', 'gold', 'collection', 'hd', 'ii', 'iii', 'iv',
  'vr', 'online', 'new', 'simulator', 'world', 'war', 'dead', 'life', 'dark', 'light',
]);

/** Significant title tokens (≥4 chars) drawn from a game name, for saga matching. */
export function titleTokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 4 && !TOKEN_STOP.has(t));
}

/**
 * Tokens from sagas you already LOVE — drawn from games you've played ≥10h. An
 * unplayed "Batman: Arkham Knight" overlaps "batman"/"arkham" from your 30h
 * "Arkham City", so we know it's a saga you're into, not a random title.
 */
export function lovedSagaTokens(library: SteamGame[]): Set<string> {
  const tokens = new Set<string>();
  for (const g of library) {
    if (g.hoursForever >= 10) titleTokens(g.name).forEach((t) => tokens.add(t));
  }
  return tokens;
}

export function matchesFranchise(name: string): boolean {
  const n = name.toLowerCase();
  return LOVED_FRANCHISES.some((f) => n.includes(f));
}

/**
 * pendingScore — ranks UNPLAYED games so "promesas pendientes" surfaces real
 * candidates (acclaimed, popular, matching your taste & sagas), not shovelware.
 * Combines: metacritic (quality) + recommendations (popularity) + top-genre match
 * + acclaimed-franchise bonus + "you already love this saga" bonus. 0 if played.
 */
export function pendingScore(
  g: SteamGame,
  topGenres: Set<string>,
  lovedTokens?: Set<string>,
): number {
  if (g.hoursForever > 0) return 0;
  // Quality leads: metacritic (unknown → mediocre 45) + popularity. Genre match
  // is a taste bonus, NOT the main driver — otherwise low-rated shovelware that
  // happens to match your genres outranks acclaimed games.
  let score = g.metacritic ?? 45;
  if (g.recommendations) score += Math.min(40, Math.log10(g.recommendations + 1) * 8);
  const hits = (g.genres ?? []).filter((x) => topGenres.has(x)).length;
  score += hits * 8;
  if (matchesFranchise(g.name)) score += 15;
  if (lovedTokens && lovedTokens.size > 0) {
    const sagaHit = titleTokens(g.name).some((t) => lovedTokens.has(t));
    if (sagaHit) score += 18; // a sequel/entry in a saga you already sank hours into
  }
  return Math.round(score);
}

/**
 * reviveScore — ranks games worth RETOMAR: ones you sank real hours into but
 * dropped a while ago. More hours invested (sunk cost) + quality = stronger pull.
 */
export function reviveScore(g: SteamGame): number {
  if (g.hours2Weeks > 0) return 0; // currently playing — not "abandoned"
  let score = Math.min(60, g.hoursForever); // the more you played, the more it deserves a finish
  if (g.metacritic != null) score += (g.metacritic - 55) * 0.5;
  return Math.round(score);
}

export interface StartPick {
  game: SteamGame;
  score: number;
}
export interface RevivePick {
  game: SteamGame;
  days: number;
}

/**
 * "Steatify te recomienda" — two data-driven lists: games to START (never opened,
 * ranked by pendingScore w/ franchise + saga signal) and games to RETOMAR
 * (abandoned, ranked by reviveScore). The human "why" is produced separately by
 * the Game Insight Engine (genre-aware, de-duplicated per screen).
 */
export function recommendations(
  library: SteamGame[],
  topGenres: Set<string>,
  limit = 4,
): { start: StartPick[]; revive: RevivePick[] } {
  const loved = lovedSagaTokens(library);

  const start = library
    .filter((g) => g.hoursForever === 0)
    .map((g) => ({ game: g, score: pendingScore(g, topGenres, loved) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ game, score }) => ({ game, score }));

  const revive = library
    .filter((g) => g.hoursForever >= 2 && g.hours2Weeks === 0 && (daysSince(g.lastPlayedAt) ?? 0) >= 30)
    .map((g) => ({ game: g, days: daysSince(g.lastPlayedAt) ?? 0, s: reviveScore(g) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ game, days }) => ({ game, days }));

  return { start, revive };
}

/** A "hidden gem": acclaimed (metacritic ≥80) but you've barely touched it. */
export function isHiddenGem(g: SteamGame): boolean {
  return g.hoursForever < 2 && (g.metacritic ?? 0) >= 80;
}

// ═══════════════════════════════════════════════════════════════════════════
//  TWO SEPARATE CONCEPTS
//  A) Playtime Label — depends ONLY on hours (18 granular tiers)
//  B) Steatify State   — depends on behaviour/context (what the playtime SAYS)
//  + dynamic message pools (no fixed single text, nothing assumed about data)
// ═══════════════════════════════════════════════════════════════════════════

export interface PlaytimeTier {
  label: string;
  color: string;
  tier: number; // 0 (Nunca abierto) … 17 (Identidad gamer)
}

// 18 granular tiers. The first entry (max 0) is the "never opened" sentinel; the
// loop starts at index 1. Colors run cold → warm as the hours climb.
const PLAYTIME_TIERS: { max: number; label: string; color: string }[] = [
  { max: 0, label: 'Nunca abierto', color: '#8b8fa3' },
  { max: 0.5, label: 'Abierto por curiosidad', color: '#a78bfa' },
  { max: 1, label: 'Probado rápido', color: '#9d8bf5' },
  { max: 2, label: 'Apenas tocado', color: '#8b7cff' },
  { max: 5, label: 'Primer vistazo', color: '#7c5cff' },
  { max: 8, label: 'Exploración inicial', color: '#6366f1' },
  { max: 12, label: 'Probado en serio', color: '#3b82f6' },
  { max: 20, label: 'Ya arrancado', color: '#38bdf8' },
  { max: 30, label: 'Jugado casual', color: '#22d3ee' },
  { max: 45, label: 'Buen avance', color: '#2dd4bf' },
  { max: 60, label: 'Muy jugado', color: '#34d399' },
  { max: 80, label: 'Dedicado', color: '#4ade80' },
  { max: 100, label: 'Casi leyenda', color: '#84cc16' },
  { max: 125, label: 'Leyenda menor', color: '#eab308' },
  { max: 175, label: 'Leyenda', color: '#f59e0b' },
  { max: 250, label: 'Juego de cabecera', color: '#fb923c' },
  { max: 400, label: 'Parte de tu vida', color: '#f97316' },
  { max: 600, label: 'Identidad gamer', color: '#ef4444' },
  { max: 850, label: 'Veterano de mil batallas', color: '#dc2626' },
  { max: 1200, label: 'Club de las mil horas', color: '#e11d48' },
  { max: 2000, label: 'Devoción total', color: '#be123c' },
  { max: 3500, label: 'Maratón infinito', color: '#a21caf' },
  { max: 6000, label: 'Obsesión histórica', color: '#7e22ce' },
  { max: Infinity, label: 'Leyenda eterna', color: '#fbbf24' },
];

/** A) Playtime Label — hours only, 18 tiers from "Nunca abierto" to "Identidad gamer". */
export function playtimeLabel(hours: number): PlaytimeTier {
  if (hours <= 0) return { label: PLAYTIME_TIERS[0].label, color: PLAYTIME_TIERS[0].color, tier: 0 };
  for (let i = 1; i < PLAYTIME_TIERS.length; i++) {
    if (hours < PLAYTIME_TIERS[i].max) return { label: PLAYTIME_TIERS[i].label, color: PLAYTIME_TIERS[i].color, tier: i };
  }
  const last = PLAYTIME_TIERS.length - 1;
  return { label: PLAYTIME_TIERS[last].label, color: PLAYTIME_TIERS[last].color, tier: last };
}

export type SteamGameStateKey =
  | 'backlogPuro'
  | 'promesaPendiente'
  | 'joyita'
  | 'probadoDejado'
  | 'paraRetomar'
  | 'dormidoMucho'
  | 'reliquia'
  | 'obsesionActual'
  | 'leyendaActiva'
  | 'leyendaDormida'
  | 'mainGame'
  | 'juegoDeVida'
  | 'maraton';

export interface SteamGameStateMeta {
  key: SteamGameStateKey;
  label: string;
  color: string;
  icon: LucideIcon;
}

export const STEAM_GAME_STATE: Record<SteamGameStateKey, SteamGameStateMeta> = {
  maraton: { key: 'maraton', label: 'Maratón infinito', color: '#fbbf24', icon: Medal },
  obsesionActual: { key: 'obsesionActual', label: 'Obsesión actual', color: '#22d3ee', icon: Flame },
  leyendaActiva: { key: 'leyendaActiva', label: 'Leyenda activa', color: '#f59e0b', icon: Crown },
  mainGame: { key: 'mainGame', label: 'Main game', color: '#fbbf24', icon: Crown },
  juegoDeVida: { key: 'juegoDeVida', label: 'Juego de vida', color: '#f97316', icon: Heart },
  leyendaDormida: { key: 'leyendaDormida', label: 'Leyenda dormida', color: '#c084fc', icon: Moon },
  reliquia: { key: 'reliquia', label: 'Reliquia', color: '#c19a6b', icon: Archive },
  paraRetomar: { key: 'paraRetomar', label: 'Para retomar', color: '#38bdf8', icon: RotateCcw },
  dormidoMucho: { key: 'dormidoMucho', label: 'Dormido demasiado tiempo', color: '#94a3b8', icon: Moon },
  probadoDejado: { key: 'probadoDejado', label: 'Probado y dejado', color: '#a78bfa', icon: Dices },
  joyita: { key: 'joyita', label: 'Joyita sin abrir', color: '#34d399', icon: Gem },
  promesaPendiente: { key: 'promesaPendiente', label: 'Promesa pendiente', color: '#7c5cff', icon: Hourglass },
  backlogPuro: { key: 'backlogPuro', label: 'Backlog puro', color: '#ff5d8f', icon: Skull },
};

/**
 * B) Steatify State — behaviour + context, NOT just hours. Order = priority (the
 * loudest signal wins). `isTop` flags the single most-played game in the library.
 */
export function steamGameState(g: SteamGame, ctx?: { isTop?: boolean }): SteamGameStateKey {
  const h = g.hoursForever;
  const days = daysSince(g.lastPlayedAt);

  // Currently in rotation (played in the last 2 weeks).
  if (g.hours2Weeks > 0) return h >= 100 ? 'leyendaActiva' : 'obsesionActual';

  // Never opened — split by real evidence (rating / popularity / known franchise).
  if (h === 0) {
    if ((g.metacritic ?? 0) >= 85) return 'joyita';
    if ((g.metacritic ?? 0) >= 75 || (g.recommendations ?? 0) >= 50_000 || matchesFranchise(g.name)) return 'promesaPendiente';
    return 'backlogPuro';
  }

  // 1000h+ in a single game — a monument, beats every other label.
  if (h >= 1000) return 'maraton';
  // The single most-played title in your library.
  if (ctx?.isTop && h >= 50) return 'mainGame';

  // Played, not currently active.
  if (h >= 250) return 'juegoDeVida';
  if (h >= 100) return 'leyendaDormida';
  if (h < 2) return 'probadoDejado';
  // A relic: heavily played, but untouched for years.
  if (h >= 20 && days != null && days >= 730) return 'reliquia';
  if (days != null && days >= 365) return 'dormidoMucho';
  return 'paraRetomar';
}

// ── dynamic message pools ────────────────────────────────────────────────────
// Deterministic pick by appId: stable across renders (no hydration mismatch, no
// Math.random), yet varied across the library so two games rarely read alike.
function pick(pool: string[], g: SteamGame): string {
  return pool.length ? pool[((g.appId % pool.length) + pool.length) % pool.length] : '';
}

const MSG_OBSESION = [
  'Esto es lo tuyo ahora mismo. No sueltas el control.',
  'En plena racha. El juego del momento.',
  'Cada sesión cuenta: estás enganchadísimo.',
  'Tu obsesión activa. Lo demás puede esperar.',
  'Ahora mismo no existe otro juego para ti.',
];
const MSG_LEYENDA_ACTIVA = [
  'Una leyenda que SIGUE viva. Respeto absoluto.',
  'Cientos de horas y aún le das. Esto es devoción.',
  'No es nostalgia: lo sigues jugando como el primer día.',
  'Leyenda en activo. Tu relación con este juego no caduca.',
];
const MSG_MAIN = [
  'El juego de tu vida en Steam. Tu número uno indiscutible.',
  'Si tu cuenta tuviera una cara, sería esta.',
  'Más horas que cualquier otro. Tu main absoluto.',
  'El trono de tu biblioteca tiene dueño, y es este.',
];
const MSG_JUEGO_VIDA = [
  'Esto ya no es un juego, es un capítulo de tu vida.',
  'Cientos de horas. Parte de tu historia personal.',
  'Pocos llegan aquí. Este se ganó su lugar.',
  'Una era entera vivida dentro de este título.',
];
const MSG_MARATON = [
  'Más de mil horas aquí. Esto trasciende cualquier biblioteca.',
  'Un maratón sin línea de meta. Pocos llegan a este nivel.',
  'Esto ya no es un juego, es una parte estructural de tu vida.',
  'Mil horas y subiendo. Categoría reservada para titanes.',
  'Aquí ya no cuentas partidas: cuentas años.',
];
const MSG_RELIQUIA = [
  'Una reliquia de tus años en Steam. Lo amaste, hace eras.',
  'Pieza de museo de tu cuenta: enormes horas, pero de otra época.',
  'Lo jugaste muchísimo… en otra vida gamer. Reliquia pura.',
  'Un clásico personal cubierto de polvo noble.',
  'De los que marcaron una era y quedaron en la vitrina.',
];
const MSG_LEYENDA_DORMIDA = [
  'Una leyenda que hoy duerme. El tiempo no le quita mérito.',
  'Le diste todo y luego silencio. La gloria quedó en pausa.',
  'Esto fue enorme. Ahora descansa, esperando una vuelta.',
  'Leyenda dormida: cientos de horas, cero actividad reciente.',
];
const MSG_DORMIDO_MUCHO = [
  'Lleva demasiado tiempo en hibernación. ¿Lo despiertas?',
  'Polvo acumulado nivel arqueológico. Quedó atrás.',
  'Tan dormido que casi lo olvidas. Casi.',
  'Hace muchísimo que no sabe de ti. Capítulo cerrado… ¿o no?',
];
const MSG_PROBADO_DEJADO = [
  'Un vistazo y a otra cosa. No cuajó.',
  'Lo probaste por encima y no volviste. Pasa.',
  'Apenas un asomo. Ni tiempo de engancharte.',
  'Curiosidad satisfecha, relación inexistente.',
];
const MSG_JOYITA = [
  'Juego fuerte, cero horas. Crimen de biblioteca.',
  'Esto no es relleno: candidato serio para tu próxima etapa gamer.',
  'Aclamado y sin estrenar. Lo estás dejando pasar.',
  'Una joya esperando turno. Y el turno es ahora.',
  'Metacrítica altísima, horas en cero. Algo no cuadra.',
];
const MSG_PROMESA_FRANCHISE = [
  'Parte de una saga reconocida. Podría ser buen punto de entrada.',
  'Saga importante, cero horas. Aquí hay potencial sin validar.',
  'De una franquicia con nombre. Sin estrenar en tu cuenta.',
  'Una saga conocida esperando que le des una oportunidad.',
];
const MSG_PROMESA_RATING = [
  'Bien valorado y sin tocar. Promesa pendiente de verdad.',
  'Tiene reputación. Solo falta que lo abras.',
  'Candidato sólido para tu backlog. Cero horas, mucho potencial.',
  'La gente lo respalda. Te toca comprobarlo.',
];
const MSG_BACKLOG = [
  'Backlog en estado puro. Aquí lleva esperando.',
  'Comprado con ilusión, jugado nunca. El clásico.',
  'Otro inquilino del backlog eterno.',
  'Cero horas y sin prisa aparente. Backlog clásico.',
];

/** Contextual message for a Steatify State — picks from a pool, varied per game. */
export function stateMessage(g: SteamGame, state: SteamGameStateKey): string {
  switch (state) {
    case 'maraton':
      return pick(MSG_MARATON, g);
    case 'reliquia':
      return pick(MSG_RELIQUIA, g);
    case 'obsesionActual':
      return pick(MSG_OBSESION, g);
    case 'leyendaActiva':
      return pick(MSG_LEYENDA_ACTIVA, g);
    case 'mainGame':
      return pick(MSG_MAIN, g);
    case 'juegoDeVida':
      return pick(MSG_JUEGO_VIDA, g);
    case 'leyendaDormida':
      return pick(MSG_LEYENDA_DORMIDA, g);
    case 'dormidoMucho':
      return pick(MSG_DORMIDO_MUCHO, g);
    case 'paraRetomar':
      return pick(retomarPool(g.hoursForever), g);
    case 'probadoDejado':
      return pick(MSG_PROBADO_DEJADO, g);
    case 'joyita':
      return pick(MSG_JOYITA, g);
    case 'promesaPendiente':
      return pick(matchesFranchise(g.name) ? MSG_PROMESA_FRANCHISE : MSG_PROMESA_RATING, g);
    case 'backlogPuro':
      return pick(MSG_BACKLOG, g);
  }
}

/** Factual one-liner explaining WHY a game landed in its state — the receipts. */
export function stateReason(g: SteamGame, state: SteamGameStateKey): string {
  const h = Math.round(g.hoursForever * 10) / 10;
  const days = daysSince(g.lastPlayedAt);
  const recencia = days != null ? `hace ${days} días` : 'sin registro de última partida';
  switch (state) {
    case 'maraton':
      return `${h}h acumuladas — más de mil horas en un solo juego.`;
    case 'reliquia':
      return `${h}h jugadas, pero tu última partida fue ${recencia}. Otra era.`;
    case 'obsesionActual':
      return `${g.hours2Weeks}h en las últimas 2 semanas. Está en tu rotación.`;
    case 'leyendaActiva':
      return `${h}h totales y aún activa (${g.hours2Weeks}h estas 2 semanas).`;
    case 'mainGame':
      return `${h}h — el juego con más horas de toda tu biblioteca.`;
    case 'juegoDeVida':
      return `${h}h acumuladas. Ya es parte de tu historia.`;
    case 'leyendaDormida':
      return `${h}h jugadas, pero sin actividad reciente (${recencia}).`;
    case 'paraRetomar':
      return `${h}h invertidas y última partida ${recencia}.`;
    case 'dormidoMucho':
      return `${h}h, pero llevas ${days} días sin tocarlo.`;
    case 'probadoDejado':
      return `Solo ${h}h y sin volver. Apenas un vistazo.`;
    case 'joyita':
      return `Metacritic ${g.metacritic}, 0h jugadas. Aclamado y sin estrenar.`;
    case 'promesaPendiente':
      return matchesFranchise(g.name)
        ? `Parte de una saga reconocida, 0h jugadas.`
        : `${g.metacritic ? `Metacritic ${g.metacritic}, ` : ''}${(g.recommendations ?? 0) >= 50_000 ? 'muy popular en Steam, ' : ''}0h jugadas.`;
    case 'backlogPuro':
      return `0h jugadas. Backlog en estado puro.`;
  }
}

// "Para retomar" messages bucketed by how much you actually invested.
const RETOMAR_LIGHT = [
  'Le diste una probada real, pero quedó a medias.',
  'Empezaste con intención y se enfrió. Retomarlo es fácil.',
  'Hubo chispa. Faltó continuidad.',
];
const RETOMAR_10_30 = [
  'Ya pasaste la barrera del tutorial. Aquí sí hubo intención.',
  'Lo dejaste justo cuando empezaba a ponerse serio.',
  'Suficientes horas para saber que te gustaba. ¿Por qué paraste?',
  'Ibas en buen camino y se quedó ahí colgado.',
  'No fue un capricho: invertiste de verdad y luego lo soltaste.',
];
const RETOMAR_30_80 = [
  'Esto no fue prueba, esto fue relación seria y ghosteo.',
  'Demasiado avance para dejarlo criando polvo.',
  'Le metiste horas de las buenas. Terminar lo que empezaste sería justo.',
  'Una historia a medio contar. Merece su final.',
  'Tanto recorrido para dejarlo en pausa indefinida…',
];
const RETOMAR_HEAVY = [
  'Esto fue una era. Si vuelve, vuelve con respeto.',
  'No se abandona una leyenda así nomás.',
  'Decenas y decenas de horas. Esto pide cierre, no olvido.',
  'Fue de tus grandes. Volver sería un reencuentro, no un reinicio.',
];
function retomarPool(hours: number): string[] {
  if (hours < 10) return RETOMAR_LIGHT;
  if (hours < 30) return RETOMAR_10_30;
  if (hours < 80) return RETOMAR_30_80;
  return RETOMAR_HEAVY;
}

export function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export interface GamingMarket {
  rising: SteamGame[];
  abandoned: { game: SteamGame; days: number }[];
}

/** Gaming "market": what's heating up (last 2 weeks) and what's been abandoned. */
export function gamingMarket(library: SteamGame[]): GamingMarket {
  const rising = library
    .filter((g) => g.hours2Weeks > 0)
    .sort((a, b) => b.hours2Weeks - a.hours2Weeks)
    .slice(0, 12);

  const abandoned = library
    .filter((g) => g.hoursForever >= 2 && g.hours2Weeks === 0 && g.lastPlayedAt)
    .map((g) => ({ game: g, days: daysSince(g.lastPlayedAt) ?? 0 }))
    .filter((x) => x.days >= 45)
    .sort((a, b) => b.days - a.days)
    .slice(0, 12);

  return { rising, abandoned };
}

export function completedCount(library: SteamGame[]): number {
  return library.filter((g) => g.hoursForever >= COMPLETED_HOURS).length;
}
