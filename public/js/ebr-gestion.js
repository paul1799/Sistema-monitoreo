/* =========================================================================
   ebr-gestion.js — Módulo especializado para la Ficha:
   "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
   Manejo de versiones Visita 1 (19 ítems) y Visita 2 (23 ítems con tablas
   de docentes R1–R5, I–IV), cálculo en tiempo real, validaciones y modelo de datos.
   ========================================================================= */

import { esc, normalizeText, showToast, genId, fmtDate as formatDate, todayStr } from './ui.js?v=20260925_v8';
import { getDirectivosActivosForColegio, cleanTextCode, syncDirectivosFromFicha, isPlaceholderDirectivo } from './directorio.js?v=20260925_v8';

/** Rúbricas oficiales de observación de aula (MINEDU) */
export const RUBRICAS_OBSERVACION_AULA = [
  { id: 'R1', corto: 'R1: Involucra activamente', nombre: 'Involucra activamente a los estudiantes en el proceso de aprendizaje' },
  { id: 'R2', corto: 'R2: Razonamiento y creatividad', nombre: 'Promueve el razonamiento, la creatividad y/o el pensamiento crítico' },
  { id: 'R3', corto: 'R3: Evalúa y retroalimenta', nombre: 'Evalúa el progreso de los aprendizajes para retroalimentar a los estudiantes y adecuar la enseñanza' },
  { id: 'R4', corto: 'R4: Respeto y proximidad', nombre: 'Propicia un ambiente de respeto y proximidad' },
  { id: 'R5', corto: 'R5: Regula comportamiento', nombre: 'Regula positivamente el comportamiento de los estudiantes' }
];

/** Ítems oficiales de Visita 1 (19 ítems · Escala Inicio / Proceso / Logrado) */
export const EBR_GESTION_VISITA_1_SECCIONES = [
  {
    nombre: 'Monitoreo y acompañamiento a la práctica docente',
    numRomano: '4.1',
    items: [
      {
        id: 'ge1_1',
        num: 1,
        texto: 'El equipo directivo cuenta con Plan de Monitoreo y Acompañamiento, el cual incluye una matriz de diagnóstico de necesidades formativas y el cronograma correspondiente, el cual ha sido socializado.',
        evidencia: 'Plan de monitoreo con matriz diagnóstica, cronograma y acta de reunión colegiada.'
      },
      {
        id: 'ge1_2',
        num: 2,
        texto: 'El equipo directivo realiza la sistematización del monitoreo a la práctica pedagógica en sus tres etapas (inicio, proceso y salida).',
        evidencia: 'Resultados del monitoreo en tablas o gráficos estadísticos.'
      },
      {
        id: 'ge1_3',
        num: 3,
        texto: 'El equipo directivo, a partir del análisis del monitoreo a la práctica docente, identifica logros y necesidades formativas, los cuales son socializados en las semanas de gestión.',
        evidencia: 'Análisis cualitativo y cuantitativo. Actas de reuniones.'
      }
    ]
  },
  {
    nombre: 'Fortalecimiento docente',
    numRomano: '4.2',
    items: [
      {
        id: 'ge1_4',
        num: 4,
        texto: 'El equipo directivo ejecuta y gestiona espacios de fortalecimiento alineados a las necesidades formativas detectadas y realiza el seguimiento a los compromisos de mejora asumidos.',
        evidencia: 'Registro de asistencia / Actas / Plan de fortalecimiento / Matriz de seguimiento.'
      },
      {
        id: 'ge1_5',
        num: 5,
        texto: 'El equipo directivo cuenta con un plan de acciones formativas donde considera la realización de GIA, microtalleres, pasantías, etc.',
        evidencia: 'Plan, cronograma de actividades.'
      }
    ]
  },
  {
    nombre: 'Evaluación de los aprendizajes / Refuerzo escolar',
    numRomano: '4.3',
    items: [
      {
        id: 'ge1_6',
        num: 6,
        texto: 'Los directivos sistematizan, analizan y reflexionan sobre los resultados de la evaluación diagnóstica por competencias.',
        evidencia: 'Sistematización, análisis cuantitativo y cualitativo.'
      },
      {
        id: 'ge1_7',
        num: 7,
        texto: 'Cuenta con la planificación de las actividades para la aplicación de la Evaluación Diagnóstica.',
        evidencia: 'Cronograma de aplicación.'
      },
      {
        id: 'ge1_8',
        num: 8,
        texto: 'El directivo sistematiza, analiza y reflexiona sobre los resultados de aprendizaje de la evaluación diagnóstica por competencias de las áreas de Comunicación y Matemática, a fin de proponer acciones de mejora. (Primaria y Secundaria)',
        evidencia: 'Informe de resultados de la evaluación diagnóstica de Matemática y Comunicación.'
      },
      {
        id: 'ge1_9',
        num: 9,
        texto: 'En la I.E. se ejecutan jornadas informativas con los PP.FF. sobre los aprendizajes, reportando avances en los niveles de logro y el establecimiento de compromisos de mejora.',
        evidencia: 'Registro de asistencia, actas, informes.'
      },
      {
        id: 'ge1_10',
        num: 10,
        texto: 'La IE ha establecido el horario de los docentes para implementar las acciones del R.E. de acuerdo con lo establecido en la RVM N.° 094-2025-MINEDU.',
        evidencia: 'Horarios.'
      },
      {
        id: 'ge1_11',
        num: 11,
        texto: '¿La IE ha incluido en el PAT las acciones para implementar RE? (Desarrollo de la evaluación diagnóstica; difusión, sensibilización e información dirigidas a la comunidad educativa; monitoreo a la práctica docente respecto al Refuerzo Escolar; la evaluación de salida). (Primaria y Secundaria)',
        evidencia: 'PAT, actividades.'
      },
      {
        id: 'ge1_12',
        num: 12,
        texto: 'El equipo directivo realiza acciones de monitoreo y acompañamiento a la implementación de Refuerzo Escolar en cada etapa.',
        evidencia: 'Fichas de monitoreo.'
      }
    ]
  },
  {
    nombre: 'Uso de materiales y espacios educativos',
    numRomano: '4.4',
    items: [
      {
        id: 'ge1_13',
        num: 13,
        texto: 'El equipo directivo genera y promueve espacios de fortalecimiento docente sobre el uso pedagógico de los materiales educativos.',
        evidencia: 'Actas, registro de asistencia, ruta metodológica.'
      },
      {
        id: 'ge1_14',
        num: 14,
        texto: 'El equipo directivo monitorea el uso adecuado de los materiales educativos en las sesiones de aprendizaje.',
        evidencia: 'Ficha de monitoreo, memorándum, etc.'
      },
      {
        id: 'ge1_15',
        num: 15,
        texto: 'El equipo directivo promueve el uso de espacios educativos de la I.E., así como el empleo de materiales educativos diversos, generando mejores condiciones para los aprendizajes (laboratorios, talleres, bibliotecas, aulas flexibles, AIP, entre otros).',
        evidencia: 'Memorandos cursados por el directivo, sesiones de aprendizaje, ficha de monitoreo, informe del CIST.'
      },
      {
        id: 'ge1_16',
        num: 16,
        texto: 'El Profesor de Innovación Pedagógica (PIP) realiza acciones de fortalecimiento con la comunidad educativa, promoviendo la incorporación de las TIC en los procesos pedagógicos, siguiendo el plan de trabajo elaborado y cumpliendo con presentar el reporte de las actividades realizadas.',
        evidencia: 'Plan de trabajo / actas de reuniones, evidencias de actividades / informe PIP.'
      }
    ]
  },
  {
    nombre: 'Otros aspectos',
    numRomano: '4.5',
    items: [
      {
        id: 'ge1_17',
        num: 17,
        texto: 'Plan lector: Se cuenta con Plan Lector aprobado con RD y en el PAT, y considera las etapas; muestra la implementación según cronograma.',
        evidencia: 'RD de aprobación, PAT, informe de avance de actividades del Plan Lector.'
      },
      {
        id: 'ge1_18',
        num: 18,
        texto: 'Implementación del enfoque ambiental: La IE cuenta con el Proyecto Educativo Ambiental Integrado (PEAI) y RD de conformación de las Brigadas de Educación Ambiental y Gestión de Riesgo de Desastres, además de monitorear el cumplimiento de sus funciones y realizar el seguimiento de las actividades propuestas en el plan de trabajo.',
        evidencia: 'PEAI / RD Brigadas.'
      },
      {
        id: 'ge1_19',
        num: 19,
        texto: 'Innovación educativa: El directivo ha identificado e implementado buenas prácticas (pedagógicas y/o de gestión) y/o proyecto(s) de innovación en la IE y los ha incluido en el PAT. Además, presenta evidencias de los avances o resultados de la implementación.',
        evidencia: 'Proyectos de innovación o productivos.',
        tieneProyectosList: true
      }
    ]
  }
];

/** Ítems oficiales de Visita 2 (23 ítems · Escala Inicio / Proceso / Logrado) */
export const EBR_GESTION_VISITA_2_SECCIONES = [
  {
    nombre: 'Monitoreo y acompañamiento a la práctica docente',
    numRomano: '6.1',
    items: [
      {
        id: 'ge2_1',
        num: 1,
        texto: 'El equipo directivo realiza el monitoreo y acompañamiento a los docentes según el cronograma establecido, promoviendo un diálogo reflexivo con cada docente visitado.',
        evidencia: 'Fichas de monitoreo y diálogo reflexivo; evidencias de retroalimentación.'
      },
      {
        id: 'ge2_2',
        num: 2,
        texto: 'El equipo directivo realiza la sistematización del monitoreo a la práctica pedagógica en sus tres etapas (inicio, proceso y salida).',
        evidencia: 'Resultados del monitoreo en tablas o gráficos estadísticos.'
      },
      {
        id: 'ge2_3',
        num: 3,
        texto: 'El equipo directivo, a partir del análisis del monitoreo a la práctica docente, identifica logros y necesidades formativas, los cuales son socializados en las semanas de gestión.',
        evidencia: 'Análisis cualitativo y cuantitativo. Actas de reuniones.'
      }
    ]
  },
  {
    nombre: 'Fortalecimiento docente',
    numRomano: '6.2',
    items: [
      {
        id: 'ge2_4',
        num: 4,
        texto: 'El equipo directivo promueve la participación de los docentes en las ofertas formativas brindadas por MINEDU, DRELM o UGEL y realiza el seguimiento.',
        evidencia: 'Memorándums, actas, correos.'
      },
      {
        id: 'ge2_5',
        num: 5,
        texto: 'El equipo directivo ejecuta acciones formativas, en relación con las necesidades encontradas, como Grupos de Interaprendizaje (GIA), microtalleres, pasantías, etc., de acuerdo con el cronograma establecido en su plan.',
        evidencia: 'Plan de acciones formativas, registro de asistencia, ruta metodológica, evidencia fotográfica.'
      }
    ]
  },
  {
    nombre: 'Evaluación de los aprendizajes / Refuerzo escolar',
    numRomano: '6.3',
    items: [
      {
        id: 'ge2_6',
        num: 6,
        texto: 'El equipo directivo sistematiza, analiza y reflexiona sobre los resultados de aprendizaje por competencias en las áreas de Comunicación y Matemática, con el propósito de proponer acciones de mejora.',
        evidencia: 'Sistematización, análisis cuantitativo y cualitativo, actas, informes de reflexión pedagógica, plan de mejora.'
      },
      {
        id: 'ge2_7',
        num: 7,
        texto: 'A partir de la evaluación diagnóstica, la IE incorpora en su PAT metas de aprendizaje contextualizadas que responden a las características y necesidades de los estudiantes.',
        evidencia: 'PAT actualizado de la IE.'
      },
      {
        id: 'ge2_8',
        num: 8,
        texto: 'Se cuenta con evidencias para el reporte del informe de las actividades de atención diferenciada realizadas con los estudiantes en el horario de RE. Primaria PM 373 – Inst. 749. Secundaria PM 377 – Inst. 763.',
        evidencia: 'Informe que describe estrategias y/o actividades de atención diferenciada de Comunicación y Matemática; contiene imágenes de sesiones de refuerzo.'
      },
      {
        id: 'ge2_9',
        num: 9,
        texto: 'Se cuenta con evidencias de fortalecimiento y/o acompañamiento pedagógico a los docentes sobre Refuerzo Escolar (Primaria y Secundaria). Se ha preparado el informe para el registro en SIMON. Primaria PM 373 – Inst. 749. Secundaria PM 377 – Inst. 763.',
        evidencia: 'Informe que describe acciones de fortalecimiento a docentes sobre RE en Matemática y Comunicación; fichas de acompañamiento a docentes de RE.'
      }
    ]
  },
  {
    nombre: 'Uso de materiales y espacios educativos',
    numRomano: '6.4',
    items: [
      {
        id: 'ge2_10',
        num: 10,
        texto: 'El equipo directivo realiza acciones de fortalecimiento docente sobre el uso pedagógico de los materiales educativos.',
        evidencia: 'Actas, registro de asistencia, ruta metodológica.'
      },
      {
        id: 'ge2_11',
        num: 11,
        texto: 'El equipo directivo monitorea el uso adecuado de los cuadernos de trabajo y textos escolares en las sesiones de aprendizaje.',
        evidencia: 'Ficha de monitoreo, memorándum, sesiones de aprendizaje, etc.'
      },
      {
        id: 'ge2_12',
        num: 12,
        texto: 'Cuenta con espacios lúdicos matemáticos implementados con materiales concretos proporcionados por el MINEDU u otros. (Primaria y Secundaria)',
        evidencia: 'Registro de uso, sesiones de aprendizaje, espacios lúdicos, sectores u otros.'
      },
      {
        id: 'ge2_13',
        num: 13,
        texto: 'El equipo directivo promueve el uso de espacios y materiales educativos diversos, generando mejores condiciones para los aprendizajes (laboratorios, talleres, bibliotecas, aulas flexibles, AIP, entre otros).',
        evidencia: 'Memorandos cursados por el directivo, sesiones de aprendizaje, ficha de monitoreo, informe del CIST, otros.'
      },
      {
        id: 'ge2_14',
        num: 14,
        texto: 'El Profesor de Innovación Pedagógica (PIP) realiza acciones de fortalecimiento con la comunidad educativa, promoviendo la incorporación de las TIC en los procesos pedagógicos. (Primaria y Secundaria)',
        evidencia: 'Plan de trabajo / actas de reuniones / actividades / informe PIP.'
      },
      {
        id: 'ge2_15',
        num: 15,
        texto: 'El equipo directivo realiza el seguimiento al plan de trabajo del PIP, cumpliendo con presentar el reporte de las actividades realizadas. (Primaria y Secundaria)',
        evidencia: 'Plan de trabajo actualizado, fichas de seguimiento.'
      },
      {
        id: 'ge2_16',
        num: 16,
        texto: 'En la IE se realiza el monitoreo a la implementación de la estrategia Khan Academy, cuyo cierre está programado hasta el 30 de octubre en la plataforma Mundo IE.',
        evidencia: 'Cuaderno de registro del aula de innovación pedagógica; sesiones de aprendizaje con uso de la plataforma Khan Academy; fichas de monitoreo del 3.er momento.'
      }
    ]
  },
  {
    nombre: 'Otros aspectos',
    numRomano: '6.5',
    items: [
      {
        id: 'ge2_17',
        num: 17,
        texto: 'Innovación educativa: El directivo ha identificado e implementado buenas prácticas (pedagógicas y/o de gestión) y/o proyecto(s) de innovación en la IE y los ha incluido en el PAT actualizado.',
        evidencia: 'Ficha de identificación de buenas prácticas, PAT actualizado, hojas de resumen del proyecto de innovación o buena práctica.',
        tieneProyectosList: true
      },
      {
        id: 'ge2_18',
        num: 18,
        texto: 'Presenta evidencias de los avances o resultados de la implementación de buenas prácticas o proyectos innovadores.',
        evidencia: 'Tablero de control u otro instrumento de sistematización o seguimiento del avance de las BP en la IE.'
      },
      {
        id: 'ge2_19',
        num: 19,
        texto: 'Plan lector: Ha monitoreado la implementación de las actividades consideradas en el Plan Lector según la RVM N.° 062-2021-MINEDU.',
        evidencia: 'Informe del comité de Plan Lector sobre las acciones realizadas, fichas de monitoreo.'
      },
      {
        id: 'ge2_20',
        num: 20,
        texto: 'Ha aplicado la ficha de monitoreo en el momento/hora de la lectura.',
        evidencia: 'Ficha de monitoreo.'
      },
      {
        id: 'ge2_21',
        num: 21,
        texto: 'Implementación del enfoque ambiental – PEAI: Monitorea la implementación de actividades según el PEAI propuestas en el plan de trabajo.',
        evidencia: 'Informes, reportes, otros.'
      },
      {
        id: 'ge2_22',
        num: 22,
        texto: 'Vida activa y saludable: Presenta el Plan de Trabajo de Vida Activa y Saludable.',
        evidencia: 'Plan de trabajo.'
      },
      {
        id: 'ge2_23',
        num: 23,
        texto: 'Registra en el SIMON el Plan de monitoreo 393 – Inst. 794 (hasta el 30 de agosto) y 795 (hasta el 18 de diciembre).',
        evidencia: 'Informe o reportes.'
      }
    ]
  }
];

