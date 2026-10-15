/* =========================================================================
   ui.js — Manejo del DOM, eventos, renderizado de vistas, pestañas y modales.
   ========================================================================= */

/* ── Módulos desfragmentados de UI ─────────────────────────────────────── */
import {
  esc,
  genId,
  todayStr,
  fmtDate,
  showToast,
  normalizeText,
  normalizeInstName,
  normalizeReiNumber,
  normalizeReiList,
  seedSuggestions,
  csvEscape,
  downloadCsv,
  lockBodyScroll,
  unlockBodyScroll,
  forceResetBodyScroll,
  cleanForFirestore
} from './ui/core-utils.js?v=20261015_v1';

export {
  esc,
  genId,
  todayStr,
  fmtDate,
  showToast,
  normalizeText,
  normalizeInstName,
  normalizeReiNumber,
  normalizeReiList,
  seedSuggestions,
  csvEscape,
  downloadCsv,
  lockBodyScroll,
  unlockBodyScroll,
  forceResetBodyScroll,
  cleanForFirestore
};

import {
  RESP_FIELD_ALIASES,
  docIdForResponsable,
  sanitizeResponsableRecord,
  downloadPlantillaResponsablesExcel,
  parseResponsablesExcel,
  renderResponsablesTab
} from './ui/responsables-tab.js?v=20261015_v1';

export {
  RESP_FIELD_ALIASES,
  docIdForResponsable,
  sanitizeResponsableRecord,
  downloadPlantillaResponsablesExcel,
  parseResponsablesExcel,
  renderResponsablesTab
};

import {
  COLEGIO_FIELD_LABELS,
  INST_FIELD_ALIASES,
  downloadPlantillaExcel,
  sanitizeColegioRecord,
  docIdForCodigo,
  parseInstitucionesExcel,
  renderColegiosTab,
  buildColegioIndex,
  matchColegio,
  groupSubmissionsByColegio,
  colegioFichaTypeStats
} from './ui/colegios-tab.js?v=20261015_v1';

export {
  COLEGIO_FIELD_LABELS,
  INST_FIELD_ALIASES,
  downloadPlantillaExcel,
  sanitizeColegioRecord,
  docIdForCodigo,
  parseInstitucionesExcel,
  renderColegiosTab,
  buildColegioIndex,
  matchColegio,
  groupSubmissionsByColegio,
  colegioFichaTypeStats
};

import {
  SEED_CONCURSOS_DEFAULTS,
  isJedpaConcurso,
  getConcursoAsesorRoles,
  getConcursoParticipanteRoles,
  normalizeGenero,
  formatGeneroDisplay,
  getPodioFields,
  getPodioKey,
  getPodioLabel,
  getPodioLockDocId,
  getConcursoSubTab,
  setConcursoSubTab,
  getSelectedCategorias,
  setSelectedCategorias,
  renderConcursosTab,
  renderConcursoConsolidadoView,
  CONCURSO_TIPO_ID_MAP,
  openConsolidarCuerpoTecnicoModal
} from './ui/concursos-tab.js?v=20261015_v1';

export {
  SEED_CONCURSOS_DEFAULTS,
  isJedpaConcurso,
  getConcursoAsesorRoles,
  getConcursoParticipanteRoles,
  normalizeGenero,
  formatGeneroDisplay,
  getPodioFields,
  getPodioKey,
  getPodioLabel,
  getPodioLockDocId,
  getConcursoSubTab,
  setConcursoSubTab,
  getSelectedCategorias,
  setSelectedCategorias,
  renderConcursosTab,
  renderConcursoConsolidadoView,
  CONCURSO_TIPO_ID_MAP,
  openConsolidarCuerpoTecnicoModal
};

/* ── Fase 1: Motor de cálculo puro (sin DOM) ───────────────────────────── */
import {
  calcScore,
  estadoPorRegla,
  REGLA_NIVEL_JEC,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  REGLA_NIVEL_EBR_GESTION_M1,
  REGLA_NIVEL_EBR_GESTION_M2,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  ESPECIALISTA_JEC_OFICIAL,
  getNivelCoordTutoriaJec,
  isFichaEbrGestionEscolar,
  isFichaEbrEbePrite,
  getReglaNivelComunEbrEbePrite,
  getReglaNivelEbrGestion,
  getNivelEbrGestion,
  getMomentoVisitaEbr
} from './calcEngine.js?v=20261013_v2';
import * as RepDatos from './reportes-datos.js?v=20261013_v2';
import { verifyAdminPassword } from './auth.js?v=20260918_v11';

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
} from './pdf-template.js?v=20261015_v1';

import {
  renderEbrGestionForm,
  collectEbrGestionFormData,
  preloadEbrFormState,
  resetEbrFormState,
  EBR_GESTION_VISITA_1_SECCIONES,
  EBR_GESTION_VISITA_2_SECCIONES,
  EBR_GESTION_VISITA_3_SECCIONES,
  getEbrSeccionesForVisita
} from './ebr-gestion.js?v=20261015_v1';

import {
  isFichaJec,
  renderJecForm,
  collectJecFormData,
  preloadJecFormState,
  resetJecFormState,
  JEC_SECCIONES,
  getNivelLogroJec
} from './jec-monitoreo.js?v=20261015_v1';

import {
  syncDirectivosFromFicha,
  getDirectivosForColegio,
  getDirectivosActivosForColegio
} from './directorio.js?v=20261015_v1';

import { exportarMatrizSeguimiento } from './exportarMatriz.js?v=20260930_v4';
import { exportarTableroEBRCompleto } from './exportarTableroEBR.js?v=20261001_v1';
import {
  isFichaCebeGestion,
  renderCebeGestionForm,
  preloadCebeFormState,
  resetCebeFormState,
  guardarFormularioCebe,
  CEBE_SECCIONES
} from './cebe-gestion.js?v=20261015_v1';
import {
  isFichaPriteGestion,
  renderPriteGestionForm,
  preloadPriteFormState,
  resetPriteFormState,
  guardarFormularioPrite,
  PRITE_SECCIONES
} from './prite-gestion.js?v=20261015_v1';
import { PLANTILLAS_BASE_OFICIALES } from './catalogo-plantillas-base.js';


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

/** Limpia el modo edición para iniciar un nuevo registro limpio */
export function clearEditMode() {
  editingSubmissionId = null;
  editingSubmissionData = null;
}

/* ============================= UTILIDADES (ver ./ui/core-utils.js) ============================= */
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
 * @param {number} [puntaje] - Opcional: puntaje total sumado (ej. 21 a 63)
 */
export function statusFromPct(pct, fichaType, conteo_si, puntaje, visita) {
  let regla = (fichaType && fichaType.regla_nivel) ? fichaType.regla_nivel : null;
  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  if (isFichaEbrGestionEscolar(fichaType)) {
    const v = visita || getMomentoVisitaEbr(fichaType);
    regla = getReglaNivelEbrGestion(v);
  } else if (!isJec && (isFichaEbrEbePrite(fichaType) || isFichaCebeGestion(fichaType) || isFichaPriteGestion(fichaType) || fichaType?.escala === 'IPL' || fichaType?.tipoRespuesta === 'ips')) {
    const totalItems = (fichaType?.secciones || []).reduce((acc, s) => acc + (s.items || []).length, 0) || 25;
    regla = getReglaNivelComunEbrEbePrite(totalItems);
  } else if (!regla && isFichaCoordTutoriaJec(fichaType)) {
    regla = REGLA_NIVEL_COORD_TUTORIA_JEC;
  } else if (!regla && isFichaJec(fichaType)) {
    regla = REGLA_NIVEL_JEC;
  }
  const estado = estadoPorRegla({ pct: pct ?? null, conteo_si: conteo_si || 0, puntaje: puntaje ?? null }, regla);
  return {
    label: estado.nivel,
    estado_panel: estado.estado_panel,
    cls: estado.cls,
    descripcion: estado.descripcion || '',
    puntaje: estado.puntaje
  };
}
export function colorForPct(pct, fichaType = null) {
  if (pct === null || pct === undefined) return 'var(--neutral)';
  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  if (!isJec && (isFichaEbrGestionEscolar(fichaType) || isFichaEbrEbePrite(fichaType) || isFichaCebeGestion(fichaType) || isFichaPriteGestion(fichaType) || !fichaType)) {
    if (pct >= 67) return 'var(--ok)';
    if (pct >= 34) return 'var(--warn)';
    return 'var(--danger)';
  }
  if (pct >= 85) return 'var(--ok)';
  if (pct >= 70) return 'var(--warn)';
  return 'var(--danger)';
}
/* (normalizeText, normalizeInstName, normalizeReiNumber, normalizeReiList importados de ./ui/core-utils.js) */

/**
 * Obtiene el nombre del responsable de una ficha, resolviendo fallbacks si no fue guardado explícitamente:
 * 1. REGLA OFICIAL JEC: Si es Ficha de Tutoría JEC, Ficha Coordinador Pedagógico o Implementación Modelo JEC,
 *    la encargada asignada es exclusivamente la Especialista de JEC (Fanny Liliana Arias Quiróz).
 * 2. Campo explícito s.responsable (para las demás fichas cuyos colegios están distribuidos por REI)
 * 3. Campo en extras (etiquetas como responsable, especialista, monitor)
 * 4. Especialista asignado a la RED en state.responsables
 * 5. Nombre del usuario en state.users según s.createdBy
 * 6. Usuario de sesión actual si coincide con s.createdBy
 */
export function getSubmissionResponsable(s, state = null, currentUser = null) {
  if (!s) return '';

  // 1. REGLA ESPECÍFICA OFICIAL JEC:
  // - Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)
  // - Ficha de Monitoreo a las funciones que cumple el/la coordinador(a) Pedagógico
  // - Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC
  // La especialista encargada de forma exclusiva es Fanny Liliana Arias Quiróz.
  // Se ignora cualquier valor numérico residual (ej. 28 o 33) y la asignación ordinaria de RED.
  const appState = state || _appState || (typeof window !== 'undefined' ? window.state : null) || {};
  if (isFichaEspecialistaJec(s, appState)) {
    return ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
  }

  // 1.1 REGLA ESPECÍFICA OFICIAL CEBE y PRITE:
  // Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE / PRITE
  // Las 2 especialistas designadas son María Angélica Zavala Querevalú y Ana Rosario Valderrama Barrientos
  if (s && (s.fichaTypeId === 'ft_gestion_cebe' || s.fichaTypeId === 'ft_prite_gestion' || (s.fichaTypeNombre && (s.fichaTypeNombre.toLowerCase().includes('cebe') || s.fichaTypeNombre.toLowerCase().includes('prite'))))) {
    if (s.responsable && String(s.responsable).trim() && s.responsable.trim() !== '—' && !s.responsable.includes('@') && !/^\d+$/.test(String(s.responsable).trim())) {
      return String(s.responsable).trim();
    }
    const sRei = s.rei || s.red || '';
    const sReiNorm = normalizeText(sRei);
    if (sReiNorm.includes('13')) return 'María Angélica Zavala Querevalú';
    if (sReiNorm.includes('15')) return 'Ana Rosario Valderrama Barrientos';
  }

  // 2. Si s.responsable tiene un nombre humano real (NO vacío, NO sólo números, y NO un correo electrónico como agebre@ugel03.gob.pe):
  if (s.responsable && String(s.responsable).trim() && s.responsable.trim() !== '—') {
    const rVal = String(s.responsable).trim();
    if (!/^\d+$/.test(rVal) && !rVal.includes('@')) {
      return rVal;
    }
  }

  // 3. Extras (verificando que no sea email ni números)
  if (Array.isArray(s.extras)) {
    const ex = s.extras.find(e => {
      const l = (e.label || '').toLowerCase();
      return (l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) &&
        !l.includes('dni') && e.value && String(e.value).trim() && e.value.trim() !== '—' &&
        !/^\d+$/.test(String(e.value).trim()) && !String(e.value).includes('@');
    });
    if (ex && ex.value.trim()) return ex.value.trim();
  }

  // 4. Especialista asignado a la RED / REI (para las demás fichas)
  const red = s ? (s.red || (s.ie && s.ie.red) || s.rei) : '';
  if (red && red !== 'No aplica' && appState && Array.isArray(appState.responsables)) {
    const redNorm = normalizeText(red);
    const redNum = normalizeReiNumber(red);

    const matchedResp = appState.responsables.find(r => {
      if (!r.red) return false;
      if (redNum) {
        const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
        if (rNums.includes(redNum)) return true;
      }
      const rRedNorm = normalizeText(r.red);
      return rRedNorm.includes(redNorm) || redNorm.includes(rRedNorm);
    });

    if (matchedResp) {
      const cand = (matchedResp.nombresApellidos || matchedResp.especialista || '').trim();
      if (cand && !/^\d+$/.test(cand) && !cand.includes('@')) {
        return cand;
      }
    }
  }

  // 5. Búsqueda por colegio en state.colegios (para obtener su RED/REI)
  if (s && (s.colegioId || s.institucion || s.codigoLocal) && appState && Array.isArray(appState.colegios) && Array.isArray(appState.responsables)) {
    const col = appState.colegios.find(c =>
      (s.colegioId && c.id === s.colegioId) ||
      (s.codigoLocal && (c.codigoLocal === s.codigoLocal || c.codLocal === s.codigoLocal)) ||
      (s.institucion && normalizeText(c.ie || c.nombre || '') === normalizeText(s.institucion))
    );
    if (col && (col.red || col.rei)) {
      const colRed = col.red || col.rei;
      const colRedNorm = normalizeText(colRed);
      const colNum = normalizeReiNumber(colRed);
      const matchedResp = appState.responsables.find(r => {
        if (!r.red) return false;
        if (colNum) {
          const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
          if (rNums.includes(colNum)) return true;
        }
        const rRedNorm = normalizeText(r.red);
        return rRedNorm.includes(colRedNorm) || colRedNorm.includes(rRedNorm);
      });
      if (matchedResp) {
        const cand = (matchedResp.nombresApellidos || matchedResp.especialista || '').trim();
        if (cand && !/^\d+$/.test(cand) && !cand.includes('@')) {
          return cand;
        }
      }
    }
  }

  // 6. Si s.responsable o s.createdBy es un correo, verificar si coincide con el correo de un especialista en state.responsables
  const possibleEmail = (s.responsable && s.responsable.includes('@')) ? s.responsable : (s.createdBy && s.createdBy.includes('@') ? s.createdBy : '');
  if (possibleEmail && appState && Array.isArray(appState.responsables)) {
    const emailNorm = normalizeText(possibleEmail);
    const matchedByEmail = appState.responsables.find(r => r.correo && normalizeText(r.correo) === emailNorm);
    if (matchedByEmail) {
      const cand = (matchedByEmail.nombresApellidos || matchedByEmail.especialista || '').trim();
      if (cand && !cand.includes('@')) return cand;
    }
  }

  // 7. state.users por createdBy (SOLO si tiene nombre o displayName humano y NO es email)
  if (s && s.createdBy && appState && Array.isArray(appState.users)) {
    const userObj = appState.users.find(u => u.uid === s.createdBy || u.id === s.createdBy || u.email === s.createdBy);
    if (userObj && (userObj.nombre || userObj.displayName)) {
      const uName = (userObj.nombre || userObj.displayName).trim();
      if (!uName.includes('@')) return uName;
    }
  }

  // 8. currentUser (SOLO si tiene nombre o displayName humano y NO es email)
  const user = currentUser || _currentSessionUser || (appState && appState.currentUser) || null;
  if (user && s && s.createdBy && s.createdBy === user.uid && (user.nombre || user.displayName)) {
    const uName = (user.nombre || user.displayName).trim();
    if (!uName.includes('@')) return uName;
  }
  return '—';
}

/**
 * Obtiene el especialista responsable asignado a una institución educativa
 * según su RED/REI oficial y la modalidad de la ficha (EBR, CEBE, PRITE).
 */
export function getResponsableForColegio(col, ft, state = null) {
  if (!col) return '—';
  const appState = state || _appState || (typeof window !== 'undefined' ? window.state : null) || {};

  // 1. Caso CEBE y PRITE
  if (ft && (isFichaCebeGestion(ft) || isFichaPriteGestion(ft))) {
    const colRei = normalizeText(col.rei || col.red || '');
    if (colRei.includes('13')) return 'María Angélica Zavala Querevalú';
    if (colRei.includes('15')) return 'Ana Rosario Valderrama Barrientos';
    if (appState && Array.isArray(appState.responsables)) {
      const respEbe = appState.responsables.find(r => {
        const m = (r.modalidad || '').toUpperCase();
        if (isFichaPriteGestion(ft) && (m.includes('PRITE') || (r.especialista || '').toUpperCase().includes('PRITE'))) return true;
        if (isFichaCebeGestion(ft) && (m.includes('CEBE') || (r.especialista || '').toUpperCase().includes('CEBE'))) return true;
        return false;
      });
      if (respEbe && respEbe.nombresApellidos) return respEbe.nombresApellidos.trim();
    }
  }

  // 2. Búsqueda por REI / RED en appState.responsables (EBR y general)
  const colRed = col.rei || col.red || '';
  if (colRed && appState && Array.isArray(appState.responsables)) {
    const colNum = normalizeReiNumber(colRed);
    const colRedNorm = normalizeText(colRed);

    const matchedResp = appState.responsables.find(r => {
      if (!r.red) return false;
      if (colNum) {
        const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
        if (rNums.includes(colNum)) return true;
      }
      const rRedNorm = normalizeText(r.red);
      return rRedNorm.includes(colRedNorm) || colRedNorm.includes(rRedNorm);
    });

    if (matchedResp) {
      const cand = (matchedResp.nombresApellidos || matchedResp.especialista || '').trim();
      if (cand && !/^\d+$/.test(cand) && !cand.includes('@')) {
        return cand;
      }
    }
  }

  // 3. Si el colegio tiene un responsable asignado directamente en sus campos
  if (col.responsable && String(col.responsable).trim() && col.responsable.trim() !== '—') {
    const cResp = String(col.responsable).trim();
    if (!/^\d+$/.test(cResp) && !cResp.includes('@')) return cResp;
  }

  return 'Por asignar';
}

/* ============================= HELPERS DE RENDER ============================= */
export function bar(pct, customClsOrStatus, fichaType = null) {
  const w = pct === null || pct === undefined ? 0 : Math.max(0, Math.min(100, pct));
  let cls = 'none';
  const targetFt = fichaType || (typeof customClsOrStatus === 'object' && customClsOrStatus ? customClsOrStatus : null);
  if (customClsOrStatus && typeof customClsOrStatus === 'string') {
    const s = String(customClsOrStatus).toLowerCase().trim();
    if (s.includes('ok') || s.includes('lograd') || s.includes('cumple')) cls = 'ok';
    else if (s.includes('warn') || s.includes('proces') || s.includes('parcial')) cls = 'warn';
    else if (s.includes('danger') || s.includes('inici') || s.includes('mejorar') || s.includes('no cumple')) cls = 'danger';
    else cls = customClsOrStatus;
  } else if (pct !== null && pct !== undefined) {
    const isJec = isFichaJec(targetFt) || isFichaCoordTutoriaJec(targetFt) || isFichaCoordPedagogico(targetFt) || isFichaEspecialistaJec(targetFt);
    if (!isJec && (isFichaEbrGestionEscolar(targetFt) || isFichaEbrEbePrite(targetFt) || isFichaCebeGestion(targetFt) || isFichaPriteGestion(targetFt) || !targetFt)) {
      cls = pct >= 67 ? 'ok' : (pct >= 34 ? 'warn' : 'danger');
    } else {
      cls = pct >= 85 ? 'ok' : (pct >= 70 ? 'warn' : 'danger');
    }
  }
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
      puntaje: 0,
      puntaje_max: 0,
    };
  }
  let respuestasArray = sub.respuestas;
  if (respuestasArray && typeof respuestasArray === 'object' && !Array.isArray(respuestasArray)) {
    respuestasArray = Object.entries(respuestasArray).map(([id, valor]) => ({ id, valor }));
  }

  // Para la ficha EBR Gestion Escolar, JEC o Coordinador de Tutoría JEC, usar las secciones y reglas especializadas
  let ftForCalc = ft;
  const isEbr = isFichaEbrGestionEscolar(ft || sub);
  if (isEbr && respuestasArray && (Array.isArray(respuestasArray) ? respuestasArray.length > 0 : true)) {
    const visita = getMomentoVisitaEbr(sub);
    const seccionesEbr = getEbrSeccionesForVisita(visita, ft);
    const reglaEbr = getReglaNivelEbrGestion(visita);
    ftForCalc = { ...ft, secciones: seccionesEbr, tipoRespuesta: 'ips', escala: 'IPL', visita, regla_nivel: reglaEbr };
  } else if (isFichaCoordTutoriaJec(ft || sub) && respuestasArray && respuestasArray.length > 0) {
    ftForCalc = { ...ft, regla_nivel: ft?.regla_nivel || REGLA_NIVEL_COORD_TUTORIA_JEC };
  } else if (isFichaJec(ft || sub) && respuestasArray && respuestasArray.length > 0) {
    ftForCalc = { ...ft, secciones: (ft?.secciones?.length ? ft.secciones : JEC_SECCIONES), tipoRespuesta: 'si_no', regla_nivel: ft?.regla_nivel || REGLA_NIVEL_JEC };
  } else if (isFichaCebeGestion(ft || sub) && respuestasArray && respuestasArray.length > 0) {
    ftForCalc = { ...ft, secciones: (ft?.secciones?.length ? ft.secciones : CEBE_SECCIONES), tipoRespuesta: 'ips', escala: 'IPL' };
  } else if (isFichaPriteGestion(ft || sub) && respuestasArray && respuestasArray.length > 0) {
    ftForCalc = { ...ft, secciones: (ft?.secciones?.length ? ft.secciones : PRITE_SECCIONES), tipoRespuesta: 'ips', escala: 'IPL' };
  }
  const result = calcScore(respuestasArray, ftForCalc);
  let finalEstado = {
    label: result.estado.nivel,
    estado_panel: result.estado.estado_panel,
    cls: result.estado.cls,
    descripcion: result.estado.descripcion || '',
    puntaje: result.estado.puntaje ?? result.puntaje
  };

  if (isEbr && result.puntaje !== null && result.puntaje !== undefined) {
    // Para EBR Gestión Escolar, proyectar puntaje si hay ítems N/A
    const maxAplicable = (result.total_items && result.total_items > 0) ? (result.total_items * 3) : null;
    const nivelEbr = getNivelEbrGestion(result.puntaje, ftForCalc.visita, maxAplicable);

    finalEstado.label = nivelEbr.estado_panel || nivelEbr.nivel;
    finalEstado.estado_panel = nivelEbr.estado_panel;
    finalEstado.cls = nivelEbr.cls;
    finalEstado.descripcion = nivelEbr.descripcion || '';
    result.pct = nivelEbr.pct; // Alinear el porcentaje general al puntaje
  } else if ((ftForCalc.escala === 'IPL' || ftForCalc.tipoRespuesta === 'ips' || isFichaEbrEbePrite(ftForCalc)) && result.pct !== null) {
    if (result.pct >= 67) {
      finalEstado.label = 'Logrado';
      finalEstado.estado_panel = 'Logrado';
      finalEstado.cls = 'st-logrado';
    } else if (result.pct >= 34) {
      finalEstado.label = 'Proceso';
      finalEstado.estado_panel = 'En proceso';
      finalEstado.cls = 'st-proceso';
    } else {
      finalEstado.label = 'Inicio';
      finalEstado.estado_panel = 'Inicio';
      finalEstado.cls = 'st-inicio';
    }
  }
  return {
    pct: result.pct,
    puntaje: result.puntaje,
    puntaje_max: result.puntaje_max,
    total_items: result.total_items,
    secciones: result.secciones,
    conteo_si: result.conteo_si,
    estado: finalEstado,
  };
}
if (typeof window !== 'undefined') {
  window.computeStats = computeStats;
}

