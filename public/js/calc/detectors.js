/**
 * public/js/calc/detectors.js
 * Funciones de detección y discriminación de tipos de ficha y momentos
 * UGEL 03 · AGEBRE
 */

/**
 * Determina con alta precisión si una plantilla o ficha corresponde a la de
 * "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
 *
 * @param {Object} ft - Plantilla o ficha
 * @returns {boolean}
 */
export function isFichaJec(ft, state = null) {
  if (!ft) return false;
  const id = (typeof ft === 'string' ? ft : (ft.id || ft.fichaTypeId || ft.tipo || '')).toLowerCase();
  if (id === 'ft_msejec_1er' || id === 'ft_msejec_2do' || id === 'ft_msejec_3er' || id === 'ft_jec') return true;
  const n = String(typeof ft === 'string' ? ft : (ft.nombre || ft.fichaTypeNombre || ft.tipo || id || ''))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (n.includes('tutoria') || n.includes('pedagogic')) return false; // Evitar confundir con coordinaciones JEC
  if ((n.includes('implementacion') && n.includes('modelo jec')) ||
      (n.includes('asistencia tecnica') && n.includes('jec')) ||
      (n.includes('modelo jec')) ||
      (n.includes('mse jec') && !n.includes('tutoria') && !n.includes('pedagogic'))) {
    return true;
  }
  if (state && Array.isArray(state.fichaTypes) && typeof ft === 'object' && ft.fichaTypeId) {
    const parentFt = state.fichaTypes.find(f => f.id === ft.fichaTypeId);
    if (parentFt && parentFt !== ft) return isFichaJec(parentFt);
  }
  return false;
}

/**
 * Obtiene el momento de aplicación (1, 2 o 3) de la ficha de Implementación JEC
 * @param {Object|string} ft - Ficha o ID
 * @returns {number|null} 1, 2 o 3 (o 2 por defecto si es JEC institucional genérica)
 */
export function getMomentoFichaJec(ft) {
  if (!ft) return null;
  if (typeof ft === 'object') {
    if (ft.visita !== undefined && ft.visita !== null && ft.visita !== '') {
      const v = Number(ft.visita);
      if (v === 1 || v === 2 || v === 3) return v;
    }
    if (ft.momento !== undefined && ft.momento !== null && ft.momento !== '') {
      const m = Number(ft.momento);
      if (m === 1 || m === 2 || m === 3) return m;
    }
  }
  const id = (typeof ft === 'string' ? ft : (ft.id || ft.fichaTypeId || ft.tipo || '')).toLowerCase();
  if (id === 'ft_msejec_1er' || id.includes('1er') || id.includes('m1') || id.includes('momento_1')) return 1;
  if (id === 'ft_msejec_2do' || id === 'ft_jec' || id.includes('2do') || id.includes('m2') || id.includes('momento_2')) return 2;
  if (id === 'ft_msejec_3er' || id.includes('3er') || id.includes('m3') || id.includes('momento_3')) return 3;
  const n = String(typeof ft === 'string' ? ft : (ft.nombre || ft.fichaTypeNombre || '')).toLowerCase();
  if (n.includes('1er') || n.includes('primer')) return 1;
  if (n.includes('3er') || n.includes('tercer')) return 3;
  if (n.includes('2do') || n.includes('segundo')) return 2;
  return isFichaJec(ft) ? 2 : null;
}

export function isFichaJec1erMomento(ft) {
  return isFichaJec(ft) && getMomentoFichaJec(ft) === 1;
}

export function isFichaJec2doMomento(ft) {
  return isFichaJec(ft) && getMomentoFichaJec(ft) === 2;
}

export function isFichaJec3erMomento(ft) {
  return isFichaJec(ft) && getMomentoFichaJec(ft) === 3;
}

/**
 * Determina si una plantilla o ficha corresponde a la de:
 * "Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)"
 *
 * @param {Object|string} ft - Plantilla o ficha
 * @param {Object} [state] - Estado opcional para resolver fichaTypeId
 * @returns {boolean}
 */
export function isFichaCoordTutoriaJec(ft, state = null) {
  if (!ft) return false;
  const id = (typeof ft === 'string' ? ft : (ft.id || ft.fichaTypeId || ft.tipo || '')).toLowerCase();
  if (id === 'ft_coord_tutoria_jec' || id === 'ft_coord_tutoria') return true;
  const n = String(typeof ft === 'string' ? ft : (ft.nombre || ft.fichaTypeNombre || ft.tipo || id || ''))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if ((n.includes('coordinador') || n.includes('coordinadora') || n.includes('funciones')) && n.includes('tutoria')) {
    return true;
  }
  if (state && Array.isArray(state.fichaTypes) && typeof ft === 'object' && ft.fichaTypeId) {
    const parentFt = state.fichaTypes.find(f => f.id === ft.fichaTypeId);
    if (parentFt && parentFt !== ft) return isFichaCoordTutoriaJec(parentFt);
  }
  return false;
}

