/* =========================================================================
   app.js — Archivo principal que importa los demás módulos e inicializa
   el flujo completo de la aplicación.
   ========================================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { FIREBASE_CONFIG } from './firebase-config.js?v=20261118_v6';
import { getFirestore, initFirestore, makeDbAdapter } from './firestore.js?v=20261123_v10';
import { getAuth, signOut, setupAuthListeners } from './auth.js?v=20261120_v2';
import {
  esc,
  showToast,
  setupNavigation,
  viewDashboard,
  renderRegistrarTab,
  setRegistrarSubTab,
  renderConsolidadoTab,
  renderColegiosTab,
  renderTiposTab,
  renderUsuariosTab,
  renderResponsablesTab,
  renderConcursosTab,
  renderForbidden,
  setEditMode, clearEditMode, setRegBuiltFor,
  computeStats,
  forceResetBodyScroll,
  setAppState,
  openLogoutConfirmModal,
  getConcursoSubTab,
  setConcursoSubTab,
  getDeletedFichaTypeIds,
  SEED_CONCURSOS_DEFAULTS,
} from './ui.js?v=20261120_v1';

import { renderPortalView } from './portal.js?v=20261123_v10';
import { renderDirectorioTab } from './directorio.js?v=20261123_v10';
import { openUserProfileModal, openChangePasswordModal } from './ui/perfil-modal.js?v=20261123_v10';
import { renderAlertasTab, getAlertCount } from './alertas.js?v=20261023_v3';
import { ESPECIALISTA_JEC_OFICIAL } from './calcEngine.js?v=20261123_v10';
import { safeSessionGet, safeSessionSet, safeSessionRemove } from './core/utils/storage.js?v=20261123_v10';
import { PLANTILLAS_BASE_OFICIALES, ALIAS_A_PLANTILLA_BASE } from './catalogo-plantillas-base.js?v=20261016_v4';
import { isFichaEbrGestionEscolar, isFichaCoordTutoriaJec } from './calc/detectors.js?v=20261103_v8';
import { cleanForFirestore } from './ui/core-utils.js?v=20261103_v8';

/* ============================= MANEJADORES GLOBALES DE ERROR ============================= */
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const errText = String(event.error?.message || event.message || '');
    if (errText.includes('INTERNAL ASSERTION FAILED') || errText.includes('Unexpected state') || errText.includes('heartbeats') || errText.includes('Quota exceeded') || errText.includes('resource-exhausted') || errText.includes('Tracking Prevention')) {
      return;
    }
    console.error('Error no controlado en la aplicación:', event.error || event.message);
    showToast('Aviso del sistema: ' + (event.message || 'Ocurrió un error inesperado en la interfaz.'));
  });

  window.addEventListener('unhandledrejection', (event) => {
    const msg = event.reason ? (event.reason.message || String(event.reason)) : 'Operación asíncrona interrumpida';
    if (msg.includes('INTERNAL ASSERTION FAILED') || msg.includes('Unexpected state') || msg.includes('heartbeats') || msg.includes('Quota exceeded') || msg.includes('resource-exhausted') || msg.includes('Tracking Prevention')) {
      return;
    }
    console.error('Promesa rechazada no controlada:', event.reason);
    showToast('Aviso del sistema: ' + msg);
  });
}

/* ============================= ESTADO GLOBAL ============================= */
let firebaseApp = null;
let firestoreDb = null;
let auth = null;
let dbNs = null;

let currentUser = null;
let currentRole = null; // 'admin' | 'general'
let connectionTimer = null;

// Carga instantánea de catálogo base oficial y plantillas locales (0ms de latencia)
function getInitialFichaTypes() {
  const initial = [];
  try {
    const deletedIds = typeof getDeletedFichaTypeIds === 'function' ? getDeletedFichaTypeIds() : new Set();
    const localCustoms = JSON.parse(localStorage.getItem('agebre_local_custom_ficha_types') || '[]');
    if (Array.isArray(localCustoms)) {
      localCustoms.forEach(lc => {
        if (lc && lc.id && !deletedIds.has(lc.id)) initial.push(lc);
      });
    }
    if (typeof PLANTILLAS_BASE_OFICIALES === 'object' && PLANTILLAS_BASE_OFICIALES) {
      Object.entries(PLANTILLAS_BASE_OFICIALES).forEach(([id, baseFt]) => {
        if (!deletedIds.has(id) && (!ALIAS_A_PLANTILLA_BASE || !ALIAS_A_PLANTILLA_BASE[id])) {
          if (!initial.some(x => x.id === id)) {
            initial.push({ id, ...baseFt });
          }
        }
      });
    }
    initial.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  } catch (_) {}
  return initial;
}

// Carga segura desde caché local de sesión para evitar pantallas en blanco
function getCachedArray(key) {
  try {
    const raw = sessionStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [];
}

const state = {
  modulo: sessionStorage.getItem('agebre_active_modulo') || 'portal', // 'portal' | 'monitoreo' | 'concursos'
  currentUserRoleDoc: null,
  activeTab: 'dashboard',
  fichaTypes: getInitialFichaTypes(),  // Pre-poblado de inmediato (14 plantillas oficiales listas al instante)
  submissions: getCachedArray('agebre_cache_submissions'),
  roles: getCachedArray('agebre_cache_roles'),  // {id(=uid), email, role, createdAt}  — con respaldo en caché
  colegios: getCachedArray('agebre_cache_colegios'),
  directivos: getCachedArray('agebre_cache_directivos'),
  responsables: getCachedArray('agebre_cache_responsables'),
  tiposConcurso: (typeof SEED_CONCURSOS_DEFAULTS !== 'undefined' && Array.isArray(SEED_CONCURSOS_DEFAULTS)) ? JSON.parse(JSON.stringify(SEED_CONCURSOS_DEFAULTS)) : [],
  concursoRegistros: [],
  concursoCuerpoTecnico: [],
  compromisos: [],
  areasFirma: [],
  plantillasFirmantes: [],
  preferenciasDescarga: [],
};

// Exponer state globalmente para depuración y resiliencia de módulos
if (typeof window !== 'undefined') {
  window.state = state;
}

function isAdmin() {
  let uDoc = state?.currentUserRoleDoc ||
    (typeof window !== 'undefined' && window.state?.currentUserRoleDoc);
  if (!uDoc) {
    try {
      const uid = currentUser?.uid;
      if (uid) {
        const raw = sessionStorage.getItem('agebre_user_doc_' + uid);
        if (raw) uDoc = JSON.parse(raw);
      }
      if (!uDoc) {
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (k && k.startsWith('agebre_user_doc_')) {
            const raw = sessionStorage.getItem(k);
            if (raw) {
              uDoc = JSON.parse(raw);
              break;
            }
          }
        }
      }
    } catch (_) {}
  }

  const email = (currentUser?.email || uDoc?.email || '').toLowerCase();
  return currentRole === 'admin' ||
    currentRole === 'coordinador' ||
    uDoc?.role === 'admin' ||
    uDoc?.role === 'coordinador' ||
    uDoc?.userType === 'coordinador' ||
    uDoc?.userType === 'admin' ||
    email === 'agebre@ugel03.gob.pe' ||
    email === 'paulmontalvo54@gmail.com';
}

function updateAdminNavVisibility() {
  const admin = isAdmin();
  document.querySelectorAll('.navbtn[data-admin-only]').forEach(b => {
    b.style.display = admin ? '' : 'none';
  });
}

if (typeof window !== 'undefined') {
  window.isAdmin = isAdmin;
}

function canAccessConcursos() {
  if (isAdmin()) return true;
  if (state.currentUserRoleDoc?.userType === 'coordinador') return true;
  return Boolean(state.currentUserRoleDoc?.accesoConcursos);
}

function getFichaType(id) {
  if (!id) return null;
  const canonicalId = (ALIAS_A_PLANTILLA_BASE && ALIAS_A_PLANTILLA_BASE[id]) || (isFichaEbrGestionEscolar(id) ? 'ft_gestion_ugel03_ebr' : id);
  let found = (state.fichaTypes || []).find(f => f.id === canonicalId || f.id === id);
  if (!found) {
    if (isFichaEbrGestionEscolar(id)) {
      found = (state.fichaTypes || []).find(f => isFichaEbrGestionEscolar(f)) || PLANTILLAS_BASE_OFICIALES.ft_gestion_ugel03_ebr;
    } else if (id === 'ft_jec' || id === 'ft_msejec_2do' || id === 'ft_msejec_1er' || id === 'ft_msejec_3er') {
      found = (state.fichaTypes || []).find(f => f.id === 'ft_msejec_2do' || f.id === 'ft_jec');
    }
  }
  return found || PLANTILLAS_BASE_OFICIALES[canonicalId] || PLANTILLAS_BASE_OFICIALES[id] || null;
}

