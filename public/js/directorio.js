/* =========================================================================
   directorio.js — Apartado "Directorio de directivos por IE"
   UGEL 03 – Panel de Monitoreo y Acompañamiento 2026
   
   Fuente única de verdad: colección 'directivos' en Firestore
   Sincronizado bidireccionalmente con Colegios y con las Fichas de Monitoreo.
   Exportación fiel de plantilla oficial E2_Directorio_de_Directores_por_IE
   ========================================================================= */

import { esc, showToast, genId, fmtDate } from './ui.js?v=20260925_v8';

/* =========================================================================
   1. UTILIDADES Y NORMALIZACIÓN
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

/**
 * Limpieza única de los registros existentes que tengan textos de relleno como nombre.
 * Convierte registros que tengan estos textos en "IE sin subdirector" (no borra directivos reales).
 */
export async function cleanExistingPlaceholderDirectivos(dbNs, state, currentUser) {
  if (typeof window !== 'undefined' && window._directorioPlaceholdersCleaned) return { cleanedCount: 0 };
  if (typeof window !== 'undefined') window._directorioPlaceholdersCleaned = true;

  let cleanedCount = 0;
  const userEmail = (currentUser && currentUser.email) || 'limpieza_sistema';

  // 1. Limpiar en state.directivos y en colección Firestore 'directivos'
  if (state && Array.isArray(state.directivos)) {
    const toDeleteIds = [];
    state.directivos = state.directivos.filter(d => {
      if (isPlaceholderDirectivo(d.apellidosNombres)) {
        if (d.id && !String(d.id).startsWith('col_')) {
          toDeleteIds.push(d.id);
        }
        cleanedCount++;
        return false;
      }
      return true;
    });

    if (dbNs && toDeleteIds.length > 0) {
      for (const id of toDeleteIds) {
        try {
          await dbNs.collection('directivos').doc(id).delete();
        } catch (e) {
          console.warn('Error eliminando directivo placeholder en Firestore:', id, e);
        }
      }
    }
  }

  // 2. Limpiar en state.colegios si subDirector o director tiene texto de relleno
  if (state && Array.isArray(state.colegios)) {
    for (const c of state.colegios) {
      let changed = false;
      const colUpdates = {};
      if (c.subDirector && isPlaceholderDirectivo(c.subDirector.nombre)) {
        c.subDirector = { nombre: '', dni: '', telefono: '', correo: '' };
        colUpdates.subDirector = c.subDirector;
        changed = true;
        cleanedCount++;
      }
      if (c.director && isPlaceholderDirectivo(c.director.nombre)) {
        c.director = { nombre: '', dni: '', telefono: '', correo: '' };
        colUpdates.director = c.director;
        changed = true;
        cleanedCount++;
      }
      if (changed && dbNs && c.id) {
        try {
          await dbNs.collection('colegios').doc(c.id).set(colUpdates, { merge: true });
        } catch (e) {
          console.warn('Error limpiando placeholders en colegio doc:', c.id, e);
        }
      }
    }
  }

  if (cleanedCount > 0) {
    console.info(`[Directorio] Limpieza de directivos ejecutada: ${cleanedCount} registro(s) de relleno corregidos.`);
  }

  return { cleanedCount };
}

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
  const s = String(val).trim();
  return s;
}

/** Limpia correo electrónico en minúsculas */
export function cleanEmail(val) {
  if (!val) return '';
  return String(val).trim().toLowerCase();
}

/** Obtiene la fecha y hora actual en formato ISO legible */
function nowIso() {
  return new Date().toISOString();
}

/** Genera la fecha de hoy YYYY-MM-DD */
function todayDateStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/** Determina si un directivo tiene información incompleta (falta DNI, teléfono o correo) */
export function isDirectivoIncompleto(d) {
  if (!d) return true;
  const noDni = !d.dni || d.dni.trim().length !== 8;
  const noTel = !d.telefono || d.telefono.trim().length !== 9;
  const noCorreo = !d.correo || !d.correo.includes('@');
  return noDni || noTel || noCorreo;
}

/* =========================================================================
   2. ACCESO A DATOS (SINGLE SOURCE OF TRUTH)
   ========================================================================= */

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

/* =========================================================================
   3. SINCRONIZACIÓN AL GUARDAR UNA FICHA DE MONITOREO
   ========================================================================= */

/**
 * Sincroniza los datos de directivos extraídos de una ficha con la colección 'directivos'
 * y refleja los cambios en 'colegios' para mantener paridad absoluta.
 * 
 * Reglas:
 * 1. Identificación por DNI; si no hay DNI, por apellidos y nombres normalizados en la misma IE.
 * 2. Si ya existe: actualizar teléfono, correo y condición SOLO si el nuevo valor no está vacío.
 * 3. Nuevo Director: el nuevo pasa a ser 'activo' y el anterior queda como 'anterior' en historial.
 * 4. Subdirectores: nuevos como 'activo'. Subdirectores ausentes no se borran; se marcan avisoRevision.
 * 5. Fichas con fecha antigua: no sobrescriben datos más recientes; solo completan campos vacíos.
 * 6. Normalización: nombres en MAYÚSCULAS, correo en minúsculas, códigos/DNI como string.
 */
