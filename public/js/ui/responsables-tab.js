/* =========================================================================
   responsables-tab.js — Directorio, importación y autocompletado de especialistas
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import {
  esc,
  genId,
  showToast,
  normalizeText,
  normalizeReiNumber,
  normalizeReiList,
  downloadCsv,
  cleanForFirestore
} from './core-utils.js?v=20261015_v1';

import { ESPECIALISTA_JEC_OFICIAL } from '../calcEngine.js?v=20261013_v2';

export const RESP_FIELD_ALIASES = {
  red: ['red', 'redes', 'rei', 'reis', 'red(es)', 'red (es)', 'redes a cargo'],
  distrito: ['distrito', 'distritos', 'distrito(s)', 'distritos(s)', 'distrito (s)', 'jurisdiccion', 'jurisdicción'],
  especialista: ['especialista responsable', 'especialista', 'responsable', 'area', 'área', 'especialidad'],
  nombresApellidos: ['nombres y apellidos', 'apellidos y nombres', 'nombre', 'nombres', 'apellidos', 'especialista nombres'],
  cargo: ['cargo', 'puesto', 'funcion', 'función'],
  modalidad: ['modalidad', 'modalidades', 'nivel/modalidad', 'servicio'],
  celular: ['n°celular', 'n° celular', 'celular', 'telefono', 'teléfono', 'n celular', 'nro celular', 'movil', 'móvil'],
  correo: ['correo institucional', 'correo', 'email', 'e-mail', 'correo electronico', 'correo electrónico']
};

/** Genera un ID válido y seguro para Firestore a partir de correo o nombres */
export function docIdForResponsable(correo, nombres) {
  const base = (correo || nombres || '').trim().toLowerCase();
  let id = normalizeText(base)
    .replace(/[\/\s\\#?%*:[\]@.]/g, '_')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  if (!id || id.startsWith('__')) {
    id = ('resp_' + id).replace(/^_+|_+$/g, '').slice(0, 120);
  }
  return id || genId();
}

/** Prepara y sanea el registro de especialista para Firestore */
export function sanitizeResponsableRecord(r, existing, now) {
  now = (typeof now === 'number' && !isNaN(now)) ? now : Date.now();
  const createdAt = (existing && typeof existing.createdAt === 'number' && !isNaN(existing.createdAt))
    ? existing.createdAt
    : now;

  const s = (v) => {
    if (v === undefined || v === null || (typeof v === 'number' && isNaN(v))) return '';
    return String(v).trim();
  };

  let modalidad = s(r.modalidad);
  const mNorm = normalizeText(modalidad);
  if (mNorm.includes('amb') || (mNorm.includes('ebr') && mNorm.includes('ebe'))) {
    modalidad = 'EBR / EBE';
  } else if (mNorm.includes('ebe')) {
    modalidad = 'EBE';
  } else if (mNorm.includes('ebr')) {
    modalidad = 'EBR';
  }

  const docData = {
    red: normalizeReiList(r.red) || s(r.red),
    distrito: s(r.distrito),
    especialista: s(r.especialista),
    nombresApellidos: s(r.nombresApellidos),
    cargo: s(r.cargo),
    modalidad: modalidad,
    celular: s(r.celular),
    correo: s(r.correo),
    updatedAt: now,
    createdAt: createdAt,
  };

  return cleanForFirestore(docData);
}

/** Descarga plantilla Excel para importar especialistas/responsables */
export function downloadPlantillaResponsablesExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Librería Excel no disponible. Revisa la conexión a internet.');
    return;
  }
  const headers = [
    'RED', 'Distrito(s)', 'Especialista responsable', 'Nombres y apellidos',
    'Cargo', 'Modalidad', 'N°Celular', 'Correo Institucional'
  ];
  const exampleRows = [
    [
      '01, 03', 'Cercado de Lima, Breña', 'Especialista de Convivencia Escolar',
      'García Mendoza, Ana María', 'Especialista en Educación EBR / EBE',
      'EBR / EBE', '987654321', 'ana.garcia@ugel03.gob.pe'
    ],
    [
      '02', 'La Victoria', 'Especialista Pedagógico',
      'Ramos Silva, Jorge Luis', 'Coordinador Pedagógico',
      'EBR', '912345678', 'jorge.ramos@ugel03.gob.pe'
    ],
    [
      '05', 'San Isidro, Miraflores', 'Especialista de Inclusión',
      'Paredes Castro, Lucía Elena', 'Especialista EBE',
      'EBE', '998877665', 'lucia.paredes@ugel03.gob.pe'
    ]
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);
  ws['!cols'] = headers.map(() => ({ wch: 26 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Responsables');
  XLSX.writeFile(wb, 'plantilla_responsables.xlsx');
  showToast('Plantilla de responsables descargada.');
}

/** Lee archivo Excel de responsables y extrae filas */
export async function parseResponsablesExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (typeof XLSX === 'undefined') { reject(new Error('SheetJS no disponible')); return; }
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rawRows.length < 2) { resolve({ rows: [], errors: ['El archivo no contiene suficientes filas.'] }); return; }

        const headerRow = rawRows[0].map(h => normalizeText(String(h)).replace(/\.$/, ''));
        const colMap = {};

        headerRow.forEach((h, i) => {
          if (!h) return;
          for (const field in RESP_FIELD_ALIASES) {
            if (RESP_FIELD_ALIASES[field].some(a => normalizeText(a).replace(/\.$/, '') === h)) {
              colMap[i] = field;
              break;
            }
          }
        });

        // Fallback heurístico si no coincidieron todos los encabezados
        if (!Object.values(colMap).includes('nombresApellidos')) {
          headerRow.forEach((h, i) => {
            if (h.includes('nom') || h.includes('apel')) colMap[i] = 'nombresApellidos';
          });
        }
        if (!Object.values(colMap).includes('correo')) {
          headerRow.forEach((h, i) => {
            if (h.includes('corr') || h.includes('mail')) colMap[i] = 'correo';
          });
        }
        if (!Object.values(colMap).includes('red')) {
          headerRow.forEach((h, i) => {
            if (h.includes('red') || h.includes('rei')) colMap[i] = 'red';
          });
        }
        if (!Object.values(colMap).includes('modalidad')) {
          headerRow.forEach((h, i) => {
            if (h.includes('mod')) colMap[i] = 'modalidad';
          });
        }

        const parsedRows = [], errors = [];
        for (let ri = 1; ri < rawRows.length; ri++) {
          const vals = rawRows[ri];
          if (!vals || !Array.isArray(vals) || vals.every(v => v === undefined || v === null || String(v).trim() === '')) continue;

          const row = {
            _rowNum: ri + 1,
            red: '', distrito: '', especialista: '', nombresApellidos: '',
            cargo: '', modalidad: '', celular: '', correo: ''
          };

          Object.entries(colMap).forEach(([ci, field]) => {
            const rawVal = vals[+ci];
            const val = (rawVal === undefined || rawVal === null) ? '' : String(rawVal).trim();
            if (field === 'red') { row.red = normalizeReiList(val) || val; }
            else { row[field] = val; }
          });

          // Normalizar modalidad
          const mNorm = normalizeText(row.modalidad);
          if (mNorm.includes('amb') || (mNorm.includes('ebr') && mNorm.includes('ebe'))) {
            row.modalidad = 'EBR / EBE';
          } else if (mNorm.includes('ebe')) {
            row.modalidad = 'EBE';
          } else if (mNorm.includes('ebr')) {
            row.modalidad = 'EBR';
          }

          if (!row.nombresApellidos && !row.correo) {
            errors.push('Fila ' + (ri + 1) + ': falta Nombres y apellidos o Correo — omitida.');
            continue;
          }
          parsedRows.push(row);
        }
        resolve({ rows: parsedRows, errors });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function modalidadBadge(m) {
  if (!m) return '<span class="badge st-none">—</span>';
  const norm = m.toUpperCase();
  if (norm.includes('EBR') && norm.includes('EBE')) {
    return '<span class="badge badge-ambas">EBR / EBE</span>';
  }
  if (norm.includes('EBE')) {
    return '<span class="badge badge-ebe">EBE</span>';
  }
  if (norm.includes('EBR')) {
    return '<span class="badge badge-ebr">EBR</span>';
  }
  return '<span class="badge st-none">' + esc(m) + '</span>';
}

let respFilters = { modalidad: '', red: '', q: '' };
let respExpanded = null;
let respShowImport = false;
let respImportPreview = null; // {rows, errors}
let respImportResults = null; // { total, success, failures, mainErrorCode }
let respEditing = null; // null | 'new' | responsableId

export function renderResponsablesTab(container, state, dbNs, isAdmin, currentUser) {
  // Asegurar que la Especialista Oficial de JEC esté visible en el directorio
  const hasJecResp = (state.responsables || []).some(r => {
    const n = (r.nombresApellidos || '').toLowerCase();
    return n.includes('fanny liliana') || (n.includes('fanny') && n.includes('arias'));
  });
  if (!hasJecResp) {
    const jecObj = {
      id: 'resp_jec_fanny_arias',
      nombresApellidos: ESPECIALISTA_JEC_OFICIAL.nombresApellidos,
      cargo: ESPECIALISTA_JEC_OFICIAL.cargo,
      especialista: ESPECIALISTA_JEC_OFICIAL.area,
      modalidad: ESPECIALISTA_JEC_OFICIAL.modalidad,
      red: ESPECIALISTA_JEC_OFICIAL.red,
      distrito: 'UGEL 03',
      entidad: ESPECIALISTA_JEC_OFICIAL.entidad
    };
    if (!state.responsables) state.responsables = [];
    state.responsables.push(jecObj);
    if (isAdmin && dbNs) {
      dbNs.collection('responsables').doc('resp_jec_fanny_arias').set({ ...jecObj, createdAt: Date.now() }).catch(() => { });
    }
  }

  const standardReis = Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));
  const allReds = new Set(standardReis);
  (state.responsables || []).forEach(r => {
    if (!r.red) return;
    (String(r.red).match(/\d+/g) || []).forEach(x => {
      const num = normalizeReiNumber(x);
      if (num) allReds.add(num);
    });
  });
  const redList = Array.from(allReds).sort((a, b) => Number(a) - Number(b));

  const totalResp = (state.responsables || []).length;
  const ebrCount = (state.responsables || []).filter(r => (r.modalidad || '').toUpperCase() === 'EBR').length;
  const ebeCount = (state.responsables || []).filter(r => (r.modalidad || '').toUpperCase() === 'EBE').length;
  const ambasCount = (state.responsables || []).filter(r => {
    const m = (r.modalidad || '').toUpperCase();
    return m === 'EBR / EBE' || (m.includes('EBR') && m.includes('EBE'));
  }).length;

  function buildResponsablesRowsHtml(filtered, respExpanded, isAdmin, state) {
    return filtered.map(r => {
      const isOpen = respExpanded === r.id;
      const subsCount = (state.submissions || []).filter(s => {
        const respName = (s.responsable || '').trim().toLowerCase();
        const myName = (r.nombresApellidos || '').trim().toLowerCase();
        return respName && myName && (respName.includes(myName) || myName.includes(respName));
      }).length;

      const detailHtml = isOpen
        ? '<div style="background:var(--surface-2);border-radius:var(--radius);padding:14px;margin:6px 0;font-size:13px;line-height:1.6">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">' +
        '<div><strong>RED(s) asignadas:</strong> ' + esc(normalizeReiList(r.red) || r.red || '—') + '</div>' +
        '<div><strong>Distrito(s):</strong> ' + esc(r.distrito || '—') + '</div>' +
        '<div><strong>Área / Especialidad:</strong> ' + esc(r.especialista || '—') + '</div>' +
        '<div><strong>Cargo oficial:</strong> ' + esc(r.cargo || '—') + '</div>' +
        '<div><strong>Modalidad:</strong> ' + modalidadBadge(r.modalidad) + '</div>' +
        '<div><strong>N° Celular:</strong> ' + (r.celular ? (isAdmin ? '<a href="tel:' + esc(r.celular) + '">📞 ' + esc(r.celular) + '</a>' : '📞 ***' + esc(r.celular).slice(-3)) : '—') + '</div>' +
        '<div><strong>Correo:</strong> ' + (r.correo ? '<a href="mailto:' + esc(r.correo) + '">✉ ' + esc(r.correo) + '</a>' : '—') + '</div>' +
        '<div><strong>Fichas registradas:</strong> <span class="badge ' + (subsCount ? 'st-logrado' : 'st-none') + '">' + subsCount + ' ficha(s)</span></div>' +
        '</div>' +
        '</div>'
        : '';

      return '<tr class="clickable" data-resprow="' + esc(r.id) + '">' +
        '<td>' + (r.red ? '<span class="badge badge-red">' + esc(normalizeReiList(r.red) || r.red) + '</span>' : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
        '<td>' + esc(r.distrito || '—') + '</td>' +
        '<td><strong>' + esc(r.especialista || '—') + '</strong></td>' +
        '<td>' + esc(r.nombresApellidos || '—') + '</td>' +
        '<td>' + esc(r.cargo || '—') + '</td>' +
        '<td>' + modalidadBadge(r.modalidad) + '</td>' +
        '<td>' + (r.celular ? (isAdmin ? '<a href="tel:' + esc(r.celular) + '" style="color:inherit;text-decoration:none">📞 ' + esc(r.celular) + '</a>' : '📞 ***' + esc(r.celular).slice(-3)) : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
        '<td>' + (r.correo ? '<a href="mailto:' + esc(r.correo) + '" style="color:var(--primary);text-decoration:none">✉ ' + esc(r.correo) + '</a>' : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
        (isAdmin ? '<td><button class="iconBtn" data-respenit="' + esc(r.id) + '" title="Editar">✎</button> <button class="iconBtn" data-respdel="' + esc(r.id) + '" title="Eliminar">✕</button></td>' : '<td></td>') +
        '</tr>' +
        (isOpen ? '<tr class="detailRow"><td colspan="' + (isAdmin ? 9 : 8) + '">' + detailHtml + '</td></tr>' : '');
    }).join('') || '<tr><td colspan="' + (isAdmin ? 9 : 8) + '" style="text-align:center;color:var(--ink-soft);padding:22px">Ningún especialista coincide con los filtros.</td></tr>';
  }

  const getFilteredResponsables = () => {
    let list = (state.responsables || []).slice();
    if (respFilters.modalidad) {
      if (respFilters.modalidad === 'EBR') {
        list = list.filter(r => (r.modalidad || '').toUpperCase().includes('EBR'));
      } else if (respFilters.modalidad === 'EBE') {
        list = list.filter(r => (r.modalidad || '').toUpperCase().includes('EBE'));
      } else if (respFilters.modalidad === 'EBR / EBE') {
        list = list.filter(r => {
          const m = (r.modalidad || '').toUpperCase();
          return m === 'EBR / EBE' || (m.includes('EBR') && m.includes('EBE'));
        });
      } else {
        list = list.filter(r => r.modalidad === respFilters.modalidad);
      }
    }
    if (respFilters.red) {
      const reqRed = normalizeReiNumber(respFilters.red);
      list = list.filter(r => {
        if (!r.red) return false;
        const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
        if (reqRed && rNums.includes(reqRed)) return true;
        return normalizeText(r.red).includes(normalizeText(respFilters.red));
      });
    }
    if (respFilters.q) {
      const qNorm = normalizeText(respFilters.q);
      list = list.filter(r =>
        normalizeText(r.nombresApellidos).includes(qNorm) ||
        normalizeText(r.especialista).includes(qNorm) ||
        normalizeText(r.cargo).includes(qNorm) ||
        normalizeText(r.red).includes(qNorm) ||
        normalizeText(r.distrito).includes(qNorm) ||
        normalizeText(r.correo).includes(qNorm) ||
        normalizeText(r.celular).includes(qNorm)
      );
    }
    list.sort((a, b) => (a.nombresApellidos || '').localeCompare(b.nombresApellidos || ''));
    return list;
  };

  const filtered = getFilteredResponsables();
  const rows = buildResponsablesRowsHtml(filtered, respExpanded, isAdmin, state);

  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const selStart = (activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
  const selEnd = (activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  container.innerHTML = '' +
    '<div class="pageHead">' +
    '<h2>Responsables</h2>' +
    '<p>Directorio de especialistas responsables de monitoreo por RED, distrito y modalidad (EBR, EBE o ambas).</p>' +
    '</div>' +
    '<div class="cards">' +
    '<div class="card"><div class="num">' + totalResp + '</div><div class="lbl">Especialistas registrados</div></div>' +
    '<div class="card"><div class="num">' + redList.length + '</div><div class="lbl">REDs cubiertas</div></div>' +
    '<div class="card"><div class="num">' + ebrCount + '</div><div class="lbl">Modalidad EBR</div></div>' +
    '<div class="card"><div class="num">' + ebeCount + '</div><div class="lbl">Modalidad EBE</div></div>' +
    '<div class="card"><div class="num">' + ambasCount + '</div><div class="lbl">Ambas (EBR / EBE)</div></div>' +
    '</div>' +
    (totalResp === 0 ? '<div class="empty"><h4>Aún no hay especialistas registrados</h4><p>' + (isAdmin ? 'Importa la lista de responsables en el panel de abajo o agrégalos manualmente.' : 'Pide a un administrador que importe la nómina de especialistas.') + '</p></div>' : '') +
    (isAdmin ? renderResponsablesAdminPanel(state) : '') +
    '<div class="panel">' +
    '<h3>Directorio de especialistas</h3>' +
    '<div class="filterBar">' +
    '<div class="field">' +
    '<label>Modalidad</label>' +
    '<select id="resp_fil_modalidad">' +
    '<option value="">Todas las modalidades</option>' +
    '<option value="EBR"' + (respFilters.modalidad === 'EBR' ? ' selected' : '') + '>EBR</option>' +
    '<option value="EBE"' + (respFilters.modalidad === 'EBE' ? ' selected' : '') + '>EBE</option>' +
    '<option value="EBR / EBE"' + (respFilters.modalidad === 'EBR / EBE' ? ' selected' : '') + '>EBR / EBE (Ambas)</option>' +
    '</select>' +
    '</div>' +
    '<div class="field">' +
    '<label>RED</label>' +
    '<select id="resp_fil_red">' +
    '<option value="">Todas las REDs</option>' +
    redList.map(r => {
      const isSel = (r === respFilters.red) || (normalizeReiNumber(respFilters.red) === r);
      return '<option value="' + esc(r) + '"' + (isSel ? ' selected' : '') + '>' + esc(r) + '</option>';
    }).join('') +
    '</select>' +
    '</div>' +
    '<div class="field" style="flex:2;min-width:200px">' +
    '<label>Buscar</label>' +
    '<input type="search" id="resp_fil_q" value="' + esc(respFilters.q) + '" placeholder="Nombre, cargo, área, RED o distrito...">' +
    '</div>' +
    '<button class="btn secondary small" id="resp_fil_clear" type="button" style="align-self:flex-end;margin-bottom:2px">Limpiar</button>' +
    '<button class="btn secondary small" id="resp_export" type="button" style="margin-left:auto;align-self:flex-end;margin-bottom:2px">Exportar CSV</button>' +
    '</div>' +
    '<div class="tblWrap"><table><thead><tr><th>RED</th><th>Distrito(s)</th><th>Especialista responsable</th><th>Nombres y apellidos</th><th>Cargo</th><th>Modalidad</th><th>N°Celular</th><th>Correo Institucional</th>' + (isAdmin ? '<th></th>' : '') + '</tr></thead><tbody id="resp_table_tbody">' + rows + '</tbody></table></div>' +
    '</div>';

  window.scrollTo(scrollX, scrollY);
  if (activeId) {
    const newEl = container.querySelector('#' + activeId);
    if (newEl) {
      newEl.focus();
      if (selStart !== null && selEnd !== null) {
        try { newEl.setSelectionRange(selStart, selEnd); } catch (_) { }
      }
    }
  }

  const updateRespTableOnly = () => {
    const tbody = container.querySelector('#resp_table_tbody');
    if (!tbody) {
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
      return;
    }
    const curFiltered = getFilteredResponsables();
    tbody.innerHTML = buildResponsablesRowsHtml(curFiltered, respExpanded, isAdmin, state);
    bindRespRowEvents();
  };

  const bindRespRowEvents = () => {
    container.querySelectorAll('tr[data-resprow]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('[data-respenit],[data-respdel],a')) return;
        const id = tr.dataset.resprow;
        respExpanded = respExpanded === id ? null : id;
        updateRespTableOnly();
      });
    });

    if (isAdmin) {
      container.querySelectorAll('[data-respenit]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          respEditing = btn.dataset.respenit;
          renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
        });
      });

      container.querySelectorAll('[data-respdel]').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('¿Eliminar este especialista del directorio?')) return;
          try {
            await dbNs.collection('responsables').doc(btn.dataset.respdel).delete();
            showToast('Especialista eliminado.');
          } catch (err) {
            console.error('Error eliminando responsable:', err);
            showToast('No se pudo eliminar: [' + (err.code || 'error') + '] ' + err.message);
          }
        });
      });
    }
  };

  bindRespRowEvents();

  const fMod = document.getElementById('resp_fil_modalidad');
  if (fMod) fMod.addEventListener('change', e => { respFilters.modalidad = e.target.value; updateRespTableOnly(); });
  const fRed = document.getElementById('resp_fil_red');
  if (fRed) fRed.addEventListener('change', e => { respFilters.red = normalizeReiNumber(e.target.value) || e.target.value; updateRespTableOnly(); });
  const fQ = document.getElementById('resp_fil_q');
  if (fQ) fQ.addEventListener('input', e => { respFilters.q = e.target.value; updateRespTableOnly(); });
  const fClear = document.getElementById('resp_fil_clear');
  if (fClear) fClear.addEventListener('click', () => {
    respFilters = { modalidad: '', red: '', q: '' };
    if (fMod) fMod.value = '';
    if (fRed) fRed.value = '';
    if (fQ) fQ.value = '';
    updateRespTableOnly();
  });

  const fExport = document.getElementById('resp_export');
  if (fExport) fExport.addEventListener('click', () => {
    const curFiltered = getFilteredResponsables();
    const header = ['RED', 'Distrito(s)', 'Especialista responsable', 'Nombres y apellidos', 'Cargo', 'Modalidad', 'N° Celular', 'Correo Institucional'];
    const dataRows = curFiltered.map(r => [
      normalizeReiList(r.red) || r.red || '',
      r.distrito || '',
      r.especialista || '',
      r.nombresApellidos || '',
      r.cargo || '',
      r.modalidad || '',
      r.celular || '',
      r.correo || ''
    ]);
    downloadCsv('especialistas_responsables.csv', header, dataRows);
  });

  if (isAdmin) {
    const newBtn = document.getElementById('resp_new_btn');
    if (newBtn) newBtn.addEventListener('click', () => {
      respEditing = 'new';
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
    });

    const saveBtn = document.getElementById('resp_f_save');
    if (saveBtn) saveBtn.addEventListener('click', () => saveResponsableForm(state, dbNs, container, isAdmin, currentUser));

    const cancelBtn = document.getElementById('resp_f_cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      respEditing = null;
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
    });

    const impToggle = document.getElementById('resp_import_toggle');
    if (impToggle) impToggle.addEventListener('click', () => {
      respShowImport = !respShowImport;
      renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
    });

    const plantillaBtn = document.getElementById('resp_download_plantilla');
    if (plantillaBtn) plantillaBtn.addEventListener('click', downloadPlantillaResponsablesExcel);

    const impFile = document.getElementById('resp_import_file');
    if (impFile) {
      impFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        respImportResults = null;
        try {
          respImportPreview = await parseResponsablesExcel(file);
        } catch (err) {
          console.error('Error leyendo archivo Excel de responsables:', err);
          respImportPreview = { rows: [], errors: ['No se pudo leer el archivo: ' + (err.message || 'error')] };
        }
        renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
        e.target.value = '';
      });
    }

    const impConfirm = document.getElementById('resp_import_confirm');
    if (impConfirm) {
      impConfirm.addEventListener('click', () => {
        commitResponsablesImport(state, dbNs, container, isAdmin, currentUser);
      });
    }

    const clearResBtn = document.getElementById('resp_import_clear_results');
    if (clearResBtn) {
      clearResBtn.addEventListener('click', () => {
        respImportResults = null;
        renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
      });
    }
  }
}

