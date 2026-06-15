'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Layers,
  CalendarDays,
  GitCompareArrows,
  Clock,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { api, type Era } from '@/lib/api';
import {
  eraTheme,
  eraArtist,
  eraTopArtists,
  eraBadges,
  eraHours,
  eraArtistsPerMonth,
  eraConsistency,
  eraMonthLabel,
  eraYear,
  eraMonthIndex,
  eraDays,
  eraSpark,
  annualSummary,
  availableYears,
} from '@/lib/eras-derive';
import { CountUp } from '@/components/CountUp';
import { Sparkline } from '@/components/Sparkline';
import { EraCover } from '@/components/EraCover';
import { ConsistencyRing } from '@/components/ConsistencyRing';
import { EraModal } from '@/components/EraModal';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
type View = 'timeline' | 'calendar' | 'compare';

export default function ErasPage() {
  const { data, isLoading, mutate } = useSWR('eras', api.eras);
  const [rebuilding, setRebuilding] = useState(false);
  const [year, setYear] = useState<number | null>(null);
  const [view, setView] = useState<View>('timeline');
  const [openEra, setOpenEra] = useState<Era | null>(null);
  const monthRefs = useRef(new Map<number, HTMLElement>());

  const eras = useMemo(() => data ?? [], [data]);
  const years = useMemo(() => availableYears(eras), [eras]);

  useEffect(() => {
    if (year == null && years.length) setYear(years[0]);
  }, [years, year]);

  const yearEras = useMemo(
    () =>
      eras
        .filter((e) => eraYear(e) === year)
        .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [eras, year],
  );
  const summary = useMemo(() => annualSummary(yearEras), [yearEras]);
  const prev = useMemo(() => annualSummary(eras.filter((e) => eraYear(e) === (year ?? 0) - 1)), [eras, year]);

  async function rebuild() {
    setRebuilding(true);
    try {
      await api.rebuildEras();
      await mutate();
    } finally {
      setRebuilding(false);
    }
  }

  function scrollToMonth(m: number) {
    monthRefs.current.get(m)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (isLoading)
    return (
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-[var(--color-surface)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-[var(--color-surface)]" />
        ))}
      </div>
    );

  if (eras.length === 0)
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          <Layers className="h-6 w-6" /> Eras musicales
        </h1>
        <div className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          Todavía no hay suficientes datos para detectar tus eras. Importa tu historial y pulsa{' '}
          <button onClick={rebuild} className="text-white underline">
            Recalcular
          </button>
          .
        </div>
      </div>
    );

  const monthsWithEra = new Set(yearEras.map(eraMonthIndex));

  return (
    <div className="mx-auto max-w-6xl pb-28">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Layers className="h-7 w-7 text-[var(--color-accent-2)]" /> Eras musicales
            <Sparkles className="h-5 w-5 text-[var(--color-accent-2)]" />
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Tu viaje musical, mes a mes. Cada era cuenta una historia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <YearSelect years={years} value={year} onChange={setYear} />
          <button
            onClick={rebuild}
            disabled={rebuilding}
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm text-[var(--color-muted)] transition hover:text-white disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${rebuilding ? 'animate-spin' : ''}`} />
            {rebuilding ? 'Calculando…' : 'Recalcular'}
          </button>
        </div>
      </div>

      {/* Annual summary */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Layers} color="#7c5cff" value={summary.count} label="eras este año" sub={summary.count ? `Una nueva cada ~${Math.round(365 / summary.count)} días` : '—'} />
        <SummaryCard icon={Clock} color="#1db954" value={summary.hours} suffix="h" label="dentro de tus eras" delta={delta(summary.hours, prev.hours)} />
        <SummaryCard icon={Users} color="#ff5d8f" value={summary.artists} label="artistas únicos" delta={delta(summary.artists, prev.artists)} />
        <SummaryCard icon={Target} color="#38bdf8" value={summary.consistency} suffix="%" label="consistencia media" />
      </div>

      {/* View toggle */}
      <div className="mb-6 inline-flex gap-1 rounded-full border bg-[var(--color-surface-2)]/40 p-1">
        <ViewBtn active={view === 'timeline'} onClick={() => setView('timeline')} icon={Layers} label="Timeline" />
        <ViewBtn active={view === 'calendar'} onClick={() => setView('calendar')} icon={CalendarDays} label="Calendario" />
        <ViewBtn active={view === 'compare'} onClick={() => setView('compare')} icon={GitCompareArrows} label="Comparación" />
      </div>

      {yearEras.length === 0 ? (
        <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          No hay eras detectadas en {year}. Prueba otro año.
        </p>
      ) : view === 'timeline' ? (
        <div className="relative ml-1 space-y-5 border-l-2 border-[var(--color-border)] pl-6 sm:pl-8">
          {yearEras.map((era, i) => (
            <TimelineRow
              key={era.id}
              era={era}
              delay={i * 0.05}
              onOpen={() => setOpenEra(era)}
              registerRef={(el) => {
                if (el) monthRefs.current.set(eraMonthIndex(era), el);
              }}
            />
          ))}
        </div>
      ) : view === 'calendar' ? (
        <CalendarView eras={yearEras} onOpen={setOpenEra} />
      ) : (
        <CompareView eras={yearEras} />
      )}

      {/* Month navigator */}
      {view === 'timeline' && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-bg)]/90 backdrop-blur md:left-60">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <div className="hidden min-w-0 shrink items-center gap-2 text-xs text-[var(--color-muted)] sm:flex">
              <Sparkles className="h-4 w-4 text-[var(--color-accent-2)]" />
              <span className="truncate">Explora tu año · toca un mes</span>
            </div>
            <div className="flex flex-1 items-center justify-center gap-1 overflow-x-auto">
              {MONTHS.map((m, idx) => {
                const has = monthsWithEra.has(idx);
                return (
                  <button
                    key={m}
                    onClick={() => has && scrollToMonth(idx)}
                    disabled={!has}
                    className={`rounded-full px-3 py-1 text-xs transition ${
                      has
                        ? 'text-[var(--color-text)] hover:bg-[var(--color-accent)] hover:font-semibold hover:text-black'
                        : 'cursor-default text-[var(--color-muted)]/30'
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <EraModal era={openEra} onClose={() => setOpenEra(null)} />
    </div>
  );
}

