/**
 * public/js/matriz/limites.js
 * Límites de nivel y cortes oficiales por tipo de ficha en la Matriz Excel
 * UGEL 03 · AGEBRE
 */

/**
 * Límites de nivel configurables por ficha:
 * Fórmulas:
 * =IF(<TOTAL><=0,"",IF(<TOTAL><=LIM_INICIO,"INICIO",IF(<TOTAL><=LIM_PROCESO,"PROCESO",IF(<TOTAL><=MAX,"LOGRADO",""))))
 */
export const LIMITES_NIVEL_FICHAS = {
  // Ficha A: JEC Oficial en el sistema (31 indicadores Sí/No/NA, cortes por conteo de Sí: 24..31 Lograda, 12..23 Parcial, 0..11 Incipiente)
  MODELO_JEC: {
    tipo: 'conteo',
    cuenta: 'si',
    max: 31,
    limInicio: 11,
    limProceso: 23,
    // Valores de compatibilidad y escala:
    maxLegacy: 111,
    limInicioLegacy: 56,
    limProcesoLegacy: 83,
    rangos: [
      { nivel: 'Implementación lograda', min: 24, max: 31, estado_panel: 'Logrado' },
      { nivel: 'Implementación parcial', min: 12, max: 23, estado_panel: 'En proceso' },
      { nivel: 'Implementación incipiente', min: 0, max: 11, estado_panel: 'Inicio' }
    ]
  },
  // Ficha B: Coordinador(a) de Tutoría (21 ítems x 3 = 63)
  COORD_TUTORIA_JEC: {
    max: 63,
    limInicio: 41,
    limProceso: 52
  },
  // Ficha C: Coordinador(a) Pedagógico (17 ítems x 3 = 51)
  // Regla oficial MINEDU / UGEL 03: Cumple 41–51, Cumple parcialmente 28–40, No cumple 17–27
  COORD_PEDAGOGICO: {
    max: 51,
    limInicio: 27,
    limProceso: 40
  }
};
