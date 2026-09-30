/* =========================================================================
   exportarMatriz.js — Generador genérico de exportación a Excel (.xlsx)
   con el formato de la MATRIZ DE SEGUIMIENTO 2026 (UGEL 03 · AGEBRE)
   
   Reproduce fielmente el formato de la plantilla oficial:
   - Cabeceras multinivel agrupadas con rotación a 90°
   - Colores oficiales por aspecto y datos
   - Fórmulas de Excel en tiempo real: SUM, COUNTIF, IFERROR, IF
   - Validaciones de lista SI/NO y 1,2,3 conectadas a hoja oculta Listas
   - Formato condicional de Nivel (Inicio rosado, Proceso naranja, Logrado verde)
   - Bloque completo de estadística con etiquetas y porcentajes
   - Cuadro RESULTADO oficial
   - Inmovilización de paneles en A4 y zoom al 70%
   ========================================================================= */

import { PALETA_MATRIZ, getMatrizConfig, MAPEO_COLUMNAS_JEC, obtenerComponentesJec, generarItemsConColumnasJec } from './matrizConfig.js?v=20260930_v4';
import { isFichaJec, isFichaCoordTutoriaJec, isFichaCoordPedagogico } from './calcEngine.js?v=20260928_v12';

/**
 * Convierte un número de columna 1-indexado a letra de columna Excel (1 -> A, 28 -> AB, etc.)
 * @param {number} colIndex 
 * @returns {string}
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
 * Estilo de borde fino uniforme para celdas
 */
const BORDER_THIN = {
  top: { style: 'thin', color: { argb: 'D9D9D9' } },
  left: { style: 'thin', color: { argb: 'D9D9D9' } },
  bottom: { style: 'thin', color: { argb: 'D9D9D9' } },
  right: { style: 'thin', color: { argb: 'D9D9D9' } }
};

const BORDER_THIN_BLACK = {
  top: { style: 'thin', color: { argb: '000000' } },
  left: { style: 'thin', color: { argb: '000000' } },
  bottom: { style: 'thin', color: { argb: '000000' } },
  right: { style: 'thin', color: { argb: '000000' } }
};

/**
 * Aplica estilos y bordes a un rango combinado
 */
function styleMergedRange(ws, startCol, startRow, endCol, endRow, styleObj) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      if (styleObj.font) cell.font = styleObj.font;
      if (styleObj.fill) cell.fill = styleObj.fill;
      if (styleObj.alignment) cell.alignment = styleObj.alignment;
      if (styleObj.border) cell.border = styleObj.border;
      if (styleObj.numFmt) cell.numFmt = styleObj.numFmt;
    }
  }
}

/**
 * Normaliza y formatea una fecha estrictamente a DD/MM/YYYY local (sin hora ni desface UTC)
 * @param {*} dateVal
 * @returns {string}
 */
export function formatDateOnlyForExcel(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const day = String(dateVal.getDate()).padStart(2, '0');
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const year = dateVal.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const s = String(dateVal).trim();
  // Formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) {
    const day = mIso[3].padStart(2, '0');
    const month = mIso[2].padStart(2, '0');
    const year = mIso[1];
    return `${day}/${month}/${year}`;
  }
  // Formato DD/MM/YYYY
  const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mSlash) {
    const day = mSlash[1].padStart(2, '0');
    const month = mSlash[2].padStart(2, '0');
    const year = mSlash[3];
    return `${day}/${month}/${year}`;
  }
  return s;
}

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
 * - "SI", "SÃ­", "si", "sÃ­", true, 1, "cumple" -> "SI"
 * - "NO", "no", false, 0, "no cumple" -> "NO"
 * - "N/A", "NA", "na", "no aplica", null explÃ­cito de no aplica -> "N/A"
 * - VacÃ­o / no respondido -> ""
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
  if (s === 'SI' || s === 'SÃ' || s === 'TRUE' || s === '1' || s === 'CUMPLE' || s === 'C') return 'SI';
  if (s === 'NO' || s === 'FALSE' || s === '0' || s === 'NO CUMPLE' || s === 'NC' || s === 'N') return 'NO';
  if (s === 'N/A' || s === 'NA' || s === 'NO APLICA' || s === 'NOAPLICA') return 'N/A';
  return '';
}

/**
 * Normaliza un valor de ítem con escala 1-2-3 (Aspectos 02 a 05)
 * Reglas:
 * 1, "1", "Inicio", "INICIO", "I", "no" -> 1
 * 2, "2", "Proceso", "PROCESO", "P" -> 2
 * 3, "3", "Logrado", "LOGRADO", "L", "si", "sí" -> 3
 * Objeto { valor: 3 } -> 3
 * Vacío / no respondido -> '' (nunca 0)
 * @param {*} rawVal
 * @returns {number|string} 1, 2, 3 o ''
 */
export function normalizarEscala1_3(rawVal) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  if (typeof rawVal === 'object') {
    const inner = rawVal.valor !== undefined ? rawVal.valor : (rawVal.value !== undefined ? rawVal.value : rawVal.score);
    if (inner !== undefined) return normalizarEscala1_3(inner);
    return '';
  }

  const s = String(rawVal).trim().toUpperCase();
  if (s === '') return '';

  if (s === '1') return 1;
  if (s === '2') return 2;
  if (s === '3') return 3;

  if (s === 'INICIO' || s === 'I' || s === 'NO CUMPLE' || s === 'NO') return 1;
  if (s === 'PROCESO' || s === 'P' || s === 'EN PROCESO' || s === 'CUMPLE PARCIALMENTE') return 2;
  if (s === 'LOGRADO' || s === 'L' || s === 'LOGRADA' || s === 'CUMPLE' || s === 'SI' || s === 'SÍ') return 3;

  const num = Number(s);
  if (!isNaN(num) && (num === 1 || num === 2 || num === 3)) {
    return num;
  }

  return '';
}

/**
 * Protección general para celdas: evita que objetos, arreglos o strings JSON
 * se escriban directamente en las celdas del libro de Excel.
 * @param {Object} cell - Celda de ExcelJS
 * @param {*} value - Valor a escribir
 * @param {string} cellKey - Identificador del campo o ítem
 * @param {string} colLetter - Letra de la columna
 */
export function setSafeCellValue(cell, value, cellKey = '', colLetter = '') {
  if (value === null || value === undefined) {
    cell.value = '';
    return;
  }
  // Permitir objetos de fórmula de Excel { formula: '...' }
  if (typeof value === 'object' && value.formula) {
    cell.value = value;
    return;
  }
  // Si es un objeto Date válido
  if (value instanceof Date && !isNaN(value.getTime())) {
    cell.value = value;
    return;
  }
  // Si es un objeto o array no permitido
  if (typeof value === 'object' || Array.isArray(value)) {
    console.warn(`[Exportar Matriz] Celda protegida: se evitó escribir objeto/arreglo en Columna ${colLetter} (clave: "${cellKey}"). Celda dejada vacía.`);
    cell.value = '';
    return;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      console.warn(`[Exportar Matriz] Celda protegida: se evitó escribir string JSON en Columna ${colLetter} (clave: "${cellKey}"). Celda dejada vacía.`);
      cell.value = '';
      return;
    }
  }
  cell.value = value;
}

/**
 * Mapea y une las observaciones de la ficha en el orden oficial:
 * 1. Observación general de cierre si existe.
 * 2. Observaciones o hallazgos por ítem o por aspecto (Aspecto 02: ... · etc.)
 * @param {Object} s - Submission
 * @returns {string}
 */
export function formatObservaciones(s) {
  if (!s) return '';
  const lines = [];

  // 1. Observación general de cierre si existe
  if (s.observaciones && typeof s.observaciones === 'string' && s.observaciones.trim()) {
    lines.push(s.observaciones.trim());
  }

  // 2. Observaciones o hallazgos por ítem o por aspecto
  const obsItems = s.observacionesItems || s.hallazgos || {};
  if (typeof obsItems === 'object' && !Array.isArray(obsItems)) {
    for (const [k, val] of Object.entries(obsItems)) {
      if (val && typeof val === 'string' && val.trim()) {
        lines.push(`${k}: ${val.trim()}`);
      }
    }
  }

  // 3. Hallazgos dentro de s.respuestas (si es array)
  if (Array.isArray(s.respuestas)) {
    s.respuestas.forEach(r => {
      const h = r.hallazgos || r.observaciones || r.hallazgo;
      if (h && typeof h === 'string' && h.trim()) {
        const pref = r.seccion ? `${r.seccion} (Ítem ${r.num || r.id})` : `Ítem ${r.num || r.id}`;
        const entry = `${pref}: ${h.trim()}`;
        if (!lines.includes(entry) && !lines.includes(h.trim())) {
          lines.push(entry);
        }
      }
    });
  }

  return lines.join('\n');
}

/**
 * Mapea y une los compromisos registrados:
 * - Soporta formato de objeto JEC: { directivo: '...', especialista: '...' }
 * - Soporta campos individuales: compromisoDirector, compromisoMonitor
 * - Soporta formato de lista: [{ texto, responsable, fecha/plazo }]
 * Cada compromiso en una línea con viñeta •
 * @param {Object} s - Submission
 * @returns {string}
 */
export function formatCompromisos(s) {
  if (!s) return '';
  const lines = [];

  // 1. Objeto de compromisos JEC { directivo, especialista, responsableMonitor }
  if (s.compromisos && typeof s.compromisos === 'object' && !Array.isArray(s.compromisos)) {
    if (s.compromisos.directivo) {
      lines.push(`• Directivo: ${s.compromisos.directivo}`);
    }
    if (s.compromisos.especialista) {
      const resp = s.compromisos.responsableMonitor ? ` — ${s.compromisos.responsableMonitor}` : '';
      lines.push(`• Especialista: ${s.compromisos.especialista}${resp}`);
    }
  }

  // 2. Campos individuales compromisoDirector y compromisoMonitor
  if (s.compromisoDirector && !lines.some(l => l.includes(s.compromisoDirector))) {
    lines.push(`• Directivo: ${s.compromisoDirector}`);
  }
  if (s.compromisoMonitor && !lines.some(l => l.includes(s.compromisoMonitor))) {
    lines.push(`• Especialista: ${s.compromisoMonitor}`);
  }

  // 3. Lista de compromisos como arreglo
  const arr = Array.isArray(s.compromisos)
    ? s.compromisos
    : (Array.isArray(s.compromisosList) ? s.compromisosList : []);

  arr.forEach(c => {
    if (!c) return;
    const txt = c.texto || c.compromiso || (typeof c === 'string' ? c : '');
    if (!txt) return;
    const resp = c.responsable ? ` — ${c.responsable}` : '';
    let fec = '';
    if (c.fecha || c.plazo) {
      const fClean = formatDateOnlyForExcel(c.fecha || c.plazo);
      if (fClean) fec = ` — ${fClean}`;
    }
    const line = `• ${txt}${resp}${fec}`;
    if (!lines.includes(line)) {
      lines.push(line);
    }
  });

  // 4. Fallback a texto simple
  if (lines.length === 0 && s.compromiso && typeof s.compromiso === 'string') {
    lines.push(`• ${s.compromiso.trim()}`);
  }

  return lines.join('\n');
}

/**
 * Función principal para exportar la Matriz de Seguimiento a Excel
 * @param {Object} options
 * @param {Array} options.statsList - Lista de objetos { s: submission, st: stats } filtrados
 * @param {Object} options.consFilters - Filtros activos
 * @param {boolean} options.isAllMode - Si se están exportando todas las fichas o una específica
 * @param {Object} options.ft - Plantilla seleccionada (si aplica)
 * @param {Object} options.state - Estado global de la aplicación
 * @param {Function} options.getFichaType - Función resolutora de fichaTypes
 */
