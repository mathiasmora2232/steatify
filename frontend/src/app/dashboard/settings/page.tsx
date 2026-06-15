'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import {
  Check,
  User as UserIcon,
  Link2,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Database,
  RefreshCw,
  Download,
  Trash2,
  ExternalLink,
  type LucideIcon,
} from 'lucide-react';
import { api, loginUrl, type UserProfile, type Connections } from '@/lib/api';
import { parseErr } from '@/components/form';
import { Icon, I } from '@/lib/icons';

export default function SettingsPage() {
  const me = useSWR('me', api.me);
  const conns = useSWR('connections', api.connections);
  const user = me.data;

  return (
    <div className="mx-auto max-w-3xl pb-12">
      <h1 className="mb-1 text-3xl font-bold tracking-tight">Ajustes</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">El centro de tu cuenta Sonora.</p>

      {user && (
        <div className="space-y-5">
          <ProfileSection user={user} onSaved={me.mutate} />
          <ConnectionsSection data={conns.data} onChange={() => { conns.mutate(); me.mutate(); }} lastSync={user.lastSyncedAt} />
          <PrivacySection user={user} onSaved={me.mutate} />
          <PreferencesSection user={user} />
          <AiSection user={user} onSaved={me.mutate} />
          <DataSection />
        </div>
      )}
    </div>
  );
}

/* ── shared ── */
function Section({ icon: Icon2, title, desc, children }: { icon: LucideIcon; title: string; desc: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-[var(--color-surface)] p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
          <Icon2 className="h-4.5 w-4.5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          <p className="text-xs text-[var(--color-muted)]">{desc}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Toggle({ label, desc, checked, onChange, disabled }: { label: string; desc?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center justify-between gap-4 py-2.5 ${disabled ? 'opacity-50' : 'cursor-pointer'}`}>
      <div className="min-w-0">
        <p className="text-sm text-white">{label}</p>
        {desc && <p className="text-xs text-[var(--color-muted)]">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-2)]'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
      </button>
    </label>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs text-[var(--color-muted)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border bg-[var(--color-surface-2)] px-4 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
      />
      {hint && <span className="text-[10px] text-[var(--color-muted)]">{hint}</span>}
    </label>
  );
}