function renderResponsablesAdminPanel(state) {
  const existing = (respEditing && respEditing !== 'new')
    ? (state.responsables || []).find(r => r.id === respEditing)
    : null;

  return '' +
    '<div class="panel"><h3>Agregar / editar especialista</h3>' +
    (respEditing ? renderResponsableFormPanel(existing, state) : '<button class="btn secondary small" id="resp_new_btn" type="button">+ Agregar especialista manualmente</button>') +
    '</div>' +
    '<div class="panel">' +
    '<h3>Importar especialistas desde Excel <small>archivo .xlsx</small></h3>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<button class="btn secondary small" id="resp_import_toggle" type="button">' + (respShowImport ? 'Ocultar importación' : 'Importar desde Excel') + '</button>' +
    '<button class="btn secondary small" id="resp_download_plantilla" type="button">⬇ Descargar plantilla Excel</button>' +
    '</div>' +
    (respShowImport ? renderResponsablesImportForm() : '') +
    '</div>';
}

function renderResponsableFormPanel(existing, state) {
  const standardReis = Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));
  const allReds = new Set(standardReis);
  (state.responsables || []).forEach(r => {
    if (!r.red) return;
    (String(r.red).match(/\d+/g) || []).forEach(x => {
      const num = normalizeReiNumber(x);
      if (num) allReds.add(num);
    });
  });
  const redOpts = Array.from(allReds).sort((a, b) => Number(a) - Number(b)).map(r => '<option value="' + esc(r) + '">').join('');

  const modVal = existing ? (existing.modalidad || '') : 'EBR';

  return '' +
    '<div class="fieldGrid">' +
    '<div class="field">' +
    '<label>RED (o REDs a cargo)</label>' +
    '<input type="text" id="resp_f_red" list="dl_resp_redes" value="' + esc(existing ? (normalizeReiList(existing.red) || existing.red) : '') + '" placeholder="Ej. 01 o 01, 03">' +
    '<datalist id="dl_resp_redes">' + redOpts + '</datalist>' +
    '</div>' +
    '<div class="field">' +
    '<label>Distrito(s)</label>' +
    '<input type="text" id="resp_f_distrito" value="' + esc(existing ? existing.distrito : '') + '" placeholder="Ej. Cercado de Lima, Breña">' +
    '</div>' +
    '<div class="field">' +
    '<label>Especialista responsable (Área)</label>' +
    '<input type="text" id="resp_f_especialista" value="' + esc(existing ? existing.especialista : '') + '" placeholder="Ej. Especialista en Convivencia">' +
    '</div>' +
    '<div class="field">' +
    '<label>Nombres y apellidos *</label>' +
    '<input type="text" id="resp_f_nombres" value="' + esc(existing ? existing.nombresApellidos : '') + '" placeholder="Apellidos y nombres completos" required>' +
    '</div>' +
    '<div class="field">' +
    '<label>Cargo</label>' +
    '<input type="text" id="resp_f_cargo" value="' + esc(existing ? existing.cargo : '') + '" placeholder="Ej. Especialista Pedagógico">' +
    '</div>' +
    '<div class="field">' +
    '<label>Modalidad</label>' +
    '<select id="resp_f_modalidad">' +
    '<option value="EBR"' + (modVal === 'EBR' ? ' selected' : '') + '>EBR</option>' +
    '<option value="EBE"' + (modVal === 'EBE' ? ' selected' : '') + '>EBE</option>' +
    '<option value="EBR / EBE"' + (modVal === 'EBR / EBE' || (modVal.includes('EBR') && modVal.includes('EBE')) ? ' selected' : '') + '>EBR / EBE (Ambas)</option>' +
    '</select>' +
    '</div>' +
    '<div class="field">' +
    '<label>N° Celular</label>' +
    '<input type="text" id="resp_f_celular" value="' + esc(existing ? existing.celular : '') + '" placeholder="Ej. 987654321">' +
    '</div>' +
    '<div class="field">' +
    '<label>Correo Institucional</label>' +
    '<input type="email" id="resp_f_correo" value="' + esc(existing ? existing.correo : '') + '" placeholder="usuario@ugel03.gob.pe">' +
    '</div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:4px">' +
    '<button class="btn small" id="resp_f_save" type="button">' + (existing ? 'Actualizar especialista' : 'Guardar especialista') + '</button>' +
    '<button class="btn secondary small" id="resp_f_cancel" type="button">Cancelar</button>' +
    '</div>';
}