export function computeItemAgg(subs, ft) {
  return RepDatos.computeItemAgg(subs, ft);
}

export function renderItemReportHtml(itemAgg, tipoRespuesta, ft = null) {
  const isJec = isFichaJec(ft) || isFichaCoordTutoriaJec(ft) || isFichaCoordPedagogico(ft) || isFichaEspecialistaJec(ft);
  const isEbr = !isJec && (isFichaEbrGestionEscolar(ft) || isFichaEbrEbePrite(ft) || isFichaCebeGestion(ft) || isFichaPriteGestion(ft));
  const logCut = isEbr ? 67 : 85;
  const procCut = isEbr ? 34 : 70;

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
    'inicio': isEbr ? 'Inicio = Nivel inicio' : 'Inicio = Por mejorar',
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
    const secStatus = statusFromPct(sec.avg, ft);
    const pctVal = sec.avg === null || sec.avg === undefined ? 0 : Math.min(Math.max(sec.avg, 0), 100);
    const barCls = sec.avg === null || sec.avg === undefined ? 'none' : (sec.avg >= logCut ? 'ok' : (sec.avg >= procCut ? 'warn' : 'danger'));
    const pctText = sec.avg === null ? '—' : `${sec.avg} %`;
    const secAriaLabel = `Avance de ${sec.nombre}: ${sec.avg !== null ? sec.avg + '%' : 'Sin datos'}`;

    const tableRows = sec.items.map((it, idx) => {
      const itStatus = statusFromPct(it.pct, ft);
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

    const bodyId = 'sec_body_' + si;
    const summaryId = 'sec_summary_' + si;
    const secVal = sec.avg === null || sec.avg === undefined ? 0 : Math.min(Math.max(sec.avg, 0), 100);
    const secFillCls = sec.avg === null || sec.avg === undefined
      ? 'none'
      : (sec.avg >= logCut ? 'ok' : (sec.avg >= procCut ? 'warn' : 'danger'));

    return '<details class="secDetails" data-secitem="' + si + '">' +
      '<summary id="' + summaryId + '" class="secSummary" role="button" tabindex="0" aria-expanded="false" aria-controls="' + bodyId + '">' +
      '<div class="secSummaryLeft">' +
      '<span class="secChevron" aria-hidden="true">▶</span>' +
      '<div class="secSummaryTitleWrap">' +
      '<span class="secSummaryName">' + esc(sec.nombre) + '</span>' +
      ' <span class="secSummaryCount">(' + sec.items.length + ' ' + (sec.items.length === 1 ? 'indicador' : 'indicadores') + ')</span>' +
      '</div>' +
      '</div>' +
      '<div class="secSummaryRight">' +
      '<div class="secBarContainer">' +
      '<div class="secBarTrack" role="progressbar" aria-valuenow="' + (sec.avg !== null ? sec.avg : 0) + '" aria-valuemin="0" aria-valuemax="100" aria-label="' + esc(sec.nombre) + '" title="' + (sec.avg === null ? 'Sin datos' : sec.avg + '%') + '">' +
      '<div class="secBarFill ' + secFillCls + '" style="width:' + secVal + '%"></div>' +
      '</div>' +
      '</div>' +
      '<span class="secSummaryPct">' + (sec.avg === null ? '—' : sec.avg + ' %') + '</span>' +
      '<span class="badge ' + secStatus.cls + '">' + secStatus.label + '</span>' +
      '</div>' +
      '</summary>' +
      '<div class="secDetailsBody" id="' + bodyId + '" role="region" aria-labelledby="' + summaryId + '">' +
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
    '<button type="button" class="btn secondary small" id="toggleAllItemsBtn">⊞ Expandir todo</button>' +
    '</div>' + sections;
}

/* (seedSuggestions, csvEscape, downloadCsv importados de ./ui/core-utils.js) */

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

/* (lockBodyScroll, unlockBodyScroll, forceResetBodyScroll importados de ./ui/core-utils.js) */

/**
 * Diálogo modal accesible de confirmación antes de cerrar sesión o cambiar de usuario.
 * @param {{ currentUser: Object, isAdmin: boolean, onConfirmLogout: Function, onSwitchUser: Function }} options
 */
export function openLogoutConfirmModal({
  currentUser = null,
  isAdmin = false,
  onConfirmLogout = null,
  onSwitchUser = null
} = {}) {
  const oldModal = document.getElementById('logoutConfirmModal');
  if (oldModal) {
    oldModal.remove();
    unlockBodyScroll();
  }

  const modalWrap = document.createElement('div');
  modalWrap.id = 'logoutConfirmModal';
  modalWrap.className = 'downloadModalOverlay';
  modalWrap.setAttribute('role', 'dialog');
  modalWrap.setAttribute('aria-modal', 'true');
  modalWrap.setAttribute('aria-labelledby', 'm_logout_title');

  const emailStr = (currentUser && currentUser.email) ? currentUser.email : 'Usuario';
  const roleLabel = isAdmin ? 'Administrador' : 'Especialista General';
  const roleBadgeCls = isAdmin ? 'st-logrado' : 'st-none';
  const initial = emailStr.charAt(0).toUpperCase();

  modalWrap.innerHTML = `
    <div class="downloadModalCard" style="max-width:480px;box-shadow:0 24px 38px 3px rgba(11,27,54,0.22),0 9px 46px 8px rgba(11,27,54,0.12)">
      <div class="downloadModalHeader" style="background:#0B1B36;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px;line-height:1">🚪</span>
          <h3 id="m_logout_title" style="color:#FFFFFF;margin:0;font-size:16px;font-weight:700">¿Cerrar sesión?</h3>
        </div>
        <button type="button" class="downloadModalClose" id="m_logout_close" title="Cerrar ventana" style="color:#CBD5E1;font-size:18px;background:none;border:none;cursor:pointer">✕</button>
      </div>

      <div class="downloadModalBody" style="padding:22px 24px">
        <!-- Tarjeta de usuario activo -->
        <div style="display:flex;align-items:center;gap:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:16px">
          <div style="width:42px;height:42px;border-radius:50%;background:#12294C;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;flex-shrink:0">
            ${initial}
          </div>
          <div style="min-width:0;flex:1">
            <div style="font-weight:600;font-size:13.5px;color:#0F172A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(emailStr)}">
              ${esc(emailStr)}
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
              <span class="badge ${roleBadgeCls}" style="font-size:11px;padding:2px 7px">${roleLabel}</span>
              <span style="font-size:11.5px;color:#64748B">Sesión activa</span>
            </div>
          </div>
        </div>

        <p style="font-size:13.5px;color:#334155;line-height:1.55;margin:0 0 12px 0">
          ¿Deseas salir del sistema o cambiar a otra cuenta de usuario?
        </p>

        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400E;display:flex;gap:8px;align-items:flex-start">
          <span style="font-size:14px;line-height:1">ℹ️</span>
          <span>Asegúrate de haber guardado tus cambios o fichas en edición antes de salir.</span>
        </div>
      </div>

      <div class="downloadModalFooter" style="background:#F1F5F9;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn secondary" id="m_logout_cancel" style="padding:8px 14px;font-size:13px">
          Cancelar
        </button>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn" id="m_logout_switch" style="background:#2E4A73;color:#FFFFFF;border:none;padding:8px 14px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px">
            <span>👤</span> Cambiar de usuario
          </button>
          <button type="button" class="btn danger" id="m_logout_confirm" style="padding:8px 14px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px">
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `;

  lockBodyScroll();
  document.body.appendChild(modalWrap);

  const close = () => {
    modalWrap.remove();
    unlockBodyScroll();
    document.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeyDown);

  modalWrap.addEventListener('click', (e) => {
    if (e.target === modalWrap) close();
  });

  const closeBtn = modalWrap.querySelector('#m_logout_close');
  const cancelBtn = modalWrap.querySelector('#m_logout_cancel');
  const switchBtn = modalWrap.querySelector('#m_logout_switch');
  const confirmBtn = modalWrap.querySelector('#m_logout_confirm');

  if (closeBtn) closeBtn.onclick = close;
  if (cancelBtn) cancelBtn.onclick = close;

  if (switchBtn) {
    switchBtn.onclick = () => {
      close();
      if (onSwitchUser) onSwitchUser();
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      close();
      if (onConfirmLogout) onConfirmLogout();
    };
  }
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
  let consItems = savedPref ? (savedPref.incluirReporteItem === true) : false;
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
            <div class="downloadModalOptionsList" style="display:flex;flex-direction:column;gap:8px">
              <label class="dlCheckLabel" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_encabezado" style="margin-top:2px;flex-shrink:0" ${mostrarEncabezadoArea ? 'checked' : ''}>
                <span>Mostrar logo y nombre del área en el encabezado (4.° recuadro)</span>
              </label>
              <label class="dlCheckLabel" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_qr" style="margin-top:2px;flex-shrink:0" ${incluirQr ? 'checked' : ''}>
                <span>Incluir código y QR oficial de verificación</span>
              </label>
              <label class="dlCheckLabel" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_sin_firmas" style="margin-top:2px;flex-shrink:0" ${isSinFirmas ? 'checked' : ''}>
                <span>Sin bloque de firmas</span>
              </label>

              <div class="downloadOrientationRow" style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:4px">
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
                  <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:2px">Contenido a exportar:</div>
                  <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-soft);cursor:default">
                    <input type="checkbox" checked disabled>
                    <span><strong>Reporte consolidado</strong> (siempre incluido: Tarjetas KPI, dona, avance por sección y matriz)</span>
                  </label>
                  <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_cons_items" ${consItems ? 'checked' : ''}>
                    <span>Incluir reporte por ítem (consolidado de indicadores)</span>
                  </label>
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
            <span>⬇</span> Descargar
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
        incluir_items: consItems,
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
        confirmBtn.innerHTML = '<span>⬇</span> Descargar';
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
      if (state.activeTab === 'registrar') {
        clearEditMode();
      }
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
      clearEditMode();
      cleanConcursoParams('registrar');
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      const btn = document.querySelector('.navbtn[data-tab="registrar"]');
      if (btn) btn.classList.add('active');
      renderFn();
    });
  }

  // Campana de alertas en la cabecera (oculta)
  const topBellBtn = document.getElementById('topBellBtn');
  if (topBellBtn) {
    topBellBtn.addEventListener('click', () => {
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      state.activeTab = 'dashboard';
      cleanConcursoParams('dashboard');
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      const btn = document.querySelector('.navbtn[data-tab="dashboard"]');
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
  const cleanSubs = deduplicateTwinSubmissions(state.submissions || []);
  const totalFichas = cleanSubs.length;
  const instSet = new Set(cleanSubs.map(s => (s.institucion || '') + '|' + (s.ugel || '')));

  let sumPct = 0, cntPct = 0;
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  const perTipo = {};
  state.fichaTypes.forEach(ft => perTipo[ft.id] = { ft, count: 0, sum: 0, cnt: 0, last: null });

  cleanSubs.forEach(s => {
    const ft = getFichaType(s.fichaTypeId);
    const isEbr = isFichaEbrGestionEscolar(ft || s);
    const st = ft ? computeStats(s, ft) : { pct: null };
    if (st.pct !== null) { sumPct += st.pct; cntPct++; }
    let sLower = '';
    if (isEbr && st.pct !== null) {
      sLower = st.pct >= 67 ? 'logrado' : (st.pct >= 34 ? 'proceso' : 'inicio');
    } else {
      const status = st.estado?.estado_panel || st.estado?.label || statusFromPct(st.pct, ft, st?.conteo_si, st?.puntaje, s.visita).label;
      sLower = String(status || '').toLowerCase();
    }
    if (sLower.includes('lograd') || sLower.includes('cumple')) dist.logrado++;
    else if (sLower.includes('proces') || sLower.includes('parcial')) dist.proceso++;
    else if (sLower.includes('inici') || sLower.includes('incipient') || sLower.includes('mejorar')) dist.inicio++;
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
    const status = statusFromPct(avg, p.ft);
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

  // Actividad Reciente
  const recent = [...cleanSubs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8).map(s => {
    const ft = getFichaType(s.fichaTypeId);
    const st = ft ? computeStats(s, ft) : { pct: null };
    const status = (st && st.estado && st.estado.label) ? { label: st.estado.label, cls: st.estado.cls } : statusFromPct(st.pct, ft, st?.conteo_si, st?.puntaje);
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
  }, 0);

  return '' +
    '<div class="pageHead">' +
    '<h2>Resumen general</h2>' +
    '<p>Vista consolidada de monitoreo y niveles de avance institucional.</p>' +
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
        clearEditMode();
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
    const count = deduplicateTwinSubmissions((state.submissions || []).filter(s => s.fichaTypeId === ft.id)).length;
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
    clearEditMode();
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

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE"
  if (isFichaCebeGestion(ft)) {
    if (editingSubmissionData) {
      preloadCebeFormState(editingSubmissionData, ft);
    }
    renderCebeGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
    if (editingSubmissionData && editingSubmissionData.id) {
      const f = host.querySelector('#regForm');
      if (f) f.dataset.editingId = editingSubmissionData.id;
    }
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        if (e.defaultPrevented) return;
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - PRITE"
  if (isFichaPriteGestion(ft)) {
    if (editingSubmissionData) {
      preloadPriteFormState(editingSubmissionData, ft);
    }
    renderPriteGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
    if (editingSubmissionData && editingSubmissionData.id) {
      const f = host.querySelector('#regForm');
      if (f) f.dataset.editingId = editingSubmissionData.id;
    }
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        if (e.defaultPrevented) return;
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
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

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
  if (isFichaJec(ft)) {
    if (editingSubmissionData) {
      preloadJecFormState(editingSubmissionData, ft);
    }
    renderJecForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
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

  const isCoordTutoria = isFichaCoordTutoriaJec(ft);

  const tutoriaNivelBannerHtml = isCoordTutoria ? `
    <div class="panel" id="tutoriaReglasPanel" style="margin-bottom:18px;border-left:4px solid var(--primary,#2563eb);background:var(--surface-card,#ffffff);border-radius:8px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <div style="font-weight:700;font-size:13px;color:var(--text-main,#0f172a);text-transform:uppercase;letter-spacing:0.5px">
          📋 NIVEL DE CUMPLIMIENTO — COORDINADOR(A) DE TUTORÍA (JEC)
        </div>
        <span id="tutoriaScoreSummaryBadge" class="badge st-none" style="font-size:13px;padding:5px 14px;font-weight:700">0 / 63 puntos (Sin calificar)</span>
      </div>
      <p class="helpText" style="margin-top:0;margin-bottom:12px;font-size:12.5px;color:var(--text-600,#475569)">
        El nivel de cumplimiento se determina sumando la calificación obtenida en los <strong>21 indicadores</strong> (escala de 1 a 3; puntaje mínimo 21, máximo 63). Conforme responda cada indicador, el sistema calculará en tiempo real el puntaje acumulado y resaltará el nivel correspondiente:
      </p>
      <div class="tblWrap">
        <table class="dataTable" style="width:100%;font-size:12px;text-align:left;border-collapse:collapse">
          <thead>
            <tr style="background:var(--surface-sunken,#f1f5f9)">
              <th style="width:25%;padding:8px 10px;font-weight:700">Nivel de cumplimiento</th>
              <th style="width:20%;padding:8px 10px;font-weight:700;text-align:center">Puntaje</th>
              <th style="width:55%;padding:8px 10px;font-weight:700">Descripción oficial</th>
            </tr>
          </thead>
          <tbody>
            <tr id="tutoriaRowCumple" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#16A34A"><span class="badge st-logrado">Cumple</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 53 a 63</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.</td>
            </tr>
            <tr id="tutoriaRowParcial" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#D97706"><span class="badge st-proceso">Cumple parcialmente</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 42 a 52</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.</td>
            </tr>
            <tr id="tutoriaRowNoCumple" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#DC2626"><span class="badge st-inicio">No cumple</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 21 a 41</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
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
    tutoriaNivelBannerHtml +
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
    const checked = host.querySelectorAll('input[name^="item_"]:checked').length;
    const pct = totalItemsCount ? Math.round((checked / totalItemsCount) * 100) : 0;
    if (badge) {
      badge.innerHTML = 'Avance: <strong>' + checked + ' de ' + totalItemsCount + '</strong> ítems respondidos (' + pct + '%)';
    }

    if (isCoordTutoria) {
      let currentPts = 0;
      let answeredCount = 0;
      host.querySelectorAll('input[name^="item_"]:checked').forEach(r => {
        const val = Number(r.value);
        if (!isNaN(val) && val >= 1 && val <= 3) {
          currentPts += val;
          answeredCount++;
        }
      });
      const nivelInfo = getNivelCoordTutoriaJec(currentPts);
      const sumBadge = document.getElementById('tutoriaScoreSummaryBadge');
      if (sumBadge) {
        if (answeredCount === 0) {
          sumBadge.className = 'badge st-none';
          sumBadge.textContent = '0 / 63 puntos (Sin calificar)';
        } else {
          sumBadge.className = `badge ${nivelInfo.cls}`;
          sumBadge.textContent = `${currentPts} / 63 puntos · ${nivelInfo.nivel}`;
        }
      }
      const rowCumple = document.getElementById('tutoriaRowCumple');
      const rowParcial = document.getElementById('tutoriaRowParcial');
      const rowNoCumple = document.getElementById('tutoriaRowNoCumple');
      if (rowCumple && rowParcial && rowNoCumple) {
        rowCumple.style.backgroundColor = (answeredCount > 0 && currentPts >= 53) ? 'rgba(22, 163, 74, 0.14)' : '';
        rowCumple.style.fontWeight = (answeredCount > 0 && currentPts >= 53) ? '700' : 'normal';
        rowParcial.style.backgroundColor = (answeredCount > 0 && currentPts >= 42 && currentPts <= 52) ? 'rgba(217, 119, 6, 0.14)' : '';
        rowParcial.style.fontWeight = (answeredCount > 0 && currentPts >= 42 && currentPts <= 52) ? '700' : 'normal';
        rowNoCumple.style.backgroundColor = (answeredCount > 0 && currentPts < 42) ? 'rgba(220, 38, 38, 0.14)' : '';
        rowNoCumple.style.fontWeight = (answeredCount > 0 && currentPts < 42) ? '700' : 'normal';
      }
    }
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

    // Auto-sugerir / completar especialista: para fichas JEC la especialista oficial es Fanny Liliana Arias Quiróz, para el resto según REI del colegio
    const currentFt = state.selectedFichaType || (state.currentFicha ? state.currentFicha.tipo : '') || '';
    if (isFichaEspecialistaJec(currentFt)) {
      respInputs.forEach(rInp => {
        rInp.value = ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
        const hEl = rInp.closest('.field') ? rInp.closest('.field').querySelector('.respHint') : null;
        if (hEl) {
          hEl.textContent = '✓ Especialista de JEC responsable: ' + ESPECIALISTA_JEC_OFICIAL.nombresApellidos + ' (AGEBRE – UGEL 03)';
          hEl.style.display = 'block';
        }
      });
    } else if ((c.rei || c.red) && state.responsables && state.responsables.length) {
      const cReiNum = normalizeReiNumber(c.rei || c.red);
      const cReiNorm = normalizeText(c.rei || c.red);
      const matchedResp = state.responsables.find(r => {
        if (!r.red) return false;
        if (cReiNum) {
          const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
          if (rNums.includes(cReiNum)) return true;
        }
        const rRedNorm = normalizeText(r.red);
        return rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm);
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
        clearEditMode();
        regBuiltFor = null;
        regSelectedTypeId = null;
        if (navigate) navigate('consolidado');
      } else {
        if (confirm('¿Deseas cancelar el registro? Se descartarán los cambios ingresados.')) {
          clearEditMode();
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

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE"
    if (isFichaCebeGestion(ft)) {
      const targetForm = (form && form.id === 'regForm') ? form : (document.getElementById('regForm') || document.getElementById('regFormHost')?.querySelector('#regForm'));
      await guardarFormularioCebe(targetForm, ft, activeState, dbNs, currentUser, navigate, isEdit);
      return;
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - PRITE"
    if (isFichaPriteGestion(ft)) {
      const targetForm = (form && form.id === 'regForm') ? form : (document.getElementById('regForm') || document.getElementById('regFormHost')?.querySelector('#regForm'));
      await guardarFormularioPrite(targetForm, ft, activeState, dbNs, currentUser, navigate, isEdit);
      return;
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
    if (isFichaEbrGestionEscolar(ft)) {
      const ebrData = collectEbrGestionFormData(form || document.getElementById('regFormHost'), ft, isEdit);
      let submissionToken = isEdit ? editingSubmissionId : ((form && form.dataset.submissionId) || genId());
      if (form) form.dataset.submissionId = submissionToken;

      const fallbackResp = (currentUser && (currentUser.nombre || currentUser.displayName || currentUser.email)) || '';
      let finalResp = (ebrData.responsable && ebrData.responsable.trim()) || '';
      if (!finalResp && ebrData.red && activeState.responsables && activeState.responsables.length) {
        const cReiNum = normalizeReiNumber(ebrData.red);
        const cReiNorm = normalizeText(ebrData.red);
        const matchedResp = activeState.responsables.find(r => {
          if (!r.red) return false;
          if (cReiNum) {
            const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
            if (rNums.includes(cReiNum)) return true;
          }
          const rRedNorm = normalizeText(r.red);
          return rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm);
        });
        if (matchedResp) {
          finalResp = (matchedResp.nombresApellidos || matchedResp.especialista || '').trim();
        }
      }
      if (!finalResp) {
        finalResp = fallbackResp;
      }

      const docData = {
        ...ebrData,
        colegioId: ebrData.colegioId || regSelectedColegioId || null,
        responsable: finalResp,
        createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
        createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
      };

      const cleanedDocData = cleanForFirestore(docData);

      if (isEdit) {
        await Promise.race([
          dbNs.collection('submissions').doc(editingSubmissionId).set(cleanedDocData, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha EBR actualizada correctamente.');
      } else {
        await Promise.race([
          dbNs.collection('submissions').doc(submissionToken).set(cleanedDocData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha EBR registrada correctamente.');
      }

      // Sincronizar directorio de directivos
      try {
        const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
        if (syncRes && syncRes.summary) {
          showToast(`Ficha guardada. Directorio actualizado.`);
        }
      } catch (syncErr) {
        console.warn('Error sincronizando directorio desde ficha EBR:', syncErr);
      }

      const targetId = isEdit ? editingSubmissionId : submissionToken;
      if (activeState.submissions) {
        const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
        if (existingIdx >= 0) {
          activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
        } else {
          activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
        }
      }

      if (form) form.dataset.submissionId = '';
      clearEditMode();
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

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
    if (isFichaJec(ft)) {
      const jecData = collectJecFormData(form || document.getElementById('regFormHost'), ft, isEdit);
      let submissionToken = isEdit ? editingSubmissionId : ((form && form.dataset.submissionId) || genId());
      if (form) form.dataset.submissionId = submissionToken;

      const docData = {
        ...jecData,
        createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
        createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid || currentUser?.email || ''
      };

      const cleanedDocData = cleanForFirestore(docData);

      if (isEdit) {
        await Promise.race([
          dbNs.collection('submissions').doc(editingSubmissionId).set(cleanedDocData, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha JEC actualizada correctamente.');
      } else {
        await Promise.race([
          dbNs.collection('submissions').doc(submissionToken).set(cleanedDocData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha JEC registrada correctamente.');
      }

      // Sincronizar directorio de directivos
      try {
        const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
        if (syncRes && syncRes.summary) {
          showToast(`Ficha guardada. Directorio actualizado.`);
        }
      } catch (syncErr) {
        console.warn('Error sincronizando directorio desde ficha JEC:', syncErr);
      }

      const targetId = isEdit ? editingSubmissionId : submissionToken;
      if (activeState.submissions) {
        const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
        if (existingIdx >= 0) {
          activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
        } else {
          activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
        }
      }

      if (form) form.dataset.submissionId = '';
      clearEditMode();
      resetJecFormState();
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
      if (!redVal) redVal = normalizeReiNumber(matchedCol.rei) || matchedCol.rei || '';
      if (!codigoVal) codigoVal = matchedCol.codigoLocal || matchedCol.codigoModular || '';
      if (!directorVal && matchedCol.director && matchedCol.director.nombre) directorVal = matchedCol.director.nombre;
      if (!directorDniVal && matchedCol.director && matchedCol.director.dni) directorDniVal = matchedCol.director.dni;
      if (!condicionVal && matchedCol.tipoGestion) condicionVal = matchedCol.tipoGestion;
      if (!nivelAtencionVal && matchedCol.nivelServicio) nivelAtencionVal = matchedCol.nivelServicio;
      if (!turnoAtencionVal && matchedCol.turnos) turnoAtencionVal = matchedCol.turnos;
    }
    if (!ugelVal || ugelVal.toLowerCase().includes('sector educ')) ugelVal = 'UGEL 03';
    if (redVal && redVal !== 'No aplica') {
      redVal = normalizeReiNumber(redVal) || redVal;
    } else if (!redVal) {
      redVal = 'No aplica';
    }

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
      allCompromisos.push({
        texto: compMonitorVal,
        responsable: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : 'Monitor / Especialista',
        plazo: 'Seguimiento continuo'
      });
    }

    // Token de idempotencia en cliente para prevenir duplicados en caso de reintento o doble clic
    let submissionToken = (form && form.dataset.submissionId) || genId();
    if (form) form.dataset.submissionId = submissionToken;

    if (isFichaEspecialistaJec(ft)) {
      // Las 3 fichas JEC son atendidas exclusivamente por la Especialista de JEC oficial
      responsableVal = ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
    } else {
      const fallbackResp = (currentUser && (currentUser.nombre || currentUser.displayName || currentUser.email)) || '';
      if (!responsableVal || !responsableVal.trim() || /^\d+$/.test(responsableVal.trim())) {
        if (redVal && redVal !== 'No aplica' && activeState.responsables && activeState.responsables.length) {
          const redNum = normalizeReiNumber(redVal);
          const redNorm = normalizeText(redVal);
          const matchedResp = activeState.responsables.find(r => {
            if (!r.red) return false;
            if (redNum) {
              const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
              if (rNums.includes(redNum)) return true;
            }
            const rRedNorm = normalizeText(r.red);
            return rRedNorm.includes(redNorm) || redNorm.includes(rRedNorm);
          });
          if (matchedResp && (matchedResp.nombresApellidos || matchedResp.especialista)) {
            responsableVal = (matchedResp.nombresApellidos || matchedResp.especialista).trim();
          }
        }
      }
      if (!responsableVal || !responsableVal.trim() || /^\d+$/.test(responsableVal.trim())) {
        responsableVal = fallbackResp;
      }
    }

    let tutoriaExtraData = {};
    if (isFichaCoordTutoriaJec(ft)) {
      const stats = calcScore(respuestas, { ...ft, regla_nivel: ft.regla_nivel || REGLA_NIVEL_COORD_TUTORIA_JEC });
      tutoriaExtraData = {
        puntaje: stats.puntaje,
        puntaje_maximo: 63,
        nivel_cumplimiento: stats.estado.nivel,
        descripcion_cumplimiento: stats.estado.descripcion || '',
        estado_panel: stats.estado.estado_panel || 'Inicio'
      };
    }

    const docData = {
      fichaTypeId: ft.id || '',
      fichaTypeNombre: ft.nombre || '',
      tipoRespuesta: ft.tipoRespuesta || '',
      institucion: instVal || '',
      colegioId: (matchedCol && matchedCol.id) || regSelectedColegioId || null,
      fecha: fechaVal || '',
      visita: Number(visitaVal) || 1,
      ugel: ugelVal || 'UGEL 03',
      red: redVal || 'No aplica',
      codigoModular: codigoVal || '',
      responsable: responsableVal || '',
      responsableCargo: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.cargo : '',
      monitorJec: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : '',
      director: directorVal || '',
      directorDni: directorDniVal || '',
      condicion: condicionVal || '',
      nivelAtencion: nivelAtencionVal || '',
      turnoAtencion: turnoAtencionVal || '',
      turnoVisitado: turnoVisitadoVal || '',
      monitorDni: monitorDniVal || '',
      horaInicio: horaInicioVal || '',
      horaTermino: horaTerminoVal || '',
      extras: extrasCollected || [],
      respuestas: respuestas || [],
      sintesis: sintesisCollected || [],
      compromisoDirector: compDirectorVal || '',
      compromisoMonitor: compMonitorVal || '',
      observaciones: document.getElementById('f_observaciones') ? document.getElementById('f_observaciones').value.trim() : '',
      compromisos: allCompromisos || [],
      esBorrador: esBorrador || false,
      ...tutoriaExtraData,
      createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
      createdAt: isEdit ? (editingSubmissionData.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    const targetId = isEdit ? editingSubmissionId : submissionToken;
    const cleanedDocData = cleanForFirestore(docData);
    const batch = dbNs.batch();
    batch.set(dbNs.collection('submissions').doc(targetId), cleanedDocData);

    allCompromisos.forEach((comp, idx) => {
      if (comp.plazo && comp.plazo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const compId = targetId + '_c' + idx;
        const cData = {
          fichaId: targetId,
          institucion: instVal || '',
          ugel: ugelVal || 'UGEL 03',
          red: redVal || 'No aplica',
          responsableFicha: responsableVal || '',
          responsableFichaDni: monitorDniVal || '',
          texto: comp.texto || '',
          responsable: comp.responsable || '',
          plazo: comp.plazo || '',
          createdBy: currentUser.uid,
          updatedAt: Date.now()
        };
        if (!isEdit) {
          cData.estado = 'Pendiente';
          cData.createdAt = Date.now();
        }
        batch.set(dbNs.collection('compromisos').doc(compId), cleanForFirestore(cData), { merge: true });
      }
    });

    // Timeout preventivo de 25 segundos para asegurar que si la conexión tiene microcortes, no deje la UI congelada
    const commitPromise = batch.commit();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('La conexión con la base de datos tardó más de lo esperado al guardar. Por favor verifica tu red e inténtalo nuevamente.')), 25000)
    );
    await Promise.race([commitPromise, timeoutPromise]);
    showToast(isEdit ? 'Ficha actualizada correctamente.' : 'Ficha registrada correctamente.');

    // Sincronizar directorio de directivos
    try {
      const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
      if (syncRes && syncRes.summary) {
        showToast(`Ficha guardada. Directorio actualizado.`);
      }
    } catch (syncErr) {
      console.warn('Error sincronizando directorio desde ficha:', syncErr);
    }

    // Actualizar cache local para respuesta instantánea de KPIs y tablas
    if (activeState.submissions) {
      const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
      if (existingIdx >= 0) {
        activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
      } else {
        activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
      }
    }

    // Limpiar estado tras guardado exitoso
    if (form) form.dataset.submissionId = '';
    clearEditMode();
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


/* ============================= CONSOLIDADO TAB (REPORTES REDISEÑADO) ============================= */

export const DEFAULT_FICHA_TYPES_METADATA = {
  'ft_msejec_2do': { grupo: 'Modelo JEC', nombreCorto: 'Implementación del Modelo JEC', orden: 10, tieneVisitas: true },
  'ft_coord_tutoria_jec': { grupo: 'Modelo JEC', nombreCorto: 'Coord. de Tutoría (JEC)', orden: 11, tieneVisitas: true },
  'ft_coord_pedagogico': { grupo: 'Modelo JEC', nombreCorto: 'Coord. Pedagógico (JEC)', orden: 12, tieneVisitas: true },
  'ft_coord_pedagogico_jec': { grupo: 'Modelo JEC', nombreCorto: 'Coord. Pedagógico (JEC)', orden: 12, tieneVisitas: true },
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
      if (!autoNombreCorto || autoNombreCorto === ft.nombre) autoNombreCorto = 'Implementación del Modelo JEC';
      if (autoOrden === null) autoOrden = 10;
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
    : submissions.filter(s => s.fichaTypeId === (targetFt ? targetFt.id : f.tipo));

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

  // 5. Visita
  if (f.visita && String(f.visita).trim()) {
    const vStr = String(f.visita).trim();
    subs = subs.filter(s => String(s.visita || 1) === vStr);
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
  const enriched = typeId === '__ALL__' ? null : getEnrichedFichaType(getFichaType(typeId));
  if (enriched && !enriched.tieneVisitas) {
    delete filterCopy.visita;
  }
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
        <div class="fichaTypeCard ${c.isSelected ? 'isSelected' : ''} ${isZero ? 'isZero' : ''}"
             data-type-id="${esc(c.id)}"
             data-nombre-corto="${esc(c.nombreCorto)}"
             data-nombre-completo="${esc(c.nombre)}"
             role="radio"
             aria-checked="${c.isSelected ? 'true' : 'false'}"
             tabindex="${c.isSelected ? '0' : '-1'}"
             title="${esc(c.nombre)}"
             aria-label="${esc(c.nombre)} (${c.count} fichas)">
          ${c.isSelected ? '<span class="selCheck" aria-hidden="true">✓</span>' : ''}
          <div class="cardShortName"><strong>${esc(c.nombreCorto)}</strong></div>
          <div class="cardMetaRow">
            ${c.tieneVisitas ? '<span class="badgeVisitas">Por visitas</span>' : '<span></span>'}
            <span class="cardCount">${c.count} fichas</span>
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
        <div class="fichaCardGrid" role="radiogroup" aria-label="Tipos de ficha en ${esc(gName)}" style="${isExpanded ? '' : 'display:none;'}">
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
  const selectedShortName = isAllMode ? 'Todas las fichas' : (ft ? ft.nombreCorto : '—');

  let visitaSelectHtml = '';
  if (isEbr) {
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
  if (filtrosReporte.desde) activeChips.push({ key: 'desde', label: `Desde: ${fmtDate(filtrosReporte.desde)}` });
  if (filtrosReporte.hasta) activeChips.push({ key: 'hasta', label: `Hasta: ${fmtDate(filtrosReporte.hasta)}` });

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

  const hasInvalidDates = Boolean(filtrosReporte.desde && filtrosReporte.hasta && filtrosReporte.desde > filtrosReporte.hasta);

  return `
    <div class="secHeaderFlex">
      <div class="secTitleWrap">
        <span class="secStepBadge">2</span>
        <h3 class="secTitleText">Filtros y descargas</h3>
      </div>
      <div class="selectedFichaIndicator">
        Ficha seleccionada: <strong>${esc(selectedShortName)}</strong>
        <button type="button" class="btnCambiarFichaLink" id="btnCambiarFichaLink">Cambiar</button>
      </div>
    </div>

    ${bannerEbrHtml}

    <div class="filtersSubgroupsGrid">
      <!-- 1. Ficha y resultado -->
      <div class="filterSubgroup">
        <div class="filterSubgroupTitle">Ficha y resultado</div>
        <div class="field" style="margin-bottom:0">
          <label for="fil_visita">Visita ${(isEbr || isCebe) ? '<span style="color:var(--danger,#dc2626)">*</span>' : ''}</label>
          ${visitaSelectHtml}
        </div>
        <div class="field" style="margin-bottom:0">
          <label for="fil_responsable">Responsable</label>
          <input type="search" id="fil_responsable" list="dl_fil_responsable" value="${esc(filtrosReporte.responsable)}" placeholder="Buscar especialista..." autocomplete="off">
          <datalist id="dl_fil_responsable">
            ${responsableOptions.map(r => `<option value="${esc(r)}">`).join('')}
          </datalist>
        </div>
      </div>

      <!-- 2. Institución -->
      <div class="filterSubgroup">
        <div class="filterSubgroupTitle">Institución</div>
        <div class="field" style="margin-bottom:0">
          <label for="fil_inst">Institución / Código</label>
          <input type="search" id="fil_inst" list="dl_fil_inst" value="${esc(filtrosReporte.institucion)}" placeholder="Nombre o cód. modular..." autocomplete="off">
          <datalist id="dl_fil_inst">
            ${seedSuggestions('institucion', state.submissions).map(v => `<option value="${esc(v)}">`).join('')}
          </datalist>
        </div>
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1;margin-bottom:0">
            <label for="fil_red">RED</label>
            <select id="fil_red">
              <option value="">Todas</option>
              ${redOptions.map(r => {
    const isSel = (r === filtrosReporte.red) || (normalizeReiNumber(filtrosReporte.red) === r);
    return `<option value="${esc(r)}"${isSel ? ' selected' : ''}>${esc(r)}</option>`;
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

      <!-- 3. Período -->
      <div class="filterSubgroup">
        <div class="filterSubgroupTitle">Período</div>
        <div style="display:flex;gap:8px">
          <div class="field" style="flex:1;margin-bottom:0">
            <label for="fil_desde">Desde</label>
            <input type="date" id="fil_desde" value="${esc(filtrosReporte.desde)}">
          </div>
          <div class="field" style="flex:1;margin-bottom:0">
            <label for="fil_hasta">Hasta</label>
            <input type="date" id="fil_hasta" value="${esc(filtrosReporte.hasta)}">
          </div>
        </div>
        ${hasInvalidDates ? '<div class="dateRangeError">⚠️ La fecha "Desde" no puede ser posterior a "Hasta".</div>' : ''}
        <div class="dateQuickRow">
          <button type="button" class="btnDateQuick" data-quick-date="mes">Este mes</button>
          <button type="button" class="btnDateQuick" data-quick-date="trimestre">Este trimestre</button>
          <button type="button" class="btnDateQuick" data-quick-date="anio">Año 2026</button>
        </div>
      </div>
    </div>

    <!-- Fila de filtros activos -->
    <div class="activeFiltersRow">
      <span style="font-size:12px;font-weight:700;color:var(--text-600);margin-right:4px">Filtros activos:</span>
      ${chipsHtml || '<span style="color:var(--text-400);font-size:12px;font-style:italic">Ningún filtro adicional</span>'}
      ${hasAnyFilter ? '<button type="button" class="btnClearAllFilters" id="btnClearAllFilters">Limpiar filtros</button>' : ''}
    </div>

    <div style="border-top:1px solid var(--border);margin:12px 0 10px"></div>

    <div class="filtersSummaryLine">
      <strong>${statsList.length} fichas · ${instCount} instituciones</strong> con los filtros activos
    </div>

    <!-- Barra de descargas unificada -->
    <div class="downloadActionBar">
      <div class="downloadSummaryHelp">
        Se descargarán <strong>${statsList.length}</strong> fichas con los filtros activos.
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
          <span class="ic">📄</span> Descargar reporte oficial (PDF)
        </button>
        ${isAdmin ? `
          <div class="herramientasMenuWrap">
            <button type="button" class="btnHerramientas" id="btnHerramientas" title="Herramientas de administración">⋯ Herramientas</button>
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
      <span>Tipo: <strong>${esc(shortName)}</strong></span>
      <span>·</span>
      <span>${statsList.length} fichas</span>
      <button type="button" class="btnCambiarFichaLink" id="btnStickyAjustar" style="margin-left:8px">Editar filtros ↑</button>
    </div>
    <div class="stickyReportesActions">
      <button type="button" class="stickyBtnExcel" id="stickyExportExcel" ${disabled ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>📊 Excel</button>
      <button type="button" class="stickyBtnPdf" id="stickyExportPdf" ${disabled ? 'disabled style="opacity:0.5;cursor:not-allowed"' : ''}>📄 PDF</button>
    </div>
  `;

  const btnAdj = document.getElementById('btnStickyAjustar');
  if (btnAdj) {
    btnAdj.addEventListener('click', () => {
      const secF = document.getElementById('secFiltrosDescargas');
      if (secF) secF.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  if (currentUser) _currentSessionUser = currentUser;
  const user = currentUser || _currentSessionUser || (state && state.currentUser) || null;

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
    <!-- Barra superior de Reportes con disparador de filtros (sube las tarjetas al tope) -->
    <div class="reportTopbarWithTrigger">
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
        <div>
          <h2 style="margin:0;font-size:19px;font-weight:800;color:var(--navy-900)">Reportes de Monitoreo</h2>
          <div style="margin-top:2px;font-size:11.5px;color:var(--text-600)">
            Avance institucional, análisis por indicador y seguimiento de colegios.
          </div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button type="button" class="btn btnFiltrosDrawerTrigger" id="btnOpenReportFiltersDrawer" title="Abrir opciones de tipo de ficha y filtros">
          <span style="font-size:15px">⚙️</span>
          <span>Filtros y Fichas</span>
          <span class="badgeActiveFiltersSummary" id="badgeActiveFiltersSummary">${esc(activeFilterLabel)}</span>
        </button>
      </div>
    </div>

    <!-- Backdrop oscuro del drawer lateral -->
    <div id="reportFiltersDrawerBackdrop" class="reportFiltersDrawerBackdrop"></div>

    <!-- Drawer Lateral Deslizante con Tipo de Ficha y Filtros -->
    <aside id="reportFiltersDrawer" class="reportFiltersDrawer" aria-label="Filtros y Selección de Ficha">
      <div class="reportDrawerHeader">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:16px">⚙️</span>
          <h3>Filtros y Selección de Ficha</h3>
        </div>
        <button type="button" id="btnCloseReportFiltersDrawer" class="btnCloseDrawer" title="Cerrar panel de filtros">✕</button>
      </div>
      <div class="reportDrawerBody">
        <div id="secTipoFicha" class="panel secReportesTipoFicha"></div>
        <div id="secFiltrosDescargas" class="panel secReportesFiltros"></div>
      </div>
      <div class="reportDrawerFooter">
        <button type="button" class="btn primary small" id="btnApplyAndCloseDrawer">
          ✓ Ver Reporte
        </button>
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
    if (window.scrollY > 150 && window.innerWidth > 768) {
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
            ${p.responsable && p.responsable !== '—' ? `<span style="color:var(--text-600)" title="Responsable: ${esc(p.responsable)}">· ${esc(p.responsable)}</span>` : ''}
          </div>
        </td>
        <td style="text-align:center">
          <button type="button" class="btn secondary small btnRegistrarPendiente"
                  data-col-id="${esc(p.colId)}" data-vis="${p.visita}" data-ft-id="${esc(ft ? ft.id : '')}"
                  title="Registrar Visita ${p.visita} para ${esc(p.colNombre)}">
            Registrar →
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export function renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, currentUser = null) {
  if (currentUser) _currentSessionUser = currentUser;
  const user = currentUser || _currentSessionUser || (state && state.currentUser) || null;

  const host = document.getElementById('consHost');
  const secTipo = document.getElementById('secTipoFicha');
  const secFiltros = document.getElementById('secFiltrosDescargas');
  if (!host) return;

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
    const prevSearch = reportesSearchTerm;
    secTipo.innerHTML = renderSection1Html(state, getFichaType, user);
    const searchInp = secTipo.querySelector('#searchFichaType');
    if (searchInp && prevSearch) {
      searchInp.value = prevSearch;
      filterCardsInDom(prevSearch);
    }
    attachSection1Listeners(secTipo, state, getFichaType, dbNs, isAdmin, navigate, user);
  }

  // 3. Renderizar Sección 2 (Filtros y Descargas)
  if (secFiltros) {
    secFiltros.innerHTML = renderSection2Html(statsList, instCount, state, getFichaType, user, isAdmin);
    attachSection2Listeners(secFiltros, state, getFichaType, dbNs, isAdmin, navigate, user, statsList);
  }

  // 4. Actualizar Sticky Bar
  updateStickyReportesBar(statsList, getFichaType);

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
    const vSt = statusFromPct(avg, sFt, 0, avgPts, vNum);
    const maxPts = isEbr ? (vNum === 2 ? 69 : 57) : (isCoordTutoria ? 63 : null);
    const scoreTitle = ((isEbr || isCoordTutoria) && avgPts !== null)
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
    let status = null;
    if (st && st.estado && st.estado.label) {
      status = { label: st.estado.label, cls: st.estado.cls };
    } else {
      status = statusFromPct(st.pct, sFt, st?.conteo_si, st?.puntaje, s.visita);
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
    let pctDisplay = (st.pct === null ? '—' : st.pct + '%');
    if (isEbr && st.puntaje !== undefined && st.puntaje !== null) {
      const v = getMomentoVisitaEbr(s);
      const maxPts = st.puntaje_max || (v === 2 ? 69 : 57);
      pctDisplay = '<strong>' + st.puntaje + '/' + maxPts + ' pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    } else if (isCoordTutoria && st.puntaje !== undefined && st.puntaje !== null) {
      pctDisplay = '<strong>' + st.puntaje + '/63 pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    }

    return '<tr class="clickable" data-row="' + s.id + '"><td>' + fmtDate(s.fecha) + '</td><td>' + esc(s.institucion) + '</td>' + typeCol + ugelRedCol + '<td>' + (s.visita ? 'V' + s.visita : '—') + '</td><td>' + esc(displayResp) + '</td><td>' + pctDisplay + '</td><td><span class="badge ' + status.cls + '">' + status.label + '</span></td><td style="white-space:nowrap"><div class="rowActions">' + pdfBtn + editBtn + delBtn + '</div></td></tr>' +
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
    const withP = g.visitas.filter(x => x.st && x.st.pct !== null);
    const avg = withP.length ? Math.round(withP.reduce((a, x) => a + x.st.pct, 0) / withP.length) : null;
    const withPts = g.visitas.filter(x => x.st && x.st.puntaje !== undefined && x.st.puntaje !== null);
    const avgPts = withPts.length ? Math.round(withPts.reduce((a, x) => a + x.st.puntaje, 0) / withPts.length) : null;
    const withSi = g.visitas.filter(x => x.st && x.st.conteo_si !== undefined && x.st.conteo_si !== null);
    const avgSi = withSi.length ? Math.round(withSi.reduce((a, x) => a + x.st.conteo_si, 0) / withSi.length) : null;

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
      gst = statusFromPct(avg, sFt, avgSi, avgPts, last.s.visita);
    }
    const scoreTitle = ((isCoordTutoria || isEbr) && avgPts !== null) ? ' title="' + avgPts + '/' + maxPts + ' pts"' : '';

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
    const scoreTitle = (isEbr && avgPts !== null) ? ' title="' + avgPts + '/' + maxPts + ' pts"' : '';
    const visitaCounts = {};
    g.visitas.forEach(v => {
      const vn = Number(v.s.visita) || 1;
      visitaCounts[vn] = (visitaCounts[vn] || 0) + 1;
    });
    const visitBadges = Object.keys(visitaCounts).sort().map(vn => {
      return `<span class="badge st-none" style="font-size:10px;padding:1px 5px;margin-right:2px;font-weight:700">V${vn}</span>`;
    }).join('');

    return `
      <tr>
        <td>
          <div style="font-weight:700;color:var(--navy-900);font-size:12.5px;line-height:1.3">${esc(g.institucion)}</div>
          ${g.red ? `<div style="font-size:10.5px;color:var(--text-500);margin-top:1px">RED: ${esc(g.red)}</div>` : ''}
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

  // Cálculo de tarjetas KPI para fichas con modalidad específica (EBR, CEBE y PRITE)
  const isEbrReport = !isAllMode && ft && isFichaEbrGestionEscolar(ft);
  const isCebeReport = !isAllMode && ft && isFichaCebeGestion(ft);
  const isPriteReport = !isAllMode && ft && isFichaPriteGestion(ft);
  const targetModality = isEbrReport ? 'EBR' : (isPriteReport ? 'PRITE' : (isCebeReport ? 'CEBE' : null));

  let cardsHtml = '';
  let secPendientesHtml = '';
  if (targetModality) {
    const padron = state.colegios || [];
    const isModalityMatch = (c, mod) => {
      if (!c) return false;
      const m = String(c.modalidad || '').toUpperCase().trim();
      const ie = String(c.ie || c.nombre || '').toUpperCase();
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
    const executedVisitKeys = new Set();
    const fichaAllSubs = (state.submissions || []).filter(s => s.fichaTypeId === ft.id);

    fichaAllSubs.forEach(s => {
      if (filtrosReporte.desde && s.fecha && s.fecha < filtrosReporte.desde) return;
      if (filtrosReporte.hasta && s.fecha && s.fecha > filtrosReporte.hasta) return;

      const vNum = isEbrReport ? (getMomentoVisitaEbr(s) || 1) : (Number(s.visita) || 1);
      let col = null;
      if (s.colegioId && targetById.has(s.colegioId)) col = targetById.get(s.colegioId);
      else if (s.codigoLocal && targetByCode.has(normalizeText(s.codigoLocal))) col = targetByCode.get(normalizeText(s.codigoLocal));
      else if (s.codigoModular && targetByCode.has(normalizeText(s.codigoModular))) col = targetByCode.get(normalizeText(s.codigoModular));
      else if (s.institucion && targetByIe.has(normalizeInstName(s.institucion))) col = targetByIe.get(normalizeInstName(s.institucion));

      if (col) {
        if (col.id) executedVisitKeys.add(col.id + '_V' + vNum);
        if (col.codigoLocal) executedVisitKeys.add(normalizeText(col.codigoLocal) + '_V' + vNum);
        if (col.ie) executedVisitKeys.add(normalizeInstName(col.ie) + '_V' + vNum);
      }
      if (s.colegioId) executedVisitKeys.add(s.colegioId + '_V' + vNum);
      if (s.codigoLocal) executedVisitKeys.add(normalizeText(s.codigoLocal) + '_V' + vNum);
      if (s.institucion) executedVisitKeys.add(normalizeInstName(s.institucion) + '_V' + vNum);
    });

    const visitasToCheck = [1, 2, 3];
    let allPendingItems = [];

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

      visitasToCheck.forEach(vNum => {
        const isExecuted = (colId && executedVisitKeys.has(colId + '_V' + vNum)) ||
          (codigoLocal && executedVisitKeys.has(normalizeText(codigoLocal) + '_V' + vNum)) ||
          (c.ie && executedVisitKeys.has(normalizeInstName(c.ie) + '_V' + vNum));

        if (!isExecuted) {
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
            responsable: responsable || 'Por asignar'
          });
        }
      });
    });

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

    secPendientesHtml = `
      <div class="panel secComparativaColegios" id="secComparativaColegios">
        <div class="comparativaHead">
          <div class="comparativaTitleWrap">
            <div class="comparativaIcon">🏫</div>
            <div>
              <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--navy-900)">
                Seguimiento por Institución Educativa (${targetModality})
              </h3>
              <p style="margin:2px 0 0;font-size:12px;color:var(--text-600)">
                Caja comparativa a la misma altura: a la izquierda colegios monitoreados y a la derecha instituciones educativas pendientes.
              </p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
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
              </div>
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
}

function filterCardsInDom(qNorm) {
  const container = document.getElementById('fichaGroupsContainer');
  if (!container) return;
  const cards = container.querySelectorAll('.fichaTypeCard');
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
    const secCards = Array.from(sec.querySelectorAll('.fichaTypeCard'));
    const secHasVisible = secCards.some(c => c.style.display !== 'none');
    sec.style.display = secHasVisible ? '' : 'none';

    const btn = sec.querySelector('[data-group-toggle]');
    const grid = sec.querySelector('.fichaCardGrid');
    if (!grid) return;

    if (qNorm && qNorm.length > 0) {
      if (secHasVisible) {
        grid.style.display = 'grid';
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
      grid.style.display = isExpanded ? 'grid' : 'none';
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
      const q = normalizeText(e.target.value.trim());
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
      const grid = groupSec ? groupSec.querySelector('.fichaCardGrid') : null;
      if (!grid) return;

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

      grid.style.display = nextExpanded ? 'grid' : 'none';
    });
  });

  // Selección de tarjeta
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

  const cards = secTipo.querySelectorAll('.fichaTypeCard');
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

  // Responsable (debounce 300ms)
  const filResp = secFiltros.querySelector('#fil_responsable');
  let debResp = null;
  if (filResp) {
    filResp.addEventListener('input', (e) => {
      clearTimeout(debResp);
      debResp = setTimeout(() => {
        filtrosReporte.responsable = e.target.value;
        consFilters.responsable = e.target.value;
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
      }, 300);
    });
  }

  // Institución (debounce 300ms)
  const filInst = secFiltros.querySelector('#fil_inst');
  let debInst = null;
  if (filInst) {
    filInst.addEventListener('input', (e) => {
      clearTimeout(debInst);
      debInst = setTimeout(() => {
        filtrosReporte.institucion = e.target.value;
        consFilters.institucion = e.target.value;
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
      }, 300);
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


  // Fechas Desde / Hasta
  const filDesde = secFiltros.querySelector('#fil_desde');
  if (filDesde) {
    filDesde.addEventListener('input', (e) => {
      filtrosReporte.desde = e.target.value;
      consFilters.desde = e.target.value;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }
  const filHasta = secFiltros.querySelector('#fil_hasta');
  if (filHasta) {
    filHasta.addEventListener('input', (e) => {
      filtrosReporte.hasta = e.target.value;
      consFilters.hasta = e.target.value;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Atajos de período
  secFiltros.querySelectorAll('[data-quick-date]').forEach(btn => {
    btn.addEventListener('click', () => {
      const qTipo = btn.dataset.quickDate;
      const { desde, hasta } = getPeriodoFechas(qTipo);
      filtrosReporte.desde = desde;
      filtrosReporte.hasta = hasta;
      consFilters.desde = desde;
      consFilters.hasta = hasta;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  });

  // Quitar filtro individual desde chip
  secFiltros.querySelectorAll('[data-clear-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const k = btn.dataset.clearFilter;
      if (k && filtrosReporte[k] !== undefined) {
        filtrosReporte[k] = '';
        consFilters[k] = '';
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
      regSelectedTypeId = sub.fichaTypeId;
      regBuiltFor = null;
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
      regSelectedTypeId = ftId;
      regBuiltFor = null;
      regSelectedColegioId = colId || null;
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

        const headers = ['N°', 'Institución Educativa', 'Cód. Local', 'Cód. Modular', 'Distrito', 'REI', 'Visita', 'Especialista Responsable'];
        const rowsData = exportList.map((p, idx) => [
          idx + 1,
          p.colNombre,
          p.codigoLocal || '',
          p.codigoModular || '',
          p.distrito || '',
          p.rei && p.rei !== '—' ? ('REI ' + p.rei) : 'Sin REI',
          `Visita ${p.visita} (${p.visitaLabel})`,
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
  const isEbr = isFichaEbrGestionEscolar(ft);
  const header = ['Fecha', 'Institución', 'UGEL', 'Código', 'Visita', 'Responsable', 'Director', isCoord ? 'Puntaje (de 63)' : (isEbr ? 'Puntaje Obtenido' : '% Cumplimiento'), (isCoord || isEbr) ? '% Equivalente' : '', 'Nivel / Estado', 'Datos adicionales', 'Observaciones', 'Compromisos'].filter(Boolean);
  const rows = statsList.map(x => {
    const s = x.s, st = x.st;
    const extras = (s.extras || []).map(e => e.label + ': ' + e.value).join(' | ');
    const comps = (Array.isArray(s.compromisos) ? s.compromisos : Array.isArray(s.compromisosList) ? s.compromisosList : []).map(c => c.texto).join(' | ');
    let subResp = getSubmissionResponsable(s, _appState, _currentSessionUser);
    if (!subResp || /^\d+$/.test(subResp) || subResp.includes('@') || subResp === '—') {
      subResp = (s.responsable && !/^\d+$/.test(String(s.responsable).trim()) && !String(s.responsable).includes('@')) ? String(s.responsable).trim() : '';
    }
    const stLabel = (st && st.estado && st.estado.label) ? st.estado.label : statusFromPct(st.pct, ft, st?.conteo_si, st?.puntaje, s?.visita).label;
    if (isCoord) {
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

/* =========================================================================
   COLEGIOS TAB — (Módulo modularizado en ./ui/colegios-tab.js)
   ========================================================================= */

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
      return { id: 'hdr_' + idx, label: ex, tipo: 'texto', required: false, opciones: '' };
    }
    const safeLabel = (ex.label || '').trim();
    const safeId = ex.id || ('hdr_' + (safeLabel ? safeLabel.replace(/[^a-z0-9]+/gi, '_').toLowerCase() : idx) + '_' + idx);
    let safeTipo = (ex.tipo || 'texto').toLowerCase();
    if (!['texto', 'numero', 'fecha', 'si_no', 'select', 'textarea'].includes(safeTipo)) safeTipo = 'texto';
    const safeOpts = Array.isArray(ex.opciones) ? ex.opciones.join(', ') : (typeof ex.opciones === 'string' ? ex.opciones : '');
    return {
      id: safeId,
      label: safeLabel,
      tipo: safeTipo,
      required: !!ex.required,
      opciones: safeOpts,
    };
  }).filter(Boolean);
}

let plantillasSearchQuery = '';
let builderMode = 'visual'; // 'visual' | 'json'
let builderJsonUnlocked = false; // Requiere autenticación con contraseña de admin
let builderPreviewMode = 'formulario'; // 'formulario' | 'documento'
let builderActiveVisitPreview = 0; // índice de la visita simulada en vista previa
let builderActiveVisitTab = 0; // índice de la visita activa en el editor de secciones diferenciadas
let builderMobileTab = 'editor'; // 'editor' | 'preview'
let builderIsDirty = false;
let builderTestAnswers = {};

export function cleanBuilderStateForExport(bs) {
  if (!bs) return {};
  const res = {
    id: builderEditingId || undefined,
    nombre: bs.nombre || '',
    nombreCorto: bs.nombreCorto || bs.nombre || '',
    descripcion: bs.descripcion || '',
    icono: bs.icono || '📋',
    color: bs.color || (FICHA_PALETTE[0] || {}).hex || '#1E40AF',
    modalidad: bs.modalidad || 'General',
    tipoRespuesta: bs.tipoRespuesta || 'si_no',
    regla_nivel: bs.regla_nivel || 'porcentaje',
    regla_nivel_config: bs.regla_nivel_config || undefined,
    version: bs.version || '2026.1',
    tieneVisitas: !!bs.tieneVisitas,
    tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
    visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
    extras: (bs.extras || []).map(e => ({
      id: e.id,
      label: e.label || '',
      tipo: e.tipo || 'texto',
      required: !!e.required,
      opciones: e.opciones || undefined
    })),
    tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
    compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
    secciones: (bs.secciones || []).map(s => ({
      nombre: s.nombre || '',
      items: (s.items || []).map(i => ({
        id: i.id,
        texto: i.texto || '',
        evidencia: i.evidencia || ''
      }))
    }))
  };

  if (bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita' && bs.seccionesPorVisita) {
    res.seccionesPorVisita = {};
    Object.keys(bs.seccionesPorVisita).forEach(k => {
      res.seccionesPorVisita[k] = (bs.seccionesPorVisita[k] || []).map(s => ({
        nombre: s.nombre || '',
        items: (s.items || []).map(i => ({
          id: i.id,
          texto: i.texto || '',
          evidencia: i.evidencia || ''
        }))
      }));
    });
  }

  return res;
}

function blankBuilder() {
  return {
    nombre: '',
    nombreCorto: '',
    descripcion: '',
    icono: '📋',
    color: FICHA_PALETTE[0].hex,
    modalidad: 'General',
    tipoRespuesta: 'si_no',
    regla_nivel: 'porcentaje',
    regla_nivel_config: {
      inicio: { min: 0, max: 11, label: 'Incipiente' },
      proceso: { min: 12, max: 23, label: 'Parcial' },
      logrado: { min: 24, max: 31, label: 'Lograda' }
    },
    version: '2026.1',
    tieneVisitas: false,
    tipoVisitas: 'mismos_items',
    visitas: ['Visita 1', 'Visita 2', 'Visita 3'],
    seccionesPorVisita: {},
    secciones: [{
      nombre: 'Sección 1: Planificación y Gestión',
      items: [{ id: genId(), texto: '', evidencia: '' }]
    }],
    extras: [
      { id: genId(), label: 'UGEL', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'RED / REI', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Código modular / local', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Director(a) en funciones', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Responsable / especialista', tipo: 'texto', required: false, opciones: '' },
    ],
    tablas: [],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    }
  };
}

function syncBuilderFromDom(container, bs) {
  if (!bs) return;
  if (builderMode === 'json') {
    const jsonTextarea = document.getElementById('builderJsonTextarea');
    if (jsonTextarea) {
      try {
        const parsed = JSON.parse(jsonTextarea.value);
        Object.assign(bs, parsed);
        bs.extras = normalizeExtras(bs.extras);
      } catch (e) {
        console.warn('JSON no parseable al sincronizar:', e);
      }
    }
    return;
  }
  const icoEl = document.getElementById('b_icono');
  if (icoEl) bs.icono = icoEl.value;
  const nomEl = document.getElementById('b_nombre');
  if (nomEl) bs.nombre = nomEl.value;
  const nomCortoEl = document.getElementById('b_nombre_corto');
  if (nomCortoEl) bs.nombreCorto = nomCortoEl.value;
  const descEl = document.getElementById('b_desc');
  if (descEl) bs.descripcion = descEl.value;
  const tipoEl = document.getElementById('b_tipo');
  if (tipoEl) bs.tipoRespuesta = tipoEl.value;
  const modEl = document.getElementById('b_modalidad');
  if (modEl) bs.modalidad = modEl.value;
  const reglaEl = document.getElementById('b_regla_nivel');
  if (reglaEl) bs.regla_nivel = reglaEl.value;
  const verEl = document.getElementById('b_version');
  if (verEl) bs.version = verEl.value;

  const tvEl = document.getElementById('b_tiene_visitas');
  if (tvEl) bs.tieneVisitas = tvEl.checked;

  const tvModeRadio = container.querySelector('input[name="b_tipo_visitas"]:checked');
  if (tvModeRadio) bs.tipoVisitas = tvModeRadio.value;

  // Sincronizar visitas
  container.querySelectorAll('[data-visitainp]').forEach(inp => {
    const vIdx = +inp.dataset.visitainp;
    if (Array.isArray(bs.visitas) && bs.visitas[vIdx] !== undefined) {
      bs.visitas[vIdx] = inp.value;
    }
  });

  // Sincronizar rangos personalizados si regla_nivel === 'conteo_rangos'
  if (bs.regla_nivel === 'conteo_rangos') {
    if (!bs.regla_nivel_config) bs.regla_nivel_config = {};
    const iniMin = document.getElementById('b_rng_ini_min');
    const iniMax = document.getElementById('b_rng_ini_max');
    const iniLbl = document.getElementById('b_rng_ini_lbl');
    const procMin = document.getElementById('b_rng_proc_min');
    const procMax = document.getElementById('b_rng_proc_max');
    const procLbl = document.getElementById('b_rng_proc_lbl');
    const logMin = document.getElementById('b_rng_log_min');
    const logMax = document.getElementById('b_rng_log_max');
    const logLbl = document.getElementById('b_rng_log_lbl');

    bs.regla_nivel_config.inicio = {
      min: iniMin ? parseInt(iniMin.value, 10) || 0 : 0,
      max: iniMax ? parseInt(iniMax.value, 10) || 11 : 11,
      label: iniLbl ? iniLbl.value.trim() || 'Incipiente' : 'Incipiente'
    };
    bs.regla_nivel_config.proceso = {
      min: procMin ? parseInt(procMin.value, 10) || 12 : 12,
      max: procMax ? parseInt(procMax.value, 10) || 23 : 23,
      label: procLbl ? procLbl.value.trim() || 'Parcial' : 'Parcial'
    };
    bs.regla_nivel_config.logrado = {
      min: logMin ? parseInt(logMin.value, 10) || 24 : 24,
      max: logMax ? parseInt(logMax.value, 10) || 31 : 31,
      label: logLbl ? logLbl.value.trim() || 'Lograda' : 'Lograda'
    };
  }

  // Sincronizar compromisos
  const cHab = document.getElementById('b_comp_hab');
  const cDir = document.getElementById('b_comp_dir');
  const cEsp = document.getElementById('b_comp_esp');
  const cFilas = document.getElementById('b_comp_filas');
  if (!bs.compromisos) bs.compromisos = {};
  if (cHab) bs.compromisos.habilitado = cHab.checked;
  if (cDir) bs.compromisos.director = cDir.checked;
  if (cEsp) bs.compromisos.especialista = cEsp.checked;
  if (cFilas) bs.compromisos.filasPorVisita = Math.max(1, parseInt(cFilas.value, 10) || 3);

  const activeColorEl = container.querySelector('.colorSwatch.active');
  if (activeColorEl && activeColorEl.dataset.color) {
    bs.color = activeColorEl.dataset.color;
  }

  // Sincronizar secciones e ítems (soporta modo multi-visita diferenciado)
  const isMultiVisitaDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
  if (isMultiVisitaDiferenciada && !bs.seccionesPorVisita) {
    bs.seccionesPorVisita = {};
  }
  const targetSecs = isMultiVisitaDiferenciada
    ? (bs.seccionesPorVisita[builderActiveVisitTab] || bs.secciones || [])
    : (bs.secciones || []);

  container.querySelectorAll('[data-secname]').forEach(inp => {
    const sIdx = +inp.dataset.secname;
    if (targetSecs && targetSecs[sIdx]) targetSecs[sIdx].nombre = inp.value;
  });
  container.querySelectorAll('[data-sec][data-item]').forEach(inp => {
    const sIdx = +inp.dataset.sec;
    const iIdx = +inp.dataset.item;
    if (targetSecs && targetSecs[sIdx] && targetSecs[sIdx].items && targetSecs[sIdx].items[iIdx]) {
      targetSecs[sIdx].items[iIdx].texto = inp.value;
    }
  });
  container.querySelectorAll('[data-sec][data-item-evidencia]').forEach(inp => {
    const sIdx = +inp.dataset.sec;
    const iIdx = +inp.dataset.itemEvidencia;
    if (targetSecs && targetSecs[sIdx] && targetSecs[sIdx].items && targetSecs[sIdx].items[iIdx]) {
      targetSecs[sIdx].items[iIdx].evidencia = inp.value;
    }
  });
  container.querySelectorAll('[data-sec][data-item-code]').forEach(inp => {
    const sIdx = +inp.dataset.sec;
    const iIdx = +inp.dataset.itemCode;
    if (targetSecs && targetSecs[sIdx] && targetSecs[sIdx].items && targetSecs[sIdx].items[iIdx]) {
      targetSecs[sIdx].items[iIdx].id = inp.value.trim() || targetSecs[sIdx].items[iIdx].id;
    }
  });

  if (isMultiVisitaDiferenciada) {
    bs.seccionesPorVisita[builderActiveVisitTab] = targetSecs;
    if (builderActiveVisitTab === 0 || !bs.secciones || bs.secciones.length === 0) {
      bs.secciones = targetSecs;
    }
  } else {
    bs.secciones = targetSecs;
  }

  // Sincronizar campos de cabecera
  container.querySelectorAll('[data-extralabel]').forEach(inp => {
    const eIdx = +inp.dataset.extralabel;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].label = inp.value;
  });
  container.querySelectorAll('[data-extratipo]').forEach(sel => {
    const eIdx = +sel.dataset.extratipo;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].tipo = sel.value;
  });
  container.querySelectorAll('[data-extrareq]').forEach(chk => {
    const eIdx = +chk.dataset.extrareq;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].required = chk.checked;
  });
  container.querySelectorAll('[data-extraopts]').forEach(inp => {
    const eIdx = +inp.dataset.extraopts;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].opciones = inp.value;
  });

  // Sincronizar tablas especializadas
  container.querySelectorAll('[data-tbl-titulo]').forEach(inp => {
    const tIdx = +inp.dataset.tblTitulo;
    if (bs.tablas && bs.tablas[tIdx]) bs.tablas[tIdx].titulo = inp.value;
  });
  container.querySelectorAll('[data-tbl-desc]').forEach(inp => {
    const tIdx = +inp.dataset.tblDesc;
    if (bs.tablas && bs.tablas[tIdx]) bs.tablas[tIdx].descripcion = inp.value;
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
    <div class="empty" style="padding:36px 20px;text-align:center">
      <div style="font-size:42px;margin-bottom:10px">📋</div>
      <h4>${allTypes.length === 0 ? 'Aún no hay plantillas de ficha cargadas en Firestore' : 'No se encontraron plantillas'}</h4>
      <p style="max-width:540px;margin:0 auto 16px;color:var(--text-600)">
        ${allTypes.length === 0
      ? 'Puedes inicializar las 8 plantillas oficiales del sistema (EBR con Visitas 1, 2 y 3, JEC, CEBE, PRITE, Directivos, etc.) con sus preguntas canónicas y conexiones intactas.'
      : `No hay resultados para "${esc(plantillasSearchQuery)}".`}
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${allTypes.length === 0 ? '<button type="button" class="btn" id="btnSyncPlantillasEmpty" style="font-weight:700">⚡ Cargar 8 Plantillas Base Oficiales</button>' : ''}
        <button type="button" class="btn secondary" id="btnCreateNewFtEmpty">+ Nuevo tipo de ficha</button>
      </div>
    </div>
  ` : filtered.map((ft, idx) => {
        const color = getFichaColor(ft, idx);
        const mod = getFichaModalidad(ft);
        const count = deduplicateTwinSubmissions((state.submissions || []).filter(s => s.fichaTypeId === ft.id)).length;
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
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button type="button" class="btn secondary" id="btnSyncPlantillasBase" title="Sincroniza o restaura las 8 plantillas oficiales en Firestore manteniendo conexiones con visitas existentes">
          ⚡ Sincronizar Plantillas Base
        </button>
        <button type="button" class="btn" id="btnNewFichaType">
          ＋ Nuevo tipo de ficha
        </button>
      </div>
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
      builderMode = 'visual';
      builderJsonUnlocked = false;
      builderActiveVisitPreview = 0;
      builderIsDirty = false;
      tiposView = 'builder';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  }

  // "⚡ Sincronizar Plantillas Base Oficiales"
  const onSyncBaseTemplates = async () => {
    if (!isAdmin) {
      showToast('Solo los administradores pueden sincronizar plantillas base.');
      return;
    }
    const confirmed = confirm(
      '¿Deseas sincronizar/restaurar las 8 plantillas base oficiales en Firestore?\n\n' +
      '• Monitoreo Gestión Escolar EBR (Visitas 1, 2 y 3 con R1–R5)\n' +
      '• Implementación Modelo JEC (31 ítems)\n' +
      '• Gestión Escolar CEBE (34 ítems)\n' +
      '• Gestión Escolar PRITE (32 ítems)\n' +
      '• Ficha al Directivo de IE (21 ítems)\n' +
      '• Rúbricas de Aula MINEDU (5 ítems)\n' +
      '• Coordinador de Tutoría JEC (21 ítems)\n' +
      '• Materiales Educativos CEBE/PRITE (14 ítems)\n\n' +
      'Esta acción guardará las plantillas en Firestore con sus IDs canónicos exactos, ' +
      'asegurando que ninguna visita histórica pierda conexión y permitiendo editarlas en el navegador.'
    );
    if (!confirmed) return;

    if (!dbNs) {
      showToast('No hay conexión a la base de datos.');
      return;
    }

    try {
      showToast('Sincronizando plantillas oficiales en Firestore...');
      const entries = Object.entries(PLANTILLAS_BASE_OFICIALES);
      let count = 0;
      for (const [docId, ftData] of entries) {
        const payload = {
          ...ftData,
          updatedAt: Date.now()
        };
        await dbNs.collection('fichaTypes').doc(docId).set(payload, { merge: true });
        count++;
      }
      showToast(`✓ Se sincronizaron exitosamente las ${count} plantillas oficiales.`);
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    } catch (err) {
      console.error('Error sincronizando plantillas base:', err);
      showToast('Error al sincronizar plantillas: ' + err.message);
    }
  };

  const syncBtn = document.getElementById('btnSyncPlantillasBase');
  if (syncBtn) syncBtn.onclick = onSyncBaseTemplates;
  const syncEmptyBtn = document.getElementById('btnSyncPlantillasEmpty');
  if (syncEmptyBtn) syncEmptyBtn.onclick = onSyncBaseTemplates;

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
      builderState.nombreCorto = builderState.nombreCorto || builderState.nombre || '';
      builderState.version = typeof builderState.version === 'object' && builderState.version !== null ? (builderState.version.anio || '2026.1') : (builderState.version || '2026.1');
      builderState.regla_nivel = typeof builderState.regla_nivel === 'object' && builderState.regla_nivel !== null ? (builderState.regla_nivel.tipo || 'porcentaje') : (builderState.regla_nivel || 'porcentaje');
      builderState.tieneVisitas = !!builderState.tieneVisitas || (Array.isArray(builderState.visitas) && builderState.visitas.length > 0);
      if (Array.isArray(builderState.visitas) && builderState.visitas.length > 0) {
        builderState.visitas = builderState.visitas.map((v, idx) => typeof v === 'string' ? v : ('Visita ' + v));
      } else {
        builderState.visitas = ['Visita 1', 'Visita 2', 'Visita 3'];
      }
      builderState.tablas = Array.isArray(builderState.tablas) ? builderState.tablas : [];

      // Auto-popular tablas institucionales si están vacías y es CEBE o PRITE
      if (builderState.tablas.length === 0) {
        const idLower = String(ft.id || '').toLowerCase();
        if (idLower.includes('prite')) {
          builderState.tablas = [
            {
              id: 'tbl_personal_prite',
              titulo: 'Cuadro de Personal del PRITE',
              descripcion: 'Registro de plazas y personal en funciones',
              columnas: [
                { id: 'c_cargo', nombre: 'Cargo / Función', tipo: 'texto' },
                { id: 'c_plazas', nombre: 'N° Plazas', tipo: 'numero' },
                { id: 'c_cubiertas', nombre: 'Cubiertas', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_dir', etiqueta: 'Director(a)' },
                { id: 'f_tut', etiqueta: 'Docentes Tutores' },
                { id: 'f_ter', etiqueta: 'Terapistas / Psicólogos' },
                { id: 'f_aux', etiqueta: 'Auxiliares de Educación' }
              ]
            },
            {
              id: 'tbl_estudiantes_prite',
              titulo: 'Cuadro de Matrícula y Atención Temprana',
              descripcion: 'Distribución de niños y niñas por rango etario',
              columnas: [
                { id: 'c_grupo', nombre: 'Rango de Edad', tipo: 'texto' },
                { id: 'c_meta', nombre: 'Meta Programada', tipo: 'numero' },
                { id: 'c_mat', nombre: 'Matriculados', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_01', etiqueta: '0 a 12 meses' },
                { id: 'f_12', etiqueta: '13 a 24 meses' },
                { id: 'f_23', etiqueta: '25 a 36 meses' },
                { id: 'f_tot', etiqueta: 'Total Atendidos' }
              ]
            }
          ];
        } else if (idLower.includes('cebe')) {
          builderState.tablas = [
            {
              id: 'tbl_personal_cebe',
              titulo: 'Cuadro de Personal del CEBE',
              descripcion: 'Distribución del equipo directivo, docente y de apoyo',
              columnas: [
                { id: 'c_cargo', nombre: 'Cargo / Especialidad', tipo: 'texto' },
                { id: 'c_nom', nombre: 'Nombrados', tipo: 'numero' },
                { id: 'c_con', nombre: 'Contratados', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_dir', etiqueta: 'Personal Directivo' },
                { id: 'f_doc', etiqueta: 'Personal Docente de Aula' },
                { id: 'f_aux', etiqueta: 'Auxiliares de Educación' },
                { id: 'f_adm', etiqueta: 'Personal Administrativo' }
              ]
            },
            {
              id: 'tbl_saanee_cebe',
              titulo: 'Equipo SAANEE (Servicio de Apoyo y Asesoramiento)',
              descripcion: 'Profesionales del equipo interdisciplinario',
              columnas: [
                { id: 'c_prof', nombre: 'Profesional', tipo: 'texto' },
                { id: 'c_cant', nombre: 'Cantidad', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_s1', etiqueta: 'Coordinador(a) SAANEE' },
                { id: 'f_s2', etiqueta: 'Psicólogo(a)' },
                { id: 'f_s3', etiqueta: 'Tecnólogo Médico / Terapista' },
                { id: 'f_s4', etiqueta: 'Intérprete de Lengua de Señas' }
              ]
            }
          ];
        }
      }

      if (!builderState.compromisos) {
        builderState.compromisos = {
          habilitado: true,
          director: true,
          especialista: true,
          filasPorVisita: 3
        };
      }

      // Asegurar campo evidencia en secciones
      if (Array.isArray(builderState.secciones)) {
        builderState.secciones.forEach(sec => {
          if (Array.isArray(sec.items)) {
            sec.items.forEach(it => {
              if (it.evidencia === undefined) it.evidencia = '';
            });
          }
        });
      }

      builderEditingId = ft.id;
      builderMode = 'visual';
      builderJsonUnlocked = false;
      builderActiveVisitPreview = 0;
      builderActiveVisitTab = 0;
      builderState.tipoVisitas = builderState.tipoVisitas || (builderState.seccionesPorVisita && Object.keys(builderState.seccionesPorVisita).length > 0 ? 'items_por_visita' : 'mismos_items');
      builderState.seccionesPorVisita = builderState.seccionesPorVisita || {};
      if (builderState.tipoVisitas === 'items_por_visita' && !builderState.seccionesPorVisita[0]) {
        builderState.seccionesPorVisita[0] = JSON.parse(JSON.stringify(builderState.secciones || []));
      }
      builderState.regla_nivel_config = builderState.regla_nivel_config || {
        inicio: { min: 0, max: 11, label: 'Incipiente' },
        proceso: { min: 12, max: 23, label: 'Parcial' },
        logrado: { min: 24, max: 31, label: 'Lograda' }
      };
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

/**
 * Solicita la contraseña del administrador para desbloquear el editor JSON
 * @param {object} currentUser 
 * @param {Function} onSuccess 
 */
function promptAdminPasswordModal(currentUser, onSuccess) {
  const adminEmail = (currentUser && currentUser.email) ? currentUser.email : 'agebre@ugel03.gob.pe';
  const modalWrap = document.createElement('div');
  modalWrap.className = 'adminAuthModalOverlay';
  modalWrap.id = 'adminAuthModalOverlay';

  modalWrap.innerHTML = `
    <div class="adminAuthCard">
      <div class="adminAuthHeader">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">🔐</span>
          <div>
            <h3 style="margin:0;font-size:14px;color:#FFFFFF;font-weight:700">Autenticación de Administrador</h3>
            <div style="font-size:11px;color:#94A3B8">Editor de Código JSON (Modo Avanzado)</div>
          </div>
        </div>
        <button type="button" class="downloadModalClose" id="m_auth_close" style="background:transparent;border:none;color:#94A3B8;font-size:20px;cursor:pointer;line-height:1">✕</button>
      </div>
      <form id="adminAuthForm" style="margin:0">
        <div class="adminAuthBody">
          <p style="font-size:12.5px;color:var(--text-600);margin:0 0 14px;line-height:1.5">
            El <strong>Editor de Código JSON</strong> permite alterar directamente la estructura, tablas e indicadores oficiales. Para habilitarlo, ingresa tu contraseña institucional:
          </p>
          <div style="margin-bottom:12px;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">👤</span>
            <div style="font-size:12px;color:#1E293B;font-weight:600;overflow:hidden;text-overflow:ellipsis">
              ${esc(adminEmail)}
            </div>
          </div>
          <div class="field" style="margin-bottom:6px">
            <label for="adminAuthPassword" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Contraseña de Administrador *</label>
            <div style="position:relative;display:flex;align-items:center">
              <input type="password" id="adminAuthPassword" placeholder="Ingresa tu contraseña" required autocomplete="current-password" style="width:100%;padding:9px 40px 9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px">
              <button type="button" id="adminAuthTogglePw" style="position:absolute;right:8px;background:none;border:none;color:var(--text-400);cursor:pointer;font-size:14px;padding:4px" title="Mostrar/ocultar contraseña">👁️</button>
            </div>
          </div>
          <div id="adminAuthError" class="adminAuthError"></div>
        </div>
        <div class="downloadModalFooter" style="background:#F8FAFC;padding:12px 20px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line)">
          <button type="button" class="btn secondary" id="m_auth_cancel">Cancelar</button>
          <button type="submit" class="btn" id="m_auth_submit" style="font-weight:700">🔓 Desbloquear JSON</button>
        </div>
      </form>
    </div>
  `;

  lockBodyScroll();
  document.body.appendChild(modalWrap);

  const pwInput = modalWrap.querySelector('#adminAuthPassword');
  const errBox = modalWrap.querySelector('#adminAuthError');
  const submitBtn = modalWrap.querySelector('#m_auth_submit');
  const toggleBtn = modalWrap.querySelector('#adminAuthTogglePw');

  setTimeout(() => { if (pwInput) pwInput.focus(); }, 100);

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  const close = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };

  modalWrap.querySelector('#m_auth_close').onclick = close;
  modalWrap.querySelector('#m_auth_cancel').onclick = close;

  if (toggleBtn && pwInput) {
    toggleBtn.onclick = () => {
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      toggleBtn.textContent = isPw ? '🙈' : '👁️';
    };
  }

  modalWrap.querySelector('#adminAuthForm').onsubmit = async (e) => {
    e.preventDefault();
    const pw = (pwInput.value || '').trim();
    if (!pw) {
      errBox.textContent = 'Ingresa tu contraseña de administrador.';
      errBox.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';
    errBox.style.display = 'none';

    try {
      await verifyAdminPassword(pw, adminEmail);
      builderJsonUnlocked = true;
      close();
      showToast('✓ Identidad confirmada. Modo JSON desbloqueado.');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.warn('Fallo verificación de administrador:', err);
      errBox.textContent = err.message || 'Contraseña incorrecta.';
      errBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '🔓 Desbloquear JSON';
      pwInput.focus();
      pwInput.select();
    }
  };
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
  if (!bs.nombreCorto) {
    bs.nombreCorto = bs.nombre || '';
  }
  if (!bs.regla_nivel) {
    bs.regla_nivel = 'porcentaje';
  }
  if (!bs.version) {
    bs.version = '2026.1';
  }
  if (bs.tieneVisitas === undefined) {
    bs.tieneVisitas = false;
  }
  if (!Array.isArray(bs.visitas) || bs.visitas.length === 0) {
    bs.visitas = ['Visita 1', 'Visita 2', 'Visita 3'];
  }
  if (!Array.isArray(bs.tablas)) {
    bs.tablas = [];
  }
  if (!bs.compromisos) {
    bs.compromisos = { habilitado: true, director: true, especialista: true, filasPorVisita: 3 };
  }

  const existingCount = builderEditingId
    ? (state.submissions || []).filter(s => s.fichaTypeId === builderEditingId).length
    : 0;

  const MODALIDADES = ['General', 'EBR Inicial', 'EBR Primaria', 'EBR Secundaria', 'JEC', 'CEBE', 'PRITE', 'EBE', 'Directivos', 'Docentes', 'Tutoría', 'Convivencia'];

  const REGLAS_NIVEL_MAP = {
    porcentaje: 'Porcentaje de logro (%) — Umbrales Logrado / En proceso / Inicio',
    conteo_rangos: 'Conteo de puntos por rangos numéricos (ej: JEC 0-11 Incipiente, 12-23 Parcial, 24-31 Lograda)',
    sumatoria: 'Sumatoria directa de puntajes acumulados',
    promedio: 'Promedio simple de valoración (1 a 4 / 1 a 5)',
    ponderado: 'Puntaje ponderado por pesos específicos'
  };

  const isMultiVisitaDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
  if (isMultiVisitaDiferenciada) {
    if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
    if (builderActiveVisitTab >= (bs.visitas || []).length) builderActiveVisitTab = 0;
    if (!bs.seccionesPorVisita[builderActiveVisitTab]) {
      bs.seccionesPorVisita[builderActiveVisitTab] = JSON.parse(JSON.stringify(bs.secciones || []));
    }
  }

  const currentDisplaySections = isMultiVisitaDiferenciada
    ? (bs.seccionesPorVisita[builderActiveVisitTab] || [])
    : (bs.secciones || []);

  // Helper para generar el HTML de Secciones e Indicadores
  const seccionesHtml = currentDisplaySections.map((sec, si) => {
    const itemsHtml = (sec.items || []).map((it, ii) => {
      const itCode = it.id || ((si + 1) + '.' + (ii + 1));
      return `
        <div class="listRow itemDefRow" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;padding:8px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:700;color:var(--ink-soft);min-width:32px">#${si + 1}.${ii + 1}</span>
            <input type="text" placeholder="Cód" title="Identificador o código del ítem" value="${esc(itCode)}" data-sec="${si}" data-item-code="${ii}" style="width:75px;font-weight:700;font-size:12px;text-align:center">
            <input type="text" placeholder="Texto del indicador o criterio de monitoreo *" value="${esc(it.texto)}" data-sec="${si}" data-item="${ii}" style="flex:1;font-weight:500">
            <button type="button" class="iconBtn small" data-rmitem="${si}|${ii}" title="Quitar ítem">✕</button>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding-left:40px">
            <span style="font-size:12px" title="Evidencias sugeridas">📂</span>
            <input type="text" placeholder="Evidencias sugeridas / Medios de verificación (ej: RD, PEI, Acta de reunión, Sesiones)..." value="${esc(it.evidencia || '')}" data-sec="${si}" data-item-evidencia="${ii}" style="flex:1;font-size:12px;color:var(--text-600)">
          </div>
        </div>
      `;
    }).join('');

    const isFirst = si === 0;
    const isLast = si === currentDisplaySections.length - 1;

    return `
      <fieldset class="secCard" draggable="true" data-sec-idx="${si}" style="margin-bottom:16px;border:1px solid var(--line-strong);border-radius:var(--radius);padding:14px;background:#FFFFFF">
        <legend style="padding:0 8px;font-weight:700;display:flex;align-items:center;gap:6px">
          <span class="secCardHandle" title="Arrastra para mover la sección" style="cursor:grab">⠿</span>
          <span class="secOrderBadge" style="background:var(--primary);color:#fff;border-radius:10px;padding:1px 7px;font-size:11px">#${si + 1}</span>
          <input type="text" placeholder="Nombre de la sección / dimensión *" value="${esc(sec.nombre)}" data-secname="${si}" style="font-family:inherit;font-weight:700;border:none;border-bottom:1.5px solid var(--line-strong);padding:4px 8px;width:340px;background:transparent;font-size:14px">
        </legend>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px dashed var(--line)">
          <span style="font-size:12px;color:var(--ink-soft);margin-right:auto">Posición:</span>
          <button type="button" class="btn secondary small" data-movesec="${si}|up" ${isFirst ? 'disabled style="opacity:0.35;cursor:not-allowed"' : ''} title="Mover sección arriba">▲ Subir</button>
          <button type="button" class="btn secondary small" data-movesec="${si}|down" ${isLast ? 'disabled style="opacity:0.35;cursor:not-allowed"' : ''} title="Mover sección abajo">▼ Bajar</button>
        </div>
        ${itemsHtml || '<p class="helpText" style="margin:4px 0 10px">Sin indicadores en esta sección.</p>'}
        <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn secondary small" data-additem="${si}">＋ Agregar ítem</button>
          <button type="button" class="btn danger small" data-rmsec="${si}">🗑️ Quitar sección</button>
        </div>
      </fieldset>
    `;
  }).join('') || '<p class="helpText" style="padding:14px;border:1px dashed var(--line);border-radius:6px;text-align:center">Sin secciones. Agrega la primera sección para esta ficha.</p>';

  // Helper para generar el HTML de Campos de Cabecera (Extras)
  const extrasHtml = (bs.extras || []).map((ex, i) => {
    const isFirst = i === 0;
    const isLast = i === (bs.extras || []).length - 1;
    const isSelect = ex.tipo === 'select';
    return `
      <div class="extraDefRow" data-extra-idx="${i}" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;padding:8px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="secOrderBadge" style="font-size:11px;font-weight:700">#${i + 1}</span>
          <input type="text" class="extraLabelInp" placeholder="Etiqueta del campo (ej: Director(a), Turno, Nivel)" value="${esc(ex.label)}" data-extralabel="${i}" style="flex:1">
          <select class="extraTipoSel" data-extratipo="${i}" style="max-width:145px">
            <option value="texto" ${ex.tipo === 'texto' ? 'selected' : ''}>Texto corto</option>
            <option value="numero" ${ex.tipo === 'numero' ? 'selected' : ''}>Número</option>
            <option value="fecha" ${ex.tipo === 'fecha' ? 'selected' : ''}>Fecha</option>
            <option value="si_no" ${ex.tipo === 'si_no' ? 'selected' : ''}>Sí / No</option>
            <option value="select" ${ex.tipo === 'select' ? 'selected' : ''}>Selector desplegable</option>
            <option value="textarea" ${ex.tipo === 'textarea' ? 'selected' : ''}>Texto largo / Área</option>
          </select>
          <label class="extraReqLabel" style="font-size:11.5px;display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" data-extrareq="${i}" ${ex.required ? 'checked' : ''}> Req.
          </label>
          <div class="extraActs" style="display:flex;gap:4px">
            <button type="button" class="iconBtn small" data-moveextra="${i}|up" ${isFirst ? 'disabled' : ''} title="Subir">▲</button>
            <button type="button" class="iconBtn small" data-moveextra="${i}|down" ${isLast ? 'disabled' : ''} title="Bajar">▼</button>
            <button type="button" class="iconBtn small" data-rmextra="${i}" title="Quitar">✕</button>
          </div>
        </div>
        ${isSelect ? `
          <div style="display:flex;align-items:center;gap:6px;padding-left:26px">
            <span style="font-size:11.5px;color:var(--text-600);font-weight:600">Opciones:</span>
            <input type="text" placeholder="Separadas por comas (ej: Mañana, Tarde, Noche)" value="${esc(ex.opciones || '')}" data-extraopts="${i}" style="flex:1;font-size:11.5px">
          </div>
        ` : ''}
      </div>
    `;
  }).join('') || '<p class="helpText" style="padding:8px;font-style:italic">Sin campos personalizados de cabecera.</p>';

  // Helper para generar el HTML de Tablas Cuantitativas Especializadas
  const tablasHtml = (bs.tablas || []).map((tbl, ti) => {
    const colsHtml = (tbl.columnas || []).map((col, ci) => `
      <span class="builderColChip">
        <strong>${esc(col.nombre)}</strong>
        <span style="font-size:10px;color:var(--text-500)">[${col.tipo}]</span>
        <span class="rmChip" data-rmtblcol="${ti}|${ci}" title="Quitar columna">✕</span>
      </span>
    `).join('');

    const rowsHtml = (tbl.filas || []).map((row, ri) => `
      <span class="builderRowChip">
        <span>${esc(row.etiqueta)}</span>
        <span class="rmChip" data-rmtblrow="${ti}|${ri}" title="Quitar fila">✕</span>
      </span>
    `).join('');

    return `
      <div class="builderTableCard">
        <div class="builderTableCardHeader">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="background:var(--navy-900);color:#FFFFFF;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700">Tabla #${ti + 1}</span>
            <strong style="font-size:14px;color:var(--navy-900)">${esc(tbl.titulo || 'Tabla sin título')}</strong>
          </div>
          <button type="button" class="btn danger small" data-rmtable="${ti}" title="Eliminar tabla">🗑️ Eliminar tabla</button>
        </div>

        <div class="fieldGrid" style="margin-bottom:10px">
          <div class="field">
            <label>Título de la tabla *</label>
            <input type="text" placeholder="Ej: Cuadro de Personal, Cuadro de Matrícula..." value="${esc(tbl.titulo || '')}" data-tbl-titulo="${ti}">
          </div>
          <div class="field">
            <label>Descripción / Indicación breve</label>
            <input type="text" placeholder="Ej: Registrar información consolidada..." value="${esc(tbl.descripcion || '')}" data-tbl-desc="${ti}">
          </div>
        </div>

        <!-- Columnas -->
        <div class="builderTableColRowBox">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Columnas de la tabla (${(tbl.columnas || []).length}):</span>
            <div style="display:flex;gap:4px;align-items:center">
              <input type="text" placeholder="Nueva columna..." id="newColNom_${ti}" style="width:140px;font-size:11.5px;padding:3px 6px">
              <select id="newColTipo_${ti}" style="font-size:11.5px;padding:3px 4px">
                <option value="numero">Número</option>
                <option value="texto">Texto</option>
              </select>
              <button type="button" class="btn secondary small" data-addtblcol="${ti}" style="padding:2px 8px;font-size:11px">＋ Col</button>
            </div>
          </div>
          <div class="builderColRowList">
            ${colsHtml || '<span style="font-size:11.5px;color:var(--text-400);font-style:italic">Sin columnas definidas.</span>'}
          </div>
        </div>

        <!-- Filas Predeterminadas -->
        <div class="builderTableColRowBox" style="margin-top:8px;margin-bottom:0">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filas base predeterminadas (${(tbl.filas || []).length}):</span>
            <div style="display:flex;gap:4px;align-items:center">
              <input type="text" placeholder="Nueva fila (ej: Directivo, Docente)..." id="newRowEtiq_${ti}" style="width:190px;font-size:11.5px;padding:3px 6px">
              <button type="button" class="btn secondary small" data-addtblrow="${ti}" style="padding:2px 8px;font-size:11px">＋ Fila</button>
            </div>
          </div>
          <div class="builderColRowList">
            ${rowsHtml || '<span style="font-size:11.5px;color:var(--text-400);font-style:italic">Sin filas predeterminadas (se llenarán libremente).</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('') || '<p class="helpText" style="padding:10px;border:1px dashed var(--line);border-radius:6px;text-align:center">Sin tablas cuantitativas especializadas agregadas. Puedes agregar cuadros de personal, metas o matrícula si esta ficha lo requiere.</p>';

  // Render Layout Completo
  container.innerHTML = `
    <div class="pageHead" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <h2>${builderEditingId ? 'Editar tipo de ficha' : 'Nuevo tipo de ficha'}</h2>
        <p>Configura cabeceras, condiciones de visitas, tablas especializadas, compromisos e indicadores oficiales.</p>
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

    <!-- Selector de Modo: Editor Visual vs Editor JSON -->
    <div class="builderModeNav">
      <button type="button" class="builderModeBtn ${builderMode === 'visual' ? 'active' : ''}" id="btnBuilderModeVisual">
        🎨 Editor Visual (Formularios y Tablas)
      </button>
      <button type="button" class="builderModeBtn ${builderMode === 'json' ? 'active' : ''}" id="btnBuilderModeJson">
        💻 Editor de Código JSON (Avanzado)
      </button>
    </div>

    <!-- MODO JSON CODE -->
    <div class="builderJsonPane" id="builderJsonPaneWrap" style="display:${builderMode === 'json' ? 'block' : 'none'}">
      <div class="builderJsonStatus valid" id="builderJsonStatus">
        ✓ Estructura JSON válida y sincronizada con el editor visual. Puedes editar o pegar la ficha completa en JSON.
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn secondary small" id="btnSyncJsonToVisual">🔄 Aplicar cambios al editor visual</button>
          <button type="button" class="btn secondary small" id="btnCopyJson">📋 Copiar JSON</button>
          <button type="button" class="btn secondary small" id="downloadJsonBtnCode">📥 Descargar JSON</button>
          <label class="btn secondary small" style="cursor:pointer;margin:0" title="Cargar archivo JSON desde tu equipo">
            📤 Importar JSON <input type="file" id="importJsonFileInputCode" accept=".json,application/json" style="display:none">
          </label>
        </div>
        <span style="font-size:12px;color:var(--ink-soft)">Soporta todas las propiedades: tablas, visitas, extras, compromisos y secciones.</span>
      </div>
      <textarea id="builderJsonTextarea" class="builderJsonTextarea" rows="26" spellcheck="false">${esc(JSON.stringify(cleanBuilderStateForExport(bs), null, 2))}</textarea>
    </div>

    <!-- MODO SPLIT-GRID: EDITOR VISUAL + VISTA PREVIA -->
    <div class="builderSplitGrid" id="builderVisualSplitGrid" style="display:${builderMode === 'visual' ? 'grid' : 'none'}">
      <!-- PANEL IZQUIERDO: FORMULARIO DEL EDITOR -->
      <div class="builderEditorPane ${builderMobileTab === 'preview' ? 'mobileHidden' : ''}" id="builderEditorPane">
        
        <!-- Panel 1: Datos Generales y Calificación -->
        <div class="panel">
          <h3 style="margin-top:0">1. Datos Generales de la Ficha</h3>
          <div class="fieldGrid">
            <div class="field" style="max-width:90px">
              <label for="b_icono">Ícono</label>
              <input type="text" id="b_icono" value="${esc(bs.icono || '📋')}" maxlength="4" style="text-align:center;font-size:18px">
            </div>
            <div class="field" style="flex:1">
              <label for="b_nombre">Nombre completo de la ficha *</label>
              <input type="text" id="b_nombre" value="${esc(bs.nombre)}" placeholder="Ej: Ficha de Monitoreo a la Gestión Escolar EBR">
            </div>
            <div class="field" style="max-width:180px">
              <label for="b_nombre_corto">Sigla / Nombre corto</label>
              <input type="text" id="b_nombre_corto" value="${esc(bs.nombreCorto || '')}" placeholder="Ej: GESTIÓN EBR">
            </div>
          </div>

          <div class="field" style="margin-top:10px">
            <label for="b_desc">Descripción institucional y marco normativo</label>
            <textarea id="b_desc" rows="2" placeholder="Breve descripción del propósito, alcance o base legal (ej: RM N° 501-2025-MINEDU)">${esc(bs.descripcion || '')}</textarea>
          </div>

          <div class="fieldGrid" style="margin-top:10px">
            <div class="field">
              <label for="b_modalidad">Nivel / Modalidad educativa</label>
              <select id="b_modalidad">
                ${MODALIDADES.map(m => `<option value="${m}" ${(bs.modalidad === m) ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="b_tipo">Escala de respuesta</label>
              <select id="b_tipo">
                ${Object.keys(RESPONSE_LABELS).map(k => `<option value="${k}" ${(k === bs.tipoRespuesta) ? 'selected' : ''}>${RESPONSE_LABELS[k]}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="fieldGrid" style="margin-top:10px">
            <div class="field">
              <label for="b_regla_nivel">Regla de calificación y logro global</label>
              <select id="b_regla_nivel">
                ${Object.keys(REGLAS_NIVEL_MAP).map(r => `<option value="${r}" ${(bs.regla_nivel === r) ? 'selected' : ''}>${REGLAS_NIVEL_MAP[r]}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="max-width:160px">
              <label for="b_version">Versión / Año</label>
              <input type="text" id="b_version" value="${esc(bs.version || '2026.1')}" placeholder="2026.1">
            </div>
          </div>

          <!-- Rangos de calificación personalizados (Semáforo por conteo, ej: JEC) -->
          <div class="builderRangesBox" id="builderRangesBox" style="display:${bs.regla_nivel === 'conteo_rangos' ? 'block' : 'none'}">
            <div style="font-size:12px;font-weight:700;color:var(--navy-900);margin-bottom:4px">
              🎯 Configuración de rangos del semáforo (por conteo de puntos):
            </div>
            <p style="font-size:11.5px;color:var(--text-600);margin:0 0 8px">
              Define los valores mínimo y máximo para cada nivel de implementación (ej. para JEC: 0-11 Incipiente, 12-23 Parcial, 24-31 Lograda):
            </p>
            <div class="rangeRow inicio">
              <span class="rangeBadge">🔴 Inicio / Rojo</span>
              <div class="rangeInpGroup">
                <span>De:</span>
                <input type="number" id="b_rng_ini_min" value="${(bs.regla_nivel_config?.inicio?.min !== undefined) ? bs.regla_nivel_config.inicio.min : 0}" min="0">
                <span>a:</span>
                <input type="number" id="b_rng_ini_max" value="${(bs.regla_nivel_config?.inicio?.max !== undefined) ? bs.regla_nivel_config.inicio.max : 11}" min="0">
                <span>Etiqueta:</span>
                <input type="text" id="b_rng_ini_lbl" value="${esc(bs.regla_nivel_config?.inicio?.label || 'Incipiente')}" placeholder="Ej: Incipiente">
              </div>
            </div>
            <div class="rangeRow proceso">
              <span class="rangeBadge">🟡 Proceso / Ámbar</span>
              <div class="rangeInpGroup">
                <span>De:</span>
                <input type="number" id="b_rng_proc_min" value="${(bs.regla_nivel_config?.proceso?.min !== undefined) ? bs.regla_nivel_config.proceso.min : 12}" min="0">
                <span>a:</span>
                <input type="number" id="b_rng_proc_max" value="${(bs.regla_nivel_config?.proceso?.max !== undefined) ? bs.regla_nivel_config.proceso.max : 23}" min="0">
                <span>Etiqueta:</span>
                <input type="text" id="b_rng_proc_lbl" value="${esc(bs.regla_nivel_config?.proceso?.label || 'Parcial')}" placeholder="Ej: Parcial">
              </div>
            </div>
            <div class="rangeRow logrado">
              <span class="rangeBadge">🟢 Logrado / Verde</span>
              <div class="rangeInpGroup">
                <span>De:</span>
                <input type="number" id="b_rng_log_min" value="${(bs.regla_nivel_config?.logrado?.min !== undefined) ? bs.regla_nivel_config.logrado.min : 24}" min="0">
                <span>a:</span>
                <input type="number" id="b_rng_log_max" value="${(bs.regla_nivel_config?.logrado?.max !== undefined) ? bs.regla_nivel_config.logrado.max : 31}" min="0">
                <span>Etiqueta:</span>
                <input type="text" id="b_rng_log_lbl" value="${esc(bs.regla_nivel_config?.logrado?.label || 'Lograda')}" placeholder="Ej: Lograda">
              </div>
            </div>
          </div>

          <!-- Paleta de Color Institucional -->
          <div class="field" style="margin-top:12px">
            <label style="margin-bottom:6px;display:block">Color distintivo institucional:</label>
            <div class="colorSwatches" id="colorSwatchesList">
              ${FICHA_PALETTE.map(c => `
                <button type="button" class="colorSwatch ${(bs.color && bs.color.toLowerCase() === c.hex.toLowerCase()) ? 'active' : ''}" data-color="${c.hex}" style="background:${c.hex}" title="${c.name}"></button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Panel 2: Monitoreo Multi-Visita y Condiciones -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">2. Condiciones de Monitoreo y Visitas</h3>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--navy-900);cursor:pointer">
              <input type="checkbox" id="b_tiene_visitas" ${bs.tieneVisitas ? 'checked' : ''}>
              Habilitar multi-visita independiente
            </label>
          </div>
          <p style="font-size:12px;color:var(--text-600);margin:4px 0 10px">
            Permite aplicar la misma ficha en momentos sucesivos (ej: V1 Diagnóstica, V2 Seguimiento, V3 Cierre) conservando el histórico.
          </p>
          
          <div class="visitasConfigBox" id="visitasConfigBox" style="display:${bs.tieneVisitas ? 'block' : 'none'}">
            <div style="font-size:12px;font-weight:700;color:var(--navy-900);margin-bottom:4px">
              Modalidad de aplicación de las visitas:
            </div>
            <div class="visitaModeBox">
              <label class="visitaModeOption ${bs.tipoVisitas !== 'items_por_visita' ? 'active' : ''}">
                <input type="radio" name="b_tipo_visitas" value="mismos_items" ${bs.tipoVisitas !== 'items_por_visita' ? 'checked' : ''}>
                <div>
                  <span class="visitaModeTitle">🔁 Mismos indicadores en todas las visitas</span>
                  <span class="visitaModeDesc">Seguimiento continuo de los mismos ítems a lo largo de V1, V2 y V3 (como CEBE y PRITE).</span>
                </div>
              </label>
              <label class="visitaModeOption ${bs.tipoVisitas === 'items_por_visita' ? 'active' : ''}">
                <input type="radio" name="b_tipo_visitas" value="items_por_visita" ${bs.tipoVisitas === 'items_por_visita' ? 'checked' : ''}>
                <div>
                  <span class="visitaModeTitle">📑 Indicadores diferenciados por cada visita</span>
                  <span class="visitaModeDesc">Cada visita o momento tiene sus propias preguntas e instrumentos independientes (como EBR V1 Inicio, V2 Proceso, V3 Cierre).</span>
                </div>
              </label>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;margin-top:12px">
              <strong style="font-size:12.5px;color:var(--navy-900)">Momentos / Visitas configuradas:</strong>
              <button type="button" class="btn secondary small" id="addVisitaBtn">＋ Agregar visita</button>
            </div>
            <div id="visitasListWrap">
              ${(bs.visitas || []).map((v, vi) => `
                <div class="visitaItemRow">
                  <span style="font-size:12px;font-weight:700;color:var(--navy-900);min-width:60px">Visita ${vi + 1}:</span>
                  <input type="text" data-visitainp="${vi}" value="${esc(v)}" placeholder="Nombre de la visita (ej: Visita ${vi + 1} - Diagnóstico)" style="flex:1">
                  <button type="button" class="iconBtn small" data-rmvisita="${vi}" ${(bs.visitas || []).length <= 1 ? 'disabled style="opacity:0.35"' : ''} title="Eliminar visita">✕</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Panel 3: Campos de Cabecera Configurables -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="margin:0">3. Campos de Cabecera Personalizados</h3>
              <span style="font-size:11.5px;color:var(--ink-soft)">Adicionales a Institución Educativa, Fecha y N° Visita</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button type="button" class="btn secondary small" id="addPresetDirectivosBtn">👤 + Bloque Directivos</button>
              <button type="button" class="btn secondary small" id="addExtraBtn">＋ Agregar campo</button>
            </div>
          </div>
          <div id="extrasList">${extrasHtml}</div>
        </div>

        <!-- Panel 4: Tablas Cuantitativas Especializadas -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <div>
              <h3 style="margin:0">4. Tablas Cuantitativas Especializadas</h3>
              <span style="font-size:11.5px;color:var(--ink-soft)">Cuadros de personal, estudiantes, metas de matrícula o recursos</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" class="btn secondary small" id="addPresetPersonalBtn">📋 + Cuadro Personal</button>
              <button type="button" class="btn secondary small" id="addPresetEstudiantesBtn">🎓 + Cuadro Matrícula</button>
              <button type="button" class="btn secondary small" id="addPresetSaaneeBtn">♿ + Personal SAANEE</button>
              <button type="button" class="btn secondary small" id="addCustomTableBtn">＋ Tabla vacía</button>
            </div>
          </div>
          <div id="tablasList">${tablasHtml}</div>
        </div>

        <!-- Panel 5: Compromisos de Mejora (Sección V) -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">5. Compromisos de Mejora y Acuerdos (Sección V)</h3>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--navy-900);cursor:pointer">
              <input type="checkbox" id="b_comp_hab" ${(bs.compromisos && bs.compromisos.habilitado) ? 'checked' : ''}>
              Habilitar Sección de Compromisos
            </label>
          </div>
          <p style="font-size:12px;color:var(--text-600);margin:4px 0 10px">
            Permite suscribir compromisos firmados entre el Director y el Especialista al concluir la visita.
          </p>

          <div class="compromisosConfigBox" id="compromisosConfigBox" style="display:${(bs.compromisos && bs.compromisos.habilitado) ? 'block' : 'none'}">
            <div style="display:flex;flex-direction:column;gap:8px">
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
                <input type="checkbox" id="b_comp_dir" ${(bs.compromisos && bs.compromisos.director !== false) ? 'checked' : ''}>
                Compromisos del Director(a) / Equipo Directivo de la I.E.
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
                <input type="checkbox" id="b_comp_esp" ${(bs.compromisos && bs.compromisos.especialista !== false) ? 'checked' : ''}>
                Compromisos del Especialista / Monitor UGEL 03
              </label>
              <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
                <span style="font-size:12px;color:var(--text-700);font-weight:600">Filas de compromiso por visita:</span>
                <input type="number" id="b_comp_filas" min="1" max="10" value="${(bs.compromisos && bs.compromisos.filasPorVisita) || 3}" style="width:70px;text-align:center">
              </div>
            </div>
          </div>
        </div>

        <!-- Panel 6: Secciones e Indicadores -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="margin:0">6. Secciones e Indicadores de Monitoreo</h3>
              <span style="font-size:11.5px;color:var(--ink-soft)">Dimensiones, criterios, códigos y evidencias sugeridas</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              ${isMultiVisitaDiferenciada && (bs.visitas || []).length > 1 ? `
                <button type="button" class="btn secondary small" id="btnCopyVisitaSecs" title="Copiar secciones desde otra visita">📋 Copiar de otra visita...</button>
              ` : ''}
              <button type="button" class="btn secondary small" id="addSecBtn">＋ Agregar sección</button>
            </div>
          </div>

          ${isMultiVisitaDiferenciada ? `
            <div class="builderVisitTabsWrap">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Editando indicadores para:</span>
                <div class="builderVisitTabs">
                  ${(bs.visitas || []).map((vNom, vIdx) => {
    const vSecs = (bs.seccionesPorVisita && bs.seccionesPorVisita[vIdx]) ? bs.seccionesPorVisita[vIdx] : (vIdx === 0 ? (bs.secciones || []) : []);
    const count = (vSecs || []).reduce((acc, s) => acc + (s.items || []).length, 0);
    return `
                      <button type="button" class="builderVisitTab ${vIdx === builderActiveVisitTab ? 'active' : ''}" data-visita-tab="${vIdx}">
                        <span>📅 ${esc(vNom || ('Visita ' + (vIdx + 1)))}</span>
                        <span class="builderVisitTabBadge">${count} ítems</span>
                      </button>
                    `;
  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <div id="seccionesList">${seccionesHtml}</div>
        </div>

      </div>

      <!-- PANEL DERECHO: VISTA PREVIA EN VIVO STICKY -->
      <div class="builderPreviewPane ${builderMobileTab === 'editor' ? 'mobileHidden' : ''}" id="builderPreviewPane">
        <div class="builderPreviewSticky" id="builderPreviewSticky">
          <div class="builderPreviewHeader" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:12px 16px;background:var(--navy-900);color:#FFFFFF;flex-shrink:0">
            <div>
              <h4 style="margin:0;font-size:13.5px;font-weight:700;color:#FFFFFF">Vista previa en tiempo real</h4>
              <span style="font-size:11px;color:#94A3B8">Sincronizada automáticamente con tu edición</span>
            </div>
            <div class="builderPreviewTabs">
              <button type="button" class="builderPreviewTab ${builderPreviewMode === 'formulario' ? 'active' : ''}" data-preview-mode="formulario">📋 Formulario</button>
              <button type="button" class="builderPreviewTab ${builderPreviewMode === 'documento' ? 'active' : ''}" data-preview-mode="documento">📄 Documento</button>
            </div>
          </div>

          <!-- Cuerpo desplazable con scrollbar independiente y sincronizado -->
          <div class="builderPreviewBodyScroll" id="builderPreviewBodyScroll">
            <div id="builderPreviewContent"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARRA FIJA INFERIOR DE GUARDADO (SIEMPRE VISIBLE) -->
    <div class="builderBottomStickyBar" id="builderBottomStickyBar">
      <div class="builderBottomStickyContent">
        <div class="builderBottomStickyInfo">
          <div style="font-size:22px" id="bottomBarFichaIcon">${esc(bs.icono || '📋')}</div>
          <div>
            <div class="builderBottomFichaName" id="bottomBarFichaName">${esc(bs.nombre || 'Nueva Ficha de Monitoreo')}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:2px">
              <span class="builderBottomMetaPill" id="bottomBarMetaModalidad">${esc(bs.modalidad || 'General')}</span>
              <span class="builderBottomMetaPill" id="bottomBarMetaVersion">v${esc(bs.version || '2026.1')}</span>
              <span id="bottomDirtyBadge" class="builderBottomDirtyBadge" style="display:${builderIsDirty ? 'inline-flex' : 'none'}">
                ● Cambios sin guardar
              </span>
            </div>
          </div>
        </div>
        <div class="builderBottomStickyActs">
          <button type="button" class="btn secondary" id="cancelTipoBtn">Cancelar</button>
          <button type="button" class="btn secondary" id="downloadJsonBtn" title="Descargar plantilla como archivo .json">📥 Descargar JSON</button>
          <label class="btn secondary" style="cursor:pointer;margin:0" title="Cargar archivo JSON">
            📤 Importar JSON <input type="file" id="importJsonFileInput" accept=".json,application/json" style="display:none">
          </label>
          <button type="button" class="btn secondary" id="saveDraftBtn">📝 Guardar borrador</button>
          <button type="button" class="btn" id="saveTipoBtn" style="font-weight:700">💾 Guardar ficha completa</button>
        </div>
      </div>
    </div>
  `;

  // Función que genera el HTML de la vista previa en vivo
  function buildPreviewInnerHtml() {
    const isPrevMultiDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
    const previewSections = isPrevMultiDiferenciada
      ? ((bs.seccionesPorVisita && bs.seccionesPorVisita[builderActiveVisitPreview]) || (builderActiveVisitPreview === 0 ? (bs.secciones || []) : []))
      : (bs.secciones || []);

    const totalSecs = previewSections.length;
    const totalItems = previewSections.reduce((acc, s) => acc + (s.items || []).length, 0);

    // Validación de campos
    const errors = [];
    if (!bs.nombre || !bs.nombre.trim()) {
      errors.push({ msg: 'Falta ingresar el nombre de la ficha', target: '#b_nombre' });
    }
    if (previewSections.length === 0) {
      errors.push({ msg: 'Debes agregar al menos una sección', target: '#addSecBtn' });
    } else {
      previewSections.forEach((sec, si) => {
        if (!sec.nombre || !sec.nombre.trim()) {
          errors.push({ msg: `La sección #${si + 1} no tiene título`, target: `[data-secname="${si}"]` });
        }
        if (!sec.items || sec.items.length === 0) {
          errors.push({ msg: `La sección #${si + 1} ("${sec.nombre || 'Sin nombre'}") no tiene indicadores`, target: `[data-additem="${si}"]` });
        } else {
          sec.items.forEach((it, ii) => {
            if (!it.texto || !it.texto.trim()) {
              errors.push({ msg: `El ítem #${ii + 1} en la sección #${si + 1} está vacío`, target: `[data-sec="${si}"][data-item="${ii}"]` });
            }
          });
        }
      });
    }

    // Mini tarjeta resumen
    const curColor = bs.color || (FICHA_PALETTE[0] || {}).hex || '#1E40AF';
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
              ${bs.tieneVisitas ? `<span class="fichaBadge" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">🔁 ${(bs.visitas || []).length} visitas</span>` : ''}
              ${(bs.tablas && bs.tablas.length > 0) ? `<span class="fichaBadge" style="background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0">📊 ${bs.tablas.length} tablas</span>` : ''}
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
        <span>✓</span> <strong>Estructura completa y consistente.</strong> Lista para registrar visitas oficiales.
      </div>
    `;

    const statsBarHtml = `
      <div style="display:flex;gap:10px;font-size:11.5px;color:var(--text-600);margin-bottom:12px;padding:6px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--line);flex-wrap:wrap">
        <span>📑 <strong>${totalSecs}</strong> secciones</span>
        <span>🔢 <strong>${totalItems}</strong> indicadores</span>
        <span>⚖️ <strong>${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</strong></span>
        <span>📏 Regla: <strong>${esc(bs.regla_nivel || 'porcentaje')}</strong></span>
      </div>
    `;

    const impactAlertHtml = (existingCount > 0) ? `
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#1E40AF;line-height:1.4">
        ℹ️ <strong>Historial:</strong> Esta plantilla tiene <strong>${existingCount}</strong> visita(s) registradas. Las modificaciones se aplicarán a nuevos registros.
      </div>
    ` : '';

    // Barra de Pestañas de Visitas en Preview
    const visitasTabsHtml = bs.tieneVisitas && (bs.visitas || []).length > 0 ? `
      <div class="previewVisitasTabsBar">
        ${(bs.visitas || []).map((vNom, vi) => `
          <button type="button" class="previewVisitaTabBtn ${builderActiveVisitPreview === vi ? 'active' : ''}" data-prev-visit-idx="${vi}">
            ${esc(vNom)}
          </button>
        `).join('')}
      </div>
    ` : '';

    let modeContentHtml = '';

    if (builderPreviewMode === 'formulario') {
      // Modo Formulario de Registro
      let answeredCount = 0;
      let currentScore = 0;
      let maxScore = 0;

      previewSections.forEach(sec => {
        (sec.items || []).forEach(it => {
          const ansKey = `${builderActiveVisitPreview}_${it.id}`;
          const ans = builderTestAnswers[ansKey] || builderTestAnswers[it.id];
          if (ans !== undefined && ans !== null && ans !== '') {
            answeredCount++;
            if (bs.tipoRespuesta === 'si_no') {
              maxScore += 1;
              if (ans === 'si' || ans === '1') currentScore += 1;
            } else if (bs.tipoRespuesta === 'escala1_3') {
              maxScore += 3;
              currentScore += Number(ans) || 0;
            } else if (bs.tipoRespuesta === 'escala1_4' || bs.tipoRespuesta === 'rubrica1_4' || bs.tipoRespuesta === 'ips') {
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

      // Tablas especializadas en preview
      const previewTablasHtml = (bs.tablas || []).map(tbl => `
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:var(--navy-900);margin-bottom:4px">${esc(tbl.titulo)}</div>
          ${tbl.descripcion ? `<div style="font-size:11px;color:var(--text-500);margin-bottom:6px">${esc(tbl.descripcion)}</div>` : ''}
          <div style="overflow-x:auto">
            <table class="previewCustomTable">
              <thead>
                <tr>
                  <th style="min-width:140px">Fila / Categoría</th>
                  ${(tbl.columnas || []).map(col => `<th style="text-align:center">${esc(col.nombre)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(tbl.filas && tbl.filas.length > 0 ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }]).map(r => `
                  <tr>
                    <td style="font-weight:600;color:var(--text-700)">${esc(r.etiqueta)}</td>
                    ${(tbl.columnas || []).map(() => `<td style="text-align:center;color:var(--text-400)">[ 0 ]</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('');

      // Compromisos en preview
      const previewCompromisosHtml = (bs.compromisos && bs.compromisos.habilitado) ? `
        <div class="previewCompromisosWrap">
          <div style="font-size:12.5px;font-weight:700;color:var(--navy-900);margin-bottom:6px">Sección V: Compromisos de Mejora y Acuerdos</div>
          ${bs.compromisos.director !== false ? `
            <div style="margin-bottom:8px">
              <span style="font-size:11.5px;font-weight:600;color:var(--text-700)">Compromisos del Director(a) / Equipo Directivo:</span>
              <div style="font-size:11px;color:var(--text-400);font-style:italic;margin-top:2px">
                ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `<div>${idx + 1}. [Espacio para compromiso acordado...]</div>`).join('')}
              </div>
            </div>
          ` : ''}
          ${bs.compromisos.especialista !== false ? `
            <div>
              <span style="font-size:11.5px;font-weight:600;color:var(--text-700)">Compromisos del Especialista / Monitor UGEL:</span>
              <div style="font-size:11px;color:var(--text-400);font-style:italic;margin-top:2px">
                ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `<div>${idx + 1}. [Espacio para compromiso y asistencia técnica...]</div>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : '';

      modeContentHtml = `
        <div class="previewFormSheet" style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px">
          ${visitasTabsHtml}

          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);border:1px dashed var(--line);border-radius:6px;padding:8px 12px;margin-bottom:14px">
            <div style="font-size:12px;color:var(--text-600)">🧪 <strong>Modo prueba:</strong> Marca respuestas para simular el cálculo de puntaje en vivo.</div>
            <button type="button" class="btn secondary small" id="btnResetTest" style="padding:2px 8px;font-size:11px">Limpiar prueba</button>
          </div>

          ${testScoreBar}

          <!-- Simulación de cabecera -->
          <div style="background:var(--surface-2);border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:12px">
            <div style="font-weight:700;color:var(--text-700);margin-bottom:6px">Datos de la Visita (Simulación):</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div><strong>I.E.:</strong> <span style="color:var(--text-500)">I.E. 1153 Alfonso Ugarte</span></div>
              <div><strong>Fecha:</strong> <span style="color:var(--text-500)">2026-10-14</span></div>
              <div><strong>Momento / Visita:</strong> <span style="color:var(--primary);font-weight:700">${esc(bs.tieneVisitas && bs.visitas && bs.visitas[builderActiveVisitPreview] ? bs.visitas[builderActiveVisitPreview] : 'Visita 1')}</span></div>
              ${(bs.extras || []).map(ex => {
        if (ex.tipo === 'select') {
          const opts = (ex.opciones || 'Opción 1, Opción 2').split(',').map(o => o.trim()).filter(Boolean);
          return `<div><strong>${esc(ex.label)}:</strong> <span style="color:var(--text-600)">[${esc(opts[0] || 'Selector')}]</span></div>`;
        }
        return `<div><strong>${esc(ex.label)}:</strong> <span style="color:var(--text-400)">[${esc(ex.tipo)}]</span></div>`;
      }).join('')}
            </div>
          </div>

          <!-- Tablas Cuantitativas -->
          ${previewTablasHtml}

          <!-- Secciones e Indicadores -->
          ${previewSections.map((sec, si) => `
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
        const itCode = it.id || ((si + 1) + '.' + (ii + 1));
        const ansKey = `${builderActiveVisitPreview}_${it.id}`;
        const ans = builderTestAnswers[ansKey] || builderTestAnswers[it.id] || '';
        return `
                    <div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:6px">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                        <span style="font-size:12px;color:var(--ink);font-weight:500">
                          <strong style="color:var(--primary)">${esc(itCode)}</strong> ${esc(it.texto || 'Indicador sin texto')}
                        </span>
                        <a href="javascript:void(0)" class="previewValItem" data-target="[data-sec='${si}'][data-item='${ii}']" style="font-size:11px;color:var(--ink-soft)" title="Ir a editar este ítem">
                          ✏️
                        </a>
                      </div>
                      ${it.evidencia ? `
                        <div style="font-size:11px;color:var(--text-500);display:flex;align-items:center;gap:4px">
                          <span>📂</span> <em>Evidencia: ${esc(it.evidencia)}</em>
                        </div>
                      ` : ''}
                      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:11.5px">
                        ${renderItemResponseInputs(it, bs.tipoRespuesta, ans)}
                      </div>
                    </div>
                  `;
      }).join('') || '<p style="font-size:11.5px;color:var(--text-400);margin:4px 0">Sin indicadores en esta sección.</p>'}
              </div>
            </div>
          `).join('') || '<p style="font-size:12px;color:var(--text-400)">Sin secciones agregadas.</p>'}

          <!-- Compromisos de Mejora -->
          ${previewCompromisosHtml}
        </div>
      `;
    } else {
      // Modo Documento Oficial Impreso
      modeContentHtml = `
        <div class="previewDocSheet" style="background:#FFFFFF;border:1px solid var(--line-strong);border-radius:6px;padding:20px;font-family:var(--sans);color:#1F2937">
          <div style="text-align:center;border-bottom:2px solid #1E3A8A;padding-bottom:10px;margin-bottom:14px">
            <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#4B5563;text-transform:uppercase">Ministerio de Educación · DRE Lima Metropolitana</div>
            <div style="font-size:13px;font-weight:800;letter-spacing:0.5px;color:#1E3A8A;margin:2px 0">UNIDAD DE GESTIÓN EDUCATIVA LOCAL N° 03</div>
            <div style="font-size:10.5px;color:#6B7280">Panel de Monitoreo y Asistencia Técnica 2026</div>
            <h3 style="font-size:15px;font-weight:800;margin:10px 0 4px;color:#1E40AF;text-transform:uppercase">${esc(bs.nombre || 'NOMBRE DE LA FICHA')}</h3>
            <div style="font-size:11px;font-weight:600;color:#4B5563">
              Modalidad: ${esc(bs.modalidad || 'General')} · Versión: ${esc(bs.version || '2026.1')} · Escala: ${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}
            </div>
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
              <td style="border:1px solid #D1D5DB;padding:4px 8px">[DD/MM/AAAA · ${esc(bs.tieneVisitas && bs.visitas && bs.visitas[builderActiveVisitPreview] ? bs.visitas[builderActiveVisitPreview] : 'Visita 1')}]</td>
            </tr>
            ${(bs.extras || []).map(ex => `
              <tr>
                <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">${esc(ex.label)}:</td>
                <td colspan="3" style="border:1px solid #D1D5DB;padding:4px 8px;color:#6B7280">[${esc(ex.tipo)}]</td>
              </tr>
            `).join('')}
          </table>

          <!-- Tablas Especializadas en Documento -->
          ${(bs.tablas || []).map(tbl => `
            <div style="margin-bottom:14px">
              <div style="font-size:11px;font-weight:700;color:#1E3A8A;margin-bottom:4px">${esc(tbl.titulo)}</div>
              <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px">
                <thead>
                  <tr style="background:#F3F4F6">
                    <th style="border:1px solid #D1D5DB;padding:4px 6px;text-align:left">Fila / Categoría</th>
                    ${(tbl.columnas || []).map(col => `<th style="border:1px solid #D1D5DB;padding:4px 6px;text-align:center">${esc(col.nombre)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${(tbl.filas && tbl.filas.length > 0 ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }]).map(r => `
                    <tr>
                      <td style="border:1px solid #D1D5DB;padding:3px 6px">${esc(r.etiqueta)}</td>
                      ${(tbl.columnas || []).map(() => `<td style="border:1px solid #D1D5DB;padding:3px 6px;text-align:center">____</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          <!-- Tabla de Dimensiones e Indicadores -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10.5px">
            <thead>
              <tr style="background:#1E3A8A;color:#FFFFFF">
                <th style="border:1px solid #1E3A8A;padding:5px;width:36px;text-align:center">N°</th>
                <th style="border:1px solid #1E3A8A;padding:5px;text-align:left">Dimensión / Criterio / Indicador</th>
                <th style="border:1px solid #1E3A8A;padding:5px;width:140px;text-align:left">Evidencia sugerida</th>
                <th style="border:1px solid #1E3A8A;padding:5px;width:80px;text-align:center">Valoración</th>
              </tr>
            </thead>
            <tbody>
              ${previewSections.map((sec, si) => `
                <tr style="background:#F9FAFB;font-weight:700">
                  <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#1E3A8A">#${si + 1}</td>
                  <td colspan="3" style="border:1px solid #E5E7EB;padding:4px;text-transform:uppercase;color:#111827">${esc(sec.nombre || 'Sección sin título')}</td>
                </tr>
                ${(sec.items || []).map((it, ii) => {
        const itCode = it.id || ((si + 1) + '.' + (ii + 1));
        return `
                    <tr>
                      <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#6B7280">${esc(itCode)}</td>
                      <td style="border:1px solid #E5E7EB;padding:4px">${esc(it.texto || 'Indicador sin texto')}</td>
                      <td style="border:1px solid #E5E7EB;padding:4px;font-size:9.5px;color:#4B5563">${esc(it.evidencia || '—')}</td>
                      <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#9CA3AF">[____]</td>
                    </tr>
                  `;
      }).join('')}
              `).join('')}
            </tbody>
          </table>

          <!-- Compromisos en Documento -->
          ${(bs.compromisos && bs.compromisos.habilitado) ? `
            <div style="margin-bottom:20px;border:1px solid #D1D5DB;padding:10px;border-radius:4px">
              <div style="font-weight:700;font-size:11px;color:#1E3A8A;margin-bottom:6px">SECCIÓN V: COMPROMISOS Y ACUERDOS INSTITUCIONALES</div>
              <div style="font-size:10px;color:#4B5563">
                ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `
                  <div style="border-bottom:1px dotted #9CA3AF;padding:4px 0">${idx + 1}. ____________________________________________________________________________________</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

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
    const itKey = `${builderActiveVisitPreview}_${it.id}`;
    if (tipoRespuesta === 'si_no') {
      return `
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${itKey}" value="si" ${curVal === 'si' ? 'checked' : ''} data-test-item="${itKey}"> Sí</label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${itKey}" value="no" ${curVal === 'no' ? 'checked' : ''} data-test-item="${itKey}"> No</label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>
      `;
    }
    if (tipoRespuesta === 'escala1_3') {
      return [1, 2, 3].map(v => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
    }
    if (tipoRespuesta === 'rubrica1_4' || tipoRespuesta === 'ips') {
      const lvls = ['I', 'II', 'III', 'IV'];
      return lvls.map((lvl, idx) => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${idx + 1}" ${String(curVal) === String(idx + 1) ? 'checked' : ''} data-test-item="${itKey}"> Nivel ${lvl}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
    }
    if (tipoRespuesta === 'escala1_5') {
      return [1, 2, 3, 4, 5].map(v => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
    }
    // Default escala 1-4
    return [1, 2, 3, 4].map(v => `
      <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
    `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
  }

  // Actualiza la vista previa en vivo sin tocar inputs del editor
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

    // Cambiar de visita simulada en tabs de vista previa
    previewBox.querySelectorAll('[data-prev-visit-idx]').forEach(btn => {
      btn.onclick = () => {
        builderActiveVisitPreview = parseInt(btn.dataset.prevVisitIdx, 10) || 0;
        updatePreviewOnly();
      };
    });

    // Clic en avisos o enlaces de edición para saltar al campo del editor
    previewBox.querySelectorAll('.previewValItem').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const targetSel = link.dataset.target;
        if (!targetSel) return;

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
        const itemKey = e.target.dataset.testItem;
        builderTestAnswers[itemKey] = e.target.value;
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

  // Paleta de colores institucional
  container.querySelectorAll('.colorSwatch').forEach(swatch => {
    swatch.onclick = () => {
      bs.color = swatch.dataset.color;
      builderIsDirty = true;
      container.querySelectorAll('.colorSwatch').forEach(s => s.classList.toggle('active', s.dataset.color === bs.color));
      updatePreviewOnly();
    };
  });

  // Alternar entre Editor Visual y Editor JSON
  const btnModeVis = document.getElementById('btnBuilderModeVisual');
  const btnModeJson = document.getElementById('btnBuilderModeJson');
  const jsonPaneWrap = document.getElementById('builderJsonPaneWrap');
  const visualSplitGrid = document.getElementById('builderVisualSplitGrid');
  const jsonTextarea = document.getElementById('builderJsonTextarea');
  const jsonStatus = document.getElementById('builderJsonStatus');

  if (btnModeVis && btnModeJson) {
    btnModeVis.onclick = () => {
      if (builderMode === 'json') {
        // Intentar sincronizar desde JSON al visual
        try {
          const parsed = JSON.parse(jsonTextarea.value);
          Object.assign(builderState, parsed);
          builderState.extras = normalizeExtras(builderState.extras);
          builderIsDirty = true;
        } catch (err) {
          if (!confirm(`Hay un error de sintaxis en el JSON:\n\n${err.message}\n\n¿Deseas descartar los cambios del JSON y volver al editor visual?`)) {
            return;
          }
        }
      }
      builderMode = 'visual';
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };

    const switchToJsonMode = () => {
      syncBuilderFromDom(container, bs);
      builderMode = 'json';
      if (jsonTextarea) {
        jsonTextarea.value = JSON.stringify(cleanBuilderStateForExport(bs), null, 2);
      }
      if (jsonPaneWrap && visualSplitGrid) {
        jsonPaneWrap.style.display = 'block';
        visualSplitGrid.style.display = 'none';
        btnModeVis.classList.remove('active');
        btnModeJson.classList.add('active');
      }
    };

    btnModeJson.onclick = () => {
      if (!builderJsonUnlocked) {
        promptAdminPasswordModal(currentUser, switchToJsonMode);
      } else {
        switchToJsonMode();
      }
    };
  }

  // Sincronización de scroll proporcional entre el Editor y la Vista Previa
  const previewScrollEl = document.getElementById('builderPreviewBodyScroll');
  const editorPaneEl = document.getElementById('builderEditorPane');
  let isPreviewHovered = false;

  if (previewScrollEl && editorPaneEl) {
    previewScrollEl.addEventListener('mouseenter', () => { isPreviewHovered = true; });
    previewScrollEl.addEventListener('mouseleave', () => { isPreviewHovered = false; });
    previewScrollEl.addEventListener('touchstart', () => { isPreviewHovered = true; }, { passive: true });
    previewScrollEl.addEventListener('touchend', () => { isPreviewHovered = false; }, { passive: true });

    const handleWindowScroll = () => {
      if (builderMode !== 'visual') return;
      if (isPreviewHovered) return;
      if (!document.getElementById('builderPreviewBodyScroll')) {
        window.removeEventListener('scroll', handleWindowScroll);
        return;
      }

      const rect = editorPaneEl.getBoundingClientRect();
      const editorTop = rect.top;
      const editorHeight = rect.height;
      const viewportHeight = window.innerHeight;
      const scrollableDistance = editorHeight - viewportHeight + 120;
      if (scrollableDistance <= 0) return;

      const scrolled = Math.max(0, -editorTop + 72);
      const ratio = Math.min(1, Math.max(0, scrolled / scrollableDistance));
      const maxScroll = previewScrollEl.scrollHeight - previewScrollEl.clientHeight;
      if (maxScroll > 0) {
        previewScrollEl.scrollTop = ratio * maxScroll;
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
  }

  // Sincronización en vivo del Textarea JSON
  if (jsonTextarea && jsonStatus) {
    jsonTextarea.addEventListener('input', () => {
      builderIsDirty = true;
      try {
        const parsed = JSON.parse(jsonTextarea.value);
        Object.assign(builderState, parsed);
        builderState.extras = normalizeExtras(builderState.extras);
        jsonStatus.className = 'builderJsonStatus valid';
        jsonStatus.textContent = '✓ Sintaxis JSON válida y actualizada en memoria.';
        updatePreviewOnly();
      } catch (err) {
        jsonStatus.className = 'builderJsonStatus invalid';
        jsonStatus.textContent = '⚠️ Error en sintaxis JSON: ' + err.message;
      }
    });
  }

  // Botón "Aplicar cambios al editor visual"
  const btnSyncJson = document.getElementById('btnSyncJsonToVisual');
  if (btnSyncJson && jsonTextarea) {
    btnSyncJson.onclick = () => {
      try {
        const parsed = JSON.parse(jsonTextarea.value);
        Object.assign(builderState, parsed);
        builderState.extras = normalizeExtras(builderState.extras);
        builderMode = 'visual';
        showToast('✓ JSON aplicado al editor visual.');
        renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        alert('Error en el JSON: ' + err.message);
      }
    };
  }

  // Botón Copiar JSON
  const btnCopyJson = document.getElementById('btnCopyJson');
  if (btnCopyJson && jsonTextarea) {
    btnCopyJson.onclick = async () => {
      try {
        await navigator.clipboard.writeText(jsonTextarea.value);
        showToast('✓ JSON copiado al portapapeles.');
      } catch (err) {
        showToast('No se pudo copiar automáticamente.');
      }
    };
  }

  // Descargar JSON función común
  const triggerDownloadJson = () => {
    syncBuilderFromDom(container, bs);
    const exportData = cleanBuilderStateForExport(bs);
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (bs.nombreCorto || bs.nombre || 'ficha').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
    a.href = url;
    a.download = `ficha_${slug}_${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Archivo JSON descargado.');
  };

  const btnDlJson1 = document.getElementById('downloadJsonBtn');
  if (btnDlJson1) btnDlJson1.onclick = triggerDownloadJson;
  const btnDlJson2 = document.getElementById('downloadJsonBtnCode');
  if (btnDlJson2) btnDlJson2.onclick = triggerDownloadJson;

  // Importar JSON función común
  const handleJsonFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El archivo no contiene un objeto JSON válido');
        }
        Object.assign(builderState, parsed);
        builderState.extras = normalizeExtras(builderState.extras);
        builderIsDirty = true;
        showToast('✓ Plantilla cargada desde archivo JSON.');
        renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const importInp1 = document.getElementById('importJsonFileInput');
  if (importInp1) {
    importInp1.onchange = (e) => handleJsonFileUpload(e.target.files[0]);
  }
  const importInp2 = document.getElementById('importJsonFileInputCode');
  if (importInp2) {
    importInp2.onchange = (e) => handleJsonFileUpload(e.target.files[0]);
  }

  // Eventos de entrada en vivo con debounce
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
  const bNomCorto = document.getElementById('b_nombre_corto');
  if (bNomCorto) bNomCorto.addEventListener('input', onLiveInput);
  const bDesc = document.getElementById('b_desc');
  if (bDesc) bDesc.addEventListener('input', onLiveInput);
  const bMod = document.getElementById('b_modalidad');
  if (bMod) bMod.addEventListener('change', () => { bs.modalidad = bMod.value; builderIsDirty = true; updatePreviewOnly(); });
  const bTip = document.getElementById('b_tipo');
  if (bTip) bTip.addEventListener('change', () => { bs.tipoRespuesta = bTip.value; builderIsDirty = true; updatePreviewOnly(); });
  const bReg = document.getElementById('b_regla_nivel');
  if (bReg) {
    bReg.addEventListener('change', () => {
      bs.regla_nivel = bReg.value;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Listeners para rangos de semáforo
  ['b_rng_ini_min', 'b_rng_ini_max', 'b_rng_ini_lbl', 'b_rng_proc_min', 'b_rng_proc_max', 'b_rng_proc_lbl', 'b_rng_log_min', 'b_rng_log_max', 'b_rng_log_lbl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', onLiveInput);
  });

  const bVer = document.getElementById('b_version');
  if (bVer) bVer.addEventListener('input', onLiveInput);

  // Toggle tiene visitas
  const bTieneVisitas = document.getElementById('b_tiene_visitas');
  if (bTieneVisitas) {
    bTieneVisitas.addEventListener('change', () => {
      bs.tieneVisitas = bTieneVisitas.checked;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Cambio de modalidad de visitas (mismos indicadores vs diferenciados por visita)
  container.querySelectorAll('input[name="b_tipo_visitas"]').forEach(r => {
    r.addEventListener('change', () => {
      syncBuilderFromDom(container, bs);
      bs.tipoVisitas = r.value;
      if (bs.tipoVisitas === 'items_por_visita') {
        if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
        if (!bs.seccionesPorVisita[0] && bs.secciones) {
          bs.seccionesPorVisita[0] = JSON.parse(JSON.stringify(bs.secciones));
        }
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  });

  // Pestañas de visitas para editar secciones diferenciadas
  container.querySelectorAll('[data-visita-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      builderActiveVisitTab = +tab.dataset.visitaTab;
      if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
      if (!bs.seccionesPorVisita[builderActiveVisitTab]) {
        bs.seccionesPorVisita[builderActiveVisitTab] = [{
          nombre: `Sección 1`,
          items: [{ id: genId(), texto: '', evidencia: '' }]
        }];
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  });

  // Botón para copiar secciones de otra visita
  const btnCopyVisitaSecs = document.getElementById('btnCopyVisitaSecs');
  if (btnCopyVisitaSecs) {
    btnCopyVisitaSecs.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      const visits = bs.visitas || [];
      const opts = visits
        .map((v, i) => i !== builderActiveVisitTab ? `${i + 1}: ${v}` : null)
        .filter(Boolean);
      if (opts.length === 0) return;
      const resp = prompt(`¿Desde qué visita deseas copiar los indicadores para ${visits[builderActiveVisitTab]}?\n\nOpciones disponibles:\n${opts.join('\n')}\n\nIngresa el número de visita:`);
      if (!resp) return;
      const chosenNum = parseInt(resp, 10);
      const sourceIdx = chosenNum - 1;
      if (sourceIdx >= 0 && sourceIdx < visits.length && sourceIdx !== builderActiveVisitTab) {
        const sourceSecs = (bs.seccionesPorVisita && bs.seccionesPorVisita[sourceIdx])
          ? bs.seccionesPorVisita[sourceIdx]
          : (sourceIdx === 0 ? bs.secciones : []);
        if (sourceSecs && sourceSecs.length > 0) {
          if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
          bs.seccionesPorVisita[builderActiveVisitTab] = JSON.parse(JSON.stringify(sourceSecs)).map(s => ({
            ...s,
            items: (s.items || []).map(it => ({ ...it, id: genId() }))
          }));
          builderIsDirty = true;
          showToast(`✓ Se copiaron ${sourceSecs.length} secciones desde ${visits[sourceIdx]}.`);
          renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
        } else {
          showToast('La visita seleccionada no tiene indicadores para copiar.');
        }
      } else {
        showToast('Número de visita no válido.');
      }
    });
  }

  // Agregar / Quitar Visitas
  const addVisitaBtn = document.getElementById('addVisitaBtn');
  if (addVisitaBtn) {
    addVisitaBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.visitas)) bs.visitas = [];
      const newVIdx = bs.visitas.length;
      bs.visitas.push(`Visita ${newVIdx + 1}`);
      if (bs.tipoVisitas === 'items_por_visita') {
        if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
        bs.seccionesPorVisita[newVIdx] = [{
          nombre: `Sección 1`,
          items: [{ id: genId(), texto: '', evidencia: '' }]
        }];
        builderActiveVisitTab = newVIdx;
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  container.querySelectorAll('[data-rmvisita]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const vIdx = +b.dataset.rmvisita;
    if (bs.visitas.length > 1) {
      bs.visitas.splice(vIdx, 1);
      if (bs.seccionesPorVisita) {
        delete bs.seccionesPorVisita[vIdx];
      }
      if (builderActiveVisitTab >= bs.visitas.length) {
        builderActiveVisitTab = Math.max(0, bs.visitas.length - 1);
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  container.querySelectorAll('[data-visitainp]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Toggle y config Compromisos
  const bCompHab = document.getElementById('b_comp_hab');
  if (bCompHab) {
    bCompHab.addEventListener('change', () => {
      if (!bs.compromisos) bs.compromisos = {};
      bs.compromisos.habilitado = bCompHab.checked;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }
  const bCompDir = document.getElementById('b_comp_dir');
  if (bCompDir) bCompDir.addEventListener('change', onLiveInput);
  const bCompEsp = document.getElementById('b_comp_esp');
  if (bCompEsp) bCompEsp.addEventListener('change', onLiveInput);
  const bCompFilas = document.getElementById('b_comp_filas');
  if (bCompFilas) bCompFilas.addEventListener('input', onLiveInput);

  // Preset Bloque Directivos (Panel 3)
  const addPresetDirectivosBtn = document.getElementById('addPresetDirectivosBtn');
  if (addPresetDirectivosBtn) {
    addPresetDirectivosBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.extras)) bs.extras = [];
      const directivosDefaults = [
        { label: 'Director(a) - Nombres y Apellidos', tipo: 'texto', required: true },
        { label: 'Director(a) - N° Celular', tipo: 'texto', required: false },
        { label: 'Director(a) - Correo Institucional', tipo: 'texto', required: false },
        { label: 'Subdirector(a) / Coordinador(a) Pedagógico', tipo: 'texto', required: false }
      ];
      let added = 0;
      directivosDefaults.forEach(def => {
        const exists = bs.extras.some(e => e.label && e.label.toLowerCase().includes(def.label.toLowerCase().slice(0, 12)));
        if (!exists) {
          bs.extras.push({ id: genId(), ...def, opciones: '' });
          added++;
        }
      });
      builderIsDirty = true;
      if (added > 0) showToast(`✓ Se agregaron ${added} campos del equipo directivo.`);
      else showToast('Los campos de directivos ya están presentes en la cabecera.');
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Tablas Especializadas: Presets y Botones
  const addPresetPersonalBtn = document.getElementById('addPresetPersonalBtn');
  if (addPresetPersonalBtn) {
    addPresetPersonalBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_personal_' + Date.now(),
        titulo: 'Cuadro de Personal de la I.E.',
        descripcion: 'Plazas presupuestadas y personal activo en funciones',
        columnas: [
          { id: 'c_cargo', nombre: 'Cargo / Especialidad', tipo: 'texto' },
          { id: 'c_plazas', nombre: 'N° Plazas', tipo: 'numero' },
          { id: 'c_cubiertas', nombre: 'Cubiertas', tipo: 'numero' },
          { id: 'c_vacantes', nombre: 'Vacantes', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_dir', etiqueta: 'Personal Directivo' },
          { id: 'f_jer', etiqueta: 'Personal Jerárquico' },
          { id: 'f_doc', etiqueta: 'Personal Docente' },
          { id: 'f_aux', etiqueta: 'Auxiliares de Educación' },
          { id: 'f_adm', etiqueta: 'Personal Administrativo' }
        ]
      });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  const addPresetEstudiantesBtn = document.getElementById('addPresetEstudiantesBtn');
  if (addPresetEstudiantesBtn) {
    addPresetEstudiantesBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_estudiantes_' + Date.now(),
        titulo: 'Cuadro de Metas de Matrícula y Atención',
        descripcion: 'Distribución de secciones y estudiantes matriculados',
        columnas: [
          { id: 'c_grado', nombre: 'Grado / Ciclo / Rango', tipo: 'texto' },
          { id: 'c_sec', nombre: 'N° Secciones', tipo: 'numero' },
          { id: 'c_hom', nombre: 'Hombres', tipo: 'numero' },
          { id: 'c_muj', nombre: 'Mujeres', tipo: 'numero' },
          { id: 'c_tot', nombre: 'Total Matriculados', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_g1', etiqueta: '1° Grado' },
          { id: 'f_g2', etiqueta: '2° Grado' },
          { id: 'f_g3', etiqueta: '3° Grado' },
          { id: 'f_g4', etiqueta: '4° Grado' },
          { id: 'f_g5', etiqueta: '5° Grado' },
          { id: 'f_tot', etiqueta: 'TOTAL INSTITUCIONAL' }
        ]
      });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Preset SAANEE (Panel 4)
  const addPresetSaaneeBtn = document.getElementById('addPresetSaaneeBtn');
  if (addPresetSaaneeBtn) {
    addPresetSaaneeBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_saanee_' + Date.now(),
        titulo: 'Cuadro de Profesionales No Docentes y SAANEE',
        descripcion: 'Profesionales del equipo interdisciplinario y apoyo a la inclusión',
        columnas: [
          { id: 'c_prof', nombre: 'Profesional / Especialidad', tipo: 'texto' },
          { id: 'c_plazas', nombre: 'N° Plazas', tipo: 'numero' },
          { id: 'c_cubiertas', nombre: 'Cubiertas', tipo: 'numero' },
          { id: 'c_vacantes', nombre: 'Vacantes', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_coord', etiqueta: 'Coordinador(a) SAANEE' },
          { id: 'f_psic', etiqueta: 'Psicólogo(a)' },
          { id: 'f_ter_len', etiqueta: 'Terapeuta de Lenguaje' },
          { id: 'f_ter_fis', etiqueta: 'Terapeuta Físico / Ocupacional' },
          { id: 'f_ts', etiqueta: 'Trabajador(a) Social' }
        ]
      });
      builderIsDirty = true;
      showToast('✓ Cuadro SAANEE agregado a tablas especializadas.');
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  const addCustomTableBtn = document.getElementById('addCustomTableBtn');
  if (addCustomTableBtn) {
    addCustomTableBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_custom_' + Date.now(),
        titulo: 'Nueva Tabla de Monitoreo',
        descripcion: '',
        columnas: [
          { id: 'c_item', nombre: 'Aspecto', tipo: 'texto' },
          { id: 'c_cant', nombre: 'Cantidad', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_1', etiqueta: 'Fila 1' },
          { id: 'f_2', etiqueta: 'Fila 2' }
        ]
      });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Quitar tabla
  container.querySelectorAll('[data-rmtable]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.tablas.splice(+b.dataset.rmtable, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Agregar Columna a tabla
  container.querySelectorAll('[data-addtblcol]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const ti = +b.dataset.addtblcol;
    const nomInp = document.getElementById(`newColNom_${ti}`);
    const tipoInp = document.getElementById(`newColTipo_${ti}`);
    const nom = nomInp ? nomInp.value.trim() : '';
    const tipo = tipoInp ? tipoInp.value : 'numero';
    if (!nom) {
      if (nomInp) nomInp.focus();
      return;
    }
    if (!bs.tablas[ti].columnas) bs.tablas[ti].columnas = [];
    bs.tablas[ti].columnas.push({ id: 'c_' + Date.now(), nombre: nom, tipo });
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Quitar Columna de tabla
  container.querySelectorAll('[data-rmtblcol]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const [ti, ci] = b.dataset.rmtblcol.split('|').map(Number);
    if (bs.tablas[ti] && bs.tablas[ti].columnas) {
      bs.tablas[ti].columnas.splice(ci, 1);
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Agregar Fila a tabla
  container.querySelectorAll('[data-addtblrow]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const ti = +b.dataset.addtblrow;
    const etiqInp = document.getElementById(`newRowEtiq_${ti}`);
    const etiq = etiqInp ? etiqInp.value.trim() : '';
    if (!etiq) {
      if (etiqInp) etiqInp.focus();
      return;
    }
    if (!bs.tablas[ti].filas) bs.tablas[ti].filas = [];
    bs.tablas[ti].filas.push({ id: 'f_' + Date.now(), etiqueta: etiq });
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Quitar Fila de tabla
  container.querySelectorAll('[data-rmtblrow]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const [ti, ri] = b.dataset.rmtblrow.split('|').map(Number);
    if (bs.tablas[ti] && bs.tablas[ti].filas) {
      bs.tablas[ti].filas.splice(ri, 1);
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  container.querySelectorAll('[data-tbl-titulo]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-tbl-desc]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Listeners de Secciones e Indicadores
  container.querySelectorAll('[data-secname]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-sec][data-item]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-sec][data-item-evidencia]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-sec][data-item-code]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Listeners de Extras
  container.querySelectorAll('[data-extralabel]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-extratipo]').forEach(sel => sel.addEventListener('change', () => {
    syncBuilderFromDom(container, bs);
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));
  container.querySelectorAll('[data-extrareq]').forEach(chk => chk.addEventListener('change', onLiveInput));
  container.querySelectorAll('[data-extraopts]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Helper para obtener las secciones activas según el modo de visita
  const getActiveBuilderSections = () => {
    const isMultiDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
    if (isMultiDiferenciada) {
      if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
      if (!bs.seccionesPorVisita[builderActiveVisitTab]) {
        bs.seccionesPorVisita[builderActiveVisitTab] = [];
      }
      return bs.seccionesPorVisita[builderActiveVisitTab];
    }
    if (!Array.isArray(bs.secciones)) bs.secciones = [];
    return bs.secciones;
  };

  // Agregar Ítem
  container.querySelectorAll('[data-additem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const secs = getActiveBuilderSections();
    const si = +b.dataset.additem;
    if (secs[si]) {
      if (!Array.isArray(secs[si].items)) secs[si].items = [];
      secs[si].items.push({ id: genId(), texto: '', evidencia: '' });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Quitar Ítem
  container.querySelectorAll('[data-rmitem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const secs = getActiveBuilderSections();
    const [si, ii] = b.dataset.rmitem.split('|').map(Number);
    if (secs[si] && secs[si].items) {
      secs[si].items.splice(ii, 1);
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Quitar Sección
  container.querySelectorAll('[data-rmsec]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const secs = getActiveBuilderSections();
    secs.splice(+b.dataset.rmsec, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Agregar Sección
  const addSecBtn = document.getElementById('addSecBtn');
  if (addSecBtn) {
    addSecBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      const secs = getActiveBuilderSections();
      secs.push({
        nombre: `Sección ${secs.length + 1}`,
        items: [{ id: genId(), texto: '', evidencia: '' }]
      });
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
    const secs = getActiveBuilderSections();
    const target = dir === 'up' ? si - 1 : si + 1;
    if (target >= 0 && target < secs.length) {
      const temp = secs[si];
      secs[si] = secs[target];
      secs[target] = temp;
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
        const secs = getActiveBuilderSections();
        const [moved] = secs.splice(draggedSecIdx, 1);
        secs.splice(targetIdx, 0, moved);
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
      bs.extras.push({ id: genId(), label: '', tipo: 'texto', required: false, opciones: '' });
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

  // Cancelar con confirmación
  const cancelBtn = document.getElementById('cancelTipoBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (builderIsDirty) {
        const ok = confirm('Tienes cambios sin guardar en la ficha. ¿Deseas descartarlos y salir?');
        if (!ok) return;
      }
      builderIsDirty = false;
      builderJsonUnlocked = false;
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
        nombreCorto: (bs.nombreCorto || bs.nombre).trim(),
        descripcion: (bs.descripcion || '').trim(),
        icono: (bs.icono || '📋').trim(),
        color: bs.color || FICHA_PALETTE[0].hex,
        modalidad: bs.modalidad || 'General',
        tipoRespuesta: bs.tipoRespuesta || 'si_no',
        regla_nivel: bs.regla_nivel || 'porcentaje',
        regla_nivel_config: bs.regla_nivel === 'conteo_rangos' ? (bs.regla_nivel_config || null) : null,
        version: bs.version || '2026.1',
        tieneVisitas: !!bs.tieneVisitas,
        tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
        visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
        seccionesPorVisita: (bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita') ? (bs.seccionesPorVisita || {}) : {},
        secciones: bs.secciones,
        extras: bs.extras,
        tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
        compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
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

      const isDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
      let validSeccionesPorVisita = {};
      if (isDiferenciada && bs.seccionesPorVisita) {
        Object.keys(bs.seccionesPorVisita).forEach(k => {
          validSeccionesPorVisita[k] = (bs.seccionesPorVisita[k] || [])
            .filter(s => s.nombre.trim() || (s.items && s.items.some(i => i.texto && i.texto.trim())))
            .map(s => ({
              nombre: s.nombre.trim() || 'Sección',
              items: (s.items || []).filter(i => i.texto && i.texto.trim()).map(i => ({
                id: i.id || genId(),
                texto: i.texto.trim(),
                evidencia: (i.evidencia || '').trim()
              }))
            }));
        });
      }

      const validSections = (isDiferenciada && validSeccionesPorVisita[0] && validSeccionesPorVisita[0].length > 0)
        ? validSeccionesPorVisita[0]
        : (bs.secciones || [])
          .filter(s => s.nombre.trim() || s.items.some(i => i.texto.trim()))
          .map(s => ({
            nombre: s.nombre.trim() || 'Sección',
            items: (s.items || []).filter(i => i.texto.trim()).map(i => ({
              id: i.id || genId(),
              texto: i.texto.trim(),
              evidencia: (i.evidencia || '').trim()
            }))
          }));

      const totalValidItems = validSections.reduce((acc, s) => acc + s.items.length, 0);
      const totalVisitaItems = isDiferenciada
        ? Object.values(validSeccionesPorVisita).reduce((acc, secs) => acc + secs.reduce((a2, s) => a2 + s.items.length, 0), 0)
        : totalValidItems;

      if (validSections.length === 0 || (totalValidItems === 0 && totalVisitaItems === 0)) {
        showToast('La ficha debe tener al menos una sección con un indicador.');
        return;
      }

      if (existingCount > 0) {
        const ok = confirm(`Atención: Esta plantilla tiene ${existingCount} visita(s) registradas históricamente.\n\nLos cambios en indicadores y tablas se aplicarán a las nuevas visitas. ¿Deseas guardar los cambios?`);
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
        nombreCorto: (bs.nombreCorto || bs.nombre).trim(),
        descripcion: (bs.descripcion || '').trim(),
        icono: (bs.icono || '📋').trim(),
        color: bs.color || FICHA_PALETTE[0].hex,
        modalidad: bs.modalidad || 'General',
        tipoRespuesta: bs.tipoRespuesta || 'si_no',
        regla_nivel: bs.regla_nivel || 'porcentaje',
        regla_nivel_config: bs.regla_nivel === 'conteo_rangos' ? (bs.regla_nivel_config || null) : null,
        version: bs.version || '2026.1',
        tieneVisitas: !!bs.tieneVisitas,
        tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
        visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
        seccionesPorVisita: isDiferenciada ? validSeccionesPorVisita : {},
        secciones: validSections,
        extras: (bs.extras || []).filter(e => e.label && e.label.trim()),
        tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
        compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
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
        builderJsonUnlocked = false;
        tiposView = 'list';
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        console.error(err);
        showToast('No se pudo guardar la ficha: ' + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Guardar ficha completa';
      }
    });
  }
}

/** Compatibilidad con el nombre anterior renderBuilder */
export function renderBuilder(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null, navigate = null, subNavHtml = '') {
  return renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
}

/* =========================================================================
   RESPONSABLES — (Módulo modularizado en ./ui/responsables-tab.js)
   ========================================================================= */

/* =========================================================================
   CONCURSOS TAB — (Módulo modularizado en ./ui/concursos-tab.js)
   ========================================================================= */

