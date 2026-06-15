'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  Crown,
  TrendingUp,
  TrendingDown,
  Music2,
  Trophy,
  Flame,
  Moon,
  Repeat,
  Gem,
  Sparkles,
  ChevronRight,
  History,
  Rocket,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react';
import { api, type Range, type TopType, type TopItem, type ChartRecord, type HallOfFameEntry, type AlbumCompletion } from '@/lib/api';

const TYPES: { key: TopType; label: string }[] = [
  { key: 'tracks', label: 'Canciones' },
  { key: 'artists', label: 'Artistas' },
  { key: 'albums', label: 'Álbumes' },
  { key: 'genres', label: 'Géneros' },
];
const RANGES: { key: Range; label: string; days: number | null }[] = [
  { key: '24h', label: 'Hoy', days: 1 },
  { key: '7d', label: 'Semana', days: 7 },
  { key: '30d', label: 'Mes', days: 30 },
  { key: '365d', label: 'Año', days: 365 },
  { key: 'all', label: 'Toda tu historia', days: null },
];

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
function prevWindow(days: number) {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 2 * days + 1);
  const to = new Date(today);
  to.setDate(today.getDate() - days);
  return { from: iso(from), to: iso(to) };
}

export default function RankingsPage() {
  const [type, setType] = useState<TopType>('tracks');
  const [range, setRange] = useState<Range>('30d');
  const rangeCfg = RANGES.find((r) => r.key === range)!;

  const top = useSWR(`charts:${type}:${range}`, () => api.top(type, range, 40));
  const prev = useSWR(
    rangeCfg.days ? `charts:prev:${type}:${range}` : null,
    () => api.topW(type, prevWindow(rangeCfg.days as number), 60),
  );
  const records = useSWR(type === 'tracks' ? 'charts:records' : null, api.chartsRecords);
  const songMovers = useSWR(type === 'tracks' ? 'charts:movers' : null, () => api.songTrends(rangeCfg.days ?? 30));
  const albumsData = useSWR(type === 'albums' ? 'charts:albums' : null, api.chartsAlbums);
  const erasData = useSWR(type === 'artists' ? 'eras' : null, api.eras);

  const eraByArtist = useMemo(() => {
    const m = new Map<string, { months: number; label: string }>();
    for (const e of erasData.data ?? []) {
      const a = e.dominantArtists?.[0];
      if (!a) continue;
      const cur = m.get(a) ?? { months: 0, label: '' };
      cur.months += 1;
      if (!cur.label) cur.label = new Date(e.startDate).toLocaleDateString('es', { month: 'long', year: 'numeric' });
      m.set(a, cur);
    }
    return m;
  }, [erasData.data]);

  const prevRank = useMemo(() => {
    const m = new Map<string, number>();
    (prev.data ?? []).forEach((it, i) => m.set(it.id, i + 1));
    return m;
  }, [prev.data]);

  const items = top.data ?? [];
  const podium = items.slice(0, 3);
  const rest = items.slice(3);
  const isTracks = type === 'tracks';

  return (
    <div className="mx-auto max-w-7xl pb-12">
      {/* Header */}
      <div className="mb-6">
        <h1 className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-4xl font-black tracking-tight text-transparent">
          SONORA CHARTS
        </h1>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--color-muted)]">
          <Music2 className="h-4 w-4" /> Los sonidos que dominaron tu vida.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex gap-1 rounded-full border bg-[var(--color-surface-2)]/40 p-1">
          {TYPES.map((t) => (
            <Chip key={t.key} active={type === t.key} onClick={() => setType(t.key)}>{t.label}</Chip>
          ))}
        </div>
        <div className="inline-flex gap-1 rounded-full border bg-[var(--color-surface-2)]/40 p-1">
          {RANGES.map((r) => (
            <Chip key={r.key} active={range === r.key} onClick={() => setRange(r.key)}>{r.label}</Chip>
          ))}
        </div>
      </div>

      {top.isLoading ? (
        <div className="h-96 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
      ) : items.length === 0 ? (
        <div className="rounded-3xl border bg-[var(--color-surface)] p-10 text-center text-[var(--color-muted)]">
          Sin datos para este periodo. Prueba otro rango.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            {/* Podium */}
            <Podium items={podium} prevRank={prevRank} type={type} />

            {/* Main ranking */}
            <section className="rounded-3xl border bg-[var(--color-surface)] p-5">
              <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                <span>Top {TYPES.find((t) => t.key === type)?.label} · {rangeCfg.label}</span>
                <span>Cambio</span>
              </div>
              <div className="space-y-1.5">
                {rest.map((it, i) => (
                  <RankRow
                    key={it.id}
                    it={it}
                    rank={i + 4}
                    prevRank={prevRank.get(it.id)}
                    hasPrev={!!rangeCfg.days}
                    type={type}
                    delay={i * 0.02}
                    extra={type === 'artists' ? artistEraTag(eraByArtist.get(it.name)) : undefined}
                  />
                ))}
              </div>
            </section>

            {/* Completitud de álbumes */}
            {type === 'albums' && albumsData.data && albumsData.data.length > 0 && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Completitud de álbumes</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {albumsData.data.map((a, i) => (
                    <AlbumCard key={a.albumId} a={a} delay={i * 0.03} />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-[var(--color-muted)]/70">
                  Solo álbumes con metadata completa de Spotify (los importados del historial no traen álbum).
                </p>
              </section>
            )}

            {/* Momentos del mes (tracks) */}
            {isTracks && songMovers.data && (songMovers.data.rising.length > 0 || songMovers.data.comebacks.length > 0) && (
              <section>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Momentos del periodo</h2>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {songMovers.data.rising[0] && (
                    <Moment icon={Rocket} color="#1db954" tag="Despegando" name={songMovers.data.rising[0].name} artist={songMovers.data.rising[0].artist} note={songMovers.data.rising[0].trendPct != null ? `+${songMovers.data.rising[0].trendPct}%` : 'nuevo'} trackId={songMovers.data.rising[0].trackId} />
                  )}
                  {songMovers.data.comebacks[0] && (
                    <Moment icon={RotateCcw} color="#fbbf24" tag="Regreso" name={songMovers.data.comebacks[0].name} artist={songMovers.data.comebacks[0].artist} note={`tras ${songMovers.data.comebacks[0].daysGone}d`} trackId={songMovers.data.comebacks[0].trackId} />
                  )}
                  {records.data?.records.biggestLoop && (
                    <Moment icon={Flame} color="#f59e0b" tag="Obsesión" name={records.data.records.biggestLoop.name} artist={records.data.records.biggestLoop.artist} note={records.data.records.biggestLoop.metric} trackId={records.data.records.biggestLoop.trackId} />
                  )}
                  {songMovers.data.rising[1] && (
                    <Moment icon={TrendingUp} color="#38bdf8" tag="En alza" name={songMovers.data.rising[1].name} artist={songMovers.data.rising[1].artist} note={songMovers.data.rising[1].trendPct != null ? `+${songMovers.data.rising[1].trendPct}%` : 'sube'} trackId={songMovers.data.rising[1].trackId} />
                  )}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar (tracks only) */}
          {isTracks && (
            <aside className="space-y-4">
              <RecordsCard data={records.data?.records} />
              <HallOfFameCard entries={records.data?.hallOfFame ?? []} />
            </aside>
          )}
        </div>
      )}
    </div>
  );
}

/* ───────────────── Podium ───────────────── */

function Podium({ items, prevRank, type }: { items: TopItem[]; prevRank: Map<string, number>; type: TopType }) {
  if (items.length === 0) return null;
  const order = [items[1], items[0], items[2]].filter(Boolean); // 2 - 1 - 3
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {order.map((it) => {
        const rank = items.indexOf(it) + 1;
        const isFirst = rank === 1;
        return (
          <PodiumCard key={it.id} it={it} rank={rank} isFirst={isFirst} prevRank={prevRank.get(it.id)} type={type} />
        );
      })}
    </div>
  );
}

