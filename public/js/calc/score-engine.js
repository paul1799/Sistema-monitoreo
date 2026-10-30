/**
 * public/js/calc/score-engine.js
 * Motor principal de cálculo de puntuación y agregación por sección
 * UGEL 03 · AGEBRE
 */

import { puntajeItem, LEGADO_A_ESCALA } from './escalas.js';
import {
  REGLA_NIVEL_JEC,
  REGLA_NIVEL_JEC_1ER_MOMENTO,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  REGLA_NIVEL_COORD_PEDAGOGICO
} from './reglas.js';
import {
  isFichaJec,
  isFichaJec1erMomento,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  isFichaEbrGestionEscolar,
  isFichaEbrEbePrite,
  getMomentoVisitaEbr
} from './detectors.js';
import {
  estadoPorRegla,
  getReglaNivelComunEbrEbePrite,
  getReglaNivelEbrGestion
} from './evaluador.js';

export const _cleanStr = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/**
 * Construye el mapa de respuestas indexado multi-criterio.
 * Fuente única de verdad para la resolución de respuestas en todo el sistema.
 *
 * @param {Array<{id: string, valor: string, texto?: string, seccion?: string, num?: number, domKey?: string, seccionIdx?: number, itemIdx?: number}>} respuestas
 * @param {boolean} isJec
 * @returns {Object} valMap
 */
export function buildResponseValMap(respuestas = [], isJec = false) {
  const valMap = Object.create(null);
  const idCounts = Object.create(null);
  const textCounts = Object.create(null);

  // Primera pasada: conteo de frecuencias para saber qué IDs y textos son estrictamente únicos
  for (const r of (respuestas || [])) {
    if (!r) continue;
    if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
      const idStr = String(r.id).trim();
      idCounts[idStr] = (idCounts[idStr] || 0) + 1;
    }
    if (r.texto) {
      const ct = _cleanStr(r.texto);
      if (ct) textCounts[ct] = (textCounts[ct] || 0) + 1;
    }
  }

  valMap._uniqueIds = new Set(Object.keys(idCounts).filter(k => idCounts[k] === 1));
  valMap._uniqueTexts = new Set(Object.keys(textCounts).filter(k => textCounts[k] === 1));

  for (const r of (respuestas || [])) {
    if (!r) continue;
    const v = r.valor;
    const cleanT = r.texto ? _cleanStr(r.texto) : '';
    const cleanS = r.seccion ? _cleanStr(r.seccion) : '';

    // 1. domKey exacto: identificador primario más seguro y específico
    if (r.domKey && valMap[String(r.domKey)] === undefined) {
      valMap[String(r.domKey)] = v;
    }

    // 2. ID exacto (siempre indexado; resolveItemValue verificará unicidad)
    if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
      valMap[String(r.id)] = v;
      const norm = String(r.id).replace(/^ge\d*_/, 'ge_');
      if (norm && norm !== 'ge_' && valMap[norm] === undefined) valMap[norm] = v;
    }

    // 3. Posición exacta por índice de sección e índice de ítem (idx_sIdx_iIdx)
    if (r.seccionIdx !== undefined && r.seccionIdx !== '' && r.itemIdx !== undefined && r.itemIdx !== '') {
      const sKey = `idx_${r.seccionIdx}_${r.itemIdx}`;
      if (valMap[sKey] === undefined) {
        valMap[sKey] = v;
      }
    }

    // 4. Sección + número de ítem
    if (cleanS && (r.num !== undefined && r.num !== null)) {
      if (valMap[`sec_${cleanS}_${r.num}`] === undefined) {
        valMap[`sec_${cleanS}_${r.num}`] = v;
      }
    }

    // 5. Sección + texto normalizado
    if (cleanT) {
      if (cleanS && valMap[`sec_${cleanS}_txt_${cleanT}`] === undefined) {
        valMap[`sec_${cleanS}_txt_${cleanT}`] = v;
      }
      if (valMap['txt_' + cleanT] === undefined) {
        valMap['txt_' + cleanT] = v;
      }
    }

    // 6. Variantes oficiales JEC (con numeración correlativa global 1..31)
    if (isJec) {
      const jecNumMatch = String(r.id || '').match(/^(?:it_|jec1?_)?0*(\d+)$/i);
      if (jecNumMatch) {
        const n = parseInt(jecNumMatch[1], 10);
        const pad = String(n).padStart(2, '0');
        if (valMap['it_' + pad] === undefined) valMap['it_' + pad] = v;
        if (valMap['it_' + n] === undefined) valMap['it_' + n] = v;
        if (valMap['jec1_' + n] === undefined) valMap['jec1_' + n] = v;
        if (valMap['jec_' + n] === undefined) valMap['jec_' + n] = v;
        if (valMap['num_' + n] === undefined) valMap['num_' + n] = v;
      }
      if (r.num !== undefined && r.num !== null && valMap['num_' + r.num] === undefined) {
        valMap['num_' + r.num] = v;
      }
    }
  }
  return valMap;
}

