/* =========================================================================
   directorio/view.js — Interfaz de usuario de la pestaña Directorio
   UGEL 03 – Panel de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import { esc, showToast, genId, fmtDate, normalizeReiNumber } from '../ui/core-utils.js';
import {
  normalizeStr,
  cleanTextCode,
  cleanEmail,
  isPlaceholderDirectivo,
  isDirectivoIncompleto,
  getDirectivosForColegio,
  nowIso
} from './helpers.js';
import { cleanExistingPlaceholderDirectivos, migrateColegiosToDirectivos } from './sync.js';
import { generateDirectorioExcelFile } from './excel.js';

/* =========================================================================
   FILTROS Y ESTADO DE LA PESTAÑA DIRECTORIO
   ========================================================================= */

let dirFilters = {
  q: '',
  rei: '',
  distrito: '',
  modalidad: '',
  nivelServicio: '',
  tipoGestion: '',
  estadoDirectivo: 'todos' // 'todos' | 'con_director' | 'sin_director' | 'con_subdirector' | 'incompletos' | 'con_aviso'
};

/* =========================================================================
   RENDERIZADO DE LA PESTAÑA "DIRECTORIO"
   ========================================================================= */

export function renderDirectorioTab(container, state, dbNs, isAdmin, currentUser, navigate) {
  if (!container || !state) return;

  // Ejecutar limpieza única en segundo plano de textos de relleno espurios
  cleanExistingPlaceholderDirectivos(dbNs, state, currentUser);

  const colegios = state.colegios || [];
  const standardReis = Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));
  const reiSet = new Set(standardReis);
  colegios.forEach(c => {
    const r = normalizeReiNumber(c.rei || c.red);
    if (r) reiSet.add(r);
  });
  const reiList = Array.from(reiSet).sort((a, b) => Number(a) - Number(b));
  const distritoList = Array.from(new Set(colegios.map(c => c.distrito).filter(Boolean))).sort();
  const modalidadList = Array.from(new Set(colegios.map(c => c.modalidad).filter(Boolean))).sort();
  const nivelList = Array.from(new Set(colegios.map(c => c.nivelServicio).filter(Boolean))).sort();
  const gestionList = Array.from(new Set(colegios.map(c => c.tipoGestion).filter(Boolean))).sort();

  // Mapear directivos a cada IE
  const ieDataList = colegios.map(c => {
    const directivosIE = getDirectivosForColegio(state, c.id, c.codigoLocal, c.codigoModular);
    let directorActivo = directivosIE.find(d => d.cargo === 'Director' && d.estado === 'activo') || null;
    const subdirectoresActivos = directivosIE.filter(d => d.cargo === 'Subdirector' && d.estado === 'activo');
    const directivosHistoricos = directivosIE.filter(d => d.estado === 'anterior');

    // Sincronización inteligente con el padrón si el director no está en state.directivos o tiene datos más completos
    if (!directorActivo && c.director && c.director.nombre && !isPlaceholderDirectivo(c.director.nombre)) {
      directorActivo = {
        colegioId: c.id,
        codigoLocal: c.codigoLocal,
        cargo: 'Director',
        apellidosNombres: c.director.nombre,
        dni: c.director.dni,
        telefono: c.director.telefono,
        correo: c.director.correo,
        condicion: 'D',
        estado: 'activo',
        fuente: { tipo: 'colegios', fichaNombre: 'Padrón Oficial de Colegios' }
      };
    } else if (directorActivo && c.director) {
      if (!directorActivo.dni && c.director.dni) directorActivo.dni = c.director.dni;
      if (!directorActivo.telefono && c.director.telefono) directorActivo.telefono = c.director.telefono;
      if (!directorActivo.correo && c.director.correo) directorActivo.correo = c.director.correo;
    }

    const dirIncompleto = directorActivo ? isDirectivoIncompleto(directorActivo) : true;
    const tieneIncompleto = dirIncompleto;
    const tieneAviso = subdirectoresActivos.some(sd => !!sd.avisoRevision);

    return {
      colegio: c,
      director: directorActivo,
      subdirectores: subdirectoresActivos,
      historicos: directivosHistoricos,
      tieneIncompleto,
      tieneAviso
    };
  });

  // KPIs
  const totalIE = ieDataList.length;
  const conDirector = ieDataList.filter(x => !!x.director).length;
  const conSubdirector = ieDataList.filter(x => x.subdirectores.length > 0).length;
  const conIncompletos = ieDataList.filter(x => x.tieneIncompleto).length;
  const conAvisosRevision = ieDataList.filter(x => x.tieneAviso).length;

  function buildDirectorioRowsHtml(filtered) {
    return filtered.map(item => {
      const c = item.colegio;
      const dir = item.director;
      const subs = item.subdirectores;

      // Formatear director
      let dirHtml = '<span class="badge st-none">Sin registrar</span>';
      let dirDni = '—';
      let dirTel = '—';
      let dirCorreo = '—';

      if (dir) {
        const fuenteText = dir.fuente?.fichaNombre 
          ? `${esc(dir.fuente.fichaNombre)}${dir.fuente.fechaVisita ? ' · ' + fmtDate(dir.fuente.fechaVisita) : ''}`
          : (dir.fuente?.tipo === 'colegios' ? 'Padrón Colegios' : 'Actualización');

        dirHtml = `
          <div style="font-weight:600;color:var(--ink)">${esc(dir.apellidosNombres)}</div>
          <div style="font-size:10.5px;color:var(--ink-soft);margin-top:2px">
            ${esc(fuenteText)}
            ${dir.condicion ? ` · <span style="font-weight:700">(${esc(dir.condicion)})</span>` : ''}
          </div>
        `;
        const rawDni = dir.dni ? String(dir.dni).trim() : '';
        const dniFormat = (rawDni && /^\d{7}$/.test(rawDni)) ? rawDni.padStart(8, '0') : rawDni;
        dirDni = dniFormat ? `<code style="font-size:11.5px">${esc(dniFormat)}</code>` : '<span style="color:var(--danger)">Sin DNI</span>';
        dirTel = dir.telefono ? esc(dir.telefono) : '<span style="color:var(--ink-soft)">—</span>';
        dirCorreo = dir.correo ? `<a href="mailto:${esc(dir.correo)}" style="color:var(--primary);text-decoration:none">${esc(dir.correo)}</a>` : '<span style="color:var(--ink-soft)">—</span>';
      }

      // Formatear subdirectores apilados en la misma celda
      let subsHtml = '<span class="badge st-none">Sin subdirector</span>';
      let subDnis = '—';
      let subTels = '—';
      let subCorreos = '—';

      if (subs.length > 0) {
        subsHtml = subs.map(s => {
          const fuenteText = s.fuente?.fichaNombre
            ? `${esc(s.fuente.fichaNombre)}${s.fuente.fechaVisita ? ' · ' + fmtDate(s.fuente.fechaVisita) : ''}`
            : 'Padrón / Registro';
          const avisoBadge = s.avisoRevision
            ? `<span class="badge st-inicio" style="font-size:10px;margin-left:4px" title="${esc(s.avisoRevision)}">⚠ ${esc(s.avisoRevision)}</span>`
            : '';

          return `
            <div class="directorioSubdirItem" style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px">
              <div style="font-weight:600;color:var(--ink)">${esc(s.apellidosNombres)} ${avisoBadge}</div>
              <div style="font-size:10.5px;color:var(--ink-soft)">${esc(fuenteText)}${s.condicion ? ` · (${esc(s.condicion)})` : ''}</div>
            </div>
          `;
        }).join('');

        subDnis = subs.map(s => {
          const rawSubDni = s.dni ? String(s.dni).trim() : '';
          const sDniFmt = (rawSubDni && /^\d{7}$/.test(rawSubDni)) ? rawSubDni.padStart(8, '0') : rawSubDni;
          return sDniFmt 
            ? `<div style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px"><code style="font-size:11.5px">${esc(sDniFmt)}</code></div>` 
            : '<div style="padding:3px 0;color:var(--ink-soft)">—</div>';
        }).join('');
        subTels = subs.map(s => `<div style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px">${esc(s.telefono || '—')}</div>`).join('');
        subCorreos = subs.map(s => `<div style="padding:3px 0;border-bottom:1px dashed var(--line);margin-bottom:3px">${s.correo ? `<a href="mailto:${esc(s.correo)}" style="color:var(--primary);text-decoration:none">${esc(s.correo)}</a>` : '—'}</div>`).join('');
      }

      return `
        <tr class="clickable directRow" data-col-id="${esc(c.id)}">
          <!-- Sticky: REI -->
          <td class="stickyCol stickyCol1" style="font-weight:700;text-align:center;width:70px;min-width:70px;max-width:70px">${esc(normalizeReiNumber(c.rei || c.red) || c.rei || '—')}</td>
          <!-- Sticky: Código local -->
          <td class="stickyCol stickyCol2" style="width:100px;min-width:100px;max-width:100px"><code style="font-size:11.5px">${esc(c.codigoLocal || '—')}</code></td>
          <!-- Sticky: I.E. -->
          <td class="stickyCol stickyCol3" style="font-weight:600;width:220px;min-width:220px">${esc(c.ie || '—')}</td>
          <!-- Datos de la IE -->
          <td>${esc(c.modalidad || '—')}</td>
          <td>${esc(c.nivelServicio || '—')}</td>
          <td>${esc(c.turnos || '—')}</td>
          <td>${esc(c.tipoGestion || '—')}</td>
          <td>${esc(c.dependencia || 'UGEL 03')}</td>
          <td>${esc(c.distrito || '—')}</td>
          <!-- Director (A) -->
          <td style="min-width:200px">${dirHtml}</td>
          <td style="white-space:nowrap">${dirDni}</td>
          <td style="white-space:nowrap">${dirTel}</td>
          <td>${dirCorreo}</td>
          <!-- Subdirector (A) -->
          <td style="min-width:200px">${subsHtml}</td>
          <td style="white-space:nowrap">${subDnis}</td>
          <td style="white-space:nowrap">${subTels}</td>
          <td>${subCorreos}</td>
        </tr>
      `;
    }).join('') || `<tr><td colspan="17" style="text-align:center;padding:30px;color:var(--ink-soft)">Ninguna institución coincide con los filtros aplicados.</td></tr>`;
  }

  const getFilteredDirectorioItems = () => {
    let list = ieDataList.filter(item => {
      const c = item.colegio;
      const dir = item.director;
      const subs = item.subdirectores;

      if (dirFilters.rei) {
        const targetRei = normalizeReiNumber(dirFilters.rei);
        if (normalizeReiNumber(c.rei || c.red) !== targetRei) return false;
      }
      if (dirFilters.distrito && !normalizeStr(c.distrito).includes(normalizeStr(dirFilters.distrito))) return false;
      if (dirFilters.modalidad && c.modalidad !== dirFilters.modalidad) return false;
      if (dirFilters.nivelServicio && c.nivelServicio !== dirFilters.nivelServicio) return false;
      if (dirFilters.tipoGestion && c.tipoGestion !== dirFilters.tipoGestion) return false;

      // Filtro por estado
      if (dirFilters.estadoDirectivo === 'con_director' && !dir) return false;
      if (dirFilters.estadoDirectivo === 'sin_director' && dir) return false;
      if (dirFilters.estadoDirectivo === 'con_subdirector' && subs.length === 0) return false;
      if (dirFilters.estadoDirectivo === 'incompletos' && !item.tieneIncompleto) return false;
      if (dirFilters.estadoDirectivo === 'con_aviso' && !item.tieneAviso) return false;

      // Buscador general (IE, código, nombres o DNI de director y subdirectores)
      if (dirFilters.q) {
        const q = normalizeStr(dirFilters.q);
        const ieMatch = normalizeStr(c.ie).includes(q) || cleanTextCode(c.codigoLocal).includes(q);
        const dirMatch = dir && (normalizeStr(dir.apellidosNombres).includes(q) || cleanTextCode(dir.dni).includes(q));
        const subMatch = subs.some(s => normalizeStr(s.apellidosNombres).includes(q) || cleanTextCode(s.dni).includes(q));
        if (!ieMatch && !dirMatch && !subMatch) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      const rA = normalizeReiNumber(a.colegio.rei || a.colegio.red) || '99';
      const rB = normalizeReiNumber(b.colegio.rei || b.colegio.red) || '99';
      const cmpRei = Number(rA) - Number(rB);
      if (cmpRei !== 0) return cmpRei;
      return (a.colegio.ie || '').localeCompare(b.colegio.ie || '');
    });

    return list;
  };

  let filtered = getFilteredDirectorioItems();
  const rowsHtml = buildDirectorioRowsHtml(filtered);

  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const selStart = (activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
  const selEnd = (activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  // HTML completo de la pestaña
  container.innerHTML = `
    <div class="pageHead">
      <h2>Directorio de directivos por IE</h2>
      <p>Directores y subdirectores de las instituciones educativas de la UGEL 03, actualizados con cada ficha registrada.</p>
    </div>

    <!-- Tarjetas de Indicadores KPI -->
    <div class="cards" style="grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));margin-bottom:20px">
      <div class="card">
        <div class="num">${totalIE}</div>
        <div class="lbl">Total de Instituciones</div>
      </div>
      <div class="card">
        <div class="num" style="color:var(--ok)">${conDirector}</div>
        <div class="lbl">IE con director registrado</div>
      </div>
      <div class="card">
        <div class="num" style="color:var(--primary)">${conSubdirector}</div>
        <div class="lbl">IE con al menos un subdirector</div>
      </div>
      <div class="card">
        <div class="num" style="color:${conIncompletos > 0 ? 'var(--warn)' : 'var(--ink)'}">${conIncompletos}</div>
        <div class="lbl">IE con datos incompletos</div>
      </div>
    </div>

    <!-- Panel de Filtros y Acciones -->
    <div class="panel" style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:14px">
        <h3 style="margin:0;font-size:16px">Filtros y opciones de descarga</h3>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button type="button" class="btn small" id="btnDescargarExcelDirectorio" style="background:#107c41;color:#fff;border-color:#107c41" title="Descargar en formato oficial Excel (.xlsx)">
            <span style="font-size:14px">📊</span> Descargar Excel oficial
          </button>
          ${isAdmin ? `
            <button type="button" class="btn secondary small" id="btnImportarExcelDirectorio" title="Cargar o actualizar directorio desde archivo Excel">
              📥 Importar desde Excel
            </button>
            <button type="button" class="btn secondary small" id="btnSincronizarPadronDirectorio" title="Sincronizar directivos faltantes desde el padrón de Colegios">
              🔄 Sincronizar padrón
            </button>
          ` : ''}
        </div>
      </div>

      <div class="filterBar" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:10px">
        <div class="field" style="grid-column:span 2">
          <label for="dir_fil_q">Buscar I.E., código, directivo o DNI</label>
          <input type="search" id="dir_fil_q" placeholder="Ej: Melitón Carvajal, 310050, 09106634..." value="${esc(dirFilters.q)}">
        </div>
        <div class="field">
          <label for="dir_fil_rei">REI / Red</label>
          <select id="dir_fil_rei">
            <option value="">Todas</option>
            ${reiList.map(r => {
              const isSel = (r === dirFilters.rei) || (normalizeReiNumber(dirFilters.rei) === r);
              return `<option value="${esc(r)}" ${isSel ? 'selected' : ''}>${esc(r)}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_distrito">Distrito</label>
          <input type="search" id="dir_fil_distrito" list="dl_dir_distrito" placeholder="Todos..." value="${esc(dirFilters.distrito)}">
          <datalist id="dl_dir_distrito">
            ${distritoList.map(d => `<option value="${esc(d)}">`).join('')}
          </datalist>
        </div>
        <div class="field">
          <label for="dir_fil_modalidad">Modalidad</label>
          <select id="dir_fil_modalidad">
            <option value="">Todas</option>
            ${modalidadList.map(m => `<option value="${esc(m)}" ${dirFilters.modalidad === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_nivel">Nivel / Servicio</label>
          <select id="dir_fil_nivel">
            <option value="">Todos</option>
            ${nivelList.map(n => `<option value="${esc(n)}" ${dirFilters.nivelServicio === n ? 'selected' : ''}>${esc(n)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_gestion">Tipo de gestión</label>
          <select id="dir_fil_gestion">
            <option value="">Todas</option>
            ${gestionList.map(g => `<option value="${esc(g)}" ${dirFilters.tipoGestion === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="dir_fil_estado">Estado directivos</label>
          <select id="dir_fil_estado">
            <option value="todos" ${dirFilters.estadoDirectivo === 'todos' ? 'selected' : ''}>Todos</option>
            <option value="con_director" ${dirFilters.estadoDirectivo === 'con_director' ? 'selected' : ''}>Con director</option>
            <option value="sin_director" ${dirFilters.estadoDirectivo === 'sin_director' ? 'selected' : ''}>Sin director</option>
            <option value="con_subdirector" ${dirFilters.estadoDirectivo === 'con_subdirector' ? 'selected' : ''}>Con subdirector(es)</option>
            <option value="incompletos" ${dirFilters.estadoDirectivo === 'incompletos' ? 'selected' : ''}>Datos incompletos (${conIncompletos})</option>
            <option value="con_aviso" ${dirFilters.estadoDirectivo === 'con_aviso' ? 'selected' : ''}>Con aviso de revisión (${conAvisosRevision})</option>
          </select>
        </div>
        <div style="display:flex;align-items:flex-end">
          <button type="button" class="btn secondary small" id="btnLimpiarFiltrosDirectorio" style="width:100%">Limpiar filtros</button>
        </div>
      </div>
    </div>

    <!-- Tabla con Encabezado de Dos Niveles Oficial -->
    <div class="panel" style="padding:0;overflow:hidden">
      <div class="tblWrap directorioTableWrap" style="max-height:75vh;overflow:auto">
        <table class="table directorioTable" style="margin:0;width:100%;border-collapse:separate;border-spacing:0">
          <thead>
            <!-- NIVEL 1: Grupos temáticos coloreados como plantilla oficial Excel -->
            <tr class="directorioHeaderNivel1">
              <th colspan="9" style="background:#BDD7EE;color:#12294D;text-align:center;font-weight:800;border:1px solid #9dc3e6;padding:10px;font-size:13px">
                DATOS DE LA I.E.
              </th>
              <th colspan="4" style="background:#C6E0B4;color:#1e4620;text-align:center;font-weight:800;border:1px solid #a9d08e;padding:10px;font-size:13px">
                DIRECTOR (A)
              </th>
              <th colspan="4" style="background:#FCE4D6;color:#5a2e16;text-align:center;font-weight:800;border:1px solid #f8cbad;padding:10px;font-size:13px">
                SUB - DIRECTOR (A)
              </th>
            </tr>
            <!-- NIVEL 2: Encabezados de columna exactos -->
            <tr class="directorioHeaderNivel2">
              <!-- Sticky Columns -->
              <th class="stickyCol stickyCol1" style="background:#d4e5f7;color:#12294D;width:70px;min-width:70px;max-width:70px;text-align:center;font-weight:700;border:1px solid #b6d4f2">REI</th>
              <th class="stickyCol stickyCol2" style="background:#d4e5f7;color:#12294D;width:100px;min-width:100px;max-width:100px;font-weight:700;border:1px solid #b6d4f2">Código local</th>
              <th class="stickyCol stickyCol3" style="background:#d4e5f7;color:#12294D;width:220px;min-width:220px;font-weight:700;border:1px solid #b6d4f2">I.E.</th>
              <!-- Datos IE -->
              <th style="background:#e3edf7;color:#12294D;width:95px;font-weight:700;border:1px solid #c7ddf2">Modalidad</th>
              <th style="background:#e3edf7;color:#12294D;width:120px;font-weight:700;border:1px solid #c7ddf2">Nivel / servicio</th>
              <th style="background:#e3edf7;color:#12294D;width:95px;font-weight:700;border:1px solid #c7ddf2">Turnos</th>
              <th style="background:#e3edf7;color:#12294D;width:130px;font-weight:700;border:1px solid #c7ddf2">Tipo de Gestión</th>
              <th style="background:#e3edf7;color:#12294D;width:110px;font-weight:700;border:1px solid #c7ddf2">Dependencia</th>
              <th style="background:#e3edf7;color:#12294D;width:110px;font-weight:700;border:1px solid #c7ddf2">Distrito</th>
              <!-- Director -->
              <th style="background:#d9ecd0;color:#1e4620;min-width:200px;font-weight:700;border:1px solid #bedbb2">Apellidos y nombres</th>
              <th style="background:#d9ecd0;color:#1e4620;width:95px;font-weight:700;border:1px solid #bedbb2">DNI</th>
              <th style="background:#d9ecd0;color:#1e4620;width:110px;font-weight:700;border:1px solid #bedbb2">Teléfono</th>
              <th style="background:#d9ecd0;color:#1e4620;width:180px;font-weight:700;border:1px solid #bedbb2">Correo</th>
              <!-- Subdirector -->
              <th style="background:#fbeee4;color:#5a2e16;min-width:200px;font-weight:700;border:1px solid #f2d4c0">Apellidos y nombres</th>
              <th style="background:#fbeee4;color:#5a2e16;width:95px;font-weight:700;border:1px solid #f2d4c0">DNI</th>
              <th style="background:#fbeee4;color:#5a2e16;width:110px;font-weight:700;border:1px solid #f2d4c0">Teléfono</th>
              <th style="background:#fbeee4;color:#5a2e16;width:180px;font-weight:700;border:1px solid #f2d4c0">Correo</th>
            </tr>
          </thead>
          <tbody id="directorioTableBody">
            ${rowsHtml}
          </tbody>
        </table>
      </div>
      <div style="padding:10px 16px;background:var(--surface-2);border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink-soft)">
        <span id="directorioCountLabel">Mostrando <strong>${filtered.length}</strong> de ${totalIE} instituciones educativas</span>
        <span>Haz clic en cualquier institución para ver o gestionar directivos e historial de cambios</span>
      </div>
    </div>

    <!-- Contenedor Modal de Detalle / Edición / Importación -->
    <div id="directorioModalHost"></div>
  `;

  // Restaurar foco y posición de scroll
  window.scrollTo(scrollX, scrollY);
  if (activeId) {
    const newEl = container.querySelector('#' + activeId);
    if (newEl) {
      newEl.focus();
      if (selStart !== null && selEnd !== null) {
        try { newEl.setSelectionRange(selStart, selEnd); } catch (_) {}
      }
    }
  }

  // -------------------------------------------------------------
  // ACTUALIZACIÓN REACTIVA DE LA TABLA
  // -------------------------------------------------------------
  const updateTableOnly = () => {
    const tbody = container.querySelector('#directorioTableBody');
    if (!tbody) {
      renderDirectorioTab(container, state, dbNs, isAdmin, currentUser, navigate);
      return;
    }
    filtered = getFilteredDirectorioItems();
    tbody.innerHTML = buildDirectorioRowsHtml(filtered);
    const countLabel = container.querySelector('#directorioCountLabel');
    if (countLabel) {
      countLabel.innerHTML = `Mostrando <strong>${filtered.length}</strong> de ${totalIE} instituciones educativas`;
    }
    bindDirectorioRowEvents();
  };

  const bindDirectorioRowEvents = () => {
    container.querySelectorAll('.directRow').forEach(tr => {
      tr.addEventListener('click', () => {
        const colId = tr.dataset.colId;
        const targetCol = (state.colegios || []).find(c => c.id === colId);
        if (targetCol) {
          openDirectorioDetailModal(targetCol, state, dbNs, isAdmin, currentUser, () => updateTableOnly());
        }
      });
    });
  };

  bindDirectorioRowEvents();

  // -------------------------------------------------------------
  // EVENT LISTENERS DE LA PESTAÑA
  // -------------------------------------------------------------
  const inpQ = container.querySelector('#dir_fil_q');
  if (inpQ) inpQ.addEventListener('input', e => { dirFilters.q = e.target.value; updateTableOnly(); });

  const selRei = container.querySelector('#dir_fil_rei');
  if (selRei) selRei.addEventListener('change', e => { dirFilters.rei = normalizeReiNumber(e.target.value) || e.target.value; updateTableOnly(); });

  const inpDist = container.querySelector('#dir_fil_distrito');
  if (inpDist) inpDist.addEventListener('input', e => { dirFilters.distrito = e.target.value; updateTableOnly(); });

  const selMod = container.querySelector('#dir_fil_modalidad');
  if (selMod) selMod.addEventListener('change', e => { dirFilters.modalidad = e.target.value; updateTableOnly(); });

  const selNiv = container.querySelector('#dir_fil_nivel');
  if (selNiv) selNiv.addEventListener('change', e => { dirFilters.nivelServicio = e.target.value; updateTableOnly(); });

  const selGes = container.querySelector('#dir_fil_gestion');
  if (selGes) selGes.addEventListener('change', e => { dirFilters.tipoGestion = e.target.value; updateTableOnly(); });

  const selEst = container.querySelector('#dir_fil_estado');
  if (selEst) selEst.addEventListener('change', e => { dirFilters.estadoDirectivo = e.target.value; updateTableOnly(); });

  const btnClear = container.querySelector('#btnLimpiarFiltrosDirectorio');
  if (btnClear) btnClear.addEventListener('click', () => {
    dirFilters = { q: '', rei: '', distrito: '', modalidad: '', nivelServicio: '', tipoGestion: '', estadoDirectivo: 'todos' };
    if (inpQ) inpQ.value = '';
    if (selRei) selRei.value = '';
    if (inpDist) inpDist.value = '';
    if (selMod) selMod.value = '';
    if (selNiv) selNiv.value = '';
    if (selGes) selGes.value = '';
    if (selEst) selEst.value = 'todos';
    updateTableOnly();
  });

  // Botón Descargar Excel
  const btnExport = container.querySelector('#btnDescargarExcelDirectorio');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      openExcelExportConfigModal(state, filtered, currentUser);
    });
  }

  // Botón Importar Excel (Admin)
  const btnImport = container.querySelector('#btnImportarExcelDirectorio');
  if (btnImport) {
    btnImport.addEventListener('click', () => {
      openDirectorioImportModal(state, dbNs, currentUser, () => renderDirectorioTab(container, state, dbNs, isAdmin, currentUser, navigate));
    });
  }

  // Botón Sincronizar Padrón (Admin)
  const btnSync = container.querySelector('#btnSincronizarPadronDirectorio');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      btnSync.disabled = true;
      btnSync.innerHTML = '⏳ Sincronizando...';
      try {
        const res = await migrateColegiosToDirectivos(dbNs, state, currentUser);
        showToast(`Sincronización completada: ${res.migrated} directivos registrados desde padrón.`);
        renderDirectorioTab(container, state, dbNs, isAdmin, currentUser, navigate);
      } catch (err) {
        showToast('Error al sincronizar: ' + err.message);
      } finally {
        btnSync.disabled = false;
        btnSync.innerHTML = '🔄 Sincronizar padrón';
      }
    });
  }
}

/* =========================================================================
   MODAL DE DETALLE Y GESTIÓN DE DIRECTIVOS (CON HISTORIAL)
   ========================================================================= */

function openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh) {
  const host = document.getElementById('directorioModalHost');
  if (!host) return;

  const directivos = getDirectivosForColegio(state, colegio.id, colegio.codigoLocal, colegio.codigoModular);
  const directorActivo = directivos.find(d => d.cargo === 'Director' && d.estado === 'activo');
  const subdirectoresActivos = directivos.filter(d => d.cargo === 'Subdirector' && d.estado === 'activo');
  const anteriores = directivos.filter(d => d.estado === 'anterior');

  // Historial global de la IE ordenado por fecha descendente
  const timeline = [];
  directivos.forEach(d => {
    (d.historial || []).forEach(h => {
      timeline.push({
        directivoId: d.id,
        nombre: d.apellidosNombres,
        cargo: d.cargo,
        ...h
      });
    });
  });
  timeline.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));

  const directorHtml = directorActivo ? `
    <div class="panel" style="background:var(--surface-2);border-left:4px solid var(--ok);margin-bottom:12px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <span class="badge st-logrado" style="font-weight:700">Director(a) Activo(a)</span>
          <h4 style="margin:6px 0 3px;font-size:15px">${esc(directorActivo.apellidosNombres)}</h4>
          <div style="font-size:12.5px;color:var(--ink-soft);line-height:1.5">
            <strong>DNI:</strong> ${directorActivo.dni ? esc(isAdmin ? directorActivo.dni : '***' + directorActivo.dni.slice(-3)) : '<span style="color:var(--danger)">Sin DNI</span>'} ·
            <strong>Teléfono:</strong> ${directorActivo.telefono ? esc(isAdmin ? directorActivo.telefono : '***' + directorActivo.telefono.slice(-3)) : '—'} ·
            <strong>Correo:</strong> ${directorActivo.correo ? esc(directorActivo.correo) : '—'} ·
            <strong>Condición:</strong> ${directorActivo.condicion || '—'}
          </div>
          <div style="font-size:11px;color:var(--ink-soft);margin-top:4px">
            Última fuente: <em>${esc(directorActivo.fuente?.fichaNombre || 'Registro')}</em> (${fmtDate(directorActivo.fuente?.fechaVisita || directorActivo.actualizadoEn)})
          </div>
        </div>
        ${isAdmin ? `
          <div style="display:flex;gap:6px">
            <button type="button" class="btn secondary small btnEditDirectivo" data-dir-id="${directorActivo.id}">✎ Editar</button>
            <button type="button" class="btn secondary small btnArchivarDirectivo" data-dir-id="${directorActivo.id}" title="Marcar como directivo anterior">✕ Archivar</button>
          </div>
        ` : ''}
      </div>
    </div>
  ` : `
    <div class="panel" style="background:var(--surface-2);padding:14px;margin-bottom:12px;text-align:center">
      <span class="badge st-none">Sin Director Registrado</span>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:6px 0 0">Esta institución educativa aún no tiene director(a) consignado.</p>
      ${isAdmin ? `<button type="button" class="btn small btnAddDirectivo" data-cargo="Director" style="margin-top:8px">＋ Registrar Director(a)</button>` : ''}
    </div>
  `;

  const subdirsHtml = subdirectoresActivos.length ? subdirectoresActivos.map(sd => `
    <div class="panel" style="background:var(--surface-2);border-left:4px solid var(--accent);margin-bottom:8px;padding:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
        <div>
          <span class="badge" style="background:var(--accent-tint);color:var(--accent-dark);font-weight:700">Subdirector(a)</span>
          ${sd.avisoRevision ? `<span class="badge st-inicio" style="margin-left:4px">⚠ ${esc(sd.avisoRevision)}</span>` : ''}
          <h4 style="margin:4px 0 2px;font-size:14px">${esc(sd.apellidosNombres)}</h4>
          <div style="font-size:12px;color:var(--ink-soft)">
            <strong>DNI:</strong> ${sd.dni ? esc(isAdmin ? sd.dni : '***' + sd.dni.slice(-3)) : '<span style="color:var(--danger)">Sin DNI</span>'} ·
            <strong>Teléfono:</strong> ${sd.telefono ? esc(isAdmin ? sd.telefono : '***' + sd.telefono.slice(-3)) : '—'} ·
            <strong>Correo:</strong> ${sd.correo ? esc(sd.correo) : '—'} ·
            <strong>Condición:</strong> ${sd.condicion || '—'}
          </div>
        </div>
        ${isAdmin ? `
          <div style="display:flex;gap:6px">
            <button type="button" class="btn secondary small btnEditDirectivo" data-dir-id="${sd.id}">✎ Editar</button>
            <button type="button" class="btn secondary small btnArchivarDirectivo" data-dir-id="${sd.id}" title="Marcar como directivo anterior">✕ Archivar</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('') : `
    <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 10px">No tiene subdirectores activos registrados.</p>
  `;

  const anterioresHtml = anteriores.length ? anteriores.map(an => `
    <tr style="font-size:12px">
      <td><span class="badge st-none">${esc(an.cargo)}</span></td>
      <td><strong>${esc(an.apellidosNombres)}</strong></td>
      <td><code>${esc(an.dni ? (isAdmin ? an.dni : '***' + an.dni.slice(-3)) : '—')}</code></td>
      <td>${esc(an.telefono ? (isAdmin ? an.telefono : '***' + an.telefono.slice(-3)) : '—')}</td>
      <td>${esc(an.correo || '—')}</td>
      <td><span class="helpText" style="margin:0">${fmtDate(an.actualizadoEn)}</span></td>
    </tr>
  `).join('') : `<tr><td colspan="6" style="text-align:center;padding:12px;color:var(--ink-soft)">Sin directivos anteriores registrados.</td></tr>`;

  const timelineHtml = timeline.length ? timeline.slice(0, 15).map(item => `
    <div style="display:flex;gap:12px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:12px">
      <div style="min-width:110px;color:var(--ink-soft);font-size:11px">${fmtDate(item.fecha)}</div>
      <div style="flex:1">
        <div><strong>${esc(item.nombre)}</strong> <span class="badge" style="font-size:10px">${esc(item.cargo)}</span></div>
        <div style="color:var(--ink);margin-top:2px">
          <span style="font-weight:600">${esc(item.campo)}:</span>
          ${item.valorAnterior ? `<span style="color:var(--danger);text-decoration:line-through">${esc(item.valorAnterior)}</span> → ` : ''}
          <span style="color:var(--ok);font-weight:600">${esc(item.valorNuevo)}</span>
        </div>
        <div style="color:var(--ink-soft);font-size:10.5px">Fuente: ${esc(item.fuente || 'Manual')} · Usuario: ${esc(item.usuario || '—')}</div>
      </div>
    </div>
  `).join('') : '<p class="helpText">Sin historial de cambios registrado.</p>';

  host.innerHTML = `
    <div class="modalBackdrop" id="directorioModalBackdrop" style="display:flex;align-items:center;justify-content:center;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;padding:20px">
      <div class="modalCard" style="background:var(--surface);width:100%;max-width:850px;max-height:90vh;overflow-y:auto;border-radius:var(--radius);padding:24px;position:relative">
        <button type="button" class="modalClose" id="btnCloseDirectorioModal" style="position:absolute;top:16px;right:16px;background:none;border:none;font-size:20px;cursor:pointer">✕</button>

        <div style="margin-bottom:16px;border-bottom:1px solid var(--line);padding-bottom:12px">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="badge st-logrado" style="font-weight:700">REI ${esc(normalizeReiNumber(colegio.rei || colegio.red) || colegio.rei || '—')}</span>
            <span style="font-size:12px;color:var(--ink-soft)">Código Local: <code>${esc(colegio.codigoLocal || '—')}</code></span>
          </div>
          <h2 style="margin:6px 0 2px;font-size:20px">${esc(colegio.ie)}</h2>
          <div style="font-size:12.5px;color:var(--ink-soft)">
            ${esc(colegio.distrito || '')} · ${esc(colegio.modalidad || '')} · ${esc(colegio.nivelServicio || '')} · Turno: ${esc(colegio.turnos || '—')} · ${esc(colegio.tipoGestion || '')}
          </div>
        </div>

        <!-- Sección: Director Activo -->
        <h3 style="font-size:14.5px;margin:16px 0 8px">Director(a) Activo(a)</h3>
        ${directorHtml}

        <!-- Sección: Subdirectores Activos -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin:20px 0 8px">
          <h3 style="font-size:14.5px;margin:0">Subdirector(es) Activo(s)</h3>
          ${isAdmin ? `<button type="button" class="btn secondary small btnAddDirectivo" data-cargo="Subdirector">＋ Agregar Subdirector(a)</button>` : ''}
        </div>
        ${subdirsHtml}

        <!-- Sección: Historial de Directivos Anteriores -->
        <h3 style="font-size:14.5px;margin:24px 0 8px">Directivos Anteriores (Histórico)</h3>
        <div class="tblWrap" style="margin-bottom:16px">
          <table class="table" style="width:100%">
            <thead>
              <tr style="background:var(--surface-2)">
                <th>Cargo</th>
                <th>Apellidos y nombres</th>
                <th>DNI</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Fecha cese</th>
              </tr>
            </thead>
            <tbody>
              ${anterioresHtml}
            </tbody>
          </table>
        </div>

        <!-- Sección: Línea de Tiempo de Cambios -->
        <h3 style="font-size:14.5px;margin:24px 0 8px">Historial de Cambios y Trazabilidad</h3>
        <div class="panel" style="max-height:220px;overflow-y:auto;padding:10px 14px">
          ${timelineHtml}
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:20px">
          <button type="button" class="btn" id="btnCerrarModalBottom">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  // Cerrar modal
  const closeModal = () => { host.innerHTML = ''; };
  const btnClose = host.querySelector('#btnCloseDirectorioModal');
  const btnCloseB = host.querySelector('#btnCerrarModalBottom');
  const backdrop = host.querySelector('#directorioModalBackdrop');
  if (btnClose) btnClose.onclick = closeModal;
  if (btnCloseB) btnCloseB.onclick = closeModal;
  if (backdrop) backdrop.onclick = (e) => { if (e.target === backdrop) closeModal(); };

  // Handlers Admin: Editar Directivo
  host.querySelectorAll('.btnEditDirectivo').forEach(btn => {
    btn.onclick = () => {
      const dirId = btn.dataset.dirId;
      const targetDir = directivos.find(d => d.id === dirId);
      if (targetDir) {
        openEditDirectivoSubModal(targetDir, colegio, state, dbNs, currentUser, () => {
          openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh);
          if (onRefresh) onRefresh();
        });
      }
    };
  });

  // Handlers Admin: Archivar Directivo
  host.querySelectorAll('.btnArchivarDirectivo').forEach(btn => {
    btn.onclick = async () => {
      const dirId = btn.dataset.dirId;
      const targetDir = directivos.find(d => d.id === dirId);
      if (!targetDir) return;

      const ok = confirm(`¿Estás seguro de archivar a ${targetDir.apellidosNombres} (${targetDir.cargo}) como directivo anterior?`);
      if (!ok) return;

      try {
        const timestamp = nowIso();
        const userEmail = currentUser?.email || 'admin';
        const updates = {
          estado: 'anterior',
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            ...(targetDir.historial || []),
            {
              campo: 'estado',
              valorAnterior: 'activo',
              valorNuevo: 'anterior (Archivado manualmente por Administrador)',
              fuente: 'Edición manual',
              usuario: userEmail,
              fecha: timestamp
            }
          ]
        };
        await dbNs.collection('directivos').doc(targetDir.id).update(updates);
        Object.assign(targetDir, updates);
        showToast('Directivo archivado correctamente.');
        openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh);
        if (onRefresh) onRefresh();
      } catch (err) {
        showToast('Error al archivar: ' + err.message);
      }
    };
  });

  // Handlers Admin: Agregar Directivo
  host.querySelectorAll('.btnAddDirectivo').forEach(btn => {
    btn.onclick = () => {
      const cargo = btn.dataset.cargo || 'Director';
      openNewDirectivoSubModal(cargo, colegio, state, dbNs, currentUser, () => {
        openDirectorioDetailModal(colegio, state, dbNs, isAdmin, currentUser, onRefresh);
        if (onRefresh) onRefresh();
      });
    };
  });
}

/** Modal secundario para editar un directivo existente */
function openEditDirectivoSubModal(directivo, colegio, state, dbNs, currentUser, onSuccess) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:540px;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 4px">Editar ${esc(directivo.cargo)}</h3>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 14px">${esc(colegio.ie)} · Cód: ${esc(colegio.codigoLocal)}</p>

      <form id="formEditDirectivo">
        <div class="field" style="margin-bottom:10px">
          <label>Apellidos y nombres completos *</label>
          <input type="text" id="ed_nom" value="${esc(directivo.apellidosNombres)}" required>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div class="field">
            <label>DNI (8 dígitos) *</label>
            <input type="text" id="ed_dni" maxlength="8" pattern="[0-9]{8}" value="${esc(directivo.dni || '')}" required>
          </div>
          <div class="field">
            <label>Teléfono (9 dígitos)</label>
            <input type="text" id="ed_tel" maxlength="9" value="${esc(directivo.telefono || '')}">
          </div>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" id="ed_correo" value="${esc(directivo.correo || '')}">
          </div>
          <div class="field">
            <label>Condición</label>
            <select id="ed_cond">
              <option value="D" ${directivo.condicion === 'D' ? 'selected' : ''}>Designado (D)</option>
              <option value="E" ${directivo.condicion === 'E' ? 'selected' : ''}>Encargado (E)</option>
              <option value="Nombrado" ${directivo.condicion === 'Nombrado' ? 'selected' : ''}>Nombrado</option>
              <option value="Otro" ${directivo.condicion === 'Otro' ? 'selected' : ''}>Otro</option>
            </select>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="btn secondary small" id="btnCancelEditDir">Cancelar</button>
          <button type="submit" class="btn small" id="btnSaveEditDir">Guardar cambios</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const form = modalWrap.querySelector('#formEditDirectivo');
  const btnCancel = modalWrap.querySelector('#btnCancelEditDir');
  btnCancel.onclick = () => modalWrap.remove();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nom = normalizeStr(document.getElementById('ed_nom').value);
    const dni = cleanTextCode(document.getElementById('ed_dni').value);
    const tel = cleanTextCode(document.getElementById('ed_tel').value);
    const correo = cleanEmail(document.getElementById('ed_correo').value);
    const cond = document.getElementById('ed_cond').value;

    if (!nom || !dni) { showToast('Ingresa apellidos, nombres y DNI.'); return; }

    const timestamp = nowIso();
    const userEmail = currentUser?.email || 'admin';
    const newHist = [];

    if (nom !== directivo.apellidosNombres) newHist.push({ campo: 'apellidosNombres', valorAnterior: directivo.apellidosNombres, valorNuevo: nom, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (dni !== directivo.dni) newHist.push({ campo: 'dni', valorAnterior: directivo.dni || '', valorNuevo: dni, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (tel !== directivo.telefono) newHist.push({ campo: 'telefono', valorAnterior: directivo.telefono || '', valorNuevo: tel, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (correo !== directivo.correo) newHist.push({ campo: 'correo', valorAnterior: directivo.correo || '', valorNuevo: correo, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });
    if (cond !== directivo.condicion) newHist.push({ campo: 'condicion', valorAnterior: directivo.condicion || '', valorNuevo: cond, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp });

    const updates = {
      apellidosNombres: nom,
      dni,
      telefono: tel,
      correo,
      condicion: cond,
      actualizadoPor: userEmail,
      actualizadoEn: timestamp,
      historial: [...(directivo.historial || []), ...newHist]
    };

    try {
      await dbNs.collection('directivos').doc(directivo.id).update(updates);
      Object.assign(directivo, updates);
      showToast('Directivo actualizado con éxito.');
      modalWrap.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Error al actualizar: ' + err.message);
    }
  };
}

/** Modal secundario para registrar un nuevo directivo manualmente */
function openNewDirectivoSubModal(cargo, colegio, state, dbNs, currentUser, onSuccess) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:540px;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 4px">Registrar nuevo ${esc(cargo)}</h3>
      <p style="font-size:12.5px;color:var(--ink-soft);margin:0 0 14px">${esc(colegio.ie)} · Cód: ${esc(colegio.codigoLocal)}</p>

      <form id="formNewDirectivo">
        <div class="field" style="margin-bottom:10px">
          <label>Apellidos y nombres completos *</label>
          <input type="text" id="nw_nom" placeholder="Ej: PÉREZ LÓPEZ MARÍA" required>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
          <div class="field">
            <label>DNI (8 dígitos) *</label>
            <input type="text" id="nw_dni" maxlength="8" pattern="[0-9]{8}" placeholder="8 dígitos" required>
          </div>
          <div class="field">
            <label>Teléfono (9 dígitos)</label>
            <input type="text" id="nw_tel" maxlength="9" placeholder="9 dígitos">
          </div>
        </div>
        <div class="fieldGrid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="field">
            <label>Correo electrónico</label>
            <input type="email" id="nw_correo" placeholder="correo@ejemplo.com">
          </div>
          <div class="field">
            <label>Condición</label>
            <select id="nw_cond">
              <option value="D">Designado (D)</option>
              <option value="E">Encargado (E)</option>
              <option value="Nombrado">Nombrado</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="btn secondary small" id="btnCancelNewDir">Cancelar</button>
          <button type="submit" class="btn small" id="btnSaveNewDir">Guardar y asignar</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const form = modalWrap.querySelector('#formNewDirectivo');
  const btnCancel = modalWrap.querySelector('#btnCancelNewDir');
  btnCancel.onclick = () => modalWrap.remove();

  form.onsubmit = async (e) => {
    e.preventDefault();
    const nom = normalizeStr(document.getElementById('nw_nom').value);
    const dni = cleanTextCode(document.getElementById('nw_dni').value);
    const tel = cleanTextCode(document.getElementById('nw_tel').value);
    const correo = cleanEmail(document.getElementById('nw_correo').value);
    const cond = document.getElementById('nw_cond').value;

    if (!nom || !dni) { showToast('Ingresa apellidos, nombres y DNI.'); return; }

    const timestamp = nowIso();
    const userEmail = currentUser?.email || 'admin';

    // Si es Director y ya había uno activo, pasar el anterior a 'anterior'
    if (cargo === 'Director') {
      const activeDir = getDirectivosForColegio(state, colegio.id, colegio.codigoLocal).find(d => d.cargo === 'Director' && d.estado === 'activo');
      if (activeDir) {
        await dbNs.collection('directivos').doc(activeDir.id).update({
          estado: 'anterior',
          actualizadoPor: userEmail,
          actualizadoEn: timestamp,
          historial: [
            ...(activeDir.historial || []),
            { campo: 'estado', valorAnterior: 'activo', valorNuevo: `anterior (Reemplazado por ${nom})`, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp }
          ]
        });
        activeDir.estado = 'anterior';
      }
    }

    const newDoc = {
      colegioId: colegio.id,
      codigoLocal: cleanTextCode(colegio.codigoLocal),
      codigoModular: cleanTextCode(colegio.codigoModular),
      cargo,
      apellidosNombres: nom,
      dni,
      telefono: tel,
      correo,
      condicion: cond,
      nivelACargo: '',
      estado: 'activo',
      avisoRevision: false,
      fuente: { tipo: 'manual', fichaNombre: 'Registro manual' },
      actualizadoPor: userEmail,
      actualizadoEn: timestamp,
      historial: [
        { campo: 'registro_manual', valorAnterior: '', valorNuevo: `${nom} (${dni})`, fuente: 'Edición manual', usuario: userEmail, fecha: timestamp }
      ]
    };

    try {
      const ref = await dbNs.collection('directivos').add(newDoc);
      newDoc.id = ref.id;
      if (state.directivos) state.directivos.push(newDoc);
      showToast(`Nuevo ${cargo} registrado correctamente.`);
      modalWrap.remove();
      if (onSuccess) onSuccess();
    } catch (err) {
      showToast('Error al registrar: ' + err.message);
    }
  };
}

/* =========================================================================
   EXPORTACIÓN EN EXCEL OFICIAL CON EXCELJS (SIN PLANTILLA BASE)
   ========================================================================= */

function openExcelExportConfigModal(state, filteredList, currentUser) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:500px;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 6px;display:flex;align-items:center;gap:8px">
        <span>📊</span> Descargar Directorio en Excel
      </h3>
      <p style="font-size:13px;color:var(--ink-soft);margin:0 0 16px">
        Descarga oficial con la estructura, estilos y colores exactos de la plantilla ministerial <code>E2_Directorio_de_Directores_por_IE</code>.
      </p>

      <div class="field" style="margin-bottom:18px">
        <label style="font-weight:700">Alcance de los datos a descargar:</label>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="exp_alcance" value="filtrados" checked>
            <span>Solo los <strong>${filteredList.length}</strong> colegios actualmente filtrados</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="radio" name="exp_alcance" value="todos">
            <span>Todo el directorio completo (<strong>${(state.colegios || []).length}</strong> instituciones)</span>
          </label>
        </div>
      </div>

      <div style="background:var(--surface-2);padding:10px 12px;border-radius:4px;font-size:12px;color:var(--ink-soft);margin-bottom:16px">
        🔒 <strong>Aviso Ley N.° 29733:</strong> Esta descarga contiene datos de contacto institucional.
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn secondary small" id="btnCancelExcelExport">Cancelar</button>
        <button type="button" class="btn small" id="btnConfirmExcelExport" style="background:#107c41;color:#fff;border-color:#107c41">
          ⬇ Descargar Excel (.xlsx)
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const btnCancel = modalWrap.querySelector('#btnCancelExcelExport');
  const btnConfirm = modalWrap.querySelector('#btnConfirmExcelExport');
  btnCancel.onclick = () => modalWrap.remove();

  btnConfirm.onclick = async () => {
    const alcance = modalWrap.querySelector('input[name="exp_alcance"]:checked').value;

    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '⏳ Generando Excel...';

    try {
      const dataToExport = alcance === 'todos' ? (state.colegios || []) : filteredList.map(x => x.colegio || x);
      await generateDirectorioExcelFile(state, dataToExport, currentUser);
      modalWrap.remove();
      showToast('Directorio exportado correctamente en Excel.');
    } catch (err) {
      console.error('Error exportando Excel:', err);
      showToast('Error al exportar: ' + err.message);
      btnConfirm.disabled = false;
      btnConfirm.innerHTML = '⬇ Descargar Excel (.xlsx)';
    }
  };
}

/* =========================================================================
   IMPORTACIÓN DESDE EXCEL (ADMINISTRADOR)
   ========================================================================= */

function openDirectorioImportModal(state, dbNs, currentUser, onSuccess) {
  const modalWrap = document.createElement('div');
  modalWrap.className = 'modalBackdrop';
  modalWrap.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:10001;display:flex;align-items:center;justify-content:center;padding:20px';

  modalWrap.innerHTML = `
    <div class="modalCard" style="background:var(--surface);width:100%;max-width:700px;max-height:90vh;overflow-y:auto;border-radius:var(--radius);padding:24px">
      <h3 style="margin:0 0 6px">Importar Directorio desde Excel</h3>
      <p style="font-size:13px;color:var(--ink-soft);margin:0 0 14px">
        Sube un archivo <code>.xlsx</code> o <code>.xlsm</code> que contenga los encabezados en la fila 5 y datos a partir de la fila 6.
      </p>

      <div class="field" style="margin-bottom:14px">
        <input type="file" id="fileImportDirectorio" accept=".xlsx,.xlsm" style="font-size:13px">
      </div>

      <div id="importDirectorioPreviewWrap" style="margin-bottom:16px"></div>

      <div style="display:flex;justify-content:flex-end;gap:8px">
        <button type="button" class="btn secondary small" id="btnCancelDirImport">Cancelar</button>
        <button type="button" class="btn small" id="btnConfirmDirImport" style="display:none">✓ Confirmar e Importar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const btnCancel = modalWrap.querySelector('#btnCancelDirImport');
  const btnConfirm = modalWrap.querySelector('#btnConfirmDirImport');
  const fileInput = modalWrap.querySelector('#fileImportDirectorio');
  const previewWrap = modalWrap.querySelector('#importDirectorioPreviewWrap');

  btnCancel.onclick = () => modalWrap.remove();

  let parsedRows = [];

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    previewWrap.innerHTML = '<p class="helpText">Analizando archivo Excel...</p>';

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames.includes('I.E.') ? 'I.E.' : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      if (json.length < 6) {
        previewWrap.innerHTML = '<p style="color:var(--danger)">El archivo tiene menos de 6 filas. Asegúrate de usar la plantilla oficial.</p>';
        return;
      }

      parsedRows = [];
      for (let r = 5; r < json.length; r++) {
        const row = json[r];
        const codLocal = cleanTextCode(row[1]);
        const ie = (row[2] || '').trim();
        if (!codLocal && !ie) continue;

        parsedRows.push({
          rowNum: r + 1,
          rei: normalizeReiNumber(cleanTextCode(row[0])) || cleanTextCode(row[0]),
          codigoLocal: codLocal,
          ie: ie,
          dirNombre: isPlaceholderDirectivo(row[9]) ? '' : normalizeStr(row[9]),
          dirDni: cleanTextCode(row[10]),
          dirTel: cleanTextCode(row[11]),
          dirCorreo: cleanEmail(row[12]),
          subNombre: isPlaceholderDirectivo(row[13]) ? '' : normalizeStr(row[13]),
          subDni: cleanTextCode(row[14]),
          subTel: cleanTextCode(row[15]),
          subCorreo: cleanEmail(row[16]),
        });
      }

      previewWrap.innerHTML = `
        <div style="background:var(--surface-2);padding:10px 14px;border-radius:4px;margin-bottom:10px">
          <strong>${parsedRows.length}</strong> registros encontrados en la hoja <em>${esc(sheetName)}</em>.
        </div>
        <div class="tblWrap" style="max-height:220px;overflow-y:auto">
          <table class="table" style="font-size:12px;width:100%">
            <thead>
              <tr style="background:var(--surface-2)">
                <th>Fila</th>
                <th>Cód Local</th>
                <th>I.E.</th>
                <th>Director(a)</th>
                <th>Subdirector(a)</th>
              </tr>
            </thead>
            <tbody>
              ${parsedRows.slice(0, 30).map(p => `
                <tr>
                  <td>${p.rowNum}</td>
                  <td><code>${esc(p.codigoLocal)}</code></td>
                  <td>${esc(p.ie)}</td>
                  <td>${esc(p.dirNombre || '—')}</td>
                  <td>${esc(p.subNombre || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${parsedRows.length > 30 ? `<p class="helpText" style="margin-top:4px">Mostrando las primeras 30 filas de ${parsedRows.length}.</p>` : ''}
      `;

      btnConfirm.style.display = 'inline-block';
      btnConfirm.textContent = `✓ Confirmar e Importar (${parsedRows.length} instituciones)`;
    } catch (err) {
      previewWrap.innerHTML = `<p style="color:var(--danger)">Error leyendo el archivo: ${esc(err.message)}</p>`;
    }
  });

  btnConfirm.onclick = async () => {
    btnConfirm.disabled = true;
    btnConfirm.innerHTML = '⏳ Importando registros...';
    const timestamp = nowIso();
    const userEmail = currentUser?.email || 'admin';
    let processed = 0;

    for (const p of parsedRows) {
      const col = (state.colegios || []).find(c => cleanTextCode(c.codigoLocal) === p.codigoLocal || normalizeStr(c.ie) === normalizeStr(p.ie));
      const colId = col ? col.id : genId();

      // Guardar / actualizar director si viene en el Excel y no es placeholder
      if (p.dirNombre && !isPlaceholderDirectivo(p.dirNombre)) {
        const existingDir = getDirectivosForColegio(state, colId, p.codigoLocal).find(d => d.cargo === 'Director' && d.estado === 'activo');
        if (!existingDir) {
          const newDoc = {
            colegioId: colId,
            codigoLocal: p.codigoLocal,
            codigoModular: col ? col.codigoModular || '' : '',
            cargo: 'Director',
            apellidosNombres: p.dirNombre,
            dni: p.dirDni,
            telefono: p.dirTel,
            correo: p.dirCorreo,
            condicion: 'D',
            nivelACargo: '',
            estado: 'activo',
            avisoRevision: false,
            fuente: { tipo: 'importacion_excel', fichaNombre: 'Importación Excel Directorio' },
            actualizadoPor: userEmail,
            actualizadoEn: timestamp,
            historial: [{ campo: 'importacion_excel', valorAnterior: '', valorNuevo: `${p.dirNombre} (${p.dirDni})`, fuente: 'Importación Excel', usuario: userEmail, fecha: timestamp }]
          };
          const ref = await dbNs.collection('directivos').add(newDoc);
          newDoc.id = ref.id;
          if (state.directivos) state.directivos.push(newDoc);
        } else {
          // Actualizar campos que no estén vacíos
          const updates = {};
          if (p.dirDni && !existingDir.dni) updates.dni = p.dirDni;
          if (p.dirTel && p.dirTel !== existingDir.telefono) updates.telefono = p.dirTel;
          if (p.dirCorreo && p.dirCorreo !== existingDir.correo) updates.correo = p.dirCorreo;
          if (Object.keys(updates).length > 0) {
            updates.actualizadoPor = userEmail;
            updates.actualizadoEn = timestamp;
            await dbNs.collection('directivos').doc(existingDir.id).update(updates);
            Object.assign(existingDir, updates);
          }
        }
      }

      // Guardar / actualizar subdirector si no es placeholder
      if (p.subNombre && !isPlaceholderDirectivo(p.subNombre)) {
        const existingSub = getDirectivosForColegio(state, colId, p.codigoLocal).find(d => d.cargo === 'Subdirector' && d.estado === 'activo' && normalizeStr(d.apellidosNombres) === normalizeStr(p.subNombre));
        if (!existingSub) {
          const newSubDoc = {
            colegioId: colId,
            codigoLocal: p.codigoLocal,
            codigoModular: col ? col.codigoModular || '' : '',
            cargo: 'Subdirector',
            apellidosNombres: p.subNombre,
            dni: p.subDni,
            telefono: p.subTel,
            correo: p.subCorreo,
            condicion: 'D',
            nivelACargo: '',
            estado: 'activo',
            avisoRevision: false,
            fuente: { tipo: 'importacion_excel', fichaNombre: 'Importación Excel Directorio' },
            actualizadoPor: userEmail,
            actualizadoEn: timestamp,
            historial: [{ campo: 'importacion_excel', valorAnterior: '', valorNuevo: `${p.subNombre} (${p.subDni})`, fuente: 'Importación Excel', usuario: userEmail, fecha: timestamp }]
          };
          const ref = await dbNs.collection('directivos').add(newSubDoc);
          newSubDoc.id = ref.id;
          if (state.directivos) state.directivos.push(newSubDoc);
        }
      }
      processed++;
    }

    modalWrap.remove();
    showToast(`✓ Importación completada: ${processed} instituciones procesadas.`);
    if (onSuccess) onSuccess();
  };
}
