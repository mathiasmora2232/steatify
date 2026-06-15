'use client';

import { motion } from 'framer-motion';

/**
 * Stylized animated DNA double-helix. Pure SVG + CSS — no assets, scales
 * crisply, and tints to the dominant-archetype color. Decorative hero visual.
 */
export function DnaHelix({ color = '#1db954', size = 220 }: { color?: string; size?: number }) {
  const rungs = Array.from({ length: 11 }, (_, i) => i);
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Glow halo */}
      <div
        className="absolute inset-0 rounded-full blur-3xl"
        style={{ background: `radial-gradient(circle, ${color}55, transparent 70%)` }}
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 rounded-full border"
        style={{ borderColor: `${color}33` }}
      />
      <svg viewBox="0 0 120 200" className="relative" style={{ width: size * 0.62, height: size * 0.9 }}>
        <defs>
          <linearGradient id="helixA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="helixB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Two sine strands */}
        <motion.path
          d="M30 0 C 90 33, 90 67, 30 100 S -30 167, 30 200"
          fill="none"
          stroke="url(#helixA)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut' }}
        />
        <motion.path
          d="M90 0 C 30 33, 30 67, 90 100 S 150 167, 90 200"
          fill="none"
          stroke="url(#helixB)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: 'easeInOut', delay: 0.1 }}
        />
        {/* Connecting rungs */}
        {rungs.map((i) => {
          const y = (i / (rungs.length - 1)) * 200;
          const phase = Math.sin((i / (rungs.length - 1)) * Math.PI * 2);
          const x1 = 60 + phase * 30;
          const x2 = 60 - phase * 30;
          return (
            <motion.line
              key={i}
              x1={x1}
              y1={y}
              x2={x2}
              y2={y}
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.25, 0.9, 0.25] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.12, ease: 'easeInOut' }}
            />
          );
        })}
      </svg>
    </div>
  );
}
