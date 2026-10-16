/* =========================================================================
   jec-reportes.js — Submódulo desfragmentado para la lógica y reportes JEC
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026

   Reglas oficiales del Modelo JEC (3 Momentos):
   - 1er Momento: Se aplica ÚNICAMENTE la Ficha de 1er Monitoreo (ft_msejec_1er).
     (1 sola vez por colegio; no aplican fichas de coordinadores).
   - 2do Momento: Se aplican 3 fichas:
     * Ficha de 2do Monitoreo a la Implementación JEC (ft_msejec_2do, 1 por IE)
     * Ficha de Coordinador(a) Pedagógico (ft_coord_pedagogico, 1-3 por IE)
     * Ficha de Coordinador(a) de Tutoría (ft_coord_tutoria_jec, 1-3 por IE)
   - 3er Momento: Se aplican 3 fichas:
     * Ficha de 3er Monitoreo a la Implementación JEC (ft_msejec_3er, 1 por IE)
     * Ficha de Coordinador(a) Pedagógico (ft_coord_pedagogico, 1-3 por IE)
     * Ficha de Coordinador(a) de Tutoría (ft_coord_tutoria_jec, 1-3 por IE)
   ========================================================================= */

import { esc, normalizeText, normalizeInstName, normalizeReiNumber } from './core-utils.js?v=20261015_v1';
import {
  isFichaJec,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  getMomentoFichaJec
} from '../calcEngine.js?v=20261016_v1';

/**
 * Configuración canónica de las 5 fichas del Modelo JEC
 */
export const JEC_FICHAS_CONFIG = {
  'ft_msejec_1er': {
    id: 'ft_msejec_1er',
    tipo: 'institucional',
    momento: 1,
    visitas: [1],
    momentoLabel: '1er Momento',
    nombreCorto: '1er Monitoreo - Modelo JEC',
    subTitle: 'Seguimiento por Colegio · 1er Monitoreo a la Implementación del Modelo JEC',
    desc: 'Instituciones educativas JEC monitoreadas en el 1er Momento (Inicio) a la izquierda y colegios pendientes a la derecha.'
  },
  'ft_msejec_2do': {
    id: 'ft_msejec_2do',
    tipo: 'institucional',
    momento: 2,
    visitas: [2],
    momentoLabel: '2do Momento',
    nombreCorto: '2do Monitoreo - Modelo JEC',
    subTitle: 'Seguimiento por Colegio · 2do Monitoreo a la Implementación del Modelo JEC',
    desc: 'Instituciones educativas JEC monitoreadas en el 2do Momento a la izquierda y colegios pendientes a la derecha.'
  },
  'ft_msejec_3er': {
    id: 'ft_msejec_3er',
    tipo: 'institucional',
    momento: 3,
    visitas: [3],
    momentoLabel: '3er Momento',
    nombreCorto: '3er Monitoreo - Modelo JEC',
    subTitle: 'Seguimiento por Colegio · 3er Monitoreo a la Implementación del Modelo JEC',
    desc: 'Instituciones educativas JEC monitoreadas en el 3er Momento (Balance y cierre) a la izquierda y colegios pendientes a la derecha.'
  },
  'ft_coord_tutoria_jec': {
    id: 'ft_coord_tutoria_jec',
    tipo: 'coord_tutoria',
    momento: null,
    visitas: [2, 3], // 2do y 3er momento únicamente
    momentoLabel: '2do y 3er Momento',
    nombreCorto: 'Coord. de Tutoría (JEC)',
    subTitle: 'Seguimiento de Coordinadores de Tutoría (JEC) · 2do y 3er Momento',
    desc: 'IEs con coordinadores evaluados a la izquierda y colegios con coordinaciones de tutoría pendientes a la derecha (según cantidad de tutores/coordinadores por IE).'
  },
  'ft_coord_pedagogico': {
    id: 'ft_coord_pedagogico',
    tipo: 'coord_pedag',
    momento: null,
    visitas: [2, 3], // 2do y 3er momento únicamente
    momentoLabel: '2do y 3er Momento',
    nombreCorto: 'Coord. Pedagógico (JEC)',
    subTitle: 'Seguimiento de Coordinadores Pedagógicos (JEC) · 2do y 3er Momento',
    desc: 'IEs con coordinadores evaluados a la izquierda y colegios con coordinaciones pedagógicas pendientes a la derecha (según cantidad de coordinadores por IE).'
  }
};

/**
 * Obtiene la configuración específica de una ficha JEC
 * @param {Object|string} ft - Ficha o ID
 * @returns {Object|null}
 */
