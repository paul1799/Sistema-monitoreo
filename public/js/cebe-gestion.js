/* =========================================================================
   cebe-gestion.js — Módulo especializado para la Ficha:
   "Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE"
   UGEL 03 · AGEBRE
   RM N° 501-2025-MINEDU

   Estructura oficial del instrumento:
   - I. Datos Generales del CEBE (Tablas de Personal, Personal SAANEE, Acceso y Permanencia)
   - II. Datos de la Directora (Apellidos, Nombres, DNI, Teléfono, Condición, Correo)
   - III. Aspectos a Monitorear (34 ítems en 7 secciones con 3 visitas: V1, V2, V3)
   - IV. Logros, Aspectos de Mejora y Recomendaciones (para cada visita V1, V2, V3)
   - V. Compromisos de Mejora (Directivo y Especialista por visita)
   ========================================================================= */

import { esc, normalizeText, showToast, genId, fmtDate as formatDate, todayStr, normalizeReiNumber, isEbeOrPriteResponsable } from './ui/core-utils.js?v=20261015_v1';
import { getRegTargetVisita, getRegSelectedColegioId } from './ui/state.js?v=20261016_v1';
import { getResponsableForColegio } from './ui/scoring.js?v=20261015_v1';
import { getDirectivosActivosForColegio, cleanTextCode, syncDirectivosFromFicha } from './directorio.js?v=20261013_v1';

/**
 * Detecta si una plantilla o submission corresponde a la Ficha de Gestión Escolar CEBE
 */
export function isFichaCebeGestion(ft) {
  if (!ft) return false;
  const id = (typeof ft === 'string' ? ft : (ft.id || ft.fichaTypeId || ft.tipo || '')).toLowerCase();

  // EXCLUSIONES ESTRICTAS: Fichas de materiales educativos, tutoría, directivos, rúbricas o lectora
  if (id.includes('material') || id.includes('tutoria') || id.includes('directivo') || id.includes('rubrica') || id.includes('lector')) return false;

  const n = String(typeof ft === 'string' ? ft : (ft.nombre || ft.fichaTypeNombre || ft.tipo || id || ''))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (n.includes('material') || n.includes('tutoria') || n.includes('directivo') || n.includes('rubrica') || n.includes('lector') || n.includes('lectura')) return false;

  // Si tiene escala Sí/No, nivel 1-4 o escala 1-3, es una ficha estándar/dinámica, NO la de Gestión Escolar CEBE
  if (typeof ft === 'object' && ft !== null) {
    const escala = String(ft.tipoRespuesta || ft.escala || '').toLowerCase();
    if (escala === 'si_no' || escala === 'escala_1_3' || escala === 'nivel_1_4') return false;
  }

  // Si incluye PRITE en el nombre o id y no es puramente CEBE, descartar
  if ((n.includes('prite') || id.includes('prite')) && !id.includes('cebe')) return false;

  // Identificador canónico oficial
  if (id === 'ft_gestion_cebe' || id === 'ft_cebe_gestion') return true;

  // Si el id es de gestión CEBE (pero no de materiales ni PRITE)
  if (id.includes('cebe') && id.includes('gestion') && !id.includes('prite') && !id.includes('material')) return true;

  // Por nombre oficial: "gestión escolar" específico de CEBE
  if (n.includes('cebe') && (n.includes('gestion escolar') || (n.includes('gestion') && n.includes('asistencia tecnica')))) {
    if (!n.includes('material') && !n.includes('prite')) return true;
  }

  // Verificación por ítems específicos de la ficha oficial CEBE si vienen en el objeto
  if (typeof ft === 'object' && ft !== null) {
    if (Array.isArray(ft.respuestas) && ft.respuestas.some(r => String(r?.id || '').startsWith('gc_') || String(r?.id || '').startsWith('cebe_'))) return true;
    if (Array.isArray(ft.secciones) && ft.secciones.some(s => Array.isArray(s?.items) && s.items.some(i => String(i?.id || '').startsWith('gc_')))) return true;
  }

  return false;
}

export const ESPECIALISTAS_CEBE_OFICIALES = [];

export function renderEspecialistasCebeOptions(selectedVal, state) {
  const normSel = normalizeText(selectedVal || '');
  const list = [];

  if (state && Array.isArray(state.responsables)) {
    state.responsables.forEach(r => {
      if (!isEbeOrPriteResponsable(r)) return;
      const nom = (r.nombresApellidos || r.especialista || '').trim();
      if (!nom) return;
      const modDesc = r.modalidad ? r.modalidad : 'EBE';
      const redDesc = r.red ? ` · ${r.red}` : '';
      const desc = `Especialista ${modDesc}${redDesc}`;
      if (!list.some(x => normalizeText(x.nombre) === normalizeText(nom))) {
        list.push({ nombre: nom, desc });
      }
    });
  }

  // Preservar valor histórico si ya estaba registrado
  if (selectedVal && selectedVal.trim() && !list.some(x => normalizeText(x.nombre) === normSel)) {
    list.push({ nombre: selectedVal.trim(), desc: 'Registrado previamente' });
  }

  return list.map(item => {
    const isSel = normSel && (normalizeText(item.nombre) === normSel || normSel.includes(normalizeText(item.nombre)) || normalizeText(item.nombre).includes(normSel));
    return `<option value="${esc(item.nombre)}" ${isSel ? 'selected' : ''}>${esc(item.nombre)} (${esc(item.desc)})</option>`;
  }).join('');
}

/**
 * Los 34 ítems oficiales del instrumento CEBE distribuidos en sus 7 aspectos
 */
