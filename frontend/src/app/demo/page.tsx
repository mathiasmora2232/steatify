import Link from 'next/link';
import { ArrowRight, Eye } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { ProfileBody } from '@/components/ProfileBody';
import { DEMO_PROFILE } from '@/lib/demo-data';

export const metadata = {
  title: 'Demo · Así se ve tu Steatify',
  description: 'Explora una cuenta Steatify de ejemplo con datos ficticios: identidad, ADN musical, vitrinas, insignias, colecciones y línea temporal. Sin registrarte.',
};

export default function DemoPage() {
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'radial-gradient(800px 420px at 15% -10%, rgba(52,224,161,0.12), transparent), radial-gradient(800px 420px at 90% 8%, rgba(168,85,247,0.12), transparent)' }} />

      <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2"><Logo size={28} /><span className="font-bold tracking-tight">Steatify</span></Link>
        <Link href="/register" className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110">Crear Space</Link>
      </nav>

      {/* Demo banner */}
      <div className="mx-auto max-w-3xl px-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent)]/10 px-5 py-3">
          <p className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <Eye className="h-4 w-4 text-[var(--color-accent)]" />
            <span><strong className="text-white">Cuenta demo</strong> con datos de ejemplo — el tuyo se vería así.</span>
          </p>
          <Link href="/register" className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110">
            Crear el mío <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-6">
        <ProfileBody
          data={DEMO_PROFILE}
          actions={
            <Link href="/register" className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">
              Crear el mío
            </Link>
          }
        />

        <div className="mt-8 rounded-3xl border bg-[var(--color-surface)] p-6 text-center">
          <p className="text-lg font-bold text-white">¿Te gustó lo que viste?</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Esto es ficticio. El tuyo se arma solo con tu música y tu gaming reales.</p>
          <Link href="/register" className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
            Crear mi Space <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
