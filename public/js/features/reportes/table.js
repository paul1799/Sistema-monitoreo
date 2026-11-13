/* =========================================================================
   features/reportes/table.js — Generación de tablas, filas pendientes y detalle
   UGEL 03 · AGEBRE · Fase 2 Reorganización
   ========================================================================= */

import { esc, fmtDate, resolveDirectorName } from '../../core/utils/index.js';
import { getAppState } from '../../core/state/app-state.js';
import { RESPONSE_OPTIONS, RESPONSE_LABELS, OPTION_COLORS } from '../../ui/scoring.js';
import {
  isFichaEbrGestionEscolar,
  getMomentoVisitaEbr,
  getNivelEbrGestion,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaMonitoreoDocente,
  isFichaMaterialesCebe,
  getNivelCoordTutoriaJec,
  getNivelCoordPedagogicoJec
} from '../../domain/fichas/index.js';
import { getDirectivosActivosForColegio } from '../../directorio.js';
import { getNivelLogroJec } from '../../jec-monitoreo.js';
import { isFichaCebeGestion } from '../../cebe-gestion.js';
import { isFichaPriteGestion } from '../../prite-gestion.js';

export function buildPendingRowsHtml(items, ft = null, startIndex = 0) {
  if (!items || items.length === 0) {
    return `<tr><td colspan="3" style="text-align:center;padding:26px 14px;color:var(--text-600)">
      <div style="font-size:22px;margin-bottom:4px">🎉</div>
      <strong style="font-size:13px">¡Excelente! No hay instituciones pendientes con los filtros seleccionados.</strong>
      <p style="margin:4px 0 0;font-size:11.5px">Todas las instituciones han sido ejecutadas para esta visita y REI.</p>
    </td></tr>`;
  }
  return items.map((p, idx) => {
    const vBadgeCls = p.visita === 1 ? 'badge-visita-v1' : (p.visita === 2 ? 'badge-visita-v2' : 'badge-visita-v3');
    const vColorStyle = p.visita === 1
      ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;'
      : (p.visita === 2 ? 'background:#fffbeb;color:#b45309;border:1px solid #fde68a;' : 'background:#f5f3ff;color:#6d28d9;border:1px solid #ddd6fe;');
    const reiText = p.rei && p.rei !== '—' ? `REI ${p.rei}` : '';

    return `
      <tr data-col-id="${esc(p.colId)}" data-vis="${p.visita}" data-rei="${esc(p.rei)}">
        <td style="text-align:center;color:var(--text-600);font-weight:600;font-size:11.5px">${startIndex + idx + 1}</td>
        <td>
          <div style="font-weight:700;color:var(--navy-900);font-size:12.5px;line-height:1.3">${esc(p.colNombre)}</div>
          <div style="font-size:11px;color:var(--text-500);margin-top:2px;display:flex;align-items:center;flex-wrap:wrap;gap:4px">
            ${p.codigoLocal ? `<span>Cód: ${esc(p.codigoLocal)}</span>` : ''}
            ${reiText ? `<span class="badge badge-red" style="padding:1px 5px;font-size:10px">${esc(reiText)}</span>` : ''}
            <span class="badge ${vBadgeCls}" style="${vColorStyle}padding:1px 5px;font-size:10px">${p.visitaLabel}</span>
            ${p.detailPending ? `<span class="badge" style="background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;padding:1px 6px;font-size:10px;font-weight:700">${esc(p.detailPending)}</span>` : ''}
            ${p.responsable && p.responsable !== '—' ? `<span style="color:var(--text-600)" title="Responsable: ${esc(p.responsable)}">· ${esc(p.responsable)}</span>` : ''}
          </div>
        </td>
        <td style="text-align:center">
          <button type="button" class="btn secondary small btnRegistrarPendiente"
                  data-col-id="${esc(p.colId)}" data-vis="${p.visita}" data-ft-id="${esc(ft ? ft.id : '')}"
                  title="${p.parcial ? 'Completar registro de' : 'Registrar'} Visita ${p.visita} para ${esc(p.colNombre)}">
            ${p.parcial ? 'Completar →' : 'Registrar →'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

export function buildDetail(s) {
  const isDocente = isFichaMonitoreoDocente(s);
  const isCoordTutoria = !isDocente && (s.fichaTypeId === 'ft_coord_tutoria_jec' || (s.fichaTypeNombre || '').toLowerCase().includes('tutor'));
  const isJec = !isDocente && !isCoordTutoria && (s.fichaTypeId === 'ft_msejec_2do' || s.fichaTypeId === 'ft_jec' || (s.fichaTypeNombre || '').toLowerCase().includes('jec') || !!s.docentes_monitoreo);

  let ebrGestionBanner = '';
  const isEbr = isFichaEbrGestionEscolar(s);
  if (isEbr) {
    const v = getMomentoVisitaEbr(s);
    const maxPts = v === 2 ? 69 : 57;
    let puntaje = (s.puntaje !== undefined && s.puntaje !== null) ? Number(s.puntaje) : null;
    if ((puntaje === null || puntaje > maxPts) && Array.isArray(s.respuestas) && s.respuestas.length > 0) {
      let pSum = 0;
      let itemsAnswered = 0;
      const seenNums = new Set();
      const maxCount = v === 2 ? 23 : 19;
      s.respuestas.forEach(r => {
        let num = r?.num;
        if (!num && r?.id) {
          const m = String(r.id).match(/^(?:ge\d*|num)_?(\d+)$/);
          if (m) num = parseInt(m[1], 10);
        }
        if (num && num >= 1 && num <= maxCount && !seenNums.has(num)) {
          seenNums.add(num);
          const vL = String(r?.valor || '').toLowerCase();
          if (vL === 'logrado' || vL === 'si') { pSum += 3; itemsAnswered++; }
          else if (vL === 'proceso') { pSum += 2; itemsAnswered++; }
          else if (vL === 'inicio' || vL === 'no') { pSum += 1; itemsAnswered++; }
        }
      });
      puntaje = Math.min(maxPts, pSum);
      s._tempItemsAnswered = itemsAnswered;
    } else if (puntaje !== null && puntaje > maxPts) {
      puntaje = maxPts;
    }

    let maxAplicable = null;
    if (s._tempItemsAnswered > 0 && s._tempItemsAnswered < (v === 2 ? 23 : 19)) {
      maxAplicable = s._tempItemsAnswered * 3;
    }

    if (puntaje === null) puntaje = 0;
    const nivelObj = getNivelEbrGestion(puntaje, v, maxAplicable);
    const momentoStr = v === 2 ? '2.° Momento (Visita 2 · 23 ítems · Máx 69 pts)' : '1.er Momento (Visita 1 · 19 ítems · Máx 57 pts)';

    ebrGestionBanner = `
      <div style="margin-bottom:14px;padding:14px 16px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Nivel de Cumplimiento · Gestión Escolar EBR (${momentoStr})</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(nivelObj.nivel)} (${puntaje} / ${maxPts} pts · ${nivelObj.pct}%)</div>
          </div>
          <div>
            <span class="badge ${esc(nivelObj.cls)}" style="font-size:13px;padding:6px 14px;font-weight:800;background:${nivelObj.color};color:#ffffff">${esc(nivelObj.nivel)}</span>
          </div>
        </div>
        <div style="overflow-x:auto">
          <table style="width:100%;font-size:11.5px;border-collapse:collapse;margin-top:6px">
            <thead>
              <tr style="background:var(--surface-sunken,#f8fafc);color:var(--text-muted,#64748b);text-align:left">
                <th style="padding:5px 8px;width:25%">Nivel Oficial</th>
                <th style="padding:5px 8px;width:25%;text-align:center">Rango de Puntaje</th>
                <th style="padding:5px 8px;width:50%">Criterio pedagógico</th>
              </tr>
            </thead>
            <tbody>
              <tr style="${puntaje >= (v === 2 ? 47 : 39) ? 'background:rgba(22,163,74,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#16a34a">LOGRADO ${puntaje >= (v === 2 ? 47 : 39) ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">${v === 2 ? 'De 47 a 69 pts' : 'De 39 a 57 pts'}</td>
                <td style="padding:5px 8px">Evidencia nivel óptimo en las condiciones y compromisos de gestión escolar.</td>
              </tr>
              <tr style="${puntaje >= (v === 2 ? 24 : 20) && puntaje <= (v === 2 ? 46 : 38) ? 'background:rgba(217,119,6,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#d97706">PROCESO ${puntaje >= (v === 2 ? 24 : 20) && puntaje <= (v === 2 ? 46 : 38) ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">${v === 2 ? 'De 24 a 46 pts' : 'De 20 a 38 pts'}</td>
                <td style="padding:5px 8px">En proceso de implementación; requiere consolidar acciones de mejora.</td>
              </tr>
              <tr style="${puntaje <= (v === 2 ? 23 : 19) ? 'background:rgba(220,38,38,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#dc2626">INICIO ${puntaje <= (v === 2 ? 23 : 19) ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">${v === 2 ? 'De 0 a 23 pts' : 'De 0 a 19 pts'}</td>
                <td style="padding:5px 8px">Requiere asistencia técnica prioritaria para el cumplimiento de condiciones.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  let coordTutoriaBanner = '';
  if (isCoordTutoria) {
    let puntaje = s.puntaje;
    if (puntaje === undefined || puntaje === null) {
      puntaje = (s.respuestas || []).reduce((acc, r) => {
        const v = Number(r.valor);
        return !isNaN(v) && v >= 1 && v <= 3 ? acc + v : acc;
      }, 0);
    }
    const nivelInfo = getNivelCoordTutoriaJec(puntaje);
    const nivelLabel = s.nivel_cumplimiento || nivelInfo.nivel;
    const nivelDesc = s.descripcion_cumplimiento || nivelInfo.descripcion;
    const nivelCls = nivelInfo.cls;
    const pct = Math.round((puntaje / 63) * 100);

    coordTutoriaBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Nivel de Cumplimiento Oficial (Funciones del Coordinador(a) de Tutoría JEC)</span>
            <div style="font-size:18px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(nivelLabel)}</div>
          </div>
          <div style="text-align:right">
            <span class="badge ${esc(nivelCls)}" style="font-size:13px;padding:5px 14px;font-weight:700">${esc(nivelLabel)}</span>
            <div style="font-size:12px;color:var(--text-muted,#64748b);margin-top:3px;font-weight:700">${puntaje} de 63 puntos (${pct}%)</div>
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--text-800,#1e293b);background:var(--surface-sunken,#f8fafc);padding:8px 12px;border-radius:6px;margin:0 0 10px 0;border-left:3px solid var(--primary,#2563eb)">
          <strong>Criterio oficial:</strong> ${esc(nivelDesc)}
        </p>
        <div class="tblWrap" style="margin-top:8px">
          <table class="dataTable" style="font-size:11.5px;width:100%;border-collapse:collapse;text-align:left">
            <thead>
              <tr style="background:var(--surface-sunken,#f1f5f9)">
                <th style="padding:5px 8px;width:25%">Nivel de cumplimiento</th>
                <th style="padding:5px 8px;width:20%;text-align:center">Puntaje</th>
                <th style="padding:5px 8px;width:55%">Descripción oficial de la función</th>
              </tr>
            </thead>
            <tbody>
              <tr style="${puntaje >= 53 ? 'background:rgba(22,163,74,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#16a34a">Cumple ${puntaje >= 53 ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">De 53 a 63</td>
                <td style="padding:5px 8px">El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.</td>
              </tr>
              <tr style="${puntaje >= 42 && puntaje <= 52 ? 'background:rgba(217,119,6,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#d97706">Cumple parcialmente ${puntaje >= 42 && puntaje <= 52 ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">De 42 a 52</td>
                <td style="padding:5px 8px">El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.</td>
              </tr>
              <tr style="${puntaje < 42 ? 'background:rgba(220,38,38,0.12);font-weight:700' : ''}">
                <td style="padding:5px 8px;color:#dc2626">No cumple ${puntaje < 42 ? '✓ (Obtenido)' : ''}</td>
                <td style="padding:5px 8px;text-align:center">De 21 a 41</td>
                <td style="padding:5px 8px">El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  let coordPedagogicoBanner = '';
  const isCoordPed = !isDocente && isFichaCoordPedagogico(s);
  if (isCoordPed) {
    let puntaje = s.puntaje;
    if (puntaje === undefined || puntaje === null) {
      puntaje = (s.respuestas || []).reduce((acc, r) => {
        const v = Number(r.valor);
        return !isNaN(v) && v >= 1 && v <= 3 ? acc + v : acc;
      }, 0);
    }
    const nivelInfo = getNivelCoordPedagogicoJec(puntaje);
    const nivelLabel = s.nivel_cumplimiento || nivelInfo.nivel;
    const nivelDesc = s.descripcion_cumplimiento || nivelInfo.descripcion;
    const nivelCls = nivelInfo.cls;
    const pct = Math.round((puntaje / 51) * 100);

    coordPedagogicoBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:10px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Nivel de Cumplimiento Oficial (Funciones del Coordinador(a) Pedagógico JEC)</span>
            <div style="font-size:18px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(nivelLabel)}</div>
          </div>
          <div style="text-align:right">
            <span class="badge ${esc(nivelCls)}" style="font-size:13px;padding:5px 14px;font-weight:700">${esc(nivelLabel)}</span>
            <div style="font-size:12px;color:var(--text-muted,#64748b);margin-top:3px;font-weight:700">${puntaje} de 51 puntos (${pct}%)</div>
          </div>
        </div>
        <p style="font-size:12.5px;color:var(--text-800,#1e293b);background:var(--surface-sunken,#f8fafc);padding:8px 12px;border-radius:6px;margin:0 0 10px 0;border-left:3px solid var(--primary,#2563eb)">
          <strong>Criterio oficial:</strong> ${esc(nivelDesc)}
        </p>
      </div>
    `;
  }

  let docenteBanner = '';
  if (isDocente) {
    const pct = (s.porcentaje !== undefined && s.porcentaje !== null) ? Number(s.porcentaje) : (s.pct !== undefined ? Number(s.pct) : null);
    const estado = s.estado || (pct !== null ? (pct >= 75 ? 'Logrado' : (pct >= 50 ? 'En proceso' : 'Inicio')) : 'Registrado');
    let estadoColor = '#16a34a';
    let estadoCls = 'st-logrado';
    if (estado === 'En proceso' || String(estado).toLowerCase().includes('proces')) { estadoColor = '#d97706'; estadoCls = 'st-proceso'; }
    else if (estado === 'Inicio' || String(estado).toLowerCase().includes('inic')) { estadoColor = '#dc2626'; estadoCls = 'st-inicio'; }

    docenteBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Monitoreo Pedagógico a Docentes · Rúbricas de Aula (EBR-EBA 2026)</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">Nivel de Logro: ${esc(estado)} ${pct !== null ? `(${pct}%)` : ''}</div>
          </div>
          <div>
            <span class="badge ${esc(estadoCls)}" style="font-size:13px;padding:5px 14px;font-weight:700;background:${estadoColor};color:#ffffff">${esc(estado)}</span>
          </div>
        </div>
      </div>
    `;
  }

  let jecNivelBanner = '';
  if (isJec) {
    const totalSi = s.conteo_si !== undefined
      ? s.conteo_si
      : (s.respuestas || []).filter(r => (r.valor || '').toLowerCase() === 'si' || (r.valor || '').toLowerCase() === 'sí').length;
    const nivelObj = getNivelLogroJec(totalSi);
    jecNivelBanner = `
      <div style="margin-bottom:14px;padding:12px 16px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
        <div>
          <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Nivel de Implementación del MSE JEC</span>
          <div style="font-size:16px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(nivelObj.nivel)}</div>
        </div>
        <div style="text-align:right">
          <span class="badge ${esc(nivelObj.cls)}" style="font-size:12.5px;padding:5px 12px;font-weight:700">${esc(nivelObj.nivel)}</span>
          <div style="font-size:11.5px;color:var(--text-muted,#64748b);margin-top:3px;font-weight:600">${totalSi} de 31 respuestas "Sí"</div>
        </div>
      </div>
    `;
  }

  let cebeBanner = '';
  const isCebe = isFichaCebeGestion(s);
  if (isCebe) {
    const v = Number(s.visita) || 1;
    const puntaje = (s.puntaje !== undefined && s.puntaje !== null) ? Number(s.puntaje) : 0;
    const pct = (s.porcentaje !== undefined && s.porcentaje !== null) ? Number(s.porcentaje) : Math.round((puntaje / 34) * 100);
    const estado = s.estado || (pct >= 67 ? 'Logrado' : (pct >= 34 ? 'En proceso' : 'Inicio'));
    let estadoColor = '#16a34a';
    let estadoCls = 'st-logrado';
    if (estado === 'En proceso' || String(estado).toLowerCase().includes('proces')) { estadoColor = '#d97706'; estadoCls = 'st-proceso'; }
    else if (estado === 'Inicio' || String(estado).toLowerCase().includes('inic')) { estadoColor = '#dc2626'; estadoCls = 'st-inicio'; }

    let personalHtml = '';
    const tp = s.tablasPersonal || {};
    if (tp.personal || tp.personalSaanee || tp.accesoEstudiantes) {
      personalHtml = `
        <div style="margin-top:12px;margin-bottom:12px;padding:12px;background:var(--surface-sunken,#f8fafc);border-radius:6px;border:1px solid var(--border-soft,#e2e8f0)">
          <div style="font-weight:700;font-size:12px;color:var(--text-900,#0f172a);margin-bottom:6px">I. Cuadros Estadísticos del CEBE</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--text-700,#334155)">
            <div><strong>Estudiantes Inicial:</strong> Matr. ${tp.accesoEstudiantes?.ini_mat || '0'} · Asist. ${tp.accesoEstudiantes?.ini_asis || '0'}</div>
            <div>·</div>
            <div><strong>Estudiantes Primaria:</strong> Matr. ${tp.accesoEstudiantes?.pri_mat || '0'} · Asist. ${tp.accesoEstudiantes?.pri_asis || '0'}</div>
            <div>·</div>
            <div><strong>SAANEE Total:</strong> ${tp.personalSaanee?.saanee_nombrados_tot || '0'} nombrados</div>
          </div>
        </div>
      `;
    }

    let sintesisTableHtml = '';
    const spv = s.sintesisPorVisita;
    if (spv && (spv.v1?.logros || spv.v2?.logros || spv.v3?.logros || spv.v1?.mejoras || spv.v2?.mejoras || spv.v3?.mejoras || spv.v1?.recomendaciones || spv.v2?.recomendaciones || spv.v3?.recomendaciones)) {
      sintesisTableHtml = `
        <div style="margin-top:14px;margin-bottom:12px">
          <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;color:var(--text-900,#0f172a)">IV. Logros, Aspectos de Mejora y Recomendaciones (Por Visita)</div>
          <div style="overflow-x:auto">
            <table class="dataTable" style="font-size:11.5px;width:100%;border-collapse:collapse;text-align:left">
              <thead>
                <tr style="background:var(--surface-sunken,#f1f5f9)">
                  <th style="padding:6px;width:22%">Aspecto</th>
                  <th style="padding:6px;width:26%">Visita 1</th>
                  <th style="padding:6px;width:26%">Visita 2</th>
                  <th style="padding:6px;width:26%">Visita 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Logros observados</td>
                  <td style="padding:6px">${esc(spv.v1?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.logros || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Aspectos de mejora</td>
                  <td style="padding:6px">${esc(spv.v1?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.mejoras || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Recomendaciones</td>
                  <td style="padding:6px">${esc(spv.v1?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.recomendaciones || '—')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    let compromisosHtml = '';
    const cpv = s.compromisosPorVisita;
    const kAct = `v${v}`;
    const compActivo = cpv?.[kAct] || {};
    if (compActivo.director || compActivo.especialista) {
      compromisosHtml = `
        <div style="margin-top:12px;margin-bottom:12px;background:var(--surface-sunken,#f8fafc);padding:10px 14px;border-radius:6px;border-left:3px solid #1e40af">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px;color:#1e40af">V. Compromisos de Mejora · Visita ${v}</div>
          ${compActivo.director ? `<div style="font-size:11.5px;margin-bottom:3px"><strong>Directivo(a):</strong> ${esc(compActivo.director)}</div>` : ''}
          ${compActivo.especialista ? `<div style="font-size:11.5px"><strong>Especialista AGEBRE:</strong> ${esc(compActivo.especialista)}</div>` : ''}
        </div>
      `;
    }

    cebeBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Gestión Escolar CEBE · RM N° 501-2025-MINEDU</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">Visita ${v} de 3 · ${esc(estado)} (${puntaje} / 34 pts · ${pct}%)</div>
          </div>
          <div>
            <span class="badge ${esc(estadoCls)}" style="font-size:13px;padding:5px 14px;font-weight:700;background:${estadoColor};color:#ffffff">${esc(estado)}</span>
          </div>
        </div>
        ${personalHtml}
        ${sintesisTableHtml}
        ${compromisosHtml}
      </div>
    `;
  }

  let priteBanner = '';
  const isPrite = isFichaPriteGestion(s);
  if (isPrite) {
    const v = Number(s.visita) || 1;
    const puntaje = (s.puntaje !== undefined && s.puntaje !== null) ? Number(s.puntaje) : 0;
    const pct = (s.porcentaje !== undefined && s.porcentaje !== null) ? Number(s.porcentaje) : Math.round((puntaje / 32) * 100);
    const estado = s.estado || (pct >= 67 ? 'Logrado' : (pct >= 34 ? 'En proceso' : 'Inicio'));
    let estadoColor = '#16a34a';
    let estadoCls = 'st-logrado';
    if (estado === 'En proceso' || String(estado).toLowerCase().includes('proces')) { estadoColor = '#d97706'; estadoCls = 'st-proceso'; }
    else if (estado === 'Inicio' || String(estado).toLowerCase().includes('inic')) { estadoColor = '#dc2626'; estadoCls = 'st-inicio'; }

    let personalHtml = '';
    const tp = s.tablasPersonal || {};
    if (tp.personal || tp.accesoEstudiantes) {
      personalHtml = `
        <div style="margin-top:12px;margin-bottom:12px;padding:12px;background:var(--surface-sunken,#f8fafc);border-radius:6px;border:1px solid var(--border-soft,#e2e8f0)">
          <div style="font-weight:700;font-size:12px;color:var(--text-900,#0f172a);margin-bottom:6px">I. Cuadros Estadísticos del PRITE</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11.5px;color:var(--text-700,#334155)">
            <div><strong>Estudiantes Inicial:</strong> Matr. ${tp.accesoEstudiantes?.ini_mat || '0'} · Asist. ${tp.accesoEstudiantes?.ini_asis || '0'}</div>
            <div>·</div>
            <div><strong>Directora:</strong> ${tp.personal?.directora_tot || '0'} (Asist. ${tp.personal?.directora_asis || '0'})</div>
            <div>·</div>
            <div><strong>Tutores:</strong> ${Number(tp.personal?.tutores_nom_tot || 0) + Number(tp.personal?.tutores_cont_tot || 0)} (Nombrados: ${tp.personal?.tutores_nom_tot || '0'}, Contratados: ${tp.personal?.tutores_cont_tot || '0'})</div>
            <div>·</div>
            <div><strong>CAS:</strong> ${tp.personal?.prof_cas_tot || '0'} · <strong>Administrativo:</strong> ${tp.personal?.personal_adm_tot || '0'}</div>
          </div>
        </div>
      `;
    }

    let sintesisTableHtml = '';
    const spv = s.sintesisPorVisita;
    if (spv && (spv.v1?.logros || spv.v2?.logros || spv.v3?.logros || spv.v1?.mejoras || spv.v2?.mejoras || spv.v3?.mejoras || spv.v1?.recomendaciones || spv.v2?.recomendaciones || spv.v3?.recomendaciones)) {
      sintesisTableHtml = `
        <div style="margin-top:14px;margin-bottom:12px">
          <div style="font-weight:700;font-size:12.5px;margin-bottom:6px;color:var(--text-900,#0f172a)">IV. Logros, Aspectos de Mejora y Recomendaciones (Por Visita)</div>
          <div style="overflow-x:auto">
            <table class="dataTable" style="font-size:11.5px;width:100%;border-collapse:collapse;text-align:left">
              <thead>
                <tr style="background:var(--surface-sunken,#f1f5f9)">
                  <th style="padding:6px;width:22%">Aspecto</th>
                  <th style="padding:6px;width:26%">Visita 1</th>
                  <th style="padding:6px;width:26%">Visita 2</th>
                  <th style="padding:6px;width:26%">Visita 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Logros observados</td>
                  <td style="padding:6px">${esc(spv.v1?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.logros || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.logros || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Aspectos de mejora</td>
                  <td style="padding:6px">${esc(spv.v1?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.mejoras || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.mejoras || '—')}</td>
                </tr>
                <tr>
                  <td style="font-weight:700;padding:6px;background:var(--surface-sunken,#f8fafc)">Recomendaciones</td>
                  <td style="padding:6px">${esc(spv.v1?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v2?.recomendaciones || '—')}</td>
                  <td style="padding:6px">${esc(spv.v3?.recomendaciones || '—')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    let compromisosHtml = '';
    const cpv = s.compromisosPorVisita;
    const kAct = `v${v}`;
    const compActivo = cpv?.[kAct] || {};
    if (compActivo.director || compActivo.especialista) {
      compromisosHtml = `
        <div style="margin-top:12px;margin-bottom:12px;background:var(--surface-sunken,#f8fafc);padding:10px 14px;border-radius:6px;border-left:3px solid #1e40af">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px;color:#1e40af">V. Compromisos de Mejora · Visita ${v}</div>
          ${compActivo.director ? `<div style="font-size:11.5px;margin-bottom:3px"><strong>Directivo(a):</strong> ${esc(compActivo.director)}</div>` : ''}
          ${compActivo.especialista ? `<div style="font-size:11.5px"><strong>Especialista AGEBRE:</strong> ${esc(compActivo.especialista)}</div>` : ''}
        </div>
      `;
    }

    priteBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Gestión Escolar PRITE · RM N° 501-2025-MINEDU</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">Visita ${v} de 3 · ${esc(estado)} (${puntaje} / 32 pts · ${pct}%)</div>
          </div>
          <div>
            <span class="badge ${esc(estadoCls)}" style="font-size:13px;padding:5px 14px;font-weight:700;background:${estadoColor};color:#ffffff">${esc(estado)}</span>
          </div>
        </div>
        ${personalHtml}
        ${sintesisTableHtml}
        ${compromisosHtml}
      </div>
    `;
  }

  let matCebeBanner = '';
  const isMatCebe = isFichaMaterialesCebe(s);
  if (isMatCebe) {
    let conteoSi = s.conteo_si;
    if (conteoSi === undefined || conteoSi === null) {
      conteoSi = (s.respuestas || []).filter(r => {
        const v = String(r?.valor || '').toLowerCase();
        return v === 'si' || v === 'sí';
      }).length;
    }
    const totalItems = (s.respuestas || []).length || 14;
    const pct = (s.pct !== undefined && s.pct !== null) ? Number(s.pct) : (s.porcentaje !== undefined && s.porcentaje !== null ? Number(s.porcentaje) : Math.round((conteoSi / totalItems) * 100));
    const estado = pct >= 67 ? 'Logrado' : (pct >= 34 ? 'En proceso' : 'Inicio');
    const estadoCls = pct >= 67 ? 'st-logrado' : (pct >= 34 ? 'st-proceso' : 'st-inicio');
    const estadoColor = pct >= 67 ? '#16a34a' : (pct >= 34 ? '#d97706' : '#dc2626');

    matCebeBanner = `
      <div style="margin-bottom:14px;padding:14px 18px;border-radius:8px;background:var(--surface-card,#ffffff);border:1px solid var(--border-soft,#e2e8f0);box-shadow:0 1px 3px rgba(0,0,0,0.05)">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <span style="font-size:11px;font-weight:700;color:var(--text-muted,#64748b);text-transform:uppercase;letter-spacing:0.5px">Materiales Educativos en CEBE y PRITE · Monitoreo y Uso Pedagógico</span>
            <div style="font-size:17px;font-weight:800;color:var(--text-main,#0f172a);margin-top:2px">${esc(estado)} (${conteoSi} / ${totalItems} ítems Sí · ${pct}%)</div>
          </div>
          <div>
            <span class="badge ${esc(estadoCls)}" style="font-size:13px;padding:5px 14px;font-weight:700;background:${estadoColor};color:#ffffff">${esc(estado)}</span>
          </div>
        </div>
      </div>
    `;
  }

  const items = (s.respuestas || []).map(r => {
    let opt = ((RESPONSE_OPTIONS && RESPONSE_OPTIONS[s.tipoRespuesta]) || []).find(o => o.v === r.valor);
    if (!opt && RESPONSE_OPTIONS) {
      for (const list of Object.values(RESPONSE_OPTIONS)) {
        opt = list.find(o => o.v === r.valor);
        if (opt) break;
      }
    }
    const evidText = r.evidencia || r.hallazgo;
    const hallazgoHtml = evidText ? `<div style="margin-top:6px;font-size:11.5px;color:var(--text-800,#1e293b);background:var(--surface-sunken,#f8fafc);padding:5px 10px;border-radius:4px;border-left:3px solid var(--primary,#2563eb)"><strong>${r.evidencia ? '📕 Evidencia:' : 'Hallazgo:'}</strong> ${esc(evidText)}</div>` : '';
    return '<div class="itemRow"><div class="itxt"><strong style="font-weight:600;color:var(--ink-soft);font-size:11.5px">' + esc(r.seccion || '') + '</strong><br>' + esc(r.texto || '') + hallazgoHtml + '</div><div class="optGroup"><span class="badge st-none" style="color:var(--ink)">' + esc(opt ? opt.l : (r.valor || '—')) + '</span></div></div>';
  }).join('') || '<p class="helpText">Sin respuestas registradas.</p>';

  let docentesTableHtml = '';
  if (s.docentes_monitoreo) {
    const renderMiniGrid = (title, m) => {
      if (!m) return '';
      const rubros = ['r1', 'r2', 'r3', 'r4', 'r5'];
      const headers = ['R1', 'R2', 'R3', 'R4', 'R5'];
      const qCells = rubros.map(r => [1, 2, 3, 4].map(n => `<td style="padding:4px;text-align:center">${m[r]?.[`c${n}`] ?? 0}</td>`).join('')).join('');
      const pCells = rubros.map(r => [1, 2, 3, 4].map(n => `<td style="padding:4px;text-align:center;font-size:10px;color:var(--text-muted,#64748b)">${m[r]?.[`p${n}`] ?? 0}%</td>`).join('')).join('');
      return `
        <div style="margin-top:10px;margin-bottom:12px">
          <div style="font-weight:700;font-size:12px;margin-bottom:4px;color:var(--text-900,#0f172a)">
            ${esc(title)} — Total docentes: <strong>${m.total_docentes || 0}</strong> | Monitoreados: <strong>${m.docentes_monitoreados || 0}</strong> (${m.pct_monitoreados || 0}%) | No monitoreados: <strong>${m.docentes_no_monitoreados || 0}</strong> (${m.pct_no_monitoreados || 0}%)
          </div>
          <div style="overflow-x:auto">
            <table class="dataTable" style="font-size:11px;text-align:center;width:100%;border-collapse:collapse">
              <thead>
                <tr>
                  <th rowspan="2" style="padding:4px;background:var(--surface-sunken,#f1f5f9)">Datos</th>
                  ${headers.map(h => `<th colspan="4" style="padding:4px;background:var(--surface-sunken,#f1f5f9)">${h}</th>`).join('')}
                </tr>
                <tr>
                  ${headers.map(() => `<th style="padding:2px;font-size:10px">I</th><th style="padding:2px;font-size:10px">II</th><th style="padding:2px;font-size:10px">III</th><th style="padding:2px;font-size:10px">IV</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr><td style="font-weight:600;padding:4px;text-align:left">Cant.</td>${qCells}</tr>
                <tr><td style="font-weight:600;padding:4px;text-align:left;color:var(--text-muted)">%</td>${pCells}</tr>
              </tbody>
            </table>
          </div>
        </div>
      `;
    };
    docentesTableHtml = '<div class="sectionTitle" style="margin-top:14px">V. Data de docentes monitoreados a la fecha de la visita nivel secundaria</div>' +
      renderMiniGrid('a) 1er monitoreo', s.docentes_monitoreo.m1) +
      renderMiniGrid('b) 2do monitoreo', s.docentes_monitoreo.m2);
  }

  const extras = (s.extras || []).filter(x => x && (x.value !== undefined && x.value !== '')).map(x => {
    let valHtml = esc(x.value);
    if (x.tipo === 'si_no') {
      const cls = x.value === 'Sí' ? 'st-meta' : (x.value === 'No' ? 'st-inicio' : 'st-ninguno');
      valHtml = '<span class="badge ' + cls + '">' + esc(x.value) + '</span>';
    }
    return '<div style="font-size:12.5px;margin-bottom:4px"><strong>' + esc(x.label) + ':</strong> ' + valHtml + '</div>';
  }).join('');
  const comps = (Array.isArray(s.compromisos) ? s.compromisos : Array.isArray(s.compromisosList) ? s.compromisosList : []).map(c => '<li style="margin-bottom:4px">' + esc(c.texto) + (c.responsable ? ' — <em>' + esc(c.responsable) + '</em>' : '') + (c.plazo ? ' <span style="color:var(--ink-soft)">(' + esc(c.plazo) + ')</span>' : '') + '</li>').join('');

  // Info heredada para fichas anteriores
  const legacyInfo = [];
  if (s.codigoModular && !(s.extras || []).some(x => (x.label || '').toLowerCase().includes('código') || (x.label || '').toLowerCase().includes('codigo'))) {
    legacyInfo.push('Código: ' + esc(s.codigoModular));
  }
  const dirName = resolveDirectorName(s);
  if (dirName && dirName !== '—' && !(s.extras || []).some(x => (x.label || '').toLowerCase().includes('director'))) {
    legacyInfo.push('Director(a): ' + esc(dirName));
  }
  if (s.responsable && !(s.extras || []).some(x => (x.label || '').toLowerCase().includes('responsable'))) {
    legacyInfo.push('Responsable: ' + esc(s.responsable));
  }
  const legacyHtml = legacyInfo.length ? '<div style="font-size:12.5px;margin-bottom:10px;color:var(--ink-soft)">' + legacyInfo.join(' · ') + '</div>' : '';

  return '' +
    ebrGestionBanner +
    coordTutoriaBanner +
    coordPedagogicoBanner +
    docenteBanner +
    jecNivelBanner +
    cebeBanner +
    priteBanner +
    matCebeBanner +
    (extras ? '<div class="sectionTitle" style="margin-top:0">Datos generales de la ficha</div>' + extras : '') +
    legacyHtml +
    docentesTableHtml +
    '<div class="sectionTitle" style="margin-top:14px">Respuestas y Hallazgos</div>' + items +
    (s.observaciones ? '<div class="sectionTitle">Observaciones</div><p style="font-size:13px">' + esc(s.observaciones) + '</p>' : '') +
    (comps ? '<div class="sectionTitle">Compromisos de mejora</div><ul style="margin:0;padding-left:18px;font-size:13px">' + comps + '</ul>' : '');
}