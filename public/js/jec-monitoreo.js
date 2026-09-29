/* =========================================================================
   jec-monitoreo.js — Módulo especializado para la Ficha:
   "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
   UGEL 03 · AGEBRE
   
   Estructura oficial del instrumento:
   - III. Datos Generales de la IE (Secciones, Estudiantes, Docentes, Secundaria con Formación Técnica)
   - IV. Datos del Directivo que brinda la información solicitada
   - V. Data de Docentes Monitoreados a la fecha de la visita Nivel Secundaria
        (1er monitoreo y 2do monitoreo con R1 a R5 en niveles I a IV y porcentajes calculados)
   - Indicadores de Monitoreo (31 ítems en 3 componentes con columna de Hallazgos)
   - Nivel de Implementación del MSE JEC:
       * Implementación lograda:    De 24 a 31 respuestas "Sí" (Logrado)
       * Implementación parcial:    De 12 a 23 respuestas "Sí" (En proceso)
       * Implementación incipiente: De 0 a 11 respuestas "Sí"  (Inicio)
   ========================================================================= */

import { esc, normalizeText, showToast, genId, fmtDate as formatDate, todayStr } from './ui.js?v=20260928_v12';
import { getDirectivosActivosForColegio, cleanTextCode, syncDirectivosFromFicha, isPlaceholderDirectivo } from './directorio.js?v=20260928_v12';
import { RUBRICAS_OBSERVACION_AULA } from './ebr-gestion.js?v=20260928_v12';
import { isFichaJec, REGLA_NIVEL_JEC, estadoPorRegla, ESPECIALISTA_JEC_OFICIAL, isFichaEspecialistaJec } from './calcEngine.js?v=20260928_v12';

export { isFichaJec, REGLA_NIVEL_JEC, ESPECIALISTA_JEC_OFICIAL, isFichaEspecialistaJec };

/**
 * Los 31 ítems oficiales del instrumento MSE JEC distribuidos en 3 componentes
 */
export const JEC_ITEMS = [
  // ─── Componente pedagógico (Implementación TOECE) (9 ítems) ───
  {
    id: 'jec_1',
    num: 1,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'El horario institucional evidencia la organización de la jornada escolar en 9 horas pedagógicas diarias de 45 minutos, conforme al plan de estudios MSE JEC',
    evidencia: 'Horario institucional, horarios de aula y registro en SIAGIE.'
  },
  {
    id: 'jec_2',
    num: 2,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'La IE cuenta con un diagnóstico de las necesidades de aprendizaje de los estudiantes que orienta la planificación pedagógica',
    evidencia: 'Evaluación diagnóstica sistematizada y matriz de necesidades formativas.'
  },
  {
    id: 'jec_3',
    num: 3,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'La IE cuenta con Plan TOECE actualizado, aprobado y coherente con las necesidades socioemocionales identificadas',
    evidencia: 'Plan TOECE aprobado con RD institucional y coherente al diagnóstico.'
  },
  {
    id: 'jec_4',
    num: 4,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'La IE cuenta con informes, actas, registros o acuerdos que evidencian el seguimiento a la implementación del Plan TOECE',
    evidencia: 'Actas de reunión, acuerdos o informes del comité de gestión del bienestar.'
  },
  {
    id: 'jec_5',
    num: 5,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'La IE cuenta con sesiones de tutoría grupal que evidencian coherencia con el Plan TOECE y las necesidades socioemocionales identificadas',
    evidencia: 'Sesiones de tutoría grupal en carpetas pedagógicas de los tutores.'
  },
  {
    id: 'jec_6',
    num: 6,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'La IE cuenta con registros de atención tutorial individual que evidencian seguimiento a estudiantes con necesidades específicas',
    evidencia: 'Fichas de atención individualizada y compromisos con las familias.'
  },
  {
    id: 'jec_7',
    num: 7,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'La IE cuenta con el plan de trabajo del psicólogo(a) actualizado, con actividades para estudiantes, orientación a familias y acciones formativas con docentes',
    evidencia: 'Plan de trabajo del psicólogo(a) con actividades calendarizadas.'
  },
  {
    id: 'jec_8',
    num: 8,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'La IE cuenta con informes, registros, actas u otros documentos que evidencian que el psicólogo(a) desarrolla acciones dirigidas a estudiantes, docentes y familias',
    evidencia: 'Informes mensuales, fichas de atención, talleres o actas de reuniones.'
  },
  {
    id: 'jec_9',
    num: 9,
    seccion: 'Componente pedagógico (Implementación TOECE)',
    texto: 'Las sesiones de aprendizaje revisadas evidencian que responden a las necesidades de aprendizaje identificadas en los estudiantes',
    evidencia: 'Muestra de sesiones de aprendizaje de diferentes áreas con criterios formativos.'
  },

  // ─── Componente de gestión (11 ítems) ───
  {
    id: 'jec_10',
    num: 10,
    seccion: 'Componente de gestión',
    texto: 'La IE cuenta con un Plan Anual de Trabajo (PAT) que incorpora acciones del MSE JEC relacionadas con tutoría, acompañamiento, trabajo colegiado y CIST',
    evidencia: 'PAT aprobado con metas y actividades articuladas a los componentes JEC.'
  },
  {
    id: 'jec_11',
    num: 11,
    seccion: 'Componente de gestión',
    texto: 'La IE cuenta con actas, acuerdos u otros registros que evidencian la organización de la comunidad educativa para asegurar el refrigerio escolar y recreos',
    evidencia: 'Protocolos de convivencia en recreos, turnos y comisiones de refrigerio escolar.'
  },
  {
    id: 'jec_12',
    num: 12,
    seccion: 'Componente de gestión',
    texto: 'La IE cuenta con actas, comunicados, informes o registros que evidencian acciones de información y orientación a las familias',
    evidencia: 'Escuelas de familias, asambleas y comunicados oficiales.'
  },
  {
    id: 'jec_13',
    num: 13,
    seccion: 'Componente de gestión',
    texto: 'La IE cuenta con actas, informes o registros que evidencian la promoción de espacios de participación estudiantil',
    evidencia: 'Municipio Escolar, brigadas escolares y asambleas de aula.'
  },
  {
    id: 'jec_14',
    num: 14,
    seccion: 'Componente de gestión',
    texto: 'La IE cuenta con fichas, actas, registros u otros documentos que evidencian acciones de acompañamiento del director y subdirector a docentes y coordinadores',
    evidencia: 'Fichas de monitoreo y cuadernos de diálogo reflexivo de directivos.'
  },
  {
    id: 'jec_15',
    num: 15,
    seccion: 'Componente de gestión',
    texto: 'La IE organiza las evidencias de la implementación del PEAI de acuerdo a la matriz de logros ambientales',
    evidencia: 'Matriz de logros ambientales y proyectos integrados PEAI.'
  },
  {
    id: 'jec_16',
    num: 16,
    seccion: 'Componente de gestión',
    texto: 'Los directivos monitorean la ejecución de las acciones del Plan Lector para la toma de decisiones y mejoras',
    evidencia: 'Plan Lector, cronograma de lectura e informes de avance.'
  },
  {
    id: 'jec_17',
    num: 17,
    seccion: 'Componente de gestión',
    texto: 'Se identifican buenas prácticas/proyectos de innovación y se promueven espacios de intercambio de experiencias',
    evidencia: 'Proyectos de innovación pedagógica registrados y actas de difusión.'
  },
  {
    id: 'jec_18',
    num: 18,
    seccion: 'Componente de gestión',
    texto: 'El equipo directivo realiza el monitoreo y seguimiento al uso pedagógico de textos escolares y material concreto',
    evidencia: 'Padrón de textos y evidencias del uso de materiales en aula.'
  },
  {
    id: 'jec_19',
    num: 19,
    seccion: 'Componente de gestión',
    texto: 'El directivo realiza el seguimiento a la participación de los docentes en las acciones formativas MINEDU (DIFODS-JEC)',
    evidencia: 'Reportes de matrícula y culminación de cursos DIFODS.'
  },
  {
    id: 'jec_20',
    num: 20,
    seccion: 'Componente de gestión',
    texto: 'Los directivos han socializado los oficios múltiples correspondientes, asegurando su conocimiento e implementación',
    evidencia: 'Actas de reuniones colegiadas de socialización normativa.'
  },

  // ─── Componente de soporte (11 ítems) ───
  {
    id: 'jec_21',
    num: 21,
    seccion: 'Componente de soporte',
    texto: 'La IE cuenta con actas, registros o materiales que evidencian la sensibilización realizada por los coordinadores pedagógicos (CP) a sus docentes a cargo',
    evidencia: 'Presentaciones, actas de inducción y cronogramas de los CP.'
  },
  {
    id: 'jec_22',
    num: 22,
    seccion: 'Componente de soporte',
    texto: 'El CP cuenta con evidencias de la realización de la visita diagnóstica y de ejecución de los docentes a su cargo',
    evidencia: 'Fichas de visita diagnóstica a aula aplicadas por los CP.'
  },
  {
    id: 'jec_23',
    num: 23,
    seccion: 'Componente de soporte',
    texto: 'El CP cuenta con registros que evidencian, de manera objetiva, la práctica pedagógica observada del docente en las visitas de aula',
    evidencia: 'Instrumentos de observación de aula completados objetivamente.'
  },
  {
    id: 'jec_24',
    num: 24,
    seccion: 'Componente de soporte',
    texto: 'El CP cuenta con matrices, planificador semanal, fichas u otros registros que evidencian el desarrollo del diálogo reflexivo con los docentes acompañados',
    evidencia: 'Cuadernos de campo y actas de asesoría pedagógica individual.'
  },
  {
    id: 'jec_25',
    num: 25,
    seccion: 'Componente de soporte',
    texto: 'El CP cuenta con actas, guías u otros registros que evidencian que las reuniones de trabajo colegiado responden a las necesidades formativas identificadas',
    evidencia: 'Agendas, actas y productos de las sesiones semanales de colegiado.'
  },
  {
    id: 'jec_26',
    num: 26,
    seccion: 'Componente de soporte',
    texto: 'La IE cuenta con actas, registros o materiales que evidencian la sensibilización realizada por los coordinadores de tutoría (CT) a sus docentes tutores',
    evidencia: 'Actas de reunión y materiales informativos del CT.'
  },
  {
    id: 'jec_27',
    num: 27,
    seccion: 'Componente de soporte',
    texto: 'El CT cuenta con evidencias de la realización de la visita diagnóstica y de ejecución de los docentes tutores a su cargo',
    evidencia: 'Fichas de visita diagnóstica a la sesión de tutoría.'
  },
  {
    id: 'jec_28',
    num: 28,
    seccion: 'Componente de soporte',
    texto: 'El CT cuenta con registros que evidencian, de manera objetiva, la práctica pedagógica observada del docente tutor posterior a la visita diagnóstica',
    evidencia: 'Fichas de seguimiento a sesiones y atenciones tutoriales.'
  },
  {
    id: 'jec_29',
    num: 29,
    seccion: 'Componente de soporte',
    texto: 'El CT cuenta con matrices, fichas u otros registros que evidencian el desarrollo del diálogo reflexivo con los docentes tutores acompañados',
    evidencia: 'Actas de diálogo reflexivo y compromisos tutoriales.'
  },
  {
    id: 'jec_30',
    num: 30,
    seccion: 'Componente de soporte',
    texto: 'El CT cuenta con actas, materiales u otros registros que evidencian las acciones formativas desarrolladas con docentes tutores en las reuniones colegiadas',
    evidencia: 'Actas de reuniones colegiadas de tutores y temas trabajados.'
  },
  {
    id: 'jec_31',
    num: 31,
    seccion: 'Componente de soporte',
    texto: 'El CIST cuenta con planificador semanal, informes u otros registros que evidencian acciones de fortalecimiento de competencias digitales y mantenimiento de equipos',
    evidencia: 'Planificador semanal, inventario operativo y bitácoras de mantenimiento del aula de innovación/CIST.'
  }
];

