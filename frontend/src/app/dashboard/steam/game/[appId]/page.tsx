'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  CalendarClock,
  Hourglass,
  Star,
  ThumbsUp,
  Tags,
  Sparkles,
  DollarSign,
  Receipt,
  Gamepad2,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CountUp } from '@/components/CountUp';
import { playtimeLabel, steamGameState, STEAM_GAME_STATE, stateReason, daysSince } from '@/lib/steam-derive';
import { gameInsight } from '@/lib/game-insight';
import { fecha } from '@/lib/format';

const fmtDate = (iso: string) => fecha(iso, { dateStyle: 'long' });

const metacriticColor = (m: number) => (m >= 80 ? '#34d399' : m >= 60 ? '#f59e0b' : '#ff5d8f');

export default function SteamGamePage() {
  const { appId } = useParams<{ appId: string }>();
  const id = Number(appId);
  const { data: g, isLoading, error } = useSWR(
    appId ? `steam-game:${appId}` : null,
    () => api.steamGame(id),
  );

  if (isLoading)
    return (
      <div className="mx-auto max-w-3xl pb-12">
        <div className="mb-4 h-5 w-44 animate-pulse rounded bg-[var(--color-surface-2)]" />
        <div className="mb-6 h-64 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl border bg-[var(--color-surface)]" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl border bg-[var(--color-surface)]" />
          ))}
        </div>
      </div>
    );

  if (error || !g)
    return (
      <div className="mx-auto max-w-2xl">
        <Link
          href="/dashboard/steam/library"
          className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a la biblioteca
        </Link>
        <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          No tienes ese juego.
        </p>
      </div>
    );

  const pt = playtimeLabel(g.hoursForever);
  const stateKey = steamGameState(g);
  const state = STEAM_GAME_STATE[stateKey];
  const accent = state.color;
  const message = gameInsight(g);
  const reason = stateReason(g, stateKey);
  const days = daysSince(g.lastPlayedAt);

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Link
        href="/dashboard/steam/library"
        className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a la biblioteca
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 overflow-hidden rounded-3xl border"
        style={{ boxShadow: `0 0 60px -20px ${accent}` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.headerUrl} alt="" className="h-56 w-full object-cover sm:h-64" />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(0deg, var(--color-surface) 8%, transparent 70%), radial-gradient(600px 240px at 85% 0%, ${accent}33, transparent)`,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Game Profile</p>
          <h1 className="mt-1 text-2xl font-black text-[var(--color-text)] sm:text-3xl">{g.name}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold"
              style={{ background: `${state.color}26`, borderColor: `${state.color}66`, color: state.color }}
            >
              <state.icon className="h-4 w-4" /> {state.label}
            </span>
            <span
              className="flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-semibold"
              style={{ background: `${pt.color}1f`, borderColor: `${pt.color}55`, color: pt.color }}
            >
              <Gamepad2 className="h-4 w-4" /> {pt.label}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Big stats */}
      <section className={`mb-6 grid gap-4 ${g.hours2Weeks > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <Big value={g.hoursForever} suffix="h" label="horas totales" accent={accent} />
        <BigText value={state.label} label="estado" accent={accent} icon={state.icon} />
        {g.hours2Weeks > 0 && <Big value={g.hours2Weeks} suffix="h" label="últimas 2 semanas" accent={accent} />}
      </section>

      {/* Recomendación Steatify */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex items-start gap-3 rounded-2xl border px-5 py-4"
        style={{ background: `linear-gradient(120deg, ${accent}14, var(--color-surface))` }}
      >
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: accent }} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Veredicto Steatify</p>
          <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{message}</p>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <Info className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
            <span><span className="font-semibold text-[var(--color-text)]">Razón:</span> {reason}</span>
          </p>
        </div>
      </motion.div>

      {/* Stat grid */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tus números con este juego</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            icon={CalendarClock}
            color={accent}
            label="Última vez jugado"
            value={g.lastPlayedAt ? fmtDate(g.lastPlayedAt) : 'nunca'}
          />
          <Stat
            icon={Hourglass}
            color={accent}
            label="Días desde entonces"
            value={days != null ? `${days} días` : '—'}
            sub={g.lastPlayedAt ? 'sin abrirlo' : undefined}
          />
          {g.metacritic != null && (
            <Stat
              icon={Star}
              color={metacriticColor(g.metacritic)}
              label="Metacritic"
              value={`${g.metacritic}/100`}
            />
          )}
          {g.recommendations != null && (
            <Stat
              icon={ThumbsUp}
              color={accent}
              label="Recomendaciones"
              value={g.recommendations.toLocaleString()}
              sub="popularidad"
            />
          )}
          <Stat icon={Clock} color={accent} label="Horas totales" value={`${g.hoursForever}h`} />
          {(g.isFree || g.priceCents != null) && (
            <Stat
              icon={DollarSign}
              color={accent}
              label="Precio"
              value={g.isFree ? 'Gratis' : `$${((g.priceCents ?? 0) / 100).toFixed(2)}`}
              sub="precio actual en Store"
            />
          )}
          {g.priceCents != null && g.priceCents > 0 && g.hoursForever > 0 && (
            <Stat
              icon={Receipt}
              color={accent}
              label="Costo por hora"
              value={`$${(g.priceCents / 100 / g.hoursForever).toFixed(2)}/h`}
              sub="tu rentabilidad"
            />
          )}
          {g.priceCents != null && g.priceCents > 0 && g.hoursForever === 0 && (
            <Stat icon={Receipt} color="#ff5d8f" label="Costo por hora" value="—" sub="0h jugadas 💀" />
          )}
        </div>
      </section>

      {/* Géneros */}
      {g.genres && g.genres.length > 0 && (
        <section className="rounded-3xl border bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Tags className="h-4 w-4" /> Géneros
          </h2>
          <div className="flex flex-wrap gap-2">
            {g.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full px-3 py-1.5 text-sm font-medium"
                style={{ background: `${accent}1f`, color: accent }}
              >
                {genre}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Big({ value, suffix, label, accent }: { value: number; suffix?: string; label: string; accent: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-5 text-center">
      <p className="text-3xl font-black" style={{ color: accent }}>
        <CountUp value={value} />
        {suffix}
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function BigText({ value, label, accent, icon: IconCmp }: { value: string; label: string; accent: string; icon: LucideIcon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border bg-[var(--color-surface)] p-5 text-center">
      <IconCmp className="mb-1.5 h-6 w-6" style={{ color: accent }} />
      <p className="text-lg font-black leading-tight text-[var(--color-text)]">{value}</p>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function Stat({ icon: IconCmp, color, label, value, sub }: { icon: LucideIcon; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-4">
      <IconCmp className="mb-2 h-4 w-4" style={{ color }} />
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="truncate text-sm font-bold text-[var(--color-text)]">{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)]">{sub}</p>}
    </div>
  );
}
