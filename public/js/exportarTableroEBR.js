/* =========================================================================
   exportarTableroEBR.js — Generador oficial del Tablero de Monitoreo
   y Asistencia Técnica a la Gestión Escolar UGEL 03 EBR (Visita 1 y Visita 2)
   Basado en la plantilla oficial TABLERO_MONITOREO_GESTION_II_MOMENTO.xlsx
   ========================================================================= */

import { normalizarPersona } from './exportarMatriz.js?v=20260930_v4';
import {
  INSTRUMENTO_EBR,
  valorANumericoEbr
} from './instrumentoGestionEBR.js?v=20261001_v1';

/**
 * Constante configurable (Sección 7 del prompt):
 * true: Un aspecto sin respuesta cuenta como 0 y baja el RESULTADO (regla de la plantilla oficial).
 * false: El aspecto sin respuesta queda vacío y RESULTADO promedia solo los aspectos con valor (>0).
 */
export const ASPECTO_SIN_RESPUESTA_CUENTA_CERO = true;

// ─── Estilos y paleta institucional de la plantilla ──────────────────────────

const AZUL_HEADER    = '2E75B6'; // Encabezados generales (#2E75B6)
const AZUL_TITULO    = '1F4E78'; // Títulos combinados fila 1 (#1F4E78)
const BLANCO         = 'FFFFFF';
const GRIS_FONDO     = 'F2F2F2'; // Celdas con fórmulas y datos protegidos
const GRIS_BORDE     = 'D9D9D9';
const VERDE_DOC_HEAD = '548235'; // Cabecera datos docentes A-F (#548235)

// Colores oficiales por rúbrica (hojas DOCENTES)
const COLOR_RUBRICA = {
  R1: '403152', // #403152
  R2: '953735', // #953735
  R3: '31859C', // #31859C
  R4: '808080', // #808080
  R5: '548235'  // #548235
};

// Formato condicional para columna ESTADO
const COLORES_CONDICIONAL_ESTADO = {
  'LOGRADO':   { fondo: 'C6EFCE', letra: '006100' },
  'PROCESO':   { fondo: 'FFEB9C', letra: '9C5700' },
  'INICIO':    { fondo: 'FFC7CE', letra: '9C0006' },
  'NO INICIÓ': { fondo: 'D9D9D9', letra: '595959' }
};

// Títulos oficiales completos por aspecto
const TITULOS_ASPECTOS_V2 = {
  '6.1': '6.1 MONITOREO Y ACOMPAÑAMIENTO A LA PRÁCTICA DOCENTE',
  '6.2': '6.2 FORTALECIMIENTO DOCENTE',
  '6.3': '6.3 EVALUACIÓN DE LOS APRENDIZAJES / REFUERZO ESCOLAR',
  '6.4': '6.4 USO DE MATERIALES Y ESPACIOS EDUCATIVOS',
  '6.5': '6.5 OTROS ASPECTOS'
};

const TITULOS_ASPECTOS_V1 = {
  '4.1': '4.1 MONITOREO Y ACOMPAÑAMIENTO A LA PRÁCTICA DOCENTE',
  '4.2': '4.2 FORTALECIMIENTO DOCENTE',
  '4.3': '4.3 EVALUACIÓN DE LOS APRENDIZAJES / REFUERZO ESCOLAR',
  '4.4': '4.4 USO DE MATERIALES Y ESPACIOS EDUCATIVOS',
  '4.5': '4.5 OTROS ASPECTOS'
};

// ─── Helpers de formato ───────────────────────────────────────────────────────

function colorFill(argb) {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}

function thinBorder(color = GRIS_BORDE) {
  const s = { style: 'thin', color: { argb: color } };
  return { top: s, left: s, bottom: s, right: s };
}

function cellFont(size = 10, bold = false, color = '000000', name = 'Calibri') {
  return { name, size, bold, color: { argb: color } };
}

function centerAlign(wrapText = true) {
  return { horizontal: 'center', vertical: 'middle', wrapText };
}

function leftAlign(wrapText = true) {
  return { horizontal: 'left', vertical: 'middle', wrapText };
}

/**
 * Obtiene la fecha actual en America/Lima con formato AAAAMMDD
 */
export function getFechaLimaAAAAMMDD() {
  const ahora = new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(ahora); // 'YYYY-MM-DD'
    return parts.replace(/-/g, '');
  } catch (_) {
    return ahora.toISOString().slice(0, 10).replace(/-/g, '');
  }
}

/**
 * Convierte una fecha a formato dd/mm/yyyy
 */
function formatearFechaDDMMYYYY(fechaStr) {
  if (!fechaStr) return '';
  const s = String(fechaStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const [y, m, d] = s.slice(0, 10).split('-');
    return `${d}/${m}/${y}`;
  }
  if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) {
    return s.slice(0, 10);
  }
  return s;
}

// ─── Función Principal de Exportación ────────────────────────────────────────

/**
 * Genera el tablero Excel oficial EBR para Visita 1 o Visita 2.
 * @param {Object[]} submissions - Fichas de monitoreo EBR registradas
 * @param {1|2} visita - Número estricto de visita (1 o 2)
 * @param {Object[]} colegios - Lista completa de colegios (state.colegios)
 * @param {Object} [state] - Estado global opcional (para directorio y enriquecimiento)
 * @returns {Promise<{ buffer: Uint8Array, fileName: string }>}
 */
