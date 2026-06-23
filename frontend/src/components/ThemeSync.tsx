'use client';

import { useEffect } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import { THEMES, saveTheme, type ThemeKey } from '@/lib/themes';

/**
 * Applies the account-saved appearance theme across every dashboard page (and
 * on a fresh device where localStorage is empty). The no-FOUC script handles
 * same-device instant paint; this keeps devices in sync from the account.
 */
export function ThemeSync() {
  const { data } = useSWR('me', api.me);
  useEffect(() => {
    const t = data?.theme;
    if (t && THEMES.some((x) => x.key === t)) saveTheme(t as ThemeKey);
  }, [data?.theme]);
  return null;
}
