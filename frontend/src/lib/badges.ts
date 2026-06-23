import type { Rarity } from './titles';
import { RARITY_COLOR } from './titles';

export { RARITY_COLOR };
export type { Rarity };

/**
 * Profile badges with a rarity tier + an approximate global share (Steam-style
 * "X% lo tiene"). Earned purely from the viewed profile's own numbers, so they
 * work on any public profile. The share is a designed estimate per tier until
 * there's a large enough user base to compute it live.
 */
export interface BadgeCtx {
  level: number;
  plays: number;
  minutes: number;
  hours: number;
  obsesiones: number;
  leyendas: number;
  mundos: number;
  exploration: number;
}

export interface BadgeDef {
  id: string;
  label: string;
  emoji: string;
  rarity: Rarity;
  share: string; // approximate global rarity
  req: string;
  earned: (c: BadgeCtx) => boolean;
}

export const BADGES: BadgeDef[] = [
  { id: 'first_steps', label: 'Primeros pasos', emoji: '🌱', rarity: 'común', share: '~78%', req: '100 reproducciones', earned: (c) => c.plays >= 100 },
  { id: 'melomano', label: 'Melómano', emoji: '🎧', rarity: 'común', share: '~52%', req: '10.000 min de música', earned: (c) => c.minutes >= 10000 },
  { id: 'gamer', label: 'Gamer', emoji: '🎮', rarity: 'raro', share: '~30%', req: '100 horas de juego', earned: (c) => c.hours >= 100 },
  { id: 'explorer', label: 'Explorador', emoji: '🧭', rarity: 'raro', share: '~24%', req: 'Explorar 50% de tu biblioteca', earned: (c) => c.exploration >= 50 },
  { id: 'collector', label: 'Coleccionista', emoji: '📦', rarity: 'raro', share: '~21%', req: '50 obsesiones', earned: (c) => c.obsesiones >= 50 },
  { id: 'archivist', label: 'Archivista', emoji: '🗄️', rarity: 'épico', share: '~9%', req: '30.000 reproducciones', earned: (c) => c.plays >= 30000 },
  { id: 'completionist', label: 'Completista', emoji: '🏁', rarity: 'épico', share: '~6%', req: '1.000 horas de juego', earned: (c) => c.hours >= 1000 },
  { id: 'world_eater', label: 'Devoramundos', emoji: '🌍', rarity: 'legendario', share: '~3%', req: '200 mundos conquistados', earned: (c) => c.mundos >= 200 },
  { id: 'legend', label: 'Leyenda viva', emoji: '👑', rarity: 'legendario', share: '~2.5%', req: 'Nivel 50', earned: (c) => c.level >= 50 },
  { id: 'diamond', label: 'Oído de diamante', emoji: '💎', rarity: 'mítico', share: '~0.8%', req: '100.000 min de música', earned: (c) => c.minutes >= 100000 },
];

export function earnedBadges(c: BadgeCtx): BadgeDef[] {
  return BADGES.filter((b) => b.earned(c));
}