export const JEC_SECCIONES = [
  {
    nombre: 'Componente pedagógico (Implementación TOECE)',
    numRomano: '6.1',
    items: JEC_ITEMS.filter(it => it.seccion === 'Componente pedagógico (Implementación TOECE)')
  },
  {
    nombre: 'Componente de gestión',
    numRomano: '6.2',
    items: JEC_ITEMS.filter(it => it.seccion === 'Componente de gestión')
  },
  {
    nombre: 'Componente de soporte',
    numRomano: '6.3',
    items: JEC_ITEMS.filter(it => it.seccion === 'Componente de soporte')
  }
];

/**
 * Calcula el Nivel de Implementación del MSE JEC según el total de respuestas "Sí"
 * Regla oficial MINEDU (Imagen 2):
 * - De 24 a 31 respuestas "Sí": Implementación lograda (Logrado)
 * - De 12 a 23 respuestas "Sí": Implementación parcial (En proceso)
 * - De 0 a 11 respuestas "Sí":  Implementación incipiente (Inicio)
 */
export function getNivelLogroJec(conteoSi) {
  const c = Number(conteoSi) || 0;
  if (c >= 24) {
    return {
      nivel: 'Implementación lograda',
      estado_panel: 'Logrado',
      cls: 'st-logrado',
      color: 'var(--ok)',
      badgeBg: 'var(--ok-bg)',
      rangoTexto: 'De 24 a 31 respuestas "Sí"',
      rangoMin: 24,
      rangoMax: 31
    };
  }
  if (c >= 12) {
    return {
      nivel: 'Implementación parcial',
      estado_panel: 'En proceso',
      cls: 'st-proceso',
      color: 'var(--warn)',
      badgeBg: 'var(--warn-bg)',
      rangoTexto: 'De 12 a 23 respuestas "Sí"',
      rangoMin: 12,
      rangoMax: 23
    };
  }
  return {
    nivel: 'Implementación incipiente',
    estado_panel: 'Inicio',
    cls: 'st-inicio',
    color: 'var(--danger)',
    badgeBg: 'var(--danger-bg)',
    rangoTexto: 'De 0 a 11 respuestas "Sí"',
    rangoMin: 0,
    rangoMax: 11
  };
}

/**
 * Estado en memoria del formulario JEC
 */
let jecFormState = {
  colegioId: '',
  institucion: '',
  codigoModular: '',
  ugel: 'UGEL 03',
  rei: '',
  fecha: todayStr(),
  responsable: ESPECIALISTA_JEC_OFICIAL.nombresApellidos,
  responsableCargo: ESPECIALISTA_JEC_OFICIAL.cargo,
  secciones: '',
  estudiantes: '',
  docentesTotal: '',
  formacionTecnica: false,
  director: {
    nombres: '',
    dni: '',
    telefono: '',
    condicion: 'D',
    correo: ''
  },
  docentes: {
    momento1: createDocenteMomentoRow(),
    momento2: createDocenteMomentoRow()
  },
  respuestas: {},
  hallazgos: {},
  compromisoDirector: '',
  compromisoMonitor: '',
  observaciones: ''
};

function createDocenteMomentoRow() {
  return {
    total: '',
    monitoreados: '',
    noMonitoreados: 0,
    R1: ['', '', '', ''],
    R2: ['', '', '', ''],
    R3: ['', '', '', ''],
    R4: ['', '', '', ''],
    R5: ['', '', '', '']
  };
}

export function resetJecFormState() {
  jecFormState = {
    colegioId: '',
    institucion: '',
    codigoModular: '',
    ugel: 'UGEL 03',
    rei: '',
    fecha: todayStr(),
    responsable: ESPECIALISTA_JEC_OFICIAL.nombresApellidos,
    responsableCargo: ESPECIALISTA_JEC_OFICIAL.cargo,
    secciones: '',
    estudiantes: '',
    docentesTotal: '',
    formacionTecnica: false,
    director: {
      nombres: '',
      dni: '',
      telefono: '',
      condicion: 'D',
      correo: ''
    },
    docentes: {
      momento1: createDocenteMomentoRow(),
      momento2: createDocenteMomentoRow()
    },
    respuestas: {},
    hallazgos: {},
    compromisoDirector: '',
    compromisoMonitor: '',
    observaciones: ''
  };
}