/**
 * Determina con alta precisión si una plantilla corresponde a la Ficha EBR de Gestión Escolar
 */
export function isFichaEbrGestionEscolar(ft) {
  if (!ft) return false;
  if (ft.id === 'ft_gestion_ugel03_ebr') return true;
  const n = normalizeText(ft.nombre || '');
  // Excluir la ficha de 1er momento (diagnostico) que tambien menciona gestion escolar EBR
  if (n.includes('1er momento') || n.includes('1.er momento') || n.includes('diagnostico') || ft.id === 'ft_ebr_gestion_1er') return false;
  return n.includes('gestion escolar') && (n.includes('ebr') || n.includes('ugel 03 ebr') || n.includes('ugel 03'));
}

/**
 * Estado en memoria para el formulario activo de EBR Gestión Escolar
 */
let ebrFormState = {
  visita: null, // 1 | 2 | null
  formacionTecnica: false,
  codigoLocal: '',
  red: '',
  director: {
    nombres: '',
    dni: '',
    telefono: '',
    condicion: 'D',
    correo: ''
  },
  subdirectores: [],
  docentesMomento1: [],
  docentesMomento2: [],
  respuestas: {},
  observacionesItems: {},
  proyectosInnovacion: [''],
  sintesis: {
    logros: '',
    aspectosMejora: '',
    recomendaciones: ''
  },
  compromisoDirector: '',
  compromisoMonitor: '',
  compromisosAdicionales: []
};

/**
 * Inicializa filas por defecto para las tablas de docentes (Inicial, Primaria, Secundaria)
 */
export function createDefaultDocentesRows() {
  const niveles = ['Inicial', 'Primaria', 'Secundaria'];
  return niveles.map(n => ({
    id: genId(),
    nivel: n,
    noAplica: false,
    total: '',
    monitoreados: '',
    noMonitoreados: 0,
    R1: ['', '', '', ''],
    R2: ['', '', '', ''],
    R3: ['', '', '', ''],
    R4: ['', '', '', ''],
    R5: ['', '', '', '']
  }));
}

/**
 * Migra totales históricos planos a filas estructuradas de docentes
 */
export function migrateLegacyEbrTotals(sub) {
  if (!sub) return null;
  const m1 = createDefaultDocentesRows();
  const m2 = createDefaultDocentesRows();

  const extras = sub.extras || [];
  const getExVal = (pattern) => {
    const found = extras.find(x => x && x.label && normalizeText(x.label).includes(normalizeText(pattern)));
    return found ? Number(found.value) || 0 : 0;
  };

  // Mapear momento 1
  m1[0].total = getExVal('docentes inicial 1er') || getExVal('docentes inicial') || '';
  m1[1].total = getExVal('docentes primaria 1er') || getExVal('docentes primaria') || '';
  m1[2].total = getExVal('docentes secundaria 1er') || getExVal('docentes secundaria') || '';

  // Mapear momento 2
  m2[0].total = getExVal('docentes inicial 2do') || '';
  m2[1].total = getExVal('docentes primaria 2do') || '';
  m2[2].total = getExVal('docentes secundaria 2do') || '';

  return { momento1: m1, momento2: m2 };
}

/**
 * Obtiene el estado actual del formulario EBR
 */
export function getEbrFormState() {
  return ebrFormState;
}

/**
 * Resetea el estado del formulario EBR
 */
export function resetEbrFormState() {
  ebrFormState = {
    visita: null,
    colegioId: '',
    institucion: '',
    fecha: todayStr(),
    formacionTecnica: false,
    codigoLocal: '',
    red: '',
    director: { nombres: '', dni: '', telefono: '', condicion: 'D', correo: '' },
    subdirectores: [
      { id: genId(), nombres: '', dni: '', telefono: '', condicion: 'D', correo: '' }
    ],
    docentesMomento1: createDefaultDocentesRows(),
    docentesMomento2: createDefaultDocentesRows(),
    respuestas: {},
    observacionesItems: {},
    proyectosInnovacion: [''],
    sintesis: { logros: '', aspectosMejora: '', recomendaciones: '' },
    compromisoDirector: '',
    compromisoMonitor: '',
    compromisosAdicionales: []
  };
}

/**
 * Precarga el estado a partir de una ficha guardada previamente (modo edición)
 */
export function preloadEbrFormState(sub, ft) {
  resetEbrFormState();
  if (!sub) return;

  ebrFormState.visita = sub.visita === 2 ? 2 : 1;
  ebrFormState.colegioId = sub.colegioId || (sub.ie && sub.ie.id) || '';
  ebrFormState.institucion = sub.institucion || '';
  ebrFormState.fecha = sub.fecha || todayStr();
  ebrFormState.codigoLocal = (sub.ie && sub.ie.codigoLocal) || sub.codigoModular || '';
  ebrFormState.red = (sub.ie && sub.ie.red) || sub.red || '';
  ebrFormState.formacionTecnica = (sub.ie && sub.ie.formacionTecnica) === true;

  if (sub.director && typeof sub.director === 'object') {
    ebrFormState.director = {
      nombres: sub.director.nombres || sub.director.nombre || '',
      dni: sub.director.dni || '',
      telefono: sub.director.telefono || '',
      condicion: sub.director.condicion || 'D',
      correo: sub.director.correo || ''
    };
  } else if (sub.director) {
    ebrFormState.director.nombres = sub.director;
    ebrFormState.director.dni = sub.directorDni || '';
    ebrFormState.director.condicion = sub.condicion || 'D';
  }

  if (Array.isArray(sub.subdirectores) && sub.subdirectores.length > 0) {
    ebrFormState.subdirectores = sub.subdirectores.map(sd => ({
      id: genId(),
      nombres: sd.nombres || sd.nombre || '',
      dni: sd.dni || '',
      telefono: sd.telefono || '',
      condicion: sd.condicion || 'D',
      correo: sd.correo || ''
    }));
  }

  // Cargar tablas de docentes si existen o migrar de campos planos
  if (sub.docentes && (sub.docentes.momento1 || sub.docentes.momento2)) {
    ebrFormState.docentesMomento1 = (sub.docentes.momento1 || createDefaultDocentesRows()).map(r => ({ ...r, id: r.id || genId() }));
    ebrFormState.docentesMomento2 = (sub.docentes.momento2 || createDefaultDocentesRows()).map(r => ({ ...r, id: r.id || genId() }));
  } else {
    const migrated = migrateLegacyEbrTotals(sub);
    if (migrated) {
      ebrFormState.docentesMomento1 = migrated.momento1;
      ebrFormState.docentesMomento2 = migrated.momento2;
    }
  }

  // Respuestas y observaciones
  (sub.respuestas || []).forEach(r => {
    if (!r) return;
    const v = r.valor || '';
    if (r.id) {
      ebrFormState.respuestas[r.id] = v;
      const normId = String(r.id).replace(/^ge\d*_/, 'ge_');
      ebrFormState.respuestas[normId] = v;
      const v2Id = normId.replace(/^ge_/, 'ge2_');
      ebrFormState.respuestas[v2Id] = v;
      const v1Id = normId.replace(/^ge_/, 'ge1_');
      ebrFormState.respuestas[v1Id] = v;
    }
    if (r.num) {
      ebrFormState.respuestas[`num_${r.num}`] = v;
    }
    if (r.observaciones) {
      ebrFormState.observacionesItems[r.id] = r.observaciones;
      const normId = String(r.id).replace(/^ge\d*_/, 'ge_');
      ebrFormState.observacionesItems[normId] = r.observaciones;
    }
  });

  // Proyectos de innovación
  if (Array.isArray(sub.proyectosInnovacion) && sub.proyectosInnovacion.length > 0) {
    ebrFormState.proyectosInnovacion = [...sub.proyectosInnovacion];
  }

  // Síntesis
  if (sub.sintesis && Array.isArray(sub.sintesis) && sub.sintesis[0]) {
    ebrFormState.sintesis = {
      logros: sub.sintesis[0].logros || '',
      aspectosMejora: sub.sintesis[0].dificultades || sub.sintesis[0].aspectosMejora || '',
      recomendaciones: sub.sintesis[0].recomendaciones || ''
    };
  } else if (sub.logros || sub.aspectosMejora || sub.recomendaciones) {
    ebrFormState.sintesis = {
      logros: sub.logros || '',
      aspectosMejora: sub.aspectosMejora || '',
      recomendaciones: sub.recomendaciones || ''
    };
  }

  // Compromisos (soporta tanto objeto { directivo, especialista } como array o campos planos)
  ebrFormState.compromisoDirector = sub.compromisoDirector || (sub.compromisos && typeof sub.compromisos === 'object' && !Array.isArray(sub.compromisos) ? (sub.compromisos.directivo || '') : '') || '';
  ebrFormState.compromisoMonitor = sub.compromisoMonitor || (sub.compromisos && typeof sub.compromisos === 'object' && !Array.isArray(sub.compromisos) ? (sub.compromisos.especialista || '') : '') || '';
  const rawComps = Array.isArray(sub.compromisos) ? sub.compromisos : (Array.isArray(sub.compromisosList) ? sub.compromisosList : []);
  ebrFormState.compromisosAdicionales = rawComps.filter(c => c && c.responsable !== 'Director(a) de la IE' && c.responsable !== 'Monitor / Especialista');
}

/**
 * Renderiza el formulario dinámico completo de EBR Gestión Escolar según la Visita activa
 */
