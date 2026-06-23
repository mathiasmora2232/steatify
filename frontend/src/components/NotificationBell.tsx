'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { api, type MusicEvent, type MusicEventType } from '@/lib/api';

/** The narrative voice: an event TYPE → a punchy headline + emoji. */
const VOICE: Record<MusicEventType, { emoji: string; title: string }> = {
  COMEBACK: { emoji: '👻', title: 'Un fantasma volvió' },
  ARTIST_COMEBACK: { emoji: '👻', title: 'Un fantasma volvió' },
  NEW_OBSESSION: { emoji: '🔥', title: 'Nueva obsesión' },
  GAME_OBSESSION: { emoji: '🎮', title: 'Un mundo despertó' },
  NEW_RECORD: { emoji: '🏆', title: 'Nuevo récord' },
  ANNIVERSARY: { emoji: '🎂', title: 'Aniversario' },
  FIRST_TIME: { emoji: '✨', title: 'Primera vez' },
  NEW_ARTIST: { emoji: '🎤', title: 'Alguien nuevo entró' },
};

const SEEN_KEY = 'sonora-events-seen';

function ago(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (d <= 0) return 'hoy';
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  if (d < 30) return `hace ${Math.floor(d / 7)} sem`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function NotificationBell() {
  const { data } = useSWR('events:notif', () => api.events(20), { refreshInterval: 120_000 });
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState<number>(Number.MAX_SAFE_INTEGER); // until hydrated, show nothing as unread

  useEffect(() => {
    setSeen(Number(localStorage.getItem(SEEN_KEY) ?? 0));
  }, []);

  const events = data ?? [];
  const unread = events.filter((e) => new Date(e.createdAt).getTime() > seen).length;

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      const now = Date.now();
      try { localStorage.setItem(SEEN_KEY, String(now)); } catch { /* storage off */ }
      setSeen(now);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={toggle}
        aria-label="Notificaciones"
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-[var(--color-muted)] transition hover:bg-[var(--color-surface-2)]/60 hover:text-white"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-rose)] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="fixed left-1/2 top-16 z-50 max-h-[72vh] w-[92vw] max-w-md -translate-x-1/2 overflow-y-auto rounded-2xl border bg-[var(--color-surface)] p-2 shadow-2xl sm:left-20 sm:translate-x-0 sm:w-96"
            >
              <p className="px-2 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu vida en Sonora</p>
              {events.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-[var(--color-muted)]">
                  Nada por aquí todavía. A medida que escuches y juegues, aparecerán regresos, récords y obsesiones.
                </p>
              ) : (
                <ul className="space-y-0.5">
                  {events.map((e) => <Row key={e.id} e={e} />)}
                </ul>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ e }: { e: MusicEvent }) {
  const v = VOICE[e.type] ?? { emoji: '🎵', title: e.title };
  return (
    <li className="flex items-start gap-3 rounded-xl px-2 py-2 transition hover:bg-[var(--color-surface-2)]/50">
      {e.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
      ) : (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-2)] text-lg">{v.emoji}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{v.emoji} {v.title}</p>
        <p className="text-xs leading-snug text-[var(--color-muted)]">{e.body}</p>
        <p className="mt-0.5 text-[10px] text-[var(--color-muted)]/70">{ago(e.createdAt)}</p>
      </div>
    </li>
  );
}
