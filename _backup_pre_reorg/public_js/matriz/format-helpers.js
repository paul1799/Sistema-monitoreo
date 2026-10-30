/* =========================================================================
   matriz/format-helpers.js — Utilidades de formato, fechas, normalización
   de celdas y extracción de datos para la Matriz de Seguimiento.
   ========================================================================= */

/**
 * Normaliza y formatea una fecha estrictamente a DD/MM/YYYY local (sin hora ni desface UTC)
 * @param {*} dateVal
 * @returns {string}
 */
export function formatDateOnlyForExcel(dateVal) {
  if (!dateVal) return '';
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const day = String(dateVal.getDate()).padStart(2, '0');
    const month = String(dateVal.getMonth() + 1).padStart(2, '0');
    const year = dateVal.getFullYear();
    return `${day}/${month}/${year}`;
  }
  const s = String(dateVal).trim();
  // Formato YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) {
    const day = mIso[3].padStart(2, '0');
    const month = mIso[2].padStart(2, '0');
    const year = mIso[1];
    return `${day}/${month}/${year}`;
  }
  // Formato DD/MM/YYYY
  const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mSlash) {
    const day = mSlash[1].padStart(2, '0');
    const month = mSlash[2].padStart(2, '0');
    const year = mSlash[3];
    return `${day}/${month}/${year}`;
  }
  return s;
}

export const parseDateForExcel = formatDateOnlyForExcel;

/**
 * Convierte un valor de fecha a objeto Date en UTC medianoche para ExcelJS.
 * De esta forma ExcelJS lo serializa como fecha real de Excel sin hora ni desfase horario.
 * @param {*} dateVal
 * @returns {Date|null}
 */
export function parseDateOnlyToUtcDate(dateVal) {
  if (!dateVal) return null;
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    return new Date(Date.UTC(dateVal.getFullYear(), dateVal.getMonth(), dateVal.getDate(), 0, 0, 0));
  }
  const s = String(dateVal).trim();
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) {
    return new Date(Date.UTC(parseInt(mIso[1], 10), parseInt(mIso[2], 10) - 1, parseInt(mIso[3], 10), 0, 0, 0));
  }
  const mSlash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (mSlash) {
    return new Date(Date.UTC(parseInt(mSlash[3], 10), parseInt(mSlash[2], 10) - 1, parseInt(mSlash[1], 10), 0, 0, 0));
  }
  const dParsed = new Date(s);
  if (!isNaN(dParsed.getTime())) {
    return new Date(Date.UTC(dParsed.getFullYear(), dParsed.getMonth(), dParsed.getDate(), 0, 0, 0));
  }
  return null;
}

/**
 * Normaliza un valor de indicador con opciones SI / NO / N/A
 * - "SI", "Sí", "si", "sí", true, 1, "cumple" -> "SI"
 * - "NO", "no", false, 0, "no cumple" -> "NO"
 * - "N/A", "NA", "na", "no aplica", null explícito de no aplica -> "N/A"
 * - Vacío / no respondido -> ""
 * @param {*} rawVal
 * @returns {string} "SI" | "NO" | "N/A" | ""
 */
export function normalizarSiNoNa(rawVal) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  if (typeof rawVal === 'object') {
    const inner = rawVal.valor !== undefined ? rawVal.valor : (rawVal.value !== undefined ? rawVal.value : rawVal.score);
    if (inner !== undefined) return normalizarSiNoNa(inner);
    return '';
  }
  const s = String(rawVal).trim().toUpperCase();
  if (s === '') return '';
  if (s === 'SI' || s === 'SÍ' || s === 'TRUE' || s === '1' || s === 'CUMPLE' || s === 'C') return 'SI';
  if (s === 'NO' || s === 'FALSE' || s === '0' || s === 'NO CUMPLE' || s === 'NC' || s === 'N') return 'NO';
  if (s === 'N/A' || s === 'NA' || s === 'NO APLICA' || s === 'NOAPLICA') return 'N/A';
  return '';
}

/**
 * Normaliza un valor de ítem con escala 1-2-3 (Aspectos 02 a 05)
 * Reglas:
 * 1, "1", "Inicio", "INICIO", "I", "no" -> 1
 * 2, "2", "Proceso", "PROCESO", "P" -> 2
 * 3, "3", "Logrado", "LOGRADO", "L", "si", "sí" -> 3
 * Objeto { valor: 3 } -> 3
 * Vacío / no respondido -> '' (nunca 0)
 * @param {*} rawVal
 * @returns {number|string} 1, 2, 3 o ''
 */
