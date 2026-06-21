'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { RefreshCw } from 'lucide-react';
import { Logo } from '@/components/Logo';

/** Dashboard error boundary — replaces React's white crash screen. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surface the error for debugging; in prod this still helps via console.
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <main className="grid min-h-[70vh] place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <Logo size={64} className="mb-5 opacity-80" />
        <h1 className="text-xl font-bold text-white">Algo se rompió por aquí</h1>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">
          Tuvimos un problema cargando esta sección. Puedes reintentar o volver al inicio.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={reset}
            className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
          >
            <RefreshCw className="h-4 w-4" /> Reintentar
          </button>
          <Link href="/dashboard" className="rounded-full border px-5 py-2.5 text-sm font-medium text-[var(--color-muted)] transition hover:text-white">
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
