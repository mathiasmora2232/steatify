'use client';

/**
 * Animated audio visualizer for the Now Playing hero. Each bar has its own
 * height, speed and phase, so it reads like a real equalizer rather than a
 * uniform pulse. Deterministic (no Math.random) → SSR-safe.
 */
export function Waveform({ active, bars = 40 }: { active: boolean; bars?: number }) {
  return (
    <div className="flex h-10 items-center gap-[2px]" aria-hidden>
      {Array.from({ length: bars }).map((_, i) => {
        // Layered sines → organic, varied static heights.
        const h = 22 + (Math.sin(i * 0.7) + 1) * 22 + (Math.sin(i * 1.9 + 1) + 1) * 14;
        const dur = 0.45 + ((i * 7) % 9) * 0.085; // 0.45–1.13s, varied per bar
        const delay = ((i * 13) % 11) * 0.06; // staggered phases
        const minScale = 0.18 + ((i * 5) % 7) * 0.05; // 0.18–0.48 floor → bouncier
        return (
          <span
            key={i}
            className="w-[3px] flex-1 rounded-full"
            style={{
              height: `${Math.min(100, h)}%`,
              background: 'linear-gradient(to top, var(--color-accent), var(--color-accent-2))',
              opacity: active ? 0.9 : 0.35,
              transformOrigin: 'center',
              ['--wmin' as string]: String(minScale),
              animation: active ? `steatify-wave ${dur}s ease-in-out ${delay}s infinite alternate` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
