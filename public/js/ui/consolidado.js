/* =========================================================================
   ui/consolidado.js — Vista consolidada, reportes ejecutivos, filtros y pendientes
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
  forceResetBodyScroll
} from './core-utils.js';
import {
  setAppState,
  getAppState,
  setEditMode,
  clearEditMode,
  getSessionUser,
  setSessionUser,
  setRegSelectedTypeId,
  setRegBuiltFor,
  setRegSelectedColegioId
} from './state.js';
import {
  RESPONSE_OPTIONS,
  RESPONSE_LABELS,
  OPTION_COLORS,
  scoreValue,
  statusFromPct,
  colorForPct,
  getSubmissionResponsable,
  getResponsableForColegio,
  bar,
  donutChart,
  stackedBar,
  computeStats,
  computeItemAgg,
  renderItemReportHtml
} from './scoring.js';
import { openDownloadConfigModal } from './modales.js';
import {
  buildColegioIndex,
  matchColegio,
  groupSubmissionsByColegio,
  colegioFichaTypeStats,
  openModalGestionJec
} from './colegios-tab.js';
import {
  JEC_FICHAS_CONFIG,
  getJecFichaConfig,
  getJecVisitasToCheck,
  getMomentoLabelJec,
  renderJecVisitaSelectHtml,
  buildJecVisitBadges,
  calculateJecPendingItems,
  renderJecPendingTabsHtml
} from './jec-reportes.js';
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
} from '../calcEngine.js';
import {
  exportFichaIndividualPdf,
  exportConsolidadoReportPdf
} from '../pdf-template.js';
import { getEbrSeccionesForVisita } from '../ebr-gestion.js';
import { isFichaJec, JEC_SECCIONES, getNivelLogroJec } from '../jec-monitoreo.js';
import { JEC_1ER_SECCIONES } from '../jec-1er-monitoreo.js';
import { backfillSubmissionsUgelRed } from './concursos-tab.js';
import { isFichaCebeGestion, CEBE_SECCIONES } from '../cebe-gestion.js';
import { isFichaPriteGestion, PRITE_SECCIONES } from '../prite-gestion.js';
import { getDirectivosActivosForColegio } from '../directorio.js';
import { exportarMatrizSeguimiento } from '../exportarMatriz.js';
import { exportarTableroEBRCompleto } from '../exportarTableroEBR.js';

export const DEFAULT_FICHA_TYPES_METADATA = {
  'ft_msejec_1er': { grupo: 'Modelo JEC', nombreCorto: '1er Monitoreo Implementación JEC', orden: 9, tieneVisitas: true },
  'ft_msejec_2do': { grupo: 'Modelo JEC', nombreCorto: '2do Monitoreo Implementación JEC', orden: 10, tieneVisitas: true },
  'ft_msejec_3er': { grupo: 'Modelo JEC', nombreCorto: '3er Monitoreo Implementación JEC', orden: 11, tieneVisitas: true },
  'ft_coord_tutoria_jec': { grupo: 'Modelo JEC', nombreCorto: 'Coord. de Tutoría (JEC)', orden: 12, tieneVisitas: true },
  'ft_coord_pedagogico': { grupo: 'Modelo JEC', nombreCorto: 'Coord. Pedagógico (JEC)', orden: 13, tieneVisitas: true },
  'ft_coord_pedagogico_jec': { grupo: 'Modelo JEC', nombreCorto: 'Coord. Pedagógico (JEC)', orden: 13, tieneVisitas: true },
  'ft_gestion_ugel03_ebr': { grupo: 'Gestión escolar y docentes (EBR)', nombreCorto: 'Gestión Escolar EBR', orden: 20, tieneVisitas: true },
  'ft_ebr_gestion_1er': { grupo: 'Gestión escolar y docentes (EBR)', nombreCorto: 'Gestión Escolar EBR', orden: 20, tieneVisitas: true },
  'ft_directivo': { grupo: 'Gestión escolar y docentes (EBR)', nombreCorto: 'Directivo de IE', orden: 21, tieneVisitas: false },
  'ft_rubricas_aula': { grupo: 'Gestión escolar y docentes (EBR)', nombreCorto: 'Rúbricas de observación de aula', orden: 22, tieneVisitas: false },
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

  const standardGroups = ['Avance general', 'Modelo JEC', 'Gestión escolar y docentes (EBR)', 'CEBE / PRITE'];
  if (!autoGrupo || !standardGroups.includes(autoGrupo)) {
    // 1. Coordinador pedagógico (JEC)
    if (isFichaCoordPedagogico(ft) || ((nNorm.includes('coordinador') || idNorm.includes('coord')) && nNorm.includes('pedagog'))) {
      autoGrupo = 'Modelo JEC';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Coord. Pedagógico (JEC)';
      if (autoOrden === null) autoOrden = 12;
      if (autoTieneVisitas === null) autoTieneVisitas = true;
    }
    // 2. Coordinador de tutoría (JEC)
    else if (isFichaCoordTutoriaJec(ft) || ((nNorm.includes('tutor') || idNorm.includes('tutor')) && (nNorm.includes('jec') || idNorm.includes('jec') || nNorm.includes('coord') || idNorm.includes('coord')))) {
      autoGrupo = 'Modelo JEC';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Coord. de Tutoría (JEC)';
      if (autoOrden === null) autoOrden = 11;
      if (autoTieneVisitas === null) autoTieneVisitas = true;
    }
    // 3. Implementación del Modelo JEC
    else if (isFichaJec(ft) || nNorm.includes('jec') || idNorm.includes('jec') || idNorm.includes('msejec')) {
      autoGrupo = 'Modelo JEC';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) {
        if (ft.id === 'ft_msejec_1er' || idNorm.includes('1er')) autoNombreCorto = '1er Monitoreo JEC';
        else if (ft.id === 'ft_msejec_3er' || idNorm.includes('3er')) autoNombreCorto = '3er Monitoreo JEC';
        else autoNombreCorto = '2do Monitoreo JEC';
      }
      if (autoOrden === null) {
        if (ft.id === 'ft_msejec_1er' || idNorm.includes('1er')) autoOrden = 9;
        else if (ft.id === 'ft_msejec_3er' || idNorm.includes('3er')) autoOrden = 11;
        else autoOrden = 10;
      }
      if (autoTieneVisitas === null) autoTieneVisitas = true;
    }
    // 4. Directivo de IE
    else if (nNorm.includes('directivo') || idNorm.includes('directivo')) {
      autoGrupo = 'Gestión escolar y docentes (EBR)';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Directivo de IE';
      if (autoOrden === null) autoOrden = 21;
      if (autoTieneVisitas === null) autoTieneVisitas = false;
    }
    // 5. Rúbricas de observación de aula
    else if (nNorm.includes('rubrica') || idNorm.includes('rubrica') || (nNorm.includes('aula') && nNorm.includes('docente'))) {
      autoGrupo = 'Gestión escolar y docentes (EBR)';
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Rúbricas de observación de aula';
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
      autoGrupo = 'Gestión escolar y docentes (EBR)';
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
let consExpanded = null;
let reportesHideTypes = false;
let reportesSearchTerm = '';
let reportesFiltersInitialized = false;
let currentReportPendingItems = [];
let currentReportFt = null;
let currentPendingActiveTab = 'ALL';

// Estado de grupos colapsados/expandidos en Sección 1
// Por defecto los grupos de fichas inician colapsados para dar clic y visualizarse
export let reportesExpandedGroups = new Set(['Avance general']);

function syncFiltersState(newFilters) {
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
      } else if (state.fichaTypes.some(ft => ft.id === pTipo)) {
        f.tipo = pTipo;
      }
    } else {
      try {
        const last = sessionStorage.getItem('reportes_last_type');
        if (last && (last === '__ALL__' || state.fichaTypes.some(ft => ft.id === last))) {
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

export function aplicarFiltrosReporte(submissions, filters, state, getFichaType, user = null) {
  const f = filters || {};
  const isAllMode = !f.tipo || f.tipo === '__ALL__';
  const targetFt = !isAllMode ? getEnrichedFichaType(getFichaType(f.tipo)) : null;

  // 1. Filtrar por tipo
  let subs = isAllMode
    ? submissions.slice()
    : submissions.filter(s => {
        const tid = targetFt ? targetFt.id : f.tipo;
        if (s.fichaTypeId === tid) return true;
        // Compatibilidad retroactiva: 'ft_jec' y 'ft_msejec_2do' representan el 2do Monitoreo JEC
        if ((tid === 'ft_msejec_2do' || tid === 'ft_jec') && (s.fichaTypeId === 'ft_msejec_2do' || s.fichaTypeId === 'ft_jec')) {
          return true;
        }
        return false;
      });

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
    const sFt = isAllMode ? getFichaType(s.fichaTypeId) : targetFt;
    return { s, st: sFt ? computeStats(s, sFt) : { pct: null, secciones: [] } };
  });

  // 9. Estado
  if (f.estado && f.estado.trim()) {
    const est = f.estado.trim();
    statsList = statsList.filter(x => {
      const sFt = isAllMode ? getFichaType(x.s.fichaTypeId) : targetFt;
      const isJec = isFichaJec(sFt || targetFt || x.s) || isFichaCoordTutoriaJec(sFt || targetFt || x.s) || isFichaCoordPedagogico(sFt || targetFt || x.s) || isFichaEspecialistaJec(sFt || targetFt || x.s);
      const isEbr = !isJec && (isFichaEbrGestionEscolar(sFt || targetFt || x.s)
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
    const sFt = isAllMode ? getFichaType(x.s.fichaTypeId) : targetFt;
    const isJec = isFichaJec(sFt || targetFt || x.s) || isFichaCoordTutoriaJec(sFt || targetFt || x.s) || isFichaCoordPedagogico(sFt || targetFt || x.s) || isFichaEspecialistaJec(sFt || targetFt || x.s);
    const isEbr = !isJec && (isFichaEbrGestionEscolar(sFt || targetFt || x.s)
      || isFichaEbrEbePrite(sFt || targetFt || x.s)
      || isFichaCebeGestion(sFt || targetFt || x.s)
      || isFichaPriteGestion(sFt || targetFt || x.s)
      || (sFt?.tipoRespuesta === 'ips')
      || (sFt?.escala === 'IPL')
      || (targetFt?.tipoRespuesta === 'ips')
      || (targetFt?.escala === 'IPL'));
    let l = '';
    if (isEbr && x.st && x.st.pct !== null) {
      l = x.st.pct >= 67 ? 'logrado' : (x.st.pct >= 34 ? 'proceso' : 'inicio');
    } else if (x.st && x.st.estado && (x.st.estado.estado_panel || x.st.estado.label)) {
      l = String(x.st.estado.estado_panel || x.st.estado.label).toLowerCase();
    } else {
      const v = x.s ? getMomentoVisitaEbr(x.s) : undefined;
      l = (statusFromPct(x.st?.pct, sFt, x.st?.conteo_si, x.st?.puntaje, v).label || '').toLowerCase();
    }
    if (l.includes('no cumple') || l.includes('inici') || l.includes('incipient') || l.includes('mejorar')) dist.inicio++;
    else if (l.includes('parcial') || l.includes('proces')) dist.proceso++;
    else if (l.includes('lograd') || l.includes('cumple')) dist.logrado++;
    else dist.none++;
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

function getPeriodoFechas(tipo) {
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

function renderSection1Html(state, getFichaType, user) {
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

  const groupOrder = ['Avance general', 'Modelo JEC', 'Gestión escolar y docentes (EBR)', 'CEBE / PRITE'];
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

  state.fichaTypes.forEach(rawFt => {
    const ft = getEnrichedFichaType(rawFt);
    const gName = ft.grupo || 'Otras fichas';
    if (!groupsMap[gName]) groupsMap[gName] = [];
    const count = countFichasForCard(ft.id, state.submissions, filtrosReporte, state, getFichaType, user);
    groupsMap[gName].push({
      ...ft,
      count,
      isSelected: !isAllMode && (ft.id === filtrosReporte.tipo)
    });
  });

  let groupsHtml = '';
  const allGroupKeys = Object.keys(groupsMap).filter(k => groupsMap[k].length > 0);

  allGroupKeys.forEach(gName => {
    const cards = groupsMap[gName];
    cards.sort((a, b) => (a.orden || 99) - (b.orden || 99) || (a.nombreCorto || '').localeCompare(b.nombreCorto || ''));

    const totalGroupFichas = cards.reduce((sum, c) => sum + (c.count || 0), 0);
    const hasSelected = cards.some(c => c.isSelected);
    if (hasSelected && !isAllMode) {
      reportesExpandedGroups.add(gName);
    }
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
              ${c.isSelected ? '●' : '○'}
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
    state.fichaTypes.map(ft => '<option value="' + ft.id + '"' + (ft.id === filtrosReporte.tipo ? ' selected' : '') + '>' + esc(ft.nombre) + '</option>').join('');

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

function renderSection2Html(statsList, instCount, state, getFichaType, user, isAdmin) {
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

  const isEbrSinVisita = isEbr && (filtrosReporte.visita !== '1' && filtrosReporte.visita !== '2');
  const isCebeSinVisita = isCebe && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
  const isGestionSinVisita = isEbrSinVisita || isCebeSinVisita;

  const msgVisitaObligatoria = isCebe
    ? 'Elige Visita 1, Visita 2 o Visita 3. Cada visita se analiza y descarga por separado.'
    : 'Elige Visita 1 o Visita 2. Cada visita tiene indicadores distintos y se descarga por separado.';

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
        ${isAdmin ? `
          <div class="herramientasMenuWrap">
            <button type="button" class="btnHerramientas" id="btnHerramientas" title="Herramientas de administración">⋯</button>
            <div class="herramientasDropdown" id="herramientasDropdown" style="display:none">
              <button type="button" class="herramientasItem" id="btnBackfillUgel">🔄 Sincronizar UGEL/RED</button>
            </div>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function updateStickyReportesBar(statsList, getFichaType) {
  const bar = document.getElementById('stickyReportesBar');
  if (!bar) return;
  const isAllMode = !filtrosReporte.tipo || filtrosReporte.tipo === '__ALL__';
  const ft = !isAllMode ? getEnrichedFichaType(getFichaType(filtrosReporte.tipo)) : null;
  const shortName = isAllMode ? 'Todas las fichas' : (ft ? ft.nombreCorto : '—');
  const isEbr = ft && isFichaEbrGestionEscolar(ft);
  const isCebe = ft && isFichaCebeGestion(ft);
  const isPrite = ft && isFichaPriteGestion(ft);
  const isGestionSinVisita = (isEbr && (filtrosReporte.visita !== '1' && filtrosReporte.visita !== '2')) ||
    ((isCebe || isPrite) && (!['1', '2', '3'].includes(String(filtrosReporte.visita))));
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

export function renderConsolidadoTab(container, state, getFichaType, dbNs, isAdmin, navigate, currentUser = null) {
  if (currentUser) setSessionUser(currentUser);
  const user = currentUser || getSessionUser() || (state && state.currentUser) || null;

  if (state.fichaTypes.length === 0) {
    container.innerHTML = '<div class="pageHead"><h2>Reportes</h2></div>' +
      '<div class="empty"><h4>Aún no hay tipos de ficha</h4><p>Crea un tipo de ficha y registra visitas para ver reportes de avance aquí.</p></div>';
    return;
  }

  // Cargar estado inicial desde URL o sessionStorage
  if (!reportesFiltersInitialized) {
    const loaded = loadReportesFiltersFromUrl(state);
    const initFt = loaded.tipo && loaded.tipo !== '__ALL__' ? state.fichaTypes.find(t => t.id === loaded.tipo) : null;
    if (initFt && (isFichaEbrGestionEscolar(initFt) || isFichaCebeGestion(initFt) || isFichaPriteGestion(initFt))) {
      const valid = isFichaEbrGestionEscolar(initFt) ? ['1', '2'] : ['1', '2', '3'];
      if (!loaded.visita || !valid.includes(String(loaded.visita))) {
        loaded.visita = '1';
      }
    }
    syncFiltersState(loaded);
    reportesFiltersInitialized = true;
  }

  try {
    const savedHide = localStorage.getItem('reportes_hide_types');
    if (savedHide !== null) reportesHideTypes = (savedHide === 'true');
  } catch (_) { }

  // Determinar texto resumido de filtros activos para el botón del drawer
  let activeFilterLabel = 'Todos los filtros';
  if (filtrosReporte.tipo && filtrosReporte.tipo !== '__ALL__') {
    const activeFt = getFichaType(filtrosReporte.tipo);
    const ftName = activeFt ? (activeFt.nombreCorto || activeFt.nombre) : 'Ficha seleccionada';
    const visStr = filtrosReporte.visita ? ` · V${filtrosReporte.visita}` : '';
    const reiStr = filtrosReporte.red ? ` · REI ${filtrosReporte.red}` : '';
    activeFilterLabel = `${ftName}${visStr}${reiStr}`;
  }

  container.innerHTML = `
    <!-- Barra superior de Reportes con disparador de filtros visible en la parte superior izquierda -->
    <div class="reportTopbarWithTrigger" id="reportTopbarWithTrigger">
      <div class="reportTopbarLeft">
        <button type="button" class="btn btnFiltrosDrawerTrigger" id="btnOpenReportFiltersDrawer" title="Abrir opciones de tipo de ficha y filtros">
          <span style="font-size:16px">⚙️</span>
          <span>Filtros y Fichas</span>
          <span class="badgeActiveFiltersSummary" id="badgeActiveFiltersSummary">${esc(activeFilterLabel)}</span>
        </button>
        <div class="reportTopbarTitleWrap">
          <h2 style="margin:0;font-size:18px;font-weight:800;color:var(--navy-900);line-height:1.2">Reportes de Monitoreo</h2>
          <div style="margin-top:2px;font-size:11.5px;color:var(--text-600)">
            Avance institucional, análisis por indicador y seguimiento de colegios.
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop oscuro del drawer lateral -->
    <div id="reportFiltersDrawerBackdrop" class="reportFiltersDrawerBackdrop"></div>

    <!-- Drawer Lateral Deslizante con Tipo de Ficha y Filtros -->
    <aside id="reportFiltersDrawer" class="reportFiltersDrawer" aria-label="Filtros y Selección de Ficha">
      <div class="reportDrawerHeader">
        <div class="drawerHeaderLeft">
          <div class="drawerHeaderIcon">⚙️</div>
          <div class="drawerHeaderText">
            <h3>Filtros y Selección de Ficha</h3>
            <p>Configura parámetros de búsqueda y descarga de reportes</p>
          </div>
        </div>
        <button type="button" id="btnCloseReportFiltersDrawer" class="btnCloseDrawer" title="Cerrar panel de filtros (Esc)">✕</button>
      </div>
      <div class="reportDrawerBody">
        <div id="secTipoFicha" class="panel secReportesTipoFicha"></div>
        <div id="secFiltrosDescargas" class="panel secReportesFiltros"></div>
      </div>
    </aside>

    <div id="stickyReportesBar" class="stickyReportesBar" style="display:none"></div>
    <div id="consHost"></div>
  `;

  // Listeners del Drawer
  const btnOpen = container.querySelector('#btnOpenReportFiltersDrawer');
  const btnClose = container.querySelector('#btnCloseReportFiltersDrawer');
  const btnApply = container.querySelector('#btnApplyAndCloseDrawer');
  const backdrop = container.querySelector('#reportFiltersDrawerBackdrop');

  if (btnOpen) btnOpen.onclick = openReportFiltersDrawer;
  if (btnClose) btnClose.onclick = closeReportFiltersDrawer;
  if (btnApply) btnApply.onclick = closeReportFiltersDrawer;
  if (backdrop) backdrop.onclick = closeReportFiltersDrawer;

  window.removeEventListener('keydown', window._reportDrawerEscHandler || (() => { }));
  window._reportDrawerEscHandler = (e) => {
    if (e.key === 'Escape') closeReportFiltersDrawer();
  };
  window.addEventListener('keydown', window._reportDrawerEscHandler);

  const secTipo = document.getElementById('secTipoFicha');
  if (secTipo) secTipo.innerHTML = renderSection1Html(state, getFichaType, user);

  renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);

  // Listener para barra compacta flotante al hacer scroll
  const handleScroll = () => {
    const sBar = document.getElementById('stickyReportesBar');
    if (!sBar) return;
    if (window.scrollY > 120) {
      sBar.style.display = 'flex';
    } else {
      sBar.style.display = 'none';
    }
  };
  window.removeEventListener('scroll', window._reportesScrollHandler || (() => { }));
  window._reportesScrollHandler = handleScroll;
  window.addEventListener('scroll', handleScroll, { passive: true });
}

/**
 * Genera el HTML de las filas de la tabla de instituciones educativas pendientes de monitoreo.
 * Columnas optimizadas para vista lado a lado: N° | Institución Educativa (con REI, Visita y Responsable compactos) | Acción
 */
