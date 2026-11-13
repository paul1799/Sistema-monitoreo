/* =========================================================================
   features/reportes/kpis.js — Tarjetas KPI, dona de distribución y avance
   UGEL 03 · AGEBRE · Fase 2 Reorganización
   ========================================================================= */

import { esc, isFichaActiva } from '../../core/utils/index.js';
import { donutChart, bar, statusFromPct } from '../../ui/scoring.js';
import {
  isFichaEbrGestionEscolar,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico
} from '../../domain/fichas/index.js';

/**
 * Renderiza el gráfico de dona de distribución de resultados y su leyenda
 */
export function renderDistributionChartHtml(dist, vFilter = '', cardsHtml = '') {
  const colLog = 'var(--ok, #16a34a)';
  const colProc = 'var(--warn, #d97706)';
  const colIni = 'var(--danger, #dc2626)';

  const distTotal = dist.logrado + dist.proceso + dist.inicio + dist.none;
  const centerSubLabel = vFilter ? `fichas V${vFilter}` : 'fichas';
  const panelDistTitle = vFilter ? `Distribución de resultados · Visita ${vFilter}` : 'Distribución de resultados';

  // Porcentajes de distribución general asegurando suma al 100%
  const distSegments = [];
  if (dist.logrado) distSegments.push({ k: 'logrado', c: dist.logrado });
  if (dist.proceso) distSegments.push({ k: 'proceso', c: dist.proceso });
  if (dist.inicio) distSegments.push({ k: 'inicio', c: dist.inicio });
  if (dist.none) distSegments.push({ k: 'none', c: dist.none });

  const distPctMap = {};
  if (distTotal > 0) {
    let sFl = 0;
    const rems = distSegments.map(x => {
      const ex = (x.c / distTotal) * 100;
      const fl = Math.floor(ex);
      sFl += fl;
      return { k: x.k, fl, rem: ex - fl };
    });
    rems.sort((a, b) => b.rem - a.rem);
    let d = Math.round(100 - sFl);
    rems.forEach(r => {
      distPctMap[r.k] = r.fl + (d > 0 ? 1 : 0);
      if (d > 0) d--;
    });
  }

  const pLog = distPctMap.logrado !== undefined ? ' (' + distPctMap.logrado + '%)' : (distTotal ? ' (' + Math.round(dist.logrado / distTotal * 100) + '%)' : '');
  const pProc = distPctMap.proceso !== undefined ? ' (' + distPctMap.proceso + '%)' : (distTotal ? ' (' + Math.round(dist.proceso / distTotal * 100) + '%)' : '');
  const pIni = distPctMap.inicio !== undefined ? ' (' + distPctMap.inicio + '%)' : (distTotal ? ' (' + Math.round(dist.inicio / distTotal * 100) + '%)' : '');
  const pNone = distPctMap.none !== undefined ? ' (' + distPctMap.none + '%)' : (distTotal ? ' (' + Math.round(dist.none / distTotal * 100) + '%)' : '');

  const seg = '<div class="distWrap">' +
    donutChart([
      { value: dist.logrado, color: colLog, label: 'Logrado' },
      { value: dist.proceso, color: colProc, label: 'En proceso' },
      { value: dist.inicio, color: colIni, label: 'Inicio' },
      { value: dist.none, color: 'var(--line-strong, #94a3b8)', label: 'Sin datos' },
    ], { size: 165, stroke: 24, centerLabel: distTotal, centerSub: centerSubLabel }) +
    '<div class="seglegend" style="flex-direction:column;gap:8px;align-items:flex-start">' +
    '<span><span class="dot" style="background:' + colLog + '"></span>Logrado: <strong>' + dist.logrado + '</strong>' + pLog + '</span>' +
    '<span><span class="dot" style="background:' + colProc + '"></span>En proceso: <strong>' + dist.proceso + '</strong>' + pProc + '</span>' +
    '<span><span class="dot" style="background:' + colIni + '"></span>Inicio: <strong>' + dist.inicio + '</strong>' + pIni + '</span>' +
    (dist.none ? '<span><span class="dot" style="background:var(--line-strong, #94a3b8)"></span>Sin datos: <strong>' + dist.none + '</strong>' + pNone + '</span>' : '') +
    '</div></div>';

  const combinedHtml = cardsHtml ? `
    <div class="panel panelDistribucionYMetricas">
      <div class="panelDistribucionHead">
        <h3>${panelDistTitle}</h3>
      </div>
      <div class="distribucionMainFlex">
        <div class="distribucionChartSide">
          ${seg}
        </div>
        <div class="distribucionCardsSide">
          ${cardsHtml}
        </div>
      </div>
    </div>
  ` : seg;

  return { title: panelDistTitle, html: combinedHtml };
}

