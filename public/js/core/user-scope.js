/* =========================================================================
   core/user-scope.js — Delimitación y filtrado de jurisdicción (REI y Modalidad)
   UGEL 03 · AGEBRE · Sistema de Monitoreo
   ========================================================================= */

import { normalizeReiNumber, normalizeText } from '../ui/core-utils.js';

/**
 * Obtiene las REIs asignadas al usuario actual como un array de strings normalizados de 2 dígitos.
 * Retorna ['TODAS'] si es administrador o si tiene 'TODAS'.
 * @param {Object} userRoleDoc 
 * @param {boolean} isAdmin 
 * @returns {string[]}
 */
export function getUserAssignedReis(userRoleDoc, isAdmin = false) {
  if (isAdmin || userRoleDoc?.userType === 'coordinador' || userRoleDoc?.userType === 'admin' || userRoleDoc?.role === 'admin' || userRoleDoc?.role === 'coordinador') {
    return ['TODAS'];
  }
  const rawReis = userRoleDoc?.reis;
  if (!rawReis) return ['TODAS'];
  if (Array.isArray(rawReis)) {
    if (rawReis.includes('TODAS')) return ['TODAS'];
    const norm = rawReis.map(normalizeReiNumber).filter(Boolean);
    return norm.length ? norm : ['TODAS'];
  }
  if (typeof rawReis === 'string') {
    if (rawReis.trim() === 'TODAS' || !rawReis.trim()) return ['TODAS'];
    const norm = rawReis.split(/[,\s/]+/).map(normalizeReiNumber).filter(Boolean);
    return norm.length ? norm : ['TODAS'];
  }
  return ['TODAS'];
}

/**
 * Obtiene las modalidades asignadas al usuario actual como un array de strings (mayúsculas).
 * Soporta múltiples modalidades (ej. ['EBR', 'EBE'] para la responsable de REI 08).
 * Retorna ['TODAS'] si es administrador o si tiene 'TODAS'.
 * @param {Object} userRoleDoc 
 * @param {boolean} isAdmin 
 * @returns {string[]}
 */
export function getUserAssignedModalidades(userRoleDoc, isAdmin = false) {
  if (isAdmin || userRoleDoc?.userType === 'coordinador' || userRoleDoc?.userType === 'admin' || userRoleDoc?.role === 'admin' || userRoleDoc?.role === 'coordinador') {
    return ['TODAS'];
  }
  const rawMods = userRoleDoc?.modalidades || userRoleDoc?.modalidad;
  if (!rawMods) return ['TODAS'];
  if (Array.isArray(rawMods)) {
    if (rawMods.includes('TODAS')) return ['TODAS'];
    const clean = rawMods.flatMap(m => String(m).split(/[,/\-\s]+/)).map(m => m.trim().toUpperCase()).filter(Boolean);
    return clean.length ? clean : ['TODAS'];
  }
  if (typeof rawMods === 'string') {
    if (rawMods.trim() === 'TODAS' || !rawMods.trim()) return ['TODAS'];
    const parts = rawMods.split(/[,/\-\s]+/).map(m => m.trim().toUpperCase()).filter(Boolean);
    return parts.length ? parts : ['TODAS'];
  }
  return ['TODAS'];
}

/**
 * Determina si un tipo de ficha corresponde a las modalidades asignadas al usuario.
 * @param {Object} ft - Objeto tipo de ficha (o metadata enriquecida)
 * @param {Object} userRoleDoc - Documento de rol de Firestore
 * @param {boolean} isAdmin - Si el usuario es administrador
 * @returns {boolean}
 */
