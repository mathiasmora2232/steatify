import { Mood } from '@prisma/client';

/**
 * Derive a mood from average audio features (valence = positividad musical,
 * energy = intensidad). Single source of truth, used by both /stats and the
 * daily aggregation so the dashboard and the contribution graph agree.
 */
export function moodFrom(valence: number | null, energy: number | null): Mood {
  if (valence == null || energy == null) return Mood.NEUTRAL;
  if (valence >= 0.6 && energy >= 0.6) return Mood.EUPHORIC;
  if (valence >= 0.6 && energy >= 0.4) return Mood.HAPPY;
  if (valence >= 0.5 && energy < 0.4) return Mood.CHILL;
  if (valence < 0.4 && energy >= 0.6) return Mood.INTENSE;
  if (valence < 0.4 && energy < 0.4) return Mood.MELANCHOLIC;
  if (energy >= 0.5) return Mood.FOCUSED;
  return Mood.NEUTRAL;
}

export const MOOD_LABEL: Record<Mood, string> = {
  EUPHORIC: 'Eufórico',
  HAPPY: 'Feliz',
  CHILL: 'Chill',
  FOCUSED: 'Concentrado',
  MELANCHOLIC: 'Melancólico',
  INTENSE: 'Intenso',
  NEUTRAL: 'Neutral',
};
