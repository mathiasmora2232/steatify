'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { HomeHero } from '@/components/HomeHero';
import { ArtistCarousel } from '@/components/ArtistCarousel';
import { SmartStat } from '@/components/SmartStat';
import { UniverseCard } from '@/components/UniverseCard';
import { RankCard } from '@/components/RankCard';
import { RecentFeed } from '@/components/RecentFeed';
import { EventsFeed } from '@/components/EventsFeed';
import { AdnDual } from '@/components/AdnDual';
import { EvolutionAdn } from '@/components/EvolutionAdn';
import { SteatifyBrain } from '@/components/SteatifyBrain';
import { HighlightCard } from '@/components/HighlightCard';
import { gamerType } from '@/lib/steam-derive';
import { Clock, Users, Disc3, Gamepad2, Mic2, Flame, GitCompareArrows, ArrowRight, CalendarDays, Trophy } from 'lucide-react';
import { I } from '@/lib/icons';

const C = { music: '#1db954', violet: '#7c5cff', pink: '#ff5d8f', cyan: '#38bdf8', gaming: '#7c5cff' };

export default function DashboardPage() {
  const { data: user, error } = useSWR('me', api.me);
  // Live-ish: refresh "hoy", el feed reciente y el estado cada 45s.
  const today = useSWR('summary:today', () => api.summary('today'), { refreshInterval: 90_000 });
  const month = useSWR('summary:30d', () => api.summary('30d'));
  const topTracks = useSWR('top:tracks:30d', () => api.top('tracks', '30d', 10));
  const topArtists = useSWR('top:artists:30d', () => api.top('artists', '30d', 10));
  const dna = useSWR('dna', api.musicDna);
  const steam = useSWR('steam:stats', api.steamStats);
  const eras = useSWR('eras', api.eras);
  const recent = useSWR('recent:feed', () => api.recentFeed(40), { refreshInterval: 90_000 });
  const activity = useSWR('activity-state', api.activityState, { refreshInterval: 60_000 });
  const weekly = useSWR('weekly-recap', api.weeklyRecap);
  const momentum = useSWR('steam:momentum', api.steamMomentum);
  const library = useSWR('steam:library', api.steamLibrary);
  const genres = useSWR('steam:genres', api.steamGenres);

  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .setTimezone(-new Date().getTimezoneOffset())
      .then(() => today.mutate())
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSync() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      await api.syncNow();
      setSyncMsg('Sincronización en cola — en unos segundos refresca para ver tus datos.');
    } catch {
      setSyncMsg('No se pudo sincronizar.');
    } finally {
      setSyncing(false);
    }
  }

  if (error)
    return (
      <div className="text-[var(--color-muted)]">
        No estás conectado.{' '}
        <Link href="/login" className="text-[var(--color-accent)]">
          Inicia sesión
        </Link>
        .
      </div>
    );

  const t = today.data;
  const m = month.data;
  const steamHours = steam.data?.totalHours ?? 0;

  const eraTitle = eras.data?.[0]?.title ?? dna.data?.archetypes[0]?.label ?? null;
  const eraText = [eraTitle, steam.data?.gameCount ? 'Gamer' : null].filter(Boolean).join(' · ') || null;

  const avgDaily = m ? Math.round(m.minutes / 30) : 0;
  const todayDelta = avgDaily > 0 && t ? Math.round(((t.minutes - avgDaily) / avgDaily) * 100) : null;
  // El juego REALMENTE jugado más reciente (por fecha de última partida), no el
  // de más horas en 2 semanas — por eso antes salía Paralives.
  const recentGame =
    [...(steam.data?.recentGames ?? [])].sort(
      (a, b) => new Date(b.lastPlayedAt ?? 0).getTime() - new Date(a.lastPlayedAt ?? 0).getTime(),
    )[0] ??
    steam.data?.topGames?.[0] ??
    null;

  const gType =
    steam.data && library.data
      ? gamerType(steam.data, library.data, genres.data?.genres ?? [], momentum.data?.resumed.length ?? 0).top
      : null;

  // Destacados con imagen — datos vivos para la fila superior.
  const topArtist0 = topArtists.data?.[0] ?? null;
  const topTrack0 = topTracks.data?.[0] ?? null;
  const obsession = (() => {
    const m = new Map<string, { name: string; artist: string; image: string | null; n: number }>();
    for (const p of recent.data ?? []) {
      const k = `${p.name}|${p.artist}`;
      const e = m.get(k) ?? { name: p.name, artist: p.artist, image: p.imageUrl, n: 0 };
      e.n += 1;
      m.set(k, e);
    }
    const top = [...m.values()].sort((a, b) => b.n - a.n)[0];
    return top && top.n >= 2 ? top : null;
  })();

  return (
    <div className="mx-auto max-w-7xl pb-10">
      {syncMsg && (
        <p className="mb-4 rounded-xl border bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-muted)]">
          {syncMsg}
        </p>
      )}

      {/* ROW 1 — Hero */}
      <div className="mb-6">
        <HomeHero
          name={user?.displayName ?? ''}
          eraText={eraText}
          topArtist={m?.topArtist ?? null}
          lastSyncedAt={user?.lastSyncedAt}
          syncing={syncing}
          onSync={handleSync}
        />
      </div>

      {/* DESTACADOS — datos vivos con imágenes */}
      <section className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        {topArtist0 && (
          <HighlightCard
            icon={Mic2} kicker="Artista del momento" color={C.music}
            image={topArtist0.imageUrl} name={topArtist0.name} rank={1}
            href={`/dashboard/artist/${topArtist0.id}`}
            stats={[{ value: topArtist0.plays, label: 'reproduc.' }, { value: `${topArtist0.minutes}m`, label: 'minutos' }]}
          />
        )}
        {obsession ? (
          <HighlightCard
            icon={Flame} kicker="Tu obsesión" color={C.pink}
            image={obsession.image} name={obsession.name} subtitle={obsession.artist}
            stats={[{ value: `${obsession.n}×`, label: 'en tus recientes' }]} delay={0.05}
          />
        ) : topTrack0 && (
          <HighlightCard
            icon={Flame} kicker="Tu obsesión" color={C.pink}
            image={topTrack0.imageUrl} name={topTrack0.name} subtitle={topTrack0.subtitle ?? null}
            href={`/dashboard/song/${topTrack0.id}`}
            stats={[{ value: topTrack0.plays, label: 'reproduc.' }]} delay={0.05}
          />
        )}
        {recentGame && (
          <HighlightCard
            icon={Gamepad2} kicker="Tu juego" color={C.gaming}
            image={recentGame.headerUrl} name={recentGame.name}
            href={`/dashboard/steam/game/${recentGame.appId}`}
            stats={[
              { value: `${recentGame.hours2Weeks > 0 ? recentGame.hours2Weeks : recentGame.hoursForever}h`, label: recentGame.hours2Weeks > 0 ? '2 semanas' : 'histórico' },
            ]} delay={0.1}
          />
        )}
      </section>

      {/* ROW 2 — Smart stats */}
      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <SmartStat icon={I.minutes} label="Minutos hoy" numericValue={t?.minutes ?? 0} sub={avgDaily ? `vs tu promedio ${avgDaily}` : 'minutos'} delta={todayDelta} color={C.music} />
        <SmartStat icon={I.music} label="Canciones hoy" numericValue={t?.plays ?? 0} sub={t?.uniqueTracks ? `${t.uniqueTracks} distintas` : 'reproducciones'} color={C.violet} delay={0.05} />
        <SmartStat icon={I.topArtist} label="Artista de hoy" value={t?.topArtist?.name ?? '—'} sub={t?.topArtist ? `${t.topArtist.plays} reproducciones hoy` : 'aún nada hoy'} color={C.music} delay={0.1} />
        <SmartStat icon={I.mood} label="Estado de actividad" value={activity.data?.label ?? '—'} sub={activity.data?.reason ?? 'tus últimas 24h'} color={C.cyan} delay={0.15} />
        <SmartStat icon={I.gaming} label="Gaming" value={recentGame ? `${recentGame.hours2Weeks || recentGame.hoursForever} h` : '—'} sub={recentGame?.name ?? 'conecta Steam'} color={C.gaming} delay={0.2} />
      </section>

      {/* ROW 2.5 — Hoy en detalle */}
      <section className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <SmartStat icon={Clock} label="Horas hoy" value={`${((t?.minutes ?? 0) / 60).toFixed(1)} h`} sub={`${(t?.minutes ?? 0).toLocaleString()} min`} color={C.music} />
        <SmartStat icon={Users} label="Artistas hoy" numericValue={t?.uniqueArtists ?? 0} sub="distintos hoy" color={C.cyan} delay={0.05} />
        <SmartStat icon={Disc3} label="Álbumes hoy" numericValue={t?.uniqueAlbums ?? 0} sub="distintos hoy" color={C.violet} delay={0.1} />
        <SmartStat icon={Gamepad2} label="Gaming hoy" value={`${activity.data?.signals.gamingHours ?? 0} h`} sub="en Steam (24h)" color={C.gaming} delay={0.15} />
      </section>

      <section className="mb-6">
        <ArtistCarousel title="Tus artistas · este mes" items={topArtists.data ?? []} loading={topArtists.isLoading} />
      </section>

      <section className="mb-6">
        <WeekSummaryEntry
          minutes={weekly.data?.thisWeek.minutes ?? 0}
          plays={weekly.data?.thisWeek.plays ?? 0}
          gamingHours={weekly.data?.thisWeek.gamingHours ?? 0}
          topArtist={weekly.data?.topArtist?.name ?? null}
          obsession={weekly.data?.obsessionTrack?.name ?? topTrack0?.name ?? null}
          isRecord={weekly.data?.isRecordWeek ?? false}
          roseGame={momentum.data?.rose?.[0]?.name ?? null}
        />
      </section>

      {/* Historial reciente */}
      <section className="mb-6">
        <RecentFeed data={(recent.data ?? []).slice(0, 12)} />
      </section>

      {/* Changelog musical */}
      <section className="mb-6">
        <EventsFeed limit={8} />
      </section>

      {/* ROW 4 — Universe + Rankings */}
      <section className="mb-6">
        <UniverseCard
          musicMinutes={m?.minutes ?? 0}
          gamingHours={steamHours}
          label={dna.data?.hasData ? (dna.data.archetypes[0]?.label ?? null) : null}
          games={steam.data?.gameCount}
          played={steam.data?.playedCount}
          unplayed={steam.data?.unplayedCount}
        />
      </section>
      {/* Semana actual: top canciones + top artistas + top juegos (música + gaming) */}
      <section className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RankCard title="Top canciones · este mes" items={topTracks.data ?? []} loading={topTracks.isLoading} linkBase="/dashboard/song" />
        <RankCard title="Top artistas · este mes" items={topArtists.data ?? []} loading={topArtists.isLoading} linkBase="/dashboard/artist" />
        <TopGames games={steam.data?.topGames ?? []} />
      </section>

      {/* ── Tu identidad · análisis profundo (secundario, no roba la zona principal) ── */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu identidad · análisis profundo</h2>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <Link href="/dashboard/versus" className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium text-[var(--color-accent)] transition hover:gap-2">
          <GitCompareArrows className="h-3.5 w-3.5" /> Tú vs Tú <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="space-y-6">
        <SteatifyBrain />
        {(dna.data?.type || gType) && <AdnDual musical={dna.data?.type ?? null} gamer={gType} />}
        <EvolutionAdn />
      </div>
    </div>
  );
}

