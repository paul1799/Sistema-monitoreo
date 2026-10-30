/* =========================================================================
   concursos-excel.js — Exportación Oficial en Excel (.xlsx) de Concursos Escolares
   UGEL 03 – AGEBRE · Gestión Integral de Concursos Escolares 2026
   =========================================================================
   Rediseñado según especificación ministerial:
   - Estructura tabular estricta ("solo cuadros") sin párrafos discursivos
   - Super-encabezados agrupados por dominio:
       * "Datos Generales" (Azul Real #0070C0)
       * "Datos de los Estudiantes" (Teal/Cian #008080)
       * "Docente Asesor" o "Cuerpo Técnico" (Verde Oliva #556B2F)
   - Sub-encabezados con filtros nativos de Excel (AutoFilter)
   - Soporte dinámico para concursos individuales y grupales:
       * En grupales: cada estudiante en su propia fila, asesor unificado/centrado
       * En individuales: una fila por participante y asesor
   - Preserva toda la información de cada concurso (Código Modular, Etapa,
     Categoría, Género, Disciplina/Área, Título de Proyecto/Obra, Resolución)
   - Generación con ExcelJS (estilos y formatos exactos) y fallback en SheetJS
   ========================================================================= */

import { formatPuestoLabel, puestoRank, formatGeneroDisplay } from './pdf-concursos.js';

/**
 * Normaliza nombres completos a formato "APELLIDOS NOMBRES" en mayúsculas
 */