/**
 * Renderiza el avance general por tipo de ficha para el modo 'Todas las fichas'
 */
export function renderAllTypesSummaryHtml(statsList, getFichaType, isAllMode = false) {
  if (!isAllMode) return '';
  const typeAgg = {};
  statsList.forEach(x => {
    const tid = x.s.fichaTypeId;
    if (!typeAgg[tid]) {
      const tft = getFichaType(tid);
      typeAgg[tid] = { nombre: tft ? tft.nombre : 'Desconocido', icono: tft ? (tft.icono || '📋') : '📋', total: 0, sum: 0, cnt: 0, logrado: 0, proceso: 0, inicio: 0 };
    }
    const a = typeAgg[tid];
    a.total++;
    if (x.st.pct !== null) { a.sum += x.st.pct; a.cnt++; }
    const sFt = getFichaType(tid);
    const st = x.st?.estado?.estado_panel || statusFromPct(x.st.pct, sFt, x.st?.conteo_si, x.st?.puntaje).label;
    const stLower = String(st || '').toLowerCase();
    if (stLower.includes('no cumple') || stLower.includes('inici') || stLower.includes('incipient') || stLower.includes('mejorar')) a.inicio++;
    else if (stLower.includes('parcial') || stLower.includes('proces')) a.proceso++;
    else if (stLower.includes('lograd') || stLower.includes('cumple')) a.logrado++;
  });
  const typeSummaryRows = Object.values(typeAgg).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(a => {
    const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
    return '<div class="barRow" style="padding:8px 0">' +
      '<div class="name" style="min-width:240px">' + a.icono + ' ' + esc(a.nombre) +
      ' <span style="color:var(--ink-soft);font-weight:400;font-size:12px">(' + a.total + ' fichas)</span>' +
      '</div>' + bar(avg) +
      '<div class="val" style="min-width:60px;text-align:right">' + (avg === null ? '—' : avg + '%') + '</div>' +
      '<div style="display:flex;gap:4px;margin-left:8px">' +
      '<span class="badge st-logrado" style="font-size:10px">' + a.logrado + '</span>' +
      '<span class="badge st-proceso" style="font-size:10px">' + a.proceso + '</span>' +
      '<span class="badge st-inicio" style="font-size:10px">' + a.inicio + '</span>' +
      '</div>' +
      '</div>';
  }).join('');

  return '<div class="panel"><h3>Avance general por tipo de ficha</h3>' +
    '<p class="helpText" style="margin-top:0">Promedio de cumplimiento de cada tipo de ficha con su distribución de estados.</p>' +
    typeSummaryRows +
    '</div>';
}

/**
 * Renderiza la evolución temporal de cumplimiento por número de visita
 */
