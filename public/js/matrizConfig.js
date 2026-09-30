/* =========================================================================
   matrizConfig.js — Configuración declarativa para la Matriz de Seguimiento 2026
   UGEL 03 · AGEBRE
   
   Define las estructuras, paletas de colores, columnas, textos oficiales,
   fórmulas y límites de nivel para las tres fichas:
     A) Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC
        Hoja: "MODELO JEC"
     B) Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)
        Hoja: "COORD. TUTORIA JEC"
     C) Ficha de Monitoreo a las funciones que cumple el/la Coordinador(a) Pedagógico
        Hoja: "COORD. PEDAGOGICO"
   ========================================================================= */

import { isFichaJec, isFichaCoordTutoriaJec, isFichaCoordPedagogico, REGLA_NIVEL_JEC } from './calcEngine.js?v=20260928_v12';

/**
 * Convierte un número de columna 1-indexado a letra de columna Excel (1 -> A, 24 -> X, etc.)
 */
export function colToLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp > 0) {
    let mod = (temp - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    temp = Math.floor((temp - mod) / 26);
  }
  return letter;
}

/**
 * Paleta de colores oficiales según la plantilla Excel:
 * MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC.xlsx
 */
export const PALETA_MATRIZ = {
  // I. Datos Generales
  datosGeneralesHeader: 'B4C7E7', // Azul claro cabecera nivel 1-2
  datosGeneralesSubheader: 'DAE3F3', // Azul muy claro cabecera nivel 3
  datosGeneralesColA: 'DAE3F3', // Relleno columna N° (A)
  datosGeneralesData: 'E6EBF6', // Relleno celdas datos generales

  // Bloques de Personas
  persona1Header: 'C9C9C9', // Gris cabecera nivel 1-2 (Director)
  persona1Subheader: 'EDEDED', // Gris claro cabecera nivel 3
  persona1Data: 'F2F2F2', // Relleno datos primer bloque personas

  persona2Header: 'C9C9C9', // Gris cabecera nivel 1-2 (Subdirector / Coordinador)
  persona2Subheader: 'EDEDED', // Gris claro cabecera nivel 3
  persona2Data: null, // Sin relleno segundo bloque personas

  // Aspectos SI/NO
  siNoHeader1: 'FFD966', // Amarillo fuerte cabecera fila 1
  siNoHeader23: 'FFF2CC', // Amarillo claro cabecera filas 2 y 3
  siNoData: 'FFF8E5', // Amarillo muy tenue datos

  // Separador gris
  separadorGris: 'EDEDED',

  // Paleta cíclica para aspectos con escala 1-2-3 (Inicio/Proceso/Logrado)
  aspectosPuntaje: [
    {
      // 1.er aspecto con puntaje (Verde)
      header1: 'A9D18E',
      header23: 'E2F0D9',
      puntaje: 'A9D18E'
    },
    {
      // 2.º aspecto con puntaje (Morado / Lila)
      header1: 'DEBDFF',
      header23: 'E8D1FF',
      puntaje: 'C496DE'
    },
    {
      // 3.er aspecto con puntaje (Naranja suave / Salmón)
      header1: 'F8CBAD',
      header23: 'FBE5D6',
      puntaje: 'F8CBAD'
    },
    {
      // 4.º aspecto con puntaje (Celeste)
      header1: '94F0FA',
      header23: 'CBF8FD',
      puntaje: '94F0FA'
    },
    {
      // 5.º aspecto con puntaje (Amarillo)
      header1: 'FFD966',
      header23: 'FFF2CC',
      puntaje: 'FFD966'
    }
  ],

  // Columnas finales
  finalesHeader: 'EDEDED',
  nivelData: 'EDEDED',

  // Formato condicional de Nivel
  condicionalLogrado: 'C7F268', // Verde claro
  condicionalProceso: 'FFC285', // Naranja claro
  condicionalInicio: 'FF6699', // Rosado intenso

  // Bloque de estadística
  statTotalLabel: 'EDEDED',
  statSiNoLabel: 'B4C7E7',
  statScoreLabel: 'EDEDED',
  statScoreValues: 'EDEDED',

  // Cuadro RESULTADO
  resultadoHeader: '002060', // Azul marino oscuro
  resultadoHeaderFont: 'FFFF00', // Amarillo
  resultadoInicio: 'EF5786',
  resultadoProceso: 'FFB553',
  resultadoLogrado: 'BDDC02'
};