function PodiumCard({ it, rank, isFirst, prevRank, type }: { it: TopItem; rank: number; isFirst: boolean; prevRank?: number; type: TopType }) {
  const color = rank === 1 ? '#f5b301' : rank === 2 ? '#a78bfa' : '#ff5d8f';
  const body = (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: rank * 0.08 }}
      whileHover={{ y: -3 }}
      className={`relative overflow-hidden rounded-3xl border p-4 text-center ${isFirst ? 'pb-6' : ''}`}
      style={{ background: `radial-gradient(220px 120px at 50% 0%, ${color}26, var(--color-surface))`, borderColor: `${color}44` }}
    >
      {isFirst && <Crown className="mx-auto mb-1 h-7 w-7" style={{ color }} />}
      <span className="absolute left-3 top-3 text-2xl font-black" style={{ color }}>{rank}</span>
      <div className="mx-auto mb-2 mt-1 overflow-hidden rounded-2xl" style={{ width: isFirst ? 120 : 84, height: isFirst ? 120 : 84 }}>
        {it.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={it.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--color-surface-2)]"><Music2 className="h-8 w-8 text-[var(--color-muted)]" /></div>
        )}
      </div>
      <p className={`truncate font-bold text-white ${isFirst ? 'text-lg' : 'text-sm'}`}>{it.name}</p>
      {it.subtitle && <p className="truncate text-xs text-[var(--color-muted)]">{it.subtitle}</p>}
      <p className="mt-1 text-sm font-semibold" style={{ color }}>{it.plays} reproducciones</p>
      <div className="mt-1"><Change rank={rank} prevRank={prevRank} hasPrev /></div>
      {isFirst && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ background: `${color}22`, color }}>
          <Crown className="h-3 w-3" /> Tu obsesión del momento
        </span>
      )}
    </motion.div>
  );
  const href = type === 'tracks' ? `/dashboard/song/${it.id}` : type === 'artists' ? `/dashboard/artist/${it.id}` : null;
  return href ? <Link href={href}>{body}</Link> : body;
}

