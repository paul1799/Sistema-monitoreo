/* =========================================================================
   pdf-template.js — Fachada unificada y adaptador oficial para documentos PDF
   UGEL 03 · AGEBRE
   
   ARQUITECTURA MODULARIZADA:
   El sistema de generación de PDFs se encuentra desintegrado en módulos especializados:
   - pdf-core.js       -> Motor base de renderizado, membrete, pie de página, tipografía Unicode y utilidades.
   - pdf-monitoreo.js  -> Instrumentos y reportes oficiales de Monitoreo (EBR, JEC, CEBE, PRITE, Directivo, Padrón).
   - pdf-concursos.js  -> Actas y reportes oficiales de Concursos Educativos (JEDPA, JFEN, FENCYT, ONEM, Orden de Mérito).
   
   Este archivo actúa como adaptador principal (barrel/facade) asegurando
   retrocompatibilidad al 100% con todos los módulos y pruebas automatizadas existentes.
   ========================================================================= */

// ---------------------------------------------------------------------------
// 1. IMPORTACIONES DESDE LOS MÓDULOS ESPECIALIZADOS
// ---------------------------------------------------------------------------
import {
  getJsPdf as _getJsPdf,
  formatDate as _formatDate,
  toTitleCase as _toTitleCase,
  COMMON_GIVEN_NAMES as _COMMON_GIVEN_NAMES,
  cleanWordForDict as _cleanWordForDict,
  splitRawNameToApellidosNombres as _splitRawNameToApellidosNombres,
  APELLIDOS_OBLIGATORIO as _APELLIDOS_OBLIGATORIO,
  formatearNombre as _formatearNombre,
  proponerSeparacionNombre as _proponerSeparacionNombre,
  formatPersonName as _formatPersonName,
  PALETA_ESTANDAR as _PALETA_ESTANDAR,
  verificarTextoPdf as _verificarTextoPdf,
  formatResolucionRef as _formatResolucionRef,
  dibujarPiePagina as _dibujarPiePagina,
  generateVerificationCode as _generateVerificationCode,
  getCurrentDateTimeStr as _getCurrentDateTimeStr,
  getLimaDateStr as _getLimaDateStr,
  sanitizeFilename as _sanitizeFilename,
  generateQrDataUrl as _generateQrDataUrl,
  plural as _plural,
  drawVectorCheckmark as _drawVectorCheckmark,
  drawVectorCheckbox as _drawVectorCheckbox,
  ensureUnicodeFont as _ensureUnicodeFont,
  sanitizePdfText as _sanitizePdfText,
  drawOfficialHeader as _drawOfficialHeader,
  createOfficialPdfDocument as _createOfficialPdfDocument,
  resolveDirectorData as _resolveDirectorData,
  resolveDirectorName as _resolveDirectorName
} from './pdf-core.js?v=20261014_v1';

import {
  OFFICIAL_DIRECTIVO_ITEMS as _OFFICIAL_DIRECTIVO_ITEMS,
  OFFICIAL_DIRECTIVO_DIMENSIONS as _OFFICIAL_DIRECTIVO_DIMENSIONS,
  exportEbrGestionFichaPdf as _exportEbrGestionFichaPdf,
  exportJecFichaPdf as _exportJecFichaPdf,
  exportFichaIndividualPdf as _exportFichaIndividualPdf,
  formatRei as _formatRei,
  drawPdfDonutChart as _drawPdfDonutChart,
  exportConsolidadoReportPdfV2 as _exportConsolidadoReportPdfV2,
  exportConsolidadoReportPdfV1 as _exportConsolidadoReportPdfV1,
  exportConsolidadoReportPdf as _exportConsolidadoReportPdf,
  exportColegiosReportPdf as _exportColegiosReportPdf
} from './pdf-monitoreo.js?v=20261015_v1';

import {
  parseArteDisciplina as _parseArteDisciplina,
  JEDPA_THEME as _JEDPA_THEME,
  DISCIPLINAS_COLECTIVAS_DEFAULT as _DISCIPLINAS_COLECTIVAS_DEFAULT,
  esDisciplinaColectiva as _esDisciplinaColectiva,
  normalizeGenero as _normalizeGenero,
  formatGeneroDisplay as _formatGeneroDisplay,
  CONCURSOS_CONFIG as _CONCURSOS_CONFIG,
  getConcursoConfig as _getConcursoConfig,
  formatearRol as _formatearRol,
  formatearCuerpoTecnicoTexto as _formatearCuerpoTecnicoTexto,
  formatearFiltrosSubtitulo as _formatearFiltrosSubtitulo,
  generarConcursoCuerpoTecnicoDocId as _generarConcursoCuerpoTecnicoDocId,
  obtenerCuerpoTecnicoGrupo as _obtenerCuerpoTecnicoGrupo,
  formatCodigoModular as _formatCodigoModular,
  obtenerCuerpoTecnicoDeEquipo as _obtenerCuerpoTecnicoDeEquipo,
  getTituloConsolidadoConcurso as _getTituloConsolidadoConcurso,
  formatPuestoLabel as _formatPuestoLabel,
  puestoRank as _puestoRank,
  getPodioFields as _getPodioFields,
  construirFilasFicha as _construirFilasFicha,
  dibujarInsigniaPuesto as _dibujarInsigniaPuesto,
  deduplicateConcursoRows as _deduplicateConcursoRows,
  getFormatoPdfConcurso as _getFormatoPdfConcurso,
  colorPorCategoria as _colorPorCategoria,
  exportJfenFichasPdf as _exportJfenFichasPdf,
  exportJedpaFichasPdf as _exportJedpaFichasPdf,
  exportFichasGrupalesConcursoPdf as _exportFichasGrupalesConcursoPdf,
  exportConcursosReportPdf as _exportConcursosReportPdf,
  exportActaOrdenMeritoPdf as _exportActaOrdenMeritoPdf
} from './pdf-concursos.js?v=20261019_v2';

