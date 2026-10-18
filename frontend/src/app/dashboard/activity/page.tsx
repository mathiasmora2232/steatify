'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Clock, ListMusic, Disc, Users, CalendarRange, Sunrise, Flame, Moon, Sparkles, TrendingUp, TrendingDown, X } from 'lucide-react';
import { api, type Range, type WindowParams, type TodayTimeline, type WeeklyRecap, type DayDetail, type TopItem } from '@/lib/api';
import { hora, fecha } from '@/lib/format';
import { downloadCSV, downloadExcel, printRows, type Col } from '@/lib/exports';
import { ExportMenu } from '@/components/ExportMenu';

const TRACK_COLS: Col<TopItem>[] = [
  { header: 'Canción', value: (t) => t.name },
  { header: 'Artista', value: (t) => t.subtitle ?? '' },
  { header: 'Reproducciones', value: (t) => t.plays },
  { header: 'Minutos', value: (t) => t.minutes },
];
const ARTIST_COLS: Col<TopItem>[] = [
  { header: 'Artista', value: (t) => t.name },
  { header: 'Reproducciones', value: (t) => t.plays },
  { header: 'Minutos', value: (t) => t.minutes },
];
import { SmartStat } from '@/components/SmartStat';
import { ListeningClock } from '@/components/ListeningClock';
import { WeekdaysChart } from '@/components/WeekdaysChart';
import { RankCard } from '@/components/RankCard';
import { RecentFeed } from '@/components/RecentFeed';
import { ContributionGraph } from '@/components/ContributionGraph';

type Mode = 'preset' | 'day' | 'range';
const PRESETS: { key: Range; label: string }[] = [
  { key: 'today', label: 'Hoy' },
  { key: '7d', label: '7d' },
  { key: '30d', label: '30d' },
  { key: '365d', label: 'Año' },
  { key: 'all', label: 'Todo' },
];

