/* =========================================================================
   jec-1er-monitoreo.js — Ficha del 1er Monitoreo y Asistencia Técnica
   a la Implementación del Modelo de Servicio Educativo JEC
   Normativa: RVM N°326-2019-MINEDU / RM N°501-2025-MINEDU
   UGEL 03 · AGEBRE · 2026
   ========================================================================= */

import { esc, normalizeText, showToast, genId, fmtDate as formatDate, todayStr } from './ui/core-utils.js?v=20261015_v1';
import { getDirectivosActivosForColegio, syncDirectivosFromFicha } from './directorio.js?v=20261013_v1';
import { REGLA_NIVEL_JEC_1ER_MOMENTO, getNivelJec1erMomento, ESPECIALISTA_JEC_OFICIAL } from './calcEngine.js?v=20261016_v2';
import { renderJecVisitaSelectorHtml } from './jec-monitoreo.js';

export { REGLA_NIVEL_JEC_1ER_MOMENTO, getNivelJec1erMomento, ESPECIALISTA_JEC_OFICIAL };

/**
 * 01 ASPECTO: CONDICIONES (7 ítems de verificación inicial - Evaluación Sí / No)
 */
export const JEC_1ER_CONDICIONES_ITEMS = [
  {
    id: 'c1',
    num: 1,
    col: 'W',
    texto: 'La IE desarrolla diariamente una jornada presencial de 9 horas pedagógicas y duración de la hora pedagógica de 45 minutos.'
  },
  {
    id: 'c2',
    num: 2,
    col: 'X',
    texto: 'A la fecha de visita, la IE cuenta con la totalidad de docentes.'
  },
  {
    id: 'c3',
    num: 3,
    col: 'Y',
    texto: 'A la fecha de visita, la IE cuenta con la totalidad de personal CAS, que le corresponden según la normatividad vigente (Vigilante, personal de mantenimiento, CIST y Psicólogo).'
  },
  {
    id: 'c4',
    num: 4,
    col: 'Z',
    texto: 'Se implementaron las condiciones de los talleres para las especialidades que oferta y utilizan módulos del MINEDU si se respondió SI al inicio al SMFT.'
  },
  {
    id: 'c5',
    num: 5,
    col: 'AA',
    texto: 'Los horarios de los docentes se encuentran organizados para el desarrollo del trabajo colegiado y las reuniones se desarrollan de acuerdo a lo planificado.'
  },
  {
    id: 'c6',
    num: 6,
    col: 'AB',
    texto: 'En la IE se han destinado espacios limpios y adecuados para que los estudiantes consuman los alimentos y otros.'
  },
  {
    id: 'c7',
    num: 7,
    col: 'AC',
    texto: 'La comunidad educativa se encuentra organizada para acompañar a los estudiantes durante el refrigerio escolar asignando responsabilidades a los diferentes actores, quienes las cumplen.'
  }
];

/**
 * 4 ASPECTOS DE EVALUACIÓN CON PUNTAJE (37 ítems en total - Escala 1, 2, 3, NA - Máx 111 pts)
 */
export const JEC_1ER_SECCIONES_PUNTAJE = [
  {
    id: 'sec_aspecto_02',
    aspectoNum: '02',
    nombre: 'ASPECTO 02: P3 INSTITUCIONES EDUCATIVAS QUE ASEGURAN EL BUEN VIVIR - Componente Pedagógico: Implementación TOECE',
    items: [
      {
        id: 'it_01',
        num: 1,
        col: 'AE',
        texto: 'La IE cuenta con un Plan de Tutoría, Orientación Educativa y Convivencia Escolar (TOECE) actualizado. Formulado a partir de la identificación de necesidades de los estudiantes y realizan reportes periódicos de las actividades planificadas en el Plan TOECE.'
      },
      {
        id: 'it_02',
        num: 2,
        col: 'AF',
        texto: 'Se han planificado actividades orientadas a la Promoción Activa de la Participación Estudiantil (municipio escolar, "Somos Pares", club de ciencias, club de ajedrez, club deportivo activos u otros).'
      },
      {
        id: 'it_03',
        num: 3,
        col: 'AG',
        texto: 'La IE implementa espacios de diálogo y debate entre estudiantes sobre todo aquello que influye en una formación integral. (Asuntos públicos: problemas específicos de la vida en la escuela, aprendizajes, etc.).'
      },
      {
        id: 'it_04',
        num: 4,
        col: 'AH',
        texto: 'Se han desarrollado actividades orientadas a involucrar a las familias con la labor de la escuela, a nivel del aula e IE. (Escuela de padres, talleres para familias, asambleas de aula) y estas forman parte del Plan TOECE.'
      },
      {
        id: 'it_05',
        num: 5,
        col: 'AI',
        texto: 'Los docentes tutores implementan la tutoría individual y grupal, reportando periódicamente al coordinador de tutoría y/o director de la IE.'
      },
      {
        id: 'it_06',
        num: 6,
        col: 'AJ',
        texto: 'La IE cuenta con su directorio de aliados para la prevención de situaciones de riesgo, para la promoción de una sana convivencia.'
      },
      {
        id: 'it_07',
        num: 7,
        col: 'AK',
        texto: 'En la IE se han implementado normas de convivencia y medidas correctivas, las mismas que han sido difundidas entre los miembros de la comunidad educativa.'
      },
      {
        id: 'it_08',
        num: 8,
        col: 'AL',
        texto: 'La IE ha socializado los protocolos para atender los casos de violencia escolar. (Protocolo de atención RM 383-2025) y estos son registrados y reportados, en la plataforma de SISEVE.'
      },
      {
        id: 'it_09',
        num: 9,
        col: 'AM',
        texto: 'La IE ha previsto la aplicación del Kit de Bienestar Socioemocional a los estudiantes para la toma de decisiones y se ha reportado al Mundo IE.'
      },
      {
        id: 'it_10',
        num: 10,
        col: 'AN',
        texto: 'Los directivos, convocan reunión de trabajo para analizar reportes de convivencia, casos de tutoría y necesidades socioemocionales de los estudiantes.'
      }
    ]
  },
  {
    id: 'sec_aspecto_03',
    aspectoNum: '03',
    nombre: 'ASPECTO 03: P1 INSTITUCIONES EDUCATIVAS QUE ASEGURAN APRENDIZAJES - Componente Pedagógico y Componente de Gestión: Organización',
    items: [
      {
        id: 'it_11',
        num: 11,
        col: 'AP',
        texto: 'Ha establecido las metas de logros de aprendizaje para el año 2026 y están incorporadas en los documentos de planificación curricular.'
      },
      {
        id: 'it_12',
        num: 12,
        col: 'AQ',
        texto: 'El directivo sistematiza la información obtenida a partir del monitoreo de la práctica pedagógica (inicio, proceso y salida) identificando logros y necesidades formativas, socializa con los docentes en reuniones colegiadas para proponer acciones de mejora y ejecuta acciones formativas. Porcentaje de avance del monitoreo de inicio: ___%.'
      },
      {
        id: 'it_13',
        num: 13,
        col: 'AR',
        texto: 'La IE cuenta con el (PEAI) y RD de conformación de las Brigadas de Educación Ambiental y Gestión de Riesgo de Desastres, además de monitorear el cumplimiento de sus funciones y realizar el seguimiento de las actividades propuestas en el plan de trabajo.'
      },
      {
        id: 'it_14',
        num: 14,
        col: 'AS',
        texto: 'Se cuenta con Plan Lector aprobado con RD y en el PAT y considera las etapas de la muestra la implementación según cronograma.'
      },
      {
        id: 'it_15',
        num: 15,
        col: 'AT',
        texto: 'El directivo ha identificado e implementado buenas prácticas (pedagógica y/o gestión) y/o Proyecto(s) de Innovación en la IE y los ha incluido en el PAT. Además, presenta evidencias de los avances o resultados de la implementación.'
      },
      {
        id: 'it_16',
        num: 16,
        col: 'AU',
        texto: 'El directivo sistematiza, analiza y reflexiona sobre los resultados de aprendizaje de la evaluación diagnóstica por competencias, a fin de proponer acciones de mejora con la comunidad educativa.'
      },
      {
        id: 'it_17',
        num: 17,
        col: 'AV',
        texto: 'El equipo directivo y Coordinador pedagógico, revisan y retroalimentan la planificación del refuerzo escolar para asegurar que incluya acciones de atención diferenciada según las necesidades de los estudiantes. Monitorean y acompañan a la implementación de R. E, en cada etapa.'
      },
      {
        id: 'it_18',
        num: 18,
        col: 'AW',
        texto: 'Promueve el uso de espacios educativos de la I.E así como el empleo de materiales educativos diversos generando mejores condiciones para los aprendizajes (laboratorios, talleres, bibliotecas, aulas flexibles, AIP, entre otros).'
      },
      {
        id: 'it_19',
        num: 19,
        col: 'AX',
        texto: 'El director y subdirectores realizan el monitoreo y acompañamiento a las funciones del coordinador pedagógico, coordinador de tutoría y revisan conjuntamente con los coordinadores los registros de visita aula. Así como realizan reuniones de orientación al CIST y Psicólogo.'
      },
      {
        id: 'it_20',
        num: 20,
        col: 'AY',
        texto: 'El equipo directivo y los coordinadores se reúnen semanalmente para evaluar el desarrollo de las actividades educativas y para consensuar pautas de trabajo común, establecen acuerdos para la mejora de la IE.'
      },
      {
        id: 'it_21',
        num: 21,
        col: 'AZ',
        texto: 'Monitorea las horas complementarias: Trabajo curricular del área curricular, colegiado de tutoría, atención a estudiantes y de familias, elaboración/ reajuste de materiales educativos, retroalimentación escrita, investigación para la mejora de la práctica.'
      },
      {
        id: 'it_22',
        num: 22,
        col: 'BA',
        texto: 'El equipo directivo y coordinadores han participado en las acciones formativas que organiza la UGEL, DRELM o MINEDU para fortalecer sus competencias profesionales y se realiza replicas.'
      }
    ]
  },
  {
    id: 'sec_aspecto_04',
    aspectoNum: '04',
    nombre: 'ASPECTO 04: P1 INSTITUCIONES EDUCATIVAS QUE ASEGURAN APRENDIZAJES - Componente de Soporte: Acompañamiento Interno',
    items: [
      {
        id: 'it_23',
        num: 23,
        col: 'BC',
        texto: 'El coordinador pedagógico realizó la sensibilización al equipo docente a cargo, así como el monitoreo diagnóstico al docente, sistematiza los resultados (informe para el reporte en el SIMON dentro del plazo indicado) Porcentaje de avance del monitoreo de diagnóstico: _____%'
      },
      {
        id: 'it_24',
        num: 24,
        col: 'BD',
        texto: 'El coordinador pedagógico cuenta con su plan de acompañamiento y matriz de necesidades formativas sobre la práctica pedagógica.'
      },
      {
        id: 'it_25',
        num: 25,
        col: 'BE',
        texto: 'El Coordinador Pedagógico (CP) desarrolla acciones formativas (talleres, debate, webinar, sensibilización entre otros) en las reuniones de trabajo colegiado (RTC) u otros espacios.'
      },
      {
        id: 'it_26',
        num: 26,
        col: 'BF',
        texto: 'Las reuniones de Trabajo Colegiado pedagógico se realizan semanalmente, definiendo el propósito pedagógico, las estrategias de trabajo y los recursos necesarios, logrando establecer acuerdos para la mejora de los aprendizajes de los estudiantes.'
      },
      {
        id: 'it_27',
        num: 27,
        col: 'BG',
        texto: 'El coordinador de Tutoría (CT) realiza la sensibilización al equipo de docente, así como el monitoreo diagnostico a los docentes tutores, sistematiza los resultados y realiza el análisis conjuntamente con los directivos (para el reporte del SIMON dentro de las fechas indicadas).'
      },
      {
        id: 'it_28',
        num: 28,
        col: 'BH',
        texto: 'El coordinador de Tutoría (CT) cuenta con su plan de acompañamiento y matriz de necesidades formativas sobre la practica pedagógica.'
      },
      {
        id: 'it_29',
        num: 29,
        col: 'BI',
        texto: 'El Coordinador de Tutoría (CT) desarrolla acciones formativas (talleres, debate, webinar, sensibilización entre otros) en las reuniones de trabajo colegiado u otros espacios.'
      },
      {
        id: 'it_30',
        num: 30,
        col: 'BJ',
        texto: 'Las reuniones de trabajo Colegiado en tutoría se realizan semanalmente, estableciendo compromisos para la mejora de la convivencia y de los aprendizajes de los estudiantes.'
      }
    ]
  },
  {
    id: 'sec_aspecto_05',
    aspectoNum: '05',
    nombre: 'ASPECTO 05: P1 INSTITUCIONES EDUCATIVAS QUE ASEGURAN APRENDIZAJES - Componente Gestión del Personal de Apoyo',
    items: [
      {
        id: 'it_31',
        num: 31,
        col: 'BL',
        texto: 'El psicólogo formaliza alianzas con instituciones y actores clave de la comunidad para mejorar la atención a los problemas de los estudiantes en la escuela.'
      },
      {
        id: 'it_32',
        num: 32,
        col: 'BM',
        texto: 'El psicólogo(a) cuenta con un plan de trabajo alineado al diagnóstico institucional y desarrolla actividades formativas (talleres, charlas, sensibilización y otros).'
      },
      {
        id: 'it_33',
        num: 33,
        col: 'BN',
        texto: 'El psicólogo(a) sostiene reuniones con madres y/o padres de familia para brindarles orientación y apoyo.'
      },
      {
        id: 'it_34',
        num: 34,
        col: 'BO',
        texto: 'El psicólogo(a) asesora, orienta, sensibiliza y promueve la implementación de la TOE, de acuerdo con el plan de trabajo elaborado y reporta las actividades realizadas.'
      },
      {
        id: 'it_35',
        num: 35,
        col: 'BP',
        texto: 'El CIST cuenta con inventario y realiza acciones orientadas a dar soporte y mantenimiento a los equipos tecnológicos (Plataformas educativas, laptop, PC, proyectores multimedia, Otros) de la IE, siguiendo el plan de trabajo elaborado y cumple con reportarlas.'
      },
      {
        id: 'it_36',
        num: 36,
        col: 'BQ',
        texto: 'El Coordinador de Innovación y Soporte Tecnológico (CIST) fortalece las competencias digitales de la comunidad educativa y registra el uso de los recursos educativos utilizados por los docentes.'
      },
      {
        id: 'it_37',
        num: 37,
        col: 'BR',
        texto: 'El CIST acondiciona el laboratorio de inglés y lleva control del uso del mismo por los docentes del área de Inglés.'
      }
    ]
  }
];

