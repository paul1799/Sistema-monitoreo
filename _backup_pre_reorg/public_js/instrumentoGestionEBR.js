/* =========================================================================
   instrumentoGestionEBR.js — Configuracion declarativa y versionada del
   instrumento "Monitoreo y Asistencia Tecnica a la Gestion Escolar"
   UGEL 03 - AGEBRE - EBR (2026)
   ========================================================================= */

export const UMBRAL_INICIO   = 1;
export const UMBRAL_PROCESO  = 2;
export const UMBRAL_LOGRADO  = 3;

export const COLORES_ESTADO_EBR = {
  'LOGRADO':   { fondo: 'C6EFCE', letra: '006100', hex: '#C6EFCE' },
  'PROCESO':   { fondo: 'FFEB9C', letra: '9C5700', hex: '#FFEB9C' },
  'INICIO':    { fondo: 'FFC7CE', letra: '9C0006', hex: '#FFC7CE' },
  'NO INICIO': { fondo: 'D9D9D9', letra: '595959', hex: '#D9D9D9' },
};

const VERSION_ACTIVA = '2026-v1';

const VISITA_1_SECCIONES = [
  {
    codigo: '4.1', nombre: 'Monitoreo y acompanamiento a la practica docente',
    items: [
      { codigo: 'ITEM_4.1.1', codigoV: 'V1_ITEM_4.1.1', numFicha: 1, texto: 'El equipo directivo cuenta con Plan de Monitoreo y Acompanamiento, el cual incluye una matriz de diagnostico de necesidades formativas y el cronograma correspondiente, el cual ha sido socializado.' },
      { codigo: 'ITEM_4.1.2', codigoV: 'V1_ITEM_4.1.2', numFicha: 2, texto: 'El equipo directivo realiza la sistematizacion del monitoreo a la practica pedagogica en sus tres etapas (inicio, proceso y salida).' },
      { codigo: 'ITEM_4.1.3', codigoV: 'V1_ITEM_4.1.3', numFicha: 3, texto: 'El equipo directivo, a partir del analisis del monitoreo a la practica docente, identifica logros y necesidades formativas, los cuales son socializados en las semanas de gestion.' }
    ]
  },
  {
    codigo: '4.2', nombre: 'Fortalecimiento docente',
    items: [
      { codigo: 'ITEM_4.2.1', codigoV: 'V1_ITEM_4.2.1', numFicha: 4, texto: 'El equipo directivo ejecuta y gestiona espacios de fortalecimiento alineados a las necesidades formativas detectadas y realiza el seguimiento a los compromisos de mejora asumidos.' },
      { codigo: 'ITEM_4.2.2', codigoV: 'V1_ITEM_4.2.2', numFicha: 5, texto: 'El equipo directivo cuenta con un plan de acciones formativas donde considera la realizacion de GIA, microtalleres, pasantias, etc.' }
    ]
  },
  {
    codigo: '4.3', nombre: 'Evaluacion de los aprendizajes / Refuerzo escolar',
    items: [
      { codigo: 'ITEM_4.3.1', codigoV: 'V1_ITEM_4.3.1', numFicha: 6, texto: 'Los directivos sistematizan, analizan y reflexionan sobre los resultados de la evaluacion diagnostica por competencias.' },
      { codigo: 'ITEM_4.3.2', codigoV: 'V1_ITEM_4.3.2', numFicha: 7, texto: 'Cuenta con la planificacion de las actividades para la aplicacion de la Evaluacion Diagnostica.' },
      { codigo: 'ITEM_4.3.3', codigoV: 'V1_ITEM_4.3.3', numFicha: 8, texto: 'El directivo sistematiza, analiza y reflexiona sobre los resultados de aprendizaje de la evaluacion diagnostica por competencias de las areas de Comunicacion y Matematica, a fin de proponer acciones de mejora. (Primaria y Secundaria)' },
      { codigo: 'ITEM_4.3.4', codigoV: 'V1_ITEM_4.3.4', numFicha: 9, texto: 'En la I.E. se ejecutan jornadas informativas con los PP.FF. sobre los aprendizajes, reportando avances en los niveles de logro y el establecimiento de compromisos de mejora.' },
      { codigo: 'ITEM_4.3.5', codigoV: 'V1_ITEM_4.3.5', numFicha: 10, texto: 'La IE ha establecido el horario de los docentes para implementar las acciones del R.E. de acuerdo con lo establecido en la RVM N.o 094-2025-MINEDU.' },
      { codigo: 'ITEM_4.3.6', codigoV: 'V1_ITEM_4.3.6', numFicha: 11, texto: 'La IE ha incluido en el PAT las acciones para implementar RE. (Primaria y Secundaria)' },
      { codigo: 'ITEM_4.3.7', codigoV: 'V1_ITEM_4.3.7', numFicha: 12, texto: 'El equipo directivo realiza acciones de monitoreo y acompanamiento a la implementacion de Refuerzo Escolar en cada etapa.' }
    ]
  },
  {
    codigo: '4.4', nombre: 'Uso de materiales y espacios educativos',
    items: [
      { codigo: 'ITEM_4.4.1', codigoV: 'V1_ITEM_4.4.1', numFicha: 13, texto: 'El equipo directivo genera y promueve espacios de fortalecimiento docente sobre el uso pedagogico de los materiales educativos.' },
      { codigo: 'ITEM_4.4.2', codigoV: 'V1_ITEM_4.4.2', numFicha: 14, texto: 'El equipo directivo monitorea el uso adecuado de los materiales educativos en las sesiones de aprendizaje.' },
      { codigo: 'ITEM_4.4.3', codigoV: 'V1_ITEM_4.4.3', numFicha: 15, texto: 'El equipo directivo promueve el uso de espacios educativos de la I.E., asi como el empleo de materiales educativos diversos (laboratorios, talleres, bibliotecas, aulas flexibles, AIP, entre otros).' },
      { codigo: 'ITEM_4.4.4', codigoV: 'V1_ITEM_4.4.4', numFicha: 16, texto: 'El Profesor de Innovacion Pedagogica (PIP) realiza acciones de fortalecimiento con la comunidad educativa, promoviendo la incorporacion de las TIC en los procesos pedagogicos.', evidencia: 'Plan de trabajo / actas de reuniones, evidencias de actividades / informe PIP.' }
    ]
  },
  {
    codigo: '4.5', nombre: 'Otros aspectos',
    items: [
      { codigo: 'ITEM_4.5.1', codigoV: 'V1_ITEM_4.5.1', numFicha: 17, texto: 'Plan lector: Se cuenta con Plan Lector aprobado con RD y en el PAT, y considera las etapas; muestra la implementacion segun cronograma.' },
      { codigo: 'ITEM_4.5.2', codigoV: 'V1_ITEM_4.5.2', numFicha: 18, texto: 'Implementacion del enfoque ambiental: La IE cuenta con el Proyecto Educativo Ambiental Integrado (PEAI) y RD de conformacion de las Brigadas de Educacion Ambiental y Gestion de Riesgo de Desastres.' },
      { codigo: 'ITEM_4.5.3', codigoV: 'V1_ITEM_4.5.3', numFicha: 19, texto: 'Innovacion educativa: El directivo ha identificado e implementado buenas practicas (pedagogicas y/o de gestion) y/o proyecto(s) de innovacion en la IE.', tieneProyectosList: true }
    ]
  }
];

