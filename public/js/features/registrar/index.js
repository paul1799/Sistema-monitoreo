/**
 * features/registrar/index.js
 * Módulo unificado de Registro de Fichas de Monitoreo
 * UGEL 03 – AGEBRE – Fase 4 Reorganización
 */

import {
  esc,
  getFichaColor,
  getFichaModalidad
} from '../../core/utils/index.js';
import {
  RESPONSE_LABELS
} from '../../ui/scoring.js';
import {
  setAppState,
  clearEditMode,
  getRegTargetVisita,
  getRegSelectedColegioId
} from '../../core/state/app-state.js';
import {
  isFichaJec,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEbrGestionEscolar,
  getSubmissionVisitaNum
} from '../../calcEngine.js?v=20261103_v8';
import {
  renderEbrGestionForm,
  preloadEbrFormState
} from '../../ebr-gestion.js?v=20261103_v8';
import {
  isFichaCebeGestion,
  renderCebeGestionForm,
  preloadCebeFormState
} from '../../cebe-gestion.js';
import {
  isFichaPriteGestion,
  renderPriteGestionForm,
  preloadPriteFormState
} from '../../prite-gestion.js';
import {
  renderAreasYFirmantesView,
  renderPlantillasManagementView,
  startNewPlantillaBuilder
} from '../plantillas/index.js';
import {
  registrarSubTab,
  setRegistrarSubTab,
  getRegistrarSubTab,
  resetRegBuiltFor,
  syncEditingState,
  editingSubmissionId,
  editingSubmissionData,
  regSelectedTypeId,
  setRegSelectedTypeIdVal,
  regSelectedColegioId,
  setRegSelectedColegioIdVal,
  regCompromisos,
  currentJecVisita,
  setCurrentJecVisita,
  regBuiltFor,
  setRegBuiltFor,
  fichaListSearchQuery,
  setFichaListSearchQuery,
  fichaListFilterEscala,
  setFichaListFilterEscala,
  fichaListFilterModalidad,
  setFichaListFilterModalidad,
  fichaDescExpanded,
  getRegSelectedTypeIdVal,
  getRegSelectedColegioIdVal,
  getCurrentJecVisita,
  getRegCompromisos,
  setRegCompromisos,
  getFichaListSearchQuery,
  getFichaListFilterEscala,
  getFichaListFilterModalidad,
  getFichaDescExpanded
} from './state.js';
import {
  renderCompList,
  renderFichaPicker,
  syncCommonJecFields,
  renderUnifiedJecForm,
  renderDynamicForm
} from './form-render.js?v=20261106_v3';
import { onSubmitRegistro } from './save.js';
import {
  fileToBase64,
  applyExtractedData,
  extractFichaFromImage
} from './preload.js';

// Re-exportar API pública
export {
  registrarSubTab,
  setRegistrarSubTab,
  getRegistrarSubTab,
  resetRegBuiltFor,
  setRegBuiltFor,
  syncEditingState,
  renderCompList,
  onSubmitRegistro,
  fileToBase64,
  applyExtractedData,
  extractFichaFromImage,
  getRegSelectedTypeIdVal,
  setRegSelectedTypeIdVal,
  getRegSelectedColegioIdVal,
  setRegSelectedColegioIdVal,
  getCurrentJecVisita,
  setCurrentJecVisita,
  getRegCompromisos,
  setRegCompromisos,
  getFichaListSearchQuery,
  setFichaListSearchQuery,
  getFichaListFilterEscala,
  setFichaListFilterEscala,
  getFichaListFilterModalidad,
  setFichaListFilterModalidad,
  getFichaDescExpanded
};

/**
 * Construye el formulario de registro según el tipo de ficha seleccionado
 */
