'use client';

import { motion } from 'framer-motion';
import {
  Headphones, Gamepad2, Compass, Flame, Trophy, Skull, Disc3, Music2, Star, Clock, Sparkles, MapPin, Globe,
} from 'lucide-react';
import type { PublicProfile } from '@/lib/api';
import { computeLevel } from '@/lib/level';
import { useImageColor } from '@/lib/useImageColor';
import { CountUp } from './CountUp';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MIX_COLORS = ['#1db954', '#7c5cff', '#ff5d8f', '#38bdf8'];

/**
 * Perfil 2.0 — the user's "digital identity card" (not a second dashboard).
 * Hero → Sonora Passport → Vitrinas → Universo → Colecciones → Timeline.
 * `actions` is the button row (Follow/Compare/Share or Edit), so the same body
 * works standalone (/@user) and inside the app (/dashboard/profile).
 */
export function ProfileBody({ data, actions }: { data: PublicProfile; actions?: React.ReactNode }) {
  const music = data.music;
  const gaming = data.gaming;
  const level = computeLevel(music?.plays ?? 0, music?.minutes ?? 0, gaming?.hours ?? 0);
  const sinceYear = new Date(data.createdAt).toLocaleDateString('es', { month: 'long', year: 'numeric' });
  const topImg = music?.topArtist?.imageUrl ?? data.hallOfFame?.[0]?.imageUrl ?? null;
  const accent = useImageColor(topImg, '#7c5cff');

  return (
    <div className="space-y-6">
      {/* ── HERO — fondo derivado de tus datos ── */}
      <section
        className="relative overflow-hidden rounded-3xl border"
        style={{ background: `radial-gradient(700px 280px at 25% -10%, ${accent}40, transparent), radial-gradient(600px 260px at 90% 30%, ${accent}22, transparent), linear-gradient(160deg,#0c0e14,#08090c)` }}
      >
        {topImg && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={topImg} alt="" aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-72 w-72 rounded-full object-cover opacity-25 blur-3xl" />
        )}
        <div className="relative flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:items-end sm:text-left">
          <div className="rounded-full p-[3px]" style={{ background: `linear-gradient(135deg, ${accent}, var(--color-accent))` }}>
            {data.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.avatarUrl} alt="" className="h-28 w-28 rounded-full border-4 border-[var(--color-bg)] object-cover" />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-[var(--color-bg)] bg-[var(--color-surface-2)] text-4xl font-black text-white">
                {(data.displayName ?? data.username ?? '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-4xl font-black tracking-tight text-white">{data.displayName ?? data.username}</h1>
            <p className="text-sm text-[var(--color-muted)]">@{data.username}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide" style={{ background: `${accent}26`, color: accent }}>
                <Star className="h-3.5 w-3.5" /> Lv {level.level} · {level.rarity}
              </span>
              {data.personality && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-sm font-bold text-white">
                  {data.personality.emoji} {data.personality.label}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs text-[var(--color-muted)]">Miembro desde {sinceYear}</p>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2 self-center sm:self-end">{actions}</div>}
        </div>
        {(data.bio || data.location || data.website) && (
          <div className="relative -mt-2 px-8 pb-6 text-center sm:text-left">
            {data.bio && <p className="max-w-xl text-[15px] leading-relaxed text-[var(--color-text)]">{data.bio}</p>}
            {(data.location || data.website) && (
              <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] sm:justify-start">
                {data.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {data.location}</span>}
                {data.website && (
                  <a href={/^https?:\/\//.test(data.website) ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition hover:text-[var(--color-accent-2)]">
                    <Globe className="h-3.5 w-3.5" /> {data.website.replace(/^https?:\/\//, '')}
                  </a>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {data.private ? (
        <div className="rounded-3xl border bg-[var(--color-surface)] px-6 py-12 text-center text-[var(--color-muted)]">
          Este perfil es privado.
        </div>
      ) : (
        <>
          {/* ── SONORA PASSPORT ── */}
          {data.mix && data.mix.length > 0 && (
            <Section icon={Sparkles} title="Sonora Passport" accent={accent}>
              <div className="grid gap-5 sm:grid-cols-[1fr_1.4fr]">
                <div className="rounded-2xl border border-white/5 bg-black/20 p-4 text-center">
                  <p className="text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Clase</p>
                  <p className="mt-1 text-xl font-black text-white">{data.personality?.emoji} {data.personality?.label}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Rareza</p>
                  <p className="text-lg font-bold" style={{ color: accent }}>{level.rarity}</p>
                  <p className="mt-3 text-[10px] uppercase tracking-widest text-[var(--color-muted)]">Desde</p>
                  <p className="text-sm text-white">{sinceYear}</p>
                </div>
                <div className="space-y-3">
                  {data.mix.map((m, i) => (
                    <div key={m.key}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="text-[var(--color-text)]">{m.emoji} {m.label}</span>
                        <span className="font-bold tabular-nums" style={{ color: MIX_COLORS[i % MIX_COLORS.length] }}>{m.pct}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${m.pct}%` }} viewport={{ once: true }} transition={{ duration: 0.8, delay: i * 0.1 }} className="h-full rounded-full" style={{ background: MIX_COLORS[i % MIX_COLORS.length], boxShadow: `0 0 14px ${MIX_COLORS[i % MIX_COLORS.length]}66` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Section>
          )}

          {/* ── VITRINAS (editables: usa la elección del usuario, si la hay) ── */}
          {(() => {
            const sc = data.showcase ?? {};
            const song = sc.song;
            const game = sc.game;
            const artist = sc.artist;
            return (
              <div>
                <H2 icon={Trophy} accent={accent}>Mis vitrinas</H2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Vitrina kicker="Canción inmortal" icon={Flame} color="#ff5d8f"
                    img={song?.image ?? music?.songOfPeriod?.imageUrl ?? data.hallOfFame?.[0]?.imageUrl ?? null}
                    name={song?.name ?? music?.songOfPeriod?.name ?? data.hallOfFame?.[0]?.name ?? '—'}
                    sub={song?.sub ?? (music?.songOfPeriod?.plays ? `${music.songOfPeriod.plays} reproducciones` : null)} />
                  <Vitrina kicker="Juego legendario" icon={Gamepad2} color="#7c5cff"
                    img={game?.image ?? gaming?.topGame?.headerUrl ?? null}
                    name={game?.name ?? gaming?.topGame?.name ?? '—'}
                    sub={game?.sub ?? (gaming?.topGame?.hours ? `${gaming.topGame.hours.toLocaleString()} horas` : null)} wide />
                  <Vitrina kicker="Artista histórico" icon={Music2} color="#1db954"
                    img={artist?.image ?? music?.topArtist?.imageUrl ?? null}
                    name={artist?.name ?? music?.topArtist?.name ?? '—'}
                    sub={artist?.sub ?? (music?.minutes ? `${music.minutes.toLocaleString()} minutos` : null)} round />
                </div>
              </div>
            );
          })()}

          {/* ── MI UNIVERSO ── */}
          <Section icon={Compass} title="Mi universo" accent={accent}>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <UniStat icon={Headphones} color="#1db954" value={music?.minutes ?? 0} label="min de música" />
              <UniStat icon={Music2} color="#1db954" value={music?.uniqueArtists ?? 0} label="artistas" />
              <UniStat icon={Gamepad2} color="#7c5cff" value={gaming?.hours ?? 0} label="horas gaming" />
              <UniStat icon={Disc3} color="#7c5cff" value={gaming?.games ?? 0} label="juegos" />
              {data.exploration != null && <UniStat icon={Compass} color="#38bdf8" value={data.exploration} suffix="%" label="explorado" />}
              <UniStat icon={Clock} color="#fbbf24" value={music?.plays ?? 0} label="reproducciones" />
            </div>
          </Section>

          {/* ── COLECCIONES ── */}
          {data.collections && (
            <div>
              <H2 icon={Star} accent={accent}>Colecciones</H2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Coleccion icon={Flame} color="#ff5d8f" label="Obsesiones" value={data.collections.obsesiones} note="canciones quemadas" />
                <Coleccion icon={Gamepad2} color="#7c5cff" label="Mundos conquistados" value={data.collections.mundos} note="juegos jugados" />
                <Coleccion icon={Trophy} color="#fbbf24" label="Leyendas" value={data.collections.leyendas} note="logros" />
                <Coleccion icon={Skull} color="#94a3b8" label="Cementerio" value={data.collections.cementerio} note="recuerdos olvidados" />
              </div>
            </div>
          )}

          {/* ── TIMELINE DE VIDA ── */}
          {data.timeline && data.timeline.length > 0 && (
            <Section icon={Clock} title="Línea temporal" accent={accent}>
              <ol className="relative ml-1 space-y-4 border-l border-[var(--color-border)] pl-5">
                {data.timeline.map((t, i) => {
                  const d = new Date(t.date);
                  return (
                    <motion.li key={i} initial={{ opacity: 0, x: -6 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="relative">
                      <span className="absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                      <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: accent }}>{MONTHS[d.getMonth()]} {d.getFullYear()}</p>
                      <p className="text-sm font-semibold text-white">{t.title}</p>
                    </motion.li>
                  );
                })}
              </ol>
            </Section>
          )}
        </>
      )}
    </div>
  );
}

/* ── pieces ── */
function Section({ icon: Icon, title, accent, children }: { icon: typeof Star; title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-[var(--color-surface)] p-6">
      <H2 icon={Icon} accent={accent}>{title}</H2>
      {children}
    </section>
  );
}
function H2({ icon: Icon, accent, children }: { icon: typeof Star; accent: string; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
      <Icon className="h-4 w-4" style={{ color: accent }} /> {children}
    </h2>
  );
}
function Vitrina({ kicker, icon: Icon, color, img, name, sub, round, wide }: { kicker: string; icon: typeof Star; color: string; img: string | null; name: string; sub?: string | null; round?: boolean; wide?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-[var(--color-surface)] p-4" style={{ boxShadow: `inset 0 0 50px -32px ${color}` }}>
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <p className="mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color }}><Icon className="h-3.5 w-3.5" /> {kicker}</p>
      <div className="flex items-center gap-3">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" className={`shrink-0 object-cover shadow-lg ${round ? 'h-16 w-16 rounded-full' : wide ? 'h-12 w-[86px] rounded-lg' : 'h-16 w-16 rounded-xl'}`} />
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-xl bg-[var(--color-surface-2)]"><Icon className="h-6 w-6 text-[var(--color-muted)]" /></div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{name}</p>
          {sub && <p className="truncate text-xs" style={{ color }}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}
function UniStat({ icon: Icon, color, value, label, suffix }: { icon: typeof Star; color: string; value: number; label: string; suffix?: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-bg)]/40 p-4 text-center">
      <span className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }}><Icon className="h-4 w-4" /></span>
      <p className="text-2xl font-black tabular-nums" style={{ color }}><CountUp value={value} />{suffix}</p>
      <p className="text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
    </div>
  );
}
function Coleccion({ icon: Icon, color, label, value, note }: { icon: typeof Star; color: string; label: string; value: number; note: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-4" style={{ boxShadow: `inset 0 0 40px -30px ${color}` }}>
      <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${color}1f`, color }}><Icon className="h-4.5 w-4.5" /></span>
      <p className="text-2xl font-black tabular-nums text-white"><CountUp value={value} /></p>
      <p className="text-xs font-semibold text-white">{label}</p>
      <p className="text-[10px] text-[var(--color-muted)]">{note}</p>
    </div>
  );
}
