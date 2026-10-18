import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  pageFichasRegistradas,
  pageColegiosMonitoreados,
  pageColegiosPendientes,
  PAGE_SIZE_CONSOLIDADO,
  setPageFichasRegistradas,
  setPageColegiosMonitoreados,
  setPageColegiosPendientes,
  buildPendingRowsHtml
} from '../../public/js/ui/consolidado.js';

console.log('--- TEST 1: Pagination state variables and page size = 10 ---');
assert.equal(PAGE_SIZE_CONSOLIDADO, 10, 'Page size must be 10 for all static boxes');
assert.equal(pageFichasRegistradas, 1, 'Initial page for Fichas Registradas should be 1');
assert.equal(pageColegiosMonitoreados, 1, 'Initial page for Colegios Monitoreados should be 1');
assert.equal(pageColegiosPendientes, 1, 'Initial page for Colegios Pendientes should be 1');

setPageFichasRegistradas(3);
setPageColegiosMonitoreados(4);
setPageColegiosPendientes(2);

assert.equal(pageFichasRegistradas, 3);
assert.equal(pageColegiosMonitoreados, 4);
assert.equal(pageColegiosPendientes, 2);
console.log('✓ TEST 1 PASSED: Pagination state and setters operate correctly with PAGE_SIZE_CONSOLIDADO = 10.');

console.log('--- TEST 2: buildPendingRowsHtml with startIndex pagination offset ---');
const dummyPending = [
  { colId: 'c1', colNombre: 'IE PRIMARIA', rei: '01', visita: 1, visitaLabel: 'V1', responsable: 'Especialista 1' },
  { colId: 'c2', colNombre: 'IE SECUNDARIA', rei: '02', visita: 2, visitaLabel: 'V2', responsable: 'Especialista 2' }
];

// Page 1 (startIndex = 0) -> Row numbers: 1, 2
const htmlP1 = buildPendingRowsHtml(dummyPending, null, 0);
assert.ok(htmlP1.includes('>1</td>'), 'Page 1 first row should be numbered 1');
assert.ok(htmlP1.includes('>2</td>'), 'Page 1 second row should be numbered 2');

// Page 2 (startIndex = 10) -> Row numbers: 11, 12
const htmlP2 = buildPendingRowsHtml(dummyPending, null, 10);
assert.ok(htmlP2.includes('>11</td>'), 'Page 2 first row should be numbered 11');
assert.ok(htmlP2.includes('>12</td>'), 'Page 2 second row should be numbered 12');
console.log('✓ TEST 2 PASSED: Row numbering correctly offsets per page (1-10, 11-20, etc.).');

console.log('--- TEST 3: Verifying consolidado.js pagination controls and pending redesign ---');
const consCode = fs.readFileSync('public/js/ui/consolidado.js', 'utf-8');

// Fichas Registradas pagination
assert.ok(consCode.includes('id="btnFichasPrev"'), 'Must have btnFichasPrev button');
assert.ok(consCode.includes('id="btnFichasNext"'), 'Must have btnFichasNext button');
assert.ok(consCode.includes('class="tablePaginationBar"'), 'Must render tablePaginationBar');

// Colegios Monitoreados pagination
assert.ok(consCode.includes('id="btnMonitoreadosPrev"'), 'Must have btnMonitoreadosPrev button');
assert.ok(consCode.includes('id="btnMonitoreadosNext"'), 'Must have btnMonitoreadosNext button');

// Colegios Pendientes redesign and pagination
assert.ok(consCode.includes('id="btnPendientesPrev"'), 'Must have btnPendientesPrev button');
assert.ok(consCode.includes('id="btnPendientesNext"'), 'Must have btnPendientesNext button');
assert.ok(consCode.includes('class="comparativaColHead comparativaColHeadPendientes"'), 'Must have redesigned comparativaColHeadPendientes');
assert.ok(consCode.includes('class="pendientesHeaderTabsWrap"'), 'Must place visit tabs into header');
assert.ok(!consCode.includes('id="pendientesSearchInp"'), 'Big search input bar must be removed as sketched with red X in Image 3');

console.log('✓ TEST 3 PASSED: Template contains all required pagination buttons and redesigned header without search bar.');

console.log('--- TEST 4: Verifying CSS styles in reportes.css ---');
const cssCode = fs.readFileSync('public/css/reportes.css', 'utf-8');
assert.ok(cssCode.includes('.tablePaginationBar'), 'reportes.css must define .tablePaginationBar');
assert.ok(cssCode.includes('.boxPaginationBar'), 'reportes.css must define .boxPaginationBar');
assert.ok(cssCode.includes('.btnPagination'), 'reportes.css must define .btnPagination');
assert.ok(cssCode.includes('.comparativaColHeadPendientes'), 'reportes.css must define .comparativaColHeadPendientes');
assert.ok(cssCode.includes('.pendientesHeaderTabsWrap'), 'reportes.css must define .pendientesHeaderTabsWrap');
assert.ok(cssCode.includes('.colMonitoreados .comparativaTblWrap'), 'reportes.css must set static height on tracking boxes');
console.log('✓ TEST 4 PASSED: All CSS classes and styles present in reportes.css.');

console.log('\nALL 4 PAGINATION & REDESIGN TESTS PASSED SUCCESSFULLY!');