export function buildRegForm(state, getFichaType, dbNs, currentUser, navigate) {
  if (state) setAppState(state);
  const host = document.getElementById('regFormHost');
  if (!host) return;
  if (!regSelectedTypeId) { host.innerHTML = ''; return; }
  const ft = getFichaType(regSelectedTypeId);
  if (!ft) { host.innerHTML = ''; return; }

  // Reconstruir si no está construido o si el contenedor quedó vacío
  setRegBuiltFor(regSelectedTypeId);

  const targetVisita = (getRegTargetVisita ? Number(getRegTargetVisita()) : null) || (function() {
    try {
      const v = sessionStorage.getItem('reg_prefill_visita');
      return v ? Number(v) : null;
    } catch (_) { return null; }
  })();

  const targetColId = regSelectedColegioId || (getRegSelectedColegioId ? getRegSelectedColegioId() : null) || (function() {
    try { return sessionStorage.getItem('reg_prefill_colegioid'); } catch (_) { return null; }
  })();

  if (!editingSubmissionData) {
    regCompromisos.length = 0;
    setRegSelectedColegioIdVal(targetColId || null);
  }

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE"
  if (isFichaCebeGestion(ft)) {
    if (editingSubmissionData) {
      preloadCebeFormState(editingSubmissionData, ft);
    }
    renderCebeGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData, { visita: targetVisita, colegioId: targetColId });
    if (editingSubmissionData && editingSubmissionData.id) {
      const f = host.querySelector('#regForm');
      if (f) f.dataset.editingId = editingSubmissionData.id;
    }
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        if (e.defaultPrevented) return;
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - PRITE"
  if (isFichaPriteGestion(ft)) {
    if (editingSubmissionData) {
      preloadPriteFormState(editingSubmissionData, ft);
    }
    renderPriteGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData, { visita: targetVisita, colegioId: targetColId });
    if (editingSubmissionData && editingSubmissionData.id) {
      const f = host.querySelector('#regForm');
      if (f) f.dataset.editingId = editingSubmissionData.id;
    }
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        if (e.defaultPrevented) return;
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar — UGEL 03 EBR"
  if (isFichaEbrGestionEscolar(ft)) {
    if (editingSubmissionData) {
      preloadEbrFormState(editingSubmissionData, ft);
    }
    renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData, { visita: targetVisita, colegioId: targetColId });
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  // Interceptar Ficha Unificada "Monitoreo a la Implementación del Modelo JEC" (1er, 2do y 3er momento)
  if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
    renderUnifiedJecForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData, targetVisita, targetColId, editingSubmissionData);
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        if (e.defaultPrevented) return;
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  // Ficha Dinámica (Directivo, Rúbricas, Coordinador JEC, etc.)
  renderDynamicForm({
    host,
    ft,
    state,
    dbNs,
    currentUser,
    navigate,
    editingSubmissionData,
    editingSubmissionId,
    targetVisita,
    targetColId
  });
}

/**
 * Orquestador principal de la pestaña "Registrar Ficha"
 */
