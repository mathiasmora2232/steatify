'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { Pencil, ExternalLink, Share2 } from 'lucide-react';
import { api } from '@/lib/api';
import { ProfileBody } from '@/components/ProfileBody';

/** Your own identity card, inside the Sonora app layout (sidebar). */
export default function MyProfilePage() {
  const me = useSWR('me', api.me);
  const username = me.data?.username;
  const profile = useSWR(username ? `profile:${username}` : null, () => api.publicProfile(username!));

  if (me.data && !username) {
    return (
      <div className="mx-auto max-w-md rounded-3xl border bg-[var(--color-surface)] p-8 text-center">
        <p className="text-lg font-semibold">Aún no tienes un nombre de usuario</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">Elige tu @handle para activar tu perfil público.</p>
        <Link href="/dashboard/settings" className="mt-4 inline-block rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-black">Elegir username</Link>
      </div>
    );
  }

  if (!profile.data) {
    return <p className="py-20 text-center text-sm text-[var(--color-muted)]">Cargando tu perfil…</p>;
  }

  async function share() {
    const url = `${window.location.origin}/u/${username}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Mi Sonora', url });
      else await navigator.clipboard.writeText(url);
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="mx-auto max-w-4xl pb-12">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi perfil</h1>
          <p className="text-sm text-[var(--color-muted)]">Tu carta de identidad generada por tus datos.</p>
        </div>
        <Link href={`/u/${username}`} target="_blank" className="hidden items-center gap-1.5 rounded-full border bg-[var(--color-surface)] px-3.5 py-2 text-xs font-medium text-[var(--color-muted)] transition hover:text-white sm:flex">
          Ver público <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ProfileBody
        data={profile.data}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/dashboard/settings" className="flex items-center gap-1.5 rounded-full border bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent)]">
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Link>
            <button onClick={share} className="flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110">
              <Share2 className="h-4 w-4" /> Compartir
            </button>
          </div>
        }
      />
    </div>
  );
}
