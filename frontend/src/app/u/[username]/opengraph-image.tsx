import { ImageResponse } from 'next/og';
import { computeLevel } from '@/lib/level';

export const alt = 'Perfil de Steatify';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GRAD = 'linear-gradient(120deg, #34e0a1, #3b82f6, #a855f7)';
const fmt = (n: number) => Math.round(n).toLocaleString('es');

interface ProfileLite {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  private?: boolean;
  personalityName?: string;
  personality?: { label?: string; emoji?: string };
  music?: { minutes?: number; plays?: number; uniqueArtists?: number } | null;
  gaming?: { hours?: number } | null;
}

export default async function OgImage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const base = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:4000';

  let d: ProfileLite | null = null;
  try {
    const res = await fetch(`${base}/api/profiles/${encodeURIComponent(username)}`, { cache: 'no-store' });
    if (res.ok) d = (await res.json()) as ProfileLite;
  } catch {
    /* fall through to a generic Steatify card */
  }

  const name = d?.displayName || d?.username || username;
  const minutes = d?.music?.minutes ?? 0;
  const hours = d?.gaming?.hours ?? 0;
  const artists = d?.music?.uniqueArtists ?? 0;
  const level = computeLevel(d?.music?.plays ?? 0, minutes, hours);
  const klass = d?.personality?.label || d?.personalityName || '';
  const emoji = d?.personality?.emoji ?? '';
  // Only http(s) avatars render reliably in the image renderer (skip data: URIs).
  const avatar = typeof d?.avatarUrl === 'string' && d.avatarUrl.startsWith('http') ? d.avatarUrl : null;
  const isPrivate = !!d?.private || (!d?.music && !d?.gaming);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          backgroundColor: '#0a0a0f',
          backgroundImage:
            'radial-gradient(900px 520px at 12% -20%, rgba(52,224,161,0.25), transparent), radial-gradient(900px 520px at 92% 120%, rgba(168,85,247,0.30), transparent)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Identity */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} width={140} height={140} style={{ borderRadius: 999, border: '5px solid rgba(255,255,255,0.12)' }} alt="" />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 140,
                height: 140,
                borderRadius: 999,
                backgroundColor: '#161922',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 70,
                fontWeight: 800,
              }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 34 }}>
            <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.04 }}>{name}</div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 14 }}>
              <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, padding: '8px 20px', borderRadius: 999, backgroundColor: 'rgba(124,92,255,0.25)', color: '#c4b5fd' }}>
                LV {level.level} · {level.rarity}
              </div>
              {klass ? (
                <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, marginLeft: 16, padding: '8px 20px', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)' }}>
                  {emoji} {klass}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Stats */}
        {isPrivate ? (
          <div style={{ display: 'flex', fontSize: 44, color: '#8b8f9c' }}>Un universo Steatify 🔒</div>
        ) : (
          <div style={{ display: 'flex' }}>
            <Stat value={fmt(minutes)} label="MIN DE MÚSICA" color="#34e0a1" />
            <Stat value={fmt(hours)} label="HORAS GAMING" color="#a855f7" />
            <Stat value={fmt(artists)} label="ARTISTAS" color="#3b82f6" />
          </div>
        )}

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', fontSize: 48, fontWeight: 800, letterSpacing: 8, backgroundImage: GRAD, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
              STEATIFY
            </div>
            <div style={{ display: 'flex', fontSize: 24, color: '#8b8f9c', marginTop: 6 }}>Tu universo. Tu historia. Tus datos.</div>
          </div>
          <div style={{ display: 'flex', fontSize: 26, color: '#9aa0ad' }}>@{d?.username || username}</div>
        </div>
      </div>
    ),
    size,
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginRight: 72 }}>
      <div style={{ display: 'flex', fontSize: 92, fontWeight: 800, color }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 24, letterSpacing: 2, color: '#8b8f9c' }}>{label}</div>
    </div>
  );
}
