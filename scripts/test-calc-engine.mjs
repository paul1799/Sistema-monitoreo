/**
 * test-calc-engine.mjs — Pruebas unitarias del motor de cálculo
 * UGEL 03 · AGEBRE · Fase 1
 *
 * Ejecución:
 *   node scripts/test-calc-engine.mjs
 *
 * Requiere Node.js ≥ 16 (soporte de ES Modules con import estático).
 * No requiere instalación de dependencias adicionales.
 */

import { calcScore, puntajeItem, estadoPorRegla, REGLA_NIVEL_JEC, REGLA_NIVEL_GENERICA } from '../public/js/calcEngine.js';

/* ─── Mini-framework de tests ─────────────────────────────────────────── */
let passed = 0;
let failed = 0;

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FALLO: ${description}`);
    failed++;
  }
}

function assertEqual(actual, expected, description) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✅ ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FALLO: ${description}`);
    console.error(`     Esperado: ${JSON.stringify(expected)}`);
    console.error(`     Obtenido: ${JSON.stringify(actual)}`);
    failed++;
  }
}

function suite(name, fn) {
  console.log(`\n📋 ${name}`);
  fn();
}

/* ─── Datos de fichaType de prueba ─────────────────────────────────────── */

/** FichaType JEC (ft_msejec_2do) con regla oficial de conteo */
const FT_JEC = {
  id: 'ft_msejec_2do',
  nombre: 'Monitoreo JEC (test)',
  tipoRespuesta: 'si_no',
  regla_nivel: REGLA_NIVEL_JEC,
  secciones: [
    {
      nombre: 'Aspecto 01',
      items: [
        { id: 'jec_1' }, { id: 'jec_2' }, { id: 'jec_3' },
        { id: 'jec_4' }, { id: 'jec_5' }, { id: 'jec_6' },
        { id: 'jec_7' }, { id: 'jec_8' }, { id: 'jec_9' },
      ],
    },
    {
      nombre: 'Aspecto 02',
      items: [
        { id: 'jec_10' }, { id: 'jec_11' }, { id: 'jec_12' },
        { id: 'jec_13' }, { id: 'jec_14' }, { id: 'jec_15' },
        { id: 'jec_16' }, { id: 'jec_17' }, { id: 'jec_18' },
        { id: 'jec_19' }, { id: 'jec_20' },
      ],
    },
    {
      nombre: 'Aspecto 03',
      items: [
        { id: 'jec_21' }, { id: 'jec_22' }, { id: 'jec_23' },
        { id: 'jec_24' }, { id: 'jec_25' }, { id: 'jec_26' },
        { id: 'jec_27' }, { id: 'jec_28' }, { id: 'jec_29' },
        { id: 'jec_30' }, { id: 'jec_31' },
      ],
    },
  ],
};

/** FichaType EBR Gestión (ft_gestion_ugel03_ebr) con escala IPL */
const FT_EBR = {
  id: 'ft_gestion_ugel03_ebr',
  nombre: 'EBR Gestión Escolar 2do momento (test)',
  tipoRespuesta: 'ips',
  regla_nivel: REGLA_NIVEL_GENERICA,
  secciones: [
    {
      nombre: 'Monitoreo y acompañamiento',
      items: [{ id: 'ge_1' }, { id: 'ge_2' }, { id: 'ge_3' }],
    },
    {
      nombre: 'Fortalecimiento docente',
      items: [{ id: 'ge_4' }, { id: 'ge_5' }],
    },
    {
      nombre: 'Evaluación y RE',
      items: [{ id: 'ge_6' }, { id: 'ge_7' }, { id: 'ge_8' }, { id: 'ge_9' }],
    },
    {
      nombre: 'Materiales',
      items: [
        { id: 'ge_10' }, { id: 'ge_11' }, { id: 'ge_12' },
        { id: 'ge_13' }, { id: 'ge_14' }, { id: 'ge_15' }, { id: 'ge_16' },
      ],
    },
    {
      nombre: 'Otros aspectos',
      items: [
        { id: 'ge_17' }, { id: 'ge_18' }, { id: 'ge_19' },
        { id: 'ge_20' }, { id: 'ge_21' }, { id: 'ge_22' }, { id: 'ge_23' },
      ],
    },
  ],
};

