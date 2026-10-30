/**
 * public/js/calc/reglas.js
 * Reglas de nivel predefinidas para los diferentes instrumentos de monitoreo
 * UGEL 03 · AGEBRE
 */

/** Regla oficial de la ficha JEC (Implementación del MSE) */
export const REGLA_NIVEL_JEC = {
  tipo:   'conteo',
  cuenta: 'si',
  rangos: [
    { nivel: 'Implementación lograda',    min: 24, max: 31, estado_panel: 'Logrado'    },
    { nivel: 'Implementación parcial',    min: 12, max: 23, estado_panel: 'En proceso' },
    { nivel: 'Implementación incipiente', min:  0, max: 11, estado_panel: 'Inicio'     },
  ],
};

/** Regla oficial de la Ficha del 1er Monitoreo a la Implementación del Modelo JEC (37 ítems con escala 1,2,3 - Total 111 pts) */
export const REGLA_NIVEL_JEC_1ER_MOMENTO = {
  tipo:       'puntaje',
  escala:     'escala_1_3',
  maxPuntaje: 111,
  minPuntaje: 1,
  nota:       'Regla oficial 1er Monitoreo JEC: Inicio (1 a 56), Proceso (57 a 83), Logrado (84 a 111)',
  rangos: [
    {
      nivel:        'LOGRADO',
      min:          84,
      max:          111,
      estado_panel: 'Logrado',
      descripcion:  'La IE cumple con la mayoría de los ítems establecidos.'
    },
    {
      nivel:        'PROCESO',
      min:          57,
      max:          83,
      estado_panel: 'En proceso',
      descripcion:  'La IE cumple con más de la mitad de los ítems establecidos.'
    },
    {
      nivel:        'INICIO',
      min:          1,
      max:          56,
      estado_panel: 'Inicio',
      descripcion:  'La IE cumple con algunos de los ítems establecidos.'
    },
  ],
};

/** Regla oficial de la Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC) (21 ítems, máx 63 pts) */
export const REGLA_NIVEL_COORD_TUTORIA_JEC = {
  tipo:       'puntaje',
  escala:     'escala_1_3',
  maxPuntaje: 63,
  minPuntaje: 21,
  nota:       'Regla oficial Coordinador(a) de Tutoría JEC: Cumple (53–63), Cumple parcialmente (42–52), No cumple (21–41)',
  rangos: [
    {
      nivel:        'Cumple',
      min:          53,
      max:          63,
      estado_panel: 'Logrado',
      descripcion:  'El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.'
    },
    {
      nivel:        'Cumple parcialmente',
      min:          42,
      max:          52,
      estado_panel: 'En proceso',
      descripcion:  'El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.'
    },
    {
      nivel:        'No cumple',
      min:          21,
      max:          41,
      estado_panel: 'Inicio',
      descripcion:  'El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.'
    },
  ],
};

/** Regla oficial de la Ficha de Monitoreo a las Funciones que cumple el/la Coordinador(a) Pedagógico (JEC) (17 ítems, máx 51 pts) */
export const REGLA_NIVEL_COORD_PEDAGOGICO = {
  tipo:       'puntaje',
  escala:     'escala_1_3',
  maxPuntaje: 51,
  minPuntaje: 17,
  totalItems: 17,
  nota:       'Regla oficial Coordinador(a) Pedagógico JEC: Cumple (41–51), Cumple parcialmente (28–40), No cumple (17–27)',
  rangos: [
    {
      nivel:        'Cumple',
      min:          41,
      max:          51,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'El/la coordinador(a) pedagógico cumple con la función de manera oportuna, pertinente y sostenida.'
    },
    {
      nivel:        'Cumple parcialmente',
      min:          28,
      max:          40,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'El/la coordinador(a) pedagógico cumple parcialmente con la función o se encuentra en proceso de consolidación.'
    },
    {
      nivel:        'No cumple',
      min:          17,
      max:          27,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'El/la coordinador(a) pedagógico no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.'
    },
  ],
};

/** Regla genérica por porcentaje (usar para fichas sin regla oficial) */
export const REGLA_NIVEL_GENERICA = {
  tipo: 'porcentaje',
  umbrales: [
    { nivel: 'Logrado',     min: 85, estado_panel: 'Logrado'    },
    { nivel: 'En proceso',  min: 70, estado_panel: 'En proceso' },
    { nivel: 'Por mejorar', min:  0, estado_panel: 'Inicio'     },
  ],
};

/**
 * Especialista Oficial designada para la supervisión y monitoreo del Modelo JEC
 * (Fanny Liliana Arias Quiróz - Especialista de JEC - UGEL 03)
 */
export const ESPECIALISTA_JEC_OFICIAL = {
  nombresApellidos: 'Fanny Liliana Arias Quiróz',
  cargo: 'Especialista de JEC',
  especialidad: 'Especialista JEC',
  area: 'AGEBRE – JEC',
  modalidad: 'EBR',
  red: 'MSE JEC (Todas las REI)',
  distrito: 'UGEL 03',
  correo: 'farias@ugel03.gob.pe'
};

/** Regla oficial 1er Momento: Monitoreo y Asistencia Técnica a la Gestión Escolar EBR (19 ítems, máx 57 pts) */
export const REGLA_NIVEL_EBR_GESTION_M1 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    1,
  visita:     1,
  maxPuntaje: 57,
  minPuntaje: 0,
  totalItems: 19,
  nota:       'Regla oficial 1er Momento EBR Gestión Escolar: Inicio (0–19), Proceso (20–38), Logrado (39–57)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          39,
      max:          57,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: La IE evidencia un nivel óptimo en las condiciones y compromisos de gestión escolar (39 a 57 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          20,
      max:          38,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: La IE se encuentra en proceso de implementación y requiere consolidar acciones de mejora (20 a 38 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          19,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: La IE requiere asistencia técnica prioritaria para el cumplimiento de las condiciones de gestión (0 a 19 puntos).'
    },
  ],
};

/** Regla oficial 2do Momento: Monitoreo y Asistencia Técnica a la Gestión Escolar EBR (23 ítems, máx 69 pts) */
export const REGLA_NIVEL_EBR_GESTION_M2 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    2,
  visita:     2,
  maxPuntaje: 69,
  minPuntaje: 0,
  totalItems: 23,
  nota:       'Regla oficial 2do Momento EBR Gestión Escolar: Inicio (0–23), Proceso (24–46), Logrado (47–69)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          47,
      max:          69,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: La IE evidencia un nivel óptimo en las condiciones y compromisos de gestión escolar (47 a 69 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          24,
      max:          46,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: La IE se encuentra en proceso de implementación y requiere consolidar acciones de mejora (24 a 46 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          23,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: La IE requiere asistencia técnica prioritaria para el cumplimiento de las condiciones de gestión (0 a 23 puntos).'
    },
  ],
};

/** Regla oficial 3er Momento: Monitoreo y Asistencia Técnica a la Gestión Escolar EBR (15 ítems base, máx 45 pts) */
export const REGLA_NIVEL_EBR_GESTION_M3 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    3,
  visita:     3,
  maxPuntaje: 45,
  minPuntaje: 0,
  totalItems: 15,
  nota:       'Regla oficial 3er Momento EBR Gestión Escolar: Inicio (0–15), Proceso (16–30), Logrado (31–45)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          31,
      max:          45,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: Cumplimiento óptimo en el balance y cierre de gestión escolar (31 a 45 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          16,
      max:          30,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: En proceso de consolidación de resultados anuales (16 a 30 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          15,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: Requiere asistencia técnica prioritaria en el balance institucional (0 a 15 puntos).'
    },
  ],
};