export function preloadJecFormState(sub, ft) {
  resetJecFormState();
  if (!sub) return;

  jecFormState.colegioId = sub.colegioId || (sub.ie && sub.ie.id) || '';
  jecFormState.institucion = sub.institucion || '';
  jecFormState.codigoModular = sub.codigoModular || (sub.ie && sub.ie.codigoModular) || (sub.ie && sub.ie.codigoLocal) || '';
  jecFormState.ugel = sub.ugel || 'UGEL 03';
  jecFormState.rei = sub.rei || sub.red || (sub.ie && sub.ie.rei) || (sub.ie && sub.ie.red) || '';
  jecFormState.fecha = sub.fecha || todayStr();
  jecFormState.responsable = sub.responsable || ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
  jecFormState.responsableCargo = sub.responsableCargo || ESPECIALISTA_JEC_OFICIAL.cargo;

  // Valores de Secciones, Estudiantes, Docentes
  const extras = sub.extras || [];
  const getExVal = (pattern) => {
    const f = extras.find(x => x && x.label && normalizeText(x.label).includes(normalizeText(pattern)));
    return f ? f.value : '';
  };

  jecFormState.secciones = sub.secciones || getExVal('secciones') || '';
  jecFormState.estudiantes = sub.estudiantes || getExVal('estudiantes') || '';
  jecFormState.docentesTotal = sub.docentesTotal || getExVal('docentes') || '';

  // Secundaria con Formación Técnica
  if (sub.formacionTecnica !== undefined) {
    jecFormState.formacionTecnica = sub.formacionTecnica === true;
  } else if (sub.ie && sub.ie.formacionTecnica !== undefined) {
    jecFormState.formacionTecnica = sub.ie.formacionTecnica === true;
  } else {
    const ftVal = getExVal('formacion tecnica') || getExVal('técnica');
    jecFormState.formacionTecnica = ftVal === 'Sí' || ftVal === 'si' || ftVal === true;
  }

  // Directivo
  if (sub.director && typeof sub.director === 'object') {
    jecFormState.director = {
      nombres: sub.director.nombres || sub.director.nombre || '',
      dni: sub.director.dni || '',
      telefono: sub.director.telefono || '',
      condicion: sub.director.condicion || 'D',
      correo: sub.director.correo || ''
    };
  } else if (sub.director) {
    jecFormState.director.nombres = String(sub.director);
    jecFormState.director.dni = sub.directorDni || '';
    jecFormState.director.condicion = sub.condicion || 'D';
    jecFormState.director.telefono = sub.directorTel || '';
    jecFormState.director.correo = sub.directorCorreo || '';
  }

  // Docentes monitoreo 1er y 2do momento
  if (sub.docentes && (sub.docentes.momento1 || sub.docentes.momento2)) {
    const m1 = sub.docentes.momento1;
    const m2 = sub.docentes.momento2;
    if (m1) {
      // Puede venir como array de niveles (EBR) o como objeto único de secundaria (JEC)
      const row1 = Array.isArray(m1) ? (m1.find(r => r.nivel === 'Secundaria') || m1[0] || {}) : m1;
      jecFormState.docentes.momento1 = {
        total: row1.total || '',
        monitoreados: row1.monitoreados || '',
        noMonitoreados: row1.noMonitoreados !== undefined ? row1.noMonitoreados : (Number(row1.total || 0) - Number(row1.monitoreados || 0)),
        R1: row1.R1 || ['', '', '', ''],
        R2: row1.R2 || ['', '', '', ''],
        R3: row1.R3 || ['', '', '', ''],
        R4: row1.R4 || ['', '', '', ''],
        R5: row1.R5 || ['', '', '', '']
      };
    }
    if (m2) {
      const row2 = Array.isArray(m2) ? (m2.find(r => r.nivel === 'Secundaria') || m2[0] || {}) : m2;
      jecFormState.docentes.momento2 = {
        total: row2.total || '',
        monitoreados: row2.monitoreados || '',
        noMonitoreados: row2.noMonitoreados !== undefined ? row2.noMonitoreados : (Number(row2.total || 0) - Number(row2.monitoreados || 0)),
        R1: row2.R1 || ['', '', '', ''],
        R2: row2.R2 || ['', '', '', ''],
        R3: row2.R3 || ['', '', '', ''],
        R4: row2.R4 || ['', '', '', ''],
        R5: row2.R5 || ['', '', '', '']
      };
    }
  }

  // Respuestas y hallazgos
  (sub.respuestas || []).forEach(r => {
    if (r && r.id) {
      jecFormState.respuestas[r.id] = (r.valor || '').toLowerCase();
      if (r.hallazgos || r.observaciones) {
        jecFormState.hallazgos[r.id] = r.hallazgos || r.observaciones;
      }
    }
  });
  if (sub.observacionesItems && typeof sub.observacionesItems === 'object') {
    Object.assign(jecFormState.hallazgos, sub.observacionesItems);
  }

  // Compromisos y observaciones
  jecFormState.compromisoDirector = sub.compromisoDirector || (sub.compromisos && sub.compromisos.directivo) || '';
  jecFormState.compromisoMonitor = sub.compromisoMonitor || (sub.compromisos && sub.compromisos.especialista) || '';
  jecFormState.observaciones = sub.observaciones || '';
}

/**
 * Renderiza el formulario dinámico completo de la Ficha JEC
 */
