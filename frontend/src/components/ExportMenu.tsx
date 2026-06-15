'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Printer, ChevronDown } from 'lucide-react';

/** Small dropdown to export the current data as CSV / Excel / PDF. */
export function ExportMenu({
  label = 'Exportar',
  onCSV,
  onExcel,
  onPDF,
}: {
  label?: string;
  onCSV: () => void;
  onExcel: () => void;
  onPDF: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (fn: () => void) => { fn(); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium text-[var(--color-muted)] transition hover:border-[var(--color-accent)]/50 hover:text-white"
      >
        <Download className="h-3.5 w-3.5" /> {label} <ChevronDown className={`h-3 w-3 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded-2xl border bg-[var(--color-surface)] p-1 shadow-xl">
          <Item icon={FileText} label="CSV" onClick={() => pick(onCSV)} />
          <Item icon={FileSpreadsheet} label="Excel (.xls)" onClick={() => pick(onExcel)} />
          <Item icon={Printer} label="PDF / Imprimir" onClick={() => pick(onPDF)} />
        </div>
      )}
    </div>
  );
}

function Item({ icon: Icon, label, onClick }: { icon: typeof FileText; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-[var(--color-text)] transition hover:bg-[var(--color-surface-2)]"
    >
      <Icon className="h-4 w-4 text-[var(--color-muted)]" /> {label}
    </button>
  );
}
