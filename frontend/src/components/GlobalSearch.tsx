'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { Search, Mic2, Music2, Gamepad2, Disc3, X, type LucideIcon } from 'lucide-react';
import { api } from '@/lib/api';

/** Global Sonora search — Cmd/Ctrl+K palette over artists, songs, albums, games. */
export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const router = useRouter();

  // Open with ⌘K / Ctrl+K, close with Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Debounce the query.
  useEffect(() => {
    const t = setTimeout(() => setDq(q), 220);
    return () => clearTimeout(t);
  }, [q]);

  const { data, isLoading } = useSWR(open && dq.trim().length >= 2 ? `search:${dq}` : null, () => api.search(dq));

  const go = (href: string) => {
    setOpen(false);
    setQ('');
    router.push(href);
  };

  const empty =
    !!data && data.artists.length + data.tracks.length + data.albums.length + data.games.length === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-3 flex w-full items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2 text-sm text-[var(--color-muted)] transition hover:border-[var(--color-accent)]/40"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Buscar…</span>
        <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xl overflow-hidden rounded-3xl border bg-[var(--color-surface)] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[var(--color-border)] px-4 py-3">
              <Search className="h-5 w-5 text-[var(--color-muted)]" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca canciones, artistas, álbumes, juegos…"
                className="flex-1 bg-transparent text-base text-[var(--color-text)] outline-none placeholder:text-[var(--color-muted)]"
              />
              <button onClick={() => setOpen(false)} className="text-[var(--color-muted)] hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2">
              {q.trim().length < 2 ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">Escribe al menos 2 letras…</p>
              ) : isLoading ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">Buscando…</p>
              ) : empty ? (
                <p className="px-3 py-8 text-center text-sm text-[var(--color-muted)]">Nada en tu historial con «{q}».</p>
              ) : (
                <>
                  <Group title="Artistas" icon={Mic2}>
                    {data?.artists.map((a) => (
                      <Row key={a.artistId} image={a.imageUrl} rounded name={a.name} meta={`${a.plays}▶`} onClick={() => go(`/dashboard/artist/${a.artistId}`)} fallback={Mic2} />
                    ))}
                  </Group>
                  <Group title="Canciones" icon={Music2}>
                    {data?.tracks.map((t) => (
                      <Row key={t.trackId} image={t.imageUrl} name={t.name} meta={`${t.plays}▶`} sub={t.artist ?? undefined} onClick={() => go(`/dashboard/song/${t.trackId}`)} fallback={Music2} />
                    ))}
                  </Group>
                  <Group title="Álbumes" icon={Disc3}>
                    {data?.albums.map((al) => (
                      <Row key={al.albumId} image={al.imageUrl} name={al.name} meta={`${al.plays}▶`} fallback={Disc3} />
                    ))}
                  </Group>
                  <Group title="Juegos" icon={Gamepad2}>
                    {data?.games.map((g) => (
                      <Row key={g.appId} image={g.headerUrl} wide name={g.name} meta={`${g.hours}h`} onClick={() => go(`/dashboard/steam/game/${g.appId}`)} fallback={Gamepad2} />
                    ))}
                  </Group>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Group({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: React.ReactNode }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : children;
  if (Array.isArray(arr) && arr.length === 0) return null;
  return (
    <div className="mb-1">
      <p className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-muted)]">
        <Icon className="h-3 w-3" /> {title}
      </p>
      {children}
    </div>
  );
}

function Row({ image, name, meta, sub, onClick, rounded, wide, fallback: Fallback }: { image: string | null; name: string; meta: string; sub?: string; onClick?: () => void; rounded?: boolean; wide?: boolean; fallback: LucideIcon }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-[var(--color-surface-2)]/60">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className={`shrink-0 object-cover ${wide ? 'h-7 w-12 rounded' : rounded ? 'h-9 w-9 rounded-full' : 'h-9 w-9 rounded'}`} />
      ) : (
        <div className={`flex shrink-0 items-center justify-center bg-[var(--color-surface-2)] ${wide ? 'h-7 w-12 rounded' : rounded ? 'h-9 w-9 rounded-full' : 'h-9 w-9 rounded'}`}><Fallback className="h-4 w-4 text-[var(--color-muted)]" /></div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{name}</p>
        {sub && <p className="truncate text-xs text-[var(--color-muted)]">{sub}</p>}
      </div>
      <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted)]">{meta}</span>
    </div>
  );
  return onClick ? (
    <button onClick={onClick} className="block w-full text-left">{inner}</button>
  ) : (
    <div className="cursor-default opacity-80">{inner}</div>
  );
}
