/**
 * public/js/matriz/estilos.js
 * Paleta de colores, formatos y bordes de la Matriz de Seguimiento (.xlsx)
 * UGEL 03 · AGEBRE
 */

/**
 * Convierte un número de columna 1-indexado a letra de Excel (1 -> 'A', 27 -> 'AA')
 */
export function colToLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    let mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Paleta de colores oficiales según la plantilla Excel:
 * MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC.xlsx
 */
export const PALETA_MATRIZ = {
  // I. Datos Generales
  datosGeneralesHeader: 'B4C7E7', // Azul claro cabecera nivel 1-2
  datosGeneralesSubheader: 'DAE3F3', // Azul muy claro cabecera nivel 3
  datosGeneralesColA: 'DAE3F3', // Relleno columna N° (A)
  datosGeneralesData: 'E6EBF6', // Relleno celdas datos generales

  // Bloques de Personas
  persona1Header: 'C9C9C9', // Gris cabecera nivel 1-2 (Director)
  persona1Subheader: 'EDEDED', // Gris claro cabecera nivel 3
  persona1Data: 'F2F2F2', // Relleno datos primer bloque personas

  persona2Header: 'C9C9C9', // Gris cabecera nivel 1-2 (Subdirector / Coordinador)
  persona2Subheader: 'EDEDED', // Gris claro cabecera nivel 3
  persona2Data: null, // Sin relleno segundo bloque personas

  // Aspectos SI/NO
  siNoHeader1: 'FFD966', // Amarillo fuerte cabecera fila 1
  siNoHeader23: 'FFF2CC', // Amarillo claro cabecera filas 2 y 3
  siNoData: 'FFF8E5', // Amarillo muy tenue datos

  // Separador gris
  separadorGris: 'EDEDED',

  // Paleta cíclica para aspectos con escala 1-2-3 (Inicio/Proceso/Logrado)
  aspectosPuntaje: [
    {
      header1: 'A9D18E',
      header23: 'E2F0D9',
      puntaje: 'A9D18E'
    },
    {
      header1: 'DEBDFF',
      header23: 'E8D1FF',
      puntaje: 'C496DE'
    },
    {
      header1: 'F8CBAD',
      header23: 'FBE5D6',
      puntaje: 'F8CBAD'
    },
    {
      header1: '94F0FA',
      header23: 'CBF8FD',
      puntaje: '94F0FA'
    },
    {
      header1: 'FFD966',
      header23: 'FFF2CC',
      puntaje: 'FFD966'
    }
  ],

  // Columnas finales
  finalesHeader: 'EDEDED',
  nivelData: 'EDEDED',

  // Formato condicional de Nivel
  condicionalLogrado: 'C7F268', // Verde claro
  condicionalProceso: 'FFC285', // Naranja claro
  condicionalInicio: 'FF6699', // Rosado intenso

  // Bloque de estadística
  statTotalLabel: 'EDEDED',
  statSiNoLabel: 'B4C7E7',
  statScoreLabel: 'EDEDED',
  statScoreValues: 'EDEDED',

  // Cuadro RESULTADO
  resultadoHeader: '002060', // Azul marino oscuro
  resultadoHeaderFont: 'FFFF00', // Amarillo
  resultadoInicio: 'EF5786',
  resultadoProceso: 'FFB553',
  resultadoLogrado: 'BDDC02'
};

export const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'D9D9D9' } },
  left: { style: 'thin', color: { argb: 'D9D9D9' } },
  bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
  right: { style: 'thin', color: { argb: 'D9D9D9' } }
};

export const BORDER_THIN_BLACK = {
  top: { style: 'thin', color: { argb: '000000' } },
  left: { style: 'thin', color: { argb: '000000' } },
  bottom: { style: 'thin', color: { argb: '000000' } },
  right: { style: 'thin', color: { argb: '000000' } }
};

export const BORDER_MEDIUM = {
  top: { style: 'medium', color: { argb: '000000' } },
  left: { style: 'medium', color: { argb: '000000' } },
  bottom: { style: 'medium', color: { argb: '000000' } },
  right: { style: 'medium', color: { argb: '000000' } }
};

/**
 * Aplica estilos a todas las celdas de un rango combinado
 */
export function styleMergedRange(ws, startCol, startRow, endCol, endRow, style) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      if (style.font) cell.font = style.font;
      if (style.fill) cell.fill = style.fill;
      if (style.alignment) cell.alignment = style.alignment;
      if (style.border) cell.border = style.border;
    }
  }
}