/**
 * Catálogo canónico completo de 5 secciones para plantillas-base y exportadores
 */
export const JEC_1ER_SECCIONES = [
  {
    id: 'sec_condiciones',
    nombre: '01 ASPECTO: CONDICIONES',
    tipo: 'si_no',
    items: JEC_1ER_CONDICIONES_ITEMS.map(c => ({
      id: c.id,
      texto: c.texto,
      col: c.col
    }))
  },
  ...JEC_1ER_SECCIONES_PUNTAJE.map(sec => ({
    id: sec.id,
    nombre: sec.nombre,
    tipo: 'escala1_3',
    items: sec.items.map(it => ({
      id: it.id,
      texto: it.texto,
      col: it.col
    }))
  }))
];

/**
 * Estado interno en memoria del formulario 1er Momento JEC
 */
export let jec1erState = {
  colegioId: null,
  colegioNombre: '',
  codModular: '',
  ugel: '03',
  red: '',
  fecha: todayStr(),
  secciones: '',
  estudiantes: '',
  docentes: '',
  secundariaTecnica: 'NO',

  director: {
    nombres: '',
    dni: '',
    telefono: '',
    condicion: 'DESIGNADO',
    correo: ''
  },

  subdirectores: [],
  coordPedag: [],
  coordTutoria: [],

  condiciones: {},
  condicionesHallazgos: {},

  puntajes: {},
  puntajesHallazgos: {},

  recomendaciones: '',
  compromisos: [
    { aspectoCritico: '', accionMejora: '', cronograma: '' }
  ]
};

/**
 * Reinicia el estado a limpio
 */
export function resetJec1erFormState() {
  jec1erState = {
    colegioId: null,
    colegioNombre: '',
    codModular: '',
    ugel: '03',
    red: '',
    fecha: todayStr(),
    secciones: '',
    estudiantes: '',
    docentes: '',
    secundariaTecnica: 'NO',

    director: {
      nombres: '',
      dni: '',
      telefono: '',
      condicion: 'DESIGNADO',
      correo: ''
    },

    subdirectores: [],
    coordPedag: [],
    coordTutoria: [],

    condiciones: {},
    condicionesHallazgos: {},

    puntajes: {},
    puntajesHallazgos: {},

    recomendaciones: '',
    compromisos: [
      { aspectoCritico: '', accionMejora: '', cronograma: '' }
    ]
  };
}

/**
 * Precarga el estado a partir de un envío existente
 */
export function preloadJec1erFormState(submission, ft) {
  if (!submission) return;
  resetJec1erFormState();

  const d = submission;
  jec1erState.colegioId = d.colegioId || null;
  jec1erState.colegioNombre = d.colegioNombre || d.ie || '';
  jec1erState.codModular = d.codModular || d.codigoModular || '';
  jec1erState.ugel = d.ugel || '03';
  jec1erState.red = d.red || '';
  jec1erState.fecha = d.fecha || todayStr();
  jec1erState.secciones = d.secciones || d.cantSecciones || '';
  jec1erState.estudiantes = d.estudiantes || d.cantEstudiantes || '';
  jec1erState.docentes = d.docentes || d.cantDocentes || '';
  jec1erState.secundariaTecnica = d.secundariaTecnica || 'NO';

  if (d.director) {
    jec1erState.director = {
      nombres: d.director.nombres || '',
      dni: d.director.dni || '',
      telefono: d.director.telefono || '',
      condicion: d.director.condicion || 'DESIGNADO',
      correo: d.director.correo || ''
    };
  }

  if (Array.isArray(d.subdirectores) && d.subdirectores.length > 0) {
    jec1erState.subdirectores = d.subdirectores.map(s => ({ ...s }));
  }

  if (Array.isArray(d.coordinadoresPedagogicos) && d.coordinadoresPedagogicos.length > 0) {
    jec1erState.coordPedag = d.coordinadoresPedagogicos.map(c => ({ ...c }));
  }

  if (Array.isArray(d.coordinadoresTutoria) && d.coordinadoresTutoria.length > 0) {
    jec1erState.coordTutoria = d.coordinadoresTutoria.map(c => ({ ...c }));
  }

  // Respuestas condiciones Sí / No
  if (d.respuestasCondiciones && typeof d.respuestasCondiciones === 'object') {
    Object.keys(d.respuestasCondiciones).forEach(k => {
      const v = d.respuestasCondiciones[k];
      if (typeof v === 'object' && v !== null) {
        jec1erState.condiciones[k] = v.valor || '';
        jec1erState.condicionesHallazgos[k] = v.hallazgo || '';
      } else {
        jec1erState.condiciones[k] = v;
      }
    });
  }

  // Respuestas puntajes 1, 2, 3, NA
  if (d.respuestas && typeof d.respuestas === 'object') {
    Object.keys(d.respuestas).forEach(k => {
      const v = d.respuestas[k];
      if (typeof v === 'object' && v !== null) {
        jec1erState.puntajes[k] = v.valor;
        jec1erState.puntajesHallazgos[k] = v.hallazgo || '';
      } else {
        jec1erState.puntajes[k] = v;
      }
    });
  } else if (Array.isArray(d.respuestas)) {
    d.respuestas.forEach(r => {
      if (r && r.id) {
        if (r.id.startsWith('c')) {
          jec1erState.condiciones[r.id] = r.valor;
          if (r.hallazgo) jec1erState.condicionesHallazgos[r.id] = r.hallazgo;
        } else {
          jec1erState.puntajes[r.id] = r.valor;
          if (r.hallazgo) jec1erState.puntajesHallazgos[r.id] = r.hallazgo;
        }
      }
    });
  }

  if (d.recomendaciones) {
    jec1erState.recomendaciones = d.recomendaciones;
  }

  if (Array.isArray(d.compromisos) && d.compromisos.length > 0) {
    jec1erState.compromisos = d.compromisos.map(c => ({ ...c }));
  }
}

