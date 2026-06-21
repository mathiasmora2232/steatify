'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { GitCompareArrows, ArrowRight, Share2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Icon, I } from '@/lib/icons';
import { ProfileBody } from '@/components/ProfileBody';

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
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
      /* user cancelled share or clipboard blocked */
    }
  }

  if (isLoading)
    return (
      <main className="grid min-h-screen place-items-center bg-[var(--color-bg)]">
        <motion.p initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ repeat: Infinity, repeatType: 'reverse', duration: 0.9 }} className="text-sm text-[var(--color-muted)]">
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
          <p className="mt-1 text-sm text-[var(--color-muted)]">Este usuario no existe o cambió su nombre.</p>
        </div>
      </main>
    );

  return (
    <main className="relative min-h-screen bg-[var(--color-bg)] pb-16">
      {/* Top bar — keeps the public profile connected to the app */}
      <div className="sticky top-0 z-20 border-b border-white/5 bg-[var(--color-bg)]/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/dashboard" className="text-base font-bold tracking-tight text-white">Sonora</Link>
          <Link href="/dashboard/settings" className="rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/80 transition hover:text-white">Mi cuenta</Link>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-5">
        <ProfileBody
          data={data}
          actions={
            <div className="relative flex items-center gap-2">
              <FollowButton username={data.username ?? ''} />
              <CompareButton onCompare={(other) => router.push(`/u/${username}/vs/${other}`)} />
              <button onClick={share} className="flex items-center gap-1.5 rounded-full border bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent-2)]">
                <Share2 className="h-4 w-4" /> Compartir
              </button>
              {copied && (
                <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="absolute left-1/2 top-full mt-2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-2.5 py-1 text-xs font-semibold text-black">copiado</motion.span>
              )}
            </div>
          }
        />

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-10 text-center text-xs text-[var(--color-muted)]">
          hecho con <span className="bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)] bg-clip-text font-bold text-transparent">Sonora</span>
        </motion.p>
      </div>
    </main>
  );
}

/* ── action pieces ── */
function FollowButton({ username }: { username: string }) {
  const me = useSWR('me', () => api.me().catch(() => null));
  const status = useSWR(username ? `follow:${username}` : null, () => api.followStatus(username));
  const [busy, setBusy] = useState(false);
  const isOwn = me.data?.username === username;
  const isMe = !!me.data;
  const following = status.data?.following;

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (following) await api.unfollow(username);
      else await api.follow(username);
      await status.mutate();
    } catch {
      /* not logged in or error */
    } finally {
      setBusy(false);
    }
  }

  if (isOwn) {
    return (
      <span className="rounded-full border bg-[var(--color-surface)] px-3 py-2 text-xs text-[var(--color-muted)]">
        {status.data?.followers ?? 0} seguidores
      </span>
    );
  }
  if (!isMe) return null;

  return (
    <button onClick={toggle} disabled={busy} className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${following ? 'border bg-[var(--color-surface)] text-[var(--color-text)] hover:border-[var(--color-rose)]/50 hover:text-[var(--color-rose)]' : 'bg-[var(--color-accent)] text-black hover:brightness-110'}`}>
      {following ? 'Siguiendo' : '+ Seguir'}
    </button>
  );
}

function CompareButton({ onCompare }: { onCompare: (other: string) => void }) {
  const [open, setOpen] = useState(false);
  const [other, setOther] = useState('');
  function go() {
    const u = other.trim().replace(/^@/, '').toLowerCase();
    if (u) onCompare(u);
  }
  if (!open)
    return (
      <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 px-4 py-2 text-sm font-medium text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/15">
        <GitCompareArrows className="h-4 w-4" /> Comparar
      </button>
    );
  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--color-accent)]/40 bg-[var(--color-surface)] py-1 pl-3 pr-1">
      <span className="text-sm text-[var(--color-muted)]">@</span>
      <input autoFocus value={other} onChange={(e) => setOther(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} placeholder="usuario" className="w-24 bg-transparent text-sm text-white outline-none" />
      <button onClick={go} className="grid h-7 w-7 place-items-center rounded-full bg-[var(--color-accent)] text-black"><ArrowRight className="h-4 w-4" /></button>
    </div>
  );
}
