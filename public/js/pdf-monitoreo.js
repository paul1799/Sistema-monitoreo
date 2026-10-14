/* =========================================================================
   pdf-monitoreo.js — Generador oficial de documentos PDF para Monitoreo
   UGEL 03 · AGEBRE · Fase 1 / Fase 2
   Contiene los reportes oficiales de:
   - Ficha Individual EBR Gestión Escolar (Visita 1 y 2)
   - Ficha Individual JEC (Jornada Escolar Completa)
   - Ficha Individual de Monitoreo / Acompañamiento pedagógico y directivo
   - Reporte Consolidado de Monitoreo (V1 y V2) con análisis multidimensional
   - Reporte de Padrón Oficial y Cobertura de Instituciones Educativas
   ========================================================================= */

import {
  getJsPdf,
  createOfficialPdfDocument,
  formatDate,
  toTitleCase,
  getLimaDateStr,
  sanitizeFilename,
  plural,
  drawVectorCheckmark,
  drawVectorCheckbox,
  ensureUnicodeFont,
  sanitizePdfText,
  drawOfficialHeader,
  formatPersonName
} from './pdf-core.js?v=20261014_v1';

import {
  isFichaEbrGestionEscolar,
  RUBRICAS_OBSERVACION_AULA,
  EBR_GESTION_VISITA_1_SECCIONES,
  EBR_GESTION_VISITA_2_SECCIONES,
  migrateLegacyEbrTotals
} from './ebr-gestion.js?v=20261012_v5';

import {
  isFichaJec,
  JEC_SECCIONES,
  getNivelLogroJec
} from './jec-monitoreo.js?v=20261012_v5';

import {
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  ESPECIALISTA_JEC_OFICIAL,
  getNivelCoordTutoriaJec,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  calcScore,
  getNivelEbrGestion,
  getReglaNivelEbrGestion,
  getMomentoVisitaEbr,
  isFichaEbrEbePrite
} from './calcEngine.js?v=20260928_v12';

import {
  getHallazgosClave,
  computeItemAgg
} from './reportes-datos.js?v=20260929_v18';

import {
  isFichaCebeGestion,
  CEBE_SECCIONES
} from './cebe-gestion.js?v=20261013_v7';
import {
  isFichaPriteGestion,
  PRITE_SECCIONES
} from './prite-gestion.js?v=20261014_v1';

export const SISTEMA_NOMBRE_OFICIAL = 'Sistema de Fichas de Monitoreo';

/**
 * Exporta una Ficha de Monitoreo Individual a PDF en orientación VERTICAL (Portrait)
 */
/**
 * Textos oficiales verbatim de los 21 ítems de la Ficha de Monitoreo al Directivo de IE
 * Fuente: Instrumento oficial UGEL 03 / MINEDU 2026
 */
export const OFFICIAL_DIRECTIVO_ITEMS = {
  1: "La IE cuenta con instrumentos de gestión aprobados mediante RD y evidencia la articulación entre el PEI y el PAT, de modo que el diagnóstico, los objetivos y las metas institucionales se traducen en acciones planificadas para el año escolar.",
  2: "El PCI de la IE se encuentra actualizado y contiene el Plan de Estudios y orientaciones para la planificación, mediación y evaluación formativa, en correspondencia con las características y necesidades de los estudiantes.",
  3: "El PAT de la IE articula los objetivos y metas del PEI con la programación de actividades para cada compromiso de gestión escolar y la calendarización de las horas lectivas.",
  4: "En la IE se cuenta con evidencia de seguimiento periódico a las actividades planificadas en el PAT y se registra su avance.",
  5: "En la IE se evalúa y se toman decisiones para mejorar o reajustar las actividades del PAT a partir de un proceso de evaluación continua.",
  6: "El directivo realiza seguimiento periódico a la estrategia de Refuerzo Escolar y verifica la implementación de las acciones previstas.",
  7: "El directivo implementa, realiza seguimiento y fortalece el uso de los materiales educativos (textos y cuadernos de trabajo entregados en el año en curso).",
  8: "El directivo planifica, da seguimiento y evalúa la implementación del Plan Lector de la IE.",
  9: "El directivo planifica, da seguimiento y evalúa la implementación del Proyecto Educativo Ambiental Integrado (PEAI) de la IE.",
  10: "El directivo planifica, implementa y evalúa la Gestión del Riesgo de Desastres (GRD) en la IE, incluyendo acciones de prevención, mitigación y preparación para la respuesta.",
  11: "Los docentes de la IE cuentan con la planificación de la unidad didáctica correspondiente al grado y sección a su cargo, vigente para el periodo en curso.",
  12: "Los docentes de la IE cuentan con la planificación de sus sesiones o actividades de aprendizaje correspondientes al grado y sección a su cargo, vigente para el periodo en curso y articulada con la unidad didáctica correspondiente.",
  13: "El directivo brinda asesoría pedagógica a los docentes para mejorar la planificación curricular, orientándola hacia el desarrollo de las competencias de los estudiantes.",
  14: "En la IE se promueve que los docentes realicen la planificación curricular de manera colegiada (programación anual y unidades didácticas) evidenciando acuerdos pedagógicos.",
  15: "En la IE se cuenta con un cronograma de monitoreo de la práctica pedagógica en el aula del presente año y se han ejecutado las visitas programadas.",
  16: "En la IE se organiza e interpreta la información obtenida a partir del monitoreo, identificando logros y oportunidades de mejora de la práctica pedagógica docente.",
  17: "En la IE se identifican, plantean e implementan propuestas de mejora que atienden las dificultades identificadas en la práctica pedagógica a partir del monitoreo.",
  18: "En la IE se realiza un diagnóstico de necesidades formativas docentes y se implementa al menos una acción de fortalecimiento que responde a una necesidad identificada en el diagnóstico.",
  19: "La IE planifica e implementa (o viene implementando) al menos un proyecto de innovación pedagógica formulado, cuyos resultados son verificables y se difunden a la comunidad educativa.",
  20: "El directivo gestiona la entrega oportuna de los informes de progreso de las competencias de los estudiantes que contienen el nivel de logro alcanzado en cada competencia y, cuando corresponde, las conclusiones descriptivas de los aprendizajes.",
  21: "En la IE se analizan los resultados de aprendizaje y, a partir de ellos, se implementan estrategias pedagógicas para la mejora de los aprendizajes."
};

export const OFFICIAL_DIRECTIVO_DIMENSIONS = [
  { id: 'A', nombre: 'A. INSTRUMENTOS DE GESTIÓN ESCOLAR', itemsCount: 5, startIdx: 1 },
  { id: 'B', nombre: 'B. IMPLEMENTACIÓN DE ESTRATEGIAS Y RECURSOS EDUCATIVOS', itemsCount: 5, startIdx: 6 },
  { id: 'C', nombre: 'C. PLANIFICACIÓN CURRICULAR', itemsCount: 4, startIdx: 11 },
  { id: 'D', nombre: 'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA', itemsCount: 3, startIdx: 15 },
  { id: 'E', nombre: 'E. FORMACIÓN CONTINUA E INNOVACIÓN EDUCATIVA', itemsCount: 2, startIdx: 18 },
  { id: 'F', nombre: 'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES', itemsCount: 2, startIdx: 20 }
];

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

  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const codLocal = (sub.ie && sub.ie.codigoLocal) || sub.codigoModular || (colegio ? (colegio.codigoLocal || colegio.codigoModular) : '') || '—';
  const red = (sub.ie && sub.ie.red) || sub.red || (colegio ? colegio.rei : '') || '—';
  const ugel = sub.ugel || 'UGEL 03';
  const formacionTecnica = (sub.ie && sub.ie.formacionTecnica !== undefined) ? sub.ie.formacionTecnica : (sub.formacionTecnica === true);

  const title = 'FICHA DE MONITOREO Y ASISTENCIA TÉCNICA A LA GESTIÓN ESCOLAR UGEL-03-EBR';
  const subtitle = `En el marco de la RM N.° 501-2025-MINEDU · ${isV1 ? 'Visita 1 (Primer momento)' : 'Visita 2 (Segundo momento)'}`;

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
  const dirObj = sub.director && typeof sub.director === 'object' ? sub.director : {};
  const dirNombre = dirObj.nombres || (typeof sub.director === 'string' ? sub.director : '') || (colegio && colegio.director ? colegio.director.nombre : '—');
  const dirDni = dirObj.dni || sub.directorDni || (colegio && colegio.director ? colegio.director.dni : '—') || '—';
  const dirTel = dirObj.telefono || '—';
  const dirCond = dirObj.condicion === 'D' ? 'Designado (D)' : (dirObj.condicion === 'E' ? 'Encargado (E)' : (dirObj.condicion || sub.condicion || '—'));
  const dirCorreo = dirObj.correo || '—';

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
  const secAspectosRomano = isV1 ? 'IV' : 'VI';
  const seccionesDef = isV1
    ? (fichaType.seccionesVisita1 || EBR_GESTION_VISITA_1_SECCIONES)
    : (fichaType.seccionesVisita2 || EBR_GESTION_VISITA_2_SECCIONES);

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

/**
 * Exporta la Ficha oficial "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
 * a PDF en formato vertical oficial, reproduciendo con exactitud las secciones III, IV, V (R1-R5),
 * VI (31 Indicadores con Hallazgos) y VII (Tabla Oficial de Nivel MSE JEC)
 */
