'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Check, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { PLANS, type PlanKey } from '@/lib/plans';

export default function PlansPage() {
  const me = useSWR('me', api.me);
  const current = (me.data?.plan ?? 'FREE') as PlanKey;
  const [yearly, setYearly] = useState(true);

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <div className="mb-2 text-center">
        <h1 className="text-3xl font-black tracking-tight">Lleva tu universo más lejos</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Free responde <span className="text-[var(--color-text)]">"qué soy ahora"</span>. Plus,{' '}
          <span className="text-[var(--color-text)]">"toda mi historia"</span>. Pro,{' '}
          <span className="text-[var(--color-text)]">"mi universo como plataforma"</span>.
        </p>
      </div>

      {/* Monthly / yearly toggle */}
      <div className="mb-8 flex items-center justify-center gap-3">
        <button onClick={() => setYearly(false)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${!yearly ? 'bg-[var(--color-surface-2)] text-white' : 'text-[var(--color-muted)]'}`}>Mensual</button>
        <button onClick={() => setYearly(true)} className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${yearly ? 'bg-[var(--color-surface-2)] text-white' : 'text-[var(--color-muted)]'}`}>
          Anual <span className="text-[var(--color-accent)]">−25%</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {PLANS.map((p) => {
          const isCurrent = p.key === current;
          const price = yearly ? p.priceYear : p.priceMonth;
          return (
            <div
              key={p.key}
              className={`relative flex flex-col rounded-3xl border p-6 ${p.highlight ? 'border-[var(--color-accent-2)]/50 bg-[var(--color-surface)]' : 'bg-[var(--color-surface)]'}`}
              style={p.highlight ? { boxShadow: `inset 0 0 80px -50px ${p.accent}` } : undefined}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-black" style={{ background: p.accent }}>
                  Recomendado
                </span>
              )}
              <p className="text-lg font-black" style={{ color: p.accent }}>{p.name}</p>
              <p className="text-xs text-[var(--color-muted)]">{p.tagline}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-4xl font-black text-white">${price}</span>
                <span className="pb-1 text-sm text-[var(--color-muted)]">{p.priceMonth === 0 ? '' : yearly ? '/año' : '/mes'}</span>
              </div>

              <ul className="mt-5 flex-1 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-text)]">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: p.accent }} /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <span className="block rounded-full border bg-[var(--color-surface-2)]/40 py-2.5 text-center text-sm font-semibold text-[var(--color-muted)]">Tu plan actual</span>
                ) : p.key === 'FREE' ? (
                  <span className="block rounded-full border py-2.5 text-center text-sm text-[var(--color-muted)]">Incluido</span>
                ) : (
                  <button
                    disabled
                    title="Los pagos llegan pronto"
                    className="flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold text-black opacity-90"
                    style={{ background: p.accent }}
                  >
                    <Sparkles className="h-4 w-4" /> Próximamente
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-[var(--color-muted)]">
        Los pagos aún no están activos — estamos preparando la pasarela. El perfil público y compartir siguen siendo gratis para siempre.
      </p>
    </div>
  );
}