/* ───────────────── Ranking row ───────────────── */

function RankRow({ it, rank, prevRank, hasPrev, type, delay, extra }: { it: TopItem; rank: number; prevRank?: number; hasPrev: boolean; type: TopType; delay: number; extra?: string }) {
  const max = it.plays || 1;
  const body = (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      whileHover={{ x: 2 }}
      className="group flex items-center gap-3 rounded-2xl px-2 py-2 transition hover:bg-[var(--color-surface-2)]/50"
    >
      <div className="w-9 shrink-0 text-center">
        <p className="text-lg font-black text-white">{rank}</p>
        {hasPrev && <Change rank={rank} prevRank={prevRank} hasPrev compact />}
      </div>
      {it.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={it.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-surface-2)]"><Music2 className="h-4 w-4 text-[var(--color-muted)]" /></div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{it.name}</p>
        {it.subtitle && <p className="truncate text-xs text-[var(--color-muted)]">{it.subtitle}</p>}
        {extra && <p className="truncate text-[11px] text-[var(--color-accent-2)]">{extra}</p>}
      </div>
      <div className="hidden w-28 shrink-0 sm:block">
        <p className="text-right text-sm font-bold tabular-nums text-white">{it.plays}</p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.min(100, (it.plays / max) * 100)}%` }} />
        </div>
      </div>
      <div className="hidden w-24 shrink-0 text-right md:block"><Change rank={rank} prevRank={prevRank} hasPrev={hasPrev} withLabel /></div>
      {(type === 'tracks' || type === 'artists') && <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-0.5" />}
    </motion.div>
  );
  const href = type === 'tracks' ? `/dashboard/song/${it.id}` : type === 'artists' ? `/dashboard/artist/${it.id}` : null;
  return href ? <Link href={href}>{body}</Link> : body;
}

function Change({ rank, prevRank, hasPrev, compact, withLabel }: { rank: number; prevRank?: number; hasPrev: boolean; compact?: boolean; withLabel?: boolean }) {
  if (!hasPrev) return null;
  if (prevRank == null) {
    return <span className={`font-bold text-[var(--color-accent-2)] ${compact ? 'text-[10px]' : 'text-xs'}`}>NEW{withLabel ? ' · entró al chart' : ''}</span>;
  }
  const delta = prevRank - rank;
  if (delta === 0) return <span className={`text-[var(--color-muted)] ${compact ? 'text-[10px]' : 'text-xs'}`}>={withLabel ? ' · sin cambios' : ''}</span>;
  const up = delta > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const color = up ? 'var(--color-accent)' : 'var(--color-rose)';
  return (
    <span className={`inline-flex items-center justify-end gap-0.5 font-semibold ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color }}>
      <Icon className="h-3 w-3" /> {Math.abs(delta)}{withLabel ? ` puesto${Math.abs(delta) > 1 ? 's' : ''}` : ''}
    </span>
  );
}

/* ───────────────── Momentos ───────────────── */

function Moment({ icon: Icon, color, tag, name, artist, note, trackId }: { icon: LucideIcon; color: string; tag: string; name: string; artist: string | null; note: string; trackId: string }) {
  return (
    <Link href={`/dashboard/song/${trackId}`} className="block rounded-2xl border bg-[var(--color-surface)] p-4 transition hover:border-[var(--color-accent)]/40">
      <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
        <Icon className="h-3.5 w-3.5" /> {tag}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white">{name}</p>
      <p className="truncate text-xs text-[var(--color-muted)]">{artist}</p>
      <p className="mt-1 text-xs font-bold" style={{ color }}>{note}</p>
    </Link>
  );
}

/* ───────────────── Records + Hall of Fame ───────────────── */

type RecordKey = 'mostPlayed' | 'mostNocturnal' | 'biggestLoop' | 'oldestAlive';
const RECORD_META: { key: RecordKey; icon: LucideIcon; color: string; label: string }[] = [
  { key: 'mostPlayed', icon: Flame, color: '#f59e0b', label: 'Más escuchada de siempre' },
  { key: 'mostNocturnal', icon: Moon, color: '#7c5cff', label: 'Canción más nocturna' },
  { key: 'biggestLoop', icon: Repeat, color: '#1db954', label: 'Mayor loop' },
  { key: 'oldestAlive', icon: Gem, color: '#38bdf8', label: 'Más antigua todavía viva' },
];

