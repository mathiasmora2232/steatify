'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

/** Enter without Spotify (demo / Steam-only). Sets a guest session and reloads. */
export function GuestButton() {
  const [busy, setBusy] = useState(false);

  async function enter() {
    setBusy(true);
    try {
      await api.guestLogin();
      window.location.href = '/dashboard';
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={enter}
      disabled={busy}
      className="text-sm text-[var(--color-muted)] underline-offset-4 transition hover:text-white hover:underline disabled:opacity-50"
    >
      {busy ? 'Entrando…' : 'Entrar como invitado (solo Steam / demo)'}
    </button>
  );
}
