'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Sparkles,
  TrendingDown,
  RotateCcw,
  Radar,
  Compass,
  Target,
  Skull,
  ListFilter,
  BadgeCheck,
  Rocket,
  Crown,
  Trophy,
  Music2,
  ChevronRight,
} from 'lucide-react';
import { api, type GraveItem, type SongStock, type SongComeback } from '@/lib/api';
import {
  enrichStocks,
  summarize,
  changeCopy,
  pctText,
  trendSpark,
  DIR_META,
  type EnrichedStock,
  type TrendDir,
} from '@/lib/trends-derive';
import { CountUp } from '@/components/CountUp';
import { LineSpark } from '@/components/LineSpark';
import { ConsistencyRing } from '@/components/ConsistencyRing';

const TABS = [
  { k: '7d', label: '7 días', days: 7 },
  { k: '30d', label: '30 días', days: 30 },
  { k: 'month', label: '3 meses', days: 90 },
  { k: 'year', label: 'Año', days: 365 },
];

type Filter = 'all' | TrendDir | 'explosive';
const EXPLOSIVE_PCT = 150;
const FILTERS: { k: Filter; label: string; color?: string }[] = [
  { k: 'all', label: 'Todos' },
  { k: 'up', label: '🔥 En alza', color: DIR_META.up.color },
  { k: 'new', label: '🆕 Nuevos', color: DIR_META.new.color },
  { k: 'explosive', label: '⚡ Explosivos', color: '#fbbf24' },
  { k: 'down', label: '📉 Bajando', color: DIR_META.down.color },
  { k: 'returning', label: '🔁 Regresos', color: DIR_META.returning.color },
];

