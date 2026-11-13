/* =========================================================================
   features/reportes/index.js — Orquestador central de Reportes y Consolidado
   UGEL 03 · AGEBRE · Fase 2 Reorganización
   ========================================================================= */

import {
  esc,
  fmtDate,
  todayStr,
  normalizeText,
  normalizeInstName,
  normalizeReiNumber,
  downloadCsv,
  showToast,
  isFichaActiva
} from '../../core/utils/index.js';
import {
  setAppState,
  getAppState,
  setEditMode,
  clearEditMode,
  getSessionUser,
  setSessionUser,
  setRegSelectedTypeId,
  setRegBuiltFor,
  setRegSelectedColegioId,
  setRegTargetVisita,
  getRegTargetVisita
} from '../../core/state/app-state.js';
import { resetRegistrationSessionState } from '../registrar/state.js';
import {
  statusFromPct,
  getSubmissionResponsable,
  getResponsableForColegio,
  bar,
  donutChart,
  computeItemAgg,
  renderItemReportHtml,
  computeStats,
  stackedBar
} from '../../ui/scoring.js';
import {
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  ESPECIALISTA_JEC_OFICIAL,
  isFichaEbrGestionEscolar,
  isFichaMaterialesCebe,
  isFichaEbrEbePrite,
  isFichaJec1erMomento,
  getMomentoVisitaEbr,
  getNivelEbrGestion,
  getSubmissionVisitaNum
} from '../../domain/fichas/index.js';
import {
  isFichaJec
} from '../../jec-monitoreo.js';
import {
  isFichaCebeGestion,
  CEBE_SECCIONES
} from '../../cebe-gestion.js';
import {
  isFichaPriteGestion,
  PRITE_SECCIONES
} from '../../prite-gestion.js';
import {
  getEbrSeccionesForVisita
} from '../../ebr-gestion.js';
import { MATERIALES_CEBE_SECCIONES } from '../../domain/fichas/catalogo-base.js';
import {
  getJecFichaConfig,
  buildJecVisitBadges,
  calculateJecPendingItems,
  renderJecPendingTabsHtml
} from '../../ui/jec-reportes.js';
import {
  openModalGestionJec
} from '../../ui/colegios-tab.js';

import {
  DEFAULT_FICHA_TYPES_METADATA,
  getEnrichedFichaType,
  consSelectedTypeId,
  consFilters,
  filtrosReporte,
  reportesExpandedGroups,
  pageFichasRegistradas,
  pageColegiosMonitoreados,
  pageColegiosPendientes,
  PAGE_SIZE_CONSOLIDADO,
  totalPagesFichasGlobal,
  totalPagesMonitoreadosGlobal,
  totalPagesPendientesGlobal,
  setPageFichasRegistradas,
  setPageColegiosMonitoreados,
  setPageColegiosPendientes,
  setTotalPagesFichasGlobal,
  setTotalPagesMonitoreadosGlobal,
  setTotalPagesPendientesGlobal,
  syncFiltersState,
  syncReportesUrl,
  loadReportesFiltersFromUrl,
  deduplicateTwinSubmissions,
  isModalityMatch,
  getSubmissionsForFichaType,
  getSubmissionStatusClean,
  getFilteredColegiosForReportesSearch,
  aplicarFiltrosReporte,
  countFichasForCard,
  getPeriodoFechas,
  openReportFiltersDrawer,
  closeReportFiltersDrawer,
  renderSection1Html,
  renderSection2Html,
  updateStickyReportesBar,
  updateSection2DynamicParts,
  filterCardsInDom,
  attachSection1Listeners,
  attachSection2Listeners,
  setRenderConsBodyHook,
  consExpanded,
  setConsExpanded,
  reportesHideTypes,
  setReportesHideTypes,
  reportesSearchTerm,
  setReportesSearchTerm,
  reportesFiltersInitialized,
  setReportesFiltersInitialized,
  currentReportPendingItems,
  setCurrentReportPendingItems,
  currentReportFt,
  setCurrentReportFt,
  currentPendingActiveTab,
  setCurrentPendingActiveTab
} from './filters.js';

import {
  renderDistributionChartHtml,
  renderAllTypesSummaryHtml,
  renderVisitsEvolutionHtml,
  renderKpiCardsHtml
} from './kpis.js';

import {
  renderItemReportSectionHtml
} from './item-report.js';

import {
  buildPendingRowsHtml,
  buildDetail
} from './table.js?v=20261110_v1';

import { openDownloadConfigModal } from '../../ui/modales.js';
import {
  exportCsv,
  openModalLimpiarRegistros,
  exportFichaIndividualPdf,
  exportConsolidadoReportPdf,
  exportarMatrizSeguimiento,
  exportarTableroEBRCompleto
} from './export.js';

export * from './filters.js';
export * from './kpis.js';
export * from './item-report.js';
export * from './table.js?v=20261110_v1';
export * from './export.js';

export function renderConsolidadoTab(container, state, getFichaType, dbNs, isAdmin, navigate, currentUser = null) {
  if (currentUser) setSessionUser(currentUser);
  const user = currentUser || getSessionUser() || (state && state.currentUser) || null;

  const activeFichaTypes = (state.fichaTypes || []).filter(isFichaActiva);
  if (activeFichaTypes.length === 0) {
    container.innerHTML = '<div class="pageHead"><h2>Reportes</h2></div>' +
      '<div class="empty"><h4>Aún no hay tipos de ficha activos</h4><p>Activa una plantilla o crea un nuevo tipo de ficha para ver reportes de avance aquí.</p></div>';
    return;
  }

  // Cargar estado inicial desde URL o sessionStorage
  if (!reportesFiltersInitialized) {
    const loaded = loadReportesFiltersFromUrl(state);
    const initFt = loaded.tipo && loaded.tipo !== '__ALL__' ? state.fichaTypes.find(t => t.id === loaded.tipo) : null;
    if (initFt && (isFichaEbrGestionEscolar(initFt) || isFichaCebeGestion(initFt) || isFichaPriteGestion(initFt))) {
      const valid = ['1', '2', '3'];
      if (!loaded.visita || !valid.includes(String(loaded.visita))) {
        loaded.visita = '1';
      }
    }
    syncFiltersState(loaded);
    setReportesFiltersInitialized(true);
  }

  try {
    const savedHide = localStorage.getItem('reportes_hide_types');
    if (savedHide !== null) setReportesHideTypes(savedHide === 'true');
  } catch (_) { }

  // Determinar texto resumido de filtros activos para el botón del drawer
  let activeFilterLabel = 'Todos los filtros';
  if (filtrosReporte.tipo && filtrosReporte.tipo !== '__ALL__') {
    const activeFt = getFichaType(filtrosReporte.tipo);
    const ftName = activeFt ? (activeFt.nombreCorto || activeFt.nombre) : 'Ficha seleccionada';
    const visStr = filtrosReporte.visita ? ` · V${filtrosReporte.visita}` : '';
    const reiStr = filtrosReporte.red ? ` · REI ${filtrosReporte.red}` : '';
    activeFilterLabel = `${ftName}${visStr}${reiStr}`;
  }

  container.innerHTML = `
    <!-- Barra superior de Reportes con disparador de filtros visible en la parte superior izquierda -->
    <div class="reportTopbarWithTrigger" id="reportTopbarWithTrigger">
      <div class="reportTopbarLeft">
        <button type="button" class="btn btnFiltrosDrawerTrigger" id="btnOpenReportFiltersDrawer" title="Abrir opciones de tipo de ficha y filtros">
          <span style="font-size:16px">⚙️</span>
          <span>Filtros y Fichas</span>
          <span class="badgeActiveFiltersSummary" id="badgeActiveFiltersSummary">${esc(activeFilterLabel)}</span>
        </button>
        <div class="reportTopbarTitleWrap">
          <h2 style="margin:0;font-size:18px;font-weight:800;color:var(--navy-900);line-height:1.2">Reportes de Monitoreo</h2>
          <div style="margin-top:2px;font-size:11.5px;color:var(--text-600)">
            Avance institucional, análisis por indicador y seguimiento de colegios.
          </div>
        </div>
      </div>
    </div>

    <!-- Backdrop oscuro del drawer lateral -->
    <div id="reportFiltersDrawerBackdrop" class="reportFiltersDrawerBackdrop"></div>

    <!-- Drawer Lateral Deslizante con Tipo de Ficha y Filtros -->
    <aside id="reportFiltersDrawer" class="reportFiltersDrawer" aria-label="Filtros y Selección de Ficha">
      <div class="reportDrawerHeader">
        <div class="drawerHeaderLeft">
          <div class="drawerHeaderIcon">⚙️</div>
          <div class="drawerHeaderText">
            <h3>Filtros y Selección de Ficha</h3>
            <p>Configura parámetros de búsqueda y descarga de reportes</p>
          </div>
        </div>
        <button type="button" id="btnCloseReportFiltersDrawer" class="btnCloseDrawer" title="Cerrar panel de filtros (Esc)">✕</button>
      </div>
      <div class="reportDrawerBody">
        <div id="secTipoFicha" class="panel secReportesTipoFicha"></div>
        <div id="secFiltrosDescargas" class="panel secReportesFiltros"></div>
      </div>
    </aside>

    <div id="stickyReportesBar" class="stickyReportesBar" style="display:none"></div>
    <div id="consHost"></div>
  `;

  // Listeners del Drawer
  const btnOpen = container.querySelector('#btnOpenReportFiltersDrawer');
  const btnClose = container.querySelector('#btnCloseReportFiltersDrawer');
  const btnApply = container.querySelector('#btnApplyAndCloseDrawer');
  const backdrop = container.querySelector('#reportFiltersDrawerBackdrop');

  if (btnOpen) btnOpen.onclick = openReportFiltersDrawer;
  if (btnClose) btnClose.onclick = closeReportFiltersDrawer;
  if (btnApply) btnApply.onclick = closeReportFiltersDrawer;
  if (backdrop) backdrop.onclick = closeReportFiltersDrawer;

  window.removeEventListener('keydown', window._reportDrawerEscHandler || (() => { }));
  window._reportDrawerEscHandler = (e) => {
    if (e.key === 'Escape') closeReportFiltersDrawer();
  };
  window.addEventListener('keydown', window._reportDrawerEscHandler);

  const secTipo = document.getElementById('secTipoFicha');
  if (secTipo) secTipo.innerHTML = renderSection1Html(state, getFichaType, user);

  renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);

  // Listener para barra compacta flotante al hacer scroll
  const handleScroll = () => {
    const sBar = document.getElementById('stickyReportesBar');
    if (!sBar) return;
    if (window.scrollY > 120) {
      sBar.style.display = 'flex';
    } else {
      sBar.style.display = 'none';
    }
  };
  window.removeEventListener('scroll', window._reportesScrollHandler || (() => { }));
  window._reportesScrollHandler = handleScroll;
  window.addEventListener('scroll', handleScroll, { passive: true });
}