// ---------------------------------------------------------------------------
// 2. CONSTANTES OFICIALES RE-EXPORTADAS
// ---------------------------------------------------------------------------
export const SISTEMA_NOMBRE_OFICIAL = 'Sistema de Fichas de Monitoreo';
export {
  _COMMON_GIVEN_NAMES as COMMON_GIVEN_NAMES,
  _APELLIDOS_OBLIGATORIO as APELLIDOS_OBLIGATORIO,
  _PALETA_ESTANDAR as PALETA_ESTANDAR,
  _JEDPA_THEME as JEDPA_THEME,
  _DISCIPLINAS_COLECTIVAS_DEFAULT as DISCIPLINAS_COLECTIVAS_DEFAULT,
  _CONCURSOS_CONFIG as CONCURSOS_CONFIG,
  _OFFICIAL_DIRECTIVO_ITEMS as OFFICIAL_DIRECTIVO_ITEMS,
  _OFFICIAL_DIRECTIVO_DIMENSIONS as OFFICIAL_DIRECTIVO_DIMENSIONS
};

// ---------------------------------------------------------------------------
// 3. UTILIDADES CORE Y RENDERIZADO
// ---------------------------------------------------------------------------
export function getJsPdf() {
  return _getJsPdf();
}

export function formatDate(dateStr) {
  return _formatDate(dateStr);
}

export function toTitleCase(str) {
  return _toTitleCase(str);
}

export function cleanWordForDict(w) {
  return _cleanWordForDict(w);
}

export function splitRawNameToApellidosNombres(str) {
  return _splitRawNameToApellidosNombres(str);
}

export function formatearNombre(persona) {
  return _formatearNombre(persona);
}

export function proponerSeparacionNombre(persona) {
  return _proponerSeparacionNombre(persona);
}

export function formatPersonName(person) {
  return formatearNombre(person);
}

export function resolveDirectorData(sub, colegio) {
  return _resolveDirectorData(sub, colegio);
}

export function resolveDirectorName(sub, colegio) {
  return _resolveDirectorName(sub, colegio);
}

export function verificarTextoPdf(texto, contexto = '') {
  return _verificarTextoPdf(texto, contexto);
}

export function formatResolucionRef(res) {
  if (!res) return '—';
  let s = String(res).trim();
  if (/^RD\s+(\d+)/i.test(s)) {
    s = s.replace(/^RD\s+/i, 'RD N.° ');
  } else if (/^RD\s*N\.?°?\s*/i.test(s)) {
    s = s.replace(/^RD\s*N\.?°?\s*/i, 'RD N.° ');
  }
  return s.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-');
}

export function dibujarPiePagina(doc, datos) {
  return _dibujarPiePagina(doc, datos);
}

export function generateVerificationCode() {
  return _generateVerificationCode();
}

export function getCurrentDateTimeStr() {
  return _getCurrentDateTimeStr();
}

export function getLimaDateStr() {
  return _getLimaDateStr();
}

export function sanitizeFilename(name) {
  return _sanitizeFilename(name);
}

export async function generateQrDataUrl(text) {
  return await _generateQrDataUrl(text);
}

export function plural(n, singular, pluralForm) {
  return _plural(n, singular, pluralForm);
}

export function drawVectorCheckmark(doc, centerX, centerY, size = 9, color = [5, 150, 105], lineWidth = 1.3) {
  return _drawVectorCheckmark(doc, centerX, centerY, size, color, lineWidth);
}

export function drawVectorCheckbox(doc, x, y, size = 8.5, checked = false, mark = 'X', color = [15, 27, 45]) {
  return _drawVectorCheckbox(doc, x, y, size, checked, mark, color);
}

export async function ensureUnicodeFont(doc) {
  return await _ensureUnicodeFont(doc);
}

export function sanitizePdfText(str) {
  return _sanitizePdfText(str);
}

export function drawOfficialHeader(doc, pageW, margin, pageH, areaConfig = null, customTopY = null) {
  return _drawOfficialHeader(doc, pageW, margin, pageH, areaConfig, customTopY);
}

export async function createOfficialPdfDocument(options) {
  // Garantiza que el membrete oficial se dibuje una sola vez por página
  const drawnHeaderPages = new Set();
  return await _createOfficialPdfDocument(options);
}

