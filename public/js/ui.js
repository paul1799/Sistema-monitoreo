/* =========================================================================
   ui.js — Manejo del DOM, eventos, renderizado de vistas, pestañas y modales.
   ========================================================================= */

/* ── Fase 1: Motor de cálculo puro (sin DOM) ───────────────────────────── */
import { calcScore, estadoPorRegla } from './calcEngine.js?v=20260925_v1';
import * as RepDatos from './reportes-datos.js?v=20260925';

import { AI_SCAN_ENDPOINT } from './firebase-config.js?v=20260918_v8';
import {
  createOfficialPdfDocument,
  exportFichaIndividualPdf,
  exportConsolidadoReportPdf,
  exportConcursosReportPdf,
  exportJfenFichasPdf,
  exportActaOrdenMeritoPdf,
  exportColegiosReportPdf,
  formatDate,
  formatPersonName,
  formatearNombre,
  parseArteDisciplina,
  formatResolucionRef,
  formatPuestoLabel,
  puestoRank,
  generateVerificationCode,
  getLimaDateStr,
  getFormatoPdfConcurso,
  getConcursoConfig,
  formatearCuerpoTecnicoTexto,
  obtenerCuerpoTecnicoGrupo,
  generarConcursoCuerpoTecnicoDocId,
  esDisciplinaColectiva,
  exportJedpaFichasPdf,
  exportFichasGrupalesConcursoPdf,
  getTituloConsolidadoConcurso,
  PALETA_ESTANDAR,
  formatCodigoModular,
  JEDPA_THEME
} from './pdf-template.js?v=20260925_v8';

import {
  isFichaEbrGestionEscolar,
  renderEbrGestionForm,
  collectEbrGestionFormData,
  preloadEbrFormState,
  resetEbrFormState,
  EBR_GESTION_VISITA_1_SECCIONES,
  EBR_GESTION_VISITA_2_SECCIONES
} from './ebr-gestion.js?v=20260925_v8';

import {
  syncDirectivosFromFicha,
  getDirectivosForColegio,
  getDirectivosActivosForColegio
} from './directorio.js?v=20260925_v8';

/* ============================= CONSTANTES COMPARTIDAS ============================= */
export const RESPONSE_OPTIONS = {
  si_no: [{ v: 'si', l: 'Sí' }, { v: 'no', l: 'No' }, { v: 'na', l: 'N/A' }],
  escala_1_3: [{ v: '1', l: '1' }, { v: '2', l: '2' }, { v: '3', l: '3' }, { v: 'na', l: 'N/A' }],
  nivel_1_4: [{ v: '1', l: 'I' }, { v: '2', l: 'II' }, { v: '3', l: 'III' }, { v: '4', l: 'IV' }, { v: 'na', l: 'N/A' }],
  ips: [{ v: 'inicio', l: 'Inicio' }, { v: 'proceso', l: 'Proceso' }, { v: 'logrado', l: 'Logrado' }, { v: 'na', l: 'N/A' }],
};
export const RESPONSE_LABELS = {
  si_no: 'Sí / No',
  escala_1_3: 'Escala 1–3',
  nivel_1_4: 'Rúbrica Nivel I–IV',
  ips: 'Inicio / Proceso / Logrado',
};
export const OPTION_COLORS = {
  si_no: { si: 'var(--ok)', no: 'var(--danger)', na: 'var(--neutral)' },
  escala_1_3: { '1': 'var(--danger)', '2': 'var(--warn)', '3': 'var(--ok)', na: 'var(--neutral)' },
  nivel_1_4: { '1': 'var(--danger)', '2': 'var(--warn)', '3': '#34D399', '4': 'var(--ok)', na: 'var(--neutral)' },
  ips: { inicio: 'var(--danger)', proceso: 'var(--warn)', logrado: 'var(--ok)', na: 'var(--neutral)' },
};

export const DESCRIPTORES_NIVEL_1_4 = {
  '4': {
    romano: 'IV',
    pct: 100,
    titulo: 'Cumplimiento integral',
    descripcion: 'Evidencia el cumplimiento integral de los criterios establecidos para el aspecto evaluado. Las acciones desarrolladas son consistentes, sistemáticas y se encuentran debidamente sustentadas con evidencias verificables, contribuyendo al logro de los resultados previstos.'
  },
  '3': {
    romano: 'III',
    pct: 75,
    titulo: 'Cumplimiento de la mayoría',
    descripcion: 'Evidencia el cumplimiento de la mayoría de los criterios establecidos para el aspecto evaluado. Si bien se observan avances significativos y acciones orientadas al logro de resultados, aún existen aspectos que requieren fortalecimiento para asegurar un desempeño plenamente satisfactorio.'
  },
  '2': {
    romano: 'II',
    pct: 50,
    titulo: 'Cumplimiento parcial',
    descripcion: 'Evidencia el cumplimiento parcial de los criterios establecidos para el aspecto evaluado. Las acciones desarrolladas muestran avances incipientes o poco sistemáticos, requiriendo asistencia técnica y seguimiento para consolidar su implementación.'
  },
  '1': {
    romano: 'I',
    pct: 25,
    titulo: 'No evidencia cumplimiento mínimo',
    descripcion: 'No evidencia el cumplimiento de los criterios mínimos establecidos para el aspecto evaluado. Las acciones desarrolladas resultan insuficientes para garantizar el logro de los resultados esperados, refiriéndose acciones prioritarias de fortalecimiento y acompañamiento.'
  }
};

/* ============================= ESTADO DE APLICACIÓN Y SESIÓN ============================= */
let _appState = null;
export function setAppState(s) {
  if (s) _appState = s;
}
export function getAppState() {
  return _appState || (typeof window !== 'undefined' ? window.state : null) || {};
}

let _currentSessionUser = null;
export function setSessionUser(user) {
  if (user) _currentSessionUser = user;
}

/* ============================= ESTADO DE EDICIÓN Y ORDEN ============================= */
let editingSubmissionId = null;
let editingSubmissionData = null;
let dashboardSortAsc = true; // Por defecto: urgente (menor avance) arriba

/** Activa el modo edición de una ficha ya registrada. Llamar antes de navegar a 'registrar'. */
export function setEditMode(id, data) {
  editingSubmissionId = id;
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
  const vClean = String(v).trim().toLowerCase();
  if (tipo === 'si_no') return vClean === 'si' || vClean === 'sí' ? 1 : (vClean === 'no' ? 0 : null);
  if (tipo === 'escala_1_3') return Math.max(0, Math.min(1, (Number(vClean)) / 3));
  if (tipo === 'nivel_1_4') return Math.max(0, Math.min(1, (Number(vClean)) / 4));
  if (tipo === 'ips') return vClean === 'logrado' ? 1 : (vClean === 'proceso' ? 0.5 : (vClean === 'inicio' ? 0 : null));
  return null;
}
/**
 * Devuelve { label, cls } para mostrar el estado de una ficha.
 * Si se pasa fichaType como segundo argumento, usa su regla_nivel (si existe).
 * Compatible con todos los call-sites existentes (un argumento).
 *
 * @param {number|null} pct - Porcentaje calculado
 * @param {Object|null} [fichaType] - Opcional: documento fichaType con regla_nivel
 * @param {number} [conteo_si] - Opcional: conteo absoluto de respuestas "si"
 */
export function statusFromPct(pct, fichaType, conteo_si) {
  const regla = (fichaType && fichaType.regla_nivel) ? fichaType.regla_nivel : null;
  const estado = estadoPorRegla({ pct: pct ?? null, conteo_si: conteo_si || 0 }, regla);
  return { label: estado.nivel, cls: estado.cls };
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

/**
 * Calcula el puntaje de una ficha registrada.
 * Usa calcEngine para soportar reglas de nivel por plantilla (Fase 1).
 * El contrato de retorno es retrocompatible: siempre devuelve { pct, secciones }.
 * Ahora agrega también { estado, conteo_si } para nuevos consumidores.
 *
 * @param {{ respuestas: Array }} sub - Ficha registrada (submission)
 * @param {Object} ft - fichaType
 * @returns {{ pct: number|null, secciones: Array, estado: Object, conteo_si: number }}
 */
export function computeStats(sub, ft) {
  if (!ft || !sub || !sub.respuestas) {
    return {
      pct: null,
      secciones: [],
      estado: { label: 'Sin datos', cls: 'st-none' },
      conteo_si: 0,
    };
  }
  // Para la ficha EBR Gestion Escolar, usar las secciones del motor especializado
  // porque los IDs de items (ge1_1, ge1_2...) difieren de los del fichaType en Firestore (ge_1, ge_2...)
  let ftForCalc = ft;
  if (isFichaEbrGestionEscolar(ft) && sub.respuestas && sub.respuestas.length > 0) {
    const visita = sub.visita || 1;
    const seccionesEbr = visita === 2 ? EBR_GESTION_VISITA_2_SECCIONES : EBR_GESTION_VISITA_1_SECCIONES;
    ftForCalc = { ...ft, secciones: seccionesEbr, tipoRespuesta: 'ips', escala: 'IPL' };
  }
  const result = calcScore(sub.respuestas, ftForCalc);
  return {
    pct: result.pct,
    secciones: result.secciones,
    conteo_si: result.conteo_si,
    // Mapeamos { nivel, estado_panel, cls } → { label, cls } para compatibilidad
    estado: { label: result.estado.nivel, cls: result.estado.cls },
  };
}

export function computeItemAgg(subs, ft) {
  let activeFt = ft;
  if (isFichaEbrGestionEscolar(ft)) {
    const hasV2 = (subs || []).some(s => Number(s.visita) === 2);
    const seccionesEbr = hasV2 ? EBR_GESTION_VISITA_2_SECCIONES : EBR_GESTION_VISITA_1_SECCIONES;
    activeFt = { ...ft, secciones: (ft && ft.secciones && ft.secciones.length === seccionesEbr.length) ? ft.secciones : seccionesEbr, tipoRespuesta: 'ips' };
  }
  const tipoResp = activeFt?.tipoRespuesta || 'ips';
  return (activeFt?.secciones || []).map(sec => {
    const items = (sec.items || []).map(it => {
      const counts = {};
      let scoreSum = 0, scoreCnt = 0, total = 0;
      (subs || []).forEach(s => {
        const r = (s.respuestas || []).find(x => {
          if (!x) return false;
          if (x.id === it.id) return true;
          const normX = String(x.id || '').replace(/^ge\d*_/, 'ge_');
          const normIt = String(it.id || '').replace(/^ge\d*_/, 'ge_');
          if (normX && normIt && normX === normIt) return true;
          if (x.num && it.num && Number(x.num) === Number(it.num)) {
            if (x.seccion && sec.nombre && normalizeText(x.seccion) === normalizeText(sec.nombre)) return true;
          }
          if (x.texto && it.texto && normalizeText(x.texto) === normalizeText(it.texto)) return true;
          return false;
        });
        if (r) {
          const vClean = String(r.valor || '').trim().toLowerCase();
          if (vClean) {
            counts[vClean] = (counts[vClean] || 0) + 1;
            total++;
            const sc = scoreValue(tipoResp, vClean);
            if (sc !== null) { scoreSum += sc; scoreCnt++; }
          }
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
  const legendMap = tipoRespuesta === 'nivel_1_4' ? {
    '1': 'I = No evidencia cumplimiento mínimo (25%)',
    '2': 'II = Cumplimiento parcial (50%)',
    '3': 'III = Cumplimiento de la mayoría (75%)',
    '4': 'IV = Cumplimiento integral (100%)',
    'na': 'N/A = No aplica'
  } : {
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

  const activeOpts = tipoRespuesta === 'nivel_1_4'
    ? (RESPONSE_OPTIONS.nivel_1_4 || []).filter(o => o.v !== 'na')
    : (RESPONSE_OPTIONS[tipoRespuesta] || []);

  const legend = activeOpts.map(o => {
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
  isJfen = false,
  isJedpa = false,
  tipoConcurso = null,
  filters = {},
  formatoPdfActas = null,
  onConfirm = async (downloadConfig) => { }
}) {
  const isJfenReport = isJfen || (tipoConcurso && (tipoConcurso.id === 'jfen' || (tipoConcurso.nombre || '').toUpperCase().includes('JFEN') || (tipoConcurso.nombre || '').toUpperCase().includes('FLORALES'))) || (tipoReporte === 'concursos' && (documentTitle.toUpperCase().includes('JFEN') || documentTitle.toUpperCase().includes('FLORALES')));
  const isJedpaReport = isJedpa || (tipoReporte === 'concursos' && (documentTitle.toUpperCase().includes('JEDPA') || documentTitle.toUpperCase().includes('DEPORTIVOS')));

  const esConcursoGrupal = (tipoConcurso && (tipoConcurso.tipoParticipacion === 'grupal' || tipoConcurso.modalidad === 'colectiva' || tipoConcurso.modalidad === 'grupal')) ||
    (Array.isArray(dataRows) && dataRows.length > 0 && dataRows.some(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso)));
  const todosGrupales = (tipoConcurso && tipoConcurso.tipoParticipacion === 'grupal') ||
    (Array.isArray(dataRows) && dataRows.length > 0 && dataRows.every(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso)));

  const tieneColectivas = (isJedpaReport || esConcursoGrupal) && Array.isArray(dataRows) && dataRows.some(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso));
  const todasColectivas = (isJedpaReport || esConcursoGrupal) && Array.isArray(dataRows) && dataRows.length > 0 && dataRows.every(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso));

  const oldModal = document.getElementById('downloadConfigModal');
  if (oldModal) {
    oldModal.remove();
    unlockBodyScroll();
  }

  const areasList = (state.areasFirma && state.areasFirma.length > 0)
    ? state.areasFirma.filter(a => a.activa !== false)
    : DEFAULT_AREAS;

  let savedPref = null;
  try {
    const raw = localStorage.getItem('download_pref_' + tipoReporte);
    if (raw) savedPref = JSON.parse(raw);
  } catch (e) { }

  let currentAreaId = (savedPref && savedPref.areaId) ? savedPref.areaId : 'agebre';
  if (!areasList.some(a => a.id === currentAreaId) && currentAreaId !== 'personalizado' && currentAreaId !== 'sin_firmas') {
    const defArea = areasList.find(a => a.esPredeterminada) || areasList[0];
    currentAreaId = defArea ? defArea.id : 'agebre';
  }

  let sinFirmas = currentAreaId === 'sin_firmas' || (savedPref && savedPref.sinFirmas === true);
  let mostrarEncabezadoArea = savedPref ? (savedPref.mostrarEncabezadoArea !== false) : true;
  let incluirQr = savedPref ? (savedPref.incluirQr !== false) : true;
  let orientationChoice = savedPref ? (savedPref.orientation || 'auto') : 'auto';

  // Formato por defecto: 'fichas' para JFEN; 'fichas_equipo' para JEDPA colectivo o concursos grupales / fichas; 'completo' (tabular) para individual u otros
  let defaultFormato = 'completo';
  if (isJfenReport) {
    defaultFormato = 'fichas';
  } else if (formatoPdfActas === 'fichas_por_categoria' || todosGrupales || todasColectivas || esConcursoGrupal || (filters && filters.disciplina && esDisciplinaColectiva(filters.disciplina, null, tipoConcurso))) {
    defaultFormato = 'fichas_equipo';
  }
  let formatoConcurso = savedPref ? (savedPref.formatoConcurso || defaultFormato) : defaultFormato;
  if (!isJfenReport && formatoConcurso === 'fichas') {
    formatoConcurso = 'fichas_equipo';
  }
  if (!isJedpaReport && !esConcursoGrupal && !tieneColectivas && formatoPdfActas !== 'fichas_por_categoria' && formatoConcurso === 'fichas_equipo') {
    formatoConcurso = 'completo';
  }
  let jfenOrden = (savedPref && savedPref.ordenParticipantes) ? savedPref.ordenParticipantes : 'alfabetico';
  let jfenRepetirBarra = savedPref ? (savedPref.repetirBarraCategoria !== false) : true;
  let jfenPuestoRes = savedPref ? (savedPref.mostrarPuesto !== false) : true;
  let jfenModalidad = savedPref ? (savedPref.mostrarModalidad !== false) : true;
  let jfenResumen = savedPref ? (savedPref.incluirResumen !== false) : true;
  let jfenCuadro = savedPref ? (savedPref.incluirCuadroResumen !== false) : true;
  let jfenIntro = savedPref ? (savedPref.incluirIntro === true) : false;

  let indivIntro = savedPref ? (savedPref.incluirIntro !== false) : true;
  let indivResumen = savedPref ? (savedPref.incluirResumen !== false) : true;
  let indivCasillas = savedPref ? (savedPref.dibujarCasillas !== false) : true;
  let indivLineas = savedPref ? (savedPref.imprimirLineas !== false) : true;

  let consResumen = savedPref ? (savedPref.incluirResumenEjecutivo !== false) : true;
  let consMatriz = savedPref ? (savedPref.incluirMatriz !== false) : true;
  let consCriticos = savedPref ? (savedPref.incluirCriticos !== false) : true;
  let consItems = savedPref ? (savedPref.incluirReporteItem !== false) : true;
  let consOrden = (savedPref && savedPref.ordenDetalle) ? savedPref.ordenDetalle : 'menor_cumplimiento';

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

    if (tipoReporte === 'individual') {
      const sub0 = (dataRows && dataRows[0]) ? dataRows[0] : null;
      const dirName = sub0 ? (sub0.director && sub0.director !== '—' ? sub0.director : '') : '';
      const monName = sub0 ? (sub0.responsable && sub0.responsable !== '—' ? sub0.responsable : '') : '';
      const ieName = sub0 ? (sub0.institucion || 'Institución Educativa') : 'Institución Educativa';
      return [
        { cargo: 'Director(a) de la I.E.', nombre: dirName, entidad: ieName, leyenda: 'Firma y Sello' },
        { cargo: `Monitor(a) — ${sigla}`, nombre: monName, entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
        { cargo: `V.° B.° Jefatura de ${sigla}`, nombre: '', entidad: 'UGEL 03', leyenda: 'V.° B.°' }
      ];
    }

    if (tipoReporte === 'consolidado') {
      return [
        { cargo: `Especialista Responsable de Monitoreo — ${sigla}`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
        { cargo: `Jefatura de ${sigla} — UGEL 03 – DRELM`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
      ];
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

  // PARTE D: Análisis de datos y revisión de completitud
  const anomalies = {
    sinPuesto: 0,
    sinAsesor: 0,
    sinParticipante: 0,
    sinResolucion: 0,
    posiblesDuplicados: 0,
    dniInvalido: 0,
    sinUgelRed: 0,
    sinTurnoVisitado: 0,
    sinMonitorDni: 0,
    sinCompromisos: 0,
    sinEvidencias: 0,
    sinRespuestas: 0
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
  } else if (tipoReporte === 'individual' && Array.isArray(dataRows)) {
    dataRows.forEach(s => {
      const subExtras = s.extras || [];
      const getExtraVal = (pattern) => {
        const found = subExtras.find(x => x && x.label && x.label.toLowerCase().includes(pattern.toLowerCase()));
        return found ? found.value : '';
      };
      const turnoVisitado = s.turnoVisitado || getExtraVal('turno visitado');
      if (!turnoVisitado || turnoVisitado === '—' || turnoVisitado.trim() === '') anomalies.sinTurnoVisitado++;
      const monitorDni = s.monitorDni || getExtraVal('dni del monitor');
      if (!monitorDni || monitorDni === '—' || monitorDni.trim() === '') anomalies.sinMonitorDni++;
      if (!s.compromisoDirector && !s.compromisoMonitor && (!s.compromisos || (Array.isArray(s.compromisos) ? s.compromisos.length === 0 : true))) anomalies.sinCompromisos++;
      const resps = s.respuestas || [];
      if (resps.length === 0) anomalies.sinRespuestas++;
      const hasEvid = resps.some(r => r.evidencia && r.evidencia !== '—' && r.evidencia.trim() !== '');
      if (!hasEvid && resps.length > 0) anomalies.sinEvidencias++;
    });
  } else if (tipoReporte === 'consolidado' && Array.isArray(dataRows)) {
    dataRows.forEach(x => {
      const s = x.s || x;
      if (!s.ugel || s.ugel === '—' || !s.red || s.red === '—') anomalies.sinUgelRed++;
      const resps = s.respuestas || [];
      if (resps.length === 0) anomalies.sinRespuestas++;
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
              <h5>⚠️ Revisión previa de datos: Se detectaron campos pendientes o no registrados:</h5>
              <ul>
                ${anomalies.sinPuesto > 0 ? `<li><strong>${anomalies.sinPuesto}</strong> registro(s) sin puesto asignado (se mostrará como "—")</li>` : ''}
                ${anomalies.sinAsesor > 0 ? `<li><strong>${anomalies.sinAsesor}</strong> registro(s) sin docente asesor (se mostrará "Sin docente asesor registrado")</li>` : ''}
                ${anomalies.sinParticipante > 0 ? `<li><strong>${anomalies.sinParticipante}</strong> registro(s) sin participantes (se mostrará "Sin participante registrado")</li>` : ''}
                ${anomalies.sinResolucion > 0 ? `<li><strong>${anomalies.sinResolucion}</strong> registro(s) sin resolución de referencia</li>` : ''}
                ${anomalies.posiblesDuplicados > 0 ? `<li><strong>${anomalies.posiblesDuplicados}</strong> posible(s) registro(s) duplicado(s) detectado(s)</li>` : ''}
                ${anomalies.dniInvalido > 0 ? `<li><strong>${anomalies.dniInvalido}</strong> DNI(s) con formato no estándar (diferente de 8 dígitos numéricos)</li>` : ''}
                ${anomalies.sinUgelRed > 0 ? `<li><strong>${anomalies.sinUgelRed}</strong> ficha(s) sin UGEL o RED asignada</li>` : ''}
                ${anomalies.sinTurnoVisitado > 0 ? `<li><strong>${anomalies.sinTurnoVisitado}</strong> ficha(s) sin "Turno visitado" registrado (se mostrarán casillas en blanco)</li>` : ''}
                ${anomalies.sinMonitorDni > 0 ? `<li><strong>${anomalies.sinMonitorDni}</strong> ficha(s) sin DNI del monitor(a) (se mostrará como "No registrado")</li>` : ''}
                ${anomalies.sinCompromisos > 0 ? `<li><strong>${anomalies.sinCompromisos}</strong> ficha(s) sin compromisos registrados (se imprimirán líneas para llenado manual)</li>` : ''}
                ${anomalies.sinEvidencias > 0 ? `<li><strong>${anomalies.sinEvidencias}</strong> ficha(s) sin evidencias redactadas (las celdas quedarán en blanco)</li>` : ''}
                ${anomalies.sinRespuestas > 0 ? `<li><strong>${anomalies.sinRespuestas}</strong> ficha(s) sin respuestas registradas</li>` : ''}
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
                  <div style="display:flex;gap:16px;flex-wrap:wrap">
                    ${isJfenReport ? `
                      <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                        <input type="radio" name="dl_formato_concurso" value="fichas" ${formatoConcurso === 'fichas' ? 'checked' : ''}>
                        <strong>Fichas por categoría (oficial JFEN)</strong>
                      </label>
                    ` : ''}
                    ${(isJedpaReport || esConcursoGrupal || !isJfenReport) ? `
                      <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                        <input type="radio" name="dl_formato_concurso" value="fichas_equipo" ${formatoConcurso === 'fichas_equipo' ? 'checked' : ''}>
                        <strong>Fichas por equipo / grupo ${todosGrupales ? '(oficial grupal)' : isJedpaReport ? '(colectivo JEDPA)' : '(formato ficha)'}</strong>
                      </label>
                    ` : ''}
                    <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                      <input type="radio" name="dl_formato_concurso" value="completo" ${formatoConcurso === 'completo' ? 'checked' : ''}>
                      Listado tabular ${isJfenReport ? '(alternativo)' : isJedpaReport ? '(individuales / continuo)' : '(estándar oficial)'}
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                      <input type="radio" name="dl_formato_concurso" value="orden_merito" ${formatoConcurso === 'orden_merito' ? 'checked' : ''}>
                      Consolidado de orden de mérito (solo 1.° a 3.° puesto)
                    </label>
                  </div>

                  ${isJfenReport && formatoConcurso === 'fichas' ? `
                    <div style="margin-top:10px;padding:10px;background:#FBF9FD;border:1px solid #E9E1F0;border-radius:6px;display:flex;flex-direction:column;gap:6px">
                      <div style="font-size:12px;font-weight:700;color:#7030A0;margin-bottom:2px">Opciones de formato JFEN:</div>
                      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                        <span style="font-size:12px;color:var(--ink-soft);font-weight:600">Orden participantes:</span>
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                          <input type="radio" name="dl_jfen_orden" value="alfabetico" ${jfenOrden === 'alfabetico' ? 'checked' : ''}> Alfabético por apellidos
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                          <input type="radio" name="dl_jfen_orden" value="registro" ${jfenOrden === 'registro' ? 'checked' : ''}> Orden de registro
                        </label>
                      </div>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_repetir_barra" ${jfenRepetirBarra ? 'checked' : ''}> Repetir barra de categoría en cada ficha
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_puesto_res" ${jfenPuestoRes ? 'checked' : ''}> Mostrar filas Puesto y Resolución
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_modalidad" ${jfenModalidad ? 'checked' : ''}> Mostrar fila Modalidad (Individual / Grupal)
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_resumen" ${jfenResumen ? 'checked' : ''}> Incluir línea de resumen
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_cuadro" ${jfenCuadro ? 'checked' : ''}> Incluir cuadro "Inscripciones por categoría y Arte/Disciplina"
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_intro" ${jfenIntro ? 'checked' : ''}> Incluir párrafo introductorio ("En el marco de las bases…")
                      </label>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              ${tipoReporte === 'individual' ? `
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px;margin-top:6px;display:flex;flex-direction:column;gap:6px">
                  <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:2px">Opciones de Ficha Individual:</div>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_intro" ${indivIntro ? 'checked' : ''}> Incluir párrafo introductorio ("En el marco del monitoreo...")
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_resumen" ${indivResumen ? 'checked' : ''}> Incluir resumen de resultados (cumplimiento por dimensión y global)
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_casillas" ${indivCasillas ? 'checked' : ''}> Dibujar casillas para Condición, Nivel y Turno
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_lineas" ${indivLineas ? 'checked' : ''}> Imprimir líneas para llenado a mano si Compromisos/Observaciones están vacíos
                  </label>
                </div>
              ` : ''}

              ${tipoReporte === 'consolidado' ? `
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px;margin-top:6px;display:flex;flex-direction:column;gap:6px">
                  <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:2px">Opciones de Reporte Consolidado:</div>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_cons_resumen" ${consResumen ? 'checked' : ''}> Incluir resumen ejecutivo (puntos destacados y por fortalecer)
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_cons_matriz" ${consMatriz ? 'checked' : ''}> Incluir matriz por institución y dimensión (2 o más fichas)
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_cons_criticos" ${consCriticos ? 'checked' : ''}> Incluir sección de ítems críticos / prioridades de atención
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_cons_items" ${consItems ? 'checked' : ''}> Incluir reporte detallado por ítem con barras de nivel
                  </label>
                  <div style="display:flex;align-items:center;gap:8px;font-size:12px;margin-top:2px">
                    <span style="font-weight:600;color:var(--ink-soft)">Orden del detalle de fichas:</span>
                    <select id="dl_cons_orden" class="input" style="padding:2px 8px;font-size:12px;width:auto">
                      <option value="menor_cumplimiento" ${consOrden === 'menor_cumplimiento' ? 'selected' : ''}>Menor cumplimiento primero (urgente)</option>
                      <option value="mayor_cumplimiento" ${consOrden === 'mayor_cumplimiento' ? 'selected' : ''}>Mayor cumplimiento primero</option>
                      <option value="fecha" ${consOrden === 'fecha' ? 'selected' : ''}>Por fecha de visita (más reciente primero)</option>
                      <option value="institucion" ${consOrden === 'institucion' ? 'selected' : ''}>Alfabético por Institución Educativa</option>
                    </select>
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
    let onKey = null;
    const close = () => {
      if (onKey) window.removeEventListener('keydown', onKey);
      overlay.remove();
      unlockBodyScroll();
    };
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
      r.onchange = (e) => {
        formatoConcurso = e.target.value;
        renderModalContent();
      };
    });
    overlay.querySelectorAll('input[name="dl_jfen_orden"]').forEach(r => {
      r.onchange = (e) => { jfenOrden = e.target.value; };
    });
    const repBarCb = document.getElementById('dl_jfen_repetir_barra');
    if (repBarCb) repBarCb.onchange = (e) => { jfenRepetirBarra = e.target.checked; };
    const pResCb = document.getElementById('dl_jfen_puesto_res');
    if (pResCb) pResCb.onchange = (e) => { jfenPuestoRes = e.target.checked; };
    const modCb = document.getElementById('dl_jfen_modalidad');
    if (modCb) modCb.onchange = (e) => { jfenModalidad = e.target.checked; };
    const resCb = document.getElementById('dl_jfen_resumen');
    if (resCb) resCb.onchange = (e) => { jfenResumen = e.target.checked; };
    const cuadCb = document.getElementById('dl_jfen_cuadro');
    if (cuadCb) cuadCb.onchange = (e) => { jfenCuadro = e.target.checked; };
    const introCb = document.getElementById('dl_jfen_intro');
    if (introCb) introCb.onchange = (e) => { jfenIntro = e.target.checked; };

    const indivIntroCb = document.getElementById('dl_indiv_intro');
    if (indivIntroCb) indivIntroCb.onchange = (e) => { indivIntro = e.target.checked; };
    const indivResCb = document.getElementById('dl_indiv_resumen');
    if (indivResCb) indivResCb.onchange = (e) => { indivResumen = e.target.checked; };
    const indivCasCb = document.getElementById('dl_indiv_casillas');
    if (indivCasCb) indivCasCb.onchange = (e) => { indivCasillas = e.target.checked; };
    const indivLinCb = document.getElementById('dl_indiv_lineas');
    if (indivLinCb) indivLinCb.onchange = (e) => { indivLineas = e.target.checked; };

    const consResCb = document.getElementById('dl_cons_resumen');
    if (consResCb) consResCb.onchange = (e) => { consResumen = e.target.checked; };
    const consMatCb = document.getElementById('dl_cons_matriz');
    if (consMatCb) consMatCb.onchange = (e) => { consMatriz = e.target.checked; };
    const consCritCb = document.getElementById('dl_cons_criticos');
    if (consCritCb) consCritCb.onchange = (e) => { consCriticos = e.target.checked; };
    const consItCb = document.getElementById('dl_cons_items');
    if (consItCb) consItCb.onchange = (e) => { consItems = e.target.checked; };
    const consOrdSel = document.getElementById('dl_cons_orden');
    if (consOrdSel) consOrdSel.onchange = (e) => { consOrden = e.target.value; };

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
            formatoConcurso: (!isJfenReport && !isJedpaReport && !esConcursoGrupal && (formatoConcurso === 'fichas' || formatoConcurso === 'fichas_equipo')) ? 'completo' : formatoConcurso,
            lugar,
            fecha,
            firmantes: firmantesList,
            customAreaNombre,
            customAreaSigla,
            customAreaDesc,
            indivIntro,
            indivResumen,
            indivCasillas,
            indivLineas,
            consResumen,
            consMatriz,
            consCriticos,
            consItems,
            consOrden
          };
          localStorage.setItem('download_pref_' + tipoReporte, JSON.stringify(prefData));
          if (currentUser && dbNs) {
            dbNs.collection('preferenciasDescarga').doc(`${currentUser.uid}_${tipoReporte}`).set({
              usuarioId: currentUser.uid,
              tipoReporte,
              prefData,
              updatedAt: Date.now()
            }, { merge: true }).catch(() => { });
          }
        } catch (e) { }
      }

      const downloadConfig = {
        areaConfig: mostrarEncabezadoArea ? areaFinal : null,
        signatures: sinFirmas ? [] : firmantesList,
        lugarFecha: sinFirmas ? '' : `${lugar}, ${fecha}`,
        sinFirmas,
        incluirQr,
        orientation: orientationChoice === 'auto' ? null : orientationChoice,
        formatoConcurso,
        ordenParticipantes: jfenOrden,
        repetirBarraCategoria: jfenRepetirBarra,
        mostrarPuesto: jfenPuestoRes,
        mostrarResolucion: jfenPuestoRes,
        mostrarModalidad: jfenModalidad,
        incluirResumen: jfenResumen,
        incluirCuadroResumen: jfenCuadro,
        incluirIntro: tipoReporte === 'individual' ? indivIntro : jfenIntro,
        incluirResumen: tipoReporte === 'individual' ? indivResumen : jfenResumen,
        dibujarCasillas: indivCasillas,
        imprimirLineas: indivLineas,
        incluirResumenEjecutivo: consResumen,
        incluirMatriz: consMatriz,
        incluirCriticos: consCriticos,
        incluirReporteItem: consItems,
        ordenDetalle: consOrden,
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

    onKey = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
  }

  lockBodyScroll();
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
  if (state) _appState = state;

  const cleanConcursoParams = (tab) => {
    if (tab !== 'concursos' && typeof window !== 'undefined' && window.location) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('concurso') || url.searchParams.has('etapa') || url.searchParams.has('categoria')) {
          url.searchParams.delete('concurso');
          url.searchParams.delete('etapa');
          url.searchParams.delete('categoria');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        }
      } catch (e) {
        console.warn('Error limpiando parámetros de URL:', e);
      }
    }
  };

  document.querySelectorAll('.navbtn').forEach(b => {
    b.addEventListener('click', () => {
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.activeTab = b.dataset.tab;
      cleanConcursoParams(state.activeTab);
      renderFn();
    });
  });

  // Botón superior "Registrar ficha"
  const topRegBtn = document.getElementById('topRegistrarBtn');
  if (topRegBtn) {
    topRegBtn.addEventListener('click', () => {
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      state.activeTab = 'registrar';
      cleanConcursoParams('registrar');
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
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      state.activeTab = 'alertas';
      cleanConcursoParams('alertas');
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
  const totalTipos = state.fichaTypes.length;
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
  const pctInicio = totalConDatos ? Math.round((dist.inicio / totalConDatos) * 100) : 0;
  const pctNone = totalConDatos ? Math.round((dist.none / totalConDatos) * 100) : 0;

  const seg = '<div class="distWrap">' +
    donutChart([
      { value: dist.logrado, color: 'var(--ok)', label: 'Logrado' },
      { value: dist.proceso, color: 'var(--warn)', label: 'En proceso' },
      { value: dist.inicio, color: 'var(--danger)', label: 'Por mejorar' },
      { value: dist.none, color: 'var(--neutral)', label: 'Sin datos' },
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

/* ============================= REGISTRAR TAB & PALETA ============================= */
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
  // Asignación determinística por ID o nombre si aún no tiene color guardado
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

let registrarSubTab = 'registrar'; // 'registrar' | 'plantillas' | 'areas'
export function setRegistrarSubTab(tab) {
  registrarSubTab = ['registrar', 'plantillas', 'areas'].includes(tab) ? tab : 'registrar';
}
export function getRegistrarSubTab() { return registrarSubTab; }

let regSelectedTypeId = null;
let regCompromisos = [];
let regBuiltFor = null;
let regSelectedColegioId = null;

let fichaListSearchQuery = '';
let fichaListFilterEscala = '';
let fichaListFilterModalidad = '';
let fichaDescExpanded = {};

export function renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, isAdmin = false) {
  if (state) _appState = state;
  const actualIsAdmin = !!(isAdmin || (currentUser && currentUser.role === 'admin') || (state && state.roles && currentUser && state.roles.some(r => r.email === currentUser.email && r.role === 'admin')));

  // Si no es admin, no permitir acceso a plantillas ni a áreas
  if (!actualIsAdmin && registrarSubTab !== 'registrar') {
    registrarSubTab = 'registrar';
  }

  // Si venimos en modo edición desde consolidado/reportes, preseleccionar la ficha y forzar subtab registrar
  if (editingSubmissionData && editingSubmissionData.fichaTypeId && !regSelectedTypeId) {
    regSelectedTypeId = editingSubmissionData.fichaTypeId;
    registrarSubTab = 'registrar';
  }

  // Generador de navegación por subpestañas (solo visible si es Admin)
  const subNavHtml = actualIsAdmin ? `
    <nav class="regSubNav" id="registrarSubNav">
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'registrar' ? 'active' : ''}" data-reg-sub="registrar">
        📋 Registrar visita
      </button>
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'plantillas' ? 'active' : ''}" data-reg-sub="plantillas">
        ⚙️ Plantillas de ficha <span class="adminBadge">Admin</span>
      </button>
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'areas' ? 'active' : ''}" data-reg-sub="areas">
        ✍️ Áreas y firmantes <span class="adminBadge">Admin</span>
      </button>
    </nav>
  ` : '';

  // 1. Subpestaña: ÁREAS Y FIRMANTES
  if (registrarSubTab === 'areas') {
    renderAreasYFirmantesView(container, state, dbNs, actualIsAdmin, currentUser, getFichaType, subNavHtml, navigate);
    return;
  }

  // 2. Subpestaña: PLANTILLAS DE FICHA
  if (registrarSubTab === 'plantillas') {
    renderPlantillasManagementView(container, state, getFichaType, dbNs, actualIsAdmin, currentUser, navigate, subNavHtml);
    return;
  }

  // 3. Subpestaña: REGISTRAR (Lista visual o Formulario si hay ficha elegida)
  if (regSelectedTypeId && !getFichaType(regSelectedTypeId)) {
    regSelectedTypeId = null;
  }

  // CASO 3.A: Una ficha está seleccionada -> Mostrar encabezado activo + formulario
  if (regSelectedTypeId) {
    const ft = getFichaType(regSelectedTypeId);
    const color = getFichaColor(ft);
    const mod = getFichaModalidad(ft);

    const editBanner = editingSubmissionId
      ? '<div class="banner" style="background:var(--accent-tint);border-color:var(--accent);color:#8A6410;margin-bottom:16px">✏️ Modo edición — estás corrigiendo una ficha ya registrada. Al guardar se actualizará en Firestore.</div>'
      : '';

    container.innerHTML = `
      <div class="pageHead">
        <h2>${editingSubmissionId ? 'Corregir ficha registrada' : 'Registrar ficha'}</h2>
        <p>${editingSubmissionId ? 'Modifica los datos y guarda para actualizar la ficha en la base de datos.' : 'Completa los datos de la visita de monitoreo según la ficha seleccionada.'}</p>
      </div>
      ${subNavHtml}
      <div class="fichaActiveHeaderBar" style="border-left-color:${color.hex};">
        <div class="fichaActiveInfo">
          <div class="fichaActiveIcon" style="background:${color.bg};color:${color.hex};">
            ${esc(ft.icono || '📋')}
          </div>
          <div class="fichaActiveDetails">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span class="fichaBadge fichaBadgeModalidad">${esc(mod)}</span>
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              <span class="fichaBadge fichaBadgeItems">📑 ${(ft.secciones || []).length} secciones</span>
              <span class="fichaBadge fichaBadgeItems">🔢 ${(ft.secciones || []).reduce((a, s) => a + (s.items || []).length, 0)} ítems</span>
            </div>
            <h3 style="margin:4px 0 0 0;font-family:var(--serif);font-size:16px;color:var(--navy-900)">${esc(ft.nombre)}</h3>
          </div>
        </div>
        <button type="button" class="fichaActiveBackBtn" id="btnCambiarFicha" title="Regresar para elegir otra ficha">
          ← Cambiar ficha
        </button>
      </div>
      ${editBanner}
      <div id="regFormHost"></div>
    `;

    // Conectar subpestañas
    if (actualIsAdmin) {
      container.querySelectorAll('[data-reg-sub]').forEach(b => {
        b.onclick = () => {
          registrarSubTab = b.dataset.regSub;
          renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
        };
      });
    }

    // Botón Cambiar Ficha
    const cambiarBtn = document.getElementById('btnCambiarFicha');
    if (cambiarBtn) {
      cambiarBtn.onclick = () => {
        regSelectedTypeId = null;
        editingSubmissionId = null;
        editingSubmissionData = null;
        renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      };
    }

    buildRegForm(state, getFichaType, dbNs, currentUser, navigate);
    return;
  }

  // CASO 3.B: Ninguna ficha seleccionada -> Mostrar Lista Visual de Fichas (reemplazo del select)
  const allTypes = state.fichaTypes || [];

  if (allTypes.length === 0) {
    container.innerHTML = `
      <div class="pageHead">
        <h2>Registrar ficha</h2>
        <p>Elige la ficha que vas a aplicar en tu visita de monitoreo.</p>
      </div>
      ${subNavHtml}
      <div class="empty">
        <h4>Aún no hay tipos de ficha disponibles</h4>
        <p>${actualIsAdmin ? 'Crea la primera plantilla de ficha para comenzar a registrar visitas.' : 'Aún no hay fichas disponibles, consulta con el administrador.'}</p>
        ${actualIsAdmin ? '<button type="button" class="btn" id="btnCreateFirstFicha" style="margin-top:12px">+ Crear primer tipo de ficha</button>' : ''}
      </div>
    `;

    if (actualIsAdmin) {
      container.querySelectorAll('[data-reg-sub]').forEach(b => {
        b.onclick = () => {
          registrarSubTab = b.dataset.regSub;
          renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
        };
      });
      const createFirst = document.getElementById('btnCreateFirstFicha');
      if (createFirst) {
        createFirst.onclick = () => {
          builderState = blankBuilder();
          builderEditingId = null;
          builderIsDirty = false;
          tiposView = 'builder';
          registrarSubTab = 'plantillas';
          renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
        };
      }
    }
    return;
  }

  // Obtener todas las modalidades y escalas disponibles para los filtros rápidos
  const modalidadesSet = new Set();
  allTypes.forEach(ft => modalidadesSet.add(getFichaModalidad(ft)));
  const modalidadesList = Array.from(modalidadesSet).sort();

  const escalasSet = new Set();
  allTypes.forEach(ft => escalasSet.add(ft.tipoRespuesta));
  const escalasList = Array.from(escalasSet);

  // Filtrar según búsqueda y filtros activos
  const filteredTypes = allTypes.filter(ft => {
    if (fichaListSearchQuery) {
      const q = normalizeText(fichaListSearchQuery);
      const name = normalizeText(ft.nombre || '');
      const desc = normalizeText(ft.descripcion || '');
      const mod = normalizeText(getFichaModalidad(ft) || '');
      if (!name.includes(q) && !desc.includes(q) && !mod.includes(q)) return false;
    }
    if (fichaListFilterEscala && ft.tipoRespuesta !== fichaListFilterEscala) return false;
    if (fichaListFilterModalidad && normalizeText(getFichaModalidad(ft)) !== normalizeText(fichaListFilterModalidad)) return false;
    return true;
  });

  const cardsHtml = filteredTypes.length === 0 ? `
    <div class="empty" style="padding:32px 20px">
      <h4>No se encontraron fichas de monitoreo</h4>
      <p>No hay fichas que coincidan con "${esc(fichaListSearchQuery || fichaListFilterEscala || fichaListFilterModalidad)}".</p>
      <button type="button" class="btn secondary small" id="btnClearFichaFilters" style="margin-top:8px">Restablecer filtros</button>
    </div>
  ` : filteredTypes.map((ft, idx) => {
    const color = getFichaColor(ft, idx);
    const mod = getFichaModalidad(ft);
    const count = (state.submissions || []).filter(s => s.fichaTypeId === ft.id).length;
    const totalItems = (ft.secciones || []).reduce((a, s) => a + (s.items || []).length, 0);
    const totalSecs = (ft.secciones || []).length;
    const descText = (ft.descripcion || '').trim();
    const isExpanded = !!fichaDescExpanded[ft.id];
    const isLongDesc = descText.length > 140;

    let displayDesc = descText || 'Ficha oficial de monitoreo y acompañamiento institucional.';
    if (isLongDesc && !isExpanded) {
      displayDesc = descText.slice(0, 130) + '…';
    }

    return `
      <div class="fichaCard" data-select-card="${esc(ft.id)}" tabindex="0" role="button" aria-label="Registrar visita para ${esc(ft.nombre)}">
        <div class="fichaCardColorStripe" style="background:${color.hex};"></div>
        <div class="fichaCardMain">
          <div class="fichaCardIconWrap" style="background:${color.bg};color:${color.hex};">
            ${esc(ft.icono || '📋')}
          </div>
          <div class="fichaCardContent">
            <h3 class="fichaCardTitle">${esc(ft.nombre)}</h3>
            <p class="fichaCardDesc">
              ${esc(displayDesc)}
              ${isLongDesc ? `<span class="fichaCardDescMore" data-toggle-desc="${esc(ft.id)}">${isExpanded ? 'ver menos' : 'ver más'}</span>` : ''}
            </p>
            <div class="fichaCardBadges">
              <span class="fichaBadge fichaBadgeModalidad">${esc(mod)}</span>
              <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
              <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              <span class="fichaBadge fichaBadgeCount">📊 ${count} ${count === 1 ? 'ficha registrada' : 'fichas registradas'}</span>
            </div>
          </div>
        </div>
        <div class="fichaCardActs">
          <button type="button" class="btnRegistrarFichaAction" data-select-btn="${esc(ft.id)}">
            Registrar ficha →
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pageHead">
      <h2>Registrar ficha</h2>
      <p>Elige la ficha que vas a aplicar en tu visita de monitoreo.</p>
    </div>
    ${subNavHtml}
    <div class="fichaFilterBar">
      <div class="fichaSearchWrap">
        <span class="fichaSearchIcon">🔍</span>
        <input type="text" class="fichaSearchInput" id="fichaSearchInp" placeholder="Buscar por nombre, palabras clave, modalidad..." value="${esc(fichaListSearchQuery)}">
      </div>
      <select class="fichaFilterSelect" id="fichaFilterModalidad">
        <option value="">Todas las modalidades</option>
        ${modalidadesList.map(m => `<option value="${esc(m)}" ${fichaListFilterModalidad === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
      </select>
      <select class="fichaFilterSelect" id="fichaFilterEscala">
        <option value="">Todas las escalas</option>
        ${escalasList.map(k => `<option value="${esc(k)}" ${fichaListFilterEscala === k ? 'selected' : ''}>${esc(RESPONSE_LABELS[k] || k)}</option>`).join('')}
      </select>
      ${(fichaListSearchQuery || fichaListFilterEscala || fichaListFilterModalidad) ? `
        <button type="button" class="fichaClearFiltersBtn" id="btnClearFilters">✕ Limpiar filtros</button>
      ` : ''}
    </div>
    <div class="fichaCardsList">
      ${cardsHtml}
    </div>
  `;

  // Conectar subpestañas
  if (actualIsAdmin) {
    container.querySelectorAll('[data-reg-sub]').forEach(b => {
      b.onclick = () => {
        registrarSubTab = b.dataset.regSub;
        renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      };
    });
  }

  // Conectar buscador
  const searchInp = document.getElementById('fichaSearchInp');
  if (searchInp) {
    searchInp.oninput = (e) => {
      fichaListSearchQuery = e.target.value;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      const newInp = document.getElementById('fichaSearchInp');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
      }
    };
  }

  // Conectar filtros de select
  const selMod = document.getElementById('fichaFilterModalidad');
  if (selMod) {
    selMod.onchange = (e) => {
      fichaListFilterModalidad = e.target.value;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  }
  const selEsc = document.getElementById('fichaFilterEscala');
  if (selEsc) {
    selEsc.onchange = (e) => {
      fichaListFilterEscala = e.target.value;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  }

  const clearBtn = document.getElementById('btnClearFilters') || document.getElementById('btnClearFichaFilters');
  if (clearBtn) {
    clearBtn.onclick = () => {
      fichaListSearchQuery = '';
      fichaListFilterEscala = '';
      fichaListFilterModalidad = '';
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  }

  // Toggle "ver más" de descripciones
  container.querySelectorAll('[data-toggle-desc]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.toggleDesc;
      fichaDescExpanded[id] = !fichaDescExpanded[id];
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  });

  // Selección de ficha para registrar
  const selectFicha = (id) => {
    regSelectedTypeId = id;
    regBuiltFor = null;
    renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  container.querySelectorAll('[data-select-card]').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('[data-toggle-desc]')) return;
      selectFicha(card.dataset.selectCard);
    };
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectFicha(card.dataset.selectCard);
      }
    };
  });

  container.querySelectorAll('[data-select-btn]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      selectFicha(btn.dataset.selectBtn);
    };
  });
}

function buildRegForm(state, getFichaType, dbNs, currentUser, navigate) {
  if (state) _appState = state;
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

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
  if (isFichaEbrGestionEscolar(ft)) {
    if (editingSubmissionData) {
      preloadEbrFormState(editingSubmissionData, ft);
    }
    renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  const isDirectivo = (ft.tipoRespuesta === 'nivel_1_4') || (ft.id === 'ft_directivo') || (ft.nombre || '').toLowerCase().includes('directivo');
  const normExtras = normalizeExtras(ft.extras);

  const extrasHtml = normExtras.map((ex, i) => {
    const reqAttr = ex.required ? ' required' : '';
    const lower = (ex.label || '').toLowerCase();
    const dListAttr = lower.includes('ugel') ? ' list="dl_ugel"' : ((lower.includes('red') || lower.includes('rei')) ? ' list="dl_red"' : '');
    const inputId = 'extra_inp_' + ex.id;

    if (ex.tipo === 'numero') {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="number" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="0"' + reqAttr + '>' +
        '</div>';
    }

    if (ex.tipo === 'fecha') {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="date" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '"' + reqAttr + '>' +
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

    if (lower.includes('condici')) {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<select id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '"' + reqAttr + '>' +
        '<option value="">— Seleccionar condición —</option>' +
        '<option value="Designado">Designado</option>' +
        '<option value="Encargado">Encargado</option>' +
        '<option value="Nombrado">Nombrado</option>' +
        '<option value="Otro">Otro (especificar)</option>' +
        '</select>' +
        '<input type="text" id="' + inputId + '_otro" placeholder="Especificar condición..." style="display:none;margin-top:6px">' +
        '</div>';
    }

    if (lower.includes('nivel') && (lower.includes('atiende') || lower.includes('educativo'))) {
      return '<div class="field" style="grid-column:span 2">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px" id="' + inputId + '_grp">' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Inicial"><span>Inicial</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Primaria"><span>Primaria</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Secundaria"><span>Secundaria</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="EBE"><span>EBE</span></label>' +
        '<input type="hidden" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" value="">' +
        '</div>' +
        '</div>';
    }

    if (lower.includes('turno') && lower.includes('atenci')) {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px" id="' + inputId + '_grp">' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Mañana"><span>Mañana</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Tarde"><span>Tarde</span></label>' +
        '<input type="hidden" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" value="">' +
        '</div>' +
        '</div>';
    }

    if (lower.includes('turno') && lower.includes('visit')) {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px" id="' + inputId + '_grp">' +
        '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '_rad" value="Mañana"><span>Mañana</span></label>' +
        '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '_rad" value="Tarde"><span>Tarde</span></label>' +
        '<input type="hidden" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" value="">' +
        '</div>' +
        '</div>';
    }

    if (lower.includes('hora')) {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="time" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '"' + reqAttr + '>' +
        '</div>';
    }

    if (lower.includes('dni')) {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="text" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" maxlength="8" pattern="[0-9]{8}" placeholder="8 dígitos"' + reqAttr + '>' +
        '</div>';
    }

    const isResp = lower.includes('responsable') || lower.includes('especialista') || lower.includes('monitor');
    if (isResp) {
      return '<div class="field" style="position:relative">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="ieSearchWrap">' +
        '<input type="text" id="' + inputId + '" name="extra_' + esc(ex.id) + '" class="respAutocompleteInp" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="Buscar especialista por nombre, cargo o RED..." autocomplete="off"' + reqAttr + '>' +
        '<div class="ieDropdown respDropdown"></div>' +
        '</div>' +
        '<span class="respHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px"></span>' +
        '</div>';
    }

    return '<div class="field">' +
      '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
      '<input type="text" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="' + esc(ex.label) + '"' + dListAttr + reqAttr + '>' +
      '</div>';
  }).join('');

  // Rubrica panel plegable para tipo nivel_1_4
  const rubricaPanelHtml = (ft.tipoRespuesta === 'nivel_1_4') ? `
    <details class="rubricaDescriptivaPanel" open>
      <summary>
        <span>📋 Niveles descriptivos de la escala de valoración (Rúbrica oficial I–IV)</span>
        <span style="font-size:11px;color:var(--text-600);font-weight:normal">(clic para plegar / desplegar)</span>
      </summary>
      <div class="rubricaGrid">
        <div class="rubricaCard rubricaCardIV">
          <div class="rubricaCardHeader" style="color:var(--ok)"><span>NIVEL IV</span> <span>100%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['4'].descripcion)}</div>
        </div>
        <div class="rubricaCard rubricaCardIII">
          <div class="rubricaCardHeader" style="color:#059669"><span>NIVEL III</span> <span>75%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['3'].descripcion)}</div>
        </div>
        <div class="rubricaCard rubricaCardII">
          <div class="rubricaCardHeader" style="color:var(--warn)"><span>NIVEL II</span> <span>50%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['2'].descripcion)}</div>
        </div>
        <div class="rubricaCard rubricaCardI">
          <div class="rubricaCardHeader" style="color:var(--danger)"><span>NIVEL I</span> <span>25%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['1'].descripcion)}</div>
        </div>
      </div>
    </details>
  ` : '';

  const activeOptions = ft.tipoRespuesta === 'nivel_1_4'
    ? (RESPONSE_OPTIONS.nivel_1_4 || []).filter(o => o.v !== 'na')
    : RESPONSE_OPTIONS[ft.tipoRespuesta];

  const seccionesHtml = ft.secciones.map((sec, sIdx) => {
    const items = sec.items.map((it, iIdx) => {
      const optsHtml = activeOptions.map(o => {
        const descTooltip = (ft.tipoRespuesta === 'nivel_1_4' && DESCRIPTORES_NIVEL_1_4[o.v])
          ? `title="Nivel ${o.l}: ${esc(DESCRIPTORES_NIVEL_1_4[o.v].descripcion)}"`
          : '';
        return '<label class="optBtn" ' + descTooltip + '><input type="radio" name="item_' + it.id + '" value="' + o.v + '"><span>' + o.l + '</span></label>';
      }).join('');

      const evidenciaHtml = isDirectivo ? (
        '<div class="itemEvidencia">' +
        '<input type="text" class="evidenciaInput" name="evidencia_' + it.id + '" id="evid_' + it.id + '" placeholder="Evidencia verificable (RD, actas, planificaciones, fotos, registros, enlaces)..." aria-label="Evidencia para indicador ' + (iIdx + 1) + '">' +
        '</div>'
      ) : '';

      return '<div class="itemRow" data-item-id="' + it.id + '">' +
        '<div class="itxt"><span class="itemNum">' + (iIdx + 1) + '.</span> ' + esc(it.texto) + evidenciaHtml + '</div>' +
        '<div class="optGroup">' + optsHtml + '</div>' +
        '</div>';
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

  // Síntesis por dimensión para ficha directivo
  const sintesisDimensions = [
    'A. DIMENSIÓN ESTRATÉGICA',
    'B. DIMENSIÓN PEDAGÓGICA: ESTRATEGIAS PRIORIZADAS',
    'C. PLANIFICACIÓN CURRICULAR',
    'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA',
    'E. FORTALECIMIENTO DE LAS COMPETENCIAS DOCENTES',
    'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES'
  ];

  const sintesisRowsHtml = sintesisDimensions.map((dim, dIdx) => `
    <tr>
      <td class="dimCol"><strong>${esc(dim)}</strong></td>
      <td><textarea name="sintesis_${dIdx}_logros" placeholder="Logros observados..." aria-label="Logros ${esc(dim)}"></textarea></td>
      <td><textarea name="sintesis_${dIdx}_dificultades" placeholder="Dificultades encontradas..." aria-label="Dificultades ${esc(dim)}"></textarea></td>
      <td><textarea name="sintesis_${dIdx}_recomendaciones" placeholder="Recomendaciones / Asistencia técnica..." aria-label="Recomendaciones ${esc(dim)}"></textarea></td>
    </tr>
  `).join('');

  const sintesisPanelHtml = isDirectivo ? `
    <div class="panel">
      <div class="sectionHeaderTitle">SÍNTESIS POR DIMENSIÓN</div>
      <p class="helpText" style="margin-top:0">Consigne los principales logros, dificultades encontradas y recomendaciones de asistencia técnica para cada dimensión evaluada.</p>
      <div class="tblWrap">
        <table class="sintesisTable">
          <thead>
            <tr>
              <th style="width:25%">Dimensiones</th>
              <th style="width:25%">Logros</th>
              <th style="width:25%">Dificultades</th>
              <th style="width:25%">Recomendaciones</th>
            </tr>
          </thead>
          <tbody>
            ${sintesisRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  ` : '';

  const directivoCompromisosHtml = isDirectivo ? `
    <div class="panel">
      <div class="sectionHeaderTitle">COMPROMISOS ASUMIDOS</div>
      <div class="field" style="margin-bottom:14px">
        <label for="f_comp_director"><strong>DEL DIRECTOR(A) DE LA IE:</strong></label>
        <textarea id="f_comp_director" placeholder="Compromisos y acciones que asume la dirección escolar..." style="min-height:75px"></textarea>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="f_comp_monitor"><strong>DEL MONITOR / ESPECIALISTA:</strong></label>
        <textarea id="f_comp_monitor" placeholder="Compromisos de asistencia técnica, acompañamiento y soporte..." style="min-height:75px"></textarea>
      </div>
      <div class="sectionTitle" style="margin-top:16px">Compromisos específicos adicionales</div>
      <div class="sectionTitle" style="margin-top:16px">Compromisos pendientes anteriores</div>
      <div id="prevCompList"></div>
      <div id="compList"></div>
      <button type="button" class="btn secondary small" id="addCompBtn" style="margin-top:10px">+ Agregar compromiso adicional</button>
    </div>
  ` : `
    <div class="panel">
      <div class="sectionHeaderTitle">COMPROMISOS DE MEJORA</div>
      <div class="sectionTitle" style="margin-top:0">Compromisos pendientes anteriores</div>
      <div id="prevCompList"></div>
      <div class="sectionTitle" style="margin-top:16px">Nuevos compromisos</div>
      <div id="compList"></div>
      <button type="button" class="btn secondary small" id="addCompBtn" style="margin-top:10px">+ Agregar compromiso</button>
    </div>
  `;

  // Campos de horas dedicados para la visita
  const horasVisitaHtml = isDirectivo ? `
    <div class="field"><label for="f_hora_inicio">Hora de inicio</label><input type="time" id="f_hora_inicio" value="08:00"></div>
    <div class="field"><label for="f_hora_termino">Hora de término</label><input type="time" id="f_hora_termino" value="13:00"></div>
  ` : '';

  const totalItemsCount = ft.secciones.reduce((acc, s) => acc + s.items.length, 0);
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
    '<form id="regForm" autocomplete="off">' +
    uploadPanel +
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">DATOS DE LA VISITA</div>' +
    '<div class="fieldGrid">' +
    '<div class="field" style="grid-column:span 2">' +
    '<label for="f_institucion">Institución educativa / CEBE / PRITE *</label>' +
    '<div class="ieSearchWrap" id="ieSearchWrap">' +
    '<input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar por nombre o código modular..." required>' +
    '<div class="ieDropdown" id="ieDropdown"></div>' +
    '</div>' +
    '<span id="regColegioHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px;display:block"></span>' +
    '</div>' +
    '<div class="field"><label for="f_fecha">Fecha *</label><input type="date" id="f_fecha" value="' + todayStr() + '" required></div>' +
    '<div class="field"><label for="f_visita">N° de visita *</label><input type="number" id="f_visita" min="1" value="1" required></div>' +
    horasVisitaHtml +
    '</div>' +
    (extrasHtml ? '<div class="sectionHeaderTitle" style="margin-top:20px">DATOS GENERALES DE LA FICHA</div><div class="fieldGrid">' + extrasHtml + '</div>' : '') +
    '<datalist id="dl_ugel">' + seedSuggestions('ugel', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
    '<datalist id="dl_red">' + seedSuggestions('red', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">ASPECTOS A MONITOREAR <small style="font-weight:400;color:var(--text-600);text-transform:none;margin-left:8px">' + RESPONSE_LABELS[ft.tipoRespuesta] + '</small></div>' +
    rubricaPanelHtml +
    seccionesHtml +
    '</div>' +
    sintesisPanelHtml +
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">OBSERVACIONES GENERALES</div>' +
    '<textarea id="f_observaciones" placeholder="Hallazgos, evidencias verificables, notas de la visita..."></textarea>' +
    '</div>' +
    directivoCompromisosHtml +
    '<div class="formBottomBar">' +
    '<div class="regProgressBadge" id="regProgressBadge">Avance: <strong>0 de ' + totalItemsCount + '</strong> ítems (0%)</div>' +
    '<button type="button" class="btn secondary" id="cancelFormBtn">Cancelar</button>' +
    '<button type="submit" class="btn" id="saveFormBtn">' + submitLabel + '</button>' +
    '</div>' +
    '</form>';

  // ---- Actualizador dinámico de avance ----
  const updateProgressBadge = () => {
    const badge = document.getElementById('regProgressBadge');
    if (!badge) return;
    const checked = host.querySelectorAll('input[name^="item_"]:checked').length;
    const pct = totalItemsCount ? Math.round((checked / totalItemsCount) * 100) : 0;
    badge.innerHTML = 'Avance: <strong>' + checked + ' de ' + totalItemsCount + '</strong> ítems respondidos (' + pct + '%)';
  };
  host.querySelectorAll('input[name^="item_"]').forEach(r => {
    r.addEventListener('change', updateProgressBadge);
  });
  updateProgressBadge();

  // Control para campos especiales de condición (mostrar input 'Otro')
  host.querySelectorAll('.extraCondicionSelect').forEach(sel => {
    const otroInp = document.getElementById(sel.id + '_otro');
    if (otroInp) {
      sel.addEventListener('change', () => {
        otroInp.style.display = sel.value === 'Otro' ? 'block' : 'none';
        if (sel.value === 'Otro') otroInp.focus();
      });
    }
  });

  // Sincronizador de checkboxes agrupados (Nivel / Turno) a su input hidden
  host.querySelectorAll('input[name$="_chk"]').forEach(chk => {
    chk.addEventListener('change', () => {
      const grp = chk.closest('.optGroup');
      if (!grp) return;
      const hidden = grp.querySelector('input[type="hidden"]');
      if (!hidden) return;
      const checkedVals = Array.from(grp.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
      hidden.value = checkedVals.join(', ');
    });
  });

  // Sincronizador de radios agrupados (Turno visitado) a su input hidden
  host.querySelectorAll('input[name$="_rad"]').forEach(rad => {
    rad.addEventListener('change', () => {
      const grp = rad.closest('.optGroup');
      if (!grp) return;
      const hidden = grp.querySelector('input[type="hidden"]');
      if (hidden && rad.checked) hidden.value = rad.value;
    });
  });

  // ---- Buscador IE con dropdown ----
  const instInput = document.getElementById('f_institucion');
  const dropdown = document.getElementById('ieDropdown');
  const hint = document.getElementById('regColegioHint');

  const showDropdown = () => {
    const query = normalizeText(instInput.value);
    const colegios = state.colegios || [];
    const matches = colegios
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
        const c = (state.colegios || []).find(x => x.id === item.dataset.id);
        if (c) selectColegio(c);
        dropdown.style.display = 'none';
      });
    });
  };

  const selectColegio = (c) => {
    instInput.value = c.ie || '';
    regSelectedColegioId = c.id;

    const directivos = getDirectivosActivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);
    const dirActivo = directivos.director;

    // Auto-completar campos de cabecera configurados que correspondan al colegio
    normExtras.forEach((ex, i) => {
      const lower = (ex.label || '').toLowerCase();
      let matchVal = null;
      if (lower.includes('código') || lower.includes('codigo') || lower.includes('local') || lower.includes('modular')) {
        matchVal = c.codigoLocal || c.codigoModular;
      } else if (lower.includes('rei') || lower.includes('red')) {
        matchVal = c.rei;
      } else if (lower.includes('director') && !lower.includes('docente') && (lower.includes('nombre') || !lower.includes('dni'))) {
        matchVal = dirActivo ? dirActivo.apellidosNombres : (c.director && c.director.nombre ? c.director.nombre : '');
      } else if (lower.includes('director') && !lower.includes('docente') && lower.includes('dni')) {
        matchVal = dirActivo ? dirActivo.dni : (c.director && c.director.dni ? c.director.dni : '');
      } else if (lower.includes('director') && (lower.includes('tel') || lower.includes('cel'))) {
        matchVal = dirActivo ? dirActivo.telefono : (c.director && c.director.telefono ? c.director.telefono : '');
      } else if (lower.includes('director') && lower.includes('correo')) {
        matchVal = dirActivo ? dirActivo.correo : (c.director && c.director.correo ? c.director.correo : '');
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
        if (inp && !inp.value) {
          if (inp.type === 'number' && isNaN(Number(matchVal))) {
            console.warn('Skipping assignment: cannot assign string to number input', matchVal);
          } else if (inp.type === 'date' && !matchVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.warn('Skipping assignment: cannot assign string to date input', matchVal);
          } else {
            inp.value = matchVal;
          }
        }
      }

      // Mapeo inteligente para Condición de directivo si el padrón indica NOMBRADO / DESIGNADO
      if (lower.includes('condici')) {
        const sel = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        if (sel && !sel.value) {
          const g = normalizeText(c.tipoGestion || c.gestion || '');
          if (g.includes('nombrado')) sel.value = 'Nombrado';
          else if (g.includes('designado')) sel.value = 'Designado';
          else if (g.includes('encargado')) sel.value = 'Encargado';
        }
      }

      // Mapeo inteligente para Nivel educativo (Inicial, Primaria, Secundaria, EBE)
      if (lower.includes('nivel') && (lower.includes('atiende') || lower.includes('educativo'))) {
        const grp = document.getElementById('extra_inp_' + ex.id + '_grp');
        const hidden = document.getElementById('extra_inp_' + ex.id);
        if (grp && hidden && !hidden.value) {
          const niv = normalizeText(c.nivelServicio || c.nivel || c.modalidad || '');
          const checkedVals = [];
          if (niv.includes('inicial')) { const chk = grp.querySelector('input[value="Inicial"]'); if (chk) { chk.checked = true; checkedVals.push('Inicial'); } }
          if (niv.includes('primaria')) { const chk = grp.querySelector('input[value="Primaria"]'); if (chk) { chk.checked = true; checkedVals.push('Primaria'); } }
          if (niv.includes('secundaria')) { const chk = grp.querySelector('input[value="Secundaria"]'); if (chk) { chk.checked = true; checkedVals.push('Secundaria'); } }
          if (niv.includes('ebe') || niv.includes('cebe') || niv.includes('especial')) { const chk = grp.querySelector('input[value="EBE"]'); if (chk) { chk.checked = true; checkedVals.push('EBE'); } }
          hidden.value = checkedVals.join(', ');
        }
      }

      // Mapeo inteligente para Turnos (Mañana, Tarde)
      if (lower.includes('turno') && lower.includes('atenci')) {
        const grp = document.getElementById('extra_inp_' + ex.id + '_grp');
        const hidden = document.getElementById('extra_inp_' + ex.id);
        if (grp && hidden && !hidden.value) {
          const tur = normalizeText(c.turnos || '');
          const checkedVals = [];
          if (tur.includes('mañana') || tur.includes('manana')) { const chk = grp.querySelector('input[value="Mañana"]'); if (chk) { chk.checked = true; checkedVals.push('Mañana'); } }
          if (tur.includes('tarde')) { const chk = grp.querySelector('input[value="Tarde"]'); if (chk) { chk.checked = true; checkedVals.push('Tarde'); } }
          hidden.value = checkedVals.join(', ');
        }
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
    renderPrevCompromisos(c.ie);
  };

  const renderPrevCompromisos = (ieName) => {
    const el = document.getElementById('prevCompList');
    if (!el) return;
    const allC = state.compromisos || [];
    const pending = allC.filter(c => c.institucion === ieName && c.estado !== 'Cumplido' && c.estado !== 'Anulado');
    
    if (pending.length === 0) {
      el.innerHTML = '<p class="helpText" style="margin-top:0">No hay compromisos pendientes anteriores para esta institución.</p>';
      return;
    }
    
    el.innerHTML = '<ul style="padding-left:18px;margin-top:0">' + pending.map(c => 
      '<li style="margin-bottom:8px;font-size:13.5px">' +
      '<strong>' + esc(c.responsable || 'Responsable') + ':</strong> ' + esc(c.texto) + 
      ' <br><span style="color:var(--ink-soft);font-size:12px">Plazo: ' + (c.plazo ? fmtDate(c.plazo) : 'N/A') + '</span>' +
      ' <button type="button" class="btn btn-sm secondary btnClosePrevComp" style="padding:2px 6px;margin-left:8px" data-cid="' + esc(c.id) + '">Marcar Cumplido ✓</button>' +
      '</li>'
    ).join('') + '</ul>';

    el.querySelectorAll('.btnClosePrevComp').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Marcar este compromiso previo como cumplido?')) return;
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        try {
          const batch = dbNs.batch();
          batch.update(dbNs.collection('compromisos').doc(btn.dataset.cid), { estado: 'Cumplido', updatedAt: Date.now() });
          await batch.commit();
          showToast('Compromiso previo marcado como cumplido.');
          renderPrevCompromisos(ieName);
        } catch (err) {
          console.error(err);
          showToast('Error al actualizar el compromiso.');
          btn.disabled = false;
          btn.textContent = 'Cumplido ✓';
        }
      });
    });
  };

  instInput.addEventListener('input', showDropdown);
  instInput.addEventListener('focus', () => { if (instInput.value.length === 0) showDropdown(); });
  instInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });

  // ---- Autocompletado de Responsables ----
  const respInputs = host.querySelectorAll('.respAutocompleteInp');

  function selectResponsable(r, inp, hintEl) {
    inp.value = r.nombresApellidos || r.especialista || '';
    if (hintEl) {
      hintEl.style.display = 'block';
      hintEl.textContent = '✓ ' + (r.cargo || r.especialista || 'Especialista') +
        (r.red ? ' · ' + r.red : '') +
        (r.modalidad ? ' · ' + r.modalidad : '') +
        (r.celular ? ' · Cel: ' + r.celular : '');
    }

    // Auto-completar otros campos relativos al especialista (DNI, cargo, correo, celular, etc.)
    normExtras.forEach((ex, idx) => {
      const lower = (ex.label || '').toLowerCase();
      const otherInp = host.querySelector('[data-extra-id="' + ex.id + '"]') || host.querySelector('[data-extra-idx="' + idx + '"]');
      if (!otherInp || otherInp === inp) return;

      if ((lower.includes('monitor') || lower.includes('responsable') || lower.includes('especialista')) && lower.includes('dni') && r.dni && !otherInp.value) {
        otherInp.value = r.dni;
      } else if (lower.includes('cargo') && r.cargo && !otherInp.value) {
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
          '<div class="ieDropMain">' + esc(r.nombresApellidos || r.especialista) + modBadge + '</div>' +
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
        document.getElementById('f_fecha').value = d.fecha || todayStr();
        document.getElementById('f_visita').value = d.visita || 1;
        document.getElementById('f_observaciones').value = d.observaciones || '';
        if (document.getElementById('f_hora_inicio') && d.horaInicio) document.getElementById('f_hora_inicio').value = d.horaInicio;
        if (document.getElementById('f_hora_termino') && d.horaTermino) document.getElementById('f_hora_termino').value = d.horaTermino;
        if (document.getElementById('f_comp_director') && d.compromisoDirector) document.getElementById('f_comp_director').value = d.compromisoDirector;
        if (document.getElementById('f_comp_monitor') && d.compromisoMonitor) document.getElementById('f_comp_monitor').value = d.compromisoMonitor;

        regCompromisos = [...(Array.isArray(d.compromisos) ? d.compromisos : Array.isArray(d.compromisosList) ? d.compromisosList : [])];
        regSelectedColegioId = d.colegioId || null;
        renderCompList();

        // Precargar respuestas y evidencias
        (d.respuestas || []).forEach(r => {
          const radio = document.querySelector('input[name="item_' + r.id + '"][value="' + r.valor + '"]');
          if (radio) radio.checked = true;
          const evidInp = document.getElementById('evid_' + r.id) || document.querySelector('input[name="evidencia_' + r.id + '"]');
          if (evidInp && r.evidencia) evidInp.value = r.evidencia;
        });

        // Precargar síntesis por dimensión
        if (d.sintesis && d.sintesis.length) {
          d.sintesis.forEach((s, idx) => {
            const lEl = document.querySelector(`textarea[name="sintesis_${idx}_logros"]`);
            const dEl = document.querySelector(`textarea[name="sintesis_${idx}_dificultades"]`);
            const rEl = document.querySelector(`textarea[name="sintesis_${idx}_recomendaciones"]`);
            if (lEl && s.logros) lEl.value = s.logros;
            if (dEl && s.dificultades) dEl.value = s.dificultades;
            if (rEl && s.recomendaciones) rEl.value = s.recomendaciones;
          });
        }

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
            else if (l.includes('director') && (l.includes('nombre') || !l.includes('dni')) && d.director) val = d.director;
            else if (l.includes('director') && l.includes('dni') && d.directorDni) val = d.directorDni;
            else if (l.includes('condici') && d.condicion) val = d.condicion;
            else if (l.includes('nivel') && d.nivelAtencion) val = d.nivelAtencion;
            else if (l.includes('turno') && l.includes('atenci') && d.turnoAtencion) val = d.turnoAtencion;
            else if (l.includes('turno') && l.includes('visit') && d.turnoVisitado) val = d.turnoVisitado;
            else if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && !l.includes('dni') && d.responsable) val = d.responsable;
            else if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && l.includes('dni') && d.monitorDni) val = d.monitorDni;
          }

          if (val !== undefined && val !== '') {
            if (ex.tipo === 'si_no') {
              const rad = document.querySelector('input[name="extra_' + ex.id + '"][value="' + val + '"]');
              if (rad) rad.checked = true;
            } else {
              const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
              if (inp) {
                inp.value = val;
                // Si es select de condición y no está en las opciones, seleccionar 'Otro'
                if (inp.tagName === 'SELECT' && !Array.from(inp.options).some(o => o.value === val)) {
                  inp.value = 'Otro';
                  const otroInp = document.getElementById(inp.id + '_otro');
                  if (otroInp) { otroInp.style.display = 'block'; otroInp.value = val; }
                }
              }
              // Marcar checkboxes si corresponde
              const grp = document.getElementById('extra_inp_' + ex.id + '_grp');
              if (grp) {
                const parts = val.split(',').map(s => s.trim().toLowerCase());
                grp.querySelectorAll('input[type="checkbox"]').forEach(c => {
                  if (parts.includes(c.value.toLowerCase())) c.checked = true;
                });
                const rad = grp.querySelector('input[type="radio"][value="' + val + '"]');
                if (rad) rad.checked = true;
              }
            }
          }
        });

        updateProgressBadge();
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
        editingSubmissionId = null;
        editingSubmissionData = null;
        regBuiltFor = null;
        regSelectedTypeId = null;
        if (navigate) navigate('consolidado');
      } else {
        if (confirm('¿Deseas cancelar el registro? Se descartarán los cambios ingresados.')) {
          regBuiltFor = null;
          regCompromisos = [];
          regSelectedColegioId = null;
          if (navigate) navigate('dashboard');
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

  document.getElementById('regForm').addEventListener('submit', (e) => onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate));
}

function renderCompList() {
  const el = document.getElementById('compList');
  if (!el) return;
  if (regCompromisos.length === 0) { el.innerHTML = '<p class="helpText" style="margin-top:0">Sin compromisos adicionales agregados aún.</p>'; return; }
  el.innerHTML = regCompromisos.map((c, i) =>
    '<div class="compRow">' +
    '<input type="text" placeholder="Compromiso" value="' + esc(c.texto) + '" data-comp="' + i + '" data-f="texto">' +
    '<input type="text" placeholder="Responsable" value="' + esc(c.responsable) + '" data-comp="' + i + '" data-f="responsable">' +
    '<input type="date" title="Plazo (fecha límite obligatoria)" style="max-width:140px" value="' + esc(c.plazo) + '" data-comp="' + i + '" data-f="plazo" required>' +
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

async function onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate) {
  e.preventDefault();
  const activeState = state || _appState || (typeof window !== 'undefined' ? window.state : null) || {};
  const form = document.getElementById('regForm');
  const btn = (e.target && e.target.querySelector('button[type=submit]')) || document.getElementById('saveFormBtn');
  const isEdit = !!editingSubmissionId;

  // Limpiar clases y mensajes de error previos
  document.querySelectorAll('.fieldError').forEach(el => el.classList.remove('fieldError'));
  document.querySelectorAll('.fieldErrorText').forEach(el => el.remove());
  const prevBanner = document.getElementById('regFormErrorBanner');
  if (prevBanner) prevBanner.remove();

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = isEdit ? '⏳ Actualizando ficha...' : '⏳ Guardando ficha...';
  }

  try {
    if (!dbNs) {
      throw new Error('No hay conexión activa con la base de datos Firestore. Verifica tu estado de conexión a internet.');
    }
    if (!ft) {
      throw new Error('No se encontró la configuración del tipo de ficha seleccionado.');
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
    if (isFichaEbrGestionEscolar(ft)) {
      const ebrData = collectEbrGestionFormData(form || document.getElementById('regFormHost'), ft, isEdit);
      let submissionToken = isEdit ? editingSubmissionId : ((form && form.dataset.submissionId) || genId());
      if (form) form.dataset.submissionId = submissionToken;

      const docData = {
        ...ebrData,
        createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
        createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
      };

      if (isEdit) {
        await dbNs.collection('submissions').doc(editingSubmissionId).set(docData, { merge: true });
        showToast('✓ Ficha EBR actualizada correctamente.');
      } else {
        await dbNs.collection('submissions').doc(submissionToken).set(docData);
        showToast('✓ Ficha EBR registrada correctamente.');
      }

      // Sincronizar directorio de directivos
      try {
        const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...docData }, activeState, currentUser);
        if (syncRes && syncRes.summary) {
          showToast(`Ficha guardada. Directorio actualizado.`);
        }
      } catch (syncErr) {
        console.warn('Error sincronizando directorio desde ficha EBR:', syncErr);
      }

      if (!isEdit && activeState.submissions) {
        const existingIdx = activeState.submissions.findIndex(s => s.id === submissionToken);
        if (existingIdx >= 0) {
          activeState.submissions[existingIdx] = { id: submissionToken, ...docData };
        } else {
          activeState.submissions.unshift({ id: submissionToken, ...docData });
        }
      }

      if (form) form.dataset.submissionId = '';
      editingSubmissionId = null;
      editingSubmissionData = null;
      resetEbrFormState();
      regBuiltFor = null;
      regSelectedTypeId = null;
      regCompromisos = [];
      regSelectedColegioId = null;

      if (navigate) {
        navigate('consolidado');
      }
      return;
    }

    const isDirectivo = (ft.tipoRespuesta === 'nivel_1_4') || (ft.id === 'ft_directivo') || (ft.nombre || '').toLowerCase().includes('directivo');

    let firstErrorEl = null;
    const markError = (inputEl, message) => {
      if (!inputEl) return;
      inputEl.classList.add('fieldError');
      const errSpan = document.createElement('span');
      errSpan.className = 'fieldErrorText';
      errSpan.textContent = message;
      if (inputEl.parentElement) {
        inputEl.parentElement.appendChild(errSpan);
      }
      if (!firstErrorEl) firstErrorEl = inputEl;
    };

    // Validar campos obligatorios generales
    const instEl = document.getElementById('f_institucion');
    const fechaEl = document.getElementById('f_fecha');
    const visitaEl = document.getElementById('f_visita');

    const instVal = instEl ? instEl.value.trim() : '';
    if (!instVal) {
      markError(instEl, 'La institución educativa es obligatoria.');
    }

    const fechaVal = fechaEl ? fechaEl.value : '';
    if (!fechaVal) {
      markError(fechaEl, 'La fecha de la visita es obligatoria.');
    }

    const visitaVal = visitaEl ? Number(visitaEl.value) : 1;
    if (!visitaVal || visitaVal < 1) {
      markError(visitaEl, 'Ingresa un número de visita válido (mínimo 1).');
    }

    // Validar horas si se indicaron
    const horaInicioEl = document.getElementById('f_hora_inicio');
    const horaTerminoEl = document.getElementById('f_hora_termino');
    const horaInicioVal = horaInicioEl ? horaInicioEl.value.trim() : '';
    const horaTerminoVal = horaTerminoEl ? horaTerminoEl.value.trim() : '';

    if (horaInicioVal && horaTerminoVal && horaTerminoVal <= horaInicioVal) {
      markError(horaTerminoEl, 'La hora de término debe ser posterior a la hora de inicio.');
    }

    // Validar campos extra configurados como obligatorios
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
        if (inp) {
          if (inp.tagName === 'SELECT' && inp.value === 'Otro') {
            const otroInp = document.getElementById(inp.id + '_otro');
            val = otroInp && otroInp.value.trim() ? otroInp.value.trim() : 'Otro';
          } else {
            val = inp.value.trim();
          }
        }
      }

      if (ex.required && !val) {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        markError(inp, 'El campo "' + ex.label + '" es obligatorio.');
      }
      extrasCollected.push({ id: ex.id, label: ex.label, value: val, tipo: ex.tipo });
    }

    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorEl.focus();
      showToast('Por favor completa o corrige los campos obligatorios.');
      return;
    }

    // Recolectar respuestas y verificar completitud de indicadores
    const respuestas = [];
    let answeredCount = 0;
    let totalItems = 0;
    let firstUnansweredEl = null;

    ft.secciones.forEach(sec => {
      sec.items.forEach(it => {
        totalItems++;
        const chk = document.querySelector('input[name="item_' + it.id + '"]:checked');
        const evidInp = document.getElementById('evid_' + it.id) || document.querySelector('input[name="evidencia_' + it.id + '"]');
        const evidencia = evidInp ? evidInp.value.trim() : '';

        if (chk) {
          answeredCount++;
          respuestas.push({
            id: it.id,
            texto: it.texto,
            seccion: sec.nombre,
            valor: chk.value,
            evidencia: evidencia
          });
        } else {
          if (!firstUnansweredEl) {
            firstUnansweredEl = document.querySelector('input[name="item_' + it.id + '"]') || evidInp;
          }
          if (evidencia) {
            respuestas.push({
              id: it.id,
              texto: it.texto,
              seccion: sec.nombre,
              valor: null,
              evidencia: evidencia
            });
          }
        }
      });
    });

    // Control de ficha incompleta / borrador
    let esBorrador = false;
    if (answeredCount < totalItems) {
      const confirmDraft = confirm(
        'Atención: Hay ' + (totalItems - answeredCount) + ' de ' + totalItems + ' indicadores sin calificar.\n\n' +
        '¿Deseas guardar la ficha como BORRADOR (incompleta)?\n' +
        'Se calculará el avance únicamente sobre los indicadores respondidos y podrás completarla luego.'
      );
      if (!confirmDraft) {
        if (firstUnansweredEl) {
          const itemRow = firstUnansweredEl.closest('.itemRow');
          if (itemRow) itemRow.classList.add('fieldError');
          firstUnansweredEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstUnansweredEl.focus();
        }
        showToast('Completa los indicadores pendientes para registrar la ficha completa.');
        return;
      }
      esBorrador = true;
    }

    // Extracción de datos para compatibilidad de tablas y reportes
    let ugelVal = '', redVal = '', codigoVal = '', responsableVal = '', directorVal = '';
    let directorDniVal = '', condicionVal = '', nivelAtencionVal = '', turnoAtencionVal = '', turnoVisitadoVal = '', monitorDniVal = '';

    extrasCollected.forEach(ex => {
      const l = (ex.label || '').toLowerCase();
      if (l.includes('ugel') && !ugelVal) ugelVal = ex.value;
      if ((l.includes('red') || l.includes('rei')) && !redVal) redVal = ex.value;
      if ((l.includes('código') || l.includes('codigo')) && !codigoVal) codigoVal = ex.value;
      if (l.includes('director') && (l.includes('nombre') || !l.includes('dni')) && !directorVal) directorVal = ex.value;
      if (l.includes('director') && l.includes('dni') && !directorDniVal) directorDniVal = ex.value;
      if (l.includes('condici') && !condicionVal) condicionVal = ex.value;
      if (l.includes('nivel') && !nivelAtencionVal) nivelAtencionVal = ex.value;
      if (l.includes('turno') && l.includes('atenci') && !turnoAtencionVal) turnoAtencionVal = ex.value;
      if (l.includes('turno') && l.includes('visit') && !turnoVisitadoVal) turnoVisitadoVal = ex.value;
      if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && !l.includes('dni') && !responsableVal) responsableVal = ex.value;
      if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && l.includes('dni') && !monitorDniVal) monitorDniVal = ex.value;
    });

    // Vincular con padrón
    let matchedCol = null;
    if (regSelectedColegioId) {
      matchedCol = (activeState.colegios || []).find(c => c.id === regSelectedColegioId);
    }
    if (!matchedCol && instVal) {
      const instNorm = normalizeText(instVal);
      matchedCol = (activeState.colegios || []).find(c => normalizeText(c.ie) === instNorm);
    }

    if (matchedCol) {
      if (!ugelVal || ugelVal.toLowerCase().includes('sector educ')) { ugelVal = matchedCol.dependencia || 'UGEL 03'; if (ugelVal.toLowerCase().includes('sector educ')) ugelVal = 'UGEL 03'; }
      if (!redVal) redVal = matchedCol.rei || '';
      if (!codigoVal) codigoVal = matchedCol.codigoLocal || matchedCol.codigoModular || '';
      if (!directorVal && matchedCol.director && matchedCol.director.nombre) directorVal = matchedCol.director.nombre;
      if (!directorDniVal && matchedCol.director && matchedCol.director.dni) directorDniVal = matchedCol.director.dni;
      if (!condicionVal && matchedCol.tipoGestion) condicionVal = matchedCol.tipoGestion;
      if (!nivelAtencionVal && matchedCol.nivelServicio) nivelAtencionVal = matchedCol.nivelServicio;
      if (!turnoAtencionVal && matchedCol.turnos) turnoAtencionVal = matchedCol.turnos;
    }
    if (!ugelVal || ugelVal.toLowerCase().includes('sector educ')) ugelVal = 'UGEL 03';
    if (!redVal) redVal = 'No aplica';

    // Recolectar Síntesis por dimensión si es directivo
    const sintesisCollected = [];
    if (isDirectivo) {
      const sintesisDimensions = [
        'A. DIMENSIÓN ESTRATÉGICA',
        'B. DIMENSIÓN PEDAGÓGICA: ESTRATEGIAS PRIORIZADAS',
        'C. PLANIFICACIÓN CURRICULAR',
        'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA',
        'E. FORTALECIMIENTO DE LAS COMPETENCIAS DOCENTES',
        'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES'
      ];
      sintesisDimensions.forEach((dim, dIdx) => {
        const logrosEl = document.querySelector(`textarea[name="sintesis_${dIdx}_logros"]`);
        const difEl = document.querySelector(`textarea[name="sintesis_${dIdx}_dificultades"]`);
        const recEl = document.querySelector(`textarea[name="sintesis_${dIdx}_recomendaciones"]`);
        sintesisCollected.push({
          dimension: dim,
          logros: logrosEl ? logrosEl.value.trim() : '',
          dificultades: difEl ? difEl.value.trim() : '',
          recomendaciones: recEl ? recEl.value.trim() : ''
        });
      });
    }

    // Recolectar compromisos del directivo y monitor
    const compDirectorEl = document.getElementById('f_comp_director');
    const compMonitorEl = document.getElementById('f_comp_monitor');
    const compDirectorVal = compDirectorEl ? compDirectorEl.value.trim() : '';
    const compMonitorVal = compMonitorEl ? compMonitorEl.value.trim() : '';

    const allCompromisos = [...regCompromisos.filter(c => c.texto && c.texto.trim())];
    if (compDirectorVal) {
      allCompromisos.unshift({ texto: compDirectorVal, responsable: 'Director(a) de la IE', plazo: 'Año escolar 2026' });
    }
    if (compMonitorVal) {
      allCompromisos.push({ texto: compMonitorVal, responsable: 'Monitor / Especialista', plazo: 'Seguimiento continuo' });
    }

    // Token de idempotencia en cliente para prevenir duplicados en caso de reintento o doble clic
    let submissionToken = (form && form.dataset.submissionId) || genId();
    if (form) form.dataset.submissionId = submissionToken;

    const docData = {
      fichaTypeId: ft.id,
      fichaTypeNombre: ft.nombre,
      tipoRespuesta: ft.tipoRespuesta,
      institucion: instVal,
      colegioId: (matchedCol && matchedCol.id) || regSelectedColegioId || null,
      fecha: fechaVal,
      visita: Number(visitaVal) || 1,
      ugel: ugelVal,
      red: redVal,
      codigoModular: codigoVal,
      responsable: responsableVal,
      director: directorVal,
      directorDni: directorDniVal,
      condicion: condicionVal,
      nivelAtencion: nivelAtencionVal,
      turnoAtencion: turnoAtencionVal,
      turnoVisitado: turnoVisitadoVal,
      monitorDni: monitorDniVal,
      horaInicio: horaInicioVal,
      horaTermino: horaTerminoVal,
      extras: extrasCollected,
      respuestas,
      sintesis: sintesisCollected,
      compromisoDirector: compDirectorVal,
      compromisoMonitor: compMonitorVal,
      observaciones: document.getElementById('f_observaciones') ? document.getElementById('f_observaciones').value.trim() : '',
      compromisos: allCompromisos,
      esBorrador: esBorrador,
      createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
      createdAt: isEdit ? (editingSubmissionData.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    const targetId = isEdit ? editingSubmissionId : submissionToken;
    const batch = dbNs.batch();
    batch.set(dbNs.collection('submissions').doc(targetId), docData);

    allCompromisos.forEach((comp, idx) => {
      if (comp.plazo && comp.plazo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const compId = targetId + '_c' + idx;
        const cData = {
          fichaId: targetId,
          institucion: instVal,
          ugel: ugelVal,
          red: redVal,
          responsableFicha: responsableVal,
          responsableFichaDni: monitorDniVal,
          texto: comp.texto,
          responsable: comp.responsable,
          plazo: comp.plazo,
          createdBy: currentUser.uid,
          updatedAt: Date.now()
        };
        if (!isEdit) {
          cData.estado = 'Pendiente';
          cData.createdAt = Date.now();
        }
        batch.set(dbNs.collection('compromisos').doc(compId), cData, { merge: true });
      }
    });

    await batch.commit();
    showToast(isEdit ? 'Ficha actualizada correctamente.' : 'Ficha registrada correctamente.');
    /*if (false) {
      await dbNs.collection('submissions').doc(editingSubmissionId).set(docData);
      showToast('Ficha actualizada correctamente.');
    } else {
      await dbNs.collection('submissions').doc(submissionToken).set(docData);
      showToast('Ficha registrada correctamente.');
    }*/

    // Sincronizar directorio de directivos
    try {
      const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...docData }, activeState, currentUser);
      if (syncRes && syncRes.summary) {
        showToast(`Ficha guardada. Directorio actualizado.`);
      }
    } catch (syncErr) {
      console.warn('Error sincronizando directorio desde ficha:', syncErr);
    }

    // Actualizar cache local para respuesta instantánea de KPIs y tablas
    if (!isEdit && activeState.submissions) {
      const existingIdx = activeState.submissions.findIndex(s => s.id === submissionToken);
      if (existingIdx >= 0) {
        activeState.submissions[existingIdx] = { id: submissionToken, ...docData };
      } else {
        activeState.submissions.unshift({ id: submissionToken, ...docData });
      }
    }

    // Limpiar estado tras guardado exitoso
    if (form) form.dataset.submissionId = '';
    editingSubmissionId = null;
    editingSubmissionData = null;
    regBuiltFor = null;
    regSelectedTypeId = null;
    regCompromisos = [];
    regSelectedColegioId = null;

    if (navigate) {
      navigate('consolidado');
    }
  } catch (err) {
    console.error('Error al guardar submission:', err);
    const errDetails = esc(err.stack || err.message || String(err));
    const errBanner = document.createElement('div');
    errBanner.id = 'regFormErrorBanner';
    errBanner.className = 'banner';
    errBanner.style.cssText = 'background:#FEF2F2;border:1.5px solid #DC2626;color:#991B1B;padding:14px 18px;margin-bottom:18px;border-radius:8px;';
    errBanner.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">⚠️ No se pudo guardar la ficha</div>
      <div style="font-size:13px;margin-bottom:8px">Sus datos se conservaron en el formulario; intente nuevamente.</div>
      <details style="font-size:11.5px;color:#7F1D1D;cursor:pointer">
        <summary style="font-weight:600">Ver detalle técnico</summary>
        <pre style="white-space:pre-wrap;background:#FFF;padding:8px;border-radius:4px;margin-top:6px;border:1px solid #FECACA">${errDetails}</pre>
      </details>
    `;
    const formHost = document.getElementById('regFormHost') || form;
    if (formHost) formHost.insertBefore(errBanner, formHost.firstChild);
    showToast('No se pudo guardar la ficha. Sus datos se conservaron.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = isEdit ? 'Actualizar ficha' : 'Guardar ficha';
    }
  }
}

async function extractFichaFromImage(file, ft, currentUser) {
  const statusEl = document.getElementById('scanStatus');
  const btn = document.getElementById('scanBtn');
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = 'Leyendo la imagen con IA... esto puede tardar hasta un minuto.';
  const itemsDesc = ft.secciones.map(sec => 'Sección "' + sec.nombre + '":\n' + sec.items.map(it => '- id:' + it.id + ' | ' + it.texto).join('\n')).join('\n\n');
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
  if (sub.institucion) { const c = idx.byIe[normalizeText(sub.institucion)]; if (c) return c; }
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
  const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : null;
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

  // --- FASE 4: 9 Gráficos y Sugerencias ---
  let fase4Html = '';
  if (!isAllMode && ft) {
    const criticosDS = RepDatos.getRankingCriticosDataset(statsList, ft);
    const heatmapDS = RepDatos.getMapaCalorDataset(statsList, ft);
    const sugerencias = RepDatos.getSugerencias(statsList, ft, criticosDS);
    
    let sugHtml = '';
    if (sugerencias.length > 0) {
      sugHtml = '<div class="panel" style="background:#FEF3C7;border:1px solid #F59E0B;border-left:4px solid #D97706;padding:16px;">' +
        '<h3 style="color:#B45309;margin-top:0">💡 Sugerencias Automáticas</h3>' +
        '<ul style="margin-bottom:0;color:#92400E;padding-left:20px">' + 
        sugerencias.map(s => '<li><strong>' + s.tipo + ':</strong> ' + s.mensaje + '</li>').join('') + 
        '</ul></div>';
    }

    let criticosHtml = '<div class="panel"><h3>Top 5 Ítems Críticos (No/Inicio)</h3>';
    if (criticosDS.length > 0) {
      criticosHtml += criticosDS.slice(0, 5).map(c => 
        '<div class="barRow"><div class="name" style="max-width:300px;white-space:normal;line-height:1.2;font-size:11px">' + c.texto + '</div>' +
        '<div class="barTrack"><div class="barFill danger" style="width:' + c.pctCritico + '%"></div></div><div class="val">' + c.pctCritico + '%</div></div>'
      ).join('');
    } else {
      criticosHtml += '<p class="helpText">No hay ítems críticos detectados.</p>';
    }
    criticosHtml += '</div>';
    
    fase4Html = sugHtml + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">' + criticosHtml + '</div>';
  }

  const visAgg = {};
  statsList.forEach(x => { const v = x.s.visita || 1; if (!visAgg[v]) visAgg[v] = { sum: 0, cnt: 0 }; if (x.st.pct !== null) { visAgg[v].sum += x.st.pct; visAgg[v].cnt++; } });
  const visRows = Object.keys(visAgg).sort((a, b) => a - b).map(v => { const a = visAgg[v]; const avg = a.cnt ? Math.round(a.sum / a.cnt) : null; return '<div class="barRow"><div class="name">Visita ' + v + '</div>' + bar(avg) + '<div class="val">' + (avg === null ? '—' : avg + '%') + '</div></div>'; }).join('') || '<p class="helpText">Sin datos suficientes.</p>';

  const rows = statsList.map(x => {
    const s = x.s; const st = x.st; const status = statusFromPct(st.pct);
    const isOpen = consExpanded === s.id;
    const detailContent = isOpen ? buildDetail(s) : '';
    const pdfBtn = '<button class="actBtn pdfBtn" data-pdfsub="' + s.id + '" title="Descargar Ficha Oficial en PDF (A4)">📄 PDF</button>';
    const editBtn = '<button class="actBtn" data-edit="' + s.id + '" title="Corregir ficha">✏️ Editar</button>';
    const delBtn = isAdmin ? '<button class="actBtn delBtn" data-del="' + s.id + '" title="Eliminar">✕</button>' : '';
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
      const rawFtName = (subFt.nombre || 'EVALUACIÓN').trim();
      const cleanDocTitle = /^ficha\s+de\s+monitoreo/i.test(rawFtName)
        ? rawFtName.toUpperCase()
        : `FICHA DE MONITOREO — ${rawFtName.toUpperCase()}`;
      openDownloadConfigModal({
        documentTitle: cleanDocTitle,
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
  const comps = (Array.isArray(s.compromisos) ? s.compromisos : Array.isArray(s.compromisosList) ? s.compromisosList : []).map(c => '<li style="margin-bottom:4px">' + esc(c.texto) + (c.responsable ? ' — <em>' + esc(c.responsable) + '</em>' : '') + (c.plazo ? ' <span style="color:var(--ink-soft)">(' + esc(c.plazo) + ')</span>' : '') + '</li>').join('');

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
    const comps = (Array.isArray(s.compromisos) ? s.compromisos : Array.isArray(s.compromisosList) ? s.compromisosList : []).map(c => c.texto).join(' | ');
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
  rei: ['rei', 'red', 'rei / red', 'rei/red', 'red educativa'],
  codigoLocal: ['codigo local', 'codigolocal', 'cod local', 'cod. local', 'codigo_local', 'local', 'cod_local'],
  ie: ['nombre i.e.', 'nombre ie', 'i.e', 'ie', 'institucion educativa', 'nombre', 'colegio', 'nombre de la i.e.', 'i.e.'],
  modalidad: ['modalidad'],
  nivelServicio: ['nivel_sevicio', 'nivel_servicio', 'nivel de servicio', 'nivelservicio', 'nivel', 'servicio'],
  turnos: ['turnos', 'turno'],
  tipoGestion: ['tipo de gestion', 'tipo gestion', 'tipogestion', 'gestion', 'gestión'],
  dependencia: ['dependencia'],
  direccion: ['direccion', 'dirección'],
  distrito: ['distrito'],
  'director.nombre': ['director_nombres', 'director - apellidos y nombres', 'dir_nombres', 'dir_nombre', 'director apellidos y nombres', 'director: apellidos y nombres', 'apellidos y nombres director', 'director', 'director(a)'],
  'director.dni': ['director_dni', 'director - dni', 'dir_dni', 'director: dni', 'dni director'],
  'director.telefono': ['director_telefono', 'director - telefono', 'dir_telefono', 'director - teléfono', 'director: telefono', 'telefono director', 'teléfono director', 'celular director'],
  'director.correo': ['director_correo', 'director - correo', 'dir_correo', 'director: correo', 'correo director', 'email director'],
  'subDirector.nombre': ['subdir_nombres', 'subdirector_nombres', 'sub_director - apellidos y nombres', 'subdirector - apellidos y nombres', 'subdir_nombre', 'subdirector', 'sub_director', 'sub-director'],
  'subDirector.dni': ['subdir_dni', 'subdirector_dni', 'sub_director - dni', 'subdirector - dni', 'dni subdirector'],
  'subDirector.telefono': ['subdir_telefono', 'subdirector_telefono', 'sub_director - telefono', 'subdirector - telefono', 'sub-director - telefono', 'telefono subdirector', 'teléfono subdirector'],
  'subDirector.correo': ['subdir_correo', 'subdirector_correo', 'sub_director - correo', 'subdirector - correo', 'sub-director - correo', 'correo subdirector', 'email subdirector'],
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
    nombre: s(dir.nombre),
    dni: s(dir.dni),
    telefono: s(dir.telefono),
    correo: s(dir.correo),
  };

  let subDirector = null;
  if (r.subDirector && typeof r.subDirector === 'object') {
    const sd = {
      nombre: s(r.subDirector.nombre),
      dni: s(r.subDirector.dni),
      telefono: s(r.subDirector.telefono),
      correo: s(r.subDirector.correo),
    };
    if (sd.nombre || sd.dni || sd.telefono || sd.correo) {
      subDirector = sd;
    }
  }

  const docData = {
    rei: s(r.rei),
    codigoLocal: s(r.codigoLocal),
    ie: s(r.ie),
    modalidad: s(r.modalidad),
    nivelServicio: s(r.nivelServicio),
    turnos: s(r.turnos),
    tipoGestion: s(r.tipoGestion),
    dependencia: s(r.dependencia),
    direccion: s(r.direccion),
    distrito: s(r.distrito),
    director: director,
    subDirector: subDirector,
    updatedAt: now,
    createdAt: createdAt,
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
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
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
            director: { nombre: '', dni: '', telefono: '', correo: '' },
            subDirector: null,
          };
          const sd = { nombre: '', dni: '', telefono: '', correo: '' };
          let hasSubDir = false;

          Object.entries(colMap).forEach(([ci, field]) => {
            const rawVal = vals[+ci];
            const val = (rawVal === undefined || rawVal === null) ? '' : String(rawVal).trim();
            if (field.startsWith('director.')) { row.director[field.replace('director.', '')] = val; }
            else if (field.startsWith('subDirector.')) { sd[field.replace('subDirector.', '')] = val; if (val) hasSubDir = true; }
            else { row[field] = val; }
          });
          if (hasSubDir) row.subDirector = sd;

          row.codigoLocal = String(row.codigoLocal || '').trim();
          row.ie = String(row.ie || '').trim();

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
let colExpanded = null;
let colShowImport = false;
let colImportPreview = null; // {rows, errors}
let colImportResults = null; // { total, success, failures, mainErrorCode }
let colEditing = null; // null | 'new' | colegioId
let cachedCurrentUser = null;


export function renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, currentUser) {
  if (currentUser) cachedCurrentUser = currentUser;
  const bySchool = groupSubmissionsByColegio(state);
  const reiList = Array.from(new Set(state.colegios.map(c => c.rei).filter(Boolean))).sort();
  const distritoList = Array.from(new Set(state.colegios.map(c => c.distrito).filter(Boolean))).sort();
  const gestionList = Array.from(new Set(state.colegios.map(c => c.tipoGestion).filter(Boolean))).sort();

  const totalColegios = state.colegios.length;
  const sinMonitoreo = state.colegios.filter(c => (bySchool[c.id] || []).length === 0).length;
  const coberturaPct = totalColegios ? Math.round((totalColegios - sinMonitoreo) / totalColegios * 100) : null;

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
  if (colFilters.rei) filtered = filtered.filter(c => c.rei === colFilters.rei);
  if (colFilters.distrito) filtered = filtered.filter(c => normalizeText(c.distrito).includes(normalizeText(colFilters.distrito)));
  if (colFilters.tipoGestion) filtered = filtered.filter(c => c.tipoGestion === colFilters.tipoGestion);
  if (colFilters.q) filtered = filtered.filter(c => normalizeText(c.ie).includes(normalizeText(colFilters.q)) || normalizeText(c.codigoLocal).includes(normalizeText(colFilters.q)));
  if (colFilters.pendientes) filtered = filtered.filter(c => (bySchool[c.id] || []).length === 0);
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
  const fRei = document.getElementById('col_fil_rei'); if (fRei) fRei.addEventListener('change', e => { colFilters.rei = e.target.value; onFilterChange(); });
  const fDist = document.getElementById('col_fil_distrito'); if (fDist) fDist.addEventListener('input', e => { colFilters.distrito = e.target.value; onFilterChange(); });
  const fGes = document.getElementById('col_fil_gestion'); if (fGes) fGes.addEventListener('change', e => { colFilters.tipoGestion = e.target.value; onFilterChange(); });
  const fQ = document.getElementById('col_fil_q'); if (fQ) fQ.addEventListener('input', e => { colFilters.q = e.target.value; onFilterChange(); });
  const fPend = document.getElementById('col_fil_pend'); if (fPend) fPend.addEventListener('change', e => { colFilters.pendientes = e.target.checked; onFilterChange(); });
  const fClear = document.getElementById('col_fil_clear'); if (fClear) fClear.addEventListener('click', () => { colFilters = { rei: '', distrito: '', tipoGestion: '', q: '', pendientes: false }; onFilterChange(); });
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
      if (e.target.closest('[data-coledit],[data-coldel],.lnkVerEnDirectorio')) return;
      const id = tr.dataset.colrow;
      colExpanded = colExpanded === id ? null : id;
      renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
    });
  });

  container.querySelectorAll('.lnkVerEnDirectorio').forEach(lnk => {
    lnk.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const q = lnk.dataset.ieSearch || '';
      const dirBtn = document.querySelector('.navbtn[data-tab="directorio"]');
      if (dirBtn) dirBtn.click();
      setTimeout(() => {
        const inp = document.getElementById('dir_fil_q');
        if (inp) {
          inp.value = q;
          inp.dispatchEvent(new Event('input'));
        }
      }, 60);
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
  const isPartial = res.success > 0 && res.failures.length > 0;

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
  const ie = (document.getElementById('col_f_ie').value || '').trim();
  if (!codigo || !ie) { showToast('Completa Código local y Nombre I.E.'); return; }

  const id = (colEditing && colEditing !== 'new') ? colEditing : docIdForCodigo(codigo);
  const existing = state.colegios.find(x => x.id === id);

  const subNombre = (document.getElementById('col_f_sub_nombre').value || '').trim();
  const subDni = (document.getElementById('col_f_sub_dni').value || '').trim();
  const subTel = (document.getElementById('col_f_sub_tel').value || '').trim();
  const subCorreo = (document.getElementById('col_f_sub_correo').value || '').trim();

  const raw = {
    rei: (document.getElementById('col_f_rei').value || '').trim(),
    codigoLocal: codigo,
    ie: ie,
    modalidad: (document.getElementById('col_f_modalidad').value || '').trim(),
    nivelServicio: (document.getElementById('col_f_nivel').value || '').trim(),
    turnos: (document.getElementById('col_f_turnos').value || '').trim(),
    tipoGestion: (document.getElementById('col_f_gestion').value || '').trim(),
    dependencia: (document.getElementById('col_f_dependencia').value || '').trim(),
    direccion: (document.getElementById('col_f_direccion').value || '').trim(),
    distrito: (document.getElementById('col_f_distrito').value || '').trim(),
    director: {
      nombre: (document.getElementById('col_f_dir_nombre').value || '').trim(),
      dni: (document.getElementById('col_f_dir_dni').value || '').trim(),
      telefono: (document.getElementById('col_f_dir_tel').value || '').trim(),
      correo: (document.getElementById('col_f_dir_correo').value || '').trim(),
    },
    subDirector: {
      nombre: subNombre,
      dni: subDni,
      telefono: subTel,
      correo: subCorreo,
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
  const now = Date.now();

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
  const directivos = getDirectivosActivosForColegio(activeState, c.id, c.codigoLocal, c.codigoModular);
  const dir = directivos.director;
  const subdirs = directivos.subdirectores || [];

  let directivosHtml = '<div class="sectionTitle" style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">' +
    '<span>Directivos</span>' +
    '<a href="#directorio" class="lnkVerEnDirectorio" data-ie-search="' + esc(c.ie) + '" style="font-size:11.5px;font-weight:600;color:var(--primary);text-decoration:none;cursor:pointer">📋 Ver en Directorio →</a>' +
    '</div>';

  if (dir) {
    directivosHtml += '<div style="font-size:12.5px;margin-bottom:4px">' +
      '<span class="badge st-logrado" style="font-size:10.5px;margin-right:4px">Director(a)</span> ' +
      '<strong>' + esc(dir.apellidosNombres) + '</strong>' +
      (dir.dni ? ' · DNI: ' + esc(dir.dni) : '') +
      (dir.telefono ? ' · ☎ ' + esc(dir.telefono) : '') +
      (dir.correo ? ' · ✉ ' + esc(dir.correo) : '') +
      (dir.condicion ? ' · (' + esc(dir.condicion) + ')' : '') +
      '</div>';
  } else {
    directivosHtml += '<div style="font-size:12px;color:var(--ink-soft);margin-bottom:4px"><em>Director(a) sin registrar</em></div>';
  }

  if (subdirs.length) {
    subdirs.forEach(sd => {
      directivosHtml += '<div style="font-size:12.5px;margin-bottom:4px">' +
        '<span class="badge" style="font-size:10.5px;margin-right:4px;background:var(--accent-tint);color:var(--accent-dark)">Subdirector(a)</span> ' +
        '<strong>' + esc(sd.apellidosNombres) + '</strong>' +
        (sd.dni ? ' · DNI: ' + esc(sd.dni) : '') +
        (sd.telefono ? ' · ☎ ' + esc(sd.telefono) : '') +
        (sd.correo ? ' · ✉ ' + esc(sd.correo) : '') +
        (sd.condicion ? ' · (' + esc(sd.condicion) + ')' : '') +
        (sd.avisoRevision ? ' · <span class="badge st-inicio" style="font-size:10px">⚠ ' + esc(sd.avisoRevision) + '</span>' : '') +
        '</div>';
    });
  }

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
    directivosHtml +
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
      (a.trend === 'mejora' ? ' <span class="badge st-logrado" title="Mejoró respecto a la visita anterior">▲ mejoró</span>' : '') +
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
    const prevMap = {}; if (prev) (prev.respuestas || []).forEach(r => prevMap[r.id] = r.valor);
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
      '<option value="admin"' + (r.role === 'admin' ? ' selected' : '') + '>Administrador</option>' +
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
let tiposView = 'list';
let builderState = null;
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

let plantillasSearchQuery = '';
let builderPreviewMode = 'formulario'; // 'formulario' | 'documento'
let builderMobileTab = 'editor'; // 'editor' | 'preview'
let builderIsDirty = false;
let builderTestAnswers = {};

function blankBuilder() {
  return {
    nombre: '',
    descripcion: '',
    icono: '📋',
    color: FICHA_PALETTE[0].hex,
    modalidad: 'General',
    tipoRespuesta: 'si_no',
    secciones: [{ nombre: 'Sección 1: Planificación y Gestión', items: [{ id: genId(), texto: '' }] }],
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
  if (!bs) return;
  const icoEl = document.getElementById('b_icono');
  if (icoEl) bs.icono = icoEl.value;
  const nomEl = document.getElementById('b_nombre');
  if (nomEl) bs.nombre = nomEl.value;
  const descEl = document.getElementById('b_desc');
  if (descEl) bs.descripcion = descEl.value;
  const tipoEl = document.getElementById('b_tipo');
  if (tipoEl) bs.tipoRespuesta = tipoEl.value;
  const modEl = document.getElementById('b_modalidad');
  if (modEl) bs.modalidad = modEl.value;

  const activeColorEl = container.querySelector('.colorSwatch.active');
  if (activeColorEl && activeColorEl.dataset.color) {
    bs.color = activeColorEl.dataset.color;
  }

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

  builderIsDirty = true;
}

/** Duplica un tipo de ficha existente creando una copia limpia con nuevos identificadores */
export async function duplicateFichaType(ft, dbNs, state, onDone) {
  if (!dbNs) { showToast('Sin conexión a la base de datos.'); return; }
  try {
    const copyName = `${ft.nombre} (Copia)`;
    const newColor = getFichaColor(ft).hex;
    const newModalidad = getFichaModalidad(ft);
    const clonedSecciones = (ft.secciones || []).map(s => ({
      nombre: s.nombre || '',
      items: (s.items || []).map(it => ({ id: genId(), texto: it.texto || '' }))
    }));
    const clonedExtras = (ft.extras || []).map(ex => ({ ...ex, id: genId() }));
    const payload = {
      nombre: copyName,
      descripcion: ft.descripcion || '',
      icono: ft.icono || '📋',
      tipoRespuesta: ft.tipoRespuesta || 'si_no',
      color: newColor,
      modalidad: newModalidad,
      secciones: clonedSecciones,
      extras: clonedExtras,
      createdAt: Date.now()
    };
    await dbNs.collection('fichaTypes').add(payload);
    showToast(`✓ Ficha duplicada como "${copyName}"`);
    if (onDone) onDone();
  } catch (err) {
    console.error(err);
    showToast('Error al duplicar la ficha: ' + err.message);
  }
}

/** Cuadro de diálogo modal accesible con advertencia de impacto antes de eliminar */
export function confirmDeleteFichaType(ft, state, dbNs, onDeleted) {
  const count = (state.submissions || []).filter(s => s.fichaTypeId === ft.id).length;
  const modalWrap = document.createElement('div');
  modalWrap.className = 'downloadModalOverlay';
  modalWrap.innerHTML = `
    <div class="downloadModalCard" style="max-width:500px">
      <div class="downloadModalHeader" style="background:#B91C1C;color:#FFFFFF">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">🗑️</span>
          <h3 style="color:#FFFFFF;margin:0">Eliminar tipo de ficha</h3>
        </div>
        <button type="button" class="downloadModalClose" id="m_del_close" style="color:#FFF">✕</button>
      </div>
      <div class="downloadModalBody" style="padding:20px">
        <p style="font-size:14px;margin-top:0">
          ¿Estás seguro de que deseas eliminar la plantilla <strong>"${esc(ft.nombre)}"</strong>?
        </p>
        ${count > 0 ? `
          <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:8px;padding:12px;margin:14px 0;font-size:12.5px;color:#991B1B;line-height:1.45">
            <strong>⚠️ Atención: Existen ${count} visita(s) registradas con esta ficha.</strong><br>
            Las fichas ya registradas se conservarán en los reportes históricos y en el sistema, pero ya no podrán registrarse nuevas visitas ni editarse con esta plantilla.
          </div>
        ` : `
          <p style="font-size:12.5px;color:var(--text-600);margin-bottom:0">Esta plantilla no tiene visitas asociadas. Esta acción no se puede deshacer.</p>
        `}
      </div>
      <div class="downloadModalFooter" style="display:flex;justify-content:flex-end;gap:10px">
        <button type="button" class="btn secondary" id="m_del_cancel">Cancelar</button>
        <button type="button" class="btn danger" id="m_del_confirm">Sí, eliminar ficha</button>
      </div>
    </div>
  `;
  lockBodyScroll();
  document.body.appendChild(modalWrap);
  const close = () => {
    modalWrap.remove();
    unlockBodyScroll();
  };
  modalWrap.querySelector('#m_del_close').onclick = close;
  modalWrap.querySelector('#m_del_cancel').onclick = close;
  modalWrap.querySelector('#m_del_confirm').onclick = async () => {
    const btn = modalWrap.querySelector('#m_del_confirm');
    btn.disabled = true;
    btn.textContent = 'Eliminando...';
    try {
      await dbNs.collection('fichaTypes').doc(ft.id).delete();
      showToast('✓ Tipo de ficha eliminado.');
      close();
      if (onDeleted) onDeleted();
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Sí, eliminar ficha';
    }
  };
}

export function renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml) {
  if (tiposView === 'builder') {
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    return;
  }

  const allTypes = state.fichaTypes || [];
  const filtered = allTypes.filter(ft => {
    if (plantillasSearchQuery) {
      const q = normalizeText(plantillasSearchQuery);
      const name = normalizeText(ft.nombre || '');
      const desc = normalizeText(ft.descripcion || '');
      const mod = normalizeText(getFichaModalidad(ft) || '');
      if (!name.includes(q) && !desc.includes(q) && !mod.includes(q)) return false;
    }
    return true;
  });

  const cardsHtml = filtered.length === 0 ? `
    <div class="empty" style="padding:32px 20px">
      <h4>${allTypes.length === 0 ? 'Aún no hay plantillas de ficha' : 'No se encontraron plantillas'}</h4>
      <p>${allTypes.length === 0 ? 'Crea la primera plantilla de ficha para comenzar a registrar visitas.' : `No hay resultados para "${esc(plantillasSearchQuery)}".`}</p>
      ${allTypes.length === 0 ? '<button type="button" class="btn" id="btnCreateNewFtEmpty" style="margin-top:10px">+ Nuevo tipo de ficha</button>' : ''}
    </div>
  ` : filtered.map((ft, idx) => {
    const color = getFichaColor(ft, idx);
    const mod = getFichaModalidad(ft);
    const count = (state.submissions || []).filter(s => s.fichaTypeId === ft.id).length;
    const totalItems = (ft.secciones || []).reduce((a, s) => a + (s.items || []).length, 0);
    const totalSecs = (ft.secciones || []).length;
    const descText = (ft.descripcion || '').trim();
    const isExpanded = !!fichaDescExpanded[ft.id];
    const isLongDesc = descText.length > 140;
    let displayDesc = descText || 'Sin descripción adicional.';
    if (isLongDesc && !isExpanded) displayDesc = descText.slice(0, 130) + '…';

    return `
      <div class="fichaCard" style="cursor:default">
        <div class="fichaCardColorStripe" style="background:${color.hex};"></div>
        <div class="fichaCardMain">
          <div class="fichaCardIconWrap" style="background:${color.bg};color:${color.hex};">
            ${esc(ft.icono || '📋')}
          </div>
          <div class="fichaCardContent">
            <h3 class="fichaCardTitle">${esc(ft.nombre)}</h3>
            <p class="fichaCardDesc">
              ${esc(displayDesc)}
              ${isLongDesc ? `<span class="fichaCardDescMore" data-toggle-desc="${esc(ft.id)}">${isExpanded ? 'ver menos' : 'ver más'}</span>` : ''}
            </p>
            <div class="fichaCardBadges">
              <span class="fichaBadge fichaBadgeModalidad">${esc(mod)}</span>
              <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
              <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              <span class="fichaBadge fichaBadgeCount">📊 ${count} ${count === 1 ? 'ficha registrada' : 'fichas registradas'}</span>
            </div>
          </div>
        </div>
        <div class="fichaCardActs" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn secondary small" data-edit-ft="${esc(ft.id)}" title="Editar estructura de la ficha">
            ✏️ Editar
          </button>
          <button type="button" class="btn secondary small" data-dup-ft="${esc(ft.id)}" title="Duplicar como nueva ficha">
            📋 Duplicar
          </button>
          <button type="button" class="btn danger small" data-del-ft="${esc(ft.id)}" title="Eliminar ficha">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pageHead">
      <h2>Plantillas de Ficha</h2>
      <p>Gestiona, crea, edita y duplica los tipos de ficha de monitoreo oficial.</p>
    </div>
    ${subNavHtml}
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px">
      <div class="fichaSearchWrap" style="max-width:380px">
        <span class="fichaSearchIcon">🔍</span>
        <input type="text" class="fichaSearchInput" id="plantillasSearchInp" placeholder="Filtrar plantillas..." value="${esc(plantillasSearchQuery)}">
      </div>
      <button type="button" class="btn" id="btnNewFichaType">
        ＋ Nuevo tipo de ficha
      </button>
    </div>
    <div class="fichaCardsList">
      ${cardsHtml}
    </div>
  `;

  // Attach subnav events
  container.querySelectorAll('[data-reg-sub]').forEach(b => {
    b.onclick = () => {
      registrarSubTab = b.dataset.regSub;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, isAdmin);
    };
  });

  // Attach search
  const sInp = document.getElementById('plantillasSearchInp');
  if (sInp) {
    sInp.oninput = (e) => {
      plantillasSearchQuery = e.target.value;
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      const newInp = document.getElementById('plantillasSearchInp');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
      }
    };
  }

  // "+ Nuevo tipo de ficha"
  const newBtn = document.getElementById('btnNewFichaType') || document.getElementById('btnCreateNewFtEmpty');
  if (newBtn) {
    newBtn.onclick = () => {
      builderState = blankBuilder();
      builderEditingId = null;
      builderIsDirty = false;
      tiposView = 'builder';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  }

  // Toggle "ver más"
  container.querySelectorAll('[data-toggle-desc]').forEach(btn => {
    btn.onclick = (e) => {
      const id = btn.dataset.toggleDesc;
      fichaDescExpanded[id] = !fichaDescExpanded[id];
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  });

  // Editar
  container.querySelectorAll('[data-edit-ft]').forEach(btn => {
    btn.onclick = () => {
      const ft = getFichaType(btn.dataset.editFt);
      if (!ft) return;
      builderState = JSON.parse(JSON.stringify(ft));
      builderState.extras = normalizeExtras(builderState.extras);
      builderEditingId = ft.id;
      builderIsDirty = false;
      tiposView = 'builder';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  });

  // Duplicar
  container.querySelectorAll('[data-dup-ft]').forEach(btn => {
    btn.onclick = () => {
      const ft = getFichaType(btn.dataset.dupFt);
      if (ft) duplicateFichaType(ft, dbNs, state, () => {
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      });
    };
  });

  // Eliminar
  container.querySelectorAll('[data-del-ft]').forEach(btn => {
    btn.onclick = () => {
      const ft = getFichaType(btn.dataset.delFt);
      if (ft) confirmDeleteFichaType(ft, state, dbNs, () => {
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      });
    };
  });
}

/** Compatibilidad hacia atrás para llamadas externas a renderTiposTab */
export function renderTiposTab(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null) {
  setRegistrarSubTab('plantillas');
  renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, null, isAdmin);
}

let currentAreaReportTab = 'concursos'; // 'concursos' | 'consolidado' | 'individual' | 'avance'

function renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType, subNavHtml = '', navigate = null) {
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
      <h2>Áreas y Firmantes Oficiales</h2>
      <p>Administra las áreas de la UGEL 03, sus descripciones para membrete y las plantillas de firmantes por tipo de reporte.</p>
    </div>
    ${subNavHtml || ''}
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

  if (subNavHtml) {
    container.querySelectorAll('[data-reg-sub]').forEach(b => {
      b.onclick = () => {
        registrarSubTab = b.dataset.regSub;
        renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, isAdmin);
      };
    });
  }

  container.querySelectorAll('[data-rtab]').forEach(b => {
    b.onclick = () => {
      currentAreaReportTab = b.dataset.rtab;
      renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType, subNavHtml, navigate);
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

  lockBodyScroll();
  host.appendChild(modalWrap);

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  const close = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };
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
            await dbNs.collection('areasFirma').doc(a.id).update({ esPredeterminada: false }).catch(() => { });
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
    concursos: 'Consolidado Oficial de Resultados de Concursos',
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

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  const close = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };

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
          await dbNs.collection('plantillasFirmantes').doc(p.id).delete().catch(() => { });
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

  lockBodyScroll();
  host.appendChild(modalWrap);
  renderInner();
  modalWrap.querySelector('#m_f_close').onclick = close;
}

export function renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null, navigate = null, subNavHtml = '') {
  const bs = builderState;
  bs.extras = normalizeExtras(bs.extras);
  if (!bs.color) {
    bs.color = (FICHA_PALETTE[0] || {}).hex || '#1E40AF';
  }
  if (!bs.modalidad) {
    bs.modalidad = 'General';
  }

  const existingCount = builderEditingId
    ? (state.submissions || []).filter(s => s.fichaTypeId === builderEditingId).length
    : 0;

  const MODALIDADES = ['General', 'JEC', 'CEBE', 'PRITE', 'EBR', 'Directivos', 'Docentes', 'Tutoría'];

  // Generar HTML de Secciones para el editor
  const seccionesHtml = (bs.secciones || []).map((sec, si) => {
    const itemsHtml = (sec.items || []).map((it, ii) =>
      '<div class="listRow itemDefRow" style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
      '<span style="font-size:11px;font-weight:600;color:var(--ink-soft);min-width:26px">#' + (si + 1) + '.' + (ii + 1) + '</span>' +
      '<input type="text" placeholder="Texto del ítem / indicador de monitoreo *" value="' + esc(it.texto) + '" data-sec="' + si + '" data-item="' + ii + '" style="flex:1">' +
      '<button type="button" class="iconBtn" data-rmitem="' + si + '|' + ii + '" title="Quitar ítem">✕</button>' +
      '</div>'
    ).join('');

    const isFirst = si === 0;
    const isLast = si === (bs.secciones || []).length - 1;

    return '<fieldset class="secCard" draggable="true" data-sec-idx="' + si + '" style="margin-bottom:14px;border:1px solid var(--line);border-radius:var(--radius);padding:14px">' +
      '<legend style="padding:0 8px;font-weight:700;display:flex;align-items:center;gap:6px">' +
      '<span class="secCardHandle" title="Arrastra para mover la sección" style="cursor:grab">⠿</span> ' +
      '<span class="secOrderBadge" style="background:var(--primary);color:#fff;border-radius:10px;padding:1px 7px;font-size:11px">#' + (si + 1) + '</span> ' +
      '<input type="text" placeholder="Nombre de la sección / dimensión *" value="' + esc(sec.nombre) + '" data-secname="' + si + '" style="font-family:inherit;font-weight:600;border:none;border-bottom:1.5px solid var(--line-strong);padding:3px 6px;width:320px;background:transparent">' +
      '</legend>' +
      '<div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px dashed var(--line)">' +
      '<span style="font-size:12px;color:var(--ink-soft);margin-right:auto">Mover posición:</span>' +
      '<button type="button" class="btn secondary small" data-movesec="' + si + '|up"' + (isFirst ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '') + ' title="Mover sección arriba">▲ Subir</button>' +
      '<button type="button" class="btn secondary small" data-movesec="' + si + '|down"' + (isLast ? ' disabled style="opacity:0.35;cursor:not-allowed"' : '') + ' title="Mover sección abajo">▼ Bajar</button>' +
      '</div>' +
      itemsHtml +
      '<div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
      '<button type="button" class="btn secondary small" data-additem="' + si + '">＋ Agregar ítem</button>' +
      '<button type="button" class="btn danger small" data-rmsec="' + si + '">🗑️ Quitar sección</button>' +
      '</div>' +
      '</fieldset>';
  }).join('') || '<p class="helpText" style="padding:10px;border:1px dashed var(--line);border-radius:6px">Sin secciones. Agrega la primera sección para esta ficha.</p>';

  // Generar HTML de Extras de cabecera
  const extrasHtml = (bs.extras || []).map((ex, i) => {
    const isFirst = i === 0;
    const isLast = i === (bs.extras || []).length - 1;
    return '<div class="extraDefRow" data-extra-idx="' + i + '" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding:6px;background:var(--surface-2);border-radius:6px">' +
      '<span class="secOrderBadge" style="font-size:11px;font-weight:700">#' + (i + 1) + '</span>' +
      '<input type="text" class="extraLabelInp" placeholder="Etiqueta del campo (ej: Director(a), Teléfono)" value="' + esc(ex.label) + '" data-extralabel="' + i + '" style="flex:1">' +
      '<select class="extraTipoSel" data-extratipo="' + i + '" style="max-width:130px">' +
      '<option value="texto"' + (ex.tipo === 'texto' ? ' selected' : '') + '>Texto corto</option>' +
      '<option value="numero"' + (ex.tipo === 'numero' ? ' selected' : '') + '>Número</option>' +
      '<option value="fecha"' + (ex.tipo === 'fecha' ? ' selected' : '') + '>Fecha</option>' +
      '<option value="si_no"' + (ex.tipo === 'si_no' ? ' selected' : '') + '>Sí / No</option>' +
      '</select>' +
      '<label class="extraReqLabel" style="font-size:11.5px;display:flex;align-items:center;gap:4px;cursor:pointer">' +
      '<input type="checkbox" data-extrareq="' + i + '"' + (ex.required ? ' checked' : '') + '> Req.' +
      '</label>' +
      '<div class="extraActs" style="display:flex;gap:4px">' +
      '<button type="button" class="iconBtn small" data-moveextra="' + i + '|up"' + (isFirst ? ' disabled' : '') + ' title="Subir">▲</button>' +
      '<button type="button" class="iconBtn small" data-moveextra="' + i + '|down"' + (isLast ? ' disabled' : '') + ' title="Bajar">▼</button>' +
      '<button type="button" class="iconBtn small" data-rmextra="' + i + '" title="Quitar">✕</button>' +
      '</div>' +
      '</div>';
  }).join('') || '<p class="helpText">Sin campos personalizados de cabecera.</p>';

  // Render Layout Completo: Editor + Vista Previa Sticky
  container.innerHTML = `
    <div class="pageHead" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <h2>${builderEditingId ? 'Editar tipo de ficha' : 'Nuevo tipo de ficha'}</h2>
        <p>Configura la estructura, indicadores y escala de valoración con vista previa en tiempo real.</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span id="dirtyIndicator" style="display:${builderIsDirty ? 'inline-flex' : 'none'};align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--amber-700);background:var(--amber-50);border:1px solid var(--amber-200);border-radius:12px;padding:3px 10px">
          ● Cambios sin guardar
        </span>
        <div class="builderMobileToggle" id="builderMobileToggle">
          <button type="button" class="btn secondary small ${builderMobileTab === 'editor' ? 'active' : ''}" id="btnShowEditorMobile">✏️ Editor</button>
          <button type="button" class="btn secondary small ${builderMobileTab === 'preview' ? 'active' : ''}" id="btnShowPreviewMobile">👁️ Vista previa</button>
        </div>
      </div>
    </div>

    ${subNavHtml || ''}

    <div class="builderSplitGrid">
      <!-- PANEL IZQUIERDO: FORMULARIO DEL EDITOR -->
      <div class="builderEditorPane ${builderMobileTab === 'preview' ? 'mobileHidden' : ''}" id="builderEditorPane">
        
        <!-- Panel 1: Datos Generales -->
        <div class="panel">
          <h3 style="margin-top:0">Datos Generales de la Ficha</h3>
          <div class="fieldGrid">
            <div class="field" style="max-width:110px">
              <label for="b_icono">Ícono</label>
              <input type="text" id="b_icono" value="${esc(bs.icono || '📋')}" maxlength="4" style="text-align:center;font-size:18px">
            </div>
            <div class="field" style="grid-column:span 2">
              <label for="b_nombre">Nombre completo de la ficha *</label>
              <input type="text" id="b_nombre" value="${esc(bs.nombre)}" placeholder="Ej: Ficha de Monitoreo a la Gestión Escolar">
            </div>
          </div>

          <div class="field" style="margin-top:10px">
            <label for="b_desc">Descripción institucional</label>
            <textarea id="b_desc" rows="2" placeholder="Breve descripción del propósito de la ficha">${esc(bs.descripcion || '')}</textarea>
          </div>

          <div class="fieldGrid" style="margin-top:10px">
            <div class="field">
              <label for="b_modalidad">Nivel / Modalidad educativa</label>
              <select id="b_modalidad">
                ${MODALIDADES.map(m => `<option value="${m}"${(bs.modalidad === m) ? ' selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="b_tipo">Escala de respuesta</label>
              <select id="b_tipo">
                ${Object.keys(RESPONSE_LABELS).map(k => `<option value="${k}"${(k === bs.tipoRespuesta) ? ' selected' : ''}>${RESPONSE_LABELS[k]}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Paleta de Color Institucional -->
          <div class="field" style="margin-top:12px">
            <label style="margin-bottom:6px;display:block">Color distintivo de la ficha:</label>
            <div class="colorSwatches" id="colorSwatchesList">
              ${FICHA_PALETTE.map(c => `
                <button type="button" class="colorSwatch ${(bs.color && bs.color.toLowerCase() === c.hex.toLowerCase()) ? 'active' : ''}" data-color="${c.hex}" style="background:${c.hex}" title="${c.name}"></button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Panel 2: Campos de Cabecera Configurables -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <h3 style="margin:0">Campos de Cabecera <small style="font-weight:normal;color:var(--ink-soft)">(adicionales a I.E., Fecha y N° Visita)</small></h3>
            <button type="button" class="btn secondary small" id="addExtraBtn">＋ Agregar campo</button>
          </div>
          <div id="extrasList">${extrasHtml}</div>
        </div>

        <!-- Panel 3: Secciones e Ítems -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h3 style="margin:0">Secciones e Indicadores de Monitoreo</h3>
            <button type="button" class="btn secondary small" id="addSecBtn">＋ Agregar sección</button>
          </div>
          <div id="seccionesList">${seccionesHtml}</div>
        </div>

        <!-- Panel 4: Acciones Guardar / Cancelar -->
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:20px 0 40px">
          <button type="button" class="btn" id="saveTipoBtn">💾 Guardar ficha</button>
          <button type="button" class="btn secondary" id="saveDraftBtn">📝 Guardar borrador</button>
          <button type="button" class="btn secondary" id="cancelTipoBtn">Cancelar</button>
        </div>

      </div>

      <!-- PANEL DERECHO: VISTA PREVIA EN VIVO STICKY -->
      <div class="builderPreviewPane ${builderMobileTab === 'editor' ? 'mobileHidden' : ''}" id="builderPreviewPane">
        <div class="builderPreviewSticky">
          <div class="builderPreviewHeader" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding-bottom:10px;border-bottom:1px solid var(--line);margin-bottom:12px">
            <div>
              <h4 style="margin:0;font-size:14px;font-weight:700">Vista previa en tiempo real</h4>
              <span style="font-size:11.5px;color:var(--ink-soft)">Se actualiza automáticamente al escribir</span>
            </div>
            <div class="builderPreviewTabs">
              <button type="button" class="builderPreviewTab ${builderPreviewMode === 'formulario' ? 'active' : ''}" data-preview-mode="formulario">📋 Formulario</button>
              <button type="button" class="builderPreviewTab ${builderPreviewMode === 'documento' ? 'active' : ''}" data-preview-mode="documento">📄 Documento</button>
            </div>
          </div>

          <!-- Contenedor dinámico de la vista previa -->
          <div id="builderPreviewContent"></div>
        </div>
      </div>
    </div>
  `;

  // Función que genera el HTML de la vista previa en vivo
  function buildPreviewInnerHtml() {
    const totalSecs = (bs.secciones || []).length;
    const totalItems = (bs.secciones || []).reduce((acc, s) => acc + (s.items || []).length, 0);

    // Detección de campos incompletos para avisos de corrección
    const errors = [];
    if (!bs.nombre || !bs.nombre.trim()) {
      errors.push({ msg: 'Falta ingresar el nombre de la ficha', target: '#b_nombre' });
    }
    if (!bs.secciones || bs.secciones.length === 0) {
      errors.push({ msg: 'Debes agregar al menos una sección', target: '#addSecBtn' });
    } else {
      bs.secciones.forEach((sec, si) => {
        if (!sec.nombre || !sec.nombre.trim()) {
          errors.push({ msg: `La sección #${si + 1} no tiene título`, target: `[data-secname="${si}"]` });
        }
        if (!sec.items || sec.items.length === 0) {
          errors.push({ msg: `La sección #${si + 1} ("${sec.nombre || 'Sin nombre'}") no tiene ítems`, target: `[data-additem="${si}"]` });
        } else {
          sec.items.forEach((it, ii) => {
            if (!it.texto || !it.texto.trim()) {
              errors.push({ msg: `El ítem #${ii + 1} en la sección #${si + 1} está vacío`, target: `[data-sec="${si}"][data-item="${ii}"]` });
            }
          });
        }
      });
    }

    // Mini tarjeta de lista
    const curColor = bs.color || FICHA_PALETTE[0].hex;
    const curPal = FICHA_PALETTE.find(p => p.hex.toLowerCase() === curColor.toLowerCase()) || { hex: curColor, bg: curColor + '18' };

    const miniCardHtml = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-400);margin-bottom:6px">Así se verá en la lista de fichas:</div>
      <div class="fichaCard previewMiniCard" style="margin-bottom:14px;box-shadow:none;border:1px solid var(--line);cursor:default">
        <div class="fichaCardColorStripe" style="background:${curPal.hex};"></div>
        <div class="fichaCardMain" style="padding:10px 14px">
          <div class="fichaCardIconWrap" style="background:${curPal.bg};color:${curPal.hex};width:38px;height:38px;font-size:20px">
            ${esc(bs.icono || '📋')}
          </div>
          <div class="fichaCardContent">
            <h4 class="fichaCardTitle" style="font-size:14px">${esc(bs.nombre || 'Nombre de la ficha')}</h4>
            <p class="fichaCardDesc" style="font-size:12px">${esc(bs.descripcion || 'Sin descripción.')}</p>
            <div class="fichaCardBadges" style="margin-top:6px">
              <span class="fichaBadge fichaBadgeModalidad">${esc(bs.modalidad || 'General')}</span>
              <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
              <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Avisos de validación
    const validationBoxHtml = errors.length > 0 ? `
      <div class="previewValidationBox" style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;margin-bottom:14px">
        <div style="font-weight:700;font-size:12px;color:#92400E;margin-bottom:6px">⚠️ Campos incompletos (${errors.length}) — Haz clic para corregir:</div>
        <ul style="margin:0;padding-left:18px;font-size:12px;color:#B45309">
          ${errors.map(err => `
            <li style="margin-bottom:3px">
              <a href="javascript:void(0)" class="previewValItem" data-target="${esc(err.target)}" style="color:#B45309;text-decoration:underline">
                ${esc(err.msg)}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : `
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#065F46;display:flex;align-items:center;gap:6px">
        <span>✓</span> <strong>Estructura completa y consistente.</strong> Lista para registrar visitas.
      </div>
    `;

    const statsBarHtml = `
      <div style="display:flex;gap:12px;font-size:12px;color:var(--text-600);margin-bottom:14px;padding:6px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--line)">
        <span>📑 <strong>${totalSecs}</strong> ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
        <span>🔢 <strong>${totalItems}</strong> ítems</span>
        <span>⚖️ <strong>${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</strong></span>
      </div>
    `;

    const impactAlertHtml = (existingCount > 0) ? `
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#1E40AF;line-height:1.4">
        ℹ️ <strong>Atención:</strong> Esta plantilla tiene <strong>${existingCount}</strong> visita(s) registradas históricamente. Modificar ítems se aplicará a nuevas visitas.
      </div>
    ` : '';

    // Renderizar modo específico (Formulario o Documento)
    let modeContentHtml = '';

    if (builderPreviewMode === 'formulario') {
      // Modo Formulario de Registro
      let answeredCount = 0;
      let currentScore = 0;
      let maxScore = 0;

      (bs.secciones || []).forEach(sec => {
        (sec.items || []).forEach(it => {
          const ans = builderTestAnswers[it.id];
          if (ans !== undefined && ans !== null && ans !== '') {
            answeredCount++;
            if (bs.tipoRespuesta === 'si_no') {
              maxScore += 1;
              if (ans === 'si' || ans === '1') currentScore += 1;
            } else if (bs.tipoRespuesta === 'escala1_3') {
              maxScore += 3;
              currentScore += Number(ans) || 0;
            } else if (bs.tipoRespuesta === 'escala1_4' || bs.tipoRespuesta === 'rubrica1_4') {
              maxScore += 4;
              currentScore += Number(ans) || 0;
            } else if (bs.tipoRespuesta === 'escala1_5') {
              maxScore += 5;
              currentScore += Number(ans) || 0;
            }
          }
        });
      });
      const pctScore = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;

      const testScoreBar = totalItems > 0 ? `
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-700)">Simulación de Calificación en vivo:</div>
            <div style="font-size:11.5px;color:var(--text-500)">Respondidos: ${answeredCount} de ${totalItems} | Puntaje: <strong>${currentScore}</strong> / ${maxScore || totalItems}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:20px;font-weight:800;color:var(--primary)">${pctScore}%</span>
          </div>
        </div>
      ` : '';

      modeContentHtml = `
        <div class="previewFormSheet" style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px">
          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);border:1px dashed var(--line);border-radius:6px;padding:8px 12px;margin-bottom:14px">
            <div style="font-size:12px;color:var(--text-600)">🧪 <strong>Modo prueba:</strong> Marca respuestas para probar el formulario sin guardar datos.</div>
            <button type="button" class="btn secondary small" id="btnResetTest" style="padding:2px 8px;font-size:11px">Limpiar prueba</button>
          </div>

          ${testScoreBar}

          <!-- Simulación de cabecera de visita -->
          <div style="background:var(--surface-2);border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:12px">
            <div style="font-weight:700;color:var(--text-700);margin-bottom:6px">Datos de la visita (Simulación):</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div><strong>I.E.:</strong> <span style="color:var(--text-500)">I.E. 1153 Alfonso Ugarte</span></div>
              <div><strong>Fecha:</strong> <span style="color:var(--text-500)">2026-09-24</span></div>
              <div><strong>N° Visita:</strong> <span style="color:var(--text-500)">Visita 1</span></div>
              ${(bs.extras || []).map(ex => `
                <div><strong>${esc(ex.label)}:</strong> <span style="color:var(--text-400)">[${esc(ex.tipo)}]</span></div>
              `).join('')}
            </div>
          </div>

          <!-- Secciones e ítems interactivos -->
          ${(bs.secciones || []).map((sec, si) => `
            <div style="margin-bottom:16px;border:1px solid var(--line);border-radius:6px;overflow:hidden">
              <div style="background:var(--surface-3);padding:8px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-weight:700;font-size:12.5px;color:var(--ink)">
                  #${si + 1}: ${esc(sec.nombre || 'Sección sin título')}
                </span>
                <a href="javascript:void(0)" class="previewValItem" data-target="[data-secname='${si}']" style="font-size:11px;color:var(--primary);text-decoration:underline">
                  ✏️ Editar sección
                </a>
              </div>
              <div style="padding:8px 12px">
                ${(sec.items || []).map((it, ii) => {
        const ans = builderTestAnswers[it.id] || '';
        return `
                    <div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:6px">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                        <span style="font-size:12px;color:var(--ink);font-weight:500">
                          <strong style="color:var(--primary)">${si + 1}.${ii + 1}</strong> ${esc(it.texto || 'Ítem sin texto')}
                        </span>
                        <a href="javascript:void(0)" class="previewValItem" data-target="[data-sec='${si}'][data-item='${ii}']" style="font-size:11px;color:var(--ink-soft)" title="Ir a editar este ítem">
                          ✏️
                        </a>
                      </div>
                      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:11.5px">
                        ${renderItemResponseInputs(it, bs.tipoRespuesta, ans)}
                      </div>
                    </div>
                  `;
      }).join('') || '<p style="font-size:11.5px;color:var(--text-400);margin:4px 0">Sin ítems en esta sección.</p>'}
              </div>
            </div>
          `).join('') || '<p style="font-size:12px;color:var(--text-400)">Sin secciones agregadas.</p>'}
        </div>
      `;
    } else {
      // Modo Documento Oficial Impreso
      modeContentHtml = `
        <div class="previewDocSheet" style="background:#FFFFFF;border:1px solid var(--line-strong);border-radius:6px;padding:20px;font-family:var(--sans);color:#1F2937">
          <div style="text-align:center;border-bottom:2px solid #1E3A8A;padding-bottom:10px;margin-bottom:14px">
            <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#4B5563;text-transform:uppercase">Ministerio de Educación · DRE Lima Metropolitana</div>
            <div style="font-size:13px;font-weight:800;letter-spacing:0.5px;color:#1E3A8A;margin:2px 0">UNIDAD DE GESTIÓN EDUCATIVA LOCAL N° 03</div>
            <div style="font-size:10.5px;color:#6B7280">Panel de Monitoreo y Acompañamiento Pedagógico 2026</div>
            <h3 style="font-size:15px;font-weight:800;margin:10px 0 4px;color:#1E40AF;text-transform:uppercase">${esc(bs.nombre || 'NOMBRE DE LA FICHA')}</h3>
            <div style="font-size:11px;font-weight:600;color:#4B5563">Modalidad: ${esc(bs.modalidad || 'General')} · Escala: ${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</div>
          </div>

          <!-- Metadatos de Cabecera Oficial -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px">
            <tr>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700;width:25%">Institución Educativa:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;width:40%">[Nombre de la I.E.]</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700;width:15%">Cód. Modular:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px">[0123456]</td>
            </tr>
            <tr>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">Red Educativa:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px">[REI 01]</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">Fecha / N° Visita:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px">[DD/MM/AAAA · Visita 1]</td>
            </tr>
            ${(bs.extras || []).map(ex => `
              <tr>
                <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">${esc(ex.label)}:</td>
                <td colspan="3" style="border:1px solid #D1D5DB;padding:4px 8px;color:#6B7280">[${esc(ex.tipo)}]</td>
              </tr>
            `).join('')}
          </table>

          <!-- Tabla de Dimensiones e Indicadores -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10.5px">
            <thead>
              <tr style="background:#1E3A8A;color:#FFFFFF">
                <th style="border:1px solid #1E3A8A;padding:5px;width:32px;text-align:center">N°</th>
                <th style="border:1px solid #1E3A8A;padding:5px;text-align:left">Dimensión / Criterio / Indicador</th>
                <th style="border:1px solid #1E3A8A;padding:5px;width:100px;text-align:center">Valoración</th>
              </tr>
            </thead>
            <tbody>
              ${(bs.secciones || []).map((sec, si) => `
                <tr style="background:#F9FAFB;font-weight:700">
                  <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#1E3A8A">#${si + 1}</td>
                  <td colspan="2" style="border:1px solid #E5E7EB;padding:4px;text-transform:uppercase;color:#111827">${esc(sec.nombre || 'Sección sin título')}</td>
                </tr>
                ${(sec.items || []).map((it, ii) => `
                  <tr>
                    <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#6B7280">${si + 1}.${ii + 1}</td>
                    <td style="border:1px solid #E5E7EB;padding:4px">${esc(it.texto || 'Ítem sin texto')}</td>
                    <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#9CA3AF">[____]</td>
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>

          <!-- Bloque de Firmas Institucionales -->
          <div style="display:flex;justify-content:space-around;gap:20px;margin-top:24px;padding-top:16px">
            <div style="flex:1;text-align:center">
              <div style="border-top:1px dashed #4B5563;width:75%;margin:0 auto 4px"></div>
              <div style="font-size:10.5px;font-weight:700;color:#111827">Firma y Sello del Director(a)</div>
              <div style="font-size:9.5px;color:#6B7280">Institución Educativa</div>
            </div>
            <div style="flex:1;text-align:center">
              <div style="border-top:1px dashed #4B5563;width:75%;margin:0 auto 4px"></div>
              <div style="font-size:10.5px;font-weight:700;color:#111827">Firma y Sello del Especialista</div>
              <div style="font-size:9.5px;color:#6B7280">UGEL 03 · DRELM</div>
            </div>
          </div>
        </div>
      `;
    }

    return miniCardHtml + validationBoxHtml + statsBarHtml + impactAlertHtml + modeContentHtml;
  }

  // Helper para generar opciones de respuesta interactivas en modo prueba
  function renderItemResponseInputs(it, tipoRespuesta, curVal) {
    if (tipoRespuesta === 'si_no') {
      return `
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${it.id}" value="si" ${curVal === 'si' ? 'checked' : ''} data-test-item="${it.id}"> Sí</label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${it.id}" value="no" ${curVal === 'no' ? 'checked' : ''} data-test-item="${it.id}"> No</label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${it.id}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${it.id}"> N/A</label>
      `;
    }
    if (tipoRespuesta === 'escala1_3') {
      return [1, 2, 3].map(v => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${it.id}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${it.id}"> ${v}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${it.id}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${it.id}"> N/A</label>`;
    }
    if (tipoRespuesta === 'rubrica1_4') {
      const lvls = ['I', 'II', 'III', 'IV'];
      return lvls.map((lvl, idx) => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${it.id}" value="${idx + 1}" ${String(curVal) === String(idx + 1) ? 'checked' : ''} data-test-item="${it.id}"> Nivel ${lvl}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${it.id}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${it.id}"> N/A</label>`;
    }
    if (tipoRespuesta === 'escala1_5') {
      return [1, 2, 3, 4, 5].map(v => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${it.id}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${it.id}"> ${v}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${it.id}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${it.id}"> N/A</label>`;
    }
    // Default escala 1-4
    return [1, 2, 3, 4].map(v => `
      <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${it.id}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${it.id}"> ${v}</label>
    `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${it.id}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${it.id}"> N/A</label>`;
  }

  // Actualiza únicamente la vista previa sin tocar los inputs del editor (evita perder el foco al escribir)
  function updatePreviewOnly() {
    const previewBox = document.getElementById('builderPreviewContent');
    if (!previewBox) return;
    previewBox.innerHTML = buildPreviewInnerHtml();
    attachPreviewEvents();

    const di = document.getElementById('dirtyIndicator');
    if (di) di.style.display = builderIsDirty ? 'inline-flex' : 'none';
  }

  // Eventos dentro de la vista previa
  function attachPreviewEvents() {
    const previewBox = document.getElementById('builderPreviewContent');
    if (!previewBox) return;

    // Clic en avisos o enlaces de edición para saltar al campo del editor
    previewBox.querySelectorAll('.previewValItem').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const targetSel = link.dataset.target;
        if (!targetSel) return;

        // Si estamos en móvil y mostrando vista previa, alternar a editor
        if (builderMobileTab === 'preview') {
          builderMobileTab = 'editor';
          const ep = document.getElementById('builderEditorPane');
          const pp = document.getElementById('builderPreviewPane');
          const bEd = document.getElementById('btnShowEditorMobile');
          const bPr = document.getElementById('btnShowPreviewMobile');
          if (ep && pp) {
            ep.classList.remove('mobileHidden');
            pp.classList.add('mobileHidden');
          }
          if (bEd && bPr) {
            bEd.classList.add('active');
            bPr.classList.remove('active');
          }
        }

        const targetEl = container.querySelector(targetSel);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (targetEl.focus) targetEl.focus();
          targetEl.classList.add('itemHighlightFlash');
          setTimeout(() => targetEl.classList.remove('itemHighlightFlash'), 1600);
        }
      };
    });

    // Modo prueba: radios interactivos
    previewBox.querySelectorAll('[data-test-item]').forEach(radio => {
      radio.onchange = (e) => {
        const itemId = e.target.dataset.testItem;
        builderTestAnswers[itemId] = e.target.value;
        updatePreviewOnly();
      };
    });

    // Limpiar prueba
    const btnReset = previewBox.querySelector('#btnResetTest');
    if (btnReset) {
      btnReset.onclick = () => {
        builderTestAnswers = {};
        updatePreviewOnly();
      };
    }
  }

  // Renderizar la vista previa inicial
  updatePreviewOnly();

  // Listeners de pestañas de vista previa (Formulario / Documento)
  container.querySelectorAll('.builderPreviewTab').forEach(tabBtn => {
    tabBtn.onclick = () => {
      builderPreviewMode = tabBtn.dataset.previewMode;
      container.querySelectorAll('.builderPreviewTab').forEach(b => b.classList.toggle('active', b === tabBtn));
      updatePreviewOnly();
    };
  });

  // Mobile Toggle: Editor vs Vista previa
  const bEd = document.getElementById('btnShowEditorMobile');
  const bPr = document.getElementById('btnShowPreviewMobile');
  if (bEd && bPr) {
    bEd.onclick = () => {
      builderMobileTab = 'editor';
      document.getElementById('builderEditorPane').classList.remove('mobileHidden');
      document.getElementById('builderPreviewPane').classList.add('mobileHidden');
      bEd.classList.add('active');
      bPr.classList.remove('active');
    };
    bPr.onclick = () => {
      builderMobileTab = 'preview';
      document.getElementById('builderEditorPane').classList.add('mobileHidden');
      document.getElementById('builderPreviewPane').classList.remove('mobileHidden');
      bEd.classList.remove('active');
      bPr.classList.add('active');
    };
  }

  // Paleta de colores
  container.querySelectorAll('.colorSwatch').forEach(swatch => {
    swatch.onclick = () => {
      bs.color = swatch.dataset.color;
      builderIsDirty = true;
      container.querySelectorAll('.colorSwatch').forEach(s => s.classList.toggle('active', s.dataset.color === bs.color));
      updatePreviewOnly();
    };
  });

  // Eventos de entrada en vivo con debounce ligero para no bloquear
  let syncTimer = null;
  const onLiveInput = () => {
    builderIsDirty = true;
    syncBuilderFromDom(container, bs);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      updatePreviewOnly();
    }, 180);
  };

  const bIco = document.getElementById('b_icono');
  if (bIco) bIco.addEventListener('input', onLiveInput);
  const bNom = document.getElementById('b_nombre');
  if (bNom) bNom.addEventListener('input', onLiveInput);
  const bDesc = document.getElementById('b_desc');
  if (bDesc) bDesc.addEventListener('input', onLiveInput);
  const bMod = document.getElementById('b_modalidad');
  if (bMod) bMod.addEventListener('change', () => { bs.modalidad = bMod.value; builderIsDirty = true; updatePreviewOnly(); });
  const bTip = document.getElementById('b_tipo');
  if (bTip) bTip.addEventListener('change', () => { bs.tipoRespuesta = bTip.value; builderIsDirty = true; updatePreviewOnly(); });

  container.querySelectorAll('[data-secname]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-sec][data-item]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-extralabel]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-extratipo]').forEach(sel => sel.addEventListener('change', onLiveInput));
  container.querySelectorAll('[data-extrareq]').forEach(chk => chk.addEventListener('change', onLiveInput));

  // Agregar Ítem
  container.querySelectorAll('[data-additem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.secciones[+b.dataset.additem].items.push({ id: genId(), texto: '' });
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Quitar Ítem
  container.querySelectorAll('[data-rmitem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const [si, ii] = b.dataset.rmitem.split('|').map(Number);
    bs.secciones[si].items.splice(ii, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Quitar Sección
  container.querySelectorAll('[data-rmsec]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.secciones.splice(+b.dataset.rmsec, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Agregar Sección
  const addSecBtn = document.getElementById('addSecBtn');
  if (addSecBtn) {
    addSecBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      bs.secciones.push({ nombre: '', items: [{ id: genId(), texto: '' }] });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

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
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      const targetCard = container.querySelector('fieldset.secCard[data-sec-idx="' + target + '"]');
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetCard.classList.add('itemHighlightFlash');
        setTimeout(() => targetCard.classList.remove('itemHighlightFlash'), 1400);
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
        builderIsDirty = true;
        renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
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
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Agregar campo de cabecera
  const addExtraBtn = document.getElementById('addExtraBtn');
  if (addExtraBtn) {
    addExtraBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      bs.extras.push({ id: genId(), label: '', tipo: 'texto', required: false });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Quitar campo de cabecera
  container.querySelectorAll('[data-rmextra]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.extras.splice(+b.dataset.rmextra, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Cancelar con confirmación de cambios pendientes
  const cancelBtn = document.getElementById('cancelTipoBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (builderIsDirty) {
        const ok = confirm('Tienes cambios sin guardar en la ficha. ¿Deseas descartarlos y salir?');
        if (!ok) return;
      }
      builderIsDirty = false;
      tiposView = 'list';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Guardar Borrador
  const draftBtn = document.getElementById('saveDraftBtn');
  if (draftBtn) {
    draftBtn.addEventListener('click', async () => {
      syncBuilderFromDom(container, bs);
      if (!bs.nombre || !bs.nombre.trim()) {
        showToast('Asigna al menos un nombre para guardar el borrador.');
        const el = document.getElementById('b_nombre');
        if (el) el.focus();
        return;
      }
      draftBtn.disabled = true;
      draftBtn.textContent = 'Guardando...';
      const payload = {
        nombre: bs.nombre.trim(),
        descripcion: (bs.descripcion || '').trim(),
        icono: (bs.icono || '📋').trim(),
        color: bs.color || FICHA_PALETTE[0].hex,
        modalidad: bs.modalidad || 'General',
        tipoRespuesta: bs.tipoRespuesta || 'si_no',
        secciones: bs.secciones,
        extras: bs.extras,
        esBorrador: true,
        updatedAt: Date.now()
      };
      try {
        if (builderEditingId) {
          await dbNs.collection('fichaTypes').doc(builderEditingId).set(payload, { merge: true });
          showToast('✓ Borrador de ficha actualizado.');
        } else {
          payload.createdAt = Date.now();
          const docRef = await dbNs.collection('fichaTypes').add(payload);
          builderEditingId = docRef.id;
          showToast('✓ Borrador guardado exitosamente.');
        }
        builderIsDirty = false;
        const di = document.getElementById('dirtyIndicator');
        if (di) di.style.display = 'none';
        updatePreviewOnly();
      } catch (err) {
        console.error(err);
        showToast('No se pudo guardar el borrador: ' + err.message);
      } finally {
        draftBtn.disabled = false;
        draftBtn.textContent = '📝 Guardar borrador';
      }
    });
  }

  // Guardar Ficha Completa
  const saveBtn = document.getElementById('saveTipoBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      syncBuilderFromDom(container, bs);
      if (!bs.nombre || !bs.nombre.trim()) {
        showToast('Falta asignar el nombre de la ficha.');
        const el = document.getElementById('b_nombre');
        if (el) {
          el.focus();
          el.classList.add('itemHighlightFlash');
          setTimeout(() => el.classList.remove('itemHighlightFlash'), 1500);
        }
        return;
      }

      const validSections = (bs.secciones || [])
        .filter(s => s.nombre.trim() || s.items.some(i => i.texto.trim()))
        .map(s => ({
          nombre: s.nombre.trim() || 'Sección',
          items: (s.items || []).filter(i => i.texto.trim()).map(i => ({ id: i.id || genId(), texto: i.texto.trim() }))
        }));

      const totalValidItems = validSections.reduce((acc, s) => acc + s.items.length, 0);
      if (validSections.length === 0 || totalValidItems === 0) {
        showToast('La ficha debe tener al menos una sección con un ítem.');
        return;
      }

      if (existingCount > 0) {
        const ok = confirm(`Atención: Esta plantilla tiene ${existingCount} visita(s) registradas.\n\nLos cambios en los indicadores se aplicarán a las nuevas visitas que se registren. ¿Deseas guardar los cambios?`);
        if (!ok) return;
      }

      if (!dbNs) {
        showToast('No hay conexión a la base de datos.');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      const payload = {
        nombre: bs.nombre.trim(),
        descripcion: (bs.descripcion || '').trim(),
        icono: (bs.icono || '📋').trim(),
        color: bs.color || FICHA_PALETTE[0].hex,
        modalidad: bs.modalidad || 'General',
        tipoRespuesta: bs.tipoRespuesta || 'si_no',
        secciones: validSections,
        extras: (bs.extras || []).filter(e => e.label.trim()),
        esBorrador: false,
        updatedAt: Date.now()
      };

      try {
        if (builderEditingId) {
          await dbNs.collection('fichaTypes').doc(builderEditingId).set(payload, { merge: true });
          showToast('✓ Tipo de ficha actualizado exitosamente.');
        } else {
          payload.createdAt = Date.now();
          await dbNs.collection('fichaTypes').add(payload);
          showToast('✓ Tipo de ficha creado exitosamente.');
        }
        builderIsDirty = false;
        tiposView = 'list';
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        console.error(err);
        showToast('No se pudo guardar la ficha: ' + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Guardar ficha';
      }
    });
  }
}

/** Compatibilidad con el nombre anterior renderBuilder */
export function renderBuilder(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null, navigate = null, subNavHtml = '') {
  return renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
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
    red: s(r.red),
    distrito: s(r.distrito),
    especialista: s(r.especialista),
    nombresApellidos: s(r.nombresApellidos),
    cargo: s(r.cargo),
    modalidad: modalidad,
    celular: s(r.celular),
    correo: s(r.correo),
    updatedAt: now,
    createdAt: createdAt,
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
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
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
  const ebrCount = (state.responsables || []).filter(r => (r.modalidad || '').toUpperCase() === 'EBR').length;
  const ebeCount = (state.responsables || []).filter(r => (r.modalidad || '').toUpperCase() === 'EBE').length;
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
      const myName = (r.nombresApellidos || '').trim().toLowerCase();
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
      '<div><strong>N° Celular:</strong> ' + (r.celular ? (isAdmin ? '<a href="tel:' + esc(r.celular) + '">📞 ' + esc(r.celular) + '</a>' : '📞 ***' + esc(r.celular).slice(-3)) : '—') + '</div>' +
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
      '<td>' + (r.celular ? (isAdmin ? '<a href="tel:' + esc(r.celular) + '" style="color:inherit;text-decoration:none">📞 ' + esc(r.celular) + '</a>' : '📞 ***' + esc(r.celular).slice(-3)) : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
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
  const correo = (document.getElementById('resp_f_correo').value || '').trim();
  if (!nombres) { showToast('Ingresa los Nombres y apellidos del especialista.'); return; }

  const id = (respEditing && respEditing !== 'new') ? respEditing : docIdForResponsable(correo, nombres);
  const existing = (state.responsables || []).find(x => x.id === id);

  const raw = {
    red: (document.getElementById('resp_f_red').value || '').trim(),
    distrito: (document.getElementById('resp_f_distrito').value || '').trim(),
    especialista: (document.getElementById('resp_f_especialista').value || '').trim(),
    nombresApellidos: nombres,
    cargo: (document.getElementById('resp_f_cargo').value || '').trim(),
    modalidad: (document.getElementById('resp_f_modalidad').value || '').trim(),
    celular: (document.getElementById('resp_f_celular').value || '').trim(),
    correo: correo,
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
  const isPartial = res.success > 0 && res.failures.length > 0;

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
  const now = Date.now();

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
    camposPodio: ['categoria'],
    formato_pdf_actas: 'tabular'
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
    camposPodio: ['categoria'],
    formato_pdf_actas: 'tabular'
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
    camposPodio: ['categoria', 'disciplina'],
    formato_pdf_actas: 'tabular'
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
    camposPodio: ['categoria', 'disciplina'],
    formato_pdf_actas: 'tabular'
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
    camposPodio: ['categoria', 'disciplina'],
    formato_pdf_actas: 'fichas_por_categoria'
  },
  {
    id: 'jedpa',
    nombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    tipoParticipacion: 'mixto',
    tieneGenero: true,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Disciplina deportiva',
    tieneTituloTrabajo: false,
    categorias: ['A', 'B', 'C'],
    disciplinasSugeridas: [
      'Ajedrez',
      'Atletismo',
      'Básquet',
      'Fútbol',
      'Futsal',
      'Voleibol',
      'Vóley de Playa',
      'Balonmano / Handball',
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
    disciplinasDetalle: [
      { nombre: 'Básquet', modalidad: 'colectiva' },
      { nombre: 'Fútbol', modalidad: 'colectiva' },
      { nombre: 'Futsal', modalidad: 'colectiva' },
      { nombre: 'Voleibol', modalidad: 'colectiva' },
      { nombre: 'Vóley de Playa', modalidad: 'colectiva' },
      { nombre: 'Balonmano / Handball', modalidad: 'colectiva' },
      { nombre: 'Atletismo', modalidad: 'individual' },
      { nombre: 'Natación', modalidad: 'individual' },
      { nombre: 'Ajedrez', modalidad: 'individual' },
      { nombre: 'Gimnasia', modalidad: 'individual' },
      { nombre: 'Tenis de Mesa', modalidad: 'individual' },
      { nombre: 'Judo', modalidad: 'individual' },
      { nombre: 'Karate', modalidad: 'individual' },
      { nombre: 'Taekwondo', modalidad: 'individual' },
      { nombre: 'Bádminton', modalidad: 'individual' },
      { nombre: 'Paraatletismo', modalidad: 'individual' },
      { nombre: 'Paranatación', modalidad: 'individual' }
    ],
    rolesParticipante: ['Deportista', 'Estudiante'],
    rolesAsesor: ['Entrenador', 'Docente Asesor', 'Delegado'],
    camposPodio: ['categoria', 'disciplina', 'genero'],
    formato_pdf_actas: 'hibrido'
  }
];

/* -------------------------------------------------------------
   HELPERS DE ROLES DINÁMICOS POR TIPO DE CONCURSO (JEDPA Y OFICIALES)
   ------------------------------------------------------------- */
export function isJedpaConcurso(tipo) {
  if (!tipo) return false;
  const id = String(tipo.id || '').toLowerCase().trim();
  const nom = String(tipo.nombre || '').toLowerCase().trim();
  return id === 'jedpa' || nom.includes('jedpa') || nom.includes('deportiv');
}

export function getConcursoAsesorRoles(tipo) {
  if (!tipo) return ['Docente Asesor'];
  const isJedpa = isJedpaConcurso(tipo);
  let roles = Array.isArray(tipo.rolesAsesor) && tipo.rolesAsesor.length > 0
    ? [...tipo.rolesAsesor]
    : [];

  if (isJedpa) {
    const jedpaMandatory = ['Entrenador', 'Docente Asesor', 'Delegado'];
    jedpaMandatory.forEach(r => {
      if (!roles.includes(r)) roles.push(r);
    });
    roles = ['Entrenador', ...roles.filter(r => r !== 'Entrenador')];
    return roles;
  }

  if (roles.length === 0) {
    const def = SEED_CONCURSOS_DEFAULTS.find(d => d.id === tipo.id || (tipo.nombre && d.nombre.toLowerCase() === tipo.nombre.toLowerCase()));
    if (def && Array.isArray(def.rolesAsesor) && def.rolesAsesor.length) {
      return [...def.rolesAsesor];
    }
    return ['Docente Asesor'];
  }
  return roles;
}

export function getConcursoParticipanteRoles(tipo) {
  if (!tipo) return ['Estudiante'];
  const isJedpa = isJedpaConcurso(tipo);
  let roles = Array.isArray(tipo.rolesParticipante) && tipo.rolesParticipante.length > 0
    ? [...tipo.rolesParticipante]
    : [];

  if (isJedpa) {
    const jedpaMandatory = ['Deportista', 'Estudiante'];
    jedpaMandatory.forEach(r => {
      if (!roles.includes(r)) roles.push(r);
    });
    roles = ['Deportista', ...roles.filter(r => r !== 'Deportista')];
    return roles;
  }

  if (roles.length === 0) {
    const def = SEED_CONCURSOS_DEFAULTS.find(d => d.id === tipo.id || (tipo.nombre && d.nombre.toLowerCase() === tipo.nombre.toLowerCase()));
    if (def && Array.isArray(def.rolesParticipante) && def.rolesParticipante.length) {
      return [...def.rolesParticipante];
    }
    return ['Estudiante'];
  }
  return roles;
}

/* -------------------------------------------------------------
   HELPERS DE PODIO Y GÉNERO
   ------------------------------------------------------------- */
export function normalizeGenero(val) {
  if (!val) return 'sin_genero';
  const s = normalizeText(val);
  if (!s || s === '—' || s === '-' || s === 'sin genero' || s === 'sin_genero') return 'sin_genero';
  if (['damas', 'dama', 'femenino', 'f', 'd'].includes(s)) return 'damas';
  if (['varones', 'varon', 'masculino', 'm', 'v'].includes(s)) return 'varones';
  if (s.includes('mixt')) return 'mixto';
  return s;
}

export function formatGeneroDisplay(val) {
  const norm = normalizeGenero(val);
  if (norm === 'damas') return 'Damas';
  if (norm === 'varones') return 'Varones';
  if (norm === 'mixto') return 'Mixto';
  if (norm === 'sin_genero') return 'Sin género';
  return val ? String(val).trim() : 'Sin género';
}

export function getPodioFields(tipo) {
  if (tipo && Array.isArray(tipo.camposPodio) && tipo.camposPodio.length > 0) {
    return tipo.camposPodio;
  }
  if (tipo && (tipo.tieneGenero || tipo.id === 'jedpa')) {
    return ['categoria', 'disciplina', 'genero'];
  }
  if (tipo && (tipo.tieneDisciplina || tipo.id === 'peru_lee')) {
    return ['categoria', 'disciplina'];
  }
  return ['categoria'];
}

export function getPodioKey(reg, tipo) {
  const tId = tipo ? (tipo.id || tipo.nombre) : (reg.tipoConcursoId || reg.tipoConcursoNombre || 'general');
  const etapa = (reg.etapa || 'UGEL').trim().toUpperCase();
  const fields = getPodioFields(tipo);

  const parts = [
    normalizeText(tId),
    etapa
  ];

  if (fields.includes('categoria')) {
    parts.push(normalizeText(reg.categoria || 'unica'));
  }
  if (fields.includes('disciplina')) {
    parts.push(normalizeText(reg.disciplina || 'general'));
  }
  if (fields.includes('genero')) {
    parts.push(normalizeGenero(reg.genero));
  }
  if (fields.includes('modalidad') || reg.modalidad) {
    parts.push(normalizeText(reg.modalidad || ''));
  }
  if (fields.includes('prueba') || reg.prueba || reg.evento) {
    parts.push(normalizeText(reg.prueba || reg.evento || ''));
  }

  return parts.join('|');
}

export function getPodioLabel(reg, tipo) {
  const fields = getPodioFields(tipo);
  const parts = [];

  if (fields.includes('disciplina') && reg.disciplina) {
    parts.push(reg.disciplina.trim().toUpperCase());
  }
  if (reg.categoria) {
    parts.push(`Categoría ${reg.categoria.trim()}`);
  }
  if (fields.includes('genero')) {
    parts.push(formatGeneroDisplay(reg.genero).toUpperCase());
  }
  if (reg.modalidad) {
    parts.push(reg.modalidad.trim());
  }
  if (reg.prueba || reg.evento) {
    parts.push((reg.prueba || reg.evento).trim());
  }
  parts.push(`Etapa ${(reg.etapa || 'UGEL').trim().toUpperCase()}`);

  return parts.join(' · ');
}

export function getPodioLockDocId(podioKey, puestoVal) {
  const safePodio = podioKey.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const safePuesto = normalizePuestoValue(puestoVal).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `lock_${safePodio}_${safePuesto}`.slice(0, 120);
}

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
  categoria: [],
  genero: '',
  disciplina: '',
  arte: '',
  modalidad: '',
  query: ''
};
let concursoVistaJfen = 'fichas'; // 'fichas' | 'tabla' (predeterminada en 'fichas' para JFEN)
let concursoExpandedId = null;
let concursoCategoryDropdownOpen = false;
let concursoCategorySearchText = '';
let concursoCategoryListScrollTop = 0;

export function getSelectedCategorias() {
  if (Array.isArray(concursoFilters.categoria)) {
    return concursoFilters.categoria;
  }
  if (typeof concursoFilters.categoria === 'string' && concursoFilters.categoria.trim()) {
    if (concursoFilters.categoria.includes(',')) {
      return concursoFilters.categoria.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [concursoFilters.categoria.trim()];
  }
  return [];
}

export function setSelectedCategorias(cats) {
  if (!cats || cats.length === 0) {
    concursoFilters.categoria = [];
  } else if (Array.isArray(cats)) {
    concursoFilters.categoria = [...new Set(cats.map(c => String(c).trim()).filter(Boolean))];
  } else {
    concursoFilters.categoria = [String(cats).trim()];
  }
}

export function renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate) {
  // Asegurar que state.tiposConcurso y state.concursoRegistros existan
  state.tiposConcurso = state.tiposConcurso || [];
  state.concursoRegistros = state.concursoRegistros || [];

  // Si no hay tipos seleccionados y hay tipos disponibles, preseleccionar el primero
  if (!concursoSelectedTipoId && state.tiposConcurso.length > 0) {
    concursoSelectedTipoId = state.tiposConcurso[0].id;
  }

  // Autocura de roles oficiales para JEDPA en Firestore si el usuario es admin y faltan roles
  if (isAdmin && dbNs && Array.isArray(state.tiposConcurso)) {
    const jedpaDoc = state.tiposConcurso.find(t => isJedpaConcurso(t));
    if (jedpaDoc) {
      const hasEntrenador = Array.isArray(jedpaDoc.rolesAsesor) && jedpaDoc.rolesAsesor.includes('Entrenador');
      const hasDocenteAsesor = Array.isArray(jedpaDoc.rolesAsesor) && jedpaDoc.rolesAsesor.includes('Docente Asesor');
      const hasDeportista = Array.isArray(jedpaDoc.rolesParticipante) && jedpaDoc.rolesParticipante.includes('Deportista');
      if (!hasEntrenador || !hasDocenteAsesor || !hasDeportista) {
        const fixedAsesor = getConcursoAsesorRoles(jedpaDoc);
        const fixedPart = getConcursoParticipanteRoles(jedpaDoc);
        jedpaDoc.rolesAsesor = fixedAsesor;
        jedpaDoc.rolesParticipante = fixedPart;
        dbNs.collection('tiposConcurso').doc(jedpaDoc.id).set({
          rolesAsesor: fixedAsesor,
          rolesParticipante: fixedPart,
          updatedAt: Date.now()
        }, { merge: true }).catch(err => console.warn('Aviso sincronizando roles JEDPA:', err));
      }
    }
  }

  // Definir sub-pestañas disponibles
  const subTabs = [
    { id: 'registrar', label: '➕ Registrar participante' },
    { id: 'consolidado', label: '📊 Ver consolidado' },
    { id: 'asignar_podios', label: '🏆 Asignar puestos' },
    { id: 'asistente', label: '🔤 Revisar nombres' },
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
  } else if (concursoSubTab === 'asignar_podios') {
    renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'asistente') {
    renderAsistenteSeparacionNombres(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'tipos' && isAdmin) {
    renderConcursoTiposCatalogView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  }
}

/* ----------------------------------------------------------------
   ASISTENTE DE SEPARACIÓN DE NOMBRES HEREDADOS
   Identifica registros con datos en el campo "nombres" que contienen
   el nombre completo (sin apellidos separados) y permite al usuario
   revisarlos y guardar la separación manualmente.
   No modifica datos salvo confirmación explícita por registro.
   ---------------------------------------------------------------- */
function renderAsistenteSeparacionNombres(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const regs = state.concursoRegistros || [];

  // Recopilar todas las personas con formato heredado (apellidos vacío, nombres con texto)
  const heredados = [];
  regs.forEach(reg => {
    const personas = [
      ...(reg.participantes || []).map((p, i) => ({ ...p, _regId: reg.id, _tipo: 'participantes', _idx: i, _regInst: reg.institucion || '', _regConc: reg.tipoConcursoNombre || reg.tipoConcurso || '' })),
      ...(reg.asesores || []).map((a, i) => ({ ...a, _regId: reg.id, _tipo: 'asesores', _idx: i, _regInst: reg.institucion || '', _regConc: reg.tipoConcursoNombre || reg.tipoConcurso || '' }))
    ];
    personas.forEach(p => {
      const nombres = (p.nombres || '').trim();
      const apellidos = (p.apellidos || '').trim();
      if (!apellidos && nombres) {
        const prop = proponerSeparacionNombre(p);
        heredados.push({ persona: p, prop });
      }
    });
  });

  if (heredados.length === 0) {
    host.innerHTML =
      '<div class="empty">' +
      '<h4>✅ Sin nombres heredados por revisar</h4>' +
      '<p>Todos los registros tienen Nombres y Apellidos separados correctamente.</p>' +
      '</div>';
    return;
  }

  const altaConfianza = heredados.filter(h => h.prop.confianza === 'alta');

  const renderItem = (h, idx) => {
    const p = h.persona;
    const prop = h.prop;
    const confianzaClass = prop.confianza === 'alta' ? 'sep-alta' : 'sep-baja';
    const confianzaLabel = prop.confianza === 'alta' ? '⬆ Confianza alta' : '⚠ Revisar manualmente';
    return '<div class="sepItem ' + confianzaClass + '" data-sep-idx="' + idx + '">' +
      '<div class="sepItemHead">' +
      '<span class="badge" style="background:var(--surface-2);font-size:11px">' + esc(p._regConc) + '</span>' +
      '<span class="badge" style="background:var(--surface-2);font-size:11px">' + esc(p._regInst) + '</span>' +
      '<span class="badge ' + confianzaClass + '-badge" style="font-size:11px">' + confianzaLabel + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:var(--ink-soft)">' + (p._tipo === 'participantes' ? 'Participante' : 'Asesor') + ' #' + (p._idx + 1) + '</span>' +
      '</div>' +
      '<div class="sepItemBody">' +
      '<div class="sepOriginal">' +
      '<label>Texto original (campo nombres)</label>' +
      '<span class="sepOriginalText">' + esc(p.nombres || '') + '</span>' +
      '</div>' +
      '<div class="personNameGrid">' +
      '<div class="field">' +
      '<label for="sep_nom_' + idx + '">NOMBRES *</label>' +
      '<input type="text" id="sep_nom_' + idx + '" class="sepInputNom" value="' + esc(prop.nombres) + '" data-sep-idx="' + idx + '" autocapitalize="words">' +
      '<span class="fieldHelp">Solo los nombres de pila</span>' +
      '</div>' +
      '<div class="field">' +
      '<label for="sep_ap_' + idx + '">APELLIDOS *</label>' +
      '<input type="text" id="sep_ap_' + idx + '" class="sepInputAp" value="' + esc(prop.apellidos) + '" data-sep-idx="' + idx + '" autocapitalize="words">' +
      '<span class="fieldHelp">Apellido paterno y materno</span>' +
      '</div>' +
      '</div>' +
      (prop.nota ? '<span class="fieldWarn">' + esc(prop.nota) + '</span>' : '') +
      '<div class="sepActions">' +
      '<button type="button" class="btn small sepGuardarBtn" data-sep-idx="' + idx + '">💾 Guardar separación</button>' +
      '<button type="button" class="btn secondary small sepOmitirBtn" data-sep-idx="' + idx + '">Omitir</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  };

  host.innerHTML =
    '<div class="panel">' +
    '<h3>🔤 Asistente de separación de nombres</h3>' +
    '<p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:16px">' +
    'Se encontraron <strong>' + heredados.length + '</strong> personas con el nombre completo en un solo campo.<br>' +
    'Revisa y guarda la separación Nombres / Apellidos registro por registro.<br>' +
    '<strong>Ningún cambio se aplica automáticamente</strong> — cada uno requiere tu confirmación.' +
    '</p>' +
    (altaConfianza.length > 0 && isAdmin
      ? '<div class="sepBulkBar">' +
      '<span>' + altaConfianza.length + ' de confianza alta listos para revisar</span>' +
      '</div>'
      : '') +
    '<div id="sepList">' +
    heredados.map((h, i) => renderItem(h, i)).join('') +
    '</div>' +
    '</div>';

  // Guardar separación individual
  host.querySelectorAll('.sepGuardarBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.sepIdx);
      const h = heredados[idx];
      if (!h) return;

      const nomInput = document.getElementById('sep_nom_' + idx);
      const apInput = document.getElementById('sep_ap_' + idx);
      const nomVal = (nomInput?.value || '').trim();
      const apVal = (apInput?.value || '').trim();

      if (!nomVal || nomVal.length < 2) { showToast('Ingresa los Nombres (mínimo 2 caracteres).'); return; }
      if (!apVal || apVal.length < 2) { showToast('Ingresa los Apellidos (mínimo 2 caracteres).'); return; }

      btn.disabled = true;
      btn.textContent = 'Guardando...';

      try {
        const reg = regs.find(r => r.id === h.persona._regId);
        if (!reg) throw new Error('Registro no encontrado');

        const lista = JSON.parse(JSON.stringify(reg[h.persona._tipo] || []));
        lista[h.persona._idx].nombres = nomVal;
        lista[h.persona._idx].apellidos = apVal;

        await dbNs.collection('concursoRegistros').doc(h.persona._regId).update({ [h.persona._tipo]: lista });
        showToast('✓ Separación guardada correctamente.');

        // Ocultar el item guardado con transición suave
        const sepEl = host.querySelector('[data-sep-idx="' + idx + '"]');
        if (sepEl) {
          sepEl.style.transition = 'opacity 0.35s';
          sepEl.style.opacity = '0';
          setTimeout(() => sepEl.remove(), 380);
        }
      } catch (err) {
        console.error('Error guardando separación:', err);
        showToast('Error al guardar: ' + err.message);
        btn.disabled = false;
        btn.textContent = '💾 Guardar separación';
      }
    });
  });

  // Omitir item (sin guardar)
  host.querySelectorAll('.sepOmitirBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.sepIdx);
      const sepEl = host.querySelector('[data-sep-idx="' + idx + '"]');
      if (sepEl) {
        sepEl.style.transition = 'opacity 0.3s';
        sepEl.style.opacity = '0';
        setTimeout(() => sepEl.remove(), 350);
      }
    });
  });
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
    host.innerHTML = fase4Html + '<div class="empty">' +
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
  const partRoles = getConcursoParticipanteRoles(tipo);
  const asesRoles = getConcursoAsesorRoles(tipo);

  // Asegurar que las listas tengan al menos 1 elemento con roles válidos
  if (!concursoParticipantes || concursoParticipantes.length === 0) {
    concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: partRoles[0] }];
  } else {
    concursoParticipantes.forEach(p => {
      if (!p.rol || (!partRoles.includes(p.rol) && isJedpaConcurso(tipo))) {
        p.rol = partRoles[0];
      }
    });
  }
  if (!concursoAsesores || concursoAsesores.length === 0) {
    concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] }];
  } else {
    concursoAsesores.forEach(a => {
      if (!a.rol || (!asesRoles.includes(a.rol) && isJedpaConcurso(tipo) && a.rol === 'Docente Asesor' && !a.nombres && !a.apellidos)) {
        a.rol = asesRoles[0];
      }
    });
  }

  const isEditing = !!concursoEditingId;
  const submitLabel = isEditing ? 'Actualizar registro' : 'Guardar registro';

  const hasDisciplina = tipo.tieneDisciplina || tipo.id === 'peru_lee';
  const discLabel = tipo.etiquetaDisciplina || (tipo.id === 'peru_lee' ? 'Área / Modalidad' : 'Disciplina / Área');

  host.innerHTML = '' +
    '<form id="concursoRegForm" novalidate>' +
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
    '<div class="field" style="position:relative">' +
    '<label for="c_puesto">Puesto obtenido</label>' +
    '<select id="c_puesto">' +
    '<option value="">Sin puesto / Pendiente</option>' +
    '<option value="1.er puesto">🥇 1.er puesto</option>' +
    '<option value="2.° puesto">🥈 2.° puesto</option>' +
    '<option value="3.er puesto">🥉 3.er puesto</option>' +
    '<option value="Mención honrosa">🎖️ Mención honrosa</option>' +
    '<option value="Finalista">⭐ Finalista</option>' +
    '<option value="Clasificado">✓ Clasificado</option>' +
    '<option value="Participante">👤 Participante</option>' +
    '</select>' +
    '<div id="c_puesto_soft_note" style="display:none;font-size:11.5px;color:var(--gold-600, #b45309);margin-top:4px"></div>' +
    '</div>' +
    '</div>' +
    '<div id="c_puesto_conflict_wrap" style="display:none;margin-top:12px"></div>' +
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
    '<div class="panel" id="c_asesoresPanel">' +
    '<div id="c_jedpaGroupCtWrap"></div>' +
    '<div id="c_standardAsesoresWrap">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
    '<h3 style="margin-bottom:0" id="c_asesoresTitle">Docentes Asesores / Entrenadores</h3>' +
    '<button type="button" class="btn secondary small" id="c_addAsesBtn">＋ Agregar asesor</button>' +
    '</div>' +
    '<div id="c_asesoresList"></div>' +
    '</div>' +
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
      const newPartRoles = getConcursoParticipanteRoles(newTipo);
      const newAsesRoles = getConcursoAsesorRoles(newTipo);
      const isJedpa = isJedpaConcurso(newTipo);
      concursoParticipantes.forEach(p => {
        if (isJedpa || !newPartRoles.includes(p.rol)) {
          p.rol = newPartRoles[0];
        }
      });
      concursoAsesores.forEach(a => {
        if (isJedpa || !newAsesRoles.includes(a.rol)) {
          a.rol = newAsesRoles[0];
        }
      });
    }
    renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  // ---- Renderizador de filas de Participantes ----
  function renderPartRows() {
    const listEl = document.getElementById('c_participantesList');
    if (!listEl) return;
    listEl.innerHTML = concursoParticipantes.map((p, idx) => {
      const curRol = p.rol || partRoles[0];
      const availableRoles = partRoles.includes(curRol) ? partRoles : [curRol, ...partRoles];
      const rolOpts = availableRoles.map(r =>
        '<option value="' + esc(r) + '"' + (r === curRol ? ' selected' : '') + '>' + esc(r) + '</option>'
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
      const updateField = (e) => {
        const row = e.target.closest('[data-pidx]');
        if (!row) return;
        const i = Number(row.dataset.pidx);
        concursoParticipantes[i][e.target.dataset.pfield] = e.target.value;
      };
      inp.addEventListener('input', updateField);
      inp.addEventListener('change', updateField);
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
      const curRol = a.rol || asesRoles[0];
      const availableRoles = asesRoles.includes(curRol) ? asesRoles : [curRol, ...asesRoles];
      const rolOpts = availableRoles.map(r =>
        '<option value="' + esc(r) + '"' + (r === curRol ? ' selected' : '') + '>' + esc(r) + '</option>'
      ).join('');
      return '<div class="personRow" data-aidx="' + idx + '">' +
        '<div><label style="margin-bottom:2px;font-size:11px">Nombres y Apellidos</label><input type="text" placeholder="Nombres o nombre completo" value="' + esc(a.nombres) + '" data-afield="nombres"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Apellidos (opcional)</label><input type="text" placeholder="Apellidos" value="' + esc(a.apellidos) + '" data-afield="apellidos"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">DNI / Documento</label><input type="text" placeholder="DNI" value="' + esc(a.dni) + '" data-afield="dni" maxlength="15"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Rol</label><select data-afield="rol">' + rolOpts + '</select></div>' +
        '<div style="padding-top:16px"><button type="button" class="iconBtn" data-delases="' + idx + '" title="Quitar asesor">✕</button></div>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('input[data-afield], select[data-afield]').forEach(inp => {
      const updateField = (e) => {
        const row = e.target.closest('[data-aidx]');
        if (!row) return;
        const i = Number(row.dataset.aidx);
        concursoAsesores[i][e.target.dataset.afield] = e.target.value;
      };
      inp.addEventListener('input', updateField);
      inp.addEventListener('change', updateField);
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
  const dropdown = document.getElementById('c_ieDropdown');
  const hint = document.getElementById('c_colegioHint');
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

  // ---- Helper dinámico para anotar opciones ocupadas y alertas de conflicto ----
  function updatePuestoSelectAnnotations() {
    const pSelect = document.getElementById('c_puesto');
    const conflictWrap = document.getElementById('c_puesto_conflict_wrap');
    const softNote = document.getElementById('c_puesto_soft_note');
    if (!pSelect) return;

    const curTipoId = document.getElementById('c_tipoSelect') ? document.getElementById('c_tipoSelect').value : concursoSelectedTipoId;
    const curTipo = state.tiposConcurso.find(t => t.id === curTipoId) || tipo;
    const curEtapa = document.getElementById('c_etapa') ? document.getElementById('c_etapa').value : 'UGEL';
    const curCat = document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '';
    const curGen = document.getElementById('c_genero') ? document.getElementById('c_genero').value : null;
    const curDisc = document.getElementById('c_disciplina') ? document.getElementById('c_disciplina').value.trim() : null;

    const draftReg = {
      tipoConcursoId: curTipo.id,
      tipoConcursoNombre: curTipo.nombre,
      etapa: curEtapa,
      categoria: curCat,
      genero: curGen,
      disciplina: curDisc,
      modalidad: concursoEditingData ? concursoEditingData.modalidad : null,
      prueba: concursoEditingData ? (concursoEditingData.prueba || concursoEditingData.evento) : null
    };

    const draftPodioKey = getPodioKey(draftReg, curTipo);
    const existingRegs = state.concursoRegistros || [];

    // Buscar ocupantes en el mismo podio (excluyendo el registro actual si se edita)
    const podioOccupants = existingRegs.filter(r => {
      if (isEditing && r.id === concursoEditingId) return false;
      return getPodioKey(r, curTipo) === draftPodioKey;
    });

    const topSlots = {
      '1.er puesto': null,
      '2.° puesto': null,
      '3.er puesto': null
    };

    podioOccupants.forEach(r => {
      const normP = normalizePuestoValue(r.puesto);
      if (topSlots.hasOwnProperty(normP)) {
        topSlots[normP] = r;
      }
    });

    // Actualizar texto de opciones en el select
    Array.from(pSelect.options).forEach(opt => {
      const baseVal = opt.value;
      if (baseVal === '') {
        opt.textContent = 'Sin puesto / Pendiente';
      } else if (topSlots.hasOwnProperty(baseVal)) {
        const occ = topSlots[baseVal];
        const icon = baseVal === '1.er puesto' ? '🥇' : (baseVal === '2.° puesto' ? '🥈' : '🥉');
        if (occ) {
          const occPart = (occ.participantes && occ.participantes[0]) ? formatearNombre(occ.participantes[0]) : '';
          const occText = occ.institucion ? (occ.institucion + (occPart ? ' — ' + occPart : '')) : 'ocupado';
          opt.textContent = `${icon} ${baseVal} (ocupado por: ${occText})`;
        } else {
          opt.textContent = `${icon} ${baseVal}`;
        }
      }
    });

    // Validar si la opción seleccionada entra en conflicto
    const rawVal = pSelect.value;
    const curPuestoVal = normalizePuestoValue(rawVal);
    const isEmpate = rawVal.includes('(empate)');

    if (topSlots.hasOwnProperty(curPuestoVal) && topSlots[curPuestoVal] && !isEmpate) {
      const conflict = topSlots[curPuestoVal];
      const podioLabel = getPodioLabel(draftReg, curTipo);
      const conflictPart = (conflict.participantes && conflict.participantes[0])
        ? formatearNombre(conflict.participantes[0])
        : 'Sin participante registrado';

      let warningExtra = '';
      if (!conflict.genero && curTipo.tieneGenero) {
        warningExtra = '<div style="margin-top:6px;font-size:12px;color:var(--danger)">⚠️ Nota: El registro ocupante no tiene género asignado.</div>';
      }

      if (conflictWrap) {
        conflictWrap.style.display = 'block';
        conflictWrap.innerHTML = `
          <div class="alertCard warn" style="margin-top:6px">
            <div class="alertIcon">⚠️</div>
            <div class="alertBody">
              <div class="alertTitle">Puesto ya ocupado en este podio</div>
              <div class="alertDetail">
                Ya existe un <strong>${esc(curPuestoVal)}</strong> en <strong>${esc(podioLabel)}</strong>:<br>
                <strong>${esc(conflict.institucion)}</strong> — ${esc(conflictPart)}.<br>
                Cada podio (disciplina, categoría y género) solo puede tener un ${esc(curPuestoVal)}.
                ${warningExtra}
              </div>
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                <button type="button" class="btn secondary small" id="btnVerConflicto" style="font-size:11.5px">🔍 Ver registro ocupante</button>
                <button type="button" class="btn small" id="btnReemplazarConflicto" style="font-size:11.5px;background:var(--warn);color:#fff;border-color:var(--warn)">🔄 Reemplazar puesto</button>
                ${isAdmin ? '<button type="button" class="btn secondary small" id="btnEmpateConflicto" style="font-size:11.5px">🤝 Marcar empate</button>' : ''}
                <button type="button" class="btn secondary small" id="btnCancelarConflicto" style="font-size:11.5px">✕ Deshacer selección</button>
              </div>
            </div>
          </div>
        `;

        const btnVer = document.getElementById('btnVerConflicto');
        if (btnVer) {
          btnVer.addEventListener('click', () => {
            concursoFilters.tipoId = curTipo.id;
            concursoFilters.etapa = curEtapa;
            concursoFilters.categoria = curCat;
            if (curGen) concursoFilters.genero = curGen;
            if (curDisc) concursoFilters.disciplina = curDisc;
            concursoSubTab = 'consolidado';
            concursoExpandedId = conflict.id;
            renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
          });
        }

        const btnReemp = document.getElementById('btnReemplazarConflicto');
        if (btnReemp) {
          btnReemp.addEventListener('click', () => {
            abrirModalReemplazoPuesto(conflict, draftReg, curPuestoVal, curTipo, dbNs, state, isEditing ? concursoEditingId : null, () => {
              renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
            });
          });
        }

        const btnEmpate = document.getElementById('btnEmpateConflicto');
        if (btnEmpate) {
          btnEmpate.addEventListener('click', () => {
            const motivo = prompt('Ingresa el motivo o Resolución Directoral que sustenta el puesto compartido (Empate):');
            if (!motivo) return;
            const empVal = `${curPuestoVal} (empate)`;
            let existsOpt = Array.from(pSelect.options).some(o => o.value === empVal);
            if (!existsOpt) {
              const opt = document.createElement('option');
              opt.value = empVal;
              opt.textContent = `${empVal} · ${motivo.slice(0, 30)}`;
              pSelect.appendChild(opt);
            }
            pSelect.value = empVal;
            updatePuestoSelectAnnotations();
          });
        }

        const btnCancel = document.getElementById('btnCancelarConflicto');
        if (btnCancel) {
          btnCancel.addEventListener('click', () => {
            pSelect.value = isEditing && concursoEditingData ? (normalizePuestoValue(concursoEditingData.puesto) || '') : '';
            updatePuestoSelectAnnotations();
          });
        }
      }
    } else {
      if (conflictWrap) {
        conflictWrap.style.display = 'none';
        conflictWrap.innerHTML = '';
      }
    }

    // Advertencia suave para saltos de puesto (ej. asignar 3.° sin 1.° ni 2.°)
    if (softNote) {
      if (curPuestoVal === '3.er puesto' && !topSlots['1.er puesto'] && !topSlots['2.° puesto']) {
        softNote.style.display = 'block';
        softNote.textContent = 'ℹ Aviso: Este podio aún no tiene asignado 1.er ni 2.° puesto. Podrás asignarlos posteriormente.';
      } else if (curPuestoVal === '2.° puesto' && !topSlots['1.er puesto']) {
        softNote.style.display = 'block';
        softNote.textContent = 'ℹ Aviso: Este podio aún no tiene asignado 1.er puesto.';
      } else {
        softNote.style.display = 'none';
        softNote.textContent = '';
      }
    }
  }

  // ---- Panel de Cuerpo Técnico para JEDPA ----
  function updateJedpaGroupCtBox() {
    const wrap = document.getElementById('c_jedpaGroupCtWrap');
    const stdWrap = document.getElementById('c_standardAsesoresWrap');
    const titleEl = document.getElementById('c_asesoresTitle');
    if (!wrap || !stdWrap) return;

    const curTipoId = document.getElementById('c_tipoSelect') ? document.getElementById('c_tipoSelect').value : concursoSelectedTipoId;
    const curTipo = state.tiposConcurso.find(t => t.id === curTipoId) || tipo;

    if (!isJedpaConcurso(curTipo)) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      stdWrap.style.display = 'block';
      stdWrap.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = false;
      });
      if (titleEl) titleEl.textContent = 'Docentes Asesores';
      return;
    }

    if (titleEl) titleEl.textContent = 'Docentes Asesores / Entrenadores (Cuerpo Técnico JEDPA)';

    const curEtapa = document.getElementById('c_etapa') ? document.getElementById('c_etapa').value : 'UGEL';
    const curCat = document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '';
    const curGen = document.getElementById('c_genero') ? document.getElementById('c_genero').value : null;
    const curDisc = document.getElementById('c_disciplina') ? document.getElementById('c_disciplina').value.trim() : null;

    const dummyReg = {
      tipoConcursoId: curTipo.id,
      tipoConcursoNombre: curTipo.nombre,
      etapa: curEtapa,
      categoria: curCat,
      genero: curGen,
      disciplina: curDisc
    };

    const ctInfo = obtenerCuerpoTecnicoGrupo(dummyReg, state.concursoCuerpoTecnico || [], state.concursoRegistros || []);
    wrap.style.display = 'block';

    if (ctInfo && ctInfo.miembros && ctInfo.miembros.length > 0) {
      const origenText = (ctInfo.esGrupoFormalizado || ctInfo.origen === 'concursoCuerpoTecnico') ? 'Oficial centralizado' : 'Detectado en este grupo';
      wrap.innerHTML = `
        <div style="background:var(--surface-2, #f1f5f9);border-left:4px solid var(--primary, #1e3a8a);border-radius:8px;padding:14px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <strong style="color:var(--navy-900);font-size:13.5px">👥 Delegado / Entrenador del grupo</strong>
                <span class="badge" style="font-size:11px;background:var(--primary-tint, #e0e7ff);color:var(--primary, #3730a3)">${esc(origenText)}</span>
              </div>
              <p style="font-size:12px;color:var(--ink-soft);margin:4px 0 10px">El cuerpo técnico aplica automáticamente a todos los participantes de este grupo (${esc(curEtapa)} · ${esc(curDisc || '—')} · ${esc(curCat || '—')} · ${esc(curGen || '—')}).</p>
            </div>
            ${isAdmin ? '<button type="button" class="btn secondary small" id="c_btnEditGrupoCt" style="font-size:11.5px">✏️ Modificar cuerpo técnico</button>' : ''}
          </div>
          <table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-top:4px">
            <thead>
              <tr style="text-align:left;border-bottom:1.5px solid var(--line);color:var(--ink-soft)">
                <th style="padding:4px 8px;width:120px">Rol</th>
                <th style="padding:4px 8px">Apellidos y Nombres</th>
                <th style="padding:4px 8px;width:110px">DNI / Doc.</th>
              </tr>
            </thead>
            <tbody>
              ${ctInfo.miembros.map(m => `
                <tr style="border-bottom:1px dashed var(--line)">
                  <td style="padding:6px 8px"><span class="badge" style="font-size:10.5px">${esc((m.rol || 'DELEGADO').toUpperCase())}</span></td>
                  <td style="padding:6px 8px"><strong>${esc((m.apellidos || '').toUpperCase())} ${esc((m.nombres || '').toUpperCase())}</strong></td>
                  <td style="padding:6px 8px">${esc(m.dni || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top:12px">
            <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--ink)">
              <input type="checkbox" id="c_chkAsesorIndividual">
              <span>Asignar cuerpo técnico individual exclusivo para este registro (excepción)</span>
            </label>
          </div>
        </div>
      `;

      const chk = document.getElementById('c_chkAsesorIndividual');
      const toggleStdWrap = (show) => {
        stdWrap.style.display = show ? 'block' : 'none';
        stdWrap.querySelectorAll('input, select, button').forEach(el => {
          el.disabled = !show;
        });
      };

      if (chk) {
        toggleStdWrap(chk.checked);
        chk.addEventListener('change', () => {
          toggleStdWrap(chk.checked);
        });
      } else {
        toggleStdWrap(false);
      }

      const btnEditCt = document.getElementById('c_btnEditGrupoCt');
      if (btnEditCt) {
        btnEditCt.addEventListener('click', () => {
          openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate);
        });
      }
    } else {
      wrap.innerHTML = `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12.5px;color:#1e40af">
          ℹ️ <strong>Cuerpo Técnico JEDPA:</strong> Este grupo aún no tiene cuerpo técnico registrado. Los asesores y entrenadores ingresados a continuación se asociarán automáticamente al grupo para no tener que repetirlos en los siguientes competidores.
        </div>
      `;
      stdWrap.style.display = 'block';
      stdWrap.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = false;
      });
    }
  }

  // Escuchar cambios de campos que definen el podio y grupo
  const puestoSelectEl = document.getElementById('c_puesto');
  if (puestoSelectEl) puestoSelectEl.addEventListener('change', updatePuestoSelectAnnotations);
  const catSelectEl = document.getElementById('c_categoria');
  if (catSelectEl) catSelectEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
  const genSelectEl = document.getElementById('c_genero');
  if (genSelectEl) genSelectEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
  const discInpEl = document.getElementById('c_disciplina');
  if (discInpEl) {
    discInpEl.addEventListener('input', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
    discInpEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
  }
  const etapaSelectEl = document.getElementById('c_etapa');
  if (etapaSelectEl) etapaSelectEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });

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
    document.getElementById('c_etapa').value = d.etapa || 'UGEL';
    document.getElementById('c_fecha').value = d.fecha || todayStr();
    document.getElementById('c_institucion').value = d.institucion || '';
    if (codModInp) codModInp.value = d.codigoModular || '';
    if (document.getElementById('c_categoria')) document.getElementById('c_categoria').value = d.categoria || '';
    if (document.getElementById('c_genero')) {
      const normG = normalizeGenero(d.genero);
      document.getElementById('c_genero').value = normG === 'varones' ? 'Varones' : 'Damas';
    }
    if (document.getElementById('c_disciplina')) document.getElementById('c_disciplina').value = d.disciplina || '';
    if (document.getElementById('c_tituloTrabajo')) document.getElementById('c_tituloTrabajo').value = d.tituloTrabajo || '';
    if (document.getElementById('c_seudonimo')) document.getElementById('c_seudonimo').value = d.seudonimo || '';
    if (document.getElementById('c_resolucionRef')) document.getElementById('c_resolucionRef').value = d.resolucionRef || '';

    updatePuestoSelectAnnotations();
    updateJedpaGroupCtBox();

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
  } else {
    updatePuestoSelectAnnotations();
    updateJedpaGroupCtBox();
  }

  // ---- Submit Formulario de Registro de Concurso ----
  document.getElementById('concursoRegForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('c_submitBtn');
    btn.disabled = true;
    btn.textContent = isEditing ? 'Actualizando...' : 'Guardando...';

    try {
      // ---- Validar participantes ----
      concursoParticipantes.forEach((p, idx) => {
        p.nombres = (p.nombres || '').trim().replace(/\s{2,}/g, ' ');
        p.apellidos = (p.apellidos || '').trim().replace(/\s{2,}/g, ' ');
        p.dni = (p.dni || '').trim();
        if (!p.rol) {
          const sel = document.querySelector(`.personRow[data-pidx="${idx}"] select[data-pfield="rol"]`);
          p.rol = (sel && sel.value) ? sel.value : partRoles[0];
        }
      });
      concursoAsesores.forEach((a, idx) => {
        a.nombres = (a.nombres || '').trim().replace(/\s{2,}/g, ' ');
        a.apellidos = (a.apellidos || '').trim().replace(/\s{2,}/g, ' ');
        a.dni = (a.dni || '').trim();
        if (!a.rol) {
          const sel = document.querySelector(`.personRow[data-aidx="${idx}"] select[data-afield="rol"]`);
          a.rol = (sel && sel.value) ? sel.value : asesRoles[0];
        }
      });

      const namePattern = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'\-\.]+$/u;
      const pRows = concursoParticipantes.filter(p => p.nombres || p.apellidos);
      if (pRows.length === 0) {
        showToast('Agrega al menos un participante con Nombres y Apellidos.');
        btn.disabled = false; btn.textContent = submitLabel; return;
      }

      for (let i = 0; i < pRows.length; i++) {
        const p = pRows[i];
        if (!p.nombres || p.nombres.length < 2) {
          showToast('Participante ' + (i + 1) + ': ingresa los Nombres (mínimo 2 caracteres).');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (p.nombres && !namePattern.test(p.nombres)) {
          showToast('Participante ' + (i + 1) + ': el campo Nombres solo debe contener letras, espacios y guiones.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (!p.apellidos || p.apellidos.length < 2) {
          showToast('Participante ' + (i + 1) + ': ingresa los Apellidos (mínimo 2 caracteres).');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (p.apellidos && !namePattern.test(p.apellidos)) {
          showToast('Participante ' + (i + 1) + ': el campo Apellidos solo debe contener letras, espacios y guiones.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
      }

      // El puesto puede ser vacío (Sin puesto / Pendiente) o un puesto formal
      const rawPuestoVal = document.getElementById('c_puesto').value.trim();
      const puestoVal = normalizePuestoValue(rawPuestoVal) || rawPuestoVal;

      // Validar asesores (opcional)
      const aRows = concursoAsesores.filter(a => a.nombres || a.apellidos);
      for (let i = 0; i < aRows.length; i++) {
        const a = aRows[i];
        if (a.nombres && !namePattern.test(a.nombres)) {
          showToast('Asesor ' + (i + 1) + ': el campo Nombres solo debe contener letras.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (a.apellidos && !namePattern.test(a.apellidos)) {
          showToast('Asesor ' + (i + 1) + ': el campo Apellidos solo debe contener letras.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
      }

      const discInp = document.getElementById('c_disciplina');
      const discVal = discInp ? discInp.value.trim() : null;

      // Determinación de asesores / cuerpo técnico
      let finalAsesores = aRows;
      const chkInd = document.getElementById('c_chkAsesorIndividual');
      if (isJedpaConcurso(tipo)) {
        const dummyReg = {
          tipoConcursoId: tipo.id,
          tipoConcursoNombre: tipo.nombre,
          etapa: document.getElementById('c_etapa').value,
          categoria: document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '',
          genero: tipo.tieneGenero ? (document.getElementById('c_genero') ? document.getElementById('c_genero').value : null) : null,
          disciplina: discVal || null
        };
        const ctInfo = obtenerCuerpoTecnicoGrupo(dummyReg, state.concursoCuerpoTecnico || [], state.concursoRegistros || []);
        if (chkInd && !chkInd.checked && ctInfo && ctInfo.miembros && ctInfo.miembros.length > 0) {
          finalAsesores = ctInfo.miembros.map(m => ({
            rol: (m.rol || 'Delegado').trim(),
            apellidos: (m.apellidos || '').trim().toUpperCase(),
            nombres: (m.nombres || '').trim().toUpperCase(),
            dni: (m.dni || '').trim()
          }));
        } else if (finalAsesores.length > 0) {
          finalAsesores = finalAsesores.map(a => ({
            rol: (a.rol || 'Delegado').trim(),
            apellidos: (a.apellidos || '').trim().toUpperCase(),
            nombres: (a.nombres || '').trim().toUpperCase(),
            dni: (a.dni || '').trim()
          }));

          const ctDocId = generarConcursoCuerpoTecnicoDocId(
            dummyReg.etapa || 'UGEL',
            dummyReg.disciplina,
            dummyReg.categoria,
            formatGeneroDisplay(dummyReg.genero)
          );
          const existingCt = obtenerCuerpoTecnicoGrupo(dummyReg, state.concursoCuerpoTecnico || [], state.concursoRegistros || []);
          if (!existingCt.esGrupoFormalizado && (!chkInd || !chkInd.checked) && dbNs) {
            dbNs.collection('concursoCuerpoTecnico').doc(ctDocId).set({
              tipoConcursoId: 'jedpa',
              concursoNombre: tipo.nombre || 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
              etapa: dummyReg.etapa || 'UGEL',
              disciplina: dummyReg.disciplina,
              categoria: dummyReg.categoria,
              genero: dummyReg.genero,
              rama: formatGeneroDisplay(dummyReg.genero),
              miembros: finalAsesores,
              personas: finalAsesores,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              updatedBy: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista'
            }).catch(err => console.warn('Aviso guardando concursoCuerpoTecnico:', err));
          }
        }
      }

      const regData = {
        tipoConcursoId: tipo.id,
        tipoConcursoNombre: tipo.nombre,
        etapa: document.getElementById('c_etapa').value,
        categoria: document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '',
        genero: tipo.tieneGenero ? (document.getElementById('c_genero') ? document.getElementById('c_genero').value : null) : null,
        disciplina: discVal || null,
        institucion: document.getElementById('c_institucion').value.trim(),
        codigoModular: codModInp ? formatCodigoModular(codModInp.value) : '',
        tituloTrabajo: tipo.tieneTituloTrabajo ? (document.getElementById('c_tituloTrabajo') ? document.getElementById('c_tituloTrabajo').value.trim() : null) : null,
        seudonimo: tipo.tieneTituloTrabajo ? (document.getElementById('c_seudonimo') ? document.getElementById('c_seudonimo').value.trim() : null) : null,
        puesto: puestoVal || '',
        participantes: pRows,
        asesores: finalAsesores,
        resolucionRef: document.getElementById('c_resolucionRef') ? document.getElementById('c_resolucionRef').value.trim() : null,
        fecha: document.getElementById('c_fecha').value,
        responsable: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista',
        createdAt: isEditing ? (concursoEditingData.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
      };

      // Validar unicidad de puesto por Podio (Etapa + Categoría + Disciplina + Género...)
      const normP = normalizePuestoValue(puestoVal);
      const isTopPuesto = ['1.er puesto', '2.° puesto', '3.er puesto'].includes(normP);
      const isEmpate = (puestoVal || '').includes('(empate)');
      const podioKey = getPodioKey(regData, tipo);
      const existingRegs = state.concursoRegistros || [];

      if (isTopPuesto && !isEmpate) {
        const conflict = existingRegs.find(r => {
          if (isEditing && r.id === concursoEditingId) return false;
          const samePodio = getPodioKey(r, tipo) === podioKey;
          const samePuesto = normalizePuestoValue(r.puesto) === normP;
          return samePodio && samePuesto && !(r.puesto || '').includes('(empate)');
        });

        if (conflict) {
          updatePuestoSelectAnnotations();
          const cWrap = document.getElementById('c_puesto_conflict_wrap');
          if (cWrap) cWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          btn.disabled = false;
          btn.textContent = submitLabel;
          return;
        }
      }

      // Validar duplicado exacto (considerando Género para no bloquear a competidores de distinta rama)
      const exactDuplicate = existingRegs.find(r => {
        if (isEditing && r.id === concursoEditingId) return false;
        const sameTipo = (r.tipoConcursoId === tipo.id || r.tipoConcursoNombre === tipo.nombre);
        const sameInst = normalizeText(r.institucion) === normalizeText(regData.institucion);
        const sameCat = normalizeText(r.categoria) === normalizeText(regData.categoria);
        const sameDisc = normalizeText(r.disciplina) === normalizeText(regData.disciplina);
        const sameGen = tipo.tieneGenero ? (normalizeGenero(r.genero) === normalizeGenero(regData.genero)) : true;
        const pDnis = pRows.map(p => (p.dni || '').trim()).filter(Boolean);
        const rDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
        const sharesDni = pDnis.length > 0 && pDnis.some(d => rDnis.includes(d));
        return sameTipo && sameInst && sameCat && sameGen && (sharesDni || (sameDisc && normalizePuestoValue(r.puesto) === normP && normP !== ''));
      });

      if (exactDuplicate) {
        if (!confirm('Advertencia: Parece haber un registro idéntico o con los mismos participantes para esta I.E. en el sistema. ¿Deseas guardarlo de todas formas?')) {
          btn.disabled = false;
          btn.textContent = submitLabel;
          return;
        }
      }

      // Guardar con soporte transaccional y control de concurrencia
      const lockDocId = isTopPuesto ? getPodioLockDocId(podioKey, normP) : null;
      const oldLockDocId = (isEditing && concursoEditingData && ['1.er puesto', '2.° puesto', '3.er puesto'].includes(normalizePuestoValue(concursoEditingData.puesto)))
        ? getPodioLockDocId(getPodioKey(concursoEditingData, tipo), normalizePuestoValue(concursoEditingData.puesto))
        : null;

      if (typeof dbNs.runTransaction === 'function') {
        await dbNs.runTransaction(async (tx) => {
          let targetId = concursoEditingId;
          if (!targetId) {
            const newRef = dbNs.collection('concursoRegistros').doc();
            targetId = newRef.id;
          }

          if (isTopPuesto && !isEmpate && lockDocId) {
            const lockSnap = await tx.get(dbNs.collection('concursoPodioLocks').doc(lockDocId));
            if (lockSnap.exists) {
              const lData = lockSnap.data();
              if (lData && lData.registroId && lData.registroId !== targetId) {
                throw new Error(`El ${normP} fue ocupado simultáneamente por otro usuario en este podio.`);
              }
            }
            tx.set(dbNs.collection('concursoPodioLocks').doc(lockDocId), {
              registroId: targetId,
              podioKey: podioKey,
              puesto: normP,
              updatedAt: Date.now(),
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista'
            });
          }

          if (oldLockDocId && oldLockDocId !== lockDocId) {
            tx.delete(dbNs.collection('concursoPodioLocks').doc(oldLockDocId));
          }

          tx.set(dbNs.collection('concursoRegistros').doc(targetId), regData);

          if (isEditing && concursoEditingData && normalizePuestoValue(concursoEditingData.puesto) !== normP) {
            const histRef = dbNs.collection('concursoHistorial').doc();
            tx.set(histRef, {
              tipo: 'cambio_puesto',
              registroId: targetId,
              institucion: regData.institucion,
              podioKey: podioKey,
              puestoAnterior: concursoEditingData.puesto || 'Sin puesto',
              puestoNuevo: puestoVal || 'Sin puesto',
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista',
              fecha: Date.now()
            });
          }
        });
      } else {
        if (isEditing) {
          await dbNs.collection('concursoRegistros').doc(concursoEditingId).set(regData);
        } else {
          await dbNs.collection('concursoRegistros').add(regData);
        }
      }

      showToast(isEditing ? '✓ Registro de concurso actualizado exitosamente.' : '✓ Registro de concurso guardado exitosamente.');
      concursoEditingId = null;
      concursoEditingData = null;

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

// Modal para Reemplazar Puesto en Podio (Resolución de Conflictos)
function abrirModalReemplazoPuesto(conflictReg, newRegData, puestoVal, tipo, dbNs, state, currentEditingId, onDone) {
  const modalWrap = document.createElement('div');
  modalWrap.id = 'reemplazoPuestoModal';
  const podioLabel = getPodioLabel(conflictReg, tipo);
  const partConf = (conflictReg.participantes && conflictReg.participantes[0]) ? formatearNombre(conflictReg.participantes[0]) : 'Sin participante';
  const instNew = document.getElementById('c_institucion') ? document.getElementById('c_institucion').value.trim() : (newRegData.institucion || 'Nuevo registro');
  const partNew = (concursoParticipantes && concursoParticipantes[0] && concursoParticipantes[0].nombres)
    ? formatearNombre(concursoParticipantes[0])
    : 'Participante actual';

  modalWrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:250;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:var(--shadow-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px">🔄 Reemplazar puesto en podio</h3>
          <button type="button" class="iconBtn" id="m_reemp_close">✕</button>
        </div>
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px">
          Podio: <strong>${esc(podioLabel)}</strong>
        </p>

        <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:16px">
          <div style="font-size:11.5px;font-weight:700;color:var(--navy-900);margin-bottom:8px">VISTA PREVIA DEL REEMPLAZO</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px">
            <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid var(--line)">
              <div style="font-size:11px;font-weight:700;color:var(--danger)">OCUPANTE ACTUAL</div>
              <div style="margin-top:4px"><strong>${esc(conflictReg.institucion)}</strong></div>
              <div style="color:var(--ink-soft);font-size:11.5px">${esc(partConf)}</div>
              <div style="margin-top:6px"><span class="badge badge-puesto puesto-1">${esc(puestoVal)}</span></div>
            </div>
            <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid var(--line)">
              <div style="font-size:11px;font-weight:700;color:var(--ok)">NUEVO ASIGNADO</div>
              <div style="margin-top:4px"><strong>${esc(instNew)}</strong></div>
              <div style="color:var(--ink-soft);font-size:11.5px">${esc(partNew)}</div>
              <div style="margin-top:6px"><span class="badge badge-puesto puesto-1">${esc(puestoVal)}</span></div>
            </div>
          </div>
        </div>

        <div class="field" style="margin-bottom:18px">
          <label for="m_reemp_destino_antiguo">¿Qué puesto asignar al ocupante anterior (${esc(conflictReg.institucion)})?</label>
          <select id="m_reemp_destino_antiguo">
            <option value="">Sin puesto / Pendiente (Recomendado)</option>
            <option value="2.° puesto">🥈 2.° puesto</option>
            <option value="3.er puesto">🥉 3.er puesto</option>
            <option value="Mención honrosa">🎖️ Mención honrosa</option>
          </select>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button type="button" class="btn secondary" id="m_reemp_cancel">Cancelar</button>
          <button type="button" class="btn" id="m_reemp_confirm" style="background:var(--primary);color:#fff">Confirmar y Reemplazar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const closeModal = () => { if (modalWrap.parentNode) modalWrap.parentNode.removeChild(modalWrap); };
  document.getElementById('m_reemp_close').addEventListener('click', closeModal);
  document.getElementById('m_reemp_cancel').addEventListener('click', closeModal);

  document.getElementById('m_reemp_confirm').addEventListener('click', async () => {
    const btn = document.getElementById('m_reemp_confirm');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const destinoAntiguo = document.getElementById('m_reemp_destino_antiguo').value;
    const podioKey = getPodioKey(conflictReg, tipo);

    try {
      if (typeof dbNs.runTransaction === 'function') {
        await dbNs.runTransaction(async (tx) => {
          // 1. Actualizar el registro en conflicto
          tx.update(dbNs.collection('concursoRegistros').doc(conflictReg.id), {
            puesto: destinoAntiguo || '',
            updatedAt: Date.now()
          });

          // 2. Si se estaba editando el registro actual, actualizarlo en la misma transacción
          if (currentEditingId) {
            tx.update(dbNs.collection('concursoRegistros').doc(currentEditingId), {
              puesto: puestoVal,
              updatedAt: Date.now()
            });
          }

          // 3. Actualizar el bloqueo en concursoPodioLocks
          const lockDocId = getPodioLockDocId(podioKey, puestoVal);
          tx.set(dbNs.collection('concursoPodioLocks').doc(lockDocId), {
            registroId: currentEditingId || 'form_nuevo',
            podioKey: podioKey,
            puesto: puestoVal,
            updatedAt: Date.now(),
            usuario: 'Especialista'
          });

          // 4. Registrar en historial de bitácora
          const histDoc = dbNs.collection('concursoHistorial').doc();
          tx.set(histDoc, {
            tipo: 'reemplazo_puesto',
            podioKey: podioKey,
            puesto: puestoVal,
            registroAnteriorId: conflictReg.id,
            institucionAnterior: conflictReg.institucion,
            puestoAnteriorNuevo: destinoAntiguo || 'Sin puesto',
            institucionNueva: instNew,
            fecha: Date.now()
          });
        });
      } else {
        await dbNs.collection('concursoRegistros').doc(conflictReg.id).update({
          puesto: destinoAntiguo || '',
          updatedAt: Date.now()
        });
        if (currentEditingId) {
          await dbNs.collection('concursoRegistros').doc(currentEditingId).update({
            puesto: puestoVal,
            updatedAt: Date.now()
          });
        }
      }

      showToast(`✓ Se asignó el ${puestoVal} a ${instNew}.`);
      closeModal();
      if (onDone) onDone();
    } catch (err) {
      console.error('Error al reemplazar puesto:', err);
      showToast('Error al reemplazar puesto: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Confirmar y Reemplazar';
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

function syncConcursoFiltersToUrl(filters, isJedpa, isJfen) {
  try {
    const url = new URL(window.location.href);
    if (filters.tipoId) url.searchParams.set('concurso', filters.tipoId);
    else url.searchParams.delete('concurso');

    const curCats = getSelectedCategorias();
    const catUrlVal = curCats.length > 0 ? curCats.join(',') : '';

    if (isJedpa) {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');

      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');

      if (catUrlVal) url.searchParams.set('categoria', catUrlVal);
      else url.searchParams.delete('categoria');

      if (filters.genero) url.searchParams.set('genero', filters.genero);
      else url.searchParams.delete('genero');

      url.searchParams.delete('arte');
      url.searchParams.delete('modalidad');
    } else if (isJfen) {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');

      if (catUrlVal) url.searchParams.set('categoria', catUrlVal);
      else url.searchParams.delete('categoria');

      if (filters.arte) url.searchParams.set('arte', filters.arte);
      else url.searchParams.delete('arte');

      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');

      if (filters.modalidad) url.searchParams.set('modalidad', filters.modalidad);
      else url.searchParams.delete('modalidad');

      url.searchParams.delete('genero');
    } else {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');
      if (catUrlVal) url.searchParams.set('categoria', catUrlVal);
      else url.searchParams.delete('categoria');
      if (filters.genero) url.searchParams.set('genero', filters.genero);
      else url.searchParams.delete('genero');
      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');
      url.searchParams.delete('arte');
      url.searchParams.delete('modalidad');
    }

    if (filters.query) url.searchParams.set('q', filters.query);
    else url.searchParams.delete('q');

    window.history.replaceState(null, '', url.toString());
  } catch (e) { }
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
    if (params.has('categoria')) {
      const pVal = params.get('categoria');
      if (pVal) {
        concursoFilters.categoria = pVal.includes(',')
          ? pVal.split(',').map(s => s.trim()).filter(Boolean)
          : [pVal.trim()];
      } else {
        concursoFilters.categoria = [];
      }
    }
    if (params.has('genero')) concursoFilters.genero = params.get('genero');
    if (params.has('arte')) concursoFilters.arte = params.get('arte');
    if (params.has('modalidad')) concursoFilters.modalidad = params.get('modalidad');
    if (params.has('q')) concursoFilters.query = params.get('q');
  } catch (e) { }
}

function renderCategoryMultiSelectMarkup(contextId, categoriaOptions, selectedCats = []) {
  const items = (categoriaOptions || []).filter(o => !o.isAll);
  const totalOptions = items.length;
  const isAll = selectedCats.length === 0;

  let btnText = 'Todas';
  let btnTitle = 'Todas las categorías seleccionadas';
  if (!isAll) {
    const rawLabels = selectedCats.map(c => {
      const norm = normalizeFilterValue(c);
      const opt = items.find(o => o.value === norm);
      return opt ? opt.rawLabel : c;
    });
    btnTitle = rawLabels.join(', ');
    if (rawLabels.length === 1) {
      btnText = rawLabels[0];
    } else {
      const joined = rawLabels.join(', ');
      btnText = (joined.length <= 22) ? joined : `${selectedCats.length} seleccionadas`;
    }
  }

  const badgeHtml = (!isAll && selectedCats.length > 0)
    ? `<span class="catMultiSelectBadge">${selectedCats.length}</span>`
    : '';

  const isOpen = concursoCategoryDropdownOpen;
  const showSearch = totalOptions > 4;

  const optionsHtml = items.map(o => {
    const isChecked = selectedCats.some(c => normalizeFilterValue(c) === o.value);
    return `
      <label class="catMultiSelectOption ${isChecked ? 'selected' : ''}" data-val="${esc(o.value)}">
        <input type="checkbox" class="catOptionCheckbox" value="${esc(o.value)}" ${isChecked ? 'checked' : ''}>
        <span class="catOptionText">${esc(o.rawLabel)}</span>
        <span class="catOptionCount">(${o.count})</span>
      </label>
    `;
  }).join('') || '<div style="padding:12px;font-size:12.5px;color:var(--ink-soft);text-align:center;font-style:italic">Sin opciones de categoría</div>';

  const summaryText = isAll
    ? 'Mostrando todas'
    : `${selectedCats.length} de ${totalOptions} categoría${selectedCats.length === 1 ? '' : 's'}`;

  return `
    <div class="catMultiSelectWrap" id="wrap_cf_categoria">
      <button type="button" class="catMultiSelectBtn ${isOpen ? 'active' : ''} ${totalOptions === 0 ? 'disabled' : ''}" id="btn_cf_categoria" aria-haspopup="listbox" aria-expanded="${isOpen ? 'true' : 'false'}" title="${esc(btnTitle)}" ${totalOptions === 0 ? 'disabled' : ''}>
        <span class="catMultiSelectBtnLabel" id="txt_cf_categoria">${esc(btnText)}</span>
        <div style="display:flex;align-items:center;gap:5px">
          ${badgeHtml}
          <span class="catMultiSelectBtnIcon">▾</span>
        </div>
      </button>
      <div class="catMultiSelectDropdown" id="drop_cf_categoria" style="display:${isOpen ? 'flex' : 'none'}" role="listbox">
        ${showSearch ? `
          <div class="catMultiSelectSearch">
            <input type="search" placeholder="Buscar categoría..." id="input_cf_categoria_search" value="${esc(concursoCategorySearchText || '')}" autocomplete="off">
          </div>
        ` : ''}
        <div class="catMultiSelectHeader">
          <label class="catMultiSelectAllLabel">
            <input type="checkbox" id="chk_cf_categoria_all" ${isAll ? 'checked' : ''}>
            <span><strong>Todas las categorías</strong></span>
          </label>
          ${!isAll ? `<button type="button" class="catClearLink" id="link_cf_categoria_clear">Limpiar</button>` : ''}
        </div>
        <div class="catMultiSelectList" id="list_cf_categoria">
          ${optionsHtml}
        </div>
        <div class="catMultiSelectFooter">
          <span class="catSelectedSummary">${esc(summaryText)}</span>
          <button type="button" class="btn small primary catCloseBtn" id="btn_cf_categoria_close">Listo ✓</button>
        </div>
      </div>
      <input type="hidden" id="cf_categoria" value="${esc(selectedCats.join(','))}">
    </div>
  `;
}

function setupCategoryMultiSelectEvents(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const wrap = document.getElementById('wrap_cf_categoria');
  if (!wrap) return;

  const btn = document.getElementById('btn_cf_categoria');
  const drop = document.getElementById('drop_cf_categoria');
  const inputSearch = document.getElementById('input_cf_categoria_search');
  const list = document.getElementById('list_cf_categoria');
  const chkAll = document.getElementById('chk_cf_categoria_all');
  const linkClear = document.getElementById('link_cf_categoria_clear');
  const btnClose = document.getElementById('btn_cf_categoria_close');

  if (btn && drop) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drop.style.display !== 'none';
      if (isOpen) {
        drop.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        concursoCategoryDropdownOpen = false;
      } else {
        drop.style.display = 'flex';
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');
        concursoCategoryDropdownOpen = true;
        if (inputSearch) {
          inputSearch.value = concursoCategorySearchText || '';
          filterCatOptions(concursoCategorySearchText || '');
          inputSearch.focus();
        }
      }
    });
  }

  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drop && drop.style.display !== 'none') {
        drop.style.display = 'none';
        btn?.setAttribute('aria-expanded', 'false');
        btn?.classList.remove('active');
        concursoCategoryDropdownOpen = false;
        btn?.focus();
      }
    }
  });

  function filterCatOptions(q) {
    if (!list) return;
    const normQ = normalizeFilterValue(q);
    const opts = list.querySelectorAll('.catMultiSelectOption');
    opts.forEach(opt => {
      const text = normalizeFilterValue(opt.textContent);
      opt.style.display = (!normQ || text.includes(normQ)) ? 'flex' : 'none';
    });
  }

  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      concursoCategorySearchText = e.target.value;
      filterCatOptions(e.target.value);
    });
    if (concursoCategorySearchText) {
      filterCatOptions(concursoCategorySearchText);
    }
  }

  if (chkAll) {
    chkAll.addEventListener('change', (e) => {
      e.stopPropagation();
      setSelectedCategorias([]);
      concursoCategoryDropdownOpen = true;
      if (list) concursoCategoryListScrollTop = list.scrollTop;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  if (linkClear) {
    linkClear.addEventListener('click', (e) => {
      e.stopPropagation();
      setSelectedCategorias([]);
      concursoCategoryDropdownOpen = true;
      if (list) concursoCategoryListScrollTop = list.scrollTop;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  if (list) {
    list.querySelectorAll('.catOptionCheckbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const val = chk.value;
        const checked = chk.checked;
        let cur = getSelectedCategorias();
        const norm = normalizeFilterValue(val);
        if (checked) {
          if (!cur.some(c => normalizeFilterValue(c) === norm)) {
            cur.push(val);
          }
        } else {
          cur = cur.filter(c => normalizeFilterValue(c) !== norm);
        }
        setSelectedCategorias(cur);
        concursoCategoryDropdownOpen = true;
        concursoCategoryListScrollTop = list.scrollTop;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    });

    if (concursoCategoryListScrollTop && concursoCategoryDropdownOpen) {
      list.scrollTop = concursoCategoryListScrollTop;
    }
  }

  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drop) drop.style.display = 'none';
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        btn.focus();
      }
      concursoCategoryDropdownOpen = false;
    });
  }
}

if (typeof window !== 'undefined' && !window._concursoCatDropdownOutsideInit) {
  window._concursoCatDropdownOutsideInit = true;
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#wrap_cf_categoria')) {
      const drop = document.getElementById('drop_cf_categoria');
      const btn = document.getElementById('btn_cf_categoria');
      if (drop && drop.style.display !== 'none') {
        drop.style.display = 'none';
        if (btn) {
          btn.setAttribute('aria-expanded', 'false');
          btn.classList.remove('active');
        }
        concursoCategoryDropdownOpen = false;
      }
    }
  });
}

export function renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
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
  const isJfen = tipo && (
    tipo.id === 'jfen' ||
    (tipo.nombre || '').toLowerCase().includes('jfen') ||
    (tipo.nombre || '').toLowerCase().includes('florales')
  );

  let filtered = [];
  let baseRows = [];
  let etapaOptions = [];
  let disciplinaOptions = [];
  let categoriaOptions = [];
  let generoOptions = [];
  let arteOptions = [];
  let modalidadOptions = [];
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

    // 3. CATEGORÍA (Multiselect)
    categoriaOptions = getFacetOptions(disciplinaRows, 'categoria', 'Todas', 'Sin categoría');
    let selectedCats = getSelectedCategorias();
    if (selectedCats.length > 0) {
      const validCats = selectedCats.filter(c => c === '__empty__' || categoriaOptions.some(o => o.value === normalizeFilterValue(c)));
      if (validCats.length !== selectedCats.length) {
        selectedCats = validCats;
        setSelectedCategorias(selectedCats);
        if (selectedCats.length === 0) {
          showToast('Categoría reiniciada: no hay registros con esa combinación.');
        }
      }
    }
    let categoriaRows = disciplinaRows;
    if (selectedCats.length > 0) {
      categoriaRows = disciplinaRows.filter(r => {
        const norm = normalizeFilterValue(r.categoria);
        if (!norm) return selectedCats.includes('__empty__');
        return selectedCats.some(c => normalizeFilterValue(c) === norm);
      });
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

  } else if (isJfen) {
    baseRows = regs.filter(r => {
      if (r.tipoConcursoId === tipo.id) return true;
      if (tipo && (r.tipoConcursoNombre === tipo.nombre || r.tipoConcurso === tipo.nombre)) return true;
      return false;
    });

    // Añadir propiedades virtuales parseadas para filtrado fluido y limpio
    baseRows.forEach(r => {
      const p = parseArteDisciplina(r.disciplina);
      r._arte = p.arte;
      r._disciplina = p.disciplina;
      r._modalidad = (r.modalidad || r.modalidadParticipacion || '').trim();
    });

    // 1. ETAPA
    etapaOptions = getFacetOptions(baseRows, 'etapa', 'Todas las etapas', 'Sin etapa');
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

    // 2. CATEGORÍA (Multiselect)
    categoriaOptions = getFacetOptions(etapaRows, 'categoria', 'Todas las categorías', 'Sin categoría');
    let selectedCats = getSelectedCategorias();
    if (selectedCats.length > 0) {
      const validCats = selectedCats.filter(c => c === '__empty__' || categoriaOptions.some(o => o.value === normalizeFilterValue(c)));
      if (validCats.length !== selectedCats.length) {
        selectedCats = validCats;
        setSelectedCategorias(selectedCats);
        if (selectedCats.length === 0) {
          showToast('Categoría reiniciada: no hay registros con esa combinación.');
        }
      }
    }
    let categoriaRows = etapaRows;
    if (selectedCats.length > 0) {
      categoriaRows = etapaRows.filter(r => {
        const norm = normalizeFilterValue(r.categoria);
        if (!norm) return selectedCats.includes('__empty__');
        return selectedCats.some(c => normalizeFilterValue(c) === norm);
      });
    }

    // 3. ARTE
    arteOptions = getFacetOptions(categoriaRows, '_arte', 'Todas las áreas', 'Sin área');
    if (concursoFilters.arte && !arteOptions.some(o => o.value === concursoFilters.arte)) {
      concursoFilters.arte = '';
      showToast('Área de arte reiniciada: no hay registros con esa combinación.');
    }
    let arteRows = categoriaRows;
    if (concursoFilters.arte) {
      if (concursoFilters.arte === '__empty__') {
        arteRows = categoriaRows.filter(r => !r._arte || r._arte.trim() === '');
      } else {
        arteRows = categoriaRows.filter(r => normalizeFilterValue(r._arte) === concursoFilters.arte);
      }
    }

    // 4. DISCIPLINA
    disciplinaOptions = getFacetOptions(arteRows, '_disciplina', 'Todas las disciplinas', 'Sin disciplina');
    if (concursoFilters.disciplina && !disciplinaOptions.some(o => o.value === concursoFilters.disciplina)) {
      concursoFilters.disciplina = '';
      showToast('Disciplina reiniciada: no hay registros con esa combinación.');
    }
    let disciplinaRows = arteRows;
    if (concursoFilters.disciplina) {
      if (concursoFilters.disciplina === '__empty__') {
        disciplinaRows = arteRows.filter(r => !r._disciplina || r._disciplina.trim() === '');
      } else {
        disciplinaRows = arteRows.filter(r => normalizeFilterValue(r._disciplina) === concursoFilters.disciplina);
      }
    }

    // 5. MODALIDAD
    modalidadOptions = getFacetOptions(disciplinaRows, '_modalidad', 'Todas las modalidades', 'Sin modalidad');
    if (concursoFilters.modalidad && !modalidadOptions.some(o => o.value === concursoFilters.modalidad)) {
      concursoFilters.modalidad = '';
    }
    let modalidadRows = disciplinaRows;
    if (concursoFilters.modalidad) {
      if (concursoFilters.modalidad === '__empty__') {
        modalidadRows = disciplinaRows.filter(r => !r._modalidad);
      } else {
        modalidadRows = disciplinaRows.filter(r => normalizeFilterValue(r._modalidad) === concursoFilters.modalidad);
      }
    }

    // 6. BUSCAR
    filtered = modalidadRows;
    if (concursoFilters.query) {
      const q = normalizeText(concursoFilters.query);
      filtered = filtered.filter(r => {
        if (normalizeText(r.institucion).includes(q)) return true;
        if (normalizeText(r.tituloTrabajo).includes(q)) return true;
        if (normalizeText(r.disciplina).includes(q)) return true;
        if (normalizeText(r._arte).includes(q)) return true;
        if (normalizeText(r._disciplina).includes(q)) return true;
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
    etapaRows = baseRows;
    if (concursoFilters.etapa) {
      filtered = filtered.filter(r => (r.etapa || '').toUpperCase() === concursoFilters.etapa.toUpperCase());
      etapaRows = filtered.slice();
    }

    categoriaOptions = getFacetOptions(etapaRows, 'categoria', 'Todas las categorías', 'Sin categoría');
    if (tipo && Array.isArray(tipo.categorias) && tipo.categorias.length > 0) {
      const existingVals = new Set(categoriaOptions.map(o => o.value));
      const definedOpts = [];
      tipo.categorias.forEach(catName => {
        const norm = normalizeFilterValue(catName);
        if (!existingVals.has(norm)) {
          definedOpts.push({
            value: norm,
            label: `${catName} (0)`,
            rawLabel: catName,
            count: 0
          });
        }
      });
      categoriaOptions.push(...definedOpts);

      const normOrder = tipo.categorias.map(c => normalizeFilterValue(c));
      const allOpt = categoriaOptions[0];
      const items = categoriaOptions.slice(1);
      items.sort((a, b) => {
        const idxA = normOrder.indexOf(a.value);
        const idxB = normOrder.indexOf(b.value);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.rawLabel.localeCompare(b.rawLabel, undefined, { numeric: true });
      });
      categoriaOptions = [allOpt, ...items];
    }

    let selectedCats = getSelectedCategorias();
    if (selectedCats.length > 0) {
      filtered = filtered.filter(r => {
        const norm = normalizeFilterValue(r.categoria);
        if (!norm) return selectedCats.includes('__empty__');
        return selectedCats.some(c => normalizeFilterValue(c) === norm);
      });
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

  syncConcursoFiltersToUrl(concursoFilters, isJedpa, isJfen);

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
    const discComp = (a.disciplina || '').localeCompare(b.disciplina || '');
    if (discComp !== 0) return discComp;
    const catComp = (a.categoria || '').localeCompare(b.categoria || '');
    if (catComp !== 0) return catComp;
    const genComp = (a.genero || '').localeCompare(b.genero || '');
    if (genComp !== 0) return genComp;
    const pA = puestoWeight(a.puesto);
    const pB = puestoWeight(b.puesto);
    if (pA !== pB) return pA - pB;
    return (a.institucion || '').localeCompare(b.institucion || '');
  });

  // Configuración oficial del concurso
  const concursoCfg = getConcursoConfig(tipo ? tipo.nombre : '');

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

  // Cálculo de cuerpo técnico único para JEDPA
  const ctSet = new Set();
  filtered.forEach(r => {
    const ctInfo = obtenerCuerpoTecnicoGrupo(r, state.concursoCuerpoTecnico || [], filtered);
    (ctInfo.miembros || []).forEach(m => {
      const k = (m.dni && m.dni.trim()) ? m.dni.trim() : [m.nombres, m.apellidos].filter(Boolean).join(' ').trim().toUpperCase();
      if (k) ctSet.add(k);
    });
  });
  const totalCtUnicos = ctSet.size > 0 ? ctSet.size : totalAsesUnicos;

  // Banner informativo del cuerpo técnico si se está filtrando un grupo específico en JEDPA
  const isGroupFiltered = isJedpa && concursoFilters.disciplina && concursoFilters.categoria && concursoFilters.genero;
  let groupCtBannerHtml = '';
  if (isGroupFiltered && filtered.length > 0) {
    const groupCt = obtenerCuerpoTecnicoGrupo(filtered[0], state.concursoCuerpoTecnico || [], filtered);
    const miembrosCt = groupCt.miembros || [];
    const origenLabel = groupCt.origen === 'concursoCuerpoTecnico' ? 'Oficial centralizado' : 'Detectado en registros del grupo';
    groupCtBannerHtml = `
      <div class="panel" style="margin-bottom:14px;border-left:4px solid var(--primary);background:var(--surface-1,#f8fafc);padding:14px 18px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <strong style="color:var(--navy-900);font-size:13.5px">👥 Delegado / Entrenador del grupo:</strong>
              <span class="badge" style="font-size:11px;background:var(--primary-tint,#e0e7ff);color:var(--primary,#3730a3)">${esc(origenLabel)}</span>
            </div>
            <div style="margin-top:6px;font-size:13px;line-height:1.5">
              ${miembrosCt.length > 0 ? miembrosCt.map(m => `
                <span style="display:inline-block;margin-right:16px">
                  <strong>${esc(m.rol ? m.rol.toUpperCase() : 'DELEGADO')}:</strong> ${esc((m.apellidos || '').toUpperCase())} ${esc((m.nombres || '').toUpperCase())} ${m.dni ? `<small style="color:var(--ink-soft)">(${esc(m.dni)})</small>` : ''}
                </span>
              `).join('') : '<span style="color:var(--ink-soft);font-style:italic">Sin cuerpo técnico asignado a este grupo</span>'}
            </div>
          </div>
          ${isAdmin ? '<button type="button" class="btn secondary small" id="btnConsolidarCtGrupoBanner" style="font-size:11.5px">⚙️ Gestionar cuerpo técnico</button>' : ''}
        </div>
      </div>
    `;
  }

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
    const curCats = getSelectedCategorias();
    if (curCats.length > 0) {
      curCats.forEach(c => {
        const norm = normalizeFilterValue(c);
        const opt = categoriaOptions.find(o => o.value === norm);
        chips.push({ key: `categoria:${norm}`, label: `Categoría: ${opt ? opt.rawLabel : c}` });
      });
    }
    if (concursoFilters.genero) {
      const opt = generoOptions.find(o => o.value === concursoFilters.genero);
      chips.push({ key: 'genero', label: `Género: ${opt ? opt.rawLabel : concursoFilters.genero}` });
    }
  } else if (isJfen) {
    if (concursoFilters.etapa) {
      const opt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      chips.push({ key: 'etapa', label: `Etapa: ${opt ? opt.rawLabel : concursoFilters.etapa}` });
    }
    const curCats = getSelectedCategorias();
    if (curCats.length > 0) {
      curCats.forEach(c => {
        const norm = normalizeFilterValue(c);
        const opt = categoriaOptions.find(o => o.value === norm);
        chips.push({ key: `categoria:${norm}`, label: `Categoría: ${opt ? opt.rawLabel : c}` });
      });
    }
    if (concursoFilters.arte) {
      const opt = arteOptions.find(o => o.value === concursoFilters.arte);
      chips.push({ key: 'arte', label: `Arte: ${opt ? opt.rawLabel : concursoFilters.arte}` });
    }
    if (concursoFilters.disciplina) {
      const opt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      chips.push({ key: 'disciplina', label: `Disciplina: ${opt ? opt.rawLabel : concursoFilters.disciplina}` });
    }
    if (concursoFilters.modalidad) {
      const opt = modalidadOptions.find(o => o.value === concursoFilters.modalidad);
      chips.push({ key: 'modalidad', label: `Modalidad: ${opt ? opt.rawLabel : concursoFilters.modalidad}` });
    }
  } else {
    if (concursoFilters.etapa) chips.push({ key: 'etapa', label: `Etapa: ${concursoFilters.etapa}` });
    const curCats = getSelectedCategorias();
    if (curCats.length > 0) {
      curCats.forEach(c => {
        const norm = normalizeFilterValue(c);
        const opt = (categoriaOptions || []).find(o => o.value === norm);
        chips.push({ key: `categoria:${norm}`, label: `Categoría: ${opt ? opt.rawLabel : c}` });
      });
    }
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
    const curCats = getSelectedCategorias();
    if (curCats.length === 1) {
      const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(curCats[0]));
      tableTitleParts.push(`Categoría ${cOpt ? cOpt.rawLabel : curCats[0]}`);
    } else if (curCats.length > 1) {
      const names = curCats.map(c => {
        const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(c));
        return cOpt ? cOpt.rawLabel : c;
      });
      tableTitleParts.push(`Categorías: ${names.join(', ')}`);
    }
    if (concursoFilters.genero) {
      const gOpt = generoOptions.find(o => o.value === concursoFilters.genero);
      tableTitleParts.push(gOpt ? gOpt.rawLabel : concursoFilters.genero);
    }
  } else if (isJfen) {
    if (concursoFilters.etapa) {
      const eOpt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      tableTitleParts.push(`Etapa ${eOpt ? eOpt.rawLabel : concursoFilters.etapa}`);
    }
    const curCats = getSelectedCategorias();
    if (curCats.length === 1) {
      const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(curCats[0]));
      tableTitleParts.push(`Categoría ${cOpt ? cOpt.rawLabel : curCats[0]}`);
    } else if (curCats.length > 1) {
      const names = curCats.map(c => {
        const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(c));
        return cOpt ? cOpt.rawLabel : c;
      });
      tableTitleParts.push(`Categorías: ${names.join(', ')}`);
    }
    if (concursoFilters.arte) {
      const aOpt = arteOptions.find(o => o.value === concursoFilters.arte);
      tableTitleParts.push(aOpt ? aOpt.rawLabel : concursoFilters.arte);
    }
    if (concursoFilters.disciplina) {
      const dOpt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      tableTitleParts.push(dOpt ? dOpt.rawLabel : concursoFilters.disciplina);
    }
  } else {
    if (concursoFilters.etapa) {
      tableTitleParts.push(`Etapa ${concursoFilters.etapa}`);
    }
    const curCats = getSelectedCategorias();
    if (curCats.length === 1) {
      const cOpt = (categoriaOptions || []).find(o => o.value === normalizeFilterValue(curCats[0]));
      tableTitleParts.push(`Categoría ${cOpt ? cOpt.rawLabel : curCats[0]}`);
    } else if (curCats.length > 1) {
      const names = curCats.map(c => {
        const cOpt = (categoriaOptions || []).find(o => o.value === normalizeFilterValue(c));
        return cOpt ? cOpt.rawLabel : c;
      });
      tableTitleParts.push(`Categorías: ${names.join(', ')}`);
    }
  }
  const dynamicTableTitle = 'Resultados consolidados: ' + tableTitleParts.join(' · ');

  // Filas de la tabla de resultados (Modo Tabla)
  const rowsHtml = filtered.map(r => {
    const isExpanded = concursoExpandedId === r.id;
    const partSummary = (r.participantes || []).map(p => {
      const nom = formatearNombre(p);
      const dni = p.dni ? ' <small style="color:var(--ink-soft)">(' + esc(p.dni) + ')</small>' : '';
      const rol = (p.rol && p.rol !== 'Estudiante' && p.rol !== 'Deportista') ? ' <small style="color:var(--ink-soft)">[' + esc(p.rol) + ']</small>' : '';
      return esc(nom) + dni + rol;
    }).join('<br>') || '<span style="color:var(--ink-soft);font-style:italic">Sin participante registrado</span>';

    let asesSummary = '';
    if (isJedpa) {
      const ctGrupo = obtenerCuerpoTecnicoGrupo(r, state.concursoCuerpoTecnico || [], filtered);
      // Prioridad 1: Cuerpo técnico formalizado a nivel de grupo en concursoCuerpoTecnico
      if (ctGrupo.esGrupoFormalizado && ctGrupo.miembros && ctGrupo.miembros.length > 0) {
        asesSummary = ctGrupo.miembros.map(a => {
          const nom = formatearNombre(a).toUpperCase();
          const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
          const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol.toUpperCase()) + ']</small>' : '';
          return esc(nom) + dni + rol;
        }).join('<br>') + ' <br><span class="badge" style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;margin-top:3px;display:inline-block">Formalizado</span>';
      } else if (r.asesores && r.asesores.length > 0) {
        // Prioridad 2: Asesor individual guardado en el registro
        asesSummary = r.asesores.map(a => {
          const nom = formatearNombre(a).toUpperCase();
          const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
          const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol.toUpperCase()) + ']</small>' : '';
          return esc(nom) + dni + rol;
        }).join('<br>');
      } else if (ctGrupo.miembros && ctGrupo.miembros.length > 0) {
        // Asesor detectado automáticamente en el grupo
        asesSummary = ctGrupo.miembros.map(a => {
          const nom = formatearNombre(a).toUpperCase();
          const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
          const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol.toUpperCase()) + ']</small>' : '';
          return esc(nom) + dni + rol;
        }).join('<br>');
      } else {
        // Prioridad 3: Sin cuerpo técnico registrado
        asesSummary = '<span style="color:var(--ink-soft);font-style:italic">Sin cuerpo técnico registrado</span>';
      }
    } else {
      asesSummary = (r.asesores || []).map(a => {
        const nom = formatearNombre(a);
        const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
        const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol) + ']</small>' : '';
        return esc(nom) + dni + rol;
      }).join('<br>') || '<span style="color:var(--ink-soft);font-style:italic">Sin docente asesor registrado</span>';
    }

    let detExtra = [];
    if (!concursoFilters.tipoId) {
      detExtra.push('<span class="badge" style="background:var(--primary-tint);color:var(--primary);font-size:10.5px;font-weight:600">' + esc(r.tipoConcursoNombre || r.tipoConcurso || 'Concurso') + '</span>');
    }
    if (r.genero) detExtra.push('<span class="badge" style="background:var(--surface-2);font-size:10.5px">' + esc(r.genero) + '</span>');
    if (r.disciplina) detExtra.push('<strong>' + esc(r.disciplina) + '</strong>');
    if (r.tituloTrabajo) detExtra.push('<em>«' + esc(r.tituloTrabajo) + '»</em>' + (r.seudonimo ? ' <small style="color:var(--ink-soft)">(' + esc(r.seudonimo) + ')</small>' : ''));
    const detHtml = detExtra.join('<br>') || '—';

    const editBtn = '<button class="btn secondary small" data-cedit="' + r.id + '" title="Editar registro">✏️</button>';
    const delBtn = isAdmin ? '<button class="iconBtn" data-cdel="' + r.id + '" title="Eliminar registro">✕</button>' : '';

    let detailContent = '';
    if (isExpanded) {
      const partListDetailed = (r.participantes || []).map(p => {
        const nom = formatearNombre(p);
        return '<li><strong>' + esc(nom) + '</strong> · DNI: ' + esc(p.dni || '—') + ' · Rol: ' + esc(p.rol || 'Participante') + '</li>';
      }).join('');
      const asesListDetailed = (r.asesores || []).map(a => {
        const nom = isJedpa ? formatearNombre(a).toUpperCase() : formatearNombre(a);
        const rol = isJedpa ? (a.rol ? a.rol.toUpperCase() : 'DELEGADO') : (a.rol || 'Asesor');
        return '<li><strong>' + esc(nom) + '</strong> · DNI: ' + esc(a.dni || '—') + ' · Rol: ' + esc(rol) + '</li>';
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

  // Tarjetas de Ficha por Categoría y Disciplina (Modo Fichas JFEN)
  const fichasHtml = filtered.map(r => {
    const editBtn = '<button type="button" class="btn secondary small" data-cedit="' + r.id + '" title="Editar registro">✏️ Editar</button>';
    const delBtn = isAdmin ? '<button type="button" class="iconBtn" data-cdel="' + r.id + '" title="Eliminar registro" style="margin-left:6px">✕</button>' : '';

    const parts = (r.participantes || []).slice().sort((a, b) => {
      const nomA = formatearNombre(a);
      const nomB = formatearNombre(b);
      return nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
    });

    const ases = (r.asesores || []);

    const partRowsHtml = parts.map((p, idx) => {
      const isAlt = (idx % 2 === 1) ? ' class="rowAlt"' : '';
      const nom = formatearNombre(p);
      const dni = p.dni ? esc(p.dni) : '—';
      const rowHeaderCell = (idx === 0)
        ? `<td rowspan="${Math.max(parts.length, 1)}" class="rowHeaderPart">Estudiantes (${parts.length})</td>`
        : '';
      return `
        <tr${isAlt}>
          ${rowHeaderCell}
          <td style="width:36px;text-align:center;color:var(--ink-soft);font-size:11.5px">${idx + 1}</td>
          <td class="partNameCell">${esc(nom)}</td>
          <td class="partDniCell">${dni}</td>
        </tr>
      `;
    }).join('') || `
      <tr>
        <td class="rowHeaderPart">Estudiantes (0)</td>
        <td colspan="3" style="color:var(--ink-soft);font-style:italic;padding:10px 14px">Sin estudiantes registrados</td>
      </tr>
    `;

    const asesRowsHtml = ases.map(a => {
      const nom = formatearNombre(a);
      const dni = a.dni ? esc(a.dni) : '—';
      return `
        <tr class="rowDocente">
          <td class="rowHeaderDoc">Docente Asesor</td>
          <td style="width:36px;text-align:center;color:var(--ink-soft);font-size:11.5px">—</td>
          <td class="partNameCell" style="font-weight:600">${esc(nom)}</td>
          <td class="partDniCell">${dni}</td>
        </tr>
      `;
    }).join('') || `
      <tr class="rowDocente">
        <td class="rowHeaderDoc">Docente Asesor</td>
        <td colspan="3" style="color:var(--ink-soft);font-style:italic;padding:10px 14px">Sin docente asesor registrado</td>
      </tr>
    `;

    const parsed = parseArteDisciplina(r.disciplina);
    const arteStr = r._arte || parsed.arte || '—';
    const discStr = r._disciplina || parsed.disciplina || r.disciplina || '—';

    return `
      <div class="jfenFichaCard">
        <div class="jfenCategoryBar">CATEGORÍA ${esc(r.categoria || '—')}</div>
        <table class="jfenMetaTable">
          <tbody>
            <tr>
              <th class="metaLabel">Arte</th>
              <td class="metaVal"><strong>${esc(arteStr)}</strong></td>
            </tr>
            <tr>
              <th class="metaLabel">Disciplina</th>
              <td class="metaVal"><strong>${esc(discStr)}</strong></td>
            </tr>
            <tr>
              <th class="metaLabel">Institución Educativa</th>
              <td class="metaVal"><strong>${esc(r.institucion || '—')}</strong></td>
            </tr>
            <tr>
              <th class="metaLabel">Código Modular</th>
              <td class="metaVal">${esc(r.codigoModular || '—')}</td>
            </tr>
            ${r.tituloTrabajo ? `
              <tr>
                <th class="metaLabel">Título de la Obra</th>
                <td class="metaVal"><em>«${esc(r.tituloTrabajo)}»</em> ${r.seudonimo ? `<small style="color:var(--ink-soft)">(${esc(r.seudonimo)})</small>` : ''}</td>
              </tr>
            ` : ''}
            <tr>
              <th class="metaLabel">Puesto obtenido</th>
              <td class="metaVal">${formatPuestoBadge(r.puesto)}</td>
            </tr>
            <tr>
              <th class="metaLabel">Resolución Directoral</th>
              <td class="metaVal">${esc(r.resolucionRef || '—')}</td>
            </tr>
          </tbody>
        </table>
        <table class="jfenParticipantsTable">
          <thead>
            <tr>
              <th style="width:140px">Condición</th>
              <th style="width:36px">N°</th>
              <th>Apellidos y Nombres</th>
              <th style="width:110px;text-align:center">DNI</th>
            </tr>
          </thead>
          <tbody>
            ${partRowsHtml}
            ${asesRowsHtml}
          </tbody>
        </table>
        <div class="jfenCardFooter">
          <span style="font-size:12px;color:var(--ink-soft)">Etapa: <strong>${esc(r.etapa || '—')}</strong></span>
          <div style="margin-left:auto;display:flex;align-items:center">
            ${editBtn}
            ${delBtn}
          </div>
        </div>
      </div>
    `;
  }).join('');

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

            <!-- 3. CATEGORÍA (Multiselect) -->
            <div class="jedpaFilterField">
              <label for="btn_cf_categoria">3. Categoría</label>
              ${renderCategoryMultiSelectMarkup('jedpa', categoriaOptions, getSelectedCategorias())}
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

          <!-- Fila 3: Botones de acción agrupados -->
          <div class="concursoActionsRow">
            <div class="concursoActionsLeft">
              <button type="button" class="btn secondary small" id="cf_clear">Limpiar</button>
              <button type="button" class="btn secondary small" id="cf_asignarPuestosBtn" title="Asignar puestos por podio de forma masiva">🏆 Asignar puestos</button>
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_consolidarCuerpoTecnicoBtn" title="Asistente para consolidar el cuerpo técnico por grupo">👥 Consolidar cuerpo técnico</button>' : ''}
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" title="Importar 83 ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
              <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
            </div>
            <div class="concursoActionsRight">
              <button type="button" class="btn secondary small" id="cf_exportCsv">Exportar CSV</button>
              <button type="button" class="btn small" id="cf_exportPdf">⬇ Descargar reporte (PDF)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (isJfen) {
    filterBarHtml = `
      <div class="panel" style="margin-bottom:16px">
        <div class="jfenFilterContainer">
          <!-- Fila 0: Tipo de concurso (ancho completo) -->
          <div class="jfenRowTipo">
            <div class="jedpaFilterField">
              <label for="cf_tipo">Tipo de concurso</label>
              <select id="cf_tipo" title="${esc(tipo ? tipo.nombre : 'Juegos Florales Escolares Nacionales (JFEN)')}">
                <option value="">Todos los concursos (${regs.length})</option>
                ${tipos.map(t => `<option value="${t.id}" ${t.id === concursoFilters.tipoId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Fila 1: Cascada (1. ETAPA -> 2. CATEGORÍA -> 3. ARTE -> 4. DISCIPLINA -> 5. MODALIDAD -> 6. BUSCAR) -->
          <div class="jfenFiltersGrid">
            <!-- 1. ETAPA -->
            <div class="jedpaFilterField">
              <label for="cf_etapa">1. Etapa</label>
              <select id="cf_etapa" ${etapaOptions.length <= 1 ? 'disabled' : ''}>
                ${etapaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.etapa ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
              </select>
            </div>

            <!-- 2. CATEGORÍA (Multiselect) -->
            <div class="jedpaFilterField">
              <label for="btn_cf_categoria">2. Categoría</label>
              ${renderCategoryMultiSelectMarkup('jfen', categoriaOptions, getSelectedCategorias())}
            </div>

            <!-- 3. ARTE -->
            <div class="jedpaFilterField">
              <label for="cf_arte">3. Arte / Área</label>
              <select id="cf_arte" ${arteOptions.length <= 1 ? 'disabled' : ''}>
                ${arteOptions.length <= 1
        ? '<option value="">Sin opciones</option>'
        : arteOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.arte ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
      }
              </select>
            </div>

            <!-- 4. DISCIPLINA -->
            <div class="jedpaFilterField">
              <label for="cf_disciplina">4. Disciplina</label>
              <select id="cf_disciplina" ${disciplinaOptions.length <= 1 ? 'disabled' : ''}>
                ${disciplinaOptions.length <= 1
        ? '<option value="">Sin opciones</option>'
        : disciplinaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.disciplina ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
      }
              </select>
            </div>

            <!-- 5. MODALIDAD (solo si aplica) -->
            ${modalidadOptions.length > 1 ? `
              <div class="jedpaFilterField">
                <label for="cf_modalidad">5. Modalidad</label>
                <select id="cf_modalidad">
                  ${modalidadOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.modalidad ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
              </div>
            ` : ''}

            <!-- 6. BUSCAR -->
            <div class="jedpaFilterField" style="min-width:180px">
              <label for="cf_query">Buscar</label>
              <input type="search" id="cf_query" value="${esc(concursoFilters.query)}" placeholder="I.E., estudiante, DNI, RD...">
            </div>
          </div>

          <!-- Fila 2: Chips de filtros activos + Contador -->
          <div class="jfenActiveFiltersRow">
            ${hasActiveFilters ? `
              <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filtros activos:</span>
              ${activeChipsHtml}
            ` : ''}
            <div class="recordsCounter" aria-live="polite">
              Mostrando <strong>${filtered.length}</strong> de <strong>${baseRows.length}</strong> registros
            </div>
          </div>

          <!-- Fila 3: Botones de acción agrupados -->
          <div class="concursoActionsRow">
            <div class="concursoActionsLeft">
              <button type="button" class="btn secondary small" id="cf_clear">Limpiar</button>
              <button type="button" class="btn secondary small" id="cf_asignarPuestosBtn" title="Asignar puestos por podio de forma masiva">🏆 Asignar puestos</button>
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" title="Importar ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
              <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
            </div>
            <div class="concursoActionsRight">
              <button type="button" class="btn secondary small" id="cf_exportCsv">Exportar CSV</button>
              <button type="button" class="btn small" id="cf_exportPdf">⬇ Descargar reporte (PDF)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Barra de filtros estándar para los demás concursos
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
          <div class="field" style="flex:1.2;min-width:160px">
            <label for="btn_cf_categoria">Categoría</label>
            ${renderCategoryMultiSelectMarkup('standard', categoriaOptions, getSelectedCategorias())}
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
          <div class="concursoActionsRow" style="width:100%;margin-top:10px">
            <div class="concursoActionsLeft">
              <button type="button" class="btn secondary small" id="cf_clear">Limpiar</button>
              <button type="button" class="btn secondary small" id="cf_asignarPuestosBtn" title="Asignar puestos por podio de forma masiva">🏆 Asignar puestos</button>
              ${(isAdmin && isJedpa) ? '<button type="button" class="btn secondary small" id="cf_consolidarCuerpoTecnicoBtn" title="Asistente para formalizar el cuerpo técnico por grupo">👥 Consolidar cuerpo técnico</button>' : ''}
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" title="Importar 83 ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
              <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
            </div>
            <div class="concursoActionsRight">
              <button type="button" class="btn secondary small" id="cf_exportCsv">Exportar CSV</button>
              <button type="button" class="btn small" id="cf_exportPdf">⬇ Descargar reporte (PDF)</button>
            </div>
          </div>
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

  const mainResultsHtml = (isJfen && concursoVistaJfen === 'fichas')
    ? (filtered.length === 0
      ? '<div class="empty" style="padding:32px;text-align:center"><p style="font-size:14.5px;color:var(--ink-soft);margin-bottom:6px">No se encontraron registros con los filtros seleccionados.</p></div>'
      : `<div class="jfenFichasContainer">${fichasHtml}</div>`)
    : `
      <div class="tblWrap"><table><thead><tr>
      <th style="width:70px">Puesto</th>
      <th>Institución</th>
      <th>Categoría</th>
      <th>Detalle / Área</th>
      <th>Participantes</th>
      <th>${esc(concursoCfg.etiqueta_columna_asesor || 'Docente Asesor')}</th>
      <th>Etapa</th>
      <th style="width:90px"></th>
      </tr></thead><tbody>${rowsHtml}</tbody></table></div>
    `;

  host.innerHTML = '' +
    filterBarHtml +
    '<div id="concursoReportCapture">' +
    (groupCtBannerHtml || '') +
    '<div class="cards">' +
    '<div class="card"><div class="num">' + totalRegs + '</div><div class="lbl">Registros / Premiaciones</div></div>' +
    '<div class="card"><div class="num">' + totalPartUnicos + '</div><div class="lbl">Participantes únicos</div></div>' +
    '<div class="card"><div class="num">' + uniqueColegios + '</div><div class="lbl">Instituciones educativas</div></div>' +
    '<div class="card"><div class="num">' + totalAsesUnicos + '</div><div class="lbl">' + esc(concursoCfg.etiqueta_asesor_plural || 'Docentes asesores') + '</div></div>' +
    (isJedpa ? '<div class="card"><div class="num">' + totalCtUnicos + '</div><div class="lbl">Cuerpo técnico único</div></div>' : '') +
    '</div>' +

    '<div class="panel">' +
    '<div class="concursoResultsHeader" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px">' +
    '<h3 style="margin:0">' + esc(dynamicTableTitle) + '</h3>' +
    (isJfen ? `
      <div class="concursoViewSwitcher" role="tablist" aria-label="Modo de vista">
        <button type="button" class="btnViewTab ${concursoVistaJfen === 'fichas' ? 'active' : ''}" id="btnVistaFichas" role="tab" aria-selected="${concursoVistaJfen === 'fichas'}">🗂 Fichas</button>
        <button type="button" class="btnViewTab ${concursoVistaJfen === 'tabla' ? 'active' : ''}" id="btnVistaTabla" role="tab" aria-selected="${concursoVistaJfen === 'tabla'}">📑 Tabla</button>
      </div>
    ` : '') +
    '</div>' +
    mainResultsHtml +
    '</div>' +
    '</div>';

  // Event listeners de vista y filtros JFEN
  if (isJfen) {
    const btnFichas = document.getElementById('btnVistaFichas');
    if (btnFichas) {
      btnFichas.addEventListener('click', () => {
        concursoVistaJfen = 'fichas';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }
    const btnTabla = document.getElementById('btnVistaTabla');
    if (btnTabla) {
      btnTabla.addEventListener('click', () => {
        concursoVistaJfen = 'tabla';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }

    const fArte = document.getElementById('cf_arte');
    if (fArte) {
      fArte.addEventListener('change', (e) => {
        concursoFilters.arte = e.target.value;
        concursoFilters.disciplina = '';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }

    const fDiscJfen = document.getElementById('cf_disciplina');
    if (fDiscJfen) {
      fDiscJfen.addEventListener('change', (e) => {
        concursoFilters.disciplina = e.target.value;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }

    const fModJfen = document.getElementById('cf_modalidad');
    if (fModJfen) {
      fModJfen.addEventListener('change', (e) => {
        concursoFilters.modalidad = e.target.value;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }
  }

  // Event listeners generales de filtros
  document.getElementById('cf_tipo').addEventListener('change', (e) => {
    concursoFilters.tipoId = e.target.value;
    concursoFilters.etapa = '';
    concursoFilters.disciplina = '';
    concursoFilters.categoria = [];
    concursoFilters.genero = '';
    concursoFilters.arte = '';
    concursoFilters.modalidad = '';
    concursoFilters.query = '';
    concursoCategoryDropdownOpen = false;
    concursoCategorySearchText = '';
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  const fEtapa = document.getElementById('cf_etapa');
  if (fEtapa) {
    fEtapa.addEventListener('change', (e) => {
      concursoFilters.etapa = e.target.value;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  setupCategoryMultiSelectEvents(host, state, dbNs, isAdmin, currentUser, container, navigate);

  const filGen = document.getElementById('cf_genero');
  if (filGen) {
    filGen.addEventListener('change', (e) => {
      concursoFilters.genero = e.target.value;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  // Disciplina interactiva para JEDPA
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
  } else if (!isJfen) {
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
      if (field && field.startsWith('categoria:')) {
        const catNorm = field.substring('categoria:'.length);
        const cur = getSelectedCategorias().filter(c => normalizeFilterValue(c) !== catNorm);
        setSelectedCategorias(cur);
        concursoCategoryDropdownOpen = false;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      } else if (field === 'categoria') {
        setSelectedCategorias([]);
        concursoCategoryDropdownOpen = false;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      } else if (field && concursoFilters[field] !== undefined) {
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
      categoria: [],
      genero: '',
      arte: '',
      modalidad: '',
      query: ''
    };
    concursoCategoryDropdownOpen = false;
    concursoCategorySearchText = '';
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  // Botón Cargar Ganadores RD (en barra de filtros)
  const importBtn = document.getElementById('cf_importRd');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Asignar Puestos por Podio
  const asignarPuestosBtn = document.getElementById('cf_asignarPuestosBtn');
  if (asignarPuestosBtn) {
    asignarPuestosBtn.addEventListener('click', () => {
      concursoSubTab = 'asignar_podios';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  }

  // Botón Detectar Duplicados
  const dupBtn = document.getElementById('cf_detectDuplicatesBtn');
  if (dupBtn) {
    dupBtn.addEventListener('click', () => {
      openDuplicateDetectorModal(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Consolidar Cuerpo Técnico por Grupo (JEDPA)
  const consolidarBtn = document.getElementById('cf_consolidarCuerpoTecnicoBtn');
  if (consolidarBtn) {
    consolidarBtn.addEventListener('click', () => {
      openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }
  const bannerConsolidarBtn = document.getElementById('btnConsolidarCtGrupoBanner');
  if (bannerConsolidarBtn) {
    bannerConsolidarBtn.addEventListener('click', () => {
      openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Cargar Ganadores RD (en estado vacío)
  const importEmptyBtn = document.getElementById('btnImportGanadoresConsolidadoEmpty');
  if (importEmptyBtn) {
    importEmptyBtn.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Exportar PDF oficial de concursos (Acta de Resultados A4 Landscape o Fichas JFEN A4 Portrait o Fichas JEDPA Colectivas)
  document.getElementById('cf_exportPdf').addEventListener('click', () => {
    const formatoTipo = getFormatoPdfConcurso(tipo);
    const esJfenConcurso = isJfen;
    const esJedpaConcurso = isJedpa || (tipo && (tipo.id === 'jedpa' || (tipo.nombre || '').toUpperCase().includes('JEDPA')));
    openDownloadConfigModal({
      documentTitle: getTituloConsolidadoConcurso(tipo),
      tipoReporte: 'concursos',
      dataRows: filtered,
      currentUser,
      state,
      dbNs,
      isAdmin,
      isJfen: esJfenConcurso,
      isJedpa: esJedpaConcurso,
      tipoConcurso: tipo,
      filters: concursoFilters,
      formatoPdfActas: formatoTipo,
      onConfirm: async (cfg) => {
        if (cfg.formatoConcurso === 'orden_merito') {
          await exportActaOrdenMeritoPdf(filtered, tipo, concursoFilters, cfg);
        } else {
          await exportConcursosReportPdf(filtered, tipo, concursoFilters, cfg);
        }
      }
    });
  });

  // Exportar CSV — columnas separadas: Apellidos | Nombres | DNI | Rol
  document.getElementById('cf_exportCsv').addEventListener('click', () => {
    let headers;
    if (isJedpa) {
      headers = [
        'Puesto', 'Podio', 'Institución', 'Código Modular', 'Concurso', 'Etapa',
        'Categoría', 'Género', 'Arte / Disciplina', 'Título', 'Seudónimo',
        'Tipo Persona', 'Rol cuerpo técnico', 'Apellidos', 'Nombres', 'DNI/Doc.',
        'Origen', 'Resolución', 'Fecha'
      ];
    } else {
      headers = [
        'Puesto', 'Podio', 'Institución', 'Código Modular', 'Concurso', 'Etapa',
        'Categoría', 'Género', 'Arte / Disciplina', 'Título', 'Seudónimo',
        'Tipo Persona', 'Apellidos', 'Nombres', 'DNI/Doc.', 'Rol',
        'Nombre heredado (texto libre)', 'Resolución', 'Fecha'
      ];
    }
    const rows = [];
    filtered.forEach(r => {
      const curTipoObj = (state.tiposConcurso || []).find(t => t.id === r.tipoConcursoId || t.nombre === r.tipoConcursoNombre) || tipo;
      const base = [
        r.puesto || '',
        getPodioLabel(r, curTipoObj),
        r.institucion || '',
        r.codigoModular || '',
        r.tipoConcursoNombre || r.tipoConcurso || '',
        r.etapa || '',
        r.categoria || '',
        formatGeneroDisplay(r.genero),
        r.disciplina || '',
        r.tituloTrabajo || '',
        r.seudonimo || ''
      ];

      if (isJedpa) {
        // En JEDPA: participantes individuales + cuerpo técnico del grupo (o individual) en mayúsculas
        const grupoCt = obtenerCuerpoTecnicoGrupo(r, state.concursoCuerpoTecnico || [], filtered);
        const ctMiembros = (grupoCt.miembros && grupoCt.miembros.length > 0)
          ? grupoCt.miembros.map(m => ({ ...m, _origen: grupoCt.origen === 'concursoCuerpoTecnico' ? 'grupo' : 'grupo' }))
          : (r.asesores || []).map(a => ({ ...a, _origen: 'individual' }));

        const deportistas = (r.participantes || []).map(p => ({
          _tipo: 'Deportista / Participante',
          rol: p.rol || 'Deportista',
          apellidos: (p.apellidos || '').trim().toUpperCase(),
          nombres: (p.nombres || '').trim().toUpperCase(),
          dni: (p.dni || '').trim(),
          origen: 'individual'
        }));

        const ctExport = ctMiembros.map(a => ({
          _tipo: 'Cuerpo Técnico',
          rol: (a.rol || 'Delegado').toUpperCase(),
          apellidos: (a.apellidos || '').trim().toUpperCase(),
          nombres: (a.nombres || '').trim().toUpperCase(),
          dni: (a.dni || '').trim(),
          origen: a._origen || 'grupo'
        }));

        const totalJ = [...deportistas, ...ctExport];
        if (totalJ.length === 0) {
          rows.push([...base, '', '', '', '', '', '', r.resolucionRef || '', r.fecha || '']);
        } else {
          totalJ.forEach(p => {
            rows.push([
              ...base,
              p._tipo,
              p.rol,
              p.apellidos,
              p.nombres,
              p.dni,
              p.origen,
              r.resolucionRef || '',
              r.fecha || ''
            ]);
          });
        }
      } else {
        const personas = [
          ...(r.participantes || []).map(p => ({ ...p, _tipo: 'Participante' })),
          ...(r.asesores || []).map(a => ({ ...a, _tipo: 'Asesor/Entrenador' }))
        ];
        if (personas.length === 0) {
          rows.push([...base, '', '', '', '', '', '', r.resolucionRef || '', r.fecha || '']);
        } else {
          personas.forEach(p => {
            const esHeredado = !((p.apellidos || '').trim()) && (p.nombres || '').trim();
            rows.push([
              ...base,
              p._tipo,
              (p.apellidos || '').trim(),
              (p.nombres || '').trim(),
              (p.dni || '').trim(),
              p.rol || '',
              esHeredado ? (p.nombres || '').trim() : '',
              r.resolucionRef || '',
              r.fecha || ''
            ]);
          });
        }
      }
    });
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
      const rTipo = (state.tiposConcurso || []).find(t => t.id === r.tipoConcursoId || t.nombre === r.tipoConcursoNombre);
      const defPartRol = getConcursoParticipanteRoles(rTipo)[0];
      const defAsesRol = getConcursoAsesorRoles(rTipo)[0];
      concursoParticipantes = r.participantes && r.participantes.length ? JSON.parse(JSON.stringify(r.participantes)) : [{ nombres: '', apellidos: '', dni: '', rol: defPartRol }];
      concursoAsesores = r.asesores && r.asesores.length ? JSON.parse(JSON.stringify(r.asesores)) : [{ nombres: '', apellidos: '', dni: '', rol: defAsesRol }];
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
   SUB-PESTAÑA 2.5: ASIGNAR PUESTOS POR PODIO
   Permite asignar masivamente los puestos 1.°, 2.° y 3.°
   con selector por podio (disciplina + categoría + género),
   dropdowns acotados a los participantes de ese podio,
   prevención de colisiones y matriz de progreso visual.
   ------------------------------------------------------------- */
let asignarPodioState = {
  tipoId: null,
  etapa: '',
  disciplina: '',
  categoria: '',
  genero: '',
  soloPendientes: false,
  filtroBusqueda: '',
  activePodioKey: null
};

function renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const tipos = state.tiposConcurso || [];
  const regs = state.concursoRegistros || [];

  if (tipos.length === 0) {
    host.innerHTML = '<div class="empty"><h4>Sin tipos de concurso</h4><p>Configura o siembra los tipos de concurso primero.</p></div>';
    return;
  }

  // Preseleccionar tipo de concurso (por defecto JEDPA si existe, o el seleccionado)
  if (!asignarPodioState.tipoId) {
    const defaultTipo = tipos.find(t => t.id === 'jedpa' || (t.nombre || '').toLowerCase().includes('jedpa')) || tipos[0];
    asignarPodioState.tipoId = defaultTipo ? defaultTipo.id : tipos[0].id;
  }

  const curTipo = tipos.find(t => t.id === asignarPodioState.tipoId) || tipos[0];

  // Helper de ponderación de puestos
  const puestoWeightLocal = (p) => {
    const s = String(p || '').toLowerCase();
    if (s.includes('1') || s.startsWith('primer')) return 1;
    if (s.includes('2') || s.startsWith('segundo')) return 2;
    if (s.includes('3') || s.startsWith('tercer')) return 3;
    if (s.includes('menci') || s.includes('honrosa') || s.includes('mh')) return 4;
    if (s.includes('4') || s.startsWith('cuarto')) return 5;
    if (s.includes('final')) return 6;
    if (s.includes('clasif')) return 7;
    if (s.includes('partic')) return 8;
    return 9;
  };

  // Filtrar registros del tipo actual
  const tipoRows = regs.filter(r => {
    if (r.tipoConcursoId === curTipo.id) return true;
    if (curTipo && (r.tipoConcursoNombre === curTipo.nombre || r.tipoConcurso === curTipo.nombre)) return true;
    return false;
  });

  // Agrupar registros en podios
  const podiosMap = new Map();
  tipoRows.forEach(r => {
    const etapaVal = (r.etapa || 'UGEL').trim();
    const pKey = getPodioKey(r, curTipo);
    const fullKey = `${etapaVal.toUpperCase()}|${pKey}`;

    if (!podiosMap.has(fullKey)) {
      podiosMap.set(fullKey, {
        fullKey,
        etapa: etapaVal,
        disciplina: r.disciplina || '',
        categoria: r.categoria || '',
        genero: r.genero || '',
        label: getPodioLabel(r, curTipo),
        records: []
      });
    }
    podiosMap.get(fullKey).records.push(r);
  });

  const allPodios = Array.from(podiosMap.values());

  // Analizar puestos y estados en cada podio
  allPodios.forEach(podio => {
    podio.records.sort((a, b) => {
      const wA = puestoWeightLocal(a.puesto);
      const wB = puestoWeightLocal(b.puesto);
      if (wA !== wB) return wA - wB;
      return (a.institucion || '').localeCompare(b.institucion || '');
    });

    podio.puesto1 = podio.records.find(r => normalizePuestoValue(r.puesto) === '1.er puesto') || null;
    podio.puesto2 = podio.records.find(r => normalizePuestoValue(r.puesto) === '2.° puesto') || null;
    podio.puesto3 = podio.records.find(r => normalizePuestoValue(r.puesto) === '3.er puesto') || null;

    podio.assignedCount = (podio.puesto1 ? 1 : 0) + (podio.puesto2 ? 1 : 0) + (podio.puesto3 ? 1 : 0);
    podio.totalRecords = podio.records.length;

    podio.isComplete = podio.assignedCount === 3 || (podio.totalRecords > 0 && podio.assignedCount === podio.totalRecords);
    podio.isPending = podio.assignedCount === 0;
    podio.isPartial = podio.assignedCount > 0 && !podio.isComplete;
  });

  // Métricas globales
  const totalPodios = allPodios.length;
  const completados = allPodios.filter(p => p.isComplete).length;
  const parciales = allPodios.filter(p => p.isPartial).length;
  const pendientes = allPodios.filter(p => p.isPending).length;
  const pctCompletado = totalPodios > 0 ? Math.round((completados / totalPodios) * 100) : 0;

  // Opciones para filtros
  const etapasDisponibles = Array.from(new Set(allPodios.map(p => p.etapa).filter(Boolean))).sort();
  const disciplinasDisponibles = Array.from(new Set(allPodios.map(p => p.disciplina).filter(Boolean))).sort();
  const categoriasDisponibles = Array.from(new Set(allPodios.map(p => p.categoria).filter(Boolean))).sort();

  // Filtrar podios para la matriz / tabla
  let filteredPodios = allPodios.filter(p => {
    if (asignarPodioState.soloPendientes && p.isComplete) return false;
    if (asignarPodioState.etapa && p.etapa.toUpperCase() !== asignarPodioState.etapa.toUpperCase()) return false;
    if (asignarPodioState.disciplina && p.disciplina.toLowerCase() !== asignarPodioState.disciplina.toLowerCase()) return false;
    if (asignarPodioState.categoria && p.categoria.toUpperCase() !== asignarPodioState.categoria.toUpperCase()) return false;
    if (asignarPodioState.genero && normalizeGenero(p.genero) !== normalizeGenero(asignarPodioState.genero)) return false;
    if (asignarPodioState.filtroBusqueda) {
      const q = normalizeText(asignarPodioState.filtroBusqueda);
      const matchLabel = normalizeText(p.label).includes(q);
      const matchIE = p.records.some(r => normalizeText(r.institucion).includes(q));
      if (!matchLabel && !matchIE) return false;
    }
    return true;
  });

  // Ordenar podios: por Disciplina -> Categoría -> Género
  filteredPodios.sort((a, b) => {
    const dComp = (a.disciplina || '').localeCompare(b.disciplina || '');
    if (dComp !== 0) return dComp;
    const cComp = (a.categoria || '').localeCompare(b.categoria || '');
    if (cComp !== 0) return cComp;
    return (a.genero || '').localeCompare(b.genero || '');
  });

  // Podio activo en el editor
  let activePodio = null;
  if (asignarPodioState.activePodioKey) {
    activePodio = allPodios.find(p => p.fullKey === asignarPodioState.activePodioKey);
  }
  if (!activePodio && filteredPodios.length > 0) {
    activePodio = filteredPodios[0];
    asignarPodioState.activePodioKey = activePodio.fullKey;
  } else if (!activePodio && allPodios.length > 0) {
    activePodio = allPodios[0];
    asignarPodioState.activePodioKey = activePodio.fullKey;
  }

  // Si el concurso distingue género, buscar su contraparte Damas/Varones
  let counterpartPodio = null;
  let damasPodio = null;
  let varonesPodio = null;
  if (curTipo.tieneGenero && activePodio) {
    const curNormGen = normalizeGenero(activePodio.genero);
    const targetGen = (curNormGen === 'damas') ? 'varones' : 'damas';
    counterpartPodio = allPodios.find(p =>
      p.etapa.toUpperCase() === activePodio.etapa.toUpperCase() &&
      p.disciplina.toLowerCase() === activePodio.disciplina.toLowerCase() &&
      p.categoria.toUpperCase() === activePodio.categoria.toUpperCase() &&
      normalizeGenero(p.genero) === targetGen
    );

    damasPodio = (curNormGen === 'damas') ? activePodio : counterpartPodio;
    varonesPodio = (curNormGen === 'varones') ? activePodio : counterpartPodio;
  }

  // Construir HTML del Editor del Podio Activo
  let editorHtml = '';
  if (activePodio) {
    // Badges de estado
    let statusBadge = '';
    if (activePodio.isComplete) {
      statusBadge = '<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:12px">✓ Podio Completo (3/3)</span>';
    } else if (activePodio.isPartial) {
      statusBadge = `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:12px">⚠️ Parcial (${activePodio.assignedCount}/3)</span>`;
    } else {
      statusBadge = '<span class="badge" style="background:var(--surface-3);color:var(--ink-soft);font-weight:700;font-size:12px">⚪ Pendiente (0/3)</span>';
    }

    let ctStatusBadge = '';
    if (isJedpaConcurso(curTipo)) {
      const ctInfo = obtenerCuerpoTecnicoGrupo(activePodio.records[0], state.concursoCuerpoTecnico || [], activePodio.records);
      if (!ctInfo || !ctInfo.miembros || ctInfo.miembros.length === 0) {
        ctStatusBadge = '<span class="badge" style="background:#fee2e2;color:#991b1b;font-weight:700;font-size:12px">⚠️ Sin cuerpo técnico asignado</span>';
      } else {
        const ctLabel = ctInfo.origen === 'concursoCuerpoTecnico' ? 'Oficial' : 'Detectado';
        ctStatusBadge = `<span class="badge" style="background:#e0e7ff;color:#3730a3;font-weight:700;font-size:12px">👥 ${ctInfo.miembros.length} del cuerpo técnico (${ctLabel})</span>`;
      }
    }

    // Pestañas rápidas Damas / Varones para alternar con 1 clic
    let genderTabsHtml = '';
    if (curTipo.tieneGenero && (damasPodio || varonesPodio)) {
      genderTabsHtml = `
        <div style="display:flex;gap:8px;margin-bottom:16px;background:var(--surface-2);padding:6px;border-radius:10px;border:1px solid var(--line);width:fit-content">
          ${damasPodio ? `
            <button type="button" class="btn small ${activePodio.fullKey === damasPodio.fullKey ? '' : 'secondary'}" id="btnSwitchDamas" style="display:flex;align-items:center;gap:6px">
              👩 Damas <small style="opacity:0.8">(${damasPodio.assignedCount}/3 ${damasPodio.isComplete ? '✓' : ''})</small>
            </button>
          ` : ''}
          ${varonesPodio ? `
            <button type="button" class="btn small ${activePodio.fullKey === varonesPodio.fullKey ? '' : 'secondary'}" id="btnSwitchVarones" style="display:flex;align-items:center;gap:6px">
              👨 Varones <small style="opacity:0.8">(${varonesPodio.assignedCount}/3 ${varonesPodio.isComplete ? '✓' : ''})</small>
            </button>
          ` : ''}
        </div>
      `;
    }

    // Helper para opciones de un selector de puesto
    const makeSlotOptions = (selectedRegId) => {
      let opts = '<option value="">-- Sin asignar (Vacío) --</option>';
      activePodio.records.forEach(r => {
        const isSel = r.id === selectedRegId;
        const partNom = (r.participantes && r.participantes.length) ? ` — ${formatearNombre(r.participantes[0])}` : '';
        opts += `<option value="${r.id}" ${isSel ? 'selected' : ''}>${esc(r.institucion)}${esc(partNom)}</option>`;
      });
      return opts;
    };

    // Renderizado de detalles del ocupante actual de un puesto
    const renderOccupantSnippet = (reg) => {
      if (!reg) return '<div style="font-size:12px;color:var(--ink-soft);font-style:italic;padding:8px 0">Puesto disponible sin asignar</div>';
      const partStr = (reg.participantes || []).map(p => `${formatearNombre(p)} ${p.dni ? `(${p.dni})` : ''}`).join(', ') || 'Sin participante';
      const asesStr = (reg.asesores || []).map(a => `${formatearNombre(a)}`).join(', ') || 'Sin asesor';
      return `
        <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);line-height:1.4">
          <div><strong>I.E.:</strong> ${esc(reg.institucion)} ${reg.codigoModular ? `<small>(${esc(reg.codigoModular)})</small>` : ''}</div>
          <div><strong>Participante:</strong> ${esc(partStr)}</div>
          <div><strong>Asesor:</strong> ${esc(asesStr)}</div>
        </div>
      `;
    };

    // Filas para otros participantes del podio
    const otherParticipantsRows = activePodio.records.map(r => {
      const partStr = (r.participantes || []).map(p => `${formatearNombre(p)} ${p.dni ? `(${p.dni})` : ''}`).join('<br>') || '—';
      const asesStr = (r.asesores || []).map(a => `${formatearNombre(a)}`).join('<br>') || '—';
      const normP = normalizePuestoValue(r.puesto);
      const isTop3 = ['1.er puesto', '2.° puesto', '3.er puesto'].includes(normP);

      return `
        <tr data-other-row="${r.id}">
          <td>
            <strong>${esc(r.institucion)}</strong>
            ${r.codigoModular ? `<br><small style="color:var(--ink-soft)">Cód. Mod: ${esc(r.codigoModular)}</small>` : ''}
          </td>
          <td style="font-size:12.5px">${partStr}</td>
          <td style="font-size:12.5px">${asesStr}</td>
          <td style="text-align:center">
            ${isTop3 ? formatPuestoBadge(r.puesto) : `
              <select class="otherPuestoSelect" data-rid="${r.id}" style="font-size:12px;padding:4px 8px">
                <option value="" ${!r.puesto ? 'selected' : ''}>Sin puesto / Pendiente</option>
                <option value="Mención Honrosa" ${normP === 'mención honrosa' ? 'selected' : ''}>Mención Honrosa</option>
                <option value="4.° puesto" ${normP === '4.° puesto' ? 'selected' : ''}>4.° puesto</option>
                <option value="Finalista" ${normP === 'finalista' ? 'selected' : ''}>Finalista</option>
                <option value="Participante" ${normP === 'participante' ? 'selected' : ''}>Participante</option>
              </select>
            `}
          </td>
        </tr>
      `;
    }).join('');

    editorHtml = `
      <div class="panel" id="podioEditorCard" style="border:2px solid var(--primary-tint);margin-bottom:24px;box-shadow:var(--shadow-md)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
              <span class="badge" style="background:var(--primary);color:#fff;font-weight:700;font-size:11.5px">Etapa ${esc(activePodio.etapa)}</span>
              <h3 style="margin:0;font-size:19px;color:var(--navy-900)">🏆 Podio: ${esc(activePodio.label)}</h3>
              ${statusBadge}
              ${ctStatusBadge}
            </div>
            <p style="margin:0;font-size:13px;color:var(--ink-soft)">
              ${activePodio.records.length} instituciones inscritas en este podio oficial. Selecciona los puestos de honor o asigna menciones honrosas.
            </p>
          </div>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn secondary small" id="btnDespejarPodio">Limpiar podio</button>
            <button type="button" class="btn small" id="btnIrConsolidado">Ver en consolidado ➔</button>
          </div>
        </div>

        ${genderTabsHtml}

        <!-- Podio 3 Columnas: 1.°, 2.°, 3.er Puesto -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin:20px 0">
          <!-- 1.er PUESTO -->
          <div style="background:rgba(234,179,8,0.06);border:2px solid #eab308;border-radius:12px;padding:16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-weight:800;font-size:14px;color:#854d0e;display:flex;align-items:center;gap:6px">
                🥇 1.er Puesto (Oro)
              </span>
              <span class="badge" style="background:#fef08a;color:#854d0e;font-size:10.5px;font-weight:700">Campeón</span>
            </div>
            <label for="slot_puesto_1" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Institución ganadora</label>
            <select id="slot_puesto_1" class="podioSlotSelect" data-slot="1.er puesto" style="width:100%;font-weight:600">
              ${makeSlotOptions(activePodio.puesto1 ? activePodio.puesto1.id : '')}
            </select>
            <div id="snippet_puesto_1">
              ${renderOccupantSnippet(activePodio.puesto1)}
            </div>
          </div>

          <!-- 2.° PUESTO -->
          <div style="background:rgba(148,163,184,0.08);border:2px solid #94a3b8;border-radius:12px;padding:16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-weight:800;font-size:14px;color:#334155;display:flex;align-items:center;gap:6px">
                🥈 2.° Puesto (Plata)
              </span>
              <span class="badge" style="background:#e2e8f0;color:#334155;font-size:10.5px;font-weight:700">Subcampeón</span>
            </div>
            <label for="slot_puesto_2" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Institución subcampeona</label>
            <select id="slot_puesto_2" class="podioSlotSelect" data-slot="2.° puesto" style="width:100%;font-weight:600">
              ${makeSlotOptions(activePodio.puesto2 ? activePodio.puesto2.id : '')}
            </select>
            <div id="snippet_puesto_2">
              ${renderOccupantSnippet(activePodio.puesto2)}
            </div>
          </div>

          <!-- 3.er PUESTO -->
          <div style="background:rgba(217,119,6,0.06);border:2px solid #d97706;border-radius:12px;padding:16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-weight:800;font-size:14px;color:#9a3412;display:flex;align-items:center;gap:6px">
                🥉 3.er Puesto (Bronce)
              </span>
              <span class="badge" style="background:#ffedd5;color:#9a3412;font-size:10.5px;font-weight:700">Tercer Lugar</span>
            </div>
            <label for="slot_puesto_3" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Institución tercer puesto</label>
            <select id="slot_puesto_3" class="podioSlotSelect" data-slot="3.er puesto" style="width:100%;font-weight:600">
              ${makeSlotOptions(activePodio.puesto3 ? activePodio.puesto3.id : '')}
            </select>
            <div id="snippet_puesto_3">
              ${renderOccupantSnippet(activePodio.puesto3)}
            </div>
          </div>
        </div>

        <div id="podioValidationAlert" style="display:none;margin-bottom:16px" class="alertCard warn">
          <p style="margin:0;font-size:13px" id="podioValidationText"></p>
        </div>

        <!-- Tabla de todos los participantes del podio -->
        <div style="margin-top:20px">
          <h4 style="margin:0 0 10px;font-size:14.5px;color:var(--navy-900)">Lista completa de participantes en este podio</h4>
          <div class="tblWrap" style="max-height:280px;overflow-y:auto">
            <table>
              <thead>
                <tr>
                  <th>Institución Educativa</th>
                  <th>Participantes</th>
                  <th>Docente Asesor</th>
                  <th style="width:160px;text-align:center">Puesto / Distinción</th>
                </tr>
              </thead>
              <tbody>
                ${otherParticipantsRows}
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">
          <span style="font-size:12.5px;color:var(--ink-soft)">Los cambios se guardan atómicamente asegurando la integridad del podio.</span>
          <button type="button" class="btn" id="btnGuardarPodio" style="padding:10px 24px;font-size:14px;font-weight:700">
            💾 Guardar puestos del podio
          </button>
        </div>
      </div>
    `;
  } else {
    editorHtml = `
      <div class="panel" style="text-align:center;padding:36px;margin-bottom:24px">
        <h4>Selecciona un podio para gestionar sus puestos</h4>
        <p style="color:var(--ink-soft);font-size:13px">Usa los filtros de abajo o la matriz para elegir la disciplina y categoría.</p>
      </div>
    `;
  }

  // Filas de la tabla de podios (Matriz de Progreso)
  const podiosRowsHtml = filteredPodios.map((p, idx) => {
    const isCur = activePodio && activePodio.fullKey === p.fullKey;
    const normGen = normalizeGenero(p.genero);
    const genBadge = normGen === 'damas'
      ? '<span class="badge" style="background:#fce7f3;color:#be185d;font-size:11px">👩 Damas</span>'
      : (normGen === 'varones'
        ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px">👨 Varones</span>'
        : (p.genero ? `<span class="badge" style="background:var(--surface-3);font-size:11px">${esc(p.genero)}</span>` : '—'));

    let progBadge = '';
    if (p.isComplete) {
      progBadge = '<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:11px">3/3 ✓ Completo</span>';
    } else if (p.isPartial) {
      progBadge = `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:11px">${p.assignedCount}/3 ⚠️ Parcial</span>`;
    } else {
      progBadge = '<span class="badge" style="background:var(--surface-3);color:var(--ink-soft);font-size:11px">0/3 Pendiente</span>';
    }

    return `
      <tr class="clickable ${isCur ? 'selectedRow' : ''}" data-podio-key="${esc(p.fullKey)}" style="${isCur ? 'background:rgba(14,165,233,0.08)' : ''}">
        <td><strong>${esc(p.disciplina || '—')}</strong></td>
        <td><span class="badge" style="background:var(--surface-2);font-weight:600">${esc(p.categoria || '—')}</span></td>
        <td>${genBadge}</td>
        <td><span class="badge" style="background:var(--surface-2);font-size:11px">${esc(p.etapa || '—')}</span></td>
        <td>${progBadge}</td>
        <td style="font-size:12px">${p.puesto1 ? `🥇 ${esc(p.puesto1.institucion)}` : '<span style="color:var(--ink-soft)">—</span>'}</td>
        <td style="font-size:12px">${p.puesto2 ? `🥈 ${esc(p.puesto2.institucion)}` : '<span style="color:var(--ink-soft)">—</span>'}</td>
        <td style="font-size:12px">${p.puesto3 ? `🥉 ${esc(p.puesto3.institucion)}` : '<span style="color:var(--ink-soft)">—</span>'}</td>
        <td style="text-align:center">
          <button type="button" class="btn small ${isCur ? '' : 'secondary'}" data-btn-podio="${esc(p.fullKey)}" style="font-size:11px;padding:3px 8px">
            ${isCur ? 'Editando' : '✏️ Asignar'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Renderizado completo de la vista
  host.innerHTML = `
    <!-- Barra superior: Selector de Tipo de Concurso y Métricas de Progreso -->
    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:12px">
          <label for="ap_tipoSelect" style="font-weight:700;font-size:14px;color:var(--navy-900)">Concurso:</label>
          <select id="ap_tipoSelect" style="font-weight:600;font-size:13.5px;padding:6px 12px;border-radius:8px">
            ${tipos.map(t => `<option value="${t.id}" ${t.id === curTipo.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
          </select>
        </div>
        <div style="font-size:13px;color:var(--ink-soft)">
          UGEL 03 — Concursos Educativos 2026
        </div>
      </div>

      <!-- Tarjetas de Métricas del Concurso -->
      <div class="cards" style="margin-bottom:20px">
        <div class="card">
          <div class="num">${totalPodios}</div>
          <div class="lbl">Total de podios</div>
        </div>
        <div class="card" style="border-left:4px solid #15803d">
          <div class="num" style="color:#15803d">${completados}</div>
          <div class="lbl">Completos (3/3)</div>
        </div>
        <div class="card" style="border-left:4px solid #b45309">
          <div class="num" style="color:#b45309">${parciales}</div>
          <div class="lbl">Parciales</div>
        </div>
        <div class="card" style="border-left:4px solid #64748b">
          <div class="num" style="color:#64748b">${pendientes}</div>
          <div class="lbl">Pendientes (0/3)</div>
        </div>
        <div class="card" style="border-left:4px solid var(--primary)">
          <div class="num" style="color:var(--primary)">${pctCompletado}%</div>
          <div class="lbl">Avance global</div>
        </div>
      </div>
    </div>

    <!-- Panel de Editor del Podio Seleccionado -->
    ${editorHtml}

    <!-- Matriz de Progreso de Podios -->
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <h3 style="margin:0 0 2px">Matriz de Progreso por Podio</h3>
          <p class="helpText" style="margin:0">Monitorea el estado de cada disciplina y categoría. Haz clic en una fila para asignarle puestos.</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:600">
            <input type="checkbox" id="ap_soloPendientes" ${asignarPodioState.soloPendientes ? 'checked' : ''}> Solo pendientes / parciales
          </label>
        </div>
      </div>

      <!-- Filtros rápidos para la matriz -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;background:var(--surface-2);padding:12px;border-radius:10px;border:1px solid var(--line)">
        <div>
          <label for="ap_filtro_etapa" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Etapa</label>
          <select id="ap_filtro_etapa" style="font-size:12px;padding:4px 8px;width:100%">
            <option value="">Todas (${etapasDisponibles.length})</option>
            ${etapasDisponibles.map(e => `<option value="${esc(e)}" ${e === asignarPodioState.etapa ? 'selected' : ''}>${esc(e)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label for="ap_filtro_disciplina" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Disciplina</label>
          <select id="ap_filtro_disciplina" style="font-size:12px;padding:4px 8px;width:100%">
            <option value="">Todas (${disciplinasDisponibles.length})</option>
            ${disciplinasDisponibles.map(d => `<option value="${esc(d)}" ${d === asignarPodioState.disciplina ? 'selected' : ''}>${esc(d)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label for="ap_filtro_categoria" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Categoría</label>
          <select id="ap_filtro_categoria" style="font-size:12px;padding:4px 8px;width:100%">
            <option value="">Todas (${categoriasDisponibles.length})</option>
            ${categoriasDisponibles.map(c => `<option value="${esc(c)}" ${c === asignarPodioState.categoria ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>

        ${curTipo.tieneGenero ? `
          <div>
            <label for="ap_filtro_genero" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Género</label>
            <select id="ap_filtro_genero" style="font-size:12px;padding:4px 8px;width:100%">
              <option value="">Todos</option>
              <option value="Damas" ${asignarPodioState.genero.toLowerCase() === 'damas' ? 'selected' : ''}>Damas</option>
              <option value="Varones" ${asignarPodioState.genero.toLowerCase() === 'varones' ? 'selected' : ''}>Varones</option>
            </select>
          </div>
        ` : ''}

        <div style="grid-column: span 2">
          <label for="ap_filtro_query" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Buscar I.E. o podio</label>
          <input type="search" id="ap_filtro_query" value="${esc(asignarPodioState.filtroBusqueda)}" placeholder="Ej: Jacaranda, Saco Oliveros, Ajedrez..." style="font-size:12px;padding:4px 8px;width:100%">
        </div>
      </div>

      <!-- Tabla de Podios -->
      <div class="tblWrap">
        <table>
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Categoría</th>
              <th>Género</th>
              <th>Etapa</th>
              <th>Estado</th>
              <th>1.er puesto</th>
              <th>2.° puesto</th>
              <th>3.er puesto</th>
              <th style="width:100px;text-align:center">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${podiosRowsHtml || '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:24px">No hay podios que coincidan con los filtros aplicados.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // EVENT LISTENERS

  // Cambio de tipo de concurso
  const tipoSelect = document.getElementById('ap_tipoSelect');
  if (tipoSelect) {
    tipoSelect.addEventListener('change', (e) => {
      asignarPodioState.tipoId = e.target.value;
      asignarPodioState.activePodioKey = null;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  // Switch rápido Damas / Varones
  const btnDamas = document.getElementById('btnSwitchDamas');
  if (btnDamas && damasPodio) {
    btnDamas.addEventListener('click', () => {
      asignarPodioState.activePodioKey = damasPodio.fullKey;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }
  const btnVarones = document.getElementById('btnSwitchVarones');
  if (btnVarones && varonesPodio) {
    btnVarones.addEventListener('click', () => {
      asignarPodioState.activePodioKey = varonesPodio.fullKey;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  // Despejar podio en editor
  const btnDespejar = document.getElementById('btnDespejarPodio');
  if (btnDespejar) {
    btnDespejar.addEventListener('click', () => {
      ['slot_puesto_1', 'slot_puesto_2', 'slot_puesto_3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      ['snippet_puesto_1', 'snippet_puesto_2', 'snippet_puesto_3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div style="font-size:12px;color:var(--ink-soft);font-style:italic;padding:8px 0">Puesto disponible sin asignar</div>';
      });
      host.querySelectorAll('.otherPuestoSelect').forEach(s => s.value = '');
      validateSlotSelections();
    });
  }

  // Ir a Consolidado
  const btnIrCons = document.getElementById('btnIrConsolidado');
  if (btnIrCons && activePodio) {
    btnIrCons.addEventListener('click', () => {
      concursoFilters.tipoId = curTipo.id;
      concursoFilters.etapa = activePodio.etapa;
      concursoFilters.disciplina = activePodio.disciplina;
      concursoFilters.categoria = activePodio.categoria;
      concursoFilters.genero = activePodio.genero;
      concursoSubTab = 'consolidado';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  }

  // Actualización dinámica de snippets al cambiar puestos
  const updateSnippetForSlot = (slotNum, regId) => {
    const snipEl = document.getElementById(`snippet_puesto_${slotNum}`);
    if (!snipEl || !activePodio) return;
    const reg = activePodio.records.find(r => r.id === regId);
    if (!reg) {
      snipEl.innerHTML = '<div style="font-size:12px;color:var(--ink-soft);font-style:italic;padding:8px 0">Puesto disponible sin asignar</div>';
      return;
    }
    const partStr = (reg.participantes || []).map(p => `${formatearNombre(p)} ${p.dni ? `(${p.dni})` : ''}`).join(', ') || 'Sin participante';
    const asesStr = (reg.asesores || []).map(a => `${formatearNombre(a)}`).join(', ') || 'Sin asesor';
    snipEl.innerHTML = `
      <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);line-height:1.4">
        <div><strong>I.E.:</strong> ${esc(reg.institucion)} ${reg.codigoModular ? `<small>(${esc(reg.codigoModular)})</small>` : ''}</div>
        <div><strong>Participante:</strong> ${esc(partStr)}</div>
        <div><strong>Asesor:</strong> ${esc(asesStr)}</div>
      </div>
    `;
  };

  // Validación de no duplicar I.E. en múltiples slots
  const validateSlotSelections = () => {
    const s1 = document.getElementById('slot_puesto_1')?.value || '';
    const s2 = document.getElementById('slot_puesto_2')?.value || '';
    const s3 = document.getElementById('slot_puesto_3')?.value || '';
    const alertEl = document.getElementById('podioValidationAlert');
    const textEl = document.getElementById('podioValidationText');
    const saveBtn = document.getElementById('btnGuardarPodio');

    let hasConflict = false;
    let conflictIE = '';

    if (s1 && s2 && s1 === s2) {
      hasConflict = true;
      conflictIE = activePodio?.records.find(r => r.id === s1)?.institucion || 'Misma I.E.';
    } else if (s1 && s3 && s1 === s3) {
      hasConflict = true;
      conflictIE = activePodio?.records.find(r => r.id === s1)?.institucion || 'Misma I.E.';
    } else if (s2 && s3 && s2 === s3) {
      hasConflict = true;
      conflictIE = activePodio?.records.find(r => r.id === s2)?.institucion || 'Misma I.E.';
    }

    if (hasConflict) {
      if (alertEl) alertEl.style.display = 'block';
      if (textEl) textEl.innerHTML = `⚠️ Conflicto de podio: La institución <strong>${esc(conflictIE)}</strong> no puede ocupar dos puestos distintos simultáneamente. Corrige la selección para guardar.`;
      if (saveBtn) saveBtn.disabled = true;
      return false;
    } else {
      if (alertEl) alertEl.style.display = 'none';
      if (saveBtn) saveBtn.disabled = false;
      return true;
    }
  };

  [1, 2, 3].forEach(num => {
    const slotEl = document.getElementById(`slot_puesto_${num}`);
    if (slotEl) {
      slotEl.addEventListener('change', (e) => {
        updateSnippetForSlot(num, e.target.value);
        validateSlotSelections();
      });
    }
  });

  // Botón Guardar Podio (Transaccional Atómico)
  const savePodioBtn = document.getElementById('btnGuardarPodio');
  if (savePodioBtn && activePodio) {
    savePodioBtn.addEventListener('click', async () => {
      if (!validateSlotSelections()) return;

      const p1Id = document.getElementById('slot_puesto_1')?.value || '';
      const p2Id = document.getElementById('slot_puesto_2')?.value || '';
      const p3Id = document.getElementById('slot_puesto_3')?.value || '';

      // Determinar puestos meta para cada registro de este podio
      const planUpdates = [];
      activePodio.records.forEach(r => {
        let desiredPuesto = '';
        if (r.id === p1Id) desiredPuesto = '1.er puesto';
        else if (r.id === p2Id) desiredPuesto = '2.° puesto';
        else if (r.id === p3Id) desiredPuesto = '3.er puesto';
        else {
          const otherSel = host.querySelector(`.otherPuestoSelect[data-rid="${r.id}"]`);
          desiredPuesto = otherSel ? otherSel.value.trim() : '';
        }

        const curNorm = normalizePuestoValue(r.puesto);
        const desNorm = normalizePuestoValue(desiredPuesto);

        if (curNorm !== desNorm || (r.puesto || '') !== desiredPuesto) {
          planUpdates.push({
            record: r,
            oldPuesto: r.puesto || '',
            newPuesto: desiredPuesto
          });
        }
      });

      if (planUpdates.length === 0) {
        showToast('No se han modificado puestos en este podio.');
        return;
      }

      savePodioBtn.disabled = true;
      savePodioBtn.textContent = 'Guardando podio...';

      try {
        const podioKey = getPodioKey(activePodio.records[0] || { categoria: activePodio.categoria, disciplina: activePodio.disciplina, genero: activePodio.genero }, curTipo);

        // Si existe runTransaction en dbNs, usarlo para atomicidad completa
        if (typeof dbNs.runTransaction === 'function') {
          await dbNs.runTransaction(async (tx) => {
            for (const item of planUpdates) {
              const { record, oldPuesto, newPuesto } = item;
              const oldNorm = normalizePuestoValue(oldPuesto);
              const newNorm = normalizePuestoValue(newPuesto);

              // 1. Liberar lock previo si era puesto 1, 2 o 3
              if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(oldNorm)) {
                const oldLockId = getPodioLockDocId(podioKey, oldNorm);
                tx.delete(dbNs.collection('concursoPodioLocks').doc(oldLockId));
              }

              // 2. Establecer nuevo lock si es puesto 1, 2 o 3
              if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(newNorm)) {
                const newLockId = getPodioLockDocId(podioKey, newNorm);
                tx.set(dbNs.collection('concursoPodioLocks').doc(newLockId), {
                  idRegistro: record.id,
                  institucion: record.institucion || '',
                  puesto: newNorm,
                  podioKey: podioKey,
                  tipoConcursoId: curTipo.id,
                  etapa: activePodio.etapa || 'UGEL',
                  updatedAt: Date.now(),
                  updatedBy: currentUser?.email || 'admin'
                });
              }

              // 3. Actualizar el registro principal
              tx.update(dbNs.collection('concursoRegistros').doc(record.id), {
                puesto: newPuesto,
                updatedAt: Date.now()
              });
            }

            // 4. Bitácora de auditoría
            const histId = genId();
            tx.set(dbNs.collection('concursoHistorial').doc(histId), {
              tipo: 'asignacion_masiva_podio',
              podioKey: activePodio.fullKey,
              podioLabel: activePodio.label,
              tipoConcursoId: curTipo.id,
              actualizaciones: planUpdates.map(u => ({ id: u.record.id, ie: u.record.institucion, de: u.oldPuesto, a: u.newPuesto })),
              usuario: currentUser?.email || 'admin',
              fecha: Date.now()
            });
          });
        } else {
          // Fallback con batch
          const batch = dbNs.batch();
          for (const item of planUpdates) {
            const { record, oldPuesto, newPuesto } = item;
            const oldNorm = normalizePuestoValue(oldPuesto);
            const newNorm = normalizePuestoValue(newPuesto);

            if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(oldNorm)) {
              const oldLockId = getPodioLockDocId(podioKey, oldNorm);
              batch.delete(dbNs.collection('concursoPodioLocks').doc(oldLockId));
            }
            if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(newNorm)) {
              const newLockId = getPodioLockDocId(podioKey, newNorm);
              batch.set(dbNs.collection('concursoPodioLocks').doc(newLockId), {
                idRegistro: record.id,
                institucion: record.institucion || '',
                puesto: newNorm,
                podioKey: podioKey,
                tipoConcursoId: curTipo.id,
                etapa: activePodio.etapa || 'UGEL',
                updatedAt: Date.now(),
                updatedBy: currentUser?.email || 'admin'
              });
            }
            batch.update(dbNs.collection('concursoRegistros').doc(record.id), {
              puesto: newPuesto,
              updatedAt: Date.now()
            });
          }
          await batch.commit();
        }

        // Actualizar datos en memoria local
        planUpdates.forEach(item => {
          item.record.puesto = item.newPuesto;
          item.record.updatedAt = Date.now();
        });

        showToast(`✓ Podio guardado exitosamente (${planUpdates.length} puestos actualizados).`);
        renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);

      } catch (err) {
        console.error('Error guardando podio:', err);
        showToast(`Error al guardar podio: ${err.message || 'Error desconocido'}`);
        savePodioBtn.disabled = false;
        savePodioBtn.textContent = '💾 Guardar puestos del podio';
      }
    });
  }

  // Filtros de la matriz
  const chkPendientes = document.getElementById('ap_soloPendientes');
  if (chkPendientes) {
    chkPendientes.addEventListener('change', (e) => {
      asignarPodioState.soloPendientes = e.target.checked;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroEtapa = document.getElementById('ap_filtro_etapa');
  if (selFiltroEtapa) {
    selFiltroEtapa.addEventListener('change', (e) => {
      asignarPodioState.etapa = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroDisc = document.getElementById('ap_filtro_disciplina');
  if (selFiltroDisc) {
    selFiltroDisc.addEventListener('change', (e) => {
      asignarPodioState.disciplina = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroCat = document.getElementById('ap_filtro_categoria');
  if (selFiltroCat) {
    selFiltroCat.addEventListener('change', (e) => {
      asignarPodioState.categoria = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroGen = document.getElementById('ap_filtro_genero');
  if (selFiltroGen) {
    selFiltroGen.addEventListener('change', (e) => {
      asignarPodioState.genero = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const inputFiltroQuery = document.getElementById('ap_filtro_query');
  if (inputFiltroQuery) {
    let qDebounce;
    inputFiltroQuery.addEventListener('input', (e) => {
      clearTimeout(qDebounce);
      qDebounce = setTimeout(() => {
        asignarPodioState.filtroBusqueda = e.target.value;
        renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      }, 300);
    });
  }

  // Clic en fila o botón para seleccionar podio y editarlo
  host.querySelectorAll('[data-podio-key], [data-btn-podio]').forEach(el => {
    el.addEventListener('click', (e) => {
      const key = el.dataset.podioKey || el.dataset.btnPodio;
      if (!key) return;
      asignarPodioState.activePodioKey = key;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      const editorEl = document.getElementById('podioEditorCard');
      if (editorEl) {
        editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    const partRoles = getConcursoParticipanteRoles(t).join(', ');
    const asesRoles = getConcursoAsesorRoles(t).join(', ');
    const formatoBadge = getFormatoPdfConcurso(t) === 'fichas_por_categoria'
      ? '<span class="badge" style="background:rgba(18,41,76,0.12);color:#12294C;font-size:11px">PDF: 📄 Fichas por categoría / equipo</span>'
      : '<span class="badge" style="background:rgba(15,23,42,0.08);color:var(--navy-900);font-size:11px">PDF: 📊 Listado tabular</span>';

    return '<div class="tipoCard">' +
      '<div class="ti">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">' +
      '<h4 style="margin:0">' + esc(t.nombre) + '</h4>' +
      '<span class="badge" style="background:var(--primary-tint);color:var(--primary);font-size:11px">' + (t.tipoParticipacion === 'individual' ? '👤 Individual' : '👥 Grupal') + '</span>' +
      formatoBadge +
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
  let rolesPart = isEdit ? getConcursoParticipanteRoles(existingTipo) : ['Estudiante'];
  let rolesAses = isEdit ? getConcursoAsesorRoles(existingTipo) : ['Docente Asesor'];

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

    '<div style="margin:14px 0;background:var(--surface-2);padding:14px;border-radius:var(--radius);border:1px solid var(--line)">' +
    '<label style="font-weight:700;margin-bottom:8px;display:block">Campos que definen un Podio único (1.°, 2.° y 3.er puesto)</label>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_cat"' + ((!existingTipo || (existingTipo.camposPodio || ['categoria']).includes('categoria')) ? ' checked' : '') + '> Categoría' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_disc"' + ((existingTipo ? (existingTipo.camposPodio || []).includes('disciplina') : existingTipo?.tieneDisciplina) ? ' checked' : '') + '> Disciplina' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_gen"' + ((existingTipo ? (existingTipo.camposPodio || []).includes('genero') : existingTipo?.tieneGenero) ? ' checked' : '') + '> Género' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_mod"' + ((existingTipo && (existingTipo.camposPodio || []).includes('modalidad')) ? ' checked' : '') + '> Modalidad' +
    '</label>' +
    '</div>' +
    '<small style="color:var(--ink-soft);display:block;margin-top:6px">Ej: En JEDPA se marcan Categoría, Disciplina y Género para que Damas y Varones tengan podios independientes.</small>' +
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

    '<div class="field">' +
    '<label>Formato oficial de actas PDF *</label>' +
    '<select id="m_tc_formatoPdf">' +
    '<option value="tabular"' + ((!existingTipo || existingTipo.formato_pdf_actas === 'tabular' || !existingTipo.formato_pdf_actas) ? ' selected' : '') + '>Listado tabular (Estándar oficial)</option>' +
    '<option value="fichas_por_categoria"' + (existingTipo && existingTipo.formato_pdf_actas === 'fichas_por_categoria' ? ' selected' : '') + '>Fichas por categoría / equipo (Formato ficha)</option>' +
    '</select>' +
    '<small style="color:var(--ink-soft)">El formato de fichas agrupa cada institución o trabajo ganador en un bloque con su lista de participantes. Recomendado para concursos grupales (JFEN, Crea y Emprende, Eureka, etc.).</small>' +
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

      const cPodio = [];
      if (document.getElementById('m_tc_podio_cat')?.checked) cPodio.push('categoria');
      if (document.getElementById('m_tc_podio_disc')?.checked) cPodio.push('disciplina');
      if (document.getElementById('m_tc_podio_gen')?.checked) cPodio.push('genero');
      if (document.getElementById('m_tc_podio_mod')?.checked) cPodio.push('modalidad');
      if (cPodio.length === 0) cPodio.push('categoria');

      const formatoPdf = document.getElementById('m_tc_formatoPdf')?.value || 'tabular';

      const data = {
        nombre: document.getElementById('m_tc_nombre').value.trim(),
        tipoParticipacion: document.getElementById('m_tc_tipoPart').value,
        tieneGenero: document.getElementById('m_tc_tieneGenero').checked,
        tieneDisciplina: document.getElementById('m_tc_tieneDisciplina').checked,
        tieneTituloTrabajo: document.getElementById('m_tc_tieneTituloTrabajo').checked,
        camposPodio: cPodio,
        categorias: cats.length ? cats : ['Única'],
        rolesParticipante: rP.length ? rP : ['Estudiante'],
        rolesAsesor: rA.length ? rA : ['Docente Asesor'],
        disciplinasSugeridas: dS,
        formato_pdf_actas: formatoPdf,
        createdAt: isEdit ? (existingTipo.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
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
        const sameGen = normalizeGenero(r.genero) === normalizeGenero(item.genero);
        const samePuesto = normalizePuestoValue(r.puesto) === normalizePuestoValue(item.puesto);

        // Si coinciden tipo, institución, categoría, género, puesto y disciplina -> es duplicado
        if (sameTipo && sameInst && sameCat && sameDisc && sameGen && samePuesto) return true;

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
        let codMod = formatCodigoModular(item.codigoModular || '');
        if (!codMod && item.institucion) {
          const match = colMap.get(item.institucion.trim().toLowerCase());
          if (match) codMod = formatCodigoModular(match);
        }

        const docRef = dbNs.collection('concursoRegistros').doc();
        batch.set(docRef, {
          tipoConcursoId: tipoId,
          tipoConcursoNombre: tipoNombre,
          etapa: item.etapa || 'UGEL',
          categoria: item.categoria || '',
          genero: item.genero || null,
          disciplina: item.disciplina || null,
          institucion: item.institucion || '',
          codigoModular: codMod,
          tituloTrabajo: item.tituloTrabajo || null,
          seudonimo: item.seudonimo || null,
          puesto: normalizePuestoValue(item.puesto) || item.puesto || '',
          participantes: Array.isArray(item.participantes) ? item.participantes : [],
          asesores: Array.isArray(item.asesores) ? item.asesores : [],
          resolucionRef: item.resolucionRef || '',
          fecha: item.fecha || '',
          responsable: 'RD UGEL 03 (2026)',
          importadoDesdePdf: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
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

    let matched = null;
    if (sub.colegioId) {
      matched = colegios.find(c => c.id === sub.colegioId);
    }
    if (!matched && sub.institucion) {
      matched = colMap.get(normalizeText(sub.institucion));
    }

    if (matched) {
      let padronUgel = matched.dependencia || 'UGEL 03';
      if (padronUgel.toLowerCase().includes('sector educ')) padronUgel = 'UGEL 03';
      
      const padronRed = matched.rei || 'No aplica';
      const padronCod = matched.codigoLocal || matched.codigoModular || '';

      if (newUgel !== padronUgel) { newUgel = padronUgel; needUpdate = true; }
      if (newRed !== padronRed) { newRed = padronRed; needUpdate = true; }
      if (padronCod && newCod !== padronCod) { newCod = padronCod; needUpdate = true; }
    } else {
      if (!newUgel || newUgel === '—' || newUgel.toLowerCase().includes('sector educ')) {
        newUgel = 'UGEL 03';
        needUpdate = true;
      }
      if (!newRed || newRed === '—') {
        newRed = 'No aplica';
        needUpdate = true;
      }
    }


































    if (needUpdate) {
      const docRef = dbNs.collection('submissions').doc(sub.id);
      currentBatch.update(docRef, {
        ugel: newUgel,
        red: newRed,
        codigoModular: formatCodigoModular(newCod || ''),
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
      const sameGen = normalizeGenero(r1.genero) === normalizeGenero(r2.genero);
      const samePuesto = normalizePuestoValue(r1.puesto) === normalizePuestoValue(r2.puesto);

      const pDnis2 = (r2.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
      const sharesDni = pDnis1.length > 0 && pDnis2.length > 0 && pDnis1.some(d => pDnis2.includes(d));

      if (sameTipo && sameEtapa && sameCat && sameInst && sameGen && (sharesDni || (sameDisc && samePuesto))) {
        group.push(r2);
        visitedExact.add(r2.id);
      }
    }

    if (group.length > 1) {
      visitedExact.add(r1.id);
      exactGroups.push(group);
    }
  }

  // 2. Detectar conflictos de puesto (respetando los campos de podio como género)
  const puestoConflicts = [];
  const topPuestos = ['1.er puesto', '2.° puesto', '3.er puesto'];
  const pMap = new Map();

  regs.forEach(r => {
    const normP = normalizePuestoValue(r.puesto);
    if (!topPuestos.includes(normP)) return;
    const rTipo = (state.tiposConcurso || []).find(t => t.id === r.tipoConcursoId || t.nombre === r.tipoConcursoNombre);
    const podKey = getPodioKey(r, rTipo);
    const key = [
      r.tipoConcursoId || r.tipoConcursoNombre,
      (r.etapa || '').toUpperCase(),
      podKey,
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

  lockBodyScroll();
  document.body.appendChild(modalWrap);

  const onKey = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  window.addEventListener('keydown', onKey);

  const closeModal = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };
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

// =========================================================================
// ASISTENTE DE CONSOLIDACIÓN DE CUERPO TÉCNICO POR GRUPO (JEDPA)
// Permite asociar delegados y entrenadores a nivel de grupo de competencia,
// detectando y resolviendo discrepancias de roles de forma interactiva.
// =========================================================================
export function openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate) {
  const regs = state.concursoRegistros || [];
  const tipos = state.tiposConcurso || [];

  // Filtrar registros JEDPA
  const jedpaRegs = regs.filter(r => {
    const t = tipos.find(tp => tp.id === r.tipoConcursoId || tp.nombre === r.tipoConcursoNombre);
    return isJedpaConcurso(t) || (r.tipoConcursoId || '').toLowerCase().includes('jedpa') || (r.tipoConcursoNombre || '').toLowerCase().includes('jedpa');
  });

  if (jedpaRegs.length === 0) {
    showToast('No se encontraron registros de JEDPA para analizar.');
    return;
  }

  // Agrupar registros por grupo (Etapa · Disciplina · Categoría · Género)
  const groupMap = new Map();
  jedpaRegs.forEach(r => {
    const etapa = (r.etapa || 'UGEL').trim().toUpperCase();
    const disc = (r.disciplina || 'GENERAL').trim().toUpperCase();
    const cat = (r.categoria || 'A').trim().toUpperCase();
    const gen = formatGeneroDisplay(r.genero).trim().toUpperCase();
    const groupKey = `${etapa} · ${disc} · CATEGORÍA ${cat} · ${gen}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        groupKey,
        etapa: (r.etapa || 'UGEL').trim(),
        disciplina: (r.disciplina || '').trim(),
        categoria: (r.categoria || '').trim(),
        genero: (r.genero || '').trim(),
        records: []
      });
    }
    groupMap.get(groupKey).records.push(r);
  });

  const groups = Array.from(groupMap.values());

  // Extraer disciplinas únicas con recuento para el filtro
  const disciplinaCounts = {};
  groups.forEach(g => {
    const d = (g.disciplina || '').trim();
    if (d) {
      disciplinaCounts[d] = (disciplinaCounts[d] || 0) + 1;
    }
  });
  const uniqueDisciplinas = Object.keys(disciplinaCounts).sort((a, b) => a.localeCompare(b));

  // Estados persistentes de filtros dentro de la sesión del modal
  let filterSearchText = '';
  let filterDisciplina = '';
  let filterEstado = 'todos'; // 'todos' | 'pendientes' | 'formalizados'

  const modalWrap = document.createElement('div');
  modalWrap.id = 'consolidarCuerpoTecnicoModal';

  // Almacenar selecciones interactivas de roles para no perderlas ante errores o re-renderizados
  const roleSelections = new Map();

  let escListenerAttached = false;
  const handleEscKey = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal();
    }
  };

  const closeModal = () => {
    if (escListenerAttached) {
      window.removeEventListener('keydown', handleEscKey);
      escListenerAttached = false;
    }
    modalWrap.remove();
    renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
  };

  function renderModalBody() {
    const ctCollection = state.concursoCuerpoTecnico || [];

    const groupsHtml = groups.map((g, gIdx) => {
      // Buscar si este grupo ya está en concursoCuerpoTecnico usando ID determinístico y normalización
      const detDocId = generarConcursoCuerpoTecnicoDocId(g.etapa, g.disciplina, g.categoria, formatGeneroDisplay(g.genero));
      const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const legacyId = `jedpa_${slug(g.etapa)}_${slug(g.disciplina)}_${slug(g.categoria)}_${slug(g.genero)}`;

      const norm = (s) => String(s || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normCat = (c) => norm(c).replace(/^CATEGORIA_?/, '').replace(/[^A-Z0-9]/g, '');
      const normGen = (val) => {
        const v = norm(val);
        if (v.startsWith('DAM') || v === 'F') return 'DAMAS';
        if (v.startsWith('VAR') || v === 'M') return 'VARONES';
        return v;
      };

      const existingDoc = ctCollection.find(d => {
        if (!d) return false;
        if (d.id === detDocId || d.id === legacyId) return true;
        if (d.id === g.groupKey || d.grupoKey === g.groupKey) return true;
        return norm(d.etapa || 'UGEL') === norm(g.etapa || 'UGEL') &&
          norm(d.disciplina || '') === norm(g.disciplina || '') &&
          normCat(d.categoria || '') === normCat(g.categoria || '') &&
          normGen(d.genero || d.rama || '') === normGen(g.genero || '');
      });

      const existingMembers = existingDoc && (
        (Array.isArray(existingDoc.miembros) && existingDoc.miembros.length > 0)
          ? existingDoc.miembros
          : (Array.isArray(existingDoc.personas) ? existingDoc.personas : [])
      );

      if (existingMembers && existingMembers.length > 0) {
        // Estado: Formalizado en concursoCuerpoTecnico
        const membersSearch = existingMembers.map(m => `${m.apellidos || ''} ${m.nombres || ''} ${m.dni || ''} ${m.rol || ''}`).join(' ');
        const searchBlob = `${g.groupKey} ${g.disciplina} ${g.categoria} ${g.genero} ${membersSearch}`.toLowerCase();

        return `
          <div class="panel m_ct_group_card" data-gidx="${gIdx}" data-disciplina="${esc(g.disciplina)}" data-categoria="${esc(g.categoria)}" data-genero="${esc(g.genero)}" data-estado="formalizado" data-searchtext="${esc(searchBlob)}" style="border:1.5px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:16px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px">
              <div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <h4 style="margin:0;color:var(--navy-900);font-size:15px">🏅 ${esc(g.groupKey)}</h4>
                  <span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:11px">✓ Guardado en concursoCuerpoTecnico</span>
                </div>
                <p style="margin:4px 0 0;font-size:12px;color:var(--ink-soft)">
                  ${g.records.length} competidores registrados en este grupo. El cuerpo técnico está formalizado a nivel institucional.
                </p>
              </div>
              <div style="display:flex;gap:6px">
                <button type="button" class="btn secondary small" data-rollback-ct="${esc(existingDoc.id)}" data-gkey="${esc(g.groupKey)}" style="color:#b91c1c;border-color:#fca5a5" title="Eliminar registro centralizado y revertir al estado individual">
                  🗑️ Deshacer formalización (Rollback)
                </button>
              </div>
            </div>

            <table style="width:100%;font-size:12.5px;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #dcfce7">
              <thead>
                <tr style="background:#f0fdf4;border-bottom:1.5px solid #bbf7d0;color:var(--ink);text-align:left">
                  <th style="padding:6px 10px;width:140px">Rol oficial</th>
                  <th style="padding:6px 10px">Apellidos y Nombres</th>
                  <th style="padding:6px 10px;width:120px">DNI / Documento</th>
                </tr>
              </thead>
              <tbody>
                ${existingMembers.map(m => `
                  <tr style="border-bottom:1px solid #f0fdf4">
                    <td style="padding:6px 10px"><span class="badge" style="font-size:11px;font-weight:700">${esc((m.rol || 'DELEGADO').toUpperCase())}</span></td>
                    <td style="padding:6px 10px"><strong>${esc((m.apellidos || '').toUpperCase())} ${esc((m.nombres || '').toUpperCase())}</strong></td>
                    <td style="padding:6px 10px;color:var(--ink-soft)">${esc(m.dni || '—')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      // Estado: Pendiente de formalización (analizar miembros detectados en los registros del grupo)
      const memberMap = new Map();
      g.records.forEach(r => {
        (r.asesores || []).forEach(a => {
          const dni = (a.dni || '').trim();
          const nom = (a.nombres || '').trim().replace(/\s{2,}/g, ' ');
          const ape = (a.apellidos || '').trim().replace(/\s{2,}/g, ' ');
          const key = dni || `${ape}|${nom}`.toUpperCase();
          if (!key) return;

          if (!memberMap.has(key)) {
            memberMap.set(key, {
              key,
              dni,
              nombres: nom,
              apellidos: ape,
              rolesCount: {},
              recordsCount: 0
            });
          }

          const item = memberMap.get(key);
          item.recordsCount++;
          const curRol = (a.rol || 'Delegado').trim();
          item.rolesCount[curRol] = (item.rolesCount[curRol] || 0) + 1;
        });
      });

      const detectedMembers = Array.from(memberMap.values());

      if (detectedMembers.length === 0) {
        const searchBlob = `${g.groupKey} ${g.disciplina} ${g.categoria} ${g.genero}`.toLowerCase();
        return `
          <div class="panel m_ct_group_card" data-gidx="${gIdx}" data-disciplina="${esc(g.disciplina)}" data-categoria="${esc(g.categoria)}" data-genero="${esc(g.genero)}" data-estado="pendiente" data-searchtext="${esc(searchBlob)}" style="border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px">
            <h4 style="margin:0;color:var(--navy-900);font-size:15px">🏅 ${esc(g.groupKey)}</h4>
            <p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-soft)">
              Este grupo tiene ${g.records.length} registros pero no cuenta con asesores ni cuerpo técnico registrado en sus filas.
            </p>
          </div>
        `;
      }

      const rowsDetectedHtml = detectedMembers.map((m, mIdx) => {
        const rolesArr = Object.entries(m.rolesCount).sort((a, b) => b[1] - a[1]);
        const majorityRole = rolesArr[0] ? rolesArr[0][0] : 'Delegado';
        const hasConflict = rolesArr.length > 1;

        // Recuperar selección previa del usuario si ya modificó este desplegable
        const selKey = `${gIdx}_${mIdx}`;
        const activeRole = roleSelections.has(selKey) ? roleSelections.get(selKey) : majorityRole;

        let conflictNotice = '';
        if (hasConflict) {
          const conflictBreakdown = rolesArr.map(([r, c]) => `${r} (${c} registros)`).join(', ');
          conflictNotice = `
            <div style="font-size:11.5px;color:#b45309;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:4px 8px;margin-top:4px">
              ⚠️ <strong>Discrepancia detectada:</strong> aparece en distintos registros como: <em>${esc(conflictBreakdown)}</em>.<br>
              Se preselecciona el rol mayoritario (<strong>${esc(majorityRole)}</strong>). Puedes cambiarlo si corresponde.
            </div>
          `;
        }

        const roleOptions = ['Delegado', 'Entrenador', 'Docente Asesor'].map(rolOpt => {
          const isSel = (rolOpt.toLowerCase() === activeRole.toLowerCase());
          return `<option value="${esc(rolOpt)}" ${isSel ? 'selected' : ''}>${esc(rolOpt)}</option>`;
        }).join('');

        const fullNameUpper = `${m.apellidos ? m.apellidos.toUpperCase() + ', ' : ''}${m.nombres.toUpperCase()}`.trim();

        return `
          <tr style="border-bottom:1px solid var(--line);background:${hasConflict ? '#fffbeb' : '#fff'}" data-member-idx="${mIdx}">
            <td style="padding:8px 10px;vertical-align:top">
              <select class="m_ct_role" data-gidx="${gIdx}" data-midx="${mIdx}" style="font-weight:700;padding:4px 8px;font-size:12px">
                ${roleOptions}
              </select>
              ${conflictNotice}
            </td>
            <td style="padding:8px 10px;vertical-align:top">
              <strong style="color:var(--navy-900)">${esc(fullNameUpper)}</strong>
              <input type="hidden" class="m_ct_ape" value="${esc(m.apellidos.toUpperCase())}">
              <input type="hidden" class="m_ct_nom" value="${esc(m.nombres.toUpperCase())}">
            </td>
            <td style="padding:8px 10px;vertical-align:top">
              <span style="font-family:monospace;font-size:12px">${esc(m.dni || '—')}</span>
              <input type="hidden" class="m_ct_dni" value="${esc(m.dni)}">
            </td>
            <td style="padding:8px 10px;vertical-align:top;text-align:center;font-size:12px;color:var(--ink-soft)">
              <span class="badge" style="font-size:11px">${m.recordsCount} de ${g.records.length}</span>
            </td>
          </tr>
        `;
      }).join('');

      const membersSearch = detectedMembers.map(m => `${m.apellidos || ''} ${m.nombres || ''} ${m.dni || ''}`).join(' ');
      const searchBlob = `${g.groupKey} ${g.disciplina} ${g.categoria} ${g.genero} ${membersSearch}`.toLowerCase();

      return `
        <div class="panel m_ct_group_card" data-gidx="${gIdx}" data-disciplina="${esc(g.disciplina)}" data-categoria="${esc(g.categoria)}" data-genero="${esc(g.genero)}" data-estado="pendiente" data-searchtext="${esc(searchBlob)}" style="border:1.5px solid var(--primary-tint);border-radius:10px;padding:16px;margin-bottom:16px;background:var(--surface)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <h4 style="margin:0;color:var(--navy-900);font-size:15px">🏅 ${esc(g.groupKey)}</h4>
                <span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:11px">⚠️ Pendiente de consolidación</span>
              </div>
              <p style="margin:4px 0 0;font-size:12px;color:var(--ink-soft)">
                Se detectaron ${detectedMembers.length} personas actuando como cuerpo técnico en ${g.records.length} registros. Confirma el rol definitivo para registrarlos a nivel de grupo.
              </p>
            </div>
            <div>
              <button type="button" class="btn small" data-save-ct="${gIdx}" style="font-size:12px">
                💾 Guardar en concursoCuerpoTecnico
              </button>
            </div>
          </div>

          <table style="width:100%;font-size:12.5px;border-collapse:collapse;border:1px solid var(--line);border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:var(--surface-2);border-bottom:1.5px solid var(--line);color:var(--ink);text-align:left">
                <th style="padding:6px 10px;width:190px">Rol a asignar</th>
                <th style="padding:6px 10px">Apellidos y Nombres (en mayúsculas)</th>
                <th style="padding:6px 10px;width:120px">DNI / Documento</th>
                <th style="padding:6px 10px;width:110px;text-align:center">Apariciones</th>
              </tr>
            </thead>
            <tbody>
              ${rowsDetectedHtml}
            </tbody>
          </table>

          <div style="margin-top:10px;display:flex;align-items:center;gap:8px">
            <label style="font-size:11.5px;color:var(--ink-soft);display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" data-clean-individual="${gIdx}">
              <span>Limpiar asesores redundantes en registros individuales (Opcional · Desmarcado por defecto para no modificar ningún dato existente)</span>
            </label>
          </div>
        </div>
      `;
    }).join('');

    modalWrap.innerHTML = `
      <div id="m_ct_backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:960px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden">
          
          <!-- Encabezado fijo (Sticky Top) -->
          <div style="position:sticky;top:0;z-index:10;background:var(--surface);display:flex;flex-direction:column;gap:12px;padding:18px 24px;border-bottom:1px solid var(--line);box-shadow:0 2px 4px rgba(0,0,0,0.03)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <h3 style="margin:0;display:flex;align-items:center;gap:8px;font-size:18px;color:var(--navy-900)">
                  👥 Consolidar Cuerpo Técnico por Grupo (JEDPA)
                </h3>
                <p style="margin:4px 0 0;font-size:13px;color:var(--ink-soft)">
                  Asigna el cuerpo técnico (Delegado / Entrenador) una sola vez por cada grupo de competencia. Esto optimiza el acta oficial sin duplicar información.
                </p>
              </div>
              <button type="button" class="iconBtn" id="m_ct_close" title="Cerrar modal (Esc)" style="font-size:18px;line-height:1;padding:6px 10px;cursor:pointer">✕</button>
            </div>

            <!-- Barra de búsqueda y filtros de disciplina -->
            <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:var(--surface-2);padding:10px 14px;border-radius:10px;border:1px solid var(--line)">
              <!-- Buscador de texto -->
              <div style="flex:1;min-width:240px;position:relative">
                <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--ink-soft);pointer-events:none">🔍</span>
                <input type="search" id="m_ct_search_input" placeholder="Buscar por disciplina, categoría, género, profesor o DNI..." value="${esc(filterSearchText)}" style="width:100%;padding:7px 10px 7px 32px;font-size:13px;border-radius:7px;border:1px solid var(--line);background:var(--surface);box-sizing:border-box">
              </div>

              <!-- Selector desplegable de Disciplinas -->
              <div style="min-width:190px">
                <select id="m_ct_filter_disciplina" style="width:100%;padding:7px 10px;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--line);background:var(--surface);cursor:pointer">
                  <option value="">Todas las disciplinas (${uniqueDisciplinas.length})</option>
                  ${uniqueDisciplinas.map(d => `<option value="${esc(d)}" ${d === filterDisciplina ? 'selected' : ''}>${esc(d)} (${disciplinaCounts[d] || 0})</option>`).join('')}
                </select>
              </div>

              <!-- Filtro por Estado -->
              <div style="min-width:150px">
                <select id="m_ct_filter_estado" style="width:100%;padding:7px 10px;font-size:13px;border-radius:7px;border:1px solid var(--line);background:var(--surface);cursor:pointer">
                  <option value="todos" ${filterEstado === 'todos' ? 'selected' : ''}>Todos los estados</option>
                  <option value="pendientes" ${filterEstado === 'pendientes' ? 'selected' : ''}>⚠️ Pendientes</option>
                  <option value="formalizados" ${filterEstado === 'formalizados' ? 'selected' : ''}>✓ Formalizados</option>
                </select>
              </div>

              <!-- Botón limpiar -->
              <button type="button" class="btn secondary small" id="m_ct_clear_filters" style="font-size:12px;padding:7px 12px;white-space:nowrap" title="Restablecer filtros">
                Limpiar
              </button>
            </div>
          </div>

          <!-- Contenido central scrolleable -->
          <div id="m_ct_scroll_body" style="flex:1;overflow-y:auto;padding:20px 24px">
            <div id="m_ct_empty_filter" style="display:none;text-align:center;padding:40px 20px;color:var(--ink-soft);background:var(--surface-2);border-radius:10px;border:1px dashed var(--line);margin-bottom:16px">
              <div style="font-size:32px;margin-bottom:8px">🔍</div>
              <div style="font-weight:700;font-size:15px;color:var(--navy-900)">No se encontraron grupos</div>
              <div style="font-size:13px;margin-top:4px">No hay ningún grupo de competencia que coincida con el criterio de búsqueda o disciplina seleccionada.</div>
            </div>
            ${groupsHtml}
          </div>

          <!-- Pie fijo (Sticky Bottom) -->
          <div style="position:sticky;bottom:0;z-index:10;background:var(--surface);display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:14px 24px">
            <div style="font-size:12px;color:var(--ink-soft)">
              <span id="m_ct_group_count_label">${groups.length} grupo${groups.length === 1 ? '' : 's'} analizado${groups.length === 1 ? '' : 's'}</span>
            </div>
            <div style="display:flex;gap:10px">
              <button type="button" class="btn secondary" id="m_ct_closeBtn">Cerrar</button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Event listeners de cierre y atajo de teclado ESC
    if (!escListenerAttached) {
      window.addEventListener('keydown', handleEscKey);
      escListenerAttached = true;
    }

    const closeBtn1 = modalWrap.querySelector('#m_ct_close');
    if (closeBtn1) closeBtn1.addEventListener('click', closeModal);
    const closeBtn2 = modalWrap.querySelector('#m_ct_closeBtn');
    if (closeBtn2) closeBtn2.addEventListener('click', closeModal);

    const backdrop = modalWrap.querySelector('#m_ct_backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
    }

    // Event listeners de búsqueda y filtrado interactivo
    function applyGroupFilters() {
      const cards = modalWrap.querySelectorAll('.m_ct_group_card');
      const emptyNotice = modalWrap.querySelector('#m_ct_empty_filter');
      const countLabel = modalWrap.querySelector('#m_ct_group_count_label');

      const q = (filterSearchText || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const discFilter = (filterDisciplina || '').trim().toUpperCase();
      const estFilter = filterEstado || 'todos';

      let visibleCount = 0;

      cards.forEach(card => {
        const cardDisc = (card.dataset.disciplina || '').trim().toUpperCase();
        const cardEstado = card.dataset.estado || 'pendiente';
        const cardSearch = (card.dataset.searchtext || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Filtro de disciplina
        if (discFilter && cardDisc !== discFilter) {
          card.style.display = 'none';
          return;
        }

        // Filtro de estado
        if (estFilter === 'pendientes' && cardEstado !== 'pendiente') {
          card.style.display = 'none';
          return;
        }
        if (estFilter === 'formalizados' && cardEstado !== 'formalizado') {
          card.style.display = 'none';
          return;
        }

        // Búsqueda de texto (disciplina, categoría, género, DNI, nombres de docentes)
        if (q) {
          if (!cardSearch.includes(q)) {
            card.style.display = 'none';
            return;
          }
        }

        card.style.display = '';
        visibleCount++;
      });

      if (emptyNotice) {
        emptyNotice.style.display = (visibleCount === 0) ? 'block' : 'none';
      }

      if (countLabel) {
        if (visibleCount === groups.length) {
          countLabel.textContent = `${groups.length} grupo${groups.length === 1 ? '' : 's'} analizado${groups.length === 1 ? '' : 's'}`;
        } else {
          const detail = discFilter ? ` · ${discFilter}` : '';
          countLabel.innerHTML = `Mostrando <strong>${visibleCount}</strong> de <strong>${groups.length}</strong> grupos${detail}`;
        }
      }
    }

    const searchInput = modalWrap.querySelector('#m_ct_search_input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterSearchText = e.target.value;
        applyGroupFilters();
      });
    }

    const discSelect = modalWrap.querySelector('#m_ct_filter_disciplina');
    if (discSelect) {
      discSelect.addEventListener('change', (e) => {
        filterDisciplina = e.target.value;
        applyGroupFilters();
      });
    }

    const estSelect = modalWrap.querySelector('#m_ct_filter_estado');
    if (estSelect) {
      estSelect.addEventListener('change', (e) => {
        filterEstado = e.target.value;
        applyGroupFilters();
      });
    }

    const clearFiltersBtn = modalWrap.querySelector('#m_ct_clear_filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        filterSearchText = '';
        filterDisciplina = '';
        filterEstado = 'todos';
        if (searchInput) searchInput.value = '';
        if (discSelect) discSelect.value = '';
        if (estSelect) estSelect.value = 'todos';
        applyGroupFilters();
      });
    }

    // Ejecutar filtro inicial por si viene de un re-renderizado
    applyGroupFilters();

    // Registrar cambios en los desplegables de rol para preservarlos
    modalWrap.querySelectorAll('.m_ct_role').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const gI = e.target.dataset.gidx;
        const mI = e.target.dataset.midx;
        roleSelections.set(`${gI}_${mI}`, e.target.value.trim());
      });
    });

    // Guardar cuerpo técnico de un grupo
    modalWrap.querySelectorAll('[data-save-ct]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const gIdx = Number(btn.dataset.saveCt);
        const group = groups[gIdx];
        if (!group) return;

        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const panel = btn.closest('.panel');
        const rows = panel.querySelectorAll('tbody tr[data-member-idx]');
        const membersToSave = [];

        rows.forEach(r => {
          const rolSel = r.querySelector('.m_ct_role');
          const apeInp = r.querySelector('.m_ct_ape');
          const nomInp = r.querySelector('.m_ct_nom');
          const dniInp = r.querySelector('.m_ct_dni');

          const rolVal = rolSel ? rolSel.value.trim() : 'Delegado';
          const midx = r.dataset.memberIdx;
          if (midx !== undefined) {
            roleSelections.set(`${gIdx}_${midx}`, rolVal);
          }

          membersToSave.push({
            rol: rolVal,
            apellidos: apeInp ? apeInp.value.trim().toUpperCase() : '',
            nombres: nomInp ? nomInp.value.trim().toUpperCase() : '',
            dni: dniInp ? dniInp.value.trim() : ''
          });
        });

        if (membersToSave.length === 0) {
          showToast('No hay miembros para guardar.');
          btn.disabled = false;
          btn.textContent = '💾 Guardar en concursoCuerpoTecnico';
          return;
        }

        const ctDocId = generarConcursoCuerpoTecnicoDocId(
          group.etapa || 'UGEL',
          group.disciplina,
          group.categoria,
          formatGeneroDisplay(group.genero)
        );

        const payload = {
          tipoConcursoId: 'jedpa',
          concursoNombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
          etapa: group.etapa || 'UGEL',
          disciplina: group.disciplina,
          categoria: group.categoria,
          genero: group.genero,
          rama: formatGeneroDisplay(group.genero),
          miembros: membersToSave,
          personas: membersToSave,
          registrosCount: group.records.length,
          consolidatedAt: Date.now(),
          consolidatedBy: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Admin',
          updatedAt: Date.now()
        };

        try {
          await dbNs.collection('concursoCuerpoTecnico').doc(ctDocId).set(payload);

          // Actualizar inmediatamente el estado en memoria para reflejarlo sin recargar
          const savedDoc = { id: ctDocId, ...payload };
          const existingIdx = (state.concursoCuerpoTecnico || []).findIndex(d => d.id === ctDocId);
          if (existingIdx >= 0) {
            state.concursoCuerpoTecnico[existingIdx] = savedDoc;
          } else {
            state.concursoCuerpoTecnico = state.concursoCuerpoTecnico || [];
            state.concursoCuerpoTecnico.push(savedDoc);
          }

          // Checkbox para limpiar registros individuales (opcional)
          const cleanChk = panel.querySelector(`[data-clean-individual="${gIdx}"]`);
          if (cleanChk && cleanChk.checked) {
            try {
              const batch = dbNs.batch();
              group.records.forEach(rec => {
                const recRef = dbNs.collection('concursoRegistros').doc(rec.id);
                batch.update(recRef, { asesores: [], cuerpoTecnicoRef: ctDocId, updatedAt: Date.now() });
                rec.asesores = [];
                rec.cuerpoTecnicoRef = ctDocId;
              });
              await batch.commit();
            } catch (batchErr) {
              console.warn('[concursoRegistros:batchUpdate] Advertencia limpiando asesores individuales:', batchErr);
            }
          }

          // Registrar en logActividades de forma segura (no bloqueante)
          try {
            await dbNs.collection('logActividades').add({
              tipo: 'consolidar_cuerpo_tecnico_grupo',
              grupo: group.groupKey,
              docId: ctDocId,
              miembrosCount: membersToSave.length,
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Admin',
              fecha: Date.now()
            });
          } catch (logErr) {
            console.warn('[logActividades:add] Aviso: no se pudo escribir bitácora (no crítico):', logErr);
          }

          showToast('✓ Cuerpo técnico formalizado en concursoCuerpoTecnico.');
          renderModalBody();
          renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
        } catch (err) {
          console.error('[concursoCuerpoTecnico:set] Error guardando cuerpo técnico en ' + ctDocId + ':', err);
          const errCode = err && err.code ? ` [${err.code}]` : '';
          showToast(`Error al guardar${errCode}: ${err.message || err}`);
          btn.disabled = false;
          btn.textContent = '💾 Guardar en concursoCuerpoTecnico';
        }
      });
    });

    // Rollback de cuerpo técnico
    modalWrap.querySelectorAll('[data-rollback-ct]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const docId = btn.dataset.rollbackCt;
        const gKey = btn.dataset.gkey;
        if (!docId) return;

        if (!confirm(`¿Deseas eliminar la formalización del cuerpo técnico para ${gKey}?\n\nLos registros de los competidores individuales mantendrán intacta su información histórica.`)) {
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Eliminando...';

        try {
          await dbNs.collection('concursoCuerpoTecnico').doc(docId).delete();

          // Retirar de state.concursoCuerpoTecnico local
          if (Array.isArray(state.concursoCuerpoTecnico)) {
            state.concursoCuerpoTecnico = state.concursoCuerpoTecnico.filter(d => d.id !== docId);
          }

          // Registrar rollback en logActividades de forma segura
          try {
            await dbNs.collection('logActividades').add({
              tipo: 'rollback_cuerpo_tecnico_grupo',
              grupo: gKey,
              docId: docId,
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Admin',
              fecha: Date.now()
            });
          } catch (logErr) {
            console.warn('[logActividades:add] Aviso en bitácora de rollback:', logErr);
          }

          showToast('✓ Rollback completado. Se eliminó la formalización del grupo.');
          renderModalBody();
          renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
        } catch (err) {
          console.error('[concursoCuerpoTecnico:delete] Error en rollback de ' + docId + ':', err);
          const errCode = err && err.code ? ` [${err.code}]` : '';
          showToast(`Error en rollback${errCode}: ${err.message || err}`);
          btn.disabled = false;
          btn.textContent = '🗑️ Deshacer formalización (Rollback)';
        }
      });
    });
  }

  renderModalBody();
  document.body.appendChild(modalWrap);
}