/* ============================= SELECCIÓN DE MÓDULOS ============================= */
function seleccionarModulo(mod) {
  if ((mod === 'concursos' || mod === 'portal') && !canAccessConcursos()) {
    if (mod === 'concursos') {
      showToast('🔒 Acceso restringido: El Administrador debe habilitar tu acceso al Módulo de Concursos.');
    }
    state.modulo = 'monitoreo';
    safeSessionSet('agebre_active_modulo', 'monitoreo');
    render();
    return;
  }

  state.modulo = mod;
  const welcomeBanner = document.getElementById('welcomeBanner');
  if (mod === 'portal') {
    safeSessionRemove('agebre_active_modulo');
    state.activeTab = 'portal';
    if (welcomeBanner) welcomeBanner.classList.remove('welcomeBanner--concursos');
  } else if (mod === 'monitoreo') {
    safeSessionSet('agebre_active_modulo', 'monitoreo');
    if (state.activeTab === 'portal' || state.activeTab === 'concursos') {
      state.activeTab = 'dashboard';
    }
    if (welcomeBanner) welcomeBanner.classList.remove('welcomeBanner--concursos');
  } else if (mod === 'concursos') {
    ensureConcursoListeners();
      safeSessionSet('agebre_active_modulo', 'concursos');
    state.activeTab = 'concursos';
    if (welcomeBanner) welcomeBanner.classList.add('welcomeBanner--concursos');
  }
  forceResetBodyScroll();
  window.scrollTo({ top: 0, behavior: 'instant' });
  render();
}

/* ============================= RENDER SUBNAVBAR ============================= */
function renderSubNavBar() {
  const subNav = document.getElementById('subNavBar');
  const welcomeBanner = document.getElementById('welcomeBanner');
  const topModBtn = document.getElementById('topModulosBtn');
  if (!subNav) return;

  if (topModBtn) {
    if (!canAccessConcursos()) {
      topModBtn.style.display = 'none';
    } else {
      topModBtn.style.display = '';
      if (state.modulo === 'portal') {
        topModBtn.classList.add('active');
      } else {
        topModBtn.classList.remove('active');
      }
    }
  }

  if (state.modulo === 'portal') {
    subNav.style.display = 'none';
    if (welcomeBanner) {
      welcomeBanner.style.display = 'none';
      welcomeBanner.classList.remove('welcomeBanner--concursos');
    }
    return;
  }

  subNav.style.display = 'flex';
  if (welcomeBanner) welcomeBanner.style.display = 'flex';

  const currentMod = state.modulo;
  const currentAdmin = String(Boolean(isAdmin()));
  if (subNav.dataset.currentModulo === currentMod && subNav.dataset.currentAdmin === currentAdmin && subNav.querySelector('.navbtn')) {
    if (currentMod === 'monitoreo') {
      subNav.querySelectorAll('.navbtn[data-tab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
      });
    } else if (currentMod === 'concursos') {
      const currentSub = typeof getConcursoSubTab === 'function' ? getConcursoSubTab() : 'consolidado';
      subNav.querySelectorAll('.navbtn[data-csubtab]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.csubtab === currentSub);
      });
    }
    updateAdminNavVisibility();
    return;
  }
  subNav.dataset.currentModulo = currentMod;
  subNav.dataset.currentAdmin = currentAdmin;

  if (state.modulo === 'monitoreo') {
    welcomeBanner?.classList.remove('welcomeBanner--concursos');
    const titleEl = welcomeBanner?.querySelector('.welcomeTitle');
    const subEl = welcomeBanner?.querySelector('.welcomeSub');
    if (titleEl) titleEl.textContent = 'Panel de Monitoreo y Acompañamiento 2026';
    if (subEl) subEl.innerHTML = 'UGEL 03 · DRE Lima Metropolitana · <em>"Sistematización y reportes de avance"</em>';

    subNav.innerHTML = `
      <button type="button" class="navbtn ${state.activeTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
        <span class="ic">📊</span> Resumen
      </button>
      <button type="button" class="navbtn ${state.activeTab === 'registrar' ? 'active' : ''}" data-tab="registrar">
        <span class="ic">＋</span> Registrar ficha
      </button>
      <button type="button" class="navbtn ${state.activeTab === 'consolidado' ? 'active' : ''}" data-tab="consolidado">
        <span class="ic">▤</span> Reportes
      </button>
      <button type="button" class="navbtn ${state.activeTab === 'colegios' ? 'active' : ''}" data-tab="colegios">
        <span class="ic">🏫</span> Colegios
      </button>
      <button type="button" class="navbtn ${state.activeTab === 'directorio' ? 'active' : ''}" data-tab="directorio">
        <span class="ic">📋</span> Directorio
      </button>
      <button type="button" class="navbtn ${state.activeTab === 'responsables' ? 'active' : ''}" data-tab="responsables">
        <span class="ic">👥</span> Responsables
      </button>
      <button type="button" class="navbtn ${state.activeTab === 'usuarios' ? 'active' : ''}" data-tab="usuarios" data-admin-only="1" style="${isAdmin() ? '' : 'display:none;'}">
        <span class="ic">◈</span> Usuarios
      </button>
    `;

    subNav.querySelectorAll('.navbtn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.tab === 'registrar') {
          clearEditMode();
          setRegBuiltFor(null);
          setRegistrarSubTab('registrar');
        }
        navigate(btn.dataset.tab);
      });
    });

  } else if (state.modulo === 'concursos') {
    welcomeBanner?.classList.add('welcomeBanner--concursos');
    const titleEl = welcomeBanner?.querySelector('.welcomeTitle');
    const subEl = welcomeBanner?.querySelector('.welcomeSub');
    if (titleEl) titleEl.textContent = 'Gestión Integral de Concursos Escolares 2026';
    if (subEl) subEl.innerHTML = 'UGEL 03 · AGEBRE · <em>"JMA, ONEM, Eureka, JFEN, JEDPA y Juegos Florales"</em>';

    const currentSub = typeof getConcursoSubTab === 'function' ? getConcursoSubTab() : 'consolidado';

    subNav.innerHTML = `
      <button type="button" class="navbtn ${currentSub === 'consolidado' ? 'active' : ''}" data-csubtab="consolidado">
        <span class="ic">📊</span> Ver consolidado
      </button>
      <button type="button" class="navbtn ${currentSub === 'registrar' ? 'active' : ''}" data-csubtab="registrar">
        <span class="ic">➕</span> Registrar participante
      </button>
      <button type="button" class="navbtn ${currentSub === 'asignar_podios' ? 'active' : ''}" data-csubtab="asignar_podios">
        <span class="ic">🏆</span> Asignar puestos
      </button>
      <button type="button" class="navbtn ${currentSub === 'asistente' ? 'active' : ''}" data-csubtab="asistente">
        <span class="ic">🔤</span> Revisar nombres
      </button>
      <button type="button" class="navbtn ${currentSub === 'tipos' ? 'active' : ''}" data-csubtab="tipos" data-admin-only="1" style="${isAdmin() ? '' : 'display:none;'}">
        <span class="ic">⚙</span> Tipos de concurso
      </button>
    `;

    subNav.querySelectorAll('.navbtn[data-csubtab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cTab = btn.dataset.csubtab;
        if (typeof setConcursoSubTab === 'function') {
          setConcursoSubTab(cTab);
        }
        state.activeTab = 'concursos';
        forceResetBodyScroll();
        window.scrollTo({ top: 0, behavior: 'instant' });
        subNav.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        render();
      });
    });
  }
}

