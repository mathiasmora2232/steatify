'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useImageColor } from '@/lib/useImageColor';
import type { LucideIcon } from '@/lib/icons';

/**
 * A visual "hero stat" card: the entity's cover fills the background (blurred +
 * overlaid) so the data sits on its own art. Keeps the numbers front and center
 * — name + up to three stats + an optional rank badge. Used for the live
 * highlights row (artist of the moment, obsession, top song…).
 */
export function HighlightCard({
  icon: Icon,
  kicker,
  image,
  name,
  subtitle,
  stats,
  rank,
  href,
  color = 'var(--color-accent)',
  delay = 0,
}: {
  icon: LucideIcon;
  kicker: string;
  image?: string | null;
  name: string;
  subtitle?: string | null;
  stats?: { value: string | number; label: string }[];
  rank?: number | null;
  href?: string;
  color?: string;
  delay?: number;
}) {
  // Real derived color from the cover; falls back to the brand color.
  const derived = useImageColor(image, color);
  color = derived;
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay }}
      whileHover={{ y: -4 }}
      className="group relative h-28 overflow-hidden rounded-2xl border bg-[var(--color-surface)] sm:h-44 sm:rounded-3xl"
      style={{ boxShadow: `inset 0 0 60px -30px ${color}` }}
    >
      {/* Cover as blurred backdrop */}
      {image ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-40 blur-2xl transition-transform duration-700 group-hover:scale-150" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(115deg, ${color}26, transparent 60%), linear-gradient(to top, rgba(8,9,12,0.95), rgba(8,9,12,0.55))` }} />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: `radial-gradient(300px 160px at 100% 0%, ${color}22, transparent), var(--color-surface)` }} />
      )}

      <div className="relative flex h-full flex-col justify-between p-2.5 sm:p-5">
        {/* top: kicker + rank */}
        <div className="flex items-start justify-between">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest sm:gap-1.5 sm:text-[11px]" style={{ color }}>
            <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={2.4} /> {kicker}
          </span>
          {rank != null && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums sm:px-2.5 sm:text-xs" style={{ background: `${color}26`, color }}>
              #{rank}
            </span>
          )}
        </div>

        {/* middle: cover thumb + name */}
        <div className="flex items-end gap-1.5 sm:gap-3">
          {image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover shadow-xl ring-2 ring-white/10 sm:h-16 sm:w-16 sm:rounded-2xl" />
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-black leading-tight text-white sm:text-xl">{name}</p>
            {subtitle && <p className="truncate text-[10px] text-[var(--color-muted)] sm:text-sm">{subtitle}</p>}
          </div>
        </div>

        {/* bottom: stats */}
        {stats && stats.length > 0 && (
          <div className="flex gap-2.5 sm:gap-5">
            {stats.slice(0, 1).map((s) => (
              <div key={s.label} className="sm:hidden">
                <p className="text-xs font-bold tabular-nums" style={{ color }}>{s.value}</p>
                <p className="text-[8px] uppercase tracking-wide text-[var(--color-muted)]">{s.label}</p>
              </div>
            ))}
            {stats.map((s) => (
              <div key={s.label} className="hidden sm:block">
                <p className="text-lg font-bold tabular-nums" style={{ color }}>{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );

  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}
