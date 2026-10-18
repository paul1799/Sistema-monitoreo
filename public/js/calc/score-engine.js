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

  // Resolver escala: preferir el campo 'escala' (v2) o traducir 'tipoRespuesta' (legacy)
  const escala = fichaType.escala
    || LEGADO_A_ESCALA[fichaType.tipoRespuesta]
    || ((isFichaCoordPedagogico(fichaType) || isFichaCoordTutoriaJec(fichaType)) ? 'ESCALA_1_3' : 'SI_NO_NA');

  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  const isEbr = isFichaEbrGestionEscolar(fichaType);
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

  // Mapa rápido id → valor, con normalización para EBR (ge1_x / ge2_x / ge_x / num_x)
  const valMap = Object.create(null);
  for (const r of respuestas) {
    if (!r) continue;
    valMap[r.id] = r.valor;
    const norm = String(r.id || '').replace(/^ge\d*_/, 'ge_');
    if (norm && valMap[norm] === undefined) valMap[norm] = r.valor;
    if (r.num !== undefined && r.num !== null && valMap['num_' + r.num] === undefined) {
      valMap['num_' + r.num] = r.valor;
    }
  }

  let totalScore = 0;
  let totalCount = 0;
  let conteo_si_global = 0;
  let puntaje_total_raw = 0;

  const secciones = (activeSections || []).map(sec => {
    let secScore = 0;
    let secCount = 0;
    let secSi    = 0;
    let secPuntos = 0;

    for (const it of (sec.items || [])) {
      const v = valMap[it.id] ?? valMap[String(it.id).replace(/^ge\d*_/, 'ge_')] ?? (it.num ? valMap['num_' + it.num] : undefined);
      const sc = puntajeItem(escala, v);
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
      puntaje:   secPuntos,
    };
  });

  const maxPuntajeOficial = isEbr
    ? (regla_nivel?.maxPuntaje || (Number(fichaType.visita) === 2 ? 69 : 57))
    : (regla_nivel?.maxPuntaje || (totalCount * 3));

  const pct = isEbr
    ? ((maxPuntajeOficial > 0 && puntaje_total_raw > 0) ? Math.round((puntaje_total_raw / maxPuntajeOficial) * 100) : (totalCount > 0 ? Math.round((totalScore / totalCount) * 100) : null))
    : (totalCount > 0 ? Math.round((totalScore / totalCount) * 100) : null);

  const resultado = {
    pct,
    conteo_si: conteo_si_global,
    puntaje: puntaje_total_raw,
    puntaje_max: maxPuntajeOficial
  };

  return {
    pct,
    puntaje: puntaje_total_raw,
    puntaje_max: maxPuntajeOficial,
    total_items: totalCount,
    conteo_si: conteo_si_global,
    conteo_no: totalCount - conteo_si_global,
    secciones,
    estado: estadoPorRegla(resultado, regla_nivel),
  };
}