/* ============================= NAVIGATE HELPER ============================= */
/** Cambia de pestaña programáticamente (usado desde botones "Editar" en Consolidado) */
function navigate(tab) {
  if (tab === 'portal') {
    seleccionarModulo('portal');
    return;
  }
  if (tab === 'alertas') {
    tab = 'dashboard';
  }
  if (tab === 'tipos') {
    tab = 'registrar';
    if (isAdmin()) setRegistrarSubTab('plantillas');
  }
  if (tab === 'concursos') {
    state.modulo = 'concursos';
    ensureConcursoListeners();
      safeSessionSet('agebre_active_modulo', 'concursos');
  } else {
    state.modulo = 'monitoreo';
    safeSessionSet('agebre_active_modulo', 'monitoreo');
  }
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
let _renderTimer = null;
function renderDebounced(delay = 50) {
  if (_renderTimer) clearTimeout(_renderTimer);
  _renderTimer = setTimeout(() => {
    _renderTimer = null;
    render();
  }, delay);
}

function render() {
  if (_renderTimer) {
    clearTimeout(_renderTimer);
    _renderTimer = null;
  }
  setAppState(state);
  const c = document.getElementById('tabContent');

  // Actualizar la barra de subnavegación según el módulo actual
  renderSubNavBar();

  // Si estamos en la pantalla de bienvenida/portal de aplicaciones
  if (state.modulo === 'portal') {
    renderPortalView(c, {
      onSelectModule: (selectedMod) => {
        seleccionarModulo(selectedMod);
      },
      canAccessConcursos: canAccessConcursos(),
      onShowToast: (msg) => showToast(msg)
    });
    return;
  }

  // Actualizar contador de alertas en la campana
  const bellBadge = document.getElementById('topBellBadge');
  if (bellBadge && state.submissions) {
    const alertCount = getAlertCount(state, getFichaType);
    if (alertCount > 0) {
      bellBadge.textContent = alertCount > 99 ? '99+' : alertCount;
      bellBadge.style.display = 'inline-block';
    } else {
      bellBadge.style.display = 'none';
    }
  }

  try {
    switch (state.activeTab) {
    case 'dashboard':
      if (!state.fichaTypes || state.fichaTypes.length === 0) {
        state.fichaTypes = getInitialFichaTypes();
      }
      c.innerHTML = viewDashboard(state, getFichaType, render);
      break;
    case 'registrar':
      renderRegistrarTab(c, state, getFichaType, dbNs, currentUser, navigate, isAdmin());
      break;
    case 'consolidado':
      renderConsolidadoTab(c, state, getFichaType, dbNs, isAdmin(), navigate, currentUser);
      break;
    case 'concursos':
      ensureConcursoListeners();
      renderConcursosTab(c, state, dbNs, isAdmin(), currentUser, navigate);
      break;
    case 'colegios':
      ensureDirectivosListener();
      renderColegiosTab(c, state, getFichaType, dbNs, isAdmin(), currentUser);
      break;
    case 'directorio':
      ensureDirectivosListener();
      renderDirectorioTab(c, state, dbNs, isAdmin(), currentUser, navigate);
      break;
    case 'alertas':
      state.activeTab = 'dashboard';
      if (!state.fichaTypes || state.fichaTypes.length === 0) state.fichaTypes = getInitialFichaTypes();
      c.innerHTML = viewDashboard(state, getFichaType, render);
      break;
    case 'tipos':
      ensureFirmasListeners();
      state.activeTab = 'registrar';
      if (isAdmin()) setRegistrarSubTab('plantillas');
      renderRegistrarTab(c, state, getFichaType, dbNs, currentUser, navigate, isAdmin());
      break;
    case 'usuarios':
      ensureAdminRoleListeners();
      isAdmin() ? renderUsuariosTab(c, state, dbNs, currentUser) : renderForbidden(c);
      break;
    case 'responsables':
      renderResponsablesTab(c, state, dbNs, isAdmin(), currentUser);
      break;
    }
  } catch (renderErr) {
    console.error('Error al renderizar pestaña ' + state.activeTab + ':', renderErr);
    c.innerHTML = '<div style="margin:24px;padding:24px;background:#FFF1F2;border:1px solid #FDA4AF;border-radius:10px;color:#9F1239;">' +
      '<h3 style="margin-top:0">⚠️ Aviso de carga de sección</h3>' +
      '<p>No se pudo completar la visualización de la sección actual (' + esc(state.activeTab) + '): <strong>' + esc(renderErr.message || String(renderErr)) + '</strong></p>' +
      '<button class="btn" type="button" onclick="location.reload()">Recargar vista</button>' +
      '</div>';
  }
}

/* ============================= FIRESTORE LISTENERS ============================= */
let activeUnsubscribers = [];
let concursoListenersStarted = false;

let directivosListenerStarted = false;
let rolesListenerStarted = false;
let firmasListenersStarted = false;

function stopListeners() {
  if (Array.isArray(activeUnsubscribers)) {
    activeUnsubscribers.forEach(unsub => {
      try {
        if (typeof unsub === 'function') unsub();
      } catch (_) { }
    });
  }
  activeUnsubscribers = [];
  startListeners._started = false;
  concursoListenersStarted = false;
  directivosListenerStarted = false;
  rolesListenerStarted = false;
  firmasListenersStarted = false;
}

function healCoordTutoriaSubmissions(subs, dbNs) {
  if (!Array.isArray(subs)) return subs;

  subs.forEach(s => {
    const isCoordTut = s.fichaTypeId === 'ft_coord_tutoria_jec' || 
                       s.fichaTypeId === 'ft_coord_tutoria' || 
                       (s.fichaTypeNombre || '').toLowerCase().includes('coordinador(a) de tutoría') ||
                       (s.fichaTypeNombre || '').toLowerCase().includes('coordinador de tutoria');
    if (!isCoordTut) return;

    s.fichaTypeId = 'ft_coord_tutoria_jec';

    // Normalizar respuestas sólo si falta la propiedad de sección
    if (Array.isArray(s.respuestas)) {
      s.respuestas.forEach(r => {
        if (!r.seccion) {
          const num = Number(r.num || (r.id ? String(r.id).replace(/\D+/g, '') : 0));
          if (num >= 9 && num <= 11) {
            r.seccion = 'Reuniones colegiadas';
          } else if (num >= 4 && num <= 8) {
            r.seccion = 'Visita al aula';
          } else if (num >= 1 && num <= 3) {
            r.seccion = 'Planificación de la tutoría grupal';
          } else if (num >= 12 && num <= 15) {
            r.seccion = 'Tutoría individual y trabajo con las familias';
          } else if (num >= 16 && num <= 18) {
            r.seccion = 'Participación estudiantil y orientación educativa permanente';
          } else if (num >= 19 && num <= 21) {
            r.seccion = 'Reuniones de trabajo con el equipo directivo de la institución educativa';
          }
        }
      });
    }
  });

  return subs;
}


function startListeners() {
  if (startListeners._started) return;
  startListeners._started = true;
  stopListeners(); // Limpieza defensiva

  const handleSnapErr = (colName, err, showUserToast = false) => {
    // Si la sesión se cerró o se está cerrando, los listeners devuelven permission-denied de forma natural
    if (!currentUser || err?.code === 'permission-denied') {
      return;
    }
    console.error(`${colName} snapshot error`, err);
    if (showUserToast) {
      showToast('Error leyendo ' + colName + ': [' + (err.code || 'error') + '] ' + err.message);
    }
  };

  activeUnsubscribers.push(
    dbNs.collection('fichaTypes').onSnapshot(snap => {
      const rawLoaded = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      rawLoaded.forEach(doc => {
        if (!doc.id || doc.id.trim() === '') doc.id = doc.fichaTypeId || doc._docId || '';
      });
      const deletedIds = getDeletedFichaTypeIds();

      // 1. Filtrar cualquier documento que el usuario haya eliminado explícitamente
      const activeRaw = rawLoaded.filter(x => !deletedIds.has(x.id));
      const loadedIds = new Set(activeRaw.map(x => x.id));

      // 1b. Inyectar plantillas personalizadas guardadas localmente (por ejemplo, si falló Firestore por cuota)
      try {
        const localCustoms = JSON.parse(localStorage.getItem('agebre_local_custom_ficha_types') || '[]');
        if (Array.isArray(localCustoms)) {
          localCustoms.forEach(lc => {
            if (lc && lc.id && !deletedIds.has(lc.id)) {
              const existingIdx = activeRaw.findIndex(x => x.id === lc.id);
              if (existingIdx !== -1) {
                if ((Number(lc.updatedAt) || 0) >= (Number(activeRaw[existingIdx].updatedAt) || 0)) {
                  activeRaw[existingIdx] = { ...activeRaw[existingIdx], ...lc };
                }
              } else {
                activeRaw.push(lc);
                loadedIds.add(lc.id);
              }
            }
          });
        }
      } catch (e) {
        console.warn('Error leyendo plantillas locales:', e);
      }

      // 2. Inyectar plantillas oficiales base si no existen en Firestore y no fueron eliminadas ni son alias
      Object.entries(PLANTILLAS_BASE_OFICIALES).forEach(([id, baseFt]) => {
        if (!loadedIds.has(id) && !deletedIds.has(id) && (!ALIAS_A_PLANTILLA_BASE || !ALIAS_A_PLANTILLA_BASE[id])) {
          activeRaw.push({ id, ...baseFt });
        }
      });

      // 3. Unificar Gestión Escolar EBR (1 sola ficha con sus 3 visitas, preservando modificaciones del usuario)
      const officialEbr = PLANTILLAS_BASE_OFICIALES.ft_gestion_ugel03_ebr;
      let ebrDoc = activeRaw.find(x => x.id === 'ft_gestion_ugel03_ebr' || isFichaEbrGestionEscolar(x));
      if (!ebrDoc) {
        ebrDoc = { id: 'ft_gestion_ugel03_ebr', ...officialEbr };
      } else {
        ebrDoc.id = 'ft_gestion_ugel03_ebr';
        ebrDoc.nombre = ebrDoc.nombre || officialEbr.nombre;
        ebrDoc.nombreCorto = ebrDoc.nombreCorto || officialEbr.nombreCorto;
        ebrDoc.descripcion = ebrDoc.descripcion || officialEbr.descripcion;
        ebrDoc.icono = ebrDoc.icono || officialEbr.icono || '🏛️';
        ebrDoc.color = ebrDoc.color || officialEbr.color || '#1E40AF';
        ebrDoc.modalidad = ebrDoc.modalidad || officialEbr.modalidad || 'EBR Primaria';
        ebrDoc.grupo = ebrDoc.grupo || 'EBR';
        ebrDoc.orden = typeof ebrDoc.orden === 'number' ? ebrDoc.orden : 20;
        ebrDoc.tieneVisitas = true;
        ebrDoc.tipoVisitas = 'items_por_visita';
        ebrDoc.visitas = Array.isArray(ebrDoc.visitas) && ebrDoc.visitas.length > 0 ? ebrDoc.visitas : officialEbr.visitas;
        ebrDoc.seccionesPorVisita = ebrDoc.seccionesPorVisita || officialEbr.seccionesPorVisita;
        ebrDoc.secciones = Array.isArray(ebrDoc.secciones) && ebrDoc.secciones.length > 0 ? ebrDoc.secciones : officialEbr.secciones;
      }

      // 4. Unificar Modelo JEC (1 sola ficha canónica ft_msejec_2do con sus 3 momentos/visitas, preservando ediciones)
      const officialJec = PLANTILLAS_BASE_OFICIALES.ft_msejec_2do;
      const isJecImplementation = (item) => {
        if (!item) return false;
        const id = item.id || '';
        if (id === 'ft_msejec_2do' || id === 'ft_jec' || id === 'ft_msejec_1er' || id === 'ft_msejec_3er') return true;
        if (ALIAS_A_PLANTILLA_BASE && ALIAS_A_PLANTILLA_BASE[id] === 'ft_msejec_2do') return true;
        const n = (item.nombre || '').toLowerCase();
        if (n.includes('implementación del modelo jec') || n.includes('implementacion del modelo jec') || n.includes('modelo jec')) {
          if (!n.includes('tutoría') && !n.includes('tutoria')) return true;
        }
        return false;
      };

      let jecDoc = activeRaw.find(x => x.id === 'ft_msejec_2do') || activeRaw.find(isJecImplementation);
      if (!jecDoc) {
        jecDoc = { id: 'ft_msejec_2do', ...officialJec };
      } else {
        jecDoc.id = 'ft_msejec_2do';
        jecDoc.nombre = jecDoc.nombre || officialJec.nombre;
        jecDoc.nombreCorto = jecDoc.nombreCorto || officialJec.nombreCorto;
        jecDoc.descripcion = jecDoc.descripcion || officialJec.descripcion;
        jecDoc.icono = jecDoc.icono || officialJec.icono || '🏫';
        jecDoc.color = jecDoc.color || officialJec.color || '#059669';
        jecDoc.modalidad = jecDoc.modalidad || 'JEC';
        jecDoc.grupo = jecDoc.grupo || 'Modelo JEC';
        jecDoc.orden = typeof jecDoc.orden === 'number' ? jecDoc.orden : 10;
        jecDoc.tieneVisitas = true;
        jecDoc.tipoVisitas = 'items_por_visita';
        jecDoc.visitas = Array.isArray(jecDoc.visitas) && jecDoc.visitas.length > 0 ? jecDoc.visitas : officialJec.visitas;
        
        // Preservar fielmente las secciones por visita editadas desde el sistema (Módulos -> Plantillas)
        const mergedSecs = {
          ...(officialJec.seccionesPorVisita || {}),
          ...(jecDoc.seccionesPorVisita || {})
        };
        const countSecItems = (secs) => Array.isArray(secs) ? secs.reduce((acc, s) => acc + (s.items?.length || 0), 0) : 0;
        if (!mergedSecs[1] || mergedSecs[1].length === 0) mergedSecs[1] = officialJec.seccionesPorVisita[1];
        if (!mergedSecs[2] || mergedSecs[2].length === 0 || countSecItems(mergedSecs[2]) === 31) {
          mergedSecs[2] = officialJec.seccionesPorVisita[2];
        }
        if (!mergedSecs[0] || mergedSecs[0].length === 0) mergedSecs[0] = officialJec.seccionesPorVisita[0];

        // Normalización canónica de numeración e IDs en 1er Momento JEC (Visita 1):
        // Bloque Sí/No (Condiciones): 01 al 07
        // Bloque Rúbricas numéricas (Aspectos 2 al 5): 01 al 37 correlativos continuos
        if (Array.isArray(mergedSecs[0]) && mergedSecs[0].length > 0) {
          const condSec = mergedSecs[0].find(s => s.id?.includes('cond') || /condici[oó]n/i.test(s.nombre || '')) || mergedSecs[0][0];
          const rubricSecs = mergedSecs[0].filter(s => s !== condSec);

          if (condSec) {
            condSec.id = condSec.id || 'sec_condiciones';
            condSec.tipo = 'si_no';
            condSec.tipoRespuesta = 'si_no';
            condSec.escala = 'SI_NO_NA';
            (condSec.items || []).forEach((it, idx) => {
              it.num = idx + 1;
              if (!it.id || /^\d+$/.test(it.id)) it.id = `c${idx + 1}`;
            });
          }

          let rubricCounter = 0;
          rubricSecs.forEach((sec, sIdx) => {
            sec.id = sec.id || `sec_aspecto_0${sIdx + 2}`;
            sec.tipo = 'escala1_3';
            sec.tipoRespuesta = 'escala1_3';
            sec.escala = 'ESCALA_1_3';
            (sec.items || []).forEach((it) => {
              rubricCounter++;
              it.num = rubricCounter; // 01 al 37 correlativos
              if (!it.id || /^\d+$/.test(it.id)) it.id = `it_${String(rubricCounter).padStart(2, '0')}`;
            });
          });
        }

        jecDoc.seccionesPorVisita = mergedSecs;

        // Para jecDoc.secciones: garantizar que contenga la estructura estándar de 2do Momento (31 ítems o editada)
        // y nunca sea reemplazada por las rúbricas del 1er Momento
        const has1erItems = Array.isArray(jecDoc.secciones) && jecDoc.secciones.some(s => (s.items || []).some(i => i.id?.startsWith('jec1_') || i.id?.startsWith('cond_')));
        if (!jecDoc.secciones || jecDoc.secciones.length === 0 || has1erItems) {
          jecDoc.secciones = mergedSecs[1] || officialJec.secciones;
        }
      }

      // 5. Unificar Ficha de Directivo (1 sola ficha, deduplicando copias sin registros)
      const isDirectivoDoc = (item) => {
        if (!item) return false;
        if (item.id === 'ft_directivo') return true;
        const n = (item.nombre || '').trim().toLowerCase();
        return n === 'ficha de monitoreo al directivo de ie';
      };

      const directivoCandidates = activeRaw.filter(isDirectivoDoc);
      let directivoDoc = null;
      if (directivoCandidates.length > 0) {
        const currentSubs = state.submissions || [];
        directivoDoc = directivoCandidates.find(c => currentSubs.some(s => s.fichaTypeId === c.id)) || directivoCandidates[0];
        if ((!directivoDoc.secciones || directivoDoc.secciones.length === 0) && PLANTILLAS_BASE_OFICIALES.ft_directivo) {
          directivoDoc.secciones = PLANTILLAS_BASE_OFICIALES.ft_directivo.secciones;
        }
      }

      // 6. Sanitizar PRITE y CEBE (fallback inicial si estuvieran vacíos, sin sobreescribir ediciones del usuario)
      const priteDoc = activeRaw.find(x => x.id === 'ft_prite_gestion');
      if (priteDoc && (!Array.isArray(priteDoc.secciones) || priteDoc.secciones.length === 0)) {
        Object.assign(priteDoc, PLANTILLAS_BASE_OFICIALES.ft_prite_gestion);
      }

      const cebeDoc = activeRaw.find(x => x.id === 'ft_gestion_cebe');
      if (cebeDoc && (!Array.isArray(cebeDoc.secciones) || cebeDoc.secciones.length === 0)) {
        Object.assign(cebeDoc, PLANTILLAS_BASE_OFICIALES.ft_gestion_cebe);
      }

      // Sanitizar Materiales Educativos (CEBE/PRITE) si arrastraba tablas institucionales de Gestión Escolar y sincronizar cabecera oficial
      const matCebeDoc = activeRaw.find(x => x.id === 'ft_materiales_cebe');
      if (matCebeDoc) {
        if (Array.isArray(matCebeDoc.tablas)) {
          matCebeDoc.tablas = matCebeDoc.tablas.filter(t => t.id !== 'tbl_personal_cebe' && t.id !== 'tbl_saanee_cebe' && t.id !== 'tbl_personal_prite' && t.id !== 'tbl_estudiantes_prite');
        }
        if (!matCebeDoc.extras || matCebeDoc.extras.length <= 1) {
          matCebeDoc.extras = PLANTILLAS_BASE_OFICIALES.ft_materiales_cebe.extras;
        }
        matCebeDoc.nombre = PLANTILLAS_BASE_OFICIALES.ft_materiales_cebe.nombre;
        matCebeDoc.modalidad = 'CEBE / PRITE';
        matCebeDoc.grupo = 'CEBE / PRITE';
        matCebeDoc.tipoRespuesta = 'si_no';
        matCebeDoc.escala = 'SI_NO_NA';
        matCebeDoc.regla_nivel = PLANTILLAS_BASE_OFICIALES.ft_materiales_cebe.regla_nivel;

        const needsCebeMatRepair = !Array.isArray(matCebeDoc.secciones) ||
          matCebeDoc.secciones.length < 5 ||
          matCebeDoc.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) < 14;
        if (needsCebeMatRepair) {
          matCebeDoc.secciones = JSON.parse(JSON.stringify(PLANTILLAS_BASE_OFICIALES.ft_materiales_cebe.secciones));
        } else {
          // Asegurar que las secciones existentes tengan números correlativos y textos limpios sin Mojibake
          const canonSecs = PLANTILLAS_BASE_OFICIALES.ft_materiales_cebe.secciones;
          matCebeDoc.secciones.forEach((sec, sIdx) => {
            const cSec = canonSecs[sIdx];
            if (cSec && (!sec.nombre || sec.nombre.includes('Ã') || sec.nombre.includes('ǟ') || sec.nombre.includes(''))) {
              sec.nombre = cSec.nombre;
            }
            (sec.items || []).forEach((it, iIdx) => {
              const cIt = cSec && cSec.items ? cSec.items[iIdx] : null;
              if (cIt) {
                if (!it.num) it.num = cIt.num;
                if (!it.id) it.id = cIt.id;
                if (!it.texto || it.texto.includes('Ã') || it.texto.includes('ǟ') || it.texto.includes('')) it.texto = cIt.texto;
              }
            });
          });
        }
      }

      // Sanitizar Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC) (6 aspectos oficiales)
      const coordTutDoc = activeRaw.find(x => x.id === 'ft_coord_tutoria_jec' || x.id === 'ft_coord_tutoria');
      if (coordTutDoc && PLANTILLAS_BASE_OFICIALES.ft_coord_tutoria_jec) {
        const needsRepair = !Array.isArray(coordTutDoc.secciones) || 
                            coordTutDoc.secciones.length < 6 || 
                            coordTutDoc.secciones.some(s => s.nombre?.toLowerCase().includes('visita al aula') && s.items?.length > 5);
        if (needsRepair) {
          coordTutDoc.secciones = JSON.parse(JSON.stringify(PLANTILLAS_BASE_OFICIALES.ft_coord_tutoria_jec.secciones));
          coordTutDoc.extras = JSON.parse(JSON.stringify(PLANTILLAS_BASE_OFICIALES.ft_coord_tutoria_jec.extras));
          coordTutDoc.regla_nivel = PLANTILLAS_BASE_OFICIALES.ft_coord_tutoria_jec.regla_nivel;
          coordTutDoc.escala = 'ESCALA_1_3';
// Normalizado defensivo en memoria
        }
      }

      // Sanitizar Monitoreo Pedagógico a Docentes (EBR-EBA 2026) (Rúbricas de aula + Planificación Curricular + Observaciones + Retroalimentación)
      const rubricasDoc = activeRaw.find(x => x.id === 'ft_rubricas_aula' || (x.nombre || '').toLowerCase().includes('rúbricas de observación') || (x.nombre || '').toLowerCase().includes('monitoreo pedagógico a docente'));
      if (rubricasDoc && PLANTILLAS_BASE_OFICIALES.ft_rubricas_aula) {
        const canon = PLANTILLAS_BASE_OFICIALES.ft_rubricas_aula;
        const compTbl = Array.isArray(rubricasDoc.tablas) ? rubricasDoc.tablas.find(t => t.id === 'tbl_compromisos_rubricas_aula') : null;
        const needsUpdate = !Array.isArray(rubricasDoc.secciones) || 
                            rubricasDoc.secciones.length < 2 || 
                            !Array.isArray(rubricasDoc.tablas) || 
                            rubricasDoc.tablas.length < 5 ||
                            !compTbl ||
                            (compTbl.filas && compTbl.filas.length > 1) ||
                            (Array.isArray(rubricasDoc.extras) && rubricasDoc.extras.some(e => e && (e.id === 'ex_hora_inicio' || e.id === 'ex_hora_fin'))) ||
                            !rubricasDoc.tablas.some(t => t.id === 'tbl_datos_planif_2_1') ||
                            !rubricasDoc.tablas.some(t => t.id === 'tbl_retroalimentacion_planificacion');
        if (needsUpdate) {
          rubricasDoc.nombre = canon.nombre;
          rubricasDoc.nombreCorto = canon.nombreCorto;
          rubricasDoc.descripcion = canon.descripcion;
          rubricasDoc.icono = canon.icono;
          rubricasDoc.color = canon.color;
          rubricasDoc.modalidad = canon.modalidad;
          rubricasDoc.grupo = canon.grupo;
          rubricasDoc.tipoRespuesta = canon.tipoRespuesta;
          rubricasDoc.secciones = JSON.parse(JSON.stringify(canon.secciones));
          rubricasDoc.extras = JSON.parse(JSON.stringify(canon.extras));
          rubricasDoc.tablas = JSON.parse(JSON.stringify(canon.tablas));
          rubricasDoc.compromisos = JSON.parse(JSON.stringify(canon.compromisos));
          rubricasDoc.regla_nivel = canon.regla_nivel;
// Normalizado defensivo en memoria
        }
      }

      // 7. Filtrar la lista final deduplicando EBR, JEC y Directivos
      const loaded = [];
      let ebrAdded = false;
      let jecAdded = false;
      let directivoAdded = false;

      activeRaw.forEach(item => {
        if (deletedIds.has(item.id)) return;

        // EBR
        if (isFichaEbrGestionEscolar(item) || item.id === 'ft_gestion_ugel03_ebr' || (ALIAS_A_PLANTILLA_BASE && ALIAS_A_PLANTILLA_BASE[item.id] === 'ft_gestion_ugel03_ebr')) {
          if (!ebrAdded) {
            loaded.push(ebrDoc);
            ebrAdded = true;
          }
          return;
        }

        // JEC
        if (isJecImplementation(item)) {
          if (!jecAdded) {
            loaded.push(jecDoc);
            jecAdded = true;
          }
          // Limpiar de Firestore duplicados residuales sin registros
          if (item.id !== 'ft_msejec_2do' && dbNs && (item.id === 'ft_msejec_1er' || item.id === 'ft_jec' || item.id === 'ft_msejec_3er')) {
            const currentSubs = state.submissions || [];
            const hasSubs = currentSubs.some(s => s.fichaTypeId === item.id);
            if (!hasSubs) {
              dbNs.collection('fichaTypes').doc(item.id).delete().catch(() => {});
            }
          }
          return;
        }

        // Directivo
        if (isDirectivoDoc(item)) {
          if (!directivoAdded && directivoDoc) {
            loaded.push(directivoDoc);
            directivoAdded = true;
          }
          // Limpiar de Firestore duplicados residuales sin registros
          if (directivoDoc && item.id !== directivoDoc.id && dbNs) {
            const currentSubs = state.submissions || [];
            const hasSubs = currentSubs.some(s => s.fichaTypeId === item.id);
            if (!hasSubs) {
              dbNs.collection('fichaTypes').doc(item.id).delete().catch(() => {});
            }
          }
          return;
        }

        loaded.push(item);
      });

      if (!ebrAdded && ebrDoc) loaded.push(ebrDoc);
      if (!jecAdded && jecDoc) loaded.push(jecDoc);
      if (!directivoAdded && directivoDoc) loaded.push(directivoDoc);

      // 8. Sanitizar que sec.num e it.num no sean undefined
      loaded.forEach(ftItem => {
        if (Array.isArray(ftItem.secciones)) {
          let runningItemNum = 1;
          ftItem.secciones.forEach((sec, sIdx) => {
            if (!sec.num) {
              sec.num = (ftItem.id === 'ft_prite_gestion' || ftItem.id === 'ft_gestion_cebe')
                ? `3.${sIdx + 1}`
                : `${sIdx + 1}`;
            }
            if (Array.isArray(sec.items)) {
              sec.items.forEach(it => {
                if (it.num === undefined || it.num === null || it.num === '') {
                  it.num = runningItemNum;
                }
                runningItemNum++;
              });
            }
          });
        }
      });

      state.fichaTypes = loaded;
      state.fichaTypes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      renderDebounced();
    }, err => handleSnapErr('fichaTypes', err, true))
  );

  activeUnsubscribers.push(
    dbNs.collection('submissions').onSnapshot(snap => {
      let subs = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      subs.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
      subs = healCoordTutoriaSubmissions(subs, dbNs);
      state.submissions = subs;
      try {
        sessionStorage.setItem('agebre_cache_submissions', JSON.stringify(subs.slice(0, 300)));
      } catch (_) {}
      if (state.activeTab !== 'registrar') {
        renderDebounced();
      }
    }, err => handleSnapErr('submissions', err, true))
  );

  activeUnsubscribers.push(
    dbNs.collection('colegios').onSnapshot(snap => {
      state.colegios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.colegios.sort((a, b) => (a.ie || '').localeCompare(b.ie || ''));
      try {
        sessionStorage.setItem('agebre_cache_colegios', JSON.stringify(state.colegios.slice(0, 300)));
      } catch (_) {}
      if (state.activeTab !== 'registrar') {
        renderDebounced();
      }
    }, err => handleSnapErr('colegios', err, true))
  );

  activeUnsubscribers.push(
    dbNs.collection('responsables').onSnapshot(snap => {
      state.responsables = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const hasJecResp = state.responsables.some(r => {
        const n = (r.nombresApellidos || '').toLowerCase();
        return n.includes('fanny liliana') || (n.includes('fanny') && n.includes('arias'));
      });
      if (!hasJecResp) {
        state.responsables.push({
          id: 'resp_jec_fanny_arias',
          nombresApellidos: ESPECIALISTA_JEC_OFICIAL.nombresApellidos,
          cargo: ESPECIALISTA_JEC_OFICIAL.cargo,
          especialista: ESPECIALISTA_JEC_OFICIAL.area,
          modalidad: ESPECIALISTA_JEC_OFICIAL.modalidad,
          red: ESPECIALISTA_JEC_OFICIAL.red,
          distrito: 'UGEL 03',
          entidad: ESPECIALISTA_JEC_OFICIAL.entidad || 'UGEL 03',
          correo: ESPECIALISTA_JEC_OFICIAL.correo || 'farias@ugel03.gob.pe'
        });
      }
      state.responsables.sort((a, b) => (a.nombresApellidos || a.especialista || '').localeCompare(b.nombresApellidos || b.especialista || ''));
      try {
        sessionStorage.setItem('agebre_cache_responsables', JSON.stringify(state.responsables));
      } catch (_) {}
      if (state.activeTab !== 'registrar') {
        renderDebounced();
      }
    }, err => handleSnapErr('responsables', err, false))
  );

  // Compromisos de mejora (ligero)
  activeUnsubscribers.push(
    dbNs.collection('compromisos').onSnapshot(snap => {
      state.compromisos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (state.activeTab === 'alertas' || state.activeTab === 'registrar' || state.activeTab === 'dashboard') {
        renderDebounced();
      }
    }, err => handleSnapErr('compromisos', err, false))
  );

  // Carga bajo demanda (Lazy Loading) según pestaña activa inicial
  if (state.modulo === 'concursos') {
    ensureConcursoListeners();
  }
  if (state.activeTab === 'directorio' || state.activeTab === 'colegios') {
    ensureDirectivosListener();
  }
  if (state.activeTab === 'tipos') {
    ensureFirmasListeners();
  }
  if (state.activeTab === 'usuarios' && isAdmin()) {
    ensureAdminRoleListeners();
  }

  // Listener en tiempo real del rol y permisos del usuario actual (incluso para especialistas)
  if (currentUser?.uid && dbNs) {
    try {
      activeUnsubscribers.push(
        dbNs.collection('roles').doc(currentUser.uid).onSnapshot(docSnap => {
          if (docSnap && docSnap.exists) {
            const data = { id: currentUser.uid, ...docSnap.data() };
            state.currentUserRoleDoc = data;
            try { sessionStorage.setItem('agebre_user_doc_' + currentUser.uid, JSON.stringify(data)); } catch (_) {}
            const effectiveRole = data.role || (data.userType === 'coordinador' ? 'admin' : 'general');
            if (effectiveRole && effectiveRole !== currentRole) {
              currentRole = effectiveRole;
            }
            updateAdminNavVisibility();
            if (isAdmin()) ensureAdminRoleListeners();
            if (data.nombre) {
              const topName = document.getElementById('topUserName');
              if (topName) topName.textContent = data.nombre;
              const menuName = document.getElementById('menuUserNombre');
              if (menuName) menuName.textContent = data.nombre;
            }
            setupUserProfileDropdown(currentUser);
            if (state.modulo === 'concursos' && !canAccessConcursos()) {
              showToast('🔒 Tu acceso al Módulo de Concursos ha sido modificado por el Administrador.');
              seleccionarModulo('monitoreo');
            } else {
              renderDebounced();
            }
          }
        }, err => console.warn('Aviso al sincronizar permisos de usuario:', err))
      );
    } catch (e) {
      console.warn('Aviso al iniciar listener de rol de usuario:', e);
    }
  }

  renderDebounced();
}