export function renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing = false) {
  if (!host || !ft) return;

  const currentVisita = ebrFormState.visita;
  const isV1 = currentVisita === 1;
  const isV2 = currentVisita === 2;

  // Secciones e ítems correspondientes a la visita elegida
  const seccionesActuales = isV1
    ? (ft.seccionesVisita1 || EBR_GESTION_VISITA_1_SECCIONES)
    : (ft.seccionesVisita2 || EBR_GESTION_VISITA_2_SECCIONES);

  const totalItemsCount = seccionesActuales.reduce((acc, s) => acc + (s.items || []).length, 0);

  // Selector visual de número de visita
  const visitaSelectorHtml = `
    <div class="panel ebrVisitaSelectPanel" style="margin-bottom:16px;border-left:4px solid var(--primary);background:var(--surface)">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div>
          <h3 style="margin:0;font-size:16px;display:flex;align-items:center;gap:8px">
            <span>🏛️</span> N.° de Visita de Monitoreo · Gestión Escolar UGEL 03 EBR
          </h3>
          <p style="margin:3px 0 0;font-size:12.5px;color:var(--text-600)">
            Elige el número de visita para cargar automáticamente los campos, rúbricas e indicadores oficiales correspondientes.
          </p>
        </div>
        ${currentVisita ? `
          <div class="badge" style="background:var(--primary-tint);color:var(--primary-dark);font-weight:700;font-size:12px;padding:4px 10px;border-radius:12px">
            ${isV1 ? 'Visita 1 (Primer momento) · 19 ítems' : 'Visita 2 (Segundo momento) · 23 ítems'}
          </div>
        ` : ''}
      </div>

      <div class="ebrVisitaSelectWrap" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <!-- Tarjeta Visita 1 -->
        <button type="button" class="ebrVisitaCard ${isV1 ? 'active' : ''}" data-ebr-visita="1" style="text-align:left;padding:14px 16px;border-radius:var(--radius);border:2px solid ${isV1 ? 'var(--primary)' : 'var(--line)'};background:${isV1 ? 'var(--surface-2)' : 'var(--surface)'};cursor:pointer;transition:all 0.15s ease">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:800;font-size:14px;color:${isV1 ? 'var(--primary)' : 'var(--ink)'}">
              ${isV1 ? '✓ ' : ''}Visita 1 · Primer momento
            </span>
            <span style="font-size:11px;background:${isV1 ? 'var(--primary)' : 'var(--line)'};color:${isV1 ? '#fff' : 'var(--ink-soft)'};padding:2px 8px;border-radius:10px;font-weight:700">
              19 ítems
            </span>
          </div>
          <div style="font-size:12px;color:var(--ink-soft);line-height:1.4">
            Datos generales de la IE, Director(a), Subdirectores, 19 indicadores de gestión escolar (4.1–4.5), Logros, Compromisos y Firmas. <em>Sin tablas de docentes.</em>
          </div>
        </button>

        <!-- Tarjeta Visita 2 -->
        <button type="button" class="ebrVisitaCard ${isV2 ? 'active' : ''}" data-ebr-visita="2" style="text-align:left;padding:14px 16px;border-radius:var(--radius);border:2px solid ${isV2 ? 'var(--primary)' : 'var(--line)'};background:${isV2 ? 'var(--surface-2)' : 'var(--surface)'};cursor:pointer;transition:all 0.15s ease">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <span style="font-weight:800;font-size:14px;color:${isV2 ? 'var(--primary)' : 'var(--ink)'}">
              ${isV2 ? '✓ ' : ''}Visita 2 · Segundo momento
            </span>
            <span style="font-size:11px;background:${isV2 ? 'var(--primary)' : 'var(--line)'};color:${isV2 ? '#fff' : 'var(--ink-soft)'};padding:2px 8px;border-radius:10px;font-weight:700">
              23 ítems + Tablas R1–R5
            </span>
          </div>
          <div style="font-size:12px;color:var(--ink-soft);line-height:1.4">
            Incluye <strong>Data de docentes monitoreados del 1er y 2do momento</strong> por nivel (R1–R5 y niveles I–IV), más 23 indicadores de gestión escolar (6.1–6.5).
          </div>
        </button>
      </div>

      <!-- Banner de sugerencia o detección de visita previa -->
      <div id="ebrVisitaNoticeWrap" style="margin-top:12px"></div>
    </div>
  `;

  // Si no se ha elegido ninguna visita, mostrar solo cabecera y mensaje
  if (!currentVisita) {
    host.innerHTML = `
      <form id="regForm" autocomplete="off">
        ${visitaSelectorHtml}
        <div class="panel" style="padding:40px 20px;text-align:center;background:var(--surface)">
          <div style="font-size:42px;margin-bottom:12px">📋</div>
          <h3 style="margin:0 0 8px;font-size:17px;color:var(--ink)">Elige el número de visita para ver los campos de la ficha</h3>
          <p style="margin:0 auto;max-width:540px;font-size:13px;color:var(--ink-soft)">
            Selecciona arriba si estás aplicando la <strong>Visita 1 (Primer momento · 19 ítems)</strong> o la <strong>Visita 2 (Segundo momento · 23 ítems con tablas R1–R5)</strong> para desplegar el formulario correspondiente.
          </p>
        </div>
      </form>
    `;
    attachVisitaSelectorEvents(host, ft, state, dbNs, currentUser, navigate, isEditing);
    return;
  }

  // =========================================================================
  // SECCIÓN I: DATOS GENERALES DE LA IE
  // =========================================================================
  const seccionIEHtml = `
    <div class="panel">
      <div class="sectionHeaderTitle">I. DATOS GENERALES DE LA INSTITUCIÓN EDUCATIVA</div>
      <div class="fieldGrid">
        <div class="field" style="grid-column:span 2">
          <label for="f_institucion">Número y/o Nombre de la I.E. *</label>
          <div class="ieSearchWrap" id="ieSearchWrap">
            <input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar por nombre o código modular..." value="${esc(ebrFormState.institucion || '')}" required>
            <div class="ieDropdown" id="ieDropdown"></div>
          </div>
          <span id="regColegioHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px;display:block"></span>
        </div>
        <div class="field">
          <label for="ebr_cod_local">Código de Local *</label>
          <input type="text" id="ebr_cod_local" placeholder="Ej: 310050" value="${esc(ebrFormState.codigoLocal || '')}" required>
        </div>
        <div class="field">
          <label for="ebr_ugel">UGEL</label>
          <input type="text" id="ebr_ugel" value="UGEL 03" readonly style="background:var(--surface-2);color:var(--ink-soft);font-weight:700">
        </div>
        <div class="field">
          <label for="ebr_red">RED Educativa</label>
          <input type="text" id="ebr_red" placeholder="Ej: 12" value="${esc(ebrFormState.red || '')}">
        </div>
        <div class="field">
          <label for="f_fecha">Fecha de visita *</label>
          <input type="date" id="f_fecha" value="${esc(ebrFormState.fecha || todayStr())}" required>
        </div>
        <div class="field" style="grid-column:span 2">
          <label style="display:block;margin-bottom:6px">¿La IE implementa el modelo de Servicio Educativo Secundaria con Formación Técnica? *</label>
          <div class="optGroup" style="display:flex;gap:16px;padding-top:2px">
            <label class="optBtn" style="cursor:pointer">
              <input type="radio" name="ebr_formacion_tecnica" value="si" ${ebrFormState.formacionTecnica ? 'checked' : ''}>
              <span>Sí</span>
            </label>
            <label class="optBtn" style="cursor:pointer">
              <input type="radio" name="ebr_formacion_tecnica" value="no" ${!ebrFormState.formacionTecnica ? 'checked' : ''}>
              <span>No</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  `;

  // =========================================================================
  // SECCIÓN II: DATOS DEL DIRECTOR(A)
  // =========================================================================
  const seccionDirectorHtml = `
    <div class="panel">
      <div class="sectionHeaderTitle">II. DATOS DEL DIRECTOR(A)</div>
      <div class="fieldGrid">
        <div class="field" style="grid-column:span 2">
          <label for="ebr_dir_nombre">Apellidos y Nombres *</label>
          <input type="text" id="ebr_dir_nombre" placeholder="Apellidos y nombres completos del director(a)" value="${esc(ebrFormState.director.nombres || '')}" required>
        </div>
        <div class="field">
          <label for="ebr_dir_dni">DNI * (8 dígitos)</label>
          <input type="text" id="ebr_dir_dni" maxlength="8" pattern="[0-9]{8}" placeholder="8 dígitos" value="${esc(ebrFormState.director.dni || '')}" required>
        </div>
        <div class="field">
          <label for="ebr_dir_tel">Teléfono / Celular (9 dígitos)</label>
          <input type="text" id="ebr_dir_tel" maxlength="9" placeholder="9 dígitos" value="${esc(ebrFormState.director.telefono || '')}">
        </div>
        <div class="field">
          <label for="ebr_dir_cond">Condición</label>
          <select id="ebr_dir_cond">
            <option value="D" ${ebrFormState.director.condicion === 'D' ? 'selected' : ''}>Designado (D)</option>
            <option value="E" ${ebrFormState.director.condicion === 'E' ? 'selected' : ''}>Encargado (E)</option>
            <option value="Nombrado" ${ebrFormState.director.condicion === 'Nombrado' ? 'selected' : ''}>Nombrado</option>
            <option value="Otro" ${ebrFormState.director.condicion === 'Otro' ? 'selected' : ''}>Otro</option>
          </select>
        </div>
        <div class="field">
          <label for="ebr_dir_correo">Correo Electrónico</label>
          <input type="email" id="ebr_dir_correo" placeholder="correo@ejemplo.edu.pe" value="${esc(ebrFormState.director.correo || '')}">
        </div>
      </div>
    </div>
  `;

  // =========================================================================
  // SECCIÓN III: DATOS DE LOS SUBDIRECTORES (DINÁMICA)
  // =========================================================================
  const subdirectoresRowsHtml = (ebrFormState.subdirectores || []).map((sd, i) => `
    <tr data-subdir-idx="${i}">
      <td style="text-align:center;font-weight:700">${i + 1}</td>
      <td>
        <input type="text" class="ebrSubdirInput" data-f="nombres" placeholder="Apellidos y nombres completos" value="${esc(sd.nombres || '')}" required>
      </td>
      <td>
        <input type="text" class="ebrSubdirInput" data-f="dni" maxlength="8" pattern="[0-9]{8}" placeholder="DNI (8 dígitos)" value="${esc(sd.dni || '')}">
      </td>
      <td>
        <input type="text" class="ebrSubdirInput" data-f="telefono" maxlength="9" placeholder="Celular" value="${esc(sd.telefono || '')}">
      </td>
      <td>
        <select class="ebrSubdirInput" data-f="condicion">
          <option value="D" ${sd.condicion === 'D' ? 'selected' : ''}>Designado (D)</option>
          <option value="E" ${sd.condicion === 'E' ? 'selected' : ''}>Encargado (E)</option>
          <option value="Nombrado" ${sd.condicion === 'Nombrado' ? 'selected' : ''}>Nombrado</option>
          <option value="Otro" ${sd.condicion === 'Otro' ? 'selected' : ''}>Otro</option>
        </select>
      </td>
      <td>
        <input type="email" class="ebrSubdirInput" data-f="correo" placeholder="Correo" value="${esc(sd.correo || '')}">
      </td>
      <td style="text-align:center">
        <button type="button" class="iconBtn danger small btnRmSubdir" data-rm-subdir="${i}" title="Quitar subdirector">✕</button>
      </td>
    </tr>
  `).join('');

  const seccionSubdirectoresHtml = `
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <div class="sectionHeaderTitle" style="margin:0">III. DATOS DE LOS SUBDIRECTORES</div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn secondary small" id="btnAddSubdirector">＋ Agregar subdirector</button>
          <button type="button" class="btn small" id="btnSaveSubdirector" style="background:var(--primary);color:#fff" title="Guardar datos del subdirector en la ficha y sincronizar con el Directorio">💾 Guardar datos del subdirector</button>
        </div>
      </div>
      <p class="helpText" style="margin-top:0">Consigne a los subdirectores de nivel o área pedagógica de la institución educativa.</p>
      <div class="tblWrap" style="overflow-x:auto">
        <table class="table" style="width:100%;font-size:12px" id="ebrSubdirectoresTable">
          <thead>
            <tr style="background:var(--surface-2)">
              <th style="width:36px;text-align:center">N°</th>
              <th>Apellidos y Nombres *</th>
              <th style="width:120px">DNI</th>
              <th style="width:120px">Teléfono</th>
              <th style="width:130px">Condición</th>
              <th>Correo</th>
              <th style="width:40px;text-align:center"></th>
            </tr>
          </thead>
          <tbody>
            ${subdirectoresRowsHtml || '<tr><td colspan="7" class="empty" style="padding:10px;text-align:center;color:var(--text-400)">Sin subdirectores agregados. Pulsa "+ Agregar subdirector" si la IE cuenta con subdirección.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // =========================================================================
  // SECCIONES IV Y V: TABLAS DE DOCENTES MONITOREADOS (SOLO VISITA 2)
  // =========================================================================
  let tablasDocentesHtml = '';
  if (isV2) {
    tablasDocentesHtml = `
      <!-- TABLA IV: PRIMER MOMENTO -->
      <div class="panel ebrDocentesPanel" id="panelDocentesM1">
        <div class="sectionHeaderTitle">
          IV. DATA DE DOCENTES MONITOREADOS DEL PRIMER MOMENTO POR NIVEL A LA FECHA DE LA VISITA
        </div>
        <p class="helpText" style="margin-top:0">
          Registre los docentes monitoreados y los resultados de las 5 rúbricas de aula (I, II, III y IV). La fila <strong>Total</strong> y los <strong>no monitoreados</strong> se calculan automáticamente.
        </p>
        ${renderDocentesTableHtml('momento1', ebrFormState.docentesMomento1)}
        <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn secondary small btnAddFilaDocente" data-momento="1">＋ Agregar fila (ej: AIP / Otro)</button>
          <div style="font-size:11px;color:var(--ink-soft)">* El grupo resalta en ámbar si la suma de niveles no coincide con los monitoreados.</div>
        </div>
      </div>

      <!-- TABLA V: SEGUNDO MOMENTO -->
      <div class="panel ebrDocentesPanel" id="panelDocentesM2">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px">
          <div class="sectionHeaderTitle" style="margin:0">
            V. DATA DE DOCENTES MONITOREADOS DEL SEGUNDO MOMENTO POR NIVEL A LA FECHA DE LA VISITA
          </div>
          <button type="button" class="btn secondary small" id="btnCopiarTotalesM1" title="Copia el Total de Docentes por nivel desde el primer momento">
            📋 Copiar totales del primer momento
          </button>
        </div>
        <p class="helpText" style="margin-top:0">
          Resultados acumulados o correspondientes al segundo momento de monitoreo a la práctica pedagógica.
        </p>
        ${renderDocentesTableHtml('momento2', ebrFormState.docentesMomento2)}
        <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn secondary small btnAddFilaDocente" data-momento="2">＋ Agregar fila (ej: AIP / Otro)</button>
          <div style="font-size:11px;color:var(--ink-soft)">* Docentes no monitoreados = Total de docentes − Docentes monitoreados.</div>
        </div>
      </div>

      <!-- LEYENDA EXPLICATIVA DE RÚBRICAS R1–R5 -->
      <details class="panel" style="background:var(--surface-2);border:1px solid var(--line);padding:10px 14px;border-radius:var(--radius);font-size:12px;margin-bottom:16px">
        <summary style="font-weight:700;cursor:pointer;color:var(--primary)">
          ℹ️ Ver leyenda completa de Rúbricas de Observación de Aula (R1 a R5)
        </summary>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:10px;margin-top:10px">
          ${RUBRICAS_OBSERVACION_AULA.map(r => `
            <div style="padding:6px 10px;background:var(--surface);border-radius:6px;border:1px solid var(--line)">
              <strong style="color:var(--primary)">${esc(r.id)}:</strong> ${esc(r.nombre)}
            </div>
          `).join('')}
        </div>
      </details>
    `;
  }

  // =========================================================================
  // ASPECTOS A MONITOREAR (POLÍTICA REGIONAL 01)
  // Numeración: IV (4.1–4.5) en Visita 1; VI (6.1–6.5) en Visita 2
  // =========================================================================
  const secAspectosRomano = isV1 ? 'IV' : 'VI';
  let globalItemIndex = 0;

  const seccionesAspectosHtml = seccionesActuales.map((sec, sIdx) => {
    const itemsHtml = (sec.items || []).map(it => {
      globalItemIndex++;
      const normItId = String(it.id).replace(/^ge\d*_/, 'ge_');
      const currentVal = ebrFormState.respuestas[it.id] || ebrFormState.respuestas[normItId] || (it.num ? ebrFormState.respuestas['num_' + it.num] : '') || '';
      const currentObs = ebrFormState.observacionesItems[it.id] || ebrFormState.observacionesItems[normItId] || '';

      const tieneProyectos = it.tieneProyectosList === true;
      const proyectosHtml = tieneProyectos ? `
        <div class="ebrProyectosWrap" style="margin-top:10px;padding:10px 12px;background:var(--surface-2);border-radius:6px;border:1px dashed var(--line)">
          <div style="font-size:11.5px;font-weight:700;color:var(--primary-dark);margin-bottom:6px">
            Nombre del proyecto y/o buenas prácticas identificadas en la I.E.:
          </div>
          <div id="ebrProyectosList">
            ${(ebrFormState.proyectosInnovacion || ['']).map((p, pi) => `
              <div class="ebrProyectoRow" style="display:flex;gap:6px;margin-bottom:6px">
                <input type="text" class="ebrProyectoInput" data-proj-idx="${pi}" placeholder="Ej: Proyecto de Robótica y Pensamiento Computacional..." value="${esc(p)}" style="flex:1;font-size:12px">
                <button type="button" class="iconBtn small btnRmProyecto" data-rm-proj="${pi}" title="Quitar">✕</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="btn secondary small" id="btnAddProyecto" style="font-size:11px;padding:2px 8px;margin-top:4px">
            ＋ Agregar otro proyecto / buena práctica
          </button>
        </div>
      ` : '';

      return `
        <div class="ebrItemCard" data-item-id="${esc(it.id)}" style="border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-bottom:12px;background:var(--surface)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">
            <div style="flex:1">
              <span style="font-weight:800;color:var(--primary);margin-right:6px">
                ${it.num || globalItemIndex}.
              </span>
              <span style="font-size:13.5px;color:var(--ink);font-weight:500;line-height:1.45">
                ${esc(it.texto)}
              </span>
            </div>
            <!-- Opciones Inicio / Proceso / Logrado / No Aplica (NA) -->
            <div class="ebrScaleBtns" style="display:flex;gap:6px;flex-shrink:0">
              <label class="optBtn optInicio ${currentVal === 'inicio' ? 'active' : ''}" style="cursor:pointer;padding:4px 10px;font-size:12px;font-weight:700">
                <input type="radio" name="item_${esc(it.id)}" value="inicio" ${currentVal === 'inicio' ? 'checked' : ''} style="display:none">
                <span>Inicio</span>
              </label>
              <label class="optBtn optProceso ${currentVal === 'proceso' ? 'active' : ''}" style="cursor:pointer;padding:4px 10px;font-size:12px;font-weight:700">
                <input type="radio" name="item_${esc(it.id)}" value="proceso" ${currentVal === 'proceso' ? 'checked' : ''} style="display:none">
                <span>Proceso</span>
              </label>
              <label class="optBtn optLogrado ${currentVal === 'logrado' ? 'active' : ''}" style="cursor:pointer;padding:4px 10px;font-size:12px;font-weight:700">
                <input type="radio" name="item_${esc(it.id)}" value="logrado" ${currentVal === 'logrado' ? 'checked' : ''} style="display:none">
                <span>Logrado</span>
              </label>
              <label class="optBtn optNa ${currentVal === 'na' ? 'active' : ''}" style="cursor:pointer;padding:4px 10px;font-size:12px;font-weight:700">
                <input type="radio" name="item_${esc(it.id)}" value="na" ${currentVal === 'na' ? 'checked' : ''} style="display:none">
                <span>No Aplica (NA)</span>
              </label>
            </div>
          </div>

          <!-- Evidencias sugeridas (texto de referencia no editable) -->
          <div class="ebrEvidenciaBox" style="font-size:11.5px;color:var(--ink-soft);background:var(--surface-2);border-radius:4px;padding:5px 8px;margin-bottom:8px;line-height:1.35">
            <strong>Evidencias sugeridas:</strong> <em>${esc(it.evidencia || 'Sin evidencias sugeridas')}</em>
          </div>

          <!-- Observaciones / Hallazgos por ítem -->
          <div>
            <textarea class="ebrItemObs" data-item-obs="${esc(it.id)}" rows="1" placeholder="Observaciones / hallazgos específicos sobre este indicador..." style="width:100%;font-size:12px;padding:4px 8px;min-height:36px">${esc(currentObs)}</textarea>
          </div>

          ${proyectosHtml}
        </div>
      `;
    }).join('');

    return `
      <div class="formSecCard" style="margin-bottom:18px;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden">
        <div class="formSecHeader" style="background:var(--surface-2);padding:10px 14px;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;align-items:center">
          <div>
            <span class="formSecBadge" style="background:var(--primary);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px">
              ${sec.numRomano || (sIdx + 1)}
            </span>
            <h4 class="formSecTitle" style="display:inline;margin-left:8px;font-size:14px;font-weight:700;color:var(--ink)">
              ${esc(sec.nombre)}
            </h4>
          </div>
          <span class="formSecCount" style="font-size:12px;color:var(--ink-soft);font-weight:600">
            ${(sec.items || []).length} ítems
          </span>
        </div>
        <div class="formSecBody" style="padding:14px">
          ${itemsHtml}
          <!-- Fila Total calculada automáticamente de la sección -->
          <div class="ebrSecTotalRow" data-sec-idx="${sIdx}" style="display:flex;justify-content:space-between;align-items:center;background:var(--surface-2);border-radius:6px;padding:8px 12px;font-size:12px;font-weight:700;margin-top:6px;border:1px solid var(--line);flex-wrap:wrap;gap:8px">
            <span>Total sección ${sec.numRomano || (sIdx + 1)}:</span>
            <div style="display:flex;gap:12px;flex-wrap:wrap">
              <span style="color:var(--danger)">Inicio: <strong class="secTotInicio">0</strong></span>
              <span style="color:var(--warn)">Proceso: <strong class="secTotProceso">0</strong></span>
              <span style="color:var(--ok)">Logrado: <strong class="secTotLogrado">0</strong></span>
              <span style="color:#64748B">No aplica: <strong class="secTotNa">0</strong></span>
              <span style="color:var(--ink-soft)">Sin marcar: <strong class="secTotPendiente">${(sec.items || []).length}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // =========================================================================
  // SECCIÓN FINAL: LOGROS, ASPECTOS POR MEJORAR Y RECOMENDACIONES
  // Numeración: V en Visita 1; VII en Visita 2
  // =========================================================================
  const secLogrosRomano = isV1 ? 'V' : 'VII';
  const seccionLogrosHtml = `
    <div class="panel">
      <div class="sectionHeaderTitle">
        ${secLogrosRomano}. LOGROS, ASPECTOS POR MEJORAR Y RECOMENDACIONES
      </div>
      <p class="helpText" style="margin-top:0">
        Consigne las conclusiones generales respecto al cumplimiento de la <strong>Política Regional 01</strong>.
      </p>
      <div class="tblWrap">
        <table class="table" style="width:100%;font-size:12px">
          <thead>
            <tr style="background:var(--surface-2)">
              <th style="width:25%">Aspecto Evaluado</th>
              <th style="width:25%">Logros</th>
              <th style="width:25%">Aspectos por mejorar</th>
              <th style="width:25%">Recomendaciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="font-weight:700;vertical-align:top;background:var(--surface-2);padding:10px">
                P1 Instituciones educativas que aseguran aprendizajes
              </td>
              <td>
                <textarea id="ebr_logros" rows="4" placeholder="Logros más destacados observados durante la visita..." style="width:100%;min-height:80px">${esc(ebrFormState.sintesis.logros || '')}</textarea>
              </td>
              <td>
                <textarea id="ebr_aspectos_mejora" rows="4" placeholder="Aspectos débiles o dificultades identificadas..." style="width:100%;min-height:80px">${esc(ebrFormState.sintesis.aspectosMejora || '')}</textarea>
              </td>
              <td>
                <textarea id="ebr_recomendaciones" rows="4" placeholder="Recomendaciones y orientaciones técnicas brindadas..." style="width:100%;min-height:80px">${esc(ebrFormState.sintesis.recomendaciones || '')}</textarea>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

  // =========================================================================
  // SECCIÓN FINAL: COMPROMISOS ASUMIDOS
  // Numeración: VI en Visita 1; VIII en Visita 2
  // =========================================================================
  const secCompromisosRomano = isV1 ? 'VI' : 'VIII';
  const seccionCompromisosHtml = `
    <div class="panel">
      <div class="sectionHeaderTitle">
        ${secCompromisosRomano}. COMPROMISOS ASUMIDOS
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="ebr_comp_director"><strong>DEL DIRECTIVO:</strong></label>
        <textarea id="ebr_comp_director" placeholder="Compromisos asumidos por el equipo directivo de la IE..." style="min-height:75px">${esc(ebrFormState.compromisoDirector || '')}</textarea>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="ebr_comp_especialista"><strong>DEL ESPECIALISTA:</strong></label>
        <textarea id="ebr_comp_especialista" placeholder="Compromisos asumidos por el especialista de monitoreo de la UGEL 03..." style="min-height:75px">${esc(ebrFormState.compromisoMonitor || '')}</textarea>
      </div>

      <div class="sectionTitle" style="margin-top:14px;font-size:13px">Compromisos específicos adicionales</div>
      <div id="compList"></div>
      <button type="button" class="btn secondary small" id="addCompBtn" style="margin-top:8px">＋ Agregar compromiso adicional</button>
    </div>
  `;

  // =========================================================================
  // SECCIÓN FINAL: FIRMAS OFICIALES (INFORMATIVA)
  // Numeración: VII en Visita 1; IX en Visita 2
  // =========================================================================
  const secFirmasRomano = isV1 ? 'VII' : 'IX';
  const seccionFirmasHtml = `
    <div class="panel" style="background:var(--surface-2);border:1px dashed var(--line)">
      <div class="sectionHeaderTitle" style="margin:0 0 8px">
        ${secFirmasRomano}. FIRMAS OFICIALES DE LA VISITA
      </div>
      <p style="font-size:12px;color:var(--ink-soft);margin:0 0 12px">
        Al imprimir o exportar la ficha en PDF, se generarán automáticamente los bloques oficiales de firma y sello para:
      </p>
      <div style="display:flex;gap:14px;flex-wrap:wrap">
        <span class="badge" style="background:var(--surface);padding:6px 12px;font-size:12px;border:1px solid var(--line)">
          ✍️ Director(a) de la I.E.
        </span>
        <span class="badge" style="background:var(--surface);padding:6px 12px;font-size:12px;border:1px solid var(--line)">
          ✍️ Subdirector(es) registrados (${(ebrFormState.subdirectores || []).length})
        </span>
        <span class="badge" style="background:var(--surface);padding:6px 12px;font-size:12px;border:1px solid var(--line)">
          ✍️ Especialista de Monitoreo (UGEL 03)
        </span>
      </div>
    </div>
  `;

  // Barra inferior con indicador de avance y botones
  const submitLabel = isEditing ? 'Actualizar ficha' : 'Guardar ficha';
  const bottomBarHtml = `
    <div class="formBottomBar">
      <div class="regProgressBadge" id="regProgressBadge">
        Avance: <strong>0 de ${totalItemsCount}</strong> ítems respondidos (0%)
      </div>
      <button type="button" class="btn secondary" id="cancelFormBtn">Cancelar</button>
      <button type="submit" class="btn" id="saveFormBtn">${submitLabel}</button>
    </div>
  `;

  // Montar HTML en el formulario
  host.innerHTML = `
    <form id="regForm" autocomplete="off">
      <input type="hidden" id="f_visita" value="${currentVisita}">
      ${visitaSelectorHtml}
      ${seccionIEHtml}
      ${seccionDirectorHtml}
      ${seccionSubdirectoresHtml}
      ${tablasDocentesHtml}
      <div class="panel">
        <div class="sectionHeaderTitle">
          ${secAspectosRomano}. POLÍTICA REGIONAL 01: INSTITUCIONES EDUCATIVAS QUE ASEGURAN APRENDIZAJES
          <small style="font-weight:normal;color:var(--text-600);margin-left:8px">Escala: Inicio / Proceso / Logrado</small>
        </div>
        ${seccionesAspectosHtml}
      </div>
      ${seccionLogrosHtml}
      ${seccionCompromisosHtml}
      ${seccionFirmasHtml}
      ${bottomBarHtml}
    </form>
  `;

  // Vincular eventos y lógica interactiva
  attachVisitaSelectorEvents(host, ft, state, dbNs, currentUser, navigate, isEditing);
  attachEbrFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing);
  updateAllSectionTotals(host);
  updateEbrProgressBadge(host, totalItemsCount);
}

