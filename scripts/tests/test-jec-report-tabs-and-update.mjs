import assert from 'node:assert';
import {
  JEC_FICHAS_CONFIG,
  getJecFichaConfig,
  getJecVisitasToCheck,
  renderJecPendingTabsHtml,
  calculateJecPendingItems
} from '../../public/js/ui/jec-reportes.js';

console.log('=== TEST: JEC REPORT TABS & UPDATE LOGIC ===');

// 1. Configuración de visitas para ficha institucional JEC
const ftInst = { id: 'ft_msejec_2do', nombre: 'Monitoreo a la Implementación del Modelo JEC' };
const visitasInst = getJecVisitasToCheck(ftInst);
assert.deepStrictEqual(visitasInst, [1, 2, 3], 'La ficha institucional JEC debe verificar visitas 1, 2 y 3');
console.log('✓ Visitas Ficha Institucional JEC: [1, 2, 3] OK');

// 2. Configuración de visitas para Coordinador Pedagógico
const ftPedag = { id: 'ft_coord_pedagogico', nombre: 'Coordinador Pedagógico - JEC' };
const visitasPedag = getJecVisitasToCheck(ftPedag);
assert.deepStrictEqual(visitasPedag, [2, 3], 'Coordinador Pedagógico debe verificar visitas 2 y 3');
console.log('✓ Visitas Coord. Pedagógico JEC: [2, 3] OK');

// 3. Configuración de visitas para Coordinador de Tutoría
const ftTutoria = { id: 'ft_coord_tutoria_jec', nombre: 'Coordinador de Tutoría - JEC' };
const visitasTutoria = getJecVisitasToCheck(ftTutoria);
assert.deepStrictEqual(visitasTutoria, [2, 3], 'Coordinador de Tutoría debe verificar visitas 2 y 3');
console.log('✓ Visitas Coord. Tutoría JEC: [2, 3] OK');

// 4. Renderizado de botones de momentos para Ficha Institucional JEC (Debe tener 4 botones: Todos, 1er, 2do y 3er Momento)
const dummyPendingInst = [
  { visita: 1 }, { visita: 1 },
  { visita: 2 },
  { visita: 3 }, { visita: 3 }, { visita: 3 }
];
const tabsHtmlInst = renderJecPendingTabsHtml(ftInst, dummyPendingInst, 'ALL');
assert.ok(tabsHtmlInst.includes('Todos (6)'), 'Debe incluir botón Todos (6)');
assert.ok(tabsHtmlInst.includes('1er Momento (2)'), 'Debe incluir botón 1er Momento (2)');
assert.ok(tabsHtmlInst.includes('2do Momento (1)'), 'Debe incluir botón 2do Momento (1)');
assert.ok(tabsHtmlInst.includes('3er Momento (3)'), 'Debe incluir botón 3er Momento (3)');
assert.ok(tabsHtmlInst.includes('data-tab="ALL"'), 'Debe incluir data-tab="ALL"');
assert.ok(tabsHtmlInst.includes('data-tab="V1"'), 'Debe incluir data-tab="V1"');
assert.ok(tabsHtmlInst.includes('data-tab="V2"'), 'Debe incluir data-tab="V2"');
assert.ok(tabsHtmlInst.includes('data-tab="V3"'), 'Debe incluir data-tab="V3"');
console.log('✓ 4 Botones para Ficha Institucional JEC generados correctamente');

// 5. Renderizado de botones de momentos para Coordinadores (Debe tener 3 botones: Todos, 2do y 3er Momento)
const dummyPendingCoord = [
  { visita: 2 }, { visita: 2 },
  { visita: 3 }
];
const tabsHtmlPedag = renderJecPendingTabsHtml(ftPedag, dummyPendingCoord, 'V2');
assert.ok(tabsHtmlPedag.includes('Todos (3)'), 'Debe incluir botón Todos (3)');
assert.ok(tabsHtmlPedag.includes('2do Momento (2)'), 'Debe incluir botón 2do Momento (2)');
assert.ok(tabsHtmlPedag.includes('3er Momento (1)'), 'Debe incluir botón 3er Momento (1)');
assert.ok(!tabsHtmlPedag.includes('1er Momento'), 'No debe incluir 1er Momento en coordinadores');
assert.ok(tabsHtmlPedag.includes('class="btnVisitaTab active" data-tab="V2"'), 'El botón V2 debe tener la clase active');
console.log('✓ 3 Botones para Coordinadores JEC generados correctamente con tab activa');

const tabsHtmlTutoria = renderJecPendingTabsHtml(ftTutoria, dummyPendingCoord, 'ALL');
assert.ok(tabsHtmlTutoria.includes('Todos (3)'), 'Debe incluir botón Todos (3)');
assert.ok(tabsHtmlTutoria.includes('2do Momento (2)'), 'Debe incluir botón 2do Momento (2)');
assert.ok(tabsHtmlTutoria.includes('3er Momento (1)'), 'Debe incluir botón 3er Momento (1)');
console.log('✓ 3 Botones para Tutoría JEC generados correctamente');

// 6. Prueba de cálculo de pendientes respetando visitas oficiales
const targetColegios = [
  { id: 'col1', ie: 'IE 0001', cantCoordPedag: 2, cantCoordTutoria: 1 }
];
const visitSubsMap = new Map();
// Simular que para col1 ya se registró la V1
visitSubsMap.set('col1_V1', [{ id: 'sub1' }]);

// Pendientes para Ficha Institucional: Debería tener V2 y V3 pendientes (V1 ya está hecha)
const pendingInst = calculateJecPendingItems(targetColegios, visitSubsMap, ftInst, {}, () => 'Esp. JEC');
assert.strictEqual(pendingInst.length, 2, 'Debe tener 2 visitas pendientes (V2 y V3)');
assert.strictEqual(pendingInst[0].visita, 2);
assert.strictEqual(pendingInst[1].visita, 3);
console.log('✓ Pendientes para Ficha Institucional JEC generados para visitas faltantes (V2 y V3)');

// Pendientes para Coordinador Pedagógico: col1 necesita 2 coordinadores en V2 y 2 en V3
const pendingPedag = calculateJecPendingItems(targetColegios, visitSubsMap, ftPedag, {}, () => 'Esp. JEC');
assert.strictEqual(pendingPedag.length, 2, 'Debe tener 2 visitas pendientes (V2 y V3)');
assert.strictEqual(pendingPedag[0].visita, 2);
assert.strictEqual(pendingPedag[1].visita, 3);
console.log('✓ Pendientes para Coord. Pedagógico JEC generados correctamente (V2 y V3)');

console.log('========================================');
console.log('TODAS LAS PRUEBAS DE TABS Y REPORTES PASARON EXITOSAMENTE');
console.log('========================================');
