import type { UserProfile } from '@/lib/api';

export interface Entitlements {
  plan: 'FREE' | 'PLUS' | 'PRO';
  canImport: boolean;
  maxVitrinas: number;
  historyDays: number | null;
  steamEconomy: boolean;
  premiumThemes: boolean;
  maxCompares: number | null;
}

/** Mirror of the backend entitlements. Admins always get PRO-level access. */
export function entitlements(user?: Pick<UserProfile, 'plan' | 'role'> | null): Entitlements {
  const plan = (user?.plan ?? 'FREE') as Entitlements['plan'];
  const admin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
  const tier = admin ? 'PRO' : plan;
  switch (tier) {
    case 'PRO':
      return { plan, canImport: true, maxVitrinas: 99, historyDays: null, steamEconomy: true, premiumThemes: true, maxCompares: null };
    case 'PLUS':
      return { plan, canImport: true, maxVitrinas: 5, historyDays: null, steamEconomy: true, premiumThemes: true, maxCompares: null };
    default:
      return { plan, canImport: false, maxVitrinas: 1, historyDays: 30, steamEconomy: false, premiumThemes: false, maxCompares: 3 };
  }
}
