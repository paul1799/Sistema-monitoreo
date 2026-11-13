/**
 * features/registrar/form-render.js
 * Renderizado de selector de fichas y formulario dinámico de registro
 * UGEL 03 – AGEBRE – Fase 4 Reorganización
 */

import {
  esc,
  showToast,
  todayStr,
  fmtDate,
  seedSuggestions,
  normalizeText,
  normalizeReiNumber,
  getFichaColor,
  getFichaModalidad,
  isFichaActiva
} from '../../core/utils/index.js';
import {
  RESPONSE_OPTIONS,
  RESPONSE_LABELS,
  DESCRIPTORES_NIVEL_1_4,
  getResponsableForColegio
} from '../../ui/scoring.js';
import {
  isFichaJec,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  isFichaEbrGestionEscolar,
  ESPECIALISTA_JEC_OFICIAL,
  getNivelCoordTutoriaJec,
  getNivelCoordPedagogicoJec,
  buildResponseValMap,
  resolveItemValue,
  getSubmissionVisitaNum
} from '../../calcEngine.js?v=20261103_v8';
import {
  renderJecForm,
  preloadJecFormState,
  jecFormState
} from '../../jec-monitoreo.js';
import {
  renderJec1erForm,
  preloadJec1erFormState,
  jec1erState
} from '../../jec-1er-monitoreo.js';
import {
  getDirectivosActivosForColegio
} from '../../directorio.js';
import { cleanTextCode } from '../../directorio/helpers.js';
import { AI_SCAN_ENDPOINT } from '../../firebase-config.js';
import { PLANTILLAS_BASE_OFICIALES } from '../../catalogo-plantillas-base.js';
import { deduplicateTwinSubmissions } from '../../ui/consolidado.js';
import {
  normalizeExtras,
  startNewPlantillaBuilder
} from '../plantillas/index.js';
import {
  regCompromisos,
  currentJecVisita,
  setCurrentJecVisita,
  regSelectedTypeId,
  setRegSelectedTypeIdVal,
  setRegBuiltFor,
  regSelectedColegioId,
  setRegSelectedColegioIdVal,
  fichaListSearchQuery,
  setFichaListSearchQuery,
  fichaListFilterEscala,
  setFichaListFilterEscala,
  fichaListFilterModalidad,
  setFichaListFilterModalidad,
  fichaDescExpanded,
  resetRegistrationSessionState
} from './state.js';
import { onSubmitRegistro } from './save.js';
import { extractFichaFromImage } from './preload.js';
import { clearEditMode } from '../../core/state/app-state.js';

/**
 * Renderiza la lista de compromisos adicionales
 */
export function renderCompList() {
  const el = document.getElementById('compList');
  if (!el) return;
  if (!regCompromisos || regCompromisos.length === 0) {
    el.innerHTML = '<p class="helpText" style="margin-top:0">Sin compromisos adicionales agregados aún.</p>';
    return;
  }
  el.innerHTML = regCompromisos.map((c, i) =>
    '<div class="compRow">' +
    '<input type="text" placeholder="Descripción del compromiso..." value="' + esc(c.texto || '') + '" data-c-idx="' + i + '" data-c-field="texto" style="flex:2">' +
    '<input type="text" placeholder="Responsable..." value="' + esc(c.responsable || '') + '" data-c-idx="' + i + '" data-c-field="responsable" style="flex:1">' +
    '<input type="date" value="' + (c.plazo || '') + '" data-c-idx="' + i + '" data-c-field="plazo">' +
    '<button type="button" class="btn secondary btnDelComp" data-c-del="' + i + '">✕</button>' +
    '</div>'
  ).join('');

  el.querySelectorAll('[data-c-field]').forEach(inp => {
    inp.addEventListener('input', () => {
      const idx = Number(inp.dataset.cIdx);
      if (regCompromisos[idx]) {
        regCompromisos[idx][inp.dataset.cField] = inp.value;
      }
    });
  });

  el.querySelectorAll('[data-c-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.cDel);
      regCompromisos.splice(idx, 1);
      renderCompList();
    });
  });
}

/**
 * CASO 3.B: Renderiza el selector y tarjetas visuales de fichas disponibles
 */
