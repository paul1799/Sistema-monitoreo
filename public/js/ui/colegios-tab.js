/* =========================================================================
   colegios-tab.js — Padrón de instituciones educativas por REI, cobertura,
                     búsqueda, edición e importación masiva desde Excel
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import {
  esc,
  genId,
  fmtDate,
  showToast,
  normalizeText,
  normalizeReiNumber,
  downloadCsv,
  cleanForFirestore,
  bar
} from './core-utils.js?v=20261015_v1';

import { getDirectivosActivosForColegio } from '../directorio.js?v=20261015_v1';

/* ============================= COLEGIOS — HELPERS ============================= */
export function buildColegioIndex(state) {
  const byId = {}, byCode = {}, byIe = {};
  (state?.colegios || []).forEach(c => {
    byId[c.id] = c;
    if (c.codigoLocal) byCode[normalizeText(c.codigoLocal)] = c;
    if (c.ie) byIe[normalizeText(c.ie)] = c;
  });
  return { byId, byCode, byIe };
}

export function matchColegio(sub, idx) {
  if (!sub) return null;
  if (sub.colegioId && idx.byId[sub.colegioId]) return idx.byId[sub.colegioId];
  if (sub.codigoModular) { const c = idx.byCode[normalizeText(sub.codigoModular)]; if (c) return c; }
  if (sub.institucion) { const c = idx.byIe[normalizeText(sub.institucion)]; if (c) return c; }
  return null;
}

export function groupSubmissionsByColegio(state) {
  const idx = buildColegioIndex(state);
  const map = {};
  (state?.colegios || []).forEach(c => map[c.id] = []);
  (state?.submissions || []).forEach(s => { const c = matchColegio(s, idx); if (c) map[c.id].push(s); });
  return map;
}

