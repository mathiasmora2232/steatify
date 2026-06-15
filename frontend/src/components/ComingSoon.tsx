export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-24 text-center">
      <div className="mb-4 rounded-full border px-3 py-1 text-xs text-[var(--color-muted)]">
        {phase}
      </div>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-3 max-w-md text-[var(--color-muted)]">
        Esta sección llega en una próxima fase. Mientras tanto, tu historial se sigue
        sincronizando en segundo plano para alimentarla.
      </p>
    </div>
  );
}
