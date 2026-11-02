/**
 * domain/fichas/engine-helpers.js
 * Helpers puros para normalización, mapeo y resolución anti-colisión de respuestas
 * UGEL 03 · AGEBRE
 */

export const _cleanStr = (s) => String(s || '')
  .replace(/Ã¡/g, 'a').replace(/Ã©/g, 'e').replace(/Ã[\xad\u00ad\u0131]/g, 'i')
  .replace(/Ã³/g, 'o').replace(/Ãº/g, 'u').replace(/Ã±/g, 'n')
  .replace(/ǟ[\uFFFD]?/g, 'o')
  .replace(/[\uFFFD]/g, '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()
  .toLowerCase();

/**
 * Normaliza nombres canónicos de secciones frente a variantes ortográficas o mojibake
 * @param {string} nombre
 * @returns {string}
 */
export function normalizeSectionName(nombre) {
  const c = _cleanStr(nombre);
  if (c.includes('recep')) return 'recepcion';
  if (c.includes('distrib')) return 'distribucion';
  if (c.includes('pedag') || c.includes('uso')) return 'uso pedagogico';
  if (c.includes('seguim')) return 'seguimiento';
  if (c.includes('conserv') || c.includes('control')) return 'conservacion y control';
  return c;
}

/**
 * Construye el mapa de respuestas indexado multi-criterio.
 * Fuente única de verdad para la resolución de respuestas en todo el sistema.
 *
 * @param {Array<{id: string, valor: string, texto?: string, seccion?: string, num?: number, domKey?: string, seccionIdx?: number, itemIdx?: number}>|Object} respuestas
 * @param {boolean} isJec
 * @returns {Object} valMap
 */
export function buildResponseValMap(respuestas = [], isJec = false) {
  const valMap = Object.create(null);
  const idCounts = Object.create(null);
  const textCounts = Object.create(null);

  let respList = respuestas;
  if (typeof respList === 'string') {
    try { respList = JSON.parse(respList); } catch (_) { respList = []; }
  }
  if (respList && typeof respList === 'object' && !Array.isArray(respList)) {
    respList = Object.entries(respList).map(([id, val]) => {
      if (val && typeof val === 'object') {
        const v = val.valor !== undefined ? val.valor : (val.value !== undefined ? val.value : (val.v !== undefined ? val.v : val.respuesta));
        return { id, valor: v, ...val };
      }
      return { id, valor: val };
    });
  }
  if (!Array.isArray(respList)) respList = [];

  // Primera pasada: conteo de frecuencias para saber qué IDs y textos son estrictamente únicos
  for (let idx = 0; idx < respList.length; idx++) {
    const r = respList[idx];
    if (!r) continue;
    if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
      const idStr = String(r.id).trim();
      idCounts[idStr] = (idCounts[idStr] || 0) + 1;

      // También contar alias mc_ <-> m_
      const mcMatch = idStr.match(/^m(?:c)?_?(\d+)$/i);
      if (mcMatch) {
        const n = parseInt(mcMatch[1], 10);
        idCounts['mc_' + n] = (idCounts['mc_' + n] || 0) + 1;
        idCounts['m_' + n] = (idCounts['m_' + n] || 0) + 1;
      }
    }
    if (r.texto) {
      const ct = _cleanStr(r.texto);
      if (ct) textCounts[ct] = (textCounts[ct] || 0) + 1;
    }
  }

  valMap._uniqueIds = new Set(Object.keys(idCounts).filter(k => idCounts[k] === 1));
  valMap._uniqueTexts = new Set(Object.keys(textCounts).filter(k => textCounts[k] === 1));

  for (let idx = 0; idx < respList.length; idx++) {
    const r = respList[idx];
    if (!r) continue;
    const v = r.valor !== undefined ? r.valor : (r.value !== undefined ? r.value : (r.v !== undefined ? r.v : r.respuesta));
    if (v === undefined) continue;

    const cleanT = r.texto ? _cleanStr(r.texto) : '';
    const cleanS = r.seccion ? _cleanStr(r.seccion) : '';
    const normS = r.seccion ? normalizeSectionName(r.seccion) : '';

    // 1. domKey exacto: identificador primario más seguro y específico
    if (r.domKey && valMap[String(r.domKey)] === undefined) {
      valMap[String(r.domKey)] = v;
    }

    // 2. ID exacto y variantes normalizadas
    if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
      const idStr = String(r.id).trim();
      valMap[idStr] = v;

      // Prefijo ge_ para EBR
      const norm = idStr.replace(/^ge\d*_/, 'ge_');
      if (norm && norm !== 'ge_' && valMap[norm] === undefined) valMap[norm] = v;

      // Alias para Materiales Educativos CEBE: mc_X <-> m_X <-> num_X
      const mcMatch = idStr.match(/^m(?:c)?_?(\d+)$/i);
      if (mcMatch) {
        const n = parseInt(mcMatch[1], 10);
        if (valMap['mc_' + n] === undefined) valMap['mc_' + n] = v;
        if (valMap['m_' + n] === undefined) valMap['m_' + n] = v;
        if (valMap['num_' + n] === undefined) valMap['num_' + n] = v;
        if (valMap['it_' + n] === undefined) valMap['it_' + n] = v;
        if (valMap[String(n)] === undefined) valMap[String(n)] = v;
      } else if (/^\d+$/.test(idStr)) {
        // ID puramente numérico (ej. "1", "2")
        const n = parseInt(idStr, 10);
        if (valMap['mc_' + n] === undefined) valMap['mc_' + n] = v;
        if (valMap['m_' + n] === undefined) valMap['m_' + n] = v;
        if (valMap['num_' + n] === undefined) valMap['num_' + n] = v;
        if (valMap['it_' + n] === undefined) valMap['it_' + n] = v;
      }
    }

    // 3. Posición exacta por índice de sección e índice de ítem (idx_sIdx_iIdx)
    if (r.seccionIdx !== undefined && r.seccionIdx !== '' && r.itemIdx !== undefined && r.itemIdx !== '') {
      const sKey = `idx_${r.seccionIdx}_${r.itemIdx}`;
      if (valMap[sKey] === undefined) {
        valMap[sKey] = v;
      }
    }

    // 3.5 Posición global en el conjunto de respuestas
    const gIdx = r.globalIdx !== undefined ? r.globalIdx : idx;
    if (valMap['global_' + gIdx] === undefined) {
      valMap['global_' + gIdx] = v;
    }

    // 4. Sección + número de ítem
    if (cleanS && (r.num !== undefined && r.num !== null)) {
      if (valMap[`sec_${cleanS}_${r.num}`] === undefined) valMap[`sec_${cleanS}_${r.num}`] = v;
      if (normS && valMap[`sec_${normS}_${r.num}`] === undefined) valMap[`sec_${normS}_${r.num}`] = v;
    }
    if (cleanS && (r.itemIdx !== undefined && r.itemIdx !== null)) {
      const localNum = Number(r.itemIdx) + 1;
      if (valMap[`sec_${cleanS}_${localNum}`] === undefined) valMap[`sec_${cleanS}_${localNum}`] = v;
      if (normS && valMap[`sec_${normS}_${localNum}`] === undefined) valMap[`sec_${normS}_${localNum}`] = v;
      if (valMap[`sec_${cleanS}_loc_${localNum}`] === undefined) valMap[`sec_${cleanS}_loc_${localNum}`] = v;
      if (normS && valMap[`sec_${normS}_loc_${localNum}`] === undefined) valMap[`sec_${normS}_loc_${localNum}`] = v;
    }

    // 4.5 Número correlativo directo si r.num existe
    if (r.num !== undefined && r.num !== null) {
      if (valMap['num_' + r.num] === undefined) valMap['num_' + r.num] = v;
      if (valMap['mc_' + r.num] === undefined) valMap['mc_' + r.num] = v;
      if (valMap['m_' + r.num] === undefined) valMap['m_' + r.num] = v;
    }

    // 5. Sección + texto normalizado
    if (cleanT) {
      if (cleanS && valMap[`sec_${cleanS}_txt_${cleanT}`] === undefined) {
        valMap[`sec_${cleanS}_txt_${cleanT}`] = v;
      }
      if (normS && valMap[`sec_${normS}_txt_${cleanT}`] === undefined) {
        valMap[`sec_${normS}_txt_${cleanT}`] = v;
      }
      if (valMap['txt_' + cleanT] === undefined) {
        valMap['txt_' + cleanT] = v;
      }
    }

    // 6. Variantes oficiales JEC (con numeración correlativa global 1..31)
    if (isJec) {
      const jecNumMatch = String(r.id || '').match(/^(?:it_|jec1?_)?0*(\d+)$/i);
      if (jecNumMatch) {
        const n = parseInt(jecNumMatch[1], 10);
        const pad = String(n).padStart(2, '0');
        if (valMap['it_' + pad] === undefined) valMap['it_' + pad] = v;
        if (valMap['it_' + n] === undefined) valMap['it_' + n] = v;
        if (valMap['jec1_' + n] === undefined) valMap['jec1_' + n] = v;
        if (valMap['jec_' + n] === undefined) valMap['jec_' + n] = v;
        if (valMap['num_' + n] === undefined) valMap['num_' + n] = v;
      }
      if (r.num !== undefined && r.num !== null && valMap['num_' + r.num] === undefined) {
        valMap['num_' + r.num] = v;
      }
    }
  }
  return valMap;
}

