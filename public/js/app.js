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
  computeStats,
  forceResetBodyScroll,
  setAppState,
} from './ui.js?v=20260921_v2';

/* ============================= MANEJADORES GLOBALES DE ERROR ============================= */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Error no controlado en la aplicación:', event.error || event.message);
    showToast('Aviso del sistema: ' + (event.message || 'Ocurrió un error inesperado en la interfaz.'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('Promesa rechazada no controlada:', event.reason);
    const msg = event.reason ? (event.reason.message || String(event.reason)) : 'Operación asíncrona interrumpida';
    showToast('Aviso del sistema: ' + msg);
  });
}

/* ============================= ESTADO GLOBAL ============================= */
let firebaseApp = null;
let firestoreDb  = null;
let auth         = null;
let dbNs         = null;

let currentUser = null;
let currentRole = null; // 'admin' | 'general'
let connectionTimer = null;

const state = {
  activeTab:         'dashboard',
  fichaTypes:        [],  // {id, nombre, descripcion, icono, tipoRespuesta, secciones, extras}
  submissions:       [],  // {id, fichaTypeId, ...}
  roles:             [],  // {id(=uid), email, role, createdAt}  — solo admin
  colegios:          [],  // {id, rei, codigoLocal, ie, ...}
  responsables:      [],  // {id, red, distrito, especialista, nombresApellidos, cargo, modalidad, celular, correo}
  tiposConcurso:     [],  // {id, nombre, tipoParticipacion, tieneGenero, tieneDisciplina, tieneTituloTrabajo, categorias, ...}
  concursoRegistros: [],  // {id, tipoConcursoId, etapa, categoria, institucion, participantes, asesores, ...}
  areasFirma:        [],  // {id, nombre, sigla, descripcionEncabezado, logo, activa, esPredeterminada}
  plantillasFirmantes: [], // {id, areaId, tipoReporte, orden, cargo, nombreOpcional, entidad, leyenda}
  preferenciasDescarga: [], // {usuarioId, tipoReporte, areaId, firmantesJson, opcionesJson}
};

// Exponer state globalmente para depuración y resiliencia de módulos
if (typeof window !== 'undefined') {
  window.state = state;
}

function isAdmin() { return currentRole === 'admin'; }

function getFichaType(id) {
  return state.fichaTypes.find(f => f.id === id) || null;
}

/* ============================= NAVIGATE HELPER ============================= */
/** Cambia de pestaña programáticamente (usado desde botones "Editar" en Consolidado) */
function navigate(tab) {
  state.activeTab = tab;
  forceResetBodyScroll();
  window.scrollTo({ top: 0, behavior: 'instant' });
  document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
  const btn = document.querySelector('.navbtn[data-tab="' + tab + '"]');
  if (btn) btn.classList.add('active');

  // Si se navega a una pestaña distinta de 'concursos', limpiar parámetros de URL de concursos
  if (tab !== 'concursos' && typeof window !== 'undefined' && window.location) {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('concurso') || url.searchParams.has('etapa') || url.searchParams.has('categoria')) {
        url.searchParams.delete('concurso');
        url.searchParams.delete('etapa');
        url.searchParams.delete('categoria');
        window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
      }
    } catch (e) {
      console.warn('Error limpiando parámetros de URL:', e);
    }
  }

  render();
}