/**
 * Límites de nivel configurables por ficha:
 * Fórmulas:
 * =IF(<TOTAL><=0,"",IF(<TOTAL><=LIM_INICIO,"INICIO",IF(<TOTAL><=LIM_PROCESO,"PROCESO",IF(<TOTAL><=MAX,"LOGRADO",""))))
 */
export const LIMITES_NIVEL_FICHAS = {
  // Ficha A: JEC Oficial en el sistema (31 indicadores Sí/No/NA, cortes por conteo de Sí: 24..31 Lograda, 12..23 Parcial, 0..11 Incipiente)
  MODELO_JEC: {
    tipo: 'conteo',
    cuenta: 'si',
    max: 31,
    limInicio: 11,
    limProceso: 23,
    // Valores de compatibilidad y escala:
    maxLegacy: 111,
    limInicioLegacy: 56,
    limProcesoLegacy: 83,
    rangos: [
      { nivel: 'Implementación lograda', min: 24, max: 31, estado_panel: 'Logrado' },
      { nivel: 'Implementación parcial', min: 12, max: 23, estado_panel: 'En proceso' },
      { nivel: 'Implementación incipiente', min: 0, max: 11, estado_panel: 'Inicio' }
    ]
  },
  // Ficha B: Coordinador(a) de Tutoría (21 ítems x 3 = 63)
  COORD_TUTORIA_JEC: {
    max: 63,
    limInicio: 41,
    limProceso: 52
  },
  // Ficha C: Coordinador(a) Pedagógico (21 ítems x 3 = 63 estándar o n_items * 3)
  COORD_PEDAGOGICO: {
    max: 63,
    limInicio: 41,
    limProceso: 52
  }
};

/**
 * 31 indicadores oficiales del instrumento MSE JEC distribuidos en 3 componentes
 * Definición autónoma en matrizConfig.js para evitar dependencias circulares.
 */