/** FichaType Materiales CEBE con SI_NO_NA */
const FT_MAT = {
  id: 'ft_materiales_cebe',
  nombre: 'Materiales CEBE (test)',
  tipoRespuesta: 'si_no',
  regla_nivel: REGLA_NIVEL_GENERICA,
  secciones: [
    {
      nombre: 'Recepción',
      items: [{ id: 'm_1' }, { id: 'm_2' }, { id: 'm_3' }],
    },
    {
      nombre: 'Distribución',
      items: [{ id: 'm_4' }, { id: 'm_5' }],
    },
    {
      nombre: 'Uso pedagógico',
      items: [{ id: 'm_6' }, { id: 'm_7' }, { id: 'm_8' }, { id: 'm_9' }],
    },
    {
      nombre: 'Seguimiento',
      items: [{ id: 'm_10' }, { id: 'm_11' }],
    },
    {
      nombre: 'Conservación y control',
      items: [{ id: 'm_12' }, { id: 'm_13' }, { id: 'm_14' }],
    },
  ],
};

/* ─── Helpers ─────────────────────────────────────────────────────────── */

/** Construye un array de respuestas a partir de un mapa {id: valor} */
function resp(mapa) {
  return Object.entries(mapa).map(([id, valor]) => ({ id, valor }));
}

/* ═══════════════════════════════════════════════════════════════════════
   SUITE 1 — puntajeItem: valores individuales
   ═══════════════════════════════════════════════════════════════════════ */
suite('puntajeItem — escala SI_NO_NA', () => {
  assertEqual(puntajeItem('SI_NO_NA', 'si'),  1,    'si → 1');
  assertEqual(puntajeItem('SI_NO_NA', 'no'),  0,    'no → 0');
  assertEqual(puntajeItem('SI_NO_NA', 'na'),  null, 'na → null (excluido)');
  assertEqual(puntajeItem('SI_NO_NA', ''),    null, 'vacío → null');
  assertEqual(puntajeItem('SI_NO_NA', null),  null, 'null → null');
  assertEqual(puntajeItem('SI_NO_NA', undefined), null, 'undefined → null');
});

suite('puntajeItem — escala IPL con compatibilidad', () => {
  assertEqual(puntajeItem('IPL', 'logrado'), 1,    'logrado → 1');
  assertEqual(puntajeItem('IPL', 'proceso'), 0.5,  'proceso → 0.5');
  assertEqual(puntajeItem('IPL', 'inicio'),  0,    'inicio → 0');
  assertEqual(puntajeItem('IPL', 'na'),      null, 'na → null');
  // Compatibilidad hacia atrás (fichas EBR guardadas con si/no)
  assertEqual(puntajeItem('IPL', 'si'), 1, 'si → 1 (compat. legacy → Logrado)');
  assertEqual(puntajeItem('IPL', 'no'), 0, 'no → 0 (compat. legacy → Inicio)');
});

suite('puntajeItem — escala NIVEL_1_4', () => {
  assertEqual(puntajeItem('NIVEL_1_4', '1'), 0.25, 'nivel I → 0.25');
  assertEqual(puntajeItem('NIVEL_1_4', '2'), 0.5,  'nivel II → 0.5');
  assertEqual(puntajeItem('NIVEL_1_4', '3'), 0.75, 'nivel III → 0.75');
  assertEqual(puntajeItem('NIVEL_1_4', '4'), 1,    'nivel IV → 1.0');
  assertEqual(puntajeItem('NIVEL_1_4', 'na'), null, 'na → null');
});

suite('puntajeItem — escala ESCALA_1_3', () => {
  assert(Math.abs(puntajeItem('ESCALA_1_3', '1') - 1/3) < 0.01, '1 ≈ 0.33');
  assert(Math.abs(puntajeItem('ESCALA_1_3', '2') - 2/3) < 0.01, '2 ≈ 0.67');
  assertEqual(puntajeItem('ESCALA_1_3', '3'), 1, '3 → 1.0');
});

/* ═══════════════════════════════════════════════════════════════════════
   SUITE 2 — estadoPorRegla
   ═══════════════════════════════════════════════════════════════════════ */
