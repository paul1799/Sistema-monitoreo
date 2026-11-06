/**
 * features/plantillas/list.js
 * Gestión de catálogo de plantillas, vistas de tipos, áreas y firmantes oficiales
 * UGEL 03 · AGEBRE · Fase 3 Reorganización
 */

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
  forceResetBodyScroll,
  isFichaActiva
} from '../../core/utils/index.js';
import {
  RESPONSE_OPTIONS,
  RESPONSE_LABELS,
  OPTION_COLORS
} from '../../ui/scoring.js';
import {
  DEFAULT_AREAS,
  DEFAULT_PLANTILLAS
} from '../../ui/modales.js';
import { PLANTILLAS_BASE_OFICIALES } from '../../domain/fichas/catalogo-base.js';
import { renderRegistrarTab, setRegistrarSubTab, resetRegBuiltFor } from '../../ui/registrar.js';
import { setRegBuiltFor } from '../../core/state/app-state.js';
import { deduplicateTwinSubmissions } from '../reportes/filters.js';
import {
  getDeletedFichaTypeIds,
  addDeletedFichaTypeId,
  normalizeExtras,
  blankBuilder
} from './payload.js';
import {
  renderSplitScreenBuilder,
  getTiposView,
  setTiposView,
  openFichaInBuilder,
  startNewPlantillaBuilder
} from './editor.js?v=20261103_v8';

async function verifyAdminPassword(pw, adminEmail) {
  const authModule = await import('../../core/firebase/auth.js');
  return authModule.verifyAdminPassword(pw, adminEmail);
}

let plantillasSearchQuery = '';
let plantillasFilterStatus = 'all'; // 'all' | 'active' | 'inactive'
let fichaDescExpanded = {};
let currentAreaReportTab = 'concursos'; // 'concursos' | 'consolidado' | 'individual' | 'avance'


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
      nombreCorto: ft.nombreCorto ? `${ft.nombreCorto} (Copia)` : copyName,
      grupo: ft.grupo || 'EBR',
      orden: typeof ft.orden === 'number' ? ft.orden + 1 : 99,
      descripcion: ft.descripcion || '',
      icono: ft.icono || '📋',
      tipoRespuesta: ft.tipoRespuesta || 'si_no',
      color: newColor,
      modalidad: newModalidad,
      secciones: clonedSecciones,
      extras: clonedExtras,
      activo: true,
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
      addDeletedFichaTypeId(ft.id);
      if (dbNs) {
        try {
          await dbNs.collection('fichaTypes').doc(ft.id).delete();
        } catch (delErr) {
          console.warn('Error borrando doc en Firestore (puede ser doc virtual o ya borrado):', delErr);
        }
        try {
          const set = getDeletedFichaTypeIds();
          await dbNs.collection('_metadata').doc('deleted_ficha_types').set({
            ids: [...set],
            updatedAt: Date.now()
          }, { merge: true });
        } catch (metaErr) {
          // ignore non-essential metadata error
        }
      }

      // Remover inmediatamente del estado en memoria
      if (state && Array.isArray(state.fichaTypes)) {
        state.fichaTypes = state.fichaTypes.filter(f => f.id !== ft.id);
      }

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
};

