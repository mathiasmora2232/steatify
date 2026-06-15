'use client';

import { motion } from 'framer-motion';

/** Circular progress ring with the value in the center. */
export function ConsistencyRing({
  value,
  color,
  size = 64,
  label,
}: {
  value: number; // 0..100
  color: string;
  size?: number;
  label?: string;
}) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, Math.max(0, value)) / 100);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            whileInView={{ strokeDashoffset: offset }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums"
          style={{ color }}
        >
          {value}%
        </span>
      </div>
      {label && <span className="text-[10px] text-[var(--color-muted)]">{label}</span>}
    </div>
  );
}
