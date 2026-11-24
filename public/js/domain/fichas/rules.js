/**
 * public/js/calc/reglas.js
 * Reglas de nivel predefinidas para los diferentes instrumentos de monitoreo
 * UGEL 03 Â· AGEBRE
 */

/** Regla oficial de la ficha JEC (ImplementaciÃ³n del MSE) */
export const REGLA_NIVEL_JEC = {
  tipo:   'conteo',
  cuenta: 'si',
  rangos: [
    { nivel:        'Logrado',    min: 24, max: 31, estado_panel: 'Logrado'    },
    { nivel:        'Proceso',    min: 12, max: 23, estado_panel: 'En proceso' },
    { nivel:        'Inicio', min:  0, max: 11, estado_panel: 'Inicio'     },
  ],
};

/** Regla oficial de la Ficha JEC 3er Momento (Salida - 26 ítems) */
export const REGLA_NIVEL_JEC_3ER_MOMENTO = {
  tipo:   'conteo',
  cuenta: 'si',
  rangos: [
    { nivel:        'Logrado',    min: 21, max: 26, estado_panel: 'Logrado'    },
    { nivel:        'Proceso',    min: 14, max: 20, estado_panel: 'En proceso' },
    { nivel:        'Inicio', min:  0, max: 13, estado_panel: 'Inicio'     },
  ],
};

/** Regla oficial de la Ficha del 1er Monitoreo a la ImplementaciÃ³n del Modelo JEC (37 Ã­tems con escala 1,2,3 - Total 111 pts) */
export const REGLA_NIVEL_JEC_1ER_MOMENTO = {
  tipo:       'puntaje',
  escala:     'escala_1_3',
  maxPuntaje: 111,
  minPuntaje: 1,
  nota:       'Regla oficial 1er Monitoreo JEC: Inicio (1 a 56), Proceso (57 a 83), Logrado (84 a 111)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          84,
      max:          111,
      estado_panel: 'Logrado',
      descripcion:  'La IE cumple con la mayorÃ­a de los Ã­tems establecidos.'
    },
    {
      nivel:        'Proceso',
      min:          57,
      max:          83,
      estado_panel: 'En proceso',
      descripcion:  'La IE cumple con mÃ¡s de la mitad de los Ã­tems establecidos.'
    },
    {
      nivel:        'Inicio',
      min:          1,
      max:          56,
      estado_panel: 'Inicio',
      descripcion:  'La IE cumple con algunos de los Ã­tems establecidos.'
    },
  ],
};

/** Regla oficial de la Ficha de Monitoreo a las Funciones del Coordinador(a) de TutorÃ­a (JEC) (21 Ã­tems, mÃ¡x 63 pts) */
export const REGLA_NIVEL_COORD_TUTORIA_JEC = {
  tipo:       'puntaje',
  escala:     'escala_1_3',
  maxPuntaje: 63,
  minPuntaje: 21,
  nota:       'Regla oficial Coordinador(a) de TutorÃ­a JEC: Cumple (53â€“63), Cumple parcialmente (42â€“52), No cumple (21â€“41)',
  rangos: [
    {
      nivel:        'Cumple',
      min:          53,
      max:          63,
      estado_panel: 'Logrado',
      descripcion:  'El/la coordinador(a) de tutorÃ­a cumple con la funciÃ³n de manera oportuna, pertinente y sostenida.'
    },
    {
      nivel:        'Cumple parcialmente',
      min:          42,
      max:          52,
      estado_panel: 'En proceso',
      descripcion:  'El/la coordinador(a) de tutorÃ­a cumple parcialmente con la funciÃ³n o se encuentra en proceso de consolidaciÃ³n.'
    },
    {
      nivel:        'No cumple',
      min:          21,
      max:          41,
      estado_panel: 'Inicio',
      descripcion:  'El/la coordinador(a) de tutorÃ­a no cumple o cumple de forma mÃ­nima, sin responder al propÃ³sito pedagÃ³gico esperado.'
    },
  ],
};

/** Regla oficial de la Ficha de Monitoreo a las Funciones que cumple el/la Coordinador(a) PedagÃ³gico (JEC) (17 Ã­tems, mÃ¡x 51 pts) */
export const REGLA_NIVEL_COORD_PEDAGOGICO = {
  tipo:       'puntaje',
  escala:     'escala_1_3',
  maxPuntaje: 51,
  minPuntaje: 17,
  totalItems: 17,
  nota:       'Regla oficial Coordinador(a) PedagÃ³gico JEC: Cumple (41â€“51), Cumple parcialmente (28â€“40), No cumple (17â€“27)',
  rangos: [
    {
      nivel:        'Cumple',
      min:          41,
      max:          51,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'El/la coordinador(a) pedagÃ³gico cumple con la funciÃ³n de manera oportuna, pertinente y sostenida.'
    },
    {
      nivel:        'Cumple parcialmente',
      min:          28,
      max:          40,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'El/la coordinador(a) pedagÃ³gico cumple parcialmente con la funciÃ³n o se encuentra en proceso de consolidaciÃ³n.'
    },
    {
      nivel:        'No cumple',
      min:          17,
      max:          27,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'El/la coordinador(a) pedagÃ³gico no cumple o cumple de forma mÃ­nima, sin responder al propÃ³sito pedagÃ³gico esperado.'
    },
  ],
};

