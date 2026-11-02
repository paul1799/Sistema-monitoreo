/* =========================================================================
   features/reportes/filters.js — Lógica de filtros, búsqueda, cajón y catálogo
   UGEL 03 · AGEBRE · Fase 2 Reorganización
   ========================================================================= */

import {
  esc,
  genId,
  showToast,
  fmtDate,
  todayStr,
  cleanForFirestore,
  normalizeText,
  normalizeInstName,
  normalizeReiNumber,
  normalizeReiList,
  downloadCsv,
  lockBodyScroll,
  unlockBodyScroll,
  forceResetBodyScroll,
  resolveDirectorName,
  isFichaActiva
} from '../../core/utils/index.js';
import {
  setAppState,
  getAppState,
  setEditMode,
  clearEditMode,
  getSessionUser,
  setSessionUser,
  setRegSelectedTypeId,
  setRegBuiltFor,
  setRegSelectedColegioId,
  setRegTargetVisita,
  getRegTargetVisita
} from '../../core/state/app-state.js';
import {
  RESPONSE_OPTIONS,
  RESPONSE_LABELS,
  OPTION_COLORS,
  scoreValue,
  statusFromPct,
  colorForPct,
  getSubmissionResponsable,
  getResponsableForColegio,
  donutChart,
  stackedBar,
  computeStats,
  computeItemAgg,
  renderItemReportHtml
} from '../../ui/scoring.js';
import { openDownloadConfigModal } from '../../ui/modales.js';
import { openModalLimpiarRegistros } from '../../ui/modales-limpieza.js?v=20261030_v1';
import {
  buildColegioIndex,
  matchColegio,
  groupSubmissionsByColegio,
  colegioFichaTypeStats,
  openModalGestionJec
} from '../../ui/colegios-tab.js';
import {
  JEC_FICHAS_CONFIG,
  getJecFichaConfig,
  getJecVisitasToCheck,
  getMomentoLabelJec,
  renderJecVisitaSelectHtml,
  buildJecVisitBadges,
  calculateJecPendingItems,
  renderJecPendingTabsHtml
} from '../../ui/jec-reportes.js';
import {
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  ESPECIALISTA_JEC_OFICIAL,
  getNivelCoordTutoriaJec,
  getNivelCoordPedagogicoJec,
  isFichaEbrGestionEscolar,
  isFichaEbrEbePrite,
  isFichaJec1erMomento,
  getReglaNivelEbrGestion,
  getNivelEbrGestion,
  getMomentoVisitaEbr,
  getSubmissionVisitaNum
} from '../../domain/fichas/index.js';
import {
  exportFichaIndividualPdf,
  exportConsolidadoReportPdf
} from '../../pdf-template.js';
import { getEbrSeccionesForVisita } from '../../ebr-gestion.js';
import { isFichaJec, JEC_SECCIONES, getNivelLogroJec } from '../../jec-monitoreo.js';
import { JEC_1ER_SECCIONES } from '../../jec-1er-monitoreo.js';
import { backfillSubmissionsUgelRed } from '../../ui/concursos-tab.js';
import { isFichaCebeGestion, CEBE_SECCIONES } from '../../cebe-gestion.js';
import { isFichaPriteGestion, PRITE_SECCIONES } from '../../prite-gestion.js';
import { getDirectivosActivosForColegio } from '../../directorio.js';
import { exportarMatrizSeguimiento } from '../../exportarMatriz.js';
import { exportarTableroEBRCompleto } from '../../exportarTableroEBR.js';

let _renderConsBodyHook = null;
export function setRenderConsBodyHook(fn) { _renderConsBodyHook = fn; }
function renderConsBodyProxy(...args) {
  if (_renderConsBodyHook) return _renderConsBodyHook(...args);
}

export const DEFAULT_FICHA_TYPES_METADATA = {
  'ft_msejec_1er': { grupo: 'Modelo JEC', nombreCorto: 'Monitoreo a la Implementación del Modelo JEC', orden: 10, tieneVisitas: true },
  'ft_msejec_2do': { grupo: 'Modelo JEC', nombreCorto: 'Monitoreo a la Implementación del Modelo JEC', orden: 10, tieneVisitas: true },
  'ft_jec': { grupo: 'Modelo JEC', nombreCorto: 'Monitoreo a la Implementación del Modelo JEC', orden: 10, tieneVisitas: true },
  'ft_msejec_3er': { grupo: 'Modelo JEC', nombreCorto: 'Monitoreo a la Implementación del Modelo JEC', orden: 10, tieneVisitas: true },
  'ft_coord_tutoria_jec': { grupo: 'Modelo JEC', nombreCorto: 'Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)', orden: 12, tieneVisitas: true },
  'ft_coord_pedagogico': { grupo: 'Modelo JEC', nombreCorto: 'Coord. Pedagógico (JEC)', orden: 13, tieneVisitas: true },
  'ft_coord_pedagogico_jec': { grupo: 'Modelo JEC', nombreCorto: 'Coord. Pedagógico (JEC)', orden: 13, tieneVisitas: true },
  'ft_gestion_ugel03_ebr': { grupo: 'EBR', nombreCorto: 'Gestión Escolar EBR', orden: 20, tieneVisitas: true },
  'ft_ebr_gestion_1er': { grupo: 'EBR', nombreCorto: 'Gestión Escolar EBR', orden: 20, tieneVisitas: true },
  'ft_directivo': { grupo: 'EBR', nombreCorto: 'Directivo de IE', orden: 21, tieneVisitas: false },
  'ft_rubricas_aula': { grupo: 'Docentes', nombreCorto: 'Monitoreo a Docentes (EBR-EBA)', orden: 22, tieneVisitas: false },
  'ft_gestion_cebe': { grupo: 'CEBE / PRITE', nombreCorto: 'Gestión Escolar CEBE', orden: 30, tieneVisitas: true },
  'ft_prite_gestion': { grupo: 'CEBE / PRITE', nombreCorto: 'Gestión Escolar PRITE', orden: 31, tieneVisitas: true },
  'ft_materiales_cebe': { grupo: 'CEBE / PRITE', nombreCorto: 'Materiales educativos (CEBE/PRITE)', orden: 32, tieneVisitas: false },
  'ft_cebe_lectora': { grupo: 'CEBE / PRITE', nombreCorto: 'Experiencia lectora CEBE 2026', orden: 33, tieneVisitas: true }
};

export function getEnrichedFichaType(ft) {
  if (!ft) return null;
  const def = DEFAULT_FICHA_TYPES_METADATA[ft.id] || {};
  const hasVisitasInSections = Boolean(
    ft.secciones && ft.secciones.some(s => s.visitas || s.momento || (s.items && s.items.some(i => i.visitas || i.momento)))
  );

  const nNorm = normalizeText(ft.nombre || ft.nombreCorto || '');
  const idNorm = normalizeText(ft.id || '');

  let autoGrupo = ft.grupo || def.grupo || null;
  let autoNombreCorto = ft.nombreCorto || def.nombreCorto || null;
  let autoOrden = typeof ft.orden === 'number' ? ft.orden : (typeof def.orden === 'number' ? def.orden : null);
  let autoTieneVisitas = typeof ft.tieneVisitas === 'boolean'
    ? ft.tieneVisitas
    : (typeof def.tieneVisitas === 'boolean' ? def.tieneVisitas : null);

  // Normalización unificada para la ficha única de Implementación del Modelo JEC (Estilo EBR)
  if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
    autoGrupo = 'Modelo JEC';
    autoNombreCorto = 'Monitoreo a la Implementación del Modelo JEC';
    autoOrden = 10;
    autoTieneVisitas = true;
  }

  // Heurísticas de fallback únicamente si no se ha asignado un grupo explícito
  if (!autoGrupo) {
    // 1. Coordinador pedagógico (JEC)
    if (isFichaCoordPedagogico(ft) || ((nNorm.includes('coordinador') || idNorm.includes('coord')) && nNorm.includes('pedagog'))) {
      autoGrupo = 'Modelo JEC';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Coord. Pedagógico (JEC)';
      if (autoOrden === null) autoOrden = 13;
      if (autoTieneVisitas === null) autoTieneVisitas = true;
    }
    // 2. Coordinador de tutoría (JEC)
    else if (isFichaCoordTutoriaJec(ft) || ((nNorm.includes('tutor') || idNorm.includes('tutor')) && (nNorm.includes('jec') || idNorm.includes('jec') || nNorm.includes('coord') || idNorm.includes('coord')))) {
      autoGrupo = 'Modelo JEC';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)';
      if (autoOrden === null) autoOrden = 12;
      if (autoTieneVisitas === null) autoTieneVisitas = true;
    }
    // 3. Implementación del Modelo JEC
    else if (isFichaJec(ft) || nNorm.includes('jec') || idNorm.includes('jec') || idNorm.includes('msejec')) {
      autoGrupo = 'Modelo JEC';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) {
        autoNombreCorto = 'Monitoreo a la Implementación del Modelo JEC';
      }
      if (autoOrden === null) {
        autoOrden = 10;
      }
      if (autoTieneVisitas === null) autoTieneVisitas = true;
    }
    // 4. Directivo de IE
    else if (nNorm.includes('directivo') || idNorm.includes('directivo')) {
      autoGrupo = 'EBR';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Directivo de IE';
      if (autoOrden === null) autoOrden = 21;
      if (autoTieneVisitas === null) autoTieneVisitas = false;
    }
    // 5. Rúbricas de observación de aula
    else if (nNorm.includes('rubrica') || idNorm.includes('rubrica') || (nNorm.includes('aula') && nNorm.includes('docente'))) {
      autoGrupo = 'EBR';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Monitoreo a Docentes (EBR-EBA)';
      if (autoOrden === null) autoOrden = 22;
      if (autoTieneVisitas === null) autoTieneVisitas = false;
    }
    // 6. CEBE / PRITE
    else if (isFichaCebeGestion(ft) || nNorm.includes('cebe') || nNorm.includes('prite') || idNorm.includes('cebe') || idNorm.includes('prite')) {
      autoGrupo = 'CEBE / PRITE';
      if (nNorm.includes('material')) {
        if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Materiales educativos (CEBE/PRITE)';
        if (autoOrden === null) autoOrden = 32;
        if (autoTieneVisitas === null) autoTieneVisitas = false;
      } else if (nNorm.includes('lector')) {
        if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Experiencia lectora CEBE 2026';
        if (autoOrden === null) autoOrden = 33;
        if (autoTieneVisitas === null) autoTieneVisitas = true;
      } else if (nNorm.includes('prite')) {
        if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Gestión Escolar PRITE';
        if (autoOrden === null) autoOrden = 31;
        if (autoTieneVisitas === null) autoTieneVisitas = true;
      } else {
        if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Gestión Escolar CEBE';
        if (autoOrden === null) autoOrden = 30;
        if (autoTieneVisitas === null) autoTieneVisitas = true;
      }
      if (isFichaCebeGestion(ft)) {
        ft = { ...ft, secciones: CEBE_SECCIONES, tipoRespuesta: 'ips', escala: 'IPL' };
      } else if (isFichaPriteGestion(ft)) {
        ft = { ...ft, secciones: PRITE_SECCIONES, tipoRespuesta: 'ips', escala: 'IPL' };
      }
    }
    // 7. Gestión Escolar EBR
    else if (isFichaEbrGestionEscolar(ft) || (((nNorm.includes('gestion escolar') || nNorm.includes('gestion')) && (nNorm.includes('ebr') || nNorm.includes('ugel'))) && !nNorm.includes('cebe') && !nNorm.includes('prite')) || (idNorm.includes('ebr') && !idNorm.includes('cebe'))) {
      autoGrupo = 'EBR';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Gestión Escolar EBR';
      if (autoOrden === null) autoOrden = 20;
      if (autoTieneVisitas === null) autoTieneVisitas = true;
    }
  }

  return {
    ...ft,
    grupo: autoGrupo || ft.modalidad || 'Otras fichas',
    nombreCorto: autoNombreCorto || ft.nombre || 'Ficha',
    orden: autoOrden !== null ? autoOrden : 99,
    tieneVisitas: autoTieneVisitas !== null ? autoTieneVisitas : (isFichaEbrGestionEscolar(ft) || hasVisitasInSections)
  };
}