export async function exportarTableroEBRCompleto(submissions, visita, colegios, state = null) {
  // ─── Regla 8.2: Validación estricta de visita en el servidor / cliente ──────
  const v = Number(visita);
  if (v !== 1 && v !== 2) {
    const err = new Error('Parámetro visita inválido o ausente. Debe ser 1 (Primer momento) o 2 (Segundo momento). No se permite exportar ambas visitas juntas.');
    err.status = 400;
    throw err;
  }

  // Filtrar y validar que todas las fichas pertenezcan a la visita seleccionada y modalidad EBR
  const fichasVisita = (submissions || []).filter(s => {
    const sVis = Number(s.visita) || (Array.isArray(s.respuestas) && s.respuestas.some(r => String(r?.id || '').startsWith('ge2_')) ? 2 : 1);
    return sVis === v;
  });

  // Defensa estricta: asegurar que no haya fichas de otra visita
  for (const s of fichasVisita) {
    const sVis = Number(s.visita) || 1;
    if (sVis !== v) {
      const err = new Error(`Error 400: La ficha de la IE ${s.institucion || s.codigoLocal} pertenece a la Visita ${sVis}, no a la Visita ${v}.`);
      err.status = 400;
      throw err;
    }
  }

  let ExcelJS = null;
  if (typeof window !== 'undefined' && window.ExcelJS) {
    ExcelJS = window.ExcelJS;
  } else {
    try {
      ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
    } catch (_) {
      try {
        ExcelJS = require('exceljs');
      } catch (e) {
        throw new Error('ExcelJS no está disponible en el entorno de ejecución.');
      }
    }
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Monitoreo UGEL 03 - AGEBRE';
  wb.lastModifiedBy = 'UGEL 03 - AGEBRE';
  wb.created = new Date();
  wb.modified = new Date();

  // 1. Obtener universo de todas las IE EBR del ámbito (Regla 4.3)
  const iesEbr = _obtenerColegiosEBR(colegios);

  // 2. Mapear cada IE con su ficha (si existe) y datos de director
  const filasGenerales = _prepararFilasGenerales(iesEbr, fichasVisita, state, v);

  // 3. Configuración del instrumento para esta visita
  const cfg = INSTRUMENTO_EBR.getConfig(v);
  const secciones = cfg.secciones;

  // ─── Hoja 1: GENERAL (24 columnas, A1 a X<ult>) ──────────────────────────────
  const wsGeneral = wb.addWorksheet('GENERAL', {
    views: [{ state: 'frozen', xSplit: 4, ySplit: 1, topLeftCell: 'E2' }]
  });
  _construirHojaGeneral(wsGeneral, filasGenerales, v, secciones);

  // ─── Hojas 2–6: CAT_x.1 a CAT_x.5 (Dimensiones) ──────────────────────────────
  secciones.forEach((sec, idx) => {
    const sheetName = 'CAT_' + sec.codigo;
    const tableName = 'T_' + sec.codigo.replace('.', '_');
    const wsAsp = wb.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 2, topLeftCell: 'C3' }]
    });
    _construirHojaAspecto(wsAsp, sec, tableName, filasGenerales, v, idx + 1);
  });

  // ─── Hojas 7–8: DOCENTES_1ER_MOM y DOCENTES_2DO_MOM (Solo Visita 2) ──────────
  if (v === 2) {
    const wsDoc1 = wb.addWorksheet('DOCENTES_1ER_MOM', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 2, topLeftCell: 'C3' }]
    });
    _construirHojaDocentes(wsDoc1, 'T_DOC1', 'momento1', filasGenerales, 'IV. DATA DE DOCENTES MONITOREADOS - PRIMER MOMENTO (por nivel). R1-R5 = rúbricas; I-IV = niveles de logro');

    const wsDoc2 = wb.addWorksheet('DOCENTES_2DO_MOM', {
      views: [{ state: 'frozen', xSplit: 2, ySplit: 2, topLeftCell: 'C3' }]
    });
    _construirHojaDocentes(wsDoc2, 'T_DOC2', 'momento2', filasGenerales, 'V. DATA DE DOCENTES MONITOREADOS - SEGUNDO MOMENTO (por nivel). R1-R5 = rúbricas; I-IV = niveles de logro');
  }

  // ─── Descarga / Retorno de Buffer ───────────────────────────────────────────
  const rawBuffer = await wb.xlsx.writeBuffer();
  const buffer = await _sanitizarBufferOpenXml(rawBuffer);
  const fechaLima = getFechaLimaAAAAMMDD();
  const momRomano = v === 2 ? 'II' : 'I';
  const fileName = `TABLERO_MONITOREO_GESTION_EBR_${momRomano}_MOMENTO_${fechaLima}.xlsx`;

  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { buffer, fileName };
}

/**
 * Corrige el bug nativo de ExcelJS que ubica <tableParts> antes de <legacyDrawing> en worksheets con notas y tablas.
 * Según la especificación OpenXML ECMA-376 (CT_Worksheet sequence), <legacyDrawing> debe preceder a <tableParts>.
 * Si no se reordena, Microsoft Excel muestra una advertencia de reparación y descarta las hojas XML.
 */
