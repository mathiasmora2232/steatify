import { ImageResponse } from 'next/og';
import { QUIZZES } from '@/lib/quizzes';

export const alt = 'Resultado de quiz · Steatify';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const GRAD = 'linear-gradient(120deg, #34e0a1, #3b82f6, #a855f7)';

export default async function OgImage({ params }: { params: Promise<{ slug: string; result: string }> }) {
  const { slug, result } = await params;
  const quiz = QUIZZES[slug];
  const res = quiz?.results.find((r) => r.key === result);
  const color = res?.color ?? '#7c5cff';
  const emoji = res?.emoji ?? '🎵';
  const title = res?.title ?? 'Steatify';
  const kicker = quiz?.title ?? 'Quiz de Steatify';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 64, backgroundColor: '#0a0a0f',
          backgroundImage: `radial-gradient(900px 520px at 50% -10%, ${color}40, transparent), radial-gradient(800px 460px at 50% 120%, ${color}26, transparent)`,
          color: 'white', fontFamily: 'sans-serif', textAlign: 'center',
        }}
      >
        <div style={{ fontSize: 30, color: '#8b8f9c', display: 'flex' }}>{kicker}</div>
        <div style={{ fontSize: 150, margin: '8px 0', display: 'flex' }}>{emoji}</div>
        <div style={{ fontSize: 88, fontWeight: 800, color, display: 'flex' }}>{title}</div>
        <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: 6, backgroundImage: GRAD, backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent', display: 'flex' }}>STEATIFY</span>
          <span style={{ fontSize: 26, color: '#8b8f9c', display: 'flex' }}>· descúbrelo tú</span>
        </div>
      </div>
    ),
    size,
  );
}
