/* =========================================================================
   prite-gestion.js — Módulo especializado para la Ficha:
   "Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar UGEL-03 
    para Programa de Intervención Temprana (PRITE)"
   UGEL 03 · AGEBRE
   RM N° 501-2025-MINEDU

   Estructura oficial del instrumento:
   - I. Datos Generales del PRITE (Cuadro de Personal, Acceso y Permanencia)
   - II. Datos de la Directora (Apellidos, Nombres, DNI, Teléfono, Condición, Correo)
   - III. Aspectos a Monitorear (32 ítems en 7 secciones con 3 visitas independientes: V1, V2, V3)
   - IV. Logros, Aspectos de Mejora y Recomendaciones (para cada visita V1, V2, V3)
   - V. Compromisos de Mejora (Directora y Especialista por cada visita)
   ========================================================================= */

import { esc, normalizeText, showToast, genId, fmtDate as formatDate, todayStr } from './ui.js?v=20261013_v6';
import { getDirectivosActivosForColegio, cleanTextCode, syncDirectivosFromFicha } from './directorio.js?v=20261013_v1';

/**
 * Detecta si una plantilla o submission corresponde a la Ficha de Gestión Escolar PRITE
 */
export function isFichaPriteGestion(ft) {
  if (!ft) return false;
  const id = String(ft.id || ft.fichaTypeId || '').toLowerCase();
  // Exclusiones estrictas
  if (id.includes('cebe') || id.includes('ceba') || id.includes('cetpro') || id.includes('ebr')) {
    // A menos que sea explícitamente prite
    if (!id.includes('prite')) return false;
  }
  if (id === 'ft_prite_gestion') return true;
  if (id.includes('prite') && (id.includes('gestion') || id.includes('asistencia') || id.includes('monitoreo'))) return true;

  const n = String(ft.nombre || ft.fichaTypeNombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (n.includes('cebe') && !n.includes('prite')) return false;
  if (n.includes('prite') && (n.includes('gestion') || n.includes('asistencia tecnica') || n.includes('monitoreo') || n.includes('multi-visita'))) return true;
  return false;
}

export const ESPECIALISTAS_PRITE_OFICIALES = [
  'María Angélica Zavala Querevalú',
  'Ana Rosario Valderrama Barrientos'
];

export function renderEspecialistasPriteOptions(selectedVal, state) {
  const normSel = normalizeText(selectedVal || '');
  const list = [
    { nombre: 'María Angélica Zavala Querevalú', desc: 'Especialista EBE / PRITE · REI 13' },
    { nombre: 'Ana Rosario Valderrama Barrientos', desc: 'Especialista EBE / PRITE · REI 15' }
  ];

  if (state && Array.isArray(state.responsables)) {
    state.responsables.forEach(r => {
      const nom = (r.nombresApellidos || r.especialista || '').trim();
      const mod = (r.modalidad || '').toUpperCase();
      if (nom && (mod === 'EBE' || mod === 'PRITE' || mod === 'AMBAS' || nom.toLowerCase().includes('zavala') || nom.toLowerCase().includes('valderrama'))) {
        if (!list.some(x => normalizeText(x.nombre) === normalizeText(nom))) {
          list.push({ nombre: nom, desc: `Especialista ${r.modalidad || 'EBE/PRITE'}${r.red ? ' · ' + r.red : ''}` });
        }
      }
    });
  }

  return list.map(item => {
    const isSel = normSel && (normalizeText(item.nombre) === normSel || normSel.includes(normalizeText(item.nombre)) || normalizeText(item.nombre).includes(normSel));
    return `<option value="${esc(item.nombre)}" ${isSel ? 'selected' : ''}>${esc(item.nombre)} (${esc(item.desc)})</option>`;
  }).join('');
}

/**
 * Los 32 ítems oficiales del instrumento PRITE distribuidos en sus 7 aspectos (RM N° 501-2025-MINEDU)
 */
export const PRITE_SECCIONES = [
  {
    num: '3.1',
    nombre: 'Gestión de la Planificación Institucional',
    items: [
      {
        id: 'gp_1',
        num: 1,
        texto: 'El PRITE cuenta con Documento Único de Gestión (DUG) vigente y aprobado.',
        evidencia: 'RD de aprobación'
      },
      {
        id: 'gp_2',
        num: 2,
        texto: 'El DUG incluye cronograma de monitoreo y acompañamiento a tutores.',
        evidencia: 'Cronograma'
      },
      {
        id: 'gp_3',
        num: 3,
        texto: 'El DUG contempla acciones de fortalecimiento de la práctica pedagógica de los tutores, en articulación con el enfoque de intervención temprana y el trabajo con familias.',
        evidencia: 'Cronograma, actas'
      }
    ]
  },
  {
    num: '3.2',
    nombre: 'Planificación Curricular',
    items: [
      {
        id: 'gp_4',
        num: 4,
        texto: 'La directora asesora la planificación de sesiones individuales.',
        evidencia: 'Cuaderno de campo'
      },
      {
        id: 'gp_5',
        num: 5,
        texto: 'La directora asesora la planificación de sesiones grupales.',
        evidencia: 'Cuaderno de campo'
      },
      {
        id: 'gp_6',
        num: 6,
        texto: 'Los tutores cuentan con sesiones individuales planificadas.',
        evidencia: 'Sesiones'
      },
      {
        id: 'gp_7',
        num: 7,
        texto: 'Los tutores cuentan con sesiones grupales planificadas.',
        evidencia: 'Sesiones'
      },
      {
        id: 'gp_8',
        num: 8,
        texto: 'Se generan espacios de planificación curricular colegiada.',
        evidencia: 'Horarios, actas'
      }
    ]
  },
  {
    num: '3.3',
    nombre: 'Monitoreo a la Práctica Pedagógica del Tutor',
    items: [
      {
        id: 'gp_9',
        num: 9,
        texto: 'La directora cuenta con un Plan de Monitoreo y Acompañamiento Pedagógico',
        evidencia: 'Plan de monitoreo aprobado.'
      },
      {
        id: 'gp_10',
        num: 10,
        texto: 'El Plan de Monitoreo incluye una matriz de identificación de necesidades formativas de los tutores, considerando el enfoque de intervención temprana y el trabajo con familias.',
        evidencia: 'Matriz diagnóstica de necesidades formativas.'
      },
      {
        id: 'gp_11',
        num: 11,
        texto: 'El Plan de Monitoreo cuenta con un cronograma socializado con el equipo de tutores.',
        evidencia: 'Cronograma y acta de socialización.'
      },
      {
        id: 'gp_12',
        num: 12,
        texto: 'La directora realiza acciones de monitoreo a la práctica pedagógica de los tutores.',
        evidencia: 'Fichas de monitoreo aplicadas'
      },
      {
        id: 'gp_13',
        num: 13,
        texto: 'La directora sistematiza los resultados del monitoreo realizado.',
        evidencia: 'Cuadros de sistematización, resúmenes o matrices de resultados.'
      },
      {
        id: 'gp_14',
        num: 14,
        texto: 'La directora socializa los resultados del monitoreo en espacios de gestión institucional.',
        evidencia: 'Actas de reuniones, presentaciones o informes internos.'
      }
    ]
  },
  {
    num: '3.4',
    nombre: 'Fortalecimiento a los Tutores',
    items: [
      {
        id: 'gp_15',
        num: 15,
        texto: 'La directora identifica necesidades formativas de los tutores a partir de los resultados del monitoreo pedagógico, en articulación con el enfoque de intervención temprana y el trabajo con familias.',
        evidencia: 'Análisis de resultados del monitoreo.'
      },
      {
        id: 'gp_16',
        num: 16,
        texto: 'La directora cuenta con un plan de acciones formativas',
        evidencia: 'Plan de acciones formativas y cronograma.'
      },
      {
        id: 'gp_17',
        num: 17,
        texto: 'La directora implementa espacios de fortalecimiento pedagógico acordes a las necesidades identificadas.',
        evidencia: 'Plan de fortalecimiento, registros de asistencia, actas y/o lista de asistencia de acción formativa desarrollada'
      }
    ]
  },
  {
    num: '3.5',
    nombre: 'Evaluación de los Aprendizajes',
    items: [
      {
        id: 'gp_18',
        num: 18,
        texto: 'La directora monitorea el proceso de evaluación psicopedagógica realizado por los tutores.',
        evidencia: 'Fichas de monitoreo, registros de acompañamiento, actas de retroalimentación.'
      },
      {
        id: 'gp_19',
        num: 19,
        texto: 'Los Informes Psicopedagógicos (IPP) se encuentran elaborados de manera oportuna.',
        evidencia: 'IPP revisados al azar con fecha de elaboración.'
      },
      {
        id: 'gp_20',
        num: 20,
        texto: 'Los Planes Educativos Personalizados (PEP) se encuentran elaborados a partir de los IPP.',
        evidencia: 'PEP revisados al azar y correspondencia con IPP.'
      },
      {
        id: 'gp_21',
        num: 21,
        texto: 'La tutora o el tutor elaboran informes de progreso al término de cada PEP',
        evidencia: 'Informes de progreso, formatos institucionales, rúbricas de seguimiento.'
      },
      {
        id: 'gp_22',
        num: 22,
        texto: 'La familia recibe explicación clara y orientaciones sobre el IPP, PEP y avances del niño/a, en coherencia con el enfoque de intervención temprana.',
        evidencia: 'Actas de entrevistas, registros de orientación familiar, compromisos'
      },
      {
        id: 'gp_23',
        num: 23,
        texto: 'El programa asegura la entrega oportuna de los informes de progreso a la familia.',
        evidencia: 'Cronograma de entrega, cargos firmados, registros de atención a familias.'
      },
      {
        id: 'gp_24',
        num: 24,
        texto: 'La tutora o el tutor registran los avances de las niñas y los niños a su cargo.',
        evidencia: 'Ficha de seguimiento individual. Cuaderno de campo. Notas reflexivas del tutor.'
      },
      {
        id: 'gp_25',
        num: 25,
        texto: 'La tutora o el tutor recopilan evidencias de aprendizaje (producciones y actuaciones) y las organiza en las carpetas individuales de las niñas y los niños.',
        evidencia: 'Carpeta individual del niño. Registro de actuaciones del niño/a. Fotografías'
      }
    ]
  },
  {
    num: '3.6',
    nombre: 'Plan Lector',
    items: [
      {
        id: 'gp_26',
        num: 26,
        texto: 'Cuenta con el Plan Lector como estrategia institucional orientada al acceso temprano a la lectura y a la comunicación, fortaleciendo la interacción, el vínculo afectivo y la mediación adulta, reconociendo a la familia como mediadora principal, en coherencia con las características y necesidades de las niñas y los niños del PRITE.',
        evidencia: 'Documento del Plan Lector'
      },
      {
        id: 'gp_27',
        num: 27,
        texto: 'El Plan Lector planifica la frecuencia de experiencias de lectura, considerando la atención educativa del PRITE y la participación activa de las familias en los diversos contextos donde se desenvuelven las niñas y los niños.',
        evidencia: 'Planificación semanal, horarios, sesiones, registros de aula.'
      },
      {
        id: 'gp_28',
        num: 28,
        texto: 'El Plan Lector involucra a diversos mediadores de lectura en el programa.',
        subPregunta: '¿Quiénes?',
        subOpciones: [
          { key: 'a', label: 'Tutor' },
          { key: 'b', label: 'Familia' },
          { key: 'c', label: 'Personal administrativo' },
          { key: 'd', label: 'Invitado de la comunidad' }
        ],
        evidencia: 'Listado de mediadores, actas, registros fotográficos, cronograma de participación.'
      },
      {
        id: 'gp_29',
        num: 29,
        texto: 'El Plan Lector promueve el uso de diversos espacios para el desarrollo de experiencias de lectura.',
        subPregunta: '¿Cuáles?',
        subOpciones: [
          { key: 'a', label: 'Biblioteca escolar' },
          { key: 'b', label: 'Aula' },
          { key: 'c', label: 'Espacios no convencionales (patio, jardín, pasillos, mercado, comunidad)' }
        ],
        evidencia: 'Planificaciones, registros fotográficos, cronogramas, fichas de experiencia.'
      },
      {
        id: 'gp_30',
        num: 30,
        texto: 'El Plan Lector promueve el uso de diversos materiales de lectura, elaborados (por docentes, familias, no docentes), adquiridos, de uso cotidiano del hogar y la comunidad.',
        subPregunta: '¿Cuáles?',
        subOpciones: [
          { key: 'a', label: 'Catálogos' },
          { key: 'b', label: 'Recetas' },
          { key: 'c', label: 'Libros sensoriales' },
          { key: 'd', label: 'Libros cartoneros' },
          { key: 'e', label: 'Otros' }
        ],
        evidencia: 'Inventario de materiales, muestras de recursos, registros de uso en aula.'
      }
    ]
  },
  {
    num: '3.7',
    nombre: 'Innovación Educativa',
    items: [
      {
        id: 'gp_31',
        num: 31,
        texto: 'La directora identifica y sistematiza Buenas Prácticas pedagógicas que responden a las necesidades de las niñas y los niños del PRITE y fortalecen la intervención temprana y el trabajo con familias.',
        evidencia: 'Fichas de Buenas Prácticas, informes de sistematización, registros fotográficos o audiovisuales.'
      },
      {
        id: 'gp_32',
        num: 32,
        texto: 'La directora realiza seguimiento a la implementación de las Buenas Prácticas y promueve su socialización a nivel institucional, comunitario o interinstitucional, como parte de la mejora continua del servicio.',
        evidencia: 'Ficha de seguimiento o acompañamiento. Acta de socialización institucional. Participación en REI.'
      }
    ]
  }
];

export const TOTAL_PRITE_ITEMS = 32;

/**
 * Estado en memoria del formulario PRITE
 */
let priteFormState = {
  visita: 1, // 1, 2 o 3
  institucion: '',
  codigoLocal: '',
  rei: '',
  responsable: '',
  colegioId: null,
  fechasVisitas: { v1: todayStr(), v2: '', v3: '' },
  nivelesAtiende: { inicial: true, primaria: false },
  personal: {},
  accesoEstudiantes: {},
  director: { nombres: '', dni: '', telefono: '', condicion: 'Encargada', correo: '' },
  respuestasPorVisita: { v1: {}, v2: {}, v3: {} },
  subOpcionesPorVisita: { v1: {}, v2: {}, v3: {} },
  evidenciasPorItem: {},
  sintesisPorVisita: {
    v1: { logros: '', mejoras: '', recomendaciones: '' },
    v2: { logros: '', mejoras: '', recomendaciones: '' },
    v3: { logros: '', mejoras: '', recomendaciones: '' }
  },
  compromisosPorVisita: {
    v1: { director: '', especialista: '', adicionales: [] },
    v2: { director: '', especialista: '', adicionales: [] },
    v3: { director: '', especialista: '', adicionales: [] }
  },
  observaciones: ''
};

export function resetPriteFormState() {
  priteFormState = {
    visita: 1,
    institucion: '',
    codigoLocal: '',
    rei: '',
    responsable: '',
    colegioId: null,
    fechasVisitas: { v1: todayStr(), v2: '', v3: '' },
    nivelesAtiende: { inicial: true, primaria: false },
    personal: {},
    accesoEstudiantes: {},
    director: { nombres: '', dni: '', telefono: '', condicion: 'Encargada', correo: '' },
    respuestasPorVisita: { v1: {}, v2: {}, v3: {} },
    subOpcionesPorVisita: { v1: {}, v2: {}, v3: {} },
    evidenciasPorItem: {},
    sintesisPorVisita: {
      v1: { logros: '', mejoras: '', recomendaciones: '' },
      v2: { logros: '', mejoras: '', recomendaciones: '' },
      v3: { logros: '', mejoras: '', recomendaciones: '' }
    },
    compromisosPorVisita: {
      v1: { director: '', especialista: '', adicionales: [] },
      v2: { director: '', especialista: '', adicionales: [] },
      v3: { director: '', especialista: '', adicionales: [] }
    },
    observaciones: ''
  };
}

/**
 * Precarga datos desde una ficha registrada previamente
 */
export function preloadPriteFormState(sub, ft) {
  resetPriteFormState();
  if (!sub) return;

  priteFormState.institucion = sub.institucion || sub.nombreIe || sub.ie || '';
  priteFormState.codigoLocal = sub.codigoLocal || sub.codLocal || '';
  priteFormState.rei = sub.rei || (sub.red ? String(sub.red).replace(/\D+/g, '') : '') || '';
  priteFormState.responsable = (sub.responsable && !String(sub.responsable).includes('@') && !/^\d+$/.test(String(sub.responsable).trim()))
    ? String(sub.responsable).trim()
    : '';
  priteFormState.colegioId = sub.colegioId || null;

  const vNum = Number(sub.visita) || 1;
  priteFormState.visita = (vNum >= 1 && vNum <= 3) ? vNum : 1;

  if (sub.fechasVisitas) {
    priteFormState.fechasVisitas = { ...priteFormState.fechasVisitas, ...sub.fechasVisitas };
  } else if (sub.fecha) {
    const k = `v${priteFormState.visita}`;
    priteFormState.fechasVisitas[k] = sub.fecha;
  }

  if (sub.nivelesAtiende) {
    priteFormState.nivelesAtiende = { ...sub.nivelesAtiende };
  } else if (sub.nivel) {
    const nLow = String(sub.nivel).toLowerCase();
    priteFormState.nivelesAtiende.inicial = nLow.includes('ini');
    priteFormState.nivelesAtiende.primaria = nLow.includes('pri');
  } else {
    priteFormState.nivelesAtiende = { inicial: true, primaria: false };
  }

  if (sub.tablasPersonal) {
    priteFormState.personal = sub.tablasPersonal.personal || {};
    priteFormState.accesoEstudiantes = sub.tablasPersonal.accesoEstudiantes || {};
  } else if (sub.personal || sub.accesoEstudiantes) {
    priteFormState.personal = sub.personal || {};
    priteFormState.accesoEstudiantes = sub.accesoEstudiantes || {};
  }

  if (sub.director) {
    priteFormState.director = {
      nombres: sub.director.nombre || sub.director.nombres || sub.directorNombre || '',
      dni: sub.director.dni || sub.directorDni || '',
      telefono: sub.director.telefono || '',
      condicion: sub.director.condicion || 'Encargada',
      correo: sub.director.correo || ''
    };
  } else {
    priteFormState.director = {
      nombres: sub.directorNombre || '',
      dni: sub.directorDni || '',
      telefono: sub.telefono || '',
      condicion: sub.condicion || 'Encargada',
      correo: sub.correo || ''
    };
  }

  // Respuestas de ítems
  if (sub.respuestasPorVisita) {
    priteFormState.respuestasPorVisita = { ...sub.respuestasPorVisita };
  }
  if (Array.isArray(sub.respuestas)) {
    const kActiva = `v${priteFormState.visita}`;
    if (!priteFormState.respuestasPorVisita[kActiva]) priteFormState.respuestasPorVisita[kActiva] = {};
    sub.respuestas.forEach((r, idx) => {
      if (!r) return;
      let targetId = r.id;
      if (!targetId || (!targetId.startsWith('gp_') && !targetId.startsWith('prite_'))) {
        const num = r.num || (idx + 1);
        targetId = `gp_${num}`;
      } else if (targetId.startsWith('prite_')) {
        const num = targetId.replace('prite_', '');
        targetId = `gp_${num}`;
      }
      if (r.valor) {
        priteFormState.respuestasPorVisita[kActiva][targetId] = String(r.valor).toLowerCase();
      }
      if (r.evidencia || r.hallazgo) {
        priteFormState.evidenciasPorItem[targetId] = r.evidencia || r.hallazgo;
      }
    });
  }

  // Subopciones seleccionadas (ítems 28, 29, 30)
  if (sub.subOpcionesPorVisita) {
    priteFormState.subOpcionesPorVisita = { ...sub.subOpcionesPorVisita };
  }

  // Síntesis IV
  if (sub.sintesisPorVisita) {
    priteFormState.sintesisPorVisita = { ...sub.sintesisPorVisita };
  } else if (Array.isArray(sub.sintesis)) {
    const kActiva = `v${priteFormState.visita}`;
    const sMap = priteFormState.sintesisPorVisita[kActiva] || { logros: '', mejoras: '', recomendaciones: '' };
    sub.sintesis.forEach(row => {
      const d = normalizeText(row.dimension || '');
      if (d.includes('logro')) sMap.logros = row.descripcion || row.logros || '';
      else if (d.includes('mejora')) sMap.mejoras = row.descripcion || row.dificultades || row.mejoras || '';
      else if (d.includes('recomend')) sMap.recomendaciones = row.descripcion || row.recomendaciones || '';
    });
    priteFormState.sintesisPorVisita[kActiva] = sMap;
  }
  const kAct = `v${priteFormState.visita}`;
  if (sub.logros && !priteFormState.sintesisPorVisita[kAct].logros) {
    priteFormState.sintesisPorVisita[kAct].logros = sub.logros;
  }
  if (sub.aspectos_mejora && !priteFormState.sintesisPorVisita[kAct].mejoras) {
    priteFormState.sintesisPorVisita[kAct].mejoras = sub.aspectos_mejora;
  }
  if (sub.recomendaciones && !priteFormState.sintesisPorVisita[kAct].recomendaciones) {
    priteFormState.sintesisPorVisita[kAct].recomendaciones = sub.recomendaciones;
  }

  // Compromisos V
  if (sub.compromisosPorVisita) {
    priteFormState.compromisosPorVisita = { ...sub.compromisosPorVisita };
  } else if (Array.isArray(sub.compromisos)) {
    const kActiva = `v${priteFormState.visita}`;
    const cMap = priteFormState.compromisosPorVisita[kActiva] || { director: '', especialista: '', adicionales: [] };
    sub.compromisos.forEach(c => {
      const rNorm = normalizeText(c.responsable || '');
      if (rNorm.includes('director') || rNorm.includes('coordinad')) cMap.director = c.texto || '';
      else if (rNorm.includes('especialista') || rNorm.includes('monitor')) cMap.especialista = c.texto || '';
      else cMap.adicionales.push(c);
    });
    priteFormState.compromisosPorVisita[kActiva] = cMap;
  }
  if (sub.compromiso_directivo && !priteFormState.compromisosPorVisita[kAct].director) {
    priteFormState.compromisosPorVisita[kAct].director = sub.compromiso_directivo;
  }
  if (sub.compromiso_especialista && !priteFormState.compromisosPorVisita[kAct].especialista) {
    priteFormState.compromisosPorVisita[kAct].especialista = sub.compromiso_especialista;
  }

  priteFormState.observaciones = sub.observaciones || '';
}

/**
 * Renderiza el formulario completo de PRITE
 */
export function renderPriteGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing = false) {
  if (!host) return;

  const vActiva = priteFormState.visita || 1;
  const kActiva = `v${vActiva}`;
  const respuestasActivas = priteFormState.respuestasPorVisita[kActiva] || {};
  const subOpcionesActivas = priteFormState.subOpcionesPorVisita[kActiva] || {};
  const sintesisActiva = priteFormState.sintesisPorVisita[kActiva] || { logros: '', mejoras: '', recomendaciones: '' };
  const compromisosActivos = priteFormState.compromisosPorVisita[kActiva] || { director: '', especialista: '', adicionales: [] };

  const submitLabel = isEditing ? 'Actualizar ficha PRITE' : 'Guardar ficha PRITE';

  // Filas oficiales del cuadro de personal PRITE (según RM N° 501-2025-MINEDU)
  const filasPersonal = [
    { id: 'directora', label: 'Directora' },
    { id: 'tutores_nom', label: 'Tutores nombrados' },
    { id: 'tutores_cont', label: 'Tutores contratados' },
    { id: 'prof_cas', label: 'Profesional CAS' },
    { id: 'personal_adm', label: 'Personal administrativo' }
  ];

  const personalData = priteFormState.personal || {};
  const accesoData = priteFormState.accesoEstudiantes || {};

  const htmlPersonalRows = filasPersonal.map(f => {
    const kTot = `${f.id}_tot`;
    const kAsis = `${f.id}_asis`;
    return `
      <tr>
        <td style="font-weight:600;font-size:12.5px;padding:8px 12px;background:#F8FAFC">${esc(f.label)}</td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp priteNumInp" id="pp_${kTot}" value="${esc(personalData[kTot] || '')}"></td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp priteNumInp" id="pp_${kAsis}" value="${esc(personalData[kAsis] || '')}"></td>
      </tr>
    `;
  }).join('');

  // Estudiantes
  const iniMat = Number(accesoData['ini_mat']) || 0;
  const iniAsis = Number(accesoData['ini_asis']) || 0;
  const iniNoAsis = accesoData['ini_noasis'] !== undefined ? accesoData['ini_noasis'] : '';

  // Aspectos a Monitorear
  const htmlSecciones = PRITE_SECCIONES.map((sec) => {
    const itemsHtml = sec.items.map(it => {
      const val = (respuestasActivas[it.id] || '').toLowerCase();
      const evidVal = priteFormState.evidenciasPorItem[it.id] || '';
      const selectedSubs = subOpcionesActivas[it.id] || [];

      let subOpcionesHtml = '';
      if (Array.isArray(it.subOpciones) && it.subOpciones.length > 0) {
        const chipsHtml = it.subOpciones.map(opt => {
          const isChecked = selectedSubs.includes(opt.key);
          return `
            <label class="priteSubChip ${isChecked ? 'active' : ''}" style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:14px;background:${isChecked ? '#EFF6FF' : '#F1F5F9'};border:1px solid ${isChecked ? '#3B82F6' : '#CBD5E1'};font-size:11.5px;color:${isChecked ? '#1E40AF' : '#475569'};cursor:pointer;user-select:none;margin-right:6px;margin-top:4px">
              <input type="checkbox" name="sub_${it.id}" value="${esc(opt.key)}" ${isChecked ? 'checked' : ''} style="accent-color:#1E40AF;cursor:pointer">
              <span><strong>${esc(opt.key)})</strong> ${esc(opt.label)}</span>
            </label>
          `;
        }).join('');

        subOpcionesHtml = `
          <div class="priteSubOpcionesWrap" style="margin-top:6px;margin-bottom:6px;padding:6px 10px;background:#FAFAFA;border-radius:6px;border:1px dashed #CBD5E1">
            <span style="font-size:11px;font-weight:700;color:#1E40AF;display:block;margin-bottom:2px">${esc(it.subPregunta || 'Opciones:')}</span>
            <div style="display:flex;flex-wrap:wrap;gap:4px">
              ${chipsHtml}
            </div>
          </div>
        `;
      }

      return `
        <div class="cebeItemRow priteItemRow" data-item-id="${it.id}">
          <div class="cebeItemMain">
            <span class="cebeItemNum">${it.num}.</span>
            <div class="cebeItemTextWrap">
              <div class="cebeItemText">${esc(it.texto)}</div>
              ${subOpcionesHtml}
              <div class="cebeItemEvidenciaWrap">
                <span class="cebeEvidLabel">📎 Evidencia:</span>
                <input type="text" class="cebeEvidInp" id="evid_${it.id}" placeholder="${esc(it.evidencia || 'Evidencia verificable...')}" value="${esc(evidVal)}">
              </div>
            </div>
          </div>
          <div class="cebeScaleGroup" role="radiogroup" aria-label="Calificación para ítem ${it.num}">
            <label class="cebeScaleBtn optInicio ${val === 'inicio' ? 'active' : ''}" title="Inicio (I)">
              <input type="radio" name="item_${it.id}" value="inicio" ${val === 'inicio' ? 'checked' : ''}>
              <span>I</span>
            </label>
            <label class="cebeScaleBtn optProceso ${val === 'proceso' ? 'active' : ''}" title="Proceso (P)">
              <input type="radio" name="item_${it.id}" value="proceso" ${val === 'proceso' ? 'checked' : ''}>
              <span>P</span>
            </label>
            <label class="cebeScaleBtn optLogrado ${val === 'logrado' ? 'active' : ''}" title="Logrado (L)">
              <input type="radio" name="item_${it.id}" value="logrado" ${val === 'logrado' ? 'checked' : ''}>
              <span>L</span>
            </label>
            <label class="cebeScaleBtn optNa ${val === 'na' || val === 'no_aplica' ? 'active' : ''}" title="No Aplica (N.A.)">
              <input type="radio" name="item_${it.id}" value="na" ${val === 'na' || val === 'no_aplica' ? 'checked' : ''}>
              <span>N.A.</span>
            </label>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="formSecCard" style="margin-bottom:18px">
        <div class="formSecHeader" style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:12px 18px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="formSecBadge" style="background:#1E40AF;color:#FFFFFF;font-weight:700;font-size:11px;padding:3px 8px;border-radius:4px">${sec.num}</span>
            <h4 class="formSecTitle" style="margin:0;font-size:14px;font-weight:700;color:var(--navy-900)">${esc(sec.nombre)}</h4>
          </div>
          <span style="font-size:12px;font-weight:600;color:var(--text-600)">${sec.items.length} ítems</span>
        </div>
        <div class="formSecBody" style="padding:14px 18px">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  host.innerHTML = `
    <form id="regForm" autocomplete="off" class="cebeFormContainer priteFormContainer">
      <!-- Banner de la Ficha PRITE -->
      <div class="panel" style="background:linear-gradient(135deg, #0B1B36 0%, #17366E 100%);color:#FFFFFF;border-radius:10px;padding:18px 22px;margin-bottom:18px;box-shadow:0 4px 14px rgba(11,27,54,0.12)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="background:rgba(224,165,38,0.2);color:#F6C343;border:1px solid #E0A526;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">Modalidad EBE · PRITE</span>
              <span style="background:rgba(255,255,255,0.15);font-size:11px;padding:2px 8px;border-radius:4px">RM N° 501-2025-MINEDU</span>
            </div>
            <h2 style="font-family:var(--serif);font-size:19px;margin:0 0 6px 0;line-height:1.3;color:#FFFFFF">
              Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar UGEL-03 para Programa de Intervención Temprana (PRITE)
            </h2>
            <p style="margin:0;font-size:12.5px;color:rgba(255,255,255,0.85);max-width:850px">
              Instrumento oficial para Programas de Intervención Temprana (PRITE) UGEL 03. Evalúa 32 indicadores en 7 aspectos clave a lo largo de 3 visitas independientes.
            </p>
          </div>
          <button type="button" class="btn secondary" id="btnCambiarFichaDesdePrite" style="background:rgba(255,255,255,0.12);border-color:rgba(255,255,255,0.3);color:#FFFFFF;font-size:12.5px;padding:6px 14px">
            ← Cambiar ficha
          </button>
        </div>
      </div>

      <!-- Selector de Visita (3 visitas oficiales independientes) -->
      <div class="panel" style="margin-bottom:18px;padding:16px 20px;border-radius:10px;border-left:4px solid #1E40AF">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px">
          <div>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#1E40AF;letter-spacing:0.05em">Etapa de acompañamiento</span>
            <h3 style="margin:2px 0 0;font-size:16px;color:var(--navy-900)">N.° de Visita de Monitoreo al PRITE</h3>
          </div>
          <div style="font-size:12.5px;color:var(--text-600)">
            Visita activa en edición: <strong style="color:#1E40AF">Visita ${vActiva}</strong>
          </div>
        </div>

        <div class="cebeVisitaTabsGrid">
          <div class="cebeVisitaTab ${vActiva === 1 ? 'active' : ''}" data-prite-visita="1">
            <div class="cebeVisitaTabHead">
              <span class="cebeVisitaBadge">Visita 1</span>
              <span class="cebeVisitaCheck">${vActiva === 1 ? '✓ Activa' : 'Ver / Editar'}</span>
            </div>
            <div class="cebeVisitaDesc">Primer momento · Diagnóstico y planificación institucional</div>
            <div class="cebeVisitaMeta">Fecha: <strong>${esc(priteFormState.fechasVisitas.v1 || 'Sin fecha')}</strong></div>
          </div>

          <div class="cebeVisitaTab ${vActiva === 2 ? 'active' : ''}" data-prite-visita="2">
            <div class="cebeVisitaTabHead">
              <span class="cebeVisitaBadge">Visita 2</span>
              <span class="cebeVisitaCheck">${vActiva === 2 ? '✓ Activa' : 'Ver / Editar'}</span>
            </div>
            <div class="cebeVisitaDesc">Segundo momento · Acompañamiento intermedio y seguimiento</div>
            <div class="cebeVisitaMeta">Fecha: <strong>${esc(priteFormState.fechasVisitas.v2 || 'Sin fecha')}</strong></div>
          </div>

          <div class="cebeVisitaTab ${vActiva === 3 ? 'active' : ''}" data-prite-visita="3">
            <div class="cebeVisitaTabHead">
              <span class="cebeVisitaBadge">Visita 3</span>
              <span class="cebeVisitaCheck">${vActiva === 3 ? '✓ Activa' : 'Ver / Editar'}</span>
            </div>
            <div class="cebeVisitaDesc">Tercer momento · Cierre del año lectivo y balance de logros</div>
            <div class="cebeVisitaMeta">Fecha: <strong>${esc(priteFormState.fechasVisitas.v3 || 'Sin fecha')}</strong></div>
          </div>
        </div>
      </div>

      <!-- I. DATOS GENERALES DEL PRITE -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle">I. DATOS GENERALES DEL PRITE</div>
        <div class="fieldGrid" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:16px">
          <div class="field" style="grid-column:span 2">
            <label for="f_institucion">Número y/o Nombre del PRITE *</label>
            <div class="ieSearchWrap" id="ieSearchWrap">
              <input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar PRITE por nombre o código local..." value="${esc(priteFormState.institucion || '')}" required>
              <div class="ieDropdown" id="ieDropdown"></div>
            </div>
            <span id="regColegioHint" style="${priteFormState.institucion ? 'display:block' : 'display:none'};font-size:11.5px;color:var(--primary-dark);margin-top:4px">${priteFormState.institucion ? `✓ PRITE: ${esc(priteFormState.institucion)}` : ''}</span>
          </div>

          <div class="field">
            <label for="prite_cod_local">Código de Local *</label>
            <input type="text" id="prite_cod_local" placeholder="Ej. 0915968" value="${esc(priteFormState.codigoLocal || '')}" required>
          </div>

          <div class="field">
            <label for="prite_ugel">UGEL *</label>
            <input type="text" id="prite_ugel" value="UGEL 03" readonly style="background:#F1F5F9">
          </div>

          <div class="field">
            <label for="prite_rei">REI *</label>
            <input type="text" id="prite_rei" placeholder="Ej. 01" value="${esc(priteFormState.rei || '')}" required>
          </div>

          <div class="field">
            <label for="prite_fecha_visita">Fecha de Visita ${vActiva} *</label>
            <input type="date" id="prite_fecha_visita" value="${esc(priteFormState.fechasVisitas[kActiva] || todayStr())}" required>
          </div>

          <div class="field" style="grid-column:span 2">
            <label for="prite_responsable">Especialista que ejecutó el monitoreo *</label>
            <select id="prite_responsable" class="respSelect" style="width:100%;height:42px;padding:8px 12px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:14px;background:#FFF;font-weight:600;color:var(--navy-900);cursor:pointer" required>
              <option value="">— Seleccionar Especialista —</option>
              ${renderEspecialistasPriteOptions(priteFormState.responsable, state)}
            </select>
            <span class="respHint" id="priteRespHint" style="font-size:11.5px;color:var(--primary-dark);margin-top:4px;display:block">
              ${priteFormState.responsable ? `✓ Especialista asignada: <strong>${esc(priteFormState.responsable)}</strong>` : 'Seleccione a la especialista de AGEBRE que realizó el monitoreo en esta visita.'}
            </span>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:16px">
          <label style="font-weight:700;font-size:12.5px;color:var(--navy-900);display:block;margin-bottom:6px">Niveles que atiende:</label>
          <div style="display:flex;gap:20px;align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="checkbox" id="prite_niv_inicial" ${priteFormState.nivelesAtiende.inicial ? 'checked' : ''}>
              <span>Inicial</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="checkbox" id="prite_niv_primaria" ${priteFormState.nivelesAtiende.primaria ? 'checked' : ''}>
              <span>Primaria</span>
            </label>
          </div>
        </div>

        <!-- Tabla Personal y Acceso en 2 columnas -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px">
          <div>
            <h4 style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0 0 8px">Cuadro 1: PERSONAL</h4>
            <div class="tblWrap" style="overflow-x:auto">
              <table class="cebeDataTable" style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="background:#F1F5F9">
                    <th style="text-align:left;padding:8px 10px;border:1px solid #CBD5E1">PERSONAL</th>
                    <th style="text-align:center;padding:8px;border:1px solid #CBD5E1;width:75px">TOTAL</th>
                    <th style="text-align:center;padding:8px;border:1px solid #CBD5E1;width:85px">ASISTENTES</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlPersonalRows}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0 0 8px">Cuadro 2: ACCESO Y PERMANENCIA DE ESTUDIANTES</h4>
            <div class="tblWrap" style="overflow-x:auto">
              <table class="cebeDataTable" style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="background:#F1F5F9">
                    <th style="text-align:left;padding:8px 10px;border:1px solid #CBD5E1">NIVEL</th>
                    <th style="text-align:center;padding:6px;border:1px solid #CBD5E1">MATRICULADOS</th>
                    <th style="text-align:center;padding:6px;border:1px solid #CBD5E1">ASISTEN AL SERVICIO</th>
                    <th style="text-align:center;padding:6px;border:1px solid #CBD5E1">NO ASISTEN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight:600;padding:6px 10px;background:#F8FAFC">Inicial</td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp priteNumInp" id="prite_est_ini_mat" value="${esc(accesoData['ini_mat'] || '')}"></td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp priteNumInp" id="prite_est_ini_asis" value="${esc(accesoData['ini_asis'] || '')}"></td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp priteNumInp" id="prite_est_ini_noasis" value="${esc(accesoData['ini_noasis'] || '')}"></td>
                  </tr>
                  <tr style="background:#F8FAFC;font-weight:700">
                    <td style="padding:6px 10px">TOTAL</td>
                    <td style="padding:6px;text-align:center;color:#1E40AF" id="prite_est_tot_mat">${iniMat}</td>
                    <td style="padding:6px;text-align:center;color:#1E40AF" id="prite_est_tot_asis">${iniAsis}</td>
                    <td style="padding:6px;text-align:center" id="prite_est_tot_noasis">${iniNoAsis !== '' ? iniNoAsis : '—'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div style="margin-top:8px">
              <label for="prite_est_notas" style="font-size:11.5px;color:var(--text-600);font-weight:600;display:block;margin-bottom:2px">Detalle o incidencias de permanencia / retiro:</label>
              <input type="text" id="prite_est_notas" class="cebeEvidInp" style="width:100%" placeholder="Ej. Antes 131, 5 retirados con documentos / 104 en 2da visita..." value="${esc(accesoData['notas'] || '')}">
            </div>
          </div>
        </div>
      </div>

      <!-- II. DATOS DE LA DIRECTORA -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle">II. DATOS DE LA DIRECTORA</div>
        <div class="fieldGrid" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px">
          <div class="field" style="grid-column:span 2">
            <label for="prite_dir_nombres">Apellidos y Nombres *</label>
            <input type="text" id="prite_dir_nombres" placeholder="Apellidos y nombres completos" value="${esc(priteFormState.director.nombres || '')}" required>
          </div>
          <div class="field">
            <label for="prite_dir_dni">DNI (8 dígitos) *</label>
            <input type="text" id="prite_dir_dni" maxlength="8" pattern="[0-9]{8}" placeholder="DNI" value="${esc(priteFormState.director.dni || '')}" required>
          </div>
          <div class="field">
            <label for="prite_dir_tel">Teléfono / Celular</label>
            <input type="tel" id="prite_dir_tel" placeholder="Teléfono" value="${esc(priteFormState.director.telefono || '')}">
          </div>
          <div class="field">
            <label for="prite_dir_cond">Condición *</label>
            <select id="prite_dir_cond">
              <option value="Encargada" ${priteFormState.director.condicion === 'Encargada' ? 'selected' : ''}>Encargada</option>
              <option value="Designada" ${priteFormState.director.condicion === 'Designada' ? 'selected' : ''}>Designada</option>
              <option value="Nombrada" ${priteFormState.director.condicion === 'Nombrada' ? 'selected' : ''}>Nombrada</option>
            </select>
          </div>
          <div class="field">
            <label for="prite_dir_correo">Correo Electrónico</label>
            <input type="email" id="prite_dir_correo" placeholder="correo@ugel03.edu.pe" value="${esc(priteFormState.director.correo || '')}">
          </div>
        </div>
      </div>

      <!-- III. ASPECTOS A MONITOREAR (32 ÍTEMS) -->
      <div class="panel" style="margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div>
            <div class="sectionHeaderTitle" style="margin-bottom:2px">III. ASPECTOS A MONITOREAR — VISITA ${vActiva}</div>
            <p style="margin:0;font-size:12px;color:var(--text-600);max-width:850px">
              Valore cada uno de los 32 indicadores en la escala: <strong>I</strong> (Inicio), <strong>P</strong> (Proceso), <strong>L</strong> (Logrado) o <strong>N.A.</strong> (No Aplica), y registre la evidencia verificable.
            </p>
          </div>
          <div id="priteProgressCounter" class="cebeProgressBadge">
            0 de 32 respondidos (0%)
          </div>
        </div>

        ${htmlSecciones}
      </div>

      <!-- IV. LOGROS, ASPECTOS DE MEJORA Y RECOMENDACIONES -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle">IV. LOGROS, ASPECTOS DE MEJORA Y RECOMENDACIONES</div>
        <p style="font-size:12px;color:var(--text-600);margin-top:0;margin-bottom:12px">
          Consigne una descripción breve para cada aspecto según la visita correspondiente (Visita 1, Visita 2, Visita 3).
        </p>

        <div class="tblWrap" style="overflow-x:auto">
          <table class="cebeDataTable" style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead>
              <tr style="background:#F1F5F9">
                <th style="width:22%;text-align:left;padding:10px;border:1px solid #CBD5E1">ASPECTO</th>
                <th style="width:26%;text-align:left;padding:10px;border:1px solid #CBD5E1;background:${vActiva === 1 ? '#EFF6FF' : '#F1F5F9'}">
                  DESCRIPCIÓN BREVE VISITA 1 ${vActiva === 1 ? '· (Activa)' : ''}
                </th>
                <th style="width:26%;text-align:left;padding:10px;border:1px solid #CBD5E1;background:${vActiva === 2 ? '#EFF6FF' : '#F1F5F9'}">
                  DESCRIPCIÓN BREVE VISITA 2 ${vActiva === 2 ? '· (Activa)' : ''}
                </th>
                <th style="width:26%;text-align:left;padding:10px;border:1px solid #CBD5E1;background:${vActiva === 3 ? '#EFF6FF' : '#F1F5F9'}">
                  DESCRIPCIÓN BREVE VISITA 3 ${vActiva === 3 ? '· (Activa)' : ''}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="font-weight:700;padding:10px;border:1px solid #CBD5E1;background:#F8FAFC">Logros relevantes observados</td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_logros_v1" class="cebeTextarea" placeholder="Logros observados en Visita 1...">${esc(priteFormState.sintesisPorVisita.v1.logros || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_logros_v2" class="cebeTextarea" placeholder="Logros observados en Visita 2...">${esc(priteFormState.sintesisPorVisita.v2.logros || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_logros_v3" class="cebeTextarea" placeholder="Logros observados en Visita 3...">${esc(priteFormState.sintesisPorVisita.v3.logros || '')}</textarea>
                </td>
              </tr>
              <tr>
                <td style="font-weight:700;padding:10px;border:1px solid #CBD5E1;background:#F8FAFC">Aspectos de mejora</td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_mejoras_v1" class="cebeTextarea" placeholder="Aspectos de mejora en Visita 1...">${esc(priteFormState.sintesisPorVisita.v1.mejoras || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_mejoras_v2" class="cebeTextarea" placeholder="Aspectos de mejora en Visita 2...">${esc(priteFormState.sintesisPorVisita.v2.mejoras || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_mejoras_v3" class="cebeTextarea" placeholder="Aspectos de mejora en Visita 3...">${esc(priteFormState.sintesisPorVisita.v3.mejoras || '')}</textarea>
                </td>
              </tr>
              <tr>
                <td style="font-weight:700;padding:10px;border:1px solid #CBD5E1;background:#F8FAFC">Recomendaciones</td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_rec_v1" class="cebeTextarea" placeholder="Recomendaciones de Visita 1...">${esc(priteFormState.sintesisPorVisita.v1.recomendaciones || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_rec_v2" class="cebeTextarea" placeholder="Recomendaciones de Visita 2...">${esc(priteFormState.sintesisPorVisita.v2.recomendaciones || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="prite_rec_v3" class="cebeTextarea" placeholder="Recomendaciones de Visita 3...">${esc(priteFormState.sintesisPorVisita.v3.recomendaciones || '')}</textarea>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- V. COMPROMISOS DE MEJORA -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle">V. COMPROMISOS DE MEJORA — VISITA ${vActiva}</div>
        <p style="font-size:12px;color:var(--text-600);margin-top:0;margin-bottom:14px">
          Acuerdos consensuados entre la Directora del PRITE y el/la Especialista de Monitoreo para la visita activa.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px">
          <div class="field" style="margin-bottom:0">
            <label for="prite_comp_director"><strong>DEL DIRECTIVO(A) DEL PRITE:</strong></label>
            <textarea id="prite_comp_director" class="cebeTextarea" style="min-height:90px" placeholder="Compromisos y acciones que asume la dirección escolar del PRITE...">${esc(compromisosActivos.director || '')}</textarea>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="prite_comp_especialista"><strong>DEL MONITOR / ESPECIALISTA AGEBRE:</strong></label>
            <textarea id="prite_comp_especialista" class="cebeTextarea" style="min-height:90px" placeholder="Acciones de soporte pedagógico, asistencia técnica y acompañamiento que asume el especialista...">${esc(compromisosActivos.especialista || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Observaciones generales -->
      <div class="panel" style="margin-bottom:24px">
        <div class="sectionHeaderTitle">OBSERVACIONES GENERALES</div>
        <textarea id="prite_observaciones" class="cebeTextarea" style="min-height:70px" placeholder="Observaciones o notas adicionales de la visita...">${esc(priteFormState.observaciones || '')}</textarea>
      </div>

      <!-- Barra inferior fija de avance y guardado -->
      <div class="formBottomBar">
        <div class="regProgressBadge" id="priteBottomBadge">
          Avance: <strong>0 de 32</strong> respondidos (0%) · Puntaje: 0 / 32 pts
        </div>
        <button type="button" class="btn secondary" id="btnCancelarPrite">Cancelar</button>
        <button type="submit" class="btn" id="btnGuardarPrite">${submitLabel}</button>
      </div>
    </form>
  `;

  // Vincular eventos interactivos del formulario PRITE
  bindPriteFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing);
}

/**
 * Vincula la lógica de eventos y cálculos en vivo para PRITE
 */
function bindPriteFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing) {
  const form = host.querySelector('#regForm');
  if (!form) return;

  // Cambiar ficha
  const btnCambiar = form.querySelector('#btnCambiarFichaDesdePrite');
  if (btnCambiar) {
    btnCambiar.addEventListener('click', () => {
      resetPriteFormState();
      window.location.hash = '#registrar';
      if (navigate) navigate('registrar');
    });
  }

  // Cancelar
  const btnCancel = form.querySelector('#btnCancelarPrite');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      resetPriteFormState();
      if (navigate) navigate('consolidado');
    });
  }

  // Cambio de pestañas de Visita (1, 2, 3)
  form.querySelectorAll('[data-prite-visita]').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetV = Number(tab.dataset.priteVisita) || 1;
      if (targetV === priteFormState.visita) return;

      // Guardar temporalmente valores de la visita saliente en memoria
      guardarMemoriaVisitaActual(form);

      priteFormState.visita = targetV;
      renderPriteGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
    });
  });

  // Autocompletado del PRITE
  const inpInst = form.querySelector('#f_institucion');
  const dropdown = form.querySelector('#ieDropdown');
  const hint = form.querySelector('#regColegioHint');
  const inpCodLocal = form.querySelector('#prite_cod_local');
  const inpRei = form.querySelector('#prite_rei');
  const inpDirNom = form.querySelector('#prite_dir_nombres');
  const inpDirDni = form.querySelector('#prite_dir_dni');
  const inpDirTel = form.querySelector('#prite_dir_tel');
  const inpDirCorreo = form.querySelector('#prite_dir_correo');
  const selDirCond = form.querySelector('#prite_dir_cond');

  if (inpInst && dropdown) {
    if (form.dataset.selectedColegioNombre) {
      inpInst.value = form.dataset.selectedColegioNombre;
    }

    inpInst.addEventListener('input', (e) => {
      const q = normalizeText(e.target.value.trim());
      if (q.length < 2) {
        dropdown.style.display = 'none';
        return;
      }

      const colegios = state.colegios || [];
      // Priorizar PRITE pero permitir buscar cualquiera
      const matches = colegios.filter(c => {
        const nom = normalizeText(c.ie || c.nombre || '');
        const mod = normalizeText(c.codigoModular || c.codModular || '');
        const loc = normalizeText(c.codigoLocal || c.codLocal || '');
        return nom.includes(q) || mod.includes(q) || loc.includes(q);
      }).slice(0, 10);

      if (!matches.length) {
        dropdown.innerHTML = '<div style="padding:8px 12px;font-size:12px;color:#64748B">No se encontraron instituciones</div>';
        dropdown.style.display = 'block';
        return;
      }

      dropdown.innerHTML = matches.map(c => {
        const isPrite = (c.ie || c.nombre || '').toUpperCase().includes('PRITE');
        const isCebe = (c.modalidad || '').toUpperCase().includes('EBE') || (c.ie || '').toUpperCase().includes('CEBE');
        return `
          <div class="ieDropdownItem" data-col-id="${esc(c.id)}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #F1F5F9">
            <div style="font-weight:700;font-size:12.5px;color:var(--navy-900)">
              ${esc(c.ie || c.nombre)} ${isPrite ? '<span style="background:#EFF6FF;color:#1E40AF;padding:1px 6px;border-radius:3px;font-size:10px">PRITE</span>' : (isCebe ? '<span style="background:#F0FDF4;color:#15803D;padding:1px 6px;border-radius:3px;font-size:10px">CEBE</span>' : '')}
            </div>
            <div style="font-size:11px;color:#64748B">
              Cód. Local: ${esc(c.codigoLocal || '—')} · REI: ${esc(c.rei || c.red || '—')} · Distrito: ${esc(c.distrito || '—')}
            </div>
          </div>
        `;
      }).join('');
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
        item.addEventListener('click', () => {
          const cid = item.dataset.colId;
          const selected = colegios.find(c => c.id === cid);
          if (selected) {
            form.dataset.selectedColegioId = selected.id;
            inpInst.value = selected.ie || selected.nombre;
            if (inpCodLocal) inpCodLocal.value = selected.codigoLocal || '';
            if (inpRei) inpRei.value = selected.rei || selected.red || '';

            if (selected.director) {
              if (inpDirNom && selected.director.nombre) inpDirNom.value = selected.director.nombre;
              if (inpDirDni && selected.director.dni) inpDirDni.value = selected.director.dni;
              if (inpDirTel && selected.director.telefono) inpDirTel.value = selected.director.telefono;
              if (inpDirCorreo && selected.director.correo) inpDirCorreo.value = selected.director.correo;
            }

            // Auto-asignar Especialista Responsable según REI del PRITE / CEBE
            const cRei = selected.rei || selected.red || '';
            const cReiNorm = normalizeText(cRei);
            let assignedName = '';
            if (cReiNorm.includes('13')) {
              assignedName = 'María Angélica Zavala Querevalú';
            } else if (cReiNorm.includes('15')) {
              assignedName = 'Ana Rosario Valderrama Barrientos';
            } else if (state.responsables && state.responsables.length) {
              const matchedResp = state.responsables.find(r => {
                const rMod = (r.modalidad || '').toUpperCase();
                if (rMod !== 'EBE' && rMod !== 'PRITE' && rMod !== 'AMBAS') return false;
                const rRedNorm = normalizeText(r.red || '');
                return rRedNorm && (rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm));
              });
              if (matchedResp) {
                assignedName = matchedResp.nombresApellidos || matchedResp.especialista || '';
              }
            }

            if (assignedName) {
              priteFormState.responsable = assignedName;
              const selResp = form.querySelector('#prite_responsable');
              if (selResp) selResp.value = assignedName;
              const rHint = form.querySelector('#priteRespHint');
              if (rHint) {
                rHint.innerHTML = `✓ Especialista asignada: <strong>${esc(assignedName)}</strong>`;
              }
            }

            if (hint) {
              hint.textContent = `✓ Seleccionado: ${selected.ie} (REI ${selected.rei || '—'})`;
              hint.style.display = 'block';
            }
          }
          dropdown.style.display = 'none';
        });
      });
    });

    document.addEventListener('click', (ev) => {
      if (!inpInst.contains(ev.target) && !dropdown.contains(ev.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  // Control de selección del Especialista
  const selResp = form.querySelector('#prite_responsable');
  if (selResp) {
    selResp.addEventListener('change', () => {
      priteFormState.responsable = selResp.value;
      const rHint = form.querySelector('#priteRespHint');
      if (rHint) {
        rHint.innerHTML = selResp.value
          ? `✓ Especialista asignada: <strong>${esc(selResp.value)}</strong>`
          : 'Seleccione a la especialista de AGEBRE que realizó el monitoreo en esta visita.';
      }
    });
  }

  // Fechas independientes por cada visita (V1, V2, V3)
  const inpFecha = form.querySelector('#prite_fecha_visita');
  if (inpFecha) {
    const onFechaChange = () => {
      const vNow = priteFormState.visita || 1;
      priteFormState.fechasVisitas[`v${vNow}`] = inpFecha.value;
    };
    inpFecha.addEventListener('change', onFechaChange);
    inpFecha.addEventListener('input', onFechaChange);
  }

  // Sumas automáticas de estudiantes (Cuadro 2)
  const calcEstudiantesTotales = () => {
    const iniMat = Number(form.querySelector('#prite_est_ini_mat')?.value) || 0;
    const iniAsis = Number(form.querySelector('#prite_est_ini_asis')?.value) || 0;
    const iniNoAsis = form.querySelector('#prite_est_ini_noasis')?.value || '';

    const elTotMat = form.querySelector('#prite_est_tot_mat');
    const elTotAsis = form.querySelector('#prite_est_tot_asis');
    const elTotNoAsis = form.querySelector('#prite_est_tot_noasis');
    if (elTotMat) elTotMat.textContent = iniMat;
    if (elTotAsis) elTotAsis.textContent = iniAsis;
    if (elTotNoAsis) elTotNoAsis.textContent = iniNoAsis !== '' ? iniNoAsis : '—';
  };

  ['#prite_est_ini_mat', '#prite_est_ini_asis', '#prite_est_ini_noasis'].forEach(sel => {
    const inp = form.querySelector(sel);
    if (inp) inp.addEventListener('input', calcEstudiantesTotales);
  });

  // Prevenir que la rueda del ratón modifique valores numéricos
  form.querySelectorAll('.priteNumInp').forEach(inp => {
    inp.addEventListener('wheel', e => e.preventDefault(), { passive: false });
  });

  // Subopciones interactivas (items 28, 29, 30)
  form.querySelectorAll('.priteSubChip input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', () => {
      const chip = chk.closest('.priteSubChip');
      if (chip) {
        if (chk.checked) {
          chip.classList.add('active');
          chip.style.background = '#EFF6FF';
          chip.style.borderColor = '#3B82F6';
          chip.style.color = '#1E40AF';
        } else {
          chip.classList.remove('active');
          chip.style.background = '#F1F5F9';
          chip.style.borderColor = '#CBD5E1';
          chip.style.color = '#475569';
        }
      }
    });
  });

  // Contador dinámico y puntaje
  const updatePriteProgress = () => {
    let answered = 0;
    let naCount = 0;
    let score = 0;
    form.querySelectorAll('.priteItemRow').forEach(row => {
      const chk = row.querySelector('input[type="radio"]:checked');
      row.querySelectorAll('.cebeScaleBtn').forEach(b => b.classList.remove('active'));
      if (chk) {
        answered++;
        chk.closest('.cebeScaleBtn')?.classList.add('active');
        if (chk.value === 'logrado') score += 1;
        else if (chk.value === 'proceso') score += 0.5;
        else if (chk.value === 'na' || chk.value === 'no_aplica') naCount++;
      }
    });

    const applicableItems = Math.max(0, TOTAL_PRITE_ITEMS - naCount);
    const pct = Math.round((answered / TOTAL_PRITE_ITEMS) * 100);
    const scorePct = applicableItems > 0 ? Math.round((score / applicableItems) * 100) : 0;

    let estado = 'Inicio';
    let estadoColor = '#DC2626';
    if (scorePct >= 85) { estado = 'Logrado'; estadoColor = '#16A34A'; }
    else if (scorePct >= 70) { estado = 'En proceso'; estadoColor = '#D97706'; }

    const counter = form.querySelector('#priteProgressCounter');
    if (counter) {
      const naText = naCount > 0 ? ` · <span style="color:#64748B;font-weight:600">${naCount} N.A.</span>` : '';
      counter.innerHTML = `<strong>${answered} de ${TOTAL_PRITE_ITEMS}</strong> respondidos (${pct}%)${naText} · <span style="color:${estadoColor};font-weight:700">${estado}</span>`;
    }

    const bBadge = form.querySelector('#priteBottomBadge');
    if (bBadge) {
      const naBadgeText = naCount > 0 ? ` (${naCount} N.A.)` : '';
      bBadge.innerHTML = `Avance: <strong>${answered} de ${TOTAL_PRITE_ITEMS}</strong> (${pct}%) · Puntaje: <strong>${score} / ${applicableItems}</strong> pts${naBadgeText} (${scorePct}%) · <span style="color:${estadoColor};font-weight:700">${estado}</span>`;
    }
  };

  form.querySelectorAll('input[type="radio"]').forEach(r => {
    r.addEventListener('change', updatePriteProgress);
  });
  updatePriteProgress();

  // Guardado en Firestore
  form.onsubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
    await guardarFormularioPrite(form, ft, state, dbNs, currentUser, navigate, isEditing);
  };
}

/**
 * Guarda en memoria local los datos de la visita actual al cambiar entre V1, V2 y V3
 */
function guardarMemoriaVisitaActual(form) {
  if (!form) return;
  const vActiva = priteFormState.visita || 1;
  const kActiva = `v${vActiva}`;

  // Institución, Código Local, REI
  const instVal = form.querySelector('#f_institucion')?.value.trim();
  if (instVal) priteFormState.institucion = instVal;
  const codVal = form.querySelector('#prite_cod_local')?.value.trim();
  if (codVal) priteFormState.codigoLocal = codVal;
  const reiVal = form.querySelector('#prite_rei')?.value.trim();
  if (reiVal) priteFormState.rei = reiVal;
  const respVal = form.querySelector('#prite_responsable')?.value.trim();
  if (respVal) priteFormState.responsable = respVal;
  if (form.dataset.selectedColegioId) {
    priteFormState.colegioId = form.dataset.selectedColegioId;
  }

  // Cuadros numéricos de Personal
  form.querySelectorAll('input[id^="pp_"]').forEach(inp => {
    const k = inp.id.replace('pp_', '');
    priteFormState.personal[k] = inp.value;
  });

  // Acceso y Permanencia
  priteFormState.accesoEstudiantes = {
    ini_mat: form.querySelector('#prite_est_ini_mat')?.value || '',
    ini_asis: form.querySelector('#prite_est_ini_asis')?.value || '',
    ini_noasis: form.querySelector('#prite_est_ini_noasis')?.value || '',
    notas: form.querySelector('#prite_est_notas')?.value.trim() || ''
  };

  // Fecha
  const inpFecha = form.querySelector('#prite_fecha_visita');
  if (inpFecha && inpFecha.value) {
    priteFormState.fechasVisitas[kActiva] = inpFecha.value;
  }

  // Niveles
  priteFormState.nivelesAtiende.inicial = Boolean(form.querySelector('#prite_niv_inicial')?.checked);
  priteFormState.nivelesAtiende.primaria = Boolean(form.querySelector('#prite_niv_primaria')?.checked);

  // Directora
  priteFormState.director.nombres = form.querySelector('#prite_dir_nombres')?.value.trim() || '';
  priteFormState.director.dni = form.querySelector('#prite_dir_dni')?.value.trim() || '';
  priteFormState.director.telefono = form.querySelector('#prite_dir_tel')?.value.trim() || '';
  priteFormState.director.condicion = form.querySelector('#prite_dir_cond')?.value || 'Encargada';
  priteFormState.director.correo = form.querySelector('#prite_dir_correo')?.value.trim() || '';

  // Respuestas y evidencias
  if (!priteFormState.respuestasPorVisita[kActiva]) priteFormState.respuestasPorVisita[kActiva] = {};
  if (!priteFormState.subOpcionesPorVisita[kActiva]) priteFormState.subOpcionesPorVisita[kActiva] = {};

  form.querySelectorAll('.priteItemRow').forEach(row => {
    const iid = row.dataset.itemId;
    const chk = row.querySelector('input[type="radio"]:checked');
    const evid = row.querySelector('.cebeEvidInp')?.value.trim() || '';
    if (chk) {
      priteFormState.respuestasPorVisita[kActiva][iid] = chk.value;
    }
    if (evid) {
      priteFormState.evidenciasPorItem[iid] = evid;
    }

    // Subopciones
    const checkedSubs = [];
    row.querySelectorAll('input[type="checkbox"][name^="sub_"]:checked').forEach(c => {
      checkedSubs.push(c.value);
    });
    if (checkedSubs.length > 0) {
      priteFormState.subOpcionesPorVisita[kActiva][iid] = checkedSubs;
    }
  });

  // Síntesis IV
  priteFormState.sintesisPorVisita.v1.logros = form.querySelector('#prite_logros_v1')?.value.trim() || '';
  priteFormState.sintesisPorVisita.v2.logros = form.querySelector('#prite_logros_v2')?.value.trim() || '';
  priteFormState.sintesisPorVisita.v3.logros = form.querySelector('#prite_logros_v3')?.value.trim() || '';

  priteFormState.sintesisPorVisita.v1.mejoras = form.querySelector('#prite_mejoras_v1')?.value.trim() || '';
  priteFormState.sintesisPorVisita.v2.mejoras = form.querySelector('#prite_mejoras_v2')?.value.trim() || '';
  priteFormState.sintesisPorVisita.v3.mejoras = form.querySelector('#prite_mejoras_v3')?.value.trim() || '';

  priteFormState.sintesisPorVisita.v1.recomendaciones = form.querySelector('#prite_rec_v1')?.value.trim() || '';
  priteFormState.sintesisPorVisita.v2.recomendaciones = form.querySelector('#prite_rec_v2')?.value.trim() || '';
  priteFormState.sintesisPorVisita.v3.recomendaciones = form.querySelector('#prite_rec_v3')?.value.trim() || '';

  // Compromisos V
  if (!priteFormState.compromisosPorVisita[kActiva]) {
    priteFormState.compromisosPorVisita[kActiva] = { director: '', especialista: '', adicionales: [] };
  }
  priteFormState.compromisosPorVisita[kActiva].director = form.querySelector('#prite_comp_director')?.value.trim() || '';
  priteFormState.compromisosPorVisita[kActiva].especialista = form.querySelector('#prite_comp_especialista')?.value.trim() || '';

  // Observaciones
  priteFormState.observaciones = form.querySelector('#prite_observaciones')?.value.trim() || '';
}

let isSavingPrite = false;

/**
 * Recolecta el payload completo y guarda en Firestore
 */
export async function guardarFormularioPrite(form, ft, state, dbNs, currentUser, navigate, isEditing = false) {
  if (isSavingPrite) {
    console.warn('guardarFormularioPrite: guardado en proceso, ignorando invocación duplicada.');
    return;
  }
  isSavingPrite = true;

  const btnSubmit = form.querySelector('#btnGuardarPrite');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando en base de datos...';
  }

  try {
    guardarMemoriaVisitaActual(form);

    const vActiva = priteFormState.visita || 1;
    const kActiva = `v${vActiva}`;
    const inpFecha = form.querySelector('#prite_fecha_visita');
    if (inpFecha && inpFecha.value) {
      priteFormState.fechasVisitas[kActiva] = inpFecha.value;
    }
    const fechaActiva = priteFormState.fechasVisitas[kActiva] || todayStr();

    const institucion = form.querySelector('#f_institucion')?.value.trim() || '';
    const codLocal = form.querySelector('#prite_cod_local')?.value.trim() || '';
    const ugel = form.querySelector('#prite_ugel')?.value.trim() || 'UGEL 03';
    const rei = form.querySelector('#prite_rei')?.value.trim() || '';

    if (!institucion) {
      showToast('Ingresa o selecciona el nombre del PRITE.');
      form.querySelector('#f_institucion')?.focus();
      return;
    }

    const respInputVal = form.querySelector('#prite_responsable')?.value.trim() || priteFormState.responsable || '';
    if (!respInputVal) {
      showToast('Por favor selecciona la especialista que ejecutó el monitoreo.');
      form.querySelector('#prite_responsable')?.focus();
      return;
    }
    let responsableName = respInputVal;

    // Recolectar cuadros numéricos
    const personal = {};
    form.querySelectorAll('input[id^="pp_"]').forEach(inp => {
      const k = inp.id.replace('pp_', '');
      personal[k] = inp.value;
    });

    const accesoEstudiantes = {
      ini_mat: form.querySelector('#prite_est_ini_mat')?.value || '',
      ini_asis: form.querySelector('#prite_est_ini_asis')?.value || '',
      ini_noasis: form.querySelector('#prite_est_ini_noasis')?.value || '',
      notas: form.querySelector('#prite_est_notas')?.value.trim() || ''
    };

    // Respuestas del formato estándar para compatibilidad con cálculos y reportes
    const respuestas = [];
    const respuestasMap = priteFormState.respuestasPorVisita[kActiva] || {};

    let answeredCount = 0;
    let naCount = 0;
    let scorePuntos = 0;

    PRITE_SECCIONES.forEach(sec => {
      sec.items.forEach(it => {
        const val = respuestasMap[it.id] || null;
        const evid = priteFormState.evidenciasPorItem[it.id] || '';
        const subs = priteFormState.subOpcionesPorVisita[kActiva]?.[it.id] || [];

        if (val) {
          answeredCount++;
          if (val === 'logrado') scorePuntos += 1;
          else if (val === 'proceso') scorePuntos += 0.5;
          else if (val === 'na' || val === 'no_aplica') naCount++;
        }
        respuestas.push({
          id: it.id,
          num: it.num,
          texto: it.texto,
          seccion: sec.nombre,
          valor: val,
          evidencia: evid,
          subOpciones: subs
        });
      });
    });

    const applicableItems = Math.max(0, TOTAL_PRITE_ITEMS - naCount);
    const pct = Math.round((answeredCount / TOTAL_PRITE_ITEMS) * 100);
    const scorePct = applicableItems > 0 ? Math.round((scorePuntos / applicableItems) * 100) : 0;

    let estadoTexto = 'Inicio';
    if (scorePct >= 85) estadoTexto = 'Logrado';
    else if (scorePct >= 70) estadoTexto = 'En proceso';

    // Compromisos estructurados
    const compActivos = priteFormState.compromisosPorVisita[kActiva] || { director: '', especialista: '', adicionales: [] };
    const compromisos = [];
    if (compActivos.director) {
      compromisos.push({ texto: compActivos.director, responsable: 'Director(a) del PRITE', plazo: 'Año lectivo 2026' });
    }
    if (compActivos.especialista) {
      compromisos.push({ texto: compActivos.especialista, responsable: 'Especialista AGEBRE', plazo: 'Seguimiento continuo' });
    }

    // Síntesis estructurada
    const sintesis = [
      { dimension: 'Logros relevantes observados', descripcion: priteFormState.sintesisPorVisita[kActiva]?.logros || '' },
      { dimension: 'Aspectos de mejora', descripcion: priteFormState.sintesisPorVisita[kActiva]?.mejoras || '' },
      { dimension: 'Recomendaciones', descripcion: priteFormState.sintesisPorVisita[kActiva]?.recomendaciones || '' }
    ];

    const docData = {
      fichaTypeId: ft.id || 'ft_prite_gestion',
      fichaTypeNombre: ft.nombre || 'Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar UGEL-03 para Programa de Intervención Temprana (PRITE)',
      modalidad: 'EBE',
      subModalidad: 'PRITE',
      escala: 'IPL',
      tipoRespuesta: 'ips',
      institucion,
      codigoLocal: codLocal,
      codigoModular: (() => {
        const col = (state.colegios || []).find(c => (form.dataset.selectedColegioId && c.id === form.dataset.selectedColegioId) || (codLocal && (c.codigoLocal === codLocal || c.codLocal === codLocal)));
        return col ? (col.codigoModular || col.codModular || '') : '';
      })(),
      colegioId: form.dataset.selectedColegioId || priteFormState.colegioId || null,
      ugel,
      red: rei ? (rei.startsWith('REI') ? rei : `REI ${rei}`) : 'REI 01',
      rei,
      fecha: fechaActiva,
      visita: vActiva,
      responsable: responsableName,
      director: {
        nombre: priteFormState.director.nombres,
        dni: priteFormState.director.dni,
        telefono: priteFormState.director.telefono,
        condicion: priteFormState.director.condicion,
        correo: priteFormState.director.correo
      },
      directorNombre: priteFormState.director.nombres,
      directorDni: priteFormState.director.dni,
      fechasVisitas: { ...priteFormState.fechasVisitas },
      nivelesAtiende: priteFormState.nivelesAtiende,
      tablasPersonal: {
        personal,
        accesoEstudiantes
      },
      respuestas,
      respuestasPorVisita: priteFormState.respuestasPorVisita,
      subOpcionesPorVisita: priteFormState.subOpcionesPorVisita,
      evidenciasPorItem: priteFormState.evidenciasPorItem,
      sintesis,
      sintesisPorVisita: priteFormState.sintesisPorVisita,
      compromisos,
      compromisosPorVisita: priteFormState.compromisosPorVisita,
      observaciones: priteFormState.observaciones,
      puntaje: scorePuntos,
      porcentaje: scorePct,
      estado: estadoTexto,
      totalItems: TOTAL_PRITE_ITEMS,
      itemsRespondidos: answeredCount,
      itemsNa: naCount,
      itemsAplicables: applicableItems,
      updatedAt: Date.now()
    };

    const editId = form.dataset.editingId;
    let targetId = editId;

    if (editId) {
      docData.updatedBy = currentUser?.uid || '';
      await dbNs.collection('submissions').doc(editId).set(docData, { merge: true });
      showToast('✓ Ficha PRITE actualizada exitosamente.');
    } else {
      targetId = genId();
      docData.createdAt = Date.now();
      docData.createdBy = currentUser?.uid || '';
      await dbNs.collection('submissions').doc(targetId).set(docData);
      showToast('✓ Ficha PRITE registrada exitosamente.');
    }

    // Actualizar estado en memoria
    if (state.submissions) {
      const idx = state.submissions.findIndex(s => s.id === targetId);
      if (idx >= 0) state.submissions[idx] = { id: targetId, ...docData };
      else state.submissions.unshift({ id: targetId, ...docData });
    }

    // Sincronizar directorio
    try {
      await syncDirectivosFromFicha(dbNs, { id: targetId, ...docData }, state, currentUser);
    } catch (eDir) {
      console.warn('Directorio sync warning:', eDir);
    }

    resetPriteFormState();
    if (navigate) navigate('consolidado');
  } catch (err) {
    console.error('Error guardando ficha PRITE:', err);
    showToast('Error al guardar: ' + (err.message || 'Intente nuevamente.'));
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = isEditing ? 'Actualizar ficha PRITE' : 'Guardar ficha PRITE';
    }
  } finally {
    isSavingPrite = false;
  }
}
