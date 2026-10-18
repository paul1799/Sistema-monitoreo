/**
 * public/js/matriz/items-pedagogico.js
 * 17 ítems oficiales de la Ficha de Monitoreo al Coordinador(a) Pedagógico (JEC)
 * UGEL 03 · AGEBRE
 */

export const ITEMS_COORD_PEDAGOGICO = [
  // 1. Planificación curricular y trabajo pedagógico (3 ítems)
  {
    id: 'cp_1',
    num: '01',
    aspectoIndex: 0,
    aspectoNombre: 'Planificación curricular y trabajo pedagógico',
    tipo: 'escala_1_3',
    texto: 'Orienta y acompaña a los docentes a su cargo en la planificación curricular colegiada (programación anual, unidades y sesiones de aprendizaje)'
  },
  {
    id: 'cp_2',
    num: '02',
    aspectoIndex: 0,
    aspectoNombre: 'Planificación curricular y trabajo pedagógico',
    tipo: 'escala_1_3',
    texto: 'Revisa y retroalimenta las planificaciones curriculares asegurando la articulación de competencias, capacidades y criterios de evaluación'
  },
  {
    id: 'cp_3',
    num: '03',
    aspectoIndex: 0,
    aspectoNombre: 'Planificación curricular y trabajo pedagógico',
    tipo: 'escala_1_3',
    texto: 'Promueve la incorporación del refuerzo escolar y adaptaciones curriculares en la planificación pedagógica de los docentes'
  },

  // 2. Acompañamiento y monitoreo a la práctica pedagógica en aula (5 ítems)
  {
    id: 'cp_4',
    num: '04',
    aspectoIndex: 1,
    aspectoNombre: 'Acompañamiento y monitoreo a la práctica pedagógica en aula',
    tipo: 'escala_1_3',
    texto: 'Elabora y socializa el cronograma de visitas de acompañamiento pedagógico a los docentes a su cargo'
  },
  {
    id: 'cp_5',
    num: '05',
    aspectoIndex: 1,
    aspectoNombre: 'Acompañamiento y monitoreo a la práctica pedagógica en aula',
    tipo: 'escala_1_3',
    texto: 'Ejecuta las visitas de acompañamiento pedagógico en aula conforme a su cronograma y plan de trabajo'
  },
  {
    id: 'cp_6',
    num: '06',
    aspectoIndex: 1,
    aspectoNombre: 'Acompañamiento y monitoreo a la práctica pedagógica en aula',
    tipo: 'escala_1_3',
    texto: 'Utiliza el cuaderno de campo y los instrumentos de observación de aula para registrar evidencias objetivas de la práctica docente'
  },
  {
    id: 'cp_7',
    num: '07',
    aspectoIndex: 1,
    aspectoNombre: 'Acompañamiento y monitoreo a la práctica pedagógica en aula',
    tipo: 'escala_1_3',
    texto: 'Desarrolla el diálogo reflexivo con el docente acompañado, formulando preguntas que promueven la autoevaluación de su práctica'
  },
  {
    id: 'cp_8',
    num: '08',
    aspectoIndex: 1,
    aspectoNombre: 'Acompañamiento y monitoreo a la práctica pedagógica en aula',
    tipo: 'escala_1_3',
    texto: 'Establece compromisos de mejora pedagógica con el docente acompañado y realiza el seguimiento a su cumplimiento'
  },

  // 3. Trabajo colegiado y fortalecimiento de competencias docentes (3 ítems)
  {
    id: 'cp_9',
    num: '09',
    aspectoIndex: 2,
    aspectoNombre: 'Trabajo colegiado y fortalecimiento de competencias docentes',
    tipo: 'escala_1_3',
    texto: 'Cuenta con su matriz de necesidades formativas de los docentes a cargo a partir del diagnóstico y visitas de aula'
  },
  {
    id: 'cp_10',
    num: '10',
    aspectoIndex: 2,
    aspectoNombre: 'Trabajo colegiado y fortalecimiento de competencias docentes',
    tipo: 'escala_1_3',
    texto: 'Planifica y conduce las Reuniones de Trabajo Colegiado (RTC) pedagógico semanales respondiendo a las necesidades formativas'
  },
  {
    id: 'cp_11',
    num: '11',
    aspectoIndex: 2,
    aspectoNombre: 'Trabajo colegiado y fortalecimiento de competencias docentes',
    tipo: 'escala_1_3',
    texto: 'Desarrolla acciones formativas (talleres, grupos de interaprendizaje, modelados) para fortalecer las competencias pedagógicas y registra los acuerdos asumidos'
  },

  // 4. Evaluación de los aprendizajes y uso de recursos educativos (3 ítems)
  {
    id: 'cp_12',
    num: '12',
    aspectoIndex: 3,
    aspectoNombre: 'Evaluación de los aprendizajes y uso de recursos educativos',
    tipo: 'escala_1_3',
    texto: 'Orienta a los docentes en la aplicación de la evaluación formativa y el análisis reflexivo de los resultados de aprendizaje'
  },
  {
    id: 'cp_13',
    num: '13',
    aspectoIndex: 3,
    aspectoNombre: 'Evaluación de los aprendizajes y uso de recursos educativos',
    tipo: 'escala_1_3',
    texto: 'Acompaña la implementación de estrategias diferenciadas y el refuerzo escolar a partir de los resultados diagnósticos y de proceso'
  },
  {
    id: 'cp_14',
    num: '14',
    aspectoIndex: 3,
    aspectoNombre: 'Evaluación de los aprendizajes y uso de recursos educativos',
    tipo: 'escala_1_3',
    texto: 'Promueve el uso pedagógico de materiales educativos, textos escolares y coordina con el CIST la integración de recursos tecnológicos'
  },

  // 5. Reuniones de trabajo con el equipo directivo de la IE (3 ítems: 15, 16, 17)
  {
    id: 'cp_15',
    num: '15',
    aspectoIndex: 4,
    aspectoNombre: 'Reuniones de trabajo con el equipo directivo de la IE',
    tipo: 'escala_1_3',
    texto: 'Participa activamente en las reuniones de trabajo colegiado con los directivos de la IE aportando al análisis reflexivo y a la mejora de la práctica pedagógica.'
  },
  {
    id: 'cp_16',
    num: '16',
    aspectoIndex: 4,
    aspectoNombre: 'Reuniones de trabajo con el equipo directivo de la IE',
    tipo: 'escala_1_3',
    texto: 'Presenta a la dirección informe sobre los hallazgos del proceso de acompañamiento a las docentes (visita en aula, diálogo reflexivo y trabajo colegiado).'
  },
  {
    id: 'cp_17',
    num: '17',
    aspectoIndex: 4,
    aspectoNombre: 'Reuniones de trabajo con el equipo directivo de la IE',
    tipo: 'escala_1_3',
    texto: 'Socializa los resultados del acompañamiento pedagógico, en las reuniones de trabajo con los directivos de la IE, proponiendo alternativas de mejora.'
  }
];
