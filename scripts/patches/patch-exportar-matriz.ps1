# patch-exportar-matriz.ps1
$path = "public\js\exportarMatriz.js"
$content = Get-Content $path -Raw -Encoding UTF8

# 1. Importar obtenerComponentesJec y generarItemsConColumnasJec en línea 16
$oldImport = "import { PALETA_MATRIZ, getMatrizConfig, MAPEO_COLUMNAS_JEC } from './matrizConfig.js?v=20260930_v2';"
$newImport = "import { PALETA_MATRIZ, getMatrizConfig, MAPEO_COLUMNAS_JEC, obtenerComponentesJec, generarItemsConColumnasJec } from './matrizConfig.js?v=20260930_v2';"
if ($content.Contains($oldImport)) {
  $content = $content.Replace($oldImport, $newImport)
  Write-Host "Importación de matrizConfig actualizada" -ForegroundColor Green
}

# 2. Agregar parseDateOnlyToUtcDate y normalizarSiNoNa
$markerDate = "export const parseDateForExcel = formatDateOnlyForExcel;"
$helpersToAdd = @'
export const parseDateForExcel = formatDateOnlyForExcel;

/**
 * Convierte un valor de fecha a objeto Date en UTC medianoche para ExcelJS.
 * De esta forma ExcelJS lo serializa como fecha real de Excel sin hora ni desfase horario.
 * @param {*} dateVal
 * @returns {Date|null}
 */
export function parseDateOnlyToUtcDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return new Date(Date.UTC(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate(), 0, 0, 0));
  }
  const s = String(dateVal).trim();
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) {
    return new Date(Date.UTC(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10), 0, 0, 0));
  }
  const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mSlash) {
    return new Date(Date.UTC(parseInt(mSlash[3], 10), parseInt(mSlash[2], 10) - 1, parseInt(mSlash[1], 10), 0, 0, 0));
  }
  const dParsed = new Date(s);
  if (!isNaN(dParsed.getTime())) {
    return new Date(Date.UTC(dParsed.getFullYear(), dParsed.getMonth(), dParsed.getDate(), 0, 0, 0));
  }
  return null;
}

/**
 * Normaliza un valor de indicador con opciones SI / NO / N/A
 * - "SI", "Sí", "si", "sí", true, 1, "cumple" -> "SI"
 * - "NO", "no", false, 0, "no cumple" -> "NO"
 * - "N/A", "NA", "na", "no aplica", null explícito de no aplica -> "N/A"
 * - Vacío / no respondido -> ""
 * @param {*} rawVal
 * @returns {string} "SI" | "NO" | "N/A" | ""
 */
export function normalizarSiNoNa(rawVal) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  if (typeof rawVal === 'object') {
    const inner = rawVal.valor !== undefined ? rawVal.valor : (rawVal.value !== undefined ? rawVal.value : rawVal.score);
    if (inner !== undefined) return normalizarSiNoNa(inner);
    return '';
  }
  const s = String(rawVal).trim().toUpperCase();
  if (s === '') return '';
  if (s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1' || s === 'CUMPLE' || s === 'C') return 'SI';
  if (s === 'NO' || s === 'FALSE' || s === '0' || s === 'NO CUMPLE' || s === 'NC' || s === 'N') return 'NO';
  if (s === 'N/A' || s === 'NA' || s === 'NO APLICA' || s === 'NOAPLICA') return 'N/A';
  return '';
}
'@

if ($content.Contains($markerDate) -and -not $content.Contains("parseDateOnlyToUtcDate")) {
  $content = $content.Replace($markerDate, $helpersToAdd)
  Write-Host "Helpers parseDateOnlyToUtcDate y normalizarSiNoNa agregados" -ForegroundColor Green
}

# 3. Bifurcar en exportarMatrizSeguimiento entre _construirHojaMatrizJec y _construirHojaMatriz
$oldCall = @'
    _construirHojaMatriz(ws, config, itemsList, state);

    if (sheetName === 'MODELO JEC' || isFichaJec(currentFt)) {
      hasJecSheet = true;
      jecItemsList = itemsList;
    }
'@

$newCall = @'
    if (sheetName === 'MODELO JEC' || isFichaJec(currentFt)) {
      _construirHojaMatrizJec(ws, config, itemsList, state);
      hasJecSheet = true;
      jecItemsList = itemsList;
    } else {
      _construirHojaMatriz(ws, config, itemsList, state);
    }
'@

if ($content.Contains($oldCall)) {
  $content = $content.Replace($oldCall, $newCall)
  Write-Host "Llamada a _construirHojaMatrizJec bifurcada" -ForegroundColor Green
} else {
  # Regex fallback
  $patternCall = '(?s)_construirHojaMatriz\(ws,\s*config,\s*itemsList,\s*state\);\s*if\s*\(sheetName\s*===\s*''MODELO JEC''\s*\|\|\s*isFichaJec\(currentFt\)\)\s*\{\s*hasJecSheet\s*=\s*true;\s*jecItemsList\s*=\s*itemsList;\s*\}'
  $content = [System.Text.RegularExpressions.Regex]::Replace($content, $patternCall, $newCall)
  Write-Host "Llamada a _construirHojaMatrizJec bifurcada con regex" -ForegroundColor Green
}

# 4. Actualizar wsListas con N/A
$oldListas = @'
  wsListas.getCell('B2').value = 'SI';
  wsListas.getCell('B3').value = 'NO';
  wsListas.getCell('B6').value = 1;
