'use client';

import { useMemo, useRef, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { toBlob } from 'html-to-image';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { api, type WrappedAward, type TimelineEvent } from '@/lib/api';
import { CountUp } from '@/components/CountUp';
import { Waveform } from '@/components/Waveform';
import { EvolutionAdn } from '@/components/EvolutionAdn';
import {
  dnaBars,
  passportAttributes,
  comebackArtist,
  passportClass,
} from '@/lib/wrapped-derive';
import { Icon, dnaBarIcon, type LucideIcon } from '@/lib/icons';
import {
  Gift,
  Download,
  Share2,
  Headphones,
  Music,
  Mic2,
  Medal,
  Sparkles,
  Gamepad2,
  Skull,
  Clock,
  Repeat,
  Moon,
  ShoppingCart,
  Swords,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

type Period = 'week' | 'month' | 'season' | 'year' | 'all';
const PERIODS: { key: Period; label: string; clock: 'today' | '30d' | '365d' | 'all' }[] = [
  { key: 'week', label: 'Semana', clock: '30d' },
  { key: 'month', label: 'Mes', clock: '30d' },
  { key: 'season', label: 'Temporada', clock: '365d' },
  { key: 'year', label: 'Año', clock: '365d' },
  { key: 'all', label: 'Todo', clock: 'all' },
];

export default function WrappedPage() {
  const [period, setPeriod] = useState<Period>('month');
  const cfg = PERIODS.find((p) => p.key === period)!;
  const w = useSWR(`wrapped:${period}`, () => api.wrapped(period));
  const dna = useSWR('dna', api.musicDna);
  const backlog = useSWR('steam:backlog', () => api.steamBacklog().catch(() => null));
  const clock = useSWR(`wrapped:clock:${cfg.clock}`, () => api.clockW({ range: cfg.clock }));
  const trends = useSWR('trends', () => api.trends().catch(() => null));
  const compare = useSWR('compare:month', () => api.compare('month').catch(() => null));

  const ref = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  const gamingHours = w.data?.gaming?.hours ?? 0;
  const bars = useMemo(() => dnaBars(dna.data, gamingHours), [dna.data, gamingHours]);
  const attrs = useMemo(() => passportAttributes(dna.data), [dna.data]);
  const pclass = useMemo(() => passportClass(bars), [bars]);
  const comeback = useMemo(() => comebackArtist(trends.data?.stocks), [trends.data]);
  const peakHour = useMemo(() => {
    const c = clock.data;
    if (!c || c.length === 0) return null;
    return c.reduce((a, b) => (b.plays > a.plays ? b : a), c[0]);
  }, [clock.data]);

  async function share() {
    if (!ref.current) return;
    setBusy(true);
    try {
      const blob = await toBlob(ref.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#08090c' });
      if (!blob) throw new Error('no blob');
      const file = new File([blob], `mi-${cfg.label.toLowerCase()}-en-steatify.png`, { type: 'image/png' });
      const era = w.data?.eraName ?? 'Mi Wrapped';
      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: `Mi ${cfg.label} en Steatify`, text: `${era} 🎧` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* user cancelled, or CORS on external covers — they can screenshot */
    } finally {
      setBusy(false);
    }
  }

  if (!w.data?.hasData) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <h1 className="flex items-center justify-center gap-2 text-2xl font-bold">
          <Icon icon={Gift} className="h-6 w-6" /> Steatify Wrapped
        </h1>
        <p className="mt-2 text-[var(--color-muted)]">
          Aún no hay datos. Sincroniza o importa tu historial y vuelve.
        </p>
      </div>
    );
  }

  const m = w.data.music;
  const g = w.data.gaming;

  return (
    <div className="mx-auto max-w-6xl pb-10">
      {/* Controls */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="-mx-1 flex gap-1 overflow-x-auto rounded-full border bg-[var(--color-surface-2)]/40 p-0.5 sm:mx-0">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs transition sm:px-4 sm:text-sm ${
                period === p.key ? 'bg-[var(--color-accent)] font-semibold text-black' : 'text-[var(--color-muted)] hover:text-white'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          onClick={share}
          disabled={busy}
          className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm text-[var(--color-muted)] transition hover:text-white disabled:opacity-50"
        >
          {busy ? 'Generando…' : <><Icon icon={Download} className="h-4 w-4" /> Imagen</>}
        </button>
      </div>

      <div ref={ref} className="space-y-6">
        {/* ── HERO + DNA ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <HeroPanel
            period={cfg.label}
            eraName={w.data.eraName}
            personality={w.data.personality}
            onShare={share}
          />
          <DnaPanel mix={w.data.mix} personality={w.data.personality} fallbackBars={bars} />
        </div>

        {/* ── Narrativa IA ── */}
        {w.data.narrative && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border border-[var(--color-accent)]/25 p-6"
            style={{ background: 'radial-gradient(600px 200px at 50% 0%, rgba(29,185,84,0.12), var(--color-surface))' }}
          >
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              <Sparkles className="h-4 w-4" /> Tu historia, según Steatify
            </p>
            <p className="text-lg leading-relaxed text-[var(--color-text)]">{w.data.narrative}</p>
          </motion.section>
        )}

        {/* ── Timeline del periodo ── */}
        {w.data.timeline.length > 0 && <TimelinePanel events={w.data.timeline} />}

        {/* ── Storytelling stats ── */}
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StoryStat icon={Headphones} value={m.minutes} label="minutos viviendo música" delta={compare.data?.deltaPct ?? null} color="#1db954" />
          <StoryStat icon={Music} value={m.plays} label="momentos musicales" color="#7c5cff" />
          <StoryStat icon={Mic2} value={m.uniqueArtists} label="artistas visitados" color="#38bdf8" />
          <StoryStat icon={Gamepad2} value={gamingHours} label="horas gaming" color="#ff5d8f" />
        </section>

        {/* ── Premios del periodo ── */}
        {(w.data.awards.music.length > 0 || w.data.awards.gaming.length > 0) && (
          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              Tus premios del periodo <Icon icon={Medal} className="h-4 w-4" />
            </h2>
            {w.data.awards.music.length > 0 && (
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {w.data.awards.music.map((a) => <AwardCard key={`m-${a.key}`} award={a} round={a.key === 'king' || a.key === 'discovery' || a.key === 'comeback' || a.key === 'nocturnal'} />)}
              </div>
            )}
            {w.data.awards.gaming.length > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {w.data.awards.gaming.map((a) => <AwardCard key={`g-${a.key}`} award={a} />)}
              </div>
            )}
          </section>
        )}

        {/* ── Tu universo + Momentos ── */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <UniversePanel
              musicMinutes={m.minutes}
              gamingHours={gamingHours}
              games={g?.games ?? 0}
              backlog={g?.backlog ?? 0}
              archetype={`${w.data.personality.emoji} ${w.data.personality.label}`}
            />
          </div>
          <div className="lg:col-span-1">
            <MomentsPanel
              peak={peakHour ? `${String(peakHour.hour).padStart(2, '0')}:00` : '—'}
              topGame={g?.topGame ?? null}
              comeback={comeback}
              abandoned={backlog.data?.neverPlayed?.[0]?.name ?? null}
              randomFact={backlog.data?.message ?? null}
            />
          </div>
        </div>

        {/* ── Eras mini: tu arquetipo mes a mes (periodos largos) ── */}
        {(period === 'season' || period === 'year' || period === 'all') && <EvolutionAdn />}

        {/* ── Passport ── */}
        <PassportCard name={w.data.label} pclass={pclass} attrs={attrs} level={dna.data?.totals.plays ?? 0} />
      </div>
    </div>
  );
}

/* ───────────────── sections ───────────────── */

function HeroPanel({
  period,
  eraName,
  personality,
  onShare,
}: {
  period: string;
  eraName: string;
  personality: { label: string; emoji: string; tagline: string };
  onShare: () => void;
}) {
  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-3xl border p-6 sm:p-8 lg:col-span-2"
      style={{
        background:
          'radial-gradient(800px 420px at 85% -25%, rgba(124,92,255,0.4), transparent), radial-gradient(560px 320px at -5% 120%, rgba(29,185,84,0.22), transparent), linear-gradient(160deg,#0c0e18,#08090e)',
        boxShadow: 'inset 0 0 120px -40px rgba(124,92,255,0.45)',
      }}
    >
      {/* giant watermark emoji */}
      <span className="pointer-events-none absolute -right-4 -top-8 select-none text-[120px] leading-none opacity-[0.08] sm:-right-6 sm:-top-10 sm:text-[180px]">
        {personality.emoji}
      </span>

      <p className="text-2xl font-extrabold tracking-tight">
        <span className="bg-gradient-to-r from-[var(--color-accent)] to-[#5fe39a] bg-clip-text text-transparent">STEATIFY</span>{' '}
        <span className="text-white">WRAPPED</span>
      </p>
      <p className="mt-1 text-xs uppercase tracking-[0.3em] text-[var(--color-muted)]">{period} · 2026</p>

      <p className="mt-8 text-sm text-[var(--color-muted)]">Tu era fue…</p>
      <motion.h1
        key={eraName}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1 max-w-xl bg-gradient-to-r from-[var(--color-accent)] via-[#7c5cff] to-[#ff5d8f] bg-clip-text text-4xl font-black uppercase leading-[0.95] text-transparent sm:text-5xl lg:text-6xl"
      >
        {eraName}
      </motion.h1>

      <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-1.5">
        <span className="text-lg">{personality.emoji}</span>
        <span className="text-sm">Eres <span className="font-bold text-white">{personality.label}</span></span>
      </div>
      <p className="mt-2 max-w-md text-sm italic text-[var(--color-muted)]">“{personality.tagline}”</p>

      <div className="mt-auto pt-6">
        <Waveform active bars={48} />
      </div>
      <button
        onClick={onShare}
        className="mt-5 inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium backdrop-blur transition hover:bg-white/20"
      >
        <Icon icon={Share2} className="h-4 w-4" /> Compartir mi Wrapped
      </button>
    </div>
  );
}

const MIX_COLORS = ['#1db954', '#7c5cff', '#ff5d8f', '#38bdf8'];

function DnaPanel({
  mix,
  personality,
  fallbackBars,
}: {
  mix: { key: string; label: string; emoji: string; pct: number }[];
  personality: { label: string; emoji: string; tagline: string };
  fallbackBars: ReturnType<typeof dnaBars>;
}) {
  // Prefer the period-aware blend from the engine; fall back to the DNA bars.
  const rows = mix && mix.length > 0
    ? mix.map((m, i) => ({ key: m.key, label: `${m.emoji} ${m.label}`, pct: m.pct, color: MIX_COLORS[i % MIX_COLORS.length], icon: null as null }))
    : fallbackBars.map((b) => ({ key: b.key, label: b.label, pct: b.pct, color: b.color, icon: dnaBarIcon[b.key] }));

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-6">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Steatify ADN <Icon icon={Sparkles} className="h-3.5 w-3.5" /></p>
      <p className="mb-4 text-[11px] text-[var(--color-muted)]">Tu mezcla de este periodo</p>
      <div className="space-y-3">
        {rows.map((b, i) => (
          <div key={b.key}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                {b.icon && <Icon icon={b.icon} className="h-4 w-4" />} {b.label}
              </span>
              <span className="font-semibold tabular-nums" style={{ color: b.color }}>{b.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div initial={{ width: 0 }} animate={{ width: `${b.pct}%` }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full rounded-full" style={{ background: b.color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Tu tipo de personalidad</p>
        <p className="mt-1 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-lg font-extrabold text-transparent">{personality.emoji} {personality.label}</p>
        <p className="mt-1 text-xs text-[var(--color-muted)]">{personality.tagline}</p>
      </div>
    </div>
  );
}

function StoryStat({ icon, value, label, delta, color }: { icon: LucideIcon; value: number; label: string; delta?: number | null; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl border p-6"
      style={{ background: `radial-gradient(360px 140px at 0% 0%, ${color}1a, transparent), var(--color-surface)`, boxShadow: `inset 0 0 50px -34px ${color}` }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}>
        <Icon icon={icon} className="h-5 w-5" />
      </span>
      <p className="mt-3 text-4xl font-black tabular-nums" style={{ color }}><CountUp value={value} /></p>
      <p className="text-sm text-[var(--color-muted)]">{label}</p>
      {delta != null && (
        <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${delta >= 0 ? 'text-[var(--color-accent)]' : 'text-[var(--color-rose)]'}`}>
          <Icon icon={delta >= 0 ? TrendingUp : TrendingDown} className="h-3.5 w-3.5" /> {Math.abs(delta)}% vs periodo anterior
        </p>
      )}
    </motion.div>
  );
}

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtEventDate(iso: string | null): string {
  if (!iso) return 'este periodo';
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_ES[d.getMonth()]}`;
}

function TimelinePanel({ events }: { events: TimelineEvent[] }) {
  return (
    <section
      className="overflow-hidden rounded-3xl border p-6"
      style={{ background: 'radial-gradient(700px 180px at 0% 0%, rgba(124,92,255,0.12), transparent), var(--color-surface)' }}
    >
      <h2 className="mb-6 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Icon icon={Sparkles} className="h-4 w-4 text-[var(--color-accent)]" /> Tu historia del periodo
      </h2>
      <div className="relative flex gap-3 overflow-x-auto pb-2">
        {/* connecting rail */}
        <div className="pointer-events-none absolute left-5 right-5 top-[18px] h-px bg-gradient-to-r from-[var(--color-accent)]/40 via-[var(--color-border)] to-[#ff5d8f]/40" />
        {events.map((e, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="relative z-10 w-40 shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] text-base shadow-lg ring-4 ring-[var(--color-surface)]">
              {e.emoji}
            </div>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-accent)]">{fmtEventDate(e.date)}</p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-white">{e.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-[var(--color-muted)]">{e.sub}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const AWARD_COLORS: Record<string, string> = {
  king: '#fbbf24',
  obsession: '#ff5d8f',
  discovery: '#38bdf8',
  comeback: '#a78bfa',
  nocturnal: '#7c5cff',
  marathon: '#f59e0b',
  debt: '#94a3b8',
};

function AwardCard({ award, round }: { award: WrappedAward; round?: boolean }) {
  const color = AWARD_COLORS[award.key] ?? '#1db954';
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-3xl border p-4"
      style={{ background: `radial-gradient(320px 120px at 100% 0%, ${color}1f, transparent), var(--color-surface)`, boxShadow: `inset 0 0 40px -28px ${color}` }}
    >
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color }}>
        <span className="text-sm">{award.emoji}</span> {award.label}
      </p>
      <div className="flex items-center gap-3">
        <div className="relative shrink-0">
          {award.imageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={award.imageUrl} alt="" aria-hidden className={`absolute inset-0 h-16 w-16 scale-110 opacity-50 blur-xl ${round ? 'rounded-full' : 'rounded-lg'}`} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={award.imageUrl} alt="" className={`relative h-16 w-16 object-cover shadow-lg ring-2 ${round ? 'rounded-full' : 'rounded-lg'}`} style={{ borderColor: color }} />
            </>
          ) : (
            <div className={`flex h-16 w-16 items-center justify-center text-2xl ${round ? 'rounded-full' : 'rounded-lg'}`} style={{ background: `${color}1f`, border: `1px solid ${color}44` }}>{award.emoji}</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{award.name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{award.sub}</p>
        </div>
      </div>
    </motion.div>
  );
}

function UniversePanel({ musicMinutes, gamingHours, games, backlog, archetype }: { musicMinutes: number; gamingHours: number; games: number; backlog: number; archetype: string }) {
  return (
    <div className="overflow-hidden rounded-3xl border p-6"
      style={{ background: 'radial-gradient(500px 200px at 10% 0%, rgba(29,185,84,0.15), transparent), radial-gradient(500px 200px at 90% 100%, rgba(124,92,255,0.18), transparent), var(--color-surface)' }}>
      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu universo</p>
      <p className="mb-5 text-sm text-[var(--color-muted)]">La fusión perfecta entre tu música y tus juegos.</p>

      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-[var(--color-accent)]"><Icon icon={Headphones} className="h-3.5 w-3.5" /> MÚSICA</p>
          <p className="text-4xl font-black text-[var(--color-accent)]"><CountUp value={musicMinutes} /></p>
          <p className="text-xs text-[var(--color-muted)]">minutos</p>
        </div>
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-[var(--color-accent)]/40 to-[var(--color-accent-2)]/40 blur-md" />
          <Icon icon={Music} className="relative h-7 w-7" />
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1.5 text-xs text-[var(--color-accent-2)]"><Icon icon={Gamepad2} className="h-3.5 w-3.5" /> GAMING</p>
          <p className="text-4xl font-black text-[var(--color-accent-2)]"><CountUp value={gamingHours} /></p>
          <p className="text-xs text-[var(--color-muted)]">horas</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 text-center">
        <Mini icon={Gamepad2} value={games} label="juegos en biblioteca" />
        <Mini icon={Skull} value={backlog} label="sin tocar" />
        <Mini icon={Clock} value={Math.round(gamingHours / Math.max(1, games) * 10) / 10} label="h por juego" />
      </div>

      <div className="mt-5 rounded-2xl border border-white/5 bg-black/20 p-4">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Tu arquetipo este mes</p>
        <p className="mt-1 bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text text-xl font-extrabold text-transparent">{archetype}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Construyes, exploras y creas. Tu música te acompaña en cada misión.</p>
      </div>
    </div>
  );
}

function Mini({ icon, value, label }: { icon: LucideIcon; value: number; label: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface-2)]/40 p-3">
      <p className="flex justify-center"><Icon icon={icon} className="h-5 w-5" /></p>
      <p className="text-xl font-bold">{value.toLocaleString()}</p>
      <p className="text-[10px] text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function MomentsPanel({ peak, topGame, comeback, abandoned, randomFact }: { peak: string; topGame: { name: string; hours: number } | null; comeback: { name: string; note: string } | null; abandoned: string | null; randomFact: string | null }) {
  const moments = [
    { icon: Clock, title: 'Tu hora más activa', sub: `${peak} · ahí más escuchas`, color: 'var(--color-accent)' },
    topGame && { icon: Gamepad2, title: 'Tu juego rey', sub: `${topGame.name} · ${topGame.hours} h`, color: 'var(--color-accent-2)' },
    comeback && { icon: Repeat, title: 'Artista que regresó', sub: `${comeback.name} · ${comeback.note}`, color: '#ff5d8f' },
    abandoned && { icon: Moon, title: 'Juego abandonado', sub: `${abandoned} · nunca lo abriste`, color: '#8b8f9c' },
  ].filter(Boolean) as { icon: LucideIcon; title: string; sub: string; color: string }[];

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Momentos clave</p>
        <ul className="space-y-3">
          {moments.map((mm, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)]" style={{ color: mm.color }}><Icon icon={mm.icon} className="h-4 w-4" /></span>
              <div className="min-w-0">
                <p className="text-sm" style={{ color: mm.color }}>{mm.title}</p>
                <p className="truncate text-xs text-[var(--color-muted)]">{mm.sub}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </div>
      {randomFact && (
        <div className="rounded-3xl border bg-[var(--color-surface)] p-5">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Dato random del mes <Icon icon={ShoppingCart} className="h-3.5 w-3.5" /></p>
          <p className="text-sm text-[var(--color-text)]">{randomFact}</p>
        </div>
      )}
    </div>
  );
}

function PassportCard({ name, pclass, attrs, level }: { name: string; pclass: ReturnType<typeof passportClass>; attrs: { axis: string; value: number }[]; level: number }) {
  const lvl = Math.max(1, Math.floor(Math.sqrt(level / 8)));
  return (
    <div className="overflow-hidden rounded-3xl border p-6"
      style={{ background: 'radial-gradient(600px 300px at 100% 0%, rgba(124,92,255,0.18), transparent), linear-gradient(135deg, rgba(29,185,84,0.06), transparent), var(--color-surface)' }}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold tracking-widest text-[#d4af37]">STEATIFY PASSPORT</p>
        <p className="text-xs text-[var(--color-muted)]">Tu identidad digital este mes</p>
      </div>
      <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        {/* Card */}
        <motion.div whileHover={{ rotateZ: -1, scale: 1.02 }} className="flex items-center gap-4 rounded-2xl border border-[#d4af37]/30 bg-gradient-to-b from-[#1a1c24] to-[#0e1016] p-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)]/15 ring-2 ring-[#d4af37]/40"><Icon icon={Headphones} className="h-8 w-8" /></div>
          <div className="min-w-0">
            <p className="truncate text-lg font-bold">{name}</p>
            <p className="text-xs text-[var(--color-accent)]">Lv. {lvl} · Rare</p>
            <div className="mt-2 h-1.5 w-32 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[#d4af37]" style={{ width: '62%' }} />
            </div>
          </div>
        </motion.div>
        {/* Class + radar */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Clase</p>
            <p className="flex items-center gap-1.5 font-semibold text-[var(--color-accent)]"><Icon icon={Swords} className="h-4 w-4" /> {pclass.name}</p>
            <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Especialidades</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {pclass.specialties.map((s) => (
                <span key={s} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-[var(--color-muted)]">{s}</span>
              ))}
            </div>
            <p className="mt-3 text-xs italic text-[var(--color-muted)]">“{pclass.phrase}”</p>
          </div>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={attrs} outerRadius="75%">
                <PolarGrid stroke="#232733" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#8b8f9c', fontSize: 9 }} />
                <Radar dataKey="value" stroke="#1db954" fill="#1db954" fillOpacity={0.45} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