export async function exportarMatrizSeguimiento({
  statsList = [],
  consFilters = {},
  isAllMode = false,
  ft = null,
  state = null,
  getFichaType = null
}) {
  if (typeof ExcelJS === 'undefined') {
    throw new Error('La librería ExcelJS no está cargada en el navegador.');
  }

  if (!statsList || statsList.length === 0) {
    throw new Error('No hay registros para exportar con los filtros seleccionados.');
  }

  // Agrupar registros por tipo de ficha para generar una hoja por tipo
  const groupsMap = new Map();
  statsList.forEach(item => {
    const s = item.s;
    const typeId = s.fichaTypeId || (ft ? ft.id : 'default');
    if (!groupsMap.has(typeId)) {
      groupsMap.set(typeId, []);
    }
    groupsMap.get(typeId).push(item);
  });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UGEL 03 - AGEBRE';
  workbook.lastModifiedBy = 'Sistema de Monitoreo';
  workbook.created = new Date();
  workbook.modified = new Date();

  const exportedSheetNames = [];
  let hasJecSheet = false;
  let jecItemsList = null;

  // ─── 1. Generar cada hoja de datos según la ficha correspondiente ───
  for (const [typeId, itemsList] of groupsMap.entries()) {
    let currentFt = ft;
    if (getFichaType) {
      currentFt = getFichaType(typeId) || currentFt;
    } else if (state && Array.isArray(state.fichaTypes)) {
      currentFt = state.fichaTypes.find(f => f.id === typeId) || currentFt;
    }
    if (!currentFt && itemsList[0] && itemsList[0].s) {
      currentFt = { id: typeId, nombre: itemsList[0].s.fichaTypeNombre || 'Monitoreo' };
    }

    const config = getMatrizConfig(currentFt, state);
    const sheetName = config.sheetName || 'MONITOREO';
    exportedSheetNames.push(sheetName);

    const ws = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 3, zoomScale: 70 }]
    });

    if (sheetName === 'MODELO JEC' || isFichaJec(currentFt)) {
      _construirHojaMatrizJec(ws, config, itemsList, state);
      hasJecSheet = true;
      jecItemsList = itemsList;
    } else {
      _construirHojaMatriz(ws, config, itemsList, state);
    }
  }

  // ─── 2. Si es Ficha JEC, agregar la hoja complementaria "MONITOREO DOCENTE JEC" ───
  if (hasJecSheet && jecItemsList && jecItemsList.length > 0) {
    const wsDoc = workbook.addWorksheet('MONITOREO DOCENTE JEC', {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 2, zoomScale: 85 }]
    });
    exportedSheetNames.push('MONITOREO DOCENTE JEC');
    _construirHojaMonitoreoDocente(wsDoc, jecItemsList, state);
  }

  // ─── 3. Crear Hoja Oculta "Listas" al final y con state: 'hidden' ───
  const wsListas = workbook.addWorksheet('Listas', { state: 'hidden' });
  wsListas.getCell('B2').value = 'SI';
  wsListas.getCell('B3').value = 'NO';
  wsListas.getCell('B4').value = 'N/A';
  wsListas.getCell('B6').value = 1;
  wsListas.getCell('B7').value = 2;
  wsListas.getCell('B8').value = 3;

  // Garantizar que la primera hoja ("MODELO JEC") sea la visible y activa al abrir
  workbook.views = [
    { x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: 'visible' }
  ];

  // ─── 4. Generar el nombre del archivo ───
  const hoyStr = new Date().toISOString().slice(0, 10);
  let fichaSlug = 'MONITOREO';
  if (exportedSheetNames.length === 1) {
    fichaSlug = exportedSheetNames[0].replace(/[^A-Za-z0-9_-]+/g, '_');
  } else if (hasJecSheet) {
    fichaSlug = 'MODELO_JEC';
  } else {
    fichaSlug = 'VARIAS_FICHAS';
  }
  const fileName = `MATRIZ_DE_SEGUIMIENTO_2026_${fichaSlug}_${hoyStr}.xlsx`;

  // ─── 5. Descargar archivo en el navegador ───
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { fileName, totalHojas: exportedSheetNames.length, sheetNames: exportedSheetNames };
}

/**
 * Dibuja la estructura completa de una hoja según su configuración y datos
 */

/**
 * Dibuja la estructura y fÃ³rmulas de la hoja "MODELO JEC" segÃºn la estructura REAL del sistema:
 * - 3 Componentes oficiales: PedagÃ³gico (9), GestiÃ³n (11), Soporte (11) = 31 indicadores
 * - Opciones de respuesta: SI, NO, N/A (sin escala 1-2-3 ni conversiÃ³n inventada)
 * - FÃ³rmulas de % CUMPLIMIENTO por componente (=IFERROR(SI/(SI+NO),""))
 * - % Cumplimiento General por IIEE (sobre los 31 indicadores)
 * - Nivel de ImplementaciÃ³n por IIEE segÃºn regla oficial:
 *     24 a 31 SÃ­ -> "ImplementaciÃ³n lograda"
 *     12 a 23 SÃ­ -> "ImplementaciÃ³n parcial"
 *     0 a 11 SÃ­  -> "ImplementaciÃ³n incipiente"
 * - Bloque de estadÃ­stica con filas SÃ­ (Cumple), No (No cumple), N/A (No aplica), Total, % Cumple, % No cumple
 * - Cuadro RESULTADO oficial por niveles con fÃ³rmulas COUNTIF
 * - Cuadro CUMPLIMIENTO POR COMPONENTE con el % agregado y estado
 */