function RecordsCard({ data }: { data?: { mostPlayed: ChartRecord | null; mostNocturnal: ChartRecord | null; biggestLoop: ChartRecord | null; oldestAlive: ChartRecord | null } }) {
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Trophy className="h-4 w-4 text-[var(--color-accent-2)]" /> Tus récords
      </p>
      <div className="space-y-3">
        {RECORD_META.map((m) => {
          const rec = data?.[m.key];
          return (
            <Link key={m.key} href={rec ? `/dashboard/song/${rec.trackId}` : '#'} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `${m.color}1f` }}>
                <m.icon className="h-4 w-4" style={{ color: m.color }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] text-[var(--color-muted)]">{m.label}</p>
                <p className="truncate text-sm font-semibold text-white">{rec?.name ?? '—'}</p>
                {rec && <p className="truncate text-[11px]" style={{ color: m.color }}>{rec.metric}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function HallOfFameCard({ entries }: { entries: HallOfFameEntry[] }) {
  const top = entries[0];
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Crown className="h-4 w-4 text-[#f5b301]" /> Hall of Fame
      </p>
      {!top ? (
        <p className="text-sm text-[var(--color-muted)]">Tus leyendas aparecerán cuando una canción acumule historia.</p>
      ) : (
        <>
          <Link href={`/dashboard/song/${top.trackId}`} className="block">
            <div className="overflow-hidden rounded-2xl">
              {top.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={top.imageUrl} alt="" className="aspect-square w-full object-cover" />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-[var(--color-surface-2)]"><Music2 className="h-10 w-10 text-[var(--color-muted)]" /></div>
              )}
            </div>
            <p className="mt-2 font-bold text-white">{top.name}</p>
            <p className="text-xs text-[var(--color-muted)]">{top.artist}</p>
          </Link>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge color="#f5b301" icon={Crown}>Leyenda personal</Badge>
            {top.alive ? <Badge color="#ff5d8f" icon={Flame}>Inmortal</Badge> : <Badge color="#64748b" icon={History}>Dormida</Badge>}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <Mini label="Entró" value={String(top.enteredYear)} />
            <Mini label="Plays" value={String(top.plays)} />
            <Mini label="Reinados" value={`${top.reigns} ${top.reigns === 1 ? 'mes' : 'meses'}`} />
          </div>
          {entries.length > 1 && (
            <div className="mt-3 space-y-1 border-t border-[var(--color-border)] pt-3">
              {entries.slice(1, 4).map((e) => (
                <Link key={e.trackId} href={`/dashboard/song/${e.trackId}`} className="flex items-center gap-2 text-xs">
                  <Gem className="h-3 w-3 text-[#f5b301]" />
                  <span className="truncate text-[var(--color-text)]">{e.name}</span>
                  <span className="ml-auto tabular-nums text-[var(--color-muted)]">{e.plays}</span>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ───────────────── bits ───────────────── */

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm transition ${active ? 'bg-[var(--color-accent)] font-semibold text-black' : 'text-[var(--color-muted)] hover:text-white'}`}
    >
      {children}
    </button>
  );
}

function Badge({ color, icon: Icon, children }: { color: string; icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${color}1f`, color }}>
      <Icon className="h-3 w-3" /> {children}
    </span>
  );
}

function artistEraTag(e?: { months: number; label: string }): string | undefined {
  if (!e) return undefined;
  return e.months > 1 ? `Recurrente · dominó ${e.months} meses` : `Dominó ${e.label}`;
}

function AlbumCard({ a, delay }: { a: AlbumCompletion; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center gap-3 rounded-2xl border bg-[var(--color-surface)] p-3"
    >
      {a.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={a.imageUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
      ) : (
        <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--color-surface-2)]"><Music2 className="h-5 w-5 text-[var(--color-muted)]" /></div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{a.name}</p>
        <p className="truncate text-xs text-[var(--color-muted)]">{a.artist ?? '—'}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${a.pct}%` }}
              transition={{ duration: 0.6, delay: delay + 0.1 }}
              className="h-full rounded-full bg-[var(--color-accent)]"
            />
          </div>
          <span className="shrink-0 text-[11px] font-semibold tabular-nums text-[var(--color-accent)]">{a.pct}%</span>
        </div>
        <p className="mt-0.5 text-[10px] text-[var(--color-muted)]">{a.listened}/{a.total} canciones · {a.plays} plays</p>
      </div>
    </motion.div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)]/40 py-2">
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