function ensureConcursoListeners() {
  if (concursoListenersStarted || !dbNs) return;
  concursoListenersStarted = true;

  // Fallback inmediato con los 6 concursos oficiales para que nunca aparezca vacío
  if (!state.tiposConcurso || state.tiposConcurso.length === 0) {
    if (typeof SEED_CONCURSOS_DEFAULTS !== 'undefined' && Array.isArray(SEED_CONCURSOS_DEFAULTS)) {
      state.tiposConcurso = JSON.parse(JSON.stringify(SEED_CONCURSOS_DEFAULTS));
    }
  }

  activeUnsubscribers.push(
    dbNs.collection('tiposConcurso').onSnapshot(snap => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (loaded.length > 0) {
        const loadedIds = new Set(loaded.map(x => x.id));
        if (typeof SEED_CONCURSOS_DEFAULTS !== 'undefined' && Array.isArray(SEED_CONCURSOS_DEFAULTS)) {
          SEED_CONCURSOS_DEFAULTS.forEach(def => {
            if (!loadedIds.has(def.id)) loaded.push({ ...def });
          });
        }
        state.tiposConcurso = loaded;
      } else if (typeof SEED_CONCURSOS_DEFAULTS !== 'undefined' && Array.isArray(SEED_CONCURSOS_DEFAULTS)) {
        state.tiposConcurso = JSON.parse(JSON.stringify(SEED_CONCURSOS_DEFAULTS));
      }
      state.tiposConcurso.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      if (state.activeTab === 'concursos') {
        renderDebounced();
      }
    }, err => {
      handleSnapErr('tiposConcurso', err, false);
      if (!state.tiposConcurso || state.tiposConcurso.length === 0) {
        if (typeof SEED_CONCURSOS_DEFAULTS !== 'undefined' && Array.isArray(SEED_CONCURSOS_DEFAULTS)) {
          state.tiposConcurso = JSON.parse(JSON.stringify(SEED_CONCURSOS_DEFAULTS));
        }
        if (state.activeTab === 'concursos') renderDebounced();
      }
    })
  );

  activeUnsubscribers.push(
    dbNs.collection('concursoRegistros').orderBy('createdAt', 'desc').limit(2000).onSnapshot(snap => {
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (loaded.length > 0) {
        state.concursoRegistros = loaded;
      }
      if (state.activeTab === 'concursos') {
        renderDebounced();
      }
    }, err => handleSnapErr('concursoRegistros', err, false))
  );

  activeUnsubscribers.push(
    dbNs.collection('concursoCuerpoTecnico').onSnapshot(snap => {
      state.concursoCuerpoTecnico = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (state.activeTab === 'concursos') {
        renderDebounced();
      }
    }, err => handleSnapErr('concursoCuerpoTecnico', err, false))
  );
}