/**
 * Determina si una plantilla o ficha corresponde a la de:
 * "Ficha de Monitoreo a las funciones que cumple el/la coordinador(a) Pedagógico"
 *
 * @param {Object|string} ft - Plantilla o ficha
 * @param {Object} [state] - Estado opcional para resolver fichaTypeId
 * @returns {boolean}
 */
export function isFichaCoordPedagogico(ft, state = null) {
  if (!ft) return false;
  const id = (typeof ft === 'string' ? ft : (ft.id || ft.fichaTypeId || ft.tipo || '')).toLowerCase();
  if (id === 'ft_coord_pedagogico' || id === 'ft_coord_pedagogico_jec') return true;
  const n = String(typeof ft === 'string' ? ft : (ft.nombre || ft.fichaTypeNombre || ft.tipo || id || ''))
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if ((n.includes('coordinador') || n.includes('coordinadora') || n.includes('funciones')) && n.includes('pedagogic')) {
    return true;
  }
  if (state && Array.isArray(state.fichaTypes) && typeof ft === 'object' && ft.fichaTypeId) {
    const parentFt = state.fichaTypes.find(f => f.id === ft.fichaTypeId);
    if (parentFt && parentFt !== ft) return isFichaCoordPedagogico(parentFt);
  }
  return false;
}

/**
 * Determina si una ficha o submission pertenece al grupo exclusivo de Fichas JEC
 * a cargo de la Especialista de JEC (Fanny Liliana Arias Quiróz)
 *
 * @param {Object|string} ft - Ficha, plantilla o submission
 * @param {Object} [state] - Estado opcional para resolver fichaTypeId
 * @returns {boolean}
 */
export function isFichaEspecialistaJec(ft, state = null) {
  return isFichaJec(ft, state) || isFichaCoordTutoriaJec(ft, state) || isFichaCoordPedagogico(ft, state);
}

/**
 * Determina con precisión si una plantilla o ficha corresponde a la de
 * "Monitoreo y Asistencia Técnica a la Gestión Escolar - UGEL 03 EBR"
 *
 * @param {Object} ft - Plantilla o ficha
 * @returns {boolean}
 */
