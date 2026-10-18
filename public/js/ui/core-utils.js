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


/* ── Formateador Unificado de Nombres ───────────────────────────────────── */
export function formatearNombre(p) {
  if (!p) return '—';
  if (typeof p === 'string') return p;
  const ap = (p.apellidos || '').trim();
  const nom = (p.nombres || '').trim();
  if (ap && nom) return `${ap}, ${nom}`;
  return ap || nom || '—';
}

export function formatPersonName(person) {
  return formatearNombre(person);
}

/* ── Paleta oficial y deductores de tipos de ficha ────────────────────── */
export const FICHA_PALETTE = [
  { id: 'blue', name: 'Azul Institucional', hex: '#1E40AF', bg: '#EFF6FF', border: '#93C5FD' },
  { id: 'emerald', name: 'Verde Esmeralda', hex: '#047857', bg: '#ECFDF5', border: '#6EE7B7' },
  { id: 'purple', name: 'Púrpura', hex: '#6D28D9', bg: '#F5F3FF', border: '#C4B5FD' },
  { id: 'amber', name: 'Ámbar Dorado', hex: '#B45309', bg: '#FFFBEB', border: '#FCD34D' },
  { id: 'crimson', name: 'Rojo Carmesí', hex: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5' },
  { id: 'teal', name: 'Turquesa Oscuro', hex: '#0F766E', bg: '#F0FDFA', border: '#5EEAD4' },
  { id: 'indigo', name: 'Índigo', hex: '#4338CA', bg: '#EEF2FF', border: '#A5B4FC' },
  { id: 'cyan', name: 'Cian Profundo', hex: '#0E7490', bg: '#ECFEFF', border: '#67E8F9' },
  { id: 'rose', name: 'Rosa Palo', hex: '#BE185D', bg: '#FDF2F8', border: '#F472B6' },
  { id: 'slate', name: 'Gris Pizarra', hex: '#334155', bg: '#F8FAFC', border: '#94A3B8' },
];

/** Asigna o deduce un color accesible y consistente para un tipo de ficha */
export function getFichaColor(ft, index = 0) {
  if (ft && ft.color) {
    const hex = String(ft.color).trim();
    const found = FICHA_PALETTE.find(p => p.hex.toLowerCase() === hex.toLowerCase() || p.id === hex.toLowerCase());
    if (found) return found;
    return { id: 'custom', name: 'Personalizado', hex: hex, bg: '#F8FAFC', border: hex };
  }
  let hash = 0;
  const str = (ft && (ft.id || ft.nombre)) ? String(ft.id || ft.nombre) : String(index);
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  const idx = Math.abs(hash) % FICHA_PALETTE.length;
  return FICHA_PALETTE[idx];
}

/** Deduce la modalidad o nivel institucional a partir del nombre o metadatos de la ficha */
export function getFichaModalidad(ft) {
  if (ft && ft.modalidad && String(ft.modalidad).trim()) return String(ft.modalidad).trim();
  const text = ((ft && ft.nombre) || '' + ' ' + ((ft && ft.descripcion) || '')).toUpperCase();
  if (text.includes('CEBE') && text.includes('PRITE')) return 'CEBE / PRITE';
  if (text.includes('CEBE')) return 'CEBE';
  if (text.includes('PRITE')) return 'PRITE';
  if (text.includes('JEC')) return 'JEC';
  if (text.includes('DIRECTIVO')) return 'Directivos';
  if (text.includes('DOCENTE') || text.includes('RÚBRICA') || text.includes('RUBRICA') || text.includes('AULA')) return 'Docentes';
  if (text.includes('TUTORÍA') || text.includes('TUTORIA')) return 'Tutoría (JEC)';
  if (text.includes('EBR')) return 'EBR';
  if (text.includes('EBA')) return 'EBA';
  return 'General';
}
