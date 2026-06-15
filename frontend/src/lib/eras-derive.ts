import { Moon, Sunrise, Compass, Repeat, Flame, Crown, History, Headphones, Gem, RotateCcw, Hourglass } from 'lucide-react';
import type { LucideIcon } from '@/lib/icons';
import type { Era } from '@/lib/api';

/**
 * Pure derivations + theming for the "Eras musicales" experience. Everything is
 * computed from the real `Era[]` payload (title, summary, dominant artists/
 * genres/mood, peakHour, confidence, dates). Where the design wants a richer
 * signal than the backend exposes (monthly hours, artists/month, a daily
 * sparkline, annual totals) we derive a STABLE, deterministic value from the
 * data we do have — it moves with your history, never random.
 */

export interface EraTheme {
  key: string;
  label: string; // "Nocturna"
  icon: LucideIcon;
  color: string; // primary accent
  glow: string; // rgba glow
  /** Narrative fallback when the backend summary is empty. */
  line: (artist: string | null) => string;
}

const THEMES: Record<string, EraTheme> = {
  night: {
    key: 'night',
    label: 'Nocturna',
    icon: Moon,
    color: '#7c5cff',
    glow: 'rgba(124,92,255,0.25)',
    line: (a) => `Las noches fueron de ${a ?? 'tus favoritos'}. Sonidos profundos que te acompañaron hasta tarde.`,
  },
  morning: {
    key: 'morning',
    label: 'Matutina',
    icon: Sunrise,
    color: '#38bdf8',
    glow: 'rgba(56,189,248,0.22)',
    line: (a) => `Tus mañanas tuvieron un compañero: ${a ?? 'la música'}. Un mes corto pero intenso.`,
  },
  explorer: {
    key: 'explorer',
    label: 'Exploradora',
    icon: Compass,
    color: '#1db954',
    glow: 'rgba(29,185,84,0.22)',
    line: (a) => `Te sumergiste en mundos nuevos. ${a ?? 'Sonidos frescos'} fue el sonido principal de esta era.`,
  },
  loop: {
    key: 'loop',
    label: 'Obsesiva',
    icon: Repeat,
    color: '#ef4444',
    glow: 'rgba(239,68,68,0.22)',
    line: (a) => `Encontraste tu sonido y no lo soltaste. ${a ?? 'Una canción'} sonó una y otra vez.`,
  },
  intense: {
    key: 'intense',
    label: 'Maratonista',
    icon: Flame,
    color: '#f59e0b',
    glow: 'rgba(245,158,11,0.22)',
    line: (a) => `Un mes sin pausa. ${a ?? 'La música'} te acompañó durante horas y horas.`,
  },
  steady: {
    key: 'steady',
    label: 'Fiel',
    icon: Crown,
    color: '#34d399',
    glow: 'rgba(52,211,153,0.2)',
    line: (a) => `Constancia pura. ${a ?? 'Tus artistas'} se mantuvieron a tu lado todo el mes.`,
  },
  nostalgic: {
    key: 'nostalgic',
    label: 'Nostálgica',
    icon: History,
    color: '#ff5d8f',
    glow: 'rgba(255,93,143,0.22)',
    line: (a) => `Volviste a tu pasado musical. ${a ?? 'Viejos amores'} marcaron esta etapa.`,
  },
  dominada: {
    key: 'dominada',
    label: 'Dominada',
    icon: Gem,
    color: '#fbbf24',
    glow: 'rgba(251,191,36,0.22)',
    line: (a) => `${a ?? 'Un artista'} se adueñó del mes. Pocos discutieron su trono.`,
  },
  regreso: {
    key: 'regreso',
    label: 'De regreso',
    icon: RotateCcw,
    color: '#22d3ee',
    glow: 'rgba(34,211,238,0.22)',
    line: (a) => `${a ?? 'Un viejo favorito'} volvió a tu rotación tras un buen tiempo fuera.`,
  },
  construccion: {
    key: 'construccion',
    label: 'En construcción',
    icon: Hourglass,
    color: '#8b8f9c',
    glow: 'rgba(139,143,156,0.18)',
    line: () => 'Mes con pocos datos todavía. Se irá completando.',
  },
};

const FALLBACK = THEMES.steady;

/** Resolve an era's theme: vibe key (genres[0]) → mood → peak hour → fallback. */
export function eraTheme(era: Era): EraTheme {
  const vibe = era.dominantGenres?.[0];
  if (vibe && THEMES[vibe]) return THEMES[vibe];
  const mood = era.dominantMood?.toLowerCase();
  if (mood && THEMES[mood]) return THEMES[mood];
  if (mood?.includes('nost')) return THEMES.nostalgic;
  if (era.peakHour != null) {
    if (era.peakHour >= 21 || era.peakHour < 5) return THEMES.night;
    if (era.peakHour < 11) return THEMES.morning;
  }
  return FALLBACK;
}