export function normalizarEscala1_3(rawVal) {
  if (rawVal === null || rawVal === undefined || rawVal === '') return '';
  if (typeof rawVal === 'object') {
    const inner = rawVal.valor !== undefined ? rawVal.valor : (rawVal.value !== undefined ? rawVal.value : rawVal.score);
    if (inner !== undefined) return normalizarEscala1_3(inner);
    return '';
  }

  const s = String(rawVal).trim().toUpperCase();
  if (s === '') return '';

  if (s === '1') return 1;
  if (s === '2') return 2;
  if (s === '3') return 3;

  if (s === 'INICIO' || s === 'I' || s === 'NO CUMPLE' || s === 'NO') return 1;
  if (s === 'PROCESO' || s === 'P' || s === 'EN PROCESO' || s === 'CUMPLE PARCIALMENTE') return 2;
  if (s === 'LOGRADO' || s === 'L' || s === 'LOGRADA' || s === 'CUMPLE' || s === 'SI' || s === 'SÍ') return 3;

  const num = Number(s);
  if (!isNaN(num) && (num === 1 || num === 2 || num === 3)) {
    return num;
  }

  return '';
}

/**
 * Protección general para celdas: evita que objetos, arreglos o strings JSON
 * se escriban directamente en las celdas del libro de Excel.
 * @param {Object} cell - Celda de ExcelJS
 * @param {*} value - Valor a escribir
 * @param {string} cellKey - Identificador del campo o ítem
 * @param {string} colLetter - Letra de la columna
 */
export function setSafeCellValue(cell, value, cellKey = '', colLetter = '') {
  if (value === null || value === undefined) {
    cell.value = '';
    return;
  }
  // Permitir objetos de fórmula de Excel { formula: '...' }
  if (typeof value === 'object' && value.formula) {
    cell.value = value;
    return;
  }
  // Si es un objeto Date válido
  if (value instanceof Date && !isNaN(value.getTime())) {
    cell.value = value;
    return;
  }
  // Si es un objeto o array no permitido
  if (typeof value === 'object' || Array.isArray(value)) {
    console.warn(`[Exportar Matriz] Celda protegida: se evitó escribir objeto/arreglo en Columna ${colLetter} (clave: "${cellKey}"). Celda dejada vacía.`);
    cell.value = '';
    return;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      console.warn(`[Exportar Matriz] Celda protegida: se evitó escribir string JSON en Columna ${colLetter} (clave: "${cellKey}"). Celda dejada vacía.`);
      cell.value = '';
      return;
    }
  }
  cell.value = value;
}

/**
 * Mapea y une las observaciones de la ficha en el orden oficial:
 * 1. Observación general de cierre si existe.
 * 2. Observaciones o hallazgos por ítem o por aspecto (Aspecto 02: ... · etc.)
 * @param {Object} s - Submission
 * @returns {string}
 */
export function formatObservaciones(s) {
  if (!s) return '';
  const lines = [];

  // 1. Observación general de cierre si existe
  if (s.observaciones && typeof s.observaciones === 'string' && s.observaciones.trim()) {
    lines.push(s.observaciones.trim());
  }

  // 2. Observaciones o hallazgos por ítem o por aspecto
  const obsItems = s.observacionesItems || s.hallazgos || {};
  if (typeof obsItems === 'object' && !Array.isArray(obsItems)) {
    for (const [k, val] of Object.entries(obsItems)) {
      if (val && typeof val === 'string' && val.trim()) {
        lines.push(`${k}: ${val.trim()}`);
      }
    }
  }

  // 3. Hallazgos dentro de s.respuestas (si es array)
  if (Array.isArray(s.respuestas)) {
    s.respuestas.forEach(r => {
      const h = r.hallazgos || r.observaciones || r.hallazgo;
      if (h && typeof h === 'string' && h.trim()) {
        const pref = r.seccion ? `${r.seccion} (Ítem ${r.num || r.id})` : `Ítem ${r.num || r.id}`;
        const entry = `${pref}: ${h.trim()}`;
        if (!lines.includes(entry) && !lines.includes(h.trim())) {
          lines.push(entry);
        }
      }
    });
  }

  return lines.join('\n');
}

/**
 * Mapea y une los compromisos registrados:
 * - Soporta formato de objeto JEC: { directivo: '...', especialista: '...' }
 * - Soporta campos individuales: compromisoDirector, compromisoMonitor
 * - Soporta formato de lista: [{ texto, responsable, fecha/plazo }]
 * Cada compromiso en una línea con viñeta •
 * @param {Object} s - Submission
 * @returns {string}
 */
