import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { RELEASES, KIND_META } from '@/lib/changelog';

export const metadata = {
  title: 'Changelog · Sonora',
  description: 'Todo lo nuevo en Sonora — novedades, mejoras y arreglos versión por versión.',
};

export default function ChangelogPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-lg font-bold tracking-tight">Sonora</span>
        </Link>
        <Link href="/login" className="text-sm text-[var(--color-accent)] hover:underline">Entrar</Link>
      </div>

      <h1 className="text-4xl font-black tracking-tight">Changelog</h1>
      <p className="mt-2 text-[var(--color-muted)]">Todo lo que vamos construyendo en Sonora. Sin relleno.</p>

      <div className="mt-10 space-y-10">
        {RELEASES.map((r) => (
          <section key={r.version} className="relative border-l border-[var(--color-border)] pl-6">
            <span className="absolute -left-[7px] top-1.5 h-3.5 w-3.5 rounded-full bg-[var(--color-accent)] ring-4 ring-[var(--color-bg)]" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-[var(--color-surface-2)] px-2.5 py-0.5 text-sm font-bold text-white">v{r.version}</span>
              <h2 className="text-xl font-bold text-white">{r.title}</h2>
            </div>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-[var(--color-muted)]">
              {new Date(r.date).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <ul className="mt-4 space-y-2.5">
              {r.changes.map((c, i) => {
                const m = KIND_META[c.kind];
                return (
                  <li key={i} className="flex items-start gap-3 text-[15px] leading-relaxed">
                    <span className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${m.color}1f`, color: m.color }}>
                      {m.emoji} {m.label}
                    </span>
                    <span className="text-[var(--color-text)]">{c.text}</span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-14 rounded-3xl border bg-[var(--color-surface)] p-6 text-center">
        <p className="text-lg font-bold text-white">¿Listo para crear tu universo?</p>
        <Link href="/register" className="mt-3 inline-block rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110">
          Crea tu Space
        </Link>
      </div>
    </main>
  );
}