function delta(now: number, before: number): number | null {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

/* ───────────────────────── Timeline row ───────────────────────── */

function TimelineRow({
  era,
  delay,
  onOpen,
  registerRef,
}: {
  era: Era;
  delay: number;
  onOpen: () => void;
  registerRef: (el: HTMLElement | null) => void;
}) {
  const theme = eraTheme(era);
  const artist = eraArtist(era);
  const topArtists = eraTopArtists(era);
  const badges = eraBadges(era);

  return (
    <motion.div
      ref={registerRef}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4, delay }}
      className="relative"
    >
      {/* Dot on the line */}
      <span
        className="absolute -left-[33px] top-7 h-3.5 w-3.5 rounded-full ring-4 ring-[var(--color-bg)] sm:-left-[41px]"
        style={{ background: theme.color }}
      />
      <span className="mb-1 block text-xs font-bold uppercase tracking-widest" style={{ color: theme.color }}>
        {eraMonthLabel(era)} · {eraDays(era)} días
      </span>

      <motion.button
        onClick={onOpen}
        whileHover={{ y: -2 }}
        className="group relative block w-full overflow-hidden rounded-3xl border bg-[var(--color-surface)] p-5 text-left transition-colors"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: `radial-gradient(500px 180px at 20% 0%, ${theme.glow}, transparent)` }}
        />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
          <EraCover theme={theme} artist={artist} size="lg" />

          {/* Narrative block */}
          <div className="min-w-0 flex-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
              style={{ background: `${theme.color}1f`, color: theme.color }}
            >
              <theme.icon className="h-3 w-3" /> Era {theme.label}
            </span>
            <h3 className="mt-2 text-xl font-bold text-white">{era.title}</h3>
            <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted)]">
              {era.summary ?? theme.line(artist)}
            </p>

            {/* Facet badges (#9) */}
            {badges.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {badges.map((b) => (
                  <span
                    key={b.key}
                    className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                    style={{ background: `${b.color}1f`, borderColor: `${b.color}55`, color: b.color }}
                  >
                    {b.label}
                  </span>
                ))}
              </div>
            )}

            {/* Top 5 artists of the month (#8) */}
            {topArtists.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-[var(--color-muted)]" />
                {topArtists.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-0.5 text-[11px] text-[var(--color-text)]"
                  >
                    {i === 0 ? <span className="font-semibold">{t}</span> : t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats cluster */}
          <div className="flex shrink-0 items-center gap-5">
            <div className="hidden sm:block">
              <Metric icon={Clock} color={theme.color} value={`${eraHours(era)}h`} label="escuchadas" />
              <div className="mt-3">
                <Metric icon={Users} color={theme.color} value={`~${eraArtistsPerMonth(era)}`} label="artistas/mes" />
              </div>
            </div>
            <div className="hidden w-24 lg:block">
              <Sparkline values={eraSpark(era)} color={theme.color} />
              {era.peakHour != null && (
                <p className="mt-1 text-center text-[10px] text-[var(--color-muted)]">
                  Pico: {String(era.peakHour).padStart(2, '0')}:00
                </p>
              )}
            </div>
            <ConsistencyRing value={eraConsistency(era)} color={theme.color} size={64} label="consistencia" />
          </div>
        </div>
      </motion.button>
    </motion.div>
  );
}