export function colegioFichaTypeStats(subs, getFichaType, computeStatsFn = null) {
  const byType = {};
  const fn = computeStatsFn || (typeof window !== 'undefined' ? window.computeStats : null);
  (subs || []).forEach(s => {
    const ft = getFichaType(s.fichaTypeId);
    if (!byType[s.fichaTypeId]) byType[s.fichaTypeId] = { ftId: s.fichaTypeId, nombre: s.fichaTypeNombre || (ft ? ft.nombre : '—'), count: 0, sum: 0, cnt: 0, last: null };
    const b = byType[s.fichaTypeId];
    b.count++;
    if (ft && typeof fn === 'function') { const st = fn(s, ft); if (st && st.pct !== null) { b.sum += st.pct; b.cnt++; } }
    if (!b.last || s.fecha > b.last) b.last = s.fecha;
  });
  return Object.values(byType).map(b => ({ ...b, avg: b.cnt ? Math.round(b.sum / b.cnt) : null })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

export const COLEGIO_FIELD_LABELS = {
  rei: 'REI', codigoLocal: 'Código local', ie: 'Nombre I.E.', modalidad: 'Modalidad',
  nivelServicio: 'Nivel de servicio', turnos: 'Turnos', tipoGestion: 'Tipo de Gestión',
  dependencia: 'Dependencia', direccion: 'Dirección', distrito: 'Distrito',
};

/** Aliases para mapeo de columnas Excel → campos del documento */
export const INST_FIELD_ALIASES = {
  rei: ['rei', 'red', 'rei / red', 'rei/red', 'red educativa'],
  codigoLocal: ['codigo local', 'codigolocal', 'cod local', 'cod. local', 'codigo_local', 'local', 'cod_local'],
  ie: ['nombre i.e.', 'nombre ie', 'i.e', 'ie', 'institucion educativa', 'nombre', 'colegio', 'nombre de la i.e.', 'i.e.'],
  modalidad: ['modalidad'],
  nivelServicio: ['nivel_sevicio', 'nivel_servicio', 'nivel de servicio', 'nivelservicio', 'nivel', 'servicio'],
  turnos: ['turnos', 'turno'],
  tipoGestion: ['tipo de gestion', 'tipo gestion', 'tipogestion', 'gestion', 'gestión'],
  dependencia: ['dependencia'],
  direccion: ['direccion', 'dirección'],
  distrito: ['distrito'],
  'director.nombre': ['director_nombres', 'director - apellidos y nombres', 'dir_nombres', 'dir_nombre', 'director apellidos y nombres', 'director: apellidos y nombres', 'apellidos y nombres director', 'director', 'director(a)'],
  'director.dni': ['director_dni', 'director - dni', 'dir_dni', 'director: dni', 'dni director'],
  'director.telefono': ['director_telefono', 'director - telefono', 'dir_telefono', 'director - teléfono', 'director: telefono', 'telefono director', 'teléfono director', 'celular director'],
  'director.correo': ['director_correo', 'director - correo', 'dir_correo', 'director: correo', 'correo director', 'email director'],
  'subDirector.nombre': ['subdir_nombres', 'subdirector_nombres', 'sub_director - apellidos y nombres', 'subdirector - apellidos y nombres', 'subdir_nombre', 'subdirector', 'sub_director', 'sub-director'],
  'subDirector.dni': ['subdir_dni', 'subdirector_dni', 'sub_director - dni', 'subdirector - dni', 'dni subdirector'],
  'subDirector.telefono': ['subdir_telefono', 'subdirector_telefono', 'sub_director - telefono', 'subdirector - telefono', 'sub-director - telefono', 'telefono subdirector', 'teléfono subdirector'],
  'subDirector.correo': ['subdir_correo', 'subdirector_correo', 'sub_director - correo', 'subdirector - correo', 'sub-director - correo', 'correo subdirector', 'email subdirector'],
  esJec: ['jec', 'es_jec', 'es jec', 'modelo jec', 'modelojec'],
  cantCoordPedag: ['cantcoordpedag', 'cant_coord_pedag', 'coord_pedag', 'coord pedagogicos', 'n_coord_pedag'],
  cantCoordTutoria: ['cantcoordtutoria', 'cant_coord_tutoria', 'coord_tutoria', 'coord tutoria', 'n_coord_tutoria'],
};

/** Descarga una plantilla Excel lista para completar e importar */
export function downloadPlantillaExcel() {
  if (typeof XLSX === 'undefined') {
    showToast('Librería Excel no disponible. Revisa la conexión a internet.');
    return;
  }
  const headers = [
    'REI', 'Código local', 'Nombre I.E.', 'Modalidad', 'Nivel_sevicio', 'Turnos',
    'Tipo de Gestión', 'Dependencia', 'Dirección', 'Distrito',
    'Director_Nombres', 'Director_DNI', 'Director_Teléfono', 'Director_Correo',
    'SubDir_Nombres', 'SubDir_DNI', 'SubDir_Teléfono', 'SubDir_Correo',
    'Es_JEC', 'Cant_Coord_Pedag', 'Cant_Coord_Tutoria',
  ];
  const exampleRow = [
    '01', '123456', 'I.E. Ejemplo', 'EBR', 'Primaria', 'Mañana',
    'Pública - Sector Educación', 'UGEL 03', 'Jr. Ejemplo 123', 'Lima',
    'García López, Juan', '12345678', '999888777', 'director@ejemplo.pe',
    '', '', '', '',
    'No', '1', '1',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  ws['!cols'] = headers.map(() => ({ wch: 22 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Instituciones');
  XLSX.writeFile(wb, 'plantilla_instituciones.xlsx');
  showToast('Plantilla descargada.');
}

/** Prepara y sanea el registro de institución educativa para Firestore sin undefined ni NaN */
export function sanitizeColegioRecord(r, existing, now) {
  now = (typeof now === 'number' && !isNaN(now)) ? now : Date.now();
  const createdAt = (existing && typeof existing.createdAt === 'number' && !isNaN(existing.createdAt))
    ? existing.createdAt
    : now;

  const s = (v) => {
    if (v === undefined || v === null || (typeof v === 'number' && isNaN(v))) return '';
    return String(v).trim();
  };

  const dir = r.director || {};
  const director = {
    nombre: s(dir.nombre),
    dni: s(dir.dni),
    telefono: s(dir.telefono),
    correo: s(dir.correo),
  };

  let subDirector = null;
  if (r.subDirector && typeof r.subDirector === 'object') {
    const sd = {
      nombre: s(r.subDirector.nombre),
      dni: s(r.subDirector.dni),
      telefono: s(r.subDirector.telefono),
      correo: s(r.subDirector.correo),
    };
    if (sd.nombre || sd.dni || sd.telefono || sd.correo) {
      subDirector = sd;
    }
  }

  const esJec = (r.esJec !== undefined)
    ? Boolean(r.esJec === true || r.es_jec === true || String(r.esJec || '').toLowerCase() === 'si' || String(r.esJec || '').toLowerCase() === 'sí' || String(r.modelo || '').toUpperCase() === 'JEC')
    : Boolean(existing && (existing.esJec || existing.es_jec));

  const cantCoordPedag = (typeof r.cantCoordPedag === 'number' && !isNaN(r.cantCoordPedag) && r.cantCoordPedag >= 1)
    ? r.cantCoordPedag
    : (parseInt(r.cantCoordPedag, 10) || (existing && existing.cantCoordPedag) || 1);

  const cantCoordTutoria = (typeof r.cantCoordTutoria === 'number' && !isNaN(r.cantCoordTutoria) && r.cantCoordTutoria >= 1)
    ? r.cantCoordTutoria
    : (parseInt(r.cantCoordTutoria, 10) || (existing && existing.cantCoordTutoria) || 1);

  const docData = {
    rei: normalizeReiNumber(r.rei) || s(r.rei),
    codigoLocal: s(r.codigoLocal),
    ie: s(r.ie),
    modalidad: s(r.modalidad),
    nivelServicio: s(r.nivelServicio),
    turnos: s(r.turnos),
    tipoGestion: s(r.tipoGestion),
    dependencia: s(r.dependencia),
    direccion: s(r.direccion),
    distrito: s(r.distrito),
    director: director,
    subDirector: subDirector,
    esJec: esJec,
    cantCoordPedag: cantCoordPedag,
    cantCoordTutoria: cantCoordTutoria,
    updatedAt: now,
    createdAt: createdAt,
  };

  return cleanForFirestore(docData);
}

/** Genera un ID válido y seguro para Firestore a partir del código local */
export function docIdForCodigo(codigo) {
  if (codigo === undefined || codigo === null) return genId();
  let id = normalizeText(String(codigo))
    .replace(/[\/\s\\#?%*:[\]]/g, '_')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
  if (!id || id.startsWith('__')) {
    id = ('ie_' + id).replace(/^_+|_+$/g, '').slice(0, 120);
  }
  return id || genId();
}

/** Parsea un archivo .xlsx seleccionado y devuelve {rows, errors} */
export async function parseInstitucionesExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (typeof XLSX === 'undefined') { reject(new Error('SheetJS no disponible')); return; }
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        if (rawRows.length < 2) { resolve({ rows: [], errors: ['El archivo no tiene datos suficientes.'] }); return; }

        // Detectar y mapear columnas según encabezados
        const headerRow = rawRows[0].map(h => normalizeText(String(h)).replace(/\.$/, ''));
        const colMap = {};
        let dirNomMapped = false;
        let dirDniMapped = false;
        let dirTelMapped = false;
        let dirCorMapped = false;

        headerRow.forEach((h, i) => {
          if (!h) return;
          const isSub = h.includes('sub') || h.includes('sub_') || h.includes('subdir') || h.includes('sub-dir');
          if (isSub) {
            if (h.includes('dni')) { colMap[i] = 'subDirector.dni'; return; }
            if (h.includes('tel') || h.includes('cel')) { colMap[i] = 'subDirector.telefono'; return; }
            if (h.includes('corr') || h.includes('mail')) { colMap[i] = 'subDirector.correo'; return; }
            if (h.includes('nom') || h.includes('apel') || h.includes('dir')) { colMap[i] = 'subDirector.nombre'; return; }
          }
          const isDir = h.includes('director') || h.includes('dir');
          if (isDir) {
            if (h.includes('dni')) { colMap[i] = 'director.dni'; dirDniMapped = true; return; }
            if (h.includes('tel') || h.includes('cel')) { colMap[i] = 'director.telefono'; dirTelMapped = true; return; }
            if (h.includes('corr') || h.includes('mail')) { colMap[i] = 'director.correo'; dirCorMapped = true; return; }
            if (h.includes('nom') || h.includes('apel') || h.includes('dir')) { colMap[i] = 'director.nombre'; dirNomMapped = true; return; }
          }
          // Comparar contra aliases
          for (const field in INST_FIELD_ALIASES) {
            if (INST_FIELD_ALIASES[field].some(a => normalizeText(a).replace(/\.$/, '') === h)) {
              if (field === 'director.nombre' && dirNomMapped) { colMap[i] = 'subDirector.nombre'; }
              else if (field === 'director.dni' && dirDniMapped) { colMap[i] = 'subDirector.dni'; }
              else if (field === 'director.telefono' && dirTelMapped) { colMap[i] = 'subDirector.telefono'; }
              else if (field === 'director.correo' && dirCorMapped) { colMap[i] = 'subDirector.correo'; }
              else {
                colMap[i] = field;
                if (field === 'director.nombre') dirNomMapped = true;
                if (field === 'director.dni') dirDniMapped = true;
                if (field === 'director.telefono') dirTelMapped = true;
                if (field === 'director.correo') dirCorMapped = true;
              }
              break;
            }
          }
        });

        const parsedRows = [], errors = [];
        for (let ri = 1; ri < rawRows.length; ri++) {
          const vals = rawRows[ri];
          if (!vals || !Array.isArray(vals) || vals.every(v => v === undefined || v === null || String(v).trim() === '')) continue;

          const row = {
            _rowNum: ri + 1,
            rei: '', codigoLocal: '', ie: '', modalidad: '', nivelServicio: '',
            turnos: '', tipoGestion: '', dependencia: '', direccion: '', distrito: '',
            director: { nombre: '', dni: '', telefono: '', correo: '' },
            subDirector: null,
          };
          const sd = { nombre: '', dni: '', telefono: '', correo: '' };
          let hasSubDir = false;

          Object.entries(colMap).forEach(([ci, field]) => {
            const rawVal = vals[+ci];
            const val = (rawVal === undefined || rawVal === null) ? '' : String(rawVal).trim();
            if (field.startsWith('director.')) { row.director[field.replace('director.', '')] = val; }
            else if (field.startsWith('subDirector.')) { sd[field.replace('subDirector.', '')] = val; if (val) hasSubDir = true; }
            else if (field === 'rei') { row.rei = normalizeReiNumber(val) || val; }
            else { row[field] = val; }
          });
          if (hasSubDir) row.subDirector = sd;

          row.codigoLocal = String(row.codigoLocal || '').trim();
          row.ie = String(row.ie || '').trim();

          if (!row.codigoLocal || !row.ie) {
            errors.push('Fila ' + (ri + 1) + ': falta Código local o Nombre I.E. — omitida.');
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

// Variables de estado local del tab de colegios
let colFilters = { rei: '', distrito: '', modalidad: '', q: '', pendientes: false, soloJec: false };
let colExpanded = null;
let colShowImport = false;
let colImportPreview = null; // {rows, errors}
let colImportResults = null; // { total, success, failures, mainErrorCode }
let colEditing = null; // null | 'new' | colegioId
let cachedCurrentUser = null;

function renderColegiosApartadoHtml(curFiltered, bySchool, totalColegios, filters) {
  const totalInFilter = curFiltered.length;
  const monitoreados = curFiltered.filter(c => (bySchool[c.id] || []).length > 0).length;
  const pendientes = totalInFilter - monitoreados;
  const cobertura = totalInFilter ? Math.round((monitoreados / totalInFilter) * 100) : null;
  const jecCount = curFiltered.filter(c => c.esJec || c.es_jec || String(c.modelo || '').toUpperCase() === 'JEC').length;

  // Context badges activos
  const badges = [];
  if (filters.rei) {
    badges.push('<span class="badge" style="background:rgba(37,99,235,0.12);color:var(--primary);font-weight:700">📍 REI ' + esc(filters.rei) + '</span>');
  }
  if (filters.modalidad) {
    badges.push('<span class="badge" style="background:rgba(124,58,237,0.12);color:#7c3aed;font-weight:700">🏷️ Modalidad: ' + esc(filters.modalidad) + '</span>');
  }
  if (filters.distrito) {
    badges.push('<span class="badge st-none">Distrito: ' + esc(filters.distrito) + '</span>');
  }
  if (filters.pendientes) {
    badges.push('<span class="badge st-inicio">Solo pendientes</span>');
  }
  if (filters.soloJec) {
    badges.push('<span class="badge" style="background:#dbeafe;color:#1e40af;font-weight:700">🏛️ Modelo JEC</span>');
  }
  if (filters.q) {
    badges.push('<span class="badge st-none">Búsqueda: "' + esc(filters.q) + '"</span>');
  }
  if (!badges.length) {
    badges.push('<span style="font-size:12px;color:var(--ink-soft)">Padrón general (sin filtros activos)</span>');
  }

  // Desglose dinámico por modalidad o REI
  let breakdownLabel = 'Total por modalidad en el padrón:';
  let breakdownChips = '';

  const jecBtnHtml = '<button type="button" class="badge st-none colQuickJecBtn" style="font-size:11px;padding:3px 8px;font-weight:600;cursor:pointer;border:1px solid #bfdbfe;background:' + (filters.soloJec ? 'var(--primary)' : '#eff6ff') + ';color:' + (filters.soloJec ? '#fff' : '#1e40af') + '" title="Filtrar por colegios JEC">JEC: <strong>' + jecCount + '</strong></button>';

  if (filters.rei && !filters.modalidad) {
    breakdownLabel = 'Modalidades en REI ' + esc(filters.rei) + ':';
    const modCounts = {};
    curFiltered.forEach(c => {
      const m = c.modalidad || 'Sin modalidad';
      modCounts[m] = (modCounts[m] || 0) + 1;
    });
    breakdownChips = Object.entries(modCounts).map(([m, cnt]) =>
      '<button type="button" class="badge st-none colQuickModBtn" data-mod="' + esc(m) + '" style="font-size:11px;padding:3px 8px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--surface)" title="Filtrar por ' + esc(m) + '">' + esc(m) + ': <strong style="color:var(--primary)">' + cnt + '</strong></button>'
    ).join('') + ' ' + jecBtnHtml;
  } else if (filters.modalidad && !filters.rei) {
    breakdownLabel = 'Modalidad ' + esc(filters.modalidad) + ':';
    const reiCounts = {};
    curFiltered.forEach(c => {
      const r = c.rei || 'Sin REI';
      reiCounts[r] = (reiCounts[r] || 0) + 1;
    });
    const numReis = Object.keys(reiCounts).length;
    breakdownChips = '<span class="badge st-none" style="font-size:11px;padding:3px 8px;font-weight:600">Presente en <strong>' + numReis + '</strong> REI(s)</span> ' + jecBtnHtml;
  } else if (filters.rei && filters.modalidad) {
    breakdownLabel = 'Selección activa:';
    breakdownChips = '<span class="badge" style="background:rgba(37,99,235,0.12);color:var(--primary);font-size:11px;padding:3px 8px;font-weight:600">REI ' + esc(filters.rei) + ' · ' + esc(filters.modalidad) + ': <strong>' + totalInFilter + ' colegios</strong></span> ' + jecBtnHtml;
  } else {
    breakdownLabel = 'Total por modalidad en el padrón:';
    const modCounts = {};
    curFiltered.forEach(c => {
      const m = c.modalidad || 'Sin modalidad';
      modCounts[m] = (modCounts[m] || 0) + 1;
    });
    breakdownChips = Object.entries(modCounts).map(([m, cnt]) =>
      '<button type="button" class="badge st-none colQuickModBtn" data-mod="' + esc(m) + '" style="font-size:11px;padding:3px 8px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--surface)" title="Filtrar por ' + esc(m) + '">' + esc(m) + ': <strong style="color:var(--primary)">' + cnt + '</strong></button>'
    ).join('') + ' ' + jecBtnHtml;
  }

  return '' +
    '<div id="col_filtro_apartado" style="margin-bottom:16px;padding:12px 18px;background:var(--surface-2);border:1px solid var(--line);border-radius:10px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">' +
    '  <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">' +
    '    <div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:9px;background:rgba(37,99,235,0.12);color:var(--primary);font-size:20px;flex-shrink:0">🏫</div>' +
    '    <div>' +
    '      <div style="display:flex;align-items:baseline;gap:8px;flex-wrap:wrap">' +
    '        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--ink-soft)">Total en el filtro:</span>' +
    '        <span id="col_stat_total_num" style="font-size:22px;font-weight:800;color:var(--primary);line-height:1">' + totalInFilter + '</span>' +
    '        <span style="font-size:13px;font-weight:600;color:var(--ink)">colegios</span>' +
    '        <span id="col_stat_total_ref" style="font-size:12px;color:var(--ink-soft)">(de ' + totalColegios + ' en padrón)</span>' +
    '      </div>' +
    '      <div id="col_stat_badges" style="display:flex;align-items:center;gap:6px;margin-top:4px;flex-wrap:wrap">' +
    badges.join('') +
    '      </div>' +
    '    </div>' +
    '  </div>' +
    '  <div style="display:flex;flex-direction:column;gap:3px">' +
    '    <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;color:var(--ink-soft)" id="col_stat_breakdown_label">' + breakdownLabel + '</div>' +
    '    <div id="col_stat_breakdown_chips" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">' + breakdownChips + '</div>' +
    '  </div>' +
    '  <div style="display:flex;align-items:center;gap:16px;padding-left:16px;border-left:1px solid var(--line);flex-wrap:wrap">' +
    '    <div style="text-align:center">' +
    '      <div id="col_stat_monitoreados" style="font-size:16px;font-weight:800;color:var(--ok);line-height:1">' + monitoreados + '</div>' +
    '      <div style="font-size:10.5px;font-weight:600;color:var(--ink-soft);margin-top:2px;text-transform:uppercase">Con visita</div>' +
    '    </div>' +
    '    <div style="text-align:center">' +
    '      <div id="col_stat_pendientes" style="font-size:16px;font-weight:800;color:var(--warn);line-height:1">' + pendientes + '</div>' +
    '      <div style="font-size:10.5px;font-weight:600;color:var(--ink-soft);margin-top:2px;text-transform:uppercase">Pendientes</div>' +
    '    </div>' +
    '    <div style="text-align:center">' +
    '      <div id="col_stat_cobertura" style="font-size:16px;font-weight:800;color:var(--primary);line-height:1">' + (cobertura !== null ? cobertura + '%' : '—') + '</div>' +
    '      <div style="font-size:10.5px;font-weight:600;color:var(--ink-soft);margin-top:2px;text-transform:uppercase">Cobertura</div>' +
    '    </div>' +
    '  </div>' +
    '</div>';
}

function buildColegioRowsHtml(filtered, bySchool, getFichaType, colExpandedId, isAdmin, state) {
  return filtered.map(c => {
    const subs = bySchool[c.id] || [];
    const typeStats = colegioFichaTypeStats(subs, getFichaType);
    const lastVisit = subs.reduce((max, s) => (!max || s.fecha > max) ? s.fecha : max, null);
    const chips = typeStats.map(t => '<span class="badge st-none" style="margin:1px 3px 1px 0">' + esc(t.nombre) + ' (' + t.count + ')</span>').join('') || '<span class="helpText" style="margin:0">Sin monitoreos</span>';
    const isOpen = colExpandedId === c.id;
    const detail = isOpen ? renderColegioProfile(c, subs, typeStats, state) : '';
    const isJec = Boolean(c.esJec === true || c.es_jec === true || String(c.modelo || '').toUpperCase() === 'JEC');
    return '<tr data-colrow="' + c.id + '" style="cursor:pointer">' +
      '<td><span class="badge" style="background:var(--accent-tint);color:var(--accent-dark);font-weight:600">' + esc(normalizeReiNumber(c.rei || c.red) || c.rei || '—') + '</span></td>' +
      '<td><code>' + esc(c.codigoLocal || '—') + '</code></td>' +
      '<td>' + esc(c.ie || '—') + (isJec ? ' <span class="badge" style="background:#dbeafe;color:#1e40af;font-size:10px;font-weight:700;padding:1px 5px;border:1px solid #bfdbfe;vertical-align:middle" title="Modelo JEC (Jornada Escolar Completa)">JEC</span>' : '') + '</td>' +
      '<td>' + esc(c.distrito || '—') + '</td>' +
      '<td><span class="badge st-none" style="font-weight:600">' + esc(c.modalidad || '—') + '</span></td>' +
      '<td>' + (subs.length ? subs.length : '<span class="badge st-inicio">0</span>') + '</td>' +
      '<td>' + chips + '</td>' +
      '<td>' + (lastVisit ? fmtDate(lastVisit) : '—') + '</td>' +
      (isAdmin ? '<td><button class="iconBtn" data-coledit="' + c.id + '" title="Editar">✎</button> <button class="iconBtn" data-coldel="' + c.id + '" title="Eliminar">✕</button></td>' : '<td></td>') +
      '</tr>' +
      (isOpen ? '<tr class="detailRow"><td colspan="9">' + detail + '</td></tr>' : '');
  }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:22px">Ningún colegio coincide con los filtros.</td></tr>';
}

export function renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, currentUser) {
  if (currentUser) cachedCurrentUser = currentUser;
  const bySchool = groupSubmissionsByColegio(state);
  const standardReis = Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));
  const reiSet = new Set(standardReis);
  state.colegios.forEach(c => {
    const r = normalizeReiNumber(c.rei || c.red);
    if (r) reiSet.add(r);
  });
  const reiList = Array.from(reiSet).sort((a, b) => Number(a) - Number(b));
  const distritoList = Array.from(new Set(state.colegios.map(c => c.distrito).filter(Boolean))).sort();
  const modalidadList = Array.from(new Set(state.colegios.map(c => c.modalidad).filter(Boolean))).sort();

  const totalColegios = state.colegios.length;
  const sinMonitoreo = state.colegios.filter(c => (bySchool[c.id] || []).length === 0).length;
  const coberturaPct = totalColegios ? Math.round((totalColegios - sinMonitoreo) / totalColegios * 100) : null;
  const totalJec = state.colegios.filter(c => c.esJec || c.es_jec || String(c.modelo || '').toUpperCase() === 'JEC').length;

  const reiAgg = {};
  reiList.forEach(r => reiAgg[r] = { rei: r, total: 0, monitoreados: 0, sumPct: 0, cntPct: 0 });
  state.colegios.forEach(c => {
    const cRei = normalizeReiNumber(c.rei || c.red);
    if (!cRei || !reiAgg[cRei]) return;
    const a = reiAgg[cRei]; a.total++;
    const subs = bySchool[c.id] || [];
    if (subs.length) a.monitoreados++;
    const fn = (typeof window !== 'undefined' ? window.computeStats : null);
    subs.forEach(s => { const ft = getFichaType(s.fichaTypeId); if (!ft) return; const st = typeof fn === 'function' ? fn(s, ft) : { pct: null }; if (st && st.pct !== null) { a.sumPct += st.pct; a.cntPct++; } });
  });
  const reiRows = Object.values(reiAgg).sort((a, b) => Number(a.rei) - Number(b.rei) || a.rei.localeCompare(b.rei)).map(a => {
    const pct = a.total ? Math.round(a.monitoreados / a.total * 100) : null;
    const avg = a.cntPct ? Math.round(a.sumPct / a.cntPct) : null;
    return '<div class="barRow"><div class="name">' + esc(a.rei) + ' <span style="color:var(--ink-soft);font-weight:400">(' + a.monitoreados + '/' + a.total + ' colegios' + (avg !== null ? ' · ' + avg + '% cumpl.' : '') + ')</span></div>' + bar(pct) + '<div class="val">' + (pct === null ? '—' : pct + '%') + '</div></div>';
  }).join('') || '<p class="helpText">Los colegios del padrón no tienen REI asignado.</p>';

  const getFilteredColegios = () => {
    let list = state.colegios.slice();
    if (colFilters.rei) {
      const targetRei = normalizeReiNumber(colFilters.rei);
      list = list.filter(c => normalizeReiNumber(c.rei || c.red) === targetRei);
    }
    if (colFilters.distrito) list = list.filter(c => normalizeText(c.distrito).includes(normalizeText(colFilters.distrito)));
    if (colFilters.modalidad) list = list.filter(c => (c.modalidad || '').trim() === colFilters.modalidad.trim());
    if (colFilters.q) list = list.filter(c => normalizeText(c.ie).includes(normalizeText(colFilters.q)) || normalizeText(c.codigoLocal).includes(normalizeText(colFilters.q)));
    if (colFilters.pendientes) list = list.filter(c => (bySchool[c.id] || []).length === 0);
    if (colFilters.soloJec) list = list.filter(c => Boolean(c.esJec === true || c.es_jec === true || String(c.modelo || '').toUpperCase() === 'JEC' || (c.modalidad || '').toUpperCase().includes('JEC')));
    list.sort((a, b) => (a.ie || '').localeCompare(b.ie || ''));
    return list;
  };

  let filtered = getFilteredColegios();
  const rows = buildColegioRowsHtml(filtered, bySchool, getFichaType, colExpanded, isAdmin, state);

  // Capturar foco y posición de scroll para preservar al re-renderizar
  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const selStart = (activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
  const selEnd = (activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Colegios</h2><p>Padrón de instituciones educativas por REI, cruzado con las fichas de monitoreo ya registradas.</p></div>' +
    '<div class="cards">' +
    '<div class="card"><div class="num">' + totalColegios + '</div><div class="lbl">Colegios en el padrón</div></div>' +
    '<div class="card"><div class="num">' + reiList.length + '</div><div class="lbl">REI / redes</div></div>' +
    '<div class="card"><div class="num">' + sinMonitoreo + '</div><div class="lbl">Sin ningún monitoreo</div></div>' +
    '<div class="card"><div class="num">' + (coberturaPct === null ? '—' : coberturaPct + '%') + '</div><div class="lbl">Cobertura de monitoreo</div></div>' +
    '</div>' +
    (totalColegios === 0 ? '<div class="empty"><h4>Aún no hay un padrón cargado</h4><p>' + (isAdmin ? 'Importa la lista de instituciones en el panel de abajo.' : 'Pide a un administrador que importe el padrón de instituciones.') + '</p></div>' : '') +
    (isAdmin ? renderColegiosAdminPanel(state) : '') +
    (totalColegios ? '<div class="panel"><h3>Cobertura por REI</h3>' + reiRows + '</div>' : '') +
    (totalColegios ? (
      '<div class="panel">' +
      '<h3>Padrón de instituciones</h3>' +
      '<div class="filterBar">' +
      '<div class="field"><label>REI</label><select id="col_fil_rei"><option value="">Todas</option>' + reiList.map(r => {
        const isSel = (r === colFilters.rei) || (normalizeReiNumber(colFilters.rei) === r);
        return '<option value="' + esc(r) + '"' + (isSel ? ' selected' : '') + '>' + esc(r) + '</option>';
      }).join('') + '</select></div>' +
      '<div class="field"><label>Distrito</label><input type="search" id="col_fil_distrito" list="dl_col_distrito" value="' + esc(colFilters.distrito) + '" placeholder="Buscar..."></div>' +
      '<datalist id="dl_col_distrito">' + distritoList.map(d => '<option value="' + esc(d) + '">').join('') + '</datalist>' +
      '<div class="field"><label>Modalidad</label><select id="col_fil_modalidad"><option value="">Todas</option>' + modalidadList.map(m => '<option value="' + esc(m) + '"' + (m === colFilters.modalidad ? ' selected' : '') + '>' + esc(m) + '</option>').join('') + '</select></div>' +
      '<div class="field"><label>Buscar</label><input type="search" id="col_fil_q" value="' + esc(colFilters.q) + '" placeholder="I.E. o código..."></div>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:0;white-space:nowrap"><input type="checkbox" id="col_fil_pend" ' + (colFilters.pendientes ? 'checked' : '') + '> Solo pendientes</label>' +
      '<label style="display:flex;align-items:center;gap:6px;font-size:13px;margin-bottom:0;white-space:nowrap"><input type="checkbox" id="col_fil_jec" ' + (colFilters.soloJec ? 'checked' : '') + '> Solo JEC</label>' +
      '<button class="btn secondary small" id="col_fil_clear" type="button">Limpiar</button>' +
      '<button class="btn small" id="col_btn_gestionar_jec" type="button" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-weight:700">🏛️ Gestionar Colegios JEC (' + totalJec + '/29)</button>' +
      '<button class="btn secondary small" id="col_export" type="button" style="margin-left:auto">Exportar CSV</button>' +
      '<button class="btn small" id="col_export_pdf" type="button">⬇ Descargar padrón oficial (PDF)</button>' +
      '</div>' +
      '<div id="col_apartado_host">' + renderColegiosApartadoHtml(filtered, bySchool, totalColegios, colFilters) + '</div>' +
      '<div class="tblWrap"><table><thead><tr><th>REI</th><th>Código local</th><th>I.E.</th><th>Distrito</th><th>Modalidad</th><th>N° monitoreos</th><th>Tipos de ficha aplicados</th><th>Última visita</th><th></th></tr></thead><tbody id="col_table_tbody">' + rows + '</tbody></table></div>' +
      '<div style="padding:10px 16px;background:var(--surface-2);border-top:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--ink-soft)"><span id="col_table_footer_count">Mostrando <strong>' + filtered.length + '</strong> de ' + totalColegios + ' instituciones educativas</span><span>Haz clic en cualquier institución para ver fichas aplicadas y detalles</span></div>' +
      '</div>' +
      '</div>'
    ) : '');

  // Restaurar foco y scroll si se realizó render completo
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

  const bindApartadoQuickBtns = () => {
    const aptHost = container.querySelector('#col_apartado_host');
    if (!aptHost) return;
    aptHost.querySelectorAll('.colQuickModBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        const m = btn.dataset.mod;
        if (m) {
          colFilters.modalidad = m;
          const selMod = document.getElementById('col_fil_modalidad');
          if (selMod) selMod.value = m;
          updateTableOnly();
        }
      });
    });
    aptHost.querySelectorAll('.colQuickJecBtn').forEach(btn => {
      btn.addEventListener('click', () => {
        colFilters.soloJec = !colFilters.soloJec;
        const cb = document.getElementById('col_fil_jec');
        if (cb) cb.checked = colFilters.soloJec;
        updateTableOnly();
      });
    });
  };

  const updateApartadoContent = (curFiltered) => {
    const aptHost = container.querySelector('#col_apartado_host');
    if (aptHost) {
      aptHost.innerHTML = renderColegiosApartadoHtml(curFiltered, bySchool, totalColegios, colFilters);
      bindApartadoQuickBtns();
    }
    const elFooter = container.querySelector('#col_table_footer_count');
    if (elFooter) {
      elFooter.innerHTML = 'Mostrando <strong>' + curFiltered.length + '</strong> de ' + totalColegios + ' instituciones educativas';
    }
  };

  // Actualización reactiva de la tabla y del apartado en tiempo real (sin tocar los inputs ni perder foco)
  const updateTableOnly = () => {
    const tbody = container.querySelector('#col_table_tbody');
    if (!tbody) {
      renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
      return;
    }
    filtered = getFilteredColegios();
    tbody.innerHTML = buildColegioRowsHtml(filtered, bySchool, getFichaType, colExpanded, isAdmin, state);
    updateApartadoContent(filtered);
    bindColegiosRowEvents();
  };

  const bindColegiosRowEvents = () => {
    container.querySelectorAll('tr[data-colrow]').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('[data-coledit],[data-coldel],.lnkVerEnDirectorio')) return;
        const id = tr.dataset.colrow;
        colExpanded = colExpanded === id ? null : id;
        updateTableOnly();
      });
    });

    container.querySelectorAll('.lnkVerEnDirectorio').forEach(lnk => {
      lnk.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const q = lnk.dataset.ieSearch || '';
        const dirBtn = document.querySelector('.navbtn[data-tab="directorio"]');
        if (dirBtn) dirBtn.click();
        setTimeout(() => {
          const inp = document.getElementById('dir_fil_q');
          if (inp) {
            inp.value = q;
            inp.dispatchEvent(new Event('input'));
          }
        }, 150);
      });
    });

    if (isAdmin) {
      container.querySelectorAll('[data-coledit]').forEach(btn => {
        btn.addEventListener('click', () => {
          colEditing = btn.dataset.coledit;
          renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
        });
      });
      container.querySelectorAll('[data-coldel]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const colId = btn.dataset.coldel;
          const colObj = (state.colegios || []).find(x => x.id === colId);
          const nombreIe = colObj ? colObj.ie : colId;
          if (!confirm(`¿Eliminar la institución "${nombreIe}" del padrón? Las fichas históricas de monitoreo no se borrarán.`)) return;
          try {
            await dbNs.collection('colegios').doc(btn.dataset.coldel).delete();
            showToast('Institución eliminada del padrón.');
          } catch (err) {
            console.error('Error eliminando institución:', err);
            showToast('No se pudo eliminar: [' + (err.code || 'error') + '] ' + err.message);
          }
        });
      });
    }
  };

  bindColegiosRowEvents();
  bindApartadoQuickBtns();

  const fRei = document.getElementById('col_fil_rei');
  if (fRei) fRei.addEventListener('change', e => { colFilters.rei = normalizeReiNumber(e.target.value) || e.target.value; updateTableOnly(); });

  const fDist = document.getElementById('col_fil_distrito');
  if (fDist) fDist.addEventListener('input', e => { colFilters.distrito = e.target.value; updateTableOnly(); });

  const fMod = document.getElementById('col_fil_modalidad');
  if (fMod) fMod.addEventListener('change', e => { colFilters.modalidad = e.target.value; updateTableOnly(); });

  const fQ = document.getElementById('col_fil_q');
  if (fQ) fQ.addEventListener('input', e => { colFilters.q = e.target.value; updateTableOnly(); });

  const fPend = document.getElementById('col_fil_pend');
  if (fPend) fPend.addEventListener('change', e => { colFilters.pendientes = e.target.checked; updateTableOnly(); });

  const fSoloJec = document.getElementById('col_fil_jec');
  if (fSoloJec) fSoloJec.addEventListener('change', e => { colFilters.soloJec = e.target.checked; updateTableOnly(); });

  const btnGestionarJec = document.getElementById('col_btn_gestionar_jec');
  if (btnGestionarJec) {
    btnGestionarJec.addEventListener('click', () => {
      openModalGestionJec(state, dbNs, () => {
        renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
      });
    });
  }

  const fClear = document.getElementById('col_fil_clear');
  if (fClear) fClear.addEventListener('click', () => {
    colFilters = { rei: '', distrito: '', modalidad: '', q: '', pendientes: false, soloJec: false };
    if (fRei) fRei.value = '';
    if (fDist) fDist.value = '';
    if (fMod) fMod.value = '';
    if (fQ) fQ.value = '';
    if (fPend) fPend.checked = false;
    if (fSoloJec) fSoloJec.checked = false;
    updateTableOnly();
  });
  const fExport = document.getElementById('col_export');
  if (fExport) fExport.addEventListener('click', () => {
    const curFiltered = getFilteredColegios();
    const header = ['REI', 'Código local', 'I.E.', 'Modalidad', 'Nivel de servicio', 'Turnos', 'Tipo de Gestión', 'Dependencia', 'Dirección', 'Distrito', 'Director', 'N° monitoreos', 'Última visita'];
    const dataRows = curFiltered.map(c => {
      const subs = bySchool[c.id] || [];
      const last = subs.reduce((max, s) => (!max || s.fecha > max) ? s.fecha : max, null);
      return [normalizeReiNumber(c.rei || c.red) || c.rei || '', c.codigoLocal, c.ie, c.modalidad, c.nivelServicio, c.turnos, c.tipoGestion, c.dependencia, c.direccion, c.distrito, c.director ? c.director.nombre : '', subs.length, last || ''];
    });
    downloadCsv('colegios' + (colFilters.pendientes ? '_pendientes' : '') + '.csv', header, dataRows);
  });

  const fExportPdf = document.getElementById('col_export_pdf');
  if (fExportPdf) {
    fExportPdf.addEventListener('click', async () => {
      const { openDownloadConfigModal } = await import('../ui.js?v=20261015_v1');
      const { exportColegiosReportPdf } = await import('../pdf-monitoreo.js?v=20261014_v1');
      const curFiltered = getFilteredColegios();
      const enhancedColegios = curFiltered.map(c => {
        const subs = bySchool[c.id] || [];
        const last = subs.reduce((max, s) => (!max || s.fecha > max) ? s.fecha : max, null);
        return { ...c, _subsCount: subs.length, _lastVisit: last };
      });

      const filterReis = Array.from(new Set(curFiltered.map(c => c.rei).filter(Boolean)));
      const monitoreadosCount = enhancedColegios.filter(c => c._subsCount > 0).length;
      const cobPct = enhancedColegios.length ? Math.round(monitoreadosCount / enhancedColegios.length * 100) : 0;

      openDownloadConfigModal({
        documentTitle: 'PADRÓN OFICIAL DE INSTITUCIONES EDUCATIVAS',
        tipoReporte: 'colegios',
        dataRows: enhancedColegios,
        currentUser: cachedCurrentUser,
        state,
        dbNs,
        isAdmin,
        onConfirm: async (cfg) => {
          await exportColegiosReportPdf(enhancedColegios, {
            totalReis: filterReis.length,
            monitoreados: monitoreadosCount,
            cobertura: cobPct
          }, cfg);
        }
      });
    });
  }
  if (isAdmin) {
    const newBtn = document.getElementById('col_new_btn');
    if (newBtn) newBtn.addEventListener('click', () => { colEditing = 'new'; renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser); });
    const saveBtn = document.getElementById('col_f_save');
    if (saveBtn) saveBtn.addEventListener('click', () => saveColegioForm(state, dbNs, container, getFichaType, isAdmin));
    const cancelBtn = document.getElementById('col_f_cancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => { colEditing = null; renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser); });

    const adminJecBtn = document.getElementById('col_admin_gestionar_jec');
    if (adminJecBtn) adminJecBtn.addEventListener('click', () => {
      openModalGestionJec(state, dbNs, () => {
        renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
      });
    });

    const jecCb = document.getElementById('col_f_es_jec');
    if (jecCb) {
      jecCb.addEventListener('change', (e) => {
        const cfg = document.getElementById('col_f_jec_config');
        if (cfg) cfg.style.display = e.target.checked ? 'flex' : 'none';
      });
    }

    const impToggle = document.getElementById('col_import_toggle');
    if (impToggle) impToggle.addEventListener('click', () => { colShowImport = !colShowImport; renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser); });

    const plantillaBtn = document.getElementById('col_download_plantilla');
    if (plantillaBtn) plantillaBtn.addEventListener('click', downloadPlantillaExcel);

    const impFile = document.getElementById('col_import_file');
    if (impFile) {
      impFile.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        colImportResults = null;
        const loadBtn = document.getElementById('col_import_load');
        if (loadBtn) { loadBtn.disabled = true; loadBtn.textContent = 'Procesando...'; }
        try {
          colImportPreview = await parseInstitucionesExcel(file);
        } catch (err) {
          console.error('Error leyendo archivo Excel:', err);
          colImportPreview = { rows: [], errors: ['No se pudo leer el archivo: ' + (err.message || 'error')] };
        }
        if (loadBtn) { loadBtn.disabled = false; loadBtn.textContent = 'Ver vista previa'; }
        renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
        e.target.value = '';
      });
    }

    const impConfirm = document.getElementById('col_import_confirm');
    if (impConfirm) impConfirm.addEventListener('click', () => {
      impConfirm.disabled = true; impConfirm.textContent = 'Importando...';
      commitColegiosImport(state, dbNs, container, getFichaType, isAdmin, cachedCurrentUser);
    });

    const clearResBtn = document.getElementById('col_import_clear_results');
    if (clearResBtn) {
      clearResBtn.addEventListener('click', () => {
        colImportResults = null;
        renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
      });
    }
  }

  // Auto-apertura si se solicitó desde el panel comparativo de reportes
  if (window._openJecModalOnLoad) {
    window._openJecModalOnLoad = false;
    setTimeout(() => {
      openModalGestionJec(state, dbNs, () => {
        renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
      });
    }, 80);
  }
}

