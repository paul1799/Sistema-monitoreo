/* =========================================================================
   core-utils.js — Utilidades fundamentales, formateadores y normalizadores
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

/** Escapa caracteres HTML para prevenir inyecciones XSS en el DOM */
export function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

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

/** Muestra un mensaje flotante temporal (toast notification) */
export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(() => t.classList.remove('show'), 2800);
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

/** Extrae valores únicos para sugerencias de autocompletado en campos del formulario */
export function seedSuggestions(field, submissions) {
  if (field === 'red' || field === 'rei') {
    return Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));
  }
  const set = new Set();
  (submissions || []).forEach(s => { if (s[field]) set.add(s[field]); });
  return Array.from(set).sort();
}

/** Escapa valores individuales para formato CSV */
export function csvEscape(v) {
  v = String(v === undefined || v === null ? '' : v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
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

/** Limpia recursivamente un objeto para Firestore: convierte undefined en "" y NaN en 0 */
export function cleanForFirestore(val) {
  if (val === undefined) return '';
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => cleanForFirestore(item));
  }
  const res = {};
  for (const k of Object.keys(val)) {
    const v = val[k];
    if (v === undefined) {
      res[k] = '';
    } else if (typeof v === 'number' && isNaN(v)) {
      res[k] = 0;
    } else if (v !== null && typeof v === 'object') {
      res[k] = cleanForFirestore(v);
    } else {
      res[k] = v;
    }
  }
  return res;
}

/* ── Estado de Edición de Fichas ────────────────────────────────────────── */
let editingSubmissionId = null;
let editingSubmissionData = null;

export function setEditMode(id, data) {
  editingSubmissionId = id;
  editingSubmissionData = data ? JSON.parse(JSON.stringify(data)) : null;
}

export function clearEditMode() {
  editingSubmissionId = null;
  editingSubmissionData = null;
}

export function getEditingSubmission() {
  return { id: editingSubmissionId, data: editingSubmissionData };
}

/* ── Componente de Barra de Porcentaje ─────────────────────────────────── */
export function bar(pct, customClsOrStatus, fichaType = null) {
  const w = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  let cls = 'none';
  if (customClsOrStatus && typeof customClsOrStatus === 'string') {
    const s = String(customClsOrStatus).toLowerCase().trim();
    if (s.includes('ok') || s.includes('lograd') || s.includes('cumple')) cls = 'ok';
    else if (s.includes('warn') || s.includes('proces') || s.includes('parcial')) cls = 'warn';
    else if (s.includes('danger') || s.includes('inici') || s.includes('mejorar') || s.includes('no cumple')) cls = 'danger';
    else cls = customClsOrStatus;
  } else if (pct !== null && pct !== undefined) {
    cls = pct >= 67 ? 'ok' : (pct >= 34 ? 'warn' : 'danger');
  }
  return '<div class="barTrack" title="' + (pct === null ? 'Sin datos' : pct + '%') + '"><div class="barFill ' + cls + '" style="width:' + w + '%"></div></div>';
}

/* ── Formateador Unificado de Nombres ───────────────────────────────────── */
export function formatearNombre(p) {
  if (!p) return '—';
  if (typeof p === 'string') return p;
  const ap = (p.apellidos || '').trim();
  const nom = (p.nombres || '').trim();
  if (ap && nom) return `${ap}, ${nom}`;
  return ap || nom || '—';
}