export function _construirHojaMatrizJec(ws, config, itemsList, state) {
  // 1. Alturas de filas de cabecera
  ws.getRow(1).height = 30;
  ws.getRow(2).height = 20.25;
  ws.getRow(3).height = 177.75;

  let currentCol = 1;

  // â”€â”€â”€ BLOQUE 1: I. DATOS GENERALES DE LA IE â”€â”€â”€
  const colA = currentCol; // NÂ°
  const datosGenCols = config.datosGeneralesCampos || [];
  const colNro = colA;
  const colInicioDG = colA;
  const colFinDG = colA + datosGenCols.length; // Col A (NÂ°) + campos

  // TÃ­tulo Nivel 1-2 combinado I. DATOS GENERALES
  ws.mergeCells(1, colInicioDG, 2, colFinDG);
  const cellDG = ws.getCell(1, colInicioDG);
  cellDG.value = 'I. DATOS GENERALES DE LA IE';
  styleMergedRange(ws, colInicioDG, 1, colFinDG, 2, {
    font: { name: 'Arial', size: 14, bold: true, color: { argb: '000000' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.datosGeneralesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  // Fila 3: Columna NÂ° (Col A) rotada 90Â°
  const cellNro = ws.getCell(3, colNro);
  cellNro.value = 'NÂ°';
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

  // â”€â”€â”€ BLOQUE 2 & 3: PERSONAS (Director y Subdirector) â”€â”€â”€
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

  // â”€â”€â”€ BLOQUE 5: COLUMNA SEPARADORA GRIS (Col W) â”€â”€â”€
  const colSeparadora = currentCol;
  ws.getColumn(colSeparadora).width = 11;
  for (let r = 1; r <= 3; r++) {
    const sCell = ws.getCell(r, colSeparadora);
    sCell.value = '';
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.separadorGris } };
    sCell.border = BORDER_THIN_BLACK;
  }
  currentCol++;

  // â”€â”€â”€ BLOQUE 6, 7, 8: 3 COMPONENTES DEL SISTEMA â”€â”€â”€
  const componentes = config.componentes || obtenerComponentesJec();
  
  // Paletas de color por componente segÃºn especificaciÃ³n:
  // 1: Verde (PedagÃ³gico): tÃ­tulo y % #A9D18E, filas 2-3 #E2F0D9
  // 2: Lila (GestiÃ³n): tÃ­tulo #DEBDFF, % #C496DE, filas 2-3 #E8D1FF
  // 3: Naranja (Soporte): tÃ­tulo y % #F8CBAD, filas 2-3 #FBE5D6
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

    // Fila 1: TÃ­tulo del Componente
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

      // Fila 2: NÃºmero correlativo (1..9, 1..11, 1..11 o 01..31 segÃºn sistema)
      const cellN = ws.getCell(2, itCol);
      cellN.value = it.num || String(it.numero || (itIdx + 1)).padStart(2, '0');
      cellN.font = { name: 'Arial', size: 11, bold: true };
      cellN.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header23 } };
      cellN.alignment = { horizontal: 'center', vertical: 'middle' };
      cellN.border = BORDER_THIN_BLACK;

      // Fila 3: Texto del indicador rotado 90Â°
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

  // â”€â”€â”€ BLOQUE 9: OBSERVACIONES / RECOMENDACIONES â”€â”€â”€
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

  // â”€â”€â”€ BLOQUE 10: COMPROMISO â”€â”€â”€
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

  // â”€â”€â”€ BLOQUE 11: % Cumplimiento General por IIEE â”€â”€â”€
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

  // â”€â”€â”€ BLOQUE 12: Nivel de ImplementaciÃ³n por IIEE â”€â”€â”€
  const colNivel = currentCol;
  ws.mergeCells(1, colNivel, 3, colNivel);
  const cellNiv = ws.getCell(1, colNivel);
  cellNiv.value = 'Nivel de ImplementaciÃ³n por IIEE';
  styleMergedRange(ws, colNivel, 1, colNivel, 3, {
    font: { name: 'Arial', size: 16, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.finalesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: BORDER_THIN_BLACK
  });
  ws.getColumn(colNivel).width = 18.0;
  currentCol++;

  // 4 columnas vacÃ­as antes del Cuadro RESULTADO
  for (let emptyC = 0; emptyC < 4; emptyC++) {
    ws.getColumn(currentCol).width = 6.0;
    currentCol++;
  }

  // â”€â”€â”€ BLOQUE 13: CUADROS RESULTADO Y CUMPLIMIENTO POR COMPONENTE â”€â”€â”€
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

    // Columna NÂ° (Col A)
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

    // Componentes del sistema: Valores SI/NO/N/A y fÃ³rmula de % CUMPLIMIENTO
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

    // Nivel de ImplementaciÃ³n por IIEE (Col BI) segÃºn regla oficial (conteo de SÃ­: >=24 Lograda, >=12 Parcial, Incipiente)
    const nivelCell = row.getCell(colNivel);
    const genColLetra = colToLetter(colPctGeneral);
    nivelCell.value = {
      formula: `IF(${genColLetra}${r}="","",IF((${countSiExpr})>=24,"ImplementaciÃ³n lograda",IF((${countSiExpr})>=12,"ImplementaciÃ³n parcial","ImplementaciÃ³n incipiente")))`
    };
    nivelCell.font = { name: 'Arial', size: 14, bold: true };
    nivelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.nivelData } };
    nivelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nivelCell.border = BORDER_THIN;
  });

  // â”€â”€â”€ FORMATOS CONDICIONALES PARA CELDAS DE INDICADORES (SI, NO, N/A) â”€â”€â”€
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

  // â”€â”€â”€ FORMATO CONDICIONAL PARA COLUMNA NIVEL (Col BI, D1:DN) â”€â”€â”€
  const colNivelLetter = colToLetter(colNivel);
  const nivelRange = `${colNivelLetter}${d1}:${colNivelLetter}${dN}`;
  ws.addConditionalFormatting({
    ref: nivelRange,
    rules: [
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"ImplementaciÃ³n lograda"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalLogrado } } }
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"ImplementaciÃ³n parcial"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalProceso } } }
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"ImplementaciÃ³n incipiente"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalInicio } } }
      }
    ]
  });

  // =========================================================================
  // BLOQUE DE ESTADÃSTICA (Filas dN+1 a dN+7)
  // =========================================================================
  const sRow1 = dN + 1; // SÃ­ (Cumple)
  const sRow2 = dN + 2; // No (No cumple)
  const sRow3 = dN + 3; // N/A (No aplica)
  const sRow4 = dN + 4; // Total
  const sRow5 = dN + 5; // (vacÃ­a)
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
    { row: sRow1, text: 'SÃ­ (Cumple)' },
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

  // FÃ³rmulas para cada indicador de cada componente
  compsMeta.forEach(cm => {
    cm.comp.items.forEach(it => {
      const itCol = it.colIndex;
      const itLetter = it.colLetra;

      // Fila sRow1: SÃ­ (Cumple)
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

      // Fila sRow6: % Cumple (=IFERROR(SÃ­/(SÃ­+No),0))
      const cPctC = ws.getCell(sRow6, itCol);
      cPctC.value = { formula: `IFERROR(${itLetter}${sRow1}/(${itLetter}${sRow1}+${itLetter}${sRow2}),0)` };
      cPctC.font = { name: 'Arial', size: 12, bold: true };
      cPctC.alignment = { horizontal: 'center', vertical: 'middle' };
      cPctC.numFmt = '0%';
      cPctC.border = BORDER_THIN;

      // Fila sRow7: % No cumple (=IFERROR(No/(SÃ­+No),0))
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
  
  // â”€â”€â”€ CUADRO 1: RESULTADO POR NIVEL DE IMPLEMENTACIÃ“N (Filas 4 a 8) â”€â”€â”€
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
    { row: 5, label: 'ImplementaciÃ³n incipiente', color: PALETA_MATRIZ.resultadoInicio },
    { row: 6, label: 'ImplementaciÃ³n parcial', color: PALETA_MATRIZ.resultadoProceso },
    { row: 7, label: 'ImplementaciÃ³n lograda', color: PALETA_MATRIZ.resultadoLogrado }
  ];

  nivelesJec.forEach(n => {
    // Col BN: Etiqueta del nivel
    const cLbl = ws.getCell(n.row, colRes1);
    cLbl.value = n.label;
    cLbl.font = { name: 'Arial', size: 10, bold: true, color: { argb: '000000' } };
    cLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: n.color } };
    cLbl.alignment = { horizontal: 'left', vertical: 'middle' };
    cLbl.border = BORDER_THIN;

    // Col BO: Cantidad (conteo dinÃ¡mico sobre la columna Nivel)
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

  // â”€â”€â”€ CUADRO 2: CUMPLIMIENTO POR COMPONENTE (Filas 10 a 14) â”€â”€â”€
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
      formula: `IF(${valRef}="","",IF(${valRef}>=0.75,"ImplementaciÃ³n lograda",IF(${valRef}>=0.4,"ImplementaciÃ³n parcial","ImplementaciÃ³n incipiente")))`
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
    formula: `IF(${genValRef}="","",IF(${genValRef}>=0.75,"ImplementaciÃ³n lograda",IF(${genValRef}>=0.4,"ImplementaciÃ³n parcial","ImplementaciÃ³n incipiente")))`
  };
  cGenEst.font = { name: 'Arial', size: 10, bold: true };
  cGenEst.alignment = { horizontal: 'center', vertical: 'middle' };
  cGenEst.border = BORDER_THIN;
}

function _construirHojaMatriz(ws, config, itemsList, state) {
  // Ajustar alturas de filas de encabezado
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

  // ─── BLOQUE 2: BLOQUES DE PERSONAS (Director, Subdirector, Coordinador) ───
  const bloquesPersonas = config.bloquesPersonas || [];
  bloquesPersonas.forEach(bPersona => {
    const pCampos = bPersona.campos || [];
    const pStartCol = currentCol;
    const pEndCol = currentCol + pCampos.length - 1;

    // Título Nivel 1-2
    ws.mergeCells(1, pStartCol, 2, pEndCol);
    const pTitleCell = ws.getCell(1, pStartCol);
    pTitleCell.value = bPersona.titulo;
    styleMergedRange(ws, pStartCol, 1, pEndCol, 2, {
      font: { name: 'Arial', size: 16, bold: true, color: { argb: '000000' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: bPersona.fillHeader || PALETA_MATRIZ.persona1Header } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: BORDER_THIN_BLACK
    });

    // Fila 3: Cabeceras de campos de la persona
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

  // ─── BLOQUE 3: ASPECTOS E ÍTEMS (SI/NO y 1-2-3 con PUNTAJE) ───
  const items = config.items || [];
  const aspectosMap = new Map();
  items.forEach(it => {
    const aKey = it.aspectoIndex !== undefined ? it.aspectoIndex : it.aspectoNombre;
    if (!aspectosMap.has(aKey)) {
      aspectosMap.set(aKey, {
        nombre: it.aspectoNombre,
        tipo: it.tipo || 'escala_1_3',
        items: []
      });
    }
    aspectosMap.get(aKey).items.push(it);
  });

  // Identificar si hay bloque SI/NO
  const aspectosList = Array.from(aspectosMap.values());
  const aspectoSiNo = aspectosList.find(a => a.tipo === 'si_no');
  const aspectosConPuntaje = aspectosList.filter(a => a.tipo !== 'si_no');

  let colUltimaPreSiNo = currentCol - 1; // Para la estadística de SI/NO

  // 3.A) Aspecto(s) SI/NO (si la ficha los tiene)
  if (aspectoSiNo) {
    const aStartCol = currentCol;
    const aEndCol = currentCol + aspectoSiNo.items.length - 1;

    // Fila 1: Título Aspecto SI/NO
    ws.mergeCells(1, aStartCol, 1, aEndCol);
    const aCell = ws.getCell(1, aStartCol);
    aCell.value = aspectoSiNo.nombre;
    styleMergedRange(ws, aStartCol, 1, aEndCol, 1, {
      font: { name: 'Arial', size: 12, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.siNoHeader1 } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: BORDER_THIN_BLACK
    });

    // Filas 2 y 3: Número y texto de cada ítem
    aspectoSiNo.items.forEach(it => {
      const itCol = currentCol;
      it.colIndex = itCol;

      // Fila 2: Número
      const cellN = ws.getCell(2, itCol);
      cellN.value = it.num;
      cellN.font = { name: 'Arial', size: 11, bold: true };
      cellN.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.siNoHeader23 } };
      cellN.alignment = { horizontal: 'center', vertical: 'middle' };
      cellN.border = BORDER_THIN_BLACK;

      // Fila 3: Texto rotado 90°
      const cellT = ws.getCell(3, itCol);
      cellT.value = it.texto;
      cellT.font = { name: 'Arial', size: 10 };
      cellT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.siNoHeader23 } };
      cellT.alignment = { horizontal: 'left', vertical: 'middle', textRotation: 90, wrapText: true };
      cellT.border = BORDER_THIN_BLACK;

      ws.getColumn(itCol).width = 11;
      currentCol++;
    });

    aspectoSiNo.startCol = aStartCol;
    aspectoSiNo.endCol = aEndCol;
  }

  // ─── BLOQUE 4: COLUMNA SEPARADORA GRIS ───
  const colSeparadora = currentCol;
  ws.getColumn(colSeparadora).width = 11;
  // Se colorea la cabecera del separador gris
  for (let r = 1; r <= 3; r++) {
    const sCell = ws.getCell(r, colSeparadora);
    sCell.value = '';
    sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.separadorGris } };
    sCell.border = BORDER_THIN_BLACK;
  }
  currentCol++;

  // ─── BLOQUE 5: ASPECTOS CON ESCALA 1-2-3 Y COLUMNA PUNTAJE ───
  const columnasPuntaje = [];
  aspectosConPuntaje.forEach((asp, aspIdx) => {
    const paleta = PALETA_MATRIZ.aspectosPuntaje[aspIdx % PALETA_MATRIZ.aspectosPuntaje.length];
    const aStartCol = currentCol;
    const aEndCol = currentCol + asp.items.length - 1;

    // Fila 1: Título del Aspecto
    ws.mergeCells(1, aStartCol, 1, aEndCol);
    const aCell = ws.getCell(1, aStartCol);
    aCell.value = asp.nombre;
    styleMergedRange(ws, aStartCol, 1, aEndCol, 1, {
      font: { name: 'Arial', size: 12, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header1 } },
      alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
      border: BORDER_THIN_BLACK
    });

    // Filas 2 y 3 para cada ítem
    asp.items.forEach(it => {
      const itCol = currentCol;
      it.colIndex = itCol;

      // Fila 2: Número
      const cellN = ws.getCell(2, itCol);
      cellN.value = it.num;
      cellN.font = { name: 'Arial', size: 11, bold: true };
      cellN.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header23 } };
      cellN.alignment = { horizontal: 'center', vertical: 'middle' };
      cellN.border = BORDER_THIN_BLACK;

      // Fila 3: Texto rotado 90°
      const cellT = ws.getCell(3, itCol);
      cellT.value = it.texto;
      cellT.font = { name: 'Arial', size: it.texto.length > 200 ? 9.5 : 10 };
      cellT.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.header23 } };
      cellT.alignment = { horizontal: 'left', vertical: 'middle', textRotation: 90, wrapText: true };
      cellT.border = BORDER_THIN_BLACK;

      ws.getColumn(itCol).width = 11.5;
      currentCol++;
    });

    // Columna PUNTAJE para este aspecto
    const colPuntaje = currentCol;
    ws.mergeCells(1, colPuntaje, 3, colPuntaje);
    const cellP = ws.getCell(1, colPuntaje);
    cellP.value = 'PUNTAJE';
    styleMergedRange(ws, colPuntaje, 1, colPuntaje, 3, {
      font: { name: 'Arial', size: 12, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: paleta.puntaje } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: BORDER_THIN_BLACK
    });
    ws.getColumn(colPuntaje).width = 11.5;

    columnasPuntaje.push({
      colIndex: colPuntaje,
      colLetter: colToLetter(colPuntaje),
      startColLetter: colToLetter(aStartCol),
      endColLetter: colToLetter(aEndCol),
      paleta
    });

    asp.startCol = aStartCol;
    asp.endCol = aEndCol;
    asp.colPuntaje = colPuntaje;
    currentCol++;
  });

  // ─── BLOQUE 6: OBSERVACIONES / RECOMENDACIONES ───
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

  // ─── BLOQUE 7: COMPROMISO ───
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

  // ─── BLOQUE 8: Puntaje Total por IIEE ───
  const colTotal = currentCol;
  ws.mergeCells(1, colTotal, 3, colTotal);
  const cellTot = ws.getCell(1, colTotal);
  cellTot.value = 'Puntaje Total por IIEE';
  styleMergedRange(ws, colTotal, 1, colTotal, 3, {
    font: { name: 'Arial', size: 16, bold: false },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.finalesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: BORDER_THIN_BLACK
  });
  ws.getColumn(colTotal).width = 16.5;
  currentCol++;

  // ─── BLOQUE 9: Nivel por IIEE (corregida errata "Nviel") ───
  const colNivel = currentCol;
  ws.mergeCells(1, colNivel, 3, colNivel);
  const cellNiv = ws.getCell(1, colNivel);
  cellNiv.value = 'Nivel por IIEE';
  styleMergedRange(ws, colNivel, 1, colNivel, 3, {
    font: { name: 'Arial', size: 16, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.finalesHeader } },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: BORDER_THIN_BLACK
  });
  ws.getColumn(colNivel).width = 18.0;
  currentCol++;

  // 4 columnas vacías de separación antes del Cuadro RESULTADO
  for (let emptyC = 0; emptyC < 4; emptyC++) {
    ws.getColumn(currentCol).width = 6.0;
    currentCol++;
  }

  // ─── BLOQUE 10: CUADRO RESULTADO (anclado en filas 4 a 8) ───
  const colRes1 = currentCol;
  const colRes2 = currentCol + 1;
  const colRes3 = currentCol + 2;
  ws.getColumn(colRes1).width = 28.9;
  ws.getColumn(colRes2).width = 13.0;
  ws.getColumn(colRes3).width = 13.0;

  // =========================================================================
  // LLENADO DE DATOS (Filas 4 a N)
  // =========================================================================
  const d1 = 4;
  const totalRegistros = itemsList.length;
  const dN = d1 + totalRegistros - 1;

  // Seguimiento de métricas de cobertura por bloque de personas
  const coverageStats = {
    totalRows: totalRegistros,
    director: { conNombre: 0, faltaDni: 0, faltaTelefono: 0, faltaCondicion: 0, faltaCorreo: 0, completos: 0, sinDatos: 0 },
    bloque2: { cargoLabel: 'Subdirector / Coordinador', conNombre: 0, faltaDni: 0, faltaTelefono: 0, faltaCondicion: 0, faltaCorreo: 0, completos: 0, sinDatos: 0 }
  };

  itemsList.forEach((rowItem, idx) => {
    const r = d1 + idx;
    const row = ws.getRow(r);
    row.height = 23.25;

    const s = rowItem.s || {};
    const st = rowItem.st || {};

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

    // Bloques de Personas (Director, Subdirector, Coordinador de Tutoría, Coordinador Pedagógico)
    bloquesPersonas.forEach((bPersona, bIdx) => {
      let cargo = 'director';
      const bTit = (bPersona.titulo || '').toLowerCase();
      if (bTit.includes('sub')) {
        cargo = 'subdirector';
      } else if (bTit.includes('tutor')) {
        cargo = 'coordinador_tutoria';
      } else if (bTit.includes('pedag')) {
        cargo = 'coordinador_pedagogico';
      }

      let rawPersonaVal = null;
      if (cargo === 'director') {
        rawPersonaVal = s.director !== undefined ? s.director : (s.directorNombre || s.dirNombre || null);
      } else if (cargo === 'subdirector') {
        rawPersonaVal = s.subdirectores || s.subDirector || s.subdirector || s.subNombre || null;
      } else if (cargo === 'coordinador_tutoria') {
        rawPersonaVal = s.coordinadorTutoria || s.coordTutoria || s.coordTutoriaNombre || null;
      } else if (cargo === 'coordinador_pedagogico') {
        rawPersonaVal = s.coordinadorPedagogico || s.coordPedag || s.coordPedagNombre || null;
      }

      const personaNorm = normalizarPersona(rawPersonaVal, s, cargo, state);

      // Métricas de cobertura de datos
      const statTarget = (bIdx === 0) ? coverageStats.director : coverageStats.bloque2;
      if (bIdx > 0 && bPersona.titulo) {
        coverageStats.bloque2.cargoLabel = bPersona.titulo.replace(/^(II|III)\.\s*DATOS\s*(DEL|DE\s*LOS)?\s*/i, '').trim();
      }

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
        } else if (lKey.includes('condicion') || lKey.includes('especialidad')) {
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

    // Aspecto(s) SI/NO
    if (aspectoSiNo) {
      aspectoSiNo.items.forEach(it => {
        const itCell = row.getCell(it.colIndex);
        const itVal = _obtenerRespuestaItem(s, it);
        const normVal = _normalizarSiNo(itVal);
        setSafeCellValue(itCell, normVal, it.id || it.num, colToLetter(it.colIndex));
        itCell.font = { name: 'Arial', size: 12 };
        itCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.siNoData } };
        itCell.alignment = { horizontal: 'center', vertical: 'middle' };
        itCell.border = BORDER_THIN;
        itCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"SI,NO"']
        };
      });
    }

    // Columna Separadora en datos
    const sepCell = row.getCell(colSeparadora);
    sepCell.value = '';
    sepCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.separadorGris } };
    sepCell.border = BORDER_THIN;

    // Aspectos con Escala 1-2-3 y sus PUNTAJES
    aspectosConPuntaje.forEach(asp => {
      asp.items.forEach(it => {
        const itCell = row.getCell(it.colIndex);
        const itVal = _obtenerRespuestaItem(s, it);
        const numVal = normalizarEscala1_3(itVal);

        setSafeCellValue(itCell, (numVal === 1 || numVal === 2 || numVal === 3) ? numVal : '', it.id || it.num, colToLetter(it.colIndex));
        itCell.font = { name: 'Arial', size: 12 };
        itCell.alignment = { horizontal: 'center', vertical: 'middle' };
        itCell.border = BORDER_THIN;
        if (numVal === 1 || numVal === 2 || numVal === 3) {
          itCell.numFmt = '0';
        }
        itCell.dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"1,2,3"']
        };
      });

      // Celda PUNTAJE del aspecto
      const pCell = row.getCell(asp.colPuntaje);
      const startLetter = colToLetter(asp.startCol);
      const endLetter = colToLetter(asp.endCol);
      pCell.value = { formula: `SUM(${startLetter}${r}:${endLetter}${r})` };
      pCell.font = { name: 'Arial', size: 12, bold: true };
      pCell.alignment = { horizontal: 'center', vertical: 'middle' };
      pCell.numFmt = '0';
      pCell.border = BORDER_THIN;
    });

    // Observaciones / Recomendaciones (Col BT)
    const obsCell = row.getCell(colObs);
    const obsText = formatObservaciones(s);
    setSafeCellValue(obsCell, obsText, 'observaciones', colToLetter(colObs));
    obsCell.font = { name: 'Arial', size: 11 };
    obsCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    obsCell.border = BORDER_THIN;

    // Compromisos (Col BU)
    const compCell = row.getCell(colComp);
    const compText = formatCompromisos(s);
    setSafeCellValue(compCell, compText, 'compromisos', colToLetter(colComp));
    compCell.font = { name: 'Arial', size: 11 };
    compCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    compCell.border = BORDER_THIN;

    // Puntaje Total por IIEE (=SUM(P1, P2, ...))
    const totalCell = row.getCell(colTotal);
    const formulaSumas = columnasPuntaje.map(cp => `${cp.colLetter}${r}`).join(',');
    totalCell.value = { formula: `SUM(${formulaSumas})` };
    totalCell.font = { name: 'Arial', size: 16, bold: true };
    totalCell.alignment = { horizontal: 'center', vertical: 'middle' };
    totalCell.numFmt = '0';
    totalCell.border = BORDER_THIN;

    // Nivel por IIEE (=IF(...))
    const totalLetter = colToLetter(colTotal);
    const limites = config.limites || { max: 111, limInicio: 56, limProceso: 83 };
    const nivelCell = row.getCell(colNivel);
    nivelCell.value = {
      formula: `IF(${totalLetter}${r}<=0,"",IF(${totalLetter}${r}<=${limites.limInicio},"INICIO",IF(${totalLetter}${r}<=${limites.limProceso},"PROCESO",IF(${totalLetter}${r}<=${limites.max},"LOGRADO",""))))`
    };
    nivelCell.font = { name: 'Arial', size: 14, bold: true };
    nivelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.nivelData } };
    nivelCell.alignment = { horizontal: 'center', vertical: 'middle' };
    nivelCell.border = BORDER_THIN;
  });

  // ─── REPORTE DE COBERTURA DE DATOS DE PERSONAS (Console / Log) ───
  const sheetTitle = config.sheetName || 'MONITOREO';
  try {
    console.group(`[Exportar Matriz] Cobertura de datos de personas — Hoja "${sheetTitle}" (${coverageStats.totalRows} registros)`);
    console.info(`• Director(a): ${coverageStats.director.conNombre}/${coverageStats.totalRows} con nombre | ${coverageStats.director.completos} completos | Faltan en origen: DNI (${coverageStats.director.faltaDni}), Teléfono (${coverageStats.director.faltaTelefono}), Condición (${coverageStats.director.faltaCondicion}), Correo (${coverageStats.director.faltaCorreo})`);
    if (bloquesPersonas.length > 1) {
      console.info(`• ${coverageStats.bloque2.cargoLabel}: ${coverageStats.bloque2.conNombre}/${coverageStats.totalRows} con nombre | ${coverageStats.bloque2.completos} completos | Faltan en origen: DNI (${coverageStats.bloque2.faltaDni}), Teléfono (${coverageStats.bloque2.faltaTelefono}), Condición (${coverageStats.bloque2.faltaCondicion}), Correo (${coverageStats.bloque2.faltaCorreo})`);
    }
    console.groupEnd();
  } catch (e) {
    // Silencioso en caso de entornos sin consola completa
  }

  // ─── AUDITORÍA DE COBERTURA POR COLUMNA (Console / Log) ───
  try {
    const colEmptiness = {};
    for (let c = 1; c <= colNivel; c++) {
      let emptyCount = 0;
      for (let r = d1; r <= dN; r++) {
        const val = ws.getCell(r, c).value;
        if (val === null || val === undefined || val === '') emptyCount++;
      }
      if (emptyCount > 0) {
        const headerText = ws.getCell(3, c).value || ws.getCell(2, c).value || ws.getCell(1, c).value || colToLetter(c);
        colEmptiness[colToLetter(c)] = { header: String(headerText).replace(/\n/g, ' ').slice(0, 30), vacias: `${emptyCount}/${totalRegistros}` };
      }
    }
    console.group(`[Exportar Matriz] Auditoría de cobertura por columna — Hoja "${sheetTitle}" (${totalRegistros} filas)`);
    console.table(colEmptiness);
    console.groupEnd();
  } catch (e) {
    // Silencioso en caso de entornos sin consola completa
  }

  // ─── FORMATO CONDICIONAL PARA COLUMNA NIVEL (D1:DN) ───
  const colNivelLetter = colToLetter(colNivel);
  const nivelRange = `${colNivelLetter}${d1}:${colNivelLetter}${dN}`;
  ws.addConditionalFormatting({
    ref: nivelRange,
    rules: [
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"LOGRADO"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalLogrado } } }
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"PROCESO"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalProceso } } }
      },
      {
        type: 'cellIs',
        operator: 'equal',
        formulae: ['"INICIO"'],
        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: PALETA_MATRIZ.condicionalInicio } } }
      }
    ]
  });

  // =========================================================================
  // BLOQUE DE ESTADÍSTICA (Filas DN+1 a DN+8)
  // =========================================================================
  const sRow1 = dN + 1;
  const sRow2 = dN + 2;
  const sRow3 = dN + 3;
  const sRow4 = dN + 4;
  const sRow5 = dN + 5;
  const sRow6 = dN + 6;
  const sRow7 = dN + 7;
  const sRow8 = dN + 8;

  ws.getRow(sRow1).height = 27.75;
  ws.getRow(sRow2).height = 27.75;
  ws.getRow(sRow3).height = 27.75;
  ws.getRow(sRow4).height = 31.5;
  ws.getRow(sRow5).height = 15;
  ws.getRow(sRow6).height = 27.0;
  ws.getRow(sRow7).height = 27.0;
  ws.getRow(sRow8).height = 27.0;

  // Etiqueta %TOTAL combinada desde Col A hasta la columna anterior a las etiquetas
  const colFinTotalLabel = aspectoSiNo ? (aspectoSiNo.startCol - 2) : (colSeparadora - 2);
  if (colFinTotalLabel >= colA) {
    ws.mergeCells(sRow1, colA, sRow3, colFinTotalLabel);
    const cellTotalLbl = ws.getCell(sRow1, colA);
    cellTotalLbl.value = '%TOTAL';
    styleMergedRange(ws, colA, sRow1, colFinTotalLabel, sRow3, {
      font: { name: 'Arial', size: 14, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statTotalLabel } },
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: BORDER_THIN
    });
  }

  // Estadística SI/NO
  if (aspectoSiNo) {
    const colEtiquetasSiNo = aspectoSiNo.startCol - 1;
    // Etiquetas SI, NO, TOTAL
    const eSi = ws.getCell(sRow1, colEtiquetasSiNo);
    eSi.value = 'SI';
    eSi.font = { name: 'Arial', size: 14, bold: true };
    eSi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statSiNoLabel } };
    eSi.alignment = { horizontal: 'center', vertical: 'middle' };
    eSi.border = BORDER_THIN;

    const eNo = ws.getCell(sRow2, colEtiquetasSiNo);
    eNo.value = 'NO';
    eNo.font = { name: 'Arial', size: 14, bold: true };
    eNo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statSiNoLabel } };
    eNo.alignment = { horizontal: 'center', vertical: 'middle' };
    eNo.border = BORDER_THIN;

    const eTot = ws.getCell(sRow3, colEtiquetasSiNo);
    eTot.value = 'TOTAL';
    eTot.font = { name: 'Arial', size: 14, bold: true };
    eTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statSiNoLabel } };
    eTot.alignment = { horizontal: 'center', vertical: 'middle' };
    eTot.border = BORDER_THIN;

    // Fórmulas para cada ítem SI/NO
    aspectoSiNo.items.forEach(it => {
      const itLetter = colToLetter(it.colIndex);

      const cSi = ws.getCell(sRow1, it.colIndex);
      cSi.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},"SI")` };
      cSi.font = { name: 'Arial', size: 12 };
      cSi.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statSiNoLabel } };
      cSi.alignment = { horizontal: 'center', vertical: 'middle' };
      cSi.border = BORDER_THIN;

      const cNo = ws.getCell(sRow2, it.colIndex);
      cNo.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},"NO")` };
      cNo.font = { name: 'Arial', size: 12 };
      cNo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statSiNoLabel } };
      cNo.alignment = { horizontal: 'center', vertical: 'middle' };
      cNo.border = BORDER_THIN;

      const cTot = ws.getCell(sRow3, it.colIndex);
      cTot.value = { formula: `SUM(${itLetter}${sRow1}:${itLetter}${sRow2})` };
      cTot.font = { name: 'Arial', size: 12, bold: true };
      cTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statSiNoLabel } };
      cTot.alignment = { horizontal: 'center', vertical: 'middle' };
      cTot.border = BORDER_THIN;
    });
  }

  // Estadística Ítems con puntaje (Escala 1-2-3)
  // Etiquetas en la columna separadora gris
  const sepLabels = [
    { row: sRow1, text: 'Inicio' },
    { row: sRow2, text: 'Proceso' },
    { row: sRow3, text: 'Logrado' },
    { row: sRow4, text: 'Total' },
    { row: sRow6, text: 'Inicio' },
    { row: sRow7, text: 'Proceso' },
    { row: sRow8, text: 'Logrado' }
  ];
  sepLabels.forEach(sl => {
    const cell = ws.getCell(sl.row, colSeparadora);
    cell.value = sl.text;
    cell.font = { name: 'Arial', size: 11, bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.separadorGris } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = BORDER_THIN;
  });

  // Etiqueta vertical "Porcentaje" en sRow6 a sRow8 en la columna a la izquierda de la separadora
  const colPctLabel = colSeparadora - 1;
  ws.mergeCells(sRow6, colPctLabel, sRow8, colPctLabel);
  const cellPct = ws.getCell(sRow6, colPctLabel);
  cellPct.value = 'Porcentaje';
  styleMergedRange(ws, colPctLabel, sRow6, colPctLabel, sRow8, {
    font: { name: 'Arial', size: 11, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statTotalLabel } },
    alignment: { horizontal: 'center', vertical: 'middle', textRotation: 90 },
    border: BORDER_THIN
  });

  // Fórmulas para cada ítem con escala 1-2-3
  aspectosConPuntaje.forEach(asp => {
    asp.items.forEach(it => {
      const itCol = it.colIndex;
      const itLetter = colToLetter(itCol);

      // Conteos
      const cIni = ws.getCell(sRow1, itCol);
      cIni.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},1)` };
      cIni.font = { name: 'Arial', size: 12 };
      cIni.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statScoreValues } };
      cIni.alignment = { horizontal: 'center', vertical: 'middle' };
      cIni.border = BORDER_THIN;

      const cProc = ws.getCell(sRow2, itCol);
      cProc.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},2)` };
      cProc.font = { name: 'Arial', size: 12 };
      cProc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statScoreValues } };
      cProc.alignment = { horizontal: 'center', vertical: 'middle' };
      cProc.border = BORDER_THIN;

      const cLog = ws.getCell(sRow3, itCol);
      cLog.value = { formula: `COUNTIF(${itLetter}${d1}:${itLetter}${dN},3)` };
      cLog.font = { name: 'Arial', size: 12 };
      cLog.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statScoreValues } };
      cLog.alignment = { horizontal: 'center', vertical: 'middle' };
      cLog.border = BORDER_THIN;

      const cTot = ws.getCell(sRow4, itCol);
      cTot.value = { formula: `SUM(${itLetter}${sRow1}:${itLetter}${sRow3})` };
      cTot.font = { name: 'Arial', size: 12, bold: true };
      cTot.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.statScoreValues } };
      cTot.alignment = { horizontal: 'center', vertical: 'middle' };
      cTot.border = BORDER_THIN;

      // Porcentajes protegidos con IFERROR(..., 0)
      const pIni = ws.getCell(sRow6, itCol);
      pIni.value = { formula: `IFERROR(${itLetter}${sRow1}/${itLetter}${sRow4},0)` };
      pIni.font = { name: 'Arial', size: 12 };
      pIni.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2F0D9' } };
      pIni.alignment = { horizontal: 'center', vertical: 'middle' };
      pIni.numFmt = '0%';
      pIni.border = BORDER_THIN;

      const pProc = ws.getCell(sRow7, itCol);
      pProc.value = { formula: `IFERROR(${itLetter}${sRow2}/${itLetter}${sRow4},0)` };
      pProc.font = { name: 'Arial', size: 12 };
      pProc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2F0D9' } };
      pProc.alignment = { horizontal: 'center', vertical: 'middle' };
      pProc.numFmt = '0%';
      pProc.border = BORDER_THIN;

      const pLog = ws.getCell(sRow8, itCol);
      pLog.value = { formula: `IFERROR(${itLetter}${sRow3}/${itLetter}${sRow4},0)` };
      pLog.font = { name: 'Arial', size: 12 };
      pLog.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2F0D9' } };
      pLog.alignment = { horizontal: 'center', vertical: 'middle' };
      pLog.numFmt = '0%';
      pLog.border = BORDER_THIN;
    });

    // Las columnas PUNTAJE no llevan estadística
  });

  // =========================================================================
  // CUADRO RESULTADO (Ubicado en colRes1..colRes3, filas 4 a 8)
  // =========================================================================
  // Fila 4: RESULTADO (combinado en 3 columnas)
  ws.mergeCells(4, colRes1, 4, colRes3);
  const rTit = ws.getCell(4, colRes1);
  rTit.value = 'RESULTADO';
  styleMergedRange(ws, colRes1, 4, colRes3, 4, {
    font: { name: 'Calibri', size: 20, bold: true, color: { argb: PALETA_MATRIZ.resultadoHeaderFont } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA_MATRIZ.resultadoHeader } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: BORDER_THIN_BLACK
  });

  // Fila 5: Cabecera cuadro resultado
  const hNiv = ws.getCell(5, colRes1);
  hNiv.value = 'IIEE POR NIVELES';
  hNiv.font = { name: 'Arial', size: 12, bold: true };
  hNiv.alignment = { horizontal: 'center', vertical: 'middle' };
  hNiv.border = BORDER_THIN_BLACK;

  const hCant = ws.getCell(5, colRes2);
  hCant.value = 'cant';
  hCant.font = { name: 'Arial', size: 12, bold: true };
  hCant.alignment = { horizontal: 'center', vertical: 'middle' };
  hCant.border = BORDER_THIN_BLACK;

  const hPct = ws.getCell(5, colRes3);
  hPct.value = '%';
  hPct.font = { name: 'Arial', size: 12, bold: true };
  hPct.alignment = { horizontal: 'center', vertical: 'middle' };
  hPct.border = BORDER_THIN_BLACK;

  // Filas 6, 7, 8: INICIO, PROCESO, LOGRADO con fórmulas corregidas
  const colRes2Letter = colToLetter(colRes2);
  const filasResultado = [
    { row: 6, label: 'IEE EN NIVEL INICIO', nivel: 'INICIO', fill: PALETA_MATRIZ.resultadoInicio },
    { row: 7, label: 'IEE EN NIVEL PROCESO', nivel: 'PROCESO', fill: PALETA_MATRIZ.resultadoProceso },
    { row: 8, label: 'IEE EN NIVEL LOGRADO', nivel: 'LOGRADO', fill: PALETA_MATRIZ.resultadoLogrado }
  ];

  filasResultado.forEach(fr => {
    const cLbl = ws.getCell(fr.row, colRes1);
    cLbl.value = fr.label;
    cLbl.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    cLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fr.fill } };
    cLbl.alignment = { horizontal: 'left', vertical: 'middle' };
    cLbl.border = BORDER_THIN_BLACK;

    const cCant = ws.getCell(fr.row, colRes2);
    cCant.value = { formula: `COUNTIF(${colNivelLetter}${d1}:${colNivelLetter}${dN},"${fr.nivel}")` };
    cCant.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    cCant.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fr.fill } };
    cCant.alignment = { horizontal: 'center', vertical: 'middle' };
    cCant.numFmt = '0';
    cCant.border = BORDER_THIN_BLACK;

    const cPct = ws.getCell(fr.row, colRes3);
    // Fórmula corregida: =IFERROR(cant / SUM(cant6:cant8), 0)
    cPct.value = { formula: `IFERROR(${colRes2Letter}${fr.row}/SUM(${colRes2Letter}6:${colRes2Letter}8),0)` };
    cPct.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    cPct.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fr.fill } };
    cPct.alignment = { horizontal: 'center', vertical: 'middle' };
    cPct.numFmt = '0%';
    cPct.border = BORDER_THIN_BLACK;
  });
}

