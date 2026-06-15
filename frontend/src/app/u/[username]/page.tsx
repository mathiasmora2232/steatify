'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Headphones, Gamepad2, MapPin, Globe, Lock } from 'lucide-react';
import { api, type WrappedItem, type ChartRecord } from '@/lib/api';
import { computeLevel } from '@/lib/level';
import { Icon, I, archetypeIcon } from '@/lib/icons';
import { CountUp } from '@/components/CountUp';

const BAR = ['#1db954', '#7c5cff', '#ff5d8f'];

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params.username;
  const { data, error, isLoading } = useSWR(username ? `profile:${username}` : null, () =>
    api.publicProfile(username),
  );

  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const title = data?.displayName ?? data?.username ?? 'Sonora';
    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: `${title} · Sonora`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user cancelled share or clipboard blocked — no-op */
    }
  }

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
        <motion.p
          initial={{ opacity: 0.4 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.9 }}
          className="text-sm text-[var(--color-muted)]"
        >
          Cargando perfil…
        </motion.p>
      </main>
    );

  if (error || !data)
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-bg)] px-4">
        <div className="rounded-3xl border bg-[var(--color-surface)] px-8 py-10 text-center">
          <Icon icon={I.locked} className="mx-auto mb-3 h-7 w-7 text-[var(--color-muted)]" />
          <p className="text-lg font-semibold">Perfil no encontrado</p>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Este usuario no existe o cambió su nombre.
          </p>
        </div>
      </main>
    );

  const music = data.music;
  const gaming = data.gaming;
  const level = computeLevel(music?.plays ?? 0, music?.minutes ?? 0, gaming?.hours ?? 0);
  const hasMusic = !!music && (music.plays ?? 0) > 0;
  const hasGaming = !!gaming?.linked;
  const hasUniverse = (music?.minutes ?? 0) > 0 || (gaming?.hours ?? 0) > 0;

  return (
    <main className="min-h-screen bg-[var(--color-bg)] pb-16">
      {/* ─────────────────────────── HERO ─────────────────────────── */}
      <section className="relative">
        {/* Banner */}
        <div
          className="h-44 w-full sm:h-56"
          style={
            data.bannerUrl
              ? {
                  backgroundImage: `url(${data.bannerUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : {
                  background:
                    'radial-gradient(700px 280px at 20% 0%, rgba(29,185,84,0.30), transparent), radial-gradient(700px 280px at 85% 60%, rgba(124,92,255,0.32), transparent), radial-gradient(500px 240px at 60% 100%, rgba(255,93,143,0.22), transparent), var(--color-surface)',
                }
          }
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--color-bg)] to-transparent" />

        <div className="mx-auto -mt-16 max-w-3xl px-4 sm:-mt-20">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-6"
          >
            {/* Avatar with ring + glow */}
            <motion.div variants={fadeUp} className="relative shrink-0">
              <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[var(--color-accent)] via-[var(--color-accent-2)] to-[var(--color-rose)] opacity-60 blur-xl" />
              <div className="relative rounded-full bg-gradient-to-tr from-[var(--color-accent)] via-[var(--color-accent-2)] to-[var(--color-rose)] p-[3px]">
                {data.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.avatarUrl}
                    alt={data.displayName ?? data.username ?? ''}
                    className="h-28 w-28 rounded-full border-4 border-[var(--color-bg)] object-cover sm:h-32 sm:w-32"
                  />
                ) : (
                  <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-[var(--color-bg)] bg-[var(--color-surface-2)] text-4xl font-bold text-[var(--color-muted)] sm:h-32 sm:w-32">
                    {(data.displayName ?? data.username ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </motion.div>

            {/* Identity text */}
            <motion.div variants={fadeUp} className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {data.displayName ?? data.username}
                </h1>
                <LevelBadge level={level.level} rarity={level.rarity} />
              </div>
              <p className="mt-0.5 text-sm text-[var(--color-muted)]">@{data.username}</p>

              {data.personalityName && (
                <p className="mt-2 bg-gradient-to-r from-[var(--color-accent)] via-[var(--color-accent-2)] to-[var(--color-rose)] bg-clip-text text-lg font-bold text-transparent">
                  {data.personalityName}
                </p>
              )}
            </motion.div>

            {/* Share button */}
            <motion.div variants={fadeUp} className="relative shrink-0 pb-1">
              <button
                onClick={share}
                className="flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent-2)] hover:bg-[var(--color-surface-2)]"
              >
                <Icon icon={I.share} className="h-4 w-4" />
                Compartir
              </button>
              {copied && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-semibold text-black"
                >
                  copiado
                </motion.span>
              )}
            </motion.div>
          </motion.div>

          {/* Bio + meta */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-4"
          >
            {data.bio && (
              <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-text)]">
                {data.bio}
              </p>
            )}
            {(data.location || data.website) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)]">
                {data.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" aria-hidden />
                    {data.location}
                  </span>
                )}
                {data.website && (
                  <a
                    href={/^https?:\/\//.test(data.website) ? data.website : `https://${data.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 transition hover:text-[var(--color-accent-2)]"
                  >
                    <Globe className="h-3.5 w-3.5" aria-hidden />
                    {data.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ─────────────────────────── BODY ─────────────────────────── */}
      <div className="mx-auto mt-8 max-w-3xl px-4">
        {data.private ? (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="flex flex-col items-center gap-3 rounded-3xl border bg-[var(--color-surface)] px-6 py-12 text-center"
          >
            <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--color-surface-2)]">
              <Lock className="h-5 w-5 text-[var(--color-muted)]" aria-hidden />
            </div>
            <p className="text-lg font-semibold">Este perfil es privado</p>
            <p className="max-w-sm text-sm text-[var(--color-muted)]">
              {data.displayName ?? data.username} mantiene sus estadísticas en privado.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="space-y-5"
          >
            {/* DNA card */}
            {data.dna && data.dna.archetypes.length > 0 && (
              <motion.div variants={fadeUp}>
                <Card>
                  <CardHeader icon={I.dna} title="Sonora DNA" badge={level.rarity} />
                  <div className="space-y-3.5">
                    {data.dna.archetypes.map((a, i) => {
                      const ArchIcon = archetypeIcon[a.key] ?? I.star;
                      const color = BAR[i % BAR.length];
                      return (
                        <div key={a.key}>
                          <div className="mb-1.5 flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-[var(--color-text)]">
                              <Icon icon={ArchIcon} className="h-4 w-4" style={{ color }} />
                              {a.label}
                            </span>
                            <span className="font-semibold tabular-nums" style={{ color }}>
                              {a.pct}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                            <motion.div
                              initial={{ width: 0 }}
                              whileInView={{ width: `${a.pct}%` }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                              className="h-full rounded-full"
                              style={{ background: color, boxShadow: `0 0 16px ${color}66` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {data.dna.personality && (
                    <p className="mt-4 text-sm italic text-[var(--color-muted)]">
                      “{data.dna.personality}”
                    </p>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Tu universo — music vs gaming */}
            {hasUniverse && (
              <motion.div variants={fadeUp}>
                <div
                  className="relative overflow-hidden rounded-3xl border p-6"
                  style={{
                    background:
                      'radial-gradient(600px 220px at 12% 0%, rgba(29,185,84,0.20), transparent), radial-gradient(600px 220px at 88% 100%, rgba(124,92,255,0.20), transparent), var(--color-surface)',
                  }}
                >
                  <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
                    Tu universo
                  </p>
                  <div className="flex items-center justify-around gap-4 text-center">
                    <div className="flex-1">
                      <p className="text-4xl font-extrabold text-[var(--color-accent)] sm:text-5xl">
                        <CountUp value={music?.minutes ?? 0} />
                      </p>
                      <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
                        <Headphones className="h-4 w-4" aria-hidden />
                        min de música
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="h-14 w-px bg-[var(--color-border)]" />
                      <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted)]">
                        vs
                      </span>
                      <div className="h-14 w-px bg-[var(--color-border)]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-4xl font-extrabold text-[var(--color-accent-2)] sm:text-5xl">
                        <CountUp value={gaming?.hours ?? 0} />
                      </p>
                      <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[var(--color-muted)]">
                        <Gamepad2 className="h-4 w-4" aria-hidden />
                        horas gaming
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Música highlights */}
            {hasMusic && music && (
              <motion.div variants={fadeUp}>
                <Card>
                  <CardHeader icon={I.music} title="Música" />
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <MiniStat label="Minutos" value={music.minutes} />
                    <MiniStat label="Plays" value={music.plays} />
                    <MiniStat label="Artistas" value={music.uniqueArtists} />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Highlight item={music.topArtist} label="Artista top" rounded />
                    <Highlight item={music.songOfPeriod} label="Canción del mes" />
                    <Highlight item={music.newObsession} label="Nueva obsesión" />
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Gaming highlights */}
            {hasGaming && gaming && (
              <motion.div variants={fadeUp}>
                <Card>
                  <CardHeader icon={I.gaming} title="Gaming" />
                  <div className="mb-5 grid grid-cols-3 gap-3">
                    <MiniStat label="Horas" value={gaming.hours} />
                    <MiniStat label="Juegos" value={gaming.games} />
                    <MiniStat label="Backlog" value={gaming.backlog} />
                  </div>
                  {gaming.topGame && (
                    <div className="relative overflow-hidden rounded-2xl border">
                      {gaming.topGame.headerUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={gaming.topGame.headerUrl}
                          alt={gaming.topGame.name}
                          className="h-36 w-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-accent-2)]">
                          Más jugado
                        </p>
                        <p className="truncate text-lg font-bold text-white">
                          {gaming.topGame.name}
                        </p>
                        <p className="text-xs text-white/70">
                          {gaming.topGame.hours.toLocaleString()} h
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            {/* Hall of Fame */}
            {data.hallOfFame && data.hallOfFame.length > 0 && (
              <motion.div variants={fadeUp}>
                <Card>
                  <CardHeader icon={I.star} title="Hall of Fame" badge="Leyendas" />
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {data.hallOfFame.map((h) => (
                      <div key={h.trackId} className="text-center">
                        <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-xl bg-[var(--color-surface-2)]">
                          {h.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={h.imageUrl} alt={h.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="grid h-full w-full place-items-center"><Icon icon={I.music} className="h-6 w-6 text-[var(--color-muted)]" /></div>
                          )}
                          <span className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[9px] font-bold text-[#f5b301]">★</span>
                        </div>
                        <p className="mt-1.5 truncate text-xs font-semibold text-white">{h.name}</p>
                        <p className="truncate text-[10px] text-[var(--color-muted)]">{h.plays} plays · {h.enteredYear}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            )}

            {/* Récords */}
            {data.records && (data.records.mostPlayed || data.records.mostNocturnal || data.records.biggestLoop || data.records.oldestAlive) && (
              <motion.div variants={fadeUp}>
                <Card>
                  <CardHeader icon={I.achievements} title="Récords personales" />
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <RecordRow label="Mayor obsesión" rec={data.records.mostPlayed} color="#f59e0b" />
                    <RecordRow label="Más nocturna" rec={data.records.mostNocturnal} color="#7c5cff" />
                    <RecordRow label="Mayor loop" rec={data.records.biggestLoop} color="#1db954" />
                    <RecordRow label="Más antigua viva" rec={data.records.oldestAlive} color="#38bdf8" />
                  </div>
                </Card>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Footer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-10 text-center text-xs text-[var(--color-muted)]"
        >
          hecho con{' '}
          <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text font-bold text-transparent">
            Sonora
          </span>
        </motion.p>
      </div>
    </main>
  );
}

/* ─────────────────────────── pieces ─────────────────────────── */

function LevelBadge({ level, rarity }: { level: number; rarity: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent-2)]/40 bg-[var(--color-accent-2)]/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--color-accent-2)]">
      <Icon icon={I.star} className="h-3.5 w-3.5" />
      Lv {level} · {rarity}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-2)] p-6 transition hover:border-[var(--color-accent-2)]/40">
      {children}
    </div>
  );
}

function CardHeader({
  icon,
  title,
  badge,
}: {
  icon: typeof I.dna;
  title: string;
  badge?: string;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">
        <Icon icon={icon} className="h-4 w-4" />
        {title}
      </p>
      {badge && (
        <span className="rounded-full bg-[var(--color-accent-2)]/15 px-3 py-1 text-xs font-medium text-[var(--color-accent-2)]">
          {badge}
        </span>
      )}
    </div>
  );
}

function RecordRow({ label, rec, color }: { label: string; rec: ChartRecord | null; color: string }) {
  if (!rec) return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-[var(--color-bg)]/40 p-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[var(--color-surface-2)]">
        {rec.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={rec.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center"><Icon icon={I.music} className="h-4 w-4 text-[var(--color-muted)]" /></div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>{label}</p>
        <p className="truncate text-sm font-semibold text-white">{rec.name}</p>
        <p className="truncate text-[11px] text-[var(--color-muted)]">{rec.metric}</p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-bg)]/40 p-3 text-center">
      <p className="text-xl font-bold tabular-nums">
        <CountUp value={value} />
      </p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function Highlight({
  item,
  label,
  rounded,
}: {
  item: WrappedItem | null;
  label: string;
  rounded?: boolean;
}) {
  return (
    <div className="group flex items-center gap-3 rounded-2xl border bg-[var(--color-bg)]/40 p-3 transition hover:bg-[var(--color-surface-2)] sm:flex-col sm:items-start sm:gap-2">
      <div
        className={`relative h-14 w-14 shrink-0 overflow-hidden bg-[var(--color-surface-2)] sm:h-20 sm:w-20 ${
          rounded ? 'rounded-full' : 'rounded-xl'
        }`}
      >
        {item?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <Icon icon={I.music} className="h-5 w-5 text-[var(--color-muted)]" />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">
          {label}
        </p>
        <p className="truncate text-sm font-bold text-[var(--color-text)]">
          {item?.name ?? '—'}
        </p>
        {item?.subtitle && (
          <p className="truncate text-xs text-[var(--color-muted)]">{item.subtitle}</p>
        )}
      </div>
    </div>
  );
}
