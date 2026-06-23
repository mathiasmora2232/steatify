/**
 * Equippable RPG titles. Each unlocks from the user's own data (level, plays,
 * minutes, gaming hours) — no extra tracking. The equipped title id lives in
 * the profile showcase ({ title }) and shows on the profile hero.
 */
export type Rarity = 'común' | 'raro' | 'épico' | 'legendario' | 'mítico';

export const RARITY_COLOR: Record<Rarity, string> = {
  'común': '#9ca3af',
  'raro': '#38bdf8',
  'épico': '#a855f7',
  'legendario': '#fbbf24',
  'mítico': '#ff5d8f',
};

export interface TitleCtx {
  level: number;
  plays: number;
  minutes: number;
  hours: number;
}

export interface TitleDef {
  id: string;
  label: string;
  rarity: Rarity;
  req: string;
  unlocked: (c: TitleCtx) => boolean;
}

export const TITLES: TitleDef[] = [
  { id: 'newcomer', label: 'The Newcomer', rarity: 'común', req: 'Crea tu cuenta', unlocked: () => true },
  { id: 'listener', label: 'The Listener', rarity: 'común', req: '5.000 reproducciones', unlocked: (c) => c.plays >= 5000 },
  { id: 'gamer', label: 'The Gamer', rarity: 'raro', req: '200 horas de juego', unlocked: (c) => c.hours >= 200 },
  { id: 'marathoner', label: 'The Marathoner', rarity: 'raro', req: '50.000 minutos de música', unlocked: (c) => c.minutes >= 50000 },
  { id: 'archivist', label: 'The Archivist', rarity: 'épico', req: '30.000 reproducciones', unlocked: (c) => c.plays >= 30000 },
  { id: 'completionist', label: 'The Completionist', rarity: 'épico', req: '1.000 horas de juego', unlocked: (c) => c.hours >= 1000 },
  { id: 'digital_archivist', label: 'Digital Archivist', rarity: 'legendario', req: 'Nivel 30', unlocked: (c) => c.level >= 30 },
  { id: 'legend', label: 'Living Legend', rarity: 'legendario', req: 'Nivel 50', unlocked: (c) => c.level >= 50 },
  { id: 'loop_master', label: 'The Loop Master', rarity: 'mítico', req: '100.000 minutos de música', unlocked: (c) => c.minutes >= 100000 },
];

export function titleById(id?: string): TitleDef | undefined {
  return id ? TITLES.find((t) => t.id === id) : undefined;
}
