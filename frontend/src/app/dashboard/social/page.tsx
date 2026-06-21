'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { Users, GitCompareArrows, Activity, Flame, Repeat, Trophy, Sparkles, Music2 } from 'lucide-react';
import { api, type FeedItem, type FollowUser } from '@/lib/api';

const EVENT_ICON: Record<string, { icon: typeof Flame; color: string }> = {
  FIRST_TIME: { icon: Sparkles, color: '#38bdf8' },
  COMEBACK: { icon: Repeat, color: '#a78bfa' },
  NEW_OBSESSION: { icon: Flame, color: '#ff5d8f' },
  NEW_RECORD: { icon: Trophy, color: '#fbbf24' },
  ANNIVERSARY: { icon: Music2, color: '#1db954' },
};

export default function SocialPage() {
  const me = useSWR('me', api.me);
  const following = useSWR('social:following', api.following);
  const feed = useSWR('social:feed', () => api.socialFeed(40));
  const myUsername = me.data?.username;

  return (
    <div className="mx-auto max-w-5xl pb-12">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Social</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">Sigue a otros y mira cómo evolucionan sus universos.</p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Following */}
        <section className="lg:col-span-1">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Users className="h-4 w-4 text-[var(--color-accent)]" /> Siguiendo
          </h2>
          <div className="space-y-2">
            {(following.data ?? []).length === 0 ? (
              <div className="rounded-2xl border bg-[var(--color-surface)] p-5 text-sm text-[var(--color-muted)]">
                Aún no sigues a nadie. Entra al perfil de alguien (<span className="text-[var(--color-text)]">/u/usuario</span>) y dale <span className="text-[var(--color-accent)]">Seguir</span>.
              </div>
            ) : (
              (following.data ?? []).map((u) => <FollowRow key={u.username} u={u} myUsername={myUsername} />)
            )}
          </div>
        </section>

        {/* Feed */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">
            <Activity className="h-4 w-4 text-[var(--color-accent)]" /> Actividad
          </h2>
          <div className="rounded-3xl border bg-[var(--color-surface)] p-2">
            {(feed.data ?? []).length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                Cuando sigas a alguien, su actividad (obsesiones, regresos, récords) aparecerá aquí — sin que nadie tenga que publicar nada.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--color-border)]">
                {(feed.data ?? []).map((e, i) => <FeedRow key={i} e={e} delay={i * 0.03} />)}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function FollowRow({ u, myUsername }: { u: FollowUser; myUsername?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-[var(--color-surface)] p-3">
      <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        {u.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--color-surface-2)] font-bold">
            {(u.displayName ?? u.username ?? '?').charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">{u.displayName ?? u.username}</p>
          <p className="truncate text-xs text-[var(--color-muted)]">@{u.username}</p>
        </div>
      </Link>
      {myUsername && (
        <Link
          href={`/u/${myUsername}/vs/${u.username}`}
          className="grid h-8 w-8 place-items-center rounded-full border border-[var(--color-accent)]/40 text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/10"
          title="Comparar"
        >
          <GitCompareArrows className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function FeedRow({ e, delay }: { e: FeedItem; delay: number }) {
  const cfg = EVENT_ICON[e.type] ?? { icon: Sparkles, color: '#8b8f9c' };
  const Icon = cfg.icon;
  const when = new Date(e.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short' });
  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay }}
      className="flex items-center gap-3 px-3 py-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${cfg.color}1f`, color: cfg.color }}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white">
          <Link href={`/u/${e.user.username}`} className="font-semibold hover:underline">{e.user.displayName ?? e.user.username}</Link>{' '}
          <span className="text-[var(--color-muted)]">{e.title}</span>
        </p>
      </div>
      <span className="shrink-0 text-[11px] text-[var(--color-muted)]">{when}</span>
    </motion.li>
  );
}