/**
 * Calcula en tiempo real subtotales, puntaje total y nivel obtenido
 */
export function calculateJec1erScore() {
  const subtotales = {
    aspecto2: 0,
    aspecto3: 0,
    aspecto4: 0,
    aspecto5: 0
  };

  let totalItemsRespondidos = 0;

  JEC_1ER_SECCIONES_PUNTAJE.forEach(sec => {
    let sub = 0;
    sec.items.forEach(it => {
      const val = jec1erState.puntajes[it.id];
      if (val === 1 || val === 2 || val === 3 || val === '1' || val === '2' || val === '3') {
        sub += parseInt(val, 10);
        totalItemsRespondidos++;
      }
    });

    if (sec.id === 'sec_aspecto_02') subtotales.aspecto2 = sub;
    else if (sec.id === 'sec_aspecto_03') subtotales.aspecto3 = sub;
    else if (sec.id === 'sec_aspecto_04') subtotales.aspecto4 = sub;
    else if (sec.id === 'sec_aspecto_05') subtotales.aspecto5 = sub;
  });

  const puntajeTotal = subtotales.aspecto2 + subtotales.aspecto3 + subtotales.aspecto4 + subtotales.aspecto5;
  const nivelInfo = getNivelJec1erMomento(puntajeTotal);

  let condSi = 0;
  let condNo = 0;
  JEC_1ER_CONDICIONES_ITEMS.forEach(c => {
    const v = String(jec1erState.condiciones[c.id] || '').toUpperCase();
    if (v === 'SI') condSi++;
    else if (v === 'NO') condNo++;
  });

  return {
    subtotales,
    puntajeTotal,
    maxPuntos: 111,
    totalItemsRespondidos,
    totalItems: 37,
    nivelInfo,
    condSi,
    condNo,
    totalCondiciones: 7
  };
}

/**
 * Genera el HTML de las filas de subdirectores
 */
export function renderSubdirectoresRowsHtml(subs = []) {
  if (!subs || subs.length === 0) {
    return `
      <tr data-sub-idx="0">
        <td><input type="text" class="jec1-sub-nombres" placeholder="Apellidos y nombres completos"></td>
        <td><input type="text" class="jec1-sub-dni" placeholder="DNI (8 dígitos)" maxlength="8"></td>
        <td><input type="text" class="jec1-sub-tel" placeholder="Celular"></td>
        <td>
          <select class="jec1-sub-cond">
            <option value="DESIGNADO" selected>DESIGNADO</option>
            <option value="ENCARGADO">ENCARGADO</option>
          </select>
        </td>
        <td><input type="email" class="jec1-sub-correo" placeholder="correo@ejemplo.com"></td>
        <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-sub" title="Eliminar subdirector">🗑️</button></td>
      </tr>
    `;
  }
  return subs.map((s, idx) => `
    <tr data-sub-idx="${idx}">
      <td><input type="text" class="jec1-sub-nombres" value="${esc(s.nombres || '')}" placeholder="Apellidos y nombres completos"></td>
      <td><input type="text" class="jec1-sub-dni" value="${esc(s.dni || '')}" placeholder="DNI (8 dígitos)" maxlength="8"></td>
      <td><input type="text" class="jec1-sub-tel" value="${esc(s.telefono || '')}" placeholder="Celular"></td>
      <td>
        <select class="jec1-sub-cond">
          <option value="DESIGNADO" ${s.condicion === 'DESIGNADO' ? 'selected' : ''}>DESIGNADO</option>
          <option value="ENCARGADO" ${s.condicion === 'ENCARGADO' ? 'selected' : ''}>ENCARGADO</option>
        </select>
      </td>
      <td><input type="email" class="jec1-sub-correo" value="${esc(s.correo || '')}" placeholder="correo@ejemplo.com"></td>
      <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-sub" title="Eliminar subdirector">🗑️</button></td>
    </tr>
  `).join('');
}

/**
 * Filtro estricto: Solo colegios pertenecientes al Modelo JEC
 */
export const isJecColegio = (c) => {
  if (!c) return false;
  return Boolean(
    c.esJec === true ||
    c.es_jec === true ||
    c.esJEC === true ||
    String(c.modelo || '').toUpperCase() === 'JEC' ||
    String(c.modalidad || '').toUpperCase().includes('JEC')
  );
};

export const getJecColegiosList = (state) => {
  const all = Array.isArray(state?.colegios) ? state.colegios : [];
  const filtered = all.filter(isJecColegio);
  return filtered.length > 0 ? filtered : all;
};

/**
 * Renderiza el formulario completo de la Ficha del 1er Monitoreo JEC
 */