async function _sanitizarBufferOpenXml(buffer) {
  let JSZipModule = null;
  if (typeof window !== 'undefined' && window.JSZip) {
    JSZipModule = window.JSZip;
  } else if (typeof require !== 'undefined') {
    try { JSZipModule = require('jszip'); } catch (_) {}
  }
  if (!JSZipModule) {
    try {
      JSZipModule = (await import('jszip')).default || (await import('jszip'));
    } catch (_) {}
  }
  if (!JSZipModule) {
    return buffer;
  }

  try {
    const zip = await JSZipModule.loadAsync(buffer);
    let modificado = false;

    for (const [filename, file] of Object.entries(zip.files)) {
      if (filename.startsWith('xl/worksheets/sheet') && filename.endsWith('.xml')) {
        let xml = await file.async('string');
        const tpIndex = xml.indexOf('<tableParts');
        const ldIndex = xml.indexOf('<legacyDrawing');
        if (tpIndex !== -1 && ldIndex !== -1 && tpIndex < ldIndex) {
          const legacyDrawingMatch = xml.match(/(<legacyDrawing[^>]*\/>)/g);
          if (legacyDrawingMatch) {
            xml = xml.replace(/(<legacyDrawing[^>]*\/>)/g, '');
            xml = xml.replace('<tableParts', legacyDrawingMatch.join('') + '<tableParts');
            zip.file(filename, xml);
            modificado = true;
          }
        }
      }
    }

    if (!modificado) return buffer;

    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    const outputType = isNode ? 'nodebuffer' : 'uint8array';
    return await zip.generateAsync({ type: outputType, compression: 'DEFLATE' });
  } catch (err) {
    console.warn('[exportarTableroEBR] No se pudo reordenar tags OpenXML con JSZip:', err);
    return buffer;
  }
}

// ─── Construcción de Hoja GENERAL ────────────────────────────────────────────

