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
    <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-3.5 sm:rounded-3xl sm:p-6">
      <div className="mb-2 flex items-center justify-between sm:mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)] sm:text-xs">
          Steatify DNA
        </p>
        <span className="rounded-full bg-[var(--color-accent-2)]/15 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent-2)] sm:px-3 sm:py-1 sm:text-xs">
          {level.rarity}
        </span>
      </div>

      {/* Archetype bars */}
      <div className="space-y-1.5 sm:space-y-3">
        {archetypes.length > 0 ? (
          archetypes.map((a, i) => {
            const ArchIcon = archetypeIcon[a.key];
            return (
            <div key={a.key}>
              <div className="mb-0.5 flex items-center justify-between text-xs sm:mb-1 sm:text-sm">
                <span className="flex items-center gap-1 text-[var(--color-text)] sm:gap-1.5">
                  {ArchIcon && <ArchIcon className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden />}
                  {a.label}
                </span>
                <span className="font-semibold tabular-nums" style={{ color: BAR[i % BAR.length] }}>
                  {a.pct}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5 sm:h-2">
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
          <p className="text-xs text-[var(--color-muted)] sm:text-sm">
            Tu ADN se revela cuando tengas más historial.
          </p>
        )}
      </div>

      {personality && (
        <p className="mt-2 line-clamp-1 text-xs italic text-[var(--color-muted)] sm:mt-4 sm:line-clamp-none sm:text-sm">“{personality}”</p>
      )}

      {/* Level + XP */}
      <div className="mt-2.5 border-t border-[var(--color-border)] pt-2.5 sm:mt-5 sm:pt-4">
        <div className="mb-1 flex items-end justify-between">
          <span className="text-xs text-[var(--color-muted)] sm:text-sm">Steatify</span>
          <span className="text-sm font-bold sm:text-lg">
            Lv. <span className="text-[var(--color-accent)]">{level.level}</span>
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/5 sm:h-2.5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${level.progress * 100}%` }}
            transition={{ duration: 0.9 }}
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]"
          />
        </div>
        <p className="mt-1 text-right text-[10px] text-[var(--color-muted)] sm:text-xs">
          {level.xp.toLocaleString()} / {level.nextXp.toLocaleString()} XP
        </p>
      </div>
    </div>
  );
}