export function renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, isAdmin = false) {
  syncEditingState();
  if (state) setAppState(state);
  const actualIsAdmin = !!(isAdmin || (currentUser && currentUser.role === 'admin') || (state && state.roles && currentUser && state.roles.some(r => r.email === currentUser.email && r.role === 'admin')));

  // Si no es admin, no permitir acceso a plantillas ni a áreas
  if (!actualIsAdmin && registrarSubTab !== 'registrar') {
    setRegistrarSubTab('registrar');
  }

  // Si venimos en modo edición desde consolidado/reportes, preseleccionar la ficha y forzar subtab registrar
  if (editingSubmissionData && editingSubmissionData.fichaTypeId && !regSelectedTypeId) {
    setRegSelectedTypeIdVal(editingSubmissionData.fichaTypeId);
    if (isFichaJec(editingSubmissionData) && !isFichaCoordTutoriaJec(editingSubmissionData) && !isFichaCoordPedagogico(editingSubmissionData)) {
      setRegSelectedTypeIdVal('ft_msejec_2do');
      setCurrentJecVisita(getSubmissionVisitaNum(editingSubmissionData) || 2);
    }
    setRegistrarSubTab('registrar');
  } else if (!regSelectedTypeId) {
    try {
      const storedFt = sessionStorage.getItem('reg_prefill_ftid');
      if (storedFt) {
        setRegSelectedTypeIdVal(storedFt);
        setRegistrarSubTab('registrar');
      }
    } catch (_) {}
  }

  // Generador de navegación por subpestañas (solo visible si es Admin)
  const subNavHtml = actualIsAdmin ? `
    <nav class="regSubNav" id="registrarSubNav">
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'registrar' ? 'active' : ''}" data-reg-sub="registrar">
        📋 Registrar visita
      </button>
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'plantillas' ? 'active' : ''}" data-reg-sub="plantillas">
        📑 Plantillas de ficha <span class="adminBadge">Admin</span>
      </button>
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'areas' ? 'active' : ''}" data-reg-sub="areas">
        👥 Áreas y firmantes <span class="adminBadge">Admin</span>
      </button>
    </nav>
  ` : '';

  // 1. Subpestaña: ÁREAS Y FIRMANTES
  if (registrarSubTab === 'areas') {
    renderAreasYFirmantesView(container, state, dbNs, actualIsAdmin, currentUser, getFichaType, subNavHtml, navigate);
    return;
  }

  // 2. Subpestaña: PLANTILLAS DE FICHA
  if (registrarSubTab === 'plantillas') {
    renderPlantillasManagementView(container, state, getFichaType, dbNs, actualIsAdmin, currentUser, navigate, subNavHtml);
    return;
  }

  // 3. Subpestaña: REGISTRAR (Lista visual o Formulario si hay ficha elegida)
  if (regSelectedTypeId && !getFichaType(regSelectedTypeId)) {
    setRegSelectedTypeIdVal(null);
  }

  // CASO 3.A: Una ficha está seleccionada -> Mostrar encabezado activo + formulario
  if (regSelectedTypeId) {
    const ft = getFichaType(regSelectedTypeId);
    const color = getFichaColor(ft);
    const mod = getFichaModalidad(ft);
    const isJecImpl = isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft);
    const displayName = isJecImpl ? 'Monitoreo a la Implementación del Modelo JEC' : ft.nombre;
    const visitsBadge = (isJecImpl || ft.tieneVisitas)
      ? '<span class="fichaBadge fichaBadgeVisitas">📅 3 Visitas (Inicio, Proceso, Salida)</span>'
      : '';

    const editBanner = editingSubmissionId
      ? '<div class="banner" style="background:var(--accent-tint);border-color:var(--accent);color:#8A6410;margin-bottom:16px">✏️ Modo edición — estás corrigiendo una ficha ya registrada. Al guardar se actualizará en Firestore.</div>'
      : '';

    container.innerHTML = `
      <div class="pageHead">
        <h2>${editingSubmissionId ? 'Corregir ficha registrada' : 'Registrar ficha'}</h2>
        <p>${editingSubmissionId ? 'Modifica los datos y guarda para actualizar la ficha en la base de datos.' : 'Completa los datos de la visita de monitoreo según la ficha seleccionada.'}</p>
      </div>
      ${subNavHtml}
      <div class="fichaActiveHeaderBar" style="border-left-color:${color.hex};">
        <div class="fichaActiveInfo">
          <div class="fichaActiveIcon" style="background:${color.bg};color:${color.hex};">
            ${esc(ft.icono || '📋')}
          </div>
          <div class="fichaActiveDetails">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span class="fichaBadge fichaBadgeModalidad">${esc(mod)}</span>
              ${visitsBadge}
              <span class="fichaBadge fichaBadgeEscala">🏷️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              ${!isJecImpl ? `
                <span class="fichaBadge fichaBadgeItems">📑 ${(ft.secciones || []).length} secciones</span>
                <span class="fichaBadge fichaBadgeItems">📊 ${(ft.secciones || []).reduce((a, s) => a + (s.items || []).length, 0)} ítems</span>
              ` : `
                <span class="fichaBadge fichaBadgeItems">📑 1er (37 ítems), 2do y 3er Momento (31 ítems)</span>
              `}
            </div>
            <h3 style="margin:4px 0 0 0;font-family:var(--serif);font-size:16px;color:var(--navy-900)">${esc(displayName)}</h3>
          </div>
        </div>
        <button type="button" class="fichaActiveBackBtn" id="btnCambiarFicha" title="Regresar para elegir otra ficha">
          ← Cambiar ficha
        </button>
      </div>
      ${editBanner}
      <div id="regFormHost"></div>
    `;

    // Conectar subpestañas
    if (actualIsAdmin) {
      container.querySelectorAll('[data-reg-sub]').forEach(b => {
        b.onclick = () => {
          setRegistrarSubTab(b.dataset.regSub);
          renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
        };
      });
    }

    // Botón Cambiar Ficha
    const cambiarBtn = document.getElementById('btnCambiarFicha');
    if (cambiarBtn) {
      cambiarBtn.onclick = () => {
        setRegSelectedTypeIdVal(null);
        clearEditMode();
        setRegBuiltFor(null);
        renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      };
    }

    buildRegForm(state, getFichaType, dbNs, currentUser, navigate);
    return;
  }

  // CASO 3.B: Ninguna ficha seleccionada -> Mostrar Lista Visual de Fichas
  renderFichaPicker({
    container,
    state,
    getFichaType,
    dbNs,
    currentUser,
    navigate,
    actualIsAdmin,
    subNavHtml,
    onSelectFicha: (id) => {
      clearEditMode();
      setRegSelectedTypeIdVal(id);
      setRegBuiltFor(null);
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    onOpenPlantillas: () => {
      startNewPlantillaBuilder();
      setRegistrarSubTab('plantillas');
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    },
    onSubNavClick: (sub) => {
      setRegistrarSubTab(sub);
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    }
  });
}