function renderColegiosAdminPanel(state) {
  const totalJec = (state && state.colegios) ? state.colegios.filter(c => c.esJec || c.es_jec || String(c.modelo || '').toUpperCase() === 'JEC').length : 0;
  return '' +
    '<div class="panel"><h3>' + (colEditing && colEditing !== 'new' ? 'Editar institución' : 'Agregar institución') + '</h3>' +
    (colEditing ? renderColegioFormPanel(state) : '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn secondary small" id="col_new_btn" type="button">+ Agregar institución manualmente</button><button class="btn small" id="col_admin_gestionar_jec" type="button" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-weight:700">🏛️ Gestionar Colegios JEC (' + totalJec + '/29)</button></div>') +
    '</div>' +
    '<div class="panel">' +
    '<h3>Importar padrón desde Excel <small>archivo .xlsx</small></h3>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
    '<button class="btn secondary small" id="col_import_toggle" type="button">' + (colShowImport ? 'Ocultar importación' : 'Importar desde Excel') + '</button>' +
    '<button class="btn secondary small" id="col_download_plantilla" type="button">⬇ Descargar plantilla</button>' +
    '</div>' +
    (colShowImport ? renderColegiosImportForm() : '') +
    '</div>';
}

function renderColegiosImportForm() {
  const resultsHtml = colImportResults ? renderColegiosImportResults(colImportResults) : '';
  const previewHtml = colImportPreview ? renderColegiosImportPreview(colImportPreview) : '';
  return '' +
    resultsHtml +
    '<p class="helpText" style="margin-top:0">' +
    'Descarga la plantilla de arriba, complétala en Excel y súbela aquí. ' +
    'Si el código local ya existe en el padrón, se actualizará en vez de duplicarse. ' +
    'Los sub_directores son opcionales (deja las columnas vacías si el colegio no tiene).' +
    '</p>' +
    '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">' +
    '<input type="file" id="col_import_file" accept=".xlsx,.xls" style="font-size:13px">' +
    '</div>' +
    (colImportPreview && colImportPreview.rows.length
      ? '<button class="btn small" id="col_import_confirm" type="button" style="margin-bottom:10px">✓ Confirmar importación (' + colImportPreview.rows.length + ' instituciones)</button>'
      : '') +
    previewHtml;
}

