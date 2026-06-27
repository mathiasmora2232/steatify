export type PlanKey = 'FREE' | 'PLUS' | 'PRO';
export type RoleKey = 'USER' | 'ADMIN' | 'SUPER_ADMIN';

export interface Entitlements {
  plan: PlanKey;
  canImport: boolean; // import historical Spotify data
  maxVitrinas: number; // showcase items on the profile
  historyDays: number | null; // null = unlimited lifetime
  steamEconomy: boolean; // library value / price-per-hour
  premiumThemes: boolean; // unlockable/premium appearance themes
  maxCompares: number | null; // social compares per month (null = unlimited)
}

/** Single source of truth for what each plan unlocks. Admins always get PRO. */
export function entitlements(plan: PlanKey, role: RoleKey): Entitlements {
  const admin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const tier: PlanKey = admin ? 'PRO' : plan;
  switch (tier) {
    case 'PRO':
      return { plan, canImport: true, maxVitrinas: 99, historyDays: null, steamEconomy: true, premiumThemes: true, maxCompares: null };
    case 'PLUS':
      return { plan, canImport: true, maxVitrinas: 5, historyDays: null, steamEconomy: true, premiumThemes: true, maxCompares: null };
    default:
      return { plan, canImport: false, maxVitrinas: 1, historyDays: 30, steamEconomy: false, premiumThemes: false, maxCompares: 3 };
  }
}