'@
$newListas = @'
  wsListas.getCell('B2').value = 'SI';
  wsListas.getCell('B3').value = 'NO';
  wsListas.getCell('B4').value = 'N/A';
  wsListas.getCell('B6').value = 1;
'@
if ($content.Contains($oldListas)) {
  $content = $content.Replace($oldListas, $newListas)
  Write-Host "Hoja Listas actualizada con N/A" -ForegroundColor Green
}

# 5. Actualizar manejo de fecha en _construirHojaMatriz (para no escribir texto '@')
$oldDateBuild = @'
      } else if (campo.isDate) {
        const fecStr = formatDateOnlyForExcel(val);
        setSafeCellValue(cCell, fecStr, campo.key, colToLetter(campo.colIndex));
        cCell.numFmt = '@';
        cCell.alignment = { horizontal: 'center', vertical: 'middle' };
'@
$newDateBuild = @'
      } else if (campo.isDate) {
        const dObj = parseDateOnlyToUtcDate(val);
        if (dObj) {
          cCell.value = dObj;
          cCell.numFmt = 'dd/mm/yyyy';
        } else {
          cCell.value = '';
        }
        cCell.alignment = { horizontal: 'center', vertical: 'middle' };
'@
if ($content.Contains($oldDateBuild)) {
  $content = $content.Replace($oldDateBuild, $newDateBuild)
  Write-Host "Manejo de fecha como fecha real en _construirHojaMatriz actualizado" -ForegroundColor Green
}

# 6. Insertar función _construirHojaMatrizJec
$jecFunction = @'

/**
 * Dibuja la estructura y fórmulas de la hoja "MODELO JEC" según la estructura REAL del sistema:
 * - 3 Componentes oficiales: Pedagógico (9), Gestión (11), Soporte (11) = 31 indicadores
 * - Opciones de respuesta: SI, NO, N/A (sin escala 1-2-3 ni conversión inventada)
 * - Fórmulas de % CUMPLIMIENTO por componente (=IFERROR(SI/(SI+NO),""))
 * - % Cumplimiento General por IIEE (sobre los 31 indicadores)
 * - Nivel de Implementación por IIEE según regla oficial:
 *     24 a 31 Sí -> "Implementación lograda"
 *     12 a 23 Sí -> "Implementación parcial"
 *     0 a 11 Sí  -> "Implementación incipiente"
 * - Bloque de estadística con filas Sí (Cumple), No (No cumple), N/A (No aplica), Total, % Cumple, % No cumple
 * - Cuadro RESULTADO oficial por niveles con fórmulas COUNTIF
 * - Cuadro CUMPLIMIENTO POR COMPONENTE con el % agregado y estado
 */
function _construirHojaMatrizJec(ws, config, itemsList, state) {
  // 1. Alturas de filas de cabecera
  ws.getRow(1).height = 30;
  ws.getRow(2).height = 20.25;
  ws.getRow(3).height = 177.75;

  let currentCol = 1;

  // ─── BLOQUE 1: I. DATOS GENERALES DE LA IE ───
  const colA = currentCol; // N°
  const datosGenCols = config.datosGeneralesCampos || [];
  const colNro = colA;
  const colInicioDG = colA;
  const colFinDG = colA + datosGenCols.length; // Col A (N°) + campos

  // Título Nivel 1-2 combinado I. DATOS GENERALES
  ws.mergeCells(1, colInicioDG, 2, colFinDG);
  const cellDG = ws.getCell(1, colInicioDG);
  cellDG.value = 'I. DATOS GENERALES DE LA IE';
  styleMergedRange(ws, colInicioDG, 1, colFinDG, 2, {
    font: { name: 'Arial', size: 14, bold: true, color: { argb: '000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.datosGeneralesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  // Fila 3: Columna N° (Col A) rotada 90°
  const cellNro = ws.getCell(3, colNro);
  cellNro.value = 'N°';
  cellNro.font = { name: 'Arial', size: 10, bold: true };
  cellNro.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.datosGeneralesSubheader } };
  cellNro.alignment = { horizontal: 'center', vertical: 'middle', textRotation: 90 };
  cellNro.border = BORDER_THIN_BLACK;
  ws.getColumn(colNro).width = 5.57;
  currentCol++;

  // Fila 3: Campos de Datos Generales
  datosGenCols.forEach(campo => {
    const colIdx = currentCol;
    const cCell = ws.getCell(3, colIdx);
    cCell.value = campo.header;
    cCell.font = { name: 'Arial', size: 10, bold: true };
    cCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.datosGeneralesSubheader } };
    cCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cCell.border = BORDER_THIN_BLACK;
    ws.getColumn(colIdx).width = campo.width || 12;
    campo.colIndex = colIdx;
    currentCol++;
  });

  // ─── BLOQUE 2 & 3: PERSONAS (Director y Subdirector) ───
  const bloquesPersonas = config.bloquesPersonas || [];
  bloquesPersonas.forEach(bPersona => {
    const pCampos = bPersona.campos || [];
    const pStartCol = currentCol;
    const pEndCol = currentCol + pCampos.length - 1;

    ws.mergeCells(1, pStartCol, 2, pEndCol);
    const pTitleCell = ws.getCell(1, pStartCol);
    pTitleCell.value = bPersona.titulo;
    styleMergedRange(ws, pStartCol, 1, pEndCol, 2, {
      font: { name: 'Arial', size: 16, bold: true, color: { argb: '000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bPersona.fillHeader || PALETA_MATRIZ.persona1Header } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: BORDER_THIN_BLACK
    });

    pCampos.forEach(c => {
      const colIdx = currentCol;
      const cell = ws.getCell(3, colIdx);
      cell.value = c.header;
      cell.font = { name: 'Arial', size: 10, bold: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bPersona.fillSubheader || PALETA_MATRIZ.persona1Subheader } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = BORDER_THIN_BLACK;
      ws.getColumn(colIdx).width = c.width || 14;
      c.colIndex = colIdx;
      currentCol++;
    });

    bPersona.startCol = pStartCol;
    bPersona.endCol = pEndCol;
  });

  // ─── BLOQUE 5: COLUMNA SEPARADORA GRIS (Col W) ───
  const colSeparadora = currentCol;
  ws.getColumn(colSeparadora).width = 11;
  for (let r = 1; r <= 3; r++) {
    const sCell = ws.getCell(r, colSeparadora);
    sCell.value = '';
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.separadorGris } };
    sCell.border = BORDER_THIN_BLACK;
  }
  currentCol++;

  // ─── BLOQUE 6, 7, 8: 3 COMPONENTES DEL SISTEMA ───
  const componentes = config.componentes || obtenerComponentesJec();
  
  // Paletas de color por componente según especificación:
  // 1: Verde (Pedagógico): título y % #A9D18E, filas 2-3 #E2F0D9
  // 2: Lila (Gestión): título #DEBDFF, % #C496DE, filas 2-3 #E8D1FF
  // 3: Naranja (Soporte): título y % #F8CBAD, filas 2-3 #FBE5D6
  const paletasComponentes = [
    { header1: 'A9D18E', header23: 'E2F0D9', pctHeader: 'A9D18E' },
    { header1: 'DEBDFF', header23: 'E8D1FF', pctHeader: 'C496DE' },
    { header1: 'F8CBAD', header23: 'FBE5D6', pctHeader: 'F8CBAD' },
    { header1: '94F0FA', header23: 'CBF8FD', pctHeader: '94F0FA' },
    { header1: 'FFD966', header23: 'FFF2CC', pctHeader: 'FFD966' }
  ];

  const compsMeta = [];

  componentes.forEach((comp, compIdx) => {
    const paleta = paletasComponentes[compIdx % paletasComponentes.length];
    const cStartCol = currentCol;
    const cEndCol = currentCol + comp.items.length - 1;

    // Fila 1: Título del Componente
    ws.mergeCells(1, cStartCol, 1, cEndCol);
    const cTitleCell = ws.getCell(1, cStartCol);
    cTitleCell.value = comp.nombre;
    styleMergedRange(ws, cStartCol, 1, cEndCol, 1, {
      font: { name: 'Arial', size: 12, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header1 } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: BORDER_THIN_BLACK
    });

    // Filas 2 y 3 para cada indicador
    comp.items.forEach((it, itIdx) => {
      const itCol = currentCol;
      it.colIndex = itCol;
      it.colLetra = colToLetter(itCol);

      // Fila 2: Número correlativo (1..9, 1..11, 1..11 o 01..31 según sistema)
      const cellN = ws.getCell(2, itCol);
      cellN.value = it.num || String(it.numero || (itIdx + 1)).padStart(2, '0');
      cellN.font = { name: 'Arial', size: 11, bold: true };
      cellN.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header23 } };
      cellN.alignment = { horizontal: 'center', vertical: 'middle' };
      cellN.border = BORDER_THIN_BLACK;

      // Fila 3: Texto del indicador rotado 90°
      const cellT = ws.getCell(3, itCol);
      cellT.value = it.texto;
      cellT.font = { name: 'Arial', size: it.texto.length > 200 ? 9.5 : 10 };
      cellT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header23 } };
      cellT.alignment = { horizontal: 'left', vertical: 'middle', textRotation: 90, wrapText: true };
      cellT.border = BORDER_THIN_BLACK;

      ws.getColumn(itCol).width = 11.5;
      currentCol++;
    });

    // Columna % CUMPLIMIENTO del componente (reemplaza PUNTAJE)
    const colPct = currentCol;
    ws.mergeCells(1, colPct, 3, colPct);
    const cellPctHeader = ws.getCell(1, colPct);
    cellPctHeader.value = '% CUMPLIMIENTO';
    styleMergedRange(ws, colPct, 1, colPct, 3, {
      font: { name: 'Arial', size: 11, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.pctHeader } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: BORDER_THIN_BLACK
    });
    ws.getColumn(colPct).width = 12.0;

    compsMeta.push({
      comp,
      startCol: cStartCol,
      endCol: cEndCol,
      startColLetra: colToLetter(cStartCol),
      endColLetra: colToLetter(cEndCol),
      colPct: colPct,
      colPctLetra: colToLetter(colPct),
      paleta
    });

    currentCol++;
  });

  // ─── BLOQUE 9: OBSERVACIONES / RECOMENDACIONES ───
  const colObs = currentCol;
  ws.mergeCells(1, colObs, 3, colObs);
  const cellObs = ws.getCell(1, colObs);
  cellObs.value = 'OBSERVACIONES / RECOMENDACIONES';
  styleMergedRange(ws, colObs, 1, colObs, 3, {
    font: { name: 'Arial', size: 16, bold: false },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.finalesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: BORDER_THIN_BLACK
  });
  ws.getColumn(colObs).width = 44.5;
  currentCol++;

  // ─── BLOQUE 10: COMPROMISO ───
  const colComp = currentCol;
  ws.mergeCells(1, colComp, 3, colComp);
  const cellComp = ws.getCell(1, colComp);
  cellComp.value = 'COMPROMISO';
  styleMergedRange(ws, colComp, 1, colComp, 3, {
    font: { name: 'Arial', size: 16, bold: false },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.finalesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: BORDER_THIN_BLACK
  });
  ws.getColumn(colComp).width = 44.3;
  currentCol++;

  // ─── BLOQUE 11: % Cumplimiento General por IIEE ───
  const colPctGeneral = currentCol;
  ws.mergeCells(1, colPctGeneral, 3, colPctGeneral);
  const cellGen = ws.getCell(1, colPctGeneral);
  cellGen.value = '% Cumplimiento General por IIEE';
  styleMergedRange(ws, colPctGeneral, 1, colPctGeneral, 3, {
    font: { name: 'Arial', size: 16, bold: false },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.finalesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: BORDER_THIN_BLACK
  });
  ws.getColumn(colPctGeneral).width = 16.5;
  currentCol++;

  // ─── BLOQUE 12: Nivel de Implementación por IIEE ───
  const colNivel = currentCol;
  ws.mergeCells(1, colNivel, 3, colNivel);
  const cellNiv = ws.getCell(1, colNivel);
  cellNiv.value = 'Nivel de Implementación por IIEE';
  styleMergedRange(ws, colNivel, 1, colNivel, 3, {
    font: { name: 'Arial', size: 16, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.finalesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: BORDER_THIN_BLACK
  });
  ws.getColumn(colNivel).width = 18.0;
  currentCol++;

  // 4 columnas vacías antes del Cuadro RESULTADO
  for (let emptyC = 0; emptyC < 4; emptyC++) {
    ws.getColumn(currentCol).width = 6.0;
    currentCol++;
  }

  // ─── BLOQUE 13: CUADROS RESULTADO Y CUMPLIMIENTO POR COMPONENTE ───
  const colRes1 = currentCol;
  const colRes2 = currentCol + 1;
  const colRes3 = currentCol + 2;
  ws.getColumn(colRes1).width = 28.9;
  ws.getColumn(colRes2).width = 13.0;
  ws.getColumn(colRes3).width = 13.0;

  // =========================================================================
  // LLENADO DE DATOS (Filas 4 a dN)
  // =========================================================================
  const d1 = 4;
  const totalRegistros = itemsList.length;
  const dN = d1 + totalRegistros - 1;

  const coverageStats = {
    totalRows: totalRegistros,
    director: { conNombre: 0, faltaDni: 0, faltaTelefono: 0, faltaCondicion: 0, faltaCorreo: 0, completos: 0, sinDatos: 0 },
    bloque2: { cargoLabel: 'Subdirector(a)', conNombre: 0, faltaDni: 0, faltaTelefono: 0, faltaCondicion: 0, faltaCorreo: 0, completos: 0, sinDatos: 0 }
  };

  itemsList.forEach((rowItem, idx) => {
    const r = d1 + idx;
    const row = ws.getRow(r);
    row.height = 23.25;

    const s = rowItem.s || {};

    // Columna N° (Col A)
    const cN = row.getCell(colNro);
    cN.value = idx + 1;
    cN.font = { name: 'Arial', size: 12 };
    cN.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.datosGeneralesColA } };
    cN.alignment = { horizontal: 'center', vertical: 'middle' };
    cN.border = BORDER_THIN;

    // Campos de Datos Generales
    datosGenCols.forEach(campo => {
      const cCell = row.getCell(campo.colIndex);
      let val = _obtenerValorDatoGeneral(s, campo.key, state);

      if (campo.key === 'institucion') {
        setSafeCellValue(cCell, val ? String(val) : '', campo.key, colToLetter(campo.colIndex));
        cCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else if (campo.key === 'codigoModular') {
        const codModStr = val ? String(val).trim().padStart(7, '0') : '';
        setSafeCellValue(cCell, codModStr, campo.key, colToLetter(campo.colIndex));
        cCell.numFmt = '@';
        cCell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (campo.key === 'ugel') {
        setSafeCellValue(cCell, val ? String(val) : 'UGEL 03', campo.key, colToLetter(campo.colIndex));
        cCell.numFmt = '@';
        cCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      } else if (campo.isDate) {
        // Fecha real de Excel sin desfase UTC ni formato texto
        const dObj = parseDateOnlyToUtcDate(val);
        if (dObj) {
          cCell.value = dObj;
          cCell.numFmt = 'dd/mm/yyyy';
        } else {
          cCell.value = '';
        }
        cCell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (campo.isText) {
        setSafeCellValue(cCell, val ? String(val) : '', campo.key, colToLetter(campo.colIndex));
        cCell.numFmt = '@';
        cCell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (campo.isSiNo) {
        const siNoVal = _normalizarSiNo(val);
        setSafeCellValue(cCell, siNoVal, campo.key, colToLetter(campo.colIndex));
        cCell.alignment = { horizontal: 'center', vertical: 'middle' };
        cCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"SI,NO"']
        };
      } else {
        const numVal = (val !== null && val !== undefined && val !== '') ? (isNaN(val) ? val : Number(val)) : '';
        setSafeCellValue(cCell, numVal, campo.key, colToLetter(campo.colIndex));
        cCell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      cCell.font = { name: 'Arial', size: 12 };
      cCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.datosGeneralesData } };
      cCell.border = BORDER_THIN;
    });

    // Personas (Director y Subdirector)
    bloquesPersonas.forEach((bPersona, bIdx) => {
      const cargo = bIdx === 0 ? 'director' : 'subdirector';
      let rawPersonaVal = null;
      if (cargo === 'director') {
        rawPersonaVal = s.director !== undefined ? s.director : (s.directorNombre || s.dirNombre || null);
      } else {
        rawPersonaVal = s.subdirectores || s.subDirector || s.subdirector || s.subNombre || null;
      }

      const personaNorm = normalizarPersona(rawPersonaVal, s, cargo, state);

      const statTarget = (bIdx === 0) ? coverageStats.director : coverageStats.bloque2;
      if (personaNorm.nombres && !isPlaceholderPersona(personaNorm.nombres)) {
        statTarget.conNombre++;
        if (!personaNorm.dni) statTarget.faltaDni++;
        if (!personaNorm.telefono) statTarget.faltaTelefono++;
        if (!personaNorm.condicion) statTarget.faltaCondicion++;
        if (!personaNorm.correo) statTarget.faltaCorreo++;
        if (personaNorm.dni && personaNorm.telefono && personaNorm.condicion && personaNorm.correo) {
          statTarget.completos++;
        }
      } else {
        statTarget.sinDatos++;
      }

      (bPersona.campos || []).forEach(c => {
        const cCell = row.getCell(c.colIndex);
        let valFinal = '';
        let isDniOrTel = false;

        const lKey = c.key.toLowerCase();
        if (lKey.includes('nombre')) {
          valFinal = personaNorm.nombres;
        } else if (lKey.includes('dni')) {
          valFinal = personaNorm.dni;
          isDniOrTel = true;
        } else if (lKey.includes('tel') || lKey.includes('cel')) {
          valFinal = personaNorm.telefono;
          isDniOrTel = true;
        } else if (lKey.includes('condicion')) {
          valFinal = personaNorm.condicion;
        } else if (lKey.includes('correo') || lKey.includes('email')) {
          valFinal = personaNorm.correo;
        } else {
          valFinal = _obtenerValorPersona(s, c.key, state);
        }

        setSafeCellValue(cCell, valFinal || '', c.key, colToLetter(c.colIndex));
        if (isDniOrTel) {
          cCell.numFmt = '@';
          cCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else if (lKey.includes('condicion')) {
          cCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        } else {
          cCell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
        }

        cCell.font = { name: 'Arial', size: 12 };
        if (bPersona.fillData) {
          cCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bPersona.fillData } };
        }
        cCell.border = BORDER_THIN;
      });
    });

    // Columna Separadora en datos (Col W)
    const sepCell = row.getCell(colSeparadora);
    sepCell.value = '';
    sepCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.separadorGris } };
    sepCell.border = BORDER_THIN;

    // Componentes del sistema: Valores SI/NO/N/A y fórmula de % CUMPLIMIENTO
    compsMeta.forEach(cm => {
      cm.comp.items.forEach(it => {
        const itCell = row.getCell(it.colIndex);
        const rawResp = _obtenerRespuestaItem(s, it);
        const valNorm = normalizarSiNoNa(rawResp);

        setSafeCellValue(itCell, valNorm, it.id || it.num, it.colLetra);
        itCell.font = { name: 'Arial', size: 12 };
        itCell.alignment = { horizontal: 'center', vertical: 'middle' };
        itCell.border = BORDER_THIN;
        itCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"SI,NO,N/A"']
        };
      });

      // Celda % CUMPLIMIENTO del componente para la fila r
      const pctCell = row.getCell(cm.colPct);
      pctCell.value = {
        formula: `IFERROR(COUNTIF(${cm.startColLetra}${r}:${cm.endColLetra}${r},"SI")/(COUNTIF(${cm.startColLetra}${r}:${cm.endColLetra}${r},"SI")+COUNTIF(${cm.startColLetra}${r}:${cm.endColLetra}${r},"NO")),"")`
      };
      pctCell.font = { name: 'Arial', size: 12, bold: true };
      pctCell.alignment = { horizontal: 'center', vertical: 'middle' };
      pctCell.numFmt = '0%';
      pctCell.border = BORDER_THIN;
    });

    // Observaciones / Recomendaciones
    const obsCell = row.getCell(colObs);
    const obsText = formatObservaciones(s);
    setSafeCellValue(obsCell, obsText, 'observaciones', colToLetter(colObs));
    obsCell.font = { name: 'Arial', size: 11 };
    obsCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    obsCell.border = BORDER_THIN;

    // Compromisos
    const compCell = row.getCell(colComp);
    const compText = formatCompromisos(s);
    setSafeCellValue(compCell, compText, 'compromisos', colToLetter(colComp));
    compCell.font = { name: 'Arial', size: 11 };
    compCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    compCell.border = BORDER_THIN;

    // % Cumplimiento General por IIEE (Col BH) sobre los 31 indicadores
    const genCell = row.getCell(colPctGeneral);
    const countSiExpr = compsMeta.map(cm => `COUNTIF(${cm.startColLetra}${r}:${cm.endColLetra}${r},"SI")`).join('+');
    const countTotalExpr = compsMeta.map(cm => `COUNTIF(${cm.startColLetra}${r}:${cm.endColLetra}${r},"SI")+COUNTIF(${cm.startColLetra}${r}:${cm.endColLetra}${r},"NO")`).join('+');
    genCell.value = {
      formula: `IFERROR((${countSiExpr})/(${countTotalExpr}),"")`
    };
    genCell.font = { name: 'Arial', size: 16, bold: true };
    genCell.alignment = { horizontal: 'center', vertical: 'middle' };
    genCell.numFmt = '0%';
    genCell.border = BORDER_THIN;

    // Nivel de Implementación por IIEE (Col BI) según regla oficial (conteo de Sí: >=24 Lograda, >=12 Parcial, Incipiente)
    const nivelCell = row.getCell(colNivel);
    const genColLetra = colToLetter(colPctGeneral);
    nivelCell.value = {
      formula: `IF(${genColLetra}${r}="","",IF((${countSiExpr})>=24,"Implementación lograda",IF((${countSiExpr})>=12,"Implementación parcial","Implementación incipiente")))`
    };
    nivelCell.font = { name: 'Arial', size: 14, bold: true };
    nivelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.nivelData } };
    nivelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nivelCell.border = BORDER_THIN;
  });

  // ─── FORMATOS CONDICIONALES PARA CELDAS DE INDICADORES (SI, NO, N/A) ───
  compsMeta.forEach(cm => {
    const compRange = `${cm.startColLetra}${d1}:${cm.endColLetra}${dN}`;
    ws.addConditionalFormatting({
      ref: compRange,
      rules: [
        {
          type: 'cellIs',
          operator: 'equal',
          formulae: ['"SI"'],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'C6EFCE' } },
            font: { color: { argb: '1A7F37' }, bold: true }
          }
        },
        {
          type: 'cellIs',
          operator: 'equal',
          formulae: ['"NO"'],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC7CE' } },
            font: { color: { argb: 'C0392B' }, bold: true }
          }
        },
        {
          type: 'cellIs',
          operator: 'equal',
          formulae: ['"N/A"'],
          style: {
            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'E7E6E6' } },
            font: { color: { argb: '6B7280' } }
          }
        }
      ]
    });
  });

  // ─── FORMATO CONDICIONAL PARA COLUMNA NIVEL (Col BI, D1:DN) ───
  const colNivelLetter = colToLetter(colNivel);
  const nivelRange = `${colNivelLetter}${d1}:${colNivelLetter}${dN}`;
  ws.addConditionalFormatting({
    ref: nivelRange,
    rules: [
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"Implementación lograda"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalLogrado } } }
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"Implementación parcial"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalProceso } } }
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"Implementación incipiente"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalInicio } } }
      }
    ]
  });

  // =========================================================================
  // BLOQUE DE ESTADÍSTICA (Filas dN+1 a dN+7)
  // =========================================================================
  const sRow1 = dN + 1; // Sí (Cumple)
  const sRow2 = dN + 2; // No (No cumple)
  const sRow3 = dN + 3; // N/A (No aplica)
  const sRow4 = dN + 4; // Total
  const sRow5 = dN + 5; // (vacía)
  const sRow6 = dN + 6; // % Cumple
  const sRow7 = dN + 7; // % No cumple

  ws.getRow(sRow1).height = 27.75;
  ws.getRow(sRow2).height = 27.75;
  ws.getRow(sRow3).height = 27.75;
  ws.getRow(sRow4).height = 31.5;
  ws.getRow(sRow5).height = 15;
  ws.getRow(sRow6).height = 27.0;
  ws.getRow(sRow7).height = 27.0;

  // Bloque %TOTAL combinado a la izquierda (Cols A hasta anterior a Col W)
  const colFinTotalLabel = colSeparadora - 1;
  if (colFinTotalLabel >= colA) {
    ws.mergeCells(sRow1, colA, sRow4, colFinTotalLabel);
    const cellTotalLbl = ws.getCell(sRow1, colA);
    cellTotalLbl.value = '%TOTAL';
    styleMergedRange(ws, colA, sRow1, colFinTotalLabel, sRow4, {
      font: { name: 'Arial', size: 14, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statTotalLabel } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: BORDER_THIN
    });
  }

  // Etiquetas oficiales en la columna separadora gris (Col W)
  const etiquetasStat = [
    { row: sRow1, text: 'Sí (Cumple)' },
    { row: sRow2, text: 'No (No cumple)' },
    { row: sRow3, text: 'N/A (No aplica)' },
    { row: sRow4, text: 'Total' },
    { row: sRow6, text: '% Cumple' },
    { row: sRow7, text: '% No cumple' }
  ];

  etiquetasStat.forEach(e => {
    const cell = ws.getCell(e.row, colSeparadora);
    cell.value = e.text;
    cell.font = { name: 'Arial', size: 11, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statSiNoLabel } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = BORDER_THIN;
  });

  // Fórmulas para cada indicador de cada componente
  compsMeta.forEach(cm => {
    cm.comp.items.forEach(it => {
      const itCol = it.colIndex;
      const itLetter = it.colLetra;

      // Fila sRow1: Sí (Cumple)
      const cSi = ws.getCell(sRow1, itCol);
      cSi.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},"SI")` };
      cSi.font = { name: 'Arial', size: 12 };
      cSi.alignment = { horizontal: 'center', vertical: 'middle' };
      cSi.border = BORDER_THIN;

      // Fila sRow2: No (No cumple)
      const cNo = ws.getCell(sRow2, itCol);
      cNo.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},"NO")` };
      cNo.font = { name: 'Arial', size: 12 };
      cNo.alignment = { horizontal: 'center', vertical: 'middle' };
      cNo.border = BORDER_THIN;

      // Fila sRow3: N/A (No aplica)
      const cNa = ws.getCell(sRow3, itCol);
      cNa.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},"N/A")` };
      cNa.font = { name: 'Arial', size: 12 };
      cNa.alignment = { horizontal: 'center', vertical: 'middle' };
      cNa.border = BORDER_THIN;

      // Fila sRow4: Total
      const cTot = ws.getCell(sRow4, itCol);
      cTot.value = { formula: `SUM(${itLetter}${sRow1}:${itLetter}${sRow3})` };
      cTot.font = { name: 'Arial', size: 12, bold: true };
      cTot.alignment = { horizontal: 'center', vertical: 'middle' };
      cTot.border = BORDER_THIN;

      // Fila sRow6: % Cumple (=IFERROR(Sí/(Sí+No),0))
      const cPctC = ws.getCell(sRow6, itCol);
      cPctC.value = { formula: `IFERROR(${itLetter}${sRow1}/(${itLetter}${sRow1}+${itLetter}${sRow2}),0)` };
      cPctC.font = { name: 'Arial', size: 12, bold: true };
      cPctC.alignment = { horizontal: 'center', vertical: 'middle' };
      cPctC.numFmt = '0%';
      cPctC.border = BORDER_THIN;

      // Fila sRow7: % No cumple (=IFERROR(No/(Sí+No),0))
      const cPctNc = ws.getCell(sRow7, itCol);
      cPctNc.value = { formula: `IFERROR(${itLetter}${sRow2}/(${itLetter}${sRow1}+${itLetter}${sRow2}),0)` };
      cPctNc.font = { name: 'Arial', size: 12, bold: true };
      cPctNc.alignment = { horizontal: 'center', vertical: 'middle' };
      cPctNc.numFmt = '0%';
      cPctNc.border = BORDER_THIN;
    });

    // En la columna % CUMPLIMIENTO del componente:
    // Fila sRow6 (% Cumple): % agregado del componente para todas las IE exportadas
    const cAgregado = ws.getCell(sRow6, cm.colPct);
    cAgregado.value = {
      formula: `IFERROR(COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"SI")/(COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"SI")+COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"NO")),0)`
    };
    cAgregado.font = { name: 'Arial', size: 12, bold: true };
    cAgregado.alignment = { horizontal: 'center', vertical: 'middle' };
    cAgregado.numFmt = '0%';
    cAgregado.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.pctHeader } };
    cAgregado.border = BORDER_THIN;

    // Fila sRow7 (% No cumple)
    const cAgregadoNc = ws.getCell(sRow7, cm.colPct);
    cAgregadoNc.value = {
      formula: `IFERROR(COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"NO")/(COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"SI")+COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"NO")),0)`
    };
    cAgregadoNc.font = { name: 'Arial', size: 12, bold: true };
    cAgregadoNc.alignment = { horizontal: 'center', vertical: 'middle' };
    cAgregadoNc.numFmt = '0%';
    cAgregadoNc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.pctHeader } };
    cAgregadoNc.border = BORDER_THIN;
  });

  // En la columna % Cumplimiento General por IIEE (Col BH) en sRow6:
  const cGenAgregado = ws.getCell(sRow6, colPctGeneral);
  const countAllSi = compsMeta.map(cm => `COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"SI")`).join('+');
  const countAllTot = compsMeta.map(cm => `COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"SI")+COUNTIF(${cm.startColLetra}$${d1}:${cm.endColLetra}$${dN},"NO")`).join('+');
  cGenAgregado.value = {
    formula: `IFERROR((${countAllSi})/(${countAllTot}),0)`
  };
  cGenAgregado.font = { name: 'Arial', size: 14, bold: true };
  cGenAgregado.alignment = { horizontal: 'center', vertical: 'middle' };
  cGenAgregado.numFmt = '0%';
  cGenAgregado.border = BORDER_THIN;

  // =========================================================================
  // BLOQUE 14: CUADRO RESULTADO (Filas 4 a 8) & CUMPLIMIENTO (Filas 10 a 14)
  // =========================================================================
  
  // ─── CUADRO 1: RESULTADO POR NIVEL DE IMPLEMENTACIÓN (Filas 4 a 8) ───
  ws.mergeCells(4, colRes1, 4, colRes3);
  const cellResH = ws.getCell(4, colRes1);
  cellResH.value = 'RESULTADO';
  styleMergedRange(ws, colRes1, 4, colRes3, 4, {
    font: { name: 'Arial', size: 12, bold: true, color: { argb: PALETA_MATRIZ.resultadoHeaderFont } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.resultadoHeader } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  const nivelesJec = [
    { row: 5, label: 'Implementación incipiente', color: PALETA_MATRIZ.resultadoInicio },
    { row: 6, label: 'Implementación parcial', color: PALETA_MATRIZ.resultadoProceso },
    { row: 7, label: 'Implementación lograda', color: PALETA_MATRIZ.resultadoLogrado }
  ];

  nivelesJec.forEach(n => {
    // Col BN: Etiqueta del nivel
    const cLbl = ws.getCell(n.row, colRes1);
    cLbl.value = n.label;
    cLbl.font = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
    cLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: n.color } };
    cLbl.alignment = { horizontal: 'left', vertical: 'middle' };
    cLbl.border = BORDER_THIN;

    // Col BO: Cantidad (conteo dinámico sobre la columna Nivel)
    const cCant = ws.getCell(n.row, colRes2);
    cCant.value = { formula: `COUNTIF(${colNivelLetter}$${d1}:${colNivelLetter}$${dN},"${n.label}")` };
    cCant.font = { name: 'Arial', size: 11, bold: true };
    cCant.alignment = { horizontal: 'center', vertical: 'middle' };
    cCant.border = BORDER_THIN;

    // Col BP: Porcentaje
    const cPct = ws.getCell(n.row, colRes3);
    const boLetra = colToLetter(colRes2);
    cPct.value = { formula: `IFERROR(${boLetra}${n.row}/SUM(${boLetra}$5:${boLetra}$7),0)` };
    cPct.font = { name: 'Arial', size: 11, bold: true };
    cPct.alignment = { horizontal: 'center', vertical: 'middle' };
    cPct.numFmt = '0%';
    cPct.border = BORDER_THIN;
  });

  // Fila 8: TOTAL
  const cTotLbl = ws.getCell(8, colRes1);
  cTotLbl.value = 'TOTAL';
  cTotLbl.font = { name: 'Arial', size: 11, bold: true };
  cTotLbl.alignment = { horizontal: 'center', vertical: 'middle' };
  cTotLbl.border = BORDER_THIN;

  const boLetter = colToLetter(colRes2);
  const bpLetter = colToLetter(colRes3);

  const cTotCant = ws.getCell(8, colRes2);
  cTotCant.value = { formula: `SUM(${boLetter}5:${boLetter}7)` };
  cTotCant.font = { name: 'Arial', size: 11, bold: true };
  cTotCant.alignment = { horizontal: 'center', vertical: 'middle' };
  cTotCant.border = BORDER_THIN;

  const cTotPct = ws.getCell(8, colRes3);
  cTotPct.value = { formula: `SUM(${bpLetter}5:${bpLetter}7)` };
  cTotPct.font = { name: 'Arial', size: 11, bold: true };
  cTotPct.alignment = { horizontal: 'center', vertical: 'middle' };
  cTotPct.numFmt = '0%';
  cTotPct.border = BORDER_THIN;

  // ─── CUADRO 2: CUMPLIMIENTO POR COMPONENTE (Filas 10 a 14) ───
  ws.mergeCells(10, colRes1, 10, colRes3);
  const cellCompH = ws.getCell(10, colRes1);
  cellCompH.value = 'CUMPLIMIENTO POR COMPONENTE';
  styleMergedRange(ws, colRes1, 10, colRes3, 10, {
    font: { name: 'Arial', size: 11, bold: true, color: { argb: PALETA_MATRIZ.resultadoHeaderFont } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.resultadoHeader } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  compsMeta.forEach((cm, idx) => {
    const rowIdx = 11 + idx;
    const cNom = ws.getCell(rowIdx, colRes1);
    cNom.value = cm.comp.nombre;
    cNom.font = { name: 'Arial', size: 9.5, bold: true };
    cNom.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cm.paleta.header1 } };
    cNom.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    cNom.border = BORDER_THIN;

    const cVal = ws.getCell(rowIdx, colRes2);
    cVal.value = { formula: `${cm.colPctLetra}${sRow6}` };
    cVal.font = { name: 'Arial', size: 11, bold: true };
    cVal.alignment = { horizontal: 'center', vertical: 'middle' };
    cVal.numFmt = '0%';
    cVal.border = BORDER_THIN;

    const cEst = ws.getCell(rowIdx, colRes3);
    const valRef = `${boLetter}${rowIdx}`;
    cEst.value = {
      formula: `IF(${valRef}="","",IF(${valRef}>=0.75,"Implementación lograda",IF(${valRef}>=0.4,"Implementación parcial","Implementación incipiente")))`
    };
    cEst.font = { name: 'Arial', size: 10, bold: true };
    cEst.alignment = { horizontal: 'center', vertical: 'middle' };
    cEst.border = BORDER_THIN;
  });

  // Fila 14: Cumplimiento GENERAL
  const rowGenIdx = 11 + compsMeta.length;
  const cGenNom = ws.getCell(rowGenIdx, colRes1);
  cGenNom.value = 'GENERAL';
  cGenNom.font = { name: 'Arial', size: 10, bold: true };
  cGenNom.alignment = { horizontal: 'center', vertical: 'middle' };
  cGenNom.border = BORDER_THIN;

  const cGenVal = ws.getCell(rowGenIdx, colRes2);
  const genPctLetra = colToLetter(colPctGeneral);
  cGenVal.value = { formula: `${genPctLetra}${sRow6}` };
  cGenVal.font = { name: 'Arial', size: 11, bold: true };
  cGenVal.alignment = { horizontal: 'center', vertical: 'middle' };
  cGenVal.numFmt = '0%';
  cGenVal.border = BORDER_THIN;

  const cGenEst = ws.getCell(rowGenIdx, colRes3);
  const genValRef = `${boLetter}${rowGenIdx}`;
  cGenEst.value = {
    formula: `IF(${genValRef}="","",IF(${genValRef}>=0.75,"Implementación lograda",IF(${genValRef}>=0.4,"Implementación parcial","Implementación incipiente")))`
  };
  cGenEst.font = { name: 'Arial', size: 10, bold: true };
  cGenEst.alignment = { horizontal: 'center', vertical: 'middle' };
  cGenEst.border = BORDER_THIN;
}
'@

$markerHoja = "function _construirHojaMatriz(ws, config, itemsList, state) {"
# Insertar _construirHojaMatrizJec justo antes de _construirHojaMatriz o justo después
if (-not $content.Contains("function _construirHojaMatrizJec(")) {
  $content = $content.Replace($markerHoja, $jecFunction + "`r`n`r`n" + $markerHoja)
  Write-Host "Función _construirHojaMatrizJec agregada" -ForegroundColor Green
}

Set-Content -Path $path -Value $content -Encoding UTF8
Write-Host "exportarMatriz.js actualizado exitosamente" -ForegroundColor Cyan