/**
 * Resuelve el valor de un ítem con prioridad estricta anti-colisión:
 * 1) domKey exacto `s{sIdx+1}_i{iIdx+1}_{it.id||iIdx}` o `it.domKey`
 * 2) ID del ítem (directo o alias mc_ / m_)
 * 3) (seccionIdx, itemIdx) exactos `idx_{sIdx}_{iIdx}`
 * 4) (seccion + num) exactos con sección canónica y variantes de índice local
 * 5) texto normalizado con sección, o texto normalizado si es único
 * 6) Prefijo normalizado ge_ para EBR oficial (único)
 * 7) Fallback numérico correlativo directo (it.num / globalIdx)
 * 8) Patrones de numeración JEC oficial
 *
 * @param {Object} valMap
 * @param {Object} it
 * @param {Object} sec
 * @param {number} sIdx
 * @param {number} iIdx
 * @param {boolean} isJec
 * @returns {any}
 */
export function resolveItemValue(valMap, it, sec = null, sIdx = 0, iIdx = 0, isJec = false) {
  if (!valMap || !it) return undefined;
  const cleanTxt = it.texto ? _cleanStr(it.texto) : '';
  const cleanSec = sec && sec.nombre ? _cleanStr(sec.nombre) : '';
  const normSec = sec && sec.nombre ? normalizeSectionName(sec.nombre) : '';
  const itNum = it.num || (iIdx + 1);
  const rawId = it.id !== undefined && it.id !== null ? String(it.id).trim() : '';
  const hasValidId = rawId !== '';

  // 1) domKey exacto (prioridad máxima: evita 100% de colisiones entre secciones)
  const itemDomKey = `s${sIdx + 1}_i${iIdx + 1}_${it.id || iIdx}`;
  if (valMap[itemDomKey] !== undefined) {
    return valMap[itemDomKey];
  }
  if (it.domKey && valMap[it.domKey] !== undefined) {
    return valMap[it.domKey];
  }

  // 2) ID del ítem (directo o alias mc_ / m_)
  if (hasValidId) {
    if (valMap[rawId] !== undefined) {
      return valMap[rawId];
    }
    const mcMatch = rawId.match(/^m(?:c)?_?(\d+)$/i);
    if (mcMatch) {
      const n = parseInt(mcMatch[1], 10);
      if (valMap['mc_' + n] !== undefined) return valMap['mc_' + n];
      if (valMap['m_' + n] !== undefined) return valMap['m_' + n];
      if (valMap['num_' + n] !== undefined) return valMap['num_' + n];
      if (valMap['it_' + n] !== undefined) return valMap['it_' + n];
    }
  }

  // 3) (seccionIdx, itemIdx) exactos
  if (valMap[`idx_${sIdx}_${iIdx}`] !== undefined) {
    return valMap[`idx_${sIdx}_${iIdx}`];
  }

  // 4) (seccion + num) exactos con soporte de sección canónica e índice local
  if (normSec) {
    if (valMap[`sec_${normSec}_${itNum}`] !== undefined) return valMap[`sec_${normSec}_${itNum}`];
    if (valMap[`sec_${normSec}_loc_${iIdx + 1}`] !== undefined) return valMap[`sec_${normSec}_loc_${iIdx + 1}`];
    if (valMap[`sec_${normSec}_${iIdx + 1}`] !== undefined) return valMap[`sec_${normSec}_${iIdx + 1}`];
  }
  if (cleanSec) {
    if (valMap[`sec_${cleanSec}_${itNum}`] !== undefined) return valMap[`sec_${cleanSec}_${itNum}`];
    if (valMap[`sec_${cleanSec}_loc_${iIdx + 1}`] !== undefined) return valMap[`sec_${cleanSec}_loc_${iIdx + 1}`];
    if (valMap[`sec_${cleanSec}_${iIdx + 1}`] !== undefined) return valMap[`sec_${cleanSec}_${iIdx + 1}`];
  }

  // 5) texto normalizado con sección, o texto normalizado SOLO si es único en toda la ficha
  if (cleanTxt) {
    if (normSec && valMap[`sec_${normSec}_txt_${cleanTxt}`] !== undefined) {
      return valMap[`sec_${normSec}_txt_${cleanTxt}`];
    }
    if (cleanSec && valMap[`sec_${cleanSec}_txt_${cleanTxt}`] !== undefined) {
      return valMap[`sec_${cleanSec}_txt_${cleanTxt}`];
    }
    if (valMap._uniqueTexts && valMap._uniqueTexts.has(cleanTxt) && valMap['txt_' + cleanTxt] !== undefined) {
      return valMap['txt_' + cleanTxt];
    }
    if (valMap['txt_' + cleanTxt] !== undefined) {
      return valMap['txt_' + cleanTxt];
    }
  }

  // 6) Prefijo normalizado ge_ para EBR oficial (único)
  if (hasValidId) {
    const norm = rawId.replace(/^ge\d*_/, 'ge_');
    if (norm && norm !== 'ge_' && valMap._uniqueIds && valMap._uniqueIds.has(norm)) {
      if (valMap[norm] !== undefined) return valMap[norm];
    }
  }

  // 7) Fallback por correlativo numérico directo (it.num / globalIdx)
  if (it.num !== undefined && it.num !== null) {
    if (valMap['num_' + it.num] !== undefined) return valMap['num_' + it.num];
    if (valMap['mc_' + it.num] !== undefined) return valMap['mc_' + it.num];
    if (valMap['m_' + it.num] !== undefined) return valMap['m_' + it.num];
  }
  if (it.globalIdx !== undefined && valMap['global_' + it.globalIdx] !== undefined) {
    return valMap['global_' + it.globalIdx];
  }

  // 8) Patrones de numeración JEC oficial
  if (isJec && it.num) {
    return valMap['num_' + it.num]
      ?? valMap['it_' + String(it.num).padStart(2, '0')]
      ?? valMap['it_' + it.num]
      ?? valMap['jec1_' + it.num]
      ?? valMap['jec_' + it.num];
  }

  return undefined;
}
