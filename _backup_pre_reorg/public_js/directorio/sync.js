/* =========================================================================
   directorio/sync.js — Sincronización y persistencia de Directivos
   UGEL 03 – Panel de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import { genId } from '../ui/core-utils.js';
import {
  normalizeStr,
  cleanTextCode,
  cleanEmail,
  nowIso,
  todayDateStr,
  isPlaceholderDirectivo,
  getDirectivosForColegio
} from './helpers.js';

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

/**
 * Sincroniza los datos de directivos extraídos de una ficha con la colección 'directivos'
 * y refleja los cambios en 'colegios' para mantener paridad absoluta.
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
        let newState = 'anterior';
        if (resoluciones.director === 'ENCARGATURA') {
          newState = 'activo'; // Mantiene el original activo
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

        // Crear nuevo director activo
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

/**
 * Detecta discrepancias de directivos entre la ficha a guardar y el directivo activo en el sistema
 */
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