export let consSelectedTypeId = '__ALL__';
export let consFilters = { institucion: '', ugel: '', red: '', estado: '', visita: '', responsable: '', desde: '', hasta: '', distrito: '', tipoGestion: '' };
export let filtrosReporte = { tipo: '__ALL__', visita: '', estado: '', responsable: '', institucion: '', red: '', ugel: '', distrito: '', tipoGestion: '', desde: '', hasta: '' };
export let consExpanded = null; export function setConsExpanded(v) { consExpanded = v; }
export let reportesHideTypes = false; export function setReportesHideTypes(v) { reportesHideTypes = v; }
export let reportesSearchTerm = ''; export function setReportesSearchTerm(v) { reportesSearchTerm = v; }
export let reportesFiltersInitialized = false; export function setReportesFiltersInitialized(v) { reportesFiltersInitialized = v; }
export let currentReportPendingItems = []; export function setCurrentReportPendingItems(v) { currentReportPendingItems = v; }
export let currentReportFt = null; export function setCurrentReportFt(v) { currentReportFt = v; }
export let currentPendingActiveTab = 'ALL'; export function setCurrentPendingActiveTab(v) { currentPendingActiveTab = v; }

// Estado de grupos colapsados/expandidos en Sección 1
// Por defecto los grupos de fichas inician colapsados para mostrar la interfaz limpia (como en la Foto 2)
export let reportesExpandedGroups = new Set();

// Estado de paginación para cuadros estáticos (10 registros por página)
export let pageFichasRegistradas = 1;
export let pageColegiosMonitoreados = 1;
export let pageColegiosPendientes = 1;
export const PAGE_SIZE_CONSOLIDADO = 10;

export let totalPagesFichasGlobal = 1; export function setTotalPagesFichasGlobal(v) { totalPagesFichasGlobal = v; }
export let totalPagesMonitoreadosGlobal = 1; export function setTotalPagesMonitoreadosGlobal(v) { totalPagesMonitoreadosGlobal = v; }
export let totalPagesPendientesGlobal = 1; export function setTotalPagesPendientesGlobal(v) { totalPagesPendientesGlobal = v; }

export function setPageFichasRegistradas(p) { pageFichasRegistradas = p; }
export function setPageColegiosMonitoreados(p) { pageColegiosMonitoreados = p; }
export function setPageColegiosPendientes(p) { pageColegiosPendientes = p; }

export function syncFiltersState(newFilters) {
  filtrosReporte = { ...filtrosReporte, ...newFilters };
  if (filtrosReporte.red) {
    filtrosReporte.red = normalizeReiNumber(filtrosReporte.red) || filtrosReporte.red;
  }
  consSelectedTypeId = filtrosReporte.tipo || '__ALL__';
  consFilters.institucion = filtrosReporte.institucion || '';
  consFilters.ugel = filtrosReporte.ugel || '';
  consFilters.red = filtrosReporte.red || '';
  consFilters.estado = filtrosReporte.estado || '';
  consFilters.visita = filtrosReporte.visita || '';
  consFilters.responsable = filtrosReporte.responsable || '';
  consFilters.desde = filtrosReporte.desde || '';
  consFilters.hasta = filtrosReporte.hasta || '';
  consFilters.distrito = filtrosReporte.distrito || '';
  consFilters.tipoGestion = filtrosReporte.tipoGestion || '';

  // Restablecer paginación a página 1 al cambiar filtros
  pageFichasRegistradas = 1;
  pageColegiosMonitoreados = 1;
  pageColegiosPendientes = 1;
}

export function syncReportesUrl(filters) {
  if (typeof window === 'undefined' || !window.location) return;
  try {
    const url = new URL(window.location.href);
    if (filters.tipo && filters.tipo !== '__ALL__') {
      url.searchParams.set('tipo', filters.tipo);
    } else {
      url.searchParams.set('tipo', 'all');
    }
    const filterKeys = ['visita', 'estado', 'responsable', 'institucion', 'red', 'ugel', 'distrito', 'tipoGestion', 'desde', 'hasta'];
    filterKeys.forEach(k => {
      const val = filters[k];
      const paramName = k === 'tipoGestion' ? 'tipogestion' : (k === 'institucion' ? 'inst' : k);
      if (val && String(val).trim()) {
        url.searchParams.set(paramName, String(val).trim());
      } else {
        url.searchParams.delete(paramName);
      }
    });
    window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
  } catch (e) {
    console.warn('Error sincronizando URL de reportes:', e);
  }
}

export function loadReportesFiltersFromUrl(state) {
  const f = {
    tipo: '__ALL__',
    visita: '',
    estado: '',
    responsable: '',
    institucion: '',
    red: '',
    ugel: '',
    distrito: '',
    tipoGestion: '',
    desde: '',
    hasta: ''
  };
  if (typeof window === 'undefined' || !window.location) return f;
  try {
    const url = new URL(window.location.href);
    const pTipo = url.searchParams.get('tipo');
    if (pTipo) {
      if (pTipo === 'all' || pTipo === '__ALL__') {
        f.tipo = '__ALL__';
      } else if (state.fichaTypes.some(ft => ft.id === pTipo && isFichaActiva(ft))) {
        f.tipo = pTipo;
      }
    } else {
      try {
        const last = sessionStorage.getItem('reportes_last_type');
        if (last && (last === '__ALL__' || state.fichaTypes.some(ft => ft.id === last && isFichaActiva(ft)))) {
          f.tipo = last;
        } else {
          f.tipo = '__ALL__';
        }
      } catch (_) {
        f.tipo = '__ALL__';
      }
    }
    if (url.searchParams.get('visita')) f.visita = url.searchParams.get('visita');
    if (url.searchParams.get('estado')) f.estado = url.searchParams.get('estado');
    if (url.searchParams.get('responsable')) f.responsable = url.searchParams.get('responsable');
    if (url.searchParams.get('inst')) f.institucion = url.searchParams.get('inst');
    else if (url.searchParams.get('institucion')) f.institucion = url.searchParams.get('institucion');
    if (url.searchParams.get('red')) f.red = url.searchParams.get('red');
    if (url.searchParams.get('ugel')) f.ugel = url.searchParams.get('ugel');
    if (url.searchParams.get('distrito')) f.distrito = url.searchParams.get('distrito');
    if (url.searchParams.get('tipogestion')) f.tipoGestion = url.searchParams.get('tipogestion');
    if (url.searchParams.get('desde')) f.desde = url.searchParams.get('desde');
    if (url.searchParams.get('hasta')) f.hasta = url.searchParams.get('hasta');
  } catch (e) {
    console.warn('Error leyendo filtros desde URL:', e);
  }
  return f;
}

/**
 * Extrae un identificador normalizado de la persona evaluada en una ficha
 * (coordinador pedagógico, coordinador de tutoría, docente, directivo, etc.).
 * Esto garantiza que dos evaluaciones a diferentes personas en la misma institución
 * y fecha NUNCA se confundan como envíos duplicados.
 */
function getEvaluatedPersonIdentifier(s) {
  if (!s) return '';
  let iden = s.coordPedagDni || s.coordPedagNombre || s.coordinadorPedagogico ||
    s.coordTutoriaDni || s.coordTutoriaNombre || s.coordinadorTutoria ||
    s.docenteDni || s.docenteNombre || s.docente ||
    s.directorDni || s.director || s.directorNombre ||
    s.personaMonitoreada || s.dniMonitoreado || s.monitoreado || '';
  if (!iden && Array.isArray(s.extras)) {
    const extraP = s.extras.find(e => {
      const k = normalizeText(e?.campo || e?.label || e?.nombre || '');
      return k.includes('coordinador') || k.includes('docente') || k.includes('director') || k.includes('dni');
    });
    if (extraP && extraP.valor) iden = extraP.valor;
  }
  return normalizeText(String(iden || ''));
}

/**
 * Determina si dos registros de envío corresponden a un clon accidental producido
 * por un doble clic concurrente (< 8s) con datos y respuestas exactamente idénticas.
 */
function isAccidentalDoubleSubmit(a, b) {
  if (!a || !b) return false;
  if (a.fichaTypeId !== b.fichaTypeId) return false;

  const aInst = (a.colegioId || normalizeInstName(a.institucion || '')).trim();
  const bInst = (b.colegioId || normalizeInstName(b.institucion || '')).trim();
  if (!aInst || aInst !== bInst) return false;

  if (String(a.visita || 1) !== String(b.visita || 1)) return false;

  const aFecha = (a.fecha || '').trim();
  const bFecha = (b.fecha || '').trim();
  if (!aFecha || aFecha !== bFecha) return false;

  // Si ambos tienen usuario creador y son diferentes, no son gemelos
  if (a.createdBy && b.createdBy && a.createdBy !== b.createdBy) return false;

  // Deben tener timestamp numérico válido > 0 y haberse registrado con diferencia menor a 8 segundos
  const tA = Number(a.createdAt) || 0;
  const tB = Number(b.createdAt) || 0;
  if (tA <= 0 || tB <= 0) return false;
  const timeDiff = Math.abs(tA - tB);
  if (timeDiff > 8000) return false;

  // Si corresponden a distintas personas evaluadas, son evaluaciones distintas y válidas
  const pA = getEvaluatedPersonIdentifier(a);
  const pB = getEvaluatedPersonIdentifier(b);
  if (pA && pB && pA !== pB) return false;

  // Deben tener exactamente el mismo contenido en las respuestas
  const rA = JSON.stringify(a.respuestas || []);
  const rB = JSON.stringify(b.respuestas || []);
  if (rA !== rB) return false;

  return true;
}

/**
 * Deduplica envíos gemelos producidos por doble submit concurrente o duplicidad en memoria.
 * Conserva íntegramente las evaluaciones legítimas de coordinadores, docentes y directivos.
 */
export function deduplicateTwinSubmissions(subsList) {
  if (!subsList || !subsList.length) return [];
  const seenIds = new Set();
  const result = [];

  for (const s of subsList) {
    if (!s) continue;

    // 1. Descartar si es exactamente el mismo documento (mismo ID de Firestore)
    if (s.id) {
      if (seenIds.has(s.id)) continue;
      seenIds.add(s.id);
    }

    // 2. Comprobar si es un clon accidental generado por doble submit concurrente
    let isTwin = false;
    for (let i = 0; i < result.length; i++) {
      if (isAccidentalDoubleSubmit(s, result[i])) {
        isTwin = true;
        // Si el clon nuevo tiene un responsable asignado y el previo no, preservar el más completo
        const prevResp = (result[i].responsable && String(result[i].responsable).trim() !== '—') ? String(result[i].responsable).trim() : '';
        const currResp = (s.responsable && String(s.responsable).trim() !== '—') ? String(s.responsable).trim() : '';
        if (!prevResp && currResp) {
          result[i] = s;
        }
        break;
      }
    }

    if (!isTwin) {
      result.push(s);
    }
  }

  return result;
}

/**
 * Verifica si una institución coincide con la modalidad de la ficha (EBR, JEC, PRITE, CEBE, EBE)
 */
export function isModalityMatch(c, mod) {
  if (!c) return false;
  const m = String(c.modalidad || '').toUpperCase().trim();
  const ie = String(c.ie || c.nombre || '').toUpperCase();
  if (mod === 'JEC') {
    if (c.esJec === true || c.es_jec === true || c.esJEC === true) return true;
    const modJec = String(c.modelo || c.tipoModelo || '').toUpperCase().trim();
    if (m === 'JEC' || m.includes('JEC') || modJec.includes('JEC')) return true;
    return false;
  }
  if (mod === 'EBR') {
    if (m === 'EBR' || m.includes('EBR') || m.includes('REGULAR')) return true;
    if (!m) {
      if (ie.includes('CEBE') || ie.includes('PRITE') || ie.includes('CEBA') || ie.includes('CETPRO')) return false;
      return true;
    }
    return false;
  }
  if (mod === 'PRITE') {
    if (m === 'PRITE' || m.includes('PRITE') || ie.includes('PRITE')) return true;
    return false;
  }
  if (mod === 'CEBE') {
    if (ie.includes('PRITE') || m.includes('PRITE')) return false;
    if (m === 'CEBE' || m.includes('CEBE') || m === 'EBE' || m.includes('EBE') || m.includes('ESPECIAL')) return true;
    if (ie.includes('CEBE') || ie.includes('ESPECIAL')) return true;
    return false;
  }
  if (mod === 'EBE') {
    if (m === 'EBE' || m.includes('EBE') || m.includes('ESPECIAL') || m.includes('CEBE') || m.includes('PRITE')) return true;
    if (ie.includes('CEBE') || ie.includes('PRITE') || ie.includes('ESPECIAL')) return true;
    return false;
  }
  return false;
}

/**
 * Filtra los envíos que corresponden a una ficha específica considerando alias y unificaciones oficiales
 */
