'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Music2, Gamepad2, ArrowRight } from 'lucide-react';
import type { MusicType } from '@/lib/api';
import type { GamerType } from '@/lib/steam-derive';

/**
 * "Sonora ADN" balanced — your dominant Musical archetype and Gamer archetype
 * side by side, each with the factual reason behind it. The unified identity.
 */
export function AdnDual({ musical, gamer }: { musical: MusicType | null; gamer: GamerType | null }) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        Sonora ADN
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Panel
          href="/dashboard/dna"
          icon={Music2}
          color="#1db954"
          kicker="ADN Musical"
          emoji={musical?.emoji}
          label={musical?.label ?? '—'}
          reason={musical?.reason ?? 'Aún sin datos suficientes.'}
        />
        <Panel
          href="/dashboard/steam"
          icon={Gamepad2}
          color={gamer?.color ?? '#7c5cff'}
          kicker="ADN Gamer"
          label={gamer?.label ?? '—'}
          reason={gamer?.reason ?? 'Conecta tu Steam para verlo.'}
        />
      </div>
    </div>
  );
}

function Panel({
  href,
  icon: Icon,
  color,
  kicker,
  emoji,
  label,
  reason,
}: {
  href: string;
  icon: typeof Music2;
  color: string;
  kicker: string;
  emoji?: string;
  label: string;
  reason: string;
}) {
  return (
    <Link href={href}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative overflow-hidden rounded-3xl border p-5 transition hover:border-[var(--color-accent)]/40"
        style={{ background: `radial-gradient(360px 160px at 85% 0%, ${color}1f, transparent), var(--color-surface)` }}
      >
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Icon className="h-3.5 w-3.5" style={{ color }} /> {kicker}
          </span>
          <ArrowRight className="h-4 w-4 text-[var(--color-muted)] transition group-hover:translate-x-0.5 group-hover:text-white" />
        </div>
        <h3 className="mt-2 text-2xl font-black" style={{ color }}>
          {emoji ? `${emoji} ` : ''}
          {label}
        </h3>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{reason}</p>
      </motion.div>
    </Link>
  );
}
