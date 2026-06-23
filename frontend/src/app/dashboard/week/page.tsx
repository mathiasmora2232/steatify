'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Disc3,
  Gamepad2,
  Headphones,
  Lightbulb,
  Medal,
  Mic2,
  Moon,
  Music,
  Sparkles,
  Trophy,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { api, type RecentPlay, type SteamGame, type TopItem, type Wrapped } from '@/lib/api';
import { WeeklyRecap } from '@/components/WeeklyRecap';
import { DayTimeline } from '@/components/DayTimeline';
import { EnergyChart } from '@/components/EnergyChart';
import { RankCard } from '@/components/RankCard';

const C = { music: '#1db954', violet: '#7c5cff', pink: '#ff5d8f', cyan: '#38bdf8', amber: '#f59e0b' };

export default function WeekPage() {
  const weekly = useSWR('weekly-recap', api.weeklyRecap);
  const wrapped = useSWR('wrapped:week', () => api.wrapped('week').catch(() => null));
  const tracks = useSWR('top:tracks:7d', () => api.top('tracks', '7d', 5));
  const artists = useSWR('top:artists:7d', () => api.top('artists', '7d', 5));
  const albums = useSWR('top:albums:7d', () => api.top('albums', '7d', 5));
  const recent = useSWR('recent:week-deep', () => api.recentFeed(180), { refreshInterval: 90_000 });
  const steam = useSWR('steam:stats', api.steamStats);
  const momentum = useSWR('steam:momentum', api.steamMomentum);

  const recentGame =
    [...(steam.data?.recentGames ?? [])].sort(
      (a, b) => new Date(b.lastPlayedAt ?? 0).getTime() - new Date(a.lastPlayedAt ?? 0).getTime(),
    )[0] ??
    steam.data?.topGames?.[0] ??
    null;

  const week = weekly.data;
  const story = wrapped.data;
  const topTrack = tracks.data?.[0] ?? null;
  const topArtist = artists.data?.[0] ?? null;
  const topAlbum = albums.data?.[0] ?? null;
  const topGame = bestWeeklyGame(momentum.data?.rose?.[0] ?? null, recentGame, steam.data?.topGames?.[0] ?? null);

  const insights = useMemo(() => buildInsights(week, story, topTrack, topArtist, topGame), [week, story, topTrack, topArtist, topGame]);

  return (
    <div className="mx-auto max-w-7xl pb-10">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-[var(--color-muted)] transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Dashboard
        </Link>
        <Link
          href="/dashboard/wrapped"
          className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm text-[var(--color-accent)] transition hover:bg-[var(--color-surface)]"
        >
          Wrapped completo <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <WeekStories week={week} story={story} topTrack={topTrack} topArtist={topArtist} topGame={topGame} />
      <WeekHero week={week} story={story} topTrack={topTrack} topArtist={topArtist} topGame={topGame} />

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <HeroPick
          icon={Music}
          label="Top canción"
          title={topTrack?.name ?? week?.obsessionTrack?.name ?? 'Sin top todavía'}
          sub={topTrack?.subtitle ?? week?.obsessionTrack?.artist ?? 'se arma con tus últimas reproducciones'}
          image={topTrack?.imageUrl ?? null}
          color={C.music}
          href={topTrack ? `/dashboard/song/${topTrack.id}` : undefined}
        />
        <HeroPick
          icon={Mic2}
          label="Top artista"
          title={topArtist?.name ?? week?.topArtist?.name ?? 'Sin artista dominante'}
          sub={topArtist ? `${topArtist.plays} reproducciones` : week?.topArtist ? `${week.topArtist.plays} reproducciones` : 'esta semana'}
          image={topArtist?.imageUrl ?? null}
          color={C.cyan}
          href={topArtist ? `/dashboard/artist/${topArtist.id}` : undefined}
        />
        <HeroPick
          icon={Disc3}
          label="Top álbum"
          title={topAlbum?.name ?? 'Álbum en construcción'}
          sub={topAlbum?.subtitle ?? 'cuando haya más historial'}
          image={topAlbum?.imageUrl ?? null}
          color={C.violet}
        />
        <HeroPick
          icon={Gamepad2}
          label="Top gaming"
          title={topGame?.name ?? 'Conecta Steam'}
          sub={topGame ? `${topGame.hours2Weeks || topGame.hoursForever} h` : 'para mezclar música + gaming'}
          image={topGame?.headerUrl ?? null}
          color={C.pink}
          href={topGame ? `/dashboard/steam/game/${topGame.appId}` : undefined}
        />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AiInsightPanel narrative={story?.narrative ?? null} insights={insights} />
        </div>
        <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
          <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Medal className="h-4 w-4 text-[var(--color-accent)]" /> Tops 5 semanales
          </p>
          <MiniTop title="Canciones" items={tracks.data ?? []} hrefBase="/dashboard/song" />
          <MiniTop title="Artistas" items={artists.data ?? []} hrefBase="/dashboard/artist" />
        </div>
      </section>

      {week && (
        <section className="mb-6">
          <WeeklyRecap data={week} rose={momentum.data?.rose?.[0] ?? null} resumed={momentum.data?.resumed?.[0] ?? null} />
        </section>
      )}

      <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <DayTimeline recent={recent.data ?? []} gamingTop={recentGame?.name ?? null} />
        </div>
        <div className="lg:col-span-2">
          <EnergyChart />
        </div>
        <div className="lg:col-span-1">
          <WeekPulse week={week} story={story} recentCount={recent.data?.length ?? 0} />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentByDays data={recent.data ?? []} />
        </div>
        <div className="space-y-6">
          <RankCard title="Top canciones · semana" items={tracks.data ?? []} loading={tracks.isLoading} linkBase="/dashboard/song" />
          <RankCard title="Top artistas · semana" items={artists.data ?? []} loading={artists.isLoading} linkBase="/dashboard/artist" />
        </div>
      </section>
    </div>
  );
}

