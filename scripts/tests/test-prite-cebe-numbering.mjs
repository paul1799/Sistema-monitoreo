// test-prite-cebe-numbering.mjs
import assert from 'node:assert';
import { PRITE_SECCIONES, TOTAL_PRITE_ITEMS, getActivePriteSections } from '../../public/js/prite-gestion.js';
import { CEBE_SECCIONES, TOTAL_CEBE_ITEMS, getActiveCebeSections } from '../../public/js/cebe-gestion.js';
import { PLANTILLAS_BASE_OFICIALES } from '../../public/js/catalogo-plantillas-base.js';

console.log('=== TEST: VERIFICACIÓN DE ESTRUCTURAS Y NUMERACIÓN PRITE Y CEBE ===\n');

// 1. Estructura canónica oficial de PRITE (RM N° 501-2025-MINEDU)
console.log('1. Verificando estructura canónica oficial de PRITE:');
assert.strictEqual(PRITE_SECCIONES.length, 7, 'PRITE debe tener exactamente 7 secciones');
const priteDistribution = PRITE_SECCIONES.map(s => s.items.length);
console.log('  Distribución de ítems en PRITE:', priteDistribution.join(', '));
assert.deepStrictEqual(priteDistribution, [3, 5, 6, 3, 8, 5, 2], 'PRITE debe distribuirse exactamente en 3, 5, 6, 3, 8, 5, 2 ítems');
assert.strictEqual(TOTAL_PRITE_ITEMS, 32, 'PRITE debe sumar exactamente 32 ítems');

let priteItemCount = 0;
PRITE_SECCIONES.forEach((sec, sIdx) => {
  assert(sec.num, `La sección PRITE ${sIdx + 1} debe tener num`);
  assert.strictEqual(sec.num, `3.${sIdx + 1}`, `La sección PRITE ${sIdx + 1} debe tener num '3.${sIdx + 1}'`);
  assert(sec.nombre, `La sección PRITE ${sIdx + 1} debe tener nombre`);
  sec.items.forEach((it, iIdx) => {
    priteItemCount++;
    assert.strictEqual(it.num, priteItemCount, `El ítem ${it.id} debe tener num = ${priteItemCount}`);
    assert(it.texto, `El ítem ${it.id} debe tener texto`);
  });
});
console.log(`  ✅ PRITE validado: 7 secciones, 32 ítems (3, 5, 6, 3, 8, 5, 2) con sec.num e it.num correlativos.`);

// 2. getActivePriteSections con entradas normales, nulas o corruptas
console.log('\n2. Verificando robustez de getActivePriteSections:');
const priteFromNull = getActivePriteSections(null);
assert.strictEqual(priteFromNull.length, 7);
assert.strictEqual(priteFromNull.reduce((a, s) => a + s.items.length, 0), 32);

// Objeto corrupto de Firestore (ej. 4 secciones con 16 ítems sin num)
const corruptedPrite = {
  id: 'ft_prite_gestion',
  secciones: [
    { nombre: 'Atención temprana', items: [{ id: 'old_1', texto: 'test 1' }] }
  ]
};
const priteHealed = getActivePriteSections(corruptedPrite);
assert.strictEqual(priteHealed.length, 7, 'Debe rechazar la versión corrupta y devolver las 7 secciones oficiales');
assert.strictEqual(priteHealed.reduce((a, s) => a + s.items.length, 0), 32, 'Debe devolver los 32 ítems oficiales');
priteHealed.forEach((sec, sIdx) => {
  assert(sec.num && sec.num !== 'undefined', `sec.num no debe ser undefined (valor: ${sec.num})`);
  sec.items.forEach(it => {
    assert(it.num !== undefined && it.num !== null, `it.num no debe ser undefined (valor: ${it.num})`);
  });
});
console.log('  ✅ getActivePriteSections descarta estructuras no oficiales y garantiza numeración no-undefined.');

// 3. Estructura canónica oficial de CEBE
console.log('\n3. Verificando estructura canónica oficial de CEBE:');
assert.strictEqual(CEBE_SECCIONES.length, 7, 'CEBE debe tener exactamente 7 secciones');
const cebeDistribution = CEBE_SECCIONES.map(s => s.items.length);
console.log('  Distribución de ítems en CEBE:', cebeDistribution.join(', '));
assert.deepStrictEqual(cebeDistribution, [7, 4, 8, 4, 5, 3, 3], 'CEBE debe distribuirse en 7, 4, 8, 4, 5, 3, 3 ítems');
assert.strictEqual(TOTAL_CEBE_ITEMS, 34, 'CEBE debe sumar exactamente 34 ítems');

let cebeItemCount = 0;
CEBE_SECCIONES.forEach((sec, sIdx) => {
  assert(sec.num, `La sección CEBE ${sIdx + 1} debe tener num`);
  assert.strictEqual(sec.num, `3.${sIdx + 1}`);
  sec.items.forEach(it => {
    cebeItemCount++;
    assert.strictEqual(it.num, cebeItemCount);
  });
});
console.log('  ✅ CEBE validado: 7 secciones, 34 ítems con sec.num e it.num correlativos.');

// 4. getActiveCebeSections con datos nulos o corruptos
console.log('\n4. Verificando robustez de getActiveCebeSections:');
const cebeFromNull = getActiveCebeSections(null);
assert.strictEqual(cebeFromNull.length, 7);
assert.strictEqual(cebeFromNull.reduce((a, s) => a + s.items.length, 0), 34);

const corruptedCebe = {
  id: 'ft_gestion_cebe',
  secciones: [
    { nombre: 'Monitoreo docente', items: [{ id: 'c_1', texto: 'prueba' }] }
  ]
};
const cebeHealed = getActiveCebeSections(corruptedCebe);
assert.strictEqual(cebeHealed.length, 7);
assert.strictEqual(cebeHealed.reduce((a, s) => a + s.items.length, 0), 34);
cebeHealed.forEach(sec => {
  assert(sec.num && sec.num !== 'undefined');
  sec.items.forEach(it => {
    assert(it.num !== undefined && it.num !== null);
  });
});
console.log('  ✅ getActiveCebeSections descarta estructuras no oficiales y garantiza numeración no-undefined.');

// 5. Verificando catálogo oficial de plantillas base
console.log('\n5. Verificando PLANTILLAS_BASE_OFICIALES:');
assert(PLANTILLAS_BASE_OFICIALES.ft_prite_gestion, 'ft_prite_gestion debe existir en catálogo base');
assert.strictEqual(PLANTILLAS_BASE_OFICIALES.ft_prite_gestion.secciones.length, 7);
assert.strictEqual(PLANTILLAS_BASE_OFICIALES.ft_prite_gestion.secciones.reduce((a, s) => a + s.items.length, 0), 32);

assert(PLANTILLAS_BASE_OFICIALES.ft_gestion_cebe, 'ft_gestion_cebe debe existir en catálogo base');
assert.strictEqual(PLANTILLAS_BASE_OFICIALES.ft_gestion_cebe.secciones.length, 7);
assert.strictEqual(PLANTILLAS_BASE_OFICIALES.ft_gestion_cebe.secciones.reduce((a, s) => a + s.items.length, 0), 34);

console.log('  ✅ Plantillas base contienen los 32 y 34 ítems oficiales.');

console.log('\n🎉 ¡TODAS LAS COMPROBACIONES DE PRITE Y CEBE PASARON EXITOSAMENTE!');
