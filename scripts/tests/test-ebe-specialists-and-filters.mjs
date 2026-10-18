import assert from 'node:assert/strict';
import { isEbeOrPriteResponsable } from '../../public/js/ui/core-utils.js';
import { renderEspecialistasPriteOptions } from '../../public/js/prite-gestion.js';
import { renderEspecialistasCebeOptions } from '../../public/js/cebe-gestion.js';
import { getSubmissionResponsable, getResponsableForColegio } from '../../public/js/ui/scoring.js';
import fs from 'node:fs';

console.log('--- TEST 1: isEbeOrPriteResponsable ---');
const respMargot = {
  nombresApellidos: 'Margot Kandy Poma Morales',
  modalidad: 'EBE',
  red: 'EBE',
  cargo: 'Especialista EBE'
};
const respZavala = {
  nombresApellidos: 'María Angélica Zavala Querevalú',
  modalidad: 'EBR',
  red: 'REI 13',
  especialista: 'Especialista EBR',
  cargo: 'Especialista en Educación'
};
const respValderrama = {
  nombresApellidos: 'Ana Rosario Valderrama Barrientos',
  modalidad: 'EBR',
  red: 'REI 15',
  especialista: 'Especialista EBR',
  cargo: 'Especialista en Educación'
};
const respPriteDual = {
  nombresApellidos: 'Especialista PRITE Test',
  modalidad: 'PRITE',
  red: 'REI 02'
};

assert.equal(isEbeOrPriteResponsable(respMargot), true, 'Margot should be EBE');
assert.equal(isEbeOrPriteResponsable(respZavala), false, 'Zavala is EBR, must NOT be EBE/PRITE');
assert.equal(isEbeOrPriteResponsable(respValderrama), false, 'Valderrama is EBR, must NOT be EBE/PRITE');
assert.equal(isEbeOrPriteResponsable(respPriteDual), true, 'PRITE modality must be true');
assert.equal(isEbeOrPriteResponsable(null), false, 'null is false');
console.log('✓ TEST 1 PASSED: isEbeOrPriteResponsable classifies correctly.');

console.log('--- TEST 2: renderEspecialistasPriteOptions & renderEspecialistasCebeOptions ---');
const testState = {
  responsables: [respZavala, respValderrama, respMargot]
};

const priteHtml = renderEspecialistasPriteOptions('', testState);
assert.ok(priteHtml.includes('Margot Kandy Poma Morales'), 'PRITE options must include Margot');
assert.ok(!priteHtml.includes('María Angélica Zavala Querevalú'), 'PRITE options must NOT include Zavala');
assert.ok(!priteHtml.includes('Ana Rosario Valderrama Barrientos'), 'PRITE options must NOT include Valderrama');
console.log('✓ TEST 2A PASSED: PRITE options only contains EBE specialists.');

const cebeHtml = renderEspecialistasCebeOptions('', testState);
assert.ok(cebeHtml.includes('Margot Kandy Poma Morales'), 'CEBE options must include Margot');
assert.ok(!cebeHtml.includes('María Angélica Zavala Querevalú'), 'CEBE options must NOT include Zavala');
assert.ok(!cebeHtml.includes('Ana Rosario Valderrama Barrientos'), 'CEBE options must NOT include Valderrama');
console.log('✓ TEST 2B PASSED: CEBE options only contains EBE specialists.');

console.log('--- TEST 3: Scoring resolution for CEBE & PRITE ---');
const cebeSub = {
  fichaTypeId: 'ft_gestion_cebe',
  fichaTypeNombre: 'Gestión Escolar CEBE',
  institucion: 'CEBE N° 01 Corazón de María',
  rei: '13',
  responsable: ''
};

const resolvedResp = getSubmissionResponsable(cebeSub, testState);
assert.equal(resolvedResp, 'Margot Kandy Poma Morales', 'Should resolve to Margot, not hardcoded Zavala');

const colPrite = { nombre: 'PRITE San Jerónimo', rei: '15' };
const ftPrite = { id: 'ft_prite_gestion', nombre: 'Gestión Escolar PRITE' };
const colResp = getResponsableForColegio(colPrite, ftPrite, testState);
assert.equal(colResp, 'Margot Kandy Poma Morales', 'Colegio PRITE should resolve to Margot, not Valderrama');
console.log('✓ TEST 3 PASSED: Scoring resolves EBE specialist dynamically.');

console.log('--- TEST 4: Verifying Filter Drawer button in consolidado.js ---');
const consolidadoCode = fs.readFileSync('public/js/ui/consolidado.js', 'utf-8');
assert.ok(consolidadoCode.includes('id="btnBottomClearFilters"'), 'Must have btnBottomClearFilters in downloadActionBar');
assert.ok(!consolidadoCode.includes('id="btnBackfillUgel"'), 'Must NOT have btnBackfillUgel in downloadActionBar');
assert.ok(!consolidadoCode.includes('id="btnHerramientas"'), 'Must NOT have btnHerramientas in downloadActionBar');
console.log('✓ TEST 4 PASSED: consolidado.js has Limpiar filtros button and no sync button in drawer.');

console.log('\nALL TESTS PASSED SUCCESSFULLY! (5/5)');
