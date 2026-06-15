'use client';

import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Dna, Sparkles } from 'lucide-react';
import { api, type EvolutionPoint } from '@/lib/api';

const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtMonth(ym: string) {
  const [y, m] = ym.split('-');
  return { label: MONTHS_ES[parseInt(m, 10) - 1] ?? m, year: `'${y.slice(2)}` };
}

/**
 * "Evolución ADN" — your music archetype, month by month. Same scoring engine as
 * the Brain, applied per calendar month, so you can literally watch yourself shift
 * from Explorador → Obsesivo → Nocturno over time. Bars scale to monthly minutes;
 * months where the archetype changed get an accent ring + "nueva etapa" marker.
 */
export function EvolutionAdn() {
  const { data } = useSWR('evolution', () => api.evolution(12), { revalidateOnFocus: false });
  const timeline = (data?.timeline ?? []).filter((p) => p.plays >= 5);
  if (timeline.length < 2) return null;

  const maxMin = Math.max(...timeline.map((p) => p.minutes), 1);
  const changes = timeline.filter((p, i) => i > 0 && p.archetype.key !== timeline[i - 1].archetype.key).length;
  const current = timeline[timeline.length - 1];

  return (
    <section className="overflow-hidden rounded-3xl border bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)]/30">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-6 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <Dna className="h-4 w-4 text-[var(--color-accent)]" /> Evolución de tu ADN
        </span>
        <span className="text-[11px] text-[var(--color-muted)]">
          {changes > 0 ? (
            <span className="text-[var(--color-accent)]">{changes} {changes === 1 ? 'cambio de etapa' : 'cambios de etapa'}</span>
          ) : (
            <>etapa constante</>
          )}{' '}· últimos {timeline.length} meses
        </span>
      </div>

      <div className="flex items-end gap-2 overflow-x-auto px-6 py-5">
        {timeline.map((p, i) => {
          const changed = i > 0 && p.archetype.key !== timeline[i - 1].archetype.key;
          const isLast = i === timeline.length - 1;
          return <Node key={p.ym} p={p} changed={changed} isLast={isLast} heightPct={(p.minutes / maxMin) * 100} delay={i * 0.04} />;
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--color-border)] px-6 py-3 text-sm">
        <Sparkles className="h-4 w-4 shrink-0 text-[var(--color-accent)]" />
        <p className="text-[var(--color-muted)]">
          Ahora eres <span className="font-bold text-white">{current.archetype.emoji} {current.archetype.label}</span>
          {current.topArtist && <> · escuchando mucho a <span className="text-white">{current.topArtist}</span></>}.
        </p>
      </div>
    </section>
  );
}

function Node({
  p,
  changed,
  isLast,
  heightPct,
  delay,
}: {
  p: EvolutionPoint;
  changed: boolean;
  isLast: boolean;
  heightPct: number;
  delay: number;
}) {
  const { label, year } = fmtMonth(p.ym);
  const showYear = label === 'ene' || isLast;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group flex w-[58px] shrink-0 flex-col items-center gap-2"
      title={`${label} ${year} · ${p.archetype.label} · ${p.plays} reproducciones · ${p.minutes} min · ${p.newArtists} artistas nuevos`}
    >
      {/* minutes bar */}
      <div className="flex h-16 w-full items-end justify-center">
        <div
          className="w-2.5 rounded-full transition-all group-hover:w-3.5"
          style={{
            height: `${Math.max(8, heightPct)}%`,
            background: isLast ? 'var(--color-accent)' : 'var(--color-border)',
          }}
        />
      </div>
      {/* archetype glyph */}
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full text-lg transition ${
          changed || isLast ? 'ring-2' : ''
        }`}
        style={{
          background: isLast ? 'color-mix(in srgb, var(--color-accent) 18%, transparent)' : 'var(--color-surface-2)',
          color: 'var(--color-accent)',
        }}
      >
        <span>{p.archetype.emoji}</span>
      </div>
      {/* archetype label */}
      <span className={`text-center text-[10px] font-semibold leading-tight ${isLast ? 'text-white' : 'text-[var(--color-muted)]'}`}>
        {p.archetype.label}
      </span>
      {changed && <span className="text-[8px] font-bold uppercase tracking-wide text-[var(--color-accent)]">nueva</span>}
      {/* month */}
      <span className="text-[10px] tabular-nums text-[var(--color-muted)]">
        {label}
        {showYear && <span className="opacity-60"> {year}</span>}
      </span>
    </motion.div>
  );
}