function Metric({ icon: IconCmp, value, label, color }: { icon: typeof Clock; value: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <IconCmp className="h-4 w-4 shrink-0" style={{ color }} />
      <div>
        <p className="text-base font-bold leading-none text-white">{value}</p>
        <p className="text-[10px] text-[var(--color-muted)]">{label}</p>
      </div>
    </div>
  );
}

/* ───────────────────────── Calendar view ───────────────────────── */

function CalendarView({ eras, onOpen }: { eras: Era[]; onOpen: (e: Era) => void }) {
  const byMonth = new Map(eras.map((e) => [eraMonthIndex(e), e]));
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {MONTHS.map((m, idx) => {
        const era = byMonth.get(idx);
        if (!era)
          return (
            <div key={m} className="flex h-32 flex-col items-center justify-center rounded-2xl border border-dashed text-xs text-[var(--color-muted)]/40">
              {m}
            </div>
          );
        const theme = eraTheme(era);
        return (
          <motion.button
            key={m}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            whileHover={{ y: -3 }}
            onClick={() => onOpen(era)}
            className="relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border p-3 text-left"
            style={{ background: `radial-gradient(150% 120% at 0% 0%, ${theme.color}22, var(--color-surface))` }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-[var(--color-muted)]">{m}</span>
              <theme.icon className="h-4 w-4" style={{ color: theme.color }} />
            </div>
            <div>
              <p className="text-sm font-bold capitalize leading-tight text-white">Era {theme.label}</p>
              <p className="truncate text-[11px] text-[var(--color-muted)]">{eraArtist(era) ?? '—'}</p>
              <p className="mt-1 text-xs font-semibold tabular-nums" style={{ color: theme.color }}>
                {eraConsistency(era)}% · {eraHours(era)}h
              </p>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ───────────────────────── Compare view ───────────────────────── */

function CompareView({ eras }: { eras: Era[] }) {
  const [aId, setAId] = useState(eras[0]?.id ?? '');
  const [bId, setBId] = useState(eras[Math.min(1, eras.length - 1)]?.id ?? '');
  const a = eras.find((e) => e.id === aId) ?? eras[0];
  const b = eras.find((e) => e.id === bId) ?? eras[eras.length - 1];

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-4">
        <EraPicker eras={eras} value={aId} onChange={setAId} />
        <EraPicker eras={eras} value={bId} onChange={setBId} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <CompareCard era={a} />
        <CompareCard era={b} />
      </div>
      {a && b && (
        <div className="mt-4 rounded-2xl border bg-[var(--color-surface)] p-5 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            De {eraMonthLabel(a).toLowerCase()} a {eraMonthLabel(b).toLowerCase()}, pasaste de
          </p>
          <p className="mt-2 flex items-center justify-center gap-3 text-lg font-bold">
            <span style={{ color: eraTheme(a).color }}>Era {eraTheme(a).label}</span>
            <ChevronRight className="h-5 w-5 text-[var(--color-muted)]" />
            <span style={{ color: eraTheme(b).color }}>Era {eraTheme(b).label}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function EraPicker({ eras, value, onChange }: { eras: Era[]; value: string; onChange: (id: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border bg-[var(--color-surface)] px-3 py-2 text-sm text-white"
    >
      {eras.map((e) => (
        <option key={e.id} value={e.id}>
          {eraMonthLabel(e)} — {eraTheme(e).label}
        </option>
      ))}
    </select>
  );
}

function CompareCard({ era }: { era?: Era }) {
  if (!era) return null;
  const theme = eraTheme(era);
  return (
    <div
      className="rounded-3xl border p-5"
      style={{ background: `radial-gradient(300px 160px at 50% 0%, ${theme.glow}, var(--color-surface))` }}
    >
      <div className="flex items-center gap-3">
        <EraCover theme={theme} artist={eraArtist(era)} size="sm" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: theme.color }}>
            Era {theme.label}
          </p>
          <p className="text-sm font-semibold text-white">{eraMonthLabel(era)}</p>
        </div>
      </div>
      <p className="mt-3 line-clamp-3 text-xs text-[var(--color-muted)]">{era.summary ?? theme.line(eraArtist(era))}</p>
      <div className="mt-4 space-y-2 text-sm">
        <Row label="Horas" value={`${eraHours(era)}h`} />
        <Row label="Artistas" value={`~${eraArtistsPerMonth(era)}`} />
        <Row label="Pico" value={era.peakHour != null ? `${String(era.peakHour).padStart(2, '0')}:00` : '—'} />
        <Row label="Consistencia" value={`${eraConsistency(era)}%`} color={theme.color} />
      </div>
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-border)]/50 pb-1.5">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className="font-semibold tabular-nums" style={{ color: color ?? '#fff' }}>
        {value}
      </span>
    </div>
  );
}

/* ───────────────────────── Header bits ───────────────────────── */

function YearSelect({ years, value, onChange }: { years: number[]; value: number | null; onChange: (y: number) => void }) {
  const i = value != null ? years.indexOf(value) : -1;
  return (
    <div className="flex items-center gap-1 rounded-full border bg-[var(--color-surface)] px-2 py-1">
      <button
        onClick={() => i < years.length - 1 && onChange(years[i + 1])}
        disabled={i >= years.length - 1}
        className="rounded-full p-1 text-[var(--color-muted)] transition hover:text-white disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[3rem] text-center text-sm font-bold tabular-nums">{value ?? '—'}</span>
      <button
        onClick={() => i > 0 && onChange(years[i - 1])}
        disabled={i <= 0}
        className="rounded-full p-1 text-[var(--color-muted)] transition hover:text-white disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

function ViewBtn({ active, onClick, icon: IconCmp, label }: { active: boolean; onClick: () => void; icon: typeof Layers; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition ${
        active ? 'bg-[var(--color-accent)] font-semibold text-black' : 'text-[var(--color-muted)] hover:text-white'
      }`}
    >
      <IconCmp className="h-4 w-4" /> {label}
    </button>
  );
}

function SummaryCard({
  icon: IconCmp,
  color,
  value,
  suffix,
  label,
  sub,
  delta: d,
}: {
  icon: typeof Clock;
  color: string;
  value: number;
  suffix?: string;
  label: string;
  sub?: string;
  delta?: number | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border bg-[var(--color-surface)] p-5"
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}1f` }}>
        <IconCmp className="h-4 w-4" style={{ color }} />
      </div>
      <p className="text-3xl font-black text-white">
        <CountUp value={value} />
        {suffix}
      </p>
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      {d != null ? (
        <p className={`mt-1 flex items-center gap-1 text-xs ${d >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-rose)]'}`}>
          {d >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(d)}% vs año anterior
        </p>
      ) : (
        sub && <p className="mt-1 text-xs text-[var(--color-muted)]">{sub}</p>
      )}
    </motion.div>
  );
}
