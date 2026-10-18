/* =========================================================================
   ui/registrar.js — Formulario dinámico de registro y edición de fichas
   ========================================================================= */

import {
  esc,
  genId,
  showToast,
  todayStr,
  fmtDate,
  seedSuggestions,
  cleanForFirestore,
  normalizeText,
  normalizeInstName,
  normalizeReiNumber,
  FICHA_PALETTE,
  getFichaColor,
  getFichaModalidad
} from './core-utils.js';
import {
  setAppState,
  getAppState,
  setEditMode,
  clearEditMode,
  getEditingSubmissionId,
  getEditingSubmissionData,
  getRegSelectedTypeId,
  setRegSelectedTypeId,
  getRegSelectedColegioId,
  setRegSelectedColegioId,
  getRegBuiltFor,
  setRegBuiltFor
} from './state.js';
import {
  RESPONSE_OPTIONS,
  RESPONSE_LABELS,
  OPTION_COLORS,
  DESCRIPTORES_NIVEL_1_4,
  scoreValue,
  statusFromPct,
  colorForPct,
  getSubmissionResponsable,
  getResponsableForColegio,
  computeStats
} from './scoring.js';
import {
  buildColegioIndex,
  matchColegio
} from './colegios-tab.js';
import {
  calcScore,
  isFichaJec1erMomento,
  isFichaEbrGestionEscolar,
  isFichaEbrEbePrite,
  getMomentoVisitaEbr,
  getSubmissionVisitaNum,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  REGLA_NIVEL_COORD_PEDAGOGICO,
  ESPECIALISTA_JEC_OFICIAL,
  getNivelCoordTutoriaJec,
  getNivelCoordPedagogicoJec
} from '../calcEngine.js';
import {
  renderEbrGestionForm,
  collectEbrGestionFormData,
  preloadEbrFormState,
  resetEbrFormState,
  getEbrSeccionesForVisita
} from '../ebr-gestion.js';
import {
  isFichaJec,
  renderJecForm,
  collectJecFormData,
  preloadJecFormState,
  resetJecFormState,
  jecFormState,
  JEC_SECCIONES
} from '../jec-monitoreo.js';
import {
  renderJec1erForm,
  collectJec1erFormData,
  preloadJec1erFormState,
  resetJec1erFormState,
  jec1erState
} from '../jec-1er-monitoreo.js';
import {
  isFichaCebeGestion,
  renderCebeGestionForm,
  preloadCebeFormState,
  resetCebeFormState,
  guardarFormularioCebe,
  CEBE_SECCIONES
} from '../cebe-gestion.js';
import {
  isFichaPriteGestion,
  renderPriteGestionForm,
  preloadPriteFormState,
  resetPriteFormState,
  guardarFormularioPrite,
  PRITE_SECCIONES
} from '../prite-gestion.js';
import {
  syncDirectivosFromFicha,
  getDirectivosActivosForColegio
} from '../directorio.js';
import { AI_SCAN_ENDPOINT } from '../firebase-config.js';
import { PLANTILLAS_BASE_OFICIALES } from '../catalogo-plantillas-base.js';
import { deduplicateTwinSubmissions } from './consolidado.js';
import {
  normalizeExtras,
  renderAreasYFirmantesView,
  renderPlantillasManagementView,
  startNewPlantillaBuilder
} from './plantillas.js';

let editingSubmissionId = null;
let editingSubmissionData = null;

function syncEditingState() {
  editingSubmissionId = getEditingSubmissionId();
  editingSubmissionData = getEditingSubmissionData();
  const stateSelected = getRegSelectedTypeId();
  if (stateSelected) {
    regSelectedTypeId = stateSelected;
  } else if (!editingSubmissionId) {
    regSelectedTypeId = null;
  }
  const stateCol = getRegSelectedColegioId();
  if (stateCol) {
    regSelectedColegioId = stateCol;
  }
}

let registrarSubTab = 'registrar'; // 'registrar' | 'plantillas' | 'areas'
export function setRegistrarSubTab(tab) {
  registrarSubTab = ['registrar', 'plantillas', 'areas'].includes(tab) ? tab : 'registrar';
}
export function getRegistrarSubTab() { return registrarSubTab; }

let regSelectedTypeId = null;
let regCompromisos = [];
let regBuiltFor = null;
let regSelectedColegioId = null;
let currentJecVisita = 1;

let fichaListSearchQuery = '';
let fichaListFilterEscala = '';
let fichaListFilterModalidad = '';
let fichaDescExpanded = {};

