/**
 * App accent themes. Stored per-device in localStorage and applied to the
 * --color-accent / --color-accent-2 CSS variables. The no-FOUC inline script in
 * the root layout mirrors this list (keep them in sync).
 */
export type ThemeKey = 'sonora' | 'cyber' | 'steam' | 'midnight' | 'rose' | 'sunset' | 'aqua';

export interface Theme {
  key: ThemeKey;
  name: string;
  accent: string;
  accent2: string;
}

export const THEMES: Theme[] = [
  { key: 'sonora', name: 'Sonora', accent: '#1db954', accent2: '#7c5cff' },
  { key: 'cyber', name: 'Cyberpunk', accent: '#ff2bd6', accent2: '#00e5ff' },
  { key: 'steam', name: 'Steam', accent: '#66c0f4', accent2: '#1b9e8f' },
  { key: 'midnight', name: 'Midnight', accent: '#a855f7', accent2: '#6366f1' },
  { key: 'rose', name: 'Rosé', accent: '#ff5d8f', accent2: '#ff9472' },
  { key: 'sunset', name: 'Sunset', accent: '#ff8a00', accent2: '#ff2e63' },
  { key: 'aqua', name: 'Aqua', accent: '#2dd4bf', accent2: '#38bdf8' },
];

export const THEME_KEY = 'sonora-theme';

export function applyTheme(key: ThemeKey): void {
  if (typeof document === 'undefined') return;
  const t = THEMES.find((x) => x.key === key) ?? THEMES[0];
  const root = document.documentElement;
  root.style.setProperty('--color-accent', t.accent);
  root.style.setProperty('--color-accent-2', t.accent2);
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