export function renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, currentUser = null, options = {}) {
  let opts = options;
  let userParam = currentUser;
  if (currentUser && typeof currentUser === 'object' && ('keepInputs' in currentUser)) {
    opts = currentUser;
    userParam = null;
  }
  if (userParam) setSessionUser(userParam);
  const user = userParam || getSessionUser() || (state && state.currentUser) || null;
  const keepInputs = Boolean(opts && opts.keepInputs);

  const host = document.getElementById('consHost');
  const secTipo = document.getElementById('secTipoFicha');
  const secFiltros = document.getElementById('secFiltrosDescargas');
  if (!host) return;

  const activeEl = document.activeElement;
  const activeId = activeEl ? activeEl.id : null;
  const selStart = (activeEl && typeof activeEl.selectionStart === 'number') ? activeEl.selectionStart : null;
  const selEnd = (activeEl && typeof activeEl.selectionEnd === 'number') ? activeEl.selectionEnd : null;

  // Actualizar URL
  syncReportesUrl(filtrosReporte);

  // Guardar última ficha seleccionada en sessionStorage
  try {
    sessionStorage.setItem('reportes_last_type', filtrosReporte.tipo || '__ALL__');
  } catch (_) { }

  // 1. Aplicar todos los filtros en el motor central
  const { subs, statsList, instCount, avgPct, dist, targetFt, isAllMode, hasInvalidDates } = aplicarFiltrosReporte(
    state.submissions,
    filtrosReporte,
    state,
    getFichaType,
    user
  );

  const ft = targetFt;

  // 2. Actualizar o renderizar Sección 1 (Tipo de Ficha)
  if (secTipo) {
    if (keepInputs && secTipo.querySelector('.fichaTypeItem, .fichaTypeCard')) {
      // Actualizar únicamente los contadores de las tarjetas en Sección 1 sin reconstruir el DOM
      secTipo.querySelectorAll('.fichaTypeCard').forEach(c => {
        const tid = c.dataset.typeId;
        const countSpan = c.querySelector('.fItemCount');
        if (tid && countSpan) {
          const count = countFichasForCard(tid, state.submissions, filtrosReporte, state, getFichaType, user);
          countSpan.textContent = `${count} fichas`;
          countSpan.className = `fItemCount ${count === 0 ? 'countZero' : 'countHas'}`;
          c.classList.toggle('isZero', count === 0);
        }
      });
    } else {
      const prevSearch = reportesSearchTerm;
      secTipo.innerHTML = renderSection1Html(state, getFichaType, user);
      const searchInp = secTipo.querySelector('#searchFichaType');
      if (searchInp && prevSearch) {
        searchInp.value = prevSearch;
        filterCardsInDom(prevSearch);
      }
      attachSection1Listeners(secTipo, state, getFichaType, dbNs, isAdmin, navigate, user);
    }
  }

  // 3. Renderizar Sección 2 (Filtros y Descargas)
  if (secFiltros) {
    const hasFormInputs = Boolean(secFiltros.querySelector('#fil_inst'));
    if (keepInputs && hasFormInputs) {
      updateSection2DynamicParts(secFiltros, statsList, instCount, ft, state, getFichaType, dbNs, isAdmin, navigate, user);
    } else {
      secFiltros.innerHTML = renderSection2Html(statsList, instCount, state, getFichaType, user, isAdmin);
      attachSection2Listeners(secFiltros, state, getFichaType, dbNs, isAdmin, navigate, user, statsList);
    }
  }

  // 4. Actualizar Sticky Bar y Badge del disparador
  updateStickyReportesBar(statsList, getFichaType);

  const triggerBadge = document.getElementById('badgeActiveFiltersSummary');
  if (triggerBadge) {
    let activeFilterLabel = 'Todos los filtros';
    if (filtrosReporte.tipo && filtrosReporte.tipo !== '__ALL__') {
      const activeFt = getFichaType(filtrosReporte.tipo);
      const ftName = activeFt ? (activeFt.nombreCorto || activeFt.nombre) : 'Ficha seleccionada';
      const visStr = filtrosReporte.visita ? ` · V${filtrosReporte.visita}` : '';
      const reiStr = filtrosReporte.red ? ` · REI ${filtrosReporte.red}` : '';
      activeFilterLabel = `${ftName}${visStr}${reiStr}`;
    }
    triggerBadge.textContent = activeFilterLabel;
  }

  // 5. Renderizar Gráficas, Indicadores y Tablas en consHost
  const colLog = 'var(--ok, #16a34a)';
  const colProc = 'var(--warn, #d97706)';
  const colIni = 'var(--danger, #dc2626)';

  const vFilter = filtrosReporte.visita ? String(filtrosReporte.visita).trim() : '';
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

  // Reporte por ítem (solo para tipo de ficha individual)
  let itemReportHtml = '';
  if (!isAllMode && ft) {
    const escalaRaw = String(ft.escala || '').toUpperCase();
    const tipoRespRaw = String(ft.tipoRespuesta || '').toLowerCase();
    const isSiNo = (tipoRespRaw === 'si_no' || escalaRaw === 'SI_NO' || escalaRaw === 'SI_NO_NA' || tipoRespRaw.includes('si_no') || escalaRaw.includes('SI_NO'));
    const isEbr = !isSiNo && isFichaEbrGestionEscolar(ft);
    let seccionesParaAgg = ft.secciones || [];
    if (isEbr) {
      const hasV3 = statsList.some(x => Number(x.s.visita) === 3);
      const hasV2 = statsList.some(x => Number(x.s.visita) === 2);
      const vTarget = hasV3 ? 3 : (hasV2 ? 2 : 1);
      seccionesParaAgg = getEbrSeccionesForVisita(vTarget, ft);
    } else if (!isSiNo && isFichaCebeGestion(ft)) {
      const isOfficialCebe = (ft.secciones?.length === 7 && ft.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 34);
      seccionesParaAgg = isOfficialCebe ? ft.secciones : CEBE_SECCIONES;
    } else if (!isSiNo && isFichaPriteGestion(ft)) {
      const isOfficialPrite = (ft.secciones?.length === 7 && ft.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 32);
      seccionesParaAgg = isOfficialPrite ? ft.secciones : PRITE_SECCIONES;
    } else if (isFichaMaterialesCebe(ft)) {
      const isOfficialMat = (ft.secciones?.length === 5 && ft.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 14);
      seccionesParaAgg = isOfficialMat ? ft.secciones : MATERIALES_CEBE_SECCIONES;
    }
    const secAgg = {};
    const normSec = (name) => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    seccionesParaAgg.forEach(sec => {
      const k = normSec(sec.nombre);
      secAgg[k] = { sum: 0, cnt: 0 };
    });
    statsList.forEach(x => (x.st.secciones || []).forEach((sc, sIdx) => {
      const k = normSec(sc.nombre);
      if (sc.pct !== null) {
        if (!secAgg[k]) secAgg[k] = { sum: 0, cnt: 0 };
        secAgg[k].sum += sc.pct;
        secAgg[k].cnt++;
        if (!secAgg[`idx_${sIdx}`]) secAgg[`idx_${sIdx}`] = { sum: 0, cnt: 0 };
        secAgg[`idx_${sIdx}`].sum += sc.pct;
        secAgg[`idx_${sIdx}`].cnt++;
      }
    }));

    const itemAgg = computeItemAgg(statsList.map(x => x.s), ft);
    itemAgg.forEach((sec, sIdx) => {
      const k = normSec(sec.nombre);
      const a = secAgg[k] || secAgg[`idx_${sIdx}`];
      if (a && a.cnt) {
        sec.avg = Math.round(a.sum / a.cnt);
      }
    });
    itemReportHtml = renderItemReportHtml(itemAgg, ft.tipoRespuesta, ft);
  }

  // Avance general por tipo de ficha (solo para modo "Todas")
  let allTypesSummaryHtml = '';
  if (isAllMode) {
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
    allTypesSummaryHtml = '<div class="panel"><h3>Avance general por tipo de ficha</h3>' +
      '<p class="helpText" style="margin-top:0">Promedio de cumplimiento de cada tipo de ficha con su distribución de estados.</p>' +
      typeSummaryRows +
      '</div>';
  }

  // Evolución por N° de visita
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
    const sFt = (sampleItem && (isAllMode ? getFichaType(sampleItem.s.fichaTypeId) : ft)) || ft;
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

  // Filas de tabla Fichas registradas (cuadro estático de 10 registros por página)
  const totalFichas = statsList.length;
  setTotalPagesFichasGlobal(Math.max(1, Math.ceil(totalFichas / PAGE_SIZE_CONSOLIDADO)));
  if (pageFichasRegistradas > totalPagesFichasGlobal) setPageFichasRegistradas(totalPagesFichasGlobal);
  if (pageFichasRegistradas < 1) setPageFichasRegistradas(1);

  const startIdxFichas = (pageFichasRegistradas - 1) * PAGE_SIZE_CONSOLIDADO;
  const endIdxFichas = Math.min(startIdxFichas + PAGE_SIZE_CONSOLIDADO, totalFichas);
  const pagedStatsList = statsList.slice(startIdxFichas, endIdxFichas);

  const tblTypeHeader = isAllMode ? '<th>Tipo de ficha</th>' : '';
  const rows = pagedStatsList.map(x => {
    const s = x.s; const st = x.st;
    const sFt = isAllMode ? getFichaType(s.fichaTypeId) : ft;
    const isEbr = isFichaEbrGestionEscolar(sFt || ft || s);
    const vNum = getSubmissionVisitaNum(s, sFt || ft);
    let status = null;
    if (st && st.estado && st.estado.label) {
      status = { label: st.estado.label, cls: st.estado.cls };
    } else {
      status = statusFromPct(st.pct, sFt, st?.conteo_si, st?.puntaje, vNum);
    }
    const isOpen = consExpanded === s.id;
    const detailContent = isOpen ? buildDetail(s) : '';
    const pdfBtn = '<button class="actBtn pdfBtn" data-pdfsub="' + s.id + '" title="Descargar Ficha Oficial en PDF (A4)">📄 PDF</button>';
    const editBtn = '<button class="actBtn" data-edit="' + s.id + '" title="Corregir ficha">✏️ Editar</button>';
    const delBtn = isAdmin ? '<button class="actBtn delBtn" data-del="' + s.id + '" title="Eliminar">✕</button>' : '';
    const typeName = s.fichaTypeNombre || (getFichaType(s.fichaTypeId) || {}).nombre || '—';
    const typeCol = isAllMode ? '<td><span class="badge st-none" style="font-size:10.5px">' + esc(typeName) + '</span></td>' : '';
    const ugelRedCol = '<td>' + esc(s.ugel || 'UGEL 03') + '<br><small style="color:var(--text-muted);font-weight:600;">' + esc(s.red || 'No aplica') + '</small></td>';
    const subResp = getSubmissionResponsable(s, state, user);
    const displayResp = (subResp && !/^\d+$/.test(subResp) && !subResp.includes('@') && subResp !== '—')
      ? subResp
      : ((s.responsable && !/^\d+$/.test(String(s.responsable).trim()) && !String(s.responsable).includes('@')) ? String(s.responsable).trim() : (subResp || '—'));
    const isCoordTutoria = isFichaCoordTutoriaJec(sFt || ft);
    const isCoordPedagogico = isFichaCoordPedagogico(sFt || ft);
    let pctDisplay = (st.pct === null ? '—' : st.pct + '%');
    if (isEbr && st.puntaje !== undefined && st.puntaje !== null) {
      const v = getMomentoVisitaEbr(s);
      const maxPts = st.puntaje_max || (v === 2 ? 69 : 57);
      pctDisplay = '<strong>' + st.puntaje + '/' + maxPts + ' pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    } else if (isCoordTutoria && st.puntaje !== undefined && st.puntaje !== null) {
      pctDisplay = '<strong>' + st.puntaje + '/63 pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    } else if (isCoordPedagogico && st.puntaje !== undefined && st.puntaje !== null) {
      pctDisplay = '<strong>' + st.puntaje + '/51 pts</strong><br><small style="color:var(--text-muted);font-weight:600">(' + st.pct + '%)</small>';
    }

    const visitaLabel = (sFt && !sFt.tieneVisitas && !s.visita) ? '—' : ('V' + vNum);
    return '<tr class="clickable" data-row="' + s.id + '"><td>' + fmtDate(s.fecha) + '</td><td>' + esc(s.institucion) + '</td>' + typeCol + ugelRedCol + '<td>' + visitaLabel + '</td><td>' + esc(displayResp) + '</td><td>' + pctDisplay + '</td><td><span class="badge ' + status.cls + '">' + status.label + '</span></td><td style="white-space:nowrap"><div class="rowActions">' + pdfBtn + editBtn + delBtn + '</div></td></tr>' +
      (isOpen ? '<tr class="detailRow"><td colspan="' + (isAllMode ? 9 : 8) + '">' + detailContent + '</td></tr>' : '');
  }).join('') || '<tr><td colspan="' + (isAllMode ? 9 : 8) + '" style="text-align:center;color:var(--text-600);padding:22px">No hay fichas que coincidan con los filtros.</td></tr>';

  // Resumen por institución
  const byInst = {};
  statsList.forEach(x => {
    const normInst = normalizeInstName(x.s.institucion || '');
    const normUgel = normalizeText(x.s.ugel || 'UGEL 03');
    const baseKey = x.s.colegioId ? ('col_' + x.s.colegioId) : (normInst + '|' + normUgel);
    // Group by institution (y ficha type solo en modo general)
    const key = isAllMode ? (baseKey + '|' + x.s.fichaTypeId) : baseKey;

    if (!byInst[key]) {
      const sFt = isAllMode ? getFichaType(x.s.fichaTypeId) : ft;
      byInst[key] = {
        colegioId: x.s.colegioId || null,
        institucion: x.s.institucion,
        ugel: x.s.ugel || 'UGEL 03',
        red: x.s.red || '',
        fichaTypeId: x.s.fichaTypeId,
        fichaTypeNombre: sFt ? (sFt.nombreCorto || sFt.nombre) : '',
        visitas: []
      };
    }
    // Evitar duplicados por id de submission en caso de race conditions en el estado local
    if (!byInst[key].visitas.some(v => v.s.id === x.s.id)) {
      byInst[key].visitas.push(x);
    }
    if (x.s.red && (!byInst[key].red || byInst[key].red === '—' || byInst[key].red === 'No aplica')) {
      byInst[key].red = x.s.red;
    }
    if (x.s.institucion && x.s.institucion.length > (byInst[key].institucion || '').length) {
      byInst[key].institucion = x.s.institucion;
    }
  });

  const instRows = Object.values(byInst).sort((a, b) => (a.institucion || '').localeCompare(b.institucion || '')).map(g => {
    g.visitas.sort((a, b) => {
      const fDiff = (b.s.fecha || '').localeCompare(a.s.fecha || '');
      if (fDiff !== 0) return fDiff;
      return (Number(b.s.visita) || 1) - (Number(a.s.visita) || 1);
    });
    const last = g.visitas[0];
    const sFt = isAllMode ? getFichaType(last.s.fichaTypeId) : ft;
    const isEbr = isFichaEbrGestionEscolar(sFt || ft || last.s);
    const isCoordTutoria = isFichaCoordTutoriaJec(sFt || ft);
    const isCoordPedagogico = isFichaCoordPedagogico(sFt || ft);
    const withP = g.visitas.filter(x => x.st && x.st.pct !== null);
    const avg = withP.length ? Math.round(withP.reduce((a, x) => a + x.st.pct, 0) / withP.length) : null;
    const withPts = g.visitas.filter(x => x.st && x.st.puntaje !== undefined && x.st.puntaje !== null);
    const avgPts = withPts.length ? Math.round(withPts.reduce((a, x) => a + x.st.puntaje, 0) / withPts.length) : null;
    const withSi = g.visitas.filter(x => x.st && x.st.conteo_si !== undefined && x.st.conteo_si !== null);
    const avgSi = withSi.length ? Math.round(withSi.reduce((a, x) => a + x.st.conteo_si, 0) / withSi.length) : null;

    const vLast = isEbr ? getMomentoVisitaEbr(last.s) : 1;
    const maxPts = isEbr ? (vLast === 2 ? 69 : 57) : (isCoordTutoria ? 63 : (isCoordPedagogico ? 51 : 63));

    let gst = null;
    if (isEbr && avgPts !== null) {
      const avgItems = g.visitas.reduce((acc, x) => acc + (x.st?.total_items || 23), 0) / g.visitas.length;
      const maxAplicable = avgItems > 0 ? avgItems * 3 : null;
      const nivelEbr = getNivelEbrGestion(avgPts, vLast, maxAplicable);
      gst = { label: nivelEbr.estado_panel || nivelEbr.nivel, cls: nivelEbr.cls };
    } else if (g.visitas.length === 1 && last.st && last.st.estado && last.st.estado.label) {
      gst = { label: last.st.estado.label, cls: last.st.estado.cls };
    } else {
      gst = statusFromPct(avg, sFt, avgSi, avgPts, last.s.visita);
    }
    const scoreTitle = ((isCoordTutoria || isCoordPedagogico || isEbr) && avgPts !== null) ? ' title="' + avgPts + '/' + maxPts + ' pts"' : '';

    // Group counts by visit number
    const visitaCounts = {};
    g.visitas.forEach(v => {
      const vn = Number(v.s.visita) || 1;
      visitaCounts[vn] = (visitaCounts[vn] || 0) + 1;
    });

    const curVisGlobal = String(filtrosReporte.visita || '').trim();
    const visitBadges = Object.keys(visitaCounts).sort().map(vn => {
      const count = visitaCounts[vn];
      const badgeText = count > 1 ? `V${vn} (${count})` : `V${vn}`;
      const isActive = curVisGlobal === String(vn);
      return '<button type="button" class="badge btnVisitaBadge ' + (isActive ? 'active' : '') + '" data-vis="' + vn + '" title="Filtrar reporte por Visita ' + vn + '">' + badgeText + '</button>';
    }).join('');

    const totalVisitas = g.visitas.length;

    const displayInst = isAllMode
      ? esc(g.institucion) + '<br><small style="color:var(--text-muted);font-weight:600">' + esc(g.fichaTypeNombre) + '</small>'
      : esc(g.institucion);

    return '<tr><td>' + displayInst + '</td><td>' + esc(g.red || '—') + '</td><td>' + esc(g.ugel || '—') + '</td>' +
      '<td><div class="visitasBadgesHorizWrap" style="display:inline-flex;align-items:center;gap:5px;white-space:nowrap"><strong>' + totalVisitas + '</strong>' + visitBadges + '</div></td><td>' + fmtDate(last.s.fecha) + '</td>' +
      '<td><span' + scoreTitle + '>' + (avg === null ? '—' : avg + '%') + '</span> <span class="badge ' + gst.cls + '">' + gst.label + '</span></td></tr>';
  }).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--text-600);padding:20px">Sin instituciones con los filtros actuales.</td></tr>';

  // Paginación de Colegios Monitoreados (10 colegios por página en cuadro estático)
  const allMonitoreados = Object.values(byInst).sort((a, b) => (a.institucion || '').localeCompare(b.institucion || '', 'es'));
  const totalMonitoreados = allMonitoreados.length;
  setTotalPagesMonitoreadosGlobal(Math.max(1, Math.ceil(totalMonitoreados / PAGE_SIZE_CONSOLIDADO)));
  if (pageColegiosMonitoreados > totalPagesMonitoreadosGlobal) setPageColegiosMonitoreados(totalPagesMonitoreadosGlobal);
  if (pageColegiosMonitoreados < 1) setPageColegiosMonitoreados(1);

  const startIdxMon = (pageColegiosMonitoreados - 1) * PAGE_SIZE_CONSOLIDADO;
  const endIdxMon = Math.min(startIdxMon + PAGE_SIZE_CONSOLIDADO, totalMonitoreados);
  const pagedMonitoreados = allMonitoreados.slice(startIdxMon, endIdxMon);

  const instRowsCompact = pagedMonitoreados.map((g, i) => {
    const withP = g.visitas.filter(x => x.st && x.st.pct !== null);
    const avg = withP.length ? Math.round(withP.reduce((a, x) => a + x.st.pct, 0) / withP.length) : null;
    const withPts = g.visitas.filter(x => x.st && x.st.puntaje !== undefined && x.st.puntaje !== null);
    const avgPts = withPts.length ? Math.round(withPts.reduce((a, x) => a + x.st.puntaje, 0) / withPts.length) : null;
    const last = g.visitas[0];
    const sFt = isAllMode ? getFichaType(last.s.fichaTypeId) : ft;
    const isEbr = isFichaEbrGestionEscolar(sFt || ft || last.s);
    const vLast = isEbr ? getMomentoVisitaEbr(last.s) : 1;
    const maxPts = isEbr ? (vLast === 2 ? 69 : 57) : 63;
    let gst = null;
    if (isEbr && avgPts !== null) {
      const avgItems = g.visitas.reduce((acc, x) => acc + (x.st?.total_items || 23), 0) / g.visitas.length;
      const maxAplicable = avgItems > 0 ? avgItems * 3 : null;
      const nivelEbr = getNivelEbrGestion(avgPts, vLast, maxAplicable);
      gst = { label: nivelEbr.estado_panel || nivelEbr.nivel, cls: nivelEbr.cls };
    } else if (g.visitas.length === 1 && last.st && last.st.estado && last.st.estado.label) {
      gst = { label: last.st.estado.label, cls: last.st.estado.cls };
    } else {
      gst = statusFromPct(avg, sFt, null, avgPts, last.s.visita);
    }
    const isJecTutoria = isFichaCoordTutoriaJec(sFt || ft);
    const isJecPedag = isFichaCoordPedagogico(sFt || ft);
    const isCoordFicha = isJecTutoria || isJecPedag;
    const isAnyJec = isCoordFicha || isFichaJec(sFt || ft);
    const scoreTitle = ((isCoordFicha || isEbr) && avgPts !== null) ? ' title="' + avgPts + '/' + maxPts + ' pts"' : '';

    let visitBadges = '';
    const curVis = String(filtrosReporte.visita || '').trim();
    if (isAnyJec) {
      visitBadges = buildJecVisitBadges(g, sFt || ft, state, curVis);
    } else {
      const visitaCounts = {};
      g.visitas.forEach(v => {
        const vn = Number(v.s.visita) || 1;
        visitaCounts[vn] = (visitaCounts[vn] || 0) + 1;
      });
      visitBadges = Object.keys(visitaCounts).sort().map(vn => {
        const count = visitaCounts[vn];
        const badgeText = count > 1 ? `V${vn} (${count})` : `V${vn}`;
        const isActive = curVis === String(vn);
        return `<button type="button" class="badge btnVisitaBadge ${isActive ? 'active' : ''}" data-vis="${vn}" title="Filtrar reporte por Visita ${vn}">${badgeText}</button>`;
      }).join('');
    }

    const coordNames = isCoordFicha
      ? g.visitas.map(v => v.s?.extras?.ex_coord || v.s?.coordinador || v.s?.responsable || v.s?.nombre_coordinador).filter(Boolean)
      : [];
    const uniqueCoordNames = Array.from(new Set(coordNames));
    const coordListHtml = uniqueCoordNames.length > 0
      ? `<div style="font-size:10.5px;color:var(--text-600);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="Coordinadores registrados: ${esc(uniqueCoordNames.join(', '))}">👤 ${esc(uniqueCoordNames.join(', '))}</div>`
      : '';

    const rowNum = startIdxMon + i + 1;

    return `
      <tr>
        <td style="text-align:center;font-weight:700;color:var(--text-600);font-size:12px;width:36px">${rowNum}</td>
        <td>
          <div style="font-weight:700;color:var(--navy-900);font-size:12.5px;line-height:1.3">${esc(g.institucion)}</div>
          ${g.red ? `<div style="font-size:10.5px;color:var(--text-500);margin-top:1px">RED: ${esc(g.red)}</div>` : ''}
          ${coordListHtml}
        </td>
        <td style="text-align:center"><div class="visitasBadgesHorizWrap" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;flex-wrap:nowrap;white-space:nowrap">${visitBadges || '—'}</div></td>
        <td style="text-align:center">
          <span${scoreTitle} style="font-weight:700">${avg === null ? '—' : avg + '%'}</span>
          <span class="badge ${gst.cls}" style="font-size:10px;padding:1px 4px;margin-top:2px;display:inline-block">${gst.label}</span>
        </td>
      </tr>
    `;
  }).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--text-600);padding:24px 14px">Sin instituciones monitoreadas con los filtros actuales.</td></tr>';

  // Fichas registradas: Sección simplificada (solo tabla con paginación de 10 registros en cuadro estático)
  const secRegistradasHtml = `
    <div class="panel" id="secRegistradasPanel">
      <div class="sectionRegistradasHead">
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
          <h3 style="margin:0">Fichas registradas · ${totalFichas} <span style="font-size:12.5px;font-weight:500;color:var(--text-600);margin-left:6px">(${instCount} IEs monitoreadas)</span></h3>
          ${isAdmin && totalFichas > 0 ? `
            <button type="button" class="btnLimpiarRegistrosAction" id="btnOpenLimpiarRegistrosModal" title="Opciones para depurar duplicados, seleccionar o vaciar fichas registradas">
              <span style="font-size:13px">🗑️</span> Limpiar registro
            </button>
          ` : ''}
        </div>
        <a href="#secFiltrosDescargas" id="btnAjustarFiltros" class="btnAjustarFiltros">Ajustar filtros ↑</a>
      </div>
      ${totalFichas === 0
      ? `<div class="emptyTableMsg">
            <p>No hay fichas que coincidan con los filtros activos.</p>
            <button type="button" class="btn secondary small" id="btnEmptyClearFilters">Limpiar filtros</button>
          </div>`
      : `<div class="tblWrap sectionRegistradasTableWrap">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Institución</th>
                  ${tblTypeHeader}
                  <th>UGEL / RED</th>
                  <th>Visita</th>
                  <th>Responsable</th>
                  <th>%</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
          <div class="tablePaginationBar">
            <div class="tablePaginationInfo">
              Mostrando <strong>${startIdxFichas + 1}–${endIdxFichas}</strong> de <strong>${totalFichas}</strong> registros
              <span class="paginationPageNum">· Página ${pageFichasRegistradas} de ${totalPagesFichasGlobal}</span>
            </div>
            <div class="tablePaginationControls">
              <button type="button" class="btn secondary small btnPagination" id="btnFichasPrev" ${pageFichasRegistradas <= 1 ? 'disabled' : ''} title="Página anterior">
                ○ Anterior
              </button>
              <button type="button" class="btn secondary small btnPagination" id="btnFichasNext" ${pageFichasRegistradas >= totalPagesFichasGlobal ? 'disabled' : ''} title="Página siguiente">
                Siguiente ▶
              </button>
            </div>
          </div>`
      }
    </div>
  `;

  // Cálculo de tarjetas KPI para fichas con modalidad específica (EBR, CEBE, PRITE y JEC)
  const isEbrReport = !isAllMode && ft && isFichaEbrGestionEscolar(ft);
  const isCebeReport = !isAllMode && ft && isFichaCebeGestion(ft);
  const isPriteReport = !isAllMode && ft && isFichaPriteGestion(ft);

  // Fichas del Modelo JEC
  const isJecModeloReport = !isAllMode && ft && isFichaJec(ft);
  const isJecTutoriaReport = !isAllMode && ft && isFichaCoordTutoriaJec(ft);
  const isJecPedagReport = !isAllMode && ft && isFichaCoordPedagogico(ft);
  const isJecReport = isJecModeloReport || isJecTutoriaReport || isJecPedagReport;

  const targetModality = isJecReport ? 'JEC' : (isEbrReport ? 'EBR' : (isPriteReport ? 'PRITE' : (isCebeReport ? 'CEBE' : null)));

  let cardsHtml = '';
  let secPendientesHtml = '';
  if (targetModality) {
    const padron = state.colegios || [];

    // 1. Filtrar padrón según modalidad
    let targetColegios = padron.filter(c => isModalityMatch(c, targetModality));

    // 2. Aplicar filtros activos del reporte sobre el padrón de colegios
    if (filtrosReporte.red && filtrosReporte.red.trim()) {
      const filterReiNum = normalizeReiNumber(filtrosReporte.red);
      const qRed = normalizeText(filtrosReporte.red.trim());
      targetColegios = targetColegios.filter(c => {
        const colReiNum = normalizeReiNumber(c.rei || c.red);
        if (filterReiNum && colReiNum) {
          return colReiNum === filterReiNum;
        }
        return normalizeText(c.rei || c.red || '').includes(qRed);
      });
    }
    if (filtrosReporte.distrito && filtrosReporte.distrito.trim()) {
      const qDist = normalizeText(filtrosReporte.distrito.trim());
      targetColegios = targetColegios.filter(c => normalizeText(c.distrito || '').includes(qDist));
    }
    if (filtrosReporte.tipoGestion && filtrosReporte.tipoGestion.trim()) {
      targetColegios = targetColegios.filter(c => c.tipoGestion === filtrosReporte.tipoGestion);
    }
    if (filtrosReporte.institucion && filtrosReporte.institucion.trim()) {
      const qInst = normalizeText(filtrosReporte.institucion.trim());
      targetColegios = targetColegios.filter(c => {
        return normalizeText(c.ie || c.nombre || '').includes(qInst) ||
          normalizeText(c.codigoLocal || '').includes(qInst) ||
          normalizeText(c.codigoModular || '').includes(qInst);
      });
    }

    // 3. Identificar colegios que han sido ejecutados (tienen al menos una ficha registrada)
    const executedColIds = new Set();
    const executedExtraKeys = new Set();
    const targetById = new Map();
    const targetByCode = new Map();
    const targetByIe = new Map();

    targetColegios.forEach(c => {
      if (c.id) targetById.set(c.id, c);
      if (c.codigoLocal) targetByCode.set(normalizeText(c.codigoLocal), c);
      if (c.codigoModular) targetByCode.set(normalizeText(c.codigoModular), c);
      if (c.ie) targetByIe.set(normalizeInstName(c.ie), c);
    });

    statsList.forEach(x => {
      const s = x.s;
      let matchedCol = null;
      if (s.colegioId && targetById.has(s.colegioId)) {
        matchedCol = targetById.get(s.colegioId);
      } else if (s.codigoLocal && targetByCode.has(normalizeText(s.codigoLocal))) {
        matchedCol = targetByCode.get(normalizeText(s.codigoLocal));
      } else if (s.codigoModular && targetByCode.has(normalizeText(s.codigoModular))) {
        matchedCol = targetByCode.get(normalizeText(s.codigoModular));
      } else if (s.institucion && targetByIe.has(normalizeInstName(s.institucion))) {
        matchedCol = targetByIe.get(normalizeInstName(s.institucion));
      }

      if (matchedCol) {
        executedColIds.add(matchedCol.id);
      } else {
        const rawKey = s.colegioId ? ('col_' + s.colegioId) : (normalizeInstName(s.institucion || '') + '|' + normalizeText(s.ugel || 'UGEL 03'));
        executedExtraKeys.add(rawKey);
      }
    });

    const numEjecutadas = executedColIds.size + executedExtraKeys.size;
    const iesEjecutadas = Math.max(numEjecutadas, instCount);
    const totalIesModalidad = targetColegios.length > 0 ? Math.max(targetColegios.length, iesEjecutadas) : iesEjecutadas;
    const iesPendientes = Math.max(0, totalIesModalidad - iesEjecutadas);
    const coberturaPct = totalIesModalidad > 0 ? Math.round((iesEjecutadas / totalIesModalidad) * 100) : 0;

    cardsHtml = `
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
          <div class="num">${statsList.length}</div>
          <div class="lbl">Fichas registradas ${vFilter ? `(V${vFilter})` : ''}</div>
        </div>
        <div class="card card-gold" title="Promedio general de cumplimiento en las fichas">
          <div class="num">${avgPct === null ? '—' : avgPct + '%'}</div>
          <div class="lbl">Cumplimiento promedio</div>
        </div>
      </div>
    `;

    // 4. Identificar visitas ejecutadas por colegio para la ficha actual
    const visitSubsMap = new Map();
    const fichaAllSubs = (state.submissions || []).filter(s => {
      if (s.fichaTypeId === ft.id) return true;
      if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
        return isFichaJec(s) && !isFichaCoordTutoriaJec(s) && !isFichaCoordPedagogico(s);
      }
      return false;
    });

    fichaAllSubs.forEach(s => {
      if (filtrosReporte.desde && s.fecha && s.fecha < filtrosReporte.desde) return;
      if (filtrosReporte.hasta && s.fecha && s.fecha > filtrosReporte.hasta) return;

      const vNum = getSubmissionVisitaNum(s, ft);
      let col = null;
      if (s.colegioId && targetById.has(s.colegioId)) col = targetById.get(s.colegioId);
      else if (s.codigoLocal && targetByCode.has(normalizeText(s.codigoLocal))) col = targetByCode.get(normalizeText(s.codigoLocal));
      else if (s.codigoModular && targetByCode.has(normalizeText(s.codigoModular))) col = targetByCode.get(normalizeText(s.codigoModular));
      else if (s.institucion && targetByIe.has(normalizeInstName(s.institucion))) col = targetByIe.get(normalizeInstName(s.institucion));

      const regSub = { id: s.id || (col ? col.id + '_v' + vNum : Math.random().toString()), s };

      if (col && col.id) {
        const kId = col.id + '_V' + vNum;
        if (!visitSubsMap.has(kId)) visitSubsMap.set(kId, []);
        visitSubsMap.get(kId).push(regSub);
      }
      if (col && col.codigoLocal) {
        const kLoc = normalizeText(col.codigoLocal) + '_V' + vNum;
        if (!visitSubsMap.has(kLoc)) visitSubsMap.set(kLoc, []);
        visitSubsMap.get(kLoc).push(regSub);
      }
      if (col && col.ie) {
        const kIe = normalizeInstName(col.ie) + '_V' + vNum;
        if (!visitSubsMap.has(kIe)) visitSubsMap.set(kIe, []);
        visitSubsMap.get(kIe).push(regSub);
      }
      if (s.colegioId) {
        const kId = s.colegioId + '_V' + vNum;
        if (!visitSubsMap.has(kId)) visitSubsMap.set(kId, []);
        visitSubsMap.get(kId).push(regSub);
      }
      if (s.codigoLocal) {
        const kLoc = normalizeText(s.codigoLocal) + '_V' + vNum;
        if (!visitSubsMap.has(kLoc)) visitSubsMap.set(kLoc, []);
        visitSubsMap.get(kLoc).push(regSub);
      }
      if (s.institucion) {
        const kIe = normalizeInstName(s.institucion) + '_V' + vNum;
        if (!visitSubsMap.has(kIe)) visitSubsMap.set(kIe, []);
        visitSubsMap.get(kIe).push(regSub);
      }
    });

    let allPendingItems = [];
    if (isJecReport) {
      allPendingItems = calculateJecPendingItems(targetColegios, visitSubsMap, ft, state, getResponsableForColegio);
    } else {
      const visitasToCheck = [1, 2, 3];
      targetColegios.forEach(c => {
        const colId = c.id || '';
        const colNombre = (c.ie || c.nombre || 'Institución Educativa').trim();
        const rawRei = c.rei || c.red || '';
        const reiNum = normalizeReiNumber(rawRei);
        const reiDisplay = reiNum ? String(reiNum).padStart(2, '0') : (rawRei.replace(/^(?:REI|RED)\s*/i, '').trim() || '—');
        const responsable = getResponsableForColegio(c, ft, state);
        const codigoLocal = c.codigoLocal || '';
        const codigoModular = c.codigoModular || '';
        const distrito = c.distrito || '';
        const targetCount = 1;

        visitasToCheck.forEach(vNum => {
          let matchedSubs = [];
          if (colId && visitSubsMap.has(colId + '_V' + vNum)) {
            matchedSubs = visitSubsMap.get(colId + '_V' + vNum);
          } else if (codigoLocal && visitSubsMap.has(normalizeText(codigoLocal) + '_V' + vNum)) {
            matchedSubs = visitSubsMap.get(normalizeText(codigoLocal) + '_V' + vNum);
          } else if (c.ie && visitSubsMap.has(normalizeInstName(c.ie) + '_V' + vNum)) {
            matchedSubs = visitSubsMap.get(normalizeInstName(c.ie) + '_V' + vNum);
          }

          const uniqueSubIds = new Set(matchedSubs.map(x => x.id));
          const regCount = uniqueSubIds.size;

          if (regCount < targetCount) {
            allPendingItems.push({
              colId,
              colNombre,
              codigoLocal,
              codigoModular,
              distrito,
              rei: reiDisplay,
              reiNum: reiNum || 999,
              visita: vNum,
              visitaLabel: 'V' + vNum,
              responsable: responsable || 'Por asignar',
              targetCount,
              regCount,
              parcial: false,
              detailPending: ''
            });
          }
        });
      });
    }

    // Filtro activo de responsable en Sección 2
    if (filtrosReporte.responsable && filtrosReporte.responsable.trim()) {
      const qResp = normalizeText(filtrosReporte.responsable.trim());
      allPendingItems = allPendingItems.filter(p => normalizeText(p.responsable || '').includes(qResp));
    }

    // Ordenar: 1° por REI (ascendente), 2° por Visita (V1, V2, V3), 3° por nombre de IE (alfabético)
    allPendingItems.sort((a, b) => {
      if (a.reiNum !== b.reiNum) return a.reiNum - b.reiNum;
      if (a.visita !== b.visita) return a.visita - b.visita;
      return a.colNombre.localeCompare(b.colNombre, 'es');
    });

    // Determinar pestaña de visita inicial según filtro activo de Sección 2
    const initialVisTab = (filtrosReporte.visita && ['1', '2', '3'].includes(String(filtrosReporte.visita).trim()))
      ? ('V' + String(filtrosReporte.visita).trim())
      : 'ALL';

    const countV1 = allPendingItems.filter(p => p.visita === 1).length;
    const countV2 = allPendingItems.filter(p => p.visita === 2).length;
    const countV3 = allPendingItems.filter(p => p.visita === 3).length;

    const initialFilteredItems = initialVisTab === 'ALL'
      ? allPendingItems
      : allPendingItems.filter(p => ('V' + p.visita) === initialVisTab);

    // Paginación de Instituciones Educativas Pendientes (10 colegios pendientes por página en cuadro estático)
    const totalPendientes = initialFilteredItems.length;
    setTotalPagesPendientesGlobal(Math.max(1, Math.ceil(totalPendientes / PAGE_SIZE_CONSOLIDADO)));
    if (pageColegiosPendientes > totalPagesPendientesGlobal) setPageColegiosPendientes(totalPagesPendientesGlobal);
    if (pageColegiosPendientes < 1) setPageColegiosPendientes(1);

    const startIdxPend = (pageColegiosPendientes - 1) * PAGE_SIZE_CONSOLIDADO;
    const endIdxPend = Math.min(startIdxPend + PAGE_SIZE_CONSOLIDADO, totalPendientes);
    const pagedPendientes = initialFilteredItems.slice(startIdxPend, endIdxPend);

    // Guardar para interactividad en listeners
    setCurrentReportPendingItems(allPendingItems);
    setCurrentReportFt(ft);
    setCurrentPendingActiveTab(initialVisTab);

    let comparativaSubTitle = `Seguimiento por Institución Educativa (${targetModality})`;
    let comparativaDesc = 'Caja comparativa a la misma altura: a la izquierda I.E. monitoreadas y a la derecha I.E. pendientes.';
    if (isJecReport) {
      const jecCfg = getJecFichaConfig(ft);
      if (jecCfg) {
        comparativaSubTitle = jecCfg.subTitle;
        comparativaDesc = jecCfg.desc;
      }
    }

    const jecGestionBtnHtml = isJecReport
      ? `<button type="button" class="btn secondary small btnAbrirGestionJecDirecto" style="font-size:11px;padding:3px 9px;font-weight:700" title="Seleccionar las 29 IEs JEC y cantidad de coordinadores">⚙️ Padrón JEC (${targetColegios.length}/29)</button>`
      : '';

    if (isJecReport && targetColegios.length === 0) {
      secPendientesHtml = `
        <div class="panel secComparativaColegios" id="secComparativaColegios">
          <div class="comparativaHead">
            <div class="comparativaTitleWrap">
              <div class="comparativaIcon">🏻️</div>
              <div>
                <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--navy-900)">
                  ${comparativaSubTitle}
                </h3>
                <p style="margin:2px 0 0;font-size:12px;color:var(--text-600)">
                  Aún no se ha seleccionado la lista de colegios pertenecientes al Modelo JEC.
                </p>
              </div>
            </div>
            <div>
              <button type="button" class="btn primary small btnAbrirGestionJecDirecto" style="font-weight:700">
                ⚡ Seleccionar Colegios JEC
              </button>
            </div>
          </div>
          <div style="padding:28px 18px;text-align:center;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;margin:12px 0">
            <div style="font-size:32px;margin-bottom:8px">📋</div>
            <h4 style="margin:0 0 6px;color:var(--navy-900);font-size:15px">Selecciona los 29 Colegios JEC de tu lista</h4>
            <p style="margin:0 auto 16px;max-width:560px;font-size:13px;color:var(--text-600);line-height:1.5">
              Para calcular con exactitud qué colegios ya fueron registrados y los pendientes para esta ficha, marca las casillas de tus colegios JEC e indica la cantidad de coordinadores en la ventana interactiva.
            </p>
            <button type="button" class="btn primary btnAbrirGestionJecDirecto" style="font-size:13px;padding:8px 18px;font-weight:700">
              Abrir selector interactivo de Colegios JEC →
            </button>
          </div>
        </div>
      `;
    } else {
      secPendientesHtml = `
        <div class="panel secComparativaColegios" id="secComparativaColegios">
          <div class="comparativaHead">
            <div class="comparativaHeadTop">
              <div class="comparativaTitleWrap">
                <div class="comparativaIcon">🏫</div>
                <div>
                  <h3 style="margin:0;font-size:16px;font-weight:700;color:var(--navy-900)">
                    ${comparativaSubTitle}
                  </h3>
                  <p style="margin:2px 0 0;font-size:12px;color:var(--text-600)">
                    ${comparativaDesc}
                  </p>
                </div>
              </div>
              <div class="comparativaHeadBadges">
                ${jecGestionBtnHtml}
                <span class="badge" style="background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;font-weight:700" title="${iesEjecutadas} instituciones educativas monitoreadas">${iesEjecutadas} Monitoreadas (${statsList.length} Fichas)</span>
                <span class="badge" style="background:#fffbeb;color:#b45309;border:1px solid #fde68a;font-weight:700">${allPendingItems.length} Pendientes</span>
                <button type="button" id="btnExportPendientesExcel" class="btn secondary small btnExportExcelTop" title="Exportar lista de pendientes a Excel (.xlsx)">
                  📊 Excel
                </button>
              </div>
            </div>

            <div class="comparativaHeadBottom">
              <div class="pendientesHeaderTabsWrap">
                ${isJecReport ? renderJecPendingTabsHtml(ft, allPendingItems, initialVisTab) : `
                <div class="pendientesVisitaTabs" id="pendientesVisitaTabs">
                  <button type="button" class="btnVisitaTab ${initialVisTab === 'ALL' ? 'active' : ''}" data-tab="ALL">
                    Todas (${allPendingItems.length})
                  </button>
                  <button type="button" class="btnVisitaTab ${initialVisTab === 'V1' ? 'active' : ''}" data-tab="V1">
                    V1 (${countV1})
                  </button>
                  <button type="button" class="btnVisitaTab ${initialVisTab === 'V2' ? 'active' : ''}" data-tab="V2">
                    V2 (${countV2})
                  </button>
                  <button type="button" class="btnVisitaTab ${initialVisTab === 'V3' ? 'active' : ''}" data-tab="V3">
                    V3 (${countV3})
                  </button>
                </div>`}
              </div>
            </div>
          </div>

        <div class="comparativaGrid">
          <!-- CAJA 1: I.E. MONITOREADOS (10 COLEGIOS POR PÁGINA) -->
          <div class="comparativaCol colMonitoreados">
            <div class="comparativaColHead">
              <div style="display:flex;align-items:center;gap:6px">
                <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#16a34a"></span>
                <strong style="color:var(--navy-900);font-size:13px">I.E. Monitoreados</strong>
              </div>
              <span class="badge st-logrado" style="font-size:11px" title="${instCount} instituciones educativas monitoreadas que suman ${statsList.length} fichas registradas">${instCount} IEs con avance (${statsList.length} fichas)</span>
            </div>
            <div class="comparativaTblWrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:36px;text-align:center">N°</th>
                    <th>Institución Educativa</th>
                    <th style="width:115px;text-align:center">Visitas</th>
                    <th style="width:85px;text-align:center">Avance</th>
                  </tr>
                </thead>
                <tbody>
                  ${instRowsCompact}
                </tbody>
              </table>
            </div>
            <div class="boxPaginationBar">
              <div class="boxPaginationInfo">
                <span>Mostrando <strong>${totalMonitoreados > 0 ? (startIdxMon + 1) : 0}–${endIdxMon}</strong> de <strong>${totalMonitoreados}</strong></span>
                <span class="boxPaginationSub">· Pág. ${pageColegiosMonitoreados}/${totalPagesMonitoreadosGlobal}</span>
              </div>
              <div class="boxPaginationControls">
                <button type="button" class="btn secondary small btnPagination" id="btnMonitoreadosPrev" ${pageColegiosMonitoreados <= 1 ? 'disabled' : ''} title="Página anterior">
                  ○ Anterior
                </button>
                <button type="button" class="btn secondary small btnPagination" id="btnMonitoreadosNext" ${pageColegiosMonitoreados >= totalPagesMonitoreadosGlobal ? 'disabled' : ''} title="Página siguiente">
                  Siguiente ▶
                </button>
              </div>
            </div>
          </div>

          <!-- CAJA 2: I.E. PENDIENTES (10 COLEGIOS POR PÁGINA) -->
          <div class="comparativaCol colPendientes" id="secColegiosPendientes">
            <div class="comparativaColHead comparativaColHeadPendientes">
              <div style="display:flex;align-items:center;gap:6px;flex-shrink:0">
                <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#d97706"></span>
                <strong style="color:var(--navy-900);font-size:13px">I.E. Pendientes</strong>
              </div>
              <span class="badge" id="pendientesCountBadge" style="background:#fef3c7;color:#92400e;border:1px solid #fde68a;font-size:11px;font-weight:700">
                ${totalPendientes} pendientes
              </span>
            </div>

            <div class="comparativaTblWrap" id="pendientesTblWrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:36px;text-align:center">N°</th>
                    <th>Institución Educativa</th>
                    <th style="width:85px;text-align:center">Acción</th>
                  </tr>
                </thead>
                <tbody id="pendientesTbody">
                  ${buildPendingRowsHtml(pagedPendientes, ft, startIdxPend)}
                </tbody>
              </table>
            </div>
            <div class="boxPaginationBar">
              <div class="boxPaginationInfo">
                <span>Mostrando <strong>${totalPendientes > 0 ? (startIdxPend + 1) : 0}–${endIdxPend}</strong> de <strong>${totalPendientes}</strong></span>
                <span class="boxPaginationSub">· Pág. ${pageColegiosPendientes}/${totalPagesPendientesGlobal}</span>
              </div>
              <div class="boxPaginationControls">
                <button type="button" class="btn secondary small btnPagination" id="btnPendientesPrev" ${pageColegiosPendientes <= 1 ? 'disabled' : ''} title="Página anterior">
                  ○ Anterior
                </button>
                <button type="button" class="btn secondary small btnPagination" id="btnPendientesNext" ${pageColegiosPendientes >= totalPagesPendientesGlobal ? 'disabled' : ''} title="Página siguiente">
                  Siguiente ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    }
  } else {
    setCurrentReportPendingItems([]);
    setCurrentReportFt(null);
    setCurrentPendingActiveTab('ALL');
    cardsHtml = `
      <div class="cards">
        <div class="card card-blue"><div class="num">${statsList.length}</div><div class="lbl">Fichas registradas ${vFilter ? `(V${vFilter})` : ''}</div></div>
        <div class="card card-ok"><div class="num">${instCount}</div><div class="lbl">Instituciones</div></div>
        ${isAllMode ? `<div class="card card-navy"><div class="num">${(state.fichaTypes || []).filter(isFichaActiva).length}</div><div class="lbl">Tipos de ficha</div></div>` : ''}
        <div class="card card-gold"><div class="num">${avgPct === null ? '—' : avgPct + '%'}</div><div class="lbl">Cumplimiento promedio</div></div>
      </div>
    `;
  }

  host.innerHTML = `
    <div id="reportCapture">
      <div class="panel panelDistribucionYMetricas" id="secPanelDistribucionMetricas">
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
      ${allTypesSummaryHtml}
      ${!isAllMode ? `<div class="panel"><h3>Reporte por ítem <small>resultado de cada indicador</small></h3>${itemReportHtml}</div>` : ''}
      <div class="panel"><h3>Evolución por N° de visita</h3>${visRows}</div>
      ${targetModality ? secPendientesHtml : `
        <div class="panel"><h3>Resumen por institución</h3>
          <div class="tblWrap"><table><thead><tr><th>Institución</th><th>RED</th><th>UGEL</th><th>N° visitas</th><th>Última visita</th><th>Avance</th></tr></thead><tbody>${instRows}</tbody></table></div>
        </div>
      `}
    </div>
    ${secRegistradasHtml}
  `;

  // Attach handlers in host
  attachReportHostListeners(host, state, getFichaType, dbNs, isAdmin, navigate, user, statsList, ft, isAllMode);

  // Restaurar foco y posición del cursor si un input estaba activo
  if (activeId) {
    const elToFocus = document.getElementById(activeId);
    if (elToFocus && document.activeElement !== elToFocus) {
      elToFocus.focus();
      if (selStart !== null && selEnd !== null) {
        try { elToFocus.setSelectionRange(selStart, selEnd); } catch (_) { }
      }
    }
  }
}


function attachReportHostListeners(host, state, getFichaType, dbNs, isAdmin, navigate, user, statsList = [], ft = null, isAllMode = false) {
  // Botón Limpiar filtros en estado vacío de tabla
  const btnEmptyClear = host.querySelector('#btnEmptyClearFilters');
  if (btnEmptyClear) {
    btnEmptyClear.addEventListener('click', () => {
      syncFiltersState({ visita: '', estado: '', responsable: '', institucion: '', red: '', ugel: '', distrito: '', tipoGestion: '', desde: '', hasta: '' });
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  }

  // Enlace "Ajustar filtros ↑"
  const btnAjustar = host.querySelector('#btnAjustarFiltros');
  if (btnAjustar) {
    btnAjustar.addEventListener('click', (e) => {
      e.preventDefault();
      openReportFiltersDrawer();
    });
  }

  // Expandir / Contraer todo en Reporte por Ítem
  const toggleAllBtn = host.querySelector('#toggleAllItemsBtn');
  const detailsList = host.querySelectorAll('.secDetails');
  if (toggleAllBtn) {
    toggleAllBtn.addEventListener('click', () => {
      const anyClosed = Array.from(detailsList).some(d => !d.open);
      detailsList.forEach(d => {
        d.open = anyClosed;
        const summary = d.querySelector('summary');
        if (summary) summary.setAttribute('aria-expanded', anyClosed ? 'true' : 'false');
      });
      toggleAllBtn.textContent = anyClosed ? '⊙ Contraer todo' : '⊞ Expandir todo';
    });
  }

  detailsList.forEach(d => {
    const summary = d.querySelector('summary');
    d.addEventListener('toggle', () => {
      if (summary) {
        summary.setAttribute('aria-expanded', d.open ? 'true' : 'false');
      }
      if (toggleAllBtn) {
        const anyClosed = Array.from(detailsList).some(item => !item.open);
        toggleAllBtn.textContent = anyClosed ? 'Expandir todo' : 'Contraer todo';
      }
    });

    if (summary) {
      summary.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          d.open = !d.open;
        }
      });
    }
  });

  // Descargar ficha individual oficial en PDF
  host.querySelectorAll('[data-pdfsub]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const subId = btn.dataset.pdfsub;
      const sub = state.submissions.find(s => s.id === subId);
      if (!sub) return;
      const subFt = getFichaType(sub.fichaTypeId);
      if (!subFt) {
        showToast('Tipo de ficha no encontrado.');
        return;
      }
      const rawFtName = (subFt.nombre || 'EVALUACIÓN').trim();
      const cleanDocTitle = /^ficha\s+de\s+monitoreo/i.test(rawFtName)
        ? rawFtName.toUpperCase()
        : `FICHA DE MONITOREO — ${rawFtName.toUpperCase()}`;
      openDownloadConfigModal({
        documentTitle: cleanDocTitle,
        tipoReporte: 'individual',
        dataRows: [sub],
        currentUser: user,
        state,
        dbNs,
        isAdmin,
        onConfirm: async (cfg) => {
          await exportFichaIndividualPdf(sub, subFt, null, cfg);
        }
      });
    });
  });

  // Botones de visitas en Colegios Monitoreados
  host.querySelectorAll('.btnVisitaBadge').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = btn.dataset.vis;
      if (!v) return;
      const currentV = String(filtrosReporte.visita || '').trim();
      const newV = currentV === String(v) ? '' : String(v);
      filtrosReporte.visita = newV;
      consFilters.visita = newV;
      syncFiltersState(filtrosReporte);
      const prevScrollY = window.scrollY;
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
      window.scrollTo(0, prevScrollY);
    });
  });

  // Fila clickeable para detalle
  host.querySelectorAll('tr[data-row]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-del],[data-edit],[data-pdfsub]')) return;
      const id = tr.dataset.row;
      setConsExpanded(consExpanded === id ? null : id);
      renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
    });
  });

  // Botón EDITAR ficha
  host.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const subId = btn.dataset.edit;
      const sub = state.submissions.find(s => s.id === subId);
      if (!sub) return;
      setEditMode(subId, sub);
      setRegSelectedTypeId(sub.fichaTypeId);
      setRegBuiltFor(null);
      if (navigate) navigate('registrar');
    });
  });

  // Botón ELIMINAR ficha (solo admin)
  host.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const delId = btn.dataset.del;
      if (!delId) return;
      if (!confirm('¿Eliminar esta ficha registrada? Esta acción no se puede deshacer.')) return;
      try {
        await dbNs.collection('submissions').doc(delId).delete();
        if (state && Array.isArray(state.submissions)) {
          state.submissions = state.submissions.filter(s => s.id !== delId);
        }
        showToast('Ficha eliminada.');
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
      } catch (err) {
        console.error(err);
        showToast('No se pudo eliminar.');
      }
    });
  });

  // Botón LIMPIAR REGISTRO (solo admin)
  const btnLimpiarReg = host.querySelector('#btnOpenLimpiarRegistrosModal');
  if (btnLimpiarReg) {
    btnLimpiarReg.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openModalLimpiarRegistros({
        statsList,
        ft,
        isAllMode,
        dbNs,
        state,
        onCompleted: () => {
          renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
        }
      });
    });
  }

  // =========================================================================
  // LISTENERS DE PAGINACIÓN: FICHAS REGISTRADAS Y COLEGIOS MONITOREADOS
  // =========================================================================
  const btnFichasPrev = host.querySelector('#btnFichasPrev');
  if (btnFichasPrev) {
    btnFichasPrev.addEventListener('click', (e) => {
      e.preventDefault();
      if (pageFichasRegistradas > 1) {
        setPageFichasRegistradas(pageFichasRegistradas - 1);
        const prevScrollY = window.scrollY;
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
        window.scrollTo(0, prevScrollY);
      }
    });
  }
  const btnFichasNext = host.querySelector('#btnFichasNext');
  if (btnFichasNext) {
    btnFichasNext.addEventListener('click', (e) => {
      e.preventDefault();
      if (pageFichasRegistradas < totalPagesFichasGlobal) {
        setPageFichasRegistradas(pageFichasRegistradas + 1);
        const prevScrollY = window.scrollY;
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
        window.scrollTo(0, prevScrollY);
      }
    });
  }

  const btnMonPrev = host.querySelector('#btnMonitoreadosPrev');
  if (btnMonPrev) {
    btnMonPrev.addEventListener('click', (e) => {
      e.preventDefault();
      if (pageColegiosMonitoreados > 1) {
        setPageColegiosMonitoreados(pageColegiosMonitoreados - 1);
        const prevScrollY = window.scrollY;
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
        window.scrollTo(0, prevScrollY);
      }
    });
  }
  const btnMonNext = host.querySelector('#btnMonitoreadosNext');
  if (btnMonNext) {
    btnMonNext.addEventListener('click', (e) => {
      e.preventDefault();
      if (pageColegiosMonitoreados < totalPagesMonitoreadosGlobal) {
        setPageColegiosMonitoreados(pageColegiosMonitoreados + 1);
        const prevScrollY = window.scrollY;
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
        window.scrollTo(0, prevScrollY);
      }
    });
  }

  // =========================================================================
  // LISTENERS DEL DIRECTORIO DE COLEGIOS PENDIENTES
  // =========================================================================
  const secComparativa = host.querySelector('#secComparativaColegios');
  const secPendientes = host.querySelector('#secColegiosPendientes');
  if (secPendientes || secComparativa) {
    const rootScope = secComparativa || host;
    const tabBtns = rootScope.querySelectorAll('.btnVisitaTab');
    const tbody = host.querySelector('#pendientesTbody');
    const btnExportExcel = rootScope.querySelector('#btnExportPendientesExcel');
    const btnPendPrev = host.querySelector('#btnPendientesPrev');
    const btnPendNext = host.querySelector('#btnPendientesNext');

    const handleRegistrarClick = (btn) => {
      const colId = btn.dataset.colId;
      const visNum = Number(btn.dataset.vis) || (filtrosReporte.visita ? Number(filtrosReporte.visita) : 1);
      const ftId = btn.dataset.ftId || (currentReportFt ? currentReportFt.id : (filtrosReporte.tipo && filtrosReporte.tipo !== '__ALL__' ? filtrosReporte.tipo : null));
      if (!ftId || ftId === '__ALL__') {
        showToast('Por favor selecciona una ficha específica en el reporte antes de registrar.');
        return;
      }

      resetRegistrationSessionState();
      setRegSelectedTypeId(ftId);
      setRegBuiltFor(null);
      setRegSelectedColegioId(colId || null);
      setRegTargetVisita(visNum || 1);
      try {
        if (colId) sessionStorage.setItem('reg_prefill_colegioid', colId);
        if (visNum) sessionStorage.setItem('reg_prefill_visita', String(visNum));
        if (ftId) sessionStorage.setItem('reg_prefill_ftid', ftId);
      } catch (_) { }
      if (navigate) navigate('registrar');
    };

    // Paginación Colegios Pendientes (○ Anterior / Siguiente ▶)
    if (btnPendPrev) {
      btnPendPrev.addEventListener('click', (e) => {
        e.preventDefault();
        if (pageColegiosPendientes > 1) {
          setPageColegiosPendientes(pageColegiosPendientes - 1);
          const prevScrollY = window.scrollY;
          renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
          window.scrollTo(0, prevScrollY);
        }
      });
    }
    if (btnPendNext) {
      btnPendNext.addEventListener('click', (e) => {
        e.preventDefault();
        if (pageColegiosPendientes < totalPagesPendientesGlobal) {
          setPageColegiosPendientes(pageColegiosPendientes + 1);
          const prevScrollY = window.scrollY;
          renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
          window.scrollTo(0, prevScrollY);
        }
      });
    }

    // Cambio de pestaña de visita (Todas, V1, V2, V3) -> Filtra el reporte completo
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab || 'ALL';
        const targetVis = tab === 'ALL' ? '' : tab.replace(/^V/, '');
        filtrosReporte.visita = targetVis;
        consFilters.visita = targetVis;
        setPageColegiosPendientes(1);
        setPageColegiosMonitoreados(1);
        setPageFichasRegistradas(1);
        syncFiltersState(filtrosReporte);
        const prevScrollY = window.scrollY;
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, user);
        window.scrollTo(0, prevScrollY);
      });
    });

    // Botones "Registrar →" de instituciones pendientes
    rootScope.querySelectorAll('.btnRegistrarPendiente').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleRegistrarClick(btn);
      });
    });

    // Exportación a Excel (.xlsx)
    if (btnExportExcel) {
      btnExportExcel.addEventListener('click', () => {
        if (!currentReportPendingItems || currentReportPendingItems.length === 0) {
          showToast('No hay colegios pendientes para exportar.');
          return;
        }
        const activeTab = currentPendingActiveTab;
        const exportList = currentReportPendingItems.filter(p => {
          if (activeTab === 'V1' && p.visita !== 1) return false;
          if (activeTab === 'V2' && p.visita !== 2) return false;
          if (activeTab === 'V3' && p.visita !== 3) return false;
          return true;
        });

        const tabSuffix = activeTab !== 'ALL' ? `_${activeTab}` : '';
        const ftNameSlug = currentReportFt ? (currentReportFt.nombreCorto || currentReportFt.nombre || 'ficha').replace(/[^a-z0-9]+/gi, '_').toLowerCase() : 'colegios';
        const fileName = `colegios_pendientes_${ftNameSlug}${tabSuffix}.xlsx`;

        const headers = ['N°', 'Institución Educativa', 'Cód. Local', 'Cód. Modular', 'Distrito', 'REI', 'Visita', 'Detalle / Estado', 'Especialista Responsable'];
        const rowsData = exportList.map((p, idx) => [
          idx + 1,
          p.colNombre,
          p.codigoLocal || '',
          p.codigoModular || '',
          p.distrito || '',
          p.rei && p.rei !== '—' ? ('REI ' + p.rei) : 'Sin REI',
          `Visita ${p.visita} (${p.visitaLabel})`,
          p.detailPending || (p.parcial ? 'Parcial' : 'Pendiente'),
          p.responsable
        ]);

        if (typeof XLSX !== 'undefined') {
          const ws = XLSX.utils.aoa_to_sheet([headers, ...rowsData]);
          ws['!cols'] = [
            { wch: 6 },
            { wch: 42 },
            { wch: 14 },
            { wch: 14 },
            { wch: 18 },
            { wch: 12 },
            { wch: 22 },
            { wch: 24 },
            { wch: 38 }
          ];
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Pendientes');
          XLSX.writeFile(wb, fileName);
          showToast(`Descargando ${exportList.length} colegios pendientes en Excel...`);
        } else {
          downloadCsv(fileName.replace(/\.xlsx$/i, '.csv'), headers, rowsData);
        }
      });
    }
  }

  // Clic en botón para abrir modal de gestión JEC directamente desde el reporte
  host.querySelectorAll('.btnAbrirGestionJecDirecto').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openModalGestionJec(state, dbNs, () => {
        renderConsBody(state, getFichaType, dbNs, isAdmin, navigate, currentUser, options);
      });
    });
  });

  // Clic en KPI de IEs Pendientes para scroll suave
  const kpiCard = host.querySelector('#kpiCardIesPendientes');
  if (kpiCard) {
    kpiCard.addEventListener('click', () => {
      const targetSec = host.querySelector('#secComparativaColegios') || host.querySelector('#secColegiosPendientes');
      if (targetSec) {
        targetSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }
}


setRenderConsBodyHook(renderConsBody);
