'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Headphones, Gamepad2 } from 'lucide-react';
import { Logo } from '@/components/Logo';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* ambient glow (mobile + base) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundImage: 'radial-gradient(700px 400px at 20% -10%, rgba(52,224,161,0.16), transparent), radial-gradient(700px 400px at 90% 110%, rgba(168,85,247,0.16), transparent)' }} />

      {/* Left — form */}
      <div className="relative flex min-h-screen flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Inicio
        </Link>
        <div className="flex flex-1 items-center">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mx-auto w-full max-w-sm">
            <Logo size={48} className="mb-5" />
            <h1 className="text-3xl font-black tracking-tight">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[var(--color-muted)]">{subtitle}</p>}
            <div className="mt-7">{children}</div>
          </motion.div>
        </div>
      </div>

      {/* Right — brand panel (desktop) */}
      <div className="relative hidden overflow-hidden border-l border-[var(--color-border)] lg:flex"
        style={{ backgroundImage: 'radial-gradient(600px 400px at 30% 10%, rgba(124,92,255,0.22), transparent), radial-gradient(600px 400px at 80% 90%, rgba(52,224,161,0.18), transparent), linear-gradient(160deg,#0c0e14,#08090c)' }}>
        <motion.div aria-hidden className="absolute -right-20 top-10 h-72 w-72 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)' }}
          animate={{ y: [0, 20, 0] }} transition={{ duration: 8, repeat: Infinity }} />
        <div className="relative z-10 flex flex-col justify-center px-14">
          <h2 className="text-4xl font-black leading-tight">
            Tu universo digital,<br />
            <span className="bg-gradient-to-r from-[#34e0a1] via-[#3b82f6] to-[#a855f7] bg-clip-text text-transparent">en una identidad.</span>
          </h2>

          {/* glass identity card */}
          <motion.div initial={{ opacity: 0, y: 16, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -2 }} transition={{ delay: 0.2, duration: 0.6 }}
            className="mt-8 w-72 rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl"
            style={{ boxShadow: '0 30px 80px -40px rgba(124,92,255,0.6)' }}>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full p-[2px]" style={{ background: 'linear-gradient(135deg,#34e0a1,#a855f7)' }}>
                <div className="grid h-full w-full place-items-center rounded-full bg-[var(--color-bg)] text-lg font-black">E</div>
              </div>
              <div>
                <p className="font-black text-white">Echo</p>
                <p className="text-xs italic text-[#fbbf24]">« The Loop Master »</p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#7c5cff]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#a78bfa]"><Star className="h-3 w-3" /> LV 71 · Mítico</span>
              <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[10px] font-bold text-white">📦 Coleccionista</span>
            </div>
            <div className="mt-4 space-y-2">
              <Bar icon={Headphones} color="#1db954" pct={82} />
              <Bar icon={Gamepad2} color="#7c5cff" pct={64} />
            </div>
          </motion.div>

          <ul className="mt-8 space-y-2 text-sm text-[var(--color-muted)]">
            <li>✨ Tu música y tu gaming, en una sola identidad</li>
            <li>🎴 Una carta de perfil para presumir</li>
            <li>🔒 Acceso de solo lectura. No vendemos tus datos.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}

function Bar({ icon: Icon, color, pct }: { icon: typeof Star; color: string; pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color }} />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
