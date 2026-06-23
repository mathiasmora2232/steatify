/**
 * App appearance themes. Each theme drives the two accent colors AND the
 * ambient background glow, so switching themes visibly shifts the whole app's
 * mood — not just buttons. Stored per-device in localStorage; the no-FOUC
 * inline script in the root layout mirrors this list (keep them in sync).
 */
export type ThemeKey = 'sonora' | 'cyber' | 'steam' | 'midnight' | 'rose' | 'sunset' | 'aqua' | 'mono';

export interface Theme {
  key: ThemeKey;
  name: string;
  desc: string;
  accent: string;
  accent2: string;
  glow1: string;
  glow2: string;
}

export const THEMES: Theme[] = [
  { key: 'sonora', name: 'Sonora', desc: 'El original', accent: '#1db954', accent2: '#7c5cff', glow1: 'rgba(124,92,255,0.12)', glow2: 'rgba(29,185,84,0.10)' },
  { key: 'cyber', name: 'Cyberpunk', desc: 'Neón eléctrico', accent: '#ff2bd6', accent2: '#00e5ff', glow1: 'rgba(255,43,214,0.16)', glow2: 'rgba(0,229,255,0.13)' },
  { key: 'steam', name: 'Steam', desc: 'Azul gamer', accent: '#66c0f4', accent2: '#22d3a6', glow1: 'rgba(102,192,244,0.15)', glow2: 'rgba(34,211,166,0.10)' },
  { key: 'midnight', name: 'Midnight', desc: 'Morado profundo', accent: '#a855f7', accent2: '#6366f1', glow1: 'rgba(168,85,247,0.18)', glow2: 'rgba(99,102,241,0.12)' },
  { key: 'rose', name: 'Rosé', desc: 'Cálido y suave', accent: '#ff5d8f', accent2: '#ff9472', glow1: 'rgba(255,93,143,0.16)', glow2: 'rgba(255,148,114,0.11)' },
  { key: 'sunset', name: 'Sunset', desc: 'Atardecer', accent: '#ff8a00', accent2: '#ff2e63', glow1: 'rgba(255,138,0,0.15)', glow2: 'rgba(255,46,99,0.12)' },
  { key: 'aqua', name: 'Aqua', desc: 'Fresco', accent: '#2dd4bf', accent2: '#38bdf8', glow1: 'rgba(45,212,191,0.15)', glow2: 'rgba(56,189,248,0.12)' },
  { key: 'mono', name: 'Mono', desc: 'Minimalista', accent: '#e5e7eb', accent2: '#9ca3af', glow1: 'rgba(255,255,255,0.06)', glow2: 'rgba(148,163,184,0.05)' },
];

export const THEME_KEY = 'sonora-theme';

export function applyTheme(key: ThemeKey): void {
  if (typeof document === 'undefined') return;
  const t = THEMES.find((x) => x.key === key) ?? THEMES[0];
  const r = document.documentElement.style;
  r.setProperty('--color-accent', t.accent);
  r.setProperty('--color-accent-2', t.accent2);
  r.setProperty('--glow-1', t.glow1);
  r.setProperty('--glow-2', t.glow2);
}

export function getSavedTheme(): ThemeKey {
  if (typeof localStorage === 'undefined') return 'sonora';
  const v = localStorage.getItem(THEME_KEY) as ThemeKey | null;
  return THEMES.some((t) => t.key === v) ? (v as ThemeKey) : 'sonora';
}

export function saveTheme(key: ThemeKey): void {
  try {
    localStorage.setItem(THEME_KEY, key);
  } catch {
    /* storage unavailable */
  }
  applyTheme(key);
}
