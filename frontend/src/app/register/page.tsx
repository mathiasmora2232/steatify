'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Input, parseErr } from '@/components/form';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
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
      <h1 className="mb-1 text-3xl font-bold">Crea tu cuenta Sonora</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Una identidad propia. Luego conectas Spotify y Steam.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <Input value={email} onChange={setEmail} type="email" placeholder="Email" />
        <Input value={username} onChange={setUsername} placeholder="Usuario (a-z, 0-9, _)" />
        <Input value={password} onChange={setPassword} type="password" placeholder="Contraseña (mín. 6)" />
        {error && (
          <p className="rounded-lg border border-[var(--color-rose)]/40 bg-[var(--color-rose)]/10 px-4 py-2 text-sm text-[var(--color-rose)]">
            {error}
          </p>
        )}
        <button
          disabled={busy}
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

