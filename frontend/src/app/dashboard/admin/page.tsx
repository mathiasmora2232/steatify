'use client';

import useSWR from 'swr';
import { api, type AdminOverview } from '@/lib/api';

export default function AdminPage() {
  const { data, error, isLoading } = useSWR('admin', api.adminOverview, { refreshInterval: 15_000 });

  if (isLoading) return <p className="text-[var(--color-muted)]">Cargando estado…</p>;
  if (error || !data)
    return <p className="text-[var(--color-rose)]">No se pudo cargar el estado del sistema.</p>;

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-bold">Estado del sistema</h1>
        <span className="text-xs text-[var(--color-muted)]">
          {new Date(data.timestamp).toLocaleTimeString()} · auto-refresca
        </span>
      </header>

      {/* Servicios */}
      <section className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Status label="PostgreSQL" value={data.services.db} />
        <Status label="Redis" value={data.services.redis} />
        <Status
          label="Token Spotify"
          value={data.spotify.tokenValid ? 'up' : 'down'}
          okText="válido"
          downText="expirado"
        />
        <Status
          label="Sync auto"
          value={data.spotify.syncEnabled ? 'up' : 'down'}
          okText="activo"
          downText="pausado"
        />
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Sincronizaciones */}
        <Card title="Sincronizaciones">
          <Row label="Última sync Spotify" value={fmt(data.spotify.lastSyncedAt)} />
          <Row label="Última sync Steam" value={fmt(data.steam.lastSyncedAt)} />
          <Row label="Token expira" value={fmt(data.spotify.tokenExpiresAt)} />
          <Row label="Zona horaria" value={`UTC${data.tzOffset >= 0 ? '+' : ''}${data.tzOffset / 60}`} />
          <Row label="Scopes" value={data.spotify.scope ?? '—'} small />
        </Card>

        {/* Colas BullMQ */}
        <Card title="Colas (BullMQ)">
          <QueueRow label="sync" counts={data.queues.sync} />
          <QueueRow label="import" counts={data.queues.import} />
        </Card>

        {/* Totales */}
        <Card title="Datos">
          <Row label="Reproducciones" value={data.totals.plays.toLocaleString()} />
          <Row label="Tracks / Artistas" value={`${data.totals.tracks} / ${data.totals.artists}`} />
          <Row label="Juegos Steam" value={String(data.totals.games)} />
          <Row label="Eras" value={String(data.totals.eras)} />
          <Row label="Logros desbloqueados" value={String(data.totals.achievementsUnlocked)} />
          <Row label="Insights" value={String(data.totals.insights)} />
        </Card>
      </div>
    </div>
  );
}

function Status({
  label,
  value,
  okText = 'OK',
  downText = 'caído',
}: {
  label: string;
  value: string;
  okText?: string;
  downText?: string;
}) {
  const up = value === 'up';
  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span
          className={`h-2.5 w-2.5 rounded-full ${up ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-rose)]'}`}
        />
        <span className={`text-sm font-medium ${up ? 'text-white' : 'text-[var(--color-rose)]'}`}>
          {up ? okText : downText}
        </span>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-5">
      <h3 className="mb-3 text-sm font-medium text-[var(--color-muted)]">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="text-[var(--color-muted)]">{label}</span>
      <span className={`text-right text-white ${small ? 'max-w-[60%] truncate text-xs' : 'tabular-nums'}`}>
        {value}
      </span>
    </div>
  );
}

function QueueRow({ label, counts }: { label: string; counts: Record<string, number> | null }) {
  if (!counts) return <Row label={label} value="sin conexión" />;
  return (
    <div className="text-sm">
      <p className="text-white">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
        {['active', 'waiting', 'delayed', 'completed', 'failed'].map((k) => (
          <span key={k} className={counts[k] > 0 && k === 'failed' ? 'text-[var(--color-rose)]' : ''}>
            {k}: {counts[k] ?? 0}
          </span>
        ))}
      </div>
    </div>
  );
}

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : '—';
}
