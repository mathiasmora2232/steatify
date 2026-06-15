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
  color,
  delay = 0,
}: {
  icon?: LucideIcon;
  label: string;
  value?: string;
  numericValue?: number;
  sub?: string;
  delta?: number | null;
  accent?: boolean;
  /** Brand color for the icon chip + subtle wash (green=música, morado=gaming…). */
  color?: string;
  delay?: number;
}) {
  const up = (delta ?? 0) >= 0;
  const c = color ?? (accent ? 'var(--color-accent)' : '#8b8f9c');
  const valueColored = !!color || accent;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className="relative overflow-hidden rounded-2xl border p-5 transition-colors hover:border-[color:var(--color-accent)]/40"
      style={{ background: `radial-gradient(280px 120px at 0% 0%, ${c}14, transparent), var(--color-surface)` }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">
          {IconCmp && (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: `${c}1f`, color: c }}>
              <IconCmp className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
            </span>
          )}
          {label}
        </span>
        {delta != null && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={up ? { background: `${c}26`, color: c } : { background: 'rgb(244 63 94 / 0.15)', color: 'var(--color-rose)' }}
          >
            {up ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <p className="truncate text-2xl font-bold" style={{ color: valueColored ? c : '#fff' }}>
        {numericValue != null ? <CountUp value={numericValue} /> : (value ?? '—')}
      </p>
      {sub && <p className="mt-1 line-clamp-2 text-sm leading-snug text-[var(--color-muted)]">{sub}</p>}
    </motion.div>
  );
}