function renderColegiosImportResults(res) {
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
    'Firestore rechazó las escrituras por falta de permisos. Verifica y aplica lo siguiente:' +
    '<ol style="margin:8px 0 0 18px;padding:0">' +
    '<li><strong>Reglas de Firestore (firestore.rules):</strong> En Firebase Console &gt; Firestore Database &gt; pestaña <em>Reglas</em>, asegúrate de publicar la regla para <code>colegios</code>:<br>' +
    '<code style="display:block;background:var(--surface);padding:6px 8px;border-radius:4px;margin:5px 0;font-size:12px;border:1px solid var(--line);font-family:monospace">' +
    'match /colegios/{docId} {<br>' +
    '&nbsp;&nbsp;allow read: if signedIn();<br>' +
    '&nbsp;&nbsp;allow create, update, delete: if isAdmin();<br>' +
    '}' +
    '</code>' +
    '<em>(Luego haz clic en <strong>Publicar</strong> en Firebase Console).</em>' +
    '</li>' +
    '<li style="margin-top:8px"><strong>Rol de Administrador:</strong> Verifica en la pestaña <em>Usuarios</em> que tu cuenta tenga rol <strong>Administrador</strong> en la colección <code>roles</code> de Firestore.</li>' +
    '</ol>' +
    '</div>'
    : '';

  const failRowsHtml = res.failures.slice(0, 50).map(f =>
    '<tr>' +
    '<td><span class="badge st-inicio">Fila ' + f.rowNum + '</span></td>' +
    '<td>' + esc(f.codigoLocal) + '</td>' +
    '<td>' + esc(f.ie) + '</td>' +
    '<td><code style="font-size:11px">' + esc(f.code) + '</code></td>' +
    '<td style="color:var(--danger);font-size:12px">' + esc(f.message) + '</td>' +
    '</tr>'
  ).join('');

  return '' +
    '<div class="panel" style="border-left:4px solid ' + (isAllSuccess ? 'var(--primary)' : isPartial ? 'var(--accent)' : 'var(--danger)') + ';margin-top:12px;margin-bottom:14px">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">' +
    '<h4 style="margin:0;font-size:14.5px">' +
    (isAllSuccess ? '✓ Importación completada con éxito' : isPartial ? '⚠ Importación parcial con errores' : '✕ Error al importar padrón') +
    '</h4>' +
    '<button class="btn secondary small" id="col_import_clear_results" type="button">✕ Cerrar reporte</button>' +
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
      '<div class="tblWrap" style="max-height:260px;overflow-y:auto"><table><thead><tr><th>Fila Excel</th><th>Código local</th><th>Nombre I.E.</th><th>Código Firestore</th><th>Detalle del error</th></tr></thead><tbody>' + failRowsHtml + '</tbody></table></div>' +
      (res.failures.length > 50 ? '<p class="helpText" style="margin-top:4px">Mostrando las primeras 50 fallas de ' + res.failures.length + '.</p>' : '') +
      '</div>'
      : '') +
    '</div>';
}

