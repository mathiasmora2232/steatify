'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import type { WeekdayPoint } from '@/lib/api';

const DOW = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export function WeekdaysChart({ data }: { data: WeekdayPoint[] }) {
  const rows = data.map((d) => ({ ...d, label: DOW[d.dow] ?? String(d.dow) }));
  const max = Math.max(1, ...rows.map((d) => d.plays));

  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-muted)]">Por día de la semana</h3>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={rows} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
          <XAxis dataKey="label" stroke="#8b8f9c" fontSize={11} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            separator=""
            contentStyle={{ background: '#0f1116', border: '1px solid #232733', borderRadius: 12 }}
            labelStyle={{ color: '#e9ebf0', marginBottom: 2 }}
            itemStyle={{ color: '#e9ebf0' }}
            formatter={(v: number) => [`${v} reproducciones`, '']}
          />
          <Bar dataKey="plays" radius={[3, 3, 0, 0]}>
            {rows.map((d) => (
              <Cell key={d.dow} fill={d.plays === max ? '#7c5cff' : 'rgba(124,92,255,0.45)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
