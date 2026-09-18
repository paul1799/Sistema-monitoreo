/* =========================================================================
   app.js — Archivo principal que importa los demás módulos e inicializa
   el flujo completo de la aplicación.
   ========================================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { FIREBASE_CONFIG } from './firebase-config.js?v=20260918_v10';
import { getFirestore, makeDbAdapter } from './firestore.js?v=20260918_v10';
import { getAuth, signOut, setupAuthListeners } from './auth.js?v=20260918_v10';
import {
  esc,
  showToast,
  setupNavigation,
  viewDashboard,
  renderRegistrarTab,
  renderConsolidadoTab,
  renderColegiosTab,
  renderAlertasTab,
  renderTiposTab,
  renderUsuariosTab,
  renderResponsablesTab,
  renderConcursosTab,
  renderForbidden,
  setEditMode,
} from './ui.js?v=20260918_v10';

/* ============================= ESTADO GLOBAL ============================= */
let firebaseApp = null;
let firestoreDb  = null;
let auth         = null;
let dbNs         = null;

let currentUser = null;
let currentRole = null; // 'admin' | 'general'

const state = {
  activeTab:         'dashboard',
  fichaTypes:        [],  // {id, nombre, descripcion, icono, tipoRespuesta, secciones, extras}
  submissions:       [],  // {id, fichaTypeId, ...}
  roles:             [],  // {id(=uid), email, role, createdAt}  — solo admin
  colegios:          [],  // {id, rei, codigoLocal, ie, ...}
  responsables:      [],  // {id, red, distrito, especialista, nombresApellidos, cargo, modalidad, celular, correo}
  tiposConcurso:     [],  // {id, nombre, tipoParticipacion, tieneGenero, tieneDisciplina, tieneTituloTrabajo, categorias, ...}
  concursoRegistros: [],  // {id, tipoConcursoId, etapa, categoria, institucion, participantes, asesores, ...}
};

function isAdmin() { return currentRole === 'admin'; }

function getFichaType(id) {
  return state.fichaTypes.find(f => f.id === id) || null;
}

/* ============================= NAVIGATE HELPER ============================= */
/** Cambia de pestaña programáticamente (usado desde botones "Editar" en Consolidado) */
function navigate(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
  const btn = document.querySelector('.navbtn[data-tab="' + tab + '"]');
  if (btn) btn.classList.add('active');
  render();
}

/* ============================= RENDER DISPATCH ============================= */
function render() {
  const c = document.getElementById('tabContent');
  switch (state.activeTab) {
    case 'dashboard':
      c.innerHTML = viewDashboard(state, getFichaType);
      break;
    case 'registrar':
      renderRegistrarTab(c, state, getFichaType, dbNs, currentUser, navigate);
      break;
    case 'consolidado':
      renderConsolidadoTab(c, state, getFichaType, dbNs, isAdmin(), navigate);
      break;
    case 'concursos':
      renderConcursosTab(c, state, dbNs, isAdmin(), currentUser, navigate);
      break;
    case 'colegios':
      renderColegiosTab(c, state, getFichaType, dbNs, isAdmin(), currentUser);
      break;
    case 'alertas':
      renderAlertasTab(c, state, getFichaType);
      break;
    case 'tipos':
      isAdmin() ? renderTiposTab(c, state, getFichaType, dbNs) : renderForbidden(c);
      break;
    case 'usuarios':
      isAdmin() ? renderUsuariosTab(c, state, dbNs, currentUser) : renderForbidden(c);
      break;
    case 'responsables':
      renderResponsablesTab(c, state, dbNs, isAdmin(), currentUser);
      break;
  }
}

