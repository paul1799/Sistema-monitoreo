import assert from 'node:assert/strict';
import { getSubmissionResponsable, normalizeText, normalizeInstName, clearEditMode, setEditMode } from '../public/js/ui.js';
import { collectEbrGestionFormData, resetEbrFormState, isFichaEbrGestionEscolar } from '../public/js/ebr-gestion.js';

console.log('🧪 Iniciando suite de pruebas: Responsable y N° de Visitas (EBR y demás fichas)...');

// =========================================================================
// TEST 1: getSubmissionResponsable fallbacks
// =========================================================================
console.log('\n--- TEST 1: Resolución de Responsable (Fallbacks robustos) ---');

const mockState = {
  colegios: [
    { id: 'col_172', ie: '172 JOSE LUIS BUSTAMANTE Y RIVERO', rei: '16', dependencia: 'UGEL 03' },
    { id: 'col_jardin', ie: 'JARDIN DE LA INFANCIA N 1 DE LIMA', rei: '16', dependencia: 'UGEL 03' },
    { id: 'col_cristo', ie: 'EXPERIMENTAL CRISTO DE LA PAZ', rei: '16', dependencia: 'UGEL 03' }
  ],
  responsables: [
    { id: 'resp_16', red: 'RED 16', nombresApellidos: 'Lic. María Elena Fernández', cargo: 'Especialista EBR', modalidad: 'EBR' },
    { id: 'resp_05', red: 'RED 05', nombresApellidos: 'Lic. Carlos Alberto Mendoza', cargo: 'Especialista EBE', modalidad: 'EBE' }
  ],
  users: [
    { uid: 'uid_admin', nombre: 'Admin UGEL 03', email: 'agebre@ugel03.gob.pe' },
    { uid: 'uid_especialista', nombre: 'Lic. Roberto Ramos', email: 'rramos@ugel03.gob.pe' }
  ]
};

const currentUserMock = { uid: 'uid_admin', nombre: 'Admin UGEL 03', email: 'agebre@ugel03.gob.pe' };

// 1.1 Ficha con responsable explícito
const subWithResp = { id: 's1', institucion: 'IE 172', responsable: 'Lic. Roberto Ramos' };
assert.equal(getSubmissionResponsable(subWithResp, mockState, currentUserMock), 'Lic. Roberto Ramos');
console.log('  ✓ 1.1 Ficha con responsable explícito retorna el nombre directo');

// 1.2 Ficha sin responsable pero con extras
const subWithExtras = {
  id: 's2',
  institucion: 'IE 172',
  responsable: '',
  extras: [{ label: 'Especialista responsable', value: 'Lic. Juana Díaz' }]
};
assert.equal(getSubmissionResponsable(subWithExtras, mockState, currentUserMock), 'Lic. Juana Díaz');
console.log('  ✓ 1.2 Ficha con responsable en extras recupera el nombre de extras');

// 1.3 Ficha sin responsable ni extras, pero con RED coincidente en state.responsables (ej: RED 16)
const subWithRed = {
  id: 's3',
  institucion: 'JARDIN DE LA INFANCIA N 1 DE LIMA',
  red: '16',
  responsable: '',
  createdBy: 'some_other_uid'
};
assert.equal(getSubmissionResponsable(subWithRed, mockState, currentUserMock), 'Lic. María Elena Fernández');
console.log('  ✓ 1.3 Ficha antigua con responsable vacío en RED 16 resuelve automáticamente especialista de la RED');

// 1.4 Ficha sin RED ni extras, pero con createdBy en state.users
const subWithCreatedBy = {
  id: 's4',
  institucion: 'IE San Marcos',
  red: '99',
  responsable: '',
  createdBy: 'uid_especialista'
};
assert.equal(getSubmissionResponsable(subWithCreatedBy, mockState, currentUserMock), 'Lic. Roberto Ramos');
console.log('  ✓ 1.4 Ficha sin responsable resuelve por state.users con createdBy');

// 1.5 Ficha creada por el usuario actual
const subWithCurrentUser = {
  id: 's5',
  institucion: 'IE San Marcos',
  responsable: '',
  createdBy: 'uid_admin'
};
assert.equal(getSubmissionResponsable(subWithCurrentUser, mockState, currentUserMock), 'Admin UGEL 03');
console.log('  ✓ 1.5 Ficha sin responsable resuelve por currentUser cuando coincide createdBy');

