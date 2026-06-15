'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, CalendarClock, Hourglass, TrendingUp, Disc3, CheckCircle2, Circle, ListMusic } from 'lucide-react';
import { api } from '@/lib/api';
import { CountUp } from '@/components/CountUp';
import { fecha, relativo } from '@/lib/format';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtMonth = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const fmtDur = (ms: number) => {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const STATUS: Record<string, { label: string; color: string }> = {
  completo: { label: 'Álbum completo', color: '#fbbf24' },
  explorando: { label: 'Explorándolo', color: '#1db954' },
  iniciado: { label: 'Apenas iniciado', color: '#38bdf8' },
  dormido: { label: 'Dormido', color: '#94a3b8' },
  nuevo: { label: 'Nuevo en tu vida', color: '#a78bfa' },
};

export default function AlbumPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const { data: a, isLoading, error } = useSWR(albumId ? `album:${albumId}` : null, () => api.albumJourney(albumId));

  if (isLoading)
    return (
      <div className="mx-auto max-w-3xl pb-12">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-[var(--color-surface-2)]" />
        <div className="mb-6 h-56 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
        <div className="grid grid-cols-3 gap-4">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl border bg-[var(--color-surface)]" />)}</div>
      </div>
    );

  if (error || !a)
    return (
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard/rankings" className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>
        <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">Sin historial para este álbum.</p>
      </div>
    );

  const st = STATUS[a.status] ?? STATUS.explorando;
  const accent = st.color;
  const maxMonth = Math.max(...a.byMonth.map((m) => m.plays), 1);
  const ring = a.completion ?? 0;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <Link href="/dashboard/rankings" className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)]">
        <ArrowLeft className="h-4 w-4" /> Volver
      </Link>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 flex items-center gap-5 overflow-hidden rounded-3xl border p-6"
        style={{ background: `radial-gradient(600px 240px at 85% 0%, ${accent}1f, transparent), var(--color-surface)`, boxShadow: `0 0 60px -25px ${accent}` }}
      >
        {a.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.imageUrl} alt="" className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-lg ring-2" style={{ borderColor: accent }} />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-surface-2)]">
            <Disc3 className="h-12 w-12 text-[var(--color-muted)]" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu viaje por</p>
          <h1 className="truncate text-3xl font-black text-white">{a.name}</h1>
          {a.artist && (
            <Link href={`/dashboard/artist/${a.artist.id}`} className="truncate text-sm text-[var(--color-muted)] transition hover:text-white">
              {a.artist.name}
            </Link>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm font-semibold" style={{ background: `${accent}26`, borderColor: `${accent}66`, color: accent }}>
              <Disc3 className="h-4 w-4" /> {st.label}
            </span>
            <span className="rounded-xl bg-[var(--color-surface-2)] px-3 py-1 text-sm text-[var(--color-muted)]">#{a.allTimeRank} de tus álbumes</span>
          </div>
        </div>
      </motion.div>

      {/* Completion ring + big stats */}
      <section className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="row-span-1 flex flex-col items-center justify-center rounded-2xl border bg-[var(--color-surface)] p-5" style={{ boxShadow: `inset 0 0 50px -30px ${accent}` }}>
          <CompletionRing pct={ring} accent={accent} />
          <p className="mt-2 text-xs text-[var(--color-muted)]">{a.heardTracks}/{a.totalTracks ?? '?'} pistas</p>
        </div>
        <Big value={a.totalHours} suffix=" h" label="escuchadas" accent={accent} />
        <Big value={a.totalPlays} label="reproducciones" accent={accent} />
        <Big value={a.heardTracks} label="pistas oídas" accent={accent} />
      </section>

      {/* Relación */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={CalendarClock} color={accent} label="Desde" value={fecha(a.firstListenAt, { dateStyle: 'medium' })} sub={relativo(a.firstListenAt)} />
        <Stat icon={TrendingUp} color={accent} label="Mes pico" value={a.peakMonth ? fmtMonth(a.peakMonth.ym) : '—'} sub={a.peakMonth ? `${a.peakMonth.plays}▶` : undefined} />
        <Stat icon={Hourglass} color={accent} label="Última vez" value={relativo(a.lastListenAt)} />
        <Stat icon={Clock} color={accent} label="Lanzamiento" value={a.releaseDate ?? '—'} />
      </section>

      {/* Journey timeline (month by month) */}
      {a.byMonth.length > 1 && (
        <section className="mb-6 rounded-3xl border bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <TrendingUp className="h-4 w-4" /> Tu viaje, mes a mes
          </h2>
          <div className="flex items-end gap-1.5 overflow-x-auto">
            {a.byMonth.map((m) => (
              <div key={m.ym} className="flex w-9 shrink-0 flex-col items-center gap-1" title={`${fmtMonth(m.ym)} · ${m.plays}▶`}>
                <div className="flex h-24 w-full items-end justify-center">
                  <motion.div initial={{ height: 0 }} whileInView={{ height: `${Math.max(6, (m.plays / maxMonth) * 100)}%` }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="w-2.5 rounded-full" style={{ background: accent }} />
                </div>
                <span className="text-[9px] tabular-nums text-[var(--color-muted)]">{MONTHS[Number(m.ym.slice(5, 7)) - 1]}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tracklist — heard vs still to discover */}
      <section className="rounded-3xl border bg-[var(--color-surface)] p-6">
        <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <ListMusic className="h-4 w-4" /> Pistas que has oído
          {a.totalTracks != null && a.totalTracks > a.heardTracks && (
            <span className="ml-auto text-[10px] normal-case text-[var(--color-muted)]">{a.totalTracks - a.heardTracks} por descubrir</span>
          )}
        </h2>
        <div className="space-y-1">
          {a.tracks.map((t, i) => (
            <Link key={t.trackId} href={`/dashboard/song/${t.trackId}`} className={`flex items-center gap-3 rounded-xl px-1.5 py-1.5 transition hover:bg-[var(--color-surface-2)]/50 ${t.heard ? '' : 'opacity-50'}`}>
              <span className="w-4 shrink-0 text-right text-xs font-bold tabular-nums text-[var(--color-muted)]">{i + 1}</span>
              {t.heard ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: accent }} />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{t.name}</span>
              <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-muted)]">{fmtDur(t.durationMs)}</span>
              <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: t.heard ? accent : 'var(--color-muted)' }}>
                {t.plays > 0 ? `${t.plays}▶` : '—'}
              </span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function CompletionRing({ pct, accent }: { pct: number; accent: string }) {
  const r = 30;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative h-20 w-20">
      <svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth="7" />
        <motion.circle
          cx="36" cy="36" r={r} fill="none" stroke={accent} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - (circ * pct) / 100 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-black" style={{ color: accent }}>{pct}%</span>
      </div>
    </div>
  );
}

function Big({ value, suffix, label, accent }: { value: number; suffix?: string; label: string; accent: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-5 text-center" style={{ boxShadow: `inset 0 0 50px -30px ${accent}` }}>
      <p className="text-3xl font-black" style={{ color: accent }}>
        <CountUp value={value} />
        {suffix}
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function Stat({ icon: Icon, color, label, value, sub }: { icon: typeof Clock; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-3">
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
      {sub && <p className="truncate text-[10px] text-[var(--color-muted)]">{sub}</p>}
    </div>
  );
}
