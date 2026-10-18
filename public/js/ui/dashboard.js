/* =========================================================================
   ui/dashboard.js — Panel de control y métricas resumidas globales
   ========================================================================= */

import { esc, fmtDate } from './core-utils.js';
import { statusFromPct, bar, stackedBar, computeStats, donutChart } from './scoring.js';
import { getDashboardSortAsc, setDashboardSortAsc } from './state.js';
import { deduplicateTwinSubmissions } from './consolidado.js';
import { isFichaEbrGestionEscolar } from '../calcEngine.js';

/* ============================= DASHBOARD (RESUMEN GENERAL) ============================= */
export function viewDashboard(state, getFichaType, renderFn) {
  const totalTipos = state.fichaTypes.length;
  const cleanSubs = deduplicateTwinSubmissions(state.submissions || []);
  const totalFichas = cleanSubs.length;
  const instSet = new Set(cleanSubs.map(s => (s.institucion || '') + '|' + (s.ugel || '')));

  let sumPct = 0, cntPct = 0;
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  const perTipo = {};
  state.fichaTypes.forEach(ft => perTipo[ft.id] = { ft, count: 0, sum: 0, cnt: 0, last: null });

  cleanSubs.forEach(s => {
    const ft = getFichaType(s.fichaTypeId);
    const isEbr = isFichaEbrGestionEscolar(ft || s);
    const st = ft ? computeStats(s, ft) : { pct: null };
    if (st.pct !== null) { sumPct += st.pct; cntPct++; }
    let sLower = '';
    if (isEbr && st.pct !== null) {
      sLower = st.pct >= 67 ? 'logrado' : (st.pct >= 34 ? 'proceso' : 'inicio');
    } else {
      const status = st.estado?.estado_panel || st.estado?.label || statusFromPct(st.pct, ft, st?.conteo_si, st?.puntaje, s.visita).label;
      sLower = String(status || '').toLowerCase();
    }
    if (sLower.includes('lograd') || sLower.includes('cumple')) dist.logrado++;
    else if (sLower.includes('proces') || sLower.includes('parcial')) dist.proceso++;
    else if (sLower.includes('inici') || sLower.includes('incipient') || sLower.includes('mejorar')) dist.inicio++;
    else dist.none++;

    if (perTipo[s.fichaTypeId]) {
      const p = perTipo[s.fichaTypeId];
      p.count++;
      if (st.pct !== null) { p.sum += st.pct; p.cnt++; }
      if (!p.last || s.fecha > p.last) p.last = s.fecha;
    }
  });
  const avgPct = cntPct ? Math.round(sumPct / cntPct) : null;
  const totalConDatos = dist.logrado + dist.proceso + dist.inicio + dist.none;

  // Ordenamiento de tipos de ficha: urgente primero por defecto
  const sortedTipos = Object.values(perTipo).sort((a, b) => {
    const avgA = a.cnt ? (a.sum / a.cnt) : (getDashboardSortAsc() ? -1 : 101);
    const avgB = b.cnt ? (b.sum / b.cnt) : (getDashboardSortAsc() ? -1 : 101);
    return getDashboardSortAsc() ? avgA - avgB : avgB - avgA;
  });

  const tipoTableRows = sortedTipos.map(p => {
    const avg = p.cnt ? Math.round(p.sum / p.cnt) : null;
    const status = statusFromPct(avg, p.ft);
    const fullNombre = esc(p.ft.nombre);
    const icono = p.ft.icono || '📋';
    return '<tr>' +
      '<td class="tipoNombreCol" title="' + fullNombre + '">' +
      '<div style="display:flex;align-items:flex-start;gap:9px">' +
      '<span style="font-size:16px;line-height:1.2">' + icono + '</span>' +
      '<div>' +
      '<div style="font-weight:600;line-height:1.35;color:var(--text-900)">' + fullNombre + '</div>' +
      (p.ft.descripcion ? '<small style="color:var(--text-600);display:block;margin-top:2px">' + esc(p.ft.descripcion) + '</small>' : '') +
      '</div>' +
      '</div>' +
      '</td>' +
      '<td style="text-align:center;font-weight:600;color:var(--text-900)">' + p.count + '</td>' +
      '<td>' + bar(avg) + '</td>' +
      '<td style="text-align:right;font-weight:700;color:var(--text-900)">' + (avg === null ? '—' : avg + '%') + '</td>' +
      '<td style="text-align:center"><span class="badge ' + status.cls + '">' + status.label + '</span></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-600);padding:24px">Aún no hay tipos de ficha registrados.</td></tr>';

  // Porcentajes de la distribución
  const pctLogrado = totalConDatos ? Math.round((dist.logrado / totalConDatos) * 100) : 0;
  const pctProceso = totalConDatos ? Math.round((dist.proceso / totalConDatos) * 100) : 0;
  const pctInicio = totalConDatos ? Math.round((dist.inicio / totalConDatos) * 100) : 0;
  const pctNone = totalConDatos ? Math.round((dist.none / totalConDatos) * 100) : 0;

  const seg = '<div class="distWrap">' +
    donutChart([
      { value: dist.logrado, color: 'var(--ok)', label: 'Logrado' },
      { value: dist.proceso, color: 'var(--warn)', label: 'En proceso' },
      { value: dist.inicio, color: 'var(--danger)', label: 'Por mejorar' },
      { value: dist.none, color: 'var(--neutral)', label: 'Sin datos' },
    ], { centerLabel: totalFichas, centerSub: 'fichas' }) +
    '<div class="seglegend">' +
    '<span><span class="dot" style="background:var(--ok)"></span><strong>Logrado:</strong> ' + dist.logrado + ' (' + pctLogrado + '%)</span>' +
    '<span><span class="dot" style="background:var(--warn)"></span><strong>En proceso:</strong> ' + dist.proceso + ' (' + pctProceso + '%)</span>' +
    '<span><span class="dot" style="background:var(--danger)"></span><strong>Por mejorar:</strong> ' + dist.inicio + ' (' + pctInicio + '%)</span>' +
    (dist.none ? '<span><span class="dot" style="background:var(--neutral)"></span><strong>Sin datos:</strong> ' + dist.none + ' (' + pctNone + '%)</span>' : '') +
    '</div></div>';

  // Actividad Reciente
  const recent = [...cleanSubs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 8).map(s => {
    const ft = getFichaType(s.fichaTypeId);
    const st = ft ? computeStats(s, ft) : { pct: null };
    const status = (st && st.estado && st.estado.label) ? { label: st.estado.label, cls: st.estado.cls } : statusFromPct(st.pct, ft, st?.conteo_si, st?.puntaje);
    return '<tr><td>' + fmtDate(s.fecha) + '</td><td>' + esc(s.institucion) + '</td><td>' + esc(s.fichaTypeNombre || (ft ? ft.nombre : '—')) + '</td><td>' + (s.visita ? 'V' + s.visita : '—') + '</td><td>' + (st.pct === null ? '—' : st.pct + '%') + '</td><td><span class="badge ' + status.cls + '">' + status.label + '</span></td></tr>';
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-600);padding:24px">Aún no se han registrado fichas.</td></tr>';

  // Configurar listeners una vez renderizado en el DOM
  setTimeout(() => {
    const sortBtn = document.getElementById('toggleDashSortBtn');
    if (sortBtn && renderFn) {
      sortBtn.addEventListener('click', () => {
        setDashboardSortAsc(!getDashboardSortAsc());
        renderFn();
      });
    }
  }, 0);

  return '' +
    '<div class="pageHead">' +
    '<h2>Resumen general</h2>' +
    '<p>Vista consolidada de monitoreo y niveles de avance institucional.</p>' +
    '</div>' +
    '<div class="cards">' +
    '<div class="card"><div class="num">' + totalTipos + '</div><div class="lbl">Tipos de ficha</div></div>' +
    '<div class="card"><div class="num">' + totalFichas + '</div><div class="lbl">Fichas registradas</div></div>' +
    '<div class="card"><div class="num">' + instSet.size + '</div><div class="lbl">Instituciones monitoreadas</div></div>' +
    '<div class="card"><div class="num">' + (avgPct === null ? '—' : avgPct + '%') + '</div><div class="lbl">Cumplimiento promedio</div></div>' +
    '</div>' +
    '<div class="panel">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;flex-wrap:wrap;gap:10px">' +
    '<h3 style="margin:0">Avance por tipo de ficha <small>cumplimiento institucional</small></h3>' +
    '<button class="btn secondary small" id="toggleDashSortBtn" type="button">' +
    (getDashboardSortAsc() ? '▲ Orden: Urgentes primero' : '▼ Orden: Mayor avance primero') +
    '</button>' +
    '</div>' +
    '<div class="tblWrap"><table class="tipoAvanceTable"><thead><tr><th>Tipo de ficha</th><th style="width:80px;text-align:center">Fichas</th><th style="min-width:180px">Avance</th><th style="width:70px;text-align:right">%</th><th style="width:110px;text-align:center">Estado</th></tr></thead><tbody>' + tipoTableRows + '</tbody></table></div>' +
    '</div>' +
    '<div class="panel"><h3>Distribución general de resultados</h3>' + seg + '</div>' +
    '<div class="panel"><h3>Actividad reciente</h3><div class="tblWrap"><table><thead><tr><th>Fecha</th><th>Institución</th><th>Tipo de ficha</th><th>Visita</th><th>%</th><th>Estado</th></tr></thead><tbody>' + recent + '</tbody></table></div></div>';
}

