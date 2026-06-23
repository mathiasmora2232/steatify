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
  CreditCard,
  Trash2,
  ExternalLink,
  Palette,
  Monitor,
  LogOut,
  Trophy,
  Lock,
  X,
  LayoutGrid,
  type LucideIcon,
} from 'lucide-react';
import { api, loginUrl, type UserProfile, type Connections, type SessionInfo, type Showcase, type ShowcaseItem, type ShowcaseType } from '@/lib/api';
import { parseErr } from '@/components/form';
import { Icon, I } from '@/lib/icons';
import { THEMES, getSavedTheme, saveTheme, type ThemeKey } from '@/lib/themes';
import { TITLES, RARITY_COLOR } from '@/lib/titles';
import { computeLevel } from '@/lib/level';

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
          <SettingsHubSection />
          <ShowcaseSection user={user} onSaved={me.mutate} />
          <TitlesSection user={user} onSaved={me.mutate} />
          <BuilderSection user={user} onSaved={me.mutate} />
          <ConnectionsSection data={conns.data} onChange={() => { conns.mutate(); me.mutate(); }} lastSync={user.lastSyncedAt} />
          <SecuritySection user={user} onSaved={me.mutate} />
          <SessionsSection />
          <PrivacySection user={user} onSaved={me.mutate} />
          <AppearanceSection user={user} onSaved={me.mutate} />
          <PreferencesSection user={user} />
          <AiSection user={user} onSaved={me.mutate} />
          <DataSection />
        </div>
      )}
    </div>
  );
}