/**
 * Genera el HTML de la tabla de docentes (24 columnas) con celdas de solo lectura y totales automáticos
 */
function renderDocentesTableHtml(momentoKey, rows) {
  const isM1 = momentoKey === 'momento1';
  const rowsList = rows && rows.length ? rows : createDefaultDocentesRows();

  const bodyHtml = rowsList.map((row, rIdx) => {
    const isNa = row.noAplica === true;
    const disabledAttr = isNa ? 'disabled' : '';
    const naStyle = isNa ? 'opacity:0.4;background:var(--surface-2);' : '';

    return `
      <tr data-doc-row="${momentoKey}|${rIdx}" style="${naStyle}">
        <!-- Nivel con opción de edición -->
        <td class="ebrStickyCol" style="font-weight:700;background:var(--surface);position:sticky;left:0;z-index:2">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
            <span class="ebrNivelLabel" title="${esc(row.nivel)}">${esc(row.nivel)}</span>
            <button type="button" class="iconBtn small btnEditNivel" data-edit-nivel="${momentoKey}|${rIdx}" title="Editar nombre del nivel o servicio educativo" style="padding:2px 5px;font-size:11px;line-height:1.2;cursor:pointer;opacity:0.85;border:1px solid var(--line);border-radius:4px;background:var(--surface-2)">✏️</button>
          </div>
        </td>
        <!-- Total -->
        <td>
          <input type="number" min="0" class="ebrDocInp ebrDocTotal" data-f="total" value="${esc(row.total)}" placeholder="0" ${disabledAttr} style="width:58px;text-align:center">
        </td>
        <!-- Monitoreados -->
        <td>
          <input type="number" min="0" class="ebrDocInp ebrDocMonit" data-f="monitoreados" value="${esc(row.monitoreados)}" placeholder="0" ${disabledAttr} style="width:58px;text-align:center">
        </td>
        <!-- No Monitoreados (calculado) -->
        <td style="background:var(--surface-2);text-align:center;font-weight:700" class="ebrDocNoMonit">
          ${esc(row.noMonitoreados !== undefined ? row.noMonitoreados : (Number(row.total || 0) - Number(row.monitoreados || 0)))}
        </td>

        <!-- R1: I II III IV -->
        ${renderRubricaInputsHtml(momentoKey, rIdx, 'R1', row.R1, disabledAttr, 'rgba(30, 64, 175, 0.05)')}
        <!-- R2: I II III IV -->
        ${renderRubricaInputsHtml(momentoKey, rIdx, 'R2', row.R2, disabledAttr, 'rgba(13, 148, 136, 0.05)')}
        <!-- R3: I II III IV -->
        ${renderRubricaInputsHtml(momentoKey, rIdx, 'R3', row.R3, disabledAttr, 'rgba(5, 150, 105, 0.05)')}
        <!-- R4: I II III IV -->
        ${renderRubricaInputsHtml(momentoKey, rIdx, 'R4', row.R4, disabledAttr, 'rgba(124, 58, 237, 0.05)')}
        <!-- R5: I II III IV -->
        ${renderRubricaInputsHtml(momentoKey, rIdx, 'R5', row.R5, disabledAttr, 'rgba(217, 119, 6, 0.05)')}

        <!-- Acciones: No aplica / Quitar -->
        <td style="text-align:center;white-space:nowrap">
          <label style="font-size:11px;display:inline-flex;align-items:center;gap:3px;cursor:pointer" title="Marcar si la I.E. no brinda este nivel educativo">
            <input type="checkbox" class="chkDocNa" data-doc-na="${momentoKey}|${rIdx}" ${isNa ? 'checked' : ''}> N/A
          </label>
          ${rIdx >= 3 ? `<button type="button" class="iconBtn danger small btnRmFilaDoc" data-rm-doc="${momentoKey}|${rIdx}" title="Eliminar fila" style="margin-left:4px">✕</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="ebrTableWrap" style="overflow-x:auto;max-width:100%;border:1px solid var(--line);border-radius:6px;box-shadow:var(--shadow-sm)">
      <table class="table ebrDocentesTable" style="width:100%;border-collapse:collapse;font-size:11.5px;min-width:1200px" data-momento-table="${momentoKey}">
        <thead>
          <tr style="background:var(--primary);color:#FFFFFF;text-align:center">
            <th rowspan="2" class="ebrStickyCol" style="position:sticky;left:0;background:var(--primary);z-index:3;width:130px;min-width:130px;vertical-align:middle">
              Nivel
            </th>
            <th rowspan="2" style="width:68px;vertical-align:middle">Total de Docentes</th>
            <th rowspan="2" style="width:68px;vertical-align:middle">Docentes Monitoreados</th>
            <th rowspan="2" style="width:68px;vertical-align:middle">Docentes No Monitoreados</th>
            <th colspan="4" style="background:#1E40AF;border-left:1.5px solid #fff">R1 Involucra <span class="rubCheck" data-rc="R1"></span></th>
            <th colspan="4" style="background:#0F766E;border-left:1.5px solid #fff">R2 Razonamiento <span class="rubCheck" data-rc="R2"></span></th>
            <th colspan="4" style="background:#047857;border-left:1.5px solid #fff">R3 Evalúa y retroalim. <span class="rubCheck" data-rc="R3"></span></th>
            <th colspan="4" style="background:#6D28D9;border-left:1.5px solid #fff">R4 Respeto <span class="rubCheck" data-rc="R4"></span></th>
            <th colspan="4" style="background:#B45309;border-left:1.5px solid #fff">R5 Comportamiento <span class="rubCheck" data-rc="R5"></span></th>
            <th rowspan="2" style="width:70px;vertical-align:middle">Aplica</th>
          </tr>
          <tr style="background:var(--surface-2);color:var(--ink);text-align:center;font-size:10.5px">
            <!-- R1 subheaders -->
            <th style="width:36px;border-left:1.5px solid var(--line)">I</th><th style="width:36px">II</th><th style="width:36px">III</th><th style="width:36px">IV</th>
            <!-- R2 subheaders -->
            <th style="width:36px;border-left:1.5px solid var(--line)">I</th><th style="width:36px">II</th><th style="width:36px">III</th><th style="width:36px">IV</th>
            <!-- R3 subheaders -->
            <th style="width:36px;border-left:1.5px solid var(--line)">I</th><th style="width:36px">II</th><th style="width:36px">III</th><th style="width:36px">IV</th>
            <!-- R4 subheaders -->
            <th style="width:36px;border-left:1.5px solid var(--line)">I</th><th style="width:36px">II</th><th style="width:36px">III</th><th style="width:36px">IV</th>
            <!-- R5 subheaders -->
            <th style="width:36px;border-left:1.5px solid var(--line)">I</th><th style="width:36px">II</th><th style="width:36px">III</th><th style="width:36px">IV</th>
          </tr>
        </thead>
        <tbody>
          ${bodyHtml}
        </tbody>
        <tfoot>
          <tr style="background:var(--surface-3);font-weight:800;text-align:center;border-top:2px solid var(--primary)" class="ebrDocTotalRow">
            <td class="ebrStickyCol" style="position:sticky;left:0;background:var(--surface-3);z-index:2;text-align:left;padding-left:8px">
              TOTAL
            </td>
            <td id="tot_${momentoKey}_total">0</td>
            <td id="tot_${momentoKey}_monit">0</td>
            <td id="tot_${momentoKey}_nomonit">0</td>
            <!-- Totales R1 -->
            <td id="tot_${momentoKey}_R1_0" style="border-left:1.5px solid var(--line)">0</td>
            <td id="tot_${momentoKey}_R1_1">0</td>
            <td id="tot_${momentoKey}_R1_2">0</td>
            <td id="tot_${momentoKey}_R1_3">0</td>
            <!-- Totales R2 -->
            <td id="tot_${momentoKey}_R2_0" style="border-left:1.5px solid var(--line)">0</td>
            <td id="tot_${momentoKey}_R2_1">0</td>
            <td id="tot_${momentoKey}_R2_2">0</td>
            <td id="tot_${momentoKey}_R2_3">0</td>
            <!-- Totales R3 -->
            <td id="tot_${momentoKey}_R3_0" style="border-left:1.5px solid var(--line)">0</td>
            <td id="tot_${momentoKey}_R3_1">0</td>
            <td id="tot_${momentoKey}_R3_2">0</td>
            <td id="tot_${momentoKey}_R3_3">0</td>
            <!-- Totales R4 -->
            <td id="tot_${momentoKey}_R4_0" style="border-left:1.5px solid var(--line)">0</td>
            <td id="tot_${momentoKey}_R4_1">0</td>
            <td id="tot_${momentoKey}_R4_2">0</td>
            <td id="tot_${momentoKey}_R4_3">0</td>
            <!-- Totales R5 -->
            <td id="tot_${momentoKey}_R5_0" style="border-left:1.5px solid var(--line)">0</td>
            <td id="tot_${momentoKey}_R5_1">0</td>
            <td id="tot_${momentoKey}_R5_2">0</td>
            <td id="tot_${momentoKey}_R5_3">0</td>
            <td>—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

function renderRubricaInputsHtml(momentoKey, rIdx, rubId, valuesArray, disabledAttr, bgTint) {
  const vals = valuesArray || ['', '', '', ''];
  return [0, 1, 2, 3].map(lvlIdx => `
    <td style="background:${bgTint};${lvlIdx === 0 ? 'border-left:1.5px solid var(--line);' : ''}">
      <input type="number" min="0" class="ebrDocInp ebrDocLvl" data-rub="${rubId}" data-lvl="${lvlIdx}" value="${esc(vals[lvlIdx])}" placeholder="0" ${disabledAttr} style="width:36px;text-align:center;font-size:11px">
    </td>
  `).join('');
}

/**
 * Maneja eventos de selección y cambio de Visita 1 / Visita 2
 */
function attachVisitaSelectorEvents(host, ft, state, dbNs, currentUser, navigate, isEditing) {
  host.querySelectorAll('[data-ebr-visita]').forEach(card => {
    card.onclick = () => {
      const targetVisita = Number(card.dataset.ebrVisita);
      if (ebrFormState.visita === targetVisita) return;

      // Si se pasa de Visita 2 a Visita 1 y hay datos en las tablas de docentes o ítems 20–23
      if (ebrFormState.visita === 2 && targetVisita === 1) {
        const hasDocData = (ebrFormState.docentesMomento1 || []).some(r => r.total || r.monitoreados) ||
                           (ebrFormState.docentesMomento2 || []).some(r => r.total || r.monitoreados);
        const hasExtraAnswers = Object.keys(ebrFormState.respuestas).some(k => k.startsWith('ge2_20') || k.startsWith('ge2_21') || k.startsWith('ge2_22') || k.startsWith('ge2_23'));

        if (hasDocData || hasExtraAnswers) {
          const ok = confirm('Al cambiar a Visita 1 se quitarán los datos de las tablas de docentes y de los ítems ya marcados que solo corresponden a la visita 2. ¿Deseas continuar?');
          if (!ok) return;
        }
      }

      // Sincronizar datos comunes antes de cambiar
      syncCommonFieldsFromDom(host);

      ebrFormState.visita = targetVisita;
      renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
    };
  });
}

/**
 * Sincroniza TODOS los campos del formulario desde el DOM hacia ebrFormState:
 * Datos de IE, director, subdirectores, tablas de docentes Momento 1 y Momento 2,
 * respuestas a la escala, observaciones, proyectos, síntesis y compromisos.
 */
export function syncAllEbrFormDataFromDom(host) {
  if (!host) return;

  // 1. Datos generales de la IE
  const instEl = host.querySelector('#f_institucion');
  if (instEl) ebrFormState.institucion = instEl.value.trim();

  const fchEl = host.querySelector('#f_fecha');
  if (fchEl) ebrFormState.fecha = fchEl.value;

  const codEl = host.querySelector('#ebr_cod_local');
  if (codEl) ebrFormState.codigoLocal = codEl.value.trim();

  const redEl = host.querySelector('#ebr_red');
  if (redEl) ebrFormState.red = redEl.value.trim();

  const ftRad = host.querySelector('input[name="ebr_formacion_tecnica"]:checked');
  if (ftRad) ebrFormState.formacionTecnica = ftRad.value === 'si';

  // 2. Datos del Director(a)
  const dNom = host.querySelector('#ebr_dir_nombre');
  if (dNom) ebrFormState.director.nombres = dNom.value.trim();
  const dDni = host.querySelector('#ebr_dir_dni');
  if (dDni) ebrFormState.director.dni = dDni.value.trim();
  const dTel = host.querySelector('#ebr_dir_tel');
  if (dTel) ebrFormState.director.telefono = dTel.value.trim();
  const dCond = host.querySelector('#ebr_dir_cond');
  if (dCond) ebrFormState.director.condicion = dCond.value;
  const dCor = host.querySelector('#ebr_dir_correo');
  if (dCor) ebrFormState.director.correo = dCor.value.trim();

  // 3. Subdirectores dinámicos
  const subdirRows = host.querySelectorAll('#ebrSubdirectoresTable tbody tr[data-subdir-idx]');
  if (subdirRows.length > 0) {
    const existingSubs = ebrFormState.subdirectores || [];
    ebrFormState.subdirectores = Array.from(subdirRows).map((tr, idx) => {
      const nom = (tr.querySelector('[data-f="nombres"]') || {}).value ?? '';
      const dni = (tr.querySelector('[data-f="dni"]') || {}).value ?? '';
      const tel = (tr.querySelector('[data-f="telefono"]') || {}).value ?? '';
      const cond = (tr.querySelector('[data-f="condicion"]') || {}).value ?? 'D';
      const mail = (tr.querySelector('[data-f="correo"]') || {}).value ?? '';
      return {
        id: (existingSubs[idx] && existingSubs[idx].id) || genId(),
        nombres: nom,
        dni: dni,
        telefono: tel,
        condicion: cond,
        correo: mail
      };
    });
  }

  // 4. Tablas de Docentes Monitoreados (Momento 1 y Momento 2)
  ['momento1', 'momento2'].forEach(mKey => {
    const tbl = host.querySelector(`.ebrDocentesTable[data-momento-table="${mKey}"]`);
    if (!tbl) return;
    const trs = tbl.querySelectorAll('tbody tr[data-doc-row]');
    if (!trs.length) return;
    const existingList = mKey === 'momento1' ? ebrFormState.docentesMomento1 : ebrFormState.docentesMomento2;

    const parsedList = Array.from(trs).map((tr, rIdx) => {
      const prev = (existingList && existingList[rIdx]) || {};
      const lblEl = tr.querySelector('.ebrNivelLabel') || tr.querySelector('.ebrStickyCol');
      const nivel = lblEl ? (tr.querySelector('.ebrNivelLabel') ? tr.querySelector('.ebrNivelLabel').textContent.trim() : (lblEl.textContent || '').replace('✏️', '').trim()) : (prev.nivel || '');
      const noAplica = (tr.querySelector('.chkDocNa') || {}).checked === true;
      const totalVal = (tr.querySelector('.ebrDocTotal') || {}).value ?? '';
      const monitVal = (tr.querySelector('.ebrDocMonit') || {}).value ?? '';
      const tNum = Number(totalVal) || 0;
      const mNum = Number(monitVal) || 0;
      const noMonit = Math.max(0, tNum - mNum);

      const getRubVals = (rubId) => [0, 1, 2, 3].map(lvl => {
        const inp = tr.querySelector(`.ebrDocLvl[data-rub="${rubId}"][data-lvl="${lvl}"]`);
        return inp ? inp.value : '';
      });

      return {
        id: prev.id || genId(),
        nivel: nivel,
        noAplica: noAplica,
        total: totalVal,
        monitoreados: monitVal,
        noMonitoreados: noMonit,
        R1: getRubVals('R1'),
        R2: getRubVals('R2'),
        R3: getRubVals('R3'),
        R4: getRubVals('R4'),
        R5: getRubVals('R5')
      };
    });

    if (mKey === 'momento1') {
      ebrFormState.docentesMomento1 = parsedList;
    } else {
      ebrFormState.docentesMomento2 = parsedList;
    }
  });

  // 5. Respuestas de Escala (Inicio / Proceso / Logrado / NA)
  host.querySelectorAll('.ebrScaleBtns input[type="radio"]:checked').forEach(r => {
    const id = r.name.replace('item_', '');
    ebrFormState.respuestas[id] = r.value;
  });

  // 6. Observaciones por ítem
  host.querySelectorAll('.ebrItemObs').forEach(tx => {
    if (tx.dataset.itemObs) {
      ebrFormState.observacionesItems[tx.dataset.itemObs] = tx.value;
    }
  });

  // 7. Proyectos de innovación
  const pInps = host.querySelectorAll('.ebrProyectoInput');
  if (pInps.length > 0) {
    ebrFormState.proyectosInnovacion = Array.from(pInps).map(inp => inp.value);
  }

  // 8. Síntesis (Logros, Aspectos Mejora, Recomendaciones)
  const lEl = host.querySelector('#ebr_logros');
  if (lEl) ebrFormState.sintesis.logros = lEl.value;
  const aEl = host.querySelector('#ebr_aspectos_mejora');
  if (aEl) ebrFormState.sintesis.aspectosMejora = aEl.value;
  const rEl = host.querySelector('#ebr_recomendaciones');
  if (rEl) ebrFormState.sintesis.recomendaciones = rEl.value;

  // 9. Compromisos
  const cDir = host.querySelector('#ebr_comp_director');
  if (cDir) ebrFormState.compromisoDirector = cDir.value;
  const cEsp = host.querySelector('#ebr_comp_especialista');
  if (cEsp) ebrFormState.compromisoMonitor = cEsp.value;

  const elComp = host.querySelector('#compList');
  if (elComp) {
    elComp.querySelectorAll('.compRow').forEach((row, i) => {
      if (ebrFormState.compromisosAdicionales[i]) {
        const t = row.querySelector('[data-f="texto"]');
        const r = row.querySelector('[data-f="responsable"]');
        const p = row.querySelector('[data-f="plazo"]');
        if (t) ebrFormState.compromisosAdicionales[i].texto = t.value;
        if (r) ebrFormState.compromisosAdicionales[i].responsable = r.value;
        if (p) ebrFormState.compromisosAdicionales[i].plazo = p.value;
      }
    });
  }
}

/** Retrocompatibilidad para callers de syncCommonFieldsFromDom */
export const syncCommonFieldsFromDom = syncAllEbrFormDataFromDom;

/**
 * Vincula todos los eventos interactivos del formulario de EBR
 */
function attachEbrFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing) {
  // ---- Buscador de IE con autocompletado y detección de visita previa ----
  const instInput = host.querySelector('#f_institucion');
  const dropdown = host.querySelector('#ieDropdown');
  const hint = host.querySelector('#regColegioHint');

  const onSelectColegioEbr = (c) => {
    instInput.value = c.ie || '';
    ebrFormState.colegioId = c.id || '';
    ebrFormState.codigoLocal = cleanTextCode(c.codigoLocal || c.codigoModular || '');
    ebrFormState.red = c.rei || '';
    const codEl = host.querySelector('#ebr_cod_local');
    if (codEl) codEl.value = ebrFormState.codigoLocal;
    const redEl = host.querySelector('#ebr_red');
    if (redEl) redEl.value = ebrFormState.red;

    // Precargar Director y Subdirectores desde la fuente única 'directivos'
    const { director: dirActivo, subdirectores: subsActivos } = getDirectivosActivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);

    if (dirActivo) {
      ebrFormState.director.nombres = dirActivo.apellidosNombres || '';
      ebrFormState.director.dni = cleanTextCode(dirActivo.dni || '');
      ebrFormState.director.telefono = cleanTextCode(dirActivo.telefono || '');
      ebrFormState.director.correo = dirActivo.correo || '';
      ebrFormState.director.condicion = dirActivo.condicion || 'D';

      const dNom = host.querySelector('#ebr_dir_nombre');
      if (dNom) dNom.value = ebrFormState.director.nombres;
      const dDni = host.querySelector('#ebr_dir_dni');
      if (dDni) dDni.value = ebrFormState.director.dni;
      const dTel = host.querySelector('#ebr_dir_tel');
      if (dTel) dTel.value = ebrFormState.director.telefono;
      const dMail = host.querySelector('#ebr_dir_correo');
      if (dMail) dMail.value = ebrFormState.director.correo;
      const dCond = host.querySelector('#ebr_dir_cond');
      if (dCond) dCond.value = ebrFormState.director.condicion;
    }

    let reRenderNeeded = false;
    if (subsActivos && subsActivos.length > 0) {
      ebrFormState.subdirectores = subsActivos.map(s => ({
        id: s.id || genId(),
        nombres: s.apellidosNombres || '',
        dni: cleanTextCode(s.dni || ''),
        telefono: cleanTextCode(s.telefono || ''),
        condicion: s.condicion || 'D',
        correo: s.correo || ''
      }));
      reRenderNeeded = true;
    }

    if (hint) {
      hint.style.display = 'block';
      hint.textContent = `✓ Vinculada al padrón: ${c.ie} · RED ${c.rei || '—'} · Cód: ${c.codigoLocal || '—'}`;
    }

    // Comprobar si ya tiene fichas EBR en 2026 para sugerir Visita 1 o Visita 2
    checkExistingVisitasEbr(c, host, state, ft, dbNs, currentUser, navigate, isEditing);

    if (reRenderNeeded) {
      syncAllEbrFormDataFromDom(host);
      const scrollY = window.scrollY;
      renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    }
  };

  if (instInput && dropdown) {
    const showDropdown = () => {
      const q = normalizeText(instInput.value);
      const colegios = state.colegios || [];
      const matches = colegios.filter(c => !q || normalizeText(c.ie).includes(q) || normalizeText(c.codigoLocal).includes(q)).slice(0, 25);
      if (!matches.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = matches.map(c => `
        <div class="ieDropdownItem" data-col-id="${c.id}">
          <div class="ieDropMain">${esc(c.ie)}</div>
          <div class="ieDropSub">${esc(c.codigoLocal || '')} ${c.rei ? '· RED ' + esc(c.rei) : ''} ${c.director && c.director.nombre ? '· Dir: ' + esc(c.director.nombre) : ''}</div>
        </div>
      `).join('');
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          const col = (state.colegios || []).find(x => x.id === item.dataset.colId);
          if (col) onSelectColegioEbr(col);
          dropdown.style.display = 'none';
        };
      });
    };

    instInput.addEventListener('input', showDropdown);
    instInput.addEventListener('focus', () => { if (!instInput.value) showDropdown(); });
    instInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });
  }

  // ---- Guardar datos del subdirector ----
  const btnSaveSub = host.querySelector('#btnSaveSubdirector');
  if (btnSaveSub) {
    btnSaveSub.onclick = async () => {
      syncAllEbrFormDataFromDom(host);

      const subs = ebrFormState.subdirectores || [];
      const validSubs = subs.filter(s => s && s.nombres && s.nombres.trim() && !isPlaceholderDirectivo(s.nombres));

      if (validSubs.length === 0) {
        showToast('⚠️ Ingrese al menos los apellidos y nombres del subdirector antes de guardar.');
        return;
      }

      // Buscar colegio vinculado
      const colId = ebrFormState.colegioId || '';
      const codLocal = cleanTextCode(ebrFormState.codigoLocal || '');
      const ieName = (ebrFormState.institucion || '').trim();

      let matchedCol = null;
      if (state && state.colegios) {
        matchedCol = state.colegios.find(c =>
          (colId && c.id === colId) ||
          (codLocal && (cleanTextCode(c.codigoLocal) === codLocal || cleanTextCode(c.codigoModular) === codLocal)) ||
          (ieName && normalizeText(c.ie) === normalizeText(ieName))
        );
      }

      const origText = btnSaveSub.innerHTML;
      btnSaveSub.disabled = true;
      btnSaveSub.innerHTML = '💾 Guardando...';

      try {
        if (dbNs) {
          const fichaPayload = {
            colegioId: matchedCol ? matchedCol.id : colId,
            institucion: matchedCol ? matchedCol.ie : ieName,
            codigoLocal: matchedCol ? cleanTextCode(matchedCol.codigoLocal) : codLocal,
            director: ebrFormState.director,
            subdirectores: validSubs,
            fichaTypeNombre: 'Ficha EBR Gestión Escolar',
            fecha: ebrFormState.fecha || todayStr(),
            visita: ebrFormState.visita || 2
          };

          const res = await syncDirectivosFromFicha(dbNs, fichaPayload, state, currentUser);
          if (res && res.success) {
            showToast('✓ Datos del subdirector guardados correctamente y sincronizados con el Directorio.');
          } else {
            showToast('✓ Datos del subdirector guardados en el formulario.');
          }
        } else {
          showToast('✓ Datos del subdirector guardados en el formulario.');
        }
      } catch (err) {
        console.error('Error guardando datos del subdirector:', err);
        showToast('⚠️ Datos guardados localmente en el formulario.');
      } finally {
        btnSaveSub.disabled = false;
        btnSaveSub.innerHTML = origText;
      }
    };
  }

  // Sincronización en tiempo real de inputs de subdirectores
  host.querySelectorAll('.ebrSubdirInput').forEach(inp => {
    const handleSubdirInput = () => {
      const tr = inp.closest('tr');
      if (!tr || tr.dataset.subdirIdx === undefined) return;
      const sIdx = Number(tr.dataset.subdirIdx);
      if (ebrFormState.subdirectores && ebrFormState.subdirectores[sIdx]) {
        const field = inp.dataset.f;
        if (field) ebrFormState.subdirectores[sIdx][field] = inp.value;
      }
    };
    inp.addEventListener('input', handleSubdirInput);
    inp.addEventListener('change', handleSubdirInput);
  });

  // ---- Subdirectores dinámicos ----
  const btnAddSubdir = host.querySelector('#btnAddSubdirector');
  if (btnAddSubdir) {
    btnAddSubdir.onclick = () => {
      syncAllEbrFormDataFromDom(host);
      ebrFormState.subdirectores.push({
        id: genId(),
        nombres: '',
        dni: '',
        telefono: '',
        condicion: 'D',
        correo: ''
      });
      const scrollY = window.scrollY;
      renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }

  host.querySelectorAll('.btnRmSubdir').forEach(btn => {
    btn.onclick = () => {
      syncAllEbrFormDataFromDom(host);
      const idx = Number(btn.dataset.rmSubdir);
      ebrFormState.subdirectores.splice(idx, 1);
      const scrollY = window.scrollY;
      renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  });

  // ---- Tablas de Docentes (Visita 2) ----
  if (ebrFormState.visita === 2) {
    // Sincronizar inputs de tablas en tiempo real
    host.querySelectorAll('.ebrDocInp').forEach(inp => {
      inp.addEventListener('input', () => {
        const tr = inp.closest('tr');
        if (tr && tr.dataset.docRow) {
          const [momentoKey, rIdxStr] = tr.dataset.docRow.split('|');
          const rIdx = Number(rIdxStr);
          const list = momentoKey === 'momento1' ? ebrFormState.docentesMomento1 : ebrFormState.docentesMomento2;
          if (list && list[rIdx]) {
            const field = inp.dataset.f;
            if (field === 'total' || field === 'monitoreados') {
              list[rIdx][field] = inp.value;
              const tNum = Number(list[rIdx].total) || 0;
              const mNum = Number(list[rIdx].monitoreados) || 0;
              list[rIdx].noMonitoreados = Math.max(0, tNum - mNum);
            } else if (inp.dataset.rub && inp.dataset.lvl !== undefined) {
              const rub = inp.dataset.rub;
              const lvl = Number(inp.dataset.lvl);
              if (!Array.isArray(list[rIdx][rub])) list[rIdx][rub] = ['', '', '', ''];
              list[rIdx][rub][lvl] = inp.value;
            }
          }
        }
        recalculateDocentesRow(tr);
        recalculateDocentesTotals(inp.closest('table'));
      });
      // Navegación con teclado: Enter pasa a la fila de abajo
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const curTr = inp.closest('tr');
          const nextTr = curTr.nextElementSibling;
          if (nextTr) {
            const sameColInp = nextTr.querySelector(`[data-f="${inp.dataset.f}"][data-rub="${inp.dataset.rub || ''}"][data-lvl="${inp.dataset.lvl || ''}"]`) ||
                              nextTr.querySelectorAll('input:not([disabled])')[0];
            if (sameColInp) sameColInp.focus();
          }
        }
      });
    });

    // Checkbox No Aplica por fila
    host.querySelectorAll('.chkDocNa').forEach(chk => {
      chk.addEventListener('change', () => {
        const [momentoKey, rIdxStr] = chk.dataset.docNa.split('|');
        const rIdx = Number(rIdxStr);
        const list = momentoKey === 'momento1' ? ebrFormState.docentesMomento1 : ebrFormState.docentesMomento2;
        if (list && list[rIdx]) list[rIdx].noAplica = chk.checked;
        const tr = chk.closest('tr');
        tr.querySelectorAll('.ebrDocInp').forEach(i => i.disabled = chk.checked);
        tr.style.opacity = chk.checked ? '0.4' : '1';
        recalculateDocentesRow(tr);
        recalculateDocentesTotals(tr.closest('table'));
      });
    });

    // Editar nombre del nivel en filas de docentes
    host.querySelectorAll('.btnEditNivel').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        syncAllEbrFormDataFromDom(host);
        const [momentoKey, rIdxStr] = btn.dataset.editNivel.split('|');
        const rIdx = Number(rIdxStr);
        const list = momentoKey === 'momento1' ? ebrFormState.docentesMomento1 : ebrFormState.docentesMomento2;
        const row = list && list[rIdx];
        if (!row) return;

        const nuevoNombre = prompt('Editar nombre del nivel o servicio educativo (ej: AIP, Primaria, Secundaria, etc.):', row.nivel || '');
        if (nuevoNombre === null) return;
        const trimmed = nuevoNombre.trim();
        if (!trimmed) {
          showToast('⚠️ El nombre del nivel no puede estar vacío.');
          return;
        }

        row.nivel = trimmed;
        const tr = btn.closest('tr');
        if (tr) {
          const lbl = tr.querySelector('.ebrNivelLabel');
          if (lbl) {
            lbl.textContent = trimmed;
            lbl.title = trimmed;
          }
        }
        showToast(`✓ Nivel actualizado: ${trimmed}`);
      };
    });

    // Copiar totales del primer momento
    const btnCopyM1 = host.querySelector('#btnCopiarTotalesM1');
    if (btnCopyM1) {
      btnCopyM1.onclick = () => {
        syncAllEbrFormDataFromDom(host);
        const m1 = ebrFormState.docentesMomento1 || [];
        const m2 = ebrFormState.docentesMomento2 || [];
        let copied = 0;
        m1.forEach((r1, i) => {
          if (m2[i] && r1.total !== '' && r1.total !== undefined) {
            m2[i].total = r1.total;
            copied++;
          }
        });
        const scrollY = window.scrollY;
        renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
        window.scrollTo({ top: scrollY, behavior: 'instant' });
        showToast(copied > 0 ? '✓ Totales de docentes copiados del primer momento.' : '⚠️ No hay totales ingresados en el primer momento.');
      };
    }

    // Agregar fila personalizada a la tabla de docentes
    host.querySelectorAll('.btnAddFilaDocente').forEach(btn => {
      btn.onclick = () => {
        syncAllEbrFormDataFromDom(host);
        const mKey = btn.dataset.momento === '1' ? 'docentesMomento1' : 'docentesMomento2';
        const nivelName = prompt('Ingrese el nombre del nivel o servicio (ej: AIP, Aula de Innovación):', 'AIP');
        if (!nivelName || !nivelName.trim()) return;
        ebrFormState[mKey].push({
          id: genId(),
          nivel: nivelName.trim(),
          noAplica: false,
          total: '',
          monitoreados: '',
          noMonitoreados: 0,
          R1: ['', '', '', ''],
          R2: ['', '', '', ''],
          R3: ['', '', '', ''],
          R4: ['', '', '', ''],
          R5: ['', '', '', '']
        });
        const scrollY = window.scrollY;
        renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      };
    });

    // Quitar fila personalizada
    host.querySelectorAll('.btnRmFilaDoc').forEach(btn => {
      btn.onclick = () => {
        syncAllEbrFormDataFromDom(host);
        const [momentoKey, rIdxStr] = btn.dataset.rmDoc.split('|');
        const list = momentoKey === 'momento1' ? ebrFormState.docentesMomento1 : ebrFormState.docentesMomento2;
        list.splice(Number(rIdxStr), 1);
        const scrollY = window.scrollY;
        renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
        window.scrollTo({ top: scrollY, behavior: 'instant' });
      };
    });

    // Calcular totales iniciales
    host.querySelectorAll('.ebrDocentesTable').forEach(tbl => {
      tbl.querySelectorAll('tbody tr').forEach(recalculateDocentesRow);
      recalculateDocentesTotals(tbl);
    });
  }

  // ---- Ítems con escala Inicio / Proceso / Logrado / No Aplica (NA) con desmarcado por segundo clic ----
  host.querySelectorAll('.ebrScaleBtns label').forEach(lbl => {
    lbl.onclick = (e) => {
      e.preventDefault();
      const radio = lbl.querySelector('input[type="radio"]');
      if (!radio) return;
      const itemId = radio.name.replace('item_', '');
      const wasChecked = radio.checked || (ebrFormState.respuestas[itemId] === radio.value);

      if (wasChecked) {
        // Segundo clic: desmarcar
        radio.checked = false;
        delete ebrFormState.respuestas[itemId];
        lbl.classList.remove('active');
      } else {
        // Primer clic: seleccionar
        lbl.parentElement.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
        radio.checked = true;
        ebrFormState.respuestas[itemId] = radio.value;
        lbl.parentElement.querySelectorAll('label').forEach(l => l.classList.toggle('active', l === lbl));
      }

      updateAllSectionTotals(host);
      const seccionesActuales = ebrFormState.visita === 1
        ? (ft.seccionesVisita1 || EBR_GESTION_VISITA_1_SECCIONES)
        : (ft.seccionesVisita2 || EBR_GESTION_VISITA_2_SECCIONES);
      const totalItemsCount = seccionesActuales.reduce((a, s) => a + (s.items || []).length, 0);
      updateEbrProgressBadge(host, totalItemsCount);
    };
  });

  // Observaciones por ítem
  host.querySelectorAll('.ebrItemObs').forEach(tx => {
    tx.addEventListener('input', () => {
      ebrFormState.observacionesItems[tx.dataset.itemObs] = tx.value;
    });
  });

  // Proyectos de innovación
  const btnAddProj = host.querySelector('#btnAddProyecto');
  if (btnAddProj) {
    btnAddProj.onclick = () => {
      syncAllEbrFormDataFromDom(host);
      ebrFormState.proyectosInnovacion.push('');
      const scrollY = window.scrollY;
      renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  }

  host.querySelectorAll('.ebrProyectoInput').forEach(inp => {
    inp.addEventListener('input', () => {
      ebrFormState.proyectosInnovacion[+inp.dataset.projIdx] = inp.value;
    });
  });

  host.querySelectorAll('.btnRmProyecto').forEach(btn => {
    btn.onclick = () => {
      syncAllEbrFormDataFromDom(host);
      ebrFormState.proyectosInnovacion.splice(+btn.dataset.rmProj, 1);
      if (!ebrFormState.proyectosInnovacion.length) ebrFormState.proyectosInnovacion.push('');
      const scrollY = window.scrollY;
      renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  });

  // Renderizar y vincular compromisos adicionales
  renderEbrCompList(host);
  const addCompBtn = host.querySelector('#addCompBtn');
  if (addCompBtn) {
    addCompBtn.onclick = () => {
      syncAllEbrFormDataFromDom(host);
      ebrFormState.compromisosAdicionales.push({ texto: '', responsable: '', plazo: '' });
      renderEbrCompList(host);
    };
  }

  // Cancelar formulario
  const cancelBtn = host.querySelector('#cancelFormBtn');
  if (cancelBtn) {
    cancelBtn.onclick = () => {
      if (confirm('¿Deseas salir del formulario? Los cambios no guardados se perderán.')) {
        resetEbrFormState();
        if (navigate) navigate('registrar');
      }
    };
  }
}

/**
 * Renderiza la lista dinámica de compromisos adicionales en el formulario EBR
 */
function renderEbrCompList(host) {
  const el = host.querySelector('#compList');
  if (!el) return;
  const list = ebrFormState.compromisosAdicionales || [];
  if (list.length === 0) {
    el.innerHTML = '<p class="helpText" style="margin:4px 0 8px;font-size:12px;color:var(--ink-soft)">No hay compromisos adicionales registrados.</p>';
    return;
  }
  el.innerHTML = list.map((c, i) => `
    <div class="compRow" style="display:flex;gap:8px;margin-bottom:8px;align-items:center">
      <input type="text" placeholder="Compromiso..." style="flex:2" value="${esc(c.texto || '')}" data-ebr-comp="${i}" data-f="texto">
      <input type="text" placeholder="Responsable..." style="flex:1" value="${esc(c.responsable || '')}" data-ebr-comp="${i}" data-f="responsable">
      <input type="date" title="Plazo (fecha límite)" style="max-width:140px" value="${esc(c.plazo || '')}" data-ebr-comp="${i}" data-f="plazo">
      <button type="button" class="iconBtn" data-rm-ebr-comp="${i}" title="Quitar">✕</button>
    </div>
  `).join('');

  el.querySelectorAll('input[data-ebr-comp]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = +inp.dataset.ebrComp;
      if (ebrFormState.compromisosAdicionales[idx]) {
        ebrFormState.compromisosAdicionales[idx][inp.dataset.f] = inp.value;
      }
    });
  });

  el.querySelectorAll('[data-rm-ebr-comp]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = +btn.dataset.rmEbrComp;
      ebrFormState.compromisosAdicionales.splice(idx, 1);
      renderEbrCompList(host);
    });
  });
}