export function formatCompromisos(s) {
  if (!s) return '';
  const lines = [];

  // 1. Objeto de compromisos JEC { directivo, especialista, responsableMonitor }
  if (s.compromisos && typeof s.compromisos === 'object' && !Array.isArray(s.compromisos)) {
    if (s.compromisos.directivo) {
      lines.push(`• Directivo: ${s.compromisos.directivo}`);
    }
    if (s.compromisos.especialista) {
      const resp = s.compromisos.responsableMonitor ? ` — ${s.compromisos.responsableMonitor}` : '';
      lines.push(`• Especialista: ${s.compromisos.especialista}${resp}`);
    }
  }

  // 2. Campos individuales compromisoDirector y compromisoMonitor
  if (s.compromisoDirector && !lines.some(l => l.includes(s.compromisoDirector))) {
    lines.push(`• Directivo: ${s.compromisoDirector}`);
  }
  if (s.compromisoMonitor && !lines.some(l => l.includes(s.compromisoMonitor))) {
    lines.push(`• Especialista: ${s.compromisoMonitor}`);
  }

  // 3. Lista de compromisos como arreglo
  const arr = Array.isArray(s.compromisos)
    ? s.compromisos
    : (Array.isArray(s.compromisosList) ? s.compromisosList : []);

  arr.forEach(c => {
    if (!c) return;
    const txt = c.texto || c.compromiso || (typeof c === 'string' ? c : '');
    if (!txt) return;
    const resp = c.responsable ? ` — ${c.responsable}` : '';
    let fec = '';
    if (c.fecha || c.plazo) {
      const fClean = formatDateOnlyForExcel(c.fecha || c.plazo);
      if (fClean) fec = ` — ${fClean}`;
    }
    const line = `• ${txt}${resp}${fec}`;
    if (!lines.includes(line)) {
      lines.push(line);
    }
  });

  // 4. Fallback a texto simple
  if (lines.length === 0 && s.compromiso && typeof s.compromiso === 'string') {
    lines.push(`• ${s.compromiso.trim()}`);
  }

  return lines.join('\n');
}

export function _normRei(val) {
  if (val === undefined || val === null) return '';
  const str = String(val).trim();
  if (!str || str === '—' || str === '-' || str.toLowerCase().includes('no aplica')) return '';
  const match = str.match(/\d+/);
  return match ? String(parseInt(match[0], 10)).padStart(2, '0') : str;
}

export function _buscarEnExtras(s, posiblesNombres) {
  if (!s) return '';
  const extras = Array.isArray(s.extras) ? s.extras : [];
  for (const p of posiblesNombres) {
    const pNorm = String(p).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const found = extras.find(e => {
      const lNorm = (e.label || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      return lNorm.includes(pNorm);
    });
    if (found && found.value !== undefined && found.value !== null) {
      return found.value;
    }
  }
  return '';
}

export function _extraerValor(val) {
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && val.valor !== undefined) return val.valor;
  if (typeof val === 'object' && val.value !== undefined) return val.value;
  return val;
}

export function _normalizarSiNo(val) {
  if (!val) return '';
  const s = String(val).trim().toUpperCase();
  if (s === 'SI' || s === 'SÍ' || s === 'S' || s === '1' || s === 'TRUE') return 'SI';
  if (s === 'NO' || s === 'N' || s === '0' || s === 'FALSE') return 'NO';
  return '';
}

