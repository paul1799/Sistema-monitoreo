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
    visitas: [1, 2, 3],
    momentoLabel: '1er, 2do y 3er Momento',
    nombreCorto: 'Monitoreo a la Implementación del Modelo JEC',
    subTitle: 'Seguimiento por Colegio · Monitoreo a la Implementación del Modelo JEC',
    desc: 'Instituciones educativas JEC monitoreadas a la izquierda y colegios pendientes a la derecha según el momento seleccionado.'
  },
  'ft_msejec_2do': {
    id: 'ft_msejec_2do',
    tipo: 'institucional',
    momento: 2,
    visitas: [1, 2, 3],
    momentoLabel: '1er, 2do y 3er Momento',
    nombreCorto: 'Monitoreo a la Implementación del Modelo JEC',
    subTitle: 'Seguimiento por Colegio · Monitoreo a la Implementación del Modelo JEC',
    desc: 'Instituciones educativas JEC monitoreadas a la izquierda y colegios pendientes a la derecha según el momento seleccionado.'
  },
  'ft_msejec_3er': {
    id: 'ft_msejec_3er',
    tipo: 'institucional',
    momento: 3,
    visitas: [1, 2, 3],
    momentoLabel: '1er, 2do y 3er Momento',
    nombreCorto: 'Monitoreo a la Implementación del Modelo JEC',
    subTitle: 'Seguimiento por Colegio · Monitoreo a la Implementación del Modelo JEC',
    desc: 'Instituciones educativas JEC monitoreadas a la izquierda y colegios pendientes a la derecha según el momento seleccionado.'
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

  // Fichas de coordinadores (2do y 3er momento)
  if (cfg && (cfg.tipo === 'coord_tutoria' || cfg.tipo === 'coord_pedag')) {
    return `
      <select id="fil_visita">
        <option value="">Todas (2do y 3er Momento)</option>
        <option value="2"${curVis === '2' ? ' selected' : ''}>2do Momento (Visita 2)</option>
        <option value="3"${curVis === '3' ? ' selected' : ''}>3er Momento (Visita 3)</option>
      </select>
    `;
  }

  // Ficha unificada de Implementación del Modelo JEC (3 momentos homogéneos estilo EBR)
  return `
    <select id="fil_visita">
      <option value="">Todas las visitas (1er, 2do y 3er Monitoreo)</option>
      <option value="1"${curVis === '1' ? ' selected' : ''}>1er Monitoreo · Primer momento (Inicio)</option>
      <option value="2"${curVis === '2' ? ' selected' : ''}>2do Monitoreo · Segundo momento (Proceso)</option>
      <option value="3"${curVis === '3' ? ' selected' : ''}>3er Monitoreo · Tercer momento (Salida)</option>
    </select>
  `;
}

/**
 * Genera las insignias de visita para las instituciones monitoreadas JEC
 */
export function buildJecVisitBadges(g, ft, state, curVis = '') {
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
    const isActive = String(curVis).trim() === String(vn);

    if (isCoord && targetCoord > 1) {
      const isComplete = count >= targetCoord;
      const bStyle = isComplete
        ? (isActive ? 'background:#047857;color:#ffffff;border:1px solid #065f46;' : 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;')
        : (isActive ? 'background:#b45309;color:#ffffff;border:1px solid #92400e;' : 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;');
      return `<button type="button" class="badge btnVisitaBadge ${isActive ? 'active' : ''}" data-vis="${vn}" style="${bStyle}font-size:10.5px;padding:3px 7px;font-weight:700;cursor:pointer;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;line-height:1;margin:0" title="Filtrar reporte por ${mLabel}">V${vn} (${count}/${targetCoord})</button>`;
    }

    if (cfg?.tipo === 'institucional') {
      const bStyle = isActive ? 'background:#1d4ed8;color:#ffffff;border:1px solid #1e40af;' : 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;';
      return `<button type="button" class="badge btnVisitaBadge ${isActive ? 'active' : ''}" data-vis="${vn}" style="${bStyle}font-size:10.5px;padding:3px 7px;font-weight:700;cursor:pointer;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;line-height:1;margin:0" title="Filtrar reporte por ${mLabel}">V${vn}${count > 1 ? ` (${count})` : ''}</button>`;
    }

    const bStyle = isActive ? 'background:#1e40af;color:#ffffff;border:1px solid #1e3a8a;' : 'background:#f1f5f9;color:#1e293b;border:1px solid #cbd5e1;';
    return `<button type="button" class="badge btnVisitaBadge ${isActive ? 'active' : ''}" data-vis="${vn}" style="${bStyle}font-size:10.5px;padding:3px 7px;font-weight:700;cursor:pointer;border-radius:5px;white-space:nowrap;display:inline-flex;align-items:center;line-height:1;margin:0" title="Filtrar reporte por Visita ${vn}">V${vn}${count > 1 ? ` (${count})` : ''}</button>`;
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
  const isCoord = cfg && (cfg.tipo === 'coord_tutoria' || cfg.tipo === 'coord_pedag');

  // Fichas de Coordinador Pedagógico y Tutoría: 3 botones (Todos y los 2 momentos: 2do y 3er Momento)
  if (isCoord) {
    const countV2 = allPendingItems.filter(p => p.visita === 2).length;
    const countV3 = allPendingItems.filter(p => p.visita === 3).length;

    return `
      <div class="pendientesVisitaTabs" id="pendientesVisitaTabs">
        <button type="button" class="btnVisitaTab ${initialVisTab === 'ALL' ? 'active' : ''}" data-tab="ALL">
          Todos (${allPendingItems.length})
        </button>
        <button type="button" class="btnVisitaTab ${initialVisTab === 'V2' ? 'active' : ''}" data-tab="V2">
          2do Momento (${countV2})
        </button>
        <button type="button" class="btnVisitaTab ${initialVisTab === 'V3' ? 'active' : ''}" data-tab="V3">
          3er Momento (${countV3})
        </button>
      </div>
    `;
  }

  // Ficha de Monitoreo a la Implementación del Modelo JEC: 4 botones (Todos, 1er Momento, 2do Momento, 3er Momento)
  const countV1 = allPendingItems.filter(p => p.visita === 1).length;
  const countV2 = allPendingItems.filter(p => p.visita === 2).length;
  const countV3 = allPendingItems.filter(p => p.visita === 3).length;

  return `
    <div class="pendientesVisitaTabs" id="pendientesVisitaTabs">
      <button type="button" class="btnVisitaTab ${initialVisTab === 'ALL' ? 'active' : ''}" data-tab="ALL">
        Todos (${allPendingItems.length})
      </button>
      <button type="button" class="btnVisitaTab ${initialVisTab === 'V1' ? 'active' : ''}" data-tab="V1">
        1er Momento (${countV1})
      </button>
      <button type="button" class="btnVisitaTab ${initialVisTab === 'V2' ? 'active' : ''}" data-tab="V2">
        2do Momento (${countV2})
      </button>
      <button type="button" class="btnVisitaTab ${initialVisTab === 'V3' ? 'active' : ''}" data-tab="V3">
        3er Momento (${countV3})
      </button>
    </div>
  `;
}
