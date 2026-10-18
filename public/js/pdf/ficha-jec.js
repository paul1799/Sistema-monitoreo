/* =========================================================================
   pdf/ficha-jec.js — Generador oficial de PDF para la Ficha JEC
   (Jornada Escolar Completa) · UGEL 03 · AGEBRE
   ========================================================================= */

import {
  createOfficialPdfDocument,
  formatDate,
  drawVectorCheckmark,
  formatPersonName
} from '../pdf-core.js';

import {
  JEC_SECCIONES,
  getNivelLogroJec
} from '../jec-monitoreo.js';

import {
  ESPECIALISTA_JEC_OFICIAL
} from '../calc/reglas.js';

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
