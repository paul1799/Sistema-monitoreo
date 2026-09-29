/* =========================================================================
   calcEngine.js — Motor de cálculo puro (sin DOM) para Fichas de Monitoreo
   UGEL 03 · AGEBRE · Fase 1

   IMPORTANTE: Este módulo NO debe importar nada del DOM ni de Firebase.
   Debe poder ejecutarse tanto en el navegador (ES6 Module) como en Node.js
   (para pruebas automatizadas con: node --input-type=module test.mjs).

   Escalas soportadas:
     SI_NO      — Sí / No
     SI_NO_NA   — Sí / No / No aplica  (N/A excluido del denominador)
     IPL        — Inicio / Proceso / Logrado
     IPL_NA     — Inicio / Proceso / Logrado / No corresponde (N/A excluido)
     NIVEL_1_4  — Rúbrica I / II / III / IV
     ESCALA_1_3 — Escala 1 / 2 / 3

   Tipos de regla de nivel (campo regla_nivel en fichaType):
     conteo     — conteo absoluto de respuestas "si" con rangos (ej. JEC)
     porcentaje — umbrales sobre el puntaje porcentual (todos los demás)

   Si fichaType no tiene regla_nivel, se usan umbrales genéricos por defecto:
     ≥ 85% → Logrado · ≥ 70% → En proceso · < 70% → Por mejorar
   ========================================================================= */

/** Mapa de compatibilidad: tipoRespuesta legacy → escala_v2 */
const LEGADO_A_ESCALA = {
  si_no:      'SI_NO_NA',
  ips:        'IPL',
  nivel_1_4:  'NIVEL_1_4',
  escala_1_3: 'ESCALA_1_3',
};

/**
 * Devuelve el puntaje normalizado (0–1) de una respuesta individual,
 * o null si la respuesta es N/A, vacía o no reconocida (excluir del denominador).
 *
 * @param {string} escala - Escala de la plantilla
 * @param {string|undefined} valor - Valor almacenado en la respuesta
 * @returns {number|null}
 */
export function puntajeItem(escala, valor) {
  if (valor === undefined || valor === null || valor === ''
      || valor === 'na' || valor === 'nc' || valor === 'no_aplica'
      || valor === 'no_corresponde') {
    return null; // excluido del denominador
  }

  switch (escala) {
    case 'SI_NO':
    case 'SI_NO_NA':
      if (valor === 'si')  return 1;
      if (valor === 'no')  return 0;
      return null;

    case 'IPL':
    case 'IPL_NA':
      if (valor === 'logrado')  return 1;
      if (valor === 'proceso')  return 0.5;
      if (valor === 'inicio')   return 0;
      // ─── Compatibilidad hacia atrás ───────────────────────────────────
      // Fichas EBR guardadas con el formulario genérico (si/no)
      // antes de la introducción del módulo ebr-gestion.js.
      // Se mapean con la mejor intención: si → Logrado, no → Inicio.
      if (valor === 'si')  return 1;   // interpretado como Logrado
      if (valor === 'no')  return 0;   // interpretado como Inicio
      return null;

    case 'NIVEL_1_4':
    case 'nivel_1_4': {
      const n = Number(valor);
      if (!isNaN(n) && n >= 1 && n <= 4) return n / 4; // I=0.25 … IV=1.0
      return null;
    }

    case 'ESCALA_1_3':
    case 'escala_1_3': {
      const m = Number(valor);
      if (!isNaN(m) && m >= 1 && m <= 3) return m / 3; // 1≈0.33 … 3=1.0
      return null;
    }

    default:
      return null;
  }
}

/**
 * Resuelve el estado panel a partir del resultado numérico y la regla
 * de nivel declarada en la plantilla.
 *
 * @param {{ pct: number|null, conteo_si: number }} resultado
 * @param {Object|null} regla_nivel - Objeto regla_nivel del fichaType
 * @returns {{ nivel: string, estado_panel: string, cls: string }}
 */