// Carga bajo demanda del padrón de directivos (optimización de red)
function ensureDirectivosListener() {
  if (directivosListenerStarted || !dbNs) return;
  directivosListenerStarted = true;
  activeUnsubscribers.push(
    dbNs.collection('directivos').onSnapshot(snap => {
      state.directivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      try {
        sessionStorage.setItem('agebre_cache_directivos', JSON.stringify(state.directivos.slice(0, 300)));
      } catch (_) {}
      if (state.activeTab === 'directorio' || state.activeTab === 'colegios') {
        renderDebounced();
      }
    }, err => handleSnapErr('directivos', err, false))
  );
}

// Carga bajo demanda del módulo de gestión de usuarios (solo admin)
function ensureAdminRoleListeners() {
  if (rolesListenerStarted || !dbNs || !isAdmin()) return;
  rolesListenerStarted = true;
  if (!state.roles || state.roles.length === 0) {
    state.roles = getCachedArray('agebre_cache_roles');
  }
  activeUnsubscribers.push(
    dbNs.collection('roles').onSnapshot(snap => {
      state.roles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.roles.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
      try { localStorage.setItem('agebre_cache_roles', JSON.stringify(state.roles)); } catch (_) {}
      if (state.activeTab === 'usuarios') {
        renderDebounced();
      }
    }, err => handleSnapErr('roles', err, false))
  );
}

