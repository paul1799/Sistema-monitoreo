/**
 * ui/registrar.js – Puente de retrocompatibilidad
 * Re-exporta la implementación modularizada desde features/registrar/
 * UGEL 03 – AGEBRE – Fase 4 Reorganización
 */

export * from '../features/registrar/index.js?v=20261106_v6';

export {
  registrarSubTab,
  setRegistrarSubTab,
  getRegistrarSubTab,
  resetRegBuiltFor,
  setRegBuiltFor,
  syncEditingState,
  renderRegistrarTab,
  buildRegForm,
  renderCompList,
  onSubmitRegistro,
  fileToBase64,
  applyExtractedData,
  extractFichaFromImage,
  getRegSelectedTypeIdVal,
  setRegSelectedTypeIdVal,
  getRegSelectedColegioIdVal,
  setRegSelectedColegioIdVal,
  getCurrentJecVisita,
  setCurrentJecVisita,
  getRegCompromisos,
  setRegCompromisos,
  getFichaListSearchQuery,
  setFichaListSearchQuery,
  getFichaListFilterEscala,
  setFichaListFilterEscala,
  getFichaListFilterModalidad,
  setFichaListFilterModalidad,
  getFichaDescExpanded
} from '../features/registrar/index.js?v=20261106_v6';
