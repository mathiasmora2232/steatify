'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Flame,
  RotateCcw,
  Gem,
  Moon,
  Sparkles,
  Minus,
  Clock,
  CalendarHeart,
  Music2,
  Flame as Streak,
  Hash,
  Percent,
  SkipForward,
  Headphones,
  CalendarDays,
  Timer,
  Disc3,
  UserRound,
  Radio,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { api, type ExploreTrack } from '@/lib/api';
import { CountUp } from '@/components/CountUp';

const STATE: Record<string, { label: string; color: string; icon: LucideIcon }> = {
  new: { label: 'Nueva', color: '#7c5cff', icon: Sparkles },
  obsession: { label: 'Obsesión actual', color: '#f59e0b', icon: Flame },
  comeback: { label: 'Regresó', color: '#fbbf24', icon: RotateCcw },
  classic: { label: 'Clásico personal', color: '#1db954', icon: Gem },
  dormant: { label: 'Dormida', color: '#64748b', icon: Moon },
  steady: { label: 'Constante', color: '#38bdf8', icon: Minus },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMonth = (ym: string) => {
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString('es', { month: 'long', year: 'numeric' });
};

export default function SongProfilePage() {
  const { trackId } = useParams<{ trackId: string }>();
  const router = useRouter();
  const { data: p, isLoading, error } = useSWR(trackId ? `song:${trackId}` : null, () => api.songProfile(trackId));

  if (isLoading) return <div className="mx-auto h-96 max-w-3xl animate-pulse rounded-3xl border bg-[var(--color-surface)]" />;
  if (error || !p)
    return (
      <div className="mx-auto max-w-2xl">
        <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          No encontramos historial para esta canción.
        </p>
      </div>
    );

  const maxYear = Math.max(...p.byYear.map((y) => y.plays), 1);
  const accent = STATE[p.states[0]]?.color ?? '#1db954';

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <button onClick={() => router.back()} className="mb-4 flex items-center gap-1 text-sm text-[var(--color-muted)] transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Volver
      </button>

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-6 flex items-center gap-5 overflow-hidden rounded-3xl border p-6"
        style={{ background: `radial-gradient(500px 220px at 80% 0%, ${accent}22, transparent), var(--color-surface)` }}
      >
        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.imageUrl} alt="" className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-lg" />
        ) : (
          <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl" style={{ background: `${accent}22` }}>
            <Music2 className="h-10 w-10" style={{ color: accent }} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Song Profile</p>
          <h1 className="truncate text-3xl font-black text-white">{p.name}</h1>
          <p className="text-[var(--color-muted)]">{p.artist ?? '—'}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {p.states.map((st) => {
              const m = STATE[st];
              if (!m) return null;
              return (
                <span key={st} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: `${m.color}1f`, color: m.color }}>
                  <m.icon className="h-3.5 w-3.5" /> {m.label}
                </span>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Tu historia */}
      <section className="mb-6 grid grid-cols-3 gap-4">
        <Big value={p.totalPlays} label="reproducciones" accent={accent} />
        <Big value={p.totalHours} suffix="h" label="juntos" accent={accent} />
        <Big value={p.longestStreakDays} suffix="d" label="racha más larga" accent={accent} />
      </section>

      <p className="mb-6 rounded-2xl border bg-[var(--color-surface)] px-5 py-4 text-sm text-[var(--color-text)]">
        La escuchaste por primera vez el <strong>{fmtDate(p.firstListenAt)}</strong> y por última vez{' '}
        <strong>{p.daysSinceLast === 0 ? 'hoy' : `hace ${p.daysSinceLast} días`}</strong>. Llevan{' '}
        <strong>{p.totalHours} horas</strong> juntos — es tu canción{' '}
        <strong style={{ color: accent }}>#{p.allTimeRank}</strong> de {p.totalRankedTracks.toLocaleString()}, y representa el{' '}
        <strong>{p.pctOfLife}%</strong> de toda tu vida musical.
      </p>

      {/* Números globales */}
      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tus números con esta canción</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat icon={Music2} color={accent} label="Reproducciones" value={p.totalPlays.toLocaleString()} />
          <Stat icon={Timer} color={accent} label="Minutos" value={p.totalMinutes.toLocaleString()} sub={`${p.totalHours}h reales`} />
          <Stat icon={Headphones} color={accent} label="Horas juntos" value={`${p.totalHours}h`} />
          <Stat icon={CalendarDays} color={accent} label="Días distintos" value={p.distinctDays.toLocaleString()} sub="que sonó" />
          <Stat icon={Hash} color={accent} label="Rank histórico" value={`#${p.allTimeRank}`} sub={`de ${p.totalRankedTracks.toLocaleString()}`} />
          <Stat icon={Percent} color={accent} label="% de tu vida" value={`${p.pctOfLife}%`} sub="de tus plays" />
          <Stat icon={SkipForward} color={accent} label="Saltos" value={p.skips.toLocaleString()} sub={`${p.skipRate}% skip rate`} />
          <Stat icon={Clock} color={accent} label="Últimos 30 días" value={p.recent30.toLocaleString()} sub="plays" />
        </div>
      </section>

      {/* Timeline por año */}
      <section className="mb-6 rounded-3xl border bg-[var(--color-surface)] p-6">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu historia, año a año</h2>
        <div className="flex items-end gap-4">
          {p.byYear.map((y, i) => (
            <div key={y.year} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-white">{y.plays}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(y.plays / maxYear) * 140 + 6}px` }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
                className="w-full rounded-t-lg"
                style={{ background: `linear-gradient(180deg, ${accent}, ${accent}55)` }}
              />
              <span className="text-xs text-[var(--color-muted)]">{y.year}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Stats grid */}
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={CalendarHeart} color={accent} label="Mes dominante" value={p.peakMonth ? fmtMonth(p.peakMonth.ym) : '—'} sub={p.peakMonth ? `${p.peakMonth.plays} plays` : undefined} />
        <Stat icon={Clock} color={accent} label="Hora favorita" value={p.favoriteHour != null ? `${String(p.favoriteHour).padStart(2, '0')}:00` : '—'} />
        <Stat icon={Streak} color={accent} label="Racha más larga" value={`${p.longestStreakDays} días`} sub="seguidos" />
        <Stat icon={Moon} color={accent} label="Silencio más largo" value={p.maxGapDays > 0 ? `${p.maxGapDays} días` : '—'} sub="sin sonar" />
      </section>

      <ExploreSection profile={p} accent={accent} />
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

function Stat({ icon: IconCmp, color, label, value, sub }: { icon: LucideIcon; color: string; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-4">
      <IconCmp className="mb-2 h-4 w-4" style={{ color }} />
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="truncate text-sm font-bold capitalize text-white">{value}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)]">{sub}</p>}
    </div>
  );
}

function ExploreSection({ profile, accent }: { profile: { artist: string | null; artistId: string | null; album: { id: string; name: string; imageUrl: string | null } | null; explore: { sameArtist: ExploreTrack[]; sameAlbum: ExploreTrack[]; nearby: ExploreTrack[] } }; accent: string }) {
  const hasTracks = profile.explore.sameArtist.length > 0 || profile.explore.sameAlbum.length > 0 || profile.explore.nearby.length > 0;
  if (!hasTracks && !profile.artistId && !profile.album) return null;

  return (
    <section className="mt-6 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Sigue explorando</h2>
        <span className="text-[11px] text-[var(--color-muted)]">abre otra puerta</span>
      </div>

      {(profile.artistId || profile.album) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {profile.artistId && (
            <Link href={`/dashboard/artist/${profile.artistId}`} className="group flex items-center gap-3 rounded-2xl border bg-[var(--color-surface)] p-3 transition hover:border-white/20">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}1f`, color: accent }}>
                <UserRound className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Artista</p>
                <p className="truncate text-sm font-bold text-white">{profile.artist ?? 'Ver artista'}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover:text-white" />
            </Link>
          )}
          {profile.album && (
            <Link href={`/dashboard/album/${profile.album.id}`} className="group flex items-center gap-3 rounded-2xl border bg-[var(--color-surface)] p-3 transition hover:border-white/20">
              {profile.album.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.album.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}1f`, color: accent }}>
                  <Disc3 className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Álbum</p>
                <p className="truncate text-sm font-bold text-white">{profile.album.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover:text-white" />
            </Link>
          )}
        </div>
      )}

      <ExploreRail title="Más de este artista" icon={UserRound} tracks={profile.explore.sameArtist} accent={accent} />
      <ExploreRail title="Del mismo álbum" icon={Disc3} tracks={profile.explore.sameAlbum} accent={accent} />
      <ExploreRail title="Suelen sonar cerca" icon={Radio} tracks={profile.explore.nearby} accent={accent} />
    </section>
  );
}

function ExploreRail({ title, icon: IconCmp, tracks, accent }: { title: string; icon: LucideIcon; tracks: ExploreTrack[]; accent: string }) {
  if (tracks.length === 0) return null;
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-4">
      <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <IconCmp className="h-4 w-4" style={{ color: accent }} /> {title}
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {tracks.map((t) => (
          <Link key={t.trackId} href={`/dashboard/song/${t.trackId}`} className="group w-36 shrink-0 rounded-2xl border border-transparent p-2 transition hover:border-white/10 hover:bg-[var(--color-surface-2)]/40">
            {t.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={t.imageUrl} alt="" className="mb-2 aspect-square w-full rounded-xl object-cover transition group-hover:scale-[1.02]" />
            ) : (
              <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-xl bg-[var(--color-surface-2)]">
                <Music2 className="h-7 w-7 text-[var(--color-muted)]" />
              </div>
            )}
            <p className="line-clamp-2 min-h-9 text-sm font-semibold leading-tight text-white">{t.name}</p>
            <p className="mt-1 truncate text-[11px] text-[var(--color-muted)]">{t.artist ?? '—'}</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>{t.plays} plays</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