const VISITA_2_SECCIONES = [
  {
    codigo: '6.1', nombre: 'Monitoreo y acompanamiento a la practica docente',
    items: [
      { codigo: 'ITEM_6.1.1', codigoV: 'V2_ITEM_6.1.1', numFicha: 1, texto: 'El equipo directivo realiza el monitoreo y acompanamiento a los docentes segun el cronograma establecido, promoviendo un dialogo reflexivo con cada docente visitado.' },
      { codigo: 'ITEM_6.1.2', codigoV: 'V2_ITEM_6.1.2', numFicha: 2, texto: 'El equipo directivo realiza la sistematizacion del monitoreo a la practica pedagogica en sus tres etapas (inicio, proceso y salida).' },
      { codigo: 'ITEM_6.1.3', codigoV: 'V2_ITEM_6.1.3', numFicha: 3, texto: 'El equipo directivo, a partir del analisis del monitoreo a la practica docente, identifica logros y necesidades formativas, los cuales son socializados en las semanas de gestion.' }
    ]
  },
  {
    codigo: '6.2', nombre: 'Fortalecimiento docente',
    items: [
      { codigo: 'ITEM_6.2.1', codigoV: 'V2_ITEM_6.2.1', numFicha: 4, texto: 'El equipo directivo promueve la participacion de los docentes en las ofertas formativas brindadas por MINEDU, DRELM o UGEL y realiza el seguimiento.' },
      { codigo: 'ITEM_6.2.2', codigoV: 'V2_ITEM_6.2.2', numFicha: 5, texto: 'El equipo directivo ejecuta acciones formativas, en relacion a las necesidades encontradas, como: GIA, microtalleres, pasantias, etc., de acuerdo con el cronograma establecido en su plan.' }
    ]
  },
  {
    codigo: '6.3', nombre: 'Evaluacion de los aprendizajes / Refuerzo escolar',
    items: [
      { codigo: 'ITEM_6.3.1', codigoV: 'V2_ITEM_6.3.1', numFicha: 6, texto: 'El equipo directivo sistematiza, analiza y reflexiona sobre los resultados de aprendizaje por competencias en las areas de Comunicacion y Matematica, con el proposito de proponer acciones de mejora.' },
      { codigo: 'ITEM_6.3.2', codigoV: 'V2_ITEM_6.3.2', numFicha: 7, texto: 'A partir de la evaluacion diagnostica, la IE incorpora en su PAT metas de aprendizaje contextualizadas que responden a las caracteristicas y necesidades de los estudiantes.' },
      { codigo: 'ITEM_6.3.3', codigoV: 'V2_ITEM_6.3.3', numFicha: 8, texto: 'Se cuenta con evidencias para el reporte del Informe de las actividades de atencion diferenciada realizada con los estudiantes en el horario de RE. (Primaria PM 373 - Inst. 749; Secundaria PM 377 - Inst. 763).' },
      { codigo: 'ITEM_6.3.4', codigoV: 'V2_ITEM_6.3.4', numFicha: 9, texto: 'Se cuenta con evidencias de fortalecimiento y/o acompanamiento pedagogico a los docentes sobre Refuerzo Escolar. Se ha preparado el informe para el Registro en SIMON. (Primaria PM 373 - Inst. 749; Secundaria PM 377 - Inst. 763).' }
    ]
  },
  {
    codigo: '6.4', nombre: 'Uso de materiales y espacios educativos',
    items: [
      { codigo: 'ITEM_6.4.1', codigoV: 'V2_ITEM_6.4.1', numFicha: 10, texto: 'El equipo directivo realiza acciones de fortalecimiento docente sobre el uso pedagogico de los materiales educativos.' },
      { codigo: 'ITEM_6.4.2', codigoV: 'V2_ITEM_6.4.2', numFicha: 11, texto: 'El equipo directivo monitorea el uso adecuado de los cuadernos de trabajo y textos escolares en las sesiones de aprendizaje.' },
      { codigo: 'ITEM_6.4.3', codigoV: 'V2_ITEM_6.4.3', numFicha: 12, texto: 'Cuenta con espacios ludicos matematicos implementados con materiales concretos proporcionados por el MINEDU u otros. (Primaria y secundaria).' },
      { codigo: 'ITEM_6.4.4', codigoV: 'V2_ITEM_6.4.4', numFicha: 13, texto: 'El equipo directivo promueve el uso de espacios y materiales educativos diversos, generando mejores condiciones para los aprendizajes (laboratorios, talleres, bibliotecas, aulas flexibles, AIP, entre otros).' },
      { codigo: 'ITEM_6.4.5', codigoV: 'V2_ITEM_6.4.5', numFicha: 14, texto: 'El Profesor de Innovacion Pedagogica (PIP) realiza acciones de fortalecimiento con la comunidad educativa, promoviendo la incorporacion de las TIC en los procesos pedagogicos. (Primaria y Secundaria).' },
      { codigo: 'ITEM_6.4.6', codigoV: 'V2_ITEM_6.4.6', numFicha: 15, texto: 'El equipo directivo realiza el seguimiento al plan de trabajo del PIP, cumpliendo con presentar el reporte de las actividades realizadas. (Primaria y Secundaria).' },
      { codigo: 'ITEM_6.4.7', codigoV: 'V2_ITEM_6.4.7', numFicha: 16, texto: 'En la IE se realiza el monitoreo a la implementacion de la estrategia Khan Academy; cuyo cierre esta programado hasta el 30 de octubre en la plataforma Mundo IE.' }
    ]
  },
  {
    codigo: '6.5', nombre: 'Otros aspectos',
    items: [
      { codigo: 'ITEM_6.5.1', codigoV: 'V2_ITEM_6.5.1', numFicha: 17, texto: 'INNOVACION EDUCATIVA: El directivo ha identificado e implementado buenas practicas y/o Proyecto(s) de Innovacion en la IE y los ha incluido en el PAT actualizado.', tieneProyectosList: true },
      { codigo: 'ITEM_6.5.2', codigoV: 'V2_ITEM_6.5.2', numFicha: 18, texto: 'Presenta evidencias de los avances o resultados de la implementacion de Buenas Practicas o Proyectos Innovadores.' },
      { codigo: 'ITEM_6.5.3', codigoV: 'V2_ITEM_6.5.3', numFicha: 19, texto: 'PLAN LECTOR: Ha monitoreado la implementacion de las actividades consideradas en el Plan Lector segun la RVM N.o 062-2021-MINEDU.' },
      { codigo: 'ITEM_6.5.4', codigoV: 'V2_ITEM_6.5.4', numFicha: 20, texto: 'Ha aplicado ficha de monitoreo en el momento/hora de la lectura.' },
      { codigo: 'ITEM_6.5.5', codigoV: 'V2_ITEM_6.5.5', numFicha: 21, texto: 'IMPLEMENTACION DEL ENFOQUE AMBIENTAL - PEAI: Monitorea la implementacion de actividades segun el PEAI propuestas en el plan de trabajo.' },
      { codigo: 'ITEM_6.5.6', codigoV: 'V2_ITEM_6.5.6', numFicha: 22, texto: 'VIDA ACTIVA Y SALUDABLE: Presenta el Plan de Trabajo de Vida Activa y Saludable.' },
      { codigo: 'ITEM_6.5.7', codigoV: 'V2_ITEM_6.5.7', numFicha: 23, texto: 'Registra en el SIMON el Plan de monitoreo 393 - Inst. 794 (hasta el 30 de agosto) y 795 (hasta el 18 de diciembre).' }
    ]
  }
];