export function renderJecForm(host, ft, state, dbNs, currentUser, navigate, isEditing = false) {
  if (!host) return;

  // Calcular conteo actual de respuestas Sí en tiempo real
  const conteoSi = Object.values(jecFormState.respuestas).filter(v => v === 'si').length;
  const nivelActual = getNivelLogroJec(conteoSi);
  const totalItems = JEC_ITEMS.length; // 31
  const pctAvance = Math.round((conteoSi / totalItems) * 100);

  host.innerHTML = `
    <form id="regForm" autocomplete="off" class="jecFormContainer" style="max-width:1120px;margin:0 auto">
      <!-- ─── BARRA FLOTANTE DE NIVEL DE LOGRO EN TIEMPO REAL ─── -->
      <div class="panel jecLiveHeader" style="position:sticky;top:68px;z-index:20;background:var(--surface);border-left:5px solid ${nivelActual.color};box-shadow:var(--shadow-md);margin-bottom:20px;padding:12px 18px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:20px">🏫</span>
              <h2 style="margin:0;font-size:16px;font-weight:700;color:var(--ink)">
                Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC
              </h2>
            </div>
            <p style="margin:2px 0 0;font-size:12px;color:var(--ink-soft)">
              Modelo de Servicio Educativo Jornada Escolar Completa · UGEL 03 · AGEBRE
            </p>
          </div>

          <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
            <div style="text-align:right">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--ink-soft);letter-spacing:0.04em">
                Nivel de Implementación MSE JEC
              </div>
              <div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-top:2px">
                <span class="badge ${nivelActual.cls}" id="jecLiveBadge" style="font-size:13px;padding:4px 12px;font-weight:700">
                  ${esc(nivelActual.nivel)}
                </span>
                <strong style="font-size:14px;color:var(--ink)" id="jecLiveCountText">
                  ${conteoSi} / ${totalItems} Sí (${pctAvance}%)
                </strong>
              </div>
            </div>
            <div style="width:140px">
              <div class="barTrack" style="height:10px;border-radius:5px" title="${conteoSi} de ${totalItems} ítems Sí">
                <div class="barFill ${nivelActual.cls}" id="jecLiveProgressBar" style="width:${pctAvance}%;height:10px;border-radius:5px"></div>
              </div>
              <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--ink-soft);margin-top:2px">
                <span>0-11 Incipiente</span>
                <span>12-23 Parcial</span>
                <span>24-31 Lograda</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── SECCIÓN III: DATOS GENERALES DE LA IE ─── -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle" style="display:flex;align-items:center;justify-content:space-between;border-bottom:1.5px solid var(--line);padding-bottom:8px;margin-bottom:14px">
          <span>III. DATOS GENERALES DE LA IE:</span>
          <span style="font-size:12px;font-weight:normal;color:var(--ink-soft)">* Campos obligatorios</span>
        </div>
        <div class="fieldGrid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px">
          <div class="field" style="grid-column:1 / -1;background:linear-gradient(135deg, rgba(2,132,199,0.06), rgba(14,165,233,0.02));padding:12px 14px;border-radius:var(--radius);border:1px solid rgba(2,132,199,0.25);display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <div>
              <span style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;display:block">
                Especialista Responsable de Monitoreo JEC:
              </span>
              <strong style="font-size:14.5px;color:var(--ink)">${esc(jecFormState.responsable || ESPECIALISTA_JEC_OFICIAL.nombresApellidos)}</strong>
              <span style="font-size:12px;color:var(--ink-soft);margin-left:6px">(${esc(jecFormState.responsableCargo || ESPECIALISTA_JEC_OFICIAL.cargo)} · AGEBRE – UGEL 03)</span>
            </div>
            <span class="badge" style="background:var(--primary);color:#fff;font-size:11px;padding:3px 9px;font-weight:700">MSE JEC</span>
          </div>

          <div class="field" style="grid-column:1 / -1">
            <label for="f_institucion">Número y/o nombre de la Institución Educativa *</label>
            <div class="ieSearchWrap" id="jecIeSearchWrap">
              <input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar IE por nombre o código modular (UGEL 03)..." value="${esc(jecFormState.institucion || '')}" required style="font-weight:600">
              <div class="ieDropdown" id="jecIeDropdown"></div>
            </div>
            <span id="jecColegioHint" style="display:${jecFormState.colegioId ? 'block' : 'none'};font-size:11.5px;color:var(--primary-dark);margin-top:4px">
              ${jecFormState.colegioId ? `✓ Vinculada al padrón: ${esc(jecFormState.institucion)} · REI ${esc(jecFormState.rei || '—')} · Cód: ${esc(jecFormState.codigoModular || '—')}` : ''}
            </span>
          </div>

          <div class="field">
            <label for="jec_cod_modular">Código Modular *</label>
            <input type="text" id="jec_cod_modular" placeholder="Ej: 0334680" maxlength="7" value="${esc(jecFormState.codigoModular || '')}" required>
          </div>

          <div class="field">
            <label for="jec_ugel">UGEL</label>
            <input type="text" id="jec_ugel" value="03" readonly style="background:var(--surface-2);color:var(--ink-soft);font-weight:700">
          </div>

          <div class="field">
            <label for="jec_rei">REI</label>
            <input type="text" id="jec_rei" placeholder="Ej: 06" value="${esc(jecFormState.rei || '')}">
          </div>

          <div class="field">
            <label for="f_fecha">Fecha de visita *</label>
            <input type="date" id="f_fecha" value="${esc(jecFormState.fecha || todayStr())}" required>
          </div>

          <div class="field">
            <label for="jec_secciones">Secciones *</label>
            <input type="number" id="jec_secciones" min="1" placeholder="Ej: 11" value="${esc(jecFormState.secciones || '')}" required>
          </div>

          <div class="field">
            <label for="jec_estudiantes">Cantidad Estudiantes *</label>
            <input type="number" id="jec_estudiantes" min="0" placeholder="Ej: 263" value="${esc(jecFormState.estudiantes || '')}" required>
          </div>

          <div class="field">
            <label for="jec_docentes">Cantidad Docentes *</label>
            <input type="number" id="jec_docentes" min="0" placeholder="Ej: 24" value="${esc(jecFormState.docentesTotal || '')}" required>
          </div>

          <div class="field" style="grid-column:1 / -1;background:var(--surface-2);padding:10px 14px;border-radius:var(--radius);border:1px solid var(--line)">
            <label style="display:block;margin-bottom:6px;font-weight:600">
              La IE implementa el modelo de Servicio Educativo Secundaria con Formación Técnica: *
            </label>
            <div class="optGroup" style="display:flex;gap:24px;padding-top:2px">
              <label class="optBtn" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
                <input type="radio" name="jec_formacion_tecnica" value="si" ${jecFormState.formacionTecnica ? 'checked' : ''}>
                <span>Sí ( )</span>
              </label>
              <label class="optBtn" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px">
                <input type="radio" name="jec_formacion_tecnica" value="no" ${!jecFormState.formacionTecnica ? 'checked' : ''}>
                <span>NO ( X )</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- ─── SECCIÓN IV: DATOS DEL DIRECTIVO ─── -->
      <div class="panel" style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1.5px solid var(--line);padding-bottom:8px;margin-bottom:14px">
          <div class="sectionHeaderTitle" style="margin:0">IV. DATOS DEL DIRECTIVO QUE BRINDA LA INFORMACIÓN SOLICITADA:</div>
          <button type="button" class="btn secondary small" id="btnSyncDirectivoJec" title="Sincronizar y guardar en el Directorio oficial de Directivos de la UGEL 03">
            💾 Sincronizar con Directorio
          </button>
        </div>
        <div class="fieldGrid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px">
          <div class="field" style="grid-column:span 2">
            <label for="jec_dir_nombre">Nombres y Apellido *</label>
            <input type="text" id="jec_dir_nombre" placeholder="Ej: Alejandro Viviano Tumbay" value="${esc(jecFormState.director.nombres || '')}" required>
          </div>
          <div class="field">
            <label for="jec_dir_dni">DNI * (8 dígitos)</label>
            <input type="text" id="jec_dir_dni" maxlength="8" pattern="[0-9]{8}" placeholder="40656140" value="${esc(jecFormState.director.dni || '')}" required>
          </div>
          <div class="field">
            <label for="jec_dir_tel">Teléfono celular (9 dígitos)</label>
            <input type="text" id="jec_dir_tel" maxlength="9" placeholder="976160693" value="${esc(jecFormState.director.telefono || '')}">
          </div>
          <div class="field" style="grid-column:span 2">
            <label for="jec_dir_correo">Correo Electrónico</label>
            <input type="email" id="jec_dir_correo" placeholder="ebr.pge@ugel03.edu.pe" value="${esc(jecFormState.director.correo || '')}">
          </div>
        </div>
      </div>

      <!-- ─── SECCIÓN V: DATA DE DOCENTES MONITOREADOS ─── -->
      <div class="panel" style="margin-bottom:18px">
        <div class="sectionHeaderTitle" style="border-bottom:1.5px solid var(--line);padding-bottom:8px;margin-bottom:12px">
          V. DATA DE DOCENTES MONITOREADOS A LA FECHA DE LA VISITA NIVEL SECUNDARIA:
        </div>
        <p class="helpText" style="margin-top:0;font-size:12px">
          Consigne el total de docentes, docentes monitoreados y los resultados de las 5 rúbricas de aula (I, II, III y IV). Los porcentajes (%) y los <strong>no monitoreados</strong> se calculan de manera automática en tiempo real.
        </p>

        <!-- a) 1er monitoreo -->
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:14px">
          <div style="font-weight:700;font-size:13.5px;color:var(--primary);margin-bottom:10px">
            a) 1er monitoreo
          </div>
          ${renderDocentesTableJec('momento1', jecFormState.docentes.momento1)}
        </div>

        <!-- b) 2do monitoreo -->
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:var(--radius);padding:14px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <div style="font-weight:700;font-size:13.5px;color:var(--primary)">
              b) 2do monitoreo
            </div>
            <button type="button" class="btn secondary small" id="btnCopiarDocentesM1" title="Copia el Total de Docentes desde el 1er monitoreo">
              📋 Copiar total del 1er monitoreo
            </button>
          </div>
          ${renderDocentesTableJec('momento2', jecFormState.docentes.momento2)}
        </div>

        <!-- Leyenda explicativa de rúbricas R1 a R5 -->
        <details style="background:var(--surface-2);border:1px solid var(--line);padding:8px 12px;border-radius:6px;font-size:11.5px">
          <summary style="font-weight:700;cursor:pointer;color:var(--primary)">
            ℹ️ Ver detalle de las 5 Rúbricas de Observación de Aula (R1 a R5)
          </summary>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(260px, 1fr));gap:8px;margin-top:8px">
            ${RUBRICAS_OBSERVACION_AULA.map(r => `
              <div style="padding:6px 8px;background:var(--surface);border-radius:4px;border:1px solid var(--line)">
                <strong style="color:var(--primary)">${esc(r.id)}:</strong> ${esc(r.nombre)}
              </div>
            `).join('')}
          </div>
        </details>
      </div>

      <!-- ─── SECCIÓN VI: COMPONENTES E INDICADORES DE MONITOREO ─── -->
      <div class="panel" style="margin-bottom:18px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:1.5px solid var(--line);padding-bottom:8px;margin-bottom:14px">
          <div class="sectionHeaderTitle" style="margin:0">
            VI. COMPONENTES E INDICADORES DE MONITOREO JEC (31 ÍTEMS)
          </div>
          <div class="badge st-none" style="font-size:12px;padding:4px 8px">
            Escala: Sí / No · 9 horas diarias
          </div>
        </div>

        <!-- NOTA MINISTERIAL SOBRE HALLAZGOS (IMAGEN 1) -->
        <div style="background:#EFF6FF;border-left:4px solid #3B82F6;padding:10px 14px;border-radius:4px;margin-bottom:16px;font-size:13px;color:#1E40AF;font-weight:600">
          • Registra en la columna "Hallazgos" información breve y objetiva sobre lo verificado en cada ítem.
        </div>

        ${renderComponentesJecHtml()}
      </div>

      <!-- ─── SECCIÓN VII: TABLA OFICIAL DE NIVEL DE IMPLEMENTACIÓN (IMAGEN 2) ─── -->
      <div class="panel" style="margin-bottom:18px;background:var(--surface)">
        <div class="sectionHeaderTitle" style="margin-bottom:8px">
          NIVEL DE IMPLEMENTACIÓN DEL MSE JEC
        </div>
        <p style="margin:0 0 12px;font-size:12px;color:var(--ink-soft);line-height:1.5">
          <strong>Nota:</strong> El nivel de implementación se determina a partir del total de respuestas afirmativas registradas en la ficha, con la finalidad de identificar el grado en que la institución educativa evidencia la implementación de los componentes pedagógico, de gestión y de soporte del Modelo de Servicio Educativo Jornada Escolar Completa.
        </p>

        <div style="overflow-x:auto">
          <table class="table" style="width:100%;border-collapse:collapse;font-size:13px" id="jecTablaNivelOficial">
            <thead>
              <tr style="background:var(--surface-2)">
                <th style="padding:10px 14px;text-align:left;width:50%">Nivel de Implementación</th>
                <th style="padding:10px 14px;text-align:center;width:30%">Total de respuestas "Sí"</th>
                <th style="padding:10px 14px;text-align:center;width:20%">Estado actual</th>
              </tr>
            </thead>
            <tbody>
              <tr id="rowNivelLograda" style="border-bottom:1px solid var(--line);${conteoSi >= 24 ? 'background:rgba(22, 163, 74, 0.12);font-weight:700' : ''}">
                <td style="padding:10px 14px;color:#15803D">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#16A34A;margin-right:6px"></span>
                  <strong>Implementación lograda</strong>
                </td>
                <td style="padding:10px 14px;text-align:center">De 24 a 31 respuestas "Sí"</td>
                <td style="padding:10px 14px;text-align:center">
                  ${conteoSi >= 24 ? '<span class="badge st-logrado" style="font-weight:700">✓ NIVEL ALCANZADO</span>' : '—'}
                </td>
              </tr>
              <tr id="rowNivelParcial" style="border-bottom:1px solid var(--line);${conteoSi >= 12 && conteoSi <= 23 ? 'background:rgba(217, 119, 6, 0.12);font-weight:700' : ''}">
                <td style="padding:10px 14px;color:#B45309">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#D97706;margin-right:6px"></span>
                  <strong>Implementación parcial</strong>
                </td>
                <td style="padding:10px 14px;text-align:center">De 12 a 23 respuestas "Sí"</td>
                <td style="padding:10px 14px;text-align:center">
                  ${conteoSi >= 12 && conteoSi <= 23 ? '<span class="badge st-proceso" style="font-weight:700">✓ NIVEL ALCANZADO</span>' : '—'}
                </td>
              </tr>
              <tr id="rowNivelIncipiente" style="${conteoSi <= 11 ? 'background:rgba(220, 38, 38, 0.12);font-weight:700' : ''}">
                <td style="padding:10px 14px;color:#B91C1C">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:#DC2626;margin-right:6px"></span>
                  <strong>Implementación incipiente</strong>
                </td>
                <td style="padding:10px 14px;text-align:center">De 0 a 11 respuestas "Sí"</td>
                <td style="padding:10px 14px;text-align:center">
                  ${conteoSi <= 11 ? '<span class="badge st-inicio" style="font-weight:700">✓ NIVEL ALCANZADO</span>' : '—'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ─── SECCIÓN VIII: COMPROMISOS Y CIERRE ─── -->
      <div class="panel" style="margin-bottom:24px">
        <div class="sectionHeaderTitle" style="border-bottom:1.5px solid var(--line);padding-bottom:8px;margin-bottom:14px">
          VIII. COMPROMISOS Y OBSERVACIONES GENERALES
        </div>
        <div class="fieldGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="field" style="grid-column:1 / -1">
            <label for="jec_comp_director">Compromiso del Directivo(a) de la I.E.:</label>
            <textarea id="jec_comp_director" rows="3" placeholder="Acciones concretas a implementar por el equipo directivo para fortalecer los componentes JEC..." style="width:100%">${esc(jecFormState.compromisoDirector || '')}</textarea>
          </div>
          <div class="field" style="grid-column:1 / -1">
            <label for="jec_comp_monitor">Compromiso del Especialista / Monitor UGEL 03:</label>
            <textarea id="jec_comp_monitor" rows="3" placeholder="Asistencia técnica y acciones de seguimiento que brindará el especialista..." style="width:100%">${esc(jecFormState.compromisoMonitor || '')}</textarea>
          </div>
          <div class="field" style="grid-column:1 / -1">
            <label for="jec_observaciones">Observaciones generales de la visita:</label>
            <textarea id="jec_observaciones" rows="2" placeholder="Observaciones complementarias, acuerdos o contingencias evidenciadas..." style="width:100%">${esc(jecFormState.observaciones || '')}</textarea>
          </div>
        </div>
      </div>

      <!-- ─── BARRA DE ACCIÓN GUARDAR ─── -->
      <div class="formActions" style="display:flex;justify-content:flex-end;gap:12px;margin-top:16px;margin-bottom:40px">
        <button type="button" class="btn secondary" id="btnCancelJec">Cancelar</button>
        <button type="submit" class="btn" id="btnSaveJec" style="background:var(--primary);color:#fff;font-weight:700;padding:10px 24px;font-size:14px">
          💾 Guardar Ficha JEC
        </button>
      </div>
    </form>
  `;

  attachJecFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing);
}

