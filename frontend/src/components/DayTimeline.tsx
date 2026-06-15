'use client';

import { motion } from 'framer-motion';
import { Sunrise, Flame, Headphones, Gamepad2, Crown, Compass, Sparkles, Moon } from 'lucide-react';
import type { RecentPlay } from '@/lib/api';
import type { LucideIcon } from '@/lib/icons';

interface Entry {
  time: string;
  title: string;
  sub?: string;
  icon: LucideIcon;
  color: string;
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

/** "Tu día" — a human timeline built from today's plays + gaming. */
export function DayTimeline({
  recent,
  gamingTop,
}: {
  recent: RecentPlay[];
  gamingTop: string | null;
}) {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const today = recent
    .filter((r) => new Date(r.playedAt) >= startOfDay)
    .sort((a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime());

  const entries: Entry[] = [];
  if (today.length > 0) {
    const first = today[0];
    const last = today[today.length - 1];

    // Top artist of the day.
    const byArtist = new Map<string, number>();
    for (const p of today) byArtist.set(p.artist, (byArtist.get(p.artist) ?? 0) + 1);
    const [topArtist, topArtistN] = [...byArtist.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
    const artistsToday = byArtist.size;

    // Peak hour of the day.
    const byHour = new Map<number, number>();
    for (const p of today) {
      const h = new Date(p.playedAt).getHours();
      byHour.set(h, (byHour.get(h) ?? 0) + 1);
    }
    const [peakHour, peakN] = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0] ?? [0, 0];

    // An artist heard today that didn't appear earlier in the recent window.
    const earlier = new Set(recent.filter((r) => new Date(r.playedAt) < startOfDay).map((r) => r.artist));
    const discovery = today.find((p) => !earlier.has(p.artist) && p.artist !== first.artist);

    entries.push({ time: hhmm(first.playedAt), title: `Empezaste con ${first.artist}`, sub: first.name, icon: Sunrise, color: '#f59e0b' });

    if (artistsToday >= 2) {
      entries.push({ time: '', title: `Has escuchado ${today.length} canciones`, sub: `de ${artistsToday} artistas hoy`, icon: Sparkles, color: '#1db954' });
    }
    if (topArtistN >= 2) {
      entries.push({ time: '', title: `Artista del día: ${topArtist}`, sub: `${topArtistN} reproducciones`, icon: Crown, color: '#fbbf24' });
    }
    if (today.length > 4 && peakN >= 2) {
      entries.push({ time: `${String(peakHour).padStart(2, '0')}:00`, title: 'Hora pico', sub: `${peakN} canciones en una hora`, icon: Flame, color: '#ff5d8f' });
    }
    if (discovery) {
      entries.push({ time: hhmm(discovery.playedAt), title: `Descubriste a ${discovery.artist}`, sub: discovery.name, icon: Compass, color: '#38bdf8' });
    }
    if (today.length > 1) {
      const isNight = new Date(last.playedAt).getHours() >= 21 || new Date(last.playedAt).getHours() < 6;
      entries.push({ time: hhmm(last.playedAt), title: 'Lo último que sonó', sub: `${last.name} · ${last.artist}`, icon: isNight ? Moon : Headphones, color: '#a78bfa' });
    }
  }
  if (gamingTop) {
    entries.push({ time: '', title: 'Sesión de gaming', sub: gamingTop, icon: Gamepad2, color: '#7c5cff' });
  }

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu día</p>
        {today.length > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-[var(--color-accent)]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
            </span>
            en vivo
          </span>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-muted)]">
          Tu historia de hoy aparecerá aquí cuando escuches algo.
        </p>
      ) : (
        <ol className="relative ml-1 space-y-4 border-l border-[var(--color-border)] pl-5">
          {entries.map((e, i) => {
            const EntryIcon = e.icon;
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="relative"
              >
                <span
                  className="absolute -left-[27px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-[var(--color-surface)]"
                  style={{ background: `${e.color}22` }}
                >
                  <EntryIcon className="h-2.5 w-2.5" style={{ color: e.color }} aria-hidden />
                </span>
                <div className="flex items-baseline gap-2">
                  {e.time && <span className="text-xs tabular-nums text-[var(--color-accent)]">{e.time}</span>}
                  <span className="text-sm font-medium text-white">{e.title}</span>
                </div>
                {e.sub && <p className="truncate text-xs text-[var(--color-muted)]">{e.sub}</p>}
              </motion.li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
