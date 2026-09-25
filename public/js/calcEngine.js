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
      const conteo = resultado.conteo_si || 0;
      const rangos = regla_nivel.rangos || [];
      for (const rango of rangos) {
        if (conteo >= rango.min && conteo <= rango.max) {
          return {
            nivel:        rango.nivel,
            estado_panel: rango.estado_panel,
            cls:          _claseDeEstado(rango.estado_panel),
          };
        }
      }
    }

    // ── Tipo B: porcentaje con umbrales configurables ─────────────────
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
 *   conteo_si: number,
 *   secciones: Array<{nombre, pct, answered, total, conteo_si}>,
 *   estado: {nivel, estado_panel, cls}
 * }}
 */
export function calcScore(respuestas, fichaType) {
  const sinDatos = {
    pct:       null,
    conteo_si: 0,
    secciones: [],
    estado:    { nivel: 'Sin datos', estado_panel: 'Sin datos', cls: 'st-none' },
  };

  if (!fichaType || !Array.isArray(respuestas) || respuestas.length === 0) {
    return sinDatos;
  }

  // Resolver escala: preferir el campo 'escala' (v2) o traducir 'tipoRespuesta' (legacy)
  const escala = fichaType.escala
    || LEGADO_A_ESCALA[fichaType.tipoRespuesta]
    || 'SI_NO_NA';

  const regla_nivel = fichaType.regla_nivel || null;

  // Mapa rápido id → valor
  const valMap = Object.create(null);
  for (const r of respuestas) {
    valMap[r.id] = r.valor;
  }

  let totalScore = 0;
  let totalCount = 0;
  let conteo_si_global = 0;

  const secciones = (fichaType.secciones || []).map(sec => {
    let secScore = 0;
    let secCount = 0;
    let secSi    = 0;

    for (const it of (sec.items || [])) {
      const v  = valMap[it.id];
      const sc = puntajeItem(escala, v);
      if (sc !== null) {
        secScore += sc;
        secCount++;
        totalScore += sc;
        totalCount++;
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
    };
  });

  const pct = totalCount > 0
    ? Math.round((totalScore / totalCount) * 100)
    : null;

  const resultado = { pct, conteo_si: conteo_si_global };

  return {
    pct,
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

/** Regla genérica por porcentaje (usar para fichas sin regla oficial) */
export const REGLA_NIVEL_GENERICA = {
  tipo: 'porcentaje',
  umbrales: [
    { nivel: 'Logrado',     min: 85, estado_panel: 'Logrado'    },
    { nivel: 'En proceso',  min: 70, estado_panel: 'En proceso' },
    { nivel: 'Por mejorar', min:  0, estado_panel: 'Inicio'     },
  ],
};