// =========================================================================
// NORMALIZACIÓN INTELIGENTE DE PERSONAS Y FUENTES (DIRECTORIO / COLEGIOS)
// =========================================================================

/** Catálogo oficial de condiciones (UGEL 03 / MINEDU) */
export const CATALOGO_CONDICION = {
  'd': 'Designado(a)',
  'designado': 'Designado(a)',
  'designada': 'Designado(a)',
  'designado(a)': 'Designado(a)',
  'designado (d)': 'Designado(a)',
  'e': 'Encargado(a)',
  'encargado': 'Encargado(a)',
  'encargada': 'Encargado(a)',
  'encargado(a)': 'Encargado(a)',
  'encargado (e)': 'Encargado(a)',
  'n': 'Nombrado(a)',
  'nombrado': 'Nombrado(a)',
  'nombrada': 'Nombrado(a)',
  'nombrado(a)': 'Nombrado(a)',
  'nombrado (n)': 'Nombrado(a)',
  'c': 'Contratado(a)',
  'contratado': 'Contratado(a)',
  'contratada': 'Contratado(a)',
  'contratado(a)': 'Contratado(a)',
  'contratado (c)': 'Contratado(a)'
};

/** Normaliza la condición laboral a la etiqueta oficial */
export function normalizarCondicion(val) {
  if (val === undefined || val === null) return '';
  const s = String(val).trim();
  if (!s || s === '—' || s === '-' || s === 'null' || s === 'undefined') return '';
  const k = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (CATALOGO_CONDICION[k]) return CATALOGO_CONDICION[k];
  for (const [key, label] of Object.entries(CATALOGO_CONDICION)) {
    if (k === key || k.startsWith(key + ' ') || k.endsWith('(' + key + ')')) {
      return label;
    }
  }
  return s;
}