export async function exportJecFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const codModular = sub.codigoModular || (sub.ie && sub.ie.codigoModular) || (colegio ? (colegio.codigoModular || colegio.codigoLocal) : '') || '—';
  const rei = sub.rei || sub.red || (sub.ie && (sub.ie.rei || sub.ie.red)) || (colegio ? colegio.rei : '') || '—';
  const ugel = sub.ugel || 'UGEL 03';

  // Extras
  const subExtras = sub.extras || [];
  const getExtraVal = (pattern) => {
    const found = subExtras.find(x => x && x.label && norm(x.label).includes(norm(pattern)));
    return found ? found.value : '';
  };

  const secciones = sub.secciones || getExtraVal('secciones') || '—';
  const estudiantes = sub.estudiantes || getExtraVal('estudiantes') || '—';
  const docentesTotal = sub.docentesTotal || getExtraVal('docentes') || '—';

  let formacionTecnica = false;
  if (sub.formacionTecnica !== undefined) formacionTecnica = sub.formacionTecnica === true;
  else if (sub.ie && sub.ie.formacionTecnica !== undefined) formacionTecnica = sub.ie.formacionTecnica === true;
  else {
    const ftVal = getExtraVal('formacion tecnica') || getExtraVal('técnica');
    formacionTecnica = ftVal === 'Sí' || ftVal === 'si' || ftVal === true;
  }

  const title = 'FICHA DE MONITOREO Y ASISTENCIA TÉCNICA A LA IMPLEMENTACIÓN DEL MODELO JEC';
  const subtitle = 'Modelo de Servicio Educativo Jornada Escolar Completa — UGEL 03 · Lima Metropolitana';

  const metaGrid = [
    { label: 'INSTITUCIÓN EDUCATIVA', value: ieName },
    { label: 'CÓDIGO MODULAR', value: codModular },
    { label: 'UGEL', value: ugel },
    { label: 'REI', value: rei ? `REI ${rei}` : '—' },
    { label: 'FECHA DE VISITA', value: fechaVisita },
    { label: 'SECCIONES', value: String(secciones) },
    { label: 'CANTIDAD ESTUDIANTES', value: String(estudiantes) },
    { label: 'CANTIDAD DOCENTES', value: String(docentesTotal) },
    { label: 'SEC. FORMACIÓN TÉCNICA', value: formacionTecnica ? 'Sí' : 'No' }
  ];

  const customTables = [];

  const jecRespName = (sub.responsable && !sub.responsable.includes('@') && !/^\d+$/.test(String(sub.responsable).trim()))
    ? sub.responsable
    : ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
  const jecRespCargo = sub.responsableCargo || ESPECIALISTA_JEC_OFICIAL.cargo;

  // -------------------------------------------------------------------------
  // III. DATOS DEL ESPECIALISTA QUE REALIZA EL MONITOREO Y ASISTENCIA TÉCNICA
  // -------------------------------------------------------------------------
  customTables.push({
    title: 'III. DATOS DEL ESPECIALISTA QUE REALIZA EL MONITOREO Y ASISTENCIA TÉCNICA',
    minHeight: 35,
    tableHeaders: ['Especialista Responsable', 'Cargo', 'Dependencia / Entidad'],
    tableRows: [
      [
        formatPersonName(jecRespName || ESPECIALISTA_JEC_OFICIAL.nombresApellidos),
        jecRespCargo,
        ESPECIALISTA_JEC_OFICIAL.entidad
      ]
    ],
    columnStyles: {
      0: { cellWidth: 200, fontStyle: 'bold' },
      1: { cellWidth: 150 },
      2: { cellWidth: 151 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // IV. DATOS DEL DIRECTIVO QUE BRINDA LA INFORMACIÓN SOLICITADA
  // -------------------------------------------------------------------------
  const dirObj = sub.director && typeof sub.director === 'object' ? sub.director : {};
  const dirNombre = dirObj.nombres || (typeof sub.director === 'string' ? sub.director : '') || (colegio && colegio.director ? colegio.director.nombre : '—');
  const dirDni = dirObj.dni || sub.directorDni || (colegio && colegio.director ? colegio.director.dni : '—') || '—';
  const dirTel = dirObj.telefono || '—';
  const dirCorreo = dirObj.correo || '—';

  customTables.push({
    title: 'IV. DATOS DEL DIRECTIVO QUE BRINDA LA INFORMACIÓN SOLICITADA',
    minHeight: 45,
    tableHeaders: ['Nombres y Apellido', 'DNI', 'Teléfono celular', 'Correo Electrónico'],
    tableRows: [
      [
        formatPersonName(dirNombre),
        dirDni,
        dirTel,
        dirCorreo
      ]
    ],
    columnStyles: {
      0: { cellWidth: 180, fontStyle: 'bold' },
      1: { cellWidth: 70, halign: 'center' },
      2: { cellWidth: 80, halign: 'center' },
      3: { cellWidth: 181 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // V. DATA DE DOCENTES MONITOREADOS A LA FECHA DE LA VISITA NIVEL SECUNDARIA
  // -------------------------------------------------------------------------
  const docData = sub.docentes || sub.docentesMonitoreo || {};

  const buildJecDocTable = (momentoKey, letraSub, titleText) => {
    let row = docData[momentoKey] || {};
    if (Array.isArray(row)) {
      row = row.find(r => r.nivel === 'Secundaria') || row[0] || {};
    }
    const t = Number(row.total) || 0;
    const m = Number(row.monitoreados) || 0;
    const nm = Math.max(0, t - m);

    const pctM = t > 0 ? Math.round((m / t) * 100) + '%' : '—';
    const pctNm = t > 0 ? Math.round((nm / t) * 100) + '%' : '—';

    const rubKeys = ['R1', 'R2', 'R3', 'R4', 'R5'];

    // Fila 1: Cantidades
    const cantCells = rubKeys.flatMap(rId => {
      const arr = Array.isArray(row[rId]) ? row[rId] : ['', '', '', ''];
      return [0, 1, 2, 3].map(idx => {
        const val = arr[idx] !== undefined && arr[idx] !== '' ? String(arr[idx]) : '—';
        return { content: val, styles: { halign: 'center' } };
      });
    });

    // Fila 2: Porcentajes
    const pctCells = rubKeys.flatMap(rId => {
      const arr = Array.isArray(row[rId]) ? row[rId] : ['', '', '', ''];
      return [0, 1, 2, 3].map(idx => {
        const val = Number(arr[idx]) || 0;
        const p = (val > 0 && m > 0) ? Math.round((val / m) * 100) + '%' : (arr[idx] !== '' && arr[idx] !== undefined ? '0%' : '—');
        return { content: p, styles: { halign: 'center', fontSize: 6.2, fontStyle: 'italic', textColor: [70, 70, 70] } };
      });
    });

    const tableRows = [
      [
        { content: t > 0 ? String(t) : '—', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: `${m > 0 ? m : '—'}\n(${pctM})`, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: `${nm > 0 ? nm : (t > 0 ? '0' : '—')}\n(${pctNm})`, styles: { halign: 'center', fontStyle: 'bold' } },
        ...cantCells
      ],
      [
        { content: 'PORCENTAJE', styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.2, fillColor: [245, 247, 250] } },
        { content: pctM, styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.2, fillColor: [245, 247, 250] } },
        { content: pctNm, styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.2, fillColor: [245, 247, 250] } },
        ...pctCells
      ]
    ];

    const docColStyles = {
      0: { cellWidth: 42, halign: 'center', fontSize: 6.8 },
      1: { cellWidth: 46, halign: 'center', fontSize: 6.5 },
      2: { cellWidth: 46, halign: 'center', fontSize: 6.5 }
    };
    for (let c = 3; c < 23; c++) {
      docColStyles[c] = { cellWidth: 18.85, halign: 'center', fontSize: 6.2 };
    }

    customTables.push({
      title: `V. DATA DE DOCENTES MONITOREADOS A LA FECHA DE LA VISITA NIVEL SECUNDARIA — ${letraSub}) ${titleText}`,
      subtitle: 'Rúbricas oficiales: R1 Involucra · R2 Razonamiento · R3 Retroalimenta · R4 Respeto · R5 Comportamiento (Niveles I, II, III y IV)',
      minHeight: 55,
      head: [
        [
          { content: 'TOTAL DOCENTES', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
          { content: 'DOCENTES MONIT.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
          { content: 'DOCENTES NO MON.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
          { content: 'R1 INVOLUCRA', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
          { content: 'R2 RAZONAMIENTO', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
          { content: 'R3 RETROALIMENTA', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
          { content: 'R4 RESPETO', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
          { content: 'R5 COMPORTAMIENTO', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } }
        ],
        [
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV'
        ]
      ],
      tableRows,
      columnStyles: docColStyles,
      styles: {
        cellPadding: { top: 3, right: 1.5, bottom: 3, left: 1.5 }
      }
    });
  };

  buildJecDocTable('momento1', 'a', '1er monitoreo');
  buildJecDocTable('momento2', 'b', '2do monitoreo');

  // -------------------------------------------------------------------------
  // VI. COMPONENTES E INDICADORES DE MONITOREO (31 ÍTEMS CON HALLAZGOS)
  // -------------------------------------------------------------------------
  const respuestas = sub.respuestas || [];
  const hallazgosMap = sub.observacionesItems || {};
  let totalSi = 0;
  let totalNo = 0;

  JEC_SECCIONES.forEach(sec => {
    let secSi = 0, secNo = 0;

    const secRows = (sec.items || []).map(it => {
      const resp = respuestas.find(r => r.id === it.id || Number(r.num) === Number(it.num)) || {};
      const val = (resp.valor || '').toLowerCase();
      const hallazgo = resp.hallazgos || resp.observaciones || hallazgosMap[it.id] || '—';

      const isSi = val === 'si' || val === 'sí';
      const isNo = val === 'no';

      if (isSi) { secSi++; totalSi++; }
      else if (isNo) { secNo++; totalNo++; }

      const makeCheckCell = (active, color) => {
        if (active) {
          return {
            content: '',
            raw: { isCheckmark: true, color },
            styles: { halign: 'center', valign: 'middle' }
          };
        }
        return { content: '', styles: { halign: 'center' } };
      };

      let itemDesc = it.texto;
      if (it.evidencia) {
        itemDesc += `\n• Evidencia sugerida: ${it.evidencia}`;
      }

      return [
        String(it.num),
        itemDesc,
        makeCheckCell(isSi, [5, 150, 105]),
        makeCheckCell(isNo, [220, 38, 38]),
        hallazgo || '—'
      ];
    });

    // Fila resumen por componente
    secRows.push([
      {
        content: `TOTAL ${sec.nombre.toUpperCase()} — Sí: ${secSi}  ·  No: ${secNo}`,
        colSpan: 5,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [240, 244, 250],
          textColor: [18, 41, 77],
          fontSize: 7.5
        }
      }
    ]);

    customTables.push({
      title: `VI. ${sec.nombre.toUpperCase()}`,
      subtitle: 'Registra en la columna "Hallazgos" información breve y objetiva sobre lo verificado en cada ítem.',
      minHeight: 70,
      tableHeaders: ['N.°', 'Indicador / Aspecto Verificado', 'Sí', 'No', 'Hallazgos'],
      tableRows: secRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 260, fontSize: 7.2 },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'left', cellWidth: 177, fontSize: 7 }
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
  // VII. NIVEL DE IMPLEMENTACIÓN DEL MSE JEC (TABLA OFICIAL DE RESULTADOS)
  // -------------------------------------------------------------------------
  const conteoFinalSi = sub.conteo_si !== undefined ? sub.conteo_si : totalSi;
  const nivelFinal = getNivelLogroJec(conteoFinalSi);

  customTables.push({
    title: 'VII. NIVEL DE IMPLEMENTACIÓN DEL MSE JEC',
    subtitle: 'Nota: El nivel de implementación se determina a partir del total de respuestas afirmativas registradas en la ficha (MINEDU).',
    minHeight: 50,
    tableHeaders: ['Nivel de Implementación', 'Rango Oficial de Respuestas "Sí"', 'Resultado Obtenido'],
    tableRows: [
      [
        'Implementación lograda',
        'De 24 a 31 respuestas "Sí"',
        conteoFinalSi >= 24 ? `✓ NIVEL ALCANZADO (${conteoFinalSi} respuestas "Sí")` : '—'
      ],
      [
        'Implementación parcial',
        'De 12 a 23 respuestas "Sí"',
        (conteoFinalSi >= 12 && conteoFinalSi <= 23) ? `✓ NIVEL ALCANZADO (${conteoFinalSi} respuestas "Sí")` : '—'
      ],
      [
        'Implementación incipiente',
        'De 0 a 11 respuestas "Sí"',
        conteoFinalSi <= 11 ? `✓ NIVEL ALCANZADO (${conteoFinalSi} respuestas "Sí")` : '—'
      ]
    ],
    columnStyles: {
      0: { cellWidth: 170, fontStyle: 'bold' },
      1: { cellWidth: 170, halign: 'center' },
      2: { cellWidth: 171, halign: 'center', fontStyle: 'bold' }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    },
    didParseCell: (data) => {
      // Resaltar la fila ganadora
      if (data.section === 'body') {
        const isTargetRow = (data.row.index === 0 && conteoFinalSi >= 24) ||
          (data.row.index === 1 && conteoFinalSi >= 12 && conteoFinalSi <= 23) ||
          (data.row.index === 2 && conteoFinalSi <= 11);
        if (isTargetRow) {
          data.cell.styles.fillColor = conteoFinalSi >= 24 ? [220, 252, 231] : (conteoFinalSi >= 12 ? [254, 243, 199] : [254, 226, 226]);
          data.cell.styles.textColor = conteoFinalSi >= 24 ? [21, 128, 61] : (conteoFinalSi >= 12 ? [180, 83, 9] : [185, 28, 28]);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // VIII. COMPROMISOS Y OBSERVACIONES
  // -------------------------------------------------------------------------
  const compDir = sub.compromisoDirector || (sub.compromisos && sub.compromisos.directivo) || '—';
  const compEsp = sub.compromisoMonitor || (sub.compromisos && sub.compromisos.especialista) || '—';
  const obsGen = sub.observaciones || '—';

  customTables.push({
    title: 'VIII. COMPROMISOS ASUMIDOS Y OBSERVACIONES GENERALES',
    minHeight: 45,
    tableHeaders: ['Actor / Aspecto', 'Compromiso / Detalle Registrado'],
    tableRows: [
      ['Compromiso del Directivo de la I.E.', compDir],
      ['Compromiso del Especialista / Monitor UGEL 03', compEsp],
      ['Observaciones Generales de la Visita', obsGen]
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
  // FIRMAS
  // -------------------------------------------------------------------------
  const signaturesList = [
    {
      cargo: 'Director(a) de la Institución Educativa',
      nombre: formatPersonName(dirNombre),
      entidad: ieName,
      leyenda: `DNI: ${dirDni}`
    },
    {
      cargo: 'Especialista de JEC',
      nombre: formatPersonName(jecRespName || ESPECIALISTA_JEC_OFICIAL.nombresApellidos),
      entidad: ESPECIALISTA_JEC_OFICIAL.entidad,
      leyenda: `Cargo: ${jecRespCargo}`
    }
  ];

  const pdfFilename = `Ficha_JEC_${(ieName || 'IE').replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`;

  return await createOfficialPdfDocument({
    title,
    subtitle,
    orientation: 'portrait',
    introParagraph: `En Lima, a la fecha ${fechaVisita}, se procedió a realizar la jornada de monitoreo y asistencia técnica a la implementación del Modelo de Servicio Educativo Jornada Escolar Completa (JEC) en la IE ${ieName} (${codModular}), a cargo de la especialista de JEC ${jecRespName || ESPECIALISTA_JEC_OFICIAL.nombresApellidos}.`,
    metaGrid,
    customTables,
    signatures: signaturesList,
    lugarFecha: `Lima, ${fechaVisita}`,
    filename: pdfFilename,
    marcaBorrador: sub.esBorrador === true
  });
}

/**
 * Exporta una Ficha de Monitoreo Individual a PDF en orientación VERTICAL (Portrait)
 */
export async function exportFichaIndividualPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  if (isFichaEbrGestionEscolar(fichaType)) {
    return await exportEbrGestionFichaPdf(sub, fichaType, colegio, downloadConfig);
  }

  if (isFichaJec(fichaType)) {
    return await exportJecFichaPdf(sub, fichaType, colegio, downloadConfig);
  }

  const rawTypeName = (fichaType.nombre || 'EVALUACIÓN').trim();
  const isNivel14 = fichaType.tipoRespuesta === 'nivel_1_4' || (fichaType.id || '').includes('directivo') || rawTypeName.toLowerCase().includes('directivo');

  // F5: Título limpio sin duplicaciones
  const title = /^ficha\s+de\s+monitoreo/i.test(rawTypeName)
    ? rawTypeName.toUpperCase()
    : `FICHA DE MONITOREO — ${rawTypeName.toUpperCase()}`;

  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const numVisita = sub.visita ? `Visita N.° ${sub.visita}` : 'Visita única';
  const isJecFicha = isFichaEspecialistaJec(fichaType) || isFichaEspecialistaJec(sub);
  const responsable = isJecFicha
    ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos
    : ((sub.responsable && !/^\d+$/.test(String(sub.responsable).trim()) && !sub.responsable.includes('@')) ? sub.responsable : 'Especialista UGEL 03');
  const director = sub.director || (colegio && colegio.director ? colegio.director.nombre : '—');
  const ugel = sub.ugel || 'UGEL 03';
  const red = sub.red || (colegio ? colegio.rei : '—');

  // Párrafo introductorio oficial (opcional, activo por defecto)
  let introParagraph = '';
  if (downloadConfig.incluirIntro !== false) {
    introParagraph = `En la ciudad de Lima, con fecha ${fechaVisita}, se procedió a realizar la jornada de monitoreo y acompañamiento institucional correspondiente a la ${numVisita} en la institución educativa ${ieName}, perteneciente a la ${ugel} y ${red ? 'RED/REI ' + red : 'jurisdicción asignada'}, a cargo del especialista ${responsable}, con la presencia y coordinación de la dirección escolar a cargo de ${director}. A continuación, se detallan los resultados obtenidos y los compromisos asumidos.`;
  }

  // Extraer valores adicionales de cabecera si están guardados en sub.extras
  const subExtras = sub.extras || [];
  const getExtraVal = (pattern) => {
    const found = subExtras.find(x => x && x.label && x.label.toLowerCase().includes(pattern.toLowerCase()));
    return found ? found.value : '';
  };

  const directorDni = sub.directorDni || getExtraVal('dni del directivo') || (colegio && colegio.director ? colegio.director.dni : '') || '';
  const monitorDni = sub.monitorDni || getExtraVal('dni del monitor') || '';
  const condicion = sub.condicion || getExtraVal('condición') || getExtraVal('condicion') || (colegio ? colegio.tipoGestion : '') || '';
  const nivelAtencion = sub.nivelAtencion || getExtraVal('nivel educativo') || (colegio ? (colegio.nivelServicio || colegio.modalidad) : '') || '';
  const turnoAtencion = sub.turnoAtencion || getExtraVal('turno de atención') || getExtraVal('turno de atencion') || (colegio ? colegio.turnos : '') || '';
  const turnoVisitado = sub.turnoVisitado || getExtraVal('turno visitado') || '';
  const horaInicio = sub.horaInicio || getExtraVal('hora de inicio') || '';
  const horaTermino = sub.horaTermino || getExtraVal('hora de término') || getExtraVal('hora de termino') || '';
  const horarioStr = (horaInicio && horaTermino) ? `${horaInicio} – ${horaTermino}` : (horaInicio || horaTermino || '—');
  const codLocal = sub.codigoModular || (colegio ? (colegio.codigoLocal || colegio.codigoModular) : '') || '';

  const isCoordTutoria = isFichaCoordTutoriaJec(fichaType);
  let tutoriaPts = sub.puntaje;
  let tutoriaNivel = sub.nivel_cumplimiento;
  let tutoriaDesc = sub.descripcion_cumplimiento;
  let tutoriaPct = null;

  if (isCoordTutoria) {
    if (tutoriaPts === undefined || tutoriaPts === null || !tutoriaNivel) {
      const stats = calcScore(sub.respuestas || [], { ...fichaType, regla_nivel: fichaType.regla_nivel || REGLA_NIVEL_COORD_TUTORIA_JEC });
      tutoriaPts = stats.puntaje;
      tutoriaNivel = stats.estado.nivel;
      tutoriaDesc = stats.estado.descripcion;
      tutoriaPct = stats.pct;
    } else {
      tutoriaPct = Math.round((tutoriaPts / 63) * 100);
      if (!tutoriaDesc) {
        tutoriaDesc = getNivelCoordTutoriaJec(tutoriaPts).descripcion;
      }
    }
  }

  const customTables = [];
  let tableHeaders = [];
  let tableRows = [];
  let columnStyles = {};

  const respuestas = sub.respuestas || [];

  if (isNivel14) {
    // =========================================================================
    // F1: BLOQUE DATOS GENERALES (TABLA ESTRUCTURADA 6 COLUMNAS CON CASILLAS)
    // =========================================================================
    const lblStyle = { fillColor: [240, 243, 248], fontStyle: 'bold', textColor: [18, 41, 77], fontSize: 7.5, valign: 'middle' };
    const valStyle = { fillColor: [255, 255, 255], textColor: [15, 27, 45], fontSize: 7.5, valign: 'middle' };
    const valGrayStyle = { fillColor: [255, 255, 255], textColor: [138, 151, 168], fontStyle: 'italic', fontSize: 7.5, valign: 'middle' };

    const fmtVal = (v) => {
      if (!v || v === '—' || String(v).trim() === '') {
        return { content: 'No registrado', styles: valGrayStyle };
      }
      return { content: String(v).trim(), styles: valStyle };
    };

    // Parseo de casillas de Condición
    const condUp = condicion.toUpperCase();
    const isDesig = condUp.includes('DESIGNAD');
    const isEncarg = condUp.includes('ENCARGAD');
    const isOtroCond = !isDesig && !isEncarg && condUp !== '' && condUp !== '—';
    const otroCondLabel = isOtroCond ? `Otro: ${condicion}` : 'Otro: ____';

    // Parseo de casillas de Nivel Educativo
    const nivUp = nivelAtencion.toUpperCase();
    const hasIni = nivUp.includes('INICIAL');
    const hasPrim = nivUp.includes('PRIMARIA');
    const hasSec = nivUp.includes('SECUNDARIA');
    const hasEbe = nivUp.includes('EBE') || nivUp.includes('ESPECIAL') || nivUp.includes('BÁSICA ESPECIAL');

    // Parseo de casillas de Turno de Atención
    const turUp = turnoAtencion.toUpperCase();
    const hasTurM = turUp.includes('MAÑANA') || turUp.includes('MANANA');
    const hasTurT = turUp.includes('TARDE');

    // Parseo de casillas de Turno Visitado
    const visUp = turnoVisitado.toUpperCase();
    const visM = visUp.includes('MAÑANA') || visUp.includes('MANANA');
    const visT = visUp.includes('TARDE');

    const generalDataRows = [
      [
        { content: 'Institución Educativa', styles: lblStyle },
        { content: ieName.toUpperCase(), colSpan: 5, styles: { ...valStyle, fontStyle: 'bold' } }
      ],
      [
        { content: 'Código local', styles: lblStyle },
        { content: codLocal || '—', styles: valStyle },
        { content: 'UGEL', styles: lblStyle },
        { content: ugel || 'UGEL 03', styles: valStyle },
        { content: 'REI / RED', styles: lblStyle },
        { content: red || '—', styles: valStyle }
      ],
      [
        { content: 'Nombre del directivo', styles: lblStyle },
        { content: director && director !== '—' ? formatPersonName(director).toUpperCase() : 'No registrado', colSpan: 3, styles: director && director !== '—' ? { ...valStyle, fontStyle: 'bold' } : valGrayStyle },
        { content: 'DNI', styles: lblStyle },
        fmtVal(directorDni)
      ],
      [
        { content: 'Condición', styles: lblStyle },
        {
          content: '',
          colSpan: 5,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Designado', checked: isDesig },
              { label: 'Encargado', checked: isEncarg },
              { label: otroCondLabel, checked: isOtroCond }
            ]
          }
        }
      ],
      [
        { content: 'Nivel educativo', styles: lblStyle },
        {
          content: '',
          colSpan: 5,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Inicial', checked: hasIni },
              { label: 'Primaria', checked: hasPrim },
              { label: 'Secundaria', checked: hasSec },
              { label: 'EBE', checked: hasEbe }
            ]
          }
        }
      ],
      [
        { content: 'Turno de atención', styles: lblStyle },
        {
          content: '',
          colSpan: 2,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Mañana', checked: hasTurM },
              { label: 'Tarde', checked: hasTurT }
            ]
          }
        },
        { content: 'Turno visitado', styles: lblStyle },
        {
          content: '',
          colSpan: 2,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Mañana', checked: visM },
              { label: 'Tarde', checked: visT }
            ]
          }
        }
      ],
      [
        { content: 'Nombre del monitor', styles: lblStyle },
        { content: responsable ? formatPersonName(responsable).toUpperCase() : 'No registrado', colSpan: 3, styles: valStyle },
        { content: 'DNI', styles: lblStyle },
        fmtVal(monitorDni)
      ],
      [
        { content: 'Fecha de visita', styles: lblStyle },
        { content: fechaVisita, styles: valStyle },
        { content: 'Horario', styles: lblStyle },
        { content: horarioStr !== '—' ? horarioStr : 'No registrado', styles: horarioStr !== '—' ? valStyle : valGrayStyle },
        { content: 'N.° de Visita', styles: lblStyle },
        { content: numVisita, styles: { ...valStyle, fontStyle: 'bold' } }
      ]
    ];

    customTables.push({
      title: 'DATOS GENERALES DE LA VISITA',
      minHeight: 140,
      tableHeaders: null,
      tableRows: generalDataRows,
      styles: {
        minCellHeight: 18,
        cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 }
      },
      columnStyles: {
        0: { cellWidth: 115 },
        1: { cellWidth: 95 },
        2: { cellWidth: 55 },
        3: { cellWidth: 95 },
        4: { cellWidth: 55 },
        5: { cellWidth: 96 }
      },
      didDrawCell: (data) => {
        if (data.cell && data.cell.raw && data.cell.raw.isCheckboxes) {
          const doc = data.doc;
          if (!doc) return;
          const items = data.cell.raw.items || [];
          const boxSize = 7.5;
          const boxY = data.cell.y + (data.cell.height - boxSize) / 2;
          let curX = data.cell.x + 8;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 27, 45);

          items.forEach(it => {
            drawVectorCheckbox(doc, curX, boxY, boxSize, it.checked, 'X', [18, 41, 77]);
            doc.text(it.label, curX + boxSize + 3.5, boxY + 6);
            curX += boxSize + 3.5 + doc.getTextWidth(it.label) + 12;
          });
        }
      }
    });

    // =========================================================================
    // 2. ESCALA DE VALORACIÓN (NIVELES DESCRIPTIVOS CON TONOS SUAVES)
    // =========================================================================
    customTables.push({
      title: 'ESCALA DE VALORACIÓN (NIVELES DESCRIPTIVOS)',
      subtitle: 'Criterios de valoración del desempeño y gestión directiva institucional.',
      minHeight: 80,
      tableHeaders: ['Nivel', 'Valor', 'Descriptor'],
      tableRows: [
        [
          { content: 'IV', styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] } },
          { content: '100%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] } },
          { content: 'Evidencia el cumplimiento integral de los criterios establecidos para el aspecto evaluado. Las acciones desarrolladas son consistentes, sistemáticas y se encuentran debidamente sustentadas con evidencias verificables, contribuyendo al logro de los resultados previstos.', styles: { fontSize: 7.2 } }
        ],
        [
          { content: 'III', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [180, 83, 9] } },
          { content: '75%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [180, 83, 9] } },
          { content: 'Evidencia el cumplimiento de la mayoría de los criterios establecidos para el aspecto evaluado. Si bien se observan avances significativos y acciones orientadas al logro de resultados, aún existen aspectos que requieren fortalecimiento para asegurar un desempeño plenamente satisfactorio.', styles: { fontSize: 7.2 } }
        ],
        [
          { content: 'II', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 237, 213], textColor: [194, 65, 12] } },
          { content: '50%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 237, 213], textColor: [194, 65, 12] } },
          { content: 'Evidencia el cumplimiento parcial de los criterios establecidos para el aspecto evaluado. Las acciones desarrolladas muestran avances incipientes o poco sistemáticos, requiriendo asistencia técnica y seguimiento para consolidar su implementación.', styles: { fontSize: 7.2 } }
        ],
        [
          { content: 'I', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [185, 28, 28] } },
          { content: '25%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [185, 28, 28] } },
          { content: 'No evidencia el cumplimiento de los criterios mínimos establecidos para el aspecto evaluado. Las acciones desarrolladas resultan insuficientes para garantizar el logro de los resultados esperados, requiriendo acciones prioritarias de fortalecimiento y acompañamiento.', styles: { fontSize: 7.2 } }
        ]
      ],
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 44 },
        2: { cellWidth: 431 }
      }
    });

    // =========================================================================
    // 3. DIMENSIONES A–F (TABLAS CON CASILLAS COLOREADAS Y CHECKMARKS VECTORIALES)
    // =========================================================================
    let globalItemCounter = 1;
    const dimensionAverages = [];
    const levelCounts = { 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScoreSum = 0;
    let totalScoreCount = 0;

    const sectionsToRender = (fichaType.secciones && fichaType.secciones.length > 0)
      ? fichaType.secciones
      : OFFICIAL_DIRECTIVO_DIMENSIONS.map(d => ({
        nombre: d.nombre,
        items: Array.from({ length: d.itemsCount }, (_, i) => ({
          id: `dir_${d.id.toLowerCase()}_${i + 1}`,
          texto: OFFICIAL_DIRECTIVO_ITEMS[d.startIdx + i]
        }))
      }));

    sectionsToRender.forEach((sec, sIdx) => {
      let dimSum = 0;
      let dimCount = 0;

      const secRows = (sec.items || []).map(it => {
        const itemNum = globalItemCounter++;
        const resp = respuestas.find(r => r.id === it.id) || respuestas[itemNum - 1];
        const rawVal = resp ? String(resp.valor || '').trim() : '';
        const evid = resp ? (resp.evidencia || '') : '';

        let valNum = null;
        if (rawVal === '4' || rawVal.toLowerCase() === 'iv') valNum = 4;
        else if (rawVal === '3' || rawVal.toLowerCase() === 'iii') valNum = 3;
        else if (rawVal === '2' || rawVal.toLowerCase() === 'ii') valNum = 2;
        else if (rawVal === '1' || rawVal.toLowerCase() === 'i') valNum = 1;

        if (valNum !== null) {
          levelCounts[valNum]++;
          const score = valNum === 4 ? 100 : (valNum === 3 ? 75 : (valNum === 2 ? 50 : 25));
          dimSum += score;
          dimCount++;
          totalScoreSum += score;
          totalScoreCount++;
        }

        // F7: Garantizar redacción oficial verbatim del ítem
        const itemOfficialText = OFFICIAL_DIRECTIVO_ITEMS[itemNum] || it.texto;

        // F3: Celda de nivel con fondo suave y marca vectorial
        const makeLevelCell = (lvl) => {
          if (valNum === lvl) {
            let bg = [236, 253, 245];
            if (lvl === 3) bg = [254, 243, 199];
            else if (lvl === 2) bg = [255, 237, 213];
            else if (lvl === 1) bg = [254, 226, 226];
            return {
              content: '',
              raw: { isCheckmark: true, level: lvl },
              styles: { fillColor: bg, halign: 'center', valign: 'middle' }
            };
          }
          return { content: '', styles: { fillColor: [255, 255, 255] } };
        };

        // F6: Evidencia vacía en blanco (sin '—')
        const evidText = (evid && evid !== '—') ? evid.trim() : '';

        return [
          String(itemNum),
          itemOfficialText,
          makeLevelCell(1),
          makeLevelCell(2),
          makeLevelCell(3),
          makeLevelCell(4),
          evidText
        ];
      });

      const dimPct = dimCount ? Math.round(dimSum / dimCount) : null;
      const dimStatus = dimPct === null ? 'Sin datos' : (dimPct >= 85 ? 'Logrado' : (dimPct >= 70 ? 'En proceso' : 'Por mejorar'));
      const dimStatusCol = dimPct >= 85 ? [5, 150, 105] : (dimPct >= 70 ? [217, 119, 6] : [220, 38, 38]);

      dimensionAverages.push({
        nombre: sec.nombre || `Dimensión ${sIdx + 1}`,
        itemsCount: (sec.items || []).length,
        pct: dimPct,
        status: dimStatus,
        statusColor: dimStatusCol
      });

      // Fila de cierre con promedio de dimensión
      secRows.push([
        {
          content: `Promedio de la dimensión: ${dimPct !== null ? dimPct + '%' : '—'}  ·  ${dimStatus.toUpperCase()}`,
          colSpan: 7,
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fillColor: [247, 249, 252],
            textColor: dimStatusCol,
            fontSize: 8
          }
        }
      ]);

      // Dimensión con título oficial
      const dimTitleOfficial = OFFICIAL_DIRECTIVO_DIMENSIONS[sIdx] ? OFFICIAL_DIRECTIVO_DIMENSIONS[sIdx].nombre : (sec.nombre || 'DIMENSIÓN').toUpperCase();

      customTables.push({
        title: dimTitleOfficial,
        minHeight: 80,
        tableHeaders: ['N.°', 'Ítem / Criterio de Evaluación', 'I', 'II', 'III', 'IV', 'Evidencia'],
        tableRows: secRows,
        columnStyles: {
          0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
          1: { halign: 'left', cellWidth: 260 },
          2: { halign: 'center', cellWidth: 22 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 22 },
          6: { halign: 'left', cellWidth: 119, fontSize: 7.2 }
        },
        didDrawCell: (data) => {
          if (data.cell && data.cell.raw && data.cell.raw.isCheckmark) {
            const doc = data.doc;
            if (!doc) return;
            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            const lvl = data.cell.raw.level;
            let col = [18, 41, 77];
            if (lvl === 4) col = [4, 120, 87];
            else if (lvl === 3) col = [180, 83, 9];
            else if (lvl === 2) col = [194, 65, 12];
            else if (lvl === 1) col = [185, 28, 28];
            drawVectorCheckmark(doc, cx, cy, 7.5, col, 1.4);
          }
        }
      });
    });

    // =========================================================================
    // F9: RESUMEN DE RESULTADOS (CUMPLIMIENTO POR DIMENSIÓN Y GLOBAL)
    // =========================================================================
    if (downloadConfig.incluirResumen !== false) {
      const globalPct = totalScoreCount ? Math.round(totalScoreSum / totalScoreCount) : null;
      const globalStatus = globalPct === null ? 'Sin datos' : (globalPct >= 85 ? 'LOGRADO' : (globalPct >= 70 ? 'EN PROCESO' : 'POR MEJORAR'));
      const globalStatusCol = globalPct >= 85 ? [5, 150, 105] : (globalPct >= 70 ? [217, 119, 6] : [220, 38, 38]);

      const resumenRows = dimensionAverages.map(d => [
        d.nombre,
        String(d.itemsCount),
        d.pct !== null ? `${d.pct}%` : '—',
        { content: d.status, styles: { fontStyle: 'bold', textColor: d.statusColor, halign: 'center' } }
      ]);

      // Fila total global
      resumenRows.push([
        { content: 'CUMPLIMIENTO GLOBAL INSTITUCIONAL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: String(globalItemCounter - 1), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: globalPct !== null ? `${globalPct}%` : '—', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248], textColor: globalStatusCol } },
        { content: globalStatus, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248], textColor: globalStatusCol } }
      ]);

      customTables.push({
        title: 'RESUMEN DE RESULTADOS',
        subtitle: `Cumplimiento global: ${globalPct !== null ? globalPct + '%' : '—'} — ${globalStatus}  ·  Distribución: IV × ${levelCounts[4]}  ·  III × ${levelCounts[3]}  ·  II × ${levelCounts[2]}  ·  I × ${levelCounts[1]}`,
        minHeight: 90,
        tableHeaders: ['Dimensión Evaluada', 'N.° Ítems', 'Promedio', 'Nivel Alcanzado'],
        tableRows: resumenRows,
        columnStyles: {
          0: { cellWidth: 260 },
          1: { halign: 'center', cellWidth: 65 },
          2: { halign: 'center', cellWidth: 80, fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 106, fontStyle: 'bold' }
        }
      });
    }

    // =========================================================================
    // 4. SÍNTESIS POR DIMENSIÓN (LOGROS, DIFICULTADES, RECOMENDACIONES)
    // =========================================================================
    const sintesisData = (sub.sintesis && sub.sintesis.length > 0)
      ? sub.sintesis
      : OFFICIAL_DIRECTIVO_DIMENSIONS.map(d => ({ dimension: d.nombre, logros: '', dificultades: '', recomendaciones: '' }));

    customTables.push({
      title: 'SÍNTESIS POR DIMENSIÓN',
      subtitle: 'Logros, dificultades y recomendaciones acordadas durante la jornada de monitoreo.',
      minHeight: 100,
      tableHeaders: ['Dimensiones', 'Logros', 'Dificultades', 'Recomendaciones'],
      tableRows: sintesisData.map(s => [
        s.dimension || 'Dimensión',
        (s.logros && s.logros !== '—') ? s.logros : '',
        (s.dificultades && s.dificultades !== '—') ? s.dificultades : '',
        (s.recomendaciones && s.recomendaciones !== '—') ? s.recomendaciones : ''
      ]),
      styles: {
        minCellHeight: 38, // Altura suficiente (~14mm) para llenado a mano
        fontSize: 7.2
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 131, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 126 },
        2: { halign: 'left', cellWidth: 126 },
        3: { halign: 'left', cellWidth: 128 }
      }
    });

    // =========================================================================
    // F2: COMPROMISOS ASUMIDOS (DIRECTOR Y MONITOR — CON LÍNEAS PUNTEADAS SI VACÍO)
    // =========================================================================
    const compDir = (sub.compromisoDirector && sub.compromisoDirector !== '—') ? sub.compromisoDirector.trim() : '';
    const compMon = (sub.compromisoMonitor && sub.compromisoMonitor !== '—') ? sub.compromisoMonitor.trim() : '';

    customTables.push({
      title: 'COMPROMISOS ASUMIDOS',
      subtitle: 'Compromisos de mejora institucional asumidos por la dirección y el equipo monitor.',
      minHeight: 110,
      tableHeaders: ['DEL DIRECTOR(A) DE LA IE', 'DEL MONITOR / ESPECIALISTA'],
      tableRows: [[
        { content: compDir, styles: { minCellHeight: 90, valign: 'top' } },
        { content: compMon, styles: { minCellHeight: 90, valign: 'top' } }
      ]],
      columnStyles: {
        0: { cellWidth: 255 },
        1: { cellWidth: 256 }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const text = (data.cell.text || []).join('').trim();
          if (!text && downloadConfig.imprimirLineas !== false) {
            // Dibujar 5 líneas punteadas para escribir a mano si está vacío
            const doc = data.doc;
            if (!doc) return;
            doc.saveGraphicsState && doc.saveGraphicsState();
            doc.setDrawColor(190, 200, 215);
            doc.setLineWidth(0.5);
            doc.setLineDashPattern && doc.setLineDashPattern([2, 3], 0);
            const startX = data.cell.x + 8;
            const endX = data.cell.x + data.cell.width - 8;
            for (let l = 1; l <= 5; l++) {
              const ly = data.cell.y + l * 16 + 2;
              if (ly < data.cell.y + data.cell.height - 4) {
                doc.line(startX, ly, endX, ly);
              }
            }
            doc.setLineDashPattern && doc.setLineDashPattern([], 0);
            doc.restoreGraphicsState && doc.restoreGraphicsState();
          }
        }
      }
    });

    // =========================================================================
    // F2: OBSERVACIONES (CON LÍNEAS PUNTEADAS SI VACÍO)
    // =========================================================================
    const obsText = (sub.observaciones && sub.observaciones !== '—') ? sub.observaciones.trim() : '';

    customTables.push({
      title: 'OBSERVACIONES',
      subtitle: 'Aspectos relevantes o contingencias registradas durante la visita.',
      minHeight: 75,
      tableHeaders: ['OBSERVACIONES REGISTRADAS EN LA VISITA'],
      tableRows: [[
        { content: obsText, styles: { minCellHeight: 65, valign: 'top' } }
      ]],
      columnStyles: {
        0: { cellWidth: 511 }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const text = (data.cell.text || []).join('').trim();
          if (!text && downloadConfig.imprimirLineas !== false) {
            // Dibujar 4 líneas punteadas si está vacío
            const doc = data.doc;
            if (!doc) return;
            doc.saveGraphicsState && doc.saveGraphicsState();
            doc.setDrawColor(190, 200, 215);
            doc.setLineWidth(0.5);
            doc.setLineDashPattern && doc.setLineDashPattern([2, 3], 0);
            const startX = data.cell.x + 8;
            const endX = data.cell.x + data.cell.width - 8;
            for (let l = 1; l <= 4; l++) {
              const ly = data.cell.y + l * 15 + 2;
              if (ly < data.cell.y + data.cell.height - 4) {
                doc.line(startX, ly, endX, ly);
              }
            }
            doc.setLineDashPattern && doc.setLineDashPattern([], 0);
            doc.restoreGraphicsState && doc.restoreGraphicsState();
          }
        }
      }
    });
  } else {
    // =========================================================================
    // Modo tradicional para los otros tipos de ficha
    // =========================================================================
    if (isCoordTutoria) {
      customTables.push({
        title: 'NIVEL DE CUMPLIMIENTO OFICIAL (SEGÚN PUNTAJE OBTENIDO)',
        subtitle: 'Escala de valoración establecida en la Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)',
        minHeight: 75,
        tableHeaders: ['Nivel de cumplimiento', 'Puntaje', 'Descripción oficial de la función'],
        tableRows: [
          [
            { content: 'Cumple' + (tutoriaNivel === 'Cumple' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255], textColor: [4, 120, 87] } },
            { content: 'De 53 a 63', styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.', styles: { fontSize: 7.5, fillColor: tutoriaNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255] } }
          ],
          [
            { content: 'Cumple parcialmente' + (tutoriaNivel === 'Cumple parcialmente' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255], textColor: [180, 83, 9] } },
            { content: 'De 42 a 52', styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.', styles: { fontSize: 7.5, fillColor: tutoriaNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255] } }
          ],
          [
            { content: 'No cumple' + (tutoriaNivel === 'No cumple' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255], textColor: [185, 28, 28] } },
            { content: 'De 21 a 41', styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.', styles: { fontSize: 7.5, fillColor: tutoriaNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255] } }
          ]
        ],
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 65 },
          2: { cellWidth: 336 }
        }
      });
    }

    tableHeaders = isCoordTutoria
      ? ['N.°', 'Sección / Función Monitoreada', 'Calificación (1–3)']
      : ['N.°', 'Sección / Indicador de Evaluación', 'Resultado'];
    let itemCounter = 1;

    if (fichaType.secciones && fichaType.secciones.length > 0) {
      fichaType.secciones.forEach(sec => {
        (sec.items || []).forEach(it => {
          const resp = respuestas.find(r => r.id === it.id);
          const val = resp ? resp.valor : 'Sin datos';
          const valText = (isCoordTutoria && val && val !== 'Sin datos') ? `${val} pts` : val;
          tableRows.push([
            String(itemCounter++),
            `${sec.nombre}\n${it.texto}`,
            valText
          ]);
        });
      });
    } else {
      respuestas.forEach(r => {
        const valText = (isCoordTutoria && r.valor && r.valor !== '—') ? `${r.valor} pts` : (r.valor || '—');
        tableRows.push([
          String(itemCounter++),
          `${r.seccion || 'General'}\n${r.texto || 'Indicador'}`,
          valText
        ]);
      });
    }

    columnStyles = {
      0: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 90, fontStyle: 'bold' }
    };
  }

  // F8: Nombre de archivo limpio y estandarizado
  const cleanCodLocal = sanitizeFilename(String(codLocal).replace(/[^0-9A-Za-z_-]/g, ''));
  const cleanIeName = sanitizeFilename(ieName);
  const filename = isNivel14
    ? `Ficha_Monitoreo_Directivo_IE_${cleanCodLocal || 'IE'}_${cleanIeName}_${getLimaDateStr()}.pdf`
    : `Ficha_${sanitizeFilename(rawTypeName)}_${cleanIeName}_${getLimaDateStr()}.pdf`;

  // Firmas por defecto (Director, Monitor, Jefatura opcional)
  const areaSigla = (downloadConfig.areaConfig && downloadConfig.areaConfig.sigla) ? downloadConfig.areaConfig.sigla : 'AGEBRE';
  const monitorCargo = isJecFicha ? 'Especialista de JEC — UGEL 03' : (isNivel14 ? `Monitor(a) — ${areaSigla}` : `Especialista que monitorea — ${areaSigla}`);
  const defaultSignatures = isNivel14 ? [
    { cargo: 'Director(a) de la I.E.', entidad: ieName, nombre: (director && director !== '—') ? formatPersonName(director) : '', leyenda: 'Firma y Sello' },
    { cargo: monitorCargo, entidad: 'UGEL 03 – DRELM', nombre: responsable ? formatPersonName(responsable) : '', leyenda: 'Firma y Sello' },
    { cargo: `V.° B.° Jefatura de ${areaSigla}`, entidad: 'UGEL 03', nombre: '', leyenda: 'V.° B.°' }
  ] : [
    { cargo: monitorCargo, entidad: 'UGEL 03 – DRELM', nombre: responsable ? formatPersonName(responsable) : '', leyenda: 'Firma y Sello' },
    { cargo: 'Director(a) / Autoridad de la I.E.', entidad: ieName, nombre: (director && director !== '—') ? formatPersonName(director) : '', leyenda: 'Firma y Sello' },
    { cargo: `Jefatura de ${areaSigla}`, entidad: 'UGEL 03', nombre: '', leyenda: 'V.° B.°' }
  ];

  const metaGrid = isNivel14 ? [] : [
    { label: 'Institución Educativa', value: ieName },
    { label: 'Fecha de Monitoreo', value: fechaVisita },
    { label: 'N.° de Visita', value: numVisita },
    { label: 'Especialista / Monitor', value: responsable },
    { label: 'Director(a)', value: director },
    { label: 'Código Modular / Local', value: codLocal || '—' },
    ...(isCoordTutoria ? [
      { label: 'Puntaje Total Obtenido', value: `${tutoriaPts} / 63 puntos (${tutoriaPct}%)` },
      { label: 'Nivel de Cumplimiento', value: `${(tutoriaNivel || '').toUpperCase()}` }
    ] : [])
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: 'Monitoreo y Acompañamiento 2026 · UGEL 03',
    orientation: downloadConfig.orientation || 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows,
    columnStyles,
    customTables,
    summarySections: [],
    signatures: downloadConfig.signatures || defaultSignatures,
    lugarFecha: downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`,
    sinFirmas: downloadConfig.sinFirmas || false,
    areaConfig: downloadConfig.areaConfig || null,
    incluirQr: downloadConfig.incluirQr !== false,
    datosIncompletos: downloadConfig.datosIncompletos || false,
    marcaBorrador: downloadConfig.marcaBorrador || false,
  });
}

/**
 * Normaliza y formatea el valor de Red Educativa / REI institucional
 * Ejemplos: "01" -> "REI 01", "RED 04" -> "REI 04", "REI 05" -> "REI 05", null/vacío -> "—"
 */
export function formatRei(redVal) {
  if (!redVal || redVal === '—' || redVal === 'No aplica' || redVal === 'null' || redVal === 'undefined') {
    return '—';
  }
  const clean = String(redVal).trim();
  if (!clean || clean === '-') return '—';
  const upper = clean.toUpperCase();
  if (upper.startsWith('REI ') || upper.startsWith('RED ')) {
    return upper.replace(/^RED\s+/, 'REI ');
  }
  if (/^\d+$/.test(clean)) {
    return `REI ${clean.padStart(2, '0')}`;
  }
  return `REI ${clean}`;
}

/**
 * Dibuja un gráfico de dona vectorial nativo en jsPDF con leyenda a la derecha
 * y total centrado ("12 fichas"). Si todas las fichas están en una categoría,
 * dibuja el anillo completo sin errores por segmentos en 0.
 */
export function drawPdfDonutChart(doc, cx, cy, outerRadius, innerRadius, segments, totalLabel = '', subLabel = 'fichas') {
  const total = segments.reduce((sum, s) => sum + (Number(s.val) || 0), 0);
  const numFontSize = outerRadius >= 40 ? 22 : 13;
  const subFontSize = outerRadius >= 40 ? 8.5 : 7;
  const yNumOffset = outerRadius >= 40 ? 3 : 1;
  const ySubOffset = outerRadius >= 40 ? 12 : 9;

  if (total === 0) {
    // Anillo vacío en gris claro
    doc.setFillColor(229, 231, 235); // #E5E7EB
    doc.circle(cx, cy, outerRadius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(numFontSize);
    doc.setTextColor(15, 23, 42);
    doc.text('0', cx, cy - yNumOffset, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subFontSize);
    doc.setTextColor(100, 116, 139);
    doc.text(subLabel, cx, cy + ySubOffset, { align: 'center' });
    return;
  }

  // Verificar si un solo segmento concentra el 100%
  const single100 = segments.find(s => s.val === total);
  if (single100) {
    doc.setFillColor(single100.color[0], single100.color[1], single100.color[2]);
    doc.circle(cx, cy, outerRadius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
  } else {
    // Dibujar sectores mediante abanico poligonal de triángulos
    let currentAngle = -Math.PI / 2; // Iniciar arriba (12 en punto)
    const step = Math.PI / 45; // paso de 4 grados (suave y nítido)

    segments.forEach(seg => {
      const val = Number(seg.val) || 0;
      if (val <= 0) return;

      const span = (val / total) * 2 * Math.PI;
      const endAngle = currentAngle + span;
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);

      let a = currentAngle;
      while (a < endAngle) {
        const nextA = Math.min(a + step, endAngle);
        const x1 = cx + outerRadius * Math.cos(a);
        const y1 = cy + outerRadius * Math.sin(a);
        const x2 = cx + outerRadius * Math.cos(nextA);
        const y2 = cy + outerRadius * Math.sin(nextA);
        doc.triangle(cx, cy, x1, y1, x2, y2, 'F');
        a = nextA;
      }
      currentAngle = endAngle;
    });

    // Recorte interior blanco para formar el anillo de la dona
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
  }

  // Texto centrado: Total y etiqueta ("12 fichas")
  const displayTotal = totalLabel !== '' ? String(totalLabel) : String(total);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(numFontSize);
  doc.setTextColor(15, 23, 42);
  doc.text(displayTotal, cx, cy - 1 - (outerRadius >= 40 ? 2 : 0), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(subFontSize);
  doc.setTextColor(100, 116, 139);
  doc.text(subLabel, cx, cy + ySubOffset, { align: 'center' });
}

/**
 * Exporta el Reporte Consolidado Oficial de Monitoreo (V2 - AGEBRE Oficial)
 * Estructura:
 * I.   Distribución de resultados (3 tarjetas KPI + Gráfico de dona + Tabla de distribución)
 * II.  Avance por sección / dimensión evaluada (Gráficas de progreso vectoriales + badges)
 * III. Matriz comparativa por institución y dimensión (con columna REI integrada)
 * Nota Metodológica completa + Firmas oficiales + Pie con código de verificación
 */
export async function exportConsolidadoReportPdfV2(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const isDirectivoType = fichaType && (fichaType.tipoRespuesta === 'nivel_1_4' || (fichaType.id || '').includes('directivo') || (fichaType.nombre || '').toLowerCase().includes('directivo'));

  const title = isAllMode
    ? 'REPORTE CONSOLIDADO GENERAL DE MONITOREO'
    : `REPORTE CONSOLIDADO — ${(fichaType ? fichaType.nombre.toUpperCase() : 'MONITOREO')}`;

  const totalFichas = statsList.length;
  const instCount = new Set(statsList.map(x => x.s.institucion || '').filter(Boolean)).size;
  const withPct = statsList.filter(x => x.st && x.st.pct !== null && x.st.pct !== undefined);
  const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : '—';

  // Subtítulo con filtros aplicados (sin redundancias)
  const filtrosAplicados = [];
  if (filters.institucion) filtrosAplicados.push(`I.E.: ${filters.institucion}`);
  if (filters.red) filtrosAplicados.push(`RED/REI: ${filters.red}`);
  if (filters.visita) filtrosAplicados.push(`Visita: V${filters.visita}`);
  if (filters.responsable) filtrosAplicados.push(`Responsable: ${filters.responsable}`);
  if (filters.distrito) filtrosAplicados.push(`Distrito: ${filters.distrito}`);
  if (filters.desde || filters.hasta) filtrosAplicados.push(`Período: ${filters.desde || 'inicio'} a ${filters.hasta || 'fin'}`);
  const filterSubtitle = filtrosAplicados.length ? `Filtros: ${filtrosAplicados.join(' · ')}` : 'Filtros: ninguno (todos los registros)';

  // Texto introductorio oficial con concordancia gramatical exacta y sin repetir filtros al final
  const fichaTxt = totalFichas === 1
    ? '1 ficha de monitoreo aplicada'
    : `${plural(totalFichas, 'ficha', 'fichas')} de monitoreo aplicadas`;
  const instTxt = instCount === 1
    ? '1 institución educativa'
    : `${plural(instCount, 'institución educativa', 'instituciones educativas')}`;

  const introParagraph = totalFichas > 0
    ? `El presente documento consolida la información de las visitas de monitoreo registradas en el ${SISTEMA_NOMBRE_OFICIAL} para el año lectivo 2026. Se reporta un total de ${fichaTxt} en ${instTxt}, con un nivel de cumplimiento promedio general del ${avgPct === '—' ? '—' : avgPct + '%'}.`
    : `El presente documento consolida la información de las visitas de monitoreo registradas en el ${SISTEMA_NOMBRE_OFICIAL} para el año lectivo 2026. No se registran visitas de monitoreo para los filtros seleccionados (${filterSubtitle}).`;

  // Escala oficial unificada (EBR Gestión Escolar / IPL / EBE / PRITE: Logrado >= 67%, Proceso >= 34%, Inicio < 34%)
  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  const isEbr = !isJec && (isFichaEbrGestionEscolar(fichaType)
    || isFichaEbrEbePrite(fichaType)
    || isFichaCebeGestion(fichaType)
    || isFichaPriteGestion(fichaType)
    || (fichaType?.escala === 'IPL')
    || (fichaType?.tipoRespuesta === 'ips')
    || (!fichaType && statsList.some(x => isFichaEbrGestionEscolar(x.s) || isFichaCebeGestion(x.s) || isFichaPriteGestion(x.s))));
  const logCut = isEbr ? 67 : 85;
  const procCut = isEbr ? 34 : 70;

  // 1. CÁLCULO DE DISTRIBUCIÓN DE RESULTADOS (FUENTE ÚNICA)
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    if (x.st.pct === null || x.st.pct === undefined) dist.none++;
    else {
      const lbl = (x.st?.estado?.estado_panel || x.st?.estado?.label || '').toLowerCase();
      if (lbl.includes('no cumple') || lbl.includes('inici') || lbl.includes('incipient') || lbl.includes('mejorar')) dist.inicio++;
      else if (lbl.includes('parcial') || lbl.includes('proces')) dist.proceso++;
      else if (lbl.includes('lograd') || lbl.includes('cumple')) dist.logrado++;
      else if (x.st.pct >= logCut) dist.logrado++;
      else if (x.st.pct >= procCut) dist.proceso++;
      else dist.inicio++;
    }
  });

  const pctLogrado = totalFichas ? Math.round((dist.logrado / totalFichas) * 100) : 0;
  const pctProceso = totalFichas ? Math.round((dist.proceso / totalFichas) * 100) : 0;
  const pctInicio = totalFichas ? Math.round((dist.inicio / totalFichas) * 100) : 0;
  const pctNone = totalFichas ? Math.round((dist.none / totalFichas) * 100) : 0;

  const customTables = [];

  // ==========================================
  // SECCIÓN I: DISTRIBUCIÓN DE RESULTADOS (3 TARJETAS KPI + DONA + TABLA)
  // ==========================================
  customTables.push({
    title: 'I. DISTRIBUCIÓN DE RESULTADOS',
    subtitle: 'Categorización porcentual y numérica de las fichas de monitoreo según el nivel de logro alcanzado.',
    minHeight: 140,
    beforeDraw: (doc, curY, pageW, margin) => {
      const CONTENT_WIDTH = pageW - 2 * margin;

      // 1. TARJETAS KPI EN UNA FILA CON FRANJA INFERIOR DE COLOR
      const padron = downloadConfig.colegios || (downloadConfig.state && downloadConfig.state.colegios) || [];
      const isEbrSpecial = isFichaEbrGestionEscolar(fichaType);
      const isCebeSpecial = isFichaCebeGestion(fichaType);
      const isPriteSpecial = isFichaPriteGestion(fichaType);
      const targetMod = isEbrSpecial ? 'EBR' : (isPriteSpecial ? 'PRITE' : (isCebeSpecial ? 'CEBE' : null));

      let cardsData = [];
      if (targetMod && padron.length > 0) {
        const isModMatch = (c, mod) => {
          if (!c) return false;
          const m = String(c.modalidad || '').toUpperCase().trim();
          const ie = String(c.ie || c.nombre || '').toUpperCase();
          if (mod === 'EBR') {
            if (m === 'EBR' || m.includes('EBR') || m.includes('REGULAR')) return true;
            if (!m) {
              if (ie.includes('CEBE') || ie.includes('PRITE') || ie.includes('CEBA') || ie.includes('CETPRO')) return false;
              return true;
            }
            return false;
          }
          if (mod === 'PRITE') {
            if (m === 'PRITE' || m.includes('PRITE') || ie.includes('PRITE')) return true;
            return false;
          }
          if (mod === 'CEBE') {
            if (ie.includes('PRITE') || m.includes('PRITE')) return false;
            if (m === 'CEBE' || m.includes('CEBE') || m === 'EBE' || m.includes('EBE') || m.includes('ESPECIAL')) return true;
            if (ie.includes('CEBE') || ie.includes('ESPECIAL')) return true;
            return false;
          }
          if (mod === 'EBE') {
            if (m === 'EBE' || m.includes('EBE') || m.includes('ESPECIAL') || m.includes('CEBE') || m.includes('PRITE')) return true;
            if (ie.includes('CEBE') || ie.includes('PRITE') || ie.includes('ESPECIAL')) return true;
            return false;
          }
          return false;
        };

        let targetCols = padron.filter(c => isModMatch(c, targetMod));
        if (filters.red) {
          const qr = String(filters.red).toLowerCase();
          targetCols = targetCols.filter(c => String(c.rei || c.red || '').toLowerCase().includes(qr));
        }
        if (filters.distrito) {
          const qd = String(filters.distrito).toLowerCase();
          targetCols = targetCols.filter(c => String(c.distrito || '').toLowerCase().includes(qd));
        }

        const executedColIds = new Set();
        const executedExtra = new Set();
        const tById = new Map();
        const tByCode = new Map();
        const tByIe = new Map();
        targetCols.forEach(c => {
          if (c.id) tById.set(c.id, c);
          if (c.codigoLocal) tByCode.set(String(c.codigoLocal).trim().toLowerCase(), c);
          if (c.codigoModular) tByCode.set(String(c.codigoModular).trim().toLowerCase(), c);
          if (c.ie) tByIe.set(String(c.ie).trim().toLowerCase(), c);
        });

        statsList.forEach(x => {
          const s = x.s;
          let mCol = null;
          if (s.colegioId && tById.has(s.colegioId)) mCol = tById.get(s.colegioId);
          else if (s.codigoLocal && tByCode.has(String(s.codigoLocal).trim().toLowerCase())) mCol = tByCode.get(String(s.codigoLocal).trim().toLowerCase());
          else if (s.codigoModular && tByCode.has(String(s.codigoModular).trim().toLowerCase())) mCol = tByCode.get(String(s.codigoModular).trim().toLowerCase());
          else if (s.institucion && tByIe.has(String(s.institucion).trim().toLowerCase())) mCol = tByIe.get(String(s.institucion).trim().toLowerCase());

          if (mCol) executedColIds.add(mCol.id);
          else executedExtra.add(s.colegioId || (s.institucion ? s.institucion.trim().toLowerCase() : ''));
        });

        const numExec = executedColIds.size + executedExtra.size;
        const iesExec = Math.max(numExec, instCount);
        const totalIesMod = targetCols.length > 0 ? Math.max(targetCols.length, iesExec) : iesExec;
        const iesPend = Math.max(0, totalIesMod - iesExec);
        const cobPct = totalIesMod > 0 ? Math.round((iesExec / totalIesMod) * 100) : 0;

        cardsData = [
          { val: String(totalIesMod), lbl: `TOTAL IES ${targetMod}`, color: [30, 58, 138] },
          { val: `${iesExec} (${cobPct}%)`, lbl: 'IES EJECUTADAS', color: [22, 163, 74] },
          { val: String(iesPend), lbl: 'IES PENDIENTES', color: [217, 119, 6] },
          { val: String(totalFichas), lbl: 'FICHAS REGISTRADAS', color: [37, 99, 235] },
          { val: avgPct === '—' || avgPct === null ? '—' : `${avgPct}%`, lbl: 'CUMPLIMIENTO PROMEDIO', color: [234, 179, 8] }
        ];
      } else {
        cardsData = [
          { val: String(totalFichas), lbl: 'FICHAS REGISTRADAS', color: [37, 99, 235] },
          { val: String(instCount), lbl: 'INSTITUCIONES', color: [22, 163, 74] },
          { val: avgPct === '—' || avgPct === null ? '—' : `${avgPct}%`, lbl: 'CUMPLIMIENTO PROMEDIO', color: [217, 119, 6] }
        ];
      }

      const numCards = cardsData.length;
      const cardGap = isLandscape ? (numCards === 5 ? 8 : 14) : (numCards === 5 ? 6 : 10);
      const cardW = Math.floor((CONTENT_WIDTH - (numCards - 1) * cardGap) / numCards);
      const cardH = 42;

      cardsData.forEach((c, idx) => {
        const cX = margin + idx * (cardW + cardGap);
        const cY = curY;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.75);
        doc.roundedRect(cX, cY, cardW, cardH, 3.5, 3.5, 'FD');

        doc.setFillColor(c.color[0], c.color[1], c.color[2]);
        doc.roundedRect(cX, cY + cardH - 3.5, cardW, 3.5, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? (numCards === 5 ? 13 : 17) : (numCards === 5 ? 11 : 15));
        doc.setTextColor(15, 23, 42);
        doc.text(c.val, cX + (numCards === 5 ? 8 : 12), cY + 19);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? (numCards === 5 ? 5.8 : 6.8) : (numCards === 5 ? 5.2 : 6.8));
        doc.setTextColor(100, 116, 139);
        doc.text(c.lbl, cX + (numCards === 5 ? 8 : 12), cY + 31);
      });

      curY += cardH + 12;

      // 2. PANEL DE GRÁFICO DE DONA + LEYENDA (Sin hallazgos)
      const panelH = 135;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, curY, CONTENT_WIDTH, panelH, 4, 4, 'FD');

      // Título de la dona
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Distribución de resultados', margin + 14, curY + 15);

      // Gráfica de dona más grande para que no cubra el texto
      const donutCx = margin + CONTENT_WIDTH / 2 - 60;
      const donutCy = curY + 70;
      const donutOuterR = 56;
      const donutInnerR = 38;

      const donutSegments = [
        { val: dist.logrado, color: [22, 163, 74], label: 'Logrado' },
        { val: dist.proceso, color: [217, 119, 6], label: 'En proceso' },
        { val: dist.inicio, color: [220, 38, 38], label: 'Inicio' },
        ...(dist.none > 0 ? [{ val: dist.none, color: [148, 163, 184], label: 'Sin datos' }] : [])
      ];

      drawPdfDonutChart(doc, donutCx, donutCy, donutOuterR, donutInnerR, donutSegments, String(totalFichas), totalFichas === 1 ? 'ficha' : 'fichas');

      // Leyenda vertical
      const legX = donutCx + donutOuterR + 40;
      let legY = curY + 50;
      donutSegments.forEach(s => {
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.circle(legX + 5, legY - 3, 4, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`${s.label} (${s.val})`, legX + 14, legY);
        legY += 18;
      });

      return curY + panelH + 10;
    },
    tableHeaders: ['Nivel de Logro', 'Rango de Cumplimiento', 'Cantidad de Fichas', 'Porcentaje (%)', 'Interpretación Institucional'],
    tableRows: totalFichas > 0 ? [
      [
        { content: 'Logrado', styles: { textColor: [4, 120, 87], fontStyle: 'bold' } },
        `>= ${logCut}%`,
        String(dist.logrado),
        `${pctLogrado}%`,
        'Nivel óptimo; cumple satisfactoriamente los estándares evaluados'
      ],
      [
        { content: 'En proceso', styles: { textColor: [180, 83, 9], fontStyle: 'bold' } },
        `${procCut}% – ${logCut - 1}%`,
        String(dist.proceso),
        `${pctProceso}%`,
        'En desarrollo; requiere fortalecimiento de prácticas pedagógicas'
      ],
      [
        { content: 'Inicio / Por mejorar', styles: { textColor: [185, 28, 28], fontStyle: 'bold' } },
        `< ${procCut}%`,
        String(dist.inicio),
        `${pctInicio}%`,
        'Requiere asistencia técnica focalizada y acompañamiento prioritario'
      ],
      ...(dist.none > 0 ? [
        [
          { content: 'Sin datos', styles: { textColor: [100, 116, 139] } },
          '—',
          String(dist.none),
          `${pctNone}%`,
          'Fichas sin respuestas o con indicadores no evaluados'
        ]
      ] : []),
      [
        { content: 'TOTAL', styles: { fontStyle: 'bold' } },
        '—',
        { content: String(totalFichas), styles: { fontStyle: 'bold' } },
        { content: '100%', styles: { fontStyle: 'bold' } },
        'Total consolidado de visitas de monitoreo procesadas'
      ]
    ] : [
      [
        { content: 'Sin datos', colSpan: 5, styles: { halign: 'center', textColor: [100, 116, 139], fontStyle: 'italic' } }
      ]
    ],
    columnStyles: isLandscape ? {
      0: { fontStyle: 'bold', cellWidth: 110 },
      1: { halign: 'center', cellWidth: 100 },
      2: { halign: 'center', cellWidth: 85, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 75, fontStyle: 'bold' },
      4: { halign: 'left' }
    } : {
      0: { fontStyle: 'bold', cellWidth: 95 },
      1: { halign: 'center', cellWidth: 85 },
      2: { halign: 'center', cellWidth: 60, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
      4: { halign: 'left' }
    }
  });

  // ==========================================
  // SECCIÓN II: AVANCE POR SECCIÓN / DIMENSIÓN EVALUADA
  // ==========================================
  if (!isAllMode && fichaType) {
    let seccionesParaAgg = (fichaType.secciones && fichaType.secciones.length > 0)
      ? fichaType.secciones
      : [];
    if (isFichaCebeGestion(fichaType)) {
      seccionesParaAgg = CEBE_SECCIONES;
    } else if (isFichaPriteGestion(fichaType)) {
      seccionesParaAgg = PRITE_SECCIONES;
    } else if (isFichaEbrGestionEscolar(fichaType)) {
      const hasV2 = statsList.some(x => Number(x.s.visita) === 2);
      seccionesParaAgg = hasV2 ? EBR_GESTION_VISITA_2_SECCIONES : EBR_GESTION_VISITA_1_SECCIONES;
    } else if (isFichaJec(fichaType)) {
      seccionesParaAgg = (fichaType.secciones && fichaType.secciones.length === JEC_SECCIONES.length) ? fichaType.secciones : JEC_SECCIONES;
    }

    if (seccionesParaAgg.length === 0 && statsList[0]?.st?.secciones) {
      seccionesParaAgg = statsList[0].st.secciones.map(sc => ({ nombre: sc.nombre, items: [] }));
    }

    const normKey = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const secAgg = {};
    const normMap = new Map();
    seccionesParaAgg.forEach(sec => {
      secAgg[sec.nombre] = { sum: 0, cnt: 0, itemsCount: (sec.items || []).length };
      normMap.set(normKey(sec.nombre), sec.nombre);
    });

    statsList.forEach(x => {
      (x.st?.secciones || []).forEach(sc => {
        const targetName = secAgg[sc.nombre] !== undefined ? sc.nombre : normMap.get(normKey(sc.nombre));
        if (targetName) {
          if (sc.pct !== null && sc.pct !== undefined) {
            secAgg[targetName].sum += sc.pct;
            secAgg[targetName].cnt++;
          }
          if (sc.total && (!secAgg[targetName].itemsCount || secAgg[targetName].itemsCount === 0)) {
            secAgg[targetName].itemsCount = sc.total;
          }
        }
      });
    });

    const secTableRows = seccionesParaAgg.map((sec, idx) => {
      const a = secAgg[sec.nombre] || { sum: 0, cnt: 0, itemsCount: (sec.items || []).length };
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      let statusLabel = 'Sin datos';
      let badgeBg = [243, 244, 246];
      let badgeText = [107, 114, 128];

      if (avg !== null) {
        if (avg >= logCut) {
          statusLabel = 'Logrado';
          badgeBg = [236, 253, 245];
          badgeText = [4, 120, 87];
        } else if (avg >= procCut) {
          statusLabel = 'En proceso';
          badgeBg = [254, 243, 199];
          badgeText = [180, 83, 9];
        } else {
          statusLabel = isEbr ? 'Inicio' : 'Por mejorar';
          badgeBg = [254, 226, 226];
          badgeText = [185, 28, 28];
        }
      }

      const countDisplay = (sec.items && sec.items.length > 0)
        ? String(sec.items.length)
        : (a.itemsCount > 0 ? String(a.itemsCount) : '—');

      return [
        String(idx + 1),
        sec.nombre,
        countDisplay,
        avg !== null ? `${avg}%` : '—',
        { content: '', pct: avg, raw: { pct: avg } },
        { content: statusLabel, styles: { halign: 'center', fontStyle: 'bold', fillColor: badgeBg, textColor: badgeText } }
      ];
    });

    customTables.push({
      title: 'II. AVANCE POR SECCIÓN / DIMENSIÓN EVALUADA',
      subtitle: 'Nivel de cumplimiento promedio obtenido en cada una de las dimensiones que integran el instrumento.',
      minHeight: 145, // R6.4: Espacio suficiente para no dividirse entre páginas
      beforeDraw: (doc, curY, pageW, margin) => {
        // R6.1: Leyenda vectorial limpia (doc.circle) para evitar glifos corruptos
        const legY = curY + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Leyenda:', margin, legY);

        let lx = margin + 46;
        const legendItems = [
          { label: `Logrado (>= ${logCut}%): Cumplido`, color: [22, 163, 74] },
          { label: `Proceso (${procCut}%–${logCut - 1}%): En proceso`, color: [217, 119, 6] },
          { label: isEbr ? `Inicio (< ${procCut}%): Nivel inicio` : `Inicio (< ${procCut}%): Por mejorar`, color: [220, 38, 38] },
          { label: 'N/A: No aplica', color: [148, 163, 184] }
        ];
        legendItems.forEach(it => {
          doc.setFillColor(it.color[0], it.color[1], it.color[2]);
          doc.circle(lx + 3, legY - 2.5, 2.5, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(51, 65, 85);
          doc.text(it.label, lx + 8, legY);
          lx += doc.getTextWidth(it.label) + 16;
        });
        return curY + 12;
      },
      tableHeaders: ['N.°', 'Sección / Dimensión Evaluada', 'N.° Indicadores', '% Cumpl.', 'Gráfica de Avance', 'Nivel Alcanzado'],
      tableRows: secTableRows.length > 0 ? secTableRows : [
        [{ content: 'Sin secciones registradas', colSpan: 6, styles: { halign: 'center', textColor: [100, 116, 139] } }]
      ],
      styles: {
        cellPadding: { top: 4, right: 5, bottom: 4, left: 5 }
      },
      columnStyles: isLandscape ? {
        0: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 75 },
        3: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 210 },
        5: { halign: 'center', cellWidth: 105, fontStyle: 'bold' }
      } : {
        0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 55 },
        3: { halign: 'center', cellWidth: 48, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 130 },
        5: { halign: 'center', cellWidth: 79, fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const doc = data.doc;
          if (!doc) return;
          const rawObj = data.cell.raw;
          let pct = null;
          if (typeof rawObj === 'number') {
            pct = rawObj;
          } else if (rawObj && typeof rawObj === 'object') {
            if (rawObj.pct !== undefined) pct = rawObj.pct;
            else if (rawObj.raw && rawObj.raw.pct !== undefined) pct = rawObj.raw.pct;
          }
          if (pct !== null && !isNaN(pct)) {
            const trackX = data.cell.x + 6;
            const trackY = data.cell.y + (data.cell.height - 8) / 2;
            const trackW = data.cell.width - 12;
            const trackH = 8;
            doc.setFillColor(229, 231, 235);
            doc.roundedRect(trackX, trackY, trackW, trackH, 2.5, 2.5, 'F');
            const fillW = Math.max(3, trackW * (Math.min(Math.max(pct, 0), 100) / 100));
            if (pct >= logCut) doc.setFillColor(22, 163, 74);
            else if (pct >= procCut) doc.setFillColor(217, 119, 6);
            else doc.setFillColor(220, 38, 38);
            doc.roundedRect(trackX, trackY, fillW, trackH, 2.5, 2.5, 'F');
          }
        }
      }
    });
  } else if (isAllMode) {
    const typeAgg = {};
    statsList.forEach(x => {
      const tid = x.s.fichaTypeId;
      if (!typeAgg[tid]) {
        typeAgg[tid] = { nombre: x.s.fichaTypeNombre || 'Ficha', total: 0, sum: 0, cnt: 0, logrado: 0, proceso: 0, inicio: 0 };
      }
      const a = typeAgg[tid];
      a.total++;
      if (x.st.pct !== null && x.st.pct !== undefined) { a.sum += x.st.pct; a.cnt++; }
      if (x.st.pct >= 85) a.logrado++;
      else if (x.st.pct >= 70) a.proceso++;
      else if (x.st.pct !== null && x.st.pct !== undefined) a.inicio++;
    });

    const typeRows = Object.values(typeAgg).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((a, idx) => {
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      return [
        String(idx + 1),
        a.nombre,
        String(a.total),
        avg !== null ? `${avg}%` : '—',
        { content: '', pct: avg, raw: { pct: avg } },
        `L: ${a.logrado}  ·  P: ${a.proceso}  ·  I: ${a.inicio}`
      ];
    });

    customTables.push({
      title: 'II. AVANCE GENERAL POR TIPO DE FICHA',
      subtitle: 'Promedio de cumplimiento y distribución de estados comparativos por cada tipo de ficha registrada.',
      minHeight: 145,
      beforeDraw: (doc, curY, pageW, margin) => {
        const legY = curY + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Leyenda:', margin, legY);

        let lx = margin + 46;
        const legendItems = [
          { label: 'Logrado (>= 85%): Cumplido', color: [22, 163, 74] },
          { label: 'Proceso (70%–84%): En proceso', color: [217, 119, 6] },
          { label: 'Inicio (< 70%): Por mejorar', color: [220, 38, 38] }
        ];
        legendItems.forEach(it => {
          doc.setFillColor(it.color[0], it.color[1], it.color[2]);
          doc.circle(lx + 3, legY - 2.5, 2.5, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(51, 65, 85);
          doc.text(it.label, lx + 8, legY);
          lx += doc.getTextWidth(it.label) + 16;
        });
        return curY + 12;
      },
      tableHeaders: ['N.°', 'Tipo de Ficha de Monitoreo', 'Fichas Registradas', '% Cumpl.', 'Gráfica de Avance', 'Distribución (L / P / I)'],
      tableRows: typeRows.length > 0 ? typeRows : [
        [{ content: 'Sin registros para los filtros seleccionados', colSpan: 6, styles: { halign: 'center', textColor: [100, 116, 139] } }]
      ],
      columnStyles: isLandscape ? {
        0: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 80 },
        3: { halign: 'center', cellWidth: 70, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 210 },
        5: { halign: 'center', cellWidth: 110, fontStyle: 'bold' }
      } : {
        0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 55 },
        3: { halign: 'center', cellWidth: 48, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 130 },
        5: { halign: 'center', cellWidth: 77, fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const doc = data.doc;
          if (!doc) return;
          const rawObj = data.cell.raw;
          let pct = null;
          if (typeof rawObj === 'number') {
            pct = rawObj;
          } else if (rawObj && typeof rawObj === 'object') {
            if (rawObj.pct !== undefined) pct = rawObj.pct;
            else if (rawObj.raw && rawObj.raw.pct !== undefined) pct = rawObj.raw.pct;
          }
          if (pct !== null && !isNaN(pct)) {
            const trackX = data.cell.x + 6;
            const trackY = data.cell.y + (data.cell.height - 8) / 2;
            const trackW = data.cell.width - 12;
            const trackH = 8;
            doc.setFillColor(229, 231, 235);
            doc.roundedRect(trackX, trackY, trackW, trackH, 2.5, 2.5, 'F');
            const fillW = Math.max(3, trackW * (Math.min(Math.max(pct, 0), 100) / 100));
            if (pct >= 85) doc.setFillColor(22, 163, 74);
            else if (pct >= 70) doc.setFillColor(217, 119, 6);
            else doc.setFillColor(220, 38, 38);
            doc.roundedRect(trackX, trackY, fillW, trackH, 2.5, 2.5, 'F');
          }
        }
      }
    });
  }

  // ==========================================
  // SECCIÓN III: MATRIZ COMPARATIVA POR INSTITUCIÓN Y DIMENSIÓN + COLUMNA REI
  // (Dinámica con nombres reales de secciones, soporte multi-tipo y visita condicional)
  // ==========================================
  if (totalFichas >= 1 && downloadConfig.incluirMatriz !== false) {
    const typeGroups = {};
    if (isAllMode) {
      statsList.forEach(x => {
        const tid = x.s.fichaTypeId || 'sin_tipo';
        if (!typeGroups[tid]) typeGroups[tid] = [];
        typeGroups[tid].push(x);
      });
    } else {
      typeGroups[fichaType?.id || 'tipo_actual'] = statsList;
    }

    const typeGroupEntries = Object.entries(typeGroups);
    typeGroupEntries.forEach(([tid, groupStats], gIdx) => {
      let groupFt = fichaType;
      if (isAllMode) {
        if (typeof downloadConfig.getFichaType === 'function') {
          groupFt = downloadConfig.getFichaType(tid);
        } else if (Array.isArray(downloadConfig.fichaTypes)) {
          groupFt = downloadConfig.fichaTypes.find(f => f.id === tid);
        }
        if (!groupFt) {
          groupFt = {
            id: tid,
            nombre: groupStats[0]?.s?.fichaTypeNombre || 'Monitoreo',
            secciones: []
          };
        }
      }

      const groupIsJec = isFichaJec(groupFt) || isFichaCoordTutoriaJec(groupFt) || isFichaCoordPedagogico(groupFt) || isFichaEspecialistaJec(groupFt);
      let groupIsEbr = !groupIsJec && (isFichaEbrGestionEscolar(groupFt)
        || isFichaEbrEbePrite(groupFt)
        || isFichaCebeGestion(groupFt)
        || isFichaPriteGestion(groupFt)
        || (groupFt?.escala === 'IPL')
        || (groupFt?.tipoRespuesta === 'ips')
        || groupStats.some(x => isFichaEbrGestionEscolar(x.s) || isFichaCebeGestion(x.s) || isFichaPriteGestion(x.s)));

      let seccionesParaAgg = (groupFt?.secciones && groupFt.secciones.length > 0)
        ? groupFt.secciones
        : [];
      if (isFichaCebeGestion(groupFt)) {
        seccionesParaAgg = CEBE_SECCIONES;
      } else if (isFichaPriteGestion(groupFt)) {
        seccionesParaAgg = PRITE_SECCIONES;
      } else if (isFichaEbrGestionEscolar(groupFt)) {
        const hasV2 = groupStats.some(x => Number(x.s.visita) === 2);
        seccionesParaAgg = hasV2 ? EBR_GESTION_VISITA_2_SECCIONES : EBR_GESTION_VISITA_1_SECCIONES;
      } else if (isFichaJec(groupFt)) {
        seccionesParaAgg = (groupFt?.secciones && groupFt.secciones.length === JEC_SECCIONES.length) ? groupFt.secciones : JEC_SECCIONES;
      }

      if (seccionesParaAgg.length === 0 && groupStats[0]?.st?.secciones) {
        seccionesParaAgg = groupStats[0].st.secciones.map(sc => ({ nombre: sc.nombre, items: [] }));
      }

      if (seccionesParaAgg.length > 0) {
        // R3: Nombres reales de dimensiones con salto de línea y número de indicadores
        const secHeaders = seccionesParaAgg.map(s => {
          let count = s.items ? s.items.length : 0;
          if (count === 0 && groupStats[0]?.st?.secciones) {
            const sc = groupStats[0].st.secciones.find(x => x.nombre === s.nombre);
            if (sc && sc.total) count = sc.total;
          }
          return count > 0 ? `${s.nombre}\n(${count} ind.)` : s.nombre;
        });

        // R3: Ocultar columna Visita si el filtro es una visita única (ej: V1 o V2)
        const uniqueVisitas = new Set(groupStats.map(x => String(x.s?.visita || '').trim()).filter(Boolean));
        const isSingleVisitFilter = Boolean(filters.visita) && (String(filters.visita) === '1' || String(filters.visita) === '2');
        const showVisitaCol = !isSingleVisitFilter && uniqueVisitas.size > 1;

        const matrizHeaders = ['N.°', 'Institución Educativa', 'REI', ...(showVisitaCol ? ['Visita'] : []), ...secHeaders, 'Global', 'Estado'];

        // R3: Ordenar de menor a mayor cumplimiento global; desempate alfabético por I.E.
        const sortedStats = [...statsList].sort((a, b) => {
          const diff = (a.st.pct ?? 0) - (b.st.pct ?? 0);
          if (diff !== 0) return diff;
          return (a.s?.institucion || '').localeCompare(b.s?.institucion || '');
        }).filter(x => groupStats.includes(x));

        const gLogCut = groupIsEbr ? 67 : 85;
        const gProcCut = groupIsEbr ? 34 : 70;

        const normKey = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const matrizRows = sortedStats.map((x, idx) => {
          const s = x.s;
          const st = x.st;
          const secMap = {};
          const normSecMap = new Map();
          (st.secciones || []).forEach(sc => {
            secMap[sc.nombre] = sc.pct;
            normSecMap.set(normKey(sc.nombre), sc.pct);
          });

          const secCells = seccionesParaAgg.map(sec => {
            let p = secMap[sec.nombre];
            if (p === undefined) p = normSecMap.get(normKey(sec.nombre));
            if (p === undefined || p === null) return '—';
            let bg = [255, 255, 255];
            let col = [15, 27, 45];
            if (p >= gLogCut) { bg = [236, 253, 245]; col = [4, 120, 87]; }
            else if (p >= gProcCut) { bg = [254, 243, 199]; col = [180, 83, 9]; }
            else { bg = [254, 226, 226]; col = [185, 28, 28]; }
            return { content: `${p}%`, styles: { halign: 'center', fillColor: bg, textColor: col, fontStyle: 'bold' } };
          });

          const globPct = st.pct !== null && st.pct !== undefined ? `${st.pct}%` : '—';
          const globStatus = st.pct === null || st.pct === undefined ? 'Sin datos' : (st.pct >= gLogCut ? 'Logrado' : (st.pct >= gProcCut ? 'En proceso' : (groupIsEbr ? 'Inicio' : 'Por mejorar')));
          const statusCol = st.pct >= gLogCut ? [4, 120, 87] : (st.pct >= gProcCut ? [180, 83, 9] : [185, 28, 28]);
          const statusBg = st.pct >= gLogCut ? [236, 253, 245] : (st.pct >= gProcCut ? [254, 243, 199] : [254, 226, 226]);

          return [
            String(idx + 1),
            s.institucion || '—',
            formatRei(s.red),
            ...(showVisitaCol ? [s.visita ? `V${s.visita}` : '—'] : []),
            ...secCells,
            { content: globPct, styles: { halign: 'center', fontStyle: 'bold', textColor: statusCol } },
            { content: globStatus, styles: { halign: 'center', fontStyle: 'bold', fillColor: statusBg, textColor: statusCol } }
          ];
        });

        const numDims = seccionesParaAgg.length;
        const availableDimsWidth = isLandscape
          ? (showVisitaCol ? 350 : 386)
          : (showVisitaCol ? 190 : 218);
        const dimColW = Math.max(38, Math.floor(availableDimsWidth / numDims));

        const colStyles = {
          0: { halign: 'center', cellWidth: isLandscape ? 24 : 18 },
          1: { halign: 'left', valign: 'middle' },
          2: { halign: 'center', cellWidth: isLandscape ? 48 : 36, fontStyle: 'bold' },
        };
        let cOffset = 3;
        if (showVisitaCol) {
          colStyles[cOffset] = { halign: 'center', cellWidth: isLandscape ? 36 : 28 };
          cOffset++;
        }
        seccionesParaAgg.forEach((_, sIdx) => {
          colStyles[cOffset + sIdx] = { halign: 'center', cellWidth: dimColW, fontSize: numDims > 5 ? 6.2 : 6.8 };
        });
        colStyles[cOffset + numDims] = { halign: 'center', cellWidth: isLandscape ? 50 : 36, fontStyle: 'bold' };
        colStyles[cOffset + numDims + 1] = { halign: 'center', cellWidth: isLandscape ? 70 : 60, fontStyle: 'bold' };

        const matrizTable = {
          title: 'III. MATRIZ COMPARATIVA POR INSTITUCIÓN Y DIMENSIÓN',
          subtitle: 'Desempeño desagregado por institución educativa y dimensión evaluada (ordenado de menor a mayor cumplimiento global).',
          minHeight: 90,
          showHead: 'everyPage',
          tableHeaders: matrizHeaders,
          tableRows: matrizRows,
          styles: { fontSize: 7, cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 }, valign: 'middle' },
          headStyles: { fontSize: numDims > 5 ? 6.5 : 7.2 },
          columnStyles: colStyles
        };
        if (typeGroupEntries.length > 1) {
          matrizTable.title = `III.${gIdx + 1}. MATRIZ COMPARATIVA — ${(groupFt?.nombre || 'MONITOREO').toUpperCase()}`;
        }
        customTables.push(matrizTable);
      }
    });
  }

  // ==========================================
  // SECCIÓN IV: REPORTE POR ÍTEM — CONSOLIDADO DE INDICADORES (CONDICIONAL)
  // ==========================================
  const incluirReporteItem = Boolean(downloadConfig.incluirReporteItem || downloadConfig.incluir_items);
  if (incluirReporteItem && statsList.length > 0 && fichaType) {
    const subsList = statsList.map(x => x.s);
    const aggSections = computeItemAgg(subsList, fichaType);

    if (aggSections && aggSections.length > 0) {
      customTables.push({
        title: 'IV. REPORTE POR ÍTEM — CONSOLIDADO DE INDICADORES',
        subtitle: `Detalle consolidado de cada indicador evaluado (n = ${totalFichas} fichas de monitoreo procesadas).`,
        minHeight: 80,
        pageBreak: 'before',
        beforeDraw: (doc, curY, pageW, margin) => {
          const legY = curY + 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text('Leyenda:', margin, legY);

          let lx = margin + 46;
          const legendPills = [
            { label: 'Logrado: Cumplido', color: [22, 163, 74] },
            { label: 'Proceso: En proceso', color: [217, 119, 6] },
            { label: isEbr ? 'Inicio: Nivel inicio' : 'Inicio: Por mejorar', color: [220, 38, 38] },
            { label: 'N/A: No aplica', color: [148, 163, 184] }
          ];
          legendPills.forEach(it => {
            doc.setFillColor(it.color[0], it.color[1], it.color[2]);
            doc.circle(lx + 3, legY - 2.5, 2.5, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(51, 65, 85);
            doc.text(it.label, lx + 8, legY);
            lx += doc.getTextWidth(it.label) + 16;
          });
          return curY + 12;
        }
      });

      aggSections.forEach((sec) => {
        const secCut = isEbr ? 67 : 85;
        const secProcCut = isEbr ? 34 : 70;
        let secStatus = 'Sin datos';
        let secBg = [243, 244, 246];
        let secCol = [107, 114, 128];
        if (sec.avg !== null) {
          if (sec.avg >= secCut) { secStatus = 'Logrado'; secBg = [236, 253, 245]; secCol = [4, 120, 87]; }
          else if (sec.avg >= secProcCut) { secStatus = 'En proceso'; secBg = [254, 243, 199]; secCol = [180, 83, 9]; }
          else { secStatus = isEbr ? 'Inicio' : 'Por mejorar'; secBg = [254, 226, 226]; secCol = [185, 28, 28]; }
        }

        const secBannerTitle = `${sec.nombre} (${sec.items.length} indicadores)`;
        const secSubtitle = `Cumplimiento de la sección: ${sec.avg !== null ? sec.avg + '%' : '—'}  ·  Nivel: ${secStatus}`;

        const itemRows = sec.items.map((it, iIdx) => {
          let itemStatus = 'Sin datos';
          let itemBg = [243, 244, 246];
          let itemCol = [107, 114, 128];
          if (it.pct !== null) {
            if (it.pct >= secCut) { itemStatus = 'Logrado'; itemBg = [236, 253, 245]; itemCol = [4, 120, 87]; }
            else if (it.pct >= secProcCut) { itemStatus = 'En proceso'; itemBg = [254, 243, 199]; itemCol = [180, 83, 9]; }
            else { itemStatus = isEbr ? 'Inicio' : 'Por mejorar'; itemBg = [254, 226, 226]; itemCol = [185, 28, 28]; }
          }

          // R4: Distribución: conteo por nivel con su color. Omitir los niveles con 0.
          const distParts = [];
          if (it.counts.logrado) distParts.push(`Logrado: ${it.counts.logrado}`);
          if (it.counts.proceso) distParts.push(`Proceso: ${it.counts.proceso}`);
          if (it.counts.inicio) distParts.push(`Inicio: ${it.counts.inicio}`);
          if (it.counts.na || it.counts.nc) distParts.push(`N/A: ${(it.counts.na || 0) + (it.counts.nc || 0)}`);
          if (it.counts.si) distParts.push(`Sí: ${it.counts.si}`);
          if (it.counts.no) distParts.push(`No: ${it.counts.no}`);
          const distString = distParts.length ? distParts.join('  ·  ') : '—';

          return [
            String(iIdx + 1),
            it.texto || `Ítem ${it.id}`,
            { content: itemStatus, styles: { halign: 'center', fontStyle: 'bold', fillColor: itemBg, textColor: itemCol } },
            distString,
            it.pct !== null ? `${it.pct}%` : '—'
          ];
        });

        customTables.push({
          title: secBannerTitle,
          subtitle: secSubtitle,
          minHeight: 50,
          showHead: 'everyPage',
          tableHeaders: ['N.°', 'Indicador / Ítem', 'Resultado', `Distribución (n = ${totalFichas})`, '%'],
          tableRows: itemRows,
          styles: { fontSize: 7, cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 }, valign: 'middle' },
          columnStyles: isLandscape ? {
            0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 80, fontStyle: 'bold' },
            3: { halign: 'center', cellWidth: 210 },
            4: { halign: 'center', cellWidth: 48, fontStyle: 'bold' }
          } : {
            0: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 68, fontStyle: 'bold' },
            3: { halign: 'center', cellWidth: 140 },
            4: { halign: 'center', cellWidth: 40, fontStyle: 'bold' }
          }
        });
      });
    }
  }

  // ==========================================
  // NOTA METODOLÓGICA COMPLETA (SIN TRUNCAR)
  // ==========================================
  let notaMetodologicaTexto = '';
  if (isFichaEbrGestionEscolar(fichaType)) {
    notaMetodologicaTexto = 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar se determina según la escala oficial UGEL 03 EBR: Logrado (47–69 pts en V2, 39–57 pts en V1 / 67%–100%), En proceso (24–46 pts en V2, 20–38 pts en V1 / 34%–66%), Inicio (0–23 pts en V2, 0–19 pts en V1 / 0%–33%). Cada indicador se evalúa en escala Inicio (1 pt / 33%), Proceso (2 pts / 66%) y Logrado (3 pts / 100%), excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else if (isFichaPriteGestion(fichaType)) {
    notaMetodologicaTexto = 'El cumplimiento de la Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar PRITE se determina según la escala oficial UGEL 03 (RM N° 501-2025-MINEDU): Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). La ficha consta de 32 indicadores en 7 dimensiones evaluados a lo largo de 3 visitas independientes (V1, V2, V3). Cada indicador aplicable se valora en escala Inicio (0%), Proceso (50%) y Logrado (100%), excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else if (isFichaCebeGestion(fichaType)) {
    notaMetodologicaTexto = 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar CEBE se determina según la escala oficial UGEL 03: Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). La ficha consta de 25 indicadores en 6 dimensiones evaluados a lo largo de 3 visitas independientes (V1, V2, V3). Cada indicador aplicable se valora en escala Inicio (0%), Proceso (50%) y Logrado (100%), excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else if (isJec) {
    notaMetodologicaTexto = 'El cumplimiento de la Ficha de Monitoreo JEC se determina según la regla oficial MINEDU/UGEL 03: Implementación lograda (>= 24 sí), Implementación parcial (12–23 sí), Implementación incipiente (< 12 sí). Se evalúan 31 indicadores de cumplimiento directo Sí/No.';
  } else if (isEbr) {
    notaMetodologicaTexto = 'El cumplimiento se determina según el criterio unificado UGEL 03 (EBR / EBE / PRITE): Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). Cada indicador aplicable se evalúa según la escala establecida, excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else {
    notaMetodologicaTexto = 'El cumplimiento de cada ítem se calcula mediante la conversión: IV = 100%, III = 75%, II = 50%, I = 25%; el porcentaje de cada dimensión corresponde al promedio aritmético de sus ítems y el global corresponde al promedio de todos los ítems evaluados en la visita. Escala de valoración institucional: Logrado >= 85%, En proceso 70% – 84%, Por mejorar < 70%.';
  }

  const summarySections = [
    {
      title: 'Nota Metodológica',
      content: notaMetodologicaTexto
    }
  ];

  // Validación estricta de visita única para EBR Gestión Escolar (Regla 8.2)
  if (isFichaEbrGestionEscolar(fichaType)) {
    const v = Number(filters.visita);
    if (v !== 1 && v !== 2) {
      const err = new Error('Error 400: Para generar el reporte oficial PDF de Gestión Escolar EBR debes elegir Visita 1 o Visita 2. Cada visita tiene indicadores distintos y se descarga por separado.');
      err.status = 400;
      throw err;
    }
  }

  const safeName = sanitizeFilename(isAllMode ? 'general' : (fichaType ? (isDirectivoType ? 'Monitoreo_Directivo_IE' : fichaType.nombre) : 'reporte'));
  const visitaTag = filters.visita ? `_V${filters.visita}` : '';
  const itemsTag = incluirReporteItem ? '_con_items' : '';
  let filename = `Reporte_Consolidado_${safeName}${visitaTag}_${getLimaDateStr()}${itemsTag}.pdf`;

  let officialTitle = title;
  let officialSubtitle = `Consolidado Oficial de Monitoreo y Acompañamiento 2026 · UGEL 03 · ${filterSubtitle}`;

  if (isFichaEbrGestionEscolar(fichaType)) {
    const v = Number(filters.visita) || 1;
    const momRomano = v === 2 ? 'II' : 'I';
    const momNombre = v === 2 ? 'Visita 2 · Segundo momento' : 'Visita 1 · Primer momento';
    const fechaLimaStr = getLimaDateStr().replace(/-/g, '');
    filename = `REPORTE_MONITOREO_GESTION_EBR_${momRomano}_MOMENTO_${fechaLimaStr}.pdf`;
    officialTitle = `REPORTE OFICIAL DE MONITOREO Y ASISTENCIA TÉCNICA A LA GESTIÓN ESCOLAR — ${momNombre.toUpperCase()}`;
    officialSubtitle = `${momNombre} · UGEL 03 · AGEBRE · ${filterSubtitle}`;
  }

  // Bloque de firmas oficial dinámico
  const areaSigla = (downloadConfig.areaConfig && downloadConfig.areaConfig.sigla) ? downloadConfig.areaConfig.sigla : 'AGEBRE';
  const isJecReport = isFichaEspecialistaJec(fichaType);
  const defaultSignatures = [
    {
      cargo: isJecReport ? 'Especialista Responsable de JEC — UGEL 03' : `Especialista Responsable de Monitoreo — ${areaSigla}`,
      nombre: isJecReport ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : '',
      entidad: 'UGEL 03 – DRELM',
      leyenda: 'Firma y Sello'
    },
    { cargo: `Jefatura de ${areaSigla} — UGEL 03 – DRELM`, entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
  ];

  await createOfficialPdfDocument({
    title: officialTitle,
    subtitle: officialSubtitle,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    soloEncabezadoPagina1: true,
    metaGrid: [], // Se renderiza dentro de Sección I con las 3 tarjetas KPI estilizadas
    customTables,
    summarySections,
    signatures: downloadConfig.signatures || defaultSignatures,
    lugarFecha: downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`,
    sinFirmas: downloadConfig.sinFirmas || false,
    areaConfig: downloadConfig.areaConfig || null,
    incluirQr: downloadConfig.incluirQr !== false,
    datosIncompletos: downloadConfig.datosIncompletos || false,
    marcaBorrador: downloadConfig.marcaBorrador || false,
    filename
  });
}