export function getSubmissionsForFichaType(submissions, tipoId, targetFt = null) {
  if (!tipoId || tipoId === '__ALL__') return (submissions || []).slice();
  const tid = targetFt ? targetFt.id : tipoId;
  return (submissions || []).filter(s => {
    if (!s) return false;
    if (s.fichaTypeId === tid) return true;
    const isTargetJec = (tid === 'ft_msejec_2do' || tid === 'ft_jec' || tid === 'ft_msejec_1er' || tid === 'ft_msejec_3er' || (targetFt && isFichaJec(targetFt) && !isFichaCoordTutoriaJec(targetFt) && !isFichaCoordPedagogico(targetFt)));
    if (isTargetJec && isFichaJec(s) && !isFichaCoordTutoriaJec(s) && !isFichaCoordPedagogico(s)) {
      return true;
    }
    const isTargetEbr = (tid === 'ft_gestion_ugel03_ebr' || tid === 'ft_ebr_gestion_1er' || tid === 'ft_ebr_gestion' || (targetFt && isFichaEbrGestionEscolar(targetFt)));
    if (isTargetEbr && isFichaEbrGestionEscolar(s)) {
      return true;
    }
    return false;
  });
}

/**
 * Obtiene la etiqueta limpia de estado (Logrado, En proceso, Inicio) para un envío y sus estadísticas
 */
export function getSubmissionStatusClean(s, st, targetFt = null, getFichaType = null) {
  if (!s) return 'Pendiente';
  const sFt = (getFichaType && s?.fichaTypeId ? getFichaType(s.fichaTypeId) : null) || targetFt;
  const isJec = isFichaJec(sFt || targetFt || s) || isFichaCoordTutoriaJec(sFt || targetFt || s) || isFichaCoordPedagogico(sFt || targetFt || s) || isFichaEspecialistaJec(sFt || targetFt || s);
  const isEbr = !isJec && (isFichaEbrGestionEscolar(sFt || targetFt || s)
    || isFichaEbrEbePrite(sFt || targetFt || s)
    || isFichaCebeGestion(sFt || targetFt || s)
    || isFichaPriteGestion(sFt || targetFt || s));

  if (isEbr && st && st.pct !== null) {
    if (st.pct >= 67) return 'Logrado';
    if (st.pct >= 34) return 'En proceso';
    return 'Inicio';
  }
  const v = s ? getMomentoVisitaEbr(s) : undefined;
  let lbl = st?.estado?.label || statusFromPct(st?.pct, sFt, st?.conteo_si, st?.puntaje, v)?.label || '';
  if (lbl === 'Proceso') lbl = 'En proceso';
  return lbl || 'Inicio';
}

/**
 * Obtiene la lista de instituciones sugeridas para el autocompletado en la sección de filtros,
 * aplicando estrictamente y de forma general para cualquier ficha los filtros activos de:
 * - Ficha seleccionada (modalidad: EBR, JEC, CEBE, PRITE, etc.)
 * - Visita / Momento (filtrosReporte.visita)
 * - REI / RED (filtrosReporte.red)
 * - Especialista / Responsable (filtrosReporte.responsable)
 * - Estado de logro (filtrosReporte.estado: Logrado, En proceso, Inicio)
 * - Término de búsqueda escrito por el usuario (nombre, código modular, local, director)
 */
export function getFilteredColegiosForReportesSearch(state, filters, getFichaType, user, rawQuery = '') {
  const f = filters || {};
  const isAllMode = !f.tipo || f.tipo === '__ALL__';
  const targetFt = !isAllMode ? getEnrichedFichaType(getFichaType(f.tipo)) : null;

  // 1. Determinar modalidad según la ficha activa
  const isJecReport = !isAllMode && targetFt && (isFichaJec(targetFt) || isFichaCoordTutoriaJec(targetFt) || isFichaCoordPedagogico(targetFt));
  const isEbrReport = !isAllMode && targetFt && isFichaEbrGestionEscolar(targetFt);
  const isPriteReport = !isAllMode && targetFt && isFichaPriteGestion(targetFt);
  const isCebeReport = !isAllMode && targetFt && isFichaCebeGestion(targetFt);
  const targetModality = isJecReport ? 'JEC' : (isEbrReport ? 'EBR' : (isPriteReport ? 'PRITE' : (isCebeReport ? 'CEBE' : null)));

  // 2. Base de colegios según modalidad del padrón
  const padron = (state?.colegios || []).slice();
  let baseColegios = targetModality ? padron.filter(c => isModalityMatch(c, targetModality)) : padron;

  // Índice para mapear envíos a colegios del padrón
  const colegioIdx = buildColegioIndex(state);
  const knownColegioNames = new Set(baseColegios.map(c => normalizeText(c.ie || c.nombre || '')).filter(Boolean));

  // 3. Submissions de la ficha activa (deduplicadas)
  let fichaSubs = deduplicateTwinSubmissions(getSubmissionsForFichaType(state?.submissions || [], f.tipo, targetFt));
  if (isAllMode && state?.fichaTypes) {
    const activeTypeIds = new Set(state.fichaTypes.filter(isFichaActiva).map(ft => ft.id));
    fichaSubs = fichaSubs.filter(s => activeTypeIds.has(s.fichaTypeId));
  }

  // Incluir en baseColegios aquellas instituciones de envíos que no figuren en el padrón
  fichaSubs.forEach(s => {
    if (!s.institucion) return;
    const norm = normalizeText(s.institucion);
    const matchedCol = matchColegio(s, colegioIdx);
    if (!matchedCol && norm && !knownColegioNames.has(norm)) {
      knownColegioNames.add(norm);
      baseColegios.push({
        id: s.colegioId || s.institucion,
        ie: s.institucion,
        codigoLocal: s.codigoLocal || '',
        codigoModular: s.codigoModular || s.codModular || '',
        red: s.red || s.rei || '',
        rei: s.rei || s.red || '',
        director: { nombre: '' },
        modalidad: targetModality || s.modalidad || ''
      });
    }
  });

  // 4. Mapear envíos de esta ficha por colegio
  const vFilter = f.visita && String(f.visita).trim() && f.visita !== 'ALL' && f.visita !== '__ALL__' ? String(f.visita).trim() : null;

  const colSubsMap = new Map();
  fichaSubs.forEach(s => {
    if (vFilter) {
      const sVis = String(getSubmissionVisitaNum(s, targetFt || getFichaType(s.fichaTypeId)));
      if (sVis !== vFilter) return;
    }

    const matchedCol = matchColegio(s, colegioIdx);
    const colKey = matchedCol ? matchedCol.id : (s.colegioId || s.institucion);
    if (!colKey) return;

    if (!colSubsMap.has(colKey)) colSubsMap.set(colKey, []);

    const sFt = (getFichaType && s.fichaTypeId ? getFichaType(s.fichaTypeId) : null) || targetFt;
    const st = sFt ? computeStats(s, sFt) : { pct: null, secciones: [] };
    const statusLabel = getSubmissionStatusClean(s, st, targetFt, getFichaType);
    const subResp = getSubmissionResponsable(s, state, user);

    colSubsMap.get(colKey).push({ s, st, statusLabel, subResp });
  });

  // 5. Filtros activos
  const filterReiNum = f.red && f.red.trim() ? normalizeReiNumber(f.red) : null;
  const qRed = f.red && f.red.trim() ? normalizeText(f.red.trim()) : null;

  const qResp = f.responsable && f.responsable.trim() ? normalizeText(f.responsable.trim()) : null;
  const targetEst = f.estado && f.estado.trim() ? f.estado.trim() : null;

  // Si el texto escrito es idéntico a la institución ya seleccionada, mostrar todas las opciones que cumplen el filtro
  const isSelectedExact = rawQuery && f.institucion && (rawQuery.trim() === f.institucion.trim());
  const qText = isSelectedExact ? '' : normalizeText(rawQuery.trim());

  const filtered = baseColegios.filter(c => {
    const colKey = c.id || c.ie || c.nombre;
    const subsOfCol = colSubsMap.get(c.id) || colSubsMap.get(colKey) || [];

    // A) FILTRO POR RED / REI
    if (filterReiNum || qRed) {
      const colReiNum = normalizeReiNumber(c.rei || c.red);
      const colRedText = normalizeText(c.rei || c.red || '');
      let redOk = false;
      if (filterReiNum && colReiNum) {
        redOk = (colReiNum === filterReiNum);
      } else if (qRed && colRedText.includes(qRed)) {
        redOk = true;
      } else {
        redOk = subsOfCol.some(item => {
          const sReiNum = normalizeReiNumber(item.s.red || item.s.rei);
          return (filterReiNum && sReiNum) ? (sReiNum === filterReiNum) : (qRed ? normalizeText(item.s.red || item.s.rei || '').includes(qRed) : false);
        });
      }
      if (!redOk) return false;
    }

    // B) FILTRO POR ESPECIALISTA / RESPONSABLE
    if (qResp) {
      const padronResp = normalizeText(getResponsableForColegio(c, state, targetFt) || '');
      const padronOk = padronResp && padronResp.includes(qResp);
      const subOk = subsOfCol.some(item => {
        const sr = normalizeText(item.subResp || '');
        return sr && sr.includes(qResp);
      });
      if (!padronOk && !subOk) return false;
    }

    // C) FILTRO POR ESTADO (Logrado, En proceso, Inicio)
    if (targetEst) {
      const estadoOk = subsOfCol.some(item => {
        const lbl = item.statusLabel;
        if (targetEst === 'En proceso' || targetEst === 'Proceso') {
          return lbl === 'En proceso' || lbl === 'Proceso';
        }
        return lbl === targetEst;
      });
      if (!estadoOk) return false;
    }

    // D) FILTRO POR DISTRITO / TIPO DE GESTIÓN (si existieran)
    if (f.distrito && f.distrito.trim()) {
      if (!normalizeText(c.distrito || '').includes(normalizeText(f.distrito.trim()))) return false;
    }
    if (f.tipoGestion && f.tipoGestion.trim()) {
      if (c.tipoGestion !== f.tipoGestion) return false;
    }

    // E) FILTRO POR TEXTO ESCRITO EN EL BUSCADOR (nombre, código local, modular, director)
    if (qText) {
      const ieName = normalizeText(c.ie || c.nombre || '');
      const codLoc = normalizeText(c.codigoLocal || c.codLocal || '');
      const codMod = normalizeText(c.codigoModular || c.codModular || '');
      const colRedStr = normalizeText(c.rei || c.red || '');
      const dirName = normalizeText((c.director && typeof c.director === 'object') ? (c.director.nombre || '') : (typeof c.director === 'string' ? c.director : ''));
      const textOk = ieName.includes(qText) || codLoc.includes(qText) || codMod.includes(qText) || colRedStr.includes(qText) || dirName.includes(qText);
      if (!textOk) return false;
    }

    return true;
  });

  // 6. Enriquecer los resultados con información de estado y responsable
  const results = filtered.map(c => {
    const colKey = c.id || c.ie || c.nombre;
    const subsOfCol = colSubsMap.get(c.id) || colSubsMap.get(colKey) || [];

    let status = 'Pendiente';
    let pct = null;
    let respName = '';

    if (subsOfCol.length > 0) {
      const matchedItem = targetEst
        ? subsOfCol.find(it => (targetEst === 'En proceso' || targetEst === 'Proceso') ? (it.statusLabel === 'En proceso' || it.statusLabel === 'Proceso') : (it.statusLabel === targetEst)) || subsOfCol[0]
        : subsOfCol[0];
      status = matchedItem.statusLabel;
      pct = matchedItem.st?.pct ?? null;
      respName = matchedItem.subResp || '';
    }

    if (!respName || respName === '—') {
      respName = getResponsableForColegio(c, state, targetFt);
    }

    return {
      colegio: c,
      status,
      pct,
      respName: respName && respName !== '—' ? respName : '',
      subsCount: subsOfCol.length
    };
  });

  results.sort((a, b) => (a.colegio.ie || a.colegio.nombre || '').localeCompare(b.colegio.ie || b.colegio.nombre || ''));

  return results;
}

