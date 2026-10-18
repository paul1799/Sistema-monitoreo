/* =========================================================================
   ui/scoring.js — Reglas de puntuación, agregación y visualización de indicadores
   ========================================================================= */

import { esc, showToast, normalizeText, normalizeReiNumber, isEbeOrPriteResponsable } from './core-utils.js';
import { getAppState, getSessionUser } from './state.js';
import {
  calcScore,
  estadoPorRegla,
  REGLA_NIVEL_JEC,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  ESPECIALISTA_JEC_OFICIAL,
  REGLA_NIVEL_COORD_PEDAGOGICO,
  isFichaEbrGestionEscolar,
  isFichaEbrEbePrite,
  getReglaNivelComunEbrEbePrite,
  getReglaNivelEbrGestion,
  getNivelEbrGestion,
  getMomentoVisitaEbr
} from '../calcEngine.js';
import * as RepDatos from '../reportes-datos.js';
import { getEbrSeccionesForVisita } from '../ebr-gestion.js';
import { isFichaJec, JEC_SECCIONES } from '../jec-monitoreo.js';
import { isFichaCebeGestion, CEBE_SECCIONES } from '../cebe-gestion.js';
import { isFichaPriteGestion, PRITE_SECCIONES } from '../prite-gestion.js';

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
  } else if (isFichaCoordPedagogico(fichaType)) {
    if (!regla || regla.maxPuntaje === 63 || (regla.rangos && regla.rangos.some(r => r.max === 63 || r.min === 53))) {
      regla = REGLA_NIVEL_COORD_PEDAGOGICO;
    }
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
  const appState = state || getAppState() || (typeof window !== 'undefined' ? window.state : null) || {};
  if (isFichaEspecialistaJec(s, appState)) {
    return ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
  }

  // 1.1 REGLA OFICIAL CEBE y PRITE:
  // Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE / PRITE
  // Se obtiene del responsable guardado o del especialista de EBE/PRITE registrado en state.responsables
  if (s && (s.fichaTypeId === 'ft_gestion_cebe' || s.fichaTypeId === 'ft_prite_gestion' || (s.fichaTypeNombre && (s.fichaTypeNombre.toLowerCase().includes('cebe') || s.fichaTypeNombre.toLowerCase().includes('prite'))))) {
    if (s.responsable && String(s.responsable).trim() && s.responsable.trim() !== '—' && !s.responsable.includes('@') && !/^\d+$/.test(String(s.responsable).trim())) {
      return String(s.responsable).trim();
    }
    if (appState && Array.isArray(appState.responsables)) {
      const sRei = s.rei || s.red || '';
      const sReiNorm = normalizeText(sRei);
      const ebeList = appState.responsables.filter(r => isEbeOrPriteResponsable(r));
      if (ebeList.length > 0) {
        const matchByRed = sReiNorm ? ebeList.find(r => {
          const rRedNorm = normalizeText(r.red || '');
          return rRedNorm && (rRedNorm.includes(sReiNorm) || sReiNorm.includes(rRedNorm));
        }) : null;
        const chosen = matchByRed || (ebeList.length === 1 ? ebeList[0] : null);
        if (chosen) {
          const n = (chosen.nombresApellidos || chosen.especialista || '').trim();
          if (n) return n;
        }
      }
    }
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
  const user = currentUser || getSessionUser() || (appState && appState.currentUser) || null;
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
  const appState = state || getAppState() || (typeof window !== 'undefined' ? window.state : null) || {};

  // 1. Caso CEBE y PRITE
  if (ft && (isFichaCebeGestion(ft) || isFichaPriteGestion(ft))) {
    if (appState && Array.isArray(appState.responsables)) {
      const colRei = normalizeText(col.rei || col.red || '');
      const ebeList = appState.responsables.filter(r => isEbeOrPriteResponsable(r));
      if (ebeList.length > 0) {
        const matchByRed = colRei ? ebeList.find(r => {
          const rRedNorm = normalizeText(r.red || '');
          return rRedNorm && (rRedNorm.includes(colRei) || colRei.includes(rRedNorm));
        }) : null;
        const chosen = matchByRed || (ebeList.length === 1 ? ebeList[0] : null);
        if (chosen) {
          const n = (chosen.nombresApellidos || chosen.especialista || '').trim();
          if (n) return n;
        }
      }
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
    const isOfficialCebe = (ft?.secciones?.length === 7 && ft.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 34);
    ftForCalc = { ...ft, secciones: isOfficialCebe ? ft.secciones : CEBE_SECCIONES, tipoRespuesta: 'ips', escala: 'IPL' };
  } else if (isFichaPriteGestion(ft || sub) && respuestasArray && respuestasArray.length > 0) {
    const isOfficialPrite = (ft?.secciones?.length === 7 && ft.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 32);
    ftForCalc = { ...ft, secciones: isOfficialPrite ? ft.secciones : PRITE_SECCIONES, tipoRespuesta: 'ips', escala: 'IPL' };
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

