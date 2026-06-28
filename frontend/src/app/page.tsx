'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Dna, Layers, IdCard, Sparkles, Headphones, Gamepad2, ArrowRight } from 'lucide-react';
import { loginUrl } from '@/lib/api';
import { GuestButton } from '@/components/GuestButton';
import { Logo } from '@/components/Logo';
import { Waitlist } from '@/components/Waitlist';
import { CountUp } from '@/components/CountUp';
import { Waveform } from '@/components/Waveform';

const fade = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

const ROW_A = [
  { e: '🎵', t: 'Bad Bunny', c: '#1db954' },
  { e: '🎮', t: 'Terraria · 158h', c: '#7c5cff' },
  { e: '🔁', t: '240 veces en repeat', c: '#ff5d8f' },
  { e: '🌙', t: 'Era Nocturna', c: '#a78bfa' },
  { e: '🎵', t: 'Mac Miller', c: '#1db954' },
  { e: '🏆', t: 'Nuevo récord', c: '#fbbf24' },
  { e: '🎮', t: 'Hades', c: '#38bdf8' },
  { e: '🎧', t: '124.500 min', c: '#34e0a1' },
];
const ROW_B = [
  { e: '🧭', t: 'Modo Explorador', c: '#38bdf8' },
  { e: '🎮', t: 'Elden Ring · 96h', c: '#7c5cff' },
  { e: '🎵', t: 'TV Girl', c: '#1db954' },
  { e: '🕰️', t: 'Aniversario', c: '#ff5d8f' },
  { e: '📦', t: '740 obsesiones', c: '#fbbf24' },
  { e: '🎵', t: 'Feid', c: '#1db954' },
  { e: '🎮', t: 'Stardew Valley', c: '#7c5cff' },
  { e: '👻', t: 'Un fantasma volvió', c: '#a78bfa' },
];

