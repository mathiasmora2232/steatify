'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from 'recharts';
import {
  Gamepad2,
  RefreshCw,
  Clock,
  Library,
  Skull,
  Crown,
  Flame,
  TrendingUp,
  Hourglass,
  Sparkles,
  Search,
  Gauge,
  ChevronRight,
  Star,
  RotateCcw,
  Trophy,
  CalendarClock,
  Percent,
  Wallet,
  Tag,
  Sigma,
  BarChart3,
  Gem,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { api, type SteamGame } from '@/lib/api';
import { computeLevel } from '@/lib/level';
import { CountUp } from '@/components/CountUp';
import {
  gamerAttributes,
  gamerClass,
  gamerType,
  gameState,
  gamingMarket,
  completedCount,
  daysSince,
  pendingScore,
  lovedSagaTokens,
  recommendations,
  STATE_META,
} from '@/lib/steam-derive';
import { buildInsightProfile, assignInsights } from '@/lib/game-insight';

type LibFilter = 'all' | 'played' | 'unplayed' | 'hours' | 'abandoned';

/** Week index since epoch — recommendations auto-rotate once a week. */
const WEEK_IDX = Math.floor(Date.now() / (7 * 864e5));
/** Take `n` items from `arr` starting at `off`, wrapping around (rotation). */
function rotateWindow<T>(arr: T[], off: number, n: number): T[] {
  if (arr.length <= n) return arr;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(arr[(((off + i) % arr.length) + arr.length) % arr.length]);
  return out;
}

export default function SteamPage() {
  const account = useSWR('steam:me', api.steamMe);
  const stats = useSWR(account.data ? 'steam:stats' : null, api.steamStats);
  const library = useSWR(account.data ? 'steam:library' : null, api.steamLibrary);
  const backlog = useSWR(account.data ? 'steam:backlog' : null, api.steamBacklog);
  const genres = useSWR(account.data ? 'steam:genres' : null, api.steamGenres);
  const evolution = useSWR(account.data ? 'steam:evolution' : null, api.steamEvolution);
  const debug = useSWR(account.data ? 'steam:syncdebug' : null, api.steamSyncDebug);
  const economy = useSWR(account.data ? 'steam:economy' : null, api.steamEconomy);
  const snapshot = useSWR(account.data ? 'steam:snapshot' : null, api.steamSnapshot);
  const momentum = useSWR(account.data ? 'steam:momentum' : null, api.steamMomentum);
  const dna = useSWR(account.data ? 'dna' : null, api.musicDna);

  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LibFilter>('all');
  const [showDebug, setShowDebug] = useState(false);
  const [fullBusy, setFullBusy] = useState(false);
  const [shown, setShown] = useState(50);
  // Reroll offsets for the rotating recommendation / graveyard lists.
  const [rerollRecs, setRerollRecs] = useState(0);
  const [rerollGrave, setRerollGrave] = useState(0);

  async function forceFull() {
    setFullBusy(true);
    try {
      await api.steamSyncFull();
      await Promise.all([account.mutate(), stats.mutate(), library.mutate(), backlog.mutate(), genres.mutate(), evolution.mutate(), debug.mutate()]);
    } finally {
      setFullBusy(false);
    }
  }

  const lib = library.data ?? [];

  const games = useMemo(() => {
    let list = lib;
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((g) => g.name.toLowerCase().includes(q));
    }
    if (filter === 'played') list = list.filter((g) => g.hoursForever > 0);
    else if (filter === 'unplayed') list = list.filter((g) => g.hoursForever === 0);
    else if (filter === 'abandoned')
      list = list.filter((g) => g.hoursForever >= 2 && g.hours2Weeks === 0 && (daysSince(g.lastPlayedAt) ?? 0) >= 45);
    return [...list].sort((a, b) => b.hoursForever - a.hoursForever);
  }, [lib, query, filter]);

  async function linkAccount() {
    if (!input.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.steamLink(input.trim());
      await account.mutate();
      await stats.mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message.replace(/^API \d+: /, '') : 'Error al vincular.');
    } finally {
      setBusy(false);
    }
  }

  async function resync() {
    setBusy(true);
    try {
      await api.steamSync();
      await Promise.all([account.mutate(), stats.mutate(), library.mutate(), backlog.mutate()]);
    } finally {
      setBusy(false);
    }
  }

  // ── Not linked yet ──
  if (account.data === null || (account.error && !account.data)) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          Conecta tu Steam <Gamepad2 className="h-6 w-6" />
        </h1>
        <p className="mb-6 text-sm text-[var(--color-muted)]">
          Pega tu <strong>SteamID64</strong> (17 dígitos), tu URL personalizada
          (steamcommunity.com/id/<em>tunombre</em>) o solo el nombre de tu vanity URL. Tu perfil y los
          detalles de juegos deben ser <strong>públicos</strong>.
        </p>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && linkAccount()}
            placeholder="76561198… o tunombre"
            className="flex-1 rounded-full border bg-[var(--color-surface)] px-5 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={linkAccount}
            disabled={busy}
            className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            {busy ? 'Vinculando…' : 'Vincular'}
          </button>
        </div>
        {error && (
          <p className="mt-4 rounded-lg border border-[var(--color-rose)]/40 bg-[var(--color-rose)]/10 px-4 py-2 text-sm text-[var(--color-rose)]">
            {error}
          </p>
        )}
      </div>
    );
  }

  const s = stats.data;
  const steamHours = s?.totalHours ?? 0;
  const level = computeLevel(dna.data?.totals.plays ?? 0, dna.data?.totals.minutes ?? 0, steamHours);
  const attrs = s && lib.length ? gamerAttributes(s, lib, genres.data?.genres) : [];
  const klass = attrs.length ? gamerClass(attrs) : null;
  const completed = completedCount(lib);
  const market = gamingMarket(lib);
  const topGenres = new Set((genres.data?.genres ?? []).slice(0, 5).map((x) => x.genre));
  const lovedTokens = lovedSagaTokens(lib);
  // Cementerio: rank the whole never-played pool, then show a rotating window of 8
  // (auto-rotates weekly; the reroll button advances it).
  const promesasPool = [...(backlog.data?.neverPlayed ?? [])].sort(
    (a, b) => pendingScore(b, topGenres, lovedTokens) - pendingScore(a, topGenres, lovedTokens),
  );
  const promesas = rotateWindow(promesasPool, (WEEK_IDX + rerollGrave) * 8, 8);
  // Recommendations: build a big scored pool, show a rotating window of 6 each.
  const recsPool = recommendations(lib, topGenres, 30);
  const recs = {
    start: rotateWindow(recsPool.start, (WEEK_IDX + rerollRecs) * 6, 6),
    revive: rotateWindow(recsPool.revive, (WEEK_IDX + rerollRecs) * 6, 6),
  };
  // NEW: "Joya oculta" — a critically acclaimed game you've barely touched.
  const hiddenGem =
    [...lib]
      .filter((g) => (g.metacritic ?? 0) >= 80 && g.hoursForever < 2)
      .sort((a, b) => (b.metacritic ?? 0) - (a.metacritic ?? 0))[0] ?? null;
  const gType = s ? gamerType(s, lib, genres.data?.genres ?? [], momentum.data?.resumed.length ?? 0).top : null;
  const insightProfile = buildInsightProfile(lib, genres.data?.genres);
  const startMsgs = assignInsights(recs.start.map((p) => p.game), insightProfile);
  const reviveMsgs = assignInsights(recs.revive.map((p) => p.game), insightProfile);

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* ── RPG Header ── */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-[var(--color-accent)]/30 blur-lg" />
            {account.data?.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={account.data.avatarUrl} alt="" className="relative h-14 w-14 rounded-full ring-2 ring-[var(--color-accent)]/50" />
            ) : (
              <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-2)] ring-2 ring-[var(--color-accent)]/50">
                <Skull className="h-7 w-7 text-[var(--color-accent)]" />
              </div>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{account.data?.personaName ?? 'Steam'}</h1>
            <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="flex items-center gap-1 rounded-full bg-[var(--color-accent)]/15 px-2.5 py-0.5 text-xs font-bold text-[var(--color-accent)]">
                <Gamepad2 className="h-3.5 w-3.5" /> Gamer Lv. {level.level}
              </span>
              {klass && <span className="text-[var(--color-muted)]">Clase: <span className="font-semibold text-white">{klass.name}</span></span>}
            </div>
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              {account.data?.lastSyncedAt ? `Sincronizado: ${new Date(account.data.lastSyncedAt).toLocaleString()}` : 'Sin sincronizar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/steam/wrapped"
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition hover:border-[var(--color-accent)]/50"
          >
            <Sparkles className="h-4 w-4" /> Mi Wrapped
          </Link>
          <Link
            href="/dashboard/steam/activity"
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:text-white"
          >
            <Clock className="h-4 w-4" /> Actividad
          </Link>
          <button
            onClick={resync}
            disabled={busy}
            className="flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Sincronizando…' : 'Sincronizar'}
          </button>
        </div>
      </header>

      {/* ── Steam Profile Snapshot (estado de cuenta gamer, estilo SteamDB) ── */}
      {snapshot.data && (
        <section className="mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)]/30">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-6 py-3">
            <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <Gamepad2 className="h-4 w-4 text-[var(--color-accent)]" /> Steam Profile Snapshot
            </span>
            <span className="flex flex-wrap items-center gap-2 text-xs">
              {snapshot.data.account?.steamLevel != null && (
                <span className="flex items-center gap-1 rounded-full bg-[var(--color-accent)]/15 px-2.5 py-0.5 font-bold text-[var(--color-accent)]">
                  <Trophy className="h-3.5 w-3.5" /> Nivel Steam {snapshot.data.account.steamLevel}
                </span>
              )}
              {snapshot.data.account?.accountAgeYears != null && (
                <span className="flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-[var(--color-muted)]">
                  <CalendarClock className="h-3.5 w-3.5" /> {snapshot.data.account.accountAgeYears} años de cuenta
                </span>
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-px bg-[var(--color-border)] sm:grid-cols-3 lg:grid-cols-6">
            <SnapCell icon={Library} color="#7c5cff" value={snapshot.data.totalGames} label="Juegos" sub={`${snapshot.data.playedGames} jugados`} />
            <SnapCell icon={Skull} color="#ff5d8f" value={snapshot.data.unplayedGames} label="Sin tocar" sub={`${100 - snapshot.data.playedPercent}% del total`} />
            <SnapCell icon={Percent} color="#34d399" value={snapshot.data.playedPercent} suffix="%" label="Biblioteca jugada" />
            <SnapCell icon={Clock} color="#1db954" value={snapshot.data.totalHours} suffix="h" label="Horas totales" />
            <SnapCell icon={Sigma} color="#38bdf8" value={snapshot.data.avgHoursPerGame} suffix="h" label="Media por juego" sub={`${snapshot.data.avgHoursPerPlayedGame}h por jugado`} />
            <SnapCell icon={Sigma} color="#a78bfa" value={snapshot.data.medianHours} suffix="h" label="Mediana" sub={`${snapshot.data.medianPlayedHours}h entre jugados`} />
            <SnapCell icon={Wallet} color="#1db954" value={snapshot.data.estimatedValue} prefix="$" label="Valor estimado" sub={`${snapshot.data.coveragePct}% con precio`} money />
            <SnapCell icon={Tag} color="#7c5cff" value={snapshot.data.avgGamePrice} prefix="$" label="Precio medio" money />
            <SnapCell icon={TrendingUp} color="#f59e0b" value={snapshot.data.costPerHour} prefix="$" suffix="/h" label="Costo por hora" money />
            {snapshot.data.topGame && (
              <Link
                href={`/dashboard/steam/game/${snapshot.data.topGame.appId}`}
                className="col-span-2 flex items-center gap-3 bg-[var(--color-surface)] p-4 transition hover:bg-[var(--color-surface-2)]/40 sm:col-span-1 lg:col-span-3"
              >
                <Crown className="h-7 w-7 shrink-0 text-[#f59e0b]" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">Récord de horas</p>
                  <p className="truncate text-sm font-bold text-white">{snapshot.data.topGame.name}</p>
                  <p className="text-xs text-[#f59e0b]">{snapshot.data.topGame.hours.toLocaleString()}h · tu juego de vida</p>
                </div>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Diagnóstico de sincronización ── */}
      <section className="mb-6 rounded-3xl border bg-[var(--color-surface)]">
        <button
          onClick={() => setShowDebug((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-3 text-left"
        >
          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Gauge className="h-4 w-4" /> Diagnóstico de sincronización
          </span>
          <span className="flex items-center gap-3 text-xs text-[var(--color-muted)]">
            {debug.data?.logs[0] && (
              <span className={debug.data.logs[0].diffHours >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-rose)]'}>
                {debug.data.logs[0].diffHours >= 0 ? '+' : ''}{debug.data.logs[0].diffHours}h último sync
              </span>
            )}
            <ChevronRight className={`h-4 w-4 transition ${showDebug ? 'rotate-90' : ''}`} />
          </span>
        </button>
        {showDebug && (
          <div className="border-t border-[var(--color-border)] p-5">
            {(() => {
              const last = debug.data?.logs[0];
              return (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <DbgStat label="Última sync" value={account.data?.lastSyncedAt ? new Date(account.data.lastSyncedAt).toLocaleString() : '—'} />
                    <DbgStat label="Juegos recibidos" value={last ? String(last.gamesReceived) : '—'} />
                    <DbgStat label="Horas antes → después" value={last ? `${last.hoursBefore} → ${last.hoursAfter}` : '—'} />
                    <DbgStat label="Diferencia" value={last ? `${last.diffHours >= 0 ? '+' : ''}${last.diffHours}h` : '—'} accent={(last?.diffHours ?? 0) !== 0} />
                    <DbgStat label="Duración" value={last ? `${(last.durationMs / 1000).toFixed(1)}s` : '—'} />
                    <DbgStat label="Tipo" value={last ? (last.full ? 'Completa' : 'Normal') : '—'} />
                    <DbgStat label="Errores" value={last?.error ? '⚠️ sí' : 'ninguno'} rose={!!last?.error} />
                  </div>
                  {last?.error && (
                    <p className="mt-3 rounded-xl border border-[var(--color-rose)]/40 bg-[var(--color-rose)]/10 px-3 py-2 text-xs text-[var(--color-rose)]">{last.error}</p>
                  )}
                  <button
                    onClick={forceFull}
                    disabled={fullBusy}
                    className="mt-4 flex items-center gap-2 rounded-full border border-[var(--color-accent)]/40 px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 ${fullBusy ? 'animate-spin' : ''}`} /> {fullBusy ? 'Sincronizando todo…' : 'Forzar sincronización completa'}
                  </button>
                  <p className="mt-2 text-[11px] text-[var(--color-muted)]/70">
                    El desfase de horas es normal: ves las horas del último sync hasta que vuelvas a sincronizar. La sync completa fuerza snapshot + enriquecido extra.
                  </p>
                  {debug.data && debug.data.logs.length > 1 && (
                    <div className="mt-4 space-y-1 border-t border-[var(--color-border)] pt-3">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">Historial</p>
                      {debug.data.logs.slice(0, 6).map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-[11px] text-[var(--color-muted)]">
                          <span>{new Date(l.createdAt).toLocaleString()}</span>
                          <span className="flex items-center gap-3">
                            <span>{l.gamesReceived} juegos</span>
                            <span className={l.diffHours >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-rose)]'}>{l.diffHours >= 0 ? '+' : ''}{l.diffHours}h</span>
                            <span>{(l.durationMs / 1000).toFixed(1)}s</span>
                            {l.error && <span className="text-[var(--color-rose)]">⚠️</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </section>

      {/* ── Stat cards ── */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Clock} color="#1db954" value={steamHours} suffix="h" label="Tiempo invertido" sub="Tu universo gamer acumulado" accent />
        <StatCard icon={Library} color="#7c5cff" value={s?.gameCount ?? 0} label="Biblioteca" sub={`${s?.playedCount ?? 0} jugados · ${s?.unplayedCount ?? 0} sin abrir`} />
        <StatCard icon={Skull} color="#ff5d8f" value={s?.unplayedCount ?? 0} label="Backlog" sub={`${backlog.data?.completionPct ?? Math.round(((s?.playedCount ?? 0) / (s?.gameCount || 1)) * 100)}% de tu biblioteca tocada`} />
        <StatCard icon={Crown} color="#f59e0b" value={completed} label="Dominados" sub={`+${20}h jugadas`} />
      </section>

      {/* ── ADN Gamer ── */}
      {gType && klass && (
        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border p-6 lg:col-span-3"
            style={{ background: `radial-gradient(420px 200px at 85% 0%, ${gType.color}1f, transparent), var(--color-surface)` }}
          >
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Steatify ADN · ADN Gamer
            </p>
            <div className="mt-3 flex items-center gap-5">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: `${gType.color}55`, background: `${gType.color}12` }}>
                <div className="absolute inset-0 rounded-full blur-xl" style={{ background: `${gType.color}33` }} />
                <gType.icon className="relative h-12 w-12" style={{ color: gType.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-[var(--color-muted)]">Eres un</p>
                <h2 className="text-2xl font-black" style={{ color: gType.color }}>{gType.label}</h2>
                <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">{gType.tagline}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)]/60 px-3 py-1 text-xs text-[var(--color-text)]">
                  <Gauge className="h-3.5 w-3.5" style={{ color: gType.color }} /> {gType.reason}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="rounded-3xl border bg-[var(--color-surface)] p-6 lg:col-span-2">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu perfil gamer</p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={attrs} outerRadius="72%">
                  <PolarGrid stroke="#232733" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: '#8b8f9c', fontSize: 10 }} />
                  <Radar dataKey="value" stroke={gType.color} fill={gType.color} fillOpacity={0.35} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      )}

      {/* ── Momentum: timeline incremental que Steam no da ── */}
      {momentum.data && (
        <section className="mb-6 rounded-3xl border bg-[var(--color-surface)] p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <TrendingUp className="h-4 w-4 text-[var(--color-accent)]" /> Momentum · tu actividad reciente
            </h2>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full bg-[var(--color-accent)]/15 px-3 py-1 font-bold text-[var(--color-accent)]">
                +{momentum.data.gainedTodayHours}h hoy
              </span>
              <span className="rounded-full bg-[var(--color-accent-2)]/15 px-3 py-1 font-bold text-[var(--color-accent-2)]">
                +{momentum.data.gainedWeekHours}h esta semana
              </span>
            </div>
          </div>
          {!momentum.data.hasBaseline && (
            <p className="mb-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/30 px-3 py-2 text-[11px] text-[var(--color-muted)]">
              Steam no da historial por juego — Steatify lo construye con cada sync. Las horas ganadas y los juegos que suben empiezan a contar desde tu próxima sincronización.
            </p>
          )}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <MomentumCol title="Jugados recientemente" icon={Flame} color="#1db954" games={momentum.data.recentlyPlayed} note="Últimas 2 semanas (dato de Steam)" empty="Nada estas 2 semanas." showWeeks />
            <MomentumCol title="Subieron horas" icon={TrendingUp} color="#f59e0b" games={momentum.data.rose} note="Desde el último snapshot" empty="Aún sin cambios registrados." showGained />
            <MomentumCol title="Retomados" icon={RotateCcw} color="#22d3ee" games={momentum.data.resumed} note="Activos otra vez tras dormir" empty="Ningún juego retomado (todavía)." />
          </div>
        </section>
      )}

      {/* ── Género principal (real, Steam store API) ── */}
      {genres.data && genres.data.genres.length > 0 && (
        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="relative overflow-hidden rounded-3xl border p-6" style={{ background: 'radial-gradient(360px 180px at 80% 0%, rgba(29,185,84,0.14), transparent), var(--color-surface)' }}>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <Gamepad2 className="h-4 w-4 text-[var(--color-accent)]" /> Género principal
            </p>
            <p className="mt-3 text-4xl font-black text-[var(--color-accent)]">{genres.data.topGenre}</p>
            {(() => {
              const total = genres.data.genres.reduce((a, g) => a + g.hours, 0) || 1;
              const top = genres.data.genres[0];
              return (
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {Math.round((top.hours / total) * 100)}% de tu tiempo · {top.hours.toLocaleString()}h
                </p>
              );
            })()}
            {genres.data.enrichedPct < 100 && (
              <p className="mt-3 text-[11px] text-[var(--color-muted)]/70">
                Basado en el {genres.data.enrichedPct}% de tu biblioteca con géneros (el resto se completa al sincronizar).
              </p>
            )}
          </div>

          <div className="rounded-3xl border bg-[var(--color-surface)] p-6 lg:col-span-2">
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu universo por género</p>
            <div className="space-y-2.5">
              {(() => {
                const max = genres.data.genres[0]?.hours || 1;
                return genres.data.genres.slice(0, 8).map((g, i) => (
                  <div key={g.genre}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text)]">{g.genre}</span>
                      <span className="tabular-nums text-[var(--color-muted)]">{g.hours.toLocaleString()}h</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(g.hours / max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full"
                        style={{ background: ['#1db954', '#7c5cff', '#38bdf8', '#f59e0b', '#ff5d8f', '#34d399'][i % 6] }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>
      )}

      {/* ── Evolución mensual (snapshots) ── */}
      {evolution.data && (
        <section className="mb-6 rounded-3xl border bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Clock className="h-4 w-4 text-[var(--color-accent)]" /> Evolución de tu tiempo
          </h2>
          {(() => {
            const months = evolution.data.monthly.filter((m) => m.hours > 0);
            if (months.length < 2) {
              return (
                <p className="text-sm text-[var(--color-muted)]">
                  Tu curva mensual se construye con cada sincronización (Steam no da historial, así que
                  la vamos registrando). Snapshot inicial: <span className="font-semibold text-white">{steamHours.toLocaleString()}h</span>.
                  Vuelve en unos días para ver tu evolución real.
                </p>
              );
            }
            const max = Math.max(...months.map((m) => m.hours), 1);
            return (
              <div className="flex items-end gap-3">
                {months.map((m, i) => (
                  <div key={m.month} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs font-bold tabular-nums text-white">{m.hours}h</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(m.hours / max) * 120 + 6}px` }}
                      transition={{ duration: 0.6, delay: i * 0.06 }}
                      className="w-full rounded-t-lg bg-gradient-to-t from-[var(--color-accent)]/50 to-[var(--color-accent)]"
                    />
                    <span className="text-[10px] text-[var(--color-muted)]">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>
      )}

      {/* ── Steatify te recomienda (empezar nuevos / retomar abandonados) ── */}
      {(recs.start.length > 0 || recs.revive.length > 0) && (
        <section className="mb-6">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <Sparkles className="h-4 w-4 text-[var(--color-accent)]" /> Steatify te recomienda
            </h2>
            {(recsPool.start.length > 6 || recsPool.revive.length > 6) && (
              <button
                onClick={() => setRerollRecs((r) => r + 1)}
                className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)]/50 hover:text-[var(--color-accent)]"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Ver otras
              </button>
            )}
          </div>
          <p className="mb-4 text-xs text-[var(--color-muted)]/70">
            Qué jugar después — elegido por calidad, popularidad, tus géneros más jugados y franquicias reconocidas. Rotan cada semana.
          </p>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {recs.start.length > 0 && (
              <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--color-accent)]">
                  <Sparkles className="h-4 w-4" /> Para empezar
                  <span className="font-normal normal-case text-[var(--color-muted)]">· nunca abiertos</span>
                </p>
                <div className="space-y-2">
                  {recs.start.map((p, i) => (
                    <RecRow
                      key={p.game.appId}
                      g={p.game}
                      reason={startMsgs[i]}
                      delay={i * 0.05}
                      badge={`${p.score}`}
                      badgeIcon={Star}
                      badgeColor="#7c5cff"
                    />
                  ))}
                </div>
              </div>
            )}
            {recs.revive.length > 0 && (
              <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
                <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[#f59e0b]">
                  <Hourglass className="h-4 w-4" /> Para retomar
                  <span className="font-normal normal-case text-[var(--color-muted)]">· los dejaste a medias</span>
                </p>
                <div className="space-y-2">
                  {recs.revive.map((p, i) => (
                    <RecRow
                      key={p.game.appId}
                      g={p.game}
                      reason={reviveMsgs[i]}
                      delay={i * 0.05}
                      badge={`${Math.round(p.game.hoursForever)}h`}
                      badgeIcon={Clock}
                      badgeColor="#f59e0b"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Joya oculta (nueva estadística) ── */}
      {hiddenGem && (
        <section className="mb-6">
          <Link
            href={`/dashboard/steam/game/${hiddenGem.appId}`}
            className="group relative flex items-center gap-4 overflow-hidden rounded-3xl border bg-[var(--color-surface)] p-4 transition hover:border-[#fbbf24]/40"
          >
            <span className="absolute inset-y-0 left-0 w-1" style={{ background: 'linear-gradient(#fbbf24,#f59e0b)' }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hiddenGem.headerUrl} alt="" className="h-20 w-36 shrink-0 rounded-xl object-cover" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#fbbf24]">
                <Gem className="h-3.5 w-3.5" /> Joya oculta
              </p>
              <p className="truncate text-lg font-black text-white">{hiddenGem.name}</p>
              <p className="text-xs text-[var(--color-muted)]">
                Metacritic <span className="font-bold text-[#fbbf24]">{hiddenGem.metacritic}</span> · y solo le has dado{' '}
                <span className="font-bold text-white">{hiddenGem.hoursForever}h</span>. Te estás perdiendo algo bueno.
              </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-1 group-hover:text-[#fbbf24]" />
          </Link>
        </section>
      )}

      {/* ── Economía de tu biblioteca (estilo SteamDB) ── */}
      {economy.data && economy.data.pricedCount > 0 && (
        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-3xl border bg-[var(--color-surface)] p-6 lg:col-span-2">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Valor de tu biblioteca</p>
            <p className="text-4xl font-black text-[var(--color-accent)]">${economy.data.totalValue.toLocaleString()}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-[var(--color-surface-2)]/30 p-3">
                <p className="text-lg font-bold text-white">${economy.data.playedValue.toLocaleString()}</p>
                <p className="text-[10px] text-[var(--color-muted)]">en juegos jugados</p>
              </div>
              <div className="rounded-xl border bg-[var(--color-surface-2)]/30 p-3">
                <p className="text-lg font-bold text-[var(--color-rose)]">${economy.data.unplayedValue.toLocaleString()}</p>
                <p className="text-[10px] text-[var(--color-muted)]">en backlog sin jugar 💀</p>
              </div>
            </div>
            <p className="mt-3 flex items-center justify-between text-xs">
              <span className="text-[var(--color-muted)]">Costo por hora jugada</span>
              <span className="font-bold text-white">${economy.data.pricePerHour}/h</span>
            </p>
            <p className="mt-2 text-[10px] text-[var(--color-muted)]/70">
              Precios actuales de la Store · {economy.data.coveragePct}% de tu biblioteca con precio (el resto se completa al sincronizar).
            </p>
          </div>

          <div className="rounded-3xl border bg-[var(--color-surface)] p-6 lg:col-span-3">
            <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <BarChart3 className="h-4 w-4" /> Distribución de tu biblioteca
            </p>
            <p className="mb-4 text-[10px] text-[var(--color-muted)]/70">El perfil real del jugador: si coleccionas más de lo que juegas, se nota.</p>
            <div className="space-y-2">
              {(() => {
                const hist = snapshot.data?.histogram ?? [];
                const max = Math.max(...hist.map((h) => h.count), 1);
                // Cold → hot gradient as hours climb.
                const colors = ['#ff5d8f', '#fb7185', '#a78bfa', '#7c5cff', '#38bdf8', '#22d3ee', '#34d399', '#1db954', '#f59e0b', '#fbbf24'];
                return hist.map((b, i) => (
                  <div key={b.key} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-right text-xs tabular-nums text-[var(--color-muted)]">{b.label}</span>
                    <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-white/5">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(b.count / max) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, delay: i * 0.04 }}
                        className="h-full rounded-full"
                        style={{ background: colors[i] }}
                      />
                    </div>
                    <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums text-white">{b.count}</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </section>
      )}

      {/* ── Backlog cementerio ── */}
      {backlog.data && (
        <section className="mb-6 rounded-3xl border bg-[var(--color-surface)] p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Flame className="h-4 w-4 text-[var(--color-rose)]" /> Tu cementerio gamer
          </h2>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <Mini value={backlog.data.neverPlayedCount} label="nunca abiertos" color="#ff5d8f" sub={`${Math.round((backlog.data.neverPlayedCount / (s?.gameCount || 1)) * 100)}% de tu biblioteca`} />
            <Mini value={backlog.data.barelyTouchedCount} label="apenas tocados (<2h)" color="#7c5cff" />
            <Mini value={backlog.data.playedCount} label="jugados" color="#1db954" sub="¡Buen trabajo!" />
          </div>
          <p className="mb-4 flex items-center gap-2 rounded-2xl border border-[var(--color-accent-2)]/30 bg-[var(--color-accent-2)]/10 px-4 py-3 text-sm text-[var(--color-text)]">
            <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent-2)]" /> {backlog.data.message}
          </p>
          {promesas.length > 0 && (
            <>
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  Promesas pendientes
                  <span className="rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] text-[var(--color-accent)]">
                    por afinidad + rating · rotan cada semana
                  </span>
                </p>
                {promesasPool.length > 8 && (
                  <button
                    onClick={() => setRerollGrave((r) => r + 1)}
                    className="flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-rose)]/50 hover:text-[var(--color-rose)]"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Ver otras
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {promesas.map((g, i) => (
                  <GameCard key={g.appId} g={g} delay={i * 0.04} showState />
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* ── Mercado de juegos ── */}
      {(market.rising.length > 0 || market.abandoned.length > 0) && (
        <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <MarketCol title="Subiendo" icon={TrendingUp} color="#1db954" empty="Nada en racha estas 2 semanas.">
            {market.rising.map((g, i) => (
              <MarketRow key={g.appId} g={g} color="#1db954" delay={i * 0.04} note={`+${g.hours2Weeks}h estas 2 semanas`} />
            ))}
          </MarketCol>
          <MarketCol title="Abandonados" icon={Hourglass} color="#ff5d8f" empty="No has abandonado nada (todavía).">
            {market.abandoned.map(({ game, days }, i) => (
              <MarketRow key={game.appId} g={game} color="#ff5d8f" delay={i * 0.04} note={`Última sesión hace ${days} días`} />
            ))}
          </MarketCol>
        </section>
      )}

      {/* ── Biblioteca / colección ── */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            Tu colección{games.length > 0 ? ` · ${games.length}` : ''}
            <Link href="/dashboard/steam/library" className="rounded-full border px-3 py-1 text-[11px] font-medium normal-case tracking-normal text-[var(--color-accent)] transition hover:border-[var(--color-accent)]/50">
              Ver biblioteca completa →
            </Link>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border bg-[var(--color-surface)] px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-[var(--color-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar…"
                className="w-28 bg-transparent text-sm outline-none placeholder:text-[var(--color-muted)]"
              />
            </div>
            {(
              [
                ['all', 'Todos'],
                ['played', 'Jugados'],
                ['unplayed', 'Sin abrir'],
                ['abandoned', 'Abandonados'],
                ['hours', 'Más horas'],
              ] as [LibFilter, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  filter === key ? 'border-transparent bg-[var(--color-surface-2)] text-white' : 'text-[var(--color-muted)] hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="mx-1 hidden h-5 w-px self-center bg-[var(--color-border)] sm:block" />
            {([50, 100, 9999] as const).map((n) => (
              <button
                key={n}
                onClick={() => setShown(n)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  shown === n ? 'border-transparent bg-[var(--color-accent)] font-semibold text-black' : 'text-[var(--color-muted)] hover:text-white'
                }`}
              >
                {n === 9999 ? 'Todos' : n}
              </button>
            ))}
          </div>
        </div>

        {library.isLoading ? (
          <div className="h-40 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
        ) : games.length === 0 ? (
          <div className="rounded-3xl border bg-[var(--color-surface)] p-6 text-[var(--color-muted)]">
            {query ? 'Ningún juego coincide.' : 'Biblioteca vacía. ¿Tu perfil de Steam es público?'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {games.slice(0, shown).map((g, i) => (
              <GameCard key={g.appId} g={g} delay={Math.min(i, 12) * 0.02} showState />
            ))}
          </div>
        )}
        {games.length > shown && (
          <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
            Mostrando {Math.min(shown, games.length)} de {games.length}.{' '}
            <Link href="/dashboard/steam/library" className="text-[var(--color-accent)]">Biblioteca completa →</Link>
          </p>
        )}
      </section>
    </div>
  );
}

/* ───────────────── helpers / components ───────────────── */

function StatCard({
  icon: IconCmp,
  color,
  value,
  suffix,
  label,
  sub,
  accent,
}: {
  icon: LucideIcon;
  color: string;
  value: number;
  suffix?: string;
  label: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border bg-[var(--color-surface)] p-5"
      style={accent ? { boxShadow: `inset 0 0 60px -30px ${color}` } : undefined}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        <IconCmp className="h-4 w-4" /> {label}
      </div>
      <p className="text-3xl font-black text-white">
        <CountUp value={value} />
        {suffix}
      </p>
      {sub && <p className="mt-0.5 text-xs text-[var(--color-muted)]">{sub}</p>}
    </motion.div>
  );
}

/** Dense metric cell for the Profile Snapshot grid (SteamDB-style). */
function SnapCell({
  icon: IconCmp,
  color,
  value,
  prefix,
  suffix,
  label,
  sub,
  money,
}: {
  icon: LucideIcon;
  color: string;
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  sub?: string;
  money?: boolean;
}) {
  return (
    <div className="bg-[var(--color-surface)] p-4">
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
        <IconCmp className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-2xl font-black tabular-nums text-white">
        {prefix}
        {money ? value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : <CountUp value={value} />}
        {suffix && <span className="text-base font-bold text-[var(--color-muted)]">{suffix}</span>}
      </p>
      {sub && <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{sub}</p>}
    </div>
  );
}

/** A single recommendation row: thumbnail + name + "why" + a signal badge. */
function RecRow({
  g,
  reason,
  delay,
  badge,
  badgeIcon: BadgeIcon,
  badgeColor,
}: {
  g: SteamGame;
  reason: string;
  delay: number;
  badge: string;
  badgeIcon: LucideIcon;
  badgeColor: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}>
      <Link
        href={`/dashboard/steam/game/${g.appId}`}
        className="group flex items-center gap-3 rounded-2xl border border-transparent bg-[var(--color-surface-2)]/30 p-2 transition hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-surface-2)]/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.headerUrl} alt="" loading="lazy" className="h-12 w-[88px] shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{g.name}</p>
          <p className="line-clamp-2 text-[11px] leading-snug text-[var(--color-muted)]">{reason}</p>
        </div>
        <span
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-bold tabular-nums"
          style={{ background: `${badgeColor}22`, color: badgeColor }}
        >
          <BadgeIcon className="h-3.5 w-3.5" /> {badge}
        </span>
      </Link>
    </motion.div>
  );
}

function DbgStat({ label, value, accent, rose }: { label: string; value: string; accent?: boolean; rose?: boolean }) {
  return (
    <div className="rounded-xl border bg-[var(--color-surface-2)]/30 p-3">
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className={`mt-0.5 text-sm font-semibold ${rose ? 'text-[var(--color-rose)]' : accent ? 'text-[var(--color-accent)]' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function Mini({ value, label, color, sub }: { value: number; label: string; color: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface-2)]/40 p-4 text-center">
      <p className="text-2xl font-bold" style={{ color }}>
        <CountUp value={value} />
      </p>
      <p className="mt-0.5 text-xs text-[var(--color-muted)]">{label}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)]/70">{sub}</p>}
    </div>
  );
}

function MarketCol({
  title,
  icon: IconCmp,
  color,
  empty,
  children,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  empty: string;
  children: React.ReactNode;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color }}>
        <IconCmp className="h-4 w-4" /> {title}
      </h3>
      <div className="space-y-2">{hasChildren ? children : <p className="text-sm text-[var(--color-muted)]">{empty}</p>}</div>
    </div>
  );
}

function MomentumCol({
  title,
  icon: IconCmp,
  color,
  games,
  note,
  empty,
  showWeeks,
  showGained,
}: {
  title: string;
  icon: LucideIcon;
  color: string;
  games: (SteamGame & { gainedHours?: number })[];
  note: string;
  empty: string;
  showWeeks?: boolean;
  showGained?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color }}>
        <IconCmp className="h-4 w-4" /> {title}
      </p>
      <p className="mb-3 text-[10px] text-[var(--color-muted)]/70">{note}</p>
      {games.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)]">{empty}</p>
      ) : (
        <div className="space-y-2">
          {games.slice(0, 6).map((g, i) => (
            <motion.div key={g.appId} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
              <Link
                href={`/dashboard/steam/game/${g.appId}`}
                className="flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-[var(--color-surface-2)]/50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.iconUrl ?? g.headerUrl} alt="" loading="lazy" className="h-9 w-9 rounded-md object-cover" />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{g.name}</p>
                <span className="shrink-0 text-xs font-bold tabular-nums" style={{ color }}>
                  {showGained ? `+${g.gainedHours ?? 0}h` : showWeeks ? `${g.hours2Weeks}h` : `${g.hoursForever}h`}
                </span>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function MarketRow({ g, color, note, delay }: { g: SteamGame; color: string; note: string; delay: number }) {
  return (
    <motion.a
      href={`https://store.steampowered.com/app/${g.appId}`}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-[var(--color-surface-2)]/50"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={g.iconUrl ?? g.headerUrl} alt="" className="h-10 w-10 rounded-md object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{g.name}</p>
        <p className="truncate text-xs" style={{ color }}>{note}</p>
      </div>
      <span className="shrink-0 text-sm font-bold tabular-nums text-[var(--color-muted)]">{g.hoursForever}h</span>
    </motion.a>
  );
}

function GameCard({ g, delay, showState }: { g: SteamGame; delay: number; showState?: boolean }) {
  const state = gameState(g);
  const meta = STATE_META[state];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }} whileHover={{ y: -3 }}>
      <Link
        href={`/dashboard/steam/game/${g.appId}`}
        className="group relative block overflow-hidden rounded-2xl border bg-[var(--color-surface)] transition hover:border-[var(--color-accent)]/50"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.headerUrl} alt={g.name} className="aspect-[460/215] w-full object-cover" loading="lazy" />
        {showState && (
          <span
            className="absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur"
            style={{ background: `${meta.color}28`, color: meta.color }}
          >
            <meta.icon className="h-3 w-3" /> {meta.label}
          </span>
        )}
        <div className="p-3">
          <p className="truncate text-sm font-medium text-white">{g.name}</p>
          <p className="text-xs text-[var(--color-accent)]">{g.hoursForever > 0 ? `${g.hoursForever.toLocaleString()} h` : 'Sin jugar'}</p>
        </div>
      </Link>
    </motion.div>
  );
}