/**
 * Resuelve el valor de un ítem con prioridad estricta anti-colisión:
 * 1) domKey exacto `s{sIdx+1}_i{iIdx+1}_{it.id||iIdx}` o `it.domKey`
 * 2) ID del ítem (SOLO si es único en la ficha para evitar colisión entre secciones)
 * 3) (seccionIdx, itemIdx) exactos `idx_{sIdx}_{iIdx}`
 * 4) (seccion + num) exactos `sec_{cleanSec}_{itNum}`
 * 5) texto normalizado con sección, o texto normalizado SOLO si es único en toda la ficha
 * 6) Prefijo normalizado ge_ para EBR oficial (único)
 * 7) Patrones de numeración JEC oficial
 *
 * @param {Object} valMap
 * @param {Object} it
 * @param {Object} sec
 * @param {number} sIdx
 * @param {number} iIdx
 * @param {boolean} isJec
 * @returns {any}
 */
export function resolveItemValue(valMap, it, sec = null, sIdx = 0, iIdx = 0, isJec = false) {
  if (!valMap || !it) return undefined;
  const cleanTxt = it.texto ? _cleanStr(it.texto) : '';
  const cleanSec = sec && sec.nombre ? _cleanStr(sec.nombre) : '';
  const itNum = it.num || (iIdx + 1);
  const rawId = it.id !== undefined && it.id !== null ? String(it.id).trim() : '';
  const hasValidId = rawId !== '';

  // 1) domKey exacto (prioridad máxima: evita 100% de colisiones entre secciones)
  const itemDomKey = `s${sIdx + 1}_i${iIdx + 1}_${it.id || iIdx}`;
  if (valMap[itemDomKey] !== undefined) {
    return valMap[itemDomKey];
  }
  if (it.domKey && valMap[it.domKey] !== undefined) {
    return valMap[it.domKey];
  }

  // 2) ID del ítem (SOLO si el ID es estrictamente único en la ficha)
  if (hasValidId && valMap._uniqueIds && valMap._uniqueIds.has(rawId)) {
    if (valMap[rawId] !== undefined) {
      return valMap[rawId];
    }
  }

  // 3) (seccionIdx, itemIdx) exactos
  if (valMap[`idx_${sIdx}_${iIdx}`] !== undefined) {
    return valMap[`idx_${sIdx}_${iIdx}`];
  }

  // 4) (seccion + num) exactos
  if (cleanSec && valMap[`sec_${cleanSec}_${itNum}`] !== undefined) {
    return valMap[`sec_${cleanSec}_${itNum}`];
  }

  // 5) texto normalizado con sección, o texto normalizado SOLO si es único en toda la ficha
  if (cleanTxt) {
    if (cleanSec && valMap[`sec_${cleanSec}_txt_${cleanTxt}`] !== undefined) {
      return valMap[`sec_${cleanSec}_txt_${cleanTxt}`];
    }
    if (valMap._uniqueTexts && valMap._uniqueTexts.has(cleanTxt) && valMap['txt_' + cleanTxt] !== undefined) {
      return valMap['txt_' + cleanTxt];
    }
  }

  // 6) Prefijo normalizado ge_ para EBR oficial (único)
  if (hasValidId) {
    const norm = rawId.replace(/^ge\d*_/, 'ge_');
    if (norm && norm !== 'ge_' && valMap._uniqueIds && valMap._uniqueIds.has(norm)) {
      if (valMap[norm] !== undefined) return valMap[norm];
    }
  }

  // 7) Patrones de numeración JEC oficial
  if (isJec && it.num) {
    return valMap['num_' + it.num]
      ?? valMap['it_' + String(it.num).padStart(2, '0')]
      ?? valMap['it_' + it.num]
      ?? valMap['jec1_' + it.num]
      ?? valMap['jec_' + it.num];
  }

  return undefined;
}

/**
 * Calcula el puntaje, porcentajes por sección y estado panel de una ficha.
 * Función pura: no toca el DOM ni variables globales.
 *
 * @param {Array<{id: string, valor: string}>} respuestas
 * @param {Object} fichaType - Documento de fichaType (con secciones, tipoRespuesta, regla_nivel)
 * @returns {{
 *   pct: number|null,
 *   puntaje: number,
 *   puntaje_max: number,
 *   conteo_si: number,
 *   conteo_no: number,
 *   total_items: number,
 *   secciones: Array<{nombre, pct, answered, total, conteo_si, puntaje}>,
 *   estado: {nivel, estado_panel, cls}
 * }}
 */
