/**
 * public/js/calc/evaluador.js
 * Funciones de evaluación de estados, niveles y porcentajes por regla
 * UGEL 03 · AGEBRE
 */

import {
  REGLA_NIVEL_EBR_GESTION_M1,
  REGLA_NIVEL_EBR_GESTION_M2,
  REGLA_NIVEL_EBR_GESTION_M3
} from './reglas.js';

import { getMomentoVisitaEbr } from './detectors.js';

/** Clases CSS de badge según el estado panel */
export function _claseDeEstado(estado_panel) {
  switch (estado_panel) {
    case 'Logrado':    return 'st-logrado';
    case 'En proceso': return 'st-proceso';
    case 'Inicio':     return 'st-inicio';
    default:           return 'st-none';
  }
}

/**
 * Resuelve el estado panel a partir del resultado numérico y la regla
 * de nivel declarada en la plantilla.
 *
 * @param {{ pct: number|null, conteo_si: number, puntaje?: number }} resultado
 * @param {Object|null} regla_nivel - Objeto regla_nivel del fichaType
 * @returns {{ nivel: string, estado_panel: string, cls: string }}
 */
export function estadoPorRegla(resultado, regla_nivel) {
  // Sin datos
  if (resultado === null || resultado === undefined
      || (resultado.pct === null && (!resultado.conteo_si || resultado.conteo_si === 0) && (resultado.puntaje === undefined || resultado.puntaje === null || resultado.puntaje === 0))) {
    return { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' };
  }

  if (regla_nivel) {
    if (regla_nivel === 'conteo_rangos' || (typeof regla_nivel === 'object' && (regla_nivel.tipo === 'conteo_rangos' || regla_nivel.regla_nivel_config))) {
      const cfg = regla_nivel.regla_nivel_config || regla_nivel;
      regla_nivel = {
        tipo: 'conteo',
        maxConteo: cfg.logrado?.max || 31,
        rangos: [
          { min: cfg.inicio?.min ?? 0, max: cfg.inicio?.max ?? 11, nivel: cfg.inicio?.label || 'Implementación incipiente', estado_panel: 'Inicio' },
          { min: cfg.proceso?.min ?? 12, max: cfg.proceso?.max ?? 23, nivel: cfg.proceso?.label || 'Implementación parcial', estado_panel: 'En proceso' },
          { min: cfg.logrado?.min ?? 24, max: cfg.logrado?.max ?? (cfg.logrado?.max || 31), nivel: cfg.logrado?.label || 'Implementación lograda', estado_panel: 'Logrado' }
        ]
      };
    }
    // ── Tipo A: conteo absoluto de respuestas "si" (ej. JEC) ──────────
    if (regla_nivel.tipo === 'conteo') {
      const maxConteo = regla_nivel.maxConteo || 31;
      const conteo = (resultado.conteo_si !== undefined && resultado.conteo_si !== null && resultado.conteo_si > 0)
        ? resultado.conteo_si
        : (resultado.pct !== null ? Math.round((resultado.pct / 100) * maxConteo) : 0);
      const rangos = regla_nivel.rangos || [];
      for (const rango of rangos) {
        if (conteo >= rango.min && (conteo <= rango.max || rango.max === undefined)) {
          return {
            nivel:        rango.nivel,
            estado_panel: rango.estado_panel,
            cls:          _claseDeEstado(rango.estado_panel),
          };
        }
      }
      if (conteo >= 24) {
        return { nivel: 'Implementación lograda', estado_panel: 'Logrado', cls: 'st-logrado' };
      }
      if (conteo >= 12) {
        return { nivel: 'Implementación parcial', estado_panel: 'En proceso', cls: 'st-proceso' };
      }
      return { nivel: 'Implementación incipiente', estado_panel: 'Inicio', cls: 'st-inicio' };
    }

    // ── Tipo B: puntaje directo (ej. EBR Gestión Escolar, Coordinador(a) de Tutoría JEC) ──
    if (regla_nivel.tipo === 'puntaje') {
      const maxPts = regla_nivel.maxPuntaje || 63;
      const rangos = regla_nivel.rangos || [];

      // Regla oficial unificada para EBR, EBE y PRITE (IPL / Criterio común / Momento 1 y 2):
      // Inicio (0% - 33%), Proceso (34% - 66%), Logrado (67% - 100%)
      if (regla_nivel.escala === 'IPL' || regla_nivel.escala === 'IPL_NA' || regla_nivel.esComunEbrEbePrite || regla_nivel.momento || regla_nivel.maxPuntaje === 69 || regla_nivel.maxPuntaje === 57 || rangos.some(r => r.max === 69 || r.max === 57 || r.nivel === 'Proceso' || r.nivel === 'En proceso')) {
        const rLog = rangos.find(r => r.nivel === 'Logrado') || rangos[0] || { nivel: 'Logrado', estado_panel: 'Logrado' };
        const rProc = rangos.find(r => r.nivel === 'Proceso' || r.nivel === 'En proceso') || rangos[1] || rangos[0] || { nivel: 'Proceso', estado_panel: 'En proceso' };
        const rIni = rangos.find(r => r.nivel === 'Inicio') || rangos[rangos.length - 1] || { nivel: 'Inicio', estado_panel: 'Inicio' };

        // 1. Evaluación por porcentaje
        if (resultado.pct !== null && resultado.pct !== undefined) {
          const p = Number(resultado.pct);
          if (p >= 67) {
            return {
              nivel: rLog.nivel,
              estado_panel: rLog.estado_panel,
              cls: _claseDeEstado(rLog.estado_panel),
              descripcion: rLog.descripcion || '',
              puntaje: (resultado.puntaje !== undefined && resultado.puntaje !== null) ? resultado.puntaje : Math.round((p / 100) * maxPts)
            };
          }
          if (p >= 34) {
            return {
              nivel: rProc.nivel,
              estado_panel: rProc.estado_panel,
              cls: _claseDeEstado(rProc.estado_panel),
              descripcion: rProc.descripcion || '',
              puntaje: (resultado.puntaje !== undefined && resultado.puntaje !== null) ? resultado.puntaje : Math.round((p / 100) * maxPts)
            };
          }
          return {
            nivel: rIni.nivel,
            estado_panel: rIni.estado_panel,
            cls: _claseDeEstado(rIni.estado_panel),
            descripcion: rIni.descripcion || '',
            puntaje: (resultado.puntaje !== undefined && resultado.puntaje !== null) ? resultado.puntaje : Math.round((p / 100) * maxPts)
          };
        }

        // 2. Evaluación por puntaje si no se dispone de porcentaje
        const puntaje = (resultado.puntaje !== undefined && resultado.puntaje !== null)
          ? Number(resultado.puntaje)
          : 0;
        if (rangos.length > 0) {
          for (const rango of rangos) {
            if (puntaje >= rango.min && (puntaje <= rango.max || rango.max === undefined)) {
              return {
                nivel: rango.nivel,
                estado_panel: rango.estado_panel,
                cls: _claseDeEstado(rango.estado_panel),
                descripcion: rango.descripcion || '',
                puntaje: puntaje
              };
            }
          }
          if (rangos[0] && puntaje > rangos[0].max) {
            return {
              nivel: rangos[0].nivel,
              estado_panel: rangos[0].estado_panel,
              cls: _claseDeEstado(rangos[0].estado_panel),
              descripcion: rangos[0].descripcion || '',
              puntaje: puntaje
            };
          }
          const lastR = rangos[rangos.length - 1];
          if (lastR) {
            return {
              nivel: lastR.nivel,
              estado_panel: lastR.estado_panel,
              cls: _claseDeEstado(lastR.estado_panel),
              descripcion: lastR.descripcion || '',
              puntaje: puntaje
            };
          }
        }
      }

      // Si no es EBR/IPL, evaluar puntaje genérico o de Coordinador de Tutoría / Pedagógico JEC
      const puntaje = (resultado.puntaje !== undefined && resultado.puntaje !== null)
        ? Number(resultado.puntaje)
        : ((resultado.pct !== null) ? Math.round((resultado.pct / 100) * maxPts) : 0);

      if (rangos.length > 0) {
        for (const rango of rangos) {
          if (puntaje >= rango.min && (puntaje <= rango.max || rango.max === undefined)) {
            return {
              nivel: rango.nivel,
              estado_panel: rango.estado_panel,
              cls: _claseDeEstado(rango.estado_panel),
              descripcion: rango.descripcion || '',
              puntaje: puntaje
            };
          }
        }
        if (rangos[0] && puntaje > rangos[0].max) {
          return {
            nivel: rangos[0].nivel,
            estado_panel: rangos[0].estado_panel,
            cls: _claseDeEstado(rangos[0].estado_panel),
            descripcion: rangos[0].descripcion || '',
            puntaje: puntaje
          };
        }
        const lastR = rangos[rangos.length - 1];
        if (lastR) {
          return {
            nivel: lastR.nivel,
            estado_panel: lastR.estado_panel,
            cls: _claseDeEstado(lastR.estado_panel),
            descripcion: lastR.descripcion || '',
            puntaje: puntaje
          };
        }
      }

      // Evaluación por defecto para Coordinador Pedagógico JEC (17 ítems, máx 51 pts)
      if (maxPts === 51 || regla_nivel.maxPuntaje === 51) {
        return getNivelCoordPedagogicoJec(puntaje);
      }

      // Evaluación por defecto para Coordinador de Tutoría JEC (21 ítems, máx 63 pts)
      return getNivelCoordTutoriaJec(puntaje);
    }

    // ── Tipo C: umbrales sobre el porcentaje calculado ────────────────
    const pct = resultado.pct;
    if (pct === null) {
      return { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' };
    }
    const umbrales = regla_nivel.umbrales || [];
    for (const u of umbrales) {
      if (pct >= u.min && (pct <= u.max || u.max === undefined)) {
        return {
          nivel:        u.nivel,
          estado_panel: u.estado_panel,
          cls:          _claseDeEstado(u.estado_panel),
        };
      }
    }
  }

  // ── Sin regla declarada: umbrales genéricos por defecto ──────────────
  const pct = resultado.pct;
  if (pct === null) {
    return { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' };
  }
  if (pct >= 85) return { nivel: 'Logrado',     estado_panel: 'Logrado',    cls: 'st-logrado' };
  if (pct >= 70) return { nivel: 'En proceso',  estado_panel: 'En proceso', cls: 'st-proceso' };
  return               { nivel: 'Por mejorar', estado_panel: 'Inicio',     cls: 'st-inicio'  };
}

/**
 * Obtiene el nivel de valoración del 1er Monitoreo JEC según su puntaje
 * @param {number} puntaje 
 * @returns {{ nivel: string, estado_panel: string, color: string, bg: string, descripcion: string }}
 */
export function getNivelJec1erMomento(puntaje) {
  const p = Number(puntaje) || 0;
  if (p >= 84) {
    return {
      nivel: 'LOGRADO',
      estado_panel: 'Logrado',
      color: '#10B981',
      bg: '#ECFDF5',
      descripcion: 'La IE cumple con la mayoría de los ítems establecidos.'
    };
  }
  if (p >= 57) {
    return {
      nivel: 'PROCESO',
      estado_panel: 'En proceso',
      color: '#F59E0B',
      bg: '#FFFBEB',
      descripcion: 'La IE cumple con más de la mitad de los ítems establecidos.'
    };
  }
  return {
    nivel: 'INICIO',
    estado_panel: 'Inicio',
    color: '#EF4444',
    bg: '#FEF2F2',
    descripcion: 'La IE cumple con algunos de los ítems establecidos.'
  };
}

/**
 * Genera la regla oficial de nivel con criterio común para EBR, EBE y PRITE
 * según la cantidad de ítems evaluados (N).
 *
 * @param {number} totalItems - Cantidad de ítems
 * @returns {Object} Regla oficial común
 */
export function getReglaNivelComunEbrEbePrite(totalItems = 25) {
  const n = Math.max(1, Number(totalItems) || 25);
  const maxPts = n * 3;
  return {
    tipo: 'puntaje',
    escala: 'IPL',
    maxPuntaje: maxPts,
    minPuntaje: 0,
    totalItems: n,
    esComunEbrEbePrite: true,
    rangos: [
      {
        nivel: 'Logrado',
        min: 2 * n + 1,
        max: maxPts,
        minPct: 67,
        maxPct: 100,
        estado_panel: 'Logrado',
        cls: 'st-logrado',
        color: '#16A34A',
        descripcion: `Nivel Logrado: Cumplimiento óptimo (${2 * n + 1} a ${maxPts} puntos / 67% a 100%).`
      },
      {
        nivel: 'Proceso',
        min: n + 1,
        max: 2 * n,
        minPct: 34,
        maxPct: 66,
        estado_panel: 'En proceso',
        cls: 'st-proceso',
        color: '#D97706',
        descripcion: `Nivel Proceso: En proceso de consolidación (${n + 1} a ${2 * n} puntos / 34% a 66%).`
      },
      {
        nivel: 'Inicio',
        min: 0,
        max: n,
        minPct: 0,
        maxPct: 33,
        estado_panel: 'Inicio',
        cls: 'st-inicio',
        color: '#DC2626',
        descripcion: `Nivel Inicio: Requiere asistencia técnica prioritaria (0 a ${n} puntos / 0% a 33%).`
      }
    ]
  };
}

/**
 * Devuelve el objeto descriptivo del Nivel de Cumplimiento para Coordinador(a) de Tutoría JEC
 *
 * @param {number} puntaje - Puntaje obtenido (21 a 63)
 * @returns {{ nivel: string, estado_panel: string, cls: string, color: string, rangoTexto: string, descripcion: string }}
 */
export function getNivelCoordTutoriaJec(puntaje) {
  const p = Number(puntaje) || 0;
  if (p >= 53) {
    return {
      nivel:        'Cumple',
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      rangoTexto:   'De 53 a 63',
      rangoMin:     53,
      rangoMax:     63,
      descripcion:  'El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.'
    };
  }
  if (p >= 42) {
    return {
      nivel:        'Cumple parcialmente',
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      rangoTexto:   'De 42 a 52',
      rangoMin:     42,
      rangoMax:     52,
      descripcion:  'El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.'
    };
  }
  return {
    nivel:        'No cumple',
    estado_panel: 'Inicio',
    cls:          'st-inicio',
    color:        '#DC2626',
    rangoTexto:   'De 21 a 41',
    rangoMin:     21,
    rangoMax:     41,
    descripcion:  'El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.'
  };
}

/**
 * Devuelve el objeto descriptivo del Nivel de Cumplimiento para Coordinador(a) Pedagógico JEC
 * (Regla oficial MINEDU/UGEL 03: Cumple 41–51, Cumple parcialmente 28–40, No cumple 17–27)
 *
 * @param {number} puntaje - Puntaje obtenido (17 a 51)
 * @returns {{ nivel: string, estado_panel: string, cls: string, color: string, rangoTexto: string, rangoMin: number, rangoMax: number, maxPuntaje: number, puntaje: number, descripcion: string }}
 */
export function getNivelCoordPedagogicoJec(puntaje) {
  const p = Number(puntaje) || 0;
  if (p >= 41) {
    return {
      nivel:        'Cumple',
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      rangoTexto:   'De 41 a 51',
      rangoMin:     41,
      rangoMax:     51,
      maxPuntaje:   51,
      puntaje:      p,
      descripcion:  'El/la coordinador(a) pedagógico cumple con la función de manera oportuna, pertinente y sostenida.'
    };
  }
  if (p >= 28) {
    return {
      nivel:        'Cumple parcialmente',
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      rangoTexto:   'De 28 a 40',
      rangoMin:     28,
      rangoMax:     40,
      maxPuntaje:   51,
      puntaje:      p,
      descripcion:  'El/la coordinador(a) pedagógico cumple parcialmente con la función o se encuentra en proceso de consolidación.'
    };
  }
  return {
    nivel:        'No cumple',
    estado_panel: 'Inicio',
    cls:          'st-inicio',
    color:        '#DC2626',
    rangoTexto:   'De 17 a 27',
    rangoMin:     17,
    rangoMax:     27,
    maxPuntaje:   51,
    puntaje:      p,
    descripcion:  'El/la coordinador(a) pedagógico no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.'
  };
}

/**
 * Devuelve la regla oficial de puntuación para EBR Gestión Escolar según la visita/momento
 *
 * @param {number|string|Object} visitaOrSub - Número de visita (1, 2 o 3) o ficha
 * @returns {Object} Regla oficial M1, M2 o M3
 */
export function getReglaNivelEbrGestion(visitaOrSub) {
  const v = (typeof visitaOrSub === 'object' && visitaOrSub !== null)
    ? getMomentoVisitaEbr(visitaOrSub)
    : (Number(visitaOrSub) || 1);
  if (v === 3) return REGLA_NIVEL_EBR_GESTION_M3;
  return v === 2 ? REGLA_NIVEL_EBR_GESTION_M2 : REGLA_NIVEL_EBR_GESTION_M1;
}

/**
 * Devuelve el objeto descriptivo del Nivel de Cumplimiento para EBR Gestión Escolar
 *
 * @param {number} puntaje - Puntaje obtenido (0 a 57 para M1, 0 a 69 para M2)
 * @param {number|string|Object} visitaOrMomento - 1 o 2
 * @returns {{ nivel: string, estado_panel: string, cls: string, color: string, rangoTexto: string, rangoMin: number, rangoMax: number, maxPuntaje: number, puntaje: number, pct: number, descripcion: string }}
 */
export function getNivelEbrGestion(puntaje, visitaOrMomento, maxAplicable = null) {
  const p = Number(puntaje) || 0;
  const v = (typeof visitaOrMomento === 'object' && visitaOrMomento !== null)
    ? getMomentoVisitaEbr(visitaOrMomento)
    : (Number(visitaOrMomento) === 2 ? 2 : 1);
  const regla = getReglaNivelEbrGestion(v);
  const maxPts = regla.maxPuntaje;
  const rangos = regla.rangos;

  // Proyectar el puntaje a la base oficial para no penalizar ítems N/A
  let pEval = p;
  let realPct = Math.round((p / maxPts) * 100);
  if (maxAplicable !== null && maxAplicable > 0 && maxAplicable < maxPts) {
    pEval = (p / maxAplicable) * maxPts;
    realPct = Math.round((p / maxAplicable) * 100);
  }

  for (const r of rangos) {
    if (pEval >= r.min && pEval <= r.max) {
      return {
        nivel: r.nivel,
        estado_panel: r.estado_panel,
        cls: r.cls,
        color: r.color,
        rangoTexto: `De ${r.min} a ${r.max}`,
        rangoMin: r.min,
        rangoMax: r.max,
        maxPuntaje: maxPts,
        puntaje: p,
        pct: realPct,
        descripcion: r.descripcion
      };
    }
  }
  if (pEval > maxPts) {
    const top = rangos[0];
    return {
      nivel: top.nivel,
      estado_panel: top.estado_panel,
      cls: top.cls,
      color: top.color,
      rangoTexto: `De ${top.min} a ${maxPts}`,
      rangoMin: top.min,
      rangoMax: maxPts,
      maxPuntaje: maxPts,
      puntaje: p,
      pct: 100,
      descripcion: top.descripcion
    };
  }
  const bot = rangos[rangos.length - 1];
  return {
    nivel: bot.nivel,
    estado_panel: bot.estado_panel,
    cls: bot.cls,
    color: bot.color,
    rangoTexto: `De 0 a ${bot.max}`,
    rangoMin: 0,
    rangoMax: bot.max,
    maxPuntaje: maxPts,
    puntaje: p,
    pct: 0,
    descripcion: bot.descripcion
  };
}
