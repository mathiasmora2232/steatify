'use client';

import { motion } from 'framer-motion';
import { CountUp } from './CountUp';
import type { LucideIcon } from '@/lib/icons';

/**
 * A metric with context — not a naked number. Optional delta badge ("+32%"),
 * a human sub-line, and an icon accent. Reusable across the home.
 */
export function SmartStat({
  icon: IconCmp,
  label,
  value,
  numericValue,
  sub,
  delta,
  accent,
  delay = 0,
}: {
  icon?: LucideIcon;
  label: string;
  value?: string;
  numericValue?: number;
  sub?: string;
  delta?: number | null;
  accent?: boolean;
  delay?: number;
}) {
  const up = (delta ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border bg-[var(--color-surface)] p-5 transition-colors hover:border-[var(--color-accent)]/40"
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-[var(--color-muted)]">
          {IconCmp && (
            <IconCmp
              className={`h-3.5 w-3.5 ${accent ? 'text-[var(--color-accent)]' : ''}`}
              strokeWidth={2.2}
              aria-hidden
            />
          )}
          {label}
        </span>
        {delta != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              up
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]'
                : 'bg-[var(--color-rose)]/15 text-[var(--color-rose)]'
            }`}
          >
            {up ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p
        className={`truncate text-2xl font-bold ${accent ? 'text-[var(--color-accent)]' : 'text-white'}`}
      >
        {numericValue != null ? <CountUp value={numericValue} /> : (value ?? '—')}
      </p>
      {sub && <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--color-muted)]">{sub}</p>}
    </motion.div>
  );
}
