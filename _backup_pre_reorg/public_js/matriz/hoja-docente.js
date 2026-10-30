/* =========================================================================
   matriz/hoja-docente.js — Generador de la hoja MONITOREO DOCENTE JEC
   para la Matriz de Seguimiento oficial en Excel.
   ========================================================================= */

import { BORDER_THIN, BORDER_THIN_BLACK, styleMergedRange, colToLetter } from './estilos.js';
import { formatDateOnlyForExcel, _normRei, _buscarEnExtras, setSafeCellValue } from './format-helpers.js';

/**
 * Construye la hoja complementaria "MONITOREO DOCENTE JEC"
 * Exporta la tabla de monitoreo docente por momentos (1er y 2do momento),
 * rúbricas R1 a R5 desglosadas por niveles I a IV, porcentajes de avance y totales.
 *
 * @param {Object} ws - Hoja de trabajo ExcelJS
 * @param {Array} itemsList - Lista de registros
 * @param {Object} state - Estado global
 */
export function _construirHojaMonitoreoDocente(ws, itemsList, state) {
  ws.getRow(1).height = 28;
  ws.getRow(2).height = 24;

  // ─── CABECERAS FILA 1 (Agrupadores con colores oficiales) ───
  // A1:J1: DATOS GENERALES DEL MONITOREO DOCENTE
  ws.mergeCells(1, 1, 1, 10);
  const cGen = ws.getCell(1, 1);
  cGen.value = 'DATOS GENERALES DEL MONITOREO DOCENTE';
  styleMergedRange(ws, 1, 1, 10, 1, {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: '000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B4C7E7' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  // Rúbricas R1 a R5 (4 columnas cada una: Nivel I, II, III, IV)
  const rubricasDef = [
    { id: 'R1', start: 11, end: 14, title: 'R1: Involucra activamente a los estudiantes en el proceso de aprendizaje', fill: 'A9D18E' },
    { id: 'R2', start: 15, end: 18, title: 'R2: Promueve el razonamiento, la creatividad y/o el pensamiento crítico', fill: 'DEBDFF' },
    { id: 'R3', start: 19, end: 22, title: 'R3: Evalúa el progreso de los aprendizajes para retroalimentar y adecuar la enseñanza', fill: 'F8CBAD' },
    { id: 'R4', start: 23, end: 26, title: 'R4: Propicia un ambiente de respeto y proximidad', fill: '94F0FA' },
    { id: 'R5', start: 27, end: 30, title: 'R5: Regula positivamente el comportamiento de los estudiantes', fill: 'FFD966' }
  ];

  rubricasDef.forEach(rDef => {
    ws.mergeCells(1, rDef.start, 1, rDef.end);
    const cRub = ws.getCell(1, rDef.start);
    cRub.value = rDef.title;
    styleMergedRange(ws, rDef.start, 1, rDef.end, 1, {
      font: { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: rDef.fill } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: BORDER_THIN_BLACK
    });
  });

  // AE1:AG1: DATOS COMPLEMENTARIOS
  ws.mergeCells(1, 31, 1, 33);
  const cComp = ws.getCell(1, 31);
  cComp.value = 'DATOS COMPLEMENTARIOS';
  styleMergedRange(ws, 31, 1, 33, 1, {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: '000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B4C7E7' } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  // ─── CABECERAS FILA 2 (Subcabeceras individuales con relleno #DAE3F3) ───
  const subheaders = [
    { col: 1, text: 'N°', width: 6.0 },
    { col: 2, text: 'Institución Educativa', width: 34.0 },
    { col: 3, text: 'Código Modular', width: 14.0 },
    { col: 4, text: 'RED', width: 10.0 },
    { col: 5, text: 'Fecha', width: 13.0 },
    { col: 6, text: 'Momento', width: 18.0 },
    { col: 7, text: 'Total docentes', width: 14.0 },
    { col: 8, text: 'Monitoreados', width: 14.0 },
    { col: 9, text: 'No monitoreados', width: 15.0 },
    { col: 10, text: '% avance', width: 12.0 },
    // R1
    { col: 11, text: 'Nivel I', width: 9.0 },
    { col: 12, text: 'Nivel II', width: 9.0 },
    { col: 13, text: 'Nivel III', width: 9.0 },
    { col: 14, text: 'Nivel IV', width: 9.0 },
    // R2
    { col: 15, text: 'Nivel I', width: 9.0 },
    { col: 16, text: 'Nivel II', width: 9.0 },
    { col: 17, text: 'Nivel III', width: 9.0 },
    { col: 18, text: 'Nivel IV', width: 9.0 },
    // R3
    { col: 19, text: 'Nivel I', width: 9.0 },
    { col: 20, text: 'Nivel II', width: 9.0 },
    { col: 21, text: 'Nivel III', width: 9.0 },
    { col: 22, text: 'Nivel IV', width: 9.0 },
    // R4
    { col: 23, text: 'Nivel I', width: 9.0 },
    { col: 24, text: 'Nivel II', width: 9.0 },
    { col: 25, text: 'Nivel III', width: 9.0 },
    { col: 26, text: 'Nivel IV', width: 9.0 },
    // R5
    { col: 27, text: 'Nivel I', width: 9.0 },
    { col: 28, text: 'Nivel II', width: 9.0 },
    { col: 29, text: 'Nivel III', width: 9.0 },
    { col: 30, text: 'Nivel IV', width: 9.0 },
    // Complementarios
    { col: 31, text: '% Avance Inicio (Ítem 12)', width: 18.0 },
    { col: 32, text: '% Avance Diagnóstico (Ítem 23)', width: 18.0 },
    { col: 33, text: 'Especialista Monitor(a)', width: 30.0 }
  ];

  subheaders.forEach(sh => {
    const c = ws.getCell(2, sh.col);
    c.value = sh.text;
    c.font = { name: 'Arial', size: 9.5, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAE3F3' } };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = BORDER_THIN_BLACK;
    ws.getColumn(sh.col).width = sh.width;
  });

  // ─── LLENADO DE FILAS DE DATOS (Una por IE y Momento) ───
  let currentRow = 3;
  let filaSeq = 1;

  itemsList.forEach(item => {
    const s = item.s || {};
    const instNom = s.institucion || s.nombreIe || (typeof s.ie === 'string' ? s.ie : (s.ie && s.ie.nombre) ? s.ie.nombre : '') || '';
    const codMod = s.codigoModular || s.codModular || (s.ie && s.ie.codigoModular) || '';
    const red = _normRei(s.red || s.rei || (s.ie && s.ie.red) || (s.ie && s.ie.rei) || '');
    const fechaStr = formatDateOnlyForExcel(s.fecha);
    const espNom = s.responsable || s.especialista || '';

    // Extraer porcentajes ítems 12 y 23 si existen
    let pctInicio = _buscarEnExtras(s, ['porcentaje de avance del monitoreo de inicio', 'avance inicio', 'porcentaje inicio']);
    let pctDiag = _buscarEnExtras(s, ['porcentaje de avance del monitoreo de diagnóstico', 'avance diagnostico', 'porcentaje diagnostico']);

    // Extraer datos de monitoreo docente
    const docData = s.docentes || s.docentes_monitoreo || s.docentesMonitoreo || {};
    const momentos = [
      { key: 'momento1', label: '1er Monitoreo (Inicio)' },
      { key: 'momento2', label: '2do Monitoreo (Proceso)' }
    ];

    momentos.forEach((mObj) => {
      const row = ws.getRow(currentRow);
      row.height = 21;

      // Obtener datos del momento
      let mData = docData[mObj.key];
      if (!mData && docData.m1 && mObj.key === 'momento1') mData = docData.m1;
      if (!mData && docData.m2 && mObj.key === 'momento2') mData = docData.m2;
      mData = mData || {};

      const totDoc = mData.total !== undefined && mData.total !== '' ? Number(mData.total) : (mData.total_docentes !== undefined ? Number(mData.total_docentes) : '');
      const monDoc = mData.monitoreados !== undefined && mData.monitoreados !== '' ? Number(mData.monitoreados) : (mData.docentes_monitoreados !== undefined ? Number(mData.docentes_monitoreados) : '');
      let noMonDoc = mData.noMonitoreados !== undefined && mData.noMonitoreados !== '' ? Number(mData.noMonitoreados) : (mData.docentes_no_monitoreados !== undefined ? Number(mData.docentes_no_monitoreados) : '');
      if (noMonDoc === '' && totDoc !== '' && monDoc !== '') {
        noMonDoc = Math.max(0, totDoc - monDoc);
      }

      // Columnas 1-6
      setSafeCellValue(row.getCell(1), filaSeq, 'num', 'A');
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };

      setSafeCellValue(row.getCell(2), instNom, 'ie', 'B');
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      setSafeCellValue(row.getCell(3), codMod ? String(codMod).padStart(7, '0') : '', 'codMod', 'C');
      row.getCell(3).numFmt = '@';
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };

      setSafeCellValue(row.getCell(4), red, 'red', 'D');
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };

      setSafeCellValue(row.getCell(5), fechaStr, 'fecha', 'E');
      row.getCell(5).numFmt = '@';
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };

      setSafeCellValue(row.getCell(6), mObj.label, 'momento', 'F');
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      // Columnas 7-10 (Totales y % avance)
      setSafeCellValue(row.getCell(7), totDoc, 'totDoc', 'G');
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      if (totDoc !== '') row.getCell(7).numFmt = '0';

      setSafeCellValue(row.getCell(8), monDoc, 'monDoc', 'H');
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
      if (monDoc !== '') row.getCell(8).numFmt = '0';

      setSafeCellValue(row.getCell(9), noMonDoc, 'noMonDoc', 'I');
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      if (noMonDoc !== '') row.getCell(9).numFmt = '0';

      // % avance formula
      row.getCell(10).value = { formula: `IFERROR(H${currentRow}/G${currentRow},0)` };
      row.getCell(10).numFmt = '0%';
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      // Rúbricas R1 a R5 (4 niveles cada una)
      const rubrosKeys = ['R1', 'R2', 'R3', 'R4', 'R5'];
      let rColIndex = 11;

      rubrosKeys.forEach(rKey => {
        const lowerKey = rKey.toLowerCase();
        const rVal = mData[rKey] || mData[lowerKey] || ['', '', '', ''];
        [0, 1, 2, 3].forEach(lvlIdx => {
          let lvlVal = '';
          if (Array.isArray(rVal)) {
            lvlVal = rVal[lvlIdx];
          } else if (typeof rVal === 'object' && rVal !== null) {
            lvlVal = rVal[`c${lvlIdx + 1}`] ?? rVal[lvlIdx];
          }
          const numLvl = (lvlVal !== null && lvlVal !== undefined && lvlVal !== '') ? Number(lvlVal) : '';
          const cell = row.getCell(rColIndex);
          setSafeCellValue(cell, (!isNaN(numLvl) && numLvl !== '') ? numLvl : '', `${rKey}_${lvlIdx}`, colToLetter(rColIndex));
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          if (numLvl !== '') cell.numFmt = '0';
          rColIndex++;
        });
      });

      // Complementarios (Cols 31-33)
      setSafeCellValue(row.getCell(31), pctInicio || '', 'pctInicio', 'AE');
      row.getCell(31).alignment = { horizontal: 'center', vertical: 'middle' };

      setSafeCellValue(row.getCell(32), pctDiag || '', 'pctDiag', 'AF');
      row.getCell(32).alignment = { horizontal: 'center', vertical: 'middle' };

      setSafeCellValue(row.getCell(33), espNom, 'especialista', 'AG');
      row.getCell(33).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      // Aplicar estilos a todas las celdas de la fila
      for (let c = 1; c <= 33; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 10 };
        cell.border = BORDER_THIN;
      }

      currentRow++;
      filaSeq++;
    });
  });

  const lastDataRow = currentRow - 1;

  // ─── FILA DE TOTALES GENERALES (SUM) ───
  const rTot = currentRow;
  ws.getRow(rTot).height = 24;
  ws.mergeCells(rTot, 1, rTot, 6);
  const cTotLbl = ws.getCell(rTot, 1);
  cTotLbl.value = 'TOTALES GENERALES';
  styleMergedRange(ws, 1, rTot, 6, rTot, {
    font: { name: 'Arial', size: 10, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAE3F3' } },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  // SUM para G, H, I
  ['G', 'H', 'I'].forEach((colLet, idx) => {
    const colIdx = 7 + idx;
    const c = ws.getCell(rTot, colIdx);
    c.value = { formula: `SUM(${colLet}3:${colLet}${lastDataRow})` };
    c.font = { name: 'Arial', size: 10, bold: true };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAE3F3' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.numFmt = '0';
    c.border = BORDER_THIN_BLACK;
  });

  // % avance total
  const cAvTot = ws.getCell(rTot, 10);
  cAvTot.value = { formula: `IFERROR(H${rTot}/G${rTot},0)` };
  cAvTot.font = { name: 'Arial', size: 10, bold: true };
  cAvTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAE3F3' } };
  cAvTot.alignment = { horizontal: 'center', vertical: 'middle' };
  cAvTot.numFmt = '0%';
  cAvTot.border = BORDER_THIN_BLACK;

  // SUM para R1 a R5 (Cols 11 a 30)
  for (let c = 11; c <= 30; c++) {
    const letCol = colToLetter(c);
    const cell = ws.getCell(rTot, c);
    cell.value = { formula: `SUM(${letCol}3:${letCol}${lastDataRow})` };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAE3F3' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.numFmt = '0';
    cell.border = BORDER_THIN_BLACK;
  }

  // Celdas vacías complementarias en fila de totales
  for (let c = 31; c <= 33; c++) {
    const cell = ws.getCell(rTot, c);
    cell.value = '';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DAE3F3' } };
    cell.border = BORDER_THIN_BLACK;
  }

  currentRow++;

  // ─── FILA DE % POR NIVEL SOBRE EL TOTAL MONITOREADOS ───
  const rPct = currentRow;
  ws.getRow(rPct).height = 24;
  ws.mergeCells(rPct, 1, rPct, 10);
  const cPctLbl = ws.getCell(rPct, 1);
  cPctLbl.value = '% POR NIVEL (SOBRE TOTAL MONITOREADOS)';
  styleMergedRange(ws, 1, rPct, 10, rPct, {
    font: { name: 'Arial', size: 10, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2F0D9' } },
    alignment: { horizontal: 'right', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  // Porcentaje para cada columna de nivel de rúbrica (Cols 11 a 30)
  for (let c = 11; c <= 30; c++) {
    const letCol = colToLetter(c);
    const cell = ws.getCell(rPct, c);
    cell.value = { formula: `IFERROR(${letCol}${rTot}/$H$${rTot},0)` };
    cell.font = { name: 'Arial', size: 10, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2F0D9' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.numFmt = '0.0%';
    cell.border = BORDER_THIN_BLACK;
  }

  for (let c = 31; c <= 33; c++) {
    const cell = ws.getCell(rPct, c);
    cell.value = '';
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2F0D9' } };
    cell.border = BORDER_THIN_BLACK;
  }
}