export function renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, isAdmin = false) {
  syncEditingState();
  if (state) setAppState(state);
  const actualIsAdmin = !!(isAdmin || (currentUser && currentUser.role === 'admin') || (state && state.roles && currentUser && state.roles.some(r => r.email === currentUser.email && r.role === 'admin')));

  // Si no es admin, no permitir acceso a plantillas ni a áreas
  if (!actualIsAdmin && registrarSubTab !== 'registrar') {
    registrarSubTab = 'registrar';
  }

  // Si venimos en modo edición desde consolidado/reportes, preseleccionar la ficha y forzar subtab registrar
  if (editingSubmissionData && editingSubmissionData.fichaTypeId && !regSelectedTypeId) {
    regSelectedTypeId = editingSubmissionData.fichaTypeId;
    if (isFichaJec(editingSubmissionData) && !isFichaCoordTutoriaJec(editingSubmissionData) && !isFichaCoordPedagogico(editingSubmissionData)) {
      regSelectedTypeId = 'ft_msejec_2do';
      currentJecVisita = getSubmissionVisitaNum(editingSubmissionData) || 2;
    }
    registrarSubTab = 'registrar';
  }

  // Generador de navegación por subpestañas (solo visible si es Admin)
  const subNavHtml = actualIsAdmin ? `
    <nav class="regSubNav" id="registrarSubNav">
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'registrar' ? 'active' : ''}" data-reg-sub="registrar">
        📋 Registrar visita
      </button>
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'plantillas' ? 'active' : ''}" data-reg-sub="plantillas">
        ⚙️ Plantillas de ficha <span class="adminBadge">Admin</span>
      </button>
      <button type="button" class="regSubNavBtn ${registrarSubTab === 'areas' ? 'active' : ''}" data-reg-sub="areas">
        ✍️ Áreas y firmantes <span class="adminBadge">Admin</span>
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
    regSelectedTypeId = null;
  }

  // CASO 3.A: Una ficha está seleccionada -> Mostrar encabezado activo + formulario
  if (regSelectedTypeId) {
    const ft = getFichaType(regSelectedTypeId);
    const color = getFichaColor(ft);
    const mod = getFichaModalidad(ft);
    const isJecImpl = isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft);
    const displayName = isJecImpl ? 'Monitoreo a la Implementación del Modelo JEC' : ft.nombre;
    const visitsBadge = (isJecImpl || ft.tieneVisitas)
      ? '<span class="fichaBadge fichaBadgeVisitas">🏛️ 3 Visitas (Inicio, Proceso, Salida)</span>'
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
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              ${!isJecImpl ? `
                <span class="fichaBadge fichaBadgeItems">📑 ${(ft.secciones || []).length} secciones</span>
                <span class="fichaBadge fichaBadgeItems">🔢 ${(ft.secciones || []).reduce((a, s) => a + (s.items || []).length, 0)} ítems</span>
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
          registrarSubTab = b.dataset.regSub;
          renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
        };
      });
    }

    // Botón Cambiar Ficha
    const cambiarBtn = document.getElementById('btnCambiarFicha');
    if (cambiarBtn) {
      cambiarBtn.onclick = () => {
        regSelectedTypeId = null;
        clearEditMode();
        renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      };
    }

    buildRegForm(state, getFichaType, dbNs, currentUser, navigate);
    return;
  }

  // CASO 3.B: Ninguna ficha seleccionada -> Mostrar Lista Visual de Fichas (reemplazo del select)
  const allTypes = state.fichaTypes || [];

  if (allTypes.length === 0) {
    container.innerHTML = `
      <div class="pageHead">
        <h2>Registrar ficha</h2>
        <p>Elige la ficha que vas a aplicar en tu visita de monitoreo.</p>
      </div>
      ${subNavHtml}
      <div class="empty">
        <h4>Aún no hay tipos de ficha disponibles</h4>
        <p>${actualIsAdmin ? 'Crea la primera plantilla de ficha para comenzar a registrar visitas.' : 'Aún no hay fichas disponibles, consulta con el administrador.'}</p>
        ${actualIsAdmin ? '<button type="button" class="btn" id="btnCreateFirstFicha" style="margin-top:12px">+ Crear primer tipo de ficha</button>' : ''}
      </div>
    `;

    if (actualIsAdmin) {
      container.querySelectorAll('[data-reg-sub]').forEach(b => {
        b.onclick = () => {
          registrarSubTab = b.dataset.regSub;
          renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
        };
      });
      const createFirst = document.getElementById('btnCreateFirstFicha');
      if (createFirst) {
        createFirst.onclick = () => {
          startNewPlantillaBuilder();
          registrarSubTab = 'plantillas';
          renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
        };
      }
    }
    return;
  }

  // Obtener todas las modalidades y escalas disponibles para los filtros rápidos
  const modalidadesSet = new Set();
  allTypes.forEach(ft => modalidadesSet.add(getFichaModalidad(ft)));
  const modalidadesList = Array.from(modalidadesSet).sort();

  const escalasSet = new Set();
  allTypes.forEach(ft => escalasSet.add(ft.tipoRespuesta));
  const escalasList = Array.from(escalasSet);

  // Filtrar según búsqueda y filtros activos (deduplicando tarjetas EBR y JEC para mostrar una sola ficha institucional con sus 3 visitas)
  let seenJecCard = false;
  let seenEbrCard = false;
  const filteredTypes = allTypes.filter(ft => {
    if (isFichaEbrGestionEscolar(ft)) {
      if (seenEbrCard) return false;
      seenEbrCard = true;
    }
    if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
      if (seenJecCard) return false;
      seenJecCard = true;
    }
    if (fichaListSearchQuery) {
      const q = normalizeText(fichaListSearchQuery);
      const name = normalizeText(ft.nombre || '');
      const desc = normalizeText(ft.descripcion || '');
      const mod = normalizeText(getFichaModalidad(ft) || '');
      if (!name.includes(q) && !desc.includes(q) && !mod.includes(q)) return false;
    }
    if (fichaListFilterEscala && ft.tipoRespuesta !== fichaListFilterEscala) return false;
    if (fichaListFilterModalidad && normalizeText(getFichaModalidad(ft)) !== normalizeText(fichaListFilterModalidad)) return false;
    return true;
  });

  const cardsHtml = filteredTypes.length === 0 ? `
    <div class="empty" style="padding:32px 20px">
      <h4>No se encontraron fichas de monitoreo</h4>
      <p>No hay fichas que coincidan con "${esc(fichaListSearchQuery || fichaListFilterEscala || fichaListFilterModalidad)}".</p>
      <button type="button" class="btn secondary small" id="btnClearFichaFilters" style="margin-top:8px">Restablecer filtros</button>
    </div>
  ` : filteredTypes.map((ft, idx) => {
    const color = getFichaColor(ft, idx);
    const mod = getFichaModalidad(ft);
    const isJecImpl = isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft);
    const isEbrImpl = isFichaEbrGestionEscolar(ft);
    const cardFtId = isEbrImpl ? 'ft_gestion_ugel03_ebr' : (isJecImpl ? 'ft_msejec_2do' : ft.id);
    const cardTitle = isEbrImpl
      ? 'Monitoreo y Asistencia Técnica a la Gestión Escolar - UGEL 03 EBR'
      : (isJecImpl ? 'Monitoreo a la Implementación del Modelo JEC' : ft.nombre);
    const count = isEbrImpl
      ? deduplicateTwinSubmissions((state.submissions || []).filter(s => isFichaEbrGestionEscolar(s))).length
      : (isJecImpl
        ? deduplicateTwinSubmissions((state.submissions || []).filter(s => isFichaJec(s) && !isFichaCoordTutoriaJec(s) && !isFichaCoordPedagogico(s))).length
        : deduplicateTwinSubmissions((state.submissions || []).filter(s => s.fichaTypeId === ft.id)).length);
    const templateForCard = isEbrImpl ? (PLANTILLAS_BASE_OFICIALES?.ft_gestion_ugel03_ebr || ft) : ft;
    const totalItems = (templateForCard.secciones || []).reduce((a, s) => a + (s.items || []).length, 0);
    const totalSecs = (templateForCard.secciones || []).length;
    const descText = (templateForCard.descripcion || ft.descripcion || '').trim();
    const isExpanded = !!fichaDescExpanded[cardFtId];
    const isLongDesc = descText.length > 140;
    const visitsBadge = (isEbrImpl || isJecImpl || ft.tieneVisitas)
      ? '<span class="fichaBadge fichaBadgeVisitas">🏛️ 3 Visitas (Inicio, Proceso, Salida)</span>'
      : '';

    let displayDesc = descText || 'Ficha oficial de monitoreo y acompañamiento institucional.';
    if (isLongDesc && !isExpanded) {
      displayDesc = descText.slice(0, 130) + '…';
    }

    return `
      <div class="fichaCard" data-select-card="${esc(cardFtId)}" tabindex="0" role="button" aria-label="Registrar visita para ${esc(cardTitle)}">
        <div class="fichaCardColorStripe" style="background:${color.hex};"></div>
        <div class="fichaCardMain">
          <div class="fichaCardIconWrap" style="background:${color.bg};color:${color.hex};">
            ${esc(ft.icono || '📋')}
          </div>
          <div class="fichaCardContent">
            <h3 class="fichaCardTitle">${esc(cardTitle)}</h3>
            <p class="fichaCardDesc">
              ${esc(displayDesc)}
              ${isLongDesc ? `<span class="fichaCardDescMore" data-toggle-desc="${esc(cardFtId)}">${isExpanded ? 'ver menos' : 'ver más'}</span>` : ''}
            </p>
            <div class="fichaCardBadges">
              <span class="fichaBadge fichaBadgeModalidad">${esc(mod)}</span>
              ${visitsBadge}
              ${!isJecImpl ? `
                <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
                <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
                <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              ` : `
                <span class="fichaBadge fichaBadgeItems">📑 1er (37 ítems), 2do y 3er Momento (31 ítems)</span>
              `}
              <span class="fichaBadge fichaBadgeCount">📊 ${count} ${count === 1 ? 'ficha registrada' : 'fichas registradas'}</span>
            </div>
          </div>
        </div>
        <div class="fichaCardActs">
          <button type="button" class="btnRegistrarFichaAction" data-select-btn="${esc(cardFtId)}">
            Registrar ficha →
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pageHead">
      <h2>Registrar ficha</h2>
      <p>Elige la ficha que vas a aplicar en tu visita de monitoreo.</p>
    </div>
    ${subNavHtml}
    <div class="fichaFilterBar">
      <div class="fichaSearchWrap">
        <span class="fichaSearchIcon">🔍</span>
        <input type="text" class="fichaSearchInput" id="fichaSearchInp" placeholder="Buscar por nombre, palabras clave, modalidad..." value="${esc(fichaListSearchQuery)}">
      </div>
      <select class="fichaFilterSelect" id="fichaFilterModalidad">
        <option value="">Todas las modalidades</option>
        ${modalidadesList.map(m => `<option value="${esc(m)}" ${fichaListFilterModalidad === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
      </select>
      <select class="fichaFilterSelect" id="fichaFilterEscala">
        <option value="">Todas las escalas</option>
        ${escalasList.map(k => `<option value="${esc(k)}" ${fichaListFilterEscala === k ? 'selected' : ''}>${esc(RESPONSE_LABELS[k] || k)}</option>`).join('')}
      </select>
      ${(fichaListSearchQuery || fichaListFilterEscala || fichaListFilterModalidad) ? `
        <button type="button" class="fichaClearFiltersBtn" id="btnClearFilters">✕ Limpiar filtros</button>
      ` : ''}
    </div>
    <div class="fichaCardsList">
      ${cardsHtml}
    </div>
  `;

  // Conectar subpestañas
  if (actualIsAdmin) {
    container.querySelectorAll('[data-reg-sub]').forEach(b => {
      b.onclick = () => {
        registrarSubTab = b.dataset.regSub;
        renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      };
    });
  }

  // Conectar buscador
  const searchInp = document.getElementById('fichaSearchInp');
  if (searchInp) {
    searchInp.oninput = (e) => {
      fichaListSearchQuery = e.target.value;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
      const newInp = document.getElementById('fichaSearchInp');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
      }
    };
  }

  // Conectar filtros de select
  const selMod = document.getElementById('fichaFilterModalidad');
  if (selMod) {
    selMod.onchange = (e) => {
      fichaListFilterModalidad = e.target.value;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  }
  const selEsc = document.getElementById('fichaFilterEscala');
  if (selEsc) {
    selEsc.onchange = (e) => {
      fichaListFilterEscala = e.target.value;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  }

  const clearBtn = document.getElementById('btnClearFilters') || document.getElementById('btnClearFichaFilters');
  if (clearBtn) {
    clearBtn.onclick = () => {
      fichaListSearchQuery = '';
      fichaListFilterEscala = '';
      fichaListFilterModalidad = '';
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  }

  // Toggle "ver más" de descripciones
  container.querySelectorAll('[data-toggle-desc]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.toggleDesc;
      fichaDescExpanded[id] = !fichaDescExpanded[id];
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    };
  });

  // Selección de ficha para registrar
  const selectFicha = (id) => {
    clearEditMode();
    regSelectedTypeId = id;
    setRegSelectedTypeId(id);
    regBuiltFor = null;
    setRegBuiltFor(null);
    renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  container.querySelectorAll('[data-select-card]').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('[data-toggle-desc]')) return;
      selectFicha(card.dataset.selectCard);
    };
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectFicha(card.dataset.selectCard);
      }
    };
  });

  container.querySelectorAll('[data-select-btn]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      selectFicha(btn.dataset.selectBtn);
    };
  });
}

/**
 * Sincroniza campos comunes de la IE y del equipo directivo entre estados de JEC (Momento 1 vs Momentos 2/3)
 */
function syncCommonJecFields(host, fromVisita, toVisita) {
  if (!host) return;
  const instEl = host.querySelector('#f_institucion') || host.querySelector('#jec1_institucion');
  const instVal = instEl ? instEl.value.trim() : '';
  const colModularEl = host.querySelector('#f_codigo') || host.querySelector('#jec1_codmodular');
  const codModularVal = colModularEl ? colModularEl.value.trim() : '';
  const redEl = host.querySelector('#f_red') || host.querySelector('#jec1_red');
  const redVal = redEl ? redEl.value.trim() : '';
  const ugelEl = host.querySelector('#f_ugel') || host.querySelector('#jec1_ugel');
  const ugelVal = ugelEl ? ugelEl.value.trim() : 'UGEL 03';
  const fechaEl = host.querySelector('#f_fecha') || host.querySelector('#jec1_fecha');
  const fechaVal = fechaEl ? fechaEl.value : todayStr();

  const dirNomEl = host.querySelector('#f_director') || host.querySelector('#jec1_dir_nombre');
  const dirNomVal = dirNomEl ? dirNomEl.value.trim() : '';
  const dirDniEl = host.querySelector('#f_director_dni') || host.querySelector('#jec1_dir_dni');
  const dirDniVal = dirDniEl ? dirDniEl.value.trim() : '';
  const dirTelEl = host.querySelector('#f_director_tel') || host.querySelector('#jec1_dir_tel');
  const dirTelVal = dirTelEl ? dirTelEl.value.trim() : '';
  const dirCondEl = host.querySelector('#f_director_cond') || host.querySelector('#jec1_dir_cond');
  const dirCondVal = dirCondEl ? dirCondEl.value : 'D';
  const dirMailEl = host.querySelector('#f_director_correo') || host.querySelector('#jec1_dir_correo');
  const dirMailVal = dirMailEl ? dirMailEl.value.trim() : '';

  const secEl = host.querySelector('#extra_secciones') || host.querySelector('#jec1_secciones');
  const secVal = secEl ? secEl.value.trim() : '';
  const estEl = host.querySelector('#extra_estudiantes') || host.querySelector('#jec1_estudiantes');
  const estVal = estEl ? estEl.value.trim() : '';
  const docEl = host.querySelector('#extra_docentes') || host.querySelector('#jec1_docentes');
  const docVal = docEl ? docEl.value.trim() : '';

  if (fromVisita === 1) {
    jecFormState.institucion = instVal || jec1erState.colegioNombre || jec1erState.institucion || '';
    jecFormState.colegioId = jec1erState.colegioId || '';
    jecFormState.codigoModular = codModularVal || jec1erState.codModular || '';
    jecFormState.red = redVal || jec1erState.red || '';
    jecFormState.rei = redVal || jec1erState.red || '';
    jecFormState.ugel = ugelVal || jec1erState.ugel || 'UGEL 03';
    jecFormState.fecha = fechaVal || jec1erState.fecha || todayStr();
    jecFormState.director.nombres = dirNomVal || jec1erState.director.nombres || '';
    jecFormState.director.dni = dirDniVal || jec1erState.director.dni || '';
    jecFormState.director.telefono = dirTelVal || jec1erState.director.telefono || '';
    jecFormState.director.condicion = dirCondVal || jec1erState.director.condicion || 'D';
    jecFormState.director.correo = dirMailVal || jec1erState.director.correo || '';
    jecFormState.secciones = secVal || jec1erState.secciones || '';
    jecFormState.estudiantes = estVal || jec1erState.estudiantes || '';
    jecFormState.docentesTotal = docVal || jec1erState.docentes || '';
    jecFormState.formacionTecnica = (jec1erState.secundariaTecnica === 'SI');
  } else {
    jec1erState.colegioNombre = instVal || jecFormState.institucion || '';
    jec1erState.colegioId = jecFormState.colegioId || null;
    jec1erState.codModular = codModularVal || jecFormState.codigoModular || '';
    jec1erState.red = redVal || jecFormState.rei || jecFormState.red || '';
    jec1erState.ugel = ugelVal || jecFormState.ugel || 'UGEL 03';
    jec1erState.fecha = fechaVal || jecFormState.fecha || todayStr();
    jec1erState.director.nombres = dirNomVal || jecFormState.director.nombres || '';
    jec1erState.director.dni = dirDniVal || jecFormState.director.dni || '';
    jec1erState.director.telefono = dirTelVal || jecFormState.director.telefono || '';
    jec1erState.director.condicion = dirCondVal || jecFormState.director.condicion || 'DESIGNADO';
    jec1erState.director.correo = dirMailVal || jecFormState.director.correo || '';
    jec1erState.secciones = secVal || jecFormState.secciones || '';
    jec1erState.estudiantes = estVal || jecFormState.estudiantes || '';
    jec1erState.docentes = docVal || jecFormState.docentesTotal || '';
    jec1erState.secundariaTecnica = jecFormState.formacionTecnica ? 'SI' : 'NO';
  }
}

/**
 * Renderiza el formulario unificado de Modelo JEC (Permite alternar interactivamente entre 1er, 2do y 3er Monitoreo)
 */
function renderUnifiedJecForm(host, ft, state, dbNs, currentUser, navigate, isEditing, targetVisita = null) {
  if (targetVisita) {
    currentJecVisita = Number(targetVisita);
  } else if (editingSubmissionData) {
    currentJecVisita = getSubmissionVisitaNum(editingSubmissionData, ft) || 2;
  } else if (!currentJecVisita) {
    currentJecVisita = 1;
  }

  if (editingSubmissionData) {
    if (currentJecVisita === 1) {
      preloadJec1erFormState(editingSubmissionData, ft);
    } else {
      preloadJecFormState(editingSubmissionData, ft);
    }
  }

  if (currentJecVisita === 1) {
    renderJec1erForm(host, ft, state, dbNs, currentUser, navigate, isEditing);
  } else {
    renderJecForm(host, ft, state, dbNs, currentUser, navigate, isEditing, currentJecVisita);
  }

  // Interceptar clics en los botones de selección de momento (Visita 1, 2 y 3)
  host.querySelectorAll('[data-jec-visita]').forEach(card => {
    card.onclick = (e) => {
      e.preventDefault();
      const newVis = Number(card.dataset.jecVisita);
      if (currentJecVisita === newVis) return;
      syncCommonJecFields(host, currentJecVisita, newVis);
      currentJecVisita = newVis;
      const scrollY = window.scrollY;
      renderUnifiedJecForm(host, ft, state, dbNs, currentUser, navigate, isEditing, newVis);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  });

  if (editingSubmissionData && editingSubmissionData.id) {
    const f = host.querySelector('#regForm');
    if (f) f.dataset.editingId = editingSubmissionData.id;
  }
}

function buildRegForm(state, getFichaType, dbNs, currentUser, navigate) {
  if (state) setAppState(state);
  const host = document.getElementById('regFormHost');
  if (!host) return;
  if (!regSelectedTypeId) { host.innerHTML = ''; return; }
  const ft = getFichaType(regSelectedTypeId);
  if (!ft) { host.innerHTML = ''; return; }

  // Reconstruir si no está construido o si el contenedor quedó vacío
  if (regBuiltFor === regSelectedTypeId && !editingSubmissionData && host.querySelector('#regForm')) return;
  regBuiltFor = regSelectedTypeId;
  if (!editingSubmissionData) {
    regCompromisos = [];
    regSelectedColegioId = null;
  }

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE"
  if (isFichaCebeGestion(ft)) {
    if (editingSubmissionData) {
      preloadCebeFormState(editingSubmissionData, ft);
    }
    renderCebeGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
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
    renderPriteGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
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

  // Interceptar Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
  if (isFichaEbrGestionEscolar(ft)) {
    if (editingSubmissionData) {
      preloadEbrFormState(editingSubmissionData, ft);
    }
    renderEbrGestionForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  // Interceptar Ficha Unificada "Monitoreo a la Implementación del Modelo JEC" (1er, 2do y 3er momento)
  if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
    renderUnifiedJecForm(host, ft, state, dbNs, currentUser, navigate, !!editingSubmissionData);
    host.onsubmit = async (e) => {
      if (e.target && e.target.id === 'regForm') {
        if (e.defaultPrevented) return;
        await onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate);
      }
    };
    return;
  }

  const isDirectivo = (ft.tipoRespuesta === 'nivel_1_4') || (ft.id === 'ft_directivo') || (ft.nombre || '').toLowerCase().includes('directivo');
  const normExtras = normalizeExtras(ft.extras);

  const extrasHtml = normExtras.map((ex, i) => {
    const reqAttr = ex.required ? ' required' : '';
    const lower = (ex.label || '').toLowerCase();
    const dListAttr = lower.includes('ugel') ? ' list="dl_ugel"' : ((lower.includes('red') || lower.includes('rei')) ? ' list="dl_red"' : '');
    const inputId = 'extra_inp_' + ex.id;

    if (ex.tipo === 'numero') {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="number" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="0"' + reqAttr + '>' +
        '</div>';
    }

    if (ex.tipo === 'fecha') {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="date" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '"' + reqAttr + '>' +
        '</div>';
    }

    if (ex.tipo === 'si_no') {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px">' +
        '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '" value="Sí"' + reqAttr + '><span>Sí</span></label>' +
        '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '" value="No"><span>No</span></label>' +
        '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '" value="N/A"><span>N/A</span></label>' +
        '</div>' +
        '</div>';
    }

    if (lower.includes('condici')) {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<select id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '"' + reqAttr + '>' +
        '<option value="">— Seleccionar condición —</option>' +
        '<option value="Designado">Designado</option>' +
        '<option value="Encargado">Encargado</option>' +
        '<option value="Nombrado">Nombrado</option>' +
        '<option value="Otro">Otro (especificar)</option>' +
        '</select>' +
        '<input type="text" id="' + inputId + '_otro" placeholder="Especificar condición..." style="display:none;margin-top:6px">' +
        '</div>';
    }

    if (lower.includes('nivel') && (lower.includes('atiende') || lower.includes('educativo'))) {
      return '<div class="field" style="grid-column:span 2">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px" id="' + inputId + '_grp">' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Inicial"><span>Inicial</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Primaria"><span>Primaria</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Secundaria"><span>Secundaria</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="EBE"><span>EBE</span></label>' +
        '<input type="hidden" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" value="">' +
        '</div>' +
        '</div>';
    }

    if (lower.includes('turno') && lower.includes('atenci')) {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px" id="' + inputId + '_grp">' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Mañana"><span>Mañana</span></label>' +
        '<label class="optBtn"><input type="checkbox" name="extra_' + esc(ex.id) + '_chk" value="Tarde"><span>Tarde</span></label>' +
        '<input type="hidden" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" value="">' +
        '</div>' +
        '</div>';
    }

    if (lower.includes('turno') && lower.includes('visit')) {
      return '<div class="field">' +
        '<label>' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="optGroup" style="padding-top:4px" id="' + inputId + '_grp">' +
        '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '_rad" value="Mañana"><span>Mañana</span></label>' +
        '<label class="optBtn"><input type="radio" name="extra_' + esc(ex.id) + '_rad" value="Tarde"><span>Tarde</span></label>' +
        '<input type="hidden" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" value="">' +
        '</div>' +
        '</div>';
    }

    if (lower.includes('hora')) {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="time" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '"' + reqAttr + '>' +
        '</div>';
    }

    if (lower.includes('dni')) {
      return '<div class="field">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<input type="text" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" maxlength="8" pattern="[0-9]{8}" placeholder="8 dígitos"' + reqAttr + '>' +
        '</div>';
    }

    const isResp = lower.includes('responsable') || lower.includes('especialista') || lower.includes('monitor');
    if (isResp) {
      return '<div class="field" style="position:relative">' +
        '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
        '<div class="ieSearchWrap">' +
        '<input type="text" id="' + inputId + '" name="extra_' + esc(ex.id) + '" class="respAutocompleteInp" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="Buscar especialista por nombre, cargo o RED..." autocomplete="off"' + reqAttr + '>' +
        '<div class="ieDropdown respDropdown"></div>' +
        '</div>' +
        '<span class="respHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px"></span>' +
        '</div>';
    }

    return '<div class="field">' +
      '<label for="' + inputId + '">' + esc(ex.label) + (ex.required ? ' <span style="color:var(--danger)">*</span>' : '') + '</label>' +
      '<input type="text" id="' + inputId + '" name="extra_' + esc(ex.id) + '" data-extra-id="' + esc(ex.id) + '" data-extra-idx="' + i + '" placeholder="' + esc(ex.label) + '"' + dListAttr + reqAttr + '>' +
      '</div>';
  }).join('');

  // Rubrica panel plegable para tipo nivel_1_4
  const rubricaPanelHtml = (ft.tipoRespuesta === 'nivel_1_4') ? `
    <details class="rubricaDescriptivaPanel" open>
      <summary>
        <span>📋 Niveles descriptivos de la escala de valoración (Rúbrica oficial I–IV)</span>
        <span style="font-size:11px;color:var(--text-600);font-weight:normal">(clic para plegar / desplegar)</span>
      </summary>
      <div class="rubricaGrid">
        <div class="rubricaCard rubricaCardIV">
          <div class="rubricaCardHeader" style="color:var(--ok)"><span>NIVEL IV</span> <span>100%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['4'].descripcion)}</div>
        </div>
        <div class="rubricaCard rubricaCardIII">
          <div class="rubricaCardHeader" style="color:#059669"><span>NIVEL III</span> <span>75%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['3'].descripcion)}</div>
        </div>
        <div class="rubricaCard rubricaCardII">
          <div class="rubricaCardHeader" style="color:var(--warn)"><span>NIVEL II</span> <span>50%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['2'].descripcion)}</div>
        </div>
        <div class="rubricaCard rubricaCardI">
          <div class="rubricaCardHeader" style="color:var(--danger)"><span>NIVEL I</span> <span>25%</span></div>
          <div class="rubricaCardDesc">${esc(DESCRIPTORES_NIVEL_1_4['1'].descripcion)}</div>
        </div>
      </div>
    </details>
  ` : '';

  const isCoordTutoria = isFichaCoordTutoriaJec(ft);
  const isCoordPedagogico = isFichaCoordPedagogico(ft);

  const tutoriaNivelBannerHtml = isCoordTutoria ? `
    <div class="panel" id="tutoriaReglasPanel" style="margin-bottom:18px;border-left:4px solid var(--primary,#2563eb);background:var(--surface-card,#ffffff);border-radius:8px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <div style="font-weight:700;font-size:13px;color:var(--text-main,#0f172a);text-transform:uppercase;letter-spacing:0.5px">
          📋 NIVEL DE CUMPLIMIENTO — COORDINADOR(A) DE TUTORÍA (JEC)
        </div>
        <span id="tutoriaScoreSummaryBadge" class="badge st-none" style="font-size:13px;padding:5px 14px;font-weight:700">0 / 63 puntos (Sin calificar)</span>
      </div>
      <p class="helpText" style="margin-top:0;margin-bottom:12px;font-size:12.5px;color:var(--text-600,#475569)">
        El nivel de cumplimiento se determina sumando la calificación obtenida en los <strong>21 indicadores</strong> (escala de 1 a 3; puntaje mínimo 21, máximo 63). Conforme responda cada indicador, el sistema calculará en tiempo real el puntaje acumulado y resaltará el nivel correspondiente:
      </p>
      <div class="tblWrap">
        <table class="dataTable" style="width:100%;font-size:12px;text-align:left;border-collapse:collapse">
          <thead>
            <tr style="background:var(--surface-sunken,#f1f5f9)">
              <th style="width:25%;padding:8px 10px;font-weight:700">Nivel de cumplimiento</th>
              <th style="width:20%;padding:8px 10px;font-weight:700;text-align:center">Puntaje</th>
              <th style="width:55%;padding:8px 10px;font-weight:700">Descripción oficial</th>
            </tr>
          </thead>
          <tbody>
            <tr id="tutoriaRowCumple" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#16A34A"><span class="badge st-logrado">Cumple</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 53 a 63</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.</td>
            </tr>
            <tr id="tutoriaRowParcial" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#D97706"><span class="badge st-proceso">Cumple parcialmente</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 42 a 52</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.</td>
            </tr>
            <tr id="tutoriaRowNoCumple" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#DC2626"><span class="badge st-inicio">No cumple</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 21 a 41</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ` : (isCoordPedagogico ? `
    <div class="panel" id="pedagogicoReglasPanel" style="margin-bottom:18px;border-left:4px solid var(--primary,#2563eb);background:var(--surface-card,#ffffff);border-radius:8px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.06)">
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
        <div style="font-weight:700;font-size:13px;color:var(--text-main,#0f172a);text-transform:uppercase;letter-spacing:0.5px">
          📋 NIVEL DE CUMPLIMIENTO — COORDINADOR(A) PEDAGÓGICO (JEC)
        </div>
        <span id="pedagogicoScoreSummaryBadge" class="badge st-none" style="font-size:13px;padding:5px 14px;font-weight:700">0 / 51 puntos (Sin calificar)</span>
      </div>
      <p class="helpText" style="margin-top:0;margin-bottom:12px;font-size:12.5px;color:var(--text-600,#475569)">
        El nivel de cumplimiento se determina sumando la calificación obtenida en los <strong>17 indicadores</strong> (escala de 1 a 3; puntaje mínimo 17, máximo 51). Conforme responda cada indicador, el sistema calculará en tiempo real el puntaje acumulado y resaltará el nivel correspondiente:
      </p>
      <div class="tblWrap">
        <table class="dataTable" style="width:100%;font-size:12px;text-align:left;border-collapse:collapse">
          <thead>
            <tr style="background:var(--surface-sunken,#f1f5f9)">
              <th style="width:25%;padding:8px 10px;font-weight:700">Nivel de cumplimiento</th>
              <th style="width:20%;padding:8px 10px;font-weight:700;text-align:center">Puntaje</th>
              <th style="width:55%;padding:8px 10px;font-weight:700">Descripción oficial</th>
            </tr>
          </thead>
          <tbody>
            <tr id="pedagRowCumple" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#16A34A"><span class="badge st-logrado">Cumple</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 41 a 51</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) pedagógico cumple con la función de manera oportuna, pertinente y sostenida.</td>
            </tr>
            <tr id="pedagRowParcial" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#D97706"><span class="badge st-proceso">Cumple parcialmente</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 28 a 40</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) pedagógico cumple parcialmente con la función o se encuentra en proceso de consolidación.</td>
            </tr>
            <tr id="pedagRowNoCumple" style="transition:all 0.25s ease">
              <td style="padding:8px 10px;font-weight:700;color:#DC2626"><span class="badge st-inicio">No cumple</span></td>
              <td style="padding:8px 10px;text-align:center;font-weight:700">De 17 a 27</td>
              <td style="padding:8px 10px;color:var(--text-800)">El/la coordinador(a) pedagógico no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ` : '');

  const activeOptions = ft.tipoRespuesta === 'nivel_1_4'
    ? (RESPONSE_OPTIONS.nivel_1_4 || []).filter(o => o.v !== 'na')
    : RESPONSE_OPTIONS[ft.tipoRespuesta];

  const seccionesHtml = ft.secciones.map((sec, sIdx) => {
    const items = sec.items.map((it, iIdx) => {
      const optsHtml = activeOptions.map(o => {
        const descTooltip = (ft.tipoRespuesta === 'nivel_1_4' && DESCRIPTORES_NIVEL_1_4[o.v])
          ? `title="Nivel ${o.l}: ${esc(DESCRIPTORES_NIVEL_1_4[o.v].descripcion)}"`
          : '';
        return '<label class="optBtn" ' + descTooltip + '><input type="radio" name="item_' + it.id + '" value="' + o.v + '"><span>' + o.l + '</span></label>';
      }).join('');

      const evidenciaHtml = isDirectivo ? (
        '<div class="itemEvidencia">' +
        '<input type="text" class="evidenciaInput" name="evidencia_' + it.id + '" id="evid_' + it.id + '" placeholder="Evidencia verificable (RD, actas, planificaciones, fotos, registros, enlaces)..." aria-label="Evidencia para indicador ' + (iIdx + 1) + '">' +
        '</div>'
      ) : '';

      const itemNumDisplay = (it.num !== undefined && it.num !== null && it.num !== '') ? (it.num + '.') : ((iIdx + 1) + '.');
      return '<div class="itemRow" data-item-id="' + it.id + '">' +
        '<div class="itxt"><span class="itemNum">' + itemNumDisplay + '</span> ' + esc(it.texto) + evidenciaHtml + '</div>' +
        '<div class="optGroup">' + optsHtml + '</div>' +
        '</div>';
    }).join('');

    const secBadgeDisplay = sec.num ? esc(sec.num) : ('Sección ' + (sIdx + 1));
    return '<div class="formSecCard">' +
      '<div class="formSecHeader">' +
      '<span class="formSecBadge">' + secBadgeDisplay + '</span>' +
      '<h4 class="formSecTitle">' + esc(sec.nombre) + '</h4>' +
      '<span class="formSecCount">' + sec.items.length + ' indicadores</span>' +
      '</div>' +
      '<div class="formSecBody">' + items + '</div>' +
      '</div>';
  }).join('');

  // Síntesis por dimensión para ficha directivo
  const sintesisDimensions = [
    'A. DIMENSIÓN ESTRATÉGICA',
    'B. DIMENSIÓN PEDAGÓGICA: ESTRATEGIAS PRIORIZADAS',
    'C. PLANIFICACIÓN CURRICULAR',
    'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA',
    'E. FORTALECIMIENTO DE LAS COMPETENCIAS DOCENTES',
    'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES'
  ];

  const sintesisRowsHtml = sintesisDimensions.map((dim, dIdx) => `
    <tr>
      <td class="dimCol"><strong>${esc(dim)}</strong></td>
      <td><textarea name="sintesis_${dIdx}_logros" placeholder="Logros observados..." aria-label="Logros ${esc(dim)}"></textarea></td>
      <td><textarea name="sintesis_${dIdx}_dificultades" placeholder="Dificultades encontradas..." aria-label="Dificultades ${esc(dim)}"></textarea></td>
      <td><textarea name="sintesis_${dIdx}_recomendaciones" placeholder="Recomendaciones / Asistencia técnica..." aria-label="Recomendaciones ${esc(dim)}"></textarea></td>
    </tr>
  `).join('');

  const sintesisPanelHtml = isDirectivo ? `
    <div class="panel">
      <div class="sectionHeaderTitle">SÍNTESIS POR DIMENSIÓN</div>
      <p class="helpText" style="margin-top:0">Consigne los principales logros, dificultades encontradas y recomendaciones de asistencia técnica para cada dimensión evaluada.</p>
      <div class="tblWrap">
        <table class="sintesisTable">
          <thead>
            <tr>
              <th style="width:25%">Dimensiones</th>
              <th style="width:25%">Logros</th>
              <th style="width:25%">Dificultades</th>
              <th style="width:25%">Recomendaciones</th>
            </tr>
          </thead>
          <tbody>
            ${sintesisRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  ` : '';

  const directivoCompromisosHtml = isDirectivo ? `
    <div class="panel">
      <div class="sectionHeaderTitle">COMPROMISOS ASUMIDOS</div>
      <div class="field" style="margin-bottom:14px">
        <label for="f_comp_director"><strong>DEL DIRECTOR(A) DE LA IE:</strong></label>
        <textarea id="f_comp_director" placeholder="Compromisos y acciones que asume la dirección escolar..." style="min-height:75px"></textarea>
      </div>
      <div class="field" style="margin-bottom:14px">
        <label for="f_comp_monitor"><strong>DEL MONITOR / ESPECIALISTA:</strong></label>
        <textarea id="f_comp_monitor" placeholder="Compromisos de asistencia técnica, acompañamiento y soporte..." style="min-height:75px"></textarea>
      </div>
      <div class="sectionTitle" style="margin-top:16px">Compromisos específicos adicionales</div>
      <div class="sectionTitle" style="margin-top:16px">Compromisos pendientes anteriores</div>
      <div id="prevCompList"></div>
      <div id="compList"></div>
      <button type="button" class="btn secondary small" id="addCompBtn" style="margin-top:10px">+ Agregar compromiso adicional</button>
    </div>
  ` : `
    <div class="panel">
      <div class="sectionHeaderTitle">COMPROMISOS DE MEJORA</div>
      <div class="sectionTitle" style="margin-top:0">Compromisos pendientes anteriores</div>
      <div id="prevCompList"></div>
      <div class="sectionTitle" style="margin-top:16px">Nuevos compromisos</div>
      <div id="compList"></div>
      <button type="button" class="btn secondary small" id="addCompBtn" style="margin-top:10px">+ Agregar compromiso</button>
    </div>
  `;

  // Campos de horas dedicados para la visita
  const horasVisitaHtml = isDirectivo ? `
    <div class="field"><label for="f_hora_inicio">Hora de inicio</label><input type="time" id="f_hora_inicio" value="08:00"></div>
    <div class="field"><label for="f_hora_termino">Hora de término</label><input type="time" id="f_hora_termino" value="13:00"></div>
  ` : '';

  const totalItemsCount = ft.secciones.reduce((acc, s) => acc + s.items.length, 0);
  const uploadPanel = AI_SCAN_ENDPOINT ? (
    '<div class="panel" id="uploadPanel">' +
    '<h3>Cargar ficha escaneada <small>lectura automática con IA — opcional</small></h3>' +
    '<input type="file" id="scanInput" accept="image/jpeg,image/png,image/webp" style="display:none">' +
    '<button type="button" class="btn secondary" id="scanBtn">📷 Elegir imagen y leer ficha</button>' +
    '<span id="scanStatus" class="helpText" style="display:inline;margin-left:10px;"></span>' +
    '</div>'
  ) : '';

  const submitLabel = editingSubmissionId ? 'Actualizar ficha' : 'Guardar ficha';

  host.innerHTML = '' +
    '<form id="regForm" autocomplete="off">' +
    uploadPanel +
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">DATOS DE LA VISITA</div>' +
    '<div class="fieldGrid">' +
    '<div class="field" style="grid-column:span 2">' +
    '<label for="f_institucion">Institución educativa / CEBE / PRITE *</label>' +
    '<div class="ieSearchWrap" id="ieSearchWrap">' +
    '<input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar por nombre o código modular..." required>' +
    '<div class="ieDropdown" id="ieDropdown"></div>' +
    '</div>' +
    '<span id="regColegioHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px;display:block"></span>' +
    '</div>' +
    '<div class="field"><label for="f_fecha">Fecha *</label><input type="date" id="f_fecha" value="' + todayStr() + '" required></div>' +
    '<div class="field"><label for="f_visita">N° de visita *</label><input type="number" id="f_visita" min="1" value="1" required></div>' +
    horasVisitaHtml +
    '</div>' +
    (extrasHtml ? '<div class="sectionHeaderTitle" style="margin-top:20px">DATOS GENERALES DE LA FICHA</div><div class="fieldGrid">' + extrasHtml + '</div>' : '') +
    '<datalist id="dl_ugel">' + seedSuggestions('ugel', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
    '<datalist id="dl_red">' + seedSuggestions('red', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">ASPECTOS A MONITOREAR <small style="font-weight:400;color:var(--text-600);text-transform:none;margin-left:8px">' + RESPONSE_LABELS[ft.tipoRespuesta] + '</small></div>' +
    rubricaPanelHtml +
    tutoriaNivelBannerHtml +
    seccionesHtml +
    '</div>' +
    sintesisPanelHtml +
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">OBSERVACIONES GENERALES</div>' +
    '<textarea id="f_observaciones" placeholder="Hallazgos, evidencias verificables, notas de la visita..."></textarea>' +
    '</div>' +
    directivoCompromisosHtml +
    '<div class="formBottomBar">' +
    '<div class="regProgressBadge" id="regProgressBadge">Avance: <strong>0 de ' + totalItemsCount + '</strong> ítems (0%)</div>' +
    '<button type="button" class="btn secondary" id="cancelFormBtn">Cancelar</button>' +
    '<button type="submit" class="btn" id="saveFormBtn">' + submitLabel + '</button>' +
    '</div>' +
    '</form>';

  // ---- Actualizador dinámico de avance ----
  const updateProgressBadge = () => {
    const badge = document.getElementById('regProgressBadge');
    const checked = host.querySelectorAll('input[name^="item_"]:checked').length;
    const pct = totalItemsCount ? Math.round((checked / totalItemsCount) * 100) : 0;
    if (badge) {
      badge.innerHTML = 'Avance: <strong>' + checked + ' de ' + totalItemsCount + '</strong> ítems respondidos (' + pct + '%)';
    }

    if (isCoordTutoria) {
      let currentPts = 0;
      let answeredCount = 0;
      host.querySelectorAll('input[name^="item_"]:checked').forEach(r => {
        const val = Number(r.value);
        if (!isNaN(val) && val >= 1 && val <= 3) {
          currentPts += val;
          answeredCount++;
        }
      });
      const nivelInfo = getNivelCoordTutoriaJec(currentPts);
      const sumBadge = document.getElementById('tutoriaScoreSummaryBadge');
      if (sumBadge) {
        if (answeredCount === 0) {
          sumBadge.className = 'badge st-none';
          sumBadge.textContent = '0 / 63 puntos (Sin calificar)';
        } else {
          sumBadge.className = `badge ${nivelInfo.cls}`;
          sumBadge.textContent = `${currentPts} / 63 puntos · ${nivelInfo.nivel}`;
        }
      }
      const rowCumple = document.getElementById('tutoriaRowCumple');
      const rowParcial = document.getElementById('tutoriaRowParcial');
      const rowNoCumple = document.getElementById('tutoriaRowNoCumple');
      if (rowCumple && rowParcial && rowNoCumple) {
        rowCumple.style.backgroundColor = (answeredCount > 0 && currentPts >= 53) ? 'rgba(22, 163, 74, 0.14)' : '';
        rowCumple.style.fontWeight = (answeredCount > 0 && currentPts >= 53) ? '700' : 'normal';
        rowParcial.style.backgroundColor = (answeredCount > 0 && currentPts >= 42 && currentPts <= 52) ? 'rgba(217, 119, 6, 0.14)' : '';
        rowParcial.style.fontWeight = (answeredCount > 0 && currentPts >= 42 && currentPts <= 52) ? '700' : 'normal';
        rowNoCumple.style.backgroundColor = (answeredCount > 0 && currentPts < 42) ? 'rgba(220, 38, 38, 0.14)' : '';
        rowNoCumple.style.fontWeight = (answeredCount > 0 && currentPts < 42) ? '700' : 'normal';
      }
    } else if (isCoordPedagogico) {
      let currentPts = 0;
      let answeredCount = 0;
      host.querySelectorAll('input[name^="item_"]:checked').forEach(r => {
        const val = Number(r.value);
        if (!isNaN(val) && val >= 1 && val <= 3) {
          currentPts += val;
          answeredCount++;
        }
      });
      const nivelInfo = getNivelCoordPedagogicoJec(currentPts);
      const sumBadge = document.getElementById('pedagogicoScoreSummaryBadge');
      if (sumBadge) {
        if (answeredCount === 0) {
          sumBadge.className = 'badge st-none';
          sumBadge.textContent = '0 / 51 puntos (Sin calificar)';
        } else {
          sumBadge.className = `badge ${nivelInfo.cls}`;
          sumBadge.textContent = `${currentPts} / 51 puntos · ${nivelInfo.nivel}`;
        }
      }
      const rowCumple = document.getElementById('pedagRowCumple');
      const rowParcial = document.getElementById('pedagRowParcial');
      const rowNoCumple = document.getElementById('pedagRowNoCumple');
      if (rowCumple && rowParcial && rowNoCumple) {
        rowCumple.style.backgroundColor = (answeredCount > 0 && currentPts >= 41) ? 'rgba(22, 163, 74, 0.14)' : '';
        rowCumple.style.fontWeight = (answeredCount > 0 && currentPts >= 41) ? '700' : 'normal';
        rowParcial.style.backgroundColor = (answeredCount > 0 && currentPts >= 28 && currentPts <= 40) ? 'rgba(217, 119, 6, 0.14)' : '';
        rowParcial.style.fontWeight = (answeredCount > 0 && currentPts >= 28 && currentPts <= 40) ? '700' : 'normal';
        rowNoCumple.style.backgroundColor = (answeredCount > 0 && currentPts < 28) ? 'rgba(220, 38, 38, 0.14)' : '';
        rowNoCumple.style.fontWeight = (answeredCount > 0 && currentPts < 28) ? '700' : 'normal';
      }
    }
  };
  host.querySelectorAll('input[name^="item_"]').forEach(r => {
    r.addEventListener('change', updateProgressBadge);
  });
  updateProgressBadge();

  // Control para campos especiales de condición (mostrar input 'Otro')
  host.querySelectorAll('.extraCondicionSelect').forEach(sel => {
    const otroInp = document.getElementById(sel.id + '_otro');
    if (otroInp) {
      sel.addEventListener('change', () => {
        otroInp.style.display = sel.value === 'Otro' ? 'block' : 'none';
        if (sel.value === 'Otro') otroInp.focus();
      });
    }
  });

  // Sincronizador de checkboxes agrupados (Nivel / Turno) a su input hidden
  host.querySelectorAll('input[name$="_chk"]').forEach(chk => {
    chk.addEventListener('change', () => {
      const grp = chk.closest('.optGroup');
      if (!grp) return;
      const hidden = grp.querySelector('input[type="hidden"]');
      if (!hidden) return;
      const checkedVals = Array.from(grp.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
      hidden.value = checkedVals.join(', ');
    });
  });

  // Sincronizador de radios agrupados (Turno visitado) a su input hidden
  host.querySelectorAll('input[name$="_rad"]').forEach(rad => {
    rad.addEventListener('change', () => {
      const grp = rad.closest('.optGroup');
      if (!grp) return;
      const hidden = grp.querySelector('input[type="hidden"]');
      if (hidden && rad.checked) hidden.value = rad.value;
    });
  });

  // ---- Buscador IE con dropdown ----
  const instInput = document.getElementById('f_institucion');
  const dropdown = document.getElementById('ieDropdown');
  const hint = document.getElementById('regColegioHint');

  const showDropdown = () => {
    const query = normalizeText(instInput.value);
    const colegios = state.colegios || [];
    const matches = colegios
      .filter(c => !query || normalizeText(c.ie).includes(query) || normalizeText(c.codigoLocal).includes(query))
      .slice(0, 25);
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = matches.map(c =>
      '<div class="ieDropdownItem" data-id="' + c.id + '">' +
      '<div class="ieDropMain">' + esc(c.ie) + '</div>' +
      '<div class="ieDropSub">' + esc(c.codigoLocal || '') +
      (c.rei ? ' · ' + esc(c.rei) : '') +
      (c.director && c.director.nombre ? ' · Dir: ' + esc(c.director.nombre) : '') +
      '</div>' +
      '</div>'
    ).join('');
    dropdown.style.display = 'block';
    dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const c = (state.colegios || []).find(x => x.id === item.dataset.id);
        if (c) selectColegio(c);
        dropdown.style.display = 'none';
      });
    });
  };

  const selectColegio = (c) => {
    instInput.value = c.ie || '';
    regSelectedColegioId = c.id;

    const directivos = getDirectivosActivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);
    const dirActivo = directivos.director;

    // Auto-completar campos de cabecera configurados que correspondan al colegio
    normExtras.forEach((ex, i) => {
      const lower = (ex.label || '').toLowerCase();
      let matchVal = null;
      if (lower.includes('código') || lower.includes('codigo') || lower.includes('local') || lower.includes('modular')) {
        matchVal = c.codigoLocal || c.codigoModular;
      } else if (lower.includes('rei') || lower.includes('red')) {
        matchVal = c.rei;
      } else if (lower.includes('director') && !lower.includes('docente') && (lower.includes('nombre') || !lower.includes('dni'))) {
        matchVal = dirActivo ? dirActivo.apellidosNombres : (c.director && c.director.nombre ? c.director.nombre : '');
      } else if (lower.includes('director') && !lower.includes('docente') && lower.includes('dni')) {
        matchVal = dirActivo ? dirActivo.dni : (c.director && c.director.dni ? c.director.dni : '');
      } else if (lower.includes('director') && (lower.includes('tel') || lower.includes('cel'))) {
        matchVal = dirActivo ? dirActivo.telefono : (c.director && c.director.telefono ? c.director.telefono : '');
      } else if (lower.includes('director') && lower.includes('correo')) {
        matchVal = dirActivo ? dirActivo.correo : (c.director && c.director.correo ? c.director.correo : '');
      } else if (lower.includes('ugel')) {
        matchVal = c.dependencia || 'UGEL 03';
      } else if (lower.includes('modalidad')) {
        matchVal = c.modalidad;
      } else if (lower.includes('distrito')) {
        matchVal = c.distrito;
      } else if (lower.includes('dirección') || lower.includes('direccion')) {
        matchVal = c.direccion;
      }

      if (matchVal !== null && matchVal !== undefined && ex.tipo !== 'si_no') {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        if (inp && !inp.value) {
          if (inp.type === 'number' && isNaN(Number(matchVal))) {
            console.warn('Skipping assignment: cannot assign string to number input', matchVal);
          } else if (inp.type === 'date' && !matchVal.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.warn('Skipping assignment: cannot assign string to date input', matchVal);
          } else {
            inp.value = matchVal;
          }
        }
      }

      // Mapeo inteligente para Condición de directivo si el padrón indica NOMBRADO / DESIGNADO
      if (lower.includes('condici')) {
        const sel = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        if (sel && !sel.value) {
          const g = normalizeText(c.tipoGestion || c.gestion || '');
          if (g.includes('nombrado')) sel.value = 'Nombrado';
          else if (g.includes('designado')) sel.value = 'Designado';
          else if (g.includes('encargado')) sel.value = 'Encargado';
        }
      }

      // Mapeo inteligente para Nivel educativo (Inicial, Primaria, Secundaria, EBE)
      if (lower.includes('nivel') && (lower.includes('atiende') || lower.includes('educativo'))) {
        const grp = document.getElementById('extra_inp_' + ex.id + '_grp');
        const hidden = document.getElementById('extra_inp_' + ex.id);
        if (grp && hidden && !hidden.value) {
          const niv = normalizeText(c.nivelServicio || c.nivel || c.modalidad || '');
          const checkedVals = [];
          if (niv.includes('inicial')) { const chk = grp.querySelector('input[value="Inicial"]'); if (chk) { chk.checked = true; checkedVals.push('Inicial'); } }
          if (niv.includes('primaria')) { const chk = grp.querySelector('input[value="Primaria"]'); if (chk) { chk.checked = true; checkedVals.push('Primaria'); } }
          if (niv.includes('secundaria')) { const chk = grp.querySelector('input[value="Secundaria"]'); if (chk) { chk.checked = true; checkedVals.push('Secundaria'); } }
          if (niv.includes('ebe') || niv.includes('cebe') || niv.includes('especial')) { const chk = grp.querySelector('input[value="EBE"]'); if (chk) { chk.checked = true; checkedVals.push('EBE'); } }
          hidden.value = checkedVals.join(', ');
        }
      }

      // Mapeo inteligente para Turnos (Mañana, Tarde)
      if (lower.includes('turno') && lower.includes('atenci')) {
        const grp = document.getElementById('extra_inp_' + ex.id + '_grp');
        const hidden = document.getElementById('extra_inp_' + ex.id);
        if (grp && hidden && !hidden.value) {
          const tur = normalizeText(c.turnos || '');
          const checkedVals = [];
          if (tur.includes('mañana') || tur.includes('manana')) { const chk = grp.querySelector('input[value="Mañana"]'); if (chk) { chk.checked = true; checkedVals.push('Mañana'); } }
          if (tur.includes('tarde')) { const chk = grp.querySelector('input[value="Tarde"]'); if (chk) { chk.checked = true; checkedVals.push('Tarde'); } }
          hidden.value = checkedVals.join(', ');
        }
      }
    });

    // Auto-sugerir / completar especialista: para fichas JEC la especialista oficial es Fanny Liliana Arias Quiróz, para el resto según REI del colegio
    const currentFt = state.selectedFichaType || (state.currentFicha ? state.currentFicha.tipo : '') || '';
    if (isFichaEspecialistaJec(currentFt)) {
      respInputs.forEach(rInp => {
        rInp.value = ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
        const hEl = rInp.closest('.field') ? rInp.closest('.field').querySelector('.respHint') : null;
        if (hEl) {
          hEl.textContent = '✓ Especialista de JEC responsable: ' + ESPECIALISTA_JEC_OFICIAL.nombresApellidos + ' (AGEBRE – UGEL 03)';
          hEl.style.display = 'block';
        }
      });
    } else if ((c.rei || c.red) && state.responsables && state.responsables.length) {
      const cReiNum = normalizeReiNumber(c.rei || c.red);
      const cReiNorm = normalizeText(c.rei || c.red);
      const matchedResp = state.responsables.find(r => {
        if (!r.red) return false;
        if (cReiNum) {
          const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
          if (rNums.includes(cReiNum)) return true;
        }
        const rRedNorm = normalizeText(r.red);
        return rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm);
      });

      if (matchedResp) {
        respInputs.forEach(rInp => {
          if (!rInp.value) {
            const hEl = rInp.closest('.field') ? rInp.closest('.field').querySelector('.respHint') : null;
            selectResponsable(matchedResp, rInp, hEl);
          }
        });
      }
    }

    if (hint) {
      hint.style.display = 'block';
      hint.textContent = '✓ Vinculada al padrón' +
        (c.rei ? ' · ' + c.rei : '') +
        (c.dependencia ? ' · ' + c.dependencia : ' · UGEL 03') +
        (c.distrito ? ' · ' + c.distrito : '') +
        (c.director && c.director.nombre ? ' · Dir: ' + c.director.nombre : '') + '.';
    }
    renderPrevCompromisos(c.ie);
  };

  const renderPrevCompromisos = (ieName) => {
    const el = document.getElementById('prevCompList');
    if (!el) return;
    const allC = state.compromisos || [];
    const pending = allC.filter(c => c.institucion === ieName && c.estado !== 'Cumplido' && c.estado !== 'Anulado');

    if (pending.length === 0) {
      el.innerHTML = '<p class="helpText" style="margin-top:0">No hay compromisos pendientes anteriores para esta institución.</p>';
      return;
    }

    el.innerHTML = '<ul style="padding-left:18px;margin-top:0">' + pending.map(c =>
      '<li style="margin-bottom:8px;font-size:13.5px">' +
      '<strong>' + esc(c.responsable || 'Responsable') + ':</strong> ' + esc(c.texto) +
      ' <br><span style="color:var(--ink-soft);font-size:12px">Plazo: ' + (c.plazo ? fmtDate(c.plazo) : 'N/A') + '</span>' +
      ' <button type="button" class="btn btn-sm secondary btnClosePrevComp" style="padding:2px 6px;margin-left:8px" data-cid="' + esc(c.id) + '">Marcar Cumplido ✓</button>' +
      '</li>'
    ).join('') + '</ul>';

    el.querySelectorAll('.btnClosePrevComp').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Marcar este compromiso previo como cumplido?')) return;
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        try {
          const batch = dbNs.batch();
          batch.update(dbNs.collection('compromisos').doc(btn.dataset.cid), { estado: 'Cumplido', updatedAt: Date.now() });
          await batch.commit();
          showToast('Compromiso previo marcado como cumplido.');
          renderPrevCompromisos(ieName);
        } catch (err) {
          console.error(err);
          showToast('Error al actualizar el compromiso.');
          btn.disabled = false;
          btn.textContent = 'Cumplido ✓';
        }
      });
    });
  };

  instInput.addEventListener('input', showDropdown);
  instInput.addEventListener('focus', () => { if (instInput.value.length === 0) showDropdown(); });
  instInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });

  // ---- Autocompletado de Responsables ----
  const respInputs = host.querySelectorAll('.respAutocompleteInp');

  function selectResponsable(r, inp, hintEl) {
    inp.value = r.nombresApellidos || r.especialista || '';
    if (hintEl) {
      hintEl.style.display = 'block';
      hintEl.textContent = '✓ ' + (r.cargo || r.especialista || 'Especialista') +
        (r.red ? ' · ' + r.red : '') +
        (r.modalidad ? ' · ' + r.modalidad : '') +
        (r.celular ? ' · Cel: ' + r.celular : '');
    }

    // Auto-completar otros campos relativos al especialista (DNI, cargo, correo, celular, etc.)
    normExtras.forEach((ex, idx) => {
      const lower = (ex.label || '').toLowerCase();
      const otherInp = host.querySelector('[data-extra-id="' + ex.id + '"]') || host.querySelector('[data-extra-idx="' + idx + '"]');
      if (!otherInp || otherInp === inp) return;

      if ((lower.includes('monitor') || lower.includes('responsable') || lower.includes('especialista')) && lower.includes('dni') && r.dni && !otherInp.value) {
        otherInp.value = r.dni;
      } else if (lower.includes('cargo') && r.cargo && !otherInp.value) {
        otherInp.value = r.cargo;
      } else if ((lower.includes('correo') || lower.includes('email')) && !lower.includes('director') && r.correo && !otherInp.value) {
        otherInp.value = r.correo;
      } else if ((lower.includes('celular') || lower.includes('teléfono') || lower.includes('telefono')) && !lower.includes('director') && r.celular && !otherInp.value) {
        otherInp.value = r.celular;
      } else if (lower.includes('modalidad') && r.modalidad && !otherInp.value) {
        otherInp.value = r.modalidad;
      } else if ((lower.includes('red') || lower.includes('rei')) && r.red && !otherInp.value) {
        otherInp.value = r.red;
      }
    });
  }

  respInputs.forEach(inp => {
    const wrap = inp.closest('.ieSearchWrap');
    if (!wrap) return;
    const drop = wrap.querySelector('.respDropdown');
    const fieldEl = inp.closest('.field');
    const hintEl = fieldEl ? fieldEl.querySelector('.respHint') : null;
    if (!drop) return;

    const renderRespMatches = () => {
      const q = normalizeText(inp.value);
      const matches = (state.responsables || []).filter(r => {
        if (!q) return true;
        return normalizeText(r.nombresApellidos).includes(q) ||
          normalizeText(r.especialista).includes(q) ||
          normalizeText(r.cargo).includes(q) ||
          normalizeText(r.red).includes(q) ||
          normalizeText(r.distrito).includes(q) ||
          normalizeText(r.modalidad).includes(q) ||
          normalizeText(r.correo).includes(q);
      }).slice(0, 20);

      if (!matches.length) {
        drop.style.display = 'none';
        return;
      }

      drop.innerHTML = matches.map(r => {
        const modBadge = r.modalidad ? ' <span class="badge" style="font-size:10px;padding:1px 6px;background:var(--surface-2);margin-left:4px">' + esc(r.modalidad) + '</span>' : '';
        return '<div class="ieDropdownItem" data-respid="' + esc(r.id) + '">' +
          '<div class="ieDropMain">' + esc(r.nombresApellidos || r.especialista) + modBadge + '</div>' +
          '<div class="ieDropSub">' +
          (r.cargo ? esc(r.cargo) : (r.especialista ? esc(r.especialista) : '')) +
          (r.red ? ' · <strong>' + esc(r.red) + '</strong>' : '') +
          (r.distrito ? ' · ' + esc(r.distrito) : '') +
          (r.celular ? ' · Cel: ' + esc(r.celular) : '') +
          '</div>' +
          '</div>';
      }).join('');
      drop.style.display = 'block';

      drop.querySelectorAll('.ieDropdownItem').forEach(item => {
        item.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const r = (state.responsables || []).find(x => x.id === item.dataset.respid);
          if (r) {
            selectResponsable(r, inp, hintEl);
          }
          drop.style.display = 'none';
        });
      });
    };

    inp.addEventListener('input', renderRespMatches);
    inp.addEventListener('focus', () => { if (inp.value.length === 0) renderRespMatches(); });
    inp.addEventListener('blur', () => { setTimeout(() => { drop.style.display = 'none'; }, 200); });
  });

  // ---- Pre-cargar datos si estamos en modo edición ----
  if (editingSubmissionData) {
    const d = editingSubmissionData;
    setTimeout(() => {
      if (document.getElementById('f_institucion')) {
        document.getElementById('f_institucion').value = d.institucion || '';
        document.getElementById('f_fecha').value = d.fecha || todayStr();
        document.getElementById('f_visita').value = d.visita || 1;
        document.getElementById('f_observaciones').value = d.observaciones || '';
        if (document.getElementById('f_hora_inicio') && d.horaInicio) document.getElementById('f_hora_inicio').value = d.horaInicio;
        if (document.getElementById('f_hora_termino') && d.horaTermino) document.getElementById('f_hora_termino').value = d.horaTermino;
        if (document.getElementById('f_comp_director') && d.compromisoDirector) document.getElementById('f_comp_director').value = d.compromisoDirector;
        if (document.getElementById('f_comp_monitor') && d.compromisoMonitor) document.getElementById('f_comp_monitor').value = d.compromisoMonitor;

        regCompromisos = [...(Array.isArray(d.compromisos) ? d.compromisos : Array.isArray(d.compromisosList) ? d.compromisosList : [])];
        regSelectedColegioId = d.colegioId || null;
        renderCompList();

        // Precargar respuestas y evidencias
        (d.respuestas || []).forEach(r => {
          const radio = document.querySelector('input[name="item_' + r.id + '"][value="' + r.valor + '"]');
          if (radio) radio.checked = true;
          const evidInp = document.getElementById('evid_' + r.id) || document.querySelector('input[name="evidencia_' + r.id + '"]');
          if (evidInp && r.evidencia) evidInp.value = r.evidencia;
        });

        // Precargar síntesis por dimensión
        if (d.sintesis && d.sintesis.length) {
          d.sintesis.forEach((s, idx) => {
            const lEl = document.querySelector(`textarea[name="sintesis_${idx}_logros"]`);
            const dEl = document.querySelector(`textarea[name="sintesis_${idx}_dificultades"]`);
            const rEl = document.querySelector(`textarea[name="sintesis_${idx}_recomendaciones"]`);
            if (lEl && s.logros) lEl.value = s.logros;
            if (dEl && s.dificultades) dEl.value = s.dificultades;
            if (rEl && s.recomendaciones) rEl.value = s.recomendaciones;
          });
        }

        // Precargar campos de cabecera configurados
        normExtras.forEach((ex, i) => {
          let val = '';
          const found = (d.extras || []).find(x => x.id === ex.id || (x.label && x.label.trim().toLowerCase() === ex.label.trim().toLowerCase()));
          if (found && found.value !== undefined) {
            val = found.value;
          } else {
            // Compatibilidad con campos raíz de fichas guardadas anteriormente
            const l = (ex.label || '').toLowerCase();
            if (l.includes('ugel') && d.ugel) val = d.ugel;
            else if ((l.includes('red') || l.includes('rei')) && d.red) val = d.red;
            else if ((l.includes('código') || l.includes('codigo')) && d.codigoModular) val = d.codigoModular;
            else if (l.includes('director') && (l.includes('nombre') || !l.includes('dni')) && d.director) val = d.director;
            else if (l.includes('director') && l.includes('dni') && d.directorDni) val = d.directorDni;
            else if (l.includes('condici') && d.condicion) val = d.condicion;
            else if (l.includes('nivel') && d.nivelAtencion) val = d.nivelAtencion;
            else if (l.includes('turno') && l.includes('atenci') && d.turnoAtencion) val = d.turnoAtencion;
            else if (l.includes('turno') && l.includes('visit') && d.turnoVisitado) val = d.turnoVisitado;
            else if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && !l.includes('dni') && d.responsable) val = d.responsable;
            else if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && l.includes('dni') && d.monitorDni) val = d.monitorDni;
          }

          if (val !== undefined && val !== '') {
            if (ex.tipo === 'si_no') {
              const rad = document.querySelector('input[name="extra_' + ex.id + '"][value="' + val + '"]');
              if (rad) rad.checked = true;
            } else {
              const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
              if (inp) {
                inp.value = val;
                // Si es select de condición y no está en las opciones, seleccionar 'Otro'
                if (inp.tagName === 'SELECT' && !Array.from(inp.options).some(o => o.value === val)) {
                  inp.value = 'Otro';
                  const otroInp = document.getElementById(inp.id + '_otro');
                  if (otroInp) { otroInp.style.display = 'block'; otroInp.value = val; }
                }
              }
              // Marcar checkboxes si corresponde
              const grp = document.getElementById('extra_inp_' + ex.id + '_grp');
              if (grp) {
                const parts = val.split(',').map(s => s.trim().toLowerCase());
                grp.querySelectorAll('input[type="checkbox"]').forEach(c => {
                  if (parts.includes(c.value.toLowerCase())) c.checked = true;
                });
                const rad = grp.querySelector('input[type="radio"][value="' + val + '"]');
                if (rad) rad.checked = true;
              }
            }
          }
        });

        updateProgressBadge();
        if (hint && d.institucion) {
          hint.style.display = 'block';
          hint.textContent = '✓ Datos precargados para edición.';
        }
      }
    }, 0);
  }

  document.getElementById('addCompBtn').addEventListener('click', () => {
    regCompromisos.push({ texto: '', responsable: '', plazo: '' });
    renderCompList();
  });
  renderCompList();

  const cancelFormBtn = document.getElementById('cancelFormBtn');
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', () => {
      if (editingSubmissionId) {
        clearEditMode();
        regBuiltFor = null;
        regSelectedTypeId = null;
        if (navigate) navigate('consolidado');
      } else {
        if (confirm('¿Deseas cancelar el registro? Se descartarán los cambios ingresados.')) {
          clearEditMode();
          regBuiltFor = null;
          regCompromisos = [];
          regSelectedColegioId = null;
          if (navigate) navigate('dashboard');
        }
      }
    });
  }

  if (AI_SCAN_ENDPOINT) {
    document.getElementById('scanBtn').addEventListener('click', () => document.getElementById('scanInput').click());
    document.getElementById('scanInput').addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) extractFichaFromImage(e.target.files[0], ft, currentUser);
      e.target.value = '';
    });
  }

  document.getElementById('regForm').addEventListener('submit', (e) => onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate));
}

export function renderCompList() {
  const el = document.getElementById('compList');
  if (!el) return;
  if (regCompromisos.length === 0) { el.innerHTML = '<p class="helpText" style="margin-top:0">Sin compromisos adicionales agregados aún.</p>'; return; }
  el.innerHTML = regCompromisos.map((c, i) =>
    '<div class="compRow">' +
    '<input type="text" placeholder="Compromiso" value="' + esc(c.texto) + '" data-comp="' + i + '" data-f="texto">' +
    '<input type="text" placeholder="Responsable" value="' + esc(c.responsable) + '" data-comp="' + i + '" data-f="responsable">' +
    '<input type="date" title="Plazo (fecha límite obligatoria)" style="max-width:140px" value="' + esc(c.plazo) + '" data-comp="' + i + '" data-f="plazo" required>' +
    '<button type="button" class="iconBtn" data-rmcomp="' + i + '" title="Quitar">✕</button>' +
    '</div>'
  ).join('');
  el.querySelectorAll('input[data-comp]').forEach(inp => {
    inp.addEventListener('input', () => { regCompromisos[+inp.dataset.comp][inp.dataset.f] = inp.value; });
  });
  el.querySelectorAll('[data-rmcomp]').forEach(btn => {
    btn.addEventListener('click', () => { regCompromisos.splice(+btn.dataset.rmcomp, 1); renderCompList(); });
  });
}

async function onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate) {
  e.preventDefault();
  const activeState = state || getAppState() || (typeof window !== 'undefined' ? window.state : null) || {};
  const form = document.getElementById('regForm');
  const btn = (e.target && e.target.querySelector('button[type=submit]')) || document.getElementById('saveFormBtn');
  const isEdit = !!editingSubmissionId;

  // Limpiar clases y mensajes de error previos
  document.querySelectorAll('.fieldError').forEach(el => el.classList.remove('fieldError'));
  document.querySelectorAll('.fieldErrorText').forEach(el => el.remove());
  const prevBanner = document.getElementById('regFormErrorBanner');
  if (prevBanner) prevBanner.remove();

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = isEdit ? '⏳ Actualizando ficha...' : '⏳ Guardando ficha...';
  }

  try {
    if (!dbNs) {
      throw new Error('No hay conexión activa con la base de datos Firestore. Verifica tu estado de conexión a internet.');
    }
    if (!ft) {
      throw new Error('No se encontró la configuración del tipo de ficha seleccionado.');
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE"
    if (isFichaCebeGestion(ft)) {
      const targetForm = (form && form.id === 'regForm') ? form : (document.getElementById('regForm') || document.getElementById('regFormHost')?.querySelector('#regForm'));
      await guardarFormularioCebe(targetForm, ft, activeState, dbNs, currentUser, navigate, isEdit);
      return;
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - PRITE"
    if (isFichaPriteGestion(ft)) {
      const targetForm = (form && form.id === 'regForm') ? form : (document.getElementById('regForm') || document.getElementById('regFormHost')?.querySelector('#regForm'));
      await guardarFormularioPrite(targetForm, ft, activeState, dbNs, currentUser, navigate, isEdit);
      return;
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
    if (isFichaEbrGestionEscolar(ft)) {
      const ebrData = collectEbrGestionFormData(form || document.getElementById('regFormHost'), ft, isEdit);
      let submissionToken = isEdit ? editingSubmissionId : ((form && form.dataset.submissionId) || genId());
      if (form) form.dataset.submissionId = submissionToken;

      const fallbackResp = (currentUser && (currentUser.nombre || currentUser.displayName || currentUser.email)) || '';
      let finalResp = (ebrData.responsable && ebrData.responsable.trim()) || '';
      if (!finalResp && ebrData.red && activeState.responsables && activeState.responsables.length) {
        const cReiNum = normalizeReiNumber(ebrData.red);
        const cReiNorm = normalizeText(ebrData.red);
        const matchedResp = activeState.responsables.find(r => {
          if (!r.red) return false;
          if (cReiNum) {
            const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
            if (rNums.includes(cReiNum)) return true;
          }
          const rRedNorm = normalizeText(r.red);
          return rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm);
        });
        if (matchedResp) {
          finalResp = (matchedResp.nombresApellidos || matchedResp.especialista || '').trim();
        }
      }
      if (!finalResp) {
        finalResp = fallbackResp;
      }

      const docData = {
        ...ebrData,
        colegioId: ebrData.colegioId || regSelectedColegioId || null,
        responsable: finalResp,
        createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
        createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
      };

      const cleanedDocData = cleanForFirestore(docData);

      if (isEdit) {
        await Promise.race([
          dbNs.collection('submissions').doc(editingSubmissionId).set(cleanedDocData, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha EBR actualizada correctamente.');
      } else {
        await Promise.race([
          dbNs.collection('submissions').doc(submissionToken).set(cleanedDocData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha EBR registrada correctamente.');
      }

      // Sincronizar directorio de directivos
      try {
        const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
        if (syncRes && syncRes.summary) {
          showToast(`Ficha guardada. Directorio actualizado.`);
        }
      } catch (syncErr) {
        console.warn('Error sincronizando directorio desde ficha EBR:', syncErr);
      }

      const targetId = isEdit ? editingSubmissionId : submissionToken;
      if (activeState.submissions) {
        const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
        if (existingIdx >= 0) {
          activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
        } else {
          activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
        }
      }

      if (form) form.dataset.submissionId = '';
      clearEditMode();
      resetEbrFormState();
      regBuiltFor = null;
      regSelectedTypeId = null;
      regCompromisos = [];
      regSelectedColegioId = null;

      if (navigate) {
        navigate('consolidado');
      }
      return;
    }

    // Interceptar guardado de Ficha Unificada de Implementación del Modelo JEC (1er, 2do y 3er momento)
    if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
      const activeVis = currentJecVisita || (editingSubmissionData ? getSubmissionVisitaNum(editingSubmissionData, ft) : 2);
      let jecData;
      if (activeVis === 1) {
        jecData = collectJec1erFormData(form || document.getElementById('regFormHost'), ft, isEdit);
      } else {
        jecData = collectJecFormData(form || document.getElementById('regFormHost'), ft, isEdit, activeVis);
      }

      jecData.visita = Number(activeVis);
      jecData.momento = Number(activeVis);
      jecData.fichaTypeId = 'ft_msejec_2do';
      jecData.fichaTypeNombre = 'Monitoreo a la Implementación del Modelo JEC';

      let submissionToken = isEdit ? editingSubmissionId : ((form && form.dataset.submissionId) || genId());
      if (form) form.dataset.submissionId = submissionToken;

      const docData = {
        ...jecData,
        createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
        createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid || currentUser?.email || ''
      };

      const cleanedDocData = cleanForFirestore(docData);

      if (isEdit) {
        await Promise.race([
          dbNs.collection('submissions').doc(editingSubmissionId).set(cleanedDocData, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast(`✓ Ficha JEC (${activeVis === 1 ? '1er Monitoreo' : (activeVis === 2 ? '2do Monitoreo' : '3er Monitoreo')}) actualizada correctamente.`);
      } else {
        await Promise.race([
          dbNs.collection('submissions').doc(submissionToken).set(cleanedDocData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast(`✓ Ficha JEC (${activeVis === 1 ? '1er Monitoreo' : (activeVis === 2 ? '2do Monitoreo' : '3er Monitoreo')}) registrada correctamente.`);
      }

      // Sincronizar directorio de directivos
      try {
        const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
        if (syncRes && syncRes.summary) {
          showToast('Ficha guardada. Directorio de directivos actualizado.');
        }
      } catch (errSync) {
        console.warn('Error al sincronizar directorio desde Ficha JEC:', errSync);
      }

      const targetId = isEdit ? editingSubmissionId : submissionToken;
      if (activeState.submissions) {
        const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
        if (existingIdx >= 0) {
          activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
        } else {
          activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
        }
      }

      // Limpiar estados
      if (form) form.dataset.submissionId = '';
      clearEditMode();
      resetJec1erFormState();
      resetJecFormState();
      currentJecVisita = 1;
      regBuiltFor = null;
      editingSubmissionData = null;
      editingSubmissionId = null;
      regSelectedTypeId = null;
      regCompromisos = [];
      regSelectedColegioId = null;

      if (navigate) {
        navigate('consolidado');
      }
      return;
    }

    const isDirectivo = (ft.tipoRespuesta === 'nivel_1_4') || (ft.id === 'ft_directivo') || (ft.nombre || '').toLowerCase().includes('directivo');

    let firstErrorEl = null;
    const markError = (inputEl, message) => {
      if (!inputEl) return;
      inputEl.classList.add('fieldError');
      const errSpan = document.createElement('span');
      errSpan.className = 'fieldErrorText';
      errSpan.textContent = message;
      if (inputEl.parentElement) {
        inputEl.parentElement.appendChild(errSpan);
      }
      if (!firstErrorEl) firstErrorEl = inputEl;
    };

    // Validar campos obligatorios generales
    const instEl = document.getElementById('f_institucion');
    const fechaEl = document.getElementById('f_fecha');
    const visitaEl = document.getElementById('f_visita');

    const instVal = instEl ? instEl.value.trim() : '';
    if (!instVal) {
      markError(instEl, 'La institución educativa es obligatoria.');
    }

    const fechaVal = fechaEl ? fechaEl.value : '';
    if (!fechaVal) {
      markError(fechaEl, 'La fecha de la visita es obligatoria.');
    }

    const visitaVal = visitaEl ? Number(visitaEl.value) : 1;
    if (!visitaVal || visitaVal < 1) {
      markError(visitaEl, 'Ingresa un número de visita válido (mínimo 1).');
    }

    // Validar horas si se indicaron
    const horaInicioEl = document.getElementById('f_hora_inicio');
    const horaTerminoEl = document.getElementById('f_hora_termino');
    const horaInicioVal = horaInicioEl ? horaInicioEl.value.trim() : '';
    const horaTerminoVal = horaTerminoEl ? horaTerminoEl.value.trim() : '';

    if (horaInicioVal && horaTerminoVal && horaTerminoVal <= horaInicioVal) {
      markError(horaTerminoEl, 'La hora de término debe ser posterior a la hora de inicio.');
    }

    // Validar campos extra configurados como obligatorios
    const normExtras = normalizeExtras(ft.extras);
    const extrasCollected = [];

    for (let i = 0; i < normExtras.length; i++) {
      const ex = normExtras[i];
      let val = '';
      if (ex.tipo === 'si_no') {
        const chk = document.querySelector('input[name="extra_' + ex.id + '"]:checked');
        val = chk ? chk.value : '';
      } else {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        if (inp) {
          if (inp.tagName === 'SELECT' && inp.value === 'Otro') {
            const otroInp = document.getElementById(inp.id + '_otro');
            val = otroInp && otroInp.value.trim() ? otroInp.value.trim() : 'Otro';
          } else {
            val = inp.value.trim();
          }
        }
      }

      if (ex.required && !val) {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        markError(inp, 'El campo "' + ex.label + '" es obligatorio.');
      }
      extrasCollected.push({ id: ex.id, label: ex.label, value: val, tipo: ex.tipo });
    }

    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorEl.focus();
      showToast('Por favor completa o corrige los campos obligatorios.');
      return;
    }

    // Recolectar respuestas y verificar completitud de indicadores
    const respuestas = [];
    let answeredCount = 0;
    let totalItems = 0;
    let firstUnansweredEl = null;

    ft.secciones.forEach(sec => {
      sec.items.forEach(it => {
        totalItems++;
        const chk = document.querySelector('input[name="item_' + it.id + '"]:checked');
        const evidInp = document.getElementById('evid_' + it.id) || document.querySelector('input[name="evidencia_' + it.id + '"]');
        const evidencia = evidInp ? evidInp.value.trim() : '';

        if (chk) {
          answeredCount++;
          respuestas.push({
            id: it.id,
            texto: it.texto,
            seccion: sec.nombre,
            valor: chk.value,
            evidencia: evidencia
          });
        } else {
          if (!firstUnansweredEl) {
            firstUnansweredEl = document.querySelector('input[name="item_' + it.id + '"]') || evidInp;
          }
          if (evidencia) {
            respuestas.push({
              id: it.id,
              texto: it.texto,
              seccion: sec.nombre,
              valor: null,
              evidencia: evidencia
            });
          }
        }
      });
    });

    // Control de ficha incompleta / borrador
    let esBorrador = false;
    if (answeredCount < totalItems) {
      const confirmDraft = confirm(
        'Atención: Hay ' + (totalItems - answeredCount) + ' de ' + totalItems + ' indicadores sin calificar.\n\n' +
        '¿Deseas guardar la ficha como BORRADOR (incompleta)?\n' +
        'Se calculará el avance únicamente sobre los indicadores respondidos y podrás completarla luego.'
      );
      if (!confirmDraft) {
        if (firstUnansweredEl) {
          const itemRow = firstUnansweredEl.closest('.itemRow');
          if (itemRow) itemRow.classList.add('fieldError');
          firstUnansweredEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstUnansweredEl.focus();
        }
        showToast('Completa los indicadores pendientes para registrar la ficha completa.');
        return;
      }
      esBorrador = true;
    }

    // Extracción de datos para compatibilidad de tablas y reportes
    let ugelVal = '', redVal = '', codigoVal = '', responsableVal = '', directorVal = '';
    let directorDniVal = '', condicionVal = '', nivelAtencionVal = '', turnoAtencionVal = '', turnoVisitadoVal = '', monitorDniVal = '';

    extrasCollected.forEach(ex => {
      const l = (ex.label || '').toLowerCase();
      if (l.includes('ugel') && !ugelVal) ugelVal = ex.value;
      if ((l.includes('red') || l.includes('rei')) && !redVal) redVal = ex.value;
      if ((l.includes('código') || l.includes('codigo')) && !codigoVal) codigoVal = ex.value;
      if (l.includes('director') && (l.includes('nombre') || !l.includes('dni')) && !directorVal) directorVal = ex.value;
      if (l.includes('director') && l.includes('dni') && !directorDniVal) directorDniVal = ex.value;
      if (l.includes('condici') && !condicionVal) condicionVal = ex.value;
      if (l.includes('nivel') && !nivelAtencionVal) nivelAtencionVal = ex.value;
      if (l.includes('turno') && l.includes('atenci') && !turnoAtencionVal) turnoAtencionVal = ex.value;
      if (l.includes('turno') && l.includes('visit') && !turnoVisitadoVal) turnoVisitadoVal = ex.value;
      if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && !l.includes('dni') && !responsableVal) responsableVal = ex.value;
      if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && l.includes('dni') && !monitorDniVal) monitorDniVal = ex.value;
    });

    // Vincular con padrón
    let matchedCol = null;
    if (regSelectedColegioId) {
      matchedCol = (activeState.colegios || []).find(c => c.id === regSelectedColegioId);
    }
    if (!matchedCol && instVal) {
      const instNorm = normalizeText(instVal);
      matchedCol = (activeState.colegios || []).find(c => normalizeText(c.ie) === instNorm);
    }

    if (matchedCol) {
      if (!ugelVal || ugelVal.toLowerCase().includes('sector educ')) { ugelVal = matchedCol.dependencia || 'UGEL 03'; if (ugelVal.toLowerCase().includes('sector educ')) ugelVal = 'UGEL 03'; }
      if (!redVal) redVal = normalizeReiNumber(matchedCol.rei) || matchedCol.rei || '';
      if (!codigoVal) codigoVal = matchedCol.codigoLocal || matchedCol.codigoModular || '';
      if (!directorVal && matchedCol.director && matchedCol.director.nombre) directorVal = matchedCol.director.nombre;
      if (!directorDniVal && matchedCol.director && matchedCol.director.dni) directorDniVal = matchedCol.director.dni;
      if (!condicionVal && matchedCol.tipoGestion) condicionVal = matchedCol.tipoGestion;
      if (!nivelAtencionVal && matchedCol.nivelServicio) nivelAtencionVal = matchedCol.nivelServicio;
      if (!turnoAtencionVal && matchedCol.turnos) turnoAtencionVal = matchedCol.turnos;
    }
    if (!ugelVal || ugelVal.toLowerCase().includes('sector educ')) ugelVal = 'UGEL 03';
    if (redVal && redVal !== 'No aplica') {
      redVal = normalizeReiNumber(redVal) || redVal;
    } else if (!redVal) {
      redVal = 'No aplica';
    }

    // Recolectar Síntesis por dimensión si es directivo
    const sintesisCollected = [];
    if (isDirectivo) {
      const sintesisDimensions = [
        'A. DIMENSIÓN ESTRATÉGICA',
        'B. DIMENSIÓN PEDAGÓGICA: ESTRATEGIAS PRIORIZADAS',
        'C. PLANIFICACIÓN CURRICULAR',
        'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA',
        'E. FORTALECIMIENTO DE LAS COMPETENCIAS DOCENTES',
        'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES'
      ];
      sintesisDimensions.forEach((dim, dIdx) => {
        const logrosEl = document.querySelector(`textarea[name="sintesis_${dIdx}_logros"]`);
        const difEl = document.querySelector(`textarea[name="sintesis_${dIdx}_dificultades"]`);
        const recEl = document.querySelector(`textarea[name="sintesis_${dIdx}_recomendaciones"]`);
        sintesisCollected.push({
          dimension: dim,
          logros: logrosEl ? logrosEl.value.trim() : '',
          dificultades: difEl ? difEl.value.trim() : '',
          recomendaciones: recEl ? recEl.value.trim() : ''
        });
      });
    }

    // Recolectar compromisos del directivo y monitor
    const compDirectorEl = document.getElementById('f_comp_director');
    const compMonitorEl = document.getElementById('f_comp_monitor');
    const compDirectorVal = compDirectorEl ? compDirectorEl.value.trim() : '';
    const compMonitorVal = compMonitorEl ? compMonitorEl.value.trim() : '';

    const allCompromisos = [...regCompromisos.filter(c => c.texto && c.texto.trim())];
    if (compDirectorVal) {
      allCompromisos.unshift({ texto: compDirectorVal, responsable: 'Director(a) de la IE', plazo: 'Año escolar 2026' });
    }
    if (compMonitorVal) {
      allCompromisos.push({
        texto: compMonitorVal,
        responsable: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : 'Monitor / Especialista',
        plazo: 'Seguimiento continuo'
      });
    }

    // Token de idempotencia en cliente para prevenir duplicados en caso de reintento o doble clic
    let submissionToken = (form && form.dataset.submissionId) || genId();
    if (form) form.dataset.submissionId = submissionToken;

    if (isFichaEspecialistaJec(ft)) {
      // Las 3 fichas JEC son atendidas exclusivamente por la Especialista de JEC oficial
      responsableVal = ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
    } else {
      const fallbackResp = (currentUser && (currentUser.nombre || currentUser.displayName || currentUser.email)) || '';
      if (!responsableVal || !responsableVal.trim() || /^\d+$/.test(responsableVal.trim())) {
        if (redVal && redVal !== 'No aplica' && activeState.responsables && activeState.responsables.length) {
          const redNum = normalizeReiNumber(redVal);
          const redNorm = normalizeText(redVal);
          const matchedResp = activeState.responsables.find(r => {
            if (!r.red) return false;
            if (redNum) {
              const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
              if (rNums.includes(redNum)) return true;
            }
            const rRedNorm = normalizeText(r.red);
            return rRedNorm.includes(redNorm) || redNorm.includes(rRedNorm);
          });
          if (matchedResp && (matchedResp.nombresApellidos || matchedResp.especialista)) {
            responsableVal = (matchedResp.nombresApellidos || matchedResp.especialista).trim();
          }
        }
      }
      if (!responsableVal || !responsableVal.trim() || /^\d+$/.test(responsableVal.trim())) {
        responsableVal = fallbackResp;
      }
    }

    let tutoriaExtraData = {};
    if (isFichaCoordTutoriaJec(ft)) {
      const stats = calcScore(respuestas, { ...ft, regla_nivel: ft.regla_nivel || REGLA_NIVEL_COORD_TUTORIA_JEC });
      tutoriaExtraData = {
        puntaje: stats.puntaje,
        puntaje_maximo: 63,
        nivel_cumplimiento: stats.estado.nivel,
        descripcion_cumplimiento: stats.estado.descripcion || '',
        estado_panel: stats.estado.estado_panel || 'Inicio'
      };
    } else if (isFichaCoordPedagogico(ft)) {
      const stats = calcScore(respuestas, { ...ft, regla_nivel: REGLA_NIVEL_COORD_PEDAGOGICO });
      tutoriaExtraData = {
        puntaje: stats.puntaje,
        puntaje_maximo: 51,
        nivel_cumplimiento: stats.estado.nivel,
        descripcion_cumplimiento: stats.estado.descripcion || '',
        estado_panel: stats.estado.estado_panel || 'Inicio'
      };
    }

    const docData = {
      fichaTypeId: ft.id || '',
      fichaTypeNombre: ft.nombre || '',
      tipoRespuesta: ft.tipoRespuesta || '',
      institucion: instVal || '',
      colegioId: (matchedCol && matchedCol.id) || regSelectedColegioId || null,
      fecha: fechaVal || '',
      visita: Number(visitaVal) || 1,
      ugel: ugelVal || 'UGEL 03',
      red: redVal || 'No aplica',
      codigoModular: codigoVal || '',
      responsable: responsableVal || '',
      responsableCargo: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.cargo : '',
      monitorJec: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : '',
      director: directorVal || '',
      directorDni: directorDniVal || '',
      condicion: condicionVal || '',
      nivelAtencion: nivelAtencionVal || '',
      turnoAtencion: turnoAtencionVal || '',
      turnoVisitado: turnoVisitadoVal || '',
      monitorDni: monitorDniVal || '',
      horaInicio: horaInicioVal || '',
      horaTermino: horaTerminoVal || '',
      extras: extrasCollected || [],
      respuestas: respuestas || [],
      sintesis: sintesisCollected || [],
      compromisoDirector: compDirectorVal || '',
      compromisoMonitor: compMonitorVal || '',
      observaciones: document.getElementById('f_observaciones') ? document.getElementById('f_observaciones').value.trim() : '',
      compromisos: allCompromisos || [],
      esBorrador: esBorrador || false,
      ...tutoriaExtraData,
      createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
      createdAt: isEdit ? (editingSubmissionData.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    const targetId = isEdit ? editingSubmissionId : submissionToken;
    const cleanedDocData = cleanForFirestore(docData);
    const batch = dbNs.batch();
    batch.set(dbNs.collection('submissions').doc(targetId), cleanedDocData);

    allCompromisos.forEach((comp, idx) => {
      if (comp.plazo && comp.plazo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const compId = targetId + '_c' + idx;
        const cData = {
          fichaId: targetId,
          institucion: instVal || '',
          ugel: ugelVal || 'UGEL 03',
          red: redVal || 'No aplica',
          responsableFicha: responsableVal || '',
          responsableFichaDni: monitorDniVal || '',
          texto: comp.texto || '',
          responsable: comp.responsable || '',
          plazo: comp.plazo || '',
          createdBy: currentUser.uid,
          updatedAt: Date.now()
        };
        if (!isEdit) {
          cData.estado = 'Pendiente';
          cData.createdAt = Date.now();
        }
        batch.set(dbNs.collection('compromisos').doc(compId), cleanForFirestore(cData), { merge: true });
      }
    });

    // Timeout preventivo de 25 segundos para asegurar que si la conexión tiene microcortes, no deje la UI congelada
    const commitPromise = batch.commit();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('La conexión con la base de datos tardó más de lo esperado al guardar. Por favor verifica tu red e inténtalo nuevamente.')), 25000)
    );
    await Promise.race([commitPromise, timeoutPromise]);
    showToast(isEdit ? 'Ficha actualizada correctamente.' : 'Ficha registrada correctamente.');

    // Sincronizar directorio de directivos
    try {
      const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
      if (syncRes && syncRes.summary) {
        showToast(`Ficha guardada. Directorio actualizado.`);
      }
    } catch (syncErr) {
      console.warn('Error sincronizando directorio desde ficha:', syncErr);
    }

    // Actualizar cache local para respuesta instantánea de KPIs y tablas
    if (activeState.submissions) {
      const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
      if (existingIdx >= 0) {
        activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
      } else {
        activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
      }
    }

    // Limpiar estado tras guardado exitoso
    if (form) form.dataset.submissionId = '';
    clearEditMode();
    regBuiltFor = null;
    regSelectedTypeId = null;
    regCompromisos = [];
    regSelectedColegioId = null;

    if (navigate) {
      navigate('consolidado');
    }
  } catch (err) {
    console.error('Error al guardar submission:', err);
    const errDetails = esc(err.stack || err.message || String(err));
    const errBanner = document.createElement('div');
    errBanner.id = 'regFormErrorBanner';
    errBanner.className = 'banner';
    errBanner.style.cssText = 'background:#FEF2F2;border:1.5px solid #DC2626;color:#991B1B;padding:14px 18px;margin-bottom:18px;border-radius:8px;';
    errBanner.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">⚠️ No se pudo guardar la ficha</div>
      <div style="font-size:13px;margin-bottom:8px">Sus datos se conservaron en el formulario; intente nuevamente.</div>
      <details style="font-size:11.5px;color:#7F1D1D;cursor:pointer">
        <summary style="font-weight:600">Ver detalle técnico</summary>
        <pre style="white-space:pre-wrap;background:#FFF;padding:8px;border-radius:4px;margin-top:6px;border:1px solid #FECACA">${errDetails}</pre>
      </details>
    `;
    const formHost = document.getElementById('regFormHost') || form;
    if (formHost) formHost.insertBefore(errBanner, formHost.firstChild);
    showToast('No se pudo guardar la ficha. Sus datos se conservaron.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = isEdit ? 'Actualizar ficha' : 'Guardar ficha';
    }
  }
}

