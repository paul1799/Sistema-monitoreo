/* =========================================================================
   pdf/ficha-individual.js — Generador oficial de PDF para Fichas Individuales
   de Monitoreo (Directivo, Coordinador de Tutoría JEC, Coordinador Pedagógico, etc.)
   UGEL 03 · AGEBRE
   ========================================================================= */

import {
  createOfficialPdfDocument,
  formatDate,
  getLimaDateStr,
  sanitizeFilename,
  drawVectorCheckmark,
  drawVectorCheckbox,
  formatPersonName,
  resolveDirectorData
} from '../pdf-core.js';

import {
  OFFICIAL_DIRECTIVO_ITEMS,
  OFFICIAL_DIRECTIVO_DIMENSIONS
} from './constants.js';

import { exportEbrGestionFichaPdf } from './ficha-ebr.js';
import { exportJecFichaPdf } from './ficha-jec.js';

import {
  isFichaEbrGestionEscolar,
  isFichaJec,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec
} from '../calc/detectors.js';

import {
  ESPECIALISTA_JEC_OFICIAL,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  REGLA_NIVEL_COORD_PEDAGOGICO
} from '../calc/reglas.js';

import {
  getNivelCoordTutoriaJec,
  getNivelCoordPedagogicoJec
} from '../calc/evaluador.js';

import { calcScore } from '../calc/score-engine.js';

/**
 * Exporta una Ficha de Monitoreo Individual a PDF en orientación VERTICAL (Portrait)
 */
