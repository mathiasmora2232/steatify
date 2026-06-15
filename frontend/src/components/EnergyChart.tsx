'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import { I, Icon } from '@/lib/icons';
import { ListeningChart, type ChartMetric } from './ListeningChart';
import { ListeningClock } from './ListeningClock';

interface Period {
  key: string;
  label: string;
  days: number;
  mode?: 'clock' | 'series';
}
const PERIODS: Period[] = [
  { key: 'day', label: 'Día', days: 1, mode: 'clock' },
  { key: '7', label: 'Semana', days: 7 },
  { key: '30', label: '4 sem', days: 30 },
  { key: '90', label: '3M', days: 90 },
  { key: '180', label: '6M', days: 180 },
  { key: '365', label: 'Año', days: 365 },
  { key: 'all', label: 'Todo', days: 3650 },
];

const SLICE = [
  { key: 'dia', label: 'Día', color: '#1db954' },
  { key: 'tarde', label: 'Tarde', color: '#7c5cff' },
  { key: 'noche', label: 'Noche', color: '#ff5d8f' },
];

const METRICS: { key: ChartMetric; label: string }[] = [
  { key: 'minutes', label: 'Minutos' },
  { key: 'plays', label: 'Reproducciones' },
  { key: 'hours', label: 'Horas' },
];

function localISO(d: Date): string {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function EnergyChart() {
  const [period, setPeriod] = useState<Period>(PERIODS[2]); // Mes por defecto
  const [metric, setMetric] = useState<ChartMetric>('minutes');
  const isClock = period.mode === 'clock';
  const isLifetime = period.key === 'all';

  // Lifetime → monthly aggregation (the daily series caps at 366d); else daily.
  const series = useSWR(
    isClock ? null : isLifetime ? 'energy:monthly' : `energy:series:${period.days}`,
    () => (isLifetime ? api.monthlySeries() : api.series(period.days)),
  );
  const clock = useSWR(`energy:clock:${period.key}`, () => {
    if (isClock) return api.clockW({ range: 'today' });
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - (period.days - 1));
    return api.clockW({ from: localISO(from), to: localISO(to) });
  });

  // Día / Tarde / Noche distribution from the clock.
  const dist = useMemo(() => {
    const c = clock.data ?? [];
    const sum = (hrs: number[]) => hrs.reduce((s, h) => s + (c.find((x) => x.hour === h)?.plays ?? 0), 0);
    const dia = sum([6, 7, 8, 9, 10, 11, 12, 13]);
    const tarde = sum([14, 15, 16, 17, 18, 19, 20]);
    const noche = sum([21, 22, 23, 0, 1, 2, 3, 4, 5]);
    const total = dia + tarde + noche || 1;
    return {
      total,
      data: [
        { key: 'dia', value: dia, pct: Math.round((dia / total) * 100) },
        { key: 'tarde', value: tarde, pct: Math.round((tarde / total) * 100) },
        { key: 'noche', value: noche, pct: Math.round((noche / total) * 100) },
      ],
    };
  }, [clock.data]);

  // "% más activo": last 7 days vs the period's 7-day average.
  const activity = useMemo(() => {
    const s = series.data;
    if (!s || s.length < 8) return null;
    const last7 = s.slice(-7).reduce((a, b) => a + b.minutes, 0);
    const avg7 = (s.reduce((a, b) => a + b.minutes, 0) / s.length) * 7;
    if (avg7 <= 0) return null;
    return { pct: Math.round(((last7 - avg7) / avg7) * 100), minutes: last7 };
  }, [series.data]);

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <Icon icon={I.energy} className="h-4 w-4" />
          Tu energía musical
        </h3>
        <div className="flex max-w-full gap-1 overflow-x-auto rounded-full border bg-[var(--color-surface-2)]/40 p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs transition ${
                period.key === p.key
                  ? 'bg-[var(--color-accent)] font-semibold text-black'
                  : 'text-[var(--color-muted)] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Métrica: minutos / reproducciones / horas (no aplica al reloj del Día) */}
      {!isClock && (
        <div className="mb-3 flex gap-1 rounded-full border bg-[var(--color-surface-2)]/40 p-0.5 text-xs">
          {METRICS.map((mt) => (
            <button
              key={mt.key}
              onClick={() => setMetric(mt.key)}
              className={`rounded-full px-3 py-1 transition ${
                metric === mt.key
                  ? 'bg-[var(--color-surface)] font-semibold text-white shadow-sm'
                  : 'text-[var(--color-muted)] hover:text-white'
              }`}
            >
              {mt.label}
            </button>
          ))}
        </div>
      )}

      {isClock ? (
        <ListeningClock data={clock.data ?? []} />
      ) : (
        <ListeningChart title="" bare metric={metric} data={series.data ?? []} />
      )}

      {/* Footer: actividad + donut Día/Tarde/Noche */}
      <div className="mt-4 flex flex-col items-center gap-4 rounded-2xl border bg-[var(--color-surface-2)]/30 p-4 sm:flex-row sm:justify-between">
        <div>
          {activity ? (
            <>
              <p className="text-xs text-[var(--color-muted)]">Esta semana estuviste</p>
              <p className="text-xl font-bold">
                <span className={activity.pct >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-rose)]'}>
                  {activity.pct >= 0 ? '+' : ''}
                  {activity.pct}% {activity.pct >= 0 ? 'más' : 'menos'} activo
                </span>
              </p>
              <p className="text-xs text-[var(--color-muted)]">que tu promedio del período</p>
            </>
          ) : (
            <p className="text-sm text-[var(--color-muted)]">Cuándo escuchas</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative h-24 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dist.data}
                  dataKey="value"
                  innerRadius={28}
                  outerRadius={44}
                  paddingAngle={2}
                  stroke="none"
                >
                  {dist.data.map((d) => (
                    <Cell key={d.key} fill={SLICE.find((s) => s.key === d.key)?.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="space-y-1 text-xs">
            {SLICE.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                <span className="text-[var(--color-muted)]">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {dist.data.find((d) => d.key === s.key)?.pct ?? 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