function renderColegiosImportPreview(preview) {
  const errHtml = preview.errors.length
    ? '<p class="helpText" style="color:var(--danger)">' + preview.errors.slice(0, 10).join('<br>') + (preview.errors.length > 10 ? '<br>… y ' + (preview.errors.length - 10) + ' más.' : '') + '</p>'
    : '';
  if (!preview.rows.length) return errHtml + '<p class="helpText">No hay filas válidas para importar.</p>';
  const rowsHtml = preview.rows.slice(0, 50).map(r => {
    const hasDir = r.director && r.director.nombre;
    const hasSubDir = r.subDirector && r.subDirector.nombre;
    return '<tr>' +
      '<td>' + esc(r.rei) + '</td>' +
      '<td>' + esc(r.codigoLocal) + '</td>' +
      '<td>' + esc(r.ie) + '</td>' +
      '<td>' + esc(r.distrito) + '</td>' +
      '<td>' + (hasDir ? esc(r.director.nombre) : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      '<td>' + (hasSubDir ? esc(r.subDirector.nombre) : '<span style="color:var(--ink-soft)">—</span>') + '</td>' +
      '</tr>';
  }).join('');
  return '' +
    '<p class="helpText"><strong>' + preview.rows.length + '</strong> institución(es) lista(s) para importar' + (preview.errors.length ? ', ' + preview.errors.length + ' fila(s) con error' : '') + '.</p>' +
    errHtml +
    '<div class="tblWrap"><table><thead><tr><th>REI</th><th>Código local</th><th>I.E.</th><th>Distrito</th><th>Director</th><th>Sub-director</th></tr></thead><tbody>' + rowsHtml + '</tbody></table></div>' +
    (preview.rows.length > 50 ? '<p class="helpText">Mostrando las primeras 50 filas de ' + preview.rows.length + '.</p>' : '');
}

function renderColegioFormPanel(state) {
  const col = (state && state.colegios && colEditing && colEditing !== 'new')
    ? (state.colegios.find(x => x.id === colEditing) || {})
    : {};
  const dir = col.director || {};
  const sub = col.subDirector || {};
  const isJec = Boolean(col.esJec === true || col.es_jec === true || String(col.modelo || '').toUpperCase() === 'JEC');
  const cantPedag = col.cantCoordPedag || 1;
  const cantTutoria = col.cantCoordTutoria || 1;

  return '' +
    '<div class="fieldGrid">' +
    '<div class="field"><label>REI</label><input type="text" id="col_f_rei" list="dl_col_reis" value="' + esc(normalizeReiNumber(col.rei || col.red) || col.rei || '') + '" placeholder="Ej. 01"><datalist id="dl_col_reis">' + Array.from({ length: 16 }, (_, i) => '<option value="' + String(i + 1).padStart(2, '0') + '">').join('') + '</datalist></div>' +
    '<div class="field"><label>Código local *</label><input type="text" id="col_f_codigo" value="' + esc(col.codigoLocal || '') + '"></div>' +
    '<div class="field"><label>Nombre I.E. *</label><input type="text" id="col_f_ie" value="' + esc(col.ie || '') + '"></div>' +
    '<div class="field"><label>Modalidad</label><input type="text" id="col_f_modalidad" value="' + esc(col.modalidad || '') + '"></div>' +
    '<div class="field"><label>Nivel de servicio</label><input type="text" id="col_f_nivel" value="' + esc(col.nivelServicio || '') + '"></div>' +
    '<div class="field"><label>Turnos</label><input type="text" id="col_f_turnos" value="' + esc(col.turnos || '') + '"></div>' +
    '<div class="field"><label>Tipo de Gestión</label><input type="text" id="col_f_gestion" value="' + esc(col.tipoGestion || '') + '"></div>' +
    '<div class="field"><label>Dependencia</label><input type="text" id="col_f_dependencia" value="' + esc(col.dependencia || '') + '"></div>' +
    '<div class="field" style="grid-column:span 2"><label>Dirección</label><input type="text" id="col_f_direccion" value="' + esc(col.direccion || '') + '"></div>' +
    '<div class="field"><label>Distrito</label><input type="text" id="col_f_distrito" value="' + esc(col.distrito || '') + '"></div>' +
    '</div>' +
    '<div class="sectionTitle">Modelo JEC (Jornada Escolar Completa)</div>' +
    '<div style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin-bottom:12px">' +
    '  <label style="display:flex;align-items:center;gap:8px;font-weight:700;cursor:pointer;margin-bottom:4px">' +
    '    <input type="checkbox" id="col_f_es_jec" ' + (isJec ? 'checked' : '') + ' style="width:16px;height:16px;accent-color:#1d4ed8">' +
    '    🏛️ Esta institución educativa pertenece al Modelo JEC (Secundaria)' +
    '  </label>' +
    '  <div id="col_f_jec_config" style="display:' + (isJec ? 'flex' : 'none') + ';gap:16px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px dashed var(--line)">' +
    '    <div class="field" style="flex:1;min-width:180px">' +
    '      <label>N° Coordinadores Pedagógicos</label>' +
    '      <input type="number" id="col_f_cant_pedag" min="1" max="10" value="' + cantPedag + '">' +
    '      <small style="color:var(--ink-soft);font-size:11px">Fichas esperadas por visita para Coord. Pedagógico</small>' +
    '    </div>' +
    '    <div class="field" style="flex:1;min-width:180px">' +
    '      <label>N° Coordinadores de Tutoría</label>' +
    '      <input type="number" id="col_f_cant_tutoria" min="1" max="10" value="' + cantTutoria + '">' +
    '      <small style="color:var(--ink-soft);font-size:11px">Fichas esperadas por visita para Coord. de Tutoría</small>' +
    '    </div>' +
    '  </div>' +
    '</div>' +
    '<div class="sectionTitle">Datos del Director(a)</div>' +
    '<div class="fieldGrid">' +
    '<div class="field"><label>Apellidos y nombres *</label><input type="text" id="col_f_dir_nombre" value="' + esc(dir.nombre || '') + '"></div>' +
    '<div class="field"><label>DNI</label><input type="text" id="col_f_dir_dni" maxlength="8" value="' + esc(dir.dni || '') + '"></div>' +
    '<div class="field"><label>Teléfono</label><input type="text" id="col_f_dir_tel" value="' + esc(dir.telefono || '') + '"></div>' +
    '<div class="field"><label>Correo</label><input type="email" id="col_f_dir_correo" value="' + esc(dir.correo || '') + '"></div>' +
    '</div>' +
    '<div class="sectionTitle">Datos del Sub-director(a) <small style="font-weight:400;color:var(--ink-soft)">(opcional)</small></div>' +
    '<div class="fieldGrid">' +
    '<div class="field"><label>Apellidos y nombres</label><input type="text" id="col_f_sub_nombre" value="' + esc(sub.nombre || '') + '"></div>' +
    '<div class="field"><label>DNI</label><input type="text" id="col_f_sub_dni" maxlength="8" value="' + esc(sub.dni || '') + '"></div>' +
    '<div class="field"><label>Teléfono</label><input type="text" id="col_f_sub_tel" value="' + esc(sub.telefono || '') + '"></div>' +
    '<div class="field"><label>Correo</label><input type="email" id="col_f_sub_correo" value="' + esc(sub.correo || '') + '"></div>' +
    '</div>' +
    '<div style="display:flex;gap:8px;margin-top:4px">' +
    '<button class="btn small" id="col_f_save" type="button">' + (colEditing === 'new' ? 'Guardar nueva institución' : 'Actualizar institución') + '</button>' +
    '<button class="btn secondary small" id="col_f_cancel" type="button">Cancelar</button>' +
    '</div>';
}

async function saveColegioForm(state, dbNs, container, getFichaType, isAdmin) {
  const codigo = (document.getElementById('col_f_codigo').value || '').trim();
  const ie = (document.getElementById('col_f_ie').value || '').trim();
  if (!codigo || !ie) { showToast('Completa Código local y Nombre I.E.'); return; }

  const id = (colEditing && colEditing !== 'new') ? colEditing : docIdForCodigo(codigo);
  const existing = state.colegios.find(x => x.id === id);

  const subNombre = (document.getElementById('col_f_sub_nombre').value || '').trim();
  const subDni = (document.getElementById('col_f_sub_dni').value || '').trim();
  const subTel = (document.getElementById('col_f_sub_tel').value || '').trim();
  const subCorreo = (document.getElementById('col_f_sub_correo').value || '').trim();

  const esJec = Boolean(document.getElementById('col_f_es_jec')?.checked);
  const cantCoordPedag = Math.max(1, parseInt(document.getElementById('col_f_cant_pedag')?.value, 10) || 1);
  const cantCoordTutoria = Math.max(1, parseInt(document.getElementById('col_f_cant_tutoria')?.value, 10) || 1);

  const raw = {
    rei: normalizeReiNumber(document.getElementById('col_f_rei')?.value) || (document.getElementById('col_f_rei')?.value || '').trim(),
    codigoLocal: codigo,
    ie: ie,
    modalidad: (document.getElementById('col_f_modalidad').value || '').trim(),
    nivelServicio: (document.getElementById('col_f_nivel').value || '').trim(),
    turnos: (document.getElementById('col_f_turnos').value || '').trim(),
    tipoGestion: (document.getElementById('col_f_gestion').value || '').trim(),
    dependencia: (document.getElementById('col_f_dependencia').value || '').trim(),
    direccion: (document.getElementById('col_f_direccion').value || '').trim(),
    distrito: (document.getElementById('col_f_distrito').value || '').trim(),
    director: {
      nombre: (document.getElementById('col_f_dir_nombre').value || '').trim(),
      dni: (document.getElementById('col_f_dir_dni').value || '').trim(),
      telefono: (document.getElementById('col_f_dir_tel').value || '').trim(),
      correo: (document.getElementById('col_f_dir_correo').value || '').trim(),
    },
    subDirector: {
      nombre: subNombre,
      dni: subDni,
      telefono: subTel,
      correo: subCorreo,
    },
    esJec: esJec,
    cantCoordPedag: cantCoordPedag,
    cantCoordTutoria: cantCoordTutoria,
  };

  const data = sanitizeColegioRecord(raw, existing, Date.now());
  try {
    await dbNs.collection('colegios').doc(id).set(data);
    showToast('Institución guardada.');
    const idx = (state.colegios || []).findIndex(x => x.id === id);
    if (idx >= 0) {
      state.colegios[idx] = data;
    } else {
      state.colegios.push(data);
    }
    colEditing = null;
  } catch (err) {
    console.error('Error al guardar institución individual en Firestore:', err);
    console.error('Código Firestore:', err.code, '| Mensaje:', err.message);
    showToast('No se pudo guardar: [' + (err.code || 'error') + '] ' + err.message);
  }
  renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
}

async function commitColegiosImport(state, dbNs, container, getFichaType, isAdmin, currentUser) {
  if (!colImportPreview || !colImportPreview.rows.length) return;
  const rows = colImportPreview.rows;
  const now = Date.now();

  const user = currentUser || cachedCurrentUser;
  if (!user) {
    console.error('Error previo a importación: No hay usuario autenticado en la sesión.');
    colImportResults = {
      total: rows.length,
      success: 0,
      failures: [{ rowNum: '-', codigoLocal: '-', ie: '-', code: 'unauthenticated', message: 'No hay usuario autenticado. Inicia sesión nuevamente.' }],
      mainErrorCode: 'unauthenticated',
    };
    showToast('Sesión no encontrada. Inicia sesión como Administrador.');
    renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, currentUser);
    return;
  }

  // Comprobar rol en la colección 'roles'
  try {
    const roleSnap = await dbNs.collection('roles').doc(user.uid).get();
    const roleInDb = roleSnap.exists ? (roleSnap.data().role || 'sin_rol') : 'no_existe';
    if (roleInDb !== 'admin') {
      console.warn(`Advertencia previa: Usuario ${user.email || user.uid} figura con rol '${roleInDb}' en roles/${user.uid}`);
    }
  } catch (rErr) {
    console.warn('No se pudo verificar el documento de rol antes de importar:', rErr);
  }

  colImportResults = {
    total: rows.length,
    success: 0,
    failures: [],
    mainErrorCode: null,
  };

  const confirmBtn = document.getElementById('col_import_confirm');
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
          const id = docIdForCodigo(r.codigoLocal);
          const existing = state.colegios.find(c => c.id === id);
          const docData = sanitizeColegioRecord(r, existing, now);
          await dbNs.collection('colegios').doc(id).set(docData);
          colImportResults.success++;
        } catch (err) {
          console.error(`[Fila ${rowNum}] Error Firestore (colegios) al guardar "${r.ie || r.codigoLocal}":`, err);
          console.error(`Código: ${err.code} | Mensaje: ${err.message}`);
          if (!colImportResults.mainErrorCode && err.code) {
            colImportResults.mainErrorCode = err.code;
          }
          colImportResults.failures.push({
            rowNum: rowNum,
            codigoLocal: r.codigoLocal || '—',
            ie: r.ie || '—',
            code: err.code || 'error',
            message: err.message || String(err),
          });
        }
      }));
    }

    console.log('=== Resumen de importación de padrón ===');
    console.log('Total registros:', colImportResults.total, '| Exitosos:', colImportResults.success, '| Fallidos:', colImportResults.failures.length);
    if (colImportResults.failures.length > 0) {
      console.error('Listado de fallos detallados:', colImportResults.failures);
    }

    if (colImportResults.failures.length === 0) {
      showToast('✓ Padrón importado: ' + colImportResults.success + ' instituciones con éxito.');
      colImportPreview = null;
      colShowImport = false;
    } else if (colImportResults.success > 0) {
      showToast('⚠ Importación parcial: ' + colImportResults.success + ' guardadas, ' + colImportResults.failures.length + ' con error. Revisa el reporte.');
    } else {
      const sampleErr = colImportResults.failures[0] || {};
      showToast('✕ Error en importación [' + (sampleErr.code || 'error') + ']: ' + (sampleErr.message || 'Operación denegada'));
    }
  } catch (fatalErr) {
    console.error('Error fatal durante la importación:', fatalErr);
    showToast('✕ Error crítico: [' + (fatalErr.code || 'error') + '] ' + fatalErr.message);
  }

  renderColegiosTab(container, state, getFichaType, dbNs, isAdmin, cachedCurrentUser);
}

