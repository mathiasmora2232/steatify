'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Gamepad2, Music2 } from 'lucide-react';
import { api, type TopItem } from '@/lib/api';
import { Waveform } from './Waveform';

export interface HeroGame {
  appId: number;
  name: string;
  headerUrl: string;
  hoursForever: number;
  hours2Weeks: number;
}

export function HomeHero({
  name,
  eraText,
  topArtist,
  recentGame,
}: {
  name: string;
  eraText: string | null;
  topArtist: TopItem | null;
  recentGame?: HeroGame | null;
}) {
  const { data: np } = useSWR('now-playing', api.nowPlaying, { refreshInterval: 10_000 });
  const playing = np?.playing && np.name;
  const cover = playing ? np.imageUrl : topArtist?.imageUrl;

  // Smooth progress: interpolate locally between fetches so the bar advances
  // every second instead of jumping each refresh.
  const [smoothMs, setSmoothMs] = useState(0);
  const anchor = useRef({ at: 0, ms: 0 });
  useEffect(() => {
    if (playing && np?.progressMs != null) {
      anchor.current = { at: Date.now(), ms: np.progressMs };
      setSmoothMs(np.progressMs);
    }
  }, [np?.progressMs, playing]);
  useEffect(() => {
    if (!playing || !np?.durationMs) return;
    const id = setInterval(() => {
      setSmoothMs(Math.min(np.durationMs!, anchor.current.ms + (Date.now() - anchor.current.at)));
    }, 1000);
    return () => clearInterval(id);
  }, [playing, np?.durationMs]);
  const pct = playing && np.durationMs ? Math.min(100, (smoothMs / np.durationMs) * 100) : 0;
  const fmtMs = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <section className="relative mb-8 overflow-hidden rounded-3xl border bg-[var(--color-surface)]">
      {/* Glow backdrop from the cover */}
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cover}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -right-20 -top-24 h-80 w-80 scale-150 rounded-full opacity-25 blur-3xl"
        />
      )}
      <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
        {/* Left — identity */}
        <div className="min-w-0">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Hola{name ? `, ${name}` : ''}
          </motion.h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Qué bueno verte de nuevo</p>
          {eraText && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-3"
            >
              <p className="text-xs uppercase tracking-widest text-[var(--color-muted)]">Tu era actual</p>
              <p className="mt-1 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-lg font-semibold text-transparent sm:text-xl">
                {eraText}
              </p>
            </motion.div>
          )}
        </div>

        {/* Right — now playing + último juego activo */}
        <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-[320px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          className="flex w-full items-center gap-4 rounded-2xl border border-white/5 bg-black/20 p-4 backdrop-blur"
        >
          <div className="relative shrink-0">
            {cover ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" aria-hidden className="absolute inset-0 h-20 w-20 scale-110 rounded-xl opacity-60 blur-xl" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cover} alt="" className="relative h-20 w-20 rounded-xl object-cover shadow-lg" />
              </>
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-surface-2)] to-black/40">
                <Music2 className="h-8 w-8 text-[var(--color-muted)]/60" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            {playing ? (
              <>
                <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--color-accent)]">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--color-accent)]" />
                  </span>
                  Sonando ahora
                </div>
                <p className="truncate font-semibold text-white">{np.name}</p>
                <p className="truncate text-sm text-[var(--color-muted)]">{np.artist}</p>
                <div className="mt-2">
                  <Waveform active bars={28} />
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]"
                    style={{ width: `${pct}%`, transition: 'width 1s linear' }}
                  />
                </div>
                {np.durationMs ? (
                  <div className="mt-0.5 flex justify-between text-[10px] tabular-nums text-[var(--color-muted)]">
                    <span>{fmtMs(smoothMs)}</span>
                    <span>{fmtMs(np.durationMs)}</span>
                  </div>
                ) : null}
              </>
            ) : topArtist ? (
              <>
                <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">En silencio · tu artista</p>
                <p className="truncate font-semibold text-white">{topArtist.name}</p>
                <p className="truncate text-sm text-[var(--color-muted)]">{topArtist.plays} reproducciones</p>
              </>
            ) : (
              <>
                <p className="font-semibold text-white">Conecta y dale play</p>
                <p className="text-sm text-[var(--color-muted)]">Tu música aparecerá aquí en vivo</p>
              </>
            )}
          </div>
        </motion.div>

        {/* Último juego activo */}
        {recentGame && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
            <Link
              href={`/dashboard/steam/game/${recentGame.appId}`}
              className="group flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-2.5 backdrop-blur transition hover:border-[var(--color-accent)]/40"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={recentGame.headerUrl} alt="" className="h-10 w-[72px] shrink-0 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[#7c5cff]">
                  <Gamepad2 className="h-3 w-3" /> {recentGame.hours2Weeks > 0 ? 'Jugando últimamente' : 'Último juego'}
                </p>
                <p className="truncate text-sm font-semibold text-white">{recentGame.name}</p>
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums text-[#7c5cff]">
                {recentGame.hours2Weeks > 0 ? `${recentGame.hours2Weeks}h` : `${recentGame.hoursForever}h`}
              </span>
            </Link>
          </motion.div>
        )}
        </div>
      </div>
    </section>
  );
}