function _construirHojaGeneral(ws, filas, visita, secciones) {
  // Anchos oficiales exactos (Sección 4.4)
  const anchos = [
    12,   // A: Fecha_Visita
    11,   // B: MES
    12,   // C: Codigo_Local
    34,   // D: Nombre_IE
    24,   // E: Nivel
    10,   // F: Modalidad
    9,    // G: UGEL
    6,    // H: RED
    18,   // I: Distrito
    14,   // J: Modelo_Sec_Formacion_Tecnica
    16,   // K: Especialista
    30,   // L: Director_Apellidos_Nombres
    38.4, // M: Director_DNI
    12,   // N: Director_Telefono
    13,   // O: Director_Condicion
    24,   // P: Director_Correo
    9.1,  // Q: CAT_x.1
    8,    // R: CAT_x.2
    13,   // S: CAT_x.3
    13,   // T: CAT_x.4
    13,   // U: CAT_x.5
    11,   // V: RESULTADO
    12,   // W: ESTADO
    13    // X: AVANCE
  ];

  anchos.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const catPrefix = visita === 2 ? 'CAT_6.' : 'CAT_4.';
  const tCatPrefix = visita === 2 ? 'T_6_' : 'T_4_';

  const encabezados = [
    'Fecha_Visita',
    'MES',
    'Codigo_Local',
    'Nombre_IE',
    'Nivel',
    'Modalidad',
    'UGEL',
    'RED',
    'Distrito',
    'Modelo_Sec_Formacion_Tecnica',
    'Especialista',
    'Director_Apellidos_Nombres',
    'Director_DNI',
    'Director_Telefono',
    'Director_Condicion',
    'Director_Correo',
    catPrefix + '1',
    catPrefix + '2',
    catPrefix + '3',
    catPrefix + '4',
    catPrefix + '5',
    'RESULTADO',
    'ESTADO',
    'AVANCE'
  ];

  // Preparar matriz de datos para addTable
  const catColsFormula = [1, 2, 3, 4, 5].map(k => `T_GENERAL[[#This Row],[${catPrefix}${k}]]`).join(',');
  const resultadoFormula = ASPECTO_SIN_RESPUESTA_CUENTA_CERO
    ? `AVERAGE(${catColsFormula})`
    : `IFERROR(AVERAGEIF(T_GENERAL[[#This Row],[${catPrefix}1]:[${catPrefix}5]],">0"),0)`;

  const tableRows = filas.map(f => {
    const rowValues = [
      f.fechaVisita ? f.fechaVisita : null, // A
      { formula: `IF(ISBLANK(T_GENERAL[[#This Row],[Fecha_Visita]]),"",UPPER(TEXT(T_GENERAL[[#This Row],[Fecha_Visita]],"mmmm")))` }, // B
      f.codigoLocal ? String(f.codigoLocal).trim() : '', // C
      f.nombreIE ? String(f.nombreIE).trim() : '', // D
      f.nivel || '', // E
      'EBR', // F
      f.ugel || 'UGEL 03', // G
      f.red ? String(f.red).trim() : '', // H
      f.distrito || '', // I
      f.tieneFicha ? (f.formacionTecnica ? 'Si' : 'No') : null, // J
      f.tieneFicha ? (f.especialista || '') : null, // K
      f.directorNombre || '', // L
      f.directorDni ? String(f.directorDni).trim() : '', // M
      f.directorTelefono ? String(f.directorTelefono).trim() : '', // N
      f.directorCondicion || '', // O
      f.directorCorreo ? String(f.directorCorreo).trim().toLowerCase() : '' // P
    ];

    // Q a U: Fórmulas CAT_x.1 a CAT_x.5 con INDEX/MATCH (Regla 4.2)
    [1, 2, 3, 4, 5].forEach(k => {
      const tblName = tCatPrefix + k;
      rowValues.push({
        formula: `IFERROR(INDEX(${tblName}[Promedio],MATCH(T_GENERAL[[#This Row],[Codigo_Local]],${tblName}[Codigo_Local],0)),0)`
      });
    });

    // V: RESULTADO
    rowValues.push({ formula: resultadoFormula });

    // W: ESTADO
    rowValues.push({
      formula: `IF(T_GENERAL[[#This Row],[RESULTADO]]=0,"NO INICIÓ",IF(T_GENERAL[[#This Row],[RESULTADO]]<=1,"INICIO",IF(T_GENERAL[[#This Row],[RESULTADO]]<=2,"PROCESO",IF(T_GENERAL[[#This Row],[RESULTADO]]<=3,"LOGRADO",""))))`
    });

    // X: AVANCE
    rowValues.push({
      formula: `IF(T_GENERAL[[#This Row],[RESULTADO]]=0,"PENDIENTE","EJECUTADO")`
    });

    return rowValues;
  });

  const lastRow = filas.length + 1;

  // Registrar tabla Excel T_GENERAL desde A1
  ws.addTable({
    name: 'T_GENERAL',
    ref: 'A1',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleLight1',
      showRowStripes: true
    },
    columns: encabezados.map(name => ({ name })),
    rows: tableRows
  });

  // Estilizar encabezado fila 1 (Sección 4.4)
  const row1 = ws.getRow(1);
  row1.height = 30;
  encabezados.forEach((_, i) => {
    const cell = row1.getCell(i + 1);
    cell.font = cellFont(10, true, BLANCO);
    cell.fill = colorFill(AZUL_HEADER);
    cell.alignment = centerAlign(true);
    cell.border = thinBorder(AZUL_HEADER);
  });

  // Estilizar celdas de datos
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    row.height = 20;

    // A: Fecha_Visita
    row.getCell(1).alignment = centerAlign(false);
    row.getCell(1).font = cellFont(10, false);
    row.getCell(1).border = thinBorder();

    // B: MES (Fórmula)
    row.getCell(2).fill = colorFill(GRIS_FONDO);
    row.getCell(2).alignment = centerAlign(false);
    row.getCell(2).font = cellFont(10, false);
    row.getCell(2).border = thinBorder();

    // C: Codigo_Local (Texto)
    row.getCell(3).numFmt = '@';
    row.getCell(3).alignment = centerAlign(false);
    row.getCell(3).font = cellFont(10, false);
    row.getCell(3).border = thinBorder();

    // D: Nombre_IE (Texto)
    row.getCell(4).numFmt = '@';
    row.getCell(4).alignment = leftAlign(false);
    row.getCell(4).font = cellFont(10, false);
    row.getCell(4).border = thinBorder();

    // E: Nivel
    row.getCell(5).alignment = leftAlign(false);
    row.getCell(5).font = cellFont(10, false);
    row.getCell(5).border = thinBorder();

    // F: Modalidad
    row.getCell(6).alignment = centerAlign(false);
    row.getCell(6).font = cellFont(10, false);
    row.getCell(6).border = thinBorder();

    // G: UGEL
    row.getCell(7).alignment = centerAlign(false);
    row.getCell(7).font = cellFont(10, false);
    row.getCell(7).border = thinBorder();

    // H: RED
    row.getCell(8).numFmt = '@';
    row.getCell(8).alignment = centerAlign(false);
    row.getCell(8).font = cellFont(10, false);
    row.getCell(8).border = thinBorder();

    // I: Distrito
    row.getCell(9).alignment = leftAlign(false);
    row.getCell(9).font = cellFont(10, false);
    row.getCell(9).border = thinBorder();

    // J: Modelo_Sec_Formacion_Tecnica
    row.getCell(10).alignment = centerAlign(false);
    row.getCell(10).font = cellFont(10, false);
    row.getCell(10).border = thinBorder();

    // K: Especialista
    row.getCell(11).alignment = leftAlign(false);
    row.getCell(11).font = cellFont(10, false);
    row.getCell(11).border = thinBorder();

    // L: Director_Apellidos_Nombres
    row.getCell(12).alignment = leftAlign(false);
    row.getCell(12).font = cellFont(10, false);
    row.getCell(12).border = thinBorder();

    // M: Director_DNI
    row.getCell(13).numFmt = '@';
    row.getCell(13).alignment = centerAlign(false);
    row.getCell(13).font = cellFont(10, false);
    row.getCell(13).border = thinBorder();

    // N: Director_Telefono
    row.getCell(14).numFmt = '@';
    row.getCell(14).alignment = centerAlign(false);
    row.getCell(14).font = cellFont(10, false);
    row.getCell(14).border = thinBorder();

    // O: Director_Condicion
    row.getCell(15).alignment = centerAlign(false);
    row.getCell(15).font = cellFont(10, false);
    row.getCell(15).border = thinBorder();

    // P: Director_Correo
    row.getCell(16).alignment = leftAlign(false);
    row.getCell(16).font = cellFont(10, false);
    row.getCell(16).border = thinBorder();

    // Q a U: CAT_x.1 a CAT_x.5
    for (let k = 17; k <= 21; k++) {
      const c = row.getCell(k);
      c.numFmt = '0.00';
      c.fill = colorFill(GRIS_FONDO);
      c.alignment = centerAlign(false);
      c.font = cellFont(10, false);
      c.border = thinBorder();
    }

    // V: RESULTADO
    const cV = row.getCell(22);
    cV.numFmt = '0.00';
    cV.fill = colorFill(GRIS_FONDO);
    cV.alignment = centerAlign(false);
    cV.font = cellFont(10, true);
    cV.border = thinBorder();

    // W: ESTADO
    const cW = row.getCell(23);
    cW.fill = colorFill(GRIS_FONDO);
    cW.alignment = centerAlign(false);
    cW.font = cellFont(10, true);
    cW.border = thinBorder();

    // X: AVANCE
    const cX = row.getCell(24);
    cX.fill = colorFill(GRIS_FONDO);
    cX.alignment = centerAlign(false);
    cX.font = cellFont(10, false);
    cX.border = thinBorder();
  }

  // Validaciones de datos en rangos (Regla 4.4)
  ws.dataValidations.add(`F2:F${lastRow}`, {
    type: 'list',
    allowBlank: false,
    formulae: ['"EBR"']
  });

  ws.dataValidations.add(`J2:J${lastRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"Si,No"']
  });

  ws.dataValidations.add(`O2:O${lastRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"Nombrado,Contratado,Encargado,Designado"']
  });

  // Formato condicional en columna W (ESTADO)
  ws.addConditionalFormatting({
    ref: `W2:W${lastRow}`,
    rules: [
      {
        priority: 1,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"NO INICIÓ"'],
        style: {
          fill: colorFill(COLORES_CONDICIONAL_ESTADO['NO INICIÓ'].fondo),
          font: cellFont(10, true, COLORES_CONDICIONAL_ESTADO['NO INICIÓ'].letra)
        }
      },
      {
        priority: 2,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"LOGRADO"'],
        style: {
          fill: colorFill(COLORES_CONDICIONAL_ESTADO['LOGRADO'].fondo),
          font: cellFont(10, true, COLORES_CONDICIONAL_ESTADO['LOGRADO'].letra)
        }
      },
      {
        priority: 3,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"PROCESO"'],
        style: {
          fill: colorFill(COLORES_CONDICIONAL_ESTADO['PROCESO'].fondo),
          font: cellFont(10, true, COLORES_CONDICIONAL_ESTADO['PROCESO'].letra)
        }
      },
      {
        priority: 4,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"INICIO"'],
        style: {
          fill: colorFill(COLORES_CONDICIONAL_ESTADO['INICIO'].fondo),
          font: cellFont(10, true, COLORES_CONDICIONAL_ESTADO['INICIO'].letra)
        }
      }
    ]
  });
}