export const JEC_ITEMS_OFICIALES = [
  // ─── Componente pedagógico (Implementación TOECE) (9 ítems) ───
  { id: 'jec_1', num: 1, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'El horario institucional evidencia la organización de la jornada escolar en 9 horas pedagógicas diarias de 45 minutos, conforme al plan de estudios MSE JEC' },
  { id: 'jec_2', num: 2, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'La IE cuenta con un diagnóstico de las necesidades de aprendizaje de los estudiantes que orienta la planificación pedagógica' },
  { id: 'jec_3', num: 3, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'La IE cuenta con Plan TOECE actualizado, aprobado y coherente con las necesidades socioemocionales identificadas' },
  { id: 'jec_4', num: 4, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'La IE cuenta con informes, actas, registros o acuerdos que evidencian el seguimiento a la implementación del Plan TOECE' },
  { id: 'jec_5', num: 5, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'La IE cuenta con sesiones de tutoría grupal que evidencian coherencia con el Plan TOECE y las necesidades socioemocionales identificadas' },
  { id: 'jec_6', num: 6, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'La IE cuenta con registros de atención tutorial individual que evidencian seguimiento a estudiantes con necesidades específicas' },
  { id: 'jec_7', num: 7, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'La IE cuenta con el plan de trabajo del psicólogo(a) actualizado, con actividades para estudiantes, orientación a familias y acciones formativas con docentes' },
  { id: 'jec_8', num: 8, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'La IE cuenta con informes, registros, actas u otros documentos que evidencian que el psicólogo(a) desarrolla acciones dirigidas a estudiantes, docentes y familias' },
  { id: 'jec_9', num: 9, seccion: 'Componente pedagógico (Implementación TOECE)', texto: 'Las sesiones de aprendizaje revisadas evidencian que responden a las necesidades de aprendizaje identificadas en los estudiantes' },

  // ─── Componente de gestión (11 ítems) ───
  { id: 'jec_10', num: 10, seccion: 'Componente de gestión', texto: 'La IE cuenta con un Plan Anual de Trabajo (PAT) que incorpora acciones del MSE JEC relacionadas con tutoría, acompañamiento, trabajo colegiado y CIST' },
  { id: 'jec_11', num: 11, seccion: 'Componente de gestión', texto: 'La IE cuenta con actas, acuerdos u otros registros que evidencian la organización de la comunidad educativa para asegurar el refrigerio escolar y recreos' },
  { id: 'jec_12', num: 12, seccion: 'Componente de gestión', texto: 'La IE cuenta con actas, comunicados, informes o registros que evidencian acciones de información y orientación a las familias' },
  { id: 'jec_13', num: 13, seccion: 'Componente de gestión', texto: 'La IE cuenta con actas, informes o registros que evidencian la promoción de espacios de participación estudiantil' },
  { id: 'jec_14', num: 14, seccion: 'Componente de gestión', texto: 'La IE cuenta con fichas, actas, registros u otros documentos que evidencian acciones de acompañamiento del director y subdirector a docentes y coordinadores' },
  { id: 'jec_15', num: 15, seccion: 'Componente de gestión', texto: 'La IE organiza las evidencias de la implementación del PEAI de acuerdo a la matriz de logros ambientales' },
  { id: 'jec_16', num: 16, seccion: 'Componente de gestión', texto: 'Los directivos monitorean la ejecución de las acciones del Plan Lector para la toma de decisiones y mejoras' },
  { id: 'jec_17', num: 17, seccion: 'Componente de gestión', texto: 'Se identifican buenas prácticas/proyectos de innovación y se promueven espacios de intercambio de experiencias' },
  { id: 'jec_18', num: 18, seccion: 'Componente de gestión', texto: 'El equipo directivo realiza el monitoreo y seguimiento al uso pedagógico de textos escolares y material concreto' },
  { id: 'jec_19', num: 19, seccion: 'Componente de gestión', texto: 'El directivo realiza el seguimiento a la participación de los docentes en las acciones formativas MINEDU (DIFODS-JEC)' },
  { id: 'jec_20', num: 20, seccion: 'Componente de gestión', texto: 'Los directivos han socializado los oficios múltiples correspondientes, asegurando su conocimiento e implementación' },

  // ─── Componente de soporte (11 ítems) ───
  { id: 'jec_21', num: 21, seccion: 'Componente de soporte', texto: 'La IE cuenta con actas, registros o materiales que evidencian la sensibilización realizada por los coordinadores pedagógicos (CP) a sus docentes a cargo' },
  { id: 'jec_22', num: 22, seccion: 'Componente de soporte', texto: 'El CP cuenta con evidencias de la realización de la visita diagnóstica y de ejecución de los docentes a su cargo' },
  { id: 'jec_23', num: 23, seccion: 'Componente de soporte', texto: 'El CP cuenta con registros que evidencian, de manera objetiva, la práctica pedagógica observada del docente en las visitas de aula' },
  { id: 'jec_24', num: 24, seccion: 'Componente de soporte', texto: 'El CP cuenta con matrices, planificador semanal, fichas u otros registros que evidencian el desarrollo del diálogo reflexivo con los docentes acompañados' },
  { id: 'jec_25', num: 25, seccion: 'Componente de soporte', texto: 'El CP cuenta con actas, guías u otros registros que evidencian que las reuniones de trabajo colegiado responden a las necesidades formativas identificadas' },
  { id: 'jec_26', num: 26, seccion: 'Componente de soporte', texto: 'La IE cuenta con actas, registros o materiales que evidencian la sensibilización realizada por los coordinadores de tutoría (CT) a sus docentes tutores' },
  { id: 'jec_27', num: 27, seccion: 'Componente de soporte', texto: 'El CT cuenta con evidencias de la realización de la visita diagnóstica y de ejecución de los docentes tutores a su cargo' },
  { id: 'jec_28', num: 28, seccion: 'Componente de soporte', texto: 'El CT cuenta con registros que evidencian, de manera objetiva, la práctica pedagógica observada del docente tutor posterior a la visita diagnóstica' },
  { id: 'jec_29', num: 29, seccion: 'Componente de soporte', texto: 'El CT cuenta con matrices, fichas u otros registros que evidencian el desarrollo del diálogo reflexivo con los docentes tutores acompañados' },
  { id: 'jec_30', num: 30, seccion: 'Componente de soporte', texto: 'El CT cuenta con actas, materiales u otros registros que evidencian las acciones formativas desarrolladas con docentes tutores en las reuniones colegiadas' },
  { id: 'jec_31', num: 31, seccion: 'Componente de soporte', texto: 'El CIST cuenta con planificador semanal, informes u otros registros que evidencian acciones de fortalecimiento de competencias digitales y mantenimiento de equipos' }
];

