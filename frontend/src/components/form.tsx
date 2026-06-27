'use client';

export function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
  label,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  label?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">{label}</span>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)]/50 px-4 py-3.5 text-[15px] text-white outline-none transition placeholder:text-[var(--color-muted)] focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/15"
      />
    </label>
  );
}

/** Extract a friendly message from a thrown `API <status>: <json>` error. */
export function parseErr(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const m = msg.match(/API \d+: (.+)/);
  if (m) {
    try {
      const body = JSON.parse(m[1]);
      return Array.isArray(body.message) ? body.message[0] : (body.message ?? msg);
    } catch {
      return m[1];
    }
  }
  return msg;
}