// Carga bajo demanda de áreas y firmantes oficiales
function ensureFirmasListeners() {
  if (firmasListenersStarted || !dbNs) return;
  firmasListenersStarted = true;
  activeUnsubscribers.push(
    dbNs.collection('areasFirma').onSnapshot(snap => {
      state.areasFirma = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.areasFirma.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      if (state.activeTab === 'tipos' || state.activeTab === 'registrar') {
        renderDebounced();
      }
    }, err => handleSnapErr('areasFirma', err, false))
  );

  activeUnsubscribers.push(
    dbNs.collection('plantillasFirmantes').onSnapshot(snap => {
      state.plantillasFirmantes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.plantillasFirmantes.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      if (state.activeTab === 'tipos' || state.activeTab === 'registrar') {
        renderDebounced();
      }
    }, err => handleSnapErr('plantillasFirmantes', err, false))
  );
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

/* ============================= MENÚ DE PERFIL DE USUARIO ============================= */
function setupUserProfileDropdown(user) {
  const profileTrigger = document.getElementById('topUserProfile');
  const dropdownMenu = document.getElementById('userDropdownMenu');
  if (!profileTrigger || !dropdownMenu) return;

  const emailStr = user?.email || user?.displayName || 'usuario';
  const uDoc = state?.currentUserRoleDoc || {};
  const nombreStr = uDoc.nombre || user?.displayName || emailStr;
  const cargoStr = isAdmin() ? 'Administrador / Coordinador' : (uDoc.cargo || 'Especialista General');

  const elNombre = document.getElementById('menuUserNombre');
  const elEmail = document.getElementById('menuUserEmail');
  const elRole = document.getElementById('menuUserRole');

  if (elNombre) elNombre.textContent = nombreStr;
  if (elEmail) elEmail.textContent = emailStr;
  if (elRole) {
    elRole.textContent = isAdmin() ? 'ADMINISTRADOR' : 'ESPECIALISTA';
    elRole.title = cargoStr;
  }

  const closeDropdown = () => {
    dropdownMenu.style.display = 'none';
    profileTrigger.classList.remove('active');
    profileTrigger.setAttribute('aria-expanded', 'false');
  };

  const openDropdown = () => {
    dropdownMenu.style.display = 'flex';
    profileTrigger.classList.add('active');
    profileTrigger.setAttribute('aria-expanded', 'true');
  };

  profileTrigger.onclick = (e) => {
    if (e.target.closest('.userDropdownItem')) return;
    if (dropdownMenu.style.display === 'flex') {
      closeDropdown();
    } else {
      openDropdown();
    }
  };

  profileTrigger.onkeydown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      if (!e.target.closest('.userDropdownItem')) {
        e.preventDefault();
        profileTrigger.click();
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
    }
  };

  // Cerrar al hacer clic fuera
  document.addEventListener('click', (e) => {
    if (!profileTrigger.contains(e.target)) {
      closeDropdown();
    }
  });

  // Opción Administrador: Gestión de Usuarios
  let btnGestionUsuarios = document.getElementById('btnMenuGestionUsuarios');
  if (isAdmin() && !btnGestionUsuarios) {
    const lastDivider = dropdownMenu.querySelector('.userDropdownDivider:last-of-type');
    if (lastDivider) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'userDropdownItem';
      btn.id = 'btnMenuGestionUsuarios';
      btn.setAttribute('role', 'menuitem');
      btn.innerHTML = `
        <span class="userDropdownIcon">◈</span>
        <div class="userDropdownItemText">
          <strong>Gestión de Usuarios</strong>
          <small>Crear especialistas y asignar colegios</small>
        </div>
      `;
      btn.onclick = (e) => {
        e.stopPropagation();
        closeDropdown();
        navigate('usuarios');
      };
      dropdownMenu.insertBefore(btn, lastDivider);
    }
  } else if (btnGestionUsuarios) {
    btnGestionUsuarios.style.display = isAdmin() ? '' : 'none';
    btnGestionUsuarios.onclick = (e) => {
      e.stopPropagation();
      closeDropdown();
      navigate('usuarios');
    };
  }

  // Opción 1: Actualizar mis datos
  const btnActualizar = document.getElementById('btnMenuActualizarDatos');
  if (btnActualizar) {
    btnActualizar.onclick = (e) => {
      e.stopPropagation();
      closeDropdown();
      openUserProfileModal(state, dbNs, currentUser, () => {
        const updatedDoc = state?.currentUserRoleDoc || {};
        const newNombre = updatedDoc.nombre || currentUser?.displayName || emailStr;
        if (elNombre) elNombre.textContent = newNombre;
        const topName = document.getElementById('topUserName');
        if (topName) topName.textContent = newNombre;
      });
    };
  }

  // Opción 2: Cambiar mi contraseña
  const btnCambiarClave = document.getElementById('btnMenuCambiarClave');
  if (btnCambiarClave) {
    btnCambiarClave.onclick = (e) => {
      e.stopPropagation();
      closeDropdown();
      openChangePasswordModal(currentUser, dbNs);
    };
  }

  // Opción 3: Cerrar sesión
  const btnCerrar = document.getElementById('btnMenuCerrarSesion');
  if (btnCerrar) {
    btnCerrar.onclick = (e) => {
      e.stopPropagation();
      closeDropdown();
      triggerLogout();
    };
  }
}