export const JEC_SECCIONES_OFICIALES = [
  {
    id: 'sec_pedagogico',
    nombre: 'Componente pedagógico (Implementación TOECE)',
    color: 'emerald',
    items: JEC_ITEMS_OFICIALES.filter(it => it.seccion === 'Componente pedagógico (Implementación TOECE)')
  },
  {
    id: 'sec_gestion',
    nombre: 'Componente de gestión',
    color: 'purple',
    items: JEC_ITEMS_OFICIALES.filter(it => it.seccion === 'Componente de gestión')
  },
  {
    id: 'sec_soporte',
    nombre: 'Componente de soporte',
    color: 'amber',
    items: JEC_ITEMS_OFICIALES.filter(it => it.seccion === 'Componente de soporte')
  }
];

// Alias para compatibilidad
export const JEC_ITEMS = JEC_ITEMS_OFICIALES;
export const JEC_SECCIONES = JEC_SECCIONES_OFICIALES;

/**
 * Obtiene la lista de componentes e indicadores de la ficha JEC
 * Si recibe ft (fichaType de state), extrae dinámicamente sus secciones.
 * Caso contrario, usa la definición oficial de JEC_SECCIONES_OFICIALES.
 * @param {Object} [ft] - Definición de la ficha en el sistema
 * @returns {Array<Object>} Lista de 3 componentes con sus indicadores
 */
export function obtenerComponentesJec(ft = null) {
  let secciones = null;
  if (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0) {
    secciones = ft.secciones;
  }

  if (!secciones) {
    return JEC_SECCIONES_OFICIALES.map((sec, secIdx) => {
      const items = (sec.items || []).map((it, itIdx) => {
        const numVal = it.num !== undefined ? it.num : (itIdx + 1);
        return {
          id: it.id,
          numero: numVal,
          num: String(numVal).padStart(2, '0'),
          texto: it.texto || it.descripcion || '',
          tipo: 'si_no_na',
          aliasKeys: [it.id, `item_${numVal}`, String(numVal), String(itIdx + 1).padStart(2, '0')].filter(Boolean)
        };
      });

      return {
        id: sec.id,
        nombre: sec.nombre,
        color: sec.color || (secIdx === 0 ? 'emerald' : (secIdx === 1 ? 'purple' : 'amber')),
        items
      };
    });
  }

  return secciones.map((sec, secIdx) => {
    const items = (sec.items || []).map((it, itIdx) => {
      const numVal = it.numero !== undefined ? it.numero : (itIdx + 1);
      return {
        id: it.id || `jec_${secIdx + 1}_${itIdx + 1}`,
        numero: numVal,
        num: String(numVal).padStart(2, '0'),
        texto: it.texto || it.descripcion || '',
        tipo: it.tipo || sec.tipoRespuesta || 'si_no_na',
        aliasKeys: [it.id, `item_${numVal}`, String(numVal), String(itIdx + 1).padStart(2, '0')].filter(Boolean)
      };
    });

    return {
      id: sec.id || `sec_${secIdx + 1}`,
      nombre: sec.nombre || `COMPONENTE 0${secIdx + 1}`,
      color: sec.color || (secIdx === 0 ? 'emerald' : (secIdx === 1 ? 'purple' : 'amber')),
      items
    };
  });
}

/**
 * Asigna columnas Excel (1-indexadas y letras) a los componentes e indicadores de JEC.
 * El mapeo comienza inmediatamente despuÃ©s de la columna separadora gris W (columna 23):
 * - Col 24 (X) a 32 (AF): Componente PedagÃ³gico (9 indicadores)
 * - Col 33 (AG): % CUMPLIMIENTO PedagÃ³gico
 * - Col 34 (AH) a 44 (AR): Componente de GestiÃ³n (11 indicadores)
 * - Col 45 (AS): % CUMPLIMIENTO GestiÃ³n
 * - Col 46 (AT) a 56 (BD): Componente de Soporte (11 indicadores)
 * - Col 57 (BE): % CUMPLIMIENTO Soporte
 * - Col 58 (BF): OBSERVACIONES / RECOMENDACIONES
 * - Col 59 (BG): COMPROMISO
 * - Col 60 (BH): % Cumplimiento General por IIEE
 * - Col 61 (BI): Nivel de ImplementaciÃ³n por IIEE
 * - Cols 62 a 65 (BJ:BM): Separadores vacÃ­os
 * - Cols 66 a 68 (BN:BP): Cuadro RESULTADO y Cuadro CUMPLIMIENTO POR COMPONENTE
 */