function WeekStories({
  week,
  story,
  topTrack,
  topArtist,
  topGame,
}: {
  week: Awaited<ReturnType<typeof api.weeklyRecap>> | undefined;
  story: Wrapped | null | undefined;
  topTrack: TopItem | null;
  topArtist: TopItem | null;
  topGame: SteamGame | null;
}) {
  const minutes = week?.thisWeek.minutes ?? story?.music.minutes ?? 0;
  const cards = [
    {
      eyebrow: 'Historia 1',
      title: week?.isRecordWeek ? 'Rompiste tu propio récord semanal' : 'Así sonó tu semana',
      body: `${(minutes / 60).toFixed(1)} horas de música y ${(week?.thisWeek.plays ?? story?.music.plays ?? 0).toLocaleString()} reproducciones.`,
      image: topTrack?.imageUrl ?? topArtist?.imageUrl ?? null,
      icon: Headphones,
      color: C.music,
      href: topTrack ? `/dashboard/song/${topTrack.id}` : undefined,
    },
    {
      eyebrow: 'Historia 2',
      title: topTrack?.name ?? week?.obsessionTrack?.name ?? 'Tu canción aún se está formando',
      body: topTrack?.subtitle ?? week?.obsessionTrack?.artist ?? 'Cuando haya más plays, esta tarjeta se vuelve tu obsesión semanal.',
      image: topTrack?.imageUrl ?? null,
      icon: Music,
      color: C.pink,
      href: topTrack ? `/dashboard/song/${topTrack.id}` : undefined,
    },
    {
      eyebrow: 'Historia 3',
      title: topArtist?.name ?? week?.topArtist?.name ?? 'Tu artista guía',
      body: topArtist ? `${topArtist.plays} reproducciones esta semana.` : 'El artista que más coloreó tu semana aparecerá aquí.',
      image: topArtist?.imageUrl ?? null,
      icon: Mic2,
      color: C.cyan,
      href: topArtist ? `/dashboard/artist/${topArtist.id}` : undefined,
    },
    {
      eyebrow: 'Historia 4',
      title: topGame?.name ?? 'Tu lado gaming',
      body: topGame
        ? `${topGame.hours2Weeks || topGame.hoursForever} horas para mezclar tu semana musical con Steam.`
        : 'Con Steam conectado, esta historia mezcla juegos y música en el mismo resumen.',
      image: topGame?.headerUrl ?? null,
      icon: Gamepad2,
      color: C.violet,
      href: topGame ? `/dashboard/steam/game/${topGame.appId}` : undefined,
    },
  ];

  return (
    <section className="mb-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">Resumen semanal · historias</h1>
        <span className="rounded-full border px-3 py-1 text-xs text-[var(--color-muted)]">primero lo importante</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <StoryCard key={card.eyebrow} {...card} />
        ))}
      </div>
    </section>
  );
}