function WeekSummaryEntry({
  minutes,
  plays,
  gamingHours,
  topArtist,
  obsession,
  isRecord,
  roseGame,
}: {
  minutes: number;
  plays: number;
  gamingHours: number;
  topArtist: string | null;
  obsession: string | null;
  isRecord: boolean;
  roseGame: string | null;
}) {
  return (
    <Link
      href="/dashboard/week"
      className="group block overflow-hidden rounded-3xl border bg-[var(--color-surface)] p-5 transition hover:border-[var(--color-accent)]/50"
      style={{
        background:
          'radial-gradient(480px 180px at 0% 0%, rgba(29,185,84,0.12), transparent), radial-gradient(420px 180px at 100% 0%, rgba(124,92,255,0.14), transparent), var(--color-surface)',
      }}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
            <CalendarDays className="h-4 w-4" /> Resumen semanal
          </p>
          <h2 className="text-2xl font-black text-white">
            Tu semana en música + gaming
          </h2>
          <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
            Wrapped semanal, insights, tu día, energía y recientes agrupados sin llenar la portada.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4 lg:w-[560px]">
          <MiniWeekStat icon={Clock} label="Música" value={`${(minutes / 60).toFixed(1)} h`} sub={`${plays.toLocaleString()} plays`} />
          <MiniWeekStat icon={Gamepad2} label="Gaming" value={`${gamingHours} h`} sub={roseGame ?? 'Steam'} />
          <MiniWeekStat icon={Mic2} label="Top artista" value={topArtist ?? '—'} sub={isRecord ? 'récord' : 'semana'} />
          <MiniWeekStat icon={Trophy} label="Obsesión" value={obsession ?? '—'} sub="top #1" />
        </div>
        <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition group-hover:gap-2">
          Ver resumen <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function MiniWeekStat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="min-w-0 rounded-2xl border bg-black/15 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        <Icon className="h-3.5 w-3.5 text-[var(--color-accent)]" /> {label}
      </p>
      <p className="truncate text-sm font-black text-white" title={value}>{value}</p>
      <p className="truncate text-[11px] text-[var(--color-muted)]" title={sub}>{sub}</p>
    </div>
  );
}

function TopGames({ games }: { games: { appId: number; name: string; headerUrl: string; hoursForever: number }[] }) {
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <I.gaming className="h-3.5 w-3.5" /> Top juegos · histórico
      </h3>
      {games.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Conecta tu Steam para ver tus juegos.</p>
      ) : (
        <div className="space-y-2.5">
          {games.slice(0, 10).map((g, i) => (
            <Link key={g.appId} href={`/dashboard/steam/game/${g.appId}`} className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-[var(--color-surface-2)]/50">
              <span className="w-4 shrink-0 text-right text-xs font-bold tabular-nums text-[var(--color-muted)]">{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={g.headerUrl} alt="" loading="lazy" className="h-8 w-[58px] shrink-0 rounded-md object-cover" />
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{g.name}</p>
              <span className="shrink-0 text-xs font-bold tabular-nums text-[var(--color-accent)]">{g.hoursForever}h</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
