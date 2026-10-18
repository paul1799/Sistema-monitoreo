/* =========================================================================
   directorio/excel.js — Generación y verificación del Excel del Directorio
   UGEL 03 – Panel de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import { COLUMNAS, ANCHOS_COLUMNA } from './constants.js';
import {
  cleanTextCode,
  cleanEmail,
  todayDateStr,
  isPlaceholderDirectivo,
  getDirectivosActivosForColegio
} from './helpers.js';
import { cleanExistingPlaceholderDirectivos } from './sync.js';
import { normalizeReiNumber } from '../ui/core-utils.js';

/**
 * Genera el archivo Excel oficial desde cero con ExcelJS sin cargar ninguna plantilla base.
 * Reproduce exactamente la estructura, estilos, anchos, colores y autofiltro de E2_Directorio_de_Directores_por_IE.
 */
export async function generateDirectorioExcelFile(state, colegiosList, currentUser) {
  if (typeof window.ExcelJS === 'undefined') {
    throw new Error('La librería ExcelJS no está cargada. Verifica tu conexión a internet.');
  }

  // 1. Ejecutar limpieza de cualquier directivo placeholder residual
  if (typeof cleanExistingPlaceholderDirectivos === 'function') {
    try {
      await cleanExistingPlaceholderDirectivos(null, state, currentUser);
    } catch (_) {}
  }

  const ExcelJS = window.ExcelJS;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UGEL 03 - Sistematización de Monitoreo';
  workbook.lastModifiedBy = currentUser?.email || 'UGEL 03';
  workbook.created = new Date();

  // 2. Crear ÚNICA hoja oficial 'I.E.'
  const worksheet = workbook.addWorksheet('I.E.', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      showGridLines: true,
      printTitlesRow: '1:5'
    },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }]
  });

  const activeYear = (state && state.periodoActivo) || '2026';

  // -------------------------------------------------------------
  // FILA 1: Título A1:Q1 (Calibri Light 20, negrita, centrado, FFC000, alto 26.25)
  // -------------------------------------------------------------
  worksheet.mergeCells('A1:Q1');
  const r1 = worksheet.getRow(1);
  r1.height = 26.25;
  const c1 = worksheet.getCell('A1');
  c1.value = `Directorio de los directores de las Instituciones Educativas por REI - UGEL 03 - ${activeYear}`;
  c1.font = { name: 'Calibri Light', size: 20, bold: true, color: { argb: 'FF000000' } };
  c1.alignment = { vertical: 'middle', horizontal: 'center' };
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };

  // -------------------------------------------------------------
  // FILA 2: Vacía (alto 6)
  // -------------------------------------------------------------
  worksheet.getRow(2).height = 6;

  // -------------------------------------------------------------
  // FILA 3: Subtítulos (A3:I3, J3:M3, N3:Q3, Calibri Light 14, negrita, alto 18.75)
  // -------------------------------------------------------------
  worksheet.mergeCells('A3:I3');
  worksheet.mergeCells('J3:M3');
  worksheet.mergeCells('N3:Q3');
  const r3 = worksheet.getRow(3);
  r3.height = 18.75;

  const subIE = worksheet.getCell('A3');
  subIE.value = 'DATOS DE LA I.E.';
  subIE.font = { name: 'Calibri Light', size: 14, bold: true, color: { argb: 'FF000000' } };
  subIE.alignment = { vertical: 'middle', horizontal: 'center' };
  subIE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9DC3E6' } };

  const subDir = worksheet.getCell('J3');
  subDir.value = 'DIRECTOR (A)';
  subDir.font = { name: 'Calibri Light', size: 14, bold: true, color: { argb: 'FF000000' } };
  subDir.alignment = { vertical: 'middle', horizontal: 'center' };
  subDir.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } };

  const subSubdir = worksheet.getCell('N3');
  subSubdir.value = 'SUB - DIRECTOR (A)';
  subSubdir.font = { name: 'Calibri Light', size: 14, bold: true, color: { argb: 'FF000000' } };
  subSubdir.alignment = { vertical: 'middle', horizontal: 'center' };
  subSubdir.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } };

  // -------------------------------------------------------------
  // FILA 4: Vacía (alto 3.75)
  // -------------------------------------------------------------
  worksheet.getRow(4).height = 3.75;

  // -------------------------------------------------------------
  // FILA 5: Encabezados (Calibri Light 12, negrita, alto 47.25)
  // -------------------------------------------------------------
  const r5 = worksheet.getRow(5);
  r5.height = 47.25;

  COLUMNAS.forEach(([_, headerText], idx) => {
    const colNum = idx + 1;
    const cell = r5.getCell(colNum);
    cell.value = headerText;
    cell.font = { name: 'Calibri Light', size: 12, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: (colNum === 10 || colNum === 11) ? 'left' : 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
    };

    if (colNum <= 9) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    } else if (colNum <= 13) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
    }
  });

  // Anchos exactos de columna
  ANCHOS_COLUMNA.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  // -------------------------------------------------------------
  // DEDUPLICAR Y ORDENAR COLEGIOS (UNA FILA POR IE)
  // -------------------------------------------------------------
  const seenKeys = new Set();
  const uniqueColegios = [];

  for (const c of (colegiosList || [])) {
    if (!c) continue;
    const key = cleanTextCode(c.codigoLocal) || cleanTextCode(c.codigoModular) || String(c.id || '');
    if (!key) {
      uniqueColegios.push(c);
      continue;
    }
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueColegios.push(c);
    }
  }

  uniqueColegios.sort((a, b) => {
    const rA = cleanTextCode(a.rei || '');
    const rB = cleanTextCode(b.rei || '');
    const cmpRei = rA.localeCompare(rB, undefined, { numeric: true });
    if (cmpRei !== 0) return cmpRei;
    return (a.ie || '').localeCompare(b.ie || '', undefined, { sensitivity: 'base' });
  });

  // -------------------------------------------------------------
  // FILA 6 EN ADELANTE: DATOS POR IE
  // -------------------------------------------------------------
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };

  uniqueColegios.forEach((c, idx) => {
    const rowIndex = 6 + idx;
    const row = worksheet.getRow(rowIndex);
    row.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };

    const directivos = getDirectivosActivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);
    const dir = directivos.director;
    const subdirs = (directivos.subdirectores || []).filter(s => !isPlaceholderDirectivo(s.apellidosNombres));

    const dirNombres = (dir && !isPlaceholderDirectivo(dir.apellidosNombres)) ? String(dir.apellidosNombres).trim() : '';
    const dirDni = dirNombres ? cleanTextCode(dir.dni) : '';
    const dirTel = dirNombres ? cleanTextCode(dir.telefono) : '';
    const dirCorreo = dirNombres ? cleanEmail(dir.correo) : '';

    const subNombres = subdirs.map(s => String(s.apellidosNombres || '').trim()).join('\n');
    const subDni = subdirs.map(s => cleanTextCode(s.dni)).join('\n');
    const subTel = subdirs.map(s => cleanTextCode(s.telefono)).join('\n');
    const subCorreo = subdirs.map(s => cleanEmail(s.correo)).join('\n');

    const rowObj = {
      rei: normalizeReiNumber(c.rei || c.red) || cleanTextCode(c.rei),
      codigoLocal: cleanTextCode(c.codigoLocal),
      ie: String(c.ie || '').trim(),
      modalidad: String(c.modalidad || '').trim(),
      nivelServicio: String(c.nivelServicio || '').trim(),
      turnos: String(c.turnos || '').trim(),
      tipoGestion: String(c.tipoGestion || '').trim(),
      dependencia: String(c.dependencia || 'UGEL 03').trim(),
      distrito: String(c.distrito || '').trim(),
      dirNombres: dirNombres,
      dirDni: dirDni,
      dirTelefono: dirTel,
      dirCorreo: dirCorreo,
      subNombres: subNombres,
      subDni: subDni,
      subTelefono: subTel,
      subCorreo: subCorreo
    };

    COLUMNAS.forEach(([key], colIdx) => {
      const colNum = colIdx + 1;
      const cell = row.getCell(colNum);
      const val = rowObj[key] !== undefined && rowObj[key] !== null ? String(rowObj[key]) : '';

      cell.value = val;
      cell.numFmt = '@';
      cell.border = thinBorder;

      const shouldWrap = [3, 5, 10, 13, 14, 17].includes(colNum);
      let horiz = 'center';
      if ([3, 10, 13, 14, 17].includes(colNum)) {
        horiz = 'left';
      }

      cell.alignment = {
        vertical: 'middle',
        horizontal: horiz,
        wrapText: shouldWrap
      };
    });
  });

  // Autofiltro en A5:Q{última fila con datos}
  const lastRow = 5 + uniqueColegios.length;
  worksheet.autoFilter = `A5:Q${Math.max(5, lastRow)}`;

  // -------------------------------------------------------------
  // GENERAR BUFFER Y VERIFICACIÓN
  // -------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();

  const verification = verifyDirectorioWorkbook(workbook, uniqueColegios.length, buffer);
  if (!verification.valid) {
    console.error('❌ Error de validación en libro Excel generado:', verification.errors);
    throw new Error('El archivo generado no superó el control de calidad: ' + verification.errors.join('; '));
  } else {
    console.info('✅ Control de calidad superado: 1 hoja I.E., 17 columnas alineadas, sin formatos condicionales corruptos y tipos de texto válidos.');
  }

  // -------------------------------------------------------------
  // DESCARGAR BLOB COMO ARCHIVO .XLSX
  // -------------------------------------------------------------
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Directorio_Directores_IE_UGEL03_${activeYear}_${todayDateStr()}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Verificación automática de control de calidad del libro generado
 */
