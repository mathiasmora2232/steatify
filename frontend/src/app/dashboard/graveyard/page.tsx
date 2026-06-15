'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Skull, RotateCcw, Music2, Crown, HeartCrack, Moon, Hourglass, type LucideIcon } from 'lucide-react';
import { api, type GraveCard, type MusicEvent } from '@/lib/api';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function fmtMonth(ym: string | null): string | null {
  if (!ym) return null;
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

export default function GraveyardPage() {
  const { data, isLoading } = useSWR('graveyard:categories', api.graveyardCategories);

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Skull className="h-7 w-7 text-[var(--color-rose)]" /> Cementerio musical
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Canciones que amabas y dejaste atrás, ordenadas por su historia. Algunas vuelven de la tumba.
        </p>
      </header>

      {isLoading ? (
        <div className="h-96 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
      ) : !data ? null : (
        <div className="space-y-8">
          {/* 🧟 Resucitados */}
          {data.resurrected.length > 0 && (
            <Section title="Resucitados" subtitle="Volvieron de entre los muertos" icon={RotateCcw} color="#fbbf24">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.resurrected.map((e, i) => (
                  <Resurrection key={e.id} e={e} delay={i * 0.03} />
                ))}
              </div>
            </Section>
          )}

          {/* ⏳ En peligro */}
          {data.endangered.length > 0 && (
            <Section title="En peligro" subtitle="A punto de apagarse — aún las puedes salvar" icon={Hourglass} color="#fb923c">
              <Grid cards={data.endangered} color="#fb923c" verb="callando hace" />
            </Section>
          )}

          {/* 👑 Antiguos reyes */}
          {data.kings.length > 0 && (
            <Section title="Antiguos reyes" subtitle="Fueron tu #1 de un mes" icon={Crown} color="#fbbf24">
              <Grid cards={data.kings} color="#fbbf24" verb="durmiendo hace" showPeak />
            </Section>
          )}

          {/* 💔 Amores pasajeros */}
          {data.flings.length > 0 && (
            <Section title="Amores pasajeros" subtitle="Mucho en poco tiempo, y desaparecieron" icon={HeartCrack} color="#ff5d8f">
              <Grid cards={data.flings} color="#ff5d8f" verb="durmiendo hace" showPeak />
            </Section>
          )}

          {/* 🪦 Leyendas dormidas */}
          {data.legends.length > 0 && (
            <Section title="Leyendas dormidas" subtitle="Antes fueron importantes" icon={Moon} color="#7c5cff">
              <Grid cards={data.legends} color="#7c5cff" verb="durmiendo hace" showPeak />
            </Section>
          )}

          {data.legends.length + data.kings.length + data.flings.length + data.endangered.length === 0 && (
            <p className="rounded-3xl border bg-[var(--color-surface)] p-8 text-center text-[var(--color-muted)]">
              Tu cementerio está vacío… por ahora. Se llenará cuando dejes de escuchar lo que repetías.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, subtitle, icon: Icon, color, children }: { title: string; subtitle: string; icon: LucideIcon; color: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest" style={{ color }}>
          <Icon className="h-4 w-4" /> {title}
        </h2>
        <p className="text-xs text-[var(--color-muted)]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function Grid({ cards, color, verb, showPeak }: { cards: GraveCard[]; color: string; verb: string; showPeak?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((t, i) => (
        <Grave key={t.trackId} t={t} color={color} verb={verb} showPeak={showPeak} delay={i * 0.03} />
      ))}
    </div>
  );
}

function Grave({ t, color, verb, showPeak, delay }: { t: GraveCard; color: string; verb: string; showPeak?: boolean; delay: number }) {
  const peak = fmtMonth(t.peakMonth);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ y: -2 }}>
      <Link
        href={`/dashboard/song/${t.trackId}`}
        className="group flex gap-3 rounded-2xl border bg-[var(--color-surface)] p-3 transition hover:border-[var(--color-accent)]/40"
      >
        <div className="relative shrink-0">
          {t.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={t.imageUrl} alt="" className="h-16 w-16 rounded-md object-cover grayscale transition group-hover:grayscale-0" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-[var(--color-surface-2)]">
              <Music2 className="h-5 w-5 text-[var(--color-muted)]" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{t.name}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">{t.artist ?? '—'}</p>
          <div className="mt-1.5 space-y-0.5 text-[11px] text-[var(--color-muted)]">
            {showPeak && peak && (
              <p>🔥 Peak: <span className="text-[var(--color-text)]">{peak}</span> · {t.peakPlays}▶</p>
            )}
            <p>💤 {verb} <span className="text-[var(--color-rose)]">{t.daysSince} días</span></p>
            <p className="flex items-center gap-1.5">
              Prob. regreso
              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full" style={{ width: `${t.returnProb}%`, background: color }} />
              </span>
              <span className="font-bold tabular-nums" style={{ color }}>{t.returnProb}%</span>
            </p>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

function Resurrection({ e, delay }: { e: MusicEvent; delay: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Link
        href={e.entityId ? `/dashboard/song/${e.entityId}` : '#'}
        className="group flex items-center gap-3 overflow-hidden rounded-2xl border border-[#fbbf24]/30 p-3 transition hover:border-[#fbbf24]/60"
        style={{ background: 'radial-gradient(300px 100px at 0% 0%, rgba(251,191,36,0.12), var(--color-surface))' }}
      >
        {e.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.imageUrl} alt="" className="h-12 w-12 rounded-md object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-[#fbbf24]/15">
            <RotateCcw className="h-5 w-5 text-[#fbbf24]" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide text-[#fbbf24]">
            <RotateCcw className="h-3 w-3" /> Resurrección
          </p>
          <p className="truncate text-sm text-white">{e.body}</p>
        </div>
      </Link>
    </motion.div>
  );
}