async function saveResponsableForm(state, dbNs, container, isAdmin, currentUser) {
  const nombres = (document.getElementById('resp_f_nombres').value || '').trim();
  const correo = (document.getElementById('resp_f_correo').value || '').trim();
  if (!nombres) { showToast('Ingresa los Nombres y apellidos del especialista.'); return; }

  const id = (respEditing && respEditing !== 'new') ? respEditing : docIdForResponsable(correo, nombres);
  const existing = (state.responsables || []).find(x => x.id === id);

  const raw = {
    red: normalizeReiList(document.getElementById('resp_f_red')?.value) || (document.getElementById('resp_f_red')?.value || '').trim(),
    distrito: (document.getElementById('resp_f_distrito').value || '').trim(),
    especialista: (document.getElementById('resp_f_especialista').value || '').trim(),
    nombresApellidos: nombres,
    cargo: (document.getElementById('resp_f_cargo').value || '').trim(),
    modalidad: (document.getElementById('resp_f_modalidad').value || '').trim(),
    celular: (document.getElementById('resp_f_celular').value || '').trim(),
    correo: correo,
  };

  const data = sanitizeResponsableRecord(raw, existing, Date.now());
  try {
    await dbNs.collection('responsables').doc(id).set(data);
    showToast('Especialista guardado con éxito.');
    respEditing = null;
  } catch (err) {
    console.error('Error al guardar especialista en Firestore:', err);
    showToast('No se pudo guardar: [' + (err.code || 'error') + '] ' + err.message);
  }
  renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
}

