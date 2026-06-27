import Link from 'next/link';
import { Check, Loader, Circle } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { Waitlist } from '@/components/Waitlist';

export const metadata = {
  title: 'Roadmap · Sonora',
  description: 'En qué estamos trabajando en Sonora: lo hecho, lo que viene y lo planeado. Transparencia total.',
};

type Status = 'done' | 'building' | 'planned';
const COLUMNS: { status: Status; title: string; items: string[] }[] = [
  {
    status: 'done',
    title: 'Listo',
    items: [
      'Dashboard, Spotify y Steam',
      'Wrapped, ADN musical y Eras',
      'Perfil 2.0: vitrinas, insignias, títulos',
      'Social: seguir, comparar (Vibe Match), feed',
      'Temas, perfil dinámico y builder',
      'Landing, demo, herramientas y changelog',
    ],
  },
  {
    status: 'building',
    title: 'En construcción',
    items: [
      'Páginas SEO y blog',
      'Lista de espera y comunidad',
      'Planes Free / Plus / Pro',
    ],
  },
  {
    status: 'planned',
    title: 'Planeado',
    items: [
      'Cuota extendida de Spotify (acceso para todos)',
      'Pasarela de pago',
      'Sonora Brain — asistente IA de tu universo',
      'Fondos vivos (collage de carátulas)',
      'Más conexiones: PSN, Xbox, Letterboxd',
      'App móvil',
    ],
  },
];

const META: Record<Status, { icon: typeof Check; color: string }> = {
  done: { icon: Check, color: '#1db954' },
  building: { icon: Loader, color: '#fbbf24' },
  planned: { icon: Circle, color: '#8b8f9c' },
};

export default function RoadmapPage() {
  return (
    <main className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'radial-gradient(800px 420px at 15% -10%, rgba(52,224,161,0.10), transparent), radial-gradient(800px 420px at 90% 8%, rgba(168,85,247,0.10), transparent)' }} />
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2"><Logo size={28} /><span className="font-bold tracking-tight">Sonora</span></Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/changelog" className="text-[var(--color-muted)] transition hover:text-white">Novedades</Link>
          <Link href="/register" className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 font-semibold text-black transition hover:brightness-110">Crear Space</Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-6 pb-16 pt-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Roadmap</h1>
        <p className="mt-2 text-[var(--color-muted)]">En qué estamos trabajando. Con transparencia, sin promesas vacías.</p>

        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {COLUMNS.map((col) => {
            const m = META[col.status];
            return (
              <div key={col.status} className="rounded-3xl border bg-[var(--color-surface)] p-5">
                <p className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest" style={{ color: m.color }}>
                  <m.icon className="h-4 w-4" /> {col.title}
                </p>
                <ul className="space-y-2.5">
                  {col.items.map((it) => (
                    <li key={it} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                      <m.icon className="mt-0.5 h-4 w-4 shrink-0" style={{ color: m.color }} /> {it}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-12 flex flex-col items-center rounded-3xl border bg-[var(--color-surface)] p-6 text-center">
          <p className="text-lg font-bold text-white">¿Quieres enterarte primero?</p>
          <p className="mb-5 mt-1 text-sm text-[var(--color-muted)]">Te avisamos cuando salga lo nuevo.</p>
          <Waitlist source="roadmap" />
        </div>
      </div>
    </main>
  );
}