function StoryCard({
  eyebrow,
  title,
  body,
  image,
  icon: Icon,
  color,
  href,
}: {
  eyebrow: string;
  title: string;
  body: string;
  image: string | null;
  icon: LucideIcon;
  color: string;
  href?: string;
}) {
  const inner = (
    <div
      className="group relative flex min-h-[420px] overflow-hidden rounded-3xl border p-5 transition hover:border-[var(--color-accent)]/50"
      style={{ background: `linear-gradient(180deg, ${color}22, rgba(8,9,14,0.98))` }}
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45 transition duration-500 group-hover:scale-105" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-black/90" />
      <div className="relative mt-auto min-w-0">
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[10px] font-black uppercase tracking-widest" style={{ color }}>
          <Icon className="h-3.5 w-3.5" /> {eyebrow}
        </span>
        <h2 className="text-3xl font-black leading-none text-white">{title}</h2>
        <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-white/78">{body}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function WeekHero({
  week,
  story,
  topTrack,
  topArtist,
  topGame,
}: {
  week: Awaited<ReturnType<typeof api.weeklyRecap>> | undefined;
  story: Wrapped | null | undefined;
  topTrack: TopItem | null;
  topArtist: TopItem | null;
  topGame: SteamGame | null;
}) {
  const minutes = week?.thisWeek.minutes ?? story?.music.minutes ?? 0;
  const gaming = week?.thisWeek.gamingHours ?? story?.gaming?.hours ?? 0;
  const plays = week?.thisWeek.plays ?? story?.music.plays ?? 0;
  const image = topTrack?.imageUrl ?? topArtist?.imageUrl ?? topGame?.headerUrl ?? null;

  return (
    <section
      className="relative mb-6 overflow-hidden rounded-3xl border p-6 sm:p-8"
      style={{
        background:
          'radial-gradient(720px 320px at 10% 0%, rgba(29,185,84,0.2), transparent), radial-gradient(620px 280px at 100% 20%, rgba(124,92,255,0.23), transparent), linear-gradient(160deg,#0b0d12,#090a0f)',
      }}
    >
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="pointer-events-none absolute right-0 top-0 h-full w-1/2 object-cover opacity-10 blur-sm" />
      )}
      <div className="relative max-w-3xl">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
          <CalendarDays className="h-4 w-4" /> Resumen de semana
        </p>
        <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl">Tu semana Sonora</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-muted)]">
          Una vista corta para engancharte: música, gaming, tops e insights primero. El detalle completo vive abajo, sin volver infinito el dashboard.
        </p>
      </div>
      <div className="relative mt-7 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric icon={Clock} label="Música" value={`${(minutes / 60).toFixed(1)} h`} sub={`${plays.toLocaleString()} reproducciones`} color={C.music} />
        <Metric icon={Gamepad2} label="Gaming" value={`${gaming} h`} sub="Steam esta semana" color={C.violet} />
        <Metric icon={Users} label="Artistas" value={`${week?.thisWeek.uniqueArtists ?? story?.music.uniqueArtists ?? 0}`} sub="distintos" color={C.cyan} />
        <Metric icon={Trophy} label="Estado" value={week?.isRecordWeek ? 'Récord' : 'Activo'} sub={week?.isRecordWeek ? 'tu mejor semana' : 'pulso semanal'} color={C.amber} />
      </div>
    </section>
  );
}

function HeroPick({
  icon: Icon,
  label,
  title,
  sub,
  image,
  color,
  href,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  sub: string;
  image: string | null;
  color: string;
  href?: string;
}) {
  const content = (
    <div className="group h-full overflow-hidden rounded-3xl border bg-[var(--color-surface)] transition hover:border-[var(--color-accent)]/45">
      <div className="relative h-36 bg-[var(--color-surface-2)]">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center" style={{ color }}>
            <Icon className="h-10 w-10" />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ color }}>
          #1 {label}
        </span>
      </div>
      <div className="p-4">
        <p className="truncate text-lg font-black text-white" title={title}>{title}</p>
        <p className="truncate text-sm text-[var(--color-muted)]" title={sub}>{sub}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

