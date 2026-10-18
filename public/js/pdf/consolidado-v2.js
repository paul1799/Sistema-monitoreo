/* =========================================================================
   pdf/consolidado-v2.js — Generador oficial del Reporte Consolidado PDF V2
   UGEL 03 · AGEBRE
   ========================================================================= */

import {
  createOfficialPdfDocument,
  formatDate,
  getLimaDateStr,
  sanitizeFilename,
  plural
} from '../pdf-core.js';

import { SISTEMA_NOMBRE_OFICIAL } from './constants.js';
import { formatRei, drawPdfDonutChart } from './charts.js';

import {
  isFichaJec,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  isFichaEbrGestionEscolar,
  isFichaEbrEbePrite
} from '../calc/detectors.js';

import { ESPECIALISTA_JEC_OFICIAL } from '../calc/reglas.js';
import { isFichaCebeGestion, CEBE_SECCIONES } from '../cebe-gestion.js';
import { isFichaPriteGestion, PRITE_SECCIONES } from '../prite-gestion.js';
import { getEbrSeccionesForVisita } from '../ebr-gestion.js';
import { JEC_SECCIONES } from '../jec-monitoreo.js';
import { computeItemAgg } from '../reportes-datos.js';

/**
 * Exporta el Reporte Consolidado Oficial de Monitoreo (V2 - AGEBRE Oficial)
 * Estructura:
 * I.   Distribución de resultados (3 tarjetas KPI + Gráfico de dona + Tabla de distribución)
 * II.  Avance por sección / dimensión evaluada (Gráficas de progreso vectoriales + badges)
 * III. Matriz comparativa por institución y dimensión (con columna REI integrada)
 * Nota Metodológica completa + Firmas oficiales + Pie con código de verificación
 */