export function estadoPorRegla(resultado, regla_nivel) {
  // Sin datos
  if (resultado === null || resultado === undefined
      || (resultado.pct === null && resultado.conteo_si === 0)) {
    return { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' };
  }

  if (regla_nivel) {
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

    // ── Tipo B: puntaje directo (ej. Coordinador(a) de Tutoría JEC: 21 a 63) ──
    if (regla_nivel.tipo === 'puntaje') {
      const maxPts = regla_nivel.maxPuntaje || 63;
      const puntaje = (resultado.puntaje !== undefined && resultado.puntaje !== null)
        ? resultado.puntaje
        : (resultado.pct !== null ? Math.round((resultado.pct / 100) * maxPts) : 0);
      const rangos = regla_nivel.rangos || [];
      if (rangos.length > 0) {
        for (const rango of rangos) {
          if (puntaje >= rango.min && (puntaje <= rango.max || rango.max === undefined)) {
            return {
              nivel:        rango.nivel,
              estado_panel: rango.estado_panel,
              cls:          _claseDeEstado(rango.estado_panel),
              descripcion:  rango.descripcion || '',
              puntaje:      puntaje
            };
          }
        }
        if (rangos[0] && puntaje > rangos[0].max) {
          return {
            nivel:        rangos[0].nivel,
            estado_panel: rangos[0].estado_panel,
            cls:          _claseDeEstado(rangos[0].estado_panel),
            descripcion:  rangos[0].descripcion || '',
            puntaje:      puntaje
          };
        }
        const lastR = rangos[rangos.length - 1];
        if (lastR) {
          return {
            nivel:        lastR.nivel,
            estado_panel: lastR.estado_panel,
            cls:          _claseDeEstado(lastR.estado_panel),
            descripcion:  lastR.descripcion || '',
            puntaje:      puntaje
          };
        }
      }
      if (puntaje >= 53) {
        return {
          nivel: 'Cumple',
          estado_panel: 'Logrado',
          cls: 'st-logrado',
          descripcion: 'El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.',
          puntaje
        };
      }
      if (puntaje >= 42) {
        return {
          nivel: 'Cumple parcialmente',
          estado_panel: 'En proceso',
          cls: 'st-proceso',
          descripcion: 'El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.',
          puntaje
        };
      }
      return {
        nivel: 'No cumple',
        estado_panel: 'Inicio',
        cls: 'st-inicio',
        descripcion: 'El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.',
        puntaje
      };
    }

    // ── Tipo C: porcentaje con umbrales configurables ─────────────────
    if (regla_nivel.tipo === 'porcentaje') {
      const pct = resultado.pct;
      if (pct === null) return { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' };
      const umbrales = [...(regla_nivel.umbrales || [])].sort((a, b) => b.min - a.min);
      for (const u of umbrales) {
        if (pct >= u.min) {
          return {
            nivel:        u.nivel,
            estado_panel: u.estado_panel,
            cls:          _claseDeEstado(u.estado_panel),
          };
        }
      }
    }
  }

  // ── Umbrales genéricos por defecto (si no hay regla_nivel) ──────────
  const pct = resultado.pct;
  if (pct === null) return { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' };
  if (pct >= 85) return { nivel: 'Logrado',     estado_panel: 'Logrado',     cls: 'st-logrado' };
  if (pct >= 70) return { nivel: 'En proceso',  estado_panel: 'En proceso',  cls: 'st-proceso' };
  return           { nivel: 'Por mejorar',  estado_panel: 'Inicio',      cls: 'st-inicio' };
}

function _claseDeEstado(estado_panel) {
  const mapa = {
    'Logrado':     'st-logrado',
    'En proceso':  'st-proceso',
    'Proceso':     'st-proceso',
    'Inicio':      'st-inicio',
    'Por mejorar': 'st-inicio',
    'Sin datos':   'st-none',
  };
  return mapa[estado_panel] || 'st-none';
}

/**
 * Calcula el puntaje completo de una ficha registrada.
 *
 * @param {Array<{id: string, valor: string}>} respuestas
 * @param {Object} fichaType - Documento de fichaType (con secciones, tipoRespuesta, regla_nivel)
 * @returns {{
 *   pct: number|null,
 *   puntaje: number,
 *   puntaje_max: number,
 *   conteo_si: number,
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
    secciones:   [],
    estado:      { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' },
  };

  if (!fichaType || !Array.isArray(respuestas) || respuestas.length === 0) {
    return sinDatos;
  }

  // Resolver escala: preferir el campo 'escala' (v2) o traducir 'tipoRespuesta' (legacy)
  const escala = fichaType.escala
    || LEGADO_A_ESCALA[fichaType.tipoRespuesta]
    || 'SI_NO_NA';

  const isEbr = isFichaEbrGestionEscolar(fichaType);
  let regla_nivel = fichaType.regla_nivel || null;
  if (isEbr) {
    const v = getMomentoVisitaEbr(fichaType);
    regla_nivel = getReglaNivelEbrGestion(v);
  } else if (!regla_nivel && isFichaJec(fichaType)) {
    regla_nivel = REGLA_NIVEL_JEC;
  } else if (!regla_nivel && isFichaCoordTutoriaJec(fichaType)) {
    regla_nivel = REGLA_NIVEL_COORD_TUTORIA_JEC;
  }

  // Mapa rápido id → valor
  const valMap = Object.create(null);
  for (const r of respuestas) {
    valMap[r.id] = r.valor;
  }

  let totalScore = 0;
  let totalCount = 0;
  let conteo_si_global = 0;
  let puntaje_total_raw = 0;

  const secciones = (fichaType.secciones || []).map(sec => {
    let secScore = 0;
    let secCount = 0;
    let secSi    = 0;
    let secPuntos = 0;

    for (const it of (sec.items || [])) {
      const v  = valMap[it.id];
      const sc = puntajeItem(escala, v);
      if (sc !== null) {
        secScore += sc;
        secCount++;
        totalScore += sc;
        totalCount++;

        let itemPts = 0;
        const numV = Number(v);
        if (!isNaN(numV) && numV >= 1) {
          itemPts = numV;
        } else if (v === 'logrado') {
          itemPts = 3;
        } else if (v === 'proceso') {
          itemPts = 2;
        } else if (v === 'inicio') {
          itemPts = 1;
        } else if (v === 'si') {
          itemPts = isEbr ? 3 : 1;
        } else if (v === 'no') {
          itemPts = isEbr ? 1 : 0;
        }

        if (itemPts > 0) {
          secPuntos += itemPts;
          puntaje_total_raw += itemPts;
        }
      }
      if (v === 'si') {
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
    ? (maxPuntajeOficial > 0 ? Math.round((puntaje_total_raw / maxPuntajeOficial) * 100) : null)
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
    conteo_si: conteo_si_global,
    secciones,
    estado: estadoPorRegla(resultado, regla_nivel),
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   REGLAS DE NIVEL PREDEFINIDAS
   Usadas por el script de migración y por la validación del editor.
   ───────────────────────────────────────────────────────────────────────── */

/** Regla oficial de la ficha JEC (Implementación del MSE) */
export const REGLA_NIVEL_JEC = {
  tipo:   'conteo',
  cuenta: 'si',
  rangos: [
    { nivel: 'Implementación lograda',    min: 24, max: 31, estado_panel: 'Logrado'    },
    { nivel: 'Implementación parcial',    min: 12, max: 23, estado_panel: 'En proceso' },
    { nivel: 'Implementación incipiente', min:  0, max: 11, estado_panel: 'Inicio'     },
  ],
};

/** Regla oficial de la Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC) */
export const REGLA_NIVEL_COORD_TUTORIA_JEC = {
  tipo:       'puntaje',
  escala:     'escala_1_3',
  maxPuntaje: 63,
  minPuntaje: 21,
  nota:       'Regla oficial Coordinador(a) de Tutoría JEC: Cumple (53–63), Cumple parcialmente (42–52), No cumple (21–41)',
  rangos: [
    {
      nivel:        'Cumple',
      min:          53,
      max:          63,
      estado_panel: 'Logrado',
      descripcion:  'El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.'
    },
    {
      nivel:        'Cumple parcialmente',
      min:          42,
      max:          52,
      estado_panel: 'En proceso',
      descripcion:  'El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.'
    },
    {
      nivel:        'No cumple',
      min:          21,
      max:          41,
      estado_panel: 'Inicio',
      descripcion:  'El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.'
    },
  ],
};

/** Regla genérica por porcentaje (usar para fichas sin regla oficial) */
export const REGLA_NIVEL_GENERICA = {
  tipo: 'porcentaje',
  umbrales: [
    { nivel: 'Logrado',     min: 85, estado_panel: 'Logrado'    },
    { nivel: 'En proceso',  min: 70, estado_panel: 'En proceso' },
    { nivel: 'Por mejorar', min:  0, estado_panel: 'Inicio'     },
  ],
};

/**
 * Determina con alta precisión si una plantilla o ficha corresponde a la de
 * "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
 *
 * @param {Object} ft - Plantilla o ficha
 * @returns {boolean}
 */
export function isFichaJec(ft) {
  if (!ft) return false;
  const id = String(ft.id || ft.fichaTypeId || '').toLowerCase();
  if (id === 'ft_msejec_2do' || id === 'ft_jec') return true;
  const n = String(ft.nombre || ft.fichaTypeNombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (n.includes('tutoria')) return false; // Evitar confundir con coordinacion de tutoria JEC
  return n.includes('implementacion') && n.includes('modelo jec');
}

/**
 * Determina si una plantilla o ficha corresponde a la de:
 * "Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)"
 *
 * @param {Object} ft - Plantilla o ficha
 * @returns {boolean}
 */
export function isFichaCoordTutoriaJec(ft) {
  if (!ft) return false;
  const id = String(ft.id || ft.fichaTypeId || '').toLowerCase();
  if (id === 'ft_coord_tutoria_jec') return true;
  const n = String(ft.nombre || ft.fichaTypeNombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return (n.includes('coordinador') || n.includes('funciones')) && n.includes('tutoria') && n.includes('jec');
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

/* ─────────────────────────────────────────────────────────────────────────
   REGLAS OFICIALES: MONITOREO Y ASISTENCIA TÉCNICA A LA GESTIÓN ESCOLAR
   UGEL 03 EBR (1er y 2do Momento)
   ───────────────────────────────────────────────────────────────────────── */

/** Regla oficial 1er Momento: Monitoreo y Asistencia Técnica a la Gestión Escolar EBR (19 ítems, máx 57 pts) */
export const REGLA_NIVEL_EBR_GESTION_M1 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    1,
  visita:     1,
  maxPuntaje: 57,
  minPuntaje: 0,
  totalItems: 19,
  nota:       'Regla oficial 1er Momento EBR Gestión Escolar: Inicio (0–19), Proceso (20–38), Logrado (39–57)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          39,
      max:          57,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: La IE evidencia un nivel óptimo en las condiciones y compromisos de gestión escolar (39 a 57 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          20,
      max:          38,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: La IE se encuentra en proceso de implementación y requiere consolidar acciones de mejora (20 a 38 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          19,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: La IE requiere asistencia técnica prioritaria para el cumplimiento de las condiciones de gestión (0 a 19 puntos).'
    },
  ],
};

/** Regla oficial 2do Momento: Monitoreo y Asistencia Técnica a la Gestión Escolar EBR (23 ítems, máx 69 pts) */
export const REGLA_NIVEL_EBR_GESTION_M2 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    2,
  visita:     2,
  maxPuntaje: 69,
  minPuntaje: 0,
  totalItems: 23,
  nota:       'Regla oficial 2do Momento EBR Gestión Escolar: Inicio (0–23), Proceso (24–46), Logrado (47–69)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          47,
      max:          69,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: La IE evidencia un nivel óptimo en las condiciones y compromisos de gestión escolar (47 a 69 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          24,
      max:          46,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: La IE se encuentra en proceso de implementación y requiere consolidar acciones de mejora (24 a 46 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          23,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: La IE requiere asistencia técnica prioritaria para el cumplimiento de las condiciones de gestión (0 a 23 puntos).'
    },
  ],
};

/**
 * Determina con precisión si una plantilla o ficha corresponde a la de
 * "Monitoreo y Asistencia Técnica a la Gestión Escolar - UGEL 03 EBR"
 *
 * @param {Object} ft - Plantilla o ficha
 * @returns {boolean}
 */
export function isFichaEbrGestionEscolar(ft) {
  if (!ft) return false;
  const id = String(ft.id || ft.fichaTypeId || '').toLowerCase();
  if (id === 'ft_gestion_ugel03_ebr') return true;
  if (id === 'ft_ebr_gestion_1er') return false;
  const n = String(ft.nombre || ft.fichaTypeNombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (n.includes('1er momento') || n.includes('1.er momento') || n.includes('diagnostico')) return false;
  return n.includes('gestion escolar') && (n.includes('ebr') || n.includes('ugel 03'));
}

/**
 * Detecta si una ficha o plantilla EBR corresponde al 1er o 2do Momento
 *
 * @param {Object} subOrFt - Ficha registrada o plantilla
 * @returns {number} 1 o 2
 */
export function getMomentoVisitaEbr(subOrFt) {
  if (!subOrFt) return 1;
  const v = Number(subOrFt.visita);
  if (v === 1 || v === 2) return v;
  if (subOrFt.visitaTipo && String(subOrFt.visitaTipo).includes('2')) return 2;
  if (subOrFt.visitaTipo && String(subOrFt.visitaTipo).includes('1')) return 1;
  const n = String(subOrFt.nombre || subOrFt.fichaTypeNombre || '').toLowerCase();
  if (n.includes('2do') || n.includes('segundo') || n.includes('momento 2')) return 2;
  if (n.includes('1er') || n.includes('primer') || n.includes('momento 1')) return 1;
  if (subOrFt.version?.momento === '2do' || subOrFt.momento === '2do' || subOrFt.momento === 2) return 2;
  if (subOrFt.version?.momento === '1er' || subOrFt.momento === '1er' || subOrFt.momento === 1) return 1;
  if (Array.isArray(subOrFt.respuestas) && subOrFt.respuestas.some(r => String(r?.id || '').startsWith('ge2_'))) return 2;
  if (Array.isArray(subOrFt.respuestas) && subOrFt.respuestas.length > 20) return 2;
  if (Array.isArray(subOrFt.secciones) && subOrFt.secciones.length > 20) return 2;
  return 1;
}

/**
 * Devuelve la regla oficial de puntuación para EBR Gestión Escolar según la visita/momento
 *
 * @param {number|string|Object} visitaOrSub - Número de visita (1 o 2) o ficha
 * @returns {Object} Regla oficial M1 o M2
 */
export function getReglaNivelEbrGestion(visitaOrSub) {
  const v = (typeof visitaOrSub === 'object' && visitaOrSub !== null)
    ? getMomentoVisitaEbr(visitaOrSub)
    : (Number(visitaOrSub) === 2 ? 2 : 1);
  return v === 2 ? REGLA_NIVEL_EBR_GESTION_M2 : REGLA_NIVEL_EBR_GESTION_M1;
}

/**
 * Devuelve el objeto descriptivo del Nivel de Cumplimiento para EBR Gestión Escolar
 *
 * @param {number} puntaje - Puntaje obtenido (0 a 57 para M1, 0 a 69 para M2)
 * @param {number|string|Object} visitaOrMomento - 1 o 2
 * @returns {{ nivel: string, estado_panel: string, cls: string, color: string, rangoTexto: string, rangoMin: number, rangoMax: number, maxPuntaje: number, puntaje: number, pct: number, descripcion: string }}
 */
export function getNivelEbrGestion(puntaje, visitaOrMomento) {
  const p = Number(puntaje) || 0;
  const v = (typeof visitaOrMomento === 'object' && visitaOrMomento !== null)
    ? getMomentoVisitaEbr(visitaOrMomento)
    : (Number(visitaOrMomento) === 2 ? 2 : 1);
  const regla = getReglaNivelEbrGestion(v);
  const maxPts = regla.maxPuntaje;
  const rangos = regla.rangos;
  for (const r of rangos) {
    if (p >= r.min && p <= r.max) {
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
        pct: Math.round((p / maxPts) * 100),
        descripcion: r.descripcion
      };
    }
  }
  if (p > maxPts) {
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

