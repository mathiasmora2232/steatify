import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { PlansPanel } from '@/components/PlansPanel';

export default function SettingsPlansPage() {
  return (
    <div>
      <Link href="/dashboard/settings" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Ajustes
      </Link>
      <PlansPanel />
    </div>
  );
}
