import Link from 'next/link';
import { Headphones, Gamepad2, Calculator, ArrowRight } from 'lucide-react';
import { ToolShell } from '@/components/ToolShell';

export const metadata = {
  title: 'Herramientas gratis · Steatify',
  description: 'Quizzes y calculadoras de música y gaming — sin registrarte. ¿Qué tipo de oyente eres? ¿Cuánto vale tu tiempo de juego?',
};

const TOOLS = [
  { href: '/tools/oyente', icon: Headphones, color: '#1db954', title: '¿Qué tipo de oyente eres?', desc: 'Descubre tu arquetipo musical en 6 preguntas.' },
  { href: '/tools/jugador', icon: Gamepad2, color: '#7c5cff', title: '¿Qué tipo de jugador eres?', desc: 'Tu clase gamer: Completista, Coleccionista, Competitivo…' },
  { href: '/tools/costo-por-hora', icon: Calculator, color: '#fbbf24', title: 'Calculadora gamer', desc: '¿Cuánto te cuesta cada hora de juego? ¿Vale la pena tu backlog?' },
];

export default function ToolsPage() {
  return (
    <ToolShell title="Herramientas gratis" subtitle="Sin registrarte. Pruébalas y compártelas.">
      <div className="space-y-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href}
            className="group flex items-center gap-4 rounded-3xl border bg-[var(--color-surface)] p-5 transition hover:border-white/15"
            style={{ boxShadow: `inset 0 0 90px -60px ${t.color}` }}>
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: `${t.color}1f`, color: t.color }}>
              <t.icon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white">{t.title}</p>
              <p className="text-sm text-[var(--color-muted)]">{t.desc}</p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-[var(--color-muted)] transition group-hover:translate-x-1 group-hover:text-white" />
          </Link>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-[var(--color-muted)]">
        ¿Quieres tus arquetipos <strong className="text-[var(--color-text)]">de verdad</strong>, con tu historial?{' '}
        <Link href="/register" className="text-[var(--color-accent)] hover:underline">Crea tu Space</Link>.
      </p>
    </ToolShell>
  );
}