export function isFichaTypeInUserScope(ft, userRoleDoc, isAdmin = false) {
  if (isAdmin || !userRoleDoc || userRoleDoc?.userType === 'coordinador' || userRoleDoc?.userType === 'admin' || userRoleDoc?.role === 'admin' || userRoleDoc?.role === 'coordinador') return true;
  const assignedMods = getUserAssignedModalidades(userRoleDoc, isAdmin);
  if (assignedMods.includes('TODAS')) return true;

  if (!ft) return false;
  const ftId = String(ft.id || '').toLowerCase();
  const ftGroup = String(ft.grupo || '').trim();
  const ftMod = String(ft.modalidad || '').toUpperCase();
  const ftName = String(ft.nombre || ft.nombreCorto || '').toUpperCase();

  const isJecFicha = Boolean(
    ftGroup.includes('JEC') ||
    ftMod.includes('JEC') ||
    ftId.includes('jec') ||
    ftName.includes('JEC') ||
    ftName.includes('JORNADA ESCOLAR COMPLETA')
  );

  const isEbeFicha = Boolean(
    ftGroup.includes('CEBE') ||
    ftGroup.includes('PRITE') ||
    ftMod.includes('CEBE') ||
    ftMod.includes('PRITE') ||
    ftMod.includes('EBE') ||
    ftId.includes('cebe') ||
    ftId.includes('prite') ||
    ftName.includes('CEBE') ||
    ftName.includes('PRITE') ||
    ftName.includes('ESPECIAL')
  );

  const isEbrFicha = Boolean(
    !isJecFicha && !isEbeFicha && (
      ftGroup === 'EBR' ||
      ftGroup === 'Docentes' ||
      ftMod.includes('EBR') ||
      ftMod.includes('INICIAL') ||
      ftMod.includes('PRIMARIA') ||
      ftMod.includes('SECUNDARIA') ||
      ftMod.includes('DOCENTE') ||
      ftMod.includes('DIRECTIVO') ||
      ftId.includes('ebr') ||
      ftId.includes('rubricas') ||
      ftId.includes('directivo') ||
      ftName.includes('EBR') ||
      ftName.includes('DOCENTE') ||
      ftName.includes('DIRECTIVO') ||
      !ftGroup
    )
  );

  return assignedMods.some(m => {
    if (m === 'JEC') return isJecFicha;
    if (m === 'EBE') return isEbeFicha;
    if (m === 'EBR') return isEbrFicha;
    return ftMod.includes(m) || ftGroup.toUpperCase().includes(m);
  });
}

/**
 * Determina si un colegio pertenece a la jurisdicción (REI y modalidad) del usuario.
 * @param {Object} colegio 
 * @param {Object} userRoleDoc 
 * @param {boolean} isAdmin 
 * @returns {boolean}
 */
export function isColegioInUserScope(colegio, userRoleDoc, isAdmin = false) {
  if (isAdmin || !userRoleDoc || userRoleDoc?.userType === 'coordinador' || userRoleDoc?.userType === 'admin' || userRoleDoc?.role === 'admin' || userRoleDoc?.role === 'coordinador') return true;
  const assignedReis = getUserAssignedReis(userRoleDoc, isAdmin);
  const assignedMods = getUserAssignedModalidades(userRoleDoc, isAdmin);

  // 1. Validar REI
  if (!assignedReis.includes('TODAS') && assignedReis.length > 0) {
    const colRei = normalizeReiNumber(colegio?.rei || colegio?.red);
    if (!colRei || !assignedReis.includes(colRei)) {
      return false;
    }
  }

  // 2. Validar Modalidad
  if (!assignedMods.includes('TODAS') && assignedMods.length > 0) {
    const colMod = String(colegio?.modalidad || '').toUpperCase();
    const isJecCol = Boolean(
      colegio?.esJec || colegio?.es_jec ||
      String(colegio?.modelo || '').toUpperCase() === 'JEC' ||
      colMod.includes('JEC')
    );
    
    const matchesAnyMod = assignedMods.some(m => {
      if (m === 'JEC') return isJecCol;
      if (m === 'EBE') return colMod.includes('EBE') || colMod.includes('CEBE') || colMod.includes('PRITE');
      if (m === 'EBR') return (colMod.includes('EBR') || colMod.includes('INICIAL') || colMod.includes('PRIMARIA') || colMod.includes('SECUNDARIA')) && (!isJecCol || assignedMods.includes('JEC'));
      return colMod.includes(m);
    });

    if (!matchesAnyMod) return false;
  }

  return true;
}

/**
 * Determina si una ficha (submission) pertenece a la jurisdicción (REI y modalidad) del usuario.
 * @param {Object} sub 
 * @param {Object} state 
 * @param {Object} userRoleDoc 
 * @param {boolean} isAdmin 
 * @param {Function} [getFichaType] 
 * @returns {boolean}
 */
