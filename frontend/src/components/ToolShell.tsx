import Link from 'next/link';
import { Logo } from '@/components/Logo';

/** Public chrome for the no-login tools (landing-style nav + footer). */
export function ToolShell({ title, subtitle, children }: { title?: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'radial-gradient(800px 420px at 15% -10%, rgba(52,224,161,0.14), transparent), radial-gradient(800px 420px at 90% 10%, rgba(168,85,247,0.14), transparent)' }} />

      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2"><Logo size={28} /><span className="font-bold tracking-tight">Sonora</span></Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/tools" className="text-[var(--color-muted)] transition hover:text-white">Herramientas</Link>
          <Link href="/register" className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 font-semibold text-black transition hover:brightness-110">Crear Space</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-2xl px-6 pb-20 pt-6">
        {title && (
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
            {subtitle && <p className="mt-2 text-[var(--color-muted)]">{subtitle}</p>}
          </header>
        )}
        {children}
      </div>
    </main>
  );
}
