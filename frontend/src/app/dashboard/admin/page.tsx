'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Users as UsersIcon, Activity, Music2, Gamepad2, Sparkles, Server, ShieldAlert } from 'lucide-react';
import { api, type AdminMetrics, type AdminUser } from '@/lib/api';

export default function AdminPage() {
  const me = useSWR('me', api.me);
  const isAdmin = me.data?.role === 'ADMIN' || me.data?.role === 'SUPER_ADMIN';
  const metrics = useSWR(isAdmin ? 'admin:metrics' : null, api.adminMetrics, { refreshInterval: 30_000 });
  const users = useSWR(isAdmin ? 'admin:users' : null, api.adminUsers);
  const overview = useSWR('admin', api.adminOverview, { refreshInterval: 20_000 });

  return (
    <div className="mx-auto max-w-6xl pb-12">
      <header className="mb-6 flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{isAdmin ? 'Panel de administración' : 'Estado del sistema'}</h1>
        <span className="text-xs text-[var(--color-muted)]">{overview.data ? `${new Date(overview.data.timestamp).toLocaleTimeString()} · auto-refresca` : ''}</span>
      </header>

      {isAdmin && metrics.data && <Metrics m={metrics.data} />}
      {isAdmin && users.data && <UsersTable users={users.data} onChanged={users.mutate} />}

      {/* Estado del sistema (visible para ti) */}
      {overview.data && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">Tu sistema</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Status label="PostgreSQL" value={overview.data.services.db} />
            <Status label="Redis" value={overview.data.services.redis} />
            <Status label="Token Spotify" value={overview.data.spotify.tokenValid ? 'up' : 'down'} okText="válido" downText="expirado" />
            <Status label="Sync auto" value={overview.data.spotify.syncEnabled ? 'up' : 'down'} okText="activo" downText="pausado" />
          </div>
        </section>
      )}
    </div>
  );
}

function Metrics({ m }: { m: AdminMetrics }) {
  return (
    <>
      <section className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat icon={UsersIcon} color="#1db954" value={m.users.total} label="Usuarios" sub={`+${m.users.newToday} hoy`} />
        <Stat icon={Activity} color="#38bdf8" value={m.activity.loggedIn} label="Sesión activa" sub={`${m.activity.synced7d} act. 7d`} />
        <Stat icon={Music2} color="#1db954" value={m.connections.spotify} label="Spotify" />
        <Stat icon={Gamepad2} color="#7c5cff" value={m.connections.steam} label="Steam" />
        <Stat icon={Sparkles} color="#fbbf24" value={m.ai.insightsTotal} label="Insights IA" />
        <Stat icon={ShieldAlert} color="#ff5d8f" value={m.users.suspended} label="Suspendidos" />
      </section>

      <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Planes">
          <Bar label="Free" value={m.plans.FREE} total={m.users.total} color="#9ca3af" />
          <Bar label="Plus" value={m.plans.PLUS} total={m.users.total} color="#7c5cff" />
          <Bar label="Pro" value={m.plans.PRO} total={m.users.total} color="#fbbf24" />
        </Panel>
        <Panel title="Actividad (sync)">
          <Row label="Hoy" value={String(m.activity.syncedToday)} />
          <Row label="7 días" value={String(m.activity.synced7d)} />
          <Row label="30 días" value={String(m.activity.synced30d)} />
          <Row label="Con contraseña" value={String(m.users.withPassword)} />
        </Panel>
        <Panel title="Sistema">
          <div className="mb-2 flex gap-2">
            <Dot ok={m.system.db === 'up'} label="DB" />
            <Dot ok={m.system.redis === 'up'} label="Redis" />
          </div>
          <QueueRow label="cola sync" counts={m.system.queues.sync} />
          <QueueRow label="cola import" counts={m.system.queues.import} />
          <Row label="Reproducciones" value={m.data.plays.toLocaleString()} />
        </Panel>
      </section>
    </>
  );
}

