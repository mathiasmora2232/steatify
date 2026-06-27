import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { ToolShell } from '@/components/ToolShell';
import { ShareButton } from '@/components/ShareButton';
import { QUIZZES } from '@/lib/quizzes';

function lookup(slug: string, result: string) {
  const quiz = QUIZZES[slug];
  const res = quiz?.results.find((r) => r.key === result);
  return quiz && res ? { quiz, res } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; result: string }> }) {
  const { slug, result } = await params;
  const found = lookup(slug, result);
  if (!found) return { title: 'Resultado · Sonora' };
  const title = `Soy ${found.res.emoji} ${found.res.title} · Sonora`;
  return { title, description: `${found.res.desc} — Haz el quiz y descubre tu arquetipo en Sonora.` };
}

export default async function QuizResultPage({ params }: { params: Promise<{ slug: string; result: string }> }) {
  const { slug, result } = await params;
  const found = lookup(slug, result);
  if (!found) notFound();
  const { quiz, res } = found;

  return (
    <ToolShell>
      <div className="relative overflow-hidden rounded-3xl border bg-[var(--color-surface)] p-8 text-center" style={{ boxShadow: `inset 0 0 120px -60px ${res.color}` }}>
        <span className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${res.color}, transparent)` }} />
        <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-muted)]">{quiz.title}</p>
        <div className="my-3 text-7xl">{res.emoji}</div>
        <h1 className="text-4xl font-black" style={{ color: res.color }}>{res.title}</h1>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-[var(--color-text)]">{res.desc}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110">
            Verlo de verdad con mis datos <ArrowRight className="h-4 w-4" />
          </Link>
          <ShareButton text={`Soy ${res.emoji} ${res.title} en Sonora. ¿Y tú?`} url={`https://codecanvas3d.com/tools/r/${slug}/${res.key}`} />
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        ¿Quieres saber el tuyo?{' '}
        <Link href={`/tools/${slug}`} className="text-[var(--color-accent)] hover:underline">Haz el quiz</Link>.
      </p>
    </ToolShell>
  );
}
