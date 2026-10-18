/**
 * Steatify Level — derived purely from real activity (plays, minutes, gaming
 * hours). No backend/state needed; it's a deterministic function of the data
 * the user already has. XP curve is quadratic so early levels come fast and
 * later ones feel earned.
 *
 * Tuning: the curve is STRETCHED (K=40) and capped at 100 so that even a
 * power user with years of imported history (~200k XP ≈ level 70) keeps real
 * headroom — level 100 needs ~400k XP. Rarity has six tiers so the back half
 * of the ladder isn't a flat "Legendary forever".
 */
export interface SteatifyLevel {
  level: number;
  xp: number; // xp within the current level
  nextXp: number; // xp needed to finish the current level
  progress: number; // 0..1
  rarity: string;
}

const K = 40; // XP-per-level scale; bigger = slower climb
const MAX_LEVEL = 100;

function rarityFor(level: number): string {
  if (level >= 100) return 'Divino';
  if (level >= 75) return 'Mítico';
  if (level >= 50) return 'Legendario';
  if (level >= 30) return 'Épico';
  if (level >= 15) return 'Raro';
  return 'Novato';
}

export function computeLevel(plays = 0, minutes = 0, steamHours = 0): SteatifyLevel {
  const totalXp = plays * 2 + Math.round(minutes / 5) + steamHours * 3;
  const level = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Math.sqrt(totalXp / K))));
  const base = level * level * K;
  const next = (level + 1) * (level + 1) * K;
  const xp = Math.max(0, totalXp - base);
  const nextXp = next - base;
  return {
    level,
    xp,
    nextXp,
    progress: level >= MAX_LEVEL ? 1 : nextXp > 0 ? Math.min(1, xp / nextXp) : 0,
    rarity: rarityFor(level),
  };
}
