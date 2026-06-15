'use client';

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Headphones } from 'lucide-react';

export interface DayPoint {
  day: string;
  minutes: number;
  plays?: number;
}

export type ChartMetric = 'minutes' | 'plays' | 'hours';

const METRIC_CFG: Record<ChartMetric, { value: (d: DayPoint) => number; tip: (v: number) => string }> = {
  minutes: { value: (d) => d.minutes, tip: (v) => `${v} min` },
  plays: { value: (d) => d.plays ?? 0, tip: (v) => `${v} reproducciones` },
  hours: { value: (d) => Math.round((d.minutes / 60) * 10) / 10, tip: (v) => `${v} h` },
};

/** Per-day area chart. Plots minutes, plays or hours depending on `metric`. */
export function ListeningChart({
  data,
  title = 'Minutos por día',
  metric = 'minutes',
  bare = false,
}: {
  data: DayPoint[];
  title?: string;
  metric?: ChartMetric;
  /** Drop the card chrome (border/padding/title) when embedded in another card. */
  bare?: boolean;
}) {
  const cfg = METRIC_CFG[metric];
  const points = data.map((d) => ({ day: d.day, value: cfg.value(d) }));
  const total = points.reduce((s, d) => s + d.value, 0);
  const totalLabel =
    metric === 'plays'
      ? `${total.toLocaleString()} reproducciones`
      : metric === 'hours'
        ? `${Math.round(total)} h en total`
        : `${Math.round(total / 60)} h en total`;

  const chart =
    total === 0 ? (
      <div className="flex h-[220px] flex-col items-center justify-center text-center text-sm text-[var(--color-muted)]">
        <Headphones className="mb-2 h-8 w-8 opacity-40" aria-hidden />
        Tu energía musical aparecerá aquí cuando escuches algo.
      </div>
    ) : (
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={points} margin={{ left: -20, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1db954" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#1db954" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="day" stroke="#8b8f9c" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#8b8f9c" fontSize={11} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            separator=""
            contentStyle={{ background: '#0f1116', border: '1px solid #232733', borderRadius: 12 }}
            labelStyle={{ color: '#e9ebf0', marginBottom: 2 }}
            itemStyle={{ color: '#e9ebf0' }}
            formatter={(v: number) => [cfg.tip(v), '']}
          />
          <Area type="monotone" dataKey="value" stroke="#1db954" strokeWidth={2} fill="url(#grad)" />
        </AreaChart>
      </ResponsiveContainer>
    );

  if (bare) {
    return (
      <div>
        {total > 0 && <p className="mb-1 text-right text-xs text-[var(--color-muted)]">{totalLabel}</p>}
        {chart}
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">{title}</h3>
        {total > 0 && <span className="text-xs text-[var(--color-muted)]">{totalLabel}</span>}
      </div>
      {chart}
    </div>
  );
}
