import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/Logo';

/** Public, indexable article chrome (SEO pages). */
export function ArticleShell({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'radial-gradient(800px 420px at 15% -10%, rgba(52,224,161,0.10), transparent), radial-gradient(800px 420px at 90% 8%, rgba(168,85,247,0.10), transparent)' }} />

      <nav className="mx-auto flex max-w-2xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2"><Logo size={28} /><span className="font-bold tracking-tight">Sonora</span></Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/tools" className="text-[var(--color-muted)] transition hover:text-white">Herramientas</Link>
          <Link href="/register" className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 font-semibold text-black transition hover:brightness-110">Crear Space</Link>
        </div>
      </nav>

      <article className="mx-auto max-w-2xl px-6 pb-16 pt-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
        {lead && <p className="mt-3 text-lg text-[var(--color-muted)]">{lead}</p>}
        <div className="prose-sonora mt-8 space-y-5 text-[16px] leading-relaxed text-[var(--color-text)] [&_a]:text-[var(--color-accent)] [&_a:hover]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-white [&_ul]:space-y-1.5">
          {children}
        </div>

        <div className="mt-12 rounded-3xl border bg-[var(--color-surface)] p-6 text-center">
          <p className="text-lg font-bold text-white">Crea tu universo Sonora</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Gratis para empezar. Tu música y tu gaming, en una identidad.</p>
          <Link href="/register" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
            Crear mi Space <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <footer className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-[var(--color-muted)]">
          <Link href="/que-es-sonora" className="hover:text-white">¿Qué es Sonora?</Link>
          <Link href="/spotify-wrapped-permanente" className="hover:text-white">Wrapped permanente</Link>
          <Link href="/adn-musical" className="hover:text-white">ADN musical</Link>
          <Link href="/tools" className="hover:text-white">Herramientas</Link>
        </footer>
      </article>
    </main>
  );
}
