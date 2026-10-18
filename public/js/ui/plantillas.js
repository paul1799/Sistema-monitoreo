/* =========================================================================
   ui/plantillas.js — Gestor y diseñador visual de tipos de ficha y plantillas
   ========================================================================= */

import {
  esc,
  showToast,
  todayStr,
  genId,
  normalizeText,
  FICHA_PALETTE,
  getFichaColor,
  getFichaModalidad,
  cleanForFirestore,
  lockBodyScroll,
  unlockBodyScroll,
  forceResetBodyScroll
} from './core-utils.js';
import {
  RESPONSE_OPTIONS,
  RESPONSE_LABELS,
  OPTION_COLORS
} from './scoring.js';
import {
  DEFAULT_AREAS,
  DEFAULT_PLANTILLAS
} from './modales.js';
import { PLANTILLAS_BASE_OFICIALES } from '../catalogo-plantillas-base.js';
import { renderRegistrarTab, setRegistrarSubTab } from './registrar.js';
import { deduplicateTwinSubmissions } from './consolidado.js';
async function verifyAdminPassword(pw, adminEmail) {
  const authModule = await import('../auth.js');
  return authModule.verifyAdminPassword(pw, adminEmail);
}


let tiposView = 'list';
let builderState = null;
let builderEditingId = null;

export function normalizeExtras(extras) {
  if (!Array.isArray(extras)) return [];
  return extras.map((ex, idx) => {
    if (!ex) return null;
    if (typeof ex === 'string') {
      return { id: 'hdr_' + idx, label: ex, tipo: 'texto', required: false, opciones: '' };
    }
    const safeLabel = (ex.label || '').trim();
    const safeId = ex.id || ('hdr_' + (safeLabel ? safeLabel.replace(/[^a-z0-9]+/gi, '_').toLowerCase() : idx) + '_' + idx);
    let safeTipo = (ex.tipo || 'texto').toLowerCase();
    if (!['texto', 'numero', 'fecha', 'si_no', 'select', 'textarea'].includes(safeTipo)) safeTipo = 'texto';
    const safeOpts = Array.isArray(ex.opciones) ? ex.opciones.join(', ') : (typeof ex.opciones === 'string' ? ex.opciones : '');
    return {
      id: safeId,
      label: safeLabel,
      tipo: safeTipo,
      required: !!ex.required,
      opciones: safeOpts,
    };
  }).filter(Boolean);
}

let plantillasSearchQuery = '';
let builderMode = 'visual'; // 'visual' | 'json'
let builderJsonUnlocked = false; // Requiere autenticación con contraseña de admin
let builderPreviewMode = 'formulario'; // 'formulario' | 'documento'
let builderActiveVisitPreview = 0; // índice de la visita simulada en vista previa
let builderActiveVisitTab = 0; // índice de la visita activa en el editor de secciones diferenciadas
let builderMobileTab = 'editor'; // 'editor' | 'preview'
let builderIsDirty = false;
let builderTestAnswers = {};

export function cleanBuilderStateForExport(bs) {
  if (!bs) return {};
  const res = {
    id: builderEditingId || undefined,
    nombre: bs.nombre || '',
    nombreCorto: bs.nombreCorto || bs.nombre || '',
    descripcion: bs.descripcion || '',
    icono: bs.icono || '📋',
    color: bs.color || (FICHA_PALETTE[0] || {}).hex || '#1E40AF',
    modalidad: bs.modalidad || 'General',
    tipoRespuesta: bs.tipoRespuesta || 'si_no',
    regla_nivel: bs.regla_nivel || 'porcentaje',
    regla_nivel_config: bs.regla_nivel_config || undefined,
    version: bs.version || '2026.1',
    tieneVisitas: !!bs.tieneVisitas,
    tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
    visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
    extras: (bs.extras || []).map(e => ({
      id: e.id,
      label: e.label || '',
      tipo: e.tipo || 'texto',
      required: !!e.required,
      opciones: e.opciones || undefined
    })),
    tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
    compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
    secciones: (bs.secciones || []).map(s => ({
      nombre: s.nombre || '',
      items: (s.items || []).map(i => ({
        id: i.id,
        texto: i.texto || '',
        evidencia: i.evidencia || ''
      }))
    }))
  };

  if (bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita' && bs.seccionesPorVisita) {
    res.seccionesPorVisita = {};
    Object.keys(bs.seccionesPorVisita).forEach(k => {
      res.seccionesPorVisita[k] = (bs.seccionesPorVisita[k] || []).map(s => ({
        nombre: s.nombre || '',
        items: (s.items || []).map(i => ({
          id: i.id,
          texto: i.texto || '',
          evidencia: i.evidencia || ''
        }))
      }));
    });
  }

  return res;
}

function blankBuilder() {
  return {
    nombre: '',
    nombreCorto: '',
    descripcion: '',
    icono: '📋',
    color: FICHA_PALETTE[0].hex,
    modalidad: 'General',
    tipoRespuesta: 'si_no',
    regla_nivel: 'porcentaje',
    regla_nivel_config: {
      inicio: { min: 0, max: 11, label: 'Incipiente' },
      proceso: { min: 12, max: 23, label: 'Parcial' },
      logrado: { min: 24, max: 31, label: 'Lograda' }
    },
    version: '2026.1',
    tieneVisitas: false,
    tipoVisitas: 'mismos_items',
    visitas: ['Visita 1', 'Visita 2', 'Visita 3'],
    seccionesPorVisita: {},
    secciones: [{
      nombre: 'Sección 1: Planificación y Gestión',
      items: [{ id: genId(), texto: '', evidencia: '' }]
    }],
    extras: [
      { id: genId(), label: 'UGEL', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'RED / REI', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Código modular / local', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Director(a) en funciones', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Responsable / especialista', tipo: 'texto', required: false, opciones: '' },
    ],
    tablas: [],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    }
  };
}

export function startNewPlantillaBuilder() {
  builderState = blankBuilder();
  builderEditingId = null;
  builderMode = 'visual';
  builderJsonUnlocked = false;
  builderActiveVisitPreview = 0;
  builderIsDirty = false;
  tiposView = 'builder';
}

function syncBuilderFromDom(container, bs) {
  if (!bs) return;
  if (builderMode === 'json') {
    const jsonTextarea = document.getElementById('builderJsonTextarea');
    if (jsonTextarea) {
      try {
        const parsed = JSON.parse(jsonTextarea.value);
        Object.assign(bs, parsed);
        bs.extras = normalizeExtras(bs.extras);
      } catch (e) {
        console.warn('JSON no parseable al sincronizar:', e);
      }
    }
    return;
  }
  const icoEl = document.getElementById('b_icono');
  if (icoEl) bs.icono = icoEl.value;
  const nomEl = document.getElementById('b_nombre');
  if (nomEl) bs.nombre = nomEl.value;
  const nomCortoEl = document.getElementById('b_nombre_corto');
  if (nomCortoEl) bs.nombreCorto = nomCortoEl.value;
  const descEl = document.getElementById('b_desc');
  if (descEl) bs.descripcion = descEl.value;
  const tipoEl = document.getElementById('b_tipo');
  if (tipoEl) bs.tipoRespuesta = tipoEl.value;
  const modEl = document.getElementById('b_modalidad');
  if (modEl) bs.modalidad = modEl.value;
  const reglaEl = document.getElementById('b_regla_nivel');
  if (reglaEl) bs.regla_nivel = reglaEl.value;
  const verEl = document.getElementById('b_version');
  if (verEl) bs.version = verEl.value;

  const tvEl = document.getElementById('b_tiene_visitas');
  if (tvEl) bs.tieneVisitas = tvEl.checked;

  const tvModeRadio = container.querySelector('input[name="b_tipo_visitas"]:checked');
  if (tvModeRadio) bs.tipoVisitas = tvModeRadio.value;

  // Sincronizar visitas
  container.querySelectorAll('[data-visitainp]').forEach(inp => {
    const vIdx = +inp.dataset.visitainp;
    if (Array.isArray(bs.visitas) && bs.visitas[vIdx] !== undefined) {
      bs.visitas[vIdx] = inp.value;
    }
  });

  // Sincronizar rangos personalizados si regla_nivel === 'conteo_rangos'
  if (bs.regla_nivel === 'conteo_rangos') {
    if (!bs.regla_nivel_config) bs.regla_nivel_config = {};
    const iniMin = document.getElementById('b_rng_ini_min');
    const iniMax = document.getElementById('b_rng_ini_max');
    const iniLbl = document.getElementById('b_rng_ini_lbl');
    const procMin = document.getElementById('b_rng_proc_min');
    const procMax = document.getElementById('b_rng_proc_max');
    const procLbl = document.getElementById('b_rng_proc_lbl');
    const logMin = document.getElementById('b_rng_log_min');
    const logMax = document.getElementById('b_rng_log_max');
    const logLbl = document.getElementById('b_rng_log_lbl');

    bs.regla_nivel_config.inicio = {
      min: iniMin ? parseInt(iniMin.value, 10) || 0 : 0,
      max: iniMax ? parseInt(iniMax.value, 10) || 11 : 11,
      label: iniLbl ? iniLbl.value.trim() || 'Incipiente' : 'Incipiente'
    };
    bs.regla_nivel_config.proceso = {
      min: procMin ? parseInt(procMin.value, 10) || 12 : 12,
      max: procMax ? parseInt(procMax.value, 10) || 23 : 23,
      label: procLbl ? procLbl.value.trim() || 'Parcial' : 'Parcial'
    };
    bs.regla_nivel_config.logrado = {
      min: logMin ? parseInt(logMin.value, 10) || 24 : 24,
      max: logMax ? parseInt(logMax.value, 10) || 31 : 31,
      label: logLbl ? logLbl.value.trim() || 'Lograda' : 'Lograda'
    };
  }

  // Sincronizar compromisos
  const cHab = document.getElementById('b_comp_hab');
  const cDir = document.getElementById('b_comp_dir');
  const cEsp = document.getElementById('b_comp_esp');
  const cFilas = document.getElementById('b_comp_filas');
  if (!bs.compromisos) bs.compromisos = {};
  if (cHab) bs.compromisos.habilitado = cHab.checked;
  if (cDir) bs.compromisos.director = cDir.checked;
  if (cEsp) bs.compromisos.especialista = cEsp.checked;
  if (cFilas) bs.compromisos.filasPorVisita = Math.max(1, parseInt(cFilas.value, 10) || 3);

  const activeColorEl = container.querySelector('.colorSwatch.active');
  if (activeColorEl && activeColorEl.dataset.color) {
    bs.color = activeColorEl.dataset.color;
  }

  // Sincronizar secciones e ítems (soporta modo multi-visita diferenciado)
  const isMultiVisitaDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
  if (isMultiVisitaDiferenciada && !bs.seccionesPorVisita) {
    bs.seccionesPorVisita = {};
  }
  const targetSecs = isMultiVisitaDiferenciada
    ? (bs.seccionesPorVisita[builderActiveVisitTab] || bs.secciones || [])
    : (bs.secciones || []);

  container.querySelectorAll('[data-secname]').forEach(inp => {
    const sIdx = +inp.dataset.secname;
    if (targetSecs && targetSecs[sIdx]) targetSecs[sIdx].nombre = inp.value;
  });
  container.querySelectorAll('[data-sec][data-item]').forEach(inp => {
    const sIdx = +inp.dataset.sec;
    const iIdx = +inp.dataset.item;
    if (targetSecs && targetSecs[sIdx] && targetSecs[sIdx].items && targetSecs[sIdx].items[iIdx]) {
      targetSecs[sIdx].items[iIdx].texto = inp.value;
    }
  });
  container.querySelectorAll('[data-sec][data-item-evidencia]').forEach(inp => {
    const sIdx = +inp.dataset.sec;
    const iIdx = +inp.dataset.itemEvidencia;
    if (targetSecs && targetSecs[sIdx] && targetSecs[sIdx].items && targetSecs[sIdx].items[iIdx]) {
      targetSecs[sIdx].items[iIdx].evidencia = inp.value;
    }
  });
  container.querySelectorAll('[data-sec][data-item-code]').forEach(inp => {
    const sIdx = +inp.dataset.sec;
    const iIdx = +inp.dataset.itemCode;
    if (targetSecs && targetSecs[sIdx] && targetSecs[sIdx].items && targetSecs[sIdx].items[iIdx]) {
      targetSecs[sIdx].items[iIdx].id = inp.value.trim() || targetSecs[sIdx].items[iIdx].id;
    }
  });

  if (isMultiVisitaDiferenciada) {
    bs.seccionesPorVisita[builderActiveVisitTab] = targetSecs;
    if (builderActiveVisitTab === 0 || !bs.secciones || bs.secciones.length === 0) {
      bs.secciones = targetSecs;
    }
  } else {
    bs.secciones = targetSecs;
  }

  // Sincronizar campos de cabecera
  container.querySelectorAll('[data-extralabel]').forEach(inp => {
    const eIdx = +inp.dataset.extralabel;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].label = inp.value;
  });
  container.querySelectorAll('[data-extratipo]').forEach(sel => {
    const eIdx = +sel.dataset.extratipo;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].tipo = sel.value;
  });
  container.querySelectorAll('[data-extrareq]').forEach(chk => {
    const eIdx = +chk.dataset.extrareq;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].required = chk.checked;
  });
  container.querySelectorAll('[data-extraopts]').forEach(inp => {
    const eIdx = +inp.dataset.extraopts;
    if (bs.extras && bs.extras[eIdx]) bs.extras[eIdx].opciones = inp.value;
  });

  // Sincronizar tablas especializadas
  container.querySelectorAll('[data-tbl-titulo]').forEach(inp => {
    const tIdx = +inp.dataset.tblTitulo;
    if (bs.tablas && bs.tablas[tIdx]) bs.tablas[tIdx].titulo = inp.value;
  });
  container.querySelectorAll('[data-tbl-desc]').forEach(inp => {
    const tIdx = +inp.dataset.tblDesc;
    if (bs.tablas && bs.tablas[tIdx]) bs.tablas[tIdx].descripcion = inp.value;
  });

  builderIsDirty = true;
}

/** Duplica un tipo de ficha existente creando una copia limpia con nuevos identificadores */
export async function duplicateFichaType(ft, dbNs, state, onDone) {
  if (!dbNs) { showToast('Sin conexión a la base de datos.'); return; }
  try {
    const copyName = `${ft.nombre} (Copia)`;
    const newColor = getFichaColor(ft).hex;
    const newModalidad = getFichaModalidad(ft);
    const clonedSecciones = (ft.secciones || []).map(s => ({
      nombre: s.nombre || '',
      items: (s.items || []).map(it => ({ id: genId(), texto: it.texto || '' }))
    }));
    const clonedExtras = (ft.extras || []).map(ex => ({ ...ex, id: genId() }));
    const payload = {
      nombre: copyName,
      descripcion: ft.descripcion || '',
      icono: ft.icono || '📋',
      tipoRespuesta: ft.tipoRespuesta || 'si_no',
      color: newColor,
      modalidad: newModalidad,
      secciones: clonedSecciones,
      extras: clonedExtras,
      createdAt: Date.now()
    };
    await dbNs.collection('fichaTypes').add(payload);
    showToast(`✓ Ficha duplicada como "${copyName}"`);
    if (onDone) onDone();
  } catch (err) {
    console.error(err);
    showToast('Error al duplicar la ficha: ' + err.message);
  }
}

/** Cuadro de diálogo modal accesible con advertencia de impacto antes de eliminar */
export function confirmDeleteFichaType(ft, state, dbNs, onDeleted) {
  const count = (state.submissions || []).filter(s => s.fichaTypeId === ft.id).length;
  const modalWrap = document.createElement('div');
  modalWrap.className = 'downloadModalOverlay';
  modalWrap.innerHTML = `
    <div class="downloadModalCard" style="max-width:500px">
      <div class="downloadModalHeader" style="background:#B91C1C;color:#FFFFFF">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">🗑️</span>
          <h3 style="color:#FFFFFF;margin:0">Eliminar tipo de ficha</h3>
        </div>
        <button type="button" class="downloadModalClose" id="m_del_close" style="color:#FFF">✕</button>
      </div>
      <div class="downloadModalBody" style="padding:20px">
        <p style="font-size:14px;margin-top:0">
          ¿Estás seguro de que deseas eliminar la plantilla <strong>"${esc(ft.nombre)}"</strong>?
        </p>
        ${count > 0 ? `
          <div style="background:#FEF2F2;border:1.5px solid #FCA5A5;border-radius:8px;padding:12px;margin:14px 0;font-size:12.5px;color:#991B1B;line-height:1.45">
            <strong>⚠️ Atención: Existen ${count} visita(s) registradas con esta ficha.</strong><br>
            Las fichas ya registradas se conservarán en los reportes históricos y en el sistema, pero ya no podrán registrarse nuevas visitas ni editarse con esta plantilla.
          </div>
        ` : `
          <p style="font-size:12.5px;color:var(--text-600);margin-bottom:0">Esta plantilla no tiene visitas asociadas. Esta acción no se puede deshacer.</p>
        `}
      </div>
      <div class="downloadModalFooter" style="display:flex;justify-content:flex-end;gap:10px">
        <button type="button" class="btn secondary" id="m_del_cancel">Cancelar</button>
        <button type="button" class="btn danger" id="m_del_confirm">Sí, eliminar ficha</button>
      </div>
    </div>
  `;
  lockBodyScroll();
  document.body.appendChild(modalWrap);
  const close = () => {
    modalWrap.remove();
    unlockBodyScroll();
  };
  modalWrap.querySelector('#m_del_close').onclick = close;
  modalWrap.querySelector('#m_del_cancel').onclick = close;
  modalWrap.querySelector('#m_del_confirm').onclick = async () => {
    const btn = modalWrap.querySelector('#m_del_confirm');
    btn.disabled = true;
    btn.textContent = 'Eliminando...';
    try {
      await dbNs.collection('fichaTypes').doc(ft.id).delete();
      showToast('✓ Tipo de ficha eliminado.');
      close();
      if (onDeleted) onDeleted();
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Sí, eliminar ficha';
    }
  };
}

