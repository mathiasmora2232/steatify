'use client';

import type { ContribDay } from '@/lib/api';

// Mood → hue, so the graph reads as a year of feelings, not just volume.
const MOOD_HUE: Record<string, string> = {
  EUPHORIC: '29, 185, 84',
  HAPPY: '52, 211, 153',
  CHILL: '56, 189, 248',
  FOCUSED: '124, 92, 255',
  MELANCHOLIC: '129, 140, 248',
  INTENSE: '244, 63, 94',
  NEUTRAL: '148, 163, 184',
};

function cellColor(d: ContribDay): string {
  if (d.minutes === 0) return 'var(--color-surface-2)';
  const rgb = (d.mood && MOOD_HUE[d.mood]) || '29, 185, 84';
  // 4 intensity buckets by minutes listened.
  const alpha = d.minutes >= 240 ? 1 : d.minutes >= 120 ? 0.75 : d.minutes >= 45 ? 0.5 : 0.28;
  return `rgba(${rgb}, ${alpha})`;
}

/** GitHub-style year grid: 53 week-columns × 7 day-rows. */
export function ContributionGraph({ data, onDayClick }: { data: ContribDay[]; onDayClick?: (day: string) => void }) {
  // Build week columns. Pad the front so the first column starts on Sunday.
  const byDay = new Map(data.map((d) => [d.day, d]));
  const days = data.map((d) => d.day);
  const first = days.length ? new Date(`${days[0]}T00:00:00Z`) : new Date();
  const padFront = first.getUTCDay(); // 0=Sun

  const cells: (ContribDay | null)[] = [
    ...Array.from({ length: padFront }, () => null),
    ...data,
  ];
  const weeks: (ContribDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const totalMinutes = data.reduce((s, d) => s + d.minutes, 0);
  const activeDays = data.filter((d) => d.minutes > 0).length;

  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--color-muted)]">
          Actividad · último año
        </h3>
        <span className="text-xs text-[var(--color-muted)]">
          {Math.round(totalMinutes / 60)} h · {activeDays} días activos
        </span>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell, di) =>
                cell && onDayClick ? (
                  <button
                    key={di}
                    onClick={() => onDayClick(cell.day)}
                    title={`${cell.day}: ${cell.minutes} min`}
                    className="h-[11px] w-[11px] rounded-[2px] transition hover:ring-2 hover:ring-white/60"
                    style={{ backgroundColor: cellColor(cell) }}
                  />
                ) : (
                  <div
                    key={di}
                    title={cell ? `${cell.day}: ${cell.minutes} min` : ''}
                    className="h-[11px] w-[11px] rounded-[2px]"
                    style={{ backgroundColor: cell ? cellColor(cell) : 'transparent' }}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span>menos</span>
        <div className="flex gap-[3px]">
          {[0.28, 0.5, 0.75, 1].map((a) => (
            <div
              key={a}
              className="h-[11px] w-[11px] rounded-[2px]"
              style={{ backgroundColor: `rgba(29,185,84,${a})` }}
            />
          ))}
        </div>
        <span>más</span>
        <span className="ml-auto">El color refleja el mood dominante del día</span>
      </div>
    </div>
  );
}
