import Link from 'next/link';
import { Logo } from '@/components/Logo';

/** Polished, readable chrome for the legal pages (terms / privacy). */
export function LegalShell({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'radial-gradient(700px 380px at 15% -10%, rgba(52,224,161,0.08), transparent), radial-gradient(700px 380px at 90% 6%, rgba(168,85,247,0.08), transparent)' }} />

      <nav className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2"><Logo size={28} /><span className="font-bold tracking-tight">Sonora</span></Link>
        <Link href="/register" className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110">Crear Space</Link>
      </nav>

      <div className="mx-auto max-w-2xl px-6 pb-20 pt-4">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-[var(--color-muted)]">{updated}</p>

        <div className="mt-8 space-y-7 text-[15px] leading-relaxed">{children}</div>

        <footer className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)]">
          <Link href="/terms" className="hover:text-white">Términos</Link>
          <Link href="/privacy" className="hover:text-white">Privacidad</Link>
          <Link href="/que-es-sonora" className="hover:text-white">¿Qué es Sonora?</Link>
          <span>No afiliado a Spotify ni a Steam.</span>
        </footer>
      </div>
    </main>
  );
}