export async function exportConsolidadoReportPdfV2(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const isDirectivoType = fichaType && (fichaType.tipoRespuesta === 'nivel_1_4' || (fichaType.id || '').includes('directivo') || (fichaType.nombre || '').toLowerCase().includes('directivo'));

  const title = isAllMode
    ? 'REPORTE CONSOLIDADO GENERAL DE MONITOREO'
    : `REPORTE CONSOLIDADO — ${(fichaType ? fichaType.nombre.toUpperCase() : 'MONITOREO')}`;

  const totalFichas = statsList.length;
  const instCount = new Set(statsList.map(x => x.s.institucion || '').filter(Boolean)).size;
  const withPct = statsList.filter(x => x.st && x.st.pct !== null && x.st.pct !== undefined);
  const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : '—';

  // Subtítulo con filtros aplicados (sin redundancias)
  const filtrosAplicados = [];
  if (filters.institucion) filtrosAplicados.push(`I.E.: ${filters.institucion}`);
  if (filters.red) filtrosAplicados.push(`RED/REI: ${filters.red}`);
  if (filters.visita) filtrosAplicados.push(`Visita: V${filters.visita}`);
  if (filters.responsable) filtrosAplicados.push(`Responsable: ${filters.responsable}`);
  if (filters.distrito) filtrosAplicados.push(`Distrito: ${filters.distrito}`);
  if (filters.desde || filters.hasta) filtrosAplicados.push(`Período: ${filters.desde || 'inicio'} a ${filters.hasta || 'fin'}`);
  const filterSubtitle = filtrosAplicados.length ? `Filtros: ${filtrosAplicados.join(' · ')}` : 'Filtros: ninguno (todos los registros)';

  // Texto introductorio oficial con concordancia gramatical exacta y sin repetir filtros al final
  const fichaTxt = totalFichas === 1
    ? '1 ficha de monitoreo aplicada'
    : `${plural(totalFichas, 'ficha', 'fichas')} de monitoreo aplicadas`;
  const instTxt = instCount === 1
    ? '1 institución educativa'
    : `${plural(instCount, 'institución educativa', 'instituciones educativas')}`;

  const introParagraph = totalFichas > 0
    ? `El presente documento consolida la información de las visitas de monitoreo registradas en el ${SISTEMA_NOMBRE_OFICIAL} para el año lectivo 2026. Se reporta un total de ${fichaTxt} en ${instTxt}, con un nivel de cumplimiento promedio general del ${avgPct === '—' ? '—' : avgPct + '%'}.`
    : `El presente documento consolida la información de las visitas de monitoreo registradas en el ${SISTEMA_NOMBRE_OFICIAL} para el año lectivo 2026. No se registran visitas de monitoreo para los filtros seleccionados (${filterSubtitle}).`;

  // Escala oficial unificada (EBR Gestión Escolar / IPL / EBE / PRITE: Logrado >= 67%, Proceso >= 34%, Inicio < 34%)
  const isJec = isFichaJec(fichaType) || isFichaCoordTutoriaJec(fichaType) || isFichaCoordPedagogico(fichaType) || isFichaEspecialistaJec(fichaType);
  const isEbr = !isJec && (isFichaEbrGestionEscolar(fichaType)
    || isFichaEbrEbePrite(fichaType)
    || isFichaCebeGestion(fichaType)
    || isFichaPriteGestion(fichaType)
    || (fichaType?.escala === 'IPL')
    || (fichaType?.tipoRespuesta === 'ips')
    || (!fichaType && statsList.some(x => isFichaEbrGestionEscolar(x.s) || isFichaCebeGestion(x.s) || isFichaPriteGestion(x.s))));
  const logCut = isEbr ? 67 : 85;
  const procCut = isEbr ? 34 : 70;

  // 1. CÁLCULO DE DISTRIBUCIÓN DE RESULTADOS (FUENTE ÚNICA)
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    if (x.st.pct === null || x.st.pct === undefined) dist.none++;
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

  // ==========================================
  // SECCIÓN I: DISTRIBUCIÓN DE RESULTADOS (3 TARJETAS KPI + DONA + TABLA)
  // ==========================================
  customTables.push({
    title: 'I. DISTRIBUCIÓN DE RESULTADOS',
    subtitle: 'Categorización porcentual y numérica de las fichas de monitoreo según el nivel de logro alcanzado.',
    minHeight: 140,
    beforeDraw: (doc, curY, pageW, margin) => {
      const CONTENT_WIDTH = pageW - 2 * margin;

      // 1. TARJETAS KPI EN UNA FILA CON FRANJA INFERIOR DE COLOR
      const padron = downloadConfig.colegios || (downloadConfig.state && downloadConfig.state.colegios) || [];
      const isEbrSpecial = isFichaEbrGestionEscolar(fichaType);
      const isCebeSpecial = isFichaCebeGestion(fichaType);
      const isPriteSpecial = isFichaPriteGestion(fichaType);
      const targetMod = isEbrSpecial ? 'EBR' : (isPriteSpecial ? 'PRITE' : (isCebeSpecial ? 'CEBE' : null));

      let cardsData = [];
      if (targetMod && padron.length > 0) {
        const isModMatch = (c, mod) => {
          if (!c) return false;
          const m = String(c.modalidad || '').toUpperCase().trim();
          const ie = String(c.ie || c.nombre || '').toUpperCase();
          if (mod === 'EBR') {
            if (m === 'EBR' || m.includes('EBR') || m.includes('REGULAR')) return true;
            if (!m) {
              if (ie.includes('CEBE') || ie.includes('PRITE') || ie.includes('CEBA') || ie.includes('CETPRO')) return false;
              return true;
            }
            return false;
          }
          if (mod === 'PRITE') {
            if (m === 'PRITE' || m.includes('PRITE') || ie.includes('PRITE')) return true;
            return false;
          }
          if (mod === 'CEBE') {
            if (ie.includes('PRITE') || m.includes('PRITE')) return false;
            if (m === 'CEBE' || m.includes('CEBE') || m === 'EBE' || m.includes('EBE') || m.includes('ESPECIAL')) return true;
            if (ie.includes('CEBE') || ie.includes('ESPECIAL')) return true;
            return false;
          }
          if (mod === 'EBE') {
            if (m === 'EBE' || m.includes('EBE') || m.includes('ESPECIAL') || m.includes('CEBE') || m.includes('PRITE')) return true;
            if (ie.includes('CEBE') || ie.includes('PRITE') || ie.includes('ESPECIAL')) return true;
            return false;
          }
          return false;
        };

        let targetCols = padron.filter(c => isModMatch(c, targetMod));
        if (filters.red) {
          const qr = String(filters.red).toLowerCase();
          targetCols = targetCols.filter(c => String(c.rei || c.red || '').toLowerCase().includes(qr));
        }
        if (filters.distrito) {
          const qd = String(filters.distrito).toLowerCase();
          targetCols = targetCols.filter(c => String(c.distrito || '').toLowerCase().includes(qd));
        }

        const executedColIds = new Set();
        const executedExtra = new Set();
        const tById = new Map();
        const tByCode = new Map();
        const tByIe = new Map();
        targetCols.forEach(c => {
          if (c.id) tById.set(c.id, c);
          if (c.codigoLocal) tByCode.set(String(c.codigoLocal).trim().toLowerCase(), c);
          if (c.codigoModular) tByCode.set(String(c.codigoModular).trim().toLowerCase(), c);
          if (c.ie) tByIe.set(String(c.ie).trim().toLowerCase(), c);
        });

        statsList.forEach(x => {
          const s = x.s;
          let mCol = null;
          if (s.colegioId && tById.has(s.colegioId)) mCol = tById.get(s.colegioId);
          else if (s.codigoLocal && tByCode.has(String(s.codigoLocal).trim().toLowerCase())) mCol = tByCode.get(String(s.codigoLocal).trim().toLowerCase());
          else if (s.codigoModular && tByCode.has(String(s.codigoModular).trim().toLowerCase())) mCol = tByCode.get(String(s.codigoModular).trim().toLowerCase());
          else if (s.institucion && tByIe.has(String(s.institucion).trim().toLowerCase())) mCol = tByIe.get(String(s.institucion).trim().toLowerCase());

          if (mCol) executedColIds.add(mCol.id);
          else executedExtra.add(s.colegioId || (s.institucion ? s.institucion.trim().toLowerCase() : ''));
        });

        const numExec = executedColIds.size + executedExtra.size;
        const iesExec = Math.max(numExec, instCount);
        const totalIesMod = targetCols.length > 0 ? Math.max(targetCols.length, iesExec) : iesExec;
        const iesPend = Math.max(0, totalIesMod - iesExec);
        const cobPct = totalIesMod > 0 ? Math.round((iesExec / totalIesMod) * 100) : 0;

        cardsData = [
          { val: String(totalIesMod), lbl: `TOTAL IES ${targetMod}`, color: [30, 58, 138] },
          { val: `${iesExec} (${cobPct}%)`, lbl: 'IES EJECUTADAS', color: [22, 163, 74] },
          { val: String(iesPend), lbl: 'IES PENDIENTES', color: [217, 119, 6] },
          { val: String(totalFichas), lbl: 'FICHAS REGISTRADAS', color: [37, 99, 235] },
          { val: avgPct === '—' || avgPct === null ? '—' : `${avgPct}%`, lbl: 'CUMPLIMIENTO PROMEDIO', color: [234, 179, 8] }
        ];
      } else {
        cardsData = [
          { val: String(totalFichas), lbl: 'FICHAS REGISTRADAS', color: [37, 99, 235] },
          { val: String(instCount), lbl: 'INSTITUCIONES', color: [22, 163, 74] },
          { val: avgPct === '—' || avgPct === null ? '—' : `${avgPct}%`, lbl: 'CUMPLIMIENTO PROMEDIO', color: [217, 119, 6] }
        ];
      }

      const numCards = cardsData.length;
      const cardGap = isLandscape ? (numCards === 5 ? 8 : 14) : (numCards === 5 ? 6 : 10);
      const cardW = Math.floor((CONTENT_WIDTH - (numCards - 1) * cardGap) / numCards);
      const cardH = 42;

      cardsData.forEach((c, idx) => {
        const cX = margin + idx * (cardW + cardGap);
        const cY = curY;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.75);
        doc.roundedRect(cX, cY, cardW, cardH, 3.5, 3.5, 'FD');

        doc.setFillColor(c.color[0], c.color[1], c.color[2]);
        doc.roundedRect(cX, cY + cardH - 3.5, cardW, 3.5, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? (numCards === 5 ? 13 : 17) : (numCards === 5 ? 11 : 15));
        doc.setTextColor(15, 23, 42);
        doc.text(c.val, cX + (numCards === 5 ? 8 : 12), cY + 19);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? (numCards === 5 ? 5.8 : 6.8) : (numCards === 5 ? 5.2 : 6.8));
        doc.setTextColor(100, 116, 139);
        doc.text(c.lbl, cX + (numCards === 5 ? 8 : 12), cY + 31);
      });

      curY += cardH + 12;

      // 2. PANEL DE GRÁFICO DE DONA + LEYENDA (Sin hallazgos)
      const panelH = 135;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, curY, CONTENT_WIDTH, panelH, 4, 4, 'FD');

      // Título de la dona
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Distribución de resultados', margin + 14, curY + 15);

      // Gráfica de dona más grande para que no cubra el texto
      const donutCx = margin + CONTENT_WIDTH / 2 - 60;
      const donutCy = curY + 70;
      const donutOuterR = 56;
      const donutInnerR = 38;

      const donutSegments = [
        { val: dist.logrado, color: [22, 163, 74], label: 'Logrado' },
        { val: dist.proceso, color: [217, 119, 6], label: 'En proceso' },
        { val: dist.inicio, color: [220, 38, 38], label: 'Inicio' },
        ...(dist.none > 0 ? [{ val: dist.none, color: [148, 163, 184], label: 'Sin datos' }] : [])
      ];

      drawPdfDonutChart(doc, donutCx, donutCy, donutOuterR, donutInnerR, donutSegments, String(totalFichas), totalFichas === 1 ? 'ficha' : 'fichas');

      // Leyenda vertical
      const legX = donutCx + donutOuterR + 40;
      let legY = curY + 50;
      donutSegments.forEach(s => {
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.circle(legX + 5, legY - 3, 4, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text(`${s.label} (${s.val})`, legX + 14, legY);
        legY += 18;
      });

      return curY + panelH + 10;
    },
    tableHeaders: ['Nivel de Logro', 'Rango de Cumplimiento', 'Cantidad de Fichas', 'Porcentaje (%)', 'Interpretación Institucional'],
    tableRows: totalFichas > 0 ? [
      [
        { content: 'Logrado', styles: { textColor: [4, 120, 87], fontStyle: 'bold' } },
        `>= ${logCut}%`,
        String(dist.logrado),
        `${pctLogrado}%`,
        'Nivel óptimo; cumple satisfactoriamente los estándares evaluados'
      ],
      [
        { content: 'En proceso', styles: { textColor: [180, 83, 9], fontStyle: 'bold' } },
        `${procCut}% – ${logCut - 1}%`,
        String(dist.proceso),
        `${pctProceso}%`,
        'En desarrollo; requiere fortalecimiento de prácticas pedagógicas'
      ],
      [
        { content: 'Inicio / Por mejorar', styles: { textColor: [185, 28, 28], fontStyle: 'bold' } },
        `< ${procCut}%`,
        String(dist.inicio),
        `${pctInicio}%`,
        'Requiere asistencia técnica focalizada y acompañamiento prioritario'
      ],
      ...(dist.none > 0 ? [
        [
          { content: 'Sin datos', styles: { textColor: [100, 116, 139], fontStyle: 'bold' } },
          '—',
          String(dist.none),
          `${pctNone}%`,
          'Fichas registradas sin porcentaje de avance calculable'
        ]
      ] : []),
      [
        { content: 'TOTAL GENERAL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: '100%', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: String(totalFichas), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: '100%', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: 'Universo consolidado de monitoreo', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } }
      ]
    ] : [
      [{ content: 'No hay visitas de monitoreo registradas con los filtros seleccionados.', colSpan: 5, styles: { halign: 'center', textColor: [100, 116, 139] } }]
    ],
    columnStyles: isLandscape ? {
      0: { cellWidth: 140, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 130 },
      2: { halign: 'center', cellWidth: 90, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 80, fontStyle: 'bold' },
      4: { halign: 'left' }
    } : {
      0: { cellWidth: 110, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 90 },
      2: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 60, fontStyle: 'bold' },
      4: { halign: 'left' }
    }
  });

  // ==========================================
  // SECCIÓN II: AVANCE POR SECCIÓN / DIMENSIÓN EVALUADA
  // ==========================================
  const firstWithSec = statsList.find(x => x.st && x.st.secciones && x.st.secciones.length > 0);
  if (firstWithSec && !isAllMode) {
    const secAgg = {};
    firstWithSec.st.secciones.forEach(s => {
      secAgg[s.nombre] = { nombre: s.nombre, total: s.total || 0, sum: 0, cnt: 0, logrado: 0, proceso: 0, inicio: 0 };
    });

    statsList.forEach(x => {
      (x.st?.secciones || []).forEach(s => {
        if (!secAgg[s.nombre]) {
          secAgg[s.nombre] = { nombre: s.nombre, total: s.total || 0, sum: 0, cnt: 0, logrado: 0, proceso: 0, inicio: 0 };
        }
        const a = secAgg[s.nombre];
        if (s.pct !== null && s.pct !== undefined) {
          a.sum += s.pct;
          a.cnt++;
          if (s.pct >= logCut) a.logrado++;
          else if (s.pct >= procCut) a.proceso++;
          else a.inicio++;
        }
      });
    });

    const secRows = Object.values(secAgg).map((a, idx) => {
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      let statusLabel = 'Sin datos';
      if (avg !== null) {
        if (avg >= logCut) {
          statusLabel = 'Logrado';
        } else if (avg >= procCut) {
          statusLabel = 'En proceso';
        } else {
          statusLabel = 'Por mejorar';
        }
      }
      return [
        String(idx + 1),
        a.nombre,
        avg !== null ? `${avg}%` : '—',
        { content: '', pct: avg, raw: { pct: avg } },
        `L: ${a.logrado}  ·  P: ${a.proceso}  ·  I: ${a.inicio}`
      ];
    });

    customTables.push({
      title: 'II. AVANCE POR SECCIÓN / DIMENSIÓN EVALUADA',
      subtitle: `Promedio de cumplimiento y distribución de estados por dimensión. Leyenda: Logrado (>= ${logCut}%), Proceso (${procCut}%–${logCut - 1}%), ${isEbr ? 'Inicio' : 'Por mejorar'} (< ${procCut}%).`,
      minHeight: 145,
      beforeDraw: (doc, curY, pageW, margin) => {
        const legY = curY + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Leyenda:', margin, legY);

        let lx = margin + 46;
        const legendItems = [
          { label: `Logrado (>= ${logCut}%): Cumplido`, color: [22, 163, 74] },
          { label: `Proceso (${procCut}%–${logCut - 1}%): En proceso`, color: [217, 119, 6] },
          { label: isEbr ? `Inicio (< ${procCut}%): Nivel inicio` : `Inicio (< ${procCut}%): Por mejorar`, color: [220, 38, 38] }
        ];
        legendItems.forEach(it => {
          doc.setFillColor(it.color[0], it.color[1], it.color[2]);
          doc.circle(lx + 3, legY - 2.5, 2.5, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(51, 65, 85);
          doc.text(it.label, lx + 8, legY);
          lx += doc.getTextWidth(it.label) + 16;
        });
        return curY + 12;
      },
      tableHeaders: ['N.°', 'Dimensión / Aspecto Evaluado', '% Cumpl.', 'Gráfica de Avance', 'Distribución (L / P / I)'],
      tableRows: secRows.length > 0 ? secRows : [
        [{ content: 'Sin dimensiones registradas para esta ficha', colSpan: 5, styles: { halign: 'center', textColor: [100, 116, 139] } }]
      ],
      columnStyles: isLandscape ? {
        0: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 70, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 230 },
        4: { halign: 'center', cellWidth: 120, fontStyle: 'bold' }
      } : {
        0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 50, fontStyle: 'bold' },
        3: { halign: 'center', cellWidth: 140 },
        4: { halign: 'center', cellWidth: 90, fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const doc = data.doc;
          if (!doc) return;
          const rawObj = data.cell.raw;
          let pct = null;
          if (typeof rawObj === 'number') {
            pct = rawObj;
          } else if (rawObj && typeof rawObj === 'object') {
            if (rawObj.pct !== undefined) pct = rawObj.pct;
            else if (rawObj.raw && rawObj.raw.pct !== undefined) pct = rawObj.raw.pct;
          }
          if (pct !== null && !isNaN(pct)) {
            const trackX = data.cell.x + 6;
            const trackY = data.cell.y + (data.cell.height - 8) / 2;
            const trackW = data.cell.width - 12;
            const trackH = 8;
            doc.setFillColor(229, 231, 235);
            doc.roundedRect(trackX, trackY, trackW, trackH, 2.5, 2.5, 'F');
            const fillW = Math.max(3, trackW * (Math.min(Math.max(pct, 0), 100) / 100));
            if (pct >= logCut) doc.setFillColor(22, 163, 74);
            else if (pct >= procCut) doc.setFillColor(217, 119, 6);
            else doc.setFillColor(220, 38, 38);
            doc.roundedRect(trackX, trackY, fillW, trackH, 2.5, 2.5, 'F');
          }
        }
      }
    });
  } else if (isAllMode) {
    const typeAgg = {};
    statsList.forEach(x => {
      const tid = x.s.fichaTypeId;
      if (!typeAgg[tid]) {
        typeAgg[tid] = { nombre: x.s.fichaTypeNombre || 'Ficha', total: 0, sum: 0, cnt: 0, logrado: 0, proceso: 0, inicio: 0 };
      }
      const a = typeAgg[tid];
      a.total++;
      if (x.st.pct !== null && x.st.pct !== undefined) { a.sum += x.st.pct; a.cnt++; }
      if (x.st.pct >= 85) a.logrado++;
      else if (x.st.pct >= 70) a.proceso++;
      else if (x.st.pct !== null && x.st.pct !== undefined) a.inicio++;
    });

    const typeRows = Object.values(typeAgg).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((a, idx) => {
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      return [
        String(idx + 1),
        a.nombre,
        String(a.total),
        avg !== null ? `${avg}%` : '—',
        { content: '', pct: avg, raw: { pct: avg } },
        `L: ${a.logrado}  ·  P: ${a.proceso}  ·  I: ${a.inicio}`
      ];
    });

    customTables.push({
      title: 'II. AVANCE GENERAL POR TIPO DE FICHA',
      subtitle: 'Promedio de cumplimiento y distribución de estados comparativos por cada tipo de ficha registrada.',
      minHeight: 145,
      beforeDraw: (doc, curY, pageW, margin) => {
        const legY = curY + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Leyenda:', margin, legY);

        let lx = margin + 46;
        const legendItems = [
          { label: 'Logrado (>= 85%): Cumplido', color: [22, 163, 74] },
          { label: 'Proceso (70%–84%): En proceso', color: [217, 119, 6] },
          { label: 'Inicio (< 70%): Por mejorar', color: [220, 38, 38] }
        ];
        legendItems.forEach(it => {
          doc.setFillColor(it.color[0], it.color[1], it.color[2]);
          doc.circle(lx + 3, legY - 2.5, 2.5, 'F');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(51, 65, 85);
          doc.text(it.label, lx + 8, legY);
          lx += doc.getTextWidth(it.label) + 16;
        });
        return curY + 12;
      },
      tableHeaders: ['N.°', 'Tipo de Ficha de Monitoreo', 'Fichas Registradas', '% Cumpl.', 'Gráfica de Avance', 'Distribución (L / P / I)'],
      tableRows: typeRows.length > 0 ? typeRows : [
        [{ content: 'Sin registros para los filtros seleccionados', colSpan: 6, styles: { halign: 'center', textColor: [100, 116, 139] } }]
      ],
      columnStyles: isLandscape ? {
        0: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 80 },
        3: { halign: 'center', cellWidth: 70, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 210 },
        5: { halign: 'center', cellWidth: 110, fontStyle: 'bold' }
      } : {
        0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 55 },
        3: { halign: 'center', cellWidth: 48, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 130 },
        5: { halign: 'center', cellWidth: 77, fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const doc = data.doc;
          if (!doc) return;
          const rawObj = data.cell.raw;
          let pct = null;
          if (typeof rawObj === 'number') {
            pct = rawObj;
          } else if (rawObj && typeof rawObj === 'object') {
            if (rawObj.pct !== undefined) pct = rawObj.pct;
            else if (rawObj.raw && rawObj.raw.pct !== undefined) pct = rawObj.raw.pct;
          }
          if (pct !== null && !isNaN(pct)) {
            const trackX = data.cell.x + 6;
            const trackY = data.cell.y + (data.cell.height - 8) / 2;
            const trackW = data.cell.width - 12;
            const trackH = 8;
            doc.setFillColor(229, 231, 235);
            doc.roundedRect(trackX, trackY, trackW, trackH, 2.5, 2.5, 'F');
            const fillW = Math.max(3, trackW * (Math.min(Math.max(pct, 0), 100) / 100));
            if (pct >= 85) doc.setFillColor(22, 163, 74);
            else if (pct >= 70) doc.setFillColor(217, 119, 6);
            else doc.setFillColor(220, 38, 38);
            doc.roundedRect(trackX, trackY, fillW, trackH, 2.5, 2.5, 'F');
          }
        }
      }
    });
  }

  // ==========================================
  // SECCIÓN III: MATRIZ COMPARATIVA POR INSTITUCIÓN Y DIMENSIÓN + COLUMNA REI
  // (Dinámica con nombres reales de secciones, soporte multi-tipo y visita condicional)
  // ==========================================
  if (totalFichas >= 1 && downloadConfig.incluirMatriz !== false) {
    const typeGroups = {};
    if (isAllMode) {
      statsList.forEach(x => {
        const tid = x.s.fichaTypeId || 'sin_tipo';
        if (!typeGroups[tid]) typeGroups[tid] = [];
        typeGroups[tid].push(x);
      });
    } else {
      typeGroups[fichaType?.id || 'tipo_actual'] = statsList;
    }

    const typeGroupEntries = Object.entries(typeGroups);
    typeGroupEntries.forEach(([tid, groupStats], gIdx) => {
      let groupFt = fichaType;
      if (isAllMode) {
        if (typeof downloadConfig.getFichaType === 'function') {
          groupFt = downloadConfig.getFichaType(tid);
        } else if (Array.isArray(downloadConfig.fichaTypes)) {
          groupFt = downloadConfig.fichaTypes.find(f => f.id === tid);
        }
        if (!groupFt) {
          groupFt = {
            id: tid,
            nombre: groupStats[0]?.s?.fichaTypeNombre || 'Monitoreo',
            secciones: []
          };
        }
      }

      const groupIsJec = isFichaJec(groupFt) || isFichaCoordTutoriaJec(groupFt) || isFichaCoordPedagogico(groupFt) || isFichaEspecialistaJec(groupFt);
      let groupIsEbr = !groupIsJec && (isFichaEbrGestionEscolar(groupFt)
        || isFichaEbrEbePrite(groupFt)
        || isFichaCebeGestion(groupFt)
        || isFichaPriteGestion(groupFt)
        || (groupFt?.escala === 'IPL')
        || (groupFt?.tipoRespuesta === 'ips')
        || groupStats.some(x => isFichaEbrGestionEscolar(x.s) || isFichaCebeGestion(x.s) || isFichaPriteGestion(x.s)));

      let seccionesParaAgg = (groupFt?.secciones && groupFt.secciones.length > 0)
        ? groupFt.secciones
        : [];
      if (isFichaCebeGestion(groupFt)) {
        const isOfficialCebe = (groupFt.secciones?.length === 7 && groupFt.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 34);
        seccionesParaAgg = isOfficialCebe ? groupFt.secciones : CEBE_SECCIONES;
      } else if (isFichaPriteGestion(groupFt)) {
        const isOfficialPrite = (groupFt.secciones?.length === 7 && groupFt.secciones.reduce((acc, s) => acc + (s.items?.length || 0), 0) === 32);
        seccionesParaAgg = isOfficialPrite ? groupFt.secciones : PRITE_SECCIONES;
      } else if (isFichaEbrGestionEscolar(groupFt)) {
        const hasV3 = groupStats.some(x => Number(x.s.visita) === 3);
        const hasV2 = groupStats.some(x => Number(x.s.visita) === 2);
        const vTarget = hasV3 ? 3 : (hasV2 ? 2 : 1);
        seccionesParaAgg = getEbrSeccionesForVisita(vTarget, groupFt);
      } else if (isFichaJec(groupFt)) {
        seccionesParaAgg = (groupFt?.secciones && groupFt.secciones.length === JEC_SECCIONES.length) ? groupFt.secciones : JEC_SECCIONES;
      }

      if (seccionesParaAgg.length === 0 && groupStats[0]?.st?.secciones) {
        seccionesParaAgg = groupStats[0].st.secciones.map(sc => ({ nombre: sc.nombre, items: [] }));
      }

      if (seccionesParaAgg.length > 0) {
        // R3: Nombres reales de dimensiones con salto de línea y número de indicadores
        const secHeaders = seccionesParaAgg.map(s => {
          let count = s.items ? s.items.length : 0;
          if (count === 0 && groupStats[0]?.st?.secciones) {
            const sc = groupStats[0].st.secciones.find(x => x.nombre === s.nombre);
            if (sc && sc.total) count = sc.total;
          }
          return count > 0 ? `${s.nombre}\n(${count} ind.)` : s.nombre;
        });

        // R3: Ocultar columna Visita si el filtro es una visita única (ej: V1 o V2)
        const uniqueVisitas = new Set(groupStats.map(x => String(x.s?.visita || '').trim()).filter(Boolean));
        const isSingleVisitFilter = Boolean(filters.visita) && (String(filters.visita) === '1' || String(filters.visita) === '2');
        const showVisitaCol = !isSingleVisitFilter && uniqueVisitas.size > 1;

        const matrizHeaders = ['N.°', 'Institución Educativa', 'REI', ...(showVisitaCol ? ['Visita'] : []), ...secHeaders, 'Global', 'Estado'];

        // R3: Ordenar de menor a mayor cumplimiento global; desempate alfabético por I.E.
        const sortedStats = [...statsList].sort((a, b) => {
          const diff = (a.st.pct ?? 0) - (b.st.pct ?? 0);
          if (diff !== 0) return diff;
          return (a.s?.institucion || '').localeCompare(b.s?.institucion || '');
        }).filter(x => groupStats.includes(x));

        const gLogCut = groupIsEbr ? 67 : 85;
        const gProcCut = groupIsEbr ? 34 : 70;

        const normKey = (s) => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        const matrizRows = sortedStats.map((x, idx) => {
          const s = x.s;
          const st = x.st;
          const secMap = {};
          const normSecMap = new Map();
          (st.secciones || []).forEach(sc => {
            secMap[sc.nombre] = sc.pct;
            normSecMap.set(normKey(sc.nombre), sc.pct);
          });

          const secCells = seccionesParaAgg.map(sec => {
            let p = secMap[sec.nombre];
            if (p === undefined) p = normSecMap.get(normKey(sec.nombre));
            if (p === undefined || p === null) return '—';
            let bg = [255, 255, 255];
            let col = [15, 27, 45];
            if (p >= gLogCut) { bg = [236, 253, 245]; col = [4, 120, 87]; }
            else if (p >= gProcCut) { bg = [254, 243, 199]; col = [180, 83, 9]; }
            else { bg = [254, 226, 226]; col = [185, 28, 28]; }
            return { content: `${p}%`, styles: { halign: 'center', fillColor: bg, textColor: col, fontStyle: 'bold' } };
          });

          const globPct = st.pct !== null && st.pct !== undefined ? `${st.pct}%` : '—';
          const globStatus = st.pct === null || st.pct === undefined ? 'Sin datos' : (st.pct >= gLogCut ? 'Logrado' : (st.pct >= gProcCut ? 'En proceso' : (groupIsEbr ? 'Inicio' : 'Por mejorar')));
          const statusCol = st.pct >= gLogCut ? [4, 120, 87] : (st.pct >= gProcCut ? [180, 83, 9] : [185, 28, 28]);
          const statusBg = st.pct >= gLogCut ? [236, 253, 245] : (st.pct >= gProcCut ? [254, 243, 199] : [254, 226, 226]);

          return [
            String(idx + 1),
            s.institucion || '—',
            formatRei(s.red),
            ...(showVisitaCol ? [s.visita ? `V${s.visita}` : '—'] : []),
            ...secCells,
            { content: globPct, styles: { halign: 'center', fontStyle: 'bold', textColor: statusCol } },
            { content: globStatus, styles: { halign: 'center', fontStyle: 'bold', fillColor: statusBg, textColor: statusCol } }
          ];
        });

        const numDims = seccionesParaAgg.length;
        const availableDimsWidth = isLandscape
          ? (showVisitaCol ? 350 : 386)
          : (showVisitaCol ? 190 : 218);
        const dimColW = Math.max(38, Math.floor(availableDimsWidth / numDims));

        const colStyles = {
          0: { halign: 'center', cellWidth: isLandscape ? 24 : 18 },
          1: { halign: 'left', valign: 'middle' },
          2: { halign: 'center', cellWidth: isLandscape ? 48 : 36, fontStyle: 'bold' },
        };
        let cOffset = 3;
        if (showVisitaCol) {
          colStyles[cOffset] = { halign: 'center', cellWidth: isLandscape ? 36 : 28 };
          cOffset++;
        }
        seccionesParaAgg.forEach((_, sIdx) => {
          colStyles[cOffset + sIdx] = { halign: 'center', cellWidth: dimColW, fontSize: numDims > 5 ? 6.2 : 6.8 };
        });
        colStyles[cOffset + numDims] = { halign: 'center', cellWidth: isLandscape ? 50 : 36, fontStyle: 'bold' };
        colStyles[cOffset + numDims + 1] = { halign: 'center', cellWidth: isLandscape ? 70 : 60, fontStyle: 'bold' };

        const matrizTable = {
          title: 'III. MATRIZ COMPARATIVA POR INSTITUCIÓN Y DIMENSIÓN',
          subtitle: 'Desempeño desagregado por institución educativa y dimensión evaluada (ordenado de menor a mayor cumplimiento global).',
          minHeight: 90,
          showHead: 'everyPage',
          tableHeaders: matrizHeaders,
          tableRows: matrizRows,
          styles: { fontSize: 7, cellPadding: { top: 3.5, right: 3, bottom: 3.5, left: 3 }, valign: 'middle' },
          headStyles: { fontSize: numDims > 5 ? 6.5 : 7.2 },
          columnStyles: colStyles
        };
        if (typeGroupEntries.length > 1) {
          matrizTable.title = `III.${gIdx + 1}. MATRIZ COMPARATIVA — ${(groupFt?.nombre || 'MONITOREO').toUpperCase()}`;
        }
        customTables.push(matrizTable);
      }
    });
  }

  // ==========================================
  // SECCIÓN IV: REPORTE POR ÍTEM — CONSOLIDADO DE INDICADORES (CONDICIONAL)
  // ==========================================
  const incluirReporteItem = Boolean(downloadConfig.incluirReporteItem || downloadConfig.incluir_items);
  if (incluirReporteItem && statsList.length > 0 && fichaType) {
    const subsList = statsList.map(x => x.s);
    const aggSections = computeItemAgg(subsList, fichaType);

    if (aggSections && aggSections.length > 0) {
      customTables.push({
        title: 'IV. REPORTE POR ÍTEM — CONSOLIDADO DE INDICADORES',
        subtitle: `Detalle consolidado de cada indicador evaluado (n = ${totalFichas} fichas de monitoreo procesadas).`,
        minHeight: 80,
        pageBreak: 'before',
        beforeDraw: (doc, curY, pageW, margin) => {
          const legY = curY + 2;
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
          doc.text('Leyenda:', margin, legY);

          let lx = margin + 46;
          const legendPills = [
            { label: 'Logrado: Cumplido', color: [22, 163, 74] },
            { label: 'Proceso: En proceso', color: [217, 119, 6] },
            { label: isEbr ? 'Inicio: Nivel inicio' : 'Inicio: Por mejorar', color: [220, 38, 38] },
            { label: 'N/A: No aplica', color: [148, 163, 184] }
          ];
          legendPills.forEach(it => {
            doc.setFillColor(it.color[0], it.color[1], it.color[2]);
            doc.circle(lx + 3, legY - 2.5, 2.5, 'F');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(51, 65, 85);
            doc.text(it.label, lx + 8, legY);
            lx += doc.getTextWidth(it.label) + 16;
          });
          return curY + 12;
        }
      });

      aggSections.forEach((sec) => {
        const secCut = isEbr ? 67 : 85;
        const secProcCut = isEbr ? 34 : 70;
        let secStatus = 'Sin datos';
        let secBg = [243, 244, 246];
        let secCol = [107, 114, 128];
        if (sec.avg !== null) {
          if (sec.avg >= secCut) { secStatus = 'Logrado'; secBg = [236, 253, 245]; secCol = [4, 120, 87]; }
          else if (sec.avg >= secProcCut) { secStatus = 'En proceso'; secBg = [254, 243, 199]; secCol = [180, 83, 9]; }
          else { secStatus = isEbr ? 'Inicio' : 'Por mejorar'; secBg = [254, 226, 226]; secCol = [185, 28, 28]; }
        }

        const secBannerTitle = `${sec.nombre} (${sec.items.length} indicadores)`;
        const secSubtitle = `Cumplimiento de la sección: ${sec.avg !== null ? sec.avg + '%' : '—'}  ·  Nivel: ${secStatus}`;

        const itemRows = sec.items.map((it, iIdx) => {
          let itemStatus = 'Sin datos';
          let itemBg = [243, 244, 246];
          let itemCol = [107, 114, 128];
          if (it.pct !== null) {
            if (it.pct >= secCut) { itemStatus = 'Logrado'; itemBg = [236, 253, 245]; itemCol = [4, 120, 87]; }
            else if (it.pct >= secProcCut) { itemStatus = 'En proceso'; itemBg = [254, 243, 199]; itemCol = [180, 83, 9]; }
            else { itemStatus = isEbr ? 'Inicio' : 'Por mejorar'; itemBg = [254, 226, 226]; itemCol = [185, 28, 28]; }
          }

          // R4: Distribución: conteo por nivel con su color. Omitir los niveles con 0.
          const distParts = [];
          if (it.counts.logrado) distParts.push(`Logrado: ${it.counts.logrado}`);
          if (it.counts.proceso) distParts.push(`Proceso: ${it.counts.proceso}`);
          if (it.counts.inicio) distParts.push(`Inicio: ${it.counts.inicio}`);
          if (it.counts.na || it.counts.nc) distParts.push(`N/A: ${(it.counts.na || 0) + (it.counts.nc || 0)}`);
          if (it.counts.si) distParts.push(`Sí: ${it.counts.si}`);
          if (it.counts.no) distParts.push(`No: ${it.counts.no}`);

          const desc = it.texto || it.id || `Ítem ${iIdx + 1}`;
          return [
            String(it.num || (iIdx + 1)),
            desc,
            String(it.totalResp || 0),
            it.pct !== null ? `${it.pct}%` : '—',
            { content: '', pct: it.pct, raw: { pct: it.pct } },
            distParts.join('  ·  ') || 'Sin respuestas'
          ];
        });

        customTables.push({
          title: secBannerTitle,
          subtitle: secSubtitle,
          minHeight: 110,
          tableHeaders: ['N.°', 'Indicador', 'Fichas', '% Cumpl.', 'Gráfica de Avance', 'Distribución de Respuestas'],
          tableRows: itemRows,
          columnStyles: isLandscape ? {
            0: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 55 },
            3: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
            4: { halign: 'center', cellWidth: 170 },
            5: { halign: 'center', cellWidth: 155, fontSize: 6.8 }
          } : {
            0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 42 },
            3: { halign: 'center', cellWidth: 50, fontStyle: 'bold' },
            4: { halign: 'center', cellWidth: 110 },
            5: { halign: 'center', cellWidth: 110, fontSize: 6.5 }
          },
          didDrawCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              const doc = data.doc;
              if (!doc) return;
              const rawObj = data.cell.raw;
              let pct = null;
              if (typeof rawObj === 'number') {
                pct = rawObj;
              } else if (rawObj && typeof rawObj === 'object') {
                if (rawObj.pct !== undefined) pct = rawObj.pct;
                else if (rawObj.raw && rawObj.raw.pct !== undefined) pct = rawObj.raw.pct;
              }
              if (pct !== null && !isNaN(pct)) {
                const trackX = data.cell.x + 6;
                const trackY = data.cell.y + (data.cell.height - 8) / 2;
                const trackW = data.cell.width - 12;
                const trackH = 8;
                doc.setFillColor(229, 231, 235);
                doc.roundedRect(trackX, trackY, trackW, trackH, 2.5, 2.5, 'F');
                const fillW = Math.max(3, trackW * (Math.min(Math.max(pct, 0), 100) / 100));
                if (pct >= secCut) doc.setFillColor(22, 163, 74);
                else if (pct >= secProcCut) doc.setFillColor(217, 119, 6);
                else doc.setFillColor(220, 38, 38);
                doc.roundedRect(trackX, trackY, fillW, trackH, 2.5, 2.5, 'F');
              }
            }
          }
        });
      });
    }
  }

  // ==========================================
  // NOTA METODOLÓGICA (FUENTE ÚNICA)
  // ==========================================
  let notaMetodologicaTexto = '';
  if (isJec) {
    notaMetodologicaTexto = 'El cumplimiento de la Ficha de Monitoreo JEC se determina según la regla oficial MINEDU/UGEL 03: Implementación lograda (>= 24 sí), Implementación parcial (12–23 sí), Implementación incipiente (< 12 sí). Se evalúan 31 indicadores de cumplimiento directo Sí/No.';
  } else if (isEbr) {
    notaMetodologicaTexto = 'El cumplimiento se determina según el criterio unificado UGEL 03 (EBR / EBE / PRITE): Logrado (67%–100%), En proceso (34%–66%), Inicio (0%–33%). Cada indicador aplicable se evalúa según la escala establecida, excluyendo del cálculo los indicadores con No Aplica (N/A).';
  } else {
    notaMetodologicaTexto = 'El cumplimiento de cada ítem se calcula mediante la conversión: IV = 100%, III = 75%, II = 50%, I = 25%; el porcentaje de cada dimensión corresponde al promedio aritmético de sus ítems y el global corresponde al promedio de todos los ítems evaluados en la visita. Escala de valoración institucional: Logrado >= 85%, En proceso 70% – 84%, Por mejorar < 70%.';
  }

  const summarySections = [
    {
      title: 'Nota Metodológica',
      content: notaMetodologicaTexto
    }
  ];

  // Validación estricta de visita única para EBR Gestión Escolar (Regla 8.2)
  if (isFichaEbrGestionEscolar(fichaType)) {
    const v = Number(filters.visita);
    if (v !== 1 && v !== 2) {
      const err = new Error('Error 400: Para generar el reporte oficial PDF de Gestión Escolar EBR debes elegir Visita 1 o Visita 2. Cada visita tiene indicadores distintos y se descarga por separado.');
      err.status = 400;
      throw err;
    }
  }

  const safeName = sanitizeFilename(isAllMode ? 'general' : (fichaType ? (isDirectivoType ? 'Monitoreo_Directivo_IE' : fichaType.nombre) : 'reporte'));
  const visitaTag = filters.visita ? `_V${filters.visita}` : '';
  const itemsTag = incluirReporteItem ? '_con_items' : '';
  let filename = `Reporte_Consolidado_${safeName}${visitaTag}_${getLimaDateStr()}${itemsTag}.pdf`;

  let officialTitle = title;
  let officialSubtitle = `Consolidado Oficial de Monitoreo y Acompañamiento 2026 · UGEL 03 · ${filterSubtitle}`;

  if (isFichaEbrGestionEscolar(fichaType)) {
    const v = Number(filters.visita) || 1;
    const momRomano = v === 2 ? 'II' : 'I';
    const momNombre = v === 2 ? 'Visita 2 · Segundo momento' : 'Visita 1 · Primer momento';
    const fechaLimaStr = getLimaDateStr().replace(/-/g, '');
    filename = `REPORTE_MONITOREO_GESTION_EBR_${momRomano}_MOMENTO_${fechaLimaStr}.pdf`;
    officialTitle = `REPORTE OFICIAL DE MONITOREO Y ASISTENCIA TÉCNICA A LA GESTIÓN ESCOLAR — ${momNombre.toUpperCase()}`;
    officialSubtitle = `${momNombre} · UGEL 03 · AGEBRE · ${filterSubtitle}`;
  }

  // Bloque de firmas oficial dinámico
  const areaSigla = (downloadConfig.areaConfig && downloadConfig.areaConfig.sigla) ? downloadConfig.areaConfig.sigla : 'AGEBRE';
  const isJecReport = isFichaEspecialistaJec(fichaType);
  const defaultSignatures = [
    {
      cargo: isJecReport ? 'Especialista Responsable de JEC — UGEL 03' : `Especialista Responsable de Monitoreo — ${areaSigla}`,
      nombre: isJecReport ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : '',
      entidad: 'UGEL 03 – DRELM',
      leyenda: 'Firma y Sello'
    },
    { cargo: `Jefatura de ${areaSigla} — UGEL 03 – DRELM`, entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
  ];

  await createOfficialPdfDocument({
    title: officialTitle,
    subtitle: officialSubtitle,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    soloEncabezadoPagina1: true,
    metaGrid: [], // Se renderiza dentro de Sección I con las 3 tarjetas KPI estilizadas
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