export function getJecFichaConfig(ft) {
  if (!ft) return null;
  const id = (typeof ft === 'string' ? ft : (ft.id || ft.fichaTypeId || '')).toLowerCase();

  if (id === 'ft_msejec_1er' || id.includes('1er')) return JEC_FICHAS_CONFIG['ft_msejec_1er'];
  if (id === 'ft_msejec_3er' || id.includes('3er')) return JEC_FICHAS_CONFIG['ft_msejec_3er'];
  if (id === 'ft_msejec_2do' || id === 'ft_jec' || (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft))) {
    return JEC_FICHAS_CONFIG['ft_msejec_2do'];
  }
  if (isFichaCoordTutoriaJec(ft)) return JEC_FICHAS_CONFIG['ft_coord_tutoria_jec'];
  if (isFichaCoordPedagogico(ft)) return JEC_FICHAS_CONFIG['ft_coord_pedagogico'];

  return null;
}

/**
 * Retorna la lista de visitas válidas según la ficha JEC
 * - 1er Monitoreo -> [1]
 * - 2do Monitoreo -> [2]
 * - 3er Monitoreo -> [3]
 * - Coordinadores -> [2, 3] (NO aplica V1)
 */
export function getJecVisitasToCheck(ft) {
  const cfg = getJecFichaConfig(ft);
  if (cfg && Array.isArray(cfg.visitas)) return cfg.visitas;
  return [1, 2, 3];
}

/**
 * Retorna la etiqueta amigable del momento para una visita JEC
 */
export function getMomentoLabelJec(vNum) {
  const n = Number(vNum) || 1;
  if (n === 1) return '1er Momento (V1)';
  if (n === 2) return '2do Momento (V2)';
  if (n === 3) return '3er Momento (V3)';
  return `Momento ${n} (V${n})`;
}

/**
 * Genera el selector HTML de Visita / Momento para la Sección 2 de Reportes
 */
export function renderJecVisitaSelectHtml(ft, activeVisita) {
  const cfg = getJecFichaConfig(ft);
  const curVis = String(activeVisita || '').trim();

  if (!cfg) {
    return `
      <select id="fil_visita">
        <option value="">Todas</option>
        <option value="1"${curVis === '1' ? ' selected' : ''}>Visita 1</option>
        <option value="2"${curVis === '2' ? ' selected' : ''}>Visita 2</option>
        <option value="3"${curVis === '3' ? ' selected' : ''}>Visita 3</option>
      </select>
    `;
  }

  if (cfg.tipo === 'institucional') {
    const v = cfg.momento;
    const isVSelected = String(curVis) === String(v) || !curVis;
    return `
      <select id="fil_visita">
        <option value="${v}"${isVSelected ? ' selected' : ''}>${cfg.momentoLabel} (V${v}) · Momento oficial único</option>
        <option value=""${curVis === '' ? ' selected' : ''}>Todos los registros (sin filtro de momento)</option>
      </select>
    `;
  }

  // Coordinadores (2do y 3er momento)
  return `
    <select id="fil_visita">
      <option value="">Todas (2do y 3er Momento)</option>
      <option value="2"${curVis === '2' ? ' selected' : ''}>2do Momento (Visita 2)</option>
      <option value="3"${curVis === '3' ? ' selected' : ''}>3er Momento (Visita 3)</option>
    </select>
  `;
}

/**
 * Genera las insignias de visita para las instituciones monitoreadas JEC
 */
export function buildJecVisitBadges(g, ft, state) {
  const cfg = getJecFichaConfig(ft);
  const isCoord = cfg && (cfg.tipo === 'coord_tutoria' || cfg.tipo === 'coord_pedag');

  const colMatch = (state?.colegios || []).find(c => {
    if (c.id && (c.id === g.colId || c.id === g.institucion)) return true;
    if (c.ie && normalizeInstName(c.ie) === normalizeInstName(g.institucion)) return true;
    if (c.nombre && normalizeInstName(c.nombre) === normalizeInstName(g.institucion)) return true;
    return false;
  });

  const targetCoord = cfg?.tipo === 'coord_tutoria'
    ? Math.max(1, Number(colMatch?.cantCoordTutoria) || 1)
    : (cfg?.tipo === 'coord_pedag' ? Math.max(1, Number(colMatch?.cantCoordPedag) || 1) : 1);

  const visitaCounts = {};
  g.visitas.forEach(v => {
    let vn = Number(v.s.visita);
    if (!vn || isNaN(vn)) {
      vn = cfg?.momento || 1;
    }
    visitaCounts[vn] = (visitaCounts[vn] || 0) + 1;
  });

  const keys = Object.keys(visitaCounts).map(Number).sort((a, b) => a - b);
  if (keys.length === 0) return '—';

  return keys.map(vn => {
    const count = visitaCounts[vn];
    const mLabel = vn === 1 ? '1er Momento' : (vn === 2 ? '2do Momento' : '3er Momento');

    if (isCoord && targetCoord > 1) {
      const isComplete = count >= targetCoord;
      const bStyle = isComplete
        ? 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;'
        : 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;';
      return `<span class="badge" style="${bStyle}font-size:10px;padding:1px 5px;margin-right:2px;font-weight:700" title="${count} de ${targetCoord} coordinadores registrados en ${mLabel}">V${vn} (${count}/${targetCoord})</span>`;
    }

    if (cfg?.tipo === 'institucional') {
      return `<span class="badge" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:10px;padding:1px 6px;margin-right:2px;font-weight:700">${mLabel}</span>`;
    }

    return `<span class="badge st-none" style="font-size:10px;padding:1px 5px;margin-right:2px;font-weight:700">V${vn}</span>`;
  }).join('');
}