function renderColegioProfile(c, subs, typeStats, state) {
  const directivos = getDirectivosActivosForColegio(state || {}, c.id, c.codigoLocal, c.codigoModular);
  const dir = directivos.director;
  const subdirs = directivos.subdirectores || [];

  let directivosHtml = '<div class="sectionTitle" style="margin-top:10px;display:flex;justify-content:space-between;align-items:center">' +
    '<span>Directivos</span>' +
    '<a href="#directorio" class="lnkVerEnDirectorio" data-ie-search="' + esc(c.ie) + '" style="font-size:11.5px;font-weight:600;color:var(--primary);text-decoration:none;cursor:pointer">📋 Ver en Directorio →</a>' +
    '</div>';

  if (dir) {
    directivosHtml += '<div style="font-size:12.5px;margin-bottom:4px">' +
      '<span class="badge st-logrado" style="font-size:10.5px;margin-right:4px">Director(a)</span> ' +
      '<strong>' + esc(dir.apellidosNombres) + '</strong>' +
      (dir.dni ? ' · DNI: ' + esc(dir.dni) : '') +
      (dir.telefono ? ' · ☎ ' + esc(dir.telefono) : '') +
      (dir.correo ? ' · ✉ ' + esc(dir.correo) : '') +
      (dir.condicion ? ' · (' + esc(dir.condicion) + ')' : '') +
      '</div>';
  } else {
    directivosHtml += '<div style="font-size:12px;color:var(--ink-soft);margin-bottom:4px"><em>Director(a) sin registrar</em></div>';
  }

  if (subdirs.length) {
    subdirs.forEach(sd => {
      directivosHtml += '<div style="font-size:12.5px;margin-bottom:4px">' +
        '<span class="badge" style="font-size:10.5px;margin-right:4px;background:var(--accent-tint);color:var(--accent-dark)">Subdirector(a)</span> ' +
        '<strong>' + esc(sd.apellidosNombres) + '</strong>' +
        (sd.dni ? ' · DNI: ' + esc(sd.dni) : '') +
        (sd.telefono ? ' · ☎ ' + esc(sd.telefono) : '') +
        (sd.correo ? ' · ✉ ' + esc(sd.correo) : '') +
        (sd.condicion ? ' · (' + esc(sd.condicion) + ')' : '') +
        (sd.avisoRevision ? ' · <span class="badge st-inicio" style="font-size:10px">⚠ ' + esc(sd.avisoRevision) + '</span>' : '') +
        '</div>';
    });
  }

  const info = ['modalidad', 'nivelServicio', 'turnos', 'dependencia', 'direccion'].map(f =>
    c[f] ? '<div style="font-size:12.5px;margin-bottom:3px"><strong>' + esc(COLEGIO_FIELD_LABELS[f]) + ':</strong> ' + esc(c[f]) + '</div>' : ''
  ).join('');
  const typeRows = typeStats.map(t =>
    '<div class="barRow"><div class="name">' + esc(t.nombre) + ' <span style="color:var(--ink-soft);font-weight:400">(' + t.count + ' visita' + (t.count === 1 ? '' : 's') + ' · última ' + fmtDate(t.last) + ')</span></div>' + bar(t.avg) + '<div class="val">' + (t.avg === null ? '—' : t.avg + '%') + '</div></div>'
  ).join('') || '<p class="helpText" style="margin-top:0">Este colegio aún no tiene fichas registradas.</p>';
  const recent = subs.slice().sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 6).map(s =>
    '<li style="margin-bottom:3px;font-size:12.5px">' + fmtDate(s.fecha) + ' — ' + esc(s.fichaTypeNombre || '—') + (s.responsable ? ' · ' + esc(s.responsable) : '') + '</li>'
  ).join('');
  return '' +
    (info ? '<div class="sectionTitle" style="margin-top:0">Datos del padrón</div>' + info : '') +
    directivosHtml +
    '<div class="sectionTitle">Monitoreos por tipo de ficha</div>' + typeRows +
    (recent ? '<div class="sectionTitle">Últimas visitas</div><ul style="margin:0;padding-left:18px">' + recent + '</ul>' : '');
}