export function renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml) {
  if (tiposView === 'builder') {
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    return;
  }

  const allTypes = state.fichaTypes || [];
  const filtered = allTypes.filter(ft => {
    if (plantillasSearchQuery) {
      const q = normalizeText(plantillasSearchQuery);
      const name = normalizeText(ft.nombre || '');
      const desc = normalizeText(ft.descripcion || '');
      const mod = normalizeText(getFichaModalidad(ft) || '');
      if (!name.includes(q) && !desc.includes(q) && !mod.includes(q)) return false;
    }
    return true;
  });

  const cardsHtml = filtered.length === 0 ? `
    <div class="empty" style="padding:36px 20px;text-align:center">
      <div style="font-size:42px;margin-bottom:10px">📋</div>
      <h4>${allTypes.length === 0 ? 'Aún no hay plantillas de ficha cargadas en Firestore' : 'No se encontraron plantillas'}</h4>
      <p style="max-width:540px;margin:0 auto 16px;color:var(--text-600)">
        ${allTypes.length === 0
      ? 'Puedes inicializar las 8 plantillas oficiales del sistema (EBR con Visitas 1, 2 y 3, JEC, CEBE, PRITE, Directivos, etc.) con sus preguntas canónicas y conexiones intactas.'
      : `No hay resultados para "${esc(plantillasSearchQuery)}".`}
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${allTypes.length === 0 ? '<button type="button" class="btn" id="btnSyncPlantillasEmpty" style="font-weight:700">⚡ Cargar 8 Plantillas Base Oficiales</button>' : ''}
        <button type="button" class="btn secondary" id="btnCreateNewFtEmpty">+ Nuevo tipo de ficha</button>
      </div>
    </div>
  ` : filtered.map((ft, idx) => {
        const color = getFichaColor(ft, idx);
        const mod = getFichaModalidad(ft);
        const count = deduplicateTwinSubmissions((state.submissions || []).filter(s => s.fichaTypeId === ft.id)).length;
        const totalItems = (ft.secciones || []).reduce((a, s) => a + (s.items || []).length, 0);
        const totalSecs = (ft.secciones || []).length;
        const descText = (ft.descripcion || '').trim();
        const isExpanded = !!fichaDescExpanded[ft.id];
        const isLongDesc = descText.length > 140;
        let displayDesc = descText || 'Sin descripción adicional.';
        if (isLongDesc && !isExpanded) displayDesc = descText.slice(0, 130) + '…';

        return `
      <div class="fichaCard" style="cursor:default">
        <div class="fichaCardColorStripe" style="background:${color.hex};"></div>
        <div class="fichaCardMain">
          <div class="fichaCardIconWrap" style="background:${color.bg};color:${color.hex};">
            ${esc(ft.icono || '📋')}
          </div>
          <div class="fichaCardContent">
            <h3 class="fichaCardTitle">${esc(ft.nombre)}</h3>
            <p class="fichaCardDesc">
              ${esc(displayDesc)}
              ${isLongDesc ? `<span class="fichaCardDescMore" data-toggle-desc="${esc(ft.id)}">${isExpanded ? 'ver menos' : 'ver más'}</span>` : ''}
            </p>
            <div class="fichaCardBadges">
              <span class="fichaBadge fichaBadgeModalidad">${esc(mod)}</span>
              <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
              <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              <span class="fichaBadge fichaBadgeCount">📊 ${count} ${count === 1 ? 'ficha registrada' : 'fichas registradas'}</span>
            </div>
          </div>
        </div>
        <div class="fichaCardActs" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn secondary small" data-edit-ft="${esc(ft.id)}" title="Editar estructura de la ficha">
            ✏️ Editar
          </button>
          <button type="button" class="btn secondary small" data-dup-ft="${esc(ft.id)}" title="Duplicar como nueva ficha">
            📋 Duplicar
          </button>
          <button type="button" class="btn danger small" data-del-ft="${esc(ft.id)}" title="Eliminar ficha">
            🗑️ Eliminar
          </button>
        </div>
      </div>
    `;
      }).join('');

  container.innerHTML = `
    <div class="pageHead">
      <h2>Plantillas de Ficha</h2>
      <p>Gestiona, crea, edita y duplica los tipos de ficha de monitoreo oficial.</p>
    </div>
    ${subNavHtml}
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px">
      <div class="fichaSearchWrap" style="max-width:380px">
        <span class="fichaSearchIcon">🔍</span>
        <input type="text" class="fichaSearchInput" id="plantillasSearchInp" placeholder="Filtrar plantillas..." value="${esc(plantillasSearchQuery)}">
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button type="button" class="btn secondary" id="btnSyncPlantillasBase" title="Sincroniza o restaura las 8 plantillas oficiales en Firestore manteniendo conexiones con visitas existentes">
          ⚡ Sincronizar Plantillas Base
        </button>
        <button type="button" class="btn" id="btnNewFichaType">
          ＋ Nuevo tipo de ficha
        </button>
      </div>
    </div>
    <div class="fichaCardsList">
      ${cardsHtml}
    </div>
  `;

  // Attach subnav events
  container.querySelectorAll('[data-reg-sub]').forEach(b => {
    b.onclick = () => {
      registrarSubTab = b.dataset.regSub;
      renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, isAdmin);
    };
  });

  // Attach search
  const sInp = document.getElementById('plantillasSearchInp');
  if (sInp) {
    sInp.oninput = (e) => {
      plantillasSearchQuery = e.target.value;
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      const newInp = document.getElementById('plantillasSearchInp');
      if (newInp) {
        newInp.focus();
        newInp.selectionStart = newInp.selectionEnd = newInp.value.length;
      }
    };
  }

  // "+ Nuevo tipo de ficha"
  const newBtn = document.getElementById('btnNewFichaType') || document.getElementById('btnCreateNewFtEmpty');
  if (newBtn) {
    newBtn.onclick = () => {
      builderState = blankBuilder();
      builderEditingId = null;
      builderMode = 'visual';
      builderJsonUnlocked = false;
      builderActiveVisitPreview = 0;
      builderIsDirty = false;
      tiposView = 'builder';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  }

  // "⚡ Sincronizar Plantillas Base Oficiales"
  const onSyncBaseTemplates = async () => {
    if (!isAdmin) {
      showToast('Solo los administradores pueden sincronizar plantillas base.');
      return;
    }
    const confirmed = confirm(
      '¿Deseas sincronizar/restaurar las 8 plantillas base oficiales en Firestore?\n\n' +
      '• Monitoreo Gestión Escolar EBR (Visitas 1, 2 y 3 con R1–R5)\n' +
      '• Implementación Modelo JEC (31 ítems)\n' +
      '• Gestión Escolar CEBE (34 ítems)\n' +
      '• Gestión Escolar PRITE (32 ítems)\n' +
      '• Ficha al Directivo de IE (21 ítems)\n' +
      '• Rúbricas de Aula MINEDU (5 ítems)\n' +
      '• Coordinador de Tutoría JEC (21 ítems)\n' +
      '• Materiales Educativos CEBE/PRITE (14 ítems)\n\n' +
      'Esta acción guardará las plantillas en Firestore con sus IDs canónicos exactos, ' +
      'asegurando que ninguna visita histórica pierda conexión y permitiendo editarlas en el navegador.'
    );
    if (!confirmed) return;

    if (!dbNs) {
      showToast('No hay conexión a la base de datos.');
      return;
    }

    try {
      showToast('Sincronizando plantillas oficiales en Firestore...');
      const entries = Object.entries(PLANTILLAS_BASE_OFICIALES);
      let count = 0;
      for (const [docId, ftData] of entries) {
        const payload = {
          ...ftData,
          updatedAt: Date.now()
        };
        await dbNs.collection('fichaTypes').doc(docId).set(payload, { merge: true });
        count++;
      }
      showToast(`✓ Se sincronizaron exitosamente las ${count} plantillas oficiales.`);
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    } catch (err) {
      console.error('Error sincronizando plantillas base:', err);
      showToast('Error al sincronizar plantillas: ' + err.message);
    }
  };

  const syncBtn = document.getElementById('btnSyncPlantillasBase');
  if (syncBtn) syncBtn.onclick = onSyncBaseTemplates;
  const syncEmptyBtn = document.getElementById('btnSyncPlantillasEmpty');
  if (syncEmptyBtn) syncEmptyBtn.onclick = onSyncBaseTemplates;

  // Toggle "ver más"
  container.querySelectorAll('[data-toggle-desc]').forEach(btn => {
    btn.onclick = (e) => {
      const id = btn.dataset.toggleDesc;
      fichaDescExpanded[id] = !fichaDescExpanded[id];
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  });

  // Editar
  container.querySelectorAll('[data-edit-ft]').forEach(btn => {
    btn.onclick = () => {
      const ft = getFichaType(btn.dataset.editFt);
      if (!ft) return;
      builderState = JSON.parse(JSON.stringify(ft));
      builderState.extras = normalizeExtras(builderState.extras);
      builderState.nombreCorto = builderState.nombreCorto || builderState.nombre || '';
      builderState.version = typeof builderState.version === 'object' && builderState.version !== null ? (builderState.version.anio || '2026.1') : (builderState.version || '2026.1');
      builderState.regla_nivel = typeof builderState.regla_nivel === 'object' && builderState.regla_nivel !== null ? (builderState.regla_nivel.tipo || 'porcentaje') : (builderState.regla_nivel || 'porcentaje');
      builderState.tieneVisitas = !!builderState.tieneVisitas || (Array.isArray(builderState.visitas) && builderState.visitas.length > 0);
      if (Array.isArray(builderState.visitas) && builderState.visitas.length > 0) {
        builderState.visitas = builderState.visitas.map((v, idx) => typeof v === 'string' ? v : ('Visita ' + v));
      } else {
        builderState.visitas = ['Visita 1', 'Visita 2', 'Visita 3'];
      }
      builderState.tablas = Array.isArray(builderState.tablas) ? builderState.tablas : [];

      // Auto-popular tablas institucionales si están vacías y es CEBE o PRITE
      if (builderState.tablas.length === 0) {
        const idLower = String(ft.id || '').toLowerCase();
        if (idLower.includes('prite')) {
          builderState.tablas = [
            {
              id: 'tbl_personal_prite',
              titulo: 'Cuadro de Personal del PRITE',
              descripcion: 'Registro de plazas y personal en funciones',
              columnas: [
                { id: 'c_cargo', nombre: 'Cargo / Función', tipo: 'texto' },
                { id: 'c_plazas', nombre: 'N° Plazas', tipo: 'numero' },
                { id: 'c_cubiertas', nombre: 'Cubiertas', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_dir', etiqueta: 'Director(a)' },
                { id: 'f_tut', etiqueta: 'Docentes Tutores' },
                { id: 'f_ter', etiqueta: 'Terapistas / Psicólogos' },
                { id: 'f_aux', etiqueta: 'Auxiliares de Educación' }
              ]
            },
            {
              id: 'tbl_estudiantes_prite',
              titulo: 'Cuadro de Matrícula y Atención Temprana',
              descripcion: 'Distribución de niños y niñas por rango etario',
              columnas: [
                { id: 'c_grupo', nombre: 'Rango de Edad', tipo: 'texto' },
                { id: 'c_meta', nombre: 'Meta Programada', tipo: 'numero' },
                { id: 'c_mat', nombre: 'Matriculados', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_01', etiqueta: '0 a 12 meses' },
                { id: 'f_12', etiqueta: '13 a 24 meses' },
                { id: 'f_23', etiqueta: '25 a 36 meses' },
                { id: 'f_tot', etiqueta: 'Total Atendidos' }
              ]
            }
          ];
        } else if (idLower.includes('cebe')) {
          builderState.tablas = [
            {
              id: 'tbl_personal_cebe',
              titulo: 'Cuadro de Personal del CEBE',
              descripcion: 'Distribución del equipo directivo, docente y de apoyo',
              columnas: [
                { id: 'c_cargo', nombre: 'Cargo / Especialidad', tipo: 'texto' },
                { id: 'c_nom', nombre: 'Nombrados', tipo: 'numero' },
                { id: 'c_con', nombre: 'Contratados', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_dir', etiqueta: 'Personal Directivo' },
                { id: 'f_doc', etiqueta: 'Personal Docente de Aula' },
                { id: 'f_aux', etiqueta: 'Auxiliares de Educación' },
                { id: 'f_adm', etiqueta: 'Personal Administrativo' }
              ]
            },
            {
              id: 'tbl_saanee_cebe',
              titulo: 'Equipo SAANEE (Servicio de Apoyo y Asesoramiento)',
              descripcion: 'Profesionales del equipo interdisciplinario',
              columnas: [
                { id: 'c_prof', nombre: 'Profesional', tipo: 'texto' },
                { id: 'c_cant', nombre: 'Cantidad', tipo: 'numero' }
              ],
              filas: [
                { id: 'f_s1', etiqueta: 'Coordinador(a) SAANEE' },
                { id: 'f_s2', etiqueta: 'Psicólogo(a)' },
                { id: 'f_s3', etiqueta: 'Tecnólogo Médico / Terapista' },
                { id: 'f_s4', etiqueta: 'Intérprete de Lengua de Señas' }
              ]
            }
          ];
        }
      }

      if (!builderState.compromisos) {
        builderState.compromisos = {
          habilitado: true,
          director: true,
          especialista: true,
          filasPorVisita: 3
        };
      }

      // Asegurar campo evidencia en secciones
      if (Array.isArray(builderState.secciones)) {
        builderState.secciones.forEach(sec => {
          if (Array.isArray(sec.items)) {
            sec.items.forEach(it => {
              if (it.evidencia === undefined) it.evidencia = '';
            });
          }
        });
      }

      builderEditingId = ft.id;
      builderMode = 'visual';
      builderJsonUnlocked = false;
      builderActiveVisitPreview = 0;
      builderActiveVisitTab = 0;
      builderState.tipoVisitas = builderState.tipoVisitas || (builderState.seccionesPorVisita && Object.keys(builderState.seccionesPorVisita).length > 0 ? 'items_por_visita' : 'mismos_items');
      builderState.seccionesPorVisita = builderState.seccionesPorVisita || {};
      if (builderState.tipoVisitas === 'items_por_visita' && !builderState.seccionesPorVisita[0]) {
        builderState.seccionesPorVisita[0] = JSON.parse(JSON.stringify(builderState.secciones || []));
      }
      builderState.regla_nivel_config = builderState.regla_nivel_config || {
        inicio: { min: 0, max: 11, label: 'Incipiente' },
        proceso: { min: 12, max: 23, label: 'Parcial' },
        logrado: { min: 24, max: 31, label: 'Lograda' }
      };
      builderIsDirty = false;
      tiposView = 'builder';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  });

  // Duplicar
  container.querySelectorAll('[data-dup-ft]').forEach(btn => {
    btn.onclick = () => {
      const ft = getFichaType(btn.dataset.dupFt);
      if (ft) duplicateFichaType(ft, dbNs, state, () => {
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      });
    };
  });

  // Eliminar
  container.querySelectorAll('[data-del-ft]').forEach(btn => {
    btn.onclick = () => {
      const ft = getFichaType(btn.dataset.delFt);
      if (ft) confirmDeleteFichaType(ft, state, dbNs, () => {
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      });
    };
  });
}

/** Compatibilidad hacia atrás para llamadas externas a renderTiposTab */
export function renderTiposTab(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null) {
  setRegistrarSubTab('plantillas');
  renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, null, isAdmin);
}

let currentAreaReportTab = 'concursos'; // 'concursos' | 'consolidado' | 'individual' | 'avance'

export function renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType, subNavHtml = '', navigate = null) {
  const areas = (state.areasFirma && state.areasFirma.length > 0)
    ? state.areasFirma
    : DEFAULT_AREAS;

  const REPORT_TYPES = [
    { id: 'concursos', label: '🏆 Concursos Escolares' },
    { id: 'consolidado', label: '▤ Reporte Consolidado' },
    { id: 'individual', label: '📄 Ficha Individual' },
    { id: 'avance', label: '📊 Avance / Por Ítem' }
  ];

  const cardsHtml = areas.map(area => {
    const plantillasDb = (state.plantillasFirmantes || []).filter(p => p.areaId === area.id && p.tipoReporte === currentAreaReportTab);
    let firmantesList = [];
    if (plantillasDb.length > 0) {
      firmantesList = plantillasDb.sort((a, b) => (a.orden || 99) - (b.orden || 99));
    } else {
      const defaults = DEFAULT_PLANTILLAS.filter(p => p.tipoReporte === currentAreaReportTab);
      firmantesList = defaults.map(p => ({
        cargo: p.cargo.replace(/\[ÁREA\]/g, area.sigla),
        nombreOpcional: p.nombreOpcional || '',
        entidad: p.entidad.replace(/\[ÁREA\]/g, area.sigla),
        leyenda: p.leyenda
      }));
    }

    return `
      <div class="tipoCard" style="margin-bottom:16px;border-left:4px solid var(--primary)">
        <div class="ti" style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap">
            <h4 style="margin:0">${esc(area.sigla)} — ${esc(area.nombre)}</h4>
            ${area.esPredeterminada ? '<span class="badge" style="background:#FEF3C7;color:#92400E;font-size:11px">⭐ Predeterminada</span>' : ''}
            <span class="badge" style="background:${area.activa !== false ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'};color:${area.activa !== false ? '#15803D' : '#B91C1C'};font-size:11px">
              ${area.activa !== false ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <p style="font-size:12px;color:var(--ink-soft);margin-bottom:10px">
            <strong>Descripción membrete:</strong> ${esc((area.descripcionEncabezado || '').replace(/\n/g, ' · '))}
          </p>

          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:10px 12px;margin-top:6px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <span style="font-size:11.5px;font-weight:700;color:var(--navy-900);text-transform:uppercase">
                Firmantes para: ${REPORT_TYPES.find(t => t.id === currentAreaReportTab)?.label || currentAreaReportTab} (${firmantesList.length})
              </span>
              <button type="button" class="btn secondary small" data-edit-firmantes="${esc(area.id)}" style="padding:2px 8px;font-size:11px">
                ✎ Editar firmantes
              </button>
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              ${firmantesList.map((f, fi) => `
                <div style="font-size:11.5px;display:flex;align-items:center;gap:6px;color:#334155">
                  <span style="font-weight:700;color:var(--primary);min-width:18px">${fi + 1}.</span>
                  <strong>${esc(f.cargo)}</strong>
                  ${f.nombreOpcional ? `<span style="color:#64748B">(${esc(f.nombreOpcional)})</span>` : ''}
                  <span style="color:#94A3B8">· ${esc(f.entidad || '')}</span>
                  ${f.leyenda ? `<span class="badge" style="font-size:10px;padding:1px 5px">${esc(f.leyenda)}</span>` : ''}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <div class="acts" style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">
          <button type="button" class="btn secondary small" data-edit-area="${esc(area.id)}">✎ Editar Área</button>
          ${!area.esPredeterminada ? `
            <button type="button" class="btn secondary small" data-set-default="${esc(area.id)}" style="font-size:11px">⭐ Hacer predeterminada</button>
            <button type="button" class="btn danger small" data-del-area="${esc(area.id)}" style="font-size:11px">✕ Eliminar</button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="pageHead">
      <h2>Áreas y Firmantes Oficiales</h2>
      <p>Administra las áreas de la UGEL 03, sus descripciones para membrete y las plantillas de firmantes por tipo de reporte.</p>
    </div>
    ${subNavHtml || ''}
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${REPORT_TYPES.map(t => `
          <button type="button" class="btn ${currentAreaReportTab === t.id ? '' : 'secondary'} small" data-rtab="${t.id}">
            ${t.label}
          </button>
        `).join('')}
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn secondary" id="btnSeedAreas">🌱 Sembrar áreas oficiales (UGEL 03)</button>
        <button type="button" class="btn" id="btnNewArea">＋ Nueva Área</button>
      </div>
    </div>
    <div id="areasCardsContainer">${cardsHtml}</div>
    <div id="modalAreaHost"></div>
  `;

  if (subNavHtml) {
    container.querySelectorAll('[data-reg-sub]').forEach(b => {
      b.onclick = () => {
        registrarSubTab = b.dataset.regSub;
        renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, navigate, isAdmin);
      };
    });
  }

  container.querySelectorAll('[data-rtab]').forEach(b => {
    b.onclick = () => {
      currentAreaReportTab = b.dataset.rtab;
      renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType, subNavHtml, navigate);
    };
  });

  document.getElementById('btnSeedAreas').onclick = async () => {
    if (!confirm('¿Sembrar o restaurar las áreas oficiales de la UGEL 03 (AGEBRE, AGEBATP, AGP, AGI, DIRECCIÓN) y sus plantillas de firmantes por defecto?')) return;
    const btn = document.getElementById('btnSeedAreas');
    btn.disabled = true;
    btn.textContent = 'Sembrando...';
    try {
      for (const area of DEFAULT_AREAS) {
        await dbNs.collection('areasFirma').doc(area.id).set({
          ...area,
          updatedAt: Date.now()
        }, { merge: true });
      }
      for (const area of DEFAULT_AREAS) {
        for (const p of DEFAULT_PLANTILLAS) {
          const pid = `${area.id}_${p.tipoReporte}_${p.orden}`;
          const cargoFinal = p.cargo.replace(/\[ÁREA\]/g, area.sigla);
          await dbNs.collection('plantillasFirmantes').doc(pid).set({
            id: pid,
            areaId: area.id,
            tipoReporte: p.tipoReporte,
            orden: p.orden,
            cargo: cargoFinal,
            nombreOpcional: p.nombreOpcional || '',
            entidad: p.entidad.replace(/\[ÁREA\]/g, area.sigla),
            leyenda: p.leyenda,
            updatedAt: Date.now()
          }, { merge: true });
        }
      }
      showToast('✓ Áreas y plantillas oficiales sembradas exitosamente.');
      renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
    } catch (e) {
      console.error('Error sembrando áreas:', e);
      showToast('Error sembrando áreas: ' + e.message);
    }
  };

  document.getElementById('btnNewArea').onclick = () => {
    openAreaModal(null, dbNs, state, container, isAdmin, currentUser, getFichaType);
  };

  container.querySelectorAll('[data-edit-area]').forEach(b => {
    b.onclick = () => {
      const area = areas.find(a => a.id === b.dataset.editArea);
      if (area) openAreaModal(area, dbNs, state, container, isAdmin, currentUser, getFichaType);
    };
  });

  container.querySelectorAll('[data-set-default]').forEach(b => {
    b.onclick = async () => {
      const targetId = b.dataset.setDefault;
      try {
        for (const a of areas) {
          await dbNs.collection('areasFirma').doc(a.id).update({
            esPredeterminada: (a.id === targetId),
            updatedAt: Date.now()
          });
        }
        showToast('✓ Área predeterminada actualizada.');
        renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
      } catch (e) {
        console.error(e);
        showToast('Error al actualizar predeterminada.');
      }
    };
  });

  container.querySelectorAll('[data-del-area]').forEach(b => {
    b.onclick = async () => {
      const area = areas.find(a => a.id === b.dataset.delArea);
      if (!area) return;
      if (area.esPredeterminada) {
        showToast('No se puede eliminar el área predeterminada.');
        return;
      }
      if (!confirm(`¿Eliminar el área "${area.sigla} — ${area.nombre}"?`)) return;
      try {
        await dbNs.collection('areasFirma').doc(area.id).delete();
        showToast('✓ Área eliminada.');
        renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
      } catch (e) {
        console.error(e);
        showToast('Error al eliminar área.');
      }
    };
  });

  container.querySelectorAll('[data-edit-firmantes]').forEach(b => {
    b.onclick = () => {
      const area = areas.find(a => a.id === b.dataset.editFirmantes);
      if (area) openFirmantesEditorModal(area, currentAreaReportTab, dbNs, state, container, isAdmin, currentUser, getFichaType);
    };
  });
}

function openAreaModal(area, dbNs, state, container, isAdmin, currentUser, getFichaType) {
  const host = document.getElementById('modalAreaHost');
  if (!host) return;

  const isEdit = !!area;
  const modalWrap = document.createElement('div');
  modalWrap.className = 'downloadModalOverlay';

  modalWrap.innerHTML = `
    <div class="downloadModalCard" style="max-width:520px">
      <div class="downloadModalHeader">
        <div>
          <h3>${isEdit ? 'Editar Área Institucional' : 'Nueva Área Institucional'}</h3>
          <div class="sub">Catálogo de Áreas de Firma · UGEL 03</div>
        </div>
        <button type="button" class="downloadModalClose" id="m_area_close">✕</button>
      </div>
      <form id="areaForm" class="downloadModalBody">
        <div class="downloadModalSection">
          <label class="secLabel" for="a_nombre">Nombre completo del Área *</label>
          <input type="text" id="a_nombre" required placeholder="Ej: Área de Gestión de la Educación Básica Regular y Especial" value="${esc(isEdit ? area.nombre : '')}">
        </div>
        <div class="downloadModalSection">
          <label class="secLabel" for="a_sigla">Sigla Oficial *</label>
          <input type="text" id="a_sigla" required placeholder="Ej: AGEBRE" value="${esc(isEdit ? area.sigla : '')}">
        </div>
        <div class="downloadModalSection">
          <label class="secLabel" for="a_desc">Descripción para el membrete oficial</label>
          <textarea id="a_desc" rows="2" placeholder="Ej: Área de Gestión de la\nEducación Básica (2026)">${esc(isEdit ? (area.descripcionEncabezado || '') : '')}</textarea>
        </div>
        <div class="downloadModalSection" style="display:flex;flex-direction:row;gap:18px;margin-top:4px">
          <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" id="a_activa" ${!isEdit || area.activa !== false ? 'checked' : ''}> Activa
          </label>
          <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
            <input type="checkbox" id="a_predet" ${isEdit && area.esPredeterminada ? 'checked' : ''}> Predeterminada
          </label>
        </div>
        <div class="downloadModalFooter" style="margin:10px -22px -20px;border-top:1px solid var(--line)">
          <button type="button" class="btn secondary" id="m_area_cancel">Cancelar</button>
          <button type="submit" class="btn" id="m_area_save">Guardar Área</button>
        </div>
      </form>
    </div>
  `;

  lockBodyScroll();
  host.appendChild(modalWrap);

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  const close = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };
  modalWrap.querySelector('#m_area_close').onclick = close;
  modalWrap.querySelector('#m_area_cancel').onclick = close;

  modalWrap.querySelector('#areaForm').onsubmit = async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('a_nombre').value.trim();
    const sigla = document.getElementById('a_sigla').value.trim().toUpperCase();
    const desc = document.getElementById('a_desc').value.trim();
    const activa = document.getElementById('a_activa').checked;
    const esPredet = document.getElementById('a_predet').checked;

    const areaId = isEdit ? area.id : sigla.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const btn = document.getElementById('m_area_save');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
      // Si se marca predeterminada, desmarcar las otras
      if (esPredet) {
        const otherAreas = (state.areasFirma || DEFAULT_AREAS);
        for (const a of otherAreas) {
          if (a.id !== areaId) {
            await dbNs.collection('areasFirma').doc(a.id).update({ esPredeterminada: false }).catch(() => { });
          }
        }
      }

      await dbNs.collection('areasFirma').doc(areaId).set({
        id: areaId,
        nombre,
        sigla,
        descripcionEncabezado: desc || `${nombre} (2026)`,
        activa,
        esPredeterminada: esPredet,
        updatedAt: Date.now()
      }, { merge: true });

      showToast('✓ Área guardada exitosamente.');
      close();
      renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
    } catch (err) {
      console.error(err);
      showToast('Error al guardar área: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Guardar Área';
    }
  };
}

function openFirmantesEditorModal(area, tipoReporte, dbNs, state, container, isAdmin, currentUser, getFichaType) {
  const host = document.getElementById('modalAreaHost');
  if (!host) return;

  const REPORT_NAMES = {
    concursos: 'Consolidado Oficial de Resultados de Concursos',
    consolidado: 'Reporte Consolidado de Monitoreo',
    individual: 'Ficha Individual de Monitoreo',
    avance: 'Reporte por Ítem / de Avance'
  };

  const plantillasDb = (state.plantillasFirmantes || []).filter(p => p.areaId === area.id && p.tipoReporte === tipoReporte);
  let list = [];
  if (plantillasDb.length > 0) {
    list = JSON.parse(JSON.stringify(plantillasDb.sort((a, b) => (a.orden || 99) - (b.orden || 99))));
  } else {
    const defaults = DEFAULT_PLANTILLAS.filter(p => p.tipoReporte === tipoReporte);
    list = defaults.map((p, idx) => ({
      id: `${area.id}_${tipoReporte}_${idx + 1}`,
      areaId: area.id,
      tipoReporte: tipoReporte,
      orden: idx + 1,
      cargo: p.cargo.replace(/\[ÁREA\]/g, area.sigla),
      nombreOpcional: p.nombreOpcional || '',
      entidad: p.entidad.replace(/\[ÁREA\]/g, area.sigla),
      leyenda: p.leyenda
    }));
  }

  const modalWrap = document.createElement('div');
  modalWrap.className = 'downloadModalOverlay';

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  const close = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };

  function renderInner() {
    modalWrap.innerHTML = `
      <div class="downloadModalCard" style="max-width:640px">
        <div class="downloadModalHeader">
          <div>
            <h3>Plantilla de Firmantes</h3>
            <div class="sub">${esc(area.sigla)} · ${esc(REPORT_NAMES[tipoReporte] || tipoReporte)}</div>
          </div>
          <button type="button" class="downloadModalClose" id="m_f_close">✕</button>
        </div>
        <div class="downloadModalBody">
          <p style="font-size:12.5px;color:var(--ink-soft);margin-top:0">
            Configura los cargos predeterminados que firman este tipo de documento. Puedes agregar hasta 6 firmantes.
          </p>
          <div class="downloadFirmantesList">
            ${list.map((sig, idx) => `
              <div class="downloadFirmanteItem">
                <div class="reorderBtns">
                  <button type="button" class="fUp" data-up="${idx}" ${idx === 0 ? 'disabled' : ''}>▲</button>
                  <button type="button" class="fDown" data-down="${idx}" ${idx === list.length - 1 ? 'disabled' : ''}>▼</button>
                </div>
                <div class="fieldsWrap">
                  <input type="text" class="inpCargo" data-idx="${idx}" placeholder="Cargo *" value="${esc(sig.cargo)}" required>
                  <input type="text" class="inpNombre" data-idx="${idx}" placeholder="Nombre (opcional)" value="${esc(sig.nombreOpcional || '')}">
                  <input type="text" class="inpEntidad" data-idx="${idx}" placeholder="Entidad" value="${esc(sig.entidad || '')}">
                  <select class="selLeyenda" data-idx="${idx}">
                    <option value="Firma y Sello" ${sig.leyenda === 'Firma y Sello' ? 'selected' : ''}>Firma y Sello</option>
                    <option value="V.° B.° y Sello" ${sig.leyenda === 'V.° B.° y Sello' ? 'selected' : ''}>V.° B.° y Sello</option>
                    <option value="Sello Institucional" ${sig.leyenda === 'Sello Institucional' ? 'selected' : ''}>Sello Institucional</option>
                    <option value="V.° B.°" ${sig.leyenda === 'V.° B.°' ? 'selected' : ''}>V.° B.°</option>
                    <option value="" ${!sig.leyenda ? 'selected' : ''}>Ninguna</option>
                  </select>
                </div>
                <button type="button" class="delFirmanteBtn" data-del="${idx}">✕</button>
              </div>
            `).join('')}
          </div>

          ${list.length < 6 ? `
            <button type="button" class="btn secondary small" id="m_f_add" style="align-self:flex-start;margin-top:6px">
              ＋ Agregar firmante
            </button>
          ` : ''}
        </div>
        <div class="downloadModalFooter">
          <button type="button" class="btn secondary" id="m_f_cancel">Cancelar</button>
          <button type="button" class="btn" id="m_f_save">Guardar Plantilla</button>
        </div>
      </div>
    `;

    attachInnerEvents();
  }

  function attachInnerEvents() {
    const close = () => modalWrap.remove();
    modalWrap.querySelector('#m_f_close').onclick = close;
    modalWrap.querySelector('#m_f_cancel').onclick = close;

    modalWrap.querySelectorAll('.inpCargo').forEach(inp => {
      inp.oninput = (e) => { list[parseInt(e.target.dataset.idx, 10)].cargo = e.target.value; };
    });
    modalWrap.querySelectorAll('.inpNombre').forEach(inp => {
      inp.oninput = (e) => { list[parseInt(e.target.dataset.idx, 10)].nombreOpcional = e.target.value; };
    });
    modalWrap.querySelectorAll('.inpEntidad').forEach(inp => {
      inp.oninput = (e) => { list[parseInt(e.target.dataset.idx, 10)].entidad = e.target.value; };
    });
    modalWrap.querySelectorAll('.selLeyenda').forEach(sel => {
      sel.onchange = (e) => { list[parseInt(e.target.dataset.idx, 10)].leyenda = e.target.value; };
    });

    modalWrap.querySelectorAll('.fUp').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.up, 10);
        if (idx > 0) {
          const temp = list[idx - 1];
          list[idx - 1] = list[idx];
          list[idx] = temp;
          renderInner();
        }
      };
    });
    modalWrap.querySelectorAll('.fDown').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.down, 10);
        if (idx < list.length - 1) {
          const temp = list[idx + 1];
          list[idx + 1] = list[idx];
          list[idx] = temp;
          renderInner();
        }
      };
    });
    modalWrap.querySelectorAll('.delFirmanteBtn').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.del, 10);
        list.splice(idx, 1);
        renderInner();
      };
    });

    const addBtn = modalWrap.querySelector('#m_f_add');
    if (addBtn) {
      addBtn.onclick = () => {
        if (list.length < 6) {
          list.push({
            id: `${area.id}_${tipoReporte}_${list.length + 1}`,
            areaId: area.id,
            tipoReporte: tipoReporte,
            orden: list.length + 1,
            cargo: `Especialista de ${area.sigla}`,
            nombreOpcional: '',
            entidad: 'UGEL 03 – DRELM',
            leyenda: 'Firma y Sello'
          });
          renderInner();
        }
      };
    }

    modalWrap.querySelector('#m_f_save').onclick = async () => {
      const btn = modalWrap.querySelector('#m_f_save');
      btn.disabled = true;
      btn.textContent = 'Guardando...';

      try {
        // Eliminar plantillas anteriores de este tipo y área
        const prev = (state.plantillasFirmantes || []).filter(p => p.areaId === area.id && p.tipoReporte === tipoReporte);
        for (const p of prev) {
          await dbNs.collection('plantillasFirmantes').doc(p.id).delete().catch(() => { });
        }

        // Insertar la nueva lista ordenada
        for (let i = 0; i < list.length; i++) {
          const item = list[i];
          const pid = `${area.id}_${tipoReporte}_${i + 1}`;
          await dbNs.collection('plantillasFirmantes').doc(pid).set({
            id: pid,
            areaId: area.id,
            tipoReporte,
            orden: i + 1,
            cargo: item.cargo,
            nombreOpcional: item.nombreOpcional || '',
            entidad: item.entidad || '',
            leyenda: item.leyenda || 'Firma y Sello',
            updatedAt: Date.now()
          });
        }

        showToast('✓ Plantilla de firmantes guardada exitosamente.');
        close();
        renderAreasYFirmantesView(container, state, dbNs, isAdmin, currentUser, getFichaType);
      } catch (err) {
        console.error(err);
        showToast('Error al guardar firmantes: ' + err.message);
        btn.disabled = false;
        btn.textContent = 'Guardar Plantilla';
      }
    };
  }

  lockBodyScroll();
  host.appendChild(modalWrap);
  renderInner();
  modalWrap.querySelector('#m_f_close').onclick = close;
}