/** Limpia y formatea un DNI asegurando 8 dígitos texto con ceros a la izquierda si aplica */
export function formatDni(val) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim().replace(/[\r\n\t]/g, '');
  if (!str || str === '—' || str === '-' || str === 'null' || str === 'undefined') return '';
  // Si contiene solo dígitos y tiene entre 1 y 7 dígitos, completar con 0 hasta 8
  if (/^\d{1,7}$/.test(str)) {
    str = str.padStart(8, '0');
  }
  return str;
}

/** Limpia correo electrónico en minúsculas */
export function cleanEmail(val) {
  if (!val) return '';
  const s = String(val).trim().toLowerCase().replace(/\s+/g, '');
  if (s === '—' || s === '-' || s === 'null' || s === 'undefined' || !s.includes('@')) return '';
  return s;
}

/** Limpia teléfono */
export function cleanTelefono(val) {
  if (!val) return '';
  const s = String(val).trim().replace(/\s+/g, ' ');
  if (s === '—' || s === '-' || s === 'null' || s === 'undefined') return '';
  return s;
}

/** Detecta si un string o texto es un placeholder o no contiene una persona válida */
export function isPlaceholderPersona(str) {
  if (!str) return true;
  const s = String(str).trim();
  if (!s || s === '—' || s === '-' || s === '--' || s === 'null' || s === 'undefined' || s === '{}' || s === '[]' || s === '[object Object]') {
    return true;
  }
  const n = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const placeholders = [
    'NO CUENTA', 'NO CUENTA CON SUB DIRECTOR', 'NO CUENTA CON SUBDIRECTOR',
    'NO CUENTA CON SUB-DIRECTOR', 'NO CUENTA CON SUB DIRECTOR(A)', 'NO CUENTA CON SUBDIRECTOR(A)',
    'NO CUENTA CON DIRECTOR', 'NO CUENTA CON DIRECTORA', 'SIN SUBDIRECTOR', 'SIN SUB DIRECTOR',
    'SIN SUBDIRECTORA', 'SIN DIRECTOR', 'SIN DIRECTORA', 'NO TIENE', 'NO POSEE', 'NO APLICA',
    'NINGUNO', 'NINGUNA', 'S/N', 'SN', 'N/A', 'NA', 'S/D', 'SD', 'NO', 'VACANTE', 'SIN ASIGNAR', 'NO REGISTRA'
  ];
  if (placeholders.includes(n)) return true;
  if (/^NO\s+CUENTA(\s+CON)?(\s+(SUB\s*)?DIRECTOR(A)?)?$/i.test(n)) return true;
  if (/^SIN\s+(SUB\s*)?DIRECTOR(A)?$/i.test(n)) return true;
  if (/^NO\s+TIENE(\s+(SUB\s*)?DIRECTOR(A)?)?$/i.test(n)) return true;
  return false;
}

