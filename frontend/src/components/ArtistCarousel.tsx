'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import type { TopItem } from '@/lib/api';

/** Horizontally scrollable row of top-artist cards (mobile-first, also used on desktop). */
export function ArtistCarousel({ title, items, loading }: { title: string; items: TopItem[]; loading?: boolean }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">{title}</h3>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {loading
          ? [0, 1, 2, 3].map((i) => (
              <div key={i} className="h-56 w-36 shrink-0 animate-pulse rounded-2xl bg-[var(--color-surface-2)] sm:w-40" />
            ))
          : items.length === 0
            ? <p className="py-6 text-sm text-[var(--color-muted)]">Sin datos todavía — sincroniza y vuelve.</p>
            : items.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="w-36 shrink-0 snap-start sm:w-40"
                >
                  <Link
                    href={`/dashboard/artist/${a.id}`}
                    className="group flex h-full flex-col rounded-2xl border bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-accent)]/50"
                  >
                    <div className="relative mx-auto mb-3 h-20 w-20">
                      {a.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.imageUrl} alt="" className="h-20 w-20 rounded-full object-cover shadow-lg" />
                      ) : (
                        <div className="h-20 w-20 rounded-full bg-[var(--color-surface-2)]" />
                      )}
                      <span className="absolute -left-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-xs font-bold text-[var(--color-accent)] ring-2 ring-[var(--color-surface)]">
                        {i + 1}
                      </span>
                    </div>
                    <p className="truncate text-center text-sm font-semibold text-white">{a.name}</p>
                    <p className="mt-0.5 truncate text-center text-xs text-[var(--color-muted)]">{a.minutes} min · {a.plays}×</p>
                  </Link>
                </motion.div>
              ))}
      </div>
    </div>
  );
}
