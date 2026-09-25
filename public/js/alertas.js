import { esc, fmtDate, showToast } from './ui.js?v=20260925_v8';

let alertFilters = { fichaTypeId: '', ugel: '' };

export function renderAlertasTab(container, state, getFichaType, dbNs, currentUser, isAdmin) {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // 1. Compromisos
  let compromisos = (state.compromisos || []).filter(c => {
    if (c.estado === 'Cumplido' || c.estado === 'Anulado') return false;
    // Solo mostrar compromisos vencidos o por vencer (< 7 dias)
    const plazoMs = new Date(c.plazo + 'T00:00:00').getTime();
    return ((plazoMs - now) / dayMs) <= 7;
  });

  if (alertFilters.ugel) compromisos = compromisos.filter(c => (c.ugel || '').toLowerCase().includes(alertFilters.ugel.toLowerCase()));

  // Ordenar compromisos: más urgentes (menor plazo) primero
  compromisos.sort((a, b) => new Date(a.plazo).getTime() - new Date(b.plazo).getTime());

  // 2. Fichas en borrador > 3 días
  let borradores = (state.submissions || []).filter(s => {
    if (!s.esBorrador) return false;
    return ((now - (s.createdAt || now)) / dayMs) > 3;
  });
  if (alertFilters.fichaTypeId) borradores = borradores.filter(b => b.fichaTypeId === alertFilters.fichaTypeId);
  if (alertFilters.ugel) borradores = borradores.filter(b => (b.ugel || '').toLowerCase().includes(alertFilters.ugel.toLowerCase()));
  borradores.sort((a, b) => a.createdAt - b.createdAt);

  // 3. Ítems críticos (retrocesos o Inicio) - la lógica anterior
  const allCriticos = computeCriticos(state, getFichaType);
  let criticos = allCriticos;
  if (alertFilters.fichaTypeId) criticos = criticos.filter(a => a.fichaTypeId === alertFilters.fichaTypeId);
  if (alertFilters.ugel) criticos = criticos.filter(a => (a.ugel || '').toLowerCase().includes(alertFilters.ugel.toLowerCase()));

  const compRows = compromisos.map(c => {
    const isVencido = new Date(c.plazo + 'T00:00:00').getTime() < now;
    const canEdit = isAdmin || (currentUser && c.responsableFichaDni === currentUser.uid); // Simplified auth check
    const btn = canEdit ? `<button type="button" class="btn btn-sm btnCumplir" data-cid="${esc(c.id)}">Cumplido ✓</button>` : '';
    return '<tr>' +
      '<td><strong>' + esc(c.institucion) + '</strong><br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(c.ugel || '') + '</span></td>' +
      '<td>' + esc(c.responsableFicha || 'Monitor') + '</td>' +
      '<td>' + esc(c.responsable) + '</td>' +
      '<td style="max-width:340px">' + esc(c.texto) + '</td>' +
      '<td>' + fmtDate(c.plazo) + ' ' + (isVencido ? '<span class="badge st-inicio">Vencido</span>' : '<span class="badge st-proceso">Por vencer</span>') + '</td>' +
      '<td>' + btn + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--ink-soft);padding:26px">No hay compromisos urgentes o vencidos.</td></tr>';

  const borRows = borradores.map(b => {
    const days = Math.floor((now - b.createdAt) / dayMs);
    const ft = getFichaType(b.fichaTypeId);
    return '<tr>' +
      '<td><strong>' + esc(b.institucion) + '</strong><br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(b.ugel || '') + '</span></td>' +
      '<td>' + esc(ft ? ft.nombre : 'Ficha') + '</td>' +
      '<td>' + esc(b.responsable || '') + '</td>' +
      '<td>' + fmtDate(new Date(b.createdAt).toISOString().split('T')[0]) + '</td>' +
      '<td><span class="badge st-inicio">Hace ' + days + ' días</span></td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:26px">No hay fichas en borrador estancadas.</td></tr>';

  const critRows = criticos.map(a => {
    return '<tr>' +
      '<td><strong>' + esc(a.institucion) + '</strong><br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(a.ugel || '') + '</span></td>' +
      '<td>' + esc(a.fichaTypeNombre) + '<br><span style="color:var(--ink-soft);font-size:11.5px">' + esc(a.seccion) + '</span></td>' +
      '<td style="max-width:340px">' + esc(a.item) + '</td>' +
      '<td>' + a.pct + '% <span class="badge ' + a.st.cls + '">' + a.st.label + '</span>' +
      (a.trend === 'retroceso' ? ' <span class="badge st-inicio" title="Bajó respecto a la visita anterior">▼ retrocedió</span>' : '') +
      '</td>' +
      '<td>' + fmtDate(a.fecha) + (a.visita ? ' · V' + a.visita : '') + '</td>' +
      '</tr>';
  }).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--ink-soft);padding:26px">Sin ítems críticos.</td></tr>';

  const ftOpts = state.fichaTypes.map(ft => '<option value="' + ft.id + '"' + (ft.id === alertFilters.fichaTypeId ? ' selected' : '') + '>' + esc(ft.nombre) + '</option>').join('');

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Alertas y Seguimiento</h2><p>Vencimiento de compromisos, fichas en borrador e ítems críticos en retroceso.</p></div>' +
    '<div class="cards">' +
    '<div class="card"><div class="num" style="color:var(--danger)">' + compromisos.length + '</div><div class="lbl">Compromisos críticos</div></div>' +
    '<div class="card"><div class="num" style="color:var(--warning)">' + borradores.length + '</div><div class="lbl">Fichas atascadas</div></div>' +
    '<div class="card"><div class="num">' + criticos.length + '</div><div class="lbl">Ítems críticos</div></div>' +
    '</div>' +
    
    '<div class="panel" style="margin-bottom: 24px">' +
    '<div class="filterBar">' +
    '<div class="field"><label>Tipo de ficha (Afecta borradores y críticos)</label><select id="al_ft"><option value="">Todos</option>' + ftOpts + '</select></div>' +
    '<div class="field"><label>UGEL</label><input type="search" id="al_ugel" value="' + esc(alertFilters.ugel) + '" placeholder="Buscar..."></div>' +
    '</div>' +
    '</div>' +

    '<h3 class="sectionTitle">Compromisos vencidos o por vencer (7 días)</h3>' +
    '<div class="panel" style="margin-bottom: 24px">' +
    '<div class="tblWrap"><table><thead><tr><th>Institución</th><th>Registrado por</th><th>Responsable (Tarea)</th><th>Compromiso</th><th>Plazo</th><th>Acción</th></tr></thead><tbody>' + compRows + '</tbody></table></div>' +
    '</div>' +

    '<h3 class="sectionTitle">Fichas en borrador por más de 3 días</h3>' +
    '<div class="panel" style="margin-bottom: 24px">' +
    '<div class="tblWrap"><table><thead><tr><th>Institución</th><th>Tipo de ficha</th><th>Monitor</th><th>Iniciada</th><th>Tiempo</th></tr></thead><tbody>' + borRows + '</tbody></table></div>' +
    '</div>' +

    '<h3 class="sectionTitle">Ítems con nivel Inicio o en retroceso</h3>' +
    '<div class="panel" style="margin-bottom: 24px">' +
    '<div class="tblWrap"><table><thead><tr><th>Institución</th><th>Ficha / sección</th><th>Ítem</th><th>Resultado</th><th>Última visita</th></tr></thead><tbody>' + critRows + '</tbody></table></div>' +
    '</div>';

  document.getElementById('al_ft').addEventListener('change', e => { alertFilters.fichaTypeId = e.target.value; renderAlertasTab(container, state, getFichaType, dbNs, currentUser, isAdmin); });
  document.getElementById('al_ugel').addEventListener('input', e => { alertFilters.ugel = e.target.value; renderAlertasTab(container, state, getFichaType, dbNs, currentUser, isAdmin); });

  // Bind fulfill buttons
  container.querySelectorAll('.btnCumplir').forEach(btn => {
    btn.addEventListener('click', async () => {
      const cid = btn.dataset.cid;
      if (!confirm('¿Marcar este compromiso como cumplido?')) return;
      btn.disabled = true;
      btn.textContent = 'Guardando...';
      try {
        const batch = dbNs.batch();
        batch.update(dbNs.collection('compromisos').doc(cid), { estado: 'Cumplido', updatedAt: Date.now() });
        await batch.commit();
        showToast('Compromiso marcado como cumplido.');
      } catch (err) {
        console.error(err);
        showToast('Error al actualizar el compromiso.');
        btn.disabled = false;
        btn.textContent = 'Cumplido ✓';
      }
    });
  });
}

function computeCriticos(state, getFichaType) {
  const groups = {};
  state.submissions.forEach(s => { 
    if (s.esBorrador) return; 
    const key = s.fichaTypeId + '|' + (s.institucion || '') + '|' + (s.ugel || ''); 
    (groups[key] = groups[key] || []).push(s); 
  });
  const alerts = [];
  Object.values(groups).forEach(list => {
    const ft = getFichaType(list[0].fichaTypeId);
    if (!ft) return;
    list.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt || 0) - (a.createdAt || 0));
    const latest = list[0], prev = list[1] || null;
    const latestMap = {}; (latest.respuestas || []).forEach(r => latestMap[r.id] = r.valor);
    const prevMap = {}; if (prev) (prev.respuestas || []).forEach(r => prevMap[r.id] = r.valor);
    
    // Simplistic score value logic inside this module just for alerts
    const getScore = (val) => {
      if (val === 'si') return 1; if (val === 'no') return 0;
      if (val === 'logrado') return 1; if (val === 'proceso') return 0.5; if (val === 'inicio') return 0;
      return null;
    };

    ft.secciones.forEach(sec => sec.items.forEach(it => {
      const sc = getScore(latestMap[it.id]);
      if (sc === null) return;
      const pct = Math.round(sc * 100);
      let stLabel = 'Por mejorar', stCls = 'st-inicio';
      if (pct >= 85) { stLabel = 'Logrado'; stCls = 'st-logrado'; }
      else if (pct >= 70) { stLabel = 'En proceso'; stCls = 'st-proceso'; }
      
      let trend = null;
      const psc = prev ? getScore(prevMap[it.id]) : null;
      if (psc !== null) { 
        const ppct = Math.round(psc * 100); 
        if (pct <= ppct - 15) trend = 'retroceso'; 
        else if (pct >= ppct + 15) trend = 'mejora'; 
      }
      if (stLabel === 'Inicio' || stLabel === 'Por mejorar' || trend === 'retroceso') {
        alerts.push({ institucion: latest.institucion, ugel: latest.ugel, fichaTypeId: ft.id, fichaTypeNombre: ft.nombre, seccion: sec.nombre, item: it.texto, pct, st: {label: stLabel, cls: stCls}, trend, fecha: latest.fecha, visita: latest.visita });
      }
    }));
  });
  alerts.sort((a, b) => (a.trend === 'retroceso' ? -1 : 0) - (b.trend === 'retroceso' ? -1 : 0) || a.pct - b.pct);
  return alerts;
}

export function getAlertCount(state, getFichaType) {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  let count = 0;

  if (state.compromisos) {
    count += state.compromisos.filter(c => {
      if (c.estado === 'Cumplido' || c.estado === 'Anulado') return false;
      const plazoMs = new Date(c.plazo + 'T00:00:00').getTime();
      return ((plazoMs - now) / dayMs) <= 7;
    }).length;
  }

  if (state.submissions) {
    count += state.submissions.filter(s => {
      if (!s.esBorrador) return false;
      return ((now - (s.createdAt || now)) / dayMs) > 3;
    }).length;
  }

  const criticos = computeCriticos(state, getFichaType);
  count += criticos.length;

  return count;
}
