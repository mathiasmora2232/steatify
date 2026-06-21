'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Input, parseErr } from '@/components/form';
import { Logo } from '@/components/Logo';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      setError('Debes aceptar los Términos de Servicio y la Política de Privacidad para crear una cuenta.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.register({ email, username, password });
      window.location.href = '/dashboard/settings?welcome=1';
    } catch (err) {
      setError(parseErr(err));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Logo size={44} className="mb-3" />
      <h1 className="mb-1 text-3xl font-bold">Crea tu cuenta Sonora</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Una identidad propia. Luego conectas Spotify y Steam.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Input value={email} onChange={setEmail} type="email" placeholder="Email" />
        <Input value={username} onChange={setUsername} placeholder="Usuario (a-z, 0-9, _)" />
        <Input value={password} onChange={setPassword} type="password" placeholder="Contraseña (mín. 6)" />

        <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-3 text-sm text-[var(--color-muted)]">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
          />
          <span>
            He leído y acepto los{' '}
            <Link href="/terms" target="_blank" className="text-[var(--color-accent)] hover:underline">Términos de Servicio</Link>{' '}
            y la{' '}
            <Link href="/privacy" target="_blank" className="text-[var(--color-accent)] hover:underline">Política de Privacidad</Link>,
            incluido el uso de funciones de IA.
          </span>
        </label>

        {error && (
          <p className="rounded-lg border border-[var(--color-rose)]/40 bg-[var(--color-rose)]/10 px-4 py-2 text-sm text-[var(--color-rose)]">
            {error}
          </p>
        )}
        <button
          disabled={busy || !accepted}
          className="w-full rounded-full bg-[var(--color-accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Creando…' : 'Crear cuenta'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-[var(--color-muted)]">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-[var(--color-accent)]">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}

