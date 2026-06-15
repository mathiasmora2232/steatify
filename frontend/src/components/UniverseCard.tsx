'use client';

import { motion } from 'framer-motion';
import { Headphones, Gamepad2 } from 'lucide-react';
import { CountUp } from './CountUp';

/** Music + gaming fusion — "Tu universo". The crossover that's Sonora's edge. */
export function UniverseCard({
  musicMinutes,
  gamingHours,
  label,
}: {
  musicMinutes: number;
  gamingHours: number;
  label: string | null;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border p-6"
      style={{
        background:
          'radial-gradient(600px 200px at 15% 0%, rgba(29,185,84,0.18), transparent), radial-gradient(600px 200px at 85% 100%, rgba(124,92,255,0.18), transparent), var(--color-surface)',
      }}
    >
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        Tu universo
      </p>
      <div className="flex items-center justify-around gap-4 text-center">
        <div>
          <p className="text-3xl font-bold text-[var(--color-accent)]">
            <CountUp value={musicMinutes} />
          </p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
            <Headphones className="h-4 w-4" aria-hidden />
            min de música
          </p>
        </div>
        <div className="h-12 w-px bg-[var(--color-border)]" />
        <div>
          <p className="text-3xl font-bold text-[var(--color-accent-2)]">
            <CountUp value={gamingHours} />
          </p>
          <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
            <Gamepad2 className="h-4 w-4" aria-hidden />
            horas gaming
          </p>
        </div>
      </div>
      {label && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-5 text-center text-sm text-[var(--color-muted)]"
        >
          Eres{' '}
          <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text font-semibold text-transparent">
            {label}
          </span>
        </motion.p>
      )}
    </div>
  );
}