export async function syncDirectivosFromFicha(dbNs, fichaPayload, activeState, currentUser, resoluciones = {}) {
  if (!dbNs || !fichaPayload) return { success: false, summary: '' };

  const userEmail = (currentUser && currentUser.email) || 'sistema';
  const timestamp = nowIso();
  const fechaVisita = fichaPayload.fecha || todayDateStr();
  const fichaId = fichaPayload.id || fichaPayload.submissionToken || 'auto';
  const fichaNombre = fichaPayload.fichaTypeNombre || 'Ficha de Monitoreo';

  // Identificar el colegio correspondiente
  const colegioId = fichaPayload.colegioId || '';
  const codigoLocal = cleanTextCode(fichaPayload.ie?.codigoLocal || fichaPayload.codigoModular || fichaPayload.codigoLocal || '');
  const institucion = (fichaPayload.institucion || '').trim();

  let matchedColegio = null;
  if (activeState && activeState.colegios) {
    matchedColegio = activeState.colegios.find(c => 
      (colegioId && c.id === colegioId) ||
      (codigoLocal && c.codigoLocal === codigoLocal) ||
      (institucion && normalizeStr(c.ie) === normalizeStr(institucion))
    );
  }

  const effectiveColId = matchedColegio ? matchedColegio.id : (colegioId || genId());
  const effectiveCodLocal = matchedColegio ? cleanTextCode(matchedColegio.codigoLocal) : codigoLocal;
  const effectiveCodMod = matchedColegio ? cleanTextCode(matchedColegio.codigoModular) : '';

  // Extraer datos del Director de la ficha
  let fichaDir = null;
  if (fichaPayload.director && (fichaPayload.director.nombres || fichaPayload.director.nombre)) {
    const rawNom = fichaPayload.director.nombres || fichaPayload.director.nombre || '';
    if (!isPlaceholderDirectivo(rawNom)) {
      fichaDir = {
        apellidosNombres: normalizeStr(rawNom),
        dni: cleanTextCode(fichaPayload.director.dni || fichaPayload.directorDni || ''),
        telefono: cleanTextCode(fichaPayload.director.telefono || ''),
        correo: cleanEmail(fichaPayload.director.correo || ''),
        condicion: fichaPayload.director.condicion || fichaPayload.condicion || 'D',
      };
    }
  } else if (fichaPayload.directorDni || fichaPayload.director) {
    const rawNom = typeof fichaPayload.director === 'string' ? fichaPayload.director : '';
    if (!isPlaceholderDirectivo(rawNom)) {
      fichaDir = {
        apellidosNombres: normalizeStr(rawNom),
        dni: cleanTextCode(fichaPayload.directorDni || ''),
        telefono: cleanTextCode(fichaPayload.directorTel || ''),
        correo: cleanEmail(fichaPayload.directorCorreo || ''),
        condicion: fichaPayload.condicion || 'D',
      };
    }
  }

  // Extraer subdirectores de la ficha (ignorando textos de relleno/placeholders)
  const fichaSubdirs = [];
  if (Array.isArray(fichaPayload.subdirectores)) {
    fichaPayload.subdirectores.forEach(sd => {
      const nom = sd.nombres || sd.nombre || '';
      if (nom && nom.trim() && !isPlaceholderDirectivo(nom)) {
        fichaSubdirs.push({
          apellidosNombres: normalizeStr(nom),
          dni: cleanTextCode(sd.dni || ''),
          telefono: cleanTextCode(sd.telefono || ''),
          correo: cleanEmail(sd.correo || ''),
          condicion: sd.condicion || 'D',
          nivelACargo: sd.nivelACargo || ''
        });
      }
    });
  }

  // Obtener directivos existentes de esta IE desde state.directivos o Firestore
  let existingDirectivos = [];
  try {
    const snap = await dbNs.collection('directivos')
      .where('codigoLocal', '==', effectiveCodLocal)
      .get();
    if (!snap.empty) {
      existingDirectivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } else if (effectiveColId) {
      const snapCol = await dbNs.collection('directivos')
        .where('colegioId', '==', effectiveColId)
        .get();
      existingDirectivos = snapCol.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('Consulta a Firestore directivos falló, usando memoria:', err);
    existingDirectivos = getDirectivosForColegio(activeState, effectiveColId, effectiveCodLocal, effectiveCodMod);
  }

  const changesSummary = [];
  const fuenteObj = {
    tipo: 'ficha',
    fichaId: fichaId,
    fichaNombre: fichaNombre,
    fechaVisita: fechaVisita
  };

  // -------------------------------------------------------------
  // A. PROCESAR DIRECTOR(A)
  // -------------------------------------------------------------
  let activeDirector = existingDirectivos.find(d => d.cargo === 'Director' && d.estado === 'activo');

  if (resoluciones.director === 'SOLO_VISITA') {
    changesSummary.push('Director(a): Ignorado por opción Solo Visita');
    fichaDir = null;
  }

  if (fichaDir && fichaDir.apellidosNombres) {
    if (!activeDirector) {
      // No había director activo: registrar nuevo
      const newDirDoc = {
        colegioId: effectiveColId,
        codigoLocal: effectiveCodLocal,
        codigoModular: effectiveCodMod,
        cargo: 'Director',
        apellidosNombres: fichaDir.apellidosNombres,
        dni: fichaDir.dni,
        telefono: fichaDir.telefono,
        correo: fichaDir.correo,
        condicion: fichaDir.condicion,
        nivelACargo: '',
        estado: 'activo',
        avisoRevision: false,
        fuente: fuenteObj,
        actualizadoPor: userEmail,
        actualizadoEn: timestamp,
        historial: [
          {
            campo: 'registro_inicial',
            valorAnterior: '',
            valorNuevo: `${fichaDir.apellidosNombres} (${fichaDir.dni || 'Sin DNI'})`,
            fuente: `${fichaNombre} · Visita ${fichaPayload.visita || 1}`,
            usuario: userEmail,
            fecha: timestamp
          }
        ]
      };
      const docRef = await dbNs.collection('directivos').add(newDirDoc);
      newDirDoc.id = docRef.id;
      changesSummary.push(`Director(a) registrado: ${fichaDir.apellidosNombres}`);
      if (activeState && activeState.directivos) activeState.directivos.push(newDirDoc);
    } else {
      // Ya existía un director activo. Verificar si es la misma persona o uno nuevo
      const samePerson = (fichaDir.dni && activeDirector.dni && fichaDir.dni === activeDirector.dni) ||
                         (normalizeStr(fichaDir.apellidosNombres) === normalizeStr(activeDirector.apellidosNombres));

      if (samePerson) {
        // Es la misma persona: actualizar campos si la ficha no es más antigua
        const isFichaMasAntigua = activeDirector.fuente?.fechaVisita && (fechaVisita < activeDirector.fuente.fechaVisita);
        const updates = {};
        const newHistorialEntries = [];

        // Teléfono
        if (fichaDir.telefono && (!isFichaMasAntigua || !activeDirector.telefono) && fichaDir.telefono !== activeDirector.telefono) {
          updates.telefono = fichaDir.telefono;
          newHistorialEntries.push({
            campo: 'telefono',
            valorAnterior: activeDirector.telefono || '',
            valorNuevo: fichaDir.telefono,
            fuente: `${fichaNombre} · ${fechaVisita}`,
            usuario: userEmail,
            fecha: timestamp
          });
        }

        // Correo
        if (fichaDir.correo && (!isFichaMasAntigua || !activeDirector.correo) && fichaDir.correo !== activeDirector.correo) {
          updates.correo = fichaDir.correo;
          newHistorialEntries.push({
            campo: 'correo',
            valorAnterior: activeDirector.correo || '',
            valorNuevo: fichaDir.correo,
            fuente: `${fichaNombre} · ${fechaVisita}`,
            usuario: userEmail,
            fecha: timestamp
          });
        }

        // Condición
        if (fichaDir.condicion && (!isFichaMasAntigua || !activeDirector.condicion) && fichaDir.condicion !== activeDirector.condicion) {
          updates.condicion = fichaDir.condicion;
          newHistorialEntries.push({
            campo: 'condicion',
            valorAnterior: activeDirector.condicion || '',
            valorNuevo: fichaDir.condicion,
            fuente: `${fichaNombre} · ${fechaVisita}`,
            usuario: userEmail,
            fecha: timestamp
          });
        }

        // DNI (si antes estaba vacío)
        if (fichaDir.dni && !activeDirector.dni) {
          updates.dni = fichaDir.dni;
          newHistorialEntries.push({
            campo: 'dni',
            valorAnterior: '',
            valorNuevo: fichaDir.dni,
            fuente: `${fichaNombre} · ${fechaVisita}`,
            usuario: userEmail,
            fecha: timestamp
          });
        }

        if (Object.keys(updates).length > 0) {
          updates.actualizadoPor = userEmail;
          updates.actualizadoEn = timestamp;
          updates.fuente = fuenteObj;
          const mergedHistorial = [...(activeDirector.historial || []), ...newHistorialEntries];
          updates.historial = mergedHistorial;

          await dbNs.collection('directivos').doc(activeDirector.id).update(updates);
          changesSummary.push(`Director(a) actualizado (${Object.keys(updates).filter(k => !['actualizadoPor','actualizadoEn','fuente','historial'].includes(k)).join(', ')})`);
          
          // Actualizar memoria
          Object.assign(activeDirector, updates);
        } else {
          changesSummary.push('Director(a) sin cambios');
        }
      } else {
        // Es un DIRECTOR NUEVO (DNI o nombre distinto):
        // 1. Marcar el anterior como 'anterior'
        let newState = 'anterior';
        if (resoluciones.director === 'ENCARGATURA') {
          newState = 'activo'; // Mantiene el original activo
          // No actualizar el estado del original a anterior
        }

        const prevDirectorUpdate = {
          estado: newState,
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            ...(activeDirector.historial || []),
            {
              campo: 'estado',
              valorAnterior: 'activo',
              valorNuevo: `anterior (Reemplazado por ${fichaDir.apellidosNombres} en ${fichaNombre})`,
              fuente: `${fichaNombre} · ${fechaVisita}`,
              usuario: userEmail,
              fecha: timestamp
            }
          ]
        };
        if (resoluciones.director !== 'ENCARGATURA') {
          await dbNs.collection('directivos').doc(activeDirector.id).update(prevDirectorUpdate);
        }
        Object.assign(activeDirector, prevDirectorUpdate);

        // 2. Crear nuevo director activo
        const newDirDoc = {
          colegioId: effectiveColId,
          codigoLocal: effectiveCodLocal,
          codigoModular: effectiveCodMod,
          cargo: 'Director',
          apellidosNombres: fichaDir.apellidosNombres,
          dni: fichaDir.dni,
          telefono: fichaDir.telefono,
          correo: fichaDir.correo,
          condicion: fichaDir.condicion,
          nivelACargo: '',
          estado: resoluciones.director === 'ENCARGATURA' ? 'encargado' : 'activo',
          avisoRevision: false,
          fuente: fuenteObj,
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            {
              campo: 'asuncion_cargo',
              valorAnterior: activeDirector.apellidosNombres,
              valorNuevo: fichaDir.apellidosNombres,
              fuente: `${fichaNombre} · ${fechaVisita}`,
              usuario: userEmail,
              fecha: timestamp
            }
          ]
        };
        const newRef = await dbNs.collection('directivos').add(newDirDoc);
        newDirDoc.id = newRef.id;
        changesSummary.push(`Nuevo Director(a) activo: ${fichaDir.apellidosNombres} (reemplaza a ${activeDirector.apellidosNombres})`);
        if (activeState && activeState.directivos) activeState.directivos.push(newDirDoc);
      }
    }
  }

  // -------------------------------------------------------------
  // B. PROCESAR SUBDIRECTORES
  // -------------------------------------------------------------
  const existingSubdirs = existingDirectivos.filter(d => d.cargo === 'Subdirector' && d.estado === 'activo');
  const matchedExistingSubdirIds = new Set();

  for (const fSub of fichaSubdirs) {
    const match = existingSubdirs.find(es => 
      (fSub.dni && es.dni && fSub.dni === es.dni) ||
      (normalizeStr(fSub.apellidosNombres) === normalizeStr(es.apellidosNombres))
    );

    if (match) {
      matchedExistingSubdirIds.add(match.id);
      const isFichaMasAntigua = match.fuente?.fechaVisita && (fechaVisita < match.fuente.fechaVisita);
      const updates = {};
      const newHistorial = [];

      if (match.avisoRevision) {
        updates.avisoRevision = false;
      }
      if (fSub.telefono && (!isFichaMasAntigua || !match.telefono) && fSub.telefono !== match.telefono) {
        updates.telefono = fSub.telefono;
        newHistorial.push({ campo: 'telefono', valorAnterior: match.telefono || '', valorNuevo: fSub.telefono, fuente: `${fichaNombre} · ${fechaVisita}`, usuario: userEmail, fecha: timestamp });
      }
      if (fSub.correo && (!isFichaMasAntigua || !match.correo) && fSub.correo !== match.correo) {
        updates.correo = fSub.correo;
        newHistorial.push({ campo: 'correo', valorAnterior: match.correo || '', valorNuevo: fSub.correo, fuente: `${fichaNombre} · ${fechaVisita}`, usuario: userEmail, fecha: timestamp });
      }
      if (fSub.condicion && (!isFichaMasAntigua || !match.condicion) && fSub.condicion !== match.condicion) {
        updates.condicion = fSub.condicion;
        newHistorial.push({ campo: 'condicion', valorAnterior: match.condicion || '', valorNuevo: fSub.condicion, fuente: `${fichaNombre} · ${fechaVisita}`, usuario: userEmail, fecha: timestamp });
      }
      if (fSub.dni && !match.dni) {
        updates.dni = fSub.dni;
        newHistorial.push({ campo: 'dni', valorAnterior: '', valorNuevo: fSub.dni, fuente: `${fichaNombre} · ${fechaVisita}`, usuario: userEmail, fecha: timestamp });
      }

      if (Object.keys(updates).length > 0) {
        updates.actualizadoPor = userEmail;
        updates.actualizadoEn = timestamp;
        updates.fuente = fuenteObj;
        updates.historial = [...(match.historial || []), ...newHistorial];
        await dbNs.collection('directivos').doc(match.id).update(updates);
        Object.assign(match, updates);
        changesSummary.push(`Subdirector(a) actualizado: ${fSub.apellidosNombres}`);
      }
    } else {
      // Subdirector nuevo
      const newSubDoc = {
        colegioId: effectiveColId,
        codigoLocal: effectiveCodLocal,
        codigoModular: effectiveCodMod,
        cargo: 'Subdirector',
        apellidosNombres: fSub.apellidosNombres,
        dni: fSub.dni,
        telefono: fSub.telefono,
        correo: fSub.correo,
        condicion: fSub.condicion,
        nivelACargo: fSub.nivelACargo || '',
        estado: 'activo',
        avisoRevision: false,
        fuente: fuenteObj,
        actualizadoPor: userEmail,
        actualizadoEn: timestamp,
        historial: [
          {
            campo: 'registro_inicial',
            valorAnterior: '',
            valorNuevo: `${fSub.apellidosNombres} (${fSub.dni || 'Sin DNI'})`,
            fuente: `${fichaNombre} · Visita ${fichaPayload.visita || 1}`,
            usuario: userEmail,
            fecha: timestamp
          }
        ]
      };
      const ref = await dbNs.collection('directivos').add(newSubDoc);
      newSubDoc.id = ref.id;
      changesSummary.push(`Nuevo subdirector registrado: ${fSub.apellidosNombres}`);
      if (activeState && activeState.directivos) activeState.directivos.push(newSubDoc);
    }
  }

  // Subdirectores activos que NO aparecen en esta ficha: marcar con aviso de revisión (NO borrar)
  for (const es of existingSubdirs) {
    if (!matchedExistingSubdirIds.has(es.id) && fichaSubdirs.length > 0) {
      if (!es.avisoRevision) {
        const avisoUpdate = {
          avisoRevision: 'No registrado en la última visita',
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            ...(es.historial || []),
            {
              campo: 'avisoRevision',
              valorAnterior: 'Ninguno',
              valorNuevo: 'No registrado en la última visita',
              fuente: `${fichaNombre} · ${fechaVisita}`,
              usuario: userEmail,
              fecha: timestamp
            }
          ]
        };
        await dbNs.collection('directivos').doc(es.id).update(avisoUpdate);
        Object.assign(es, avisoUpdate);
        changesSummary.push(`Aviso: Subdirector ${es.apellidosNombres} no registrado en esta visita`);
      }
    }
  }

  // -------------------------------------------------------------
  // C. SINCRONIZAR DE VUELTA A COLEGIOS (PARIDAD TOTAL)
  // -------------------------------------------------------------
  if (matchedColegio) {
    try {
      const colUpdates = {};
      if (fichaDir && fichaDir.apellidosNombres) {
        colUpdates.director = {
          nombre: fichaDir.apellidosNombres,
          dni: fichaDir.dni || matchedColegio.director?.dni || '',
          telefono: fichaDir.telefono || matchedColegio.director?.telefono || '',
          correo: fichaDir.correo || matchedColegio.director?.correo || ''
        };
      }
      if (fichaSubdirs.length > 0) {
        const firstSub = fichaSubdirs[0];
        colUpdates.subDirector = {
          nombre: firstSub.apellidosNombres,
          dni: firstSub.dni || '',
          telefono: firstSub.telefono || '',
          correo: firstSub.correo || ''
        };
      }
      if (Object.keys(colUpdates).length > 0) {
        colUpdates.updatedAt = Date.now();
        await dbNs.collection('colegios').doc(matchedColegio.id).set(colUpdates, { merge: true });
        Object.assign(matchedColegio, colUpdates);
      }
    } catch (colErr) {
      console.warn('No se pudo reflejar directivos en documento de colegio:', colErr);
    }
  }

  const summary = changesSummary.length ? changesSummary.join(' · ') : 'Directorio sin cambios';
  return { success: true, summary };
}

/* =========================================================================
   4. MIGRACIÓN INICIAL DESDE PADRÓN DE COLEGIOS
   ========================================================================= */

/**
 * Migra los directivos existentes en la colección 'colegios' a 'directivos'
 * garantizando que ninguna IE quede vacía si ya tenía director en el padrón.
 */