export function verifyDirectorioWorkbook(workbook, expectedIeCount, exportedBuffer) {
  const errors = [];
  const results = {
    hojasValidas: false,
    sinFormatosCondicionales: false,
    encabezadosValidos: false,
    combinadasValidas: false,
    tiposTextoValidos: false,
    filasCorrectas: false
  };

  // 1. Una sola hoja llamada 'I.E.'
  if (!workbook || !workbook.worksheets || workbook.worksheets.length !== 1) {
    errors.push(`El libro debe tener exactamente 1 hoja, pero tiene ${workbook ? workbook.worksheets.length : 0}`);
  } else if (workbook.worksheets[0].name !== 'I.E.') {
    errors.push(`La hoja debe llamarse 'I.E.', pero se llama '${workbook.worksheets[0].name}'`);
  } else {
    results.hojasValidas = true;
  }

  const ws = workbook ? (workbook.getWorksheet('I.E.') || workbook.worksheets[0]) : null;
  if (!ws) {
    errors.push('No se pudo acceder a la hoja I.E.');
    return { valid: false, errors, results };
  }

  // 2. Sin formatos condicionales
  let hasBadConditionalFormatting = false;
  if (exportedBuffer) {
    try {
      const u8 = new Uint8Array(exportedBuffer);
      let s = '';
      for (let i = 0; i < Math.min(u8.length, 500000); i++) {
        s += String.fromCharCode(u8[i]);
      }
      if (s.includes('<conditionalFormatting') && !s.includes('<cfRule')) {
        hasBadConditionalFormatting = true;
      }
    } catch (_) {}
  }
  if (hasBadConditionalFormatting) {
    errors.push('Se detectó etiqueta <conditionalFormatting> sin <cfRule> en el XML del libro.');
  } else {
    results.sinFormatosCondicionales = true;
  }

  // 3. Fila 5: 17 encabezados exactos en orden
  const expectedHeaders = COLUMNAS.map(c => c[1]);
  const row5 = ws.getRow(5);
  const actualHeaders = [];
  for (let c = 1; c <= 17; c++) {
    actualHeaders.push(String(row5.getCell(c).value || '').trim());
  }
  const headersMatch = expectedHeaders.every((h, i) => h === actualHeaders[i]);
  if (!headersMatch || actualHeaders.length !== 17) {
    errors.push(`Encabezados fila 5 inválidos.\nEsperado: ${expectedHeaders.join(' | ')}\nObtenido: ${actualHeaders.join(' | ')}`);
  } else {
    results.encabezadosValidos = true;
  }

  // 4. Celdas combinadas: A1:Q1, A3:I3, J3:M3, N3:Q3
  const isA1Merged = ws.getCell('A1').isMerged && ws.getCell('Q1').master?.address === 'A1';
  const isA3Merged = ws.getCell('A3').isMerged && ws.getCell('I3').master?.address === 'A3';
  const isJ3Merged = ws.getCell('J3').isMerged && ws.getCell('M3').master?.address === 'J3';
  const isN3Merged = ws.getCell('N3').isMerged && ws.getCell('Q3').master?.address === 'N3';

  if (!isA1Merged || !isA3Merged || !isJ3Merged || !isN3Merged) {
    errors.push(`Celdas combinadas incompletas: A1:Q1 (${isA1Merged}), A3:I3 (${isA3Merged}), J3:M3 (${isJ3Merged}), N3:Q3 (${isN3Merged})`);
  } else {
    results.combinadasValidas = true;
  }

  // 5. Ninguna celda en columnas A, B, K, L, O, P es de tipo número
  const textCols = [1, 2, 11, 12, 15, 16]; // A, B, K, L, O, P
  let numTypeCount = 0;
  for (let r = 6; r <= 5 + expectedIeCount; r++) {
    const row = ws.getRow(r);
    for (const colIdx of textCols) {
      const cell = row.getCell(colIdx);
      if (typeof cell.value === 'number') {
        numTypeCount++;
      }
    }
  }
  if (numTypeCount > 0) {
    errors.push(`Se detectaron ${numTypeCount} celdas numéricas en columnas que deben ser texto (A, B, K, L, O, P).`);
  } else {
    results.tiposTextoValidos = true;
  }

  // 6. Número de filas de datos igual a expectedIeCount, sin códigos repetidos
  const totalDataRows = Math.max(0, ws.rowCount - 5);
  const seenCodes = new Set();
  let duplicateCodes = 0;
  for (let r = 6; r <= ws.rowCount; r++) {
    const code = String(ws.getRow(r).getCell(2).value || '').trim(); // B: Código local
    if (code) {
      if (seenCodes.has(code)) duplicateCodes++;
      seenCodes.add(code);
    }
  }

  if (totalDataRows !== expectedIeCount) {
    errors.push(`Cantidad de filas (${totalDataRows}) no coincide con IEs esperadas (${expectedIeCount})`);
  } else if (duplicateCodes > 0) {
    errors.push(`Se detectaron ${duplicateCodes} códigos locales duplicados en las filas de datos.`);
  } else {
    results.filasCorrectas = true;
  }

  const valid = errors.length === 0;
  return { valid, errors, results };
}
