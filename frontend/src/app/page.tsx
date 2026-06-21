import Link from 'next/link';
import { loginUrl } from '@/lib/api';
import { GuestButton } from '@/components/GuestButton';
import { Logo } from '@/components/Logo';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-6 rounded-full border px-3 py-1 text-xs text-[var(--color-muted)]">
        Spotify Wrapped permanente · en tiempo real
      </span>
      <Logo size={96} className="mb-3 drop-shadow-[0_0_40px_rgba(59,130,246,0.35)]" />
      <h1 className="bg-gradient-to-b from-white to-[#9aa0ad] bg-clip-text text-5xl font-bold tracking-[0.2em] text-transparent sm:text-7xl">
        SONORA
      </h1>
      <p className="mt-3 bg-gradient-to-r from-[#34e0a1] via-[#3b82f6] to-[#a855f7] bg-clip-text text-xs font-semibold uppercase tracking-[0.25em] text-transparent sm:text-sm">
        Tu universo. Tu historia. Tus datos.
      </p>
      <p className="mt-5 max-w-xl text-lg text-[var(--color-muted)]">
        Tu vida musical convertida en datos: rankings, eras, moods y un diario
        inteligente que aprende de lo que escuchas.
      </p>
      <p className="mt-3 max-w-xl text-sm text-[var(--color-muted)]/80">
        Sonora analiza tu historial de Spotify para crear estadísticas, eras, tendencias y tu resumen
        personal. <strong className="text-[var(--color-text)]">No vendemos tus datos ni modificamos tu cuenta de Spotify.</strong>
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/register"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3 font-semibold text-black transition hover:brightness-110"
        >
          Crear cuenta
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border px-7 py-3 font-medium transition hover:border-[var(--color-accent)]"
        >
          Iniciar sesión
        </Link>
      </div>
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        Crea tu cuenta y conecta Spotify + Steam · o entra rápido:
      </p>
      <div className="mt-2 flex items-center gap-4">
        <a href={loginUrl} className="text-sm text-[var(--color-accent)] hover:underline">
          Continuar con Spotify
        </a>
        <GuestButton />
      </div>

      {/* Footer — required-ish for the Spotify quota review */}
      <footer className="mt-16 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[var(--color-muted)]">
        <Link href="/privacy" className="transition hover:text-[var(--color-text)]">Política de privacidad</Link>
        <Link href="/terms" className="transition hover:text-[var(--color-text)]">Términos de servicio</Link>
        <span>No afiliado a Spotify ni a Steam.</span>
      </footer>
    </main>
  );
}
