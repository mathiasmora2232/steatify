'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, Crown, CalendarClock, Hourglass, Music2, Disc3, TrendingUp, Mic2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CountUp } from '@/components/CountUp';
import { fecha, relativo } from '@/lib/format';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const fmtMonth = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

const STATUS: Record<string, { label: string; color: string }> = {
  principal: { label: 'Artista principal', color: '#f59e0b' },
  leyenda: { label: 'Leyenda', color: '#fbbf24' },
  activo: { label: 'En rotación', color: '#1db954' },
  dormido: { label: 'Dormido', color: '#94a3b8' },
  nuevo: { label: 'Nuevo en tu vida', color: '#38bdf8' },
};

export default function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const { data: a, isLoading, error } = useSWR(artistId ? `artist:${artistId}` : null, () => api.artistProfile(artistId));

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
        <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">Sin historial para este artista.</p>
      </div>
    );

  const st = STATUS[a.status] ?? STATUS.activo;
  const accent = st.color;
  const maxYear = Math.max(...a.byYear.map((y) => y.plays), 1);

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
          <img src={a.imageUrl} alt="" className="h-24 w-24 shrink-0 rounded-full object-cover ring-2" style={{ borderColor: accent }} />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)]">
            <Mic2 className="h-10 w-10 text-[var(--color-muted)]" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu relación con</p>
          <h1 className="truncate text-3xl font-black text-white">{a.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-xl border px-3 py-1 text-sm font-semibold" style={{ background: `${accent}26`, borderColor: `${accent}66`, color: accent }}>
              <Crown className="h-4 w-4" /> {st.label}
            </span>
            <span className="rounded-xl bg-[var(--color-surface-2)] px-3 py-1 text-sm text-[var(--color-muted)]">#{a.allTimeRank} de tus artistas</span>
          </div>
        </div>
      </motion.div>

      {/* Big stats */}
      <section className="mb-6 grid grid-cols-3 gap-4">
        <Big value={a.totalHours} suffix=" h" label="juntos" accent={accent} />
        <Big value={a.totalPlays} label="reproducciones" accent={accent} />
        <Big value={a.distinctTracks} label="canciones suyas" accent={accent} />
      </section>

      {/* Relación */}
      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={CalendarClock} color={accent} label="Desde" value={fecha(a.firstListenAt, { dateStyle: 'medium' })} sub={relativo(a.firstListenAt)} />
        <Stat icon={TrendingUp} color={accent} label="Mes pico" value={a.peakMonth ? fmtMonth(a.peakMonth.ym) : '—'} sub={a.peakMonth ? `${a.peakMonth.plays}▶` : undefined} />
        <Stat icon={Clock} color={accent} label="Hora favorita" value={a.favoriteHour != null ? `${String(a.favoriteHour).padStart(2, '0')}:00` : '—'} />
        <Stat icon={Hourglass} color={accent} label="Última vez" value={relativo(a.lastListenAt)} sub={`${a.pctOfLife}% de tu vida`} />
      </section>

      {/* Timeline por año */}
      {a.byYear.length > 0 && (
        <section className="mb-6 rounded-3xl border bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu historia, año a año</h2>
          <div className="space-y-2.5">
            {a.byYear.map((y) => (
              <div key={y.year} className="flex items-center gap-3">
                <span className="w-10 shrink-0 text-xs font-bold tabular-nums text-[var(--color-muted)]">{y.year}</span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div initial={{ width: 0 }} whileInView={{ width: `${(y.plays / maxYear) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: accent }} />
                </div>
                <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums text-white">{y.plays}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Top canciones + álbum favorito */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {a.topTracks.length > 0 && (
          <div className="rounded-3xl border bg-[var(--color-surface)] p-6">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <Music2 className="h-4 w-4" /> Tus canciones suyas
            </h2>
            <div className="space-y-2">
              {a.topTracks.map((t, i) => (
                <Link key={t.trackId} href={`/dashboard/song/${t.trackId}`} className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-[var(--color-surface-2)]/50">
                  <span className="w-4 shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: accent }}>{i + 1}</span>
                  {t.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-[var(--color-surface-2)]"><Music2 className="h-4 w-4 text-[var(--color-muted)]" /></div>
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{t.name}</span>
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--color-muted)]">{t.plays}▶</span>
                </Link>
              ))}
            </div>
          </div>
        )}
        {a.topAlbum && (
          <Link href={`/dashboard/album/${a.topAlbum.id}`} className="group rounded-3xl border bg-[var(--color-surface)] p-6 transition hover:border-[color:var(--color-accent)]/40">
            <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <Disc3 className="h-4 w-4" /> Álbum favorito suyo
            </h2>
            <div className="flex items-center gap-4">
              {a.topAlbum.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.topAlbum.imageUrl} alt="" className="h-20 w-20 rounded-xl object-cover shadow-lg transition group-hover:scale-105" />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-[var(--color-surface-2)]"><Disc3 className="h-8 w-8 text-[var(--color-muted)]" /></div>
              )}
              <div>
                <p className="text-lg font-bold text-white">{a.topAlbum.name}</p>
                <p className="text-sm" style={{ color: accent }}>{a.topAlbum.plays} reproducciones</p>
                <p className="mt-1 text-[11px] text-[var(--color-muted)] transition group-hover:text-white">Ver tu viaje por el álbum →</p>
              </div>
            </div>
          </Link>
        )}
      </section>
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