export function isSubmissionInUserScope(sub, state, userRoleDoc, isAdmin = false, getFichaType = null) {
  if (isAdmin || !userRoleDoc || userRoleDoc?.userType === 'coordinador' || userRoleDoc?.userType === 'admin' || userRoleDoc?.role === 'admin' || userRoleDoc?.role === 'coordinador') return true;
  const assignedReis = getUserAssignedReis(userRoleDoc, isAdmin);
  const assignedMods = getUserAssignedModalidades(userRoleDoc, isAdmin);

  // Si tiene TODAS en ambas, está libre
  if (assignedReis.includes('TODAS') && assignedMods.includes('TODAS')) {
    return true;
  }

  // Encontrar el colegio vinculado si existe en el padrón
  let colegio = null;
  if (state?.colegios && Array.isArray(state.colegios)) {
    if (sub.colegioId) colegio = state.colegios.find(c => c.id === sub.colegioId);
    if (!colegio && sub.codigoModular) {
      const q = normalizeText(sub.codigoModular);
      colegio = state.colegios.find(c => normalizeText(c.codigoLocal) === q || normalizeText(c.codigoModular) === q);
    }
    if (!colegio && sub.institucion) {
      const q = normalizeText(sub.institucion);
      colegio = state.colegios.find(c => normalizeText(c.ie) === q);
    }
  }

  // 1. Validar REI
  if (!assignedReis.includes('TODAS') && assignedReis.length > 0) {
    let subRei = normalizeReiNumber(sub.red || sub.rei || (sub.ie && (sub.ie.red || sub.ie.rei)));
    if (!subRei && colegio) {
      subRei = normalizeReiNumber(colegio.rei || colegio.red);
    }
    if (!subRei || !assignedReis.includes(subRei)) {
      return false;
    }
  }

  // 2. Validar Modalidad
  if (!assignedMods.includes('TODAS') && assignedMods.length > 0) {
    let ft = null;
    if (typeof getFichaType === 'function' && sub.fichaTypeId) {
      ft = getFichaType(sub.fichaTypeId);
    }
    if (ft && !isFichaTypeInUserScope(ft, userRoleDoc, isAdmin)) {
      return false;
    }
    const ftMod = String(ft?.modalidad || ft?.grupo || '').toUpperCase();
    const colMod = String(colegio?.modalidad || '').toUpperCase();
    const isJec = Boolean(
      colegio?.esJec || colegio?.es_jec ||
      ftMod.includes('JEC') || colMod.includes('JEC') ||
      (sub.fichaTypeId || '').includes('jec')
    );

    const matchesAnyMod = assignedMods.some(m => {
      if (m === 'JEC') return isJec;
      if (m === 'EBE') return ftMod.includes('EBE') || ftMod.includes('CEBE') || ftMod.includes('PRITE') || colMod.includes('EBE') || colMod.includes('CEBE') || colMod.includes('PRITE');
      if (m === 'EBR') return (ftMod.includes('EBR') || colMod.includes('EBR') || colMod.includes('INICIAL') || colMod.includes('PRIMARIA') || colMod.includes('SECUNDARIA')) && (!isJec || assignedMods.includes('JEC'));
      return ftMod.includes(m) || colMod.includes(m);
    });

    if (!matchesAnyMod) return false;
  }

  return true;
}

/**
 * Retorna las instituciones educativas filtradas para el usuario activo
 * @param {Object} state 
 * @param {Object} userRoleDoc 
 * @param {boolean} isAdmin 
 * @returns {Array}
 */
export function getScopedColegios(state, userRoleDoc, isAdmin = false) {
  const allColegios = state?.colegios || [];
  if (isAdmin || !userRoleDoc) return allColegios;
  return allColegios.filter(c => isColegioInUserScope(c, userRoleDoc, isAdmin));
}

/**
 * Retorna las fichas (submissions) filtradas para el usuario activo
 * @param {Object} state 
 * @param {Object} userRoleDoc 
 * @param {boolean} isAdmin 
 * @param {Function} [getFichaType] 
 * @returns {Array}
 */
export function getScopedSubmissions(state, userRoleDoc, isAdmin = false, getFichaType = null) {
  const allSubs = state?.submissions || [];
  if (isAdmin || !userRoleDoc) return allSubs;
  return allSubs.filter(s => isSubmissionInUserScope(s, state, userRoleDoc, isAdmin, getFichaType));
}