export async function migrateColegiosToDirectivos(dbNs, state, currentUser) {
  if (!dbNs || !state || !state.colegios) return { migrated: 0, skipped: 0 };
  const userEmail = (currentUser && currentUser.email) || 'migracion';
  const timestamp = nowIso();
  let migratedCount = 0;
  let skippedCount = 0;

  for (const c of state.colegios) {
    const codLoc = cleanTextCode(c.codigoLocal);
    const cId = c.id;
    const existing = getDirectivosForColegio(state, cId, codLoc, c.codigoModular);

    // 1. Migrar Director
    if (c.director && c.director.nombre && c.director.nombre.trim() && !isPlaceholderDirectivo(c.director.nombre)) {
      const hasDirector = existing.some(d => d.cargo === 'Director' && d.estado === 'activo');
      if (!hasDirector) {
        const dirRecord = {
          colegioId: cId,
          codigoLocal: codLoc,
          codigoModular: cleanTextCode(c.codigoModular),
          cargo: 'Director',
          apellidosNombres: normalizeStr(c.director.nombre),
          dni: cleanTextCode(c.director.dni),
          telefono: cleanTextCode(c.director.telefono),
          correo: cleanEmail(c.director.correo),
          condicion: 'D',
          nivelACargo: '',
          estado: 'activo',
          avisoRevision: false,
          fuente: { tipo: 'colegios', fichaNombre: 'Padrón Oficial de Colegios', fechaVisita: todayDateStr() },
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            {
              campo: 'migracion_inicial',
              valorAnterior: '',
              valorNuevo: `${normalizeStr(c.director.nombre)} (Padrón)`,
              fuente: 'Padrón inicial de Colegios',
              usuario: userEmail,
              fecha: timestamp
            }
          ]
        };
        const ref = await dbNs.collection('directivos').add(dirRecord);
        dirRecord.id = ref.id;
        state.directivos.push(dirRecord);
        migratedCount++;
      } else {
        skippedCount++;
      }
    }

    // 2. Migrar Subdirector si existe (ignorando textos de relleno)
    if (c.subDirector && c.subDirector.nombre && c.subDirector.nombre.trim() && !isPlaceholderDirectivo(c.subDirector.nombre)) {
      const hasSub = existing.some(d => d.cargo === 'Subdirector' && d.estado === 'activo');
      if (!hasSub) {
        const subRecord = {
          colegioId: cId,
          codigoLocal: codLoc,
          codigoModular: cleanTextCode(c.codigoModular),
          cargo: 'Subdirector',
          apellidosNombres: normalizeStr(c.subDirector.nombre),
          dni: cleanTextCode(c.subDirector.dni),
          telefono: cleanTextCode(c.subDirector.telefono),
          correo: cleanEmail(c.subDirector.correo),
          condicion: 'D',
          nivelACargo: '',
          estado: 'activo',
          avisoRevision: false,
          fuente: { tipo: 'colegios', fichaNombre: 'Padrón Oficial de Colegios', fechaVisita: todayDateStr() },
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            {
              campo: 'migracion_inicial',
              valorAnterior: '',
              valorNuevo: `${normalizeStr(c.subDirector.nombre)} (Padrón)`,
              fuente: 'Padrón inicial de Colegios',
              usuario: userEmail,
              fecha: timestamp
            }
          ]
        };
        const ref = await dbNs.collection('directivos').add(subRecord);
        subRecord.id = ref.id;
        state.directivos.push(subRecord);
        migratedCount++;
      }
    }
  }

  return { migrated: migratedCount, skipped: skippedCount };
}

/* =========================================================================
   5. FILTROS Y ESTADO DE LA PESTAÑA DIRECTORIO
   ========================================================================= */

let dirFilters = {
  q: '',
  rei: '',
  distrito: '',
  modalidad: '',
  nivelServicio: '',
  tipoGestion: '',
  estadoDirectivo: 'todos' // 'todos' | 'con_director' | 'sin_director' | 'con_subdirector' | 'incompletos' | 'con_aviso'
};

/* =========================================================================
   6. RENDERIZADO DE LA PESTAÑA "DIRECTORIO"
   ========================================================================= */

