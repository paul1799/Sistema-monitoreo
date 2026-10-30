/* =========================================================================
   pdf/ficha-jec.js — Generador oficial de PDF para la Ficha JEC
   (Jornada Escolar Completa) · UGEL 03 · AGEBRE
   ========================================================================= */

import {
  createOfficialPdfDocument,
  formatDate,
  drawVectorCheckmark,
  formatPersonName,
  resolveDirectorData
} from '../pdf-core.js';

import {
  JEC_SECCIONES,
  getNivelLogroJec
} from '../jec-monitoreo.js';

import {
  JEC_1ER_CONDICIONES_ITEMS,
  JEC_1ER_SECCIONES_PUNTAJE,
  getNivelJec1erMomento
} from '../jec-1er-monitoreo.js';

import {
  ESPECIALISTA_JEC_OFICIAL
} from '../calc/reglas.js';

import {
  getSubmissionVisitaNum
} from '../calc/detectors.js';

/**
 * Exporta la Ficha oficial "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
 * a PDF en formato vertical oficial, soportando tanto el 1er Monitoreo (Inicio) como el 2do y 3er Monitoreo (Proceso/Salida)
 */
export async function exportJecFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  const visitaNum = getSubmissionVisitaNum(sub, fichaType);
  if (visitaNum === 1) {
    return await exportJec1erFichaPdf(sub, fichaType, colegio, downloadConfig);
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
  const dirData = resolveDirectorData(sub, colegio);
  const dirNombre = dirData.nombre;
  const dirDni = dirData.dni;
  const dirTel = dirData.telefono;
  const dirCorreo = dirData.correo;

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
 * Exporta la Ficha oficial "1er Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
 * a PDF en formato vertical oficial, reproduciendo las condiciones de inicio, directivos,
 * 4 aspectos con 37 ítems escala 1 a 3 y tabla oficial de niveles (Inicio, Proceso, Logrado).
 */
export async function exportJec1erFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  const ieName = sub.institucion || sub.colegioNombre || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const codModular = sub.codigoModular || sub.codModular || (sub.ie && sub.ie.codigoModular) || (colegio ? (colegio.codigoModular || colegio.codigoLocal) : '') || '—';
  const rei = sub.rei || sub.red || (sub.ie && (sub.ie.rei || sub.ie.red)) || (colegio ? colegio.rei : '') || '—';
  const ugel = sub.ugel || 'UGEL 03';

  const secciones = sub.secciones || sub.cantSecciones || '—';
  const estudiantes = sub.estudiantes || sub.cantEstudiantes || '—';
  const docentesTotal = sub.docentes || sub.cantDocentes || sub.docentesTotal || '—';
  const secundariaTecnica = (sub.secundariaTecnica === 'SI' || sub.formacionTecnica === true) ? 'Sí' : 'No';

  const title = '1ER MONITOREO Y ASISTENCIA TÉCNICA A LA IMPLEMENTACIÓN DEL MODELO JEC';
  const subtitle = 'Modelo de Servicio Educativo Jornada Escolar Completa — Primer Momento (Inicio) · UGEL 03';

  const metaGrid = [
    { label: 'INSTITUCIÓN EDUCATIVA', value: ieName },
    { label: 'CÓDIGO MODULAR', value: codModular },
    { label: 'UGEL', value: ugel },
    { label: 'REI', value: rei ? `REI ${rei}` : '—' },
    { label: 'FECHA DE VISITA', value: fechaVisita },
    { label: 'SECCIONES', value: String(secciones) },
    { label: 'CANTIDAD ESTUDIANTES', value: String(estudiantes) },
    { label: 'CANTIDAD DOCENTES', value: String(docentesTotal) },
    { label: 'SEC. FORMACIÓN TÉCNICA', value: secundariaTecnica }
  ];

  const customTables = [];

  const jecRespName = (sub.responsable && !sub.responsable.includes('@') && !/^\d+$/.test(String(sub.responsable).trim()))
    ? sub.responsable
    : ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
  const jecRespCargo = sub.responsableCargo || ESPECIALISTA_JEC_OFICIAL.cargo;

  // III. Especialista
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

  // IV. Datos del Director(a) y Equipo Directivo
  const dirData = resolveDirectorData(sub, colegio);
  const dirNombre = dirData.nombre;
  const dirDni = dirData.dni;
  const dirTel = dirData.telefono;
  const dirCorreo = dirData.correo;
  const dirCond = dirData.condicion || (sub.director && sub.director.condicion) || 'DESIGNADO';

  const directivosRows = [
    ['Director(a)', formatPersonName(dirNombre), dirDni, dirTel, dirCond, dirCorreo]
  ];

  const subs = Array.isArray(sub.subdirectores) ? sub.subdirectores : [];
  subs.forEach((s, idx) => {
    if (s && s.nombres && s.nombres.trim()) {
      directivosRows.push([
        `Subdirector(a) ${subs.length > 1 ? idx + 1 : ''}`,
        formatPersonName(s.nombres),
        s.dni || '—',
        s.telefono || '—',
        s.condicion || 'DESIGNADO',
        s.correo || '—'
      ]);
    }
  });

  const coordsPedag = Array.isArray(sub.coordinadoresPedagogicos) ? sub.coordinadoresPedagogicos : [];
  coordsPedag.forEach((cp, idx) => {
    if (cp && cp.nombres && cp.nombres.trim()) {
      directivosRows.push([
        `Coord. Pedagógico ${coordsPedag.length > 1 ? idx + 1 : ''}`,
        formatPersonName(cp.nombres),
        cp.dni || '—',
        cp.telefono || '—',
        cp.condicion || 'DESIGNADO',
        cp.correo || '—'
      ]);
    }
  });

  const coordsTut = Array.isArray(sub.coordinadoresTutoria) ? sub.coordinadoresTutoria : [];
  coordsTut.forEach((ct, idx) => {
    if (ct && ct.nombres && ct.nombres.trim()) {
      directivosRows.push([
        `Coord. de Tutoría ${coordsTut.length > 1 ? idx + 1 : ''}`,
        formatPersonName(ct.nombres),
        ct.dni || '—',
        ct.telefono || '—',
        ct.condicion || 'DESIGNADO',
        ct.correo || '—'
      ]);
    }
  });

  customTables.push({
    title: 'IV. DATOS DEL EQUIPO DIRECTIVO Y COORDINADORES DE LA IE',
    minHeight: 45,
    tableHeaders: ['Cargo / Rol', 'Apellidos y Nombres', 'DNI', 'Teléfono', 'Condición', 'Correo Electrónico'],
    tableRows: directivosRows,
    columnStyles: {
      0: { cellWidth: 100, fontStyle: 'bold', fontSize: 7.5 },
      1: { cellWidth: 140, fontStyle: 'bold', fontSize: 7.5 },
      2: { cellWidth: 55, halign: 'center', fontSize: 7 },
      3: { cellWidth: 60, halign: 'center', fontSize: 7 },
      4: { cellWidth: 66, halign: 'center', fontSize: 7 },
      5: { cellWidth: 80, fontSize: 6.8 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // V. Condiciones de Inicio (7 ítems Sí/No)
  const condResp = sub.respuestasCondiciones || sub.condiciones || {};
  let condSi = 0;
  let condNo = 0;

  const condRows = JEC_1ER_CONDICIONES_ITEMS.map((c, idx) => {
    const rawVal = condResp[c.id];
    let valStr = '';
    let hallazgo = '';
    if (typeof rawVal === 'object' && rawVal !== null) {
      valStr = String(rawVal.valor || '').toUpperCase();
      hallazgo = rawVal.hallazgo || '';
    } else {
      valStr = String(rawVal || '').toUpperCase();
      hallazgo = (sub.condicionesHallazgos && sub.condicionesHallazgos[c.id]) || '';
    }
    const isSi = valStr === 'SI' || valStr === 'SÍ';
    const isNo = valStr === 'NO';
    if (isSi) condSi++;
    else if (isNo) condNo++;

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

    return [
      String(idx + 1),
      c.texto,
      makeCheckCell(isSi, [5, 150, 105]),
      makeCheckCell(isNo, [220, 38, 38]),
      hallazgo || '—'
    ];
  });

  condRows.push([
    {
      content: `TOTAL CONDICIONES CUMPLIDAS: ${condSi} de ${JEC_1ER_CONDICIONES_ITEMS.length}  ·  NO CUMPLE: ${condNo}`,
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
    title: 'V. 01 ASPECTO: CONDICIONES PREVIAS DE INICIO DEL AÑO ESCOLAR',
    subtitle: 'Verificación del cumplimiento de condiciones de infraestructura, mobiliario, materiales y personal.',
    minHeight: 60,
    tableHeaders: ['N.°', 'Condición / Criterio de Verificación', 'Sí', 'No', 'Hallazgos / Evidencias'],
    tableRows: condRows,
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

  // VI. 4 Aspectos con puntaje (37 ítems escala 1 a 3)
  const respuestasArray = Array.isArray(sub.respuestas) ? sub.respuestas : [];
  const respuestasMap = {};
  respuestasArray.forEach(r => {
    if (r && r.id) respuestasMap[r.id] = r;
  });
  const puntajesObj = sub.puntajes || sub.respuestasObj || {};

  let granTotalPuntos = 0;

  JEC_1ER_SECCIONES_PUNTAJE.forEach(sec => {
    let subtotalSec = 0;
    const maxSec = sec.items.length * 3;

    const secRows = sec.items.map(it => {
      const respItem = respuestasMap[it.id] || (puntajesObj[it.id] ? (typeof puntajesObj[it.id] === 'object' ? puntajesObj[it.id] : { valor: puntajesObj[it.id] }) : {});
      const rawVal = respItem.valor !== undefined ? respItem.valor : puntajesObj[it.id];
      const hallazgo = respItem.hallazgo || (sub.puntajesHallazgos && sub.puntajesHallazgos[it.id]) || '—';

      const valNum = Number(rawVal);
      if (valNum >= 1 && valNum <= 3) {
        subtotalSec += valNum;
        granTotalPuntos += valNum;
      }

      const makeScoreCell = (targetLvl, color) => {
        if (valNum === targetLvl) {
          return {
            content: String(targetLvl),
            styles: { halign: 'center', valign: 'middle', fontStyle: 'bold', textColor: color, fillColor: [240, 245, 255] }
          };
        }
        return { content: '', styles: { halign: 'center' } };
      };

      return [
        String(it.num),
        it.texto,
        makeScoreCell(1, [220, 38, 38]),
        makeScoreCell(2, [217, 119, 6]),
        makeScoreCell(3, [5, 150, 105]),
        hallazgo || '—'
      ];
    });

    const pctSec = maxSec > 0 ? Math.round((subtotalSec / maxSec) * 100) : 0;
    secRows.push([
      {
        content: `SUBTOTAL ${sec.nombre.toUpperCase()} — Puntaje: ${subtotalSec} de ${maxSec} pts (${pctSec}%)`,
        colSpan: 6,
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
      subtitle: 'Escala oficial de valoración: 1 = Inicio (I) · 2 = Proceso (P) · 3 = Logrado (L)',
      minHeight: 65,
      tableHeaders: ['N.°', 'Indicador / Aspecto Evaluado', '1 (I)', '2 (P)', '3 (L)', 'Hallazgos / Evidencias'],
      tableRows: secRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 260, fontSize: 7.2 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'center', cellWidth: 20 },
        5: { halign: 'left', cellWidth: 169, fontSize: 7 }
      },
      headStyles: {
        fillColor: [18, 41, 77],
        fontSize: 8,
        fontStyle: 'bold'
      }
    });
  });

  // VII. Tabla Oficial de Niveles de Implementación MSE JEC 1er Momento
  const finalPuntaje = Number(sub.puntajeTotal || sub.puntaje || granTotalPuntos) || 0;
  const nivelLogroInfo = getNivelJec1erMomento(finalPuntaje);

  customTables.push({
    title: 'VII. NIVEL DE IMPLEMENTACIÓN DEL MSE JEC (PRIMER MOMENTO)',
    subtitle: 'Baremos oficiales del Primer Momento (Inicio): Puntaje acumulado sobre 37 ítems (Máximo 111 puntos).',
    minHeight: 50,
    tableHeaders: ['Nivel de Logro', 'Rango Oficial de Puntos', 'Puntaje Obtenido y Estado'],
    tableRows: [
      [
        'Logrado',
        'De 89 a 111 puntos',
        finalPuntaje >= 89 ? `✓ NIVEL ALCANZADO (${finalPuntaje} / 111 pts)` : '—'
      ],
      [
        'Proceso',
        'De 56 a 88 puntos',
        (finalPuntaje >= 56 && finalPuntaje <= 88) ? `✓ NIVEL ALCANZADO (${finalPuntaje} / 111 pts)` : '—'
      ],
      [
        'Inicio',
        'De 37 a 55 puntos',
        (finalPuntaje > 0 && finalPuntaje <= 55) ? `✓ NIVEL ALCANZADO (${finalPuntaje} / 111 pts)` : (finalPuntaje === 0 ? '—' : '—')
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
      if (data.section === 'body') {
        const isTargetRow = (data.row.index === 0 && finalPuntaje >= 89) ||
          (data.row.index === 1 && finalPuntaje >= 56 && finalPuntaje <= 88) ||
          (data.row.index === 2 && finalPuntaje > 0 && finalPuntaje <= 55);
        if (isTargetRow) {
          data.cell.styles.fillColor = finalPuntaje >= 89 ? [220, 252, 231] : (finalPuntaje >= 56 ? [254, 243, 199] : [254, 226, 226]);
          data.cell.styles.textColor = finalPuntaje >= 89 ? [21, 128, 61] : (finalPuntaje >= 56 ? [180, 83, 9] : [185, 28, 28]);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // VIII. Recomendaciones y Compromisos
  const recs = sub.recomendaciones || sub.observacionesGenerales || sub.observaciones || '—';
  const comps = Array.isArray(sub.compromisos) ? sub.compromisos : [];
  const compRows = [
    ['Recomendaciones del Especialista JEC', recs]
  ];
  if (comps.length > 0) {
    comps.forEach((c, i) => {
      const asp = c.aspectoCritico ? `Aspecto crítico: ${c.aspectoCritico}\n` : '';
      const acc = c.accionMejora ? `Acción de mejora: ${c.accionMejora}\n` : '';
      const cro = c.cronograma ? `Cronograma / Plazo: ${c.cronograma}` : '';
      compRows.push([`Compromiso ${i + 1}`, `${asp}${acc}${cro}`.trim() || '—']);
    });
  } else {
    compRows.push(['Compromisos Asumidos', 'Sin compromisos registrados.']);
  }

  customTables.push({
    title: 'VIII. RECOMENDACIONES Y COMPROMISOS DE MEJORA',
    minHeight: 45,
    tableHeaders: ['Actor / Aspecto', 'Detalle Registrado'],
    tableRows: compRows,
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

  // Firmas
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

  const pdfFilename = `Ficha_JEC_1er_Monitoreo_${(ieName || 'IE').replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`;

  return await createOfficialPdfDocument({
    title,
    subtitle,
    orientation: 'portrait',
    introParagraph: `En Lima, a la fecha ${fechaVisita}, se procedió a realizar la jornada oficial del Primer Monitoreo y Asistencia Técnica (Inicio) a la implementación del Modelo de Servicio Educativo Jornada Escolar Completa (JEC) en la IE ${ieName} (${codModular}), a cargo de la especialista de JEC ${jecRespName || ESPECIALISTA_JEC_OFICIAL.nombresApellidos}.`,
    metaGrid,
    customTables,
    signatures: signaturesList,
    lugarFecha: `Lima, ${fechaVisita}`,
    filename: pdfFilename,
    marcaBorrador: sub.esBorrador === true
  });
}