/* ── 1. Perfil ── */
function ProfileSection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const [form, setForm] = useState({ displayName: '', username: '', bio: '', avatarUrl: '', bannerUrl: '' });
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({ displayName: user.displayName ?? '', username: user.username ?? '', bio: user.bio ?? '', avatarUrl: user.avatarUrl ?? '', bannerUrl: user.bannerUrl ?? '' });
  }, [user]);

  async function save() {
    setBusy(true); setMsg(null);
    try { await api.updateProfile({ displayName: form.displayName, username: form.username, bio: form.bio }); setMsg('Guardado'); onSaved(); }
    catch (e) { setMsg(parseErr(e)); }
    finally { setBusy(false); }
  }

  async function onPick(kind: 'avatar' | 'banner', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(kind); setMsg(null);
    try {
      const updated = kind === 'avatar' ? await api.uploadAvatar(file) : await api.uploadBanner(file);
      setForm((f) => ({ ...f, avatarUrl: updated.avatarUrl ?? f.avatarUrl, bannerUrl: updated.bannerUrl ?? f.bannerUrl }));
      onSaved();
    } catch (err) {
      setMsg(parseErr(err));
    } finally {
      setUploading(null);
      if (kind === 'avatar' && fileRef.current) fileRef.current.value = '';
      if (kind === 'banner' && bannerRef.current) bannerRef.current.value = '';
    }
  }

  return (
    <Section icon={UserIcon} title="Perfil" desc="Cómo te ven en Sonora.">
      {/* Banner */}
      <button
        type="button"
        onClick={() => bannerRef.current?.click()}
        className="group relative mb-4 flex h-24 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)]/40"
        title="Cambiar portada"
      >
        {form.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={form.bannerUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-xs text-[var(--color-muted)]">Subir portada</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
          {uploading === 'banner' ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <span className="text-xs font-medium text-white">Cambiar portada</span>}
        </span>
      </button>
      <input ref={bannerRef} type="file" accept="image/*" onChange={(e) => onPick('banner', e)} className="hidden" />

      <div className="flex items-start gap-4">
        <div className="shrink-0 text-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative block h-16 w-16 overflow-hidden rounded-full ring-2 ring-[var(--color-accent)]/40"
            title="Cambiar avatar"
          >
            {form.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-[var(--color-surface-2)] text-xl font-bold text-[var(--color-muted)]">
                {(form.displayName || 'S').slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
              {uploading === 'avatar' ? <RefreshCw className="h-4 w-4 animate-spin text-white" /> : <UserIcon className="h-4 w-4 text-white" />}
            </span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={(e) => onPick('avatar', e)} className="hidden" />
          <p className="mt-1 text-[10px] text-[var(--color-muted)]">Subir foto</p>
        </div>
        <div className="flex-1 space-y-3">
          <Field label="Nombre" value={form.displayName} onChange={(v) => setForm({ ...form, displayName: v })} />
          <Field label="Usuario" value={form.username} onChange={(v) => setForm({ ...form, username: v })} hint="tu URL pública /u/usuario" />
          <Field label="Bio" value={form.bio} onChange={(v) => setForm({ ...form, bio: v })} hint="una línea sobre ti" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button onClick={save} disabled={busy} className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-black transition hover:brightness-110 disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        {form.username && (
          <Link href={`/u/${form.username}`} className="flex items-center gap-1 text-sm text-[var(--color-accent)]">
            Ver perfil público <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
        {msg && (
          <span className="flex items-center gap-1 text-sm text-[var(--color-muted)]">
            {msg === 'Guardado' && <Check className="h-3.5 w-3.5 text-[var(--color-accent)]" />} {msg}
          </span>
        )}
      </div>
    </Section>
  );
}

/* ── 2. Conexiones ── */
function ConnectionsSection({ data, onChange, lastSync }: { data: Connections | undefined; onChange: () => void; lastSync: string | null }) {
  const [steamInput, setSteamInput] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  async function linkSteam() {
    if (!steamInput.trim()) return;
    setBusy('steam');
    try { await api.steamLink(steamInput.trim()); setSteamInput(''); onChange(); } finally { setBusy(null); }
  }
  async function disconnect(which: 'spotify' | 'steam') {
    setBusy(which);
    try { which === 'spotify' ? await api.disconnectSpotify() : await api.disconnectSteam(); onChange(); } finally { setBusy(null); }
  }

  return (
    <Section icon={Link2} title="Conexiones" desc={lastSync ? `Última sincronización: ${new Date(lastSync).toLocaleString()}` : 'Conecta tus cuentas.'}>
      {/* Spotify */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] py-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium"><Icon icon={I.music} className="h-4 w-4" /> Spotify</p>
          <p className="text-xs text-[var(--color-muted)]">{data?.spotify.connected ? `Conectado · ${data.spotify.displayName ?? ''}` : 'No conectado'}</p>
        </div>
        {data?.spotify.connected ? (
          <button onClick={() => disconnect('spotify')} disabled={busy === 'spotify'} className="rounded-full border px-4 py-1.5 text-sm text-[var(--color-rose)] transition hover:border-[var(--color-rose)] disabled:opacity-50">Desconectar</button>
        ) : (
          <a href={loginUrl} className="rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-sm font-semibold text-black">Conectar</a>
        )}
      </div>
      {/* Steam */}
      <div className="py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium"><Icon icon={I.gaming} className="h-4 w-4" /> Steam</p>
            <p className="text-xs text-[var(--color-muted)]">{data?.steam.connected ? `Conectado · ${data.steam.personaName ?? data.steam.steamId}` : 'No conectado'}</p>
          </div>
          {data?.steam.connected && (
            <button onClick={() => disconnect('steam')} disabled={busy === 'steam'} className="rounded-full border px-4 py-1.5 text-sm text-[var(--color-rose)] transition hover:border-[var(--color-rose)] disabled:opacity-50">Desconectar</button>
          )}
        </div>
        {!data?.steam.connected && (
          <div className="mt-2 flex gap-2">
            <input value={steamInput} onChange={(e) => setSteamInput(e.target.value)} placeholder="SteamID64 o vanity" className="flex-1 rounded-xl border bg-[var(--color-surface-2)] px-4 py-2 text-sm outline-none focus:border-[var(--color-accent)]" />
            <button onClick={linkSteam} disabled={busy === 'steam'} className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50">{busy === 'steam' ? '…' : 'Conectar'}</button>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ── 3. Privacidad ── */
function PrivacySection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const set = async (patch: Partial<UserProfile>) => { await api.updateProfile(patch); onSaved(); };
  return (
    <Section icon={Shield} title="Privacidad" desc="Qué se muestra en tu perfil público.">
      <div className="divide-y divide-[var(--color-border)]">
        <Toggle label="Perfil público" desc="Cualquiera con el enlace puede verlo" checked={user.isPublic ?? true} onChange={(v) => set({ isPublic: v })} />
        <Toggle label="Mostrar música" desc="Top artistas, canciones y eras" checked={user.showMusic ?? true} onChange={(v) => set({ showMusic: v })} disabled={!(user.isPublic ?? true)} />
        <Toggle label="Mostrar gaming" desc="Steam, horas y logros" checked={user.showSteam ?? true} onChange={(v) => set({ showSteam: v })} disabled={!(user.isPublic ?? true)} />
      </div>
    </Section>
  );
}

/* ── 4. Preferencias ── */
function PreferencesSection({ user }: { user: UserProfile }) {
  const [hour24, setHour24] = useState(true);
  const [tzMsg, setTzMsg] = useState<string | null>(null);
  useEffect(() => { setHour24(localStorage.getItem('sonora:hour24') !== 'false'); }, []);

  const localOffset = -new Date().getTimezoneOffset();
  const tzLabel = `UTC${localOffset >= 0 ? '+' : ''}${Math.round(localOffset / 60)}`;

  async function updateTz() {
    await api.setTimezone(localOffset);
    setTzMsg('Zona horaria actualizada');
  }

  return (
    <Section icon={SlidersHorizontal} title="Preferencias" desc="Cómo se muestran tus datos.">
      <div className="divide-y divide-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div>
            <p className="text-sm text-white">Zona horaria</p>
            <p className="text-xs text-[var(--color-muted)]">Detectada: {tzLabel} {user.tzOffset != null && user.tzOffset !== localOffset ? '· difiere de la guardada' : ''}</p>
          </div>
          <button onClick={updateTz} className="rounded-full border px-3 py-1.5 text-xs text-[var(--color-accent)] transition hover:border-[var(--color-accent)]/50">
            {tzMsg ?? 'Usar esta'}
          </button>
        </div>
        <Toggle label="Formato 24 horas" desc={hour24 ? '14:30' : '2:30 PM'} checked={hour24} onChange={(v) => { setHour24(v); localStorage.setItem('sonora:hour24', String(v)); }} />
      </div>
    </Section>
  );
}

/* ── 5. IA y límites ── */
function AiSection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  async function clearInsights() {
    const r = await api.deleteInsights();
    setMsg(`${r.deleted} insight(s) borrados`);
  }
  return (
    <Section icon={Sparkles} title="IA y límites" desc="Control de los insights generados.">
      <div className="divide-y divide-[var(--color-border)]">
        <Toggle label="Insights automáticos" desc="Genera tu resumen semanal sin pedirlo" checked={user.aiAuto ?? true} onChange={async (v) => { await api.updateProfile({ aiAuto: v }); onSaved(); }} />
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div>
            <p className="text-sm text-white">Límite diario</p>
            <p className="text-xs text-[var(--color-muted)]">Automático: 1/día · Manual: 3/día</p>
          </div>
          <span className="rounded-full bg-[var(--color-surface-2)] px-3 py-1 text-xs text-[var(--color-muted)]">3 manual / día</span>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div>
            <p className="text-sm text-white">Borrar insights generados</p>
            <p className="text-xs text-[var(--color-muted)]">{msg ?? 'Elimina tu historial de insights'}</p>
          </div>
          <button onClick={clearInsights} className="flex items-center gap-1.5 rounded-full border border-[var(--color-rose)]/40 px-3 py-1.5 text-xs text-[var(--color-rose)] transition hover:bg-[var(--color-rose)]/10">
            <Trash2 className="h-3.5 w-3.5" /> Borrar
          </button>
        </div>
      </div>
    </Section>
  );
}

/* ── 6. Datos ── */
function DataSection() {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function exportData() {
    setBusy('export');
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `sonora-export-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      URL.revokeObjectURL(url);
    } finally { setBusy(null); }
  }
  async function resync() {
    setBusy('sync'); setMsg(null);
    try {
      await api.syncNow().catch(() => undefined);
      await api.steamSyncFull().catch(() => undefined);
      setMsg('Sincronización en cola — refresca en unos segundos.');
    } finally { setBusy(null); }
  }
  async function deleteAccount() {
    if (!window.confirm('¿Seguro? Esto borra tu cuenta y TODOS tus datos. No se puede deshacer.')) return;
    if (!window.confirm('Última confirmación: se eliminará todo permanentemente.')) return;
    setBusy('delete');
    try {
      await api.deleteAccount();
      await api.logout().catch(() => undefined);
      window.location.href = '/login';
    } catch {
      setBusy(null);
      setMsg('No se pudo borrar la cuenta.');
    }
  }

  return (
    <Section icon={Database} title="Datos" desc="Portabilidad y mantenimiento.">
      <div className="divide-y divide-[var(--color-border)]">
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div><p className="text-sm text-white">Re-sincronizar todo</p><p className="text-xs text-[var(--color-muted)]">{msg ?? 'Vuelve a traer música y Steam'}</p></div>
          <button onClick={resync} disabled={busy === 'sync'} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-[var(--color-accent)] transition hover:border-[var(--color-accent)]/50 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${busy === 'sync' ? 'animate-spin' : ''}`} /> Sincronizar
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div><p className="text-sm text-white">Exportar mis datos</p><p className="text-xs text-[var(--color-muted)]">Descarga un JSON con tu cuenta</p></div>
          <button onClick={exportData} disabled={busy === 'export'} className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs text-[var(--color-text)] transition hover:border-[var(--color-accent)]/50 disabled:opacity-50">
            <Download className="h-3.5 w-3.5" /> Exportar
          </button>
        </div>
        <div className="flex items-center justify-between gap-4 py-2.5">
          <div><p className="text-sm text-[var(--color-rose)]">Borrar cuenta</p><p className="text-xs text-[var(--color-muted)]">Elimina tu cuenta y todos tus datos. Irreversible.</p></div>
          <button onClick={deleteAccount} disabled={busy === 'delete'} className="flex items-center gap-1.5 rounded-full border border-[var(--color-rose)]/40 px-3 py-1.5 text-xs text-[var(--color-rose)] transition hover:bg-[var(--color-rose)]/10 disabled:opacity-50">
            <Trash2 className="h-3.5 w-3.5" /> Borrar
          </button>
        </div>
      </div>
    </Section>
  );
}
