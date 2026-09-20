/* =========================================================================
   ui.js — Manejo del DOM, eventos, renderizado de vistas, pestañas y modales.
   ========================================================================= */

import { AI_SCAN_ENDPOINT } from './firebase-config.js?v=20260918_v8';
import {
  createOfficialPdfDocument,
  exportFichaIndividualPdf,
  exportConsolidadoReportPdf,
  exportConcursosReportPdf,
  exportActaOrdenMeritoPdf,
  exportColegiosReportPdf,
  formatDate,
  formatPersonName,
  formatResolucionRef,
  formatPuestoLabel,
  puestoRank,
  generateVerificationCode,
  getLimaDateStr
} from './pdf-template.js?v=20260919_v1';

/* ============================= CONSTANTES COMPARTIDAS ============================= */
export const RESPONSE_OPTIONS = {
  si_no:     [{ v: 'si', l: 'Sí' }, { v: 'no', l: 'No' }, { v: 'na', l: 'N/A' }],
  escala_1_3:[{ v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: 'na', l: 'N/A' }],
  nivel_1_4: [{ v: '1', l: 'I' }, { v: '2', l: 'II' }, { v: '3', l: 'III' }, { v: '4', l: 'IV' }, { v: 'na', l: 'N/A' }],
  ips:       [{ v: 'inicio', l: 'Inicio' }, { v: 'proceso', l: 'Proceso' }, { v: 'logrado', l: 'Logrado' }, { v: 'na', l: 'N/A' }],
};
export const RESPONSE_LABELS = {
  si_no: 'Sí / No',
  escala_1_3: 'Escala 1–3',
  nivel_1_4: 'Rúbrica Nivel I–IV',
  ips: 'Inicio / Proceso / Logrado',
};
export const OPTION_COLORS = {
  si_no:     { si: 'var(--ok)', no: 'var(--danger)', na: 'var(--neutral)' },
  escala_1_3:{ '1': 'var(--danger)', '2': 'var(--warn)', '3': 'var(--ok)', na: 'var(--neutral)' },
  nivel_1_4: { '1': 'var(--danger)', '2': 'var(--warn)', '3': '#34D399', '4': 'var(--ok)', na: 'var(--neutral)' },
  ips:       { inicio: 'var(--danger)', proceso: 'var(--warn)', logrado: 'var(--ok)', na: 'var(--neutral)' },
};

/* ============================= USUARIO DE SESIÓN ============================= */
let _currentSessionUser = null;
export function setSessionUser(user) {
  if (user) _currentSessionUser = user;
}

/* ============================= ESTADO DE EDICIÓN Y ORDEN ============================= */
let editingSubmissionId   = null;
let editingSubmissionData = null;
let dashboardSortAsc      = true; // Por defecto: urgente (menor avance) arriba

/** Activa el modo edición de una ficha ya registrada. Llamar antes de navegar a 'registrar'. */
export function setEditMode(id, data) {
  editingSubmissionId   = id;
  editingSubmissionData = data ? JSON.parse(JSON.stringify(data)) : null;
}

/* ============================= UTILIDADES ============================= */
export function esc(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function genId() {
  return 'i' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
export function todayStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}
export function fmtDate(s) {
  if (!s) return '—';
  const p = s.split('-');
  return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : s;
}
export function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(showToast._h);
  showToast._h = setTimeout(() => t.classList.remove('show'), 2800);
}
export function scoreValue(tipo, v) {
  if (v === undefined || v === null || v === '' || v === 'na') return null;
  if (tipo === 'si_no')     return v === 'si' ? 1 : (v === 'no' ? 0 : null);
  if (tipo === 'escala_1_3') return Math.max(0, Math.min(1, (Number(v)) / 3));
  if (tipo === 'nivel_1_4') return Math.max(0, Math.min(1, (Number(v)) / 4));
  if (tipo === 'ips')       return v === 'logrado' ? 1 : (v === 'proceso' ? 0.5 : (v === 'inicio' ? 0 : null));
  return null;
}
export function statusFromPct(pct) {
  if (pct === null || pct === undefined) return { label: 'Sin datos', cls: 'st-none' };
  if (pct >= 85) return { label: 'Logrado', cls: 'st-logrado' };
  if (pct >= 70) return { label: 'En proceso', cls: 'st-proceso' };
  return { label: 'Por mejorar', cls: 'st-inicio' };
}
export function colorForPct(pct) {
  if (pct === null || pct === undefined) return 'var(--neutral)';
  if (pct >= 85) return 'var(--ok)';
  if (pct >= 70) return 'var(--warn)';
  return 'var(--danger)';
}
export function normalizeText(s) {
  return String(s === undefined || s === null ? '' : s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/* ============================= HELPERS DE RENDER ============================= */
export function bar(pct) {
  const w = pct === null || pct === undefined ? 0 : pct;
  const cls = pct === null || pct === undefined ? 'none' : (pct >= 85 ? 'ok' : (pct >= 70 ? 'warn' : 'danger'));
  return '<div class="barTrack" title="' + (pct === null ? 'Sin datos' : pct + '%') + '"><div class="barFill ' + cls + '" style="width:' + w + '%"></div></div>';
}

export function donutChart(parts, opts) {
  opts = opts || {};
  const size = opts.size || 150, stroke = opts.stroke || 22, r = (size / 2) - stroke / 2;
  const cx = size / 2, cy = size / 2, circ = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + p.value, 0);
  let offset = 0;
  const segs = total
    ? parts.filter(p => p.value > 0).map(p => {
      const dash = (p.value / total) * circ;
      const html = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
        '" fill="none" stroke="' + p.color + '" stroke-width="' + stroke +
        '" stroke-dasharray="' + dash.toFixed(2) + ' ' + (circ - dash).toFixed(2) +
        '" stroke-dashoffset="' + (-offset).toFixed(2) +
        '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><title>' +
        esc(p.label || '') + ': ' + p.value + '</title></circle>';
      offset += dash;
      return html;
    }).join('')
    : '<circle cx="' + cx + '" cy="' + cy + '" r="' + r +
      '" fill="none" stroke="var(--border)" stroke-width="' + stroke + '"></circle>';

  const centerLabel = opts.centerLabel !== undefined ? opts.centerLabel : (total || '');
  const centerSub = opts.centerSub || '';
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '" role="img">' +
    segs +
    '<text x="' + cx + '" y="' + (cy - (centerSub ? 4 : -4)) +
    '" text-anchor="middle" font-family="var(--serif)" font-weight="700" font-size="24" fill="var(--navy-900)">' +
    esc(String(centerLabel)) + '</text>' +
    (centerSub
      ? '<text x="' + cx + '" y="' + (cy + 17) +
        '" text-anchor="middle" font-family="var(--sans)" font-size="11" font-weight="600" fill="var(--text-600)">' +
        esc(centerSub) + '</text>'
      : '') +
    '</svg>';
}

export function stackedBar(counts, total, tipoRespuesta) {
  const opts = RESPONSE_OPTIONS[tipoRespuesta];
  const colors = OPTION_COLORS[tipoRespuesta];
  if (!total) return '<div class="segbar" style="height:12px"></div>';
  const segs = opts.map(o => {
    const c = counts[o.v] || 0;
    if (!c) return '';
    return '<div style="width:' + (c / total * 100) + '%;background:' + colors[o.v] + '" title="' + o.l + ': ' + c + '"></div>';
  }).join('');
  return '<div class="segbar" style="height:12px">' + segs + '</div>';
}

export function computeStats(sub, ft) {
  if (!ft || !sub.respuestas) return { pct: null, secciones: [] };
  const valMap = {};
  sub.respuestas.forEach(r => valMap[r.id] = r.valor);
  let totalScore = 0, count = 0;
  const secciones = ft.secciones.map(sec => {
    let s = 0, c = 0;
    sec.items.forEach(it => {
      const sc = scoreValue(ft.tipoRespuesta, valMap[it.id]);
      if (sc !== null) { s += sc; c++; totalScore += sc; count++; }
    });
    return { nombre: sec.nombre, pct: c ? Math.round((s / c) * 100) : null, answered: c, total: sec.items.length };
  });
  return { pct: count ? Math.round((totalScore / count) * 100) : null, secciones };
}

export function computeItemAgg(subs, ft) {
  return ft.secciones.map(sec => {
    const items = sec.items.map(it => {
      const counts = {};
      let scoreSum = 0, scoreCnt = 0, total = 0;
      subs.forEach(s => {
        const r = (s.respuestas || []).find(x => x.id === it.id);
        if (r) {
          counts[r.valor] = (counts[r.valor] || 0) + 1;
          total++;
          const sc = scoreValue(ft.tipoRespuesta, r.valor);
          if (sc !== null) { scoreSum += sc; scoreCnt++; }
        }
      });
      return { texto: it.texto, id: it.id, counts, total, pct: scoreCnt ? Math.round(scoreSum / scoreCnt * 100) : null };
    });
    const secTotal = items.reduce((a, i) => a + (i.pct !== null ? 1 : 0), 0);
    const secAvg = secTotal ? Math.round(items.filter(i => i.pct !== null).reduce((a, i) => a + i.pct, 0) / secTotal) : null;
    return { nombre: sec.nombre, items, avg: secAvg };
  });
}

export function renderItemReportHtml(itemAgg, tipoRespuesta) {
  const legendMap = {
    '1': '1 = No logrado / Inicio',
    '2': '2 = En proceso',
    '3': '3 = Logrado',
    'na': 'N/A = No aplica',
    'si': 'Sí = Cumple',
    'no': 'No = No cumple',
    'inicio': 'Inicio = Por mejorar',
    'proceso': 'Proceso = En proceso',
    'logrado': 'Logrado = Cumplido'
  };

  const legend = (RESPONSE_OPTIONS[tipoRespuesta] || []).map(o => {
    const text = legendMap[o.v] || o.l;
    const col = (OPTION_COLORS[tipoRespuesta] && OPTION_COLORS[tipoRespuesta][o.v]) || 'var(--neutral)';
    return '<span><span class="dot" style="background:' + col + '"></span>' + esc(text) + '</span>';
  }).join('');

  const sections = itemAgg.map((sec, si) => {
    const secStatus = statusFromPct(sec.avg);
    const tableRows = sec.items.map((it, idx) => {
      const itStatus = statusFromPct(it.pct);
      const respPills = (RESPONSE_OPTIONS[tipoRespuesta] || []).map(o => {
        const cnt = it.counts[o.v] || 0;
        if (!cnt) return '';
        const col = (OPTION_COLORS[tipoRespuesta] && OPTION_COLORS[tipoRespuesta][o.v]) || 'var(--neutral)';
        return '<span style="display:inline-flex;align-items:center;gap:3px;margin-right:6px;font-size:11px"><span class="dot" style="width:8px;height:8px;background:' + col + '"></span>' + esc(o.l) + ': <strong>' + cnt + '</strong></span>';
      }).join('');

      return '<tr>' +
        '<td style="text-align:center;font-weight:700;color:var(--primary)">' + (idx + 1) + '</td>' +
        '<td><strong>' + esc(it.texto) + '</strong></td>' +
        '<td style="text-align:center"><span class="badge ' + itStatus.cls + '">' + itStatus.label + '</span></td>' +
        '<td><div style="margin-bottom:3px">' + stackedBar(it.counts, it.total, tipoRespuesta) + '</div>' + respPills + '</td>' +
        '<td style="text-align:right;font-weight:700;font-variant-numeric:tabular-nums">' + (it.pct === null ? '—' : it.pct + '%') + '</td>' +
      '</tr>';
    }).join('');

    return '<details class="secDetails"' + (si === 0 ? ' open' : '') + ' data-secitem="' + si + '">' +
      '<summary>' +
        '<div class="secSummaryLeft">' +
          '<span class="secChevron">▶</span>' +
          '<strong>' + esc(sec.nombre) + '</strong>' +
          '<span style="font-size:12px;color:var(--text-600);font-weight:400">(' + sec.items.length + ' indicadores)</span>' +
        '</div>' +
        '<div class="secSummaryRight">' +
          bar(sec.avg) +
          '<span style="font-weight:700;font-size:13px;min-width:42px;text-align:right">' + (sec.avg === null ? '—' : sec.avg + '%') + '</span>' +
          '<span class="badge ' + secStatus.cls + '">' + secStatus.label + '</span>' +
        '</div>' +
      '</summary>' +
      '<div class="secDetailsBody">' +
        '<div class="tblWrap"><table class="itemTable"><thead><tr>' +
          '<th style="width:40px;text-align:center">N.°</th>' +
          '<th>Indicador / Ítem</th>' +
          '<th style="width:110px;text-align:center">Resultado</th>' +
          '<th style="min-width:180px">Distribución (n=' + (sec.items[0] ? sec.items[0].total : 0) + ')</th>' +
          '<th style="width:60px;text-align:right">%</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody></table></div>' +
      '</div>' +
    '</details>';
  }).join('');

  return '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">' +
    '<div class="itemReportLegend" style="margin-bottom:0">' + legend + '</div>' +
    '<button type="button" class="btn secondary small" id="toggleAllItemsBtn">⊞ Expandir / Contraer todo</button>' +
  '</div>' + sections;
}

export function seedSuggestions(field, submissions) {
  const set = new Set();
  submissions.forEach(s => { if (s[field]) set.add(s[field]); });
  return Array.from(set).sort();
}

export function csvEscape(v) {
  v = String(v === undefined || v === null ? '' : v);
  if (/[",\n]/.test(v)) return '"' + v.replace(/"/g, '""') + '"';
  return v;
}

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

/* ============================= EXPORTAR PDF ============================= */
export async function exportReportPdf(el, title, btnEl) {
  if (!el) { showToast('No hay reporte para exportar.'); return; }
  const originalText = btnEl ? btnEl.textContent : null;
  if (btnEl) { btnEl.disabled = true; btnEl.textContent = 'Generando PDF...'; }
  try {
    showToast('Generando documento oficial en PDF...');
  } catch (err) {
    console.error('PDF export error', err);
    showToast('No se pudo generar el PDF.');
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.textContent = originalText; }
  }
}

/* ============================= DIÁLOGO UNIVERSAL "CONFIGURAR DESCARGA" (PARTE A / D) ============================= */
export const DEFAULT_AREAS = [
  { id: 'agebre', nombre: 'Área de Gestión de la Educación Básica Regular y Especial', sigla: 'AGEBRE', descripcionEncabezado: 'Área de Gestión de la\nEducación Básica (2026)', logo: '', activa: true, esPredeterminada: true, orden: 1 },
  { id: 'agebatp', nombre: 'Área de Gestión de la Educación Básica Alternativa y Técnico-Productiva', sigla: 'AGEBATP', descripcionEncabezado: 'Área de Gestión de la Educ. Básica\nAlternativa y Técnico-Prod. (2026)', logo: '', activa: true, esPredeterminada: false, orden: 2 },
  { id: 'agp', nombre: 'Área de Gestión Pedagógica', sigla: 'AGP', descripcionEncabezado: 'Área de Gestión Pedagógica\nUGEL 03 (2026)', logo: '', activa: true, esPredeterminada: false, orden: 3 },
  { id: 'agi', nombre: 'Área de Gestión Institucional', sigla: 'AGI', descripcionEncabezado: 'Área de Gestión Institucional\nUGEL 03 (2026)', logo: '', activa: true, esPredeterminada: false, orden: 4 },
  { id: 'dir_ugel', nombre: 'Dirección de la UGEL N.° 03', sigla: 'DIRECCIÓN', descripcionEncabezado: 'Dirección de la Unidad de Gestión\nEducativa Local N.° 03', logo: '', activa: true, esPredeterminada: false, orden: 5 }
];

export const DEFAULT_PLANTILLAS = [
  // Concursos
  { tipoReporte: 'concursos', orden: 1, cargo: 'Coordinador(a) del Concurso — Comisión Organizadora UGEL 03', nombreOpcional: '', entidad: 'Comisión Organizadora UGEL 03', leyenda: 'Firma y Sello' },
  { tipoReporte: 'concursos', orden: 2, cargo: 'Especialista de [ÁREA] / Jurado — UGEL 03 – DRELM', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'concursos', orden: 3, cargo: 'V.° B.° Jefatura [ÁREA] — UGEL 03', nombreOpcional: '', entidad: 'UGEL 03', leyenda: 'Sello Institucional' },
  // Consolidado
  { tipoReporte: 'consolidado', orden: 1, cargo: 'Especialista Responsable de Monitoreo — [ÁREA] – UGEL 03', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'consolidado', orden: 2, cargo: 'Jefatura de [ÁREA] — UGEL 03 – DRELM', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' },
  // Individual
  { tipoReporte: 'individual', orden: 1, cargo: 'Especialista que monitorea — [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'individual', orden: 2, cargo: 'Director(a) / Autoridad de la I.E.', nombreOpcional: '', entidad: 'Institución Educativa', leyenda: 'Firma y Sello' },
  { tipoReporte: 'individual', orden: 3, cargo: 'Jefatura de [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03', leyenda: 'V.° B.°' },
  // Avance
  { tipoReporte: 'avance', orden: 1, cargo: 'Especialista Responsable — [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'avance', orden: 2, cargo: 'Jefatura de [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03', leyenda: 'V.° B.°' }
];

/**
 * Abre el diálogo modal universal "Configurar descarga" con selección de área de firmas,
 * firmantes reordenables, revisión previa de datos (Parte D), opciones y vista previa en vivo.
 */
export function openDownloadConfigModal({
  documentTitle = 'DOCUMENTO OFICIAL',
  tipoReporte = 'concursos', // 'concursos' | 'consolidado' | 'individual' | 'avance' | 'colegios'
  dataRows = [],
  currentUser = null,
  state = {},
  dbNs = null,
  isAdmin = false,
  onConfirm = async (downloadConfig) => {}
}) {
  const oldModal = document.getElementById('downloadConfigModal');
  if (oldModal) oldModal.remove();

  const areasList = (state.areasFirma && state.areasFirma.length > 0)
    ? state.areasFirma.filter(a => a.activa !== false)
    : DEFAULT_AREAS;

  let savedPref = null;
  try {
    const raw = localStorage.getItem('download_pref_' + tipoReporte);
    if (raw) savedPref = JSON.parse(raw);
  } catch (e) {}

  let currentAreaId = (savedPref && savedPref.areaId) ? savedPref.areaId : 'agebre';
  if (!areasList.some(a => a.id === currentAreaId) && currentAreaId !== 'personalizado' && currentAreaId !== 'sin_firmas') {
    const defArea = areasList.find(a => a.esPredeterminada) || areasList[0];
    currentAreaId = defArea ? defArea.id : 'agebre';
  }

  let sinFirmas = currentAreaId === 'sin_firmas' || (savedPref && savedPref.sinFirmas === true);
  let mostrarEncabezadoArea = savedPref ? (savedPref.mostrarEncabezadoArea !== false) : true;
  let incluirQr = savedPref ? (savedPref.incluirQr !== false) : true;
  let orientationChoice = savedPref ? (savedPref.orientation || 'auto') : 'auto';
  let formatoConcurso = savedPref ? (savedPref.formatoConcurso || 'completo') : 'completo';
  let recordarEleccion = true;

  let lugar = (savedPref && savedPref.lugar) ? savedPref.lugar : 'Lima';
  let fecha = (savedPref && savedPref.fecha) ? savedPref.fecha : formatDate(getLimaDateStr());

  let customAreaNombre = (savedPref && savedPref.customAreaNombre) || '';
  let customAreaSigla = (savedPref && savedPref.customAreaSigla) || '';
  let customAreaDesc = (savedPref && savedPref.customAreaDesc) || '';
  let guardarEnCatalogo = false;

  function getSignersForArea(areaId) {
    if (savedPref && savedPref.areaId === areaId && Array.isArray(savedPref.firmantes) && savedPref.firmantes.length > 0) {
      return JSON.parse(JSON.stringify(savedPref.firmantes));
    }

    const areaObj = areasList.find(a => a.id === areaId);
    const sigla = areaObj ? areaObj.sigla : (customAreaSigla || 'AGEBRE');

    const plantillasDb = (state.plantillasFirmantes || []).filter(p => p.areaId === areaId && p.tipoReporte === tipoReporte);
    if (plantillasDb.length > 0) {
      return plantillasDb.sort((a, b) => (a.orden || 99) - (b.orden || 99)).map(p => ({
        cargo: p.cargo.replace(/\[ÁREA\]/g, sigla),
        nombre: p.nombreOpcional || '',
        entidad: p.entidad ? p.entidad.replace(/\[ÁREA\]/g, sigla) : 'UGEL 03 – DRELM',
        leyenda: p.leyenda || 'Firma y Sello'
      }));
    }

    const defaults = DEFAULT_PLANTILLAS.filter(p => p.tipoReporte === tipoReporte);
    if (defaults.length > 0) {
      return defaults.map(p => ({
        cargo: p.cargo.replace(/\[ÁREA\]/g, sigla),
        nombre: p.nombreOpcional || '',
        entidad: p.entidad.replace(/\[ÁREA\]/g, sigla),
        leyenda: p.leyenda
      }));
    }

    return [
      { cargo: `Especialista Responsable — ${sigla}`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
      { cargo: `Jefatura de ${sigla}`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
    ];
  }

  let firmantesList = getSignersForArea(currentAreaId);

  // PARTE D: Análisis de datos
  const anomalies = {
    sinPuesto: 0,
    sinAsesor: 0,
    sinParticipante: 0,
    sinResolucion: 0,
    posiblesDuplicados: 0,
    dniInvalido: 0,
    sinUgelRed: 0
  };

  if (tipoReporte === 'concursos' && Array.isArray(dataRows)) {
    const seenDup = new Set();
    dataRows.forEach(r => {
      if (!r.puesto || r.puesto === '—' || r.puesto === '') anomalies.sinPuesto++;
      const hasAsesor = r.asesores && r.asesores.length > 0 && r.asesores.some(a => (a.nombres || a.apellidos || '').trim());
      if (!hasAsesor) anomalies.sinAsesor++;
      const hasPart = r.participantes && r.participantes.length > 0 && r.participantes.some(p => (p.nombres || p.apellidos || '').trim());
      if (!hasPart) anomalies.sinParticipante++;
      if (!r.resolucionRef || r.resolucionRef === '—' || r.resolucionRef === '') anomalies.sinResolucion++;

      [...(r.participantes || []), ...(r.asesores || [])].forEach(p => {
        if (p.dni && (p.dni.length !== 8 || !/^\d+$/.test(p.dni))) anomalies.dniInvalido++;
      });

      const pDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean).sort().join(',');
      const dupKey = [(r.tipoConcursoNombre || r.tipoConcursoId || '').toLowerCase(), (r.etapa || '').toLowerCase(), (r.categoria || '').toLowerCase(), (r.disciplina || '').toLowerCase(), (r.institucion || '').toLowerCase(), pDnis].join('|');
      if (seenDup.has(dupKey)) {
        anomalies.posiblesDuplicados++;
      } else {
        seenDup.add(dupKey);
      }
    });
  } else if (tipoReporte === 'consolidado' && Array.isArray(dataRows)) {
    dataRows.forEach(x => {
      const s = x.s || x;
      if (!s.ugel || s.ugel === '—' || !s.red || s.red === '—') anomalies.sinUgelRed++;
    });
  }

  const totalAnomalies = Object.values(anomalies).reduce((a, b) => a + b, 0);

  const overlay = document.createElement('div');
  overlay.id = 'downloadConfigModal';
  overlay.className = 'downloadModalOverlay';

  function renderModalContent() {
    const isCustom = currentAreaId === 'personalizado';
    const isSinFirmas = currentAreaId === 'sin_firmas' || sinFirmas;

    overlay.innerHTML = `
      <div class="downloadModalCard" role="dialog" aria-modal="true" aria-labelledby="dl_title">
        <div class="downloadModalHeader">
          <div>
            <h3 id="dl_title">Configurar descarga</h3>
            <div class="sub">${esc(documentTitle)}</div>
          </div>
          <button type="button" class="downloadModalClose" id="dl_close_btn" aria-label="Cerrar">✕</button>
        </div>

        <div class="downloadModalBody">
          ${totalAnomalies > 0 ? `
            <div class="downloadReviewAlert">
              <h5>⚠️ Revisión previa de datos: Se detectaron observaciones en los registros a exportar:</h5>
              <ul>
                ${anomalies.sinPuesto > 0 ? `<li><strong>${anomalies.sinPuesto}</strong> registro(s) sin puesto asignado (se mostrará como "—")</li>` : ''}
                ${anomalies.sinAsesor > 0 ? `<li><strong>${anomalies.sinAsesor}</strong> registro(s) sin docente asesor (se mostrará "Sin docente asesor registrado")</li>` : ''}
                ${anomalies.sinParticipante > 0 ? `<li><strong>${anomalies.sinParticipante}</strong> registro(s) sin participantes (se mostrará "Sin participante registrado")</li>` : ''}
                ${anomalies.sinResolucion > 0 ? `<li><strong>${anomalies.sinResolucion}</strong> registro(s) sin resolución de referencia</li>` : ''}
                ${anomalies.posiblesDuplicados > 0 ? `<li><strong>${anomalies.posiblesDuplicados}</strong> posible(s) registro(s) duplicado(s) detectado(s)</li>` : ''}
                ${anomalies.dniInvalido > 0 ? `<li><strong>${anomalies.dniInvalido}</strong> DNI(s) con formato no estándar (diferente de 8 dígitos numéricos)</li>` : ''}
                ${anomalies.sinUgelRed > 0 ? `<li><strong>${anomalies.sinUgelRed}</strong> ficha(s) sin UGEL o RED asignada</li>` : ''}
              </ul>
              <div class="downloadReviewActions">
                <button type="button" class="btn secondary small" id="dl_btn_fix">🔍 Ver y corregir</button>
                <button type="button" class="btn small" id="dl_btn_anyway" style="background:#B45309;color:#FFF">⬇ Descargar de todos modos (con marca de datos por completar)</button>
              </div>
            </div>
          ` : ''}

          <div class="downloadModalSection">
            <label class="secLabel" for="dl_area_select">Área que firma *</label>
            <select id="dl_area_select" style="padding:8px 10px;font-size:13.5px;font-weight:600;border:1.5px solid var(--primary);border-radius:7px">
              ${areasList.map(a => `
                <option value="${esc(a.id)}" ${a.id === currentAreaId ? 'selected' : ''}>
                  ${esc(a.sigla)} — ${esc(a.nombre)} ${a.esPredeterminada ? '(Predeterminada)' : ''}
                </option>
              `).join('')}
              <option value="personalizado" ${currentAreaId === 'personalizado' ? 'selected' : ''}>✍️ Personalizado…</option>
              <option value="sin_firmas" ${currentAreaId === 'sin_firmas' ? 'selected' : ''}>🚫 Sin bloque de firmas</option>
            </select>
          </div>

          ${isCustom ? `
            <div style="background:#F1F5F9;border:1px solid #CBD5E1;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px">
              <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">
                <div>
                  <label class="secLabel">Nombre completo del área *</label>
                  <input type="text" id="dl_custom_nombre" placeholder="Ej: Comisión Especial de Monitoreo" value="${esc(customAreaNombre)}" style="width:100%;padding:6px 8px">
                </div>
                <div>
                  <label class="secLabel">Sigla *</label>
                  <input type="text" id="dl_custom_sigla" placeholder="Ej: CEM" value="${esc(customAreaSigla)}" style="width:100%;padding:6px 8px">
                </div>
              </div>
              <div>
                <label class="secLabel">Descripción para el encabezado</label>
                <input type="text" id="dl_custom_desc" placeholder="Ej: Comisión Especial de Monitoreo (2026)" value="${esc(customAreaDesc)}" style="width:100%;padding:6px 8px">
              </div>
              ${isAdmin ? `
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                  <input type="checkbox" id="dl_custom_save" ${guardarEnCatalogo ? 'checked' : ''}>
                  Guardar como nueva plantilla en el catálogo global de áreas
                </label>
              ` : ''}
            </div>
          ` : ''}

          ${!isSinFirmas ? `
            <div class="downloadModalSection">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <label class="secLabel">Firmantes (${firmantesList.length}/6)</label>
                ${firmantesList.length < 6 ? `
                  <button type="button" class="btn secondary small" id="dl_add_firmante_btn" style="padding:2px 8px;font-size:11px">＋ Agregar firmante</button>
                ` : ''}
              </div>

              <div class="downloadFirmantesList" id="dl_firmantes_container">
                ${firmantesList.map((sig, idx) => `
                  <div class="downloadFirmanteItem" data-idx="${idx}">
                    <div class="reorderBtns">
                      <button type="button" class="btnUp" data-up="${idx}" ${idx === 0 ? 'disabled' : ''} title="Subir">▲</button>
                      <button type="button" class="btnDown" data-down="${idx}" ${idx === firmantesList.length - 1 ? 'disabled' : ''} title="Bajar">▼</button>
                    </div>
                    <div class="fieldsWrap">
                      <div>
                        <input type="text" class="fCargo" data-idx="${idx}" placeholder="Cargo *" value="${esc(sig.cargo)}" required title="Cargo (obligatorio)">
                      </div>
                      <div>
                        <input type="text" class="fNombre" data-idx="${idx}" placeholder="Nombre (opcional)" value="${esc(sig.nombre || '')}" title="Nombre">
                      </div>
                      <div>
                        <input type="text" class="fEntidad" data-idx="${idx}" placeholder="Entidad / Área" value="${esc(sig.entidad || '')}" title="Entidad / Área">
                      </div>
                      <div>
                        <select class="fLeyenda" data-idx="${idx}" title="Leyenda">
                          <option value="Firma y Sello" ${sig.leyenda === 'Firma y Sello' ? 'selected' : ''}>Firma y Sello</option>
                          <option value="V.° B.° y Sello" ${sig.leyenda === 'V.° B.° y Sello' ? 'selected' : ''}>V.° B.° y Sello</option>
                          <option value="Sello Institucional" ${sig.leyenda === 'Sello Institucional' ? 'selected' : ''}>Sello Institucional</option>
                          <option value="V.° B.°" ${sig.leyenda === 'V.° B.°' ? 'selected' : ''}>V.° B.°</option>
                          <option value="" ${!sig.leyenda ? 'selected' : ''}>Ninguna</option>
                        </select>
                      </div>
                    </div>
                    <button type="button" class="delFirmanteBtn" data-del="${idx}" title="Eliminar firmante">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${!isSinFirmas ? `
            <div class="downloadModalSection">
              <label class="secLabel">Lugar y Fecha</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <input type="text" id="dl_lugar" placeholder="Ciudad (Ej: Lima)" value="${esc(lugar)}" style="padding:6px 8px">
                <input type="text" id="dl_fecha" placeholder="Fecha (Ej: 19/09/2026)" value="${esc(fecha)}" style="padding:6px 8px">
              </div>
            </div>
          ` : ''}

          <div class="downloadModalSection">
            <label class="secLabel">Opciones</label>
            <div style="display:flex;flex-direction:column;gap:6px">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_encabezado" ${mostrarEncabezadoArea ? 'checked' : ''}>
                Mostrar logo y nombre del área en el encabezado (4.° recuadro)
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_qr" ${incluirQr ? 'checked' : ''}>
                Incluir código y QR oficial de verificación
              </label>
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_sin_firmas" ${isSinFirmas ? 'checked' : ''}>
                Sin bloque de firmas
              </label>

              <div style="display:flex;align-items:center;gap:14px;margin-top:4px">
                <span style="font-size:12px;font-weight:600;color:var(--ink-soft)">Orientación:</span>
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                  <input type="radio" name="dl_orientation" value="auto" ${orientationChoice === 'auto' ? 'checked' : ''}> Automática
                </label>
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                  <input type="radio" name="dl_orientation" value="portrait" ${orientationChoice === 'portrait' ? 'checked' : ''}> Vertical
                </label>
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                  <input type="radio" name="dl_orientation" value="landscape" ${orientationChoice === 'landscape' ? 'checked' : ''}> Horizontal
                </label>
              </div>

              ${tipoReporte === 'concursos' ? `
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px;margin-top:6px">
                  <div style="font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:4px">Formato del documento:</div>
                  <div style="display:flex;gap:16px">
                    <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                      <input type="radio" name="dl_formato_concurso" value="completo" ${formatoConcurso === 'completo' ? 'checked' : ''}>
                      Listado completo (agrupado por disciplina/categoría)
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                      <input type="radio" name="dl_formato_concurso" value="orden_merito" ${formatoConcurso === 'orden_merito' ? 'checked' : ''}>
                      Acta de orden de mérito (solo 1.° a 3.° puesto)
                    </label>
                  </div>
                </div>
              ` : ''}

              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:4px">
                <input type="checkbox" id="dl_opt_recordar" ${recordarEleccion ? 'checked' : ''}>
                Recordar mi elección para este tipo de reporte
              </label>
            </div>
          </div>

          ${!isSinFirmas && firmantesList.length > 0 ? `
            <div class="downloadModalSection">
              <label class="secLabel">Vista previa de firmas</label>
              <div class="downloadSigPreview">
                <div class="previewDate">${esc(lugar)}, ${esc(fecha)}</div>
                <div class="downloadSigPreviewGrid" style="grid-template-columns:repeat(${Math.min(firmantesList.length, 3)}, 1fr)">
                  ${firmantesList.map(sig => `
                    <div class="downloadSigPreviewBox">
                      ${sig.nombre ? `<div class="pNom">${esc(formatPersonName(sig.nombre))}</div>` : ''}
                      <div class="pCargo">${esc(sig.cargo || 'Cargo')}</div>
                      ${sig.entidad ? `<div class="pEnt">${esc(sig.entidad)}</div>` : ''}
                      ${sig.leyenda ? `<div class="pLey">${esc(sig.leyenda)}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="downloadModalFooter">
          <button type="button" class="btn secondary" id="dl_cancel_btn">Cancelar</button>
          <button type="button" class="btn" id="dl_confirm_btn" style="display:flex;align-items:center;gap:6px">
            <span>⬇</span> Generar PDF
          </button>
        </div>
      </div>
    `;

    attachModalEvents();
  }

  function attachModalEvents() {
    const close = () => { overlay.remove(); };
    document.getElementById('dl_close_btn').onclick = close;
    document.getElementById('dl_cancel_btn').onclick = close;

    document.getElementById('dl_area_select').onchange = (e) => {
      currentAreaId = e.target.value;
      if (currentAreaId === 'sin_firmas') {
        sinFirmas = true;
      } else {
        sinFirmas = false;
        firmantesList = getSignersForArea(currentAreaId);
      }
      renderModalContent();
    };

    const customNom = document.getElementById('dl_custom_nombre');
    if (customNom) customNom.oninput = (e) => { customAreaNombre = e.target.value; };
    const customSig = document.getElementById('dl_custom_sigla');
    if (customSig) {
      customSig.oninput = (e) => {
        customAreaSigla = e.target.value;
        firmantesList = getSignersForArea('personalizado');
      };
    }
    const customDesc = document.getElementById('dl_custom_desc');
    if (customDesc) customDesc.oninput = (e) => { customAreaDesc = e.target.value; };
    const customSave = document.getElementById('dl_custom_save');
    if (customSave) customSave.onchange = (e) => { guardarEnCatalogo = e.target.checked; };

    const sinFirmasCb = document.getElementById('dl_opt_sin_firmas');
    if (sinFirmasCb) {
      sinFirmasCb.onchange = (e) => {
        sinFirmas = e.target.checked;
        if (sinFirmas) currentAreaId = 'sin_firmas';
        else if (currentAreaId === 'sin_firmas') currentAreaId = 'agebre';
        renderModalContent();
      };
    }

    const lugarInp = document.getElementById('dl_lugar');
    if (lugarInp) {
      lugarInp.oninput = (e) => {
        lugar = e.target.value;
        const pDate = overlay.querySelector('.previewDate');
        if (pDate) pDate.textContent = `${lugar}, ${fecha}`;
      };
    }
    const fechaInp = document.getElementById('dl_fecha');
    if (fechaInp) {
      fechaInp.oninput = (e) => {
        fecha = e.target.value;
        const pDate = overlay.querySelector('.previewDate');
        if (pDate) pDate.textContent = `${lugar}, ${fecha}`;
      };
    }

    overlay.querySelectorAll('.fCargo').forEach(inp => {
      inp.oninput = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].cargo = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });
    overlay.querySelectorAll('.fNombre').forEach(inp => {
      inp.oninput = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].nombre = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });
    overlay.querySelectorAll('.fEntidad').forEach(inp => {
      inp.oninput = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].entidad = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });
    overlay.querySelectorAll('.fLeyenda').forEach(sel => {
      sel.onchange = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].leyenda = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });

    function updatePreviewBox(idx) {
      const boxes = overlay.querySelectorAll('.downloadSigPreviewBox');
      if (boxes[idx] && firmantesList[idx]) {
        const sig = firmantesList[idx];
        boxes[idx].innerHTML = `
          ${sig.nombre ? `<div class="pNom">${esc(formatPersonName(sig.nombre))}</div>` : ''}
          <div class="pCargo">${esc(sig.cargo || 'Cargo')}</div>
          ${sig.entidad ? `<div class="pEnt">${esc(sig.entidad)}</div>` : ''}
          ${sig.leyenda ? `<div class="pLey">${esc(sig.leyenda)}</div>` : ''}
        `;
      }
    }

    overlay.querySelectorAll('.btnUp').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.up, 10);
        if (idx > 0) {
          const temp = firmantesList[idx - 1];
          firmantesList[idx - 1] = firmantesList[idx];
          firmantesList[idx] = temp;
          renderModalContent();
        }
      };
    });
    overlay.querySelectorAll('.btnDown').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.down, 10);
        if (idx < firmantesList.length - 1) {
          const temp = firmantesList[idx + 1];
          firmantesList[idx + 1] = firmantesList[idx];
          firmantesList[idx] = temp;
          renderModalContent();
        }
      };
    });
    overlay.querySelectorAll('.delFirmanteBtn').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.del, 10);
        firmantesList.splice(idx, 1);
        renderModalContent();
      };
    });

    const addBtn = document.getElementById('dl_add_firmante_btn');
    if (addBtn) {
      addBtn.onclick = () => {
        if (firmantesList.length < 6) {
          firmantesList.push({
            cargo: 'Especialista',
            nombre: '',
            entidad: 'UGEL 03 – DRELM',
            leyenda: 'Firma y Sello'
          });
          renderModalContent();
        }
      };
    }

    const encCb = document.getElementById('dl_opt_encabezado');
    if (encCb) encCb.onchange = (e) => { mostrarEncabezadoArea = e.target.checked; };
    const qrCb = document.getElementById('dl_opt_qr');
    if (qrCb) qrCb.onchange = (e) => { incluirQr = e.target.checked; };
    const recCb = document.getElementById('dl_opt_recordar');
    if (recCb) recCb.onchange = (e) => { recordarEleccion = e.target.checked; };

    overlay.querySelectorAll('input[name="dl_orientation"]').forEach(r => {
      r.onchange = (e) => { orientationChoice = e.target.value; };
    });
    overlay.querySelectorAll('input[name="dl_formato_concurso"]').forEach(r => {
      r.onchange = (e) => { formatoConcurso = e.target.value; };
    });

    const fixBtn = document.getElementById('dl_btn_fix');
    if (fixBtn) {
      fixBtn.onclick = () => {
        close();
        if (anomalies.posiblesDuplicados > 0 && typeof openDuplicateDetectorModal === 'function') {
          openDuplicateDetectorModal(dbNs, state, document.getElementById('main'), isAdmin, currentUser, null);
        } else {
          showToast('Revisa los registros señalados en la tabla para completar los datos faltantes.');
        }
      };
    }

    const anywayBtn = document.getElementById('dl_btn_anyway');
    if (anywayBtn) {
      anywayBtn.onclick = () => { triggerGenerate(true); };
    }

    const confirmBtn = document.getElementById('dl_confirm_btn');
    confirmBtn.onclick = () => { triggerGenerate(false); };

    async function triggerGenerate(forceWithIncomplete = false) {
      if (!sinFirmas) {
        const invalidSig = firmantesList.find(s => !(s.cargo || '').trim());
        if (invalidSig) {
          showToast('Cada firmante debe tener un cargo especificado.');
          return;
        }
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span>⏳</span> Generando PDF...';

      let areaFinal = null;
      if (currentAreaId === 'personalizado') {
        areaFinal = {
          id: 'custom_' + Date.now(),
          nombre: customAreaNombre || 'Área Personalizada',
          sigla: customAreaSigla || 'ÁREA',
          descripcionEncabezado: customAreaDesc || customAreaNombre
        };
        if (isAdmin && guardarEnCatalogo && dbNs) {
          try {
            await dbNs.collection('areasFirma').doc(areaFinal.id).set({
              ...areaFinal,
              activa: true,
              esPredeterminada: false,
              createdAt: Date.now()
            });
          } catch (e) {
            console.warn('No se pudo guardar área en catálogo:', e);
          }
        }
      } else if (currentAreaId !== 'sin_firmas') {
        areaFinal = areasList.find(a => a.id === currentAreaId) || null;
      }

      if (recordarEleccion) {
        try {
          const prefData = {
            areaId: currentAreaId,
            sinFirmas,
            mostrarEncabezadoArea,
            incluirQr,
            orientation: orientationChoice,
            formatoConcurso,
            lugar,
            fecha,
            firmantes: firmantesList,
            customAreaNombre,
            customAreaSigla,
            customAreaDesc
          };
          localStorage.setItem('download_pref_' + tipoReporte, JSON.stringify(prefData));
          if (currentUser && dbNs) {
            dbNs.collection('preferenciasDescarga').doc(`${currentUser.uid}_${tipoReporte}`).set({
              usuarioId: currentUser.uid,
              tipoReporte,
              prefData,
              updatedAt: Date.now()
            }, { merge: true }).catch(() => {});
          }
        } catch (e) {}
      }

      const downloadConfig = {
        areaConfig: mostrarEncabezadoArea ? areaFinal : null,
        signatures: sinFirmas ? [] : firmantesList,
        lugarFecha: sinFirmas ? '' : `${lugar}, ${fecha}`,
        sinFirmas,
        incluirQr,
        orientation: orientationChoice === 'auto' ? null : orientationChoice,
        formatoConcurso,
        datosIncompletos: forceWithIncomplete || (totalAnomalies > 0),
        marcaBorrador: forceWithIncomplete && (anomalies.sinPuesto > 0 || anomalies.sinAsesor > 0)
      };

      try {
        await onConfirm(downloadConfig);
        showToast('✓ Documento PDF generado exitosamente.');
        close();
      } catch (err) {
        console.error('Error generando PDF con configuración:', err);
        showToast('Error al generar PDF: ' + (err.message || 'Error desconocido'));
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span>⬇</span> Generar PDF';
      }
    }

    const onKey = (e) => {
      if (e.key === 'Escape') {
        close();
        window.removeEventListener('keydown', onKey);
      }
    };
    window.addEventListener('keydown', onKey);
  }

  document.body.appendChild(overlay);
  renderModalContent();

  setTimeout(() => {
    const sel = document.getElementById('dl_area_select');
    if (sel) sel.focus();
  }, 50);
}

/* ============================= NAVEGACIÓN ============================= */
export function renderForbidden(c) {
  c.innerHTML = '<div class="empty"><h4>Solo para administradores</h4><p>Tu cuenta tiene rol "General" y no tiene acceso a esta sección.</p></div>';
}

export function setupNavigation(state, renderFn) {
  document.querySelectorAll('.navbtn').forEach(b => {
    b.addEventListener('click', () => {
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.activeTab = b.dataset.tab;
      renderFn();
    });
  });

  // Botón superior "Registrar ficha"
  const topRegBtn = document.getElementById('topRegistrarBtn');
  if (topRegBtn) {
    topRegBtn.addEventListener('click', () => {
      state.activeTab = 'registrar';
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      const btn = document.querySelector('.navbtn[data-tab="registrar"]');
      if (btn) btn.classList.add('active');
      renderFn();
    });
  }

  // Campana de alertas en la cabecera
  const topBellBtn = document.getElementById('topBellBtn');
  if (topBellBtn) {
    topBellBtn.addEventListener('click', () => {
      state.activeTab = 'alertas';
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      const btn = document.querySelector('.navbtn[data-tab="alertas"]');
      if (btn) btn.classList.add('active');
      renderFn();
    });
  }

  // Botón superior "Exportar"
  const topExportBtn = document.getElementById('topExportBtn');
  if (topExportBtn) {
    topExportBtn.addEventListener('click', () => {
      // Abre el diálogo modal universal para exportar el consolidado general
      openDownloadConfigModal({
        documentTitle: 'REPORTE CONSOLIDADO GENERAL DE MONITOREO',
        tipoReporte: 'consolidado',
        dataRows: state.submissions || [],
        currentUser: _currentSessionUser || (state && state.currentUser) || null,
        state,
        dbNs: null,
        isAdmin: false,
        onConfirm: async (cfg) => {
          const statsList = (state.submissions || []).map(s => {
            const ft = (state.fichaTypes || []).find(f => f.id === s.fichaTypeId);
            const st = ft ? computeStats(s, ft) : { pct: null };
            return { s, st };
          });
          await exportConsolidadoReportPdf(statsList, null, {}, true, cfg);
        }
      });
    });
  }
}

/* ============================= DASHBOARD (RESUMEN GENERAL) ============================= */
export function viewDashboard(state, getFichaType, renderFn) {
  const totalTipos  = state.fichaTypes.length;
  const totalFichas = state.submissions.length;
  const instSet = new Set(state.submissions.map(s => (s.institucion || '') + '|' + (s.ugel || '')));

  let sumPct = 0, cntPct = 0;
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  const perTipo = {};
  state.fichaTypes.forEach(ft => perTipo[ft.id] = { ft, count: 0, sum: 0, cnt: 0, last: null });

  state.submissions.forEach(s => {
    const ft = getFichaType(s.fichaTypeId);
    const st = ft ? computeStats(s, ft) : { pct: null };
    if (st.pct !== null) { sumPct += st.pct; cntPct++; }
    const status = statusFromPct(st.pct).label;
    if (status === 'Logrado') dist.logrado++;
    else if (status === 'En proceso') dist.proceso++;
    else if (status === 'Por mejorar') dist.inicio++;
    else dist.none++;

    if (perTipo[s.fichaTypeId]) {
      const p = perTipo[s.fichaTypeId];
      p.count++;
      if (st.pct !== null) { p.sum += st.pct; p.cnt++; }
      if (!p.last || s.fecha > p.last) p.last = s.fecha;
    }
  });
  const avgPct = cntPct ? Math.round(sumPct / cntPct) : null;
  const totalConDatos = dist.logrado + dist.proceso + dist.inicio + dist.none;

  // Ordenamiento de tipos de ficha: urgente primero por defecto
  const sortedTipos = Object.values(perTipo).sort((a, b) => {
    const avgA = a.cnt ? (a.sum / a.cnt) : (dashboardSortAsc ? -1 : 101);
    const avgB = b.cnt ? (b.sum / b.cnt) : (dashboardSortAsc ? -1 : 101);
    return dashboardSortAsc ? avgA - avgB : avgB - avgA;
  });

  const tipoTableRows = sortedTipos.map(p => {
    const avg = p.cnt ? Math.round(p.sum / p.cnt) : null;
    const status = statusFromPct(avg);
    const fullNombre = esc(p.ft.nombre);
    const icono = p.ft.icono || '📋';
    return '<tr>' +
      '<td class="tipoNombreCol" title="' + fullNombre + '">' +
        '<div style="display:flex;align-items:flex-start;gap:9px">' +
          '<span style="font-size:16px;line-height:1.2">' + icono + '</span>' +
          '<div>' +
            '<div style="font-weight:600;line-height:1.35;color:var(--text-900)">' + fullNombre + '</div>' +
            (p.ft.descripcion ? '<small style="color:var(--text-600);display:block;margin-top:2px">' + esc(p.ft.descripcion) + '</small>' : '') +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td style="text-align:center;font-weight:600;color:var(--text-900)">' + p.count + '</td>' +
      '<td>' + bar(avg) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:var(--text-900)">' + (avg === null ? '—' : avg + '%') + '</td>' +
      '<td style="text-align:center"><span class="badge ' + status.cls + '">' + status.label + '</span></td>' +
    '</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-600);padding:24px">Aún no hay tipos de ficha registrados.</td></tr>';

  // Porcentajes de la distribución
  const pctLogrado = totalConDatos ? Math.round((dist.logrado / totalConDatos) * 100) : 0;
  const pctProceso = totalConDatos ? Math.round((dist.proceso / totalConDatos) * 100) : 0;
  const pctInicio  = totalConDatos ? Math.round((dist.inicio  / totalConDatos) * 100) : 0;
  const pctNone    = totalConDatos ? Math.round((dist.none    / totalConDatos) * 100) : 0;

  const seg = '<div class="distWrap">' +
    donutChart([
      { value: dist.logrado, color: 'var(--ok)', label: 'Logrado' },
      { value: dist.proceso, color: 'var(--warn)', label: 'En proceso' },
      { value: dist.inicio,  color: 'var(--danger)', label: 'Por mejorar' },
      { value: dist.none,    color: 'var(--neutral)', label: 'Sin datos' },
    ], { centerLabel: totalFichas, centerSub: 'fichas' }) +
    '<div class="seglegend">' +
      '<span><span class="dot" style="background:var(--ok)"></span><strong>Logrado:</strong> ' + dist.logrado + ' (' + pctLogrado + '%)</span>' +
      '<span><span class="dot" style="background:var(--warn)"></span><strong>En proceso:</strong> ' + dist.proceso + ' (' + pctProceso + '%)</span>' +
      '<span><span class="dot" style="background:var(--danger)"></span><strong>Por mejorar:</strong> ' + dist.inicio + ' (' + pctInicio + '%)</span>' +
      (dist.none ? '<span><span class="dot" style="background:var(--neutral)"></span><strong>Sin datos:</strong> ' + dist.none + ' (' + pctNone + '%)</span>' : '') +
    '</div></div>';

  // Alertas Recientes
  const alertsList = computeAlerts(state, getFichaType).slice(0, 5);
  const alertsHtml = alertsList.length > 0 ? alertsList.map(a => {
    const isDanger = a.status === 'Por mejorar' || a.trend === 'retroceso';
    const cls = isDanger ? 'danger' : 'warn';
    const icon = isDanger ? '🚨' : '⚠️';
    return '<div class="alertCard ' + cls + '">' +
      '<div class="alertIcon">' + icon + '</div>' +
      '<div class="alertBody">' +
        '<div class="alertTitle">' + esc(a.institucion) + ' · <span style="font-weight:500;color:var(--text-600)">' + esc(a.fichaTypeNombre) + '</span></div>' +
        '<div class="alertDetail"><strong>' + esc(a.seccion) + ':</strong> ' + esc(a.item) + ' — Nivel: <strong>' + a.pct + '% (' + a.status + ')</strong>' +
        (a.trend === 'retroceso' ? ' · <span style="color:var(--danger);font-weight:700">⚠ Retroceso respecto a visita anterior</span>' : '') +
        '</div>' +
      '</div>' +
      '<button class="actBtn" data-gotoalert="' + esc(a.institucion) + '" type="button">Ver alerta</button>' +
    '</div>';
  }).join('') : '<p class="helpText" style="margin:0;color:var(--ok);font-weight:600">✓ No se registran alertas críticas ni retrocesos en las visitas recientes.</p>';

  // Actividad Reciente
  const recent = [...state.submissions].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8).map(s => {
    const ft = getFichaType(s.fichaTypeId);
    const st = ft ? computeStats(s, ft) : { pct: null };
    const status = statusFromPct(st.pct);
    return '<tr><td>' + fmtDate(s.fecha) + '</td><td>' + esc(s.institucion) + '</td><td>' + esc(s.fichaTypeNombre || (ft ? ft.nombre : '—')) + '</td><td>' + (s.visita ? 'V' + s.visita : '—') + '</td><td>' + (st.pct === null ? '—' : st.pct + '%') + '</td><td><span class="badge ' + status.cls + '">' + status.label + '</span></td></tr>';
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-600);padding:24px">Aún no se han registrado fichas.</td></tr>';

  // Configurar listeners una vez renderizado en el DOM
  setTimeout(() => {
    const sortBtn = document.getElementById('toggleDashSortBtn');
    if (sortBtn && renderFn) {
      sortBtn.addEventListener('click', () => {
        dashboardSortAsc = !dashboardSortAsc;
        renderFn();
      });
    }
    document.querySelectorAll('[data-gotoalert]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTab = 'alertas';
        document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
        const navBtn = document.querySelector('.navbtn[data-tab="alertas"]');
        if (navBtn) navBtn.classList.add('active');
        if (renderFn) renderFn();
      });
    });
  }, 0);

  return '' +
    '<div class="pageHead">' +
      '<h2>Resumen general</h2>' +
      '<p>Vista consolidada de monitoreo, niveles de avance institucional y alertas prioritarias.</p>' +
    '</div>' +
    '<div class="cards">' +
      '<div class="card"><div class="num">' + totalTipos + '</div><div class="lbl">Tipos de ficha</div></div>' +
      '<div class="card"><div class="num">' + totalFichas + '</div><div class="lbl">Fichas registradas</div></div>' +
      '<div class="card"><div class="num">' + instSet.size + '</div><div class="lbl">Instituciones monitoreadas</div></div>' +
      '<div class="card"><div class="num">' + (avgPct === null ? '—' : avgPct + '%') + '</div><div class="lbl">Cumplimiento promedio</div></div>' +
    '</div>' +
    '<div class="panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">' +
        '<h3 style="margin:0">Avance por tipo de ficha <small>cumplimiento institucional</small></h3>' +
        '<button class="btn secondary small" id="toggleDashSortBtn" type="button">' +
          (dashboardSortAsc ? '▲ Orden: Urgentes primero' : '▼ Orden: Mayor avance primero') +
        '</button>' +
      '</div>' +
      '<div class="tblWrap"><table class="tipoAvanceTable"><thead><tr><th>Tipo de ficha</th><th style="width:80px;text-align:center">Fichas</th><th style="min-width:180px">Avance</th><th style="width:70px;text-align:right">%</th><th style="width:110px;text-align:center">Estado</th></tr></thead><tbody>' + tipoTableRows + '</tbody></table></div>' +
    '</div>' +
    '<div class="panel"><h3>Distribución general de resultados</h3>' + seg + '</div>' +
    '<div class="panel"><h3>Alertas de seguimiento recientes</h3>' + alertsHtml + '</div>' +
    '<div class="panel"><h3>Actividad reciente</h3><div class="tblWrap"><table><thead><tr><th>Fecha</th><th>Institución</th><th>Tipo de ficha</th><th>Visita</th><th>%</th><th>Estado</th></tr></thead><tbody>' + recent + '</tbody></table></div></div>';
}

/* ============================= REGISTRAR TAB ============================= */
let regSelectedTypeId   = null;
let regCompromisos      = [];
let regBuiltFor         = null;
let regSelectedColegioId = null;

export function renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate) {
  if (state.fichaTypes.length === 0) {
    container.innerHTML = '<div class="pageHead"><h2>Registrar ficha</h2></div>' +
      '<div class="empty"><h4>Aún no hay tipos de ficha</h4><p>Crea tu primer tipo de ficha en la pestaña "Tipos de ficha" para poder empezar a registrar visitas de monitoreo.</p></div>';
    return;
  }
  if (regSelectedTypeId && !getFichaType(regSelectedTypeId)) regSelectedTypeId = null;

  // Si venimos en modo edición, preseleccionar el tipo de ficha
  if (editingSubmissionData && editingSubmissionData.fichaTypeId && !regSelectedTypeId) {
    regSelectedTypeId = editingSubmissionData.fichaTypeId;
  }

  const opts = state.fichaTypes.map(ft =>
    '<option value="' + ft.id + '"' + (ft.id === regSelectedTypeId ? ' selected' : '') + '>' + esc(ft.nombre) + '</option>'
  ).join('');

  const editBanner = editingSubmissionId
    ? '<div class="banner" style="background:var(--accent-tint);border-color:var(--accent);color:#8A6410">✏️ Modo edición — estás corrigiendo una ficha ya registrada. Al guardar se actualizará en Firestore.</div>'
    : '';

  container.innerHTML = '' +
    '<div class="pageHead">' +
      '<h2>' + (editingSubmissionId ? 'Corregir ficha registrada' : 'Registrar ficha') + '</h2>' +
      '<p>' + (editingSubmissionId ? 'Modifica los datos y guarda para actualizar la ficha en la base de datos.' : 'Selecciona el tipo de ficha y completa los datos de la visita de monitoreo.') + '</p>' +
    '</div>' +
    editBanner +
    '<div class="panel"><div class="field" style="max-width:420px;">' +
      '<label for="ftSelect">Tipo de ficha</label>' +
      '<select id="ftSelect"><option value="">— Selecciona un tipo —</option>' + opts + '</select>' +
    '</div></div>' +
    '<div id="regFormHost"></div>';

  document.getElementById('ftSelect').addEventListener('change', (e) => {
    regSelectedTypeId = e.target.value || null;
    regBuiltFor = null;
    buildRegForm(state, getFichaType, dbNs, currentUser, navigate);
  });
  buildRegForm(state, getFichaType, dbNs, currentUser, navigate);
}

function buildRegForm(state, getFichaType, dbNs, currentUser, navigate) {
  const host = document.getElementById('regFormHost');
  if (!host) return;
  if (!regSelectedTypeId) { host.innerHTML = ''; return; }
  const ft = getFichaType(regSelectedTypeId);
  if (!ft) { host.innerHTML = ''; return; }

  // Reconstruir si no está construido o si el contenedor quedó vacío
  if (regBuiltFor === regSelectedTypeId && !editingSubmissionData && host.querySelector('#regForm')) return;
  regBuiltFor = regSelectedTypeId;
  if (!editingSubmissionData) {
    regCompromisos = [];
    regSelectedColegioId = null;
  }

  const normExtras = normalizeExtras(ft.extras);

  const extrasHtml = normExtras.map((ex, i) => {
    const reqAttr = ex.required ? ' required' : '';
    const lower = (ex.label || '').toLowerCase();
    const dListAttr = lower.includes('ugel') ? ' list="dl_ugel"' : ((lower.includes('red') || lower.includes('rei')) ? ' list="dl_red"' : '');

    if (ex.tipo === 'numero') {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="number" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="0"' + reqAttr + '>' +
      '</div>';
    }

    if (ex.tipo === 'fecha') {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="date" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '"' + reqAttr + '>' +
      '</div>';
    }

    if (ex.tipo === 'si_no') {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px">' +
          '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '" value="Sí"' + reqAttr + '><span>Sí</span></label>' +
          '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '" value="No"><span>No</span></label>' +
          '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '" value="N/A"><span>N/A</span></label>' +
        '</div>' +
      '</div>';
    }

    const isResp = lower.includes('responsable') || lower.includes('especialista');
    if (isResp) {
      return '<div class="field" style="position:relative">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="ieSearchWrap">' +
          '<input type="text" class="respAutocompleteInp" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="Buscar especialista por nombre, cargo o RED..." autocomplete="off"' + reqAttr + '>' +
          '<div class="ieDropdown respDropdown"></div>' +
        '</div>' +
        '<span class="respHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px"></span>' +
      '</div>';
    }

    return '<div class="field">' +
      '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
      '<input type="text" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="' + esc(ex.label) + '"' + dListAttr + reqAttr + '>' +
    '</div>';
  }).join('');

  const seccionesHtml = ft.secciones.map((sec, sIdx) => {
    const items = sec.items.map((it, iIdx) => {
      const optsHtml = RESPONSE_OPTIONS[ft.tipoRespuesta].map(o =>
        '<label class="optBtn"><input type="radio" name="item_' + it.id + '" value="' + o.v + '"><span>' + o.l + '</span></label>'
      ).join('');
      return '<div class="itemRow"><div class="itxt"><span class="itemNum">' + (iIdx + 1) + '.</span> ' + esc(it.texto) + '</div><div class="optGroup">' + optsHtml + '</div></div>';
    }).join('');
    return '<div class="formSecCard">' +
      '<div class="formSecHeader">' +
        '<span class="formSecBadge">Sección ' + (sIdx + 1) + '</span>' +
        '<h4 class="formSecTitle">' + esc(sec.nombre) + '</h4>' +
        '<span class="formSecCount">' + sec.items.length + ' indicadores</span>' +
      '</div>' +
      '<div class="formSecBody">' + items + '</div>' +
    '</div>';
  }).join('');

  const uploadPanel = AI_SCAN_ENDPOINT ? (
    '<div class="panel" id="uploadPanel">' +
      '<h3>Cargar ficha escaneada <small>lectura automática con IA — opcional</small></h3>' +
      '<input type="file" id="scanInput" accept="image/jpeg,image/png,image/webp" style="display:none">' +
      '<button type="button" class="btn secondary" id="scanBtn">📷 Elegir imagen y leer ficha</button>' +
      '<span id="scanStatus" class="helpText" style="display:inline;margin-left:10px;"></span>' +
    '</div>'
  ) : '';

  const submitLabel = editingSubmissionId ? 'Actualizar ficha' : 'Guardar ficha';

  host.innerHTML = '' +
    '<form id="regForm">' +
      uploadPanel +
      '<div class="panel">' +
        '<div class="sectionHeaderTitle">DATOS DE LA VISITA</div>' +
        '<div class="fieldGrid">' +
          '<div class="field" style="grid-column:span 2">' +
            '<label>Institución educativa / CEBE / PRITE *</label>' +
            '<div class="ieSearchWrap" id="ieSearchWrap">' +
              '<input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar por nombre o código..." required>' +
              '<div class="ieDropdown" id="ieDropdown"></div>' +
            '</div>' +
            '<span id="regColegioHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px;display:block"></span>' +
          '</div>' +
          '<div class="field"><label>Fecha *</label><input type="date" id="f_fecha" value="' + todayStr() + '" required></div>' +
          '<div class="field"><label>N° de visita *</label><input type="number" id="f_visita" min="1" value="1" required></div>' +
        '</div>' +
        (extrasHtml ? '<div class="sectionHeaderTitle" style="margin-top:20px">DATOS GENERALES DE LA FICHA</div><div class="fieldGrid">' + extrasHtml + '</div>' : '') +
        '<datalist id="dl_ugel">' + seedSuggestions('ugel', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
        '<datalist id="dl_red">'  + seedSuggestions('red', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="sectionHeaderTitle">ASPECTOS A MONITOREAR <small style="font-weight:400;color:var(--text-600);text-transform:none;margin-left:8px">' + RESPONSE_LABELS[ft.tipoRespuesta] + '</small></div>' +
        seccionesHtml +
      '</div>' +
      '<div class="panel">' +
        '<div class="sectionHeaderTitle">OBSERVACIONES GENERALES</div>' +
        '<textarea id="f_observaciones" placeholder="Hallazgos, evidencias, notas de la visita..."></textarea>' +
      '</div>' +
      '<div class="panel">' +
        '<div class="sectionHeaderTitle">COMPROMISOS DE MEJORA</div>' +
        '<div id="compList"></div>' +
        '<button type="button" class="btn secondary small" id="addCompBtn" style="margin-top:10px">+ Agregar compromiso</button>' +
      '</div>' +
      '<div class="formBottomBar">' +
        '<button type="button" class="btn secondary" id="cancelFormBtn">Cancelar</button>' +
        '<button type="submit" class="btn" id="saveFormBtn">' + submitLabel + '</button>' +
      '</div>' +
    '</form>';

  // ---- Buscador IE con dropdown ----
  const instInput = document.getElementById('f_institucion');
  const dropdown  = document.getElementById('ieDropdown');
  const hint      = document.getElementById('regColegioHint');

  const showDropdown = () => {
    const query = normalizeText(instInput.value);
    const matches = state.colegios
      .filter(c => !query || normalizeText(c.ie).includes(query) || normalizeText(c.codigoLocal).includes(query))
      .slice(0, 25);
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = matches.map(c =>
      '<div class="ieDropdownItem" data-id="' + c.id + '">' +
        '<div class="ieDropMain">' + esc(c.ie) + '</div>' +
        '<div class="ieDropSub">' + esc(c.codigoLocal || '') +
          (c.rei ? ' · ' + esc(c.rei) : '') +
          (c.director && c.director.nombre ? ' · Dir: ' + esc(c.director.nombre) : '') +
        '</div>' +
      '</div>'
    ).join('');
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const c = state.colegios.find(x => x.id === item.dataset.id);
        if (c) selectColegio(c);
        dropdown.style.display = 'none';
      });
    });
  };

  const selectColegio = (c) => {
    instInput.value = c.ie || '';
    regSelectedColegioId = c.id;

    // Auto-completar campos de cabecera configurados que correspondan al colegio
    normExtras.forEach((ex, i) => {
      const lower = (ex.label || '').toLowerCase();
      let matchVal = null;
      if (lower.includes('código') || lower.includes('codigo') || lower.includes('local') || lower.includes('modular')) {
        matchVal = c.codigoLocal;
      } else if (lower.includes('rei') || lower.includes('red')) {
        matchVal = c.rei;
      } else if (lower.includes('director')) {
        matchVal = c.director && c.director.nombre ? c.director.nombre : '';
      } else if (lower.includes('ugel')) {
        matchVal = c.dependencia || 'UGEL 03';
      } else if (lower.includes('modalidad')) {
        matchVal = c.modalidad;
      } else if (lower.includes('distrito')) {
        matchVal = c.distrito;
      } else if (lower.includes('dirección') || lower.includes('direccion')) {
        matchVal = c.direccion;
      }

      if (matchVal !== null && matchVal !== undefined && ex.tipo !== 'si_no') {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        if (inp && !inp.value) inp.value = matchVal;
      }
    });

    // Auto-sugerir / completar especialista si coincide con la RED del colegio
    if (c.rei && state.responsables && state.responsables.length) {
      const cReiNorm = normalizeText(c.rei);
      const matchedResp = state.responsables.find(r => {
        if (!r.red) return false;
        const rRedNorm = normalizeText(r.red);
        return rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm) ||
               (c.rei.match(/\d+/) && r.red.includes(c.rei.match(/\d+/)[0]));
      });

      if (matchedResp) {
        respInputs.forEach(rInp => {
          if (!rInp.value) {
            const hEl = rInp.closest('.field') ? rInp.closest('.field').querySelector('.respHint') : null;
            selectResponsable(matchedResp, rInp, hEl);
          }
        });
      }
    }

    if (hint) {
      hint.style.display = 'block';
      hint.textContent = '✓ Vinculada al padrón' +
        (c.rei ? ' · ' + c.rei : '') +
        (c.dependencia ? ' · ' + c.dependencia : ' · UGEL 03') +
        (c.distrito ? ' · ' + c.distrito : '') +
        (c.director && c.director.nombre ? ' · Dir: ' + c.director.nombre : '') + '.';
    }
  };

  instInput.addEventListener('input', showDropdown);
  instInput.addEventListener('focus', () => { if (instInput.value.length === 0) showDropdown(); });
  instInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });

  // ---- Autocompletado de Responsables ----
  const respInputs = host.querySelectorAll('.respAutocompleteInp');

  function selectResponsable(r, inp, hintEl) {
    inp.value = r.nombresApellidos || '';
    if (hintEl) {
      hintEl.style.display = 'block';
      hintEl.textContent = '✓ ' + (r.cargo || r.especialista || 'Especialista') +
        (r.red ? ' · ' + r.red : '') +
        (r.modalidad ? ' · ' + r.modalidad : '') +
        (r.celular ? ' · Cel: ' + r.celular : '');
    }

    // Auto-completar otros campos configurados en la ficha relativos al especialista
    normExtras.forEach((ex, idx) => {
      const lower = (ex.label || '').toLowerCase();
      const otherInp = host.querySelector('[data-extra-id="' + ex.id + '"]') || host.querySelector('[data-extra-idx="' + idx + '"]');
      if (!otherInp || otherInp === inp) return;

      if (lower.includes('cargo') && r.cargo && !otherInp.value) {
        otherInp.value = r.cargo;
      } else if ((lower.includes('correo') || lower.includes('email')) && !lower.includes('director') && r.correo && !otherInp.value) {
        otherInp.value = r.correo;
      } else if ((lower.includes('celular') || lower.includes('teléfono') || lower.includes('telefono')) && !lower.includes('director') && r.celular && !otherInp.value) {
        otherInp.value = r.celular;
      } else if (lower.includes('modalidad') && r.modalidad && !otherInp.value) {
        otherInp.value = r.modalidad;
      } else if ((lower.includes('red') || lower.includes('rei')) && r.red && !otherInp.value) {
        otherInp.value = r.red;
      }
    });
  }

  respInputs.forEach(inp => {
    const wrap = inp.closest('.ieSearchWrap');
    if (!wrap) return;
    const drop = wrap.querySelector('.respDropdown');
    const fieldEl = inp.closest('.field');
    const hintEl = fieldEl ? fieldEl.querySelector('.respHint') : null;
    if (!drop) return;

    const renderRespMatches = () => {
      const q = normalizeText(inp.value);
      const matches = (state.responsables || []).filter(r => {
        if (!q) return true;
        return normalizeText(r.nombresApellidos).includes(q) ||
               normalizeText(r.especialista).includes(q) ||
               normalizeText(r.cargo).includes(q) ||
               normalizeText(r.red).includes(q) ||
               normalizeText(r.distrito).includes(q) ||
               normalizeText(r.modalidad).includes(q) ||
               normalizeText(r.correo).includes(q);
      }).slice(0, 20);

      if (!matches.length) {
        drop.style.display = 'none';
        return;
      }

      drop.innerHTML = matches.map(r => {
        const modBadge = r.modalidad ? ' <span class="badge" style="font-size:10px;padding:1px 6px;background:var(--surface-2);margin-left:4px">' + esc(r.modalidad) + '</span>' : '';
        return '<div class="ieDropdownItem" data-respid="' + esc(r.id) + '">' +
          '<div class="ieDropMain">' + esc(r.nombresApellidos) + modBadge + '</div>' +
          '<div class="ieDropSub">' +
            (r.cargo ? esc(r.cargo) : (r.especialista ? esc(r.especialista) : '')) +
            (r.red ? ' · <strong>' + esc(r.red) + '</strong>' : '') +
            (r.distrito ? ' · ' + esc(r.distrito) : '') +
            (r.celular ? ' · Cel: ' + esc(r.celular) : '') +
          '</div>' +
        '</div>';
      }).join('');
      drop.style.display = 'block';

      drop.querySelectorAll('.ieDropdownItem').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const r = (state.responsables || []).find(x => x.id === item.dataset.respid);
          if (r) {
            selectResponsable(r, inp, hintEl);
          }
          drop.style.display = 'none';
        });
      });
    };

    inp.addEventListener('input', renderRespMatches);
    inp.addEventListener('focus', () => { if (inp.value.length === 0) renderRespMatches(); });
    inp.addEventListener('blur', () => { setTimeout(() => { drop.style.display = 'none'; }, 200); });
  });

  // ---- Pre-cargar datos si estamos en modo edición ----
  if (editingSubmissionData) {
    const d = editingSubmissionData;
    setTimeout(() => {
      if (document.getElementById('f_institucion')) {
        document.getElementById('f_institucion').value = d.institucion || '';
        document.getElementById('f_fecha').value       = d.fecha || todayStr();
        document.getElementById('f_visita').value      = d.visita || 1;
        document.getElementById('f_observaciones').value = d.observaciones || '';
        regCompromisos = [...(d.compromisos || [])];
        regSelectedColegioId = d.colegioId || null;
        renderCompList();

        // Precargar respuestas
        (d.respuestas || []).forEach(r => {
          const radio = document.querySelector('input[name="item_' + r.id + '"][value="' + r.valor + '"]');
          if (radio) radio.checked = true;
        });

        // Precargar campos de cabecera configurados
        normExtras.forEach((ex, i) => {
          let val = '';
          const found = (d.extras || []).find(x => x.id === ex.id || (x.label && x.label.trim().toLowerCase() === ex.label.trim().toLowerCase()));
          if (found && found.value !== undefined) {
            val = found.value;
          } else {
            // Compatibilidad con campos raíz de fichas guardadas anteriormente
            const l = (ex.label || '').toLowerCase();
            if (l.includes('ugel') && d.ugel) val = d.ugel;
            else if ((l.includes('red') || l.includes('rei')) && d.red) val = d.red;
            else if ((l.includes('código') || l.includes('codigo')) && d.codigoModular) val = d.codigoModular;
            else if (l.includes('director') && d.director) val = d.director;
            else if ((l.includes('responsable') || l.includes('especialista')) && d.responsable) val = d.responsable;
          }

          if (val !== undefined && val !== '') {
            if (ex.tipo === 'si_no') {
              const rad = document.querySelector('input[name="extra_' + ex.id + '"][value="' + val + '"]');
              if (rad) rad.checked = true;
            } else {
              const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
              if (inp) inp.value = val;
            }
          }
        });

        if (hint && d.institucion) {
          hint.style.display = 'block';
          hint.textContent = '✓ Datos precargados para edición.';
        }
      }
    }, 0);
  }

  document.getElementById('addCompBtn').addEventListener('click', () => {
    regCompromisos.push({ texto: '', responsable: '', plazo: '' });
    renderCompList();
  });
  renderCompList();

  const cancelFormBtn = document.getElementById('cancelFormBtn');
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', () => {
      if (editingSubmissionId) {
        editingSubmissionId   = null;
        editingSubmissionData = null;
        regBuiltFor = null;
        regSelectedTypeId = null;
        if (navigate) navigate('consolidado');
      } else {
        if (confirm('¿Deseas cancelar el registro? Se descartarán los cambios ingresados.')) {
          regBuiltFor = null;
          regCompromisos = [];
          regSelectedColegioId = null;
          if (navigate) navigate('resumen');
        }
      }
    });
  }

  if (AI_SCAN_ENDPOINT) {
    document.getElementById('scanBtn').addEventListener('click', () => document.getElementById('scanInput').click());
    document.getElementById('scanInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) extractFichaFromImage(e.target.files[0], ft, currentUser);
      e.target.value = '';
    });
  }

  document.getElementById('regForm').addEventListener('submit', (e) => onSubmitRegistro(e, ft, dbNs, navigate));
}

function renderCompList() {
  const el = document.getElementById('compList');
  if (!el) return;
  if (regCompromisos.length === 0) { el.innerHTML = '<p class="helpText" style="margin-top:0">Sin compromisos agregados aún.</p>'; return; }
  el.innerHTML = regCompromisos.map((c, i) =>
    '<div class="compRow">' +
      '<input type="text" placeholder="Compromiso" value="' + esc(c.texto) + '" data-comp="' + i + '" data-f="texto">' +
      '<input type="text" placeholder="Responsable" value="' + esc(c.responsable) + '" data-comp="' + i + '" data-f="responsable">' +
      '<input type="text" placeholder="Plazo" style="max-width:120px" value="' + esc(c.plazo) + '" data-comp="' + i + '" data-f="plazo">' +
      '<button type="button" class="iconBtn" data-rmcomp="' + i + '" title="Quitar">✕</button>' +
    '</div>'
  ).join('');
  el.querySelectorAll('input[data-comp]').forEach(inp => {
    inp.addEventListener('input', () => { regCompromisos[+inp.dataset.comp][inp.dataset.f] = inp.value; });
  });
  el.querySelectorAll('[data-rmcomp]').forEach(btn => {
    btn.addEventListener('click', () => { regCompromisos.splice(+btn.dataset.rmcomp, 1); renderCompList(); });
  });
}

async function onSubmitRegistro(e, ft, dbNs, navigate) {
  e.preventDefault();
  if (!dbNs) { showToast('No hay conexión a la base de datos.'); return; }
  if (!ft) return;

  const respuestas = [];
  ft.secciones.forEach(sec => sec.items.forEach(it => {
    const chk = document.querySelector('input[name="item_' + it.id + '"]:checked');
    if (chk) respuestas.push({ id: it.id, texto: it.texto, seccion: sec.nombre, valor: chk.value });
  }));

  const normExtras = normalizeExtras(ft.extras);
  const extrasCollected = [];
  for (let i = 0; i < normExtras.length; i++) {
    const ex = normExtras[i];
    let val = '';
    if (ex.tipo === 'si_no') {
      const chk = document.querySelector('input[name="extra_' + ex.id + '"]:checked');
      val = chk ? chk.value : '';
    } else {
      const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
      val = inp ? inp.value.trim() : '';
    }

    if (ex.required && !val) {
      showToast('El campo de cabecera "' + ex.label + '" es obligatorio.');
      if (ex.tipo !== 'si_no') {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        if (inp) inp.focus();
      }
      return;
    }
    extrasCollected.push({ id: ex.id, label: ex.label, value: val, tipo: ex.tipo });
  }

  // Extraer valores para compatibilidad con filtros y tablas existentes (UGEL, Código, Director, etc.)
  let ugelVal = '', redVal = '', codigoVal = '', responsableVal = '', directorVal = '';
  extrasCollected.forEach(ex => {
    const l = (ex.label || '').toLowerCase();
    if (l.includes('ugel') && !ugelVal) ugelVal = ex.value;
    if ((l.includes('red') || l.includes('rei')) && !redVal) redVal = ex.value;
    if ((l.includes('código') || l.includes('codigo')) && !codigoVal) codigoVal = ex.value;
    if ((l.includes('responsable') || l.includes('especialista')) && !responsableVal) responsableVal = ex.value;
    if (l.includes('director') && !directorVal) directorVal = ex.value;
  });

  const instVal = document.getElementById('f_institucion').value.trim();
  let matchedCol = null;
  if (regSelectedColegioId) {
    matchedCol = (state.colegios || []).find(c => c.id === regSelectedColegioId);
  }
  if (!matchedCol && instVal) {
    const instNorm = normalizeText(instVal);
    matchedCol = (state.colegios || []).find(c => normalizeText(c.ie) === instNorm);
  }

  if (matchedCol) {
    if (!ugelVal) ugelVal = matchedCol.dependencia || 'UGEL 03';
    if (!redVal) redVal = matchedCol.rei || '';
    if (!codigoVal) codigoVal = matchedCol.codigoLocal || matchedCol.codigoModular || '';
    if (!directorVal && matchedCol.director && matchedCol.director.nombre) directorVal = matchedCol.director.nombre;
  }
  if (!ugelVal) ugelVal = 'UGEL 03';
  if (!redVal) redVal = 'No aplica';

  const docData = {
    fichaTypeId:     ft.id,
    fichaTypeNombre: ft.nombre,
    tipoRespuesta:   ft.tipoRespuesta,
    institucion:     instVal,
    colegioId:       (matchedCol && matchedCol.id) || regSelectedColegioId || null,
    fecha:           document.getElementById('f_fecha').value,
    visita:          Number(document.getElementById('f_visita').value) || 1,
    ugel:            ugelVal,
    red:             redVal,
    codigoModular:   codigoVal,
    responsable:     responsableVal,
    director:        directorVal,
    extras:          extrasCollected,
    respuestas,
    observaciones:   document.getElementById('f_observaciones').value.trim(),
    compromisos:     regCompromisos.filter(c => c.texto.trim()),
    createdAt:       editingSubmissionId ? (editingSubmissionData.createdAt || Date.now()) : Date.now(),
  };

  if (!docData.institucion || !docData.fecha || !docData.visita) {
    showToast('Completa los campos obligatorios: Institución, Fecha y N° de visita.');
    return;
  }

  const isEdit = !!editingSubmissionId;
  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true; btn.textContent = isEdit ? 'Actualizando...' : 'Guardando...';

  try {
    if (isEdit) {
      await dbNs.collection('submissions').doc(editingSubmissionId).set({ ...docData, updatedAt: Date.now() });
      showToast('Ficha actualizada correctamente.');
      editingSubmissionId   = null;
      editingSubmissionData = null;
      regBuiltFor = null;
      regSelectedTypeId = null;
      if (navigate) navigate('consolidado');
    } else {
      await dbNs.collection('submissions').add(docData);
      showToast('Ficha guardada correctamente.');
      regBuiltFor = null;

      const instEl = document.getElementById('f_institucion');
      if (instEl) instEl.value = '';
      regSelectedColegioId = null;

      const form = document.getElementById('regForm');
      if (form) {
        form.querySelectorAll('input:not([type=radio]):not([type=checkbox]), textarea').forEach(i => {
          if (i.id !== 'f_fecha' && i.id !== 'f_visita') i.value = '';
        });
        form.querySelectorAll('input[type=radio]').forEach(r => r.checked = false);
        form.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false);
      }

      const fechaEl = document.getElementById('f_fecha');
      if (fechaEl) fechaEl.value = todayStr();
      const visitaEl = document.getElementById('f_visita');
      if (visitaEl) visitaEl.value = '1';

      const hint = document.getElementById('regColegioHint');
      if (hint) {
        hint.style.display = 'none';
        hint.textContent = '';
      }
      regCompromisos = [];
      renderCompList();

      const formHost = document.getElementById('regFormHost');
      if (formHost) {
        formHost.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  } catch (err) {
    console.error('Error al guardar submission:', err);
    showToast('No se pudo guardar: [' + (err.code || 'error') + '] ' + err.message);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = isEdit ? 'Actualizar ficha' : 'Guardar ficha';
    }
  }
}

async function extractFichaFromImage(file, ft, currentUser) {
  const statusEl = document.getElementById('scanStatus');
  const btn = document.getElementById('scanBtn');
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = 'Leyendo la imagen con IA... esto puede tardar hasta un minuto.';
  const itemsDesc  = ft.secciones.map(sec => 'Sección "' + sec.nombre + '":\n' + sec.items.map(it => '- id:' + it.id + ' | ' + it.texto).join('\n')).join('\n\n');
  const validValues = RESPONSE_OPTIONS[ft.tipoRespuesta].map(o => o.v).join(', ');
  const extrasDesc = (ft.extras || []).map(ex => ex.label).join(' | ') || '(ninguno)';
  const prompt = 'Digitaliza la ficha de monitoreo educativa "' + ft.nombre + '". Responde SOLO con JSON válido:\n' +
    '{"institucion":"","ugel":"","red":"","codigoModular":"","fecha":"AAAA-MM-DD","visita":1,"responsable":"","director":"",' +
    '"extras":{},"respuestas":[{"id":"","valor":""}],"observaciones":"","compromisos":[]}\n' +
    'Valores válidos para respuestas: ' + validValues + '. Ítems:\n' + itemsDesc + '\nExtras: ' + extrasDesc;
  try {
    const base64 = await fileToBase64(file);
    const idToken = currentUser ? await currentUser.getIdToken() : null;
    const resp = await fetch(AI_SCAN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idToken ? { 'Authorization': 'Bearer ' + idToken } : {}) },
      body: JSON.stringify({ prompt, imageBase64: base64, mediaType: file.type || 'image/jpeg' }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    applyExtractedData(data, ft);
    if (statusEl) statusEl.textContent = '';
    showToast('Ficha leída. Revisa los datos antes de guardar.');
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = 'No se pudo leer la ficha: ' + (err.message || 'error');
    showToast('No se pudo leer la ficha con IA.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function applyExtractedData(data, ft) {
  if (!data || typeof data !== 'object') return;
  const setVal = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  setVal('f_institucion', data.institucion); setVal('f_ugel', data.ugel); setVal('f_red', data.red);
  setVal('f_codigo', data.codigoModular);
  if (data.fecha && /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) setVal('f_fecha', data.fecha);
  if (data.visita) setVal('f_visita', Number(data.visita) || 1);
  setVal('f_responsable', data.responsable); setVal('f_director', data.director); setVal('f_observaciones', data.observaciones);
  const normExtras = normalizeExtras(ft.extras);
  if (data.extras && typeof data.extras === 'object') {
    normExtras.forEach((ex, i) => {
      const v = data.extras[ex.label] || data.extras[ex.id];
      if (v) {
        if (ex.tipo === 'si_no') {
          const radio = document.querySelector('input[name="extra_' + ex.id + '"][value="' + v + '"]');
          if (radio) radio.checked = true;
        } else {
          const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
          if (inp) inp.value = v;
        }
      }
    });
  }
  if (Array.isArray(data.respuestas)) {
    const validVals = new Set(RESPONSE_OPTIONS[ft.tipoRespuesta].map(o => o.v));
    data.respuestas.forEach(r => { if (!r || !r.id || !validVals.has(r.valor)) return; const radio = document.querySelector('input[name="item_' + r.id + '"][value="' + r.valor + '"]'); if (radio) radio.checked = true; });
  }
  if (Array.isArray(data.compromisos) && data.compromisos.length) {
    regCompromisos = data.compromisos.filter(c => c && c.texto).map(c => ({ texto: c.texto || '', responsable: c.responsable || '', plazo: c.plazo || '' }));
    renderCompList();
  }
}

/* ============================= COLEGIOS — HELPERS ============================= */
export function buildColegioIndex(state) {
  const byId = {}, byCode = {}, byIe = {};
  state.colegios.forEach(c => {
    byId[c.id] = c;
    if (c.codigoLocal) byCode[normalizeText(c.codigoLocal)] = c;
    if (c.ie) byIe[normalizeText(c.ie)] = c;
  });
  return { byId, byCode, byIe };
}

export function matchColegio(sub, idx) {
  if (!sub) return null;
  if (sub.colegioId && idx.byId[sub.colegioId]) return idx.byId[sub.colegioId];
  if (sub.codigoModular) { const c = idx.byCode[normalizeText(sub.codigoModular)]; if (c) return c; }
  if (sub.institucion)   { const c = idx.byIe[normalizeText(sub.institucion)]; if (c) return c; }
  return null;
}

export function groupSubmissionsByColegio(state) {
  const idx = buildColegioIndex(state);
  const map = {};
  state.colegios.forEach(c => map[c.id] = []);
  state.submissions.forEach(s => { const c = matchColegio(s, idx); if (c) map[c.id].push(s); });
  return map;
}

export function colegioFichaTypeStats(subs, getFichaType) {
  const byType = {};
  subs.forEach(s => {
    const ft = getFichaType(s.fichaTypeId);
    if (!byType[s.fichaTypeId]) byType[s.fichaTypeId] = { ftId: s.fichaTypeId, nombre: s.fichaTypeNombre || (ft ? ft.nombre : '—'), count: 0, sum: 0, cnt: 0, last: null };
    const b = byType[s.fichaTypeId];
    b.count++;
    if (ft) { const st = computeStats(s, ft); if (st.pct !== null) { b.sum += st.pct; b.cnt++; } }
    if (!b.last || s.fecha > b.last) b.last = s.fecha;
  });
  return Object.values(byType).map(b => ({ ...b, avg: b.cnt ? Math.round(b.sum / b.cnt) : null })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/* ============================= CONSOLIDADO TAB ============================= */
let consSelectedTypeId = null;
let consFilters = { institucion: '', ugel: '', red: '', estado: '', visita: '', responsable: '', desde: '', hasta: '', distrito: '', tipoGestion: '' };
let consExpanded = null;

export function renderConsolidadoTab(container, state, getFichaType, dbNs, isAdmin, navigate, currentUser = null) {
  if (currentUser) _currentSessionUser = currentUser;
  const user = currentUser || _currentSessionUser || (state && state.currentUser) || null;

  if (state.fichaTypes.length === 0) {
    container.innerHTML = '<div class="pageHead"><h2>Reportes</h2></div>' +
      '<div class="empty"><h4>Aún no hay tipos de ficha</h4><p>Crea un tipo de ficha y registra visitas para ver reportes de avance aquí.</p></div>';
    return;
  }
  if (consSelectedTypeId && consSelectedTypeId !== '__ALL__' && !getFichaType(consSelectedTypeId)) consSelectedTypeId = null;
  if (!consSelectedTypeId && state.fichaTypes.length > 0) {
    consSelectedTypeId = state.fichaTypes[0].id;
  }

  const opts = '<option value="__ALL__"' + (consSelectedTypeId === '__ALL__' ? ' selected' : '') + '>📊 Todas las fichas (avance general)</option>' +
    state.fichaTypes.map(ft =>
      '<option value="' + ft.id + '"' + (ft.id === consSelectedTypeId ? ' selected' : '') + '>' + esc(ft.nombre) + '</option>'
    ).join('');

  const isAllMode = consSelectedTypeId === '__ALL__';
  const ft = (!isAllMode && consSelectedTypeId) ? getFichaType(consSelectedTypeId) : null;
  const subsForVisitas = isAllMode ? state.submissions : (ft ? state.submissions.filter(s => s.fichaTypeId === ft.id) : []);

  // Opciones de visitas disponibles
  const visitaSet = new Set(subsForVisitas.map(s => Number(s.visita)).filter(Boolean));
  if (visitaSet.size === 0) [1, 2, 3].forEach(v => visitaSet.add(v));
  const visitaOptions = Array.from(visitaSet).sort((a, b) => a - b);

  // Opciones de responsables: SOLO especialistas/coordinadores de state.responsables
  const respSet = new Set();
  (state.responsables || []).forEach(r => {
    if (r.nombresApellidos) respSet.add(r.nombresApellidos.trim());
  });
  const responsableOptions = Array.from(respSet).sort((a, b) => a.localeCompare(b));

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Reportes</h2><p>Gráficas, avance por sección, resumen por institución y descarga en PDF.</p></div>' +
    '<div class="panel">' +
      '<div class="filterBar" style="margin-bottom:0">' +
        '<div class="field" style="flex:2;min-width:240px">' +
          '<label for="consSelect">Tipo de ficha</label>' +
          '<select id="consSelect"><option value="">— Selecciona un tipo —</option>' + opts + '</select>' +
        '</div>' +
        '<div class="field" style="flex:1;min-width:130px">' +
          '<label for="top_fil_estado">Estado</label>' +
          '<select id="top_fil_estado">' +
            '<option value="">Todos</option>' +
            ['Logrado', 'En proceso', 'Inicio'].map(v => '<option value="' + v + '"' + (v === consFilters.estado ? ' selected' : '') + '>' + v + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="field" style="flex:1;min-width:120px">' +
          '<label for="top_fil_visita">Visita</label>' +
          '<select id="top_fil_visita">' +
            '<option value="">Todas</option>' +
            visitaOptions.map(v => '<option value="' + v + '"' + (String(v) === String(consFilters.visita) ? ' selected' : '') + '>Visita ' + v + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="field" style="flex:1.5;min-width:180px">' +
          '<label for="top_fil_responsable">Responsable</label>' +
          '<input type="search" id="top_fil_responsable" list="dl_resp_filter" value="' + esc(consFilters.responsable) + '" placeholder="Buscar especialista..." autocomplete="off">' +
          '<datalist id="dl_resp_filter">' + responsableOptions.map(r => '<option value="' + esc(r) + '">').join('') + '</datalist>' +
        '</div>' +
        ((consFilters.estado || consFilters.visita || consFilters.responsable) ? (
          '<button type="button" class="btn secondary small" id="top_fil_clear" style="align-self:flex-end;margin-bottom:2px" title="Limpiar filtros de tipo de ficha">Limpiar</button>'
        ) : '') +
      '</div>' +
    '</div>' +
    '<div id="consHost"></div>';

  document.getElementById('consSelect').addEventListener('change', e => {
    consSelectedTypeId = e.target.value || null;
    consExpanded = null;
    renderConsolidadoTab(container, state, getFichaType, dbNs, isAdmin, navigate, user);
  });
  document.getElementById('top_fil_estado').addEventListener('change', e => {
    consFilters.estado = e.target.value;
    renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
  });
  document.getElementById('top_fil_visita').addEventListener('change', e => {
    consFilters.visita = e.target.value;
    renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
  });
  const respInput = document.getElementById('top_fil_responsable');
  let respDebounce = null;
  respInput.addEventListener('input', e => {
    clearTimeout(respDebounce);
    respDebounce = setTimeout(() => {
      consFilters.responsable = e.target.value;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    }, 300);
  });
  const topClear = document.getElementById('top_fil_clear');
  if (topClear) {
    topClear.addEventListener('click', () => {
      consFilters.estado = '';
      consFilters.visita = '';
      consFilters.responsable = '';
      renderConsolidadoTab(container, state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
}

function renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, currentUser = null) {
  if (currentUser) _currentSessionUser = currentUser;
  const user = currentUser || _currentSessionUser || (state && state.currentUser) || null;
  const host = document.getElementById('consHost');
  if (!host) return;
  if (!consSelectedTypeId) { host.innerHTML = ''; return; }

  const isAllMode = consSelectedTypeId === '__ALL__';
  const ft = isAllMode ? null : getFichaType(consSelectedTypeId);
  if (!isAllMode && !ft) { host.innerHTML = ''; return; }

  let subs = isAllMode
    ? state.submissions.slice()
    : state.submissions.filter(s => s.fichaTypeId === ft.id);
  if (consFilters.institucion) subs = subs.filter(s => (s.institucion || '').toLowerCase().includes(consFilters.institucion.toLowerCase()));
  if (consFilters.ugel) subs = subs.filter(s => (s.ugel || '').toLowerCase().includes(consFilters.ugel.toLowerCase()));
  if (consFilters.red) subs = subs.filter(s => (s.red || '').toLowerCase().includes(consFilters.red.toLowerCase()));
  if (consFilters.visita) subs = subs.filter(s => String(s.visita || 1) === String(consFilters.visita));
  if (consFilters.responsable) {
    const rNorm = consFilters.responsable.trim().toLowerCase();
    subs = subs.filter(s => (s.responsable || '').trim().toLowerCase().includes(rNorm));
  }
  if (consFilters.desde) subs = subs.filter(s => s.fecha >= consFilters.desde);
  if (consFilters.hasta) subs = subs.filter(s => s.fecha <= consFilters.hasta);
  const colegioIdx = buildColegioIndex(state);
  if (consFilters.distrito) subs = subs.filter(s => normalizeText((matchColegio(s, colegioIdx) || {}).distrito).includes(normalizeText(consFilters.distrito)));
  if (consFilters.tipoGestion) subs = subs.filter(s => (matchColegio(s, colegioIdx) || {}).tipoGestion === consFilters.tipoGestion);
  subs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt || 0) - (a.createdAt || 0));

  // En modo "Todas", cada submission se evalúa contra su propio tipo de ficha
  let statsList = subs.map(s => {
    const sFt = isAllMode ? getFichaType(s.fichaTypeId) : ft;
    return { s, st: sFt ? computeStats(s, sFt) : { pct: null, secciones: [] } };
  });
  if (consFilters.estado) statsList = statsList.filter(x => statusFromPct(x.st.pct).label === consFilters.estado);
  const withPct = statsList.filter(x => x.st.pct !== null);
  const avgPct  = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : null;
  const instCount = new Set(statsList.map(x => (x.s.institucion || '') + '|' + (x.s.ugel || ''))).size;

  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => { const l = statusFromPct(x.st.pct).label; if (l === 'Logrado') dist.logrado++; else if (l === 'En proceso') dist.proceso++; else if (l === 'Inicio') dist.inicio++; else dist.none++; });

  const seg = '<div class="distWrap">' +
    donutChart([
      { value: dist.logrado, color: 'var(--primary)', label: 'Logrado' },
      { value: dist.proceso, color: 'var(--accent)', label: 'En proceso' },
      { value: dist.inicio, color: 'var(--danger)', label: 'Inicio' },
      { value: dist.none, color: 'var(--line-strong)', label: 'Sin datos' },
    ], { centerLabel: (dist.logrado + dist.proceso + dist.inicio + dist.none), centerSub: 'fichas' }) +
    '<div class="seglegend" style="flex-direction:column;gap:8px;align-items:flex-start">' +
    '<span><span class="dot" style="background:var(--primary)"></span>Logrado (' + dist.logrado + ')</span>' +
    '<span><span class="dot" style="background:var(--accent)"></span>En proceso (' + dist.proceso + ')</span>' +
    '<span><span class="dot" style="background:var(--danger)"></span>Inicio (' + dist.inicio + ')</span>' +
    (dist.none ? '<span><span class="dot" style="background:var(--line-strong)"></span>Sin datos (' + dist.none + ')</span>' : '') +
    '</div></div>';

  // Avance por sección (solo para tipo de ficha individual)
  let secRows = '';
  let itemReportHtml = '';
  if (!isAllMode && ft) {
    const secAgg = {};
    ft.secciones.forEach(sec => secAgg[sec.nombre] = { sum: 0, cnt: 0 });
    statsList.forEach(x => x.st.secciones.forEach(sc => { if (sc.pct !== null) { secAgg[sc.nombre].sum += sc.pct; secAgg[sc.nombre].cnt++; } }));
    secRows = ft.secciones.map(sec => { const a = secAgg[sec.nombre]; const avg = a.cnt ? Math.round(a.sum / a.cnt) : null; return '<div class="barRow"><div class="name">' + esc(sec.nombre) + '</div>' + bar(avg) + '<div class="val">' + (avg === null ? '—' : avg + '%') + '</div></div>'; }).join('');

    const itemAgg = computeItemAgg(statsList.map(x => x.s), ft);
    itemReportHtml = renderItemReportHtml(itemAgg, ft.tipoRespuesta);
  }

  // Avance general por tipo de ficha (solo para modo "Todas")
  let allTypesSummaryHtml = '';
  if (isAllMode) {
    const typeAgg = {};
    statsList.forEach(x => {
      const tid = x.s.fichaTypeId;
      if (!typeAgg[tid]) {
        const tft = getFichaType(tid);
        typeAgg[tid] = { nombre: tft ? tft.nombre : 'Desconocido', icono: tft ? (tft.icono || '📋') : '📋', total: 0, sum: 0, cnt: 0, logrado: 0, proceso: 0, inicio: 0 };
      }
      const a = typeAgg[tid];
      a.total++;
      if (x.st.pct !== null) { a.sum += x.st.pct; a.cnt++; }
      const st = statusFromPct(x.st.pct).label;
      if (st === 'Logrado') a.logrado++;
      else if (st === 'En proceso') a.proceso++;
      else if (st === 'Inicio') a.inicio++;
    });
    const typeSummaryRows = Object.values(typeAgg).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(a => {
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      return '<div class="barRow" style="padding:8px 0">' +
        '<div class="name" style="min-width:240px">' + a.icono + ' ' + esc(a.nombre) +
        ' <span style="color:var(--ink-soft);font-weight:400;font-size:12px">(' + a.total + ' fichas)</span>' +
        '</div>' + bar(avg) +
        '<div class="val" style="min-width:60px;text-align:right">' + (avg === null ? '—' : avg + '%') + '</div>' +
        '<div style="display:flex;gap:4px;margin-left:8px">' +
          '<span class="badge st-logrado" style="font-size:10px">' + a.logrado + '</span>' +
          '<span class="badge st-proceso" style="font-size:10px">' + a.proceso + '</span>' +
          '<span class="badge st-inicio" style="font-size:10px">' + a.inicio + '</span>' +
        '</div>' +
      '</div>';
    }).join('');
    allTypesSummaryHtml = '<div class="panel"><h3>Avance general por tipo de ficha</h3>' +
      '<p class="helpText" style="margin-top:0">Promedio de cumplimiento de cada tipo de ficha con su distribución de estados.</p>' +
      typeSummaryRows +
    '</div>';
  }

  const visAgg = {};
  statsList.forEach(x => { const v = x.s.visita || 1; if (!visAgg[v]) visAgg[v] = { sum: 0, cnt: 0 }; if (x.st.pct !== null) { visAgg[v].sum += x.st.pct; visAgg[v].cnt++; } });
  const visRows = Object.keys(visAgg).sort((a, b) => a - b).map(v => { const a = visAgg[v]; const avg = a.cnt ? Math.round(a.sum / a.cnt) : null; return '<div class="barRow"><div class="name">Visita ' + v + '</div>' + bar(avg) + '<div class="val">' + (avg === null ? '—' : avg + '%') + '</div></div>'; }).join('') || '<p class="helpText">Sin datos suficientes.</p>';

  const rows = statsList.map(x => {
    const s = x.s; const st = x.st; const status = statusFromPct(st.pct);
    const isOpen = consExpanded === s.id;
    const detailContent = isOpen ? buildDetail(s) : '';
    const pdfBtn  = '<button class="actBtn pdfBtn" data-pdfsub="' + s.id + '" title="Descargar Ficha Oficial en PDF (A4)">📄 PDF</button>';
    const editBtn = '<button class="actBtn" data-edit="' + s.id + '" title="Corregir ficha">✏️ Editar</button>';
    const delBtn  = isAdmin ? '<button class="actBtn delBtn" data-del="' + s.id + '" title="Eliminar">✕</button>' : '';
    const typeName = s.fichaTypeNombre || (getFichaType(s.fichaTypeId) || {}).nombre || '—';
    const typeCol = isAllMode ? '<td><span class="badge st-none" style="font-size:10.5px">' + esc(typeName) + '</span></td>' : '';
    const ugelRedCol = '<td>' + esc(s.ugel || 'UGEL 03') + '<br><small style="color:var(--text-muted);font-weight:600;">' + esc(s.red || 'No aplica') + '</small></td>';
    return '<tr class="clickable" data-row="' + s.id + '"><td>' + fmtDate(s.fecha) + '</td><td>' + esc(s.institucion) + '</td>' + typeCol + ugelRedCol + '<td>' + (s.visita ? 'V' + s.visita : '—') + '</td><td>' + esc(s.responsable || '—') + '</td><td>' + (st.pct === null ? '—' : st.pct + '%') + '</td><td><span class="badge ' + status.cls + '">' + status.label + '</span></td><td style="white-space:nowrap"><div class="rowActions">' + pdfBtn + editBtn + delBtn + '</div></td></tr>' +
      (isOpen ? '<tr class="detailRow"><td colspan="' + (isAllMode ? 9 : 8) + '">' + detailContent + '</td></tr>' : '');
  }).join('') || '<tr><td colspan="' + (isAllMode ? 9 : 8) + '" style="text-align:center;color:var(--text-600);padding:22px">No hay fichas que coincidan con los filtros.</td></tr>';

  const byInst = {};
  statsList.forEach(x => {
    const key = (x.s.institucion || '') + '|' + (x.s.ugel || '');
    if (!byInst[key]) byInst[key] = { institucion: x.s.institucion, ugel: x.s.ugel, red: x.s.red, visitas: [] };
    byInst[key].visitas.push(x);
    if (x.s.red && !byInst[key].red) byInst[key].red = x.s.red;
  });
  const instRows = Object.values(byInst).sort((a, b) => (a.institucion || '').localeCompare(b.institucion || '')).map(g => {
    g.visitas.sort((a, b) => (b.s.fecha || '').localeCompare(a.s.fecha || ''));
    const last = g.visitas[0];
    const withP = g.visitas.filter(x => x.st.pct !== null);
    const avg = withP.length ? Math.round(withP.reduce((a, x) => a + x.st.pct, 0) / withP.length) : null;
    const gst = statusFromPct(avg);
    return '<tr><td>' + esc(g.institucion) + '</td><td>' + esc(g.red || '—') + '</td><td>' + esc(g.ugel || '—') + '</td>' +
      '<td>' + g.visitas.length + '</td><td>' + fmtDate(last.s.fecha) + '</td>' +
      '<td>' + (avg === null ? '—' : avg + '%') + ' <span class="badge ' + gst.cls + '">' + gst.label + '</span></td></tr>';
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-600);padding:20px">Sin instituciones con los filtros actuales.</td></tr>';

  const subsForRed = isAllMode ? state.submissions : state.submissions.filter(s => s.fichaTypeId === ft.id);
  const redOptions = Array.from(new Set(subsForRed.filter(s => s.red).map(s => s.red))).sort();

  const tblTypeHeader = isAllMode ? '<th>Tipo de ficha</th>' : '';

  host.innerHTML = '' +
    '<div id="reportCapture">' +
    '<div class="cards">' +
      '<div class="card"><div class="num">' + statsList.length + '</div><div class="lbl">Fichas registradas</div></div>' +
      '<div class="card"><div class="num">' + instCount + '</div><div class="lbl">Instituciones</div></div>' +
      (isAllMode ? '<div class="card"><div class="num">' + state.fichaTypes.length + '</div><div class="lbl">Tipos de ficha</div></div>' : '') +
      '<div class="card"><div class="num">' + (avgPct === null ? '—' : avgPct + '%') + '</div><div class="lbl">Cumplimiento promedio</div></div>' +
    '</div>' +
    '<div class="panel"><h3>Distribución de resultados</h3>' + seg + '</div>' +
    allTypesSummaryHtml +
    (!isAllMode ? '<div class="panel"><h3>Avance por sección</h3>' + (secRows || '<p class="helpText">Sin secciones.</p>') + '</div>' : '') +
    (!isAllMode ? '<div class="panel"><h3>Reporte por ítem <small>resultado de cada indicador</small></h3>' + itemReportHtml + '</div>' : '') +
    '<div class="panel"><h3>Evolución por N° de visita</h3>' + visRows + '</div>' +
    '<div class="panel"><h3>Resumen por institución</h3>' +
      '<div class="tblWrap"><table><thead><tr><th>Institución</th><th>RED</th><th>UGEL</th><th>N° visitas</th><th>Última visita</th><th>Avance</th></tr></thead><tbody>' + instRows + '</tbody></table></div>' +
    '</div></div>' +
    '<div class="panel">' +
      '<h3>Fichas registradas</h3>' +
      '<div class="filterBar">' +
        '<div class="field"><label>Institución</label><input type="search" id="fil_inst" list="dl_fil_inst" value="' + esc(consFilters.institucion) + '" placeholder="Buscar..."></div>' +
        '<datalist id="dl_fil_inst">' + seedSuggestions('institucion', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
        '<div class="field"><label>RED</label><select id="fil_red"><option value="">Todas</option>' + redOptions.map(r => '<option value="' + esc(r) + '"' + (r === consFilters.red ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select></div>' +
        '<div class="field"><label>UGEL</label><input type="search" id="fil_ugel" value="' + esc(consFilters.ugel) + '" placeholder="Buscar..."></div>' +
        (state.colegios.length ? (
          '<div class="field"><label>Distrito</label><input type="search" id="fil_distrito" value="' + esc(consFilters.distrito) + '" placeholder="Buscar..."></div>' +
          '<div class="field"><label>Tipo de gestión</label><select id="fil_tipogestion"><option value="">Todos</option>' +
            Array.from(new Set(state.colegios.map(c => c.tipoGestion).filter(Boolean))).sort().map(g => '<option value="' + esc(g) + '"' + (g === consFilters.tipoGestion ? ' selected' : '') + '>' + esc(g) + '</option>').join('') +
          '</select></div>'
        ) : '') +
        '<div class="field"><label>Desde</label><input type="date" id="fil_desde" value="' + esc(consFilters.desde) + '"></div>' +
        '<div class="field"><label>Hasta</label><input type="date" id="fil_hasta" value="' + esc(consFilters.hasta) + '"></div>' +
        '<button class="btn secondary small" id="fil_clear" type="button">Limpiar</button>' +
        (isAdmin ? '<button class="btn secondary small" id="btnBackfillUgel" type="button" title="Completar UGEL y RED en fichas antiguas desde el padrón">🔄 Sincronizar UGEL/RED</button>' : '') +
        '<button class="btn secondary small" id="exportCsv" type="button" style="margin-left:auto">Exportar CSV</button>' +
        '<button class="btn small" id="exportPdf" type="button">⬇ Descargar reporte oficial (PDF)</button>' +
      '</div>' +
      '<div class="tblWrap"><table><thead><tr><th>Fecha</th><th>Institución</th>' + tblTypeHeader + '<th>UGEL / RED</th><th>Visita</th><th>Responsable</th><th>%</th><th>Estado</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';

  ['inst', 'ugel', 'desde', 'hasta', 'distrito'].forEach(k => {
    const el = document.getElementById('fil_' + k);
    if (!el) return;
    el.addEventListener('input', () => { consFilters[k === 'inst' ? 'institucion' : k] = el.value; renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user); });
  });
  document.getElementById('fil_red').addEventListener('change', e => { consFilters.red = e.target.value; renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user); });
  const filTipoGestion = document.getElementById('fil_tipogestion');
  if (filTipoGestion) filTipoGestion.addEventListener('change', e => { consFilters.tipoGestion = e.target.value; renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user); });
  document.getElementById('fil_clear').addEventListener('click', () => {
    consFilters = { institucion: '', ugel: '', red: '', estado: '', visita: '', responsable: '', desde: '', hasta: '', distrito: '', tipoGestion: '' };
    const topEst = document.getElementById('top_fil_estado'); if (topEst) topEst.value = '';
    const topVis = document.getElementById('top_fil_visita'); if (topVis) topVis.value = '';
    const topResp = document.getElementById('top_fil_responsable'); if (topResp) topResp.value = '';
    renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
  });

  // Expandir / Contraer todo en Reporte por Ítem
  const toggleAllBtn = document.getElementById('toggleAllItemsBtn');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const detailsList = host.querySelectorAll('.secDetails');
      const anyClosed = Array.from(detailsList).some(d => !d.open);
      detailsList.forEach(d => { d.open = anyClosed; });
      toggleAllBtn.textContent = anyClosed ? 'Contraer todo' : 'Expandir todo';
    });
  }

  // Sincronizar UGEL / RED en fichas antiguas desde el padrón
  const btnBackfill = document.getElementById('btnBackfillUgel');
  if (btnBackfill) {
    btnBackfill.addEventListener('click', async () => {
      if (!confirm('¿Deseas buscar en el padrón de colegios y actualizar la UGEL y RED/REI de las fichas registradas que no los tengan?')) return;
      btnBackfill.disabled = true;
      btnBackfill.textContent = 'Sincronizando...';
      try {
        const count = await backfillSubmissionsUgelRed(dbNs, state);
        showToast(`Se sincronizaron ${count} fichas con éxito.`);
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
      } catch (err) {
        console.error('Error sincronizando UGEL/RED', err);
        showToast('Error al sincronizar UGEL/RED.');
      } finally {
        btnBackfill.disabled = false;
        btnBackfill.textContent = '🔄 Sincronizar UGEL/RED';
      }
    });
  }
  document.getElementById('exportCsv').addEventListener('click', () => {
    if (isAllMode) {
      const allStatsList = statsList.map(x => {
        const xFt = getFichaType(x.s.fichaTypeId);
        return { ...x, _ft: xFt };
      });
      exportCsv({ nombre: 'Todas las fichas', secciones: [] }, allStatsList);
    } else {
      exportCsv(ft, statsList);
    }
  });

  // Exportar PDF oficial consolidado
  document.getElementById('exportPdf').addEventListener('click', () => {
    openDownloadConfigModal({
      documentTitle: isAllMode ? 'REPORTE CONSOLIDADO GENERAL DE MONITOREO' : `REPORTE CONSOLIDADO — ${(ft ? ft.nombre : 'MONITOREO').toUpperCase()}`,
      tipoReporte: 'consolidado',
      dataRows: statsList,
      currentUser: user,
      state,
      dbNs,
      isAdmin,
      onConfirm: async (cfg) => {
        await exportConsolidadoReportPdf(statsList, ft, consFilters, isAllMode, cfg);
      }
    });
  });

  // Descargar ficha individual oficial en PDF
  host.querySelectorAll('[data-pdfsub]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const subId = btn.dataset.pdfsub;
      const sub = state.submissions.find(s => s.id === subId);
      if (!sub) return;
      const subFt = getFichaType(sub.fichaTypeId);
      if (!subFt) {
        showToast('Tipo de ficha no encontrado.');
        return;
      }
      openDownloadConfigModal({
        documentTitle: `FICHA DE MONITOREO — ${(subFt.nombre || 'EVALUACIÓN').toUpperCase()}`,
        tipoReporte: 'individual',
        dataRows: [sub],
        currentUser: user,
        state,
        dbNs,
        isAdmin,
        onConfirm: async (cfg) => {
          await exportFichaIndividualPdf(sub, subFt, null, cfg);
        }
      });
    });
  });

  host.querySelectorAll('tr[data-row]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-del],[data-edit],[data-pdfsub]')) return;
      const id = tr.dataset.row;
      consExpanded = consExpanded === id ? null : id;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate);
    });
  });

  // Botón EDITAR ficha
  host.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const subId = btn.dataset.edit;
      const sub = state.submissions.find(s => s.id === subId);
      if (!sub) return;
      setEditMode(subId, sub);
      regSelectedTypeId = sub.fichaTypeId;
      regBuiltFor = null;
      if (navigate) navigate('registrar');
    });
  });

  host.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta ficha registrada? Esta acción no se puede deshacer.')) return;
      try { await dbNs.collection('submissions').doc(btn.dataset.del).delete(); showToast('Ficha eliminada.'); }
      catch (err) { console.error(err); showToast('No se pudo eliminar.'); }
    });
  });
}

function buildDetail(s) {
  const items = (s.respuestas || []).map(r => {
    const opt = (RESPONSE_OPTIONS[s.tipoRespuesta] || []).find(o => o.v === r.valor);
    return '<div class="itemRow"><div class="itxt"><strong style="font-weight:600;color:var(--ink-soft);font-size:11.5px">' + esc(r.seccion) + '</strong><br>' + esc(r.texto) + '</div><div class="optGroup"><span class="badge st-none" style="color:var(--ink)">' + esc(opt ? opt.l : r.valor) + '</span></div></div>';
  }).join('') || '<p class="helpText">Sin respuestas registradas.</p>';
  const extras = (s.extras || []).filter(x => x && (x.value !== undefined && x.value !== '')).map(x => {
    let valHtml = esc(x.value);
    if (x.tipo === 'si_no') {
      const cls = x.value === 'Sí' ? 'st-meta' : (x.value === 'No' ? 'st-inicio' : 'st-ninguno');
      valHtml = '<span class="badge ' + cls + '">' + esc(x.value) + '</span>';
    }
    return '<div style="font-size:12.5px;margin-bottom:4px"><strong>' + esc(x.label) + ':</strong> ' + valHtml + '</div>';
  }).join('');
  const comps  = (s.compromisos || []).map(c => '<li style="margin-bottom:4px">' + esc(c.texto) + (c.responsable ? ' — <em>' + esc(c.responsable) + '</em>' : '') + (c.plazo ? ' <span style="color:var(--ink-soft)">(' + esc(c.plazo) + ')</span>' : '') + '</li>').join('');

  // Info heredada para fichas anteriores
  const legacyInfo = [];
  if (s.codigoModular && !(s.extras || []).some(x => (x.label || '').toLowerCase().includes('código') || (x.label || '').toLowerCase().includes('codigo'))) {
    legacyInfo.push('Código: ' + esc(s.codigoModular));
  }
  if (s.director && !(s.extras || []).some(x => (x.label || '').toLowerCase().includes('director'))) {
    legacyInfo.push('Director(a): ' + esc(s.director));
  }
  if (s.responsable && !(s.extras || []).some(x => (x.label || '').toLowerCase().includes('responsable'))) {
    legacyInfo.push('Responsable: ' + esc(s.responsable));
  }
  const legacyHtml = legacyInfo.length ? '<div style="font-size:12.5px;margin-bottom:10px;color:var(--ink-soft)">' + legacyInfo.join(' · ') + '</div>' : '';

  return '' +
    (extras ? '<div class="sectionTitle" style="margin-top:0">Datos generales de la ficha</div>' + extras : '') +
    legacyHtml +
    '<div class="sectionTitle" style="margin-top:12px">Respuestas</div>' + items +
    (s.observaciones ? '<div class="sectionTitle">Observaciones</div><p style="font-size:13px">' + esc(s.observaciones) + '</p>' : '') +
    (comps ? '<div class="sectionTitle">Compromisos de mejora</div><ul style="margin:0;padding-left:18px;font-size:13px">' + comps + '</ul>' : '');
}

async function exportCsv(ft, statsList) {
  const header = ['Fecha', 'Institución', 'UGEL', 'Código', 'Visita', 'Responsable', 'Director', '% Cumplimiento', 'Estado', 'Datos adicionales', 'Observaciones', 'Compromisos'];
  const rows = statsList.map(x => {
    const s = x.s, st = x.st;
    const extras = (s.extras || []).map(e => e.label + ': ' + e.value).join(' | ');
    const comps  = (s.compromisos || []).map(c => c.texto).join(' | ');
    return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, s.responsable, s.director, (st.pct === null ? '' : st.pct), statusFromPct(st.pct).label, extras, s.observaciones, comps];
  });
  downloadCsv((ft.nombre || 'reporte').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.csv', header, rows);
}

/* ============================= COLEGIOS TAB (Padrón de instituciones) ============================= */
const COLEGIO_FIELD_LABELS = {
  rei: 'REI', codigoLocal: 'Código local', ie: 'Nombre I.E.', modalidad: 'Modalidad',
  nivelServicio: 'Nivel de servicio', turnos: 'Turnos', tipoGestion: 'Tipo de Gestión',
  dependencia: 'Dependencia', direccion: 'Dirección', distrito: 'Distrito',
};

/** Aliases para mapeo de columnas Excel → campos del documento */
const INST_FIELD_ALIASES = {
  rei:            ['rei', 'red', 'rei / red', 'rei/red', 'red educativa'],
  codigoLocal:    ['codigo local', 'codigolocal', 'cod local', 'cod. local', 'codigo_local', 'local', 'cod_local'],
  ie:             ['nombre i.e.', 'nombre ie', 'i.e', 'ie', 'institucion educativa', 'nombre', 'colegio', 'nombre de la i.e.', 'i.e.'],
  modalidad:      ['modalidad'],
  nivelServicio:  ['nivel_sevicio', 'nivel_servicio', 'nivel de servicio', 'nivelservicio', 'nivel', 'servicio'],
  turnos:         ['turnos', 'turno'],
  tipoGestion:    ['tipo de gestion', 'tipo gestion', 'tipogestion', 'gestion', 'gestión'],
  dependencia:    ['dependencia'],
  direccion:      ['direccion', 'dirección'],
  distrito:       ['distrito'],
  'director.nombre':     ['director_nombres', 'director - apellidos y nombres', 'dir_nombres', 'dir_nombre', 'director apellidos y nombres', 'director: apellidos y nombres', 'apellidos y nombres director', 'director', 'director(a)'],
  'director.dni':        ['director_dni', 'director - dni', 'dir_dni', 'director: dni', 'dni director'],
  'director.telefono':   ['director_telefono', 'director - telefono', 'dir_telefono', 'director - teléfono', 'director: telefono', 'telefono director', 'teléfono director', 'celular director'],
  'director.correo':     ['director_correo', 'director - correo', 'dir_correo', 'director: correo', 'correo director', 'email director'],
  'subDirector.nombre':  ['subdir_nombres', 'subdirector_nombres', 'sub_director - apellidos y nombres', 'subdirector - apellidos y nombres', 'subdir_nombre', 'subdirector', 'sub_director', 'sub-director'],
  'subDirector.dni':     ['subdir_dni', 'subdirector_dni', 'sub_director - dni', 'subdirector - dni', 'dni subdirector'],
  'subDirector.telefono':['subdir_telefono', 'subdirector_telefono', 'sub_director - telefono', 'subdirector - telefono', 'sub-director - telefono', 'telefono subdirector', 'teléfono subdirector'],
  'subDirector.correo':  ['subdir_correo', 'subdirector_correo', 'sub_director - correo', 'subdirector - correo', 'sub-director - correo', 'correo subdirector', 'email subdirector'],
};

/** Descarga una plantilla Excel lista para completar e importar */
export function downloadPlantillaExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Librería Excel no disponible. Revisa la conexión a internet.');
    return;
  }
  const headers = [
    'REI', 'Código local', 'Nombre I.E.', 'Modalidad', 'Nivel_sevicio', 'Turnos',
    'Tipo de Gestión', 'Dependencia', 'Dirección', 'Distrito',
    'Director_Nombres', 'Director_DNI', 'Director_Teléfono', 'Director_Correo',
    'SubDir_Nombres', 'SubDir_DNI', 'SubDir_Teléfono', 'SubDir_Correo',
  ];
  const exampleRow = [
    'REI 01', '123456', 'I.E. Ejemplo', 'EBR', 'Primaria', 'Mañana',
    'Pública - Sector Educación', 'UGEL 03', 'Jr. Ejemplo 123', 'Lima',
    'García López, Juan', '12345678', '999888777', 'director@ejemplo.pe',
    '', '', '', '',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Instituciones');
  XLSX.writeFile(wb, 'plantilla_instituciones.xlsx');
  showToast('Plantilla descargada.');
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

/** Prepara y sanea el registro de institución educativa para Firestore sin undefined ni NaN */
export function sanitizeColegioRecord(r, existing, now) {
  now = (typeof now === 'number' && !isNaN(now)) ? now : Date.now();
  const createdAt = (existing && typeof existing.createdAt === 'number' && !isNaN(existing.createdAt))
    ? existing.createdAt
    : now;

  const s = (v) => {
    if (v === undefined || v === null || (typeof v === 'number' && isNaN(v))) return '';
    return String(v).trim();
  };

  const dir = r.director || {};
  const director = {
    nombre:   s(dir.nombre),
    dni:      s(dir.dni),
    telefono: s(dir.telefono),
    correo:   s(dir.correo),
  };

  let subDirector = null;
  if (r.subDirector && typeof r.subDirector === 'object') {
    const sd = {
      nombre:   s(r.subDirector.nombre),
      dni:      s(r.subDirector.dni),
      telefono: s(r.subDirector.telefono),
      correo:   s(r.subDirector.correo),
    };
    if (sd.nombre || sd.dni || sd.telefono || sd.correo) {
      subDirector = sd;
    }
  }

  const docData = {
    rei:           s(r.rei),
    codigoLocal:   s(r.codigoLocal),
    ie:            s(r.ie),
    modalidad:     s(r.modalidad),
    nivelServicio: s(r.nivelServicio),
    turnos:        s(r.turnos),
    tipoGestion:   s(r.tipoGestion),
    dependencia:   s(r.dependencia),
    direccion:     s(r.direccion),
    distrito:      s(r.distrito),
    director:      director,
    subDirector:   subDirector,
    updatedAt:     now,
    createdAt:     createdAt,
  };

  return cleanForFirestore(docData);
}

/** Genera un ID válido y seguro para Firestore a partir del código local */
export function docIdForCodigo(codigo) {
  if (codigo === undefined || codigo === null) return genId();
  let id = normalizeText(String(codigo))
    .replace(/[\/\s\\#?%*:[\]]/g, '_')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  if (!id || id.startsWith('__')) {
    id = ('ie_' + id).replace(/^_+|_+$/g, '').slice(0, 120);
  }
  return id || genId();
}

/** Parsea un archivo .xlsx seleccionado y devuelve {rows, errors} */
export async function parseInstitucionesExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (typeof XLSX === 'undefined') { reject(new Error('SheetJS no disponible')); return; }
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rawRows.length < 2) { resolve({ rows: [], errors: ['El archivo no tiene datos suficientes.'] }); return; }

        // Detectar y mapear columnas según encabezados
        const headerRow = rawRows[0].map(h => normalizeText(String(h)).replace(/\.$/, ''));
        const colMap = {};
        let dirNomMapped = false;
        let dirDniMapped = false;
        let dirTelMapped = false;
        let dirCorMapped = false;

        headerRow.forEach((h, i) => {
          if (!h) return;
          const isSub = h.includes('sub') || h.includes('sub_') || h.includes('subdir') || h.includes('sub-dir');
          if (isSub) {
            if (h.includes('dni')) { colMap[i] = 'subDirector.dni'; return; }
            if (h.includes('tel') || h.includes('cel')) { colMap[i] = 'subDirector.telefono'; return; }
            if (h.includes('corr') || h.includes('mail')) { colMap[i] = 'subDirector.correo'; return; }
            if (h.includes('nom') || h.includes('apel') || h.includes('dir')) { colMap[i] = 'subDirector.nombre'; return; }
          }
          const isDir = h.includes('director') || h.includes('dir');
          if (isDir) {
            if (h.includes('dni')) { colMap[i] = 'director.dni'; dirDniMapped = true; return; }
            if (h.includes('tel') || h.includes('cel')) { colMap[i] = 'director.telefono'; dirTelMapped = true; return; }
            if (h.includes('corr') || h.includes('mail')) { colMap[i] = 'director.correo'; dirCorMapped = true; return; }
            if (h.includes('nom') || h.includes('apel') || h.includes('dir')) { colMap[i] = 'director.nombre'; dirNomMapped = true; return; }
          }
          // Comparar contra aliases
          for (const field in INST_FIELD_ALIASES) {
            if (INST_FIELD_ALIASES[field].some(a => normalizeText(a).replace(/\.$/, '') === h)) {
              if (field === 'director.nombre' && dirNomMapped) { colMap[i] = 'subDirector.nombre'; }
              else if (field === 'director.dni' && dirDniMapped) { colMap[i] = 'subDirector.dni'; }
              else if (field === 'director.telefono' && dirTelMapped) { colMap[i] = 'subDirector.telefono'; }
              else if (field === 'director.correo' && dirCorMapped) { colMap[i] = 'subDirector.correo'; }
              else {
                colMap[i] = field;
                if (field === 'director.nombre') dirNomMapped = true;
                if (field === 'director.dni') dirDniMapped = true;
                if (field === 'director.telefono') dirTelMapped = true;
                if (field === 'director.correo') dirCorMapped = true;
              }
              break;
            }
          }
        });

        const parsedRows = [], errors = [];
        for (let ri = 1; ri < rawRows.length; ri++) {
          const vals = rawRows[ri];
          if (!vals || !Array.isArray(vals) || vals.every(v => v === undefined || v === null || String(v).trim() === '')) continue;

          const row = {
            _rowNum: ri + 1,
            rei: '', codigoLocal: '', ie: '', modalidad: '', nivelServicio: '',
            turnos: '', tipoGestion: '', dependencia: '', direccion: '', distrito: '',
            director:    { nombre: '', dni: '', telefono: '', correo: '' },
            subDirector: null,
          };
          const sd = { nombre: '', dni: '', telefono: '', correo: '' };
          let hasSubDir = false;

          Object.entries(colMap).forEach(([ci, field]) => {
            const rawVal = vals[+ci];
            const val = (rawVal === undefined || rawVal === null) ? '' : String(rawVal).trim();
            if (field.startsWith('director.'))    { row.director[field.replace('director.', '')] = val; }
            else if (field.startsWith('subDirector.')) { sd[field.replace('subDirector.', '')] = val; if (val) hasSubDir = true; }
            else { row[field] = val; }
          });
          if (hasSubDir) row.subDirector = sd;

          row.codigoLocal = String(row.codigoLocal || '').trim();
          row.ie          = String(row.ie || '').trim();

          if (!row.codigoLocal || !row.ie) {
            errors.push('Fila ' + (ri + 1) + ': falta Código local o Nombre I.E. — omitida.');
            continue;
          }
          parsedRows.push(row);
        }
        resolve({ rows: parsedRows, errors });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

let colFilters = { rei: '', distrito: '', tipoGestion: '', q: '', pendientes: false };
let colExpanded  = null;
let colShowImport = false;
let colImportPreview = null; // {rows, errors}
let colImportResults = null; // { total, success, failures, mainErrorCode }
let colEditing = null; // null | 'new' | colegioId
let cachedCurrentUser = null;


export function renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, currentUser) {
  if (currentUser) cachedCurrentUser = currentUser;
  const bySchool   = groupSubmissionsByColegio(state);
  const reiList    = Array.from(new Set(state.colegios.map(c => c.rei).filter(Boolean))).sort();
  const distritoList = Array.from(new Set(state.colegios.map(c => c.distrito).filter(Boolean))).sort();
  const gestionList  = Array.from(new Set(state.colegios.map(c => c.tipoGestion).filter(Boolean))).sort();

  const totalColegios = state.colegios.length;
  const sinMonitoreo  = state.colegios.filter(c => (bySchool[c.id] || []).length === 0).length;
  const coberturaPct  = totalColegios ? Math.round((totalColegios - sinMonitoreo) / totalColegios * 100) : null;

  const reiAgg = {};
  reiList.forEach(r => reiAgg[r] = { rei: r, total: 0, monitoreados: 0, sumPct: 0, cntPct: 0 });
  state.colegios.forEach(c => {
    if (!c.rei || !reiAgg[c.rei]) return;
    const a = reiAgg[c.rei]; a.total++;
    const subs = bySchool[c.id] || [];
    if (subs.length) a.monitoreados++;
    subs.forEach(s => { const ft = getFichaType(s.fichaTypeId); if (!ft) return; const st = computeStats(s, ft); if (st.pct !== null) { a.sumPct += st.pct; a.cntPct++; } });
  });
  const reiRows = Object.values(reiAgg).sort((a, b) => a.rei.localeCompare(b.rei)).map(a => {
    const pct = a.total ? Math.round(a.monitoreados / a.total * 100) : null;
    const avg = a.cntPct ? Math.round(a.sumPct / a.cntPct) : null;
    return '<div class="barRow"><div class="name">' + esc(a.rei) + ' <span style="color:var(--ink-soft);font-weight:400">(' + a.monitoreados + '/' + a.total + ' colegios' + (avg !== null ? ' · ' + avg + '% cumpl.' : '') + ')</span></div>' + bar(pct) + '<div class="val">' + (pct === null ? '—' : pct + '%') + '</div></div>';
  }).join('') || '<p class="helpText">Los colegios del padrón no tienen REI asignado.</p>';

  let filtered = state.colegios.slice();
  if (colFilters.rei)         filtered = filtered.filter(c => c.rei === colFilters.rei);
  if (colFilters.distrito)    filtered = filtered.filter(c => normalizeText(c.distrito).includes(normalizeText(colFilters.distrito)));
  if (colFilters.tipoGestion) filtered = filtered.filter(c => c.tipoGestion === colFilters.tipoGestion);
  if (colFilters.q)           filtered = filtered.filter(c => normalizeText(c.ie).includes(normalizeText(colFilters.q)) || normalizeText(c.codigoLocal).includes(normalizeText(colFilters.q)));
  if (colFilters.pendientes)  filtered = filtered.filter(c => (bySchool[c.id] || []).length === 0);
  filtered.sort((a, b) => (a.ie || '').localeCompare(b.ie || ''));

  const rows = filtered.map(c => {
    const subs = bySchool[c.id] || [];
    const typeStats = colegioFichaTypeStats(subs, getFichaType);
    const lastVisit = subs.reduce((max, s) => (!max || s.fecha > max) ? s.fecha : max, null);
    const chips = typeStats.map(t => '<span class="badge st-none" style="margin:1px 3px 1px 0">' + esc(t.nombre) + ' (' + t.count + ')</span>').join('') || '<span class="helpText" style="margin:0">Sin monitoreos</span>';
    const isOpen = colExpanded === c.id;
    const detail = isOpen ? renderColegioProfile(c, subs, typeStats) : '';
    return '<tr class="clickable" data-colrow="' + c.id + '">' +
      '<td>' + esc(c.rei || '—') + '</td>' +
      '<td>' + esc(c.codigoLocal || '—') + '</td>' +
      '<td>' + esc(c.ie || '—') + '</td>' +
      '<td>' + esc(c.distrito || '—') + '</td>' +
      '<td>' + esc(c.tipoGestion || '—') + '</td>' +
      '<td>' + (subs.length ? subs.length : '<span class="badge st-inicio">0</span>') + '</td>' +
      '<td>' + chips + '</td>' +
      '<td>' + (lastVisit ? fmtDate(lastVisit) : '—') + '</td>' +
      (isAdmin ? '<td><button class="iconBtn" data-coledit="' + c.id + '" title="Editar">✎</button> <button class="iconBtn" data-coldel="' + c.id + '" title="Eliminar">✕</button></td>' : '<td></td>') +
      '</tr>' +
      (isOpen ? '<tr class="detailRow"><td colspan="9">' + detail + '</td></tr>' : '');
  }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:22px">Ningún colegio coincide con los filtros.</td></tr>';

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Colegios</h2><p>Padrón de instituciones educativas por REI, cruzado con las fichas de monitoreo ya registradas.</p></div>' +
    '<div class="cards">' +
      '<div class="card"><div class="num">' + totalColegios + '</div><div class="lbl">Colegios en el padrón</div></div>' +
      '<div class="card"><div class="num">' + reiList.length + '</div><div class="lbl">REI / redes</div></div>' +
      '<div class="card"><div class="num">' + sinMonitoreo + '</div><div class="lbl">Sin ningún monitoreo</div></div>' +
      '<div class="card"><div class="num">' + (coberturaPct === null ? '—' : coberturaPct + '%') + '</div><div class="lbl">Cobertura de monitoreo</div></div>' +
    '</div>' +
    (totalColegios === 0 ? '<div class="empty"><h4>Aún no hay un padrón cargado</h4><p>' + (isAdmin ? 'Importa la lista de instituciones en el panel de abajo.' : 'Pide a un administrador que importe el padrón de instituciones.') + '</p></div>' : '') +
    (isAdmin ? renderColegiosAdminPanel() : '') +
    (totalColegios ? '<div class="panel"><h3>Cobertura por REI</h3>' + reiRows + '</div>' : '') +
    (totalColegios ? (
      '<div class="panel">' +
        '<h3>Padrón de instituciones</h3>' +
        '<div class="filterBar">' +
          '<div class="field"><label>REI</label><select id="col_fil_rei"><option value="">Todas</option>' + reiList.map(r => '<option value="' + esc(r) + '"' + (r === colFilters.rei ? ' selected' : '') + '>' + esc(r) + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>Distrito</label><input type="search" id="col_fil_distrito" list="dl_col_distrito" value="' + esc(colFilters.distrito) + '" placeholder="Buscar..."></div>' +
          '<datalist id="dl_col_distrito">' + distritoList.map(d => '<option value="' + esc(d) + '">').join('') + '</datalist>' +
          '<div class="field"><label>Tipo de gestión</label><select id="col_fil_gestion"><option value="">Todas</option>' + gestionList.map(g => '<option value="' + esc(g) + '"' + (g === colFilters.tipoGestion ? ' selected' : '') + '>' + esc(g) + '</option>').join('') + '</select></div>' +
          '<div class="field"><label>Buscar</label><input type="search" id="col_fil_q" value="' + esc(colFilters.q) + '" placeholder="I.E. o código..."></div>' +
          '<label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:0;white-space:nowrap"><input type="checkbox" id="col_fil_pend" ' + (colFilters.pendientes ? 'checked' : '') + '> Solo pendientes</label>' +
          '<button class="btn secondary small" id="col_fil_clear" type="button">Limpiar</button>' +
          '<button class="btn secondary small" id="col_export" type="button" style="margin-left:auto">Exportar CSV</button>' +
          '<button class="btn small" id="col_export_pdf" type="button">⬇ Descargar padrón oficial (PDF)</button>' +
        '</div>' +
        '<div class="tblWrap"><table><thead><tr><th>REI</th><th>Código local</th><th>I.E.</th><th>Distrito</th><th>Tipo de gestión</th><th>N° monitoreos</th><th>Tipos de ficha aplicados</th><th>Última visita</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '</div>'
    ) : '');

  const onFilterChange = () => renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
  const fRei  = document.getElementById('col_fil_rei');     if (fRei)  fRei.addEventListener('change', e => { colFilters.rei = e.target.value; onFilterChange(); });
  const fDist = document.getElementById('col_fil_distrito'); if (fDist) fDist.addEventListener('input', e => { colFilters.distrito = e.target.value; onFilterChange(); });
  const fGes  = document.getElementById('col_fil_gestion'); if (fGes)  fGes.addEventListener('change', e => { colFilters.tipoGestion = e.target.value; onFilterChange(); });
  const fQ    = document.getElementById('col_fil_q');        if (fQ)   fQ.addEventListener('input', e => { colFilters.q = e.target.value; onFilterChange(); });
  const fPend = document.getElementById('col_fil_pend');     if (fPend) fPend.addEventListener('change', e => { colFilters.pendientes = e.target.checked; onFilterChange(); });
  const fClear = document.getElementById('col_fil_clear');   if (fClear) fClear.addEventListener('click', () => { colFilters = { rei: '', distrito: '', tipoGestion: '', q: '', pendientes: false }; onFilterChange(); });
  const fExport = document.getElementById('col_export');
  if (fExport) fExport.addEventListener('click', () => {
    const header = ['REI', 'Código local', 'I.E.', 'Modalidad', 'Nivel de servicio', 'Turnos', 'Tipo de Gestión', 'Dependencia', 'Dirección', 'Distrito', 'Director', 'N° monitoreos', 'Última visita'];
    const dataRows = filtered.map(c => {
      const subs = bySchool[c.id] || [];
      const last = subs.reduce((max, s) => (!max || s.fecha > max) ? s.fecha : max, null);
      return [c.rei, c.codigoLocal, c.ie, c.modalidad, c.nivelServicio, c.turnos, c.tipoGestion, c.dependencia, c.direccion, c.distrito, c.director ? c.director.nombre : '', subs.length, last || ''];
    });
    downloadCsv('colegios' + (colFilters.pendientes ? '_pendientes' : '') + '.csv', header, dataRows);
  });

  const fExportPdf = document.getElementById('col_export_pdf');
  if (fExportPdf) {
    fExportPdf.addEventListener('click', () => {
      const enhancedColegios = filtered.map(c => {
        const subs = bySchool[c.id] || [];
        const last = subs.reduce((max, s) => (!max || s.fecha > max) ? s.fecha : max, null);
        return { ...c, _subsCount: subs.length, _lastVisit: last };
      });

      openDownloadConfigModal({
        documentTitle: 'PADRÓN OFICIAL DE INSTITUCIONES EDUCATIVAS',
        tipoReporte: 'colegios',
        dataRows: enhancedColegios,
        currentUser: cachedCurrentUser,
        state,
        dbNs,
        isAdmin,
        onConfirm: async (cfg) => {
          await exportColegiosReportPdf(enhancedColegios, {
            totalReis: reiList.length,
            monitoreados: totalColegios - sinMonitoreo,
            cobertura: coberturaPct
          }, cfg);
        }
      });
    });
  }

  container.querySelectorAll('tr[data-colrow]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-coledit],[data-coldel]')) return;
      const id = tr.dataset.colrow;
      colExpanded = colExpanded === id ? null : id;
      renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
    });
  });

  if (isAdmin) {
    container.querySelectorAll('[data-coledit]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); colEditing = btn.dataset.coledit; renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser); });
    });
    container.querySelectorAll('[data-coldel]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar este colegio del padrón? Las fichas ya registradas no se borran.')) return;
        try {
          await dbNs.collection('colegios').doc(btn.dataset.coldel).delete();
          showToast('Institución eliminada del padrón.');
        } catch (err) {
          console.error('Error eliminando institución:', err);
          showToast('No se pudo eliminar: [' + (err.code || 'error') + '] ' + err.message);
        }
      });
    });
    const newBtn = document.getElementById('col_new_btn');
    if (newBtn) newBtn.addEventListener('click', () => { colEditing = 'new'; renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser); });
    const saveBtn = document.getElementById('col_f_save');
    if (saveBtn) saveBtn.addEventListener('click', () => saveColegioForm(state, dbNs, container, getFichaType, isAdmin));
    const cancelBtn = document.getElementById('col_f_cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { colEditing = null; renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser); });

    const impToggle = document.getElementById('col_import_toggle');
    if (impToggle) impToggle.addEventListener('click', () => { colShowImport = !colShowImport; renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser); });

    const plantillaBtn = document.getElementById('col_download_plantilla');
    if (plantillaBtn) plantillaBtn.addEventListener('click', downloadPlantillaExcel);

    const impFile = document.getElementById('col_import_file');
    if (impFile) {
      impFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        colImportResults = null;
        const loadBtn = document.getElementById('col_import_load');
        if (loadBtn) { loadBtn.disabled = true; loadBtn.textContent = 'Procesando...'; }
        try {
          colImportPreview = await parseInstitucionesExcel(file);
        } catch (err) {
          console.error('Error leyendo archivo Excel:', err);
          colImportPreview = { rows: [], errors: ['No se pudo leer el archivo: ' + (err.message || 'error')] };
        }
        if (loadBtn) { loadBtn.disabled = false; loadBtn.textContent = 'Ver vista previa'; }
        renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
        e.target.value = '';
      });
    }

    const impConfirm = document.getElementById('col_import_confirm');
    if (impConfirm) impConfirm.addEventListener('click', () => {
      impConfirm.disabled = true; impConfirm.textContent = 'Importando...';
      commitColegiosImport(state, dbNs, container, getFichaType, isAdmin, cachedCurrentUser);
    });

    const clearResBtn = document.getElementById('col_import_clear_results');
    if (clearResBtn) {
      clearResBtn.addEventListener('click', () => {
        colImportResults = null;
        renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
      });
    }
  }
}

function renderColegiosAdminPanel() {
  return '' +
    '<div class="panel"><h3>Agregar / editar institución</h3>' +
      (colEditing ? renderColegioFormPanel() : '<button class="btn secondary small" id="col_new_btn" type="button">+ Agregar institución manualmente</button>') +
    '</div>' +
    '<div class="panel">' +
      '<h3>Importar padrón desde Excel <small>archivo .xlsx</small></h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
        '<button class="btn secondary small" id="col_import_toggle" type="button">' + (colShowImport ? 'Ocultar importación' : 'Importar desde Excel') + '</button>' +
        '<button class="btn secondary small" id="col_download_plantilla" type="button">⬇ Descargar plantilla</button>' +
      '</div>' +
      (colShowImport ? renderColegiosImportForm() : '') +
    '</div>';
}

function renderColegiosImportForm() {
  const resultsHtml = colImportResults ? renderColegiosImportResults(colImportResults) : '';
  const previewHtml = colImportPreview ? renderColegiosImportPreview(colImportPreview) : '';
  return '' +
    resultsHtml +
    '<p class="helpText" style="margin-top:0">' +
      'Descarga la plantilla de arriba, complétala en Excel y súbela aquí. ' +
      'Si el código local ya existe en el padrón, se actualizará en vez de duplicarse. ' +
      'Los sub_directores son opcionales (deja las columnas vacías si el colegio no tiene).' +
    '</p>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
      '<input type="file" id="col_import_file" accept=".xlsx,.xls" style="font-size:13px">' +
    '</div>' +
    (colImportPreview && colImportPreview.rows.length
      ? '<button class="btn small" id="col_import_confirm" type="button" style="margin-bottom:10px">✓ Confirmar importación (' + colImportPreview.rows.length + ' instituciones)</button>'
      : '') +
    previewHtml;
}

function renderColegiosImportResults(res) {
  if (!res) return '';
  const isAllSuccess = res.failures.length === 0 && res.success > 0;
  const isPartial    = res.success > 0 && res.failures.length > 0;

  const hasPermError = res.failures.some(f =>
    f.code === 'permission-denied' ||
    (f.message && f.message.toLowerCase().includes('insufficient permissions'))
  ) || (res.mainErrorCode === 'permission-denied');

  const permAdviceHtml = hasPermError
    ? '<div style="background:rgba(239,68,68,0.08);border:1px solid var(--danger);border-radius:var(--radius);padding:12px 14px;margin:12px 0;font-size:13px;line-height:1.5">' +
        '<div style="font-weight:700;color:var(--danger);margin-bottom:6px">⚠ Diagnóstico de permisos (FirebaseError: Missing or insufficient permissions)</div>' +
        'Firestore rechazó las escrituras por falta de permisos. Verifica y aplica lo siguiente:' +
        '<ol style="margin:8px 0 0 18px;padding:0">' +
          '<li><strong>Reglas de Firestore (firestore.rules):</strong> En Firebase Console &gt; Firestore Database &gt; pestaña <em>Reglas</em>, asegúrate de publicar la regla para <code>colegios</code>:<br>' +
          '<code style="display:block;background:var(--surface);padding:6px 8px;border-radius:4px;margin:5px 0;font-size:12px;border:1px solid var(--line);font-family:monospace">' +
            'match /colegios/{docId} {<br>' +
            '&nbsp;&nbsp;allow read: if signedIn();<br>' +
            '&nbsp;&nbsp;allow create, update, delete: if isAdmin();<br>' +
            '}' +
          '</code>' +
          '<em>(Luego haz clic en <strong>Publicar</strong> en Firebase Console).</em>' +
          '</li>' +
          '<li style="margin-top:8px"><strong>Rol de Administrador:</strong> Verifica en la pestaña <em>Usuarios</em> que tu cuenta tenga rol <strong>Administrador</strong> en la colección <code>roles</code> de Firestore.</li>' +
        '</ol>' +
      '</div>'
    : '';

  const failRowsHtml = res.failures.slice(0, 50).map(f =>
    '<tr>' +
      '<td><span class="badge st-inicio">Fila ' + f.rowNum + '</span></td>' +
      '<td>' + esc(f.codigoLocal) + '</td>' +
      '<td>' + esc(f.ie) + '</td>' +
      '<td><code style="font-size:11px">' + esc(f.code) + '</code></td>' +
      '<td style="color:var(--danger);font-size:12px">' + esc(f.message) + '</td>' +
    '</tr>'
  ).join('');

  return '' +
    '<div class="panel" style="border-left:4px solid ' + (isAllSuccess ? 'var(--primary)' : isPartial ? 'var(--accent)' : 'var(--danger)') + ';margin-top:12px;margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
        '<h4 style="margin:0;font-size:14.5px">' +
          (isAllSuccess ? '✓ Importación completada con éxito' : isPartial ? '⚠ Importación parcial con errores' : '✕ Error al importar padrón') +
        '</h4>' +
        '<button class="btn secondary small" id="col_import_clear_results" type="button">✕ Cerrar reporte</button>' +
      '</div>' +
      '<p style="font-size:13px;margin:8px 0">' +
        '<strong>Total de registros procesados:</strong> ' + res.total + ' · ' +
        '<span style="color:var(--primary);font-weight:600">✓ Exitosos: ' + res.success + '</span> · ' +
        '<span style="color:' + (res.failures.length ? 'var(--danger)' : 'var(--ink-soft)') + ';font-weight:600">✕ Fallidos: ' + res.failures.length + '</span>' +
      '</p>' +
      permAdviceHtml +
      (res.failures.length
        ? '<div style="margin-top:10px">' +
            '<div style="font-weight:600;font-size:13px;margin-bottom:6px">Detalle de filas que no se pudieron guardar (' + res.failures.length + '):</div>' +
            '<div class="tblWrap" style="max-height:260px;overflow-y:auto"><table><thead><tr><th>Fila Excel</th><th>Código local</th><th>Nombre I.E.</th><th>Código Firestore</th><th>Detalle del error</th></tr></thead><tbody>' + failRowsHtml + '</tbody></table></div>' +
            (res.failures.length > 50 ? '<p class="helpText" style="margin-top:4px">Mostrando las primeras 50 fallas de ' + res.failures.length + '.</p>' : '') +
          '</div>'
        : '') +
    '</div>';
}

function renderColegiosImportPreview(preview) {
  const errHtml = preview.errors.length
    ? '<p class="helpText" style="color:var(--danger)">' + preview.errors.slice(0, 10).join('<br>') + (preview.errors.length > 10 ? '<br>… y ' + (preview.errors.length - 10) + ' más.' : '') + '</p>'
    : '';
  if (!preview.rows.length) return errHtml + '<p class="helpText">No hay filas válidas para importar.</p>';
  const rowsHtml = preview.rows.slice(0, 50).map(r => {
    const hasDir = r.director && r.director.nombre;
    const hasSubDir = r.subDirector && r.subDirector.nombre;
    return '<tr>' +
      '<td>' + esc(r.rei) + '</td>' +
      '<td>' + esc(r.codigoLocal) + '</td>' +
      '<td>' + esc(r.ie) + '</td>' +
      '<td>' + esc(r.distrito) + '</td>' +
      '<td>' + (hasDir ? esc(r.director.nombre) : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      '<td>' + (hasSubDir ? esc(r.subDirector.nombre) : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      '</tr>';
  }).join('');
  return '' +
    '<p class="helpText"><strong>' + preview.rows.length + '</strong> institución(es) lista(s) para importar' + (preview.errors.length ? ', ' + preview.errors.length + ' fila(s) con error' : '') + '.</p>' +
    errHtml +
    '<div class="tblWrap"><table><thead><tr><th>REI</th><th>Código local</th><th>I.E.</th><th>Distrito</th><th>Director</th><th>Sub-director</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
    (preview.rows.length > 50 ? '<p class="helpText">Mostrando las primeras 50 filas de ' + preview.rows.length + '.</p>' : '');
}

function renderColegioFormPanel() {
  // Busca el registro que se está editando en state para precargar datos
  // Nota: state no está en scope directo aquí, se pasa a través del cierre de renderColegiosTab
  return '' +
    '<div class="fieldGrid">' +
      '<div class="field"><label>REI</label><input type="text" id="col_f_rei"></div>' +
      '<div class="field"><label>Código local *</label><input type="text" id="col_f_codigo"></div>' +
      '<div class="field"><label>Nombre I.E. *</label><input type="text" id="col_f_ie"></div>' +
      '<div class="field"><label>Modalidad</label><input type="text" id="col_f_modalidad"></div>' +
      '<div class="field"><label>Nivel de servicio</label><input type="text" id="col_f_nivel"></div>' +
      '<div class="field"><label>Turnos</label><input type="text" id="col_f_turnos"></div>' +
      '<div class="field"><label>Tipo de Gestión</label><input type="text" id="col_f_gestion"></div>' +
      '<div class="field"><label>Dependencia</label><input type="text" id="col_f_dependencia"></div>' +
      '<div class="field" style="grid-column:span 2"><label>Dirección</label><input type="text" id="col_f_direccion"></div>' +
      '<div class="field"><label>Distrito</label><input type="text" id="col_f_distrito"></div>' +
    '</div>' +
    '<div class="sectionTitle">Datos del Director(a)</div>' +
    '<div class="fieldGrid">' +
      '<div class="field"><label>Apellidos y nombres *</label><input type="text" id="col_f_dir_nombre"></div>' +
      '<div class="field"><label>DNI</label><input type="text" id="col_f_dir_dni" maxlength="8"></div>' +
      '<div class="field"><label>Teléfono</label><input type="text" id="col_f_dir_tel"></div>' +
      '<div class="field"><label>Correo</label><input type="email" id="col_f_dir_correo"></div>' +
    '</div>' +
    '<div class="sectionTitle">Datos del Sub-director(a) <small style="font-weight:400;color:var(--ink-soft)">(opcional)</small></div>' +
    '<div class="fieldGrid">' +
      '<div class="field"><label>Apellidos y nombres</label><input type="text" id="col_f_sub_nombre"></div>' +
      '<div class="field"><label>DNI</label><input type="text" id="col_f_sub_dni" maxlength="8"></div>' +
      '<div class="field"><label>Teléfono</label><input type="text" id="col_f_sub_tel"></div>' +
      '<div class="field"><label>Correo</label><input type="email" id="col_f_sub_correo"></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:4px">' +
      '<button class="btn small" id="col_f_save" type="button">Guardar institución</button>' +
      '<button class="btn secondary small" id="col_f_cancel" type="button">Cancelar</button>' +
    '</div>';
}

async function saveColegioForm(state, dbNs, container, getFichaType, isAdmin) {
  const codigo = (document.getElementById('col_f_codigo').value || '').trim();
  const ie     = (document.getElementById('col_f_ie').value || '').trim();
  if (!codigo || !ie) { showToast('Completa Código local y Nombre I.E.'); return; }

  const id = (colEditing && colEditing !== 'new') ? colEditing : docIdForCodigo(codigo);
  const existing = state.colegios.find(x => x.id === id);

  const subNombre = (document.getElementById('col_f_sub_nombre').value || '').trim();
  const subDni    = (document.getElementById('col_f_sub_dni').value || '').trim();
  const subTel    = (document.getElementById('col_f_sub_tel').value || '').trim();
  const subCorreo = (document.getElementById('col_f_sub_correo').value || '').trim();

  const raw = {
    rei:          (document.getElementById('col_f_rei').value || '').trim(),
    codigoLocal:  codigo,
    ie:           ie,
    modalidad:    (document.getElementById('col_f_modalidad').value || '').trim(),
    nivelServicio:(document.getElementById('col_f_nivel').value || '').trim(),
    turnos:       (document.getElementById('col_f_turnos').value || '').trim(),
    tipoGestion:  (document.getElementById('col_f_gestion').value || '').trim(),
    dependencia:  (document.getElementById('col_f_dependencia').value || '').trim(),
    direccion:    (document.getElementById('col_f_direccion').value || '').trim(),
    distrito:     (document.getElementById('col_f_distrito').value || '').trim(),
    director: {
      nombre:   (document.getElementById('col_f_dir_nombre').value || '').trim(),
      dni:      (document.getElementById('col_f_dir_dni').value || '').trim(),
      telefono: (document.getElementById('col_f_dir_tel').value || '').trim(),
      correo:   (document.getElementById('col_f_dir_correo').value || '').trim(),
    },
    subDirector: {
      nombre:   subNombre,
      dni:      subDni,
      telefono: subTel,
      correo:   subCorreo,
    },
  };

  const data = sanitizeColegioRecord(raw, existing, Date.now());
  try {
    await dbNs.collection('colegios').doc(id).set(data);
    showToast('Institución guardada.');
    colEditing = null;
  } catch (err) {
    console.error('Error al guardar institución individual en Firestore:', err);
    console.error('Código Firestore:', err.code, '| Mensaje:', err.message);
    showToast('No se pudo guardar: [' + (err.code || 'error') + '] ' + err.message);
  }
  renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
}

async function commitColegiosImport(state, dbNs, container, getFichaType, isAdmin, currentUser) {
  if (!colImportPreview || !colImportPreview.rows.length) return;
  const rows = colImportPreview.rows;
  const now  = Date.now();

  const user = currentUser || cachedCurrentUser;
  if (!user) {
    console.error('Error previo a importación: No hay usuario autenticado en la sesión.');
    colImportResults = {
      total: rows.length,
      success: 0,
      failures: [{ rowNum: '-', codigoLocal: '-', ie: '-', code: 'unauthenticated', message: 'No hay usuario autenticado. Inicia sesión nuevamente.' }],
      mainErrorCode: 'unauthenticated',
    };
    showToast('Sesión no encontrada. Inicia sesión como Administrador.');
    renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
    return;
  }

  // Comprobar rol en la colección 'roles'
  try {
    const roleSnap = await dbNs.collection('roles').doc(user.uid).get();
    const roleInDb = roleSnap.exists ? (roleSnap.data().role || 'sin_rol') : 'no_existe';
    if (roleInDb !== 'admin') {
      console.warn(`Advertencia previa: Usuario ${user.email || user.uid} figura con rol '${roleInDb}' en roles/${user.uid}`);
    }
  } catch (rErr) {
    console.warn('No se pudo verificar el documento de rol antes de importar:', rErr);
  }

  colImportResults = {
    total: rows.length,
    success: 0,
    failures: [],
    mainErrorCode: null,
  };

  const confirmBtn = document.getElementById('col_import_confirm');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Iniciando importación (' + rows.length + ')...';
  }

  const CHUNK_SIZE = 30;

  try {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const currentCount = Math.min(i + chunk.length, rows.length);
      if (confirmBtn) confirmBtn.textContent = 'Importando ' + currentCount + ' de ' + rows.length + '...';

      await Promise.all(chunk.map(async (r, cIdx) => {
        const globalIdx = i + cIdx;
        const rowNum = r._rowNum || (globalIdx + 2);
        try {
          const id = docIdForCodigo(r.codigoLocal);
          const existing = state.colegios.find(c => c.id === id);
          const docData = sanitizeColegioRecord(r, existing, now);
          await dbNs.collection('colegios').doc(id).set(docData);
          colImportResults.success++;
        } catch (err) {
          console.error(`[Fila ${rowNum}] Error Firestore (colegios) al guardar "${r.ie || r.codigoLocal}":`, err);
          console.error(`Código: ${err.code} | Mensaje: ${err.message}`);
          if (!colImportResults.mainErrorCode && err.code) {
            colImportResults.mainErrorCode = err.code;
          }
          colImportResults.failures.push({
            rowNum: rowNum,
            codigoLocal: r.codigoLocal || '—',
            ie: r.ie || '—',
            code: err.code || 'error',
            message: err.message || String(err),
          });
        }
      }));
    }

    console.log('=== Resumen de importación de padrón ===');
    console.log('Total registros:', colImportResults.total, '| Exitosos:', colImportResults.success, '| Fallidos:', colImportResults.failures.length);
    if (colImportResults.failures.length > 0) {
      console.error('Listado de fallos detallados:', colImportResults.failures);
    }

    if (colImportResults.failures.length === 0) {
      showToast('✓ Padrón importado: ' + colImportResults.success + ' instituciones con éxito.');
      colImportPreview = null;
      colShowImport = false;
    } else if (colImportResults.success > 0) {
      showToast('⚠ Importación parcial: ' + colImportResults.success + ' guardadas, ' + colImportResults.failures.length + ' con error. Revisa el reporte.');
    } else {
      const sampleErr = colImportResults.failures[0] || {};
      showToast('✕ Error en importación [' + (sampleErr.code || 'error') + ']: ' + (sampleErr.message || 'Operación denegada'));
    }
  } catch (fatalErr) {
    console.error('Error fatal durante la importación:', fatalErr);
    showToast('✕ Error crítico: [' + (fatalErr.code || 'error') + '] ' + fatalErr.message);
  }

  renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
}

function renderColegioProfile(c, subs, typeStats) {
  const dirInfo = c.director && c.director.nombre
    ? '<div class="sectionTitle" style="margin-top:8px">Director(a)</div>' +
      '<div style="font-size:12.5px;margin-bottom:4px">' +
        '<strong>' + esc(c.director.nombre) + '</strong>' +
        (c.director.dni    ? ' · DNI: ' + esc(c.director.dni) : '') +
        (c.director.telefono ? ' · ☎ ' + esc(c.director.telefono) : '') +
        (c.director.correo   ? ' · ✉ ' + esc(c.director.correo)   : '') +
      '</div>'
    : '';
  const subDirInfo = c.subDirector && c.subDirector.nombre
    ? '<div class="sectionTitle" style="margin-top:8px">Sub-director(a)</div>' +
      '<div style="font-size:12.5px;margin-bottom:4px">' +
        '<strong>' + esc(c.subDirector.nombre) + '</strong>' +
        (c.subDirector.dni    ? ' · DNI: ' + esc(c.subDirector.dni) : '') +
        (c.subDirector.telefono ? ' · ☎ ' + esc(c.subDirector.telefono) : '') +
        (c.subDirector.correo   ? ' · ✉ ' + esc(c.subDirector.correo)   : '') +
      '</div>'
    : '';
  const info = ['modalidad', 'nivelServicio', 'turnos', 'dependencia', 'direccion'].map(f =>
    c[f] ? '<div style="font-size:12.5px;margin-bottom:3px"><strong>' + esc(COLEGIO_FIELD_LABELS[f]) + ':</strong> ' + esc(c[f]) + '</div>' : ''
  ).join('');
  const typeRows = typeStats.map(t =>
    '<div class="barRow"><div class="name">' + esc(t.nombre) + ' <span style="color:var(--ink-soft);font-weight:400">(' + t.count + ' visita' + (t.count === 1 ? '' : 's') + ' · última ' + fmtDate(t.last) + ')</span></div>' + bar(t.avg) + '<div class="val">' + (t.avg === null ? '—' : t.avg + '%') + '</div></div>'
  ).join('') || '<p class="helpText" style="margin-top:0">Este colegio aún no tiene fichas registradas.</p>';
  const recent = subs.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 6).map(s =>
    '<li style="margin-bottom:3px;font-size:12.5px">' + fmtDate(s.fecha) + ' — ' + esc(s.fichaTypeNombre || '—') + (s.responsable ? ' · ' + esc(s.responsable) : '') + '</li>'
  ).join('');
  return '' +
    (info ? '<div class="sectionTitle" style="margin-top:0">Datos del padrón</div>' + info : '') +
    dirInfo + subDirInfo +
    '<div class="sectionTitle">Monitoreos por tipo de ficha</div>' + typeRows +
    (recent ? '<div class="sectionTitle">Últimas visitas</div><ul style="margin:0;padding-left:18px">' + recent + '</ul>' : '');
}

/* ============================= ALERTAS TAB ============================= */
let alertFilters = { fichaTypeId: '', ugel: '' };

export function renderAlertasTab(container, state, getFichaType) {
  const all = computeAlerts(state, getFichaType);
  let alerts = all;
  if (alertFilters.fichaTypeId) alerts = alerts.filter(a => a.fichaTypeId === alertFilters.fichaTypeId);
  if (alertFilters.ugel) alerts = alerts.filter(a => (a.ugel || '').toLowerCase().includes(alertFilters.ugel.toLowerCase()));

  const instConAlerta = new Set(alerts.map(a => a.institucion + '|' + a.ugel)).size;
  const retrocesos = alerts.filter(a => a.trend === 'retroceso').length;
  const ftOpts = state.fichaTypes.map(ft => '<option value="' + ft.id + '"' + (ft.id === alertFilters.fichaTypeId ? ' selected' : '') + '>' + esc(ft.nombre) + '</option>').join('');

  const rows = alerts.map(a => {
    const st = statusFromPct(a.pct);
    return '<tr>' +
      '<td><strong>' + esc(a.institucion) + '</strong><br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(a.ugel || '') + '</span></td>' +
      '<td>' + esc(a.fichaTypeNombre) + '<br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(a.seccion) + '</span></td>' +
      '<td style="max-width:340px">' + esc(a.item) + '</td>' +
      '<td>' + a.pct + '% <span class="badge ' + st.cls + '">' + st.label + '</span>' +
        (a.trend === 'retroceso' ? ' <span class="badge st-inicio" title="Bajó respecto a la visita anterior">▼ retrocedió</span>' : '') +
        (a.trend === 'mejora'    ? ' <span class="badge st-logrado" title="Mejoró respecto a la visita anterior">▲ mejoró</span>'    : '') +
      '</td>' +
      '<td>' + fmtDate(a.fecha) + (a.visita ? ' · V' + a.visita : '') + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:26px">Sin alertas con los filtros actuales.</td></tr>';

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Alertas de seguimiento</h2><p>Cruce automático de institución + tipo de ficha + ítem exacto, a partir de la visita más reciente registrada. Prioriza dónde intervenir primero.</p></div>' +
    '<div class="cards">' +
      '<div class="card"><div class="num">' + alerts.length + '</div><div class="lbl">Alertas activas</div></div>' +
      '<div class="card"><div class="num">' + instConAlerta + '</div><div class="lbl">Instituciones con alertas</div></div>' +
      '<div class="card"><div class="num">' + retrocesos + '</div><div class="lbl">Ítems en retroceso</div></div>' +
    '</div>' +
    '<div class="panel">' +
      '<div class="filterBar">' +
        '<div class="field"><label>Tipo de ficha</label><select id="al_ft"><option value="">Todos</option>' + ftOpts + '</select></div>' +
        '<div class="field"><label>UGEL</label><input type="search" id="al_ugel" value="' + esc(alertFilters.ugel) + '" placeholder="Buscar..."></div>' +
      '</div>' +
      '<div class="tblWrap"><table><thead><tr><th>Institución</th><th>Ficha / sección</th><th>Ítem</th><th>Resultado</th><th>Última visita</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';

  document.getElementById('al_ft').addEventListener('change', e => { alertFilters.fichaTypeId = e.target.value; renderAlertasTab(container, state, getFichaType); });
  document.getElementById('al_ugel').addEventListener('input', e => { alertFilters.ugel = e.target.value; renderAlertasTab(container, state, getFichaType); });
}

function computeAlerts(state, getFichaType) {
  const groups = {};
  state.submissions.forEach(s => { const key = s.fichaTypeId + '|' + (s.institucion || '') + '|' + (s.ugel || ''); (groups[key] = groups[key] || []).push(s); });
  const alerts = [];
  Object.values(groups).forEach(list => {
    const ft = getFichaType(list[0].fichaTypeId);
    if (!ft) return;
    list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt || 0) - (a.createdAt || 0));
    const latest = list[0], prev = list[1] || null;
    const latestMap = {}; (latest.respuestas || []).forEach(r => latestMap[r.id] = r.valor);
    const prevMap   = {}; if (prev) (prev.respuestas || []).forEach(r => prevMap[r.id] = r.valor);
    ft.secciones.forEach(sec => sec.items.forEach(it => {
      const sc = scoreValue(ft.tipoRespuesta, latestMap[it.id]);
      if (sc === null) return;
      const pct = Math.round(sc * 100);
      const status = statusFromPct(pct);
      let trend = null;
      const psc = prev ? scoreValue(ft.tipoRespuesta, prevMap[it.id]) : null;
      if (psc !== null) { const ppct = Math.round(psc * 100); if (pct <= ppct - 15) trend = 'retroceso'; else if (pct >= ppct + 15) trend = 'mejora'; }
      if (status.label === 'Inicio' || trend === 'retroceso') {
        alerts.push({ institucion: latest.institucion, ugel: latest.ugel, fichaTypeId: ft.id, fichaTypeNombre: ft.nombre, seccion: sec.nombre, item: it.texto, pct, status: status.label, trend, fecha: latest.fecha, visita: latest.visita });
      }
    }));
  });
  alerts.sort((a, b) => (a.trend === 'retroceso' ? -1 : 0) - (b.trend === 'retroceso' ? -1 : 0) || a.pct - b.pct);
  return alerts;
}

/* ============================= USUARIOS TAB ============================= */
export function renderUsuariosTab(container, state, dbNs, currentUser) {
  const rows = state.roles.map(r => {
    const isSelf = currentUser && r.id === currentUser.uid;
    return '<tr><td>' + esc(r.email || r.id) + (isSelf ? ' <span class="helpText" style="display:inline">(tú)</span>' : '') + '</td>' +
      '<td><select data-roleuid="' + r.id + '" ' + (isSelf ? 'disabled title="No puedes cambiar tu propio rol desde aquí"' : '') + '>' +
        '<option value="general"' + (r.role === 'general' ? ' selected' : '') + '>General</option>' +
        '<option value="admin"'  + (r.role === 'admin'   ? ' selected' : '') + '>Administrador</option>' +
      '</select></td></tr>';
  }).join('') || '<tr><td colspan="2" style="text-align:center;color:var(--ink-soft);padding:22px">Aún no hay cuentas creadas. Créalas con scripts/create-accounts.js (ver README).</td></tr>';

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Usuarios y roles</h2><p>Cambia el rol (Administrador/General) de las cuentas ya creadas. Para crear cuentas nuevas usa <code>scripts/create-accounts.js</code>.</p></div>' +
    '<div class="panel"><div class="tblWrap"><table><thead><tr><th>Correo</th><th>Rol</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
    '<p class="helpText">Administrador: acceso total. General: puede registrar fichas y ver reportes, pero no puede eliminar datos ni administrar tipos de ficha o usuarios.</p>';

  container.querySelectorAll('[data-roleuid]').forEach(sel => {
    sel.addEventListener('change', async () => {
      try { await dbNs.collection('roles').doc(sel.dataset.roleuid).update({ role: sel.value }); showToast('Rol actualizado.'); }
      catch (err) { console.error(err); showToast('No se pudo actualizar el rol.'); }
    });
  });
}

/* ============================= TIPOS TAB ============================= */
let tiposView       = 'list';
let builderState    = null;
let builderEditingId = null;

export function normalizeExtras(extras) {
  if (!Array.isArray(extras)) return [];
  return extras.map((ex, idx) => {
    if (!ex) return null;
    if (typeof ex === 'string') {
      return { id: 'hdr_' + idx, label: ex, tipo: 'texto', required: false };
    }
    const safeLabel = (ex.label || '').trim();
    const safeId = ex.id || ('hdr_' + (safeLabel ? safeLabel.replace(/[^a-z0-9]+/gi, '_').toLowerCase() : idx) + '_' + idx);
    let safeTipo = (ex.tipo || 'texto').toLowerCase();
    if (!['texto', 'numero', 'fecha', 'si_no'].includes(safeTipo)) safeTipo = 'texto';
    return {
      id: safeId,
      label: safeLabel,
      tipo: safeTipo,
      required: !!ex.required,
    };
  }).filter(Boolean);
}

function blankBuilder() {
  return {
    nombre: '',
    descripcion: '',
    icono: '📋',
    tipoRespuesta: 'si_no',
    secciones: [{ nombre: '', items: [{ id: genId(), texto: '' }] }],
    extras: [
      { id: genId(), label: 'UGEL', tipo: 'texto', required: false },
      { id: genId(), label: 'RED / REI', tipo: 'texto', required: false },
      { id: genId(), label: 'Código modular / local', tipo: 'texto', required: false },
      { id: genId(), label: 'Director(a) en funciones', tipo: 'texto', required: false },
      { id: genId(), label: 'Responsable / especialista', tipo: 'texto', required: false },
    ],
  };
}

function syncBuilderFromDom(container, bs) {
  const icoEl = document.getElementById('b_icono');
  if (icoEl) bs.icono = icoEl.value;
  const nomEl = document.getElementById('b_nombre');
  if (nomEl) bs.nombre = nomEl.value;
  const descEl = document.getElementById('b_desc');
  if (descEl) bs.descripcion = descEl.value;
  const tipoEl = document.getElementById('b_tipo');
  if (tipoEl) bs.tipoRespuesta = tipoEl.value;

  // Sincronizar secciones e ítems
  container.querySelectorAll('[data-secname]').forEach(inp => {
    const sIdx = +inp.dataset.secname;
    if (bs.secciones[sIdx]) bs.secciones[sIdx].nombre = inp.value;
  });
  container.querySelectorAll('[data-sec][data-item]').forEach(inp => {
    const sIdx = +inp.dataset.sec;
    const iIdx = +inp.dataset.item;
    if (bs.secciones[sIdx] && bs.secciones[sIdx].items[iIdx]) {
      bs.secciones[sIdx].items[iIdx].texto = inp.value;
    }
  });

  // Sincronizar campos de cabecera
  container.querySelectorAll('[data-extralabel]').forEach(inp => {
    const eIdx = +inp.dataset.extralabel;
    if (bs.extras[eIdx]) bs.extras[eIdx].label = inp.value;
  });
  container.querySelectorAll('[data-extratipo]').forEach(sel => {
    const eIdx = +sel.dataset.extratipo;
    if (bs.extras[eIdx]) bs.extras[eIdx].tipo = sel.value;
  });
  container.querySelectorAll('[data-extrareq]').forEach(chk => {
    const eIdx = +chk.dataset.extrareq;
    if (bs.extras[eIdx]) bs.extras[eIdx].required = chk.checked;
  });
}

let tiposSubTab = 'fichas'; // 'fichas' | 'areas'

export function renderTiposTab(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null) {
  if (tiposSubTab === 'areas') {
    renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
    return;
  }

  if (tiposView === 'list') {
    const cards = state.fichaTypes.map(ft => {
      const count = state.submissions.filter(s => s.fichaTypeId === ft.id).length;
      const totalItems = ft.secciones.reduce((a, s) => a + s.items.length, 0);
      return '<div class="tipoCard">' +
        '<div class="ti"><h4>' + (ft.icono || '📋') + ' ' + esc(ft.nombre) + '</h4><p>' + esc(ft.descripcion || 'Sin descripción.') + '</p>' +
        '<div class="meta">' + ft.secciones.length + ' secciones · ' + totalItems + ' ítems · ' + RESPONSE_LABELS[ft.tipoRespuesta] + ' · ' + count + ' fichas registradas</div></div>' +
        '<div class="acts"><button class="btn secondary small" data-edit="' + ft.id + '">Editar</button><button class="btn danger small" data-del="' + ft.id + '">Eliminar</button></div>' +
      '</div>';
    }).join('') || '<div class="empty"><h4>Aún no has creado tipos de ficha</h4><p>Crea el primero para empezar a registrar visitas de monitoreo.</p></div>';

    container.innerHTML = '' +
      '<div class="pageHead"><h2>Tipos de ficha y Catálogos</h2><p>Define la estructura de cada ficha y las áreas oficiales que firman los documentos.</p></div>' +
      '<div style="display:flex;gap:8px;margin-bottom:18px;border-bottom:2px solid var(--line);padding-bottom:10px">' +
        '<button type="button" class="btn small" id="subTabFichas">📋 Plantillas de Ficha</button>' +
        '<button type="button" class="btn secondary small" id="subTabAreas">✍️ Áreas y Firmantes</button>' +
      '</div>' +
      '<button class="btn" id="newTipoBtn" style="margin-bottom:16px">+ Nuevo tipo de ficha</button>' +
      cards;

    document.getElementById('subTabFichas').onclick = () => {
      tiposSubTab = 'fichas';
      renderTiposTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
    };
    document.getElementById('subTabAreas').onclick = () => {
      tiposSubTab = 'areas';
      renderTiposTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
    };

    document.getElementById('newTipoBtn').addEventListener('click', () => {
      builderState = blankBuilder(); builderEditingId = null; tiposView = 'builder'; renderTiposTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
    });
    container.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => {
      const ft = getFichaType(b.dataset.edit);
      builderState = JSON.parse(JSON.stringify(ft));
      builderState.extras = normalizeExtras(builderState.extras);
      builderEditingId = ft.id; tiposView = 'builder'; renderTiposTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
    }));
    container.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      const count = state.submissions.filter(s => s.fichaTypeId === b.dataset.del).length;
      const msg = count > 0
        ? 'Este tipo de ficha tiene ' + count + ' fichas registradas. Las fichas ya guardadas no se eliminarán. ¿Eliminar de todas formas?'
        : '¿Eliminar este tipo de ficha?';
      if (!confirm(msg)) return;
      try { await dbNs.collection('fichaTypes').doc(b.dataset.del).delete(); showToast('Tipo de ficha eliminado.'); }
      catch (err) { console.error(err); showToast('No se pudo eliminar.'); }
    }));
    return;
  }
  renderBuilder(container, state, getFichaType, dbNs);
}

let currentAreaReportTab = 'concursos'; // 'concursos' | 'consolidado' | 'individual' | 'avance'

function renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType) {
  const areas = (state.areasFirma && state.areasFirma.length > 0)
    ? state.areasFirma
    : DEFAULT_AREAS;

  const REPORT_TYPES = [
    { id: 'concursos', label: '🏆 Concursos Escolares' },
    { id: 'consolidado', label: '▤ Reporte Consolidado' },
    { id: 'individual', label: '📄 Ficha Individual' },
    { id: 'avance', label: '📊 Avance / Por Ítem' }
  ];

  const cardsHtml = areas.map(area => {
    const plantillasDb = (state.plantillasFirmantes || []).filter(p => p.areaId === area.id && p.tipoReporte === currentAreaReportTab);
    let firmantesList = [];
    if (plantillasDb.length > 0) {
      firmantesList = plantillasDb.sort((a, b) => (a.orden || 99) - (b.orden || 99));
    } else {
      const defaults = DEFAULT_PLANTILLAS.filter(p => p.tipoReporte === currentAreaReportTab);
      firmantesList = defaults.map(p => ({
        cargo: p.cargo.replace(/\[ÁREA\]/g, area.sigla),
        nombreOpcional: p.nombreOpcional || '',
        entidad: p.entidad.replace(/\[ÁREA\]/g, area.sigla),
        leyenda: p.leyenda
      }));
    }

    return `
      <div class="tipoCard" style="margin-bottom:16px;border-left:4px solid var(--primary)">
        <div class="ti" style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <h4 style="margin:0">${esc(area.sigla)} — ${esc(area.nombre)}</h4>
            ${area.esPredeterminada ? '<span class="badge" style="background:#FEF3C7;color:#92400E;font-size:11px">⭐ Predeterminada</span>' : ''}
            <span class="badge" style="background:${area.activa !== false ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${area.activa !== false ? '#15803D' : '#B91C1C'};font-size:11px">
              ${area.activa !== false ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <p style="font-size:12px;color:var(--ink-soft);margin-bottom:10px">
            <strong>Descripción membrete:</strong> ${esc((area.descripcionEncabezado || '').replace(/\n/g, ' · '))}
          </p>

          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;margin-top:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:11.5px;font-weight:700;color:var(--navy-900);text-transform:uppercase">
                Firmantes para: ${REPORT_TYPES.find(t => t.id === currentAreaReportTab)?.label || currentAreaReportTab} (${firmantesList.length})
              </span>
              <button type="button" class="btn secondary small" data-edit-firmantes="${esc(area.id)}" style="padding:2px 8px;font-size:11px">
                ✎ Editar firmantes
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${firmantesList.map((f, fi) => `
                <div style="font-size:11.5px;display:flex;align-items:center;gap:6px;color:#334155">
                  <span style="font-weight:700;color:var(--primary);min-width:18px">${fi + 1}.</span>
                  <strong>${esc(f.cargo)}</strong>
                  ${f.nombreOpcional ? `<span style="color:#64748B">(${esc(f.nombreOpcional)})</span>` : ''}
                  <span style="color:#94A3B8">· ${esc(f.entidad || '')}</span>
                  ${f.leyenda ? `<span class="badge" style="font-size:10px;padding:1px 5px">${esc(f.leyenda)}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="acts" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <button type="button" class="btn secondary small" data-edit-area="${esc(area.id)}">✎ Editar Área</button>
          ${!area.esPredeterminada ? `
            <button type="button" class="btn secondary small" data-set-default="${esc(area.id)}" style="font-size:11px">⭐ Hacer predeterminada</button>
            <button type="button" class="btn danger small" data-del-area="${esc(area.id)}" style="font-size:11px">✕ Eliminar</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pageHead">
      <h2>Catálogo de Áreas y Firmantes Oficiales</h2>
      <p>Administra las áreas de la UGEL 03, sus descripciones para membrete y las plantillas de firmantes por tipo de reporte.</p>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:18px;border-bottom:2px solid var(--line);padding-bottom:10px">
      <button type="button" class="btn secondary small" id="subTabFichas">📋 Plantillas de Ficha</button>
      <button type="button" class="btn small" id="subTabAreas">✍️ Áreas y Firmantes</button>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${REPORT_TYPES.map(t => `
          <button type="button" class="btn ${currentAreaReportTab === t.id ? '' : 'secondary'} small" data-rtab="${t.id}">
            ${t.label}
          </button>
        `).join('')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn secondary" id="btnSeedAreas">🌱 Sembrar áreas oficiales (UGEL 03)</button>
        <button type="button" class="btn" id="btnNewArea">＋ Nueva Área</button>
      </div>
    </div>
    <div id="areasCardsContainer">${cardsHtml}</div>
    <div id="modalAreaHost"></div>
  `;

  document.getElementById('subTabFichas').onclick = () => {
    tiposSubTab = 'fichas';
    renderTiposTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
  };
  document.getElementById('subTabAreas').onclick = () => {
    tiposSubTab = 'areas';
    renderTiposTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
  };

  container.querySelectorAll('[data-rtab]').forEach(b => {
    b.onclick = () => {
      currentAreaReportTab = b.dataset.rtab;
      renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
    };
  });

  document.getElementById('btnSeedAreas').onclick = async () => {
    if (!confirm('¿Sembrar o restaurar las áreas oficiales de la UGEL 03 (AGEBRE, AGEBATP, AGP, AGI, DIRECCIÓN) y sus plantillas de firmantes por defecto?')) return;
    const btn = document.getElementById('btnSeedAreas');
    btn.disabled = true;
    btn.textContent = 'Sembrando...';
    try {
      for (const area of DEFAULT_AREAS) {
        await dbNs.collection('areasFirma').doc(area.id).set({
          ...area,
          updatedAt: Date.now()
        }, { merge: true });
      }
      for (const area of DEFAULT_AREAS) {
        for (const p of DEFAULT_PLANTILLAS) {
          const pid = `${area.id}_${p.tipoReporte}_${p.orden}`;
          const cargoFinal = p.cargo.replace(/\[ÁREA\]/g, area.sigla);
          await dbNs.collection('plantillasFirmantes').doc(pid).set({
            id: pid,
            areaId: area.id,
            tipoReporte: p.tipoReporte,
            orden: p.orden,
            cargo: cargoFinal,
            nombreOpcional: p.nombreOpcional || '',
            entidad: p.entidad.replace(/\[ÁREA\]/g, area.sigla),
            leyenda: p.leyenda,
            updatedAt: Date.now()
          }, { merge: true });
        }
      }
      showToast('✓ Áreas y plantillas oficiales sembradas exitosamente.');
      renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
    } catch (e) {
      console.error('Error sembrando áreas:', e);
      showToast('Error sembrando áreas: ' + e.message);
    }
  };

  document.getElementById('btnNewArea').onclick = () => {
    openAreaModal(null, dbNs, state, container, isAdmin, currentUser, getFichaType);
  };

  container.querySelectorAll('[data-edit-area]').forEach(b => {
    b.onclick = () => {
      const area = areas.find(a => a.id === b.dataset.editArea);
      if (area) openAreaModal(area, dbNs, state, container, isAdmin, currentUser, getFichaType);
    };
  });

  container.querySelectorAll('[data-set-default]').forEach(b => {
    b.onclick = async () => {
      const targetId = b.dataset.setDefault;
      try {
        for (const a of areas) {
          await dbNs.collection('areasFirma').doc(a.id).update({
            esPredeterminada: (a.id === targetId),
            updatedAt: Date.now()
          });
        }
        showToast('✓ Área predeterminada actualizada.');
        renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
      } catch (e) {
        console.error(e);
        showToast('Error al actualizar predeterminada.');
      }
    };
  });

  container.querySelectorAll('[data-del-area]').forEach(b => {
    b.onclick = async () => {
      const area = areas.find(a => a.id === b.dataset.delArea);
      if (!area) return;
      if (area.esPredeterminada) {
        showToast('No se puede eliminar el área predeterminada.');
        return;
      }
      if (!confirm(`¿Eliminar el área "${area.sigla} — ${area.nombre}"?`)) return;
      try {
        await dbNs.collection('areasFirma').doc(area.id).delete();
        showToast('✓ Área eliminada.');
        renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
      } catch (e) {
        console.error(e);
        showToast('Error al eliminar área.');
      }
    };
  });

  container.querySelectorAll('[data-edit-firmantes]').forEach(b => {
    b.onclick = () => {
      const area = areas.find(a => a.id === b.dataset.editFirmantes);
      if (area) openFirmantesEditorModal(area, currentAreaReportTab, dbNs, state, container, isAdmin, currentUser, getFichaType);
    };
  });
}

function openAreaModal(area, dbNs, state, container, isAdmin, currentUser, getFichaType) {
  const host = document.getElementById('modalAreaHost');
  if (!host) return;

  const isEdit = !!area;
  const modalWrap = document.createElement('div');
  modalWrap.className = 'downloadModalOverlay';

  modalWrap.innerHTML = `
    <div class="downloadModalCard" style="max-width:520px">
      <div class="downloadModalHeader">
        <div>
          <h3>${isEdit ? 'Editar Área Institucional' : 'Nueva Área Institucional'}</h3>
          <div class="sub">Catálogo de Áreas de Firma · UGEL 03</div>
        </div>
        <button type="button" class="downloadModalClose" id="m_area_close">✕</button>
      </div>
      <form id="areaForm" class="downloadModalBody">
        <div class="downloadModalSection">
          <label class="secLabel" for="a_nombre">Nombre completo del Área *</label>
          <input type="text" id="a_nombre" required placeholder="Ej: Área de Gestión de la Educación Básica Regular y Especial" value="${esc(isEdit ? area.nombre : '')}">
        </div>
        <div class="downloadModalSection">
          <label class="secLabel" for="a_sigla">Sigla Oficial *</label>
          <input type="text" id="a_sigla" required placeholder="Ej: AGEBRE" value="${esc(isEdit ? area.sigla : '')}">
        </div>
        <div class="downloadModalSection">
          <label class="secLabel" for="a_desc">Descripción para el membrete oficial</label>
          <textarea id="a_desc" rows="2" placeholder="Ej: Área de Gestión de la\nEducación Básica (2026)">${esc(isEdit ? (area.descripcionEncabezado || '') : '')}</textarea>
        </div>
        <div class="downloadModalSection" style="display:flex;flex-direction:row;gap:18px;margin-top:4px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" id="a_activa" ${!isEdit || area.activa !== false ? 'checked' : ''}> Activa
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" id="a_predet" ${isEdit && area.esPredeterminada ? 'checked' : ''}> Predeterminada
          </label>
        </div>
        <div class="downloadModalFooter" style="margin:10px -22px -20px;border-top:1px solid var(--line)">
          <button type="button" class="btn secondary" id="m_area_cancel">Cancelar</button>
          <button type="submit" class="btn" id="m_area_save">Guardar Área</button>
        </div>
      </form>
    </div>
  `;

  host.appendChild(modalWrap);

  const close = () => modalWrap.remove();
  modalWrap.querySelector('#m_area_close').onclick = close;
  modalWrap.querySelector('#m_area_cancel').onclick = close;

  modalWrap.querySelector('#areaForm').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('a_nombre').value.trim();
    const sigla = document.getElementById('a_sigla').value.trim().toUpperCase();
    const desc = document.getElementById('a_desc').value.trim();
    const activa = document.getElementById('a_activa').checked;
    const esPredet = document.getElementById('a_predet').checked;

    const areaId = isEdit ? area.id : sigla.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const btn = document.getElementById('m_area_save');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      // Si se marca predeterminada, desmarcar las otras
      if (esPredet) {
        const otherAreas = (state.areasFirma || DEFAULT_AREAS);
        for (const a of otherAreas) {
          if (a.id !== areaId) {
            await dbNs.collection('areasFirma').doc(a.id).update({ esPredeterminada: false }).catch(() => {});
          }
        }
      }

      await dbNs.collection('areasFirma').doc(areaId).set({
        id: areaId,
        nombre,
        sigla,
        descripcionEncabezado: desc || `${nombre} (2026)`,
        activa,
        esPredeterminada: esPredet,
        updatedAt: Date.now()
      }, { merge: true });

      showToast('✓ Área guardada exitosamente.');
      close();
      renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar área: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Guardar Área';
    }
  };
}

function openFirmantesEditorModal(area, tipoReporte, dbNs, state, container, isAdmin, currentUser, getFichaType) {
  const host = document.getElementById('modalAreaHost');
  if (!host) return;

  const REPORT_NAMES = {
    concursos: 'Acta de Resultados de Concursos',
    consolidado: 'Reporte Consolidado de Monitoreo',
    individual: 'Ficha Individual de Monitoreo',
    avance: 'Reporte por Ítem / de Avance'
  };

  const plantillasDb = (state.plantillasFirmantes || []).filter(p => p.areaId === area.id && p.tipoReporte === tipoReporte);
  let list = [];
  if (plantillasDb.length > 0) {
    list = JSON.parse(JSON.stringify(plantillasDb.sort((a, b) => (a.orden || 99) - (b.orden || 99))));
  } else {
    const defaults = DEFAULT_PLANTILLAS.filter(p => p.tipoReporte === tipoReporte);
    list = defaults.map((p, idx) => ({
      id: `${area.id}_${tipoReporte}_${idx + 1}`,
      areaId: area.id,
      tipoReporte: tipoReporte,
      orden: idx + 1,
      cargo: p.cargo.replace(/\[ÁREA\]/g, area.sigla),
      nombreOpcional: p.nombreOpcional || '',
      entidad: p.entidad.replace(/\[ÁREA\]/g, area.sigla),
      leyenda: p.leyenda
    }));
  }

  const modalWrap = document.createElement('div');
  modalWrap.className = 'downloadModalOverlay';

  function renderInner() {
    modalWrap.innerHTML = `
      <div class="downloadModalCard" style="max-width:640px">
        <div class="downloadModalHeader">
          <div>
            <h3>Plantilla de Firmantes</h3>
            <div class="sub">${esc(area.sigla)} · ${esc(REPORT_NAMES[tipoReporte] || tipoReporte)}</div>
          </div>
          <button type="button" class="downloadModalClose" id="m_f_close">✕</button>
        </div>
        <div class="downloadModalBody">
          <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0">
            Configura los cargos predeterminados que firman este tipo de documento. Puedes agregar hasta 6 firmantes.
          </p>
          <div class="downloadFirmantesList">
            ${list.map((sig, idx) => `
              <div class="downloadFirmanteItem">
                <div class="reorderBtns">
                  <button type="button" class="fUp" data-up="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                  <button type="button" class="fDown" data-down="${idx}" ${idx === list.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div class="fieldsWrap">
                  <input type="text" class="inpCargo" data-idx="${idx}" placeholder="Cargo *" value="${esc(sig.cargo)}" required>
                  <input type="text" class="inpNombre" data-idx="${idx}" placeholder="Nombre (opcional)" value="${esc(sig.nombreOpcional || '')}">
                  <input type="text" class="inpEntidad" data-idx="${idx}" placeholder="Entidad" value="${esc(sig.entidad || '')}">
                  <select class="selLeyenda" data-idx="${idx}">
                    <option value="Firma y Sello" ${sig.leyenda === 'Firma y Sello' ? 'selected' : ''}>Firma y Sello</option>
                    <option value="V.° B.° y Sello" ${sig.leyenda === 'V.° B.° y Sello' ? 'selected' : ''}>V.° B.° y Sello</option>
                    <option value="Sello Institucional" ${sig.leyenda === 'Sello Institucional' ? 'selected' : ''}>Sello Institucional</option>
                    <option value="V.° B.°" ${sig.leyenda === 'V.° B.°' ? 'selected' : ''}>V.° B.°</option>
                    <option value="" ${!sig.leyenda ? 'selected' : ''}>Ninguna</option>
                  </select>
                </div>
                <button type="button" class="delFirmanteBtn" data-del="${idx}">✕</button>
              </div>
            `).join('')}
          </div>

          ${list.length < 6 ? `
            <button type="button" class="btn secondary small" id="m_f_add" style="align-self:flex-start;margin-top:6px">
              ＋ Agregar firmante
            </button>
          ` : ''}
        </div>
        <div class="downloadModalFooter">
          <button type="button" class="btn secondary" id="m_f_cancel">Cancelar</button>
          <button type="button" class="btn" id="m_f_save">Guardar Plantilla</button>
        </div>
      </div>
    `;

    attachInnerEvents();
  }

  function attachInnerEvents() {
    const close = () => modalWrap.remove();
    modalWrap.querySelector('#m_f_close').onclick = close;
    modalWrap.querySelector('#m_f_cancel').onclick = close;

    modalWrap.querySelectorAll('.inpCargo').forEach(inp => {
      inp.oninput = (e) => { list[parseInt(e.target.dataset.idx, 10)].cargo = e.target.value; };
    });
    modalWrap.querySelectorAll('.inpNombre').forEach(inp => {
      inp.oninput = (e) => { list[parseInt(e.target.dataset.idx, 10)].nombreOpcional = e.target.value; };
    });
    modalWrap.querySelectorAll('.inpEntidad').forEach(inp => {
      inp.oninput = (e) => { list[parseInt(e.target.dataset.idx, 10)].entidad = e.target.value; };
    });
    modalWrap.querySelectorAll('.selLeyenda').forEach(sel => {
      sel.onchange = (e) => { list[parseInt(e.target.dataset.idx, 10)].leyenda = e.target.value; };
    });

    modalWrap.querySelectorAll('.fUp').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.up, 10);
        if (idx > 0) {
          const temp = list[idx - 1];
          list[idx - 1] = list[idx];
          list[idx] = temp;
          renderInner();
        }
      };
    });
    modalWrap.querySelectorAll('.fDown').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.down, 10);
        if (idx < list.length - 1) {
          const temp = list[idx + 1];
          list[idx + 1] = list[idx];
          list[idx] = temp;
          renderInner();
        }
      };
    });
    modalWrap.querySelectorAll('.delFirmanteBtn').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.del, 10);
        list.splice(idx, 1);
        renderInner();
      };
    });

    const addBtn = modalWrap.querySelector('#m_f_add');
    if (addBtn) {
      addBtn.onclick = () => {
        if (list.length < 6) {
          list.push({
            id: `${area.id}_${tipoReporte}_${list.length + 1}`,
            areaId: area.id,
            tipoReporte: tipoReporte,
            orden: list.length + 1,
            cargo: `Especialista de ${area.sigla}`,
            nombreOpcional: '',
            entidad: 'UGEL 03 – DRELM',
            leyenda: 'Firma y Sello'
          });
          renderInner();
        }
      };
    }

    modalWrap.querySelector('#m_f_save').onclick = async () => {
      const btn = modalWrap.querySelector('#m_f_save');
      btn.disabled = true;
      btn.textContent = 'Guardando...';

      try {
        // Eliminar plantillas anteriores de este tipo y área
        const prev = (state.plantillasFirmantes || []).filter(p => p.areaId === area.id && p.tipoReporte === tipoReporte);
        for (const p of prev) {
          await dbNs.collection('plantillasFirmantes').doc(p.id).delete().catch(() => {});
        }

        // Insertar la nueva lista ordenada
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const pid = `${area.id}_${tipoReporte}_${i + 1}`;
          await dbNs.collection('plantillasFirmantes').doc(pid).set({
            id: pid,
            areaId: area.id,
            tipoReporte,
            orden: i + 1,
            cargo: item.cargo,
            nombreOpcional: item.nombreOpcional || '',
            entidad: item.entidad || '',
            leyenda: item.leyenda || 'Firma y Sello',
            updatedAt: Date.now()
          });
        }

        showToast('✓ Plantilla de firmantes guardada exitosamente.');
        close();
        renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
      } catch (err) {
        console.error(err);
        showToast('Error al guardar firmantes: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Guardar Plantilla';
      }
    };
  }

  host.appendChild(modalWrap);
  renderInner();
}

function renderBuilder(container, state, getFichaType, dbNs) {
  const bs = builderState;
  bs.extras = normalizeExtras(bs.extras);

  const seccionesHtml = bs.secciones.map((sec, si) => {
    const itemsHtml = sec.items.map((it, ii) =>
      '<div class="listRow itemDefRow">' +
        '<input type="text" placeholder="Texto del ítem / indicador" value="' + esc(it.texto) + '" data-sec="' + si + '" data-item="' + ii + '">' +
        '<button type="button" class="iconBtn" data-rmitem="' + si + '|' + ii + '" title="Quitar ítem">✕</button>' +
      '</div>'
    ).join('');

    const isFirst = si === 0;
    const isLast  = si === bs.secciones.length - 1;

    return '<fieldset class="secCard" draggable="true" data-sec-idx="' + si + '">' +
      '<legend>' +
        '<span class="secCardHandle" title="Arrastra para mover la sección">⠿</span> ' +
        '<span class="secOrderBadge">#' + (si + 1) + '</span> ' +
        '<input type="text" placeholder="Nombre de la sección / dimensión" value="' + esc(sec.nombre) + '" data-secname="' + si + '" style="font-family:var(--serif);font-weight:600;border:none;border-bottom:1px solid var(--line-strong);padding:2px 4px;width:280px;background:transparent">' +
      '</legend>' +
      '<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px dashed var(--line)">' +
        '<span style="font-size:12px;color:var(--ink-soft);margin-right:auto">Mover posición de sección:</span>' +
        '<button type="button" class="btn secondary small" data-movesec="' + si + '|up"' + (isFirst ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '') + ' title="Mover sección arriba">▲ Subir sección</button>' +
        '<button type="button" class="btn secondary small" data-movesec="' + si + '|down"' + (isLast ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '') + ' title="Mover sección abajo">▼ Bajar sección</button>' +
      '</div>' +
      itemsHtml +
      '<div style="margin-top:8px"><button type="button" class="linklike" data-additem="' + si + '">+ Agregar ítem</button></div>' +
      '<div style="margin-top:12px;padding-top:8px;border-top:1px solid var(--line);display:flex;align-items:center;gap:6px;flex-wrap:wrap">' +
        '<button type="button" class="btn secondary small" data-movesec="' + si + '|up"' + (isFirst ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '') + ' title="Mover sección arriba">▲ Subir sección</button>' +
        '<button type="button" class="btn secondary small" data-movesec="' + si + '|down"' + (isLast ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '') + ' title="Mover sección abajo">▼ Bajar sección</button>' +
        '<button type="button" class="btn danger small" data-rmsec="' + si + '" style="margin-left:auto">Quitar sección</button>' +
      '</div>' +
    '</fieldset>';
  }).join('');

  const extrasHtml = bs.extras.map((ex, i) => {
    const isFirst = i === 0;
    const isLast  = i === bs.extras.length - 1;
    return '<div class="extraDefRow" data-extra-idx="' + i + '">' +
      '<span class="secOrderBadge" style="margin-right:2px">#' + (i + 1) + '</span>' +
      '<input type="text" class="extraLabelInp" placeholder="Etiqueta del campo (ej: Director(a), N° tutores, ¿Es JEC?)" value="' + esc(ex.label) + '" data-extralabel="' + i + '">' +
      '<select class="extraTipoSel" data-extratipo="' + i + '">' +
        '<option value="texto"' + (ex.tipo === 'texto' ? ' selected' : '') + '>Texto corto</option>' +
        '<option value="numero"' + (ex.tipo === 'numero' ? ' selected' : '') + '>Número</option>' +
        '<option value="fecha"' + (ex.tipo === 'fecha' ? ' selected' : '') + '>Fecha</option>' +
        '<option value="si_no"' + (ex.tipo === 'si_no' ? ' selected' : '') + '>Sí / No</option>' +
      '</select>' +
      '<label class="extraReqLabel" title="Marcar si es obligatorio para registrar la ficha">' +
        '<input type="checkbox" data-extrareq="' + i + '"' + (ex.required ? ' checked' : '') + '> Obligatorio' +
      '</label>' +
      '<div class="extraActs">' +
        '<button type="button" class="iconBtn small" data-moveextra="' + i + '|up"' + (isFirst ? ' disabled' : '') + ' title="Subir campo">▲</button>' +
        '<button type="button" class="iconBtn small" data-moveextra="' + i + '|down"' + (isLast ? ' disabled' : '') + ' title="Bajar campo">▼</button>' +
        '<button type="button" class="iconBtn small" data-rmextra="' + i + '" title="Quitar campo">✕</button>' +
      '</div>' +
    '</div>';
  }).join('') || '<p class="helpText" style="margin-top:0">Sin campos personalizados de cabecera.</p>';

  container.innerHTML = '' +
    '<div class="pageHead"><h2>' + (builderEditingId ? 'Editar tipo de ficha' : 'Nuevo tipo de ficha') + '</h2></div>' +
    '<div class="panel">' +
      '<div class="fieldGrid">' +
        '<div class="field"><label>Icono (emoji)</label><input type="text" id="b_icono" value="' + esc(bs.icono) + '" maxlength="4" style="max-width:80px"></div>' +
        '<div class="field" style="grid-column:span 2"><label>Nombre de la ficha *</label><input type="text" id="b_nombre" value="' + esc(bs.nombre) + '" placeholder="Ej: Ficha de Monitoreo a la Gestión Escolar"></div>' +
      '</div>' +
      '<div class="field"><label>Descripción</label><textarea id="b_desc" placeholder="Breve descripción de para qué se usa esta ficha">' + esc(bs.descripcion) + '</textarea></div>' +
      '<div class="field" style="max-width:340px"><label>Escala de respuesta de los ítems</label>' +
        '<select id="b_tipo">' + Object.keys(RESPONSE_LABELS).map(k => '<option value="' + k + '"' + (k === bs.tipoRespuesta ? ' selected' : '') + '>' + RESPONSE_LABELS[k] + '</option>').join('') + '</select>' +
        '<p class="helpText">Se aplicará a todos los ítems de esta ficha.</p>' +
      '</div>' +
    '</div>' +
    '<div class="panel"><h3>Datos generales de la ficha <small>campos de cabecera configurables</small></h3>' +
      '<div style="background:var(--surface-2);border:1px solid var(--line);border-radius:var(--radius);padding:10px 14px;margin-bottom:14px;font-size:12.5px;color:var(--ink-soft);line-height:1.4">' +
        '<strong>Campos fijos obligatorios:</strong> <em>Institución educativa</em>, <em>Fecha</em> y <em>N° de visita</em> siempre están presentes en todas las fichas.<br>' +
        'Agrega a continuación los campos de cabecera específicos para este tipo de ficha (UGEL, Código modular, Director, Coordinador, Teléfono, ¿Es JEC?, etc.).' +
      '</div>' +
      '<div id="extrasList">' + extrasHtml + '</div>' +
      '<button type="button" class="btn secondary small" id="addExtraBtn" style="margin-top:4px">+ Agregar campo de cabecera</button>' +
    '</div>' +
    '<div class="panel"><h3>Secciones e ítems</h3>' + seccionesHtml +
      '<button type="button" class="btn secondary small" id="addSecBtn">+ Agregar sección</button>' +
    '</div>' +
    '<div style="display:flex;gap:10px;margin-top:16px">' +
      '<button class="btn" id="saveTipoBtn">Guardar tipo de ficha</button>' +
      '<button class="btn secondary" id="cancelTipoBtn">Cancelar</button>' +
    '</div>';

  document.getElementById('b_icono').addEventListener('input', e => bs.icono = e.target.value);
  document.getElementById('b_nombre').addEventListener('input', e => bs.nombre = e.target.value);
  document.getElementById('b_desc').addEventListener('input', e => bs.descripcion = e.target.value);
  document.getElementById('b_tipo').addEventListener('change', e => bs.tipoRespuesta = e.target.value);
  container.querySelectorAll('[data-secname]').forEach(inp => inp.addEventListener('input', () => { bs.secciones[+inp.dataset.secname].nombre = inp.value; }));
  container.querySelectorAll('[data-sec][data-item]').forEach(inp => inp.addEventListener('input', () => { bs.secciones[+inp.dataset.sec].items[+inp.dataset.item].texto = inp.value; }));
  container.querySelectorAll('[data-extralabel]').forEach(inp => inp.addEventListener('input', () => { bs.extras[+inp.dataset.extralabel].label = inp.value; }));
  container.querySelectorAll('[data-extratipo]').forEach(sel => sel.addEventListener('change', () => { bs.extras[+sel.dataset.extratipo].tipo = sel.value; }));
  container.querySelectorAll('[data-extrareq]').forEach(chk => chk.addEventListener('change', () => { bs.extras[+chk.dataset.extrareq].required = chk.checked; }));

  container.querySelectorAll('[data-additem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.secciones[+b.dataset.additem].items.push({ id: genId(), texto: '' });
    renderBuilder(container, state, getFichaType, dbNs);
  }));

  container.querySelectorAll('[data-rmitem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const [si, ii] = b.dataset.rmitem.split('|').map(Number);
    bs.secciones[si].items.splice(ii, 1);
    renderBuilder(container, state, getFichaType, dbNs);
  }));

  container.querySelectorAll('[data-rmsec]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.secciones.splice(+b.dataset.rmsec, 1);
    renderBuilder(container, state, getFichaType, dbNs);
  }));

  document.getElementById('addSecBtn').addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.secciones.push({ nombre: '', items: [{ id: genId(), texto: '' }] });
    renderBuilder(container, state, getFichaType, dbNs);
  });

  // Reordenar secciones con botones ▲ ▼
  container.querySelectorAll('[data-movesec]').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    const [siStr, dir] = b.dataset.movesec.split('|');
    const si = Number(siStr);
    syncBuilderFromDom(container, bs);
    const target = dir === 'up' ? si - 1 : si + 1;
    if (target >= 0 && target < bs.secciones.length) {
      const temp = bs.secciones[si];
      bs.secciones[si] = bs.secciones[target];
      bs.secciones[target] = temp;
      renderBuilder(container, state, getFichaType, dbNs);
      const targetCard = container.querySelector('fieldset.secCard[data-sec-idx="' + target + '"]');
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetCard.classList.add('secMovedHighlight');
        setTimeout(() => targetCard.classList.remove('secMovedHighlight'), 1200);
      }
    }
  }));

  // Drag & Drop de secciones
  let draggedSecIdx = null;
  container.querySelectorAll('fieldset.secCard').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedSecIdx = Number(card.dataset.secIdx);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(draggedSecIdx));
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      container.querySelectorAll('fieldset.secCard').forEach(c => c.classList.remove('dragOver'));
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('dragOver');
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('dragOver');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('dragOver');
      const targetIdx = Number(card.dataset.secIdx);
      if (draggedSecIdx !== null && draggedSecIdx !== targetIdx) {
        syncBuilderFromDom(container, bs);
        const [moved] = bs.secciones.splice(draggedSecIdx, 1);
        bs.secciones.splice(targetIdx, 0, moved);
        renderBuilder(container, state, getFichaType, dbNs);
      }
    });
  });

  // Reordenar campos de cabecera con botones ▲ ▼
  container.querySelectorAll('[data-moveextra]').forEach(b => b.addEventListener('click', () => {
    const [eiStr, dir] = b.dataset.moveextra.split('|');
    const ei = Number(eiStr);
    syncBuilderFromDom(container, bs);
    const target = dir === 'up' ? ei - 1 : ei + 1;
    if (target >= 0 && target < bs.extras.length) {
      const temp = bs.extras[ei];
      bs.extras[ei] = bs.extras[target];
      bs.extras[target] = temp;
      renderBuilder(container, state, getFichaType, dbNs);
    }
  }));

  document.getElementById('addExtraBtn').addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.extras.push({ id: genId(), label: '', tipo: 'texto', required: false });
    renderBuilder(container, state, getFichaType, dbNs);
  });

  container.querySelectorAll('[data-rmextra]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.extras.splice(+b.dataset.rmextra, 1);
    renderBuilder(container, state, getFichaType, dbNs);
  }));

  document.getElementById('cancelTipoBtn').addEventListener('click', () => {
    tiposView = 'list';
    renderTiposTab(container, state, getFichaType, dbNs);
  });

  document.getElementById('saveTipoBtn').addEventListener('click', async () => {
    syncBuilderFromDom(container, bs);
    if (!bs.nombre.trim()) { showToast('Ponle un nombre a la ficha.'); return; }
    bs.secciones = bs.secciones.filter(s => s.nombre.trim() || s.items.some(i => i.texto.trim()));
    bs.secciones.forEach(s => s.items = s.items.filter(i => i.texto.trim()));
    bs.extras = bs.extras.filter(e => e.label.trim());
    if (bs.secciones.length === 0 || bs.secciones.every(s => s.items.length === 0)) { showToast('Agrega al menos un ítem.'); return; }
    if (!dbNs) { showToast('No hay conexión a la base de datos.'); return; }
    const payload = {
      nombre: bs.nombre.trim(),
      descripcion: bs.descripcion.trim(),
      icono: bs.icono || '📋',
      tipoRespuesta: bs.tipoRespuesta,
      secciones: bs.secciones,
      extras: bs.extras,
    };
    try {
      if (builderEditingId) {
        await dbNs.collection('fichaTypes').doc(builderEditingId).set(payload);
        showToast('Tipo de ficha actualizado.');
      } else {
        await dbNs.collection('fichaTypes').add(payload);
        showToast('Tipo de ficha creado.');
      }
      tiposView = 'list';
      renderTiposTab(document.getElementById('tabContent'), state, getFichaType, dbNs);
    } catch (err) {
      console.error(err);
      showToast('No se pudo guardar.');
    }
  });
}

/* =========================================================================
   RESPONSABLES — Directorio, importación y autocompletado de especialistas
   ========================================================================= */

export const RESP_FIELD_ALIASES = {
  red: ['red', 'redes', 'rei', 'reis', 'red(es)', 'red (es)', 'redes a cargo'],
  distrito: ['distrito', 'distritos', 'distrito(s)', 'distritos(s)', 'distrito (s)', 'jurisdiccion', 'jurisdicción'],
  especialista: ['especialista responsable', 'especialista', 'responsable', 'area', 'área', 'especialidad'],
  nombresApellidos: ['nombres y apellidos', 'apellidos y nombres', 'nombre', 'nombres', 'apellidos', 'especialista nombres'],
  cargo: ['cargo', 'puesto', 'funcion', 'función'],
  modalidad: ['modalidad', 'modalidades', 'nivel/modalidad', 'servicio'],
  celular: ['n°celular', 'n° celular', 'celular', 'telefono', 'teléfono', 'n celular', 'nro celular', 'movil', 'móvil'],
  correo: ['correo institucional', 'correo', 'email', 'e-mail', 'correo electronico', 'correo electrónico']
};

/** Genera un ID válido y seguro para Firestore a partir de correo o nombres */
export function docIdForResponsable(correo, nombres) {
  const base = (correo || nombres || '').trim().toLowerCase();
  let id = normalizeText(base)
    .replace(/[\/\s\\#?%*:[\]@.]/g, '_')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  if (!id || id.startsWith('__')) {
    id = ('resp_' + id).replace(/^_+|_+$/g, '').slice(0, 120);
  }
  return id || genId();
}

/** Prepara y sanea el registro de especialista para Firestore */
export function sanitizeResponsableRecord(r, existing, now) {
  now = (typeof now === 'number' && !isNaN(now)) ? now : Date.now();
  const createdAt = (existing && typeof existing.createdAt === 'number' && !isNaN(existing.createdAt))
    ? existing.createdAt
    : now;

  const s = (v) => {
    if (v === undefined || v === null || (typeof v === 'number' && isNaN(v))) return '';
    return String(v).trim();
  };

  let modalidad = s(r.modalidad);
  const mNorm = normalizeText(modalidad);
  if (mNorm.includes('amb') || (mNorm.includes('ebr') && mNorm.includes('ebe'))) {
    modalidad = 'EBR / EBE';
  } else if (mNorm.includes('ebe')) {
    modalidad = 'EBE';
  } else if (mNorm.includes('ebr')) {
    modalidad = 'EBR';
  }

  const docData = {
    red:              s(r.red),
    distrito:         s(r.distrito),
    especialista:     s(r.especialista),
    nombresApellidos: s(r.nombresApellidos),
    cargo:            s(r.cargo),
    modalidad:        modalidad,
    celular:          s(r.celular),
    correo:           s(r.correo),
    updatedAt:        now,
    createdAt:        createdAt,
  };

  return cleanForFirestore(docData);
}

/** Descarga plantilla Excel para importar especialistas/responsables */
export function downloadPlantillaResponsablesExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Librería Excel no disponible. Revisa la conexión a internet.');
    return;
  }
  const headers = [
    'RED', 'Distrito(s)', 'Especialista responsable', 'Nombres y apellidos',
    'Cargo', 'Modalidad', 'N°Celular', 'Correo Institucional'
  ];
  const exampleRows = [
    [
      'RED 01, RED 03', 'Cercado de Lima, Breña', 'Especialista de Convivencia Escolar',
      'García Mendoza, Ana María', 'Especialista en Educación EBR / EBE',
      'EBR / EBE', '987654321', 'ana.garcia@ugel03.gob.pe'
    ],
    [
      'RED 02', 'La Victoria', 'Especialista Pedagógico',
      'Ramos Silva, Jorge Luis', 'Coordinador Pedagógico',
      'EBR', '912345678', 'jorge.ramos@ugel03.gob.pe'
    ],
    [
      'RED 05', 'San Isidro, Miraflores', 'Especialista de Inclusión',
      'Paredes Castro, Lucía Elena', 'Especialista EBE',
      'EBE', '998877665', 'lucia.paredes@ugel03.gob.pe'
    ]
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  ws['!cols'] = headers.map(() => ({ wch: 26 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Responsables');
  XLSX.writeFile(wb, 'plantilla_responsables.xlsx');
  showToast('Plantilla de responsables descargada.');
}

/** Lee archivo Excel de responsables y extrae filas */
export async function parseResponsablesExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (typeof XLSX === 'undefined') { reject(new Error('SheetJS no disponible')); return; }
        const data = new Uint8Array(e.target.result);
        const wb   = XLSX.read(data, { type: 'array' });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rawRows.length < 2) { resolve({ rows: [], errors: ['El archivo no contiene suficientes filas.'] }); return; }

        const headerRow = rawRows[0].map(h => normalizeText(String(h)).replace(/\.$/, ''));
        const colMap = {};

        headerRow.forEach((h, i) => {
          if (!h) return;
          for (const field in RESP_FIELD_ALIASES) {
            if (RESP_FIELD_ALIASES[field].some(a => normalizeText(a).replace(/\.$/, '') === h)) {
              colMap[i] = field;
              break;
            }
          }
        });

        // Fallback heurístico si no coincidieron todos los encabezados
        if (!Object.values(colMap).includes('nombresApellidos')) {
          headerRow.forEach((h, i) => {
            if (h.includes('nom') || h.includes('apel')) colMap[i] = 'nombresApellidos';
          });
        }
        if (!Object.values(colMap).includes('correo')) {
          headerRow.forEach((h, i) => {
            if (h.includes('corr') || h.includes('mail')) colMap[i] = 'correo';
          });
        }
        if (!Object.values(colMap).includes('red')) {
          headerRow.forEach((h, i) => {
            if (h.includes('red') || h.includes('rei')) colMap[i] = 'red';
          });
        }
        if (!Object.values(colMap).includes('modalidad')) {
          headerRow.forEach((h, i) => {
            if (h.includes('mod')) colMap[i] = 'modalidad';
          });
        }

        const parsedRows = [], errors = [];
        for (let ri = 1; ri < rawRows.length; ri++) {
          const vals = rawRows[ri];
          if (!vals || !Array.isArray(vals) || vals.every(v => v === undefined || v === null || String(v).trim() === '')) continue;

          const row = {
            _rowNum: ri + 1,
            red: '', distrito: '', especialista: '', nombresApellidos: '',
            cargo: '', modalidad: '', celular: '', correo: ''
          };

          Object.entries(colMap).forEach(([ci, field]) => {
            const rawVal = vals[+ci];
            const val = (rawVal === undefined || rawVal === null) ? '' : String(rawVal).trim();
            row[field] = val;
          });

          // Normalizar modalidad
          const mNorm = normalizeText(row.modalidad);
          if (mNorm.includes('amb') || (mNorm.includes('ebr') && mNorm.includes('ebe'))) {
            row.modalidad = 'EBR / EBE';
          } else if (mNorm.includes('ebe')) {
            row.modalidad = 'EBE';
          } else if (mNorm.includes('ebr')) {
            row.modalidad = 'EBR';
          }

          if (!row.nombresApellidos && !row.correo) {
            errors.push('Fila ' + (ri + 1) + ': falta Nombres y apellidos o Correo — omitida.');
            continue;
          }
          parsedRows.push(row);
        }
        resolve({ rows: parsedRows, errors });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function modalidadBadge(m) {
  if (!m) return '<span class="badge st-none">—</span>';
  const norm = m.toUpperCase();
  if (norm.includes('EBR') && norm.includes('EBE')) {
    return '<span class="badge badge-ambas">EBR / EBE</span>';
  }
  if (norm.includes('EBE')) {
    return '<span class="badge badge-ebe">EBE</span>';
  }
  if (norm.includes('EBR')) {
    return '<span class="badge badge-ebr">EBR</span>';
  }
  return '<span class="badge st-none">' + esc(m) + '</span>';
}

let respFilters = { modalidad: '', red: '', q: '' };
let respExpanded = null;
let respShowImport = false;
let respImportPreview = null; // {rows, errors}
let respImportResults = null; // { total, success, failures, mainErrorCode }
let respEditing = null; // null | 'new' | responsableId

export function renderResponsablesTab(container, state, dbNs, isAdmin, currentUser) {
  const allReds = new Set();
  (state.responsables || []).forEach(r => {
    if (!r.red) return;
    r.red.split(/[,;\/]+/).map(x => x.trim()).filter(Boolean).forEach(x => allReds.add(x));
  });
  const redList = Array.from(allReds).sort();

  const totalResp = (state.responsables || []).length;
  const ebrCount   = (state.responsables || []).filter(r => (r.modalidad || '').toUpperCase() === 'EBR').length;
  const ebeCount   = (state.responsables || []).filter(r => (r.modalidad || '').toUpperCase() === 'EBE').length;
  const ambasCount = (state.responsables || []).filter(r => {
    const m = (r.modalidad || '').toUpperCase();
    return m === 'EBR / EBE' || (m.includes('EBR') && m.includes('EBE'));
  }).length;

  let filtered = (state.responsables || []).slice();
  if (respFilters.modalidad) {
    if (respFilters.modalidad === 'EBR') {
      filtered = filtered.filter(r => (r.modalidad || '').toUpperCase().includes('EBR'));
    } else if (respFilters.modalidad === 'EBE') {
      filtered = filtered.filter(r => (r.modalidad || '').toUpperCase().includes('EBE'));
    } else if (respFilters.modalidad === 'EBR / EBE') {
      filtered = filtered.filter(r => {
        const m = (r.modalidad || '').toUpperCase();
        return m === 'EBR / EBE' || (m.includes('EBR') && m.includes('EBE'));
      });
    } else {
      filtered = filtered.filter(r => r.modalidad === respFilters.modalidad);
    }
  }
  if (respFilters.red) {
    const reqRed = normalizeText(respFilters.red);
    filtered = filtered.filter(r => normalizeText(r.red).includes(reqRed));
  }
  if (respFilters.q) {
    const qNorm = normalizeText(respFilters.q);
    filtered = filtered.filter(r =>
      normalizeText(r.nombresApellidos).includes(qNorm) ||
      normalizeText(r.especialista).includes(qNorm) ||
      normalizeText(r.cargo).includes(qNorm) ||
      normalizeText(r.red).includes(qNorm) ||
      normalizeText(r.distrito).includes(qNorm) ||
      normalizeText(r.correo).includes(qNorm) ||
      normalizeText(r.celular).includes(qNorm)
    );
  }
  filtered.sort((a, b) => (a.nombresApellidos || '').localeCompare(b.nombresApellidos || ''));

  const rows = filtered.map(r => {
    const isOpen = respExpanded === r.id;
    const subsCount = (state.submissions || []).filter(s => {
      const respName = (s.responsable || '').trim().toLowerCase();
      const myName   = (r.nombresApellidos || '').trim().toLowerCase();
      return respName && myName && (respName.includes(myName) || myName.includes(respName));
    }).length;

    const detailHtml = isOpen
      ? '<div style="background:var(--surface-2);border-radius:var(--radius);padding:14px;margin:6px 0;font-size:13px;line-height:1.6">' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' +
            '<div><strong>RED(s) asignadas:</strong> ' + esc(r.red || '—') + '</div>' +
            '<div><strong>Distrito(s):</strong> ' + esc(r.distrito || '—') + '</div>' +
            '<div><strong>Área / Especialidad:</strong> ' + esc(r.especialista || '—') + '</div>' +
            '<div><strong>Cargo oficial:</strong> ' + esc(r.cargo || '—') + '</div>' +
            '<div><strong>Modalidad:</strong> ' + modalidadBadge(r.modalidad) + '</div>' +
            '<div><strong>N° Celular:</strong> ' + (r.celular ? '<a href="tel:' + esc(r.celular) + '">📞 ' + esc(r.celular) + '</a>' : '—') + '</div>' +
            '<div><strong>Correo:</strong> ' + (r.correo ? '<a href="mailto:' + esc(r.correo) + '">✉ ' + esc(r.correo) + '</a>' : '—') + '</div>' +
            '<div><strong>Fichas registradas:</strong> <span class="badge ' + (subsCount ? 'st-logrado' : 'st-none') + '">' + subsCount + ' ficha(s)</span></div>' +
          '</div>' +
        '</div>'
      : '';

    return '<tr class="clickable" data-resprow="' + esc(r.id) + '">' +
      '<td>' + (r.red ? '<span class="badge badge-red">' + esc(r.red) + '</span>' : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      '<td>' + esc(r.distrito || '—') + '</td>' +
      '<td><strong>' + esc(r.especialista || '—') + '</strong></td>' +
      '<td>' + esc(r.nombresApellidos || '—') + '</td>' +
      '<td>' + esc(r.cargo || '—') + '</td>' +
      '<td>' + modalidadBadge(r.modalidad) + '</td>' +
      '<td>' + (r.celular ? '<a href="tel:' + esc(r.celular) + '" style="color:inherit;text-decoration:none">📞 ' + esc(r.celular) + '</a>' : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      '<td>' + (r.correo ? '<a href="mailto:' + esc(r.correo) + '" style="color:var(--primary);text-decoration:none">✉ ' + esc(r.correo) + '</a>' : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      (isAdmin ? '<td><button class="iconBtn" data-respenit="' + esc(r.id) + '" title="Editar">✎</button> <button class="iconBtn" data-respdel="' + esc(r.id) + '" title="Eliminar">✕</button></td>' : '<td></td>') +
    '</tr>' +
    (isOpen ? '<tr class="detailRow"><td colspan="' + (isAdmin ? 9 : 8) + '">' + detailHtml + '</td></tr>' : '');
  }).join('') || '<tr><td colspan="' + (isAdmin ? 9 : 8) + '" style="text-align:center;color:var(--ink-soft);padding:22px">Ningún especialista coincide con los filtros.</td></tr>';

  container.innerHTML = '' +
    '<div class="pageHead">' +
      '<h2>Responsables</h2>' +
      '<p>Directorio de especialistas responsables de monitoreo por RED, distrito y modalidad (EBR, EBE o ambas).</p>' +
    '</div>' +
    '<div class="cards">' +
      '<div class="card"><div class="num">' + totalResp + '</div><div class="lbl">Especialistas registrados</div></div>' +
      '<div class="card"><div class="num">' + redList.length + '</div><div class="lbl">REDs cubiertas</div></div>' +
      '<div class="card"><div class="num">' + ebrCount + '</div><div class="lbl">Modalidad EBR</div></div>' +
      '<div class="card"><div class="num">' + ebeCount + '</div><div class="lbl">Modalidad EBE</div></div>' +
      '<div class="card"><div class="num">' + ambasCount + '</div><div class="lbl">Ambas (EBR / EBE)</div></div>' +
    '</div>' +
    (totalResp === 0 ? '<div class="empty"><h4>Aún no hay especialistas registrados</h4><p>' + (isAdmin ? 'Importa la lista de responsables en el panel de abajo o agrégalos manualmente.' : 'Pide a un administrador que importe la nómina de especialistas.') + '</p></div>' : '') +
    (isAdmin ? renderResponsablesAdminPanel(state) : '') +
    '<div class="panel">' +
      '<h3>Directorio de especialistas</h3>' +
      '<div class="filterBar">' +
        '<div class="field">' +
          '<label>Modalidad</label>' +
          '<select id="resp_fil_modalidad">' +
            '<option value="">Todas las modalidades</option>' +
            '<option value="EBR"' + (respFilters.modalidad === 'EBR' ? ' selected' : '') + '>EBR</option>' +
            '<option value="EBE"' + (respFilters.modalidad === 'EBE' ? ' selected' : '') + '>EBE</option>' +
            '<option value="EBR / EBE"' + (respFilters.modalidad === 'EBR / EBE' ? ' selected' : '') + '>EBR / EBE (Ambas)</option>' +
          '</select>' +
        '</div>' +
        '<div class="field">' +
          '<label>RED</label>' +
          '<select id="resp_fil_red">' +
            '<option value="">Todas las REDs</option>' +
            redList.map(r => '<option value="' + esc(r) + '"' + (r === respFilters.red ? ' selected' : '') + '>' + esc(r) + '</option>').join('') +
          '</select>' +
        '</div>' +
        '<div class="field" style="flex:2;min-width:200px">' +
          '<label>Buscar</label>' +
          '<input type="search" id="resp_fil_q" value="' + esc(respFilters.q) + '" placeholder="Nombre, cargo, área, RED o distrito...">' +
        '</div>' +
        '<button class="btn secondary small" id="resp_fil_clear" type="button" style="align-self:flex-end;margin-bottom:2px">Limpiar</button>' +
        '<button class="btn secondary small" id="resp_export" type="button" style="margin-left:auto;align-self:flex-end;margin-bottom:2px">Exportar CSV</button>' +
      '</div>' +
      '<div class="tblWrap"><table><thead><tr><th>RED</th><th>Distrito(s)</th><th>Especialista responsable</th><th>Nombres y apellidos</th><th>Cargo</th><th>Modalidad</th><th>N°Celular</th><th>Correo Institucional</th>' + (isAdmin ? '<th></th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';

  // Event handlers
  const onFilterChange = () => renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
  const fMod = document.getElementById('resp_fil_modalidad');
  if (fMod) fMod.addEventListener('change', e => { respFilters.modalidad = e.target.value; onFilterChange(); });
  const fRed = document.getElementById('resp_fil_red');
  if (fRed) fRed.addEventListener('change', e => { respFilters.red = e.target.value; onFilterChange(); });
  const fQ = document.getElementById('resp_fil_q');
  if (fQ) fQ.addEventListener('input', e => { respFilters.q = e.target.value; onFilterChange(); });
  const fClear = document.getElementById('resp_fil_clear');
  if (fClear) fClear.addEventListener('click', () => { respFilters = { modalidad: '', red: '', q: '' }; onFilterChange(); });

  const fExport = document.getElementById('resp_export');
  if (fExport) {
    fExport.addEventListener('click', () => {
      const header = ['RED', 'Distrito(s)', 'Especialista responsable', 'Nombres y apellidos', 'Cargo', 'Modalidad', 'N°Celular', 'Correo Institucional'];
      const dataRows = filtered.map(r => [
        r.red, r.distrito, r.especialista, r.nombresApellidos, r.cargo, r.modalidad, r.celular, r.correo
      ]);
      downloadCsv('responsables.csv', header, dataRows);
    });
  }

  container.querySelectorAll('tr[data-resprow]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-respenit],[data-respdel],a')) return;
      const id = tr.dataset.resprow;
      respExpanded = respExpanded === id ? null : id;
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
    });
  });

  if (isAdmin) {
    container.querySelectorAll('[data-respenit]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        respEditing = btn.dataset.respenit;
        renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
      });
    });

    container.querySelectorAll('[data-respdel]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar este especialista del directorio?')) return;
        try {
          await dbNs.collection('responsables').doc(btn.dataset.respdel).delete();
          showToast('Especialista eliminado.');
        } catch (err) {
          console.error('Error eliminando responsable:', err);
          showToast('No se pudo eliminar: [' + (err.code || 'error') + '] ' + err.message);
        }
      });
    });

    const newBtn = document.getElementById('resp_new_btn');
    if (newBtn) newBtn.addEventListener('click', () => {
      respEditing = 'new';
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
    });

    const saveBtn = document.getElementById('resp_f_save');
    if (saveBtn) saveBtn.addEventListener('click', () => saveResponsableForm(state, dbNs, container, isAdmin, currentUser));

    const cancelBtn = document.getElementById('resp_f_cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      respEditing = null;
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
    });

    const impToggle = document.getElementById('resp_import_toggle');
    if (impToggle) impToggle.addEventListener('click', () => {
      respShowImport = !respShowImport;
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
    });

    const plantillaBtn = document.getElementById('resp_download_plantilla');
    if (plantillaBtn) plantillaBtn.addEventListener('click', downloadPlantillaResponsablesExcel);

    const impFile = document.getElementById('resp_import_file');
    if (impFile) {
      impFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        respImportResults = null;
        try {
          respImportPreview = await parseResponsablesExcel(file);
        } catch (err) {
          console.error('Error leyendo archivo Excel de responsables:', err);
          respImportPreview = { rows: [], errors: ['No se pudo leer el archivo: ' + (err.message || 'error')] };
        }
        renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
        e.target.value = '';
      });
    }

    const impConfirm = document.getElementById('resp_import_confirm');
    if (impConfirm) {
      impConfirm.addEventListener('click', () => {
        commitResponsablesImport(state, dbNs, container, isAdmin, currentUser);
      });
    }

    const clearResBtn = document.getElementById('resp_import_clear_results');
    if (clearResBtn) {
      clearResBtn.addEventListener('click', () => {
        respImportResults = null;
        renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
      });
    }
  }
}

function renderResponsablesAdminPanel(state) {
  const existing = (respEditing && respEditing !== 'new')
    ? (state.responsables || []).find(r => r.id === respEditing)
    : null;

  return '' +
    '<div class="panel"><h3>Agregar / editar especialista</h3>' +
      (respEditing ? renderResponsableFormPanel(existing, state) : '<button class="btn secondary small" id="resp_new_btn" type="button">+ Agregar especialista manualmente</button>') +
    '</div>' +
    '<div class="panel">' +
      '<h3>Importar especialistas desde Excel <small>archivo .xlsx</small></h3>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
        '<button class="btn secondary small" id="resp_import_toggle" type="button">' + (respShowImport ? 'Ocultar importación' : 'Importar desde Excel') + '</button>' +
        '<button class="btn secondary small" id="resp_download_plantilla" type="button">⬇ Descargar plantilla Excel</button>' +
      '</div>' +
      (respShowImport ? renderResponsablesImportForm() : '') +
    '</div>';
}

function renderResponsableFormPanel(existing, state) {
  const allReds = new Set();
  (state.responsables || []).forEach(r => {
    if (!r.red) return;
    r.red.split(/[,;\/]+/).map(x => x.trim()).filter(Boolean).forEach(x => allReds.add(x));
  });
  const redOpts = Array.from(allReds).sort().map(r => '<option value="' + esc(r) + '">').join('');

  const modVal = existing ? (existing.modalidad || '') : 'EBR';

  return '' +
    '<div class="fieldGrid">' +
      '<div class="field">' +
        '<label>RED (o REDs a cargo)</label>' +
        '<input type="text" id="resp_f_red" list="dl_resp_redes" value="' + esc(existing ? existing.red : '') + '" placeholder="Ej. RED 01 o RED 01, RED 03">' +
        '<datalist id="dl_resp_redes">' + redOpts + '</datalist>' +
      '</div>' +
      '<div class="field">' +
        '<label>Distrito(s)</label>' +
        '<input type="text" id="resp_f_distrito" value="' + esc(existing ? existing.distrito : '') + '" placeholder="Ej. Cercado de Lima, Breña">' +
      '</div>' +
      '<div class="field">' +
        '<label>Especialista responsable (Área)</label>' +
        '<input type="text" id="resp_f_especialista" value="' + esc(existing ? existing.especialista : '') + '" placeholder="Ej. Especialista en Convivencia">' +
      '</div>' +
      '<div class="field">' +
        '<label>Nombres y apellidos *</label>' +
        '<input type="text" id="resp_f_nombres" value="' + esc(existing ? existing.nombresApellidos : '') + '" placeholder="Apellidos y nombres completos" required>' +
      '</div>' +
      '<div class="field">' +
        '<label>Cargo</label>' +
        '<input type="text" id="resp_f_cargo" value="' + esc(existing ? existing.cargo : '') + '" placeholder="Ej. Especialista Pedagógico">' +
      '</div>' +
      '<div class="field">' +
        '<label>Modalidad</label>' +
        '<select id="resp_f_modalidad">' +
          '<option value="EBR"' + (modVal === 'EBR' ? ' selected' : '') + '>EBR</option>' +
          '<option value="EBE"' + (modVal === 'EBE' ? ' selected' : '') + '>EBE</option>' +
          '<option value="EBR / EBE"' + (modVal === 'EBR / EBE' || (modVal.includes('EBR') && modVal.includes('EBE')) ? ' selected' : '') + '>EBR / EBE (Ambas)</option>' +
        '</select>' +
      '</div>' +
      '<div class="field">' +
        '<label>N° Celular</label>' +
        '<input type="text" id="resp_f_celular" value="' + esc(existing ? existing.celular : '') + '" placeholder="Ej. 987654321">' +
      '</div>' +
      '<div class="field">' +
        '<label>Correo Institucional</label>' +
        '<input type="email" id="resp_f_correo" value="' + esc(existing ? existing.correo : '') + '" placeholder="usuario@ugel03.gob.pe">' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:4px">' +
      '<button class="btn small" id="resp_f_save" type="button">' + (existing ? 'Actualizar especialista' : 'Guardar especialista') + '</button>' +
      '<button class="btn secondary small" id="resp_f_cancel" type="button">Cancelar</button>' +
    '</div>';
}

async function saveResponsableForm(state, dbNs, container, isAdmin, currentUser) {
  const nombres = (document.getElementById('resp_f_nombres').value || '').trim();
  const correo  = (document.getElementById('resp_f_correo').value || '').trim();
  if (!nombres) { showToast('Ingresa los Nombres y apellidos del especialista.'); return; }

  const id = (respEditing && respEditing !== 'new') ? respEditing : docIdForResponsable(correo, nombres);
  const existing = (state.responsables || []).find(x => x.id === id);

  const raw = {
    red:              (document.getElementById('resp_f_red').value || '').trim(),
    distrito:         (document.getElementById('resp_f_distrito').value || '').trim(),
    especialista:     (document.getElementById('resp_f_especialista').value || '').trim(),
    nombresApellidos: nombres,
    cargo:            (document.getElementById('resp_f_cargo').value || '').trim(),
    modalidad:        (document.getElementById('resp_f_modalidad').value || '').trim(),
    celular:          (document.getElementById('resp_f_celular').value || '').trim(),
    correo:           correo,
  };

  const data = sanitizeResponsableRecord(raw, existing, Date.now());
  try {
    await dbNs.collection('responsables').doc(id).set(data);
    showToast('Especialista guardado con éxito.');
    respEditing = null;
  } catch (err) {
    console.error('Error al guardar especialista en Firestore:', err);
    showToast('No se pudo guardar: [' + (err.code || 'error') + '] ' + err.message);
  }
  renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
}

function renderResponsablesImportForm() {
  const resultsHtml = respImportResults ? renderResponsablesImportResults(respImportResults) : '';
  const previewHtml = respImportPreview ? renderResponsablesImportPreview(respImportPreview) : '';
  return '' +
    resultsHtml +
    '<p class="helpText" style="margin-top:0">' +
      'Descarga la plantilla con el botón de arriba, complétala en Excel y súbela aquí. ' +
      'Columnas reconocidas: <strong>RED, Distrito(s), Especialista responsable, Nombres y apellidos, Cargo, Modalidad, N°Celular, Correo Institucional</strong>. ' +
      'En Modalidad puedes indicar <code>EBR</code>, <code>EBE</code> o <code>EBR / EBE</code> si tiene a cargo ambas modalidades. ' +
      'Si el especialista ya existe en el directorio, se actualizará en vez de duplicarse.' +
    '</p>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
      '<input type="file" id="resp_import_file" accept=".xlsx,.xls" style="font-size:13px">' +
    '</div>' +
    (respImportPreview && respImportPreview.rows.length
      ? '<button class="btn small" id="resp_import_confirm" type="button" style="margin-bottom:10px">✓ Confirmar importación (' + respImportPreview.rows.length + ' especialistas)</button>'
      : '') +
    previewHtml;
}

function renderResponsablesImportResults(res) {
  if (!res) return '';
  const isAllSuccess = res.failures.length === 0 && res.success > 0;
  const isPartial    = res.success > 0 && res.failures.length > 0;

  const hasPermError = res.failures.some(f =>
    f.code === 'permission-denied' ||
    (f.message && f.message.toLowerCase().includes('insufficient permissions'))
  ) || (res.mainErrorCode === 'permission-denied');

  const permAdviceHtml = hasPermError
    ? '<div style="background:rgba(239,68,68,0.08);border:1px solid var(--danger);border-radius:var(--radius);padding:12px 14px;margin:12px 0;font-size:13px;line-height:1.5">' +
        '<div style="font-weight:700;color:var(--danger);margin-bottom:6px">⚠ Diagnóstico de permisos (FirebaseError: Missing or insufficient permissions)</div>' +
        'Firestore rechazó las escrituras en la colección <code>responsables</code>. Verifica:' +
        '<ol style="margin:8px 0 0 18px;padding:0">' +
          '<li>Que la regla de seguridad para <code>responsables</code> esté publicada en Firebase Console: <code>match /responsables/{docId} { allow read: if signedIn(); allow create, update, delete: if isAdmin(); }</code>.</li>' +
          '<li>Que tu usuario tenga rol <strong>admin</strong> en la colección <code>roles</code>.</li>' +
        '</ol>' +
      '</div>'
    : '';

  const failRowsHtml = res.failures.slice(0, 50).map(f =>
    '<tr>' +
      '<td><span class="badge st-inicio">Fila ' + f.rowNum + '</span></td>' +
      '<td>' + esc(f.nombre) + '</td>' +
      '<td>' + esc(f.correo) + '</td>' +
      '<td><code style="font-size:11px">' + esc(f.code) + '</code></td>' +
      '<td style="color:var(--danger);font-size:12px">' + esc(f.message) + '</td>' +
    '</tr>'
  ).join('');

  return '' +
    '<div class="panel" style="border-left:4px solid ' + (isAllSuccess ? 'var(--primary)' : isPartial ? 'var(--accent)' : 'var(--danger)') + ';margin-top:12px;margin-bottom:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
        '<h4 style="margin:0;font-size:14.5px">' +
          (isAllSuccess ? '✓ Importación de especialistas completada con éxito' : isPartial ? '⚠ Importación parcial con errores' : '✕ Error al importar especialistas') +
        '</h4>' +
        '<button class="btn secondary small" id="resp_import_clear_results" type="button">✕ Cerrar reporte</button>' +
      '</div>' +
      '<p style="font-size:13px;margin:8px 0">' +
        '<strong>Total de registros procesados:</strong> ' + res.total + ' · ' +
        '<span style="color:var(--primary);font-weight:600">✓ Exitosos: ' + res.success + '</span> · ' +
        '<span style="color:' + (res.failures.length ? 'var(--danger)' : 'var(--ink-soft)') + ';font-weight:600">✕ Fallidos: ' + res.failures.length + '</span>' +
      '</p>' +
      permAdviceHtml +
      (res.failures.length
        ? '<div style="margin-top:10px">' +
            '<div style="font-weight:600;font-size:13px;margin-bottom:6px">Detalle de filas que no se pudieron guardar (' + res.failures.length + '):</div>' +
            '<div class="tblWrap" style="max-height:240px;overflow-y:auto"><table><thead><tr><th>Fila Excel</th><th>Nombres y apellidos</th><th>Correo</th><th>Código Firestore</th><th>Detalle del error</th></tr></thead><tbody>' + failRowsHtml + '</tbody></table></div>' +
            (res.failures.length > 50 ? '<p class="helpText" style="margin-top:4px">Mostrando las primeras 50 fallas de ' + res.failures.length + '.</p>' : '') +
          '</div>'
        : '') +
    '</div>';
}

function renderResponsablesImportPreview(preview) {
  const errHtml = preview.errors.length
    ? '<p class="helpText" style="color:var(--danger)">' + preview.errors.slice(0, 10).join('<br>') + (preview.errors.length > 10 ? '<br>… y ' + (preview.errors.length - 10) + ' más.' : '') + '</p>'
    : '';
  if (!preview.rows.length) return errHtml + '<p class="helpText">No hay filas válidas para importar.</p>';
  const rowsHtml = preview.rows.slice(0, 50).map(r =>
    '<tr>' +
      '<td>' + esc(r.red) + '</td>' +
      '<td>' + esc(r.distrito) + '</td>' +
      '<td>' + esc(r.especialista) + '</td>' +
      '<td>' + esc(r.nombresApellidos) + '</td>' +
      '<td>' + esc(r.cargo) + '</td>' +
      '<td>' + modalidadBadge(r.modalidad) + '</td>' +
      '<td>' + esc(r.celular) + '</td>' +
      '<td>' + esc(r.correo) + '</td>' +
    '</tr>'
  ).join('');

  return '' +
    '<p class="helpText"><strong>' + preview.rows.length + '</strong> especialista(s) listo(s) para importar' + (preview.errors.length ? ', ' + preview.errors.length + ' fila(s) con advertencia' : '') + '.</p>' +
    errHtml +
    '<div class="tblWrap"><table><thead><tr><th>RED</th><th>Distrito(s)</th><th>Especialista</th><th>Nombres y apellidos</th><th>Cargo</th><th>Modalidad</th><th>Celular</th><th>Correo</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
    (preview.rows.length > 50 ? '<p class="helpText">Mostrando las primeras 50 filas de ' + preview.rows.length + '.</p>' : '');
}

async function commitResponsablesImport(state, dbNs, container, isAdmin, currentUser) {
  if (!respImportPreview || !respImportPreview.rows.length) return;
  const rows = respImportPreview.rows;
  const now  = Date.now();

  if (!currentUser) {
    showToast('Sesión no encontrada. Inicia sesión como Administrador.');
    return;
  }

  respImportResults = {
    total: rows.length,
    success: 0,
    failures: [],
    mainErrorCode: null,
  };

  const confirmBtn = document.getElementById('resp_import_confirm');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Iniciando importación (' + rows.length + ')...';
  }

  const CHUNK_SIZE = 30;

  try {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const currentCount = Math.min(i + chunk.length, rows.length);
      if (confirmBtn) confirmBtn.textContent = 'Importando ' + currentCount + ' de ' + rows.length + '...';

      await Promise.all(chunk.map(async (r, cIdx) => {
        const globalIdx = i + cIdx;
        const rowNum = r._rowNum || (globalIdx + 2);
        try {
          const id = docIdForResponsable(r.correo, r.nombresApellidos);
          const existing = (state.responsables || []).find(c => c.id === id);
          const docData = sanitizeResponsableRecord(r, existing, now);
          await dbNs.collection('responsables').doc(id).set(docData);
          respImportResults.success++;
        } catch (err) {
          console.error(`[Fila ${rowNum}] Error Firestore (responsables) al guardar "${r.nombresApellidos}":`, err);
          if (!respImportResults.mainErrorCode && err.code) {
            respImportResults.mainErrorCode = err.code;
          }
          respImportResults.failures.push({
            rowNum: rowNum,
            nombre: r.nombresApellidos || '—',
            correo: r.correo || '—',
            code: err.code || 'error',
            message: err.message || String(err),
          });
        }
      }));
    }

    if (respImportResults.failures.length === 0) {
      showToast('✓ Padrón de especialistas importado: ' + respImportResults.success + ' registrados.');
      respImportPreview = null;
      respShowImport = false;
    } else if (respImportResults.success > 0) {
      showToast('⚠ Importación parcial: ' + respImportResults.success + ' guardados, ' + respImportResults.failures.length + ' con error.');
    } else {
      const sampleErr = respImportResults.failures[0] || {};
      showToast('✕ Error en importación [' + (sampleErr.code || 'error') + ']: ' + (sampleErr.message || 'Operación denegada'));
    }
  } catch (fatalErr) {
    console.error('Error fatal durante la importación de responsables:', fatalErr);
    showToast('✕ Error crítico: [' + (fatalErr.code || 'error') + '] ' + fatalErr.message);
  }

  renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
}

/* ============================= CONCURSOS TAB ============================= */
export const SEED_CONCURSOS_DEFAULTS = [
  {
    id: 'jma',
    nombre: 'Premio Nacional de Narrativa y Ensayo José María Arguedas',
    tipoParticipacion: 'individual',
    tieneGenero: false,
    tieneDisciplina: false,
    tieneTituloTrabajo: true,
    etiquetaTitulo: 'Título del trabajo',
    categorias: ['A - Fábula', 'B - Cuento (EBA)', 'C - Ensayo (EBR)', 'D - Ensayo (EBA)'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: [],
  },
  {
    id: 'onem',
    nombre: 'Olimpiada Nacional Escolar de Matemática (ONEM)',
    tipoParticipacion: 'individual',
    tieneGenero: false,
    tieneDisciplina: false,
    tieneTituloTrabajo: false,
    categorias: [
      'Alfa - Nivel 1',
      'Alfa - Nivel 2',
      'Alfa - Nivel 3',
      'Beta - Nivel 1',
      'Beta - Nivel 2',
      'Beta - Nivel 3'
    ],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: [],
  },
  {
    id: 'peru_lee',
    nombre: 'Concurso Nacional de Comprensión Lectora El Perú Lee',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Área / Modalidad',
    tieneTituloTrabajo: false,
    categorias: ['A', 'B', 'C', 'D', 'E'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: ['Comprensión Lectora', 'Lectura Crítica', 'Creación Literaria'],
  },
  {
    id: 'eureka',
    nombre: 'Feria Escolar Nacional de Ciencia y Tecnología Eureka',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Área de participación',
    tieneTituloTrabajo: true,
    etiquetaTitulo: 'Título del proyecto',
    categorias: ['D', 'E'],
    disciplinasSugeridas: ['Indagación Científica', 'Soluciones Tecnológicas', 'Indagación Social'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor(a)'],
  },
  {
    id: 'jfen',
    nombre: 'Juegos Florales Escolares Nacionales (JFEN)',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Arte / Disciplina',
    tieneTituloTrabajo: false,
    categorias: ['D', 'E', 'F', 'H'],
    disciplinasSugeridas: [
      'Artes escénicas / Danza tradicional',
      'Artes escénicas / Danza moderna',
      'Artes escénicas / Teatro',
      'Artes musicales / Canto solista',
      'Artes musicales / Ensamble instrumental',
      'Artes visuales / Pintura',
      'Artes visuales / Fotografía',
      'Artes visuales / Escultura',
      'Artes literarias / Poesía',
      'Artes digitales / Cortometraje'
    ],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
  },
  {
    id: 'jedpa',
    nombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    tipoParticipacion: 'individual',
    tieneGenero: true,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Disciplina deportiva',
    tieneTituloTrabajo: false,
    categorias: ['A', 'B', 'C'],
    disciplinasSugeridas: [
      'Ajedrez',
      'Atletismo',
      'Natación',
      'Gimnasia',
      'Tenis de Mesa',
      'Judo',
      'Karate',
      'Taekwondo',
      'Bádminton',
      'Paraatletismo',
      'Paranatación'
    ],
    rolesParticipante: ['Deportista'],
    rolesAsesor: ['Entrenador', 'Delegado'],
  }
];

let concursoSubTab = 'registrar'; // 'registrar' | 'consolidado' | 'tipos'
let concursoSelectedTipoId = null;
let concursoEditingId = null;
let concursoEditingData = null;
let concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: '' }];
let concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: '' }];
let concursoSelectedColegioId = null;

// Filtros para Consolidado
let concursoFilters = {
  tipoId: '',
  etapa: '',
  categoria: '',
  genero: '',
  disciplina: '',
  query: ''
};
let concursoExpandedId = null;

export function renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate) {
  // Asegurar que state.tiposConcurso y state.concursoRegistros existan
  state.tiposConcurso = state.tiposConcurso || [];
  state.concursoRegistros = state.concursoRegistros || [];

  // Si no hay tipos seleccionados y hay tipos disponibles, preseleccionar el primero
  if (!concursoSelectedTipoId && state.tiposConcurso.length > 0) {
    concursoSelectedTipoId = state.tiposConcurso[0].id;
  }

  // Definir sub-pestañas disponibles
  const subTabs = [
    { id: 'registrar', label: '➕ Registrar participante' },
    { id: 'consolidado', label: '📊 Ver consolidado' },
  ];
  if (isAdmin) {
    subTabs.push({ id: 'tipos', label: '⚙ Tipos de concurso' });
  }

  // Si un no-admin quedó en subpestaña 'tipos', redirigir a 'registrar'
  if (!isAdmin && concursoSubTab === 'tipos') {
    concursoSubTab = 'registrar';
  }

  const subTabButtonsHtml = subTabs.map(t =>
    '<button type="button" class="subTabBtn' + (concursoSubTab === t.id ? ' active' : '') + '" data-csubtab="' + t.id + '">' + t.label + '</button>'
  ).join('');

  container.innerHTML = '' +
    '<div class="pageHead">' +
      '<h2>Concursos Escolares</h2>' +
      '<p>Registro, premiación y consolidado de participantes de concursos oficiales (JMA, ONEM, Eureka, JFEN, JEDPA y más).</p>' +
    '</div>' +
    '<div class="subTabBar">' + subTabButtonsHtml + '</div>' +
    '<div id="concursoSubHost"></div>';

  container.querySelectorAll('[data-csubtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      concursoSubTab = btn.dataset.csubtab;
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  });

  const host = document.getElementById('concursoSubHost');
  if (!host) return;

  if (concursoSubTab === 'registrar') {
    renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'consolidado') {
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'tipos' && isAdmin) {
    renderConcursoTiposCatalogView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  }
}

function normalizePuestoValue(val) {
  if (!val) return '';
  const s = String(val).trim().toLowerCase();
  if (s.includes('1') || s.startsWith('primer')) return '1.er puesto';
  if (s.includes('2') || s.startsWith('segundo')) return '2.° puesto';
  if (s.includes('3') || s.startsWith('tercer')) return '3.er puesto';
  if (s.includes('menci') || s.includes('honrosa') || s.includes('mh')) return 'Mención honrosa';
  if (s.includes('final')) return 'Finalista';
  if (s.includes('clasif')) return 'Clasificado';
  if (s.includes('partic')) return 'Participante';
  return String(val).trim();
}

function formatPuestoBadge(puesto) {
  if (!puesto) return '<span class="badge badge-puesto">—</span>';
  const norm = normalizePuestoValue(puesto);
  if (norm === '1.er puesto') {
    return '<span class="badge badge-puesto puesto-1">🥇 1.er puesto</span>';
  }
  if (norm === '2.° puesto') {
    return '<span class="badge badge-puesto puesto-2">🥈 2.° puesto</span>';
  }
  if (norm === '3.er puesto') {
    return '<span class="badge badge-puesto puesto-3">🥉 3.er puesto</span>';
  }
  if (norm === 'Mención honrosa') {
    return '<span class="badge badge-puesto puesto-mh">🎖️ Mención honrosa</span>';
  }
  return '<span class="badge badge-puesto puesto-part">' + esc(puesto) + '</span>';
}

/* -------------------------------------------------------------
   SUB-PESTAÑA 1: REGISTRAR PARTICIPANTE / PROYECTO
   ------------------------------------------------------------- */
function renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  // Si no hay tipos de concurso en el catálogo
  if (state.tiposConcurso.length === 0) {
    host.innerHTML = '<div class="empty">' +
      '<h4>Aún no hay tipos de concurso configurados</h4>' +
      '<p>Para comenzar a registrar ganadores y participantes, se debe cargar el catálogo de concursos oficiales.</p>' +
      (isAdmin
        ? '<button type="button" class="btn" id="btnSeedConcursosEmpty" style="margin-top:12px">🌱 Sembrar 6 concursos oficiales (UGEL 03 - 2026)</button>'
        : '<p class="helpText">Solicita a un administrador que active los concursos escolares.</p>') +
      '</div>';

    const seedBtn = document.getElementById('btnSeedConcursosEmpty');
    if (seedBtn) {
      seedBtn.addEventListener('click', async () => {
        seedBtn.disabled = true;
        seedBtn.textContent = 'Sembrando concursos...';
        await ejecutarSiembraConcursos(dbNs, state);
        renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
      });
    }
    return;
  }

  // Preseleccionar tipo si no está establecido
  if (!concursoSelectedTipoId && state.tiposConcurso.length > 0) {
    concursoSelectedTipoId = state.tiposConcurso[0].id;
  }

  const tipo = state.tiposConcurso.find(t => t.id === concursoSelectedTipoId) || state.tiposConcurso[0];
  if (!tipo) return;

  const tipoOpts = state.tiposConcurso.map(t =>
    '<option value="' + t.id + '"' + (t.id === tipo.id ? ' selected' : '') + '>' + esc(t.nombre) + ' (' + (t.tipoParticipacion === 'individual' ? 'Individual' : 'Grupal') + ')</option>'
  ).join('');

  const catOpts = (tipo.categorias || []).map(c =>
    '<option value="' + esc(c) + '">' + esc(c) + '</option>'
  ).join('');

  // Sugerencias de disciplinas si el tipo las tiene o es El Perú Lee
  let discSuggestions = tipo.disciplinasSugeridas || [];
  if (tipo.id === 'peru_lee' && (!discSuggestions || discSuggestions.length === 0)) {
    discSuggestions = ['Comprensión Lectora', 'Lectura Crítica', 'Creación Literaria'];
  }
  const discDatalistHtml = (discSuggestions && discSuggestions.length)
    ? '<datalist id="dl_concurso_disc">' + discSuggestions.map(d => '<option value="' + esc(d) + '">').join('') + '</datalist>'
    : '';

  // Determinar roles para participantes y asesores
  const partRoles = (tipo.rolesParticipante && tipo.rolesParticipante.length) ? tipo.rolesParticipante : ['Estudiante'];
  const asesRoles = (tipo.rolesAsesor && tipo.rolesAsesor.length) ? tipo.rolesAsesor : ['Docente Asesor'];

  // Asegurar que las listas tengan al menos 1 elemento
  if (!concursoParticipantes || concursoParticipantes.length === 0) {
    concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: partRoles[0] }];
  }
  if (!concursoAsesores || concursoAsesores.length === 0) {
    concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] }];
  }

  const isEditing = !!concursoEditingId;
  const submitLabel = isEditing ? 'Actualizar registro' : 'Guardar registro';

  const hasDisciplina = tipo.tieneDisciplina || tipo.id === 'peru_lee';
  const discLabel = tipo.etiquetaDisciplina || (tipo.id === 'peru_lee' ? 'Área / Modalidad' : 'Disciplina / Área');

  host.innerHTML = '' +
    '<form id="concursoRegForm">' +
      '<div class="panel">' +
        '<h3>Concurso y Etapa</h3>' +
        '<div class="fieldGrid">' +
          '<div class="field" style="grid-column:span 2">' +
            '<label for="c_tipoSelect">Tipo de concurso *</label>' +
            '<select id="c_tipoSelect">' + tipoOpts + '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="c_etapa">Etapa *</label>' +
            '<select id="c_etapa" required>' +
              ['UGEL', 'DRELM', 'MACROREGIONAL', 'NACIONAL'].map(e => '<option value="' + e + '">' + e + '</option>').join('') +
            '</select>' +
          '</div>' +
          '<div class="field">' +
            '<label for="c_puesto">Puesto obtenido *</label>' +
            '<select id="c_puesto" required>' +
              '<option value="">-- Seleccionar puesto --</option>' +
              '<option value="1.er puesto">🥇 1.er puesto</option>' +
              '<option value="2.° puesto">🥈 2.° puesto</option>' +
              '<option value="3.er puesto">🥉 3.er puesto</option>' +
              '<option value="Mención honrosa">🎖️ Mención honrosa</option>' +
              '<option value="Finalista">⭐ Finalista</option>' +
              '<option value="Clasificado">✓ Clasificado</option>' +
              '<option value="Participante">👤 Participante</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="panel">' +
        '<h3>Datos de la Participación</h3>' +
        '<div class="fieldGrid">' +
          '<div class="field">' +
            '<label for="c_categoria">Categoría *</label>' +
            '<select id="c_categoria" required>' + catOpts + '</select>' +
          '</div>' +
          (tipo.tieneGenero ? (
            '<div class="field">' +
              '<label for="c_genero">Género *</label>' +
              '<select id="c_genero" required>' +
                '<option value="Damas">Damas</option>' +
                '<option value="Varones">Varones</option>' +
              '</select>' +
            '</div>'
          ) : '') +
          (hasDisciplina ? (
            '<div class="field" style="' + (tipo.tieneGenero ? '' : 'grid-column:span 2') + '">' +
              '<label for="c_disciplina">' + esc(discLabel) + ' *</label>' +
              '<input type="text" id="c_disciplina" list="dl_concurso_disc" placeholder="Ej: Comprensión Lectora, Danza tradicional, Indagación..." required>' +
              discDatalistHtml +
            '</div>'
          ) : (
            '<div class="field" style="' + (tipo.tieneGenero ? '' : 'grid-column:span 2') + '">' +
              '<label for="c_disciplina">Área / Disciplina (opcional)</label>' +
              '<input type="text" id="c_disciplina" placeholder="Opcional: área o especialidad...">' +
            '</div>'
          )) +
        '</div>' +

        '<div class="fieldGrid" style="margin-top:10px">' +
          '<div class="field" style="grid-column:span 2">' +
            '<label for="c_institucion">Institución Educativa *</label>' +
            '<div class="ieSearchWrap" id="c_ieSearchWrap">' +
              '<input type="text" id="c_institucion" autocomplete="off" placeholder="Buscar colegio por nombre o código modular..." required>' +
              '<div class="ieDropdown" id="c_ieDropdown"></div>' +
            '</div>' +
            '<span id="c_colegioHint" style="display:none;font-size:11.5px;color:var(--primary);margin-top:4px;font-weight:600"></span>' +
          '</div>' +
          '<div class="field">' +
            '<label for="c_codigoModular">Código modular / local</label>' +
            '<input type="text" id="c_codigoModular" placeholder="Autocompletado con la I.E.">' +
          '</div>' +
          '<div class="field">' +
            '<label for="c_fecha">Fecha *</label>' +
            '<input type="date" id="c_fecha" value="' + todayStr() + '" required>' +
          '</div>' +
        '</div>' +

        (tipo.tieneTituloTrabajo ? (
          '<div class="fieldGrid" style="margin-top:10px">' +
            '<div class="field" style="grid-column:span 2">' +
              '<label for="c_tituloTrabajo">' + esc(tipo.etiquetaTitulo || 'Título del trabajo / proyecto') + ' *</label>' +
              '<input type="text" id="c_tituloTrabajo" placeholder="Nombre de la obra, proyecto de indagación o ensayo..." required>' +
            '</div>' +
            '<div class="field">' +
              '<label for="c_seudonimo">Seudónimo (opcional)</label>' +
              '<input type="text" id="c_seudonimo" placeholder="Seudónimo del participante...">' +
            '</div>' +
          '</div>'
        ) : '') +

        '<div class="fieldGrid" style="margin-top:10px">' +
          '<div class="field">' +
            '<label for="c_resolucionRef">N° Resolución / Acreditación (opcional)</label>' +
            '<input type="text" id="c_resolucionRef" placeholder="Ej: R.D. N° 00342-2026-UGEL03">' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<!-- PARTICIPANTES REPETIBLES -->' +
      '<div class="panel">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
          '<h3 style="margin-bottom:0">Estudiantes / Participantes <small>(' + (tipo.tipoParticipacion === 'individual' ? 'Normalmente 1 fila para individual' : 'Permite múltiples filas para grupales') + ')</small></h3>' +
          '<button type="button" class="btn secondary small" id="c_addPartBtn">＋ Agregar participante</button>' +
        '</div>' +
        '<div id="c_participantesList"></div>' +
      '</div>' +

      '<!-- ASESORES REPETIBLES -->' +
      '<div class="panel">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
          '<h3 style="margin-bottom:0">Docentes Asesores / Entrenadores</h3>' +
          '<button type="button" class="btn secondary small" id="c_addAsesBtn">＋ Agregar asesor</button>' +
        '</div>' +
        '<div id="c_asesoresList"></div>' +
      '</div>' +

      '<div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap">' +
        '<button type="submit" class="btn" id="c_submitBtn">' + submitLabel + '</button>' +
        (isEditing ? '<button type="button" class="btn secondary" id="c_cancelEditBtn">Cancelar edición</button>' : '') +
      '</div>' +
    '</form>';

  // ---- Cambio de tipo de concurso en el formulario ----
  document.getElementById('c_tipoSelect').addEventListener('change', (e) => {
    concursoSelectedTipoId = e.target.value;
    // Adaptar roles de participantes y asesores a las opciones del nuevo tipo
    const newTipo = state.tiposConcurso.find(t => t.id === concursoSelectedTipoId);
    if (newTipo) {
      const pR = (newTipo.rolesParticipante && newTipo.rolesParticipante.length) ? newTipo.rolesParticipante[0] : 'Estudiante';
      const aR = (newTipo.rolesAsesor && newTipo.rolesAsesor.length) ? newTipo.rolesAsesor[0] : 'Docente Asesor';
      concursoParticipantes.forEach(p => p.rol = pR);
      concursoAsesores.forEach(a => a.rol = aR);
    }
    renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  // ---- Renderizador de filas de Participantes ----
  function renderPartRows() {
    const listEl = document.getElementById('c_participantesList');
    if (!listEl) return;
    listEl.innerHTML = concursoParticipantes.map((p, idx) => {
      const rolOpts = partRoles.map(r =>
        '<option value="' + esc(r) + '"' + (r === p.rol ? ' selected' : '') + '>' + esc(r) + '</option>'
      ).join('');
      return '<div class="personRow" data-pidx="' + idx + '">' +
        '<div><label style="margin-bottom:2px;font-size:11px">Nombres y Apellidos *</label><input type="text" placeholder="Nombres o nombre completo" value="' + esc(p.nombres) + '" data-pfield="nombres" required></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Apellidos (opcional)</label><input type="text" placeholder="Apellidos" value="' + esc(p.apellidos) + '" data-pfield="apellidos"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">DNI / Documento</label><input type="text" placeholder="DNI" value="' + esc(p.dni) + '" data-pfield="dni" maxlength="15"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Rol</label><select data-pfield="rol">' + rolOpts + '</select></div>' +
        '<div style="padding-top:16px"><button type="button" class="iconBtn" data-delpart="' + idx + '" title="Quitar participante"' + (concursoParticipantes.length === 1 ? ' disabled' : '') + '>✕</button></div>' +
      '</div>';
    }).join('');

    listEl.querySelectorAll('input[data-pfield], select[data-pfield]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const row = e.target.closest('[data-pidx]');
        if (!row) return;
        const i = Number(row.dataset.pidx);
        concursoParticipantes[i][e.target.dataset.pfield] = e.target.value;
      });
    });

    listEl.querySelectorAll('[data-delpart]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (concursoParticipantes.length <= 1) return;
        const idx = Number(btn.dataset.delpart);
        concursoParticipantes.splice(idx, 1);
        renderPartRows();
      });
    });
  }

  // ---- Renderizador de filas de Asesores ----
  function renderAsesRows() {
    const listEl = document.getElementById('c_asesoresList');
    if (!listEl) return;
    listEl.innerHTML = concursoAsesores.map((a, idx) => {
      const rolOpts = asesRoles.map(r =>
        '<option value="' + esc(r) + '"' + (r === a.rol ? ' selected' : '') + '>' + esc(r) + '</option>'
      ).join('');
      return '<div class="personRow" data-aidx="' + idx + '">' +
        '<div><label style="margin-bottom:2px;font-size:11px">Nombres y Apellidos *</label><input type="text" placeholder="Nombres o nombre completo" value="' + esc(a.nombres) + '" data-afield="nombres" required></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Apellidos (opcional)</label><input type="text" placeholder="Apellidos" value="' + esc(a.apellidos) + '" data-afield="apellidos"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">DNI / Documento</label><input type="text" placeholder="DNI" value="' + esc(a.dni) + '" data-afield="dni" maxlength="15"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Rol</label><select data-afield="rol">' + rolOpts + '</select></div>' +
        '<div style="padding-top:16px"><button type="button" class="iconBtn" data-delases="' + idx + '" title="Quitar asesor">✕</button></div>' +
      '</div>';
    }).join('');

    listEl.querySelectorAll('input[data-afield], select[data-afield]').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const row = e.target.closest('[data-aidx]');
        if (!row) return;
        const i = Number(row.dataset.aidx);
        concursoAsesores[i][e.target.dataset.afield] = e.target.value;
      });
    });

    listEl.querySelectorAll('[data-delases]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.delases);
        concursoAsesores.splice(idx, 1);
        renderAsesRows();
      });
    });
  }

  document.getElementById('c_addPartBtn').addEventListener('click', () => {
    concursoParticipantes.push({ nombres: '', apellidos: '', dni: '', rol: partRoles[0] });
    renderPartRows();
  });

  document.getElementById('c_addAsesBtn').addEventListener('click', () => {
    concursoAsesores.push({ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] });
    renderAsesRows();
  });

  renderPartRows();
  renderAsesRows();

  // ---- Autocompletado de Colegio / I.E. ----
  const instInput = document.getElementById('c_institucion');
  const dropdown  = document.getElementById('c_ieDropdown');
  const hint      = document.getElementById('c_colegioHint');
  const codModInp = document.getElementById('c_codigoModular');

  const showDropdown = () => {
    const query = normalizeText(instInput.value);
    const matches = (state.colegios || [])
      .filter(c => !query || normalizeText(c.ie).includes(query) || normalizeText(c.codigoLocal).includes(query))
      .slice(0, 25);
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = matches.map(c =>
      '<div class="ieDropdownItem" data-id="' + c.id + '">' +
        '<div class="ieDropMain">' + esc(c.ie) + '</div>' +
        '<div class="ieDropSub">' + esc(c.codigoLocal || '') +
          (c.rei ? ' · ' + esc(c.rei) : '') +
          (c.distrito ? ' · ' + esc(c.distrito) : '') +
        '</div>' +
      '</div>'
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const c = state.colegios.find(x => x.id === item.dataset.id);
        if (c) {
          instInput.value = c.ie || '';
          concursoSelectedColegioId = c.id;
          if (codModInp) codModInp.value = c.codigoLocal || '';
          if (hint) {
            hint.style.display = 'block';
            hint.textContent = '✓ Vinculada al padrón: ' + (c.rei || '') + (c.distrito ? ' · ' + c.distrito : '');
          }
        }
        dropdown.style.display = 'none';
      });
    });
  };

  instInput.addEventListener('input', showDropdown);
  instInput.addEventListener('focus', () => { if (instInput.value.length === 0) showDropdown(); });
  instInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });

  // ---- Precargar datos si estamos en modo edición ----
  if (concursoEditingId && concursoEditingData) {
    const d = concursoEditingData;
    const normPuesto = normalizePuestoValue(d.puesto);
    const puestoSelect = document.getElementById('c_puesto');
    if (puestoSelect) {
      let exists = Array.from(puestoSelect.options).some(o => o.value === normPuesto);
      if (!exists && normPuesto) {
        const opt = document.createElement('option');
        opt.value = normPuesto;
        opt.textContent = normPuesto;
        puestoSelect.appendChild(opt);
      }
      puestoSelect.value = normPuesto || '';
    }
    document.getElementById('c_etapa').value  = d.etapa || 'UGEL';
    document.getElementById('c_fecha').value  = d.fecha || todayStr();
    document.getElementById('c_institucion').value = d.institucion || '';
    if (codModInp) codModInp.value = d.codigoModular || '';
    if (document.getElementById('c_categoria')) document.getElementById('c_categoria').value = d.categoria || '';
    if (document.getElementById('c_genero')) document.getElementById('c_genero').value = d.genero || 'Damas';
    if (document.getElementById('c_disciplina')) document.getElementById('c_disciplina').value = d.disciplina || '';
    if (document.getElementById('c_tituloTrabajo')) document.getElementById('c_tituloTrabajo').value = d.tituloTrabajo || '';
    if (document.getElementById('c_seudonimo')) document.getElementById('c_seudonimo').value = d.seudonimo || '';
    if (document.getElementById('c_resolucionRef')) document.getElementById('c_resolucionRef').value = d.resolucionRef || '';

    const cancelBtn = document.getElementById('c_cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        concursoEditingId = null;
        concursoEditingData = null;
        concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: partRoles[0] }];
        concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] }];
        renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }
  }

  // ---- Submit Formulario de Registro de Concurso ----
  document.getElementById('concursoRegForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('c_submitBtn');
    btn.disabled = true;
    btn.textContent = isEditing ? 'Actualizando...' : 'Guardando...';

    try {
      const pRows = concursoParticipantes.filter(p => (p.nombres || '').trim() || (p.apellidos || '').trim());
      if (pRows.length === 0) {
        showToast('Agrega al menos un participante con nombres.');
        btn.disabled = false;
        btn.textContent = submitLabel;
        return;
      }

      const puestoVal = normalizePuestoValue(document.getElementById('c_puesto').value.trim());
      if (!puestoVal) {
        showToast('Selecciona el puesto obtenido.');
        btn.disabled = false;
        btn.textContent = submitLabel;
        return;
      }

      const aRows = concursoAsesores.filter(a => (a.nombres || '').trim() || (a.apellidos || '').trim());
      const discInp = document.getElementById('c_disciplina');
      const discVal = discInp ? discInp.value.trim() : null;

      const regData = {
        tipoConcursoId:     tipo.id,
        tipoConcursoNombre: tipo.nombre,
        etapa:              document.getElementById('c_etapa').value,
        categoria:          document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '',
        genero:             tipo.tieneGenero ? (document.getElementById('c_genero') ? document.getElementById('c_genero').value : null) : null,
        disciplina:         discVal || null,
        institucion:        document.getElementById('c_institucion').value.trim(),
        codigoModular:      codModInp ? codModInp.value.trim() : '',
        tituloTrabajo:      tipo.tieneTituloTrabajo ? (document.getElementById('c_tituloTrabajo') ? document.getElementById('c_tituloTrabajo').value.trim() : null) : null,
        seudonimo:          tipo.tieneTituloTrabajo ? (document.getElementById('c_seudonimo') ? document.getElementById('c_seudonimo').value.trim() : null) : null,
        puesto:             puestoVal,
        participantes:      pRows,
        asesores:           aRows,
        resolucionRef:      document.getElementById('c_resolucionRef') ? document.getElementById('c_resolucionRef').value.trim() : null,
        fecha:              document.getElementById('c_fecha').value,
        responsable:        currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista',
        createdAt:          isEditing ? (concursoEditingData.createdAt || Date.now()) : Date.now(),
        updatedAt:          Date.now(),
      };

      // Validar puesto duplicado (1.er puesto, 2.° puesto, 3.er puesto deben ser únicos por Concurso + Etapa + Categoría + Disciplina)
      const isTopPuesto = ['1.er puesto', '2.° puesto', '3.er puesto'].includes(puestoVal);
      const existingRegs = state.concursoRegistros || [];
      if (isTopPuesto) {
        const conflict = existingRegs.find(r => {
          if (isEditing && r.id === concursoEditingId) return false;
          const sameTipo = (r.tipoConcursoId === tipo.id || r.tipoConcursoNombre === tipo.nombre);
          const sameEtapa = (r.etapa || '').toUpperCase() === (regData.etapa || '').toUpperCase();
          const sameCat = normalizeText(r.categoria) === normalizeText(regData.categoria);
          const sameDisc = normalizeText(r.disciplina) === normalizeText(regData.disciplina);
          const samePuesto = normalizePuestoValue(r.puesto) === puestoVal;
          return sameTipo && sameEtapa && sameCat && sameDisc && samePuesto;
        });
        if (conflict) {
          showToast(`Ya existe un registro con el ${puestoVal} para la categoría "${regData.categoria}"${regData.disciplina ? ' y área "' + regData.disciplina + '"' : ''} (I.E. ${conflict.institucion}). No puede haber dos mismos puestos en la misma categoría.`);
          btn.disabled = false;
          btn.textContent = submitLabel;
          return;
        }
      }

      // Validar duplicado exacto
      const exactDuplicate = existingRegs.find(r => {
        if (isEditing && r.id === concursoEditingId) return false;
        const sameTipo = (r.tipoConcursoId === tipo.id || r.tipoConcursoNombre === tipo.nombre);
        const sameInst = normalizeText(r.institucion) === normalizeText(regData.institucion);
        const sameCat = normalizeText(r.categoria) === normalizeText(regData.categoria);
        const sameDisc = normalizeText(r.disciplina) === normalizeText(regData.disciplina);
        const pDnis = pRows.map(p => (p.dni || '').trim()).filter(Boolean);
        const rDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
        const sharesDni = pDnis.length > 0 && pDnis.some(d => rDnis.includes(d));
        return sameTipo && sameInst && sameCat && (sharesDni || (sameDisc && normalizePuestoValue(r.puesto) === puestoVal));
      });
      if (exactDuplicate) {
        if (!confirm('Advertencia: Parece haber un registro idéntico o con los mismos participantes para esta I.E. en el sistema. ¿Deseas guardarlo de todas formas?')) {
          btn.disabled = false;
          btn.textContent = submitLabel;
          return;
        }
      }

      if (isEditing) {
        await dbNs.collection('concursoRegistros').doc(concursoEditingId).set(regData);
        showToast('✓ Registro de concurso actualizado exitosamente.');
        concursoEditingId = null;
        concursoEditingData = null;
      } else {
        await dbNs.collection('concursoRegistros').add(regData);
        showToast('✓ Registro de concurso guardado exitosamente.');
      }

      // Reiniciar participantes y asesores a 1 fila limpia
      concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: partRoles[0] }];
      concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] }];
      concursoSubTab = 'consolidado';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    } catch (err) {
      console.error('Error guardando registro de concurso:', err);
      showToast('Error al guardar: [' + (err.code || 'error') + '] ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = submitLabel;
      }
    }
  });
}

/* -------------------------------------------------------------
   SUB-PESTAÑA 2: VER CONSOLIDADO (REPORTES / RESULTADOS)
   SISTEMA DE FILTROS EN CASCADA PARA JEDPA:
   Etapa -> Disciplina -> Categoría -> Género -> Buscar
   ------------------------------------------------------------- */

function normalizeFilterValue(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula las opciones facetadas en memoria agrupando variantes equivalentes (mayúsculas, tildes, espacios)
 * y conservando la forma más frecuente como etiqueta visual.
 */
function getFacetOptions(rows, field, allLabel = 'Todas', emptyLabel = null) {
  const map = new Map();
  let emptyCount = 0;

  rows.forEach(r => {
    const raw = r[field];
    if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '—') {
      emptyCount++;
      return;
    }
    const str = String(raw).trim();
    const norm = normalizeFilterValue(str);
    if (!map.has(norm)) {
      map.set(norm, { label: str, count: 1, rawCounts: new Map([[str, 1]]) });
    } else {
      const entry = map.get(norm);
      entry.count++;
      entry.rawCounts.set(str, (entry.rawCounts.get(str) || 0) + 1);
      let maxCount = 0;
      for (const [rStr, rCount] of entry.rawCounts) {
        if (rCount > maxCount) {
          maxCount = rCount;
          entry.label = rStr;
        }
      }
    }
  });

  const options = [];
  options.push({ value: '', label: `${allLabel} (${rows.length})`, rawLabel: allLabel, count: rows.length, isAll: true });

  const items = Array.from(map.entries()).map(([norm, data]) => ({
    value: norm,
    label: `${data.label} (${data.count})`,
    rawLabel: data.label,
    count: data.count
  }));

  if (field === 'etapa') {
    const order = ['ugel', 'drelm', 'dre', 'macroregional', 'nacional'];
    items.sort((a, b) => {
      const idxA = order.indexOf(a.value);
      const idxB = order.indexOf(b.value);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.rawLabel.localeCompare(b.rawLabel);
    });
  } else if (field === 'categoria') {
    items.sort((a, b) => a.rawLabel.localeCompare(b.rawLabel, undefined, { numeric: true }));
  } else if (field === 'genero') {
    const order = ['damas', 'varones', 'mixto'];
    items.sort((a, b) => {
      const idxA = order.indexOf(a.value);
      const idxB = order.indexOf(b.value);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.rawLabel.localeCompare(b.rawLabel);
    });
  } else {
    items.sort((a, b) => a.rawLabel.localeCompare(b.rawLabel));
  }

  options.push(...items);

  if (emptyCount > 0 && emptyLabel) {
    options.push({
      value: '__empty__',
      label: `${emptyLabel} (${emptyCount})`,
      rawLabel: emptyLabel,
      count: emptyCount,
      isEmpty: true
    });
  }

  return options;
}

function syncConcursoFiltersToUrl(filters, isJedpa) {
  try {
    const url = new URL(window.location.href);
    if (filters.tipoId) url.searchParams.set('concurso', filters.tipoId);
    else url.searchParams.delete('concurso');

    if (isJedpa) {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');

      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');

      if (filters.categoria) url.searchParams.set('categoria', filters.categoria);
      else url.searchParams.delete('categoria');

      if (filters.genero) url.searchParams.set('genero', filters.genero);
      else url.searchParams.delete('genero');
    } else {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');
      if (filters.categoria) url.searchParams.set('categoria', filters.categoria);
      else url.searchParams.delete('categoria');
      if (filters.genero) url.searchParams.set('genero', filters.genero);
      else url.searchParams.delete('genero');
      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');
    }

    if (filters.query) url.searchParams.set('q', filters.query);
    else url.searchParams.delete('q');

    window.history.replaceState(null, '', url.toString());
  } catch (e) {}
}

function restoreConcursoFiltersFromUrl(tipos) {
  try {
    const params = new URLSearchParams(window.location.search);
    const cParam = params.get('concurso');
    if (cParam) {
      const matchTipo = tipos.find(t => t.id === cParam || normalizeFilterValue(t.nombre).includes(cParam));
      if (matchTipo) concursoFilters.tipoId = matchTipo.id;
    }
    if (params.has('etapa')) concursoFilters.etapa = params.get('etapa');
    if (params.has('disciplina')) concursoFilters.disciplina = params.get('disciplina');
    if (params.has('categoria')) concursoFilters.categoria = params.get('categoria');
    if (params.has('genero')) concursoFilters.genero = params.get('genero');
    if (params.has('q')) concursoFilters.query = params.get('q');
  } catch (e) {}
}

function renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const tipos = state.tiposConcurso || [];
  const regs = state.concursoRegistros || [];

  if (tipos.length === 0) {
    host.innerHTML = '<div class="empty"><h4>Sin tipos de concurso</h4><p>Configura o siembra los tipos de concurso primero.</p></div>';
    return;
  }

  // Restaurar de URL una sola vez al cargar si aún no se inicializó
  if (!concursoFilters._urlInitialized) {
    concursoFilters._urlInitialized = true;
    restoreConcursoFiltersFromUrl(tipos);
  }

  const tipo = tipos.find(t => t.id === concursoFilters.tipoId) || null;
  const isJedpa = tipo && (
    tipo.id === 'jedpa' ||
    (tipo.nombre || '').toLowerCase().includes('jedpa') ||
    (tipo.nombre || '').toLowerCase().includes('juegos escolares')
  );

  let filtered = [];
  let baseRows = [];
  let etapaOptions = [];
  let disciplinaOptions = [];
  let categoriaOptions = [];
  let generoOptions = [];
  let etapaRows = [];

  if (isJedpa) {
    baseRows = regs.filter(r => {
      if (r.tipoConcursoId === tipo.id) return true;
      if (tipo && (r.tipoConcursoNombre === tipo.nombre || r.tipoConcurso === tipo.nombre)) return true;
      return false;
    });

    // 1. ETAPA
    etapaOptions = getFacetOptions(baseRows, 'etapa', 'Todas', 'Sin etapa');
    if (concursoFilters.etapa && !etapaOptions.some(o => o.value === concursoFilters.etapa)) {
      concursoFilters.etapa = '';
    }
    etapaRows = baseRows;
    if (concursoFilters.etapa) {
      if (concursoFilters.etapa === '__empty__') {
        etapaRows = baseRows.filter(r => !r.etapa || r.etapa.trim() === '' || r.etapa.trim() === '—');
      } else {
        etapaRows = baseRows.filter(r => normalizeFilterValue(r.etapa) === concursoFilters.etapa);
      }
    }

    // 2. DISCIPLINA
    disciplinaOptions = getFacetOptions(etapaRows, 'disciplina', 'Todas', 'Sin disciplina');
    if (concursoFilters.disciplina && !disciplinaOptions.some(o => o.value === concursoFilters.disciplina)) {
      concursoFilters.disciplina = '';
      showToast('Disciplina reiniciada: no hay registros con esa combinación.');
    }
    let disciplinaRows = etapaRows;
    if (concursoFilters.disciplina) {
      if (concursoFilters.disciplina === '__empty__') {
        disciplinaRows = etapaRows.filter(r => !r.disciplina || r.disciplina.trim() === '' || r.disciplina.trim() === '—');
      } else {
        disciplinaRows = etapaRows.filter(r => normalizeFilterValue(r.disciplina) === concursoFilters.disciplina);
      }
    }

    // 3. CATEGORÍA
    categoriaOptions = getFacetOptions(disciplinaRows, 'categoria', 'Todas', 'Sin categoría');
    if (concursoFilters.categoria && !categoriaOptions.some(o => o.value === concursoFilters.categoria)) {
      concursoFilters.categoria = '';
      showToast('Categoría reiniciada: no hay registros con esa combinación.');
    }
    let categoriaRows = disciplinaRows;
    if (concursoFilters.categoria) {
      if (concursoFilters.categoria === '__empty__') {
        categoriaRows = disciplinaRows.filter(r => !r.categoria || r.categoria.trim() === '' || r.categoria.trim() === '—');
      } else {
        categoriaRows = disciplinaRows.filter(r => normalizeFilterValue(r.categoria) === concursoFilters.categoria);
      }
    }

    // 4. GÉNERO
    generoOptions = getFacetOptions(categoriaRows, 'genero', 'Todos', 'Sin género');
    if (concursoFilters.genero && !generoOptions.some(o => o.value === concursoFilters.genero)) {
      concursoFilters.genero = '';
      showToast('Género reiniciado: no hay registros con esa combinación.');
    }
    let generoRows = categoriaRows;
    if (concursoFilters.genero) {
      if (concursoFilters.genero === '__empty__') {
        generoRows = categoriaRows.filter(r => !r.genero || r.genero.trim() === '' || r.genero.trim() === '—');
      } else {
        generoRows = categoriaRows.filter(r => normalizeFilterValue(r.genero) === concursoFilters.genero);
      }
    }

    // 5. BUSCAR
    filtered = generoRows;
    if (concursoFilters.query) {
      const q = normalizeText(concursoFilters.query);
      filtered = filtered.filter(r => {
        if (normalizeText(r.institucion).includes(q)) return true;
        if (normalizeText(r.tituloTrabajo).includes(q)) return true;
        if (normalizeText(r.disciplina).includes(q)) return true;
        if (normalizeText(r.resolucionRef).includes(q)) return true;
        if (normalizeText(r.codigoModular).includes(q)) return true;
        if (normalizeText(r.tipoConcursoNombre || r.tipoConcurso).includes(q)) return true;
        if ((r.participantes || []).some(p => normalizeText([p.nombres, p.apellidos, p.dni].filter(Boolean).join(' ')).includes(q))) return true;
        if ((r.asesores || []).some(a => normalizeText([a.nombres, a.apellidos, a.dni].filter(Boolean).join(' ')).includes(q))) return true;
        return false;
      });
    }

  } else {
    // Otros concursos (comportamiento estándar conservado)
    baseRows = regs.slice();
    filtered = regs.slice();
    if (concursoFilters.tipoId) {
      const tSel = tipos.find(t => t.id === concursoFilters.tipoId);
      filtered = filtered.filter(r => {
        if (r.tipoConcursoId === concursoFilters.tipoId) return true;
        if (tSel && (r.tipoConcursoNombre === tSel.nombre || r.tipoConcurso === tSel.nombre)) return true;
        return false;
      });
      baseRows = filtered.slice();
    }
    if (concursoFilters.etapa) {
      filtered = filtered.filter(r => (r.etapa || '').toUpperCase() === concursoFilters.etapa.toUpperCase());
    }
    if (concursoFilters.categoria) {
      const catFilt = concursoFilters.categoria.trim().toLowerCase();
      filtered = filtered.filter(r => (r.categoria || '').trim().toLowerCase() === catFilt);
    }
    if (concursoFilters.genero) {
      const genFilt = concursoFilters.genero.trim().toLowerCase();
      filtered = filtered.filter(r => (r.genero || '').trim().toLowerCase() === genFilt);
    }
    if (concursoFilters.disciplina) {
      const discFilt = concursoFilters.disciplina.toLowerCase();
      filtered = filtered.filter(r => (r.disciplina || '').toLowerCase().includes(discFilt));
    }
    if (concursoFilters.query) {
      const q = normalizeText(concursoFilters.query);
      filtered = filtered.filter(r => {
        if (normalizeText(r.institucion).includes(q)) return true;
        if (normalizeText(r.tituloTrabajo).includes(q)) return true;
        if (normalizeText(r.disciplina).includes(q)) return true;
        if (normalizeText(r.resolucionRef).includes(q)) return true;
        if (normalizeText(r.codigoModular).includes(q)) return true;
        if (normalizeText(r.tipoConcursoNombre || r.tipoConcurso).includes(q)) return true;
        if ((r.participantes || []).some(p => normalizeText([p.nombres, p.apellidos, p.dni].filter(Boolean).join(' ')).includes(q))) return true;
        if ((r.asesores || []).some(a => normalizeText([a.nombres, a.apellidos, a.dni].filter(Boolean).join(' ')).includes(q))) return true;
        return false;
      });
    }
  }

  syncConcursoFiltersToUrl(concursoFilters, isJedpa);

  // Ordenamiento predeterminado: Categoría -> Área / Disciplina -> Puesto (1.er, 2.°, 3.er, MH...) -> Institución
  const puestoWeight = (p) => {
    const s = String(p || '').toLowerCase();
    if (s.includes('1') || s.startsWith('primer')) return 1;
    if (s.includes('2') || s.startsWith('segundo')) return 2;
    if (s.includes('3') || s.startsWith('tercer')) return 3;
    if (s.includes('menci') || s.includes('honrosa') || s.includes('mh')) return 4;
    if (s.includes('final')) return 5;
    if (s.includes('clasif')) return 6;
    if (s.includes('partic')) return 7;
    return 8;
  };

  filtered.sort((a, b) => {
    const catComp = (a.categoria || '').localeCompare(b.categoria || '');
    if (catComp !== 0) return catComp;
    const discComp = (a.disciplina || '').localeCompare(b.disciplina || '');
    if (discComp !== 0) return discComp;
    const pA = puestoWeight(a.puesto);
    const pB = puestoWeight(b.puesto);
    if (pA !== pB) return pA - pB;
    return (a.institucion || '').localeCompare(b.institucion || '');
  });

  // Métricas calculadas
  const totalRegs = filtered.length;
  const uniqueColegios = new Set(filtered.map(r => r.codigoModular || r.institucion).filter(Boolean)).size;
  const partSet = new Set();
  filtered.forEach(r => {
    (r.participantes || []).forEach(p => {
      const key = (p.dni && p.dni.trim()) ? p.dni.trim() : [p.nombres, p.apellidos].filter(Boolean).join(' ').trim();
      if (key) partSet.add(key);
    });
  });
  const totalPartUnicos = partSet.size;

  const asesSet = new Set();
  filtered.forEach(r => {
    (r.asesores || []).forEach(a => {
      const key = (a.dni && a.dni.trim()) ? a.dni.trim() : [a.nombres, a.apellidos].filter(Boolean).join(' ').trim();
      if (key) asesSet.add(key);
    });
  });
  const totalAsesUnicos = asesSet.size;

  // Chips de filtros activos
  const chips = [];
  if (isJedpa) {
    if (concursoFilters.etapa) {
      const opt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      chips.push({ key: 'etapa', label: `Etapa: ${opt ? opt.rawLabel : concursoFilters.etapa}` });
    }
    if (concursoFilters.disciplina) {
      const opt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      chips.push({ key: 'disciplina', label: `Disciplina: ${opt ? opt.rawLabel : concursoFilters.disciplina}` });
    }
    if (concursoFilters.categoria) {
      const opt = categoriaOptions.find(o => o.value === concursoFilters.categoria);
      chips.push({ key: 'categoria', label: `Categoría: ${opt ? opt.rawLabel : concursoFilters.categoria}` });
    }
    if (concursoFilters.genero) {
      const opt = generoOptions.find(o => o.value === concursoFilters.genero);
      chips.push({ key: 'genero', label: `Género: ${opt ? opt.rawLabel : concursoFilters.genero}` });
    }
  } else {
    if (concursoFilters.etapa) chips.push({ key: 'etapa', label: `Etapa: ${concursoFilters.etapa}` });
    if (concursoFilters.categoria) chips.push({ key: 'categoria', label: `Categoría: ${concursoFilters.categoria}` });
    if (concursoFilters.genero) chips.push({ key: 'genero', label: `Género: ${concursoFilters.genero}` });
    if (concursoFilters.disciplina) chips.push({ key: 'disciplina', label: `Disciplina: ${concursoFilters.disciplina}` });
  }
  if (concursoFilters.query) {
    chips.push({ key: 'query', label: `Buscar: "${concursoFilters.query}"` });
  }

  const hasActiveFilters = chips.length > 0;
  const activeChipsHtml = chips.map(c => `
    <span class="filterChip">
      ${esc(c.label)}
      <button type="button" data-chip-clear="${c.key}" aria-label="Quitar filtro ${esc(c.label)}">✕</button>
    </span>
  `).join('');

  // Título dinámico de la tabla
  let tableTitleParts = [tipo ? tipo.nombre : 'Todos los concursos escolares'];
  if (isJedpa) {
    if (concursoFilters.etapa) {
      const eOpt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      tableTitleParts.push(`Etapa ${eOpt ? eOpt.rawLabel : concursoFilters.etapa}`);
    }
    if (concursoFilters.disciplina) {
      const dOpt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      tableTitleParts.push(dOpt ? dOpt.rawLabel : concursoFilters.disciplina);
    }
    if (concursoFilters.categoria) {
      const cOpt = categoriaOptions.find(o => o.value === concursoFilters.categoria);
      tableTitleParts.push(`Categoría ${cOpt ? cOpt.rawLabel : concursoFilters.categoria}`);
    }
    if (concursoFilters.genero) {
      const gOpt = generoOptions.find(o => o.value === concursoFilters.genero);
      tableTitleParts.push(gOpt ? gOpt.rawLabel : concursoFilters.genero);
    }
  }
  const dynamicTableTitle = 'Resultados consolidados: ' + tableTitleParts.join(' · ');

  // Filas de la tabla de resultados
  const rowsHtml = filtered.map(r => {
    const isExpanded = concursoExpandedId === r.id;
    const partSummary = (r.participantes || []).map(p => {
      const nom = formatPersonName(p);
      const dni = p.dni ? ' <small style="color:var(--ink-soft)">(' + esc(p.dni) + ')</small>' : '';
      const rol = (p.rol && p.rol !== 'Estudiante' && p.rol !== 'Deportista') ? ' <small style="color:var(--ink-soft)">[' + esc(p.rol) + ']</small>' : '';
      return esc(nom) + dni + rol;
    }).join('<br>') || '<span style="color:var(--ink-soft);font-style:italic">Sin participante registrado</span>';

    const asesSummary = (r.asesores || []).map(a => {
      const nom = formatPersonName(a);
      const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
      const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol) + ']</small>' : '';
      return esc(nom) + dni + rol;
    }).join('<br>') || '<span style="color:var(--ink-soft);font-style:italic">Sin docente asesor registrado</span>';

    let detExtra = [];
    if (!concursoFilters.tipoId) {
      detExtra.push('<span class="badge" style="background:var(--primary-tint);color:var(--primary);font-size:10.5px;font-weight:600">' + esc(r.tipoConcursoNombre || r.tipoConcurso || 'Concurso') + '</span>');
    }
    if (r.genero) detExtra.push('<span class="badge" style="background:var(--surface-2);font-size:10.5px">' + esc(r.genero) + '</span>');
    if (r.disciplina) detExtra.push('<strong>' + esc(r.disciplina) + '</strong>');
    if (r.tituloTrabajo) detExtra.push('<em>«' + esc(r.tituloTrabajo) + '»</em>' + (r.seudonimo ? ' <small style="color:var(--ink-soft)">(' + esc(r.seudonimo) + ')</small>' : ''));
    const detHtml = detExtra.join('<br>') || '—';

    const editBtn = '<button class="btn secondary small" data-cedit="' + r.id + '" title="Editar registro">✏️</button>';
    const delBtn  = isAdmin ? '<button class="iconBtn" data-cdel="' + r.id + '" title="Eliminar registro">✕</button>' : '';

    let detailContent = '';
    if (isExpanded) {
      const partListDetailed = (r.participantes || []).map(p => {
        const nom = [p.nombres, p.apellidos].filter(Boolean).join(' ').trim();
        return '<li><strong>' + esc(nom) + '</strong> · DNI: ' + esc(p.dni || '—') + ' · Rol: ' + esc(p.rol || 'Participante') + '</li>';
      }).join('');
      const asesListDetailed = (r.asesores || []).map(a => {
        const nom = [a.nombres, a.apellidos].filter(Boolean).join(' ').trim();
        return '<li><strong>' + esc(nom) + '</strong> · DNI: ' + esc(a.dni || '—') + ' · Rol: ' + esc(a.rol || 'Asesor') + '</li>';
      }).join('');

      detailContent = '<tr class="detailRow"><td colspan="8">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">' +
          '<div>' +
            '<h5 style="margin:0 0 6px;color:var(--ink)">Participantes (' + (r.participantes || []).length + ')</h5>' +
            '<ul style="margin:0;padding-left:18px;font-size:12.5px">' + (partListDetailed || '<li>Sin participantes</li>') + '</ul>' +
          '</div>' +
          '<div>' +
            '<h5 style="margin:0 0 6px;color:var(--ink)">Docentes Asesores / Delegados (' + (r.asesores || []).length + ')</h5>' +
            '<ul style="margin:0;padding-left:18px;font-size:12.5px">' + (asesListDetailed || '<li>Sin asesores</li>') + '</ul>' +
          '</div>' +
          '<div>' +
            '<h5 style="margin:0 0 6px;color:var(--ink)">Detalles Adicionales</h5>' +
            '<p style="margin:0;font-size:12.5px;color:var(--ink-soft)">' +
              'Concurso: <strong>' + esc(r.tipoConcursoNombre || r.tipoConcurso || '—') + '</strong><br>' +
              'Código Modular: <strong>' + esc(r.codigoModular || '—') + '</strong><br>' +
              'Resolución: <strong>' + esc(r.resolucionRef || '—') + '</strong><br>' +
              'Registrado por: <strong>' + esc(r.responsable || '—') + '</strong><br>' +
              'Fecha: <strong>' + fmtDate(r.fecha) + '</strong>' +
            '</p>' +
          '</div>' +
        '</div>' +
      '</td></tr>';
    }

    return '<tr class="clickable" data-crow="' + r.id + '">' +
      '<td>' + formatPuestoBadge(r.puesto) + '</td>' +
      '<td><strong>' + esc(r.institucion) + '</strong>' + (r.codigoModular ? '<br><small style="color:var(--ink-soft)">' + esc(r.codigoModular) + '</small>' : '') + '</td>' +
      '<td><span class="badge" style="background:var(--surface-2)">' + esc(r.categoria || '—') + '</span></td>' +
      '<td>' + detHtml + '</td>' +
      '<td>' + partSummary + '</td>' +
      '<td>' + asesSummary + '</td>' +
      '<td><span class="badge badge-etapa">' + esc(r.etapa) + '</span></td>' +
      '<td style="white-space:nowrap">' + editBtn + delBtn + '</td>' +
    '</tr>' + detailContent;
  }).join('') || (
    '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--ink-soft)">' +
      '<p style="font-size:14.5px;margin-bottom:6px">No se encontraron registros con los filtros seleccionados.</p>' +
      (isAdmin && regs.length === 0 ? '<button type="button" class="btn" id="btnImportGanadoresConsolidadoEmpty" style="margin-top:8px">📥 Cargar 83 ganadores oficiales (RD UGEL 03 - 2026)</button>' : '') +
    '</td></tr>'
  );

  // Selector de disciplina label para JEDPA
  let selectedDisciplinaLabel = 'Todas';
  if (isJedpa) {
    const curDiscOpt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
    selectedDisciplinaLabel = curDiscOpt ? curDiscOpt.label : `Todas (${etapaRows.length})`;
  }

  // Renderizado del panel de filtros
  let filterBarHtml = '';
  if (isJedpa) {
    filterBarHtml = `
      <div class="panel" style="margin-bottom:16px">
        <div class="jedpaFilterContainer">
          <!-- Fila 0: Tipo de concurso (ancho completo) -->
          <div class="jedpaRowTipo">
            <div class="jedpaFilterField">
              <label for="cf_tipo">Tipo de concurso</label>
              <select id="cf_tipo" title="${esc(tipo ? tipo.nombre : 'Todos los concursos')}">
                <option value="">Todos los concursos (${regs.length})</option>
                ${tipos.map(t => `<option value="${t.id}" ${t.id === concursoFilters.tipoId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Fila 1: Cascada (1. ETAPA -> 2. DISCIPLINA -> 3. CATEGORÍA -> 4. GÉNERO -> 5. BUSCAR) -->
          <div class="jedpaFiltersGrid">
            <!-- 1. ETAPA -->
            <div class="jedpaFilterField">
              <label for="cf_etapa">1. Etapa</label>
              <select id="cf_etapa" ${etapaOptions.length <= 1 ? 'disabled' : ''}>
                ${etapaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.etapa ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
              </select>
            </div>

            <!-- 2. DISCIPLINA (Searchable Select) -->
            <div class="jedpaFilterField">
              <label for="btn_cf_disciplina">2. Disciplina</label>
              <div class="searchableSelectWrap" id="wrap_cf_disciplina">
                <button type="button" class="searchableSelectBtn ${disciplinaOptions.length <= 1 ? 'disabled' : ''}" id="btn_cf_disciplina" aria-haspopup="listbox" aria-expanded="false" ${disciplinaOptions.length <= 1 ? 'disabled' : ''}>
                  <span id="txt_cf_disciplina">${esc(selectedDisciplinaLabel)}</span>
                  <span style="font-size:11px;color:var(--ink-soft)">▾</span>
                </button>
                <div class="searchableSelectDropdown" id="drop_cf_disciplina" style="display:none" role="listbox">
                  <div class="searchableSelectSearch">
                    <input type="search" placeholder="Buscar disciplina..." id="input_cf_disciplina_search" autocomplete="off">
                  </div>
                  <div class="searchableSelectList" id="list_cf_disciplina">
                    ${disciplinaOptions.map(o => `
                      <div class="searchableSelectOption ${o.value === concursoFilters.disciplina ? 'selected' : ''}" data-val="${esc(o.value)}" role="option">
                        <span>${esc(o.rawLabel || 'Todas')}</span>
                        <span style="font-size:11.5px;color:var(--ink-soft)">(${o.count})</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <select id="cf_disciplina" style="display:none">
                  ${disciplinaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.disciplina ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- 3. CATEGORÍA -->
            <div class="jedpaFilterField">
              <label for="cf_categoria">3. Categoría</label>
              <select id="cf_categoria" ${categoriaOptions.length <= 1 ? 'disabled' : ''}>
                ${categoriaOptions.length <= 1
                  ? '<option value="">Sin opciones</option>'
                  : categoriaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.categoria ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
                }
              </select>
            </div>

            <!-- 4. GÉNERO -->
            <div class="jedpaFilterField">
              <label for="cf_genero">4. Género</label>
              <select id="cf_genero" ${generoOptions.length <= 1 ? 'disabled' : ''}>
                ${generoOptions.length <= 1
                  ? '<option value="">Sin opciones</option>'
                  : generoOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.genero ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
                }
              </select>
            </div>

            <!-- 5. BUSCAR -->
            <div class="jedpaFilterField">
              <label for="cf_query">Buscar</label>
              <input type="search" id="cf_query" value="${esc(concursoFilters.query)}" placeholder="I.E., estudiante, DNI, RD...">
            </div>
          </div>

          <!-- Fila 2: Chips de filtros activos + Contador -->
          <div class="jedpaActiveFiltersRow">
            ${hasActiveFilters ? `
              <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filtros activos:</span>
              ${activeChipsHtml}
            ` : ''}
            <div class="recordsCounter" aria-live="polite">
              Mostrando <strong>${filtered.length}</strong> de <strong>${baseRows.length}</strong> registros
            </div>
          </div>

          <!-- Fila 3: Botones de acción -->
          <div class="jedpaActionsRow">
            <button type="button" class="btn secondary small" id="cf_clear">Limpiar</button>
            ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" title="Importar 83 ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
            <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
            <button type="button" class="btn secondary small" id="cf_exportCsv" style="margin-left:auto">Exportar CSV</button>
            <button type="button" class="btn small" id="cf_exportPdf">⬇ Descargar reporte (PDF)</button>
          </div>
        </div>
      </div>
    `;
  } else {
    // Barra de filtros estándar para los demás concursos
    const availableCats = tipo
      ? (tipo.categorias || [])
      : Array.from(new Set(regs.map(r => r.categoria).filter(Boolean))).sort();

    const catOpts = availableCats.map(c =>
      '<option value="' + esc(c) + '"' + ((concursoFilters.categoria || '').toLowerCase() === c.toLowerCase() ? ' selected' : '') + '>' + esc(c) + '</option>'
    ).join('');

    filterBarHtml = `
      <div class="panel">
        <div class="filterBar" style="margin-bottom:0">
          <div class="field" style="flex:2;min-width:240px">
            <label for="cf_tipo">Tipo de concurso</label>
            <select id="cf_tipo">
              <option value="">Todos los concursos (${regs.length})</option>
              ${tipos.map(t => `<option value="${t.id}" ${t.id === concursoFilters.tipoId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="flex:1;min-width:130px">
            <label for="cf_etapa">Etapa</label>
            <select id="cf_etapa">
              <option value="">Todas</option>
              ${['UGEL', 'DRELM', 'MACROREGIONAL', 'NACIONAL'].map(e => `<option value="${e}" ${e === concursoFilters.etapa ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="flex:1;min-width:140px">
            <label for="cf_categoria">Categoría</label>
            <select id="cf_categoria">
              <option value="">Todas</option>
              ${catOpts}
            </select>
          </div>
          ${(tipo && tipo.tieneGenero) ? `
            <div class="field" style="flex:1;min-width:120px">
              <label for="cf_genero">Género</label>
              <select id="cf_genero">
                <option value="">Todos</option>
                ${['Damas', 'Varones'].map(g => `<option value="${g}" ${g.toLowerCase() === (concursoFilters.genero || '').toLowerCase() ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          ${(tipo && tipo.tieneDisciplina) ? `
            <div class="field" style="flex:1.5;min-width:160px">
              <label for="cf_disciplina">${esc(tipo.etiquetaDisciplina || 'Disciplina')}</label>
              <input type="search" id="cf_disciplina" value="${esc(concursoFilters.disciplina)}" placeholder="Buscar disciplina...">
            </div>
          ` : ''}
          <div class="field" style="flex:1.5;min-width:180px">
            <label for="cf_query">Buscar</label>
            <input type="search" id="cf_query" value="${esc(concursoFilters.query)}" placeholder="I.E., estudiante, DNI, RD...">
          </div>
          <button type="button" class="btn secondary small" id="cf_clear" style="align-self:flex-end;margin-bottom:2px">Limpiar</button>
          ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" style="align-self:flex-end;margin-bottom:2px" title="Importar 83 ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
          <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" style="align-self:flex-end;margin-bottom:2px" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
          <button type="button" class="btn secondary small" id="cf_exportCsv" style="align-self:flex-end;margin-bottom:2px;margin-left:auto">Exportar CSV</button>
          <button type="button" class="btn small" id="cf_exportPdf" style="align-self:flex-end;margin-bottom:2px">⬇ Descargar reporte (PDF)</button>
        </div>
        ${hasActiveFilters ? `
          <div class="jedpaActiveFiltersRow" style="margin-top:10px">
            <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filtros activos:</span>
            ${activeChipsHtml}
            <div class="recordsCounter" aria-live="polite">
              Mostrando <strong>${filtered.length}</strong> de <strong>${baseRows.length}</strong> registros
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  host.innerHTML = '' +
    filterBarHtml +
    '<div id="concursoReportCapture">' +
      '<div class="cards">' +
        '<div class="card"><div class="num">' + totalRegs + '</div><div class="lbl">Registros / Premiaciones</div></div>' +
        '<div class="card"><div class="num">' + totalPartUnicos + '</div><div class="lbl">Participantes únicos</div></div>' +
        '<div class="card"><div class="num">' + uniqueColegios + '</div><div class="lbl">Instituciones educativas</div></div>' +
        '<div class="card"><div class="num">' + totalAsesUnicos + '</div><div class="lbl">Docentes asesores</div></div>' +
      '</div>' +

      '<div class="panel">' +
        '<h3>' + esc(dynamicTableTitle) + '</h3>' +
        '<div class="tblWrap"><table><thead><tr>' +
          '<th style="width:70px">Puesto</th>' +
          '<th>Institución</th>' +
          '<th>Categoría</th>' +
          '<th>Detalle / Área</th>' +
          '<th>Participantes</th>' +
          '<th>Docente Asesor</th>' +
          '<th>Etapa</th>' +
          '<th style="width:90px"></th>' +
        '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
      '</div>' +
    '</div>';

  // Event listeners de filtros
  document.getElementById('cf_tipo').addEventListener('change', (e) => {
    concursoFilters.tipoId = e.target.value;
    concursoFilters.etapa = '';
    concursoFilters.disciplina = '';
    concursoFilters.categoria = '';
    concursoFilters.genero = '';
    concursoFilters.query = '';
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  const fEtapa = document.getElementById('cf_etapa');
  if (fEtapa) {
    fEtapa.addEventListener('change', (e) => {
      concursoFilters.etapa = e.target.value;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const fCategoria = document.getElementById('cf_categoria');
  if (fCategoria) {
    fCategoria.addEventListener('change', (e) => {
      concursoFilters.categoria = e.target.value;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const filGen = document.getElementById('cf_genero');
  if (filGen) {
    filGen.addEventListener('change', (e) => {
      concursoFilters.genero = e.target.value;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  // Disciplina interactiva
  if (isJedpa) {
    const btnDisc = document.getElementById('btn_cf_disciplina');
    const dropDisc = document.getElementById('drop_cf_disciplina');
    const inputSearchDisc = document.getElementById('input_cf_disciplina_search');
    const listDisc = document.getElementById('list_cf_disciplina');

    if (btnDisc && dropDisc) {
      btnDisc.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropDisc.style.display !== 'none';
        if (isOpen) {
          dropDisc.style.display = 'none';
          btnDisc.setAttribute('aria-expanded', 'false');
        } else {
          dropDisc.style.display = 'flex';
          btnDisc.setAttribute('aria-expanded', 'true');
          if (inputSearchDisc) {
            inputSearchDisc.value = '';
            filterDiscOptions('');
            inputSearchDisc.focus();
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#wrap_cf_disciplina')) {
          dropDisc.style.display = 'none';
          btnDisc.setAttribute('aria-expanded', 'false');
        }
      });

      btnDisc.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dropDisc.style.display = 'flex';
          btnDisc.setAttribute('aria-expanded', 'true');
          inputSearchDisc?.focus();
        }
      });

      function filterDiscOptions(q) {
        const normQ = normalizeFilterValue(q);
        const opts = listDisc.querySelectorAll('.searchableSelectOption');
        opts.forEach(opt => {
          const text = normalizeFilterValue(opt.textContent);
          const match = text.includes(normQ);
          opt.style.display = match ? 'flex' : 'none';
        });
      }

      if (inputSearchDisc) {
        inputSearchDisc.addEventListener('input', (e) => {
          filterDiscOptions(e.target.value);
        });
        inputSearchDisc.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            dropDisc.style.display = 'none';
            btnDisc.setAttribute('aria-expanded', 'false');
            btnDisc.focus();
          }
        });
      }

      listDisc.querySelectorAll('.searchableSelectOption').forEach(opt => {
        opt.addEventListener('click', () => {
          concursoFilters.disciplina = opt.dataset.val;
          dropDisc.style.display = 'none';
          btnDisc.setAttribute('aria-expanded', 'false');
          renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
        });
      });
    }
  } else {
    const filDisc = document.getElementById('cf_disciplina');
    if (filDisc) {
      let discDebounce;
      filDisc.addEventListener('input', (e) => {
        clearTimeout(discDebounce);
        discDebounce = setTimeout(() => {
          concursoFilters.disciplina = e.target.value;
          renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
        }, 300);
      });
    }
  }

  // Chips click para limpiar filtro individual
  host.querySelectorAll('[data-chip-clear]').forEach(b => {
    b.addEventListener('click', () => {
      const field = b.dataset.chipClear;
      if (field && concursoFilters[field] !== undefined) {
        concursoFilters[field] = '';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      }
    });
  });

  const filQuery = document.getElementById('cf_query');
  if (filQuery) {
    let qDebounce;
    filQuery.addEventListener('input', (e) => {
      clearTimeout(qDebounce);
      qDebounce = setTimeout(() => {
        concursoFilters.query = e.target.value;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      }, 300);
    });
  }

  document.getElementById('cf_clear').addEventListener('click', () => {
    concursoFilters = {
      tipoId: concursoFilters.tipoId, // Conserva el tipo de concurso
      etapa: '',
      disciplina: '',
      categoria: '',
      genero: '',
      query: ''
    };
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  // Botón Cargar Ganadores RD (en barra de filtros)
  const importBtn = document.getElementById('cf_importRd');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Detectar Duplicados
  const dupBtn = document.getElementById('cf_detectDuplicatesBtn');
  if (dupBtn) {
    dupBtn.addEventListener('click', () => {
      openDuplicateDetectorModal(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Cargar Ganadores RD (en estado vacío)
  const importEmptyBtn = document.getElementById('btnImportGanadoresConsolidadoEmpty');
  if (importEmptyBtn) {
    importEmptyBtn.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Exportar PDF oficial de concursos (Acta de Resultados A4 Landscape)
  document.getElementById('cf_exportPdf').addEventListener('click', () => {
    openDownloadConfigModal({
      documentTitle: `ACTA OFICIAL DE RESULTADOS — ${(tipo ? tipo.nombre : 'CONCURSOS EDUCATIVOS ESCOLARES').toUpperCase()}`,
      tipoReporte: 'concursos',
      dataRows: filtered,
      currentUser,
      state,
      dbNs,
      isAdmin,
      onConfirm: async (cfg) => {
        if (cfg.formatoConcurso === 'orden_merito') {
          await exportActaOrdenMeritoPdf(filtered, tipo, concursoFilters, cfg);
        } else {
          await exportConcursosReportPdf(filtered, tipo, concursoFilters, cfg);
        }
      }
    });
  });

  // Exportar CSV
  document.getElementById('cf_exportCsv').addEventListener('click', () => {
    const headers = ['Puesto', 'Institución', 'Código Modular', 'Concurso', 'Etapa', 'Categoría', 'Género', 'Disciplina/Área', 'Título', 'Seudónimo', 'Participantes', 'Asesores', 'Resolución', 'Fecha'];
    const rows = filtered.map(r => [
      r.puesto || '',
      r.institucion || '',
      r.codigoModular || '',
      r.tipoConcursoNombre || r.tipoConcurso || '',
      r.etapa || '',
      r.categoria || '',
      r.genero || '',
      r.disciplina || '',
      r.tituloTrabajo || '',
      r.seudonimo || '',
      (r.participantes || []).map(p => `${[p.nombres, p.apellidos].filter(Boolean).join(' ')} (${p.dni || 'S/D'}) [${p.rol || 'Estudiante'}]`).join('; '),
      (r.asesores || []).map(a => `${[a.nombres, a.apellidos].filter(Boolean).join(' ')} (${a.dni || 'S/D'}) [${a.rol || 'Asesor'}]`).join('; '),
      r.resolucionRef || '',
      r.fecha || ''
    ]);
    downloadCsv('concursos_' + (tipo ? tipo.id : 'todos') + '_' + todayStr() + '.csv', headers, rows);
  });

  // Expandir fila al hacer clic
  host.querySelectorAll('tr[data-crow]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-cedit],[data-cdel]')) return;
      const id = tr.dataset.crow;
      concursoExpandedId = (concursoExpandedId === id) ? null : id;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  });

  // Editar registro de concurso
  host.querySelectorAll('[data-cedit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rId = btn.dataset.cedit;
      const r = state.concursoRegistros.find(x => x.id === rId);
      if (!r) return;
      concursoEditingId = r.id;
      concursoEditingData = JSON.parse(JSON.stringify(r));
      concursoSelectedTipoId = r.tipoConcursoId;
      concursoParticipantes = r.participantes && r.participantes.length ? JSON.parse(JSON.stringify(r.participantes)) : [{ nombres: '', apellidos: '', dni: '', rol: 'Estudiante' }];
      concursoAsesores = r.asesores && r.asesores.length ? JSON.parse(JSON.stringify(r.asesores)) : [{ nombres: '', apellidos: '', dni: '', rol: 'Docente Asesor' }];
      concursoSubTab = 'registrar';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  });

  // Eliminar registro de concurso (solo admin)
  host.querySelectorAll('[data-cdel]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!isAdmin) return;
      if (!confirm('¿Eliminar este registro de concurso? Esta acción no se puede deshacer.')) return;
      try {
        await dbNs.collection('concursoRegistros').doc(btn.dataset.cdel).delete();
        showToast('✓ Registro eliminado.');
      } catch (err) {
        console.error('Error eliminando concurso:', err);
        showToast('No se pudo eliminar el registro.');
      }
    });
  });
}

/* -------------------------------------------------------------
   SUB-PESTAÑA 3: TIPOS DE CONCURSO (ADMIN ONLY)
   ------------------------------------------------------------- */
function renderConcursoTiposCatalogView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const tipos = state.tiposConcurso || [];

  const cardsHtml = tipos.map(t => {
    const cats = (t.categorias || []).map(c => '<span class="badge" style="background:var(--surface-3);font-size:10.5px;margin:2px">' + esc(c) + '</span>').join('');
    const partRoles = (t.rolesParticipante || []).join(', ');
    const asesRoles = (t.rolesAsesor || []).join(', ');

    return '<div class="tipoCard">' +
      '<div class="ti">' +
        '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<h4 style="margin:0">' + esc(t.nombre) + '</h4>' +
          '<span class="badge" style="background:var(--primary-tint);color:var(--primary);font-size:11px">' + (t.tipoParticipacion === 'individual' ? '👤 Individual' : '👥 Grupal') + '</span>' +
          (t.tieneGenero ? '<span class="badge" style="background:rgba(14,165,233,0.15);color:#38bdf8;font-size:11px">Damas / Varones</span>' : '') +
          (t.tieneDisciplina ? '<span class="badge" style="background:rgba(168,85,247,0.15);color:#c084fc;font-size:11px">Disciplina: Sí</span>' : '') +
          (t.tieneTituloTrabajo ? '<span class="badge" style="background:rgba(245,158,11,0.15);color:#fbbf24;font-size:11px">Título / Seudónimo: Sí</span>' : '') +
        '</div>' +
        '<div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px">Categorías: ' + (cats || '—') + '</div>' +
        '<div style="font-size:12px;color:var(--ink-soft)">Roles participantes: <strong>' + esc(partRoles) + '</strong> | Roles asesor: <strong>' + esc(asesRoles) + '</strong></div>' +
      '</div>' +
      '<div class="acts">' +
        '<button type="button" class="btn secondary small" data-tedit="' + t.id + '">✎ Editar</button>' +
        '<button type="button" class="iconBtn small" data-tdel="' + t.id + '" title="Eliminar tipo">✕</button>' +
      '</div>' +
    '</div>';
  }).join('') || '<div class="empty"><h4>Catálogo vacío</h4><p>No hay tipos de concurso configurados actualmente.</p></div>';

  host.innerHTML = '' +
    '<div class="panel">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">' +
        '<div>' +
          '<h3 style="margin-bottom:2px">Catálogo de Tipos de Concurso</h3>' +
          '<p class="helpText" style="margin-bottom:0">Define las reglas, categorías, roles y campos dinámicos de cada concurso.</p>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
          '<button type="button" class="btn secondary" id="btnSeedConcursos">🌱 Sembrar 6 concursos oficiales (UGEL 03)</button>' +
          '<button type="button" class="btn secondary" id="btnImportGanadoresCatalog">📥 Cargar 83 ganadores oficiales (RD)</button>' +
          '<button type="button" class="btn" id="btnNewTipoConcurso">＋ Nuevo tipo de concurso</button>' +
        '</div>' +
      '</div>' +
      cardsHtml +
    '</div>' +
    '<div id="modalTipoConcursoHost"></div>';

  // Botón Sembrar 6 concursos oficiales
  document.getElementById('btnSeedConcursos').addEventListener('click', async () => {
    if (!confirm('¿Deseas sembrar o restaurar los 6 tipos de concurso oficiales de la UGEL 03 (JMA, ONEM, El Perú Lee, Eureka, JFEN, JEDPA)? Los concursos existentes se actualizarán con los datos oficiales.')) return;
    const btn = document.getElementById('btnSeedConcursos');
    btn.disabled = true;
    btn.textContent = 'Sembrando...';
    await ejecutarSiembraConcursos(dbNs, state);
    renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
  });

  // Botón Cargar 83 ganadores oficiales (RD)
  const btnImpCat = document.getElementById('btnImportGanadoresCatalog');
  if (btnImpCat) {
    btnImpCat.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Nuevo Tipo de Concurso
  document.getElementById('btnNewTipoConcurso').addEventListener('click', () => {
    openTipoConcursoModal(null, dbNs, state, container, isAdmin, currentUser, navigate);
  });

  // Editar tipo de concurso
  host.querySelectorAll('[data-tedit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = state.tiposConcurso.find(x => x.id === btn.dataset.tedit);
      if (t) openTipoConcursoModal(t, dbNs, state, container, isAdmin, currentUser, navigate);
    });
  });

  // Eliminar tipo de concurso
  host.querySelectorAll('[data-tdel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const t = state.tiposConcurso.find(x => x.id === btn.dataset.tdel);
      if (!t) return;
      if (!confirm('¿Eliminar el tipo de concurso "' + t.nombre + '"? Esta acción no se puede deshacer.')) return;
      try {
        await dbNs.collection('tiposConcurso').doc(t.id).delete();
        showToast('✓ Tipo de concurso eliminado.');
      } catch (err) {
        console.error('Error eliminando tipo de concurso:', err);
        showToast('No se pudo eliminar el tipo de concurso.');
      }
    });
  });
}

// Modal para Crear / Editar Tipo de Concurso
function openTipoConcursoModal(existingTipo, dbNs, state, container, isAdmin, currentUser, navigate) {
  const host = document.getElementById('modalTipoConcursoHost');
  if (!host) return;

  const isEdit = !!existingTipo;
  const modalTitle = isEdit ? 'Editar Tipo de Concurso' : 'Nuevo Tipo de Concurso';

  let categorias = isEdit ? [...(existingTipo.categorias || [])] : ['A', 'B', 'C'];
  let rolesPart = isEdit ? [...(existingTipo.rolesParticipante || [])] : ['Estudiante'];
  let rolesAses = isEdit ? [...(existingTipo.rolesAsesor || [])] : ['Docente Asesor'];

  host.innerHTML = '' +
    '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px">' +
      '<div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;padding:26px;box-shadow:var(--shadow-lg)">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">' +
          '<h3 style="margin:0">' + modalTitle + '</h3>' +
          '<button type="button" class="iconBtn" id="m_tc_close">✕</button>' +
        '</div>' +
        '<form id="m_tc_form">' +
          '<div class="field">' +
            '<label>Nombre del concurso *</label>' +
            '<input type="text" id="m_tc_nombre" value="' + esc(existingTipo ? existingTipo.nombre : '') + '" placeholder="Ej: Juegos Florales Escolares Nacionales" required>' +
          '</div>' +
          '<div class="field">' +
            '<label>Tipo de participación *</label>' +
            '<select id="m_tc_tipoPart">' +
              '<option value="individual"' + (existingTipo && existingTipo.tipoParticipacion === 'individual' ? ' selected' : '') + '>Individual (1 participante por registro)</option>' +
              '<option value="grupal"' + (existingTipo && existingTipo.tipoParticipacion === 'grupal' ? ' selected' : '') + '>Grupal (Múltiples participantes por registro)</option>' +
            '</select>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0;background:var(--surface-2);padding:14px;border-radius:var(--radius);border:1px solid var(--line)">' +
            '<label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer">' +
              '<input type="checkbox" id="m_tc_tieneGenero"' + (existingTipo && existingTipo.tieneGenero ? ' checked' : '') + '> Tiene Género (Damas / Varones)' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer">' +
              '<input type="checkbox" id="m_tc_tieneDisciplina"' + (existingTipo && existingTipo.tieneDisciplina ? ' checked' : '') + '> Tiene Disciplina / Área' +
            '</label>' +
            '<label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer">' +
              '<input type="checkbox" id="m_tc_tieneTituloTrabajo"' + (existingTipo && existingTipo.tieneTituloTrabajo ? ' checked' : '') + '> Tiene Título de Trabajo' +
            '</label>' +
          '</div>' +

          '<div class="field">' +
            '<label>Categorías (separadas por comas) *</label>' +
            '<input type="text" id="m_tc_categorias" value="' + esc(categorias.join(', ')) + '" placeholder="Ej: A, B, C, D o Alfa - Nivel 1, Beta - Nivel 1" required>' +
            '<small style="color:var(--ink-soft)">Escribe las categorías separadas por coma.</small>' +
          '</div>' +

          '<div class="field">' +
            '<label>Roles de participante (separados por comas) *</label>' +
            '<input type="text" id="m_tc_rolesPart" value="' + esc(rolesPart.join(', ')) + '" placeholder="Ej: Estudiante, Deportista" required>' +
          '</div>' +

          '<div class="field">' +
            '<label>Roles de asesor / delegados (separados por comas) *</label>' +
            '<input type="text" id="m_tc_rolesAses" value="' + esc(rolesAses.join(', ')) + '" placeholder="Ej: Docente Asesor, Entrenador, Delegado" required>' +
          '</div>' +

          '<div class="field">' +
            '<label>Disciplinas sugeridas (opcional, separadas por comas)</label>' +
            '<input type="text" id="m_tc_discSugeridas" value="' + esc((existingTipo && existingTipo.disciplinasSugeridas ? existingTipo.disciplinasSugeridas : []).join(', ')) + '" placeholder="Ej: Ajedrez, Atletismo, Natación o Danza, Teatro">' +
          '</div>' +

          '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">' +
            '<button type="button" class="btn secondary" id="m_tc_cancel">Cancelar</button>' +
            '<button type="submit" class="btn" id="m_tc_submit">' + (isEdit ? 'Actualizar' : 'Crear tipo') + '</button>' +
          '</div>' +
        '</form>' +
      '</div>' +
    '</div>';

  const closeModal = () => { host.innerHTML = ''; };
  document.getElementById('m_tc_close').addEventListener('click', closeModal);
  document.getElementById('m_tc_cancel').addEventListener('click', closeModal);

  document.getElementById('m_tc_form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('m_tc_submit');
    btn.disabled = true;

    try {
      const cats = document.getElementById('m_tc_categorias').value.split(',').map(s => s.trim()).filter(Boolean);
      const rP = document.getElementById('m_tc_rolesPart').value.split(',').map(s => s.trim()).filter(Boolean);
      const rA = document.getElementById('m_tc_rolesAses').value.split(',').map(s => s.trim()).filter(Boolean);
      const dS = document.getElementById('m_tc_discSugeridas').value.split(',').map(s => s.trim()).filter(Boolean);

      const data = {
        nombre:              document.getElementById('m_tc_nombre').value.trim(),
        tipoParticipacion:   document.getElementById('m_tc_tipoPart').value,
        tieneGenero:         document.getElementById('m_tc_tieneGenero').checked,
        tieneDisciplina:     document.getElementById('m_tc_tieneDisciplina').checked,
        tieneTituloTrabajo:  document.getElementById('m_tc_tieneTituloTrabajo').checked,
        categorias:          cats.length ? cats : ['Única'],
        rolesParticipante:   rP.length ? rP : ['Estudiante'],
        rolesAsesor:         rA.length ? rA : ['Docente Asesor'],
        disciplinasSugeridas: dS,
        createdAt:           isEdit ? (existingTipo.createdAt || Date.now()) : Date.now(),
        updatedAt:           Date.now()
      };

      if (isEdit) {
        await dbNs.collection('tiposConcurso').doc(existingTipo.id).set(data, { merge: true });
        showToast('✓ Tipo de concurso actualizado.');
      } else {
        const newId = genId();
        await dbNs.collection('tiposConcurso').doc(newId).set(data);
        showToast('✓ Tipo de concurso creado.');
      }

      closeModal();
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    } catch (err) {
      console.error('Error guardando tipo de concurso:', err);
      showToast('Error al guardar: [' + (err.code || 'error') + '] ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// Función auxiliar para sembrar los 6 concursos en Firestore desde la UI
async function ejecutarSiembraConcursos(dbNs, state) {
  try {
    for (const c of SEED_CONCURSOS_DEFAULTS) {
      const { id, ...data } = c;
      await dbNs.collection('tiposConcurso').doc(id).set({ ...data, createdAt: Date.now() }, { merge: true });
    }
    showToast('✓ 6 concursos oficiales sembrados exitosamente.');
  } catch (err) {
    console.error('Error sembrando concursos oficiales:', err);
    showToast('Error en siembra: [' + (err.code || 'error') + '] ' + err.message);
  }
}

// Mapeo normalizado de nombres a IDs oficiales de tiposConcurso
export const CONCURSO_TIPO_ID_MAP = {
  'Premio Nacional de Narrativa y Ensayo José María Arguedas': 'jma',
  'Olimpiada Nacional Escolar de Matemática (ONEM)': 'onem',
  'Concurso Nacional de Comprensión Lectora El Perú Lee': 'peru_lee',
  'Feria Escolar Nacional de Ciencia y Tecnología Eureka': 'eureka',
  'Juegos Florales Escolares Nacionales (JFEN)': 'jfen',
  'Juegos Escolares Deportivos y Paradeportivos (JEDPA)': 'jedpa'
};

// Función para importar los 83 ganadores oficiales desde el archivo JSON empaquetado en public/data/
async function ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate) {
  if (!confirm('¿Deseas importar los 83 registros oficiales de ganadores de concursos escolares (Resoluciones Directorales UGEL 03 - 2026)?\n\nLos registros se cargarán a la base de datos Firestore vinculando colegios y participantes evitando duplicados.')) {
    return;
  }

  try {
    showToast('Leyendo datos oficiales de concursos...');
    const resp = await fetch('./data/concurso-data.json');
    if (!resp.ok) {
      throw new Error('No se pudo cargar el archivo ./data/concurso-data.json (HTTP ' + resp.status + ')');
    }
    const rawData = await resp.json();
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error('El archivo de datos no contiene registros válidos.');
    }

    // Si aún no se han sembrado los tipos de concurso, sembrarlos primero
    if (!state.tiposConcurso || state.tiposConcurso.length === 0) {
      await ejecutarSiembraConcursos(dbNs, state);
    }

    // Mapa de colegios para autocompletar código modular si falta
    const colMap = new Map();
    (state.colegios || []).forEach(c => {
      const name = c.ie || c.nombre || '';
      if (name) colMap.set(name.trim().toLowerCase(), c.codigoLocal || c.codigoModular || '');
    });

    // Deduplicación contra registros existentes en state.concursoRegistros
    const existingRegs = state.concursoRegistros || [];
    const isDuplicate = (item, tipoId, tipoNombre) => {
      const pDnis = (Array.isArray(item.participantes) ? item.participantes : []).map(p => (p.dni || '').trim()).filter(Boolean);
      return existingRegs.some(r => {
        const sameTipo = (r.tipoConcursoId === tipoId || r.tipoConcursoNombre === tipoNombre);
        const sameInst = normalizeText(r.institucion) === normalizeText(item.institucion);
        const sameCat = normalizeText(r.categoria) === normalizeText(item.categoria);
        const sameDisc = normalizeText(r.disciplina) === normalizeText(item.disciplina);
        const samePuesto = normalizePuestoValue(r.puesto) === normalizePuestoValue(item.puesto);
        
        // Si coinciden tipo, institución, categoría, puesto y disciplina -> es duplicado
        if (sameTipo && sameInst && sameCat && sameDisc && samePuesto) return true;

        // O si comparten algún DNI de participante en el mismo concurso y categoría
        if (sameTipo && sameCat && pDnis.length > 0) {
          const rDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
          if (pDnis.some(d => rDnis.includes(d))) return true;
        }
        return false;
      });
    };

    let skipped = 0;
    const toInsert = [];
    for (const item of rawData) {
      const tipoNombre = item.tipoConcurso || item.tipoConcursoNombre || '';
      const tipoId = CONCURSO_TIPO_ID_MAP[tipoNombre] || (tipoNombre ? tipoNombre.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'otro');
      if (isDuplicate(item, tipoId, tipoNombre)) {
        skipped++;
      } else {
        toInsert.push({ item, tipoId, tipoNombre });
      }
    }

    if (toInsert.length === 0) {
      showToast('Todos los ganadores oficiales ya se encuentran registrados en el sistema (0 duplicados insertados).');
      return;
    }

    let total = 0;
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const chunk = toInsert.slice(i, i + batchSize);
      const batch = dbNs.batch();

      for (const entry of chunk) {
        const { item, tipoId, tipoNombre } = entry;
        let codMod = item.codigoModular || '';
        if (!codMod && item.institucion) {
          const match = colMap.get(item.institucion.trim().toLowerCase());
          if (match) codMod = match;
        }

        const docRef = dbNs.collection('concursoRegistros').doc();
        batch.set(docRef, {
          tipoConcursoId:     tipoId,
          tipoConcursoNombre: tipoNombre,
          etapa:              item.etapa || 'UGEL',
          categoria:          item.categoria || '',
          genero:             item.genero || null,
          disciplina:         item.disciplina || null,
          institucion:        item.institucion || '',
          codigoModular:      codMod,
          tituloTrabajo:      item.tituloTrabajo || null,
          seudonimo:          item.seudonimo || null,
          puesto:             normalizePuestoValue(item.puesto) || item.puesto || '',
          participantes:      Array.isArray(item.participantes) ? item.participantes : [],
          asesores:           Array.isArray(item.asesores) ? item.asesores : [],
          resolucionRef:      item.resolucionRef || '',
          fecha:              item.fecha || '',
          responsable:        'RD UGEL 03 (2026)',
          importadoDesdePdf:  true,
          createdAt:          Date.now(),
          updatedAt:          Date.now()
        });
      }

      await batch.commit();
      total += chunk.length;
    }

    showToast('✓ ' + total + ' nuevos ganadores importados' + (skipped > 0 ? ' (' + skipped + ' omitidos por ya existir)' : '') + '.');
    concursoSubTab = 'consolidado';
    concursoFilters.tipoId = ''; // Ver todos los concursos
    renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
  } catch (err) {
    console.error('Error importando ganadores oficiales:', err);
    showToast('Error en importación: [' + (err.code || 'error') + '] ' + err.message);
  }
}

// Función para sincronizar / retroalimentar UGEL y RED/REI en fichas que no los tengan
async function backfillSubmissionsUgelRed(dbNs, state) {
  const colegios = state.colegios || [];
  const submissions = state.submissions || [];
  if (!submissions.length) return 0;

  const colMap = new Map();
  colegios.forEach(c => {
    if (c.ie) colMap.set(normalizeText(c.ie), c);
    if (c.nombre) colMap.set(normalizeText(c.nombre), c);
  });

  const batchSize = 100;
  let updatedCount = 0;
  let currentBatch = dbNs.batch();
  let opsInBatch = 0;

  for (const sub of submissions) {
    let needUpdate = false;
    let newUgel = sub.ugel;
    let newRed = sub.red;
    let newCod = sub.codigoModular;

    if (!newUgel || newUgel === '—') {
      newUgel = 'UGEL 03';
      needUpdate = true;
    }

    if (!newRed || newRed === '—') {
      let matched = null;
      if (sub.colegioId) {
        matched = colegios.find(c => c.id === sub.colegioId);
      }
      if (!matched && sub.institucion) {
        matched = colMap.get(normalizeText(sub.institucion));
      }
      if (matched && matched.rei) {
        newRed = matched.rei;
        needUpdate = true;
      } else if (!newRed) {
        newRed = 'No aplica';
        needUpdate = true;
      }
    }

    if (!newCod) {
      let matched = null;
      if (sub.colegioId) {
        matched = colegios.find(c => c.id === sub.colegioId);
      }
      if (!matched && sub.institucion) {
        matched = colMap.get(normalizeText(sub.institucion));
      }
      if (matched && (matched.codigoLocal || matched.codigoModular)) {
        newCod = matched.codigoLocal || matched.codigoModular;
        needUpdate = true;
      }
    }

    if (needUpdate) {
      const docRef = dbNs.collection('submissions').doc(sub.id);
      currentBatch.update(docRef, {
        ugel: newUgel,
        red: newRed,
        codigoModular: newCod || '',
        updatedAt: Date.now()
      });
      opsInBatch++;
      updatedCount++;

      if (opsInBatch >= batchSize) {
        await currentBatch.commit();
        currentBatch = dbNs.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await currentBatch.commit();
  }

  return updatedCount;
}

// Modal para detectar y limpiar duplicados en concursos escolares
function openDuplicateDetectorModal(dbNs, state, container, isAdmin, currentUser, navigate) {
  const regs = state.concursoRegistros || [];

  // 1. Detectar duplicados exactos
  const exactGroups = [];
  const visitedExact = new Set();

  for (let i = 0; i < regs.length; i++) {
    if (visitedExact.has(regs[i].id)) continue;
    const r1 = regs[i];
    const group = [r1];
    const pDnis1 = (r1.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);

    for (let j = i + 1; j < regs.length; j++) {
      if (visitedExact.has(regs[j].id)) continue;
      const r2 = regs[j];
      const sameTipo = (r1.tipoConcursoId === r2.tipoConcursoId || (r1.tipoConcursoNombre && r1.tipoConcursoNombre === r2.tipoConcursoNombre));
      const sameEtapa = (r1.etapa || '').toUpperCase() === (r2.etapa || '').toUpperCase();
      const sameCat = normalizeText(r1.categoria) === normalizeText(r2.categoria);
      const sameInst = normalizeText(r1.institucion) === normalizeText(r2.institucion);
      const sameDisc = normalizeText(r1.disciplina) === normalizeText(r2.disciplina);
      const samePuesto = normalizePuestoValue(r1.puesto) === normalizePuestoValue(r2.puesto);

      const pDnis2 = (r2.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
      const sharesDni = pDnis1.length > 0 && pDnis2.length > 0 && pDnis1.some(d => pDnis2.includes(d));

      if (sameTipo && sameEtapa && sameCat && sameInst && (sharesDni || (sameDisc && samePuesto))) {
        group.push(r2);
        visitedExact.add(r2.id);
      }
    }

    if (group.length > 1) {
      visitedExact.add(r1.id);
      exactGroups.push(group);
    }
  }

  // 2. Detectar conflictos de puesto
  const puestoConflicts = [];
  const topPuestos = ['1.er puesto', '2.° puesto', '3.er puesto'];
  const pMap = new Map();

  regs.forEach(r => {
    const normP = normalizePuestoValue(r.puesto);
    if (!topPuestos.includes(normP)) return;
    const key = [
      r.tipoConcursoId || r.tipoConcursoNombre,
      (r.etapa || '').toUpperCase(),
      normalizeText(r.categoria),
      normalizeText(r.disciplina),
      normP
    ].join('|');

    if (!pMap.has(key)) pMap.set(key, []);
    pMap.get(key).push(r);
  });

  pMap.forEach((group, key) => {
    if (group.length > 1) {
      puestoConflicts.push({ key, records: group });
    }
  });

  // Modal HTML
  const modalWrap = document.createElement('div');
  modalWrap.id = 'duplicateDetectorModal';
  modalWrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:850px;width:100%;max-height:90vh;overflow-y:auto;padding:26px;box-shadow:var(--shadow-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px">🔍 Detector de Duplicados en Concursos</h3>
          <button type="button" class="iconBtn" id="m_dup_close">✕</button>
        </div>

        <div class="cards" style="margin-bottom:18px">
          <div class="card"><div class="num">${exactGroups.length}</div><div class="lbl">Grupos duplicados exactos</div></div>
          <div class="card"><div class="num">${puestoConflicts.length}</div><div class="lbl">Conflictos de puestos (1°, 2°, 3°)</div></div>
        </div>

        ${exactGroups.length === 0 && puestoConflicts.length === 0 ? `
          <div style="text-align:center;padding:30px;color:var(--ink-soft)">
            <p style="font-size:18px;margin-bottom:6px">✓ ¡Excelente!</p>
            <p>No se detectaron registros duplicados ni puestos en conflicto en los concursos registrados.</p>
          </div>
        ` : ''}

        ${exactGroups.length > 0 ? `
          <div class="panel" style="margin-bottom:18px">
            <h4 style="color:var(--danger);margin-top:0">⚠️ Duplicados Exactos Detectados (${exactGroups.length})</h4>
            <p style="font-size:12.5px;color:var(--ink-soft)">Los siguientes registros coinciden en I.E., categoría, participantes y etapa:</p>
            ${exactGroups.map((grp, gIdx) => `
              <div style="border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--surface-2)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <strong>Grupo ${gIdx + 1}: ${esc(grp[0].institucion)} · ${esc(grp[0].tipoConcursoNombre || grp[0].tipoConcurso)} (${esc(grp[0].categoria)})</strong>
                  ${isAdmin ? `<button class="btn danger small" data-keep-first="${gIdx}">Conservar 1 y eliminar duplicados</button>` : ''}
                </div>
                <div class="tblWrap"><table style="font-size:12px">
                  <thead><tr><th>ID</th><th>Puesto</th><th>Área</th><th>Participantes</th><th>Fecha</th><th></th></tr></thead>
                  <tbody>
                    ${grp.map((r, rIdx) => `
                      <tr>
                        <td><small style="color:var(--ink-soft)">${esc(r.id)}</small></td>
                        <td>${formatPuestoBadge(r.puesto)}</td>
                        <td>${esc(r.disciplina || '—')}</td>
                        <td>${(r.participantes || []).map(p => esc([p.nombres, p.apellidos].filter(Boolean).join(' ')) + (p.dni ? ` (${esc(p.dni)})` : '')).join('<br>') || '—'}</td>
                        <td>${fmtDate(r.fecha)}</td>
                        <td>${isAdmin ? `<button class="actBtn delBtn" data-del-dup="${esc(r.id)}">✕</button>` : ''}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${puestoConflicts.length > 0 ? `
          <div class="panel" style="margin-bottom:18px">
            <h4 style="color:var(--warn);margin-top:0">⚠️ Conflictos de Puesto (Mismo puesto registrado más de una vez)</h4>
            <p style="font-size:12.5px;color:var(--ink-soft)">Existen dos o más instituciones con el mismo puesto en la misma categoría y disciplina:</p>
            ${puestoConflicts.map((conf, cIdx) => `
              <div style="border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--surface-2)">
                <div style="margin-bottom:8px">
                  <strong>Conflicto ${cIdx + 1}: ${esc(conf.records[0].tipoConcursoNombre || conf.records[0].tipoConcurso)} · Cat: ${esc(conf.records[0].categoria)} ${conf.records[0].disciplina ? '· ' + esc(conf.records[0].disciplina) : ''} · Puesto: ${formatPuestoBadge(conf.records[0].puesto)}</strong>
                </div>
                <div class="tblWrap"><table style="font-size:12px">
                  <thead><tr><th>Institución</th><th>Participantes</th><th>Etapa</th><th>Fecha</th><th></th></tr></thead>
                  <tbody>
                    ${conf.records.map(r => `
                      <tr>
                        <td><strong>${esc(r.institucion)}</strong></td>
                        <td>${(r.participantes || []).map(p => esc([p.nombres, p.apellidos].filter(Boolean).join(' '))).join(', ') || '—'}</td>
                        <td><span class="badge badge-etapa">${esc(r.etapa)}</span></td>
                        <td>${fmtDate(r.fecha)}</td>
                        <td>${isAdmin ? `<button class="actBtn delBtn" data-del-dup="${esc(r.id)}">✕</button>` : ''}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <button type="button" class="btn secondary" id="m_dup_cancel">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const closeModal = () => { modalWrap.remove(); };
  modalWrap.querySelector('#m_dup_close').addEventListener('click', closeModal);
  modalWrap.querySelector('#m_dup_cancel').addEventListener('click', closeModal);

  modalWrap.querySelectorAll('[data-del-dup]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este registro de concurso duplicado?')) return;
      btn.disabled = true;
      try {
        await dbNs.collection('concursoRegistros').doc(btn.dataset.delDup).delete();
        showToast('Registro duplicado eliminado.');
        closeModal();
        renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
      } catch (err) {
        console.error('Error eliminando duplicado', err);
        showToast('No se pudo eliminar el registro.');
        btn.disabled = false;
      }
    });
  });

  modalWrap.querySelectorAll('[data-keep-first]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gIdx = Number(btn.dataset.keepFirst);
      const grp = exactGroups[gIdx];
      if (!grp || grp.length < 2) return;
      if (!confirm(`¿Deseas conservar el primer registro y eliminar los ${grp.length - 1} registros duplicados de este grupo?`)) return;
      btn.disabled = true;
      btn.textContent = 'Eliminando...';
      try {
        const batch = dbNs.batch();
        for (let k = 1; k < grp.length; k++) {
          batch.delete(dbNs.collection('concursoRegistros').doc(grp[k].id));
        }
        await batch.commit();
        showToast(`✓ Se eliminaron ${grp.length - 1} duplicados correctamente.`);
        closeModal();
        renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
      } catch (err) {
        console.error('Error eliminando lote de duplicados', err);
        showToast('Error al eliminar los duplicados.');
        btn.disabled = false;
      }
    });
  });
}


