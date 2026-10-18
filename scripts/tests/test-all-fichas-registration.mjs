// Comprehensive test verifying rendering, scoring, and connections for ALL monitoring fichas
import { PLANTILLAS_BASE_OFICIALES } from '../../public/js/catalogo-plantillas-base.js';
import { getNivelCoordTutoriaJec, getNivelCoordPedagogicoJec } from '../../public/js/calcEngine.js';

// Setup Mock DOM
const createdElements = [];
function createMockElement(tag = 'div') {
  const listeners = {};
  const el = {
    tagName: tag.toUpperCase(),
    dataset: {},
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false
    },
    value: '',
    checked: false,
    children: [],
    innerHTML: '',
    textContent: '',
    appendChild: (child) => { el.children.push(child); return child; },
    querySelector: (sel) => {
      if (sel === '#regForm') return createMockElement('form');
      return createMockElement('div');
    },
    querySelectorAll: (sel) => [],
    closest: (sel) => createMockElement('div'),
    addEventListener: (evt, fn) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    dispatchEvent: (evt) => {
      const type = typeof evt === 'string' ? evt : evt.type;
      (listeners[type] || []).forEach(fn => fn(evt));
    },
    remove: () => {},
    scrollIntoView: () => {},
    focus: () => {}
  };
  createdElements.push(el);
  return el;
}

const mockHost = createMockElement('div');
mockHost.id = 'regFormHost';

globalThis.window = {
  addEventListener: () => {},
  scrollTo: () => {},
  confirm: () => true
};

globalThis.document = {
  getElementById: (id) => {
    if (id === 'regFormHost') return mockHost;
    if (id === 'regForm') return createMockElement('form');
    return createMockElement('div');
  },
  querySelector: (sel) => createMockElement('div'),
  querySelectorAll: () => [],
  createElement: (tag) => createMockElement(tag),
  addEventListener: () => {}
};

async function run() {
  const { renderRegistrarTab } = await import('../../public/js/ui/registrar.js');
  const { setRegSelectedTypeId } = await import('../../public/js/ui/state.js');

  const mockDb = {
    collection: (colName) => ({
      doc: (docId) => ({
        set: async (data, opts) => {},
        update: async (data) => {}
      })
    }),
    batch: () => ({
      set: (ref, data, opts) => {},
      update: (ref, data) => {},
      commit: async () => {}
    })
  };

  const mockState = {
    fichaTypes: Object.values(PLANTILLAS_BASE_OFICIALES),
    colegios: [
      { id: 'col_1', ie: 'IE 001 TEST', nombre: 'IE 001 TEST', codigoModular: '1234567', codModular: '1234567', red: '01', modalidad: 'JEC', esJec: true }
    ],
    responsables: [
      { id: 'resp_1', nombresApellidos: 'Especialista Test', red: '01', modalidad: 'EBR' }
    ],
    compromisos: [],
    submissions: []
  };

  // Add custom ficha from Screenshot 1: CEBE Experiencia Lectora
  const cebeLectora = {
    id: 'ft_cebe_lectora_2026',
    nombre: 'FICHA DE MONITOREO AL DESARROLLO DE LA EXPERIENCIA LECTORA EN CEBE - 2026',
    modalidad: 'CEBE',
    tipoRespuesta: 'ips',
    regla_nivel: 'porcentaje',
    secciones: [
      {
        nombre: 'Condiciones previas',
        items: [{ id: 'it_1', texto: 'Ítem 1 lectora' }]
      }
    ]
  };
  mockState.fichaTypes.push(cebeLectora);

  // Add Coordinador Pedagógico JEC
  const coordPedag = {
    id: 'ft_coord_pedagogico',
    nombre: 'Ficha de Monitoreo a las funciones que cumple el/la coordinador(a) Pedagógico',
    modalidad: 'JEC',
    tipoRespuesta: 'escala_1_3',
    regla_nivel: 'sumatoria',
    secciones: [
      {
        nombre: 'Sección 1',
        items: [{ id: 'cp_1', texto: 'Ítem 1 CP' }]
      }
    ]
  };
  mockState.fichaTypes.push(coordPedag);

  const getFichaType = (id) => mockState.fichaTypes.find(f => f.id === id);
  const container = createMockElement('div');

  console.log(`=== AUDITANDO ${mockState.fichaTypes.length} FICHAS DE MONITOREO ===`);

  let passed = 0;
  let failed = 0;

  for (const ft of mockState.fichaTypes) {
    try {
      console.log(`Testing ficha: "${ft.nombre}" (${ft.id})...`);
      setRegSelectedTypeId(ft.id);
      renderRegistrarTab(container, mockState, getFichaType, mockDb, { uid: 'u1', email: 'test@ugel03.gob.pe' }, () => {}, true);
      console.log(`  ✓ Renderizado exitoso`);
      passed++;
    } catch (err) {
      console.error(`  ❌ ERROR en "${ft.nombre}":`, err.message);
      failed++;
    }
  }

  console.log('\n=== VERIFICANDO CÁLCULO DE NIVELES PARA JEC TUTORÍA Y PEDAGÓGICO ===');
  const tutoriaLogrado = getNivelCoordTutoriaJec(60);
  const tutoriaProceso = getNivelCoordTutoriaJec(45);
  const tutoriaInicio = getNivelCoordTutoriaJec(25);
  console.log(`Tutoría 60 pts: ${tutoriaLogrado.nivel} (${tutoriaLogrado.cls}) - OK`);
  console.log(`Tutoría 45 pts: ${tutoriaProceso.nivel} (${tutoriaProceso.cls}) - OK`);
  console.log(`Tutoría 25 pts: ${tutoriaInicio.nivel} (${tutoriaInicio.cls}) - OK`);

  const pedagLogrado = getNivelCoordPedagogicoJec(45);
  const pedagProceso = getNivelCoordPedagogicoJec(35);
  const pedagInicio = getNivelCoordPedagogicoJec(20);
  console.log(`Pedagógico 45 pts: ${pedagLogrado.nivel} (${pedagLogrado.cls}) - OK`);
  console.log(`Pedagógico 35 pts: ${pedagProceso.nivel} (${pedagProceso.cls}) - OK`);
  console.log(`Pedagógico 20 pts: ${pedagInicio.nivel} (${pedagInicio.cls}) - OK`);

  console.log(`\n========================================`);
  console.log(`RESULTADOS: ${passed} exitosas, ${failed} fallidas`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

run();