/**
 * Calcula los ítems pendientes para las fichas JEC respetando los momentos oficiales
 */
export function calculateJecPendingItems(targetColegios, visitSubsMap, ft, state, getResponsableFn) {
  const cfg = getJecFichaConfig(ft);
  const visitasToCheck = getJecVisitasToCheck(ft);
  const allPendingItems = [];

  targetColegios.forEach(c => {
    const colId = c.id || '';
    const colNombre = (c.ie || c.nombre || 'Institución Educativa').trim();
    const rawRei = c.rei || c.red || '';
    const reiNum = normalizeReiNumber(rawRei);
    const reiDisplay = reiNum ? String(reiNum).padStart(2, '0') : (rawRei.replace(/^(?:REI|RED)\s*/i, '').trim() || '—');
    const responsable = typeof getResponsableFn === 'function' ? getResponsableFn(c, ft, state) : 'Por asignar';
    const codigoLocal = c.codigoLocal || '';
    const codigoModular = c.codigoModular || '';
    const distrito = c.distrito || '';

    // Meta esperada por visita para este colegio:
    const targetCount = cfg?.tipo === 'coord_tutoria'
      ? Math.max(1, Number(c.cantCoordTutoria) || 1)
      : (cfg?.tipo === 'coord_pedag' ? Math.max(1, Number(c.cantCoordPedag) || 1) : 1);

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
        const isParcial = regCount > 0;
        let detailPending = '';
        if (targetCount > 1) {
          if (isParcial) {
            const faltan = targetCount - regCount;
            detailPending = `${regCount}/${targetCount} reg. (Falta${faltan > 1 ? 'n' : ''} ${faltan})`;
          } else {
            detailPending = `0/${targetCount} coordinadores`;
          }
        }

        const vLabel = vNum === 1 ? '1er Momento (V1)' : (vNum === 2 ? '2do Momento (V2)' : '3er Momento (V3)');

        allPendingItems.push({
          colId,
          colNombre,
          codigoLocal,
          codigoModular,
          distrito,
          rei: reiDisplay,
          reiNum: reiNum || 999,
          visita: vNum,
          visitaLabel: vLabel,
          responsable: responsable || 'Por asignar',
          targetCount,
          regCount,
          parcial: isParcial,
          detailPending
        });
      }
    });
  });

  return allPendingItems;
}

/**
 * Genera los botones de pestañas de visitas / momentos para la tabla de pendientes JEC
 */
export function renderJecPendingTabsHtml(ft, allPendingItems, initialVisTab) {
  const cfg = getJecFichaConfig(ft);
  const visitas = getJecVisitasToCheck(ft);

  if (visitas.length <= 1) {
    const v = visitas[0] || 1;
    const vName = v === 1 ? '1er Momento' : (v === 2 ? '2do Momento' : '3er Momento');
    return `
      <div class="pendientesVisitaTabs" id="pendientesVisitaTabs">
        <button type="button" class="btnVisitaTab active" data-tab="ALL">
          ${vName} (${allPendingItems.length})
        </button>
      </div>
    `;
  }

  // Si tiene 2 visitas (ej. V2 y V3 en coordinadores)
  const countV2 = allPendingItems.filter(p => p.visita === 2).length;
  const countV3 = allPendingItems.filter(p => p.visita === 3).length;

  return `
    <div class="pendientesVisitaTabs" id="pendientesVisitaTabs">
      <button type="button" class="btnVisitaTab ${initialVisTab === 'ALL' ? 'active' : ''}" data-tab="ALL">
        Todos los momentos (${allPendingItems.length})
      </button>
      <button type="button" class="btnVisitaTab ${initialVisTab === 'V2' ? 'active' : ''}" data-tab="V2">
        2do Momento · V2 (${countV2})
      </button>
      <button type="button" class="btnVisitaTab ${initialVisTab === 'V3' ? 'active' : ''}" data-tab="V3">
        3er Momento · V3 (${countV3})
      </button>
    </div>
  `;
}
