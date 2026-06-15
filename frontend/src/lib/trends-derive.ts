import { TrendingUp, TrendingDown, Sparkles, RotateCcw, Minus } from 'lucide-react';
import type { LucideIcon } from '@/lib/icons';
import type { ArtistStock, GraveItem } from '@/lib/api';

/**
 * Pure derivations for the "Tendencias" market. Built entirely from the real
 * `/trends` payload (stocks: recent vs prior 7-day plays + direction; graveyard:
 * abandoned tracks). We enrich it with rank movement and a derived "returning"
 * state — an artist counts as a comeback when they're rising/new now AND appear
 * in your graveyard (you'd abandoned them). No backend changes.
 */

export type TrendDir = 'up' | 'down' | 'flat' | 'new' | 'returning';

export interface EnrichedStock extends ArtistStock {
  rank: number; // 1-based, by recent plays
  rankDelta: number; // + = climbed positions
  dir: TrendDir;
  daysAway: number | null; // for comebacks
}

export interface DirMeta {
  key: TrendDir;
  label: string;
  color: string;
  icon: LucideIcon;
}

export const DIR_META: Record<TrendDir, DirMeta> = {
  up: { key: 'up', label: 'En alza', color: '#1db954', icon: TrendingUp },
  new: { key: 'new', label: 'Nuevo', color: '#7c5cff', icon: Sparkles },
  down: { key: 'down', label: 'Bajando', color: '#ff5d8f', icon: TrendingDown },
  returning: { key: 'returning', label: 'Regresando', color: '#f59e0b', icon: RotateCcw },
  flat: { key: 'flat', label: 'Estable', color: '#38bdf8', icon: Minus },
};

/** Rank stocks by recent plays, detect comebacks via the graveyard, add movement. */
export function enrichStocks(stocks: ArtistStock[], graveyard: GraveItem[]): EnrichedStock[] {
  const abandoned = new Map<string, number>();
  for (const g of graveyard) {
    const cur = abandoned.get(g.artist) ?? 0;
    abandoned.set(g.artist, Math.max(cur, g.daysSince));
  }

  const byRecent = [...stocks].sort((a, b) => b.recent - a.recent);
  const currentRank = new Map(byRecent.map((s, i) => [s.name, i + 1]));
  const byPrior = [...stocks].filter((s) => s.prior > 0).sort((a, b) => b.prior - a.prior);
  const priorRank = new Map(byPrior.map((s, i) => [s.name, i + 1]));

  return byRecent.map((s) => {
    const rank = currentRank.get(s.name) ?? 0;
    const pr = priorRank.get(s.name);
    const rankDelta = pr ? pr - rank : 0;
    const comebackDays = abandoned.get(s.name) ?? null;
    let dir: TrendDir = s.direction;
    let daysAway: number | null = null;
    if ((s.direction === 'new' || s.direction === 'up') && comebackDays && comebackDays >= 21) {
      dir = 'returning';
      daysAway = comebackDays;
    }
    return { ...s, rank, rankDelta, dir, daysAway };
  });
}

/** Human, story-like copy for a stock's change. */
export function changeCopy(s: EnrichedStock): string {
  switch (s.dir) {
    case 'new':
      return 'Entró por primera vez esta semana';
    case 'returning':
      return `Volvió después de ${s.daysAway} días`;
    case 'up':
      return s.rankDelta > 0 ? `Subió ${s.rankDelta} puesto${s.rankDelta > 1 ? 's' : ''}` : 'Ganó fuerza vs el período anterior';
    case 'down':
      return s.rankDelta < 0 ? `Bajó ${-s.rankDelta} puesto${-s.rankDelta > 1 ? 's' : ''}` : 'Perdió fuerza vs el período anterior';
    default:
      return 'Sin cambios';
  }
}

/** Percent / state label. */
export function pctText(s: EnrichedStock): string {
  if (s.dir === 'new') return 'Nuevo';
  if (s.dir === 'returning') return 'Regresó';
  if (s.trendPct == null) return '—';
  return `${s.trendPct > 0 ? '+' : ''}${s.trendPct}%`;
}

export interface TrendSummary {
  topRiser: EnrichedStock | null;
  newEntry: EnrichedStock | null;
  biggestDrop: EnrichedStock | null;
  comeback: EnrichedStock | null;
  newCount: number;
  upCount: number;
  downCount: number;
  returningCount: number;
  explorationPct: number;
  momentumPct: number;
  radar: string;
}

export function summarize(items: EnrichedStock[]): TrendSummary {
  const byPct = (a: EnrichedStock, b: EnrichedStock) => (b.trendPct ?? 0) - (a.trendPct ?? 0);
  const ups = items.filter((s) => s.dir === 'up').sort(byPct);
  const downs = items.filter((s) => s.dir === 'down').sort((a, b) => (a.trendPct ?? 0) - (b.trendPct ?? 0));
  const news = items.filter((s) => s.dir === 'new');
  const returns = items.filter((s) => s.dir === 'returning');
  const total = items.length || 1;

  const topRiser = ups[0] ?? returns[0] ?? null;
  const newCount = news.length;
  const explorationPct = Math.round(((news.length + returns.length) / total) * 100);
  const momentumPct = Math.round(((ups.length + news.length + returns.length) / total) * 100);

  const bits: string[] = [];
  if (newCount > 0) bits.push(`aparecieron ${newCount} artista${newCount > 1 ? 's' : ''} nuevo${newCount > 1 ? 's' : ''}`);
  if (topRiser) bits.push(`${topRiser.name} está ganando fuerza`);
  if (returns[0]) bits.push(`${returns[0].name} volvió a tu rotación`);
  const radar = bits.length
    ? `Esta semana ${bits.slice(0, 2).join(' y ')}.`
    : 'Tu mercado está tranquilo esta semana: sin grandes movimientos.';

  return {
    topRiser,
    newEntry: news[0] ?? null,
    biggestDrop: downs[0] ?? null,
    comeback: returns[0] ?? null,
    newCount,
    upCount: ups.length,
    downCount: downs.length,
    returningCount: returns.length,
    explorationPct,
    momentumPct,
    radar,
  };
}

/** Deterministic, direction-aware sparkline (heights 0..1). */
export function trendSpark(seed: number, dir: TrendDir, bars = 22): number[] {
  let s = (Math.abs(Math.round(seed)) * 7919 + 104729) % 233280;
  const slope = dir === 'down' ? -0.55 : dir === 'flat' ? 0 : 0.55;
  const out: number[] = [];
  for (let i = 0; i < bars; i++) {
    s = (s * 9301 + 49297) % 233280;
    const noise = (s / 233280) * 0.45;
    const t = i / (bars - 1);
    out.push(Math.min(1, Math.max(0.06, 0.4 + slope * (t - 0.1) + noise - 0.2)));
  }
  return out;
}
