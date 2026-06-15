'use client';

import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  Check,
  Gamepad2,
  BarChart3,
  Compass,
  Repeat,
  Crown,
  Flame,
  Moon,
  Snowflake,
  Disc3,
  Gem,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { api, type Achievement } from '@/lib/api';
import { Icon, I } from '@/lib/icons';

const CATEGORY: Record<string, { label: string; icon: LucideIcon; order: number }> = {
  VOLUME: { label: 'Volumen', icon: BarChart3, order: 1 },
  EXPLORATION: { label: 'Exploración', icon: Compass, order: 2 },
  OBSESSION: { label: 'Obsesión', icon: Repeat, order: 3 },
  LOYALTY: { label: 'Lealtad', icon: Crown, order: 4 },
  COLLECTION: { label: 'Colección', icon: Disc3, order: 5 },
  STREAK: { label: 'Rachas', icon: Flame, order: 6 },
  TIME_OF_DAY: { label: 'Horarios', icon: Moon, order: 7 },
  GAMING: { label: 'Gaming', icon: Gamepad2, order: 8 },
  RARITY: { label: 'Rarezas', icon: Gem, order: 9 },
  SEASONAL: { label: 'Temporada', icon: Snowflake, order: 10 },
  SECRET: { label: 'Secretos', icon: Lock, order: 11 },
};

export default function AchievementsPage() {
  const { data, isLoading } = useSWR('achievements', api.achievements);
  const items = data ?? [];
  const unlocked = items.filter((a) => a.unlocked).length;
  const points = items.filter((a) => a.unlocked).reduce((s, a) => s + a.points, 0);

  // Secret achievements live in their own "Secretos" group, regardless of the
  // underlying category, so the catalog doesn't reveal how to get them.
  const groups = Object.entries(
    items.reduce<Record<string, Achievement[]>>((acc, a) => {
      const key = a.secret ? 'SECRET' : a.category;
      (acc[key] ??= []).push(a);
      return acc;
    }, {}),
  ).sort(([a], [b]) => (CATEGORY[a]?.order ?? 99) - (CATEGORY[b]?.order ?? 99));

  return (
    <div className="mx-auto max-w-4xl pb-10">
      <header className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-bold">Logros</h1>
        {!isLoading && (
          <span className="text-sm text-[var(--color-muted)]">
            {unlocked}/{items.length} desbloqueados · {points.toLocaleString()} pts
          </span>
        )}
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-[var(--radius-card)] border bg-[var(--color-surface)]" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map(([cat, list]) => {
            const meta = CATEGORY[cat] ?? { label: cat, icon: I.achievements };
            const got = list.filter((a) => a.unlocked).length;
            return (
              <section key={cat}>
                <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                  <meta.icon className="h-4 w-4" /> {meta.label}
                  <span className="ml-1 rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] tabular-nums">
                    {got}/{list.length}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {list.map((a, i) => (
                    <Badge key={a.code} a={a} delay={i * 0.03} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Badge({ a, delay }: { a: Achievement; delay: number }) {
  const pct = Math.round(a.progress * 100);
  const hidden = a.secret && !a.unlocked; // don't reveal how to get it
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className={`rounded-[var(--radius-card)] border p-5 transition ${
        a.unlocked ? 'border-[var(--color-accent)]/40 bg-[var(--color-surface)]' : 'bg-[var(--color-surface)] opacity-80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            a.unlocked ? 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]' : 'bg-[var(--color-surface-2)] text-[var(--color-muted)]'
          }`}
        >
          <Icon icon={a.unlocked ? I.achievements : I.locked} className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{hidden ? '???' : a.name}</h3>
            {a.unlocked && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent)]" aria-hidden />}
            {a.unlocked && <span className="ml-auto text-xs font-semibold text-[var(--color-accent)]">+{a.points}</span>}
          </div>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {hidden ? 'Logro secreto. Sigue jugando para descubrirlo.' : a.description}
          </p>

          {!a.unlocked && !hidden && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                {a.meta?.value != null && a.meta?.threshold != null
                  ? `${Math.floor(a.meta.value)} / ${a.meta.threshold}`
                  : `${pct}%`}
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
