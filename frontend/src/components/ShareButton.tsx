'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';

export function ShareButton({ text, url, label = 'Compartir' }: { text: string; url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: 'Sonora', text, url });
      else { await navigator.clipboard.writeText(`${text} ${url}`); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    } catch { /* cancelled */ }
  }
  return (
    <button onClick={share} className="inline-flex items-center gap-1.5 rounded-full border px-4 py-3 text-sm font-medium text-[var(--color-text)] transition hover:border-[var(--color-accent-2)]">
      <Share2 className="h-4 w-4" /> {copied ? '¡Copiado!' : label}
    </button>
  );
}
