/**
 * Time ranges that map 1:1 to the dashboard filters.
 * Rolling windows (not calendar) so "semana" = últimos 7 días, etc. — simple
 * and predictable. `today` and the comparator use calendar boundaries.
 *
 * NOTE on zona horaria: las fechas se calculan en UTC (el contenedor de
 * Postgres corre en UTC). Para multi-timezone real se guardaría el offset del
 * usuario y se usaría AT TIME ZONE; es una mejora acotada de más adelante.
 */
export const RANGES = ['today', '24h', '7d', '30d', '365d', 'all'] as const;
export type Range = (typeof RANGES)[number];

export function isRange(v: string): v is Range {
  return (RANGES as readonly string[]).includes(v);
}

/**
 * Returns the inclusive lower bound for a range, or null for "all".
 * `tzOffset` (minutes to add to UTC) makes "today" the user's LOCAL calendar
 * day, not the UTC one — otherwise a UTC-5 user counts last night as "today".
 * Rolling windows (24h/7d/…) are timezone-independent.
 */
export function rangeStart(range: Range, now = new Date(), tzOffset = 0): Date | null {
  switch (range) {
    case 'today': {
      // Local midnight today, expressed back as a real UTC instant.
      const local = new Date(now.getTime() + tzOffset * 60_000);
      local.setUTCHours(0, 0, 0, 0);
      return new Date(local.getTime() - tzOffset * 60_000);
    }
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '365d':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case 'all':
      return null;
  }
}

export const RANGE_LABEL: Record<Range, string> = {
  today: 'Hoy',
  '24h': 'Últimas 24h',
  '7d': 'Última semana',
  '30d': 'Último mes',
  '365d': 'Último año',
  all: 'Histórico',
};

/** A resolved time window. `end` is exclusive; null bounds mean "open". */
export interface Window {
  start: Date | null;
  end: Date | null;
  label: string;
}

/** Local YYYY-MM-DD midnight → the equivalent UTC instant. */
function localDayToUtc(day: string, tzOffset: number): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d) - tzOffset * 60_000);
}

/**
 * Resolve a query into a concrete window. Priority: explicit `day` → `from/to`
 * range → preset `range`. All calendar dates are interpreted in the user's
 * local time (tzOffset = minutes to add to UTC).
 */
export function resolveWindow(
  params: { range?: string; day?: string; from?: string; to?: string },
  tzOffset = 0,
  now = new Date(),
): Window {
  if (params.day) {
    const start = localDayToUtc(params.day, tzOffset);
    if (start) {
      return { start, end: new Date(start.getTime() + 86_400_000), label: params.day };
    }
  }
  if (params.from && params.to) {
    const start = localDayToUtc(params.from, tzOffset);
    const toStart = localDayToUtc(params.to, tzOffset);
    if (start && toStart) {
      return {
        start,
        end: new Date(toStart.getTime() + 86_400_000), // inclusive of the "to" day
        label: `${params.from} → ${params.to}`,
      };
    }
  }
  const range: Range = isRange(params.range ?? '') ? (params.range as Range) : '30d';
  return { start: rangeStart(range, now, tzOffset), end: null, label: RANGE_LABEL[range] };
}