export function generarItemsConColumnasJec(componentes) {
  let currCol = 24; // Col X
  const items = [];
  componentes.forEach((comp, compIdx) => {
    comp.startCol = currCol;
    comp.startColLetra = colToLetter(currCol);
    comp.items.forEach(it => {
      const itCol = currCol;
      const colLetra = colToLetter(itCol);
      const enriched = {
        ...it,
        colIndex: itCol,
        colLetra: colLetra,
        aspectoIndex: compIdx,
        aspectoNombre: comp.nombre
      };
      items.push(enriched);
      currCol++;
    });
    comp.endCol = currCol - 1;
    comp.endColLetra = colToLetter(currCol - 1);
    comp.pctCol = currCol;
    comp.pctColLetra = colToLetter(currCol);
    currCol++; // Avanzar para la columna % CUMPLIMIENTO del componente
  });

  return { items, finalCol: currCol };
}

/**
 * 31 indicadores oficiales de la Ficha A JEC en el sistema
 */
export const ITEMS_MODELO_JEC = generarItemsConColumnasJec(obtenerComponentesJec()).items;

/**
 * Tabla explÃ­cita de mapeo de las columnas oficiales de la Matriz JEC
 * Permite verificar y documentar columna Excel â†” clave guardada en ficha
 */
export const MAPEO_COLUMNAS_JEC = ITEMS_MODELO_JEC.map(it => ({
  columna: it.colLetra,
  num: it.num,
  id: it.id,
  aspectoNombre: it.aspectoNombre,
  tipo: it.tipo,
  aliasKeys: it.aliasKeys,
  texto: it.texto
}));

/**
 * 21 ítems oficiales de la Ficha B:
 * Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)
 * (Coinciden exactamente con la definición del sistema en seed-fichaTypes.json)
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

/**
 * Ítems oficiales de la Ficha C:
 * Ficha de Monitoreo a las funciones que cumple el/la Coordinador(a) Pedagógico
 * Estructura de 5 aspectos según el Modelo JEC (RVM N° 326-2019-MINEDU)
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

  // 2. Acompañamiento y monitoreo a la práctica pedagógica en aula (6 ítems)
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
  {
    id: 'cp_9',
    num: '09',
    aspectoIndex: 1,
    aspectoNombre: 'Acompañamiento y monitoreo a la práctica pedagógica en aula',
    tipo: 'escala_1_3',
    texto: 'Sistematiza oportunamente la información de las visitas de aula y reporta en las plataformas institucionales (SIMON u otras)'
  },

  // 3. Trabajo colegiado y fortalecimiento de competencias docentes (4 ítems)
  {
    id: 'cp_10',
    num: '10',
    aspectoIndex: 2,
    aspectoNombre: 'Trabajo colegiado y fortalecimiento de competencias docentes',
    tipo: 'escala_1_3',
    texto: 'Cuenta con su matriz de necesidades formativas de los docentes a cargo a partir del diagnóstico y visitas de aula'
  },
  {
    id: 'cp_11',
    num: '11',
    aspectoIndex: 2,
    aspectoNombre: 'Trabajo colegiado y fortalecimiento de competencias docentes',
    tipo: 'escala_1_3',
    texto: 'Planifica y conduce las Reuniones de Trabajo Colegiado (RTC) pedagógico semanales respondiendo a las necesidades formativas'
  },
  {
    id: 'cp_12',
    num: '12',
    aspectoIndex: 2,
    aspectoNombre: 'Trabajo colegiado y fortalecimiento de competencias docentes',
    tipo: 'escala_1_3',
    texto: 'Desarrolla acciones formativas (talleres, grupos de interaprendizaje, modelados) para fortalecer las competencias pedagógicas'
  },
  {
    id: 'cp_13',
    num: '13',
    aspectoIndex: 2,
    aspectoNombre: 'Trabajo colegiado y fortalecimiento de competencias docentes',
    tipo: 'escala_1_3',
    texto: 'Registra los acuerdos y compromisos asumidos en las actas de trabajo colegiado y monitorea su cumplimiento'
  },

  // 4. Evaluación de los aprendizajes y uso de recursos educativos (4 ítems)
  {
    id: 'cp_14',
    num: '14',
    aspectoIndex: 3,
    aspectoNombre: 'Evaluación de los aprendizajes y uso de recursos educativos',
    tipo: 'escala_1_3',
    texto: 'Orienta a los docentes en la aplicación de la evaluación formativa y el análisis reflexivo de los resultados de aprendizaje'
  },
  {
    id: 'cp_15',
    num: '15',
    aspectoIndex: 3,
    aspectoNombre: 'Evaluación de los aprendizajes y uso de recursos educativos',
    tipo: 'escala_1_3',
    texto: 'Acompaña la implementación de estrategias diferenciadas y el refuerzo escolar a partir de los resultados diagnósticos y de proceso'
  },
  {
    id: 'cp_16',
    num: '16',
    aspectoIndex: 3,
    aspectoNombre: 'Evaluación de los aprendizajes y uso de recursos educativos',
    tipo: 'escala_1_3',
    texto: 'Promueve el uso pedagógico de materiales educativos, textos escolares y recursos tecnológicos en las áreas a su cargo'
  },
  {
    id: 'cp_17',
    num: '17',
    aspectoIndex: 3,
    aspectoNombre: 'Evaluación de los aprendizajes y uso de recursos educativos',
    tipo: 'escala_1_3',
    texto: 'Coordina con el CIST y el equipo de soporte técnico la integración de las TIC en el desarrollo de las sesiones de aprendizaje'
  },

  // 5. Coordinación con el equipo directivo e informes (4 ítems)
  {
    id: 'cp_18',
    num: '18',
    aspectoIndex: 4,
    aspectoNombre: 'Coordinación con el equipo directivo e informes',
    tipo: 'escala_1_3',
    texto: 'Participa activamente en las reuniones semanales de coordinación con el director, subdirectores y demás coordinadores'
  },
  {
    id: 'cp_19',
    num: '19',
    aspectoIndex: 4,
    aspectoNombre: 'Coordinación con el equipo directivo e informes',
    tipo: 'escala_1_3',
    texto: 'Presenta al equipo directivo informes periódicos sobre los avances, dificultades y logros del acompañamiento pedagógico'
  },
  {
    id: 'cp_20',
    num: '20',
    aspectoIndex: 4,
    aspectoNombre: 'Coordinación con el equipo directivo e informes',
    tipo: 'escala_1_3',
    texto: 'Socializa con la comunidad educativa los resultados del monitoreo pedagógico y propone acciones conjuntas de mejora'
  },
  {
    id: 'cp_21',
    num: '21',
    aspectoIndex: 4,
    aspectoNombre: 'Coordinación con el equipo directivo e informes',
    tipo: 'escala_1_3',
    texto: 'Participa y replica las acciones de fortalecimiento organizadas por la UGEL, DRELM o MINEDU'
  }
];

/**
 * Genera la configuración completa para una ficha según su tipo o plantilla dinámica
 * @param {Object} ft - Definición de la ficha en el sistema (state.fichaTypes) o submission
 * @param {Object} [state] - Estado global de la app
 * @returns {Object} Configuración para el generador Excel
 */
