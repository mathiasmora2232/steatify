'use client';

import type { RecentPlay } from '@/lib/api';

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return `hace ${d} d`;
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

export function RecentFeed({ data }: { data: RecentPlay[] }) {
  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-5">
      <h3 className="mb-4 text-sm font-medium text-[var(--color-muted)]">Reproducciones recientes</h3>
      {data.length === 0 ? (
        <p className="py-6 text-center text-sm text-[var(--color-muted)]">Sin reproducciones aún.</p>
      ) : (
        <ul className="divide-y divide-[var(--color-border)]">
          {data.map((p, i) => (
            <li key={`${p.playedAt}-${i}`} className="flex items-center gap-3 py-2.5">
              {p.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.imageUrl} alt="" className="h-9 w-9 rounded-md object-cover" />
              ) : (
                <div className="h-9 w-9 rounded-md bg-[var(--color-surface-2)]" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{p.name}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{p.artist}</p>
              </div>
              <time
                className="shrink-0 text-xs tabular-nums text-[var(--color-muted)]"
                title={new Date(p.playedAt).toLocaleString()}
              >
                {relative(p.playedAt)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