/* ============================= FIRESTORE LISTENERS ============================= */
function startListeners() {
  if (startListeners._started) return;
  startListeners._started = true;

  dbNs.collection('fichaTypes').onSnapshot(snap => {
    state.fichaTypes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.fichaTypes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    render();
  }, err => {
    console.error('fichaTypes snapshot error', err);
    showToast('Error leyendo tipos de ficha: [' + (err.code || 'error') + '] ' + err.message);
  });

  dbNs.collection('submissions').orderBy('createdAt', 'desc').limit(1000).onSnapshot(snap => {
    state.submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // No destruir el formulario si el usuario está en la pestaña registrar
    if (state.activeTab !== 'registrar') {
      render();
    }
  }, err => {
    console.error('submissions snapshot error', err);
    showToast('Error leyendo fichas: [' + (err.code || 'error') + '] ' + err.message);
  });

  dbNs.collection('colegios').onSnapshot(snap => {
    state.colegios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.colegios.sort((a, b) => (a.ie || '').localeCompare(b.ie || ''));
    if (state.activeTab !== 'registrar') {
      render();
    }
  }, err => {
    console.error('colegios snapshot error', err);
    showToast('Error leyendo el padrón: [' + (err.code || 'error') + '] ' + err.message);
  });

  dbNs.collection('responsables').onSnapshot(snap => {
    state.responsables = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.responsables.sort((a, b) => (a.nombresApellidos || a.especialista || '').localeCompare(b.nombresApellidos || b.especialista || ''));
    if (state.activeTab !== 'registrar') {
      render();
    }
  }, err => {
    console.error('responsables snapshot error', err);
  });

  // Catálogo de tipos de concurso
  dbNs.collection('tiposConcurso').onSnapshot(snap => {
    state.tiposConcurso = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.tiposConcurso.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
    if (state.activeTab === 'concursos') {
      render();
    }
  }, err => {
    console.error('tiposConcurso snapshot error', err);
  });

  // Registros de concursos
  dbNs.collection('concursoRegistros').orderBy('createdAt', 'desc').limit(2000).onSnapshot(snap => {
    state.concursoRegistros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (state.activeTab === 'concursos') {
      render();
    }
  }, err => {
    console.error('concursoRegistros snapshot error', err);
  });

  if (isAdmin()) {
    dbNs.collection('roles').onSnapshot(snap => {
      state.roles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.roles.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      render();
    }, err => {
      console.error('roles snapshot error', err);
    });
  }

  render();
}

/* ============================= AUTH CALLBACKS ============================= */
function onLogin(user, role) {
  currentUser = user;
  currentRole = role;

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Ocultar botones de admin si el usuario es general
  document.querySelectorAll('.navbtn[data-admin-only]').forEach(b => {
    b.style.display = isAdmin() ? '' : 'none';
  });

  // Actualizar pie del sidebar
  const foot = document.getElementById('sidebarFoot');
  const roleLabel = isAdmin() ? 'Administrador' : 'General';
  foot.innerHTML =
    'Conectado como <strong>' + esc(user.email || user.displayName || 'usuario') + '</strong>' +
    ' · <span class="badge ' + (isAdmin() ? 'st-logrado' : 'st-none') + '">' + roleLabel + '</span><br>' +
    'Todos los especialistas con acceso ven la misma información.<br>' +
    '<button class="linklike" id="logoutBtn" style="margin-top:6px">Cerrar sesión</button>';

  document.getElementById('logoutBtn').addEventListener('click', () => signOut(auth));

  startListeners();
}

function onLogout() {
  currentUser = null;
  currentRole = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

/* ============================= INICIALIZACIÓN ============================= */
async function initApp() {
  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firestoreDb  = getFirestore(firebaseApp);
    dbNs         = makeDbAdapter(firestoreDb);
    auth         = getAuth(firebaseApp);
  } catch (e) {
    console.error('No se pudo inicializar Firebase. Revisa FIREBASE_CONFIG.', e);
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginError').textContent =
      'No se pudo inicializar Firebase. Revisa la configuración (firebase-config.js).';
    return;
  }

  // Configurar navegación entre pestañas
  setupNavigation(state, render);

  // Configurar listeners de autenticación
  setupAuthListeners(auth, firestoreDb, { onLogin, onLogout });
}

// Render inicial (muestra el estado vacío mientras carga Firebase)
render();
initApp();