/**
 * Abre el diálogo institucional para confirmación de cierre de sesión
 */
function triggerLogout() {
  openLogoutConfirmModal({
    currentUser,
    isAdmin: isAdmin(),
    onConfirmLogout: async () => {
      stopListeners();
      // Espera breve para que el WebChannel de Firestore cierre ordenadamente los canales de escucha
      await new Promise(resolve => setTimeout(resolve, 150));
      try {
        await signOut(auth);
        showToast('✓ Sesión cerrada correctamente.');
      } catch (err) {
        console.warn('Aviso al cerrar sesión:', err);
      }
    },
    onSwitchUser: async () => {
      stopListeners();
      // Espera breve para que el WebChannel de Firestore cierre ordenadamente los canales de escucha
      await new Promise(resolve => setTimeout(resolve, 150));
      try {
        await signOut(auth);
        const emailInp = document.getElementById('loginEmail');
        const passInp = document.getElementById('loginPassword');
        if (emailInp) {
          emailInp.value = '';
          emailInp.focus();
        }
        if (passInp) passInp.value = '';
        showToast('Inicia sesión con otra cuenta institucional.');
      } catch (err) {
        console.warn('Aviso al cambiar de cuenta:', err);
      }
    },
    onCancelLogout: () => {}
  });
}

