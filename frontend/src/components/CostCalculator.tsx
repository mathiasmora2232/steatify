'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

function verdict(perHour: number): { label: string; color: string } {
  if (perHour <= 0.5) return { label: 'Inversión legendaria 🏆', color: '#fbbf24' };
  if (perHour <= 2) return { label: 'Muy rentable 💚', color: '#1db954' };
  if (perHour <= 5) return { label: 'Razonable 🙂', color: '#38bdf8' };
  if (perHour <= 15) return { label: 'Ojo con el gasto 😬', color: '#ff8a00' };
  return { label: 'Cada hora es oro 💸', color: '#ff5d8f' };
}

export function CostCalculator() {
  const [spent, setSpent] = useState('');
  const [hours, setHours] = useState('');
  const s = parseFloat(spent) || 0;
  const h = parseFloat(hours) || 0;
  const perHour = h > 0 ? s / h : 0;
  const show = s > 0 && h > 0;
  const v = verdict(perHour);

  return (
    <div className="rounded-3xl border bg-[var(--color-surface)] p-6 sm:p-8">
      <div className="space-y-4">
        <Field label="¿Cuánto has gastado en juegos? ($)" value={spent} onChange={setSpent} placeholder="Ej. 1200" />
        <Field label="¿Cuántas horas has jugado en total?" value={hours} onChange={setHours} placeholder="Ej. 1500" />
      </div>

      {show && (
        <div className="mt-6 rounded-2xl border bg-[var(--color-bg)]/40 p-5 text-center" style={{ boxShadow: `inset 0 0 80px -55px ${v.color}` }}>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu costo por hora</p>
          <p className="my-1 text-5xl font-black" style={{ color: v.color }}>${perHour.toFixed(2)}<span className="text-xl text-[var(--color-muted)]">/h</span></p>
          <p className="text-sm font-semibold" style={{ color: v.color }}>{v.label}</p>
          <p className="mt-2 text-xs text-[var(--color-muted)]">
            ${s.toLocaleString()} ÷ {h.toLocaleString()} h. {perHour <= 2 ? 'El cine cuesta más por hora 🎬' : 'Igual valió cada momento.'}
          </p>
        </div>
      )}

      <div className="mt-6 text-center">
        <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110">
          Conecta Steam y lo calculo solo <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-xs text-[var(--color-muted)]">Steatify saca esto automático con tu biblioteca real — valor, precio/hora, joyas ocultas.</p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm text-[var(--color-text)]">{label}</span>
      <input
        type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} min="0"
        className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)]/40 px-4 py-3 text-lg text-white outline-none transition focus:border-[var(--color-accent)]"
      />
    </label>
  );
}
