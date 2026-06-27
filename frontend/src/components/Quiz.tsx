'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, RotateCcw, Share2 } from 'lucide-react';
import type { Quiz } from '@/lib/quizzes';

export function QuizRunner({ quiz }: { quiz: Quiz }) {
  const [step, setStep] = useState(0);
  const [tally, setTally] = useState<Record<string, number>>({});
  const [copied, setCopied] = useState(false);

  const done = step >= quiz.questions.length;
  const result = done ? winner() : null;

  function winner() {
    let best = quiz.results[0];
    let max = -1;
    for (const r of quiz.results) {
      const v = tally[r.key] ?? 0;
      if (v > max) { max = v; best = r; }
    }
    return best;
  }

  function pick(to: string) {
    setTally((t) => ({ ...t, [to]: (t[to] ?? 0) + 1 }));
    setStep((s) => s + 1);
  }
  function restart() {
    setTally({});
    setStep(0);
  }
  async function share() {
    const text = result ? `Soy ${result.emoji} ${result.title} en Sonora. ¿Y tú?` : 'Sonora';
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) await navigator.share({ title: 'Sonora', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    } catch { /* cancelled */ }
  }

  if (result) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-3xl border bg-[var(--color-surface)] p-8 text-center"
        style={{ boxShadow: `inset 0 0 120px -60px ${result.color}` }}>
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${result.color}, transparent)` }} />
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu resultado</p>
        <div className="my-3 text-6xl">{result.emoji}</div>
        <h2 className="text-3xl font-black" style={{ color: result.color }}>{result.title}</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--color-text)]">{result.desc}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110">
            Verlo de verdad con mis datos <ArrowRight className="h-4 w-4" />
          </Link>
          <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent-2)]">
            <Share2 className="h-4 w-4" /> {copied ? '¡Copiado!' : 'Compartir'}
          </button>
          <button onClick={restart} className="inline-flex items-center gap-1.5 rounded-full px-3 py-3 text-sm text-[var(--color-muted)] transition hover:text-white">
            <RotateCcw className="h-4 w-4" /> Repetir
          </button>
        </div>
        <p className="mt-4 text-xs text-[var(--color-muted)]">Esto es solo un quiz. Sonora calcula tu arquetipo real con tu historial.</p>
      </motion.div>
    );
  }

  const question = quiz.questions[step];
  const pct = Math.round((step / quiz.questions.length) * 100);
  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-6 sm:p-8">
      <div className="mb-5">
        <div className="mb-2 flex justify-between text-xs text-[var(--color-muted)]">
          <span>Pregunta {step + 1} de {quiz.questions.length}</span>
          <span>{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
          <motion.div className="h-full rounded-full bg-[var(--color-accent)]" animate={{ width: `${pct}%` }} />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
          <h2 className="mb-5 text-xl font-bold text-white sm:text-2xl">{question.q}</h2>
          <div className="space-y-2.5">
            {question.options.map((o, i) => (
              <button key={i} onClick={() => pick(o.to)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl border bg-[var(--color-bg)]/40 px-4 py-3.5 text-left text-[15px] text-[var(--color-text)] transition hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-2)]">
                {o.label}
                <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