export function aplicarFiltrosReporte(submissions, filters, state, getFichaType, user = null) {
  const f = filters || {};
  const isAllMode = !f.tipo || f.tipo === '__ALL__';
  const targetFt = !isAllMode ? getEnrichedFichaType(getFichaType(f.tipo)) : null;

  let subs = getSubmissionsForFichaType(submissions, f.tipo, targetFt);

  // Si estamos en avance general (todas las fichas), considerar únicamente envíos de fichas activas
  if (isAllMode && state?.fichaTypes) {
    const activeTypeIds = new Set(state.fichaTypes.filter(isFichaActiva).map(ft => ft.id));
    subs = subs.filter(s => activeTypeIds.has(s.fichaTypeId));
  }

  // Deduplicación defensiva en memoria contra envíos dobles idénticos
  subs = deduplicateTwinSubmissions(subs);

  // 2. Institución (nombre o código modular / local)
  if (f.institucion && f.institucion.trim()) {
    const q = normalizeText(f.institucion.trim());
    subs = subs.filter(s => {
      const instName = normalizeText(s.institucion || '');
      const codMod = normalizeText(s.codigoModular || s.codModular || s.cod_mod || '');
      const codLoc = normalizeText(s.codigoLocal || s.codLocal || s.cod_local || '');
      return instName.includes(q) || codMod.includes(q) || codLoc.includes(q);
    });
  }

  // 3. UGEL
  if (f.ugel && f.ugel.trim()) {
    const q = normalizeText(f.ugel.trim());
    subs = subs.filter(s => normalizeText(s.ugel || 'UGEL 03').includes(q));
  }

  // Índice de colegios para cruzar RED, distrito y tipo de gestión
  const colegioIdx = buildColegioIndex(state);

  // 4. RED
  if (f.red && f.red.trim()) {
    const filterReiNum = normalizeReiNumber(f.red);
    const q = normalizeText(f.red.trim());
    subs = subs.filter(s => {
      const subReiNum = normalizeReiNumber(s.red || s.rei);
      if (filterReiNum && subReiNum) {
        return subReiNum === filterReiNum;
      }
      if (subReiNum && !filterReiNum) {
        return normalizeText(s.red || s.rei || '').includes(q);
      }
      // Fallback: verificar a través del colegio vinculado en el padrón
      const col = matchColegio(s, colegioIdx);
      if (col) {
        const colReiNum = normalizeReiNumber(col.rei || col.red);
        if (filterReiNum && colReiNum) {
          return colReiNum === filterReiNum;
        }
        if (normalizeText(col.rei || col.red || '').includes(q)) return true;
      }
      return normalizeText(s.red || '').includes(q);
    });
  }

  // 5. Visita / Momento
  if (f.visita && String(f.visita).trim() && f.visita !== 'ALL' && f.visita !== '__ALL__') {
    const vStr = String(f.visita).trim();
    subs = subs.filter(s => {
      const vNum = getSubmissionVisitaNum(s, targetFt || getFichaType(s.fichaTypeId));
      return String(vNum) === vStr;
    });
  }

  // 6. Responsable
  if (f.responsable && f.responsable.trim()) {
    const q = normalizeText(f.responsable.trim());
    subs = subs.filter(s => {
      const respName = normalizeText(getSubmissionResponsable(s, state, user));
      return respName.includes(q);
    });
  }

  // 7. Fechas (Desde / Hasta) con validación
  const hasInvalidDates = Boolean(f.desde && f.hasta && f.desde > f.hasta);
  if (!hasInvalidDates) {
    if (f.desde) subs = subs.filter(s => (s.fecha || '') >= f.desde);
    if (f.hasta) subs = subs.filter(s => (s.fecha || '') <= f.hasta);
  }

  // 8. Distrito y Tipo de Gestión (mediante colegios)
  if (f.distrito && f.distrito.trim()) {
    const q = normalizeText(f.distrito.trim());
    subs = subs.filter(s => {
      const col = matchColegio(s, colegioIdx);
      return normalizeText((col && col.distrito) || '').includes(q);
    });
  }
  if (f.tipoGestion && f.tipoGestion.trim()) {
    subs = subs.filter(s => {
      const col = matchColegio(s, colegioIdx);
      return (col && col.tipoGestion) === f.tipoGestion;
    });
  }

  subs.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt || 0) - (a.createdAt || 0));

  let statsList = subs.map(s => {
    const sFt = getFichaType(s.fichaTypeId) || targetFt;
    return { s, st: sFt ? computeStats(s, sFt) : { pct: null, secciones: [] } };
  });

  // 9. Estado
  if (f.estado && f.estado.trim()) {
    const est = f.estado.trim();
    statsList = statsList.filter(x => {
      const sFt = getFichaType(x.s.fichaTypeId) || targetFt;
      const escalaRaw = String(sFt?.escala || targetFt?.escala || x.s?.escala || '').toUpperCase();
      const tipoRespRaw = String(sFt?.tipoRespuesta || targetFt?.tipoRespuesta || x.s?.tipoRespuesta || '').toLowerCase();
      const isSiNo = (tipoRespRaw === 'si_no' || escalaRaw === 'SI_NO' || escalaRaw === 'SI_NO_NA' || tipoRespRaw.includes('si_no') || escalaRaw.includes('SI_NO'));
      const isJec = isFichaJec(sFt || targetFt || x.s) || isFichaCoordTutoriaJec(sFt || targetFt || x.s) || isFichaCoordPedagogico(sFt || targetFt || x.s) || isFichaEspecialistaJec(sFt || targetFt || x.s);
      const isEbr = !isJec && !isSiNo && (isFichaEbrGestionEscolar(sFt || targetFt || x.s)
        || isFichaEbrEbePrite(sFt || targetFt || x.s)
        || isFichaCebeGestion(sFt || targetFt || x.s)
        || isFichaPriteGestion(sFt || targetFt || x.s));
      let lbl = '';
      let pnl = '';
      if (isEbr && x.st && x.st.pct !== null) {
        if (x.st.pct >= 67) { lbl = 'Logrado'; pnl = 'Logrado'; }
        else if (x.st.pct >= 34) { lbl = 'Proceso'; pnl = 'En proceso'; }
        else { lbl = 'Inicio'; pnl = 'Inicio'; }
      } else {
        const v = x.s ? getMomentoVisitaEbr(x.s) : undefined;
        lbl = x.st?.estado?.label || statusFromPct(x.st?.pct, sFt, x.st?.conteo_si, x.st?.puntaje, v).label;
        pnl = x.st?.estado?.estado_panel || '';
      }
      return lbl === est || pnl === est || (est === 'En proceso' && (lbl === 'Proceso' || pnl === 'En proceso')) || (est === 'Proceso' && (lbl === 'Proceso' || pnl === 'En proceso'));
    });
    subs = statsList.map(x => x.s);
  }

  const withPct = statsList.filter(x => x.st.pct !== null);
  const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : null;
  const instCount = new Set(statsList.map(x => {
    const normInst = normalizeInstName(x.s.institucion || '');
    const normUgel = normalizeText(x.s.ugel || 'UGEL 03');
    return x.s.colegioId ? ('col_' + x.s.colegioId) : (normInst + '|' + normUgel);
  })).size;

  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    const sFt = getFichaType(x.s.fichaTypeId) || targetFt;
    const escalaRaw = String(sFt?.escala || targetFt?.escala || x.s?.escala || '').toUpperCase();
    const tipoRespRaw = String(sFt?.tipoRespuesta || targetFt?.tipoRespuesta || x.s?.tipoRespuesta || '').toLowerCase();
    const isSiNo = (tipoRespRaw === 'si_no' || escalaRaw === 'SI_NO' || escalaRaw === 'SI_NO_NA' || tipoRespRaw.includes('si_no') || escalaRaw.includes('SI_NO'));
    const isJec = isFichaJec(sFt || targetFt || x.s) || isFichaCoordTutoriaJec(sFt || targetFt || x.s) || isFichaCoordPedagogico(sFt || targetFt || x.s) || isFichaEspecialistaJec(sFt || targetFt || x.s);
    const isEbr = !isJec && !isSiNo && (isFichaEbrGestionEscolar(sFt || targetFt || x.s)
      || isFichaEbrEbePrite(sFt || targetFt || x.s)
      || isFichaCebeGestion(sFt || targetFt || x.s)
      || isFichaPriteGestion(sFt || targetFt || x.s)
      || (sFt?.tipoRespuesta === 'ips')
      || (sFt?.escala === 'IPL')
      || (targetFt?.tipoRespuesta === 'ips')
      || (targetFt?.escala === 'IPL'));
    let l = '';
    if (x.st && x.st.estado && (x.st.estado.estado_panel || x.st.estado.label)) {
      l = String(x.st.estado.estado_panel || x.st.estado.label).toLowerCase();
    } else if (isEbr && x.st && x.st.pct !== null) {
      l = x.st.pct >= 67 ? 'logrado' : (x.st.pct >= 34 ? 'proceso' : 'inicio');
    } else {
      const v = x.s ? getMomentoVisitaEbr(x.s) : undefined;
      l = (statusFromPct(x.st?.pct, sFt, x.st?.conteo_si, x.st?.puntaje, v).label || '').toLowerCase();
    }
    if (l.includes('no cumple') || l.includes('inici') || l.includes('incipient') || l.includes('mejorar')) dist.inicio++;
    else if (l.includes('parcial') || l.includes('proces')) dist.proceso++;
    else if (l.includes('lograd') || l.includes('cumple')) dist.logrado++;
    else if (x.st && x.st.pct !== null) {
      if (x.st.pct >= 67) dist.logrado++;
      else if (x.st.pct >= 34) dist.proceso++;
      else dist.inicio++;
    } else {
      dist.none++;
    }
  });

  return { subs, statsList, instCount, avgPct, dist, withPct, targetFt, isAllMode, hasInvalidDates };
}

export function countFichasForCard(typeId, submissions, filters, state, getFichaType, user) {
  const filterCopy = { ...filters, tipo: typeId };
  // Al calcular el conteo de cada tarjeta en el catálogo de fichas (Sección 1),
  // se respetan los filtros generales (institución, RED, fechas, responsable),
  // pero NUNCA se debe arrastrar el filtro de 'visita' de una ficha particular previamente activa.
  delete filterCopy.visita;
  const res = aplicarFiltrosReporte(submissions, filterCopy, state, getFichaType, user);
  return res.subs.length;
}

export function getPeriodoFechas(tipo) {
  const now = new Date();
  const y = now.getFullYear();
  if (tipo === 'mes') {
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
    return { desde: `${y}-${m}-01`, hasta: `${y}-${m}-${String(lastDay).padStart(2, '0')}` };
  } else if (tipo === 'trimestre') {
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3 + 1;
    const qEndMonth = qStartMonth + 2;
    const lastDayQ = new Date(y, qEndMonth, 0).getDate();
    return {
      desde: `${y}-${String(qStartMonth).padStart(2, '0')}-01`,
      hasta: `${y}-${String(qEndMonth).padStart(2, '0')}-${String(lastDayQ).padStart(2, '0')}`
    };
  } else if (tipo === 'anio') {
    return { desde: '2026-01-01', hasta: '2026-12-31' };
  }
  return { desde: '', hasta: '' };
}