export function renderJec1erForm(host, ft, state, dbNs, currentUser, navigate, isEditing = false) {
  if (!host) return;

  const colegiosList = getJecColegiosList(state);
  const scoreData = calculateJec1erScore();

    // Código modular dividido en 7 casilleros
    const codStr = String(jec1erState.codModular || '').padStart(7, ' ').slice(0, 7);
    const modBoxesHtml = Array.from({ length: 7 }, (_, i) => {
      const char = codStr[i] && codStr[i] !== ' ' ? codStr[i] : '';
      return `<input type="text" class="jec1-mod-box" maxlength="1" data-mod-idx="${i}" value="${esc(char)}" aria-label="Dígito modular ${i + 1}">`;
    }).join('');

    // Filas de Subdirectores dinámicas
    const subdirectoresRowsHtml = renderSubdirectoresRowsHtml(jec1erState.subdirectores);

    // Filas de Coordinadores Pedagógicos
    const coordPedagRowsHtml = jec1erState.coordPedag.map((c, idx) => `
    <tr data-cp-idx="${idx}">
      <td><input type="text" class="jec1-cp-nombres" value="${esc(c.nombres || '')}" placeholder="Apellidos y nombres"></td>
      <td><input type="text" class="jec1-cp-dni" value="${esc(c.dni || '')}" placeholder="DNI (8 dígitos)" maxlength="8"></td>
      <td><input type="text" class="jec1-cp-tel" value="${esc(c.telefono || '')}" placeholder="Celular"></td>
      <td><input type="text" class="jec1-cp-esp" value="${esc(c.especialidad || '')}" placeholder="Especialidad pedagógica"></td>
      <td><input type="email" class="jec1-cp-correo" value="${esc(c.correo || '')}" placeholder="correo@ejemplo.com"></td>
      <td><input type="text" class="jec1-cp-cp" value="${esc(c.cp || `CP ${idx + 1}`)}" placeholder="Ej: CP 01"></td>
      <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-cp" title="Eliminar fila">🗑️</button></td>
    </tr>
  `).join('');

    // Filas de Coordinadores de Tutoría
    const coordTutoriaRowsHtml = jec1erState.coordTutoria.map((c, idx) => `
    <tr data-ct-idx="${idx}">
      <td><input type="text" class="jec1-ct-nombres" value="${esc(c.nombres || '')}" placeholder="Apellidos y nombres"></td>
      <td><input type="text" class="jec1-ct-dni" value="${esc(c.dni || '')}" placeholder="DNI (8 dígitos)" maxlength="8"></td>
      <td><input type="text" class="jec1-ct-tel" value="${esc(c.telefono || '')}" placeholder="Celular"></td>
      <td><input type="text" class="jec1-ct-esp" value="${esc(c.especialidad || '')}" placeholder="Especialidad"></td>
      <td><input type="email" class="jec1-ct-correo" value="${esc(c.correo || '')}" placeholder="correo@ejemplo.com"></td>
      <td><input type="text" class="jec1-ct-ct" value="${esc(c.ct || `CT ${idx + 1}`)}" placeholder="Ej: CT 01"></td>
      <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-ct" title="Eliminar fila">🗑️</button></td>
    </tr>
  `).join('');

    // Filas de Compromisos de Mejora
    const compromisosRowsHtml = jec1erState.compromisos.map((c, idx) => `
    <tr data-comp-idx="${idx}">
      <td><input type="text" class="jec1-comp-aspecto" value="${esc(c.aspectoCritico || '')}" placeholder="Aspecto crítico identificado..."></td>
      <td><input type="text" class="jec1-comp-accion" value="${esc(c.accionMejora || '')}" placeholder="Acción de mejora / Acuerdo..."></td>
      <td><input type="text" class="jec1-comp-crono" value="${esc(c.cronograma || '')}" placeholder="Cronograma de cumplimiento..."></td>
      <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-comp" title="Eliminar fila">🗑️</button></td>
    </tr>
  `).join('');

    // Renderizar 01 Aspecto: Condiciones (7 ítems Sí / No - Botones Circulares/Pills)
    const condicionesItemsHtml = JEC_1ER_CONDICIONES_ITEMS.map((it, idx) => {
      const val = String(jec1erState.condiciones[it.id] || '').toUpperCase();
      const hallazgo = jec1erState.condicionesHallazgos[it.id] || '';
      return `
      <div class="jec1-item-row" data-cond-id="${it.id}">
        <div class="jec1-item-header">
          <div class="jec1-item-desc">
            <span class="jec1-item-num">${String(idx + 1).padStart(2, '0')}.</span>
            ${esc(it.texto)}
          </div>
          <div class="jec1-opt-group">
            <button type="button" class="jec1-cond-btn ${val === 'SI' ? 'active-si' : ''}" data-cond-id="${it.id}" data-val="SI" title="Sí cumple la condición">
              SÍ
            </button>
            <button type="button" class="jec1-cond-btn ${val === 'NO' ? 'active-no' : ''}" data-cond-id="${it.id}" data-val="NO" title="No cumple la condición">
              NO
            </button>
          </div>
        </div>
        <div class="jec1-item-hallazgo">
          <input type="text" class="jec1-cond-hallazgo" data-cond-id="${it.id}" value="${esc(hallazgo)}" placeholder="Hallazgos / Evidencias / Observaciones (opcional)...">
        </div>
      </div>
    `;
    }).join('');

    // Renderizar 4 Aspectos con Evaluación 1, 2, 3, NA (37 ítems - Botones Circulares)
    const aspectosPuntajeHtml = JEC_1ER_SECCIONES_PUNTAJE.map((sec) => {
      let subtotalKey = 'aspecto2';
      if (sec.id === 'sec_aspecto_03') subtotalKey = 'aspecto3';
      else if (sec.id === 'sec_aspecto_04') subtotalKey = 'aspecto4';
      else if (sec.id === 'sec_aspecto_05') subtotalKey = 'aspecto5';

      const subtotalVal = scoreData.subtotales[subtotalKey] || 0;
      const maxSec = sec.items.length * 3;

      const itemsHtml = sec.items.map((it) => {
        const val = jec1erState.puntajes[it.id];
        const hallazgo = jec1erState.puntajesHallazgos[it.id] || '';
        const numVal = (it.num !== undefined && it.num !== null && it.num !== '') ? it.num : (sec.items.indexOf(it) + 1);
        return `
        <div class="jec1-item-row" data-item-id="${it.id}">
          <div class="jec1-item-header">
            <div class="jec1-item-desc">
              <span class="jec1-item-num">${String(numVal).padStart(2, '0')}.</span>
              ${esc(it.texto)}
            </div>
            <div class="jec1-opt-group">
              <button type="button" class="jec1-circle-btn ${String(val) === '1' ? 'active-1' : ''}" data-item-id="${it.id}" data-val="1" title="1: Nivel Inicio (1 punto)">
                1
              </button>
              <button type="button" class="jec1-circle-btn ${String(val) === '2' ? 'active-2' : ''}" data-item-id="${it.id}" data-val="2" title="2: Nivel Proceso (2 puntos)">
                2
              </button>
              <button type="button" class="jec1-circle-btn ${String(val) === '3' ? 'active-3' : ''}" data-item-id="${it.id}" data-val="3" title="3: Nivel Logrado (3 puntos)">
                3
              </button>
              <button type="button" class="jec1-circle-btn ${String(val) === 'NA' ? 'active-na' : ''}" data-item-id="${it.id}" data-val="NA" title="NA: No Aplica (0 puntos)">
                NA
              </button>
            </div>
          </div>
          <div class="jec1-item-hallazgo">
            <input type="text" class="jec1-item-hallazgo-input" data-item-id="${it.id}" value="${esc(hallazgo)}" placeholder="Hallazgos / Evidencias / Observaciones (opcional)...">
          </div>
        </div>
      `;
      }).join('');

      return `
      <div class="jec1-section-card" data-sec-id="${sec.id}">
        <div class="jec1-section-header">
          <h4 class="jec1-section-title">
            <span>🔹</span> ${esc(sec.nombre)}
          </h4>
          <span class="formSecCount" id="subtotal_${sec.id}" style="font-weight:700; color:#0284c7; background:#e0f2fe; padding:0.3rem 0.75rem; border-radius:6px;">
            Subtotal: ${subtotalVal} / ${maxSec} pts
          </span>
        </div>
        <div class="jec1-section-body">
          ${itemsHtml}
        </div>
      </div>
    `;
    }).join('');

    // Nivel badge css class
    const nivelCssClass = scoreData.nivelInfo.nivel === 'LOGRADO'
      ? 'jec1-level-logrado'
      : (scoreData.nivelInfo.nivel === 'PROCESO' ? 'jec1-level-proceso' : 'jec1-level-inicio');

    host.innerHTML = `
    <div class="jec1-wrapper">
      <form id="regForm" autocomplete="off" onsubmit="return false;">
        ${renderJecVisitaSelectorHtml(1)}
        <!-- ENCABEZADO INSTITUCIONAL OFICIAL -->
        <div class="jec1-header-card">
          <div class="jec1-logos-banner">
            <div class="jec1-logos-left">
              <div class="jec1-minedu-badge">
                <span>🇵🇪</span> PERÚ | Ministerio de Educación
              </div>
              <div class="jec1-sub-badge">
                Despacho Viceministerial de Gestión Institucional<br>
                Dirección Regional de Educación de Lima Metropolitana<br>
                <strong>Unidad de Gestión Educativa Local N° 03 · AGEBRE</strong>
              </div>
            </div>
            <div class="jec1-jec-logo">
              Jec <span>más oportunidades</span>
            </div>
          </div>

          <div class="jec1-title-area">
            <h2 class="jec1-main-title">FICHA DEL 1ER MONITOREO Y ASISTENCIA TÉCNICA A LA IMPLEMENTACIÓN DEL MODELO DE SERVICIO EDUCATIVO JORNADA ESCOLAR COMPLETA - JEC</h2>
            <p class="jec1-normativa">RVM N°326-2019-MINEDU / RM N°501-2025-MINEDU</p>
          </div>

          <!-- BARRA DE PUNTAJE Y NIVEL EN VIVO -->
          <div class="jec1-live-badge-bar">
            <div class="jec1-live-left">
              <span class="jec1-live-title">Resultado de Evaluación:</span>
              <div class="jec1-live-pts">
                <span id="jec1_live_pts_num">${scoreData.puntajeTotal}</span> <small>/ 111 pts</small>
              </div>
            </div>
            <div id="jec1_live_level_tag" class="jec1-live-level-tag ${nivelCssClass}">
              <span>NIVEL:</span> <strong>${scoreData.nivelInfo.nivel}</strong>
            </div>
          </div>
        </div>

        <!-- I. DATOS GENERALES DE LA IE -->
        <div class="jec1-section-card">
          <div class="jec1-section-header">
            <h3 class="jec1-section-title">I. DATOS GENERALES DE LA IE</h3>
          </div>
          <div class="jec1-section-body">
            <div style="background:linear-gradient(135deg, rgba(2,132,199,0.06), rgba(14,165,233,0.02));padding:12px 14px;border-radius:8px;border:1px solid rgba(2,132,199,0.25);margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap">
              <div>
                <span style="font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase;letter-spacing:0.5px;display:block">
                  Especialista Responsable de Monitoreo JEC:
                </span>
                <strong style="font-size:14.5px;color:#0f172a">${esc(ESPECIALISTA_JEC_OFICIAL.nombresApellidos)}</strong>
                <span style="font-size:12px;color:#64748b;margin-left:6px">(${esc(ESPECIALISTA_JEC_OFICIAL.cargo)} · AGEBRE – UGEL 03)</span>
              </div>
              <span class="badge" style="background:#0284c7;color:#fff;font-size:11px;padding:3px 9px;font-weight:700">MSE JEC</span>
            </div>

            <div class="jec1-grid-2">
              <div class="jec1-form-group">
                <label for="jec1_ie_nombre">Número y/o nombre de la Institución Educativa *</label>
                <div class="ieSearchWrap" id="jec1_ie_search_wrap" style="position:relative">
                  <input type="text" id="jec1_ie_nombre" class="jec1-input" list="dl_colegios_jec1" value="${esc(jec1erState.colegioNombre)}" placeholder="Escriba o seleccione la IE..." required autocomplete="off">
                  <div class="ieDropdown" id="jec1_ie_dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:#fff;border:1px solid #cbd5e1;border-radius:6px;max-height:220px;overflow-y:auto;box-shadow:0 4px 12px rgba(0,0,0,0.1)"></div>
                </div>
                <span id="jec1_colegio_hint" style="display:${jec1erState.colegioNombre ? 'block' : 'none'};font-size:11.5px;color:#0284c7;margin-top:4px">
                  ${jec1erState.colegioNombre ? `✓ Vinculado al padrón JEC: ${esc(jec1erState.colegioNombre)} · ${esc(jec1erState.red || 'UGEL 03')} · Cód: ${esc(jec1erState.codModular || '—')}` : ''}
                </span>
                <datalist id="dl_colegios_jec1">
                  ${colegiosList.map(c => `<option value="${esc(c.nombre || c.ie || '')}">${esc(c.codModular || c.codigoModular || '')} - RED ${esc(c.red || c.rei || '')}</option>`).join('')}
                </datalist>
              </div>

              <div class="jec1-form-group">
                <label>Código Modular (7 dígitos) *</label>
                <div class="jec1-modular-boxes" id="jec1_modular_container">
                  ${modBoxesHtml}
                </div>
                <input type="hidden" id="jec1_cod_modular_hidden" value="${esc(jec1erState.codModular)}">
              </div>
            </div>

            <div class="jec1-grid-4">
              <div class="jec1-form-group">
                <label for="jec1_ugel">UGEL</label>
                <input type="text" id="jec1_ugel" class="jec1-input" value="${esc(jec1erState.ugel || '03')}" readonly>
              </div>
              <div class="jec1-form-group">
                <label for="jec1_red">RED</label>
                <input type="text" id="jec1_red" class="jec1-input" value="${esc(jec1erState.red)}" placeholder="Ej: RED 05">
              </div>
              <div class="jec1-form-group">
                <label for="jec1_fecha">Fecha de visita *</label>
                <input type="date" id="jec1_fecha" class="jec1-input" value="${esc(jec1erState.fecha || todayStr())}" required>
              </div>
              <div class="jec1-form-group">
                <label for="jec1_secciones">Secciones</label>
                <input type="number" id="jec1_secciones" class="jec1-input" min="1" value="${esc(jec1erState.secciones)}" placeholder="N° secciones">
              </div>
            </div>

            <div class="jec1-grid-3">
              <div class="jec1-form-group">
                <label for="jec1_estudiantes">Cantidad Estudiantes</label>
                <input type="number" id="jec1_estudiantes" class="jec1-input" min="0" value="${esc(jec1erState.estudiantes)}" placeholder="N° estudiantes">
              </div>
              <div class="jec1-form-group">
                <label for="jec1_docentes">Cantidad Docentes</label>
                <input type="number" id="jec1_docentes" class="jec1-input" min="0" value="${esc(jec1erState.docentes)}" placeholder="N° docentes">
              </div>
              <div class="jec1-form-group">
                <label>¿La IE implementa Secundaria con Formación Técnica? *</label>
                <div class="jec1-radio-group" style="align-self:flex-start; margin-top:2px;">
                  <label class="jec1-radio-label ${jec1erState.secundariaTecnica === 'SI' ? 'active-si' : ''}">
                    <input type="radio" name="jec1_tecnica" value="SI" ${jec1erState.secundariaTecnica === 'SI' ? 'checked' : ''}> SÍ
                  </label>
                  <label class="jec1-radio-label ${jec1erState.secundariaTecnica === 'NO' ? 'active-no' : ''}">
                    <input type="radio" name="jec1_tecnica" value="NO" ${jec1erState.secundariaTecnica === 'NO' ? 'checked' : ''}> NO
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- II. DATOS DEL DIRECTOR (A) -->
        <div class="jec1-section-card">
          <div class="jec1-section-header">
            <h3 class="jec1-section-title">II. DATOS DEL DIRECTOR (A)</h3>
          </div>
          <div class="jec1-section-body">
            <div class="jec1-grid-3">
              <div class="jec1-form-group" style="grid-column: span 2;">
                <label for="jec1_dir_nombres">Nombres y Apellidos *</label>
                <input type="text" id="jec1_dir_nombres" class="jec1-input" value="${esc(jec1erState.director.nombres)}" placeholder="Apellidos y nombres del directivo">
              </div>
              <div class="jec1-form-group">
                <label for="jec1_dir_dni">DNI</label>
                <input type="text" id="jec1_dir_dni" class="jec1-input" maxlength="8" value="${esc(jec1erState.director.dni)}" placeholder="DNI (8 dígitos)">
              </div>
            </div>
            <div class="jec1-grid-3">
              <div class="jec1-form-group">
                <label for="jec1_dir_tel">Teléfono</label>
                <input type="text" id="jec1_dir_tel" class="jec1-input" value="${esc(jec1erState.director.telefono)}" placeholder="Celular de contacto">
              </div>
              <div class="jec1-form-group">
                <label for="jec1_dir_cond">Condición</label>
                <select id="jec1_dir_cond" class="jec1-select">
                  <option value="DESIGNADO" ${jec1erState.director.condicion === 'DESIGNADO' ? 'selected' : ''}>DESIGNADO</option>
                  <option value="ENCARGADO" ${jec1erState.director.condicion === 'ENCARGADO' ? 'selected' : ''}>ENCARGADO</option>
                </select>
              </div>
              <div class="jec1-form-group">
                <label for="jec1_dir_correo">Correo Electrónico</label>
                <input type="email" id="jec1_dir_correo" class="jec1-input" value="${esc(jec1erState.director.correo)}" placeholder="correo@ejemplo.com">
              </div>
            </div>
          </div>
        </div>

        <!-- III. DATOS DE LOS SUB DIRECTORES -->
        <div class="jec1-section-card">
          <div class="jec1-section-header">
            <h3 class="jec1-section-title">III. DATOS DE LOS SUB DIRECTORES</h3>
          </div>
          <div class="jec1-section-body">
            <div class="jec1-table-wrapper">
              <table class="jec1-table" id="jec1_subdirectores_table">
                <thead>
                  <tr>
                    <th style="width:30%;">Nombres y Apellidos</th>
                    <th style="width:15%;">DNI</th>
                    <th style="width:15%;">Teléfono</th>
                    <th style="width:15%;">Condición</th>
                    <th style="width:20%;">Correo</th>
                    <th style="width:5%; text-align:center;">Acción</th>
                  </tr>
                </thead>
                <tbody id="jec1_subdirectores_tbody">
                  ${subdirectoresRowsHtml}
                </tbody>
              </table>
            </div>
            <button type="button" class="jec1-btn-add" id="jec1_btn_add_sub">
              <span>➕</span> Agregar Subdirector
            </button>
          </div>
        </div>

        <!-- IV. DATOS DE LOS COORDINADORES -->
        <div class="jec1-section-card">
          <div class="jec1-section-header">
            <h3 class="jec1-section-title">IV. DATOS DE LOS COORDINADORES</h3>
          </div>
          <div class="jec1-section-body">
            <!-- a. PEDAGÓGICOS -->
            <h4 style="font-size:0.9rem; font-weight:800; color:#0369a1; text-transform:uppercase; margin:0.5rem 0;">a. PEDAGÓGICOS</h4>
            <div class="jec1-table-wrapper">
              <table class="jec1-table" id="jec1_coord_pedag_table">
                <thead>
                  <tr>
                    <th style="width:25%;">Nombres y Apellidos</th>
                    <th style="width:12%;">DNI</th>
                    <th style="width:13%;">Teléfono</th>
                    <th style="width:20%;">Especialidad</th>
                    <th style="width:18%;">Correo</th>
                    <th style="width:7%;">CP</th>
                    <th style="width:5%; text-align:center;">Acción</th>
                  </tr>
                </thead>
                <tbody id="jec1_coord_pedag_tbody">
                  ${coordPedagRowsHtml}
                </tbody>
              </table>
            </div>
            <button type="button" class="jec1-btn-add" id="jec1_btn_add_cp" style="margin-bottom:1.5rem;">
              <span>➕</span> Agregar Coordinador Pedagógico
            </button>

            <!-- b. TUTORÍA -->
            <h4 style="font-size:0.9rem; font-weight:800; color:#0369a1; text-transform:uppercase; margin:1.25rem 0 0.5rem 0;">b. TUTORÍA</h4>
            <div class="jec1-table-wrapper">
              <table class="jec1-table" id="jec1_coord_tutoria_table">
                <thead>
                  <tr>
                    <th style="width:25%;">Nombres y Apellidos</th>
                    <th style="width:12%;">DNI</th>
                    <th style="width:13%;">Teléfono</th>
                    <th style="width:20%;">Especialidad</th>
                    <th style="width:18%;">Correo</th>
                    <th style="width:7%;">CT</th>
                    <th style="width:5%; text-align:center;">Acción</th>
                  </tr>
                </thead>
                <tbody id="jec1_coord_tutoria_tbody">
                  ${coordTutoriaRowsHtml}
                </tbody>
              </table>
            </div>
            <button type="button" class="jec1-btn-add" id="jec1_btn_add_ct">
              <span>➕</span> Agregar Coordinador de Tutoría
            </button>
          </div>
        </div>

        <!-- 01 ASPECTO: CONDICIONES (EVALUACIÓN SÍ / NO) -->
        <div class="jec1-section-card">
          <div class="jec1-section-header">
            <h3 class="jec1-section-title">
              <span>📋</span> 01 ASPECTO: CONDICIONES (VERIFICACIÓN INICIAL)
            </h3>
            <span class="formSecCount" id="jec1_cond_resumen" style="font-weight:700; color:#15803d; background:#dcfce7; padding:0.3rem 0.75rem; border-radius:6px;">
              ${scoreData.condSi} de 7 condiciones cumplidas
            </span>
          </div>
          <div class="jec1-section-body">
            <p style="font-size:0.85rem; color:#64748b; margin-top:0; margin-bottom:1rem;">
              Verificación de condiciones iniciales para el adecuado inicio del año escolar en el Modelo JEC. Evaluación: <strong>SÍ</strong> o <strong>NO</strong>.
            </p>
            ${condicionesItemsHtml}
          </div>
        </div>

        <!-- 4 ASPECTOS DE EVALUACIÓN CON PUNTAJE (37 ÍTEMS - ESCALA 1, 2, 3, NA) -->
        ${aspectosPuntajeHtml}

        <!-- VI. ESCALA DE VALORACIÓN (IMAGE 2) -->
        <div class="jec1-scale-card">
          <div class="jec1-scale-header">
            VI. ESCALA DE VALORACIÓN
          </div>
          <table class="jec1-scale-table">
            <thead>
              <tr>
                <th style="width:20%;">VALORACIÓN</th>
                <th style="width:25%;">RANGO DE PUNTOS</th>
                <th style="width:55%;">DESCRIPCIÓN</th>
              </tr>
            </thead>
            <tbody>
              <tr id="scale_row_inicio" class="jec1-scale-row ${scoreData.nivelInfo.nivel === 'INICIO' ? 'active-scale-row' : ''}">
                <td><strong style="color:#b91c1c;">INICIO</strong></td>
                <td>De 1 a 56 puntos</td>
                <td>La IE cumple con algunos de los ítems establecidos.</td>
              </tr>
              <tr id="scale_row_proceso" class="jec1-scale-row ${scoreData.nivelInfo.nivel === 'PROCESO' ? 'active-scale-row' : ''}">
                <td><strong style="color:#b45309;">PROCESO</strong></td>
                <td>De 57 a 83 puntos</td>
                <td>La IE cumple con más de la mitad de los ítems establecidos.</td>
              </tr>
              <tr id="scale_row_logrado" class="jec1-scale-row ${scoreData.nivelInfo.nivel === 'LOGRADO' ? 'active-scale-row' : ''}">
                <td><strong style="color:#15803d;">LOGRADO</strong></td>
                <td>De 84 a 111 puntos</td>
                <td>La IE cumple con la mayoría de los ítems establecidos.</td>
              </tr>
            </tbody>
          </table>

          <div class="jec1-scale-level-box">
            <div class="jec1-level-label-block">NIVEL:</div>
            <div class="jec1-level-result-display" id="jec1_level_display_box">
              <span id="jec1_level_name" style="color:${scoreData.nivelInfo.color};">${scoreData.nivelInfo.nivel}</span>
              <span id="jec1_score_ratio" style="font-size:0.95rem; color:#64748b; font-weight:700;">
                ${scoreData.puntajeTotal} / 111 puntos (${Math.round((scoreData.puntajeTotal / 111) * 100)}%)
              </span>
            </div>
          </div>
        </div>

        <!-- VII. RECOMENDACIONES (IMAGE 2) -->
        <div class="jec1-section-card">
          <div class="jec1-section-header">
            <h3 class="jec1-section-title">VII. RECOMENDACIONES</h3>
          </div>
          <div class="jec1-section-body">
            <textarea id="jec1_recomendaciones" class="jec1-recomendaciones-box" placeholder="Consigne aquí las recomendaciones técnicas y pedagógicas para la IE...">${esc(jec1erState.recomendaciones)}</textarea>
          </div>
        </div>

        <!-- VIII. COMPROMISO DE MEJORA (IMAGE 2) -->
        <div class="jec1-section-card">
          <div class="jec1-section-header">
            <h3 class="jec1-section-title">VIII. COMPROMISO DE MEJORA</h3>
          </div>
          <div class="jec1-section-body">
            <div class="jec1-table-wrapper">
              <table class="jec1-table" id="jec1_compromisos_table">
                <thead>
                  <tr>
                    <th style="width:35%;">Aspecto crítico identificado</th>
                    <th style="width:40%;">Acción de mejora (Acuerdo)</th>
                    <th style="width:20%;">Cronograma de cumplimiento</th>
                    <th style="width:5%; text-align:center;">Acción</th>
                  </tr>
                </thead>
                <tbody id="jec1_compromisos_tbody">
                  ${compromisosRowsHtml}
                </tbody>
              </table>
            </div>
            <button type="button" class="jec1-btn-add" id="jec1_btn_add_comp">
              <span>➕</span> Agregar Compromiso de Mejora
            </button>
          </div>
        </div>

        <!-- BOTONES DE ACCIÓN -->
        <div class="jec1-submit-bar">
          <button type="button" class="jec1-btn-cancel" id="jec1_btn_cancel">
            Cancelar
          </button>
          <button type="submit" class="jec1-btn-submit" id="jec1_btn_submit">
            ${isEditing ? 'Actualizar Ficha JEC (1er Momento)' : 'Guardar Ficha JEC (1er Momento)'}
          </button>
        </div>
      </form>
    </div>
  `;

  // Enganchar interactividad completa
  attachJec1erEvents(host, ft, state, currentUser, navigate, isEditing);
}

