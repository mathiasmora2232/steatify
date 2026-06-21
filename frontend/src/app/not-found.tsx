import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 text-center">
      <div className="flex flex-col items-center">
        <Logo size={72} className="mb-5 opacity-90 drop-shadow-[0_0_30px_rgba(124,92,255,0.3)]" />
        <p className="bg-gradient-to-r from-[#34e0a1] via-[#3b82f6] to-[#a855f7] bg-clip-text text-7xl font-black tracking-tight text-transparent">
          404
        </p>
        <h1 className="mt-2 text-xl font-bold text-white">Esta página se perdió en el espacio</h1>
        <p className="mt-1 max-w-sm text-sm text-[var(--color-muted)]">
          El enlace no existe o se movió. Volvamos a tu universo.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Volver al inicio
        </Link>
      </div>
    </main>
  );
}
