/* =========================================================================
   features/reportes/export.js — Lógica de exportación a CSV y utilidades de descarga
   UGEL 03 · AGEBRE · Fase 2 Reorganización
   ========================================================================= */

import { downloadCsv, resolveDirectorName } from '../../core/utils/index.js';
import { getAppState, getSessionUser } from '../../core/state/app-state.js';
import { statusFromPct, getSubmissionResponsable } from '../../ui/scoring.js';
import {
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEbrGestionEscolar,
  getMomentoVisitaEbr
} from '../../domain/fichas/index.js';
import { openModalLimpiarRegistros } from '../../ui/modales-limpieza.js?v=20261103_v8';
import { exportFichaIndividualPdf, exportConsolidadoReportPdf } from '../../pdf-template.js';
import { exportarMatrizSeguimiento } from '../../exportarMatriz.js';
import { exportarTableroEBRCompleto } from '../../exportarTableroEBR.js';

export {
  openModalLimpiarRegistros,
  exportFichaIndividualPdf,
  exportConsolidadoReportPdf,
  exportarMatrizSeguimiento,
  exportarTableroEBRCompleto
};

/**
 * Exporta a CSV los resultados consolidados de una ficha
 * @param {Object} ft - Tipo de ficha
 * @param {Array} statsList - Lista de estadísticas evaluadas
 */
export async function exportCsv(ft, statsList) {
  const isCoord = isFichaCoordTutoriaJec(ft);
  const isCoordPedag = isFichaCoordPedagogico(ft);
  const isEbr = isFichaEbrGestionEscolar(ft);
  const header = ['Fecha', 'Institución', 'UGEL', 'Código', 'Visita', 'Responsable', 'Director', isCoord ? 'Puntaje (de 63)' : (isCoordPedag ? 'Puntaje (de 51)' : (isEbr ? 'Puntaje Obtenido' : '% Cumplimiento')), (isCoord || isCoordPedag || isEbr) ? '% Equivalente' : '', 'Nivel / Estado', 'Datos adicionales', 'Observaciones', 'Compromisos'].filter(Boolean);
  const rows = statsList.map(x => {
    const s = x.s, st = x.st;
    const extras = (s.extras || []).map(e => e.label + ': ' + e.value).join(' | ');
    const comps = (Array.isArray(s.compromisos) ? s.compromisos : Array.isArray(s.compromisosList) ? s.compromisosList : []).map(c => c.texto).join(' | ');
    let subResp = getSubmissionResponsable(s, getAppState(), getSessionUser());
    if (!subResp || /^\d+$/.test(subResp) || subResp.includes('@') || subResp === '—') {
      subResp = (s.responsable && !/^\d+$/.test(String(s.responsable).trim()) && !String(s.responsable).includes('@')) ? String(s.responsable).trim() : '';
    }
        let stLabel = (st && st.estado && st.estado.label) ? st.estado.label : statusFromPct(st.pct, ft, st?.conteo_si, st?.puntaje, s?.visita).label;
    const isJecRow = isFichaJec(ft || s) || isFichaCoordTutoriaJec(ft || s) || isFichaCoordPedagogico(ft || s);
    if (isJecRow) {
      const l = String(stLabel || '').toLowerCase();
      if (l.includes('lograd') || l.includes('cumple') || l === 'l') stLabel = 'Logrado';
      else if (l.includes('proces') || l.includes('parcial') || l === 'p') stLabel = 'Proceso';
      else if (l.includes('inici') || l.includes('incipient') || l.includes('no cumple') || l.includes('mejorar') || l === 'i') stLabel = 'Inicio';
    }
    const dirCsv = resolveDirectorName(s);
    const dirFinal = (dirCsv && dirCsv !== '—') ? dirCsv : '';
    if (isCoord) {
      const pts = (st.puntaje !== undefined && st.puntaje !== null) ? st.puntaje : (s.puntaje || '');
      return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, dirFinal, pts, (st.pct === null ? '' : st.pct + '%'), stLabel, extras, s.observaciones, comps];
    }
    if (isCoordPedag) {
      const pts = (st.puntaje !== undefined && st.puntaje !== null) ? st.puntaje : (s.puntaje || '');
      return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, dirFinal, pts, (st.pct === null ? '' : st.pct + '%'), stLabel, extras, s.observaciones, comps];
    }
    if (isEbr) {
      const v = getMomentoVisitaEbr(s);
      const maxPts = v === 2 ? 69 : 57;
      const pts = (st.puntaje !== undefined && st.puntaje !== null) ? st.puntaje : (s.puntaje || '');
      const ptsStr = pts !== '' ? `${pts}/${maxPts}` : '';
      return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, dirFinal, ptsStr, (st.pct === null ? '' : st.pct + '%'), stLabel, extras, s.observaciones, comps];
    }
    return [s.fecha, s.institucion, s.ugel, s.codigoModular, s.visita, subResp, dirFinal, (st.pct === null ? '' : st.pct), stLabel, extras, s.observaciones, comps];
  });
  downloadCsv((ft.nombre || 'reporte').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.csv', header, rows);
}

