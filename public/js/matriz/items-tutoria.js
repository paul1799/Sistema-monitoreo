/**
 * public/js/matriz/items-tutoria.js
 * 21 ítems oficiales de la Ficha de Monitoreo al Coordinador(a) de Tutoría (JEC)
 * UGEL 03 · AGEBRE
 */

export const ITEMS_COORD_TUTORIA_JEC = [
  // 1. Planificación de la tutoría grupal (ct_1 .. ct_3)
  {
    id: 'ct_1',
    num: '01',
    aspectoIndex: 0,
    aspectoNombre: 'Planificación de la tutoría grupal',
    tipo: 'escala_1_3',
    texto: 'Orienta a los docentes tutores en la planificación colegiada de la tutoría grupal'
  },
  {
    id: 'ct_2',
    num: '02',
    aspectoIndex: 0,
    aspectoNombre: 'Planificación de la tutoría grupal',
    tipo: 'escala_1_3',
    texto: 'Analiza las planificaciones de las sesiones de tutoría grupal con el fin de orientar su mejora'
  },
  {
    id: 'ct_3',
    num: '03',
    aspectoIndex: 0,
    aspectoNombre: 'Planificación de la tutoría grupal',
    tipo: 'escala_1_3',
    texto: 'Brinda retroalimentación reflexiva, logrando compromisos de mejora con el docente tutor'
  },

  // 2. Visita al aula (ct_4 .. ct_11)
  {
    id: 'ct_4',
    num: '04',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Elabora un cronograma y comunica oportunamente a los docentes tutores a su cargo'
  },
  {
    id: 'ct_5',
    num: '05',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Realiza visitas de acompañamiento al docente tutor de forma planificada, conforme a cronograma'
  },
  {
    id: 'ct_6',
    num: '06',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Registra información utilizando el cuaderno de campo u otro instrumento de observación'
  },
  {
    id: 'ct_7',
    num: '07',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Prepara preguntas reflexivas para brindar la retroalimentación al docente tutor'
  },
  {
    id: 'ct_8',
    num: '08',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Brinda retroalimentación mediante un diálogo reflexivo con el docente tutor visitado'
  },
  {
    id: 'ct_9',
    num: '09',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Planifica reuniones colegiadas orientadas al acompañamiento tutorial de los docentes'
  },
  {
    id: 'ct_10',
    num: '10',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Conduce reuniones semanales de trabajo colegiado según lo planificado'
  },
  {
    id: 'ct_11',
    num: '11',
    aspectoIndex: 1,
    aspectoNombre: 'Visita al aula',
    tipo: 'escala_1_3',
    texto: 'Registra los acuerdos asumidos en las actas de las reuniones colegiadas'
  },

  // 3. Tutoría individual y trabajo con las familias (ct_12 .. ct_15)
  {
    id: 'ct_12',
    num: '12',
    aspectoIndex: 2,
    aspectoNombre: 'Tutoría individual y trabajo con las familias',
    tipo: 'escala_1_3',
    texto: 'Asegura que los docentes realicen tutorías individuales según las necesidades de los estudiantes, incluyendo casos priorizados'
  },
  {
    id: 'ct_13',
    num: '13',
    aspectoIndex: 2,
    aspectoNombre: 'Tutoría individual y trabajo con las familias',
    tipo: 'escala_1_3',
    texto: 'Coordina acciones con el psicólogo para identificar, atender y derivar casos priorizados'
  },
  {
    id: 'ct_14',
    num: '14',
    aspectoIndex: 2,
    aspectoNombre: 'Tutoría individual y trabajo con las familias',
    tipo: 'escala_1_3',
    texto: 'Coordina con el psicólogo espacios de orientación y encuentro con las familias'
  },
  {
    id: 'ct_15',
    num: '15',
    aspectoIndex: 2,
    aspectoNombre: 'Tutoría individual y trabajo con las familias',
    tipo: 'escala_1_3',
    texto: 'Gestiona junto al psicólogo las redes de apoyo de instituciones y redes comunitarias para familias vulnerables'
  },

  // 4. Participación estudiantil y orientación educativa permanente (ct_16 .. ct_18)
  {
    id: 'ct_16',
    num: '16',
    aspectoIndex: 3,
    aspectoNombre: 'Participación estudiantil y orientación educativa permanente',
    tipo: 'escala_1_3',
    texto: 'Realiza el seguimiento a los espacios de participación estudiantil'
  },
  {
    id: 'ct_17',
    num: '17',
    aspectoIndex: 3,
    aspectoNombre: 'Participación estudiantil y orientación educativa permanente',
    tipo: 'escala_1_3',
    texto: 'Planifica actividades específicas que promuevan la participación activa e inclusiva de los estudiantes'
  },
  {
    id: 'ct_18',
    num: '18',
    aspectoIndex: 3,
    aspectoNombre: 'Participación estudiantil y orientación educativa permanente',
    tipo: 'escala_1_3',
    texto: 'Gestiona y articula con docentes tutores y no tutores la implementación de la orientación educativa'
  },

  // 5. Reuniones de trabajo con el equipo directivo (ct_19 .. ct_21)
  {
    id: 'ct_19',
    num: '19',
    aspectoIndex: 4,
    aspectoNombre: 'Reuniones de trabajo con el equipo directivo',
    tipo: 'escala_1_3',
    texto: 'Participa activamente en las reuniones de trabajo colegiado con los directivos de la IE'
  },
  {
    id: 'ct_20',
    num: '20',
    aspectoIndex: 4,
    aspectoNombre: 'Reuniones de trabajo con el equipo directivo',
    tipo: 'escala_1_3',
    texto: 'Presenta a la dirección un informe sobre los hallazgos del proceso de acompañamiento a los docentes tutores'
  },
  {
    id: 'ct_21',
    num: '21',
    aspectoIndex: 4,
    aspectoNombre: 'Reuniones de trabajo con el equipo directivo',
    tipo: 'escala_1_3',
    texto: 'Socializa los resultados del acompañamiento a la acción tutorial, proponiendo alternativas de mejora'
  }
];
