/* =========================================================================
   core/utils/dom.js — Manipulación del DOM, toasts, scroll y descargas
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import { csvEscape } from './text.js';

/** Muestra un mensaje flotante temporal (toast notification) */
export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(() => t.classList.remove('show'), 2800);
}

/** Extrae valores únicos para sugerencias de autocompletado en campos del formulario */
export function seedSuggestions(field, submissions) {
  if (field === 'red' || field === 'rei') {
    return Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));
  }
  const set = new Set();
  (submissions || []).forEach(s => { if (s[field]) set.add(s[field]); });
  return Array.from(set).sort();
}

/** Dispara la descarga en el navegador de un archivo CSV */
export function downloadCsv(filename, header, rows) {
  const csv = header.map(csvEscape).join(',') + '\n' + rows.map(r => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Archivo descargado.');
}

/* ============================= CONTROL DE SCROLL Y MODALES ============================= */
let _activeModalCount = 0;

export function lockBodyScroll() {
  _activeModalCount++;
  if (_activeModalCount === 1) {
    document.body.classList.add('modal-open');
  }
}

export function unlockBodyScroll() {
  _activeModalCount = Math.max(0, _activeModalCount - 1);
  if (_activeModalCount === 0) {
    document.body.classList.remove('modal-open');
  }
}

export function forceResetBodyScroll() {
  _activeModalCount = 0;
  document.body.classList.remove('modal-open');
}