export function _obtenerValorDatoGeneral(s, key, state = null) {
  if (!s) return '';
  switch (key) {
    case 'institucion':
      return s.institucion || s.nombreIe || (typeof s.ie === 'string' ? s.ie : (s.ie && s.ie.nombre) ? s.ie.nombre : '') || '';
    case 'codigoModular': {
      let val = s.codigoModular || s.codModular || (s.ie && s.ie.codigoModular) || '';
      if (val && /^\d{1,6}$/.test(String(val).trim())) {
        val = String(val).trim().padStart(7, '0');
      }
      return val ? String(val) : '';
    }
    case 'ugel':
      return s.ugel ? (String(s.ugel).toLowerCase().includes('sector') ? 'UGEL 03' : (String(s.ugel).trim() === '03' ? 'UGEL 03' : String(s.ugel).trim())) : 'UGEL 03';
    case 'red': {
      const rawRed = s.red || s.rei || (s.ie && s.ie.red) || (s.ie && s.ie.rei) || '';
      return _normRei(rawRed);
    }
    case 'fecha':
      return formatDateOnlyForExcel(s.fecha || '');
    case 'secciones': {
      const secVal = s.secciones ?? _buscarEnExtras(s, ['secciones', 'seccion', 'n° de secciones', 'n de secciones']) ?? '';
      return (secVal !== '' && !isNaN(Number(secVal))) ? Number(secVal) : secVal;
    }
    case 'estudiantes': {
      const estVal = s.estudiantes ?? _buscarEnExtras(s, ['estudiantes', 'cantidad de estudiantes', 'cant estudiantes']) ?? '';
      return (estVal !== '' && !isNaN(Number(estVal))) ? Number(estVal) : estVal;
    }
    case 'docentes': {
      // 1. Campo explícito de cantidad de docentes en Datos Generales
      let val = s.docentesTotal;
      // 2. Si s.docentes es un número o texto escalar limpio (no JSON ni objeto)
      if (val === undefined || val === null || val === '') {
        if (typeof s.docentes === 'number') {
          val = s.docentes;
        } else if (typeof s.docentes === 'string' && !s.docentes.trim().startsWith('{') && !s.docentes.trim().startsWith('[')) {
          val = s.docentes;
        }
      }
      // 3. Buscar en extras
      if (val === undefined || val === null || val === '') {
        val = _buscarEnExtras(s, ['cantidad de docentes', 'total docentes', 'docentes', 'cant docentes']);
      }
      // 4. Respaldo desde el módulo Colegios
      if ((val === undefined || val === null || val === '') && state && Array.isArray(state.colegios)) {
        const codMod = String(s.codigoModular || s.codModular || (s.ie && s.ie.codigoModular) || '').trim();
        const col = state.colegios.find(c => String(c.codigoModular || '').trim() === codMod);
        if (col && (col.docentes || col.cantidadDocentes)) {
          val = col.docentes || col.cantidadDocentes;
        }
      }
      // 5. Último recurso: momento1.total
      if ((val === undefined || val === null || val === '') && s.docentes && typeof s.docentes === 'object') {
        if (s.docentes.momento1 && s.docentes.momento1.total) {
          val = s.docentes.momento1.total;
        }
      }
      if (val !== undefined && val !== null && val !== '') {
        const n = Number(String(val).trim());
        return !isNaN(n) ? n : val;
      }
      return '';
    }
    case 'formacionTecnica': {
      let val = s.formacionTecnica !== undefined ? s.formacionTecnica : (s.ie && s.ie.formacionTecnica !== undefined ? s.ie.formacionTecnica : _buscarEnExtras(s, ['formacion tecnica', 'formación técnica', 'smft', 'tecnica']));
      if (val === true || val === 'si' || val === 'SI') return 'SI';
      if (val === false || val === 'no' || val === 'NO') return 'NO';
      return '';
    }
    case 'cantidadCp': {
      let val = s.cantidadCp ?? s.cantidad_cp ?? s.cantCp ?? s.cp;
      if (val === undefined || val === null || val === '') {
        val = _buscarEnExtras(s, ['cantidad de c.p', 'cantidad de cp', 'c.p', 'coordinador pedagogico', 'coordinadores pedagogicos']);
      }
      // Respaldo desde Directorio: contar coordinadores pedagógicos registrados para esa IE
      if ((val === undefined || val === null || val === '') && state && Array.isArray(state.directivos)) {
        const codMod = String(s.codigoModular || '').trim();
        const count = state.directivos.filter(d => {
          if (codMod && String(d.codigoModular || '').trim() === codMod) {
            const c = (d.cargo || '').toLowerCase();
            return c.includes('pedag');
          }
          return false;
        }).length;
        if (count > 0) val = count;
      }
      return (val !== null && val !== undefined && val !== '') ? (isNaN(val) ? val : Number(val)) : '';
    }
    case 'cantidadCt': {
      let val = s.cantidadCt ?? s.cantidad_ct ?? s.cantCt ?? s.ct;
      if (val === undefined || val === null || val === '') {
        val = _buscarEnExtras(s, ['cantidad de c.t', 'cantidad de ct', 'c.t', 'coordinador tutoria', 'coordinadores tutoria']);
      }
      // Respaldo desde Directorio: contar coordinadores de tutoría registrados para esa IE
      if ((val === undefined || val === null || val === '') && state && Array.isArray(state.directivos)) {
        const codMod = String(s.codigoModular || '').trim();
        const count = state.directivos.filter(d => {
          if (codMod && String(d.codigoModular || '').trim() === codMod) {
            const c = (d.cargo || '').toLowerCase();
            return c.includes('tutor');
          }
          return false;
        }).length;
        if (count > 0) val = count;
      }
      return (val !== null && val !== undefined && val !== '') ? (isNaN(val) ? val : Number(val)) : '';
    }
    case 'visita':
      return s.visita || s.momento || 1;
    case 'docentesTutores':
      return _buscarEnExtras(s, ['n° de docentes tutores', 'docentes tutores a cargo', 'tutores', 'docentes tutores']) || '';
    case 'docentesACargo':
      return _buscarEnExtras(s, ['n° de docentes a cargo', 'docentes a cargo', 'docentes']) || '';
    default:
      return s[key] !== undefined ? s[key] : _buscarEnExtras(s, [key]);
  }
}

