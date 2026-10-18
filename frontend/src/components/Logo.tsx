/** Refreshed square Steatify brand mark. */
export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/steatifyicoversion.png"
      width={size}
      height={size}
      className={className}
      alt=""
      aria-hidden
    />
  );
}

/** Full Steatify wordmark for navigation and headers. */
export function LogoWordmark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/steatifylogo.png" width={size * 3} height={size} alt="Steatify" />
    </span>
  );
}