suite('estadoPorRegla — regla conteo (JEC)', () => {
  // Casos límite del Anexo B.1
  assertEqual(estadoPorRegla({ pct: 84, conteo_si: 26 }, REGLA_NIVEL_JEC).estado_panel, 'Logrado',    'conteo 26 → Logrado');
  assertEqual(estadoPorRegla({ pct: 77, conteo_si: 24 }, REGLA_NIVEL_JEC).estado_panel, 'Logrado',    'conteo 24 (límite) → Logrado');
  assertEqual(estadoPorRegla({ pct: 74, conteo_si: 23 }, REGLA_NIVEL_JEC).estado_panel, 'En proceso', 'conteo 23 (límite) → En proceso');
  assertEqual(estadoPorRegla({ pct: 39, conteo_si: 12 }, REGLA_NIVEL_JEC).estado_panel, 'En proceso', 'conteo 12 → En proceso');
  assertEqual(estadoPorRegla({ pct: 35, conteo_si: 11 }, REGLA_NIVEL_JEC).estado_panel, 'Inicio',     'conteo 11 (límite) → Inicio');
  assertEqual(estadoPorRegla({ pct: 0,  conteo_si: 0  }, REGLA_NIVEL_JEC).estado_panel, 'Inicio',     'conteo 0 → Inicio');
  // El caso crítico: 24 Sí = 77% pero con regla genérica sería "En proceso" → debe ser "Logrado"
  assertEqual(estadoPorRegla({ pct: 77, conteo_si: 24 }, REGLA_NIVEL_JEC).nivel, 'Implementación lograda', '24 Sí → nivel "Implementación lograda"');
});

suite('estadoPorRegla — regla porcentaje (genérica)', () => {
  assertEqual(estadoPorRegla({ pct: 100, conteo_si: 0 }, REGLA_NIVEL_GENERICA).estado_panel, 'Logrado',     '100% → Logrado');
  assertEqual(estadoPorRegla({ pct: 85,  conteo_si: 0 }, REGLA_NIVEL_GENERICA).estado_panel, 'Logrado',     '85% → Logrado');
  assertEqual(estadoPorRegla({ pct: 84,  conteo_si: 0 }, REGLA_NIVEL_GENERICA).estado_panel, 'En proceso',  '84% → En proceso');
  assertEqual(estadoPorRegla({ pct: 70,  conteo_si: 0 }, REGLA_NIVEL_GENERICA).estado_panel, 'En proceso',  '70% → En proceso');
  assertEqual(estadoPorRegla({ pct: 69,  conteo_si: 0 }, REGLA_NIVEL_GENERICA).estado_panel, 'Inicio',      '69% → Inicio (Por mejorar)');
  assertEqual(estadoPorRegla({ pct: null, conteo_si: 0 }, REGLA_NIVEL_GENERICA).estado_panel, 'Sin datos', 'pct null → Sin datos');
});

suite('estadoPorRegla — sin regla (umbrales genéricos por defecto)', () => {
  assertEqual(estadoPorRegla({ pct: 90, conteo_si: 0 }, null).estado_panel, 'Logrado',    '90% sin regla → Logrado');
  assertEqual(estadoPorRegla({ pct: 70, conteo_si: 0 }, null).estado_panel, 'En proceso', '70% sin regla → En proceso');
  assertEqual(estadoPorRegla({ pct: 60, conteo_si: 0 }, null).estado_panel, 'Inicio',     '60% sin regla → Por mejorar');
  // Caso crítico: con regla genérica 77% sería "En proceso" — confirmar que sin regla sigue igual
  assertEqual(estadoPorRegla({ pct: 77, conteo_si: 24 }, null).estado_panel, 'En proceso',
    '77% sin regla_nivel → "En proceso" (bug que la regla JEC corrige)');
});

/* ═══════════════════════════════════════════════════════════════════════
   SUITE 3 — B.1: JEC con regla de conteo oficial
   26 Sí → "Implementación lograda" → panel "Logrado"
   ═══════════════════════════════════════════════════════════════════════ */