export function renderSection1Html(state, getFichaType, user) {
  const isCollapsed = reportesHideTypes;
  const isAllMode = !filtrosReporte.tipo || filtrosReporte.tipo === '__ALL__';
  const selectedFt = !isAllMode ? getEnrichedFichaType(getFichaType(filtrosReporte.tipo)) : null;
  const selectedShortName = isAllMode ? 'Todas las fichas' : (selectedFt ? selectedFt.nombreCorto : '—');
  const selectedCount = countFichasForCard(filtrosReporte.tipo || '__ALL__', state.submissions, filtrosReporte, state, getFichaType, user);

  if (isCollapsed) {
    return `
      <div class="secHeaderFlex" style="margin-bottom:0">
        <div class="secTitleWrap">
          <span class="secStepBadge">1</span>
          <h3 class="secTitleText">Tipo de ficha</h3>
        </div>
        <button type="button" class="btnToggleTipos" id="btnToggleTipos" title="Mostrar sección de tipos">Mostrar tipos ▼</button>
      </div>
      <div class="fichaTypeCollapsed" style="margin-top:10px">
        <div>Tipo de ficha: <strong>${esc(selectedShortName)}</strong> · <span class="badge st-none" style="font-size:11px">${selectedCount} fichas</span></div>
        <button type="button" class="btnCambiarTipoFicha" id="btnExpandirTipos">Cambiar</button>
      </div>
    `;
  }

  const groupOrder = ['Avance general', 'Modelo JEC', 'JEC', 'EBR', 'CEBE / PRITE', 'PRONOEI'];
  const groupsMap = {};
  groupOrder.forEach(g => { groupsMap[g] = []; });

  const allCardCount = countFichasForCard('__ALL__', state.submissions, filtrosReporte, state, getFichaType, user);
  groupsMap['Avance general'].push({
    id: '__ALL__',
    nombreCorto: '📊 Todas las fichas',
    nombre: 'Todas las fichas (avance general)',
    grupo: 'Avance general',
    orden: 1,
    tieneVisitas: false,
    count: allCardCount,
    isSelected: isAllMode
  });

  const seenJecUnified = new Set();
  const seenEbrUnified = new Set();
  const activeFichaTypes = (state.fichaTypes || []).filter(isFichaActiva);

  activeFichaTypes.forEach(rawFt => {
    const ft = getEnrichedFichaType(rawFt);
    const gName = ft.grupo || 'Otras fichas';
    if (!groupsMap[gName]) groupsMap[gName] = [];

    // Ficha unificada de Implementación JEC: consolidar en una sola tarjeta en el catálogo
    if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
      if (seenJecUnified.has(gName)) return;
      seenJecUnified.add(gName);

      const count = countFichasForCard('ft_msejec_2do', state.submissions, filtrosReporte, state, getFichaType, user);
      const isSelected = !isAllMode && (
        filtrosReporte.tipo === 'ft_msejec_2do' ||
        filtrosReporte.tipo === 'ft_jec' ||
        filtrosReporte.tipo === 'ft_msejec_1er' ||
        filtrosReporte.tipo === 'ft_msejec_3er'
      );

      groupsMap[gName].push({
        id: 'ft_msejec_2do',
        nombre: 'Monitoreo a la Implementación del Modelo JEC',
        nombreCorto: 'Monitoreo a la Implementación del Modelo JEC',
        grupo: 'Modelo JEC',
        orden: 10,
        tieneVisitas: true,
        count,
        isSelected
      });
      return;
    }

    // Ficha unificada de Gestión Escolar EBR: consolidar en una sola tarjeta canónica con sus 3 visitas
    if (isFichaEbrGestionEscolar(ft)) {
      const ebrGroup = 'EBR';
      if (!groupsMap[ebrGroup]) groupsMap[ebrGroup] = [];
      if (seenEbrUnified.has(ebrGroup)) return;
      seenEbrUnified.add(ebrGroup);

      const count = countFichasForCard('ft_gestion_ugel03_ebr', state.submissions, filtrosReporte, state, getFichaType, user);
      const isSelected = !isAllMode && (
        filtrosReporte.tipo === 'ft_gestion_ugel03_ebr' ||
        filtrosReporte.tipo === 'ft_ebr_gestion' ||
        filtrosReporte.tipo === 'ft_ebr_gestion_1er' ||
        filtrosReporte.tipo === 'ft_ebr_gestion_2do' ||
        filtrosReporte.tipo === 'ft_ebr_gestion_3er' ||
        isFichaEbrGestionEscolar({ id: filtrosReporte.tipo })
      );

      groupsMap[ebrGroup].push({
        id: 'ft_gestion_ugel03_ebr',
        nombre: 'Monitoreo y Asistencia Técnica a la Gestión Escolar - UGEL 03 EBR',
        nombreCorto: 'Gestión Escolar EBR',
        grupo: 'EBR',
        orden: 20,
        tieneVisitas: true,
        count,
        isSelected
      });
      return;
    }

    const count = countFichasForCard(ft.id, state.submissions, filtrosReporte, state, getFichaType, user);
    groupsMap[gName].push({
      ...ft,
      count,
      isSelected: !isAllMode && (ft.id === filtrosReporte.tipo)
    });
  });

  let groupsHtml = '';
  const allGroupKeys = Object.keys(groupsMap).filter(k => groupsMap[k].length > 0);
  allGroupKeys.sort((a, b) => {
    const idxA = groupOrder.indexOf(a);
    const idxB = groupOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b, 'es', { sensitivity: 'base' });
  });

  allGroupKeys.forEach(gName => {
    const cards = groupsMap[gName];
    cards.sort((a, b) => (a.orden || 99) - (b.orden || 99) || (a.nombreCorto || '').localeCompare(b.nombreCorto || ''));

    const totalGroupFichas = cards.reduce((sum, c) => sum + (c.count || 0), 0);
    // Los grupos inician colapsados por defecto para mostrar la interfaz limpia (como en la Foto 2)
    const isExpanded = reportesExpandedGroups.has(gName);

    const cardsHtml = cards.map(c => {
      const isZero = c.count === 0;
      return `
        <div class="fichaTypeItem fichaTypeCard ${c.isSelected ? 'isSelected' : ''} ${isZero ? 'isZero' : ''}"
             data-type-id="${esc(c.id)}"
             data-nombre-corto="${esc(c.nombreCorto)}"
             data-nombre-completo="${esc(c.nombre)}"
             role="radio"
             aria-checked="${c.isSelected ? 'true' : 'false'}"
             tabindex="${c.isSelected ? '0' : '-1'}"
             title="${esc(c.nombre)}"
             aria-label="${esc(c.nombre)} (${c.count} fichas)">
          <div class="fItemLeft">
            <span class="fItemRadio ${c.isSelected ? 'checked' : ''}" aria-hidden="true">
              ${c.isSelected ? '●' : '◀'}
            </span>
            <span class="fItemShortName"><strong>${esc(c.nombreCorto)}</strong></span>
          </div>
          <div class="fItemRight">
            ${c.tieneVisitas ? '<span class="badgeVisitaCompact badgeVisitas" title="Esta ficha trabaja por visitas (V1, V2, V3)">Visitas</span>' : ''}
            <span class="fItemCount ${isZero ? 'countZero' : 'countHas'}">${c.count} fichas</span>
            ${c.isSelected ? '<span class="fItemCheckIcon" aria-hidden="true">✓</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    groupsHtml += `
      <div class="fichaGroupSection" data-group-name="${esc(gName)}">
        <button type="button" class="fichaGroupToggleBtn ${isExpanded ? 'isExpanded' : ''}"
                data-group-toggle="${esc(gName)}"
                aria-expanded="${isExpanded ? 'true' : 'false'}"
                title="${isExpanded ? 'Ocultar fichas de ' + esc(gName) : 'Visualizar fichas de ' + esc(gName)}">
          <span class="groupToggleLeft">
            <span class="groupToggleChevron" aria-hidden="true">${isExpanded ? '▼' : '▶'}</span>
            <span class="groupToggleTitle">${esc(gName)}</span>
            <span class="groupToggleBadge">${cards.length} ${cards.length === 1 ? 'tipo' : 'tipos'} · ${totalGroupFichas} fichas</span>
          </span>
          <span class="groupToggleDivider"></span>
          <span class="groupToggleAction">${isExpanded ? 'Ocultar fichas ▲' : 'Ver fichas ▼'}</span>
        </button>
        <div class="fichaTypeList fichaCardGrid" role="radiogroup" aria-label="Tipos de ficha en ${esc(gName)}" style="${isExpanded ? 'display:flex;' : 'display:none;'}">
          ${cardsHtml}
        </div>
      </div>
    `;
  });

  const hiddenSelectOpts = '<option value="__ALL__"' + (isAllMode ? ' selected' : '') + '>📊 Todas las fichas (avance general)</option>' +
    activeFichaTypes.map(ft => '<option value="' + ft.id + '"' + (ft.id === filtrosReporte.tipo ? ' selected' : '') + '>' + esc(ft.nombre) + '</option>').join('');

  return `
    <select id="consSelect" style="display:none" aria-hidden="true">${hiddenSelectOpts}</select>
    <div class="secHeaderFlex">
      <div class="secTitleWrap">
        <span class="secStepBadge">1</span>
        <h3 class="secTitleText">Tipo de ficha</h3>
      </div>
      <button type="button" class="btnToggleTipos" id="btnToggleTipos" title="Ocultar sección de tipos">Ocultar tipos ▲</button>
    </div>
    <div class="searchFichaBox">
      <span class="searchIcon">🔍</span>
      <input type="search" id="searchFichaType" placeholder="Buscar tipo de ficha…" value="${esc(reportesSearchTerm)}" autocomplete="off">
    </div>
    <div id="fichaGroupsContainer">
      ${groupsHtml}
      <div id="noFichaMatches" class="noFichaMatches" style="display:none">No hay tipos de ficha con ese nombre</div>
    </div>
  `;
}

export function renderSection2Html(statsList, instCount, state, getFichaType, user, isAdmin) {
  const isAllMode = !filtrosReporte.tipo || filtrosReporte.tipo === '__ALL__';
  const ft = !isAllMode ? getEnrichedFichaType(getFichaType(filtrosReporte.tipo)) : null;
  const isEbr = ft && isFichaEbrGestionEscolar(ft);
  const isCebe = ft && isFichaCebeGestion(ft);
  const isPrite = ft && isFichaPriteGestion(ft);
  const isJecReport = ft && (isFichaJec(ft) || isFichaCoordTutoriaJec(ft) || isFichaCoordPedagogico(ft));
  const selectedShortName = isAllMode ? 'Todas las fichas' : (ft ? ft.nombreCorto : '—');

  let visitaSelectHtml = '';
  if (isJecReport) {
    visitaSelectHtml = renderJecVisitaSelectHtml(ft, filtrosReporte.visita);
  } else if (isEbr) {
    visitaSelectHtml = `
      <select id="fil_visita" required>
        <option value="">— Elige Visita (obligatorio) —</option>
        <option value="1"${String(filtrosReporte.visita) === '1' ? ' selected' : ''}>Visita 1 · Primer momento</option>
        <option value="2"${String(filtrosReporte.visita) === '2' ? ' selected' : ''}>Visita 2 · Segundo momento</option>
        <option value="3"${String(filtrosReporte.visita) === '3' ? ' selected' : ''}>Visita 3 · Tercer momento (Balance)</option>
      </select>
    `;
  } else if (!isAllMode && ft && (isCebe || isPrite)) {
    visitaSelectHtml = `
      <select id="fil_visita" required>
        <option value="">— Elige Visita (obligatorio) —</option>
        <option value="1"${String(filtrosReporte.visita) === '1' ? ' selected' : ''}>Visita 1 · Primer momento</option>
        <option value="2"${String(filtrosReporte.visita) === '2' ? ' selected' : ''}>Visita 2 · Segundo momento</option>
        <option value="3"${String(filtrosReporte.visita) === '3' ? ' selected' : ''}>Visita 3 · Tercer momento</option>
      </select>
    `;
  } else if (!isAllMode && ft && ft.tieneVisitas) {
    const subsForVisitas = state.submissions.filter(s => s.fichaTypeId === ft.id);
    const visitaSet = new Set(subsForVisitas.map(s => Number(s.visita)).filter(Boolean));
    if (visitaSet.size === 0) [1, 2, 3].forEach(v => visitaSet.add(v));
    const visitaOptions = Array.from(visitaSet).sort((a, b) => a - b);
    visitaSelectHtml = `
      <select id="fil_visita">
        <option value="">Todas</option>
        ${visitaOptions.map(v => `<option value="${v}"${String(v) === String(filtrosReporte.visita) ? ' selected' : ''}>Visita ${v}</option>`).join('')}
      </select>
    `;
  } else {
    visitaSelectHtml = `
      <select id="fil_visita" disabled title="Esta ficha no trabaja por visitas">
        <option value="">No aplica</option>
      </select>
    `;
  }

  const respSet = new Set();
  respSet.add(ESPECIALISTA_JEC_OFICIAL.nombresApellidos);
  (state.responsables || []).forEach(r => {
    if (r.nombresApellidos) respSet.add(r.nombresApellidos.trim());
  });
  const responsableOptions = Array.from(respSet).sort((a, b) => a.localeCompare(b));

  // REI oficial de UGEL 03: números del 01 al 16 sin prefijo "REI"
  const standardReis = Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));
  const redSet = new Set(standardReis);
  (state.submissions || []).forEach(s => {
    const num = normalizeReiNumber(s.red || s.rei);
    if (num) redSet.add(num);
  });
  (state.colegios || []).forEach(c => {
    const num = normalizeReiNumber(c.red || c.rei);
    if (num) redSet.add(num);
  });
  const redOptions = Array.from(redSet).sort((a, b) => Number(a) - Number(b));

  const activeChips = [];
  if (filtrosReporte.visita) activeChips.push({ key: 'visita', label: `Visita ${filtrosReporte.visita}` });
  if (filtrosReporte.estado) activeChips.push({ key: 'estado', label: `Estado: ${filtrosReporte.estado}` });
  if (filtrosReporte.responsable) activeChips.push({ key: 'responsable', label: `Resp: ${filtrosReporte.responsable}` });
  if (filtrosReporte.institucion) activeChips.push({ key: 'institucion', label: `IE: ${filtrosReporte.institucion}` });
  if (filtrosReporte.red) {
    const rLabel = normalizeReiNumber(filtrosReporte.red) || filtrosReporte.red;
    activeChips.push({ key: 'red', label: `RED: ${rLabel}` });
  }

  const hasAnyFilter = activeChips.length > 0;
  const chipsHtml = activeChips.map(ch => `
    <span class="filterChip">
      ${esc(ch.label)}
      <button type="button" data-clear-filter="${esc(ch.key)}" title="Quitar filtro ${esc(ch.label)}">×</button>
    </span>
  `).join('');

  const isEbrSinVisita = isEbr && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
  const isCebeSinVisita = isCebe && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
  const isPriteSinVisita = isPrite && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
  const isGestionSinVisita = isEbrSinVisita || isCebeSinVisita || isPriteSinVisita;

  const msgVisitaObligatoria = (isEbr || isCebe || isPrite)
    ? 'Elige Visita 1, Visita 2 o Visita 3. Cada visita se analiza y descarga por separado.'
    : 'Elige una visita válida para esta ficha.';

  const isZeroSubmissions = statsList.length === 0;
  const downloadDisabled = isZeroSubmissions || isGestionSinVisita;
  const downloadDisabledTitle = isGestionSinVisita
    ? msgVisitaObligatoria
    : (isZeroSubmissions ? 'No hay fichas con los filtros activos' : '');

  const bannerEbrHtml = isGestionSinVisita ? `
    <div style="background:#FFF3CD;border:1px solid #FFEEBA;color:#856404;padding:10px 14px;border-radius:6px;font-size:12.5px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
      <span>⚠️</span> <span><strong>Atención:</strong> ${msgVisitaObligatoria}</span>
    </div>
  ` : '';

  const dateErrorHtml = (filtrosReporte.desde && filtrosReporte.hasta && filtrosReporte.desde > filtrosReporte.hasta)
    ? `<div class="dateRangeError" style="margin-bottom:12px">⚠️ La fecha 'Desde' no puede ser posterior a 'Hasta'.</div>`
    : '';

  return `
    <div class="secHeaderFlex">
      <div class="secTitleWrap">
        <span class="secStepBadge">2</span>
        <h3 class="secTitleText">Filtros y descargas</h3>
      </div>
      <div class="selectedFichaIndicator">
        <span>Ficha:</span> <strong>${esc(selectedShortName)}</strong>
        <button type="button" class="btnCambiarFichaLink" id="btnCambiarFichaLink" title="Cambiar tipo de ficha">Cambiar</button>
      </div>
    </div>

    ${bannerEbrHtml}
    ${dateErrorHtml}

    <div class="filtersSubgroupsGrid">
      <!-- 1. Ficha y momento -->
      <div class="filterSubgroup">
        <div class="filterSubgroupTitle">
          <span class="subgroupIcon">🏷️</span>
          <span>Ficha y Momento</span>
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fil_visita">Visita / Momento ${(isEbr || isCebe) ? '<span style="color:var(--danger,#dc2626)" title="Obligatorio para esta ficha">*</span>' : ''}</label>
          ${visitaSelectHtml}
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fil_responsable">Especialista Responsable</label>
          <input type="search" id="fil_responsable" list="dl_fil_responsable" value="${esc(filtrosReporte.responsable)}" placeholder="Buscar especialista..." autocomplete="off">
          <datalist id="dl_fil_responsable">
            ${responsableOptions.map(r => `<option value="${esc(r)}">`).join('')}
          </datalist>
        </div>
      </div>

      <!-- 2. Institución y Estado -->
      <div class="filterSubgroup">
        <div class="filterSubgroupTitle">
          <span class="subgroupIcon">🏫</span>
          <span>Institución y Estado</span>
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fil_inst">Institución Educativa / Código</label>
          <div class="ieSearchWrap" id="reportIeSearchWrap">
            <input type="text" id="fil_inst" value="${esc(filtrosReporte.institucion)}" placeholder="Buscar por nombre o código modular..." autocomplete="off">
            <div class="ieDropdown" id="fil_inst_dropdown"></div>
          </div>
        </div>
        <div class="subgroupRowFields">
          <div class="field" style="flex:1;margin-bottom:0">
            <label for="fil_red">RED (REI)</label>
            <select id="fil_red">
              <option value="">Todas</option>
              ${redOptions.map(r => {
    const isSel = (r === filtrosReporte.red) || (normalizeReiNumber(filtrosReporte.red) === r);
    return `<option value="${esc(r)}"${isSel ? ' selected' : ''}>RED ${esc(r)}</option>`;
  }).join('')}
            </select>
          </div>
          <div class="field" style="flex:1;margin-bottom:0">
            <label for="fil_estado">Estado</label>
            <select id="fil_estado">
              <option value="">Todos</option>
              ${['Logrado', 'En proceso', 'Inicio'].map(v => `<option value="${v}"${v === filtrosReporte.estado ? ' selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- Campos ocultos de compatibilidad para sincronización -->
    <div style="display:none" aria-hidden="true">
      <input type="text" id="fil_ugel" value="${esc(filtrosReporte.ugel || '')}">
      <input type="date" id="fil_desde" value="${esc(filtrosReporte.desde || '')}">
      <input type="date" id="fil_hasta" value="${esc(filtrosReporte.hasta || '')}">
    </div>

    <!-- Fila de filtros activos -->
    <div class="activeFiltersRow">
      <span class="activeFiltersTitle">Filtros activos:</span>
      <div class="activeChipsContainer">
        ${chipsHtml || '<span class="noFiltersActiveText">Ningún filtro adicional</span>'}
      </div>
      ${hasAnyFilter ? '<button type="button" class="btnClearAllFilters" id="btnClearAllFilters" title="Restablecer filtros">↺ Limpiar filtros</button>' : ''}
    </div>

    <div class="filtersSummaryLine">
      <span style="font-size:14px">📊</span>
      <span><strong>${statsList.length} fichas · ${instCount} instituciones</strong> con los filtros activos</span>
    </div>

    <!-- Barra de descargas unificada (estática al pie del panel) -->
    <div class="downloadActionBar" id="downloadActionBar">
      <div class="downloadSummaryHelp">
        <span>Se descargarán <strong>${statsList.length}</strong> fichas con los filtros activos.</span>
      </div>
      <div class="downloadButtonsWrap">
        <button type="button" class="btnDownloadAction btnExcel" id="exportExcel"
                ${downloadDisabled ? 'disabled' : ''}
                title="${esc(downloadDisabledTitle)}">
          <span class="ic">📊</span> Exportar Excel
        </button>
        <button type="button" class="btnDownloadAction btnPdf" id="exportPdf"
                ${downloadDisabled ? 'disabled' : ''}
                title="${esc(downloadDisabledTitle)}">
          <span class="ic">📥</span> Reporte Oficial (PDF)
        </button>
        <button type="button" class="btnDownloadAction btnClearFiltersAction" id="btnBottomClearFilters"
                title="Restablecer todos los filtros de búsqueda">
          <span class="ic">↺</span> Limpiar filtros
        </button>
      </div>
    </div>
  `;
}

export function updateStickyReportesBar(statsList, getFichaType) {
  const bar = document.getElementById('stickyReportesBar');
  if (!bar) return;
  const isAllMode = !filtrosReporte.tipo || filtrosReporte.tipo === '__ALL__';
  const ft = !isAllMode ? getEnrichedFichaType(getFichaType(filtrosReporte.tipo)) : null;
  const shortName = isAllMode ? 'Todas las fichas' : (ft ? ft.nombreCorto : '—');
  const isEbr = ft && isFichaEbrGestionEscolar(ft);
  const isCebe = ft && isFichaCebeGestion(ft);
  const isPrite = ft && isFichaPriteGestion(ft);
  const isGestionSinVisita = ((isEbr || isCebe || isPrite) && (!['1', '2', '3'].includes(String(filtrosReporte.visita))));
  const isZero = statsList.length === 0;
  const disabled = isZero || isGestionSinVisita;

  bar.innerHTML = `
    <div class="stickyReportesInfo">
      <button type="button" class="btn btnFiltrosDrawerTrigger small" id="btnStickyAjustar" title="Abrir opciones de tipo de ficha y filtros">
        <span style="font-size:13px">⚙️</span>
        <span>Filtros y Fichas</span>
      </button>
      <span>·</span>
      <span>Tipo: <strong>${esc(shortName)}</strong></span>
      <span>·</span>
      <span>${statsList.length} fichas</span>
    </div>
    <div class="stickyReportesActions">
      <button type="button" class="stickyBtnExcel" id="stickyExportExcel" ${disabled ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>📊 Excel</button>
      <button type="button" class="stickyBtnPdf" id="stickyExportPdf" ${disabled ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>📄 PDF</button>
    </div>
  `;

  const btnAdj = document.getElementById('btnStickyAjustar');
  if (btnAdj) {
    btnAdj.addEventListener('click', () => {
      openReportFiltersDrawer();
    });
  }
  const sExcel = document.getElementById('stickyExportExcel');
  if (sExcel) sExcel.addEventListener('click', () => {
    const mainBtn = document.getElementById('exportExcel');
    if (mainBtn) mainBtn.click();
  });
  const sPdf = document.getElementById('stickyExportPdf');
  if (sPdf) sPdf.addEventListener('click', () => {
    const mainBtn = document.getElementById('exportPdf');
    if (mainBtn) mainBtn.click();
  });
}

export function openReportFiltersDrawer() {
  const drawer = document.getElementById('reportFiltersDrawer');
  const backdrop = document.getElementById('reportFiltersDrawerBackdrop');
  reportesExpandedGroups.clear();
  if (drawer) drawer.classList.add('open');
  if (backdrop) backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeReportFiltersDrawer() {
  const drawer = document.getElementById('reportFiltersDrawer');
  const backdrop = document.getElementById('reportFiltersDrawerBackdrop');
  if (drawer) drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}


export function updateSection2DynamicParts(secFiltros, statsList, instCount, ft, state, getFichaType, dbNs, isAdmin, navigate, user) {
  // 1. Actualizar chips de filtros activos
  const activeChips = [];
  if (filtrosReporte.visita) activeChips.push({ key: 'visita', label: `Visita ${filtrosReporte.visita}` });
  if (filtrosReporte.estado) activeChips.push({ key: 'estado', label: `Estado: ${filtrosReporte.estado}` });
  if (filtrosReporte.responsable) activeChips.push({ key: 'responsable', label: `Resp: ${filtrosReporte.responsable}` });
  if (filtrosReporte.institucion) activeChips.push({ key: 'institucion', label: `IE: ${filtrosReporte.institucion}` });
  if (filtrosReporte.red) {
    const rLabel = normalizeReiNumber(filtrosReporte.red) || filtrosReporte.red;
    activeChips.push({ key: 'red', label: `RED: ${rLabel}` });
  }

  const hasAnyFilter = activeChips.length > 0;
  const chipsHtml = activeChips.map(ch => `
    <span class="filterChip">
      ${esc(ch.label)}
      <button type="button" data-clear-filter="${esc(ch.key)}" title="Quitar filtro ${esc(ch.label)}">×</button>
    </span>
  `).join('');

  const activeRow = secFiltros.querySelector('.activeFiltersRow');
  if (activeRow) {
    activeRow.innerHTML = `
      <span class="activeFiltersTitle">Filtros activos:</span>
      <div class="activeChipsContainer">
        ${chipsHtml || '<span class="noFiltersActiveText">Ningún filtro adicional</span>'}
      </div>
      ${hasAnyFilter ? '<button type="button" class="btnClearAllFilters" id="btnClearAllFilters" title="Restablecer filtros">↺ Limpiar filtros</button>' : ''}
    `;

    // Reasociar eventos de quitar chip y limpiar filtros
    activeRow.querySelectorAll('[data-clear-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.clearFilter;
        if (k && filtrosReporte[k] !== undefined) {
          filtrosReporte[k] = '';
          consFilters[k] = '';
          if (k === 'institucion') {
            const fi = secFiltros.querySelector('#fil_inst');
            if (fi) fi.value = '';
          } else if (k === 'responsable') {
            const fr = secFiltros.querySelector('#fil_responsable');
            if (fr) fr.value = '';
          }
          renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
        }
      });
    });

    const btnClear = activeRow.querySelector('#btnClearAllFilters');
    if (btnClear) {
      btnClear.addEventListener('click', () => {
        const currentTipo = filtrosReporte.tipo;
        filtrosReporte = {
          tipo: currentTipo,
          visita: '',
          estado: '',
          responsable: '',
          institucion: '',
          red: '',
          ugel: '',
          distrito: '',
          tipoGestion: '',
          desde: '',
          hasta: ''
        };
        syncFiltersState(filtrosReporte);
        renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
      });
    }
  }

  // 2. Actualizar línea de resumen
  const sumLine = secFiltros.querySelector('.filtersSummaryLine');
  if (sumLine) {
    sumLine.innerHTML = `
      <span style="font-size:14px">📊</span>
      <span><strong>${statsList.length} fichas · ${instCount} instituciones</strong> con los filtros activos</span>
    `;
  }

  // 3. Actualizar barra de descargas
  const dlBar = secFiltros.querySelector('#downloadActionBar');
  if (dlBar) {
    const isEbr = ft && isFichaEbrGestionEscolar(ft);
    const isCebe = ft && isFichaCebeGestion(ft);
    const isPrite = ft && isFichaPriteGestion(ft);
    const isEbrSinVisita = isEbr && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
    const isCebeSinVisita = isCebe && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
    const isPriteSinVisita = isPrite && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
    const isGestionSinVisita = isEbrSinVisita || isCebeSinVisita || isPriteSinVisita;
    const isZeroSubmissions = statsList.length === 0;
    const downloadDisabled = isZeroSubmissions || isGestionSinVisita;
    const msgVisitaObligatoria = (isEbr || isCebe || isPrite)
      ? 'Elige Visita 1, Visita 2 o Visita 3. Cada visita se analiza y descarga por separado.'
      : 'Elige una visita válida para esta ficha.';
    const downloadDisabledTitle = isGestionSinVisita
      ? msgVisitaObligatoria
      : (isZeroSubmissions ? 'No hay fichas con los filtros activos' : '');

    const helpText = dlBar.querySelector('.downloadSummaryHelp');
    if (helpText) {
      helpText.innerHTML = `<span>Se descargarán <strong>${statsList.length}</strong> fichas con los filtros activos.</span>`;
    }
    const btnEx = dlBar.querySelector('#exportExcel');
    const btnPd = dlBar.querySelector('#exportPdf');
    if (btnEx) {
      btnEx.disabled = downloadDisabled;
      btnEx.title = downloadDisabledTitle;
    }
    if (btnPd) {
      btnPd.disabled = downloadDisabled;
      btnPd.title = downloadDisabledTitle;
    }
  }
}


export function filterCardsInDom(qNorm) {
  const container = document.getElementById('fichaGroupsContainer');
  if (!container) return;
  const cards = container.querySelectorAll('.fichaTypeItem, .fichaTypeCard');
  let anyVisible = false;

  cards.forEach(c => {
    const nCorto = normalizeText(c.dataset.nombreCorto || '');
    const nComp = normalizeText(c.dataset.nombreCompleto || '');
    const matches = !qNorm || nCorto.includes(qNorm) || nComp.includes(qNorm);
    c.style.display = matches ? '' : 'none';
    if (matches) anyVisible = true;
  });

  // Mostrar / ocultar grupos y expandir los que tengan coincidencias al buscar
  container.querySelectorAll('.fichaGroupSection').forEach(sec => {
    const secCards = Array.from(sec.querySelectorAll('.fichaTypeItem, .fichaTypeCard'));
    const secHasVisible = secCards.some(c => c.style.display !== 'none');
    sec.style.display = secHasVisible ? '' : 'none';

    const btn = sec.querySelector('[data-group-toggle]');
    const list = sec.querySelector('.fichaTypeList, .fichaCardGrid');
    if (!list) return;

    if (qNorm && qNorm.length > 0) {
      if (secHasVisible) {
        list.style.display = 'flex';
        if (btn) {
          btn.classList.add('isExpanded');
          btn.setAttribute('aria-expanded', 'true');
          const chev = btn.querySelector('.groupToggleChevron');
          if (chev) chev.textContent = '▼';
          const act = btn.querySelector('.groupToggleAction');
          if (act) act.textContent = 'Ocultar fichas ▲';
        }
      }
    } else {
      const gName = btn ? btn.dataset.groupToggle : null;
      const isExpanded = gName && reportesExpandedGroups.has(gName);
      list.style.display = isExpanded ? 'flex' : 'none';
      if (btn) {
        btn.classList.toggle('isExpanded', isExpanded);
        btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
        const chev = btn.querySelector('.groupToggleChevron');
        if (chev) chev.textContent = isExpanded ? '▼' : '▶';
        const act = btn.querySelector('.groupToggleAction');
        if (act) act.textContent = isExpanded ? 'Ocultar fichas ▲' : 'Ver fichas ▼';
      }
    }
  });

  const noMatchesMsg = document.getElementById('noFichaMatches');
  if (noMatchesMsg) {
    noMatchesMsg.style.display = anyVisible ? 'none' : 'block';
  }
}

export function attachSection1Listeners(secTipo, state, getFichaType, dbNs, isAdmin, navigate, user) {
  // Buscador de tipos
  const searchInput = secTipo.querySelector('#searchFichaType');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      reportesSearchTerm = e.target.value;
      const raw = e.target.value.trim();
      const q = raw.length >= 2 ? normalizeText(raw) : '';
      filterCardsInDom(q);
    });
  }

  // Toggle Ocultar / Mostrar tipos
  const toggleBtn = secTipo.querySelector('#btnToggleTipos');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      reportesHideTypes = !reportesHideTypes;
      try { localStorage.setItem('reportes_hide_types', String(reportesHideTypes)); } catch (_) { }
      renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Botón Cambiar (cuando está colapsado)
  const btnExpandir = secTipo.querySelector('#btnExpandirTipos');
  if (btnExpandir) {
    btnExpandir.addEventListener('click', () => {
      reportesHideTypes = false;
      try { localStorage.setItem('reportes_hide_types', 'false'); } catch (_) { }
      renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Botones de colapso/expansión de grupo
  secTipo.querySelectorAll('[data-group-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const gName = btn.dataset.groupToggle;
      const groupSec = btn.closest('.fichaGroupSection');
      const list = groupSec ? groupSec.querySelector('.fichaTypeList, .fichaCardGrid') : null;
      if (!list) return;

      const currentlyExpanded = btn.classList.contains('isExpanded');
      const nextExpanded = !currentlyExpanded;

      if (nextExpanded) {
        reportesExpandedGroups.add(gName);
      } else {
        reportesExpandedGroups.delete(gName);
      }

      btn.classList.toggle('isExpanded', nextExpanded);
      btn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
      btn.title = nextExpanded ? 'Ocultar fichas de ' + gName : 'Visualizar fichas de ' + gName;

      const chev = btn.querySelector('.groupToggleChevron');
      if (chev) chev.textContent = nextExpanded ? '▼' : '▶';

      const act = btn.querySelector('.groupToggleAction');
      if (act) act.textContent = nextExpanded ? 'Ocultar fichas ▲' : 'Ver fichas ▼';

      list.style.display = nextExpanded ? 'flex' : 'none';
    });
  });

  // Selección de tarjeta / fila de ficha
  const onSelectCard = (typeId) => {
    if (filtrosReporte.tipo === typeId) return;

    const oldFt = filtrosReporte.tipo !== '__ALL__' ? getEnrichedFichaType(getFichaType(filtrosReporte.tipo)) : null;
    const newFt = typeId !== '__ALL__' ? getEnrichedFichaType(getFichaType(typeId)) : null;

    // Asegurar que el grupo de la ficha seleccionada se mantenga expandido
    const gName = newFt ? newFt.grupo : 'Avance general';
    if (gName) reportesExpandedGroups.add(gName);

    // Regla de Visita: si la nueva ficha no trabaja por visitas, quitar filtro de visita
    let avisoVisitaQuitada = false;
    if (newFt && !newFt.tieneVisitas && filtrosReporte.visita) {
      filtrosReporte.visita = '';
      consFilters.visita = '';
      avisoVisitaQuitada = true;
    } else if (typeId === '__ALL__' && filtrosReporte.visita) {
      filtrosReporte.visita = '';
      consFilters.visita = '';
    } else if (newFt && (isFichaEbrGestionEscolar(newFt) || isFichaCebeGestion(newFt) || isFichaPriteGestion(newFt))) {
      const validVisitas = ['1', '2', '3'];
      if (!filtrosReporte.visita || !validVisitas.includes(String(filtrosReporte.visita))) {
        filtrosReporte.visita = '1';
        consFilters.visita = '1';
      }
    } else if (newFt && (isFichaJec(newFt) || isFichaCoordTutoriaJec(newFt) || isFichaCoordPedagogico(newFt))) {
      const jecCfg = getJecFichaConfig(newFt);
      if (jecCfg && jecCfg.tipo === 'institucional') {
        filtrosReporte.visita = String(jecCfg.momento);
        consFilters.visita = String(jecCfg.momento);
      } else if (jecCfg && (jecCfg.tipo === 'coord_tutoria' || jecCfg.tipo === 'coord_pedag')) {
        if (filtrosReporte.visita && !['2', '3'].includes(String(filtrosReporte.visita))) {
          filtrosReporte.visita = '';
          consFilters.visita = '';
        }
      }
    }

    // Regla de Estado: mantener si aplica, de lo contrario resetear
    if (filtrosReporte.estado && newFt && (isFichaEbrGestionEscolar(newFt) || isFichaCebeGestion(newFt) || isFichaPriteGestion(newFt))) {
      // EBR, CEBE y PRITE admiten Logrado, En proceso, Inicio
    }

    filtrosReporte.tipo = typeId;
    consSelectedTypeId = typeId;

    if (avisoVisitaQuitada) {
      showToast('Se quitó el filtro Visita porque esta ficha no trabaja por visitas.');
    }

    // Sincronizar select nativo oculto si existe
    const consSelect = document.getElementById('consSelect');
    if (consSelect) consSelect.value = typeId;

    renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
  };

  const cards = secTipo.querySelectorAll('.fichaTypeItem, .fichaTypeCard');
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      const tid = card.dataset.typeId;
      if (tid) onSelectCard(tid);
    });

    // Accesibilidad con teclado: flechas, Enter y Espacio
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const tid = card.dataset.typeId;
        if (tid) onSelectCard(tid);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const visibleCards = Array.from(cards).filter(c => c.style.display !== 'none');
        const curIdx = visibleCards.indexOf(card);
        const nextCard = visibleCards[curIdx + 1] || visibleCards[0];
        if (nextCard) nextCard.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const visibleCards = Array.from(cards).filter(c => c.style.display !== 'none');
        const curIdx = visibleCards.indexOf(card);
        const prevCard = visibleCards[curIdx - 1] || visibleCards[visibleCards.length - 1];
        if (prevCard) prevCard.focus();
      }
    });
  });

  // Soporte para selector legacy oculto si algún test o script externo cambia su valor
  const legacySelect = secTipo.querySelector('#consSelect');
  if (legacySelect) {
    legacySelect.addEventListener('change', (e) => {
      const val = e.target.value || '__ALL__';
      onSelectCard(val);
    });
  }
}

