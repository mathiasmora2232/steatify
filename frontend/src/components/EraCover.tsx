'use client';

import { motion } from 'framer-motion';
import type { EraTheme } from '@/lib/eras-derive';

/**
 * Stylized era "cover". We don't have real artist photos (dev-mode Spotify
 * doesn't return images), so we render a themed gradient tile with the era icon
 * and the dominant artist's initial — premium and honest, no broken images.
 */
export function EraCover({
  theme,
  artist,
  size = 'lg',
}: {
  theme: EraTheme;
  artist: string | null;
  size?: 'lg' | 'sm';
}) {
  const Glyph = theme.icon;
  const px = size === 'lg' ? 'h-28 w-28' : 'h-14 w-14';
  const initial = artist?.trim()?.charAt(0).toUpperCase() ?? '';
  return (
    <div
      className={`relative ${px} shrink-0 overflow-hidden rounded-2xl`}
      style={{
        background: `radial-gradient(120% 120% at 30% 20%, ${theme.color}cc, ${theme.color}44 55%, #0b0d12)`,
      }}
    >
      <div className="absolute inset-0 opacity-30 mix-blend-overlay" style={{ background: theme.glow }} />
      {initial && (
        <span
          className={`absolute inset-0 flex items-center justify-center font-black text-white/15 ${
            size === 'lg' ? 'text-7xl' : 'text-3xl'
          }`}
        >
          {initial}
        </span>
      )}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4 }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <Glyph className={size === 'lg' ? 'h-9 w-9' : 'h-5 w-5'} style={{ color: '#fff' }} strokeWidth={1.75} />
      </motion.div>
    </div>
  );
}
