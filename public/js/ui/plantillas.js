/* =========================================================================
   ui/plantillas.js — Puente de retrocompatibilidad hacia features/plantillas/index.js
   UGEL 03 · AGEBRE · Fase 3 Reorganización
   ========================================================================= */

export {
  getDeletedFichaTypeIds,
  addDeletedFichaTypeId,
  normalizeExtras,
  cleanBuilderStateForExport,
  blankBuilder,
  buildFichaTypePayload,
  validateBuilderPayload,
  duplicateFichaType,
  confirmDeleteFichaType,
  renderPlantillasManagementView,
  renderTiposTab,
  renderAreasYFirmantesView,
  startNewPlantillaBuilder,
  openFichaInBuilder,
  renderSplitScreenBuilder,
  renderBuilder
} from '../features/plantillas/index.js?v=20261103_v8';

export * from '../features/plantillas/index.js?v=20261103_v8';
