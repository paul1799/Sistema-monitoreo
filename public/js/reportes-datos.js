import { calcScore, puntajeItem, estadoPorRegla } from './calcEngine.js?v=20260929_v15';
import {
  isFichaEbrGestionEscolar,
  EBR_GESTION_VISITA_1_SECCIONES,
  EBR_GESTION_VISITA_2_SECCIONES
} from './ebr-gestion.js?v=20260929_v15';
import {
  isFichaJec,
  JEC_SECCIONES
} from './jec-monitoreo.js?v=20260928_v12';

function _normStr(str) {
  return String(str || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function applyFilters(subs, filters, state, colegioIdx, getFichaType, normalizeText, matchColegio) {
  let filtered = subs.slice();
  
  if (filters.institucion) filtered = filtered.filter(s => (s.institucion || '').toLowerCase().includes(filters.institucion.toLowerCase()));
  if (filters.ugel) filtered = filtered.filter(s => (s.ugel || '').toLowerCase().includes(filters.ugel.toLowerCase()));
  if (filters.red) filtered = filtered.filter(s => (s.red || '').toLowerCase().includes(filters.red.toLowerCase()));
  if (filters.visita) filtered = filtered.filter(s => String(s.visita || 1) === String(filters.visita));
  if (filters.responsable) {
    const rNorm = filters.responsable.trim().toLowerCase();
    filtered = filtered.filter(s => (s.responsable || '').trim().toLowerCase().includes(rNorm));
  }
  if (filters.desde) filtered = filtered.filter(s => s.fecha >= filters.desde);
  if (filters.hasta) filtered = filtered.filter(s => s.fecha <= filters.hasta);
  
  if (filters.distrito) filtered = filtered.filter(s => normalizeText((matchColegio(s, colegioIdx) || {}).distrito).includes(normalizeText(filters.distrito)));
  if (filters.tipoGestion) filtered = filtered.filter(s => (matchColegio(s, colegioIdx) || {}).tipoGestion === filters.tipoGestion);
  
  filtered.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.createdAt || 0) - (a.createdAt || 0));
  
  return filtered;
}

export function buildStatsList(subs, isAllMode, selectedFt, getFichaType) {
  return subs.map(s => {
    const sFt = isAllMode ? getFichaType(s.fichaTypeId) : selectedFt;
    return { s, st: sFt ? calcScore(s.respuestas || [], sFt) : { pct: null, secciones: [], estado: { nivel: 'Sin datos', cls: 'st-none' } } };
  });
}

export function getDonaEstadosDataset(statsList) {
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => { 
    const isEbr = (x.s?.fichaTypeId === 'ft_gestion_ugel03_ebr')
      || String(x.s?.fichaTypeNombre || '').toLowerCase().includes('gestion')
      || (x.s?.tipoRespuesta === 'ips')
      || (x.s?.escala === 'IPL');
    if (x.st && x.st.pct !== null && (isEbr || x.st.pct !== null)) {
      if (x.st.pct >= 67) dist.logrado++;
      else if (x.st.pct >= 34) dist.proceso++;
      else dist.inicio++;
    } else {
      const l = x.st?.estado ? (x.st.estado.estado_panel || x.st.estado.nivel || x.st.estado.label) : 'Sin datos'; 
      const lLower = String(l || '').toLowerCase();
      if (lLower.includes('lograd') || lLower.includes('cumple')) dist.logrado++; 
      else if (lLower.includes('proces') || lLower.includes('parcial')) dist.proceso++; 
      else if (lLower.includes('inici') || lLower.includes('mejorar')) dist.inicio++; 
      else dist.none++; 
    }
  });
  return dist;
}