/**
 * Diálogo modal interactivo de selección y configuración masiva de Colegios JEC.
 * Permite marcar las 29 instituciones educativas secundarias JEC de la UGEL 03
 * y ajustar la cantidad de coordinadores pedagógicos y de tutoría por colegio.
 */
export function openModalGestionJec(state, dbNs, onSaved) {
  const existingModal = document.getElementById('jecSelectionModal');
  if (existingModal) existingModal.remove();

  const padron = (state && Array.isArray(state.colegios)) ? state.colegios : [];

  // Mapa borrador en memoria para edición ágil sin mutar Firestore hasta guardar
  const draftMap = new Map();
  padron.forEach(c => {
    draftMap.set(c.id, {
      esJec: Boolean(c.esJec === true || c.es_jec === true || String(c.modelo || '').toUpperCase() === 'JEC'),
      cantCoordPedag: Math.max(1, Number(c.cantCoordPedag) || 1),
      cantCoordTutoria: Math.max(1, Number(c.cantCoordTutoria) || 1)
    });
  });

  let currentSearch = '';
  let currentTab = 'secundaria'; // 'all' | 'secundaria' | 'jec' | 'nojec'

  const countJec = () => {
    let cnt = 0;
    for (const v of draftMap.values()) {
      if (v.esJec) cnt++;
    }
    return cnt;
  };

  const getSecundariasCount = () => {
    return padron.filter(c => {
      const niv = normalizeText(c.nivelServicio || c.nivel || '');
      const mod = normalizeText(c.modalidad || '');
      return niv.includes('secund') || mod.includes('secund') || mod.includes('ebr') || draftMap.get(c.id)?.esJec;
    }).length;
  };

  const modalWrap = document.createElement('div');
  modalWrap.id = 'jecSelectionModal';
  modalWrap.className = 'downloadModalOverlay';
  modalWrap.setAttribute('role', 'dialog');
  modalWrap.setAttribute('aria-modal', 'true');

  modalWrap.innerHTML = `
    <div class="downloadModalCard" style="max-width:920px;width:95vw;max-height:92vh;display:flex;flex-direction:column">
      <div class="downloadModalHeader" style="background:#0b1b36;border-bottom:3px solid #3b82f6;padding:16px 20px">
        <div>
          <h3 style="color:#fff;font-size:18px;display:flex;align-items:center;gap:8px;margin:0">
            <span>🏛️</span> Configuración y Selección de Colegios JEC
          </h3>
          <div class="sub" style="color:#93c5fd;font-size:12px;margin-top:3px">
            Jornada Escolar Completa · UGEL 03 · Meta Oficial: 29 Colegios
          </div>
        </div>
        <button type="button" class="downloadModalClose" id="m_jec_close" aria-label="Cerrar" style="color:#fff;font-size:22px">✕</button>
      </div>

      <div class="downloadModalBody" style="padding:16px 20px;gap:12px;flex:1;overflow:hidden;display:flex;flex-direction:column">
        <!-- Barra de métricas y contador dinámico -->
        <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:10px;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap">
          <div>
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--ink-soft);letter-spacing:0.5px">Instituciones seleccionadas como JEC:</div>
            <div style="display:flex;align-items:baseline;gap:8px;margin-top:2px">
              <span id="m_jec_counter" style="font-size:26px;font-weight:800;color:var(--primary);line-height:1">${countJec()}</span>
              <span style="font-size:13px;font-weight:600;color:var(--ink)">de 29 colegios JEC</span>
              <span id="m_jec_status_badge" class="badge" style="font-size:11px;font-weight:700"></span>
            </div>
          </div>
          <div style="font-size:12px;color:var(--ink-soft);max-width:440px;line-height:1.4">
            💡 Marca la casilla para cada uno de los 29 colegios JEC. Además puedes configurar la cantidad de <strong>Coordinadores Pedagógicos</strong> y <strong>de Tutoría</strong> de cada IE (por defecto 1).
          </div>
        </div>

        <!-- Barra de búsqueda y filtros rápidos -->
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <input type="search" id="m_jec_search" placeholder="Buscar por nombre de colegio, código local o distrito..." style="flex:1;min-width:220px;padding:7px 12px;font-size:13px;border:1px solid var(--line);border-radius:6px;background:var(--surface)">
          <div style="display:flex;gap:6px;flex-wrap:wrap" id="m_jec_filter_tabs">
            <button type="button" class="badge st-none mJecTab" data-tab="secundaria" style="padding:5px 10px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--surface)">Secundarias (${getSecundariasCount()})</button>
            <button type="button" class="badge st-none mJecTab" data-tab="jec" style="padding:5px 10px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--surface)">Seleccionados JEC (<span id="m_jec_tab_count">${countJec()}</span>)</button>
            <button type="button" class="badge st-none mJecTab" data-tab="nojec" style="padding:5px 10px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--surface)">Sin seleccionar</button>
            <button type="button" class="badge st-none mJecTab" data-tab="all" style="padding:5px 10px;font-size:11.5px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:var(--surface)">Todos (${padron.length})</button>
          </div>
        </div>

        <!-- Tabla de colegios con scroll -->
        <div style="flex:1;max-height:48vh;overflow-y:auto;border:1px solid var(--line);border-radius:8px;background:var(--surface)">
          <table style="width:100%;border-collapse:collapse;font-size:12.5px">
            <thead style="position:sticky;top:0;background:var(--surface-2);z-index:2;box-shadow:0 1px 2px rgba(0,0,0,0.05)">
              <tr>
                <th style="width:46px;text-align:center;padding:8px 6px">JEC</th>
                <th style="width:55px;padding:8px 6px">REI</th>
                <th style="width:90px;padding:8px 6px">Cód. Local</th>
                <th style="padding:8px 8px">Institución Educativa</th>
                <th style="width:110px;padding:8px 6px">Distrito</th>
                <th style="width:95px;text-align:center;padding:8px 6px" title="Cantidad esperada de coordinadores pedagógicos por visita">Coord. Pedag.</th>
                <th style="width:95px;text-align:center;padding:8px 6px" title="Cantidad esperada de coordinadores de tutoría por visita">Coord. Tutoría</th>
              </tr>
            </thead>
            <tbody id="m_jec_tbody">
            </tbody>
          </table>
        </div>
      </div>

      <div class="downloadModalFooter" style="padding:12px 20px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line)">
        <span style="font-size:12px;color:var(--ink-soft)" id="m_jec_footer_info"></span>
        <div style="display:flex;gap:8px">
          <button type="button" class="btn secondary small" id="m_jec_cancel">Cancelar</button>
          <button type="button" class="btn small" id="m_jec_save" style="background:#1d4ed8;color:#fff;font-weight:700;padding:6px 14px">
            ✓ Guardar selección JEC
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);

  const updateBadgeAndCounter = () => {
    const cnt = countJec();
    const cntEl = modalWrap.querySelector('#m_jec_counter');
    const badgeEl = modalWrap.querySelector('#m_jec_status_badge');
    const tabCnt = modalWrap.querySelector('#m_jec_tab_count');
    if (cntEl) cntEl.textContent = cnt;
    if (tabCnt) tabCnt.textContent = cnt;
    if (badgeEl) {
      if (cnt === 29) {
        badgeEl.className = 'badge st-logrado';
        badgeEl.textContent = '✓ 29 de 29 colegios seleccionados';
      } else if (cnt < 29) {
        badgeEl.className = 'badge st-proceso';
        badgeEl.textContent = `${cnt} de 29 (faltan ${29 - cnt})`;
      } else {
        badgeEl.className = 'badge st-inicio';
        badgeEl.textContent = `${cnt} seleccionados (superó por ${cnt - 29})`;
      }
    }
  };

  const renderTableRows = () => {
    const tbody = modalWrap.querySelector('#m_jec_tbody');
    if (!tbody) return;

    const q = normalizeText(currentSearch.trim());
    let list = padron.slice();

    if (q) {
      list = list.filter(c =>
        normalizeText(c.ie || '').includes(q) ||
        normalizeText(c.codigoLocal || '').includes(q) ||
        normalizeText(c.distrito || '').includes(q) ||
        normalizeText(c.rei || '').includes(q)
      );
    }

    if (currentTab === 'secundaria') {
      list = list.filter(c => {
        const niv = normalizeText(c.nivelServicio || c.nivel || '');
        const mod = normalizeText(c.modalidad || '');
        return niv.includes('secund') || mod.includes('secund') || mod.includes('ebr') || draftMap.get(c.id)?.esJec;
      });
    } else if (currentTab === 'jec') {
      list = list.filter(c => draftMap.get(c.id)?.esJec);
    } else if (currentTab === 'nojec') {
      list = list.filter(c => !draftMap.get(c.id)?.esJec);
    }

    // Ordenar: primero los seleccionados JEC, luego alfabéticamente
    list.sort((a, b) => {
      const aJ = draftMap.get(a.id)?.esJec ? 1 : 0;
      const bJ = draftMap.get(b.id)?.esJec ? 1 : 0;
      if (aJ !== bJ) return bJ - aJ;
      return (a.ie || '').localeCompare(b.ie || '', 'es');
    });

    const footerInfo = modalWrap.querySelector('#m_jec_footer_info');
    if (footerInfo) footerInfo.textContent = `Mostrando ${list.length} de ${padron.length} instituciones`;

    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--ink-soft)">No se encontraron colegios con el filtro actual.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(c => {
      const d = draftMap.get(c.id) || { esJec: false, cantCoordPedag: 1, cantCoordTutoria: 1 };
      const rowBg = d.esJec ? 'background:rgba(37,99,235,0.06);' : '';
      const reiVal = normalizeReiNumber(c.rei || c.red) || c.rei || '—';

      return `
        <tr data-cid="${esc(c.id)}" style="${rowBg}border-bottom:1px solid var(--line)">
          <td style="text-align:center;padding:6px">
            <input type="checkbox" class="mJecCheck" data-cid="${esc(c.id)}" ${d.esJec ? 'checked' : ''} style="width:17px;height:17px;cursor:pointer;accent-color:#1d4ed8">
          </td>
          <td style="padding:6px"><span class="badge" style="font-size:10.5px">${esc(reiVal)}</span></td>
          <td style="padding:6px"><code>${esc(c.codigoLocal || '—')}</code></td>
          <td style="padding:6px">
            <div style="font-weight:600;font-size:12.5px;color:var(--navy-900)">${esc(c.ie || '—')}</div>
            <div style="font-size:10.5px;color:var(--ink-soft)">${esc(c.nivelServicio || c.modalidad || 'EBR')} · ${esc(c.distrito || '')}</div>
          </td>
          <td style="padding:6px;font-size:11.5px">${esc(c.distrito || '—')}</td>
          <td style="text-align:center;padding:6px">
            <input type="number" class="mJecPedag" data-cid="${esc(c.id)}" min="1" max="10" value="${d.cantCoordPedag}" style="width:52px;padding:3px 4px;font-size:12px;text-align:center;border:1px solid var(--line);border-radius:4px" ${d.esJec ? '' : 'disabled'}>
          </td>
          <td style="text-align:center;padding:6px">
            <input type="number" class="mJecTutoria" data-cid="${esc(c.id)}" min="1" max="10" value="${d.cantCoordTutoria}" style="width:52px;padding:3px 4px;font-size:12px;text-align:center;border:1px solid var(--line);border-radius:4px" ${d.esJec ? '' : 'disabled'}>
          </td>
        </tr>
      `;
    }).join('');

    // Listeners de checkboxes e inputs
    tbody.querySelectorAll('.mJecCheck').forEach(cb => {
      cb.addEventListener('change', () => {
        const cid = cb.dataset.cid;
        const d = draftMap.get(cid);
        if (!d) return;
        d.esJec = cb.checked;
        const row = cb.closest('tr');
        if (row) {
          row.style.background = d.esJec ? 'rgba(37,99,235,0.06)' : '';
          const pInp = row.querySelector('.mJecPedag');
          const tInp = row.querySelector('.mJecTutoria');
          if (pInp) pInp.disabled = !d.esJec;
          if (tInp) tInp.disabled = !d.esJec;
        }
        updateBadgeAndCounter();
      });
    });

    tbody.querySelectorAll('.mJecPedag').forEach(inp => {
      inp.addEventListener('change', () => {
        const cid = inp.dataset.cid;
        const d = draftMap.get(cid);
        if (d) d.cantCoordPedag = Math.max(1, parseInt(inp.value, 10) || 1);
      });
    });

    tbody.querySelectorAll('.mJecTutoria').forEach(inp => {
      inp.addEventListener('change', () => {
        const cid = inp.dataset.cid;
        const d = draftMap.get(cid);
        if (d) d.cantCoordTutoria = Math.max(1, parseInt(inp.value, 10) || 1);
      });
    });
  };

  // Pestañas
  const tabBtns = modalWrap.querySelectorAll('.mJecTab');
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === currentTab) {
      btn.style.background = 'var(--primary)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--primary)';
    }
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      tabBtns.forEach(b => {
        b.style.background = 'var(--surface)';
        b.style.color = 'var(--ink)';
        b.style.borderColor = 'var(--line)';
      });
      btn.style.background = 'var(--primary)';
      btn.style.color = '#fff';
      btn.style.borderColor = 'var(--primary)';
      renderTableRows();
    });
  });

  // Buscador
  const searchInp = modalWrap.querySelector('#m_jec_search');
  if (searchInp) {
    searchInp.addEventListener('input', () => {
      currentSearch = searchInp.value;
      renderTableRows();
    });
  }

  // Cerrar / Cancelar
  const close = () => { modalWrap.remove(); };
  modalWrap.querySelector('#m_jec_close')?.addEventListener('click', close);
  modalWrap.querySelector('#m_jec_cancel')?.addEventListener('click', close);
  modalWrap.addEventListener('click', (e) => { if (e.target === modalWrap) close(); });

  // Guardar
  const saveBtn = modalWrap.querySelector('#m_jec_save');
  saveBtn.addEventListener('click', async () => {
    const changed = [];
    padron.forEach(c => {
      const origEsJec = Boolean(c.esJec === true || c.es_jec === true || String(c.modelo || '').toUpperCase() === 'JEC');
      const origPedag = Math.max(1, Number(c.cantCoordPedag) || 1);
      const origTut = Math.max(1, Number(c.cantCoordTutoria) || 1);
      const cur = draftMap.get(c.id);
      if (!cur) return;
      if (cur.esJec !== origEsJec || cur.cantCoordPedag !== origPedag || cur.cantCoordTutoria !== origTut) {
        changed.push({ c, esJec: cur.esJec, cantCoordPedag: cur.cantCoordPedag, cantCoordTutoria: cur.cantCoordTutoria });
      }
    });

    if (changed.length === 0) {
      showToast('No se realizaron cambios en la selección JEC.');
      close();
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = `Guardando ${changed.length} instituciones...`;

    try {
      const now = Date.now();
      if (dbNs && typeof dbNs.batch === 'function') {
        const batch = dbNs.batch();
        changed.forEach(item => {
          const ref = dbNs.collection('colegios').doc(item.c.id);
          batch.set(ref, {
            esJec: item.esJec,
            cantCoordPedag: item.cantCoordPedag,
            cantCoordTutoria: item.cantCoordTutoria,
            updatedAt: now
          }, { merge: true });
        });
        await batch.commit();
      } else if (dbNs) {
        await Promise.all(changed.map(item =>
          dbNs.collection('colegios').doc(item.c.id).set({
            esJec: item.esJec,
            cantCoordPedag: item.cantCoordPedag,
            cantCoordTutoria: item.cantCoordTutoria,
            updatedAt: now
          }, { merge: true })
        ));
      }

      // Actualizar los objetos en el array local state.colegios
      changed.forEach(item => {
        item.c.esJec = item.esJec;
        item.c.cantCoordPedag = item.cantCoordPedag;
        item.c.cantCoordTutoria = item.cantCoordTutoria;
        item.c.updatedAt = now;
      });

      showToast(`✓ Selección JEC guardada (${changed.length} instituciones actualizadas)`);
      close();
      if (typeof onSaved === 'function') onSaved();
    } catch (err) {
      console.error('Error al guardar selección JEC:', err);
      showToast('Error al guardar: ' + (err.message || 'error'));
      saveBtn.disabled = false;
      saveBtn.textContent = '✓ Guardar selección JEC';
    }
  });

  updateBadgeAndCounter();
  renderTableRows();
}