export default function LandingPage() {
  return (
    <main className="relative overflow-hidden">
      {/* ambient glow + floating orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(900px 480px at 15% -10%, rgba(52,224,161,0.16), transparent), radial-gradient(900px 480px at 90% 10%, rgba(168,85,247,0.16), transparent), radial-gradient(700px 400px at 50% 120%, rgba(59,130,246,0.14), transparent)' }} />
        <motion.div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(52,224,161,0.35), transparent 70%)' }}
          animate={{ y: [0, 40, 0], x: [0, 20, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute right-[10%] top-[20%] h-80 w-80 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.32), transparent 70%)' }}
          animate={{ y: [0, -50, 0], x: [0, -25, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
        <motion.div className="absolute bottom-[8%] left-1/2 h-72 w-72 rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.30), transparent 70%)' }}
          animate={{ y: [0, -30, 0], scale: [1, 1.15, 1] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
      </div>

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
          <span className="animate-gradient bg-gradient-to-r from-[#34e0a1] via-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">contado por tus datos.</span>
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
          <Link href="/demo" className="inline-flex items-center gap-2 rounded-full border px-7 py-3.5 font-medium transition hover:border-[var(--color-accent)]">
            Ver demo
          </Link>
          <GuestButton />
        </motion.div>
        <motion.div variants={fade} initial="hidden" animate="show" transition={{ delay: 0.28 }} className="mt-4 flex items-center gap-4 text-sm">
          <a href={loginUrl} className="text-[var(--color-accent)] hover:underline">Continuar con Spotify</a>
          <span className="text-[var(--color-muted)]">·</span>
          <span className="text-[var(--color-muted)]">No vendemos tus datos.</span>
        </motion.div>

        {/* Floating identity card preview */}
        <motion.div initial={{ opacity: 0, y: 30, rotate: 2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ delay: 0.35, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 w-full max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur-xl"
          style={{ boxShadow: '0 40px 100px -50px rgba(124,92,255,0.7)' }}>
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg,#34e0a1,#a855f7)' }}>
              <div className="grid h-full w-full place-items-center rounded-full bg-[var(--color-bg)] text-lg font-black">E</div>
            </div>
            <div>
              <p className="font-black text-white">Echo</p>
              <p className="text-xs italic text-[#fbbf24]">« The Loop Master »</p>
            </div>
            <Link href="/demo" className="ml-auto rounded-full bg-white/5 px-3 py-1 text-[11px] text-[var(--color-muted)] transition hover:text-white">Ver demo →</Link>
          </div>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-[#7c5cff]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#a78bfa]">LV 71 · Mítico</span>
            <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white">📦 Coleccionista</span>
          </div>
          {/* Sonando ahora */}
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 p-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#1db954]/30 to-[#7c5cff]/30 text-base">🎧</div>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-[var(--color-accent)]">
                <span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-accent)] opacity-75" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" /></span>
                Sonando ahora
              </p>
              <p className="truncate text-sm font-semibold text-white">Self Care — Mac Miller</p>
            </div>
            <div className="h-8 w-16 shrink-0"><Waveform active bars={16} /></div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {([[124500, 'min música', '#1db954'], [1480, 'h gaming', '#a855f7'], [612, 'artistas', '#3b82f6']] as const).map(([v, l, c]) => (
              <div key={l} className="rounded-xl bg-black/20 p-2">
                <p className="text-lg font-black tabular-nums" style={{ color: c }}><CountUp value={v} /></p>
                <p className="text-[9px] uppercase tracking-wide text-[var(--color-muted)]">{l}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Marquee — música + gaming en movimiento */}
      <section className="relative -mt-2 mb-4 space-y-3 py-4" aria-hidden>
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--color-bg)] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--color-bg)] to-transparent" />
        <MarqueeRow items={ROW_A} />
        <MarqueeRow items={ROW_B} reverse />
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

      {/* Preview del producto (parallax) */}
      <ProductPreview />

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

      {/* Waitlist */}
      <Band>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-2xl font-bold">Mantente al día</h2>
          <p className="mt-1 mb-5 max-w-md text-sm text-[var(--color-muted)]">
            Novedades, acceso anticipado y cuando se abra el cupo. Sin spam, lo prometemos.
          </p>
          <Waitlist source="landing" />
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
            <Link href="/roadmap" className="transition hover:text-white">Roadmap</Link>
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

function ProductPreview() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y1 = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const y2 = useTransform(scrollYProgress, [0, 1], [10, -90]);
  const y3 = useTransform(scrollYProgress, [0, 1], [90, -20]);
  const dna: [string, number, string][] = [['🔁 Looper', 42, '#1db954'], ['🌙 Nocturno', 28, '#7c5cff'], ['📦 Coleccionista', 18, '#ff5d8f']];

  return (
    <section ref={ref} className="mx-auto max-w-5xl px-6 py-14">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-black tracking-tight">Mira tu vida en datos</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Una probada de lo que Sonora arma contigo.</p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <motion.div style={{ y: y1 }} className="rounded-3xl border bg-[var(--color-surface)] p-5" >
          <p className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" /> Sonando ahora
          </p>
          <p className="font-bold text-white">Self Care</p>
          <p className="text-xs text-[var(--color-muted)]">Mac Miller</p>
          <div className="mt-3 h-10"><Waveform active bars={28} /></div>
        </motion.div>

        <motion.div style={{ y: y2 }} className="rounded-3xl border bg-[var(--color-surface)] p-5">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Tu ADN</p>
          {dna.map(([l, p, c]) => (
            <div key={l} className="mb-2.5">
              <div className="mb-1 flex justify-between text-xs"><span className="text-white">{l}</span><span style={{ color: c }}>{p}%</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${p}%`, background: c }} /></div>
            </div>
          ))}
        </motion.div>

        <motion.div style={{ y: y3 }} className="flex flex-col justify-center rounded-3xl border bg-[var(--color-surface)] p-5 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Este año</p>
          <p className="my-1 text-5xl font-black text-[var(--color-accent)]"><CountUp value={124500} /></p>
          <p className="text-xs text-[var(--color-muted)]">min de música · 612 artistas · 1.480 h de juego</p>
        </motion.div>
      </div>
    </section>
  );
}

function MarqueeRow({ items, reverse }: { items: { e: string; t: string; c: string }[]; reverse?: boolean }) {
  const row = [...items, ...items];
  return (
    <div className="flex overflow-hidden">
      <div className={`flex w-max shrink-0 gap-3 pr-3 ${reverse ? 'animate-marquee-rev' : 'animate-marquee'}`}>
        {row.map((it, i) => (
          <span key={i} className="flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm backdrop-blur">
            <span style={{ color: it.c }}>{it.e}</span>
            <span className="font-medium text-white/90">{it.t}</span>
          </span>
        ))}
      </div>
    </div>
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
      whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group rounded-3xl border bg-[var(--color-surface)] p-6 transition-colors hover:border-white/20"
      style={{ boxShadow: `inset 0 0 90px -70px ${color}` }}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}><Icon className="h-5 w-5" /></span>
      <p className="text-xl font-bold text-white">{title}</p>
      <p className="mt-1 text-[15px] leading-relaxed text-[var(--color-muted)]">{desc}</p>
    </motion.div>
  );
}