export function formatNombrePersonaExcel(p) {
  if (!p) return '';
  if (typeof p === 'string') {
    const s = p.trim();
    if (s === '[object Object]' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') return '';
    return s.toUpperCase();
  }
  const ap = (p.apellidos || p.apellidoPaterno || '').trim().toUpperCase();
  const nom = (p.nombres || p.nombre || p.nombreCompleto || p.nombresApellidos || '').trim().toUpperCase();
  if (ap && nom) return `${ap} ${nom}`.replace(/\s{2,}/g, ' ');
  return (ap || nom || '').replace(/\s{2,}/g, ' ');
}

/**
 * Retorna la fecha actual en formato YYYY-MM-DD
 */
function getFechaIsoHoy() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Exporta el reporte consolidado de concursos escolares a formato Excel (.xlsx)
 * con diseño oficial idéntico al de la muestra (Image 2).
 */
export async function exportarConcursosExcelOficial(filtered, tipoConcurso, concursoFilters = {}, state = {}) {
  if (!filtered || filtered.length === 0) {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast('No hay registros para exportar con los filtros seleccionados.');
    }
    return;
  }

  const isJedpa = (tipoConcurso?.id === 'jedpa' ||
    (tipoConcurso?.nombre || '').toUpperCase().includes('JEDPA') ||
    concursoFilters?.tipoId === 'jedpa');

  // Ordenar registros de forma lógica: Concurso -> Etapa -> Disciplina -> Categoría -> Puesto -> Institución
  const sortedRows = filtered.slice().sort((a, b) => {
    const cA = (a.tipoConcursoNombre || a.tipoConcurso || '').localeCompare(b.tipoConcursoNombre || b.tipoConcurso || '', 'es');
    if (cA !== 0) return cA;
    const eA = (a.etapa || '').localeCompare(b.etapa || '', 'es');
    if (eA !== 0) return eA;
    const dA = (a.disciplina || '').localeCompare(b.disciplina || '', 'es');
    if (dA !== 0) return dA;
    const catA = (a.categoria || '').localeCompare(b.categoria || '', 'es');
    if (catA !== 0) return catA;
    const rkA = puestoRank(a.puesto) - puestoRank(b.puesto);
    if (rkA !== 0) return rkA;
    return (a.institucion || '').localeCompare(b.institucion || '', 'es');
  });

  // Determinar columnas de "Datos Generales" que contienen información
  const hasCodigoModular = sortedRows.some(r => r.codigoModular && String(r.codigoModular).trim() !== '');
  const uniqueConcursos = new Set(sortedRows.map(r => r.tipoConcursoNombre || r.tipoConcurso).filter(Boolean));
  const hasMultipleConcursos = uniqueConcursos.size > 1 || !tipoConcurso;
  const hasEtapa = sortedRows.some(r => r.etapa && String(r.etapa).trim() !== '');
  const hasCategoria = sortedRows.some(r => r.categoria && String(r.categoria).trim() !== '');
  const hasGenero = isJedpa || (tipoConcurso?.tieneGenero) || sortedRows.some(r => r.genero && String(r.genero).trim() !== '' && r.genero !== '—');
  const hasDisciplina = (tipoConcurso?.tieneDisciplina) || sortedRows.some(r => r.disciplina && String(r.disciplina).trim() !== '');
  const hasTitulo = (tipoConcurso?.tieneTituloTrabajo) || sortedRows.some(r => r.tituloTrabajo && String(r.tituloTrabajo).trim() !== '');
  const hasResolucion = sortedRows.some(r => r.resolucionRef && String(r.resolucionRef).trim() !== '');

  // Configuración de columnas generales
  const generalCols = [
    { key: 'puesto', label: 'Puesto', width: 14, align: 'center' },
    { key: 'institucion', label: 'Institución', width: 34, align: 'left' }
  ];

  if (hasCodigoModular) {
    generalCols.push({ key: 'codigoModular', label: 'Cód. Modular', width: 15, align: 'center' });
  }
  if (hasMultipleConcursos) {
    generalCols.push({ key: 'concurso', label: 'Concurso', width: 32, align: 'left' });
  }
  if (hasEtapa) {
    generalCols.push({ key: 'etapa', label: 'Etapa', width: 13, align: 'center' });
  }
  if (hasCategoria) {
    generalCols.push({ key: 'categoria', label: 'Categoría', width: 13, align: 'center' });
  }
  if (hasGenero) {
    generalCols.push({ key: 'genero', label: 'Género', width: 14, align: 'center' });
  }
  if (hasDisciplina) {
    const dLabel = tipoConcurso?.etiquetaDisciplina || 'Disciplina / Área';
    generalCols.push({ key: 'disciplina', label: dLabel, width: 28, align: 'left' });
  }
  if (hasTitulo) {
    const tLabel = tipoConcurso?.etiquetaTitulo || 'Título Proyecto';
    generalCols.push({ key: 'titulo', label: tLabel, width: 36, align: 'left' });
  }
  if (hasResolucion) {
    generalCols.push({ key: 'resolucion', label: 'Resolución Ref.', width: 24, align: 'left' });
  }

  // Columnas de estudiantes
  const studentCols = [
    { key: 'student_nombre', label: 'Apellidos y Nombres', width: 38, align: 'left' },
    { key: 'student_dni', label: 'DNI/Doc.', width: 14, align: 'center' },
    { key: 'student_rol', label: 'Rol', width: 16, align: 'center' }
  ];

  // Columnas de docente asesor / cuerpo técnico
  const asesorGroupLabel = isJedpa ? 'Cuerpo Técnico' : 'Docente Asesor';
  const asesorCols = [
    { key: 'asesor_nombre', label: 'Apellidos y Nombres', width: 38, align: 'left' },
    { key: 'asesor_dni', label: 'DNI/Doc.', width: 14, align: 'center' },
    { key: 'asesor_rol', label: 'Rol', width: 20, align: 'center' }
  ];

  const totalCols = generalCols.length + studentCols.length + asesorCols.length;
  const fileNameBase = `concursos_${tipoConcurso ? (tipoConcurso.id || 'oficial') : 'todos'}_${getFechaIsoHoy()}`;

  // Intentar exportación con ExcelJS para máxima fidelidad visual y estilos
  const ExcelJS = (typeof window !== 'undefined' && window.ExcelJS) ? window.ExcelJS : null;

  if (ExcelJS) {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'UGEL 03 - Sistematización de Concursos Escolares';
      workbook.created = new Date();

      const rawSheetName = tipoConcurso?.nombre || 'Resultados Concursos';
      const cleanSheetName = rawSheetName.slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
      const worksheet = workbook.addWorksheet(cleanSheetName, {
        views: [{ state: 'frozen', ySplit: 3, activeCell: 'A4' }]
      });

      // Estilos reutilizables
      const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
        right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
      };

      const fontSuperHeader = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      const fontSubHeader = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      const fontData = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } };

      // Colores de la paleta oficial (idéntica a Image 2):
      // Super-headers:
      // Datos Generales: Azul Real #0070C0
      // Datos de los Estudiantes: Teal/Cian #008080
      // Docente Asesor: Verde Oliva #556B2F
      const fillSuperGeneral = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0070C0' } };
      const fillSuperStudent = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF008080' } };
      const fillSuperAsesor = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF556B2F' } };

      // Sub-headers (un tono más oscuro para contraste institucional):
      const fillSubGeneral = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B365D' } };
      const fillSubStudent = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF005C5C' } };
      const fillSubAsesor = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3E4F22' } };

      // -------------------------------------------------------------
      // FILA 1: Super-Encabezados Agrupados (Row Height: 26)
      // -------------------------------------------------------------
      worksheet.getRow(1).height = 26;

      const genEndCol = generalCols.length;
      const stStartCol = genEndCol + 1;
      const stEndCol = genEndCol + studentCols.length;
      const advStartCol = stEndCol + 1;
      const advEndCol = totalCols;

      // Grupo 1: Datos Generales
      worksheet.mergeCells(1, 1, 1, genEndCol);
      for (let c = 1; c <= genEndCol; c++) {
        const cell = worksheet.getCell(1, c);
        cell.fill = fillSuperGeneral;
        cell.border = thinBorder;
      }
      const cSuperGen = worksheet.getCell(1, 1);
      cSuperGen.value = 'Datos Generales';
      cSuperGen.font = fontSuperHeader;
      cSuperGen.alignment = { vertical: 'middle', horizontal: 'center' };

      // Grupo 2: Datos de los Estudiantes
      worksheet.mergeCells(1, stStartCol, 1, stEndCol);
      for (let c = stStartCol; c <= stEndCol; c++) {
        const cell = worksheet.getCell(1, c);
        cell.fill = fillSuperStudent;
        cell.border = thinBorder;
      }
      const cSuperSt = worksheet.getCell(1, stStartCol);
      cSuperSt.value = isJedpa ? 'Datos de los Deportistas' : 'Datos de los Estudiantes';
      cSuperSt.font = fontSuperHeader;
      cSuperSt.alignment = { vertical: 'middle', horizontal: 'center' };

      // Grupo 3: Docente Asesor / Cuerpo Técnico
      worksheet.mergeCells(1, advStartCol, 1, advEndCol);
      for (let c = advStartCol; c <= advEndCol; c++) {
        const cell = worksheet.getCell(1, c);
        cell.fill = fillSuperAsesor;
        cell.border = thinBorder;
      }
      const cSuperAdv = worksheet.getCell(1, advStartCol);
      cSuperAdv.value = asesorGroupLabel;
      cSuperAdv.font = fontSuperHeader;
      cSuperAdv.alignment = { vertical: 'middle', horizontal: 'center' };

      // -------------------------------------------------------------
      // FILA 2: Espaciador sutil (Row Height: 4)
      // -------------------------------------------------------------
      const r2 = worksheet.getRow(2);
      r2.height = 4;
      for (let c = 1; c <= totalCols; c++) {
        const cell = r2.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      }

      // -------------------------------------------------------------
      // FILA 3: Sub-Encabezados de Columna (Row Height: 24)
      // -------------------------------------------------------------
      const r3 = worksheet.getRow(3);
      r3.height = 24;

      let colIdx = 1;
      // General subheaders
      generalCols.forEach(col => {
        const cell = r3.getCell(colIdx);
        cell.value = col.label;
        cell.fill = fillSubGeneral;
        cell.font = fontSubHeader;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
        colIdx++;
      });

      // Student subheaders
      studentCols.forEach(col => {
        const cell = r3.getCell(colIdx);
        cell.value = col.label;
        cell.fill = fillSubStudent;
        cell.font = fontSubHeader;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
        colIdx++;
      });

      // Advisor subheaders
      asesorCols.forEach(col => {
        const cell = r3.getCell(colIdx);
        cell.value = col.label;
        cell.fill = fillSubAsesor;
        cell.font = fontSubHeader;
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = thinBorder;
        colIdx++;
      });

      // Habilitar AutoFilter en la fila 3
      worksheet.autoFilter = {
        from: { row: 3, column: 1 },
        to: { row: 3, column: totalCols }
      };

      // -------------------------------------------------------------
      // FILAS 4+: Datos de Concursos (Individuales y Grupales)
      // -------------------------------------------------------------
      let currentRow = 4;

      sortedRows.forEach(r => {
        // Datos generales del registro
        const genDataMap = {
          puesto: formatPuestoLabel(r.puesto),
          institucion: (r.institucion || '').trim().toUpperCase(),
          codigoModular: String(r.codigoModular || '').trim(),
          concurso: (r.tipoConcursoNombre || r.tipoConcurso || '').trim(),
          etapa: (r.etapa || '').trim().toUpperCase(),
          categoria: (r.categoria || '').trim(),
          genero: formatGeneroDisplay(r.genero) || '',
          disciplina: (r.disciplina || '').trim(),
          titulo: ((r.tituloTrabajo || '').trim() + (r.seudonimo ? ` (${r.seudonimo.trim()})` : '')).trim(),
          resolucion: (r.resolucionRef || '').trim()
        };

        // Participantes / Estudiantes del registro
        const rawParts = (r.participantes || []).slice();
        const students = rawParts.map(p => ({
          nombre: formatNombrePersonaExcel(p),
          dni: String(p.dni || '').trim(),
          rol: (p.rol || (isJedpa ? 'Deportista' : 'Estudiante')).trim()
        }));

        // Asesores / Cuerpo técnico
        let advisors = [];
        if (isJedpa) {
          const ctGrupo = (typeof window !== 'undefined' && typeof window.obtenerCuerpoTecnicoGrupo === 'function')
            ? window.obtenerCuerpoTecnicoGrupo(r, state.concursoCuerpoTecnico || [], filtered)
            : { miembros: [] };
          const ct = (ctGrupo.miembros && ctGrupo.miembros.length > 0)
            ? ctGrupo.miembros
            : (r.asesores || []);
          advisors = ct.map(a => ({
            nombre: formatNombrePersonaExcel(a),
            dni: String(a.dni || '').trim(),
            rol: (a.rol || 'Delegado').trim()
          }));
        } else {
          advisors = (r.asesores || []).map(a => ({
            nombre: formatNombrePersonaExcel(a),
            dni: String(a.dni || '').trim(),
            rol: (a.rol || 'Docente Asesor(a)').trim()
          }));
        }

        const numRows = Math.max(students.length, advisors.length, 1);
        const startRow = currentRow;
        const endRow = startRow + numRows - 1;

        for (let idx = 0; idx < numRows; idx++) {
          const rowNum = startRow + idx;
          const row = worksheet.getRow(rowNum);
          row.height = 20;

          // 1. Columnas Generales (se pueblan en cada fila para permitir autofiltro y orden)
          let cIndex = 1;
          generalCols.forEach(gc => {
            const cell = row.getCell(cIndex);
            cell.value = genDataMap[gc.key] || '';
            cell.font = fontData;
            cell.alignment = { vertical: 'middle', horizontal: gc.align };
            cell.border = thinBorder;
            cIndex++;
          });

          // 2. Columnas de Estudiantes
          const st = students[idx] || null;
          const cStNom = row.getCell(stStartCol);
          const cStDni = row.getCell(stStartCol + 1);
          const cStRol = row.getCell(stStartCol + 2);

          if (st) {
            cStNom.value = st.nombre;
            cStDni.value = st.dni; // string explícito para preservar ceros a la izquierda
            cStRol.value = st.rol;
          } else if (students.length === 0 && idx === 0) {
            cStNom.value = 'Sin participante registrado';
            cStDni.value = '—';
            cStRol.value = '—';
          } else {
            cStNom.value = '';
            cStDni.value = '';
            cStRol.value = '';
          }

          [cStNom, cStDni, cStRol].forEach(cell => {
            cell.font = fontData;
            cell.border = thinBorder;
          });
          cStNom.alignment = { vertical: 'middle', horizontal: 'left' };
          cStDni.alignment = { vertical: 'middle', horizontal: 'center' };
          cStRol.alignment = { vertical: 'middle', horizontal: 'center' };

          // 3. Columnas de Asesor
          const cAdvNom = row.getCell(advStartCol);
          const cAdvDni = row.getCell(advStartCol + 1);
          const cAdvRol = row.getCell(advStartCol + 2);

          [cAdvNom, cAdvDni, cAdvRol].forEach(cell => {
            cell.font = fontData;
            cell.border = thinBorder;
          });
          cAdvNom.alignment = { vertical: 'middle', horizontal: 'left' };
          cAdvDni.alignment = { vertical: 'middle', horizontal: 'center' };
          cAdvRol.alignment = { vertical: 'middle', horizontal: 'center' };

          // Si hay múltiples asesores, listar uno por fila
          if (advisors.length > 1) {
            if (idx < advisors.length) {
              cAdvNom.value = advisors[idx].nombre;
              cAdvDni.value = advisors[idx].dni;
              cAdvRol.value = advisors[idx].rol;
            } else {
              cAdvNom.value = '';
              cAdvDni.value = '';
              cAdvRol.value = '';
            }
          } else if (advisors.length === 1 && numRows === 1) {
            // Concurso individual o 1 solo estudiante: fila única
            cAdvNom.value = advisors[0].nombre;
            cAdvDni.value = advisors[0].dni;
            cAdvRol.value = advisors[0].rol;
          } else if (advisors.length === 0 && idx === 0) {
            cAdvNom.value = '—';
            cAdvDni.value = '—';
            cAdvRol.value = '—';
          }
        }

        // Si es concurso grupal con 1 solo docente asesor y varias filas de estudiantes:
        // Combinar verticalmente las celdas de asesor (como en la Imagen 2)
        if (advisors.length === 1 && numRows > 1) {
          worksheet.mergeCells(startRow, advStartCol, endRow, advStartCol);
          worksheet.mergeCells(startRow, advStartCol + 1, endRow, advStartCol + 1);
          worksheet.mergeCells(startRow, advStartCol + 2, endRow, advStartCol + 2);

          const mNom = worksheet.getCell(startRow, advStartCol);
          const mDni = worksheet.getCell(startRow, advStartCol + 1);
          const mRol = worksheet.getCell(startRow, advStartCol + 2);

          mNom.value = advisors[0].nombre;
          mNom.alignment = { vertical: 'middle', horizontal: 'left' };
          mNom.font = fontData;

          mDni.value = advisors[0].dni;
          mDni.alignment = { vertical: 'middle', horizontal: 'center' };
          mDni.font = fontData;

          mRol.value = advisors[0].rol;
          mRol.alignment = { vertical: 'middle', horizontal: 'center' };
          mRol.font = fontData;

          // Asegurar bordes en todo el bloque combinado
          for (let rIdx = startRow; rIdx <= endRow; rIdx++) {
            worksheet.getCell(rIdx, advStartCol).border = thinBorder;
            worksheet.getCell(rIdx, advStartCol + 1).border = thinBorder;
            worksheet.getCell(rIdx, advStartCol + 2).border = thinBorder;
          }
        }

        currentRow = endRow + 1;
      });

      // Anchos de columna automáticos con mínimo de seguridad
      const allCols = [...generalCols, ...studentCols, ...asesorCols];
      worksheet.columns = allCols.map(col => ({
        width: col.width || 20
      }));

      // Escribir archivo en memoria y descargar
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileNameBase}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast('✓ Descarga oficial de Excel (.xlsx) generada exitosamente.');
      }
      return;
    } catch (err) {
      console.error('Error generando Excel con ExcelJS, recurriendo a SheetJS:', err);
    }
  }

  // Fallback con SheetJS (XLSX)
  if (typeof XLSX !== 'undefined') {
    try {
      const allCols = [...generalCols, ...studentCols, ...asesorCols];
      const row1 = new Array(totalCols).fill('');
      row1[0] = 'Datos Generales';
      row1[generalCols.length] = isJedpa ? 'Datos de los Deportistas' : 'Datos de los Estudiantes';
      row1[generalCols.length + studentCols.length] = asesorGroupLabel;

      const row2 = allCols.map(c => c.label);
      const aoa = [row1, row2];
      const merges = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: generalCols.length - 1 } },
        { s: { r: 0, c: generalCols.length }, e: { r: 0, c: generalCols.length + studentCols.length - 1 } },
        { s: { r: 0, c: generalCols.length + studentCols.length }, e: { r: 0, c: totalCols - 1 } }
      ];

      sortedRows.forEach(r => {
        const rawParts = (r.participantes || []).slice();
        const students = rawParts.map(p => ({
          nombre: formatNombrePersonaExcel(p),
          dni: String(p.dni || '').trim(),
          rol: (p.rol || (isJedpa ? 'Deportista' : 'Estudiante')).trim()
        }));

        const advisors = (r.asesores || []).map(a => ({
          nombre: formatNombrePersonaExcel(a),
          dni: String(a.dni || '').trim(),
          rol: (a.rol || 'Docente Asesor(a)').trim()
        }));

        const numRows = Math.max(students.length, advisors.length, 1);
        const startRowIdx = aoa.length;

        for (let idx = 0; idx < numRows; idx++) {
          const rowVals = [];
          generalCols.forEach(gc => {
            if (gc.key === 'puesto') rowVals.push(formatPuestoLabel(r.puesto));
            else if (gc.key === 'institucion') rowVals.push((r.institucion || '').toUpperCase());
            else if (gc.key === 'codigoModular') rowVals.push(r.codigoModular || '');
            else if (gc.key === 'concurso') rowVals.push(r.tipoConcursoNombre || r.tipoConcurso || '');
            else if (gc.key === 'etapa') rowVals.push(r.etapa || '');
            else if (gc.key === 'categoria') rowVals.push(r.categoria || '');
            else if (gc.key === 'genero') rowVals.push(formatGeneroDisplay(r.genero) || '');
            else if (gc.key === 'disciplina') rowVals.push(r.disciplina || '');
            else if (gc.key === 'titulo') rowVals.push((r.tituloTrabajo || '') + (r.seudonimo ? ` (${r.seudonimo})` : ''));
            else if (gc.key === 'resolucion') rowVals.push(r.resolucionRef || '');
            else rowVals.push('');
          });

          const st = students[idx] || null;
          rowVals.push(st ? st.nombre : (students.length === 0 && idx === 0 ? 'Sin participante registrado' : ''));
          rowVals.push(st ? st.dni : '');
          rowVals.push(st ? st.rol : '');

          if (advisors.length > 1) {
            const adv = advisors[idx] || null;
            rowVals.push(adv ? adv.nombre : '');
            rowVals.push(adv ? adv.dni : '');
            rowVals.push(adv ? adv.rol : '');
          } else if (advisors.length === 1) {
            rowVals.push(idx === 0 ? advisors[0].nombre : '');
            rowVals.push(idx === 0 ? advisors[0].dni : '');
            rowVals.push(idx === 0 ? advisors[0].rol : '');
          } else {
            rowVals.push(idx === 0 ? '—' : '');
            rowVals.push(idx === 0 ? '—' : '');
            rowVals.push(idx === 0 ? '—' : '');
          }

          aoa.push(rowVals);
        }

        if (advisors.length === 1 && numRows > 1) {
          const advCol = generalCols.length + studentCols.length;
          merges.push({ s: { r: startRowIdx, c: advCol }, e: { r: startRowIdx + numRows - 1, c: advCol } });
          merges.push({ s: { r: startRowIdx, c: advCol + 1 }, e: { r: startRowIdx + numRows - 1, c: advCol + 1 } });
          merges.push({ s: { r: startRowIdx, c: advCol + 2 }, e: { r: startRowIdx + numRows - 1, c: advCol + 2 } });
        }
      });

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = merges;
      ws['!cols'] = allCols.map(c => ({ wch: c.width || 18 }));
      const wb = XLSX.utils.book_new();
      const sheetName = (tipoConcurso?.nombre || 'Concursos').slice(0, 31).replace(/[:\\\/\?\*\[\]]/g, '');
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, `${fileNameBase}.xlsx`);
      if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
        window.showToast('✓ Archivo Excel generado.');
      }
      return;
    } catch (e) {
      console.error('Error en fallback SheetJS:', e);
    }
  }

  alert('No se pudo generar el archivo Excel en este navegador.');
}
