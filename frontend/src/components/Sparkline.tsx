'use client';

import { motion } from 'framer-motion';

/** Tiny decorative bar sparkline (heights are 0..1). Grows in on mount. */
export function Sparkline({ values, color = '#1db954' }: { values: number[]; color?: string }) {
  return (
    <div className="flex h-8 items-end gap-[3px]">
      {values.map((v, i) => (
        <motion.span
          key={i}
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: `${Math.max(8, v * 100)}%`, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 + i * 0.025, ease: 'easeOut' }}
          className="w-full rounded-full"
          style={{ background: color, opacity: 0.45 + v * 0.55 }}
        />
      ))}
    </div>
  );
}
