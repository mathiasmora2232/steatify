'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import {
  Sparkles,
  RefreshCw,
  Music2,
  Gamepad2,
  TrendingUp,
  AlertTriangle,
  Flame,
  Lightbulb,
  Crown,
  Disc3,
  type LucideIcon,
} from 'lucide-react';
import { api, type InsightResponse } from '@/lib/api';
import { relativo } from '@/lib/format';

export default function InsightsPage() {
  const { data, isLoading, mutate } = useSWR<InsightResponse>('insights:current', api.insightCurrent, {
    revalidateOnFocus: false,
  });
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function regenerate() {
    setBusy(true);
    setNote(null);
    try {
      const res = await api.insightGenerate();
      if (res.rateLimited) setNote('Llegaste al límite de regeneraciones de hoy (3). Vuelve mañana.');
      await mutate(res, { revalidate: false });
    } catch {
      setNote('No se pudo regenerar ahora.');
    } finally {
      setBusy(false);
    }
  }

  const insight = data?.insight;
  const signals = insight?.data?.signals;
  const narrative = insight?.data?.narrative;
  const remaining = data?.remaining ?? 0;
  const disabled = busy || remaining <= 0;

  return (
    <div className="mx-auto max-w-6xl pb-12">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
            <Sparkles className="h-7 w-7 text-[var(--color-accent)]" /> Insights IA
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Tu semana, narrada. Datos reales primero — la IA solo los cuenta.
            {insight?.data?.generatedAt && (
              <span className="ml-1 text-[var(--color-text)]">Generado {relativo(insight.data.generatedAt)}.</span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            onClick={regenerate}
            disabled={disabled}
            className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition hover:border-[var(--color-accent)]/50 disabled:opacity-40"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> {busy ? 'Generando…' : 'Regenerar'}
          </button>
          <span className="text-[10px] text-[var(--color-muted)]">{remaining}/3 regeneraciones hoy</span>
        </div>
      </div>

      {note && (
        <p className="mb-4 rounded-xl border border-[var(--color-rose)]/30 bg-[var(--color-rose)]/10 px-4 py-2 text-sm text-[var(--color-rose)]">{note}</p>
      )}

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
      ) : !insight || !signals || !narrative ? (
        <div className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
          Aún no hay suficiente actividad esta semana para generar insights. Escucha algo o sincroniza Steam.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Resumen */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl border p-6"
            style={{ background: 'radial-gradient(500px 200px at 80% 0%, rgba(29,185,84,0.12), transparent), var(--color-surface)' }}
          >
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
              <Sparkles className="h-4 w-4" /> Resumen de la semana
            </div>
            <p className="text-lg leading-relaxed text-[var(--color-text)]">{narrative.summary}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
              <Pill>{signals.week.minutes.toLocaleString()} min</Pill>
              <Pill>{signals.week.plays.toLocaleString()} reproducciones</Pill>
              {signals.week.deltaPct != null && (
                <Pill>
                  {signals.week.deltaPct >= 0 ? '+' : ''}
                  {signals.week.deltaPct}% vs semana anterior
                </Pill>
              )}
              {signals.gaming.hoursGained > 0 && <Pill>+{signals.gaming.hoursGained}h gaming</Pill>}
              <Pill muted>{insight.model ?? 'IA'}</Pill>
            </div>
          </motion.div>

          {/* Candidatos a obsesión */}
          <Section title="Candidatos a obsesión" icon={Flame} color="#ff5d8f">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <ObsList title="Canciones" icon={Music2} color="#1db954" rows={signals.obsessions.songs.map((s) => ({ name: s.name, score: s.score }))} />
              <ObsList title="Artistas" icon={Crown} color="#f59e0b" rows={signals.obsessions.artists.map((a) => ({ name: a.name, score: a.score }))} />
              <ObsList title="Juegos" icon={Gamepad2} color="#7c5cff" rows={signals.obsessions.games.map((g) => ({ name: g.name, score: g.score }))} />
            </div>
          </Section>

          {/* Música + Gaming */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <NarrativeCard title="Música" icon={Music2} color="#1db954" lines={narrative.music} />
            <NarrativeCard title="Gaming" icon={Gamepad2} color="#7c5cff" lines={narrative.gaming} />
          </div>

          {/* Predicciones + Recomendación */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <NarrativeCard title="Predicciones" icon={TrendingUp} color="#38bdf8" lines={narrative.predictions} />
            <Section title="Recomendación" icon={Lightbulb} color="#fbbf24">
              <p className="text-base leading-relaxed text-[var(--color-text)]">{narrative.recommendation}</p>
            </Section>
          </div>

          {/* Alertas */}
          {(signals.drops.length > 0 || signals.comeback) && (
            <Section title="Alertas" icon={AlertTriangle} color="#fb923c">
              <div className="flex flex-wrap gap-2">
                {signals.comeback && (
                  <Alert color="#22d3ee" icon={Disc3} text={`${signals.comeback.name} volvió tras ${signals.comeback.gapDays} días`} />
                )}
                {signals.drops.map((d) => (
                  <Alert key={d.name} color="#ff5d8f" icon={AlertTriangle} text={`${d.name} cayó ${d.dropPct}%`} />
                ))}
              </div>
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, color, children }: { title: string; icon: LucideIcon; color: string; children: React.ReactNode }) {
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border bg-[var(--color-surface)] p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest" style={{ color }}>
        <Icon className="h-4 w-4" /> {title}
      </h2>
      {children}
    </motion.section>
  );
}

function NarrativeCard({ title, icon, color, lines }: { title: string; icon: LucideIcon; color: string; lines: string[] }) {
  return (
    <Section title={title} icon={icon} color={color}>
      {lines.length === 0 ? (
        <p className="text-sm text-[var(--color-muted)]">Sin novedades.</p>
      ) : (
        <ul className="space-y-2.5">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-[var(--color-text)]">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
              <span>{l}</span>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

function ObsList({ title, icon: Icon, color, rows }: { title: string; icon: LucideIcon; color: string; rows: { name: string; score: number }[] }) {
  const max = Math.max(...rows.map((r) => r.score), 1);
  return (
    <div className="rounded-2xl border bg-[var(--color-surface-2)]/30 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide" style={{ color }}>
        <Icon className="h-3.5 w-3.5" /> {title}
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)]">Sin candidatos.</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, i) => (
            <div key={`${r.name}-${i}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tabular-nums" style={{ color }}>#{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{r.name}</span>
                <span className="shrink-0 text-[11px] tabular-nums text-[var(--color-muted)]">{r.score}</span>
              </div>
              <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${(r.score / max) * 100}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Pill({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <span className={`rounded-full px-2.5 py-0.5 ${muted ? 'bg-white/5 text-[var(--color-muted)]' : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'}`}>
      {children}
    </span>
  );
}

function Alert({ color, icon: Icon, text }: { color: string; icon: LucideIcon; text: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium" style={{ background: `${color}1a`, borderColor: `${color}44`, color }}>
      <Icon className="h-3.5 w-3.5" /> {text}
    </span>
  );
}
