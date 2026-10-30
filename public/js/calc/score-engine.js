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

  const _cleanStr = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

  // Mapa rápido id → valor, con normalización multi-criterio y aislamiento estricto por sección
  const valMap = Object.create(null);
  for (const r of respuestas) {
    if (!r) continue;
    const v = r.valor;
    const cleanT = r.texto ? _cleanStr(r.texto) : '';
    const cleanS = r.seccion ? _cleanStr(r.seccion) : '';

    if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
      valMap[String(r.id)] = v;
      const norm = String(r.id).replace(/^ge\d*_/, 'ge_');
      if (norm && norm !== 'ge_' && valMap[norm] === undefined) valMap[norm] = v;
    }
    if (r.domKey && valMap[String(r.domKey)] === undefined) {
      valMap[String(r.domKey)] = v;
    }
    if (cleanT) {
      if (cleanS && valMap[`sec_${cleanS}_txt_${cleanT}`] === undefined) {
        valMap[`sec_${cleanS}_txt_${cleanT}`] = v;
      }
      if (valMap['txt_' + cleanT] === undefined) {
        valMap['txt_' + cleanT] = v;
      }
    }
    if (cleanS && (r.num !== undefined && r.num !== null)) {
      if (valMap[`sec_${cleanS}_${r.num}`] === undefined) {
        valMap[`sec_${cleanS}_${r.num}`] = v;
      }
    }
    if (r.seccionIdx !== undefined && r.seccionIdx !== '' && r.itemIdx !== undefined && r.itemIdx !== '') {
      const sKey = `idx_${r.seccionIdx}_${r.itemIdx}`;
      if (valMap[sKey] === undefined) {
        valMap[sKey] = v;
      }
    }
    // Solo para fichas oficiales JEC donde los ítems tienen numeración correlativa global (1..31)
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

  let totalScore = 0;
  let totalCount = 0;
  let conteo_si_global = 0;
  let puntaje_total_raw = 0;

  const secciones = (activeSections || []).map((sec, sIdx) => {
    let secScore = 0;
    let secCount = 0;
    let secSi    = 0;
    let secPuntos = 0;

    const cleanSec = sec.nombre ? _cleanStr(sec.nombre) : '';

    for (let iIdx = 0; iIdx < (sec.items || []).length; iIdx++) {
      const it = sec.items[iIdx];
      const cleanTxt = it.texto ? _cleanStr(it.texto) : '';
      const itNum = it.num || (iIdx + 1);
      const hasValidId = it.id !== undefined && it.id !== null && String(it.id).trim() !== '';

      let v = hasValidId ? valMap[it.id] : undefined;
      if (v === undefined && cleanTxt) {
        if (cleanSec && valMap[`sec_${cleanSec}_txt_${cleanTxt}`] !== undefined) {
          v = valMap[`sec_${cleanSec}_txt_${cleanTxt}`];
        } else if (valMap['txt_' + cleanTxt] !== undefined) {
          v = valMap['txt_' + cleanTxt];
        }
      }
      if (v === undefined && valMap[`idx_${sIdx}_${iIdx}`] !== undefined) {
        v = valMap[`idx_${sIdx}_${iIdx}`];
      }
      if (v === undefined && cleanSec && valMap[`sec_${cleanSec}_${itNum}`] !== undefined) {
        v = valMap[`sec_${cleanSec}_${itNum}`];
      }
      if (v === undefined && it.domKey && valMap[it.domKey] !== undefined) {
        v = valMap[it.domKey];
      }
      const itemDomKey = `s${sIdx + 1}_i${iIdx + 1}_${it.id || iIdx}`;
      if (v === undefined && valMap[itemDomKey] !== undefined) {
        v = valMap[itemDomKey];
      }
      if (v === undefined && hasValidId) {
        const norm = String(it.id).replace(/^ge\d*_/, 'ge_');
        if (norm && norm !== 'ge_') v = valMap[norm];
      }
      if (v === undefined && isJec && it.num) {
        v = valMap['num_' + it.num]
          ?? valMap['it_' + String(it.num).padStart(2, '0')]
          ?? valMap['it_' + it.num]
          ?? valMap['jec1_' + it.num]
          ?? valMap['jec_' + it.num];
      }

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
