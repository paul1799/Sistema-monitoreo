/* =========================================================================
   modales-limpieza.js — Diálogo modal seguro para depurar, seleccionar o vaciar
   fichas registradas de la base de datos de monitoreo.
   UGEL 03 · AGEBRE 2026
   ========================================================================= */

import {
  esc,
  showToast,
  lockBodyScroll,
  unlockBodyScroll,
  normalizeInstName,
  fmtDate
} from './core-utils.js';

/**
 * Abre el modal de administración para limpiar registros de monitoreo.
 * Permite:
 * 1. Depurar únicamente registros duplicados (misma IE + misma visita)
 * 2. Seleccionar registros específicos con casillas de verificación
 * 3. Vaciar todas las fichas registradas con confirmación de seguridad
 *
 * @param {Object} options
 * @param {Array} options.statsList - Lista actual de { s: submission, st: stats }
 * @param {Object|null} options.ft - Ficha tipo activa o null
 * @param {boolean} options.isAllMode - Si está en modo "Todas las fichas"
 * @param {Object} options.dbNs - Conexión namespaced de Firestore
 * @param {Object} options.state - Estado global de la aplicación
 * @param {Function} options.onCompleted - Callback de actualización tras eliminar
 */
export function openModalLimpiarRegistros({
  statsList = [],
  ft = null,
  isAllMode = false,
  dbNs = null,
  state = null,
  onCompleted = null
} = {}) {
  const existingModal = document.getElementById('modalLimpiarRegistros');
  if (existingModal) {
    existingModal.remove();
    unlockBodyScroll();
  }

  const totalFichas = statsList.length;
  if (totalFichas === 0) {
    showToast('No hay fichas registradas para limpiar en esta vista.');
    return;
  }

  const fichaNombre = isAllMode
    ? 'Todas las fichas registradas'
    : (ft?.nombreCorto || ft?.nombre || 'Ficha seleccionada');

  // 1. Detectar duplicados (misma institución + misma visita + mismo tipo de ficha)
  const dupGroups = new Map();
  statsList.forEach(item => {
    const s = item.s;
    const normInst = normalizeInstName(s.institucion || '');
    const colId = s.colegioId ? `col_${s.colegioId}` : normInst;
    const vis = s.visita !== undefined && s.visita !== null ? String(s.visita).trim() : '1';
    const key = `${colId}|${vis}|${s.fichaTypeId || ''}`;

    if (!dupGroups.has(key)) {
      dupGroups.set(key, []);
    }
    dupGroups.get(key).push(item);
  });

  const duplicateItemsToDelete = [];
  const duplicateClusters = [];

  dupGroups.forEach((group) => {
    if (group.length > 1) {
      // Ordenar: el más reciente o con puntaje más alto queda primero (se conserva)
      group.sort((a, b) => {
        const tB = Number(b.s.updatedAt || b.s.createdAt || 0);
        const tA = Number(a.s.updatedAt || a.s.createdAt || 0);
        if (tB !== tA) return tB - tA;
        return (Number(b.st?.puntaje) || 0) - (Number(a.st?.puntaje) || 0);
      });

      const aConservar = group[0];
      const aEliminar = group.slice(1);
      aEliminar.forEach(dup => duplicateItemsToDelete.push(dup));
      duplicateClusters.push({ aConservar, aEliminar });
    }
  });

  const numDuplicados = duplicateItemsToDelete.length;

  // 2. Construir el modal en el DOM
  lockBodyScroll();
  const overlay = document.createElement('div');
  overlay.id = 'modalLimpiarRegistros';
  overlay.className = 'downloadModalOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="downloadModalCard" style="max-width:760px;width:95vw;max-height:92vh;display:flex;flex-direction:column;border-radius:12px;overflow:hidden">
      <!-- Encabezado del modal -->
      <div class="downloadModalHeader" style="background:#0F172A;border-bottom:3px solid #EF4444;padding:16px 20px">
        <div>
          <h3 style="color:#FFF;font-size:18px;display:flex;align-items:center;gap:8px;margin:0">
            <span>🗑️</span> Limpiar Registros de Monitoreo
          </h3>
          <div class="sub" style="color:#FCA5A5;font-size:12px;margin-top:3px;text-transform:none">
            ${esc(fichaNombre)} · <strong>${totalFichas}</strong> fichas en la vista actual
          </div>
        </div>
        <button type="button" class="downloadModalClose" id="btnCerrarModalLimpieza" aria-label="Cerrar" style="color:#94A3B8;font-size:22px;border:none;background:transparent;cursor:pointer">✕</button>
      </div>

      <!-- Barra de pestañas -->
      <div style="background:#F8FAFC;border-bottom:1px solid #E2E8F0;display:flex;gap:4px;padding:8px 16px;flex-shrink:0">
        <button type="button" class="tabBtnLimpieza active" data-tab="duplicados" style="padding:7px 14px;border:none;background:#FFF;color:#0F172A;font-weight:700;font-size:12.5px;border-radius:6px;cursor:pointer;border:1px solid #CBD5E1">
          🧹 Limpiar duplicados ${numDuplicados > 0 ? `<span class="badge" style="background:#EF4444;color:#FFF;padding:1px 6px;border-radius:10px;font-size:10px;margin-left:4px">${numDuplicados}</span>` : ''}
        </button>
        <button type="button" class="tabBtnLimpieza" data-tab="seleccion" style="padding:7px 14px;border:none;background:transparent;color:#64748B;font-weight:700;font-size:12.5px;border-radius:6px;cursor:pointer">
          📋 Selección manual
        </button>
        <button type="button" class="tabBtnLimpieza" data-tab="vaciar" style="padding:7px 14px;border:none;background:transparent;color:#DC2626;font-weight:700;font-size:12.5px;border-radius:6px;cursor:pointer">
          ⚠️ Vaciar sección filtrada (${totalFichas})
        </button>
      </div>

      <!-- Cuerpo del modal -->
      <div class="downloadModalBody" style="padding:18px 22px;flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:14px;background:#FFF">

        <!-- PANEL 1: DUPLICADOS -->
        <div id="tabPanelDuplicados" class="tabPanelLimpieza">
          ${numDuplicados > 0 ? `
            <div style="background:#FEF2F2;border:1px solid #FECACA;border-left:4px solid #EF4444;border-radius:8px;padding:12px 14px;margin-bottom:12px">
              <strong style="color:#991B1B;font-size:13px;display:flex;align-items:center;gap:6px">
                <span>⚠️</span> Se detectaron ${numDuplicados} registro(s) duplicado(s)
              </strong>
              <p style="margin:4px 0 0 0;font-size:12px;color:#7F1D1D;line-height:1.4">
                Hay instituciones con más de una ficha registrada para la misma visita. Al ejecutar esta opción se conservará automáticamente el registro más reciente y se eliminarán las copias redundantes.
              </p>
            </div>

            <div style="border:1px solid #E2E8F0;border-radius:8px;max-height:260px;overflow-y:auto">
              <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">
                <thead style="background:#F1F5F9;position:sticky;top:0">
                  <tr>
                    <th style="padding:7px 10px;border-bottom:1px solid #CBD5E1">Institución Educativa</th>
                    <th style="padding:7px 10px;border-bottom:1px solid #CBD5E1;text-align:center">Visita</th>
                    <th style="padding:7px 10px;border-bottom:1px solid #CBD5E1;text-align:center">Fichas repetidas</th>
                    <th style="padding:7px 10px;border-bottom:1px solid #CBD5E1">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  ${duplicateClusters.map(c => `
                    <tr style="border-bottom:1px solid #F1F5F9">
                      <td style="padding:7px 10px;font-weight:700;color:#0F172A">
                        ${esc(c.aConservar.s.institucion)}
                        <div style="font-size:10.5px;font-weight:normal;color:#64748B">Conserva: ${fmtDate(c.aConservar.s.fecha)} (${c.aConservar.st?.puntaje !== undefined ? c.aConservar.st.puntaje + ' pts' : 'Guardada'})</div>
                      </td>
                      <td style="padding:7px 10px;text-align:center;font-weight:700">V${c.aConservar.s.visita || 1}</td>
                      <td style="padding:7px 10px;text-align:center">
                        <span class="badge" style="background:#FEE2E2;color:#991B1B;padding:2px 6px;font-weight:700">${c.aEliminar.length + 1} registros</span>
                      </td>
                      <td style="padding:7px 10px;color:#DC2626;font-size:11.5px">
                        Elimina ${c.aEliminar.length} copia(s)
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div style="margin-top:16px;text-align:right">
              <button type="button" id="btnEjecutarLimpiezaDuplicados" style="background:#DC2626;color:#FFF;border:none;border-radius:6px;padding:9px 18px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px">
                <span>🧹</span> Eliminar ${numDuplicados} duplicado(s) ahora
              </button>
            </div>
          ` : `
            <div style="text-align:center;padding:36px 20px;background:#F8FAFC;border:1px dashed #CBD5E1;border-radius:8px">
              <div style="font-size:32px;margin-bottom:8px">✨</div>
              <strong style="color:#0F172A;font-size:14px;display:block">No se encontraron fichas duplicadas</strong>
              <p style="color:#64748B;font-size:12.5px;margin:4px 0 0 0">
                Cada institución cuenta con un único registro por visita en la lista actual. Si deseas eliminar registros individuales o vaciar la lista, usa las pestañas superiores.
              </p>
            </div>
          `}
        </div>

        <!-- PANEL 2: SELECCIÓN MANUAL -->
        <div id="tabPanelSeleccion" class="tabPanelLimpieza" style="display:none">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px">
            <div style="display:flex;align-items:center;gap:8px">
              <label style="font-size:12px;font-weight:700;color:#0F172A;display:flex;align-items:center;gap:6px;cursor:pointer">
                <input type="checkbox" id="chkMarcarTodas" style="cursor:pointer">
                <span>Seleccionar todas (${totalFichas})</span>
              </label>
              <span id="lblSeleccionadasCount" style="font-size:12px;color:#64748B">· 0 seleccionadas</span>
            </div>
            <input type="text" id="txtBuscarEnLista" placeholder="Filtrar IE en la lista..." style="padding:4px 8px;font-size:12px;border:1px solid #CBD5E1;border-radius:5px;width:200px">
          </div>

          <div style="border:1px solid #E2E8F0;border-radius:8px;max-height:280px;overflow-y:auto">
            <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left">
              <thead style="background:#F1F5F9;position:sticky;top:0;z-index:2">
                <tr>
                  <th style="padding:6px 10px;border-bottom:1px solid #CBD5E1;width:32px;text-align:center">✓</th>
                  <th style="padding:6px 10px;border-bottom:1px solid #CBD5E1">Institución Educativa</th>
                  <th style="padding:6px 10px;border-bottom:1px solid #CBD5E1;text-align:center">Visita</th>
                  <th style="padding:6px 10px;border-bottom:1px solid #CBD5E1">Fecha</th>
                  <th style="padding:6px 10px;border-bottom:1px solid #CBD5E1">Puntaje</th>
                  <th style="padding:6px 10px;border-bottom:1px solid #CBD5E1">Responsable</th>
                </tr>
              </thead>
              <tbody id="tbodySeleccionFichas">
                ${statsList.map(item => {
                  const s = item.s;
                  const st = item.st;
                  const ptStr = st?.puntaje !== undefined && st?.puntaje !== null ? `${st.puntaje} pts` : (s.puntaje !== undefined ? `${s.puntaje} pts` : '—');
                  return `
                    <tr class="rowItemManual" data-id="${esc(s.id)}" data-name="${esc((s.institucion || '').toLowerCase())}" style="border-bottom:1px solid #F1F5F9;cursor:pointer">
                      <td style="padding:6px 10px;text-align:center">
                        <input type="checkbox" class="chkFichaItem" value="${esc(s.id)}" style="cursor:pointer">
                      </td>
                      <td style="padding:6px 10px;font-weight:700;color:#0F172A">${esc(s.institucion)}</td>
                      <td style="padding:6px 10px;text-align:center;font-weight:700">V${s.visita || 1}</td>
                      <td style="padding:6px 10px;color:#64748B">${fmtDate(s.fecha)}</td>
                      <td style="padding:6px 10px;font-weight:700">${esc(ptStr)}</td>
                      <td style="padding:6px 10px;color:#64748B;font-size:11px">${esc(s.responsable || '—')}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div style="margin-top:14px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
            <span style="font-size:11.5px;color:#64748B">Haz clic en las filas para marcar o desmarcar fichas.</span>
            <button type="button" id="btnEjecutarLimpiezaSeleccionadas" disabled style="background:#DC2626;color:#FFF;border:none;border-radius:6px;padding:8px 16px;font-size:12.5px;font-weight:700;cursor:not-allowed;opacity:0.5;display:inline-flex;align-items:center;gap:6px">
              <span>🗑️</span> Eliminar seleccionadas (0)
            </button>
          </div>
        </div>

        <!-- PANEL 3: VACIAR TODO -->
        <div id="tabPanelVaciar" class="tabPanelLimpieza" style="display:none">
          <div style="background:#FFF1F2;border:1px solid #FECDD3;border-left:4px solid #E11D48;border-radius:8px;padding:14px 16px">
            <div style="display:flex;align-items:center;gap:8px;color:#9F1239;font-weight:800;font-size:14px">
              <span>⚠️</span> Acción destructiva: Vaciar registros filtrados
            </div>
            <p style="margin:8px 0 0 0;font-size:12.5px;color:#881337;line-height:1.5">
              Se eliminarán de forma permanente las <strong>${totalFichas} fichas registradas</strong> mostradas actualmente para:
              <br><strong style="font-size:13px;color:#0F172A">«${esc(fichaNombre)}»</strong>
            </p>
            <p style="margin:8px 0 0 0;font-size:12px;color:#9F1239">
              Esta acción no se puede deshacer y actualizará de inmediato la base de datos de Firestore y los reportes institucionales.
            </p>
          </div>

          <div style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:14px 16px;margin-top:12px">
            <label for="txtConfirmacionEliminar" style="display:block;font-size:12.5px;font-weight:700;color:#0F172A;margin-bottom:6px">
              Para confirmar el borrado total, escribe la palabra <span style="color:#E11D48;font-family:monospace;font-size:13px">ELIMINAR</span> a continuación:
            </label>
            <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
              <input type="text" id="txtConfirmacionEliminar" placeholder="Escribe ELIMINAR" style="padding:7px 12px;border:2px solid #CBD5E1;border-radius:6px;font-size:13px;font-weight:700;text-transform:uppercase;max-width:240px;outline:none">
              <button type="button" id="btnEjecutarVaciarTodo" disabled style="background:#BE123C;color:#FFF;border:none;border-radius:6px;padding:8px 18px;font-size:13px;font-weight:700;cursor:not-allowed;opacity:0.4;display:inline-flex;align-items:center;gap:6px">
                <span>⚠️</span> Sí, vaciar las ${totalFichas} fichas de esta sección
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Pie del modal -->
      <div class="downloadModalFooter" style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:12px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11.5px;color:#64748B">Solo administradores pueden realizar limpiezas en la base de datos.</span>
        <button type="button" class="btn secondary small" id="btnCancelarModalLimpieza" style="padding:6px 14px;font-size:12.5px;border-radius:6px;cursor:pointer">
          Cerrar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // =========================================================================
  // CONTROLADORES Y LÓGICA DE EVENTOS DEL MODAL
  // =========================================================================
  const closeModal = () => {
    overlay.remove();
    unlockBodyScroll();
  };

  overlay.querySelector('#btnCerrarModalLimpieza').addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelarModalLimpieza').addEventListener('click', closeModal);

  // Cerrar al hacer clic en el backdrop oscuro
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Cerrar con Escape
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  // Cambio de pestañas
  const tabButtons = overlay.querySelectorAll('.tabBtnLimpieza');
  const tabPanels = {
    duplicados: overlay.querySelector('#tabPanelDuplicados'),
    seleccion: overlay.querySelector('#tabPanelSeleccion'),
    vaciar: overlay.querySelector('#tabPanelVaciar')
  };

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      tabButtons.forEach(b => {
        b.style.background = 'transparent';
        b.style.color = b.dataset.tab === 'vaciar' ? '#DC2626' : '#64748B';
        b.style.border = 'none';
      });
      btn.style.background = '#FFF';
      btn.style.color = '#0F172A';
      btn.style.border = '1px solid #CBD5E1';

      Object.keys(tabPanels).forEach(k => {
        if (tabPanels[k]) tabPanels[k].style.display = (k === target ? 'block' : 'none');
      });
    });
  });

  // -------------------------------------------------------------------------
  // FUNCIÓN AUXILIAR PARA ELIMINAR DE FIRESTORE EN LOTES SEGUROS
  // -------------------------------------------------------------------------
  const executeDeleteIds = async (idsToDelete, actionLabel) => {
    if (!Array.isArray(idsToDelete) || idsToDelete.length === 0) return;

    const count = idsToDelete.length;
    showToast(`Eliminando ${count} registro(s)...`);

    try {
      if (dbNs) {
        // Lotes de 400 para respetar el límite de 500 operaciones de Firestore
        const chunkSize = 400;
        for (let i = 0; i < idsToDelete.length; i += chunkSize) {
          const chunk = idsToDelete.slice(i, i + chunkSize);
          const batch = dbNs.batch();
          chunk.forEach(id => {
            batch.delete(dbNs.collection('submissions').doc(id));
          });
          await batch.commit();
        }
      }

      // Actualizar estado local
      const deletedSet = new Set(idsToDelete);
      if (state && Array.isArray(state.submissions)) {
        state.submissions = state.submissions.filter(s => !deletedSet.has(s.id));
      }

      closeModal();
      showToast(`Se eliminaron ${count} registro(s) exitosamente (${actionLabel}).`);

      if (typeof onCompleted === 'function') {
        onCompleted();
      }
    } catch (err) {
      console.error('Error al eliminar registros en lote:', err);
      showToast('Error al eliminar los registros: ' + (err.message || 'Error de red'));
    }
  };

  // -------------------------------------------------------------------------
  // ACCIÓN 1: ELIMINAR DUPLICADOS
  // -------------------------------------------------------------------------
  const btnDuplicados = overlay.querySelector('#btnEjecutarLimpiezaDuplicados');
  if (btnDuplicados) {
    btnDuplicados.addEventListener('click', async () => {
      const ids = duplicateItemsToDelete.map(x => x.s.id);
      if (ids.length === 0) return;
      if (!confirm(`¿Confirmas eliminar ${ids.length} registro(s) duplicado(s)? Se mantendrá la versión más reciente de cada IE.`)) {
        return;
      }
      btnDuplicados.disabled = true;
      btnDuplicados.innerText = 'Eliminando...';
      await executeDeleteIds(ids, 'Depuración de duplicados');
    });
  }

  // -------------------------------------------------------------------------
  // ACCIÓN 2: SELECCIÓN MANUAL DE REGISTROS
  // -------------------------------------------------------------------------
  const chkAll = overlay.querySelector('#chkMarcarTodas');
  const chkItems = overlay.querySelectorAll('.chkFichaItem');
  const lblCount = overlay.querySelector('#lblSeleccionadasCount');
  const btnEliminarSel = overlay.querySelector('#btnEjecutarLimpiezaSeleccionadas');
  const txtBuscar = overlay.querySelector('#txtBuscarEnLista');
  const rowsManual = overlay.querySelectorAll('.rowItemManual');

  const updateSelectionState = () => {
    const selected = Array.from(chkItems).filter(c => c.checked).map(c => c.value);
    const cnt = selected.length;
    if (lblCount) lblCount.textContent = `· ${cnt} seleccionadas`;
    if (btnEliminarSel) {
      btnEliminarSel.innerText = `🗑️ Eliminar seleccionadas (${cnt})`;
      if (cnt > 0) {
        btnEliminarSel.disabled = false;
        btnEliminarSel.style.cursor = 'pointer';
        btnEliminarSel.style.opacity = '1';
      } else {
        btnEliminarSel.disabled = true;
        btnEliminarSel.style.cursor = 'not-allowed';
        btnEliminarSel.style.opacity = '0.5';
      }
    }
  };

  if (chkAll) {
    chkAll.addEventListener('change', () => {
      const isChecked = chkAll.checked;
      chkItems.forEach(chk => {
        const row = chk.closest('tr');
        if (!row || row.style.display !== 'none') {
          chk.checked = isChecked;
        }
      });
      updateSelectionState();
    });
  }

  chkItems.forEach(chk => {
    chk.addEventListener('change', updateSelectionState);
  });

  // Clic en la fila marca el checkbox
  rowsManual.forEach(row => {
    row.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;
      const chk = row.querySelector('.chkFichaItem');
      if (chk) {
        chk.checked = !chk.checked;
        updateSelectionState();
      }
    });
  });

  // Filtro de búsqueda rápida en el panel manual
  if (txtBuscar) {
    txtBuscar.addEventListener('input', () => {
      const q = txtBuscar.value.toLowerCase().trim();
      rowsManual.forEach(r => {
        const name = r.dataset.name || '';
        r.style.display = (!q || name.includes(q)) ? '' : 'none';
      });
    });
  }

  if (btnEliminarSel) {
    btnEliminarSel.addEventListener('click', async () => {
      const ids = Array.from(chkItems).filter(c => c.checked).map(c => c.value);
      if (ids.length === 0) return;
      if (!confirm(`¿Confirmas eliminar permanentemente los ${ids.length} registros seleccionados?`)) {
        return;
      }
      btnEliminarSel.disabled = true;
      btnEliminarSel.innerText = 'Eliminando...';
      await executeDeleteIds(ids, 'Selección manual');
    });
  }

  // -------------------------------------------------------------------------
  // ACCIÓN 3: VACIAR TODOS LOS REGISTROS
  // -------------------------------------------------------------------------
  const txtConfirm = overlay.querySelector('#txtConfirmacionEliminar');
  const btnVaciarTodo = overlay.querySelector('#btnEjecutarVaciarTodo');

  if (txtConfirm && btnVaciarTodo) {
    txtConfirm.addEventListener('input', () => {
      const val = txtConfirm.value.trim().toUpperCase();
      if (val === 'ELIMINAR') {
        btnVaciarTodo.disabled = false;
        btnVaciarTodo.style.cursor = 'pointer';
        btnVaciarTodo.style.opacity = '1';
        btnVaciarTodo.style.background = '#DC2626';
      } else {
        btnVaciarTodo.disabled = true;
        btnVaciarTodo.style.cursor = 'not-allowed';
        btnVaciarTodo.style.opacity = '0.4';
        btnVaciarTodo.style.background = '#BE123C';
      }
    });

    btnVaciarTodo.addEventListener('click', async () => {
      const allIds = statsList.map(x => x.s.id);
      if (allIds.length === 0) return;
      if (!confirm(`¡ADVERTENCIA FINAL!\nEstás a punto de vaciar ${allIds.length} fichas registradas de la base de datos.\n¿Deseas continuar?`)) {
        return;
      }
      btnVaciarTodo.disabled = true;
      btnVaciarTodo.innerText = 'Vaciando registros...';
      await executeDeleteIds(allIds, 'Vaciado total');
    });
  }
}