export function buildPendingRowsHtml(items, ft = null) {
  if (!items || items.length === 0) {
    return `<tr><td colspan="3" style="text-align:center;padding:26px 14px;color:var(--text-600)">
      <div style="font-size:22px;margin-bottom:4px">🎉</div>
      <strong style="font-size:13px">¡Excelente! No hay instituciones pendientes con los filtros seleccionados.</strong>
      <p style="margin:4px 0 0;font-size:11.5px">Todas las instituciones han sido ejecutadas para esta visita y REI.</p>
    </td></tr>`;
  }
  return items.map((p, idx) => {
    const vBadgeCls = p.visita === 1 ? 'badge-visita-v1' : (p.visita === 2 ? 'badge-visita-v2' : 'badge-visita-v3');
    const vColorStyle = p.visita === 1
      ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;'
      : (p.visita === 2 ? 'background:#fffbeb;color:#b45309;border:1px solid #fde68a;' : 'background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;');
    const reiText = p.rei && p.rei !== '—' ? `REI ${p.rei}` : '';

    return `
      <tr data-col-id="${esc(p.colId)}" data-vis="${p.visita}" data-rei="${esc(p.rei)}">
        <td style="text-align:center;color:var(--text-600);font-weight:600;font-size:11.5px">${idx + 1}</td>
        <td>
          <div style="font-weight:700;color:var(--navy-900);font-size:12.5px;line-height:1.3">${esc(p.colNombre)}</div>
          <div style="font-size:11px;color:var(--text-500);margin-top:2px;display:flex;align-items:center;flex-wrap:wrap;gap:4px">
            ${p.codigoLocal ? `<span>Cód: ${esc(p.codigoLocal)}</span>` : ''}
            ${reiText ? `<span class="badge badge-red" style="padding:1px 5px;font-size:10px">${esc(reiText)}</span>` : ''}
            <span class="badge ${vBadgeCls}" style="${vColorStyle}padding:1px 5px;font-size:10px">${p.visitaLabel}</span>
            ${p.detailPending ? `<span class="badge" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:1px 6px;font-size:10px;font-weight:700">${esc(p.detailPending)}</span>` : ''}
            ${p.responsable && p.responsable !== '—' ? `<span style="color:var(--text-600)" title="Responsable: ${esc(p.responsable)}">· ${esc(p.responsable)}</span>` : ''}
          </div>
        </td>
        <td style="text-align:center">
          <button type="button" class="btn secondary small btnRegistrarPendiente"
                  data-col-id="${esc(p.colId)}" data-vis="${p.visita}" data-ft-id="${esc(ft ? ft.id : '')}"
                  title="${p.parcial ? 'Completar registro de' : 'Registrar'} Visita ${p.visita} para ${esc(p.colNombre)}">
            ${p.parcial ? 'Completar →' : 'Registrar →'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function updateSection2DynamicParts(secFiltros, statsList, instCount, ft, state, getFichaType, dbNs, isAdmin, navigate, user) {
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
          renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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
    const isEbrSinVisita = isEbr && (filtrosReporte.visita !== '1' && filtrosReporte.visita !== '2');
    const isCebeSinVisita = isCebe && (!['1', '2', '3'].includes(String(filtrosReporte.visita)));
    const isGestionSinVisita = isEbrSinVisita || isCebeSinVisita;
    const isZeroSubmissions = statsList.length === 0;
    const downloadDisabled = isZeroSubmissions || isGestionSinVisita;
    const msgVisitaObligatoria = isCebe
      ? 'Elige Visita 1, Visita 2 o Visita 3. Cada visita se analiza y descarga por separado.'
      : 'Elige Visita 1 o Visita 2. Cada visita tiene indicadores distintos y se descarga por separado.';
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

export function renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, currentUser = null, options = {}) {
  let opts = options;
  let userParam = currentUser;
  if (currentUser && typeof currentUser === 'object' && ('keepInputs' in currentUser)) {
    opts = currentUser;
    userParam = null;
  }
  if (userParam) setSessionUser(userParam);
  const user = userParam || getSessionUser() || (state && state.currentUser) || null;
  const keepInputs = Boolean(opts && opts.keepInputs);

  const host = document.getElementById('consHost');
  const secTipo = document.getElementById('secTipoFicha');
  const secFiltros = document.getElementById('secFiltrosDescargas');
  if (!host) return;

  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const selStart = (activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
  const selEnd = (activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;

  // Actualizar URL
  syncReportesUrl(filtrosReporte);

  // Guardar última ficha seleccionada en sessionStorage
  try {
    sessionStorage.setItem('reportes_last_type', filtrosReporte.tipo || '__ALL__');
  } catch (_) { }

  // 1. Aplicar todos los filtros en el motor central
  const { subs, statsList, instCount, avgPct, dist, targetFt, isAllMode, hasInvalidDates } = aplicarFiltrosReporte(
    state.submissions,
    filtrosReporte,
    state,
    getFichaType,
    user
  );

  const ft = targetFt;

  // 2. Actualizar o renderizar Sección 1 (Tipo de Ficha)
  if (secTipo) {
    if (keepInputs && secTipo.querySelector('.fichaTypeItem, .fichaTypeCard')) {
      // Actualizar únicamente los contadores de las tarjetas en Sección 1 sin reconstruir el DOM
      secTipo.querySelectorAll('.fichaTypeCard').forEach(c => {
        const tid = c.dataset.typeId;
        const countSpan = c.querySelector('.fItemCount');
        if (tid && countSpan) {
          const count = countFichasForCard(tid, state.submissions, filtrosReporte, state, getFichaType, user);
          countSpan.textContent = `${count} fichas`;
          countSpan.className = `fItemCount ${count === 0 ? 'countZero' : 'countHas'}`;
          c.classList.toggle('isZero', count === 0);
        }
      });
    } else {
      const prevSearch = reportesSearchTerm;
      secTipo.innerHTML = renderSection1Html(state, getFichaType, user);
      const searchInp = secTipo.querySelector('#searchFichaType');
      if (searchInp && prevSearch) {
        searchInp.value = prevSearch;
        filterCardsInDom(prevSearch);
      }
      attachSection1Listeners(secTipo, state, getFichaType, dbNs, isAdmin, navigate, user);
    }
  }

  // 3. Renderizar Sección 2 (Filtros y Descargas)
  if (secFiltros) {
    const hasFormInputs = Boolean(secFiltros.querySelector('#fil_inst'));
    if (keepInputs && hasFormInputs) {
      updateSection2DynamicParts(secFiltros, statsList, instCount, ft, state, getFichaType, dbNs, isAdmin, navigate, user);
    } else {
      secFiltros.innerHTML = renderSection2Html(statsList, instCount, state, getFichaType, user, isAdmin);
      attachSection2Listeners(secFiltros, state, getFichaType, dbNs, isAdmin, navigate, user, statsList);
    }
  }

  // 4. Actualizar Sticky Bar y Badge del disparador
  updateStickyReportesBar(statsList, getFichaType);

  const triggerBadge = document.getElementById('badgeActiveFiltersSummary');
  if (triggerBadge) {
    let activeFilterLabel = 'Todos los filtros';
    if (filtrosReporte.tipo && filtrosReporte.tipo !== '__ALL__') {
      const activeFt = getFichaType(filtrosReporte.tipo);
      const ftName = activeFt ? (activeFt.nombreCorto || activeFt.nombre) : 'Ficha seleccionada';
      const visStr = filtrosReporte.visita ? ` · V${filtrosReporte.visita}` : '';
      const reiStr = filtrosReporte.red ? ` · REI ${filtrosReporte.red}` : '';
      activeFilterLabel = `${ftName}${visStr}${reiStr}`;
    }
    triggerBadge.textContent = activeFilterLabel;
  }

  // 5. Renderizar Gráficas, Indicadores y Tablas en consHost
  const colLog = 'var(--ok, #16a34a)';
  const colProc = 'var(--warn, #d97706)';
  const colIni = 'var(--danger, #dc2626)';

  const vFilter = filtrosReporte.visita ? String(filtrosReporte.visita).trim() : '';
  const distTotal = dist.logrado + dist.proceso + dist.inicio + dist.none;
  const centerSubLabel = vFilter ? `fichas V${vFilter}` : 'fichas';
  const panelDistTitle = vFilter ? `Distribución de resultados · Visita ${vFilter}` : 'Distribución de resultados';

  const seg = '<div class="distWrap">' +
    donutChart([
      { value: dist.logrado, color: colLog, label: 'Logrado' },
      { value: dist.proceso, color: colProc, label: 'En proceso' },
      { value: dist.inicio, color: colIni, label: 'Inicio' },
      { value: dist.none, color: 'var(--line-strong, #94a3b8)', label: 'Sin datos' },
    ], { centerLabel: distTotal, centerSub: centerSubLabel }) +
    '<div class="seglegend" style="flex-direction:column;gap:8px;align-items:flex-start">' +
    '<span><span class="dot" style="background:' + colLog + '"></span>Logrado (' + dist.logrado + ')</span>' +
    '<span><span class="dot" style="background:' + colProc + '"></span>En proceso (' + dist.proceso + ')</span>' +
    '<span><span class="dot" style="background:' + colIni + '"></span>Inicio (' + dist.inicio + ')</span>' +
    (dist.none ? '<span><span class="dot" style="background:var(--line-strong, #94a3b8)"></span>Sin datos (' + dist.none + ')</span>' : '') +
    '</div></div>';

  // Reporte por ítem (solo para tipo de ficha individual)
  let itemReportHtml = '';
  if (!isAllMode && ft) {
    const isEbr = isFichaEbrGestionEscolar(ft);
    let seccionesParaAgg = ft.secciones || [];
    if (isEbr) {
      const hasV3 = statsList.some(x => Number(x.s.visita) === 3);
      const hasV2 = statsList.some(x => Number(x.s.visita) === 2);
      const vTarget = hasV3 ? 3 : (hasV2 ? 2 : 1);
      seccionesParaAgg = getEbrSeccionesForVisita(vTarget, ft);
    } else if (isFichaCebeGestion(ft)) {
      seccionesParaAgg = (ft.secciones?.length ? ft.secciones : CEBE_SECCIONES);
    } else if (isFichaPriteGestion(ft)) {
      seccionesParaAgg = (ft.secciones?.length ? ft.secciones : PRITE_SECCIONES);
    }
    const secAgg = {};
    seccionesParaAgg.forEach(sec => secAgg[sec.nombre] = { sum: 0, cnt: 0 });
    statsList.forEach(x => (x.st.secciones || []).forEach(sc => {
      if (sc.pct !== null && secAgg[sc.nombre]) {
        secAgg[sc.nombre].sum += sc.pct;
        secAgg[sc.nombre].cnt++;
      }
    }));

    const itemAgg = computeItemAgg(statsList.map(x => x.s), ft);
    itemAgg.forEach(sec => {
      const a = secAgg[sec.nombre];
      if (a && a.cnt) {
        sec.avg = Math.round(a.sum / a.cnt);
      }
    });
    itemReportHtml = renderItemReportHtml(itemAgg, ft.tipoRespuesta, ft);
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
      const sFt = getFichaType(tid);
      const st = x.st?.estado?.estado_panel || statusFromPct(x.st.pct, sFt, x.st?.conteo_si, x.st?.puntaje).label;
      const stLower = String(st || '').toLowerCase();
      if (stLower.includes('no cumple') || stLower.includes('inici') || stLower.includes('incipient') || stLower.includes('mejorar')) a.inicio++;
      else if (stLower.includes('parcial') || stLower.includes('proces')) a.proceso++;
      else if (stLower.includes('lograd') || stLower.includes('cumple')) a.logrado++;
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

  // Evolución por N° de visita
  const visAgg = {};
  statsList.forEach(x => {
    const v = Number(x.s.visita) || 1;
    if (!visAgg[v]) {
      visAgg[v] = { sumPct: 0, cnt: 0, sumPts: 0, cntPts: 0, items: [] };
    }
    if (x.st.pct !== null && x.st.pct !== undefined) {
      visAgg[v].sumPct += x.st.pct;
      visAgg[v].cnt++;
    }
    if (x.st.puntaje !== null && x.st.puntaje !== undefined) {
      visAgg[v].sumPts += x.st.puntaje;
      visAgg[v].cntPts++;
    }
    visAgg[v].items.push(x);
  });

  const visRows = Object.keys(visAgg).sort((a, b) => Number(a) - Number(b)).map(v => {
    const a = visAgg[v];
    const vNum = Number(v);
    const avg = a.cnt ? Math.round(a.sumPct / a.cnt) : null;
    const avgPts = a.cntPts ? Math.round(a.sumPts / a.cntPts) : null;
    const sampleItem = a.items[0];
    const sFt = (sampleItem && (isAllMode ? getFichaType(sampleItem.s.fichaTypeId) : ft)) || ft;
    const isEbr = isFichaEbrGestionEscolar(sFt);
    const isCoordTutoria = isFichaCoordTutoriaJec(sFt);
    const isCoordPedagogico = isFichaCoordPedagogico(sFt);
    const vSt = statusFromPct(avg, sFt, 0, avgPts, vNum);
    const maxPts = isEbr ? (vNum === 2 ? 69 : 57) : (isCoordTutoria ? 63 : (isCoordPedagogico ? 51 : null));
    const scoreTitle = ((isEbr || isCoordTutoria || isCoordPedagogico) && avgPts !== null)
      ? ' title="' + avgPts + '/' + maxPts + ' pts promedio (' + (avg === null ? '—' : avg + '%') + ')"'
      : (avg !== null ? ' title="' + avg + '%"' : '');

    return '<div class="barRow">' +
      '<div class="name">Visita ' + vNum + ' <span class="badge ' + vSt.cls + '" style="margin-left:8px;font-size:11px;vertical-align:middle;">' + vSt.label + '</span></div>' +
      bar(avg, vSt.cls, sFt) +
      '<div class="val"' + scoreTitle + '>' + (avg === null ? '—' : avg + '%') + '</div>' +
      '</div>';
  }).join('') || '<p class="helpText">Sin datos suficientes.</p>';

  // Filas de tabla Fichas registradas
  const tblTypeHeader = isAllMode ? '<th>Tipo de ficha</th>' : '';
  const rows = statsList.map(x => {
    const s = x.s; const st = x.st;
    const sFt = isAllMode ? getFichaType(s.fichaTypeId) : ft;
    const isEbr = isFichaEbrGestionEscolar(sFt || ft || s);
    const vNum = getSubmissionVisitaNum(s, sFt || ft);
    let status = null;
    if (st && st.estado && st.estado.label) {
      status = { label: st.estado.label, cls: st.estado.cls };
    } else {
      status = statusFromPct(st.pct, sFt, st?.conteo_si, st?.puntaje, vNum);
    }
    const isOpen = consExpanded === s.id;
    const detailContent = isOpen ? buildDetail(s) : '';
    const pdfBtn = '<button class="actBtn pdfBtn" data-pdfsub="' + s.id + '" title="Descargar Ficha Oficial en PDF (A4)">📄 PDF</button>';
    const editBtn = '<button class="actBtn" data-edit="' + s.id + '" title="Corregir ficha">✏️ Editar</button>';
    const delBtn = isAdmin ? '<button class="actBtn delBtn" data-del="' + s.id + '" title="Eliminar">✕</button>' : '';
    const typeName = s.fichaTypeNombre || (getFichaType(s.fichaTypeId) || {}).nombre || '—';
    const typeCol = isAllMode ? '<td><span class="badge st-none" style="font-size:10.5px">' + esc(typeName) + '</span></td>' : '';
    const ugelRedCol = '<td>' + esc(s.ugel || 'UGEL 03') + '<br><small style="color:var(--text-muted);font-weight:600;">' + esc(s.red || 'No aplica') + '</small></td>';
    const subResp = getSubmissionResponsable(s, state, user);
    const displayResp = (subResp && !/^\d+$/.test(subResp) && !subResp.includes('@') && subResp !== '—')
      ? subResp
      : ((s.responsable && !/^\d+$/.test(String(s.responsable).trim()) && !String(s.responsable).includes('@')) ? String(s.responsable).trim() : (subResp || '—'));
    const isCoordTutoria = isFichaCoordTutoriaJec(sFt || ft);
    const isCoordPedagogico = isFichaCoordPedagogico(sFt || ft);
    let pctDisplay = (st.pct === null ? '—' : st.pct + '%');
    if (isEbr && st.puntaje !== undefined && st.puntaje !== null) {
      const v = getMomentoVisitaEbr(s);
      const maxPts = st.puntaje_max || (v === 2 ? 69 : 57);
      pctDisplay = '<strong>' + st.puntaje + '/' + maxPts + ' pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    } else if (isCoordTutoria && st.puntaje !== undefined && st.puntaje !== null) {
      pctDisplay = '<strong>' + st.puntaje + '/63 pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    } else if (isCoordPedagogico && st.puntaje !== undefined && st.puntaje !== null) {
      pctDisplay = '<strong>' + st.puntaje + '/51 pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    }

    const visitaLabel = (sFt && !sFt.tieneVisitas && !s.visita) ? '—' : ('V' + vNum);
    return '<tr class="clickable" data-row="' + s.id + '"><td>' + fmtDate(s.fecha) + '</td><td>' + esc(s.institucion) + '</td>' + typeCol + ugelRedCol + '<td>' + visitaLabel + '</td><td>' + esc(displayResp) + '</td><td>' + pctDisplay + '</td><td><span class="badge ' + status.cls + '">' + status.label + '</span></td><td style="white-space:nowrap"><div class="rowActions">' + pdfBtn + editBtn + delBtn + '</div></td></tr>' +
      (isOpen ? '<tr class="detailRow"><td colspan="' + (isAllMode ? 9 : 8) + '">' + detailContent + '</td></tr>' : '');
  }).join('') || '<tr><td colspan="' + (isAllMode ? 9 : 8) + '" style="text-align:center;color:var(--text-600);padding:22px">No hay fichas que coincidan con los filtros.</td></tr>';

  // Resumen por institución
  const byInst = {};
  statsList.forEach(x => {
    const normInst = normalizeInstName(x.s.institucion || '');
    const normUgel = normalizeText(x.s.ugel || 'UGEL 03');
    const baseKey = x.s.colegioId ? ('col_' + x.s.colegioId) : (normInst + '|' + normUgel);
    // Group by institution AND ficha type
    const key = baseKey + '|' + x.s.fichaTypeId;

    if (!byInst[key]) {
      const sFt = isAllMode ? getFichaType(x.s.fichaTypeId) : ft;
      byInst[key] = {
        colegioId: x.s.colegioId || null,
        institucion: x.s.institucion,
        ugel: x.s.ugel || 'UGEL 03',
        red: x.s.red || '',
        fichaTypeId: x.s.fichaTypeId,
        fichaTypeNombre: sFt ? (sFt.nombreCorto || sFt.nombre) : '',
        visitas: []
      };
    }
    // Evitar duplicados por id de submission en caso de race conditions en el estado local
    if (!byInst[key].visitas.some(v => v.s.id === x.s.id)) {
      byInst[key].visitas.push(x);
    }
    if (x.s.red && (!byInst[key].red || byInst[key].red === '—' || byInst[key].red === 'No aplica')) {
      byInst[key].red = x.s.red;
    }
    if (x.s.institucion && x.s.institucion.length > (byInst[key].institucion || '').length) {
      byInst[key].institucion = x.s.institucion;
    }
  });

  const instRows = Object.values(byInst).sort((a, b) => (a.institucion || '').localeCompare(b.institucion || '')).map(g => {
    g.visitas.sort((a, b) => {
      const fDiff = (b.s.fecha || '').localeCompare(a.s.fecha || '');
      if (fDiff !== 0) return fDiff;
      return (Number(b.s.visita) || 1) - (Number(a.s.visita) || 1);
    });
    const last = g.visitas[0];
    const sFt = isAllMode ? getFichaType(last.s.fichaTypeId) : ft;
    const isEbr = isFichaEbrGestionEscolar(sFt || ft || last.s);
    const isCoordTutoria = isFichaCoordTutoriaJec(sFt || ft);
    const isCoordPedagogico = isFichaCoordPedagogico(sFt || ft);
    const withP = g.visitas.filter(x => x.st && x.st.pct !== null);
    const avg = withP.length ? Math.round(withP.reduce((a, x) => a + x.st.pct, 0) / withP.length) : null;
    const withPts = g.visitas.filter(x => x.st && x.st.puntaje !== undefined && x.st.puntaje !== null);
    const avgPts = withPts.length ? Math.round(withPts.reduce((a, x) => a + x.st.puntaje, 0) / withPts.length) : null;
    const withSi = g.visitas.filter(x => x.st && x.st.conteo_si !== undefined && x.st.conteo_si !== null);
    const avgSi = withSi.length ? Math.round(withSi.reduce((a, x) => a + x.st.conteo_si, 0) / withSi.length) : null;

    const vLast = isEbr ? getMomentoVisitaEbr(last.s) : 1;
    const maxPts = isEbr ? (vLast === 2 ? 69 : 57) : (isCoordTutoria ? 63 : (isCoordPedagogico ? 51 : 63));

    let gst = null;
    if (isEbr && avgPts !== null) {
      const avgItems = g.visitas.reduce((acc, x) => acc + (x.st?.total_items || 23), 0) / g.visitas.length;
      const maxAplicable = avgItems > 0 ? avgItems * 3 : null;
      const nivelEbr = getNivelEbrGestion(avgPts, vLast, maxAplicable);
      gst = { label: nivelEbr.estado_panel || nivelEbr.nivel, cls: nivelEbr.cls };
    } else if (g.visitas.length === 1 && last.st && last.st.estado && last.st.estado.label) {
      gst = { label: last.st.estado.label, cls: last.st.estado.cls };
    } else {
      gst = statusFromPct(avg, sFt, avgSi, avgPts, last.s.visita);
    }
    const scoreTitle = ((isCoordTutoria || isCoordPedagogico || isEbr) && avgPts !== null) ? ' title="' + avgPts + '/' + maxPts + ' pts"' : '';

    // Group counts by visit number
    const visitaCounts = {};
    g.visitas.forEach(v => {
      const vn = Number(v.s.visita) || 1;
      visitaCounts[vn] = (visitaCounts[vn] || 0) + 1;
    });

    const visitBadges = Object.keys(visitaCounts).sort().map(vn => {
      const count = visitaCounts[vn];
      const badgeText = count > 1 ? `V${vn} (${count})` : `V${vn}`;
      return '<span class="badge st-none" style="font-size:10.5px;padding:2px 6px;margin-left:4px;font-weight:700" title="' + count + ' visita(s) en V' + vn + '">' + badgeText + '</span>';
    }).join('');

    const totalVisitas = g.visitas.length;

    const displayInst = isAllMode
      ? esc(g.institucion) + '<br><small style="color:var(--text-muted);font-weight:600">' + esc(g.fichaTypeNombre) + '</small>'
      : esc(g.institucion);

    return '<tr><td>' + displayInst + '</td><td>' + esc(g.red || '—') + '</td><td>' + esc(g.ugel || '—') + '</td>' +
      '<td><strong>' + totalVisitas + '</strong>' + visitBadges + '</td><td>' + fmtDate(last.s.fecha) + '</td>' +
      '<td><span' + scoreTitle + '>' + (avg === null ? '—' : avg + '%') + '</span> <span class="badge ' + gst.cls + '">' + gst.label + '</span></td></tr>';
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-600);padding:20px">Sin instituciones con los filtros actuales.</td></tr>';

  const instRowsCompact = Object.values(byInst).map(g => {
    const withP = g.visitas.filter(x => x.st && x.st.pct !== null);
    const avg = withP.length ? Math.round(withP.reduce((a, x) => a + x.st.pct, 0) / withP.length) : null;
    const withPts = g.visitas.filter(x => x.st && x.st.puntaje !== undefined && x.st.puntaje !== null);
    const avgPts = withPts.length ? Math.round(withPts.reduce((a, x) => a + x.st.puntaje, 0) / withPts.length) : null;
    const last = g.visitas[0];
    const sFt = isAllMode ? getFichaType(last.s.fichaTypeId) : ft;
    const isEbr = isFichaEbrGestionEscolar(sFt || ft || last.s);
    const vLast = isEbr ? getMomentoVisitaEbr(last.s) : 1;
    const maxPts = isEbr ? (vLast === 2 ? 69 : 57) : 63;
    let gst = null;
    if (isEbr && avgPts !== null) {
      const avgItems = g.visitas.reduce((acc, x) => acc + (x.st?.total_items || 23), 0) / g.visitas.length;
      const maxAplicable = avgItems > 0 ? avgItems * 3 : null;
      const nivelEbr = getNivelEbrGestion(avgPts, vLast, maxAplicable);
      gst = { label: nivelEbr.estado_panel || nivelEbr.nivel, cls: nivelEbr.cls };
    } else if (g.visitas.length === 1 && last.st && last.st.estado && last.st.estado.label) {
      gst = { label: last.st.estado.label, cls: last.st.estado.cls };
    } else {
      gst = statusFromPct(avg, sFt, null, avgPts, last.s.visita);
    }
    const isJecTutoria = isFichaCoordTutoriaJec(sFt || ft);
    const isJecPedag = isFichaCoordPedagogico(sFt || ft);
    const isCoordFicha = isJecTutoria || isJecPedag;
    const isAnyJec = isCoordFicha || isFichaJec(sFt || ft);
    const scoreTitle = ((isCoordFicha || isEbr) && avgPts !== null) ? ' title="' + avgPts + '/' + maxPts + ' pts"' : '';

    let visitBadges = '';
    if (isAnyJec) {
      visitBadges = buildJecVisitBadges(g, sFt || ft, state);
    } else {
      const visitaCounts = {};
      g.visitas.forEach(v => {
        const vn = Number(v.s.visita) || 1;
        visitaCounts[vn] = (visitaCounts[vn] || 0) + 1;
      });
      visitBadges = Object.keys(visitaCounts).sort().map(vn => {
        return `<span class="badge st-none" style="font-size:10px;padding:1px 5px;margin-right:2px;font-weight:700">V${vn}</span>`;
      }).join('');
    }

    const coordNames = isCoordFicha
      ? g.visitas.map(v => v.s?.extras?.ex_coord || v.s?.coordinador || v.s?.responsable || v.s?.nombre_coordinador).filter(Boolean)
      : [];
    const uniqueCoordNames = Array.from(new Set(coordNames));
    const coordListHtml = uniqueCoordNames.length > 0
      ? `<div style="font-size:10.5px;color:var(--text-600);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Coordinadores registrados: ${esc(uniqueCoordNames.join(', '))}">👤 ${esc(uniqueCoordNames.join(', '))}</div>`
      : '';

    return `
      <tr>
        <td>
          <div style="font-weight:700;color:var(--navy-900);font-size:12.5px;line-height:1.3">${esc(g.institucion)}</div>
          ${g.red ? `<div style="font-size:10.5px;color:var(--text-500);margin-top:1px">RED: ${esc(g.red)}</div>` : ''}
          ${coordListHtml}
        </td>
        <td style="text-align:center">${visitBadges || '—'}</td>
        <td style="text-align:center">
          <span${scoreTitle} style="font-weight:700">${avg === null ? '—' : avg + '%'}</span>
          <span class="badge ${gst.cls}" style="font-size:10px;padding:1px 4px;margin-top:2px;display:inline-block">${gst.label}</span>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-600);padding:24px 14px">Sin instituciones monitoreadas con los filtros actuales.</td></tr>';

  // Fichas registradas: Sección simplificada (solo tabla)
  const secRegistradasHtml = `
    <div class="panel">
      <div class="sectionRegistradasHead">
        <h3 style="margin:0">Fichas registradas · ${statsList.length}</h3>
        <a href="#secFiltrosDescargas" id="btnAjustarFiltros" class="btnAjustarFiltros">Ajustar filtros ↑</a>
      </div>
      ${statsList.length === 0
      ? `<div class="emptyTableMsg">
            <p>No hay fichas que coincidan con los filtros activos.</p>
            <button type="button" class="btn secondary small" id="btnEmptyClearFilters">Limpiar filtros</button>
          </div>`
      : `<div class="tblWrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Institución</th>
                  ${tblTypeHeader}
                  <th>UGEL / RED</th>
                  <th>Visita</th>
                  <th>Responsable</th>
                  <th>%</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`
    }
    </div>
  `;

  // Cálculo de tarjetas KPI para fichas con modalidad específica (EBR, CEBE, PRITE y JEC)
  const isEbrReport = !isAllMode && ft && isFichaEbrGestionEscolar(ft);
  const isCebeReport = !isAllMode && ft && isFichaCebeGestion(ft);
  const isPriteReport = !isAllMode && ft && isFichaPriteGestion(ft);

  // Fichas del Modelo JEC
  const isJecModeloReport = !isAllMode && ft && isFichaJec(ft);
  const isJecTutoriaReport = !isAllMode && ft && isFichaCoordTutoriaJec(ft);
  const isJecPedagReport = !isAllMode && ft && isFichaCoordPedagogico(ft);
  const isJecReport = isJecModeloReport || isJecTutoriaReport || isJecPedagReport;

  const targetModality = isJecReport ? 'JEC' : (isEbrReport ? 'EBR' : (isPriteReport ? 'PRITE' : (isCebeReport ? 'CEBE' : null)));

  let cardsHtml = '';
  let secPendientesHtml = '';
  if (targetModality) {
    const padron = state.colegios || [];
    const isModalityMatch = (c, mod) => {
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
    };

    // 1. Filtrar padrón según modalidad
    let targetColegios = padron.filter(c => isModalityMatch(c, targetModality));

    // 2. Aplicar filtros activos del reporte sobre el padrón de colegios
    if (filtrosReporte.red && filtrosReporte.red.trim()) {
      const filterReiNum = normalizeReiNumber(filtrosReporte.red);
      const qRed = normalizeText(filtrosReporte.red.trim());
      targetColegios = targetColegios.filter(c => {
        const colReiNum = normalizeReiNumber(c.rei || c.red);
        if (filterReiNum && colReiNum) {
          return colReiNum === filterReiNum;
        }
        return normalizeText(c.rei || c.red || '').includes(qRed);
      });
    }
    if (filtrosReporte.distrito && filtrosReporte.distrito.trim()) {
      const qDist = normalizeText(filtrosReporte.distrito.trim());
      targetColegios = targetColegios.filter(c => normalizeText(c.distrito || '').includes(qDist));
    }
    if (filtrosReporte.tipoGestion && filtrosReporte.tipoGestion.trim()) {
      targetColegios = targetColegios.filter(c => c.tipoGestion === filtrosReporte.tipoGestion);
    }
    if (filtrosReporte.institucion && filtrosReporte.institucion.trim()) {
      const qInst = normalizeText(filtrosReporte.institucion.trim());
      targetColegios = targetColegios.filter(c => {
        return normalizeText(c.ie || c.nombre || '').includes(qInst) ||
          normalizeText(c.codigoLocal || '').includes(qInst) ||
          normalizeText(c.codigoModular || '').includes(qInst);
      });
    }

    // 3. Identificar colegios que han sido ejecutados (tienen al menos una ficha registrada)
    const executedColIds = new Set();
    const executedExtraKeys = new Set();
    const targetById = new Map();
    const targetByCode = new Map();
    const targetByIe = new Map();

    targetColegios.forEach(c => {
      if (c.id) targetById.set(c.id, c);
      if (c.codigoLocal) targetByCode.set(normalizeText(c.codigoLocal), c);
      if (c.codigoModular) targetByCode.set(normalizeText(c.codigoModular), c);
      if (c.ie) targetByIe.set(normalizeInstName(c.ie), c);
    });

    statsList.forEach(x => {
      const s = x.s;
      let matchedCol = null;
      if (s.colegioId && targetById.has(s.colegioId)) {
        matchedCol = targetById.get(s.colegioId);
      } else if (s.codigoLocal && targetByCode.has(normalizeText(s.codigoLocal))) {
        matchedCol = targetByCode.get(normalizeText(s.codigoLocal));
      } else if (s.codigoModular && targetByCode.has(normalizeText(s.codigoModular))) {
        matchedCol = targetByCode.get(normalizeText(s.codigoModular));
      } else if (s.institucion && targetByIe.has(normalizeInstName(s.institucion))) {
        matchedCol = targetByIe.get(normalizeInstName(s.institucion));
      }

      if (matchedCol) {
        executedColIds.add(matchedCol.id);
      } else {
        const rawKey = s.colegioId ? ('col_' + s.colegioId) : (normalizeInstName(s.institucion || '') + '|' + normalizeText(s.ugel || 'UGEL 03'));
        executedExtraKeys.add(rawKey);
      }
    });

    const numEjecutadas = executedColIds.size + executedExtraKeys.size;
    const iesEjecutadas = Math.max(numEjecutadas, instCount);
    const totalIesModalidad = targetColegios.length > 0 ? Math.max(targetColegios.length, iesEjecutadas) : iesEjecutadas;
    const iesPendientes = Math.max(0, totalIesModalidad - iesEjecutadas);
    const coberturaPct = totalIesModalidad > 0 ? Math.round((iesEjecutadas / totalIesModalidad) * 100) : 0;

    cardsHtml = `
      <div class="cards cards-5col">
        <div class="card card-navy" title="Total de instituciones educativas ${targetModality} en el padrón según filtros activos">
          <div class="num">${totalIesModalidad}</div>
          <div class="lbl">Total IEs ${targetModality}</div>
        </div>
        <div class="card card-ok" title="Instituciones educativas que cuentan con al menos una ficha de monitoreo registrada">
          <div class="num" style="color:var(--ok, #16a34a)">${iesEjecutadas}</div>
          <div class="lbl">IEs Ejecutadas <span style="font-size:11px;color:var(--ok, #16a34a);font-weight:700">(${coberturaPct}%)</span></div>
        </div>
        <div class="card card-warn" id="kpiCardIesPendientes" title="Instituciones educativas de modalidad ${targetModality} pendientes de monitoreo (Clic para ir al directorio)" style="cursor:pointer">
          <div class="num" style="color:var(--warn, #d97706)">${iesPendientes}</div>
          <div class="lbl">IEs Pendientes ↓</div>
        </div>
        <div class="card card-blue" title="Cantidad total de fichas de monitoreo registradas con los filtros seleccionados">
          <div class="num">${statsList.length}</div>
          <div class="lbl">Fichas registradas ${vFilter ? `(V${vFilter})` : ''}</div>
        </div>
        <div class="card card-gold" title="Promedio general de cumplimiento en las fichas">
          <div class="num">${avgPct === null ? '—' : avgPct + '%'}</div>
          <div class="lbl">Cumplimiento promedio</div>
        </div>
      </div>
    `;

    // 4. Identificar visitas ejecutadas por colegio para la ficha actual
    const visitSubsMap = new Map();
    const fichaAllSubs = (state.submissions || []).filter(s => {
      if (s.fichaTypeId === ft.id) return true;
      if ((ft.id === 'ft_msejec_2do' || ft.id === 'ft_jec') && (s.fichaTypeId === 'ft_msejec_2do' || s.fichaTypeId === 'ft_jec')) {
        return true;
      }
      return false;
    });

    fichaAllSubs.forEach(s => {
      if (filtrosReporte.desde && s.fecha && s.fecha < filtrosReporte.desde) return;
      if (filtrosReporte.hasta && s.fecha && s.fecha > filtrosReporte.hasta) return;

      const vNum = getSubmissionVisitaNum(s, ft);
      let col = null;
      if (s.colegioId && targetById.has(s.colegioId)) col = targetById.get(s.colegioId);
      else if (s.codigoLocal && targetByCode.has(normalizeText(s.codigoLocal))) col = targetByCode.get(normalizeText(s.codigoLocal));
      else if (s.codigoModular && targetByCode.has(normalizeText(s.codigoModular))) col = targetByCode.get(normalizeText(s.codigoModular));
      else if (s.institucion && targetByIe.has(normalizeInstName(s.institucion))) col = targetByIe.get(normalizeInstName(s.institucion));

      const regSub = { id: s.id || (col ? col.id + '_v' + vNum : Math.random().toString()), s };

      if (col && col.id) {
        const kId = col.id + '_V' + vNum;
        if (!visitSubsMap.has(kId)) visitSubsMap.set(kId, []);
        visitSubsMap.get(kId).push(regSub);
      }
      if (col && col.codigoLocal) {
        const kLoc = normalizeText(col.codigoLocal) + '_V' + vNum;
        if (!visitSubsMap.has(kLoc)) visitSubsMap.set(kLoc, []);
        visitSubsMap.get(kLoc).push(regSub);
      }
      if (col && col.ie) {
        const kIe = normalizeInstName(col.ie) + '_V' + vNum;
        if (!visitSubsMap.has(kIe)) visitSubsMap.set(kIe, []);
        visitSubsMap.get(kIe).push(regSub);
      }
      if (s.colegioId) {
        const kId = s.colegioId + '_V' + vNum;
        if (!visitSubsMap.has(kId)) visitSubsMap.set(kId, []);
        visitSubsMap.get(kId).push(regSub);
      }
      if (s.codigoLocal) {
        const kLoc = normalizeText(s.codigoLocal) + '_V' + vNum;
        if (!visitSubsMap.has(kLoc)) visitSubsMap.set(kLoc, []);
        visitSubsMap.get(kLoc).push(regSub);
      }
      if (s.institucion) {
        const kIe = normalizeInstName(s.institucion) + '_V' + vNum;
        if (!visitSubsMap.has(kIe)) visitSubsMap.set(kIe, []);
        visitSubsMap.get(kIe).push(regSub);
      }
    });

    let allPendingItems = [];
    if (isJecReport) {
      allPendingItems = calculateJecPendingItems(targetColegios, visitSubsMap, ft, state, getResponsableForColegio);
    } else {
      const visitasToCheck = [1, 2, 3];
      targetColegios.forEach(c => {
        const colId = c.id || '';
        const colNombre = (c.ie || c.nombre || 'Institución Educativa').trim();
        const rawRei = c.rei || c.red || '';
        const reiNum = normalizeReiNumber(rawRei);
        const reiDisplay = reiNum ? String(reiNum).padStart(2, '0') : (rawRei.replace(/^(?:REI|RED)\s*/i, '').trim() || '—');
        const responsable = getResponsableForColegio(c, ft, state);
        const codigoLocal = c.codigoLocal || '';
        const codigoModular = c.codigoModular || '';
        const distrito = c.distrito || '';
        const targetCount = 1;

        visitasToCheck.forEach(vNum => {
          let matchedSubs = [];
          if (colId && visitSubsMap.has(colId + '_V' + vNum)) {
            matchedSubs = visitSubsMap.get(colId + '_V' + vNum);
          } else if (codigoLocal && visitSubsMap.has(normalizeText(codigoLocal) + '_V' + vNum)) {
            matchedSubs = visitSubsMap.get(normalizeText(codigoLocal) + '_V' + vNum);
          } else if (c.ie && visitSubsMap.has(normalizeInstName(c.ie) + '_V' + vNum)) {
            matchedSubs = visitSubsMap.get(normalizeInstName(c.ie) + '_V' + vNum);
          }

          const uniqueSubIds = new Set(matchedSubs.map(x => x.id));
          const regCount = uniqueSubIds.size;

          if (regCount < targetCount) {
            allPendingItems.push({
              colId,
              colNombre,
              codigoLocal,
              codigoModular,
              distrito,
              rei: reiDisplay,
              reiNum: reiNum || 999,
              visita: vNum,
              visitaLabel: 'V' + vNum,
              responsable: responsable || 'Por asignar',
              targetCount,
              regCount,
              parcial: false,
              detailPending: ''
            });
          }
        });
      });
    }

    // Filtro activo de responsable en Sección 2
    if (filtrosReporte.responsable && filtrosReporte.responsable.trim()) {
      const qResp = normalizeText(filtrosReporte.responsable.trim());
      allPendingItems = allPendingItems.filter(p => normalizeText(p.responsable || '').includes(qResp));
    }

    // Ordenar: 1° por REI (ascendente), 2° por Visita (V1, V2, V3), 3° por nombre de IE (alfabético)
    allPendingItems.sort((a, b) => {
      if (a.reiNum !== b.reiNum) return a.reiNum - b.reiNum;
      if (a.visita !== b.visita) return a.visita - b.visita;
      return a.colNombre.localeCompare(b.colNombre, 'es');
    });

    // Determinar pestaña de visita inicial según filtro activo de Sección 2
    const initialVisTab = (filtrosReporte.visita && ['1', '2', '3'].includes(String(filtrosReporte.visita).trim()))
      ? ('V' + String(filtrosReporte.visita).trim())
      : 'ALL';

    const countV1 = allPendingItems.filter(p => p.visita === 1).length;
    const countV2 = allPendingItems.filter(p => p.visita === 2).length;
    const countV3 = allPendingItems.filter(p => p.visita === 3).length;

    const initialFilteredItems = initialVisTab === 'ALL'
      ? allPendingItems
      : allPendingItems.filter(p => ('V' + p.visita) === initialVisTab);

    // Guardar para interactividad en listeners
    currentReportPendingItems = allPendingItems;
    currentReportFt = ft;
    currentPendingActiveTab = initialVisTab;

    let comparativaSubTitle = `Seguimiento por Institución Educativa (${targetModality})`;
    let comparativaDesc = 'Caja comparativa a la misma altura: a la izquierda colegios monitoreados y a la derecha instituciones educativas pendientes.';
    if (isJecReport) {
      const jecCfg = getJecFichaConfig(ft);
      if (jecCfg) {
        comparativaSubTitle = jecCfg.subTitle;
        comparativaDesc = jecCfg.desc;
      }
    }

    const jecGestionBtnHtml = isJecReport
      ? `<button type="button" class="btn secondary small btnAbrirGestionJecDirecto" style="font-size:11px;padding:3px 9px;font-weight:700" title="Seleccionar las 29 IEs JEC y cantidad de coordinadores">⚙️ Padrón JEC (${targetColegios.length}/29)</button>`
      : '';

    if (isJecReport && targetColegios.length === 0) {
      secPendientesHtml = `
        <div class="panel secComparativaColegios" id="secComparativaColegios">
          <div class="comparativaHead">
            <div class="comparativaTitleWrap">
              <div class="comparativaIcon">🏛️</div>
              <div>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--navy-900)">
                  ${comparativaSubTitle}
                </h3>
                <p style="margin:2px 0 0;font-size:12px;color:var(--text-600)">
                  Aún no se ha seleccionado la lista de colegios pertenecientes al Modelo JEC.
                </p>
              </div>
            </div>
            <div>
              <button type="button" class="btn primary small btnAbrirGestionJecDirecto" style="font-weight:700">
                ⚡ Seleccionar Colegios JEC
              </button>
            </div>
          </div>
          <div style="padding:28px 18px;text-align:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;margin:12px 0">
            <div style="font-size:32px;margin-bottom:8px">📋</div>
            <h4 style="margin:0 0 6px;color:var(--navy-900);font-size:15px">Selecciona los 29 Colegios JEC de tu lista</h4>
            <p style="margin:0 auto 16px;max-width:560px;font-size:13px;color:var(--text-600);line-height:1.5">
              Para calcular con exactitud qué colegios ya fueron registrados y los pendientes para esta ficha, marca las casillas de tus colegios JEC e indica la cantidad de coordinadores en la ventana interactiva.
            </p>
            <button type="button" class="btn primary btnAbrirGestionJecDirecto" style="font-size:13px;padding:8px 18px;font-weight:700">
              Abrir selector interactivo de Colegios JEC →
            </button>
          </div>
        </div>
      `;
    } else {
      secPendientesHtml = `
        <div class="panel secComparativaColegios" id="secComparativaColegios">
          <div class="comparativaHead">
            <div class="comparativaTitleWrap">
              <div class="comparativaIcon">🏫</div>
              <div>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--navy-900)">
                  ${comparativaSubTitle}
                </h3>
                <p style="margin:2px 0 0;font-size:12px;color:var(--text-600)">
                  ${comparativaDesc}
                </p>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:8px">
              ${jecGestionBtnHtml}
              <span class="badge" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-weight:700">${iesEjecutadas} Monitoreadas</span>
              <span class="badge" style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;font-weight:700">${allPendingItems.length} Pendientes</span>
            </div>
          </div>

        <div class="comparativaGrid">
          <!-- CAJA 1: COLEGIOS MONITOREADOS -->
          <div class="comparativaCol colMonitoreados">
            <div class="comparativaColHead">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#16a34a"></span>
                <strong style="color:var(--navy-900);font-size:13px">Colegios Monitoreados</strong>
              </div>
              <span class="badge st-logrado" style="font-size:11px">${instCount} IEs con avance</span>
            </div>
            <div class="comparativaTblWrap">
              <table>
                <thead>
                  <tr>
                    <th>Institución Educativa</th>
                    <th style="width:75px;text-align:center">Visitas</th>
                    <th style="width:85px;text-align:center">Avance</th>
                  </tr>
                </thead>
                <tbody>
                  ${instRowsCompact}
                </tbody>
              </table>
            </div>
          </div>

          <!-- CAJA 2: INSTITUCIONES EDUCATIVAS PENDIENTES -->
          <div class="comparativaCol colPendientes" id="secColegiosPendientes">
            <div class="comparativaColHead">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#d97706"></span>
                <strong style="color:var(--navy-900);font-size:13px">Instituciones Educativas Pendientes</strong>
              </div>
              <div style="display:flex;align-items:center;gap:6px">
                <span class="badge" id="pendientesCountBadge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-size:11px;font-weight:700">
                  ${initialFilteredItems.length} pendientes
                </span>
                <button type="button" id="btnExportPendientesExcel" class="btn secondary small" style="padding:2px 7px;font-size:11px;line-height:1.2" title="Exportar lista de pendientes a Excel (.xlsx)">
                  📊 Excel
                </button>
              </div>
            </div>

            <div class="pendientesToolbarCompact">
              ${isJecReport ? renderJecPendingTabsHtml(ft, allPendingItems, initialVisTab) : `
              <div class="pendientesVisitaTabs" id="pendientesVisitaTabs">
                <button type="button" class="btnVisitaTab ${initialVisTab === 'ALL' ? 'active' : ''}" data-tab="ALL">
                  Todas (${allPendingItems.length})
                </button>
                <button type="button" class="btnVisitaTab ${initialVisTab === 'V1' ? 'active' : ''}" data-tab="V1">
                  V1 (${countV1})
                </button>
                <button type="button" class="btnVisitaTab ${initialVisTab === 'V2' ? 'active' : ''}" data-tab="V2">
                  V2 (${countV2})
                </button>
                <button type="button" class="btnVisitaTab ${initialVisTab === 'V3' ? 'active' : ''}" data-tab="V3">
                  V3 (${countV3})
                </button>
              </div>`}
              <input type="text" id="pendientesSearchInp" placeholder="Buscar colegio pendiente..." class="pendientesSearchCompact">
            </div>

            <div class="comparativaTblWrap" id="pendientesTblWrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:36px;text-align:center">N°</th>
                    <th>Institución Educativa</th>
                    <th style="width:85px;text-align:center">Acción</th>
                  </tr>
                </thead>
                <tbody id="pendientesTbody">
                  ${buildPendingRowsHtml(initialFilteredItems, ft)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
    }
  } else {
    currentReportPendingItems = [];
    currentReportFt = null;
    currentPendingActiveTab = 'ALL';
    cardsHtml = `
      <div class="cards">
        <div class="card"><div class="num">${statsList.length}</div><div class="lbl">Fichas registradas ${vFilter ? `(V${vFilter})` : ''}</div></div>
        <div class="card"><div class="num">${instCount}</div><div class="lbl">Instituciones</div></div>
        ${isAllMode ? `<div class="card"><div class="num">${state.fichaTypes.length}</div><div class="lbl">Tipos de ficha</div></div>` : ''}
        <div class="card"><div class="num">${avgPct === null ? '—' : avgPct + '%'}</div><div class="lbl">Cumplimiento promedio</div></div>
      </div>
    `;
  }

  host.innerHTML = `
    <div id="reportCapture">
      ${cardsHtml}
      <div class="panel"><h3>${panelDistTitle}</h3>${seg}</div>
      ${allTypesSummaryHtml}
      ${!isAllMode ? `<div class="panel"><h3>Reporte por ítem <small>resultado de cada indicador</small></h3>${itemReportHtml}</div>` : ''}
      <div class="panel"><h3>Evolución por N° de visita</h3>${visRows}</div>
      ${targetModality ? secPendientesHtml : `
        <div class="panel"><h3>Resumen por institución</h3>
          <div class="tblWrap"><table><thead><tr><th>Institución</th><th>RED</th><th>UGEL</th><th>N° visitas</th><th>Última visita</th><th>Avance</th></tr></thead><tbody>${instRows}</tbody></table></div>
        </div>
      `}
    </div>
    ${secRegistradasHtml}
  `;

  // Attach handlers in host
  attachReportHostListeners(host, state, getFichaType, dbNs, isAdmin, navigate, user);

  // Restaurar foco y posición del cursor si un input estaba activo
  if (activeId) {
    const elToFocus = document.getElementById(activeId);
    if (elToFocus && document.activeElement !== elToFocus) {
      elToFocus.focus();
      if (selStart !== null && selEnd !== null) {
        try { elToFocus.setSelectionRange(selStart, selEnd); } catch (_) { }
      }
    }
  }
}

function filterCardsInDom(qNorm) {
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

function attachSection1Listeners(secTipo, state, getFichaType, dbNs, isAdmin, navigate, user) {
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
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Botón Cambiar (cuando está colapsado)
  const btnExpandir = secTipo.querySelector('#btnExpandirTipos');
  if (btnExpandir) {
    btnExpandir.addEventListener('click', () => {
      reportesHideTypes = false;
      try { localStorage.setItem('reportes_hide_types', 'false'); } catch (_) { }
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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
      const validVisitas = isFichaEbrGestionEscolar(newFt) ? ['1', '2'] : ['1', '2', '3'];
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

    renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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

function attachSection2Listeners(secFiltros, state, getFichaType, dbNs, isAdmin, navigate, user, statsList) {
  const ft = filtrosReporte.tipo !== '__ALL__' ? getEnrichedFichaType(getFichaType(filtrosReporte.tipo)) : null;
  const isAllMode = !filtrosReporte.tipo || filtrosReporte.tipo === '__ALL__';

  // Botón Cambiar (en encabezado de sección 2)
  const btnCambiar = secFiltros.querySelector('#btnCambiarFichaLink');
  if (btnCambiar) {
    btnCambiar.addEventListener('click', () => {
      reportesHideTypes = false;
      try { localStorage.setItem('reportes_hide_types', 'false'); } catch (_) { }
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Estado
  const filEstado = secFiltros.querySelector('#fil_estado');
  if (filEstado) {
    filEstado.addEventListener('change', (e) => {
      filtrosReporte.estado = e.target.value;
      consFilters.estado = e.target.value;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
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

  // Institución Educativa con autocompletado personalizado tipo Fichas de Monitoreo
  const filInst = secFiltros.querySelector('#fil_inst');
  const dropdown = secFiltros.querySelector('#fil_inst_dropdown');
  if (filInst && dropdown) {
    const showDropdown = () => {
      const q = normalizeText(filInst.value.trim());
      const allColegios = (state.colegios || []).slice();
      const knownNames = new Set(allColegios.map(c => normalizeText(c.ie || c.nombre || '')));
      (state.submissions || []).forEach(s => {
        if (s.institucion) {
          const norm = normalizeText(s.institucion);
          if (norm && !knownNames.has(norm)) {
            knownNames.add(norm);
            allColegios.push({
              id: s.colegioId || s.institucion,
              ie: s.institucion,
              codigoLocal: s.codigoLocal || '',
              red: s.red || s.rei || '',
              director: { nombre: '' },
              modalidad: ''
            });
          }
        }
      });

      const matches = allColegios.filter(c => {
        const ieName = c.ie || c.nombre || '';
        const codLoc = c.codigoLocal || c.codLocal || c.codigoModular || '';
        const redNum = normalizeReiNumber(c.red || c.rei) || c.red || c.rei || '';
        const dirName = (c.director && typeof c.director === 'object') ? (c.director.nombre || '') : (typeof c.director === 'string' ? c.director : '');
        return !q ||
          normalizeText(ieName).includes(q) ||
          normalizeText(codLoc).includes(q) ||
          normalizeText(redNum).includes(q) ||
          normalizeText(dirName).includes(q);
      }).slice(0, 25);

      if (!matches.length) {
        dropdown.innerHTML = '<div style="padding:10px 14px;color:#94A3B8;font-size:12.5px;font-style:italic">No se encontraron instituciones</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = matches.map(c => {
        const ieName = c.ie || c.nombre || '';
        const modTag = c.modalidad ? ` <span class="badge" style="font-size:10px;padding:1px 5px;background:#DEEBF7;color:#2E75B6;margin-left:4px">${esc(c.modalidad)}</span>` : '';
        const codLoc = c.codigoLocal || c.codLocal || c.codigoModular || '';
        const redNum = normalizeReiNumber(c.red || c.rei) || c.red || c.rei || '';
        const dirName = (c.director && typeof c.director === 'object') ? (c.director.nombre || '') : (typeof c.director === 'string' ? c.director : '');
        return `
          <div class="ieDropdownItem" data-ie-name="${esc(ieName)}">
            <div class="ieDropMain">${esc(ieName)}${modTag}</div>
            <div class="ieDropSub">${esc(codLoc)}${redNum ? ' · RED ' + esc(redNum) : ''}${dirName ? ' · Dir: ' + esc(dirName) : ''}</div>
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
            renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
          }
        };
      });
    };

    filInst.addEventListener('input', () => {
      showDropdown();
      if (!filInst.value.trim() && filtrosReporte.institucion) {
        filtrosReporte.institucion = '';
        consFilters.institucion = '';
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
      }
    });

    filInst.addEventListener('focus', () => {
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
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user, null, { keepInputs: true });
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
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
      }
    });
  });

  // Botón Limpiar filtros (restablece todo excepto tipo)
  const btnClearAll = secFiltros.querySelector('#btnClearAllFilters');
  if (btnClearAll) {
    btnClearAll.addEventListener('click', () => {
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
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
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

  // Menú ⋯ Herramientas (Admin)
  const btnHerramientas = secFiltros.querySelector('#btnHerramientas');
  const dropdownHerramientas = secFiltros.querySelector('#herramientasDropdown');
  if (btnHerramientas && dropdownHerramientas) {
    btnHerramientas.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = dropdownHerramientas.style.display !== 'none';
      dropdownHerramientas.style.display = isVisible ? 'none' : 'block';
    });
    document.addEventListener('click', () => {
      if (dropdownHerramientas) dropdownHerramientas.style.display = 'none';
    });
  }

  // Sincronizar UGEL/RED dentro de Herramientas
  const btnBackfill = secFiltros.querySelector('#btnBackfillUgel');
  if (btnBackfill) {
    btnBackfill.addEventListener('click', async () => {
      if (!confirm('¿Deseas buscar en el padrón de colegios y actualizar la UGEL y RED/REI en las fichas registradas que no los tengan? Esto revisará las fichas en la base de datos y completará los campos faltantes a partir del código modular o nombre de la institución.')) return;
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
}

function attachReportHostListeners(host, state, getFichaType, dbNs, isAdmin, navigate, user) {
  // Botón Limpiar filtros en estado vacío de tabla
  const btnEmptyClear = host.querySelector('#btnEmptyClearFilters');
  if (btnEmptyClear) {
    btnEmptyClear.addEventListener('click', () => {
      filtrosReporte = {
        tipo: filtrosReporte.tipo,
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
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Enlace "Ajustar filtros ↑"
  const btnAjustar = host.querySelector('#btnAjustarFiltros');
  if (btnAjustar) {
    btnAjustar.addEventListener('click', (e) => {
      e.preventDefault();
      openReportFiltersDrawer();
    });
  }

  // Expandir / Contraer todo en Reporte por Ítem
  const toggleAllBtn = host.querySelector('#toggleAllItemsBtn');
  const detailsList = host.querySelectorAll('.secDetails');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const anyClosed = Array.from(detailsList).some(d => !d.open);
      detailsList.forEach(d => {
        d.open = anyClosed;
        const summary = d.querySelector('summary');
        if (summary) summary.setAttribute('aria-expanded', anyClosed ? 'true' : 'false');
      });
      toggleAllBtn.textContent = anyClosed ? '⊟ Contraer todo' : '⊞ Expandir todo';
    });
  }

  detailsList.forEach(d => {
    const summary = d.querySelector('summary');
    d.addEventListener('toggle', () => {
      if (summary) {
        summary.setAttribute('aria-expanded', d.open ? 'true' : 'false');
      }
      if (toggleAllBtn) {
        const anyClosed = Array.from(detailsList).some(item => !item.open);
        toggleAllBtn.textContent = anyClosed ? 'Expandir todo' : 'Contraer todo';
      }
    });

    if (summary) {
      summary.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          d.open = !d.open;
        }
      });
    }
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

  // Fila clickeable para detalle
  host.querySelectorAll('tr[data-row]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-del],[data-edit],[data-pdfsub]')) return;
      const id = tr.dataset.row;
      consExpanded = consExpanded === id ? null : id;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
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
      setRegSelectedTypeId(sub.fichaTypeId);
      setRegBuiltFor(null);
      if (navigate) navigate('registrar');
    });
  });

  // Botón ELIMINAR ficha (solo admin)
  host.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta ficha registrada? Esta acción no se puede deshacer.')) return;
      try {
        await dbNs.collection('submissions').doc(btn.dataset.del).delete();
        showToast('Ficha eliminada.');
      } catch (err) {
        console.error(err);
        showToast('No se pudo eliminar.');
      }
    });
  });

  // =========================================================================
  // LISTENERS DEL DIRECTORIO DE COLEGIOS PENDIENTES
  // =========================================================================
  const secPendientes = host.querySelector('#secColegiosPendientes');
  if (secPendientes) {
    const tabBtns = secPendientes.querySelectorAll('.btnVisitaTab');
    const tbody = secPendientes.querySelector('#pendientesTbody');
    const countBadge = secPendientes.querySelector('#pendientesCountBadge');
    const totalCountEl = secPendientes.querySelector('#pendientesTotalCount');
    const searchInp = secPendientes.querySelector('#pendientesSearchInp');
    const btnExportExcel = secPendientes.querySelector('#btnExportPendientesExcel');

    const handleRegistrarClick = (btn) => {
      const colId = btn.dataset.colId;
      const visNum = Number(btn.dataset.vis) || 1;
      const ftId = btn.dataset.ftId || (currentReportFt ? currentReportFt.id : null);
      if (!ftId) return;

      clearEditMode();
      setRegSelectedTypeId(ftId);
      setRegBuiltFor(null);
      setRegSelectedColegioId(colId || null);
      try {
        if (colId) sessionStorage.setItem('reg_prefill_colegioid', colId);
        if (visNum) sessionStorage.setItem('reg_prefill_visita', String(visNum));
      } catch (_) { }
      if (navigate) navigate('registrar');
    };

    const filterAndRenderPendingTable = () => {
      if (!tbody) return;
      const q = searchInp ? normalizeText(searchInp.value.trim()) : '';
      const activeTab = currentPendingActiveTab;

      const filtered = currentReportPendingItems.filter(p => {
        if (activeTab === 'V1' && p.visita !== 1) return false;
        if (activeTab === 'V2' && p.visita !== 2) return false;
        if (activeTab === 'V3' && p.visita !== 3) return false;
        if (q) {
          const matchCol = normalizeText(p.colNombre || '').includes(q);
          const matchLoc = normalizeText(p.codigoLocal || '').includes(q);
          const matchMod = normalizeText(p.codigoModular || '').includes(q);
          const matchRei = normalizeText(p.rei || '').includes(q) || ('rei ' + p.rei).includes(q);
          const matchResp = normalizeText(p.responsable || '').includes(q);
          const matchVis = ('v' + p.visita).includes(q) || ('visita ' + p.visita).includes(q);
          return matchCol || matchLoc || matchMod || matchRei || matchResp || matchVis;
        }
        return true;
      });

      tbody.innerHTML = buildPendingRowsHtml(filtered, currentReportFt);
      if (countBadge) countBadge.textContent = `${filtered.length} pendientes`;
      if (totalCountEl) totalCountEl.textContent = String(filtered.length);

      tbody.querySelectorAll('.btnRegistrarPendiente').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          handleRegistrarClick(btn);
        });
      });
    };

    // Cambio de pestaña de visita (Todas, V1, V2, V3)
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentPendingActiveTab = btn.dataset.tab || 'ALL';
        filterAndRenderPendingTable();
      });
    });

    // Búsqueda en vivo
    if (searchInp) {
      searchInp.addEventListener('input', () => {
        filterAndRenderPendingTable();
      });
    }

    // Botones "Registrar →" iniciales
    tbody?.querySelectorAll('.btnRegistrarPendiente').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleRegistrarClick(btn);
      });
    });

    // Exportación a Excel (.xlsx)
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => {
        if (!currentReportPendingItems || currentReportPendingItems.length === 0) {
          showToast('No hay colegios pendientes para exportar.');
          return;
        }
        const q = searchInp ? normalizeText(searchInp.value.trim()) : '';
        const activeTab = currentPendingActiveTab;
        const exportList = currentReportPendingItems.filter(p => {
          if (activeTab === 'V1' && p.visita !== 1) return false;
          if (activeTab === 'V2' && p.visita !== 2) return false;
          if (activeTab === 'V3' && p.visita !== 3) return false;
          if (q) {
            const matchCol = normalizeText(p.colNombre || '').includes(q);
            const matchLoc = normalizeText(p.codigoLocal || '').includes(q);
            const matchMod = normalizeText(p.codigoModular || '').includes(q);
            const matchRei = normalizeText(p.rei || '').includes(q) || ('rei ' + p.rei).includes(q);
            const matchResp = normalizeText(p.responsable || '').includes(q);
            const matchVis = ('v' + p.visita).includes(q) || ('visita ' + p.visita).includes(q);
            return matchCol || matchLoc || matchMod || matchRei || matchResp || matchVis;
          }
          return true;
        });

        const tabSuffix = activeTab !== 'ALL' ? `_${activeTab}` : '';
        const ftNameSlug = currentReportFt ? (currentReportFt.nombreCorto || currentReportFt.nombre || 'ficha').replace(/[^a-z0-9]+/gi, '_').toLowerCase() : 'colegios';
        const fileName = `colegios_pendientes_${ftNameSlug}${tabSuffix}.xlsx`;

        const headers = ['N°', 'Institución Educativa', 'Cód. Local', 'Cód. Modular', 'Distrito', 'REI', 'Visita', 'Detalle / Estado', 'Especialista Responsable'];
        const rowsData = exportList.map((p, idx) => [
          idx + 1,
          p.colNombre,
          p.codigoLocal || '',
          p.codigoModular || '',
          p.distrito || '',
          p.rei && p.rei !== '—' ? ('REI ' + p.rei) : 'Sin REI',
          `Visita ${p.visita} (${p.visitaLabel})`,
          p.detailPending || (p.parcial ? 'Parcial' : 'Pendiente'),
          p.responsable
        ]);

        if (typeof XLSX !== 'undefined') {
          const ws = XLSX.utils.aoa_to_sheet([headers, ...rowsData]);
          ws['!cols'] = [
            { wch: 6 },
            { wch: 42 },
            { wch: 14 },
            { wch: 14 },
            { wch: 18 },
            { wch: 12 },
            { wch: 22 },
            { wch: 24 },
            { wch: 38 }
          ];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
          XLSX.writeFile(wb, fileName);
          showToast(`Descargando ${exportList.length} colegios pendientes en Excel...`);
        } else {
          downloadCsv(fileName.replace(/\.xlsx$/i, '.csv'), headers, rowsData);
        }
      });
    }
  }

  // Clic en botón para abrir modal de gestión JEC directamente desde el reporte
  host.querySelectorAll('.btnAbrirGestionJecDirecto').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModalGestionJec(state, dbNs, () => {
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, currentUser, options);
      });
    });
  });

  // Clic en KPI de IEs Pendientes para scroll suave
  const kpiCard = host.querySelector('#kpiCardIesPendientes');
  if (kpiCard) {
    kpiCard.addEventListener('click', () => {
      const targetSec = host.querySelector('#secComparativaColegios') || host.querySelector('#secColegiosPendientes');
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}

function buildDetail(s) {
  const isCoordTutoria = (s.fichaTypeId === 'ft_coord_tutoria_jec' || (s.fichaTypeNombre || '').toLowerCase().includes('tutor'));
  const isJec = !isCoordTutoria && (s.fichaTypeId === 'ft_msejec_2do' || s.fichaTypeId === 'ft_jec' || (s.fichaTypeNombre || '').toLowerCase().includes('jec') || !!s.docentes_monitoreo);

  let ebrGestionBanner = '';
  const isEbr = isFichaEbrGestionEscolar(s);
  if (isEbr) {
    const v = getMomentoVisitaEbr(s);
    const maxPts = v === 2 ? 69 : 57;
    let puntaje = (s.puntaje !== undefined && s.puntaje !== null) ? Number(s.puntaje) : null;
    if ((puntaje === null || puntaje > maxPts) && Array.isArray(s.respuestas) && s.respuestas.length > 0) {
      let pSum = 0;
      let itemsAnswered = 0;
      const seenNums = new Set();
      const maxCount = v === 2 ? 23 : 19;
      s.respuestas.forEach(r => {
        let num = r?.num;
        if (!num && r?.id) {
          const m = String(r.id).match(/^(?:ge\d*|num)_?(\d+)$/);
          if (m) num = parseInt(m[1], 10);
        }
        if (num && num >= 1 && num <= maxCount && !seenNums.has(num)) {
          seenNums.add(num);
          const vL = String(r?.valor || '').toLowerCase();
          if (vL === 'logrado' || vL === 'si') { pSum += 3; itemsAnswered++; }
          else if (vL === 'proceso') { pSum += 2; itemsAnswered++; }
          else if (vL === 'inicio' || vL === 'no') { pSum += 1; itemsAnswered++; }
        }
      });
      puntaje = Math.min(maxPts, pSum);
      s._tempItemsAnswered = itemsAnswered;
    } else if (puntaje !== null && puntaje > maxPts) {
      puntaje = maxPts;
    }

    let maxAplicable = null;
    if (s._tempItemsAnswered > 0 && s._tempItemsAnswered < (v === 2 ? 23 : 19)) {
      maxAplicable = s._tempItemsAnswered * 3;
    }

    if (puntaje === null) puntaje = 0;
    const nivelObj = getNivelEbrGestion(puntaje, v, maxAplicable);
    const momentoStr = v === 2 ? '2.° Momento (Visita 2 · 23 ítems · Máx 69 pts)' : '1.er Momento (Visita 1 · 19 ítems · Máx 57 pts)';

    ebrGestionBanner = `
      <div style="margin-bottom:14px;padding:14px 16px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Nivel de Cumplimiento · Gestión Escolar EBR (${momentoStr})</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(nivelObj.nivel)} (${puntaje} / ${maxPts} pts · ${nivelObj.pct}%)</div>
          </div>
          <div>
            <span class="badge ${esc(nivelObj.cls)}" style="font-size:13px;padding:6px 14px;font-weight:800;background:${nivelObj.color};color:#ffffff">${esc(nivelObj.nivel)}</span>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;font-size:11.5px;border-collapse:collapse;margin-top:6px">
            <thead>
              <tr style="background:var(--surface-sunken,#f8fafc);color:var(--text-muted,#64748b);text-align:left">
                <th style="padding:5px 8px;width:25%">Nivel Oficial</th>
                <th style="padding:5px 8px;width:25%;text-align:center">Rango de Puntaje</th>
                <th style="padding:5px 8px;width:50%">Criterio pedagógico</th>
              </tr>
            </thead>
            <tbody>
              <tr style="${puntaje >= (v === 2 ? 47 : 39) ? 'background:rgba(22,163,74,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#16a34a">LOGRADO ${puntaje >= (v === 2 ? 47 : 39) ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">${v === 2 ? 'De 47 a 69 pts' : 'De 39 a 57 pts'}</td>
                <td style="padding:5px 8px">Evidencia nivel óptimo en las condiciones y compromisos de gestión escolar.</td>
              </tr>
              <tr style="${puntaje >= (v === 2 ? 24 : 20) && puntaje <= (v === 2 ? 46 : 38) ? 'background:rgba(217,119,6,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#d97706">PROCESO ${puntaje >= (v === 2 ? 24 : 20) && puntaje <= (v === 2 ? 46 : 38) ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">${v === 2 ? 'De 24 a 46 pts' : 'De 20 a 38 pts'}</td>
                <td style="padding:5px 8px">En proceso de implementación; requiere consolidar acciones de mejora.</td>
              </tr>
              <tr style="${puntaje <= (v === 2 ? 23 : 19) ? 'background:rgba(220,38,38,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#dc2626">INICIO ${puntaje <= (v === 2 ? 23 : 19) ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">${v === 2 ? 'De 0 a 23 pts' : 'De 0 a 19 pts'}</td>
                <td style="padding:5px 8px">Requiere asistencia técnica prioritaria para el cumplimiento de condiciones.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  let coordTutoriaBanner = '';
  if (isCoordTutoria) {
    let puntaje = s.puntaje;
    if (puntaje === undefined || puntaje === null) {
      puntaje = (s.respuestas || []).reduce((acc, r) => {
        const v = Number(r.valor);
        return !isNaN(v) && v >= 1 && v <= 3 ? acc + v : acc;
      }, 0);
    }
    const nivelInfo = getNivelCoordTutoriaJec(puntaje);
    const nivelLabel = s.nivel_cumplimiento || nivelInfo.nivel;
    const nivelDesc = s.descripcion_cumplimiento || nivelInfo.descripcion;
    const nivelCls = nivelInfo.cls;
    const pct = Math.round((puntaje / 63) * 100);

    coordTutoriaBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Nivel de Cumplimiento Oficial (Funciones del Coordinador(a) de Tutoría JEC)</span>
            <div style="font-size:18px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(nivelLabel)}</div>
          </div>
          <div style="text-align:right">
            <span class="badge ${esc(nivelCls)}" style="font-size:13px;padding:5px 14px;font-weight:700">${esc(nivelLabel)}</span>
            <div style="font-size:12px;color:var(--text-muted,#64748b);margin-top:3px;font-weight:700">${puntaje} de 63 puntos (${pct}%)</div>
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--text-800,#1e293b);background:var(--surface-sunken,#f8fafc);padding:8px 12px;border-radius:6px;margin:0 0 10px 0;border-left:3px solid var(--primary,#2563eb)">
          <strong>Criterio oficial:</strong> ${esc(nivelDesc)}
        </p>
        <div class="tblWrap" style="margin-top:8px">
          <table class="dataTable" style="font-size:11.5px;width:100%;border-collapse:collapse;text-align:left">
            <thead>
              <tr style="background:var(--surface-sunken,#f1f5f9)">
                <th style="padding:5px 8px;width:25%">Nivel de cumplimiento</th>
                <th style="padding:5px 8px;width:20%;text-align:center">Puntaje</th>
                <th style="padding:5px 8px;width:55%">Descripción oficial de la función</th>
              </tr>
            </thead>
            <tbody>
              <tr style="${puntaje >= 53 ? 'background:rgba(22,163,74,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#16a34a">Cumple ${puntaje >= 53 ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">De 53 a 63</td>
                <td style="padding:5px 8px">El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.</td>
              </tr>
              <tr style="${puntaje >= 42 && puntaje <= 52 ? 'background:rgba(217,119,6,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#d97706">Cumple parcialmente ${puntaje >= 42 && puntaje <= 52 ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">De 42 a 52</td>
                <td style="padding:5px 8px">El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.</td>
              </tr>
              <tr style="${puntaje < 42 ? 'background:rgba(220,38,38,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#dc2626">No cumple ${puntaje < 42 ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">De 21 a 41</td>
                <td style="padding:5px 8px">El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  let jecNivelBanner = '';
  if (isJec) {
    const totalSi = s.conteo_si !== undefined
      ? s.conteo_si
      : (s.respuestas || []).filter(r => (r.valor || '').toLowerCase() === 'si' || (r.valor || '').toLowerCase() === 'sí').length;
    const nivelObj = getNivelLogroJec(totalSi);
    jecNivelBanner = `
      <div style="margin-bottom:14px;padding:12px 16px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Nivel de Implementación del MSE JEC</span>
          <div style="font-size:16px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(nivelObj.nivel)}</div>
        </div>
        <div style="text-align:right">
          <span class="badge ${esc(nivelObj.cls)}" style="font-size:12.5px;padding:5px 12px;font-weight:700">${esc(nivelObj.nivel)}</span>
          <div style="font-size:11.5px;color:var(--text-muted,#64748b);margin-top:3px;font-weight:600">${totalSi} de 31 respuestas "Sí"</div>
        </div>
      </div>
    `;
  }

  let cebeBanner = '';
  const isCebe = isFichaCebeGestion(s);
  if (isCebe) {
    const v = Number(s.visita) || 1;
    const puntaje = (s.puntaje !== undefined && s.puntaje !== null) ? Number(s.puntaje) : 0;
    const pct = (s.porcentaje !== undefined && s.porcentaje !== null) ? Number(s.porcentaje) : Math.round((puntaje / 34) * 100);
    const estado = s.estado || (pct >= 67 ? 'Logrado' : (pct >= 34 ? 'En proceso' : 'Inicio'));
    let estadoColor = '#16a34a';
    let estadoCls = 'st-logrado';
    if (estado === 'En proceso' || String(estado).toLowerCase().includes('proces')) { estadoColor = '#d97706'; estadoCls = 'st-proceso'; }
    else if (estado === 'Inicio' || String(estado).toLowerCase().includes('inic')) { estadoColor = '#dc2626'; estadoCls = 'st-inicio'; }

    let personalHtml = '';
    const tp = s.tablasPersonal || {};
    if (tp.personal || tp.personalSaanee || tp.accesoEstudiantes) {
      personalHtml = `
        <div style="margin-top:12px;margin-bottom:12px;padding:12px;background:var(--surface-sunken,#f8fafc);border-radius:6px;border:1px solid var(--border-soft,#e2e8f0)">
          <div style="font-weight:700;font-size:12px;color:var(--text-900,#0f172a);margin-bottom:6px">I. Cuadros Estadísticos del CEBE</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--text-700,#334155)">
            <div><strong>Estudiantes Inicial:</strong> Matr. ${tp.accesoEstudiantes?.ini_mat || '0'} · Asist. ${tp.accesoEstudiantes?.ini_asis || '0'}</div>
            <div>·</div>
            <div><strong>Estudiantes Primaria:</strong> Matr. ${tp.accesoEstudiantes?.pri_mat || '0'} · Asist. ${tp.accesoEstudiantes?.pri_asis || '0'}</div>
            <div>·</div>
            <div><strong>SAANEE Total:</strong> ${tp.personalSaanee?.saanee_nombrados_tot || '0'} nombrados</div>
          </div>
        </div>
      `;
    }

    let sintesisTableHtml = '';
    const spv = s.sintesisPorVisita;
    if (spv && (spv.v1?.logros || spv.v2?.logros || spv.v3?.logros || spv.v1?.mejoras || spv.v2?.mejoras || spv.v3?.mejoras || spv.v1?.recomendaciones || spv.v2?.recomendaciones || spv.v3?.recomendaciones)) {
      sintesisTableHtml = `
        <div style="margin-top:14px;margin-bottom:12px">
          <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;color:var(--text-900,#0f172a)">IV. Logros, Aspectos de Mejora y Recomendaciones (Por Visita)</div>
          <div style="overflow-x:auto">
            <table class="dataTable" style="font-size:11.5px;width:100%;border-collapse:collapse;text-align:left">
              <thead>
                <tr style="background:var(--surface-sunken,#f1f5f9)">
                  <th style="padding:6px;width:22%">Aspecto</th>
                  <th style="padding:6px;width:26%">Visita 1</th>
                  <th style="padding:6px;width:26%">Visita 2</th>
                  <th style="padding:6px;width:26%">Visita 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Logros observados</td>
                  <td style="padding:6px">${esc(spv.v1?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.logros || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Aspectos de mejora</td>
                  <td style="padding:6px">${esc(spv.v1?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.mejoras || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Recomendaciones</td>
                  <td style="padding:6px">${esc(spv.v1?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.recomendaciones || '—')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    let compromisosHtml = '';
    const cpv = s.compromisosPorVisita;
    const kAct = `v${v}`;
    const compActivo = cpv?.[kAct] || {};
    if (compActivo.director || compActivo.especialista) {
      compromisosHtml = `
        <div style="margin-top:12px;margin-bottom:12px;background:var(--surface-sunken,#f8fafc);padding:10px 14px;border-radius:6px;border-left:3px solid #1e40af">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px;color:#1e40af">V. Compromisos de Mejora · Visita ${v}</div>
          ${compActivo.director ? `<div style="font-size:11.5px;margin-bottom:3px"><strong>Directivo(a):</strong> ${esc(compActivo.director)}</div>` : ''}
          ${compActivo.especialista ? `<div style="font-size:11.5px"><strong>Especialista AGEBRE:</strong> ${esc(compActivo.especialista)}</div>` : ''}
        </div>
      `;
    }

    cebeBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Gestión Escolar CEBE · RM N° 501-2025-MINEDU</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">Visita ${v} de 3 · ${esc(estado)} (${puntaje} / 34 pts · ${pct}%)</div>
          </div>
          <div>
            <span class="badge ${esc(estadoCls)}" style="font-size:13px;padding:5px 14px;font-weight:700;background:${estadoColor};color:#ffffff">${esc(estado)}</span>
          </div>
        </div>
        ${personalHtml}
        ${sintesisTableHtml}
        ${compromisosHtml}
      </div>
    `;
  }

  let priteBanner = '';
  const isPrite = isFichaPriteGestion(s);
  if (isPrite) {
    const v = Number(s.visita) || 1;
    const puntaje = (s.puntaje !== undefined && s.puntaje !== null) ? Number(s.puntaje) : 0;
    const pct = (s.porcentaje !== undefined && s.porcentaje !== null) ? Number(s.porcentaje) : Math.round((puntaje / 32) * 100);
    const estado = s.estado || (pct >= 67 ? 'Logrado' : (pct >= 34 ? 'En proceso' : 'Inicio'));
    let estadoColor = '#16a34a';
    let estadoCls = 'st-logrado';
    if (estado === 'En proceso' || String(estado).toLowerCase().includes('proces')) { estadoColor = '#d97706'; estadoCls = 'st-proceso'; }
    else if (estado === 'Inicio' || String(estado).toLowerCase().includes('inic')) { estadoColor = '#dc2626'; estadoCls = 'st-inicio'; }

    let personalHtml = '';
    const tp = s.tablasPersonal || {};
    if (tp.personal || tp.accesoEstudiantes) {
      personalHtml = `
        <div style="margin-top:12px;margin-bottom:12px;padding:12px;background:var(--surface-sunken,#f8fafc);border-radius:6px;border:1px solid var(--border-soft,#e2e8f0)">
          <div style="font-weight:700;font-size:12px;color:var(--text-900,#0f172a);margin-bottom:6px">I. Cuadros Estadísticos del PRITE</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--text-700,#334155)">
            <div><strong>Estudiantes Inicial:</strong> Matr. ${tp.accesoEstudiantes?.ini_mat || '0'} · Asist. ${tp.accesoEstudiantes?.ini_asis || '0'}</div>
            <div>·</div>
            <div><strong>Directora:</strong> ${tp.personal?.directora_tot || '0'} (Asist. ${tp.personal?.directora_asis || '0'})</div>
            <div>·</div>
            <div><strong>Tutores:</strong> ${Number(tp.personal?.tutores_nom_tot || 0) + Number(tp.personal?.tutores_cont_tot || 0)} (Nombrados: ${tp.personal?.tutores_nom_tot || '0'}, Contratados: ${tp.personal?.tutores_cont_tot || '0'})</div>
            <div>·</div>
            <div><strong>CAS:</strong> ${tp.personal?.prof_cas_tot || '0'} · <strong>Administrativo:</strong> ${tp.personal?.personal_adm_tot || '0'}</div>
          </div>
        </div>
      `;
    }

    let sintesisTableHtml = '';
    const spv = s.sintesisPorVisita;
    if (spv && (spv.v1?.logros || spv.v2?.logros || spv.v3?.logros || spv.v1?.mejoras || spv.v2?.mejoras || spv.v3?.mejoras || spv.v1?.recomendaciones || spv.v2?.recomendaciones || spv.v3?.recomendaciones)) {
      sintesisTableHtml = `
        <div style="margin-top:14px;margin-bottom:12px">
          <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;color:var(--text-900,#0f172a)">IV. Logros, Aspectos de Mejora y Recomendaciones (Por Visita)</div>
          <div style="overflow-x:auto">
            <table class="dataTable" style="font-size:11.5px;width:100%;border-collapse:collapse;text-align:left">
              <thead>
                <tr style="background:var(--surface-sunken,#f1f5f9)">
                  <th style="padding:6px;width:22%">Aspecto</th>
                  <th style="padding:6px;width:26%">Visita 1</th>
                  <th style="padding:6px;width:26%">Visita 2</th>
                  <th style="padding:6px;width:26%">Visita 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Logros observados</td>
                  <td style="padding:6px">${esc(spv.v1?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.logros || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Aspectos de mejora</td>
                  <td style="padding:6px">${esc(spv.v1?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.mejoras || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Recomendaciones</td>
                  <td style="padding:6px">${esc(spv.v1?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.recomendaciones || '—')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    let compromisosHtml = '';
    const cpv = s.compromisosPorVisita;
    const kAct = `v${v}`;
    const compActivo = cpv?.[kAct] || {};
    if (compActivo.director || compActivo.especialista) {
      compromisosHtml = `
        <div style="margin-top:12px;margin-bottom:12px;background:var(--surface-sunken,#f8fafc);padding:10px 14px;border-radius:6px;border-left:3px solid #1e40af">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px;color:#1e40af">V. Compromisos de Mejora · Visita ${v}</div>
          ${compActivo.director ? `<div style="font-size:11.5px;margin-bottom:3px"><strong>Directivo(a):</strong> ${esc(compActivo.director)}</div>` : ''}
          ${compActivo.especialista ? `<div style="font-size:11.5px"><strong>Especialista AGEBRE:</strong> ${esc(compActivo.especialista)}</div>` : ''}
        </div>
      `;
    }

    priteBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Gestión Escolar PRITE · RM N° 501-2025-MINEDU</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">Visita ${v} de 3 · ${esc(estado)} (${puntaje} / 32 pts · ${pct}%)</div>
          </div>
          <div>
            <span class="badge ${esc(estadoCls)}" style="font-size:13px;padding:5px 14px;font-weight:700;background:${estadoColor};color:#ffffff">${esc(estado)}</span>
          </div>
        </div>
        ${personalHtml}
        ${sintesisTableHtml}
        ${compromisosHtml}
      </div>
    `;
  }

  const items = (s.respuestas || []).map(r => {
    const opt = (RESPONSE_OPTIONS[s.tipoRespuesta] || []).find(o => o.v === r.valor);
    const evidText = r.evidencia || r.hallazgo;
    const hallazgoHtml = evidText ? `<div style="margin-top:6px;font-size:11.5px;color:var(--text-800,#1e293b);background:var(--surface-sunken,#f8fafc);padding:5px 10px;border-radius:4px;border-left:3px solid var(--primary,#2563eb)"><strong>${r.evidencia ? '📎 Evidencia:' : 'Hallazgo:'}</strong> ${esc(evidText)}</div>` : '';
    return '<div class="itemRow"><div class="itxt"><strong style="font-weight:600;color:var(--ink-soft);font-size:11.5px">' + esc(r.seccion) + '</strong><br>' + esc(r.texto) + hallazgoHtml + '</div><div class="optGroup"><span class="badge st-none" style="color:var(--ink)">' + esc(opt ? opt.l : r.valor) + '</span></div></div>';
  }).join('') || '<p class="helpText">Sin respuestas registradas.</p>';

  let docentesTableHtml = '';
  if (s.docentes_monitoreo) {
    const renderMiniGrid = (title, m) => {
      if (!m) return '';
      const rubros = ['r1', 'r2', 'r3', 'r4', 'r5'];
      const headers = ['R1', 'R2', 'R3', 'R4', 'R5'];
      const qCells = rubros.map(r => [1, 2, 3, 4].map(n => `<td style="padding:4px;text-align:center">${m[r]?.[`c${n}`] ?? 0}</td>`).join('')).join('');
      const pCells = rubros.map(r => [1, 2, 3, 4].map(n => `<td style="padding:4px;text-align:center;font-size:10px;color:var(--text-muted,#64748b)">${m[r]?.[`p${n}`] ?? 0}%</td>`).join('')).join('');
      return `
        <div style="margin-top:10px;margin-bottom:12px">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px;color:var(--text-900,#0f172a)">
            ${esc(title)} — Total docentes: <strong>${m.total_docentes || 0}</strong> | Monitoreados: <strong>${m.docentes_monitoreados || 0}</strong> (${m.pct_monitoreados || 0}%) | No monitoreados: <strong>${m.docentes_no_monitoreados || 0}</strong> (${m.pct_no_monitoreados || 0}%)
          </div>
          <div style="overflow-x:auto">
            <table class="dataTable" style="font-size:11px;text-align:center;width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th rowspan="2" style="padding:4px;background:var(--surface-sunken,#f1f5f9)">Datos</th>
                  ${headers.map(h => `<th colspan="4" style="padding:4px;background:var(--surface-sunken,#f1f5f9)">${h}</th>`).join('')}
                </tr>
                <tr>
                  ${headers.map(() => `<th style="padding:2px;font-size:10px">I</th><th style="padding:2px;font-size:10px">II</th><th style="padding:2px;font-size:10px">III</th><th style="padding:2px;font-size:10px">IV</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr><td style="font-weight:600;padding:4px;text-align:left">Cant.</td>${qCells}</tr>
                <tr><td style="font-weight:600;padding:4px;text-align:left;color:var(--text-muted)">%</td>${pCells}</tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    };
    docentesTableHtml = '<div class="sectionTitle" style="margin-top:14px">V. Data de docentes monitoreados a la fecha de la visita nivel secundaria</div>' +
      renderMiniGrid('a) 1er monitoreo', s.docentes_monitoreo.m1) +
      renderMiniGrid('b) 2do monitoreo', s.docentes_monitoreo.m2);
  }

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
    ebrGestionBanner +
    coordTutoriaBanner +
    coordPedagogicoBanner +
    jecNivelBanner +
    cebeBanner +
    priteBanner +
    (extras ? '<div class="sectionTitle" style="margin-top:0">Datos generales de la ficha</div>' + extras : '') +
    legacyHtml +
    docentesTableHtml +
    '<div class="sectionTitle" style="margin-top:14px">Respuestas y Hallazgos</div>' + items +
    (s.observaciones ? '<div class="sectionTitle">Observaciones</div><p style="font-size:13px">' + esc(s.observaciones) + '</p>' : '') +
    (comps ? '<div class="sectionTitle">Compromisos de mejora</div><ul style="margin:0;padding-left:18px;font-size:13px">' + comps + '</ul>' : '');
}

async function exportCsv(ft, statsList) {
  const isCoord = isFichaCoordTutoriaJec(ft);
  const isCoordPedag = isFichaCoordPedagogico(ft);
  const isEbr = isFichaEbrGestionEscolar(ft);
  const header = ['Fecha', 'Institución', 'UGEL', 'Código', 'Visita', 'Responsable', 'Director', isCoord ? 'Puntaje (de 63)' : (isCoordPedag ? 'Puntaje (de 51)' : (isEbr ? 'Puntaje Obtenido' : '% Cumplimiento')), (isCoord || isCoordPedag || isEbr) ? '% Equivalente' : '', 'Nivel / Estado', 'Datos adicionales', 'Observaciones', 'Compromisos'].filter(Boolean);
  const rows = statsList.map(x => {
    const s = x.s, st = x.st;
    const extras = (s.extras || []).map(e => e.label + ': ' + e.value).join(' | ');
    const comps = (Array.isArray(s.compromisos) ? s.compromisos : Array.isArray(s.compromisosList) ? s.compromisosList : []).map(c => c.texto).join(' | ');
    let subResp = getSubmissionResponsable(s, getAppState(), getSessionUser());
    if (!subResp || /^\d+$/.test(subResp) || subResp.includes('@') || subResp === '—') {
      subResp = (s.responsable && !/^\d+$/.test(String(s.responsable).trim()) && !String(s.responsable).includes('@')) ? String(s.responsable).trim() : '';
    }
    const stLabel = (st && st.estado && st.estado.label) ? st.estado.label : statusFromPct(st.pct, ft, st?.conteo_si, st?.puntaje, s?.visita).label;
    if (isCoord) {
      const pts = (st.puntaje !== undefined && st.puntaje !== null) ? st.puntaje : (s.puntaje || '');
      return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, s.director, pts, (st.pct === null ? '' : st.pct + '%'), stLabel, extras, s.observaciones, comps];
    }
    if (isCoordPedag) {
      const pts = (st.puntaje !== undefined && st.puntaje !== null) ? st.puntaje : (s.puntaje || '');
      return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, s.director, pts, (st.pct === null ? '' : st.pct + '%'), stLabel, extras, s.observaciones, comps];
    }
    if (isEbr) {
      const v = getMomentoVisitaEbr(s);
      const maxPts = v === 2 ? 69 : 57;
      const pts = (st.puntaje !== undefined && st.puntaje !== null) ? st.puntaje : (s.puntaje || '');
      const ptsStr = pts !== '' ? `${pts}/${maxPts}` : '';
      return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, s.director, ptsStr, (st.pct === null ? '' : st.pct + '%'), stLabel, extras, s.observaciones, comps];
    }
    return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, s.director, (st.pct === null ? '' : st.pct), stLabel, extras, s.observaciones, comps];
  });
  downloadCsv((ft.nombre || 'reporte').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.csv', header, rows);
}