// ---------------------------------------------------------------------------
// 4. GENERADORES PDF DE MONITOREO
// ---------------------------------------------------------------------------
export async function exportEbrGestionFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  return await _exportEbrGestionFichaPdf(sub, fichaType, colegio, downloadConfig);
}

export async function exportJecFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  return await _exportJecFichaPdf(sub, fichaType, colegio, downloadConfig);
}

export async function exportFichaIndividualPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  return await _exportFichaIndividualPdf(sub, fichaType, colegio, downloadConfig);
}

export function formatRei(redVal) {
  return _formatRei(redVal);
}

export function drawPdfDonutChart(doc, cx, cy, outerRadius, innerRadius, segments, totalLabel = '', subLabel = 'fichas') {
  return _drawPdfDonutChart(doc, cx, cy, outerRadius, innerRadius, segments, totalLabel, subLabel);
}

export async function exportConsolidadoReportPdfV2(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  return await _exportConsolidadoReportPdfV2(statsList, fichaType, filters, isAllMode, downloadConfig);
}

export async function exportConsolidadoReportPdfV1(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  return await _exportConsolidadoReportPdfV1(statsList, fichaType, filters, isAllMode, downloadConfig);
}

export async function exportConsolidadoReportPdf(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  return await _exportConsolidadoReportPdf(statsList, fichaType, filters, isAllMode, downloadConfig);
}

export async function exportColegiosReportPdf(colegios, stats = {}, downloadConfig = {}) {
  return await _exportColegiosReportPdf(colegios, stats, downloadConfig);
}

// ---------------------------------------------------------------------------
// 5. GENERADORES Y HELPERS PDF DE CONCURSOS EDUCATIVOS
// ---------------------------------------------------------------------------
export function parseArteDisciplina(disciplinaStr) {
  return _parseArteDisciplina(disciplinaStr);
}

export function esDisciplinaColectiva(disciplina, registro = null, tipoConcurso = null) {
  return _esDisciplinaColectiva(disciplina, registro, tipoConcurso);
}

export function normalizeGenero(val) {
  return _normalizeGenero(val);
}

export function formatGeneroDisplay(val) {
  return _formatGeneroDisplay(val);
}

export function getConcursoConfig(tipoConcurso) {
  return _getConcursoConfig(tipoConcurso);
}

export function formatearRol(rol, options = {}) {
  return _formatearRol(rol, options);
}

export function formatearCuerpoTecnicoTexto(personas, options = {}) {
  return _formatearCuerpoTecnicoTexto(personas, options);
}

export function formatearFiltrosSubtitulo(filters = {}, etapaLabel = 'UGEL') {
  return _formatearFiltrosSubtitulo(filters, etapaLabel);
}

export function generarConcursoCuerpoTecnicoDocId(etapa, disciplina, categoria, rama) {
  return _generarConcursoCuerpoTecnicoDocId(etapa, disciplina, categoria, rama);
}

export function obtenerCuerpoTecnicoGrupo(target, arg2 = [], arg3 = {}, arg4 = null) {
  return _obtenerCuerpoTecnicoGrupo(target, arg2, arg3, arg4);
}

export function formatCodigoModular(val) {
  return _formatCodigoModular(val);
}

export function obtenerCuerpoTecnicoDeEquipo(registro, state = null) {
  return _obtenerCuerpoTecnicoDeEquipo(registro, state);
}

export function getTituloConsolidadoConcurso(tipoConcurso) {
  return _getTituloConsolidadoConcurso(tipoConcurso);
}

export function formatPuestoLabel(p) {
  return _formatPuestoLabel(p);
}

export function puestoRank(p) {
  return _puestoRank(p);
}

export function getPodioFields(tipo) {
  return _getPodioFields(tipo);
}

export function construirFilasFicha(tipoConcurso, registro, options = {}) {
  return _construirFilasFicha(tipoConcurso, registro, options);
}

export function dibujarInsigniaPuesto(doc, puesto, x, y, w = 84, h = 12) {
  return _dibujarInsigniaPuesto(doc, puesto, x, y, w, h);
}

export function deduplicateConcursoRows(rows) {
  return _deduplicateConcursoRows(rows);
}

export function getFormatoPdfConcurso(tipoConcurso) {
  return _getFormatoPdfConcurso(tipoConcurso);
}

export function colorPorCategoria(categoria) {
  return _colorPorCategoria(categoria);
}

export async function exportJfenFichasPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  return await _exportJfenFichasPdf(filtered, tipoConcurso, filters, downloadConfig);
}

export async function exportJedpaFichasPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  return await _exportJedpaFichasPdf(filtered, tipoConcurso, filters, downloadConfig);
}

export const exportFichasGrupalesConcursoPdf = exportJedpaFichasPdf;

export async function exportConcursosReportPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  // Derivación directa según formato de actas del concurso (ej: JFEN usa exportJfenFichasPdf(cleanRows, ...))
  return await _exportConcursosReportPdf(filtered, tipoConcurso, filters, downloadConfig);
}

export async function exportActaOrdenMeritoPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  return await _exportActaOrdenMeritoPdf(filtered, tipoConcurso, filters, downloadConfig);
}
