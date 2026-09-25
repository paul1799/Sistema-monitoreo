/* =========================================================================
   plantillaEngine.js — Motor de tipos de bloque para el sistema de plantillas
   UGEL 03 · AGEBRE · Fase 2

   Este módulo define el esquema de bloques que extienden la estructura base
   de fichaTypes (secciones → items) con nuevas capacidades:
   hallazgos por ítem, subcampos numéricos, matriz de rúbricas, compromisos,
   campos de persona, multi-visita, etc.

   Compatible con ES6 modules (browser) y Node.js (tests).
   ========================================================================= */

/* ─────────────────────────────────────────────────────────────────────────
   CATÁLOGO DE TIPOS DE BLOQUE
   Cada bloque en ft.bloques[] tiene { tipo, ... }
   ─────────────────────────────────────────────────────────────────────────

   datos_ie          — Cabecera con campos vinculados al padrón de colegios
   persona           — Datos de quien atiende la visita (directivo, CP, CT)
   items_valorables  — Sección de ítems con escala + hallazgos opcionales
   items_multi_visita — Ítems valorables con columnas V1/V2/V3
   tabla_numerica    — Tabla de datos cuantitativos (cantidad de docentes, etc.)
   matriz_rubricas   — Tabla docentes monitoreados × rúbricas × niveles
   compromisos       — Lista dinámica de compromisos director/especialista
   texto_libre       — Campo de observaciones generales
   firmas            — Bloque de firmas (renderizado solo en PDF)
   separador         — Línea visual + título de sección
   ───────────────────────────────────────────────────────────────────────── */

export const TIPOS_BLOQUE = [
  'datos_ie',
  'persona',
  'items_valorables',
  'items_multi_visita',
  'tabla_numerica',
  'matriz_rubricas',
  'compromisos',
  'texto_libre',
  'firmas',
  'separador',
];

/* ─────────────────────────────────────────────────────────────────────────
   TIPOS DE RESPUESTA POR ESCALA
   ───────────────────────────────────────────────────────────────────────── */

export const OPCIONES_ESCALA = {
  SI_NO_NA: [
    { v: 'si',  l: 'Sí',        color: '#16a34a' },
    { v: 'no',  l: 'No',        color: '#dc2626' },
    { v: 'na',  l: 'N/A',       color: '#94a3b8' },
  ],
  IPL: [
    { v: 'logrado',  l: 'Logrado',  color: '#16a34a' },
    { v: 'proceso',  l: 'Proceso',  color: '#d97706' },
    { v: 'inicio',   l: 'Inicio',   color: '#dc2626' },
  ],
  IPL_NA: [
    { v: 'logrado',  l: 'Logrado',        color: '#16a34a' },
    { v: 'proceso',  l: 'Proceso',        color: '#d97706' },
    { v: 'inicio',   l: 'Inicio',         color: '#dc2626' },
    { v: 'nc',       l: 'No corresponde', color: '#94a3b8' },
  ],
  NIVEL_1_4: [
    { v: '1', l: 'I',   color: '#dc2626' },
    { v: '2', l: 'II',  color: '#d97706' },
    { v: '3', l: 'III', color: '#2563eb' },
    { v: '4', l: 'IV',  color: '#16a34a' },
  ],
};

/* Niveles de rúbrica MINEDU (1–4) — para la matriz_rubricas */
export const NIVELES_RUBRICA = ['I', 'II', 'III', 'IV'];

/* Rúbricas de observación de aula MINEDU */
export const RUBRICAS_MINEDU = [
  { id: 'R1', corto: 'R1', nombre: 'Involucra activamente a los estudiantes en el proceso de aprendizaje' },
  { id: 'R2', corto: 'R2', nombre: 'Promueve el razonamiento, la creatividad y/o el pensamiento crítico' },
  { id: 'R3', corto: 'R3', nombre: 'Evalúa el progreso de los aprendizajes para retroalimentar a los estudiantes y adecuar la enseñanza' },
  { id: 'R4', corto: 'R4', nombre: 'Propicia un ambiente de respeto y proximidad' },
  { id: 'R5', corto: 'R5', nombre: 'Regula positivamente el comportamiento de los estudiantes' },
];