/**
 * Consulta en `state.submissions` si la IE seleccionada ya tiene visitas EBR en 2026
 */
function checkExistingVisitasEbr(colegio, host, state, ft, dbNs = null, currentUser = null, navigate = null, isEditing = false) {
  const noticeWrap = host.querySelector('#ebrVisitaNoticeWrap');
  if (!noticeWrap) return;

  const colId = colegio.id;
  const colNameNorm = normalizeText(colegio.ie || '');

  const submissions = (state.submissions || []).filter(s => {
    if (s.fichaTypeId !== ft.id) return false;
    const sameId = s.colegioId && s.colegioId === colId;
    const sameName = s.institucion && normalizeText(s.institucion) === colNameNorm;
    return sameId || sameName;
  });

  if (submissions.length === 0) {
    // No tiene visitas aún: sugerir Visita 1
    noticeWrap.innerHTML = `
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:6px;padding:8px 12px;font-size:12px;color:#065F46">
        💡 <strong>Sugerencia:</strong> Esta I.E. aún no tiene visitas registradas en 2026. Se recomienda aplicar la <strong>Visita 1 · Primer momento</strong>.
      </div>
    `;
    if (!ebrFormState.visita) {
      ebrFormState.visita = 1;
      renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
    }
  } else {
    const hasV1 = submissions.find(s => Number(s.visita) === 1);
    const hasV2 = submissions.find(s => Number(s.visita) === 2);

    if (hasV1 && !hasV2) {
      // Ya tiene Visita 1: sugerir Visita 2 y precargar datos de la IE y Director
      noticeWrap.innerHTML = `
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:8px 12px;font-size:12px;color:#1E40AF">
          💡 <strong>Sugerencia:</strong> Esta I.E. ya cuenta con la <strong>Visita 1</strong> registrada el ${formatDate(hasV1.fecha)}. Se sugiere registrar la <strong>Visita 2 · Segundo momento</strong> (se han precargado los datos de la I.E. y directivos).
        </div>
      `;
      // Precargar datos desde Visita 1 si están vacíos
      if (hasV1.director && !ebrFormState.director.nombres) {
        ebrFormState.director.nombres = typeof hasV1.director === 'object' ? hasV1.director.nombres : hasV1.director;
        ebrFormState.director.dni = hasV1.directorDni || (hasV1.director && hasV1.director.dni) || '';
      }
      if (Array.isArray(hasV1.subdirectores) && hasV1.subdirectores.length && !ebrFormState.subdirectores.length) {
        ebrFormState.subdirectores = [...hasV1.subdirectores];
      }
      if (!ebrFormState.visita) {
        ebrFormState.visita = 2;
        renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
      }
    } else if (hasV2) {
      // Ya tiene Visita 2
      noticeWrap.innerHTML = `
        <div style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:6px;padding:8px 12px;font-size:12px;color:#92400E">
          ⚠️ <strong>Atención:</strong> Esta I.E. ya tiene registrada la <strong>Visita 2</strong> del ${formatDate(hasV2.fecha)}.
        </div>
      `;
    }
  }
}