export function renderVisitsEvolutionHtml(statsList, ft, isAllMode = false, getFichaType = null) {
  const visAgg = {};
  statsList.forEach(x => {
    const v = Number(x.s.visita) || 1;
    if (!visAgg[v]) {
      visAgg[v] = { sumPct: 0, cnt: 0, sumPts: 0, cntPts: 0, items: [] };
    }
    if (x.st.pct !== null && x.st.pct !== undefined) {
      visAgg[v].sumPct += x.st.pct;
      visAgg[v].cnt++;
    }
    if (x.st.puntaje !== null && x.st.puntaje !== undefined) {
      visAgg[v].sumPts += x.st.puntaje;
      visAgg[v].cntPts++;
    }
    visAgg[v].items.push(x);
  });

  const visRows = Object.keys(visAgg).sort((a, b) => Number(a) - Number(b)).map(v => {
    const a = visAgg[v];
    const vNum = Number(v);
    const avg = a.cnt ? Math.round(a.sumPct / a.cnt) : null;
    const avgPts = a.cntPts ? Math.round(a.sumPts / a.cntPts) : null;
    const sampleItem = a.items[0];
    const sFt = (sampleItem && (isAllMode && getFichaType ? getFichaType(sampleItem.s.fichaTypeId) : ft)) || ft;
    const isEbr = isFichaEbrGestionEscolar(sFt);
    const isCoordTutoria = isFichaCoordTutoriaJec(sFt);
    const isCoordPedagogico = isFichaCoordPedagogico(sFt);
    const vSt = statusFromPct(avg, sFt, 0, avgPts, vNum);
    const maxPts = isEbr ? (vNum === 2 ? 69 : 57) : (isCoordTutoria ? 63 : (isCoordPedagogico ? 51 : null));
    const scoreTitle = ((isEbr || isCoordTutoria || isCoordPedagogico) && avgPts !== null)
      ? ' title="' + avgPts + '/' + maxPts + ' pts promedio (' + (avg === null ? '—' : avg + '%') + ')"'
      : (avg !== null ? ' title="' + avg + '%"' : '');

    return '<div class="barRow">' +
      '<div class="name">Visita ' + vNum + ' <span class="badge ' + vSt.cls + '" style="margin-left:8px;font-size:11px;vertical-align:middle;">' + vSt.label + '</span></div>' +
      bar(avg, vSt.cls, sFt) +
      '<div class="val"' + scoreTitle + '>' + (avg === null ? '—' : avg + '%') + '</div>' +
      '</div>';
  }).join('') || '<p class="helpText">Sin datos suficientes.</p>';

  return visRows;
}

/**
 * Renderiza las tarjetas de resumen KPI superiores
 */
export function renderKpiCardsHtml({
  targetModality,
  totalIesModalidad,
  iesEjecutadas,
  iesPendientes,
  coberturaPct,
  totalFichas,
  vFilter,
  avgPct,
  instCount,
  isAllMode,
  state
}) {
  if (targetModality) {
    return `
      <div class="cards cards-5col">
        <div class="card card-navy" title="Total de instituciones educativas ${targetModality} en el padrón según filtros activos">
          <div class="num">${totalIesModalidad}</div>
          <div class="lbl">Total IEs ${targetModality}</div>
        </div>
        <div class="card card-ok" title="Instituciones educativas que cuentan con al menos una ficha de monitoreo registrada">
          <div class="num" style="color:var(--ok, #16a34a)">${iesEjecutadas}</div>
          <div class="lbl">IEs Ejecutadas <span style="font-size:11px;color:var(--ok, #16a34a);font-weight:700">(${coberturaPct}%)</span></div>
        </div>
        <div class="card card-warn" id="kpiCardIesPendientes" title="Instituciones educativas de modalidad ${targetModality} pendientes de monitoreo (Clic para ir al directorio)" style="cursor:pointer">
          <div class="num" style="color:var(--warn, #d97706)">${iesPendientes}</div>
          <div class="lbl">IEs Pendientes ↓</div>
        </div>
        <div class="card card-blue" title="Cantidad total de fichas de monitoreo registradas con los filtros seleccionados">
          <div class="num">${totalFichas}</div>
          <div class="lbl">Fichas registradas ${vFilter ? `(V${vFilter})` : ''}</div>
        </div>
        <div class="card card-gold" title="Promedio general de cumplimiento en las fichas">
          <div class="num">${avgPct === null ? '—' : avgPct + '%'}</div>
          <div class="lbl">Cumplimiento promedio</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="cards">
      <div class="card card-blue"><div class="num">${totalFichas}</div><div class="lbl">Fichas registradas ${vFilter ? `(V${vFilter})` : ''}</div></div>
      <div class="card card-ok"><div class="num">${instCount}</div><div class="lbl">Instituciones</div></div>
      ${isAllMode ? `<div class="card card-navy"><div class="num">${(state.fichaTypes || []).filter(isFichaActiva).length}</div><div class="lbl">Tipos de ficha</div></div>` : ''}
      <div class="card card-gold"><div class="num">${avgPct === null ? '—' : avgPct + '%'}</div><div class="lbl">Cumplimiento promedio</div></div>
    </div>
  `;
}