export function getAvancePorTipoFichaDataset(statsList, getFichaType) {
  const typeAgg = {};
  statsList.forEach(x => {
    const tid = x.s.fichaTypeId;
    if (!typeAgg[tid]) {
      const tft = getFichaType(tid);
      typeAgg[tid] = { id: tid, nombre: tft ? tft.nombre : 'Desconocido', icono: tft ? (tft.icono || '📋') : '📋', total: 0, sum: 0, cnt: 0, logrado: 0, proceso: 0, inicio: 0 };
    }
    const a = typeAgg[tid];
    a.total++;
    if (x.st.pct !== null) { a.sum += x.st.pct; a.cnt++; }
    const st = x.st.estado ? x.st.estado.nivel : 'Sin datos';
    if (st === 'Logrado') a.logrado++;
    else if (st === 'En proceso') a.proceso++;
    else if (st === 'Inicio') a.inicio++;
  });
  return Object.values(typeAgg).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(a => ({
    ...a,
    avg: a.cnt ? Math.round(a.sum / a.cnt) : null
  }));
}

export function getApiladasSeccionDataset(statsList, ft) {
  if (!ft) return [];
  const secAgg = {};
  ft.secciones.forEach(sec => secAgg[sec.nombre] = { sum: 0, cnt: 0, answers: { logrado:0, proceso:0, inicio:0, none:0 }, totalItems: 0 });
  statsList.forEach(x => {
    x.st.secciones.forEach(sc => { 
      if (secAgg[sc.nombre]) {
        if (sc.pct !== null) { secAgg[sc.nombre].sum += sc.pct; secAgg[sc.nombre].cnt++; }
        // We can approximate answers distribution per section by mapping the percentage or using raw counts if available
      }
    });
  });
  return Object.keys(secAgg).map(k => ({ nombre: k, avg: secAgg[k].cnt ? Math.round(secAgg[k].sum / secAgg[k].cnt) : null }));
}

export function getRankingCriticosDataset(statsList, ft) {
  if (!ft || statsList.length === 0) return [];
  const itemsCriticos = {};
  ft.secciones.forEach(sec => {
    (sec.items || []).forEach(it => itemsCriticos[it.id] = { id: it.id, texto: it.texto, noInicio: 0, total: 0 });
  });

  statsList.forEach(x => {
    (x.s.respuestas || []).forEach(r => {
      if (itemsCriticos[r.id]) {
        const val = r.valor;
        if (val && val !== 'na' && val !== 'nc' && val !== 'no_aplica' && val !== 'no_corresponde') {
          itemsCriticos[r.id].total++;
          if (val === 'no' || val === 'inicio' || val === '1') {
            itemsCriticos[r.id].noInicio++;
          }
        }
      }
    });
  });

  return Object.values(itemsCriticos)
    .filter(i => i.total > 0)
    .map(i => ({ ...i, pctCritico: Math.round((i.noInicio / i.total) * 100) }))
    .sort((a, b) => b.pctCritico - a.pctCritico)
    .slice(0, 10); // Top 10 Pareto
}

export function getMapaCalorDataset(statsList, ft) {
  if (!ft) return [];
  const ieMap = {};
  statsList.forEach(x => {
    const ieKey = x.s.institucion || 'Sin nombre';
    if (!ieMap[ieKey]) ieMap[ieKey] = { institucion: ieKey, ugel: x.s.ugel, red: x.s.red, secciones: {} };
    x.st.secciones.forEach(sc => {
      ieMap[ieKey].secciones[sc.nombre] = sc.pct;
    });
  });
  return Object.values(ieMap).sort((a, b) => a.institucion.localeCompare(b.institucion));
}

export function getEvolucionVisitasDataset(statsList) {
  const visAgg = {};
  statsList.forEach(x => { 
    const v = Number(x.s.visita) || 1; 
    if (!visAgg[v]) visAgg[v] = { sum: 0, cnt: 0, sumPts: 0, cntPts: 0 }; 
    if (x.st.pct !== null && x.st.pct !== undefined) { visAgg[v].sum += x.st.pct; visAgg[v].cnt++; } 
    if (x.st.puntaje !== null && x.st.puntaje !== undefined) { visAgg[v].sumPts += x.st.puntaje; visAgg[v].cntPts++; }
  });
  return Object.keys(visAgg).sort((a, b) => Number(a) - Number(b)).map(v => ({
    visita: Number(v),
    avg: visAgg[v].cnt ? Math.round(visAgg[v].sum / visAgg[v].cnt) : null,
    avgPts: visAgg[v].cntPts ? Math.round(visAgg[v].sumPts / visAgg[v].cntPts) : null
  }));
}

