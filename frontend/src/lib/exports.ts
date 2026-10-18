/**
 * Exportación de datos tabulares en el navegador, sin dependencias. Adaptado de
 * la librería propia `@librerias/exports`. El CSV es RFC-4180 (separador coma,
 * comillas correctas) + BOM UTF-8 → lo parsean bien Numbers, Excel y Sheets
 * (el separador `;` rompía en Numbers/Mac y partía los géneros que llevan comas).
 */

export type Col<T> = { header: string; value: (row: T) => unknown };

/** Celda CSV RFC-4180: entrecomilla si tiene coma, comilla, salto o espacios al borde. */
function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) || /^\s|\s$/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const esc = (v: unknown) =>
  String(v == null ? '' : v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

/** Descarga `rows` como CSV estándar (coma, RFC-4180, BOM). Universal. */
export function downloadCSV<T>(filename: string, rows: T[], columns: Col<T>[]): void {
  const head = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(',')).join('\r\n');
  const csv = '﻿' + head + '\r\n' + body; // BOM para que Excel respete UTF-8
  triggerDownload(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/** Descarga `rows` como Excel (.xls) — tabla HTML que Excel/Numbers abren nativamente. */
export function downloadExcel<T>(filename: string, rows: T[], columns: Col<T>[]): void {
  const head = `<tr>${columns.map((c) => `<th style="background:#1db954;color:#fff;padding:6px;text-align:left">${esc(c.header)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td style="padding:5px;border:1px solid #ddd">${esc(c.value(r))}</td>`).join('')}</tr>`).join('');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>${head}${body}</table></body></html>`;
  triggerDownload(new Blob(['﻿' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), filename.endsWith('.xls') ? filename : `${filename}.xls`);
}

/** Abre una ventana imprimible (→ "Guardar como PDF"). Estética dark/Steatify. */
export function printRows<T>(titulo: string, rows: T[], columns: Col<T>[], generadoEn?: string): void {
  const head = `<tr>${columns.map((c) => `<th>${esc(c.header)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${columns.map((c) => `<td>${esc(c.value(r))}</td>`).join('')}</tr>`).join('');
  const sello = generadoEn ?? new Date().toLocaleString('es');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
  <style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;padding:28px}
  h1{font-size:20px;margin:0 0 4px}.sub{color:#888;font-size:12px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:13px}th{background:#1db954;color:#fff;text-align:left;padding:8px}
  td{padding:7px 8px;border-bottom:1px solid #eee}tr:nth-child(even) td{background:#f4faf6}</style></head><body>
  <h1>${esc(titulo)}</h1><div class="sub">Steatify · generado el ${esc(sello)}</div>
  <table>${head}${body}</table>
  <script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
