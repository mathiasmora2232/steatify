/**
 * Sonora brand mark — gradient "S" (green→blue→purple) fusing a sound wave
 * (music) and a gamepad (gaming). SVG so it stays crisp at any size.
 */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <defs>
        <linearGradient id="sonora-s" x1="28" y1="18" x2="104" y2="116" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34e0a1" />
          <stop offset="0.5" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
      </defs>
      {/* the S */}
      <path
        d="M90 42 C90 28 67 24 52 33 C34 43 39 58 61 66 C86 75 91 90 74 100 C60 108 38 104 32 90"
        stroke="url(#sonora-s)" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* sound wave — music (upper counter) */}
      <g fill="#34e0a1">
        <rect x="55" y="38" width="3.4" height="14" rx="1.7" />
        <rect x="62" y="32" width="3.4" height="26" rx="1.7" fill="#3b82f6" />
        <rect x="69" y="40" width="3.4" height="10" rx="1.7" fill="#60a5fa" />
      </g>
      {/* gamepad — gaming (lower counter) */}
      <g fill="#a855f7">
        <rect x="48" y="80" width="4" height="14" rx="2" />
        <rect x="43" y="85" width="14" height="4" rx="2" />
        <circle cx="72" cy="82" r="2.8" />
        <circle cx="79" cy="89" r="2.8" fill="#c084fc" />
      </g>
    </svg>
  );
}

/** Mark + "Sonora" wordmark, for headers. */
export function LogoWordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <Logo size={size} />
      <span className="text-xl font-bold tracking-tight text-white">Sonora</span>
    </span>
  );
}
