/**
 * public/js/calc/escalas.js
 * Escalas de respuesta y funciones de normalización de puntaje
 * UGEL 03 · AGEBRE
 */

/** Mapa de compatibilidad: tipoRespuesta legacy → escala_v2 */
export const LEGADO_A_ESCALA = {
  si_no:      'SI_NO_NA',
  ips:        'IPL',
  nivel_1_4:  'NIVEL_1_4',
  escala_1_3: 'ESCALA_1_3',
  escala1_3:  'ESCALA_1_3',
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
  if (valor === undefined || valor === null || valor === '') {
    return null;
  }
  const vClean = String(valor).trim().toLowerCase();
  if (vClean === 'na' || vClean === 'nc' || vClean === 'no_aplica'
      || vClean === 'no_corresponde') {
    return null; // excluido del denominador
  }

  switch (escala) {
    case 'SI_NO':
    case 'SI_NO_NA':
      if (vClean === 'si' || vClean === 'sí') return 1;
      if (vClean === 'no') return 0;
      return null;

    case 'IPL':
    case 'IPL_NA':
      if (vClean === 'logrado') return 1;
      if (vClean === 'proceso') return 0.5;
      if (vClean === 'inicio') return 0;
      // Compatibilidad hacia atrás (si/no legacy)
      if (vClean === 'si' || vClean === 'sí') return 1;
      if (vClean === 'no') return 0;
      return null;

    case 'NIVEL_1_4':
    case 'nivel_1_4': {
      const n = Number(vClean);
      if (!isNaN(n) && n >= 1 && n <= 4) return n / 4; // I=0.25 … IV=1.0
      return null;
    }

    case 'ESCALA_1_3':
    case 'escala_1_3': {
      const m = Number(vClean);
      if (!isNaN(m) && m >= 1 && m <= 3) return m / 3; // 1≈0.33 … 3=1.0
      return null;
    }

    default:
      return null;
  }
}
