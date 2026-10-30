/* =========================================================================
   core/utils/dates.js — Utilidades de fechas e identificadores únicos
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

/** Genera un identificador único alfanumérico */
export function genId() {
  return 'i' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

/** Retorna la fecha actual en formato ISO corto (YYYY-MM-DD) */
export function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

/** Formatea una fecha YYYY-MM-DD a DD/MM/YYYY */
export function fmtDate(s) {
  if (!s) return '—';
  const p = s.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s;
}