export function getRubricasNivelDataset(statsList, ft) {
  if (!ft || ft.tipoRespuesta !== 'nivel_1_4') return [];
  const rubricas = ['R1', 'R2', 'R3', 'R4', 'R5'];
  const agg = { 1: {}, 2: {} }; // Visitas 1 y 2
  
  [1, 2].forEach(v => {
    rubricas.forEach(r => agg[v][r] = { I: 0, II: 0, III: 0, IV: 0, total: 0 });
  });

  statsList.forEach(x => {
    const v = x.s.visita || 1;
    if (v > 2) return;
    (x.s.respuestas || []).forEach(r => {
      // Find which rubric it is by text parsing or if ID has R1-R5
      const itemDef = ft.secciones.flatMap(s => s.items).find(i => i && i.id === r.id);
      if (itemDef) {
        const textMatch = itemDef.texto.match(/(R[1-5])/);
        const rKey = textMatch ? textMatch[1] : null;
        if (rKey && agg[v][rKey]) {
          if (r.valor === '1') { agg[v][rKey].I++; agg[v][rKey].total++; }
          else if (r.valor === '2') { agg[v][rKey].II++; agg[v][rKey].total++; }
          else if (r.valor === '3') { agg[v][rKey].III++; agg[v][rKey].total++; }
          else if (r.valor === '4') { agg[v][rKey].IV++; agg[v][rKey].total++; }
        }
      }
    });
  });
  return agg;
}

export function getCoberturaDataset(statsList, colegios) {
  // Simplificado: colegios en padron vs fichas registradas
  const totalColegios = colegios ? colegios.length : 0;
  const colegiosMonitoreados = new Set(statsList.map(x => x.s.colegioId || (x.s.institucion ? x.s.institucion.trim().toLowerCase() : null)).filter(Boolean)).size;
  return { total: totalColegios, monitoreados: colegiosMonitoreados, faltan: Math.max(0, totalColegios - colegiosMonitoreados) };
}

export function getCompromisosDataset(statsList) {
  let pendientes = 0, cumplidos = 0, vencidos = 0;
  const now = Date.now();
  statsList.forEach(x => {
    (x.s.compromisos || []).forEach(c => {
      if (c.estado === 'cumplido') cumplidos++;
      else {
        const d = new Date(c.fechaCumplimiento).getTime();
        if (d < now) vencidos++;
        else pendientes++;
      }
    });
  });
  return { pendientes, cumplidos, vencidos };
}

export function getSugerencias(statsList, ft, rankingCriticos) {
  const sugerencias = [];
  
  if (rankingCriticos && rankingCriticos.length > 0) {
    const top = rankingCriticos[0];
    if (top.pctCritico >= 40) {
      sugerencias.push({
        tipo: 'GIA',
        mensaje: `El ítem "${top.texto}" presenta un ${top.pctCritico}% de resultados críticos (No/Inicio). Se sugiere programar un GIA o taller enfocado en este tema.`
      });
    }
  }
  
  // Sugerencia de Asistencia técnica
  const incipientes = statsList.filter(x => x.st.estado && (x.st.estado.nivel === 'Inicio' || x.st.estado.nivel === 'Incipiente')).length;
  if (incipientes > 0) {
    sugerencias.push({
      tipo: 'Asistencia Técnica',
      mensaje: `Hay ${incipientes} IE con nivel crítico general. Se sugiere visita de acompañamiento y asistencia técnica en un plazo máximo de 15 días.`
    });
  }

  return sugerencias;
}

/**
 * Obtiene los 3–4 hallazgos clave calculados automáticamente a partir de los datos filtrados
 * para el panel del Reporte Consolidado (evita redundancias con la tabla de distribución).
 */