suite('Anexo B.1 — JEC: 26 Sí → Implementación lograda', () => {
  // Aspecto 01: ítems 1,2,3,5,6,7,8,9 = Sí; ítem 4 = No → 8 Sí
  // Aspecto 02: ítems 10-18 y 20 = Sí; ítem 19 = No → 10 Sí
  // Aspecto 03: ítems 21,23,24,25,26,28,30,31 = Sí; ítems 22,27,29 = No → 8 Sí
  // Total esperado: 26 Sí
  const respuestas = resp({
    jec_1: 'si', jec_2: 'si', jec_3: 'si', jec_4: 'no',
    jec_5: 'si', jec_6: 'si', jec_7: 'si', jec_8: 'si', jec_9: 'si',
    jec_10: 'si', jec_11: 'si', jec_12: 'si', jec_13: 'si', jec_14: 'si',
    jec_15: 'si', jec_16: 'si', jec_17: 'si', jec_18: 'si', jec_19: 'no', jec_20: 'si',
    jec_21: 'si', jec_22: 'no', jec_23: 'si', jec_24: 'si', jec_25: 'si',
    jec_26: 'si', jec_27: 'no', jec_28: 'si', jec_29: 'no', jec_30: 'si', jec_31: 'si',
  });

  const result = calcScore(respuestas, FT_JEC);

  assertEqual(result.conteo_si, 26, 'Total Sí = 26');
  assertEqual(result.estado.estado_panel, 'Logrado', 'Estado panel = Logrado');
  assertEqual(result.estado.nivel, 'Implementación lograda', 'Nivel = Implementación lograda');
  assertEqual(result.secciones[0].conteo_si, 8,  'Aspecto 01: 8 Sí');
  assertEqual(result.secciones[1].conteo_si, 10, 'Aspecto 02: 10 Sí');
  assertEqual(result.secciones[2].conteo_si, 8,  'Aspecto 03: 8 Sí');
});

suite('Anexo B.1 — JEC: casos límite', () => {
  function jecConSi(n) {
    const rs = [];
    const ids = [
      'jec_1','jec_2','jec_3','jec_4','jec_5','jec_6','jec_7','jec_8','jec_9',
      'jec_10','jec_11','jec_12','jec_13','jec_14','jec_15','jec_16','jec_17','jec_18','jec_19','jec_20',
      'jec_21','jec_22','jec_23','jec_24','jec_25','jec_26','jec_27','jec_28','jec_29','jec_30','jec_31',
    ];
    for (let i = 0; i < ids.length; i++) {
      rs.push({ id: ids[i], valor: i < n ? 'si' : 'no' });
    }
    return rs;
  }
  assertEqual(calcScore(jecConSi(31), FT_JEC).estado.estado_panel, 'Logrado',    '31 Sí → Logrado');
  assertEqual(calcScore(jecConSi(24), FT_JEC).estado.estado_panel, 'Logrado',    '24 Sí → Logrado (límite inferior)');
  assertEqual(calcScore(jecConSi(23), FT_JEC).estado.estado_panel, 'En proceso', '23 Sí → En proceso (límite superior)');
  assertEqual(calcScore(jecConSi(12), FT_JEC).estado.estado_panel, 'En proceso', '12 Sí → En proceso (límite inferior)');
  assertEqual(calcScore(jecConSi(11), FT_JEC).estado.estado_panel, 'Inicio',     '11 Sí → Inicio (límite superior)');
  assertEqual(calcScore(jecConSi(0),  FT_JEC).estado.estado_panel, 'Inicio',     '0 Sí → Inicio');
});

/* ═══════════════════════════════════════════════════════════════════════
   SUITE 4 — B.4: EBR 2do momento con escala IPL y "No corresponde"
   ═══════════════════════════════════════════════════════════════════════ */
suite('Anexo B.4 — EBR IPL con No corresponde (ítem 16 = nc/na)', () => {
  // 23 ítems; ítem 16 = No corresponde; ítems 2 y 15 = Proceso; el resto = Logrado
  // Ítems aplicables: 22; Logrado: 20; Proceso: 2
  // pct = round((20*1 + 2*0.5) / 22 * 100) = round(21/22 * 100) = round(95.45) = 95%
  // Estado: 95% → Logrado (≥ 85%)
  const itemIds = [
    'ge_1','ge_2','ge_3','ge_4','ge_5','ge_6','ge_7','ge_8','ge_9',
    'ge_10','ge_11','ge_12','ge_13','ge_14','ge_15','ge_16','ge_17','ge_18','ge_19',
    'ge_20','ge_21','ge_22','ge_23',
  ];

  const valoresBase = {};
  for (const id of itemIds) valoresBase[id] = 'logrado';
  // Ítems en Proceso
  valoresBase['ge_2']  = 'proceso';
  valoresBase['ge_15'] = 'proceso';
  // Ítem 16 = No corresponde (excluido)
  valoresBase['ge_16'] = 'nc';

  const result = calcScore(resp(valoresBase), {
    ...FT_EBR,
    secciones: [
      { nombre: 'Todos los ítems', items: itemIds.map(id => ({ id })) },
    ],
  });

  // 22 ítems aplicables: 20 Logrado (×1) + 2 Proceso (×0.5) = 21/22 ≈ 95%
  assertEqual(result.pct, 95, 'pct = 95% (ge_16 excluido del denominador)');
  assertEqual(result.estado.estado_panel, 'Logrado', 'Estado = Logrado (≥ 85%)');
  assert(result.secciones[0].answered === 22, 'answered = 22 (ge_16 excluido)');
});