const _VERSIONES = {};
_VERSIONES[VERSION_ACTIVA + '_visita1'] = { id: VERSION_ACTIVA + '_visita1', version: VERSION_ACTIVA, visita: 1, etiqueta: 'Visita 1 - Primer momento', prefijoIndicadores: '4', normativa: 'RVM N.o 094-2025-MINEDU', totalItems: 19, totalAspectos: 5, tieneTablasDocentes: false, secciones: VISITA_1_SECCIONES };
_VERSIONES[VERSION_ACTIVA + '_visita2'] = { id: VERSION_ACTIVA + '_visita2', version: VERSION_ACTIVA, visita: 2, etiqueta: 'Visita 2 - Segundo momento', prefijoIndicadores: '6', normativa: 'RM N.o 501-2025-MINEDU', totalItems: 23, totalAspectos: 5, tieneTablasDocentes: true, secciones: VISITA_2_SECCIONES };

export const INSTRUMENTO_EBR = {
  versiones: _VERSIONES,
  activo: VERSION_ACTIVA,
  getConfig(visita, version) {
    const v = version || this.activo;
    return this.versiones[v + '_visita' + visita] || (visita === 2 ? _VERSIONES[VERSION_ACTIVA + '_visita2'] : _VERSIONES[VERSION_ACTIVA + '_visita1']);
  },
  getItems(visita, version) {
    const cfg = this.getConfig(visita, version);
    const items = [];
    (cfg.secciones || []).forEach(sec => (sec.items || []).forEach(it => items.push({ ...it, aspecto: sec.nombre, codigoAspecto: sec.codigo })));
    return items;
  }
};

