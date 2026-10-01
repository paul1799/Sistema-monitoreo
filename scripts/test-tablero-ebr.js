/**
 * scripts/test-tablero-ebr.js — Suite de pruebas automatizadas para la Ficha
 * "Monitoreo y Asistencia Técnica a la Gestión Escolar - UGEL 03 EBR"
 * Verifica todos los criterios de aceptación de la Sección 9.
 */

const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

async function extraerSubmissionsMuestra() {
  const wb = new ExcelJS.Workbook();
  const filePath = path.join(__dirname, '../docs/plantillas/TABLERO_MONITOREO_GESTION_EBR_II_MOMENTO_20261001.xlsx');
  await wb.xlsx.readFile(filePath);

  const wsTab = wb.getWorksheet('TABLERO');
  const catSheets = ['CAT 6.1', 'CAT 6.2', 'CAT 6.3', 'CAT 6.4', 'CAT 6.5'].map(n => wb.getWorksheet(n));

  const submissions = [];
  const colegios = [];

  for (let r = 4; r <= wsTab.rowCount - 1; r++) {
    const row = wsTab.getRow(r);
    const red = String(row.getCell(2).value || '').padStart(2, '0');
    const codigoLocal = String(row.getCell(3).value || '').trim();
    const institucion = String(row.getCell(4).value || '').trim();
    const director = String(row.getCell(5).value || '').trim();

    const sub = {
      id: 'sub_' + r,
      institucion,
      codigoLocal,
      red,
      visita: 2,
      fecha: '2026-09-30',
      responsable: 'Especialista UGEL 03',
      ie: {
        codigoLocal,
        red,
        formacionTecnica: false
      },
      director: {
        nombres: director,
        dni: '10' + String(200000 + r).padStart(6, '0'),
        telefono: '987' + String(100000 + r).padStart(6, '0'),
        condicion: 'Designado',
        correo: director.toLowerCase().replace(/[^a-z]/g, '.') + '@ugel03.gob.pe'
      },
      docentes: {
        momento1: [
          { nivel: 'Inicial', noAplica: false, total: 10, monitoreados: 8, R1: [0, 2, 4, 2], R2: [0, 3, 3, 2], R3: [0, 2, 4, 2], R4: [0, 1, 5, 2], R5: [0, 2, 4, 2] },
          { nivel: 'Primaria', noAplica: false, total: 20, monitoreados: 18, R1: [0, 4, 10, 4], R2: [0, 5, 9, 4], R3: [0, 4, 10, 4], R4: [0, 2, 12, 4], R5: [0, 3, 11, 4] },
          { nivel: 'Secundaria', noAplica: false, total: 25, monitoreados: 20, R1: [0, 5, 10, 5], R2: [0, 6, 9, 5], R3: [0, 5, 10, 5], R4: [0, 3, 12, 5], R5: [0, 4, 11, 5] }
        ],
        momento2: [
          { nivel: 'Inicial', noAplica: false, total: 10, monitoreados: 9, R1: [0, 1, 5, 3], R2: [0, 2, 4, 3], R3: [0, 1, 5, 3], R4: [0, 1, 5, 3], R5: [0, 1, 5, 3] },
          { nivel: 'Primaria', noAplica: false, total: 20, monitoreados: 19, R1: [0, 2, 12, 5], R2: [0, 3, 11, 5], R3: [0, 2, 12, 5], R4: [0, 1, 13, 5], R5: [0, 2, 12, 5] },
          { nivel: 'Secundaria', noAplica: false, total: 25, monitoreados: 22, R1: [0, 3, 12, 7], R2: [0, 4, 11, 7], R3: [0, 3, 12, 7], R4: [0, 2, 13, 7], R5: [0, 3, 12, 7] }
        ]
      },
      respuestas: []
    };

    let itemGlobalIdx = 1;
    catSheets.forEach(wsCat => {
      const catRow = wsCat.getRow(r - 1);
      const numCols = wsCat.columnCount;
      for (let c = 4; c < numCols; c++) {
        const val = catRow.getCell(c).value;
        sub.respuestas.push({
          id: 'ge2_' + itemGlobalIdx,
          num: itemGlobalIdx,
          valor: val !== undefined && val !== null && String(val).trim() !== '' ? String(val) : null,
          observaciones: val === 1 ? 'Requiere asistencia técnica' : ''
        });
        itemGlobalIdx++;
      }
    });

    submissions.push(sub);

    colegios.push({
      id: 'col_' + r,
      codigoLocal,
      ie: institucion,
      rei: red,
      distrito: 'LIMA',
      nivel: 'Primaria y Secundaria',
      modalidad: 'EBR',
      ugel: 'UGEL 03',
      director: {
        nombre: director,
        dni: sub.director.dni
      }
    });
  }

  // Agregar 5 colegios no visitados para validar que aparezcan como NO INICIÓ / PENDIENTE
  for (let k = 1; k <= 5; k++) {
    colegios.push({
      id: 'col_novisitado_' + k,
      codigoLocal: '88800' + k,
      ie: 'IE NO VISITADA ' + k,
      rei: '02',
      distrito: 'BREÑA',
      nivel: 'Primaria',
      modalidad: 'EBR',
      ugel: 'UGEL 03'
    });
  }

  return { submissions, colegios };
}

