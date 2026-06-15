'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Gamepad2, CalendarDays, Camera, Flame, History, type LucideIcon } from 'lucide-react';
import { api, type SteamGame } from '@/lib/api';
import { CountUp } from '@/components/CountUp';
import { gameState, STATE_META, daysSince } from '@/lib/steam-derive';

const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('es', { month: 'short' });
};

export default function SteamActivityPage() {
  const account = useSWR('steam:me', api.steamMe);
  const stats = useSWR(account.data ? 'steam:stats' : null, api.steamStats);
  const library = useSWR(account.data ? 'steam:library' : null, api.steamLibrary);
  const evolution = useSWR(account.data ? 'steam:evolution' : null, api.steamEvolution);

  if (account.data === null) {
    return (
      <div className="mx-auto max-w-2xl">
        <Back />
        <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          Conecta tu Steam para ver tu actividad.
        </p>
      </div>
    );
  }

  const lib = library.data ?? [];
  const recent2w = lib.filter((g) => g.hours2Weeks > 0).sort((a, b) => b.hours2Weeks - a.hours2Weeks);
  const hours2w = Math.round(recent2w.reduce((s, g) => s + g.hours2Weeks, 0));
  const recentlyPlayed = lib
    .filter((g) => g.lastPlayedAt && (daysSince(g.lastPlayedAt) ?? 999) <= 120)
    .sort((a, b) => new Date(b.lastPlayedAt!).getTime() - new Date(a.lastPlayedAt!).getTime())
    .slice(0, 12);
  const months = (evolution.data?.monthly ?? []).filter((m) => m.hours > 0);
  const snaps = evolution.data?.points.length ?? 0;

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <Back />
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <CalendarDays className="h-7 w-7 text-[var(--color-accent)]" /> Tu actividad gamer
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Tu tiempo de juego en el tiempo — lo que Steam te deja ver, y lo que vamos registrando.</p>
      </header>

      {/* Stats */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Clock} color="#1db954" value={stats.data?.totalHours ?? 0} suffix="h" label="Tiempo total" />
        <Stat icon={Flame} color="#f59e0b" value={hours2w} suffix="h" label="Últimas 2 semanas" sub={`${recent2w.length} juegos`} />
        <Stat icon={Gamepad2} color="#7c5cff" value={stats.data?.playedCount ?? 0} label="Juegos jugados" />
        <Stat icon={Camera} color="#38bdf8" value={snaps} label="Snapshots" sub="puntos de historial" />
      </section>

      {/* Evolución mensual */}
      <section className="mb-6 rounded-3xl border bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <History className="h-4 w-4 text-[var(--color-accent)]" /> Evolución de tu tiempo
        </h2>
        {months.length >= 2 ? (
          <div className="flex items-end gap-3">
            {months.map((m, i) => {
              const max = Math.max(...months.map((x) => x.hours), 1);
              return (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                  <span className="text-xs font-bold tabular-nums text-white">{m.hours}h</span>
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(m.hours / max) * 130 + 6}px` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className="w-full rounded-t-lg bg-gradient-to-t from-[var(--color-accent)]/50 to-[var(--color-accent)]"
                  />
                  <span className="text-[10px] text-[var(--color-muted)]">{fmtMonth(m.month)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-6 text-center">
            <p className="text-sm text-[var(--color-text)]">
              Tu curva mensual se está <span className="font-semibold text-[var(--color-accent)]">acumulando</span>.
            </p>
            <p className="mt-1 text-xs text-[var(--color-muted)]">
              Steam no da historial, así que registramos un snapshot en cada sync ({snaps} hasta ahora). Cuando haya ≥2 meses,
              aquí verás tus horas reales mes a mes. Snapshot actual: <span className="text-white">{stats.data?.totalHours ?? 0}h</span>.
            </p>
          </div>
        )}
      </section>

      {/* Últimas 2 semanas */}
      {recent2w.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Flame className="h-4 w-4 text-[#f59e0b]" /> Lo que jugaste estas 2 semanas
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {recent2w.slice(0, 8).map((g, i) => (
              <GameTile key={g.appId} g={g} hours={g.hours2Weeks} delay={i * 0.04} />
            ))}
          </div>
        </section>
      )}

      {/* Actividad reciente por última vez jugado */}
      {recentlyPlayed.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <History className="h-4 w-4" /> Actividad reciente
          </h2>
          <div className="overflow-hidden rounded-3xl border bg-[var(--color-surface)]">
            {recentlyPlayed.map((g, i) => {
              const d = daysSince(g.lastPlayedAt) ?? 0;
              const meta = STATE_META[gameState(g)];
              return (
                <motion.div
                  key={g.appId}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={i > 0 ? 'border-t border-[var(--color-border)]' : ''}
                >
                  <Link href={`/dashboard/steam/game/${g.appId}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-[var(--color-surface-2)]/50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.iconUrl ?? g.headerUrl} alt="" className="h-9 w-9 rounded object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{g.name}</p>
                      <p className="text-xs text-[var(--color-muted)]">{g.hoursForever}h totales</p>
                    </div>
                    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${meta.color}1f`, color: meta.color }}>{meta.label}</span>
                    <span className="w-20 shrink-0 text-right text-xs text-[var(--color-muted)]">{d === 0 ? 'hoy' : `hace ${d}d`}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Back() {
  return (
    <Link href="/dashboard/steam" className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] transition hover:text-white">
      <ArrowLeft className="h-4 w-4" /> Volver a Steam
    </Link>
  );
}

function Stat({ icon: IconCmp, color, value, suffix, label, sub }: { icon: LucideIcon; color: string; value: number; suffix?: string; label: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}1f` }}>
        <IconCmp className="h-4 w-4" style={{ color }} />
      </div>
      <p className="text-3xl font-black text-white">
        <CountUp value={value} />
        {suffix}
      </p>
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      {sub && <p className="text-[11px] text-[var(--color-muted)]/70">{sub}</p>}
    </motion.div>
  );
}

function GameTile({ g, hours, delay }: { g: SteamGame; hours: number; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ y: -3 }}>
      <Link href={`/dashboard/steam/game/${g.appId}`} className="group block overflow-hidden rounded-2xl border bg-[var(--color-surface)] transition hover:border-[var(--color-accent)]/50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.headerUrl} alt={g.name} className="aspect-[460/215] w-full object-cover" loading="lazy" />
        <div className="p-3">
          <p className="truncate text-sm font-medium text-white">{g.name}</p>
          <p className="text-xs text-[#f59e0b]">{hours}h estas 2 semanas</p>
        </div>
      </Link>
    </motion.div>
  );
}
