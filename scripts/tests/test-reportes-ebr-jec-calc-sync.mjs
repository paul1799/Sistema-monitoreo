import assert from 'node:assert';
import { isFichaEbrGestionEscolar, isFichaJec } from '../../public/js/calc/detectors.js';
import { computeStats } from '../../public/js/ui/scoring.js';
import { aplicarFiltrosReporte } from '../../public/js/ui/consolidado.js';
import { buildJecVisitBadges } from '../../public/js/ui/jec-reportes.js';

console.log('=== TEST: REPORTES EBR & JEC CALCULOS Y SINCRONIZACION ===');

// 1. Detección unificada de EBR Gestión Escolar
assert.strictEqual(isFichaEbrGestionEscolar({ id: 'ft_gestion_ugel03_ebr', nombre: 'Gestión Escolar EBR' }), true);
assert.strictEqual(isFichaEbrGestionEscolar({ id: 'ft_ebr_gestion_1er', nombre: 'EBR Gestión Escolar 1er Momento' }), true);
assert.strictEqual(isFichaEbrGestionEscolar({ id: 'ft_ebr_gestion', nombre: 'Monitoreo a la Gestión Escolar 1er Momento' }), true);
console.log('✓ Detección de Fichas EBR Gestión Escolar OK');

// 2. Cálculo de Ficha JEC 1er Momento con respuestas jec1_* (escala 1-3)
const subJec1 = {
  id: 'sub_jec1_test',
  fichaTypeId: 'ft_msejec_1er',
  institucion: '0001 MARIA AUXILIADORA',
  visita: 1,
  momento: 1,
  respuestas: [
    { id: 'jec1_1', valor: '3' },
    { id: 'jec1_2', valor: '3' },
    { id: 'jec1_3', valor: '2' },
    { id: 'jec1_4', valor: '3' }
  ]
};
const ftJec1 = { id: 'ft_msejec_1er', nombre: '1er Monitoreo a la Implementación del Modelo JEC', tipoRespuesta: 'escala1_3' };
const statsJec1 = computeStats(subJec1, ftJec1);

assert.notStrictEqual(statsJec1.pct, null, 'El porcentaje de JEC 1er Momento no debe ser null');
assert.ok(statsJec1.puntaje > 0, 'El puntaje debe ser mayor a 0');
assert.notStrictEqual(statsJec1.estado.label, 'Sin datos', 'El estado de JEC 1er Momento no debe ser Sin datos');
console.log('✓ Cálculo de Ficha JEC 1er Momento en computeStats OK (Puntaje:', statsJec1.puntaje, 'Pct:', statsJec1.pct + '%', 'Estado:', statsJec1.estado.label + ')');

// 3. Compatibilidad unificada en aplicarFiltrosReporte para EBR
const mockSubmissions = [
  { id: 'sub_ebr_1', fichaTypeId: 'ft_gestion_ugel03_ebr', institucion: 'IE 001', respuestas: [{ id: 'ge_1_1', valor: 'logrado' }] },
  { id: 'sub_ebr_2', fichaTypeId: 'ft_ebr_gestion_1er', institucion: 'IE 002', respuestas: [{ id: 'ge_1_1', valor: 'logrado' }] },
  { id: 'sub_jec_1', fichaTypeId: 'ft_msejec_1er', institucion: 'IE 003', respuestas: [{ id: 'jec1_1', valor: '3' }] },
];

const mockGetFichaType = (id) => {
  if (id === 'ft_gestion_ugel03_ebr') return { id: 'ft_gestion_ugel03_ebr', nombre: 'Gestión Escolar EBR' };
  if (id === 'ft_ebr_gestion_1er') return { id: 'ft_ebr_gestion_1er', nombre: 'EBR Gestión 1er Momento' };
  if (id === 'ft_msejec_1er') return { id: 'ft_msejec_1er', nombre: 'JEC 1er Momento' };
  return null;
};

// Al filtrar por Gestión Escolar EBR ('ft_gestion_ugel03_ebr'), debe incluir tanto sub_ebr_1 como sub_ebr_2
const resEbr = aplicarFiltrosReporte(mockSubmissions, { tipo: 'ft_gestion_ugel03_ebr' }, {}, mockGetFichaType);
assert.strictEqual(resEbr.subs.length, 2, 'Debe incluir las 2 fichas de EBR');
assert.strictEqual(resEbr.instCount, 2, 'Debe contar 2 instituciones de EBR');
console.log('✓ Inclusión unificada de EBR en aplicarFiltrosReporte OK (2 fichas de 2 IEs)');

// 4. Badges horizontales de visitas para JEC
const groupMock = {
  colId: 'col_123',
  institucion: '0003 NUESTRA SEÑORA DEL CARMEN',
  visitas: [
    { s: { visita: 1 } },
    { s: { visita: 2 } }
  ]
};
const badgesHtml = buildJecVisitBadges(groupMock, { id: 'ft_msejec_2do', tipo: 'institucional' }, {});
assert.ok(badgesHtml.includes('>V1<') || badgesHtml.includes('>V1 '), 'Debe mostrar etiqueta V1');
assert.ok(badgesHtml.includes('>V2<') || badgesHtml.includes('>V2 '), 'Debe mostrar etiqueta V2');
console.log('✓ Badges de visitas horizontales generados OK:', badgesHtml);

console.log('======================================================');
console.log('🎉 TODAS LAS VERIFICACIONES DE CÁLCULO Y REPORTE PASARON');
console.log('======================================================');
