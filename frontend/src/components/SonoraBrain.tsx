'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, Music2, Gamepad2, GitCompareArrows } from 'lucide-react';
import { api, type BrainDetection } from '@/lib/api';

/**
 * "Sonora Brain" — the narrator on top of everything. Detects stage changes
 * (music + gaming) and tells you what's happening with you, with the real
 * metric behind it.
 */
export function SonoraBrain() {
  const { data } = useSWR('brain', api.brain, { revalidateOnFocus: false });
  const detections = data?.detections ?? [];
  if (detections.length === 0) return null;

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)]/30">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-3">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          <Brain className="h-4 w-4 text-[var(--color-accent)]" /> Hoy Sonora detectó
        </span>
        <Link href="/dashboard/versus" className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] transition hover:gap-1.5">
          <GitCompareArrows className="h-3.5 w-3.5" /> Tú vs Tú
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-px bg-[var(--color-border)] sm:grid-cols-2">
        {detections.map((d, i) => (
          <DetectionCard key={d.kind} d={d} delay={i * 0.06} />
        ))}
      </div>
    </section>
  );
}

function DetectionCard({ d, delay }: { d: BrainDetection; delay: number }) {
  const Icon = d.kind === 'music' ? Music2 : Gamepad2;
  const color = d.kind === 'music' ? '#1db954' : '#7c5cff';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-[var(--color-surface)] p-5"
    >
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color }}>
        <Icon className="h-3.5 w-3.5" /> {d.changed ? `Cambio de etapa · ${d.kind === 'music' ? 'música' : 'gaming'}` : `Tu etapa · ${d.kind === 'music' ? 'música' : 'gaming'}`}
      </p>
      {d.changed ? (
        <div className="flex items-center gap-2 text-lg font-black text-white">
          <span className="text-[var(--color-muted)]">{d.fromEmoji} {d.from}</span>
          <ArrowRight className="h-4 w-4 shrink-0" style={{ color }} />
          <span style={{ color }}>{d.toEmoji} {d.to}</span>
        </div>
      ) : (
        <p className="text-lg font-black text-white">
          Sigues siendo <span style={{ color }}>{d.toEmoji} {d.to}</span>
        </p>
      )}
      <p className="mt-1 text-sm text-[var(--color-muted)]">{d.reason}</p>
    </motion.div>
  );
}
