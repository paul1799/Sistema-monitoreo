import assert from 'assert';
import {
  isFichaJec,
  isFichaJec1erMomento,
  isFichaJec2doMomento,
  isFichaJec3erMomento,
  getMomentoFichaJec,
  getSubmissionVisitaNum
} from '../../public/js/calc/detectors.js';
import {
  DEFAULT_FICHA_TYPES_METADATA,
  getEnrichedFichaType
} from '../../public/js/ui/consolidado.js';
import {
  JEC_1ER_CONDICIONES_ITEMS,
  JEC_1ER_SECCIONES_PUNTAJE,
  getNivelJec1erMomento
} from '../../public/js/jec-1er-monitoreo.js';
import {
  JEC_SECCIONES,
  getNivelLogroJec,
  renderJecVisitaSelectorHtml
} from '../../public/js/jec-monitoreo.js';

import { PLANTILLAS_BASE_OFICIALES } from '../../public/js/catalogo-plantillas-base.js';

console.log('=== TEST 1: Detección y prioridad de Visita en Modelo JEC ===');
// Ficha histórica sin visita debe retornar 2
const subHistorica = { id: 'sub_hist', fichaTypeId: 'ft_msejec_2do', institucion: 'IE 1001' };
assert.strictEqual(getSubmissionVisitaNum(subHistorica), 2, 'Ficha histórica debe resolver a Visita 2 por defecto');

// Ficha unificada con visita 1
const subV1 = { id: 'sub_1', fichaTypeId: 'ft_msejec_2do', visita: 1, institucion: 'IE 1001' };
assert.strictEqual(getSubmissionVisitaNum(subV1), 1, 'Ficha con visita 1 debe resolver a Visita 1');
assert.strictEqual(getMomentoFichaJec(subV1), 1, 'getMomentoFichaJec debe resolver a 1');

// Ficha unificada con visita 3
const subV3 = { id: 'sub_3', fichaTypeId: 'ft_msejec_2do', visita: 3, institucion: 'IE 1001' };
assert.strictEqual(getSubmissionVisitaNum(subV3), 3, 'Ficha con visita 3 debe resolver a Visita 3');
assert.strictEqual(getMomentoFichaJec(subV3), 3, 'getMomentoFichaJec debe resolver a 3');

console.log('✓ TEST 1 PASSED: Detección y prioridad de Visita funcionan correctamente.');

console.log('=== TEST 2: Estructura de plantilla enriquecida JEC ===');
const ftJec = getEnrichedFichaType(PLANTILLAS_BASE_OFICIALES.ft_msejec_2do);
assert.strictEqual(ftJec.tieneVisitas, true, 'ft_msejec_2do debe tener tieneVisitas = true');
assert.strictEqual(ftJec.tipoVisitas, 'items_por_visita', 'ft_msejec_2do debe ser tipo items_por_visita');
assert.strictEqual(ftJec.visitas.length, 3, 'ft_msejec_2do debe tener 3 visitas configuradas');
console.log('✓ TEST 2 PASSED: Plantilla enriquecida JEC tiene soporte multi-visita.');

console.log('=== TEST 3: Selector visual de momentos JEC ===');
const selectorHtmlV1 = renderJecVisitaSelectorHtml(1);
assert.ok(selectorHtmlV1.includes('data-jec-visita="1"'), 'Debe contener tarjeta para Visita 1');
assert.ok(selectorHtmlV1.includes('data-jec-visita="2"'), 'Debe contener tarjeta para Visita 2');
assert.ok(selectorHtmlV1.includes('data-jec-visita="3"'), 'Debe contener tarjeta para Visita 3');
assert.ok(selectorHtmlV1.includes('37 ítems'), 'Debe indicar 37 ítems para Visita 1');
assert.ok(selectorHtmlV1.includes('31 ítems + R1–R5'), 'Debe indicar 31 ítems + R1–R5 para Visita 2');
console.log('✓ TEST 3 PASSED: Selector visual genera tarjetas para los 3 momentos.');

console.log('=== TEST 4: Baremos y cálculo oficial de Visita 1 vs Visita 2 ===');
// Visita 1: Escala 37 ítems (Máx 111 pts)
assert.strictEqual(getNivelJec1erMomento(95).nivel.toUpperCase(), 'LOGRADO', '95 pts en V1 debe ser Logrado');
assert.strictEqual(getNivelJec1erMomento(70).nivel.toUpperCase(), 'PROCESO', '70 pts en V1 debe ser Proceso');
assert.strictEqual(getNivelJec1erMomento(40).nivel.toUpperCase(), 'INICIO', '40 pts en V1 debe ser Inicio');

// Visita 2: Escala 31 ítems Sí/No (24..31 Lograda, 12..23 Parcial, 0..11 Incipiente)
assert.strictEqual(getNivelLogroJec(25).nivel, 'Implementación lograda', '25 Sí en V2 debe ser Implementación lograda');
assert.strictEqual(getNivelLogroJec(18).nivel, 'Implementación parcial', '18 Sí en V2 debe ser Implementación parcial');
assert.strictEqual(getNivelLogroJec(8).nivel, 'Implementación incipiente', '8 Sí en V2 debe ser Implementación incipiente');
console.log('✓ TEST 4 PASSED: Baremos oficiales validados.');

console.log('\n======================================================');
console.log('🎉 TODOS LOS TESTS DE INTEGRACIÓN JEC PASARON CON ÉXITO');
console.log('======================================================\n');