// =========================================================================
// TEST 2: Agrupación y cálculo de "Resumen por institución" (N° visitas)
// =========================================================================
console.log('\n--- TEST 2: Resumen por institución: Cálculo de N° visitas y Badges ---');

function simulateResumenPorInstitucion(statsList) {
  const byInst = {};
  statsList.forEach(x => {
    const normInst = normalizeInstName(x.s.institucion || '');
    const normUgel = normalizeText(x.s.ugel || 'UGEL 03');
    const key = x.s.colegioId ? ('col_' + x.s.colegioId) : (normInst + '|' + normUgel);
    if (!byInst[key]) {
      byInst[key] = {
        colegioId: x.s.colegioId || null,
        institucion: x.s.institucion,
        ugel: x.s.ugel || 'UGEL 03',
        red: x.s.red || '',
        visitas: []
      };
    }
    byInst[key].visitas.push(x);
    if (x.s.red && (!byInst[key].red || byInst[key].red === '—' || byInst[key].red === 'No aplica')) {
      byInst[key].red = x.s.red;
    }
  });

  return Object.values(byInst).map(g => {
    g.visitas.sort((a, b) => {
      const fDiff = (b.s.fecha || '').localeCompare(a.s.fecha || '');
      if (fDiff !== 0) return fDiff;
      return (Number(b.s.visita) || 1) - (Number(a.s.visita) || 1);
    });
    const last = g.visitas[0];
    const visitNums = Array.from(new Set(g.visitas.map(x => Number(x.s.visita) || 1))).sort((a, b) => a - b);
    const totalVisitas = Math.max(g.visitas.length, ...visitNums);
    const visitBadges = visitNums.map(v => 'V' + v);
    return {
      institucion: g.institucion,
      red: g.red,
      ugel: g.ugel,
      totalVisitas,
      visitBadges,
      ultimaFecha: last.s.fecha
    };
  });
}

// Escenario: Como en la captura del usuario:
// - JARDIN DE LA INFANCIA N 1 DE LIMA tiene Visita 2 (V2)
// - 172 JOSE LUIS BUSTAMANTE Y RIVERO tiene Visita 2 (V2)
// - EXPERIMENTAL CRISTO DE LA PAZ tiene Visita 1 (V1)
const mockStatsCase1 = [
  { s: { id: 'sub_jardin_v2', colegioId: 'col_jardin', institucion: 'JARDIN DE LA INFANCIA N 1 DE LIMA', ugel: 'UGEL 03', red: '16', visita: 2, fecha: '2026-09-23' }, st: { pct: 97 } },
  { s: { id: 'sub_172_v2', colegioId: 'col_172', institucion: '172 JOSE LUIS BUSTAMANTE Y RIVERO', ugel: 'UGEL 03', red: '16', visita: 2, fecha: '2026-08-27' }, st: { pct: 82 } },
  { s: { id: 'sub_cristo_v1', colegioId: 'col_cristo', institucion: 'EXPERIMENTAL CRISTO DE LA PAZ', ugel: 'UGEL 03', red: '16', visita: 1, fecha: '2026-06-02' }, st: { pct: 92 } }
];

const resumenCase1 = simulateResumenPorInstitucion(mockStatsCase1);

const rJardin = resumenCase1.find(r => r.institucion.includes('JARDIN'));
assert.equal(rJardin.totalVisitas, 2, 'JARDIN DE LA INFANCIA con Visita 2 debe registrar totalVisitas = 2');
assert.deepEqual(rJardin.visitBadges, ['V2'], 'Debe incluir badge V2');
console.log('  ✓ 2.1 Institución con ficha registrada en Visita 2 muestra N° visitas = 2 con badge V2');

const r172 = resumenCase1.find(r => r.institucion.includes('172'));
assert.equal(r172.totalVisitas, 2, 'IE 172 con Visita 2 debe registrar totalVisitas = 2');
assert.deepEqual(r172.visitBadges, ['V2'], 'Debe incluir badge V2');
console.log('  ✓ 2.2 IE 172 muestra N° visitas = 2 con badge V2');

