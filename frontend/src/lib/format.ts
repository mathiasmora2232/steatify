/**
 * Formato de dinero y fechas, framework-agnóstico. Adaptado de la librería propia
 * `@librerias/format` (copiada en vez de añadir un git-dependency: son funciones
 * puras y así no atamos el build a un repo externo). Lo clave: las cadenas
 * date-only (YYYY-MM-DD) se parsean como LOCAL para evitar el off-by-one por
 * zona horaria (`new Date("2026-06-09")` se corre un día en zonas UTC-).
 */

export interface DateOptions {
  locale?: string;
  /** Estilo de fecha de Intl. Default 'medium' → "9 jun 2026". */
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Parsea a Date de forma segura; date-only → LOCAL (mediodía) para no correr el día. */
export function parseDate(input: string | number | Date | null | undefined): Date | null {
  if (input == null || input === '') return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'string' && DATE_ONLY.test(input)) {
    const d = new Date(`${input}T12:00:00`);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

/** Formatea una fecha (TZ-safe para date-only). '' si no es válida. */
export function fecha(input: string | number | Date | null | undefined, opts: DateOptions = {}): string {
  const d = parseDate(input);
  if (!d) return '';
  return d.toLocaleDateString(opts.locale || 'es', { dateStyle: opts.dateStyle || 'medium' });
}

/** Formatea fecha + hora. '' si no es válida. */
export function fechaHora(input: string | number | Date | null | undefined, locale = 'es'): string {
  const d = parseDate(input);
  if (!d) return '';
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Solo la hora local HH:MM (24h). '' si no es válida. */
export function hora(input: string | number | Date | null | undefined, locale = 'es'): string {
  const d = parseDate(input);
  if (!d) return '';
  return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Tiempo relativo en español: "hace 2 días", "en 3 h", "ahora". */
export function relativo(input: string | number | Date | null | undefined, base: Date = new Date()): string {
  const d = parseDate(input);
  if (!d) return '';
  const diff = d.getTime() - base.getTime();
  const abs = Math.abs(diff);
  const units: Array<[number, string, string]> = [
    [86400000 * 365, 'año', 'años'],
    [86400000 * 30, 'mes', 'meses'],
    [86400000, 'día', 'días'],
    [3600000, 'hora', 'horas'],
    [60000, 'min', 'min'],
  ];
  if (abs < 45000) return 'hace un momento';
  for (const [ms, sing, plur] of units) {
    const n = Math.floor(abs / ms);
    if (n >= 1) {
      const label = n === 1 ? sing : plur;
      return diff < 0 ? `hace ${n} ${label}` : `en ${n} ${label}`;
    }
  }
  return 'hace un momento';
}

/** Días transcurridos desde una fecha (entero, o null). Reemplaza daysSince duplicados. */
export function daysSince(input: string | number | Date | null | undefined): number | null {
  const d = parseDate(input);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
}

/** Trunca a `max` caracteres con elipsis. */
export function truncar(s: string | null | undefined, max = 80): string {
  const str = String(s ?? '');
  return str.length > max ? `${str.slice(0, max - 1).trimEnd()}…` : str;
}
