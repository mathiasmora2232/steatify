'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Clock, Library, Crown, Skull, Trophy, Gamepad2, Sparkles, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { computeLevel } from '@/lib/level';
import { CountUp } from '@/components/CountUp';
import { gamerAttributes, gamerClass, completedCount } from '@/lib/steam-derive';

export default function SteamWrappedPage() {
  const account = useSWR('steam:me', api.steamMe);
  const stats = useSWR(account.data ? 'steam:stats' : null, api.steamStats);
  const genres = useSWR(account.data ? 'steam:genres' : null, api.steamGenres);
  const backlog = useSWR(account.data ? 'steam:backlog' : null, api.steamBacklog);
  const library = useSWR(account.data ? 'steam:library' : null, api.steamLibrary);
  const dna = useSWR(account.data ? 'dna' : null, api.musicDna);
  const insight = useSWR(account.data ? 'steam:insight' : null, api.steamInsight);

  const s = stats.data;
  const lib = library.data ?? [];
  if (!account.data || !s) {
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/steam" className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)]">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          Conecta tu Steam para ver tu Wrapped gamer.
        </p>
      </div>
    );
  }

  const attrs = lib.length ? gamerAttributes(s, lib, genres.data?.genres) : [];
  const klass = attrs.length ? gamerClass(attrs) : null;
  const level = computeLevel(dna.data?.totals.plays ?? 0, dna.data?.totals.minutes ?? 0, s.totalHours);
  const topGame = s.topGames[0] ?? null;
  const completed = completedCount(lib);
  const accent = '#1db954';

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <Link href="/dashboard/steam" className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Volver a Steam
      </Link>

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-3xl border p-8 text-center"
        style={{ background: `radial-gradient(600px 280px at 50% -10%, ${accent}26, transparent), linear-gradient(160deg, var(--color-surface), var(--color-surface-2))` }}
      >
        <p className="flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-muted)]">
          <Sparkles className="h-4 w-4" style={{ color: accent }} /> Tu Wrapped Gamer
        </p>
        <div className="mx-auto my-5 flex h-24 w-24 items-center justify-center rounded-full border" style={{ borderColor: `${accent}55`, background: `${accent}12` }}>
          <Skull className="h-12 w-12" style={{ color: accent }} />
        </div>
        <p className="text-sm text-[var(--color-muted)]">{account.data.personaName} · Gamer Lv. {level.level} · {level.rarity}</p>
        <h1 className="mt-1 text-4xl font-black" style={{ color: accent }}>{klass?.name ?? 'Jugador'}</h1>
        <p className="mt-2 text-5xl font-black text-white">
          <CountUp value={s.totalHours} />
          <span className="text-2xl text-[var(--color-muted)]">h</span>
        </p>
        <p className="text-sm text-[var(--color-muted)]">dentro de tus juegos · toda una vida</p>
      </motion.section>

      {/* Narrativa IA */}
      {insight.data?.text && (
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-3xl border p-6"
          style={{ background: `radial-gradient(600px 200px at 50% 0%, ${accent}1f, var(--color-surface))` }}
        >
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: accent }}>
            <Sparkles className="h-4 w-4" /> Así juegas tú
          </p>
          <p className="text-lg leading-relaxed text-[var(--color-text)]">{insight.data.text}</p>
        </motion.section>
      )}

      {/* Chapters */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {topGame && (
          <Chapter icon={Crown} color="#f59e0b" label="Tu juego del año" delay={0}>
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={topGame.headerUrl} alt="" className="h-16 w-28 rounded-lg object-cover" />
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{topGame.name}</p>
                <p className="text-sm" style={{ color: '#f59e0b' }}>{topGame.hoursForever.toLocaleString()} h</p>
              </div>
            </div>
          </Chapter>
        )}
        <Chapter icon={Gamepad2} color="#7c5cff" label="Tu género dominante" delay={0.05}>
          <p className="text-2xl font-black text-white">{genres.data?.topGenre ?? '—'}</p>
          <p className="text-sm text-[var(--color-muted)]">tu forma de jugar</p>
        </Chapter>
        <Chapter icon={Library} color="#38bdf8" label="Tu biblioteca" delay={0.1}>
          <p className="text-3xl font-black text-white"><CountUp value={s.gameCount} /></p>
          <p className="text-sm text-[var(--color-muted)]">{s.playedCount} jugados · {s.unplayedCount} esperando</p>
        </Chapter>
        <Chapter icon={Trophy} color="#1db954" label="Dominados" delay={0.15}>
          <p className="text-3xl font-black text-white"><CountUp value={completed} /></p>
          <p className="text-sm text-[var(--color-muted)]">juegos con +20h</p>
        </Chapter>
        <Chapter icon={Skull} color="#ff5d8f" label="Tu backlog" delay={0.2}>
          <p className="text-3xl font-black text-white"><CountUp value={backlog.data?.neverPlayedCount ?? s.unplayedCount} /></p>
          <p className="text-sm text-[var(--color-muted)]">promesas pendientes · valor emocional: alto 🔥</p>
        </Chapter>
        <Chapter icon={Clock} color="#34d399" label="Promedio" delay={0.25}>
          <p className="text-3xl font-black text-white"><CountUp value={s.avgHoursPlayed} />h</p>
          <p className="text-sm text-[var(--color-muted)]">por juego que tocaste</p>
        </Chapter>
      </div>

      {/* DNA radar */}
      {attrs.length > 0 && (
        <section className="mt-6 rounded-3xl border bg-[var(--color-surface)] p-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu perfil de jugador</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={attrs} outerRadius="72%">
                <PolarGrid stroke="#232733" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#8b8f9c', fontSize: 11 }} />
                <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {klass && (
        <p className="mt-6 text-center text-sm italic text-[var(--color-muted)]">“{klass.tagline}”</p>
      )}
    </div>
  );
}

function Chapter({ icon: IconCmp, color, label, delay, children }: { icon: LucideIcon; color: string; label: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="rounded-3xl border bg-[var(--color-surface)] p-5"
    >
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        <IconCmp className="h-4 w-4" /> {label}
      </p>
      {children}
    </motion.div>
  );
}
