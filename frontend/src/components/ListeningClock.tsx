'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { ClockPoint } from '@/lib/api';

/** Reproducciones por hora del día (hora local). Revela si eres de día o de noche. */
export function ListeningClock({ data }: { data: ClockPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.plays));
  const peak = data.reduce((a, b) => (b.plays > a.plays ? b : a), data[0] ?? { hour: 0, plays: 0 });

  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-muted)]">Reloj de escucha</h3>
        {peak.plays > 0 && (
          <span className="text-xs text-[var(--color-muted)]">
            pico a las <span className="text-[var(--color-accent)]">{String(peak.hour).padStart(2, '0')}:00</span>
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis
            dataKey="hour"
            stroke="#8b8f9c"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            interval={2}
            tickFormatter={(h) => `${h}h`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            separator=""
            contentStyle={{ background: '#0f1116', border: '1px solid #232733', borderRadius: 12 }}
            labelStyle={{ color: '#e9ebf0', marginBottom: 2 }}
            itemStyle={{ color: '#e9ebf0' }}
            labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
            formatter={(v: number) => [`${v} reproducciones`, '']}
          />
          <Bar dataKey="plays" radius={[3, 3, 0, 0]}>
            {data.map((d) => (
              <Cell key={d.hour} fill={d.plays === max ? '#1db954' : 'rgba(29,185,84,0.45)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