/**
 * Conecta todos los eventos de interacción y cálculo reactivo
 */
function attachJec1erEvents(host, ft, state, currentUser, navigate, isEditing) {
  // 1. Elementos de cabecera y búsqueda
  const ieInput = host.querySelector('#jec1_ie_nombre');
  const dropdown = host.querySelector('#jec1_ie_dropdown');
  const hint = host.querySelector('#jec1_colegio_hint');
  const modBoxes = host.querySelectorAll('.jec1-mod-box');
  const modHidden = host.querySelector('#jec1_cod_modular_hidden');
  const ugelInput = host.querySelector('#jec1_ugel');
  const redInput = host.querySelector('#jec1_red');
  const dirNombres = host.querySelector('#jec1_dir_nombres');
  const dirDni = host.querySelector('#jec1_dir_dni');
  const dirTel = host.querySelector('#jec1_dir_tel');
  const dirCond = host.querySelector('#jec1_dir_cond');
  const dirCorreo = host.querySelector('#jec1_dir_correo');
  const subTbody = host.querySelector('#jec1_subdirectores_tbody');

  const syncModularFromCode = (code) => {
    const raw = String(code || '').replace(/\D/g, '');
    const s = raw.padStart(7, ' ').slice(0, 7);
    modBoxes.forEach((box, i) => {
      box.value = s[i] && s[i] !== ' ' ? s[i] : '';
    });
    if (modHidden) modHidden.value = raw || '';
    jec1erState.codModular = raw || '';
  };

  const syncModularFromBoxes = () => {
    let code = '';
    modBoxes.forEach(b => { code += (b.value || ''); });
    if (modHidden) modHidden.value = code;
    jec1erState.codModular = code;
  };

  modBoxes.forEach((box, idx) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      if (box.value && idx < modBoxes.length - 1) {
        modBoxes[idx + 1].focus();
      }
      syncModularFromBoxes();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && idx > 0) {
        modBoxes[idx - 1].focus();
      }
    });
  });

  // Filtro estricto de colegios JEC usando el helper modular
  const getJecColegios = () => getJecColegiosList(state);

  const onSelectColegio = (col) => {
    if (!col) return;
    const ieName = col.ie || col.nombre || '';
    const codMod = String(col.codigoModular || col.codModular || col.codigoLocal || '').replace(/\D/g, '');
    const rawRed = col.red || col.rei || '';
    const redStr = rawRed ? ('RED ' + String(rawRed).replace(/\D/g, '').padStart(2, '0')) : '';

    jec1erState.colegioId = col.id;
    jec1erState.colegioNombre = ieName;
    jec1erState.codModular = codMod;
    jec1erState.red = redStr;
    jec1erState.ugel = '03';

    if (ieInput) ieInput.value = ieName;
    syncModularFromCode(codMod);
    if (redInput) redInput.value = redStr;
    if (ugelInput) ugelInput.value = '03';

    if (hint) {
      hint.style.display = 'block';
      hint.textContent = `✓ Vinculado al padrón JEC: ${ieName} · ${redStr || 'UGEL 03'} · Cód: ${codMod || '—'}`;
    }

    // Buscar Director y Sub-directores en Directorio activo y en datos del colegio
    let dirData = {
      nombres: '',
      dni: '',
      telefono: '',
      condicion: 'DESIGNADO',
      correo: ''
    };
    let subList = [];

    try {
      const dirRes = getDirectivosActivosForColegio(state, col.id, col.codigoLocal, col.codigoModular || col.codModular);
      const dirActivo = dirRes?.director;
      const subsActivos = dirRes?.subdirectores || [];

      if (dirActivo) {
        dirData.nombres = dirActivo.apellidosNombres || '';
        dirData.dni = String(dirActivo.dni || '').replace(/\D/g, '');
        dirData.telefono = String(dirActivo.telefono || '').replace(/\D/g, '');
        dirData.condicion = (dirActivo.condicion === 'E' || String(dirActivo.cargo || '').toUpperCase().includes('ENCARG')) ? 'ENCARGADO' : 'DESIGNADO';
        dirData.correo = dirActivo.correo || '';
      } else if (col.director) {
        dirData.nombres = col.director.nombre || '';
        dirData.dni = String(col.director.dni || '').replace(/\D/g, '');
        dirData.telefono = String(col.director.telefono || '').replace(/\D/g, '');
        dirData.condicion = (col.director.condicion && String(col.director.condicion).toUpperCase().includes('ENCARG')) ? 'ENCARGADO' : 'DESIGNADO';
        dirData.correo = col.director.correo || '';
      }

      if (Array.isArray(subsActivos) && subsActivos.length > 0) {
        subList = subsActivos.map(s => ({
          nombres: s.apellidosNombres || s.nombres || '',
          dni: String(s.dni || '').replace(/\D/g, ''),
          telefono: String(s.telefono || '').replace(/\D/g, ''),
          condicion: (s.condicion === 'E' || String(s.cargo || '').toUpperCase().includes('ENCARG')) ? 'ENCARGADO' : 'DESIGNADO',
          correo: s.correo || ''
        }));
      } else if (col.subDirector && col.subDirector.nombre) {
        subList = [{
          nombres: col.subDirector.nombre,
          dni: String(col.subDirector.dni || '').replace(/\D/g, ''),
          telefono: String(col.subDirector.telefono || '').replace(/\D/g, ''),
          condicion: (col.subDirector.condicion && String(col.subDirector.condicion).toUpperCase().includes('ENCARG')) ? 'ENCARGADO' : 'DESIGNADO',
          correo: col.subDirector.correo || ''
        }];
      } else if (Array.isArray(col.subdirectores) && col.subdirectores.length > 0) {
        subList = col.subdirectores.map(s => ({
          nombres: s.nombre || s.nombres || s.apellidosNombres || '',
          dni: String(s.dni || '').replace(/\D/g, ''),
          telefono: String(s.telefono || '').replace(/\D/g, ''),
          condicion: String(s.condicion || '').toUpperCase().includes('ENCARG') ? 'ENCARGADO' : 'DESIGNADO',
          correo: s.correo || ''
        }));
      }
    } catch (e) {
      console.warn('[JEC 1er] Error resolviendo directivos para el colegio:', e);
    }

    // Asignar al estado y UI del Director
    jec1erState.director = dirData;
    if (dirNombres) dirNombres.value = dirData.nombres;
    if (dirDni) dirDni.value = dirData.dni;
    if (dirTel) dirTel.value = dirData.telefono;
    if (dirCond) dirCond.value = dirData.condicion;
    if (dirCorreo) dirCorreo.value = dirData.correo;

    // Actualizar Subdirectores en estado y re-renderizar tabla de subdirectores
    if (subList.length === 0) {
      subList = [{ nombres: '', dni: '', telefono: '', condicion: 'DESIGNADO', correo: '' }];
    }
    jec1erState.subdirectores = subList;
    if (subTbody) {
      subTbody.innerHTML = renderSubdirectoresRowsHtml(subList);
    }
  };

  if (ieInput && dropdown) {
    const showDropdown = () => {
      const q = normalizeText(ieInput.value);
      const list = getJecColegiosList(state);
      const matches = list.filter(c => {
        if (!q) return true;
        const name = normalizeText(c.ie || c.nombre || '');
        const cod = normalizeText(c.codigoModular || c.codModular || c.codigoLocal || '');
        const red = normalizeText(c.red || c.rei || '');
        return name.includes(q) || cod.includes(q) || red.includes(q);
      }).slice(0, 30);

      if (!matches.length) {
        dropdown.style.display = 'none';
        return;
      }

      dropdown.innerHTML = matches.map(c => {
        const cNom = c.ie || c.nombre || '';
        const cCod = c.codigoModular || c.codModular || c.codigoLocal || '';
        const cRed = (c.red || c.rei) ? `RED ${String(c.red || c.rei).replace(/\D/g, '').padStart(2, '0')}` : '';
        const cDir = c.director?.nombre ? `Dir: ${c.director.nombre}` : '';
        return `
          <div class="jec1-search-item" data-col-id="${esc(c.id)}">
            <div style="font-weight:700; color:#0f172a; font-size:0.9rem;">${esc(cNom)}</div>
            <div style="font-size:0.78rem; color:#64748b; margin-top:2px; display:flex; gap:8px;">
              <span>Cód: <strong>${esc(cCod)}</strong></span>
              ${cRed ? `<span>· ${esc(cRed)}</span>` : ''}
              ${cDir ? `<span>· ${esc(cDir)}</span>` : ''}
            </div>
          </div>
        `;
      }).join('');

      dropdown.style.display = 'block';

      dropdown.querySelectorAll('.jec1-search-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const col = list.find(x => x.id === item.dataset.colId);
          if (col) {
            onSelectColegio(col);
          }
          dropdown.style.display = 'none';
        });
      });
    };

    ieInput.addEventListener('input', showDropdown);
    ieInput.addEventListener('focus', () => { if (!ieInput.value) showDropdown(); });
    ieInput.addEventListener('blur', () => {
      setTimeout(() => { if (dropdown) dropdown.style.display = 'none'; }, 250);
    });

    const tryMatchDirect = () => {
      const val = normalizeText(ieInput.value);
      if (!val) return;
      const list = getJecColegiosList(state);
      const matched = list.find(c => {
        const nom = normalizeText(c.nombre || c.ie || '');
        const cod = normalizeText(c.codigoModular || c.codModular || c.codigoLocal || '');
        return nom === val || cod === val;
      });
      if (matched) {
        onSelectColegio(matched);
        if (dropdown) dropdown.style.display = 'none';
      }
    };
    ieInput.addEventListener('change', tryMatchDirect);
  }

  // 2. Radio Secundaria Técnica
  const tecnicaRadios = host.querySelectorAll('input[name="jec1_tecnica"]');
  tecnicaRadios.forEach(r => {
    r.addEventListener('change', () => {
      jec1erState.secundariaTecnica = r.value;
      const labels = r.closest('.jec1-radio-group').querySelectorAll('.jec1-radio-label');
      labels.forEach(l => l.classList.remove('active-si', 'active-no'));
      if (r.value === 'SI') r.parentElement.classList.add('active-si');
      else r.parentElement.classList.add('active-no');
    });
  });

  // 3. Tablas Dinámicas: Subdirectores
  const btnAddSub = host.querySelector('#jec1_btn_add_sub');
  if (btnAddSub && subTbody) {
    btnAddSub.addEventListener('click', () => {
      const idx = subTbody.children.length;
      const tr = document.createElement('tr');
      tr.dataset.subIdx = idx;
      tr.innerHTML = `
        <td><input type="text" class="jec1-sub-nombres" placeholder="Apellidos y nombres completos"></td>
        <td><input type="text" class="jec1-sub-dni" placeholder="DNI (8 dígitos)" maxlength="8"></td>
        <td><input type="text" class="jec1-sub-tel" placeholder="Celular"></td>
        <td>
          <select class="jec1-sub-cond">
            <option value="DESIGNADO">DESIGNADO</option>
            <option value="ENCARGADO">ENCARGADO</option>
          </select>
        </td>
        <td><input type="email" class="jec1-sub-correo" placeholder="correo@ejemplo.com"></td>
        <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-sub" title="Eliminar subdirector">🗑️</button></td>
      `;
      subTbody.appendChild(tr);
    });

    subTbody.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('jec1-del-sub')) {
        e.target.closest('tr').remove();
      }
    });
  }

  // 4. Tablas Dinámicas: Coordinadores Pedagógicos
  const cpTbody = host.querySelector('#jec1_coord_pedag_tbody');
  const btnAddCp = host.querySelector('#jec1_btn_add_cp');
  if (btnAddCp && cpTbody) {
    btnAddCp.addEventListener('click', () => {
      const idx = cpTbody.children.length;
      const tr = document.createElement('tr');
      tr.dataset.cpIdx = idx;
      tr.innerHTML = `
        <td><input type="text" class="jec1-cp-nombres" placeholder="Apellidos y nombres"></td>
        <td><input type="text" class="jec1-cp-dni" placeholder="DNI (8 dígitos)" maxlength="8"></td>
        <td><input type="text" class="jec1-cp-tel" placeholder="Celular"></td>
        <td><input type="text" class="jec1-cp-esp" placeholder="Especialidad pedagógica"></td>
        <td><input type="email" class="jec1-cp-correo" placeholder="correo@ejemplo.com"></td>
        <td><input type="text" class="jec1-cp-cp" value="CP ${idx + 1}" placeholder="Ej: CP 01"></td>
        <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-cp" title="Eliminar fila">🗑️</button></td>
      `;
      cpTbody.appendChild(tr);
    });

    cpTbody.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('jec1-del-cp')) {
        e.target.closest('tr').remove();
      }
    });
  }

  // 5. Tablas Dinámicas: Coordinadores de Tutoría
  const ctTbody = host.querySelector('#jec1_coord_tutoria_tbody');
  const btnAddCt = host.querySelector('#jec1_btn_add_ct');
  if (btnAddCt && ctTbody) {
    btnAddCt.addEventListener('click', () => {
      const idx = ctTbody.children.length;
      const tr = document.createElement('tr');
      tr.dataset.ctIdx = idx;
      tr.innerHTML = `
        <td><input type="text" class="jec1-ct-nombres" placeholder="Apellidos y nombres"></td>
        <td><input type="text" class="jec1-ct-dni" placeholder="DNI (8 dígitos)" maxlength="8"></td>
        <td><input type="text" class="jec1-ct-tel" placeholder="Celular"></td>
        <td><input type="text" class="jec1-ct-esp" placeholder="Especialidad"></td>
        <td><input type="email" class="jec1-ct-correo" placeholder="correo@ejemplo.com"></td>
        <td><input type="text" class="jec1-ct-ct" value="CT ${idx + 1}" placeholder="Ej: CT 01"></td>
        <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-ct" title="Eliminar fila">🗑️</button></td>
      `;
      ctTbody.appendChild(tr);
    });

    ctTbody.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('jec1-del-ct')) {
        e.target.closest('tr').remove();
      }
    });
  }

  // 6. Tablas Dinámicas: Compromisos de Mejora
  const compTbody = host.querySelector('#jec1_compromisos_tbody');
  const btnAddComp = host.querySelector('#jec1_btn_add_comp');
  if (btnAddComp && compTbody) {
    btnAddComp.addEventListener('click', () => {
      const idx = compTbody.children.length;
      const tr = document.createElement('tr');
      tr.dataset.compIdx = idx;
      tr.innerHTML = `
        <td><input type="text" class="jec1-comp-aspecto" placeholder="Aspecto crítico identificado..."></td>
        <td><input type="text" class="jec1-comp-accion" placeholder="Acción de mejora / Acuerdo..."></td>
        <td><input type="text" class="jec1-comp-crono" placeholder="Cronograma de cumplimiento..."></td>
        <td style="text-align:center;"><button type="button" class="jec1-btn-del jec1-del-comp" title="Eliminar fila">🗑️</button></td>
      `;
      compTbody.appendChild(tr);
    });

    compTbody.addEventListener('click', (e) => {
      if (e.target && e.target.classList.contains('jec1-del-comp')) {
        e.target.closest('tr').remove();
      }
    });
  }

  // 7. Eventos de Selección de Condiciones (Sí / No) - Botones Pills
  const condBtns = host.querySelectorAll('.jec1-cond-btn');
  condBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const condId = btn.dataset.condId;
      const val = btn.dataset.val; // 'SI' or 'NO'
      if (!condId) return;

      const group = btn.closest('.jec1-opt-group');
      if (jec1erState.condiciones[condId] === val) {
        jec1erState.condiciones[condId] = null;
        btn.classList.remove('active-si', 'active-no');
      } else {
        jec1erState.condiciones[condId] = val;
        if (group) {
          group.querySelectorAll('.jec1-cond-btn').forEach(b => b.classList.remove('active-si', 'active-no'));
        }
        btn.classList.add(val === 'SI' ? 'active-si' : 'active-no');
      }

      // Actualizar contador de condiciones
      let condSi = 0;
      JEC_1ER_CONDICIONES_ITEMS.forEach(c => {
        if (String(jec1erState.condiciones[c.id] || '').toUpperCase() === 'SI') condSi++;
      });
      const resBadge = host.querySelector('#jec1_cond_resumen');
      if (resBadge) resBadge.textContent = `${condSi} de 7 condiciones cumplidas`;
    });
  });

  // Guardar hallazgos de condiciones en memoria
  const condHallazgosInputs = host.querySelectorAll('.jec1-cond-hallazgo');
  condHallazgosInputs.forEach(inp => {
    inp.addEventListener('input', () => {
      const cid = inp.dataset.condId;
      if (cid) jec1erState.condicionesHallazgos[cid] = inp.value;
    });
  });

  // 8. Eventos de Selección de Puntaje 1, 2, 3, NA (37 ítems) - Botones Circulares
  const scoreBtns = host.querySelectorAll('.jec1-circle-btn');
  scoreBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const itemId = btn.dataset.itemId;
      const rawVal = btn.dataset.val;
      const parsedVal = rawVal === 'NA' ? 'NA' : parseInt(rawVal, 10);
      const group = btn.closest('.jec1-opt-group');

      // Si ya está activo, deseleccionar
      if (jec1erState.puntajes[itemId] === parsedVal) {
        jec1erState.puntajes[itemId] = null;
        btn.classList.remove('active-1', 'active-2', 'active-3', 'active-na');
      } else {
        jec1erState.puntajes[itemId] = parsedVal;
        if (group) {
          group.querySelectorAll('.jec1-circle-btn').forEach(b => {
            b.classList.remove('active-1', 'active-2', 'active-3', 'active-na');
          });
        }
        if (rawVal === '1') btn.classList.add('active-1');
        else if (rawVal === '2') btn.classList.add('active-2');
        else if (rawVal === '3') btn.classList.add('active-3');
        else if (rawVal === 'NA') btn.classList.add('active-na');
      }

      // Recalcular puntajes en vivo y actualizar UI
      updateLiveScoreUI(host);
    });
  });

  // Guardar hallazgos de ítems en memoria
  const itemHallazgosInputs = host.querySelectorAll('.jec1-item-hallazgo-input');
  itemHallazgosInputs.forEach(inp => {
    inp.addEventListener('input', () => {
      const iid = inp.dataset.itemId;
      if (iid) jec1erState.puntajesHallazgos[iid] = inp.value;
    });
  });

  // 9. Recomendaciones
  const recsArea = host.querySelector('#jec1_recomendaciones');
  if (recsArea) {
    recsArea.addEventListener('input', () => {
      jec1erState.recomendaciones = recsArea.value;
    });
  }

  // 10. Botón Cancelar
  const btnCancel = host.querySelector('#jec1_btn_cancel');
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      if (navigate) navigate('consolidado');
    });
  }
}

