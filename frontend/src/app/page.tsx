'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Dna, Layers, IdCard, Sparkles, Headphones, Gamepad2, ArrowRight } from 'lucide-react';
import { loginUrl } from '@/lib/api';
import { GuestButton } from '@/components/GuestButton';
import { Logo } from '@/components/Logo';

const fade = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* ambient glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'radial-gradient(900px 480px at 15% -10%, rgba(52,224,161,0.18), transparent), radial-gradient(900px 480px at 90% 10%, rgba(168,85,247,0.18), transparent), radial-gradient(700px 400px at 50% 120%, rgba(59,130,246,0.16), transparent)' }} />

      {/* Nav */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2"><Logo size={30} /><span className="text-lg font-bold tracking-tight">Sonora</span></Link>
        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/tools" className="hidden text-sm text-[var(--color-muted)] transition hover:text-white sm:block">Herramientas</Link>
          <Link href="/changelog" className="hidden text-sm text-[var(--color-muted)] transition hover:text-white sm:block">Novedades</Link>
          <Link href="/login" className="text-sm text-[var(--color-muted)] transition hover:text-white">Entrar</Link>
          <Link href="/register" className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black transition hover:brightness-110">Crear Space</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto flex max-w-3xl flex-col items-center px-6 pb-12 pt-12 text-center sm:pt-20">
        <motion.div variants={fade} initial="hidden" animate="show">
          <Logo size={84} className="mx-auto mb-6 drop-shadow-[0_0_50px_rgba(59,130,246,0.4)]" />
        </motion.div>
        <motion.h1 variants={fade} initial="hidden" animate="show" transition={{ delay: 0.05 }}
          className="text-5xl font-black leading-[1.05] tracking-tight sm:text-7xl">
          Tu universo digital,<br />
          <span className="bg-gradient-to-r from-[#34e0a1] via-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">contado por tus datos.</span>
        </motion.h1>
        <motion.p variants={fade} initial="hidden" animate="show" transition={{ delay: 0.12 }}
          className="mt-6 max-w-xl text-lg text-[var(--color-muted)]">
          Sonora transforma tu música y tus juegos en una <strong className="text-[var(--color-text)]">identidad viva</strong>: eras, arquetipos, una carta de perfil para presumir y patrones que nunca habías visto.
        </motion.p>
        <motion.div variants={fade} initial="hidden" animate="show" transition={{ delay: 0.2 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-7 py-3.5 font-semibold text-black transition hover:brightness-110">
            Crear mi Space <ArrowRight className="h-4 w-4" />
          </Link>
          <GuestButton />
        </motion.div>
        <motion.div variants={fade} initial="hidden" animate="show" transition={{ delay: 0.28 }} className="mt-4 flex items-center gap-4 text-sm">
          <a href={loginUrl} className="text-[var(--color-accent)] hover:underline">Continuar con Spotify</a>
          <span className="text-[var(--color-muted)]">·</span>
          <span className="text-[var(--color-muted)]">No vendemos tus datos.</span>
        </motion.div>
      </section>

      {/* Música + Gaming band */}
      <Band>
        <div className="grid gap-4 sm:grid-cols-2">
          <World icon={Headphones} color="#1db954" title="Tu música" desc="Spotify Wrapped permanente: rankings, minutos, obsesiones, canciones olvidadas." />
          <World icon={Gamepad2} color="#7c5cff" title="Tu gaming" desc="Steam Replay: horas, biblioteca, backlog, joyas ocultas y valor real." />
        </div>
        <p className="mt-5 text-center text-sm text-[var(--color-muted)]">
          Por primera vez, <strong className="text-[var(--color-text)]">música + gaming juntos</strong> en una sola identidad.
        </p>
      </Band>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-2">
          <Feature icon={Dna} color="#1db954" title="Tu identidad" desc="Tu ADN musical y tus arquetipos: Looper, Nocturno, Explorador… descubre quién eres según lo que escuchas." />
          <Feature icon={Layers} color="#a855f7" title="Tu historia" desc="Cada mes es un capítulo. Sonora detecta tus eras y les pone nombre — tu vida en una línea temporal." />
          <Feature icon={IdCard} color="#3b82f6" title="Tu perfil" desc="Una carta de identidad para presumir: nivel, rareza, vitrinas, insignias y títulos equipables. Estilo Steam + carta Pokémon." />
          <Feature icon={Sparkles} color="#fbbf24" title="Tu universo" desc="Insights con IA, comparaciones de compatibilidad con amigos y un perfil que cambia solo según tu actividad." />
        </div>
      </section>

      {/* Cómo funciona */}
      <Band>
        <h2 className="mb-6 text-center text-2xl font-bold">¿Cómo funciona?</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          {[
            ['1', 'Crea tu cuenta', 'Tu Space, en segundos.'],
            ['2', 'Conecta Spotify y/o Steam', 'Acceso solo de lectura.'],
            ['3', 'Sonora analiza tus datos', 'Sin que tú hagas nada.'],
            ['4', 'Descubre tu universo', 'Patrones que nunca viste.'],
          ].map(([n, t, d]) => (
            <div key={n} className="rounded-2xl border bg-[var(--color-surface)] p-4">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-accent)]/15 text-sm font-bold text-[var(--color-accent)]">{n}</span>
              <p className="mt-2 font-semibold text-white">{t}</p>
              <p className="text-xs text-[var(--color-muted)]">{d}</p>
            </div>
          ))}
        </div>
      </Band>

      {/* Final CTA */}
      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Crea tu universo.</h2>
        <p className="mt-3 text-[var(--color-muted)]">Gratis para empezar. Tu perfil para compartir, siempre gratis.</p>
        <Link href="/register" className="mt-7 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-8 py-3.5 font-semibold text-black transition hover:brightness-110">
          Crear mi Space <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-xs text-[var(--color-muted)]">
          <div className="flex items-center gap-2"><Logo size={20} /> <span>Sonora · {new Date().getFullYear()}</span></div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/tools" className="transition hover:text-white">Herramientas</Link>
            <Link href="/changelog" className="transition hover:text-white">Novedades</Link>
            <Link href="/privacy" className="transition hover:text-white">Privacidad</Link>
            <Link href="/terms" className="transition hover:text-white">Términos</Link>
            <span>No afiliado a Spotify ni a Steam.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Band({ children }: { children: React.ReactNode }) {
  return (
    <section className="border-y border-[var(--color-border)] bg-[var(--color-surface)]/30">
      <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }} className="mx-auto max-w-4xl px-6 py-12">
        {children}
      </motion.div>
    </section>
  );
}
function World({ icon: Icon, color, title, desc }: { icon: typeof Dna; color: string; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-5" style={{ boxShadow: `inset 0 0 80px -55px ${color}` }}>
      <span className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}><Icon className="h-5 w-5" /></span>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="text-sm text-[var(--color-muted)]">{desc}</p>
    </div>
  );
}
function Feature({ icon: Icon, color, title, desc }: { icon: typeof Dna; color: string; title: string; desc: string }) {
  return (
    <motion.div variants={fade} initial="hidden" whileInView="show" viewport={{ once: true }}
      className="rounded-3xl border bg-[var(--color-surface)] p-6 transition hover:border-white/15">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}><Icon className="h-5 w-5" /></span>
      <p className="text-xl font-bold text-white">{title}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-muted)]">{desc}</p>
    </motion.div>
  );
}