// ─── Construcción de Hojas CAT_x.y (Aspectos) ────────────────────────────────

function _construirHojaAspecto(ws, sec, tableName, filas, visita, aspectIndex) {
  const items = sec.items || [];
  const numItems = items.length;
  const numCols = 3 + numItems + 2; // Codigo_Local, Nombre_IIEE, items..., Promedio, RED, Observaciones

  // Anchos oficiales (Sección 5)
  ws.getColumn(1).width = 12; // A: Codigo_Local
  ws.getColumn(2).width = 34; // B: Nombre_IIEE
  for (let c = 3; c < 3 + numItems; c++) {
    ws.getColumn(c).width = 11; // Items
  }
  ws.getColumn(3 + numItems).width = 10;     // Promedio
  ws.getColumn(3 + numItems + 1).width = 6;  // RED
  ws.getColumn(3 + numItems + 2).width = 34; // Observaciones

  // Fila 1: Título de la dimensión combinado (exacto, con tildes y mayúsculas)
  const tituloAspecto = visita === 2
    ? (TITULOS_ASPECTOS_V2[sec.codigo] || `${sec.codigo} ${sec.nombre.toUpperCase()}`)
    : (TITULOS_ASPECTOS_V1[sec.codigo] || `${sec.codigo} ${sec.nombre.toUpperCase()}`);

  ws.mergeCells(1, 1, 1, numCols);
  const cTit = ws.getCell(1, 1);
  cTit.value = tituloAspecto;
  cTit.font = cellFont(13, true, BLANCO);
  cTit.fill = colorFill(AZUL_TITULO);
  cTit.alignment = leftAlign(false);
  cTit.border = thinBorder(AZUL_TITULO);
  ws.getRow(1).height = 24;

  // Fila 2: Encabezados de tabla
  const headerCols = ['Codigo_Local', 'Nombre_IIEE'];
  items.forEach((_, idx) => {
    headerCols.push(`ITEM_${sec.codigo}.${idx + 1}`);
  });
  headerCols.push('Promedio', 'RED', 'Observaciones');

  const primerItem = `ITEM_${sec.codigo}.1`;
  const ultimoItem = `ITEM_${sec.codigo}.${numItems}`;

  // Preparar matriz de datos para addTable
  const tableRows = filas.map(f => {
    const rowValues = [
      f.codigoLocal ? String(f.codigoLocal).trim() : '',
      f.nombreIE ? String(f.nombreIE).trim() : ''
    ];

    let obsConsolidadas = [];
    items.forEach(it => {
      const valRaw = f.mapaRespuestas ? (f.mapaRespuestas[it.codigoV] || f.mapaRespuestas[it.codigo] || f.mapaRespuestas['ge' + visita + '_' + it.numFicha] || f.mapaRespuestas['num_' + it.numFicha]) : null;
      const numVal = valorANumericoEbr(valRaw);
      rowValues.push((numVal === 1 || numVal === 2 || numVal === 3) ? numVal : null);

      if (f.mapaObservaciones) {
        const o = f.mapaObservaciones[it.codigoV] || f.mapaObservaciones[it.codigo] || f.mapaObservaciones['ge' + visita + '_' + it.numFicha] || f.mapaObservaciones['num_' + it.numFicha];
        if (o && String(o).trim()) {
          obsConsolidadas.push(`[${it.codigoV || it.numFicha}]: ${String(o).trim()}`);
        }
      }
    });

    // Promedio
    rowValues.push({
      formula: `IFERROR(AVERAGE(${tableName}[[#This Row],[${primerItem}]]:${tableName}[[#This Row],[${ultimoItem}]]),0)`
    });

    // RED
    rowValues.push(f.red ? String(f.red).trim() : '');

    // Observaciones
    rowValues.push(obsConsolidadas.length > 0 ? obsConsolidadas.join(' | ') : null);

    return rowValues;
  });

  const lastRow = filas.length + 2;

  // Registrar tabla Excel T_6_x desde A2
  ws.addTable({
    name: tableName,
    ref: 'A2',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleLight1',
      showRowStripes: true
    },
    columns: headerCols.map(name => ({ name })),
    rows: tableRows
  });

  // Estilizar encabezado fila 2
  const row2 = ws.getRow(2);
  row2.height = 30;
  headerCols.forEach((_, i) => {
    const cell = row2.getCell(i + 1);
    cell.font = cellFont(10, true, BLANCO);
    cell.fill = colorFill(AZUL_HEADER);
    cell.alignment = centerAlign(true);
    cell.border = thinBorder(AZUL_HEADER);

    if (i >= 2 && i < 2 + numItems) {
      const itObj = items[i - 2];
      cell.note = `N.° ${itObj.numFicha || (i - 1)} — ${itObj.texto || ''}`;
    }
  });

  // Estilizar celdas de datos
  for (let r = 3; r <= lastRow; r++) {
    const row = ws.getRow(r);
    row.height = 18;

    // Codigo_Local
    row.getCell(1).numFmt = '@';
    row.getCell(1).fill = colorFill(GRIS_FONDO);
    row.getCell(1).alignment = centerAlign(false);
    row.getCell(1).font = cellFont(10, false);
    row.getCell(1).border = thinBorder();

    // Nombre_IIEE
    row.getCell(2).numFmt = '@';
    row.getCell(2).alignment = leftAlign(false);
    row.getCell(2).font = cellFont(10, false);
    row.getCell(2).border = thinBorder();

    // Items
    for (let c = 3; c < 3 + numItems; c++) {
      const cell = row.getCell(c);
      cell.alignment = centerAlign(false);
      cell.font = cellFont(10, false);
      cell.border = thinBorder();
    }

    // Promedio
    const cProm = row.getCell(3 + numItems);
    cProm.numFmt = '0.00';
    cProm.fill = colorFill(GRIS_FONDO);
    cProm.alignment = centerAlign(false);
    cProm.font = cellFont(10, true);
    cProm.border = thinBorder();

    // RED
    const cRed = row.getCell(3 + numItems + 1);
    cRed.numFmt = '@';
    cRed.fill = colorFill(GRIS_FONDO);
    cRed.alignment = centerAlign(false);
    cRed.font = cellFont(10, false);
    cRed.border = thinBorder();

    // Observaciones
    const cObs = row.getCell(3 + numItems + 2);
    cObs.alignment = leftAlign(true);
    cObs.font = cellFont(9, false);
    cObs.border = thinBorder();
  }

  // Validación de lista 1,2,3 en ítems
  const firstColLetter = _colLetter(3);
  const lastItemColLetter = _colLetter(2 + numItems);
  ws.dataValidations.add(`${firstColLetter}3:${lastItemColLetter}${lastRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: ['"1,2,3"']
  });

  // Formato condicional para valores de ítems (1=rosado, 2=amarillo, 3=verde)
  ws.addConditionalFormatting({
    ref: `${firstColLetter}3:${lastItemColLetter}${lastRow}`,
    rules: [
      {
        priority: 1,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['3'],
        style: {
          fill: colorFill('C6EFCE'),
          font: cellFont(10, false, '006100')
        }
      },
      {
        priority: 2,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['2'],
        style: {
          fill: colorFill('FFEB9C'),
          font: cellFont(10, false, '9C5700')
        }
      },
      {
        priority: 3,
        type: 'cellIs',
        operator: 'equal',
        formulae: ['1'],
        style: {
          fill: colorFill('FFC7CE'),
          font: cellFont(10, false, '9C0006')
        }
      }
    ]
  });
}

// ─── Construcción de Hojas de DOCENTES (Solo Visita 2) ────────────────────────

function _construirHojaDocentes(ws, tableName, momentoKey, filasGenerales, tituloFila1) {
  // Anchos oficiales (Sección 6)
  ws.getColumn(1).width = 12; // A: Codigo_Local
  ws.getColumn(2).width = 30; // B: Nombre_IE
  ws.getColumn(3).width = 12; // C: NIVEL
  ws.getColumn(4).width = 9;  // D: TOTAL_DOCENTES
  ws.getColumn(5).width = 11; // E: DOCENTES_MONITOREADOS
  ws.getColumn(6).width = 11; // F: DOCENTES_NO_MONITOREADOS
  for (let c = 7; c <= 26; c++) {
    ws.getColumn(c).width = 6; // R1_I a R5_IV
  }

  // Fila 1: Título combinado A1:Z1
  ws.mergeCells(1, 1, 1, 26);
  const cTit = ws.getCell(1, 1);
  cTit.value = tituloFila1;
  cTit.font = cellFont(13, true, BLANCO);
  cTit.fill = colorFill(AZUL_TITULO);
  cTit.alignment = leftAlign(false);
  cTit.border = thinBorder(AZUL_TITULO);
  ws.getRow(1).height = 24;

  // Fila 2: Encabezados
  const rubricas = ['R1', 'R2', 'R3', 'R4', 'R5'];
  const nivelesLogro = ['I', 'II', 'III', 'IV'];
  const headers = [
    'Codigo_Local',
    'Nombre_IE',
    'NIVEL',
    'TOTAL_DOCENTES',
    'DOCENTES_MONITOREADOS',
    'DOCENTES_NO_MONITOREADOS'
  ];
  rubricas.forEach(r => {
    nivelesLogro.forEach(l => {
      headers.push(`${r}_${l}`);
    });
  });

  // Preparar matriz de datos para addTable
  const tableRows = [];
  filasGenerales.forEach(f => {
    const docData = f.docentesData ? (f.docentesData[momentoKey] || []) : [];
    const niveles = docData.length > 0
      ? docData
      : _determinarNivelesPorDefecto(f.nivel);

    niveles.forEach(docNivel => {
      const nivelStr = typeof docNivel === 'string' ? docNivel : (docNivel.nivel || 'Primaria');
      const isObject = typeof docNivel === 'object' && docNivel !== null;
      const totalDoc = isObject ? (Number(docNivel.total) || 0) : 0;
      const monitDoc = isObject ? (Number(docNivel.monitoreados) || 0) : 0;

      const rowValues = [
        f.codigoLocal ? String(f.codigoLocal).trim() : '',
        f.nombreIE ? String(f.nombreIE).trim() : '',
        nivelStr,
        totalDoc,
        monitDoc,
        { formula: `${tableName}[[#This Row],[TOTAL_DOCENTES]]-${tableName}[[#This Row],[DOCENTES_MONITOREADOS]]` }
      ];

      rubricas.forEach(rub => {
        const rubArr = isObject && Array.isArray(docNivel[rub]) ? docNivel[rub] : [0, 0, 0, 0];
        [0, 1, 2, 3].forEach(lIdx => {
          rowValues.push(Number(rubArr[lIdx]) || 0);
        });
      });

      tableRows.push(rowValues);
    });
  });

  const lastRow = tableRows.length + 2;

  // Registrar tabla Excel T_DOC1 o T_DOC2 desde A2
  ws.addTable({
    name: tableName,
    ref: 'A2',
    headerRow: true,
    totalsRow: false,
    style: {
      theme: 'TableStyleLight1',
      showRowStripes: true
    },
    columns: headers.map(name => ({ name })),
    rows: tableRows
  });

  // Estilizar encabezado fila 2
  const row2 = ws.getRow(2);
  row2.height = 38.25;
  headers.forEach((_, i) => {
    const cell = row2.getCell(i + 1);
    cell.font = cellFont(9, true, BLANCO);
    cell.alignment = centerAlign(true);

    if (i < 6) {
      cell.fill = colorFill(VERDE_DOC_HEAD);
      cell.border = thinBorder(VERDE_DOC_HEAD);
    } else {
      const rubIdx = Math.floor((i - 6) / 4);
      const rubId = rubricas[rubIdx];
      const colColor = COLOR_RUBRICA[rubId] || VERDE_DOC_HEAD;
      cell.fill = colorFill(colColor);
      cell.border = thinBorder(colColor);
    }
  });

  // Estilizar celdas de datos
  for (let r = 3; r <= lastRow; r++) {
    const row = ws.getRow(r);
    row.height = 18;

    row.getCell(1).numFmt = '@';
    row.getCell(1).alignment = centerAlign(false);
    row.getCell(1).font = cellFont(10, false);
    row.getCell(1).border = thinBorder();

    row.getCell(2).numFmt = '@';
    row.getCell(2).alignment = leftAlign(false);
    row.getCell(2).font = cellFont(10, false);
    row.getCell(2).border = thinBorder();

    row.getCell(3).alignment = centerAlign(false);
    row.getCell(3).font = cellFont(10, false);
    row.getCell(3).border = thinBorder();

    row.getCell(4).numFmt = '0';
    row.getCell(4).alignment = centerAlign(false);
    row.getCell(4).font = cellFont(10, false);
    row.getCell(4).border = thinBorder();

    row.getCell(5).numFmt = '0';
    row.getCell(5).alignment = centerAlign(false);
    row.getCell(5).font = cellFont(10, false);
    row.getCell(5).border = thinBorder();

    row.getCell(6).numFmt = '0';
    row.getCell(6).fill = colorFill(GRIS_FONDO);
    row.getCell(6).alignment = centerAlign(false);
    row.getCell(6).font = cellFont(10, true);
    row.getCell(6).border = thinBorder();

    for (let c = 7; c <= 26; c++) {
      const cell = row.getCell(c);
      cell.numFmt = '0';
      cell.alignment = centerAlign(false);
      cell.font = cellFont(9, false);
      cell.border = thinBorder();
    }
  }
}

