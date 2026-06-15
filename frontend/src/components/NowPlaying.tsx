'use client';

import useSWR from 'swr';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

/** Live "Now Playing" strip. Polls every 15s; hides itself when nothing plays. */
export function NowPlaying() {
  const { data } = useSWR('now-playing', api.nowPlaying, { refreshInterval: 15_000 });

  if (!data?.playing || !data.name) return null;
  const pct =
    data.progressMs && data.durationMs ? Math.min(100, (data.progressMs / data.durationMs) * 100) : 0;

  return (
    <AnimatePresence>
      <motion.a
        href={data.trackUrl}
        target="_blank"
        rel="noreferrer"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 block overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-accent)]/30 bg-[var(--color-surface)]"
      >
        <div className="flex items-center gap-4 p-4">
          {data.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.imageUrl} alt="" className="h-14 w-14 rounded-md object-cover" />
          ) : (
            <div className="h-14 w-14 rounded-md bg-[var(--color-surface-2)]" />
          )}
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
              </span>
              <span className="text-xs uppercase tracking-wide text-[var(--color-accent)]">
                Sonando ahora
              </span>
            </div>
            <p className="truncate font-semibold text-white">{data.name}</p>
            <p className="truncate text-sm text-[var(--color-muted)]">{data.artist}</p>
          </div>
        </div>
        <div className="h-1 w-full bg-[var(--color-surface-2)]">
          <div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${pct}%` }} />
        </div>
      </motion.a>
    </AnimatePresence>
  );
}