export function getHallazgosClave(statsList, ft, isEbr) {
  const hallazgos = [];
  if (!statsList || statsList.length === 0) return hallazgos;

  // 1. Dimensión con menor cumplimiento
  const secAgg = {};
  statsList.forEach(x => {
    (x.st?.secciones || []).forEach(sc => {
      if (!secAgg[sc.nombre]) secAgg[sc.nombre] = { sum: 0, cnt: 0 };
      if (sc.pct !== null && sc.pct !== undefined) {
        secAgg[sc.nombre].sum += sc.pct;
        secAgg[sc.nombre].cnt++;
      }
    });
  });

  const secAverages = Object.entries(secAgg)
    .filter(([_, v]) => v.cnt > 0)
    .map(([nombre, v]) => ({ nombre, avg: Math.round(v.sum / v.cnt) }))
    .sort((a, b) => a.avg - b.avg);

  if (secAverages.length > 0) {
    const dimMin = secAverages[0];
    hallazgos.push(`Dimensión con menor avance: "${dimMin.nombre}" (${dimMin.avg}%).`);
  }

  // 2. Número de I.E. con alguna dimensión por debajo del 67% (máx 3 con su REI)
  const cutOff = isEbr ? 67 : 70;
  const ieAfectadasMap = new Map();
  statsList.forEach(x => {
    const s = x.s || {};
    const nombreIE = s.institucion || 'IE sin nombre';
    const rRaw = String(s.red || '').trim();
    const rNum = rRaw.replace(/\D/g, '');
    const red = rNum ? `REI ${rNum.padStart(2, '0')}` : (rRaw ? `REI ${rRaw}` : '—');
    const tieneBaja = (x.st?.secciones || []).some(sc => sc.pct !== null && sc.pct !== undefined && sc.pct < cutOff);
    if (tieneBaja && !ieAfectadasMap.has(nombreIE)) {
      ieAfectadasMap.set(nombreIE, red);
    }
  });

  const totalAfectadas = ieAfectadasMap.size;
  if (totalAfectadas > 0) {
    const ejemplos = Array.from(ieAfectadasMap.entries()).slice(0, 3).map(([ie, red]) => `${ie} (${red})`).join(', ');
    const mas = totalAfectadas > 3 ? ` y ${totalAfectadas - 3} más` : '';
    hallazgos.push(`${totalAfectadas} ${totalAfectadas === 1 ? 'I.E. presenta' : 'II.EE. presentan'} dimensión < ${cutOff}%: ${ejemplos}${mas}.`);
  } else {
    hallazgos.push(`100% de II.EE. con avance óptimo (>= ${cutOff}%) en todas sus dimensiones.`);
  }

  // 3. Indicador con más fichas en Inicio o Proceso
  const itemIssues = {};
  statsList.forEach(x => {
    (x.s?.respuestas || []).forEach(r => {
      if (!r || !r.id) return;
      const v = String(r.valor || '').trim().toLowerCase();
      if (v === 'inicio' || v === 'proceso' || v === '1' || v === '2' || v === 'no') {
        if (!itemIssues[r.id]) {
          itemIssues[r.id] = { id: r.id, count: 0, texto: r.texto || '' };
        }
        itemIssues[r.id].count++;
        if (!itemIssues[r.id].texto && r.texto) itemIssues[r.id].texto = r.texto;
      }
    });
  });

  const worstItems = Object.values(itemIssues).sort((a, b) => b.count - a.count);
  if (worstItems.length > 0 && worstItems[0].count > 0) {
    const topItem = worstItems[0];
    const desc = topItem.texto ? `"${topItem.texto.slice(0, 48)}${topItem.texto.length > 48 ? '...' : ''}"` : `Ítem ${topItem.id}`;
    hallazgos.push(`Prioridad de acompañamiento: ${desc} (${topItem.count} ${topItem.count === 1 ? 'visita' : 'visitas'} en Inicio/Proceso).`);
  }

  // 4. REI con menor cumplimiento promedio
  const redAgg = {};
  statsList.forEach(x => {
    const rRaw = x.s?.red;
    if (rRaw !== undefined && rRaw !== null && String(rRaw).trim() !== '') {
      const rNum = String(rRaw).replace(/\D/g, '');
      const rLabel = rNum ? `REI ${rNum.padStart(2, '0')}` : String(rRaw).trim().toUpperCase();
      if (!redAgg[rLabel]) redAgg[rLabel] = { sum: 0, cnt: 0 };
      if (x.st?.pct !== null && x.st?.pct !== undefined) {
        redAgg[rLabel].sum += x.st.pct;
        redAgg[rLabel].cnt++;
      }
    }
  });

  const redAverages = Object.entries(redAgg)
    .filter(([_, v]) => v.cnt > 0)
    .map(([red, v]) => ({ red, avg: Math.round(v.sum / v.cnt), fichas: v.cnt }))
    .sort((a, b) => a.avg - b.avg);

  if (redAverages.length > 1) {
    const minRed = redAverages[0];
    hallazgos.push(`Red educativa con menor promedio: ${minRed.red} (${minRed.avg}% en ${minRed.fichas} ${minRed.fichas === 1 ? 'visita' : 'visitas'}).`);
  }

  return hallazgos.slice(0, 4);
}

