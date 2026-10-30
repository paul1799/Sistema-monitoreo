/* =========================================================================
   matriz/orquestador.js — Orquestador principal de exportación a Excel
   de la Matriz de Seguimiento (UGEL 03 · AGEBRE).
   ========================================================================= */

import { getMatrizConfig } from './config-generator.js';
import { isFichaJec } from '../calc/detectors.js';
import { _construirHojaMatrizJec } from './hoja-jec.js';
import { _construirHojaMatriz } from './hoja-generica.js';
import { _construirHojaMonitoreoDocente } from './hoja-docente.js';

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