/** Regla genÃ©rica por porcentaje (usar para fichas sin regla oficial) */
export const REGLA_NIVEL_GENERICA = {
  tipo: 'porcentaje',
  umbrales: [
    { nivel:        'Logrado',     min: 85, estado_panel: 'Logrado'    },
    { nivel: 'En proceso',  min: 70, estado_panel: 'En proceso' },
    { nivel: 'Por mejorar', min:  0, estado_panel: 'Inicio'     },
  ],
};

/**
 * Especialista Oficial designada para la supervisiÃ³n y monitoreo del Modelo JEC
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
  entidad: 'UGEL 03',
  correo: 'farias@ugel03.gob.pe'
};

/** Regla oficial 1er Momento: Monitoreo y Asistencia TÃ©cnica a la GestiÃ³n Escolar EBR (19 Ã­tems, mÃ¡x 57 pts) */
export const REGLA_NIVEL_EBR_GESTION_M1 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    1,
  visita:     1,
  maxPuntaje: 57,
  minPuntaje: 0,
  totalItems: 19,
  nota:       'Regla oficial 1er Momento EBR GestiÃ³n Escolar: Inicio (0â€“19), Proceso (20â€“38), Logrado (39â€“57)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          39,
      max:          57,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: La IE evidencia un nivel Ã³ptimo en las condiciones y compromisos de gestiÃ³n escolar (39 a 57 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          20,
      max:          38,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: La IE se encuentra en proceso de implementaciÃ³n y requiere consolidar acciones de mejora (20 a 38 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          19,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: La IE requiere asistencia tÃ©cnica prioritaria para el cumplimiento de las condiciones de gestiÃ³n (0 a 19 puntos).'
    },
  ],
};

/** Regla oficial 2do Momento: Monitoreo y Asistencia TÃ©cnica a la GestiÃ³n Escolar EBR (23 Ã­tems, mÃ¡x 69 pts) */
export const REGLA_NIVEL_EBR_GESTION_M2 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    2,
  visita:     2,
  maxPuntaje: 69,
  minPuntaje: 0,
  totalItems: 23,
  nota:       'Regla oficial 2do Momento EBR GestiÃ³n Escolar: Inicio (0â€“23), Proceso (24â€“46), Logrado (47â€“69)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          47,
      max:          69,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: La IE evidencia un nivel Ã³ptimo en las condiciones y compromisos de gestiÃ³n escolar (47 a 69 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          24,
      max:          46,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: La IE se encuentra en proceso de implementaciÃ³n y requiere consolidar acciones de mejora (24 a 46 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          23,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: La IE requiere asistencia tÃ©cnica prioritaria para el cumplimiento de las condiciones de gestiÃ³n (0 a 23 puntos).'
    },
  ],
};

/** Regla oficial 3er Momento: Monitoreo y Asistencia TÃ©cnica a la GestiÃ³n Escolar EBR (18 Ã­tems base, mÃ¡x 54 pts) */
export const REGLA_NIVEL_EBR_GESTION_M3 = {
  tipo:       'puntaje',
  escala:     'IPL',
  momento:    3,
  visita:     3,
  maxPuntaje: 54,
  minPuntaje: 0,
  totalItems: 18,
  nota:       'Regla oficial 3er Momento EBR GestiÃ³n Escolar (18 Ã­tems): Inicio (0â€“18), Proceso (19â€“36), Logrado (37â€“54)',
  rangos: [
    {
      nivel:        'Logrado',
      min:          37,
      max:          54,
      estado_panel: 'Logrado',
      cls:          'st-logrado',
      color:        '#16A34A',
      descripcion:  'Nivel Logrado: Cumplimiento Ã³ptimo en el balance y cierre de gestiÃ³n escolar (37 a 54 puntos).'
    },
    {
      nivel:        'Proceso',
      min:          19,
      max:          36,
      estado_panel: 'En proceso',
      cls:          'st-proceso',
      color:        '#D97706',
      descripcion:  'Nivel Proceso: En proceso de consolidaciÃ³n de resultados anuales (19 a 36 puntos).'
    },
    {
      nivel:        'Inicio',
      min:          0,
      max:          18,
      estado_panel: 'Inicio',
      cls:          'st-inicio',
      color:        '#DC2626',
      descripcion:  'Nivel Inicio: Requiere asistencia tÃ©cnica prioritaria en el balance institucional (0 a 18 puntos).'
    },
  ],
};
