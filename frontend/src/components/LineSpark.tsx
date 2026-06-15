'use client';

import { motion } from 'framer-motion';

/**
 * Stock-market style line sparkline (values 0..1) with a soft gradient fill.
 * SVG so it scales crisply; the line draws itself in on mount.
 */
export function LineSpark({
  values,
  color,
  width = 120,
  height = 40,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return <div style={{ width, height }} />;
  const pad = 2;
  const stepX = (width - pad * 2) / (values.length - 1);
  const y = (v: number) => height - pad - v * (height - pad * 2);
  const pts = values.map((v, i) => `${pad + i * stepX},${y(v)}`);
  const line = `M ${pts.join(' L ')}`;
  const area = `${line} L ${width - pad},${height} L ${pad},${height} Z`;
  const id = `ls-${color.replace('#', '')}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
    </svg>
  );
}