async function runTests() {
  console.log('=================================================================');
  console.log('SUITE DE PRUEBAS AUTOMATIZADAS — TABLERO EBR (SECCIÓN 9)');
  console.log('=================================================================\n');

  const { exportarTableroEBRCompleto } = await import('../public/js/exportarTableroEBR.js');
  const { submissions, colegios } = await extraerSubmissionsMuestra();

  let passCount = 0;
  let failCount = 0;

  function assert(cond, msg) {
    if (cond) {
      console.log(`  [OK] ${msg}`);
      passCount++;
    } else {
      console.error(`  [FAIL] ${msg}`);
      failCount++;
    }
  }

  // ─── Test 1: Restricción de Visita (Regla 8.2) ──────────────────────────────
  console.log('--- TEST 1: Validación estricta de visita en el servidor / cliente ---');
  try {
    await exportarTableroEBRCompleto(submissions, null, colegios);
    assert(false, 'Debe fallar al pedir sin visita');
  } catch (err) {
    assert(err.status === 400 || err.message.includes('inválido'), 'Lanza error 400 si falta el parámetro visita');
  }

  try {
    await exportarTableroEBRCompleto(submissions, 3, colegios);
    assert(false, 'Debe fallar si visita !== 1 y visita !== 2');
  } catch (err) {
    assert(err.status === 400 || err.message.includes('inválido'), 'Lanza error 400 si visita es 3 o inválida');
  }

  // ─── Test 2: Generación Visita 2 (8 hojas) ──────────────────────────────────
  console.log('\n--- TEST 2: Generación de Visita 2 (Plantilla Oficial 8 hojas) ---');
  const resV2 = await exportarTableroEBRCompleto(submissions, 2, colegios);
  assert(!!resV2.buffer, 'Buffer de Visita 2 generado con éxito');
  assert(resV2.fileName.startsWith('TABLERO_MONITOREO_GESTION_EBR_II_MOMENTO_'), `Nombre oficial correcto: ${resV2.fileName}`);

  // Guardar archivo de muestra para revisión
  const dirMuestras = path.join(__dirname, '../docs/muestras');
  if (!fs.existsSync(dirMuestras)) fs.mkdirSync(dirMuestras, { recursive: true });
  const sampleV2Path = path.join(dirMuestras, 'TABLERO_MONITOREO_GESTION_EBR_II_MOMENTO_MUESTRA.xlsx');
  fs.writeFileSync(sampleV2Path, Buffer.from(resV2.buffer));
  console.log(`  Muestra guardada en: ${sampleV2Path}`);

  const wbV2 = new ExcelJS.Workbook();
  await wbV2.xlsx.readFile(sampleV2Path);

  // Criterio: Exactamente 8 hojas con nombres y orden oficial
  const hojasEsperadasV2 = ['GENERAL', 'CAT_6.1', 'CAT_6.2', 'CAT_6.3', 'CAT_6.4', 'CAT_6.5', 'DOCENTES_1ER_MOM', 'DOCENTES_2DO_MOM'];
  const hojasGeneradasV2 = wbV2.worksheets.map(w => w.name);
  assert(JSON.stringify(hojasGeneradasV2) === JSON.stringify(hojasEsperadasV2), `Exactamente 8 hojas en orden: ${hojasGeneradasV2.join(', ')}`);

  // Criterio: Hoja GENERAL con 24 columnas exactas en fila 1
  const wsGenV2 = wbV2.getWorksheet('GENERAL');
  const colsEsperadas = [
    'Fecha_Visita', 'MES', 'Codigo_Local', 'Nombre_IE', 'Nivel', 'Modalidad', 'UGEL', 'RED', 'Distrito',
    'Modelo_Sec_Formacion_Tecnica', 'Especialista', 'Director_Apellidos_Nombres', 'Director_DNI',
    'Director_Telefono', 'Director_Condicion', 'Director_Correo', 'CAT_6.1', 'CAT_6.2', 'CAT_6.3',
    'CAT_6.4', 'CAT_6.5', 'RESULTADO', 'ESTADO', 'AVANCE'
  ];
  const r1Gen = wsGenV2.getRow(1);
  const colsGeneradas = [];
  for (let c = 1; c <= 24; c++) colsGeneradas.push(r1Gen.getCell(c).value);
  assert(JSON.stringify(colsGeneradas) === JSON.stringify(colsEsperadas), 'GENERAL tiene las 24 columnas exactas en Fila 1');

  // Criterio: Sin filas de título ni TOTALES en GENERAL
  const tieneFilaTotales = wsGenV2.getRows(1, wsGenV2.rowCount).some(r => r && String(r.getCell(1).value || '').toUpperCase() === 'TOTALES');
  assert(!tieneFilaTotales, 'No existe fila TOTALES dentro de los datos');

  // Criterio: Congelamiento de paneles
  const freezeGen = wsGenV2.views && wsGenV2.views[0];
  assert(freezeGen && freezeGen.xSplit === 4 && freezeGen.ySplit === 1 && freezeGen.topLeftCell === 'E2', 'GENERAL inmovilizado en E2');

  const ws61 = wbV2.getWorksheet('CAT_6.1');
  const freeze61 = ws61.views && ws61.views[0];
  assert(freeze61 && freeze61.xSplit === 2 && freeze61.ySplit === 2 && freeze61.topLeftCell === 'C3', 'CAT_6.1 inmovilizado en C3');

  // Criterio: Presencia de tablas Excel oficiales
  assert(!!wsGenV2.getTable('T_GENERAL'), 'Existe tabla T_GENERAL');
  assert(!!ws61.getTable('T_6_1'), 'Existe tabla T_6_1');
  const wsDoc1 = wbV2.getWorksheet('DOCENTES_1ER_MOM');
  assert(!!wsDoc1.getTable('T_DOC1'), 'Existe tabla T_DOC1');
  const wsDoc2 = wbV2.getWorksheet('DOCENTES_2DO_MOM');
  assert(!!wsDoc2.getTable('T_DOC2'), 'Existe tabla T_DOC2');

  // Criterio: Fórmulas INDEX/MATCH en GENERAL para CAT_6.x
  const fFormulaCat = wsGenV2.getCell('Q2').value;
  assert(fFormulaCat && typeof fFormulaCat === 'object' && fFormulaCat.formula && fFormulaCat.formula.includes('INDEX(T_6_1[Promedio]'), 'Columna CAT_6.1 usa INDEX/MATCH por Codigo_Local');

  // Criterio: Sin celdas con texto vacío '' en items
  let celdasTextoVacio = 0;
  ws61.eachRow((row, rNum) => {
    if (rNum >= 3) {
      for (let c = 3; c <= 5; c++) {
        if (row.getCell(c).value === '') celdasTextoVacio++;
      }
    }
  });
  assert(celdasTextoVacio === 0, 'No hay celdas con texto vacío string "" (celdas vacías reales)');

  // Criterio: Notas de celda en encabezados de ítems
  const headerNote = ws61.getRow(2).getCell(3).note;
  assert(!!headerNote && headerNote.includes('N.° 1'), 'Encabezado ITEM_6.1.1 tiene nota de celda con texto completo');

  // Criterio: Colegios no visitados aparecen con fórmula que evalúa a NO INICIÓ / PENDIENTE
  const filaNoVisitada = wsGenV2.getRows(2, wsGenV2.rowCount - 1).find(r => r.getCell(4).value && String(r.getCell(4).value).includes('NO VISITADA'));
  assert(!!filaNoVisitada, 'Colegios no visitados aparecen en GENERAL');
  if (filaNoVisitada) {
    assert(!filaNoVisitada.getCell(1).value, 'Fecha_Visita de no visitada está vacía');
    assert(!filaNoVisitada.getCell(11).value, 'Especialista de no visitada está vacío');
  }

  // ─── Test 3: Generación Visita 1 (6 hojas) ──────────────────────────────────
  console.log('\n--- TEST 3: Generación de Visita 1 (6 hojas, sin docentes) ---');
  const subsV1 = submissions.map(s => ({
    ...s,
    visita: 1,
    respuestas: s.respuestas.slice(0, 19).map(r => ({ ...r, id: r.id.replace('ge2_', 'ge1_') }))
  }));

  const resV1 = await exportarTableroEBRCompleto(subsV1, 1, colegios);
  assert(!!resV1.buffer, 'Buffer de Visita 1 generado con éxito');
  assert(resV1.fileName.startsWith('TABLERO_MONITOREO_GESTION_EBR_I_MOMENTO_'), `Nombre oficial correcto: ${resV1.fileName}`);

  const sampleV1Path = path.join(dirMuestras, 'TABLERO_MONITOREO_GESTION_EBR_I_MOMENTO_MUESTRA.xlsx');
  fs.writeFileSync(sampleV1Path, Buffer.from(resV1.buffer));
  console.log(`  Muestra guardada en: ${sampleV1Path}`);

  const wbV1 = new ExcelJS.Workbook();
  await wbV1.xlsx.readFile(sampleV1Path);

  const hojasEsperadasV1 = ['GENERAL', 'CAT_4.1', 'CAT_4.2', 'CAT_4.3', 'CAT_4.4', 'CAT_4.5'];
  const hojasGeneradasV1 = wbV1.worksheets.map(w => w.name);
  assert(JSON.stringify(hojasGeneradasV1) === JSON.stringify(hojasEsperadasV1), `Exactamente 6 hojas en orden: ${hojasGeneradasV1.join(', ')}`);
  assert(!wbV1.getWorksheet('DOCENTES_1ER_MOM') && !wbV1.getWorksheet('DOCENTES_2DO_MOM'), 'Visita 1 no contiene hojas de docentes');

  // ─── Resumen Final ─────────────────────────────────────────────────────────
  console.log('\n=================================================================');
  console.log(`RESULTADO DE LA SUITE: ${passCount} pruebas pasadas, ${failCount} fallos`);
  console.log('=================================================================');

  if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Error ejecutando suite:', err);
  process.exit(1);
});