/**
 * Recalcula una fila individual de la tabla de docentes (Docentes no monitoreados y validación de rúbricas)
 */
function recalculateDocentesRow(tr) {
  if (!tr) return;
  const isNa = tr.querySelector('.chkDocNa') && tr.querySelector('.chkDocNa').checked;
  const noMonitCell = tr.querySelector('.ebrDocNoMonit');

  if (isNa) {
    if (noMonitCell) noMonitCell.textContent = '0';
    return;
  }

  const totInp = tr.querySelector('.ebrDocTotal');
  const monInp = tr.querySelector('.ebrDocMonit');

  const total = Number(totInp ? totInp.value : 0) || 0;
  const monit = Number(monInp ? monInp.value : 0) || 0;

  // No monitoreados = Total - Monitoreados
  const noMonit = Math.max(0, total - monit);
  if (noMonitCell) noMonitCell.textContent = noMonit;

  // Advertir si monitoreados > total
  if (monit > total && total > 0) {
    monInp.style.borderColor = 'var(--danger)';
    monInp.style.background = '#FEF2F2';
  } else if (monInp) {
    monInp.style.borderColor = '';
    monInp.style.background = '';
  }

  // Validación de suma de niveles por cada rúbrica R1–R5
  const rubIds = ['R1', 'R2', 'R3', 'R4', 'R5'];
  rubIds.forEach(rubId => {
    const lvlInps = tr.querySelectorAll(`.ebrDocLvl[data-rub="${rubId}"]`);
    let rubSum = 0;
    lvlInps.forEach(i => rubSum += (Number(i.value) || 0));

    // Si hay docentes monitoreados, comprobar coincidencia
    const mismatch = monit > 0 && rubSum !== monit;
    lvlInps.forEach(i => {
      i.style.background = mismatch ? '#FEF3C7' : '';
      i.style.borderColor = mismatch ? '#F59E0B' : '';
      i.title = mismatch ? `${rubId}: La suma (${rubSum}) no coincide con los docentes monitoreados (${monit})` : '';
    });
  });
}

