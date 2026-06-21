'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { api } from '@/lib/api';
import { computeLevel } from '@/lib/level';
import { navIcon } from '@/lib/icons';
import { GlobalSearch } from './GlobalSearch';

const NAV = [
  { href: '/dashboard', label: 'Resumen' },
  { href: '/dashboard/wrapped', label: 'Wrapped' },
  { href: '/dashboard/dna', label: 'ADN Musical' },
  { href: '/dashboard/rankings', label: 'Rankings' },
  { href: '/dashboard/eras', label: 'Eras' },
  { href: '/dashboard/versus', label: 'Tú vs Tú' },
  { href: '/dashboard/social', label: 'Social' },
  { href: '/dashboard/trends', label: 'Tendencias' },
  { href: '/dashboard/graveyard', label: 'Cementerio' },
  { href: '/dashboard/activity', label: 'Actividad' },
  { href: '/dashboard/achievements', label: 'Logros' },
  { href: '/dashboard/insights', label: 'Insights IA' },
  { href: '/dashboard/steam', label: 'Steam' },
  { href: '/dashboard/import', label: 'Importar' },
  { href: '/dashboard/settings', label: 'Ajustes' },
  { href: '/dashboard/admin', label: 'Estado' },
];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
      {NAV.map((item) => {
        const active = pathname === item.href;
        const IconCmp = navIcon[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
              active
                ? 'bg-[var(--color-surface-2)] text-white'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-surface-2)]/50 hover:text-white'
            }`}
          >
            {IconCmp && (
              <IconCmp
                className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-[var(--color-accent)]' : ''}`}
                strokeWidth={2}
                aria-hidden
              />
            )}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ProfileFooter() {
  const { data: user } = useSWR('me', api.me);
  const { data: conns } = useSWR('connections', api.connections);
  const { data: dna } = useSWR('dna', api.musicDna);
  const { data: steam } = useSWR('steam:stats', api.steamStats);

  const level = computeLevel(dna?.totals.plays ?? 0, dna?.totals.minutes ?? 0, steam?.totalHours ?? 0);
  const name = user?.displayName ?? user?.username ?? 'Tú';

  return (
    <Link
      href={user?.username ? `/u/${user.username}` : '/dashboard/settings'}
      className="mt-3 block rounded-2xl border bg-[var(--color-surface-2)]/40 p-3 transition hover:border-[var(--color-accent)]/40"
    >
      <div className="flex items-center gap-3">
        {user?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent)]/20 text-sm font-bold text-[var(--color-accent)]">
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-[var(--color-accent)]">Lv. {level.level} · {level.rarity}</p>
        </div>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-accent-2)]"
          style={{ width: `${level.progress * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
        <Dot on={conns?.spotify.connected} label="Spotify" />
        <Dot on={conns?.steam.connected} label="Steam" />
      </div>
    </Link>
  );
}

/** Desktop sidebar — hidden on mobile (see MobileNav for the small-screen menu). */
export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-[var(--color-surface)]/60 p-5 backdrop-blur md:flex">
      <Link href="/dashboard" className="mb-4 px-2 text-xl font-bold tracking-tight">
        Sonora
      </Link>
      <GlobalSearch />
      <NavLinks pathname={pathname} />
      <ProfileFooter />
    </aside>
  );
}

/** Mobile top bar + slide-in drawer. Visible only below the md breakpoint. */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the drawer whenever the route changes + lock body scroll while open.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b bg-[var(--color-surface)]/80 px-4 py-3 backdrop-blur md:hidden">
        <Link href="/dashboard" className="text-lg font-bold tracking-tight">
          Sonora
        </Link>
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-xl border text-[var(--color-muted)] transition hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[82%] max-w-xs flex-col border-r bg-[var(--color-surface)] p-5 md:hidden"
            >
              <div className="mb-4 flex items-center justify-between">
                <Link href="/dashboard" className="text-xl font-bold tracking-tight" onClick={() => setOpen(false)}>
                  Sonora
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border text-[var(--color-muted)] transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <GlobalSearch />
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
              <ProfileFooter />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function Dot({ on, label }: { on?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-muted)]/40'}`} />
      {label}
    </span>
  );
}
