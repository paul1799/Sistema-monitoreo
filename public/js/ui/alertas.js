/* =========================================================================
   ui/alertas.js — Monitoreo de alertas tempranas y variaciones de desempeño
   ========================================================================= */

import { esc, fmtDate } from './core-utils.js';
import { statusFromPct, scoreValue } from './scoring.js';

let alertFilters = { fichaTypeId: '', ugel: '' };

export function renderAlertasTab(container, state, getFichaType) {
  const all = computeAlerts(state, getFichaType);
  let alerts = all;
  if (alertFilters.fichaTypeId) alerts = alerts.filter(a => a.fichaTypeId === alertFilters.fichaTypeId);
  if (alertFilters.ugel) alerts = alerts.filter(a => (a.ugel || '').toLowerCase().includes(alertFilters.ugel.toLowerCase()));

  const instConAlerta = new Set(alerts.map(a => a.institucion + '|' + a.ugel)).size;
  const retrocesos = alerts.filter(a => a.trend === 'retroceso').length;
  const ftOpts = state.fichaTypes.map(ft => '<option value="' + ft.id + '"' + (ft.id === alertFilters.fichaTypeId ? ' selected' : '') + '>' + esc(ft.nombre) + '</option>').join('');

  const rows = alerts.map(a => {
    const st = statusFromPct(a.pct);
    return '<tr>' +
      '<td><strong>' + esc(a.institucion) + '</strong><br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(a.ugel || '') + '</span></td>' +
      '<td>' + esc(a.fichaTypeNombre) + '<br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(a.seccion) + '</span></td>' +
      '<td style="max-width:340px">' + esc(a.item) + '</td>' +
      '<td>' + a.pct + '% <span class="badge ' + st.cls + '">' + st.label + '</span>' +
      (a.trend === 'retroceso' ? ' <span class="badge st-inicio" title="Bajó respecto a la visita anterior">▼ retrocedió</span>' : '') +
      (a.trend === 'mejora' ? ' <span class="badge st-logrado" title="Mejoró respecto a la visita anterior">▲ mejoró</span>' : '') +
      '</td>' +
      '<td>' + fmtDate(a.fecha) + (a.visita ? ' · V' + a.visita : '') + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:26px">Sin alertas con los filtros actuales.</td></tr>';

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Alertas de seguimiento</h2><p>Cruce automático de institución + tipo de ficha + ítem exacto, a partir de la visita más reciente registrada. Prioriza dónde intervenir primero.</p></div>' +
    '<div class="cards">' +
    '<div class="card"><div class="num">' + alerts.length + '</div><div class="lbl">Alertas activas</div></div>' +
    '<div class="card"><div class="num">' + instConAlerta + '</div><div class="lbl">Instituciones con alertas</div></div>' +
    '<div class="card"><div class="num">' + retrocesos + '</div><div class="lbl">Ítems en retroceso</div></div>' +
    '</div>' +
    '<div class="panel">' +
    '<div class="filterBar">' +
    '<div class="field"><label>Tipo de ficha</label><select id="al_ft"><option value="">Todos</option>' + ftOpts + '</select></div>' +
    '<div class="field"><label>UGEL</label><input type="search" id="al_ugel" value="' + esc(alertFilters.ugel) + '" placeholder="Buscar..."></div>' +
    '</div>' +
    '<div class="tblWrap"><table><thead><tr><th>Institución</th><th>Ficha / sección</th><th>Ítem</th><th>Resultado</th><th>Última visita</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>';

  document.getElementById('al_ft').addEventListener('change', e => { alertFilters.fichaTypeId = e.target.value; renderAlertasTab(container, state, getFichaType); });
  document.getElementById('al_ugel').addEventListener('input', e => { alertFilters.ugel = e.target.value; renderAlertasTab(container, state, getFichaType); });
}

function computeAlerts(state, getFichaType) {
  const groups = {};
  state.submissions.forEach(s => { const key = s.fichaTypeId + '|' + (s.institucion || '') + '|' + (s.ugel || ''); (groups[key] = groups[key] || []).push(s); });
  const alerts = [];
  Object.values(groups).forEach(list => {
    const ft = getFichaType(list[0].fichaTypeId);
    if (!ft) return;
    list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt || 0) - (a.createdAt || 0));
    const latest = list[0], prev = list[1] || null;
    const latestMap = {}; (latest.respuestas || []).forEach(r => latestMap[r.id] = r.valor);
    const prevMap = {}; if (prev) (prev.respuestas || []).forEach(r => prevMap[r.id] = r.valor);
    ft.secciones.forEach(sec => sec.items.forEach(it => {
      const sc = scoreValue(ft.tipoRespuesta, latestMap[it.id]);
      if (sc === null) return;
      const pct = Math.round(sc * 100);
      const status = statusFromPct(pct);
      let trend = null;
      const psc = prev ? scoreValue(ft.tipoRespuesta, prevMap[it.id]) : null;
      if (psc !== null) { const ppct = Math.round(psc * 100); if (pct <= ppct - 15) trend = 'retroceso'; else if (pct >= ppct + 15) trend = 'mejora'; }
      if (status.label === 'Inicio' || trend === 'retroceso') {
        alerts.push({ institucion: latest.institucion, ugel: latest.ugel, fichaTypeId: ft.id, fichaTypeNombre: ft.nombre, seccion: sec.nombre, item: it.texto, pct, status: status.label, trend, fecha: latest.fecha, visita: latest.visita });
      }
    }));
  });
  alerts.sort((a, b) => (a.trend === 'retroceso' ? -1 : 0) - (b.trend === 'retroceso' ? -1 : 0) || a.pct - b.pct);
  return alerts;
}