/**
 * Obtiene la respuesta de un ítem garantizando correspondencia única por aspecto e identificador.
 * Previene colisiones de numeración (ej. ítem 1 de Aspecto 01 vs ítem 1 de Aspecto 02).
 * @param {Object} s - Submission
 * @param {Object} it - Definición del ítem en matrizConfig.js
 * @returns {*}
 */
export function _obtenerRespuestaItem(s, it) {
  if (!s) return '';
  const resp = s.respuestas || s.items || {};

  // Lista de identificadores candidatos para este ítem
  const candidateIds = [it.id, ...(it.aliasKeys || [])].filter(Boolean);

  // 1. Si s.respuestas es un Array de respuestas
  if (Array.isArray(resp)) {
    // 1.1 Coincidencia exacta por r.id con cualquiera de los candidatos
    const matchById = resp.find(r => r && candidateIds.includes(r.id));
    if (matchById) {
      return _extraerValor(matchById.valor ?? matchById.value);
    }

    // 1.2 Coincidencia dentro de la misma sección / aspecto por número
    const aspNameNorm = (it.aspectoNombre || '').toLowerCase();
    const matchBySectionAndNum = resp.find(r => {
      if (!r) return false;
      const rSecNorm = (r.seccion || r.aspecto || '').toLowerCase();
      const sameSection = rSecNorm && (
        (aspNameNorm.includes('toece') && rSecNorm.includes('toece')) ||
        (aspNameNorm.includes('organiza') && (rSecNorm.includes('gesti') || rSecNorm.includes('organiza'))) ||
        (aspNameNorm.includes('acompa') && (rSecNorm.includes('soporte') || rSecNorm.includes('acompa'))) ||
        (aspNameNorm.includes('apoyo') && (rSecNorm.includes('apoyo') || rSecNorm.includes('personal'))) ||
        (aspNameNorm.includes('condici') && rSecNorm.includes('condici'))
      );
      if (sameSection) {
        return String(r.num) === String(it.num) || Number(r.num) === Number(it.num);
      }
      return false;
    });
    if (matchBySectionAndNum) {
      return _extraerValor(matchBySectionAndNum.valor ?? matchBySectionAndNum.value);
    }

    // 1.3 Coincidencia por alias en r.num si el alias es un número único
    for (const cand of candidateIds) {
      const matchNum = resp.find(r => r && (String(r.num) === String(cand) || String(r.id) === String(cand)));
      if (matchNum) {
        return _extraerValor(matchNum.valor ?? matchNum.value);
      }
    }
  }

  // 2. Si s.respuestas es un Objeto clave-valor
  if (typeof resp === 'object' && !Array.isArray(resp)) {
    // 2.1 Búsqueda directa por candidato exacto en las claves del objeto
    for (const cand of candidateIds) {
      if (resp[cand] !== undefined) {
        return _extraerValor(resp[cand]);
      }
    }

    // 2.2 Búsqueda insensible a mayúsculas
    const lowerKeys = Object.keys(resp).map(k => ({ original: k, lower: k.toLowerCase() }));
    for (const cand of candidateIds) {
      const cLow = cand.toLowerCase();
      const found = lowerKeys.find(lk => lk.lower === cLow);
      if (found) {
        return _extraerValor(resp[found.original]);
      }
    }

    // 2.3 Búsqueda específica con prefijo de aspecto para evitar colisiones cruzadas
    const aspPrefix = it.id ? it.id.slice(0, 3) : ''; // 'a1_', 'a2_', 'a3_', etc.
    if (aspPrefix) {
      const foundPref = lowerKeys.find(lk => lk.lower.startsWith(aspPrefix) && lk.lower.endsWith(String(it.num)));
      if (foundPref) {
        return _extraerValor(resp[foundPref.original]);
      }
    }
  }

  // 3. Búsqueda en s.extras si no se encontró en respuestas
  const exVal = _buscarEnExtras(s, candidateIds);
  if (exVal !== '') {
    return _extraerValor(exVal);
  }

  return '';
}