export const CEBE_SECCIONES = [
  {
    num: '3.1',
    nombre: 'Monitoreo y acompañamiento a la práctica docente',
    items: [
      { id: 'gc_1', num: 1, texto: 'La directora cuenta con un Plan de Monitoreo y Acompañamiento Pedagógico', evidencia: 'Plan de monitoreo aprobado.' },
      { id: 'gc_2', num: 2, texto: 'El Plan de Monitoreo incluye una matriz de identificación de necesidades formativas del personal docente y no docente', evidencia: 'Matriz diagnóstica de necesidades formativas.' },
      { id: 'gc_3', num: 3, texto: 'El Plan de Monitoreo cuenta con un cronograma socializado con el equipo docente y no docente', evidencia: 'Cronograma y acta de socialización.' },
      { id: 'gc_4', num: 4, texto: 'La directora realiza acciones de monitoreo a la práctica pedagógica', evidencia: 'Fichas de monitoreo aplicadas.' },
      { id: 'gc_5', num: 5, texto: 'La directora retroalimenta las planificaciones curriculares de los docentes', evidencia: 'Planificaciones curriculares con observaciones o visto bueno de la directora. Fichas o registros de retroalimentación de la planificación. Actas de reuniones pedagógicas donde conste la devolución. Registros de acompañamiento pedagógico.' },
      { id: 'gc_6', num: 6, texto: 'La directora sistematiza los resultados del monitoreo realizado', evidencia: 'Cuadros de sistematización, resúmenes o matrices de resultados.' },
      { id: 'gc_7', num: 7, texto: 'La directora socializa los resultados del monitoreo en espacios de gestión institucional', evidencia: 'Actas de reuniones, presentaciones o informes internos.' }
    ]
  },
  {
    num: '3.2',
    nombre: 'Fortalecimiento docente',
    items: [
      { id: 'gc_8', num: 8, texto: 'La directora identifica necesidades formativas del personal a partir de los resultados del monitoreo pedagógico', evidencia: 'Consolidado o reporte de necesidades formativas priorizadas.' },
      { id: 'gc_9', num: 9, texto: 'La directora cuenta con un plan de acciones formativas', evidencia: 'Plan de fortalecimiento o plan de trabajo con temáticas definidas.' },
      { id: 'gc_10', num: 10, texto: 'La directora implementa espacios de fortalecimiento pedagógico acordes a las necesidades identificadas', evidencia: 'Actas, listas de asistencia, cronograma de talleres o GIAs ejecutados.' },
      { id: 'gc_11', num: 11, texto: 'La directora realiza seguimiento a los compromisos de mejora asumidos por el personal docente y no docente', evidencia: 'Fichas de seguimiento, cuaderno de campo o actas con acuerdos verificados.' }
    ]
  },
  {
    num: '3.3',
    nombre: 'Evaluación de los aprendizajes',
    items: [
      { id: 'gc_12', num: 12, texto: 'La directora monitorea el proceso de evaluación psicopedagógica realizado por los docentes', evidencia: 'Cronograma, registros de seguimiento o reportes de evaluación psicopedagógica.' },
      { id: 'gc_13', num: 13, texto: 'Los Informes Psicopedagógicos (IPP) se encuentran elaborados de manera oportuna', evidencia: 'Informes Psicopedagógicos (IPP) archivados y visados en plazos.' },
      { id: 'gc_14', num: 14, texto: 'Los Planes Educativos Personalizados (PEP) se encuentran elaborados a partir de los IPP', evidencia: 'Planes Educativos Personalizados (PEP) contextualizados según IPP.' },
      { id: 'gc_15', num: 15, texto: 'La institución cuenta con un sistema organizado de resguardo de IPP y PEP que garantiza la confidencialidad', evidencia: 'Archivadores físicos o carpetas digitales con control de acceso y confidencialidad.' },
      { id: 'gc_16', num: 16, texto: 'La directora promueve el análisis y revisión semestral del PEP con el equipo docente', evidencia: 'Actas de reunión de evaluación semestral del PEP.' },
      { id: 'gc_17', num: 17, texto: 'Los docentes elaboran informes de progreso del estudiante en función a los propósitos de aprendizaje del PEP', evidencia: 'Informes de progreso del aprendizaje alineados a los PEP.' },
      { id: 'gc_18', num: 18, texto: 'La institución asegura la entrega oportuna de los informes de progreso a la familia', evidencia: 'Cargos de entrega firmados por los padres de familia o tutores.' },
      { id: 'gc_19', num: 19, texto: 'La directora garantiza que la familia reciba explicación clara y orientaciones sobre el IPP, PEP y avances del estudiante', evidencia: 'Actas de entrevistas, registros de orientación familiar o firmas de compromiso.' }
    ]
  },
  {
    num: '3.4',
    nombre: 'Uso de materiales y espacios educativos',
    items: [
      { id: 'gc_20', num: 20, texto: 'La directora promueve espacios de fortalecimiento pedagógico orientados al uso de materiales educativos accesibles', evidencia: 'Talleres o sesiones sobre elaboración y uso de material adaptado.' },
      { id: 'gc_21', num: 21, texto: 'La directora monitorea el uso de materiales educativos y apoyos en los espacios pedagógicos del CEBE', evidencia: 'Fichas de monitoreo donde se registre el uso de material adaptado y recursos.' },
      { id: 'gc_22', num: 22, texto: 'La directora promueve el uso de espacios educativos funcionales y materiales diversos adecuados a las características de los estudiantes', evidencia: 'Distribución y ambientación de aulas, rincones funcionales y señalización accesible.' },
      { id: 'gc_23', num: 23, texto: 'La directora promueve el uso de recursos tecnológicos y apoyos digitales accesibles como parte de los procesos pedagógicos', evidencia: 'Equipos tecnológicos, software accesible, tablets o comunicadores en uso.' }
    ]
  },
  {
    num: '3.5',
    nombre: 'Plan Lector',
    items: [
      { id: 'gc_24', num: 24, texto: 'La institución cuenta con un Plan Lector como estrategia institucional de acceso a la lectura y la comunicación', evidencia: 'Plan Lector institucional aprobado con RD.' },
      { id: 'gc_25', num: 25, texto: 'El Plan Lector planifica la frecuencia semanal de experiencias de lectura considerando la atención educativa del CEBE', evidencia: 'Cronograma con frecuencia establecida para actividades lectoras accesibles.' },
      { id: 'gc_26', num: 26, texto: 'El Plan Lector involucra a diversos mediadores de lectura en la institución y la comunidad', evidencia: 'Participación de docentes, familias, auxiliares o voluntarios registrada en actas.' },
      { id: 'gc_27', num: 27, texto: 'El Plan Lector promueve el uso de diversos espacios para el desarrollo de experiencias de lectura', evidencia: 'Espacios de lectura en aula, patio, biblioteca adaptada o áreas verdes.' },
      { id: 'gc_28', num: 28, texto: 'El Plan Lector promueve el uso de diversos materiales de lectura elaborados, adquiridos o de uso cotidiano', evidencia: 'Libros en macrotipo, braille, con texturas, pictogramas, cuentos interactivos.' }
    ]
  },
  {
    num: '3.6',
    nombre: 'Implementación del enfoque ambiental',
    items: [
      { id: 'gc_29', num: 29, texto: 'La IE cuenta con el Proyecto Educativo Ambiental Integrado (PEAI) contextualizado a la modalidad CEBE', evidencia: 'Documento del PEAI aprobado y contextualizado a las necesidades de los estudiantes.' },
      { id: 'gc_30', num: 30, texto: 'La IE cuenta con Resolución Directoral de conformación de las Brigadas de Educación Ambiental y Gestión del Riesgo de Desastres', evidencia: 'Resolución Directoral institucional de conformación de brigadas.' },
      { id: 'gc_31', num: 31, texto: 'La directora monitorea el cumplimiento de las funciones de las brigadas y el desarrollo de las actividades previstas', evidencia: 'Actas de simulacros, informes de acciones ambientales y verificación de brigadas.' }
    ]
  },
  {
    num: '3.7',
    nombre: 'Innovación educativa',
    items: [
      { id: 'gc_32', num: 32, texto: 'La directora identifica y sistematiza Buenas Prácticas pedagógicas que responden a las necesidades educativas de los estudiantes', evidencia: 'Fichas de sistematización de buenas prácticas o carpetas pedagógicas destacadas.' },
      { id: 'gc_33', num: 33, texto: 'La directora promueve y acompaña Proyectos de Innovación Educativa orientados a la mejora de los aprendizajes y la calidad de vida de los estudiantes', evidencia: 'Proyectos de innovación formulados o postulados (FONDEP, UGEL o institucional).' },
      { id: 'gc_34', num: 34, texto: 'La directora realiza seguimiento a la implementación y promueve la socialización de las Buenas Prácticas y/o Proyectos de Innovación', evidencia: 'Actas de socialización en jornadas internas, redes educativas (REI) o informes UGEL.' }
    ]
  }
];

export const TOTAL_CEBE_ITEMS = 34;

/**
 * Retorna las 7 secciones oficiales y 34 ítems de la Ficha CEBE.
 * Distribución canónica: 7, 4, 8, 4, 5, 3, 3 ítems en 7 aspectos (3.1 a 3.7).
 * Garantiza que siempre existan las 7 secciones y que sec.num ('3.1' a '3.7')
 * e it.num (1 a 34) estén siempre definidos y nunca sean undefined.
 */
export function getActiveCebeSections(ft) {
  const isOfficial34 = (ft && Array.isArray(ft.secciones) && ft.secciones.length === 7 && ft.secciones.reduce((acc, s) => acc + (s.items ? s.items.length : 0), 0) === 34);
  const rawSections = isOfficial34 ? ft.secciones : CEBE_SECCIONES;

  let runningItemIndex = 1;
  return rawSections.map((sec, sIdx) => {
    const secNum = sec.num || `3.${sIdx + 1}`;
    const items = (sec.items || []).map((it, iIdx) => {
      const itemNum = (it.num !== undefined && it.num !== null && it.num !== '') ? it.num : runningItemIndex;
      runningItemIndex++;
      return {
        ...it,
        num: itemNum
      };
    });
    return {
      ...sec,
      num: secNum,
      items
    };
  });
}

/**
 * Estado en memoria del formulario CEBE
 */