suite('B.4 — EBR legacy: fichas guardadas con si/no deben calcular (no "Sin datos")', () => {
  // Simula fichas EBR guardadas con el formulario genérico (bug Brecha 3)
  const respLegacy = [
    { id: 'ge_1', valor: 'si' },
    { id: 'ge_2', valor: 'no' },
    { id: 'ge_3', valor: 'si' },
    { id: 'ge_4', valor: 'si' },
    { id: 'ge_5', valor: 'si' },
  ];
  const result = calcScore(respLegacy, {
    ...FT_EBR,
    secciones: [
      { nombre: 'Test', items: respLegacy.map(r => ({ id: r.id })) },
    ],
  });
  assert(result.pct !== null, 'pct no es null (fichas legacy sí calculan)');
  assert(result.estado.estado_panel !== 'Sin datos', 'No aparece "Sin datos" con valores legacy');
});

/* ═══════════════════════════════════════════════════════════════════════
   SUITE 5 — B.5: Materiales CEBE con N/A e ítem sin responder
   ═══════════════════════════════════════════════════════════════════════ */
suite('Anexo B.5 — Materiales CEBE: N/A excluye del denominador', () => {
  // m_2, m_3, m_5, m_9 = na; m_8 sin responder; el resto = si
  // Ítems aplicables (respondidos con si/no): m_1, m_4, m_6, m_7, m_10, m_11, m_12, m_13, m_14 = 9 Sí
  // Nota: m_8 sin responder → no cuenta → denominador = 9
  const valMat = {
    m_1: 'si', m_2: 'na', m_3: 'na', m_4: 'si', m_5: 'na',
    m_6: 'si', m_7: 'si',            m_9: 'na',
    m_10: 'si', m_11: 'si', m_12: 'si', m_13: 'si', m_14: 'si',
    // m_8 NO aparece en el mapa (sin respuesta)
  };

  const result = calcScore(resp(valMat), FT_MAT);

  // 9 Sí sobre 9 respondidos no-NA → pct = 100%
  assertEqual(result.pct, 100, 'pct = 100% (9 Sí / 9 respondidos)');
  assert(result.estado.estado_panel !== 'Sin datos', 'No es Sin datos');

  // Con m_8 respondido como 'no':
  const valConM8 = { ...valMat, m_8: 'no' };
  const r2 = calcScore(resp(valConM8), FT_MAT);
  // 9 Sí + 1 No / 10 respondidos = 90%
  assertEqual(r2.pct, 90, 'Con m_8=no → 9/10 = 90%');
});

/* ═══════════════════════════════════════════════════════════════════════
   SUITE 6 — calcScore sin respuestas → Sin datos
   ═══════════════════════════════════════════════════════════════════════ */
suite('calcScore — casos borde', () => {
  assertEqual(calcScore([], FT_JEC).pct, null, 'Sin respuestas → pct null');
  assertEqual(calcScore([], FT_JEC).estado.estado_panel, 'Sin datos', 'Sin respuestas → Sin datos');
  assertEqual(calcScore(null, FT_JEC).pct, null, 'respuestas=null → pct null');
  assertEqual(calcScore([{ id: 'jec_1', valor: 'na' }], FT_JEC).pct, null, 'Todas NA → pct null');
  assertEqual(calcScore([{ id: 'jec_1', valor: 'na' }], FT_JEC).estado.estado_panel, 'Sin datos', 'Todas NA → Sin datos');
});

/* ═══════════════════════════════════════════════════════════════════════
   RESUMEN FINAL
   ═══════════════════════════════════════════════════════════════════════ */
console.log('\n' + '═'.repeat(55));
console.log(`  Resultado: ${passed} ✅ pasaron · ${failed} ❌ fallaron`);
console.log('═'.repeat(55));

if (failed > 0) {
  console.error('\n⛔  Suite fallida. Corrige los errores antes de continuar.\n');
  process.exit(1);
} else {
  console.log('\n🎉  Todas las pruebas pasaron. Motor de cálculo validado.\n');
  process.exit(0);
}
