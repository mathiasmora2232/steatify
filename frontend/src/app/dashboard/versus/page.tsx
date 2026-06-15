'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { GitCompareArrows, Crown, Music2, Disc3, Clock, Users, ArrowRight, Mic2 } from 'lucide-react';
import { api, type PeriodSnapshot } from '@/lib/api';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ymLabel = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** Last `n` months as YYYY-MM, newest first. */
function recentMonths(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(1);
  for (let i = 0; i < n; i++) {
    out.push(d.toISOString().slice(0, 7));
    d.setUTCMonth(d.getUTCMonth() - 1);
  }
  return out;
}

export default function VersusPage() {
  const months = useMemo(() => recentMonths(48), []);
  const nowYm = months[0];
  const yearAgo = months[12] ?? months[months.length - 1];
  const [a, setA] = useState(yearAgo);
  const [b, setB] = useState(nowYm);

  const { data, isLoading } = useSWR(`versus:${a}:${b}`, () => api.versus(a, b), { keepPreviousData: true });

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <GitCompareArrows className="h-7 w-7 text-[var(--color-accent)]" /> Tú vs Tú
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Cómo cambiaste entre dos momentos de tu vida musical.</p>
      </div>

      {/* Pickers */}
      <div className="mb-6 flex items-center justify-center gap-3">
        <MonthSelect months={months} value={a} onChange={setA} />
        <span className="text-sm font-bold text-[var(--color-muted)]">VS</span>
        <MonthSelect months={months} value={b} onChange={setB} />
      </div>

      {isLoading && !data ? (
        <div className="h-96 animate-pulse rounded-3xl border bg-[var(--color-surface)]" />
      ) : data ? (
        <>
          {/* Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <PeriodCol p={data.a} accent="#7c5cff" />
            <PeriodCol p={data.b} accent="#1db954" />
          </div>

          {/* Narrative */}
          {data.a.hasData && data.b.hasData && (
            <Narrative a={data.a} b={data.b} />
          )}
        </>
      ) : null}
    </div>
  );
}

function MonthSelect({ months, value, onChange }: { months: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border bg-[var(--color-surface)] px-4 py-2 text-sm font-semibold text-white outline-none focus:border-[var(--color-accent)] [&>option]:bg-[var(--color-surface)]"
    >
      {months.map((m) => (
        <option key={m} value={m}>{ymLabel(m)}</option>
      ))}
    </select>
  );
}

function PeriodCol({ p, accent }: { p: PeriodSnapshot; accent: string }) {
  if (!p.hasData) {
    return (
      <div className="rounded-3xl border bg-[var(--color-surface)] p-6 text-center">
        <p className="text-sm font-semibold text-white">{ymLabel(p.ym)}</p>
        <p className="mt-8 text-sm text-[var(--color-muted)]">Sin actividad este mes 🌫️</p>
      </div>
    );
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border p-6"
      style={{ background: `radial-gradient(360px 160px at 50% 0%, ${accent}1f, transparent), var(--color-surface)` }}
    >
      <p className="text-center text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">{ymLabel(p.ym)}</p>
      <p className="mt-2 text-center text-2xl font-black" style={{ color: accent }}>{p.archetype.emoji} {p.archetype.label}</p>

      <div className="mt-5 space-y-4">
        <Item label="Artista #1" icon={Crown} accent={accent}>
          {p.topArtist ? <Link href={`/dashboard/artist/${p.topArtist.id}`} className="font-bold text-white hover:underline">{p.topArtist.name}</Link> : '—'}
        </Item>
        <Item label="Canción #1" icon={Music2} accent={accent} image={p.topTrack?.image} fallback={Music2}>
          {p.topTrack ? <Link href={`/dashboard/song/${p.topTrack.id}`} className="font-bold text-white hover:underline">{p.topTrack.name}</Link> : '—'}
        </Item>
        <Item label="Álbum #1" icon={Disc3} accent={accent} image={p.topAlbum?.image} fallback={Disc3}>
          <span className="font-bold text-white">{p.topAlbum?.name ?? '—'}</span>
        </Item>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-[var(--color-border)] pt-4 text-center">
        <Mini icon={Clock} value={`${Math.round(p.minutes / 60)}h`} label="horas" />
        <Mini icon={Music2} value={p.plays.toLocaleString()} label="plays" />
        <Mini icon={Users} value={p.uniqueArtists.toLocaleString()} label="artistas" />
      </div>
    </motion.div>
  );
}

function Item({ label, icon: Icon, accent, image, fallback: Fallback, children }: { label: string; icon: typeof Crown; accent: string; image?: string | null; fallback?: typeof Crown; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
        <Icon className="h-3 w-3" /> {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        {Fallback && (image !== undefined) && (
          image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-8 w-8 shrink-0 rounded object-cover" />
          ) : (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[var(--color-surface-2)]"><Fallback className="h-4 w-4 text-[var(--color-muted)]" /></div>
          )
        )}
        <p className="min-w-0 truncate text-sm">{children}</p>
      </div>
    </div>
  );
}

function Mini({ icon: Icon, value, label }: { icon: typeof Clock; value: string; label: string }) {
  return (
    <div>
      <Icon className="mx-auto mb-1 h-3.5 w-3.5 text-[var(--color-muted)]" />
      <p className="text-sm font-bold tabular-nums text-white">{value}</p>
      <p className="text-[10px] text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function Narrative({ a, b }: { a: PeriodSnapshot; b: PeriodSnapshot }) {
  const rows: { label: string; from: string; to: string }[] = [];
  if (a.topArtist?.name !== b.topArtist?.name) rows.push({ label: 'Artista #1', from: a.topArtist?.name ?? '—', to: b.topArtist?.name ?? '—' });
  if (a.archetype.label !== b.archetype.label) rows.push({ label: 'Personalidad', from: `${a.archetype.emoji} ${a.archetype.label}`, to: `${b.archetype.emoji} ${b.archetype.label}` });
  const minDelta = a.minutes > 0 ? Math.round(((b.minutes - a.minutes) / a.minutes) * 100) : null;
  const artDelta = b.uniqueArtists - a.uniqueArtists;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-3xl border bg-[var(--color-surface)] p-6">
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">De {ymLabel(a.ym)} a {ymLabel(b.ym)}…</p>
      {rows.length > 0 ? (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.label} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-24 shrink-0 text-xs text-[var(--color-muted)]">{r.label}</span>
              <span className="text-[var(--color-muted)]">{r.from}</span>
              <ArrowRight className="h-3.5 w-3.5 text-[var(--color-accent)]" />
              <span className="font-bold text-white">{r.to}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--color-muted)]">Tu esencia se mantuvo, pero los detalles cambiaron.</p>
      )}
      <p className="mt-3 text-sm text-[var(--color-text)]">
        {minDelta != null && <>Escuchaste un <b style={{ color: minDelta >= 0 ? '#1db954' : '#ff5d8f' }}>{minDelta >= 0 ? '+' : ''}{minDelta}%</b> {minDelta >= 0 ? 'más' : 'menos'} música</>}
        {artDelta !== 0 && <> y {artDelta > 0 ? 'descubriste' : 'redujiste a'} <b className="text-white">{Math.abs(artDelta)}</b> artistas {artDelta > 0 ? 'más' : 'menos'}</>}.
      </p>
    </motion.div>
  );
}