export async function exportFichaIndividualPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  if (isFichaEbrGestionEscolar(fichaType)) {
    return await exportEbrGestionFichaPdf(sub, fichaType, colegio, downloadConfig);
  }

  if (isFichaJec(fichaType)) {
    return await exportJecFichaPdf(sub, fichaType, colegio, downloadConfig);
  }

  const rawTypeName = (fichaType.nombre || 'EVALUACIÓN').trim();
  const isNivel14 = fichaType.tipoRespuesta === 'nivel_1_4' || (fichaType.id || '').includes('directivo') || rawTypeName.toLowerCase().includes('directivo');

  // F5: Título limpio sin duplicaciones
  const title = /^ficha\s+de\s+monitoreo/i.test(rawTypeName)
    ? rawTypeName.toUpperCase()
    : `FICHA DE MONITOREO — ${rawTypeName.toUpperCase()}`;

  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const numVisita = sub.visita ? `Visita N.° ${sub.visita}` : 'Visita única';
  const isJecFicha = isFichaEspecialistaJec(fichaType) || isFichaEspecialistaJec(sub);
  const responsable = isJecFicha
    ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos
    : ((sub.responsable && !/^\d+$/.test(String(sub.responsable).trim()) && !sub.responsable.includes('@')) ? sub.responsable : 'Especialista UGEL 03');
  const dirData = resolveDirectorData(sub, colegio);
  const director = dirData.nombre;
  const ugel = sub.ugel || 'UGEL 03';
  const red = sub.red || (colegio ? colegio.rei : '—');

  // Párrafo introductorio oficial (opcional, activo por defecto)
  let introParagraph = '';
  if (downloadConfig.incluirIntro !== false) {
    introParagraph = `En la ciudad de Lima, con fecha ${fechaVisita}, se procedió a realizar la jornada de monitoreo y acompañamiento institucional correspondiente a la ${numVisita} en la institución educativa ${ieName}, perteneciente a la ${ugel} y ${red ? 'RED/REI ' + red : 'jurisdicción asignada'}, a cargo del especialista ${responsable}, con la presencia y coordinación de la dirección escolar a cargo de ${director}. A continuación, se detallan los resultados obtenidos y los compromisos asumidos.`;
  }

  // Extraer valores adicionales de cabecera si están guardados en sub.extras
  const subExtras = sub.extras || [];
  const getExtraVal = (pattern) => {
    const found = subExtras.find(x => x && x.label && x.label.toLowerCase().includes(pattern.toLowerCase()));
    return found ? found.value : '';
  };

  const directorDni = (dirData.dni && dirData.dni !== '—') ? dirData.dni : (sub.directorDni || getExtraVal('dni del directivo') || (colegio && colegio.director ? (colegio.director.dni || '') : '') || '');
  const monitorDni = sub.monitorDni || getExtraVal('dni del monitor') || '';
  const condicion = (dirData.condicion && dirData.condicion !== '—') ? dirData.condicion : (sub.condicion || getExtraVal('condición') || getExtraVal('condicion') || (colegio ? colegio.tipoGestion : '') || '');
  const nivelAtencion = sub.nivelAtencion || getExtraVal('nivel educativo') || (colegio ? (colegio.nivelServicio || colegio.modalidad) : '') || '';
  const turnoAtencion = sub.turnoAtencion || getExtraVal('turno de atención') || getExtraVal('turno de atencion') || (colegio ? colegio.turnos : '') || '';
  const turnoVisitado = sub.turnoVisitado || getExtraVal('turno visitado') || '';
  const horaInicio = sub.horaInicio || getExtraVal('hora de inicio') || '';
  const horaTermino = sub.horaTermino || getExtraVal('hora de término') || getExtraVal('hora de termino') || '';
  const horarioStr = (horaInicio && horaTermino) ? `${horaInicio} – ${horaTermino}` : (horaInicio || horaTermino || '—');
  const codLocal = sub.codigoModular || (colegio ? (colegio.codigoLocal || colegio.codigoModular) : '') || '';

  const isCoordTutoria = isFichaCoordTutoriaJec(fichaType);
  const isCoordPedagogico = isFichaCoordPedagogico(fichaType);
  let tutoriaPts = sub.puntaje;
  let tutoriaNivel = sub.nivel_cumplimiento;
  let tutoriaDesc = sub.descripcion_cumplimiento;
  let tutoriaPct = null;

  if (isCoordTutoria) {
    if (tutoriaPts === undefined || tutoriaPts === null || !tutoriaNivel) {
      const stats = calcScore(sub.respuestas || [], { ...fichaType, regla_nivel: fichaType.regla_nivel || REGLA_NIVEL_COORD_TUTORIA_JEC });
      tutoriaPts = stats.puntaje;
      tutoriaNivel = stats.estado.nivel;
      tutoriaDesc = stats.estado.descripcion;
      tutoriaPct = stats.pct;
    } else {
      tutoriaPct = Math.round((tutoriaPts / 63) * 100);
      if (!tutoriaDesc) {
        tutoriaDesc = getNivelCoordTutoriaJec(tutoriaPts).descripcion;
      }
    }
  }

  let pedagPts = sub.puntaje;
  let pedagNivel = sub.nivel_cumplimiento;
  let pedagDesc = sub.descripcion_cumplimiento;
  let pedagPct = null;

  if (isCoordPedagogico) {
    // Si no está calculado o si fue guardado erróneamente con la base de 63 de Tutoría, recalcular con base oficial de 51
    if (pedagPts === undefined || pedagPts === null || !pedagNivel || sub.puntaje_maximo === 63) {
      const stats = calcScore(sub.respuestas || [], { ...fichaType, regla_nivel: REGLA_NIVEL_COORD_PEDAGOGICO });
      pedagPts = stats.puntaje;
      pedagNivel = stats.estado.nivel;
      pedagDesc = stats.estado.descripcion;
      pedagPct = stats.pct;
    } else {
      pedagPct = Math.round((pedagPts / 51) * 100);
      if (!pedagDesc) {
        pedagDesc = getNivelCoordPedagogicoJec(pedagPts).descripcion;
      }
    }
  }

  const customTables = [];
  let tableHeaders = [];
  let tableRows = [];
  let columnStyles = {};

  const respuestas = sub.respuestas || [];

  if (isNivel14) {
    // =========================================================================
    // F1: BLOQUE DATOS GENERALES (TABLA ESTRUCTURADA 6 COLUMNAS CON CASILLAS)
    // =========================================================================
    const lblStyle = { fillColor: [240, 243, 248], fontStyle: 'bold', textColor: [18, 41, 77], fontSize: 7.5, valign: 'middle' };
    const valStyle = { fillColor: [255, 255, 255], textColor: [15, 27, 45], fontSize: 7.5, valign: 'middle' };
    const valGrayStyle = { fillColor: [255, 255, 255], textColor: [138, 151, 168], fontStyle: 'italic', fontSize: 7.5, valign: 'middle' };

    const fmtVal = (v) => {
      if (!v || v === '—' || String(v).trim() === '') {
        return { content: 'No registrado', styles: valGrayStyle };
      }
      return { content: String(v).trim(), styles: valStyle };
    };

    // Parseo de casillas de Condición
    const condUp = condicion.toUpperCase();
    const isDesig = condUp.includes('DESIGNAD');
    const isEncarg = condUp.includes('ENCARGAD');
    const isOtroCond = !isDesig && !isEncarg && condUp !== '' && condUp !== '—';
    const otroCondLabel = isOtroCond ? `Otro: ${condicion}` : 'Otro: ____';

    // Parseo de casillas de Nivel Educativo
    const nivUp = nivelAtencion.toUpperCase();
    const hasIni = nivUp.includes('INICIAL');
    const hasPrim = nivUp.includes('PRIMARIA');
    const hasSec = nivUp.includes('SECUNDARIA');
    const hasEbe = nivUp.includes('EBE') || nivUp.includes('ESPECIAL') || nivUp.includes('BÁSICA ESPECIAL');

    // Parseo de casillas de Turno de Atención
    const turUp = turnoAtencion.toUpperCase();
    const hasTurM = turUp.includes('MAÑANA') || turUp.includes('MANANA');
    const hasTurT = turUp.includes('TARDE');

    // Parseo de casillas de Turno Visitado
    const visUp = turnoVisitado.toUpperCase();
    const visM = visUp.includes('MAÑANA') || visUp.includes('MANANA');
    const visT = visUp.includes('TARDE');

    const generalDataRows = [
      [
        { content: 'Institución Educativa', styles: lblStyle },
        { content: ieName.toUpperCase(), colSpan: 5, styles: { ...valStyle, fontStyle: 'bold' } }
      ],
      [
        { content: 'Código local', styles: lblStyle },
        { content: codLocal || '—', styles: valStyle },
        { content: 'UGEL', styles: lblStyle },
        { content: ugel || 'UGEL 03', styles: valStyle },
        { content: 'REI / RED', styles: lblStyle },
        { content: red || '—', styles: valStyle }
      ],
      [
        { content: 'Nombre del directivo', styles: lblStyle },
        { content: director && director !== '—' ? formatPersonName(director).toUpperCase() : 'No registrado', colSpan: 3, styles: director && director !== '—' ? { ...valStyle, fontStyle: 'bold' } : valGrayStyle },
        { content: 'DNI', styles: lblStyle },
        fmtVal(directorDni)
      ],
      [
        { content: 'Condición', styles: lblStyle },
        {
          content: '',
          colSpan: 5,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Designado', checked: isDesig },
              { label: 'Encargado', checked: isEncarg },
              { label: otroCondLabel, checked: isOtroCond }
            ]
          }
        }
      ],
      [
        { content: 'Nivel educativo', styles: lblStyle },
        {
          content: '',
          colSpan: 5,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Inicial', checked: hasIni },
              { label: 'Primaria', checked: hasPrim },
              { label: 'Secundaria', checked: hasSec },
              { label: 'EBE', checked: hasEbe }
            ]
          }
        }
      ],
      [
        { content: 'Turno de atención', styles: lblStyle },
        {
          content: '',
          colSpan: 2,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Mañana', checked: hasTurM },
              { label: 'Tarde', checked: hasTurT }
            ]
          }
        },
        { content: 'Turno visitado', styles: lblStyle },
        {
          content: '',
          colSpan: 2,
          styles: valStyle,
          raw: {
            isCheckboxes: true,
            items: [
              { label: 'Mañana', checked: visM },
              { label: 'Tarde', checked: visT }
            ]
          }
        }
      ],
      [
        { content: 'Nombre del monitor', styles: lblStyle },
        { content: responsable ? formatPersonName(responsable).toUpperCase() : 'No registrado', colSpan: 3, styles: valStyle },
        { content: 'DNI', styles: lblStyle },
        fmtVal(monitorDni)
      ],
      [
        { content: 'Fecha de visita', styles: lblStyle },
        { content: fechaVisita, styles: valStyle },
        { content: 'Horario', styles: lblStyle },
        { content: horarioStr !== '—' ? horarioStr : 'No registrado', styles: horarioStr !== '—' ? valStyle : valGrayStyle },
        { content: 'N.° de Visita', styles: lblStyle },
        { content: numVisita, styles: { ...valStyle, fontStyle: 'bold' } }
      ]
    ];

    customTables.push({
      title: 'DATOS GENERALES DE LA VISITA',
      minHeight: 140,
      tableHeaders: null,
      tableRows: generalDataRows,
      styles: {
        minCellHeight: 18,
        cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 }
      },
      columnStyles: {
        0: { cellWidth: 115 },
        1: { cellWidth: 95 },
        2: { cellWidth: 55 },
        3: { cellWidth: 95 },
        4: { cellWidth: 55 },
        5: { cellWidth: 96 }
      },
      didDrawCell: (data) => {
        if (data.cell && data.cell.raw && data.cell.raw.isCheckboxes) {
          const doc = data.doc;
          if (!doc) return;
          const items = data.cell.raw.items || [];
          const boxSize = 7.5;
          const boxY = data.cell.y + (data.cell.height - boxSize) / 2;
          let curX = data.cell.x + 8;

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 27, 45);

          items.forEach(it => {
            drawVectorCheckbox(doc, curX, boxY, boxSize, it.checked, 'X', [18, 41, 77]);
            doc.text(it.label, curX + boxSize + 3.5, boxY + 6);
            curX += boxSize + 3.5 + doc.getTextWidth(it.label) + 12;
          });
        }
      }
    });

    // =========================================================================
    // 2. ESCALA DE VALORACIÓN (NIVELES DESCRIPTIVOS CON TONOS SUAVES)
    // =========================================================================
    customTables.push({
      title: 'ESCALA DE VALORACIÓN (NIVELES DESCRIPTIVOS)',
      subtitle: 'Criterios de valoración del desempeño y gestión directiva institucional.',
      minHeight: 80,
      tableHeaders: ['Nivel', 'Valor', 'Descriptor'],
      tableRows: [
        [
          { content: 'IV', styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] } },
          { content: '100%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] } },
          { content: 'Evidencia el cumplimiento integral de los criterios establecidos para el aspecto evaluado. Las acciones desarrolladas son consistentes, sistemáticas y se encuentran debidamente sustentadas con evidencias verificables, contribuyendo al logro de los resultados previstos.', styles: { fontSize: 7.2 } }
        ],
        [
          { content: 'III', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [180, 83, 9] } },
          { content: '75%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 243, 199], textColor: [180, 83, 9] } },
          { content: 'Evidencia el cumplimiento de la mayoría de los criterios establecidos para el aspecto evaluado. Si bien se observan avances significativos y acciones orientadas al logro de resultados, aún existen aspectos que requieren fortalecimiento para asegurar un desempeño plenamente satisfactorio.', styles: { fontSize: 7.2 } }
        ],
        [
          { content: 'II', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 237, 213], textColor: [194, 65, 12] } },
          { content: '50%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [255, 237, 213], textColor: [194, 65, 12] } },
          { content: 'Evidencia el cumplimiento parcial de los criterios establecidos para el aspecto evaluado. Las acciones desarrolladas muestran avances incipientes o poco sistemáticos, requiriendo asistencia técnica y seguimiento para consolidar su implementación.', styles: { fontSize: 7.2 } }
        ],
        [
          { content: 'I', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [185, 28, 28] } },
          { content: '25%', styles: { halign: 'center', fontStyle: 'bold', fillColor: [254, 226, 226], textColor: [185, 28, 28] } },
          { content: 'No evidencia el cumplimiento de los criterios mínimos establecidos para el aspecto evaluado. Las acciones desarrolladas resultan insuficientes para garantizar el logro de los resultados esperados, requiriendo acciones prioritarias de fortalecimiento y acompañamiento.', styles: { fontSize: 7.2 } }
        ]
      ],
      columnStyles: {
        0: { cellWidth: 36 },
        1: { cellWidth: 44 },
        2: { cellWidth: 431 }
      }
    });

    // =========================================================================
    // 3. DIMENSIONES A–F (TABLAS CON CASILLAS COLOREADAS Y CHECKMARKS VECTORIALES)
    // =========================================================================
    let globalItemCounter = 1;
    const dimensionAverages = [];
    const levelCounts = { 4: 0, 3: 0, 2: 0, 1: 0 };
    let totalScoreSum = 0;
    let totalScoreCount = 0;

    const sectionsToRender = (fichaType.secciones && fichaType.secciones.length > 0)
      ? fichaType.secciones
      : OFFICIAL_DIRECTIVO_DIMENSIONS.map(d => ({
        nombre: d.nombre,
        items: Array.from({ length: d.itemsCount }, (_, i) => ({
          id: `dir_${d.id.toLowerCase()}_${i + 1}`,
          texto: OFFICIAL_DIRECTIVO_ITEMS[d.startIdx + i]
        }))
      }));

    sectionsToRender.forEach((sec, sIdx) => {
      let dimSum = 0;
      let dimCount = 0;

      const secRows = (sec.items || []).map(it => {
        const itemNum = globalItemCounter++;
        const resp = respuestas.find(r => r.id === it.id) || respuestas[itemNum - 1];
        const rawVal = resp ? String(resp.valor || '').trim() : '';
        const evid = resp ? (resp.evidencia || '') : '';

        let valNum = null;
        if (rawVal === '4' || rawVal.toLowerCase() === 'iv') valNum = 4;
        else if (rawVal === '3' || rawVal.toLowerCase() === 'iii') valNum = 3;
        else if (rawVal === '2' || rawVal.toLowerCase() === 'ii') valNum = 2;
        else if (rawVal === '1' || rawVal.toLowerCase() === 'i') valNum = 1;

        if (valNum !== null) {
          levelCounts[valNum]++;
          const score = valNum === 4 ? 100 : (valNum === 3 ? 75 : (valNum === 2 ? 50 : 25));
          dimSum += score;
          dimCount++;
          totalScoreSum += score;
          totalScoreCount++;
        }

        // F7: Garantizar redacción oficial verbatim del ítem
        const itemOfficialText = OFFICIAL_DIRECTIVO_ITEMS[itemNum] || it.texto;

        // F3: Celda de nivel con fondo suave y marca vectorial
        const makeLevelCell = (lvl) => {
          if (valNum === lvl) {
            let bg = [236, 253, 245];
            if (lvl === 3) bg = [254, 243, 199];
            else if (lvl === 2) bg = [255, 237, 213];
            else if (lvl === 1) bg = [254, 226, 226];
            return {
              content: '',
              raw: { isCheckmark: true, level: lvl },
              styles: { fillColor: bg, halign: 'center', valign: 'middle' }
            };
          }
          return { content: '', styles: { fillColor: [255, 255, 255] } };
        };

        // F6: Evidencia vacía en blanco (sin '—')
        const evidText = (evid && evid !== '—') ? evid.trim() : '';

        return [
          String(itemNum),
          itemOfficialText,
          makeLevelCell(1),
          makeLevelCell(2),
          makeLevelCell(3),
          makeLevelCell(4),
          evidText
        ];
      });

      const dimPct = dimCount ? Math.round(dimSum / dimCount) : null;
      const dimStatus = dimPct === null ? 'Sin datos' : (dimPct >= 85 ? 'Logrado' : (dimPct >= 70 ? 'En proceso' : 'Por mejorar'));
      const dimStatusCol = dimPct >= 85 ? [5, 150, 105] : (dimPct >= 70 ? [217, 119, 6] : [220, 38, 38]);

      dimensionAverages.push({
        nombre: sec.nombre || `Dimensión ${sIdx + 1}`,
        itemsCount: (sec.items || []).length,
        pct: dimPct,
        status: dimStatus,
        statusColor: dimStatusCol
      });

      // Fila de cierre con promedio de dimensión
      secRows.push([
        {
          content: `Promedio de la dimensión: ${dimPct !== null ? dimPct + '%' : '—'}  ·  ${dimStatus.toUpperCase()}`,
          colSpan: 7,
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fillColor: [247, 249, 252],
            textColor: dimStatusCol,
            fontSize: 8
          }
        }
      ]);

      // Dimensión con título oficial
      const dimTitleOfficial = OFFICIAL_DIRECTIVO_DIMENSIONS[sIdx] ? OFFICIAL_DIRECTIVO_DIMENSIONS[sIdx].nombre : (sec.nombre || 'DIMENSIÓN').toUpperCase();

      customTables.push({
        title: dimTitleOfficial,
        minHeight: 80,
        tableHeaders: ['N.°', 'Ítem / Criterio de Evaluación', 'I', 'II', 'III', 'IV', 'Evidencia'],
        tableRows: secRows,
        columnStyles: {
          0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
          1: { halign: 'left', cellWidth: 260 },
          2: { halign: 'center', cellWidth: 22 },
          3: { halign: 'center', cellWidth: 22 },
          4: { halign: 'center', cellWidth: 22 },
          5: { halign: 'center', cellWidth: 22 },
          6: { halign: 'left', cellWidth: 119, fontSize: 7.2 }
        },
        didDrawCell: (data) => {
          if (data.cell && data.cell.raw && data.cell.raw.isCheckmark) {
            const doc = data.doc;
            if (!doc) return;
            const cx = data.cell.x + data.cell.width / 2;
            const cy = data.cell.y + data.cell.height / 2;
            const lvl = data.cell.raw.level;
            let col = [18, 41, 77];
            if (lvl === 4) col = [4, 120, 87];
            else if (lvl === 3) col = [180, 83, 9];
            else if (lvl === 2) col = [194, 65, 12];
            else if (lvl === 1) col = [185, 28, 28];
            drawVectorCheckmark(doc, cx, cy, 7.5, col, 1.4);
          }
        }
      });
    });

    // =========================================================================
    // F9: RESUMEN DE RESULTADOS (CUMPLIMIENTO POR DIMENSIÓN Y GLOBAL)
    // =========================================================================
    if (downloadConfig.incluirResumen !== false) {
      const globalPct = totalScoreCount ? Math.round(totalScoreSum / totalScoreCount) : null;
      const globalStatus = globalPct === null ? 'Sin datos' : (globalPct >= 85 ? 'LOGRADO' : (globalPct >= 70 ? 'EN PROCESO' : 'POR MEJORAR'));
      const globalStatusCol = globalPct >= 85 ? [5, 150, 105] : (globalPct >= 70 ? [217, 119, 6] : [220, 38, 38]);

      const resumenRows = dimensionAverages.map(d => [
        d.nombre,
        String(d.itemsCount),
        d.pct !== null ? `${d.pct}%` : '—',
        { content: d.status, styles: { fontStyle: 'bold', textColor: d.statusColor, halign: 'center' } }
      ]);

      // Fila total global
      resumenRows.push([
        { content: 'CUMPLIMIENTO GLOBAL INSTITUCIONAL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: String(globalItemCounter - 1), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: globalPct !== null ? `${globalPct}%` : '—', styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248], textColor: globalStatusCol } },
        { content: globalStatus, styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248], textColor: globalStatusCol } }
      ]);

      customTables.push({
        title: 'RESUMEN DE RESULTADOS',
        subtitle: `Cumplimiento global: ${globalPct !== null ? globalPct + '%' : '—'} — ${globalStatus}  ·  Distribución: IV × ${levelCounts[4]}  ·  III × ${levelCounts[3]}  ·  II × ${levelCounts[2]}  ·  I × ${levelCounts[1]}`,
        minHeight: 90,
        tableHeaders: ['Dimensión Evaluada', 'N.° Ítems', 'Promedio', 'Nivel Alcanzado'],
        tableRows: resumenRows,
        columnStyles: {
          0: { cellWidth: 260 },
          1: { halign: 'center', cellWidth: 65 },
          2: { halign: 'center', cellWidth: 80, fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 106, fontStyle: 'bold' }
        }
      });
    }

    // =========================================================================
    // 4. SÍNTESIS POR DIMENSIÓN (LOGROS, DIFICULTADES, RECOMENDACIONES)
    // =========================================================================
    const sintesisData = (sub.sintesis && sub.sintesis.length > 0)
      ? sub.sintesis
      : OFFICIAL_DIRECTIVO_DIMENSIONS.map(d => ({ dimension: d.nombre, logros: '', dificultades: '', recomendaciones: '' }));

    customTables.push({
      title: 'SÍNTESIS POR DIMENSIÓN',
      subtitle: 'Logros, dificultades y recomendaciones acordadas durante la jornada de monitoreo.',
      minHeight: 100,
      tableHeaders: ['Dimensiones', 'Logros', 'Dificultades', 'Recomendaciones'],
      tableRows: sintesisData.map(s => [
        s.dimension || 'Dimensión',
        (s.logros && s.logros !== '—') ? s.logros : '',
        (s.dificultades && s.dificultades !== '—') ? s.dificultades : '',
        (s.recomendaciones && s.recomendaciones !== '—') ? s.recomendaciones : ''
      ]),
      styles: {
        minCellHeight: 38, // Altura suficiente (~14mm) para llenado a mano
        fontSize: 7.2
      },
      columnStyles: {
        0: { halign: 'left', cellWidth: 131, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 126 },
        2: { halign: 'left', cellWidth: 126 },
        3: { halign: 'left', cellWidth: 128 }
      }
    });

    // =========================================================================
    // F2: COMPROMISOS ASUMIDOS (DIRECTOR Y MONITOR — CON LÍNEAS PUNTEADAS SI VACÍO)
    // =========================================================================
    const compDir = (sub.compromisoDirector && sub.compromisoDirector !== '—') ? sub.compromisoDirector.trim() : '';
    const compMon = (sub.compromisoMonitor && sub.compromisoMonitor !== '—') ? sub.compromisoMonitor.trim() : '';

    customTables.push({
      title: 'COMPROMISOS ASUMIDOS',
      subtitle: 'Compromisos de mejora institucional asumidos por la dirección y el equipo monitor.',
      minHeight: 110,
      tableHeaders: ['DEL DIRECTOR(A) DE LA IE', 'DEL MONITOR / ESPECIALISTA'],
      tableRows: [[
        { content: compDir, styles: { minCellHeight: 90, valign: 'top' } },
        { content: compMon, styles: { minCellHeight: 90, valign: 'top' } }
      ]],
      columnStyles: {
        0: { cellWidth: 255 },
        1: { cellWidth: 256 }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const text = (data.cell.text || []).join('').trim();
          if (!text && downloadConfig.imprimirLineas !== false) {
            // Dibujar 5 líneas punteadas para escribir a mano si está vacío
            const doc = data.doc;
            if (!doc) return;
            doc.saveGraphicsState && doc.saveGraphicsState();
            doc.setDrawColor(190, 200, 215);
            doc.setLineWidth(0.5);
            doc.setLineDashPattern && doc.setLineDashPattern([2, 3], 0);
            const startX = data.cell.x + 8;
            const endX = data.cell.x + data.cell.width - 8;
            for (let l = 1; l <= 5; l++) {
              const ly = data.cell.y + l * 16 + 2;
              if (ly < data.cell.y + data.cell.height - 4) {
                doc.line(startX, ly, endX, ly);
              }
            }
            doc.setLineDashPattern && doc.setLineDashPattern([], 0);
            doc.restoreGraphicsState && doc.restoreGraphicsState();
          }
        }
      }
    });

    // =========================================================================
    // F2: OBSERVACIONES (CON LÍNEAS PUNTEADAS SI VACÍO)
    // =========================================================================
    const obsText = (sub.observaciones && sub.observaciones !== '—') ? sub.observaciones.trim() : '';

    customTables.push({
      title: 'OBSERVACIONES',
      subtitle: 'Aspectos relevantes o contingencias registradas durante la visita.',
      minHeight: 75,
      tableHeaders: ['OBSERVACIONES REGISTRADAS EN LA VISITA'],
      tableRows: [[
        { content: obsText, styles: { minCellHeight: 65, valign: 'top' } }
      ]],
      columnStyles: {
        0: { cellWidth: 511 }
      },
      didDrawCell: (data) => {
        if (data.section === 'body') {
          const text = (data.cell.text || []).join('').trim();
          if (!text && downloadConfig.imprimirLineas !== false) {
            // Dibujar 4 líneas punteadas si está vacío
            const doc = data.doc;
            if (!doc) return;
            doc.saveGraphicsState && doc.saveGraphicsState();
            doc.setDrawColor(190, 200, 215);
            doc.setLineWidth(0.5);
            doc.setLineDashPattern && doc.setLineDashPattern([2, 3], 0);
            const startX = data.cell.x + 8;
            const endX = data.cell.x + data.cell.width - 8;
            for (let l = 1; l <= 4; l++) {
              const ly = data.cell.y + l * 15 + 2;
              if (ly < data.cell.y + data.cell.height - 4) {
                doc.line(startX, ly, endX, ly);
              }
            }
            doc.setLineDashPattern && doc.setLineDashPattern([], 0);
            doc.restoreGraphicsState && doc.restoreGraphicsState();
          }
        }
      }
    });
  } else {
    // =========================================================================
    // Modo tradicional para los otros tipos de ficha
    // =========================================================================
    if (isCoordTutoria) {
      customTables.push({
        title: 'NIVEL DE CUMPLIMIENTO OFICIAL (SEGÚN PUNTAJE OBTENIDO)',
        subtitle: 'Escala de valoración establecida en la Ficha de Monitoreo a las Funciones del Coordinador(a) de Tutoría (JEC)',
        minHeight: 75,
        tableHeaders: ['Nivel de cumplimiento', 'Puntaje', 'Descripción oficial de la función'],
        tableRows: [
          [
            { content: 'Cumple' + (tutoriaNivel === 'Cumple' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255], textColor: [4, 120, 87] } },
            { content: 'De 53 a 63', styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) de tutoría cumple con la función de manera oportuna, pertinente y sostenida.', styles: { fontSize: 7.5, fillColor: tutoriaNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255] } }
          ],
          [
            { content: 'Cumple parcialmente' + (tutoriaNivel === 'Cumple parcialmente' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255], textColor: [180, 83, 9] } },
            { content: 'De 42 a 52', styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) de tutoría cumple parcialmente con la función o se encuentra en proceso de consolidación.', styles: { fontSize: 7.5, fillColor: tutoriaNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255] } }
          ],
          [
            { content: 'No cumple' + (tutoriaNivel === 'No cumple' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255], textColor: [185, 28, 28] } },
            { content: 'De 21 a 41', styles: { halign: 'center', fontStyle: 'bold', fillColor: tutoriaNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) de tutoría no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.', styles: { fontSize: 7.5, fillColor: tutoriaNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255] } }
          ]
        ],
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 65 },
          2: { cellWidth: 336 }
        }
      });
    }

    if (isCoordPedagogico) {
      customTables.push({
        title: 'NIVEL DE CUMPLIMIENTO OFICIAL (SEGÚN PUNTAJE OBTENIDO)',
        subtitle: 'Escala de valoración establecida en la Ficha de Monitoreo a las Funciones que cumple el/la Coordinador(a) Pedagógico (JEC)',
        minHeight: 75,
        tableHeaders: ['Nivel de cumplimiento', 'Puntaje', 'Descripción oficial de la función'],
        tableRows: [
          [
            { content: 'Cumple' + (pedagNivel === 'Cumple' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: pedagNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255], textColor: [4, 120, 87] } },
            { content: 'De 41 a 51', styles: { halign: 'center', fontStyle: 'bold', fillColor: pedagNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) pedagógico cumple con la función de manera oportuna, pertinente y sostenida.', styles: { fontSize: 7.5, fillColor: pedagNivel === 'Cumple' ? [209, 250, 229] : [255, 255, 255] } }
          ],
          [
            { content: 'Cumple parcialmente' + (pedagNivel === 'Cumple parcialmente' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: pedagNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255], textColor: [180, 83, 9] } },
            { content: 'De 28 a 40', styles: { halign: 'center', fontStyle: 'bold', fillColor: pedagNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) pedagógico cumple parcialmente con la función o se encuentra en proceso de consolidación.', styles: { fontSize: 7.5, fillColor: pedagNivel === 'Cumple parcialmente' ? [254, 243, 199] : [255, 255, 255] } }
          ],
          [
            { content: 'No cumple' + (pedagNivel === 'No cumple' ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: pedagNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255], textColor: [185, 28, 28] } },
            { content: 'De 17 a 27', styles: { halign: 'center', fontStyle: 'bold', fillColor: pedagNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255] } },
            { content: 'El/la coordinador(a) pedagógico no cumple o cumple de forma mínima, sin responder al propósito pedagógico esperado.', styles: { fontSize: 7.5, fillColor: pedagNivel === 'No cumple' ? [254, 226, 226] : [255, 255, 255] } }
          ]
        ],
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 65 },
          2: { cellWidth: 336 }
        }
      });
    }

    tableHeaders = (isCoordTutoria || isCoordPedagogico)
      ? ['N.°', 'Sección / Función Monitoreada', 'Calificación (1–3)']
      : ['N.°', 'Sección / Indicador de Evaluación', 'Resultado'];
    let itemCounter = 1;

    if (fichaType.secciones && fichaType.secciones.length > 0) {
      fichaType.secciones.forEach(sec => {
        (sec.items || []).forEach(it => {
          const resp = respuestas.find(r => r.id === it.id);
          const val = resp ? resp.valor : 'Sin datos';
          const valText = ((isCoordTutoria || isCoordPedagogico) && val && val !== 'Sin datos') ? `${val} pts` : val;
          tableRows.push([
            String(itemCounter++),
            `${sec.nombre}\n${it.texto}`,
            valText
          ]);
        });
      });
    } else {
      respuestas.forEach(r => {
        const valText = ((isCoordTutoria || isCoordPedagogico) && r.valor && r.valor !== '—') ? `${r.valor} pts` : (r.valor || '—');
        tableRows.push([
          String(itemCounter++),
          `${r.seccion || 'General'}\n${r.texto || 'Indicador'}`,
          valText
        ]);
      });
    }

    columnStyles = {
      0: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 90, fontStyle: 'bold' }
    };
  }

  // F8: Nombre de archivo limpio y estandarizado
  const cleanCodLocal = sanitizeFilename(String(codLocal).replace(/[^0-9A-Za-z_-]/g, ''));
  const cleanIeName = sanitizeFilename(ieName);
  const filename = isNivel14
    ? `Ficha_Monitoreo_Directivo_IE_${cleanCodLocal || 'IE'}_${cleanIeName}_${getLimaDateStr()}.pdf`
    : `Ficha_${sanitizeFilename(rawTypeName)}_${cleanIeName}_${getLimaDateStr()}.pdf`;

  // Firmas por defecto (Director, Monitor, Jefatura opcional)
  const areaSigla = (downloadConfig.areaConfig && downloadConfig.areaConfig.sigla) ? downloadConfig.areaConfig.sigla : 'AGEBRE';
  const monitorCargo = isJecFicha ? 'Especialista de JEC — UGEL 03' : (isNivel14 ? `Monitor(a) — ${areaSigla}` : `Especialista que monitorea — ${areaSigla}`);
  const defaultSignatures = isNivel14 ? [
    { cargo: 'Director(a) de la I.E.', entidad: ieName, nombre: (director && director !== '—') ? formatPersonName(director) : '', leyenda: 'Firma y Sello' },
    { cargo: monitorCargo, entidad: 'UGEL 03 – DRELM', nombre: responsable ? formatPersonName(responsable) : '', leyenda: 'Firma y Sello' },
    { cargo: `V.° B.° Jefatura de ${areaSigla}`, entidad: 'UGEL 03', nombre: '', leyenda: 'V.° B.°' }
  ] : [
    { cargo: monitorCargo, entidad: 'UGEL 03 – DRELM', nombre: responsable ? formatPersonName(responsable) : '', leyenda: 'Firma y Sello' },
    { cargo: 'Director(a) / Autoridad de la I.E.', entidad: ieName, nombre: (director && director !== '—') ? formatPersonName(director) : '', leyenda: 'Firma y Sello' },
    { cargo: `Jefatura de ${areaSigla}`, entidad: 'UGEL 03', nombre: '', leyenda: 'V.° B.°' }
  ];

  const metaGrid = isNivel14 ? [] : [
    { label: 'Institución Educativa', value: ieName },
    { label: 'Fecha de Monitoreo', value: fechaVisita },
    { label: 'N.° de Visita', value: numVisita },
    { label: 'Especialista / Monitor', value: responsable },
    { label: 'Director(a)', value: director },
    { label: 'Código Modular / Local', value: codLocal || '—' },
    ...(isCoordTutoria ? [
      { label: 'Puntaje Total Obtenido', value: `${tutoriaPts} / 63 puntos (${tutoriaPct}%)` },
      { label: 'Nivel de Cumplimiento', value: `${(tutoriaNivel || '').toUpperCase()}` }
    ] : (isCoordPedagogico ? [
      { label: 'Puntaje Total Obtenido', value: `${pedagPts} / 51 puntos (${pedagPct}%)` },
      { label: 'Nivel de Cumplimiento', value: `${(pedagNivel || '').toUpperCase()}` }
    ] : []))
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: 'Monitoreo y Acompañamiento 2026 · UGEL 03',
    orientation: downloadConfig.orientation || 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows,
    columnStyles,
    customTables,
    summarySections: [],
    signatures: downloadConfig.signatures || defaultSignatures,
    lugarFecha: downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`,
    sinFirmas: downloadConfig.sinFirmas || false,
    areaConfig: downloadConfig.areaConfig || null,
    incluirQr: downloadConfig.incluirQr !== false,
    datosIncompletos: downloadConfig.datosIncompletos || false,
    marcaBorrador: downloadConfig.marcaBorrador || false,
  });
}