// ─── Preparación y Enriquecimiento de Datos ──────────────────────────────────

function _obtenerColegiosEBR(colegios) {
  const lista = colegios || [];
  const ebr = lista.filter(c => {
    const mod = String(c.modalidad || '').toUpperCase().trim();
    if (mod) return mod === 'EBR';
    const ie = String(c.ie || '').toUpperCase();
    if (ie.includes('CEBE') || ie.includes('PRITE') || ie.includes('CEBA') || ie.includes('CETPRO')) return false;
    return true;
  });

  const result = ebr.length > 0 ? ebr : lista;

  return result.sort((a, b) => {
    const redA = String(a.rei || a.red || '').padStart(4, '0');
    const redB = String(b.rei || b.red || '').padStart(4, '0');
    const compRed = redA.localeCompare(redB);
    if (compRed !== 0) return compRed;
    return String(a.ie || '').localeCompare(String(b.ie || ''));
  });
}

function _prepararFilasGenerales(colegiosEbr, submissions, state, visita) {
  return colegiosEbr.map(col => {
    const codLocalCol = String(col.codigoLocal || '').trim();
    const ieNomCol = String(col.ie || '').trim().toLowerCase();

    const sub = submissions.find(s => {
      const codSub = String(s.ie?.codigoLocal || s.codigoLocal || s.codigoModular || '').trim();
      if (codLocalCol && codSub && codLocalCol === codSub) return true;
      if (s.colegioId && col.id && s.colegioId === col.id) return true;
      const ieSub = String(s.institucion || '').trim().toLowerCase();
      return ieNomCol && ieSub && ieNomCol === ieSub;
    });

    const tieneFicha = !!sub;

    const rawPersona = sub ? sub.director : null;
    const personaNorm = normalizarPersona(rawPersona, sub || col, 'director', state);

    const mapaRespuestas = {};
    const mapaObservaciones = {};
    if (sub) {
      const resp = sub.respuestas || sub.items || [];
      if (Array.isArray(resp)) {
        resp.forEach(r => {
          if (r && r.id) {
            mapaRespuestas[r.id] = r.valor;
            if (r.observaciones) mapaObservaciones[r.id] = r.observaciones;
          }
          if (r && r.num) {
            mapaRespuestas['num_' + r.num] = r.valor;
            if (r.observaciones) mapaObservaciones['num_' + r.num] = r.observaciones;
          }
        });
      } else if (typeof resp === 'object') {
        Object.assign(mapaRespuestas, resp);
      }
    }

    return {
      codigoLocal: col.codigoLocal || sub?.ie?.codigoLocal || sub?.codigoLocal || '',
      nombreIE: col.ie || sub?.institucion || '',
      nivel: col.nivel || col.nivelServicio || sub?.nivel || '',
      red: col.rei || col.red || sub?.ie?.red || sub?.red || '',
      distrito: col.distrito || '',
      ugel: col.ugel || sub?.ugel || 'UGEL 03',
      tieneFicha,
      fechaVisita: tieneFicha ? formatearFechaDDMMYYYY(sub.fecha) : '',
      especialista: tieneFicha ? (sub.responsable || sub.monitor || sub.usuarioEmail || '') : '',
      formacionTecnica: tieneFicha ? (sub.ie?.formacionTecnica !== undefined ? sub.ie.formacionTecnica : (sub.formacionTecnica === true)) : false,
      directorNombre: personaNorm.nombres || '',
      directorDni: personaNorm.dni || '',
      directorTelefono: personaNorm.telefono || '',
      directorCondicion: personaNorm.condicion || '',
      directorCorreo: personaNorm.correo ? personaNorm.correo.toLowerCase() : '',
      docentesData: sub?.docentes || null,
      mapaRespuestas,
      mapaObservaciones
    };
  });
}

function _determinarNivelesPorDefecto(nivelTexto) {
  const nt = String(nivelTexto || '').toLowerCase();
  const res = [];
  if (nt.includes('inicial')) res.push({ nivel: 'Inicial', total: 0, monitoreados: 0 });
  if (nt.includes('primaria')) res.push({ nivel: 'Primaria', total: 0, monitoreados: 0 });
  if (nt.includes('secundaria')) res.push({ nivel: 'Secundaria', total: 0, monitoreados: 0 });
  if (res.length === 0) {
    res.push({ nivel: 'Primaria', total: 0, monitoreados: 0 });
  }
  return res;
}

function _colLetter(colNumber) {
  let temp = colNumber;
  let letter = '';
  while (temp > 0) {
    let mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}
