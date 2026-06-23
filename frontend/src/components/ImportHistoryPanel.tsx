'use client';

import { useRef, useState } from 'react';
import { api, type ImportStatus } from '@/lib/api';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

function buildDoneMessage(result?: ImportStatus['result']): string {
  if (!result) return 'Importación completada.';
  const { imported, total } = result;
  const n = (x: number) => x.toLocaleString();
  if (imported === 0) {
    return `Ya tenías este historial — 0 reproducciones nuevas de ${n(total)}. Subir el mismo archivo otra vez no duplica nada.`;
  }
  const skipped = total - imported;
  const base = `Listo: ${n(imported)} reproducciones añadidas`;
  return skipped > 0
    ? `${base}. (${n(skipped)} ya estaban o tenían el mismo timestamp, así que se omitieron.)`
    : `${base}.`;
}

export function ImportHistoryPanel() {
  const [files, setFiles] = useState<File[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function pickFiles(list: FileList | null) {
    if (!list) return;
    const json = Array.from(list).filter((f) => f.name.endsWith('.json'));
    setFiles(json);
    setMessage(json.length ? null : 'Selecciona archivos .json del export.');
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    pickFiles(e.dataTransfer.files);
  }

  async function start() {
    if (files.length === 0) return;
    setPhase('uploading');
    setMessage(null);
    setProgress(0);
    try {
      const { accepted, jobId } = await api.importSpotify(files);
      setMessage(`${accepted.toLocaleString()} reproducciones en cola. Procesando…`);
      setPhase('processing');
      poll(jobId);
    } catch (err) {
      setPhase('error');
      setMessage(err instanceof Error ? err.message : 'Error al subir.');
    }
  }

  function poll(jobId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      let status: ImportStatus;
      try {
        status = await api.importStatus(jobId);
      } catch {
        return;
      }
      if (!status.found) return;
      setProgress(typeof status.progress === 'number' ? status.progress : 0);

      if (status.state === 'completed') {
        clearInterval(pollRef.current!);
        setPhase('done');
        setProgress(100);
        setMessage(buildDoneMessage(status.result));
      } else if (status.state === 'failed') {
        clearInterval(pollRef.current!);
        setPhase('error');
        setMessage(status.failedReason ?? 'La importación falló.');
      }
    }, 2000);
  }

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Importar historial</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">
        Sube tu <strong>Extended Streaming History</strong> de Spotify para tener años de datos al
        instante. Pídelo en{' '}
        <a
          href="https://www.spotify.com/account/privacy/"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--color-accent)] hover:underline"
        >
          spotify.com/account/privacy
        </a>{' '}
        → “Extended streaming history”. Cuando llegue, sube los archivos{' '}
        <code className="text-[var(--color-text)]">Streaming_History_Audio_*.json</code>.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-[var(--radius-card)] border border-dashed bg-[var(--color-surface)] p-10 text-center transition hover:border-[var(--color-accent)]"
      >
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          multiple
          hidden
          onChange={(e) => pickFiles(e.target.files)}
        />
        <p className="text-[var(--color-text)]">
          {files.length > 0
            ? `${files.length} archivo${files.length > 1 ? 's' : ''} seleccionado${files.length > 1 ? 's' : ''}`
            : 'Arrastra los .json aquí o haz clic para elegir'}
        </p>
        {files.length > 0 && (
          <p className="mt-1 truncate text-xs text-[var(--color-muted)]">
            {files.map((f) => f.name).join(', ')}
          </p>
        )}
      </div>

      <button
        onClick={start}
        disabled={busy || files.length === 0}
        className="mt-5 w-full rounded-full bg-[var(--color-accent)] px-5 py-3 font-semibold text-black transition hover:brightness-110 disabled:opacity-50"
      >
        {phase === 'uploading'
          ? 'Subiendo…'
          : phase === 'processing'
            ? `Procesando… ${progress}%`
            : 'Importar'}
      </button>

      {busy && (
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${Math.max(progress, 5)}%` }}
          />
        </div>
      )}

      {message && (
        <p
          className={`mt-4 rounded-lg border px-4 py-2 text-sm ${
            phase === 'error'
              ? 'border-[var(--color-rose)]/40 bg-[var(--color-rose)]/10 text-[var(--color-rose)]'
              : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
          }`}
        >
          {message}
        </p>
      )}

      <p className="mt-6 text-xs text-[var(--color-muted)]">
        El procesamiento lee los nombres directamente del archivo y sigue corriendo en segundo plano.
      </p>
    </div>
  );
}
