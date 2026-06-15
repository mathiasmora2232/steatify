'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Gamepad2,
  Search,
  Flame,
  Star,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react';
import { api, type SteamGame } from '@/lib/api';
import {
  gameState,
  isObsession,
  isHiddenGem,
  pendingScore,
  lovedSagaTokens,
  daysSince,
  playtimeLabel,
  sonoraState,
  SONORA_STATE,
  STATE_ORDER,
} from '@/lib/steam-derive';
import { downloadCSV, downloadExcel, printRows, type Col } from '@/lib/exports';
import { ExportMenu } from '@/components/ExportMenu';

// Columnas para exportar la biblioteca (CSV/Excel) — vía @librerias/exports.
const GAME_COLS: Col<SteamGame>[] = [
  { header: 'Juego', value: (g) => g.name },
  { header: 'Horas', value: (g) => g.hoursForever },
  { header: 'Estado', value: (g) => SONORA_STATE[sonoraState(g)].label },
  { header: 'Nivel', value: (g) => playtimeLabel(g.hoursForever).label },
  { header: 'Metacritic', value: (g) => g.metacritic ?? '' },
  { header: 'Géneros', value: (g) => (g.genres ?? []).join(', ') },
  { header: 'Precio (USD)', value: (g) => (g.priceCents != null ? (g.priceCents / 100).toFixed(2) : g.isFree ? 'Gratis' : '') },
  { header: 'Últimas 2 semanas (h)', value: (g) => g.hours2Weeks },
];

type LibFilter =
  | 'all'
  | 'played'
  | 'never'
  | 'under2'
  | 'tried'
  | 'mostPlayed'
  | 'legends'
  | 'abandoned'
  | 'serious'
  | 'pending'
  | 'gems';

type SortKey = 'hours' | 'name' | 'recent' | 'state' | 'score' | 'value';

const FILTERS: { key: LibFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'never', label: 'Nunca abiertos' },
  { key: 'under2', label: 'Apenas tocados' },
  { key: 'tried', label: 'Probados' },
  { key: 'played', label: 'Jugados' },
  { key: 'mostPlayed', label: 'Muy jugados' },
  { key: 'legends', label: 'Leyendas' },
  { key: 'abandoned', label: 'Abandonados' },
  { key: 'serious', label: 'Pendientes serios' },
  { key: 'pending', label: 'Promesas pendientes' },
  { key: 'gems', label: 'Joyas sin abrir' },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'hours', label: 'Horas' },
  { key: 'name', label: 'Nombre' },
  { key: 'recent', label: 'Última actividad' },
  { key: 'state', label: 'Estado' },
  { key: 'score', label: 'Score pendiente' },
  { key: 'value', label: 'Valor estimado' },
];

const PAGE_SIZES: (number | 'all')[] = [30, 50, 100, 'all'];

function matchesFilter(g: SteamGame, filter: LibFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'played':
      return g.hoursForever > 0;
    case 'never':
      return g.hoursForever === 0;
    case 'under2':
      return g.hoursForever > 0 && g.hoursForever < 2;
    case 'tried':
      return g.hoursForever >= 2 && g.hoursForever < 10;
    case 'mostPlayed':
      return g.hoursForever >= 10;
    case 'legends':
      return gameState(g) === 'legend';
    case 'abandoned':
      return g.hoursForever >= 2 && g.hours2Weeks === 0 && (daysSince(g.lastPlayedAt) ?? 0) >= 45;
    case 'serious':
      return g.hoursForever === 0 && (g.metacritic ?? 0) >= 75;
    case 'pending':
      return g.hoursForever === 0;
    case 'gems':
      return isHiddenGem(g);
    default:
      return true;
  }
}

