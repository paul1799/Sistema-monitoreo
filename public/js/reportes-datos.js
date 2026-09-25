import { calcScore, puntajeItem, estadoPorRegla } from './calcEngine.js?v=20260925_v8';

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
    const l = x.st.estado ? x.st.estado.nivel : 'Sin datos'; 
    if (l === 'Logrado') dist.logrado++; 
    else if (l === 'En proceso') dist.proceso++; 
    else if (l === 'Inicio') dist.inicio++; 
    else dist.none++; 
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
    const v = x.s.visita || 1; 
    if (!visAgg[v]) visAgg[v] = { sum: 0, cnt: 0 }; 
    if (x.st.pct !== null) { visAgg[v].sum += x.st.pct; visAgg[v].cnt++; } 
  });
  return Object.keys(visAgg).sort((a, b) => a - b).map(v => ({
    visita: v,
    avg: visAgg[v].cnt ? Math.round(visAgg[v].sum / visAgg[v].cnt) : null
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
  const colegiosMonitoreados = new Set(statsList.map(x => x.s.colegioId).filter(Boolean)).size;
  return { total: totalColegios, monitoreados: colegiosMonitoreados, faltan: totalColegios - colegiosMonitoreados };
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