export function renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml) {
  if (getTiposView() === 'builder') {
    renderSplitScreenBuilder(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    return;
  }

  const allTypes = state.fichaTypes || [];
  const activeCount = allTypes.filter(isFichaActiva).length;
  const inactiveCount = allTypes.filter(ft => !isFichaActiva(ft)).length;

  const filtered = allTypes.filter(ft => {
    const isActivo = isFichaActiva(ft);
    if (plantillasFilterStatus === 'active' && !isActivo) return false;
    if (plantillasFilterStatus === 'inactive' && isActivo) return false;
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
      : (plantillasFilterStatus !== 'all' ? `No hay plantillas con estado "${plantillasFilterStatus === 'active' ? 'Activas' : 'Desactivadas'}".` : `No hay resultados para "${esc(plantillasSearchQuery)}".`)}
      </p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
        ${allTypes.length === 0 ? '<button type="button" class="btn" id="btnSyncPlantillasEmpty" style="font-weight:700">⚡ Cargar 8 Plantillas Base Oficiales</button>' : ''}
        <button type="button" class="btn secondary" id="btnCreateNewFtEmpty">+ Nuevo tipo de ficha</button>
      </div>
    </div>
  ` : filtered.map((ft, idx) => {
        const isActivo = isFichaActiva(ft);
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

        const statusBadge = isActivo
          ? `<span class="fichaBadge" style="background:#DCFCE7;color:#15803D;border:1px solid #BBF7D0;font-weight:700">● Activa</span>`
          : `<span class="fichaBadge" style="background:#FEE2E2;color:#B91C1C;border:1px solid #FECACA;font-weight:700">⏸️ Desactivada</span>`;

        const toggleBtn = isActivo ? `
          <button type="button" class="btn secondary small" data-toggle-active-ft="${esc(ft.id)}" data-current-active="true" title="Desactivar ficha (ocultar de Registro, Resumen y Reportes)" style="color:#B45309;background:#FFFBEB;border-color:#FDE68A;font-weight:600">
            ⏸️ Desactivar
          </button>
        ` : `
          <button type="button" class="btn small" data-toggle-active-ft="${esc(ft.id)}" data-current-active="false" title="Activar ficha (mostrar en Registro, Resumen y Reportes)" style="color:#15803D;background:#F0FDF4;border-color:#BBF7D0;font-weight:700">
            ▶️ Activar
          </button>
        `;

        return `
      <div class="fichaCard" style="cursor:default;${!isActivo ? 'opacity:0.85;background:#FAFAFA;border:1.5px dashed #CBD5E1;' : ''}">
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
              ${statusBadge}
              <span class="fichaBadge" style="background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;font-weight:600">📁 Grupo: ${esc(ft.grupo || 'Sin grupo')}</span>
              <span class="fichaBadge fichaBadgeModalidad">${esc(mod)}</span>
              <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
              <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
              <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[ft.tipoRespuesta] || ft.tipoRespuesta)}</span>
              <span class="fichaBadge fichaBadgeCount">📊 ${count} ${count === 1 ? 'ficha registrada' : 'fichas registradas'}</span>
            </div>
          </div>
        </div>
        <div class="fichaCardActs" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          ${toggleBtn}
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
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;flex:1;min-width:280px">
        <div class="fichaSearchWrap" style="max-width:320px;flex:1">
          <span class="fichaSearchIcon">🔍</span>
          <input type="text" class="fichaSearchInput" id="plantillasSearchInp" placeholder="Filtrar plantillas..." value="${esc(plantillasSearchQuery)}">
        </div>
        <div style="display:inline-flex;gap:4px;background:#F1F5F9;padding:3px;border-radius:8px;border:1px solid #CBD5E1">
          <button type="button" class="btn small ${plantillasFilterStatus === 'all' ? '' : 'secondary'}" data-plantillas-status="all" style="padding:4px 10px;font-size:12px;font-weight:${plantillasFilterStatus === 'all' ? '700' : '500'}">Todas (${allTypes.length})</button>
          <button type="button" class="btn small ${plantillasFilterStatus === 'active' ? '' : 'secondary'}" data-plantillas-status="active" style="padding:4px 10px;font-size:12px;font-weight:${plantillasFilterStatus === 'active' ? '700' : '500'};color:${plantillasFilterStatus === 'active' ? '#fff' : '#15803D'}">● Activas (${activeCount})</button>
          <button type="button" class="btn small ${plantillasFilterStatus === 'inactive' ? '' : 'secondary'}" data-plantillas-status="inactive" style="padding:4px 10px;font-size:12px;font-weight:${plantillasFilterStatus === 'inactive' ? '700' : '500'};color:${plantillasFilterStatus === 'inactive' ? '#fff' : '#B91C1C'}">⏸️ Desactivadas (${inactiveCount})</button>
        </div>
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
      setRegistrarSubTab(b.dataset.regSub);
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
      startNewPlantillaBuilder();
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
      openFichaInBuilder(ft);
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

  // Filtrado por estado (Todas / Activas / Desactivadas)
  container.querySelectorAll('[data-plantillas-status]').forEach(btn => {
    btn.onclick = () => {
      plantillasFilterStatus = btn.dataset.plantillasStatus || 'all';
      renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
    };
  });

  // Activar / Desactivar ficha
  container.querySelectorAll('[data-toggle-active-ft]').forEach(btn => {
    btn.onclick = async () => {
      const ftId = btn.dataset.toggleActiveFt;
      const currentActive = btn.dataset.currentActive === 'true';
      const ft = getFichaType(ftId);
      if (!ft || !dbNs) return;
      const newStatus = !currentActive;
      try {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
        await dbNs.collection('fichaTypes').doc(ftId).set({
          ...ft,
          activo: newStatus,
          updatedAt: Date.now()
        }, { merge: true });

        ft.activo = newStatus;
        if (state && Array.isArray(state.fichaTypes)) {
          const item = state.fichaTypes.find(f => f.id === ftId);
          if (item) item.activo = newStatus;
        }
        if (typeof window !== 'undefined' && window.state && Array.isArray(window.state.fichaTypes)) {
          const item = window.state.fichaTypes.find(f => f.id === ftId);
          if (item) item.activo = newStatus;
        }

        showToast(newStatus ? `✓ Ficha "${ft.nombre}" activada correctamente.` : `Ficha "${ft.nombre}" desactivada (oculta en Registro, Resumen y Reportes).`);
        renderPlantillasManagementView(container, state, getFichaType, dbNs, isAdmin, currentUser, navigate, subNavHtml);
      } catch (err) {
        console.error('Error toggling ficha active state:', err);
        showToast('Error al cambiar estado de la ficha: ' + err.message);
        btn.disabled = false;
      }
    };
  });
}

/** Compatibilidad hacia atrás para llamadas externas a renderTiposTab */
export function renderTiposTab(container, state, getFichaType, dbNs, isAdmin = true, currentUser = null) {
  setRegistrarSubTab('plantillas');
  renderRegistrarTab(container, state, getFichaType, dbNs, currentUser, null, isAdmin);
}

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
        setRegistrarSubTab(b.dataset.regSub);
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