/**
 * Actualiza los subtotales, totales, nivel y visualización de la tabla de valoración
 */
function updateLiveScoreUI(host) {
  const scoreData = calculateJec1erScore();

  // Actualizar subtotales por sección
  const sub2 = host.querySelector('#subtotal_sec_aspecto_02');
  if (sub2) sub2.textContent = `Subtotal: ${scoreData.subtotales.aspecto2} / 30 pts`;

  const sub3 = host.querySelector('#subtotal_sec_aspecto_03');
  if (sub3) sub3.textContent = `Subtotal: ${scoreData.subtotales.aspecto3} / 36 pts`;

  const sub4 = host.querySelector('#subtotal_sec_aspecto_04');
  if (sub4) sub4.textContent = `Subtotal: ${scoreData.subtotales.aspecto4} / 24 pts`;

  const sub5 = host.querySelector('#subtotal_sec_aspecto_05');
  if (sub5) sub5.textContent = `Subtotal: ${scoreData.subtotales.aspecto5} / 21 pts`;

  // Actualizar barra de cabecera
  const ptsNum = host.querySelector('#jec1_live_pts_num');
  if (ptsNum) ptsNum.textContent = scoreData.puntajeTotal;

  const levelTag = host.querySelector('#jec1_live_level_tag');
  if (levelTag) {
    levelTag.className = 'jec1-live-level-tag';
    if (scoreData.nivelInfo.nivel === 'LOGRADO') levelTag.classList.add('jec1-level-logrado');
    else if (scoreData.nivelInfo.nivel === 'PROCESO') levelTag.classList.add('jec1-level-proceso');
    else levelTag.classList.add('jec1-level-inicio');
    levelTag.innerHTML = `<span>NIVEL:</span> <strong>${scoreData.nivelInfo.nivel}</strong>`;
  }

  // Actualizar Sección VI (Escala de valoración)
  const rowInicio = host.querySelector('#scale_row_inicio');
  const rowProceso = host.querySelector('#scale_row_proceso');
  const rowLogrado = host.querySelector('#scale_row_logrado');

  if (rowInicio) rowInicio.classList.toggle('active-scale-row', scoreData.nivelInfo.nivel === 'INICIO');
  if (rowProceso) rowProceso.classList.toggle('active-scale-row', scoreData.nivelInfo.nivel === 'PROCESO');
  if (rowLogrado) rowLogrado.classList.toggle('active-scale-row', scoreData.nivelInfo.nivel === 'LOGRADO');

  const lvlName = host.querySelector('#jec1_level_name');
  if (lvlName) {
    lvlName.textContent = scoreData.nivelInfo.nivel;
    lvlName.style.color = scoreData.nivelInfo.color;
  }

  const scoreRatio = host.querySelector('#jec1_score_ratio');
  if (scoreRatio) {
    const pct = Math.round((scoreData.puntajeTotal / 111) * 100);
    scoreRatio.textContent = `${scoreData.puntajeTotal} / 111 puntos (${pct}%)`;
  }
}