export function eraArtist(era: Era): string | null {
  return era.dominantArtists?.[0] ?? null;
}

/** Top artists of the month (up to 5), for the era card. */
export function eraTopArtists(era: Era, n = 5): string[] {
  return (era.dominantArtists ?? []).filter(Boolean).slice(0, n);
}

export interface BadgeMeta {
  label: string;
  color: string;
}
const BADGE_META: Record<string, BadgeMeta> = {
  dominada: { label: 'Dominada', color: '#fbbf24' },
  deRegreso: { label: 'De regreso', color: '#22d3ee' },
  obsesiva: { label: 'Obsesiva', color: '#ef4444' },
  nostalgica: { label: 'Nostálgica', color: '#ff5d8f' },
  exploradora: { label: 'Exploradora', color: '#1db954' },
  maratonista: { label: 'Maratonista', color: '#f59e0b' },
  nocturna: { label: 'Nocturna', color: '#7c5cff' },
  mananera: { label: 'Mañanera', color: '#38bdf8' },
  mixta: { label: 'Mixta', color: '#34d399' },
};

/** Facet badges for an era (deduped, known keys only). */
export function eraBadges(era: Era): Array<{ key: string } & BadgeMeta> {
  return (era.badges ?? [])
    .filter((k) => BADGE_META[k])
    .map((k) => ({ key: k, ...BADGE_META[k] }));
}

/** Genres after the vibe key (which lives at index 0). */
export function eraGenres(era: Era): string[] {
  const all = era.dominantGenres ?? [];
  const rest = all.slice(1).filter(Boolean);
  return rest.length ? rest : all.filter((g) => !THEMES[g]);
}

export function eraDays(era: Era): number {
  const start = new Date(era.startDate).getTime();
  const end = era.endDate ? new Date(era.endDate).getTime() : Date.now();
  return Math.max(1, Math.round((end - start) / 86_400_000));
}

/** Derived listening hours for the era (stable: days × confidence-scaled daily avg). */
export function eraHours(era: Era): number {
  const dailyH = 1.4 + (era.confidence ?? 0.5) * 2.6; // ~1.4–4h/day
  return Math.round(eraDays(era) * dailyH);
}

/** Derived "artists this month" — more when exploratory (low consistency). */
export function eraArtistsPerMonth(era: Era): number {
  const base = 240 + (1 - (era.confidence ?? 0.5)) * 380;
  return Math.round(base / 10) * 10;
}

/** Consistency 0..100 (real). */
export function eraConsistency(era: Era): number {
  return Math.round((era.confidence ?? 0) * 100);
}

/** Month label, e.g. "JULIO 2024". */
export function eraMonthLabel(era: Era): string {
  return new Date(era.startDate)
    .toLocaleDateString('es', { month: 'long', year: 'numeric' })
    .toUpperCase();
}

export function eraShortMonth(era: Era): string {
  return new Date(era.startDate).toLocaleDateString('es', { month: 'short' }).replace('.', '');
}

export function eraYear(era: Era): number {
  return new Date(era.startDate).getFullYear();
}

export function eraMonthIndex(era: Era): number {
  return new Date(era.startDate).getMonth();
}

/**
 * Deterministic per-day intensity for an era's mini chart (heights 0..1).
 * Seeded by peakHour + duration so it's stable across renders, with a gentle
 * bell shape so it reads like a real month's ebb and flow.
 */
export function eraSpark(era: Era, bars = 24): number[] {
  const out: number[] = [];
  let s = (Math.abs((era.peakHour ?? 12) + 1) * 7919 + eraDays(era) * 104729) % 233280;
  for (let i = 0; i < bars; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = 0.4 + (s / 233280) * 0.6;
    const bell = Math.sin((i / (bars - 1)) * Math.PI); // peak mid-month
    out.push(Math.min(1, noise * (0.55 + bell * 0.55)));
  }
  return out;
}

export interface AnnualSummary {
  count: number;
  hours: number;
  artists: number;
  consistency: number;
}

export function annualSummary(eras: Era[]): AnnualSummary {
  if (eras.length === 0) return { count: 0, hours: 0, artists: 0, consistency: 0 };
  const artists = new Set<string>();
  let hours = 0;
  let conf = 0;
  for (const e of eras) {
    hours += eraHours(e);
    conf += e.confidence ?? 0;
    (e.dominantArtists ?? []).forEach((a) => artists.add(a));
  }
  return {
    count: eras.length,
    hours,
    artists: artists.size,
    consistency: Math.round((conf / eras.length) * 100),
  };
}

/** Distinct years present in the data, newest first. */
export function availableYears(eras: Era[]): number[] {
  return [...new Set(eras.map(eraYear))].sort((a, b) => b - a);
}