/* ============================= RENDER DISPATCH ============================= */
function render() {
  setAppState(state);
  const c = document.getElementById('tabContent');

  // Actualizar contador de alertas en la campana
  const bellBadge = document.getElementById('topBellBadge');
  if (bellBadge && state.submissions) {
    let alertCount = 0;
    state.submissions.forEach(s => {
      const ft = getFichaType(s.fichaTypeId);
      if (ft) {
        const st = computeStats(s, ft);
        if (st.pct !== null && st.pct < 70) alertCount++;
      }
    });
    if (alertCount > 0) {
      bellBadge.textContent = alertCount > 99 ? '99+' : alertCount;
      bellBadge.style.display = 'inline-block';
    } else {
      bellBadge.style.display = 'none';
    }
  }

  switch (state.activeTab) {
    case 'dashboard':
      if (state.fichaTypes.length === 0) {
        c.innerHTML = '<div class="pageHead"><h2>Resumen general</h2><p>Vista consolidada de monitoreo, niveles de avance institucional y alertas prioritarias.</p></div>' +
          '<div class="cards" style="margin-bottom:24px">' +
          '<div class="card skeletonCard"><div class="skeletonPulse" style="height:34px;width:70px;margin-bottom:8px"></div><div class="skeletonPulse" style="height:14px;width:130px"></div></div>' +
          '<div class="card skeletonCard"><div class="skeletonPulse" style="height:34px;width:70px;margin-bottom:8px"></div><div class="skeletonPulse" style="height:14px;width:130px"></div></div>' +
          '<div class="card skeletonCard"><div class="skeletonPulse" style="height:34px;width:70px;margin-bottom:8px"></div><div class="skeletonPulse" style="height:14px;width:130px"></div></div>' +
          '<div class="card skeletonCard"><div class="skeletonPulse" style="height:34px;width:70px;margin-bottom:8px"></div><div class="skeletonPulse" style="height:14px;width:130px"></div></div>' +
          '</div>' +
          '<div class="panel" style="padding:22px">' +
          '<div class="skeletonPulse" style="height:22px;width:240px;margin-bottom:16px"></div>' +
          '<div class="skeletonPulse" style="height:160px;width:100%"></div>' +
          '</div>';
      } else {
        c.innerHTML = viewDashboard(state, getFichaType, render);
      }
      break;
    case 'registrar':
      renderRegistrarTab(c, state, getFichaType, dbNs, currentUser, navigate);
      break;
    case 'consolidado':
      renderConsolidadoTab(c, state, getFichaType, dbNs, isAdmin(), navigate, currentUser);
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
      isAdmin() ? renderTiposTab(c, state, getFichaType, dbNs, isAdmin(), currentUser) : renderForbidden(c);
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

  // Catálogo administrable de áreas de firma
  dbNs.collection('areasFirma').onSnapshot(snap => {
    state.areasFirma = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.areasFirma.sort((a, b) => (a.orden || 99) - (b.orden || 99));
    if (state.activeTab === 'tipos') {
      render();
    }
  }, err => {
    console.error('areasFirma snapshot error', err);
  });

  // Plantillas de firmantes por área y tipo de reporte
  dbNs.collection('plantillasFirmantes').onSnapshot(snap => {
    state.plantillasFirmantes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    state.plantillasFirmantes.sort((a, b) => (a.orden || 99) - (b.orden || 99));
    if (state.activeTab === 'tipos') {
      render();
    }
  }, err => {
    console.error('plantillasFirmantes snapshot error', err);
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

/* ============================= ESTADO DE CONEXIÓN ============================= */
function setConnectionState(status) { // 'connecting' | 'online' | 'offline' | 'slow'
  const pill = document.getElementById('connectionStatusPill');
  const alertEl = document.getElementById('connectionAlert');
  if (!pill) return;

  const label = pill.querySelector('.connLabel');
  if (status === 'online') {
    pill.className = 'connPill online';
    if (label) label.textContent = 'En línea';
    pill.title = 'Conectado a Firebase Firestore en tiempo real';
    if (alertEl) alertEl.style.display = 'none';
  } else if (status === 'connecting') {
    pill.className = 'connPill connecting';
    if (label) label.textContent = 'Conectando…';
    pill.title = 'Estableciendo conexión con el servidor...';
  } else if (status === 'slow') {
    pill.className = 'connPill offline';
    if (label) label.textContent = 'Conexión lenta';
    pill.title = 'La conexión está tardando más de lo habitual';
    if (alertEl) alertEl.style.display = 'block';
  } else if (status === 'offline') {
    pill.className = 'connPill offline';
    if (label) label.textContent = 'Sin conexión';
    pill.title = 'Sin conexión a internet';
    if (alertEl) alertEl.style.display = 'block';
  }
}

/* ============================= AUTH CALLBACKS ============================= */
function onLogin(user, role) {
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  setConnectionState('online');

  currentUser = user;
  currentRole = role;

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Ocultar botones de admin si el usuario es general
  document.querySelectorAll('.navbtn[data-admin-only]').forEach(b => {
    b.style.display = isAdmin() ? '' : 'none';
  });

  // 1. Actualizar barra superior de usuario
  const emailStr = user.email || user.displayName || 'usuario';
  const roleLabel = isAdmin() ? 'ADMIN' : 'GENERAL';
  const initials = (emailStr.slice(0, 2) || 'US').toUpperCase();

  const elAvatar = document.getElementById('topUserAvatar');
  const elName = document.getElementById('topUserName');
  const elBadge = document.getElementById('topUserBadge');
  if (elAvatar) elAvatar.textContent = initials;
  if (elName) elName.textContent = emailStr;
  if (elBadge) elBadge.textContent = roleLabel;

  // 2. Actualizar banner de bienvenida institucional
  const bannerInfo = document.getElementById('bannerUserInfo');
  if (bannerInfo) {
    bannerInfo.innerHTML =
      'Conectado como: <strong>' + esc(emailStr) + '</strong>' +
      ' · <span class="badge ' + (isAdmin() ? 'st-logrado' : 'st-none') + '">' + (isAdmin() ? 'Administrador' : 'Especialista General') + '</span>' +
      ' · Todos los especialistas con acceso ven la misma información consolidada.';
  }

  // 3. Listener del botón Cerrar Sesión en la barra superior
  const logoutBtn = document.getElementById('topLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => signOut(auth);
  }

  startListeners();
}

function onLogout() {
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  setConnectionState('offline');

  currentUser = null;
  currentRole = null;
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

/* ============================= INICIALIZACIÓN ============================= */
async function initApp() {
  setConnectionState('connecting');

  // Si tras 8.5s no se ha conectado, alertar y dar opción de reintentar
  connectionTimer = setTimeout(() => {
    if (!currentUser) {
      setConnectionState('slow');
    }
  }, 8500);

  const retryBtn = document.getElementById('retryConnectionBtn');
  if (retryBtn) {
    retryBtn.onclick = () => {
      retryBtn.textContent = 'Reconectando...';
      location.reload();
    };
  }

  window.addEventListener('online', () => {
    if (currentUser) setConnectionState('online');
    else setConnectionState('connecting');
  });

  window.addEventListener('offline', () => {
    setConnectionState('offline');
  });

  try {
    firebaseApp = initializeApp(FIREBASE_CONFIG);
    firestoreDb  = getFirestore(firebaseApp);
    dbNs         = makeDbAdapter(firestoreDb);
    auth         = getAuth(firebaseApp);
  } catch (e) {
    console.error('No se pudo inicializar Firebase. Revisa FIREBASE_CONFIG.', e);
    setConnectionState('offline');
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
