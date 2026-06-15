'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import type { TopItem } from '@/lib/api';

/** Spotify-style ranking: a featured #1 with a big cover, then a compact list. */
export function RankCard({
  title,
  items,
  unit = 'plays',
  loading,
  linkBase,
}: {
  title: string;
  items: TopItem[];
  unit?: 'plays' | 'min';
  loading?: boolean;
  /** When set, each item links to `${linkBase}/${item.id}` (e.g. song profiles). */
  linkBase?: string;
}) {
  const [first, ...rest] = items;
  const fmt = (it: TopItem) => (unit === 'min' ? `${it.minutes} min` : `${it.plays}×`);
  const Wrap = ({ id, className, children }: { id: string; className?: string; children: React.ReactNode }) =>
    linkBase ? (
      <Link href={`${linkBase}/${id}`} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        {title}
      </h3>

      {loading ? (
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-[var(--color-surface-2)]" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
          ))}
        </div>
      ) : !first ? (
        <p className="py-8 text-center text-sm text-[var(--color-muted)]">
          Sin datos todavía — sincroniza y vuelve.
        </p>
      ) : (
        <>
          {/* Featured #1 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative mb-3 overflow-hidden rounded-2xl border border-white/5"
          >
            <Wrap id={first.id} className="block">
            {first.imageUrl && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={first.imageUrl} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 opacity-30 blur-2xl" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={first.imageUrl} alt="" className="relative h-32 w-full object-cover" />
              </>
            )}
            <div className="relative flex items-end justify-between bg-gradient-to-t from-black/80 to-transparent p-3">
              <div className="min-w-0">
                <span className="text-xs font-bold text-[var(--color-accent)]">#1</span>
                <p className="truncate font-semibold text-white">{first.name}</p>
                {first.subtitle && <p className="truncate text-xs text-[var(--color-muted)]">{first.subtitle}</p>}
              </div>
              <span className="shrink-0 text-sm font-semibold text-[var(--color-accent)]">{fmt(first)}</span>
            </div>
            </Wrap>
          </motion.div>

          {/* Rest */}
          <ul className="space-y-1">
            {rest.map((it, i) => (
              <motion.li
                key={it.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Wrap id={it.id} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-[var(--color-surface-2)]/60">
                  <span className="w-4 text-sm tabular-nums text-[var(--color-muted)]">{i + 2}</span>
                  {it.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-[var(--color-surface-2)]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-white">{it.name}</p>
                    {it.subtitle && <p className="truncate text-xs text-[var(--color-muted)]">{it.subtitle}</p>}
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-[var(--color-accent)]">{fmt(it)}</span>
                </Wrap>
              </motion.li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
