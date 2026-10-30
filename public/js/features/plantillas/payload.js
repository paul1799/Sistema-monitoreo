/**
 * features/plantillas/payload.js
 * Construcción, validación y Schema v2 de plantillas de ficha
 * UGEL 03 · AGEBRE · Fase 3 Reorganización
 */

import { genId, FICHA_PALETTE } from '../../core/utils/index.js';

export function getDeletedFichaTypeIds() {
  try {
    const raw = localStorage.getItem('deleted_ficha_types');
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch (e) {
    return new Set();
  }
}

export function addDeletedFichaTypeId(id) {
  if (!id) return;
  try {
    const set = getDeletedFichaTypeIds();
    set.add(id);
    localStorage.setItem('deleted_ficha_types', JSON.stringify([...set]));
  } catch (e) {
    console.warn('Error saving deleted_ficha_types to localStorage:', e);
  }
}

export function normalizeExtras(extras) {
  if (!Array.isArray(extras)) return [];
  return extras.map((ex, idx) => {
    if (!ex) return null;
    if (typeof ex === 'string') {
      return { id: 'hdr_' + idx, label: ex, tipo: 'texto', required: false, opciones: '' };
    }
    const safeLabel = (ex.label || '').trim();
    const safeId = ex.id || ('hdr_' + (safeLabel ? safeLabel.replace(/[^a-z0-9]+/gi, '_').toLowerCase() : idx) + '_' + idx);
    let safeTipo = (ex.tipo || 'texto').toLowerCase();
    if (!['texto', 'numero', 'fecha', 'si_no', 'select', 'textarea'].includes(safeTipo)) safeTipo = 'texto';
    const safeOpts = Array.isArray(ex.opciones) ? ex.opciones.join(', ') : (typeof ex.opciones === 'string' ? ex.opciones : '');
    return {
      id: safeId,
      label: safeLabel,
      tipo: safeTipo,
      required: !!ex.required,
      opciones: safeOpts,
    };
  }).filter(Boolean);
}

export function blankBuilder() {
  return {
    nombre: '',
    nombreCorto: '',
    descripcion: '',
    icono: '📋',
    color: (FICHA_PALETTE[0] || {}).hex || '#1E40AF',
    modalidad: 'General',
    grupo: 'EBR',
    orden: 99,
    tipoRespuesta: 'si_no',
    activo: true,
    regla_nivel: 'porcentaje',
    regla_nivel_config: {
      inicio: { min: 0, max: 11, label: 'Incipiente' },
      proceso: { min: 12, max: 23, label: 'Parcial' },
      logrado: { min: 24, max: 31, label: 'Lograda' }
    },
    version: '2026.1',
    tieneVisitas: false,
    tipoVisitas: 'mismos_items',
    visitas: ['Visita 1', 'Visita 2', 'Visita 3'],
    seccionesPorVisita: {},
    secciones: [{
      nombre: 'Sección 1: Planificación y Gestión',
      items: [{ id: genId(), texto: '', evidencia: '' }]
    }],
    extras: [
      { id: genId(), label: 'UGEL', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'RED / REI', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Código modular / local', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Director(a) en funciones', tipo: 'texto', required: false, opciones: '' },
      { id: genId(), label: 'Responsable / especialista', tipo: 'texto', required: false, opciones: '' },
    ],
    tablas: [],
    compromisos: {
      habilitado: true,
      director: true,
      especialista: true,
      filasPorVisita: 3
    }
  };
}

export function cleanBuilderStateForExport(bs, editingId = null) {
  if (!bs) return {};
  const res = {
    id: editingId || undefined,
    origen: 'builder',
    schemaVersion: 2,
    nombre: bs.nombre || '',
    nombreCorto: bs.nombreCorto || bs.nombre || '',
    descripcion: bs.descripcion || '',
    icono: bs.icono || '📋',
    color: bs.color || (FICHA_PALETTE[0] || {}).hex || '#1E40AF',
    modalidad: bs.modalidad || 'General',
    grupo: (bs.grupo || 'EBR').trim(),
    orden: typeof bs.orden === 'number' ? bs.orden : 99,
    tipoRespuesta: bs.tipoRespuesta || 'si_no',
    regla_nivel: bs.regla_nivel || 'porcentaje',
    regla_nivel_config: bs.regla_nivel_config || undefined,
    version: bs.version || '2026.1',
    tieneVisitas: !!bs.tieneVisitas,
    tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
    visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
    extras: (bs.extras || []).map(e => ({
      id: e.id,
      label: e.label || '',
      tipo: e.tipo || 'texto',
      required: !!e.required,
      opciones: e.opciones || undefined
    })),
    tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
    compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
    secciones: []
  };

  let globalCounter = 0;
  res.secciones = (bs.secciones || []).map((s, sIdx) => ({
    nombre: s.nombre || '',
    items: (s.items || []).map((i, iIdx) => {
      const gIdx = globalCounter++;
      return {
        id: i.id || `sec${sIdx + 1}_it${iIdx + 1}_${genId()}`,
        globalIdx: gIdx,
        num: gIdx + 1,
        texto: i.texto || '',
        evidencia: i.evidencia || ''
      };
    })
  }));

  if (bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita' && bs.seccionesPorVisita) {
    res.seccionesPorVisita = {};
    Object.keys(bs.seccionesPorVisita).forEach(k => {
      let vCounter = 0;
      res.seccionesPorVisita[k] = (bs.seccionesPorVisita[k] || []).map((s, sIdx) => ({
        nombre: s.nombre || '',
        items: (s.items || []).map((i, iIdx) => {
          const gIdx = vCounter++;
          return {
            id: i.id || `v${k}_s${sIdx + 1}_it${iIdx + 1}_${genId()}`,
            globalIdx: gIdx,
            num: gIdx + 1,
            texto: i.texto || '',
            evidencia: i.evidencia || ''
          };
        })
      }));
    });
  }

  return res;
}

export function buildFichaTypePayload(bs, editingId = null, isDraft = false) {
  const isDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
  let validSeccionesPorVisita = {};
  if (isDiferenciada && bs.seccionesPorVisita) {
    Object.keys(bs.seccionesPorVisita).forEach(k => {
      let globalVisitaNum = 0;
      const seenVisitaIds = new Set();
      validSeccionesPorVisita[k] = (bs.seccionesPorVisita[k] || [])
        .filter(s => (s.nombre || '').trim() || (s.items && s.items.some(i => (i.texto || '').trim())))
        .map((s, sIdx) => ({
          nombre: (s.nombre || '').trim() || 'Sección',
          items: (s.items || []).filter(i => (i.texto || '').trim()).map((i, iIdx) => {
            const rawId = (i.id || '').trim();
            const uniqueId = (!rawId || seenVisitaIds.has(rawId) || /^\d+$/.test(rawId))
              ? `v${k}_s${sIdx + 1}_it${iIdx + 1}_${genId()}`
              : rawId;
            seenVisitaIds.add(uniqueId);
            const gIdx = globalVisitaNum;
            globalVisitaNum++;
            return {
              id: uniqueId,
              globalIdx: gIdx,
              num: globalVisitaNum,
              seccionIdx: sIdx,
              itemIdx: iIdx,
              texto: (i.texto || '').trim(),
              evidencia: (i.evidencia || '').trim()
            };
          })
        }));
    });
  }

  let globalNum = 0;
  const seenTemplateIds = new Set();
  const validSections = (isDiferenciada && validSeccionesPorVisita[0] && validSeccionesPorVisita[0].length > 0)
    ? validSeccionesPorVisita[0]
    : (bs.secciones || [])
      .filter(s => (s.nombre || '').trim() || (s.items || []).some(i => (i.texto || '').trim()))
      .map((s, sIdx) => ({
        nombre: (s.nombre || '').trim() || 'Sección',
        items: (s.items || []).filter(i => (i.texto || '').trim()).map((i, iIdx) => {
          const rawId = (i.id || '').trim();
          const uniqueId = (!rawId || seenTemplateIds.has(rawId) || /^\d+$/.test(rawId))
            ? `sec${sIdx + 1}_it${iIdx + 1}_${genId()}`
            : rawId;
          seenTemplateIds.add(uniqueId);
          const gIdx = globalNum;
          globalNum++;
          return {
            id: uniqueId,
            globalIdx: gIdx,
            num: globalNum,
            seccionIdx: sIdx,
            itemIdx: iIdx,
            texto: (i.texto || '').trim(),
            evidencia: (i.evidencia || '').trim()
          };
        })
      }));

  return {
    origen: 'builder',
    schemaVersion: 2,
    nombre: (bs.nombre || '').trim(),
    nombreCorto: ((bs.nombreCorto || bs.nombre) || '').trim(),
    grupo: (bs.grupo || 'EBR').trim(),
    orden: typeof bs.orden === 'number' ? bs.orden : 99,
    descripcion: (bs.descripcion || '').trim(),
    icono: (bs.icono || '📋').trim(),
    color: bs.color || (FICHA_PALETTE[0] || {}).hex || '#1E40AF',
    modalidad: bs.modalidad || 'General',
    tipoRespuesta: bs.tipoRespuesta || 'si_no',
    regla_nivel: bs.regla_nivel || 'porcentaje',
    regla_nivel_config: bs.regla_nivel === 'conteo_rangos' ? (bs.regla_nivel_config || null) : null,
    version: bs.version || '2026.1',
    tieneVisitas: !!bs.tieneVisitas,
    tipoVisitas: bs.tieneVisitas ? (bs.tipoVisitas || 'mismos_items') : 'mismos_items',
    visitas: bs.tieneVisitas ? (Array.isArray(bs.visitas) && bs.visitas.length > 0 ? bs.visitas : ['Visita 1', 'Visita 2', 'Visita 3']) : [],
    seccionesPorVisita: isDiferenciada ? validSeccionesPorVisita : {},
    secciones: validSections,
    extras: (bs.extras || []).filter(e => e && e.label && e.label.trim()),
    tablas: Array.isArray(bs.tablas) ? bs.tablas : [],
    compromisos: bs.compromisos || { habilitado: true, director: true, especialista: true, filasPorVisita: 3 },
    activo: bs.activo !== false,
    esBorrador: !!isDraft,
    updatedAt: Date.now()
  };
}

export function validateBuilderPayload(bs) {
  if (!bs.nombre || !bs.nombre.trim()) {
    return { valid: false, error: 'Falta asignar el nombre de la ficha.', field: 'b_nombre' };
  }
  const isDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
  const validSections = (bs.secciones || []).filter(s => (s.nombre || '').trim() || (s.items || []).some(i => (i.texto || '').trim()));
  const totalItems = validSections.reduce((acc, s) => acc + (s.items || []).filter(i => (i.texto || '').trim()).length, 0);

  let totalVisitaItems = totalItems;
  if (isDiferenciada && bs.seccionesPorVisita) {
    totalVisitaItems = Object.values(bs.seccionesPorVisita).reduce((acc, secs) => {
      return acc + (secs || []).reduce((a2, s) => a2 + (s.items || []).filter(i => (i.texto || '').trim()).length, 0);
    }, 0);
  }

  if (validSections.length === 0 || (totalItems === 0 && totalVisitaItems === 0)) {
    return { valid: false, error: 'La ficha debe tener al menos una sección con un indicador.', field: null };
  }

  return { valid: true };
}

