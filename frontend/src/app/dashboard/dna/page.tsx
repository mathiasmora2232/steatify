'use client';

import { useRef, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from 'recharts';
import { toBlob } from 'html-to-image';
import {
  Heart,
  Target,
  Activity,
  Share2,
  Star,
  Sparkles,
  Moon,
  Repeat,
  CalendarDays,
  Headphones,
  Crown,
  Compass,
  Dna,
  type LucideIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { computeLevel } from '@/lib/level';
import { archetypeIcon, Icon, I } from '@/lib/icons';
import {
  archetypeMeta,
  personalityHeadline,
  personalityStats,
  rpgAttributes,
  socialPercentile,
  sparkline,
} from '@/lib/dna-derive';
import { CountUp } from '@/components/CountUp';
import { DnaHelix } from '@/components/DnaHelix';
import { Sparkline } from '@/components/Sparkline';
import { DnaShareCard } from '@/components/DnaShareCard';

const STAT_ICON: Record<string, LucideIcon> = { emotional: Heart, discovery: Target, openness: Activity };

export default function DnaPage() {
  const { data, isLoading } = useSWR('dna', api.musicDna);
  const { data: user } = useSWR('me', api.me);
  const { data: steam } = useSWR('steam:stats', api.steamStats);

  const cardRef = useRef<HTMLDivElement>(null);
  const [sharing, setSharing] = useState(false);

  if (isLoading) return <p className="text-[var(--color-muted)]">Analizando tu ADN…</p>;
  if (!data || !data.hasData)
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-bold">
          <Icon icon={I.dna} className="h-6 w-6" /> Tu ADN Musical
        </h1>
        <p className="text-[var(--color-muted)]">
          Aún no hay suficientes datos. Sincroniza o importa tu historial y vuelve.
        </p>
      </div>
    );

  const { archetypes, personality, patterns, totals } = data;
  const top = archetypes[0];
  const meta = archetypeMeta(top?.key ?? 'obsessive');
  const accent = meta.color;
  const { title, type } = personalityHeadline(data);
  const subscores = personalityStats(data);
  const attrs = rpgAttributes(data);
  const social = socialPercentile(data);
  const level = computeLevel(totals.plays, totals.minutes, steam?.totalHours ?? 0);
  const name = user?.displayName ?? user?.username ?? 'Tú';

  const patternCards: PatternCardProps[] = [
    { icon: Moon, value: `${patterns.nightPct}%`, label: 'Escuchas de noche', sub: 'Tu peak es 22:00 – 02:00', color: '#a78bfa', seed: patterns.nightPct },
    { icon: Repeat, value: `${patterns.repeatMultiplier}×`, label: 'Repetición vs. promedio', sub: 'Repites más que el 87% de los usuarios', color: '#1db954', seed: patterns.repeatMultiplier * 30 },
    { icon: CalendarDays, value: patterns.avgTrackAgeYears != null ? `${patterns.avgTrackAgeYears} años` : '—', label: 'Antigüedad media', sub: 'Mantienes artistas durante mucho tiempo', color: '#38bdf8', seed: (patterns.avgTrackAgeYears ?? 1) * 15 },
    { icon: Headphones, value: String(patterns.playsPerActiveDay), label: 'Reproducciones/día activo', sub: 'Eres un oyente muy activo', color: '#1db954', seed: patterns.playsPerActiveDay },
    { icon: Crown, value: `${patterns.loyaltyPct}%`, label: 'En tu top 5 artistas', sub: 'Gran lealtad a tus favoritos', color: '#ff5d8f', seed: patterns.loyaltyPct },
    { icon: Compass, value: String(patterns.newArtists30d), label: 'Artistas nuevos (30d)', sub: 'Siempre descubriendo algo nuevo', color: '#f59e0b', seed: patterns.newArtists30d },
  ];

  async function share() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      // Render once at 2× for crisp output, then try the native share sheet
      // (mobile) with the PNG as a file; fall back to a direct download.
      const blob = await toBlob(cardRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#07080b' });
      if (!blob) throw new Error('no blob');
      const file = new File([blob], `steatify-dna-${name}.png`, { type: 'image/png' });

      const canShareFile =
        typeof navigator !== 'undefined' &&
        !!navigator.canShare &&
        navigator.canShare({ files: [file] });

      if (canShareFile) {
        await navigator.share({ files: [file], title: 'Mi Steatify DNA', text: `Soy ${type} en Steatify 🎧` });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `steatify-dna-${name}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      /* user cancelled the share sheet, or rendering failed — no-op */
    } finally {
      setSharing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Steatify ADN</p>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Icon icon={I.dna} className="h-7 w-7" style={{ color: accent }} /> ADN Musical
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Descubre la ciencia detrás de tu forma de escuchar.
          </p>
        </div>
        <button
          onClick={share}
          disabled={sharing}
          className="flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition hover:border-[var(--color-accent)]/50 hover:text-white disabled:opacity-50"
          style={{ color: accent }}
        >
          <Share2 className="h-4 w-4" /> {sharing ? 'Generando…' : 'Compartir ADN'}
        </button>
      </div>

      {/* ROW 1 — Hero + Composición */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-3xl border p-7"
          style={{ background: `radial-gradient(420px 220px at 80% 10%, ${accent}1f, transparent), var(--color-surface)` }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                Tu tipo principal
              </p>
              <h2 className="mt-1 text-4xl font-black" style={{ color: accent }}>
                {top?.label}
              </h2>
              <span
                className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold"
                style={{ background: `${accent}1f`, color: accent }}
              >
                {top?.pct}% de tu ADN
              </span>
            </div>
            <DnaHelix color={accent} size={170} />
          </div>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-[var(--color-text)]">{meta.long}</p>
          {data.type?.reason && (
            <p className="mt-3 inline-flex max-w-md items-start gap-2 rounded-xl bg-[var(--color-surface-2)]/50 px-3 py-2 text-xs text-[var(--color-muted)]">
              <span className="shrink-0 font-semibold" style={{ color: accent }}>Por qué:</span>
              <span>{data.type.reason}</span>
            </p>
          )}
        </motion.section>

        {/* Composición */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="rounded-3xl border bg-[var(--color-surface)] p-7"
        >
          <h3 className="mb-4 text-sm font-semibold text-white">Composición de tu ADN</h3>
          <div className="mb-6 flex h-3 w-full overflow-hidden rounded-full">
            {archetypes.map((a) => (
              <motion.div
                key={a.key}
                initial={{ width: 0 }}
                animate={{ width: `${a.pct}%` }}
                transition={{ duration: 0.7 }}
                style={{ background: archetypeMeta(a.key).color }}
                title={`${a.label} ${a.pct}%`}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {archetypes.slice(0, 3).map((a, i) => {
              const m = archetypeMeta(a.key);
              const Glyph = archetypeIcon[a.key] ?? Dna;
              return (
                <motion.div
                  key={a.key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                >
                  <div
                    className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ background: `${m.color}1f` }}
                  >
                    <Glyph className="h-5 w-5" style={{ color: m.color }} />
                  </div>
                  <p className="text-2xl font-bold tabular-nums" style={{ color: m.color }}>
                    {a.pct}%
                  </p>
                  <p className="text-sm font-medium text-white">{a.label}</p>
                  <p className="mt-1 text-xs leading-snug text-[var(--color-muted)]">{m.short}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </div>

      {/* ROW 2 — Personalidad */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-6 rounded-3xl border border-[var(--color-accent-2)]/25 bg-gradient-to-br from-[var(--color-accent-2)]/10 to-transparent p-7"
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent-2)]">
              Tu personalidad musical
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-3xl font-black">
              <span
                className="bg-gradient-to-r from-[var(--color-accent-2)] to-[var(--color-rose)] bg-clip-text text-transparent"
              >
                “{title}”
              </span>
              <Sparkles className="h-5 w-5 text-[var(--color-accent-2)]" />
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">{personality}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {subscores.map((s, i) => {
              const SIcon = STAT_ICON[s.key] ?? Star;
              return (
                <motion.div
                  key={s.key}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border bg-[var(--color-surface)] p-4"
                >
                  <div
                    className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: `${s.color}1f` }}
                  >
                    <SIcon className="h-4 w-4" style={{ color: s.color }} />
                  </div>
                  <p className="text-[11px] leading-tight text-[var(--color-muted)]">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold">
                    <CountUp value={s.value} />
                    <span className="text-sm text-[var(--color-muted)]">/100</span>
                  </p>
                  <p className="text-xs font-medium" style={{ color: s.color }}>
                    {s.tier}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* ROW 3 — Patrones + Rasgos (radar) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* Patrones */}
        <section className="lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-white">Tus patrones de escucha</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {patternCards.map((p, i) => (
              <PatternCard key={p.label} {...p} delay={i * 0.06} />
            ))}
          </div>
        </section>

        {/* Rasgos: bars + radar */}
        <section className="rounded-3xl border bg-[var(--color-surface)] p-6 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-white">Tus rasgos musicales</h3>
          <div className="space-y-2.5">
            {attrs.map((a, i) => (
              <div key={a.axis}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-[var(--color-muted)]">{a.axis}</span>
                  <span className="font-bold tabular-nums text-white">{a.value}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${a.value}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: i * 0.08 }}
                    className="h-full rounded-full"
                    style={{ background: accent }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={attrs} outerRadius="72%">
                <PolarGrid stroke="#232733" />
                <PolarAngleAxis dataKey="axis" tick={{ fill: '#8b8f9c', fontSize: 10 }} />
                <Radar dataKey="value" stroke={accent} fill={accent} fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* ROW 4 — Comparación social */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="mt-6 flex flex-col items-center justify-between gap-4 rounded-3xl border bg-[var(--color-surface)] p-6 sm:flex-row"
      >
        <div className="flex items-center gap-3">
          <Star className="h-5 w-5 shrink-0" style={{ color: accent }} />
          <p className="text-sm text-[var(--color-text)]">
            Eres más <span className="font-semibold">{social.trait}</span> que el{' '}
            <span className="text-xl font-bold" style={{ color: accent }}>
              {social.betterThan}%
            </span>{' '}
            de los usuarios de <span className="font-semibold">Steatify</span>
          </p>
          <span
            className="hidden rounded-full px-3 py-1 text-xs font-bold sm:inline"
            style={{ background: `${accent}1f`, color: accent }}
          >
            Top {social.topPct}%
          </span>
        </div>
        <p className="text-xs text-[var(--color-muted)]">
          Basado en {totals.plays.toLocaleString()} reproducciones · {totals.uniqueArtists.toLocaleString()} artistas
        </p>
      </motion.section>

      {/* Off-screen share card for PNG export */}
      <div className="pointer-events-none fixed -left-[9999px] top-0">
        <DnaShareCard
          ref={cardRef}
          name={name}
          type={type}
          rarity={level.rarity}
          color={accent}
          topArchetypeKey={top?.key ?? 'obsessive'}
          attributes={attrs}
          level={level.level}
          plays={totals.plays}
          artists={totals.uniqueArtists}
          topPct={social.topPct}
        />
      </div>
    </div>
  );
}

interface PatternCardProps {
  icon: LucideIcon;
  value: string;
  label: string;
  sub: string;
  color: string;
  seed: number;
}

function PatternCard({ icon: IconCmp, value, label, sub, color, seed, delay = 0 }: PatternCardProps & { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -3 }}
      className="rounded-2xl border bg-[var(--color-surface)] p-4 transition-colors hover:border-[var(--color-accent)]/30"
    >
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: `${color}1f` }}>
        <IconCmp className="h-5 w-5" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm font-medium text-[var(--color-text)]">{label}</p>
      <p className="mt-0.5 text-xs leading-snug text-[var(--color-muted)]">{sub}</p>
      <div className="mt-3">
        <Sparkline values={sparkline(seed)} color={color} />
      </div>
    </motion.div>
  );
}
