'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X, Clock, Users, Music2, Target, CalendarDays, Sparkles, ListMusic } from 'lucide-react';
import useSWR from 'swr';
import { api, type Era } from '@/lib/api';
import {
  eraTheme,
  eraArtist,
  eraBadges,
  eraHours,
  eraArtistsPerMonth,
  eraConsistency,
  eraMonthLabel,
  eraDays,
  eraSpark,
} from '@/lib/eras-derive';
import { EraCover } from './EraCover';
import { Sparkline } from './Sparkline';
import { ConsistencyRing } from './ConsistencyRing';

/**
 * "Tu [Mes Año]" detail modal. Shows the rich real data we have for the era —
 * narrative, dominant artists, the sound (genres), peak hour, consistency, the
 * month's intensity — phrased as chapters, not a stats table.
 */
export function EraModal({ era, onClose }: { era: Era | null; onClose: () => void }) {
  return (
    <AnimatePresence>
      {era && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <Body era={era} onClose={onClose} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Body({ era, onClose }: { era: Era; onClose: () => void }) {
  const theme = eraTheme(era);
  const artist = eraArtist(era);
  const badges = eraBadges(era);
  const artists = era.dominantArtists ?? [];
  const topTracks = era.topTracks ?? [];
  const signals = era.signals;
  const { data: narrative } = useSWR(`era:narrative:${era.id}`, () => api.eraNarrative(era.id));

  return (
    <motion.div
      initial={{ scale: 0.94, y: 16, opacity: 0 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      onClick={(e) => e.stopPropagation()}
      className="relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border p-7"
      style={{ background: `radial-gradient(600px 240px at 50% -10%, ${theme.glow}, transparent), var(--color-surface)` }}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full p-2 text-[var(--color-muted)] transition hover:bg-white/5 hover:text-white"
        aria-label="Cerrar"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-4">
        <EraCover theme={theme} artist={artist} size="lg" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: theme.color }}>
            Tu {eraMonthLabel(era).toLowerCase()}
          </p>
          <h2 className="mt-1 text-2xl font-black capitalize text-white">{era.title}</h2>
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide"
            style={{ background: `${theme.color}1f`, color: theme.color }}
          >
            <theme.icon className="h-3.5 w-3.5" /> Era {theme.label}
          </span>
        </div>
      </div>

      {/* AI narrative */}
      {narrative?.text && (
        <div
          className="mt-5 rounded-2xl border p-4"
          style={{ background: `${theme.color}12`, borderColor: `${theme.color}33` }}
        >
          <p
            className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{ color: theme.color }}
          >
            <Sparkles className="h-3.5 w-3.5" /> Steatify cuenta tu {eraMonthLabel(era).toLowerCase()}
          </p>
          <p className="text-base leading-relaxed text-[var(--color-text)]">{narrative.text}</p>
        </div>
      )}

      {/* Narrative */}
      <p className="mt-5 text-base leading-relaxed text-[var(--color-text)]">
        {era.summary ?? theme.line(artist)}
      </p>

      {/* Stat strip */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={Clock} color={theme.color} value={`${eraHours(era)}h`} label="dentro de la era" />
        <Stat icon={Users} color={theme.color} value={`~${eraArtistsPerMonth(era)}`} label="artistas este mes" />
        <Stat icon={CalendarDays} color={theme.color} value={`${eraDays(era)} días`} label="duró la etapa" />
        <Stat
          icon={Clock}
          color={theme.color}
          value={era.peakHour != null ? `${String(era.peakHour).padStart(2, '0')}:00` : '—'}
          label="tu hora pico"
        />
      </div>

      {/* Intensity + consistency */}
      <div className="mt-6 flex items-center justify-between gap-6 rounded-2xl border bg-[var(--color-surface-2)]/30 p-5">
        <div className="min-w-0 flex-1">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Target className="h-3.5 w-3.5" /> Intensidad del mes
          </p>
          <Sparkline values={eraSpark(era, 30)} color={theme.color} />
        </div>
        <ConsistencyRing value={eraConsistency(era)} color={theme.color} size={72} label="consistencia" />
      </div>

      {/* Artists that defined it */}
      {artists.length > 0 && (
        <section className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Music2 className="h-3.5 w-3.5" /> Quienes marcaron esta era
          </p>
          <div className="flex flex-wrap gap-2">
            {artists.map((a, i) => (
              <span
                key={a}
                className="rounded-full px-3 py-1.5 text-sm"
                style={
                  i === 0
                    ? { background: `${theme.color}1f`, color: theme.color, fontWeight: 600 }
                    : { background: 'var(--color-surface-2)', color: 'var(--color-text)' }
                }
              >
                {i === 0 ? `${a} · el sonido principal` : a}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Top 10 tracks of the month */}
      {topTracks.length > 0 && (
        <section className="mt-6">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <ListMusic className="h-3.5 w-3.5" /> Top canciones del mes
          </p>
          <div className="space-y-1">
            {topTracks.slice(0, 10).map((t, i) => (
              <div key={`${t.name}-${i}`} className="flex items-center gap-3 rounded-lg px-2 py-1.5 odd:bg-[var(--color-surface-2)]/25">
                <span className="w-4 shrink-0 text-right text-xs font-bold tabular-nums" style={{ color: theme.color }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{t.name}</p>
                  {t.artist && <p className="truncate text-[11px] text-[var(--color-muted)]">{t.artist}</p>}
                </div>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-muted)]">{t.plays}×</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Signals breakdown */}
      {signals && (
        <section className="mt-6">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Target className="h-3.5 w-3.5" /> Las señales del mes
          </p>
          <div className="space-y-2.5">
            {([
              ['Concentración del #1', signals.dominantArtistShare],
              ['Top 3 artistas', signals.top3Share],
              ['Repetición', signals.repeatScore],
              ['Exploración', signals.explorationScore],
              ['Nostalgia', signals.nostalgiaScore],
              ['Nocturnidad', signals.nightScore],
            ] as [string, number][]).map(([label, v]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-xs text-[var(--color-muted)]">{label}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(Math.max(0, Math.min(1, v)) * 100)}%`, background: theme.color }} />
                </div>
                <span className="w-9 shrink-0 text-right text-xs font-bold tabular-nums text-white">{Math.round(v * 100)}%</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Facet badges */}
      {badges.length > 0 && (
        <section className="mt-6">
          <div className="flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span
                key={b.key}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold"
                style={{ background: `${b.color}1f`, borderColor: `${b.color}55`, color: b.color }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </section>
      )}
    </motion.div>
  );
}

function Stat({
  icon: IconCmp,
  value,
  label,
  color,
}: {
  icon: typeof Clock;
  value: string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface-2)]/30 p-3 text-center">
      <IconCmp className="mx-auto mb-1 h-4 w-4" style={{ color }} />
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] leading-tight text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