function renderResponsablesImportForm() {
  const resultsHtml = respImportResults ? renderResponsablesImportResults(respImportResults) : '';
  const previewHtml = respImportPreview ? renderResponsablesImportPreview(respImportPreview) : '';
  return '' +
    resultsHtml +
    '<p class="helpText" style="margin-top:0">' +
    'Descarga la plantilla con el botón de arriba, complétala en Excel y súbela aquí. ' +
    'Columnas reconocidas: <strong>RED, Distrito(s), Especialista responsable, Nombres y apellidos, Cargo, Modalidad, N°Celular, Correo Institucional</strong>. ' +
    'En Modalidad puedes indicar <code>EBR</code>, <code>EBE</code> o <code>EBR / EBE</code> si tiene a cargo ambas modalidades. ' +
    'Si el especialista ya existe en el directorio, se actualizará en vez de duplicarse.' +
    '</p>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
    '<input type="file" id="resp_import_file" accept=".xlsx,.xls" style="font-size:13px">' +
    '</div>' +
    (respImportPreview && respImportPreview.rows.length
      ? '<button class="btn small" id="resp_import_confirm" type="button" style="margin-bottom:10px">✓ Confirmar importación (' + respImportPreview.rows.length + ' especialistas)</button>'
      : '') +
    previewHtml;
}

