/* =========================================================================
   app.js — Archivo principal que importa los demás módulos e inicializa
   el flujo completo de la aplicación.
   ========================================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { FIREBASE_CONFIG } from './firebase-config.js?v=20260918_v11';
import { getFirestore, initFirestore, makeDbAdapter } from './firestore.js?v=20261002_v1';
import { getAuth, signOut, setupAuthListeners } from './auth.js?v=20260918_v11';
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
  setEditMode,
  computeStats,
  forceResetBodyScroll,
  setAppState,
  openLogoutConfirmModal,
  getConcursoSubTab,
  setConcursoSubTab,
} from './ui.js?v=20261016_v6';

import { renderPortalView } from './portal.js?v=20261014_v1';
import { renderDirectorioTab } from './directorio.js?v=20261015_v1';
import { renderAlertasTab, getAlertCount } from './alertas.js?v=20261015_v1';
import { ESPECIALISTA_JEC_OFICIAL } from './calcEngine.js?v=20261016_v2';
import { PLANTILLAS_BASE_OFICIALES } from './catalogo-plantillas-base.js?v=20261016_v4';

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
let firestoreDb = null;
let auth = null;
let dbNs = null;

let currentUser = null;
let currentRole = null; // 'admin' | 'general'
let connectionTimer = null;

const state = {
  modulo: sessionStorage.getItem('agebre_active_modulo') || 'portal', // 'portal' | 'monitoreo' | 'concursos'
  activeTab: 'dashboard',
  fichaTypes: [],  // {id, nombre, descripcion, icono, tipoRespuesta, secciones, extras}
  submissions: [],  // {id, fichaTypeId, ...}
  roles: [],  // {id(=uid), email, role, createdAt}  — solo admin
  colegios: [],  // {id, rei, codigoLocal, ie, ...}
  directivos: [],  // {id, colegioId, codigoLocal, cargo, apellidosNombres, dni, telefono, correo, condicion, estado, fuente, historial, ...}
  responsables: [],  // {id, red, distrito, especialista, nombresApellidos, cargo, modalidad, celular, correo}
  tiposConcurso: [],  // {id, nombre, tipoParticipacion, tieneGenero, tieneDisciplina, tieneTituloTrabajo, categorias, ...}
  concursoRegistros: [],  // {id, tipoConcursoId, etapa, categoria, institucion, participantes, asesores, ...}
  concursoCuerpoTecnico: [], // {id, grupoKey, tipoConcursoId, etapa, categoria, disciplina, genero, personas, bitacora, ...}
  compromisos: [],  // {id, fichaId, institucion, ugel, responsable, texto, plazo, estado, ...}
  areasFirma: [],  // {id, nombre, sigla, descripcionEncabezado, logo, activa, esPredeterminada}
  plantillasFirmantes: [], // {id, areaId, tipoReporte, orden, cargo, nombreOpcional, entidad, leyenda}
  preferenciasDescarga: [], // {usuarioId, tipoReporte, areaId, firmantesJson, opcionesJson}
};

// Exponer state globalmente para depuración y resiliencia de módulos
if (typeof window !== 'undefined') {
  window.state = state;
}

function isAdmin() { return currentRole === 'admin'; }

function getFichaType(id) {
  return (state.fichaTypes || []).find(f => f.id === id) || PLANTILLAS_BASE_OFICIALES[id] || null;
}

/* ============================= SELECCIÓN DE MÓDULOS ============================= */
function seleccionarModulo(mod) {
  state.modulo = mod;
  if (mod === 'portal') {
    sessionStorage.removeItem('agebre_active_modulo');
    state.activeTab = 'portal';
  } else if (mod === 'monitoreo') {
    sessionStorage.setItem('agebre_active_modulo', 'monitoreo');
    if (state.activeTab === 'portal' || state.activeTab === 'concursos') {
      state.activeTab = 'dashboard';
    }
  } else if (mod === 'concursos') {
    sessionStorage.setItem('agebre_active_modulo', 'concursos');
    state.activeTab = 'concursos';
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
    if (state.modulo === 'portal') {
      topModBtn.classList.add('active');
    } else {
      topModBtn.classList.remove('active');
    }
  }

  if (state.modulo === 'portal') {
    subNav.style.display = 'none';
    if (welcomeBanner) welcomeBanner.style.display = 'none';
    return;
  }

  subNav.style.display = 'flex';
  if (welcomeBanner) welcomeBanner.style.display = 'flex';

  if (state.modulo === 'monitoreo') {
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
      ${isAdmin() ? `
        <button type="button" class="navbtn ${state.activeTab === 'usuarios' ? 'active' : ''}" data-tab="usuarios" data-admin-only="1">
          <span class="ic">◈</span> Usuarios
        </button>
      ` : ''}
    `;

    subNav.querySelectorAll('.navbtn[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate(btn.dataset.tab);
      });
    });

  } else if (state.modulo === 'concursos') {
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
      ${isAdmin() ? `
        <button type="button" class="navbtn ${currentSub === 'tipos' ? 'active' : ''}" data-csubtab="tipos" data-admin-only="1">
          <span class="ic">⚙</span> Tipos de concurso
        </button>
      ` : ''}
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
    sessionStorage.setItem('agebre_active_modulo', 'concursos');
  } else {
    state.modulo = 'monitoreo';
    sessionStorage.setItem('agebre_active_modulo', 'monitoreo');
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
function render() {
  setAppState(state);
  const c = document.getElementById('tabContent');

  // Actualizar la barra de subnavegación según el módulo actual
  renderSubNavBar();

  // Si estamos en la pantalla de bienvenida/portal de aplicaciones
  if (state.modulo === 'portal') {
    if (!c.querySelector('.portalContainer')) {
      renderPortalView(c, {
        onSelectModule: (selectedMod) => {
          seleccionarModulo(selectedMod);
        }
      });
    }
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

  switch (state.activeTab) {
    case 'dashboard':
      if (state.fichaTypes.length === 0) {
        c.innerHTML = '<div class="pageHead"><h2>Resumen general</h2><p>Vista consolidada de monitoreo y niveles de avance institucional.</p></div>' +
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
      renderRegistrarTab(c, state, getFichaType, dbNs, currentUser, navigate, isAdmin());
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
    case 'directorio':
      renderDirectorioTab(c, state, dbNs, isAdmin(), currentUser, navigate);
      break;
    case 'alertas':
      state.activeTab = 'dashboard';
      c.innerHTML = viewDashboard(state, getFichaType, render);
      break;
    case 'tipos':
      state.activeTab = 'registrar';
      if (isAdmin()) setRegistrarSubTab('plantillas');
      renderRegistrarTab(c, state, getFichaType, dbNs, currentUser, navigate, isAdmin());
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
let activeUnsubscribers = [];

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
      const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const loadedIds = new Set(loaded.map(x => x.id));
      Object.entries(PLANTILLAS_BASE_OFICIALES).forEach(([id, baseFt]) => {
        if (!loadedIds.has(id)) {
          loaded.push({ id, ...baseFt });
        }
      });

      // 1. Validar y autorreparar la plantilla oficial de PRITE (7 secciones, 32 ítems: 3, 5, 6, 3, 8, 5, 2)
      const priteDoc = loaded.find(x => x.id === 'ft_prite_gestion');
      const isOfficialPrite = priteDoc && Array.isArray(priteDoc.secciones) && priteDoc.secciones.length === 7 && priteDoc.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 32;
      if (priteDoc && !isOfficialPrite) {
        console.warn('Detectada plantilla PRITE no canónica en Firestore. Restaurando 7 secciones oficiales y 32 ítems (RM N° 501-2025-MINEDU)...');
        Object.assign(priteDoc, PLANTILLAS_BASE_OFICIALES.ft_prite_gestion);
        dbNs.collection('fichaTypes').doc('ft_prite_gestion').set({
          ...PLANTILLAS_BASE_OFICIALES.ft_prite_gestion,
          updatedAt: Date.now()
        }, { merge: true }).catch(err => console.warn('Error autorreparando ft_prite_gestion en Firestore:', err));
      }

      // 2. Validar y autorreparar la plantilla oficial de CEBE (7 secciones, 34 ítems)
      const cebeDoc = loaded.find(x => x.id === 'ft_gestion_cebe');
      const isOfficialCebe = cebeDoc && Array.isArray(cebeDoc.secciones) && cebeDoc.secciones.length === 7 && cebeDoc.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 34 && cebeDoc.secciones.every(s => s.num);
      if (cebeDoc && !isOfficialCebe) {
        console.warn('Detectada plantilla CEBE no canónica o sin numeración en Firestore. Restaurando 7 secciones oficiales y 34 ítems...');
        Object.assign(cebeDoc, PLANTILLAS_BASE_OFICIALES.ft_gestion_cebe);
        dbNs.collection('fichaTypes').doc('ft_gestion_cebe').set({
          ...PLANTILLAS_BASE_OFICIALES.ft_gestion_cebe,
          updatedAt: Date.now()
        }, { merge: true }).catch(err => console.warn('Error autorreparando ft_gestion_cebe en Firestore:', err));
      }

      // 3. Sanitizar sistemáticamente todas las plantillas para que sec.num e it.num nunca sean undefined
      loaded.forEach(ftItem => {
        // Homogeneizar la Ficha Unificada de Monitoreo a la Implementación del Modelo JEC (Estilo EBR)
        if (ftItem.id === 'ft_msejec_2do' || ftItem.id === 'ft_jec' || ftItem.id === 'ft_msejec_1er' || ftItem.id === 'ft_msejec_3er') {
          ftItem.nombre = 'Monitoreo a la Implementación del Modelo JEC';
          ftItem.nombreCorto = 'Monitoreo a la Implementación del Modelo JEC';
          ftItem.grupo = 'Modelo JEC';
          ftItem.orden = 10;
          ftItem.tieneVisitas = true;
          ftItem.tipoVisitas = 'items_por_visita';
          ftItem.visitas = [
            '1er Monitoreo · Primer momento (Inicio)',
            '2do Monitoreo · Segundo momento (Proceso)',
            '3er Monitoreo · Tercer momento (Salida)'
          ];
        }

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
      render();
    }, err => handleSnapErr('fichaTypes', err, true))
  );

  activeUnsubscribers.push(
    dbNs.collection('submissions').orderBy('createdAt', 'desc').limit(1000).onSnapshot(snap => {
      state.submissions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // No destruir el formulario si el usuario está en la pestaña registrar
      if (state.activeTab !== 'registrar') {
        render();
      }
    }, err => handleSnapErr('submissions', err, true))
  );

  activeUnsubscribers.push(
    dbNs.collection('colegios').onSnapshot(snap => {
      state.colegios = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.colegios.sort((a, b) => (a.ie || '').localeCompare(b.ie || ''));
      if (state.activeTab !== 'registrar') {
        render();
      }
    }, err => handleSnapErr('colegios', err, true))
  );

  activeUnsubscribers.push(
    dbNs.collection('directivos').onSnapshot(snap => {
      state.directivos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (state.activeTab === 'directorio' || state.activeTab === 'colegios') {
        render();
      }
    }, err => handleSnapErr('directivos', err, true))
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
          entidad: ESPECIALISTA_JEC_OFICIAL.entidad
        });
      }
      state.responsables.sort((a, b) => (a.nombresApellidos || a.especialista || '').localeCompare(b.nombresApellidos || b.especialista || ''));
      if (state.activeTab !== 'registrar') {
        render();
      }
    }, err => handleSnapErr('responsables', err, false))
  );

  // Catálogo de tipos de concurso
  activeUnsubscribers.push(
    dbNs.collection('tiposConcurso').onSnapshot(snap => {
      state.tiposConcurso = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.tiposConcurso.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
      if (state.activeTab === 'concursos') {
        render();
      }
    }, err => handleSnapErr('tiposConcurso', err, false))
  );

  // Registros de concursos
  activeUnsubscribers.push(
    dbNs.collection('concursoRegistros').orderBy('createdAt', 'desc').limit(2000).onSnapshot(snap => {
      state.concursoRegistros = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (state.activeTab === 'concursos') {
        render();
      }
    }, err => handleSnapErr('concursoRegistros', err, false))
  );

  // Cuerpo técnico por grupo de concurso (JEDPA u otros)
  activeUnsubscribers.push(
    dbNs.collection('concursoCuerpoTecnico').onSnapshot(snap => {
      state.concursoCuerpoTecnico = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (state.activeTab === 'concursos') {
        render();
      }
    }, err => handleSnapErr('concursoCuerpoTecnico', err, false))
  );

  // Catálogo administrable de áreas de firma
  activeUnsubscribers.push(
    dbNs.collection('areasFirma').onSnapshot(snap => {
      state.areasFirma = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.areasFirma.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      if (state.activeTab === 'tipos' || state.activeTab === 'registrar') {
        render();
      }
    }, err => handleSnapErr('areasFirma', err, false))
  );

  // Plantillas de firmantes por área y tipo de reporte
  activeUnsubscribers.push(
    dbNs.collection('plantillasFirmantes').onSnapshot(snap => {
      state.plantillasFirmantes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      state.plantillasFirmantes.sort((a, b) => (a.orden || 99) - (b.orden || 99));
      if (state.activeTab === 'tipos' || state.activeTab === 'registrar') {
        render();
      }
    }, err => handleSnapErr('plantillasFirmantes', err, false))
  );

  // Compromisos de mejora
  activeUnsubscribers.push(
    dbNs.collection('compromisos').onSnapshot(snap => {
      state.compromisos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (state.activeTab === 'alertas' || state.activeTab === 'registrar' || state.activeTab === 'dashboard') {
        render();
      }
    }, err => handleSnapErr('compromisos', err, false))
  );

  if (isAdmin()) {
    activeUnsubscribers.push(
      dbNs.collection('roles').onSnapshot(snap => {
        state.roles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        state.roles.sort((a, b) => (a.email || '').localeCompare(b.email || ''));
        render();
      }, err => handleSnapErr('roles', err, false))
    );
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

  // Iniciar en portal si no hay módulo activo guardado
  state.modulo = sessionStorage.getItem('agebre_active_modulo') || 'portal';

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

  // 3. Listener del botón Cerrar Sesión en la barra superior con confirmación
  const logoutBtn = document.getElementById('topLogoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      openLogoutConfirmModal({
        currentUser,
        isAdmin: isAdmin(),
        onConfirmLogout: async () => {
          stopListeners();
          try {
            await signOut(auth);
            showToast('✓ Sesión cerrada correctamente.');
          } catch (err) {
            console.warn('Aviso al cerrar sesión:', err);
          }
        },
        onSwitchUser: async () => {
          stopListeners();
          try {
            await signOut(auth);
            const emailInp = document.getElementById('loginEmail');
            const passInp = document.getElementById('loginPassword');
            if (emailInp) {
              emailInp.value = '';
              setTimeout(() => emailInp.focus(), 150);
            }
            if (passInp) passInp.value = '';
            showToast('Sesión finalizada. Ingrese con sus nuevas credenciales.');
          } catch (err) {
            console.warn('Aviso al cambiar de usuario:', err);
          }
        }
      });
    };
  }

  startListeners();
}

function onLogout() {
  stopListeners();
  if (connectionTimer) {
    clearTimeout(connectionTimer);
    connectionTimer = null;
  }
  setConnectionState('offline');

  currentUser = null;
  currentRole = null;
  state.modulo = 'portal';
  try {
    sessionStorage.removeItem('agebre_active_modulo');
  } catch (_) { }

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
