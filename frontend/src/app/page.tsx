import Link from 'next/link';
import { loginUrl } from '@/lib/api';
import { GuestButton } from '@/components/GuestButton';

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 text-center">
      <span className="mb-4 rounded-full border px-3 py-1 text-xs text-[var(--color-muted)]">
        Spotify Wrapped permanente · en tiempo real
      </span>
      <h1 className="bg-gradient-to-b from-white to-[#9aa0ad] bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-7xl">
        Sonora
      </h1>
      <p className="mt-5 max-w-xl text-lg text-[var(--color-muted)]">
        Tu vida musical convertida en datos: rankings, eras, moods y un diario
        inteligente que aprende de lo que escuchas.
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
    </main>
  );
}