/**
 * Recalcula la fila Total de una tabla de docentes
 */
function recalculateDocentesTotals(tbl) {
  if (!tbl) return;
  const momentoKey = tbl.dataset.momentoTable;
  const rows = tbl.querySelectorAll('tbody tr:not([style*="opacity"])');

  let sumTotal = 0;
  let sumMonit = 0;
  let sumNoMonit = 0;
  const rubSums = {
    R1: [0, 0, 0, 0],
    R2: [0, 0, 0, 0],
    R3: [0, 0, 0, 0],
    R4: [0, 0, 0, 0],
    R5: [0, 0, 0, 0]
  };

  rows.forEach(tr => {
    const isNa = tr.querySelector('.chkDocNa') && tr.querySelector('.chkDocNa').checked;
    if (isNa) return;

    const t = Number(tr.querySelector('.ebrDocTotal') ? tr.querySelector('.ebrDocTotal').value : 0) || 0;
    const m = Number(tr.querySelector('.ebrDocMonit') ? tr.querySelector('.ebrDocMonit').value : 0) || 0;
    sumTotal += t;
    sumMonit += m;
    sumNoMonit += Math.max(0, t - m);

    ['R1', 'R2', 'R3', 'R4', 'R5'].forEach(rId => {
      [0, 1, 2, 3].forEach(lvl => {
        const inp = tr.querySelector(`.ebrDocLvl[data-rub="${rId}"][data-lvl="${lvl}"]`);
        rubSums[rId][lvl] += Number(inp ? inp.value : 0) || 0;
      });
    });
  });

  const setT = (id, val) => {
    const el = tbl.querySelector(`#${id}`);
    if (el) el.textContent = val;
  };

  setT(`tot_${momentoKey}_total`, sumTotal);
  setT(`tot_${momentoKey}_monit`, sumMonit);
  setT(`tot_${momentoKey}_nomonit`, sumNoMonit);

  ['R1', 'R2', 'R3', 'R4', 'R5'].forEach(rId => {
    [0, 1, 2, 3].forEach(lvl => {
      setT(`tot_${momentoKey}_${rId}_${lvl}`, rubSums[rId][lvl]);
    });
  });
}

