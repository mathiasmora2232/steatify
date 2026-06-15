'use client';

import { motion } from 'framer-motion';
import type { TopItem } from '@/lib/api';

export function TopList({
  title,
  items,
  unit = 'plays',
  loading,
}: {
  title: string;
  items: TopItem[];
  unit?: 'plays' | 'minutes';
  loading?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-muted)]">{title}</h3>

      {loading ? (
        <ul className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          ))}
        </ul>
      ) : items.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-muted)]">
          Sin datos todavía — sincroniza y vuelve.
        </p>
      ) : (
        <ul className="space-y-1">
          {items.map((it, i) => (
            <motion.li
              key={it.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.03 }}
              className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-surface-2)]/60"
            >
              <span className="w-5 shrink-0 text-sm tabular-nums text-[var(--color-muted)]">
                {i + 1}
              </span>
              {it.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-md bg-[var(--color-surface-2)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{it.name}</p>
                {it.subtitle && (
                  <p className="truncate text-xs text-[var(--color-muted)]">{it.subtitle}</p>
                )}
              </div>
              <span className="shrink-0 text-sm tabular-nums text-[var(--color-accent)]">
                {unit === 'minutes' ? `${it.minutes} min` : `${it.plays}×`}
              </span>
            </motion.li>
          ))}
        </ul>
      )}
    </div>
  );
}