export function valorANumericoEbr(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const v = String(valor).trim().toLowerCase();
  if (v === 'na' || v === 'nc') return null;
  if (v === 'logrado' || v === '3') return 3;
  if (v === 'proceso' || v === '2') return 2;
  if (v === 'inicio' || v === '1') return 1;
  if (v === 'si') return 3;
  if (v === 'no') return 1;
  return null;
}

export function promedioAspectoEbr(valores) {
  if (!Array.isArray(valores) || !valores.length) return 0;
  const nums = valores.map(valorANumericoEbr).filter(v => v !== null);
  if (!nums.length) return 0;
  return Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 100) / 100;
}

export function resultadoEbr(promediosAspecto) {
  if (!Array.isArray(promediosAspecto) || !promediosAspecto.length) return 0;
  const suma = promediosAspecto.reduce((a, b) => a + (Number(b) || 0), 0);
  return Math.round((suma / promediosAspecto.length) * 100) / 100;
}

export function estadoEbr(resultado) {
  const r = Number(resultado) || 0;
  if (r === 0) return 'NO INICIO';
  if (r <= UMBRAL_INICIO) return 'INICIO';
  if (r <= UMBRAL_PROCESO) return 'PROCESO';
  return 'LOGRADO';
}

export function avanceEbr(resultado) {
  return (Number(resultado) || 0) === 0 ? 'PENDIENTE' : 'EJECUTADO';
}