export default function TrendsPage() {
  const [tab, setTab] = useState('7d');
  const [filter, setFilter] = useState<Filter>('all');
  const days = TABS.find((t) => t.k === tab)?.days ?? 7;
  const winLabel = TABS.find((t) => t.k === tab)?.label ?? '7 días';
  const { data, isLoading } = useSWR(`trends:${days}`, () => api.trends(days), {
    keepPreviousData: true,
  });
  const { data: songs } = useSWR(`songtrends:${days}`, () => api.songTrends(days), {
    keepPreviousData: true,
  });
  const { data: market } = useSWR(`market:${days}`, () => api.trendsMarket(days), {
    keepPreviousData: true,
  });

  const items = useMemo(() => enrichStocks(data?.stocks ?? [], data?.graveyard ?? []), [data]);
  const summary = useMemo(() => summarize(items), [items]);
  const isExplosive = (s: EnrichedStock) => (s.trendPct ?? 0) >= EXPLOSIVE_PCT;
  const matches = (s: EnrichedStock, f: Filter) => (f === 'explosive' ? isExplosive(s) : s.dir === f);
  const shown = filter === 'all' ? items : items.filter((s) => matches(s, filter));

  const counts: Record<Filter, number> = {
    all: items.length,
    new: summary.newCount,
    up: summary.upCount,
    down: summary.downCount,
    returning: summary.returningCount,
    flat: items.filter((s) => s.dir === 'flat').length,
    explosive: items.filter(isExplosive).length,
  };

  return (
    <div className="mx-auto max-w-7xl pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <TrendingUp className="h-7 w-7 text-[var(--color-accent)]" /> Tendencias
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Tu mercado musical en movimiento</p>
        </div>
        <div className="inline-flex gap-1 rounded-full border bg-[var(--color-surface-2)]/40 p-1">
          {TABS.map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                tab === t.k
                  ? 'bg-[var(--color-accent)] font-semibold text-black'
                  : 'text-[var(--color-muted)] hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          Aún no hay suficiente historial para calcular tu mercado. Vuelve en unos días o importa más
          historial.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          {/* Main column */}
          <div className="space-y-6">
            {/* Top-5 movers (no single results) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <TopList
                title="🔥 En alza" color={DIR_META.up.color}
                rows={items.filter((s) => s.dir === 'up').slice(0, 5).map((s) => ({ name: s.name, imageUrl: s.imageUrl, value: pctText(s) }))}
                onAll={() => setFilter('up')}
              />
              <TopList
                title="🆕 Nuevos" color={DIR_META.new.color}
                rows={items.filter((s) => s.dir === 'new').slice(0, 5).map((s) => ({ name: s.name, imageUrl: s.imageUrl, value: `${s.recent}▶` }))}
                onAll={() => setFilter('new')}
              />
              <TopList
                title="⚡ Explosivos" color="#fbbf24"
                rows={items.filter(isExplosive).slice(0, 5).map((s) => ({ name: s.name, imageUrl: s.imageUrl, value: pctText(s) }))}
                onAll={() => setFilter('explosive')}
              />
              <TopList
                title="🔁 Regresos" color={DIR_META.returning.color}
                rows={(market?.comebacks ?? []).slice(0, 5).map((c) => ({ name: c.name, imageUrl: c.imageUrl, value: `${c.daysAway >= 365 ? `${Math.round(c.daysAway / 365)}a` : `${c.daysAway}d`}` }))}
                onAll={() => setFilter('returning')}
              />
            </div>

            {/* Mercado vivo: dominadores · constantes · perdiendo fuerza */}
            {market && (market.dominators.length > 0 || market.constants.length > 0 || market.fading.length > 0) && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <CategoryCard
                  title="👑 Dominadores" color="#fbbf24" icon={Crown}
                  empty="Nadie domina tu top 3 todavía."
                  rows={market.dominators.map((d) => ({ name: d.name, imageUrl: d.imageUrl, value: `${d.months} meses`, sub: 'en tu top 3' }))}
                />
                <CategoryCard
                  title="💎 Constantes" color="#22d3ee" icon={BadgeCheck}
                  empty="Aún sin artistas perpetuos."
                  rows={market.constants.map((d) => ({ name: d.name, imageUrl: d.imageUrl, value: `${d.months} meses`, sub: 'seguidos presente' }))}
                />
                <CategoryCard
                  title="🪦 Perdiendo fuerza" color="#ff5d8f" icon={TrendingDown}
                  empty="Nadie se está apagando ahora."
                  rows={market.fading.map((d) => ({ name: d.name, imageUrl: d.imageUrl, value: `${d.dropPct}%`, sub: `${d.peakPlays}▶ → ${d.recentPlays}▶` }))}
                />
              </div>
            )}

            {/* Radar Sonora */}
            <RadarPanel summary={summary} />

            {/* Premios de la semana */}
            <PremiosBar summary={summary} comebackSong={songs?.comebacks[0] ?? null} />

            {/* Song movers: despegando + comebacks */}
            {(songs?.rising.length || songs?.comebacks.length) ? (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SongCol title="Despegando" icon={Rocket} color="#1db954" empty="Ninguna canción está acelerando ahora.">
                  {(songs?.rising ?? []).slice(0, 5).map((s, i) => (
                    <RisingSong key={s.trackId} s={s} delay={i * 0.04} />
                  ))}
                </SongCol>
                <SongCol title="Regresos" icon={RotateCcw} color="#fbbf24" empty="Ninguna canción volvió de entre los muertos.">
                  {(songs?.comebacks ?? []).slice(0, 5).map((s, i) => (
                    <ComebackSong key={s.trackId} s={s} delay={i * 0.04} />
                  ))}
                </SongCol>
              </div>
            ) : null}

            {/* Artist market */}
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                <ListFilter className="h-4 w-4" /> Artist Market
                {filter !== 'all' && (
                  <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-0.5 text-[10px] capitalize">
                    {FILTERS.find((f) => f.k === filter)?.label}
                  </span>
                )}
              </h2>
              <div className="space-y-3">
                {shown.map((s, i) => (
                  <MarketCard key={s.name} s={s} delay={i * 0.04} winLabel={winLabel} />
                ))}
                {shown.length === 0 && (
                  <p className="rounded-2xl border bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-muted)]">
                    No hay artistas en esta categoría esta semana.
                  </p>
                )}
              </div>
            </section>

            {/* Cementerio */}
            <Graveyard items={data?.graveyard ?? []} />
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Filtros</p>
              <div className="space-y-1">
                {FILTERS.map((f) => (
                  <button
                    key={f.k}
                    onClick={() => setFilter(f.k)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                      filter === f.k ? 'bg-[var(--color-surface-2)] text-white' : 'text-[var(--color-muted)] hover:text-white'
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: f.color ?? 'var(--color-muted)' }} />
                    {f.label}
                    <span className="ml-auto tabular-nums text-xs text-[var(--color-muted)]">{counts[f.k]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Exploración musical</p>
              <div className="flex items-center gap-4">
                <ConsistencyRing value={summary.explorationPct} color="#1db954" size={76} />
                <div className="text-sm">
                  <p className="font-semibold text-[var(--color-accent)]">{summary.newCount} nuevos</p>
                  <p className="text-xs text-[var(--color-muted)]">
                    Estás descubriendo más artistas y sonidos nuevos.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">En alza ahora</p>
              <div className="space-y-2">
                {items.filter((s) => s.dir === 'up' || s.dir === 'returning').slice(0, 5).map((s) => (
                  <div key={s.name} className="flex items-center gap-2 text-sm">
                    <DirDot dir={s.dir} />
                    <span className="truncate text-[var(--color-text)]">{s.name}</span>
                    <span className="ml-auto text-xs font-semibold tabular-nums" style={{ color: DIR_META[s.dir].color }}>
                      {pctText(s)}
                    </span>
                  </div>
                ))}
                {items.filter((s) => s.dir === 'up' || s.dir === 'returning').length === 0 && (
                  <p className="text-xs text-[var(--color-muted)]">Sin subidas esta semana.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Top-5 + category cards ───────────────────── */

interface ListRow {
  name: string;
  imageUrl: string | null;
  value: string;
  sub?: string;
}

function TopList({ title, color, rows, onAll }: { title: string; color: string; rows: ListRow[]; onAll: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col rounded-3xl border bg-[var(--color-surface)] p-4"
    >
      <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>{title}</p>
      {rows.length === 0 ? (
        <p className="flex-1 py-4 text-center text-xs text-[var(--color-muted)]">Sin datos esta ventana.</p>
      ) : (
        <div className="flex-1 space-y-1.5">
          {rows.map((r, i) => (
            <div key={`${r.name}-${i}`} className="flex items-center gap-2">
              <span className="w-3 shrink-0 text-right text-[10px] font-bold tabular-nums text-[var(--color-muted)]">{i + 1}</span>
              <Avatar name={r.name} imageUrl={r.imageUrl} color={color} size={22} />
              <span className="min-w-0 flex-1 truncate text-xs text-white">{r.name}</span>
              <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
      <button onClick={onAll} className="mt-2.5 flex items-center gap-0.5 self-start text-[10px] font-medium text-[var(--color-muted)] transition hover:text-white">
        Ver todos <ChevronRight className="h-3 w-3" />
      </button>
    </motion.div>
  );
}

function CategoryCard({ title, color, icon: Icon, rows, empty }: { title: string; color: string; icon: typeof Crown; rows: ListRow[]; empty: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-[var(--color-surface)] p-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {rows.length === 0 ? (
        <p className="py-3 text-xs text-[var(--color-muted)]">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.slice(0, 5).map((r, i) => (
            <div key={`${r.name}-${i}`} className="flex items-center gap-2">
              <Avatar name={r.name} imageUrl={r.imageUrl} color={color} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{r.name}</p>
                {r.sub && <p className="truncate text-[10px] text-[var(--color-muted)]">{r.sub}</p>}
              </div>
              <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color }}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ───────────────────── Radar panel ───────────────────── */

function RadarPanel({ summary }: { summary: ReturnType<typeof summarize> }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-5 rounded-3xl border bg-[var(--color-surface)] p-6 sm:flex-row"
    >
      <RadarViz />
      <div className="min-w-0 flex-1">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
          <Radar className="h-4 w-4" /> Radar Sonora
        </p>
        <p className="text-base leading-relaxed text-[var(--color-text)]">{summary.radar}</p>
      </div>
      <div className="flex gap-3">
        <MiniStat icon={Sparkles} color={DIR_META.new.color} value={summary.newCount} label="nuevos" />
        <MiniStat icon={Compass} color="#1db954" value={summary.explorationPct} suffix="%" label="exploración" />
        <MiniStat icon={Target} color="#38bdf8" value={summary.momentumPct} suffix="%" label="en movimiento" />
      </div>
    </motion.section>
  );
}

function RadarViz() {
  return (
    <div className="relative h-24 w-24 shrink-0">
      {[10, 22, 34, 46].map((r) => (
        <span key={r} className="absolute rounded-full border border-[var(--color-accent)]/20" style={{ inset: 48 - r, width: r * 2, height: r * 2 }} />
      ))}
      <motion.span
        className="absolute left-1/2 top-1/2 h-[1px] origin-left"
        style={{ width: 46, background: 'linear-gradient(90deg, var(--color-accent), transparent)' }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
      />
      <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent)]" />
    </div>
  );
}

function MiniStat({ icon: IconCmp, value, suffix, label, color }: { icon: typeof TrendingUp; value: number; suffix?: string; label: string; color: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface-2)]/30 px-4 py-3 text-center">
      <IconCmp className="mx-auto mb-1 h-4 w-4" style={{ color }} />
      <p className="text-xl font-bold text-white">
        <CountUp value={value} />
        {suffix}
      </p>
      <p className="text-[10px] text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

/* ───────────────────── Market card ───────────────────── */

function MarketCard({ s, delay, winLabel }: { s: EnrichedStock; delay: number; winLabel: string }) {
  const m = DIR_META[s.dir];
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -2 }}
      className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border bg-[var(--color-surface)] p-4"
    >
      <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" style={{ background: `radial-gradient(400px 120px at 0% 0%, ${m.color}14, transparent)` }} />

      {/* Rank */}
      <div className="relative w-9 shrink-0 text-center">
        <p className="text-lg font-black" style={{ color: m.color }}>{s.rank}</p>
        <RankDelta s={s} />
      </div>

      <Avatar name={s.name} imageUrl={s.imageUrl} color={m.color} size={44} />

      {/* Name */}
      <div className="relative min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-semibold text-white">
          {s.name} <BadgeCheck className="h-3.5 w-3.5 text-[var(--color-accent)]/60" />
        </p>
        <p className="text-xs text-[var(--color-muted)]">{s.recent} reproducciones · {winLabel}</p>
      </div>

      {/* Spark */}
      <div className="relative hidden shrink-0 sm:block">
        <LineSpark values={trendSpark(s.recent + s.rank, s.dir)} color={m.color} width={110} height={36} />
      </div>

      {/* Plays */}
      <p className="relative hidden w-10 shrink-0 text-center text-2xl font-black text-white md:block">{s.recent}</p>

      {/* Change copy */}
      <div className="relative hidden w-36 shrink-0 lg:block">
        <p className="text-sm font-bold tabular-nums" style={{ color: m.color }}>{pctText(s)}</p>
        <p className="text-[11px] text-[var(--color-muted)]">{changeCopy(s)}</p>
      </div>

      {/* Badge */}
      <span
        className="relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
        style={{ background: `${m.color}1f`, color: m.color }}
      >
        <m.icon className="h-3.5 w-3.5" /> {m.label}
      </span>
    </motion.div>
  );
}

function RankDelta({ s }: { s: EnrichedStock }) {
  if (s.dir === 'new') return <p className="text-[9px] font-bold uppercase text-[var(--color-accent-2)]">Nuevo</p>;
  if (s.rankDelta > 0) return <p className="flex items-center justify-center text-[10px] text-[var(--color-accent)]">▲ {s.rankDelta}</p>;
  if (s.rankDelta < 0) return <p className="flex items-center justify-center text-[10px] text-[var(--color-rose)]">▼ {-s.rankDelta}</p>;
  return <p className="text-[10px] text-[var(--color-muted)]">=</p>;
}

function DirDot({ dir }: { dir: TrendDir }) {
  return <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: DIR_META[dir].color }} />;
}

/* ───────────────────── Avatar ───────────────────── */

function Avatar({ name, imageUrl, color, size }: { name: string; imageUrl: string | null; color: string; size: number }) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 rounded-full blur-md" style={{ background: `${color}44` }} />
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="relative h-full w-full rounded-full object-cover" style={{ boxShadow: `0 0 0 2px ${color}66` }} />
      ) : (
        <div
          className="relative flex h-full w-full items-center justify-center rounded-full font-bold text-white"
          style={{ background: `${color}22`, boxShadow: `0 0 0 2px ${color}66`, fontSize: size * 0.4 }}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

/* ───────────────────── Premios de la semana ───────────────────── */

function PremiosBar({ summary, comebackSong }: { summary: ReturnType<typeof summarize>; comebackSong: SongComeback | null }) {
  const prizes = [
    { icon: Crown, color: '#f59e0b', label: 'Rey', name: summary.topRiser?.name ?? '—', note: 'manda esta semana' },
    { icon: Rocket, color: '#1db954', label: 'Mayor subida', name: summary.topRiser?.name ?? '—', note: summary.topRiser ? pctText(summary.topRiser) : '—' },
    { icon: TrendingDown, color: '#ff5d8f', label: 'Mayor caída', name: summary.biggestDrop?.name ?? '—', note: summary.biggestDrop ? pctText(summary.biggestDrop) : '—' },
    { icon: RotateCcw, color: '#fbbf24', label: 'Regreso', name: comebackSong?.name ?? summary.comeback?.name ?? '—', note: comebackSong ? `tras ${comebackSong.daysGone}d` : 'volvió' },
  ];
  return (
    <section className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Trophy className="h-4 w-4 text-[var(--color-accent-2)]" /> Esta semana en Sonora
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {prizes.map((p, i) => (
          <motion.div
            key={p.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-2xl border bg-[var(--color-surface-2)]/30 p-3"
          >
            <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide" style={{ color: p.color }}>
              <p.icon className="h-3.5 w-3.5" /> {p.label}
            </p>
            <p className="mt-1 truncate text-sm font-bold text-white">{p.name}</p>
            <p className="truncate text-[11px] text-[var(--color-muted)]">{p.note}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────────────────── Song movers ───────────────────── */

function SongCol({ title, icon: IconCmp, color, empty, children }: { title: string; icon: typeof Rocket; color: string; empty: string; children: React.ReactNode }) {
  const has = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color }}>
        <IconCmp className="h-4 w-4" /> {title}
      </h3>
      <div className="space-y-1">{has ? children : <p className="text-sm text-[var(--color-muted)]">{empty}</p>}</div>
    </div>
  );
}

function SongCover({ url, color }: { url: string | null; color: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md" style={{ background: `${color}22` }}>
      <Music2 className="h-4 w-4" style={{ color }} />
    </div>
  );
}

function RisingSong({ s, delay }: { s: SongStock; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <Link href={`/dashboard/song/${s.trackId}`} className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--color-surface-2)]/50">
        <SongCover url={s.imageUrl} color="#1db954" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{s.name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{s.artist} · {s.prior} → {s.recent} plays</p>
        </div>
        <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--color-accent)]">
          {s.trendPct != null ? `+${s.trendPct}%` : 'nuevo'}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

function ComebackSong({ s, delay }: { s: SongComeback; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <Link href={`/dashboard/song/${s.trackId}`} className="group flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--color-surface-2)]/50">
        <SongCover url={s.imageUrl} color="#fbbf24" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{s.name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{s.artist}</p>
        </div>
        <span className="shrink-0 text-right text-xs font-semibold" style={{ color: '#fbbf24' }}>
          regresó<br /><span className="tabular-nums">tras {s.daysGone}d</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}

/* ───────────────────── Cementerio ───────────────────── */

function Graveyard({ items }: { items: GraveItem[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Skull className="h-4 w-4" /> Cementerio musical
      </h2>
      <p className="mb-3 text-xs text-[var(--color-muted)]">Canciones que amabas y dejaste atrás. “Antes inseparables, ahora desconocidos.”</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((g, i) => (
          <motion.div
            key={`${g.name}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-center gap-3 rounded-2xl border bg-[var(--color-surface)] p-4"
          >
            <div className="relative">
              {g.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={g.imageUrl} alt="" className="h-12 w-12 rounded-md object-cover grayscale" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-muted)]">
                  <Skull className="h-5 w-5" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{g.name}</p>
              <p className="truncate text-xs text-[var(--color-muted)]">{g.artist}</p>
              <p className="mt-1 text-xs text-[var(--color-muted)]">
                Lo repetías {g.plays} veces · sin escuchar hace <span className="text-[var(--color-rose)]">{g.daysSince}d</span>
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
