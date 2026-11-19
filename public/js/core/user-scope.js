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
 * Computa y retorna las II.EE. asignadas según modalidades y REIs seleccionadas:
 * - EBR: Colegios EBR de la(s) REI(s) seleccionada(s).
 * - EBE: Todos los centros CEBE y programas PRITE de la UGEL 03 (todas las REIs).
 * - JEC: Todas las 29 II.EE. con Modelo JEC de la UGEL 03 (todas las REIs).
 * - EBR + EBE: Todos los CEBE y PRITE + colegios EBR de la(s) REI(s) asignada(s).
 * 
 * @param {Array} allColegios - Padrón completo de colegios
 * @param {string[]} selectedMods - Modalidades asignadas (ej. ['EBR'], ['EBE'], ['EBR', 'EBE'], ['JEC'])
 * @param {string[]} selectedReis - REIs asignadas (ej. ['01'], ['08'], ['TODAS'])
 * @returns {Array} Colegios filtrados
 */
export function computeJurisdictionColegios(allColegios = [], selectedMods = [], selectedReis = []) {
  if (!allColegios || !allColegios.length) return [];
  const mods = (selectedMods || []).map(m => String(m).trim().toUpperCase());
  if (mods.includes('TODAS')) {
    const reis = (selectedReis || []).map(normalizeReiNumber);
    if (reis.includes('TODAS') || !reis.length) return allColegios;
    return allColegios.filter(c => {
      const colRei = normalizeReiNumber(c.rei || c.red);
      return Boolean(colRei && reis.includes(colRei));
    });
  }

  const reis = (selectedReis || []).map(normalizeReiNumber);
  const isAllReis = reis.includes('TODAS') || reis.length === 16;

  return allColegios.filter(c => {
    const colMod = String(c.modalidad || '').toUpperCase();
    const colName = String(c.ie || '').toUpperCase();
    const colRei = normalizeReiNumber(c.rei || c.red);

    const isJecCol = Boolean(
      c.esJec || c.es_jec ||
      String(c.modelo || '').toUpperCase() === 'JEC' ||
      colMod.includes('JEC')
    );

    const isEbeCol = Boolean(
      colMod.includes('EBE') || colMod.includes('CEBE') || colMod.includes('PRITE') ||
      colMod.includes('ESPECIAL') || colName.includes('CEBE') || colName.includes('PRITE') ||
      colName.includes('BÁSICA ESPECIAL') || colName.includes('BASICA ESPECIAL')
    );

    const isEbrCol = Boolean(
      !isEbeCol && (
        colMod.includes('EBR') || colMod.includes('INICIAL') || colMod.includes('PRIMARIA') ||
        colMod.includes('SECUNDARIA') || colMod.includes('REGULAR') || !colMod
      )
    );

    // 1. Si tiene JEC y el colegio es JEC -> TIENE ACCESO AUTOMÁTICO en todas las REIs
    if (mods.includes('JEC') && isJecCol) {
      return true;
    }

    // 2. Si tiene EBE y el colegio es EBE o PRITE -> TIENE ACCESO AUTOMÁTICO en todas las REIs
    if (mods.includes('EBE') && isEbeCol) {
      return true;
    }

    // 3. Si tiene EBR y el colegio es EBR -> TIENE ACCESO si su REI coincide
    if (mods.includes('EBR') && isEbrCol) {
      if (isAllReis) return true;
      if (colRei && reis.includes(colRei)) return true;
    }

    return false;
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
  if (isAdmin || !colegio || !userRoleDoc || userRoleDoc?.userType === 'coordinador' || userRoleDoc?.userType === 'admin' || userRoleDoc?.role === 'admin' || userRoleDoc?.role === 'coordinador') return true;

  // 1. Si el especialista tiene una lista específica de colegios asignados seleccionados
  const explicitCols = userRoleDoc.colegios || userRoleDoc.colegiosPermitidos;
  if (Array.isArray(explicitCols) && explicitCols.length > 0 && !explicitCols.includes('TODAS') && !explicitCols.includes('TODOS')) {
    const cid = String(colegio.id || '');
    const cloc = String(colegio.codigoLocal || '');
    const cmod = String(colegio.codigoModular || '');
    const cie = normalizeText(colegio.ie || '');
    return explicitCols.some(k => {
      const s = String(k);
      return s && (s === cid || s === cloc || s === cmod || normalizeText(s) === cie);
    });
  }

  const assignedMods = getUserAssignedModalidades(userRoleDoc, isAdmin);
  const assignedReis = getUserAssignedReis(userRoleDoc, isAdmin);

  const matched = computeJurisdictionColegios([colegio], assignedMods, assignedReis);
  return matched.length > 0;
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

  // 1. Si el usuario cuenta con delimitación precisa de colegios (checkboxes específicos)
  const explicitCols = userRoleDoc.colegios || userRoleDoc.colegiosPermitidos;
  const hasExplicitCols = Array.isArray(explicitCols) && explicitCols.length > 0 && !explicitCols.includes('TODAS') && !explicitCols.includes('TODOS');
  if (hasExplicitCols) {
    let colMatches = false;
    if (colegio) {
      colMatches = isColegioInUserScope(colegio, userRoleDoc, isAdmin);
    } else {
      const subColId = String(sub.colegioId || '');
      const subCodMod = String(sub.codigoModular || '');
      const subInst = normalizeText(sub.institucion || '');
      colMatches = explicitCols.some(k => {
        const s = String(k);
        return s && (s === subColId || s === subCodMod || normalizeText(s) === subInst);
      });
    }
    if (!colMatches) return false;
    if (typeof getFichaType === 'function' && sub.fichaTypeId) {
      const ft = getFichaType(sub.fichaTypeId);
      if (ft && !isFichaTypeInUserScope(ft, userRoleDoc, isAdmin)) {
        return false;
      }
    }
    return true;
  }

  const assignedReis = getUserAssignedReis(userRoleDoc, isAdmin);
  const assignedMods = getUserAssignedModalidades(userRoleDoc, isAdmin);

  if (assignedReis.includes('TODAS') && assignedMods.includes('TODAS')) {
    return true;
  }

  let ft = null;
  if (typeof getFichaType === 'function' && sub.fichaTypeId) {
    ft = getFichaType(sub.fichaTypeId);
  }

  const ftId = String(sub.fichaTypeId || ft?.id || '').toLowerCase();
  const ftMod = String(ft?.modalidad || ft?.grupo || '').toUpperCase();
  const colMod = String(colegio?.modalidad || '').toUpperCase();
  const colName = String(colegio?.ie || sub.institucion || '').toUpperCase();

  const isJec = Boolean(
    colegio?.esJec || colegio?.es_jec ||
    String(colegio?.modelo || '').toUpperCase() === 'JEC' ||
    ftMod.includes('JEC') || colMod.includes('JEC') ||
    ftId.includes('jec')
  );

  const isEbe = Boolean(
    ftMod.includes('EBE') || ftMod.includes('CEBE') || ftMod.includes('PRITE') ||
    colMod.includes('EBE') || colMod.includes('CEBE') || colMod.includes('PRITE') ||
    colMod.includes('ESPECIAL') || colName.includes('CEBE') || colName.includes('PRITE') ||
    ftId.includes('cebe') || ftId.includes('prite')
  );

  const isEbr = Boolean(
    !isEbe && (
      ftMod.includes('EBR') || colMod.includes('EBR') ||
      ftMod.includes('DOCENTE') || ftMod.includes('DIRECTIVO') ||
      colMod.includes('INICIAL') || colMod.includes('PRIMARIA') || colMod.includes('SECUNDARIA') ||
      ftId.includes('ebr') || ftId.includes('rubricas') || ftId.includes('directivo') ||
      (!ftMod && !colMod)
    )
  );

  let subRei = normalizeReiNumber(sub.red || sub.rei || (sub.ie && (sub.ie.red || sub.ie.rei)));
  if (!subRei && colegio) {
    subRei = normalizeReiNumber(colegio.rei || colegio.red);
  }

  // 1. Acceso a JEC: todas las REIs
  if (assignedMods.includes('JEC') && isJec) {
    return true;
  }

  // 2. Acceso a EBE: todas las REIs
  if (assignedMods.includes('EBE') && isEbe) {
    return true;
  }

  // 3. Acceso a EBR: restringido a las REIs asignadas
  if (assignedMods.includes('EBR') && isEbr) {
    if (assignedReis.includes('TODAS')) return true;
    if (subRei && assignedReis.includes(subRei)) return true;
  }

  return false;
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
