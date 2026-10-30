/* =========================================================================
   directorio/constants.js — Constantes y mapeos de columnas del Directorio
   UGEL 03 – Panel de Monitoreo y Acompañamiento 2026
   ========================================================================= */

/**
 * Mapeo explícito de las 17 columnas oficiales en orden estricto (A–Q)
 * Idéntico a la plantilla oficial E2_Directorio_de_Directores_por_IE.xlsm
 */
export const COLUMNAS = [
  ['rei', 'REI'],
  ['codigoLocal', 'Código local'],
  ['ie', 'I.E.'],
  ['modalidad', 'Modalidad'],
  ['nivelServicio', 'Nivel_sevicio'],
  ['turnos', 'Turnos'],
  ['tipoGestion', 'Tipo de Gestión'],
  ['dependencia', 'Dependencia'],
  ['distrito', 'Distrito'],
  ['dirNombres', 'Apellidos y nombres'],
  ['dirDni', 'DNI'],
  ['dirTelefono', 'Teléfono'],
  ['dirCorreo', 'Correo'],
  ['subNombres', 'Apellidos y nombres'],
  ['subDni', 'DNI'],
  ['subTelefono', 'Teléfono'],
  ['subCorreo', 'Correo'],
];

/** Anchos de columna oficiales exactos A–Q */
export const ANCHOS_COLUMNA = [
  7.86,  // A: REI
  8.29,  // B: Código local
  46,    // C: I.E.
  8.29,  // D: Modalidad
  24,    // E: Nivel_sevicio
  13.43, // F: Turnos
  22.57, // G: Tipo de Gestión
  17.86, // H: Dependencia
  17.86, // I: Distrito
  48,    // J: Apellidos y nombres (Director)
  12.57, // K: DNI (Director)
  30.43, // L: Teléfono (Director)
  36,    // M: Correo (Director)
  48.57, // N: Apellidos y nombres (Subdirector)
  9.43,  // O: DNI (Subdirector)
  11.29, // P: Teléfono (Subdirector)
  42.43  // Q: Correo (Subdirector)
];
