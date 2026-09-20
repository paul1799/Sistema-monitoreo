/**
 * scripts/test-consolidado-pdf.js
 * Test unitario para verificar que exportConsolidadoReportPdf genera
 * correctamente las 4 secciones con sus respectivas tablas y gráficas:
 * 1. Distribución de resultados (gráfica de barras segmentadas + tabla)
 * 2. Avance por sección (tabla con barras de avance)
 * 3. Reporte por ítem (indicadores con gráficas de distribución)
 * 4. Detalle de fichas registradas
 */
import { exportConsolidadoReportPdf } from '../public/js/pdf-template.js';

// Mock del entorno jsPDF en Node.js
const drawnOperations = [];
const mockDoc = {
  internal: {
    pageSize: {
      getWidth: () => 841.89,
      getHeight: () => 595.28
    },
    getNumberOfPages: () => 3
  },
  setProperties: () => {},
  setFont: () => {},
  setFontSize: () => {},
  setTextColor: () => {},
  setFillColor: (r, g, b) => { drawnOperations.push(`setFillColor(${r},${g},${b})`); },
  setDrawColor: () => {},
  setLineWidth: () => {},
  roundedRect: (x, y, w, h, rx, ry, style) => {
    drawnOperations.push(`roundedRect(${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)},${style})`);
  },
  rect: (x, y, w, h, style) => {
    drawnOperations.push(`rect(${Math.round(x)},${Math.round(y)},${Math.round(w)},${Math.round(h)},${style})`);
  },
  circle: (x, y, r, style) => {
    drawnOperations.push(`circle(${Math.round(x)},${Math.round(y)},${r},${style})`);
  },
  line: () => {},
  text: (txt) => {
    if (typeof txt === 'string' && (txt.startsWith('I.') || txt.startsWith('II.') || txt.startsWith('III.') || txt.startsWith('IV.'))) {
      drawnOperations.push(`text(${txt})`);
    }
  },
  splitTextToSize: (text) => [text],
  addPage: () => {},
  setPage: () => {},
  putTotalPages: () => {},
  save: (name) => { drawnOperations.push(`save(${name})`); },
  lastAutoTable: { finalY: 200 }
};

mockDoc.autoTable = (options) => {
  drawnOperations.push(`autoTable(head=${JSON.stringify(options.head[0][0])}, rows=${options.body.length})`);
  // Simular didDrawCell en una celda
  if (options.didDrawCell) {
    options.didDrawCell({
      section: 'body',
      column: { index: 4 },
      cell: { x: 100, y: 100, width: 150, height: 20, raw: { pct: 85 } }
    });
    options.didDrawCell({
      section: 'body',
      column: { index: 3 },
      cell: { x: 100, y: 100, width: 120, height: 20, raw: { counts: { si: 10, no: 2, na: 1 }, total: 13, tipoRespuesta: 'si_no' } }
    });
  }
  mockDoc.lastAutoTable = { finalY: (options.startY || 100) + 50 };
};

global.window = {
  jspdf: {
    jsPDF: function() { return mockDoc; }
  },
  QRCode: undefined
};

// Datos de prueba: Ficha y Respuestas
const mockFichaType = {
  id: 'ft_pedagogico',
  nombre: 'Monitoreo de la Práctica Pedagógica',
  tipoRespuesta: 'si_no',
  secciones: [
    {
      nombre: 'Planificación Curricular',
      items: [
        { id: 'i1', texto: 'El docente presenta su planificación curricular actualizada.' },
        { id: 'i2', texto: 'Los propósitos de aprendizaje son claros y pertinentes.' }
      ]
    },
    {
      nombre: 'Clima de Aula',
      items: [
        { id: 'i3', texto: 'Promueve un ambiente de respeto y empatía entre los estudiantes.' }
      ]
    }
  ]
};

