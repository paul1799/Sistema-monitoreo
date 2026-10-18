/**
 * test-coord-pedagogico-vs-tutoria.mjs
 * Pruebas unitarias de independencia y exactitud de reglas y configuraciones
 * entre la Ficha de Monitoreo de Coordinador(a) Pedagógico (JEC) y la Ficha de Tutoría (JEC).
 */

import {
  calcScore,
  REGLA_NIVEL_COORD_PEDAGOGICO,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  getNivelCoordPedagogicoJec,
  estadoPorRegla
} from '../../public/js/calcEngine.js';

import {
  getMatrizConfig,
  ITEMS_COORD_PEDAGOGICO,
  ITEMS_COORD_TUTORIA_JEC,
  LIMITES_NIVEL_FICHAS
} from '../../public/js/matrizConfig.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FALLO: ${message}`);
    failed++;
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FALLO: ${message} (Esperado: ${expected}, Obtenido: ${actual})`);
    failed++;
  }
}

console.log('\n======================================================');
console.log(' TEST: INDEPENDENCIA COORD. PEDAGÓGICO VS TUTORÍA JEC');
console.log('======================================================\n');

// 1. Verificación de ítems oficiales
console.log('1. Ítems oficiales en matrizConfig:');
assertEqual(ITEMS_COORD_PEDAGOGICO.length, 17, 'ITEMS_COORD_PEDAGOGICO tiene exactamente 17 ítems');
assertEqual(ITEMS_COORD_TUTORIA_JEC.length, 21, 'ITEMS_COORD_TUTORIA_JEC tiene exactamente 21 ítems');

// Verificar últimos ítems de Coord. Pedagógico (Aspecto 5: Reuniones de trabajo)
const cp15 = ITEMS_COORD_PEDAGOGICO.find(i => i.num === '15' || i.id === 'cp_15');
const cp16 = ITEMS_COORD_PEDAGOGICO.find(i => i.num === '16' || i.id === 'cp_16');
const cp17 = ITEMS_COORD_PEDAGOGICO.find(i => i.num === '17' || i.id === 'cp_17');
assert(cp15 && cp15.texto.includes('reuniones de trabajo colegiado con los directivos'), 'Ítem 15 pedagógico coincide con texto de muestra');
assert(cp16 && cp16.texto.includes('Presenta a la dirección informe'), 'Ítem 16 pedagógico coincide con texto de muestra');
assert(cp17 && cp17.texto.includes('Socializa los resultados del acompañamiento pedagógico'), 'Ítem 17 pedagógico coincide con texto de muestra');

// 2. Límites en LIMITES_NIVEL_FICHAS
console.log('\n2. Límites en LIMITES_NIVEL_FICHAS:');
assertEqual(LIMITES_NIVEL_FICHAS.COORD_PEDAGOGICO.max, 51, 'COORD_PEDAGOGICO max = 51');
assertEqual(LIMITES_NIVEL_FICHAS.COORD_PEDAGOGICO.limInicio, 27, 'COORD_PEDAGOGICO limInicio = 27');
assertEqual(LIMITES_NIVEL_FICHAS.COORD_PEDAGOGICO.limProceso, 40, 'COORD_PEDAGOGICO limProceso = 40');

assertEqual(LIMITES_NIVEL_FICHAS.COORD_TUTORIA_JEC.max, 63, 'COORD_TUTORIA_JEC max = 63');
assertEqual(LIMITES_NIVEL_FICHAS.COORD_TUTORIA_JEC.limInicio, 41, 'COORD_TUTORIA_JEC limInicio = 41');
assertEqual(LIMITES_NIVEL_FICHAS.COORD_TUTORIA_JEC.limProceso, 52, 'COORD_TUTORIA_JEC limProceso = 52');

// 3. Configuración resuelta por getMatrizConfig
console.log('\n3. getMatrizConfig para ambas fichas:');
const configPedag = getMatrizConfig({ id: 'ft_coord_pedagogico', nombre: 'Ficha de Monitoreo a las funciones que cumple el/la Coordinador(a) Pedagógico' });
assertEqual(configPedag.sheetName, 'COORD. PEDAGOGICO', 'Nombre de hoja: COORD. PEDAGOGICO');
assertEqual(configPedag.items.length, 17, 'Total ítems en config Pedagógico = 17');
assertEqual(configPedag.limites.max, 51, 'Límite max en config Pedagógico = 51');
assertEqual(configPedag.limites.limInicio, 27, 'Límite Inicio en config Pedagógico = 27');
assertEqual(configPedag.limites.limProceso, 40, 'Límite Proceso en config Pedagógico = 40');

const configTutoria = getMatrizConfig({ id: 'ft_coord_tutoria_jec', nombre: 'Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)' });
assertEqual(configTutoria.sheetName, 'COORD. TUTORIA JEC', 'Nombre de hoja: COORD. TUTORIA JEC');
assertEqual(configTutoria.items.length, 21, 'Total ítems en config Tutoría = 21');
assertEqual(configTutoria.limites.max, 63, 'Límite max en config Tutoría = 63');
assertEqual(configTutoria.limites.limInicio, 41, 'Límite Inicio en config Tutoría = 41');
assertEqual(configTutoria.limites.limProceso, 52, 'Límite Proceso en config Tutoría = 52');

// 4. Reglas de cálculo y rangos oficiales
console.log('\n4. Reglas de cálculo y rangos:');
assertEqual(REGLA_NIVEL_COORD_PEDAGOGICO.maxPuntaje, 51, 'REGLA_NIVEL_COORD_PEDAGOGICO maxPuntaje = 51');
assertEqual(REGLA_NIVEL_COORD_TUTORIA_JEC.maxPuntaje, 63, 'REGLA_NIVEL_COORD_TUTORIA_JEC maxPuntaje = 63');

// 5. Casos reales del Excel del usuario
console.log('\n5. Evaluación de casos reales del usuario (Puntajes 49, 46, 38):');
// En el Excel del usuario:
// Puntaje 49:
const niv49Pedag = getNivelCoordPedagogicoJec(49);
assertEqual(niv49Pedag.nivel, 'Cumple', 'Puntaje 49 en Coord Pedagógico es Cumple (LOGRADO)');
assertEqual(niv49Pedag.estado_panel, 'Logrado', 'Estado panel 49 es Logrado');

const niv49Tutoria = estadoPorRegla({ puntaje: 49 }, REGLA_NIVEL_COORD_TUTORIA_JEC);
assertEqual(niv49Tutoria.nivel, 'Cumple parcialmente', 'Puntaje 49 en Tutoría es Cumple parcialmente (PROCESO)');
assertEqual(niv49Tutoria.estado_panel, 'En proceso', 'Estado panel en Tutoría es En proceso');

// Puntaje 46:
const niv46Pedag = getNivelCoordPedagogicoJec(46);
assertEqual(niv46Pedag.nivel, 'Cumple', 'Puntaje 46 en Coord Pedagógico es Cumple (LOGRADO)');

// Puntaje 38:
const niv38Pedag = getNivelCoordPedagogicoJec(38);
assertEqual(niv38Pedag.nivel, 'Cumple parcialmente', 'Puntaje 38 en Coord Pedagógico es Cumple parcialmente (PROCESO)');
assertEqual(niv38Pedag.estado_panel, 'En proceso', 'Estado panel 38 es En proceso');

const niv38Tutoria = estadoPorRegla({ puntaje: 38 }, REGLA_NIVEL_COORD_TUTORIA_JEC);
assertEqual(niv38Tutoria.nivel, 'No cumple', 'Puntaje 38 en Tutoría es No cumple (INICIO)');
assertEqual(niv38Tutoria.estado_panel, 'Inicio', 'Estado panel en Tutoría es Inicio');

// 6. Prueba con calcScore simulando plantilla con 17 respuestas de valor 3 (Puntaje 51)
console.log('\n6. Simulación calcScore completa:');
const respuestasMax = ITEMS_COORD_PEDAGOGICO.map(it => ({ id: it.id, valor: 3 }));
const ftPedag = {
  id: 'ft_coord_pedagogico',
  nombre: 'Ficha de Monitoreo al Coordinador Pedagógico',
  secciones: [{ items: ITEMS_COORD_PEDAGOGICO }]
};
const resMax = calcScore(respuestasMax, ftPedag);
assertEqual(resMax.puntaje, 51, 'Puntaje máximo de 17 ítems es 51');
assertEqual(resMax.puntaje_max, 51, 'Puntaje máximo oficial es 51');
assertEqual(resMax.estado.nivel, 'Cumple', 'Nivel máximo es Cumple');
assertEqual(resMax.estado.estado_panel, 'Logrado', 'Estado panel máximo es Logrado');

// Simular puntaje 49 (15 de 3 pts + 2 de 2 pts = 45 + 4 = 49 pts)
const respuestas49 = ITEMS_COORD_PEDAGOGICO.map((it, idx) => ({ id: it.id, valor: idx < 15 ? 3 : 2 }));
const res49 = calcScore(respuestas49, ftPedag);
assertEqual(res49.puntaje, 49, 'Puntaje simulado = 49');
assertEqual(res49.estado.nivel, 'Cumple', 'calcScore con 49 da Cumple (no Proceso)');
assertEqual(res49.estado.estado_panel, 'Logrado', 'calcScore con 49 da Logrado (no Proceso)');

console.log('\n' + '═'.repeat(55));
console.log(` Resultado: ${passed} ✅ pasaron · ${failed} ❌ fallaron`);
console.log('═'.repeat(55) + '\n');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('🎉 Suite de independencia Coordinador Pedagógico vs Tutoría PASÓ con éxito.');
}
