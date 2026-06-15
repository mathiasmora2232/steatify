'use client';

import { motion } from 'framer-motion';
import { Headphones, Gamepad2 } from 'lucide-react';
import { CountUp } from './CountUp';

/** Music + gaming fusion — "Tu universo". The crossover that's Sonora's edge. */
export function UniverseCard({
  musicMinutes,
  gamingHours,
  label,
  games,
  played,
  unplayed,
}: {
  musicMinutes: number;
  gamingHours: number;
  label: string | null;
  games?: number;
  played?: number;
  unplayed?: number;
}) {
  const explored = games && played != null ? Math.round((played / games) * 100) : null;
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

      {/* Gaming en contexto: explorados vs por descubrir */}
      {games != null && games > 0 && (
        <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[var(--color-muted)]">
              <Gamepad2 className="h-3.5 w-3.5" /> <span className="font-bold text-white">{games}</span> juegos en tu biblioteca
            </span>
            {explored != null && <span className="font-semibold text-[var(--color-accent-2)]">{explored}% explorados</span>}
          </div>
          {explored != null && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent-2)] to-[#38bdf8]" style={{ width: `${explored}%` }} />
            </div>
          )}
          {unplayed != null && (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              <span className="font-semibold text-white">{unplayed}</span> esperando ser descubiertos
            </p>
          )}
        </div>
      )}

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