export default function SteamLibraryPage() {
  const account = useSWR('steam:me', api.steamMe);
  const library = useSWR(account.data ? 'steam:library' : null, api.steamLibrary);
  const genres = useSWR(account.data ? 'steam:genres' : null, api.steamGenres);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibFilter>('all');
  const [sort, setSort] = useState<SortKey>('hours');
  const [sortTouched, setSortTouched] = useState(false);
  const [pageSize, setPageSize] = useState<number | 'all'>(50);
  const [page, setPage] = useState(1);

  const lib = library.data ?? [];

  const topGenres = useMemo(
    () => new Set(genres.data?.genres.slice(0, 5).map((x) => x.genre)),
    [genres.data],
  );
  const lovedTokens = useMemo(() => lovedSagaTokens(lib), [lib]);
  const topAppId = useMemo(
    () => lib.reduce<SteamGame | null>((m, g) => (g.hoursForever > (m?.hoursForever ?? -1) ? g : m), null)?.appId,
    [lib],
  );

  // When a backlog-ranking filter is active and the user hasn't manually picked
  // a sort, default to ranking by pendingScore.
  const scoreFilters: LibFilter[] = ['pending', 'serious', 'gems'];
  const effectiveSort: SortKey =
    scoreFilters.includes(filter) && !sortTouched ? 'score' : sort;

  const filtered = useMemo(() => {
    let list = lib;
    const q = query.trim().toLowerCase();
    if (q) list = list.filter((g) => g.name.toLowerCase().includes(q));
    list = list.filter((g) => matchesFilter(g, filter));

    const byScore = (g: SteamGame) => pendingScore(g, topGenres, lovedTokens);
    const sorted = [...list].sort((a, b) => {
      switch (effectiveSort) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'recent': {
          const ta = a.lastPlayedAt ? new Date(a.lastPlayedAt).getTime() : -Infinity;
          const tb = b.lastPlayedAt ? new Date(b.lastPlayedAt).getTime() : -Infinity;
          return tb - ta;
        }
        case 'state':
          return STATE_ORDER.indexOf(gameState(a)) - STATE_ORDER.indexOf(gameState(b));
        case 'score':
          return byScore(b) - byScore(a);
        case 'value':
          return (b.priceCents ?? -1) - (a.priceCents ?? -1);
        case 'hours':
        default:
          return b.hoursForever - a.hoursForever;
      }
    });
    return sorted;
  }, [lib, query, filter, effectiveSort, topGenres, lovedTokens]);

  // Reset to page 1 whenever the visible set changes.
  useEffect(() => {
    setPage(1);
  }, [query, filter, effectiveSort, pageSize]);

  const total = filtered.length;
  const size = pageSize === 'all' ? Math.max(total, 1) : pageSize;
  const pageCount = Math.max(1, Math.ceil(total / size));
  const safePage = Math.min(page, pageCount);
  const start = (safePage - 1) * size;
  const end = Math.min(start + size, total);
  const pageItems = pageSize === 'all' ? filtered : filtered.slice(start, end);

  const showPending = filter === 'pending' || filter === 'serious';

  // ── Not linked ──
  if (account.data === null || (account.error && !account.data)) {
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-surface-2)] ring-2 ring-[var(--color-accent)]/40">
          <Gamepad2 className="h-8 w-8 text-[var(--color-accent)]" />
        </div>
        <h1 className="mb-2 text-2xl font-bold">Conecta tu Steam</h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Vincula tu cuenta de Steam para explorar tu colección completa.
        </p>
        <Link
          href="/dashboard/steam"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          <Gamepad2 className="h-4 w-4" /> Conectar Steam
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl pb-16">
      {/* ── Header ── */}
      <header className="mb-6">
        <Link
          href="/dashboard/steam"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-text)]"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a Steam
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-black tracking-tight">
              Tu colección
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
              {lib.length.toLocaleString()} juegos en tu biblioteca
              {total !== lib.length ? ` · ${total.toLocaleString()} coinciden` : ''}
            </p>
          </div>
          {filtered.length > 0 && (
            <ExportMenu
              label={`Exportar ${filtered.length}`}
              onCSV={() => downloadCSV('sonora-biblioteca', filtered, GAME_COLS)}
              onExcel={() => downloadExcel('sonora-biblioteca', filtered, GAME_COLS)}
              onPDF={() => printRows('Mi biblioteca · Sonora', filtered, GAME_COLS)}
            />
          )}
        </div>
      </header>

      {/* ── Controls ── */}
      <div className="sticky top-0 z-10 mb-6 -mx-2 rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)]/80 p-4 backdrop-blur-xl">
        {/* Search + sort */}
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2">
            <Search className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar en tu colección…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
            />
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--color-muted)]" />
            <select
              value={effectiveSort}
              onChange={(e) => {
                setSort(e.target.value as SortKey);
                setSortTouched(true);
              }}
              className="cursor-pointer bg-transparent text-sm text-[var(--color-text)] outline-none [&>option]:bg-[var(--color-surface)]"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => {
                  setFilter(f.key);
                  setSortTouched(false);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? 'border-transparent bg-[var(--color-accent)] text-black'
                    : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text)]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      {library.isLoading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[460/280] animate-pulse rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-10 text-center text-[var(--color-muted)]">
          {query || filter !== 'all'
            ? 'Ningún juego coincide con estos filtros.'
            : '¿Tu perfil de Steam es público? No encontramos juegos.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {pageItems.map((g, i) => (
            <LibraryCard
              key={g.appId}
              g={g}
              delay={Math.min(i, 12) * 0.02}
              showPending={showPending}
              score={showPending ? pendingScore(g, topGenres, lovedTokens) : undefined}
              topGenres={topGenres}
              isTop={g.appId === topAppId}
            />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {total > 0 && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <span>Por página:</span>
            {PAGE_SIZES.map((ps) => (
              <button
                key={String(ps)}
                onClick={() => setPageSize(ps)}
                className={`rounded-full border px-2.5 py-1 font-medium transition ${
                  pageSize === ps
                    ? 'border-transparent bg-[var(--color-surface-2)] text-[var(--color-text)]'
                    : 'border-[var(--color-border)] hover:text-[var(--color-text)]'
                }`}
              >
                {ps === 'all' ? 'Todos' : ps}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs tabular-nums text-[var(--color-muted)]">
              Mostrando {total === 0 ? 0 : start + 1}–{end} de {total.toLocaleString()}
            </span>
            {pageSize !== 'all' && pageCount > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition hover:text-[var(--color-text)] disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-2 text-xs tabular-nums text-[var(--color-text)]">
                  {safePage} / {pageCount}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  disabled={safePage >= pageCount}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--color-border)] text-[var(--color-muted)] transition hover:text-[var(--color-text)] disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────── card ───────────────── */

function LibraryCard({
  g,
  delay,
  showPending,
  score,
  topGenres,
  isTop,
}: {
  g: SteamGame;
  delay: number;
  showPending: boolean;
  score?: number;
  topGenres: Set<string>;
  isTop?: boolean;
}) {
  const pt = playtimeLabel(g.hoursForever);
  const stateKey = sonoraState(g, { isTop });
  const state = SONORA_STATE[stateKey];
  const StateIcon: LucideIcon = state.icon;
  const obsession = isObsession(g);
  const matched = showPending ? (g.genres ?? []).filter((x) => topGenres.has(x)).slice(0, 3) : [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`/dashboard/steam/game/${g.appId}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:border-[var(--color-accent)]/50 hover:shadow-[0_8px_30px_-12px_rgba(29,185,84,0.35)]"
      >
        <div className="relative overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={g.headerUrl}
            alt={g.name}
            loading="lazy"
            className="aspect-[460/215] w-full object-cover transition duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface)] via-transparent to-transparent" />

          {/* Obsession flame */}
          {obsession && (
            <span
              className="absolute left-2 top-2 flex items-center gap-1 rounded-full border border-[var(--color-rose)]/50 bg-[var(--color-rose)]/30 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-rose)] backdrop-blur-sm"
              title="En tu rotación (últimas 2 semanas)"
            >
              <Flame className="h-3 w-3" /> En racha
            </span>
          )}

          {/* Pending score badge */}
          {showPending && score != null && (
            <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full border border-[var(--color-accent-2)]/50 bg-[var(--color-accent-2)]/30 px-2 py-0.5 text-xs font-bold text-[var(--color-accent-2)] backdrop-blur-sm">
              <Star className="h-3.5 w-3.5" /> {score}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col p-3">
          <p className="truncate text-sm font-semibold text-[var(--color-text)]">{g.name}</p>

          {/* Two badges: Sonora State + Playtime Label */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-semibold"
              style={{ background: `${state.color}26`, borderColor: `${state.color}59`, color: state.color }}
            >
              <StateIcon className="h-3.5 w-3.5" /> {state.label}
            </span>
            <span
              className="rounded-lg border px-2 py-1 text-[11px] font-semibold"
              style={{ background: `${pt.color}1c`, borderColor: `${pt.color}4d`, color: pt.color }}
            >
              {pt.label}
            </span>
          </div>

          <p className="mt-1.5 text-xs font-medium text-[var(--color-muted)]">
            {g.hoursForever > 0 ? `${g.hoursForever.toLocaleString()} h jugadas` : 'Sin jugar'}
          </p>

          {showPending && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {g.metacritic != null && (
                <span
                  className="rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums"
                  style={{
                    background:
                      g.metacritic >= 75
                        ? 'rgba(52,211,153,0.18)'
                        : g.metacritic >= 50
                          ? 'rgba(245,158,11,0.18)'
                          : 'rgba(255,93,143,0.18)',
                    color:
                      g.metacritic >= 75 ? '#34d399' : g.metacritic >= 50 ? '#f59e0b' : '#ff5d8f',
                  }}
                  title="Metacritic"
                >
                  MC {g.metacritic}
                </span>
              )}
              {matched.map((gen) => (
                <span
                  key={gen}
                  className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] text-[var(--color-muted)]"
                >
                  {gen}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
