import type { MusicDna, Wrapped } from './api';

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface DnaBar {
  key: string;
  label: string;
  pct: number;
  color: string;
}

/** Four headline DNA traits derived from real patterns (no extra backend). */
export function dnaBars(dna: MusicDna | undefined, gamingHours: number): DnaBar[] {
  const p = dna?.patterns;
  const musicHours = (dna?.totals.minutes ?? 0) / 60;
  const variety = dna?.totals.plays
    ? (dna.totals.uniqueArtists / dna.totals.plays) * 125
    : 0;

  // Icons for each bar are mapped by consumers via dnaBarIcon[bar.key].
  const bars: DnaBar[] = [
    { key: 'night', label: 'Night Owl', color: '#7c5cff', pct: clamp(p?.nightPct ?? 0) },
    { key: 'loop', label: 'Loop Listener', color: '#1db954', pct: clamp((p?.repeatMultiplier ?? 0) * 55) },
    {
      key: 'gamer',
      label: 'Gamer',
      color: '#38bdf8',
      pct: gamingHours > 0 ? clamp((gamingHours / (gamingHours + musicHours + 1)) * 100) : 0,
    },
    { key: 'explorer', label: 'Explorer', color: '#ff5d8f', pct: clamp(variety) },
  ];
  return bars.sort((a, b) => b.pct - a.pct);
}

/** A composed "personality type" headline, e.g. "Creative Night Gamer". */
export function personalityType(bars: DnaBar[]): { title: string; tags: string[] } {
  const by = Object.fromEntries(bars.map((b) => [b.key, b.pct]));
  const words: string[] = [];
  if ((by.explorer ?? 0) >= 45) words.push('Creative');
  if ((by.night ?? 0) >= 45) words.push('Night');
  words.push((by.gamer ?? 0) >= 45 ? 'Gamer' : (by.loop ?? 0) >= 60 ? 'Looper' : 'Listener');

  const tags: string[] = [];
  if ((by.night ?? 0) >= 50) tags.push('Nocturno');
  if ((by.loop ?? 0) >= 50) tags.push('Constante');
  if ((by.explorer ?? 0) >= 45) tags.push('Explorador');
  if ((by.gamer ?? 0) >= 45) tags.push('Gamer');
  if (tags.length === 0) tags.push('En construcción');

  return { title: words.join(' ').toUpperCase(), tags };
}

export interface Attribute {
  axis: string;
  value: number;
}

/** Radar attributes for the Steatify Passport. */
export function passportAttributes(dna: MusicDna | undefined): Attribute[] {
  const p = dna?.patterns;
  const t = dna?.totals;
  const diversity = t?.plays ? (t.uniqueArtists / t.plays) * 130 : 0;
  return [
    { axis: 'Energía', value: clamp((p?.playsPerActiveDay ?? 0) * 1.8) },
    { axis: 'Constancia', value: clamp(p?.loyaltyPct ?? 0) },
    { axis: 'Creatividad', value: clamp(100 - (p?.loyaltyPct ?? 0)) },
    { axis: 'Diversidad', value: clamp(diversity) },
    { axis: 'Nocturnidad', value: clamp(p?.nightPct ?? 0) },
  ];
}

/** Pick a "comeback" artist from trends (rising again), if any. */
export function comebackArtist(
  stocks: { name: string; recent: number; prior: number; direction: string }[] | undefined,
): { name: string; note: string } | null {
  if (!stocks) return null;
  const back = stocks.find((s) => s.prior > 0 && s.recent > s.prior);
  if (back) return { name: back.name, note: 'Volviste a escucharlo' };
  const fresh = stocks.find((s) => s.direction === 'new');
  return fresh ? { name: fresh.name, note: 'Nuevo en tu rotación' } : null;
}

export function passportClass(bars: DnaBar[]): { name: string; specialties: string[]; phrase: string } {
  const top = bars[0];
  const map: Record<string, { name: string; phrase: string }> = {
    night: { name: 'Maratonista Nocturno', phrase: 'Música para misiones imposibles.' },
    loop: { name: 'Guardián del Loop', phrase: 'Una canción, mil veces.' },
    gamer: { name: 'Maratonista Gamer', phrase: 'Música para misiones imposibles.' },
    explorer: { name: 'Explorador Sonoro', phrase: 'Nunca dos días iguales.' },
  };
  const cls = map[top?.key ?? 'explorer'] ?? map.explorer;
  const specialties = bars.slice(0, 3).map((b) => b.label);
  return { name: cls.name, specialties, phrase: cls.phrase };
}

export type WrappedData = Wrapped;
