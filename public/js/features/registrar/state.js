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
  clearEditMode,
  getRegSessionEpoch
} from '../../core/state/app-state.js';
import { resetEbrFormState } from '../../ebr-gestion.js';
import { resetCebeFormState } from '../../cebe-gestion.js';
import { resetPriteFormState } from '../../prite-gestion.js';
import { resetJecFormState } from '../../jec-monitoreo.js';
import { resetJec1erFormState } from '../../jec-1er-monitoreo.js';

export let editingSubmissionId = null;
export let editingSubmissionData = null;
export let registrarSubTab = 'registrar'; // 'registrar' | 'plantillas' | 'areas'
export let regSelectedTypeId = null;
export let regCompromisos = [];
export let regBuiltFor = null;
export let regSelectedColegioId = null;
export let currentJecVisita = 1;
let _lastSyncedEpoch = -1;
let _regFormSessionKey = null;

export function getRegFormSessionKey() { return _regFormSessionKey; }
export function setRegFormSessionKey(key) { _regFormSessionKey = key; }

export function resetAllSpecializedFormStates() {
  resetEbrFormState();
  resetCebeFormState();
  resetPriteFormState();
  resetJecFormState();
  resetJec1erFormState();
}

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
  const currentEpoch = getRegSessionEpoch();
  const epochChanged = _lastSyncedEpoch !== currentEpoch;
  if (epochChanged) {
    _lastSyncedEpoch = currentEpoch;
    regSelectedTypeId = getRegSelectedTypeId() || null;
    regSelectedColegioId = getRegSelectedColegioId() || null;
    regCompromisos.length = 0;
    currentJecVisita = 1;
    _regFormSessionKey = null;
    regBuiltFor = null;
    resetAllSpecializedFormStates();
  }

  editingSubmissionId = getEditingSubmissionId();
  editingSubmissionData = getEditingSubmissionData();
  const stateSelected = getRegSelectedTypeId();
  if (stateSelected) {
    regSelectedTypeId = stateSelected;
  } else if (!epochChanged && regSelectedTypeId) {
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
  } else if (!epochChanged && regSelectedColegioId) {
    setRegSelectedColegioId(regSelectedColegioId);
  } else {
    try {
      const storedCol = sessionStorage.getItem('reg_prefill_colegioid');
      if (storedCol) {
        regSelectedColegioId = storedCol;
        setRegSelectedColegioId(storedCol);
      } else {
        regSelectedColegioId = null;
      }
    } catch (_) {
      regSelectedColegioId = null;
    }
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
  _lastSyncedEpoch = getRegSessionEpoch();
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
  _regFormSessionKey = null;
  resetAllSpecializedFormStates();
  try {
    sessionStorage.removeItem('reg_prefill_ftid');
    sessionStorage.removeItem('reg_prefill_colegioid');
    sessionStorage.removeItem('reg_prefill_visita');
  } catch (_) {}
}