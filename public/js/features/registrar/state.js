/**
 * features/registrar/state.js
 * Estado y variables de sesión del módulo de registro de fichas
 * UGEL 03 · AGEBRE · Fase 4 Reorganización
 */

import {
  getEditingSubmissionId,
  getEditingSubmissionData,
  getRegSelectedTypeId,
  setRegSelectedTypeId,
  getRegSelectedColegioId,
  setRegSelectedColegioId,
  getRegBuiltFor,
  setRegBuiltFor,
  clearEditMode
} from '../../core/state/app-state.js';

export let editingSubmissionId = null;
export let editingSubmissionData = null;
export let registrarSubTab = 'registrar'; // 'registrar' | 'plantillas' | 'areas'
export let regSelectedTypeId = null;
export let regCompromisos = [];
export let regBuiltFor = null;
export let regSelectedColegioId = null;
export let currentJecVisita = 1;

export let fichaListSearchQuery = '';
export let fichaListFilterEscala = '';
export let fichaListFilterModalidad = '';
export let fichaDescExpanded = {};

export function setRegistrarSubTab(tab) {
  registrarSubTab = ['registrar', 'plantillas', 'areas'].includes(tab) ? tab : 'registrar';
}
export function getRegistrarSubTab() {
  return registrarSubTab;
}

export { setRegBuiltFor };

export function resetRegBuiltFor() {
  regBuiltFor = null;
  setRegBuiltFor(null);
  const host = document.getElementById('regFormHost');
  if (host) host.innerHTML = '';
}

export function syncEditingState() {
  editingSubmissionId = getEditingSubmissionId();
  editingSubmissionData = getEditingSubmissionData();
  const stateSelected = getRegSelectedTypeId();
  if (stateSelected) {
    regSelectedTypeId = stateSelected;
  } else if (regSelectedTypeId) {
    setRegSelectedTypeId(regSelectedTypeId);
  } else if (!editingSubmissionId) {
    try {
      const storedFt = sessionStorage.getItem('reg_prefill_ftid');
      if (storedFt) {
        regSelectedTypeId = storedFt;
        setRegSelectedTypeId(storedFt);
      } else {
        regSelectedTypeId = null;
      }
    } catch (_) {
      regSelectedTypeId = null;
    }
  }
  const stateCol = getRegSelectedColegioId();
  if (stateCol) {
    regSelectedColegioId = stateCol;
  } else if (regSelectedColegioId) {
    setRegSelectedColegioId(regSelectedColegioId);
  } else {
    try {
      const storedCol = sessionStorage.getItem('reg_prefill_colegioid');
      if (storedCol) {
        regSelectedColegioId = storedCol;
        setRegSelectedColegioId(storedCol);
      }
    } catch (_) {}
  }
  if (getRegBuiltFor() === null) {
    regBuiltFor = null;
  }
}

export function getRegSelectedTypeIdVal() { return regSelectedTypeId; }
export function setRegSelectedTypeIdVal(id) {
  regSelectedTypeId = id;
  setRegSelectedTypeId(id);
  try {
    if (id) sessionStorage.setItem('reg_prefill_ftid', id);
    else sessionStorage.removeItem('reg_prefill_ftid');
  } catch (_) {}
}
export function getRegSelectedColegioIdVal() { return regSelectedColegioId; }
export function setRegSelectedColegioIdVal(id) {
  regSelectedColegioId = id;
  setRegSelectedColegioId(id);
  try {
    if (id) sessionStorage.setItem('reg_prefill_colegioid', id);
    else sessionStorage.removeItem('reg_prefill_colegioid');
  } catch (_) {}
}
export function getCurrentJecVisita() { return currentJecVisita; }
export function setCurrentJecVisita(v) { currentJecVisita = v; }
export function getRegCompromisos() { return regCompromisos; }
export function setRegCompromisos(c) { regCompromisos = c; }
export function getFichaListSearchQuery() { return fichaListSearchQuery; }
export function setFichaListSearchQuery(q) { fichaListSearchQuery = q; }
export function getFichaListFilterEscala() { return fichaListFilterEscala; }
export function setFichaListFilterEscala(e) { fichaListFilterEscala = e; }
export function getFichaListFilterModalidad() { return fichaListFilterModalidad; }
export function setFichaListFilterModalidad(m) { fichaListFilterModalidad = m; }
export function getFichaDescExpanded() { return fichaDescExpanded; }


export function resetRegistrationSessionState() {
  clearEditMode();
  editingSubmissionId = null;
  editingSubmissionData = null;
  regBuiltFor = null;
  setRegBuiltFor(null);
  regSelectedTypeId = null;
  setRegSelectedTypeId(null);
  regCompromisos.length = 0;
  regSelectedColegioId = null;
  setRegSelectedColegioId(null);
  currentJecVisita = 1;
  try {
    sessionStorage.removeItem('reg_prefill_ftid');
    sessionStorage.removeItem('reg_prefill_colegioid');
    sessionStorage.removeItem('reg_prefill_visita');
  } catch (_) {}
}