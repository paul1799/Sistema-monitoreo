/**
 * domain/fichas/item-identity.js
 * Identidad, generación de claves y normalización de ítems y Schema v2
 * UGEL 03 · AGEBRE · Fase 3 Reorganización
 */

/**
 * Genera un identificador único e inmutable para un ítem o sección.
 */
export function generateItemId(prefix = 'it') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 6)}`;
}

/**
 * Genera la clave DOM de un ítem para radio buttons y campos en el formulario.
 */
export function buildDomKey(seccionIdx, itemIdx, itemId = '') {
  return itemId ? `s${seccionIdx}_i${itemIdx}_${itemId}` : `s${seccionIdx}_i${itemIdx}`;
}

/**
 * Aplana todos los ítems de las secciones (o de una visita particular),
 * garantizando que cada ítem tenga asignado globalIdx (0..N-1) y num correlativo global.
 */
export function flattenFichaItems(fichaType, visitKey = null) {
  if (!fichaType) return [];
  let secciones = [];
  if (visitKey && fichaType.tieneVisitas && fichaType.tipoVisitas === 'items_por_visita' && fichaType.seccionesPorVisita) {
    secciones = fichaType.seccionesPorVisita[visitKey] || [];
  } else {
    secciones = Array.isArray(fichaType.secciones) ? fichaType.secciones : [];
  }

  const flattened = [];
  let globalCounter = 0;

  secciones.forEach((sec, sIdx) => {
    const items = Array.isArray(sec.items) ? sec.items : [];
    items.forEach((it, iIdx) => {
      const gIdx = typeof it.globalIdx === 'number' ? it.globalIdx : globalCounter;
      const num = typeof it.num === 'number' ? it.num : (globalCounter + 1);
      flattened.push({
        ...it,
        id: it.id || generateItemId('it'),
        seccionIdx: sIdx,
        itemIdx: iIdx,
        seccionNombre: sec.nombre || '',
        globalIdx: gIdx,
        num: num,
        domKey: it.domKey || buildDomKey(sIdx, iIdx, it.id)
      });
      globalCounter++;
    });
  });

  return flattened;
}

/**
 * Normaliza una ficha para que cumpla con el Schema v2:
 * - schemaVersion: 2
 * - origen: 'builder' | 'oficial'
 * - Cada sección con id
 * - Cada ítem con id inmutable, globalIdx (0..N-1), y num global correlativo (1..N)
 */
export function normalizeFichaSchema(fichaType) {
  if (!fichaType || typeof fichaType !== 'object') return fichaType;

  const copy = { ...fichaType };
  copy.schemaVersion = copy.schemaVersion || 2;
  copy.origen = copy.origen || (copy.id && copy.id.startsWith('ft_') ? 'oficial' : 'builder');

  let globalCounter = 0;
  if (Array.isArray(copy.secciones)) {
    copy.secciones = copy.secciones.map((sec, sIdx) => {
      const secCopy = { ...sec };
      if (!secCopy.id) secCopy.id = `sec_${sIdx + 1}`;
      if (Array.isArray(secCopy.items)) {
        secCopy.items = secCopy.items.map((it, iIdx) => {
          const itId = it.id || generateItemId('it');
          const gIdx = globalCounter++;
          return {
            ...it,
            id: itId,
            globalIdx: gIdx,
            num: gIdx + 1,
            texto: it.texto || '',
            evidencia: it.evidencia || ''
          };
        });
      }
      return secCopy;
    });
  }

  if (copy.tieneVisitas && copy.tipoVisitas === 'items_por_visita' && copy.seccionesPorVisita) {
    const normPorVisita = {};
    Object.keys(copy.seccionesPorVisita).forEach(vk => {
      let vCounter = 0;
      normPorVisita[vk] = (copy.seccionesPorVisita[vk] || []).map((sec, sIdx) => {
        const secCopy = { ...sec };
        if (!secCopy.id) secCopy.id = `sec_v_${vk}_${sIdx + 1}`;
        if (Array.isArray(secCopy.items)) {
          secCopy.items = secCopy.items.map((it, iIdx) => {
            const itId = it.id || generateItemId('it');
            const gIdx = vCounter++;
            return {
              ...it,
              id: itId,
              globalIdx: gIdx,
              num: gIdx + 1,
              texto: it.texto || '',
              evidencia: it.evidencia || ''
            };
          });
        }
        return secCopy;
      });
    });
    copy.seccionesPorVisita = normPorVisita;
  }

  return copy;
}

/**
 * Valida si un objeto ficha cumple con Schema v2.
 */
export function isSchemaV2(fichaType) {
  return !!(fichaType && fichaType.schemaVersion === 2);
}