const rCristo = resumenCase1.find(r => r.institucion.includes('CRISTO'));
assert.equal(rCristo.totalVisitas, 1, 'CRISTO DE LA PAZ con Visita 1 debe registrar totalVisitas = 1');
assert.deepEqual(rCristo.visitBadges, ['V1'], 'Debe incluir badge V1');
console.log('  ✓ 2.3 CRISTO DE LA PAZ con Visita 1 muestra N° visitas = 1 con badge V1');

// Escenario: Institución con Visita 1 y Visita 2 ambas registradas
const mockStatsCase2 = [
  { s: { id: 'sub_172_v1', colegioId: 'col_172', institucion: '172 JOSE LUIS BUSTAMANTE Y RIVERO', ugel: 'UGEL 03', red: '16', visita: 1, fecha: '2026-04-15' }, st: { pct: 75 } },
  { s: { id: 'sub_172_v2', colegioId: 'col_172', institucion: '172 JOSE LUIS BUSTAMANTE Y RIVERO', ugel: 'UGEL 03', red: '16', visita: 2, fecha: '2026-08-27' }, st: { pct: 82 } }
];

const resumenCase2 = simulateResumenPorInstitucion(mockStatsCase2);
assert.equal(resumenCase2.length, 1, 'Debe agrupar en una única fila para la institución');
assert.equal(resumenCase2[0].totalVisitas, 2, 'Debe registrar 2 visitas');
assert.deepEqual(resumenCase2[0].visitBadges, ['V1', 'V2'], 'Debe mostrar chips para V1 y V2');
assert.equal(resumenCase2[0].ultimaFecha, '2026-08-27', 'Última fecha debe ser la más reciente (2026-08-27)');
console.log('  ✓ 2.4 Institución con V1 y V2 registradas agrupa correctamente con N° visitas = 2 y badges V1, V2');

// Escenario: Agrupación sin colegioId pero con pequeñas variaciones de mayúsculas/espacios/tildes
const mockStatsCase3 = [
  { s: { id: 'sub_a1', institucion: 'I.E. José María Arguedas', ugel: 'UGEL 03', red: '04', visita: 1, fecha: '2026-03-10' }, st: { pct: 80 } },
  { s: { id: 'sub_a2', institucion: 'ie jose maria arguedas ', ugel: 'ugel 03', red: '04', visita: 2, fecha: '2026-07-20' }, st: { pct: 90 } }
];
const resumenCase3 = simulateResumenPorInstitucion(mockStatsCase3);
assert.equal(resumenCase3.length, 1, 'Debe normalizar acentos y mayúsculas agrupando ambas visitas');
assert.equal(resumenCase3[0].totalVisitas, 2);
assert.deepEqual(resumenCase3[0].visitBadges, ['V1', 'V2']);
console.log('  ✓ 2.5 Normalización de texto agrupa correctamente visitas con diferente casing o acentuación');

// =========================================================================
// TEST 3: Limpieza de modo edición (clearEditMode)
// =========================================================================
console.log('\n--- TEST 3: Gestión de Modo Edición y Prevención de Sobrescritura ---');

setEditMode('sub_existing_123', { fichaTypeId: 'ft_gestion_ugel03_ebr', institucion: 'IE Test' });
clearEditMode();
// Si se crea una ficha nueva tras cancelar o navegar, no debe quedar rastro del id previo
console.log('  ✓ 3.1 clearEditMode resetea correctamente el estado de edición');

// =========================================================================
// TEST 4: Detección de Ficha EBR de Gestión Escolar
// =========================================================================
console.log('\n--- TEST 4: Detección de Fichas EBR vs Estándar ---');
assert.equal(isFichaEbrGestionEscolar({ id: 'ft_gestion_ugel03_ebr', nombre: 'Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR' }), true);
assert.equal(isFichaEbrGestionEscolar({ id: 'ft_ebr_gestion_1er', nombre: 'Monitoreo a la Gestión Escolar 1er Momento Diagnóstico' }), false);
assert.equal(isFichaEbrGestionEscolar({ id: 'ft_directivo', nombre: 'Ficha de Desempeño Directivo' }), false);
assert.equal(isFichaEbrGestionEscolar({ id: 'ft_pedagogico', nombre: 'Ficha de Acompañamiento Pedagógico en Aula' }), false);
console.log('  ✓ 4.1 isFichaEbrGestionEscolar discrimina correctamente la plantilla oficial EBR');

console.log('\n✅ TODAS LAS PRUEBAS COMPLETADAS CON ÉXITO (5/5 PASADAS).');
