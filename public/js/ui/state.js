/* =========================================================================
   ui/state.js — Gestión centralizada del estado global, sesión y edición en UI
   ========================================================================= */

let _appState = null;

export function setAppState(s) {
  if (s) _appState = s;
}

export function getAppState() {
  return _appState || (typeof window !== 'undefined' ? window.state : null) || {};
}

let _currentSessionUser = null;

export function setSessionUser(user) {
  if (user) _currentSessionUser = user;
}

export function getSessionUser() {
  return _currentSessionUser;
}

/* ============================= ESTADO DE EDICIÓN Y ORDEN ============================= */
let editingSubmissionId = null;
let editingSubmissionData = null;
let dashboardSortAsc = true; // Por defecto: urgente (menor avance) arriba

let _regSelectedTypeId = null;
let _regBuiltFor = null;
let _regSelectedColegioId = null;

export function getRegSelectedTypeId() {
  return _regSelectedTypeId;
}
export function setRegSelectedTypeId(val) {
  _regSelectedTypeId = val;
}

export function getRegBuiltFor() {
  return _regBuiltFor;
}
export function setRegBuiltFor(val) {
  _regBuiltFor = val;
}

export function getRegSelectedColegioId() {
  return _regSelectedColegioId;
}
export function setRegSelectedColegioId(val) {
  _regSelectedColegioId = val;
}

export function selectFichaForRegistration(fichaTypeId, colegioId = null) {
  _regSelectedTypeId = fichaTypeId;
  _regBuiltFor = null;
  _regSelectedColegioId = colegioId;
}

/** Activa el modo edición de una ficha ya registrada. Llamar antes de navegar a 'registrar'. */
export function setEditMode(id, data) {
  editingSubmissionId = id;
  editingSubmissionData = data ? JSON.parse(JSON.stringify(data)) : null;
  if (data && data.fichaTypeId) {
    _regSelectedTypeId = data.fichaTypeId;
    _regBuiltFor = null;
  }
}

/** Limpia el modo edición para iniciar un nuevo registro limpio */
export function clearEditMode() {
  editingSubmissionId = null;
  editingSubmissionData = null;
  _regSelectedTypeId = null;
  _regBuiltFor = null;
  _regSelectedColegioId = null;
}

export function getEditingSubmissionId() {
  return editingSubmissionId;
}

export function getEditingSubmissionData() {
  return editingSubmissionData;
}

export function getEditingSubmission() {
  return { id: editingSubmissionId, data: editingSubmissionData };
}

export function getDashboardSortAsc() {
  return dashboardSortAsc;
}

export function setDashboardSortAsc(val) {
  dashboardSortAsc = Boolean(val);
}
