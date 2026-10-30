/* =========================================================================
   directorio/helpers.js — Utilidades y normalización del Directorio
   UGEL 03 – Panel de Monitoreo y Acompañamiento 2026
   ========================================================================= */

/** Normaliza texto quitando tildes, diacríticos y espacios sobrantes */
export function normalizeStr(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Limpia y asegura que los identificadores y números se guarden como texto sin perder ceros */
export function cleanTextCode(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/** Limpia correo electrónico en minúsculas */
export function cleanEmail(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase();
}

/** Obtiene la fecha y hora actual en formato ISO legible */
export function nowIso() {
  return new Date().toISOString();
}

/** Genera la fecha de hoy YYYY-MM-DD */
export function todayDateStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Detecta si un texto representa un valor de relleno / placeholder y no un directivo real.
 * Textos: "NO CUENTA CON SUB DIRECTOR", "NO CUENTA", "SIN SUBDIRECTOR", "NO TIENE", "-", "S/N", "N/A", etc.
 */
export function isPlaceholderDirectivo(str) {
  if (!str) return true;
  const n = normalizeStr(str);
  if (!n) return true;

  const placeholders = [
    'NO CUENTA CON SUB DIRECTOR',
    'NO CUENTA CON SUBDIRECTOR',
    'NO CUENTA CON SUB-DIRECTOR',
    'NO CUENTA CON SUB DIRECTOR(A)',
    'NO CUENTA CON SUBDIRECTOR(A)',
    'NO CUENTA CON DIRECTOR',
    'NO CUENTA CON DIRECTORA',
    'NO CUENTA',
    'SIN SUBDIRECTOR',
    'SIN SUB DIRECTOR',
    'SIN SUB-DIRECTOR',
    'SIN SUBDIRECTORA',
    'SIN DIRECTOR',
    'SIN DIRECTORA',
    'NO TIENE',
    'NO TIENE SUBDIRECTOR',
    'NO TIENE DIRECTOR',
    'NO POSEE',
    'NO APLICA',
    'NINGUNO',
    'NINGUNA',
    '-',
    '--',
    '---',
    '.',
    'S/N',
    'SN',
    'N/A',
    'NA',
    'S/D',
    'SD',
    'NO',
    'VACANTE',
    'SIN ASIGNAR',
    'NO REGISTRA'
  ];
  if (placeholders.includes(n)) return true;
  if (/^NO\s+CUENTA(\s+CON)?(\s+(SUB\s*)?DIRECTOR(A)?)?$/i.test(n)) return true;
  if (/^SIN\s+(SUB\s*)?DIRECTOR(A)?$/i.test(n)) return true;
  if (/^NO\s+TIENE(\s+(SUB\s*)?DIRECTOR(A)?)?$/i.test(n)) return true;
  return false;
}

/** Determina si un directivo tiene información incompleta (falta DNI, teléfono o correo) */
export function isDirectivoIncompleto(d) {
  if (!d) return true;
  const dniStr = String(d.dni || '').trim();
  const dniDigits = dniStr.replace(/\D/g, '');
  const telDigits = String(d.telefono || '').replace(/\D/g, '');
  const correo = String(d.correo || '').trim();

  // DNI válido en Perú: 7 u 8 dígitos (7 cuando Excel descarta el 0 inicial) o documento de extranjería
  const validDni = (dniDigits.length >= 7 && dniDigits.length <= 8) || (dniStr.length >= 7 && dniStr.length <= 12);
  // Teléfono válido: fijo (6-7 dígitos) o celular (9 dígitos, con o sin prefijo)
  const validTel = telDigits.length >= 6 && telDigits.length <= 11;
  // Correo institucional o personal con @
  const validCorreo = correo.length > 3 && correo.includes('@');

  return !validDni || !validTel || !validCorreo;
}

/**
 * Obtiene todos los directivos (activos e históricos) asociados a una IE
 * Busca por colegioId, codigoLocal o codigoModular
 */
export function getDirectivosForColegio(state, colegioId, codigoLocal, codigoModular) {
  const all = (state && state.directivos) || [];
  const cId = cleanTextCode(colegioId);
  const codLoc = cleanTextCode(codigoLocal);
  const codMod = cleanTextCode(codigoModular);

  return all.filter(d => {
    if (isPlaceholderDirectivo(d.apellidosNombres)) return false;
    if (cId && d.colegioId === cId) return true;
    if (codLoc && d.codigoLocal === codLoc) return true;
    if (codMod && d.codigoModular === codMod) return true;
    return false;
  });
}

/**
 * Obtiene el director activo y los subdirectores activos de una IE
 */
export function getDirectivosActivosForColegio(state, colegioId, codigoLocal, codigoModular) {
  const cId = cleanTextCode(colegioId);
  const codLoc = cleanTextCode(codigoLocal);
  const codMod = cleanTextCode(codigoModular);
  const list = getDirectivosForColegio(state, colegioId, codigoLocal, codigoModular);
  
  const directorActivo = list.find(d => d.cargo === 'Director' && d.estado === 'activo') || null;
  const subdirectoresActivos = list.filter(d => d.cargo === 'Subdirector' && d.estado === 'activo');

  // Fallback si aún no se ha sincronizado la colección directivos pero el colegio tiene datos en su registro
  if (!directorActivo && !subdirectoresActivos.length && state && state.colegios) {
    const col = state.colegios.find(c => 
      (cId && c.id === cId) || 
      (codLoc && c.codigoLocal === codLoc) ||
      (codMod && c.codigoModular === codMod)
    );
    if (col) {
      const fallbackDir = (col.director && col.director.nombre && !isPlaceholderDirectivo(col.director.nombre)) ? {
        id: 'col_' + col.id + '_dir',
        colegioId: col.id,
        codigoLocal: col.codigoLocal || '',
        codigoModular: col.codigoModular || '',
        cargo: 'Director',
        apellidosNombres: col.director.nombre,
        dni: col.director.dni || '',
        telefono: col.director.telefono || '',
        correo: col.director.correo || '',
        condicion: 'D',
        estado: 'activo',
        fuente: { tipo: 'colegios', fichaNombre: 'Padrón de Colegios' },
        actualizadoEn: ''
      } : null;

      const fallbackSub = (col.subDirector && col.subDirector.nombre && !isPlaceholderDirectivo(col.subDirector.nombre)) ? [{
        id: 'col_' + col.id + '_sub',
        colegioId: col.id,
        codigoLocal: col.codigoLocal || '',
        codigoModular: col.codigoModular || '',
        cargo: 'Subdirector',
        apellidosNombres: col.subDirector.nombre,
        dni: col.subDirector.dni || '',
        telefono: col.subDirector.telefono || '',
        correo: col.subDirector.correo || '',
        condicion: 'D',
        estado: 'activo',
        fuente: { tipo: 'colegios', fichaNombre: 'Padrón de Colegios' },
        actualizadoEn: ''
      }] : [];

      return { director: fallbackDir, subdirectores: fallbackSub };
    }
  }

  return { director: directorActivo, subdirectores: subdirectoresActivos };
}
