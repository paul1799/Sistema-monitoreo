/* =========================================================================
   pdf/ficha-ebr.js — Generador oficial de PDF para la Ficha EBR Gestión Escolar
   (Visitas 1, 2 y 3) · UGEL 03 · AGEBRE
   ========================================================================= */

import {
  createOfficialPdfDocument,
  formatDate,
  drawVectorCheckmark,
  formatPersonName,
  resolveDirectorData
} from '../pdf-core.js';

import {
  getEbrSeccionesForVisita,
  migrateLegacyEbrTotals
} from '../ebr-gestion.js';

import {
  getNivelEbrGestion
} from '../calc/evaluador.js';

/**
 * Exporta la Ficha oficial "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
 * reproduciendo con exactitud la ficha física institucional para Visita 1 o Visita 2.
 */
export async function exportEbrGestionFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  const visitaNum = Number(sub.visita) || 1;
  const isV1 = visitaNum === 1;
  const isV2 = visitaNum === 2;
  const isV3 = visitaNum === 3;

  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const codLocal = (sub.ie && sub.ie.codigoLocal) || sub.codigoModular || (colegio ? (colegio.codigoLocal || colegio.codigoModular) : '') || '—';
  const red = (sub.ie && sub.ie.red) || sub.red || (colegio ? colegio.rei : '') || '—';
  const ugel = sub.ugel || 'UGEL 03';
  const formacionTecnica = (sub.ie && sub.ie.formacionTecnica !== undefined) ? sub.ie.formacionTecnica : (sub.formacionTecnica === true);

  const title = 'FICHA DE MONITOREO Y ASISTENCIA TÉCNICA A LA GESTIÓN ESCOLAR UGEL-03-EBR';
  const subtitle = `En el marco de la RM N.° 501-2025-MINEDU · ${isV1 ? 'Visita 1 (Primer momento)' : isV3 ? 'Visita 3 (Tercer momento · Salida y balance anual)' : 'Visita 2 (Segundo momento)'}`;

  const metaGrid = [
    { label: 'INSTITUCIÓN EDUCATIVA', value: ieName },
    { label: 'CÓDIGO DE LOCAL', value: codLocal },
    { label: 'UGEL', value: ugel },
    { label: 'RED EDUCATIVA', value: red ? `RED ${red}` : '—' },
    { label: 'FECHA DE VISITA', value: fechaVisita },
    { label: 'SEC. FORMACIÓN TÉCNICA', value: formacionTecnica ? 'Sí' : 'No' }
  ];

  const customTables = [];

  // -------------------------------------------------------------------------
  // II. DATOS DEL DIRECTOR(A)
  // -------------------------------------------------------------------------
  const dirData = resolveDirectorData(sub, colegio);
  const dirNombre = dirData.nombre;
  const dirDni = dirData.dni;
  const dirTel = dirData.telefono;
  const rawCond = dirData.condicion;
  const dirCond = rawCond === 'D' ? 'Designado (D)' : (rawCond === 'E' ? 'Encargado (E)' : (rawCond || sub.condicion || '—'));
  const dirCorreo = dirData.correo;

  customTables.push({
    title: 'II. DATOS DEL DIRECTOR(A)',
    minHeight: 45,
    tableHeaders: ['Apellidos y Nombres', 'DNI', 'Teléfono / Celular', 'Condición', 'Correo Electrónico'],
    tableRows: [
      [
        formatPersonName(dirNombre),
        dirDni,
        dirTel,
        dirCond,
        dirCorreo
      ]
    ],
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold' },
      1: { cellWidth: 65, halign: 'center' },
      2: { cellWidth: 75, halign: 'center' },
      3: { cellWidth: 85, halign: 'center' },
      4: { cellWidth: 126 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // III. DATOS DE LOS SUBDIRECTORES
  // -------------------------------------------------------------------------
  const subdirectores = Array.isArray(sub.subdirectores) && sub.subdirectores.length > 0 ? sub.subdirectores : [];
  const subdirRows = subdirectores.length > 0
    ? subdirectores.map((sd, i) => [
      String(i + 1),
      formatPersonName(sd.nombres || '—'),
      sd.dni || '—',
      sd.telefono || '—',
      sd.condicion === 'D' ? 'Designado (D)' : (sd.condicion === 'E' ? 'Encargado (E)' : (sd.condicion || '—')),
      sd.correo || '—'
    ])
    : [['—', 'No se consignaron subdirectores en esta visita.', '—', '—', '—', '—']];

  customTables.push({
    title: 'III. DATOS DE LOS SUBDIRECTORES',
    minHeight: 45,
    tableHeaders: ['N.°', 'Apellidos y Nombres', 'DNI', 'Teléfono / Celular', 'Condición', 'Correo Electrónico'],
    tableRows: subdirRows,
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 156 },
      2: { cellWidth: 60, halign: 'center' },
      3: { cellWidth: 70, halign: 'center' },
      4: { cellWidth: 75, halign: 'center' },
      5: { cellWidth: 126 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // TABLAS DE DOCENTES MONITOREADOS (SOLO VISITA 2)
  // -------------------------------------------------------------------------
  if (isV2) {
    let docData = sub.docentes;
    if (!docData || (!docData.momento1 && !docData.momento2)) {
      docData = migrateLegacyEbrTotals(sub);
    }

    const buildDocTable = (momentoRows, momentoNum, secRomano, titleText) => {
      const rows = momentoRows && momentoRows.length ? momentoRows : [];
      let totTotal = 0, totMonit = 0, totNoMonit = 0;
      const rubSums = {
        R1: [0, 0, 0, 0],
        R2: [0, 0, 0, 0],
        R3: [0, 0, 0, 0],
        R4: [0, 0, 0, 0],
        R5: [0, 0, 0, 0]
      };

      const tableRows = rows.map(r => {
        if (r.noAplica) {
          return [r.nivel, 'N/A', 'N/A', 'N/A', ...Array(20).fill('—')];
        }
        const t = Number(r.total) || 0;
        const m = Number(r.monitoreados) || 0;
        const nm = Math.max(0, t - m);
        totTotal += t;
        totMonit += m;
        totNoMonit += nm;

        const getRubCells = (rubId) => {
          const arr = Array.isArray(r[rubId]) ? r[rubId] : ['', '', '', ''];
          return [0, 1, 2, 3].map(idx => {
            const v = Number(arr[idx]) || 0;
            rubSums[rubId][idx] += v;
            return v > 0 ? String(v) : (arr[idx] === 0 || arr[idx] === '0' ? '0' : '—');
          });
        };

        return [
          r.nivel,
          t > 0 ? String(t) : '—',
          m > 0 ? String(m) : '—',
          nm > 0 ? String(nm) : (t > 0 ? '0' : '—'),
          ...getRubCells('R1'),
          ...getRubCells('R2'),
          ...getRubCells('R3'),
          ...getRubCells('R4'),
          ...getRubCells('R5')
        ];
      });

      // Fila TOTAL
      tableRows.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: String(totTotal), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: String(totMonit), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: String(totNoMonit), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        ...rubSums.R1.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R2.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R3.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R4.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R5.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } }))
      ]);

      const docColumnStyles = {
        0: { cellWidth: 55, fontStyle: 'bold', fontSize: 6.8 },
        1: { cellWidth: 23, halign: 'center', fontSize: 6.5 },
        2: { cellWidth: 23, halign: 'center', fontSize: 6.5 },
        3: { cellWidth: 23, halign: 'center', fontSize: 6.5 }
      };
      for (let c = 4; c < 24; c++) {
        docColumnStyles[c] = { cellWidth: 19.3, halign: 'center', fontSize: 6.2 };
      }

      customTables.push({
        title: `${secRomano}. ${titleText}`,
        subtitle: 'Rúbricas: R1 Involucra activamente · R2 Razonamiento y creatividad · R3 Evalúa y retroalimenta · R4 Clima de respeto · R5 Regula positivamente (Niveles I, II, III y IV)',
        minHeight: 85,
        head: [
          [
            { content: 'NIVEL', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'TOTAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'MONIT.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'NO MON.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'R1', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
            { content: 'R2', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
            { content: 'R3', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
            { content: 'R4', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
            { content: 'R5', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } }
          ],
          [
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV'
          ]
        ],
        tableRows: tableRows,
        columnStyles: docColumnStyles,
        styles: {
          cellPadding: { top: 3.5, right: 2, bottom: 3.5, left: 2 }
        }
      });
    };

    buildDocTable(
      (docData && docData.momento1) || [],
      1,
      'IV',
      'DATA DE DOCENTES MONITOREADOS DEL PRIMER MOMENTO POR NIVEL A LA FECHA DE LA VISITA'
    );

    buildDocTable(
      (docData && docData.momento2) || [],
      2,
      'V',
      'DATA DE DOCENTES MONITOREADOS DEL SEGUNDO MOMENTO POR NIVEL A LA FECHA DE LA VISITA'
    );
  }

  // -------------------------------------------------------------------------
  // ASPECTOS E INDICADORES (ESCALA: INICIO / PROCESO / LOGRADO)
  // -------------------------------------------------------------------------
  const secAspectosRomano = isV2 ? 'VI' : 'IV';
  const seccionesDef = getEbrSeccionesForVisita(visitaNum, fichaType);

  const respuestas = sub.respuestas || [];
  const projsInnovacion = Array.isArray(sub.proyectosInnovacion) ? sub.proyectosInnovacion.filter(p => p && p.trim()) : [];

  let globalItemIdx = 1;

  seccionesDef.forEach((sec, sIdx) => {
    let iniCount = 0, procCount = 0, logCount = 0, naCount = 0;

    const secRows = (sec.items || []).map(it => {
      const itemNum = it.num || globalItemIdx;
      globalItemIdx++;

      const resp = respuestas.find(r => r.id === it.id || r.num === itemNum) || {};
      const val = (resp.valor || '').toLowerCase();
      const obs = resp.observaciones ? resp.observaciones.trim() : '';

      if (val === 'inicio') iniCount++;
      else if (val === 'proceso') procCount++;
      else if (val === 'logrado') logCount++;
      else if (val === 'na') naCount++;

      const makeCell = (colVal, markColor) => {
        if (val === colVal) {
          return {
            content: '',
            raw: { isCheckmark: true, color: markColor },
            styles: { halign: 'center', valign: 'middle' }
          };
        }
        return { content: '', styles: { halign: 'center' } };
      };

      // Si es ítem de innovación y hay proyectos registrados
      let itemDescription = it.texto;
      if (it.evidencias) {
        itemDescription += `\n• Evidencias: ${it.evidencias}`;
      }
      if ((it.id === 'ge1_19' || it.id === 'ge2_17' || it.texto.toLowerCase().includes('innovación')) && projsInnovacion.length > 0) {
        itemDescription += `\n★ Proyectos / Buenas Prácticas: ${projsInnovacion.join('; ')}`;
      }

      return [
        String(itemNum),
        itemDescription,
        makeCell('inicio', [220, 38, 38]),
        makeCell('proceso', [217, 119, 6]),
        makeCell('logrado', [5, 150, 105]),
        makeCell('na', [71, 85, 105]),
        obs || '—'
      ];
    });

    // Fila resumen de sección
    secRows.push([
      {
        content: `TOTAL SECCIÓN — Inicio: ${iniCount}  ·  Proceso: ${procCount}  ·  Logrado: ${logCount}  ·  N/A: ${naCount}`,
        colSpan: 7,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [247, 249, 252],
          textColor: [18, 41, 77],
          fontSize: 7.8
        }
      }
    ]);

    const prefixNum = isV1 ? `4.${sIdx + 1}` : `6.${sIdx + 1}`;
    customTables.push({
      title: `${prefixNum} ${sec.nombre.toUpperCase()}`,
      minHeight: 70,
      tableHeaders: ['N.°', 'Aspecto / Criterio de Evaluación', 'Inicio', 'Proceso', 'Logrado', 'N/A', 'Observaciones'],
      tableRows: secRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 226, fontSize: 7.2 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 25 },
        5: { halign: 'center', cellWidth: 25 },
        6: { halign: 'left', cellWidth: 163, fontSize: 7 }
      },
      headStyles: {
        fillColor: [18, 41, 77],
        fontSize: 8,
        fontStyle: 'bold'
      },
      didDrawCell: (data) => {
        if (data.cell && data.cell.raw && data.cell.raw.isCheckmark) {
          const doc = data.doc;
          if (!doc) return;
          const cx = data.cell.x + data.cell.width / 2;
          const cy = data.cell.y + data.cell.height / 2;
          const col = data.cell.raw.color || [5, 150, 105];
          drawVectorCheckmark(doc, cx, cy, 7.5, col, 1.4);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // RESULTADO Y NIVEL DE CUMPLIMIENTO OFICIAL (UGEL 03 EBR)
  // -------------------------------------------------------------------------
  const ebrVisitaNum = isV2 ? 2 : 1;
  const maxPtsOficial = isV2 ? 69 : 57;
  let ebrPuntaje = (sub.puntaje !== undefined && sub.puntaje !== null) ? Number(sub.puntaje) : null;
  if ((ebrPuntaje === null || ebrPuntaje > maxPtsOficial) && Array.isArray(sub.respuestas) && sub.respuestas.length > 0) {
    let pSum = 0;
    const seenNums = new Set();
    const maxCount = isV2 ? 23 : 19;
    sub.respuestas.forEach(r => {
      let num = r?.num;
      if (!num && r?.id) {
        const m = String(r.id).match(/^(?:ge\d*|num)_?(\d+)$/);
        if (m) num = parseInt(m[1], 10);
      }
      if (num && num >= 1 && num <= maxCount && !seenNums.has(num)) {
        seenNums.add(num);
        const vL = String(r?.valor || '').toLowerCase();
        if (vL === 'logrado' || vL === 'si') pSum += 3;
        else if (vL === 'proceso') pSum += 2;
        else if (vL === 'inicio' || vL === 'no') pSum += 1;
      }
    });
    ebrPuntaje = Math.min(maxPtsOficial, pSum);
  } else if (ebrPuntaje !== null && ebrPuntaje > maxPtsOficial) {
    ebrPuntaje = maxPtsOficial;
  }
  if (ebrPuntaje === null) ebrPuntaje = 0;
  const ebrNivelObj = getNivelEbrGestion(ebrPuntaje, ebrVisitaNum);
  const momentoSubTitle = isV2
    ? 'Escala oficial 2do Momento: Inicio (0–23 pts) · Proceso (24–46 pts) · Logrado (47–69 pts)'
    : 'Escala oficial 1er Momento: Inicio (0–19 pts) · Proceso (20–38 pts) · Logrado (39–57 pts)';

  const isLogradoRow = ebrPuntaje >= (isV2 ? 47 : 39);
  const isProcesoRow = ebrPuntaje >= (isV2 ? 24 : 20) && ebrPuntaje <= (isV2 ? 46 : 38);
  const isInicioRow = ebrPuntaje <= (isV2 ? 23 : 19);

  customTables.push({
    title: 'NIVEL DE CUMPLIMIENTO OFICIAL (SEGÚN PUNTAJE OBTENIDO)',
    subtitle: `${momentoSubTitle} — Puntaje obtenido: ${ebrPuntaje} de ${maxPtsOficial} puntos (${ebrNivelObj.pct}%) · Nivel: ${ebrNivelObj.nivel.toUpperCase()}`,
    minHeight: 70,
    tableHeaders: ['Nivel de cumplimiento', 'Rango oficial', 'Puntaje obtenido', 'Criterio pedagógico'],
    tableRows: [
      [
        { content: 'LOGRADO' + (isLogradoRow ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255], textColor: [4, 120, 87] } },
        { content: isV2 ? 'De 47 a 69 pts' : 'De 39 a 57 pts', styles: { halign: 'center', fontStyle: 'bold', fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255] } },
        { content: isLogradoRow ? `${ebrPuntaje} pts (${ebrNivelObj.pct}%)` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255] } },
        { content: 'Evidencia un nivel óptimo en las condiciones y compromisos de gestión escolar.', styles: { fontSize: 7.2, fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255] } }
      ],
      [
        { content: 'PROCESO' + (isProcesoRow ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255], textColor: [180, 83, 9] } },
        { content: isV2 ? 'De 24 a 46 pts' : 'De 20 a 38 pts', styles: { halign: 'center', fontStyle: 'bold', fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255] } },
        { content: isProcesoRow ? `${ebrPuntaje} pts (${ebrNivelObj.pct}%)` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255] } },
        { content: 'En proceso de implementación; requiere consolidar acciones de mejora.', styles: { fontSize: 7.2, fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255] } }
      ],
      [
        { content: 'INICIO' + (isInicioRow ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255], textColor: [185, 28, 28] } },
        { content: isV2 ? 'De 0 a 23 pts' : 'De 0 a 19 pts', styles: { halign: 'center', fontStyle: 'bold', fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255] } },
        { content: isInicioRow ? `${ebrPuntaje} pts (${ebrNivelObj.pct}%)` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255] } },
        { content: 'Requiere asistencia técnica prioritaria para el cumplimiento de las condiciones de gestión.', styles: { fontSize: 7.2, fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255] } }
      ]
    ],
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 80 },
      2: { cellWidth: 80 },
      3: { cellWidth: 231 }
    }
  });

  // -------------------------------------------------------------------------
  // LOGROS, ASPECTOS POR MEJORAR Y RECOMENDACIONES
  // -------------------------------------------------------------------------
  const secLogrosRomano = isV1 ? 'V' : 'VII';
  const logrosVal = sub.logros || (sub.sintesis && sub.sintesis[0] && sub.sintesis[0].logros) || '—';
  const aspectosVal = sub.aspectosMejora || (sub.sintesis && sub.sintesis[0] && (sub.sintesis[0].dificultades || sub.sintesis[0].aspectosMejora)) || '—';
  const recsVal = sub.recomendaciones || (sub.sintesis && sub.sintesis[0] && sub.sintesis[0].recomendaciones) || '—';

  customTables.push({
    title: `${secLogrosRomano}. LOGROS, ASPECTOS POR MEJORAR Y RECOMENDACIONES`,
    minHeight: 50,
    tableHeaders: ['Política Regional', 'Logros', 'Aspectos de mejora', 'Recomendaciones'],
    tableRows: [
      [
        'P1 Instituciones educativas que aseguran aprendizajes',
        logrosVal,
        aspectosVal,
        recsVal
      ]
    ],
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold', fontSize: 7.5 },
      1: { cellWidth: 133, fontSize: 7.2 },
      2: { cellWidth: 133, fontSize: 7.2 },
      3: { cellWidth: 135, fontSize: 7.2 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // COMPROMISOS
  // -------------------------------------------------------------------------
  const secCompRomano = isV1 ? 'VI' : 'VIII';
  const compDirVal = (sub.compromisos && sub.compromisos.directivo) || sub.compromisoDirector || '—';
  const compEspVal = (sub.compromisos && sub.compromisos.especialista) || sub.compromisoMonitor || '—';

  customTables.push({
    title: `${secCompRomano}. COMPROMISOS ASUMIDOS`,
    minHeight: 50,
    tableHeaders: ['Actor Responsable', 'Compromiso Asumido'],
    tableRows: [
      ['Del directivo de la I.E.', compDirVal],
      ['Del especialista / monitor UGEL 03', compEspVal]
    ],
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold', fontSize: 8 },
      1: { cellWidth: 351, fontSize: 7.5 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // FIRMAS DINÁMICAS
  // -------------------------------------------------------------------------
  const signaturesList = [];
  // 1. Director
  signaturesList.push({
    cargo: 'Director(a) de la Institución Educativa',
    nombre: formatPersonName(dirNombre),
    entidad: ieName,
    leyenda: `DNI: ${dirDni}`
  });

  // 2. Subdirectores
  subdirectores.forEach(sd => {
    signaturesList.push({
      cargo: 'Subdirector(a) de la I.E.',
      nombre: formatPersonName(sd.nombres || 'Subdirector(a)'),
      entidad: ieName,
      leyenda: `DNI: ${sd.dni || '—'}`
    });
  });

  // 3. Especialista
  const respClean = (sub.responsable && !sub.responsable.includes('@') && !/^\d+$/.test(String(sub.responsable).trim()))
    ? sub.responsable
    : 'Especialista UGEL 03';
  signaturesList.push({
    cargo: 'Especialista / Monitor de Gestión Escolar',
    nombre: formatPersonName(respClean),
    entidad: 'UGEL 03 · AGEBRE',
    leyenda: `DNI: ${sub.monitorDni || '—'}`
  });

  const pdfFilename = `Ficha_Gestion_EBR_${isV1 ? 'Visita1' : 'Visita2'}_${(ieName || 'IE').replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`;

  // Invocar creador oficial de documento PDF
  return await createOfficialPdfDocument({
    title,
    subtitle,
    orientation: 'portrait',
    introParagraph: `En Lima, a la fecha ${fechaVisita}, se aplicó la Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar en la IE ${ieName} (${codLocal}), correspondiente a la ${isV1 ? 'Visita 1 (Primer momento)' : 'Visita 2 (Segundo momento)'}.`,
    metaGrid,
    customTables,
    signatures: signaturesList,
    lugarFecha: `Lima, ${fechaVisita}`,
    filename: pdfFilename,
    marcaBorrador: sub.esBorrador === true
  });
}