export function renderDirectorioTab(container, state, dbNs, isAdmin, currentUser, navigate) {
  if (!container || !state) return;

  // Ejecutar limpieza única en segundo plano de textos de relleno espurios
  cleanExistingPlaceholderDirectivos(dbNs, state, currentUser);

  const colegios = state.colegios || [];
  const reiList = Array.from(new Set(colegios.map(c => c.rei).filter(Boolean))).sort();
  const distritoList = Array.from(new Set(colegios.map(c => c.distrito).filter(Boolean))).sort();
  const modalidadList = Array.from(new Set(colegios.map(c => c.modalidad).filter(Boolean))).sort();
  const nivelList = Array.from(new Set(colegios.map(c => c.nivelServicio).filter(Boolean))).sort();
  const gestionList = Array.from(new Set(colegios.map(c => c.tipoGestion).filter(Boolean))).sort();

  // Mapear directivos a cada IE
  const ieDataList = colegios.map(c => {
    const directivosIE = getDirectivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);
    const directorActivo = directivosIE.find(d => d.cargo === 'Director' && d.estado === 'activo') || null;
    const subdirectoresActivos = directivosIE.filter(d => d.cargo === 'Subdirector' && d.estado === 'activo');
    const directivosHistoricos = directivosIE.filter(d => d.estado === 'anterior');

    // Comprobar completitud
    const dirIncompleto = directorActivo ? isDirectivoIncompleto(directorActivo) : true;
    const subIncompleto = subdirectoresActivos.some(sd => isDirectivoIncompleto(sd));
    const tieneIncompleto = dirIncompleto || subIncompleto;
    const tieneAviso = subdirectoresActivos.some(sd => !!sd.avisoRevision);

    return {
      colegio: c,
      director: directorActivo,
      subdirectores: subdirectoresActivos,
      historicos: directivosHistoricos,
      tieneIncompleto,
      tieneAviso
    };
  });

  // KPIs
  const totalIE = ieDataList.length;
  const conDirector = ieDataList.filter(x => !!x.director).length;
  const conSubdirector = ieDataList.filter(x => x.subdirectores.length > 0).length;
  const conIncompletos = ieDataList.filter(x => x.tieneIncompleto).length;
  const conAvisosRevision = ieDataList.filter(x => x.tieneAviso).length;

  // Filtrado
  let filtered = ieDataList.filter(item => {
    const c = item.colegio;
    const dir = item.director;
    const subs = item.subdirectores;

    if (dirFilters.rei && c.rei !== dirFilters.rei) return false;
    if (dirFilters.distrito && !normalizeStr(c.distrito).includes(normalizeStr(dirFilters.distrito))) return false;
    if (dirFilters.modalidad && c.modalidad !== dirFilters.modalidad) return false;
    if (dirFilters.nivelServicio && c.nivelServicio !== dirFilters.nivelServicio) return false;
    if (dirFilters.tipoGestion && c.tipoGestion !== dirFilters.tipoGestion) return false;

    // Filtro por estado
    if (dirFilters.estadoDirectivo === 'con_director' && !dir) return false;
    if (dirFilters.estadoDirectivo === 'sin_director' && dir) return false;
    if (dirFilters.estadoDirectivo === 'con_subdirector' && subs.length === 0) return false;
    if (dirFilters.estadoDirectivo === 'incompletos' && !item.tieneIncompleto) return false;
    if (dirFilters.estadoDirectivo === 'con_aviso' && !item.tieneAviso) return false;

    // Buscador general (IE, código, nombres o DNI de director y subdirectores)
    if (dirFilters.q) {
      const q = normalizeStr(dirFilters.q);
      const ieMatch = normalizeStr(c.ie).includes(q) || cleanTextCode(c.codigoLocal).includes(q);
      const dirMatch = dir && (normalizeStr(dir.apellidosNombres).includes(q) || cleanTextCode(dir.dni).includes(q));
      const subMatch = subs.some(s => normalizeStr(s.apellidosNombres).includes(q) || cleanTextCode(s.dni).includes(q));
      if (!ieMatch && !dirMatch && !subMatch) return false;
    }

    return true;
  });

  // Orden inicial: por REI y luego por nombre de IE
  filtered.sort((a, b) => {
    const rA = a.colegio.rei || 'ZZZ';
    const rB = b.colegio.rei || 'ZZZ';
    const cmpRei = rA.localeCompare(rB, undefined, { numeric: true });
    if (cmpRei !== 0) return cmpRei;
    return (a.colegio.ie || '').localeCompare(b.colegio.ie || '');
  });

  // Renderizar filas de la tabla
  const rowsHtml = filtered.map(item => {
    const c = item.colegio;
    const dir = item.director;
    const subs = item.subdirectores;

    // Formatear director
    let dirHtml = '<span class="badge st-none">Sin registrar</span>';
    let dirDni = '—';
    let dirTel = '—';
    let dirCorreo = '—';

    if (dir) {
      const fuenteText = dir.fuente?.fichaNombre 
        ? `${esc(dir.fuente.fichaNombre)}${dir.fuente.fechaVisita ? ' · ' + fmtDate(dir.fuente.fechaVisita) : ''}`
        : (dir.fuente?.tipo === 'colegios' ? 'Padrón Colegios' : 'Actualización');

      dirHtml = `
        <div style="font-weight:600;color:var(--ink)">${esc(dir.apellidosNombres)}</div>
        <div style="font-size:10.5px;color:var(--ink-soft);margin-top:2px">
          ${esc(fuenteText)}
          ${dir.condicion ? ` · <span style="font-weight:700">(${esc(dir.condicion)})</span>` : ''}
        </div>
      `;
      dirDni = dir.dni ? `<code style="font-size:11.5px">${esc(dir.dni)}</code>` : '<span style="color:var(--danger)">Sin DNI</span>';
      dirTel = dir.telefono ? esc(dir.telefono) : '<span style="color:var(--ink-soft)">—</span>';
      dirCorreo = dir.correo ? `<a href="mailto:${esc(dir.correo)}" style="color:var(--primary);text-decoration:none">${esc(dir.correo)}</a>` : '<span style="color:var(--ink-soft)">—</span>';
    }

    // Formatear subdirectores apilados en la misma celda
    let subsHtml = '<span class="badge st-none">Sin subdirector</span>';
    let subDnis = '—';
    let subTels = '—';
    let subCorreos = '—';

    if (subs.length > 0) {
      subsHtml = subs.map(s => {
        const fuenteText = s.fuente?.fichaNombre
          ? `${esc(s.fuente.fichaNombre)}${s.fuente.fechaVisita ? ' · ' + fmtDate(s.fuente.fechaVisita) : ''}`
          : 'Padrón / Registro';
        const avisoBadge = s.avisoRevision
          ? `<span class="badge st-inicio" style="font-size:10px;margin-left:4px" title="${esc(s.avisoRevision)}">⚠ ${esc(s.avisoRevision)}</span>`
          : '';

        return `
          <div class="directorioSubdirItem" style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px">
            <div style="font-weight:600;color:var(--ink)">${esc(s.apellidosNombres)} ${avisoBadge}</div>
            <div style="font-size:10.5px;color:var(--ink-soft)">${esc(fuenteText)}${s.condicion ? ` · (${esc(s.condicion)})` : ''}</div>
          </div>
        `;
      }).join('');

      subDnis = subs.map(s => s.dni ? `<div style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px"><code style="font-size:11.5px">${esc(s.dni)}</code></div>` : '<div style="padding:3px 0;color:var(--danger)">Sin DNI</div>').join('');
      subTels = subs.map(s => `<div style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px">${esc(s.telefono || '—')}</div>`).join('');
      subCorreos = subs.map(s => `<div style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px">${s.correo ? `<a href="mailto:${esc(s.correo)}" style="color:var(--primary);text-decoration:none">${esc(s.correo)}</a>` : '—'}</div>`).join('');
    }

    return `
      <tr class="clickable directRow" data-col-id="${esc(c.id)}">
        <!-- Sticky: REI -->
        <td class="stickyCol stickyCol1" style="font-weight:700;text-align:center">${esc(c.rei || '—')}</td>
        <!-- Sticky: Código local -->
        <td class="stickyCol stickyCol2"><code style="font-size:11.5px">${esc(c.codigoLocal || '—')}</code></td>
        <!-- Sticky: I.E. -->
        <td class="stickyCol stickyCol3" style="font-weight:600;min-width:180px">${esc(c.ie || '—')}</td>
        <!-- Datos de la IE -->
        <td>${esc(c.modalidad || '—')}</td>
        <td>${esc(c.nivelServicio || '—')}</td>
        <td>${esc(c.turnos || '—')}</td>
        <td>${esc(c.tipoGestion || '—')}</td>
        <td>${esc(c.dependencia || 'UGEL 03')}</td>
        <td>${esc(c.distrito || '—')}</td>
        <!-- Director (A) -->
        <td style="min-width:200px">${dirHtml}</td>
        <td style="white-space:nowrap">${dirDni}</td>
        <td style="white-space:nowrap">${dirTel}</td>
        <td>${dirCorreo}</td>
        <!-- Subdirector (A) -->
        <td style="min-width:200px">${subsHtml}</td>
        <td style="white-space:nowrap">${subDnis}</td>
        <td style="white-space:nowrap">${subTels}</td>
        <td>${subCorreos}</td>
      </tr>
    `;
  }).join('') || `<tr><td colspan="17" style="text-align:center;padding:30px;color:var(--ink-soft)">Ninguna institución coincide con los filtros aplicados.</td></tr>`;

  // HTML completo de la pestaña
  container.innerHTML = `
    <div class="pageHead">
      <h2>Directorio de directivos por IE</h2>
      <p>Directores y subdirectores de las instituciones educativas de la UGEL 03, actualizados con cada ficha registrada.</p>
    </div>

    <!-- Tarjetas de Indicadores KPI -->
    <div class="cards" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));margin-bottom:20px">
      <div class="card">
        <div class="num">${totalIE}</div>
        <div class="lbl">Total de Instituciones</div>
      </div>
      <div class="card">
        <div class="num" style="color:var(--ok)">${conDirector}</div>
        <div class="lbl">IE con director registrado</div>
      </div>
      <div class="card">
        <div class="num" style="color:var(--primary)">${conSubdirector}</div>
        <div class="lbl">IE con al menos un subdirector</div>
      </div>
      <div class="card">
        <div class="num" style="color:${conIncompletos > 0 ? 'var(--warn)' : 'var(--ink)'}">${conIncompletos}</div>
        <div class="lbl">IE con datos incompletos</div>
      </div>
    </div>

    <!-- Panel de Filtros y Acciones -->
    <div class="panel" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <h3 style="margin:0;font-size:16px">Filtros y opciones de descarga</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn small" id="btnDescargarExcelDirectorio" style="background:#107c41;color:#fff;border-color:#107c41" title="Descargar en formato oficial Excel (.xlsx)">
            <span style="font-size:14px">📊</span> Descargar Excel oficial
          </button>
          ${isAdmin ? `
            <button type="button" class="btn secondary small" id="btnImportarExcelDirectorio" title="Cargar o actualizar directorio desde archivo Excel">
              📥 Importar desde Excel
            </button>
            <button type="button" class="btn secondary small" id="btnSincronizarPadronDirectorio" title="Sincronizar directivos faltantes desde el padrón de Colegios">
              🔄 Sincronizar padrón
            </button>
          ` : ''}
        </div>
      </div>

      <div class="filterBar" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:10px">
        <div class="field" style="grid-column:span 2">
          <label for="dir_fil_q">Buscar I.E., código, directivo o DNI</label>
          <input type="search" id="dir_fil_q" placeholder="Ej: Melitón Carvajal, 310050, 09106634..." value="${esc(dirFilters.q)}">
        </div>
        <div class="field">
          <label for="dir_fil_rei">REI / Red</label>
          <select id="dir_fil_rei">
            <option value="">Todas</option>
            ${reiList.map(r => `<option value="${esc(r)}" ${dirFilters.rei === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_distrito">Distrito</label>
          <input type="search" id="dir_fil_distrito" list="dl_dir_distrito" placeholder="Todos..." value="${esc(dirFilters.distrito)}">
          <datalist id="dl_dir_distrito">
            ${distritoList.map(d => `<option value="${esc(d)}">`).join('')}
          </datalist>
        </div>
        <div class="field">
          <label for="dir_fil_modalidad">Modalidad</label>
          <select id="dir_fil_modalidad">
            <option value="">Todas</option>
            ${modalidadList.map(m => `<option value="${esc(m)}" ${dirFilters.modalidad === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_nivel">Nivel / Servicio</label>
          <select id="dir_fil_nivel">
            <option value="">Todos</option>
            ${nivelList.map(n => `<option value="${esc(n)}" ${dirFilters.nivelServicio === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_gestion">Tipo de gestión</label>
          <select id="dir_fil_gestion">
            <option value="">Todas</option>
            ${gestionList.map(g => `<option value="${esc(g)}" ${dirFilters.tipoGestion === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_estado">Estado directivos</label>
          <select id="dir_fil_estado">
            <option value="todos" ${dirFilters.estadoDirectivo === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="con_director" ${dirFilters.estadoDirectivo === 'con_director' ? 'selected' : ''}>Con director</option>
            <option value="sin_director" ${dirFilters.estadoDirectivo === 'sin_director' ? 'selected' : ''}>Sin director</option>
            <option value="con_subdirector" ${dirFilters.estadoDirectivo === 'con_subdirector' ? 'selected' : ''}>Con subdirector(es)</option>
            <option value="incompletos" ${dirFilters.estadoDirectivo === 'incompletos' ? 'selected' : ''}>Datos incompletos</option>
            <option value="con_aviso" ${dirFilters.estadoDirectivo === 'con_aviso' ? 'selected' : ''}>Con aviso de revisión (${conAvisosRevision})</option>
          </select>
        </div>
        <div style="display:flex;align-items:flex-end">
          <button type="button" class="btn secondary small" id="btnLimpiarFiltrosDirectorio" style="width:100%">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <!-- Tabla con Encabezado de Dos Niveles Oficial -->
    <div class="panel" style="padding:0;overflow:hidden">
      <div class="tblWrap directorioTableWrap" style="max-height:75vh;overflow:auto">
        <table class="table directorioTable" style="margin:0;width:100%;border-collapse:separate;border-spacing:0">
          <thead>
            <!-- NIVEL 1: Grupos temáticos coloreados como plantilla oficial Excel -->
            <tr class="directorioHeaderNivel1">
              <th colspan="9" style="background:#BDD7EE;color:#12294D;text-align:center;font-weight:800;border:1px solid #9dc3e6;padding:10px;font-size:13px">
                DATOS DE LA I.E.
              </th>
              <th colspan="4" style="background:#C6E0B4;color:#1e4620;text-align:center;font-weight:800;border:1px solid #a9d08e;padding:10px;font-size:13px">
                DIRECTOR (A)
              </th>
              <th colspan="4" style="background:#FCE4D6;color:#5a2e16;text-align:center;font-weight:800;border:1px solid #f8cbad;padding:10px;font-size:13px">
                SUB - DIRECTOR (A)
              </th>
            </tr>
            <!-- NIVEL 2: Encabezados de columna exactos -->
            <tr class="directorioHeaderNivel2">
              <!-- Sticky Columns -->
              <th class="stickyCol stickyCol1" style="background:#d4e5f7;width:80px;text-align:center">REI</th>
              <th class="stickyCol stickyCol2" style="background:#d4e5f7;width:95px">Código local</th>
              <th class="stickyCol stickyCol3" style="background:#d4e5f7;min-width:180px">I.E.</th>
              <!-- Datos IE -->
              <th style="background:#e3edf7;width:95px">Modalidad</th>
              <th style="background:#e3edf7;width:120px">Nivel / servicio</th>
              <th style="background:#e3edf7;width:95px">Turnos</th>
              <th style="background:#e3edf7;width:130px">Tipo de Gestión</th>
              <th style="background:#e3edf7;width:110px">Dependencia</th>
              <th style="background:#e3edf7;width:110px">Distrito</th>
              <!-- Director -->
              <th style="background:#d9ecd0;min-width:200px">Apellidos y nombres</th>
              <th style="background:#d9ecd0;width:95px">DNI</th>
              <th style="background:#d9ecd0;width:110px">Teléfono</th>
              <th style="background:#d9ecd0;width:180px">Correo</th>
              <!-- Subdirector -->
              <th style="background:#fbeee4;min-width:200px">Apellidos y nombres</th>
              <th style="background:#fbeee4;width:95px">DNI</th>
              <th style="background:#fbeee4;width:110px">Teléfono</th>
              <th style="background:#fbeee4;width:180px">Correo</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 16px;background:var(--surface-2);border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink-soft)">
        <span>Mostrando <strong>${filtered.length}</strong> de ${totalIE} instituciones educativas</span>
        <span>Haz clic en cualquier institución para ver o gestionar directivos e historial de cambios</span>
      </div>
    </div>

    <!-- Contenedor Modal de Detalle / Edición / Importación -->
    <div id="directorioModalHost"></div>
  `;

  // -------------------------------------------------------------
  // EVENT LISTENERS DE LA PESTAÑA
  // -------------------------------------------------------------
  const onFilterChange = () => renderDirectorioTab(container, state, dbNs, isAdmin, currentUser, navigate);

  const inpQ = container.querySelector('#dir_fil_q');
  if (inpQ) inpQ.addEventListener('input', e => { dirFilters.q = e.target.value; onFilterChange(); });

  const selRei = container.querySelector('#dir_fil_rei');
  if (selRei) selRei.addEventListener('change', e => { dirFilters.rei = e.target.value; onFilterChange(); });

  const inpDist = container.querySelector('#dir_fil_distrito');
  if (inpDist) inpDist.addEventListener('input', e => { dirFilters.distrito = e.target.value; onFilterChange(); });

  const selMod = container.querySelector('#dir_fil_modalidad');
  if (selMod) selMod.addEventListener('change', e => { dirFilters.modalidad = e.target.value; onFilterChange(); });

  const selNiv = container.querySelector('#dir_fil_nivel');
  if (selNiv) selNiv.addEventListener('change', e => { dirFilters.nivelServicio = e.target.value; onFilterChange(); });

  const selGes = container.querySelector('#dir_fil_gestion');
  if (selGes) selGes.addEventListener('change', e => { dirFilters.tipoGestion = e.target.value; onFilterChange(); });

  const selEst = container.querySelector('#dir_fil_estado');
  if (selEst) selEst.addEventListener('change', e => { dirFilters.estadoDirectivo = e.target.value; onFilterChange(); });

  const btnClear = container.querySelector('#btnLimpiarFiltrosDirectorio');
  if (btnClear) btnClear.addEventListener('click', () => {
    dirFilters = { q: '', rei: '', distrito: '', modalidad: '', nivelServicio: '', tipoGestion: '', estadoDirectivo: 'todos' };
    onFilterChange();
  });

  // Botón Descargar Excel
  const btnExport = container.querySelector('#btnDescargarExcelDirectorio');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      openExcelExportConfigModal(state, filtered, currentUser);
    });
  }

  // Botón Importar Excel (Admin)
  const btnImport = container.querySelector('#btnImportarExcelDirectorio');
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      openDirectorioImportModal(state, dbNs, currentUser, () => onFilterChange());
    });
  }

  // Botón Sincronizar Padrón (Admin)
  const btnSync = container.querySelector('#btnSincronizarPadronDirectorio');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.disabled = true;
      btnSync.innerHTML = '⏳ Sincronizando...';
      try {
        const res = await migrateColegiosToDirectivos(dbNs, state, currentUser);
        showToast(`Sincronización completada: ${res.migrated} directivos registrados desde padrón.`);
        onFilterChange();
      } catch (err) {
        showToast('Error al sincronizar: ' + err.message);
      } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = '🔄 Sincronizar padrón';
      }
    });
  }

  // Clic en fila para abrir panel de detalle
  container.querySelectorAll('.directRow').forEach(tr => {
    tr.addEventListener('click', () => {
      const colId = tr.dataset.colId;
      const targetCol = (state.colegios || []).find(c => c.id === colId);
      if (targetCol) {
        openDirectorioDetailModal(targetCol, state, dbNs, isAdmin, currentUser, () => onFilterChange());
      }
    });
  });
}

/* =========================================================================
   7. MODAL DE DETALLE Y GESTIÓN DE DIRECTIVOS (CON HISTORIAL)
   ========================================================================= */

function openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh) {
  const host = document.getElementById('directorioModalHost');
  if (!host) return;

  const directivos = getDirectivosForColegio(state, colegio.id, colegio.codigoLocal, colegio.codigoModular);
  const directorActivo = directivos.find(d => d.cargo === 'Director' && d.estado === 'activo');
  const subdirectoresActivos = directivos.filter(d => d.cargo === 'Subdirector' && d.estado === 'activo');
  const anteriores = directivos.filter(d => d.estado === 'anterior');

  // Historial global de la IE ordenado por fecha descendente
  const timeline = [];
  directivos.forEach(d => {
    (d.historial || []).forEach(h => {
      timeline.push({
        directivoId: d.id,
        nombre: d.apellidosNombres,
        cargo: d.cargo,
        ...h
      });
    });
  });
  timeline.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const directorHtml = directorActivo ? `
    <div class="panel" style="background:var(--surface-2);border-left:4px solid var(--ok);margin-bottom:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <span class="badge st-logrado" style="font-weight:700">Director(a) Activo(a)</span>
          <h4 style="margin:6px 0 3px;font-size:15px">${esc(directorActivo.apellidosNombres)}</h4>
          <div style="font-size:12.5px;color:var(--ink-soft);line-height:1.5">
            <strong>DNI:</strong> ${directorActivo.dni ? esc(isAdmin ? directorActivo.dni : '***' + directorActivo.dni.slice(-3)) : '<span style="color:var(--danger)">Sin DNI</span>'} ·
            <strong>Teléfono:</strong> ${directorActivo.telefono ? esc(isAdmin ? directorActivo.telefono : '***' + directorActivo.telefono.slice(-3)) : '—'} ·
            <strong>Correo:</strong> ${directorActivo.correo ? esc(directorActivo.correo) : '—'} ·
            <strong>Condición:</strong> ${directorActivo.condicion || '—'}
          </div>
          <div style="font-size:11px;color:var(--ink-soft);margin-top:4px">
            Última fuente: <em>${esc(directorActivo.fuente?.fichaNombre || 'Registro')}</em> (${fmtDate(directorActivo.fuente?.fechaVisita || directorActivo.actualizadoEn)})
          </div>
        </div>
        ${isAdmin ? `
          <div style="display:flex;gap:6px">
            <button type="button" class="btn secondary small btnEditDirectivo" data-dir-id="${directorActivo.id}">✎ Editar</button>
            <button type="button" class="btn secondary small btnArchivarDirectivo" data-dir-id="${directorActivo.id}" title="Marcar como directivo anterior">✕ Archivar</button>
          </div>
        ` : ''}
      </div>
    </div>
  ` : `
    <div class="panel" style="background:var(--surface-2);padding:14px;margin-bottom:12px;text-align:center">
      <span class="badge st-none">Sin Director Registrado</span>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0">Esta institución educativa aún no tiene director(a) consignado.</p>
      ${isAdmin ? `<button type="button" class="btn small btnAddDirectivo" data-cargo="Director" style="margin-top:8px">＋ Registrar Director(a)</button>` : ''}
    </div>
  `;

  const subdirsHtml = subdirectoresActivos.length ? subdirectoresActivos.map(sd => `
    <div class="panel" style="background:var(--surface-2);border-left:4px solid var(--accent);margin-bottom:8px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <span class="badge" style="background:var(--accent-tint);color:var(--accent-dark);font-weight:700">Subdirector(a)</span>
          ${sd.avisoRevision ? `<span class="badge st-inicio" style="margin-left:4px">⚠ ${esc(sd.avisoRevision)}</span>` : ''}
          <h4 style="margin:4px 0 2px;font-size:14px">${esc(sd.apellidosNombres)}</h4>
          <div style="font-size:12px;color:var(--ink-soft)">
            <strong>DNI:</strong> ${sd.dni ? esc(isAdmin ? sd.dni : '***' + sd.dni.slice(-3)) : '<span style="color:var(--danger)">Sin DNI</span>'} ·
            <strong>Teléfono:</strong> ${sd.telefono ? esc(isAdmin ? sd.telefono : '***' + sd.telefono.slice(-3)) : '—'} ·
            <strong>Correo:</strong> ${sd.correo ? esc(sd.correo) : '—'} ·
            <strong>Condición:</strong> ${sd.condicion || '—'}
          </div>
        </div>
        ${isAdmin ? `
          <div style="display:flex;gap:6px">
            <button type="button" class="btn secondary small btnEditDirectivo" data-dir-id="${sd.id}">✎ Editar</button>
            <button type="button" class="btn secondary small btnArchivarDirectivo" data-dir-id="${sd.id}" title="Marcar como directivo anterior">✕ Archivar</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('') : `
    <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 10px">No tiene subdirectores activos registrados.</p>
  `;

  const anterioresHtml = anteriores.length ? anteriores.map(an => `
    <tr style="font-size:12px">
      <td><span class="badge st-none">${esc(an.cargo)}</span></td>
      <td><strong>${esc(an.apellidosNombres)}</strong></td>
      <td><code>${esc(an.dni ? (isAdmin ? an.dni : '***' + an.dni.slice(-3)) : '—')}</code></td>
      <td>${esc(an.telefono ? (isAdmin ? an.telefono : '***' + an.telefono.slice(-3)) : '—')}</td>
      <td>${esc(an.correo || '—')}</td>
      <td><span class="helpText" style="margin:0">${fmtDate(an.actualizadoEn)}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="6" style="text-align:center;padding:12px;color:var(--ink-soft)">Sin directivos anteriores registrados.</td></tr>`;

  const timelineHtml = timeline.length ? timeline.slice(0, 15).map(item => `
    <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:12px">
      <div style="min-width:110px;color:var(--ink-soft);font-size:11px">${fmtDate(item.fecha)}</div>
      <div style="flex:1">
        <div><strong>${esc(item.nombre)}</strong> <span class="badge" style="font-size:10px">${esc(item.cargo)}</span></div>
        <div style="color:var(--ink);margin-top:2px">
          <span style="font-weight:600">${esc(item.campo)}:</span>
          ${item.valorAnterior ? `<span style="color:var(--danger);text-decoration:line-through">${esc(item.valorAnterior)}</span> → ` : ''}
          <span style="color:var(--ok);font-weight:600">${esc(item.valorNuevo)}</span>
        </div>
        <div style="color:var(--ink-soft);font-size:10.5px">Fuente: ${esc(item.fuente || 'Manual')} · Usuario: ${esc(item.usuario || '—')}</div>
      </div>
    </div>
  `).join('') : '<p class="helpText">Sin historial de cambios registrado.</p>';

  host.innerHTML = `
    <div class="modalBackdrop" id="directorioModalBackdrop" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;padding:20px">
      <div class="modalCard" style="background:var(--surface);width:100%;max-width:850px;max-height:90vh;overflow-y:auto;border-radius:var(--radius);padding:24px;position:relative">
        <button type="button" class="modalClose" id="btnCloseDirectorioModal" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer">✕</button>

        <div style="margin-bottom:16px;border-bottom:1px solid var(--line);padding-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge st-logrado" style="font-weight:700">REI ${esc(colegio.rei || '—')}</span>
            <span style="font-size:12px;color:var(--ink-soft)">Código Local: <code>${esc(colegio.codigoLocal || '—')}</code></span>
          </div>
          <h2 style="margin:6px 0 2px;font-size:20px">${esc(colegio.ie)}</h2>
          <div style="font-size:12.5px;color:var(--ink-soft)">
            ${esc(colegio.distrito || '')} · ${esc(colegio.modalidad || '')} · ${esc(colegio.nivelServicio || '')} · Turno: ${esc(colegio.turnos || '—')} · ${esc(colegio.tipoGestion || '')}
          </div>
        </div>

        <!-- Sección: Director Activo -->
        <h3 style="font-size:14.5px;margin:16px 0 8px">Director(a) Activo(a)</h3>
        ${directorHtml}

        <!-- Sección: Subdirectores Activos -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 8px">
          <h3 style="font-size:14.5px;margin:0">Subdirector(es) Activo(s)</h3>
          ${isAdmin ? `<button type="button" class="btn secondary small btnAddDirectivo" data-cargo="Subdirector">＋ Agregar Subdirector(a)</button>` : ''}
        </div>
        ${subdirsHtml}

        <!-- Sección: Historial de Directivos Anteriores -->
        <h3 style="font-size:14.5px;margin:24px 0 8px">Directivos Anteriores (Histórico)</h3>
        <div class="tblWrap" style="margin-bottom:16px">
          <table class="table" style="width:100%">
            <thead>
              <tr style="background:var(--surface-2)">
                <th>Cargo</th>
                <th>Apellidos y nombres</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Fecha cese</th>
              </tr>
            </thead>
            <tbody>
              ${anterioresHtml}
            </tbody>
          </table>
        </div>

        <!-- Sección: Línea de Tiempo de Cambios -->
        <h3 style="font-size:14.5px;margin:24px 0 8px">Historial de Cambios y Trazabilidad</h3>
        <div class="panel" style="max-height:220px;overflow-y:auto;padding:10px 14px">
          ${timelineHtml}
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button type="button" class="btn" id="btnCerrarModalBottom">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  // Cerrar modal
  const closeModal = () => { host.innerHTML = ''; };
  const btnClose = host.querySelector('#btnCloseDirectorioModal');
  const btnCloseB = host.querySelector('#btnCerrarModalBottom');
  const backdrop = host.querySelector('#directorioModalBackdrop');
  if (btnClose) btnClose.onclick = closeModal;
  if (btnCloseB) btnCloseB.onclick = closeModal;
  if (backdrop) backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  // Handlers Admin: Editar Directivo
  host.querySelectorAll('.btnEditDirectivo').forEach(btn => {
    btn.onclick = () => {
      const dirId = btn.dataset.dirId;
      const targetDir = directivos.find(d => d.id === dirId);
      if (targetDir) {
        openEditDirectivoSubModal(targetDir, colegio, state, dbNs, currentUser, () => {
          openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh);
          if (onRefresh) onRefresh();
        });
      }
    };
  });

  // Handlers Admin: Archivar Directivo
  host.querySelectorAll('.btnArchivarDirectivo').forEach(btn => {
    btn.onclick = async () => {
      const dirId = btn.dataset.dirId;
      const targetDir = directivos.find(d => d.id === dirId);
      if (!targetDir) return;

      const ok = confirm(`¿Estás seguro de archivar a ${targetDir.apellidosNombres} (${targetDir.cargo}) como directivo anterior?`);
      if (!ok) return;

      try {
        const timestamp = nowIso();
        const userEmail = currentUser?.email || 'admin';
        const updates = {
          estado: 'anterior',
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            ...(targetDir.historial || []),
            {
              campo: 'estado',
              valorAnterior: 'activo',
              valorNuevo: 'anterior (Archivado manualmente por Administrador)',
              fuente: 'Edición manual',
              usuario: userEmail,
              fecha: timestamp
            }
          ]
        };
        await dbNs.collection('directivos').doc(targetDir.id).update(updates);
        Object.assign(targetDir, updates);
        showToast('Directivo archivado correctamente.');
        openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh);
        if (onRefresh) onRefresh();
      } catch (err) {
        showToast('Error al archivar: ' + err.message);
      }
    };
  });

  // Handlers Admin: Agregar Directivo
  host.querySelectorAll('.btnAddDirectivo').forEach(btn => {
    btn.onclick = () => {
      const cargo = btn.dataset.cargo || 'Director';
      openNewDirectivoSubModal(cargo, colegio, state, dbNs, currentUser, () => {
        openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh);
        if (onRefresh) onRefresh();
      });
    };
  });
}

/** Modal secundario para editar un directivo existente */
function openEditDirectivoSubModal(directivo, colegio, state, dbNs, currentUser, onSuccess) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:540px;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 4px">Editar ${esc(directivo.cargo)}</h3>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 14px">${esc(colegio.ie)} · Cód: ${esc(colegio.codigoLocal)}</p>

      <form id="formEditDirectivo">
        <div class="field" style="margin-bottom:10px">
          <label>Apellidos y nombres completos *</label>
          <input type="text" id="ed_nom" value="${esc(directivo.apellidosNombres)}" required>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div class="field">
            <label>DNI (8 dígitos) *</label>
            <input type="text" id="ed_dni" maxlength="8" pattern="[0-9]{8}" value="${esc(directivo.dni || '')}" required>
          </div>
          <div class="field">
            <label>Teléfono (9 dígitos)</label>
            <input type="text" id="ed_tel" maxlength="9" value="${esc(directivo.telefono || '')}">
          </div>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" id="ed_correo" value="${esc(directivo.correo || '')}">
          </div>
          <div class="field">
            <label>Condición</label>
            <select id="ed_cond">
              <option value="D" ${directivo.condicion === 'D' ? 'selected' : ''}>Designado (D)</option>
              <option value="E" ${directivo.condicion === 'E' ? 'selected' : ''}>Encargado (E)</option>
              <option value="Nombrado" ${directivo.condicion === 'Nombrado' ? 'selected' : ''}>Nombrado</option>
              <option value="Otro" ${directivo.condicion === 'Otro' ? 'selected' : ''}>Otro</option>
            </select>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="btn secondary small" id="btnCancelEditDir">Cancelar</button>
          <button type="submit" class="btn small" id="btnSaveEditDir">Guardar cambios</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const form = modalWrap.querySelector('#formEditDirectivo');
  const btnCancel = modalWrap.querySelector('#btnCancelEditDir');
  btnCancel.onclick = () => modalWrap.remove();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nom = normalizeStr(document.getElementById('ed_nom').value);
    const dni = cleanTextCode(document.getElementById('ed_dni').value);
    const tel = cleanTextCode(document.getElementById('ed_tel').value);
    const correo = cleanEmail(document.getElementById('ed_correo').value);
    const cond = document.getElementById('ed_cond').value;

    if (!nom || !dni) { showToast('Ingresa apellidos, nombres y DNI.'); return; }

    const timestamp = nowIso();
    const userEmail = currentUser?.email || 'admin';
    const newHist = [];

    if (nom !== directivo.apellidosNombres) newHist.push({ campo: 'apellidosNombres', valorAnterior: directivo.apellidosNombres, valorNuevo: nom, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (dni !== directivo.dni) newHist.push({ campo: 'dni', valorAnterior: directivo.dni || '', valorNuevo: dni, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (tel !== directivo.telefono) newHist.push({ campo: 'telefono', valorAnterior: directivo.telefono || '', valorNuevo: tel, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (correo !== directivo.correo) newHist.push({ campo: 'correo', valorAnterior: directivo.correo || '', valorNuevo: correo, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (cond !== directivo.condicion) newHist.push({ campo: 'condicion', valorAnterior: directivo.condicion || '', valorNuevo: cond, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });

    const updates = {
      apellidosNombres: nom,
      dni,
      telefono: tel,
      correo,
      condicion: cond,
      actualizadoPor: userEmail,
      actualizadoEn: timestamp,
      historial: [...(directivo.historial || []), ...newHist]
    };

    try {
      await dbNs.collection('directivos').doc(directivo.id).update(updates);
      Object.assign(directivo, updates);
      showToast('Directivo actualizado con éxito.');
      modalWrap.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Error al actualizar: ' + err.message);
    }
  };
}

/** Modal secundario para registrar un nuevo directivo manualmente */
function openNewDirectivoSubModal(cargo, colegio, state, dbNs, currentUser, onSuccess) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:540px;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 4px">Registrar nuevo ${esc(cargo)}</h3>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 14px">${esc(colegio.ie)} · Cód: ${esc(colegio.codigoLocal)}</p>

      <form id="formNewDirectivo">
        <div class="field" style="margin-bottom:10px">
          <label>Apellidos y nombres completos *</label>
          <input type="text" id="nw_nom" placeholder="Ej: PÉREZ LÓPEZ MARÍA" required>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div class="field">
            <label>DNI (8 dígitos) *</label>
            <input type="text" id="nw_dni" maxlength="8" pattern="[0-9]{8}" placeholder="8 dígitos" required>
          </div>
          <div class="field">
            <label>Teléfono (9 dígitos)</label>
            <input type="text" id="nw_tel" maxlength="9" placeholder="9 dígitos">
          </div>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" id="nw_correo" placeholder="correo@ejemplo.com">
          </div>
          <div class="field">
            <label>Condición</label>
            <select id="nw_cond">
              <option value="D">Designado (D)</option>
              <option value="E">Encargado (E)</option>
              <option value="Nombrado">Nombrado</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="btn secondary small" id="btnCancelNewDir">Cancelar</button>
          <button type="submit" class="btn small" id="btnSaveNewDir">Guardar y asignar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const form = modalWrap.querySelector('#formNewDirectivo');
  const btnCancel = modalWrap.querySelector('#btnCancelNewDir');
  btnCancel.onclick = () => modalWrap.remove();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nom = normalizeStr(document.getElementById('nw_nom').value);
    const dni = cleanTextCode(document.getElementById('nw_dni').value);
    const tel = cleanTextCode(document.getElementById('nw_tel').value);
    const correo = cleanEmail(document.getElementById('nw_correo').value);
    const cond = document.getElementById('nw_cond').value;

    if (!nom || !dni) { showToast('Ingresa apellidos, nombres y DNI.'); return; }

    const timestamp = nowIso();
    const userEmail = currentUser?.email || 'admin';

    // Si es Director y ya había uno activo, pasar el anterior a 'anterior'
    if (cargo === 'Director') {
      const activeDir = getDirectivosForColegio(state, colegio.id, colegio.codigoLocal).find(d => d.cargo === 'Director' && d.estado === 'activo');
      if (activeDir) {
        await dbNs.collection('directivos').doc(activeDir.id).update({
          estado: 'anterior',
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            ...(activeDir.historial || []),
            { campo: 'estado', valorAnterior: 'activo', valorNuevo: `anterior (Reemplazado por ${nom})`, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp }
          ]
        });
        activeDir.estado = 'anterior';
      }
    }

    const newDoc = {
      colegioId: colegio.id,
      codigoLocal: cleanTextCode(colegio.codigoLocal),
      codigoModular: cleanTextCode(colegio.codigoModular),
      cargo,
      apellidosNombres: nom,
      dni,
      telefono: tel,
      correo,
      condicion: cond,
      nivelACargo: '',
      estado: 'activo',
      avisoRevision: false,
      fuente: { tipo: 'manual', fichaNombre: 'Registro manual' },
      actualizadoPor: userEmail,
      actualizadoEn: timestamp,
      historial: [
        { campo: 'registro_manual', valorAnterior: '', valorNuevo: `${nom} (${dni})`, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp }
      ]
    };

    try {
      const ref = await dbNs.collection('directivos').add(newDoc);
      newDoc.id = ref.id;
      if (state.directivos) state.directivos.push(newDoc);
      showToast(`Nuevo ${cargo} registrado correctamente.`);
      modalWrap.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Error al registrar: ' + err.message);
    }
  };
}

/* =========================================================================
   8. EXPORTACIÓN EN EXCEL OFICIAL CON EXCELJS (SIN PLANTILLA BASE)
   ========================================================================= */

function openExcelExportConfigModal(state, filteredList, currentUser) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:500px;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 6px;display:flex;align-items:center;gap:8px">
        <span>📊</span> Descargar Directorio en Excel
      </h3>
      <p style="font-size:13px;color:var(--ink-soft);margin:0 0 16px">
        Descarga oficial con la estructura, estilos y colores exactos de la plantilla ministerial <code>E2_Directorio_de_Directores_por_IE</code>.
      </p>

      <div class="field" style="margin-bottom:18px">
        <label style="font-weight:700">Alcance de los datos a descargar:</label>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="exp_alcance" value="filtrados" checked>
            <span>Solo los <strong>${filteredList.length}</strong> colegios actualmente filtrados</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="exp_alcance" value="todos">
            <span>Todo el directorio completo (<strong>${(state.colegios || []).length}</strong> instituciones)</span>
          </label>
        </div>
      </div>

      <div style="background:var(--surface-2);padding:10px 12px;border-radius:4px;font-size:12px;color:var(--ink-soft);margin-bottom:16px">
        🔒 <strong>Aviso Ley N.° 29733:</strong> Esta descarga contiene datos de contacto institucional.
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn secondary small" id="btnCancelExcelExport">Cancelar</button>
        <button type="button" class="btn small" id="btnConfirmExcelExport" style="background:#107c41;color:#fff;border-color:#107c41">
          ⬇ Descargar Excel (.xlsx)
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const btnCancel = modalWrap.querySelector('#btnCancelExcelExport');
  const btnConfirm = modalWrap.querySelector('#btnConfirmExcelExport');
  btnCancel.onclick = () => modalWrap.remove();

  btnConfirm.onclick = async () => {
    const alcance = modalWrap.querySelector('input[name="exp_alcance"]:checked').value;

    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '⏳ Generando Excel...';

    try {
      const dataToExport = alcance === 'todos' ? (state.colegios || []) : filteredList.map(x => x.colegio || x);
      await generateDirectorioExcelFile(state, dataToExport, currentUser);
      modalWrap.remove();
      showToast('Directorio exportado correctamente en Excel.');
    } catch (err) {
      console.error('Error exportando Excel:', err);
      showToast('Error al exportar: ' + err.message);
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '⬇ Descargar Excel (.xlsx)';
    }
  };
}

/**
 * Genera el archivo Excel oficial desde cero con ExcelJS sin cargar ninguna plantilla base.
 * Reproduce exactamente la estructura, estilos, anchos, colores y autofiltro de E2_Directorio_de_Directores_por_IE.
 */
export async function generateDirectorioExcelFile(state, colegiosList, currentUser) {
  if (typeof window.ExcelJS === 'undefined') {
    throw new Error('La librería ExcelJS no está cargada. Verifica tu conexión a internet.');
  }

  // 1. Ejecutar limpieza de cualquier directivo placeholder residual
  if (typeof cleanExistingPlaceholderDirectivos === 'function') {
    try {
      await cleanExistingPlaceholderDirectivos(null, state, currentUser);
    } catch (_) {}
  }

  const ExcelJS = window.ExcelJS;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'UGEL 03 - Sistematización de Monitoreo';
  workbook.lastModifiedBy = currentUser?.email || 'UGEL 03';
  workbook.created = new Date();

  // 2. Crear ÚNICA hoja oficial 'I.E.'
  const worksheet = workbook.addWorksheet('I.E.', {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      showGridLines: true,
      printTitlesRow: '1:5'
    },
    views: [{ state: 'frozen', xSplit: 0, ySplit: 5, activeCell: 'A6' }]
  });

  const activeYear = (state && state.periodoActivo) || '2026';

  // -------------------------------------------------------------
  // FILA 1: Título A1:Q1 (Calibri Light 20, negrita, centrado, FFC000, alto 26.25)
  // -------------------------------------------------------------
  worksheet.mergeCells('A1:Q1');
  const r1 = worksheet.getRow(1);
  r1.height = 26.25;
  const c1 = worksheet.getCell('A1');
  c1.value = `Directorio de los directores de las Instituciones Educativas por REI - UGEL 03 - ${activeYear}`;
  c1.font = { name: 'Calibri Light', size: 20, bold: true, color: { argb: 'FF000000' } };
  c1.alignment = { vertical: 'middle', horizontal: 'center' };
  c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };

  // -------------------------------------------------------------
  // FILA 2: Vacía (alto 6)
  // -------------------------------------------------------------
  worksheet.getRow(2).height = 6;

  // -------------------------------------------------------------
  // FILA 3: Subtítulos (A3:I3, J3:M3, N3:Q3, Calibri Light 14, negrita, alto 18.75)
  // -------------------------------------------------------------
  worksheet.mergeCells('A3:I3');
  worksheet.mergeCells('J3:M3');
  worksheet.mergeCells('N3:Q3');
  const r3 = worksheet.getRow(3);
  r3.height = 18.75;

  const subIE = worksheet.getCell('A3');
  subIE.value = 'DATOS DE LA I.E.';
  subIE.font = { name: 'Calibri Light', size: 14, bold: true, color: { argb: 'FF000000' } };
  subIE.alignment = { vertical: 'middle', horizontal: 'center' };
  subIE.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9DC3E6' } };

  const subDir = worksheet.getCell('J3');
  subDir.value = 'DIRECTOR (A)';
  subDir.font = { name: 'Calibri Light', size: 14, bold: true, color: { argb: 'FF000000' } };
  subDir.alignment = { vertical: 'middle', horizontal: 'center' };
  subDir.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA9D08E' } };

  const subSubdir = worksheet.getCell('N3');
  subSubdir.value = 'SUB - DIRECTOR (A)';
  subSubdir.font = { name: 'Calibri Light', size: 14, bold: true, color: { argb: 'FF000000' } };
  subSubdir.alignment = { vertical: 'middle', horizontal: 'center' };
  subSubdir.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8CBAD' } };

  // -------------------------------------------------------------
  // FILA 4: Vacía (alto 3.75)
  // -------------------------------------------------------------
  worksheet.getRow(4).height = 3.75;

  // -------------------------------------------------------------
  // FILA 5: Encabezados (Calibri Light 12, negrita, alto 47.25)
  // J5 y K5 a la izquierda; A–I: BDD7EE, J–M: C6E0B4, N–Q: FCE4D6
  // -------------------------------------------------------------
  const r5 = worksheet.getRow(5);
  r5.height = 47.25;

  COLUMNAS.forEach(([_, headerText], idx) => {
    const colNum = idx + 1;
    const cell = r5.getCell(colNum);
    cell.value = headerText;
    cell.font = { name: 'Calibri Light', size: 12, bold: true, color: { argb: 'FF000000' } };
    cell.alignment = {
      vertical: 'middle',
      horizontal: (colNum === 10 || colNum === 11) ? 'left' : 'center',
      wrapText: true
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      left: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      bottom: { style: 'thin', color: { argb: 'FFB0B0B0' } },
      right: { style: 'thin', color: { argb: 'FFB0B0B0' } }
    };

    if (colNum <= 9) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFBDD7EE' } };
    } else if (colNum <= 13) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC6E0B4' } };
    } else {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE4D6' } };
    }
  });

  // Anchos exactos de columna
  ANCHOS_COLUMNA.forEach((w, idx) => {
    worksheet.getColumn(idx + 1).width = w;
  });

  // -------------------------------------------------------------
  // DEDUPLICAR Y ORDENAR COLEGIOS (UNA FILA POR IE)
  // Clave única: código local o modular. Orden: REI y luego nombre IE.
  // -------------------------------------------------------------
  const seenKeys = new Set();
  const uniqueColegios = [];

  for (const c of (colegiosList || [])) {
    if (!c) continue;
    const key = cleanTextCode(c.codigoLocal) || cleanTextCode(c.codigoModular) || String(c.id || '');
    if (!key) {
      uniqueColegios.push(c);
      continue;
    }
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueColegios.push(c);
    }
  }

  uniqueColegios.sort((a, b) => {
    const rA = cleanTextCode(a.rei || '');
    const rB = cleanTextCode(b.rei || '');
    const cmpRei = rA.localeCompare(rB, undefined, { numeric: true });
    if (cmpRei !== 0) return cmpRei;
    return (a.ie || '').localeCompare(b.ie || '', undefined, { sensitivity: 'base' });
  });

  // -------------------------------------------------------------
  // FILA 6 EN ADELANTE: DATOS POR IE
  // Calibri 11, centrado vertical, borde fino en los 4 lados.
  // REI, código local, DNI y teléfono SIEMPRE texto con formato '@'
  // -------------------------------------------------------------
  const thinBorder = {
    top: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    left: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    bottom: { style: 'thin', color: { argb: 'FFD9D9D9' } },
    right: { style: 'thin', color: { argb: 'FFD9D9D9' } }
  };

  uniqueColegios.forEach((c, idx) => {
    const rowIndex = 6 + idx;
    const row = worksheet.getRow(rowIndex);
    row.font = { name: 'Calibri', size: 11, color: { argb: 'FF000000' } };

    const directivos = getDirectivosActivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);
    const dir = directivos.director;
    const subdirs = (directivos.subdirectores || []).filter(s => !isPlaceholderDirectivo(s.apellidosNombres));

    const dirNombres = (dir && !isPlaceholderDirectivo(dir.apellidosNombres)) ? String(dir.apellidosNombres).trim() : '';
    const dirDni = dirNombres ? cleanTextCode(dir.dni) : '';
    const dirTel = dirNombres ? cleanTextCode(dir.telefono) : '';
    const dirCorreo = dirNombres ? cleanEmail(dir.correo) : '';

    // Varios subdirectores en multilínea con salto \n en el mismo orden exacto en N–Q
    const subNombres = subdirs.map(s => String(s.apellidosNombres || '').trim()).join('\n');
    const subDni = subdirs.map(s => cleanTextCode(s.dni)).join('\n');
    const subTel = subdirs.map(s => cleanTextCode(s.telefono)).join('\n');
    const subCorreo = subdirs.map(s => cleanEmail(s.correo)).join('\n');

    // Construcción del objeto fila con las 17 claves en orden fijo
    const rowObj = {
      rei: cleanTextCode(c.rei),
      codigoLocal: cleanTextCode(c.codigoLocal),
      ie: String(c.ie || '').trim(),
      modalidad: String(c.modalidad || '').trim(),
      nivelServicio: String(c.nivelServicio || '').trim(),
      turnos: String(c.turnos || '').trim(),
      tipoGestion: String(c.tipoGestion || '').trim(),
      dependencia: String(c.dependencia || 'UGEL 03').trim(),
      distrito: String(c.distrito || '').trim(),
      dirNombres: dirNombres,
      dirDni: dirDni,
      dirTelefono: dirTel,
      dirCorreo: dirCorreo,
      subNombres: subNombres,
      subDni: subDni,
      subTelefono: subTel,
      subCorreo: subCorreo
    };

    // Escribir celda por celda según COLUMNAS garantizando alineación absoluta
    COLUMNAS.forEach(([key], colIdx) => {
      const colNum = colIdx + 1;
      const cell = row.getCell(colNum);
      const val = rowObj[key] !== undefined && rowObj[key] !== null ? String(rowObj[key]) : '';

      // Siempre tipo texto con numFmt '@'
      cell.value = val;
      cell.numFmt = '@';
      cell.border = thinBorder;

      // wrapText en C (3), E (5), J (10), M (13), N (14) y Q (17)
      const shouldWrap = [3, 5, 10, 13, 14, 17].includes(colNum);

      let horiz = 'center';
      if ([3, 10, 13, 14, 17].includes(colNum)) {
        horiz = 'left';
      }

      cell.alignment = {
        vertical: 'middle',
        horizontal: horiz,
        wrapText: shouldWrap
      };
    });
  });

  // Autofiltro en A5:Q{última fila con datos}
  const lastRow = 5 + uniqueColegios.length;
  worksheet.autoFilter = `A5:Q${Math.max(5, lastRow)}`;

  // -------------------------------------------------------------
  // GENERAR BUFFER Y VERIFICACIÓN AUTOMÁTICA OBLIGATORIA
  // -------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();

  const verification = verifyDirectorioWorkbook(workbook, uniqueColegios.length, buffer);
  if (!verification.valid) {
    console.error('❌ Error de validación en libro Excel generado:', verification.errors);
    throw new Error('El archivo generado no superó el control de calidad: ' + verification.errors.join('; '));
  } else {
    console.info('✅ Control de calidad superado: 1 hoja I.E., 17 columnas alineadas, sin formatos condicionales corruptos y tipos de texto válidos.');
  }

  // -------------------------------------------------------------
  // DESCARGAR BLOB COMO ARCHIVO .XLSX
  // -------------------------------------------------------------
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const filename = `Directorio_Directores_IE_UGEL03_${activeYear}_${todayDateStr()}.xlsx`;
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

/**
 * Verificación automática de control de calidad del libro generado:
 * 1. Libro con una sola hoja llamada 'I.E.'
 * 2. Cero formatos condicionales vacíos (<conditionalFormatting sin <cfRule>)
 * 3. Fila 5 con exactamente los 17 encabezados en el orden indicado
 * 4. Celdas combinadas exactamente A1:Q1, A3:I3, J3:M3, N3:Q3
 * 5. Ninguna celda de las columnas A, B, K, L, O, P es de tipo número
 * 6. Número de filas de datos igual al número de IE exportadas, sin códigos repetidos
 */
export function verifyDirectorioWorkbook(workbook, expectedIeCount, exportedBuffer) {
  const errors = [];
  const results = {
    hojasValidas: false,
    sinFormatosCondicionales: false,
    encabezadosValidos: false,
    combinadasValidas: false,
    tiposTextoValidos: false,
    filasCorrectas: false
  };

  // 1. Una sola hoja llamada 'I.E.'
  if (!workbook || !workbook.worksheets || workbook.worksheets.length !== 1) {
    errors.push(`El libro debe tener exactamente 1 hoja, pero tiene ${workbook ? workbook.worksheets.length : 0}`);
  } else if (workbook.worksheets[0].name !== 'I.E.') {
    errors.push(`La hoja debe llamarse 'I.E.', pero se llama '${workbook.worksheets[0].name}'`);
  } else {
    results.hojasValidas = true;
  }

  const ws = workbook ? (workbook.getWorksheet('I.E.') || workbook.worksheets[0]) : null;
  if (!ws) {
    errors.push('No se pudo acceder a la hoja I.E.');
    return { valid: false, errors, results };
  }

  // 2. Sin formatos condicionales
  let hasBadConditionalFormatting = false;
  if (exportedBuffer) {
    try {
      const u8 = new Uint8Array(exportedBuffer);
      let s = '';
      for (let i = 0; i < Math.min(u8.length, 500000); i++) {
        s += String.fromCharCode(u8[i]);
      }
      if (s.includes('<conditionalFormatting') && !s.includes('<cfRule')) {
        hasBadConditionalFormatting = true;
      }
    } catch (_) {}
  }
  if (hasBadConditionalFormatting) {
    errors.push('Se detectó etiqueta <conditionalFormatting> sin <cfRule> en el XML del libro.');
  } else {
    results.sinFormatosCondicionales = true;
  }

  // 3. Fila 5: 17 encabezados exactos en orden
  const expectedHeaders = COLUMNAS.map(c => c[1]);
  const row5 = ws.getRow(5);
  const actualHeaders = [];
  for (let c = 1; c <= 17; c++) {
    actualHeaders.push(String(row5.getCell(c).value || '').trim());
  }
  const headersMatch = expectedHeaders.every((h, i) => h === actualHeaders[i]);
  if (!headersMatch || actualHeaders.length !== 17) {
    errors.push(`Encabezados fila 5 inválidos.\nEsperado: ${expectedHeaders.join(' | ')}\nObtenido: ${actualHeaders.join(' | ')}`);
  } else {
    results.encabezadosValidos = true;
  }

  // 4. Celdas combinadas: A1:Q1, A3:I3, J3:M3, N3:Q3
  const isA1Merged = ws.getCell('A1').isMerged && ws.getCell('Q1').master?.address === 'A1';
  const isA3Merged = ws.getCell('A3').isMerged && ws.getCell('I3').master?.address === 'A3';
  const isJ3Merged = ws.getCell('J3').isMerged && ws.getCell('M3').master?.address === 'J3';
  const isN3Merged = ws.getCell('N3').isMerged && ws.getCell('Q3').master?.address === 'N3';

  if (!isA1Merged || !isA3Merged || !isJ3Merged || !isN3Merged) {
    errors.push(`Celdas combinadas incompletas: A1:Q1 (${isA1Merged}), A3:I3 (${isA3Merged}), J3:M3 (${isJ3Merged}), N3:Q3 (${isN3Merged})`);
  } else {
    results.combinadasValidas = true;
  }

  // 5. Ninguna celda en columnas A, B, K, L, O, P es de tipo número
  const textCols = [1, 2, 11, 12, 15, 16]; // A, B, K, L, O, P
  let numTypeCount = 0;
  for (let r = 6; r <= 5 + expectedIeCount; r++) {
    const row = ws.getRow(r);
    for (const colIdx of textCols) {
      const cell = row.getCell(colIdx);
      if (typeof cell.value === 'number') {
        numTypeCount++;
      }
    }
  }
  if (numTypeCount > 0) {
    errors.push(`Se detectaron ${numTypeCount} celdas numéricas en columnas que deben ser texto (A, B, K, L, O, P).`);
  } else {
    results.tiposTextoValidos = true;
  }

  // 6. Número de filas de datos igual a expectedIeCount, sin códigos repetidos
  const totalDataRows = Math.max(0, ws.rowCount - 5);
  const seenCodes = new Set();
  let duplicateCodes = 0;
  for (let r = 6; r <= ws.rowCount; r++) {
    const code = String(ws.getRow(r).getCell(2).value || '').trim(); // B: Código local
    if (code) {
      if (seenCodes.has(code)) duplicateCodes++;
      seenCodes.add(code);
    }
  }

  if (totalDataRows !== expectedIeCount) {
    errors.push(`Cantidad de filas (${totalDataRows}) no coincide con IEs esperadas (${expectedIeCount})`);
  } else if (duplicateCodes > 0) {
    errors.push(`Se detectaron ${duplicateCodes} códigos locales duplicados en las filas de datos.`);
  } else {
    results.filasCorrectas = true;
  }

  const valid = errors.length === 0;
  return { valid, errors, results };
}

/* =========================================================================
   9. IMPORTACIÓN DESDE EXCEL (ADMINISTRADOR)
   ========================================================================= */

function openDirectorioImportModal(state, dbNs, currentUser, onSuccess) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:700px;max-height:90vh;overflow-y:auto;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 6px">Importar Directorio desde Excel</h3>
      <p style="font-size:13px;color:var(--ink-soft);margin:0 0 14px">
        Sube un archivo <code>.xlsx</code> o <code>.xlsm</code> que contenga los encabezados en la fila 5 y datos a partir de la fila 6.
      </p>

      <div class="field" style="margin-bottom:14px">
        <input type="file" id="fileImportDirectorio" accept=".xlsx,.xlsm" style="font-size:13px">
      </div>

      <div id="importDirectorioPreviewWrap" style="margin-bottom:16px"></div>

      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn secondary small" id="btnCancelDirImport">Cancelar</button>
        <button type="button" class="btn small" id="btnConfirmDirImport" style="display:none">✓ Confirmar e Importar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const btnCancel = modalWrap.querySelector('#btnCancelDirImport');
  const btnConfirm = modalWrap.querySelector('#btnConfirmDirImport');
  const fileInput = modalWrap.querySelector('#fileImportDirectorio');
  const previewWrap = modalWrap.querySelector('#importDirectorioPreviewWrap');

  btnCancel.onclick = () => modalWrap.remove();

  let parsedRows = [];

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewWrap.innerHTML = '<p class="helpText">Analizando archivo Excel...</p>';

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames.includes('I.E.') ? 'I.E.' : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (json.length < 6) {
        previewWrap.innerHTML = '<p style="color:var(--danger)">El archivo tiene menos de 6 filas. Asegúrate de usar la plantilla oficial.</p>';
        return;
      }

      parsedRows = [];
      for (let r = 5; r < json.length; r++) {
        const row = json[r];
        const codLocal = cleanTextCode(row[1]);
        const ie = (row[2] || '').trim();
        if (!codLocal && !ie) continue;

        parsedRows.push({
          rowNum: r + 1,
          rei: cleanTextCode(row[0]),
          codigoLocal: codLocal,
          ie: ie,
          dirNombre: isPlaceholderDirectivo(row[9]) ? '' : normalizeStr(row[9]),
          dirDni: cleanTextCode(row[10]),
          dirTel: cleanTextCode(row[11]),
          dirCorreo: cleanEmail(row[12]),
          subNombre: isPlaceholderDirectivo(row[13]) ? '' : normalizeStr(row[13]),
          subDni: cleanTextCode(row[14]),
          subTel: cleanTextCode(row[15]),
          subCorreo: cleanEmail(row[16]),
        });
      }

      previewWrap.innerHTML = `
        <div style="background:var(--surface-2);padding:10px 14px;border-radius:4px;margin-bottom:10px">
          <strong>${parsedRows.length}</strong> registros encontrados en la hoja <em>${esc(sheetName)}</em>.
        </div>
        <div class="tblWrap" style="max-height:220px;overflow-y:auto">
          <table class="table" style="font-size:12px;width:100%">
            <thead>
              <tr style="background:var(--surface-2)">
                <th>Fila</th>
                <th>Cód Local</th>
                <th>I.E.</th>
                <th>Director(a)</th>
                <th>Subdirector(a)</th>
              </tr>
            </thead>
            <tbody>
              ${parsedRows.slice(0, 30).map(p => `
                <tr>
                  <td>${p.rowNum}</td>
                  <td><code>${esc(p.codigoLocal)}</code></td>
                  <td>${esc(p.ie)}</td>
                  <td>${esc(p.dirNombre || '—')}</td>
                  <td>${esc(p.subNombre || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${parsedRows.length > 30 ? `<p class="helpText" style="margin-top:4px">Mostrando las primeras 30 filas de ${parsedRows.length}.</p>` : ''}
      `;

      btnConfirm.style.display = 'inline-block';
      btnConfirm.textContent = `✓ Confirmar e Importar (${parsedRows.length} instituciones)`;
    } catch (err) {
      previewWrap.innerHTML = `<p style="color:var(--danger)">Error leyendo el archivo: ${esc(err.message)}</p>`;
    }
  });

  btnConfirm.onclick = async () => {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '⏳ Importando registros...';
    const timestamp = nowIso();
    const userEmail = currentUser?.email || 'admin';
    let processed = 0;

    for (const p of parsedRows) {
      const col = (state.colegios || []).find(c => cleanTextCode(c.codigoLocal) === p.codigoLocal || normalizeStr(c.ie) === normalizeStr(p.ie));
      const colId = col ? col.id : genId();

      // Guardar / actualizar director si viene en el Excel y no es placeholder
      if (p.dirNombre && !isPlaceholderDirectivo(p.dirNombre)) {
        const existingDir = getDirectivosForColegio(state, colId, p.codigoLocal).find(d => d.cargo === 'Director' && d.estado === 'activo');
        if (!existingDir) {
          const newDoc = {
            colegioId: colId,
            codigoLocal: p.codigoLocal,
            codigoModular: col ? col.codigoModular || '' : '',
            cargo: 'Director',
            apellidosNombres: p.dirNombre,
            dni: p.dirDni,
            telefono: p.dirTel,
            correo: p.dirCorreo,
            condicion: 'D',
            nivelACargo: '',
            estado: 'activo',
            avisoRevision: false,
            fuente: { tipo: 'importacion_excel', fichaNombre: 'Importación Excel Directorio' },
            actualizadoPor: userEmail,
            actualizadoEn: timestamp,
            historial: [{ campo: 'importacion_excel', valorAnterior: '', valorNuevo: `${p.dirNombre} (${p.dirDni})`, fuente: 'Importación Excel', usuario: userEmail, fecha: timestamp }]
          };
          const ref = await dbNs.collection('directivos').add(newDoc);
          newDoc.id = ref.id;
          if (state.directivos) state.directivos.push(newDoc);
        } else {
          // Actualizar campos que no estén vacíos
          const updates = {};
          if (p.dirDni && !existingDir.dni) updates.dni = p.dirDni;
          if (p.dirTel && p.dirTel !== existingDir.telefono) updates.telefono = p.dirTel;
          if (p.dirCorreo && p.dirCorreo !== existingDir.correo) updates.correo = p.dirCorreo;
          if (Object.keys(updates).length > 0) {
            updates.actualizadoPor = userEmail;
            updates.actualizadoEn = timestamp;
            await dbNs.collection('directivos').doc(existingDir.id).update(updates);
            Object.assign(existingDir, updates);
          }
        }
      }

      // Guardar / actualizar subdirector si no es placeholder
      if (p.subNombre && !isPlaceholderDirectivo(p.subNombre)) {
        const existingSub = getDirectivosForColegio(state, colId, p.codigoLocal).find(d => d.cargo === 'Subdirector' && d.estado === 'activo' && normalizeStr(d.apellidosNombres) === normalizeStr(p.subNombre));
        if (!existingSub) {
          const newSubDoc = {
            colegioId: colId,
            codigoLocal: p.codigoLocal,
            codigoModular: col ? col.codigoModular || '' : '',
            cargo: 'Subdirector',
            apellidosNombres: p.subNombre,
            dni: p.subDni,
            telefono: p.subTel,
            correo: p.subCorreo,
            condicion: 'D',
            nivelACargo: '',
            estado: 'activo',
            avisoRevision: false,
            fuente: { tipo: 'importacion_excel', fichaNombre: 'Importación Excel Directorio' },
            actualizadoPor: userEmail,
            actualizadoEn: timestamp,
            historial: [{ campo: 'importacion_excel', valorAnterior: '', valorNuevo: `${p.subNombre} (${p.subDni})`, fuente: 'Importación Excel', usuario: userEmail, fecha: timestamp }]
          };
          const ref = await dbNs.collection('directivos').add(newSubDoc);
          newSubDoc.id = ref.id;
          if (state.directivos) state.directivos.push(newSubDoc);
        }
      }
      processed++;
    }

    modalWrap.remove();
    showToast(`✓ Importación completada: ${processed} instituciones procesadas.`);
    if (onSuccess) onSuccess();
  };
}

export async function detectDirectivoChanges(dbNs, fichaPayload, activeState) {
  const colegioId = fichaPayload.colegioId || '';
  const codigoLocal = cleanTextCode(fichaPayload.ie?.codigoLocal || fichaPayload.codigoModular || fichaPayload.codigoLocal || '');
  const institucion = (fichaPayload.institucion || '').trim();

  let matchedColegio = null;
  if (activeState && activeState.colegios) {
    matchedColegio = activeState.colegios.find(c => 
      (colegioId && c.id === colegioId) ||
      (codigoLocal && c.codigoLocal === codigoLocal) ||
      (institucion && normalizeStr(c.ie) === normalizeStr(institucion))
    );
  }

  const effectiveColId = matchedColegio ? matchedColegio.id : colegioId;
  const effectiveCodLocal = matchedColegio ? cleanTextCode(matchedColegio.codigoLocal) : codigoLocal;

  let fichaDir = null;
  if (fichaPayload.director && (fichaPayload.director.nombres || fichaPayload.director.nombre)) {
    const rawNom = fichaPayload.director.nombres || fichaPayload.director.nombre || '';
    if (!isPlaceholderDirectivo(rawNom)) {
      fichaDir = { apellidosNombres: normalizeStr(rawNom), dni: cleanTextCode(fichaPayload.director.dni || fichaPayload.directorDni || '') };
    }
  } else if (fichaPayload.directorDni || fichaPayload.director) {
    const rawNom = typeof fichaPayload.director === 'string' ? fichaPayload.director : '';
    if (!isPlaceholderDirectivo(rawNom)) {
      fichaDir = { apellidosNombres: normalizeStr(rawNom), dni: cleanTextCode(fichaPayload.directorDni || '') };
    }
  }

  let existingDirectivos = [];
  try {
    const snap = await dbNs.collection('directivos').where('codigoLocal', '==', effectiveCodLocal).get();
    if (!snap.empty) {
      existingDirectivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {}

  const activeDirector = existingDirectivos.find(d => d.cargo === 'Director' && d.estado === 'activo');
  const conflicts = [];

  if (fichaDir && fichaDir.apellidosNombres && activeDirector) {
    const samePerson = (fichaDir.dni && activeDirector.dni && fichaDir.dni === activeDirector.dni) ||
                       (normalizeStr(fichaDir.apellidosNombres) === normalizeStr(activeDirector.apellidosNombres));
    if (!samePerson) {
      conflicts.push({
        cargo: 'director',
        actualName: activeDirector.apellidosNombres,
        actualDni: activeDirector.dni,
        newName: fichaDir.apellidosNombres,
        newDni: fichaDir.dni
      });
    }
  }
  return conflicts;
}
