'use client';

import { motion } from 'framer-motion';

export function StatCard({
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-5"
    >
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p
        className={`mt-2 text-3xl font-semibold ${
          accent ? 'text-[var(--color-accent)]' : 'text-white'
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-sm text-[var(--color-muted)]">{sub}</p>}
    </motion.div>
  );
}
