'use client';

import { forwardRef } from 'react';
import { archetypeIcon } from '@/lib/icons';
import type { Attribute } from '@/lib/dna-derive';

/**
 * The collectible "SONORA DNA" card captured to PNG for sharing. Fixed pixel
 * size so html-to-image renders it consistently regardless of viewport. Kept
 * visually self-contained (Tailwind + inline styles) — no external fonts. Shows
 * the identity, rarity/level, real headline stats and the top-3 attributes.
 */
export const DnaShareCard = forwardRef<
  HTMLDivElement,
  {
    name: string;
    type: string;
    rarity: string;
    color: string;
    topArchetypeKey: string;
    attributes: Attribute[];
    level?: number;
    plays?: number;
    artists?: number;
    topPct?: number;
  }
>(function DnaShareCard(
  { name, type, rarity, color, topArchetypeKey, attributes, level, plays, artists, topPct },
  ref,
) {
  const Glyph = archetypeIcon[topArchetypeKey] ?? archetypeIcon.obsessive;
  const top3 = [...attributes].sort((a, b) => b.value - a.value).slice(0, 3);
  const fmt = (n?: number) => (n == null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : `${n}`);

  const stats = [
    { v: fmt(plays), l: 'reproduc.' },
    { v: fmt(artists), l: 'artistas' },
    { v: topPct != null ? `${topPct}%` : '—', l: 'top global' },
  ];

  return (
    <div
      ref={ref}
      style={{
        width: 600,
        height: 760,
        background: `radial-gradient(700px 320px at 50% -8%, ${color}3a, transparent), linear-gradient(160deg, #0c0e14, #060709)`,
      }}
      className="relative flex flex-col overflow-hidden rounded-[28px] border border-white/10 p-9 text-white"
    >
      {/* decorative glows + grid texture */}
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl" style={{ background: `${color}40` }} />
      <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full blur-3xl" style={{ background: `${color}22` }} />
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '34px 34px',
        }}
      />

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <span className="text-sm font-bold uppercase tracking-[0.3em] text-white/60">Sonora DNA</span>
        <span
          className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-widest"
          style={{ background: `${color}22`, color }}
        >
          {level != null && <span className="opacity-80">Lv.{level}</span>}
          {rarity}
        </span>
      </div>

      {/* Glyph */}
      <div className="relative mt-7 flex justify-center">
        <div className="relative flex h-44 w-44 items-center justify-center rounded-full border" style={{ borderColor: `${color}55`, background: `${color}14` }}>
          <div className="absolute inset-3 rounded-full border border-dashed" style={{ borderColor: `${color}33` }} />
          <Glyph className="h-24 w-24" style={{ color }} strokeWidth={1.5} />
        </div>
      </div>

      {/* Identity */}
      <div className="relative mt-6 text-center">
        <p className="text-lg text-white/70">{name}</p>
        <p
          className="mt-1 text-[40px] font-black leading-tight"
          style={{ background: `linear-gradient(90deg, #fff, ${color})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
        >
          {type}
        </p>
      </div>

      {/* Headline stats */}
      <div className="relative mt-6 grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div key={s.l} className="rounded-2xl border border-white/10 bg-white/[0.03] py-3 text-center">
            <p className="text-2xl font-black tabular-nums" style={{ color }}>{s.v}</p>
            <p className="mt-0.5 text-[11px] uppercase tracking-wide text-white/45">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Top attributes */}
      <div className="relative mt-auto space-y-2.5 pt-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/40">Atributos destacados</p>
        {top3.map((a) => (
          <div key={a.axis}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="text-white/80">{a.axis}</span>
              <span className="font-bold tabular-nums" style={{ color }}>{a.value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: `${a.value}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
            </div>
          </div>
        ))}
      </div>

      <p className="relative mt-6 text-center text-xs tracking-[0.35em] text-white/30">SONORA.APP</p>
    </div>
  );
});
