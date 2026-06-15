'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trophy, TrendingUp, TrendingDown, History, Repeat, ArrowUpRight, RotateCcw, Crown, Clock, Users, Disc3, Gamepad2, type LucideIcon } from 'lucide-react';
import type { WeeklyRecap as WeeklyRecapData, SteamGame } from '@/lib/api';

/**
 * "Resumen de la semana" — the week's highlights from real data: record check,
 * this-week-vs-last, the musical comeback, the obsession track, and the games
 * that rose / were resumed. Each card says what the number means.
 */
export function WeeklyRecap({
  data,
  rose,
  resumed,
}: {
  data: WeeklyRecapData;
  rose: (SteamGame & { gainedHours?: number }) | null;
  resumed: SteamGame | null;
}) {
  const dMin = data.deltas.minutesPct;
  const gap = data.comebackArtist?.gapDays ?? 0;
  const gapLabel = gap >= 365 ? `${Math.round(gap / 365)} año${gap >= 730 ? 's' : ''}` : `${gap} días`;

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Trophy className="h-4 w-4 text-[var(--color-accent)]" /> Resumen de la semana
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Card
          icon={Trophy}
          color={data.isRecordWeek ? '#f59e0b' : '#7c5cff'}
          label={data.isRecordWeek ? '¡Récord semanal!' : 'Tu semana'}
          value={`${data.thisWeek.minutes.toLocaleString()} min`}
          sub={data.isRecordWeek ? 'tu semana más escuchada' : `${(data.thisWeek.minutes / 60).toFixed(1)} h · récord ${data.recordWeekMinutes.toLocaleString()} min`}
        />
        <Card icon={Clock} color="#34d399" label="Horas esta semana" value={`${(data.thisWeek.minutes / 60).toFixed(1)} h`} sub={`${data.thisWeek.plays.toLocaleString()} reproducciones`} />
        <Card icon={Users} color="#38bdf8" label="Artistas esta semana" value={data.thisWeek.uniqueArtists.toLocaleString()} sub={`+${data.vibe.newArtists} nuevos`} />
        <Card icon={Disc3} color="#a78bfa" label="Canciones / álbumes" value={`${data.thisWeek.uniqueTracks.toLocaleString()}`} sub={`${data.thisWeek.uniqueAlbums.toLocaleString()} álbumes distintos`} />
        <Card icon={Gamepad2} color="#7c5cff" label="Gaming esta semana" value={`${data.thisWeek.gamingHours} h`} sub="horas en Steam" />
        <Card
          icon={dMin != null && dMin >= 0 ? TrendingUp : TrendingDown}
          color={dMin != null && dMin >= 0 ? '#1db954' : '#ff5d8f'}
          label="vs semana anterior"
          value={dMin != null ? `${dMin >= 0 ? '+' : ''}${dMin}%` : '—'}
          sub={`${data.thisWeek.plays.toLocaleString()} vs ${data.lastWeek.plays.toLocaleString()} plays`}
        />
        <Card
          icon={Crown}
          color="#f59e0b"
          label="Artista de la semana"
          value={data.topArtist?.name ?? '—'}
          sub={data.topArtist ? `${data.topArtist.plays} reproducciones` : 'sin actividad'}
        />
        <Card
          icon={History}
          color="#22d3ee"
          label="Comeback musical"
          value={data.comebackArtist?.name ?? '—'}
          sub={data.comebackArtist ? `volvió tras ${gapLabel}` : 'sin regresos esta semana'}
        />
        <Card
          icon={Repeat}
          color="#ef4444"
          label="Canción obsesión"
          value={data.obsessionTrack?.name ?? '—'}
          sub={data.obsessionTrack ? `${data.obsessionTrack.plays}× · ${data.obsessionTrack.artist ?? ''}`.trim() : 'aún sin obsesión'}
        />
        <Card
          icon={ArrowUpRight}
          color="#f59e0b"
          label="Juego que subió"
          value={rose?.name ?? '—'}
          sub={rose ? `+${rose.gainedHours ?? 0}h esta semana` : 'sin cambios (se construye al sync)'}
          href={rose ? `/dashboard/steam/game/${rose.appId}` : undefined}
        />
        <Card
          icon={RotateCcw}
          color="#34d399"
          label="Juego retomado"
          value={resumed?.name ?? '—'}
          sub={resumed ? 'activo otra vez tras dormir' : 'ninguno retomado (todavía)'}
          href={resumed ? `/dashboard/steam/game/${resumed.appId}` : undefined}
        />
      </div>
    </div>
  );
}

function Card({
  icon: Icon,
  color,
  label,
  value,
  sub,
  href,
}: {
  icon: LucideIcon;
  color: string;
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full rounded-2xl border bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]/40"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color }}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="truncate text-lg font-black text-white" title={value}>{value}</p>
      <p className="truncate text-[11px] text-[var(--color-muted)]" title={sub}>{sub}</p>
    </motion.div>
  );
  return href ? <Link href={href} className="block h-full">{inner}</Link> : inner;
}
