/* =========================================================================
   pdf/constants.js — Constantes oficiales de textos y dimensiones
   para generación de PDFs en el Sistema de Monitoreo (UGEL 03 · AGEBRE)
   ========================================================================= */

export const SISTEMA_NOMBRE_OFICIAL = 'Sistema de Fichas de Monitoreo';

/**
 * Textos oficiales verbatim de los 21 ítems de la Ficha de Monitoreo al Directivo de IE
 * Fuente: Instrumento oficial UGEL 03 / MINEDU 2026
 */
export const OFFICIAL_DIRECTIVO_ITEMS = {
  1: "La IE cuenta con instrumentos de gestión aprobados mediante RD y evidencia la articulación entre el PEI y el PAT, de modo que el diagnóstico, los objetivos y las metas institucionales se traducen en acciones planificadas para el año escolar.",
  2: "El PCI de la IE se encuentra actualizado y contiene el Plan de Estudios y orientaciones para la planificación, mediación y evaluación formativa, en correspondencia con las características y necesidades de los estudiantes.",
  3: "El PAT de la IE articula los objetivos y metas del PEI con la programación de actividades para cada compromiso de gestión escolar y la calendarización de las horas lectivas.",
  4: "En la IE se cuenta con evidencia de seguimiento periódico a las actividades planificadas en el PAT y se registra su avance.",
  5: "En la IE se evalúa y se toman decisiones para mejorar o reajustar las actividades del PAT a partir de un proceso de evaluación continua.",
  6: "El directivo realiza seguimiento periódico a la estrategia de Refuerzo Escolar y verifica la implementación de las acciones previstas.",
  7: "El directivo implementa, realiza seguimiento y fortalece el uso de los materiales educativos (textos y cuadernos de trabajo entregados en el año en curso).",
  8: "El directivo planifica, da seguimiento y evalúa la implementación del Plan Lector de la IE.",
  9: "El directivo planifica, da seguimiento y evalúa la implementación del Proyecto Educativo Ambiental Integrado (PEAI) de la IE.",
  10: "El directivo planifica, implementa y evalúa la Gestión del Riesgo de Desastres (GRD) en la IE, incluyendo acciones de prevención, mitigación y preparación para la respuesta.",
  11: "Los docentes de la IE cuentan con la planificación de la unidad didáctica correspondiente al grado y sección a su cargo, vigente para el periodo en curso.",
  12: "Los docentes de la IE cuentan con la planificación de sus sesiones o actividades de aprendizaje correspondientes al grado y sección a su cargo, vigente para el periodo en curso y articulada con la unidad didáctica correspondiente.",
  13: "El directivo brinda asesoría pedagógica a los docentes para mejorar la planificación curricular, orientándola hacia el desarrollo de las competencias de los estudiantes.",
  14: "En la IE se promueve que los docentes realicen la planificación curricular de manera colegiada (programación anual y unidades didácticas) evidenciando acuerdos pedagógicos.",
  15: "En la IE se cuenta con un cronograma de monitoreo de la práctica pedagógica en el aula del presente año y se han ejecutado las visitas programadas.",
  16: "En la IE se organiza e interpreta la información obtenida a partir del monitoreo, identificando logros y oportunidades de mejora de la práctica pedagógica docente.",
  17: "En la IE se identifican, plantean e implementan propuestas de mejora que atienden las dificultades identificadas en la práctica pedagógica a partir del monitoreo.",
  18: "En la IE se realiza un diagnóstico de necesidades formativas docentes y se implementa al menos una acción de fortalecimiento que responde a una necesidad identificada en el diagnóstico.",
  19: "La IE planifica e implementa (o viene implementando) al menos un proyecto de innovación pedagógica formulado, cuyos resultados son verificables y se difunden a la comunidad educativa.",
  20: "El directivo gestiona la entrega oportuna de los informes de progreso de las competencias de los estudiantes que contienen el nivel de logro alcanzado en cada competencia y, cuando corresponde, las conclusiones descriptivas de los aprendizajes.",
  21: "En la IE se analizan los resultados de aprendizaje y, a partir de ellos, se implementan estrategias pedagógicas para la mejora de los aprendizajes."
};

export const OFFICIAL_DIRECTIVO_DIMENSIONS = [
  { id: 'A', nombre: 'A. INSTRUMENTOS DE GESTIÓN ESCOLAR', itemsCount: 5, startIdx: 1 },
  { id: 'B', nombre: 'B. IMPLEMENTACIÓN DE ESTRATEGIAS Y RECURSOS EDUCATIVOS', itemsCount: 5, startIdx: 6 },
  { id: 'C', nombre: 'C. PLANIFICACIÓN CURRICULAR', itemsCount: 4, startIdx: 11 },
  { id: 'D', nombre: 'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA', itemsCount: 3, startIdx: 15 },
  { id: 'E', nombre: 'E. FORMACIÓN CONTINUA E INNOVACIÓN EDUCATIVA', itemsCount: 2, startIdx: 18 },
  { id: 'F', nombre: 'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES', itemsCount: 2, startIdx: 20 }
];