/**
 * Actualiza los contadores de subtotales de cada sección (Inicio / Proceso / Logrado)
 */
function updateAllSectionTotals(host) {
  if (!host) return;

  host.querySelectorAll('.formSecCard').forEach(card => {
    let ini = 0, proc = 0, log = 0, na = 0, pend = 0;
    card.querySelectorAll('.ebrItemCard').forEach(itemCard => {
      const checked = itemCard.querySelector('input[type="radio"]:checked');
      if (!checked) pend++;
      else if (checked.value === 'inicio') ini++;
      else if (checked.value === 'proceso') proc++;
      else if (checked.value === 'logrado') log++;
      else if (checked.value === 'na') na++;
    });

    const totRow = card.querySelector('.ebrSecTotalRow');
    if (totRow) {
      const elI = totRow.querySelector('.secTotInicio');
      if (elI) elI.textContent = ini;
      const elP = totRow.querySelector('.secTotProceso');
      if (elP) elP.textContent = proc;
      const elL = totRow.querySelector('.secTotLogrado');
      if (elL) elL.textContent = log;
      const elNa = totRow.querySelector('.secTotNa');
      if (elNa) elNa.textContent = na;
      const elPend = totRow.querySelector('.secTotPendiente');
      if (elPend) elPend.textContent = pend;
    }
  });
}

/**
 * Actualiza la insignia de progreso general del formulario
 */
function updateEbrProgressBadge(host, totalItems) {
  const badge = host.querySelector('#regProgressBadge');
  if (!badge) return;
  const answered = host.querySelectorAll('.ebrScaleBtns input[type="radio"]:checked').length;
  const pct = totalItems ? Math.round((answered / totalItems) * 100) : 0;
  badge.innerHTML = `Avance: <strong>${answered} de ${totalItems}</strong> ítems respondidos (${pct}%)`;
}

/**
 * Recolecta y valida todos los datos estructurados del formulario EBR para guardado en Firestore
 */
export function collectEbrGestionFormData(host, ft, isEdit = false) {
  if (!host || !ft) throw new Error('Formulario o plantilla no disponible.');

  syncCommonFieldsFromDom(host);

  const instEl = host.querySelector('#f_institucion');
  const fechaEl = host.querySelector('#f_fecha');

  const institucion = instEl ? instEl.value.trim() : '';
  const fecha = fechaEl ? fechaEl.value : todayStr();
  const visita = ebrFormState.visita || 1;

  if (!institucion) throw new Error('Debes indicar la institución educativa.');
  if (!ebrFormState.director.nombres) throw new Error('Debes ingresar los apellidos y nombres del director(a).');
  if (!ebrFormState.codigoLocal) throw new Error('Debes ingresar el código de local de la I.E.');

  // Recolectar datos de las tablas de docentes si es Visita 2
  let docentesPayload = null;
  let hasRubricMismatch = false;
  let mismatchDetails = [];

  if (visita === 2) {
    const parseDocTable = (momentoKey) => {
      const tbl = host.querySelector(`.ebrDocentesTable[data-momento-table="${momentoKey}"]`);
      if (!tbl) return [];
      const trs = tbl.querySelectorAll('tbody tr');
      return Array.from(trs).map(tr => {
        const nivelEl = tr.querySelector('.ebrNivelLabel') || tr.querySelector('.ebrStickyCol');
        const nivel = nivelEl ? (tr.querySelector('.ebrNivelLabel') ? tr.querySelector('.ebrNivelLabel').textContent.trim() : (nivelEl.textContent || '').replace('✏️', '').trim()) : '';
        const noAplica = (tr.querySelector('.chkDocNa') || {}).checked === true;
        const total = Number((tr.querySelector('.ebrDocTotal') || {}).value) || 0;
        const monitoreados = Number((tr.querySelector('.ebrDocMonit') || {}).value) || 0;
        const noMonitoreados = Math.max(0, total - monitoreados);

        const getRubLvl = (rubId) => [0, 1, 2, 3].map(lvl => Number((tr.querySelector(`.ebrDocLvl[data-rub="${rubId}"][data-lvl="${lvl}"]`) || {}).value) || 0);

        const R1 = getRubLvl('R1');
        const R2 = getRubLvl('R2');
        const R3 = getRubLvl('R3');
        const R4 = getRubLvl('R4');
        const R5 = getRubLvl('R5');

        if (!noAplica && monitoreados > 0) {
          [ { id: 'R1', arr: R1 }, { id: 'R2', arr: R2 }, { id: 'R3', arr: R3 }, { id: 'R4', arr: R4 }, { id: 'R5', arr: R5 } ].forEach(item => {
            const s = item.arr.reduce((a, b) => a + b, 0);
            if (s !== monitoreados) {
              hasRubricMismatch = true;
              mismatchDetails.push(`${item.id} en ${nivel}: la suma es ${s} y deben ser ${monitoreados}`);
            }
          });
        }

        return {
          nivel,
          noAplica,
          total,
          monitoreados,
          noMonitoreados,
          R1, R2, R3, R4, R5
        };
      });
    };

    docentesPayload = {
      momento1: parseDocTable('momento1'),
      momento2: parseDocTable('momento2')
    };

    // Si hay discrepancias, pedir confirmación antes de guardar
    if (hasRubricMismatch) {
      const confirmWarning = confirm(
        'Atención: Existen diferencias en las tablas de docentes:\n\n• ' +
        mismatchDetails.slice(0, 4).join('\n• ') +
        (mismatchDetails.length > 4 ? `\n... y ${mismatchDetails.length - 4} más.` : '') +
        '\n\n¿Deseas guardar la ficha con estas observaciones?'
      );
      if (!confirmWarning) throw new Error('Ajusta los valores de las rúbricas para que la suma coincida con los docentes monitoreados.');
    }
  }

  // Recolectar respuestas de ítems
  const seccionesActuales = visita === 1
    ? (ft.seccionesVisita1 || EBR_GESTION_VISITA_1_SECCIONES)
    : (ft.seccionesVisita2 || EBR_GESTION_VISITA_2_SECCIONES);

  const respuestas = [];
  let answeredCount = 0;
  let totalItems = 0;

  seccionesActuales.forEach(sec => {
    (sec.items || []).forEach(it => {
      totalItems++;
      const radio = host.querySelector(`input[name="item_${it.id}"]:checked`);
      const val = radio ? radio.value : null;
      const obs = (host.querySelector(`[data-item-obs="${it.id}"]`) || {}).value || '';
      if (val) answeredCount++;

      respuestas.push({
        id: it.id,
        num: it.num,
        texto: it.texto,
        seccion: sec.nombre,
        valor: val,
        observaciones: obs.trim()
      });
    });
  });

  const esBorrador = answeredCount < totalItems;
  if (esBorrador) {
    const ok = confirm(`Hay ${totalItems - answeredCount} de ${totalItems} ítems sin calificar.\n¿Deseas guardar la ficha como BORRADOR?`);
    if (!ok) throw new Error('Completa los indicadores pendientes para guardar la ficha final.');
  }

  // Logros y compromisos
  const logrosVal = (host.querySelector('#ebr_logros') || {}).value || '';
  const aspectosVal = (host.querySelector('#ebr_aspectos_mejora') || {}).value || '';
  const recsVal = (host.querySelector('#ebr_recomendaciones') || {}).value || '';
  const compDirVal = (host.querySelector('#ebr_comp_director') || {}).value || '';
  const compEspVal = (host.querySelector('#ebr_comp_especialista') || {}).value || '';

  // Preparar extras planos para total retrocompatibilidad con vistas de reportes existentes
  const extrasFlat = [
    { label: 'RED', value: ebrFormState.red },
    { label: 'Código Modular / Local', value: ebrFormState.codigoLocal },
    { label: 'Secundaria con Formación Técnica', value: ebrFormState.formacionTecnica ? 'Sí' : 'No' },
    { label: 'Director(a)', value: ebrFormState.director.nombres },
    { label: 'DNI Director(a)', value: ebrFormState.director.dni },
    { label: 'Condición', value: ebrFormState.director.condicion }
  ];

  if (docentesPayload) {
    const m1 = docentesPayload.momento1 || [];
    const m2 = docentesPayload.momento2 || [];
    extrasFlat.push({ label: 'Total docentes Inicial 1er momento', value: (m1.find(r => r.nivel === 'Inicial') || {}).total || 0 });
    extrasFlat.push({ label: 'Total docentes Primaria 1er momento', value: (m1.find(r => r.nivel === 'Primaria') || {}).total || 0 });
    extrasFlat.push({ label: 'Total docentes Secundaria 1er momento', value: (m1.find(r => r.nivel === 'Secundaria') || {}).total || 0 });
    extrasFlat.push({ label: 'Total docentes Inicial 2do momento', value: (m2.find(r => r.nivel === 'Inicial') || {}).total || 0 });
    extrasFlat.push({ label: 'Total docentes Primaria 2do momento', value: (m2.find(r => r.nivel === 'Primaria') || {}).total || 0 });
    extrasFlat.push({ label: 'Total docentes Secundaria 2do momento', value: (m2.find(r => r.nivel === 'Secundaria') || {}).total || 0 });
  }

  // Modelo estructurado exacto según Requerimiento 8
  return {
    fichaTypeId: ft.id,
    fichaTypeNombre: ft.nombre,
    tipoRespuesta: 'ips',
    visita: Number(visita),
    visitaTipo: visita === 1 ? 'Visita 1 · Primer momento' : 'Visita 2 · Segundo momento',
    institucion,
    fecha,
    ie: {
      codigoLocal: ebrFormState.codigoLocal,
      red: ebrFormState.red,
      formacionTecnica: ebrFormState.formacionTecnica
    },
    director: {
      nombres: ebrFormState.director.nombres,
      dni: ebrFormState.director.dni,
      telefono: ebrFormState.director.telefono,
      condicion: ebrFormState.director.condicion,
      correo: ebrFormState.director.correo
    },
    subdirectores: (ebrFormState.subdirectores || []).filter(s => s && s.nombres && s.nombres.trim()),
    docentes: docentesPayload,
    items: respuestas,
    respuestas,
    proyectosInnovacion: (ebrFormState.proyectosInnovacion || []).filter(p => p && p.trim()),
    logros: logrosVal.trim(),
    aspectosMejora: aspectosVal.trim(),
    recomendaciones: recsVal.trim(),
    sintesis: [
      {
        dimension: 'P1 Instituciones educativas que aseguran aprendizajes',
        logros: logrosVal.trim(),
        dificultades: aspectosVal.trim(),
        aspectosMejora: aspectosVal.trim(),
        recomendaciones: recsVal.trim()
      }
    ],
    compromisos: {
      directivo: compDirVal.trim(),
      especialista: compEspVal.trim()
    },
    compromisoDirector: compDirVal.trim(),
    compromisoMonitor: compEspVal.trim(),
    compromisosList: ebrFormState.compromisosAdicionales || [],
    extras: extrasFlat,
    ugel: 'UGEL 03',
    red: ebrFormState.red,
    codigoModular: ebrFormState.codigoLocal,
    esBorrador,
    updatedAt: Date.now()
  };
}