let cebeFormState = {
  visita: 1, // 1, 2 o 3
  institucion: '',
  codigoLocal: '',
  rei: '',
  responsable: '',
  colegioId: null,
  fechasVisitas: { v1: todayStr(), v2: '', v3: '' },
  nivelesAtiende: { inicial: false, primaria: false },
  personal: {},
  personalSaanee: {},
  accesoEstudiantes: {},
  director: { nombres: '', dni: '', telefono: '', condicion: 'Designada', correo: '' },
  respuestasPorVisita: { v1: {}, v2: {}, v3: {} },
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

export function resetCebeFormState() {
  cebeFormState = {
    visita: 1,
    institucion: '',
    codigoLocal: '',
    rei: '',
    responsable: '',
    colegioId: null,
    fechasVisitas: { v1: todayStr(), v2: '', v3: '' },
    nivelesAtiende: { inicial: false, primaria: false },
    personal: {},
    personalSaanee: {},
    accesoEstudiantes: {},
    director: { nombres: '', dni: '', telefono: '', condicion: 'Designada', correo: '' },
    respuestasPorVisita: { v1: {}, v2: {}, v3: {} },
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
 * Asigna los datos generales de una Institución Educativa CEBE a cebeFormState:
 * IE, código local, REI, Directora y Especialista asignado.
 */
export function applyColegioToCebeFormState(c, state, ft = null) {
  if (!c) return;
  cebeFormState.colegioId = c.id || null;
  cebeFormState.institucion = c.ie || c.nombre || '';
  cebeFormState.codigoLocal = cleanTextCode(c.codigoLocal || c.codigoModular || '');
  cebeFormState.rei = c.rei || (c.red ? String(c.red).replace(/\D+/g, '') : '') || '';

  const { director: dirActivo } = getDirectivosActivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);
  if (dirActivo) {
    cebeFormState.director = {
      nombres: dirActivo.apellidosNombres || '',
      dni: cleanTextCode(dirActivo.dni || ''),
      telefono: cleanTextCode(dirActivo.telefono || ''),
      correo: dirActivo.correo || '',
      condicion: dirActivo.condicion || 'Designada'
    };
  } else if (c.director) {
    cebeFormState.director = {
      nombres: c.director.nombre || c.director.nombres || '',
      dni: cleanTextCode(c.director.dni || ''),
      telefono: cleanTextCode(c.director.telefono || ''),
      correo: c.director.correo || '',
      condicion: c.director.condicion || 'Designada'
    };
  }

  const resp = getResponsableForColegio(c, ft, state);
  if (resp && resp !== '—' && resp !== 'Por asignar') {
    cebeFormState.responsable = resp;
  }
}

/**
 * Precarga datos desde una ficha registrada previamente
 */
export function preloadCebeFormState(sub, ft) {
  resetCebeFormState();
  if (!sub) return;

  cebeFormState.institucion = sub.institucion || sub.nombreIe || sub.ie || '';
  cebeFormState.codigoLocal = sub.codigoLocal || sub.codLocal || '';
  cebeFormState.rei = sub.rei || (sub.red ? String(sub.red).replace(/\D+/g, '') : '') || '';
  cebeFormState.responsable = (sub.responsable && !String(sub.responsable).includes('@') && !/^\d+$/.test(String(sub.responsable).trim()))
    ? String(sub.responsable).trim()
    : '';
  cebeFormState.colegioId = sub.colegioId || null;

  const vNum = Number(sub.visita) || 1;
  cebeFormState.visita = (vNum >= 1 && vNum <= 3) ? vNum : 1;

  if (sub.fechasVisitas) {
    cebeFormState.fechasVisitas = { ...cebeFormState.fechasVisitas, ...sub.fechasVisitas };
  } else if (sub.fecha) {
    const k = `v${cebeFormState.visita}`;
    cebeFormState.fechasVisitas[k] = sub.fecha;
  }

  if (sub.nivelesAtiende) {
    cebeFormState.nivelesAtiende = { ...sub.nivelesAtiende };
  } else if (sub.nivel) {
    const nLow = String(sub.nivel).toLowerCase();
    cebeFormState.nivelesAtiende.inicial = nLow.includes('ini');
    cebeFormState.nivelesAtiende.primaria = nLow.includes('pri');
  }

  if (sub.tablasPersonal) {
    cebeFormState.personal = sub.tablasPersonal.personal || {};
    cebeFormState.personalSaanee = sub.tablasPersonal.personalSaanee || {};
    cebeFormState.accesoEstudiantes = sub.tablasPersonal.accesoEstudiantes || {};
  } else if (sub.personal || sub.personalSaanee || sub.accesoEstudiantes) {
    cebeFormState.personal = sub.personal || {};
    cebeFormState.personalSaanee = sub.personalSaanee || {};
    cebeFormState.accesoEstudiantes = sub.accesoEstudiantes || {};
  }

  if (sub.director) {
    cebeFormState.director = {
      nombres: sub.director.nombre || sub.director.nombres || sub.directorNombre || '',
      dni: sub.director.dni || sub.directorDni || '',
      telefono: sub.director.telefono || '',
      condicion: sub.director.condicion || 'Designada',
      correo: sub.director.correo || ''
    };
  } else {
    cebeFormState.director = {
      nombres: sub.directorNombre || '',
      dni: sub.directorDni || '',
      telefono: sub.telefono || '',
      condicion: sub.condicion || 'Designada',
      correo: sub.correo || ''
    };
  }

  // Respuestas de ítems
  if (sub.respuestasPorVisita) {
    cebeFormState.respuestasPorVisita = { ...sub.respuestasPorVisita };
  }
  if (Array.isArray(sub.respuestas)) {
    const kActiva = `v${cebeFormState.visita}`;
    if (!cebeFormState.respuestasPorVisita[kActiva]) cebeFormState.respuestasPorVisita[kActiva] = {};
    sub.respuestas.forEach((r, idx) => {
      if (!r) return;
      let targetId = r.id;
      if (!targetId || !targetId.startsWith('gc_')) {
        const num = r.num || (idx + 1);
        targetId = `gc_${num}`;
      }
      if (r.valor) {
        cebeFormState.respuestasPorVisita[kActiva][targetId] = String(r.valor).toLowerCase();
      }
      if (r.evidencia || r.hallazgo) {
        cebeFormState.evidenciasPorItem[targetId] = r.evidencia || r.hallazgo;
      }
    });
  }

  // Síntesis IV
  if (sub.sintesisPorVisita) {
    cebeFormState.sintesisPorVisita = { ...sub.sintesisPorVisita };
  } else if (Array.isArray(sub.sintesis)) {
    const kActiva = `v${cebeFormState.visita}`;
    const sMap = cebeFormState.sintesisPorVisita[kActiva] || { logros: '', mejoras: '', recomendaciones: '' };
    sub.sintesis.forEach(row => {
      const d = normalizeText(row.dimension || '');
      if (d.includes('logro')) sMap.logros = row.descripcion || row.logros || '';
      else if (d.includes('mejora')) sMap.mejoras = row.descripcion || row.dificultades || row.mejoras || '';
      else if (d.includes('recomend')) sMap.recomendaciones = row.descripcion || row.recomendaciones || '';
    });
    cebeFormState.sintesisPorVisita[kActiva] = sMap;
  }
  const kAct = `v${cebeFormState.visita}`;
  if (sub.logros && !cebeFormState.sintesisPorVisita[kAct].logros) {
    cebeFormState.sintesisPorVisita[kAct].logros = sub.logros;
  }
  if (sub.aspectos_mejora && !cebeFormState.sintesisPorVisita[kAct].mejoras) {
    cebeFormState.sintesisPorVisita[kAct].mejoras = sub.aspectos_mejora;
  }
  if (sub.recomendaciones && !cebeFormState.sintesisPorVisita[kAct].recomendaciones) {
    cebeFormState.sintesisPorVisita[kAct].recomendaciones = sub.recomendaciones;
  }

  // Compromisos V
  if (sub.compromisosPorVisita) {
    cebeFormState.compromisosPorVisita = { ...sub.compromisosPorVisita };
  } else if (Array.isArray(sub.compromisos)) {
    const kActiva = `v${cebeFormState.visita}`;
    const cMap = cebeFormState.compromisosPorVisita[kActiva] || { director: '', especialista: '', adicionales: [] };
    sub.compromisos.forEach(c => {
      const rNorm = normalizeText(c.responsable || '');
      if (rNorm.includes('director')) cMap.director = c.texto || '';
      else if (rNorm.includes('especialista') || rNorm.includes('monitor')) cMap.especialista = c.texto || '';
      else cMap.adicionales.push(c);
    });
    cebeFormState.compromisosPorVisita[kActiva] = cMap;
  }
  if (sub.compromiso_directivo && !cebeFormState.compromisosPorVisita[kAct].director) {
    cebeFormState.compromisosPorVisita[kAct].director = sub.compromiso_directivo;
  }
  if (sub.compromiso_especialista && !cebeFormState.compromisosPorVisita[kAct].especialista) {
    cebeFormState.compromisosPorVisita[kAct].especialista = sub.compromiso_especialista;
  }

  cebeFormState.observaciones = sub.observaciones || '';
}

/**
 * Renderiza el formulario completo de CEBE
 */
export function renderCebeGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing = false, prefillOptions = null) {
  if (!host) return;

  if (!isEditing) {
    const targetVis = (prefillOptions && prefillOptions.visita)
      ? Number(prefillOptions.visita)
      : ((getRegTargetVisita ? Number(getRegTargetVisita()) : null) || (function() {
          try {
            const v = sessionStorage.getItem('reg_prefill_visita');
            return v ? Number(v) : null;
          } catch (_) { return null; }
        })());

    const targetColId = (prefillOptions && prefillOptions.colegioId)
      ? prefillOptions.colegioId
      : ((getRegSelectedColegioId ? getRegSelectedColegioId() : null) || (function() {
          try { return sessionStorage.getItem('reg_prefill_colegioid'); } catch (_) { return null; }
        })());

    if (targetVis && [1, 2, 3].includes(targetVis)) {
      cebeFormState.visita = targetVis;
    }

    if (targetColId && (!cebeFormState.colegioId || cebeFormState.colegioId !== targetColId)) {
      const col = (state && Array.isArray(state.colegios))
        ? state.colegios.find(c => c.id === targetColId || c.codigoLocal === targetColId || c.codigoModular === targetColId)
        : null;
      if (col) {
        applyColegioToCebeFormState(col, state, ft);
      }
    }
  }

  const vActiva = cebeFormState.visita || 1;
  const kActiva = `v${vActiva}`;
  const respuestasActivas = cebeFormState.respuestasPorVisita[kActiva] || {};
  const sintesisActiva = cebeFormState.sintesisPorVisita[kActiva] || { logros: '', mejoras: '', recomendaciones: '' };
  const compromisosActivos = cebeFormState.compromisosPorVisita[kActiva] || { director: '', especialista: '', adicionales: [] };

  const submitLabel = isEditing ? 'Actualizar ficha CEBE' : 'Guardar ficha CEBE';

  // Filas del cuadro de personal
  const filasPersonal = [
    { id: 'director', label: 'Director(a)' },
    { id: 'doc_nombrados', label: 'N° Docentes nombrados' },
    { id: 'doc_contratados', label: 'N° Docentes contratados' },
    { id: 'auxiliares', label: 'N° Auxiliares de educación' },
    { id: 'modelos_lsp', label: 'Modelos lingüísticos de LSP' },
    { id: 'no_docente', label: 'Personal no docente' },
    { id: 'cas', label: 'Personal CAS' },
    { id: 'administrativo', label: 'Personal administrativo' }
  ];

  const filasSaanee = [
    { id: 'saanee_nombrados', label: 'Docentes SAANEE nombrados (incluye a la coordinadora)' },
    { id: 'saanee_contratados', label: 'Docentes SAANEE contratados' },
    { id: 'saanee_profesionales', label: 'Profesionales no docentes SAANEE' }
  ];

  const personalData = cebeFormState.personal || {};
  const saaneeData = cebeFormState.personalSaanee || {};
  const accesoData = cebeFormState.accesoEstudiantes || {};

  const htmlPersonalRows = filasPersonal.map(f => {
    const kInstTot = `${f.id}_inst_tot`;
    const kInstAsis = `${f.id}_inst_asis`;
    const kIniTot = `${f.id}_ini_tot`;
    const kIniAsis = `${f.id}_ini_asis`;
    const kPriTot = `${f.id}_pri_tot`;
    const kPriAsis = `${f.id}_pri_asis`;
    return `
      <tr>
        <td style="font-weight:600;font-size:12px;padding:6px 10px;background:#F8FAFC">${esc(f.label)}</td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cp_${kInstTot}" value="${esc(personalData[kInstTot] || '')}"></td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cp_${kInstAsis}" value="${esc(personalData[kInstAsis] || '')}"></td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cp_${kIniTot}" value="${esc(personalData[kIniTot] || '')}"></td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cp_${kIniAsis}" value="${esc(personalData[kIniAsis] || '')}"></td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cp_${kPriTot}" value="${esc(personalData[kPriTot] || '')}"></td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cp_${kPriAsis}" value="${esc(personalData[kPriAsis] || '')}"></td>
      </tr>
    `;
  }).join('');

  const htmlSaaneeRows = filasSaanee.map(f => {
    const kTot = `${f.id}_tot`;
    const kPart = `${f.id}_part`;
    return `
      <tr>
        <td style="font-weight:600;font-size:12px;padding:6px 10px;background:#F8FAFC">${esc(f.label)}</td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cs_${kTot}" value="${esc(saaneeData[kTot] || '')}"></td>
        <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cs_${kPart}" value="${esc(saaneeData[kPart] || '')}"></td>
      </tr>
    `;
  }).join('');

  // Estudiantes
  const iniMat = Number(accesoData['ini_mat']) || 0;
  const iniAsis = Number(accesoData['ini_asis']) || 0;
  const iniNoAsis = accesoData['ini_noasis'] !== undefined ? accesoData['ini_noasis'] : '';
  const priMat = Number(accesoData['pri_mat']) || 0;
  const priAsis = Number(accesoData['pri_asis']) || 0;
  const priNoAsis = accesoData['pri_noasis'] !== undefined ? accesoData['pri_noasis'] : '';
  const totMat = iniMat + priMat;
  const totAsis = iniAsis + priAsis;

  // Aspectos a Monitorear (dinámicos desde ft.secciones o catálogo canónico CEBE de 34 ítems)
  const activeSections = getActiveCebeSections(ft);
  const totalItemsCount = activeSections.reduce((acc, s) => acc + (s.items ? s.items.length : 0), 0) || TOTAL_CEBE_ITEMS;

  const htmlSecciones = activeSections.map((sec, sIdx) => {
    const itemsHtml = (sec.items || []).map((it, iIdx) => {
      const val = (respuestasActivas[it.id] || '').toLowerCase();
      const evidVal = cebeFormState.evidenciasPorItem[it.id] || '';
      const itemNumDisplay = (it.num !== undefined && it.num !== null && it.num !== '') ? it.num : (sIdx + 1) + '.' + (iIdx + 1);

      const hasObs = Boolean(evidVal && evidVal.trim());
      return `
        <div class="cebeItemRow" data-item-id="${it.id}">
          <div class="cebeItemMain">
            <span class="cebeItemNum">${itemNumDisplay}.</span>
            <div class="cebeItemTextWrap">
              <div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">
                <div class="cebeItemText" style="flex:1;min-width:240px">${esc(it.texto)}</div>
                <button type="button" class="btnToggleObs ${hasObs ? 'has-content' : ''}" data-target-obs="obs_wrap_${it.id}" title="Describir observaciones o hallazgos verificados">
                  💬 Observación ${hasObs ? '✓' : ''}
                </button>
              </div>
              <div class="itemObsWrap" id="obs_wrap_${it.id}" style="display:${hasObs ? 'block' : 'none'};margin-top:8px">
                <textarea class="cebeEvidInp cebeObsTextarea" id="evid_${it.id}" rows="2" placeholder="${it.evidencia ? esc(it.evidencia) : 'Describa aquí los hallazgos u observaciones identificados en este indicador...'}" style="width:100%;font-size:12px;padding:6px 10px;border:1.5px solid #CBD5E1;border-radius:6px;min-height:44px;box-sizing:border-box">${esc(evidVal)}</textarea>
              </div>
            </div>
          </div>
          <div class="cebeScaleGroup" role="radiogroup" aria-label="Calificación para ítem ${itemNumDisplay}">
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

    const secNumDisplay = sec.num || `3.${sIdx + 1}`;

    return `
      <div class="formSecCard" style="margin-bottom:18px">
        <div class="formSecHeader" style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;padding:12px 18px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px">
            <span class="formSecBadge" style="background:#1E40AF;color:#FFFFFF;font-weight:700;font-size:11px;padding:3px 8px;border-radius:4px">${secNumDisplay}</span>
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
    <form id="regForm" autocomplete="off" class="cebeFormContainer">
      <!-- Banner de la Ficha CEBE -->
      <div class="panel" style="background:linear-gradient(135deg, #0B1B36 0%, #17366E 100%);color:#FFFFFF;border-radius:10px;padding:18px 22px;margin-bottom:18px;box-shadow:0 4px 14px rgba(11,27,54,0.12)">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:14px">
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <span style="background:rgba(224,165,38,0.2);color:#F6C343;border:1px solid #E0A526;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;text-transform:uppercase">Modalidad EBE</span>
              <span style="background:rgba(255,255,255,0.15);font-size:11px;padding:2px 8px;border-radius:4px">RM N° 501-2025-MINEDU</span>
            </div>
            <h2 style="font-family:var(--serif);font-size:19px;margin:0 0 6px 0;line-height:1.3;color:#FFFFFF">
              Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar — CEBE
            </h2>
            <p style="margin:0;font-size:12.5px;color:rgba(255,255,255,0.85);max-width:850px">
              Instrumento oficial para Centros de Educación Básica Especial (CEBE) UGEL 03. Evalúa 34 indicadores en 7 aspectos clave a lo largo de 3 visitas.
            </p>
          </div>
        </div>
      </div>

      <!-- Selector de Visita (3 visitas oficiales) -->
      <div class="panel" style="margin-bottom:18px;padding:16px 20px;border-radius:10px;border-left:4px solid #1E40AF">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:12px">
          <div>
            <span style="font-size:11px;font-weight:700;text-transform:uppercase;color:#1E40AF;letter-spacing:0.05em">Etapa de acompañamiento</span>
            <h3 style="margin:2px 0 0;font-size:16px;color:var(--navy-900)">N.° de Visita de Monitoreo al CEBE</h3>
          </div>
          <div style="font-size:12.5px;color:var(--text-600)">
            Visita activa en edición: <strong style="color:#1E40AF">Visita ${vActiva}</strong>
          </div>
        </div>

        <div class="cebeVisitaTabsGrid">
          <div class="cebeVisitaTab ${vActiva === 1 ? 'active' : ''}" data-cebe-visita="1">
            <div class="cebeVisitaTabHead">
              <span class="cebeVisitaBadge">Visita 1</span>
              <span class="cebeVisitaCheck">${vActiva === 1 ? '✓ Activa' : 'Ver / Editar'}</span>
            </div>
            <div class="cebeVisitaDesc">Primer momento · Diagnóstico y planificación institucional</div>
            <div class="cebeVisitaMeta">Fecha: <strong>${esc(cebeFormState.fechasVisitas.v1 || 'Sin fecha')}</strong></div>
          </div>

          <div class="cebeVisitaTab ${vActiva === 2 ? 'active' : ''}" data-cebe-visita="2">
            <div class="cebeVisitaTabHead">
              <span class="cebeVisitaBadge">Visita 2</span>
              <span class="cebeVisitaCheck">${vActiva === 2 ? '✓ Activa' : 'Ver / Editar'}</span>
            </div>
            <div class="cebeVisitaDesc">Segundo momento · Acompañamiento intermedio y seguimiento</div>
            <div class="cebeVisitaMeta">Fecha: <strong>${esc(cebeFormState.fechasVisitas.v2 || 'Sin fecha')}</strong></div>
          </div>

          <div class="cebeVisitaTab ${vActiva === 3 ? 'active' : ''}" data-cebe-visita="3">
            <div class="cebeVisitaTabHead">
              <span class="cebeVisitaBadge">Visita 3</span>
              <span class="cebeVisitaCheck">${vActiva === 3 ? '✓ Activa' : 'Ver / Editar'}</span>
            </div>
            <div class="cebeVisitaDesc">Tercer momento · Cierre del año lectivo y balance de logros</div>
            <div class="cebeVisitaMeta">Fecha: <strong>${esc(cebeFormState.fechasVisitas.v3 || 'Sin fecha')}</strong></div>
          </div>
        </div>
      </div>

      <!-- I. DATOS GENERALES DEL CEBE -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle">I. DATOS GENERALES DEL CEBE</div>
        <div class="fieldGrid" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:16px">
          <div class="field" style="grid-column:span 2">
            <label for="f_institucion">Número y/o Nombre del CEBE *</label>
            <div class="ieSearchWrap" id="ieSearchWrap">
              <input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar CEBE por nombre o código modular..." value="${esc(cebeFormState.institucion || '')}" required>
              <div class="ieDropdown" id="ieDropdown"></div>
            </div>
            <span id="regColegioHint" style="${cebeFormState.institucion ? 'display:block' : 'display:none'};font-size:11.5px;color:var(--primary-dark);margin-top:4px">${cebeFormState.institucion ? `✓ CEBE: ${esc(cebeFormState.institucion)}` : ''}</span>
          </div>

          <div class="field">
            <label for="cebe_cod_local">Código de Local *</label>
            <input type="text" id="cebe_cod_local" placeholder="Ej. 306699" value="${esc(cebeFormState.codigoLocal || '')}" required>
          </div>

          <div class="field">
            <label for="cebe_ugel">UGEL *</label>
            <input type="text" id="cebe_ugel" value="UGEL 03" readonly style="background:#F1F5F9">
          </div>

          <div class="field">
            <label for="cebe_rei">REI *</label>
            <input type="text" id="cebe_rei" placeholder="Ej. 13" value="${esc(cebeFormState.rei || '')}" required>
          </div>

          <div class="field">
            <label for="cebe_fecha_v${vActiva}">Fecha de Visita ${vActiva} *</label>
            <input type="date" id="cebe_fecha_visita" value="${esc(cebeFormState.fechasVisitas[kActiva] || todayStr())}" required>
          </div>

          <div class="field" style="grid-column:span 2">
            <label for="cebe_responsable">Especialista que ejecutó el monitoreo *</label>
            <select id="cebe_responsable" class="respSelect" style="width:100%;height:42px;padding:8px 12px;border:1.5px solid #CBD5E1;border-radius:8px;font-size:14px;background:#FFF;font-weight:600;color:var(--navy-900);cursor:pointer" required>
              <option value="">— Seleccionar Especialista —</option>
              ${renderEspecialistasCebeOptions(cebeFormState.responsable, state)}
            </select>
            <span class="respHint" id="cebeRespHint" style="font-size:11.5px;color:var(--primary-dark);margin-top:4px;display:block">
              ${cebeFormState.responsable ? `✓ Especialista asignada: <strong>${esc(cebeFormState.responsable)}</strong>` : 'Seleccione a la especialista de AGEBRE que realizó el monitoreo en esta visita.'}
            </span>
          </div>
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin-bottom:16px">
          <label style="font-weight:700;font-size:12.5px;color:var(--navy-900);display:block;margin-bottom:6px">Niveles que atiende:</label>
          <div style="display:flex;gap:20px;align-items:center">
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="checkbox" id="cebe_niv_inicial" ${cebeFormState.nivelesAtiende.inicial ? 'checked' : ''}>
              <span>Inicial</span>
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
              <input type="checkbox" id="cebe_niv_primaria" ${cebeFormState.nivelesAtiende.primaria ? 'checked' : ''}>
              <span>Primaria</span>
            </label>
          </div>
        </div>

        <!-- Tabla Personal -->
        <div style="margin-bottom:18px">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
            <h4 style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0">Cuadro 1: PERSONAL</h4>
            <button type="button" id="btnCopiarPersonalCebeV1" class="btn secondary small" style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:4px 11px;border-radius:6px;border:1.5px solid #0284C7;color:#0284C7;background:#F0F9FF;font-weight:700;cursor:pointer;transition:all 0.15s ease" title="Copiar datos de personal y docentes registrados en la Visita 1">
              📋 Copiar personal de Visita 1
            </button>
          </div>
          <div class="tblWrap" style="overflow-x:auto">
            <table class="cebeDataTable" style="width:100%;border-collapse:collapse;font-size:12px">
              <thead>
                <tr style="background:#F1F5F9">
                  <th rowspan="2" style="text-align:left;padding:8px 10px;border:1px solid #CBD5E1">PERSONAL</th>
                  <th colspan="2" style="text-align:center;padding:6px;border:1px solid #CBD5E1">INSTITUCIONAL</th>
                  <th colspan="2" style="text-align:center;padding:6px;border:1px solid #CBD5E1">INICIAL</th>
                  <th colspan="2" style="text-align:center;padding:6px;border:1px solid #CBD5E1">PRIMARIA</th>
                </tr>
                <tr style="background:#F8FAFC">
                  <th style="text-align:center;padding:4px;border:1px solid #CBD5E1;font-size:11px">TOTAL</th>
                  <th style="text-align:center;padding:4px;border:1px solid #CBD5E1;font-size:11px">ASISTENTES</th>
                  <th style="text-align:center;padding:4px;border:1px solid #CBD5E1;font-size:11px">TOTAL</th>
                  <th style="text-align:center;padding:4px;border:1px solid #CBD5E1;font-size:11px">ASISTENTES</th>
                  <th style="text-align:center;padding:4px;border:1px solid #CBD5E1;font-size:11px">TOTAL</th>
                  <th style="text-align:center;padding:4px;border:1px solid #CBD5E1;font-size:11px">ASISTENTES</th>
                </tr>
              </thead>
              <tbody>
                ${htmlPersonalRows}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabla SAANEE y Acceso Estudiantes en 2 columnas -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:16px">
          <div>
            <h4 style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0 0 8px">Cuadro 2: PERSONAL SAANEE</h4>
            <div class="tblWrap" style="overflow-x:auto">
              <table class="cebeDataTable" style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="background:#F1F5F9">
                    <th style="text-align:left;padding:8px 10px;border:1px solid #CBD5E1">PERSONAL SAANEE</th>
                    <th style="text-align:center;padding:8px;border:1px solid #CBD5E1;width:75px">TOTAL</th>
                    <th style="text-align:center;padding:8px;border:1px solid #CBD5E1;width:85px">PARTICIPAN</th>
                  </tr>
                </thead>
                <tbody>
                  ${htmlSaaneeRows}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h4 style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0 0 8px">Cuadro 3: ACCESO Y PERMANENCIA DE ESTUDIANTES</h4>
            <div class="tblWrap" style="overflow-x:auto">
              <table class="cebeDataTable" style="width:100%;border-collapse:collapse;font-size:12px">
                <thead>
                  <tr style="background:#F1F5F9">
                    <th style="text-align:left;padding:8px 10px;border:1px solid #CBD5E1">NIVELES</th>
                    <th style="text-align:center;padding:6px;border:1px solid #CBD5E1">MATRICULADOS</th>
                    <th style="text-align:center;padding:6px;border:1px solid #CBD5E1">ASISTEN AL SERV.</th>
                    <th style="text-align:center;padding:6px;border:1px solid #CBD5E1">NO ASISTEN</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style="font-weight:600;padding:6px 10px;background:#F8FAFC">Inicial</td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cebe_est_ini_mat" value="${esc(accesoData['ini_mat'] || '')}"></td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cebe_est_ini_asis" value="${esc(accesoData['ini_asis'] || '')}"></td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cebe_est_ini_noasis" value="${esc(accesoData['ini_noasis'] || '')}"></td>
                  </tr>
                  <tr>
                    <td style="font-weight:600;padding:6px 10px;background:#F8FAFC">Primaria</td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cebe_est_pri_mat" value="${esc(accesoData['pri_mat'] || '')}"></td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cebe_est_pri_asis" value="${esc(accesoData['pri_asis'] || '')}"></td>
                    <td style="padding:4px"><input type="number" min="0" inputmode="numeric" placeholder="0" class="cebeNumInp" id="cebe_est_pri_noasis" value="${esc(accesoData['pri_noasis'] || '')}"></td>
                  </tr>
                  <tr style="background:#F8FAFC;font-weight:700">
                    <td style="padding:6px 10px">TOTAL</td>
                    <td style="padding:6px;text-align:center;color:#1E40AF" id="cebe_est_tot_mat">${totMat}</td>
                    <td style="padding:6px;text-align:center;color:#1E40AF" id="cebe_est_tot_asis">${totAsis}</td>
                    <td style="padding:6px;text-align:center" id="cebe_est_tot_noasis">—</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- II. DATOS DE LA DIRECTORA -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle">II. DATOS DE LA DIRECTORA</div>
        <div class="fieldGrid" style="grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px">
          <div class="field" style="grid-column:span 2">
            <label for="cebe_dir_nombres">Apellidos y Nombres *</label>
            <input type="text" id="cebe_dir_nombres" placeholder="Apellidos y nombres completos" value="${esc(cebeFormState.director.nombres || '')}" required>
          </div>
          <div class="field">
            <label for="cebe_dir_dni">DNI (8 dígitos) *</label>
            <input type="text" id="cebe_dir_dni" maxlength="8" pattern="[0-9]{8}" placeholder="DNI" value="${esc(cebeFormState.director.dni || '')}" required>
          </div>
          <div class="field">
            <label for="cebe_dir_tel">Teléfono / Celular</label>
            <input type="tel" id="cebe_dir_tel" placeholder="Teléfono" value="${esc(cebeFormState.director.telefono || '')}">
          </div>
          <div class="field">
            <label for="cebe_dir_cond">Condición *</label>
            <select id="cebe_dir_cond">
              <option value="Designada" ${cebeFormState.director.condicion === 'Designada' ? 'selected' : ''}>Designada</option>
              <option value="Nombrada" ${cebeFormState.director.condicion === 'Nombrada' ? 'selected' : ''}>Nombrada</option>
              <option value="Encargada" ${cebeFormState.director.condicion === 'Encargada' ? 'selected' : ''}>Encargada</option>
            </select>
          </div>
          <div class="field">
            <label for="cebe_dir_correo">Correo Electrónico</label>
            <input type="email" id="cebe_dir_correo" placeholder="correo@ugel03.edu.pe" value="${esc(cebeFormState.director.correo || '')}">
          </div>
        </div>
      </div>

      <!-- III. ASPECTOS A MONITOREAR (34 ÍTEMS) -->
      <div class="panel" style="margin-bottom:18px">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px">
          <div>
            <div class="sectionHeaderTitle" style="margin-bottom:2px">III. ASPECTOS A MONITOREAR — VISITA ${vActiva}</div>
            <p style="margin:0;font-size:12px;color:var(--text-600)">
              Valore cada uno de los 34 indicadores en la escala: <strong>I</strong> (Inicio), <strong>P</strong> (Proceso), <strong>L</strong> (Logrado) o <strong>N.A.</strong> (No Aplica), y registre la evidencia verificable.
            </p>
          </div>
          <div id="cebeProgressCounter" class="cebeProgressBadge">
            0 de 34 respondidos (0%)
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
                  <textarea id="cebe_logros_v1" class="cebeTextarea" placeholder="Logros observados en Visita 1...">${esc(cebeFormState.sintesisPorVisita.v1.logros || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_logros_v2" class="cebeTextarea" placeholder="Logros observados en Visita 2...">${esc(cebeFormState.sintesisPorVisita.v2.logros || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_logros_v3" class="cebeTextarea" placeholder="Logros observados en Visita 3...">${esc(cebeFormState.sintesisPorVisita.v3.logros || '')}</textarea>
                </td>
              </tr>
              <tr>
                <td style="font-weight:700;padding:10px;border:1px solid #CBD5E1;background:#F8FAFC">Aspectos de mejora</td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_mejoras_v1" class="cebeTextarea" placeholder="Aspectos de mejora en Visita 1...">${esc(cebeFormState.sintesisPorVisita.v1.mejoras || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_mejoras_v2" class="cebeTextarea" placeholder="Aspectos de mejora en Visita 2...">${esc(cebeFormState.sintesisPorVisita.v2.mejoras || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_mejoras_v3" class="cebeTextarea" placeholder="Aspectos de mejora en Visita 3...">${esc(cebeFormState.sintesisPorVisita.v3.mejoras || '')}</textarea>
                </td>
              </tr>
              <tr>
                <td style="font-weight:700;padding:10px;border:1px solid #CBD5E1;background:#F8FAFC">Recomendaciones</td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_rec_v1" class="cebeTextarea" placeholder="Recomendaciones de Visita 1...">${esc(cebeFormState.sintesisPorVisita.v1.recomendaciones || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_rec_v2" class="cebeTextarea" placeholder="Recomendaciones de Visita 2...">${esc(cebeFormState.sintesisPorVisita.v2.recomendaciones || '')}</textarea>
                </td>
                <td style="padding:6px;border:1px solid #CBD5E1">
                  <textarea id="cebe_rec_v3" class="cebeTextarea" placeholder="Recomendaciones de Visita 3...">${esc(cebeFormState.sintesisPorVisita.v3.recomendaciones || '')}</textarea>
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
          Acuerdos consensuados entre la Directora del CEBE y el/la Especialista de Monitoreo para la visita activa.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px">
          <div class="field" style="margin-bottom:0">
            <label for="cebe_comp_director"><strong>DEL DIRECTIVO(A) DEL CEBE:</strong></label>
            <textarea id="cebe_comp_director" class="cebeTextarea" style="min-height:90px" placeholder="Compromisos y acciones que asume la dirección escolar del CEBE...">${esc(compromisosActivos.director || '')}</textarea>
          </div>
          <div class="field" style="margin-bottom:0">
            <label for="cebe_comp_especialista"><strong>DEL MONITOR / ESPECIALISTA AGEBRE:</strong></label>
            <textarea id="cebe_comp_especialista" class="cebeTextarea" style="min-height:90px" placeholder="Acciones de soporte pedagógico, asistencia técnica y acompañamiento que asume el especialista...">${esc(compromisosActivos.especialista || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- Observaciones generales -->
      <div class="panel" style="margin-bottom:24px">
        <div class="sectionHeaderTitle">OBSERVACIONES GENERALES</div>
        <textarea id="cebe_observaciones" class="cebeTextarea" style="min-height:70px" placeholder="Observaciones o notas adicionales de la visita...">${esc(cebeFormState.observaciones || '')}</textarea>
      </div>

      <!-- Barra inferior fija de avance y guardado -->
      <div class="formBottomBar">
        <div class="regProgressBadge" id="cebeBottomBadge">
          Avance: <strong>0 de 34</strong> respondidos (0%) · Puntaje: 0 / 34 pts
        </div>
        <button type="button" class="btn secondary" id="btnCancelarCebe">Cancelar</button>
        <button type="submit" class="btn" id="btnGuardarCebe">${submitLabel}</button>
      </div>
    </form>
  `;

  // Vincular eventos interactivos del formulario CEBE
  bindCebeFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing);
}

/**
 * Vincula la lógica de eventos y cálculos en vivo para CEBE
 */
function bindCebeFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing) {
  const form = host.querySelector('#regForm');
  if (!form) return;

  // Cancelar
  const btnCancel = form.querySelector('#btnCancelarCebe');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      resetCebeFormState();
      if (navigate) navigate('consolidado');
    });
  }

  // Cambio de pestañas de Visita (1, 2, 3)
  form.querySelectorAll('[data-cebe-visita]').forEach(tab => {
    tab.addEventListener('click', () => {
      const targetV = Number(tab.dataset.cebeVisita) || 1;
      if (targetV === cebeFormState.visita) return;

      // Guardar temporalmente valores de la visita saliente en memoria
      guardarMemoriaVisitaActual(form);

      cebeFormState.visita = targetV;
      renderCebeGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
    });
  });

  // Autocompletado del CEBE
  const inpInst = form.querySelector('#f_institucion');
  const dropdown = form.querySelector('#ieDropdown');
  const hint = form.querySelector('#regColegioHint');
  const inpCodLocal = form.querySelector('#cebe_cod_local');
  const inpRei = form.querySelector('#cebe_rei');
  const inpDirNom = form.querySelector('#cebe_dir_nombres');
  const inpDirDni = form.querySelector('#cebe_dir_dni');
  const inpDirTel = form.querySelector('#cebe_dir_tel');
  const inpDirCorreo = form.querySelector('#cebe_dir_correo');
  const selDirCond = form.querySelector('#cebe_dir_cond');

  if (inpInst && dropdown) {
    // Si ya hay un colegio seleccionado en memoria o sub
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
      // Priorizar CEBEs pero permitir buscar cualquiera
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
        const isCebe = (c.modalidad || '').toUpperCase().includes('EBE') || (c.ie || '').toUpperCase().includes('CEBE');
        return `
          <div class="ieDropdownItem" data-col-id="${esc(c.id)}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid #F1F5F9">
            <div style="font-weight:700;font-size:12.5px;color:var(--navy-900)">
              ${esc(c.ie || c.nombre)} ${isCebe ? '<span style="background:#EFF6FF;color:#1E40AF;padding:1px 6px;border-radius:3px;font-size:10px">CEBE</span>' : ''}
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

            // Auto-asignar Especialista Responsable para CEBE
            const cRei = selected.rei || selected.red || '';
            const cReiNorm = normalizeText(cRei);
            let assignedName = '';
            if (selected.responsable && !selected.responsable.includes('@') && !/^\d+$/.test(selected.responsable.trim())) {
              assignedName = selected.responsable.trim();
            } else if (selected.responsableId && state && Array.isArray(state.responsables)) {
              const rMatch = state.responsables.find(r => r.id === selected.responsableId);
              if (rMatch && (rMatch.nombresApellidos || rMatch.especialista)) {
                assignedName = (rMatch.nombresApellidos || rMatch.especialista).trim();
              }
            }
            if (!assignedName && state && Array.isArray(state.responsables)) {
              const ebeList = state.responsables.filter(r => isEbeOrPriteResponsable(r));
              if (ebeList.length > 0) {
                const matchByRed = cReiNorm ? ebeList.find(r => {
                  const rRedNorm = normalizeText(r.red || '');
                  return rRedNorm && (rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm));
                }) : null;
                const chosen = matchByRed || (ebeList.length === 1 ? ebeList[0] : null);
                if (chosen) {
                  assignedName = (chosen.nombresApellidos || chosen.especialista || '').trim();
                }
              }
            }

            if (assignedName) {
              cebeFormState.responsable = assignedName;
              const selResp = form.querySelector('#cebe_responsable');
              if (selResp) selResp.value = assignedName;
              const rHint = form.querySelector('#cebeRespHint');
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

  // ---- Control de selección del Especialista / Monitor Responsable ----
  const selResp = form.querySelector('#cebe_responsable');
  if (selResp) {
    selResp.addEventListener('change', () => {
      cebeFormState.responsable = selResp.value;
      const rHint = form.querySelector('#cebeRespHint');
      if (rHint) {
        rHint.innerHTML = selResp.value
          ? `✓ Especialista asignada: <strong>${esc(selResp.value)}</strong>`
          : 'Seleccione a la especialista de AGEBRE que realizó el monitoreo en esta visita.';
      }
    });
  }

  // ---- Fechas independientes por cada visita (V1, V2, V3) ----
  const inpFecha = form.querySelector('#cebe_fecha_visita');
  if (inpFecha) {
    const onFechaChange = () => {
      const vNow = cebeFormState.visita || 1;
      cebeFormState.fechasVisitas[`v${vNow}`] = inpFecha.value;
    };
    inpFecha.addEventListener('change', onFechaChange);
    inpFecha.addEventListener('input', onFechaChange);
  }

  // Sumas automáticas de estudiantes (Cuadro 3)
  const calcEstudiantesTotales = () => {
    const iniMat = Number(form.querySelector('#cebe_est_ini_mat')?.value) || 0;
    const iniAsis = Number(form.querySelector('#cebe_est_ini_asis')?.value) || 0;
    const priMat = Number(form.querySelector('#cebe_est_pri_mat')?.value) || 0;
    const priAsis = Number(form.querySelector('#cebe_est_pri_asis')?.value) || 0;

    const elTotMat = form.querySelector('#cebe_est_tot_mat');
    const elTotAsis = form.querySelector('#cebe_est_tot_asis');
    if (elTotMat) elTotMat.textContent = iniMat + priMat;
    if (elTotAsis) elTotAsis.textContent = iniAsis + priAsis;
  };

  ['#cebe_est_ini_mat', '#cebe_est_ini_asis', '#cebe_est_pri_mat', '#cebe_est_pri_asis'].forEach(sel => {
    const inp = form.querySelector(sel);
    if (inp) inp.addEventListener('input', calcEstudiantesTotales);
  });

  // Prevenir que la rueda del ratón modifique valores numéricos
  form.querySelectorAll('.cebeNumInp').forEach(inp => {
    inp.addEventListener('wheel', e => e.preventDefault(), { passive: false });
  });

  // Contador dinámico y puntaje
  const updateCebeProgress = () => {
    let answered = 0;
    let naCount = 0;
    let score = 0;
    form.querySelectorAll('.cebeItemRow').forEach(row => {
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

    const activeSections = getActiveCebeSections(ft);
    const totalItemsCount = activeSections.reduce((acc, s) => acc + (s.items ? s.items.length : 0), 0) || TOTAL_CEBE_ITEMS;
    const applicableItems = Math.max(0, totalItemsCount - naCount);
    const pct = Math.round((answered / totalItemsCount) * 100);
    const scorePct = applicableItems > 0 ? Math.round((score / applicableItems) * 100) : 0;

    let estado = 'Inicio';
    let estadoColor = '#DC2626';
    if (scorePct >= 67) { estado = 'Logrado'; estadoColor = '#16A34A'; }
    else if (scorePct >= 34) { estado = 'En proceso'; estadoColor = '#D97706'; }

    const counter = form.querySelector('#cebeProgressCounter');
    if (counter) {
      const naText = naCount > 0 ? ` · <span style="color:#64748B;font-weight:600">${naCount} N.A.</span>` : '';
      counter.innerHTML = `<strong>${answered} de ${totalItemsCount}</strong> respondidos (${pct}%)${naText} · <span style="color:${estadoColor};font-weight:700">${estado}</span>`;
    }

    const bBadge = form.querySelector('#cebeBottomBadge');
    if (bBadge) {
      const naBadgeText = naCount > 0 ? ` (${naCount} N.A.)` : '';
      bBadge.innerHTML = `Avance: <strong>${answered} de ${totalItemsCount}</strong> (${pct}%) · Puntaje: <strong>${score} / ${applicableItems}</strong> pts${naBadgeText} (${scorePct}%) · <span style="color:${estadoColor};font-weight:700">${estado}</span>`;
    }
  };

  form.querySelectorAll('input[type="radio"]').forEach(r => {
    r.addEventListener('change', updateCebeProgress);
  });
  updateCebeProgress();

  // Toggle de visibilidad de área de observaciones/hallazgos por indicador
  form.querySelectorAll('.btnToggleObs').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = btn.dataset.targetObs;
      if (!targetId) return;
      const wrap = form.querySelector('#' + targetId);
      if (!wrap) return;

      const isHidden = (wrap.style.display === 'none' || getComputedStyle(wrap).display === 'none');
      if (isHidden) {
        wrap.style.display = 'block';
        btn.classList.add('active');
        btn.textContent = '✕ Ocultar obs.';
        const ta = wrap.querySelector('textarea, input');
        if (ta) ta.focus();
      } else {
        wrap.style.display = 'none';
        btn.classList.remove('active');
        const ta = wrap.querySelector('textarea, input');
        const hasVal = ta && Boolean(ta.value.trim());
        if (hasVal) {
          btn.classList.add('has-content');
          btn.textContent = '💬 Observación ✓';
        } else {
          btn.classList.remove('has-content');
          btn.textContent = '💬 Observación';
        }
      }
    });
  });

  // Sincronizar texto de observaciones con el estado y botón de CEBE
  form.querySelectorAll('.cebeObsTextarea').forEach(tx => {
    tx.addEventListener('input', () => {
      const row = tx.closest('.cebeItemRow');
      const itemId = row?.dataset?.itemId;
      if (itemId) {
        cebeFormState.evidenciasPorItem[itemId] = tx.value;
      }
      const wrap = tx.closest('.itemObsWrap');
      if (wrap) {
        const btn = form.querySelector(`[data-target-obs="${wrap.id}"]`);
        if (btn) {
          if (tx.value.trim()) {
            btn.classList.add('has-content');
            btn.textContent = '💬 Observación ✓';
          } else {
            btn.classList.remove('has-content');
            btn.textContent = '💬 Observación';
          }
        }
      }
    });
  });

  // Copiar docentes y personal registrados en la primera visita (Visita 1)
  const btnCopiarPersonal = form.querySelector('#btnCopiarPersonalCebeV1');
  if (btnCopiarPersonal) {
    btnCopiarPersonal.onclick = () => {
      const colId = form.dataset.selectedColegioId || cebeFormState.colegioId || '';
      const codLocal = cleanTextCode(form.querySelector('#cebe_cod_local')?.value || cebeFormState.codigoLocal || '');
      const ieName = normalizeText(form.querySelector('#f_institucion')?.value || cebeFormState.institucion || '');

      // 1. Buscar en state.submissions una ficha previa de Visita 1 para este CEBE
      const submissions = Array.isArray(state?.submissions) ? state.submissions : [];
      const subV1 = submissions.find(s => {
        if (!isFichaCebeGestion(s)) return false;
        const vNum = Number(s.visita) || 1;
        if (vNum !== 1) return false;
        if (colId && s.colegioId && s.colegioId === colId) return true;
        if (codLocal && cleanTextCode(s.codigoLocal) === codLocal) return true;
        if (ieName && normalizeText(s.institucion || s.nombreIe || s.ie || '') === ieName) return true;
        return false;
      });

      let personalSource = null;
      let saaneeSource = null;
      let estudiantesSource = null;

      if (subV1) {
        if (subV1.tablasPersonal) {
          personalSource = subV1.tablasPersonal.personal;
          saaneeSource = subV1.tablasPersonal.personalSaanee;
          estudiantesSource = subV1.tablasPersonal.accesoEstudiantes;
        } else {
          personalSource = subV1.personal;
          saaneeSource = subV1.personalSaanee;
          estudiantesSource = subV1.accesoEstudiantes;
        }
      } else if (cebeFormState.personal && Object.keys(cebeFormState.personal).length > 0) {
        personalSource = cebeFormState.personal;
        saaneeSource = cebeFormState.personalSaanee;
        estudiantesSource = cebeFormState.accesoEstudiantes;
      }

      if (!personalSource || Object.keys(personalSource).length === 0) {
        showToast('⚠️ No se encontró registro previo de la Visita 1 con datos de personal para este CEBE.');
        return;
      }

      // Rellenar Cuadro 1: PERSONAL
      Object.keys(personalSource).forEach(k => {
        const inp = form.querySelector(`#cp_${k}`);
        if (inp) {
          inp.value = personalSource[k] !== undefined ? personalSource[k] : '';
        }
        cebeFormState.personal[k] = personalSource[k];
      });

      // Rellenar Cuadro 2: PERSONAL SAANEE
      if (saaneeSource) {
        Object.keys(saaneeSource).forEach(k => {
          const inp = form.querySelector(`#cs_${k}`);
          if (inp) {
            inp.value = saaneeSource[k] !== undefined ? saaneeSource[k] : '';
          }
          cebeFormState.personalSaanee[k] = saaneeSource[k];
        });
      }

      // Rellenar Cuadro 3: ACCESO Y PERMANENCIA
      if (estudiantesSource) {
        ['ini_mat', 'ini_asis', 'ini_noasis', 'pri_mat', 'pri_asis', 'pri_noasis'].forEach(k => {
          const inp = form.querySelector(`#cebe_est_${k}`);
          if (inp && estudiantesSource[k] !== undefined) {
            inp.value = estudiantesSource[k];
          }
        });
        cebeFormState.accesoEstudiantes = { ...estudiantesSource };
        if (typeof calcEstudiantesTotales === 'function') calcEstudiantesTotales();
      }

      showToast('✓ Datos de personal y docentes de Visita 1 copiados con éxito.');
    };
  }

  // Guardado en Firestore
  form.onsubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') {
      e.stopImmediatePropagation();
    }
    await guardarFormularioCebe(form, ft, state, dbNs, currentUser, navigate, isEditing);
  };
}

/**
 * Guarda en memoria local los datos de la visita actual al cambiar entre V1, V2 y V3
 */
function guardarMemoriaVisitaActual(form) {
  if (!form) return;
  const vActiva = cebeFormState.visita || 1;
  const kActiva = `v${vActiva}`;

  // Institución, Código Local, REI
  const instVal = form.querySelector('#f_institucion')?.value.trim();
  if (instVal) cebeFormState.institucion = instVal;
  const codVal = form.querySelector('#cebe_cod_local')?.value.trim();
  if (codVal) cebeFormState.codigoLocal = codVal;
  const reiVal = form.querySelector('#cebe_rei')?.value.trim();
  if (reiVal) cebeFormState.rei = reiVal;
  const respVal = form.querySelector('#cebe_responsable')?.value.trim();
  if (respVal) cebeFormState.responsable = respVal;
  if (form.dataset.selectedColegioId) {
    cebeFormState.colegioId = form.dataset.selectedColegioId;
  }

  // Cuadros numéricos de Personal
  form.querySelectorAll('input[id^="cp_"]').forEach(inp => {
    const k = inp.id.replace('cp_', '');
    cebeFormState.personal[k] = inp.value;
  });

  // Personal SAANEE
  form.querySelectorAll('input[id^="cs_"]').forEach(inp => {
    const k = inp.id.replace('cs_', '');
    cebeFormState.personalSaanee[k] = inp.value;
  });

  // Acceso y Permanencia
  cebeFormState.accesoEstudiantes = {
    ini_mat: form.querySelector('#cebe_est_ini_mat')?.value || '',
    ini_asis: form.querySelector('#cebe_est_ini_asis')?.value || '',
    ini_noasis: form.querySelector('#cebe_est_ini_noasis')?.value || '',
    pri_mat: form.querySelector('#cebe_est_pri_mat')?.value || '',
    pri_asis: form.querySelector('#cebe_est_pri_asis')?.value || '',
    pri_noasis: form.querySelector('#cebe_est_pri_noasis')?.value || ''
  };

  // Fecha
  const inpFecha = form.querySelector('#cebe_fecha_visita');
  if (inpFecha && inpFecha.value) {
    cebeFormState.fechasVisitas[kActiva] = inpFecha.value;
  }

  // Niveles
  cebeFormState.nivelesAtiende.inicial = Boolean(form.querySelector('#cebe_niv_inicial')?.checked);
  cebeFormState.nivelesAtiende.primaria = Boolean(form.querySelector('#cebe_niv_primaria')?.checked);

  // Directora
  cebeFormState.director.nombres = form.querySelector('#cebe_dir_nombres')?.value.trim() || '';
  cebeFormState.director.dni = form.querySelector('#cebe_dir_dni')?.value.trim() || '';
  cebeFormState.director.telefono = form.querySelector('#cebe_dir_tel')?.value.trim() || '';
  cebeFormState.director.condicion = form.querySelector('#cebe_dir_cond')?.value || 'Designada';
  cebeFormState.director.correo = form.querySelector('#cebe_dir_correo')?.value.trim() || '';

  // Respuestas y evidencias
  if (!cebeFormState.respuestasPorVisita[kActiva]) cebeFormState.respuestasPorVisita[kActiva] = {};
  form.querySelectorAll('.cebeItemRow').forEach(row => {
    const iid = row.dataset.itemId;
    const chk = row.querySelector('input[type="radio"]:checked');
    const evid = row.querySelector('.cebeEvidInp')?.value.trim() || '';
    if (chk) {
      cebeFormState.respuestasPorVisita[kActiva][iid] = chk.value;
    }
    if (evid) {
      cebeFormState.evidenciasPorItem[iid] = evid;
    }
  });

  // Síntesis IV
  cebeFormState.sintesisPorVisita.v1.logros = form.querySelector('#cebe_logros_v1')?.value.trim() || '';
  cebeFormState.sintesisPorVisita.v2.logros = form.querySelector('#cebe_logros_v2')?.value.trim() || '';
  cebeFormState.sintesisPorVisita.v3.logros = form.querySelector('#cebe_logros_v3')?.value.trim() || '';

  cebeFormState.sintesisPorVisita.v1.mejoras = form.querySelector('#cebe_mejoras_v1')?.value.trim() || '';
  cebeFormState.sintesisPorVisita.v2.mejoras = form.querySelector('#cebe_mejoras_v2')?.value.trim() || '';
  cebeFormState.sintesisPorVisita.v3.mejoras = form.querySelector('#cebe_mejoras_v3')?.value.trim() || '';

  cebeFormState.sintesisPorVisita.v1.recomendaciones = form.querySelector('#cebe_rec_v1')?.value.trim() || '';
  cebeFormState.sintesisPorVisita.v2.recomendaciones = form.querySelector('#cebe_rec_v2')?.value.trim() || '';
  cebeFormState.sintesisPorVisita.v3.recomendaciones = form.querySelector('#cebe_rec_v3')?.value.trim() || '';

  // Compromisos V
  if (!cebeFormState.compromisosPorVisita[kActiva]) cebeFormState.compromisosPorVisita[kActiva] = { director: '', especialista: '', adicionales: [] };
  cebeFormState.compromisosPorVisita[kActiva].director = form.querySelector('#cebe_comp_director')?.value.trim() || '';
  cebeFormState.compromisosPorVisita[kActiva].especialista = form.querySelector('#cebe_comp_especialista')?.value.trim() || '';

  // Observaciones
  cebeFormState.observaciones = form.querySelector('#cebe_observaciones')?.value.trim() || '';
}

let isSavingCebe = false;

/**
 * Recolecta el payload completo y guarda en Firestore
 */
export async function guardarFormularioCebe(form, ft, state, dbNs, currentUser, navigate, isEditing = false) {
  if (isSavingCebe) {
    console.warn('guardarFormularioCebe: guardado en proceso, ignorando invocación duplicada.');
    return;
  }
  isSavingCebe = true;

  const btnSubmit = form.querySelector('#btnGuardarCebe');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.textContent = 'Guardando en base de datos...';
  }

  try {
    guardarMemoriaVisitaActual(form);

    const vActiva = cebeFormState.visita || 1;
    const kActiva = `v${vActiva}`;
    const inpFecha = form.querySelector('#cebe_fecha_visita');
    if (inpFecha && inpFecha.value) {
      cebeFormState.fechasVisitas[kActiva] = inpFecha.value;
    }
    const fechaActiva = cebeFormState.fechasVisitas[kActiva] || todayStr();

    const institucion = form.querySelector('#f_institucion')?.value.trim() || '';
    const codLocal = form.querySelector('#cebe_cod_local')?.value.trim() || '';
    const ugel = form.querySelector('#cebe_ugel')?.value.trim() || 'UGEL 03';
    const rei = form.querySelector('#cebe_rei')?.value.trim() || '';

    if (!institucion) {
      showToast('Ingresa o selecciona el nombre del CEBE.');
      form.querySelector('#f_institucion')?.focus();
      return;
    }

    const respInputVal = form.querySelector('#cebe_responsable')?.value.trim() || cebeFormState.responsable || '';
    if (!respInputVal) {
      showToast('Por favor selecciona la especialista que ejecutó el monitoreo.');
      form.querySelector('#cebe_responsable')?.focus();
      return;
    }
    let responsableName = respInputVal;

    // Recolectar cuadros numéricos
    const personal = {};
    form.querySelectorAll('input[id^="cp_"]').forEach(inp => {
      const k = inp.id.replace('cp_', '');
      personal[k] = inp.value;
    });

    const personalSaanee = {};
    form.querySelectorAll('input[id^="cs_"]').forEach(inp => {
      const k = inp.id.replace('cs_', '');
      personalSaanee[k] = inp.value;
    });

    const accesoEstudiantes = {
      ini_mat: form.querySelector('#cebe_est_ini_mat')?.value || '',
      ini_asis: form.querySelector('#cebe_est_ini_asis')?.value || '',
      ini_noasis: form.querySelector('#cebe_est_ini_noasis')?.value || '',
      pri_mat: form.querySelector('#cebe_est_pri_mat')?.value || '',
      pri_asis: form.querySelector('#cebe_est_pri_asis')?.value || '',
      pri_noasis: form.querySelector('#cebe_est_pri_noasis')?.value || ''
    };

    // Respuestas del formato estándar para compatibilidad con cálculos y reportes
    const respuestas = [];
    const respuestasMap = cebeFormState.respuestasPorVisita[kActiva] || {};

    let answeredCount = 0;
    let naCount = 0;
    let scorePuntos = 0;

    const activeSections = getActiveCebeSections(ft);
    const totalItemsCount = activeSections.reduce((acc, s) => acc + (s.items ? s.items.length : 0), 0) || TOTAL_CEBE_ITEMS;

    activeSections.forEach(sec => {
      (sec.items || []).forEach(it => {
        const val = respuestasMap[it.id] || null;
        const evid = cebeFormState.evidenciasPorItem[it.id] || '';
        if (val) {
          answeredCount++;
          if (val === 'logrado') scorePuntos += 1;
          else if (val === 'proceso') scorePuntos += 0.5;
          else if (val === 'na' || val === 'no_aplica') naCount++;
        }
        respuestas.push({
          id: it.id,
          texto: it.texto,
          seccion: sec.nombre,
          valor: val,
          evidencia: evid
        });
      });
    });

    const applicableItems = Math.max(0, totalItemsCount - naCount);
    const pct = Math.round((answeredCount / totalItemsCount) * 100);
    const scorePct = applicableItems > 0 ? Math.round((scorePuntos / applicableItems) * 100) : 0;

    let estadoTexto = 'Inicio';
    if (scorePct >= 67) estadoTexto = 'Logrado';
    else if (scorePct >= 34) estadoTexto = 'En proceso';

    // Compromisos estructurados
    const compActivos = cebeFormState.compromisosPorVisita[kActiva] || { director: '', especialista: '', adicionales: [] };
    const compromisos = [];
    if (compActivos.director) {
      compromisos.push({ texto: compActivos.director, responsable: 'Director(a) del CEBE', plazo: 'Año escolar 2026' });
    }
    if (compActivos.especialista) {
      compromisos.push({ texto: compActivos.especialista, responsable: 'Especialista AGEBRE', plazo: 'Seguimiento continuo' });
    }

    // Síntesis estructurada
    const sintesis = [
      { dimension: 'Logros relevantes observados', descripcion: cebeFormState.sintesisPorVisita[kActiva]?.logros || '' },
      { dimension: 'Aspectos de mejora', descripcion: cebeFormState.sintesisPorVisita[kActiva]?.mejoras || '' },
      { dimension: 'Recomendaciones', descripcion: cebeFormState.sintesisPorVisita[kActiva]?.recomendaciones || '' }
    ];

    const docData = {
      fichaTypeId: ft.id || 'ft_gestion_cebe',
      fichaTypeNombre: ft.nombre || 'Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE',
      modalidad: 'EBE',
      escala: 'IPL',
      tipoRespuesta: 'ips',
      institucion,
      codigoLocal: codLocal,
      codigoModular: (() => {
        const col = (state.colegios || []).find(c => (form.dataset.selectedColegioId && c.id === form.dataset.selectedColegioId) || (codLocal && (c.codigoLocal === codLocal || c.codLocal === codLocal)));
        return col ? (col.codigoModular || col.codModular || '') : '';
      })(),
      colegioId: form.dataset.selectedColegioId || cebeFormState.colegioId || null,
      ugel,
      red: normalizeReiNumber(rei) || '13',
      rei: normalizeReiNumber(rei) || '13',
      fecha: fechaActiva,
      visita: vActiva,
      responsable: responsableName,
      director: {
        nombre: cebeFormState.director.nombres,
        dni: cebeFormState.director.dni,
        telefono: cebeFormState.director.telefono,
        condicion: cebeFormState.director.condicion,
        correo: cebeFormState.director.correo
      },
      directorNombre: cebeFormState.director.nombres,
      directorDni: cebeFormState.director.dni,
      fechasVisitas: { ...cebeFormState.fechasVisitas },
      nivelesAtiende: cebeFormState.nivelesAtiende,
      tablasPersonal: {
        personal,
        personalSaanee,
        accesoEstudiantes
      },
      respuestas,
      respuestasPorVisita: cebeFormState.respuestasPorVisita,
      evidenciasPorItem: cebeFormState.evidenciasPorItem,
      sintesis,
      sintesisPorVisita: cebeFormState.sintesisPorVisita,
      compromisos,
      compromisosPorVisita: cebeFormState.compromisosPorVisita,
      observaciones: cebeFormState.observaciones,
      puntaje: scorePuntos,
      porcentaje: scorePct,
      estado: estadoTexto,
      totalItems: totalItemsCount,
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
      showToast('✓ Ficha CEBE actualizada exitosamente.');
    } else {
      targetId = genId();
      docData.createdAt = Date.now();
      docData.createdBy = currentUser?.uid || '';
      await dbNs.collection('submissions').doc(targetId).set(docData);
      showToast('✓ Ficha CEBE registrada exitosamente.');
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

    resetCebeFormState();
    if (navigate) navigate('consolidado');
  } catch (err) {
    console.error('Error guardando ficha CEBE:', err);
    showToast('Error al guardar: ' + (err.message || 'Intente nuevamente.'));
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = isEditing ? 'Actualizar ficha CEBE' : 'Guardar ficha CEBE';
    }
  } finally {
    isSavingCebe = false;
  }
}