function normalizeKey(k) {
  if (!k) return '';
  return String(k).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Diccionario de alias por propiedad (claves normalizadas sin tildes ni guiones)
const ALIAS_PROP_MAP = {
  nombres: [
    'nombres', 'nombre', 'nombresapellidos', 'apellidosnombres', 'nombrecompleto',
    'fullname', 'directornombres', 'directornombre', 'subdirectornombre', 'subdirectornombres',
    'coordinadornombre', 'coordinadornombres', 'directivo', 'nombredirectivo', 'directivoquebrindalainformacionsolicitada',
    'directivoquebrindalainformacion'
  ],
  dni: [
    'dni', 'documento', 'nrodocumento', 'numdoc', 'numerodocumento',
    'dnidirectivo', 'directordni', 'subdirectordni', 'coordinadordni', 'dnitutor'
  ],
  telefono: [
    'telefono', 'celular', 'movil', 'telefonocelular', 'phone',
    'tel', 'cel', 'directortelefono', 'directortel', 'subdirectortelefono', 'subdirectortel',
    'coordinadortelefono', 'coordinadortel'
  ],
  condicion: [
    'condicion', 'condicionlaboral', 'situacion', 'tipo', 'cargocondicion',
    'directorcondicion', 'subdirectorcondicion', 'coordinadorcondicion', 'especialidad', 'areas'
  ],
  correo: [
    'correo', 'email', 'mail', 'correoelectronico', 'emaildirector', 'correodirector',
    'directorcorreo', 'subdirectorcorreo', 'coordinadorcorreo', 'emailcoordinador'
  ]
};

function _extraerPropiedadPorAlias(obj, prop) {
  if (!obj || typeof obj !== 'object') return '';
  const aliases = ALIAS_PROP_MAP[prop] || [prop];

  // 1. Coincidencia directa de claves
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    const nk = normalizeKey(k);
    if (aliases.includes(nk)) {
      return String(v).trim();
    }
  }

  // 2. Si es 'nombres' y vienen separados: nombres + apellido_paterno + apellido_materno
  if (prop === 'nombres') {
    const nom = obj.nombres || obj.nombre || '';
    const apPat = obj.apellido_paterno || obj.apellidoPaterno || obj.apellidopaterno || '';
    const apMat = obj.apellido_materno || obj.apellidoMaterno || obj.apellidomaterno || '';
    if (apPat || apMat) {
      return [apPat, apMat, nom].filter(Boolean).join(' ').trim();
    }
  }

  return '';
}