export function isFichaEbrGestionEscolar(ft) {
  if (!ft) return false;
  const id = String(ft.id || ft.fichaTypeId || '').toLowerCase();
  // EXCLUSIONES ESTRICTAS: CEBE, PRITE, CEBA, CETPRO NO son Ficha EBR Gestión Escolar
  if (id.includes('cebe') || id.includes('prite') || id.includes('ceba') || id.includes('cetpro')) return false;

  const n = String(ft.nombre || ft.fichaTypeNombre || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  if (n.includes('cebe') || n.includes('prite') || n.includes('ceba') || n.includes('cetpro')) return false;

  if (id === 'ft_gestion_ugel03_ebr') return true;
  if (id === 'ft_ebr_gestion_1er') return false;
  if (id.includes('gestion') && id.includes('ebr')) return true;
  if (n.includes('1er momento') || n.includes('1.er momento') || n.includes('diagnostico')) return false;
  if (n.includes('gestion escolar') && n.includes('ebr')) return true;
  if (n.includes('gestion') && n.includes('ebr')) return true;
  if (ft.regla_nivel && ft.regla_nivel.momento && (ft.regla_nivel.maxPuntaje === 69 || ft.regla_nivel.maxPuntaje === 57 || ft.regla_nivel.maxPuntaje === 45)) return true;
  if (Array.isArray(ft.respuestas) && ft.respuestas.some(r => String(r?.id || '').startsWith('ge_doc_') || String(r?.id || '').startsWith('ge_1_') || String(r?.id || '').startsWith('ge_2_') || String(r?.id || '').startsWith('ge3_') || String(r?.id || '').startsWith('ge_3_'))) return true;
  return false;
}

/**
 * Determina si una ficha o plantilla pertenece a EBR, EBE o PRITE (excluye JEC)
 * @param {Object} ft - Plantilla o submission
 * @returns {boolean}
 */
export function isFichaEbrEbePrite(ft) {
  if (!ft) return false;
  // Regla de oro: NO modificar la lógica de las fichas de JEC
  if (isFichaJec(ft) || isFichaCoordTutoriaJec(ft) || isFichaCoordPedagogico(ft) || isFichaEspecialistaJec(ft)) {
    return false;
  }
  const id = String(ft.id || ft.fichaTypeId || '').toLowerCase();
  const n = String(ft.nombre || ft.fichaTypeNombre || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const m = String(ft.modalidad || '').toUpperCase();

  if (id.includes('jec') || n.includes('jec')) return false;

  // PRITE
  if (id.includes('prite') || n.includes('prite') || m.includes('PRITE')) return true;

  // CEBE / EBE
  if (id.includes('cebe') || n.includes('cebe') || m.includes('EBE') || m.includes('CEBE') || n.includes('especial')) return true;

  // EBR
  if (isFichaEbrGestionEscolar(ft) || id.includes('ebr') || n.includes('ebr') || m.includes('EBR') || m.includes('INICIAL') || m.includes('PRIMARIA') || m.includes('SECUNDARIA') || m.includes('REGULAR')) return true;

  // Escala IPL / ips (excepto JEC)
  if (ft.tipoRespuesta === 'ips' || ft.tipoRespuesta === 'escala1_3' || ft.escala === 'IPL' || ft.escala === 'IPL_NA') return true;

  return true;
}

/**
 * Detecta si una ficha o plantilla EBR corresponde al 1er, 2do o 3er Momento
 *
 * @param {Object} subOrFt - Ficha registrada o plantilla
 * @returns {number} 1, 2 o 3
 */
export function getMomentoVisitaEbr(subOrFt) {
  if (!subOrFt) return 1;
  const v = Number(subOrFt.visita);
  if (v === 1 || v === 2 || v === 3) return v;
  if (subOrFt.visitaTipo && String(subOrFt.visitaTipo).includes('3')) return 3;
  if (subOrFt.visitaTipo && String(subOrFt.visitaTipo).includes('2')) return 2;
  if (subOrFt.visitaTipo && String(subOrFt.visitaTipo).includes('1')) return 1;
  const n = String(subOrFt.nombre || subOrFt.fichaTypeNombre || '').toLowerCase();
  if (n.includes('3er') || n.includes('tercer') || n.includes('momento 3') || n.includes('salida')) return 3;
  if (n.includes('2do') || n.includes('segundo') || n.includes('momento 2')) return 2;
  if (n.includes('1er') || n.includes('primer') || n.includes('momento 1')) return 1;
  if (subOrFt.version?.momento === '3er' || subOrFt.momento === '3er' || subOrFt.momento === 3) return 3;
  if (subOrFt.version?.momento === '2do' || subOrFt.momento === '2do' || subOrFt.momento === 2) return 2;
  if (subOrFt.version?.momento === '1er' || subOrFt.momento === '1er' || subOrFt.momento === 1) return 1;
  if (Array.isArray(subOrFt.respuestas) && subOrFt.respuestas.some(r => String(r?.id || '').startsWith('ge3_'))) return 3;
  if (Array.isArray(subOrFt.respuestas) && subOrFt.respuestas.some(r => String(r?.id || '').startsWith('ge2_'))) return 2;
  return 1;
}

/**
 * Resuelve de forma robusta el número canónico de visita / momento (1, 2 o 3)
 * de cualquier ficha o envío
 *
 * @param {Object} subOrFt - Ficha registrada o plantilla
 * @param {Object} [targetFt] - Plantilla de ficha asociada
 * @returns {number} 1, 2 o 3
 */
export function getSubmissionVisitaNum(subOrFt, targetFt = null) {
  if (!subOrFt) return 1;

  // 1. Campo explícito subOrFt.visita (Prioridad absoluta para fichas unificadas)
  if (subOrFt.visita !== undefined && subOrFt.visita !== null && subOrFt.visita !== '') {
    const n = Number(subOrFt.visita);
    if (!isNaN(n) && (n === 1 || n === 2 || n === 3)) return n;
    const strV = String(subOrFt.visita).toLowerCase();
    if (strV.includes('3') || strV.includes('tercer')) return 3;
    if (strV.includes('2') || strV.includes('segundo')) return 2;
    if (strV.includes('1') || strV.includes('primer')) return 1;
  }

  // 2. Campo explícito subOrFt.momento
  if (subOrFt.momento !== undefined && subOrFt.momento !== null && subOrFt.momento !== '') {
    const n = Number(subOrFt.momento);
    if (!isNaN(n) && (n === 1 || n === 2 || n === 3)) return n;
    const strM = String(subOrFt.momento).toLowerCase();
    if (strM.includes('3') || strM.includes('tercer')) return 3;
    if (strM.includes('2') || strM.includes('segundo')) return 2;
    if (strM.includes('1') || strM.includes('primer')) return 1;
  }

  const ftId = String(targetFt?.id || subOrFt.fichaTypeId || subOrFt.tipo || '').toLowerCase();
  const ftNom = String(targetFt?.nombre || subOrFt.fichaTypeNombre || subOrFt.nombre || '').toLowerCase();

  // 3. Fichas históricas de Implementación del Modelo JEC (cuando no tienen visita guardada)
  if (ftId === 'ft_msejec_1er' || (ftId.includes('1er') && (ftId.includes('jec') || ftNom.includes('jec')))) {
    return 1;
  }
  if (ftId === 'ft_msejec_2do' || ftId === 'ft_jec' || (ftId.includes('2do') && (ftId.includes('jec') || ftNom.includes('jec')))) {
    return 2;
  }
  if (ftId === 'ft_msejec_3er' || (ftId.includes('3er') && (ftId.includes('jec') || ftNom.includes('jec')))) {
    return 3;
  }

  // 4. Si es ficha EBR Gestión Escolar
  if (isFichaEbrGestionEscolar(targetFt || subOrFt)) {
    return getMomentoVisitaEbr(subOrFt);
  }

  // 5. Fallback con getMomentoVisitaEbr para detección de textos y códigos
  return getMomentoVisitaEbr(subOrFt) || 1;
}