export function calcularResultadoEbr(ficha, visita, version) {
  if (!ficha) return { promediosPorAspecto: [], resultado: 0, estado: 'NO INICIO', avance: 'PENDIENTE' };
  const cfg = INSTRUMENTO_EBR.getConfig(visita, version);
  const respuestas = ficha.respuestas || ficha.items || [];
  const mapaR = {};
  if (Array.isArray(respuestas)) {
    respuestas.forEach(r => {
      if (r && r.id) mapaR[r.id] = r.valor;
      if (r && r.num) mapaR['num_' + r.num] = r.valor;
    });
  } else if (typeof respuestas === 'object') {
    Object.assign(mapaR, respuestas);
  }
  const promediosPorAspecto = (cfg.secciones || []).map(sec => ({
    codigo: sec.codigo,
    nombre: sec.nombre,
    promedio: promedioAspectoEbr((sec.items || []).map(it =>
      mapaR[it.codigoV] || mapaR[it.codigo] || mapaR['ge' + visita + '_' + it.numFicha] || mapaR['num_' + it.numFicha] || null
    ))
  }));
  const resultado = resultadoEbr(promediosPorAspecto.map(a => a.promedio));
  return { promediosPorAspecto, resultado, estado: estadoEbr(resultado), avance: avanceEbr(resultado) };
}

export function calcularResultadoEbrDesdeRespuestas(respuestasMap, visita, version) {
  const cfg = INSTRUMENTO_EBR.getConfig(visita, version);
  const mapaR = respuestasMap || {};
  const promediosPorAspecto = (cfg.secciones || []).map(sec => ({
    codigo: sec.codigo,
    nombre: sec.nombre,
    promedio: promedioAspectoEbr((sec.items || []).map(it =>
      mapaR['ge' + visita + '_' + it.numFicha] || mapaR[it.codigoV] || mapaR[it.codigo] || null
    ))
  }));
  const resultado = resultadoEbr(promediosPorAspecto.map(a => a.promedio));
  return { promediosPorAspecto, resultado, estado: estadoEbr(resultado), avance: avanceEbr(resultado) };
}

export function mesEnMayusculas(fechaStr) {
  if (!fechaStr) return '';
  const s = String(fechaStr);
  let date;
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) { date = new Date(+mIso[1], +mIso[2] - 1, +mIso[3]); }
  else {
    const mS = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    date = mS ? new Date(+mS[3], +mS[2] - 1, +mS[1]) : new Date(s);
  }
  if (isNaN(date.getTime())) return '';
  return ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SETIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'][date.getMonth()] || '';
}

export function esIeEbr(colegio) {
  if (!colegio) return null;
  const m = String(colegio.modalidad || '').trim().toUpperCase();
  if (!m) return null;
  return m === 'EBR';
}