function _normalizarObjetoOStringPersona(val) {
  if (val === undefined || val === null) {
    return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  }

  // Si es string
  if (typeof val === 'string') {
    const str = val.trim();
    if (!str || str === '—' || str === '-' || str === '{}' || str === '[]' || str === '[object Object]') {
      return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
    }

    // String con JSON
    if (str.startsWith('{') || str.startsWith('[')) {
      try {
        const parsed = JSON.parse(str);
        if (Array.isArray(parsed)) {
          const personas = parsed.map(v => _normalizarObjetoOStringPersona(v)).filter(p => p.nombres || p.dni);
          return _combinarMultiplesPersonas(personas);
        }
        if (parsed && typeof parsed === 'object') {
          return {
            nombres: _extraerPropiedadPorAlias(parsed, 'nombres'),
            dni: _extraerPropiedadPorAlias(parsed, 'dni'),
            telefono: _extraerPropiedadPorAlias(parsed, 'telefono'),
            condicion: _extraerPropiedadPorAlias(parsed, 'condicion'),
            correo: _extraerPropiedadPorAlias(parsed, 'correo')
          };
        }
      } catch (e) {
        // String con JSON inválido -> usar texto limpio como nombre
        const cleanName = str.replace(/[{}\[\]"]/g, '').trim();
        return { nombres: cleanName, dni: '', telefono: '', condicion: '', correo: '' };
      }
    }

    if (isPlaceholderPersona(str)) {
      return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
    }
    return { nombres: str, dni: '', telefono: '', condicion: '', correo: '' };
  }

  // Si es un objeto JavaScript
  if (typeof val === 'object') {
    return {
      nombres: _extraerPropiedadPorAlias(val, 'nombres'),
      dni: _extraerPropiedadPorAlias(val, 'dni'),
      telefono: _extraerPropiedadPorAlias(val, 'telefono'),
      condicion: _extraerPropiedadPorAlias(val, 'condicion'),
      correo: _extraerPropiedadPorAlias(val, 'correo')
    };
  }

  return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
}

function _complementarDesdeDocFicha(p, s, cargo) {
  if (!s || typeof s !== 'object') return p;

  const res = { ...p };

  if (cargo === 'director') {
    // Si s.director es un objeto que no se pasó en valor
    if (s.director && typeof s.director === 'object') {
      const objDir = _normalizarObjetoOStringPersona(s.director);
      res.nombres = res.nombres || objDir.nombres;
      res.dni = res.dni || objDir.dni;
      res.telefono = res.telefono || objDir.telefono;
      res.condicion = res.condicion || objDir.condicion;
      res.correo = res.correo || objDir.correo;
    }

    // Campos planos de director
    res.nombres = res.nombres || s.directorNombre || s.dirNombre || (typeof s.director === 'string' && !s.director.startsWith('{') ? s.director : '') || _buscarEnExtras(s, ['directivo que brinda', 'director(a)', 'director']);
    res.dni = res.dni || s.directorDni || s.dirDni || _buscarEnExtras(s, ['dni directivo', 'dni director']);
    res.telefono = res.telefono || s.directorTelefono || s.dirTelefono || _buscarEnExtras(s, ['telefono celular', 'celular director', 'telefono director']);
    res.condicion = res.condicion || s.directorCondicion || s.dirCondicion || s.condicion || _buscarEnExtras(s, ['condicion directivo', 'condicion director']);
    res.correo = res.correo || s.directorCorreo || s.dirCorreo || _buscarEnExtras(s, ['correo electronico', 'email director', 'correo director']);
  } else if (cargo === 'subdirector') {
    if (Array.isArray(s.subdirectores) && s.subdirectores.length > 0) {
      const personas = s.subdirectores.map(sd => _normalizarObjetoOStringPersona(sd)).filter(sd => sd.nombres || sd.dni);
      if (personas.length > 0) {
        return _combinarMultiplesPersonas(personas);
      }
    }
    if (s.subdirector && typeof s.subdirector === 'object') {
      const objSub = _normalizarObjetoOStringPersona(s.subdirector);
      res.nombres = res.nombres || objSub.nombres;
      res.dni = res.dni || objSub.dni;
      res.telefono = res.telefono || objSub.telefono;
      res.condicion = res.condicion || objSub.condicion;
      res.correo = res.correo || objSub.correo;
    }
    res.nombres = res.nombres || s.subDirector || s.subdirector || s.subNombre || _buscarEnExtras(s, ['subdirector(a)', 'subdirector', 'sub director', 'subdirectora']);
    res.dni = res.dni || s.subDirectorDni || s.subdirectorDni || s.subDni || _buscarEnExtras(s, ['dni subdirector', 'dni sub director']);
    res.telefono = res.telefono || s.subDirectorTelefono || s.subdirectorTelefono || s.subTelefono || _buscarEnExtras(s, ['telefono subdirector', 'celular subdirector']);
    res.condicion = res.condicion || s.subDirectorCondicion || s.subdirectorCondicion || s.subCondicion || _buscarEnExtras(s, ['condicion subdirector']);
    res.correo = res.correo || s.subDirectorCorreo || s.subdirectorCorreo || s.subCorreo || _buscarEnExtras(s, ['correo subdirector', 'email subdirector']);
  } else if (cargo === 'coordinador_tutoria') {
    res.nombres = res.nombres || s.coordinadorTutoria || s.coordTutoriaNombre || _buscarEnExtras(s, ['coordinador(a) de tutoría', 'coordinador de tutoria', 'coordinadora de tutoria', 'coordinador tutoria']);
    res.dni = res.dni || s.coordTutoriaDni || s.coordinadorTutoriaDni || _buscarEnExtras(s, ['dni coordinador tutoria', 'dni tutor', 'dni coordinador(a) de tutoria']);
    res.telefono = res.telefono || s.coordTutoriaTelefono || s.coordinadorTutoriaTel || _buscarEnExtras(s, ['telefono coordinador tutoria', 'celular coordinador tutoria']);
    res.condicion = res.condicion || s.coordTutoriaCondicion || _buscarEnExtras(s, ['condicion coordinador tutoria']);
    res.correo = res.correo || s.coordTutoriaCorreo || _buscarEnExtras(s, ['correo coordinador tutoria']);
  } else if (cargo === 'coordinador_pedagogico') {
    res.nombres = res.nombres || s.coordinadorPedagogico || s.coordPedagNombre || _buscarEnExtras(s, ['coordinador(a) pedagógico', 'coordinador pedagogico', 'coordinadora pedagogica', 'coordinador pedagogico']);
    res.dni = res.dni || s.coordPedagDni || s.coordinadorPedagDni || _buscarEnExtras(s, ['dni coordinador pedagogico']);
    res.telefono = res.telefono || s.coordPedagTelefono || s.coordinadorPedagTel || _buscarEnExtras(s, ['telefono coordinador pedagogico']);
    res.condicion = res.condicion || s.coordPedagCondicion || s.coordPedagEspecialidad || _buscarEnExtras(s, ['condicion coordinador pedagogico', 'especialidad']);
    res.correo = res.correo || s.coordPedagCorreo || _buscarEnExtras(s, ['correo coordinador pedagogico']);
  }

  return res;
}

function _enriquecerConDirectorioYColegios(p, s, cargo, state) {
  if (!s || !state) return p;

  const codMod = String(s.codigoModular || s.codModular || (s.ie && s.ie.codigoModular) || '').trim();
  const codLoc = String(s.codigoLocal || (s.ie && s.ie.codigoLocal) || '').trim();
  const colId = String(s.colegioId || '').trim();
  const instNom = String(s.institucion || s.nombreIe || (typeof s.ie === 'string' ? s.ie : '') || '').trim();

  const res = { ...p };

  // 1. Búsqueda en Directorio (state.directivos)
  if (Array.isArray(state.directivos)) {
    const directivosIE = state.directivos.filter(d => {
      if (isPlaceholderPersona(d.apellidosNombres)) return false;
      if (d.estado && d.estado !== 'activo') return false;
      if (codMod && String(d.codigoModular || '').trim() === codMod) return true;
      if (codLoc && String(d.codigoLocal || '').trim() === codLoc) return true;
      if (colId && String(d.colegioId || '').trim() === colId) return true;
      return false;
    });

    if (cargo === 'director') {
      const matchDir = directivosIE.find(d => (d.cargo || '').toLowerCase().includes('director') && !(d.cargo || '').toLowerCase().includes('sub'));
      if (matchDir) {
        const fichaDni = formatDni(res.dni);
        const dirDni = formatDni(matchDir.dni);
        // Regla: si ambos tienen DNI y no coinciden, respetar la ficha y no mezclar
        if (!fichaDni || !dirDni || fichaDni === dirDni) {
          res.nombres = res.nombres || matchDir.apellidosNombres || '';
          res.dni = res.dni || matchDir.dni || '';
          res.telefono = res.telefono || matchDir.telefono || '';
          res.condicion = res.condicion || matchDir.condicion || '';
          res.correo = res.correo || matchDir.correo || '';
        }
      }
    } else if (cargo === 'subdirector') {
      const matchSubs = directivosIE.filter(d => (d.cargo || '').toLowerCase().includes('sub'));
      if (matchSubs.length > 0) {
        if (!res.nombres && !res.dni) {
          // Si la ficha no traía subdirector (caso JEC), tomar los del directorio
          if (matchSubs.length > 1) {
            return _combinarMultiplesPersonas(matchSubs.map(sd => ({
              nombres: sd.apellidosNombres,
              dni: sd.dni,
              telefono: sd.telefono,
              condicion: sd.condicion,
              correo: sd.correo
            })));
          }
          res.nombres = matchSubs[0].apellidosNombres || '';
          res.dni = matchSubs[0].dni || '';
          res.telefono = matchSubs[0].telefono || '';
          res.condicion = matchSubs[0].condicion || '';
          res.correo = matchSubs[0].correo || '';
        } else {
          // Ya tenía datos en la ficha, complementar solo si DNI coincide o estaba vacío
          const matchSub = matchSubs[0];
          const fichaDni = formatDni(res.dni);
          const dirDni = formatDni(matchSub.dni);
          if (!fichaDni || !dirDni || fichaDni === dirDni) {
            res.nombres = res.nombres || matchSub.apellidosNombres || '';
            res.dni = res.dni || matchSub.dni || '';
            res.telefono = res.telefono || matchSub.telefono || '';
            res.condicion = res.condicion || matchSub.condicion || '';
            res.correo = res.correo || matchSub.correo || '';
          }
        }
      }
    } else if (cargo === 'coordinador_tutoria') {
      const matchCoordTut = directivosIE.find(d => (d.cargo || '').toLowerCase().includes('tutor'));
      if (matchCoordTut) {
        const fichaDni = formatDni(res.dni);
        const dirDni = formatDni(matchCoordTut.dni);
        if (!fichaDni || !dirDni || fichaDni === dirDni) {
          res.nombres = res.nombres || matchCoordTut.apellidosNombres || '';
          res.dni = res.dni || matchCoordTut.dni || '';
          res.telefono = res.telefono || matchCoordTut.telefono || '';
          res.condicion = res.condicion || matchCoordTut.condicion || '';
          res.correo = res.correo || matchCoordTut.correo || '';
        }
      }
    } else if (cargo === 'coordinador_pedagogico') {
      const matchCoordPed = directivosIE.find(d => (d.cargo || '').toLowerCase().includes('pedagog'));
      if (matchCoordPed) {
        const fichaDni = formatDni(res.dni);
        const dirDni = formatDni(matchCoordPed.dni);
        if (!fichaDni || !dirDni || fichaDni === dirDni) {
          res.nombres = res.nombres || matchCoordPed.apellidosNombres || '';
          res.dni = res.dni || matchCoordPed.dni || '';
          res.telefono = res.telefono || matchCoordPed.telefono || '';
          res.condicion = res.condicion || matchCoordPed.condicion || '';
          res.correo = res.correo || matchCoordPed.correo || '';
        }
      }
    }
  }

  // 2. Búsqueda en Colegios (state.colegios) como fallback si aún faltan datos
  if (Array.isArray(state.colegios) && (!res.nombres || !res.dni || !res.telefono || !res.correo)) {
    const col = state.colegios.find(c => {
      if (codMod && String(c.codigoModular || '').trim() === codMod) return true;
      if (codLoc && String(c.codigoLocal || '').trim() === codLoc) return true;
      if (colId && String(c.id || '').trim() === colId) return true;
      if (instNom && normalizeKey(c.ie) === normalizeKey(instNom)) return true;
      return false;
    });

    if (col) {
      if (cargo === 'director' && col.director && !isPlaceholderPersona(col.director.nombre)) {
        const fichaDni = formatDni(res.dni);
        const colDni = formatDni(col.director.dni);
        if (!fichaDni || !colDni || fichaDni === colDni) {
          res.nombres = res.nombres || col.director.nombre || '';
          res.dni = res.dni || col.director.dni || '';
          res.telefono = res.telefono || col.director.telefono || '';
          res.correo = res.correo || col.director.correo || '';
          res.condicion = res.condicion || (col.tipoGestion ? normalizarCondicion(col.tipoGestion) : '');
        }
      } else if (cargo === 'subdirector' && col.subDirector && !isPlaceholderPersona(col.subDirector.nombre)) {
        const fichaDni = formatDni(res.dni);
        const colDni = formatDni(col.subDirector.dni);
        if (!fichaDni || !colDni || fichaDni === colDni) {
          res.nombres = res.nombres || col.subDirector.nombre || '';
          res.dni = res.dni || col.subDirector.dni || '';
          res.telefono = res.telefono || col.subDirector.telefono || '';
          res.correo = res.correo || col.subDirector.correo || '';
        }
      }
    }
  }

  return res;
}

function _formatearPersona(p) {
  if (!p) return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  
  // Limpieza de nombres
  let nom = String(p.nombres || '').trim();
  if (isPlaceholderPersona(nom)) nom = '';

  return {
    nombres: nom,
    dni: formatDni(p.dni),
    telefono: cleanTelefono(p.telefono),
    condicion: normalizarCondicion(p.condicion),
    correo: cleanEmail(p.correo)
  };
}

function _combinarMultiplesPersonas(personas) {
  if (!personas || personas.length === 0) {
    return { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  }
  const formatted = personas.map(p => _formatearPersona(p));
  return {
    nombres: formatted.map(p => p.nombres).filter(Boolean).join('\n'),
    dni: formatted.map(p => p.dni).join('\n'),
    telefono: formatted.map(p => p.telefono).join('\n'),
    condicion: formatted.map(p => p.condicion).join('\n'),
    correo: formatted.map(p => p.correo).join('\n')
  };
}

function _buscarPersonaFallback(s, cargo, state) {
  const empty = { nombres: '', dni: '', telefono: '', condicion: '', correo: '' };
  return _enriquecerConDirectorioYColegios(empty, s, cargo, state);
}

/**
 * Función única para normalizar cualquier persona de cualquier bloque y ficha
 * @param {*} valor Objeto, string JSON, string nombre o arreglo
 * @param {Object} sourceDoc Submission de la ficha de monitoreo
 * @param {string} cargo 'director' | 'subdirector' | 'coordinador_tutoria' | 'coordinador_pedagogico'
 * @param {Object} state Estado global de la aplicación (contiene directivos y colegios)
 * @returns {Object} { nombres, dni, telefono, condicion, correo }
 */
export function normalizarPersona(valor, sourceDoc = null, cargo = '', state = null) {
  // 1. Si es un arreglo (múltiples subdirectores)
  if (Array.isArray(valor)) {
    if (valor.length === 0) {
      return _formatearPersona(_buscarPersonaFallback(sourceDoc, cargo, state));
    }
    const personas = valor.map(v => _normalizarObjetoOStringPersona(v)).filter(p => p.nombres || p.dni);
    if (personas.length === 0) {
      return _formatearPersona(_buscarPersonaFallback(sourceDoc, cargo, state));
    }
    return _combinarMultiplesPersonas(personas);
  }

  // 2. Normalizar el valor directo (objeto o string)
  let p = _normalizarObjetoOStringPersona(valor);

  // 3. Complementar desde la propia ficha (sourceDoc)
  if (sourceDoc && typeof sourceDoc === 'object') {
    p = _complementarDesdeDocFicha(p, sourceDoc, cargo);
  }

  // 4. Complementar desde Directorio y Colegios con orden de prioridad
  p = _enriquecerConDirectorioYColegios(p, sourceDoc, cargo, state);

  // 5. Aplicar formateo estricto
  return _formatearPersona(p);
}

/**
 * Wrapper de compatibilidad para consultas por campo plano
 */
export function _obtenerValorPersona(s, key, state = null) {
  if (!s) return '';
  let cargo = 'director';
  const lk = key.toLowerCase();
  if (lk.includes('sub')) cargo = 'subdirector';
  else if (lk.includes('tutor')) cargo = 'coordinador_tutoria';
  else if (lk.includes('pedag')) cargo = 'coordinador_pedagogico';

  let rawVal = null;
  if (cargo === 'director') {
    rawVal = s.director !== undefined ? s.director : (s.directorNombre || s.dirNombre || null);
  } else if (cargo === 'subdirector') {
    rawVal = s.subdirectores || s.subDirector || s.subdirector || s.subNombre || null;
  } else if (cargo === 'coordinador_tutoria') {
    rawVal = s.coordinadorTutoria || s.coordTutoria || s.coordTutoriaNombre || null;
  } else if (cargo === 'coordinador_pedagogico') {
    rawVal = s.coordinadorPedagogico || s.coordPedag || s.coordPedagNombre || null;
  }

  const p = normalizarPersona(rawVal, s, cargo, state);
  if (lk.includes('nombre')) return p.nombres;
  if (lk.includes('dni')) return p.dni;
  if (lk.includes('tel') || lk.includes('cel')) return p.telefono;
  if (lk.includes('condicion') || lk.includes('especialidad')) return p.condicion;
  if (lk.includes('correo') || lk.includes('email')) return p.correo;
  return p.nombres;
}

function _obtenerValorDatoGeneral(s, key, state = null) {
  if (!s) return '';
  switch (key) {
    case 'institucion':
      return s.institucion || s.nombreIe || (typeof s.ie === 'string' ? s.ie : (s.ie && s.ie.nombre) ? s.ie.nombre : '') || '';
    case 'codigoModular': {
      let val = s.codigoModular || s.codModular || (s.ie && s.ie.codigoModular) || '';
      if (val && /^\d{1,6}$/.test(String(val).trim())) {
        val = String(val).trim().padStart(7, '0');
      }
      return val ? String(val) : '';
    }
    case 'ugel':
      return s.ugel ? (String(s.ugel).toLowerCase().includes('sector') ? 'UGEL 03' : (String(s.ugel).trim() === '03' ? 'UGEL 03' : String(s.ugel).trim())) : 'UGEL 03';
    case 'red':
      return s.red || s.rei || (s.ie && s.ie.red) || (s.ie && s.ie.rei) || '';
    case 'fecha':
      return formatDateOnlyForExcel(s.fecha || '');
    case 'secciones': {
      const secVal = s.secciones ?? _buscarEnExtras(s, ['secciones', 'seccion', 'n° de secciones', 'n de secciones']) ?? '';
      return (secVal !== '' && !isNaN(Number(secVal))) ? Number(secVal) : secVal;
    }
    case 'estudiantes': {
      const estVal = s.estudiantes ?? _buscarEnExtras(s, ['estudiantes', 'cantidad de estudiantes', 'cant estudiantes']) ?? '';
      return (estVal !== '' && !isNaN(Number(estVal))) ? Number(estVal) : estVal;
    }
    case 'docentes': {
      // 1. Campo explícito de cantidad de docentes en Datos Generales
      let val = s.docentesTotal;
      // 2. Si s.docentes es un número o texto escalar limpio (no JSON ni objeto)
      if (val === undefined || val === null || val === '') {
        if (typeof s.docentes === 'number') {
          val = s.docentes;
        } else if (typeof s.docentes === 'string' && !s.docentes.trim().startsWith('{') && !s.docentes.trim().startsWith('[')) {
          val = s.docentes;
        }
      }
      // 3. Buscar en extras
      if (val === undefined || val === null || val === '') {
        val = _buscarEnExtras(s, ['cantidad de docentes', 'total docentes', 'docentes', 'cant docentes']);
      }
      // 4. Respaldo desde el módulo Colegios
      if ((val === undefined || val === null || val === '') && state && Array.isArray(state.colegios)) {
        const codMod = String(s.codigoModular || s.codModular || (s.ie && s.ie.codigoModular) || '').trim();
        const col = state.colegios.find(c => String(c.codigoModular || '').trim() === codMod);
        if (col && (col.docentes || col.cantidadDocentes)) {
          val = col.docentes || col.cantidadDocentes;
        }
      }
      // 5. Último recurso: momento1.total
      if ((val === undefined || val === null || val === '') && s.docentes && typeof s.docentes === 'object') {
        if (s.docentes.momento1 && s.docentes.momento1.total) {
          val = s.docentes.momento1.total;
        }
      }
      if (val !== undefined && val !== null && val !== '') {
        const n = Number(String(val).trim());
        return !isNaN(n) ? n : val;
      }
      return '';
    }
    case 'formacionTecnica': {
      let val = s.formacionTecnica !== undefined ? s.formacionTecnica : (s.ie && s.ie.formacionTecnica !== undefined ? s.ie.formacionTecnica : _buscarEnExtras(s, ['formacion tecnica', 'formación técnica', 'smft', 'tecnica']));
      if (val === true || val === 'si' || val === 'SI') return 'SI';
      if (val === false || val === 'no' || val === 'NO') return 'NO';
      return '';
    }
    case 'cantidadCp': {
      let val = s.cantidadCp ?? s.cantidad_cp ?? s.cantCp ?? s.cp;
      if (val === undefined || val === null || val === '') {
        val = _buscarEnExtras(s, ['cantidad de c.p', 'cantidad de cp', 'c.p', 'coordinador pedagogico', 'coordinadores pedagogicos']);
      }
      // Respaldo desde Directorio: contar coordinadores pedagógicos registrados para esa IE
      if ((val === undefined || val === null || val === '') && state && Array.isArray(state.directivos)) {
        const codMod = String(s.codigoModular || '').trim();
        const count = state.directivos.filter(d => {
          if (codMod && String(d.codigoModular || '').trim() === codMod) {
            const c = (d.cargo || '').toLowerCase();
            return c.includes('pedag');
          }
          return false;
        }).length;
        if (count > 0) val = count;
      }
      return (val !== null && val !== undefined && val !== '') ? (isNaN(val) ? val : Number(val)) : '';
    }
    case 'cantidadCt': {
      let val = s.cantidadCt ?? s.cantidad_ct ?? s.cantCt ?? s.ct;
      if (val === undefined || val === null || val === '') {
        val = _buscarEnExtras(s, ['cantidad de c.t', 'cantidad de ct', 'c.t', 'coordinador tutoria', 'coordinadores tutoria']);
      }
      // Respaldo desde Directorio: contar coordinadores de tutoría registrados para esa IE
      if ((val === undefined || val === null || val === '') && state && Array.isArray(state.directivos)) {
        const codMod = String(s.codigoModular || '').trim();
        const count = state.directivos.filter(d => {
          if (codMod && String(d.codigoModular || '').trim() === codMod) {
            const c = (d.cargo || '').toLowerCase();
            return c.includes('tutor');
          }
          return false;
        }).length;
        if (count > 0) val = count;
      }
      return (val !== null && val !== undefined && val !== '') ? (isNaN(val) ? val : Number(val)) : '';
    }
    case 'visita':
      return s.visita || s.momento || 1;
    case 'docentesTutores':
      return _buscarEnExtras(s, ['n° de docentes tutores', 'docentes tutores a cargo', 'tutores', 'docentes tutores']) || '';
    case 'docentesACargo':
      return _buscarEnExtras(s, ['n° de docentes a cargo', 'docentes a cargo', 'docentes']) || '';
    default:
      return s[key] !== undefined ? s[key] : _buscarEnExtras(s, [key]);
  }
}

function _buscarEnExtras(s, posiblesNombres) {
  if (!s) return '';
  const extras = Array.isArray(s.extras) ? s.extras : [];
  for (const p of posiblesNombres) {
    const pNorm = String(p).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const found = extras.find(e => {
      const lNorm = (e.label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      return lNorm.includes(pNorm);
    });
    if (found && found.value !== undefined && found.value !== null) {
      return found.value;
    }
  }
  return '';
}

/**
 * Obtiene la respuesta de un ítem garantizando correspondencia única por aspecto e identificador.
 * Previene colisiones de numeración (ej. ítem 1 de Aspecto 01 vs ítem 1 de Aspecto 02).
 * @param {Object} s - Submission
 * @param {Object} it - Definición del ítem en matrizConfig.js
 * @returns {*}
 */
export function _obtenerRespuestaItem(s, it) {
  if (!s) return '';
  const resp = s.respuestas || s.items || {};

  // Lista de identificadores candidatos para este ítem
  const candidateIds = [it.id, ...(it.aliasKeys || [])].filter(Boolean);

  // 1. Si s.respuestas es un Array de respuestas
  if (Array.isArray(resp)) {
    // 1.1 Coincidencia exacta por r.id con cualquiera de los candidatos
    const matchById = resp.find(r => r && candidateIds.includes(r.id));
    if (matchById) {
      return _extraerValor(matchById.valor ?? matchById.value);
    }

    // 1.2 Coincidencia dentro de la misma sección / aspecto por número
    const aspNameNorm = (it.aspectoNombre || '').toLowerCase();
    const matchBySectionAndNum = resp.find(r => {
      if (!r) return false;
      const rSecNorm = (r.seccion || r.aspecto || '').toLowerCase();
      const sameSection = rSecNorm && (
        (aspNameNorm.includes('toece') && rSecNorm.includes('toece')) ||
        (aspNameNorm.includes('organiza') && (rSecNorm.includes('gesti') || rSecNorm.includes('organiza'))) ||
        (aspNameNorm.includes('acompa') && (rSecNorm.includes('soporte') || rSecNorm.includes('acompa'))) ||
        (aspNameNorm.includes('apoyo') && (rSecNorm.includes('apoyo') || rSecNorm.includes('personal'))) ||
        (aspNameNorm.includes('condici') && rSecNorm.includes('condici'))
      );
      if (sameSection) {
        return String(r.num) === String(it.num) || Number(r.num) === Number(it.num);
      }
      return false;
    });
    if (matchBySectionAndNum) {
      return _extraerValor(matchBySectionAndNum.valor ?? matchBySectionAndNum.value);
    }

    // 1.3 Coincidencia por alias en r.num si el alias es un número único
    for (const cand of candidateIds) {
      const matchNum = resp.find(r => r && (String(r.num) === String(cand) || String(r.id) === String(cand)));
      if (matchNum) {
        return _extraerValor(matchNum.valor ?? matchNum.value);
      }
    }
  }

  // 2. Si s.respuestas es un Objeto clave-valor
  if (typeof resp === 'object' && !Array.isArray(resp)) {
    // 2.1 Búsqueda directa por candidato exacto en las claves del objeto
    for (const cand of candidateIds) {
      if (resp[cand] !== undefined) {
        return _extraerValor(resp[cand]);
      }
    }

    // 2.2 Búsqueda insensible a mayúsculas
    const lowerKeys = Object.keys(resp).map(k => ({ original: k, lower: k.toLowerCase() }));
    for (const cand of candidateIds) {
      const cLow = cand.toLowerCase();
      const found = lowerKeys.find(lk => lk.lower === cLow);
      if (found) {
        return _extraerValor(resp[found.original]);
      }
    }

    // 2.3 Búsqueda específica con prefijo de aspecto para evitar colisiones cruzadas
    const aspPrefix = it.id ? it.id.slice(0, 3) : ''; // 'a1_', 'a2_', 'a3_', etc.
    if (aspPrefix) {
      const foundPref = lowerKeys.find(lk => lk.lower.startsWith(aspPrefix) && lk.lower.endsWith(String(it.num)));
      if (foundPref) {
        return _extraerValor(resp[foundPref.original]);
      }
    }
  }

  // 3. Búsqueda en s.extras si no se encontró en respuestas
  const exVal = _buscarEnExtras(s, candidateIds);
  if (exVal !== '') {
    return _extraerValor(exVal);
  }

  return '';
}

function _extraerValor(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.valor !== undefined) return val.valor;
  if (typeof val === 'object' && val.value !== undefined) return val.value;
  return val;
}

function _normalizarSiNo(val) {
  if (!val) return '';
  const s = String(val).trim().toUpperCase();
  if (s === 'SI' || s === 'SÍ' || s === 'S' || s === '1' || s === 'TRUE') return 'SI';
  if (s === 'NO' || s === 'N' || s === '0' || s === 'FALSE') return 'NO';
  return '';
}

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
    const red = s.red || s.rei || (s.ie && s.ie.red) || (s.ie && s.ie.rei) || '';
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


