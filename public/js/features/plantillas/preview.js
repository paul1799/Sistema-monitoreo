/**
 * features/plantillas/preview.js
 * Generación de vista previa en vivo (Formulario y Documento) y simulación de prueba
 * UGEL 03 · AGEBRE · Fase 3 Reorganización
 */

import { esc, FICHA_PALETTE } from '../../core/utils/index.js';
import { RESPONSE_LABELS } from '../../ui/scoring.js';

export function renderItemResponseInputs(it, tipoRespuesta, curVal, customKey) {
  const itKey = customKey || it.id;
  if (tipoRespuesta === 'si_no') {
    return `
      <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${itKey}" value="si" ${curVal === 'si' ? 'checked' : ''} data-test-item="${itKey}"> Sí</label>
      <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="radio" name="test_${itKey}" value="no" ${curVal === 'no' ? 'checked' : ''} data-test-item="${itKey}"> No</label>
      <label style="display:flex;align-items:center;gap:4px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>
    `;
  }
  if (tipoRespuesta === 'escala1_3') {
    return [1, 2, 3].map(v => `
      <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
    `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
  }
  if (tipoRespuesta === 'rubrica1_4' || tipoRespuesta === 'ips') {
    const lvls = ['I', 'II', 'III', 'IV'];
    return lvls.map((lvl, idx) => `
      <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${idx + 1}" ${String(curVal) === String(idx + 1) ? 'checked' : ''} data-test-item="${itKey}"> Nivel ${lvl}</label>
    `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
  }
  if (tipoRespuesta === 'escala1_5') {
    return [1, 2, 3, 4, 5].map(v => `
      <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
    `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
  }
  // Default escala 1-4
  return [1, 2, 3, 4].map(v => `
    <label style="display:flex;align-items:center;gap:3px;cursor:pointer"><input type="radio" name="test_${itKey}" value="${v}" ${String(curVal) === String(v) ? 'checked' : ''} data-test-item="${itKey}"> ${v}</label>
  `).join('') + `<label style="display:flex;align-items:center;gap:3px;cursor:pointer;color:var(--text-400)"><input type="radio" name="test_${itKey}" value="na" ${curVal === 'na' ? 'checked' : ''} data-test-item="${itKey}"> N/A</label>`;
}

export function buildPreviewInnerHtml(options) {
  const {
    bs,
    builderActiveVisitPreview = 0,
    builderPreviewMode = 'formulario',
    builderTestAnswers = {},
    existingCount = 0
  } = options;

  if (!bs) return '';

  const isPrevMultiDiferenciada = !!(bs.tieneVisitas && bs.tipoVisitas === 'items_por_visita');
  const previewSections = isPrevMultiDiferenciada
    ? ((bs.seccionesPorVisita && bs.seccionesPorVisita[builderActiveVisitPreview]) || (builderActiveVisitPreview === 0 ? (bs.secciones || []) : []))
    : (bs.secciones || []);

  const totalSecs = previewSections.length;
  const totalItems = previewSections.reduce((acc, s) => acc + (s.items || []).length, 0);

  // Validación de campos
  const errors = [];
  if (!bs.nombre || !bs.nombre.trim()) {
    errors.push({ msg: 'Falta ingresar el nombre de la ficha', target: '#b_nombre' });
  }
  if (previewSections.length === 0) {
    errors.push({ msg: 'Debes agregar al menos una sección', target: '#addSecBtn' });
  } else {
    previewSections.forEach((sec, si) => {
      if (!sec.nombre || !sec.nombre.trim()) {
        errors.push({ msg: `La sección #${si + 1} no tiene título`, target: `[data-secname="${si}"]` });
      }
      if (!sec.items || sec.items.length === 0) {
        errors.push({ msg: `La sección #${si + 1} ("${sec.nombre || 'Sin nombre'}") no tiene indicadores`, target: `[data-additem="${si}"]` });
      } else {
        sec.items.forEach((it, ii) => {
          if (!it.texto || !it.texto.trim()) {
            errors.push({ msg: `El ítem #${ii + 1} en la sección #${si + 1} está vacío`, target: `[data-sec="${si}"][data-item="${ii}"]` });
          }
        });
      }
    });
  }

  // Mini tarjeta resumen
  const curColor = bs.color || (FICHA_PALETTE[0] || {}).hex || '#1E40AF';
  const curPal = FICHA_PALETTE.find(p => p.hex.toLowerCase() === curColor.toLowerCase()) || { hex: curColor, bg: curColor + '18' };

  const miniCardHtml = `
    <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-400);margin-bottom:6px">Así se verá en la lista de fichas:</div>
    <div class="fichaCard previewMiniCard" style="margin-bottom:14px;box-shadow:none;border:1px solid var(--line);cursor:default">
      <div class="fichaCardColorStripe" style="background:${curPal.hex};"></div>
      <div class="fichaCardMain" style="padding:10px 14px">
        <div class="fichaCardIconWrap" style="background:${curPal.bg};color:${curPal.hex};width:38px;height:38px;font-size:20px">
          ${esc(bs.icono || '📋')}
        </div>
        <div class="fichaCardContent">
          <h4 class="fichaCardTitle" style="font-size:14px">${esc(bs.nombre || 'Nombre de la ficha')}</h4>
          <p class="fichaCardDesc" style="font-size:12px">${esc(bs.descripcion || 'Sin descripción.')}</p>
          <div class="fichaCardBadges" style="margin-top:6px">
            <span class="fichaBadge" style="background:#F1F5F9;color:#334155;border:1px solid #CBD5E1;font-weight:600">📁 Grupo: ${esc(bs.grupo || 'Sin grupo')}</span>
            <span class="fichaBadge fichaBadgeModalidad">${esc(bs.modalidad || 'General')}</span>
            <span class="fichaBadge fichaBadgeItems">📑 ${totalSecs} ${totalSecs === 1 ? 'sección' : 'secciones'}</span>
            <span class="fichaBadge fichaBadgeItems">🔢 ${totalItems} ítems</span>
            <span class="fichaBadge fichaBadgeEscala">⚖️ ${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</span>
            ${bs.tieneVisitas ? `<span class="fichaBadge" style="background:#EFF6FF;color:#1D4ED8;border:1px solid #BFDBFE">🕒 ${(bs.visitas || []).length} visitas</span>` : ''}
            ${(bs.tablas && bs.tablas.length > 0) ? `<span class="fichaBadge" style="background:#F0FDF4;color:#15803D;border:1px solid #BBF7D0">📊 ${bs.tablas.length} tablas</span>` : ''}
          </div>
        </div>
      </div>
    </div>
  `;

  // Avisos de validación
  const validationBoxHtml = errors.length > 0 ? `
    <div class="previewValidationBox" style="background:#FFFBEB;border:1px solid #FCD34D;border-radius:8px;padding:10px 14px;margin-bottom:14px">
      <div style="font-weight:700;font-size:12px;color:#92400E;margin-bottom:6px">⚠️ Campos incompletos (${errors.length}) - Haz clic para corregir:</div>
      <ul style="margin:0;padding-left:18px;font-size:12px;color:#B45309">
        ${errors.map(err => `
          <li style="margin-bottom:3px">
            <a href="javascript:void(0)" class="previewValItem" data-target="${esc(err.target)}" style="color:#B45309;text-decoration:underline">
              ${esc(err.msg)}
            </a>
          </li>
        `).join('')}
      </ul>
    </div>
  ` : `
    <div style="background:#ECFDF5;border:1px solid #A7F3D0;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#065F46;display:flex;align-items:center;gap:6px">
      <span>✓</span> <strong>Estructura completa y consistente.</strong> Lista para registrar visitas oficiales.
    </div>
  `;

  const statsBarHtml = `
    <div style="display:flex;gap:10px;font-size:11.5px;color:var(--text-600);margin-bottom:12px;padding:6px 10px;background:var(--surface-2);border-radius:6px;border:1px solid var(--line);flex-wrap:wrap">
      <span>📑 <strong>${totalSecs}</strong> secciones</span>
      <span>🔢 <strong>${totalItems}</strong> indicadores</span>
      <span>⚖️ <strong>${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}</strong></span>
      <span>📐 Regla: <strong>${esc(bs.regla_nivel || 'porcentaje')}</strong></span>
    </div>
  `;

  const impactAlertHtml = (existingCount > 0) ? `
    <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:8px;padding:8px 12px;margin-bottom:14px;font-size:12px;color:#1E40AF;line-height:1.4">
      ℹ️ <strong>Historial:</strong> Esta plantilla tiene <strong>${existingCount}</strong> visita(s) registradas. Las modificaciones se aplicarán a nuevos registros.
    </div>
  ` : '';

  // Barra de Pestañas de Visitas en Preview
  const visitasTabsHtml = bs.tieneVisitas && (bs.visitas || []).length > 0 ? `
    <div class="previewVisitasTabsBar">
      ${(bs.visitas || []).map((vNom, vi) => `
        <button type="button" class="previewVisitaTabBtn ${builderActiveVisitPreview === vi ? 'active' : ''}" data-prev-visit-idx="${vi}">
          ${esc(vNom)}
        </button>
      `).join('')}
    </div>
  ` : '';

  let modeContentHtml = '';

  if (builderPreviewMode === 'formulario') {
    // Modo Formulario de Registro
    let answeredCount = 0;
    let currentScore = 0;
    let maxScore = 0;

    previewSections.forEach((sec, si) => {
      (sec.items || []).forEach((it, ii) => {
        const ansKey = `${builderActiveVisitPreview}_s${si}_i${ii}_${it.id || ii}`;
        const ans = builderTestAnswers[ansKey];
        if (ans !== undefined) {
          answeredCount++;
          if (bs.tipoRespuesta === 'si_no') {
            if (ans === 'si') { currentScore += 1; maxScore += 1; }
            else if (ans === 'no') { maxScore += 1; }
          } else if (bs.tipoRespuesta === 'escala1_3') {
            if (ans !== 'na') { currentScore += Number(ans); maxScore += 3; }
          } else if (bs.tipoRespuesta === 'escala1_5') {
            if (ans !== 'na') { currentScore += Number(ans); maxScore += 5; }
          } else {
            if (ans !== 'na') { currentScore += Number(ans); maxScore += 4; }
          }
        } else {
          if (bs.tipoRespuesta === 'si_no') maxScore += 1;
          else if (bs.tipoRespuesta === 'escala1_3') maxScore += 3;
          else if (bs.tipoRespuesta === 'escala1_5') maxScore += 5;
          else maxScore += 4;
        }
      });
    });

    const pct = maxScore > 0 ? Math.round((currentScore / maxScore) * 100) : 0;
    const testScoreBar = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 12px;background:var(--surface);border:1px solid var(--line);border-radius:6px;margin-bottom:14px">
        <div>
          <div style="font-size:11px;font-weight:700;color:var(--text-600)">Simulación de Calificación en vivo:</div>
          <div style="font-size:11px;color:var(--text-500)">Respondidos: ${answeredCount} de ${totalItems} | Puntaje: ${currentScore} / ${maxScore}</div>
        </div>
        <div style="font-size:18px;font-weight:800;color:${pct >= 70 ? 'var(--green-700)' : pct >= 40 ? 'var(--amber-700)' : 'var(--navy-900)'}">
          ${pct}%
        </div>
      </div>
    `;

    // Tablas especializadas en preview
    const previewTablasHtml = (bs.tablas || []).map((tbl, ti) => {
      const omitirCategoria = tbl.tipo === 'vacia' || tbl.sinColumnaCategoria === true || (tbl.id && String(tbl.id).startsWith('tbl_custom_') && tbl.sinColumnaCategoria !== false);
      const cols = tbl.columnas || [];
      const filas = (tbl.filas && tbl.filas.length > 0 ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }]);
      return `
      <div class="customTableCard" style="margin-bottom:14px;border:1px solid var(--line);border-radius:6px;overflow:hidden">
        <div class="customTableHeader" style="background:var(--navy-900);color:#FFFFFF;padding:8px 12px;font-size:12.5px;font-weight:700">
          ${esc(tbl.titulo || 'Tabla adicional')}
        </div>
        ${tbl.descripcion ? `<div style="font-size:11.5px;color:var(--text-600);padding:6px 12px;background:var(--surface-2)">${esc(tbl.descripcion)}</div>` : ''}
        <div class="tableWrap" style="overflow-x:auto">
          <table class="customDataTable" style="width:100%;font-size:11.5px;border-collapse:collapse">
            <thead>
              <tr style="background:var(--surface-2);border-bottom:1px solid var(--line)">
                ${!omitirCategoria ? `<th style="padding:6px 10px;text-align:left;font-weight:700;color:var(--text-700)">Fila / Categoría</th>` : ''}
                ${cols.map(c => `<th style="padding:6px 10px;text-align:center;font-weight:700;color:var(--text-700)">${esc(c.nombre)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${filas.map((r, ri) => `
                <tr style="border-bottom:1px solid var(--line)">
                  ${!omitirCategoria ? `<td style="padding:6px 10px;font-weight:600;color:var(--text-800)">${esc(r.etiqueta)}</td>` : ''}
                  ${cols.map((c, ci) => {
                    const isFirstCol = ci === 0 && omitirCategoria;
                    return `
                      <td style="padding:4px 8px;text-align:${c.tipo === 'numero' ? 'center' : 'left'}">
                        ${isFirstCol ? esc(r.etiqueta || '') : `<input type="${c.tipo === 'numero' ? 'number' : 'text'}" class="input small" style="width:100%;padding:3px 6px;font-size:11px;text-align:${c.tipo === 'numero' ? 'center' : 'left'}" placeholder="${c.tipo === 'numero' ? '0' : 'texto'}" disabled>`}
                      </td>
                    `;
                  }).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    }).join('');

    // Compromisos en preview
    const previewCompromisosHtml = (bs.compromisos && bs.compromisos.habilitado) ? `
      <div class="previewCompromisosWrap">
        <div style="font-size:12.5px;font-weight:700;color:var(--navy-900);margin-bottom:6px">Sección V: Compromisos de Mejora y Acuerdos</div>
        ${bs.compromisos.director !== false ? `
          <div style="margin-bottom:8px">
            <span style="font-size:11.5px;font-weight:600;color:var(--text-700)">Compromisos del Director(a) / Equipo Directivo:</span>
            <div style="font-size:11px;color:var(--text-400);font-style:italic;margin-top:2px">
              ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `<div>${idx + 1}. [Espacio para compromiso acordado...]</div>`).join('')}
            </div>
          </div>
        ` : ''}
        ${bs.compromisos.especialista !== false ? `
          <div>
            <span style="font-size:11.5px;font-weight:600;color:var(--text-700)">Compromisos del Especialista / Monitor UGEL:</span>
            <div style="font-size:11px;color:var(--text-400);font-style:italic;margin-top:2px">
              ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `<div>${idx + 1}. [Espacio para compromiso y asistencia técnica...]</div>`).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    ` : '';

    modeContentHtml = `
      <div class="previewFormSheet" style="background:var(--surface);border:1px solid var(--line);border-radius:8px;padding:14px">
        ${visitasTabsHtml}

        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--surface-2);border:1px dashed var(--line);border-radius:6px;padding:8px 12px;margin-bottom:14px">
          <div style="font-size:12px;color:var(--text-600)">🧪 <strong>Modo prueba:</strong> Marca respuestas para simular el cálculo de puntaje en vivo.</div>
          <button type="button" class="btn secondary small" id="btnResetTest" style="padding:2px 8px;font-size:11px">Limpiar prueba</button>
        </div>

        ${testScoreBar}

        <!-- Simulación de cabecera -->
        <div style="background:var(--surface-2);border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:12px">
          <div style="font-weight:700;color:var(--text-700);margin-bottom:6px">Datos de la Visita (Simulación):</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><strong>I.E.:</strong> <span style="color:var(--text-500)">I.E. 1153 Alfonso Ugarte</span></div>
            <div><strong>Fecha:</strong> <span style="color:var(--text-500)">2026-10-14</span></div>
            <div><strong>Momento / Visita:</strong> <span style="color:var(--primary);font-weight:700">${esc(bs.tieneVisitas && bs.visitas && bs.visitas[builderActiveVisitPreview] ? bs.visitas[builderActiveVisitPreview] : 'Visita 1')}</span></div>
            ${(bs.extras || []).map(ex => {
              if (ex.tipo === 'select') {
                const opts = (ex.opciones || 'Opción 1, Opción 2').split(',').map(o => o.trim()).filter(Boolean);
                return `<div><strong>${esc(ex.label)}:</strong> <span style="color:var(--text-600)">[${esc(opts[0] || 'Selector')}]</span></div>`;
              }
              return `<div><strong>${esc(ex.label)}:</strong> <span style="color:var(--text-400)">[${esc(ex.tipo)}]</span></div>`;
            }).join('')}
          </div>
        </div>

        <!-- Tablas Especializadas -->
        ${previewTablasHtml}

        <!-- Secciones e Indicadores -->
        ${previewSections.map((sec, si) => `
          <div style="border:1px solid var(--line);border-radius:6px;margin-bottom:12px;overflow:hidden">
            <div style="background:var(--navy-900);color:#FFFFFF;padding:8px 12px;font-weight:700;font-size:12.5px">
              ${esc(sec.nombre || `Sección ${si + 1}`)}
            </div>
            <div style="padding:10px 12px">
              ${(sec.items || []).map((it, ii) => {
                const ansKey = `${builderActiveVisitPreview}_s${si}_i${ii}_${it.id || ii}`;
                const ans = builderTestAnswers[ansKey];
                return `
                  <div style="padding:8px 0;border-bottom:1px solid var(--line);display:flex;flex-direction:column;gap:6px">
                    <div style="display:flex;gap:8px;align-items:flex-start">
                      <span style="font-weight:700;color:var(--text-500);font-size:12px">${it.id ? esc(it.id) : (si + 1) + '.' + (ii + 1)}</span>
                      <span style="font-size:12.5px;color:var(--text-800);flex:1">${esc(it.texto || 'Sin texto')}</span>
                    </div>
                    ${it.evidencia ? `<div style="font-size:11px;color:var(--text-500);padding-left:24px">📎 Evidencia: ${esc(it.evidencia)}</div>` : ''}
                    <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;font-size:11.5px">
                      ${renderItemResponseInputs(it, bs.tipoRespuesta, ans, ansKey)}
                    </div>
                  </div>
                `;
              }).join('') || '<p style="font-size:11.5px;color:var(--text-400);margin:4px 0">Sin indicadores en esta sección.</p>'}
            </div>
          </div>
        `).join('') || '<p style="font-size:12px;color:var(--text-400)">Sin secciones agregadas.</p>'}

        <!-- Compromisos de Mejora -->
        ${previewCompromisosHtml}
      </div>
    `;
  } else {
    // Modo Documento Oficial Impreso
    modeContentHtml = `
      <div class="previewDocSheet" style="background:#FFFFFF;border:1px solid var(--line-strong);border-radius:6px;padding:20px;font-family:var(--sans);color:#1F2937">
        <div style="text-align:center;border-bottom:2px solid #1E3A8A;padding-bottom:10px;margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;letter-spacing:1px;color:#4B5563;text-transform:uppercase">Ministerio de Educación – DRE Lima Metropolitana</div>
          <div style="font-size:13px;font-weight:800;letter-spacing:0.5px;color:#1E3A8A;margin:2px 0">UNIDAD DE GESTIÓN EDUCATIVA LOCAL N° 03</div>
          <div style="font-size:10.5px;color:#6B7280">Panel de Monitoreo y Asistencia Técnica 2026</div>
          <h3 style="font-size:15px;font-weight:800;margin:10px 0 4px;color:#1E40AF;text-transform:uppercase">${esc(bs.nombre || 'NOMBRE DE LA FICHA')}</h3>
          <div style="font-size:11px;font-weight:600;color:#4B5563">
            Modalidad: ${esc(bs.modalidad || 'General')} – Versión: ${esc(bs.version || '2026.1')} – Escala: ${esc(RESPONSE_LABELS[bs.tipoRespuesta] || bs.tipoRespuesta)}
          </div>
        </div>

        <!-- Metadatos de Cabecera Oficial -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;font-size:11px">
          <tr>
            <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700;width:25%">Institución Educativa:</td>
            <td style="border:1px solid #D1D5DB;padding:4px 8px;width:40%">[Nombre de la I.E.]</td>
            <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700;width:15%">Cód. Modular:</td>
            <td style="border:1px solid #D1D5DB;padding:4px 8px">[0123456]</td>
          </tr>
          <tr>
            <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">Red Educativa:</td>
            <td style="border:1px solid #D1D5DB;padding:4px 8px">[REI 01]</td>
            <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">Fecha / N° Visita:</td>
            <td style="border:1px solid #D1D5DB;padding:4px 8px">[DD/MM/AAAA – ${esc(bs.tieneVisitas && bs.visitas && bs.visitas[builderActiveVisitPreview] ? bs.visitas[builderActiveVisitPreview] : 'Visita 1')}]</td>
          </tr>
          ${(bs.extras || []).map(ex => `
            <tr>
              <td style="border:1px solid #D1D5DB;padding:4px 8px;background:#F3F4F6;font-weight:700">${esc(ex.label)}:</td>
              <td colspan="3" style="border:1px solid #D1D5DB;padding:4px 8px;color:#6B7280">[${esc(ex.tipo)}]</td>
            </tr>
          `).join('')}
        </table>

        <!-- Tablas Especializadas en Documento -->
        ${(bs.tablas || []).map(tbl => {
          const omitirCategoria = tbl.tipo === 'vacia' || tbl.sinColumnaCategoria === true || (tbl.id && String(tbl.id).startsWith('tbl_custom_') && tbl.sinColumnaCategoria !== false);
          const filas = (tbl.filas && tbl.filas.length > 0 ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }]);
          return `
          <div style="margin-bottom:14px">
            <div style="font-size:11px;font-weight:700;color:#1E3A8A;margin-bottom:4px">${esc(tbl.titulo)}</div>
            <table style="width:100%;border-collapse:collapse;font-size:10px;margin-bottom:6px">
              <thead>
                <tr style="background:#F3F4F6">
                  ${!omitirCategoria ? `<th style="border:1px solid #D1D5DB;padding:4px 6px;text-align:left">Fila / Categoría</th>` : ''}
                  ${(tbl.columnas || []).map(col => `<th style="border:1px solid #D1D5DB;padding:4px 6px;text-align:center">${esc(col.nombre)}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${filas.map((r, ri) => `
                  <tr>
                    ${!omitirCategoria ? `<td style="border:1px solid #D1D5DB;padding:3px 6px;font-weight:600">${esc(r.etiqueta)}</td>` : ''}
                    ${(tbl.columnas || []).map((col, ci) => {
                      const isFirstCol = ci === 0 && omitirCategoria;
                      return `
                        <td style="border:1px solid #D1D5DB;padding:3px 6px;text-align:${col.tipo === 'numero' ? 'center' : 'left'};font-weight:${isFirstCol ? '600' : 'normal'}">
                          ${isFirstCol ? esc(r.etiqueta || '') : '____'}
                        </td>
                      `;
                    }).join('')}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
        }).join('')}

        <!-- Tabla de Dimensiones e Indicadores -->
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;font-size:10.5px">
          <thead>
            <tr style="background:#1E3A8A;color:#FFFFFF">
              <th style="border:1px solid #1E3A8A;padding:5px;width:36px;text-align:center">N°</th>
              <th style="border:1px solid #1E3A8A;padding:5px;text-align:left">Dimensión / Criterio / Indicador</th>
              <th style="border:1px solid #1E3A8A;padding:5px;width:140px;text-align:left">Evidencia sugerida</th>
              <th style="border:1px solid #1E3A8A;padding:5px;width:80px;text-align:center">Valoración</th>
            </tr>
          </thead>
          <tbody>
            ${previewSections.map((sec, si) => `
              <tr style="background:#F9FAFB;font-weight:700">
                <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#1E3A8A">#${si + 1}</td>
                <td colspan="3" style="border:1px solid #E5E7EB;padding:4px;text-transform:uppercase;color:#111827">${esc(sec.nombre || 'Sección sin título')}</td>
              </tr>
              ${(sec.items || []).map((it, ii) => {
                const itCode = it.id || ((si + 1) + '.' + (ii + 1));
                return `
                  <tr>
                    <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#6B7280">${esc(itCode)}</td>
                    <td style="border:1px solid #E5E7EB;padding:4px">${esc(it.texto || 'Indicador sin texto')}</td>
                    <td style="border:1px solid #E5E7EB;padding:4px;font-size:9.5px;color:#4B5563">${esc(it.evidencia || '-')}</td>
                    <td style="border:1px solid #E5E7EB;padding:4px;text-align:center;color:#9CA3AF">[____]</td>
                  </tr>
                `;
              }).join('')}
            `).join('')}
          </tbody>
        </table>

        <!-- Compromisos en Documento -->
        ${(bs.compromisos && bs.compromisos.habilitado) ? `
          <div style="margin-bottom:20px;border:1px solid #D1D5DB;padding:10px;border-radius:4px">
            <div style="font-weight:700;font-size:11px;color:#1E3A8A;margin-bottom:6px">SECCIÓN V: COMPROMISOS Y ACUERDOS INSTITUCIONALES</div>
            <div style="font-size:10px;color:#4B5563">
              ${Array.from({ length: bs.compromisos.filasPorVisita || 3 }).map((_, idx) => `
                <div style="border-bottom:1px dotted #9CA3AF;padding:4px 0">${idx + 1}. ____________________________________________________________________________________</div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Bloque de Firmas Institucionales -->
        <div style="display:flex;justify-content:space-around;gap:20px;margin-top:24px;padding-top:16px">
          <div style="flex:1;text-align:center">
            <div style="border-top:1px dashed #4B5563;width:75%;margin:0 auto 4px"></div>
            <div style="font-size:10.5px;font-weight:700;color:#111827">Firma y Sello del Director(a)</div>
            <div style="font-size:9.5px;color:#6B7280">Institución Educativa</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="border-top:1px dashed #4B5563;width:75%;margin:0 auto 4px"></div>
            <div style="font-size:10.5px;font-weight:700;color:#111827">Firma y Sello del Especialista</div>
            <div style="font-size:9.5px;color:#6B7280">UGEL 03 – DRELM</div>
          </div>
        </div>
      </div>
    `;
  }

  return miniCardHtml + validationBoxHtml + statsBarHtml + impactAlertHtml + modeContentHtml;
}

export function attachPreviewEvents(previewBox, options) {
  if (!previewBox || !options) return;
  const {
    container,
    setBuilderActiveVisitPreview,
    updatePreviewOnly,
    builderTestAnswers,
    onSwitchMobileTab
  } = options;

  // Cambiar de visita simulada en tabs de vista previa
  previewBox.querySelectorAll('[data-prev-visit-idx]').forEach(btn => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.prevVisitIdx, 10) || 0;
      if (setBuilderActiveVisitPreview) setBuilderActiveVisitPreview(idx);
      updatePreviewOnly();
    };
  });

  // Clic en avisos o enlaces de edición para saltar al campo del editor
  previewBox.querySelectorAll('.previewValItem').forEach(link => {
    link.onclick = (e) => {
      e.preventDefault();
      const targetSel = link.dataset.target;
      if (!targetSel) return;

      if (onSwitchMobileTab) onSwitchMobileTab('editor');

      const targetEl = container ? container.querySelector(targetSel) : document.querySelector(targetSel);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (targetEl.focus) targetEl.focus();
        targetEl.classList.add('itemHighlightFlash');
        setTimeout(() => targetEl.classList.remove('itemHighlightFlash'), 1600);
      }
    };
  });

  // Modo prueba: radios interactivos
  previewBox.querySelectorAll('[data-test-item]').forEach(radio => {
    radio.onchange = (e) => {
      const itemKey = e.target.dataset.testItem;
      if (builderTestAnswers) builderTestAnswers[itemKey] = e.target.value;
      updatePreviewOnly();
    };
  });

  // Limpiar prueba
  const btnReset = previewBox.querySelector('#btnResetTest');
  if (btnReset) {
    btnReset.onclick = () => {
      if (builderTestAnswers) {
        Object.keys(builderTestAnswers).forEach(k => delete builderTestAnswers[k]);
      }
      updatePreviewOnly();
    };
  }
}

