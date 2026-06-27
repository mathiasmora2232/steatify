'use client';

import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { api } from '@/lib/api';

export function Waitlist({ source = 'landing' }: { source?: string }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setState('error'); return; }
    setState('busy');
    try {
      await api.joinWaitlist(email.trim().toLowerCase(), source);
      setState('done');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-5 py-3 text-sm font-medium text-[var(--color-accent)]">
        <Check className="h-4 w-4" /> ¡Listo! Te avisamos de las novedades.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
      <div className="flex flex-1 items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4">
        <Mail className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
        <input
          type="email" value={email} onChange={(e) => { setEmail(e.target.value); if (state === 'error') setState('idle'); }}
          placeholder="tu@email.com"
          className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-[var(--color-muted)]"
        />
      </div>
      <button type="submit" disabled={state === 'busy'}
        className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50">
        {state === 'busy' ? 'Enviando…' : 'Avísame'}
      </button>
      {state === 'error' && <p className="text-xs text-[var(--color-rose)] sm:hidden">Revisa tu correo e intenta de nuevo.</p>}
    </form>
  );
}
