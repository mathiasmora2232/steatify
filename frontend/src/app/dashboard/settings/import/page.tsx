import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ImportHistoryPanel } from '@/components/ImportHistoryPanel';

export default function SettingsImportPage() {
  return (
    <div className="pb-12">
      <Link href="/dashboard/settings" className="mb-5 inline-flex items-center gap-1.5 text-sm text-[var(--color-muted)] transition hover:text-white">
        <ArrowLeft className="h-4 w-4" /> Ajustes
      </Link>
      <ImportHistoryPanel />
    </div>
  );
}
