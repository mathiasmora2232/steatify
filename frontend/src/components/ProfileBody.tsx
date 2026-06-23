'use client';

import { motion } from 'framer-motion';
import {
  Headphones, Gamepad2, Compass, Flame, Trophy, Skull, Disc3, Music2, Star, Clock, Sparkles, MapPin, Globe,
} from 'lucide-react';
import type { PublicProfile, ShowcaseItem } from '@/lib/api';
import { computeLevel } from '@/lib/level';
import { titleById, RARITY_COLOR } from '@/lib/titles';
import { BADGES, type BadgeCtx } from '@/lib/badges';
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
  const hidden = new Set(data.showcase?.hidden ?? []); // sections the user chose to hide

  return (
    <div className="space-y-6">
      {/* ── HERO — fondo derivado de tus datos ── */}
      <section className="relative overflow-hidden rounded-3xl border bg-[var(--color-surface)]">
        {/* Banner — tu portada, o un fondo derivado de tu artista #1 */}
        <div
          className="relative h-32 w-full sm:h-48"
          style={
            data.bannerUrl
              ? { backgroundImage: `url(${data.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : { background: `radial-gradient(700px 300px at 20% -30%, ${accent}66, transparent), radial-gradient(620px 280px at 95% 140%, var(--color-accent-2), transparent), linear-gradient(160deg,#10131b,#0a0b0f)` }
          }
        >
          {!data.bannerUrl && topImg && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={topImg} alt="" aria-hidden className="pointer-events-none absolute right-8 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full object-cover opacity-30 blur-2xl" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[var(--color-surface)] to-transparent" />
        </div>

        {/* Identidad — avatar sobrepuesto al banner (estilo Discord/Steam) */}
        <div className="relative -mt-12 px-5 pb-5 sm:-mt-14 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-end sm:text-left">
              <div className="shrink-0 rounded-full p-[3px] shadow-2xl" style={{ background: `linear-gradient(135deg, ${accent}, var(--color-accent-2))` }}>
                {data.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.avatarUrl} alt="" className="h-28 w-28 rounded-full border-4 border-[var(--color-surface)] object-cover" />
                ) : (
                  <div className="grid h-28 w-28 place-items-center rounded-full border-4 border-[var(--color-surface)] bg-[var(--color-surface-2)] text-4xl font-black text-white">
                    {(data.displayName ?? data.username ?? '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 pb-1">
                <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{data.displayName ?? data.username}</h1>
                {(() => {
                  const t = titleById(data.showcase?.title);
                  return t ? <p className="text-sm font-bold italic" style={{ color: RARITY_COLOR[t.rarity] }}>« {t.label} »</p> : null;
                })()}
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
              </div>
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2 self-center sm:self-end sm:pb-1">{actions}</div>}
          </div>

          <div className="mt-3 text-center sm:text-left">
            {data.bio && <p className="max-w-2xl text-[15px] leading-relaxed text-[var(--color-text)]">{data.bio}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[var(--color-muted)] sm:justify-start">
              <span>Miembro desde {sinceYear}</span>
              {data.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {data.location}</span>}
              {data.website && (
                <a href={/^https?:\/\//.test(data.website) ? data.website : `https://${data.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 transition hover:text-[var(--color-accent-2)]">
                  <Globe className="h-3.5 w-3.5" /> {data.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── ESTADO ACTUAL (perfil dinámico) ── */}
      {!data.private && data.mood && !hidden.has('estado') && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 overflow-hidden rounded-3xl border bg-[var(--color-surface)] px-5 py-4"
          style={{ boxShadow: `inset 0 0 60px -40px ${accent}` }}
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl" style={{ background: `${accent}1f` }}>
            {data.mood.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">Ahora mismo está en</p>
            <p className="text-lg font-black text-white">{data.mood.label}</p>
            <p className="truncate text-xs text-[var(--color-muted)]">{data.mood.detail}</p>
          </div>
        </motion.div>
      )}

      {data.private ? (
        <div className="rounded-3xl border bg-[var(--color-surface)] px-6 py-12 text-center text-[var(--color-muted)]">
          Este perfil es privado.
        </div>
      ) : (
        <>
          {/* ── SONORA PASSPORT ── */}
          {!hidden.has('passport') && data.mix && data.mix.length > 0 && (
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

          {/* ── INSIGNIAS (con rareza global) ── */}
          {!hidden.has('insignias') && (() => {
            const ctx: BadgeCtx = {
              level: level.level,
              plays: music?.plays ?? 0,
              minutes: music?.minutes ?? 0,
              hours: gaming?.hours ?? 0,
              obsesiones: data.collections?.obsesiones ?? 0,
              leyendas: data.collections?.leyendas ?? 0,
              mundos: data.collections?.mundos ?? 0,
              exploration: data.exploration ?? 0,
            };
            const sorted = [...BADGES].sort((a, b) => Number(b.earned(ctx)) - Number(a.earned(ctx)));
            const earnedN = BADGES.filter((b) => b.earned(ctx)).length;
            return (
              <Section icon={Star} title={`Insignias · ${earnedN}/${BADGES.length}`} accent={accent}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {sorted.map((b) => {
                    const got = b.earned(ctx);
                    const c = RARITY_COLOR[b.rarity];
                    return (
                      <div
                        key={b.id}
                        title={got ? `${b.label} · ${b.rarity}` : `Bloqueada · ${b.req}`}
                        className={`flex flex-col items-center gap-1 rounded-2xl border p-3 text-center ${got ? '' : 'opacity-40 grayscale'}`}
                        style={got ? { borderColor: `${c}55`, boxShadow: `inset 0 0 40px -28px ${c}` } : undefined}
                      >
                        <span className="grid h-11 w-11 place-items-center rounded-xl text-2xl" style={{ background: got ? `${c}1f` : 'var(--color-surface-2)' }}>{b.emoji}</span>
                        <p className="text-xs font-bold leading-tight text-white">{b.label}</p>
                        {got ? (
                          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: c }}>{b.rarity} · {b.share}</p>
                        ) : (
                          <p className="text-[10px] text-[var(--color-muted)]">🔒 {b.req}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Section>
            );
          })()}

          {/* ── VITRINAS estilo Steam (multi-ítem) o, si no curó, las automáticas ── */}
          {!hidden.has('vitrinas') && (() => {
            const items = data.showcase?.items ?? [];
            if (items.length > 0) {
              return (
                <div>
                  <H2 icon={Trophy} accent={accent}>Mi vitrina</H2>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {items.map((it, i) => <ShowcaseCard key={`${it.type}:${it.id}:${i}`} item={it} accent={accent} />)}
                  </div>
                </div>
              );
            }
            const sc = data.showcase ?? {};
            return (
              <div>
                <H2 icon={Trophy} accent={accent}>Mis vitrinas</H2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <Vitrina kicker="Canción inmortal" icon={Flame} color="#ff5d8f"
                    img={sc.song?.image ?? music?.songOfPeriod?.imageUrl ?? data.hallOfFame?.[0]?.imageUrl ?? null}
                    name={sc.song?.name ?? music?.songOfPeriod?.name ?? data.hallOfFame?.[0]?.name ?? '—'}
                    sub={sc.song?.sub ?? (music?.songOfPeriod?.plays ? `${music.songOfPeriod.plays} reproducciones` : null)} />
                  <Vitrina kicker="Juego legendario" icon={Gamepad2} color="#7c5cff"
                    img={sc.game?.image ?? gaming?.topGame?.headerUrl ?? null}
                    name={sc.game?.name ?? gaming?.topGame?.name ?? '—'}
                    sub={sc.game?.sub ?? (gaming?.topGame?.hours ? `${gaming.topGame.hours.toLocaleString()} horas` : null)} wide />
                  <Vitrina kicker="Artista histórico" icon={Music2} color="#1db954"
                    img={sc.artist?.image ?? music?.topArtist?.imageUrl ?? null}
                    name={sc.artist?.name ?? music?.topArtist?.name ?? '—'}
                    sub={sc.artist?.sub ?? (music?.minutes ? `${music.minutes.toLocaleString()} minutos` : null)} round />
                </div>
              </div>
            );
          })()}

          {/* ── MI UNIVERSO ── */}
          {!hidden.has('universo') && (
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
          )}

          {/* ── COLECCIONES ── */}
          {!hidden.has('colecciones') && data.collections && (
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
          {!hidden.has('timeline') && data.timeline && data.timeline.length > 0 && (
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
const SHOWCASE_META: Record<ShowcaseItem['type'], { icon: typeof Star; color: string; label: string; round?: boolean }> = {
  song: { icon: Flame, color: '#ff5d8f', label: 'Canción' },
  artist: { icon: Music2, color: '#1db954', label: 'Artista', round: true },
  album: { icon: Disc3, color: '#a855f7', label: 'Álbum' },
  game: { icon: Gamepad2, color: '#7c5cff', label: 'Juego' },
};
function ShowcaseCard({ item, accent }: { item: ShowcaseItem; accent: string }) {
  const m = SHOWCASE_META[item.type] ?? SHOWCASE_META.song;
  const Icon = m.icon;
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-[var(--color-surface)] p-3" style={{ boxShadow: `inset 0 0 50px -34px ${m.color}` }}>
      <span className="absolute inset-x-0 top-0 h-0.5" style={{ background: `linear-gradient(90deg, ${m.color}, transparent)` }} />
      <div className="relative mb-2 aspect-square w-full overflow-hidden rounded-xl bg-[var(--color-surface-2)]">
        {item.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.image} alt="" className={`h-full w-full object-cover transition duration-300 group-hover:scale-105 ${m.round ? 'rounded-full' : ''}`} />
        ) : (
          <div className="grid h-full w-full place-items-center"><Icon className="h-7 w-7 text-[var(--color-muted)]" /></div>
        )}
      </div>
      <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide" style={{ color: m.color }}><Icon className="h-3 w-3" /> {m.label}</p>
      <p className="truncate text-sm font-bold text-white">{item.name}</p>
      {item.sub && <p className="truncate text-[11px] text-[var(--color-muted)]">{item.sub}</p>}
    </div>
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