function renderResponsablesImportResults(res) {
  if (!res) return '';
  const isAllSuccess = res.failures.length === 0 && res.success > 0;
  const isPartial = res.success > 0 && res.failures.length > 0;

  const hasPermError = res.failures.some(f =>
    f.code === 'permission-denied' ||
    (f.message && f.message.toLowerCase().includes('insufficient permissions'))
  ) || (res.mainErrorCode === 'permission-denied');

  const permAdviceHtml = hasPermError
    ? '<div style="background:rgba(239,68,68,0.08);border:1px solid var(--danger);border-radius:var(--radius);padding:12px 14px;margin:12px 0;font-size:13px;line-height:1.5">' +
    '<div style="font-weight:700;color:var(--danger);margin-bottom:6px">⚠ Diagnóstico de permisos (FirebaseError: Missing or insufficient permissions)</div>' +
    'Firestore rechazó las escrituras en la colección <code>responsables</code>. Verifica:' +
    '<ol style="margin:8px 0 0 18px;padding:0">' +
    '<li>Que la regla de seguridad para <code>responsables</code> esté publicada en Firebase Console: <code>match /responsables/{docId} { allow read: if signedIn(); allow create, update, delete: if isAdmin(); }</code>.</li>' +
    '<li>Que tu usuario tenga rol <strong>admin</strong> en la colección <code>roles</code>.</li>' +
    '</ol>' +
    '</div>'
    : '';

  const failRowsHtml = res.failures.slice(0, 50).map(f =>
    '<tr>' +
    '<td><span class="badge st-inicio">Fila ' + f.rowNum + '</span></td>' +
    '<td>' + esc(f.nombre) + '</td>' +
    '<td>' + esc(f.correo) + '</td>' +
    '<td><code style="font-size:11px">' + esc(f.code) + '</code></td>' +
    '<td style="color:var(--danger);font-size:12px">' + esc(f.message) + '</td>' +
    '</tr>'
  ).join('');

  return '' +
    '<div class="panel" style="border-left:4px solid ' + (isAllSuccess ? 'var(--primary)' : isPartial ? 'var(--accent)' : 'var(--danger)') + ';margin-top:12px;margin-bottom:14px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
    '<h4 style="margin:0;font-size:14.5px">' +
    (isAllSuccess ? '✓ Importación de especialistas completada con éxito' : isPartial ? '⚠ Importación parcial con errores' : '✕ Error al importar especialistas') +
    '</h4>' +
    '<button class="btn secondary small" id="resp_import_clear_results" type="button">✕ Cerrar reporte</button>' +
    '</div>' +
    '<p style="font-size:13px;margin:8px 0">' +
    '<strong>Total de registros procesados:</strong> ' + res.total + ' · ' +
    '<span style="color:var(--primary);font-weight:600">✓ Exitosos: ' + res.success + '</span> · ' +
    '<span style="color:' + (res.failures.length ? 'var(--danger)' : 'var(--ink-soft)') + ';font-weight:600">✕ Fallidos: ' + res.failures.length + '</span>' +
    '</p>' +
    permAdviceHtml +
    (res.failures.length
      ? '<div style="margin-top:10px">' +
      '<div style="font-weight:600;font-size:13px;margin-bottom:6px">Detalle de filas que no se pudieron guardar (' + res.failures.length + '):</div>' +
      '<div class="tblWrap" style="max-height:240px;overflow-y:auto"><table><thead><tr><th>Fila Excel</th><th>Nombres y apellidos</th><th>Correo</th><th>Código Firestore</th><th>Detalle del error</th></tr></thead><tbody>' + failRowsHtml + '</tbody></table></div>' +
      (res.failures.length > 50 ? '<p class="helpText" style="margin-top:4px">Mostrando las primeras 50 fallas de ' + res.failures.length + '.</p>' : '') +
      '</div>'
      : '') +
    '</div>';
}

