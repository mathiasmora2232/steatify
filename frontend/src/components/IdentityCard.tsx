'use client';

import { motion } from 'framer-motion';
import type { DnaArchetype } from '@/lib/api';
import type { SteatifyLevel } from '@/lib/level';
import { archetypeIcon } from '@/lib/icons';

const BAR = ['#1db954', '#7c5cff', '#ff5d8f'];

export function IdentityCard({
  archetypes,
  personality,
  level,
}: {
  archetypes: DnaArchetype[];
  personality: string | null;
  level: SteatifyLevel;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          Steatify DNA
        </p>
        <span className="rounded-full bg-[var(--color-accent-2)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent-2)]">
          {level.rarity}
        </span>
      </div>

      {/* Archetype bars */}
      <div className="space-y-3">
        {archetypes.length > 0 ? (
          archetypes.map((a, i) => {
            const ArchIcon = archetypeIcon[a.key];
            return (
            <div key={a.key}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-[var(--color-text)]">
                  {ArchIcon && <ArchIcon className="h-4 w-4" aria-hidden />}
                  {a.label}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: BAR[i % BAR.length] }}>
                  {a.pct}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${a.pct}%` }}
                  transition={{ duration: 0.7, delay: i * 0.1 }}
                  className="h-full rounded-full"
                  style={{ background: BAR[i % BAR.length] }}
                />
              </div>
            </div>
            );
          })
        ) : (
          <p className="text-sm text-[var(--color-muted)]">
            Tu ADN se revela cuando tengas más historial.
          </p>
        )}
      </div>

      {personality && (
        <p className="mt-4 text-sm italic text-[var(--color-muted)]">“{personality}”</p>
      )}

      {/* Level + XP */}
      <div className="mt-5 border-t border-[var(--color-border)] pt-4">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-sm text-[var(--color-muted)]">Steatify</span>
          <span className="text-lg font-bold">
            Lv. <span className="text-[var(--color-accent)]">{level.level}</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${level.progress * 100}%` }}
            transition={{ duration: 0.9 }}
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]"
          />
        </div>
        <p className="mt-1 text-right text-xs text-[var(--color-muted)]">
          {level.xp.toLocaleString()} / {level.nextXp.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}