function AiInsightPanel({ narrative, insights }: { narrative: string | null; insights: string[] }) {
  return (
    <div className="h-full rounded-3xl border bg-[var(--color-surface)] p-5">
      <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
        <Sparkles className="h-4 w-4" /> Insights IA
      </p>
      {narrative && <p className="mb-4 rounded-2xl border bg-[var(--color-surface-2)]/30 p-4 text-sm leading-relaxed text-white">{narrative}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {insights.map((insight, i) => (
          <div key={i} className="rounded-2xl border bg-black/10 p-4">
            <Lightbulb className="mb-2 h-4 w-4 text-[var(--color-accent)]" />
            <p className="text-sm leading-relaxed text-[var(--color-text)]">{insight}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTop({ title, items, hrefBase }: { title: string; items: TopItem[]; hrefBase: string }) {
  return (
    <div className="mb-5 last:mb-0">
      <p className="mb-2 text-xs font-semibold text-[var(--color-muted)]">{title}</p>
      <div className="space-y-1.5">
        {items.slice(0, 5).map((item, i) => (
          <Link key={item.id} href={`${hrefBase}/${item.id}`} className="flex items-center gap-2 rounded-xl p-2 transition hover:bg-[var(--color-surface-2)]/55">
            <span className="w-4 shrink-0 text-xs font-bold tabular-nums text-[var(--color-muted)]">{i + 1}</span>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="h-8 w-8 shrink-0 rounded-md object-cover" />
            ) : (
              <div className="h-8 w-8 shrink-0 rounded-md bg-[var(--color-surface-2)]" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{item.name}</p>
              {item.subtitle && <p className="truncate text-xs text-[var(--color-muted)]">{item.subtitle}</p>}
            </div>
            <span className="text-xs tabular-nums text-[var(--color-accent)]">{item.plays}x</span>
          </Link>
        ))}
        {items.length === 0 && <p className="rounded-xl border p-3 text-sm text-[var(--color-muted)]">Sin datos suficientes todavía.</p>}
      </div>
    </div>
  );
}

function WeekPulse({
  week,
  story,
  recentCount,
}: {
  week: Awaited<ReturnType<typeof api.weeklyRecap>> | undefined;
  story: Wrapped | null | undefined;
  recentCount: number;
}) {
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <p className="mb-4 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Zap className="h-4 w-4 text-[var(--color-accent)]" /> Pulso
      </p>
      <div className="space-y-3">
        <Metric icon={Headphones} label="Recientes cargadas" value={recentCount.toLocaleString()} sub="para agrupar por dias" color={C.music} compact />
        <Metric icon={Moon} label="Noche" value={`${week?.vibe.nightPct ?? 0}%`} sub={`${week?.vibe.nightShift ?? 0}% vs normal`} color={C.pink} compact />
        <Metric icon={Sparkles} label="Personalidad" value={story?.personality.label ?? 'Semana viva'} sub={story?.personality.tagline ?? 'se actualiza con sync'} color={C.violet} compact />
      </div>
    </div>
  );
}

function RecentByDays({ data }: { data: RecentPlay[] }) {
  const [visibleDays, setVisibleDays] = useState(5);
  const days = useMemo(() => groupRecentByDay(data), [data]);
  const shown = days.slice(0, visibleDays);

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <CalendarDays className="h-4 w-4 text-[var(--color-accent)]" /> Repros recientes por dia
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Más días visibles sin castigar al plan free.</p>
        </div>
        <span className="rounded-full border px-3 py-1 text-xs text-[var(--color-muted)]">{days.length} días detectados</span>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-sm text-[var(--color-muted)]">Sin reproducciones recientes.</p>
      ) : (
        <div className="space-y-4">
          {shown.map((day) => (
            <div key={day.key} className="rounded-2xl border bg-black/10 p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-white">{day.label}</p>
                  <p className="text-xs text-[var(--color-muted)]">{day.items.length} reproducciones · {day.topArtist ?? 'sin artista dominante'}</p>
                </div>
                <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-xs tabular-nums text-[var(--color-accent)]">
                  {day.items[0] ? formatTime(day.items[0].playedAt) : ''}
                </span>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2">
                {day.items.slice(0, 8).map((p, i) => (
                  <li key={`${p.playedAt}-${i}`} className="flex min-w-0 items-center gap-2 rounded-xl p-1.5 hover:bg-[var(--color-surface-2)]/40">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-md object-cover" />
                    ) : (
                      <div className="h-9 w-9 shrink-0 rounded-md bg-[var(--color-surface-2)]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-white">{p.name}</p>
                      <p className="truncate text-xs text-[var(--color-muted)]">{p.artist}</p>
                    </div>
                    <time className="shrink-0 text-xs tabular-nums text-[var(--color-muted)]">{formatTime(p.playedAt)}</time>
                  </li>
                ))}
              </ul>
              {day.items.length > 8 && (
                <p className="mt-2 text-xs text-[var(--color-muted)]">+{day.items.length - 8} reproducciones más ese día</p>
              )}
            </div>
          ))}
        </div>
      )}

      {visibleDays < days.length && (
        <button
          onClick={() => setVisibleDays((v) => v + 5)}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-surface-2)]"
        >
          Ver más días <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  sub,
  color,
  compact,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  color: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`min-w-0 rounded-2xl border bg-black/15 ${compact ? 'p-3' : 'p-4'}`}
      style={{ boxShadow: `inset 0 0 60px -46px ${color}` }}
    >
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">
        <Icon className="h-3.5 w-3.5" style={{ color }} /> {label}
      </p>
      <p className={`${compact ? 'text-lg' : 'text-2xl'} truncate font-black text-white`} title={value}>{value}</p>
      <p className="truncate text-xs text-[var(--color-muted)]" title={sub}>{sub}</p>
    </div>
  );
}

function buildInsights(
  week: Awaited<ReturnType<typeof api.weeklyRecap>> | undefined,
  story: Wrapped | null | undefined,
  topTrack: TopItem | null,
  topArtist: TopItem | null,
  topGame: SteamGame | null,
) {
  const insights: string[] = [];
  if (week?.deltas.minutesPct != null) {
    const pct = week.deltas.minutesPct;
    insights.push(
      pct >= 0
        ? `Subiste ${pct}% en minutos vs la semana anterior. Esta es una semana de más presencia musical, no solo de reproducciones sueltas.`
        : `Bajaste ${Math.abs(pct)}% en minutos vs la semana anterior. Puede ser una semana más selectiva, con menos ruido de fondo.`,
    );
  }
  if (week?.vibe.nightPct != null) {
    insights.push(`Tu modo nocturno está en ${week.vibe.nightPct}%. Si esto sube, Sonora puede leerte más como soundtrack de cierre del día.`);
  }
  if (topTrack) insights.push(`La canción que más te jaló fue "${topTrack.name}". Si la abres, puedes seguir por artista, álbum y canciones cercanas.`);
  if (topArtist) insights.push(`${topArtist.name} está marcando el color de la semana. Buen punto de entrada para explorar canciones top de ese artista.`);
  if (topGame) insights.push(`${topGame.name} es el puente gaming de la semana. La gracia es que tu resumen no se quede solo en Spotify.`);
  if (story?.personality?.label) insights.push(`Tu etiqueta semanal es ${story.personality.label}: ${story.personality.tagline}`);
  if (insights.length === 0) insights.push('Sincroniza música o Steam y esta pantalla se vuelve un resumen semanal con señales reales.');
  return insights.slice(0, 4);
}

function bestWeeklyGame(rose: (SteamGame & { gainedHours?: number }) | null, recent: SteamGame | null, top: SteamGame | null) {
  return rose ?? recent ?? top;
}

function groupRecentByDay(data: RecentPlay[]) {
  const map = new Map<string, RecentPlay[]>();
  for (const play of data) {
    const key = localDayKey(play.playedAt);
    const group = map.get(key) ?? [];
    group.push(play);
    map.set(key, group);
  }
  return [...map.entries()]
    .map(([key, items]) => {
      const byArtist = new Map<string, number>();
      for (const item of items) byArtist.set(item.artist, (byArtist.get(item.artist) ?? 0) + 1);
      const topArtist = [...byArtist.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      return {
        key,
        label: formatDay(key),
        topArtist,
        items: [...items].sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()),
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

function localDayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDay(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const today = localDayKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDayKey(yesterdayDate.toISOString());
  if (key === today) return 'Hoy';
  if (key === yesterday) return 'Ayer';
  return date.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}
