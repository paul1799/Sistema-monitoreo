/* =========================================================================
   features/reportes/item-report.js — Reporte por ítem consolidado e indicadores
   UGEL 03 · AGEBRE · Fase 2 Reorganización
   ========================================================================= */

import { computeItemAgg, renderItemReportHtml } from '../../ui/scoring.js';
import { getEbrSeccionesForVisita } from '../../ebr-gestion.js';
import { isFichaEbrGestionEscolar, isFichaMaterialesCebe } from '../../domain/fichas/index.js';
import { MATERIALES_CEBE_SECCIONES } from '../../domain/fichas/catalogo-base.js';
import { isFichaCebeGestion, CEBE_SECCIONES } from '../../cebe-gestion.js';
import { isFichaPriteGestion, PRITE_SECCIONES } from '../../prite-gestion.js';

/**
 * Calcula y genera el HTML del Reporte por Ítem (desglose por dimensión e indicadores)
 * @param {Object} ft - Ficha técnica activa
 * @param {Array} statsList - Estadísticas de las fichas filtradas
 * @param {boolean} isAllMode - Si se encuentra en modo global 'Todas las fichas'
 * @returns {string} HTML del reporte por ítem
 */
export function renderItemReportSectionHtml(ft, statsList, isAllMode = false) {
  if (isAllMode || !ft) return '';

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

  return renderItemReportHtml(itemAgg, ft.tipoRespuesta, ft);
}

