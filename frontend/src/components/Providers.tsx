'use client';

import { SWRConfig } from 'swr';

/**
 * Global SWR config. Without this, every page refetched all its data on each
 * navigation and on every window focus — which made moving between screens feel
 * slow. Now data is cached and shared across navigations (instant on return),
 * deduped within a window, and we don't revalidate just because the tab
 * regained focus. `keepPreviousData` shows the last data while a new fetch runs
 * instead of flashing a spinner.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        dedupingInterval: 30_000,
        keepPreviousData: true,
        revalidateIfStale: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
