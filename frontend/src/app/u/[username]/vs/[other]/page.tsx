'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { ArrowLeft, Music2, Gamepad2, Sparkles, Heart, Users } from 'lucide-react';
import { api } from '@/lib/api';

export default function ComparePage() {
  const { username, other } = useParams<{ username: string; other: string }>();
  const { data, error, isLoading } = useSWR(
    username && other ? `compare:${username}:${other}` : null,
    () => api.compareSpaces(username, other),
  );

  if (isLoading)
    return <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] text-sm text-[var(--color-muted)]">Calculando compatibilidad…</main>;
  if (error || !data)
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-4 text-center">
        <div className="rounded-3xl border bg-[var(--color-surface)] px-8 py-10">
          <p className="text-lg font-semibold text-white">No se pudo comparar</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Alguno de los perfiles no existe o es privado.</p>
          <Link href={`/u/${username}`} className="mt-4 inline-block text-sm text-[var(--color-accent)]">← Volver al perfil</Link>
        </div>
      </main>
    );

  const { a, b, compatibility, breakdown, shared, contrast } = data;
  const ring = `conic-gradient(var(--color-accent) ${compatibility * 3.6}deg, rgba(255,255,255,0.08) 0deg)`;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] pb-16">
      <div className="mx-auto max-w-3xl px-4 pt-6">
        <Link href={`/u/${username}`} className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--color-muted)] transition hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Volver
        </Link>

        {/* Hero: A vs B + compatibility ring */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border p-8"
          style={{ background: 'radial-gradient(700px 300px at 50% -10%, rgba(29,185,84,0.18), transparent), linear-gradient(160deg,#0c0e14,#08090c)' }}
        >
          <p className="mb-6 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[var(--color-accent)]">
            <Sparkles className="h-4 w-4" /> Compare Spaces
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            <Avatar v={a} />
            {/* Compatibility ring */}
            <div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full sm:h-36 sm:w-36" style={{ background: ring }}>
              <div className="grid h-[82%] w-[82%] place-items-center rounded-full bg-[var(--color-bg)]">
                <div className="text-center">
                  <p className="text-3xl font-black text-[var(--color-accent)] sm:text-4xl">{compatibility}%</p>
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">compatibles</p>
                </div>
              </div>
            </div>
            <Avatar v={b} />
          </div>
        </motion.section>

        {/* Breakdown */}
        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Bar icon={Music2} label="Música" value={breakdown.music} color="#1db954" />
          <Bar icon={Gamepad2} label="Gaming" value={breakdown.gaming} color="#7c5cff" />
          <Bar icon={Heart} label="Comportamiento" value={breakdown.behavior} color="#ff5d8f" />
        </section>

        {/* Shared */}
        {(shared.artists.length > 0 || shared.games.length > 0 || shared.genres.length > 0) && (
          <section className="mt-5 rounded-3xl border bg-[var(--color-surface)] p-6">
            <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
              <Users className="h-4 w-4 text-[var(--color-accent)]" /> Lo que ambos aman
            </h2>
            {shared.artists.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs text-[var(--color-muted)]">Artistas en común</p>
                <div className="flex flex-wrap gap-3">
                  {shared.artists.map((ar) => (
                    <div key={ar.name} className="flex items-center gap-2 rounded-full border bg-[var(--color-surface-2)]/40 py-1 pl-1 pr-3">
                      {ar.img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ar.img} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-surface-2)]"><Music2 className="h-3.5 w-3.5 text-[var(--color-muted)]" /></span>
                      )}
                      <span className="text-sm font-medium text-white">{ar.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {shared.games.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs text-[var(--color-muted)]">Juegos en común</p>
                <div className="flex flex-wrap gap-2">
                  {shared.games.map((g) => (
                    <span key={g.appId} className="rounded-full border bg-[var(--color-surface-2)]/40 px-3 py-1 text-sm text-white">{g.name}</span>
                  ))}
                </div>
              </div>
            )}
            {shared.genres.length > 0 && (
              <div>
                <p className="mb-2 text-xs text-[var(--color-muted)]">Géneros en común</p>
                <div className="flex flex-wrap gap-2">
                  {shared.genres.map((g) => (
                    <span key={g} className="rounded-full bg-[var(--color-accent)]/12 px-3 py-1 text-xs font-medium capitalize text-[var(--color-accent)]">{g}</span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Contrast */}
        {contrast && (
          <section className="mt-5 rounded-3xl border bg-[var(--color-surface)] p-6 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">Pero son distintos</p>
            <div className="flex items-center justify-center gap-4">
              <div>
                <p className="text-sm text-[var(--color-muted)]">{a.displayName ?? a.username}</p>
                <p className="text-lg font-black text-[var(--color-accent)]">{contrast.a}</p>
              </div>
              <span className="text-xs text-[var(--color-muted)]">vs</span>
              <div>
                <p className="text-sm text-[var(--color-muted)]">{b.displayName ?? b.username}</p>
                <p className="text-lg font-black text-[#7c5cff]">{contrast.b}</p>
              </div>
            </div>
          </section>
        )}

        <p className="mt-10 text-center text-xs text-[var(--color-muted)]">
          hecho con <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text font-bold text-transparent">Steatify</span>
        </p>
      </div>
    </main>
  );
}

function Avatar({ v }: { v: { username: string | null; displayName: string | null; avatarUrl: string | null; topArchetype: { label: string; emoji: string } | null } }) {
  return (
    <Link href={`/u/${v.username}`} className="flex flex-col items-center gap-2 text-center">
      <div className="rounded-full bg-gradient-to-tr from-[var(--color-accent)] to-[var(--color-accent-2)] p-[2px]">
        {v.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={v.avatarUrl} alt="" className="h-16 w-16 rounded-full border-2 border-[var(--color-bg)] object-cover sm:h-20 sm:w-20" />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-full border-2 border-[var(--color-bg)] bg-[var(--color-surface-2)] text-2xl font-bold text-white sm:h-20 sm:w-20">
            {(v.displayName ?? v.username ?? '?').charAt(0).toUpperCase()}
          </div>
        )}
      </div>
      <p className="max-w-[90px] truncate text-sm font-bold text-white">{v.displayName ?? v.username}</p>
      {v.topArchetype && <p className="text-[11px] text-[var(--color-muted)]">{v.topArchetype.label}</p>}
    </Link>
  );
}

function Bar({ icon: Icon, label, value, color }: { icon: typeof Music2; label: string; value: number; color: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }}><Icon className="h-3.5 w-3.5" /></span>
          {label}
        </span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}
