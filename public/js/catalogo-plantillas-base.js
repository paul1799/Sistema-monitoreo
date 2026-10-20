/* =========================================================================
   catalogo-plantillas-base.js — Catálogo Oficial de Plantillas de Fichas
   UGEL 03 · AGEBRE · Monitoreo y Acompañamiento 2026

   Contiene las 8 estructuras oficiales canónicas de las fichas del sistema,
   preservando al 100% los identificadores canónicos (fichaTypeId e IDs de ítems)
   para que no se pierda la conexión con ninguna visita histórica ni reporte.
   ========================================================================= */

import { CEBE_SECCIONES } from './cebe-gestion.js?v=20261015_v1';
import { PRITE_SECCIONES } from './prite-gestion.js?v=20261015_v1';
import {
  EBR_GESTION_VISITA_1_SECCIONES,
  EBR_GESTION_VISITA_2_SECCIONES,
  EBR_GESTION_VISITA_3_SECCIONES
} from './ebr-gestion.js?v=20261015_v1';
import { JEC_SECCIONES } from './jec-monitoreo.js?v=20261015_v1';
import { JEC_1ER_SECCIONES } from './jec-1er-monitoreo.js?v=20261016_v4';

export { EBR_GESTION_VISITA_3_SECCIONES, JEC_1ER_SECCIONES };

/**
 * Catálogo completo de las 8 plantillas oficiales del sistema
 */
