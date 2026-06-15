'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Sparkles, RotateCcw, Flame, Trophy, CalendarHeart, History, Music2, Mic2, Gamepad2, type LucideIcon } from 'lucide-react';
import { api, type MusicEvent, type MusicEventType } from '@/lib/api';

const META: Record<MusicEventType, { icon: LucideIcon; color: string }> = {
  FIRST_TIME: { icon: Sparkles, color: '#7c5cff' },
  COMEBACK: { icon: RotateCcw, color: '#fbbf24' },
  NEW_OBSESSION: { icon: Flame, color: '#f59e0b' },
  NEW_RECORD: { icon: Trophy, color: '#1db954' },
  ANNIVERSARY: { icon: CalendarHeart, color: '#ff5d8f' },
  NEW_ARTIST: { icon: Mic2, color: '#34d399' },
  ARTIST_COMEBACK: { icon: RotateCcw, color: '#f59e0b' },
  GAME_OBSESSION: { icon: Gamepad2, color: '#38bdf8' },
};

function ago(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  if (d < 30) return `hace ${Math.floor(d / 7)} sem`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

/** "Tu changelog musical" — the live feed of notable events in your listening. */
export function EventsFeed({ limit = 8 }: { limit?: number }) {
  const { data, isLoading } = useSWR('events', () => api.events(limit));

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <History className="h-4 w-4 text-[var(--color-accent-2)]" /> Tu changelog musical
      </h3>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-[var(--color-surface-2)]" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-muted)]">
          Aún no hay eventos. Aparecerán a medida que escuches: regresos, récords, aniversarios…
        </p>
      ) : (
        <ul className="space-y-1">
          {data.map((e, i) => (
            <EventRow key={e.id} e={e} delay={i * 0.04} />
          ))}
        </ul>
      )}
    </div>
  );
}

function EventRow({ e, delay }: { e: MusicEvent; delay: number }) {
  const m = META[e.type] ?? META.NEW_RECORD;
  const Inner = (
    <div className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--color-surface-2)]/50">
      <div className="relative shrink-0">
        {e.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.imageUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-md" style={{ background: `${m.color}22` }}>
            <Music2 className="h-4 w-4" style={{ color: m.color }} />
          </div>
        )}
        <span
          className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[var(--color-surface)]"
          style={{ background: m.color }}
        >
          <m.icon className="h-3 w-3 text-black" />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-[var(--color-text)]">{e.body}</p>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: m.color }}>
          {e.title}
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-[var(--color-muted)]">{ago(e.createdAt)}</span>
    </div>
  );

  return (
    <motion.li initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      {e.entityType === 'track' && e.entityId ? (
        <Link href={`/dashboard/song/${e.entityId}`}>{Inner}</Link>
      ) : (
        Inner
      )}
    </motion.li>
  );
}
