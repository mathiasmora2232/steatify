'use client';

export function Input({
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      placeholder={placeholder}
      className="w-full rounded-xl border bg-[var(--color-surface)] px-4 py-3 text-sm outline-none focus:border-[var(--color-accent)]"
    />
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
