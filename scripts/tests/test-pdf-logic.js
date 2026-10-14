/**
 * scripts/test-pdf-logic.js
 * Test unitario para verificar las funciones clave de formato y deduplicación de pdf-template.js
 */
import {
  formatPersonName,
  formatResolucionRef,
  formatDate,
  toTitleCase,
  deduplicateConcursoRows
} from '../public/js/pdf-template.js';

console.log('--- TEST 1: formatPersonName ---');

const testCases = [
  // JEDPA (Nombres Apellidos -> APELLIDOS, Nombres)
  { input: 'SOPHYA VALENTINA PAUCAR CARHUAZ', expected: 'PAUCAR CARHUAZ, Sophya Valentina' },
  { input: 'DANIELA GERALDINE YANAPA ALMANZA', expected: 'YANAPA ALMANZA, Daniela Geraldine' },
  { input: 'VICTOR GABRIEL MENDOZA ALATA', expected: 'MENDOZA ALATA, Victor Gabriel' },
  { input: 'DAVID ALEXANDER RUIZ VARGAS', expected: 'RUIZ VARGAS, David Alexander' },
  { input: 'DANTE ARTURO SOTO CONDE', expected: 'SOTO CONDE, Dante Arturo' },
  { input: 'EVELYN AGUIRRE ALARCON', expected: 'AGUIRRE ALARCON, Evelyn' },

  // ONEM (Apellidos Nombres -> APELLIDOS, Nombres)
  { input: 'ENRIQUEZ CASTRO DUANÉ', expected: 'ENRIQUEZ CASTRO, Duané' },
  { input: 'ESPINOZA LOBO MANUEL ALEXANDER', expected: 'ESPINOZA LOBO, Manuel Alexander' },
  { input: 'CORDOVA ORDINOLA ALESSANDRA SAORI YAMILETH', expected: 'CORDOVA ORDINOLA, Alessandra Saori Yamileth' },
  { input: 'VILLANUEVA MAURICIO CINDY LORENA', expected: 'VILLANUEVA MAURICIO, Cindy Lorena' },

  // Objeto con apellidos y nombres separados
  { input: { apellidos: 'Soto Conde', nombres: 'Dante Arturo' }, expected: 'SOTO CONDE, Dante Arturo' },
  { input: { apellidos: '', nombres: 'DANIELA GERALDINE YANAPA ALMANZA' }, expected: 'YANAPA ALMANZA, Daniela Geraldine' }
];

let pFailures = 0;
testCases.forEach(({ input, expected }, idx) => {
  const actual = formatPersonName(input);
  const ok = actual === expected;
  if (!ok) pFailures++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] Caso ${idx + 1}: "${typeof input === 'string' ? input : JSON.stringify(input)}"`);
  console.log(`       Obtenido: "${actual}"`);
  console.log(`       Esperado: "${expected}"`);
});

console.log('\n--- TEST 2: formatResolucionRef ---');
const resCases = [
  { input: 'RD 04851-2026-UGEL03', expected: 'RD N.° 04851\u20112026\u2011UGEL03' },
  { input: 'RD N.° 04851-2026-UGEL03', expected: 'RD N.° 04851\u20112026\u2011UGEL03' },
  { input: 'RD 04715-2026-UGEL03', expected: 'RD N.° 04715\u20112026\u2011UGEL03' }
];

let rFailures = 0;
resCases.forEach(({ input, expected }, idx) => {
  const actual = formatResolucionRef(input);
  const ok = actual === expected;
  if (!ok) rFailures++;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] Caso ${idx + 1}: "${input}" -> "${actual}"`);
});

if (pFailures === 0 && rFailures === 0) {
  console.log('\n✓ Todos los tests de nombres y resoluciones pasaron exitosamente.');
} else {
  console.error(`\n✕ Se encontraron ${pFailures + rFailures} fallos.`);
  process.exit(1);
}

console.log('\n--- TEST 3: deduplicateConcursoRows & Modular Code Counting ---');

// Caso real del acta de referencia JEDPA (12 registros crudos, 1 duplicado exacto)
const sampleJedpaRows = [
  {
    tipoConcursoId: 'jedpa',
    tipoConcursoNombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    etapa: 'UGEL',
    categoria: 'A',
    disciplina: 'AJEDREZ',
    institucion: 'SACO OLIVEROS HELICOIDAL',
    codigoModular: '0694265',
    participantes: [{ nombres: 'DANIELA GERALDINE YANAPA ALMANZA', dni: '79592611' }],
    asesores: [{ nombres: 'DANTE ARTURO SOTO CONDE', dni: '09531985' }]
  },
  // Duplicado idéntico
  {
    tipoConcursoId: 'jedpa',
    tipoConcursoNombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    etapa: 'UGEL',
    categoria: 'A',
    disciplina: 'AJEDREZ',
    institucion: 'SACO OLIVEROS HELICOIDAL',
    codigoModular: '0694265',
    participantes: [{ nombres: 'DANIELA GERALDINE YANAPA ALMANZA', dni: '79592611' }],
    asesores: [{ nombres: 'DANTE ARTURO SOTO CONDE', dni: '09531985' }]
  },
  {
    tipoConcursoId: 'jedpa',
    tipoConcursoNombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    etapa: 'UGEL',
    categoria: 'A',
    disciplina: 'AJEDREZ',
    institucion: '0005 ROSA DE SANTA MARIA',
    codigoModular: '0334862',
    participantes: [{ nombres: 'SOPHYA VALENTINA PAUCAR CARHUAZ', dni: '78664220' }],
    asesores: [{ nombres: 'EVELYN AGUIRRE ALARCON', dni: '42432321' }]
  },
  // PERUANO CHINO JUAN XXIII con dos códigos modulares diferentes (0331413 y 0336966)
  {
    tipoConcursoId: 'jedpa',
    tipoConcursoNombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    etapa: 'UGEL',
    categoria: 'A',
    disciplina: 'ATLETISMO',
    institucion: 'PERUANO CHINO JUAN XXIII',
    codigoModular: '0331413',
    participantes: [{ nombres: 'KAYETANA SOFIA ORDOÑEZ LORA', dni: '79836942' }],
    asesores: []
  },
  {
    tipoConcursoId: 'jedpa',
    tipoConcursoNombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    etapa: 'UGEL',
    categoria: 'B',
    disciplina: 'ATLETISMO',
    institucion: 'PERUANO CHINO JUAN XXIII',
    codigoModular: '0336966',
    participantes: [{ nombres: 'ALVARO JOSE ESCALLY CORTIJO', dni: '78806726' }],
    asesores: []
  }
];

const deduplicated = deduplicateConcursoRows(sampleJedpaRows);
console.log(`Filas originales: ${sampleJedpaRows.length}`);
console.log(`Filas deduplicadas: ${deduplicated.length}`);
if (deduplicated.length === 4) {
  console.log('[PASS] Duplicado exacto de SACO OLIVEROS eliminado con éxito (5 -> 4).');
} else {
  console.error('[FAIL] No se deduplicó correctamente.');
  process.exit(1);
}

// Conteo por código modular
const countByModular = new Set(deduplicated.map(r => (r.codigoModular || r.institucion || '').trim().toLowerCase())).size;
console.log(`Instituciones por código modular: ${countByModular}`);
if (countByModular === 4) {
  console.log('[PASS] PERUANO CHINO JUAN XXIII con 2 códigos modulares se cuenta como 2 instituciones distintas.');
} else {
  console.error('[FAIL] Conteo de instituciones incorrecto.');
  process.exit(1);
}

console.log('\n✓ Todos los tests de deduplicación y conteo modular pasaron.');

