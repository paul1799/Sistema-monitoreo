/**
 * public/js/matriz/items-jec.js
 * Indicadores oficiales, componentes y mapeo de columnas de la Ficha Modelo JEC
 * UGEL 03 · AGEBRE
 */

import { colToLetter } from './estilos.js';

/**
 * 31 indicadores oficiales del instrumento MSE JEC distribuidos en 3 componentes
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
 * El mapeo comienza inmediatamente después de la columna separadora gris W (columna 23):
 * - Col 24 (X) a 32 (AF): Componente Pedagógico (9 indicadores)
 * - Col 33 (AG): % CUMPLIMIENTO Pedagógico
 * - Col 34 (AH) a 44 (AR): Componente de Gestión (11 indicadores)
 * - Col 45 (AS): % CUMPLIMIENTO Gestión
 * - Col 46 (AT) a 56 (BD): Componente de Soporte (11 indicadores)
 * - Col 57 (BE): % CUMPLIMIENTO Soporte
 * - Col 58 (BF): OBSERVACIONES / RECOMENDACIONES
 * - Col 59 (BG): COMPROMISO
 * - Col 60 (BH): % Cumplimiento General por IIEE
 * - Col 61 (BI): Nivel de Implementación por IIEE
 * - Cols 62 a 65 (BJ:BM): Separadores vacíos
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
 * Tabla explícita de mapeo de las columnas oficiales de la Matriz JEC
 * Permite verificar y documentar columna Excel <-> clave guardada en ficha
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
