/**
 * scripts/generar-pdfs-muestra.js — Genera los dos PDFs de muestra oficiales (Visita 1 y Visita 2)
 * para revisión del entregable 6.
 */

const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default || require('jspdf-autotable');

async function generarPdfVisita(visita, sampleSub) {
  const isV2 = visita === 2;
  const isV1 = visita === 1;
  const vRomano = isV2 ? 'II' : 'I';
  const momNombre = isV2 ? 'Visita 2 · Segundo momento' : 'Visita 1 · Primer momento';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const margin = 36;
  const contentW = pageW - margin * 2;

  // Encabezado institucional
  doc.setFillColor(18, 41, 77); // #12294D
  doc.rect(margin, 24, contentW, 4, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(18, 41, 77);
  doc.text('FICHA DE MONITOREO Y ASISTENCIA TÉCNICA A LA GESTIÓN ESCOLAR UGEL-03-EBR', margin, 46);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`En el marco de la RM N.° 501-2025-MINEDU · ${momNombre}`, margin, 58);

  let curY = 72;

  // I. Datos Generales
  const metaBody = [
    [
      { content: 'INSTITUCIÓN EDUCATIVA', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
      sampleSub.institucion,
      { content: 'CÓDIGO DE LOCAL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
      sampleSub.codigoLocal
    ],
    [
      { content: 'UGEL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
      'UGEL 03',
      { content: 'RED EDUCATIVA', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
      `RED ${sampleSub.red}`
    ],
    [
      { content: 'FECHA DE VISITA', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
      sampleSub.fecha,
      { content: 'SEC. FORMACIÓN TÉCNICA', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
      'No'
    ]
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: metaBody,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: [15, 23, 42] }
  });

  curY = doc.lastAutoTable.finalY + 14;

  // II. Datos del Director
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [['Apellidos y Nombres', 'DNI', 'Teléfono / Celular', 'Condición', 'Correo Electrónico']],
    body: [[
      sampleSub.director.nombres,
      sampleSub.director.dni,
      sampleSub.director.telefono,
      sampleSub.director.condicion,
      sampleSub.director.correo
    ]],
    theme: 'grid',
    headStyles: { fillColor: [46, 117, 182], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 3 }
  });

  curY = doc.lastAutoTable.finalY + 14;

  // Si es Visita 2: Incluir Tablas de Docentes (R1-R5 por nivel)
  if (isV2) {
    const docHeaders = [
      'Nivel', 'Total', 'Monit.', 'No Monit.',
      'R1_I', 'R1_II', 'R1_III', 'R1_IV',
      'R2_I', 'R2_II', 'R2_III', 'R2_IV',
      'R3_I', 'R3_II', 'R3_III', 'R3_IV',
      'R4_I', 'R4_II', 'R4_III', 'R4_IV',
      'R5_I', 'R5_II', 'R5_III', 'R5_IV'
    ];

    const docRows = [
      ['Inicial', '10', '8', '2', '0', '2', '4', '2', '0', '3', '3', '2', '0', '2', '4', '2', '0', '1', '5', '2', '0', '2', '4', '2'],
      ['Primaria', '20', '18', '2', '0', '4', '10', '4', '0', '5', '9', '4', '0', '4', '10', '4', '0', '2', '12', '4', '0', '3', '11', '4'],
      ['Secundaria', '25', '20', '5', '0', '5', '10', '5', '0', '6', '9', '5', '0', '5', '10', '5', '0', '3', '12', '5', '0', '4', '11', '5']
    ];

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(31, 78, 120);
    doc.text('IV. DATA DE DOCENTES MONITOREADOS - SEGUNDO MOMENTO (R1-R5: Rúbricas; I-IV: Niveles de logro)', margin, curY);
    curY += 6;

    autoTable(doc, {
      startY: curY,
      margin: { left: margin, right: margin },
      head: [docHeaders],
      body: docRows,
      theme: 'grid',
      headStyles: { fillColor: [84, 130, 53], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.2, halign: 'center' },
      styles: { fontSize: 6.2, cellPadding: 2, halign: 'center' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 45 } }
    });

    curY = doc.lastAutoTable.finalY + 14;
  }

  // Dimensiones evaluadas
  const dimTit = isV2 ? 'VI. DIMENSIONES EVALUADAS (6.1 a 6.5 — 23 ítems)' : 'V. DIMENSIONES EVALUADAS (4.1 a 4.5 — 19 ítems)';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(31, 78, 120);
  doc.text(dimTit, margin, curY);
  curY += 8;

  const dimRows = isV2 ? [
    ['6.1', 'Monitoreo y acompañamiento a la práctica docente', '3 ítems', '3.00', 'LOGRADO'],
    ['6.2', 'Fortalecimiento docente', '2 ítems', '3.00', 'LOGRADO'],
    ['6.3', 'Evaluación de los aprendizajes / Refuerzo escolar', '4 ítems', '3.00', 'LOGRADO'],
    ['6.4', 'Uso de materiales y espacios educativos', '7 ítems', '2.86', 'LOGRADO'],
    ['6.5', 'Otros aspectos', '7 ítems', '2.71', 'LOGRADO']
  ] : [
    ['4.1', 'Monitoreo y acompañamiento a la práctica docente', '3 ítems', '3.00', 'LOGRADO'],
    ['4.2', 'Fortalecimiento docente', '2 ítems', '3.00', 'LOGRADO'],
    ['4.3', 'Evaluación de los aprendizajes / Refuerzo escolar', '7 ítems', '2.85', 'LOGRADO'],
    ['4.4', 'Uso de materiales y espacios educativos', '4 ítems', '3.00', 'LOGRADO'],
    ['4.5', 'Otros aspectos', '3 ítems', '2.67', 'LOGRADO']
  ];

  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    head: [['Código', 'Dimensión / Aspecto', 'Cant. Ítems', 'Promedio', 'Nivel de Logro']],
    body: dimRows,
    theme: 'grid',
    headStyles: { fillColor: [46, 117, 182], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    styles: { fontSize: 7.5, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 40, halign: 'center', fontStyle: 'bold' },
      2: { cellWidth: 55, halign: 'center' },
      3: { cellWidth: 55, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 70, halign: 'center', fontStyle: 'bold' }
    }
  });

  curY = doc.lastAutoTable.finalY + 14;

  // Resultado Final
  autoTable(doc, {
    startY: curY,
    margin: { left: margin, right: margin },
    body: [
      [
        { content: 'RESULTADO GLOBAL DE LA VISITA', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: '2.91', styles: { fontStyle: 'bold', halign: 'center', fontSize: 9 } },
        { content: 'ESTADO OFICIAL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: 'LOGRADO', styles: { fontStyle: 'bold', halign: 'center', textColor: [0, 97, 0], fillColor: [198, 239, 206], fontSize: 9 } }
      ]
    ],
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 4 }
  });

  curY = doc.lastAutoTable.finalY + 24;

  // Firmas
  const sigW = (contentW - 30) / 2;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.75);

  doc.line(margin + 20, curY + 30, margin + sigW - 20, curY + 30);
  doc.line(margin + sigW + 30, curY + 30, margin + sigW * 2 + 10, curY + 30);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(sampleSub.director.nombres, margin + sigW / 2, curY + 42, { align: 'center' });
  doc.text('Especialista UGEL 03 · AGEBRE', margin + sigW + 15 + sigW / 2, curY + 42, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Director(a) · DNI ${sampleSub.director.dni}`, margin + sigW / 2, curY + 52, { align: 'center' });
  doc.text('Monitor de Gestión Escolar', margin + sigW + 15 + sigW / 2, curY + 52, { align: 'center' });

  // Pie de página
  doc.setFontSize(6.5);
  doc.text(`Reporte Oficial generado el 30/09/2026 (America/Lima) — ${sampleSub.institucion} — ${momNombre}`, margin, pageH - 20);

  const dirMuestras = path.join(__dirname, '../docs/muestras');
  if (!fs.existsSync(dirMuestras)) fs.mkdirSync(dirMuestras, { recursive: true });
  const outPath = path.join(dirMuestras, `REPORTE_MONITOREO_GESTION_EBR_${vRomano}_MOMENTO_MUESTRA.pdf`);
  fs.writeFileSync(outPath, Buffer.from(doc.output('arraybuffer')));
  console.log(`PDF generado con éxito: ${outPath}`);
}

async function run() {
  const sampleSub = {
    institucion: '0002 HERMANO ANSELMO MARIA',
    codigoLocal: '295648',
    red: '08',
    fecha: '30/09/2026',
    director: {
      nombres: 'SARCO RODRIGUEZ TERESA',
      dni: '10200004',
      telefono: '987100004',
      condicion: 'Designado',
      correo: 'teresa.sarco@ugel03.gob.pe'
    }
  };

  await generarPdfVisita(1, sampleSub);
  await generarPdfVisita(2, sampleSub);
}

run().catch(console.error);
