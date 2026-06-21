'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, loginUrl } from '@/lib/api';
import { GuestButton } from '@/components/GuestButton';
import { Input, parseErr } from '@/components/form';

const SPOTIFY_ERRORS: Record<string, string> = {
  spotify_access:
    'Esa cuenta de Spotify no tiene acceso. La app está en modo desarrollo: solo cuentas agregadas a la lista pueden entrar. Usa tu cuenta Sonora o el modo invitado.',
  spotify_taken: 'Esa cuenta de Spotify ya está conectada a otro usuario de Sonora.',
  spotify_failed: 'No se pudo conectar con Spotify. Intenta de nuevo.',
  server_error:
    'Spotify rechazó el inicio de sesión (server_error). Suele ser temporal o por sesión: vuelve a pulsar “Continuar con Spotify” y acepta de nuevo. Si sigue, revisa que en el dashboard tu cuenta esté en User Management.',
  access_denied: 'Cancelaste el acceso a Spotify. Vuelve a intentarlo cuando quieras.',
};

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('error');
    if (e) setError(SPOTIFY_ERRORS[e] ?? 'No se pudo iniciar sesión.');
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.loginAccount(identifier, password);
      window.location.href = '/dashboard';
    } catch (err) {
      setError(parseErr(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="mb-6 text-3xl font-bold">Entra a Sonora</h1>

      <form onSubmit={submit} className="space-y-3">
        <Input value={identifier} onChange={setIdentifier} placeholder="Email o usuario" />
        <Input value={password} onChange={setPassword} type="password" placeholder="Contraseña" />
        {error && (
          <p className="rounded-lg border border-[var(--color-rose)]/40 bg-[var(--color-rose)]/10 px-4 py-2 text-sm text-[var(--color-rose)]">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-full bg-[var(--color-accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Entrando…' : 'Iniciar sesión'}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-[var(--color-muted)]">
        <span className="h-px flex-1 bg-[var(--color-border)]" /> o <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <a
        href={loginUrl}
        className="block rounded-full border px-5 py-3 text-center text-sm font-medium transition hover:border-[var(--color-accent)]"
      >
        Continuar con Spotify
      </a>
      <div className="mt-4 text-center">
        <GuestButton />
      </div>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-[var(--color-accent)]">
          Regístrate
        </Link>
      </p>
      <p className="mt-4 text-center text-[11px] text-[var(--color-muted)]">
        Al continuar aceptas los <Link href="/terms" className="hover:text-[var(--color-text)] hover:underline">Términos</Link> y la{' '}
        <Link href="/privacy" className="hover:text-[var(--color-text)] hover:underline">Privacidad</Link>.
      </p>
    </main>
  );
}
