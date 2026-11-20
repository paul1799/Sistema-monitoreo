/* =========================================================================
   features/reportes/item-report.js — Reporte por ítem consolidado e indicadores
   UGEL 03 — AGEBRE — Fase 2 Reorganización
   ========================================================================= */

import { computeItemAgg, renderItemReportHtml } from '../../ui/scoring.js';
import { getEbrSeccionesForVisita } from '../../ebr-gestion.js';
import { isFichaEbrGestionEscolar, isFichaMaterialesCebe } from '../../domain/fichas/index.js';
import { MATERIALES_CEBE_SECCIONES } from '../../domain/fichas/catalogo-base.js';
import { isFichaCebeGestion, CEBE_SECCIONES } from '../../cebe-gestion.js';
import { isFichaPriteGestion, PRITE_SECCIONES } from '../../prite-gestion.js';
import { isFichaJec, JEC_SECCIONES } from '../../jec-monitoreo.js';
import { JEC_1ER_SECCIONES } from '../../jec-1er-monitoreo.js';

/**
 * Calcula y genera el HTML del Reporte por Ítem (desglose por dimensión e indicadores)
 * @param {Object} ft - Ficha técnica activa
 * @param {Array} statsList - Estadísticas de las fichas filtradas
 * @param {boolean} isAllMode - Si se encuentra en modo global 'Todas las fichas'
 * @param {number|string|null} targetVisita - Visita/Momento activo (1, 2, 3)
 * @returns {string} HTML del reporte por ítem
 */
export function renderItemReportSectionHtml(ft, statsList, isAllMode = false, targetVisita = null) {
  if (isAllMode || !ft) return '';

  let effVisita = targetVisita ? Number(targetVisita) : null;
  if (!effVisita && typeof window !== 'undefined' && window.filtrosReporte?.visita) {
    effVisita = Number(window.filtrosReporte.visita);
  }
  if (!effVisita && statsList && statsList.length > 0) {
    const vSet = new Set(statsList.map(x => Number(x.s?.visita)).filter(v => !isNaN(v) && v > 0));
    if (vSet.size === 1) effVisita = Array.from(vSet)[0];
  }

  const escalaRaw = String(ft.escala || '').toUpperCase();
  const tipoRespRaw = String(ft.tipoRespuesta || '').toLowerCase();
  const isSiNo = (tipoRespRaw === 'si_no' || escalaRaw === 'SI_NO' || escalaRaw === 'SI_NO_NA' || tipoRespRaw.includes('si_no') || escalaRaw.includes('SI_NO'));
  const isEbr = !isSiNo && isFichaEbrGestionEscolar(ft);
  let seccionesParaAgg = ft.secciones || [];
  if (isEbr) {
    const hasV3 = statsList.some(x => Number(x.s?.visita) === 3);
    const hasV2 = statsList.some(x => Number(x.s?.visita) === 2);
    const vTarget = effVisita || (hasV3 ? 3 : (hasV2 ? 2 : 1));
    seccionesParaAgg = getEbrSeccionesForVisita(vTarget, ft);
  } else if (isFichaJec(ft)) {
    if (effVisita === 1) {
      seccionesParaAgg = (ft.seccionesPorVisita && (ft.seccionesPorVisita[0] || ft.seccionesPorVisita['0'])) || ft.secciones || JEC_1ER_SECCIONES;
    } else {
      const vIdx = (effVisita && effVisita >= 2) ? (effVisita - 1) : 1;
      seccionesParaAgg = (ft.seccionesPorVisita && (ft.seccionesPorVisita[vIdx] || ft.seccionesPorVisita[1] || ft.seccionesPorVisita['1'] || ft.seccionesPorVisita[2] || ft.seccionesPorVisita['2'])) || ft.secciones || JEC_SECCIONES;
    }
  } else if (!isSiNo && isFichaCebeGestion(ft)) {
    seccionesParaAgg = (ft.secciones && ft.secciones.length > 0) ? ft.secciones : CEBE_SECCIONES;
  } else if (!isSiNo && isFichaPriteGestion(ft)) {
    seccionesParaAgg = (ft.secciones && ft.secciones.length > 0) ? ft.secciones : PRITE_SECCIONES;
  } else if (isFichaMaterialesCebe(ft)) {
    seccionesParaAgg = (ft.secciones && ft.secciones.length > 0) ? ft.secciones : MATERIALES_CEBE_SECCIONES;
  } else if (ft.seccionesPorVisita && Object.keys(ft.seccionesPorVisita).length > 0) {
    const vIdx = (effVisita && effVisita >= 1) ? (effVisita - 1) : 0;
    seccionesParaAgg = ft.seccionesPorVisita[vIdx] || ft.seccionesPorVisita[0] || ft.seccionesPorVisita['0'] || ft.secciones || [];
  }

  const secAgg = {};
  const normSec = (name) => String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  seccionesParaAgg.forEach(sec => {
    const k = normSec(sec.nombre);
    secAgg[k] = { sum: 0, cnt: 0 };
  });
  statsList.forEach(x => (x.st?.secciones || []).forEach((sc, sIdx) => {
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

  const itemAgg = computeItemAgg(statsList.map(x => x.s), ft, effVisita);
  itemAgg.forEach((sec, sIdx) => {
    const k = normSec(sec.nombre);
    const a = secAgg[k] || secAgg[`idx_${sIdx}`];
    if (a && a.cnt) {
      sec.avg = Math.round(a.sum / a.cnt);
    }
  });

  const effectiveFt = (isFichaJec(ft) && effVisita !== 1)
    ? { ...ft, secciones: seccionesParaAgg, tipoRespuesta: 'si_no', escala: 'SI_NO_NA' }
    : { ...ft, secciones: seccionesParaAgg };

  return renderItemReportHtml(itemAgg, effectiveFt.tipoRespuesta, effectiveFt);
}