/* ─────────────────────────────────────────────────────────────────────────
   VALIDACIÓN DE BLOQUES
   ─────────────────────────────────────────────────────────────────────────
   Cada función devuelve [] si no hay errores, o [string] con mensajes.
   ───────────────────────────────────────────────────────────────────────── */

export function validarBloque(bloque) {
  const errs = [];
  if (!bloque || !bloque.tipo) {
    errs.push('El bloque no tiene tipo.');
    return errs;
  }
  if (!TIPOS_BLOQUE.includes(bloque.tipo)) {
    errs.push(`Tipo de bloque desconocido: "${bloque.tipo}"`);
  }
  switch (bloque.tipo) {
    case 'items_valorables':
    case 'items_multi_visita':
      if (!Array.isArray(bloque.secciones) || bloque.secciones.length === 0) {
        errs.push(`Bloque ${bloque.tipo} requiere al menos una sección.`);
      }
      if (!bloque.escala || !OPCIONES_ESCALA[bloque.escala]) {
        errs.push(`Bloque ${bloque.tipo} requiere escala válida (${Object.keys(OPCIONES_ESCALA).join(', ')}).`);
      }
      break;
    case 'matriz_rubricas':
      if (!Array.isArray(bloque.rubricas) || bloque.rubricas.length === 0) {
        errs.push('Bloque matriz_rubricas requiere al menos una rúbrica.');
      }
      break;
    case 'persona':
      if (!Array.isArray(bloque.campos) || bloque.campos.length === 0) {
        errs.push('Bloque persona requiere al menos un campo.');
      }
      break;
    case 'tabla_numerica':
      if (!Array.isArray(bloque.columnas) || bloque.columnas.length === 0) {
        errs.push('Bloque tabla_numerica requiere al menos una columna.');
      }
      break;
  }
  return errs;
}

export function validarFichaType(ft) {
  const errs = [];
  if (!ft.nombre) errs.push('La plantilla no tiene nombre.');
  if (!ft.escala && !ft.tipoRespuesta) errs.push('La plantilla no tiene escala definida.');

  // Si usa el nuevo sistema de bloques
  if (Array.isArray(ft.bloques)) {
    ft.bloques.forEach((b, i) => {
      const bErrs = validarBloque(b);
      bErrs.forEach(e => errs.push(`Bloque ${i + 1}: ${e}`));
    });
  }
  // Si usa el sistema legacy de secciones
  else if (!Array.isArray(ft.secciones) || ft.secciones.length === 0) {
    errs.push('La plantilla necesita bloques[] o secciones[].');
  }

  return errs;
}

/* ─────────────────────────────────────────────────────────────────────────
   RENDERIZADOR DE BLOQUES — genera HTML del formulario de registro
   ─────────────────────────────────────────────────────────────────────────
   renderBloques(ft, { values?, readonly?, visitaNumero? }) → string HTML
   ───────────────────────────────────────────────────────────────────────── */

