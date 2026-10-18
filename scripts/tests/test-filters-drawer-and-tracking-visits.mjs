import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reportesExpandedGroups, aplicarFiltrosReporte } from '../../public/js/ui/consolidado.js';

console.log('--- TEST 1: reportesExpandedGroups start collapsed ---');
assert.equal(reportesExpandedGroups.size, 0, 'reportesExpandedGroups should start empty (collapsed)');
console.log('✓ TEST 1 PASSED: All group accordions start collapsed by default.');

console.log('--- TEST 2: Checking consolidado.js code for visit buttons integration ---');
const consCode = fs.readFileSync('public/js/ui/consolidado.js', 'utf-8');

assert.ok(consCode.includes('btnVisitaBadge'), 'Must have btnVisitaBadge class in Colegios Monitoreados');
assert.ok(consCode.includes('filtrosReporte.visita = targetVis'), 'tabBtns must set filtrosReporte.visita to filter full report');
assert.ok(consCode.includes('host.querySelectorAll(\'.btnVisitaBadge\')'), 'Must have click listener for .btnVisitaBadge');
assert.ok(!consCode.includes("reportesExpandedGroups = new Set(['Avance general'])"), 'Avance general must not be pre-expanded');
console.log('✓ TEST 2 PASSED: Code includes interactive visit filter buttons in tracking box.');

console.log('--- TEST 3: Submissions filtering by Visita ---');
const dummySubs = [
  { id: 's1', fichaTypeId: 'ft_prite_gestion', visita: 1, institucion: 'PRITE MARIA MONTESSORI' },
  { id: 's2', fichaTypeId: 'ft_prite_gestion', visita: 2, institucion: 'PRITE MARIA MONTESSORI' }
];
const dummyFt = { id: 'ft_prite_gestion', nombre: 'Gestión Escolar PRITE', tieneVisitas: true };
const dummyState = {
  submissions: dummySubs,
  fichaTypes: [dummyFt],
  colegios: []
};
const getFt = (id) => dummyFt;

// Filtrando por Visita 1
const resV1 = aplicarFiltrosReporte(dummySubs, { tipo: 'ft_prite_gestion', visita: '1' }, dummyState, getFt, null);
assert.equal(resV1.subs.length, 1, 'Should have 1 submission for V1');
assert.equal(resV1.subs[0].visita, 1);

// Filtrando por Visita 2
const resV2 = aplicarFiltrosReporte(dummySubs, { tipo: 'ft_prite_gestion', visita: '2' }, dummyState, getFt, null);
assert.equal(resV2.subs.length, 1, 'Should have 1 submission for V2');
assert.equal(resV2.subs[0].visita, 2);

// Filtrando por Visita 3 (no existe registrada aún)
const resV3 = aplicarFiltrosReporte(dummySubs, { tipo: 'ft_prite_gestion', visita: '3' }, dummyState, getFt, null);
assert.equal(resV3.subs.length, 0, 'Should have 0 submissions registered for V3');

// Sin filtro de visita (Todas)
const resAll = aplicarFiltrosReporte(dummySubs, { tipo: 'ft_prite_gestion', visita: '' }, dummyState, getFt, null);
assert.equal(resAll.subs.length, 2, 'Should have 2 submissions for Todas');
console.log('✓ TEST 3 PASSED: aplicarFiltrosReporte filters full report accurately by visita.');

console.log('\nALL 3 INTEGRATION TESTS PASSED SUCCESSFULLY!');
