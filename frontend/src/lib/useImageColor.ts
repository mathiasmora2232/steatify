'use client';

import { useEffect, useState } from 'react';

/**
 * Derive a representative accent color from an image (album cover, game header)
 * client-side via a tiny canvas. CORS-safe: if the host doesn't allow pixel
 * reads, it silently keeps the `fallback` brand color. The averaged color is
 * pushed toward a vivid, mid-luminance tone so it reads as an accent, not mud.
 */
export function useImageColor(src: string | null | undefined, fallback: string): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    setColor(fallback);
    if (!src || typeof window === 'undefined') return;
    let cancelled = false;

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.src = src;
    img.onload = () => {
      if (cancelled) return;
      try {
        const canvas = document.createElement('canvas');
        const size = 24;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);

        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 200) continue; // skip transparent
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (lum < 18 || lum > 240) continue; // skip near-black / near-white
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n += 1;
        }
        if (n === 0) return;
        r /= n; g /= n; b /= n;
        if (!cancelled) setColor(vivid(r, g, b));
      } catch {
        /* tainted canvas (no CORS) — keep the brand fallback */
      }
    };
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return color;
}

/** Push an averaged RGB toward a punchy accent: bump saturation, clamp lightness. */
function vivid(r: number, g: number, b: number): string {
  let [h, s, l] = rgbToHsl(r, g, b);
  s = Math.min(1, Math.max(s, 0.45) * 1.25);
  l = Math.min(0.62, Math.max(0.42, l));
  const [nr, ng, nb] = hslToRgb(h, s, l);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