async function extractFichaFromImage(file, ft, currentUser) {
  const statusEl = document.getElementById('scanStatus');
  const btn = document.getElementById('scanBtn');
  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = 'Leyendo la imagen con IA... esto puede tardar hasta un minuto.';
  const itemsDesc = ft.secciones.map(sec => 'Sección "' + sec.nombre + '":\n' + sec.items.map(it => '- id:' + it.id + ' | ' + it.texto).join('\n')).join('\n\n');
  const validValues = RESPONSE_OPTIONS[ft.tipoRespuesta].map(o => o.v).join(', ');
  const extrasDesc = (ft.extras || []).map(ex => ex.label).join(' | ') || '(ninguno)';
  const prompt = 'Digitaliza la ficha de monitoreo educativa "' + ft.nombre + '". Responde SOLO con JSON válido:\n' +
    '{"institucion":"","ugel":"","red":"","codigoModular":"","fecha":"AAAA-MM-DD","visita":1,"responsable":"","director":"",' +
    '"extras":{},"respuestas":[{"id":"","valor":""}],"observaciones":"","compromisos":[]}\n' +
    'Valores válidos para respuestas: ' + validValues + '. Ítems:\n' + itemsDesc + '\nExtras: ' + extrasDesc;
  try {
    const base64 = await fileToBase64(file);
    const idToken = currentUser ? await currentUser.getIdToken() : null;
    const resp = await fetch(AI_SCAN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(idToken ? { 'Authorization': 'Bearer ' + idToken } : {}) },
      body: JSON.stringify({ prompt, imageBase64: base64, mediaType: file.type || 'image/jpeg' }),
    });
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    applyExtractedData(data, ft);
    if (statusEl) statusEl.textContent = '';
    showToast('Ficha leída. Revisa los datos antes de guardar.');
  } catch (err) {
    console.error(err);
    if (statusEl) statusEl.textContent = 'No se pudo leer la ficha: ' + (err.message || 'error');
    showToast('No se pudo leer la ficha con IA.');
  } finally {
    if (btn) btn.disabled = false;
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function applyExtractedData(data, ft) {
  if (!data || typeof data !== 'object') return;
  const setVal = (id, v) => { const el = document.getElementById(id); if (el && v) el.value = v; };
  setVal('f_institucion', data.institucion); setVal('f_ugel', data.ugel); setVal('f_red', data.red);
  setVal('f_codigo', data.codigoModular);
  if (data.fecha && /^\d{4}-\d{2}-\d{2}$/.test(data.fecha)) setVal('f_fecha', data.fecha);
  if (data.visita) setVal('f_visita', Number(data.visita) || 1);
  setVal('f_responsable', data.responsable); setVal('f_director', data.director); setVal('f_observaciones', data.observaciones);
  const normExtras = normalizeExtras(ft.extras);
  if (data.extras && typeof data.extras === 'object') {
    normExtras.forEach((ex, i) => {
      const v = data.extras[ex.label] || data.extras[ex.id];
      if (v) {
        if (ex.tipo === 'si_no') {
          const radio = document.querySelector('input[name="extra_' + ex.id + '"][value="' + v + '"]');
          if (radio) radio.checked = true;
        } else {
          const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
          if (inp) inp.value = v;
        }
      }
    });
  }
  if (Array.isArray(data.respuestas)) {
    const validVals = new Set(RESPONSE_OPTIONS[ft.tipoRespuesta].map(o => o.v));
    data.respuestas.forEach(r => { if (!r || !r.id || !validVals.has(r.valor)) return; const radio = document.querySelector('input[name="item_' + r.id + '"][value="' + r.valor + '"]'); if (radio) radio.checked = true; });
  }
  if (Array.isArray(data.compromisos) && data.compromisos.length) {
    regCompromisos = data.compromisos.filter(c => c && c.texto).map(c => ({ texto: c.texto || '', responsable: c.responsable || '', plazo: c.plazo || '' }));
    renderCompList();
  }
}