export function calcScore(respuestas, fichaType) {
  const sinDatos = {
    pct:         null,
    puntaje:     0,
    puntaje_max: 0,
    conteo_si:   0,
    conteo_no:   0,
    total_items: 0,
    secciones:   [],
    estado:      { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' },
  };

  let respuestasArray = respuestas;
  if (respuestasArray && typeof respuestasArray === 'object' && !Array.isArray(respuestasArray)) {
    respuestasArray = Object.entries(respuestasArray).map(([id, valor]) => ({ id, valor }));
  }

  if (!fichaType || !Array.isArray(respuestasArray) || respuestasArray.length === 0) {
    return sinDatos;
  }
  respuestas = respuestasArray;

  const escalaRaw = String(fichaType.escala || '').toUpperCase();
  const tipoRespRaw = String(fichaType.tipoRespuesta || '').toLowerCase();
  const hasSiNoResponses = Array.isArray(respuestasArray) && respuestasArray.some(r => {
    const v = String(r?.valor || '').trim().toLowerCase();
    return v === 'si' || v === 'sí' || v === 'no';
  }) && !respuestasArray.some(r => {
    const v = String(r?.valor || '').trim().toLowerCase();
    return v === 'logrado' || v === 'proceso' || v === 'inicio' || (Number(v) >= 2 && Number(v) <= 4);
  });

  const isSiNo = (tipoRespRaw === 'si_no' || escalaRaw === 'SI_NO' || escalaRaw === 'SI_NO_NA' ||
    tipoRespRaw.includes('si_no') || escalaRaw.includes('SI_NO') || hasSiNoResponses);

  // Resolver escala: preferir el campo 'escala' (v2) o traducir 'tipoRespuesta' (legacy)
  const escala = isSiNo ? 'SI_NO_NA' : (fichaType.escala
    || LEGADO_A_ESCALA[fichaType.tipoRespuesta]
    || ((isFichaCoordPedagogico(fichaType) || isFichaCoordTutoriaJec(fichaType)) ? 'ESCALA_1_3' : 'SI_NO_NA'));
  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  const isEbr = !isSiNo && isFichaEbrGestionEscolar(fichaType);
  let regla_nivel = fichaType.regla_nivel || null;
  if (fichaType.regla_nivel === 'conteo_rangos' || fichaType.regla_nivel_config) {
    const cfg = fichaType.regla_nivel_config || {};
    regla_nivel = {
      tipo: 'conteo',
      maxConteo: cfg.logrado?.max || 31,
      rangos: [
        { min: cfg.inicio?.min ?? 0, max: cfg.inicio?.max ?? 11, nivel: cfg.inicio?.label || 'Implementación incipiente', estado_panel: 'Inicio' },
        { min: cfg.proceso?.min ?? 12, max: cfg.proceso?.max ?? 23, nivel: cfg.proceso?.label || 'Implementación parcial', estado_panel: 'En proceso' },
        { min: cfg.logrado?.min ?? 24, max: cfg.logrado?.max ?? (cfg.logrado?.max || 31), nivel: cfg.logrado?.label || 'Implementación lograda', estado_panel: 'Logrado' }
      ]
    };
  } else if (isEbr) {
    const v = getMomentoVisitaEbr(fichaType);
    regla_nivel = getReglaNivelEbrGestion(v);
  } else if (isSiNo) {
    // Si la ficha usa escala Sí / No y no tiene conteo por rangos, regla de porcentaje oficial
    regla_nivel = {
      tipo: 'porcentaje',
      escala: 'SI_NO_NA',
      umbrales: [
        { min: 67, nivel: 'Logrado', estado_panel: 'Logrado' },
        { min: 34, max: 66, nivel: 'En proceso', estado_panel: 'En proceso' },
        { min: 0, max: 33, nivel: 'Inicio', estado_panel: 'Inicio' }
      ]
    };
  } else if (!isJec && (isFichaEbrEbePrite(fichaType) || fichaType?.escala === 'IPL' || fichaType?.tipoRespuesta === 'ips' || fichaType?.tipoRespuesta === 'escala1_3')) {
    const totalItems = (fichaType.secciones || []).reduce((acc, s) => acc + (s.items || []).length, 0) || 25;
    regla_nivel = getReglaNivelComunEbrEbePrite(totalItems);
  } else if (!regla_nivel && isFichaJec(fichaType)) {
    if (isFichaJec1erMomento(fichaType)) {
      regla_nivel = REGLA_NIVEL_JEC_1ER_MOMENTO;
    } else {
      regla_nivel = REGLA_NIVEL_JEC;
    }
  } else if (isFichaCoordPedagogico(fichaType)) {
    // Proteger contra plantillas que hayan heredado erróneamente la regla de Tutoría (63 puntos)
    if (!regla_nivel || regla_nivel.maxPuntaje === 63 || (regla_nivel.rangos && regla_nivel.rangos.some(r => r.max === 63 || r.min === 53))) {
      regla_nivel = REGLA_NIVEL_COORD_PEDAGOGICO;
    }
  } else if (!regla_nivel && isFichaCoordTutoriaJec(fichaType)) {
    regla_nivel = REGLA_NIVEL_COORD_TUTORIA_JEC;
  }

  // Resolver secciones activas considerando multi-visita con indicadores diferenciados
  let activeSections = fichaType.secciones || [];
  if (fichaType.tieneVisitas && fichaType.tipoVisitas === 'items_por_visita' && fichaType.seccionesPorVisita) {
    let vIdx = 0;
    if (fichaType.visita !== undefined && fichaType.visita !== null) {
      if (typeof fichaType.visita === 'number') vIdx = fichaType.visita - 1;
      else if (typeof fichaType.visita === 'string') {
        const m = fichaType.visita.match(/\d+/);
        if (m) vIdx = parseInt(m[0], 10) - 1;
      }
    }
    if (vIdx >= 0 && fichaType.seccionesPorVisita[vIdx] && fichaType.seccionesPorVisita[vIdx].length > 0) {
      activeSections = fichaType.seccionesPorVisita[vIdx];
    }
  }

  const valMap = buildResponseValMap(respuestas, isJec);

  let totalScore = 0;
  let totalCount = 0;
  let conteo_si_global = 0;
  let puntaje_total_raw = 0;

  const secciones = (activeSections || []).map((sec, sIdx) => {
    let secScore = 0;
    let secCount = 0;
    let secSi    = 0;
    let secPuntos = 0;

    for (let iIdx = 0; iIdx < (sec.items || []).length; iIdx++) {
      const it = sec.items[iIdx];
      const v = resolveItemValue(valMap, it, sec, sIdx, iIdx, isJec);

      const secEscala = isSiNo ? 'SI_NO_NA' : (sec.escala || (sec.tipo ? (LEGADO_A_ESCALA[sec.tipo] || sec.tipo) : null) || escala);
      const sc = puntajeItem(secEscala, v);
      if (sc !== null) {
        secScore += sc;
        secCount++;
        totalScore += sc;
        totalCount++;

        let itemPts = 0;
        const vClean = String(v || '').trim().toLowerCase();
        const numV = Number(vClean);
        if (!isNaN(numV) && numV >= 1) {
          itemPts = numV;
        } else if (vClean === 'logrado') {
          itemPts = 3;
        } else if (vClean === 'proceso') {
          itemPts = 2;
        } else if (vClean === 'inicio') {
          itemPts = 1;
        } else if (vClean === 'si' || vClean === 'sí') {
          itemPts = isEbr ? 3 : 1;
        } else if (vClean === 'no') {
          itemPts = isEbr ? 1 : 0;
        }

        if (itemPts > 0) {
          secPuntos += itemPts;
          puntaje_total_raw += itemPts;
        }
      }
      const vLower = String(v || '').trim().toLowerCase();
      if (vLower === 'si' || vLower === 'sí') {
        secSi++;
        conteo_si_global++;
      }
    }

    return {
      nombre:    sec.nombre,
      pct:       secCount > 0 ? Math.round((secScore / secCount) * 100) : null,
      answered:  secCount,
      total:     (sec.items || []).length,
      conteo_si: secSi,
      puntaje:   isSiNo ? secSi : secPuntos,
    };
  });

  const maxPuntajeOficial = isEbr
    ? (regla_nivel?.maxPuntaje || (Number(fichaType.visita) === 2 ? 69 : 57))
    : (isSiNo ? (regla_nivel?.maxConteo || totalCount) : (regla_nivel?.maxPuntaje || (totalCount * 3)));

  const pct = isEbr
    ? ((maxPuntajeOficial > 0 && puntaje_total_raw > 0) ? Math.round((puntaje_total_raw / maxPuntajeOficial) * 100) : (totalCount > 0 ? Math.round((totalScore / totalCount) * 100) : null))
    : (totalCount > 0 ? Math.round((totalScore / totalCount) * 100) : null);

  const resultado = {
    pct,
    conteo_si: conteo_si_global,
    puntaje: isSiNo ? conteo_si_global : puntaje_total_raw,
    puntaje_max: maxPuntajeOficial
  };

  return {
    pct,
    puntaje: isSiNo ? conteo_si_global : puntaje_total_raw,
    puntaje_max: maxPuntajeOficial,
    total_items: totalCount,
    conteo_si: conteo_si_global,
    conteo_no: totalCount - conteo_si_global,
    secciones,
    estado: estadoPorRegla(resultado, regla_nivel),
  };
}