/* ── seguridad: email + contraseña (para entrar sin Spotify) ── */
function SecuritySection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const [email, setEmail] = useState(user.email ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    setErr(null); setMsg(null);
    if (password.length < 8) return setErr('La contraseña debe tener al menos 8 caracteres.');
    if (password !== confirm) return setErr('Las contraseñas no coinciden.');
    setBusy(true);
    try {
      await api.setCredentials({ email: email.trim() || undefined, password });
      setMsg('Listo — ya puedes entrar con tu correo y contraseña.');
      setPassword(''); setConfirm('');
      onSaved();
    } catch (e) {
      setErr(parseErr(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section icon={Shield} title="Seguridad · entrar con correo" desc="Pon una contraseña para iniciar sesión sin depender de Spotify.">
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-xs text-[var(--color-muted)]">Correo</label>
          <input
            type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com"
            className="w-full rounded-xl border bg-[var(--color-surface-2)]/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]/50"
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Contraseña nueva</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="mín. 8 caracteres"
              className="w-full rounded-xl border bg-[var(--color-surface-2)]/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]/50" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-[var(--color-muted)]">Repetir</label>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="repite la contraseña"
              className="w-full rounded-xl border bg-[var(--color-surface-2)]/40 px-3 py-2 text-sm text-white outline-none focus:border-[var(--color-accent)]/50" />
          </div>
        </div>
        {err && <p className="text-xs text-[var(--color-rose)]">{err}</p>}
        {msg && <p className="flex items-center gap-1 text-xs text-[var(--color-accent)]"><Check className="h-3.5 w-3.5" /> {msg}</p>}
        <button onClick={save} disabled={busy || !password}
          className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-black transition hover:opacity-90 disabled:opacity-50">
          {busy ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </div>
    </Section>
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

function SettingsHubSection() {
  return (
    <Section icon={SlidersHorizontal} title="Cuenta y plan" desc="Accesos menos frecuentes, guardados dentro de ajustes.">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/dashboard/settings/import"
          className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/30 p-4 transition hover:border-[var(--color-accent)]/45"
        >
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
            <Download className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm font-semibold text-white">Importar historial</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Sube exports de Spotify cuando quieras completar tus datos.</p>
        </Link>
        <Link
          href="/dashboard/settings/plans"
          className="group rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/30 p-4 transition hover:border-[var(--color-accent)]/45"
        >
          <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent)]/12 text-[var(--color-accent)]">
            <CreditCard className="h-4.5 w-4.5" />
          </span>
          <p className="text-sm font-semibold text-white">Planes</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">Revisa tu plan actual y las opciones futuras sin llenar el menú.</p>
        </Link>
      </div>
    </Section>
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
      {form.username && <ShareLink username={form.username} />}
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

function ShareLink({ username }: { username: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? `${window.location.origin}/u/${username}` : `/u/${username}`;
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  }
  return (
    <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/40 px-3 py-2">
      <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-muted)]">{url.replace(/^https?:\/\//, '')}</span>
      <button onClick={copy} className="shrink-0 rounded-full bg-[var(--color-accent)]/15 px-3 py-1.5 text-xs font-semibold text-[var(--color-accent)] transition hover:bg-[var(--color-accent)]/25">
        {copied ? '¡Copiado!' : 'Copiar enlace'}
      </button>
    </div>
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
function deviceName(ua: string | null): string {
  if (!ua) return 'Dispositivo desconocido';
  const os = /Windows/i.test(ua) ? 'Windows' : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
    : /iPhone|iPad|iOS/i.test(ua) ? 'iOS' : /Android/i.test(ua) ? 'Android' : /Linux/i.test(ua) ? 'Linux' : 'Otro SO';
  const br = /Edg/i.test(ua) ? 'Edge' : /OPR|Opera/i.test(ua) ? 'Opera' : /Chrome/i.test(ua) ? 'Chrome'
    : /Firefox/i.test(ua) ? 'Firefox' : /Safari/i.test(ua) ? 'Safari' : 'Navegador';
  return `${br} · ${os}`;
}

async function logoutNow() {
  try { await api.logout(); } catch { /* clear regardless */ }
  window.location.href = '/login';
}

function SessionsSection() {
  const { data: sessions, mutate } = useSWR('sessions', api.sessions);
  const [busy, setBusy] = useState<string | null>(null);

  async function revoke(id: string) {
    setBusy(id);
    try { await api.revokeSession(id); await mutate(); } finally { setBusy(null); }
  }
  async function revokeOthers() {
    setBusy('others');
    try { await api.revokeOtherSessions(); await mutate(); } finally { setBusy(null); }
  }

  const others = (sessions ?? []).filter((s) => !s.current).length;

  return (
    <Section icon={Monitor} title="Sesiones y dispositivos" desc="Dónde tienes la sesión abierta. Cierra las que no reconozcas.">
      <div className="space-y-2">
        {(sessions ?? []).map((s: SessionInfo) => (
          <div key={s.id} className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/30 px-3 py-2.5">
            <Monitor className="h-4 w-4 shrink-0 text-[var(--color-muted)]" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                {deviceName(s.userAgent)}
                {s.current && <span className="rounded-full bg-[var(--color-accent)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">Este dispositivo</span>}
              </p>
              <p className="truncate text-xs text-[var(--color-muted)]">
                {s.ip ? `IP ${s.ip} · ` : ''}desde {new Date(s.createdAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            </div>
            {!s.current && (
              <button onClick={() => revoke(s.id)} disabled={busy === s.id}
                className="shrink-0 rounded-full border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-rose)]/50 hover:text-[var(--color-rose)] disabled:opacity-50">
                {busy === s.id ? '…' : 'Cerrar'}
              </button>
            )}
          </div>
        ))}
        {sessions && sessions.length === 0 && <p className="text-sm text-[var(--color-muted)]">No hay sesiones activas.</p>}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={logoutNow} className="flex items-center gap-1.5 rounded-full bg-[var(--color-rose)]/15 px-4 py-2 text-sm font-semibold text-[var(--color-rose)] transition hover:bg-[var(--color-rose)]/25">
          <LogOut className="h-4 w-4" /> Cerrar sesión aquí
        </button>
        {others > 0 && (
          <button onClick={revokeOthers} disabled={busy === 'others'}
            className="rounded-full border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-muted)] transition hover:text-white disabled:opacity-50">
            {busy === 'others' ? 'Cerrando…' : `Cerrar las otras ${others} sesion${others > 1 ? 'es' : ''}`}
          </button>
        )}
      </div>
    </Section>
  );
}

const PROFILE_SECTIONS: { key: string; label: string }[] = [
  { key: 'estado', label: 'Estado actual (Modo …)' },
  { key: 'passport', label: 'Sonora Passport' },
  { key: 'insignias', label: 'Insignias' },
  { key: 'vitrinas', label: 'Vitrina' },
  { key: 'universo', label: 'Mi universo' },
  { key: 'colecciones', label: 'Colecciones' },
  { key: 'timeline', label: 'Línea temporal' },
];

function BuilderSection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const base = (user.showcase as Showcase) ?? {};
  const [hidden, setHidden] = useState<string[]>(base.hidden ?? []);
  const [busy, setBusy] = useState(false);

  async function toggle(key: string, show: boolean) {
    const next = show ? hidden.filter((k) => k !== key) : Array.from(new Set([...hidden, key]));
    setHidden(next);
    setBusy(true);
    try {
      await api.updateProfile({ showcase: { ...base, hidden: next } });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section icon={LayoutGrid} title="Secciones del perfil" desc="Arma tu perfil: elige qué se muestra públicamente.">
      <div className="space-y-1">
        {PROFILE_SECTIONS.map((s) => (
          <Toggle key={s.key} label={s.label} checked={!hidden.includes(s.key)} onChange={(v) => toggle(s.key, v)} disabled={busy} />
        ))}
      </div>
    </Section>
  );
}

function TitlesSection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const dna = useSWR('dna', api.musicDna);
  const steam = useSWR('steam:stats', api.steamStats);
  const [busy, setBusy] = useState(false);

  const showcase = (user.showcase as Record<string, unknown>) ?? {};
  const equipped = typeof showcase.title === 'string' ? showcase.title : undefined;
  const plays = dna.data?.totals.plays ?? 0;
  const minutes = dna.data?.totals.minutes ?? 0;
  const hours = steam.data?.totalHours ?? 0;
  const ctx = { level: computeLevel(plays, minutes, hours).level, plays, minutes, hours };

  async function equip(id?: string) {
    setBusy(true);
    const next = { ...showcase };
    if (id) next.title = id;
    else delete next.title;
    try {
      await api.updateProfile({ showcase: next });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  const unlockedCount = TITLES.filter((t) => t.unlocked(ctx)).length;

  return (
    <Section icon={Trophy} title="Títulos" desc={`Equipa un título que sale en tu perfil. Desbloqueados: ${unlockedCount}/${TITLES.length}.`}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {TITLES.map((t) => {
          const unlocked = t.unlocked(ctx);
          const active = equipped === t.id;
          return (
            <button
              key={t.id}
              disabled={busy || !unlocked}
              onClick={() => equip(active ? undefined : t.id)}
              className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition disabled:cursor-not-allowed ${
                active ? 'border-white/50 ring-1 ring-white/20' : unlocked ? 'border-[var(--color-border)] hover:border-white/25' : 'border-[var(--color-border)] opacity-45'
              }`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: `${RARITY_COLOR[t.rarity]}22`, color: RARITY_COLOR[t.rarity] }}>
                {unlocked ? <Trophy className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold" style={{ color: unlocked ? RARITY_COLOR[t.rarity] : 'var(--color-muted)' }}>{t.label}</p>
                <p className="truncate text-[10px] uppercase tracking-wide text-[var(--color-muted)]">
                  {t.rarity}{unlocked ? (active ? ' · equipado' : '') : ` · 🔒 ${t.req}`}
                </p>
              </div>
              {active && <Check className="h-4 w-4 shrink-0 text-white" />}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

const SHOWCASE_TABS: { key: ShowcaseType; label: string }[] = [
  { key: 'song', label: 'Canciones' },
  { key: 'artist', label: 'Artistas' },
  { key: 'album', label: 'Álbumes' },
  { key: 'game', label: 'Juegos' },
];
const MAX_SHOWCASE = 8;

function ShowcaseSection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const tracks = useSWR('top:tracks:all', () => api.top('tracks', 'all', 16));
  const artists = useSWR('top:artists:all', () => api.top('artists', 'all', 16));
  const albums = useSWR('top:albums:all', () => api.top('albums', 'all', 16));
  const lib = useSWR('steam:library', api.steamLibrary);

  const base = (user.showcase as Showcase) ?? {};
  const [items, setItems] = useState<ShowcaseItem[]>(base.items ?? []);
  const [tab, setTab] = useState<ShowcaseType>('song');
  const [busy, setBusy] = useState(false);

  const ikey = (i: ShowcaseItem) => `${i.type}:${i.id}`;
  const has = (i: ShowcaseItem) => items.some((x) => ikey(x) === ikey(i));

  async function persist(next: ShowcaseItem[]) {
    setItems(next);
    setBusy(true);
    try {
      await api.updateProfile({ showcase: { ...base, items: next } });
      onSaved();
    } finally {
      setBusy(false);
    }
  }
  const add = (i: ShowcaseItem) => { if (items.length < MAX_SHOWCASE && !has(i)) void persist([...items, i]); };
  const remove = (i: ShowcaseItem) => void persist(items.filter((x) => ikey(x) !== ikey(i)));

  const games = [...(lib.data ?? [])].sort((a, b) => b.hoursForever - a.hoursForever).slice(0, 16);
  const candidates: ShowcaseItem[] =
    tab === 'song' ? (tracks.data ?? []).map((t) => ({ type: 'song', id: t.id, name: t.name, image: t.imageUrl ?? null, sub: t.subtitle ?? `${t.plays} reproducciones` }))
    : tab === 'artist' ? (artists.data ?? []).map((a) => ({ type: 'artist', id: a.id, name: a.name, image: a.imageUrl ?? null, sub: `${a.plays} reproducciones` }))
    : tab === 'album' ? (albums.data ?? []).map((a) => ({ type: 'album', id: a.id, name: a.name, image: a.imageUrl ?? null, sub: `${a.plays} reproducciones` }))
    : games.map((g) => ({ type: 'game', id: String(g.appId), name: g.name, image: g.headerUrl ?? null, sub: `${g.hoursForever} horas` }));

  const full = items.length >= MAX_SHOWCASE;

  return (
    <Section icon={Trophy} title="Vitrina" desc={`Arma tu vitrina estilo Steam: hasta ${MAX_SHOWCASE} ítems (canciones, artistas, álbumes, juegos). Vacía = vitrinas automáticas.`}>
      {/* Tu vitrina actual */}
      <p className="mb-2 text-xs text-[var(--color-muted)]">Tu vitrina · {items.length}/{MAX_SHOWCASE}</p>
      {items.length === 0 ? (
        <p className="mb-4 rounded-xl border border-dashed px-3 py-4 text-center text-xs text-[var(--color-muted)]">Vacía — añade ítems abajo.</p>
      ) : (
        <div className="mb-4 flex flex-wrap gap-2">
          {items.map((it) => (
            <span key={ikey(it)} className="flex items-center gap-2 rounded-full border bg-[var(--color-surface-2)]/40 py-1 pl-1 pr-2">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" className={`h-7 w-7 object-cover ${it.type === 'artist' ? 'rounded-full' : 'rounded-md'}`} />
              ) : (
                <span className="h-7 w-7 rounded-md bg-[var(--color-surface-2)]" />
              )}
              <span className="max-w-[140px] truncate text-xs text-white">{it.name}</span>
              <button onClick={() => remove(it)} disabled={busy} className="text-[var(--color-muted)] transition hover:text-[var(--color-rose)] disabled:opacity-50"><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
      )}

      {/* Selector por tipo */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SHOWCASE_TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className={`rounded-full px-3 py-1 text-xs font-medium transition ${tab === t.key ? 'bg-[var(--color-accent)] text-black' : 'border text-[var(--color-muted)] hover:text-white'}`}>{t.label}</button>
        ))}
      </div>
      {candidates.length === 0 ? (
        <p className="text-xs text-[var(--color-muted)]">Sin datos en esta categoría todavía.</p>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {candidates.map((o) => {
            const added = has(o);
            return (
              <button
                key={`${o.type}:${o.id}`} onClick={() => add(o)} disabled={busy || added || full}
                title={full && !added ? `Máximo ${MAX_SHOWCASE}` : undefined}
                className={`flex w-24 shrink-0 flex-col items-center gap-1.5 rounded-xl border p-2 text-center transition disabled:opacity-40 ${
                  added ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10' : 'border-[var(--color-border)] hover:border-white/20'
                }`}
              >
                {o.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.image} alt="" className={`h-14 w-14 object-cover ${o.type === 'artist' ? 'rounded-full' : 'rounded-md'}`} />
                ) : (
                  <div className="h-14 w-14 rounded-md bg-[var(--color-surface-2)]" />
                )}
                <span className="line-clamp-2 text-[10px] leading-tight text-white">{o.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </Section>
  );
}

function AppearanceSection({ user, onSaved }: { user: UserProfile; onSaved: () => void }) {
  const initial = (user.theme && THEMES.some((t) => t.key === user.theme) ? (user.theme as ThemeKey) : null) ?? getSavedTheme();
  const [theme, setTheme] = useState<ThemeKey>(initial);
  useEffect(() => {
    // Account theme is the source of truth; sync it to this device on load.
    if (user.theme && THEMES.some((t) => t.key === user.theme)) {
      setTheme(user.theme as ThemeKey);
      saveTheme(user.theme as ThemeKey);
    }
  }, [user.theme]);

  const current = THEMES.find((t) => t.key === theme) ?? THEMES[0];

  const dna = useSWR('dna', api.musicDna);
  const steam = useSWR('steam:stats', api.steamStats);
  const uctx = {
    level: computeLevel(dna.data?.totals.plays ?? 0, dna.data?.totals.minutes ?? 0, steam.data?.totalHours ?? 0).level,
    plays: dna.data?.totals.plays ?? 0,
    minutes: dna.data?.totals.minutes ?? 0,
    hours: steam.data?.totalHours ?? 0,
  };

  function pick(key: ThemeKey) {
    const t = THEMES.find((x) => x.key === key);
    if (t?.unlock && !t.unlock(uctx)) return; // locked
    setTheme(key);
    saveTheme(key); // applies live across the whole app + this device
    void api.updateProfile({ theme: key }).then(onSaved).catch(() => {}); // sync to account
  }

  return (
    <Section icon={Palette} title="Apariencia" desc="Cambia el ambiente de toda la app. Se aplica al instante y se guarda en tu cuenta (sincroniza entre dispositivos).">
      {/* Live preview — reflects the selected theme's accents + ambient glow */}
      <div
        className="mb-4 overflow-hidden rounded-2xl border p-5"
        style={{
          backgroundImage: `radial-gradient(420px 200px at 15% -20%, ${current.glow1}, transparent), radial-gradient(420px 220px at 95% 130%, ${current.glow2}, transparent)`,
          backgroundColor: 'var(--color-bg)',
        }}
      >
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-muted)]">Vista previa · {current.name}</p>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-black" style={{ backgroundImage: `linear-gradient(90deg, ${current.accent}, ${current.accent2})`, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              Tu universo Sonora
            </p>
            <div className="mt-2 space-y-1.5">
              <div className="h-2 w-40 overflow-hidden rounded-full bg-white/5"><div className="h-full w-3/4 rounded-full" style={{ background: current.accent }} /></div>
              <div className="h-2 w-40 overflow-hidden rounded-full bg-white/5"><div className="h-full w-1/2 rounded-full" style={{ background: current.accent2 }} /></div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className="rounded-full px-4 py-1.5 text-xs font-bold text-black" style={{ background: current.accent }}>Botón</span>
            <span className="rounded-full border px-3 py-1 text-[11px] font-semibold" style={{ borderColor: current.accent2, color: current.accent2 }}>chip</span>
          </div>
        </div>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {THEMES.map((t) => {
          const active = theme === t.key;
          const locked = t.unlock ? !t.unlock(uctx) : false;
          return (
            <button
              key={t.key}
              onClick={() => pick(t.key)}
              disabled={locked}
              title={locked ? `Bloqueado · ${t.req}` : undefined}
              className={`relative flex flex-col gap-2 overflow-hidden rounded-2xl border p-3 text-left transition ${
                active ? 'border-white/50 ring-1 ring-white/20' : 'border-[var(--color-border)] hover:border-white/25'
              } ${locked ? 'cursor-not-allowed' : ''}`}
            >
              <div className={`h-10 w-full rounded-lg ${locked ? 'opacity-30' : ''}`} style={{ background: `linear-gradient(120deg, ${t.accent}, ${t.accent2})` }} />
              {locked && (
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white"><Lock className="h-3.5 w-3.5" /></span>
              )}
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold ${locked ? 'text-[var(--color-muted)]' : 'text-white'}`}>{t.name}</p>
                  <p className="truncate text-[10px] text-[var(--color-muted)]">{locked ? `🔒 ${t.req}` : t.desc}</p>
                </div>
                {active && <Check className="h-4 w-4 shrink-0 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

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
