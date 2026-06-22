import type { Metadata } from 'next';

interface ProfileLite {
  username?: string | null;
  displayName?: string | null;
  personalityName?: string;
  personality?: { label?: string };
}

/** Per-profile share metadata (title/description). The image comes from
 *  opengraph-image.tsx in this same segment. */
export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  const base = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:4000';
  let d: ProfileLite | null = null;
  try {
    const r = await fetch(`${base}/api/profiles/${encodeURIComponent(username)}`, { cache: 'no-store' });
    if (r.ok) d = (await r.json()) as ProfileLite;
  } catch {
    /* generic fallback */
  }
  const name = d?.displayName || d?.username || username;
  const klass = d?.personalityName || d?.personality?.label;
  const title = `${name} · Sonora`;
  const description = klass
    ? `${klass} — mira mi universo de música y gaming en Sonora.`
    : 'Mi universo de música y gaming en Sonora.';
  return {
    title,
    description,
    openGraph: { title, description, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default function UserProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