/* ============================= AUTH CALLBACKS ============================= */
function onLogin(user, role, userRoleDoc) {
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  setConnectionState('online');

  currentUser = user;
  currentRole = role;

  if (userRoleDoc) {
    state.currentUserRoleDoc = userRoleDoc;
    try { sessionStorage.setItem('agebre_user_doc_' + user.uid, JSON.stringify(userRoleDoc)); } catch (_) {}
  } else {
    try {
      const stored = sessionStorage.getItem('agebre_user_doc_' + user.uid);
      if (stored) state.currentUserRoleDoc = JSON.parse(stored);
    } catch (_) {}
  }

  // Si el usuario no tiene acceso a concursos habilitado por el administrador, ingresa directamente a Monitoreo y Seguimiento
  if (!canAccessConcursos()) {
    state.modulo = 'monitoreo';
    safeSessionSet('agebre_active_modulo', 'monitoreo');
  } else {
    const savedMod = sessionStorage.getItem('agebre_active_modulo') || 'portal';
    state.modulo = savedMod;
  }

  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'flex';

  // Ocultar o mostrar botones de admin según el rol
  updateAdminNavVisibility();
  if (isAdmin()) {
    ensureAdminRoleListeners();
  }

  // 1. Actualizar barra superior de usuario
  const emailStr = user.email || user.displayName || 'usuario';
  const roleLabel = isAdmin() ? 'ADMIN' : 'GENERAL';
  const initials = (emailStr.slice(0, 2) || 'US').toUpperCase();

  const elAvatar = document.getElementById('topUserAvatar');
  const elName = document.getElementById('topUserName');
  const elBadge = document.getElementById('topUserBadge');
  if (elAvatar) {
    elAvatar.textContent = initials;
    elAvatar.title = emailStr + ' (' + roleLabel + ')';
    elAvatar.style.cursor = 'pointer';
    elAvatar.onclick = () => {
      if (window.innerWidth <= 640) {
        showToast('👤 ' + emailStr + ' · ' + (isAdmin() ? 'Administrador' : 'Especialista General'));
      }
    };
  }
  const uDocInit = state.currentUserRoleDoc || {};
  if (elName) elName.textContent = uDocInit.nombre || emailStr;
  if (elBadge) elBadge.textContent = roleLabel;

  setupUserProfileDropdown(user);

  // 2. Actualizar banner de bienvenida institucional
  const bannerInfo = document.getElementById('bannerUserInfo');
  if (bannerInfo) {
    if (isAdmin()) {
      bannerInfo.innerHTML =
        'Conectado como: <strong>' + esc(emailStr) + '</strong>' +
        ' · <span class="badge st-logrado">Administrador</span>' +
        ' · Supervisión consolidada de todas las REIs y modalidades institucionales.';
    } else {
      const uDoc = state.currentUserRoleDoc;
      const rawMods = uDoc?.modalidades || uDoc?.modalidad || 'EBR';
      const modStr = Array.isArray(rawMods) ? rawMods.join(', ') : String(rawMods);
      const rawReis = uDoc?.reis || ['01'];
      const reisArr = Array.isArray(rawReis) ? rawReis : [rawReis];
      const reisStr = reisArr.map(r => r === 'TODAS' ? 'Todas las REIs' : 'REI ' + String(r).padStart(2, '0')).join(', ');
      bannerInfo.innerHTML =
        'Conectado como: <strong>' + esc(emailStr) + '</strong>' +
        ' · <span class="badge st-none">Especialista</span>' +
        ' · <strong>Modalidad:</strong> ' + esc(modStr) +
        ' · <strong>Jurisdicción:</strong> <span class="badge" style="background:#E0F2FE;color:#0369A1;font-weight:700">' + esc(reisStr) + '</span>' +
        ' · Visualizando exclusivamente registros y fichas de su REI asignada.';
    }
  }

  // 3. Listener del botón Cerrar Sesión en la barra superior con confirmación
  const logoutBtn = document.getElementById('topLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => triggerLogout();
  }

  startListeners();
}

function onLogout() {
  const dropdownMenu = document.getElementById('userDropdownMenu');
  if (dropdownMenu) dropdownMenu.style.display = 'none';
  const profileTrigger = document.getElementById('topUserProfile');
  if (profileTrigger) profileTrigger.classList.remove('active');

  stopListeners();
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  setConnectionState('offline');

  currentUser = null;
  currentRole = null;
  state.currentUserRoleDoc = null;
  state.modulo = 'portal';
  try {
    safeSessionRemove('agebre_active_modulo');
    if (currentUser?.uid) sessionStorage.removeItem('agebre_role_' + currentUser.uid);
  } catch (_) { }

  document.getElementById('loginScreen').style.display = 'flex';
  const loginViewSection = document.getElementById('loginViewSection');
  if (loginViewSection) loginViewSection.style.display = 'block';
  const registerViewSection = document.getElementById('registerViewSection');
  if (registerViewSection) registerViewSection.style.display = 'none';
  const forgotViewSection = document.getElementById('forgotViewSection');
  if (forgotViewSection) forgotViewSection.style.display = 'none';
  const verifyOtpSection = document.getElementById('verifyOtpSection');
  if (verifyOtpSection) verifyOtpSection.style.display = 'none';
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

  // Click en el logo institucional para regresar al selector de módulos
  const brand = document.querySelector('.topBrand');
  if (brand) {
    brand.style.cursor = 'pointer';
    brand.title = 'Ir a Selección de Aplicaciones (Portal)';
    brand.onclick = () => {
      seleccionarModulo('portal');
    };
  }

  // Click en el botón Módulos de la barra superior (al lado de En línea)
  const topModBtn = document.getElementById('topModulosBtn');
  if (topModBtn) {
    topModBtn.onclick = () => {
      seleccionarModulo('portal');
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
    firestoreDb = typeof initFirestore === 'function' ? initFirestore(firebaseApp) : getFirestore(firebaseApp);
    dbNs = makeDbAdapter(firestoreDb);
    auth = getAuth(firebaseApp);
  } catch (e) {
    console.error('No se pudo inicializar Firebase. Revisa FIREBASE_CONFIG.', e);
    setConnectionState('offline');
    document.getElementById('loginScreen').style.display = 'flex';
  const loginViewSection = document.getElementById('loginViewSection');
  if (loginViewSection) loginViewSection.style.display = 'block';
  const registerViewSection = document.getElementById('registerViewSection');
  if (registerViewSection) registerViewSection.style.display = 'none';
  const forgotViewSection = document.getElementById('forgotViewSection');
  if (forgotViewSection) forgotViewSection.style.display = 'none';
  const verifyOtpSection = document.getElementById('verifyOtpSection');
  if (verifyOtpSection) verifyOtpSection.style.display = 'none';
    document.getElementById('loginError').textContent =
      'No se pudo inicializar Firebase. Revisa la configuración (firebase-config.js).';
    return;
  }

  // Manejador delegado universal para botones de observación, evidencia y hallazgos en todas las fichas
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btnToggleObs, .btnToggleEvidencia');
    if (!btn) return;
    const targetId = btn.dataset.targetObs || btn.dataset.targetEvid;
    if (!targetId) return;
    const wrap = document.getElementById(targetId);
    if (!wrap) return;

    e.preventDefault();
    const isHidden = (wrap.style.display === 'none' || window.getComputedStyle(wrap).display === 'none');
    if (isHidden) {
      wrap.style.display = 'block';
      btn.classList.add('active');
      btn.textContent = '✕ Ocultar obs.';
      const inp = wrap.querySelector('textarea, input');
      if (inp) inp.focus();
    } else {
      wrap.style.display = 'none';
      btn.classList.remove('active');
      const inp = wrap.querySelector('textarea, input');
      const hasVal = inp && Boolean(inp.value.trim());
      if (hasVal) {
        btn.classList.add('has-content');
        btn.textContent = '💬 Observación ✓';
      } else {
        btn.classList.remove('has-content');
        btn.textContent = '💬 Observación';
      }
    }
  });

  // Configurar navegación entre pestañas
  setupNavigation(state, render);

  // Configurar listeners de autenticación
  setupAuthListeners(auth, firestoreDb, { onLogin, onLogout });
}

// Render inicial (muestra el estado vacío mientras carga Firebase)
render();
initApp();


// Delegación global universal de eventos con useCapture para clics seguros en tarjetas y pestañas
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const portalCard = e.target.closest('#portalCardMonitoreo, [data-select-module="monitoreo"]');
    if (portalCard) {
      e.preventDefault();
      e.stopPropagation();
      seleccionarModulo('monitoreo');
      return;
    }

    const cPortalCard = e.target.closest('#portalCardConcursos, [data-select-module="concursos"]');
    if (cPortalCard) {
      e.preventDefault();
      e.stopPropagation();
      if (!canAccessConcursos()) {
        showToast('⚠️ Acceso restringido: Tu cuenta de especialista actualmente solo tiene acceso a Monitoreo y Seguimiento.');
        return;
      }
      seleccionarModulo('concursos');
      return;
    }

    const navBtn = e.target.closest('#subNavBar .navbtn[data-tab]');
    if (navBtn && navBtn.dataset.tab) {
      e.preventDefault();
      e.stopPropagation();
      const tab = navBtn.dataset.tab;
      if (tab === 'registrar') {
        clearEditMode();
        setRegBuiltFor(null);
        setRegistrarSubTab('registrar');
      }
      navigate(tab);
      return;
    }

    const cNavBtn = e.target.closest('#subNavBar .navbtn[data-csubtab]');
    if (cNavBtn && cNavBtn.dataset.csubtab) {
      e.preventDefault();
      e.stopPropagation();
      const cTab = cNavBtn.dataset.csubtab;
      if (typeof setConcursoSubTab === 'function') {
        setConcursoSubTab(cTab);
      }
      state.activeTab = 'concursos';
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      render();
      return;
    }
  }, true);
}