/**
 * Renderiza la tabla oficial de docentes monitoreados de secundaria (1er o 2do monitoreo)
 * con dos filas: Fila 1 = Cantidad, Fila 2 = Porcentaje (%)
 */
function renderDocentesTableJec(momentoKey, data) {
  const d = data || createDocenteMomentoRow();
  const total = Number(d.total) || 0;
  const monit = Number(d.monitoreados) || 0;
  const noMonit = Math.max(0, total - monit);

  const pctMonit = total > 0 ? Math.round((monit / total) * 100) : 0;
  const pctNoMonit = total > 0 ? Math.round((noMonit / total) * 100) : 0;

  const renderRubCell = (rubId, idx) => {
    const arr = d[rubId] || ['', '', '', ''];
    const val = arr[idx] !== undefined && arr[idx] !== '' ? Number(arr[idx]) : '';
    const pct = (val !== '' && total > 0) ? Math.round((Number(val) / total) * 100) : 0;

    return `
      <td style="text-align:center;padding:4px 2px;border:1px solid var(--line)">
        <input type="number" min="0" class="jecDocRubInp" data-momento="${momentoKey}" data-rub="${rubId}" data-idx="${idx}" value="${val !== '' ? val : ''}" placeholder="0" style="width:40px;text-align:center;font-size:12px;font-weight:600;padding:3px 2px">
        <div class="jecRubPctLbl" data-rub-pct="${momentoKey}_${rubId}_${idx}" style="font-size:10px;color:var(--ink-soft);font-weight:600;margin-top:2px">
          ${val !== '' ? pct + '%' : '0%'}
        </div>
      </td>
    `;
  };

  return `
    <div style="overflow-x:auto;max-width:100%;border:1px solid var(--line);border-radius:6px;box-shadow:var(--shadow-sm)">
      <table class="table jecDocTable" style="width:100%;border-collapse:collapse;font-size:12px;min-width:980px" data-momento="${momentoKey}">
        <thead>
          <tr style="background:var(--primary);color:#FFFFFF;text-align:center">
            <th rowspan="2" style="width:90px;vertical-align:middle;border-right:1px solid rgba(255,255,255,0.2)">TOTAL DE DOCENTES</th>
            <th rowspan="2" style="width:95px;vertical-align:middle;border-right:1px solid rgba(255,255,255,0.2)">DOCENTES MONITOREADOS</th>
            <th rowspan="2" style="width:95px;vertical-align:middle;border-right:1.5px solid #fff">DOCENTES NO MONITOREADOS</th>
            <th colspan="20" style="background:#0F294D;border-left:1.5px solid #fff;padding:6px">
              CANTIDAD DE DOCENTES QUE ALCANZARON EL NIVEL DE LOGRO EN LOS MONITOREOS
            </th>
          </tr>
          <tr style="background:#1E40AF;color:#FFFFFF;text-align:center;font-size:11px">
            <!-- R1 -->
            <th colspan="4" style="background:#1E40AF;border-left:1.5px solid #fff;border-right:1px solid rgba(255,255,255,0.2)">R1 Involucra</th>
            <!-- R2 -->
            <th colspan="4" style="background:#0F766E;border-right:1px solid rgba(255,255,255,0.2)">R2 Razonamiento</th>
            <!-- R3 -->
            <th colspan="4" style="background:#047857;border-right:1px solid rgba(255,255,255,0.2)">R3 Retroalimenta</th>
            <!-- R4 -->
            <th colspan="4" style="background:#6D28D9;border-right:1px solid rgba(255,255,255,0.2)">R4 Respeto</th>
            <!-- R5 -->
            <th colspan="4" style="background:#B45309">R5 Comportamiento</th>
          </tr>
          <tr style="background:var(--surface-2);color:var(--ink);text-align:center;font-size:11px">
            <th style="border-right:1px solid var(--line)">—</th>
            <th style="border-right:1px solid var(--line)">%</th>
            <th style="border-right:1.5px solid var(--line)">%</th>
            <!-- Subniveles R1 -->
            <th style="width:34px;border-left:1.5px solid var(--line)">I</th><th style="width:34px">II</th><th style="width:34px">III</th><th style="width:34px;border-right:1px solid var(--line)">IV</th>
            <!-- Subniveles R2 -->
            <th style="width:34px">I</th><th style="width:34px">II</th><th style="width:34px">III</th><th style="width:34px;border-right:1px solid var(--line)">IV</th>
            <!-- Subniveles R3 -->
            <th style="width:34px">I</th><th style="width:34px">II</th><th style="width:34px">III</th><th style="width:34px;border-right:1px solid var(--line)">IV</th>
            <!-- Subniveles R4 -->
            <th style="width:34px">I</th><th style="width:34px">II</th><th style="width:34px">III</th><th style="width:34px;border-right:1px solid var(--line)">IV</th>
            <!-- Subniveles R5 -->
            <th style="width:34px">I</th><th style="width:34px">II</th><th style="width:34px">III</th><th style="width:34px">IV</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <!-- Total de Docentes -->
            <td style="text-align:center;padding:8px 4px;border-right:1px solid var(--line);background:var(--surface)">
              <input type="number" min="0" class="jecDocTotalInp" data-momento="${momentoKey}" value="${esc(d.total)}" placeholder="24" style="width:65px;text-align:center;font-weight:700;font-size:14px;padding:4px">
            </td>
            <!-- Docentes Monitoreados -->
            <td style="text-align:center;padding:8px 4px;border-right:1px solid var(--line);background:var(--surface)">
              <input type="number" min="0" class="jecDocMonitInp" data-momento="${momentoKey}" value="${esc(d.monitoreados)}" placeholder="0" style="width:65px;text-align:center;font-weight:700;font-size:14px;padding:4px">
              <div class="jecMonitPctLbl" data-momento="${momentoKey}" style="font-size:11px;font-weight:700;color:var(--ok);margin-top:2px">
                ${total > 0 ? pctMonit + '%' : '—'}
              </div>
            </td>
            <!-- Docentes No Monitoreados -->
            <td style="text-align:center;padding:8px 4px;border-right:1.5px solid var(--line);background:var(--surface-2)">
              <strong class="jecNoMonitVal" data-momento="${momentoKey}" style="font-size:14px;color:var(--ink)">
                ${total > 0 ? noMonit : (d.total ? '0' : '—')}
              </strong>
              <div class="jecNoMonitPctLbl" data-momento="${momentoKey}" style="font-size:11px;font-weight:700;color:var(--danger);margin-top:2px">
                ${total > 0 ? pctNoMonit + '%' : '—'}
              </div>
            </td>

            <!-- R1 -->
            ${renderRubCell('R1', 0)}
            ${renderRubCell('R1', 1)}
            ${renderRubCell('R1', 2)}
            ${renderRubCell('R1', 3)}

            <!-- R2 -->
            ${renderRubCell('R2', 0)}
            ${renderRubCell('R2', 1)}
            ${renderRubCell('R2', 2)}
            ${renderRubCell('R2', 3)}

            <!-- R3 -->
            ${renderRubCell('R3', 0)}
            ${renderRubCell('R3', 1)}
            ${renderRubCell('R3', 2)}
            ${renderRubCell('R3', 3)}

            <!-- R4 -->
            ${renderRubCell('R4', 0)}
            ${renderRubCell('R4', 1)}
            ${renderRubCell('R4', 2)}
            ${renderRubCell('R4', 3)}

            <!-- R5 -->
            ${renderRubCell('R5', 0)}
            ${renderRubCell('R5', 1)}
            ${renderRubCell('R5', 2)}
            ${renderRubCell('R5', 3)}
          </tr>
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renderiza los 31 ítems organizados por los 3 componentes oficiales
 */
function renderComponentesJecHtml() {
  return JEC_SECCIONES.map((sec, sIdx) => `
    <div class="jecSeccionBlock" style="margin-bottom:20px;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden">
      <div style="background:var(--surface-2);padding:10px 14px;font-weight:700;font-size:13.5px;color:var(--primary-dark);border-bottom:1px solid var(--line)">
        ${esc(sec.nombre)} <span style="font-size:11.5px;font-weight:normal;color:var(--ink-soft)">(${sec.items.length} ítems)</span>
      </div>
      <div style="padding:12px 14px;background:var(--surface)">
        ${sec.items.map(it => {
          const val = jecFormState.respuestas[it.id] || '';
          const hallazgo = jecFormState.hallazgos[it.id] || '';
          const isSi = val === 'si';
          const isNo = val === 'no';

          return `
            <div class="jecItemCard" data-item-id="${esc(it.id)}" style="border:1px solid var(--line);border-radius:6px;padding:12px 14px;margin-bottom:12px;background:var(--surface);transition:all 0.15s ease">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:8px">
                <div style="flex:1">
                  <div style="font-weight:600;font-size:13px;line-height:1.45;color:var(--ink)">
                    <span style="font-weight:800;color:var(--primary);margin-right:4px">${it.num}.</span>
                    ${esc(it.texto)}
                  </div>
                  ${it.evidencia ? `
                    <div style="font-size:11.5px;color:var(--ink-soft);margin-top:3px;font-style:italic">
                      Evidencia sugerida: ${esc(it.evidencia)}
                    </div>
                  ` : ''}
                </div>

                <!-- Botones interactivos Sí / No -->
                <div class="optGroup" style="display:flex;gap:6px;flex-shrink:0">
                  <button type="button" class="btnJecOpt ${isSi ? 'active-si' : ''}" data-item="${esc(it.id)}" data-val="si" style="min-width:54px;padding:6px 12px;font-size:12px;font-weight:700;border-radius:6px;cursor:pointer;border:1.5px solid ${isSi ? '#16A34A' : 'var(--line)'};background:${isSi ? '#16A34A' : 'var(--surface)'};color:${isSi ? '#FFFFFF' : 'var(--ink)'};transition:all 0.1s ease">
                    Sí
                  </button>
                  <button type="button" class="btnJecOpt ${isNo ? 'active-no' : ''}" data-item="${esc(it.id)}" data-val="no" style="min-width:54px;padding:6px 12px;font-size:12px;font-weight:700;border-radius:6px;cursor:pointer;border:1.5px solid ${isNo ? '#DC2626' : 'var(--line)'};background:${isNo ? '#DC2626' : 'var(--surface)'};color:${isNo ? '#FFFFFF' : 'var(--ink)'};transition:all 0.1s ease">
                    No
                  </button>
                </div>
              </div>

              <!-- Columna / Campo Hallazgos por ítem -->
              <div style="margin-top:8px">
                <label style="font-size:11px;font-weight:600;color:var(--ink-soft);display:block;margin-bottom:3px">
                  Hallazgos verificados en este ítem:
                </label>
                <textarea class="jecItemHallazgo" data-item="${esc(it.id)}" rows="1" placeholder="Registra en la columna 'Hallazgos' información breve y objetiva sobre lo verificado..." style="width:100%;font-size:12px;padding:5px 8px;min-height:34px;border:1px solid var(--line);border-radius:4px">${esc(hallazgo)}</textarea>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');
}

/**
 * Vincula todos los eventos reactivos del formulario JEC
 */
function attachJecFormEvents(host, ft, state, dbNs, currentUser, navigate, isEditing) {
  // 1. Buscador Autocomplete de Institución Educativa
  const instInput = host.querySelector('#f_institucion');
  const dropdown = host.querySelector('#jecIeDropdown');
  const hint = host.querySelector('#jecColegioHint');

  const onSelectColegio = (col) => {
    if (!col) return;
    instInput.value = col.ie || '';
    jecFormState.colegioId = col.id || '';
    jecFormState.institucion = col.ie || '';
    jecFormState.codigoModular = cleanTextCode(col.codigoModular || col.codigoLocal || '');
    jecFormState.rei = col.rei || col.red || '';

    const codEl = host.querySelector('#jec_cod_modular');
    if (codEl) codEl.value = jecFormState.codigoModular;
    const redEl = host.querySelector('#jec_rei');
    if (redEl) redEl.value = jecFormState.rei;

    // Precargar directivo activo si existe en Directorio o en colegio
    const { director: dirActivo } = getDirectivosActivosForColegio(state, col.id, col.codigoLocal, col.codigoModular);
    if (dirActivo) {
      jecFormState.director.nombres = dirActivo.apellidosNombres || '';
      jecFormState.director.dni = cleanTextCode(dirActivo.dni || '');
      jecFormState.director.telefono = cleanTextCode(dirActivo.telefono || '');
      jecFormState.director.correo = dirActivo.correo || '';
    } else if (col.director) {
      jecFormState.director.nombres = col.director.nombre || '';
      jecFormState.director.dni = cleanTextCode(col.director.dni || '');
      jecFormState.director.telefono = cleanTextCode(col.director.telefono || '');
      jecFormState.director.correo = col.director.correo || '';
    }

    const dNom = host.querySelector('#jec_dir_nombre');
    if (dNom) dNom.value = jecFormState.director.nombres;
    const dDni = host.querySelector('#jec_dir_dni');
    if (dDni) dDni.value = jecFormState.director.dni;
    const dTel = host.querySelector('#jec_dir_tel');
    if (dTel) dTel.value = jecFormState.director.telefono;
    const dMail = host.querySelector('#jec_dir_correo');
    if (dMail) dMail.value = jecFormState.director.correo;

    if (hint) {
      hint.style.display = 'block';
      hint.textContent = `✓ Vinculada al padrón: ${col.ie} · REI ${col.rei || '—'} · Cód: ${col.codigoModular || col.codigoLocal || '—'}`;
    }
  };

  if (instInput && dropdown) {
    const showDropdown = () => {
      const q = normalizeText(instInput.value);
      const colegios = state.colegios || [];
      const matches = colegios.filter(c => !q || normalizeText(c.ie).includes(q) || normalizeText(c.codigoModular || c.codigoLocal || '').includes(q)).slice(0, 25);
      if (!matches.length) { dropdown.style.display = 'none'; return; }
      dropdown.innerHTML = matches.map(c => `
        <div class="ieDropdownItem" data-col-id="${c.id}" style="padding:8px 12px;cursor:pointer;border-bottom:1px solid var(--line)">
          <div style="font-weight:600;color:var(--ink)">${esc(c.ie)}</div>
          <div style="font-size:11px;color:var(--ink-soft)">
            ${esc(c.codigoModular || c.codigoLocal || '')} ${c.rei ? '· REI ' + esc(c.rei) : ''} ${c.director && c.director.nombre ? '· Dir: ' + esc(c.director.nombre) : ''}
          </div>
        </div>
      `).join('');
      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
        item.onmousedown = (e) => {
          e.preventDefault();
          const col = (state.colegios || []).find(x => x.id === item.dataset.colId);
          if (col) onSelectColegio(col);
          dropdown.style.display = 'none';
        };
      });
    };

    instInput.addEventListener('input', showDropdown);
    instInput.addEventListener('focus', () => { if (!instInput.value) showDropdown(); });
    instInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });
  }

  // 2. Sincronizar datos del directivo con el Directorio
  const btnSyncDir = host.querySelector('#btnSyncDirectivoJec');
  if (btnSyncDir) {
    btnSyncDir.onclick = async () => {
      syncJecStateFromDom(host);
      if (!jecFormState.director.nombres || isPlaceholderDirectivo(jecFormState.director.nombres)) {
        showToast('⚠️ Consigne los apellidos y nombres del directivo antes de sincronizar.');
        return;
      }
      try {
        btnSyncDir.disabled = true;
        btnSyncDir.textContent = '⏳ Guardando...';
        const docFicha = {
          institucion: jecFormState.institucion,
          codigoModular: jecFormState.codigoModular,
          director: { ...jecFormState.director },
          fecha: jecFormState.fecha
        };
        await syncDirectivosFromFicha(dbNs, docFicha, state, currentUser);
        showToast('✓ Datos del directivo sincronizados en el Directorio oficial.');
      } catch (err) {
        console.error('Error sincronizando directivo JEC:', err);
        showToast('⚠️ No se pudo sincronizar el directivo: ' + (err.message || 'Error'));
      } finally {
        btnSyncDir.disabled = false;
        btnSyncDir.textContent = '💾 Sincronizar con Directorio';
      }
    };
  }

  // 3. Botón copiar docentes del 1er al 2do monitoreo
  const btnCopiarM1 = host.querySelector('#btnCopiarDocentesM1');
  if (btnCopiarM1) {
    btnCopiarM1.onclick = () => {
      const totM1 = host.querySelector('.jecDocTotalInp[data-momento="momento1"]')?.value || '';
      const totM2Inp = host.querySelector('.jecDocTotalInp[data-momento="momento2"]');
      if (totM2Inp && totM1) {
        totM2Inp.value = totM1;
        updateDocenteRowCalculations('momento2', host);
        showToast(`✓ Total copiado del 1er monitoreo (${totM1} docentes).`);
      } else {
        showToast('⚠️ Ingrese primero el Total de Docentes en el 1er monitoreo.');
      }
    };
  }

  // 4. Actualización en tiempo real de Docentes Monitoreados y Rúbricas
  host.querySelectorAll('.jecDocTotalInp, .jecDocMonitInp').forEach(inp => {
    inp.addEventListener('input', () => {
      const momento = inp.dataset.momento;
      updateDocenteRowCalculations(momento, host);
    });
  });

  host.querySelectorAll('.jecDocRubInp').forEach(inp => {
    inp.addEventListener('input', () => {
      const momento = inp.dataset.momento;
      const rub = inp.dataset.rub;
      const idx = inp.dataset.idx;
      const val = Number(inp.value) || 0;

      const totalInp = host.querySelector(`.jecDocTotalInp[data-momento="${momento}"]`);
      const total = Number(totalInp?.value) || 0;
      const pct = (val > 0 && total > 0) ? Math.round((val / total) * 100) : 0;

      const lbl = host.querySelector(`[data-rub-pct="${momento}_${rub}_${idx}"]`);
      if (lbl) {
        lbl.textContent = val > 0 ? pct + '%' : '0%';
      }
    });
  });

  // 5. Botones interactivos Sí / No y recálculo en vivo del Nivel de Implementación
  host.querySelectorAll('.btnJecOpt').forEach(btn => {
    btn.onclick = () => {
      const itemId = btn.dataset.item;
      const val = btn.dataset.val;

      // Actualizar estado
      jecFormState.respuestas[itemId] = val;

      // Actualizar visual de botones de este ítem
      const card = btn.closest('.jecItemCard');
      if (card) {
        const btnSi = card.querySelector('.btnJecOpt[data-val="si"]');
        const btnNo = card.querySelector('.btnJecOpt[data-val="no"]');

        if (btnSi) {
          if (val === 'si') {
            btnSi.style.border = '1.5px solid #16A34A';
            btnSi.style.background = '#16A34A';
            btnSi.style.color = '#FFFFFF';
            btnSi.classList.add('active-si');
          } else {
            btnSi.style.border = '1.5px solid var(--line)';
            btnSi.style.background = 'var(--surface)';
            btnSi.style.color = 'var(--ink)';
            btnSi.classList.remove('active-si');
          }
        }

        if (btnNo) {
          if (val === 'no') {
            btnNo.style.border = '1.5px solid #DC2626';
            btnNo.style.background = '#DC2626';
            btnNo.style.color = '#FFFFFF';
            btnNo.classList.add('active-no');
          } else {
            btnNo.style.border = '1.5px solid var(--line)';
            btnNo.style.background = 'var(--surface)';
            btnNo.style.color = 'var(--ink)';
            btnNo.classList.remove('active-no');
          }
        }
      }

      // Recalcular nivel de logro general en tiempo real
      updateLiveNivelJec(host);
    };
  });

  // 6. Textareas de hallazgos
  host.querySelectorAll('.jecItemHallazgo').forEach(ta => {
    ta.addEventListener('input', () => {
      jecFormState.hallazgos[ta.dataset.item] = ta.value;
    });
  });

  // 7. Cancelar
  const btnCancel = host.querySelector('#btnCancelJec');
  if (btnCancel) {
    btnCancel.onclick = () => {
      if (confirm('¿Estás seguro de cancelar? Se perderán los datos no guardados.')) {
        resetJecFormState();
        if (navigate) navigate('consolidado');
      }
    };
  }
}

/**
 * Actualiza los cálculos de No Monitoreados y porcentajes de una fila de momento
 */
function updateDocenteRowCalculations(momentoKey, host) {
  const totInp = host.querySelector(`.jecDocTotalInp[data-momento="${momentoKey}"]`);
  const monitInp = host.querySelector(`.jecDocMonitInp[data-momento="${momentoKey}"]`);

  const total = Number(totInp?.value) || 0;
  const monit = Number(monitInp?.value) || 0;
  const noMonit = Math.max(0, total - monit);

  const pctMonit = total > 0 ? Math.round((monit / total) * 100) : 0;
  const pctNoMonit = total > 0 ? Math.round((noMonit / total) * 100) : 0;

  const noMonitEl = host.querySelector(`.jecNoMonitVal[data-momento="${momentoKey}"]`);
  if (noMonitEl) noMonitEl.textContent = total > 0 ? String(noMonit) : (totInp?.value ? '0' : '—');

  const monitPctEl = host.querySelector(`.jecMonitPctLbl[data-momento="${momentoKey}"]`);
  if (monitPctEl) monitPctEl.textContent = total > 0 ? pctMonit + '%' : '—';

  const noMonitPctEl = host.querySelector(`.jecNoMonitPctLbl[data-momento="${momentoKey}"]`);
  if (noMonitPctEl) noMonitPctEl.textContent = total > 0 ? pctNoMonit + '%' : '—';

  // Recalcular porcentajes de cada celda de rúbrica
  host.querySelectorAll(`.jecDocRubInp[data-momento="${momentoKey}"]`).forEach(inp => {
    const rub = inp.dataset.rub;
    const idx = inp.dataset.idx;
    const val = Number(inp.value) || 0;
    const pct = (val > 0 && total > 0) ? Math.round((val / total) * 100) : 0;

    const lbl = host.querySelector(`[data-rub-pct="${momentoKey}_${rub}_${idx}"]`);
    if (lbl) lbl.textContent = val > 0 ? pct + '%' : '0%';
  });
}

/**
 * Actualiza el badge superior, la barra de progreso y la tabla oficial de nivel de logro
 */
function updateLiveNivelJec(host) {
  const conteoSi = Object.values(jecFormState.respuestas).filter(v => v === 'si').length;
  const totalItems = JEC_ITEMS.length; // 31
  const pctAvance = Math.round((conteoSi / totalItems) * 100);
  const nivel = getNivelLogroJec(conteoSi);

  // Barra sticky
  const liveBadge = host.querySelector('#jecLiveBadge');
  if (liveBadge) {
    liveBadge.className = `badge ${nivel.cls}`;
    liveBadge.textContent = nivel.nivel;
  }

  const liveCount = host.querySelector('#jecLiveCountText');
  if (liveCount) {
    liveCount.textContent = `${conteoSi} / ${totalItems} Sí (${pctAvance}%)`;
  }

  const liveBar = host.querySelector('#jecLiveProgressBar');
  if (liveBar) {
    liveBar.className = `barFill ${nivel.cls}`;
    liveBar.style.width = `${pctAvance}%`;
  }

  const liveHeader = host.querySelector('.jecLiveHeader');
  if (liveHeader) {
    liveHeader.style.borderLeftColor = nivel.color;
  }

  // Tabla oficial (resaltar fila correspondiente)
  const rowLog = host.querySelector('#rowNivelLograda');
  const rowPar = host.querySelector('#rowNivelParcial');
  const rowInc = host.querySelector('#rowNivelIncipiente');

  if (rowLog && rowPar && rowInc) {
    rowLog.style.background = conteoSi >= 24 ? 'rgba(22, 163, 74, 0.12)' : '';
    rowLog.style.fontWeight = conteoSi >= 24 ? '700' : 'normal';
    rowLog.querySelector('td:last-child').innerHTML = conteoSi >= 24 ? '<span class="badge st-logrado" style="font-weight:700">✓ NIVEL ALCANZADO</span>' : '—';

    rowPar.style.background = (conteoSi >= 12 && conteoSi <= 23) ? 'rgba(217, 119, 6, 0.12)' : '';
    rowPar.style.fontWeight = (conteoSi >= 12 && conteoSi <= 23) ? '700' : 'normal';
    rowPar.querySelector('td:last-child').innerHTML = (conteoSi >= 12 && conteoSi <= 23) ? '<span class="badge st-proceso" style="font-weight:700">✓ NIVEL ALCANZADO</span>' : '—';

    rowInc.style.background = conteoSi <= 11 ? 'rgba(220, 38, 38, 0.12)' : '';
    rowInc.style.fontWeight = conteoSi <= 11 ? '700' : 'normal';
    rowInc.querySelector('td:last-child').innerHTML = conteoSi <= 11 ? '<span class="badge st-inicio" style="font-weight:700">✓ NIVEL ALCANZADO</span>' : '—';
  }
}

/**
 * Lee y sincroniza todos los valores ingresados en el DOM al estado en memoria
 */
function syncJecStateFromDom(host) {
  if (!host) return;

  // Datos Generales
  jecFormState.institucion = (host.querySelector('#f_institucion')?.value || '').trim();
  jecFormState.codigoModular = cleanTextCode(host.querySelector('#jec_cod_modular')?.value || '');
  jecFormState.rei = (host.querySelector('#jec_rei')?.value || '').trim();
  jecFormState.fecha = host.querySelector('#f_fecha')?.value || todayStr();
  jecFormState.secciones = (host.querySelector('#jec_secciones')?.value || '').trim();
  jecFormState.estudiantes = (host.querySelector('#jec_estudiantes')?.value || '').trim();
  jecFormState.docentesTotal = (host.querySelector('#jec_docentes')?.value || '').trim();

  const radTecSi = host.querySelector('input[name="jec_formacion_tecnica"][value="si"]');
  jecFormState.formacionTecnica = radTecSi ? radTecSi.checked : false;

  // Directivo
  jecFormState.director.nombres = (host.querySelector('#jec_dir_nombre')?.value || '').trim();
  jecFormState.director.dni = cleanTextCode(host.querySelector('#jec_dir_dni')?.value || '');
  jecFormState.director.telefono = cleanTextCode(host.querySelector('#jec_dir_tel')?.value || '');
  jecFormState.director.correo = (host.querySelector('#jec_dir_correo')?.value || '').trim();

  // Docentes monitoreo 1er y 2do momento
  ['momento1', 'momento2'].forEach(m => {
    const totInp = host.querySelector(`.jecDocTotalInp[data-momento="${m}"]`);
    const monitInp = host.querySelector(`.jecDocMonitInp[data-momento="${m}"]`);
    const t = Number(totInp?.value) || 0;
    const mon = Number(monitInp?.value) || 0;

    const row = {
      total: totInp?.value !== '' ? totInp?.value : '',
      monitoreados: monitInp?.value !== '' ? monitInp?.value : '',
      noMonitoreados: Math.max(0, t - mon),
      R1: ['', '', '', ''],
      R2: ['', '', '', ''],
      R3: ['', '', '', ''],
      R4: ['', '', '', ''],
      R5: ['', '', '', '']
    };

    ['R1', 'R2', 'R3', 'R4', 'R5'].forEach(rId => {
      [0, 1, 2, 3].forEach(idx => {
        const inp = host.querySelector(`.jecDocRubInp[data-momento="${m}"][data-rub="${rId}"][data-idx="${idx}"]`);
        row[rId][idx] = inp && inp.value !== '' ? Number(inp.value) : '';
      });
    });

    jecFormState.docentes[m] = row;
  });

  // Hallazgos
  host.querySelectorAll('.jecItemHallazgo').forEach(ta => {
    jecFormState.hallazgos[ta.dataset.item] = ta.value.trim();
  });

  // Compromisos
  jecFormState.compromisoDirector = (host.querySelector('#jec_comp_director')?.value || '').trim();
  jecFormState.compromisoMonitor = (host.querySelector('#jec_comp_monitor')?.value || '').trim();
  jecFormState.observaciones = (host.querySelector('#jec_observaciones')?.value || '').trim();
}

/**
 * Valida y extrae el payload estructurado completo listo para guardar en Firestore
 */
export function collectJecFormData(host, ft, isEdit = false) {
  syncJecStateFromDom(host);

  if (!jecFormState.institucion) {
    throw new Error('Debe ingresar o seleccionar la Institución Educativa.');
  }
  if (!jecFormState.codigoModular) {
    throw new Error('Debe ingresar el Código Modular de la Institución Educativa.');
  }
  if (!jecFormState.director.nombres) {
    throw new Error('Debe consignar los Apellidos y Nombres del directivo.');
  }

  // Construir array de respuestas oficial
  let conteoSi = 0;
  let conteoNo = 0;
  let conteoTotal = 0;

  const respuestas = JEC_ITEMS.map(it => {
    const val = (jecFormState.respuestas[it.id] || '').toLowerCase();
    const hallazgo = jecFormState.hallazgos[it.id] || '';

    if (val === 'si') conteoSi++;
    else if (val === 'no') conteoNo++;
    if (val) conteoTotal++;

    return {
      id: it.id,
      num: it.num,
      seccion: it.seccion,
      texto: it.texto,
      valor: val || 'no',
      hallazgos: hallazgo,
      observaciones: hallazgo
    };
  });

  const totalItems = JEC_ITEMS.length; // 31
  const esBorrador = conteoTotal < totalItems;

  if (esBorrador) {
    const ok = confirm(`Hay ${totalItems - conteoTotal} de ${totalItems} ítems sin calificar.\n¿Deseas guardar la ficha como BORRADOR?`);
    if (!ok) throw new Error('Complete los indicadores pendientes para registrar la ficha final.');
  }

  const nivelCalculado = getNivelLogroJec(conteoSi);
  const pct = Math.round((conteoSi / totalItems) * 100);

  // Extras planos para máxima compatibilidad con exportaciones a Excel y tablas existentes
  const finalRespNombre = jecFormState.responsable || ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
  const finalRespCargo = jecFormState.responsableCargo || ESPECIALISTA_JEC_OFICIAL.cargo;

  const extrasFlat = [
    { label: 'Especialista responsable', value: finalRespNombre },
    { label: 'Cargo especialista', value: finalRespCargo },
    { label: 'Secciones', value: jecFormState.secciones },
    { label: 'Cantidad Estudiantes', value: jecFormState.estudiantes },
    { label: 'Cantidad Docentes', value: jecFormState.docentesTotal },
    { label: 'Secundaria con Formación Técnica', value: jecFormState.formacionTecnica ? 'Sí' : 'No' },
    { label: 'Directivo', value: jecFormState.director.nombres },
    { label: 'DNI Directivo', value: jecFormState.director.dni },
    { label: 'Teléfono Directivo', value: jecFormState.director.telefono },
    { label: 'Correo Directivo', value: jecFormState.director.correo },
    { label: 'Total docentes 1er monitoreo', value: jecFormState.docentes.momento1.total || 0 },
    { label: 'Docentes monitoreados 1er monitoreo', value: jecFormState.docentes.momento1.monitoreados || 0 },
    { label: 'Total docentes 2do monitoreo', value: jecFormState.docentes.momento2.total || 0 },
    { label: 'Docentes monitoreados 2do monitoreo', value: jecFormState.docentes.momento2.monitoreados || 0 },
    { label: 'Total respuestas Sí', value: conteoSi },
    { label: 'Nivel de Implementación', value: nivelCalculado.nivel }
  ];

  return {
    fichaTypeId: ft.id || 'ft_msejec_2do',
    fichaTypeNombre: ft.nombre || 'Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC',
    tipoRespuesta: 'si_no',
    escala: 'SI_NO_NA',
    responsable: finalRespNombre,
    responsableCargo: finalRespCargo,
    especialista: finalRespNombre,
    institucion: jecFormState.institucion,
    colegioId: jecFormState.colegioId,
    codigoModular: jecFormState.codigoModular,
    ugel: jecFormState.ugel || 'UGEL 03',
    rei: jecFormState.rei,
    red: jecFormState.rei,
    fecha: jecFormState.fecha,
    secciones: jecFormState.secciones,
    estudiantes: jecFormState.estudiantes,
    docentesTotal: jecFormState.docentesTotal,
    formacionTecnica: jecFormState.formacionTecnica === true,
    ie: {
      codigoModular: jecFormState.codigoModular,
      rei: jecFormState.rei,
      red: jecFormState.rei,
      formacionTecnica: jecFormState.formacionTecnica === true
    },
    director: {
      nombres: jecFormState.director.nombres,
      dni: jecFormState.director.dni,
      telefono: jecFormState.director.telefono,
      correo: jecFormState.director.correo,
      condicion: jecFormState.director.condicion || 'D'
    },
    docentes: { ...jecFormState.docentes },
    docentesMonitoreo: { ...jecFormState.docentes },
    respuestas,
    items: respuestas,
    observacionesItems: { ...jecFormState.hallazgos },
    conteo_si: conteoSi,
    conteo_no: conteoNo,
    pct,
    nivel_logro: nivelCalculado.nivel,
    estado_panel: nivelCalculado.estado_panel,
    status: nivelCalculado.estado_panel,
    compromisos: {
      directivo: jecFormState.compromisoDirector,
      especialista: jecFormState.compromisoMonitor,
      responsableMonitor: finalRespNombre
    },
    compromisoDirector: jecFormState.compromisoDirector,
    compromisoMonitor: jecFormState.compromisoMonitor,
    observaciones: jecFormState.observaciones,
    extras: extrasFlat,
    esBorrador,
    updatedAt: Date.now()
  };
}