export function getMatrizConfig(ft, state = null) {
  if (isFichaJec(ft, state)) {
    const componentes = obtenerComponentesJec(ft);
    const { items } = generarItemsConColumnasJec(componentes);
    return {
      sheetName: 'MODELO JEC',
      tituloDocumento: 'MATRIZ DE SEGUIMIENTO 2026 — MODELO JEC',
      tipoFicha: 'A',
      esJecReal: true,
      componentes: componentes,
      limites: LIMITES_NIVEL_FICHAS.MODELO_JEC,
      items: items,
      datosGeneralesCampos: [
        { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
        { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
        { key: 'ugel', header: 'UGEL', width: 9.0, isText: true },
        { key: 'red', header: 'RED', width: 8.6, isText: true },
        { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
        { key: 'secciones', header: 'SECCIONES', width: 6.7 },
        { key: 'estudiantes', header: 'Cantidad de estudiantes', width: 6.7 },
        { key: 'docentes', header: 'Cantidad de docentes', width: 6.7 },
        { key: 'formacionTecnica', header: 'IE implementa el modelo de Servicio Educativo Secundaria con Formación Técnica', width: 6.7, isSiNo: true },
        { key: 'cantidadCp', header: 'Cantidad de C.P', width: 6.7 },
        { key: 'cantidadCt', header: 'Cantidad de C.T', width: 6.7 }
      ],
      bloquesPersonas: [
        {
          titulo: 'II. DATOS DEL DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona1Header,
          fillSubheader: PALETA_MATRIZ.persona1Subheader,
          fillData: PALETA_MATRIZ.persona1Data,
          campos: [
            { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
            { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
            { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'dirCondicion', header: 'Condición', width: 12.1 },
            { key: 'dirCorreo', header: 'Correo', width: 26.7 }
          ]
        },
        {
          titulo: 'III. DATOS DEL SUB DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona2Header,
          fillSubheader: PALETA_MATRIZ.persona2Subheader,
          fillData: PALETA_MATRIZ.persona2Data,
          campos: [
            { key: 'subNombre', header: 'Nombres y Apellidos', width: 26.7 },
            { key: 'subDni', header: 'DNI', width: 11.3, isText: true },
            { key: 'subTelefono', header: 'Teléfono', width: 12.4, isText: true },
            { key: 'subCondicion', header: 'Condición', width: 12.0 },
            { key: 'subCorreo', header: 'Correo', width: 18.1 }
          ]
        }
      ]
    };
  }

  // B) Coordinador(a) de Tutoría JEC
  if (isFichaCoordTutoriaJec(ft, state)) {
    // Si la ficha en state tiene secciones e ítems propios, usar los de la ficha
    const items = (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0)
      ? _extraerItemsDeSecciones(ft.secciones)
      : ITEMS_COORD_TUTORIA_JEC;

    return {
      sheetName: 'COORD. TUTORIA JEC',
      tituloDocumento: 'MATRIZ DE SEGUIMIENTO 2026 — COORDINADOR(A) DE TUTORÍA (JEC)',
      tipoFicha: 'B',
      limites: (ft && ft.regla_nivel && ft.regla_nivel.rangos)
        ? _calcularLimitesDesdeRangos(ft.regla_nivel, items.length)
        : LIMITES_NIVEL_FICHAS.COORD_TUTORIA_JEC,
      items: items,
      datosGeneralesCampos: [
        { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
        { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
        { key: 'ugel', header: 'UGEL', width: 9.0, isText: true },
        { key: 'red', header: 'RED', width: 10.0, isText: true },
        { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
        { key: 'visita', header: 'Visita', width: 8.0 },
        { key: 'docentesTutores', header: 'N° de docentes tutores a cargo', width: 12.0 }
      ],
      bloquesPersonas: [
        {
          titulo: 'II. DATOS DEL DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona1Header,
          fillSubheader: PALETA_MATRIZ.persona1Subheader,
          fillData: PALETA_MATRIZ.persona1Data,
          campos: [
            { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
            { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
            { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'dirCondicion', header: 'Condición', width: 12.1 },
            { key: 'dirCorreo', header: 'Correo', width: 26.7 }
          ]
        },
        {
          titulo: 'III. DATOS DEL COORDINADOR(A) DE TUTORÍA',
          fillHeader: PALETA_MATRIZ.persona2Header,
          fillSubheader: PALETA_MATRIZ.persona2Subheader,
          fillData: PALETA_MATRIZ.persona2Data,
          campos: [
            { key: 'coordTutoriaNombre', header: 'Nombres y Apellidos', width: 28.0 },
            { key: 'coordTutoriaDni', header: 'DNI', width: 11.5, isText: true },
            { key: 'coordTutoriaTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'coordTutoriaCondicion', header: 'Condición', width: 12.0 },
            { key: 'coordTutoriaCorreo', header: 'Correo', width: 22.0 }
          ]
        }
      ]
    };
  }

  // C) Coordinador(a) Pedagógico
  if (isFichaCoordPedagogico(ft, state)) {
    const items = (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0)
      ? _extraerItemsDeSecciones(ft.secciones)
      : ITEMS_COORD_PEDAGOGICO;

    return {
      sheetName: 'COORD. PEDAGOGICO',
      tituloDocumento: 'MATRIZ DE SEGUIMIENTO 2026 — COORDINADOR(A) PEDAGÓGICO',
      tipoFicha: 'C',
      limites: (ft && ft.regla_nivel && ft.regla_nivel.rangos)
        ? _calcularLimitesDesdeRangos(ft.regla_nivel, items.length)
        : LIMITES_NIVEL_FICHAS.COORD_PEDAGOGICO,
      items: items,
      datosGeneralesCampos: [
        { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
        { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
        { key: 'ugel', header: 'UGEL', width: 9.0, isText: true },
        { key: 'red', header: 'RED', width: 10.0, isText: true },
        { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
        { key: 'visita', header: 'Visita', width: 8.0 },
        { key: 'docentesACargo', header: 'N° de docentes a cargo', width: 12.0 }
      ],
      bloquesPersonas: [
        {
          titulo: 'II. DATOS DEL DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona1Header,
          fillSubheader: PALETA_MATRIZ.persona1Subheader,
          fillData: PALETA_MATRIZ.persona1Data,
          campos: [
            { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
            { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
            { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'dirCondicion', header: 'Condición', width: 12.1 },
            { key: 'dirCorreo', header: 'Correo', width: 26.7 }
          ]
        },
        {
          titulo: 'III. DATOS DEL COORDINADOR(A) PEDAGÓGICO',
          fillHeader: PALETA_MATRIZ.persona2Header,
          fillSubheader: PALETA_MATRIZ.persona2Subheader,
          fillData: PALETA_MATRIZ.persona2Data,
          campos: [
            { key: 'coordPedagNombre', header: 'Nombres y Apellidos', width: 28.0 },
            { key: 'coordPedagDni', header: 'DNI', width: 11.5, isText: true },
            { key: 'coordPedagTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'coordPedagCondicion', header: 'Condición', width: 12.0 },
            { key: 'coordPedagCorreo', header: 'Correo', width: 22.0 }
          ]
        }
      ]
    };
  }

  // Fallback genérico para cualquier otra ficha del sistema
  const sheetNameRaw = (ft && ft.nombre) ? ft.nombre.slice(0, 28) : 'MONITOREO';
  const cleanSheetName = sheetNameRaw.replace(/[:\\/?*\[\]]/g, '').trim().toUpperCase() || 'MONITOREO';
  const items = (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0)
    ? _extraerItemsDeSecciones(ft.secciones)
    : [];

  const maxPts = items.length * 3;
  return {
    sheetName: cleanSheetName,
    tituloDocumento: `MATRIZ DE SEGUIMIENTO 2026 — ${cleanSheetName}`,
    tipoFicha: 'GENERICA',
    limites: {
      max: maxPts,
      limInicio: Math.round(maxPts * 56 / 111),
      limProceso: Math.round(maxPts * 83 / 111)
    },
    items: items,
    datosGeneralesCampos: [
      { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
      { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
      { key: 'ugel', header: 'UGEL', width: 8.0, isText: true },
      { key: 'red', header: 'RED', width: 10.0, isText: true },
      { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
      { key: 'visita', header: 'Visita', width: 8.0 }
    ],
    bloquesPersonas: [
      {
        titulo: 'II. DATOS DEL DIRECTOR(A)',
        fillHeader: PALETA_MATRIZ.persona1Header,
        fillSubheader: PALETA_MATRIZ.persona1Subheader,
        fillData: PALETA_MATRIZ.persona1Data,
        campos: [
          { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
          { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
          { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
          { key: 'dirCondicion', header: 'Condición', width: 12.1 },
          { key: 'dirCorreo', header: 'Correo', width: 26.7 }
        ]
      }
    ]
  };
}

/**
 * Extrae ítems numerados a partir de las secciones de un fichaType
 */
function _extraerItemsDeSecciones(secciones) {
  const result = [];
  let itemCounter = 1;
  secciones.forEach((sec, secIdx) => {
    const secNombre = sec.nombre || `ASPECTO 0${secIdx + 1}`;
    (sec.items || []).forEach(it => {
      const numStr = itemCounter < 10 ? `0${itemCounter}` : String(itemCounter);
      result.push({
        id: it.id || `item_${itemCounter}`,
        num: numStr,
        aspectoIndex: secIdx,
        aspectoNombre: secNombre,
        tipo: it.tipo || sec.tipoRespuesta || 'escala_1_3',
        texto: it.texto || it.descripcion || ''
      });
      itemCounter++;
    });
  });
  return result;
}

/**
 * Calcula límites de puntaje si la regla_nivel define rangos
 */
function _calcularLimitesDesdeRangos(reglaNivel, totalItems) {
  const max = reglaNivel.maxPuntaje || (totalItems * 3);
  const rangos = reglaNivel.rangos || [];
  const rIni = rangos.find(r => (r.nivel || '').toLowerCase().includes('inicio') || (r.nivel || '').toLowerCase().includes('no cumple'));
  const rProc = rangos.find(r => (r.nivel || '').toLowerCase().includes('proceso') || (r.nivel || '').toLowerCase().includes('parcial'));

  return {
    max: max,
    limInicio: rIni ? rIni.max : Math.round(max * 56 / 111),
    limProceso: rProc ? rProc.max : Math.round(max * 83 / 111)
  };
}