/**
 * Versión Legacy (V1) para retrocompatibilidad y rollback instantáneo sin downtime.
 */
export async function exportConsolidadoReportPdfV1(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const isDirectivoType = fichaType && (fichaType.tipoRespuesta === 'nivel_1_4' || (fichaType.id || '').includes('directivo') || (fichaType.nombre || '').toLowerCase().includes('directivo'));

  const title = isAllMode
    ? 'REPORTE CONSOLIDADO GENERAL DE MONITOREO'
    : `REPORTE CONSOLIDADO — ${(fichaType ? fichaType.nombre.toUpperCase() : 'MONITOREO')}`;

  const totalFichas = statsList.length;
  const instCount = new Set(statsList.map(x => x.s.institucion || '')).size;
  const withPct = statsList.filter(x => x.st.pct !== null);
  const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : '—';

  const filtrosAplicados = [];
  if (filters.institucion) filtrosAplicados.push(`I.E.: ${filters.institucion}`);
  if (filters.red) filtrosAplicados.push(`RED: ${filters.red}`);
  if (filters.visita) filtrosAplicados.push(`Visita: ${filters.visita}`);
  if (filters.responsable) filtrosAplicados.push(`Responsable: ${filters.responsable}`);
  if (filters.distrito) filtrosAplicados.push(`Distrito: ${filters.distrito}`);
  if (filters.desde || filters.hasta) filtrosAplicados.push(`Período: ${filters.desde || 'inicio'} a ${filters.hasta || 'fin'}`);
  const filterSubtitle = filtrosAplicados.length ? `Filtros: ${filtrosAplicados.join(' · ')}` : 'Filtros: ninguno (todos los registros)';

  const introParagraph = `El presente documento consolida la información de las visitas de monitoreo registradas en el Sistema de Gestión Institucional UGEL 03 para el año lectivo 2026. Se reporta un total de ${plural(totalFichas, 'ficha', 'fichas')} de monitoreo aplicada(s) en ${plural(instCount, 'institución educativa', 'instituciones educativas')}, con un nivel de cumplimiento promedio general del ${avgPct}%. ${filterSubtitle}.`;

  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  const isEbr = !isJec && (isFichaEbrGestionEscolar(fichaType) || isFichaEbrEbePrite(fichaType) || isFichaCebeGestion(fichaType) || isFichaPriteGestion(fichaType) || (fichaType?.escala === 'IPL') || (fichaType?.tipoRespuesta === 'ips'));
  const logCut = isEbr ? 67 : 85;
  const procCut = isEbr ? 34 : 70;

  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    if (x.st.pct === null) dist.none++;
    else {
      const lbl = (x.st?.estado?.estado_panel || x.st?.estado?.label || '').toLowerCase();
      if (lbl.includes('no cumple') || lbl.includes('inici') || lbl.includes('incipient') || lbl.includes('mejorar')) dist.inicio++;
      else if (lbl.includes('parcial') || lbl.includes('proces')) dist.proceso++;
      else if (lbl.includes('lograd') || lbl.includes('cumple')) dist.logrado++;
      else if (x.st.pct >= logCut) dist.logrado++;
      else if (x.st.pct >= procCut) dist.proceso++;
      else dist.inicio++;
    }
  });

  const pctLogrado = totalFichas ? Math.round((dist.logrado / totalFichas) * 100) : 0;
  const pctProceso = totalFichas ? Math.round((dist.proceso / totalFichas) * 100) : 0;
  const pctInicio = totalFichas ? Math.round((dist.inicio / totalFichas) * 100) : 0;
  const pctNone = totalFichas ? Math.round((dist.none / totalFichas) * 100) : 0;

  const customTables = [];

  customTables.push({
    title: 'I. DISTRIBUCIÓN DE RESULTADOS',
    subtitle: 'Categorización porcentual y numérica de las fichas de monitoreo según el nivel de logro alcanzado.',
    minHeight: 90,
    tableHeaders: ['Nivel de Logro', 'Rango de Cumplimiento', 'Cantidad de Fichas', 'Porcentaje (%)', 'Interpretación Institucional'],
    tableRows: [
      ['Logrado', `>= ${logCut}%`, String(dist.logrado), `${pctLogrado}%`, 'Nivel óptimo; cumple satisfactoriamente los estándares evaluados'],
      ['En proceso', `${procCut}% – ${logCut - 1}%`, String(dist.proceso), `${pctProceso}%`, 'En desarrollo; requiere fortalecimiento de prácticas pedagógicas'],
      ['Por mejorar', `< ${procCut}%`, String(dist.inicio), `${pctInicio}%`, 'Requiere asistencia técnica focalizada y acompañamiento prioritario'],
      ['Sin datos', '—', String(dist.none), `${pctNone}%`, 'Fichas sin respuestas o con indicadores no evaluados'],
      ['TOTAL', '—', String(totalFichas), '100%', 'Total consolidado de visitas de monitoreo procesadas']
    ]
  });

  let notaMetodologicaTextoV1 = '';
  if (isFichaEbrGestionEscolar(fichaType)) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar se determina según la escala oficial UGEL 03 EBR: Logrado (47–69 pts en V2, 39–57 pts en V1 / 67%–100%), En proceso (24–46 pts en V2, 20–38 pts en V1 / 34%–66%), Inicio (0–23 pts en V2, 0–19 pts en V1 / 0%–33%). Cada indicador se evalúa en escala Inicio (1 pt / 33%), Proceso (2 pts / 66%) y Logrado (3 pts / 100%).';
  } else if (isFichaPriteGestion(fichaType)) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar PRITE se determina según la escala oficial UGEL 03 (RM N° 501-2025-MINEDU): Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). La ficha consta de 32 indicadores en 7 dimensiones evaluados a lo largo de 3 visitas independientes (V1, V2, V3). Cada indicador aplicable se valora en escala Inicio (0%), Proceso (50%) y Logrado (100%), excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else if (isFichaCebeGestion(fichaType)) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar CEBE se determina según la escala oficial UGEL 03: Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). La ficha consta de 25 indicadores en 6 dimensiones evaluados a lo largo de 3 visitas independientes (V1, V2, V3). Cada indicador aplicable se valora en escala Inicio (0%), Proceso (50%) y Logrado (100%), excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else if (isJec) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo JEC se determina según la regla oficial MINEDU/UGEL 03: Implementación lograda (>= 24 sí), Implementación parcial (12–23 sí), Implementación incipiente (< 12 sí). Se evalúan 31 indicadores de cumplimiento directo Sí/No.';
  } else if (isEbr) {
    notaMetodologicaTextoV1 = 'El cumplimiento se determina según el criterio unificado UGEL 03 (EBR / EBE / PRITE): Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). Cada indicador aplicable se evalúa según la escala establecida, excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else {
    notaMetodologicaTextoV1 = 'El cumplimiento de cada ítem se calcula mediante la conversión: IV = 100%, III = 75%, II = 50%, I = 25%; el porcentaje de cada dimensión corresponde al promedio aritmético de sus ítems y el global corresponde al promedio de todos los ítems evaluados en la visita. Escala de valoración institucional: Logrado >= 85%, En proceso 70% – 84%, Por mejorar < 70%.';
  }

  const summarySections = [
    {
      title: 'Nota Metodológica',
      content: notaMetodologicaTextoV1
    }
  ];

  const safeName = sanitizeFilename(isAllMode ? 'general' : (fichaType ? (isDirectivoType ? 'Monitoreo_Directivo_IE' : fichaType.nombre) : 'reporte'));
  const filename = `Reporte_Consolidado_${safeName}_${getLimaDateStr()}.pdf`;

  const areaSigla = (downloadConfig.areaConfig && downloadConfig.areaConfig.sigla) ? downloadConfig.areaConfig.sigla : 'AGEBRE';
  const defaultSignatures = [
    { cargo: `Especialista Responsable de Monitoreo — ${areaSigla}`, entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: `Jefatura de ${areaSigla} — UGEL 03 – DRELM`, entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: `Consolidado Oficial de Monitoreo y Acompañamiento 2026 · UGEL 03 · ${filterSubtitle}`,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid: [],
    customTables,
    summarySections,
    signatures: downloadConfig.signatures || defaultSignatures,
    lugarFecha: downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`,
    sinFirmas: downloadConfig.sinFirmas || false,
    areaConfig: downloadConfig.areaConfig || null,
    incluirQr: downloadConfig.incluirQr !== false,
    datosIncompletos: downloadConfig.datosIncompletos || false,
    marcaBorrador: downloadConfig.marcaBorrador || false,
    filename
  });
}

/**
 * Función principal de exportación con soporte para Feature Flag de versión.
 * Por defecto ejecuta V2. Si downloadConfig.version === 1 o window.__REPORT_PDF_V1 === true, ejecuta V1.
 */
export async function exportConsolidadoReportPdf(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  const forceV1 = (downloadConfig && downloadConfig.version === 1) || (typeof window !== 'undefined' && window.__REPORT_PDF_V1 === true);
  if (forceV1) {
    return await exportConsolidadoReportPdfV1(statsList, fichaType, filters, isAllMode, downloadConfig);
  }
  return await exportConsolidadoReportPdfV2(statsList, fichaType, filters, isAllMode, downloadConfig);
}

/**
 * Exporta el Padrón de Instituciones Educativas a PDF en orientación HORIZONTAL (Landscape)
 */
export async function exportColegiosReportPdf(colegios, stats = {}, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const title = 'PADRÓN OFICIAL DE INSTITUCIONES EDUCATIVAS MONITOREADAS';
  const introParagraph = `El presente reporte detalla el padrón general de instituciones educativas correspondientes a la jurisdicción de la Unidad de Gestión Educativa Local N.° 03 (UGEL 03), registrando la cobertura de monitoreo alcanzada a la fecha y los datos de gestión directiva.`;

  const metaGrid = [
    { label: 'Total Colegios en Padrón', value: String(colegios.length) },
    { label: 'REI / Redes Educativas', value: String(stats.totalReis || '—') },
    { label: 'Colegios Monitoreados', value: String(stats.monitoreados || '—') },
    { label: 'Cobertura Alcanzada', value: stats.cobertura ? `${stats.cobertura}%` : '—' }
  ];

  const tableHeaders = ['REI', 'Cód. Local', 'Institución Educativa', 'Distrito', 'Gestión', 'Director(a)', 'N.° Monitoreos', 'Última Visita'];

  const tableRows = colegios.map(c => [
    c.rei || '—',
    c.codigoLocal || '—',
    c.ie || '—',
    c.distrito || '—',
    c.tipoGestion || '—',
    c.director ? c.director.nombre : '—',
    String(c._subsCount || 0),
    c._lastVisit ? formatDate(c._lastVisit) : '—'
  ]);

  const filename = `Padron_Colegios_UGEL03_${getLimaDateStr()}.pdf`;

  const defaultSignatures = [
    { cargo: 'Responsable del Padrón de Instituciones', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'Jefatura de AGEBRE', entidad: 'UGEL 03', leyenda: 'V.° B.°' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: 'Padrón de Instituciones Educativas y Cobertura 2026 · UGEL 03',
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows,
    columnStyles: {
      0: { halign: 'center', cellWidth: 45, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 55 },
      2: { halign: 'left' },
      3: { halign: 'left', cellWidth: 75 },
      4: { halign: 'center', cellWidth: 65 },
      6: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 65 }
    },
    signatures: downloadConfig.signatures || defaultSignatures,
    lugarFecha: downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`,
    sinFirmas: downloadConfig.sinFirmas || false,
    areaConfig: downloadConfig.areaConfig || null,
    incluirQr: downloadConfig.incluirQr !== false,
    datosIncompletos: downloadConfig.datosIncompletos || false,
    marcaBorrador: downloadConfig.marcaBorrador || false,
    filename
  });
}