export function attachSection2Listeners(secFiltros, state, getFichaType, dbNs, isAdmin, navigate, user, statsList) {
  const ft = filtrosReporte.tipo !== '__ALL__' ? getEnrichedFichaType(getFichaType(filtrosReporte.tipo)) : null;
  const isAllMode = !filtrosReporte.tipo || filtrosReporte.tipo === '__ALL__';

  // Botón Cambiar (en encabezado de sección 2)
  const btnCambiar = secFiltros.querySelector('#btnCambiarFichaLink');
  if (btnCambiar) {
    btnCambiar.addEventListener('click', () => {
      reportesHideTypes = false;
      try { localStorage.setItem('reportes_hide_types', 'false'); } catch (_) { }
      renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
      const sec1 = document.getElementById('secTipoFicha');
      if (sec1) sec1.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  // Visita
  const filVisita = secFiltros.querySelector('#fil_visita');
  if (filVisita) {
    filVisita.addEventListener('change', (e) => {
      filtrosReporte.visita = e.target.value;
      consFilters.visita = e.target.value;
      if (filtrosReporte.institucion) {
        const stillValid = getFilteredColegiosForReportesSearch(state, filtrosReporte, getFichaType, user, filtrosReporte.institucion)
          .some(it => normalizeText(it.colegio.ie || it.colegio.nombre || '') === normalizeText(filtrosReporte.institucion));
        if (!stillValid) {
          filtrosReporte.institucion = '';
          consFilters.institucion = '';
        }
      }
      renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Estado
  const filEstado = secFiltros.querySelector('#fil_estado');
  if (filEstado) {
    filEstado.addEventListener('change', (e) => {
      filtrosReporte.estado = e.target.value;
      consFilters.estado = e.target.value;
      if (filtrosReporte.institucion && filtrosReporte.estado) {
        const stillValid = getFilteredColegiosForReportesSearch(state, filtrosReporte, getFichaType, user, filtrosReporte.institucion)
          .some(it => normalizeText(it.colegio.ie || it.colegio.nombre || '') === normalizeText(filtrosReporte.institucion));
        if (!stillValid) {
          filtrosReporte.institucion = '';
          consFilters.institucion = '';
        }
      }
      renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Responsable (debounce 400ms, mínimo 3 caracteres para no bloquear mientras se escribe)
  const filResp = secFiltros.querySelector('#fil_responsable');
  let debResp = null;
  if (filResp) {
    const applyRespSearch = (immediate = false) => {
      clearTimeout(debResp);
      const doApply = () => {
        const rawVal = filResp.value;
        const val = rawVal.trim();
        const finalVal = val.length >= 3 ? val : (immediate ? val : '');
        if (filtrosReporte.responsable === finalVal) return;
        filtrosReporte.responsable = finalVal;
        consFilters.responsable = finalVal;
        if (filtrosReporte.institucion && filtrosReporte.responsable) {
          const stillValid = getFilteredColegiosForReportesSearch(state, filtrosReporte, getFichaType, user, filtrosReporte.institucion)
            .some(it => normalizeText(it.colegio.ie || it.colegio.nombre || '') === normalizeText(filtrosReporte.institucion));
          if (!stillValid) {
            filtrosReporte.institucion = '';
            consFilters.institucion = '';
          }
        }
        renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
      };
      if (immediate) {
        doApply();
      } else {
        debResp = setTimeout(doApply, 400);
      }
    };

    filResp.addEventListener('input', () => applyRespSearch(false));
    filResp.addEventListener('change', () => applyRespSearch(true));
    filResp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyRespSearch(true);
      }
    });
  }

  // Institución Educativa con autocompletado filtrado según ficha, REI, estado y especialista
  const filInst = secFiltros.querySelector('#fil_inst');
  const dropdown = secFiltros.querySelector('#fil_inst_dropdown');
  if (filInst && dropdown) {
    const showDropdown = () => {
      const val = filInst.value || '';
      const matches = getFilteredColegiosForReportesSearch(state, filtrosReporte, getFichaType, user, val);

      if (!matches.length) {
        const activeFilterTexts = [];
        if (filtrosReporte.red) {
          activeFilterTexts.push(`RED ${normalizeReiNumber(filtrosReporte.red) || filtrosReporte.red}`);
        }
        if (filtrosReporte.estado) {
          activeFilterTexts.push(`estado "${filtrosReporte.estado}"`);
        }
        if (filtrosReporte.responsable) {
          activeFilterTexts.push(`especialista "${filtrosReporte.responsable}"`);
        }
        if (filtrosReporte.visita && filtrosReporte.visita !== 'ALL' && filtrosReporte.visita !== '__ALL__') {
          activeFilterTexts.push(`Visita ${filtrosReporte.visita}`);
        }

        const filterMsg = activeFilterTexts.length > 0
          ? `con los filtros activos (${activeFilterTexts.join(' · ')})`
          : 'con el término buscado';

        dropdown.innerHTML = `
          <div style="padding:12px 14px;color:#64748b;font-size:12px;line-height:1.4">
            <div style="font-weight:700;color:var(--navy-900);margin-bottom:2px">No se encontraron instituciones</div>
            <div style="font-size:11.5px;color:#64748b">No hay colegios que coincidan ${esc(filterMsg)}.</div>
          </div>
        `;
        dropdown.style.display = 'block';
        return;
      }

      // Limitar a los primeros 35 resultados para máxima fluidez
      const displayMatches = matches.slice(0, 35);

      dropdown.innerHTML = displayMatches.map(item => {
        const c = item.colegio;
        const ieName = c.ie || c.nombre || '';
        const modTag = c.modalidad ? ` <span class="badge" style="font-size:10px;padding:1px 5px;background:#DEEBF7;color:#2E75B6;margin-left:4px">${esc(c.modalidad)}</span>` : '';
        const codLoc = c.codigoLocal || c.codLocal || c.codigoModular || '';
        const redNum = normalizeReiNumber(c.red || c.rei) || c.red || c.rei || '';
        const dirName = (c.director && typeof c.director === 'object') ? (c.director.nombre || '') : (typeof c.director === 'string' ? c.director : '');
        const respText = item.respName ? ` · Resp: ${esc(item.respName)}` : '';

        let statusBadge = '';
        if (item.status === 'Logrado') {
          statusBadge = `<span class="badge" style="font-size:10px;padding:1px 6px;background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;font-weight:700">Logrado</span>`;
        } else if (item.status === 'En proceso' || item.status === 'Proceso') {
          statusBadge = `<span class="badge" style="font-size:10px;padding:1px 6px;background:#fef3c7;color:#b45309;border:1px solid #fde68a;font-weight:700">En proceso</span>`;
        } else if (item.status === 'Inicio') {
          statusBadge = `<span class="badge" style="font-size:10px;padding:1px 6px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;font-weight:700">Inicio</span>`;
        } else if (item.status === 'Pendiente') {
          statusBadge = `<span class="badge" style="font-size:10px;padding:1px 6px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;font-weight:600">Pendiente</span>`;
        }

        return `
          <div class="ieDropdownItem" data-ie-name="${esc(ieName)}">
            <div class="ieDropMain" style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="font-weight:700;color:var(--navy-900)">${esc(ieName)}${modTag}</span>
              ${statusBadge}
            </div>
            <div class="ieDropSub">${esc(codLoc)}${redNum ? ' · RED ' + esc(redNum) : ''}${respText}${dirName ? ' · Dir: ' + esc(dirName) : ''}</div>
          </div>
        `;
      }).join('');
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          const chosenName = item.dataset.ieName;
          if (chosenName) {
            filInst.value = chosenName;
            filtrosReporte.institucion = chosenName;
            consFilters.institucion = chosenName;
            dropdown.style.display = 'none';
            renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
          }
        };
      });
    };

    filInst.addEventListener('input', () => {
      showDropdown();
      if (!filInst.value.trim() && filtrosReporte.institucion) {
        filtrosReporte.institucion = '';
        consFilters.institucion = '';
        renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
      }
    });

    filInst.addEventListener('focus', () => {
      showDropdown();
    });

    filInst.addEventListener('click', () => {
      showDropdown();
    });

    filInst.addEventListener('blur', () => {
      setTimeout(() => { if (dropdown) dropdown.style.display = 'none'; }, 250);
    });

    filInst.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        dropdown.style.display = 'none';
        const val = filInst.value.trim();
        filtrosReporte.institucion = val;
        consFilters.institucion = val;
        renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
      } else if (e.key === 'Escape') {
        dropdown.style.display = 'none';
      }
    });
  }

  // RED
  const filRed = secFiltros.querySelector('#fil_red');
  if (filRed) {
    filRed.addEventListener('change', (e) => {
      const val = normalizeReiNumber(e.target.value) || e.target.value;
      filtrosReporte.red = val;
      consFilters.red = val;
      if (filtrosReporte.institucion && filtrosReporte.red) {
        const stillValid = getFilteredColegiosForReportesSearch(state, filtrosReporte, getFichaType, user, filtrosReporte.institucion)
          .some(it => normalizeText(it.colegio.ie || it.colegio.nombre || '') === normalizeText(filtrosReporte.institucion));
        if (!stillValid) {
          filtrosReporte.institucion = '';
          consFilters.institucion = '';
        }
      }
      renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }


  // Quitar filtro individual desde chip
  secFiltros.querySelectorAll('[data-clear-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.clearFilter;
      if (k && filtrosReporte[k] !== undefined) {
        filtrosReporte[k] = '';
        consFilters[k] = '';
        if (k === 'institucion') {
          const fi = secFiltros.querySelector('#fil_inst');
          if (fi) fi.value = '';
        } else if (k === 'responsable') {
          const fr = secFiltros.querySelector('#fil_responsable');
          if (fr) fr.value = '';
        }
        renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
      }
    });
  });

  // Botones Limpiar filtros (en fila de filtros activos y en barra inferior de descargas)
  const onResetFiltersClick = () => {
    const currentTipo = filtrosReporte.tipo;
    filtrosReporte = {
      tipo: currentTipo,
      visita: '',
      estado: '',
      responsable: '',
      institucion: '',
      red: '',
      ugel: '',
      distrito: '',
      tipoGestion: '',
      desde: '',
      hasta: ''
    };
    const fi = secFiltros.querySelector('#fil_inst');
    if (fi) fi.value = '';
    const fr = secFiltros.querySelector('#fil_responsable');
    if (fr) fr.value = '';
    syncFiltersState(filtrosReporte);
    renderConsBodyProxy(state, getFichaType, dbNs, isAdmin, navigate, user);
  };

  const btnClearAll = secFiltros.querySelector('#btnClearAllFilters');
  if (btnClearAll) {
    btnClearAll.addEventListener('click', onResetFiltersClick);
  }

  const btnBottomClear = secFiltros.querySelector('#btnBottomClearFilters');
  if (btnBottomClear) {
    btnBottomClear.addEventListener('click', onResetFiltersClick);
  }

  // Exportar Excel
  const btnExportExcel = secFiltros.querySelector('#exportExcel');
  if (btnExportExcel) {
    btnExportExcel.addEventListener('click', async () => {
      if (!statsList || statsList.length === 0) {
        showToast('No hay registros para exportar con los filtros seleccionados.');
        return;
      }

      const isEbrExport = ft && isFichaEbrGestionEscolar(ft);
      const isCebeExport = ft && isFichaCebeGestion(ft);
      const isPriteExport = ft && isFichaPriteGestion(ft);
      if (isEbrExport) {
        const vNum = Number(filtrosReporte.visita);
        if (vNum !== 1 && vNum !== 2) {
          showToast('Elige Visita 1 o Visita 2. Cada visita tiene indicadores distintos y se descarga por separado.');
          return;
        }
      } else if (isCebeExport || isPriteExport) {
        const vNum = Number(filtrosReporte.visita);
        if (vNum !== 1 && vNum !== 2 && vNum !== 3) {
          showToast('Elige Visita 1, Visita 2 o Visita 3. Cada visita se analiza y descarga por separado.');
          return;
        }
      }

      btnExportExcel.disabled = true;
      const originalHtml = btnExportExcel.innerHTML;
      btnExportExcel.innerHTML = '<span class="ic">⏳</span> Generando…';
      try {
        if (isEbrExport) {
          const vNum = Number(filtrosReporte.visita);
          const subsVisita = statsList.map(x => x.s || x).filter(s => {
            const sV = Number(s.visita) || (Array.isArray(s.respuestas) && s.respuestas.some(r => String(r?.id || '').startsWith('ge2_')) ? 2 : 1);
            return sV === vNum;
          });
          await exportarTableroEBRCompleto(subsVisita, vNum, state.colegios || [], state);
          showToast(`✓ Tablero EBR generado: Visita ${vNum} (${vNum === 2 ? 'Segundo' : 'Primer'} momento)`);
        } else {
          let exportStatsList = statsList;
          if (isAllMode && (!filtrosReporte.visita || (filtrosReporte.visita !== '1' && filtrosReporte.visita !== '2'))) {
            exportStatsList = statsList.filter(x => !isFichaEbrGestionEscolar(x.s || x));
          }

          const res = await exportarMatrizSeguimiento({
            statsList: exportStatsList,
            consFilters: filtrosReporte,
            isAllMode,
            ft,
            state,
            getFichaType
          });
          showToast(`Excel generado con éxito (${res.fileName})`);
        }
      } catch (err) {
        console.error('Error al exportar a Excel:', err);
        showToast('Error al generar Excel: ' + (err.message || 'Error desconocido'));
      } finally {
        btnExportExcel.disabled = false;
        btnExportExcel.innerHTML = originalHtml;
      }
    });
  }

  // Exportar PDF
  const btnExportPdf = secFiltros.querySelector('#exportPdf');
  if (btnExportPdf) {
    btnExportPdf.addEventListener('click', () => {
      const isEbrPdf = ft && isFichaEbrGestionEscolar(ft);
      const isCebePdf = ft && isFichaCebeGestion(ft);
      const isPritePdf = ft && isFichaPriteGestion(ft);
      if (isEbrPdf) {
        const vNum = Number(filtrosReporte.visita);
        if (vNum !== 1 && vNum !== 2) {
          showToast('Elige Visita 1 o Visita 2. Cada visita tiene indicadores distintos y se descarga por separado.');
          return;
        }
      } else if (isCebePdf || isPritePdf) {
        const vNum = Number(filtrosReporte.visita);
        if (vNum !== 1 && vNum !== 2 && vNum !== 3) {
          showToast('Elige Visita 1, Visita 2 o Visita 3. Cada visita se analiza y descarga por separado.');
          return;
        }
      }

      openDownloadConfigModal({
        documentTitle: isAllMode ? 'REPORTE CONSOLIDADO GENERAL DE MONITOREO' : `REPORTE CONSOLIDADO — ${(ft ? ft.nombre : 'MONITOREO').toUpperCase()}`,
        tipoReporte: 'consolidado',
        dataRows: statsList,
        currentUser: user,
        state,
        dbNs,
        isAdmin,
        onConfirm: async (cfg) => {
          cfg.getFichaType = getFichaType;
          cfg.fichaTypes = state.fichaTypes;
          cfg.colegios = state.colegios;
          await exportConsolidadoReportPdf(statsList, ft, filtrosReporte, isAllMode, cfg);
        }
      });
    });
  }

}