/**
 * Solicita la contraseña del administrador para desbloquear el editor JSON
 * @param {object} currentUser 
 * @param {Function} onSuccess 
 */
function promptAdminPasswordModal(currentUser, onSuccess) {
  const adminEmail = (currentUser && currentUser.email) ? currentUser.email : 'agebre@ugel03.gob.pe';
  const modalWrap = document.createElement('div');
  modalWrap.className = 'adminAuthModalOverlay';
  modalWrap.id = 'adminAuthModalOverlay';

  modalWrap.innerHTML = `
    <div class="adminAuthCard">
      <div class="adminAuthHeader">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">🔐</span>
          <div>
            <h3 style="margin:0;font-size:14px;color:#FFFFFF;font-weight:700">Autenticación de Administrador</h3>
            <div style="font-size:11px;color:#94A3B8">Editor de Código JSON (Modo Avanzado)</div>
          </div>
        </div>
        <button type="button" class="downloadModalClose" id="m_auth_close" style="background:transparent;border:none;color:#94A3B8;font-size:20px;cursor:pointer;line-height:1">✕</button>
      </div>
      <form id="adminAuthForm" style="margin:0">
        <div class="adminAuthBody">
          <p style="font-size:12.5px;color:var(--text-600);margin:0 0 14px;line-height:1.5">
            El <strong>Editor de Código JSON</strong> permite alterar directamente la estructura, tablas e indicadores oficiales. Para habilitarlo, ingresa tu contraseña institucional:
          </p>
          <div style="margin-bottom:12px;background:#F1F5F9;border:1px solid #CBD5E1;border-radius:8px;padding:8px 12px;display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">👤</span>
            <div style="font-size:12px;color:#1E293B;font-weight:600;overflow:hidden;text-overflow:ellipsis">
              ${esc(adminEmail)}
            </div>
          </div>
          <div class="field" style="margin-bottom:6px">
            <label for="adminAuthPassword" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Contraseña de Administrador *</label>
            <div style="position:relative;display:flex;align-items:center">
              <input type="password" id="adminAuthPassword" placeholder="Ingresa tu contraseña" required autocomplete="current-password" style="width:100%;padding:9px 40px 9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px">
              <button type="button" id="adminAuthTogglePw" style="position:absolute;right:8px;background:none;border:none;color:var(--text-400);cursor:pointer;font-size:14px;padding:4px" title="Mostrar/ocultar contraseña">👁️</button>
            </div>
          </div>
          <div id="adminAuthError" class="adminAuthError"></div>
        </div>
        <div class="downloadModalFooter" style="background:#F8FAFC;padding:12px 20px;display:flex;justify-content:flex-end;gap:10px;border-top:1px solid var(--line)">
          <button type="button" class="btn secondary" id="m_auth_cancel">Cancelar</button>
          <button type="submit" class="btn" id="m_auth_submit" style="font-weight:700">🔓 Desbloquear JSON</button>
        </div>
      </form>
    </div>
  `;

  lockBodyScroll();
  document.body.appendChild(modalWrap);

  const pwInput = modalWrap.querySelector('#adminAuthPassword');
  const errBox = modalWrap.querySelector('#adminAuthError');
  const submitBtn = modalWrap.querySelector('#m_auth_submit');
  const toggleBtn = modalWrap.querySelector('#adminAuthTogglePw');

  setTimeout(() => { if (pwInput) pwInput.focus(); }, 100);

  const onKey = (e) => {
    if (e.key === 'Escape') close();
  };
  window.addEventListener('keydown', onKey);

  const close = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };

  modalWrap.querySelector('#m_auth_close').onclick = close;
  modalWrap.querySelector('#m_auth_cancel').onclick = close;

  if (toggleBtn && pwInput) {
    toggleBtn.onclick = () => {
      const isPw = pwInput.type === 'password';
      pwInput.type = isPw ? 'text' : 'password';
      toggleBtn.textContent = isPw ? '🙈' : '👁️';
    };
  }

  modalWrap.querySelector('#adminAuthForm').onsubmit = async (e) => {
    e.preventDefault();
    const pw = (pwInput.value || '').trim();
    if (!pw) {
      errBox.textContent = 'Ingresa tu contraseña de administrador.';
      errBox.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Verificando...';
    errBox.style.display = 'none';

    try {
      await verifyAdminPassword(pw, adminEmail);
      builderJsonUnlocked = true;
      close();
      showToast('✓ Identidad confirmada. Modo JSON desbloqueado.');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.warn('Fallo verificación de administrador:', err);
      errBox.textContent = err.message || 'Contraseña incorrecta.';
      errBox.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '🔓 Desbloquear JSON';
      pwInput.focus();
      pwInput.select();
    }
  };
}