function UsersTable({ users, onChanged }: { users: AdminUser[]; onChanged: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  async function suspend(u: AdminUser) {
    setBusy(u.id);
    try { await api.adminSuspend(u.id, !u.suspendedAt); await onChanged(); } finally { setBusy(null); }
  }
  return (
    <section className="mb-2">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-[var(--color-muted)]">Usuarios recientes</h2>
      <div className="overflow-x-auto rounded-2xl border bg-[var(--color-surface)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted)]">
              <th className="px-4 py-2.5">Usuario</th>
              <th className="px-3 py-2.5">Plan</th>
              <th className="px-3 py-2.5">Rol</th>
              <th className="px-3 py-2.5">Conexiones</th>
              <th className="px-3 py-2.5">Última sync</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--color-border)]/50 last:border-0">
                <td className="px-4 py-2.5">
                  <p className="font-medium text-white">{u.displayName ?? u.username ?? '—'} {u.suspendedAt && <span className="text-[var(--color-rose)]">· suspendido</span>}</p>
                  <p className="text-xs text-[var(--color-muted)]">@{u.username ?? '—'} · {u.email ?? 'sin email'}</p>
                </td>
                <td className="px-3 py-2.5"><PlanTag plan={u.plan} /></td>
                <td className="px-3 py-2.5 text-xs text-[var(--color-muted)]">{u.role === 'USER' ? '—' : u.role.replace('_', ' ')}</td>
                <td className="px-3 py-2.5 text-xs text-[var(--color-muted)]">{u.spotifyId ? '🎵' : ''}</td>
                <td className="px-3 py-2.5 text-xs text-[var(--color-muted)]">{u.lastSyncedAt ? new Date(u.lastSyncedAt).toLocaleDateString() : '—'}</td>
                <td className="px-3 py-2.5 text-right">
                  {u.role === 'USER' && (
                    <button onClick={() => suspend(u)} disabled={busy === u.id}
                      className={`rounded-full border px-3 py-1 text-xs transition disabled:opacity-50 ${u.suspendedAt ? 'text-[var(--color-accent)] hover:border-[var(--color-accent)]/50' : 'text-[var(--color-muted)] hover:border-[var(--color-rose)]/50 hover:text-[var(--color-rose)]'}`}>
                      {busy === u.id ? '…' : u.suspendedAt ? 'Reactivar' : 'Suspender'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── pieces ── */
function Stat({ icon: Icon, color, value, label, sub }: { icon: typeof Activity; color: string; value: number; label: string; sub?: string }) {
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-4">
      <span className="mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${color}1f`, color }}><Icon className="h-4 w-4" /></span>
      <p className="text-2xl font-black tabular-nums text-white">{value.toLocaleString()}</p>
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      {sub && <p className="text-[10px] text-[var(--color-muted)]/80">{sub}</p>}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-[var(--color-surface)] p-5"><h3 className="mb-3 text-sm font-medium text-[var(--color-muted)]">{title}</h3><div className="space-y-2">{children}</div></div>;
}
function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm"><span className="text-[var(--color-text)]">{label}</span><span className="tabular-nums text-white">{value} · {pct}%</span></div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} /></div>
    </div>
  );
}
function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between text-sm"><span className="text-[var(--color-muted)]">{label}</span><span className="tabular-nums text-white">{value}</span></div>;
}
function Dot({ ok, label }: { ok: boolean; label: string }) {
  return <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"><span className={`h-2 w-2 rounded-full ${ok ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-rose)]'}`} />{label}</span>;
}
function PlanTag({ plan }: { plan: AdminUser['plan'] }) {
  const c = plan === 'PRO' ? '#fbbf24' : plan === 'PLUS' ? '#7c5cff' : '#9ca3af';
  return <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${c}22`, color: c }}>{plan}</span>;
}
function QueueRow({ label, counts }: { label: string; counts: Record<string, number> | null }) {
  if (!counts) return <Row label={label} value="sin conexión" />;
  return (
    <div className="text-sm">
      <p className="text-[var(--color-muted)]">{label}</p>
      <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
        {['active', 'waiting', 'delayed', 'failed'].map((k) => (
          <span key={k} className={counts[k] > 0 && k === 'failed' ? 'text-[var(--color-rose)]' : ''}>{k}: {counts[k] ?? 0}</span>
        ))}
      </div>
    </div>
  );
}
function Status({ label, value, okText = 'OK', downText = 'caído' }: { label: string; value: string; okText?: string; downText?: string }) {
  const up = value === 'up';
  return (
    <div className="rounded-2xl border bg-[var(--color-surface)] p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <div className="mt-2 flex items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${up ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-rose)]'}`} />
        <span className={`text-sm font-medium ${up ? 'text-white' : 'text-[var(--color-rose)]'}`}>{up ? okText : downText}</span>
      </div>
    </div>
  );
}