export const PLANTILLAS_BASE_OFICIALES = {
  // 1. GESTIÓN ESCOLAR EBR
  ft_gestion_ugel03_ebr: {
    id: 'ft_gestion_ugel03_ebr',
    nombre: 'Monitoreo y Asistencia Técnica a la Gestión Escolar - UGEL 03 EBR',
    nombreCorto: 'Gestión Escolar EBR',
    descripcion: 'Monitorea el cumplimiento de las condiciones de gestión escolar y el desempeño de la práctica docente en IE de Educación Básica Regular.',
    icono: '🏛️',
    color: '#1E40AF',
    modalidad: 'EBR Primaria',
    tipoRespuesta: 'ips',
    regla_nivel: 'porcentaje',
    tieneVisitas: true,
    tipoVisitas: 'items_por_visita',
    visitas: [
      'Visita 1 · Primer momento',
      'Visita 2 · Segundo momento',
      'Visita 3 · Tercer momento (Salida)'
    ],
    seccionesPorVisita: {
      0: EBR_GESTION_VISITA_1_SECCIONES,
      1: EBR_GESTION_VISITA_2_SECCIONES,
      2: EBR_GESTION_VISITA_3_SECCIONES
    },
    secciones: EBR_GESTION_VISITA_1_SECCIONES,
    extras: [
      { id: 'ex_red', label: 'RED / REI', tipo: 'texto', required: false },
      { id: 'ex_doc_ini', label: 'Total docentes Inicial', tipo: 'numero', required: false },
      { id: 'ex_doc_pri', label: 'Total docentes Primaria', tipo: 'numero', required: false },
      { id: 'ex_doc_sec', label: 'Total docentes Secundaria', tipo: 'numero', required: false }
    ],
    tablas: [
      {
        id: 'tbl_directivos_ebr',
        titulo: 'Equipo Directivo de la IE',
        descripcion: 'Directores y Subdirectores a cargo de la gestión escolar',
        columnas: [
          { id: 'c_cargo', nombre: 'Cargo', tipo: 'texto' },
          { id: 'c_nombres', nombre: 'Apellidos y Nombres', tipo: 'texto' },
          { id: 'c_dni', nombre: 'DNI', tipo: 'texto' },
          { id: 'c_tel', nombre: 'Teléfono', tipo: 'texto' },
          { id: 'c_correo', nombre: 'Correo electrónico', tipo: 'texto' }
        ],
        filas: [
          { id: 'f_dir', etiqueta: 'Director(a)' },
          { id: 'f_sub1', etiqueta: 'Subdirector(a) 1' },
          { id: 'f_sub2', etiqueta: 'Subdirector(a) 2' }
        ]
      }
    ],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    },
    version: '2026.1',
    esBorrador: false
  },

  // 2. MODELO JEC (MSE JEC) — FICHA UNIFICADA MULTI-MOMENTO (ESTILO EBR)
  ft_msejec_2do: {
    id: 'ft_msejec_2do',
    nombre: 'Monitoreo a la Implementación del Modelo JEC',
    nombreCorto: 'Monitoreo a la Implementación del Modelo JEC',
    descripcion: 'Monitoreo y asistencia técnica a la implementación del Modelo de Servicio Educativo Jornada Escolar Completa (JEC) a lo largo del año escolar (1er momento Inicio, 2do momento Proceso y 3er momento Salida).',
    icono: '🏫',
    color: '#059669',
    modalidad: 'JEC',
    tipoRespuesta: 'si_no',
    regla_nivel: 'conteo_rangos',
    regla_nivel_config: {
      minIni: 0, maxIni: 11, lblIni: 'Implementación incipiente',
      minProc: 12, maxProc: 23, lblProc: 'Implementación parcial',
      minLog: 24, maxLog: 31, lblLog: 'Implementación lograda'
    },
    tieneVisitas: true,
    tipoVisitas: 'items_por_visita',
    visitas: [
      '1er Monitoreo · Primer momento (Inicio)',
      '2do Monitoreo · Segundo momento (Proceso)',
      '3er Monitoreo · Tercer momento (Salida)'
    ],
    seccionesPorVisita: {
      0: JEC_1ER_SECCIONES,
      1: JEC_SECCIONES,
      2: JEC_SECCIONES
    },
    secciones: JEC_SECCIONES,
    extras: [
      { id: 'ex_tecnica', label: '¿La IE implementa Secundaria con Formación Técnica?', tipo: 'opciones', required: true, opciones: 'Sí, No' },
      { id: 'ex_secciones', label: 'N° de secciones', tipo: 'numero', required: true },
      { id: 'ex_estudiantes', label: 'Cantidad de estudiantes', tipo: 'numero', required: true },
      { id: 'ex_docentes', label: 'Cantidad de docentes', tipo: 'numero', required: true }
    ],
    tablas: [
      {
        id: 'tbl_directivo_jec',
        titulo: 'Datos del Directivo Entrevistado',
        descripcion: 'Información de contacto del directivo que proporciona los datos',
        columnas: [
          { id: 'c_cargo', nombre: 'Cargo / Condición', tipo: 'texto' },
          { id: 'c_nombres', nombre: 'Apellidos y Nombres', tipo: 'texto' },
          { id: 'c_dni', nombre: 'DNI', tipo: 'texto' },
          { id: 'c_cel', nombre: 'Celular', tipo: 'texto' },
          { id: 'c_email', nombre: 'Correo institucional', tipo: 'texto' }
        ],
        filas: [
          { id: 'f_resp', etiqueta: 'Directivo informante' }
        ]
      }
    ],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    },
    version: '2026.1',
    esBorrador: false
  },

  // 3. GESTIÓN ESCOLAR CEBE
  ft_gestion_cebe: {
    id: 'ft_gestion_cebe',
    nombre: 'Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE',
    nombreCorto: 'Gestión Escolar CEBE',
    descripcion: 'Monitorea el acompañamiento a la práctica docente, fortalecimiento docente, evaluación de aprendizajes, uso de materiales, Plan Lector, enfoque ambiental e innovación educativa en los CEBE.',
    icono: '🎯',
    color: '#7C3AED',
    modalidad: 'CEBE',
    tipoRespuesta: 'ips',
    regla_nivel: 'porcentaje',
    tieneVisitas: true,
    tipoVisitas: 'mismos_items',
    visitas: ['Visita 1', 'Visita 2', 'Visita 3'],
    secciones: CEBE_SECCIONES,
    extras: [
      { id: 'ex_rei', label: 'REI', tipo: 'texto', required: false },
      { id: 'ex_niveles', label: 'Niveles que atiende', tipo: 'texto', required: false },
      { id: 'ex_tot_est', label: 'Total de estudiantes matriculados', tipo: 'numero', required: false }
    ],
    tablas: [
      {
        id: 'tbl_personal_cebe',
        titulo: 'Cuadro de Personal del CEBE',
        descripcion: 'Distribución del personal docente, auxiliar y administrativo',
        columnas: [
          { id: 'c_cant', nombre: 'Cantidad', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_dir', etiqueta: 'Director(a)' },
          { id: 'f_doc_nom', etiqueta: 'N° Docentes nombrados' },
          { id: 'f_doc_con', etiqueta: 'N° Docentes contratados' },
          { id: 'f_aux', etiqueta: 'N° Auxiliares de educación' },
          { id: 'f_lsp', etiqueta: 'Modelos lingüísticos de LSP' },
          { id: 'f_cas', etiqueta: 'Personal CAS' },
          { id: 'f_adm', etiqueta: 'Personal administrativo' }
        ]
      },
      {
        id: 'tbl_saanee_cebe',
        titulo: 'Personal SAANEE',
        descripcion: 'Equipo de apoyo pedagógico para la inclusión',
        columnas: [
          { id: 'c_cant', nombre: 'Cantidad', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_saanee_nom', etiqueta: 'Docentes SAANEE nombrados' },
          { id: 'f_saanee_con', etiqueta: 'Docentes SAANEE contratados' },
          { id: 'f_saanee_prof', etiqueta: 'Profesionales no docentes SAANEE' }
        ]
      }
    ],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    },
    version: '2026.1',
    esBorrador: false
  },

  // 4. GESTIÓN ESCOLAR PRITE
  ft_prite_gestion: {
    id: 'ft_prite_gestion',
    nombre: 'Monitoreo y Asistencia Técnica a la Gestión Escolar - PRITE',
    nombreCorto: 'Gestión Escolar PRITE',
    descripcion: 'Monitorea la gestión institucional, planificación curricular, evaluación psicopedagógica, intervención no escolarizada y trabajo con familias en los PRITE.',
    icono: '👶',
    color: '#DB2777',
    modalidad: 'PRITE',
    tipoRespuesta: 'ips',
    regla_nivel: 'porcentaje',
    tieneVisitas: true,
    tipoVisitas: 'mismos_items',
    visitas: ['Visita 1', 'Visita 2', 'Visita 3'],
    secciones: PRITE_SECCIONES,
    extras: [
      { id: 'ex_rei', label: 'REI', tipo: 'texto', required: false },
      { id: 'ex_tot_est', label: 'Total niños matriculados', tipo: 'numero', required: false }
    ],
    tablas: [
      {
        id: 'tbl_personal_prite',
        titulo: 'Personal del PRITE',
        descripcion: 'Personal docente, profesionales de apoyo y auxiliares',
        columnas: [
          { id: 'c_cant', nombre: 'Cantidad', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_dir', etiqueta: 'Directora' },
          { id: 'f_doc_nom', etiqueta: 'Docentes tutores nombrados' },
          { id: 'f_doc_con', etiqueta: 'Docentes tutores contratados' },
          { id: 'f_aux', etiqueta: 'Auxiliares de educación' },
          { id: 'f_psic', etiqueta: 'Psicólogo(a)' },
          { id: 'f_ter_fis', etiqueta: 'Terapeuta físico / ocupacional' },
          { id: 'f_ter_len', etiqueta: 'Terapeuta de lenguaje' },
          { id: 'f_ts', etiqueta: 'Trabajador(a) social' }
        ]
      }
    ],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    },
    version: '2026.1',
    esBorrador: false
  },

  // 5. DIRECTIVO DE IE (EBR / EBE)
  ft_directivo: {
    id: 'ft_directivo',
    nombre: 'Ficha de monitoreo al directivo de IE',
    nombreCorto: 'Directivo de IE',
    descripcion: 'Monitoreo y acompañamiento pedagógico e institucional al directivo de Instituciones Educativas de Educación Básica (EBR/EBE).',
    icono: '👔',
    color: '#2563EB',
    modalidad: 'Directivos',
    tipoRespuesta: 'nivel_1_4',
    regla_nivel: 'porcentaje',
    tieneVisitas: false,
    tipoVisitas: 'mismos_items',
    visitas: [],
    extras: [
      { id: 'ex_ugel', label: 'UGEL', tipo: 'texto', required: false },
      { id: 'ex_codigo', label: 'Código modular / Local', tipo: 'texto', required: false },
      { id: 'ex_rei', label: 'RED / REI', tipo: 'texto', required: false },
      { id: 'ex_director_nombre', label: 'Nombre del directivo', tipo: 'texto', required: false },
      { id: 'ex_director_dni', label: 'DNI del directivo', tipo: 'texto', required: false },
      { id: 'ex_condicion', label: 'Condición del directivo', tipo: 'texto', required: false },
      { id: 'ex_nivel_atencion', label: 'Nivel educativo que atiende', tipo: 'texto', required: false },
      { id: 'ex_turno_atencion', label: 'Turno de atención de la IE', tipo: 'texto', required: false },
      { id: 'ex_turno_visitado', label: 'Turno visitado', tipo: 'texto', required: false },
      { id: 'ex_responsable', label: 'Responsable / Especialista (Monitor)', tipo: 'texto', required: false },
      { id: 'ex_monitor_dni', label: 'DNI del monitor', tipo: 'texto', required: false },
      { id: 'ex_hora_inicio', label: 'Hora de inicio', tipo: 'texto', required: false },
      { id: 'ex_hora_termino', label: 'Hora de término', tipo: 'texto', required: false }
    ],
    secciones: [
      {
        nombre: 'A. DIMENSIÓN ESTRATÉGICA',
        items: [
          { id: 'dir_a_1', texto: 'La IE cuenta con instrumentos de gestión aprobados mediante RD y evidencia la articulación entre el PEI y el PAT, de modo que el diagnóstico, los objetivos y las metas institucionales se traducen en acciones planificadas para el año escolar.' },
          { id: 'dir_a_2', texto: 'El PCI de la IE se encuentra actualizado y contiene el Plan de Estudios y orientaciones para la planificación, mediación y evaluación formativa, en correspondencia con las características y necesidades de los estudiantes.' },
          { id: 'dir_a_3', texto: 'El PAT de la IE articula los objetivos y metas del PEI con la programación de actividades para cada compromiso de gestión escolar y la calendarización de las horas lectivas.' },
          { id: 'dir_a_4', texto: 'En la IE se cuenta con evidencia de seguimiento periódico a las actividades planificadas en el PAT y se registra su avance.' },
          { id: 'dir_a_5', texto: 'En la IE se evalúa y se toman decisiones para mejorar o reajustar las actividades del PAT a partir de un proceso de evaluación continua.' }
        ]
      },
      {
        nombre: 'B. DIMENSIÓN PEDAGÓGICA: ESTRATEGIAS PRIORIZADAS',
        items: [
          { id: 'dir_b_1', texto: 'El directivo realiza seguimiento periódico a la estrategia de Refuerzo Escolar y verifica la implementación de las acciones previstas.' },
          { id: 'dir_b_2', texto: 'El directivo implementa, realiza seguimiento y fortalece el uso de los materiales educativos (textos y cuadernos de trabajo entregados en el año en curso).' },
          { id: 'dir_b_3', texto: 'El directivo planifica, da seguimiento y evalúa la implementación del Plan Lector de la IE.' },
          { id: 'dir_b_4', texto: 'El directivo planifica, da seguimiento y evalúa la implementación del Proyecto Educativo Ambiental Integrado (PEAI) de la IE.' },
          { id: 'dir_b_5', texto: 'El directivo planifica, implementa y evalúa la Gestión del Riesgo de Desastres (GRD) en la IE, incluyendo acciones de prevención, mitigación y preparación para la respuesta.' }
        ]
      },
      {
        nombre: 'C. PLANIFICACIÓN CURRICULAR',
        items: [
          { id: 'dir_c_1', texto: 'Los docentes de la IE cuentan con la planificación de la unidad didáctica correspondiente al grado y sección a su cargo, vigente para el periodo en curso.' },
          { id: 'dir_c_2', texto: 'Los docentes de la IE cuentan con la planificación de sus sesiones o actividades de aprendizaje correspondientes al grado y sección a su cargo, vigente para el periodo en curso y articulada con la unidad didáctica correspondiente.' },
          { id: 'dir_c_3', texto: 'El directivo brinda asesoría pedagógica a los docentes para mejorar la planificación curricular, orientándola hacia el desarrollo de las competencias de los estudiantes.' },
          { id: 'dir_c_4', texto: 'En la IE se promueve que los docentes realicen la planificación curricular de manera colegiada (programación anual y unidades didácticas) evidenciando acuerdos pedagógicos.' }
        ]
      },
      {
        nombre: 'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA',
        items: [
          { id: 'dir_d_1', texto: 'En la IE se cuenta con un cronograma de monitoreo de la práctica pedagógica en el aula del presente año y se han ejecutado las visitas programadas.' },
          { id: 'dir_d_2', texto: 'En la IE se organiza e interpreta la información obtenida a partir del monitoreo, identificando logros y oportunidades de mejora de la práctica pedagógica docente.' },
          { id: 'dir_d_3', texto: 'En la IE se identifican, plantean e implementan propuestas de mejora que atienden las dificultades identificadas en la práctica pedagógica a partir del monitoreo.' }
        ]
      },
      {
        nombre: 'E. FORTALECIMIENTO DE LAS COMPETENCIAS DOCENTES',
        items: [
          { id: 'dir_e_1', texto: 'En la IE se realiza un diagnóstico de necesidades formativas docentes y se implementa al menos una acción de fortalecimiento que responde a una necesidad identificada en el diagnóstico.' },
          { id: 'dir_e_2', texto: 'La IE planifica e implementa (o viene implementando) al menos un proyecto de innovación pedagógica formulado, cuyos resultados son verificables y se difunden a la comunidad educativa.' }
        ]
      },
      {
        nombre: 'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES',
        items: [
          { id: 'dir_f_1', texto: 'El directivo gestiona la entrega oportuna de los informes de progreso de las competencias de los estudiantes que contienen el nivel de logro alcanzado en cada competencia y, cuando corresponde, las conclusiones descriptivas de los aprendizajes.' },
          { id: 'dir_f_2', texto: 'En la IE se analizan los resultados de aprendizaje y, a partir de ellos, se implementan estrategias pedagógicas para la mejora de los aprendizajes.' }
        ]
      }
    ],
    tablas: [],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    },
    version: '2026.1',
    esBorrador: false
  },

  // 6. RÚBRICAS DE OBSERVACIÓN DE AULA
  ft_rubricas_aula: {
    id: 'ft_rubricas_aula',
    nombre: 'Monitoreo Pedagógico a Docentes - Rúbricas de Observación de Aula',
    nombreCorto: 'Rúbricas de observación de aula',
    descripcion: 'Registra el nivel de logro del desempeño docente observado en el aula, según las 5 rúbricas oficiales de observación de MINEDU.',
    icono: '👩‍🏫',
    color: '#0D9488',
    modalidad: 'Docentes',
    tipoRespuesta: 'nivel_1_4',
    regla_nivel: 'porcentaje',
    tieneVisitas: false,
    tipoVisitas: 'mismos_items',
    visitas: [],
    extras: [
      { id: 'ex_docente', label: 'Docente observado', tipo: 'texto', required: true },
      { id: 'ex_dni', label: 'DNI del docente', tipo: 'texto', required: false },
      { id: 'ex_nivel', label: 'Nivel educativo', tipo: 'texto', required: true },
      { id: 'ex_grado_sec', label: 'Grado y sección', tipo: 'texto', required: true },
      { id: 'ex_area', label: 'Área curricular observada', tipo: 'texto', required: true }
    ],
    secciones: [
      {
        nombre: 'Rúbricas de observación de aula (MINEDU)',
        items: [
          { id: 'ra_1', texto: 'Rúbrica 1: Involucra activamente a los estudiantes en el proceso de aprendizaje' },
          { id: 'ra_2', texto: 'Rúbrica 2: Promueve el razonamiento, la creatividad y/o el pensamiento crítico' },
          { id: 'ra_3', texto: 'Rúbrica 3: Evalúa el progreso de los aprendizajes para retroalimentar a los estudiantes y adecuar su enseñanza' },
          { id: 'ra_4', texto: 'Rúbrica 4: Propicia un ambiente de respeto y proximidad' },
          { id: 'ra_5', texto: 'Rúbrica 5: Regula positivamente el comportamiento de los estudiantes' }
        ]
      }
    ],
    tablas: [],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 2
    },
    version: '2026.1',
    esBorrador: false
  },

  // 7. COORDINADOR DE TUTORÍA (JEC)
  ft_coord_tutoria_jec: {
    id: 'ft_coord_tutoria_jec',
    nombre: 'Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)',
    nombreCorto: 'Coord. de Tutoría (JEC)',
    descripcion: 'Evalúa el cumplimiento de las funciones del coordinador de tutoría: planificación, visitas de aula, reuniones colegiadas, tutoría individual y trabajo con familias.',
    icono: '🧭',
    color: '#0284C7',
    modalidad: 'Tutoría',
    tipoRespuesta: 'escala_1_3',
    regla_nivel: 'sumatoria',
    tieneVisitas: true,
    tipoVisitas: 'mismos_items',
    visitas: ['2do Momento (V2)', '3er Momento (V3)'],
    extras: [
      { id: 'ex_coord', label: 'Coordinador(a) de tutoría', tipo: 'texto', required: true },
      { id: 'ex_cant_tut', label: 'N° de docentes tutores a cargo', tipo: 'numero', required: false }
    ],
    secciones: [
      {
        nombre: 'Planificación de la tutoría grupal',
        items: [
          { id: 'ct_1', texto: 'Orienta a los docentes tutores en la planificación colegiada de la tutoría grupal' },
          { id: 'ct_2', texto: 'Analiza las planificaciones de las sesiones de tutoría grupal con el fin de orientar su mejora' },
          { id: 'ct_3', texto: 'Brinda retroalimentación reflexiva, logrando compromisos de mejora con el docente tutor' }
        ]
      },
      {
        nombre: 'Visita al aula',
        items: [
          { id: 'ct_4', texto: 'Elabora un cronograma y comunica oportunamente a los docentes tutores a su cargo' },
          { id: 'ct_5', texto: 'Realiza visitas de acompañamiento al docente tutor de forma planificada, conforme a cronograma' },
          { id: 'ct_6', texto: 'Registra información utilizando el cuaderno de campo u otro instrumento de observación' },
          { id: 'ct_7', texto: 'Prepara preguntas reflexivas para brindar la retroalimentación al docente tutor' },
          { id: 'ct_8', texto: 'Brinda retroalimentación mediante un diálogo reflexivo con el docente tutor visitado' },
          { id: 'ct_9', texto: 'Planifica reuniones colegiadas orientadas al acompañamiento tutorial de los docentes' },
          { id: 'ct_10', texto: 'Conduce reuniones semanales de trabajo colegiado según lo planificado' },
          { id: 'ct_11', texto: 'Registra los acuerdos asumidos en las actas de las reuniones colegiadas' }
        ]
      },
      {
        nombre: 'Tutoría individual y trabajo con las familias',
        items: [
          { id: 'ct_12', texto: 'Asegura que los docentes realicen tutorías individuales según las necesidades de los estudiantes, incluyendo casos priorizados' },
          { id: 'ct_13', texto: 'Coordina acciones con el psicólogo para identificar, atender y derivar casos priorizados' },
          { id: 'ct_14', texto: 'Coordina con el psicólogo espacios de orientación y encuentro con las familias' },
          { id: 'ct_15', texto: 'Gestiona junto al psicólogo las redes de apoyo de instituciones y redes comunitarias para familias vulnerables' }
        ]
      },
      {
        nombre: 'Participación estudiantil y orientación educativa permanente',
        items: [
          { id: 'ct_16', texto: 'Realiza el seguimiento a los espacios de participación estudiantil' },
          { id: 'ct_17', texto: 'Planifica actividades específicas que promuevan la participación activa e inclusiva de los estudiantes' },
          { id: 'ct_18', texto: 'Gestiona y articula con docentes tutores y no tutores la implementación de la orientación educativa' }
        ]
      },
      {
        nombre: 'Reuniones de trabajo con el equipo directivo',
        items: [
          { id: 'ct_19', texto: 'Participa activamente en las reuniones de trabajo colegiado con los directivos de la IE' },
          { id: 'ct_20', texto: 'Presenta a la dirección un informe sobre los hallazgos del proceso de acompañamiento a los docentes tutores' },
          { id: 'ct_21', texto: 'Socializa los resultados del acompañamiento a la acción tutorial, proponiendo alternativas de mejora' }
        ]
      }
    ],
    tablas: [],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    },
    version: '2026.1',
    esBorrador: false
  },

  // 8. MATERIALES EDUCATIVOS (CEBE/PRITE)
  ft_materiales_cebe: {
    id: 'ft_materiales_cebe',
    nombre: 'Ficha de Monitoreo de la Gestión y Uso Pedagógico de los Materiales Educativos en los CEBE y PRITE',
    nombreCorto: 'Materiales educativos (CEBE/PRITE)',
    descripcion: 'Verifica la recepción, distribución, uso pedagógico, seguimiento y conservación de los materiales educativos en los CEBE y PRITE de la UGEL 03.',
    icono: '📦',
    color: '#EAB308',
    modalidad: 'CEBE / PRITE',
    grupo: 'CEBE / PRITE',
    tipoRespuesta: 'si_no',
    regla_nivel: 'porcentaje',
    tieneVisitas: false,
    tipoVisitas: 'mismos_items',
    visitas: [],
    extras: [
      { id: 'ex_ugel', label: 'UGEL', tipo: 'texto', required: false },
      { id: 'ex_cod_local', label: 'Código local', tipo: 'texto', required: false },
      { id: 'ex_rei', label: 'REI', tipo: 'texto', required: false },
      { id: 'ex_direccion', label: 'Dirección', tipo: 'texto', required: false },
      { id: 'ex_telefono', label: 'Teléfono', tipo: 'texto', required: false },
      { id: 'ex_directora', label: 'Directora', tipo: 'texto', required: false },
      { id: 'ex_correo', label: 'Correo Electrónico', tipo: 'texto', required: false },
      { id: 'ex_responsable', label: 'Responsable Del Monitoreo', tipo: 'texto', required: false }
    ],
    secciones: [
      {
        nombre: 'Recepción',
        items: [
          { id: 'mc_1', texto: 'La institución educativa recibió materiales educativos fungibles' },
          { id: 'mc_2', texto: 'La institución educativa recibió materiales educativos no fungibles' },
          { id: 'mc_3', texto: 'Los materiales no fungibles recibidos están registrados en el inventario institucional' }
        ]
      },
      {
        nombre: 'Distribución',
        items: [
          { id: 'mc_4', texto: 'Se realizó la distribución de materiales fungibles a los docentes' },
          { id: 'mc_5', texto: 'Se realizó la distribución de materiales no fungibles a los docentes' }
        ]
      },
      {
        nombre: 'Uso pedagógico',
        items: [
          { id: 'mc_6', texto: 'Los docentes incorporan los materiales educativos en su planificación curricular' },
          { id: 'mc_7', texto: 'Se evidencia el uso de los materiales durante las actividades de aprendizaje' },
          { id: 'mc_8', texto: 'Los materiales utilizados guardan relación con los propósitos de aprendizaje planteados' },
          { id: 'mc_9', texto: 'Los materiales cuentan con adaptaciones acordes a las características y necesidades de los estudiantes' }
        ]
      },
      {
        nombre: 'Seguimiento',
        items: [
          { id: 'mc_10', texto: 'La dirección realiza monitoreo del uso de los materiales distribuidos a docentes/tutores' },
          { id: 'mc_11', texto: 'La dirección brinda orientaciones a los docentes sobre el uso pertinente de los materiales durante el monitoreo pedagógico' }
        ]
      },
      {
        nombre: 'Conservación y control',
        items: [
          { id: 'mc_12', texto: 'Los materiales fungibles se encuentran en espacios con condiciones adecuadas de conservación y seguridad' },
          { id: 'mc_13', texto: 'Los materiales no fungibles entregados mantienen condiciones adecuadas para su uso' },
          { id: 'mc_14', texto: 'La institución cuenta con un mecanismo de control de ingreso, salida y préstamo de materiales no fungibles' }
        ]
      }
    ],
    tablas: [],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 2
    },
    version: '2026.1',
    esBorrador: false
  }
};

// Mapa canónico de resolución de aliases históricos (EBR y JEC) para no duplicar fichas en el catálogo
export const ALIAS_A_PLANTILLA_BASE = {
  ft_ebr_gestion_1er: 'ft_gestion_ugel03_ebr',
  ft_ebr_gestion: 'ft_gestion_ugel03_ebr',
  ft_ebr_gestion_2do: 'ft_gestion_ugel03_ebr',
  ft_ebr_gestion_3er: 'ft_gestion_ugel03_ebr',
  ft_jec: 'ft_msejec_2do',
  ft_msejec_1er: 'ft_msejec_2do',
  ft_msejec_3er: 'ft_msejec_2do',
};
