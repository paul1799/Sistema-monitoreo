/**
 * domain/fichas/engine-helpers.js
 * Helpers puros para normalización, mapeo y resolución anti-colisión de respuestas
 * UGEL 03 · AGEBRE
 */

export const _cleanStr = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

/**
 * Construye el mapa de respuestas indexado multi-criterio.
 * Fuente única de verdad para la resolución de respuestas en todo el sistema.
 *
 * @param {Array<{id: string, valor: string, texto?: string, seccion?: string, num?: number, domKey?: string, seccionIdx?: number, itemIdx?: number}>} respuestas
 * @param {boolean} isJec
 * @returns {Object} valMap
 */
export function buildResponseValMap(respuestas = [], isJec = false) {
  const valMap = Object.create(null);
  const idCounts = Object.create(null);
  const textCounts = Object.create(null);

  // Primera pasada: conteo de frecuencias para saber qué IDs y textos son estrictamente únicos
  for (const r of (respuestas || [])) {
    if (!r) continue;
    if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
      const idStr = String(r.id).trim();
      idCounts[idStr] = (idCounts[idStr] || 0) + 1;
    }
    if (r.texto) {
      const ct = _cleanStr(r.texto);
      if (ct) textCounts[ct] = (textCounts[ct] || 0) + 1;
    }
  }

  valMap._uniqueIds = new Set(Object.keys(idCounts).filter(k => idCounts[k] === 1));
  valMap._uniqueTexts = new Set(Object.keys(textCounts).filter(k => textCounts[k] === 1));

  for (const r of (respuestas || [])) {
    if (!r) continue;
    const v = r.valor;
    const cleanT = r.texto ? _cleanStr(r.texto) : '';
    const cleanS = r.seccion ? _cleanStr(r.seccion) : '';

    // 1. domKey exacto: identificador primario más seguro y específico
    if (r.domKey && valMap[String(r.domKey)] === undefined) {
      valMap[String(r.domKey)] = v;
    }

    // 2. ID exacto (siempre indexado; resolveItemValue verificará unicidad)
    if (r.id !== undefined && r.id !== null && String(r.id).trim() !== '') {
      valMap[String(r.id)] = v;
      const norm = String(r.id).replace(/^ge\d*_/, 'ge_');
      if (norm && norm !== 'ge_' && valMap[norm] === undefined) valMap[norm] = v;
    }

    // 3. Posición exacta por índice de sección e índice de ítem (idx_sIdx_iIdx)
    if (r.seccionIdx !== undefined && r.seccionIdx !== '' && r.itemIdx !== undefined && r.itemIdx !== '') {
      const sKey = `idx_${r.seccionIdx}_${r.itemIdx}`;
      if (valMap[sKey] === undefined) {
        valMap[sKey] = v;
      }
    }

    // 4. Sección + número de ítem
    if (cleanS && (r.num !== undefined && r.num !== null)) {
      if (valMap[`sec_${cleanS}_${r.num}`] === undefined) {
        valMap[`sec_${cleanS}_${r.num}`] = v;
      }
    }

    // 5. Sección + texto normalizado
    if (cleanT) {
      if (cleanS && valMap[`sec_${cleanS}_txt_${cleanT}`] === undefined) {
        valMap[`sec_${cleanS}_txt_${cleanT}`] = v;
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
 * 2) ID del ítem (SOLO si es único en la ficha para evitar colisión entre secciones)
 * 3) (seccionIdx, itemIdx) exactos `idx_{sIdx}_{iIdx}`
 * 4) (seccion + num) exactos `sec_{cleanSec}_{itNum}`
 * 5) texto normalizado con sección, o texto normalizado SOLO si es único en toda la ficha
 * 6) Prefijo normalizado ge_ para EBR oficial (único)
 * 7) Patrones de numeración JEC oficial
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

  // 2) ID del ítem (SOLO si el ID es estrictamente único en la ficha)
  if (hasValidId && valMap._uniqueIds && valMap._uniqueIds.has(rawId)) {
    if (valMap[rawId] !== undefined) {
      return valMap[rawId];
    }
  }

  // 3) (seccionIdx, itemIdx) exactos
  if (valMap[`idx_${sIdx}_${iIdx}`] !== undefined) {
    return valMap[`idx_${sIdx}_${iIdx}`];
  }

  // 4) (seccion + num) exactos
  if (cleanSec && valMap[`sec_${cleanSec}_${itNum}`] !== undefined) {
    return valMap[`sec_${cleanSec}_${itNum}`];
  }

  // 5) texto normalizado con sección, o texto normalizado SOLO si es único en toda la ficha
  if (cleanTxt) {
    if (cleanSec && valMap[`sec_${cleanSec}_txt_${cleanTxt}`] !== undefined) {
      return valMap[`sec_${cleanSec}_txt_${cleanTxt}`];
    }
    if (valMap._uniqueTexts && valMap._uniqueTexts.has(cleanTxt) && valMap['txt_' + cleanTxt] !== undefined) {
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

  // 7) Patrones de numeración JEC oficial
  if (isJec && it.num) {
    return valMap['num_' + it.num]
      ?? valMap['it_' + String(it.num).padStart(2, '0')]
      ?? valMap['it_' + it.num]
      ?? valMap['jec1_' + it.num]
      ?? valMap['jec_' + it.num];
  }

  return undefined;
}