function esc(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Renderiza el formulario de registro para una fichaType con bloques.
 *
 * @param {Object} ft - fichaType con campo bloques[]
 * @param {Object} opts
 * @param {Object}  opts.values       - {[id]: valor} con valores existentes
 * @param {boolean} opts.readonly     - Si true, campos no editables
 * @param {number}  opts.visitaNumero - 1, 2 o 3 (para bloques multi-visita)
 * @returns {string} HTML
 */
export function renderBloques(ft, opts = {}) {
  if (!Array.isArray(ft.bloques) || ft.bloques.length === 0) {
    return '<p style="color:var(--text-muted)">Esta plantilla no tiene bloques definidos.</p>';
  }

  const { values = {}, readonly = false, visitaNumero = 1 } = opts;
  const ro = readonly ? ' readonly disabled' : '';

  return ft.bloques.map((bloque, bi) => {
    switch (bloque.tipo) {
      case 'separador':
        return renderSeparador(bloque);
      case 'datos_ie':
        return renderDatosIe(bloque, values, ro);
      case 'persona':
        return renderPersona(bloque, bi, values, ro);
      case 'items_valorables':
        return renderItemsValorables(bloque, bi, values, ro);
      case 'items_multi_visita':
        return renderItemsMultiVisita(bloque, bi, values, visitaNumero, ro);
      case 'tabla_numerica':
        return renderTablaNumerica(bloque, bi, values, ro);
      case 'matriz_rubricas':
        return renderMatrizRubricas(bloque, bi, values, ro, visitaNumero);
      case 'compromisos':
        return renderCompromisos(bloque, bi, values, ro);
      case 'texto_libre':
        return renderTextoLibre(bloque, bi, values, ro);
      case 'firmas':
        return ''; // Solo en PDF
      default:
        return `<div class="bloque-desconocido">⚠ Tipo de bloque desconocido: ${esc(bloque.tipo)}</div>`;
    }
  }).join('');
}

/* ── Separador ──────────────────────────────────────────────────────────── */
function renderSeparador(b) {
  return `
    <div class="bloqueSeparador" style="margin:18px 0 8px;border-top:2px solid var(--primary-light);padding-top:10px">
      ${b.titulo ? `<h4 style="font-size:14px;font-weight:700;color:var(--primary);margin:0">${esc(b.titulo)}</h4>` : ''}
      ${b.subtitulo ? `<p style="font-size:12px;color:var(--text-muted);margin:2px 0 0">${esc(b.subtitulo)}</p>` : ''}
    </div>`;
}

/* ── Datos IE ───────────────────────────────────────────────────────────── */
function renderDatosIe(b, values, ro) {
  const campos = b.campos || [
    { id: 'ex_ie', label: 'Institución Educativa', tipo: 'ie_autocomplete', required: true },
    { id: 'ex_codigo_local', label: 'Código Local', tipo: 'texto' },
    { id: 'ex_rei', label: 'RED / REI', tipo: 'texto' },
    { id: 'ex_ugel', label: 'UGEL', tipo: 'texto', valor_fijo: 'UGEL 03' },
    { id: 'ex_distrito', label: 'Distrito', tipo: 'texto' },
  ];

  const rows = campos.map(campo => {
    const val = esc(values[campo.id] || campo.valor_fijo || '');
    const req = campo.required ? ' required' : '';

    if (campo.tipo === 'ie_autocomplete') {
      return `
        <div class="field ieSearchWrap" style="flex:1 1 280px">
          <label class="fieldLabel">${esc(campo.label)}${campo.required ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
          <input type="text" class="input ieAutocompleteInp" id="datos_ie_${esc(campo.id)}"
            data-bloque-id="${esc(campo.id)}" placeholder="Nombre o código de la I.E."
            value="${val}" autocomplete="off" ${ro}${req}>
          <div class="ieDropdown" style="display:none"></div>
          <div class="ieHint respHint" style="display:none;font-size:11px;color:var(--primary);margin-top:3px"></div>
        </div>`;
    }

    return `
      <div class="field" style="flex:1 1 180px">
        <label class="fieldLabel">${esc(campo.label)}</label>
        <input type="text" class="input" id="datos_ie_${esc(campo.id)}"
          data-bloque-id="${esc(campo.id)}" value="${val}" ${ro}
          placeholder="${esc(campo.label)}">
      </div>`;
  }).join('');

  return `
    <div class="bloquePanel" data-bloque-tipo="datos_ie" style="background:var(--surface-2);border-radius:10px;padding:14px 16px;margin-bottom:12px">
      <h4 class="bloqueTitulo" style="font-size:13px;font-weight:700;color:var(--primary);margin:0 0 10px">
        🏫 ${esc(b.titulo || 'Datos de la I.E.')}
      </h4>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${rows}
      </div>
    </div>`;
}

/* ── Persona ────────────────────────────────────────────────────────────── */
function renderPersona(b, bi, values, ro) {
  const campos = b.campos || [];
  const rows = campos.map(campo => {
    const val = esc(values[campo.id] || '');
    const req = campo.required ? ' required' : '';
    const width = campo.ancho || '200px';

    if (campo.tipo === 'select' && Array.isArray(campo.opciones)) {
      const opts = campo.opciones.map(o => `<option value="${esc(o)}" ${val === o ? 'selected' : ''}>${esc(o)}</option>`).join('');
      return `
        <div class="field" style="flex:1 1 ${width}">
          <label class="fieldLabel">${esc(campo.label)}</label>
          <select class="input" id="persona_${bi}_${esc(campo.id)}"
            data-bloque-id="${esc(campo.id)}" ${ro}${req}>
            <option value="">— Seleccionar —</option>
            ${opts}
          </select>
        </div>`;
    }

    return `
      <div class="field" style="flex:1 1 ${width}">
        <label class="fieldLabel">${esc(campo.label)}${campo.required ? ' <span style="color:var(--danger)">*</span>' : ''}</label>
        <input type="${campo.tipo === 'dni' ? 'text' : 'text'}" class="input"
          id="persona_${bi}_${esc(campo.id)}" data-bloque-id="${esc(campo.id)}"
          value="${val}" placeholder="${esc(campo.label)}" ${ro}${req}
          ${campo.tipo === 'dni' ? 'maxlength="8" inputmode="numeric"' : ''}>
      </div>`;
  }).join('');

  return `
    <div class="bloquePanel" data-bloque-tipo="persona" style="background:#EFF6FF;border-radius:10px;padding:14px 16px;margin-bottom:12px">
      <h4 class="bloqueTitulo" style="font-size:13px;font-weight:700;color:#1d4ed8;margin:0 0 10px">
        👤 ${esc(b.titulo || 'Datos del funcionario')}
        ${b.subtitulo ? `<span style="font-weight:400;font-size:11px;color:var(--text-muted)"> — ${esc(b.subtitulo)}</span>` : ''}
      </h4>
      <div style="display:flex;flex-wrap:wrap;gap:10px">
        ${rows}
      </div>
    </div>`;
}

/* ── Items Valorables ───────────────────────────────────────────────────── */
function renderItemsValorables(b, bi, values, ro) {
  const escala = b.escala || 'SI_NO_NA';
  const opciones = OPCIONES_ESCALA[escala] || OPCIONES_ESCALA.SI_NO_NA;
  const tieneHallazgos = !!b.con_hallazgos;

  const secciones = (b.secciones || []).map((sec, si) => {
    const items = (sec.items || []).map((item, ii) => {
      const val = values[item.id] || '';
      const btns = opciones.map(op => {
        const checked = val === op.v ? 'checked' : '';
        return `
          <label class="escalaBtn" style="--color:${op.color}">
            <input type="radio" name="item_${bi}_${esc(item.id)}"
              value="${esc(op.v)}" ${checked} data-item-id="${esc(item.id)}" ${ro}>
            <span>${esc(op.l)}</span>
          </label>`;
      }).join('');

      // Subcampos numéricos opcionales (ej: cantidad CP, CT visitados)
      const subcampos = (item.subcampos || []).map(sc => {
        const scVal = esc(values[sc.id] || '');
        return `
          <div class="subcampoWrap" style="display:inline-flex;align-items:center;gap:4px;margin-left:8px">
            <label style="font-size:11px;color:var(--text-muted)">${esc(sc.label)}:</label>
            <input type="number" class="input" style="width:56px;padding:2px 6px;font-size:12px"
              id="sc_${esc(sc.id)}" data-item-id="${esc(sc.id)}"
              value="${scVal}" min="0" ${ro}>
          </div>`;
      }).join('');

      const hallazgoVal = esc(values[item.id + '_hallazgo'] || '');
      const hallazgoHtml = tieneHallazgos ? `
        <div class="hallazgoWrap" style="margin-top:4px">
          <input type="text" class="input" style="font-size:12px;padding:4px 8px"
            placeholder="Hallazgo u observación (opcional)"
            id="hallazgo_${esc(item.id)}" data-item-id="${esc(item.id)}_hallazgo"
            value="${hallazgoVal}" ${ro}>
        </div>` : '';

      return `
        <tr class="itemRow" data-item-num="${ii + 1}">
          <td class="itemNum">${(sec.numRomano ? sec.numRomano + '.' : '') + (ii + 1)}</td>
          <td class="itemTexto">${esc(item.texto)}${item.evidencia ? `<div class="itemEvidencia">📎 ${esc(item.evidencia)}</div>` : ''}</td>
          <td class="itemEscala">
            <div class="escalaBtnGroup">${btns}</div>
            ${subcampos}
            ${hallazgoHtml}
          </td>
        </tr>`;
    }).join('');

    return `
      <div class="seccionBlock" style="margin-bottom:14px">
        <div class="seccionHeader" style="background:var(--primary-light);padding:6px 12px;border-radius:6px 6px 0 0;font-weight:700;font-size:12.5px;color:var(--primary)">
          ${sec.numRomano ? `<span style="margin-right:6px">${esc(sec.numRomano)}.</span>` : ''}
          ${esc(sec.nombre)}
          <span style="font-weight:400;color:var(--text-muted);font-size:11px">(${(sec.items||[]).length} ítem${(sec.items||[]).length !== 1 ? 's' : ''})</span>
        </div>
        <div class="tblWrap">
          <table class="itemTable fichaTable">
            <thead><tr>
              <th style="width:40px">N.°</th>
              <th>Indicador / Ítem</th>
              <th style="width:220px">Valoración</th>
            </tr></thead>
            <tbody>${items}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="bloquePanel" data-bloque-tipo="items_valorables" style="margin-bottom:16px">
      ${b.titulo ? `<h4 class="bloqueTitulo" style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0 0 10px">${esc(b.titulo)}</h4>` : ''}
      ${secciones}
    </div>`;
}

/* ── Items Multi-Visita (V1 / V2 / V3) ─────────────────────────────────── */
function renderItemsMultiVisita(b, bi, values, visitaNumero, ro) {
  const visitas = b.visitas || [1, 2, 3];
  const escala = b.escala || 'IPL_NA';
  const opciones = OPCIONES_ESCALA[escala] || OPCIONES_ESCALA.IPL_NA;

  const headers = visitas.map(v =>
    `<th style="text-align:center;min-width:90px;background:${v === visitaNumero ? 'var(--primary-tint)' : ''}">
      V${v}${v === visitaNumero ? ' ←' : ''}
    </th>`
  ).join('');

  const secciones = (b.secciones || []).map((sec, si) => {
    const rows = (sec.items || []).map((item, ii) => {
      const celdas = visitas.map(v => {
        const key = `${item.id}_v${v}`;
        const val = values[key] || '';
        if (v !== visitaNumero) {
          // Visita no activa: solo lectura
          const found = opciones.find(o => o.v === val);
          return `<td style="text-align:center;padding:4px">
            ${found ? `<span class="badge" style="background:${found.color}20;color:${found.color};border:1px solid ${found.color}40">${esc(found.l)}</span>` : '<span style="color:var(--text-muted)">—</span>'}
          </td>`;
        }
        const btns = opciones.map(op => {
          const checked = val === op.v ? 'checked' : '';
          return `<label class="escalaBtn esBtn-sm" style="--color:${op.color}">
            <input type="radio" name="item_${bi}_${esc(item.id)}_v${v}"
              value="${esc(op.v)}" ${checked} data-item-id="${esc(key)}" ${ro}>
            <span>${esc(op.l)}</span>
          </label>`;
        }).join('');
        return `<td style="padding:4px"><div class="escalaBtnGroup" style="flex-direction:column;gap:2px">${btns}</div></td>`;
      }).join('');

      return `
        <tr>
          <td class="itemNum">${ii + 1}</td>
          <td class="itemTexto">${esc(item.texto)}</td>
          ${celdas}
        </tr>`;
    }).join('');

    return `
      <div class="seccionBlock" style="margin-bottom:14px">
        <div class="seccionHeader" style="background:var(--primary-light);padding:6px 12px;border-radius:6px 6px 0 0;font-weight:700;font-size:12.5px;color:var(--primary)">
          ${esc(sec.nombre)}
        </div>
        <div class="tblWrap"><table class="itemTable fichaTable">
          <thead><tr>
            <th style="width:40px">N.°</th>
            <th>Indicador / Ítem</th>
            ${headers}
          </tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`;
  }).join('');

  return `
    <div class="bloquePanel" data-bloque-tipo="items_multi_visita" style="margin-bottom:16px">
      ${b.titulo ? `<h4 class="bloqueTitulo" style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0 0 6px">${esc(b.titulo)}</h4>` : ''}
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">
        📅 Visita activa: <strong>V${visitaNumero}</strong>. Las otras columnas son de solo lectura.
      </div>
      ${secciones}
    </div>`;
}

/* ── Tabla Numérica ─────────────────────────────────────────────────────── */
function renderTablaNumerica(b, bi, values, ro) {
  const filas = (b.filas || []).map((fila, fi) => {
    const celdas = (b.columnas || []).map((col, ci) => {
      const key = `tabla_${bi}_r${fi}_c${ci}`;
      const val = esc(values[key] || '');
      return `<td><input type="number" class="input" style="width:70px;padding:3px 6px;font-size:12px;text-align:center"
        data-item-id="${esc(key)}" value="${val}" min="0" ${ro}></td>`;
    }).join('');

    return `<tr>
      <td style="font-size:12px;font-weight:600;padding:4px 8px">${esc(fila)}</td>
      ${celdas}
    </tr>`;
  }).join('');

  const headers = (b.columnas || []).map(col =>
    `<th style="text-align:center;font-size:11px;padding:4px 8px">${esc(col)}</th>`
  ).join('');

  return `
    <div class="bloquePanel" data-bloque-tipo="tabla_numerica" style="background:var(--surface-2);border-radius:10px;padding:14px 16px;margin-bottom:12px">
      <h4 class="bloqueTitulo" style="font-size:13px;font-weight:700;color:var(--navy-900);margin:0 0 10px">
        📊 ${esc(b.titulo || 'Datos numéricos')}
      </h4>
      <div class="tblWrap">
        <table class="itemTable">
          <thead><tr>
            <th style="text-align:left;font-size:11px;padding:4px 8px">Categoría</th>
            ${headers}
          </tr></thead>
          <tbody>${filas}</tbody>
        </table>
      </div>
    </div>`;
}

/* ── Matriz de Rúbricas ─────────────────────────────────────────────────── */
function renderMatrizRubricas(b, bi, values, ro, visitaNumero) {
  const rubricas = b.rubricas || RUBRICAS_MINEDU;
  const niveles = NIVELES_RUBRICA;
  const monitoreos = b.monitoreos || [{ id: 'm1', label: '1.er monitoreo' }];

  const tablas = monitoreos.map((mon, mi) => {
    // Filas: docentes (dinámicas)
    const numDocentes = parseInt(values[`${bi}_num_docentes`] || b.num_docentes_default || 5, 10);
    const docRows = Array.from({ length: numDocentes }, (_, di) => {
      const nombreDocente = esc(values[`${bi}_${mon.id}_doc${di}_nombre`] || '');
      const nivelCeldas = rubricas.map(rub => {
        return niveles.map(niv => {
          const key = `${bi}_${mon.id}_doc${di}_${rub.id}_${niv}`;
          const isChecked = values[key] === '1' ? 'checked' : '';
          return `<td style="text-align:center;padding:2px">
            <input type="checkbox" class="rubricaCheck" data-item-id="${esc(key)}" ${isChecked} ${ro}>
          </td>`;
        }).join('');
      }).join('');

      return `<tr>
        <td style="padding:3px 6px;font-size:12px">
          <input type="text" class="input" style="width:100%;padding:2px 6px;font-size:11px"
            placeholder="Nombre docente ${di + 1}"
            data-item-id="${esc(bi + '_' + mon.id + '_doc' + di + '_nombre')}"
            value="${nombreDocente}" ${ro}>
        </td>
        ${nivelCeldas}
      </tr>`;
    }).join('');

    // Encabezados de rúbricas
    const rubHeaders = rubricas.map(rub =>
      `<th colspan="${niveles.length}" style="text-align:center;font-size:10px;padding:3px 4px;max-width:80px;word-break:break-word">
        ${esc(rub.corto)}
      </th>`
    ).join('');
    const nivHeaders = rubricas.map(() =>
      niveles.map(n => `<th style="text-align:center;font-size:10px;width:22px;padding:2px">${n}</th>`).join('')
    ).join('');

    return `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:6px">
          📋 ${esc(mon.label)}
        </div>
        <div class="tblWrap">
          <table class="itemTable" style="font-size:11px">
            <thead>
              <tr>
                <th style="text-align:left;min-width:130px">Docente</th>
                ${rubHeaders}
              </tr>
              <tr>
                <th></th>
                ${nivHeaders}
              </tr>
            </thead>
            <tbody>${docRows}</tbody>
          </table>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="bloquePanel" data-bloque-tipo="matriz_rubricas" style="background:#FFF7ED;border-radius:10px;padding:14px 16px;margin-bottom:12px">
      <h4 class="bloqueTitulo" style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 8px">
        📝 ${esc(b.titulo || 'Monitoreo a docentes — Rúbricas de Observación de Aula (MINEDU)')}
      </h4>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">
        Marque el nivel observado por cada rúbrica para cada docente monitoreado.
        ${b.subtitulo ? esc(b.subtitulo) : ''}
      </div>
      ${tablas}
    </div>`;
}

/* ── Compromisos ────────────────────────────────────────────────────────── */
function renderCompromisos(b, bi, values, ro) {
  const tipos = b.tipos || [
    { id: 'director', label: 'Compromisos del Director(a)' },
    { id: 'monitor',  label: 'Compromisos del Monitor(a) / Especialista' },
  ];

  const secciones = tipos.map(tipo => {
    const items = values[`compromisos_${tipo.id}`] || [];
    const rows = (Array.isArray(items) ? items : []).map((item, idx) => `
      <div class="compromisoRow" style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
        <span style="font-size:11px;color:var(--text-muted);min-width:18px">${idx + 1}.</span>
        <input type="text" class="input" style="flex:1;font-size:12px;padding:4px 8px"
          value="${esc(item)}" placeholder="Escribir compromiso..."
          data-compromiso="${esc(tipo.id)}" data-idx="${idx}" ${ro}>
        ${ro ? '' : `<button type="button" class="btn secondary small" style="padding:2px 6px;font-size:11px"
          data-del-compromiso="${esc(tipo.id)}" data-idx="${idx}" title="Eliminar">✕</button>`}
      </div>`
    ).join('');

    return `
      <div style="margin-bottom:12px">
        <div style="font-size:12px;font-weight:700;color:var(--navy-900);margin-bottom:6px">${esc(tipo.label)}</div>
        <div class="compromisosList" data-tipo="${esc(tipo.id)}">
          ${rows || '<p style="font-size:12px;color:var(--text-muted)">Sin compromisos registrados.</p>'}
        </div>
        ${ro ? '' : `<button type="button" class="btn secondary small" style="margin-top:4px;font-size:12px"
          data-add-compromiso="${esc(tipo.id)}">＋ Agregar compromiso</button>`}
      </div>`;
  }).join('');

  return `
    <div class="bloquePanel" data-bloque-tipo="compromisos" style="background:#F0FDF4;border-radius:10px;padding:14px 16px;margin-bottom:12px">
      <h4 class="bloqueTitulo" style="font-size:13px;font-weight:700;color:#14532d;margin:0 0 10px">
        🤝 ${esc(b.titulo || 'Compromisos de mejora')}
      </h4>
      ${secciones}
    </div>`;
}

/* ── Texto Libre ────────────────────────────────────────────────────────── */
function renderTextoLibre(b, bi, values, ro) {
  const val = esc(values[`texto_libre_${bi}`] || '');
  return `
    <div class="bloquePanel" data-bloque-tipo="texto_libre" style="margin-bottom:12px">
      <label class="fieldLabel" style="font-size:13px;font-weight:700;display:block;margin-bottom:6px">
        📝 ${esc(b.titulo || 'Observaciones generales')}
      </label>
      <textarea class="input" style="width:100%;min-height:80px;resize:vertical;font-size:13px"
        id="texto_libre_${bi}" data-item-id="texto_libre_${bi}"
        placeholder="${esc(b.placeholder || 'Escribir observaciones...')}" ${ro}>${val}</textarea>
    </div>`;
}

/* ─────────────────────────────────────────────────────────────────────────
   RECOLECTOR DE VALORES DEL FORMULARIO
   Lee todos los data-item-id del contenedor y devuelve un mapa {id: valor}
   ───────────────────────────────────────────────────────────────────────── */
export function recolectarValores(container) {
  const values = {};
  container.querySelectorAll('[data-item-id], [data-bloque-id]').forEach(el => {
    const id = el.dataset.itemId || el.dataset.bloqueId;
    if (!id) return;
    if (el.type === 'radio') {
      if (el.checked) values[id] = el.value;
    } else if (el.type === 'checkbox') {
      if (el.checked) values[id] = '1';
      else if (!(id in values)) values[id] = '';
    } else {
      values[id] = el.value;
    }
  });
  return values;
}