export function renderFichaPicker({
  container,
  state,
  getFichaType,
  dbNs,
  currentUser,
  navigate,
  actualIsAdmin,
  subNavHtml,
  onSelectFicha,
  onOpenPlantillas,
  onSubNavClick
}) {
  const allTypes = (state.fichaTypes || []).filter(isFichaActiva);

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
      if (onSubNavClick) {
        container.querySelectorAll('[data-reg-sub]').forEach(b => {
          b.onclick = () => onSubNavClick(b.dataset.regSub);
        });
      }
      const createFirst = document.getElementById('btnCreateFirstFicha');
      if (createFirst) {
        createFirst.onclick = () => {
          if (onOpenPlantillas) onOpenPlantillas();
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

  // Filtrar según búsqueda y filtros activos
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
      ? '<span class="fichaBadge fichaBadgeVisitas">📅 3 Visitas (Inicio, Proceso, Salida)</span>'
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
                <span class="fichaBadge fichaBadgeItems">📊 ${totalItems} ítems</span>
                <span class="fichaBadge fichaBadgeEscala">🏷️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              ` : `
                <span class="fichaBadge fichaBadgeItems">📑 1er (37 ítems), 2do y 3er Momento (31 ítems)</span>
              `}
              <span class="fichaBadge fichaBadgeCount">📝 ${count} ${count === 1 ? 'ficha registrada' : 'fichas registradas'}</span>
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
  if (actualIsAdmin && onSubNavClick) {
    container.querySelectorAll('[data-reg-sub]').forEach(b => {
      b.onclick = () => onSubNavClick(b.dataset.regSub);
    });
  }

  // Conectar buscador
  const searchInp = document.getElementById('fichaSearchInp');
  if (searchInp) {
    searchInp.oninput = (e) => {
      setFichaListSearchQuery(e.target.value);
      renderFichaPicker({ container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin, subNavHtml, onSelectFicha, onOpenPlantillas, onSubNavClick });
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
      setFichaListFilterModalidad(e.target.value);
      renderFichaPicker({ container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin, subNavHtml, onSelectFicha, onOpenPlantillas, onSubNavClick });
    };
  }
  const selEsc = document.getElementById('fichaFilterEscala');
  if (selEsc) {
    selEsc.onchange = (e) => {
      setFichaListFilterEscala(e.target.value);
      renderFichaPicker({ container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin, subNavHtml, onSelectFicha, onOpenPlantillas, onSubNavClick });
    };
  }

  const clearBtn = document.getElementById('btnClearFilters') || document.getElementById('btnClearFichaFilters');
  if (clearBtn) {
    clearBtn.onclick = () => {
      setFichaListSearchQuery('');
      setFichaListFilterEscala('');
      setFichaListFilterModalidad('');
      renderFichaPicker({ container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin, subNavHtml, onSelectFicha, onOpenPlantillas, onSubNavClick });
    };
  }

  // Toggle "ver más" de descripciones
  container.querySelectorAll('[data-toggle-desc]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const id = btn.dataset.toggleDesc;
      fichaDescExpanded[id] = !fichaDescExpanded[id];
      renderFichaPicker({ container, state, getFichaType, dbNs, currentUser, navigate, actualIsAdmin, subNavHtml, onSelectFicha, onOpenPlantillas, onSubNavClick });
    };
  });

  // Selección de ficha para registrar
  container.querySelectorAll('[data-select-card]').forEach(card => {
    card.onclick = (e) => {
      if (e.target.closest('[data-toggle-desc]')) return;
      if (onSelectFicha) onSelectFicha(card.dataset.selectCard);
    };
    card.onkeydown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onSelectFicha) onSelectFicha(card.dataset.selectCard);
      }
    };
  });

  container.querySelectorAll('[data-select-btn]').forEach(btn => {
    btn.onclick = (e) => {
      e.stopPropagation();
      if (onSelectFicha) onSelectFicha(btn.dataset.selectBtn);
    };
  });
}

/**
 * Sincroniza campos comunes de la IE y del equipo directivo entre estados de JEC (Momento 1 vs Momentos 2/3)
 */
export function syncCommonJecFields(host, fromVisita, toVisita) {
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
    jec1erState.director.dni = dirDniVal || jec1erState.director.dni || '';
    jec1erState.director.telefono = dirTelVal || jec1erState.director.telefono || '';
    jec1erState.director.condicion = dirCondVal || jec1erState.director.condicion || 'DESIGNADO';
    jec1erState.director.correo = dirMailVal || jec1erState.director.correo || '';
    jec1erState.secciones = secVal || jec1erState.secciones || '';
    jec1erState.estudiantes = estVal || jec1erState.estudiantes || '';
    jec1erState.docentes = docVal || jec1erState.docentesTotal || '';
    jec1erState.secundariaTecnica = jecFormState.formacionTecnica ? 'SI' : 'NO';
  }
}

/**
 * Renderiza el formulario unificado de Modelo JEC (Permite alternar interactivamente entre 1er, 2do y 3er Monitoreo)
 */
export function renderUnifiedJecForm(host, ft, state, dbNs, currentUser, navigate, isEditing, targetVisita = null, targetColId = null, editingSubmissionData = null) {
  if (targetVisita) {
    setCurrentJecVisita(Number(targetVisita));
  } else if (editingSubmissionData) {
    setCurrentJecVisita(getSubmissionVisitaNum(editingSubmissionData, ft) || 2);
  } else if (!currentJecVisita) {
    setCurrentJecVisita(1);
  }

  // Pre-cargar colegio si viene preseleccionado desde reportes y no estamos editando
  if (!isEditing && targetColId && (jecFormState.colegioId !== targetColId || jec1erState.colegioId !== targetColId)) {
    const col = (state && Array.isArray(state.colegios))
      ? state.colegios.find(c => c.id === targetColId || c.codigoLocal === targetColId || c.codigoModular === targetColId)
      : null;
    if (col) {
      jecFormState.colegioId = col.id || '';
      jecFormState.institucion = col.ie || '';
      jecFormState.codigoModular = cleanTextCode(col.codigoModular || col.codigoLocal || '');
      jecFormState.rei = col.rei || col.red || '';
      jecFormState.red = col.rei || col.red || '';

      jec1erState.colegioId = col.id || null;
      jec1erState.colegioNombre = col.ie || '';
      jec1erState.codModular = cleanTextCode(col.codigoModular || col.codigoLocal || '');
      jec1erState.red = col.rei || col.red || '';

      const { director: dirActivo } = getDirectivosActivosForColegio(state, col.id, col.codigoLocal, col.codigoModular);
      if (dirActivo) {
        jecFormState.director = {
          nombres: dirActivo.apellidosNombres || '',
          dni: cleanTextCode(dirActivo.dni || ''),
          telefono: cleanTextCode(dirActivo.telefono || ''),
          correo: dirActivo.correo || '',
          condicion: 'D'
        };
        jec1erState.director = {
          nombres: dirActivo.apellidosNombres || '',
          dni: cleanTextCode(dirActivo.dni || ''),
          telefono: cleanTextCode(dirActivo.telefono || ''),
          correo: dirActivo.correo || '',
          condicion: 'DESIGNADO'
        };
      } else if (col.director) {
        jecFormState.director = {
          nombres: col.director.nombre || '',
          dni: cleanTextCode(col.director.dni || ''),
          telefono: cleanTextCode(col.director.telefono || ''),
          correo: col.director.correo || '',
          condicion: 'D'
        };
        jec1erState.director = {
          nombres: col.director.nombre || '',
          dni: cleanTextCode(col.director.dni || ''),
          telefono: cleanTextCode(col.director.telefono || ''),
          correo: col.director.correo || '',
          condicion: 'DESIGNADO'
        };
      } else {
        jecFormState.director = { nombres: '', dni: '', telefono: '', correo: '', condicion: 'D' };
        jec1erState.director = { nombres: '', dni: '', telefono: '', correo: '', condicion: 'DESIGNADO' };
      }
    }
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
      setCurrentJecVisita(newVis);
      const scrollY = window.scrollY;
      renderUnifiedJecForm(host, ft, state, dbNs, currentUser, navigate, isEditing, newVis, targetColId, editingSubmissionData);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    };
  });

  if (editingSubmissionData && editingSubmissionData.id) {
    const f = host.querySelector('#regForm');
    if (f) f.dataset.editingId = editingSubmissionData.id;
  }
}

/**
 * Renderiza el formulario dinámico completo para cualquier ficha (directivo, rúbricas, JEC coordinadores, etc.)
 */
export function renderDynamicForm({
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
}) {
  const isRubricasAula = ft.id === 'ft_rubricas_aula' || (ft.nombre || '').toLowerCase().includes('rúbricas de observación') || (ft.nombre || '').toLowerCase().includes('monitoreo pedagógico a docente');
  const isDirectivo = !isRubricasAula && ((ft.tipoRespuesta === 'nivel_1_4') || (ft.id === 'ft_directivo') || (ft.nombre || '').toLowerCase().includes('directivo'));
  const normExtras = normalizeExtras(ft.extras);

  const extrasHtml = normExtras.map((ex, i) => {
    const reqAttr = ex.required ? ' required' : '';
    const lower = (ex.label || '').toLowerCase();
    const xid = (ex.id || '').toLowerCase();

    // El campo RED se ubica de forma universal en DATOS DE LA VISITA (#f_red), evitando duplicidad
    if (xid === 'ex_rei' || xid === 'ex_red' || lower === 'red' || lower === 'rei' || lower.startsWith('red ') || lower.startsWith('rei ')) {
      return '';
    }

    // Las horas de inicio y término se ubican de forma estructurada en DATOS DE LA VISITA (#f_hora_inicio, #f_hora_termino), evitando duplicidad
    if (isDirectivo || isRubricasAula) {
      if (xid === 'ex_hora_inicio' || xid === 'ex_hora_fin' || xid === 'ex_hora_termino' ||
          lower.includes('hora de inicio') || lower.includes('hora de término') || lower.includes('hora de termino') || lower.includes('hora de fin') || lower.includes('hora')) {
        return '';
      }
    }

    const dListAttr = lower.includes('ugel') ? ' list="dl_ugel"' : '';
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

  const inst1CompromisosHtml = isRubricasAula ? `
    <div class="panel" style="margin-top:20px;border:1.5px solid #0D9488;border-radius:8px;padding:16px 20px;background:#F8FAFC">
      <div style="background:#0F766E;color:#FFFFFF;padding:8px 12px;border-radius:6px;font-weight:700;font-size:13.5px;letter-spacing:0.2px;margin-bottom:8px">
        III. COMPROMISOS DE MEJORA:
      </div>
      <div style="font-size:12px;color:#334155;line-height:1.45;margin-bottom:12px">
        A partir de las conductas observables registradas por cada uno de los desempeños y del diálogo reflexivo y haciendo uso de preguntas orientadoras (ver protocolo) anote en la primera columna el o los desempeños que el docente requiere mejorar. En la segunda columna, registre los compromisos de mejora relacionados con cada uno de los desempeños.
      </div>

      <table style="width:100%;border-collapse:collapse;font-size:12px;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:6px;overflow:hidden">
        <thead>
          <tr style="background:#042F2E;color:#FFFFFF">
            <th style="padding:9px 12px;text-align:left;width:38%;border-right:1px solid #0F766E;font-size:12px;font-weight:700">Desempeño por mejorar</th>
            <th style="padding:9px 12px;text-align:left;font-size:12px;font-weight:700">Compromisos de mejora</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:10px 12px;vertical-align:top;border-right:1px solid #E2E8F0;width:38%">
              <textarea name="tbl_tbl_compromisos_rubricas_aula_f_comp_1_c_desempeno" data-tabla-id="tbl_compromisos_rubricas_aula" data-fila-id="f_comp_1" data-col-id="c_desempeno" placeholder="Desempeño / Rúbrica por mejorar..." rows="4" style="width:100%;min-height:90px;padding:8px 10px;font-size:12.5px;border:1px solid var(--line);border-radius:4px;box-sizing:border-box;resize:vertical;line-height:1.4"></textarea>
            </td>
            <td style="padding:10px 12px;vertical-align:top">
              <textarea name="tbl_tbl_compromisos_rubricas_aula_f_comp_1_c_compromiso" data-tabla-id="tbl_compromisos_rubricas_aula" data-fila-id="f_comp_1" data-col-id="c_compromiso" placeholder="Compromiso asumido en relación al desempeño..." rows="4" style="width:100%;min-height:90px;padding:8px 10px;font-size:12.5px;border:1px solid var(--line);border-radius:4px;box-sizing:border-box;resize:vertical;line-height:1.4"></textarea>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  ` : '';

  const inst2Parte2Html = isRubricasAula ? `
    <div class="panel" style="margin-top:20px;border:1.5px solid #0284C7;border-radius:8px;padding:16px 20px;background:#F8FAFC">
      <div style="background:#0369A1;color:#FFFFFF;padding:10px 14px;border-radius:6px;font-weight:700;font-size:13.5px;letter-spacing:0.3px;margin-bottom:12px">
        INSTRUMENTO 2: FICHA DE MONITOREO A LA PLANIFICACIÓN CURRICULAR DOCENTE EN EBR-EBA 2026 (DRELM)
      </div>
      
      <div style="margin-bottom:12px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:4px solid #0369A1;padding:10px 12px;border-radius:4px">
        <div style="font-weight:700;font-size:12.5px;color:#0F172A;margin-bottom:4px">I. INSTRUCCIONES:</div>
        <div style="font-size:12px;color:#334155;line-height:1.45">
          Estimado monitor, para el desarrollo del recojo de información de la planificación curricular docente, solicite la carpeta pedagógica al inicio de la jornada escolar o en la visita al aula.
        </div>
      </div>

      <div style="margin-bottom:14px;background:#FFFFFF;border:1px solid #E2E8F0;border-left:4px solid #0D9488;padding:10px 12px;border-radius:4px">
        <div style="font-weight:700;font-size:12.5px;color:#0F172A;margin-bottom:4px">II. DATOS INFORMATIVOS DE LA PLANIFICACIÓN CURRICULAR DOCENTE:</div>
        <div style="font-size:12px;color:#334155;line-height:1.45">
          La información recogida en este ítem describe las formas organizativas de la planificación y la ejecución de la sesión/actividad planificada.
        </div>
      </div>

      <!-- 2.1 Formas organizativas -->
      <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:6px;padding:12px 14px;margin-bottom:14px">
        <div style="font-weight:700;font-size:12.5px;color:#0F172A;margin-bottom:4px">
          2.1 Formas organizativas de la planificación
        </div>
        <div style="font-size:11.5px;color:#64748B;margin-bottom:10px">
          El docente planifica sus sesiones de clase haciendo uso de proyectos, unidades de aprendizaje, talleres, u otros.
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:18px;align-items:center;padding:10px 14px;background:#F1F5F9;border-radius:6px">
          <label style="display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#1E293B;cursor:pointer">
            <input type="checkbox" name="tbl_tbl_datos_planif_2_1_f_2_1_c_proyectos" data-tabla-id="tbl_datos_planif_2_1" data-fila-id="f_2_1" data-col-id="c_proyectos" value="1" style="width:16px;height:16px;cursor:pointer">
            PROYECTOS
          </label>
          <label style="display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#1E293B;cursor:pointer">
            <input type="checkbox" name="tbl_tbl_datos_planif_2_1_f_2_1_c_unidades" data-tabla-id="tbl_datos_planif_2_1" data-fila-id="f_2_1" data-col-id="c_unidades" value="1" style="width:16px;height:16px;cursor:pointer">
            UNIDADES DE APRENDIZAJE
          </label>
          <label style="display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#1E293B;cursor:pointer">
            <input type="checkbox" name="tbl_tbl_datos_planif_2_1_f_2_1_c_talleres" data-tabla-id="tbl_datos_planif_2_1" data-fila-id="f_2_1" data-col-id="c_talleres" value="1" style="width:16px;height:16px;cursor:pointer">
            TALLERES
          </label>
          <label style="display:inline-flex;align-items:center;gap:7px;font-size:12px;font-weight:600;color:#1E293B;cursor:pointer">
            <input type="checkbox" name="tbl_tbl_datos_planif_2_1_f_2_1_c_otros" data-tabla-id="tbl_datos_planif_2_1" data-fila-id="f_2_1" data-col-id="c_otros" value="1" style="width:16px;height:16px;cursor:pointer">
            OTROS
          </label>
        </div>
      </div>

      <!-- 2.2 Ejecución de la sesión -->
      <div style="background:#FFFFFF;border:1px solid #CBD5E1;border-radius:6px;padding:12px 14px">
        <div style="font-weight:700;font-size:12.5px;color:#0F172A;margin-bottom:4px">
          2.2 Ejecución de la sesión/actividad planificada
        </div>
        <div style="font-size:11.5px;color:#64748B;margin-bottom:10px">
          La sesión/actividad de aprendizaje planificada es ejecutada el día de la observación o visita al aula, según programación.
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:14px;align-items:center">
          <div style="display:inline-flex;gap:18px;align-items:center;padding:7px 16px;background:#F1F5F9;border-radius:6px">
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#059669;cursor:pointer">
              <input type="checkbox" class="chk-planif-ejecucion" name="tbl_tbl_datos_planif_2_2_f_2_2_c_si" data-tabla-id="tbl_datos_planif_2_2" data-fila-id="f_2_2" data-col-id="c_si" value="1" style="width:16px;height:16px;cursor:pointer">
              SI
            </label>
            <label style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:700;color:#DC2626;cursor:pointer">
              <input type="checkbox" class="chk-planif-ejecucion" name="tbl_tbl_datos_planif_2_2_f_2_2_c_no" data-tabla-id="tbl_datos_planif_2_2" data-fila-id="f_2_2" data-col-id="c_no" value="1" style="width:16px;height:16px;cursor:pointer">
              NO
            </label>
          </div>
          <div style="flex:1;min-width:260px">
            <input type="text" name="tbl_tbl_datos_planif_2_2_f_2_2_c_observaciones" data-tabla-id="tbl_datos_planif_2_2" data-fila-id="f_2_2" data-col-id="c_observaciones" placeholder="OBSERVACIONES..." style="width:100%;font-size:12px;padding:7px 10px;border:1px solid var(--line);border-radius:6px;box-sizing:border-box">
          </div>
        </div>
      </div>
    </div>
  ` : '';

  const inst2Parte4y5Html = isRubricasAula ? `
    <div class="panel" style="margin-top:20px;border:1.5px solid #0D9488;border-radius:8px;padding:16px 20px;background:#F8FAFC">
      <!-- IV. OBSERVACIONES -->
      <div style="margin-bottom:18px">
        <div style="font-weight:700;font-size:13px;color:#0F172A;margin-bottom:4px">
          IV. OBSERVACIONES
        </div>
        <div style="font-size:12px;color:#475569;margin-bottom:8px">
          En caso de no contar con la carpeta de planificación curricular o presentarse incidencias pedagógicas, registre el sustento en este numeral.
        </div>
        <textarea name="tbl_tbl_observaciones_docente_f_obs_planif_c_detalle_obs" data-tabla-id="tbl_observaciones_docente" data-fila-id="f_obs_planif" data-col-id="c_detalle_obs" placeholder="Detalle de observaciones y sustento pedagógico..." style="width:100%;min-height:70px;padding:8px 10px;font-size:12px;border:1px solid #CBD5E1;border-radius:6px;box-sizing:border-box;resize:vertical"></textarea>
      </div>

      <!-- V. ASPECTOS PARA RETROALIMENTACIÓN -->
      <div>
        <div style="background:#0F766E;color:#FFFFFF;padding:8px 12px;border-radius:6px;font-weight:700;font-size:13px;letter-spacing:0.2px;margin-bottom:8px">
          V. ASPECTOS PARA RETROALIMENTACIÓN AL DOCENTE EN RELACIÓN A LOS ÍTEMS OBSERVADAS EN LA PLANIFICACIÓN CURRICULAR
        </div>
        <div style="font-size:12px;color:#475569;margin-bottom:10px">
          Cuadro de diálogo reflexivo y retroalimentación pedagógica a partir de los ítems observados en la planificación curricular.
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;background:#FFFFFF;border:1px solid #CBD5E1;border-radius:6px;overflow:hidden">
          <thead>
            <tr style="background:#042F2E;color:#FFFFFF">
              <th style="padding:8px 12px;text-align:left;width:26%;border-right:1px solid #0F766E;font-size:12px">Aspectos</th>
              <th style="padding:8px 12px;text-align:left;font-size:12px">Detalle de la retroalimentación y compromisos acordados</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 12px;font-weight:700;color:#0F172A;background:#F8FAFC;border-right:1px solid #E2E8F0;vertical-align:top">
                FORTALEZAS
              </td>
              <td style="padding:8px 10px">
                <textarea name="tbl_tbl_retroalimentacion_planificacion_f_fortalezas_c_retroalimentacion" data-tabla-id="tbl_retroalimentacion_planificacion" data-fila-id="f_fortalezas" data-col-id="c_retroalimentacion" placeholder="Describa las principales fortalezas observadas en la planificación curricular del docente..." style="width:100%;min-height:55px;padding:6px 8px;font-size:12px;border:1px solid var(--line);border-radius:4px;box-sizing:border-box;resize:vertical"></textarea>
              </td>
            </tr>
            <tr style="border-bottom:1px solid #E2E8F0">
              <td style="padding:10px 12px;font-weight:700;color:#0F172A;background:#F8FAFC;border-right:1px solid #E2E8F0;vertical-align:top">
                ASPECTOS DE MEJORA
              </td>
              <td style="padding:8px 10px">
                <textarea name="tbl_tbl_retroalimentacion_planificacion_f_aspectos_mejora_c_retroalimentacion" data-tabla-id="tbl_retroalimentacion_planificacion" data-fila-id="f_aspectos_mejora" data-col-id="c_retroalimentacion" placeholder="Describa los aspectos pedagógicos a fortalecer o mejorar..." style="width:100%;min-height:55px;padding:6px 8px;font-size:12px;border:1px solid var(--line);border-radius:4px;box-sizing:border-box;resize:vertical"></textarea>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px;font-weight:700;color:#0F172A;background:#F8FAFC;border-right:1px solid #E2E8F0;vertical-align:top">
                COMPROMISOS
              </td>
              <td style="padding:8px 10px">
                <textarea name="tbl_tbl_retroalimentacion_planificacion_f_compromisos_c_retroalimentacion" data-tabla-id="tbl_retroalimentacion_planificacion" data-fila-id="f_compromisos" data-col-id="c_retroalimentacion" placeholder="Acuerdos y compromisos pedagógicos asumidos por el docente..." style="width:100%;min-height:55px;padding:6px 8px;font-size:12px;border:1px solid var(--line);border-radius:4px;box-sizing:border-box;resize:vertical"></textarea>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  ` : '';

    const seccionesHtml = ft.secciones.map((sec, sIdx) => {
    const items = sec.items.map((it, iIdx) => {
      // Clave única garantizada en el DOM para evitar que radio buttons colisionen entre secciones
      const itemDomKey = `s${sIdx + 1}_i${iIdx + 1}_${it.id || iIdx}`;
      const optsHtml = activeOptions.map(o => {
        const descTooltip = (ft.tipoRespuesta === 'nivel_1_4' && DESCRIPTORES_NIVEL_1_4[o.v])
          ? `title="Nivel ${o.l}: ${esc(DESCRIPTORES_NIVEL_1_4[o.v].descripcion)}"`
          : '';
        return '<label class="optBtn" ' + descTooltip + '><input type="radio" name="item_' + itemDomKey + '" value="' + o.v + '"><span>' + o.l + '</span></label>';
      }).join('');

      const itemNumDisplay = (it.num !== undefined && it.num !== null && it.num !== '') ? (it.num + '.') : ((iIdx + 1) + '.');
      const obsPlaceholder = it.evidencia ? esc(it.evidencia) : 'Describa aquí los hallazgos u observaciones identificados en este indicador...';
      const cleanTexto = (it.texto || '').replace(/^\s*\d+[\.\)\-]\s*/, '');
      const evidenciaHtml = `
        <div class="itemObsWrap itemEvidenciaWrap itemEvidencia" id="evid_wrap_${itemDomKey}" style="display:none;margin-top:6px">
          <textarea class="evidenciaInput" name="evidencia_${itemDomKey}" id="evid_${itemDomKey}" rows="2" placeholder="${obsPlaceholder}" aria-label="Observaciones para indicador ${itemNumDisplay}" style="width:100%;font-size:12px;padding:6px 10px;border:1.5px solid #CBD5E1;border-radius:6px;min-height:44px;box-sizing:border-box"></textarea>
        </div>
      `;

      return '<div class="itemRow" data-item-id="' + it.id + '" data-item-key="' + itemDomKey + '">' +
        '<div class="itxt" style="flex:1;min-width:240px">' +
          '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px">' +
            '<span class="itemNum">' + itemNumDisplay + '</span> ' +
            '<span style="flex:1;min-width:200px">' + esc(cleanTexto) + '</span>' +
            '<button type="button" class="btnToggleObs btnToggleEvidencia" data-target-obs="evid_wrap_' + itemDomKey + '" data-target-evid="evid_wrap_' + itemDomKey + '" title="Describir observaciones o hallazgos">' +
              '💬 Observación' +
            '</button>' +
          '</div>' +
          evidenciaHtml +
        '</div>' +
        '<div class="optGroup">' + optsHtml + '</div>' +
        '</div>';
    }).join('');

    const secBadgeDisplay = sec.num ? esc(sec.num) : ('Seccin ' + (sIdx + 1));
    const secCardHtml = '<div class="formSecCard">' +
      '<div class="formSecHeader">' +
      '<span class="formSecBadge">' + secBadgeDisplay + '</span>' +
      '<h4 class="formSecTitle">' + esc(sec.nombre) + '</h4>' +
      '<span class="formSecCount">' + sec.items.length + ' indicadores</span>' +
      '</div>' +
      '<div class="formSecBody">' + items + '</div>' +
      '</div>';

    if (isRubricasAula && sIdx === 0) {
      return secCardHtml + inst1CompromisosHtml + inst2Parte2Html;
    }
    if (isRubricasAula && sIdx === 1) {
      return secCardHtml + inst2Parte4y5Html;
    }
    return secCardHtml;
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
  ` : (isRubricasAula ? '' : `
    <div class="panel">
      <div class="sectionHeaderTitle">COMPROMISOS DE MEJORA</div>
      <div class="sectionTitle" style="margin-top:0">Compromisos pendientes anteriores</div>
      <div id="prevCompList"></div>
      <div class="sectionTitle" style="margin-top:16px">Nuevos compromisos</div>
      <div id="compList"></div>
      <button type="button" class="btn secondary small" id="addCompBtn" style="margin-top:10px">+ Agregar compromiso</button>
    </div>
  `);

  // Campos de horas dedicados para la visita
  const horasVisitaHtml = (isDirectivo || isRubricasAula) ? `
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

  // Tablas cuantitativas especializadas si la ficha las tiene configuradas
  const tablasHtml = (Array.isArray(ft.tablas) && ft.tablas.length > 0 && !isRubricasAula) ? (
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">TABLAS CUANTITATIVAS ESPECIALIZADAS</div>' +
    ft.tablas.map((tbl, ti) => {
      const omitirCategoria = tbl.tipo === 'vacia' || tbl.sinColumnaCategoria === true || (tbl.id && String(tbl.id).startsWith('tbl_custom_') && tbl.sinColumnaCategoria !== false);
      const rows = (tbl.filas && tbl.filas.length > 0) ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }];
      return '<div class="customTableContainer" style="margin-bottom:18px">' +
        '<div style="font-weight:700;font-size:13px;color:var(--navy-900);margin-bottom:4px">' + esc(tbl.titulo || 'Tabla') + '</div>' +
        (tbl.descripcion ? '<div style="font-size:11.5px;color:var(--text-600);margin-bottom:8px">' + esc(tbl.descripcion) + '</div>' : '') +
        '<div style="overflow-x:auto">' +
        '<table class="previewCustomTable" style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:8px">' +
        '<thead><tr>' +
        (!omitirCategoria ? '<th style="border:1px solid #1E293B;padding:7px 10px;background:#0B192C;color:#FFFFFF;text-align:left;font-weight:700;font-size:12px">' + esc(tbl.nombreColumnaCategoria || 'Fila / Categoría') + '</th>' : '') +
        (tbl.columnas || []).map(col => '<th style="border:1px solid #1E293B;padding:7px 10px;background:#0B192C;color:#FFFFFF;text-align:center;font-weight:700;font-size:12px">' + esc(col.nombre) + '</th>').join('') +
        '</tr></thead>' +
        '<tbody>' +
        rows.map((r, ri) => {
          const fId = r.id || ('f_' + ri);
          return '<tr>' +
            (!omitirCategoria ? '<td style="border:1px solid var(--line);padding:6px 8px;font-weight:600;color:var(--text-700)">' + esc(r.etiqueta) + '</td>' : '') +
            (tbl.columnas || []).map((col, ci) => {
              const cId = col.id || ('c_' + ci);
              const inpName = `tbl_${tbl.id || ti}_${fId}_${cId}`;
              const isFirstCol = ci === 0 && omitirCategoria;
              const defaultVal = isFirstCol ? (r.etiqueta || '') : '';
              const isArea = col.tipo === 'area' || col.tipo === 'textarea' || col.tipo === 'texto_largo';
              const inputHtml = isArea
                ? '<textarea name="' + inpName + '" ' +
                  'data-tabla-id="' + (tbl.id || ti) + '" data-fila-id="' + fId + '" data-col-id="' + cId + '" ' +
                  'placeholder="Escribir detalle..." rows="3" ' +
                  'style="width:100%;border:1px solid var(--line);border-radius:4px;padding:6px 8px;font-size:12px;font-family:inherit;min-height:56px;box-sizing:border-box;resize:vertical">' + esc(defaultVal) + '</textarea>'
                : '<input type="' + (col.tipo === 'numero' ? 'number' : 'text') + '" ' +
                  'name="' + inpName + '" ' +
                  'value="' + esc(defaultVal) + '" ' +
                  'data-tabla-id="' + (tbl.id || ti) + '" data-fila-id="' + fId + '" data-col-id="' + cId + '" ' +
                  'placeholder="' + (col.tipo === 'numero' ? '0' : 'Escribir...') + '" ' +
                  'style="width:100%;border:1px solid var(--line);border-radius:4px;padding:4px 6px;font-size:12px;text-align:' + (col.tipo === 'numero' ? 'center' : 'left') + ';font-weight:' + (isFirstCol ? '600' : 'normal') + '">';
              return '<td style="border:1px solid var(--line);padding:4px;text-align:center">' + inputHtml + '</td>';
            }).join('') +
            '</tr>';
        }).join('') +
        '</tbody>' +
        '</table>' +
        '</div>' +
        '</div>';
    }).join('') +
    '</div>'
  ) : '';

  host.innerHTML = '' +
    '<form id="regForm" autocomplete="off">' +
    uploadPanel +
    '<div class="panel">' +
        '<div class="sectionHeaderTitle">DATOS DE LA VISITA</div>' +
    '<div class="fieldGrid">' +
    '<div class="field" style="grid-column:span 2">' +
    '<label for="f_institucion">Institucin educativa / CEBE / PRITE *</label>' +
    '<div class="ieSearchWrap" id="ieSearchWrap">' +
    '<input type="text" id="f_institucion" autocomplete="off" placeholder="Buscar por nombre o cdigo modular..." required>' +
    '<div class="ieDropdown" id="ieDropdown"></div>' +
    '</div>' +
    '<span id="regColegioHint" style="display:none;font-size:11.5px;color:var(--primary-dark);margin-top:4px;display:block"></span>' +
    '</div>' +
    '<div class="field"><label for="f_red">RED</label><input type="text" id="f_red" placeholder="Ej: 15" list="dl_red"></div>' +
    '<div class="field"><label for="f_fecha">Fecha *</label><input type="date" id="f_fecha" value="' + todayStr() + '" required></div>' +
    '<div class="field"><label for="f_visita">Nº de visita *</label><input type="number" id="f_visita" min="1" value="1" required></div>' +
    horasVisitaHtml +
    '</div>' +
    (extrasHtml ? '<div class="sectionHeaderTitle" style="margin-top:20px">DATOS GENERALES DE LA FICHA</div><div class="fieldGrid">' + extrasHtml + '</div>' : '') +
    '<datalist id="dl_ugel">' + seedSuggestions('ugel', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
    '<datalist id="dl_red">' + seedSuggestions('red', state.submissions).map(v => '<option value="' + esc(v) + '">').join('') + '</datalist>' +
    '</div>' +
    tablasHtml +
    '<div class="panel">' +
    '<div class="sectionHeaderTitle">ASPECTOS A MONITOREAR <small style="font-weight:400;color:var(--text-600);text-transform:none;margin-left:8px">' + RESPONSE_LABELS[ft.tipoRespuesta] + '</small></div>' +
    rubricaPanelHtml +
    tutoriaNivelBannerHtml +
    seccionesHtml +
    '</div>' +
    sintesisPanelHtml +
        (!isRubricasAula ? (
      '<div class="panel">' +
      '<div class="sectionHeaderTitle">OBSERVACIONES GENERALES</div>' +
      '<textarea id="f_observaciones" placeholder="Hallazgos, evidencias verificables, notas de la visita..."></textarea>' +
      '</div>'
    ) : '') +
    
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
          sumBadge.textContent = `${currentPts} / 63 puntos • ${nivelInfo.nivel}`;
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
          sumBadge.textContent = `${currentPts} / 51 puntos • ${nivelInfo.nivel}`;
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
  // Toggle de visibilidad de observaciones / hallazgos en indicadores
  host.querySelectorAll('.btnToggleObs, .btnToggleEvidencia').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const targetId = btn.dataset.targetObs || btn.dataset.targetEvid;
      if (!targetId) return;
      const wrap = host.querySelector('#' + targetId) || document.getElementById(targetId);
      if (!wrap) return;

      const isHidden = (wrap.style.display === 'none' || getComputedStyle(wrap).display === 'none');
      if (isHidden) {
        wrap.style.display = 'block';
        btn.classList.add('active');
        btn.textContent = '✕ Ocultar obs.';
        const inp = wrap.querySelector('input, textarea');
        if (inp) inp.focus();
      } else {
        wrap.style.display = 'none';
        btn.classList.remove('active');
        const inp = wrap.querySelector('input, textarea');
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
  });

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
      (c.rei ? ' • ' + esc(c.rei) : '') +
      (c.director && c.director.nombre ? ' • Dir: ' + esc(c.director.nombre) : '') +
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
    setRegSelectedColegioIdVal(c.id);

    const redInp = document.getElementById('f_red');
    if (redInp) {
      redInp.value = c.rei || c.red || '';
    }

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
      } else if (lower.includes('tel') || lower.includes('cel')) {
        matchVal = dirActivo ? dirActivo.telefono : (c.director && c.director.telefono ? c.director.telefono : (c.telefono || ''));
      } else if (lower.includes('correo') || lower.includes('email')) {
        matchVal = dirActivo ? dirActivo.correo : (c.director && c.director.correo ? c.director.correo : (c.email || ''));
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

    // Auto-sugerir / completar especialista
    const currentFt = state.selectedFichaType || (state.currentFicha ? state.currentFicha.tipo : '') || '';
    if (isFichaEspecialistaJec(currentFt)) {
      respInputs.forEach(rInp => {
        rInp.value = ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
        const hEl = rInp.closest('.field') ? rInp.closest('.field').querySelector('.respHint') : null;
        if (hEl) {
          hEl.textContent = '✓ Especialista de JEC responsable: ' + ESPECIALISTA_JEC_OFICIAL.nombresApellidos + ' (AGEBRE — UGEL 03)';
          hEl.style.display = 'block';
        }
      });
    } else if (state.responsables && state.responsables.length) {
      let matchedResp = null;

      const officialResp = getResponsableForColegio(c, ft, state);
      if (officialResp && officialResp !== '—' && officialResp !== 'Por asignar') {
        const offNorm = normalizeText(officialResp);
        matchedResp = state.responsables.find(r => {
          const rNom = normalizeText(r.nombresApellidos || r.especialista || '');
          return rNom && (rNom === offNorm || rNom.includes(offNorm) || offNorm.includes(rNom));
        });
      }

      if (!matchedResp && c.responsableId) {
        matchedResp = state.responsables.find(r => r.id === c.responsableId);
      }
      if (!matchedResp && c.responsable) {
        const cRespNorm = normalizeText(c.responsable);
        matchedResp = state.responsables.find(r => {
          const rNom = normalizeText(r.nombresApellidos || '');
          return rNom && (rNom === cRespNorm || rNom.includes(cRespNorm) || cRespNorm.includes(rNom));
        });
      }

      if (!matchedResp && c.id) {
        matchedResp = state.responsables.find(r => Array.isArray(r.colegios) && r.colegios.includes(c.id));
      }

      if (!matchedResp && (c.rei || c.red)) {
        const cReiNum = normalizeReiNumber(c.rei || c.red);
        const cReiNorm = normalizeText(c.rei || c.red);
        const redMatches = state.responsables.filter(r => {
          if (!r.red) return false;
          if (cReiNum) {
            const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
            if (rNums.includes(cReiNum)) return true;
          }
          const rRedNorm = normalizeText(r.red);
          return rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm);
        });
        if (redMatches.length === 1) {
          matchedResp = redMatches[0];
        }
      }

      if (matchedResp) {
        respInputs.forEach(rInp => {
          const hEl = rInp.closest('.field') ? rInp.closest('.field').querySelector('.respHint') : null;
          selectResponsable(matchedResp, rInp, hEl);
        });
      } else if (c.responsable && !c.responsable.includes('@') && !/^\d+$/.test(c.responsable.trim())) {
        respInputs.forEach(rInp => {
          rInp.value = c.responsable.trim();
          const hEl = rInp.closest('.field') ? rInp.closest('.field').querySelector('.respHint') : null;
          if (hEl) {
            hEl.textContent = '✓ Especialista asignado: ' + c.responsable.trim();
            hEl.style.display = 'block';
          }
        });
      }
    }

    if (hint) {
      hint.style.display = 'block';
      hint.textContent = '✓ Vinculada al padrón' +
        (c.rei ? ' • ' + c.rei : '') +
        (c.dependencia ? ' • ' + c.dependencia : ' • UGEL 03') +
        (c.distrito ? ' • ' + c.distrito : '') +
        (c.director && c.director.nombre ? ' • Dir: ' + c.director.nombre : '') + '.';
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
        (r.red ? ' • ' + r.red : '') +
        (r.modalidad ? ' • ' + r.modalidad : '') +
        (r.celular ? ' • Cel: ' + r.celular : '');
    }

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
          (r.red ? ' • <strong>' + esc(r.red) + '</strong>' : '') +
          (r.distrito ? ' • ' + esc(r.distrito) : '') +
          (r.celular ? ' • Cel: ' + esc(r.celular) : '') +
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

  // Toggle mutuamente exclusivo para casillas de ejecucin en la ficha docente (SI / NO)
  host.querySelectorAll('.chk-planif-ejecucion').forEach(chk => {
    chk.addEventListener('change', () => {
      if (chk.checked) {
        host.querySelectorAll('.chk-planif-ejecucion').forEach(other => {
          if (other !== chk) other.checked = false;
        });
      }
    });
  });
  // ---- Pre-cargar datos si estamos en modo edición ----
  if (editingSubmissionData) {
    const d = editingSubmissionData;
    setTimeout(() => {
      try {
        if (document.getElementById('f_institucion')) {
          document.getElementById('f_institucion').value = d.institucion || '';
          if (document.getElementById('f_red')) {
            let rVal = d.red || d.rei || '';
            if (!rVal && Array.isArray(d.extras)) {
              const exRed = d.extras.find(e => (e.id === 'ex_rei' || e.id === 'ex_red' || (e.label || '').toLowerCase().includes('red') || (e.label || '').toLowerCase().includes('rei')));
              if (exRed) rVal = exRed.value || '';
            }
            document.getElementById('f_red').value = rVal;
          }
          if (document.getElementById('f_fecha')) document.getElementById('f_fecha').value = d.fecha || todayStr();
          if (document.getElementById('f_visita')) document.getElementById('f_visita').value = d.visita || 1;
          if (document.getElementById('f_observaciones')) document.getElementById('f_observaciones').value = d.observaciones || '';
        if (document.getElementById('f_hora_inicio')) {
          const hi = d.horaInicio || d.docenteHoraInicio || (Array.isArray(d.extras) ? d.extras.find(x => x && x.id === 'ex_hora_inicio')?.value : '');
          if (hi) document.getElementById('f_hora_inicio').value = hi;
        }
        if (document.getElementById('f_hora_termino')) {
          const ht = d.horaTermino || d.docenteHoraFin || (Array.isArray(d.extras) ? (d.extras.find(x => x && x.id === 'ex_hora_termino')?.value || d.extras.find(x => x && x.id === 'ex_hora_fin')?.value) : '');
          if (ht) document.getElementById('f_hora_termino').value = ht;
        }
        if (document.getElementById('f_comp_director') && d.compromisoDirector) document.getElementById('f_comp_director').value = d.compromisoDirector;
        if (document.getElementById('f_comp_monitor') && d.compromisoMonitor) document.getElementById('f_comp_monitor').value = d.compromisoMonitor;

        const loadedComp = [...(Array.isArray(d.compromisos) ? d.compromisos : Array.isArray(d.compromisosList) ? d.compromisosList : [])];
        regCompromisos.length = 0;
        loadedComp.forEach(c => regCompromisos.push(c));
        setRegSelectedColegioIdVal(d.colegioId || null);
        renderCompList();

        // Precargar respuestas y evidencias con matching unificado oficial
        const loadedAnswers = Array.isArray(d.respuestas) ? d.respuestas : [];
        const isJec = isFichaJec(ft) || isFichaCoordTutoriaJec(ft) || isFichaCoordPedagogico(ft) || isFichaEspecialistaJec(ft);
        const valMap = buildResponseValMap(loadedAnswers, isJec);
        const evidMap = buildResponseValMap(loadedAnswers.map(ans => ({ ...ans, valor: ans.evidencia })), isJec);

        if (Array.isArray(ft.secciones)) {
          ft.secciones.forEach((sec, sIdx) => {
            (sec.items || []).forEach((it, iIdx) => {
              const itemDomKey = `s${sIdx + 1}_i${iIdx + 1}_${it.id || iIdx}`;
              const valor = resolveItemValue(valMap, it, sec, sIdx, iIdx, isJec);
              const evidencia = resolveItemValue(evidMap, it, sec, sIdx, iIdx, isJec);

              if (valor !== undefined && valor !== null && valor !== '') {
                let radio = document.querySelector('input[name="item_' + itemDomKey + '"][value="' + valor + '"]') ||
                            document.querySelector('input[name="item_' + it.id + '"][value="' + valor + '"]');
                if (!radio && typeof valor === 'string') {
                  const romanMap = { 'I': '1', 'II': '2', 'III': '3', 'IV': '4', '1': '1', '2': '2', '3': '3', '4': '4' };
                  const mapped = romanMap[valor.trim().toUpperCase()] || romanMap[valor.trim()];
                  if (mapped) {
                    radio = document.querySelector('input[name="item_' + itemDomKey + '"][value="' + mapped + '"]') ||
                            document.querySelector('input[name="item_' + it.id + '"][value="' + mapped + '"]');
                  }
                }
                if (radio) radio.checked = true;
              }
              if (evidencia) {
                const evidInp = document.getElementById('evid_' + itemDomKey) || 
                                document.getElementById('evid_' + it.id) || 
                                document.querySelector('textarea[name="evidencia_' + itemDomKey + '"]') ||
                                document.querySelector('textarea[name="evidencia_' + it.id + '"]');
                if (evidInp) {
                  evidInp.value = evidencia;
                  const wrap = document.getElementById('evid_wrap_' + itemDomKey) || document.getElementById('evid_wrap_' + it.id);
                  if (wrap) wrap.style.display = 'block';
                  const btn = document.querySelector(`[data-target-evid="evid_wrap_${itemDomKey}"], [data-target-obs="evid_wrap_${itemDomKey}"]`);
                  if (btn) {
                    btn.classList.add('has-content');
                    btn.textContent = '💬 Observación ✓';
                  }
                }
              }
            });
          });
        }

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
            const l = (ex.label || '').toLowerCase();
            const xid = (ex.id || '').toLowerCase();
            if (l.includes('ugel') && d.ugel) val = d.ugel;
            else if ((l.includes('red') || l.includes('rei')) && d.red) val = d.red;
            else if ((l.includes('código') || l.includes('codigo')) && d.codigoModular) val = d.codigoModular;
            else if ((xid === 'ex_docente' || (l.includes('docente') && l.includes('observado'))) && (d.docente || d.docenteNombre)) val = d.docente || d.docenteNombre;
            else if ((xid === 'ex_dni' || (l.includes('dni') && l.includes('docente'))) && (d.docenteDni || d.dni)) val = d.docenteDni || d.dni;
            else if ((xid === 'ex_nivel' || (l.includes('nivel') && l.includes('educativo'))) && (d.docenteNivel || d.nivel)) val = d.docenteNivel || d.nivel;
            else if ((xid === 'ex_grado' || l.includes('grado')) && (d.docenteGrado || d.grado)) val = d.docenteGrado || d.grado;
            else if ((xid === 'ex_seccion' || l.includes('secci')) && (d.docenteSeccion || d.seccion)) val = d.docenteSeccion || d.seccion;
            else if ((xid === 'ex_area' || l.includes('curricular')) && (d.docenteArea || d.area)) val = d.docenteArea || d.area;
            else if ((xid === 'ex_est_matriculados' || l.includes('matriculado')) && (d.docenteEstMatriculados !== undefined || d.matriculados !== undefined)) val = d.docenteEstMatriculados ?? d.matriculados;
            else if ((xid === 'ex_est_asistentes' || l.includes('asistente')) && (d.docenteEstAsistentes !== undefined || d.asistentes !== undefined)) val = d.docenteEstAsistentes ?? d.asistentes;
            else if ((xid === 'ex_est_discapacidad' || l.includes('discapacidad')) && (d.docenteEstDiscapacidad !== undefined || d.discapacidad !== undefined)) val = d.docenteEstDiscapacidad ?? d.discapacidad;
            else if ((xid === 'ex_monitor' || l.includes('observador')) && (d.docenteMonitor || d.responsable)) val = d.docenteMonitor || d.responsable;
            else if ((xid === 'ex_dir_nombre' || (l.includes('director') && (l.includes('nombre') || !l.includes('dni')) && !l.includes('condici') && !l.includes('correo'))) && d.director) val = d.director;
            else if ((xid === 'ex_dir_dni' || (l.includes('director') && l.includes('dni'))) && (d.directorDni || d.dirDni)) val = d.directorDni || d.dirDni;
            else if ((xid === 'ex_dir_condicion' || (l.includes('director') && l.includes('condici'))) && (d.directorCondicion || d.dirCondicion || d.condicion)) val = d.directorCondicion || d.dirCondicion || d.condicion;
            else if ((xid === 'ex_dir_correo' || (l.includes('director') && (l.includes('correo') || l.includes('email')))) && (d.directorCorreo || d.dirCorreo)) val = d.directorCorreo || d.dirCorreo;
            else if ((xid === 'ex_coord' || (l.includes('coordinador') && l.includes('tutor') && !l.includes('dni') && !l.includes('esp') && !l.includes('cond') && !l.includes('corr'))) && (d.coordinadorTutoria || d.coordTutoriaNombre)) val = d.coordinadorTutoria || d.coordTutoriaNombre;
            else if ((xid === 'ex_coord_dni' || (l.includes('coordinador') && l.includes('dni'))) && (d.coordTutoriaDni || d.coordinadorTutoriaDni)) val = d.coordTutoriaDni || d.coordinadorTutoriaDni;
            else if ((xid === 'ex_coord_esp' || l.includes('especialidad')) && (d.coordTutoriaEspecialidad || d.especialidad)) val = d.coordTutoriaEspecialidad || d.especialidad;
            else if ((xid === 'ex_coord_condicion' || (l.includes('coordinador') && l.includes('condici'))) && (d.coordTutoriaCondicion || d.coordinadorTutoriaCondicion)) val = d.coordTutoriaCondicion || d.coordinadorTutoriaCondicion;
            else if ((xid === 'ex_coord_correo' || (l.includes('coordinador') && (l.includes('correo') || l.includes('email')))) && (d.coordTutoriaCorreo || d.coordinadorTutoriaCorreo)) val = d.coordTutoriaCorreo || d.coordinadorTutoriaCorreo;
            else if ((xid === 'ex_cant_tut' || l.includes('tutores')) && (d.docentesTutores !== undefined || d.docentesTutoresACargo !== undefined)) val = d.docentesTutores !== undefined ? d.docentesTutores : d.docentesTutoresACargo;
            else if ((xid === 'ex_horas_visita' || l.includes('horas')) && (d.horasVisita || d.horas)) val = d.horasVisita || d.horas;
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
                if (inp.tagName === 'SELECT' && !Array.from(inp.options).some(o => o.value === val)) {
                  inp.value = 'Otro';
                  const otroInp = document.getElementById(inp.id + '_otro');
                  if (otroInp) { otroInp.style.display = 'block'; otroInp.value = val; }
                }
              }
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

        // Precargar respuestas de tablas cuantitativas especializadas
        if (d.tablasRespuestas && typeof d.tablasRespuestas === 'object') {
          Object.keys(d.tablasRespuestas).forEach(tblId => {
            const tblData = d.tablasRespuestas[tblId];
            if (tblData && typeof tblData === 'object') {
              Object.keys(tblData).forEach(fId => {
                const rowData = tblData[fId];
                if (rowData && typeof rowData === 'object') {
                  Object.keys(rowData).forEach(cId => {
                    const inp = host.querySelector(`[name="tbl_${tblId}_${fId}_${cId}"]`);
                    if (inp && rowData[cId] !== undefined) {
                      if (inp.type === 'checkbox') {
                        inp.checked = Boolean(rowData[cId] === '1' || rowData[cId] === true || rowData[cId] === 'true' || rowData[cId] === 'SI' || rowData[cId] === 'S');
                      } else {
                        inp.value = rowData[cId];
                      }
                    }
                  });
                }
              });
            }
          });
        }

                // Compatibilidad hacia atrás con registros anteriores de planificación curricular
        if (d && d.tablasRespuestas && d.tablasRespuestas.tbl_datos_planificacion && !d.tablasRespuestas.tbl_datos_planif_2_1) {
          const oldTbl = d.tablasRespuestas.tbl_datos_planificacion;
          const fFormas = oldTbl.f_formas ? (oldTbl.f_formas.c_detalle || '') : '';
          if (fFormas) {
            const fLow = fFormas.toLowerCase();
            if (fLow.includes('proyecto')) { const inp = host.querySelector('[name="tbl_tbl_datos_planif_2_1_f_2_1_c_proyectos"]'); if (inp) inp.checked = true; }
            if (fLow.includes('unidad')) { const inp = host.querySelector('[name="tbl_tbl_datos_planif_2_1_f_2_1_c_unidades"]'); if (inp) inp.checked = true; }
            if (fLow.includes('taller')) { const inp = host.querySelector('[name="tbl_tbl_datos_planif_2_1_f_2_1_c_talleres"]'); if (inp) inp.checked = true; }
            if (fLow.includes('otro')) { const inp = host.querySelector('[name="tbl_tbl_datos_planif_2_1_f_2_1_c_otros"]'); if (inp) inp.checked = true; }
          }
          const fEjec = oldTbl.f_ejecucion ? (oldTbl.f_ejecucion.c_detalle || '') : '';
          if (fEjec) {
            const eLow = fEjec.toLowerCase();
            if (eLow === 'si' || eLow === 'sí' || eLow.startsWith('si') || eLow.startsWith('sí')) {
              const inpSi = host.querySelector('[name="tbl_tbl_datos_planif_2_2_f_2_2_c_si"]');
              if (inpSi) inpSi.checked = true;
            } else if (eLow === 'no' || eLow.startsWith('no')) {
              const inpNo = host.querySelector('[name="tbl_tbl_datos_planif_2_2_f_2_2_c_no"]');
              if (inpNo) inpNo.checked = true;
            }
            const inpObs = host.querySelector('[name="tbl_tbl_datos_planif_2_2_f_2_2_c_observaciones"]');
            if (inpObs && !inpObs.value) inpObs.value = fEjec;
          }
        }
        if (isRubricasAula && d && d.observaciones) {
          const obsInp = host.querySelector('[name="tbl_tbl_observaciones_docente_f_obs_planif_c_detalle_obs"]');
          if (obsInp && !obsInp.value) obsInp.value = d.observaciones;
        }

        updateProgressBadge();
        if (hint && d.institucion) {
          hint.style.display = 'block';
          hint.textContent = '✓ Datos precargados para edición.';
        }
      }
      } catch (preloadErr) {
        console.error('Error precargando datos para edición:', preloadErr);
      }
    }, 0);
  } else if (targetColId || targetVisita) {
    setTimeout(() => {
      if (targetColId) {
        const col = (state.colegios || []).find(c => c.id === targetColId || c.codigoLocal === targetColId || c.codigoModular === targetColId);
        if (col) {
          selectColegio(col);
        }
      }
      if (targetVisita) {
        const visInp = document.getElementById('f_visita');
        if (visInp) visInp.value = targetVisita;
        normExtras.forEach(ex => {
          const l = (ex.label || '').toLowerCase();
          if (l.includes('visita') || l.includes('momento')) {
            const eInp = document.querySelector('[data-extra-id="' + ex.id + '"]');
            if (eInp && !eInp.value) {
              if (eInp.tagName === 'SELECT') {
                const optMatch = Array.from(eInp.options).find(o => o.value.includes(String(targetVisita)) || o.textContent.includes(String(targetVisita)));
                if (optMatch) eInp.value = optMatch.value;
                else eInp.value = String(targetVisita);
              } else {
                eInp.value = String(targetVisita);
              }
            }
          }
        });
      }
    }, 0);
  }

  const addCompBtn = document.getElementById('addCompBtn') || host.querySelector('#addCompBtn');
  if (addCompBtn) {
    addCompBtn.addEventListener('click', () => {
      regCompromisos.push({ texto: '', responsable: '', plazo: '' });
      renderCompList();
    });
  }
  renderCompList();

  // Sincronizar estado visual de los botones de observación en tiempo real
  host.querySelectorAll('.evidenciaInput').forEach(inp => {
    inp.addEventListener('input', () => {
      const wrap = inp.closest('.itemObsWrap, .itemEvidenciaWrap');
      if (wrap) {
        const btn = host.querySelector(`[data-target-obs="${wrap.id}"], [data-target-evid="${wrap.id}"]`);
        if (btn) {
          if (inp.value.trim()) {
            btn.classList.add('has-content');
            btn.textContent = '💬 Observación ✓';
          } else {
            btn.classList.remove('has-content');
            btn.textContent = '💬 Observación';
          }
        }
      }
    });
  });

  const cancelFormBtn = document.getElementById('cancelFormBtn');
  if (cancelFormBtn) {
    cancelFormBtn.addEventListener('click', () => {
      if (editingSubmissionId) {
        resetRegistrationSessionState();
        if (navigate) navigate('consolidado');
      } else {
        if (confirm('¿Deseas cancelar el registro? Se descartarán los cambios ingresados.')) {
          resetRegistrationSessionState();
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