function localToday(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

const dateInputCls = (active: boolean) =>
  `rounded-lg border bg-[var(--color-surface-2)] px-3 py-1.5 text-[var(--color-text)] outline-none transition-colors ${
    active ? 'border-[var(--color-accent)]' : 'border-[var(--color-border)]'
  }`;

export default function ActivityPage() {
  const today = localToday();
  const [mode, setMode] = useState<Mode>('preset');
  const [preset, setPreset] = useState<Range>('today');
  const [day, setDay] = useState(today);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const win: WindowParams = useMemo(() => {
    if (mode === 'day') return { day };
    if (mode === 'range' && from && to) return { from, to };
    return { range: preset };
  }, [mode, preset, day, from, to]);

  const key = JSON.stringify(win);
  const summary = useSWR(`act:sum:${key}`, () => api.summaryW(win));
  const clock = useSWR(`act:clock:${key}`, () => api.clockW(win));
  const weekdays = useSWR(`act:wd:${key}`, () => api.weekdaysW(win));
  const topTracks = useSWR(`act:tt:${key}`, () => api.topW('tracks', win, 8));
  const topArtists = useSWR(`act:ta:${key}`, () => api.topW('artists', win, 8));
  const recent = useSWR(`act:rec:${key}`, () => api.recentW(win, 40));
  const contrib = useSWR('act:contrib', () => api.contributions(365));
  const timeline = useSWR('act:timeline', () => api.todayTimeline());
  const weekly = useSWR('act:weekly', () => api.weeklyRecap());
  const [pickedDay, setPickedDay] = useState<string | null>(null);
  const dayDetail = useSWR(pickedDay ? `act:day:${pickedDay}` : null, () => api.dayDetail(pickedDay!));

  const s = summary.data;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">Actividad</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Tu mapa de escucha — cada hora, cada día, cada racha.
          {s && (
            <span className="ml-1 text-[var(--color-text)]">
              {' '}
              {s.label} · {s.plays.toLocaleString()} reproducciones.
            </span>
          )}
        </p>
      </motion.div>

      {/* ── Period selector ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mb-7 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
      >
        {/* Segmented pill group */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1">
          {PRESETS.map((p) => {
            const active = mode === 'preset' && preset === p.key;
            return (
              <button
                key={p.key}
                onClick={() => {
                  setMode('preset');
                  setPreset(p.key);
                }}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[var(--color-accent)] text-black'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Custom range / specific day — secondary row */}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-[var(--color-border)] pt-4 text-sm">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <CalendarRange className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden />
            Rango personalizado
          </span>
          <label className="flex items-center gap-2">
            <span className="text-[var(--color-muted)]">Día</span>
            <input
              type="date"
              max={today}
              value={day}
              onChange={(e) => {
                setDay(e.target.value);
                setMode('day');
              }}
              className={dateInputCls(mode === 'day')}
            />
          </label>
          <label className="flex flex-wrap items-center gap-2">
            <span className="text-[var(--color-muted)]">Desde</span>
            <input
              type="date"
              max={today}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setMode('range');
              }}
              className={dateInputCls(mode === 'range')}
            />
            <span className="text-[var(--color-muted)]">→</span>
            <input
              type="date"
              max={today}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setMode('range');
              }}
              className={dateInputCls(mode === 'range')}
            />
          </label>
        </div>
      </motion.div>

      {/* ── Summary ── */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SmartStat
          icon={Clock}
          label="Minutos"
          numericValue={s?.minutes ?? 0}
          sub="tiempo de escucha"
          accent
        />
        <SmartStat
          icon={ListMusic}
          label="Reproducciones"
          numericValue={s?.plays ?? 0}
          sub="en este periodo"
          delay={0.05}
        />
        <SmartStat
          icon={Disc}
          label="Canciones únicas"
          numericValue={s?.uniqueTracks ?? 0}
          sub="distintas escuchadas"
          delay={0.1}
        />
        <SmartStat
          icon={Users}
          label="Artistas únicos"
          numericValue={s?.uniqueArtists ?? 0}
          sub="en rotación"
          delay={0.15}
        />
      </section>

      {/* ── Timeline del día + comparación semanal ── */}
      <section className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {timeline.data && timeline.data.plays > 0 && <DayTimelineCard t={timeline.data} />}
        {weekly.data && <WeeklyCompareCard w={weekly.data} />}
      </section>

      {/* ── Tu año en música (hero heatmap) ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="mt-8 overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold text-[var(--color-text)]">Tu año en música</h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Cada cuadro es un día — cuanto más intenso el color, más escuchaste. Toca un día para ver el detalle.
          </p>
        </div>
        <ContributionGraph data={contrib.data ?? []} onDayClick={setPickedDay} />
      </motion.section>

      {pickedDay && <DayDetailModal day={pickedDay} detail={dayDetail.data} onClose={() => setPickedDay(null)} />}

      {/* ── Temporal charts ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.15 }}
        className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <ListeningClock data={clock.data ?? []} />
        <WeekdaysChart data={weekdays.data ?? []} />
      </motion.section>

      {/* ── Top tracks + artists ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.2 }}
        className="mt-8"
      >
        {(topTracks.data?.length || topArtists.data?.length) ? (
          <div className="mb-3 flex items-center justify-end gap-2">
            {topTracks.data?.length ? (
              <ExportMenu
                label="Canciones"
                onCSV={() => downloadCSV(`steatify-top-canciones`, topTracks.data!, TRACK_COLS)}
                onExcel={() => downloadExcel(`steatify-top-canciones`, topTracks.data!, TRACK_COLS)}
                onPDF={() => printRows('Top canciones · Steatify', topTracks.data!, TRACK_COLS)}
              />
            ) : null}
            {topArtists.data?.length ? (
              <ExportMenu
                label="Artistas"
                onCSV={() => downloadCSV(`steatify-top-artistas`, topArtists.data!, ARTIST_COLS)}
                onExcel={() => downloadExcel(`steatify-top-artistas`, topArtists.data!, ARTIST_COLS)}
                onPDF={() => printRows('Top artistas · Steatify', topArtists.data!, ARTIST_COLS)}
              />
            ) : null}
          </div>
        ) : null}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RankCard title="Top canciones" items={topTracks.data ?? []} loading={topTracks.isLoading} linkBase="/dashboard/song" />
          <RankCard title="Top artistas" items={topArtists.data ?? []} loading={topArtists.isLoading} linkBase="/dashboard/artist" />
        </div>
      </motion.section>

      {/* ── Recent feed ── */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.25 }}
        className="mt-8"
      >
        <RecentFeed data={recent.data ?? []} />
      </motion.section>
    </div>
  );
}

/* ── Timeline del día (formato vía @librerias/format, TZ-safe) ── */
const fmtTime = (iso: string) => hora(iso);
const dayLabel = (ymd: string) => fecha(ymd, { dateStyle: 'long' });

function DayTimelineCard({ t }: { t: TodayTimeline }) {
  const rows: { icon: typeof Sunrise; color: string; label: string; track: string; time: string }[] = [];
  if (t.first) rows.push({ icon: Sunrise, color: '#fbbf24', label: 'Primera canción', track: t.first.track, time: fmtTime(t.first.at) });
  if (t.peak) rows.push({ icon: Flame, color: '#ff5d8f', label: `Momento más intenso · ${t.peak.plays}▶`, track: t.peak.track, time: `${String(t.peak.hour).padStart(2, '0')}:00` });
  if (t.last) rows.push({ icon: Moon, color: '#7c5cff', label: 'Última canción', track: t.last.track, time: fmtTime(t.last.at) });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <Clock className="h-4 w-4 text-[var(--color-accent)]" /> {t.isToday ? 'Hoy' : `Tu último día activo`}
        </h3>
        {t.day && <span className="text-xs text-[var(--color-muted)]">{t.isToday ? `${t.plays}▶` : dayLabel(t.day)}</span>}
      </div>
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-right text-sm font-bold tabular-nums" style={{ color: r.color }}>{r.time}</span>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: `${r.color}1f` }}>
              <r.icon className="h-3.5 w-3.5" style={{ color: r.color }} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-white">{r.track}</p>
              <p className="text-[11px] text-[var(--color-muted)]">{r.label}</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ── Comparación semanal ── */
function WeeklyCompareCard({ w }: { w: WeeklyRecap }) {
  const dMin = w.deltas.minutesPct;
  const shift = w.vibe.nightShift;
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <CalendarRange className="h-4 w-4 text-[var(--color-accent-2)]" /> Esta semana vs anterior
      </h3>
      <div className="space-y-2.5 text-sm">
        <CompareRow
          icon={dMin != null && dMin >= 0 ? TrendingUp : TrendingDown}
          color={dMin != null && dMin >= 0 ? '#1db954' : '#ff5d8f'}
          text={dMin != null ? `${dMin >= 0 ? '+' : ''}${dMin}% de música` : 'Sin comparación de música aún'}
          sub={`${w.thisWeek.minutes.toLocaleString()} min vs ${w.lastWeek.minutes.toLocaleString()} min`}
        />
        <CompareRow
          icon={Moon}
          color="#7c5cff"
          text={Math.abs(shift) < 3 ? 'Igual de nocturno que antes' : shift > 0 ? `Más nocturno que antes (+${shift}%)` : `Menos nocturno (${shift}%)`}
          sub={`${w.vibe.nightPct}% de tu música fue de madrugada`}
        />
        <CompareRow
          icon={Sparkles}
          color="#34d399"
          text={`${w.vibe.newArtists} artistas nuevos`}
          sub="descubiertos esta semana"
        />
      </div>
    </motion.div>
  );
}

function CompareRow({ icon: Icon, color, text, sub }: { icon: typeof Moon; color: string; text: string; sub: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${color}1f` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-white">{text}</p>
        <p className="text-[11px] text-[var(--color-muted)]">{sub}</p>
      </div>
    </div>
  );
}

/* ── Day detail modal ── */
function DayDetailModal({ day, detail, onClose }: { day: string; detail: DayDetail | undefined; onClose: () => void }) {
  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-sm rounded-3xl border bg-[var(--color-surface)] p-6"
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-[var(--color-muted)] hover:text-white"><X className="h-5 w-5" /></button>
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">{dayLabel(day)}</p>
        {!detail ? (
          <p className="mt-4 text-sm text-[var(--color-muted)]">Cargando…</p>
        ) : detail.plays === 0 ? (
          <p className="mt-4 text-sm text-[var(--color-muted)]">No escuchaste nada este día. Silencio total. 🤫</p>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-3xl font-black text-white">
              {Math.floor(detail.minutes / 60)}h {detail.minutes % 60}min
            </p>
            <p className="text-xs text-[var(--color-muted)]">{detail.plays.toLocaleString()} reproducciones</p>
            <div className="space-y-2 border-t border-[var(--color-border)] pt-3 text-sm">
              {detail.topTrack && <DetailRow label="Top canción" value={`${detail.topTrack.name}${detail.topTrack.artist ? ` · ${detail.topTrack.artist}` : ''}`} />}
              {detail.topArtist && <DetailRow label="Top artista" value={detail.topArtist} />}
              {detail.newEntry && <DetailRow label="Nueva entrada" value={detail.newEntry} accent />}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function DetailRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="shrink-0 text-xs text-[var(--color-muted)]">{label}</span>
      <span className={`text-right text-sm font-medium ${accent ? 'text-[var(--color-accent)]' : 'text-white'}`}>{value}</span>
    </div>
  );
}