function renderResponsablesImportPreview(preview) {
  const errHtml = preview.errors.length
    ? '<p class="helpText" style="color:var(--danger)">' + preview.errors.slice(0, 10).join('<br>') + (preview.errors.length > 10 ? '<br>… y ' + (preview.errors.length - 10) + ' más.' : '') + '</p>'
    : '';
  if (!preview.rows.length) return errHtml + '<p class="helpText">No hay filas válidas para importar.</p>';
  const rowsHtml = preview.rows.slice(0, 50).map(r =>
    '<tr>' +
    '<td>' + esc(r.red) + '</td>' +
    '<td>' + esc(r.distrito) + '</td>' +
    '<td>' + esc(r.especialista) + '</td>' +
    '<td>' + esc(r.nombresApellidos) + '</td>' +
    '<td>' + esc(r.cargo) + '</td>' +
    '<td>' + modalidadBadge(r.modalidad) + '</td>' +
    '<td>' + esc(r.celular) + '</td>' +
    '<td>' + esc(r.correo) + '</td>' +
    '</tr>'
  ).join('');

  return '' +
    '<p class="helpText"><strong>' + preview.rows.length + '</strong> especialista(s) listo(s) para importar' + (preview.errors.length ? ', ' + preview.errors.length + ' fila(s) con advertencia' : '') + '.</p>' +
    errHtml +
    '<div class="tblWrap"><table><thead><tr><th>RED</th><th>Distrito(s)</th><th>Especialista</th><th>Nombres y apellidos</th><th>Cargo</th><th>Modalidad</th><th>Celular</th><th>Correo</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
    (preview.rows.length > 50 ? '<p class="helpText">Mostrando las primeras 50 filas de ' + preview.rows.length + '.</p>' : '');
}

