import type { MusicDna } from './api';

/**
 * Pure derivations for the "ADN Musical" experience. Everything here is computed
 * from the real `MusicDna` payload (archetypes + patterns + totals) — NO backend
 * changes. Where the design calls for a richer signal than the backend exposes
 * (RPG attributes, personality sub-scores, social percentile) we derive a stable,
 * defensible value from the data we DO have. Numbers are illustrative-but-honest:
 * they move with your real listening, not random.
 */

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export interface ArchetypeMeta {
  color: string;
  /** One-liner for the composition card. */
  short: string;
  /** Poetic paragraph for the hero. */
  long: string;
  /** Personality headline when this is your #1. */
  title: string;
}

export const ARCHETYPE_META: Record<string, ArchetypeMeta> = {
  obsessive: {
    color: '#1db954',
    short: 'Te enfocas intensamente en pocos artistas y canciones.',
    long: 'Te sumerges profundo en lo que te gusta. Repites, exploras y dominas tus favoritos hasta el límite. La obsesión es tu superpoder.',
    title: 'El cazador de emociones',
  },
  marathoner: {
    color: '#7c5cff',
    short: 'Escuchas mucho y por largos períodos de tiempo.',
    long: 'La música te acompaña sin pausa. Tus sesiones son largas y constantes: una banda sonora que nunca se apaga.',
    title: 'El maratonista sonoro',
  },
  nostalgic: {
    color: '#ff5d8f',
    short: 'Vuelves a tu pasado musical con frecuencia.',
    long: 'Cada canción es una etapa. Vuelves a tu pasado musical una y otra vez, coleccionando recuerdos en forma de sonido.',
    title: 'El viajero del tiempo',
  },
  explorer: {
    color: '#38bdf8',
    short: 'Descubres artistas nuevos sin parar.',
    long: 'Nunca dos días iguales. Siempre hay un sonido nuevo esperándote a la vuelta de la esquina.',
    title: 'El explorador incansable',
  },
  loyal: {
    color: '#f59e0b',
    short: 'Mantienes los mismos favoritos a lo largo del tiempo.',
    long: 'Encuentras a tus artistas y te quedas. La constancia es tu sello: pocos amores, pero eternos.',
    title: 'El corazón fiel',
  },
  nocturnal: {
    color: '#a78bfa',
    short: 'La madrugada es tu horario estrella.',
    long: 'Tu música cobra vida cuando cae la noche. Mientras el mundo duerme, tú subes el volumen.',
    title: 'El alma nocturna',
  },
  chaotic: {
    color: '#22d3ee',
    short: 'Saltas de un sonido a otro sin un patrón fijo.',
    long: 'Impredecible por naturaleza. Tu rotación cambia sin avisar: hoy una cosa, mañana otra. El orden no es lo tuyo, y así te gusta.',
    title: 'El espíritu impredecible',
  },
  collector: {
    color: '#c19a6b',
    short: 'Te metes a fondo en los álbumes, no solo en los singles.',
    long: 'No te quedas en el hit: recorres el álbum entero. Coleccionas obras completas, no canciones sueltas.',
    title: 'El coleccionista de álbumes',
  },
};

export function archetypeMeta(key: string): ArchetypeMeta {
  return ARCHETYPE_META[key] ?? ARCHETYPE_META.obsessive;
}

/** Personality headline ("El cazador de emociones") + a two-word type. */
export function personalityHeadline(dna: MusicDna): { title: string; type: string } {
  const a0 = dna.archetypes[0];
  const a1 = dna.archetypes[1];
  return {
    title: a0 ? archetypeMeta(a0.key).title : 'Tu ADN musical',
    type: [a0?.label, a1?.label].filter(Boolean).join(' '),
  };
}

export interface Subscore {
  key: string;
  label: string;
  value: number;
  tier: string;
  color: string;
}

function tierOf(v: number): string {
  if (v >= 80) return 'Muy alta';
  if (v >= 65) return 'Alta';
  if (v >= 45) return 'Media';
  return 'Baja';
}

/** Three personality sub-scores shown under the headline. */
export function personalityStats(dna: MusicDna): Subscore[] {
  const p = dna.patterns;
  const t = dna.totals;
  const emotional = clamp(40 + p.loyaltyPct * 1.1 + (p.repeatMultiplier - 1) * 14);
  const discovery = clamp(p.newArtists30d * 0.55 + 20);
  const openness = clamp(Math.sqrt(t.uniqueArtists) * 0.95 + 5);
  return [
    { key: 'emotional', label: 'Conexión emocional', value: emotional, tier: tierOf(emotional), color: '#ff5d8f' },
    { key: 'discovery', label: 'Descubrimiento', value: discovery, tier: tierOf(discovery), color: '#38bdf8' },
    { key: 'openness', label: 'Apertura de géneros', value: openness, tier: tierOf(openness), color: '#f59e0b' },
  ];
}

export interface Attribute {
  axis: string;
  value: number;
}

/** Five RPG attributes for the radar + bars. */
export function rpgAttributes(dna: MusicDna): Attribute[] {
  const p = dna.patterns;
  const t = dna.totals;
  return [
    { axis: 'Intensidad', value: clamp(p.playsPerActiveDay * 1.3) },
    { axis: 'Lealtad', value: clamp(40 + p.loyaltyPct * 1.4 + (p.repeatMultiplier - 1) * 10) },
    { axis: 'Exploración', value: clamp(p.newArtists30d * 0.5 + 10) },
    { axis: 'Variedad', value: clamp(Math.sqrt(t.uniqueArtists) * 1.0) },
    { axis: 'Profundidad', value: clamp(35 + (p.avgTrackAgeYears ?? 0) * 6 + p.repeatMultiplier * 7) },
  ];
}

/** "Más obsesivo que el N%" — deterministic from your dominant archetype. */
export function socialPercentile(dna: MusicDna): { trait: string; betterThan: number; topPct: number } {
  const a0 = dna.archetypes[0];
  const betterThan = clamp(58 + (a0?.pct ?? 0) * 0.7);
  return {
    trait: (a0?.label ?? 'intenso').toLowerCase(),
    betterThan,
    topPct: Math.max(1, 100 - betterThan),
  };
}

/**
 * Deterministic mini-sparkline heights (0..1) for a pattern card. Seeded by the
 * numeric value so each card is stable across renders (no Math.random, which is
 * also forbidden in some runtimes). Decorative — conveys "trend", not real data.
 */
export function sparkline(seed: number, bars = 16): number[] {
  const out: number[] = [];
  let s = Math.abs(Math.round(seed)) * 9301 + 49297;
  for (let i = 0; i < bars; i++) {
    s = (s * 9301 + 49297) % 233280;
    const base = 0.35 + (s / 233280) * 0.65;
    // gentle upward drift so it reads as growth
    out.push(Math.min(1, base * (0.7 + (i / bars) * 0.5)));
  }
  return out;
}