/**
 * Agrega y consolida el desempeño por ítem individual de una ficha o conjunto de visitas.
 * Fuente única de cálculo compartida entre la vista web y la Sección IV del PDF Oficial.
 */
export function computeItemAgg(subs, ft) {
  let activeFt = ft;
  if (isFichaEbrGestionEscolar(ft)) {
    const hasV2 = (subs || []).some(s => Number(s.visita) === 2);
    const seccionesEbr = hasV2 ? EBR_GESTION_VISITA_2_SECCIONES : EBR_GESTION_VISITA_1_SECCIONES;
    activeFt = { ...ft, secciones: (ft && ft.secciones && ft.secciones.length === seccionesEbr.length) ? ft.secciones : seccionesEbr, tipoRespuesta: 'ips' };
  } else if (isFichaJec(ft)) {
    activeFt = { ...ft, secciones: (ft && ft.secciones && ft.secciones.length === JEC_SECCIONES.length) ? ft.secciones : JEC_SECCIONES, tipoRespuesta: 'si_no' };
  }
  const tipoResp = activeFt?.tipoRespuesta || 'ips';
  const escala = activeFt?.escala || (tipoResp === 'ips' ? 'IPL' : (tipoResp === 'si_no' ? 'SI_NO_NA' : (tipoResp === 'nivel_1_4' ? 'NIVEL_1_4' : 'IPL')));

  return (activeFt?.secciones || []).map(sec => {
    const items = (sec.items || []).map(it => {
      const counts = {};
      let scoreSum = 0, scoreCnt = 0, total = 0;
      (subs || []).forEach(s => {
        const r = (s.respuestas || []).find(x => {
          if (!x) return false;
          if (x.id === it.id) return true;
          const normX = String(x.id || '').replace(/^ge\d*_/, 'ge_');
          const normIt = String(it.id || '').replace(/^ge\d*_/, 'ge_');
          if (normX && normIt && normX === normIt) return true;
          if (x.num && it.num && Number(x.num) === Number(it.num)) {
            if (x.seccion && sec.nombre && _normStr(x.seccion) === _normStr(sec.nombre)) return true;
          }
          if (x.texto && it.texto && _normStr(x.texto) === _normStr(it.texto)) return true;
          return false;
        });
        if (r) {
          const vClean = String(r.valor || '').trim().toLowerCase();
          if (vClean) {
            counts[vClean] = (counts[vClean] || 0) + 1;
            total++;
            const sc = puntajeItem(escala, vClean);
            if (sc !== null) { scoreSum += sc; scoreCnt++; }
          }
        }
      });
      return { texto: it.texto, id: it.id, counts, total, pct: scoreCnt ? Math.round(scoreSum / scoreCnt * 100) : null };
    });
    const secTotal = items.reduce((a, i) => a + (i.pct !== null ? 1 : 0), 0);
    const secAvg = secTotal ? Math.round(items.filter(i => i.pct !== null).reduce((a, i) => a + i.pct, 0) / secTotal) : null;
    return { nombre: sec.nombre, items, avg: secAvg };
  });
}