/**
 * Recopila todos los datos del formulario 1er Momento JEC para su persistencia en Firestore
 */
export function collectJec1erFormData(host, ft, isEdit = false) {
  if (!host) host = document;

    // Recoger Datos Generales
    const colegioNombre = (host.querySelector('#jec1_ie_nombre')?.value || jec1erState.colegioNombre || '').trim();
    const codModular = (host.querySelector('#jec1_cod_modular_hidden')?.value || jec1erState.codModular || '').trim();
    const ugel = (host.querySelector('#jec1_ugel')?.value || '03').trim();
    const red = (host.querySelector('#jec1_red')?.value || '').trim();
    const fecha = (host.querySelector('#jec1_fecha')?.value || todayStr()).trim();
    const secciones = (host.querySelector('#jec1_secciones')?.value || '').trim();
    const estudiantes = (host.querySelector('#jec1_estudiantes')?.value || '').trim();
    const docentes = (host.querySelector('#jec1_docentes')?.value || '').trim();
    const secundariaTecnica = jec1erState.secundariaTecnica || 'NO';

    // Recoger Director
    const dirNombres = (host.querySelector('#jec1_dir_nombres')?.value || '').trim();
    const dirDni = (host.querySelector('#jec1_dir_dni')?.value || '').trim();
    const dirTel = (host.querySelector('#jec1_dir_tel')?.value || '').trim();
    const dirCond = (host.querySelector('#jec1_dir_cond')?.value || 'DESIGNADO').trim();
    const dirCorreo = (host.querySelector('#jec1_dir_correo')?.value || '').trim();

    // Recoger Subdirectores
    const subdirectores = [];
    const subRows = host.querySelectorAll('#jec1_subdirectores_tbody tr');
    subRows.forEach(tr => {
      const nombres = (tr.querySelector('.jec1-sub-nombres')?.value || '').trim();
      if (nombres) {
        subdirectores.push({
          nombres,
          dni: (tr.querySelector('.jec1-sub-dni')?.value || '').trim(),
          telefono: (tr.querySelector('.jec1-sub-tel')?.value || '').trim(),
          condicion: (tr.querySelector('.jec1-sub-cond')?.value || 'DESIGNADO').trim(),
          correo: (tr.querySelector('.jec1-sub-correo')?.value || '').trim()
        });
      }
    });

    // Recoger Coordinadores Pedagógicos
    const coordinadoresPedagogicos = [];
    const cpRows = host.querySelectorAll('#jec1_coord_pedag_tbody tr');
    cpRows.forEach(tr => {
      const nombres = (tr.querySelector('.jec1-cp-nombres')?.value || '').trim();
      if (nombres) {
        coordinadoresPedagogicos.push({
          nombres,
          dni: (tr.querySelector('.jec1-cp-dni')?.value || '').trim(),
          telefono: (tr.querySelector('.jec1-cp-tel')?.value || '').trim(),
          especialidad: (tr.querySelector('.jec1-cp-esp')?.value || '').trim(),
          correo: (tr.querySelector('.jec1-cp-correo')?.value || '').trim(),
          cp: (tr.querySelector('.jec1-cp-cp')?.value || '').trim()
        });
      }
    });

    // Recoger Coordinadores de Tutoría
    const coordinadoresTutoria = [];
    const ctRows = host.querySelectorAll('#jec1_coord_tutoria_tbody tr');
    ctRows.forEach(tr => {
      const nombres = (tr.querySelector('.jec1-ct-nombres')?.value || '').trim();
      if (nombres) {
        coordinadoresTutoria.push({
          nombres,
          dni: (tr.querySelector('.jec1-ct-dni')?.value || '').trim(),
          telefono: (tr.querySelector('.jec1-ct-tel')?.value || '').trim(),
          especialidad: (tr.querySelector('.jec1-ct-esp')?.value || '').trim(),
          correo: (tr.querySelector('.jec1-ct-correo')?.value || '').trim(),
          ct: (tr.querySelector('.jec1-ct-ct')?.value || '').trim()
        });
      }
    });

    // Recoger Compromisos de Mejora
    const compromisos = [];
    const compRows = host.querySelectorAll('#jec1_compromisos_tbody tr');
    compRows.forEach(tr => {
      const aspecto = (tr.querySelector('.jec1-comp-aspecto')?.value || '').trim();
      const accion = (tr.querySelector('.jec1-comp-accion')?.value || '').trim();
      const crono = (tr.querySelector('.jec1-comp-crono')?.value || '').trim();
      if (aspecto || accion || crono) {
        compromisos.push({
          aspectoCritico: aspecto,
          accionMejora: accion,
          cronograma: crono
        });
      }
    });

    // Recomendaciones
    const recomendaciones = (host.querySelector('#jec1_recomendaciones')?.value || jec1erState.recomendaciones || '').trim();

    // Calcular Puntajes
    const scoreData = calculateJec1erScore();

    // Formatear respuestas para compatibilidad general del sistema
    const respuestasArray = [];
    const respuestasObj = {};
    const respuestasCondicionesObj = {};

    // Condiciones Sí / No
    JEC_1ER_CONDICIONES_ITEMS.forEach(c => {
      const val = (jec1erState.condiciones[c.id] || '').toUpperCase();
      const hallazgo = (jec1erState.condicionesHallazgos[c.id] || '').trim();
      respuestasCondicionesObj[c.id] = { valor: val, hallazgo };
      respuestasArray.push({
        id: c.id,
        valor: val,
        hallazgo,
        seccion: '01 ASPECTO: CONDICIONES'
      });
    });

    // Ítems de Puntaje
    JEC_1ER_SECCIONES_PUNTAJE.forEach(sec => {
      sec.items.forEach(it => {
        const val = jec1erState.puntajes[it.id] !== undefined ? jec1erState.puntajes[it.id] : null;
        const hallazgo = (jec1erState.puntajesHallazgos[it.id] || '').trim();
        respuestasObj[it.id] = { valor: val, hallazgo };
        respuestasArray.push({
          id: it.id,
          valor: val,
          hallazgo,
          seccion: sec.nombre
        });
      });
    });

    return {
      fichaTypeId: ft?.id || 'ft_msejec_2do',
      fichaTypeNombre: ft?.nombre || 'Monitoreo a la Implementación del Modelo JEC',
      modalidad: 'JEC',
      momento: 1,
      visita: 1,
      fecha,
      colegioId: jec1erState.colegioId || null,
      institucion: colegioNombre,
      colegioNombre,
      ie: colegioNombre,
      codModular,
      codigoModular: codModular,
      ugel,
      red,
      responsable: ESPECIALISTA_JEC_OFICIAL.nombresApellidos,
      responsableCargo: ESPECIALISTA_JEC_OFICIAL.cargo,
      monitorJec: ESPECIALISTA_JEC_OFICIAL.nombresApellidos,
      secciones: secciones ? parseInt(secciones, 10) : null,
      cantSecciones: secciones ? parseInt(secciones, 10) : null,
      estudiantes: estudiantes ? parseInt(estudiantes, 10) : null,
      cantEstudiantes: estudiantes ? parseInt(estudiantes, 10) : null,
      docentes: docentes ? parseInt(docentes, 10) : null,
      cantDocentes: docentes ? parseInt(docentes, 10) : null,
      secundariaTecnica,

      director: {
        nombres: dirNombres,
        dni: dirDni,
        telefono: dirTel,
        condicion: dirCond,
        correo: dirCorreo
      },

      subdirectores,
      coordinadoresPedagogicos,
      coordinadoresTutoria,

      // Respuestas y Puntajes Oficiales
      respuestasCondiciones: respuestasCondicionesObj,
      respuestas: respuestasArray,
      respuestasObj,
      subtotales: scoreData.subtotales,
      puntajeTotal: scoreData.puntajeTotal,
      maxPuntaje: 111,
      nivel: scoreData.nivelInfo.nivel,
      estado_panel: scoreData.nivelInfo.estado_panel,
      nivelColor: scoreData.nivelInfo.color,
      nivelDescripcion: scoreData.nivelInfo.descripcion,
      condicionesCumplidas: scoreData.condSi,
      totalCondiciones: 7,

      recomendaciones,
      compromisos,
      observacionesGenerales: recomendaciones
    };
  }