const mockStatsList = [
  {
    s: {
      id: 'sub_1',
      fecha: '2026-09-15',
      institucion: 'I.E. NUESTRA SEÑORA DE GUADALUPE',
      ugel: 'UGEL 03',
      red: 'RED 01',
      visita: 1,
      responsable: 'Fanny Arias',
      respuestas: [
        { id: 'i1', valor: 'si' },
        { id: 'i2', valor: 'si' },
        { id: 'i3', valor: 'no' }
      ]
    },
    st: {
      pct: 67,
      secciones: [
        { nombre: 'Planificación Curricular', pct: 100 },
        { nombre: 'Clima de Aula', pct: 0 }
      ]
    }
  },
  {
    s: {
      id: 'sub_2',
      fecha: '2026-09-17',
      institucion: 'I.E. NUESTRA SEÑORA DE GUADALUPE',
      ugel: 'UGEL 03',
      red: 'RED 01',
      visita: 2,
      responsable: 'Fanny Arias',
      respuestas: [
        { id: 'i1', valor: 'si' },
        { id: 'i2', valor: 'si' },
        { id: 'i3', valor: 'si' }
      ]
    },
    st: {
      pct: 100,
      secciones: [
        { nombre: 'Planificación Curricular', pct: 100 },
        { nombre: 'Clima de Aula', pct: 100 }
      ]
    }
  }
];

console.log('=== TEST EXPORT CONSOLIDADO REPORT PDF CON GRÁFICAS ===');

async function runTest() {
  await exportConsolidadoReportPdf(mockStatsList, mockFichaType, { red: 'RED 01' }, false, {
    orientation: 'landscape'
  });

  console.log('\nOperaciones registradas:');
  drawnOperations.forEach(op => console.log(' -> ' + op));

  const hasDistribucion = drawnOperations.some(op => op.includes('I. DISTRIBUCIÓN DE RESULTADOS') || op.includes('Nivel de Logro'));
  const hasAvanceSec = drawnOperations.some(op => op.includes('II. AVANCE POR SECCIÓN') || op.includes('N.°'));
  const hasReporteItem = drawnOperations.some(op => op.includes('III. REPORTE POR ÍTEM') || op.includes('DIMENSIÓN'));
  const hasDetalle = drawnOperations.some(op => op.includes('DETALLE DE FICHAS') || op.includes('N.°'));
  const hasBarsDrawn = drawnOperations.some(op => op.includes('roundedRect'));
  const hasFileSaved = drawnOperations.some(op => op.includes('save(Reporte_Consolidado'));

  console.log('\nResultados de verificación:');
  console.log('1. Sección Distribución generada:', hasDistribucion ? 'PASS' : 'FAIL');
  console.log('2. Sección Avance por Sección generada:', hasAvanceSec ? 'PASS' : 'FAIL');
  console.log('3. Sección Reporte por Ítem generada:', hasReporteItem ? 'PASS' : 'FAIL');
  console.log('4. Sección Detalle de Fichas generada:', hasDetalle ? 'PASS' : 'FAIL');
  console.log('5. Gráficas vectoriales y barras dibujadas:', hasBarsDrawn ? 'PASS' : 'FAIL');
  console.log('6. Archivo PDF guardado:', hasFileSaved ? 'PASS' : 'FAIL');

  console.log('\n--- Probando modo isAllMode = true ---');
  drawnOperations.length = 0;
  await exportConsolidadoReportPdf(mockStatsList, null, {}, true, {
    orientation: 'landscape'
  });
  const hasAllModeDistribucion = drawnOperations.some(op => op.includes('I. DISTRIBUCIÓN DE RESULTADOS'));
  const hasAllModeAvanceTipo = drawnOperations.some(op => op.includes('II. AVANCE GENERAL POR TIPO DE FICHA'));
  const hasAllModeDetalle = drawnOperations.some(op => op.includes('DETALLE DE FICHAS'));
  console.log('Modo Todas las Fichas - Distribución:', hasAllModeDistribucion ? 'PASS' : 'FAIL');
  console.log('Modo Todas las Fichas - Avance por Tipo:', hasAllModeAvanceTipo ? 'PASS' : 'FAIL');
  console.log('Modo Todas las Fichas - Detalle:', hasAllModeDetalle ? 'PASS' : 'FAIL');

  if (hasDistribucion && hasAvanceSec && hasReporteItem && hasDetalle && hasBarsDrawn && hasFileSaved && hasAllModeDistribucion && hasAllModeAvanceTipo && hasAllModeDetalle) {
    console.log('\n>>> TODOS LOS TESTS (INDIVIDUAL Y TODAS LAS FICHAS) PASARON EXITOSAMENTE <<<');
    process.exit(0);
  } else {
    console.error('\n>>> ERROR EN LOS TESTS <<<');
    process.exit(1);
  }
}

runTest();