async function commitResponsablesImport(state, dbNs, container, isAdmin, currentUser) {
  if (!respImportPreview || !respImportPreview.rows.length) return;
  const rows = respImportPreview.rows;
  const now = Date.now();

  if (!currentUser) {
    showToast('Sesión no encontrada. Inicia sesión como Administrador.');
    return;
  }

  respImportResults = {
    total: rows.length,
    success: 0,
    failures: [],
    mainErrorCode: null,
  };

  const confirmBtn = document.getElementById('resp_import_confirm');
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Iniciando importación (' + rows.length + ')...';
  }

  const CHUNK_SIZE = 30;

  try {
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const currentCount = Math.min(i + chunk.length, rows.length);
      if (confirmBtn) confirmBtn.textContent = 'Importando ' + currentCount + ' de ' + rows.length + '...';

      await Promise.all(chunk.map(async (r, cIdx) => {
        const globalIdx = i + cIdx;
        const rowNum = r._rowNum || (globalIdx + 2);
        try {
          const id = docIdForResponsable(r.correo, r.nombresApellidos);
          const existing = (state.responsables || []).find(c => c.id === id);
          const docData = sanitizeResponsableRecord(r, existing, now);
          await dbNs.collection('responsables').doc(id).set(docData);
          respImportResults.success++;
        } catch (err) {
          console.error(`[Fila ${rowNum}] Error Firestore (responsables) al guardar "${r.nombresApellidos}":`, err);
          if (!respImportResults.mainErrorCode && err.code) {
            respImportResults.mainErrorCode = err.code;
          }
          respImportResults.failures.push({
            rowNum: rowNum,
            nombre: r.nombresApellidos || '—',
            correo: r.correo || '—',
            code: err.code || 'error',
            message: err.message || String(err),
          });
        }
      }));
    }

    if (respImportResults.failures.length === 0) {
      showToast('✓ Padrón de especialistas importado: ' + respImportResults.success + ' registrados.');
      respImportPreview = null;
      respShowImport = false;
    } else if (respImportResults.success > 0) {
      showToast('⚠ Importación parcial: ' + respImportResults.success + ' guardados, ' + respImportResults.failures.length + ' con error.');
    } else {
      const sampleErr = respImportResults.failures[0] || {};
      showToast('✕ Error en importación [' + (sampleErr.code || 'error') + ']: ' + (sampleErr.message || 'Operación denegada'));
    }
  } catch (fatalErr) {
    console.error('Error fatal durante la importación de responsables:', fatalErr);
    showToast('✕ Error crítico: [' + (fatalErr.code || 'error') + '] ' + fatalErr.message);
  }

  renderResponsablesTab(container, state, dbNs, isAdmin, currentUser);
}
