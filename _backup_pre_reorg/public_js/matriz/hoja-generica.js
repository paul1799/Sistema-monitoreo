/* =========================================================================
   matriz/hoja-generica.js — Generador de hojas de matriz genéricas
   (con escala 1-2-3 o SI/NO) para la Matriz de Seguimiento oficial en Excel.
   ========================================================================= */

import { colToLetter, PALETA_MATRIZ, BORDER_THIN, BORDER_THIN_BLACK, styleMergedRange } from './estilos.js';
import { normalizarPersona, isPlaceholderPersona, _obtenerValorPersona } from './persona-normalizer.js';
import {
  parseDateOnlyToUtcDate,
  _normalizarSiNo,
  _obtenerValorDatoGeneral,
  _obtenerRespuestaItem,
  setSafeCellValue,
  formatObservaciones,
  formatCompromisos,
  normalizarEscala1_3
} from './format-helpers.js';

/**
 * Dibuja la estructura completa de una hoja genérica según su configuración y datos
 * @param {Object} ws - Hoja ExcelJS
 * @param {Object} config - Configuración de la matriz
 * @param {Array} itemsList - Lista de registros
 * @param {Object} state - Estado global
 */
export function _construirHojaMatriz(ws, config, itemsList, state) {
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
