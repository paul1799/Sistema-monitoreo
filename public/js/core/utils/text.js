/* =========================================================================
   core/utils/text.js — Utilidades de texto, normalización y escape
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

/** Escapa caracteres HTML para prevenir inyecciones XSS en el DOM */
export function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Normaliza texto eliminando tildes, mayúsculas y espacios duplicados */
export function normalizeText(s) {
  return String(s === undefined || s === null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Normaliza el nombre de una institución educativa para comparaciones */
export function normalizeInstName(s) {
  return normalizeText(s)
    .replace(/^i\s*\.\s*e\s*\.\s*/i, 'ie ')
    .replace(/^i\s*\.\s*e\s+/i, 'ie ')
    .replace(/\bn[°ºo]?\s*(\d+)/gi, 'n $1');
}

/**
 * Normaliza cualquier valor de RED o REI institucional a su formato numérico oficial de 2 dígitos.
 * Ejemplos: "01" -> "01", "1" -> "01", "REI 01" -> "01", "RED 04" -> "04", "16" -> "16", "No aplica" -> ""
 */
export function normalizeReiNumber(val) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str.toLowerCase().includes('no aplica')) return '';
  const match = str.match(/\d+/);
  if (!match) return '';
  const num = parseInt(match[0], 10);
  if (isNaN(num)) return '';
  return String(num).padStart(2, '0');
}

/**
 * Normaliza una lista de REDs o REIs (separadas por comas, barras o espacios)
 * garantizando formato oficial de 2 dígitos sin duplicados.
 * Ejemplos: "REI 01" -> "01", "REI 01 y 01" -> "01", "01, 03" -> "01, 03", "RED 01 / RED 04" -> "01, 04"
 */
export function normalizeReiList(val) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str.toLowerCase().includes('no aplica')) return '';
  const matches = str.match(/\d+/g);
  if (!matches || !matches.length) return '';
  const uniqueNums = Array.from(new Set(matches.map(m => String(parseInt(m, 10)).padStart(2, '0')))).sort((a, b) => Number(a) - Number(b));
  return uniqueNums.join(', ');
}

/** Escapa valores individuales para formato CSV */
export function csvEscape(v) {
  v = String(v === undefined || v === null ? '' : v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