export function renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null, navigate = null, subNavHtml = '') {
  const bs = builderState;
  bs.extras = normalizeExtras(bs.extras);
  if (!bs.color) {
    bs.color = (FICHA_PALETTE[0] || {}).hex || '#1E40AF';
  }
  if (!bs.modalidad) {
    bs.modalidad = 'General';
  }
  if (!bs.nombreCorto) {
    bs.nombreCorto = bs.nombre || '';
  }
  if (!bs.regla_nivel) {
    bs.regla_nivel = 'porcentaje';
  }
  if (!bs.version) {
    bs.version = '2026.1';
  }
  if (bs.tieneVisitas === undefined) {
    bs.tieneVisitas = false;
  }
  if (!Array.isArray(bs.visitas) || bs.visitas.length === 0) {
    bs.visitas = ['Visita 1', 'Visita 2', 'Visita 3'];
  }
  if (!Array.isArray(bs.tablas)) {
    bs.tablas = [];
  }
  if (!bs.compromisos) {
    bs.compromisos = { habilitado: true, director: true, especialista: true, filasPorVisita: 3 };
  }

  const existingCount = builderEditingId
    ? (state.submissions || []).filter(s => s.fichaTypeId === builderEditingId).length
    : 0;

  const MODALIDADES = ['General', 'EBR Inicial', 'EBR Primaria', 'EBR Secundaria', 'JEC', 'CEBE', 'PRITE', 'EBE', 'Directivos', 'Docentes', 'Tutoría', 'Convivencia'];

  const REGLAS_NIVEL_MAP = {
    porcentaje: 'Porcentaje de logro (%) — Umbrales Logrado / En proceso / Inicio',
    conteo_rangos: 'Conteo de puntos por rangos numéricos (ej: JEC 0-11 Incipiente, 12-23 Parcial, 24-31 Lograda)',
    sumatoria: 'Sumatoria directa de puntajes acumulados',
    promedio: 'Promedio simple de valoración (1 a 4 / 1 a 5)',
    ponderado: 'Puntaje ponderado por pesos específicos'
  };

  const isMultiVisitaDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
  if (isMultiVisitaDiferenciada) {
    if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
    if (builderActiveVisitTab >= (bs.visitas || []).length) builderActiveVisitTab = 0;
    if (!bs.seccionesPorVisita[builderActiveVisitTab]) {
      bs.seccionesPorVisita[builderActiveVisitTab] = JSON.parse(JSON.stringify(bs.secciones || []));
    }
  }

  const currentDisplaySections = isMultiVisitaDiferenciada
    ? (bs.seccionesPorVisita[builderActiveVisitTab] || [])
    : (bs.secciones || []);

  // Helper para generar el HTML de Secciones e Indicadores
  const seccionesHtml = currentDisplaySections.map((sec, si) => {
    const itemsHtml = (sec.items || []).map((it, ii) => {
      const itCode = it.id || ((si + 1) + '.' + (ii + 1));
      return `
        <div class="listRow itemDefRow" style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;padding:8px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;font-weight:700;color:var(--ink-soft);min-width:32px">#${si + 1}.${ii + 1}</span>
            <input type="text" placeholder="Cód" title="Identificador o código del ítem" value="${esc(itCode)}" data-sec="${si}" data-item-code="${ii}" style="width:75px;font-weight:700;font-size:12px;text-align:center">
            <input type="text" placeholder="Texto del indicador o criterio de monitoreo *" value="${esc(it.texto)}" data-sec="${si}" data-item="${ii}" style="flex:1;font-weight:500">
            <button type="button" class="iconBtn small" data-rmitem="${si}|${ii}" title="Quitar ítem">✕</button>
          </div>
          <div style="display:flex;align-items:center;gap:6px;padding-left:40px">
            <span style="font-size:12px" title="Evidencias sugeridas">📂</span>
            <input type="text" placeholder="Evidencias sugeridas / Medios de verificación (ej: RD, PEI, Acta de reunión, Sesiones)..." value="${esc(it.evidencia || '')}" data-sec="${si}" data-item-evidencia="${ii}" style="flex:1;font-size:12px;color:var(--text-600)">
          </div>
        </div>
      `;
    }).join('');

    const isFirst = si === 0;
    const isLast = si === currentDisplaySections.length - 1;

    return `
      <fieldset class="secCard" draggable="true" data-sec-idx="${si}" style="margin-bottom:16px;border:1px solid var(--line-strong);border-radius:var(--radius);padding:14px;background:#FFFFFF">
        <legend style="padding:0 8px;font-weight:700;display:flex;align-items:center;gap:6px">
          <span class="secCardHandle" title="Arrastra para mover la sección" style="cursor:grab">⠿</span>
          <span class="secOrderBadge" style="background:var(--primary);color:#fff;border-radius:10px;padding:1px 7px;font-size:11px">#${si + 1}</span>
          <input type="text" placeholder="Nombre de la sección / dimensión *" value="${esc(sec.nombre)}" data-secname="${si}" style="font-family:inherit;font-weight:700;border:none;border-bottom:1.5px solid var(--line-strong);padding:4px 8px;width:340px;background:transparent;font-size:14px">
        </legend>
        <div style="display:flex;align-items:center;justify-content:flex-end;gap:6px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px dashed var(--line)">
          <span style="font-size:12px;color:var(--ink-soft);margin-right:auto">Posición:</span>
          <button type="button" class="btn secondary small" data-movesec="${si}|up" ${isFirst ? 'disabled style="opacity:0.35;cursor:not-allowed"' : ''} title="Mover sección arriba">▲ Subir</button>
          <button type="button" class="btn secondary small" data-movesec="${si}|down" ${isLast ? 'disabled style="opacity:0.35;cursor:not-allowed"' : ''} title="Mover sección abajo">▼ Bajar</button>
        </div>
        ${itemsHtml || '<p class="helpText" style="margin:4px 0 10px">Sin indicadores en esta sección.</p>'}
        <div style="margin-top:10px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
          <button type="button" class="btn secondary small" data-additem="${si}">＋ Agregar ítem</button>
          <button type="button" class="btn danger small" data-rmsec="${si}">🗑️ Quitar sección</button>
        </div>
      </fieldset>
    `;
  }).join('') || '<p class="helpText" style="padding:14px;border:1px dashed var(--line);border-radius:6px;text-align:center">Sin secciones. Agrega la primera sección para esta ficha.</p>';

  // Helper para generar el HTML de Campos de Cabecera (Extras)
  const extrasHtml = (bs.extras || []).map((ex, i) => {
    const isFirst = i === 0;
    const isLast = i === (bs.extras || []).length - 1;
    const isSelect = ex.tipo === 'select';
    return `
      <div class="extraDefRow" data-extra-idx="${i}" style="display:flex;flex-direction:column;gap:6px;margin-bottom:8px;padding:8px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--border)">
        <div style="display:flex;align-items:center;gap:8px">
          <span class="secOrderBadge" style="font-size:11px;font-weight:700">#${i + 1}</span>
          <input type="text" class="extraLabelInp" placeholder="Etiqueta del campo (ej: Director(a), Turno, Nivel)" value="${esc(ex.label)}" data-extralabel="${i}" style="flex:1">
          <select class="extraTipoSel" data-extratipo="${i}" style="max-width:145px">
            <option value="texto" ${ex.tipo === 'texto' ? 'selected' : ''}>Texto corto</option>
            <option value="numero" ${ex.tipo === 'numero' ? 'selected' : ''}>Número</option>
            <option value="fecha" ${ex.tipo === 'fecha' ? 'selected' : ''}>Fecha</option>
            <option value="si_no" ${ex.tipo === 'si_no' ? 'selected' : ''}>Sí / No</option>
            <option value="select" ${ex.tipo === 'select' ? 'selected' : ''}>Selector desplegable</option>
            <option value="textarea" ${ex.tipo === 'textarea' ? 'selected' : ''}>Texto largo / Área</option>
          </select>
          <label class="extraReqLabel" style="font-size:11.5px;display:flex;align-items:center;gap:4px;cursor:pointer">
            <input type="checkbox" data-extrareq="${i}" ${ex.required ? 'checked' : ''}> Req.
          </label>
          <div class="extraActs" style="display:flex;gap:4px">
            <button type="button" class="iconBtn small" data-moveextra="${i}|up" ${isFirst ? 'disabled' : ''} title="Subir">▲</button>
            <button type="button" class="iconBtn small" data-moveextra="${i}|down" ${isLast ? 'disabled' : ''} title="Bajar">▼</button>
            <button type="button" class="iconBtn small" data-rmextra="${i}" title="Quitar">✕</button>
          </div>
        </div>
        ${isSelect ? `
          <div style="display:flex;align-items:center;gap:6px;padding-left:26px">
            <span style="font-size:11.5px;color:var(--text-600);font-weight:600">Opciones:</span>
            <input type="text" placeholder="Separadas por comas (ej: Mañana, Tarde, Noche)" value="${esc(ex.opciones || '')}" data-extraopts="${i}" style="flex:1;font-size:11.5px">
          </div>
        ` : ''}
      </div>
    `;
  }).join('') || '<p class="helpText" style="padding:8px;font-style:italic">Sin campos personalizados de cabecera.</p>';

  // Helper para generar el HTML de Tablas Cuantitativas Especializadas
  const tablasHtml = (bs.tablas || []).map((tbl, ti) => {
    const colsHtml = (tbl.columnas || []).map((col, ci) => `
      <span class="builderColChip">
        <strong>${esc(col.nombre)}</strong>
        <span style="font-size:10px;color:var(--text-500)">[${col.tipo}]</span>
        <span class="rmChip" data-rmtblcol="${ti}|${ci}" title="Quitar columna">✕</span>
      </span>
    `).join('');

    const rowsHtml = (tbl.filas || []).map((row, ri) => `
      <span class="builderRowChip">
        <span>${esc(row.etiqueta)}</span>
        <span class="rmChip" data-rmtblrow="${ti}|${ri}" title="Quitar fila">✕</span>
      </span>
    `).join('');

    return `
      <div class="builderTableCard">
        <div class="builderTableCardHeader">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="background:var(--navy-900);color:#FFFFFF;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:700">Tabla #${ti + 1}</span>
            <strong style="font-size:14px;color:var(--navy-900)">${esc(tbl.titulo || 'Tabla sin título')}</strong>
          </div>
          <button type="button" class="btn danger small" data-rmtable="${ti}" title="Eliminar tabla">🗑️ Eliminar tabla</button>
        </div>

        <div class="fieldGrid" style="margin-bottom:10px">
          <div class="field">
            <label>Título de la tabla *</label>
            <input type="text" placeholder="Ej: Cuadro de Personal, Cuadro de Matrícula..." value="${esc(tbl.titulo || '')}" data-tbl-titulo="${ti}">
          </div>
          <div class="field">
            <label>Descripción / Indicación breve</label>
            <input type="text" placeholder="Ej: Registrar información consolidada..." value="${esc(tbl.descripcion || '')}" data-tbl-desc="${ti}">
          </div>
        </div>

        <!-- Columnas -->
        <div class="builderTableColRowBox">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Columnas de la tabla (${(tbl.columnas || []).length}):</span>
            <div style="display:flex;gap:4px;align-items:center">
              <input type="text" placeholder="Nueva columna..." id="newColNom_${ti}" style="width:140px;font-size:11.5px;padding:3px 6px">
              <select id="newColTipo_${ti}" style="font-size:11.5px;padding:3px 4px">
                <option value="numero">Número</option>
                <option value="texto">Texto</option>
              </select>
              <button type="button" class="btn secondary small" data-addtblcol="${ti}" style="padding:2px 8px;font-size:11px">＋ Col</button>
            </div>
          </div>
          <div class="builderColRowList">
            ${colsHtml || '<span style="font-size:11.5px;color:var(--text-400);font-style:italic">Sin columnas definidas.</span>'}
          </div>
        </div>

        <!-- Filas Predeterminadas -->
        <div class="builderTableColRowBox" style="margin-top:8px;margin-bottom:0">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
            <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filas base predeterminadas (${(tbl.filas || []).length}):</span>
            <div style="display:flex;gap:4px;align-items:center">
              <input type="text" placeholder="Nueva fila (ej: Directivo, Docente)..." id="newRowEtiq_${ti}" style="width:190px;font-size:11.5px;padding:3px 6px">
              <button type="button" class="btn secondary small" data-addtblrow="${ti}" style="padding:2px 8px;font-size:11px">＋ Fila</button>
            </div>
          </div>
          <div class="builderColRowList">
            ${rowsHtml || '<span style="font-size:11.5px;color:var(--text-400);font-style:italic">Sin filas predeterminadas (se llenarán libremente).</span>'}
          </div>
        </div>
      </div>
    `;
  }).join('') || '<p class="helpText" style="padding:10px;border:1px dashed var(--line);border-radius:6px;text-align:center">Sin tablas cuantitativas especializadas agregadas. Puedes agregar cuadros de personal, metas o matrícula si esta ficha lo requiere.</p>';

  // Render Layout Completo
  container.innerHTML = `
    <div class="pageHead" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px">
      <div>
        <h2>${builderEditingId ? 'Editar tipo de ficha' : 'Nuevo tipo de ficha'}</h2>
        <p>Configura cabeceras, condiciones de visitas, tablas especializadas, compromisos e indicadores oficiales.</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px">
        <span id="dirtyIndicator" style="display:${builderIsDirty ? 'inline-flex' : 'none'};align-items:center;gap:5px;font-size:12px;font-weight:600;color:var(--amber-700);background:var(--amber-50);border:1px solid var(--amber-200);border-radius:12px;padding:3px 10px">
          ● Cambios sin guardar
        </span>
        <div class="builderMobileToggle" id="builderMobileToggle">
          <button type="button" class="btn secondary small ${builderMobileTab === 'editor' ? 'active' : ''}" id="btnShowEditorMobile">✏️ Editor</button>
          <button type="button" class="btn secondary small ${builderMobileTab === 'preview' ? 'active' : ''}" id="btnShowPreviewMobile">👁️ Vista previa</button>
        </div>
      </div>
    </div>

    ${subNavHtml || ''}

    <!-- Selector de Modo: Editor Visual vs Editor JSON -->
    <div class="builderModeNav">
      <button type="button" class="builderModeBtn ${builderMode === 'visual' ? 'active' : ''}" id="btnBuilderModeVisual">
        🎨 Editor Visual (Formularios y Tablas)
      </button>
      <button type="button" class="builderModeBtn ${builderMode === 'json' ? 'active' : ''}" id="btnBuilderModeJson">
        💻 Editor de Código JSON (Avanzado)
      </button>
    </div>

    <!-- MODO JSON CODE -->
    <div class="builderJsonPane" id="builderJsonPaneWrap" style="display:${builderMode === 'json' ? 'block' : 'none'}">
      <div class="builderJsonStatus valid" id="builderJsonStatus">
        ✓ Estructura JSON válida y sincronizada con el editor visual. Puedes editar o pegar la ficha completa en JSON.
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn secondary small" id="btnSyncJsonToVisual">🔄 Aplicar cambios al editor visual</button>
          <button type="button" class="btn secondary small" id="btnCopyJson">📋 Copiar JSON</button>
          <button type="button" class="btn secondary small" id="downloadJsonBtnCode">📥 Descargar JSON</button>
          <label class="btn secondary small" style="cursor:pointer;margin:0" title="Cargar archivo JSON desde tu equipo">
            📤 Importar JSON <input type="file" id="importJsonFileInputCode" accept=".json,application/json" style="display:none">
          </label>
        </div>
        <span style="font-size:12px;color:var(--ink-soft)">Soporta todas las propiedades: tablas, visitas, extras, compromisos y secciones.</span>
      </div>
      <textarea id="builderJsonTextarea" class="builderJsonTextarea" rows="26" spellcheck="false">${esc(JSON.stringify(cleanBuilderStateForExport(bs), null, 2))}</textarea>
    </div>

    <!-- MODO SPLIT-GRID: EDITOR VISUAL + VISTA PREVIA -->
    <div class="builderSplitGrid" id="builderVisualSplitGrid" style="display:${builderMode === 'visual' ? 'grid' : 'none'}">
      <!-- PANEL IZQUIERDO: FORMULARIO DEL EDITOR -->
      <div class="builderEditorPane ${builderMobileTab === 'preview' ? 'mobileHidden' : ''}" id="builderEditorPane">
        
        <!-- Panel 1: Datos Generales y Calificación -->
        <div class="panel">
          <h3 style="margin-top:0">1. Datos Generales de la Ficha</h3>
          <div class="fieldGrid">
            <div class="field" style="max-width:90px">
              <label for="b_icono">Ícono</label>
              <input type="text" id="b_icono" value="${esc(bs.icono || '📋')}" maxlength="4" style="text-align:center;font-size:18px">
            </div>
            <div class="field" style="flex:1">
              <label for="b_nombre">Nombre completo de la ficha *</label>
              <input type="text" id="b_nombre" value="${esc(bs.nombre)}" placeholder="Ej: Ficha de Monitoreo a la Gestión Escolar EBR">
            </div>
            <div class="field" style="max-width:180px">
              <label for="b_nombre_corto">Sigla / Nombre corto</label>
              <input type="text" id="b_nombre_corto" value="${esc(bs.nombreCorto || '')}" placeholder="Ej: GESTIÓN EBR">
            </div>
          </div>

          <div class="field" style="margin-top:10px">
            <label for="b_desc">Descripción institucional y marco normativo</label>
            <textarea id="b_desc" rows="2" placeholder="Breve descripción del propósito, alcance o base legal (ej: RM N° 501-2025-MINEDU)">${esc(bs.descripcion || '')}</textarea>
          </div>

          <div class="fieldGrid" style="margin-top:10px">
            <div class="field">
              <label for="b_modalidad">Nivel / Modalidad educativa</label>
              <select id="b_modalidad">
                ${MODALIDADES.map(m => `<option value="${m}" ${(bs.modalidad === m) ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="field">
              <label for="b_tipo">Escala de respuesta</label>
              <select id="b_tipo">
                ${Object.keys(RESPONSE_LABELS).map(k => `<option value="${k}" ${(k === bs.tipoRespuesta) ? 'selected' : ''}>${RESPONSE_LABELS[k]}</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="fieldGrid" style="margin-top:10px">
            <div class="field">
              <label for="b_regla_nivel">Regla de calificación y logro global</label>
              <select id="b_regla_nivel">
                ${Object.keys(REGLAS_NIVEL_MAP).map(r => `<option value="${r}" ${(bs.regla_nivel === r) ? 'selected' : ''}>${REGLAS_NIVEL_MAP[r]}</option>`).join('')}
              </select>
            </div>
            <div class="field" style="max-width:160px">
              <label for="b_version">Versión / Año</label>
              <input type="text" id="b_version" value="${esc(bs.version || '2026.1')}" placeholder="2026.1">
            </div>
          </div>

          <!-- Rangos de calificación personalizados (Semáforo por conteo, ej: JEC) -->
          <div class="builderRangesBox" id="builderRangesBox" style="display:${bs.regla_nivel === 'conteo_rangos' ? 'block' : 'none'}">
            <div style="font-size:12px;font-weight:700;color:var(--navy-900);margin-bottom:4px">
              🎯 Configuración de rangos del semáforo (por conteo de puntos):
            </div>
            <p style="font-size:11.5px;color:var(--text-600);margin:0 0 8px">
              Define los valores mínimo y máximo para cada nivel de implementación (ej. para JEC: 0-11 Incipiente, 12-23 Parcial, 24-31 Lograda):
            </p>
            <div class="rangeRow inicio">
              <span class="rangeBadge">🔴 Inicio / Rojo</span>
              <div class="rangeInpGroup">
                <span>De:</span>
                <input type="number" id="b_rng_ini_min" value="${(bs.regla_nivel_config?.inicio?.min !== undefined) ? bs.regla_nivel_config.inicio.min : 0}" min="0">
                <span>a:</span>
                <input type="number" id="b_rng_ini_max" value="${(bs.regla_nivel_config?.inicio?.max !== undefined) ? bs.regla_nivel_config.inicio.max : 11}" min="0">
                <span>Etiqueta:</span>
                <input type="text" id="b_rng_ini_lbl" value="${esc(bs.regla_nivel_config?.inicio?.label || 'Incipiente')}" placeholder="Ej: Incipiente">
              </div>
            </div>
            <div class="rangeRow proceso">
              <span class="rangeBadge">🟡 Proceso / Ámbar</span>
              <div class="rangeInpGroup">
                <span>De:</span>
                <input type="number" id="b_rng_proc_min" value="${(bs.regla_nivel_config?.proceso?.min !== undefined) ? bs.regla_nivel_config.proceso.min : 12}" min="0">
                <span>a:</span>
                <input type="number" id="b_rng_proc_max" value="${(bs.regla_nivel_config?.proceso?.max !== undefined) ? bs.regla_nivel_config.proceso.max : 23}" min="0">
                <span>Etiqueta:</span>
                <input type="text" id="b_rng_proc_lbl" value="${esc(bs.regla_nivel_config?.proceso?.label || 'Parcial')}" placeholder="Ej: Parcial">
              </div>
            </div>
            <div class="rangeRow logrado">
              <span class="rangeBadge">🟢 Logrado / Verde</span>
              <div class="rangeInpGroup">
                <span>De:</span>
                <input type="number" id="b_rng_log_min" value="${(bs.regla_nivel_config?.logrado?.min !== undefined) ? bs.regla_nivel_config.logrado.min : 24}" min="0">
                <span>a:</span>
                <input type="number" id="b_rng_log_max" value="${(bs.regla_nivel_config?.logrado?.max !== undefined) ? bs.regla_nivel_config.logrado.max : 31}" min="0">
                <span>Etiqueta:</span>
                <input type="text" id="b_rng_log_lbl" value="${esc(bs.regla_nivel_config?.logrado?.label || 'Lograda')}" placeholder="Ej: Lograda">
              </div>
            </div>
          </div>

          <!-- Paleta de Color Institucional -->
          <div class="field" style="margin-top:12px">
            <label style="margin-bottom:6px;display:block">Color distintivo institucional:</label>
            <div class="colorSwatches" id="colorSwatchesList">
              ${FICHA_PALETTE.map(c => `
                <button type="button" class="colorSwatch ${(bs.color && bs.color.toLowerCase() === c.hex.toLowerCase()) ? 'active' : ''}" data-color="${c.hex}" style="background:${c.hex}" title="${c.name}"></button>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Panel 2: Monitoreo Multi-Visita y Condiciones -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">2. Condiciones de Monitoreo y Visitas</h3>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--navy-900);cursor:pointer">
              <input type="checkbox" id="b_tiene_visitas" ${bs.tieneVisitas ? 'checked' : ''}>
              Habilitar multi-visita independiente
            </label>
          </div>
          <p style="font-size:12px;color:var(--text-600);margin:4px 0 10px">
            Permite aplicar la misma ficha en momentos sucesivos (ej: V1 Diagnóstica, V2 Seguimiento, V3 Cierre) conservando el histórico.
          </p>
          
          <div class="visitasConfigBox" id="visitasConfigBox" style="display:${bs.tieneVisitas ? 'block' : 'none'}">
            <div style="font-size:12px;font-weight:700;color:var(--navy-900);margin-bottom:4px">
              Modalidad de aplicación de las visitas:
            </div>
            <div class="visitaModeBox">
              <label class="visitaModeOption ${bs.tipoVisitas !== 'items_por_visita' ? 'active' : ''}">
                <input type="radio" name="b_tipo_visitas" value="mismos_items" ${bs.tipoVisitas !== 'items_por_visita' ? 'checked' : ''}>
                <div>
                  <span class="visitaModeTitle">🔁 Mismos indicadores en todas las visitas</span>
                  <span class="visitaModeDesc">Seguimiento continuo de los mismos ítems a lo largo de V1, V2 y V3 (como CEBE y PRITE).</span>
                </div>
              </label>
              <label class="visitaModeOption ${bs.tipoVisitas === 'items_por_visita' ? 'active' : ''}">
                <input type="radio" name="b_tipo_visitas" value="items_por_visita" ${bs.tipoVisitas === 'items_por_visita' ? 'checked' : ''}>
                <div>
                  <span class="visitaModeTitle">📑 Indicadores diferenciados por cada visita</span>
                  <span class="visitaModeDesc">Cada visita o momento tiene sus propias preguntas e instrumentos independientes (como EBR V1 Inicio, V2 Proceso, V3 Cierre).</span>
                </div>
              </label>
            </div>

            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;margin-top:12px">
              <strong style="font-size:12.5px;color:var(--navy-900)">Momentos / Visitas configuradas:</strong>
              <button type="button" class="btn secondary small" id="addVisitaBtn">＋ Agregar visita</button>
            </div>
            <div id="visitasListWrap">
              ${(bs.visitas || []).map((v, vi) => `
                <div class="visitaItemRow">
                  <span style="font-size:12px;font-weight:700;color:var(--navy-900);min-width:60px">Visita ${vi + 1}:</span>
                  <input type="text" data-visitainp="${vi}" value="${esc(v)}" placeholder="Nombre de la visita (ej: Visita ${vi + 1} - Diagnóstico)" style="flex:1">
                  <button type="button" class="iconBtn small" data-rmvisita="${vi}" ${(bs.visitas || []).length <= 1 ? 'disabled style="opacity:0.35"' : ''} title="Eliminar visita">✕</button>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Panel 3: Campos de Cabecera Configurables -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="margin:0">3. Campos de Cabecera Personalizados</h3>
              <span style="font-size:11.5px;color:var(--ink-soft)">Adicionales a Institución Educativa, Fecha y N° Visita</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button type="button" class="btn secondary small" id="addPresetDirectivosBtn">👤 + Bloque Directivos</button>
              <button type="button" class="btn secondary small" id="addExtraBtn">＋ Agregar campo</button>
            </div>
          </div>
          <div id="extrasList">${extrasHtml}</div>
        </div>

        <!-- Panel 4: Tablas Cuantitativas Especializadas -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
            <div>
              <h3 style="margin:0">4. Tablas Cuantitativas Especializadas</h3>
              <span style="font-size:11.5px;color:var(--ink-soft)">Cuadros de personal, estudiantes, metas de matrícula o recursos</span>
            </div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <button type="button" class="btn secondary small" id="addPresetPersonalBtn">📋 + Cuadro Personal</button>
              <button type="button" class="btn secondary small" id="addPresetEstudiantesBtn">🎓 + Cuadro Matrícula</button>
              <button type="button" class="btn secondary small" id="addPresetSaaneeBtn">♿ + Personal SAANEE</button>
              <button type="button" class="btn secondary small" id="addCustomTableBtn">＋ Tabla vacía</button>
            </div>
          </div>
          <div id="tablasList">${tablasHtml}</div>
        </div>

        <!-- Panel 5: Compromisos de Mejora (Sección V) -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h3 style="margin:0">5. Compromisos de Mejora y Acuerdos (Sección V)</h3>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--navy-900);cursor:pointer">
              <input type="checkbox" id="b_comp_hab" ${(bs.compromisos && bs.compromisos.habilitado) ? 'checked' : ''}>
              Habilitar Sección de Compromisos
            </label>
          </div>
          <p style="font-size:12px;color:var(--text-600);margin:4px 0 10px">
            Permite suscribir compromisos firmados entre el Director y el Especialista al concluir la visita.
          </p>

          <div class="compromisosConfigBox" id="compromisosConfigBox" style="display:${(bs.compromisos && bs.compromisos.habilitado) ? 'block' : 'none'}">
            <div style="display:flex;flex-direction:column;gap:8px">
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
                <input type="checkbox" id="b_comp_dir" ${(bs.compromisos && bs.compromisos.director !== false) ? 'checked' : ''}>
                Compromisos del Director(a) / Equipo Directivo de la I.E.
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">
                <input type="checkbox" id="b_comp_esp" ${(bs.compromisos && bs.compromisos.especialista !== false) ? 'checked' : ''}>
                Compromisos del Especialista / Monitor UGEL 03
              </label>
              <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
                <span style="font-size:12px;color:var(--text-700);font-weight:600">Filas de compromiso por visita:</span>
                <input type="number" id="b_comp_filas" min="1" max="10" value="${(bs.compromisos && bs.compromisos.filasPorVisita) || 3}" style="width:70px;text-align:center">
              </div>
            </div>
          </div>
        </div>

        <!-- Panel 6: Secciones e Indicadores -->
        <div class="panel">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
            <div>
              <h3 style="margin:0">6. Secciones e Indicadores de Monitoreo</h3>
              <span style="font-size:11.5px;color:var(--ink-soft)">Dimensiones, criterios, códigos y evidencias sugeridas</span>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              ${isMultiVisitaDiferenciada && (bs.visitas || []).length > 1 ? `
                <button type="button" class="btn secondary small" id="btnCopyVisitaSecs" title="Copiar secciones desde otra visita">📋 Copiar de otra visita...</button>
              ` : ''}
              <button type="button" class="btn secondary small" id="addSecBtn">＋ Agregar sección</button>
            </div>
          </div>

          ${isMultiVisitaDiferenciada ? `
            <div class="builderVisitTabsWrap">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Editando indicadores para:</span>
                <div class="builderVisitTabs">
                  ${(bs.visitas || []).map((vNom, vIdx) => {
    const vSecs = (bs.seccionesPorVisita && bs.seccionesPorVisita[vIdx]) ? bs.seccionesPorVisita[vIdx] : (vIdx === 0 ? (bs.secciones || []) : []);
    const count = (vSecs || []).reduce((acc, s) => acc + (s.items || []).length, 0);
    return `
                      <button type="button" class="builderVisitTab ${vIdx === builderActiveVisitTab ? 'active' : ''}" data-visita-tab="${vIdx}">
                        <span>📅 ${esc(vNom || ('Visita ' + (vIdx + 1)))}</span>
                        <span class="builderVisitTabBadge">${count} ítems</span>
                      </button>
                    `;
  }).join('')}
                </div>
              </div>
            </div>
          ` : ''}

          <div id="seccionesList">${seccionesHtml}</div>
        </div>

      </div>

      <!-- PANEL DERECHO: VISTA PREVIA EN VIVO STICKY -->
      <div class="builderPreviewPane ${builderMobileTab === 'editor' ? 'mobileHidden' : ''}" id="builderPreviewPane">
        <div class="builderPreviewSticky" id="builderPreviewSticky">
          <div class="builderPreviewHeader" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;padding:12px 16px;background:var(--navy-900);color:#FFFFFF;flex-shrink:0">
            <div>
              <h4 style="margin:0;font-size:13.5px;font-weight:700;color:#FFFFFF">Vista previa en tiempo real</h4>
              <span style="font-size:11px;color:#94A3B8">Sincronizada automáticamente con tu edición</span>
            </div>
            <div class="builderPreviewTabs">
              <button type="button" class="builderPreviewTab ${builderPreviewMode === 'formulario' ? 'active' : ''}" data-preview-mode="formulario">📋 Formulario</button>
              <button type="button" class="builderPreviewTab ${builderPreviewMode === 'documento' ? 'active' : ''}" data-preview-mode="documento">📄 Documento</button>
            </div>
          </div>

          <!-- Cuerpo desplazable con scrollbar independiente y sincronizado -->
          <div class="builderPreviewBodyScroll" id="builderPreviewBodyScroll">
            <div id="builderPreviewContent"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- BARRA FIJA INFERIOR DE GUARDADO (SIEMPRE VISIBLE) -->
    <div class="builderBottomStickyBar" id="builderBottomStickyBar">
      <div class="builderBottomStickyContent">
        <div class="builderBottomStickyInfo">
          <div style="font-size:22px" id="bottomBarFichaIcon">${esc(bs.icono || '📋')}</div>
          <div>
            <div class="builderBottomFichaName" id="bottomBarFichaName">${esc(bs.nombre || 'Nueva Ficha de Monitoreo')}</div>
            <div style="display:flex;gap:6px;align-items:center;margin-top:2px">
              <span class="builderBottomMetaPill" id="bottomBarMetaModalidad">${esc(bs.modalidad || 'General')}</span>
              <span class="builderBottomMetaPill" id="bottomBarMetaVersion">v${esc(bs.version || '2026.1')}</span>
              <span id="bottomDirtyBadge" class="builderBottomDirtyBadge" style="display:${builderIsDirty ? 'inline-flex' : 'none'}">
                ● Cambios sin guardar
              </span>
            </div>
          </div>
        </div>
        <div class="builderBottomStickyActs">
          <button type="button" class="btn secondary" id="cancelTipoBtn">Cancelar</button>
          <button type="button" class="btn secondary" id="downloadJsonBtn" title="Descargar plantilla como archivo .json">📥 Descargar JSON</button>
          <label class="btn secondary" style="cursor:pointer;margin:0" title="Cargar archivo JSON">
            📤 Importar JSON <input type="file" id="importJsonFileInput" accept=".json,application/json" style="display:none">
          </label>
          <button type="button" class="btn secondary" id="saveDraftBtn">📝 Guardar borrador</button>
          <button type="button" class="btn" id="saveTipoBtn" style="font-weight:700">💾 Guardar ficha completa</button>
        </div>
      </div>
    </div>
  `;

  // Función que genera el HTML de la vista previa en vivo
  function buildPreviewInnerHtml() {
    const isPrevMultiDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
    const previewSections = isPrevMultiDiferenciada
      ? ((bs.seccionesPorVisita && bs.seccionesPorVisita[builderActiveVisitPreview]) || (builderActiveVisitPreview === 0 ? (bs.secciones || []) : []))
      : (bs.secciones || []);

    const totalSecs = previewSections.length;
    const totalItems = previewSections.reduce((acc, s) => acc + (s.items || []).length, 0);

    // Validación de campos
    const errors = [];
    if (!bs.nombre || !bs.nombre.trim()) {
      errors.push({ msg: 'Falta ingresar el nombre de la ficha', target: '#b_nombre' });
    }
    if (previewSections.length === 0) {
      errors.push({ msg: 'Debes agregar al menos una sección', target: '#addSecBtn' });
    } else {
      previewSections.forEach((sec, si) => {
        if (!sec.nombre || !sec.nombre.trim()) {
          errors.push({ msg: `La sección #${si + 1} no tiene título`, target: `[data-secname="${si}"]` });
        }
        if (!sec.items || sec.items.length === 0) {
          errors.push({ msg: `La sección #${si + 1} ("${sec.nombre || 'Sin nombre'}") no tiene indicadores`, target: `[data-additem="${si}"]` });
        } else {
          sec.items.forEach((it, ii) => {
            if (!it.texto || !it.texto.trim()) {
              errors.push({ msg: `El ítem #${ii + 1} en la sección #${si + 1} está vacío`, target: `[data-sec="${si}"][data-item="${ii}"]` });
            }
          });
        }
      });
    }

    // Mini tarjeta resumen
    const curColor = bs.color || (FICHA_PALETTE[0] || {}).hex || '#1E40AF';
    const curPal = FICHA_PALETTE.find(p => p.hex.toLowerCase() === curColor.toLowerCase()) || { hex: curColor, bg: curColor + '18' };

    const miniCardHtml = `
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-400);margin-bottom:6px">Así se verá en la lista de fichas:</div>
      <div class="fichaCard previewMiniCard" style="margin-bottom:14px;box-shadow:none;border:1px solid var(--line);cursor:default">
        <div class="fichaCardColorStripe" style="background:${curPal.hex};"></div>
        <div class="fichaCardMain" style="padding:10px 14px">
          <div class="fichaCardIconWrap" style="background:${curPal.bg};color:${curPal.hex};width:38px;height:38px;font-size:20px">
            ${esc(bs.icono || '📋')}
          </div>
          <div class="fichaCardContent">
            <h4 class="fichaCardTitle" style="font-size:14px">${esc(bs.nombre || 'Nombre de la ficha')}</h4>
            <p class="fichaCardDesc" style="font-size:12px">${esc(bs.descripcion || 'Sin descripción.')}</p>
            <div class="fichaCardBadges" style="margin-top:6px">
              <span class="fichaBadge fichaBadgeModalidad">${esc(bs.modalidad || 'General')}</span>
              <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
              <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</span>
              ${bs.tieneVisitas ? `<span class="fichaBadge" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">🔁 ${(bs.visitas || []).length} visitas</span>` : ''}
              ${(bs.tablas && bs.tablas.length > 0) ? `<span class="fichaBadge" style="background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0">📊 ${bs.tablas.length} tablas</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    `;

    // Avisos de validación
    const validationBoxHtml = errors.length > 0 ? `
      <div class="previewValidationBox" style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;margin-bottom:14px">
        <div style="font-weight:700;font-size:12px;color:#92400E;margin-bottom:6px">⚠️ Campos incompletos (${errors.length}) — Haz clic para corregir:</div>
        <ul style="margin:0;padding-left:18px;font-size:12px;color:#B45309">
          ${errors.map(err => `
            <li style="margin-bottom:3px">
              <a href="javascript:void(0)" class="previewValItem" data-target="${esc(err.target)}" style="color:#B45309;text-decoration:underline">
                ${esc(err.msg)}
              </a>
            </li>
          `).join('')}
        </ul>
      </div>
    ` : `
      <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#065F46;display:flex;align-items:center;gap:6px">
        <span>✓</span> <strong>Estructura completa y consistente.</strong> Lista para registrar visitas oficiales.
      </div>
    `;

    const statsBarHtml = `
      <div style="display:flex;gap:10px;font-size:11.5px;color:var(--text-600);margin-bottom:12px;padding:6px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--line);flex-wrap:wrap">
        <span>📑 <strong>${totalSecs}</strong> secciones</span>
        <span>🔢 <strong>${totalItems}</strong> indicadores</span>
        <span>⚖️ <strong>${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</strong></span>
        <span>📏 Regla: <strong>${esc(bs.regla_nivel || 'porcentaje')}</strong></span>
      </div>
    `;

    const impactAlertHtml = (existingCount > 0) ? `
      <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#1E40AF;line-height:1.4">
        ℹ️ <strong>Historial:</strong> Esta plantilla tiene <strong>${existingCount}</strong> visita(s) registradas. Las modificaciones se aplicarán a nuevos registros.
      </div>
    ` : '';

    // Barra de Pestañas de Visitas en Preview
    const visitasTabsHtml = bs.tieneVisitas && (bs.visitas || []).length > 0 ? `
      <div class="previewVisitasTabsBar">
        ${(bs.visitas || []).map((vNom, vi) => `
          <button type="button" class="previewVisitaTabBtn ${builderActiveVisitPreview === vi ? 'active' : ''}" data-prev-visit-idx="${vi}">
            ${esc(vNom)}
          </button>
        `).join('')}
      </div>
    ` : '';

    let modeContentHtml = '';

    if (builderPreviewMode === 'formulario') {
      // Modo Formulario de Registro
      let answeredCount = 0;
      let currentScore = 0;
      let maxScore = 0;

      previewSections.forEach(sec => {
        (sec.items || []).forEach(it => {
          const ansKey = `${builderActiveVisitPreview}_${it.id}`;
          const ans = builderTestAnswers[ansKey] || builderTestAnswers[it.id];
          if (ans !== undefined && ans !== null && ans !== '') {
            answeredCount++;
            if (bs.tipoRespuesta === 'si_no') {
              maxScore += 1;
              if (ans === 'si' || ans === '1') currentScore += 1;
            } else if (bs.tipoRespuesta === 'escala1_3') {
              maxScore += 3;
              currentScore += Number(ans) || 0;
            } else if (bs.tipoRespuesta === 'escala1_4' || bs.tipoRespuesta === 'rubrica1_4' || bs.tipoRespuesta === 'ips') {
              maxScore += 4;
              currentScore += Number(ans) || 0;
            } else if (bs.tipoRespuesta === 'escala1_5') {
              maxScore += 5;
              currentScore += Number(ans) || 0;
            }
          }
        });
      });
      const pctScore = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;

      const testScoreBar = totalItems > 0 ? `
        <div style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:12px;font-weight:600;color:var(--text-700)">Simulación de Calificación en vivo:</div>
            <div style="font-size:11.5px;color:var(--text-500)">Respondidos: ${answeredCount} de ${totalItems} | Puntaje: <strong>${currentScore}</strong> / ${maxScore || totalItems}</div>
          </div>
          <div style="text-align:right">
            <span style="font-size:20px;font-weight:800;color:var(--primary)">${pctScore}%</span>
          </div>
        </div>
      ` : '';

      // Tablas especializadas en preview
      const previewTablasHtml = (bs.tablas || []).map(tbl => `
        <div style="margin-bottom:14px">
          <div style="font-size:12px;font-weight:700;color:var(--navy-900);margin-bottom:4px">${esc(tbl.titulo)}</div>
          ${tbl.descripcion ? `<div style="font-size:11px;color:var(--text-500);margin-bottom:6px">${esc(tbl.descripcion)}</div>` : ''}
          <div style="overflow-x:auto">
            <table class="previewCustomTable">
              <thead>
                <tr>
                  <th style="min-width:140px">Fila / Categoría</th>
                  ${(tbl.columnas || []).map(col => `<th style="text-align:center">${esc(col.nombre)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(tbl.filas && tbl.filas.length > 0 ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }]).map(r => `
                  <tr>
                    <td style="font-weight:600;color:var(--text-700)">${esc(r.etiqueta)}</td>
                    ${(tbl.columnas || []).map(() => `<td style="text-align:center;color:var(--text-400)">[ 0 ]</td>`).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `).join('');

      // Compromisos en preview
      const previewCompromisosHtml = (bs.compromisos && bs.compromisos.habilitado) ? `
        <div class="previewCompromisosWrap">
          <div style="font-size:12.5px;font-weight:700;color:var(--navy-900);margin-bottom:6px">Sección V: Compromisos de Mejora y Acuerdos</div>
          ${bs.compromisos.director !== false ? `
            <div style="margin-bottom:8px">
              <span style="font-size:11.5px;font-weight:600;color:var(--text-700)">Compromisos del Director(a) / Equipo Directivo:</span>
              <div style="font-size:11px;color:var(--text-400);font-style:italic;margin-top:2px">
                ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `<div>${idx + 1}. [Espacio para compromiso acordado...]</div>`).join('')}
              </div>
            </div>
          ` : ''}
          ${bs.compromisos.especialista !== false ? `
            <div>
              <span style="font-size:11.5px;font-weight:600;color:var(--text-700)">Compromisos del Especialista / Monitor UGEL:</span>
              <div style="font-size:11px;color:var(--text-400);font-style:italic;margin-top:2px">
                ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `<div>${idx + 1}. [Espacio para compromiso y asistencia técnica...]</div>`).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      ` : '';

      modeContentHtml = `
        <div class="previewFormSheet" style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px">
          ${visitasTabsHtml}

          <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);border:1px dashed var(--line);border-radius:6px;padding:8px 12px;margin-bottom:14px">
            <div style="font-size:12px;color:var(--text-600)">🧪 <strong>Modo prueba:</strong> Marca respuestas para simular el cálculo de puntaje en vivo.</div>
            <button type="button" class="btn secondary small" id="btnResetTest" style="padding:2px 8px;font-size:11px">Limpiar prueba</button>
          </div>

          ${testScoreBar}

          <!-- Simulación de cabecera -->
          <div style="background:var(--surface-2);border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:12px">
            <div style="font-weight:700;color:var(--text-700);margin-bottom:6px">Datos de la Visita (Simulación):</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
              <div><strong>I.E.:</strong> <span style="color:var(--text-500)">I.E. 1153 Alfonso Ugarte</span></div>
              <div><strong>Fecha:</strong> <span style="color:var(--text-500)">2026-10-14</span></div>
              <div><strong>Momento / Visita:</strong> <span style="color:var(--primary);font-weight:700">${esc(bs.tieneVisitas && bs.visitas && bs.visitas[builderActiveVisitPreview] ? bs.visitas[builderActiveVisitPreview] : 'Visita 1')}</span></div>
              ${(bs.extras || []).map(ex => {
        if (ex.tipo === 'select') {
          const opts = (ex.opciones || 'Opción 1, Opción 2').split(',').map(o => o.trim()).filter(Boolean);
          return `<div><strong>${esc(ex.label)}:</strong> <span style="color:var(--text-600)">[${esc(opts[0] || 'Selector')}]</span></div>`;
        }
        return `<div><strong>${esc(ex.label)}:</strong> <span style="color:var(--text-400)">[${esc(ex.tipo)}]</span></div>`;
      }).join('')}
            </div>
          </div>

          <!-- Tablas Cuantitativas -->
          ${previewTablasHtml}

          <!-- Secciones e Indicadores -->
          ${previewSections.map((sec, si) => `
            <div style="margin-bottom:16px;border:1px solid var(--line);border-radius:6px;overflow:hidden">
              <div style="background:var(--surface-3);padding:8px 12px;display:flex;align-items:center;justify-content:space-between">
                <span style="font-weight:700;font-size:12.5px;color:var(--ink)">
                  #${si + 1}: ${esc(sec.nombre || 'Sección sin título')}
                </span>
                <a href="javascript:void(0)" class="previewValItem" data-target="[data-secname='${si}']" style="font-size:11px;color:var(--primary);text-decoration:underline">
                  ✏️ Editar sección
                </a>
              </div>
              <div style="padding:8px 12px">
                ${(sec.items || []).map((it, ii) => {
        const itCode = it.id || ((si + 1) + '.' + (ii + 1));
        const ansKey = `${builderActiveVisitPreview}_${it.id}`;
        const ans = builderTestAnswers[ansKey] || builderTestAnswers[it.id] || '';
        return `
                    <div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:6px">
                      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
                        <span style="font-size:12px;color:var(--ink);font-weight:500">
                          <strong style="color:var(--primary)">${esc(itCode)}</strong> ${esc(it.texto || 'Indicador sin texto')}
                        </span>
                        <a href="javascript:void(0)" class="previewValItem" data-target="[data-sec='${si}'][data-item='${ii}']" style="font-size:11px;color:var(--ink-soft)" title="Ir a editar este ítem">
                          ✏️
                        </a>
                      </div>
                      ${it.evidencia ? `
                        <div style="font-size:11px;color:var(--text-500);display:flex;align-items:center;gap:4px">
                          <span>📂</span> <em>Evidencia: ${esc(it.evidencia)}</em>
                        </div>
                      ` : ''}
                      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:11.5px">
                        ${renderItemResponseInputs(it, bs.tipoRespuesta, ans)}
                      </div>
                    </div>
                  `;
      }).join('') || '<p style="font-size:11.5px;color:var(--text-400);margin:4px 0">Sin indicadores en esta sección.</p>'}
              </div>
            </div>
          `).join('') || '<p style="font-size:12px;color:var(--text-400)">Sin secciones agregadas.</p>'}

          <!-- Compromisos de Mejora -->
          ${previewCompromisosHtml}
        </div>
      `;
    } else {
      // Modo Documento Oficial Impreso
      modeContentHtml = `
        <div class="previewDocSheet" style="background:#FFFFFF;border:1px solid var(--line-strong);border-radius:6px;padding:20px;font-family:var(--sans);color:#1F2937">
          <div style="text-align:center;border-bottom:2px solid #1E3A8A;padding-bottom:10px;margin-bottom:14px">
            <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#4B5563;text-transform:uppercase">Ministerio de Educación · DRE Lima Metropolitana</div>
            <div style="font-size:13px;font-weight:800;letter-spacing:0.5px;color:#1E3A8A;margin:2px 0">UNIDAD DE GESTIÓN EDUCATIVA LOCAL N° 03</div>
            <div style="font-size:10.5px;color:#6B7280">Panel de Monitoreo y Asistencia Técnica 2026</div>
            <h3 style="font-size:15px;font-weight:800;margin:10px 0 4px;color:#1E40AF;text-transform:uppercase">${esc(bs.nombre || 'NOMBRE DE LA FICHA')}</h3>
            <div style="font-size:11px;font-weight:600;color:#4B5563">
              Modalidad: ${esc(bs.modalidad || 'General')} · Versión: ${esc(bs.version || '2026.1')} · Escala: ${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}
            </div>
          </div>

          <!-- Metadatos de Cabecera Oficial -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px">
            <tr>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700;width:25%">Institución Educativa:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;width:40%">[Nombre de la I.E.]</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700;width:15%">Cód. Modular:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px">[0123456]</td>
            </tr>
            <tr>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">Red Educativa:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px">[REI 01]</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">Fecha / N° Visita:</td>
              <td style="border:1px solid #D1D5DB;padding:4px 8px">[DD/MM/AAAA · ${esc(bs.tieneVisitas && bs.visitas && bs.visitas[builderActiveVisitPreview] ? bs.visitas[builderActiveVisitPreview] : 'Visita 1')}]</td>
            </tr>
            ${(bs.extras || []).map(ex => `
              <tr>
                <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">${esc(ex.label)}:</td>
                <td colspan="3" style="border:1px solid #D1D5DB;padding:4px 8px;color:#6B7280">[${esc(ex.tipo)}]</td>
              </tr>
            `).join('')}
          </table>

          <!-- Tablas Especializadas en Documento -->
          ${(bs.tablas || []).map(tbl => `
            <div style="margin-bottom:14px">
              <div style="font-size:11px;font-weight:700;color:#1E3A8A;margin-bottom:4px">${esc(tbl.titulo)}</div>
              <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px">
                <thead>
                  <tr style="background:#F3F4F6">
                    <th style="border:1px solid #D1D5DB;padding:4px 6px;text-align:left">Fila / Categoría</th>
                    ${(tbl.columnas || []).map(col => `<th style="border:1px solid #D1D5DB;padding:4px 6px;text-align:center">${esc(col.nombre)}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${(tbl.filas && tbl.filas.length > 0 ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }]).map(r => `
                    <tr>
                      <td style="border:1px solid #D1D5DB;padding:3px 6px">${esc(r.etiqueta)}</td>
                      ${(tbl.columnas || []).map(() => `<td style="border:1px solid #D1D5DB;padding:3px 6px;text-align:center">____</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `).join('')}

          <!-- Tabla de Dimensiones e Indicadores -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10.5px">
            <thead>
              <tr style="background:#1E3A8A;color:#FFFFFF">
                <th style="border:1px solid #1E3A8A;padding:5px;width:36px;text-align:center">N°</th>
                <th style="border:1px solid #1E3A8A;padding:5px;text-align:left">Dimensión / Criterio / Indicador</th>
                <th style="border:1px solid #1E3A8A;padding:5px;width:140px;text-align:left">Evidencia sugerida</th>
                <th style="border:1px solid #1E3A8A;padding:5px;width:80px;text-align:center">Valoración</th>
              </tr>
            </thead>
            <tbody>
              ${previewSections.map((sec, si) => `
                <tr style="background:#F9FAFB;font-weight:700">
                  <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#1E3A8A">#${si + 1}</td>
                  <td colspan="3" style="border:1px solid #E5E7EB;padding:4px;text-transform:uppercase;color:#111827">${esc(sec.nombre || 'Sección sin título')}</td>
                </tr>
                ${(sec.items || []).map((it, ii) => {
        const itCode = it.id || ((si + 1) + '.' + (ii + 1));
        return `
                    <tr>
                      <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#6B7280">${esc(itCode)}</td>
                      <td style="border:1px solid #E5E7EB;padding:4px">${esc(it.texto || 'Indicador sin texto')}</td>
                      <td style="border:1px solid #E5E7EB;padding:4px;font-size:9.5px;color:#4B5563">${esc(it.evidencia || '—')}</td>
                      <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#9CA3AF">[____]</td>
                    </tr>
                  `;
      }).join('')}
              `).join('')}
            </tbody>
          </table>

          <!-- Compromisos en Documento -->
          ${(bs.compromisos && bs.compromisos.habilitado) ? `
            <div style="margin-bottom:20px;border:1px solid #D1D5DB;padding:10px;border-radius:4px">
              <div style="font-weight:700;font-size:11px;color:#1E3A8A;margin-bottom:6px">SECCIÓN V: COMPROMISOS Y ACUERDOS INSTITUCIONALES</div>
              <div style="font-size:10px;color:#4B5563">
                ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `
                  <div style="border-bottom:1px dotted #9CA3AF;padding:4px 0">${idx + 1}. ____________________________________________________________________________________</div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- Bloque de Firmas Institucionales -->
          <div style="display:flex;justify-content:space-around;gap:20px;margin-top:24px;padding-top:16px">
            <div style="flex:1;text-align:center">
              <div style="border-top:1px dashed #4B5563;width:75%;margin:0 auto 4px"></div>
              <div style="font-size:10.5px;font-weight:700;color:#111827">Firma y Sello del Director(a)</div>
              <div style="font-size:9.5px;color:#6B7280">Institución Educativa</div>
            </div>
            <div style="flex:1;text-align:center">
              <div style="border-top:1px dashed #4B5563;width:75%;margin:0 auto 4px"></div>
              <div style="font-size:10.5px;font-weight:700;color:#111827">Firma y Sello del Especialista</div>
              <div style="font-size:9.5px;color:#6B7280">UGEL 03 · DRELM</div>
            </div>
          </div>
        </div>
      `;
    }

    return miniCardHtml + validationBoxHtml + statsBarHtml + impactAlertHtml + modeContentHtml;
  }

  // Helper para generar opciones de respuesta interactivas en modo prueba
  function renderItemResponseInputs(it, tipoRespuesta, curVal) {
    const itKey = `${builderActiveVisitPreview}_${it.id}`;
    if (tipoRespuesta === 'si_no') {
      return `
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${itKey}" value="si" ${curVal === 'si' ? 'checked' : ''} data-test-item="${itKey}"> Sí</label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${itKey}" value="no" ${curVal === 'no' ? 'checked' : ''} data-test-item="${itKey}"> No</label>
        <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>
      `;
    }
    if (tipoRespuesta === 'escala1_3') {
      return [1, 2, 3].map(v => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
    }
    if (tipoRespuesta === 'rubrica1_4' || tipoRespuesta === 'ips') {
      const lvls = ['I', 'II', 'III', 'IV'];
      return lvls.map((lvl, idx) => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${idx + 1}" ${String(curVal) === String(idx + 1) ? 'checked' : ''} data-test-item="${itKey}"> Nivel ${lvl}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
    }
    if (tipoRespuesta === 'escala1_5') {
      return [1, 2, 3, 4, 5].map(v => `
        <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
      `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
    }
    // Default escala 1-4
    return [1, 2, 3, 4].map(v => `
      <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
    `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
  }

  // Actualiza la vista previa en vivo sin tocar inputs del editor
  function updatePreviewOnly() {
    const previewBox = document.getElementById('builderPreviewContent');
    if (!previewBox) return;
    previewBox.innerHTML = buildPreviewInnerHtml();
    attachPreviewEvents();

    const di = document.getElementById('dirtyIndicator');
    if (di) di.style.display = builderIsDirty ? 'inline-flex' : 'none';
  }

  // Eventos dentro de la vista previa
  function attachPreviewEvents() {
    const previewBox = document.getElementById('builderPreviewContent');
    if (!previewBox) return;

    // Cambiar de visita simulada en tabs de vista previa
    previewBox.querySelectorAll('[data-prev-visit-idx]').forEach(btn => {
      btn.onclick = () => {
        builderActiveVisitPreview = parseInt(btn.dataset.prevVisitIdx, 10) || 0;
        updatePreviewOnly();
      };
    });

    // Clic en avisos o enlaces de edición para saltar al campo del editor
    previewBox.querySelectorAll('.previewValItem').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const targetSel = link.dataset.target;
        if (!targetSel) return;

        if (builderMobileTab === 'preview') {
          builderMobileTab = 'editor';
          const ep = document.getElementById('builderEditorPane');
          const pp = document.getElementById('builderPreviewPane');
          const bEd = document.getElementById('btnShowEditorMobile');
          const bPr = document.getElementById('btnShowPreviewMobile');
          if (ep && pp) {
            ep.classList.remove('mobileHidden');
            pp.classList.add('mobileHidden');
          }
          if (bEd && bPr) {
            bEd.classList.add('active');
            bPr.classList.remove('active');
          }
        }

        const targetEl = container.querySelector(targetSel);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          if (targetEl.focus) targetEl.focus();
          targetEl.classList.add('itemHighlightFlash');
          setTimeout(() => targetEl.classList.remove('itemHighlightFlash'), 1600);
        }
      };
    });

    // Modo prueba: radios interactivos
    previewBox.querySelectorAll('[data-test-item]').forEach(radio => {
      radio.onchange = (e) => {
        const itemKey = e.target.dataset.testItem;
        builderTestAnswers[itemKey] = e.target.value;
        updatePreviewOnly();
      };
    });

    // Limpiar prueba
    const btnReset = previewBox.querySelector('#btnResetTest');
    if (btnReset) {
      btnReset.onclick = () => {
        builderTestAnswers = {};
        updatePreviewOnly();
      };
    }
  }

  // Renderizar la vista previa inicial
  updatePreviewOnly();

  // Listeners de pestañas de vista previa (Formulario / Documento)
  container.querySelectorAll('.builderPreviewTab').forEach(tabBtn => {
    tabBtn.onclick = () => {
      builderPreviewMode = tabBtn.dataset.previewMode;
      container.querySelectorAll('.builderPreviewTab').forEach(b => b.classList.toggle('active', b === tabBtn));
      updatePreviewOnly();
    };
  });

  // Mobile Toggle: Editor vs Vista previa
  const bEd = document.getElementById('btnShowEditorMobile');
  const bPr = document.getElementById('btnShowPreviewMobile');
  if (bEd && bPr) {
    bEd.onclick = () => {
      builderMobileTab = 'editor';
      document.getElementById('builderEditorPane').classList.remove('mobileHidden');
      document.getElementById('builderPreviewPane').classList.add('mobileHidden');
      bEd.classList.add('active');
      bPr.classList.remove('active');
    };
    bPr.onclick = () => {
      builderMobileTab = 'preview';
      document.getElementById('builderEditorPane').classList.add('mobileHidden');
      document.getElementById('builderPreviewPane').classList.remove('mobileHidden');
      bEd.classList.remove('active');
      bPr.classList.add('active');
    };
  }

  // Paleta de colores institucional
  container.querySelectorAll('.colorSwatch').forEach(swatch => {
    swatch.onclick = () => {
      bs.color = swatch.dataset.color;
      builderIsDirty = true;
      container.querySelectorAll('.colorSwatch').forEach(s => s.classList.toggle('active', s.dataset.color === bs.color));
      updatePreviewOnly();
    };
  });

  // Alternar entre Editor Visual y Editor JSON
  const btnModeVis = document.getElementById('btnBuilderModeVisual');
  const btnModeJson = document.getElementById('btnBuilderModeJson');
  const jsonPaneWrap = document.getElementById('builderJsonPaneWrap');
  const visualSplitGrid = document.getElementById('builderVisualSplitGrid');
  const jsonTextarea = document.getElementById('builderJsonTextarea');
  const jsonStatus = document.getElementById('builderJsonStatus');

  if (btnModeVis && btnModeJson) {
    btnModeVis.onclick = () => {
      if (builderMode === 'json') {
        // Intentar sincronizar desde JSON al visual
        try {
          const parsed = JSON.parse(jsonTextarea.value);
          Object.assign(builderState, parsed);
          builderState.extras = normalizeExtras(builderState.extras);
          builderIsDirty = true;
        } catch (err) {
          if (!confirm(`Hay un error de sintaxis en el JSON:\n\n${err.message}\n\n¿Deseas descartar los cambios del JSON y volver al editor visual?`)) {
            return;
          }
        }
      }
      builderMode = 'visual';
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };

    const switchToJsonMode = () => {
      syncBuilderFromDom(container, bs);
      builderMode = 'json';
      if (jsonTextarea) {
        jsonTextarea.value = JSON.stringify(cleanBuilderStateForExport(bs), null, 2);
      }
      if (jsonPaneWrap && visualSplitGrid) {
        jsonPaneWrap.style.display = 'block';
        visualSplitGrid.style.display = 'none';
        btnModeVis.classList.remove('active');
        btnModeJson.classList.add('active');
      }
    };

    btnModeJson.onclick = () => {
      if (!builderJsonUnlocked) {
        promptAdminPasswordModal(currentUser, switchToJsonMode);
      } else {
        switchToJsonMode();
      }
    };
  }

  // Sincronización de scroll proporcional entre el Editor y la Vista Previa
  const previewScrollEl = document.getElementById('builderPreviewBodyScroll');
  const editorPaneEl = document.getElementById('builderEditorPane');
  let isPreviewHovered = false;

  if (previewScrollEl && editorPaneEl) {
    previewScrollEl.addEventListener('mouseenter', () => { isPreviewHovered = true; });
    previewScrollEl.addEventListener('mouseleave', () => { isPreviewHovered = false; });
    previewScrollEl.addEventListener('touchstart', () => { isPreviewHovered = true; }, { passive: true });
    previewScrollEl.addEventListener('touchend', () => { isPreviewHovered = false; }, { passive: true });

    const handleWindowScroll = () => {
      if (builderMode !== 'visual') return;
      if (isPreviewHovered) return;
      if (!document.getElementById('builderPreviewBodyScroll')) {
        window.removeEventListener('scroll', handleWindowScroll);
        return;
      }

      const rect = editorPaneEl.getBoundingClientRect();
      const editorTop = rect.top;
      const editorHeight = rect.height;
      const viewportHeight = window.innerHeight;
      const scrollableDistance = editorHeight - viewportHeight + 120;
      if (scrollableDistance <= 0) return;

      const scrolled = Math.max(0, -editorTop + 72);
      const ratio = Math.min(1, Math.max(0, scrolled / scrollableDistance));
      const maxScroll = previewScrollEl.scrollHeight - previewScrollEl.clientHeight;
      if (maxScroll > 0) {
        previewScrollEl.scrollTop = ratio * maxScroll;
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });
  }

  // Sincronización en vivo del Textarea JSON
  if (jsonTextarea && jsonStatus) {
    jsonTextarea.addEventListener('input', () => {
      builderIsDirty = true;
      try {
        const parsed = JSON.parse(jsonTextarea.value);
        Object.assign(builderState, parsed);
        builderState.extras = normalizeExtras(builderState.extras);
        jsonStatus.className = 'builderJsonStatus valid';
        jsonStatus.textContent = '✓ Sintaxis JSON válida y actualizada en memoria.';
        updatePreviewOnly();
      } catch (err) {
        jsonStatus.className = 'builderJsonStatus invalid';
        jsonStatus.textContent = '⚠️ Error en sintaxis JSON: ' + err.message;
      }
    });
  }

  // Botón "Aplicar cambios al editor visual"
  const btnSyncJson = document.getElementById('btnSyncJsonToVisual');
  if (btnSyncJson && jsonTextarea) {
    btnSyncJson.onclick = () => {
      try {
        const parsed = JSON.parse(jsonTextarea.value);
        Object.assign(builderState, parsed);
        builderState.extras = normalizeExtras(builderState.extras);
        builderMode = 'visual';
        showToast('✓ JSON aplicado al editor visual.');
        renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        alert('Error en el JSON: ' + err.message);
      }
    };
  }

  // Botón Copiar JSON
  const btnCopyJson = document.getElementById('btnCopyJson');
  if (btnCopyJson && jsonTextarea) {
    btnCopyJson.onclick = async () => {
      try {
        await navigator.clipboard.writeText(jsonTextarea.value);
        showToast('✓ JSON copiado al portapapeles.');
      } catch (err) {
        showToast('No se pudo copiar automáticamente.');
      }
    };
  }

  // Descargar JSON función común
  const triggerDownloadJson = () => {
    syncBuilderFromDom(container, bs);
    const exportData = cleanBuilderStateForExport(bs);
    const jsonStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (bs.nombreCorto || bs.nombre || 'ficha').toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
    a.href = url;
    a.download = `ficha_${slug}_${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Archivo JSON descargado.');
  };

  const btnDlJson1 = document.getElementById('downloadJsonBtn');
  if (btnDlJson1) btnDlJson1.onclick = triggerDownloadJson;
  const btnDlJson2 = document.getElementById('downloadJsonBtnCode');
  if (btnDlJson2) btnDlJson2.onclick = triggerDownloadJson;

  // Importar JSON función común
  const handleJsonFileUpload = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('El archivo no contiene un objeto JSON válido');
        }
        Object.assign(builderState, parsed);
        builderState.extras = normalizeExtras(builderState.extras);
        builderIsDirty = true;
        showToast('✓ Plantilla cargada desde archivo JSON.');
        renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        alert('Error al leer el archivo JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const importInp1 = document.getElementById('importJsonFileInput');
  if (importInp1) {
    importInp1.onchange = (e) => handleJsonFileUpload(e.target.files[0]);
  }
  const importInp2 = document.getElementById('importJsonFileInputCode');
  if (importInp2) {
    importInp2.onchange = (e) => handleJsonFileUpload(e.target.files[0]);
  }

  // Eventos de entrada en vivo con debounce
  let syncTimer = null;
  const onLiveInput = () => {
    builderIsDirty = true;
    syncBuilderFromDom(container, bs);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => {
      updatePreviewOnly();
    }, 180);
  };

  const bIco = document.getElementById('b_icono');
  if (bIco) bIco.addEventListener('input', onLiveInput);
  const bNom = document.getElementById('b_nombre');
  if (bNom) bNom.addEventListener('input', onLiveInput);
  const bNomCorto = document.getElementById('b_nombre_corto');
  if (bNomCorto) bNomCorto.addEventListener('input', onLiveInput);
  const bDesc = document.getElementById('b_desc');
  if (bDesc) bDesc.addEventListener('input', onLiveInput);
  const bMod = document.getElementById('b_modalidad');
  if (bMod) bMod.addEventListener('change', () => { bs.modalidad = bMod.value; builderIsDirty = true; updatePreviewOnly(); });
  const bTip = document.getElementById('b_tipo');
  if (bTip) bTip.addEventListener('change', () => { bs.tipoRespuesta = bTip.value; builderIsDirty = true; updatePreviewOnly(); });
  const bReg = document.getElementById('b_regla_nivel');
  if (bReg) {
    bReg.addEventListener('change', () => {
      bs.regla_nivel = bReg.value;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Listeners para rangos de semáforo
  ['b_rng_ini_min', 'b_rng_ini_max', 'b_rng_ini_lbl', 'b_rng_proc_min', 'b_rng_proc_max', 'b_rng_proc_lbl', 'b_rng_log_min', 'b_rng_log_max', 'b_rng_log_lbl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', onLiveInput);
  });

  const bVer = document.getElementById('b_version');
  if (bVer) bVer.addEventListener('input', onLiveInput);

  // Toggle tiene visitas
  const bTieneVisitas = document.getElementById('b_tiene_visitas');
  if (bTieneVisitas) {
    bTieneVisitas.addEventListener('change', () => {
      bs.tieneVisitas = bTieneVisitas.checked;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Cambio de modalidad de visitas (mismos indicadores vs diferenciados por visita)
  container.querySelectorAll('input[name="b_tipo_visitas"]').forEach(r => {
    r.addEventListener('change', () => {
      syncBuilderFromDom(container, bs);
      bs.tipoVisitas = r.value;
      if (bs.tipoVisitas === 'items_por_visita') {
        if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
        if (!bs.seccionesPorVisita[0] && bs.secciones) {
          bs.seccionesPorVisita[0] = JSON.parse(JSON.stringify(bs.secciones));
        }
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  });

  // Pestañas de visitas para editar secciones diferenciadas
  container.querySelectorAll('[data-visita-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      builderActiveVisitTab = +tab.dataset.visitaTab;
      if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
      if (!bs.seccionesPorVisita[builderActiveVisitTab]) {
        bs.seccionesPorVisita[builderActiveVisitTab] = [{
          nombre: `Sección 1`,
          items: [{ id: genId(), texto: '', evidencia: '' }]
        }];
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  });

  // Botón para copiar secciones de otra visita
  const btnCopyVisitaSecs = document.getElementById('btnCopyVisitaSecs');
  if (btnCopyVisitaSecs) {
    btnCopyVisitaSecs.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      const visits = bs.visitas || [];
      const opts = visits
        .map((v, i) => i !== builderActiveVisitTab ? `${i + 1}: ${v}` : null)
        .filter(Boolean);
      if (opts.length === 0) return;
      const resp = prompt(`¿Desde qué visita deseas copiar los indicadores para ${visits[builderActiveVisitTab]}?\n\nOpciones disponibles:\n${opts.join('\n')}\n\nIngresa el número de visita:`);
      if (!resp) return;
      const chosenNum = parseInt(resp, 10);
      const sourceIdx = chosenNum - 1;
      if (sourceIdx >= 0 && sourceIdx < visits.length && sourceIdx !== builderActiveVisitTab) {
        const sourceSecs = (bs.seccionesPorVisita && bs.seccionesPorVisita[sourceIdx])
          ? bs.seccionesPorVisita[sourceIdx]
          : (sourceIdx === 0 ? bs.secciones : []);
        if (sourceSecs && sourceSecs.length > 0) {
          if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
          bs.seccionesPorVisita[builderActiveVisitTab] = JSON.parse(JSON.stringify(sourceSecs)).map(s => ({
            ...s,
            items: (s.items || []).map(it => ({ ...it, id: genId() }))
          }));
          builderIsDirty = true;
          showToast(`✓ Se copiaron ${sourceSecs.length} secciones desde ${visits[sourceIdx]}.`);
          renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
        } else {
          showToast('La visita seleccionada no tiene indicadores para copiar.');
        }
      } else {
        showToast('Número de visita no válido.');
      }
    });
  }

  // Agregar / Quitar Visitas
  const addVisitaBtn = document.getElementById('addVisitaBtn');
  if (addVisitaBtn) {
    addVisitaBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.visitas)) bs.visitas = [];
      const newVIdx = bs.visitas.length;
      bs.visitas.push(`Visita ${newVIdx + 1}`);
      if (bs.tipoVisitas === 'items_por_visita') {
        if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
        bs.seccionesPorVisita[newVIdx] = [{
          nombre: `Sección 1`,
          items: [{ id: genId(), texto: '', evidencia: '' }]
        }];
        builderActiveVisitTab = newVIdx;
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  container.querySelectorAll('[data-rmvisita]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const vIdx = +b.dataset.rmvisita;
    if (bs.visitas.length > 1) {
      bs.visitas.splice(vIdx, 1);
      if (bs.seccionesPorVisita) {
        delete bs.seccionesPorVisita[vIdx];
      }
      if (builderActiveVisitTab >= bs.visitas.length) {
        builderActiveVisitTab = Math.max(0, bs.visitas.length - 1);
      }
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  container.querySelectorAll('[data-visitainp]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Toggle y config Compromisos
  const bCompHab = document.getElementById('b_comp_hab');
  if (bCompHab) {
    bCompHab.addEventListener('change', () => {
      if (!bs.compromisos) bs.compromisos = {};
      bs.compromisos.habilitado = bCompHab.checked;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }
  const bCompDir = document.getElementById('b_comp_dir');
  if (bCompDir) bCompDir.addEventListener('change', onLiveInput);
  const bCompEsp = document.getElementById('b_comp_esp');
  if (bCompEsp) bCompEsp.addEventListener('change', onLiveInput);
  const bCompFilas = document.getElementById('b_comp_filas');
  if (bCompFilas) bCompFilas.addEventListener('input', onLiveInput);

  // Preset Bloque Directivos (Panel 3)
  const addPresetDirectivosBtn = document.getElementById('addPresetDirectivosBtn');
  if (addPresetDirectivosBtn) {
    addPresetDirectivosBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.extras)) bs.extras = [];
      const directivosDefaults = [
        { label: 'Director(a) - Nombres y Apellidos', tipo: 'texto', required: true },
        { label: 'Director(a) - N° Celular', tipo: 'texto', required: false },
        { label: 'Director(a) - Correo Institucional', tipo: 'texto', required: false },
        { label: 'Subdirector(a) / Coordinador(a) Pedagógico', tipo: 'texto', required: false }
      ];
      let added = 0;
      directivosDefaults.forEach(def => {
        const exists = bs.extras.some(e => e.label && e.label.toLowerCase().includes(def.label.toLowerCase().slice(0, 12)));
        if (!exists) {
          bs.extras.push({ id: genId(), ...def, opciones: '' });
          added++;
        }
      });
      builderIsDirty = true;
      if (added > 0) showToast(`✓ Se agregaron ${added} campos del equipo directivo.`);
      else showToast('Los campos de directivos ya están presentes en la cabecera.');
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Tablas Especializadas: Presets y Botones
  const addPresetPersonalBtn = document.getElementById('addPresetPersonalBtn');
  if (addPresetPersonalBtn) {
    addPresetPersonalBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_personal_' + Date.now(),
        titulo: 'Cuadro de Personal de la I.E.',
        descripcion: 'Plazas presupuestadas y personal activo en funciones',
        columnas: [
          { id: 'c_cargo', nombre: 'Cargo / Especialidad', tipo: 'texto' },
          { id: 'c_plazas', nombre: 'N° Plazas', tipo: 'numero' },
          { id: 'c_cubiertas', nombre: 'Cubiertas', tipo: 'numero' },
          { id: 'c_vacantes', nombre: 'Vacantes', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_dir', etiqueta: 'Personal Directivo' },
          { id: 'f_jer', etiqueta: 'Personal Jerárquico' },
          { id: 'f_doc', etiqueta: 'Personal Docente' },
          { id: 'f_aux', etiqueta: 'Auxiliares de Educación' },
          { id: 'f_adm', etiqueta: 'Personal Administrativo' }
        ]
      });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  const addPresetEstudiantesBtn = document.getElementById('addPresetEstudiantesBtn');
  if (addPresetEstudiantesBtn) {
    addPresetEstudiantesBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_estudiantes_' + Date.now(),
        titulo: 'Cuadro de Metas de Matrícula y Atención',
        descripcion: 'Distribución de secciones y estudiantes matriculados',
        columnas: [
          { id: 'c_grado', nombre: 'Grado / Ciclo / Rango', tipo: 'texto' },
          { id: 'c_sec', nombre: 'N° Secciones', tipo: 'numero' },
          { id: 'c_hom', nombre: 'Hombres', tipo: 'numero' },
          { id: 'c_muj', nombre: 'Mujeres', tipo: 'numero' },
          { id: 'c_tot', nombre: 'Total Matriculados', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_g1', etiqueta: '1° Grado' },
          { id: 'f_g2', etiqueta: '2° Grado' },
          { id: 'f_g3', etiqueta: '3° Grado' },
          { id: 'f_g4', etiqueta: '4° Grado' },
          { id: 'f_g5', etiqueta: '5° Grado' },
          { id: 'f_tot', etiqueta: 'TOTAL INSTITUCIONAL' }
        ]
      });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Preset SAANEE (Panel 4)
  const addPresetSaaneeBtn = document.getElementById('addPresetSaaneeBtn');
  if (addPresetSaaneeBtn) {
    addPresetSaaneeBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_saanee_' + Date.now(),
        titulo: 'Cuadro de Profesionales No Docentes y SAANEE',
        descripcion: 'Profesionales del equipo interdisciplinario y apoyo a la inclusión',
        columnas: [
          { id: 'c_prof', nombre: 'Profesional / Especialidad', tipo: 'texto' },
          { id: 'c_plazas', nombre: 'N° Plazas', tipo: 'numero' },
          { id: 'c_cubiertas', nombre: 'Cubiertas', tipo: 'numero' },
          { id: 'c_vacantes', nombre: 'Vacantes', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_coord', etiqueta: 'Coordinador(a) SAANEE' },
          { id: 'f_psic', etiqueta: 'Psicólogo(a)' },
          { id: 'f_ter_len', etiqueta: 'Terapeuta de Lenguaje' },
          { id: 'f_ter_fis', etiqueta: 'Terapeuta Físico / Ocupacional' },
          { id: 'f_ts', etiqueta: 'Trabajador(a) Social' }
        ]
      });
      builderIsDirty = true;
      showToast('✓ Cuadro SAANEE agregado a tablas especializadas.');
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  const addCustomTableBtn = document.getElementById('addCustomTableBtn');
  if (addCustomTableBtn) {
    addCustomTableBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      if (!Array.isArray(bs.tablas)) bs.tablas = [];
      bs.tablas.push({
        id: 'tbl_custom_' + Date.now(),
        titulo: 'Nueva Tabla de Monitoreo',
        descripcion: '',
        columnas: [
          { id: 'c_item', nombre: 'Aspecto', tipo: 'texto' },
          { id: 'c_cant', nombre: 'Cantidad', tipo: 'numero' }
        ],
        filas: [
          { id: 'f_1', etiqueta: 'Fila 1' },
          { id: 'f_2', etiqueta: 'Fila 2' }
        ]
      });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Quitar tabla
  container.querySelectorAll('[data-rmtable]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.tablas.splice(+b.dataset.rmtable, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Agregar Columna a tabla
  container.querySelectorAll('[data-addtblcol]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const ti = +b.dataset.addtblcol;
    const nomInp = document.getElementById(`newColNom_${ti}`);
    const tipoInp = document.getElementById(`newColTipo_${ti}`);
    const nom = nomInp ? nomInp.value.trim() : '';
    const tipo = tipoInp ? tipoInp.value : 'numero';
    if (!nom) {
      if (nomInp) nomInp.focus();
      return;
    }
    if (!bs.tablas[ti].columnas) bs.tablas[ti].columnas = [];
    bs.tablas[ti].columnas.push({ id: 'c_' + Date.now(), nombre: nom, tipo });
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Quitar Columna de tabla
  container.querySelectorAll('[data-rmtblcol]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const [ti, ci] = b.dataset.rmtblcol.split('|').map(Number);
    if (bs.tablas[ti] && bs.tablas[ti].columnas) {
      bs.tablas[ti].columnas.splice(ci, 1);
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Agregar Fila a tabla
  container.querySelectorAll('[data-addtblrow]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const ti = +b.dataset.addtblrow;
    const etiqInp = document.getElementById(`newRowEtiq_${ti}`);
    const etiq = etiqInp ? etiqInp.value.trim() : '';
    if (!etiq) {
      if (etiqInp) etiqInp.focus();
      return;
    }
    if (!bs.tablas[ti].filas) bs.tablas[ti].filas = [];
    bs.tablas[ti].filas.push({ id: 'f_' + Date.now(), etiqueta: etiq });
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Quitar Fila de tabla
  container.querySelectorAll('[data-rmtblrow]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const [ti, ri] = b.dataset.rmtblrow.split('|').map(Number);
    if (bs.tablas[ti] && bs.tablas[ti].filas) {
      bs.tablas[ti].filas.splice(ri, 1);
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  container.querySelectorAll('[data-tbl-titulo]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-tbl-desc]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Listeners de Secciones e Indicadores
  container.querySelectorAll('[data-secname]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-sec][data-item]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-sec][data-item-evidencia]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-sec][data-item-code]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Listeners de Extras
  container.querySelectorAll('[data-extralabel]').forEach(inp => inp.addEventListener('input', onLiveInput));
  container.querySelectorAll('[data-extratipo]').forEach(sel => sel.addEventListener('change', () => {
    syncBuilderFromDom(container, bs);
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));
  container.querySelectorAll('[data-extrareq]').forEach(chk => chk.addEventListener('change', onLiveInput));
  container.querySelectorAll('[data-extraopts]').forEach(inp => inp.addEventListener('input', onLiveInput));

  // Helper para obtener las secciones activas según el modo de visita
  const getActiveBuilderSections = () => {
    const isMultiDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
    if (isMultiDiferenciada) {
      if (!bs.seccionesPorVisita) bs.seccionesPorVisita = {};
      if (!bs.seccionesPorVisita[builderActiveVisitTab]) {
        bs.seccionesPorVisita[builderActiveVisitTab] = [];
      }
      return bs.seccionesPorVisita[builderActiveVisitTab];
    }
    if (!Array.isArray(bs.secciones)) bs.secciones = [];
    return bs.secciones;
  };

  // Agregar Ítem
  container.querySelectorAll('[data-additem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const secs = getActiveBuilderSections();
    const si = +b.dataset.additem;
    if (secs[si]) {
      if (!Array.isArray(secs[si].items)) secs[si].items = [];
      secs[si].items.push({ id: genId(), texto: '', evidencia: '' });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Quitar Ítem
  container.querySelectorAll('[data-rmitem]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const secs = getActiveBuilderSections();
    const [si, ii] = b.dataset.rmitem.split('|').map(Number);
    if (secs[si] && secs[si].items) {
      secs[si].items.splice(ii, 1);
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Quitar Sección
  container.querySelectorAll('[data-rmsec]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    const secs = getActiveBuilderSections();
    secs.splice(+b.dataset.rmsec, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Agregar Sección
  const addSecBtn = document.getElementById('addSecBtn');
  if (addSecBtn) {
    addSecBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      const secs = getActiveBuilderSections();
      secs.push({
        nombre: `Sección ${secs.length + 1}`,
        items: [{ id: genId(), texto: '', evidencia: '' }]
      });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Reordenar secciones con botones ▲ ▼
  container.querySelectorAll('[data-movesec]').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    const [siStr, dir] = b.dataset.movesec.split('|');
    const si = Number(siStr);
    syncBuilderFromDom(container, bs);
    const secs = getActiveBuilderSections();
    const target = dir === 'up' ? si - 1 : si + 1;
    if (target >= 0 && target < secs.length) {
      const temp = secs[si];
      secs[si] = secs[target];
      secs[target] = temp;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      const targetCard = container.querySelector('fieldset.secCard[data-sec-idx="' + target + '"]');
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        targetCard.classList.add('itemHighlightFlash');
        setTimeout(() => targetCard.classList.remove('itemHighlightFlash'), 1400);
      }
    }
  }));

  // Drag & Drop de secciones
  let draggedSecIdx = null;
  container.querySelectorAll('fieldset.secCard').forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedSecIdx = Number(card.dataset.secIdx);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(draggedSecIdx));
      card.style.opacity = '0.5';
    });
    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      container.querySelectorAll('fieldset.secCard').forEach(c => c.classList.remove('dragOver'));
    });
    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('dragOver');
    });
    card.addEventListener('dragleave', () => {
      card.classList.remove('dragOver');
    });
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('dragOver');
      const targetIdx = Number(card.dataset.secIdx);
      if (draggedSecIdx !== null && draggedSecIdx !== targetIdx) {
        syncBuilderFromDom(container, bs);
        const secs = getActiveBuilderSections();
        const [moved] = secs.splice(draggedSecIdx, 1);
        secs.splice(targetIdx, 0, moved);
        builderIsDirty = true;
        renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      }
    });
  });

  // Reordenar campos de cabecera con botones ▲ ▼
  container.querySelectorAll('[data-moveextra]').forEach(b => b.addEventListener('click', () => {
    const [eiStr, dir] = b.dataset.moveextra.split('|');
    const ei = Number(eiStr);
    syncBuilderFromDom(container, bs);
    const target = dir === 'up' ? ei - 1 : ei + 1;
    if (target >= 0 && target < bs.extras.length) {
      const temp = bs.extras[ei];
      bs.extras[ei] = bs.extras[target];
      bs.extras[target] = temp;
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    }
  }));

  // Agregar campo de cabecera
  const addExtraBtn = document.getElementById('addExtraBtn');
  if (addExtraBtn) {
    addExtraBtn.addEventListener('click', () => {
      syncBuilderFromDom(container, bs);
      bs.extras.push({ id: genId(), label: '', tipo: 'texto', required: false, opciones: '' });
      builderIsDirty = true;
      renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Quitar campo de cabecera
  container.querySelectorAll('[data-rmextra]').forEach(b => b.addEventListener('click', () => {
    syncBuilderFromDom(container, bs);
    bs.extras.splice(+b.dataset.rmextra, 1);
    builderIsDirty = true;
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
  }));

  // Cancelar con confirmación
  const cancelBtn = document.getElementById('cancelTipoBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      if (builderIsDirty) {
        const ok = confirm('Tienes cambios sin guardar en la ficha. ¿Deseas descartarlos y salir?');
        if (!ok) return;
      }
      builderIsDirty = false;
      builderJsonUnlocked = false;
      tiposView = 'list';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    });
  }

  // Guardar Borrador
  const draftBtn = document.getElementById('saveDraftBtn');
  if (draftBtn) {
    draftBtn.addEventListener('click', async () => {
      syncBuilderFromDom(container, bs);
      if (!bs.nombre || !bs.nombre.trim()) {
        showToast('Asigna al menos un nombre para guardar el borrador.');
        const el = document.getElementById('b_nombre');
        if (el) el.focus();
        return;
      }
      draftBtn.disabled = true;
      draftBtn.textContent = 'Guardando...';

      const payload = {
        nombre: bs.nombre.trim(),
        nombreCorto: (bs.nombreCorto || bs.nombre).trim(),
        descripcion: (bs.descripcion || '').trim(),
        icono: (bs.icono || '📋').trim(),
        color: bs.color || FICHA_PALETTE[0].hex,
        modalidad: bs.modalidad || 'General',
        tipoRespuesta: bs.tipoRespuesta || 'si_no',
        regla_nivel: bs.regla_nivel || 'porcentaje',
        regla_nivel_config: bs.regla_nivel === 'conteo_rangos' ? (bs.regla_nivel_config || null) : null,
        version: bs.version || '2026.1',
        tieneVisitas: !!bs.tieneVisitas,
        tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
        visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
        seccionesPorVisita: (bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita') ? (bs.seccionesPorVisita || {}) : {},
        secciones: bs.secciones,
        extras: bs.extras,
        tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
        compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
        esBorrador: true,
        updatedAt: Date.now()
      };

      try {
        if (builderEditingId) {
          await dbNs.collection('fichaTypes').doc(builderEditingId).set(payload, { merge: true });
          showToast('✓ Borrador de ficha actualizado.');
        } else {
          payload.createdAt = Date.now();
          const docRef = await dbNs.collection('fichaTypes').add(payload);
          builderEditingId = docRef.id;
          showToast('✓ Borrador guardado exitosamente.');
        }
        builderIsDirty = false;
        const di = document.getElementById('dirtyIndicator');
        if (di) di.style.display = 'none';
        updatePreviewOnly();
      } catch (err) {
        console.error(err);
        showToast('No se pudo guardar el borrador: ' + err.message);
      } finally {
        draftBtn.disabled = false;
        draftBtn.textContent = '📝 Guardar borrador';
      }
    });
  }

  // Guardar Ficha Completa
  const saveBtn = document.getElementById('saveTipoBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      syncBuilderFromDom(container, bs);
      if (!bs.nombre || !bs.nombre.trim()) {
        showToast('Falta asignar el nombre de la ficha.');
        const el = document.getElementById('b_nombre');
        if (el) {
          el.focus();
          el.classList.add('itemHighlightFlash');
          setTimeout(() => el.classList.remove('itemHighlightFlash'), 1500);
        }
        return;
      }

      const isDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
      let validSeccionesPorVisita = {};
      if (isDiferenciada && bs.seccionesPorVisita) {
        Object.keys(bs.seccionesPorVisita).forEach(k => {
          validSeccionesPorVisita[k] = (bs.seccionesPorVisita[k] || [])
            .filter(s => s.nombre.trim() || (s.items && s.items.some(i => i.texto && i.texto.trim())))
            .map(s => ({
              nombre: s.nombre.trim() || 'Sección',
              items: (s.items || []).filter(i => i.texto && i.texto.trim()).map(i => ({
                id: i.id || genId(),
                texto: i.texto.trim(),
                evidencia: (i.evidencia || '').trim()
              }))
            }));
        });
      }

      const validSections = (isDiferenciada && validSeccionesPorVisita[0] && validSeccionesPorVisita[0].length > 0)
        ? validSeccionesPorVisita[0]
        : (bs.secciones || [])
          .filter(s => s.nombre.trim() || s.items.some(i => i.texto.trim()))
          .map(s => ({
            nombre: s.nombre.trim() || 'Sección',
            items: (s.items || []).filter(i => i.texto.trim()).map(i => ({
              id: i.id || genId(),
              texto: i.texto.trim(),
              evidencia: (i.evidencia || '').trim()
            }))
          }));

      const totalValidItems = validSections.reduce((acc, s) => acc + s.items.length, 0);
      const totalVisitaItems = isDiferenciada
        ? Object.values(validSeccionesPorVisita).reduce((acc, secs) => acc + secs.reduce((a2, s) => a2 + s.items.length, 0), 0)
        : totalValidItems;

      if (validSections.length === 0 || (totalValidItems === 0 && totalVisitaItems === 0)) {
        showToast('La ficha debe tener al menos una sección con un indicador.');
        return;
      }

      if (existingCount > 0) {
        const ok = confirm(`Atención: Esta plantilla tiene ${existingCount} visita(s) registradas históricamente.\n\nLos cambios en indicadores y tablas se aplicarán a las nuevas visitas. ¿Deseas guardar los cambios?`);
        if (!ok) return;
      }

      if (!dbNs) {
        showToast('No hay conexión a la base de datos.');
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      const payload = {
        nombre: bs.nombre.trim(),
        nombreCorto: (bs.nombreCorto || bs.nombre).trim(),
        descripcion: (bs.descripcion || '').trim(),
        icono: (bs.icono || '📋').trim(),
        color: bs.color || FICHA_PALETTE[0].hex,
        modalidad: bs.modalidad || 'General',
        tipoRespuesta: bs.tipoRespuesta || 'si_no',
        regla_nivel: bs.regla_nivel || 'porcentaje',
        regla_nivel_config: bs.regla_nivel === 'conteo_rangos' ? (bs.regla_nivel_config || null) : null,
        version: bs.version || '2026.1',
        tieneVisitas: !!bs.tieneVisitas,
        tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
        visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
        seccionesPorVisita: isDiferenciada ? validSeccionesPorVisita : {},
        secciones: validSections,
        extras: (bs.extras || []).filter(e => e.label && e.label.trim()),
        tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
        compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
        esBorrador: false,
        updatedAt: Date.now()
      };

      try {
        if (builderEditingId) {
          await dbNs.collection('fichaTypes').doc(builderEditingId).set(payload, { merge: true });
          showToast('✓ Tipo de ficha actualizado exitosamente.');
        } else {
          payload.createdAt = Date.now();
          await dbNs.collection('fichaTypes').add(payload);
          showToast('✓ Tipo de ficha creado exitosamente.');
        }
        builderIsDirty = false;
        builderJsonUnlocked = false;
        tiposView = 'list';
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        console.error(err);
        showToast('No se pudo guardar la ficha: ' + err.message);
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Guardar ficha completa';
      }
    });
  }
}

/** Compatibilidad con el nombre anterior renderBuilder */
export function renderBuilder(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null, navigate = null, subNavHtml = '') {
  return renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
}

