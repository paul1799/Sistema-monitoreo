// ====================================================================
// CONSOLIDADO REPORT PDF V1 (LEGACY & ROUTER) - MODULARIZADO
// ====================================================================

import {
  createOfficialPdfDocument,
  formatDate,
  getLimaDateStr,
  sanitizeFilename
} from '../pdf-core.js';

import {
  isFichaJec,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  isFichaEbrGestionEscolar,
  isFichaEbrEbePrite
} from '../calc/index.js';

import { isFichaCebeGestion } from '../cebe-gestion.js';
import { isFichaPriteGestion } from '../prite-gestion.js';

import { exportConsolidadoReportPdfV2 } from './consolidado-v2.js';

function plural(count, singular, pluralForm) {
  return count === 1 ? `${count} ${singular}` : `${count} ${pluralForm}`;
}

/**
 * Versión Legacy (V1) para retrocompatibilidad y rollback instantáneo sin downtime.
 */
export async function exportConsolidadoReportPdfV1(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const isDirectivoType = fichaType && (fichaType.tipoRespuesta === 'nivel_1_4' || (fichaType.id || '').includes('directivo') || (fichaType.nombre || '').toLowerCase().includes('directivo'));

  const title = isAllMode
    ? 'REPORTE CONSOLIDADO GENERAL DE MONITOREO'
    : `REPORTE CONSOLIDADO — ${(fichaType ? fichaType.nombre.toUpperCase() : 'MONITOREO')}`;

  const totalFichas = statsList.length;
  const instCount = new Set(statsList.map(x => x.s.institucion || '')).size;
  const withPct = statsList.filter(x => x.st.pct !== null);
  const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : '—';

  const filtrosAplicados = [];
  if (filters.institucion) filtrosAplicados.push(`I.E.: ${filters.institucion}`);
  if (filters.red) filtrosAplicados.push(`RED: ${filters.red}`);
  if (filters.visita) filtrosAplicados.push(`Visita: ${filters.visita}`);
  if (filters.responsable) filtrosAplicados.push(`Responsable: ${filters.responsable}`);
  if (filters.distrito) filtrosAplicados.push(`Distrito: ${filters.distrito}`);
  if (filters.desde || filters.hasta) filtrosAplicados.push(`Período: ${filters.desde || 'inicio'} a ${filters.hasta || 'fin'}`);
  const filterSubtitle = filtrosAplicados.length ? `Filtros: ${filtrosAplicados.join(' · ')}` : 'Filtros: ninguno (todos los registros)';

  const introParagraph = `El presente documento consolida la información de las visitas de monitoreo registradas en el Sistema de Gestión Institucional UGEL 03 para el año lectivo 2026. Se reporta un total de ${plural(totalFichas, 'ficha', 'fichas')} de monitoreo aplicada(s) en ${plural(instCount, 'institución educativa', 'instituciones educativas')}, con un nivel de cumplimiento promedio general del ${avgPct}%. ${filterSubtitle}.`;

  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  const isEbr = !isJec && (isFichaEbrGestionEscolar(fichaType) || isFichaEbrEbePrite(fichaType) || isFichaCebeGestion(fichaType) || isFichaPriteGestion(fichaType) || (fichaType?.escala === 'IPL') || (fichaType?.tipoRespuesta === 'ips'));
  const logCut = isEbr ? 67 : 85;
  const procCut = isEbr ? 34 : 70;

  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    if (x.st.pct === null) dist.none++;
    else {
      const lbl = (x.st?.estado?.estado_panel || x.st?.estado?.label || '').toLowerCase();
      if (lbl.includes('no cumple') || lbl.includes('inici') || lbl.includes('incipient') || lbl.includes('mejorar')) dist.inicio++;
      else if (lbl.includes('parcial') || lbl.includes('proces')) dist.proceso++;
      else if (lbl.includes('lograd') || lbl.includes('cumple')) dist.logrado++;
      else if (x.st.pct >= logCut) dist.logrado++;
      else if (x.st.pct >= procCut) dist.proceso++;
      else dist.inicio++;
    }
  });

  const pctLogrado = totalFichas ? Math.round((dist.logrado / totalFichas) * 100) : 0;
  const pctProceso = totalFichas ? Math.round((dist.proceso / totalFichas) * 100) : 0;
  const pctInicio = totalFichas ? Math.round((dist.inicio / totalFichas) * 100) : 0;
  const pctNone = totalFichas ? Math.round((dist.none / totalFichas) * 100) : 0;

  const customTables = [];

  customTables.push({
    title: 'I. DISTRIBUCIÓN DE RESULTADOS',
    subtitle: 'Categorización porcentual y numérica de las fichas de monitoreo según el nivel de logro alcanzado.',
    minHeight: 90,
    tableHeaders: ['Nivel de Logro', 'Rango de Cumplimiento', 'Cantidad de Fichas', 'Porcentaje (%)', 'Interpretación Institucional'],
    tableRows: [
      ['Logrado', `>= ${logCut}%`, String(dist.logrado), `${pctLogrado}%`, 'Nivel óptimo; cumple satisfactoriamente los estándares evaluados'],
      ['En proceso', `${procCut}% – ${logCut - 1}%`, String(dist.proceso), `${pctProceso}%`, 'En desarrollo; requiere fortalecimiento de prácticas pedagógicas'],
      ['Por mejorar', `< ${procCut}%`, String(dist.inicio), `${pctInicio}%`, 'Requiere asistencia técnica focalizada y acompañamiento prioritario'],
      ['Sin datos', '—', String(dist.none), `${pctNone}%`, 'Fichas sin respuestas o con indicadores no evaluados'],
      ['TOTAL', '—', String(totalFichas), '100%', 'Total consolidado de visitas de monitoreo procesadas']
    ]
  });

  let notaMetodologicaTextoV1 = '';
  if (isFichaEbrGestionEscolar(fichaType)) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar se determina según la escala oficial UGEL 03 EBR: Logrado (47–69 pts en V2, 39–57 pts en V1 / 67%–100%), En proceso (24–46 pts en V2, 20–38 pts en V1 / 34%–66%), Inicio (0–23 pts en V2, 0–19 pts en V1 / 0%–33%). Cada indicador se evalúa en escala Inicio (1 pt / 33%), Proceso (2 pts / 66%) y Logrado (3 pts / 100%).';
  } else if (isFichaPriteGestion(fichaType)) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar PRITE se determina según la escala oficial UGEL 03 (RM N° 501-2025-MINEDU): Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). La ficha consta de 32 indicadores en 7 dimensiones evaluados a lo largo de 3 visitas independientes (V1, V2, V3). Cada indicador aplicable se valora en escala Inicio (0%), Proceso (50%) y Logrado (100%), excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else if (isFichaCebeGestion(fichaType)) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar CEBE se determina según la escala oficial UGEL 03: Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). La ficha consta de 25 indicadores en 6 dimensiones evaluados a lo largo de 3 visitas independientes (V1, V2, V3). Cada indicador aplicable se valora en escala Inicio (0%), Proceso (50%) y Logrado (100%), excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else if (isJec) {
    notaMetodologicaTextoV1 = 'El cumplimiento de la Ficha de Monitoreo JEC se determina según la regla oficial MINEDU/UGEL 03: Implementación lograda (>= 24 sí), Implementación parcial (12–23 sí), Implementación incipiente (< 12 sí). Se evalúan 31 indicadores de cumplimiento directo Sí/No.';
  } else if (isEbr) {
    notaMetodologicaTextoV1 = 'El cumplimiento se determina según el criterio unificado UGEL 03 (EBR / EBE / PRITE): Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). Cada indicador aplicable se evalúa según la escala establecida, excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else {
    notaMetodologicaTextoV1 = 'El cumplimiento de cada ítem se calcula mediante la conversión: IV = 100%, III = 75%, II = 50%, I = 25%; el porcentaje de cada dimensión corresponde al promedio aritmético de sus ítems y el global corresponde al promedio de todos los ítems evaluados en la visita. Escala de valoración institucional: Logrado >= 85%, En proceso 70% – 84%, Por mejorar < 70%.';
  }

  const summarySections = [
    {
      title: 'Nota Metodológica',
      content: notaMetodologicaTextoV1
    }
  ];

  const safeName = sanitizeFilename(isAllMode ? 'general' : (fichaType ? (isDirectivoType ? 'Monitoreo_Directivo_IE' : fichaType.nombre) : 'reporte'));
  const filename = `Reporte_Consolidado_${safeName}_${getLimaDateStr()}.pdf`;

  const areaSigla = (downloadConfig.areaConfig && downloadConfig.areaConfig.sigla) ? downloadConfig.areaConfig.sigla : 'AGEBRE';
  const defaultSignatures = [
    { cargo: `Especialista Responsable de Monitoreo — ${areaSigla}`, entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: `Jefatura de ${areaSigla} — UGEL 03 – DRELM`, entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: `Consolidado Oficial de Monitoreo y Acompañamiento 2026 · UGEL 03 · ${filterSubtitle}`,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid: [],
    customTables,
    summarySections,
    signatures: downloadConfig.signatures || defaultSignatures,
    lugarFecha: downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`,
    sinFirmas: downloadConfig.sinFirmas || false,
    areaConfig: downloadConfig.areaConfig || null,
    incluirQr: downloadConfig.incluirQr !== false,
    datosIncompletos: downloadConfig.datosIncompletos || false,
    marcaBorrador: downloadConfig.marcaBorrador || false,
    filename
  });
}

/**
 * Función principal de exportación con soporte para Feature Flag de versión.
 * Por defecto ejecuta V2. Si downloadConfig.version === 1 o window.__REPORT_PDF_V1 === true, ejecuta V1.
 */
export async function exportConsolidadoReportPdf(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  const forceV1 = (downloadConfig && downloadConfig.version === 1) || (typeof window !== 'undefined' && window.__REPORT_PDF_V1 === true);
  if (forceV1) {
    return await exportConsolidadoReportPdfV1(statsList, fichaType, filters, isAllMode, downloadConfig);
  }
  return await exportConsolidadoReportPdfV2(statsList, fichaType, filters, isAllMode, downloadConfig);
}
