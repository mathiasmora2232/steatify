import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';

/** Inline upsell shown where a feature is gated by plan. */
export function UpgradeCard({ title, desc, plan = 'Plus' }: { title: string; desc: string; plan?: 'Plus' | 'Pro' }) {
  const color = plan === 'Pro' ? '#fbbf24' : '#7c5cff';
  return (
    <div className="rounded-3xl border p-6 text-center" style={{ borderColor: `${color}55`, boxShadow: `inset 0 0 120px -60px ${color}` }}>
      <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${color}1f`, color }}>
        <Sparkles className="h-6 w-6" />
      </span>
      <p className="text-lg font-bold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm text-[var(--color-muted)]">{desc}</p>
      <span className="mt-3 inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: `${color}22`, color }}>
        Steatify {plan}
      </span>
      <div className="mt-4">
        <Link href="/dashboard/settings/plans" className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-black transition hover:brightness-110" style={{ background: color }}>
          Ver planes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
