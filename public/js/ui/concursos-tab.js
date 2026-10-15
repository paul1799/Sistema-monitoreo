/* =========================================================================
   concursos-tab.js — Módulo integral de concursos escolares y educativos:
                      JMA, ONEM, El Perú Lee, Eureka, JFEN, JEDPA, Robótica
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import {
  esc,
  genId,
  todayStr,
  fmtDate,
  showToast,
  normalizeText,
  normalizeReiNumber,
  normalizeReiList,
  downloadCsv,
  cleanForFirestore,
  lockBodyScroll,
  unlockBodyScroll,
  forceResetBodyScroll,
  formatearNombre
} from './core-utils.js?v=20261015_v1';

export function parseArteDisciplina(disciplinaStr) {
  if (!disciplinaStr || !String(disciplinaStr).trim()) {
    return { arte: '—', disciplina: '—', full: '—' };
  }
  const s = String(disciplinaStr).trim();
  const parts = s.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return { arte: parts[0], disciplina: parts.slice(1).join(' / '), full: s };
  }
  return { arte: '—', disciplina: s, full: s };
}

export function getFormatoPdfConcurso(tipoConcurso) {
  if (!tipoConcurso) return 'tabular';
  if (tipoConcurso.formato_pdf_actas) return tipoConcurso.formato_pdf_actas;
  if (tipoConcurso.formatoPdfActas) return tipoConcurso.formatoPdfActas;
  const id = String(tipoConcurso.id || '').toLowerCase().trim();
  const nom = String(tipoConcurso.nombre || '').toLowerCase().trim();
  if (id === 'jfen' || nom.includes('jfen') || nom.includes('florales')) {
    return 'fichas_por_categoria';
  }
  return 'tabular';
}

export function getConcursoConfig(tipoConcurso) {
  const nom = (typeof tipoConcurso === 'string' ? tipoConcurso : (tipoConcurso?.nombre || '')).toLowerCase();
  const id = (typeof tipoConcurso === 'string' ? tipoConcurso : (tipoConcurso?.id || '')).toLowerCase();
  if (id.includes('jedpa') || nom.includes('jedpa') || nom.includes('deportivos')) {
    return {
      etiqueta_columna_asesor: 'Delegado / Entrenador',
      etiqueta_asesor_plural: 'Cuerpo técnico'
    };
  }
  return {
    etiqueta_columna_asesor: 'Docente Asesor',
    etiqueta_asesor_plural: 'Docentes asesores'
  };
}

export const SEED_CONCURSOS_DEFAULTS = [
  {
    id: 'jma',
    nombre: 'Premio Nacional de Narrativa y Ensayo José María Arguedas',
    tipoParticipacion: 'individual',
    tieneGenero: false,
    tieneDisciplina: false,
    tieneTituloTrabajo: true,
    etiquetaTitulo: 'Título del trabajo',
    categorias: ['A - Fábula', 'B - Cuento (EBA)', 'C - Ensayo (EBR)', 'D - Ensayo (EBA)'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: [],
    camposPodio: ['categoria'],
    formato_pdf_actas: 'tabular'
  },
  {
    id: 'onem',
    nombre: 'Olimpiada Nacional Escolar de Matemática (ONEM)',
    tipoParticipacion: 'individual',
    tieneGenero: false,
    tieneDisciplina: false,
    tieneTituloTrabajo: false,
    categorias: [
      'Alfa - Nivel 1',
      'Alfa - Nivel 2',
      'Alfa - Nivel 3',
      'Beta - Nivel 1',
      'Beta - Nivel 2',
      'Beta - Nivel 3'
    ],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: [],
    camposPodio: ['categoria'],
    formato_pdf_actas: 'tabular'
  },
  {
    id: 'peru_lee',
    nombre: 'Concurso Nacional de Comprensión Lectora El Perú Lee',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Área / Modalidad',
    tieneTituloTrabajo: false,
    categorias: ['A', 'B', 'C', 'D', 'E'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: ['Comprensión Lectora', 'Lectura Crítica', 'Creación Literaria'],
    camposPodio: ['categoria', 'disciplina'],
    formato_pdf_actas: 'tabular'
  },
  {
    id: 'eureka',
    nombre: 'Feria Escolar Nacional de Ciencia y Tecnología Eureka',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Área de participación',
    tieneTituloTrabajo: true,
    etiquetaTitulo: 'Título del proyecto',
    categorias: ['D', 'E'],
    disciplinasSugeridas: ['Indagación Científica', 'Soluciones Tecnológicas', 'Indagación Social'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor(a)'],
    camposPodio: ['categoria', 'disciplina'],
    formato_pdf_actas: 'tabular'
  },
  {
    id: 'jfen',
    nombre: 'Juegos Florales Escolares Nacionales (JFEN)',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Arte / Disciplina',
    tieneTituloTrabajo: false,
    categorias: ['D', 'E', 'F', 'H'],
    disciplinasSugeridas: [
      'Artes escénicas / Danza tradicional',
      'Artes escénicas / Danza moderna',
      'Artes escénicas / Teatro',
      'Artes musicales / Canto solista',
      'Artes musicales / Ensamble instrumental',
      'Artes visuales / Pintura',
      'Artes visuales / Fotografía',
      'Artes visuales / Escultura',
      'Artes literarias / Poesía',
      'Artes digitales / Cortometraje'
    ],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    camposPodio: ['categoria', 'disciplina'],
    formato_pdf_actas: 'fichas_por_categoria'
  },
  {
    id: 'jedpa',
    nombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    tipoParticipacion: 'mixto',
    tieneGenero: true,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Disciplina deportiva',
    tieneTituloTrabajo: false,
    categorias: ['A', 'B', 'C'],
    disciplinasSugeridas: [
      'Ajedrez',
      'Atletismo',
      'Básquet',
      'Fútbol',
      'Futsal',
      'Voleibol',
      'Vóley de Playa',
      'Balonmano / Handball',
      'Natación',
      'Gimnasia',
      'Tenis de Mesa',
      'Judo',
      'Karate',
      'Taekwondo',
      'Bádminton',
      'Paraatletismo',
      'Paranatación'
    ],
    disciplinasDetalle: [
      { nombre: 'Básquet', modalidad: 'colectiva' },
      { nombre: 'Fútbol', modalidad: 'colectiva' },
      { nombre: 'Futsal', modalidad: 'colectiva' },
      { nombre: 'Voleibol', modalidad: 'colectiva' },
      { nombre: 'Vóley de Playa', modalidad: 'colectiva' },
      { nombre: 'Balonmano / Handball', modalidad: 'colectiva' },
      { nombre: 'Atletismo', modalidad: 'individual' },
      { nombre: 'Natación', modalidad: 'individual' },
      { nombre: 'Ajedrez', modalidad: 'individual' },
      { nombre: 'Gimnasia', modalidad: 'individual' },
      { nombre: 'Tenis de Mesa', modalidad: 'individual' },
      { nombre: 'Judo', modalidad: 'individual' },
      { nombre: 'Karate', modalidad: 'individual' },
      { nombre: 'Taekwondo', modalidad: 'individual' },
      { nombre: 'Bádminton', modalidad: 'individual' },
      { nombre: 'Paraatletismo', modalidad: 'individual' },
      { nombre: 'Paranatación', modalidad: 'individual' }
    ],
    rolesParticipante: ['Deportista', 'Estudiante'],
    rolesAsesor: ['Entrenador', 'Docente Asesor', 'Delegado'],
    camposPodio: ['categoria', 'disciplina', 'genero'],
    formato_pdf_actas: 'hibrido'
  }
];

/* -------------------------------------------------------------
   HELPERS DE ROLES DINÁMICOS POR TIPO DE CONCURSO (JEDPA Y OFICIALES)
   ------------------------------------------------------------- */
export function isJedpaConcurso(tipo) {
  if (!tipo) return false;
  const id = String(tipo.id || '').toLowerCase().trim();
  const nom = String(tipo.nombre || '').toLowerCase().trim();
  return id === 'jedpa' || nom.includes('jedpa') || nom.includes('deportiv');
}

export function getConcursoAsesorRoles(tipo) {
  if (!tipo) return ['Docente Asesor'];
  const isJedpa = isJedpaConcurso(tipo);
  let roles = Array.isArray(tipo.rolesAsesor) && tipo.rolesAsesor.length > 0
    ? [...tipo.rolesAsesor]
    : [];

  if (isJedpa) {
    const jedpaMandatory = ['Entrenador', 'Docente Asesor', 'Delegado'];
    jedpaMandatory.forEach(r => {
      if (!roles.includes(r)) roles.push(r);
    });
    roles = ['Entrenador', ...roles.filter(r => r !== 'Entrenador')];
    return roles;
  }

  if (roles.length === 0) {
    const def = SEED_CONCURSOS_DEFAULTS.find(d => d.id === tipo.id || (tipo.nombre && d.nombre.toLowerCase() === tipo.nombre.toLowerCase()));
    if (def && Array.isArray(def.rolesAsesor) && def.rolesAsesor.length) {
      return [...def.rolesAsesor];
    }
    return ['Docente Asesor'];
  }
  return roles;
}

export function getConcursoParticipanteRoles(tipo) {
  if (!tipo) return ['Estudiante'];
  const isJedpa = isJedpaConcurso(tipo);
  let roles = Array.isArray(tipo.rolesParticipante) && tipo.rolesParticipante.length > 0
    ? [...tipo.rolesParticipante]
    : [];

  if (isJedpa) {
    const jedpaMandatory = ['Deportista', 'Estudiante'];
    jedpaMandatory.forEach(r => {
      if (!roles.includes(r)) roles.push(r);
    });
    roles = ['Deportista', ...roles.filter(r => r !== 'Deportista')];
    return roles;
  }

  if (roles.length === 0) {
    const def = SEED_CONCURSOS_DEFAULTS.find(d => d.id === tipo.id || (tipo.nombre && d.nombre.toLowerCase() === tipo.nombre.toLowerCase()));
    if (def && Array.isArray(def.rolesParticipante) && def.rolesParticipante.length) {
      return [...def.rolesParticipante];
    }
    return ['Estudiante'];
  }
  return roles;
}

/* -------------------------------------------------------------
   HELPERS DE PODIO Y GÉNERO
   ------------------------------------------------------------- */
export function normalizeGenero(val) {
  if (!val) return 'sin_genero';
  const s = normalizeText(val);
  if (!s || s === '—' || s === '-' || s === 'sin genero' || s === 'sin_genero') return 'sin_genero';
  if (['damas', 'dama', 'femenino', 'f', 'd'].includes(s)) return 'damas';
  if (['varones', 'varon', 'masculino', 'm', 'v'].includes(s)) return 'varones';
  if (s.includes('mixt')) return 'mixto';
  return s;
}

export function formatGeneroDisplay(val) {
  const norm = normalizeGenero(val);
  if (norm === 'damas') return 'Damas';
  if (norm === 'varones') return 'Varones';
  if (norm === 'mixto') return 'Mixto';
  if (norm === 'sin_genero') return 'Sin género';
  return val ? String(val).trim() : 'Sin género';
}

export function getPodioFields(tipo) {
  if (tipo && Array.isArray(tipo.camposPodio) && tipo.camposPodio.length > 0) {
    return tipo.camposPodio;
  }
  if (tipo && (tipo.tieneGenero || tipo.id === 'jedpa')) {
    return ['categoria', 'disciplina', 'genero'];
  }
  if (tipo && (tipo.tieneDisciplina || tipo.id === 'peru_lee')) {
    return ['categoria', 'disciplina'];
  }
  return ['categoria'];
}

export function getPodioKey(reg, tipo) {
  const tId = tipo ? (tipo.id || tipo.nombre) : (reg.tipoConcursoId || reg.tipoConcursoNombre || 'general');
  const etapa = (reg.etapa || 'UGEL').trim().toUpperCase();
  const fields = getPodioFields(tipo);

  const parts = [
    normalizeText(tId),
    etapa
  ];

  if (fields.includes('categoria')) {
    parts.push(normalizeText(reg.categoria || 'unica'));
  }
  if (fields.includes('disciplina')) {
    parts.push(normalizeText(reg.disciplina || 'general'));
  }
  if (fields.includes('genero')) {
    parts.push(normalizeGenero(reg.genero));
  }
  if (fields.includes('modalidad') || reg.modalidad) {
    parts.push(normalizeText(reg.modalidad || ''));
  }
  if (fields.includes('prueba') || reg.prueba || reg.evento) {
    parts.push(normalizeText(reg.prueba || reg.evento || ''));
  }

  return parts.join('|');
}

export function getPodioLabel(reg, tipo) {
  const fields = getPodioFields(tipo);
  const parts = [];

  if (fields.includes('disciplina') && reg.disciplina) {
    parts.push(reg.disciplina.trim().toUpperCase());
  }
  if (reg.categoria) {
    parts.push(`Categoría ${reg.categoria.trim()}`);
  }
  if (fields.includes('genero')) {
    parts.push(formatGeneroDisplay(reg.genero).toUpperCase());
  }
  if (reg.modalidad) {
    parts.push(reg.modalidad.trim());
  }
  if (reg.prueba || reg.evento) {
    parts.push((reg.prueba || reg.evento).trim());
  }
  parts.push(`Etapa ${(reg.etapa || 'UGEL').trim().toUpperCase()}`);

  return parts.join(' · ');
}

export function getPodioLockDocId(podioKey, puestoVal) {
  const safePodio = podioKey.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  const safePuesto = normalizePuestoValue(puestoVal).replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  return `lock_${safePodio}_${safePuesto}`.slice(0, 120);
}

let concursoSubTab = 'consolidado'; // 'consolidado' | 'registrar' | 'asignar_podios' | 'asistente' | 'tipos'
export function getConcursoSubTab() {
  return concursoSubTab;
}
export function setConcursoSubTab(tab) {
  concursoSubTab = tab;
}
let concursoSelectedTipoId = null;
let concursoEditingId = null;
let concursoEditingData = null;
let concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: '' }];
let concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: '' }];
let concursoSelectedColegioId = null;

// Filtros para Consolidado
let concursoFilters = {
  tipoId: '',
  etapa: '',
  categoria: [],
  genero: '',
  disciplina: '',
  arte: '',
  modalidad: '',
  query: ''
};
let concursoVistaJfen = 'fichas'; // 'fichas' | 'tabla' (predeterminada en 'fichas' para JFEN)
let concursoExpandedId = null;
let concursoCategoryDropdownOpen = false;
let concursoCategorySearchText = '';
let concursoCategoryListScrollTop = 0;

export function getSelectedCategorias() {
  if (Array.isArray(concursoFilters.categoria)) {
    return concursoFilters.categoria;
  }
  if (typeof concursoFilters.categoria === 'string' && concursoFilters.categoria.trim()) {
    if (concursoFilters.categoria.includes(',')) {
      return concursoFilters.categoria.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [concursoFilters.categoria.trim()];
  }
  return [];
}

export function setSelectedCategorias(cats) {
  if (!cats || cats.length === 0) {
    concursoFilters.categoria = [];
  } else if (Array.isArray(cats)) {
    concursoFilters.categoria = [...new Set(cats.map(c => String(c).trim()).filter(Boolean))];
  } else {
    concursoFilters.categoria = [String(cats).trim()];
  }
}

export function renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate) {
  // Asegurar que state.tiposConcurso y state.concursoRegistros existan
  state.tiposConcurso = state.tiposConcurso || [];
  state.concursoRegistros = state.concursoRegistros || [];

  // Si no hay tipos seleccionados y hay tipos disponibles, preseleccionar el primero
  if (!concursoSelectedTipoId && state.tiposConcurso.length > 0) {
    concursoSelectedTipoId = state.tiposConcurso[0].id;
  }

  // Autocura de roles oficiales para JEDPA en Firestore si el usuario es admin y faltan roles
  if (isAdmin && dbNs && Array.isArray(state.tiposConcurso)) {
    const jedpaDoc = state.tiposConcurso.find(t => isJedpaConcurso(t));
    if (jedpaDoc) {
      const hasEntrenador = Array.isArray(jedpaDoc.rolesAsesor) && jedpaDoc.rolesAsesor.includes('Entrenador');
      const hasDocenteAsesor = Array.isArray(jedpaDoc.rolesAsesor) && jedpaDoc.rolesAsesor.includes('Docente Asesor');
      const hasDeportista = Array.isArray(jedpaDoc.rolesParticipante) && jedpaDoc.rolesParticipante.includes('Deportista');
      if (!hasEntrenador || !hasDocenteAsesor || !hasDeportista) {
        const fixedAsesor = getConcursoAsesorRoles(jedpaDoc);
        const fixedPart = getConcursoParticipanteRoles(jedpaDoc);
        jedpaDoc.rolesAsesor = fixedAsesor;
        jedpaDoc.rolesParticipante = fixedPart;
        dbNs.collection('tiposConcurso').doc(jedpaDoc.id).set({
          rolesAsesor: fixedAsesor,
          rolesParticipante: fixedPart,
          updatedAt: Date.now()
        }, { merge: true }).catch(err => console.warn('Aviso sincronizando roles JEDPA:', err));
      }
    }
  }

  // Definir sub-pestañas disponibles
  const subTabs = [
    { id: 'registrar', label: '➕ Registrar participante' },
    { id: 'consolidado', label: '📊 Ver consolidado' },
    { id: 'asignar_podios', label: '🏆 Asignar puestos' },
    { id: 'asistente', label: '🔤 Revisar nombres' },
  ];
  if (isAdmin) {
    subTabs.push({ id: 'tipos', label: '⚙ Tipos de concurso' });
  }

  // Si un no-admin quedó en subpestaña 'tipos', redirigir a 'registrar'
  if (!isAdmin && concursoSubTab === 'tipos') {
    concursoSubTab = 'registrar';
  }

  const subTabButtonsHtml = subTabs.map(t =>
    '<button type="button" class="subTabBtn' + (concursoSubTab === t.id ? ' active' : '') + '" data-csubtab="' + t.id + '">' + t.label + '</button>'
  ).join('');

  container.innerHTML = '' +
    '<div class="pageHead">' +
    '<h2>Concursos Escolares</h2>' +
    '<p>Registro, premiación y consolidado de participantes de concursos oficiales (JMA, ONEM, Eureka, JFEN, JEDPA y más).</p>' +
    '</div>' +
    '<div class="subTabBar">' + subTabButtonsHtml + '</div>' +
    '<div id="concursoSubHost"></div>';

  container.querySelectorAll('[data-csubtab]').forEach(btn => {
    btn.addEventListener('click', () => {
      setConcursoSubTab(btn.dataset.csubtab);
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  });

  const host = document.getElementById('concursoSubHost');
  if (!host) return;

  if (concursoSubTab === 'registrar') {
    renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'consolidado') {
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'asignar_podios') {
    renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'asistente') {
    renderAsistenteSeparacionNombres(host, state, dbNs, isAdmin, currentUser, container, navigate);
  } else if (concursoSubTab === 'tipos' && isAdmin) {
    renderConcursoTiposCatalogView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  }
}

/* ----------------------------------------------------------------
   ASISTENTE DE SEPARACIÓN DE NOMBRES HEREDADOS
   Identifica registros con datos en el campo "nombres" que contienen
   el nombre completo (sin apellidos separados) y permite al usuario
   revisarlos y guardar la separación manualmente.
   No modifica datos salvo confirmación explícita por registro.
   ---------------------------------------------------------------- */
function renderAsistenteSeparacionNombres(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const regs = state.concursoRegistros || [];

  // Recopilar todas las personas con formato heredado (apellidos vacío, nombres con texto)
  const heredados = [];
  regs.forEach(reg => {
    const personas = [
      ...(reg.participantes || []).map((p, i) => ({ ...p, _regId: reg.id, _tipo: 'participantes', _idx: i, _regInst: reg.institucion || '', _regConc: reg.tipoConcursoNombre || reg.tipoConcurso || '' })),
      ...(reg.asesores || []).map((a, i) => ({ ...a, _regId: reg.id, _tipo: 'asesores', _idx: i, _regInst: reg.institucion || '', _regConc: reg.tipoConcursoNombre || reg.tipoConcurso || '' }))
    ];
    personas.forEach(p => {
      const nombres = (p.nombres || '').trim();
      const apellidos = (p.apellidos || '').trim();
      if (!apellidos && nombres) {
        const prop = proponerSeparacionNombre(p);
        heredados.push({ persona: p, prop });
      }
    });
  });

  if (heredados.length === 0) {
    host.innerHTML =
      '<div class="empty">' +
      '<h4>✅ Sin nombres heredados por revisar</h4>' +
      '<p>Todos los registros tienen Nombres y Apellidos separados correctamente.</p>' +
      '</div>';
    return;
  }

  const altaConfianza = heredados.filter(h => h.prop.confianza === 'alta');

  const renderItem = (h, idx) => {
    const p = h.persona;
    const prop = h.prop;
    const confianzaClass = prop.confianza === 'alta' ? 'sep-alta' : 'sep-baja';
    const confianzaLabel = prop.confianza === 'alta' ? '⬆ Confianza alta' : '⚠ Revisar manualmente';
    return '<div class="sepItem ' + confianzaClass + '" data-sep-idx="' + idx + '">' +
      '<div class="sepItemHead">' +
      '<span class="badge" style="background:var(--surface-2);font-size:11px">' + esc(p._regConc) + '</span>' +
      '<span class="badge" style="background:var(--surface-2);font-size:11px">' + esc(p._regInst) + '</span>' +
      '<span class="badge ' + confianzaClass + '-badge" style="font-size:11px">' + confianzaLabel + '</span>' +
      '<span style="margin-left:auto;font-size:11px;color:var(--ink-soft)">' + (p._tipo === 'participantes' ? 'Participante' : 'Asesor') + ' #' + (p._idx + 1) + '</span>' +
      '</div>' +
      '<div class="sepItemBody">' +
      '<div class="sepOriginal">' +
      '<label>Texto original (campo nombres)</label>' +
      '<span class="sepOriginalText">' + esc(p.nombres || '') + '</span>' +
      '</div>' +
      '<div class="personNameGrid">' +
      '<div class="field">' +
      '<label for="sep_nom_' + idx + '">NOMBRES *</label>' +
      '<input type="text" id="sep_nom_' + idx + '" class="sepInputNom" value="' + esc(prop.nombres) + '" data-sep-idx="' + idx + '" autocapitalize="words">' +
      '<span class="fieldHelp">Solo los nombres de pila</span>' +
      '</div>' +
      '<div class="field">' +
      '<label for="sep_ap_' + idx + '">APELLIDOS *</label>' +
      '<input type="text" id="sep_ap_' + idx + '" class="sepInputAp" value="' + esc(prop.apellidos) + '" data-sep-idx="' + idx + '" autocapitalize="words">' +
      '<span class="fieldHelp">Apellido paterno y materno</span>' +
      '</div>' +
      '</div>' +
      (prop.nota ? '<span class="fieldWarn">' + esc(prop.nota) + '</span>' : '') +
      '<div class="sepActions">' +
      '<button type="button" class="btn small sepGuardarBtn" data-sep-idx="' + idx + '">💾 Guardar separación</button>' +
      '<button type="button" class="btn secondary small sepOmitirBtn" data-sep-idx="' + idx + '">Omitir</button>' +
      '</div>' +
      '</div>' +
      '</div>';
  };

  host.innerHTML =
    '<div class="panel">' +
    '<h3>🔤 Asistente de separación de nombres</h3>' +
    '<p style="color:var(--ink-soft);font-size:13.5px;margin-bottom:16px">' +
    'Se encontraron <strong>' + heredados.length + '</strong> personas con el nombre completo en un solo campo.<br>' +
    'Revisa y guarda la separación Nombres / Apellidos registro por registro.<br>' +
    '<strong>Ningún cambio se aplica automáticamente</strong> — cada uno requiere tu confirmación.' +
    '</p>' +
    (altaConfianza.length > 0 && isAdmin
      ? '<div class="sepBulkBar">' +
      '<span>' + altaConfianza.length + ' de confianza alta listos para revisar</span>' +
      '</div>'
      : '') +
    '<div id="sepList">' +
    heredados.map((h, i) => renderItem(h, i)).join('') +
    '</div>' +
    '</div>';

  // Guardar separación individual
  host.querySelectorAll('.sepGuardarBtn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.sepIdx);
      const h = heredados[idx];
      if (!h) return;

      const nomInput = document.getElementById('sep_nom_' + idx);
      const apInput = document.getElementById('sep_ap_' + idx);
      const nomVal = (nomInput?.value || '').trim();
      const apVal = (apInput?.value || '').trim();

      if (!nomVal || nomVal.length < 2) { showToast('Ingresa los Nombres (mínimo 2 caracteres).'); return; }
      if (!apVal || apVal.length < 2) { showToast('Ingresa los Apellidos (mínimo 2 caracteres).'); return; }

      btn.disabled = true;
      btn.textContent = 'Guardando...';

      try {
        const reg = regs.find(r => r.id === h.persona._regId);
        if (!reg) throw new Error('Registro no encontrado');

        const lista = JSON.parse(JSON.stringify(reg[h.persona._tipo] || []));
        lista[h.persona._idx].nombres = nomVal;
        lista[h.persona._idx].apellidos = apVal;

        await dbNs.collection('concursoRegistros').doc(h.persona._regId).update({ [h.persona._tipo]: lista });
        showToast('✓ Separación guardada correctamente.');

        // Ocultar el item guardado con transición suave
        const sepEl = host.querySelector('[data-sep-idx="' + idx + '"]');
        if (sepEl) {
          sepEl.style.transition = 'opacity 0.35s';
          sepEl.style.opacity = '0';
          setTimeout(() => sepEl.remove(), 380);
        }
      } catch (err) {
        console.error('Error guardando separación:', err);
        showToast('Error al guardar: ' + err.message);
        btn.disabled = false;
        btn.textContent = '💾 Guardar separación';
      }
    });
  });

  // Omitir item (sin guardar)
  host.querySelectorAll('.sepOmitirBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.sepIdx);
      const sepEl = host.querySelector('[data-sep-idx="' + idx + '"]');
      if (sepEl) {
        sepEl.style.transition = 'opacity 0.3s';
        sepEl.style.opacity = '0';
        setTimeout(() => sepEl.remove(), 350);
      }
    });
  });
}

function normalizePuestoValue(val) {
  if (!val) return '';
  const s = String(val).trim().toLowerCase();
  if (s.includes('1') || s.startsWith('primer')) return '1.er puesto';
  if (s.includes('2') || s.startsWith('segundo')) return '2.° puesto';
  if (s.includes('3') || s.startsWith('tercer')) return '3.er puesto';
  if (s.includes('menci') || s.includes('honrosa') || s.includes('mh')) return 'Mención honrosa';
  if (s.includes('final')) return 'Finalista';
  if (s.includes('clasif')) return 'Clasificado';
  if (s.includes('partic')) return 'Participante';
  return String(val).trim();
}

function formatPuestoBadge(puesto) {
  if (!puesto) return '<span class="badge badge-puesto">—</span>';
  const norm = normalizePuestoValue(puesto);
  if (norm === '1.er puesto') {
    return '<span class="badge badge-puesto puesto-1">🥇 1.er puesto</span>';
  }
  if (norm === '2.° puesto') {
    return '<span class="badge badge-puesto puesto-2">🥈 2.° puesto</span>';
  }
  if (norm === '3.er puesto') {
    return '<span class="badge badge-puesto puesto-3">🥉 3.er puesto</span>';
  }
  if (norm === 'Mención honrosa') {
    return '<span class="badge badge-puesto puesto-mh">🎖️ Mención honrosa</span>';
  }
  return '<span class="badge badge-puesto puesto-part">' + esc(puesto) + '</span>';
}

/* -------------------------------------------------------------
   SUB-PESTAÑA 1: REGISTRAR PARTICIPANTE / PROYECTO
   ------------------------------------------------------------- */
function renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  // Si no hay tipos de concurso en el catálogo
  if (state.tiposConcurso.length === 0) {
    host.innerHTML = fase4Html + '<div class="empty">' +
      '<h4>Aún no hay tipos de concurso configurados</h4>' +
      '<p>Para comenzar a registrar ganadores y participantes, se debe cargar el catálogo de concursos oficiales.</p>' +
      (isAdmin
        ? '<button type="button" class="btn" id="btnSeedConcursosEmpty" style="margin-top:12px">🌱 Sembrar 6 concursos oficiales (UGEL 03 - 2026)</button>'
        : '<p class="helpText">Solicita a un administrador que active los concursos escolares.</p>') +
      '</div>';

    const seedBtn = document.getElementById('btnSeedConcursosEmpty');
    if (seedBtn) {
      seedBtn.addEventListener('click', async () => {
        seedBtn.disabled = true;
        seedBtn.textContent = 'Sembrando concursos...';
        await ejecutarSiembraConcursos(dbNs, state);
        renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
      });
    }
    return;
  }

  // Preseleccionar tipo si no está establecido
  if (!concursoSelectedTipoId && state.tiposConcurso.length > 0) {
    concursoSelectedTipoId = state.tiposConcurso[0].id;
  }

  const tipo = state.tiposConcurso.find(t => t.id === concursoSelectedTipoId) || state.tiposConcurso[0];
  if (!tipo) return;

  const tipoOpts = state.tiposConcurso.map(t =>
    '<option value="' + t.id + '"' + (t.id === tipo.id ? ' selected' : '') + '>' + esc(t.nombre) + ' (' + (t.tipoParticipacion === 'individual' ? 'Individual' : 'Grupal') + ')</option>'
  ).join('');

  const catOpts = (tipo.categorias || []).map(c =>
    '<option value="' + esc(c) + '">' + esc(c) + '</option>'
  ).join('');

  // Sugerencias de disciplinas si el tipo las tiene o es El Perú Lee
  let discSuggestions = tipo.disciplinasSugeridas || [];
  if (tipo.id === 'peru_lee' && (!discSuggestions || discSuggestions.length === 0)) {
    discSuggestions = ['Comprensión Lectora', 'Lectura Crítica', 'Creación Literaria'];
  }
  const discDatalistHtml = (discSuggestions && discSuggestions.length)
    ? '<datalist id="dl_concurso_disc">' + discSuggestions.map(d => '<option value="' + esc(d) + '">').join('') + '</datalist>'
    : '';

  // Determinar roles para participantes y asesores
  const partRoles = getConcursoParticipanteRoles(tipo);
  const asesRoles = getConcursoAsesorRoles(tipo);

  // Asegurar que las listas tengan al menos 1 elemento con roles válidos
  if (!concursoParticipantes || concursoParticipantes.length === 0) {
    concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: partRoles[0] }];
  } else {
    concursoParticipantes.forEach(p => {
      if (!p.rol || (!partRoles.includes(p.rol) && isJedpaConcurso(tipo))) {
        p.rol = partRoles[0];
      }
    });
  }
  if (!concursoAsesores || concursoAsesores.length === 0) {
    concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] }];
  } else {
    concursoAsesores.forEach(a => {
      if (!a.rol || (!asesRoles.includes(a.rol) && isJedpaConcurso(tipo) && a.rol === 'Docente Asesor' && !a.nombres && !a.apellidos)) {
        a.rol = asesRoles[0];
      }
    });
  }

  const isEditing = !!concursoEditingId;
  const submitLabel = isEditing ? 'Actualizar registro' : 'Guardar registro';

  const hasDisciplina = tipo.tieneDisciplina || tipo.id === 'peru_lee';
  const discLabel = tipo.etiquetaDisciplina || (tipo.id === 'peru_lee' ? 'Área / Modalidad' : 'Disciplina / Área');

  host.innerHTML = '' +
    '<form id="concursoRegForm" novalidate>' +
    '<div class="panel">' +
    '<h3>Concurso y Etapa</h3>' +
    '<div class="fieldGrid">' +
    '<div class="field" style="grid-column:span 2">' +
    '<label for="c_tipoSelect">Tipo de concurso *</label>' +
    '<select id="c_tipoSelect">' + tipoOpts + '</select>' +
    '</div>' +
    '<div class="field">' +
    '<label for="c_etapa">Etapa *</label>' +
    '<select id="c_etapa" required>' +
    ['UGEL', 'DRELM', 'MACROREGIONAL', 'NACIONAL'].map(e => '<option value="' + e + '">' + e + '</option>').join('') +
    '</select>' +
    '</div>' +
    '<div class="field" style="position:relative">' +
    '<label for="c_puesto">Puesto obtenido</label>' +
    '<select id="c_puesto">' +
    '<option value="">Sin puesto / Pendiente</option>' +
    '<option value="1.er puesto">🥇 1.er puesto</option>' +
    '<option value="2.° puesto">🥈 2.° puesto</option>' +
    '<option value="3.er puesto">🥉 3.er puesto</option>' +
    '<option value="Mención honrosa">🎖️ Mención honrosa</option>' +
    '<option value="Finalista">⭐ Finalista</option>' +
    '<option value="Clasificado">✓ Clasificado</option>' +
    '<option value="Participante">👤 Participante</option>' +
    '</select>' +
    '<div id="c_puesto_soft_note" style="display:none;font-size:11.5px;color:var(--gold-600, #b45309);margin-top:4px"></div>' +
    '</div>' +
    '</div>' +
    '<div id="c_puesto_conflict_wrap" style="display:none;margin-top:12px"></div>' +
    '</div>' +

    '<div class="panel">' +
    '<h3>Datos de la Participación</h3>' +
    '<div class="fieldGrid">' +
    '<div class="field">' +
    '<label for="c_categoria">Categoría *</label>' +
    '<select id="c_categoria" required>' + catOpts + '</select>' +
    '</div>' +
    (tipo.tieneGenero ? (
      '<div class="field">' +
      '<label for="c_genero">Género *</label>' +
      '<select id="c_genero" required>' +
      '<option value="Damas">Damas</option>' +
      '<option value="Varones">Varones</option>' +
      '</select>' +
      '</div>'
    ) : '') +
    (hasDisciplina ? (
      '<div class="field" style="' + (tipo.tieneGenero ? '' : 'grid-column:span 2') + '">' +
      '<label for="c_disciplina">' + esc(discLabel) + ' *</label>' +
      '<input type="text" id="c_disciplina" list="dl_concurso_disc" placeholder="Ej: Comprensión Lectora, Danza tradicional, Indagación..." required>' +
      discDatalistHtml +
      '</div>'
    ) : (
      '<div class="field" style="' + (tipo.tieneGenero ? '' : 'grid-column:span 2') + '">' +
      '<label for="c_disciplina">Área / Disciplina (opcional)</label>' +
      '<input type="text" id="c_disciplina" placeholder="Opcional: área o especialidad...">' +
      '</div>'
    )) +
    '</div>' +

    '<div class="fieldGrid" style="margin-top:10px">' +
    '<div class="field" style="grid-column:span 2">' +
    '<label for="c_institucion">Institución Educativa *</label>' +
    '<div class="ieSearchWrap" id="c_ieSearchWrap">' +
    '<input type="text" id="c_institucion" autocomplete="off" placeholder="Buscar colegio por nombre o código modular..." required>' +
    '<div class="ieDropdown" id="c_ieDropdown"></div>' +
    '</div>' +
    '<span id="c_colegioHint" style="display:none;font-size:11.5px;color:var(--primary);margin-top:4px;font-weight:600"></span>' +
    '</div>' +
    '<div class="field">' +
    '<label for="c_codigoModular">Código modular / local</label>' +
    '<input type="text" id="c_codigoModular" placeholder="Autocompletado con la I.E.">' +
    '</div>' +
    '<div class="field">' +
    '<label for="c_fecha">Fecha *</label>' +
    '<input type="date" id="c_fecha" value="' + todayStr() + '" required>' +
    '</div>' +
    '</div>' +

    (tipo.tieneTituloTrabajo ? (
      '<div class="fieldGrid" style="margin-top:10px">' +
      '<div class="field" style="grid-column:span 2">' +
      '<label for="c_tituloTrabajo">' + esc(tipo.etiquetaTitulo || 'Título del trabajo / proyecto') + ' *</label>' +
      '<input type="text" id="c_tituloTrabajo" placeholder="Nombre de la obra, proyecto de indagación o ensayo..." required>' +
      '</div>' +
      '<div class="field">' +
      '<label for="c_seudonimo">Seudónimo (opcional)</label>' +
      '<input type="text" id="c_seudonimo" placeholder="Seudónimo del participante...">' +
      '</div>' +
      '</div>'
    ) : '') +

    '<div class="fieldGrid" style="margin-top:10px">' +
    '<div class="field">' +
    '<label for="c_resolucionRef">N° Resolución / Acreditación (opcional)</label>' +
    '<input type="text" id="c_resolucionRef" placeholder="Ej: R.D. N° 00342-2026-UGEL03">' +
    '</div>' +
    '</div>' +
    '</div>' +

    '<!-- PARTICIPANTES REPETIBLES -->' +
    '<div class="panel">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
    '<h3 style="margin-bottom:0">Estudiantes / Participantes <small>(' + (tipo.tipoParticipacion === 'individual' ? 'Normalmente 1 fila para individual' : 'Permite múltiples filas para grupales') + ')</small></h3>' +
    '<button type="button" class="btn secondary small" id="c_addPartBtn">＋ Agregar participante</button>' +
    '</div>' +
    '<div id="c_participantesList"></div>' +
    '</div>' +

    '<!-- ASESORES REPETIBLES -->' +
    '<div class="panel" id="c_asesoresPanel">' +
    '<div id="c_jedpaGroupCtWrap"></div>' +
    '<div id="c_standardAsesoresWrap">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">' +
    '<h3 style="margin-bottom:0" id="c_asesoresTitle">Docentes Asesores / Entrenadores</h3>' +
    '<button type="button" class="btn secondary small" id="c_addAsesBtn">＋ Agregar asesor</button>' +
    '</div>' +
    '<div id="c_asesoresList"></div>' +
    '</div>' +
    '</div>' +

    '<div style="display:flex;gap:12px;margin-top:10px;flex-wrap:wrap">' +
    '<button type="submit" class="btn" id="c_submitBtn">' + submitLabel + '</button>' +
    (isEditing ? '<button type="button" class="btn secondary" id="c_cancelEditBtn">Cancelar edición</button>' : '') +
    '</div>' +
    '</form>';

  // ---- Cambio de tipo de concurso en el formulario ----
  document.getElementById('c_tipoSelect').addEventListener('change', (e) => {
    concursoSelectedTipoId = e.target.value;
    // Adaptar roles de participantes y asesores a las opciones del nuevo tipo
    const newTipo = state.tiposConcurso.find(t => t.id === concursoSelectedTipoId);
    if (newTipo) {
      const newPartRoles = getConcursoParticipanteRoles(newTipo);
      const newAsesRoles = getConcursoAsesorRoles(newTipo);
      const isJedpa = isJedpaConcurso(newTipo);
      concursoParticipantes.forEach(p => {
        if (isJedpa || !newPartRoles.includes(p.rol)) {
          p.rol = newPartRoles[0];
        }
      });
      concursoAsesores.forEach(a => {
        if (isJedpa || !newAsesRoles.includes(a.rol)) {
          a.rol = newAsesRoles[0];
        }
      });
    }
    renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  // ---- Renderizador de filas de Participantes ----
  function renderPartRows() {
    const listEl = document.getElementById('c_participantesList');
    if (!listEl) return;
    listEl.innerHTML = concursoParticipantes.map((p, idx) => {
      const curRol = p.rol || partRoles[0];
      const availableRoles = partRoles.includes(curRol) ? partRoles : [curRol, ...partRoles];
      const rolOpts = availableRoles.map(r =>
        '<option value="' + esc(r) + '"' + (r === curRol ? ' selected' : '') + '>' + esc(r) + '</option>'
      ).join('');
      return '<div class="personRow" data-pidx="' + idx + '">' +
        '<div><label style="margin-bottom:2px;font-size:11px">Nombres y Apellidos *</label><input type="text" placeholder="Nombres o nombre completo" value="' + esc(p.nombres) + '" data-pfield="nombres" required></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Apellidos (opcional)</label><input type="text" placeholder="Apellidos" value="' + esc(p.apellidos) + '" data-pfield="apellidos"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">DNI / Documento</label><input type="text" placeholder="DNI" value="' + esc(p.dni) + '" data-pfield="dni" maxlength="15"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Rol</label><select data-pfield="rol">' + rolOpts + '</select></div>' +
        '<div style="padding-top:16px"><button type="button" class="iconBtn" data-delpart="' + idx + '" title="Quitar participante"' + (concursoParticipantes.length === 1 ? ' disabled' : '') + '>✕</button></div>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('input[data-pfield], select[data-pfield]').forEach(inp => {
      const updateField = (e) => {
        const row = e.target.closest('[data-pidx]');
        if (!row) return;
        const i = Number(row.dataset.pidx);
        concursoParticipantes[i][e.target.dataset.pfield] = e.target.value;
      };
      inp.addEventListener('input', updateField);
      inp.addEventListener('change', updateField);
    });

    listEl.querySelectorAll('[data-delpart]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (concursoParticipantes.length <= 1) return;
        const idx = Number(btn.dataset.delpart);
        concursoParticipantes.splice(idx, 1);
        renderPartRows();
      });
    });
  }

  // ---- Renderizador de filas de Asesores ----
  function renderAsesRows() {
    const listEl = document.getElementById('c_asesoresList');
    if (!listEl) return;
    listEl.innerHTML = concursoAsesores.map((a, idx) => {
      const curRol = a.rol || asesRoles[0];
      const availableRoles = asesRoles.includes(curRol) ? asesRoles : [curRol, ...asesRoles];
      const rolOpts = availableRoles.map(r =>
        '<option value="' + esc(r) + '"' + (r === curRol ? ' selected' : '') + '>' + esc(r) + '</option>'
      ).join('');
      return '<div class="personRow" data-aidx="' + idx + '">' +
        '<div><label style="margin-bottom:2px;font-size:11px">Nombres y Apellidos</label><input type="text" placeholder="Nombres o nombre completo" value="' + esc(a.nombres) + '" data-afield="nombres"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Apellidos (opcional)</label><input type="text" placeholder="Apellidos" value="' + esc(a.apellidos) + '" data-afield="apellidos"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">DNI / Documento</label><input type="text" placeholder="DNI" value="' + esc(a.dni) + '" data-afield="dni" maxlength="15"></div>' +
        '<div><label style="margin-bottom:2px;font-size:11px">Rol</label><select data-afield="rol">' + rolOpts + '</select></div>' +
        '<div style="padding-top:16px"><button type="button" class="iconBtn" data-delases="' + idx + '" title="Quitar asesor">✕</button></div>' +
        '</div>';
    }).join('');

    listEl.querySelectorAll('input[data-afield], select[data-afield]').forEach(inp => {
      const updateField = (e) => {
        const row = e.target.closest('[data-aidx]');
        if (!row) return;
        const i = Number(row.dataset.aidx);
        concursoAsesores[i][e.target.dataset.afield] = e.target.value;
      };
      inp.addEventListener('input', updateField);
      inp.addEventListener('change', updateField);
    });

    listEl.querySelectorAll('[data-delases]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.delases);
        concursoAsesores.splice(idx, 1);
        renderAsesRows();
      });
    });
  }

  document.getElementById('c_addPartBtn').addEventListener('click', () => {
    concursoParticipantes.push({ nombres: '', apellidos: '', dni: '', rol: partRoles[0] });
    renderPartRows();
  });

  document.getElementById('c_addAsesBtn').addEventListener('click', () => {
    concursoAsesores.push({ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] });
    renderAsesRows();
  });

  renderPartRows();
  renderAsesRows();

  // ---- Autocompletado de Colegio / I.E. ----
  const instInput = document.getElementById('c_institucion');
  const dropdown = document.getElementById('c_ieDropdown');
  const hint = document.getElementById('c_colegioHint');
  const codModInp = document.getElementById('c_codigoModular');

  const showDropdown = () => {
    const query = normalizeText(instInput.value);
    const matches = (state.colegios || [])
      .filter(c => !query || normalizeText(c.ie).includes(query) || normalizeText(c.codigoLocal).includes(query))
      .slice(0, 25);
    if (!matches.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = matches.map(c =>
      '<div class="ieDropdownItem" data-id="' + c.id + '">' +
      '<div class="ieDropMain">' + esc(c.ie) + '</div>' +
      '<div class="ieDropSub">' + esc(c.codigoLocal || '') +
      (c.rei ? ' · ' + esc(c.rei) : '') +
      (c.distrito ? ' · ' + esc(c.distrito) : '') +
      '</div>' +
      '</div>'
    ).join('');
    dropdown.style.display = 'block';

    dropdown.querySelectorAll('.ieDropdownItem').forEach(item => {
      item.addEventListener('mousedown', e => {
        e.preventDefault();
        const c = state.colegios.find(x => x.id === item.dataset.id);
        if (c) {
          instInput.value = c.ie || '';
          concursoSelectedColegioId = c.id;
          if (codModInp) codModInp.value = c.codigoLocal || '';
          if (hint) {
            hint.style.display = 'block';
            hint.textContent = '✓ Vinculada al padrón: ' + (c.rei || '') + (c.distrito ? ' · ' + c.distrito : '');
          }
        }
        dropdown.style.display = 'none';
      });
    });
  };

  instInput.addEventListener('input', showDropdown);
  instInput.addEventListener('focus', () => { if (instInput.value.length === 0) showDropdown(); });
  instInput.addEventListener('blur', () => { setTimeout(() => { dropdown.style.display = 'none'; }, 200); });

  // ---- Helper dinámico para anotar opciones ocupadas y alertas de conflicto ----
  function updatePuestoSelectAnnotations() {
    const pSelect = document.getElementById('c_puesto');
    const conflictWrap = document.getElementById('c_puesto_conflict_wrap');
    const softNote = document.getElementById('c_puesto_soft_note');
    if (!pSelect) return;

    const curTipoId = document.getElementById('c_tipoSelect') ? document.getElementById('c_tipoSelect').value : concursoSelectedTipoId;
    const curTipo = state.tiposConcurso.find(t => t.id === curTipoId) || tipo;
    const curEtapa = document.getElementById('c_etapa') ? document.getElementById('c_etapa').value : 'UGEL';
    const curCat = document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '';
    const curGen = document.getElementById('c_genero') ? document.getElementById('c_genero').value : null;
    const curDisc = document.getElementById('c_disciplina') ? document.getElementById('c_disciplina').value.trim() : null;

    const draftReg = {
      tipoConcursoId: curTipo.id,
      tipoConcursoNombre: curTipo.nombre,
      etapa: curEtapa,
      categoria: curCat,
      genero: curGen,
      disciplina: curDisc,
      modalidad: concursoEditingData ? concursoEditingData.modalidad : null,
      prueba: concursoEditingData ? (concursoEditingData.prueba || concursoEditingData.evento) : null
    };

    const draftPodioKey = getPodioKey(draftReg, curTipo);
    const existingRegs = state.concursoRegistros || [];

    // Buscar ocupantes en el mismo podio (excluyendo el registro actual si se edita)
    const podioOccupants = existingRegs.filter(r => {
      if (isEditing && r.id === concursoEditingId) return false;
      return getPodioKey(r, curTipo) === draftPodioKey;
    });

    const topSlots = {
      '1.er puesto': null,
      '2.° puesto': null,
      '3.er puesto': null
    };

    podioOccupants.forEach(r => {
      const normP = normalizePuestoValue(r.puesto);
      if (topSlots.hasOwnProperty(normP)) {
        topSlots[normP] = r;
      }
    });

    // Actualizar texto de opciones en el select
    Array.from(pSelect.options).forEach(opt => {
      const baseVal = opt.value;
      if (baseVal === '') {
        opt.textContent = 'Sin puesto / Pendiente';
      } else if (topSlots.hasOwnProperty(baseVal)) {
        const occ = topSlots[baseVal];
        const icon = baseVal === '1.er puesto' ? '🥇' : (baseVal === '2.° puesto' ? '🥈' : '🥉');
        if (occ) {
          const occPart = (occ.participantes && occ.participantes[0]) ? formatearNombre(occ.participantes[0]) : '';
          const occText = occ.institucion ? (occ.institucion + (occPart ? ' — ' + occPart : '')) : 'ocupado';
          opt.textContent = `${icon} ${baseVal} (ocupado por: ${occText})`;
        } else {
          opt.textContent = `${icon} ${baseVal}`;
        }
      }
    });

    // Validar si la opción seleccionada entra en conflicto
    const rawVal = pSelect.value;
    const curPuestoVal = normalizePuestoValue(rawVal);
    const isEmpate = rawVal.includes('(empate)');

    if (topSlots.hasOwnProperty(curPuestoVal) && topSlots[curPuestoVal] && !isEmpate) {
      const conflict = topSlots[curPuestoVal];
      const podioLabel = getPodioLabel(draftReg, curTipo);
      const conflictPart = (conflict.participantes && conflict.participantes[0])
        ? formatearNombre(conflict.participantes[0])
        : 'Sin participante registrado';

      let warningExtra = '';
      if (!conflict.genero && curTipo.tieneGenero) {
        warningExtra = '<div style="margin-top:6px;font-size:12px;color:var(--danger)">⚠️ Nota: El registro ocupante no tiene género asignado.</div>';
      }

      if (conflictWrap) {
        conflictWrap.style.display = 'block';
        conflictWrap.innerHTML = `
          <div class="alertCard warn" style="margin-top:6px">
            <div class="alertIcon">⚠️</div>
            <div class="alertBody">
              <div class="alertTitle">Puesto ya ocupado en este podio</div>
              <div class="alertDetail">
                Ya existe un <strong>${esc(curPuestoVal)}</strong> en <strong>${esc(podioLabel)}</strong>:<br>
                <strong>${esc(conflict.institucion)}</strong> — ${esc(conflictPart)}.<br>
                Cada podio (disciplina, categoría y género) solo puede tener un ${esc(curPuestoVal)}.
                ${warningExtra}
              </div>
              <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
                <button type="button" class="btn secondary small" id="btnVerConflicto" style="font-size:11.5px">🔍 Ver registro ocupante</button>
                <button type="button" class="btn small" id="btnReemplazarConflicto" style="font-size:11.5px;background:var(--warn);color:#fff;border-color:var(--warn)">🔄 Reemplazar puesto</button>
                ${isAdmin ? '<button type="button" class="btn secondary small" id="btnEmpateConflicto" style="font-size:11.5px">🤝 Marcar empate</button>' : ''}
                <button type="button" class="btn secondary small" id="btnCancelarConflicto" style="font-size:11.5px">✕ Deshacer selección</button>
              </div>
            </div>
          </div>
        `;

        const btnVer = document.getElementById('btnVerConflicto');
        if (btnVer) {
          btnVer.addEventListener('click', () => {
            concursoFilters.tipoId = curTipo.id;
            concursoFilters.etapa = curEtapa;
            concursoFilters.categoria = curCat;
            if (curGen) concursoFilters.genero = curGen;
            if (curDisc) concursoFilters.disciplina = curDisc;
            concursoSubTab = 'consolidado';
            concursoExpandedId = conflict.id;
            renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
          });
        }

        const btnReemp = document.getElementById('btnReemplazarConflicto');
        if (btnReemp) {
          btnReemp.addEventListener('click', () => {
            abrirModalReemplazoPuesto(conflict, draftReg, curPuestoVal, curTipo, dbNs, state, isEditing ? concursoEditingId : null, () => {
              renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
            });
          });
        }

        const btnEmpate = document.getElementById('btnEmpateConflicto');
        if (btnEmpate) {
          btnEmpate.addEventListener('click', () => {
            const motivo = prompt('Ingresa el motivo o Resolución Directoral que sustenta el puesto compartido (Empate):');
            if (!motivo) return;
            const empVal = `${curPuestoVal} (empate)`;
            let existsOpt = Array.from(pSelect.options).some(o => o.value === empVal);
            if (!existsOpt) {
              const opt = document.createElement('option');
              opt.value = empVal;
              opt.textContent = `${empVal} · ${motivo.slice(0, 30)}`;
              pSelect.appendChild(opt);
            }
            pSelect.value = empVal;
            updatePuestoSelectAnnotations();
          });
        }

        const btnCancel = document.getElementById('btnCancelarConflicto');
        if (btnCancel) {
          btnCancel.addEventListener('click', () => {
            pSelect.value = isEditing && concursoEditingData ? (normalizePuestoValue(concursoEditingData.puesto) || '') : '';
            updatePuestoSelectAnnotations();
          });
        }
      }
    } else {
      if (conflictWrap) {
        conflictWrap.style.display = 'none';
        conflictWrap.innerHTML = '';
      }
    }

    // Advertencia suave para saltos de puesto (ej. asignar 3.° sin 1.° ni 2.°)
    if (softNote) {
      if (curPuestoVal === '3.er puesto' && !topSlots['1.er puesto'] && !topSlots['2.° puesto']) {
        softNote.style.display = 'block';
        softNote.textContent = 'ℹ Aviso: Este podio aún no tiene asignado 1.er ni 2.° puesto. Podrás asignarlos posteriormente.';
      } else if (curPuestoVal === '2.° puesto' && !topSlots['1.er puesto']) {
        softNote.style.display = 'block';
        softNote.textContent = 'ℹ Aviso: Este podio aún no tiene asignado 1.er puesto.';
      } else {
        softNote.style.display = 'none';
        softNote.textContent = '';
      }
    }
  }

  // ---- Panel de Cuerpo Técnico para JEDPA ----
  function updateJedpaGroupCtBox() {
    const wrap = document.getElementById('c_jedpaGroupCtWrap');
    const stdWrap = document.getElementById('c_standardAsesoresWrap');
    const titleEl = document.getElementById('c_asesoresTitle');
    if (!wrap || !stdWrap) return;

    const curTipoId = document.getElementById('c_tipoSelect') ? document.getElementById('c_tipoSelect').value : concursoSelectedTipoId;
    const curTipo = state.tiposConcurso.find(t => t.id === curTipoId) || tipo;

    if (!isJedpaConcurso(curTipo)) {
      wrap.innerHTML = '';
      wrap.style.display = 'none';
      stdWrap.style.display = 'block';
      stdWrap.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = false;
      });
      if (titleEl) titleEl.textContent = 'Docentes Asesores';
      return;
    }

    if (titleEl) titleEl.textContent = 'Docentes Asesores / Entrenadores (Cuerpo Técnico JEDPA)';

    const curEtapa = document.getElementById('c_etapa') ? document.getElementById('c_etapa').value : 'UGEL';
    const curCat = document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '';
    const curGen = document.getElementById('c_genero') ? document.getElementById('c_genero').value : null;
    const curDisc = document.getElementById('c_disciplina') ? document.getElementById('c_disciplina').value.trim() : null;

    const dummyReg = {
      tipoConcursoId: curTipo.id,
      tipoConcursoNombre: curTipo.nombre,
      etapa: curEtapa,
      categoria: curCat,
      genero: curGen,
      disciplina: curDisc
    };

    const ctInfo = obtenerCuerpoTecnicoGrupo(dummyReg, state.concursoCuerpoTecnico || [], state.concursoRegistros || []);
    wrap.style.display = 'block';

    if (ctInfo && ctInfo.miembros && ctInfo.miembros.length > 0) {
      const origenText = (ctInfo.esGrupoFormalizado || ctInfo.origen === 'concursoCuerpoTecnico') ? 'Oficial centralizado' : 'Detectado en este grupo';
      wrap.innerHTML = `
        <div style="background:var(--surface-2, #f1f5f9);border-left:4px solid var(--primary, #1e3a8a);border-radius:8px;padding:14px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <strong style="color:var(--navy-900);font-size:13.5px">👥 Delegado / Entrenador del grupo</strong>
                <span class="badge" style="font-size:11px;background:var(--primary-tint, #e0e7ff);color:var(--primary, #3730a3)">${esc(origenText)}</span>
              </div>
              <p style="font-size:12px;color:var(--ink-soft);margin:4px 0 10px">El cuerpo técnico aplica automáticamente a todos los participantes de este grupo (${esc(curEtapa)} · ${esc(curDisc || '—')} · ${esc(curCat || '—')} · ${esc(curGen || '—')}).</p>
            </div>
            ${isAdmin ? '<button type="button" class="btn secondary small" id="c_btnEditGrupoCt" style="font-size:11.5px">✏️ Modificar cuerpo técnico</button>' : ''}
          </div>
          <table style="width:100%;font-size:12.5px;border-collapse:collapse;margin-top:4px">
            <thead>
              <tr style="text-align:left;border-bottom:1.5px solid var(--line);color:var(--ink-soft)">
                <th style="padding:4px 8px;width:120px">Rol</th>
                <th style="padding:4px 8px">Apellidos y Nombres</th>
                <th style="padding:4px 8px;width:110px">DNI / Doc.</th>
              </tr>
            </thead>
            <tbody>
              ${ctInfo.miembros.map(m => `
                <tr style="border-bottom:1px dashed var(--line)">
                  <td style="padding:6px 8px"><span class="badge" style="font-size:10.5px">${esc((m.rol || 'DELEGADO').toUpperCase())}</span></td>
                  <td style="padding:6px 8px"><strong>${esc((m.apellidos || '').toUpperCase())} ${esc((m.nombres || '').toUpperCase())}</strong></td>
                  <td style="padding:6px 8px">${esc(m.dni || '—')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top:12px">
            <label style="font-size:12px;display:flex;align-items:center;gap:6px;cursor:pointer;color:var(--ink)">
              <input type="checkbox" id="c_chkAsesorIndividual">
              <span>Asignar cuerpo técnico individual exclusivo para este registro (excepción)</span>
            </label>
          </div>
        </div>
      `;

      const chk = document.getElementById('c_chkAsesorIndividual');
      const toggleStdWrap = (show) => {
        stdWrap.style.display = show ? 'block' : 'none';
        stdWrap.querySelectorAll('input, select, button').forEach(el => {
          el.disabled = !show;
        });
      };

      if (chk) {
        toggleStdWrap(chk.checked);
        chk.addEventListener('change', () => {
          toggleStdWrap(chk.checked);
        });
      } else {
        toggleStdWrap(false);
      }

      const btnEditCt = document.getElementById('c_btnEditGrupoCt');
      if (btnEditCt) {
        btnEditCt.addEventListener('click', () => {
          openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate);
        });
      }
    } else {
      wrap.innerHTML = `
        <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12.5px;color:#1e40af">
          ℹ️ <strong>Cuerpo Técnico JEDPA:</strong> Este grupo aún no tiene cuerpo técnico registrado. Los asesores y entrenadores ingresados a continuación se asociarán automáticamente al grupo para no tener que repetirlos en los siguientes competidores.
        </div>
      `;
      stdWrap.style.display = 'block';
      stdWrap.querySelectorAll('input, select, button').forEach(el => {
        el.disabled = false;
      });
    }
  }

  // Escuchar cambios de campos que definen el podio y grupo
  const puestoSelectEl = document.getElementById('c_puesto');
  if (puestoSelectEl) puestoSelectEl.addEventListener('change', updatePuestoSelectAnnotations);
  const catSelectEl = document.getElementById('c_categoria');
  if (catSelectEl) catSelectEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
  const genSelectEl = document.getElementById('c_genero');
  if (genSelectEl) genSelectEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
  const discInpEl = document.getElementById('c_disciplina');
  if (discInpEl) {
    discInpEl.addEventListener('input', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
    discInpEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });
  }
  const etapaSelectEl = document.getElementById('c_etapa');
  if (etapaSelectEl) etapaSelectEl.addEventListener('change', () => { updatePuestoSelectAnnotations(); updateJedpaGroupCtBox(); });

  // ---- Precargar datos si estamos en modo edición ----
  if (concursoEditingId && concursoEditingData) {
    const d = concursoEditingData;
    const normPuesto = normalizePuestoValue(d.puesto);
    const puestoSelect = document.getElementById('c_puesto');
    if (puestoSelect) {
      let exists = Array.from(puestoSelect.options).some(o => o.value === normPuesto);
      if (!exists && normPuesto) {
        const opt = document.createElement('option');
        opt.value = normPuesto;
        opt.textContent = normPuesto;
        puestoSelect.appendChild(opt);
      }
      puestoSelect.value = normPuesto || '';
    }
    document.getElementById('c_etapa').value = d.etapa || 'UGEL';
    document.getElementById('c_fecha').value = d.fecha || todayStr();
    document.getElementById('c_institucion').value = d.institucion || '';
    if (codModInp) codModInp.value = d.codigoModular || '';
    if (document.getElementById('c_categoria')) document.getElementById('c_categoria').value = d.categoria || '';
    if (document.getElementById('c_genero')) {
      const normG = normalizeGenero(d.genero);
      document.getElementById('c_genero').value = normG === 'varones' ? 'Varones' : 'Damas';
    }
    if (document.getElementById('c_disciplina')) document.getElementById('c_disciplina').value = d.disciplina || '';
    if (document.getElementById('c_tituloTrabajo')) document.getElementById('c_tituloTrabajo').value = d.tituloTrabajo || '';
    if (document.getElementById('c_seudonimo')) document.getElementById('c_seudonimo').value = d.seudonimo || '';
    if (document.getElementById('c_resolucionRef')) document.getElementById('c_resolucionRef').value = d.resolucionRef || '';

    updatePuestoSelectAnnotations();
    updateJedpaGroupCtBox();

    const cancelBtn = document.getElementById('c_cancelEditBtn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        concursoEditingId = null;
        concursoEditingData = null;
        concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: partRoles[0] }];
        concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] }];
        renderConcursoRegistroView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }
  } else {
    updatePuestoSelectAnnotations();
    updateJedpaGroupCtBox();
  }

  // ---- Submit Formulario de Registro de Concurso ----
  document.getElementById('concursoRegForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('c_submitBtn');
    btn.disabled = true;
    btn.textContent = isEditing ? 'Actualizando...' : 'Guardando...';

    try {
      // ---- Validar participantes ----
      concursoParticipantes.forEach((p, idx) => {
        p.nombres = (p.nombres || '').trim().replace(/\s{2,}/g, ' ');
        p.apellidos = (p.apellidos || '').trim().replace(/\s{2,}/g, ' ');
        p.dni = (p.dni || '').trim();
        if (!p.rol) {
          const sel = document.querySelector(`.personRow[data-pidx="${idx}"] select[data-pfield="rol"]`);
          p.rol = (sel && sel.value) ? sel.value : partRoles[0];
        }
      });
      concursoAsesores.forEach((a, idx) => {
        a.nombres = (a.nombres || '').trim().replace(/\s{2,}/g, ' ');
        a.apellidos = (a.apellidos || '').trim().replace(/\s{2,}/g, ' ');
        a.dni = (a.dni || '').trim();
        if (!a.rol) {
          const sel = document.querySelector(`.personRow[data-aidx="${idx}"] select[data-afield="rol"]`);
          a.rol = (sel && sel.value) ? sel.value : asesRoles[0];
        }
      });

      const namePattern = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'\-\.]+$/u;
      const pRows = concursoParticipantes.filter(p => p.nombres || p.apellidos);
      if (pRows.length === 0) {
        showToast('Agrega al menos un participante con Nombres y Apellidos.');
        btn.disabled = false; btn.textContent = submitLabel; return;
      }

      for (let i = 0; i < pRows.length; i++) {
        const p = pRows[i];
        if (!p.nombres || p.nombres.length < 2) {
          showToast('Participante ' + (i + 1) + ': ingresa los Nombres (mínimo 2 caracteres).');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (p.nombres && !namePattern.test(p.nombres)) {
          showToast('Participante ' + (i + 1) + ': el campo Nombres solo debe contener letras, espacios y guiones.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (!p.apellidos || p.apellidos.length < 2) {
          showToast('Participante ' + (i + 1) + ': ingresa los Apellidos (mínimo 2 caracteres).');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (p.apellidos && !namePattern.test(p.apellidos)) {
          showToast('Participante ' + (i + 1) + ': el campo Apellidos solo debe contener letras, espacios y guiones.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
      }

      // El puesto puede ser vacío (Sin puesto / Pendiente) o un puesto formal
      const rawPuestoVal = document.getElementById('c_puesto').value.trim();
      const puestoVal = normalizePuestoValue(rawPuestoVal) || rawPuestoVal;

      // Validar asesores (opcional)
      const aRows = concursoAsesores.filter(a => a.nombres || a.apellidos);
      for (let i = 0; i < aRows.length; i++) {
        const a = aRows[i];
        if (a.nombres && !namePattern.test(a.nombres)) {
          showToast('Asesor ' + (i + 1) + ': el campo Nombres solo debe contener letras.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
        if (a.apellidos && !namePattern.test(a.apellidos)) {
          showToast('Asesor ' + (i + 1) + ': el campo Apellidos solo debe contener letras.');
          btn.disabled = false; btn.textContent = submitLabel; return;
        }
      }

      const discInp = document.getElementById('c_disciplina');
      const discVal = discInp ? discInp.value.trim() : null;

      // Determinación de asesores / cuerpo técnico
      let finalAsesores = aRows;
      const chkInd = document.getElementById('c_chkAsesorIndividual');
      if (isJedpaConcurso(tipo)) {
        const dummyReg = {
          tipoConcursoId: tipo.id,
          tipoConcursoNombre: tipo.nombre,
          etapa: document.getElementById('c_etapa').value,
          categoria: document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '',
          genero: tipo.tieneGenero ? (document.getElementById('c_genero') ? document.getElementById('c_genero').value : null) : null,
          disciplina: discVal || null
        };
        const ctInfo = obtenerCuerpoTecnicoGrupo(dummyReg, state.concursoCuerpoTecnico || [], state.concursoRegistros || []);
        if (chkInd && !chkInd.checked && ctInfo && ctInfo.miembros && ctInfo.miembros.length > 0) {
          finalAsesores = ctInfo.miembros.map(m => ({
            rol: (m.rol || 'Delegado').trim(),
            apellidos: (m.apellidos || '').trim().toUpperCase(),
            nombres: (m.nombres || '').trim().toUpperCase(),
            dni: (m.dni || '').trim()
          }));
        } else if (finalAsesores.length > 0) {
          finalAsesores = finalAsesores.map(a => ({
            rol: (a.rol || 'Delegado').trim(),
            apellidos: (a.apellidos || '').trim().toUpperCase(),
            nombres: (a.nombres || '').trim().toUpperCase(),
            dni: (a.dni || '').trim()
          }));

          const ctDocId = generarConcursoCuerpoTecnicoDocId(
            dummyReg.etapa || 'UGEL',
            dummyReg.disciplina,
            dummyReg.categoria,
            formatGeneroDisplay(dummyReg.genero)
          );
          const existingCt = obtenerCuerpoTecnicoGrupo(dummyReg, state.concursoCuerpoTecnico || [], state.concursoRegistros || []);
          if (!existingCt.esGrupoFormalizado && (!chkInd || !chkInd.checked) && dbNs) {
            dbNs.collection('concursoCuerpoTecnico').doc(ctDocId).set({
              tipoConcursoId: 'jedpa',
              concursoNombre: tipo.nombre || 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
              etapa: dummyReg.etapa || 'UGEL',
              disciplina: dummyReg.disciplina,
              categoria: dummyReg.categoria,
              genero: dummyReg.genero,
              rama: formatGeneroDisplay(dummyReg.genero),
              miembros: finalAsesores,
              personas: finalAsesores,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              updatedBy: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista'
            }).catch(err => console.warn('Aviso guardando concursoCuerpoTecnico:', err));
          }
        }
      }

      const regData = {
        tipoConcursoId: tipo.id,
        tipoConcursoNombre: tipo.nombre,
        etapa: document.getElementById('c_etapa').value,
        categoria: document.getElementById('c_categoria') ? document.getElementById('c_categoria').value : '',
        genero: tipo.tieneGenero ? (document.getElementById('c_genero') ? document.getElementById('c_genero').value : null) : null,
        disciplina: discVal || null,
        institucion: document.getElementById('c_institucion').value.trim(),
        codigoModular: codModInp ? formatCodigoModular(codModInp.value) : '',
        tituloTrabajo: tipo.tieneTituloTrabajo ? (document.getElementById('c_tituloTrabajo') ? document.getElementById('c_tituloTrabajo').value.trim() : null) : null,
        seudonimo: tipo.tieneTituloTrabajo ? (document.getElementById('c_seudonimo') ? document.getElementById('c_seudonimo').value.trim() : null) : null,
        puesto: puestoVal || '',
        participantes: pRows,
        asesores: finalAsesores,
        resolucionRef: document.getElementById('c_resolucionRef') ? document.getElementById('c_resolucionRef').value.trim() : null,
        fecha: document.getElementById('c_fecha').value,
        responsable: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista',
        createdAt: isEditing ? (concursoEditingData.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
      };

      // Validar unicidad de puesto por Podio (Etapa + Categoría + Disciplina + Género...)
      const normP = normalizePuestoValue(puestoVal);
      const isTopPuesto = ['1.er puesto', '2.° puesto', '3.er puesto'].includes(normP);
      const isEmpate = (puestoVal || '').includes('(empate)');
      const podioKey = getPodioKey(regData, tipo);
      const existingRegs = state.concursoRegistros || [];

      if (isTopPuesto && !isEmpate) {
        const conflict = existingRegs.find(r => {
          if (isEditing && r.id === concursoEditingId) return false;
          const samePodio = getPodioKey(r, tipo) === podioKey;
          const samePuesto = normalizePuestoValue(r.puesto) === normP;
          return samePodio && samePuesto && !(r.puesto || '').includes('(empate)');
        });

        if (conflict) {
          updatePuestoSelectAnnotations();
          const cWrap = document.getElementById('c_puesto_conflict_wrap');
          if (cWrap) cWrap.scrollIntoView({ behavior: 'smooth', block: 'center' });
          btn.disabled = false;
          btn.textContent = submitLabel;
          return;
        }
      }

      // Validar duplicado exacto (considerando Género para no bloquear a competidores de distinta rama)
      const exactDuplicate = existingRegs.find(r => {
        if (isEditing && r.id === concursoEditingId) return false;
        const sameTipo = (r.tipoConcursoId === tipo.id || r.tipoConcursoNombre === tipo.nombre);
        const sameInst = normalizeText(r.institucion) === normalizeText(regData.institucion);
        const sameCat = normalizeText(r.categoria) === normalizeText(regData.categoria);
        const sameDisc = normalizeText(r.disciplina) === normalizeText(regData.disciplina);
        const sameGen = tipo.tieneGenero ? (normalizeGenero(r.genero) === normalizeGenero(regData.genero)) : true;
        const pDnis = pRows.map(p => (p.dni || '').trim()).filter(Boolean);
        const rDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
        const sharesDni = pDnis.length > 0 && pDnis.some(d => rDnis.includes(d));
        return sameTipo && sameInst && sameCat && sameGen && (sharesDni || (sameDisc && normalizePuestoValue(r.puesto) === normP && normP !== ''));
      });

      if (exactDuplicate) {
        if (!confirm('Advertencia: Parece haber un registro idéntico o con los mismos participantes para esta I.E. en el sistema. ¿Deseas guardarlo de todas formas?')) {
          btn.disabled = false;
          btn.textContent = submitLabel;
          return;
        }
      }

      // Guardar con soporte transaccional y control de concurrencia
      const lockDocId = isTopPuesto ? getPodioLockDocId(podioKey, normP) : null;
      const oldLockDocId = (isEditing && concursoEditingData && ['1.er puesto', '2.° puesto', '3.er puesto'].includes(normalizePuestoValue(concursoEditingData.puesto)))
        ? getPodioLockDocId(getPodioKey(concursoEditingData, tipo), normalizePuestoValue(concursoEditingData.puesto))
        : null;

      if (typeof dbNs.runTransaction === 'function') {
        await dbNs.runTransaction(async (tx) => {
          let targetId = concursoEditingId;
          if (!targetId) {
            const newRef = dbNs.collection('concursoRegistros').doc();
            targetId = newRef.id;
          }

          if (isTopPuesto && !isEmpate && lockDocId) {
            const lockSnap = await tx.get(dbNs.collection('concursoPodioLocks').doc(lockDocId));
            if (lockSnap.exists) {
              const lData = lockSnap.data();
              if (lData && lData.registroId && lData.registroId !== targetId) {
                throw new Error(`El ${normP} fue ocupado simultáneamente por otro usuario en este podio.`);
              }
            }
            tx.set(dbNs.collection('concursoPodioLocks').doc(lockDocId), {
              registroId: targetId,
              podioKey: podioKey,
              puesto: normP,
              updatedAt: Date.now(),
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista'
            });
          }

          if (oldLockDocId && oldLockDocId !== lockDocId) {
            tx.delete(dbNs.collection('concursoPodioLocks').doc(oldLockDocId));
          }

          tx.set(dbNs.collection('concursoRegistros').doc(targetId), regData);

          if (isEditing && concursoEditingData && normalizePuestoValue(concursoEditingData.puesto) !== normP) {
            const histRef = dbNs.collection('concursoHistorial').doc();
            tx.set(histRef, {
              tipo: 'cambio_puesto',
              registroId: targetId,
              institucion: regData.institucion,
              podioKey: podioKey,
              puestoAnterior: concursoEditingData.puesto || 'Sin puesto',
              puestoNuevo: puestoVal || 'Sin puesto',
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Especialista') : 'Especialista',
              fecha: Date.now()
            });
          }
        });
      } else {
        if (isEditing) {
          await dbNs.collection('concursoRegistros').doc(concursoEditingId).set(regData);
        } else {
          await dbNs.collection('concursoRegistros').add(regData);
        }
      }

      showToast(isEditing ? '✓ Registro de concurso actualizado exitosamente.' : '✓ Registro de concurso guardado exitosamente.');
      concursoEditingId = null;
      concursoEditingData = null;

      // Reiniciar participantes y asesores a 1 fila limpia
      concursoParticipantes = [{ nombres: '', apellidos: '', dni: '', rol: partRoles[0] }];
      concursoAsesores = [{ nombres: '', apellidos: '', dni: '', rol: asesRoles[0] }];
      concursoSubTab = 'consolidado';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    } catch (err) {
      console.error('Error guardando registro de concurso:', err);
      showToast('Error al guardar: [' + (err.code || 'error') + '] ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = submitLabel;
      }
    }
  });
}

// Modal para Reemplazar Puesto en Podio (Resolución de Conflictos)
function abrirModalReemplazoPuesto(conflictReg, newRegData, puestoVal, tipo, dbNs, state, currentEditingId, onDone) {
  const modalWrap = document.createElement('div');
  modalWrap.id = 'reemplazoPuestoModal';
  const podioLabel = getPodioLabel(conflictReg, tipo);
  const partConf = (conflictReg.participantes && conflictReg.participantes[0]) ? formatearNombre(conflictReg.participantes[0]) : 'Sin participante';
  const instNew = document.getElementById('c_institucion') ? document.getElementById('c_institucion').value.trim() : (newRegData.institucion || 'Nuevo registro');
  const partNew = (concursoParticipantes && concursoParticipantes[0] && concursoParticipantes[0].nombres)
    ? formatearNombre(concursoParticipantes[0])
    : 'Participante actual';

  modalWrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:250;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:560px;width:100%;max-height:90vh;overflow-y:auto;padding:24px;box-shadow:var(--shadow-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px">🔄 Reemplazar puesto en podio</h3>
          <button type="button" class="iconBtn" id="m_reemp_close">✕</button>
        </div>
        <p style="font-size:13px;color:var(--ink-soft);margin-bottom:14px">
          Podio: <strong>${esc(podioLabel)}</strong>
        </p>

        <div style="background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:14px;margin-bottom:16px">
          <div style="font-size:11.5px;font-weight:700;color:var(--navy-900);margin-bottom:8px">VISTA PREVIA DEL REEMPLAZO</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:12.5px">
            <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid var(--line)">
              <div style="font-size:11px;font-weight:700;color:var(--danger)">OCUPANTE ACTUAL</div>
              <div style="margin-top:4px"><strong>${esc(conflictReg.institucion)}</strong></div>
              <div style="color:var(--ink-soft);font-size:11.5px">${esc(partConf)}</div>
              <div style="margin-top:6px"><span class="badge badge-puesto puesto-1">${esc(puestoVal)}</span></div>
            </div>
            <div style="background:#fff;padding:10px;border-radius:6px;border:1px solid var(--line)">
              <div style="font-size:11px;font-weight:700;color:var(--ok)">NUEVO ASIGNADO</div>
              <div style="margin-top:4px"><strong>${esc(instNew)}</strong></div>
              <div style="color:var(--ink-soft);font-size:11.5px">${esc(partNew)}</div>
              <div style="margin-top:6px"><span class="badge badge-puesto puesto-1">${esc(puestoVal)}</span></div>
            </div>
          </div>
        </div>

        <div class="field" style="margin-bottom:18px">
          <label for="m_reemp_destino_antiguo">¿Qué puesto asignar al ocupante anterior (${esc(conflictReg.institucion)})?</label>
          <select id="m_reemp_destino_antiguo">
            <option value="">Sin puesto / Pendiente (Recomendado)</option>
            <option value="2.° puesto">🥈 2.° puesto</option>
            <option value="3.er puesto">🥉 3.er puesto</option>
            <option value="Mención honrosa">🎖️ Mención honrosa</option>
          </select>
        </div>

        <div style="display:flex;justify-content:flex-end;gap:10px">
          <button type="button" class="btn secondary" id="m_reemp_cancel">Cancelar</button>
          <button type="button" class="btn" id="m_reemp_confirm" style="background:var(--primary);color:#fff">Confirmar y Reemplazar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modalWrap);
  const closeModal = () => { if (modalWrap.parentNode) modalWrap.parentNode.removeChild(modalWrap); };
  document.getElementById('m_reemp_close').addEventListener('click', closeModal);
  document.getElementById('m_reemp_cancel').addEventListener('click', closeModal);

  document.getElementById('m_reemp_confirm').addEventListener('click', async () => {
    const btn = document.getElementById('m_reemp_confirm');
    btn.disabled = true;
    btn.textContent = 'Procesando...';

    const destinoAntiguo = document.getElementById('m_reemp_destino_antiguo').value;
    const podioKey = getPodioKey(conflictReg, tipo);

    try {
      if (typeof dbNs.runTransaction === 'function') {
        await dbNs.runTransaction(async (tx) => {
          // 1. Actualizar el registro en conflicto
          tx.update(dbNs.collection('concursoRegistros').doc(conflictReg.id), {
            puesto: destinoAntiguo || '',
            updatedAt: Date.now()
          });

          // 2. Si se estaba editando el registro actual, actualizarlo en la misma transacción
          if (currentEditingId) {
            tx.update(dbNs.collection('concursoRegistros').doc(currentEditingId), {
              puesto: puestoVal,
              updatedAt: Date.now()
            });
          }

          // 3. Actualizar el bloqueo en concursoPodioLocks
          const lockDocId = getPodioLockDocId(podioKey, puestoVal);
          tx.set(dbNs.collection('concursoPodioLocks').doc(lockDocId), {
            registroId: currentEditingId || 'form_nuevo',
            podioKey: podioKey,
            puesto: puestoVal,
            updatedAt: Date.now(),
            usuario: 'Especialista'
          });

          // 4. Registrar en historial de bitácora
          const histDoc = dbNs.collection('concursoHistorial').doc();
          tx.set(histDoc, {
            tipo: 'reemplazo_puesto',
            podioKey: podioKey,
            puesto: puestoVal,
            registroAnteriorId: conflictReg.id,
            institucionAnterior: conflictReg.institucion,
            puestoAnteriorNuevo: destinoAntiguo || 'Sin puesto',
            institucionNueva: instNew,
            fecha: Date.now()
          });
        });
      } else {
        await dbNs.collection('concursoRegistros').doc(conflictReg.id).update({
          puesto: destinoAntiguo || '',
          updatedAt: Date.now()
        });
        if (currentEditingId) {
          await dbNs.collection('concursoRegistros').doc(currentEditingId).update({
            puesto: puestoVal,
            updatedAt: Date.now()
          });
        }
      }

      showToast(`✓ Se asignó el ${puestoVal} a ${instNew}.`);
      closeModal();
      if (onDone) onDone();
    } catch (err) {
      console.error('Error al reemplazar puesto:', err);
      showToast('Error al reemplazar puesto: ' + err.message);
      btn.disabled = false;
      btn.textContent = 'Confirmar y Reemplazar';
    }
  });
}

/* -------------------------------------------------------------
   SUB-PESTAÑA 2: VER CONSOLIDADO (REPORTES / RESULTADOS)
   SISTEMA DE FILTROS EN CASCADA PARA JEDPA:
   Etapa -> Disciplina -> Categoría -> Género -> Buscar
   ------------------------------------------------------------- */

function normalizeFilterValue(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Calcula las opciones facetadas en memoria agrupando variantes equivalentes (mayúsculas, tildes, espacios)
 * y conservando la forma más frecuente como etiqueta visual.
 */
function getFacetOptions(rows, field, allLabel = 'Todas', emptyLabel = null) {
  const map = new Map();
  let emptyCount = 0;

  rows.forEach(r => {
    const raw = r[field];
    if (raw === null || raw === undefined || String(raw).trim() === '' || String(raw).trim() === '—') {
      emptyCount++;
      return;
    }
    const str = String(raw).trim();
    const norm = normalizeFilterValue(str);
    if (!map.has(norm)) {
      map.set(norm, { label: str, count: 1, rawCounts: new Map([[str, 1]]) });
    } else {
      const entry = map.get(norm);
      entry.count++;
      entry.rawCounts.set(str, (entry.rawCounts.get(str) || 0) + 1);
      let maxCount = 0;
      for (const [rStr, rCount] of entry.rawCounts) {
        if (rCount > maxCount) {
          maxCount = rCount;
          entry.label = rStr;
        }
      }
    }
  });

  const options = [];
  options.push({ value: '', label: `${allLabel} (${rows.length})`, rawLabel: allLabel, count: rows.length, isAll: true });

  const items = Array.from(map.entries()).map(([norm, data]) => ({
    value: norm,
    label: `${data.label} (${data.count})`,
    rawLabel: data.label,
    count: data.count
  }));

  if (field === 'etapa') {
    const order = ['ugel', 'drelm', 'dre', 'macroregional', 'nacional'];
    items.sort((a, b) => {
      const idxA = order.indexOf(a.value);
      const idxB = order.indexOf(b.value);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.rawLabel.localeCompare(b.rawLabel);
    });
  } else if (field === 'categoria') {
    items.sort((a, b) => a.rawLabel.localeCompare(b.rawLabel, undefined, { numeric: true }));
  } else if (field === 'genero') {
    const order = ['damas', 'varones', 'mixto'];
    items.sort((a, b) => {
      const idxA = order.indexOf(a.value);
      const idxB = order.indexOf(b.value);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.rawLabel.localeCompare(b.rawLabel);
    });
  } else {
    items.sort((a, b) => a.rawLabel.localeCompare(b.rawLabel));
  }

  options.push(...items);

  if (emptyCount > 0 && emptyLabel) {
    options.push({
      value: '__empty__',
      label: `${emptyLabel} (${emptyCount})`,
      rawLabel: emptyLabel,
      count: emptyCount,
      isEmpty: true
    });
  }

  return options;
}

function syncConcursoFiltersToUrl(filters, isJedpa, isJfen) {
  try {
    const url = new URL(window.location.href);
    if (filters.tipoId) url.searchParams.set('concurso', filters.tipoId);
    else url.searchParams.delete('concurso');

    const curCats = getSelectedCategorias();
    const catUrlVal = curCats.length > 0 ? curCats.join(',') : '';

    if (isJedpa) {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');

      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');

      if (catUrlVal) url.searchParams.set('categoria', catUrlVal);
      else url.searchParams.delete('categoria');

      if (filters.genero) url.searchParams.set('genero', filters.genero);
      else url.searchParams.delete('genero');

      url.searchParams.delete('arte');
      url.searchParams.delete('modalidad');
    } else if (isJfen) {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');

      if (catUrlVal) url.searchParams.set('categoria', catUrlVal);
      else url.searchParams.delete('categoria');

      if (filters.arte) url.searchParams.set('arte', filters.arte);
      else url.searchParams.delete('arte');

      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');

      if (filters.modalidad) url.searchParams.set('modalidad', filters.modalidad);
      else url.searchParams.delete('modalidad');

      url.searchParams.delete('genero');
    } else {
      if (filters.etapa) url.searchParams.set('etapa', filters.etapa);
      else url.searchParams.delete('etapa');
      if (catUrlVal) url.searchParams.set('categoria', catUrlVal);
      else url.searchParams.delete('categoria');
      if (filters.genero) url.searchParams.set('genero', filters.genero);
      else url.searchParams.delete('genero');
      if (filters.disciplina) url.searchParams.set('disciplina', filters.disciplina);
      else url.searchParams.delete('disciplina');
      url.searchParams.delete('arte');
      url.searchParams.delete('modalidad');
    }

    if (filters.query) url.searchParams.set('q', filters.query);
    else url.searchParams.delete('q');

    window.history.replaceState(null, '', url.toString());
  } catch (e) { }
}

function restoreConcursoFiltersFromUrl(tipos) {
  try {
    const params = new URLSearchParams(window.location.search);
    const cParam = params.get('concurso');
    if (cParam) {
      const matchTipo = tipos.find(t => t.id === cParam || normalizeFilterValue(t.nombre).includes(cParam));
      if (matchTipo) concursoFilters.tipoId = matchTipo.id;
    }
    if (params.has('etapa')) concursoFilters.etapa = params.get('etapa');
    if (params.has('disciplina')) concursoFilters.disciplina = params.get('disciplina');
    if (params.has('categoria')) {
      const pVal = params.get('categoria');
      if (pVal) {
        concursoFilters.categoria = pVal.includes(',')
          ? pVal.split(',').map(s => s.trim()).filter(Boolean)
          : [pVal.trim()];
      } else {
        concursoFilters.categoria = [];
      }
    }
    if (params.has('genero')) concursoFilters.genero = params.get('genero');
    if (params.has('arte')) concursoFilters.arte = params.get('arte');
    if (params.has('modalidad')) concursoFilters.modalidad = params.get('modalidad');
    if (params.has('q')) concursoFilters.query = params.get('q');
  } catch (e) { }
}

function renderCategoryMultiSelectMarkup(contextId, categoriaOptions, selectedCats = []) {
  const items = (categoriaOptions || []).filter(o => !o.isAll);
  const totalOptions = items.length;
  const isAll = selectedCats.length === 0;

  let btnText = 'Todas';
  let btnTitle = 'Todas las categorías seleccionadas';
  if (!isAll) {
    const rawLabels = selectedCats.map(c => {
      const norm = normalizeFilterValue(c);
      const opt = items.find(o => o.value === norm);
      return opt ? opt.rawLabel : c;
    });
    btnTitle = rawLabels.join(', ');
    if (rawLabels.length === 1) {
      btnText = rawLabels[0];
    } else {
      const joined = rawLabels.join(', ');
      btnText = (joined.length <= 22) ? joined : `${selectedCats.length} seleccionadas`;
    }
  }

  const badgeHtml = (!isAll && selectedCats.length > 0)
    ? `<span class="catMultiSelectBadge">${selectedCats.length}</span>`
    : '';

  const isOpen = concursoCategoryDropdownOpen;
  const showSearch = totalOptions > 4;

  const optionsHtml = items.map(o => {
    const isChecked = selectedCats.some(c => normalizeFilterValue(c) === o.value);
    return `
      <label class="catMultiSelectOption ${isChecked ? 'selected' : ''}" data-val="${esc(o.value)}">
        <input type="checkbox" class="catOptionCheckbox" value="${esc(o.value)}" ${isChecked ? 'checked' : ''}>
        <span class="catOptionText">${esc(o.rawLabel)}</span>
        <span class="catOptionCount">(${o.count})</span>
      </label>
    `;
  }).join('') || '<div style="padding:12px;font-size:12.5px;color:var(--ink-soft);text-align:center;font-style:italic">Sin opciones de categoría</div>';

  const summaryText = isAll
    ? 'Mostrando todas'
    : `${selectedCats.length} de ${totalOptions} categoría${selectedCats.length === 1 ? '' : 's'}`;

  return `
    <div class="catMultiSelectWrap" id="wrap_cf_categoria">
      <button type="button" class="catMultiSelectBtn ${isOpen ? 'active' : ''} ${totalOptions === 0 ? 'disabled' : ''}" id="btn_cf_categoria" aria-haspopup="listbox" aria-expanded="${isOpen ? 'true' : 'false'}" title="${esc(btnTitle)}" ${totalOptions === 0 ? 'disabled' : ''}>
        <span class="catMultiSelectBtnLabel" id="txt_cf_categoria">${esc(btnText)}</span>
        <div style="display:flex;align-items:center;gap:5px">
          ${badgeHtml}
          <span class="catMultiSelectBtnIcon">▾</span>
        </div>
      </button>
      <div class="catMultiSelectDropdown" id="drop_cf_categoria" style="display:${isOpen ? 'flex' : 'none'}" role="listbox">
        ${showSearch ? `
          <div class="catMultiSelectSearch">
            <input type="search" placeholder="Buscar categoría..." id="input_cf_categoria_search" value="${esc(concursoCategorySearchText || '')}" autocomplete="off">
          </div>
        ` : ''}
        <div class="catMultiSelectHeader">
          <label class="catMultiSelectAllLabel">
            <input type="checkbox" id="chk_cf_categoria_all" ${isAll ? 'checked' : ''}>
            <span><strong>Todas las categorías</strong></span>
          </label>
          ${!isAll ? `<button type="button" class="catClearLink" id="link_cf_categoria_clear">Limpiar</button>` : ''}
        </div>
        <div class="catMultiSelectList" id="list_cf_categoria">
          ${optionsHtml}
        </div>
        <div class="catMultiSelectFooter">
          <span class="catSelectedSummary">${esc(summaryText)}</span>
          <button type="button" class="btn small primary catCloseBtn" id="btn_cf_categoria_close">Listo ✓</button>
        </div>
      </div>
      <input type="hidden" id="cf_categoria" value="${esc(selectedCats.join(','))}">
    </div>
  `;
}

function setupCategoryMultiSelectEvents(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const wrap = document.getElementById('wrap_cf_categoria');
  if (!wrap) return;

  const btn = document.getElementById('btn_cf_categoria');
  const drop = document.getElementById('drop_cf_categoria');
  const inputSearch = document.getElementById('input_cf_categoria_search');
  const list = document.getElementById('list_cf_categoria');
  const chkAll = document.getElementById('chk_cf_categoria_all');
  const linkClear = document.getElementById('link_cf_categoria_clear');
  const btnClose = document.getElementById('btn_cf_categoria_close');

  if (btn && drop) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = drop.style.display !== 'none';
      if (isOpen) {
        drop.style.display = 'none';
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        concursoCategoryDropdownOpen = false;
      } else {
        drop.style.display = 'flex';
        btn.setAttribute('aria-expanded', 'true');
        btn.classList.add('active');
        concursoCategoryDropdownOpen = true;
        if (inputSearch) {
          inputSearch.value = concursoCategorySearchText || '';
          filterCatOptions(concursoCategorySearchText || '');
          inputSearch.focus();
        }
      }
    });
  }

  wrap.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drop && drop.style.display !== 'none') {
        drop.style.display = 'none';
        btn?.setAttribute('aria-expanded', 'false');
        btn?.classList.remove('active');
        concursoCategoryDropdownOpen = false;
        btn?.focus();
      }
    }
  });

  function filterCatOptions(q) {
    if (!list) return;
    const normQ = normalizeFilterValue(q);
    const opts = list.querySelectorAll('.catMultiSelectOption');
    opts.forEach(opt => {
      const text = normalizeFilterValue(opt.textContent);
      opt.style.display = (!normQ || text.includes(normQ)) ? 'flex' : 'none';
    });
  }

  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      concursoCategorySearchText = e.target.value;
      filterCatOptions(e.target.value);
    });
    if (concursoCategorySearchText) {
      filterCatOptions(concursoCategorySearchText);
    }
  }

  if (chkAll) {
    chkAll.addEventListener('change', (e) => {
      e.stopPropagation();
      setSelectedCategorias([]);
      concursoCategoryDropdownOpen = true;
      if (list) concursoCategoryListScrollTop = list.scrollTop;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  if (linkClear) {
    linkClear.addEventListener('click', (e) => {
      e.stopPropagation();
      setSelectedCategorias([]);
      concursoCategoryDropdownOpen = true;
      if (list) concursoCategoryListScrollTop = list.scrollTop;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  if (list) {
    list.querySelectorAll('.catOptionCheckbox').forEach(chk => {
      chk.addEventListener('change', (e) => {
        e.stopPropagation();
        const val = chk.value;
        const checked = chk.checked;
        let cur = getSelectedCategorias();
        const norm = normalizeFilterValue(val);
        if (checked) {
          if (!cur.some(c => normalizeFilterValue(c) === norm)) {
            cur.push(val);
          }
        } else {
          cur = cur.filter(c => normalizeFilterValue(c) !== norm);
        }
        setSelectedCategorias(cur);
        concursoCategoryDropdownOpen = true;
        concursoCategoryListScrollTop = list.scrollTop;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    });

    if (concursoCategoryListScrollTop && concursoCategoryDropdownOpen) {
      list.scrollTop = concursoCategoryListScrollTop;
    }
  }

  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.stopPropagation();
      if (drop) drop.style.display = 'none';
      if (btn) {
        btn.setAttribute('aria-expanded', 'false');
        btn.classList.remove('active');
        btn.focus();
      }
      concursoCategoryDropdownOpen = false;
    });
  }
}

if (typeof window !== 'undefined' && !window._concursoCatDropdownOutsideInit) {
  window._concursoCatDropdownOutsideInit = true;
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#wrap_cf_categoria')) {
      const drop = document.getElementById('drop_cf_categoria');
      const btn = document.getElementById('btn_cf_categoria');
      if (drop && drop.style.display !== 'none') {
        drop.style.display = 'none';
        if (btn) {
          btn.setAttribute('aria-expanded', 'false');
          btn.classList.remove('active');
        }
        concursoCategoryDropdownOpen = false;
      }
    }
  });
}

export function renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const tipos = state.tiposConcurso || [];
  const regs = state.concursoRegistros || [];

  if (tipos.length === 0) {
    host.innerHTML = '<div class="empty"><h4>Sin tipos de concurso</h4><p>Configura o siembra los tipos de concurso primero.</p></div>';
    return;
  }

  // Restaurar de URL una sola vez al cargar si aún no se inicializó
  if (!concursoFilters._urlInitialized) {
    concursoFilters._urlInitialized = true;
    restoreConcursoFiltersFromUrl(tipos);
  }

  const tipo = tipos.find(t => t.id === concursoFilters.tipoId) || null;
  const isJedpa = tipo && (
    tipo.id === 'jedpa' ||
    (tipo.nombre || '').toLowerCase().includes('jedpa') ||
    (tipo.nombre || '').toLowerCase().includes('juegos escolares')
  );
  const isJfen = tipo && (
    tipo.id === 'jfen' ||
    (tipo.nombre || '').toLowerCase().includes('jfen') ||
    (tipo.nombre || '').toLowerCase().includes('florales')
  );

  let filtered = [];
  let baseRows = [];
  let etapaOptions = [];
  let disciplinaOptions = [];
  let categoriaOptions = [];
  let generoOptions = [];
  let arteOptions = [];
  let modalidadOptions = [];
  let etapaRows = [];

  if (isJedpa) {
    baseRows = regs.filter(r => {
      if (r.tipoConcursoId === tipo.id) return true;
      if (tipo && (r.tipoConcursoNombre === tipo.nombre || r.tipoConcurso === tipo.nombre)) return true;
      return false;
    });

    // 1. ETAPA
    etapaOptions = getFacetOptions(baseRows, 'etapa', 'Todas', 'Sin etapa');
    if (concursoFilters.etapa && !etapaOptions.some(o => o.value === concursoFilters.etapa)) {
      concursoFilters.etapa = '';
    }
    etapaRows = baseRows;
    if (concursoFilters.etapa) {
      if (concursoFilters.etapa === '__empty__') {
        etapaRows = baseRows.filter(r => !r.etapa || r.etapa.trim() === '' || r.etapa.trim() === '—');
      } else {
        etapaRows = baseRows.filter(r => normalizeFilterValue(r.etapa) === concursoFilters.etapa);
      }
    }

    // 2. DISCIPLINA
    disciplinaOptions = getFacetOptions(etapaRows, 'disciplina', 'Todas', 'Sin disciplina');
    if (concursoFilters.disciplina && !disciplinaOptions.some(o => o.value === concursoFilters.disciplina)) {
      concursoFilters.disciplina = '';
      showToast('Disciplina reiniciada: no hay registros con esa combinación.');
    }
    let disciplinaRows = etapaRows;
    if (concursoFilters.disciplina) {
      if (concursoFilters.disciplina === '__empty__') {
        disciplinaRows = etapaRows.filter(r => !r.disciplina || r.disciplina.trim() === '' || r.disciplina.trim() === '—');
      } else {
        disciplinaRows = etapaRows.filter(r => normalizeFilterValue(r.disciplina) === concursoFilters.disciplina);
      }
    }

    // 3. CATEGORÍA (Multiselect)
    categoriaOptions = getFacetOptions(disciplinaRows, 'categoria', 'Todas', 'Sin categoría');
    let selectedCats = getSelectedCategorias();
    if (selectedCats.length > 0) {
      const validCats = selectedCats.filter(c => c === '__empty__' || categoriaOptions.some(o => o.value === normalizeFilterValue(c)));
      if (validCats.length !== selectedCats.length) {
        selectedCats = validCats;
        setSelectedCategorias(selectedCats);
        if (selectedCats.length === 0) {
          showToast('Categoría reiniciada: no hay registros con esa combinación.');
        }
      }
    }
    let categoriaRows = disciplinaRows;
    if (selectedCats.length > 0) {
      categoriaRows = disciplinaRows.filter(r => {
        const norm = normalizeFilterValue(r.categoria);
        if (!norm) return selectedCats.includes('__empty__');
        return selectedCats.some(c => normalizeFilterValue(c) === norm);
      });
    }

    // 4. GÉNERO
    generoOptions = getFacetOptions(categoriaRows, 'genero', 'Todos', 'Sin género');
    if (concursoFilters.genero && !generoOptions.some(o => o.value === concursoFilters.genero)) {
      concursoFilters.genero = '';
      showToast('Género reiniciado: no hay registros con esa combinación.');
    }
    let generoRows = categoriaRows;
    if (concursoFilters.genero) {
      if (concursoFilters.genero === '__empty__') {
        generoRows = categoriaRows.filter(r => !r.genero || r.genero.trim() === '' || r.genero.trim() === '—');
      } else {
        generoRows = categoriaRows.filter(r => normalizeFilterValue(r.genero) === concursoFilters.genero);
      }
    }

    // 5. BUSCAR
    filtered = generoRows;
    if (concursoFilters.query) {
      const q = normalizeText(concursoFilters.query);
      filtered = filtered.filter(r => {
        if (normalizeText(r.institucion).includes(q)) return true;
        if (normalizeText(r.tituloTrabajo).includes(q)) return true;
        if (normalizeText(r.disciplina).includes(q)) return true;
        if (normalizeText(r.resolucionRef).includes(q)) return true;
        if (normalizeText(r.codigoModular).includes(q)) return true;
        if (normalizeText(r.tipoConcursoNombre || r.tipoConcurso).includes(q)) return true;
        if ((r.participantes || []).some(p => normalizeText([p.nombres, p.apellidos, p.dni].filter(Boolean).join(' ')).includes(q))) return true;
        if ((r.asesores || []).some(a => normalizeText([a.nombres, a.apellidos, a.dni].filter(Boolean).join(' ')).includes(q))) return true;
        return false;
      });
    }

  } else if (isJfen) {
    baseRows = regs.filter(r => {
      if (r.tipoConcursoId === tipo.id) return true;
      if (tipo && (r.tipoConcursoNombre === tipo.nombre || r.tipoConcurso === tipo.nombre)) return true;
      return false;
    });

    // Añadir propiedades virtuales parseadas para filtrado fluido y limpio
    baseRows.forEach(r => {
      const p = parseArteDisciplina(r.disciplina);
      r._arte = p.arte;
      r._disciplina = p.disciplina;
      r._modalidad = (r.modalidad || r.modalidadParticipacion || '').trim();
    });

    // 1. ETAPA
    etapaOptions = getFacetOptions(baseRows, 'etapa', 'Todas las etapas', 'Sin etapa');
    if (concursoFilters.etapa && !etapaOptions.some(o => o.value === concursoFilters.etapa)) {
      concursoFilters.etapa = '';
    }
    etapaRows = baseRows;
    if (concursoFilters.etapa) {
      if (concursoFilters.etapa === '__empty__') {
        etapaRows = baseRows.filter(r => !r.etapa || r.etapa.trim() === '' || r.etapa.trim() === '—');
      } else {
        etapaRows = baseRows.filter(r => normalizeFilterValue(r.etapa) === concursoFilters.etapa);
      }
    }

    // 2. CATEGORÍA (Multiselect)
    categoriaOptions = getFacetOptions(etapaRows, 'categoria', 'Todas las categorías', 'Sin categoría');
    let selectedCats = getSelectedCategorias();
    if (selectedCats.length > 0) {
      const validCats = selectedCats.filter(c => c === '__empty__' || categoriaOptions.some(o => o.value === normalizeFilterValue(c)));
      if (validCats.length !== selectedCats.length) {
        selectedCats = validCats;
        setSelectedCategorias(selectedCats);
        if (selectedCats.length === 0) {
          showToast('Categoría reiniciada: no hay registros con esa combinación.');
        }
      }
    }
    let categoriaRows = etapaRows;
    if (selectedCats.length > 0) {
      categoriaRows = etapaRows.filter(r => {
        const norm = normalizeFilterValue(r.categoria);
        if (!norm) return selectedCats.includes('__empty__');
        return selectedCats.some(c => normalizeFilterValue(c) === norm);
      });
    }

    // 3. ARTE
    arteOptions = getFacetOptions(categoriaRows, '_arte', 'Todas las áreas', 'Sin área');
    if (concursoFilters.arte && !arteOptions.some(o => o.value === concursoFilters.arte)) {
      concursoFilters.arte = '';
      showToast('Área de arte reiniciada: no hay registros con esa combinación.');
    }
    let arteRows = categoriaRows;
    if (concursoFilters.arte) {
      if (concursoFilters.arte === '__empty__') {
        arteRows = categoriaRows.filter(r => !r._arte || r._arte.trim() === '');
      } else {
        arteRows = categoriaRows.filter(r => normalizeFilterValue(r._arte) === concursoFilters.arte);
      }
    }

    // 4. DISCIPLINA
    disciplinaOptions = getFacetOptions(arteRows, '_disciplina', 'Todas las disciplinas', 'Sin disciplina');
    if (concursoFilters.disciplina && !disciplinaOptions.some(o => o.value === concursoFilters.disciplina)) {
      concursoFilters.disciplina = '';
      showToast('Disciplina reiniciada: no hay registros con esa combinación.');
    }
    let disciplinaRows = arteRows;
    if (concursoFilters.disciplina) {
      if (concursoFilters.disciplina === '__empty__') {
        disciplinaRows = arteRows.filter(r => !r._disciplina || r._disciplina.trim() === '');
      } else {
        disciplinaRows = arteRows.filter(r => normalizeFilterValue(r._disciplina) === concursoFilters.disciplina);
      }
    }

    // 5. MODALIDAD
    modalidadOptions = getFacetOptions(disciplinaRows, '_modalidad', 'Todas las modalidades', 'Sin modalidad');
    if (concursoFilters.modalidad && !modalidadOptions.some(o => o.value === concursoFilters.modalidad)) {
      concursoFilters.modalidad = '';
    }
    let modalidadRows = disciplinaRows;
    if (concursoFilters.modalidad) {
      if (concursoFilters.modalidad === '__empty__') {
        modalidadRows = disciplinaRows.filter(r => !r._modalidad);
      } else {
        modalidadRows = disciplinaRows.filter(r => normalizeFilterValue(r._modalidad) === concursoFilters.modalidad);
      }
    }

    // 6. BUSCAR
    filtered = modalidadRows;
    if (concursoFilters.query) {
      const q = normalizeText(concursoFilters.query);
      filtered = filtered.filter(r => {
        if (normalizeText(r.institucion).includes(q)) return true;
        if (normalizeText(r.tituloTrabajo).includes(q)) return true;
        if (normalizeText(r.disciplina).includes(q)) return true;
        if (normalizeText(r._arte).includes(q)) return true;
        if (normalizeText(r._disciplina).includes(q)) return true;
        if (normalizeText(r.resolucionRef).includes(q)) return true;
        if (normalizeText(r.codigoModular).includes(q)) return true;
        if (normalizeText(r.tipoConcursoNombre || r.tipoConcurso).includes(q)) return true;
        if ((r.participantes || []).some(p => normalizeText([p.nombres, p.apellidos, p.dni].filter(Boolean).join(' ')).includes(q))) return true;
        if ((r.asesores || []).some(a => normalizeText([a.nombres, a.apellidos, a.dni].filter(Boolean).join(' ')).includes(q))) return true;
        return false;
      });
    }

  } else {
    // Otros concursos (comportamiento estándar conservado)
    baseRows = regs.slice();
    filtered = regs.slice();
    if (concursoFilters.tipoId) {
      const tSel = tipos.find(t => t.id === concursoFilters.tipoId);
      filtered = filtered.filter(r => {
        if (r.tipoConcursoId === concursoFilters.tipoId) return true;
        if (tSel && (r.tipoConcursoNombre === tSel.nombre || r.tipoConcurso === tSel.nombre)) return true;
        return false;
      });
      baseRows = filtered.slice();
    }
    etapaRows = baseRows;
    if (concursoFilters.etapa) {
      filtered = filtered.filter(r => (r.etapa || '').toUpperCase() === concursoFilters.etapa.toUpperCase());
      etapaRows = filtered.slice();
    }

    categoriaOptions = getFacetOptions(etapaRows, 'categoria', 'Todas las categorías', 'Sin categoría');
    if (tipo && Array.isArray(tipo.categorias) && tipo.categorias.length > 0) {
      const existingVals = new Set(categoriaOptions.map(o => o.value));
      const definedOpts = [];
      tipo.categorias.forEach(catName => {
        const norm = normalizeFilterValue(catName);
        if (!existingVals.has(norm)) {
          definedOpts.push({
            value: norm,
            label: `${catName} (0)`,
            rawLabel: catName,
            count: 0
          });
        }
      });
      categoriaOptions.push(...definedOpts);

      const normOrder = tipo.categorias.map(c => normalizeFilterValue(c));
      const allOpt = categoriaOptions[0];
      const items = categoriaOptions.slice(1);
      items.sort((a, b) => {
        const idxA = normOrder.indexOf(a.value);
        const idxB = normOrder.indexOf(b.value);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return a.rawLabel.localeCompare(b.rawLabel, undefined, { numeric: true });
      });
      categoriaOptions = [allOpt, ...items];
    }

    let selectedCats = getSelectedCategorias();
    if (selectedCats.length > 0) {
      filtered = filtered.filter(r => {
        const norm = normalizeFilterValue(r.categoria);
        if (!norm) return selectedCats.includes('__empty__');
        return selectedCats.some(c => normalizeFilterValue(c) === norm);
      });
    }
    if (concursoFilters.genero) {
      const genFilt = concursoFilters.genero.trim().toLowerCase();
      filtered = filtered.filter(r => (r.genero || '').trim().toLowerCase() === genFilt);
    }
    if (concursoFilters.disciplina) {
      const discFilt = concursoFilters.disciplina.toLowerCase();
      filtered = filtered.filter(r => (r.disciplina || '').toLowerCase().includes(discFilt));
    }
    if (concursoFilters.query) {
      const q = normalizeText(concursoFilters.query);
      filtered = filtered.filter(r => {
        if (normalizeText(r.institucion).includes(q)) return true;
        if (normalizeText(r.tituloTrabajo).includes(q)) return true;
        if (normalizeText(r.disciplina).includes(q)) return true;
        if (normalizeText(r.resolucionRef).includes(q)) return true;
        if (normalizeText(r.codigoModular).includes(q)) return true;
        if (normalizeText(r.tipoConcursoNombre || r.tipoConcurso).includes(q)) return true;
        if ((r.participantes || []).some(p => normalizeText([p.nombres, p.apellidos, p.dni].filter(Boolean).join(' ')).includes(q))) return true;
        if ((r.asesores || []).some(a => normalizeText([a.nombres, a.apellidos, a.dni].filter(Boolean).join(' ')).includes(q))) return true;
        return false;
      });
    }
  }

  syncConcursoFiltersToUrl(concursoFilters, isJedpa, isJfen);

  // Ordenamiento predeterminado: Categoría -> Área / Disciplina -> Puesto (1.er, 2.°, 3.er, MH...) -> Institución
  const puestoWeight = (p) => {
    const s = String(p || '').toLowerCase();
    if (s.includes('1') || s.startsWith('primer')) return 1;
    if (s.includes('2') || s.startsWith('segundo')) return 2;
    if (s.includes('3') || s.startsWith('tercer')) return 3;
    if (s.includes('menci') || s.includes('honrosa') || s.includes('mh')) return 4;
    if (s.includes('final')) return 5;
    if (s.includes('clasif')) return 6;
    if (s.includes('partic')) return 7;
    return 8;
  };

  filtered.sort((a, b) => {
    const discComp = (a.disciplina || '').localeCompare(b.disciplina || '');
    if (discComp !== 0) return discComp;
    const catComp = (a.categoria || '').localeCompare(b.categoria || '');
    if (catComp !== 0) return catComp;
    const genComp = (a.genero || '').localeCompare(b.genero || '');
    if (genComp !== 0) return genComp;
    const pA = puestoWeight(a.puesto);
    const pB = puestoWeight(b.puesto);
    if (pA !== pB) return pA - pB;
    return (a.institucion || '').localeCompare(b.institucion || '');
  });

  // Configuración oficial del concurso
  const concursoCfg = getConcursoConfig(tipo ? tipo.nombre : '');

  // Métricas calculadas
  const totalRegs = filtered.length;
  const uniqueColegios = new Set(filtered.map(r => r.codigoModular || r.institucion).filter(Boolean)).size;
  const partSet = new Set();
  filtered.forEach(r => {
    (r.participantes || []).forEach(p => {
      const key = (p.dni && p.dni.trim()) ? p.dni.trim() : [p.nombres, p.apellidos].filter(Boolean).join(' ').trim();
      if (key) partSet.add(key);
    });
  });
  const totalPartUnicos = partSet.size;

  const asesSet = new Set();
  filtered.forEach(r => {
    (r.asesores || []).forEach(a => {
      const key = (a.dni && a.dni.trim()) ? a.dni.trim() : [a.nombres, a.apellidos].filter(Boolean).join(' ').trim();
      if (key) asesSet.add(key);
    });
  });
  const totalAsesUnicos = asesSet.size;

  // Cálculo de cuerpo técnico único para JEDPA
  const ctSet = new Set();
  filtered.forEach(r => {
    const ctInfo = obtenerCuerpoTecnicoGrupo(r, state.concursoCuerpoTecnico || [], filtered);
    (ctInfo.miembros || []).forEach(m => {
      const k = (m.dni && m.dni.trim()) ? m.dni.trim() : [m.nombres, m.apellidos].filter(Boolean).join(' ').trim().toUpperCase();
      if (k) ctSet.add(k);
    });
  });
  const totalCtUnicos = ctSet.size > 0 ? ctSet.size : totalAsesUnicos;

  // Banner informativo del cuerpo técnico si se está filtrando un grupo específico en JEDPA
  const isGroupFiltered = isJedpa && concursoFilters.disciplina && concursoFilters.categoria && concursoFilters.genero;
  let groupCtBannerHtml = '';
  if (isGroupFiltered && filtered.length > 0) {
    const groupCt = obtenerCuerpoTecnicoGrupo(filtered[0], state.concursoCuerpoTecnico || [], filtered);
    const miembrosCt = groupCt.miembros || [];
    const origenLabel = groupCt.origen === 'concursoCuerpoTecnico' ? 'Oficial centralizado' : 'Detectado en registros del grupo';
    groupCtBannerHtml = `
      <div class="panel" style="margin-bottom:14px;border-left:4px solid var(--primary);background:var(--surface-1,#f8fafc);padding:14px 18px">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <div>
            <div style="display:flex;align-items:center;gap:8px">
              <strong style="color:var(--navy-900);font-size:13.5px">👥 Delegado / Entrenador del grupo:</strong>
              <span class="badge" style="font-size:11px;background:var(--primary-tint,#e0e7ff);color:var(--primary,#3730a3)">${esc(origenLabel)}</span>
            </div>
            <div style="margin-top:6px;font-size:13px;line-height:1.5">
              ${miembrosCt.length > 0 ? miembrosCt.map(m => `
                <span style="display:inline-block;margin-right:16px">
                  <strong>${esc(m.rol ? m.rol.toUpperCase() : 'DELEGADO')}:</strong> ${esc((m.apellidos || '').toUpperCase())} ${esc((m.nombres || '').toUpperCase())} ${m.dni ? `<small style="color:var(--ink-soft)">(${esc(m.dni)})</small>` : ''}
                </span>
              `).join('') : '<span style="color:var(--ink-soft);font-style:italic">Sin cuerpo técnico asignado a este grupo</span>'}
            </div>
          </div>
          ${isAdmin ? '<button type="button" class="btn secondary small" id="btnConsolidarCtGrupoBanner" style="font-size:11.5px">⚙️ Gestionar cuerpo técnico</button>' : ''}
        </div>
      </div>
    `;
  }

  // Chips de filtros activos
  const chips = [];
  if (isJedpa) {
    if (concursoFilters.etapa) {
      const opt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      chips.push({ key: 'etapa', label: `Etapa: ${opt ? opt.rawLabel : concursoFilters.etapa}` });
    }
    if (concursoFilters.disciplina) {
      const opt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      chips.push({ key: 'disciplina', label: `Disciplina: ${opt ? opt.rawLabel : concursoFilters.disciplina}` });
    }
    const curCats = getSelectedCategorias();
    if (curCats.length > 0) {
      curCats.forEach(c => {
        const norm = normalizeFilterValue(c);
        const opt = categoriaOptions.find(o => o.value === norm);
        chips.push({ key: `categoria:${norm}`, label: `Categoría: ${opt ? opt.rawLabel : c}` });
      });
    }
    if (concursoFilters.genero) {
      const opt = generoOptions.find(o => o.value === concursoFilters.genero);
      chips.push({ key: 'genero', label: `Género: ${opt ? opt.rawLabel : concursoFilters.genero}` });
    }
  } else if (isJfen) {
    if (concursoFilters.etapa) {
      const opt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      chips.push({ key: 'etapa', label: `Etapa: ${opt ? opt.rawLabel : concursoFilters.etapa}` });
    }
    const curCats = getSelectedCategorias();
    if (curCats.length > 0) {
      curCats.forEach(c => {
        const norm = normalizeFilterValue(c);
        const opt = categoriaOptions.find(o => o.value === norm);
        chips.push({ key: `categoria:${norm}`, label: `Categoría: ${opt ? opt.rawLabel : c}` });
      });
    }
    if (concursoFilters.arte) {
      const opt = arteOptions.find(o => o.value === concursoFilters.arte);
      chips.push({ key: 'arte', label: `Arte: ${opt ? opt.rawLabel : concursoFilters.arte}` });
    }
    if (concursoFilters.disciplina) {
      const opt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      chips.push({ key: 'disciplina', label: `Disciplina: ${opt ? opt.rawLabel : concursoFilters.disciplina}` });
    }
    if (concursoFilters.modalidad) {
      const opt = modalidadOptions.find(o => o.value === concursoFilters.modalidad);
      chips.push({ key: 'modalidad', label: `Modalidad: ${opt ? opt.rawLabel : concursoFilters.modalidad}` });
    }
  } else {
    if (concursoFilters.etapa) chips.push({ key: 'etapa', label: `Etapa: ${concursoFilters.etapa}` });
    const curCats = getSelectedCategorias();
    if (curCats.length > 0) {
      curCats.forEach(c => {
        const norm = normalizeFilterValue(c);
        const opt = (categoriaOptions || []).find(o => o.value === norm);
        chips.push({ key: `categoria:${norm}`, label: `Categoría: ${opt ? opt.rawLabel : c}` });
      });
    }
    if (concursoFilters.genero) chips.push({ key: 'genero', label: `Género: ${concursoFilters.genero}` });
    if (concursoFilters.disciplina) chips.push({ key: 'disciplina', label: `Disciplina: ${concursoFilters.disciplina}` });
  }
  if (concursoFilters.query) {
    chips.push({ key: 'query', label: `Buscar: "${concursoFilters.query}"` });
  }

  const hasActiveFilters = chips.length > 0;
  const activeChipsHtml = chips.map(c => `
    <span class="filterChip">
      ${esc(c.label)}
      <button type="button" data-chip-clear="${c.key}" aria-label="Quitar filtro ${esc(c.label)}">✕</button>
    </span>
  `).join('');

  // Título dinámico de la tabla
  let tableTitleParts = [tipo ? tipo.nombre : 'Todos los concursos escolares'];
  if (isJedpa) {
    if (concursoFilters.etapa) {
      const eOpt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      tableTitleParts.push(`Etapa ${eOpt ? eOpt.rawLabel : concursoFilters.etapa}`);
    }
    if (concursoFilters.disciplina) {
      const dOpt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      tableTitleParts.push(dOpt ? dOpt.rawLabel : concursoFilters.disciplina);
    }
    const curCats = getSelectedCategorias();
    if (curCats.length === 1) {
      const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(curCats[0]));
      tableTitleParts.push(`Categoría ${cOpt ? cOpt.rawLabel : curCats[0]}`);
    } else if (curCats.length > 1) {
      const names = curCats.map(c => {
        const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(c));
        return cOpt ? cOpt.rawLabel : c;
      });
      tableTitleParts.push(`Categorías: ${names.join(', ')}`);
    }
    if (concursoFilters.genero) {
      const gOpt = generoOptions.find(o => o.value === concursoFilters.genero);
      tableTitleParts.push(gOpt ? gOpt.rawLabel : concursoFilters.genero);
    }
  } else if (isJfen) {
    if (concursoFilters.etapa) {
      const eOpt = etapaOptions.find(o => o.value === concursoFilters.etapa);
      tableTitleParts.push(`Etapa ${eOpt ? eOpt.rawLabel : concursoFilters.etapa}`);
    }
    const curCats = getSelectedCategorias();
    if (curCats.length === 1) {
      const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(curCats[0]));
      tableTitleParts.push(`Categoría ${cOpt ? cOpt.rawLabel : curCats[0]}`);
    } else if (curCats.length > 1) {
      const names = curCats.map(c => {
        const cOpt = categoriaOptions.find(o => o.value === normalizeFilterValue(c));
        return cOpt ? cOpt.rawLabel : c;
      });
      tableTitleParts.push(`Categorías: ${names.join(', ')}`);
    }
    if (concursoFilters.arte) {
      const aOpt = arteOptions.find(o => o.value === concursoFilters.arte);
      tableTitleParts.push(aOpt ? aOpt.rawLabel : concursoFilters.arte);
    }
    if (concursoFilters.disciplina) {
      const dOpt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
      tableTitleParts.push(dOpt ? dOpt.rawLabel : concursoFilters.disciplina);
    }
  } else {
    if (concursoFilters.etapa) {
      tableTitleParts.push(`Etapa ${concursoFilters.etapa}`);
    }
    const curCats = getSelectedCategorias();
    if (curCats.length === 1) {
      const cOpt = (categoriaOptions || []).find(o => o.value === normalizeFilterValue(curCats[0]));
      tableTitleParts.push(`Categoría ${cOpt ? cOpt.rawLabel : curCats[0]}`);
    } else if (curCats.length > 1) {
      const names = curCats.map(c => {
        const cOpt = (categoriaOptions || []).find(o => o.value === normalizeFilterValue(c));
        return cOpt ? cOpt.rawLabel : c;
      });
      tableTitleParts.push(`Categorías: ${names.join(', ')}`);
    }
  }
  const dynamicTableTitle = 'Resultados consolidados: ' + tableTitleParts.join(' · ');

  // Filas de la tabla de resultados (Modo Tabla)
  const rowsHtml = filtered.map(r => {
    const isExpanded = concursoExpandedId === r.id;
    const partSummary = (r.participantes || []).map(p => {
      const nom = formatearNombre(p);
      const dni = p.dni ? ' <small style="color:var(--ink-soft)">(' + esc(p.dni) + ')</small>' : '';
      const rol = (p.rol && p.rol !== 'Estudiante' && p.rol !== 'Deportista') ? ' <small style="color:var(--ink-soft)">[' + esc(p.rol) + ']</small>' : '';
      return esc(nom) + dni + rol;
    }).join('<br>') || '<span style="color:var(--ink-soft);font-style:italic">Sin participante registrado</span>';

    let asesSummary = '';
    if (isJedpa) {
      const ctGrupo = obtenerCuerpoTecnicoGrupo(r, state.concursoCuerpoTecnico || [], filtered);
      // Prioridad 1: Cuerpo técnico formalizado a nivel de grupo en concursoCuerpoTecnico
      if (ctGrupo.esGrupoFormalizado && ctGrupo.miembros && ctGrupo.miembros.length > 0) {
        asesSummary = ctGrupo.miembros.map(a => {
          const nom = formatearNombre(a).toUpperCase();
          const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
          const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol.toUpperCase()) + ']</small>' : '';
          return esc(nom) + dni + rol;
        }).join('<br>') + ' <br><span class="badge" style="background:#dcfce7;color:#15803d;font-size:10px;font-weight:700;margin-top:3px;display:inline-block">Formalizado</span>';
      } else if (r.asesores && r.asesores.length > 0) {
        // Prioridad 2: Asesor individual guardado en el registro
        asesSummary = r.asesores.map(a => {
          const nom = formatearNombre(a).toUpperCase();
          const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
          const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol.toUpperCase()) + ']</small>' : '';
          return esc(nom) + dni + rol;
        }).join('<br>');
      } else if (ctGrupo.miembros && ctGrupo.miembros.length > 0) {
        // Asesor detectado automáticamente en el grupo
        asesSummary = ctGrupo.miembros.map(a => {
          const nom = formatearNombre(a).toUpperCase();
          const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
          const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol.toUpperCase()) + ']</small>' : '';
          return esc(nom) + dni + rol;
        }).join('<br>');
      } else {
        // Prioridad 3: Sin cuerpo técnico registrado
        asesSummary = '<span style="color:var(--ink-soft);font-style:italic">Sin cuerpo técnico registrado</span>';
      }
    } else {
      asesSummary = (r.asesores || []).map(a => {
        const nom = formatearNombre(a);
        const dni = a.dni ? ' <small style="color:var(--ink-soft)">(' + esc(a.dni) + ')</small>' : '';
        const rol = a.rol ? ' <small style="color:var(--ink-soft)">[' + esc(a.rol) + ']</small>' : '';
        return esc(nom) + dni + rol;
      }).join('<br>') || '<span style="color:var(--ink-soft);font-style:italic">Sin docente asesor registrado</span>';
    }

    let detExtra = [];
    if (!concursoFilters.tipoId) {
      detExtra.push('<span class="badge" style="background:var(--primary-tint);color:var(--primary);font-size:10.5px;font-weight:600">' + esc(r.tipoConcursoNombre || r.tipoConcurso || 'Concurso') + '</span>');
    }
    if (r.genero) detExtra.push('<span class="badge" style="background:var(--surface-2);font-size:10.5px">' + esc(r.genero) + '</span>');
    if (r.disciplina) detExtra.push('<strong>' + esc(r.disciplina) + '</strong>');
    if (r.tituloTrabajo) detExtra.push('<em>«' + esc(r.tituloTrabajo) + '»</em>' + (r.seudonimo ? ' <small style="color:var(--ink-soft)">(' + esc(r.seudonimo) + ')</small>' : ''));
    const detHtml = detExtra.join('<br>') || '—';

    const editBtn = '<button class="btn secondary small" data-cedit="' + r.id + '" title="Editar registro">✏️</button>';
    const delBtn = isAdmin ? '<button class="iconBtn" data-cdel="' + r.id + '" title="Eliminar registro">✕</button>' : '';

    let detailContent = '';
    if (isExpanded) {
      const partListDetailed = (r.participantes || []).map(p => {
        const nom = formatearNombre(p);
        return '<li><strong>' + esc(nom) + '</strong> · DNI: ' + esc(p.dni || '—') + ' · Rol: ' + esc(p.rol || 'Participante') + '</li>';
      }).join('');
      const asesListDetailed = (r.asesores || []).map(a => {
        const nom = isJedpa ? formatearNombre(a).toUpperCase() : formatearNombre(a);
        const rol = isJedpa ? (a.rol ? a.rol.toUpperCase() : 'DELEGADO') : (a.rol || 'Asesor');
        return '<li><strong>' + esc(nom) + '</strong> · DNI: ' + esc(a.dni || '—') + ' · Rol: ' + esc(rol) + '</li>';
      }).join('');

      detailContent = '<tr class="detailRow"><td colspan="8">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px">' +
        '<div>' +
        '<h5 style="margin:0 0 6px;color:var(--ink)">Participantes (' + (r.participantes || []).length + ')</h5>' +
        '<ul style="margin:0;padding-left:18px;font-size:12.5px">' + (partListDetailed || '<li>Sin participantes</li>') + '</ul>' +
        '</div>' +
        '<div>' +
        '<h5 style="margin:0 0 6px;color:var(--ink)">Docentes Asesores / Delegados (' + (r.asesores || []).length + ')</h5>' +
        '<ul style="margin:0;padding-left:18px;font-size:12.5px">' + (asesListDetailed || '<li>Sin asesores</li>') + '</ul>' +
        '</div>' +
        '<div>' +
        '<h5 style="margin:0 0 6px;color:var(--ink)">Detalles Adicionales</h5>' +
        '<p style="margin:0;font-size:12.5px;color:var(--ink-soft)">' +
        'Concurso: <strong>' + esc(r.tipoConcursoNombre || r.tipoConcurso || '—') + '</strong><br>' +
        'Código Modular: <strong>' + esc(r.codigoModular || '—') + '</strong><br>' +
        'Resolución: <strong>' + esc(r.resolucionRef || '—') + '</strong><br>' +
        'Registrado por: <strong>' + esc(r.responsable || '—') + '</strong><br>' +
        'Fecha: <strong>' + fmtDate(r.fecha) + '</strong>' +
        '</p>' +
        '</div>' +
        '</div>' +
        '</td></tr>';
    }

    return '<tr class="clickable" data-crow="' + r.id + '">' +
      '<td>' + formatPuestoBadge(r.puesto) + '</td>' +
      '<td><strong>' + esc(r.institucion) + '</strong>' + (r.codigoModular ? '<br><small style="color:var(--ink-soft)">' + esc(r.codigoModular) + '</small>' : '') + '</td>' +
      '<td><span class="badge" style="background:var(--surface-2)">' + esc(r.categoria || '—') + '</span></td>' +
      '<td>' + detHtml + '</td>' +
      '<td>' + partSummary + '</td>' +
      '<td>' + asesSummary + '</td>' +
      '<td><span class="badge badge-etapa">' + esc(r.etapa) + '</span></td>' +
      '<td style="white-space:nowrap">' + editBtn + delBtn + '</td>' +
      '</tr>' + detailContent;
  }).join('') || (
      '<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--ink-soft)">' +
      '<p style="font-size:14.5px;margin-bottom:6px">No se encontraron registros con los filtros seleccionados.</p>' +
      (isAdmin && regs.length === 0 ? '<button type="button" class="btn" id="btnImportGanadoresConsolidadoEmpty" style="margin-top:8px">📥 Cargar 83 ganadores oficiales (RD UGEL 03 - 2026)</button>' : '') +
      '</td></tr>'
    );

  // Tarjetas de Ficha por Categoría y Disciplina (Modo Fichas JFEN)
  const fichasHtml = filtered.map(r => {
    const editBtn = '<button type="button" class="btn secondary small" data-cedit="' + r.id + '" title="Editar registro">✏️ Editar</button>';
    const delBtn = isAdmin ? '<button type="button" class="iconBtn" data-cdel="' + r.id + '" title="Eliminar registro" style="margin-left:6px">✕</button>' : '';

    const parts = (r.participantes || []).slice().sort((a, b) => {
      const nomA = formatearNombre(a);
      const nomB = formatearNombre(b);
      return nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
    });

    const ases = (r.asesores || []);

    const partRowsHtml = parts.map((p, idx) => {
      const isAlt = (idx % 2 === 1) ? ' class="rowAlt"' : '';
      const nom = formatearNombre(p);
      const dni = p.dni ? esc(p.dni) : '—';
      const rowHeaderCell = (idx === 0)
        ? `<td rowspan="${Math.max(parts.length, 1)}" class="rowHeaderPart">Estudiantes (${parts.length})</td>`
        : '';
      return `
        <tr${isAlt}>
          ${rowHeaderCell}
          <td style="width:36px;text-align:center;color:var(--ink-soft);font-size:11.5px">${idx + 1}</td>
          <td class="partNameCell">${esc(nom)}</td>
          <td class="partDniCell">${dni}</td>
        </tr>
      `;
    }).join('') || `
      <tr>
        <td class="rowHeaderPart">Estudiantes (0)</td>
        <td colspan="3" style="color:var(--ink-soft);font-style:italic;padding:10px 14px">Sin estudiantes registrados</td>
      </tr>
    `;

    const asesRowsHtml = ases.map(a => {
      const nom = formatearNombre(a);
      const dni = a.dni ? esc(a.dni) : '—';
      return `
        <tr class="rowDocente">
          <td class="rowHeaderDoc">Docente Asesor</td>
          <td style="width:36px;text-align:center;color:var(--ink-soft);font-size:11.5px">—</td>
          <td class="partNameCell" style="font-weight:600">${esc(nom)}</td>
          <td class="partDniCell">${dni}</td>
        </tr>
      `;
    }).join('') || `
      <tr class="rowDocente">
        <td class="rowHeaderDoc">Docente Asesor</td>
        <td colspan="3" style="color:var(--ink-soft);font-style:italic;padding:10px 14px">Sin docente asesor registrado</td>
      </tr>
    `;

    const parsed = parseArteDisciplina(r.disciplina);
    const arteStr = r._arte || parsed.arte || '—';
    const discStr = r._disciplina || parsed.disciplina || r.disciplina || '—';

    return `
      <div class="jfenFichaCard">
        <div class="jfenCategoryBar">CATEGORÍA ${esc(r.categoria || '—')}</div>
        <table class="jfenMetaTable">
          <tbody>
            <tr>
              <th class="metaLabel">Arte</th>
              <td class="metaVal"><strong>${esc(arteStr)}</strong></td>
            </tr>
            <tr>
              <th class="metaLabel">Disciplina</th>
              <td class="metaVal"><strong>${esc(discStr)}</strong></td>
            </tr>
            <tr>
              <th class="metaLabel">Institución Educativa</th>
              <td class="metaVal"><strong>${esc(r.institucion || '—')}</strong></td>
            </tr>
            <tr>
              <th class="metaLabel">Código Modular</th>
              <td class="metaVal">${esc(r.codigoModular || '—')}</td>
            </tr>
            ${r.tituloTrabajo ? `
              <tr>
                <th class="metaLabel">Título de la Obra</th>
                <td class="metaVal"><em>«${esc(r.tituloTrabajo)}»</em> ${r.seudonimo ? `<small style="color:var(--ink-soft)">(${esc(r.seudonimo)})</small>` : ''}</td>
              </tr>
            ` : ''}
            <tr>
              <th class="metaLabel">Puesto obtenido</th>
              <td class="metaVal">${formatPuestoBadge(r.puesto)}</td>
            </tr>
            <tr>
              <th class="metaLabel">Resolución Directoral</th>
              <td class="metaVal">${esc(r.resolucionRef || '—')}</td>
            </tr>
          </tbody>
        </table>
        <table class="jfenParticipantsTable">
          <thead>
            <tr>
              <th style="width:140px">Condición</th>
              <th style="width:36px">N°</th>
              <th>Apellidos y Nombres</th>
              <th style="width:110px;text-align:center">DNI</th>
            </tr>
          </thead>
          <tbody>
            ${partRowsHtml}
            ${asesRowsHtml}
          </tbody>
        </table>
        <div class="jfenCardFooter">
          <span style="font-size:12px;color:var(--ink-soft)">Etapa: <strong>${esc(r.etapa || '—')}</strong></span>
          <div style="margin-left:auto;display:flex;align-items:center">
            ${editBtn}
            ${delBtn}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Selector de disciplina label para JEDPA
  let selectedDisciplinaLabel = 'Todas';
  if (isJedpa) {
    const curDiscOpt = disciplinaOptions.find(o => o.value === concursoFilters.disciplina);
    selectedDisciplinaLabel = curDiscOpt ? curDiscOpt.label : `Todas (${etapaRows.length})`;
  }

  // Renderizado del panel de filtros
  let filterBarHtml = '';
  if (isJedpa) {
    filterBarHtml = `
      <div class="panel" style="margin-bottom:16px">
        <div class="jedpaFilterContainer">
          <!-- Fila 0: Tipo de concurso (ancho completo) -->
          <div class="jedpaRowTipo">
            <div class="jedpaFilterField">
              <label for="cf_tipo">Tipo de concurso</label>
              <select id="cf_tipo" title="${esc(tipo ? tipo.nombre : 'Todos los concursos')}">
                <option value="">Todos los concursos (${regs.length})</option>
                ${tipos.map(t => `<option value="${t.id}" ${t.id === concursoFilters.tipoId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Fila 1: Cascada (1. ETAPA -> 2. DISCIPLINA -> 3. CATEGORÍA -> 4. GÉNERO -> 5. BUSCAR) -->
          <div class="jedpaFiltersGrid">
            <!-- 1. ETAPA -->
            <div class="jedpaFilterField">
              <label for="cf_etapa">1. Etapa</label>
              <select id="cf_etapa" ${etapaOptions.length <= 1 ? 'disabled' : ''}>
                ${etapaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.etapa ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
              </select>
            </div>

            <!-- 2. DISCIPLINA (Searchable Select) -->
            <div class="jedpaFilterField">
              <label for="btn_cf_disciplina">2. Disciplina</label>
              <div class="searchableSelectWrap" id="wrap_cf_disciplina">
                <button type="button" class="searchableSelectBtn ${disciplinaOptions.length <= 1 ? 'disabled' : ''}" id="btn_cf_disciplina" aria-haspopup="listbox" aria-expanded="false" ${disciplinaOptions.length <= 1 ? 'disabled' : ''}>
                  <span id="txt_cf_disciplina">${esc(selectedDisciplinaLabel)}</span>
                  <span style="font-size:11px;color:var(--ink-soft)">▾</span>
                </button>
                <div class="searchableSelectDropdown" id="drop_cf_disciplina" style="display:none" role="listbox">
                  <div class="searchableSelectSearch">
                    <input type="search" placeholder="Buscar disciplina..." id="input_cf_disciplina_search" autocomplete="off">
                  </div>
                  <div class="searchableSelectList" id="list_cf_disciplina">
                    ${disciplinaOptions.map(o => `
                      <div class="searchableSelectOption ${o.value === concursoFilters.disciplina ? 'selected' : ''}" data-val="${esc(o.value)}" role="option">
                        <span>${esc(o.rawLabel || 'Todas')}</span>
                        <span style="font-size:11.5px;color:var(--ink-soft)">(${o.count})</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <select id="cf_disciplina" style="display:none">
                  ${disciplinaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.disciplina ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- 3. CATEGORÍA (Multiselect) -->
            <div class="jedpaFilterField">
              <label for="btn_cf_categoria">3. Categoría</label>
              ${renderCategoryMultiSelectMarkup('jedpa', categoriaOptions, getSelectedCategorias())}
            </div>

            <!-- 4. GÉNERO -->
            <div class="jedpaFilterField">
              <label for="cf_genero">4. Género</label>
              <select id="cf_genero" ${generoOptions.length <= 1 ? 'disabled' : ''}>
                ${generoOptions.length <= 1
        ? '<option value="">Sin opciones</option>'
        : generoOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.genero ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
      }
              </select>
            </div>

            <!-- 5. BUSCAR -->
            <div class="jedpaFilterField">
              <label for="cf_query">Buscar</label>
              <input type="search" id="cf_query" value="${esc(concursoFilters.query)}" placeholder="I.E., estudiante, DNI, RD...">
            </div>
          </div>

          <!-- Fila 2: Chips de filtros activos + Contador -->
          <div class="jedpaActiveFiltersRow">
            ${hasActiveFilters ? `
              <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filtros activos:</span>
              ${activeChipsHtml}
            ` : ''}
            <div class="recordsCounter" aria-live="polite">
              Mostrando <strong>${filtered.length}</strong> de <strong>${baseRows.length}</strong> registros
            </div>
          </div>

          <!-- Fila 3: Botones de acción agrupados -->
          <div class="concursoActionsRow">
            <div class="concursoActionsLeft">
              <button type="button" class="btn secondary small" id="cf_clear">Limpiar</button>
              <button type="button" class="btn secondary small" id="cf_asignarPuestosBtn" title="Asignar puestos por podio de forma masiva">🏆 Asignar puestos</button>
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_consolidarCuerpoTecnicoBtn" title="Asistente para consolidar el cuerpo técnico por grupo">👥 Consolidar cuerpo técnico</button>' : ''}
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" title="Importar 83 ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
              <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
            </div>
            <div class="concursoActionsRight">
              <button type="button" class="btn secondary small" id="cf_exportCsv">Exportar CSV</button>
              <button type="button" class="btn small" id="cf_exportPdf">⬇ Descargar reporte (PDF)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (isJfen) {
    filterBarHtml = `
      <div class="panel" style="margin-bottom:16px">
        <div class="jfenFilterContainer">
          <!-- Fila 0: Tipo de concurso (ancho completo) -->
          <div class="jfenRowTipo">
            <div class="jedpaFilterField">
              <label for="cf_tipo">Tipo de concurso</label>
              <select id="cf_tipo" title="${esc(tipo ? tipo.nombre : 'Juegos Florales Escolares Nacionales (JFEN)')}">
                <option value="">Todos los concursos (${regs.length})</option>
                ${tipos.map(t => `<option value="${t.id}" ${t.id === concursoFilters.tipoId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Fila 1: Cascada (1. ETAPA -> 2. CATEGORÍA -> 3. ARTE -> 4. DISCIPLINA -> 5. MODALIDAD -> 6. BUSCAR) -->
          <div class="jfenFiltersGrid">
            <!-- 1. ETAPA -->
            <div class="jedpaFilterField">
              <label for="cf_etapa">1. Etapa</label>
              <select id="cf_etapa" ${etapaOptions.length <= 1 ? 'disabled' : ''}>
                ${etapaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.etapa ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
              </select>
            </div>

            <!-- 2. CATEGORÍA (Multiselect) -->
            <div class="jedpaFilterField">
              <label for="btn_cf_categoria">2. Categoría</label>
              ${renderCategoryMultiSelectMarkup('jfen', categoriaOptions, getSelectedCategorias())}
            </div>

            <!-- 3. ARTE -->
            <div class="jedpaFilterField">
              <label for="cf_arte">3. Arte / Área</label>
              <select id="cf_arte" ${arteOptions.length <= 1 ? 'disabled' : ''}>
                ${arteOptions.length <= 1
        ? '<option value="">Sin opciones</option>'
        : arteOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.arte ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
      }
              </select>
            </div>

            <!-- 4. DISCIPLINA -->
            <div class="jedpaFilterField">
              <label for="cf_disciplina">4. Disciplina</label>
              <select id="cf_disciplina" ${disciplinaOptions.length <= 1 ? 'disabled' : ''}>
                ${disciplinaOptions.length <= 1
        ? '<option value="">Sin opciones</option>'
        : disciplinaOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.disciplina ? 'selected' : ''}>${esc(o.label)}</option>`).join('')
      }
              </select>
            </div>

            <!-- 5. MODALIDAD (solo si aplica) -->
            ${modalidadOptions.length > 1 ? `
              <div class="jedpaFilterField">
                <label for="cf_modalidad">5. Modalidad</label>
                <select id="cf_modalidad">
                  ${modalidadOptions.map(o => `<option value="${esc(o.value)}" ${o.value === concursoFilters.modalidad ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
                </select>
              </div>
            ` : ''}

            <!-- 6. BUSCAR -->
            <div class="jedpaFilterField" style="min-width:180px">
              <label for="cf_query">Buscar</label>
              <input type="search" id="cf_query" value="${esc(concursoFilters.query)}" placeholder="I.E., estudiante, DNI, RD...">
            </div>
          </div>

          <!-- Fila 2: Chips de filtros activos + Contador -->
          <div class="jfenActiveFiltersRow">
            ${hasActiveFilters ? `
              <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filtros activos:</span>
              ${activeChipsHtml}
            ` : ''}
            <div class="recordsCounter" aria-live="polite">
              Mostrando <strong>${filtered.length}</strong> de <strong>${baseRows.length}</strong> registros
            </div>
          </div>

          <!-- Fila 3: Botones de acción agrupados -->
          <div class="concursoActionsRow">
            <div class="concursoActionsLeft">
              <button type="button" class="btn secondary small" id="cf_clear">Limpiar</button>
              <button type="button" class="btn secondary small" id="cf_asignarPuestosBtn" title="Asignar puestos por podio de forma masiva">🏆 Asignar puestos</button>
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" title="Importar ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
              <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
            </div>
            <div class="concursoActionsRight">
              <button type="button" class="btn secondary small" id="cf_exportCsv">Exportar CSV</button>
              <button type="button" class="btn small" id="cf_exportPdf">⬇ Descargar reporte (PDF)</button>
            </div>
          </div>
        </div>
      </div>
    `;
  } else {
    // Barra de filtros estándar para los demás concursos
    filterBarHtml = `
      <div class="panel">
        <div class="filterBar" style="margin-bottom:0">
          <div class="field" style="flex:2;min-width:240px">
            <label for="cf_tipo">Tipo de concurso</label>
            <select id="cf_tipo">
              <option value="">Todos los concursos (${regs.length})</option>
              ${tipos.map(t => `<option value="${t.id}" ${t.id === concursoFilters.tipoId ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="flex:1;min-width:130px">
            <label for="cf_etapa">Etapa</label>
            <select id="cf_etapa">
              <option value="">Todas</option>
              ${['UGEL', 'DRELM', 'MACROREGIONAL', 'NACIONAL'].map(e => `<option value="${e}" ${e === concursoFilters.etapa ? 'selected' : ''}>${e}</option>`).join('')}
            </select>
          </div>
          <div class="field" style="flex:1.2;min-width:160px">
            <label for="btn_cf_categoria">Categoría</label>
            ${renderCategoryMultiSelectMarkup('standard', categoriaOptions, getSelectedCategorias())}
          </div>
          ${(tipo && tipo.tieneGenero) ? `
            <div class="field" style="flex:1;min-width:120px">
              <label for="cf_genero">Género</label>
              <select id="cf_genero">
                <option value="">Todos</option>
                ${['Damas', 'Varones'].map(g => `<option value="${g}" ${g.toLowerCase() === (concursoFilters.genero || '').toLowerCase() ? 'selected' : ''}>${g}</option>`).join('')}
              </select>
            </div>
          ` : ''}
          ${(tipo && tipo.tieneDisciplina) ? `
            <div class="field" style="flex:1.5;min-width:160px">
              <label for="cf_disciplina">${esc(tipo.etiquetaDisciplina || 'Disciplina')}</label>
              <input type="search" id="cf_disciplina" value="${esc(concursoFilters.disciplina)}" placeholder="Buscar disciplina...">
            </div>
          ` : ''}
          <div class="field" style="flex:1.5;min-width:180px">
            <label for="cf_query">Buscar</label>
            <input type="search" id="cf_query" value="${esc(concursoFilters.query)}" placeholder="I.E., estudiante, DNI, RD...">
          </div>
          <div class="concursoActionsRow" style="width:100%;margin-top:10px">
            <div class="concursoActionsLeft">
              <button type="button" class="btn secondary small" id="cf_clear">Limpiar</button>
              <button type="button" class="btn secondary small" id="cf_asignarPuestosBtn" title="Asignar puestos por podio de forma masiva">🏆 Asignar puestos</button>
              ${(isAdmin && isJedpa) ? '<button type="button" class="btn secondary small" id="cf_consolidarCuerpoTecnicoBtn" title="Asistente para formalizar el cuerpo técnico por grupo">👥 Consolidar cuerpo técnico</button>' : ''}
              ${isAdmin ? '<button type="button" class="btn secondary small" id="cf_importRd" title="Importar 83 ganadores de Resoluciones Directorales 2026">📥 Cargar ganadores RD</button>' : ''}
              <button type="button" class="btn secondary small" id="cf_detectDuplicatesBtn" title="Buscar registros duplicados o puestos repetidos">🔍 Detectar duplicados</button>
            </div>
            <div class="concursoActionsRight">
              <button type="button" class="btn secondary small" id="cf_exportCsv">Exportar CSV</button>
              <button type="button" class="btn small" id="cf_exportPdf">⬇ Descargar reporte (PDF)</button>
            </div>
          </div>
        </div>
        ${hasActiveFilters ? `
          <div class="jedpaActiveFiltersRow" style="margin-top:10px">
            <span style="font-size:12px;font-weight:700;color:var(--navy-900)">Filtros activos:</span>
            ${activeChipsHtml}
            <div class="recordsCounter" aria-live="polite">
              Mostrando <strong>${filtered.length}</strong> de <strong>${baseRows.length}</strong> registros
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  const mainResultsHtml = (isJfen && concursoVistaJfen === 'fichas')
    ? (filtered.length === 0
      ? '<div class="empty" style="padding:32px;text-align:center"><p style="font-size:14.5px;color:var(--ink-soft);margin-bottom:6px">No se encontraron registros con los filtros seleccionados.</p></div>'
      : `<div class="jfenFichasContainer">${fichasHtml}</div>`)
    : `
      <div class="tblWrap"><table><thead><tr>
      <th style="width:70px">Puesto</th>
      <th>Institución</th>
      <th>Categoría</th>
      <th>Detalle / Área</th>
      <th>Participantes</th>
      <th>${esc(concursoCfg.etiqueta_columna_asesor || 'Docente Asesor')}</th>
      <th>Etapa</th>
      <th style="width:90px"></th>
      </tr></thead><tbody>${rowsHtml}</tbody></table></div>
    `;

  host.innerHTML = '' +
    filterBarHtml +
    '<div id="concursoReportCapture">' +
    (groupCtBannerHtml || '') +
    '<div class="cards">' +
    '<div class="card"><div class="num">' + totalRegs + '</div><div class="lbl">Registros / Premiaciones</div></div>' +
    '<div class="card"><div class="num">' + totalPartUnicos + '</div><div class="lbl">Participantes únicos</div></div>' +
    '<div class="card"><div class="num">' + uniqueColegios + '</div><div class="lbl">Instituciones educativas</div></div>' +
    '<div class="card"><div class="num">' + totalAsesUnicos + '</div><div class="lbl">' + esc(concursoCfg.etiqueta_asesor_plural || 'Docentes asesores') + '</div></div>' +
    (isJedpa ? '<div class="card"><div class="num">' + totalCtUnicos + '</div><div class="lbl">Cuerpo técnico único</div></div>' : '') +
    '</div>' +

    '<div class="panel">' +
    '<div class="concursoResultsHeader" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px">' +
    '<h3 style="margin:0">' + esc(dynamicTableTitle) + '</h3>' +
    (isJfen ? `
      <div class="concursoViewSwitcher" role="tablist" aria-label="Modo de vista">
        <button type="button" class="btnViewTab ${concursoVistaJfen === 'fichas' ? 'active' : ''}" id="btnVistaFichas" role="tab" aria-selected="${concursoVistaJfen === 'fichas'}">🗂 Fichas</button>
        <button type="button" class="btnViewTab ${concursoVistaJfen === 'tabla' ? 'active' : ''}" id="btnVistaTabla" role="tab" aria-selected="${concursoVistaJfen === 'tabla'}">📑 Tabla</button>
      </div>
    ` : '') +
    '</div>' +
    mainResultsHtml +
    '</div>' +
    '</div>';

  // Event listeners de vista y filtros JFEN
  if (isJfen) {
    const btnFichas = document.getElementById('btnVistaFichas');
    if (btnFichas) {
      btnFichas.addEventListener('click', () => {
        concursoVistaJfen = 'fichas';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }
    const btnTabla = document.getElementById('btnVistaTabla');
    if (btnTabla) {
      btnTabla.addEventListener('click', () => {
        concursoVistaJfen = 'tabla';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }

    const fArte = document.getElementById('cf_arte');
    if (fArte) {
      fArte.addEventListener('change', (e) => {
        concursoFilters.arte = e.target.value;
        concursoFilters.disciplina = '';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }

    const fDiscJfen = document.getElementById('cf_disciplina');
    if (fDiscJfen) {
      fDiscJfen.addEventListener('change', (e) => {
        concursoFilters.disciplina = e.target.value;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }

    const fModJfen = document.getElementById('cf_modalidad');
    if (fModJfen) {
      fModJfen.addEventListener('change', (e) => {
        concursoFilters.modalidad = e.target.value;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      });
    }
  }

  // Event listeners generales de filtros
  document.getElementById('cf_tipo').addEventListener('change', (e) => {
    concursoFilters.tipoId = e.target.value;
    concursoFilters.etapa = '';
    concursoFilters.disciplina = '';
    concursoFilters.categoria = [];
    concursoFilters.genero = '';
    concursoFilters.arte = '';
    concursoFilters.modalidad = '';
    concursoFilters.query = '';
    concursoCategoryDropdownOpen = false;
    concursoCategorySearchText = '';
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  const fEtapa = document.getElementById('cf_etapa');
  if (fEtapa) {
    fEtapa.addEventListener('change', (e) => {
      concursoFilters.etapa = e.target.value;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  setupCategoryMultiSelectEvents(host, state, dbNs, isAdmin, currentUser, container, navigate);

  const filGen = document.getElementById('cf_genero');
  if (filGen) {
    filGen.addEventListener('change', (e) => {
      concursoFilters.genero = e.target.value;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  // Disciplina interactiva para JEDPA
  if (isJedpa) {
    const btnDisc = document.getElementById('btn_cf_disciplina');
    const dropDisc = document.getElementById('drop_cf_disciplina');
    const inputSearchDisc = document.getElementById('input_cf_disciplina_search');
    const listDisc = document.getElementById('list_cf_disciplina');

    if (btnDisc && dropDisc) {
      btnDisc.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = dropDisc.style.display !== 'none';
        if (isOpen) {
          dropDisc.style.display = 'none';
          btnDisc.setAttribute('aria-expanded', 'false');
        } else {
          dropDisc.style.display = 'flex';
          btnDisc.setAttribute('aria-expanded', 'true');
          if (inputSearchDisc) {
            inputSearchDisc.value = '';
            filterDiscOptions('');
            inputSearchDisc.focus();
          }
        }
      });

      document.addEventListener('click', (e) => {
        if (!e.target.closest('#wrap_cf_disciplina')) {
          dropDisc.style.display = 'none';
          btnDisc.setAttribute('aria-expanded', 'false');
        }
      });

      btnDisc.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          dropDisc.style.display = 'flex';
          btnDisc.setAttribute('aria-expanded', 'true');
          inputSearchDisc?.focus();
        }
      });

      function filterDiscOptions(q) {
        const normQ = normalizeFilterValue(q);
        const opts = listDisc.querySelectorAll('.searchableSelectOption');
        opts.forEach(opt => {
          const text = normalizeFilterValue(opt.textContent);
          const match = text.includes(normQ);
          opt.style.display = match ? 'flex' : 'none';
        });
      }

      if (inputSearchDisc) {
        inputSearchDisc.addEventListener('input', (e) => {
          filterDiscOptions(e.target.value);
        });
        inputSearchDisc.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            dropDisc.style.display = 'none';
            btnDisc.setAttribute('aria-expanded', 'false');
            btnDisc.focus();
          }
        });
      }

      listDisc.querySelectorAll('.searchableSelectOption').forEach(opt => {
        opt.addEventListener('click', () => {
          concursoFilters.disciplina = opt.dataset.val;
          dropDisc.style.display = 'none';
          btnDisc.setAttribute('aria-expanded', 'false');
          renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
        });
      });
    }
  } else if (!isJfen) {
    const filDisc = document.getElementById('cf_disciplina');
    if (filDisc) {
      let discDebounce;
      filDisc.addEventListener('input', (e) => {
        clearTimeout(discDebounce);
        discDebounce = setTimeout(() => {
          concursoFilters.disciplina = e.target.value;
          renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
        }, 300);
      });
    }
  }

  // Chips click para limpiar filtro individual
  host.querySelectorAll('[data-chip-clear]').forEach(b => {
    b.addEventListener('click', () => {
      const field = b.dataset.chipClear;
      if (field && field.startsWith('categoria:')) {
        const catNorm = field.substring('categoria:'.length);
        const cur = getSelectedCategorias().filter(c => normalizeFilterValue(c) !== catNorm);
        setSelectedCategorias(cur);
        concursoCategoryDropdownOpen = false;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      } else if (field === 'categoria') {
        setSelectedCategorias([]);
        concursoCategoryDropdownOpen = false;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      } else if (field && concursoFilters[field] !== undefined) {
        concursoFilters[field] = '';
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      }
    });
  });

  const filQuery = document.getElementById('cf_query');
  if (filQuery) {
    let qDebounce;
    filQuery.addEventListener('input', (e) => {
      clearTimeout(qDebounce);
      qDebounce = setTimeout(() => {
        concursoFilters.query = e.target.value;
        renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      }, 300);
    });
  }

  document.getElementById('cf_clear').addEventListener('click', () => {
    concursoFilters = {
      tipoId: concursoFilters.tipoId, // Conserva el tipo de concurso
      etapa: '',
      disciplina: '',
      categoria: [],
      genero: '',
      arte: '',
      modalidad: '',
      query: ''
    };
    concursoCategoryDropdownOpen = false;
    concursoCategorySearchText = '';
    renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
  });

  // Botón Cargar Ganadores RD (en barra de filtros)
  const importBtn = document.getElementById('cf_importRd');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Asignar Puestos por Podio
  const asignarPuestosBtn = document.getElementById('cf_asignarPuestosBtn');
  if (asignarPuestosBtn) {
    asignarPuestosBtn.addEventListener('click', () => {
      concursoSubTab = 'asignar_podios';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  }

  // Botón Detectar Duplicados
  const dupBtn = document.getElementById('cf_detectDuplicatesBtn');
  if (dupBtn) {
    dupBtn.addEventListener('click', () => {
      openDuplicateDetectorModal(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Consolidar Cuerpo Técnico por Grupo (JEDPA)
  const consolidarBtn = document.getElementById('cf_consolidarCuerpoTecnicoBtn');
  if (consolidarBtn) {
    consolidarBtn.addEventListener('click', () => {
      openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }
  const bannerConsolidarBtn = document.getElementById('btnConsolidarCtGrupoBanner');
  if (bannerConsolidarBtn) {
    bannerConsolidarBtn.addEventListener('click', () => {
      openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Cargar Ganadores RD (en estado vacío)
  const importEmptyBtn = document.getElementById('btnImportGanadoresConsolidadoEmpty');
  if (importEmptyBtn) {
    importEmptyBtn.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Exportar PDF oficial de concursos (Acta de Resultados A4 Landscape o Fichas JFEN A4 Portrait o Fichas JEDPA Colectivas)
  document.getElementById('cf_exportPdf').addEventListener('click', async () => {
    const { openDownloadConfigModal } = await import('../ui.js?v=20261015_v1');
    const { exportActaOrdenMeritoPdf, exportConcursosReportPdf } = await import('../pdf-concursos.js?v=20261014_v1');
    const formatoTipo = getFormatoPdfConcurso(tipo);
    const esJfenConcurso = isJfen;
    const esJedpaConcurso = isJedpa || (tipo && (tipo.id === 'jedpa' || (tipo.nombre || '').toUpperCase().includes('JEDPA')));
    openDownloadConfigModal({
      documentTitle: getTituloConsolidadoConcurso(tipo),
      tipoReporte: 'concursos',
      dataRows: filtered,
      currentUser,
      state,
      dbNs,
      isAdmin,
      isJfen: esJfenConcurso,
      isJedpa: esJedpaConcurso,
      tipoConcurso: tipo,
      filters: concursoFilters,
      formatoPdfActas: formatoTipo,
      onConfirm: async (cfg) => {
        if (cfg.formatoConcurso === 'orden_merito') {
          await exportActaOrdenMeritoPdf(filtered, tipo, concursoFilters, cfg);
        } else {
          await exportConcursosReportPdf(filtered, tipo, concursoFilters, cfg);
        }
      }
    });
  });

  // Exportar CSV — columnas separadas: Apellidos | Nombres | DNI | Rol
  document.getElementById('cf_exportCsv').addEventListener('click', () => {
    let headers;
    if (isJedpa) {
      headers = [
        'Puesto', 'Podio', 'Institución', 'Código Modular', 'Concurso', 'Etapa',
        'Categoría', 'Género', 'Arte / Disciplina', 'Título', 'Seudónimo',
        'Tipo Persona', 'Rol cuerpo técnico', 'Apellidos', 'Nombres', 'DNI/Doc.',
        'Origen', 'Resolución', 'Fecha'
      ];
    } else {
      headers = [
        'Puesto', 'Podio', 'Institución', 'Código Modular', 'Concurso', 'Etapa',
        'Categoría', 'Género', 'Arte / Disciplina', 'Título', 'Seudónimo',
        'Tipo Persona', 'Apellidos', 'Nombres', 'DNI/Doc.', 'Rol',
        'Nombre heredado (texto libre)', 'Resolución', 'Fecha'
      ];
    }
    const rows = [];
    filtered.forEach(r => {
      const curTipoObj = (state.tiposConcurso || []).find(t => t.id === r.tipoConcursoId || t.nombre === r.tipoConcursoNombre) || tipo;
      const base = [
        r.puesto || '',
        getPodioLabel(r, curTipoObj),
        r.institucion || '',
        r.codigoModular || '',
        r.tipoConcursoNombre || r.tipoConcurso || '',
        r.etapa || '',
        r.categoria || '',
        formatGeneroDisplay(r.genero),
        r.disciplina || '',
        r.tituloTrabajo || '',
        r.seudonimo || ''
      ];

      if (isJedpa) {
        // En JEDPA: participantes individuales + cuerpo técnico del grupo (o individual) en mayúsculas
        const grupoCt = obtenerCuerpoTecnicoGrupo(r, state.concursoCuerpoTecnico || [], filtered);
        const ctMiembros = (grupoCt.miembros && grupoCt.miembros.length > 0)
          ? grupoCt.miembros.map(m => ({ ...m, _origen: grupoCt.origen === 'concursoCuerpoTecnico' ? 'grupo' : 'grupo' }))
          : (r.asesores || []).map(a => ({ ...a, _origen: 'individual' }));

        const deportistas = (r.participantes || []).map(p => ({
          _tipo: 'Deportista / Participante',
          rol: p.rol || 'Deportista',
          apellidos: (p.apellidos || '').trim().toUpperCase(),
          nombres: (p.nombres || '').trim().toUpperCase(),
          dni: (p.dni || '').trim(),
          origen: 'individual'
        }));

        const ctExport = ctMiembros.map(a => ({
          _tipo: 'Cuerpo Técnico',
          rol: (a.rol || 'Delegado').toUpperCase(),
          apellidos: (a.apellidos || '').trim().toUpperCase(),
          nombres: (a.nombres || '').trim().toUpperCase(),
          dni: (a.dni || '').trim(),
          origen: a._origen || 'grupo'
        }));

        const totalJ = [...deportistas, ...ctExport];
        if (totalJ.length === 0) {
          rows.push([...base, '', '', '', '', '', '', r.resolucionRef || '', r.fecha || '']);
        } else {
          totalJ.forEach(p => {
            rows.push([
              ...base,
              p._tipo,
              p.rol,
              p.apellidos,
              p.nombres,
              p.dni,
              p.origen,
              r.resolucionRef || '',
              r.fecha || ''
            ]);
          });
        }
      } else {
        const personas = [
          ...(r.participantes || []).map(p => ({ ...p, _tipo: 'Participante' })),
          ...(r.asesores || []).map(a => ({ ...a, _tipo: 'Asesor/Entrenador' }))
        ];
        if (personas.length === 0) {
          rows.push([...base, '', '', '', '', '', '', r.resolucionRef || '', r.fecha || '']);
        } else {
          personas.forEach(p => {
            const esHeredado = !((p.apellidos || '').trim()) && (p.nombres || '').trim();
            rows.push([
              ...base,
              p._tipo,
              (p.apellidos || '').trim(),
              (p.nombres || '').trim(),
              (p.dni || '').trim(),
              p.rol || '',
              esHeredado ? (p.nombres || '').trim() : '',
              r.resolucionRef || '',
              r.fecha || ''
            ]);
          });
        }
      }
    });
    downloadCsv('concursos_' + (tipo ? tipo.id : 'todos') + '_' + todayStr() + '.csv', headers, rows);
  });

  // Expandir fila al hacer clic
  host.querySelectorAll('tr[data-crow]').forEach(tr => {
    tr.addEventListener('click', (e) => {
      if (e.target.closest('[data-cedit],[data-cdel]')) return;
      const id = tr.dataset.crow;
      concursoExpandedId = (concursoExpandedId === id) ? null : id;
      renderConcursoConsolidadoView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  });

  // Editar registro de concurso
  host.querySelectorAll('[data-cedit]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rId = btn.dataset.cedit;
      const r = state.concursoRegistros.find(x => x.id === rId);
      if (!r) return;
      concursoEditingId = r.id;
      concursoEditingData = JSON.parse(JSON.stringify(r));
      concursoSelectedTipoId = r.tipoConcursoId;
      const rTipo = (state.tiposConcurso || []).find(t => t.id === r.tipoConcursoId || t.nombre === r.tipoConcursoNombre);
      const defPartRol = getConcursoParticipanteRoles(rTipo)[0];
      const defAsesRol = getConcursoAsesorRoles(rTipo)[0];
      concursoParticipantes = r.participantes && r.participantes.length ? JSON.parse(JSON.stringify(r.participantes)) : [{ nombres: '', apellidos: '', dni: '', rol: defPartRol }];
      concursoAsesores = r.asesores && r.asesores.length ? JSON.parse(JSON.stringify(r.asesores)) : [{ nombres: '', apellidos: '', dni: '', rol: defAsesRol }];
      concursoSubTab = 'registrar';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  });

  // Eliminar registro de concurso (solo admin)
  host.querySelectorAll('[data-cdel]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!isAdmin) return;
      if (!confirm('¿Eliminar este registro de concurso? Esta acción no se puede deshacer.')) return;
      try {
        await dbNs.collection('concursoRegistros').doc(btn.dataset.cdel).delete();
        showToast('✓ Registro eliminado.');
      } catch (err) {
        console.error('Error eliminando concurso:', err);
        showToast('No se pudo eliminar el registro.');
      }
    });
  });
}

/* -------------------------------------------------------------
   SUB-PESTAÑA 2.5: ASIGNAR PUESTOS POR PODIO
   Permite asignar masivamente los puestos 1.°, 2.° y 3.°
   con selector por podio (disciplina + categoría + género),
   dropdowns acotados a los participantes de ese podio,
   prevención de colisiones y matriz de progreso visual.
   ------------------------------------------------------------- */
let asignarPodioState = {
  tipoId: null,
  etapa: '',
  disciplina: '',
  categoria: '',
  genero: '',
  soloPendientes: false,
  filtroBusqueda: '',
  activePodioKey: null
};

function renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const tipos = state.tiposConcurso || [];
  const regs = state.concursoRegistros || [];

  if (tipos.length === 0) {
    host.innerHTML = '<div class="empty"><h4>Sin tipos de concurso</h4><p>Configura o siembra los tipos de concurso primero.</p></div>';
    return;
  }

  // Preseleccionar tipo de concurso (por defecto JEDPA si existe, o el seleccionado)
  if (!asignarPodioState.tipoId) {
    const defaultTipo = tipos.find(t => t.id === 'jedpa' || (t.nombre || '').toLowerCase().includes('jedpa')) || tipos[0];
    asignarPodioState.tipoId = defaultTipo ? defaultTipo.id : tipos[0].id;
  }

  const curTipo = tipos.find(t => t.id === asignarPodioState.tipoId) || tipos[0];

  // Helper de ponderación de puestos
  const puestoWeightLocal = (p) => {
    const s = String(p || '').toLowerCase();
    if (s.includes('1') || s.startsWith('primer')) return 1;
    if (s.includes('2') || s.startsWith('segundo')) return 2;
    if (s.includes('3') || s.startsWith('tercer')) return 3;
    if (s.includes('menci') || s.includes('honrosa') || s.includes('mh')) return 4;
    if (s.includes('4') || s.startsWith('cuarto')) return 5;
    if (s.includes('final')) return 6;
    if (s.includes('clasif')) return 7;
    if (s.includes('partic')) return 8;
    return 9;
  };

  // Filtrar registros del tipo actual
  const tipoRows = regs.filter(r => {
    if (r.tipoConcursoId === curTipo.id) return true;
    if (curTipo && (r.tipoConcursoNombre === curTipo.nombre || r.tipoConcurso === curTipo.nombre)) return true;
    return false;
  });

  // Agrupar registros en podios
  const podiosMap = new Map();
  tipoRows.forEach(r => {
    const etapaVal = (r.etapa || 'UGEL').trim();
    const pKey = getPodioKey(r, curTipo);
    const fullKey = `${etapaVal.toUpperCase()}|${pKey}`;

    if (!podiosMap.has(fullKey)) {
      podiosMap.set(fullKey, {
        fullKey,
        etapa: etapaVal,
        disciplina: r.disciplina || '',
        categoria: r.categoria || '',
        genero: r.genero || '',
        label: getPodioLabel(r, curTipo),
        records: []
      });
    }
    podiosMap.get(fullKey).records.push(r);
  });

  const allPodios = Array.from(podiosMap.values());

  // Analizar puestos y estados en cada podio
  allPodios.forEach(podio => {
    podio.records.sort((a, b) => {
      const wA = puestoWeightLocal(a.puesto);
      const wB = puestoWeightLocal(b.puesto);
      if (wA !== wB) return wA - wB;
      return (a.institucion || '').localeCompare(b.institucion || '');
    });

    podio.puesto1 = podio.records.find(r => normalizePuestoValue(r.puesto) === '1.er puesto') || null;
    podio.puesto2 = podio.records.find(r => normalizePuestoValue(r.puesto) === '2.° puesto') || null;
    podio.puesto3 = podio.records.find(r => normalizePuestoValue(r.puesto) === '3.er puesto') || null;

    podio.assignedCount = (podio.puesto1 ? 1 : 0) + (podio.puesto2 ? 1 : 0) + (podio.puesto3 ? 1 : 0);
    podio.totalRecords = podio.records.length;

    podio.isComplete = podio.assignedCount === 3 || (podio.totalRecords > 0 && podio.assignedCount === podio.totalRecords);
    podio.isPending = podio.assignedCount === 0;
    podio.isPartial = podio.assignedCount > 0 && !podio.isComplete;
  });

  // Métricas globales
  const totalPodios = allPodios.length;
  const completados = allPodios.filter(p => p.isComplete).length;
  const parciales = allPodios.filter(p => p.isPartial).length;
  const pendientes = allPodios.filter(p => p.isPending).length;
  const pctCompletado = totalPodios > 0 ? Math.round((completados / totalPodios) * 100) : 0;

  // Opciones para filtros
  const etapasDisponibles = Array.from(new Set(allPodios.map(p => p.etapa).filter(Boolean))).sort();
  const disciplinasDisponibles = Array.from(new Set(allPodios.map(p => p.disciplina).filter(Boolean))).sort();
  const categoriasDisponibles = Array.from(new Set(allPodios.map(p => p.categoria).filter(Boolean))).sort();

  // Filtrar podios para la matriz / tabla
  let filteredPodios = allPodios.filter(p => {
    if (asignarPodioState.soloPendientes && p.isComplete) return false;
    if (asignarPodioState.etapa && p.etapa.toUpperCase() !== asignarPodioState.etapa.toUpperCase()) return false;
    if (asignarPodioState.disciplina && p.disciplina.toLowerCase() !== asignarPodioState.disciplina.toLowerCase()) return false;
    if (asignarPodioState.categoria && p.categoria.toUpperCase() !== asignarPodioState.categoria.toUpperCase()) return false;
    if (asignarPodioState.genero && normalizeGenero(p.genero) !== normalizeGenero(asignarPodioState.genero)) return false;
    if (asignarPodioState.filtroBusqueda) {
      const q = normalizeText(asignarPodioState.filtroBusqueda);
      const matchLabel = normalizeText(p.label).includes(q);
      const matchIE = p.records.some(r => normalizeText(r.institucion).includes(q));
      if (!matchLabel && !matchIE) return false;
    }
    return true;
  });

  // Ordenar podios: por Disciplina -> Categoría -> Género
  filteredPodios.sort((a, b) => {
    const dComp = (a.disciplina || '').localeCompare(b.disciplina || '');
    if (dComp !== 0) return dComp;
    const cComp = (a.categoria || '').localeCompare(b.categoria || '');
    if (cComp !== 0) return cComp;
    return (a.genero || '').localeCompare(b.genero || '');
  });

  // Podio activo en el editor
  let activePodio = null;
  if (asignarPodioState.activePodioKey) {
    activePodio = allPodios.find(p => p.fullKey === asignarPodioState.activePodioKey);
  }
  if (!activePodio && filteredPodios.length > 0) {
    activePodio = filteredPodios[0];
    asignarPodioState.activePodioKey = activePodio.fullKey;
  } else if (!activePodio && allPodios.length > 0) {
    activePodio = allPodios[0];
    asignarPodioState.activePodioKey = activePodio.fullKey;
  }

  // Si el concurso distingue género, buscar su contraparte Damas/Varones
  let counterpartPodio = null;
  let damasPodio = null;
  let varonesPodio = null;
  if (curTipo.tieneGenero && activePodio) {
    const curNormGen = normalizeGenero(activePodio.genero);
    const targetGen = (curNormGen === 'damas') ? 'varones' : 'damas';
    counterpartPodio = allPodios.find(p =>
      p.etapa.toUpperCase() === activePodio.etapa.toUpperCase() &&
      p.disciplina.toLowerCase() === activePodio.disciplina.toLowerCase() &&
      p.categoria.toUpperCase() === activePodio.categoria.toUpperCase() &&
      normalizeGenero(p.genero) === targetGen
    );

    damasPodio = (curNormGen === 'damas') ? activePodio : counterpartPodio;
    varonesPodio = (curNormGen === 'varones') ? activePodio : counterpartPodio;
  }

  // Construir HTML del Editor del Podio Activo
  let editorHtml = '';
  if (activePodio) {
    // Badges de estado
    let statusBadge = '';
    if (activePodio.isComplete) {
      statusBadge = '<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:12px">✓ Podio Completo (3/3)</span>';
    } else if (activePodio.isPartial) {
      statusBadge = `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:12px">⚠️ Parcial (${activePodio.assignedCount}/3)</span>`;
    } else {
      statusBadge = '<span class="badge" style="background:var(--surface-3);color:var(--ink-soft);font-weight:700;font-size:12px">⚪ Pendiente (0/3)</span>';
    }

    let ctStatusBadge = '';
    if (isJedpaConcurso(curTipo)) {
      const ctInfo = obtenerCuerpoTecnicoGrupo(activePodio.records[0], state.concursoCuerpoTecnico || [], activePodio.records);
      if (!ctInfo || !ctInfo.miembros || ctInfo.miembros.length === 0) {
        ctStatusBadge = '<span class="badge" style="background:#fee2e2;color:#991b1b;font-weight:700;font-size:12px">⚠️ Sin cuerpo técnico asignado</span>';
      } else {
        const ctLabel = ctInfo.origen === 'concursoCuerpoTecnico' ? 'Oficial' : 'Detectado';
        ctStatusBadge = `<span class="badge" style="background:#e0e7ff;color:#3730a3;font-weight:700;font-size:12px">👥 ${ctInfo.miembros.length} del cuerpo técnico (${ctLabel})</span>`;
      }
    }

    // Pestañas rápidas Damas / Varones para alternar con 1 clic
    let genderTabsHtml = '';
    if (curTipo.tieneGenero && (damasPodio || varonesPodio)) {
      genderTabsHtml = `
        <div style="display:flex;gap:8px;margin-bottom:16px;background:var(--surface-2);padding:6px;border-radius:10px;border:1px solid var(--line);width:fit-content">
          ${damasPodio ? `
            <button type="button" class="btn small ${activePodio.fullKey === damasPodio.fullKey ? '' : 'secondary'}" id="btnSwitchDamas" style="display:flex;align-items:center;gap:6px">
              👩 Damas <small style="opacity:0.8">(${damasPodio.assignedCount}/3 ${damasPodio.isComplete ? '✓' : ''})</small>
            </button>
          ` : ''}
          ${varonesPodio ? `
            <button type="button" class="btn small ${activePodio.fullKey === varonesPodio.fullKey ? '' : 'secondary'}" id="btnSwitchVarones" style="display:flex;align-items:center;gap:6px">
              👨 Varones <small style="opacity:0.8">(${varonesPodio.assignedCount}/3 ${varonesPodio.isComplete ? '✓' : ''})</small>
            </button>
          ` : ''}
        </div>
      `;
    }

    // Helper para opciones de un selector de puesto
    const makeSlotOptions = (selectedRegId) => {
      let opts = '<option value="">-- Sin asignar (Vacío) --</option>';
      activePodio.records.forEach(r => {
        const isSel = r.id === selectedRegId;
        const partNom = (r.participantes && r.participantes.length) ? ` — ${formatearNombre(r.participantes[0])}` : '';
        opts += `<option value="${r.id}" ${isSel ? 'selected' : ''}>${esc(r.institucion)}${esc(partNom)}</option>`;
      });
      return opts;
    };

    // Renderizado de detalles del ocupante actual de un puesto
    const renderOccupantSnippet = (reg) => {
      if (!reg) return '<div style="font-size:12px;color:var(--ink-soft);font-style:italic;padding:8px 0">Puesto disponible sin asignar</div>';
      const partStr = (reg.participantes || []).map(p => `${formatearNombre(p)} ${p.dni ? `(${p.dni})` : ''}`).join(', ') || 'Sin participante';
      const asesStr = (reg.asesores || []).map(a => `${formatearNombre(a)}`).join(', ') || 'Sin asesor';
      return `
        <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);line-height:1.4">
          <div><strong>I.E.:</strong> ${esc(reg.institucion)} ${reg.codigoModular ? `<small>(${esc(reg.codigoModular)})</small>` : ''}</div>
          <div><strong>Participante:</strong> ${esc(partStr)}</div>
          <div><strong>Asesor:</strong> ${esc(asesStr)}</div>
        </div>
      `;
    };

    // Filas para otros participantes del podio
    const otherParticipantsRows = activePodio.records.map(r => {
      const partStr = (r.participantes || []).map(p => `${formatearNombre(p)} ${p.dni ? `(${p.dni})` : ''}`).join('<br>') || '—';
      const asesStr = (r.asesores || []).map(a => `${formatearNombre(a)}`).join('<br>') || '—';
      const normP = normalizePuestoValue(r.puesto);
      const isTop3 = ['1.er puesto', '2.° puesto', '3.er puesto'].includes(normP);

      return `
        <tr data-other-row="${r.id}">
          <td>
            <strong>${esc(r.institucion)}</strong>
            ${r.codigoModular ? `<br><small style="color:var(--ink-soft)">Cód. Mod: ${esc(r.codigoModular)}</small>` : ''}
          </td>
          <td style="font-size:12.5px">${partStr}</td>
          <td style="font-size:12.5px">${asesStr}</td>
          <td style="text-align:center">
            ${isTop3 ? formatPuestoBadge(r.puesto) : `
              <select class="otherPuestoSelect" data-rid="${r.id}" style="font-size:12px;padding:4px 8px">
                <option value="" ${!r.puesto ? 'selected' : ''}>Sin puesto / Pendiente</option>
                <option value="Mención Honrosa" ${normP === 'mención honrosa' ? 'selected' : ''}>Mención Honrosa</option>
                <option value="4.° puesto" ${normP === '4.° puesto' ? 'selected' : ''}>4.° puesto</option>
                <option value="Finalista" ${normP === 'finalista' ? 'selected' : ''}>Finalista</option>
                <option value="Participante" ${normP === 'participante' ? 'selected' : ''}>Participante</option>
              </select>
            `}
          </td>
        </tr>
      `;
    }).join('');

    editorHtml = `
      <div class="panel" id="podioEditorCard" style="border:2px solid var(--primary-tint);margin-bottom:24px;box-shadow:var(--shadow-md)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;margin-bottom:12px">
          <div>
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
              <span class="badge" style="background:var(--primary);color:#fff;font-weight:700;font-size:11.5px">Etapa ${esc(activePodio.etapa)}</span>
              <h3 style="margin:0;font-size:19px;color:var(--navy-900)">🏆 Podio: ${esc(activePodio.label)}</h3>
              ${statusBadge}
              ${ctStatusBadge}
            </div>
            <p style="margin:0;font-size:13px;color:var(--ink-soft)">
              ${activePodio.records.length} instituciones inscritas en este podio oficial. Selecciona los puestos de honor o asigna menciones honrosas.
            </p>
          </div>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn secondary small" id="btnDespejarPodio">Limpiar podio</button>
            <button type="button" class="btn small" id="btnIrConsolidado">Ver en consolidado ➔</button>
          </div>
        </div>

        ${genderTabsHtml}

        <!-- Podio 3 Columnas: 1.°, 2.°, 3.er Puesto -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin:20px 0">
          <!-- 1.er PUESTO -->
          <div style="background:rgba(234,179,8,0.06);border:2px solid #eab308;border-radius:12px;padding:16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-weight:800;font-size:14px;color:#854d0e;display:flex;align-items:center;gap:6px">
                🥇 1.er Puesto (Oro)
              </span>
              <span class="badge" style="background:#fef08a;color:#854d0e;font-size:10.5px;font-weight:700">Campeón</span>
            </div>
            <label for="slot_puesto_1" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Institución ganadora</label>
            <select id="slot_puesto_1" class="podioSlotSelect" data-slot="1.er puesto" style="width:100%;font-weight:600">
              ${makeSlotOptions(activePodio.puesto1 ? activePodio.puesto1.id : '')}
            </select>
            <div id="snippet_puesto_1">
              ${renderOccupantSnippet(activePodio.puesto1)}
            </div>
          </div>

          <!-- 2.° PUESTO -->
          <div style="background:rgba(148,163,184,0.08);border:2px solid #94a3b8;border-radius:12px;padding:16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-weight:800;font-size:14px;color:#334155;display:flex;align-items:center;gap:6px">
                🥈 2.° Puesto (Plata)
              </span>
              <span class="badge" style="background:#e2e8f0;color:#334155;font-size:10.5px;font-weight:700">Subcampeón</span>
            </div>
            <label for="slot_puesto_2" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Institución subcampeona</label>
            <select id="slot_puesto_2" class="podioSlotSelect" data-slot="2.° puesto" style="width:100%;font-weight:600">
              ${makeSlotOptions(activePodio.puesto2 ? activePodio.puesto2.id : '')}
            </select>
            <div id="snippet_puesto_2">
              ${renderOccupantSnippet(activePodio.puesto2)}
            </div>
          </div>

          <!-- 3.er PUESTO -->
          <div style="background:rgba(217,119,6,0.06);border:2px solid #d97706;border-radius:12px;padding:16px;box-shadow:var(--shadow-sm)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
              <span style="font-weight:800;font-size:14px;color:#9a3412;display:flex;align-items:center;gap:6px">
                🥉 3.er Puesto (Bronce)
              </span>
              <span class="badge" style="background:#ffedd5;color:#9a3412;font-size:10.5px;font-weight:700">Tercer Lugar</span>
            </div>
            <label for="slot_puesto_3" style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Institución tercer puesto</label>
            <select id="slot_puesto_3" class="podioSlotSelect" data-slot="3.er puesto" style="width:100%;font-weight:600">
              ${makeSlotOptions(activePodio.puesto3 ? activePodio.puesto3.id : '')}
            </select>
            <div id="snippet_puesto_3">
              ${renderOccupantSnippet(activePodio.puesto3)}
            </div>
          </div>
        </div>

        <div id="podioValidationAlert" style="display:none;margin-bottom:16px" class="alertCard warn">
          <p style="margin:0;font-size:13px" id="podioValidationText"></p>
        </div>

        <!-- Tabla de todos los participantes del podio -->
        <div style="margin-top:20px">
          <h4 style="margin:0 0 10px;font-size:14.5px;color:var(--navy-900)">Lista completa de participantes en este podio</h4>
          <div class="tblWrap" style="max-height:280px;overflow-y:auto">
            <table>
              <thead>
                <tr>
                  <th>Institución Educativa</th>
                  <th>Participantes</th>
                  <th>Docente Asesor</th>
                  <th style="width:160px;text-align:center">Puesto / Distinción</th>
                </tr>
              </thead>
              <tbody>
                ${otherParticipantsRows}
              </tbody>
            </table>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--line)">
          <span style="font-size:12.5px;color:var(--ink-soft)">Los cambios se guardan atómicamente asegurando la integridad del podio.</span>
          <button type="button" class="btn" id="btnGuardarPodio" style="padding:10px 24px;font-size:14px;font-weight:700">
            💾 Guardar puestos del podio
          </button>
        </div>
      </div>
    `;
  } else {
    editorHtml = `
      <div class="panel" style="text-align:center;padding:36px;margin-bottom:24px">
        <h4>Selecciona un podio para gestionar sus puestos</h4>
        <p style="color:var(--ink-soft);font-size:13px">Usa los filtros de abajo o la matriz para elegir la disciplina y categoría.</p>
      </div>
    `;
  }

  // Filas de la tabla de podios (Matriz de Progreso)
  const podiosRowsHtml = filteredPodios.map((p, idx) => {
    const isCur = activePodio && activePodio.fullKey === p.fullKey;
    const normGen = normalizeGenero(p.genero);
    const genBadge = normGen === 'damas'
      ? '<span class="badge" style="background:#fce7f3;color:#be185d;font-size:11px">👩 Damas</span>'
      : (normGen === 'varones'
        ? '<span class="badge" style="background:#e0f2fe;color:#0369a1;font-size:11px">👨 Varones</span>'
        : (p.genero ? `<span class="badge" style="background:var(--surface-3);font-size:11px">${esc(p.genero)}</span>` : '—'));

    let progBadge = '';
    if (p.isComplete) {
      progBadge = '<span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:11px">3/3 ✓ Completo</span>';
    } else if (p.isPartial) {
      progBadge = `<span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:11px">${p.assignedCount}/3 ⚠️ Parcial</span>`;
    } else {
      progBadge = '<span class="badge" style="background:var(--surface-3);color:var(--ink-soft);font-size:11px">0/3 Pendiente</span>';
    }

    return `
      <tr class="clickable ${isCur ? 'selectedRow' : ''}" data-podio-key="${esc(p.fullKey)}" style="${isCur ? 'background:rgba(14,165,233,0.08)' : ''}">
        <td><strong>${esc(p.disciplina || '—')}</strong></td>
        <td><span class="badge" style="background:var(--surface-2);font-weight:600">${esc(p.categoria || '—')}</span></td>
        <td>${genBadge}</td>
        <td><span class="badge" style="background:var(--surface-2);font-size:11px">${esc(p.etapa || '—')}</span></td>
        <td>${progBadge}</td>
        <td style="font-size:12px">${p.puesto1 ? `🥇 ${esc(p.puesto1.institucion)}` : '<span style="color:var(--ink-soft)">—</span>'}</td>
        <td style="font-size:12px">${p.puesto2 ? `🥈 ${esc(p.puesto2.institucion)}` : '<span style="color:var(--ink-soft)">—</span>'}</td>
        <td style="font-size:12px">${p.puesto3 ? `🥉 ${esc(p.puesto3.institucion)}` : '<span style="color:var(--ink-soft)">—</span>'}</td>
        <td style="text-align:center">
          <button type="button" class="btn small ${isCur ? '' : 'secondary'}" data-btn-podio="${esc(p.fullKey)}" style="font-size:11px;padding:3px 8px">
            ${isCur ? 'Editando' : '✏️ Asignar'}
          </button>
        </td>
      </tr>
    `;
  }).join('');

  // Renderizado completo de la vista
  host.innerHTML = `
    <!-- Barra superior: Selector de Tipo de Concurso y Métricas de Progreso -->
    <div style="margin-bottom:20px">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:12px">
          <label for="ap_tipoSelect" style="font-weight:700;font-size:14px;color:var(--navy-900)">Concurso:</label>
          <select id="ap_tipoSelect" style="font-weight:600;font-size:13.5px;padding:6px 12px;border-radius:8px">
            ${tipos.map(t => `<option value="${t.id}" ${t.id === curTipo.id ? 'selected' : ''}>${esc(t.nombre)}</option>`).join('')}
          </select>
        </div>
        <div style="font-size:13px;color:var(--ink-soft)">
          UGEL 03 — Concursos Educativos 2026
        </div>
      </div>

      <!-- Tarjetas de Métricas del Concurso -->
      <div class="cards" style="margin-bottom:20px">
        <div class="card">
          <div class="num">${totalPodios}</div>
          <div class="lbl">Total de podios</div>
        </div>
        <div class="card" style="border-left:4px solid #15803d">
          <div class="num" style="color:#15803d">${completados}</div>
          <div class="lbl">Completos (3/3)</div>
        </div>
        <div class="card" style="border-left:4px solid #b45309">
          <div class="num" style="color:#b45309">${parciales}</div>
          <div class="lbl">Parciales</div>
        </div>
        <div class="card" style="border-left:4px solid #64748b">
          <div class="num" style="color:#64748b">${pendientes}</div>
          <div class="lbl">Pendientes (0/3)</div>
        </div>
        <div class="card" style="border-left:4px solid var(--primary)">
          <div class="num" style="color:var(--primary)">${pctCompletado}%</div>
          <div class="lbl">Avance global</div>
        </div>
      </div>
    </div>

    <!-- Panel de Editor del Podio Seleccionado -->
    ${editorHtml}

    <!-- Matriz de Progreso de Podios -->
    <div class="panel">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">
        <div>
          <h3 style="margin:0 0 2px">Matriz de Progreso por Podio</h3>
          <p class="helpText" style="margin:0">Monitorea el estado de cada disciplina y categoría. Haz clic en una fila para asignarle puestos.</p>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;font-weight:600">
            <input type="checkbox" id="ap_soloPendientes" ${asignarPodioState.soloPendientes ? 'checked' : ''}> Solo pendientes / parciales
          </label>
        </div>
      </div>

      <!-- Filtros rápidos para la matriz -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:16px;background:var(--surface-2);padding:12px;border-radius:10px;border:1px solid var(--line)">
        <div>
          <label for="ap_filtro_etapa" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Etapa</label>
          <select id="ap_filtro_etapa" style="font-size:12px;padding:4px 8px;width:100%">
            <option value="">Todas (${etapasDisponibles.length})</option>
            ${etapasDisponibles.map(e => `<option value="${esc(e)}" ${e === asignarPodioState.etapa ? 'selected' : ''}>${esc(e)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label for="ap_filtro_disciplina" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Disciplina</label>
          <select id="ap_filtro_disciplina" style="font-size:12px;padding:4px 8px;width:100%">
            <option value="">Todas (${disciplinasDisponibles.length})</option>
            ${disciplinasDisponibles.map(d => `<option value="${esc(d)}" ${d === asignarPodioState.disciplina ? 'selected' : ''}>${esc(d)}</option>`).join('')}
          </select>
        </div>

        <div>
          <label for="ap_filtro_categoria" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Categoría</label>
          <select id="ap_filtro_categoria" style="font-size:12px;padding:4px 8px;width:100%">
            <option value="">Todas (${categoriasDisponibles.length})</option>
            ${categoriasDisponibles.map(c => `<option value="${esc(c)}" ${c === asignarPodioState.categoria ? 'selected' : ''}>${esc(c)}</option>`).join('')}
          </select>
        </div>

        ${curTipo.tieneGenero ? `
          <div>
            <label for="ap_filtro_genero" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Género</label>
            <select id="ap_filtro_genero" style="font-size:12px;padding:4px 8px;width:100%">
              <option value="">Todos</option>
              <option value="Damas" ${asignarPodioState.genero.toLowerCase() === 'damas' ? 'selected' : ''}>Damas</option>
              <option value="Varones" ${asignarPodioState.genero.toLowerCase() === 'varones' ? 'selected' : ''}>Varones</option>
            </select>
          </div>
        ` : ''}

        <div style="grid-column: span 2">
          <label for="ap_filtro_query" style="font-size:11.5px;font-weight:700;display:block;margin-bottom:3px">Buscar I.E. o podio</label>
          <input type="search" id="ap_filtro_query" value="${esc(asignarPodioState.filtroBusqueda)}" placeholder="Ej: Jacaranda, Saco Oliveros, Ajedrez..." style="font-size:12px;padding:4px 8px;width:100%">
        </div>
      </div>

      <!-- Tabla de Podios -->
      <div class="tblWrap">
        <table>
          <thead>
            <tr>
              <th>Disciplina</th>
              <th>Categoría</th>
              <th>Género</th>
              <th>Etapa</th>
              <th>Estado</th>
              <th>1.er puesto</th>
              <th>2.° puesto</th>
              <th>3.er puesto</th>
              <th style="width:100px;text-align:center">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${podiosRowsHtml || '<tr><td colspan="9" style="text-align:center;color:var(--ink-soft);padding:24px">No hay podios que coincidan con los filtros aplicados.</td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;

  // EVENT LISTENERS

  // Cambio de tipo de concurso
  const tipoSelect = document.getElementById('ap_tipoSelect');
  if (tipoSelect) {
    tipoSelect.addEventListener('change', (e) => {
      asignarPodioState.tipoId = e.target.value;
      asignarPodioState.activePodioKey = null;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  // Switch rápido Damas / Varones
  const btnDamas = document.getElementById('btnSwitchDamas');
  if (btnDamas && damasPodio) {
    btnDamas.addEventListener('click', () => {
      asignarPodioState.activePodioKey = damasPodio.fullKey;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }
  const btnVarones = document.getElementById('btnSwitchVarones');
  if (btnVarones && varonesPodio) {
    btnVarones.addEventListener('click', () => {
      asignarPodioState.activePodioKey = varonesPodio.fullKey;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  // Despejar podio en editor
  const btnDespejar = document.getElementById('btnDespejarPodio');
  if (btnDespejar) {
    btnDespejar.addEventListener('click', () => {
      ['slot_puesto_1', 'slot_puesto_2', 'slot_puesto_3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      ['snippet_puesto_1', 'snippet_puesto_2', 'snippet_puesto_3'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div style="font-size:12px;color:var(--ink-soft);font-style:italic;padding:8px 0">Puesto disponible sin asignar</div>';
      });
      host.querySelectorAll('.otherPuestoSelect').forEach(s => s.value = '');
      validateSlotSelections();
    });
  }

  // Ir a Consolidado
  const btnIrCons = document.getElementById('btnIrConsolidado');
  if (btnIrCons && activePodio) {
    btnIrCons.addEventListener('click', () => {
      concursoFilters.tipoId = curTipo.id;
      concursoFilters.etapa = activePodio.etapa;
      concursoFilters.disciplina = activePodio.disciplina;
      concursoFilters.categoria = activePodio.categoria;
      concursoFilters.genero = activePodio.genero;
      concursoSubTab = 'consolidado';
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    });
  }

  // Actualización dinámica de snippets al cambiar puestos
  const updateSnippetForSlot = (slotNum, regId) => {
    const snipEl = document.getElementById(`snippet_puesto_${slotNum}`);
    if (!snipEl || !activePodio) return;
    const reg = activePodio.records.find(r => r.id === regId);
    if (!reg) {
      snipEl.innerHTML = '<div style="font-size:12px;color:var(--ink-soft);font-style:italic;padding:8px 0">Puesto disponible sin asignar</div>';
      return;
    }
    const partStr = (reg.participantes || []).map(p => `${formatearNombre(p)} ${p.dni ? `(${p.dni})` : ''}`).join(', ') || 'Sin participante';
    const asesStr = (reg.asesores || []).map(a => `${formatearNombre(a)}`).join(', ') || 'Sin asesor';
    snipEl.innerHTML = `
      <div style="font-size:12px;color:var(--ink-soft);margin-top:8px;padding-top:8px;border-top:1px dashed var(--line);line-height:1.4">
        <div><strong>I.E.:</strong> ${esc(reg.institucion)} ${reg.codigoModular ? `<small>(${esc(reg.codigoModular)})</small>` : ''}</div>
        <div><strong>Participante:</strong> ${esc(partStr)}</div>
        <div><strong>Asesor:</strong> ${esc(asesStr)}</div>
      </div>
    `;
  };

  // Validación de no duplicar I.E. en múltiples slots
  const validateSlotSelections = () => {
    const s1 = document.getElementById('slot_puesto_1')?.value || '';
    const s2 = document.getElementById('slot_puesto_2')?.value || '';
    const s3 = document.getElementById('slot_puesto_3')?.value || '';
    const alertEl = document.getElementById('podioValidationAlert');
    const textEl = document.getElementById('podioValidationText');
    const saveBtn = document.getElementById('btnGuardarPodio');

    let hasConflict = false;
    let conflictIE = '';

    if (s1 && s2 && s1 === s2) {
      hasConflict = true;
      conflictIE = activePodio?.records.find(r => r.id === s1)?.institucion || 'Misma I.E.';
    } else if (s1 && s3 && s1 === s3) {
      hasConflict = true;
      conflictIE = activePodio?.records.find(r => r.id === s1)?.institucion || 'Misma I.E.';
    } else if (s2 && s3 && s2 === s3) {
      hasConflict = true;
      conflictIE = activePodio?.records.find(r => r.id === s2)?.institucion || 'Misma I.E.';
    }

    if (hasConflict) {
      if (alertEl) alertEl.style.display = 'block';
      if (textEl) textEl.innerHTML = `⚠️ Conflicto de podio: La institución <strong>${esc(conflictIE)}</strong> no puede ocupar dos puestos distintos simultáneamente. Corrige la selección para guardar.`;
      if (saveBtn) saveBtn.disabled = true;
      return false;
    } else {
      if (alertEl) alertEl.style.display = 'none';
      if (saveBtn) saveBtn.disabled = false;
      return true;
    }
  };

  [1, 2, 3].forEach(num => {
    const slotEl = document.getElementById(`slot_puesto_${num}`);
    if (slotEl) {
      slotEl.addEventListener('change', (e) => {
        updateSnippetForSlot(num, e.target.value);
        validateSlotSelections();
      });
    }
  });

  // Botón Guardar Podio (Transaccional Atómico)
  const savePodioBtn = document.getElementById('btnGuardarPodio');
  if (savePodioBtn && activePodio) {
    savePodioBtn.addEventListener('click', async () => {
      if (!validateSlotSelections()) return;

      const p1Id = document.getElementById('slot_puesto_1')?.value || '';
      const p2Id = document.getElementById('slot_puesto_2')?.value || '';
      const p3Id = document.getElementById('slot_puesto_3')?.value || '';

      // Determinar puestos meta para cada registro de este podio
      const planUpdates = [];
      activePodio.records.forEach(r => {
        let desiredPuesto = '';
        if (r.id === p1Id) desiredPuesto = '1.er puesto';
        else if (r.id === p2Id) desiredPuesto = '2.° puesto';
        else if (r.id === p3Id) desiredPuesto = '3.er puesto';
        else {
          const otherSel = host.querySelector(`.otherPuestoSelect[data-rid="${r.id}"]`);
          desiredPuesto = otherSel ? otherSel.value.trim() : '';
        }

        const curNorm = normalizePuestoValue(r.puesto);
        const desNorm = normalizePuestoValue(desiredPuesto);

        if (curNorm !== desNorm || (r.puesto || '') !== desiredPuesto) {
          planUpdates.push({
            record: r,
            oldPuesto: r.puesto || '',
            newPuesto: desiredPuesto
          });
        }
      });

      if (planUpdates.length === 0) {
        showToast('No se han modificado puestos en este podio.');
        return;
      }

      savePodioBtn.disabled = true;
      savePodioBtn.textContent = 'Guardando podio...';

      try {
        const podioKey = getPodioKey(activePodio.records[0] || { categoria: activePodio.categoria, disciplina: activePodio.disciplina, genero: activePodio.genero }, curTipo);

        // Si existe runTransaction en dbNs, usarlo para atomicidad completa
        if (typeof dbNs.runTransaction === 'function') {
          await dbNs.runTransaction(async (tx) => {
            for (const item of planUpdates) {
              const { record, oldPuesto, newPuesto } = item;
              const oldNorm = normalizePuestoValue(oldPuesto);
              const newNorm = normalizePuestoValue(newPuesto);

              // 1. Liberar lock previo si era puesto 1, 2 o 3
              if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(oldNorm)) {
                const oldLockId = getPodioLockDocId(podioKey, oldNorm);
                tx.delete(dbNs.collection('concursoPodioLocks').doc(oldLockId));
              }

              // 2. Establecer nuevo lock si es puesto 1, 2 o 3
              if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(newNorm)) {
                const newLockId = getPodioLockDocId(podioKey, newNorm);
                tx.set(dbNs.collection('concursoPodioLocks').doc(newLockId), {
                  idRegistro: record.id,
                  institucion: record.institucion || '',
                  puesto: newNorm,
                  podioKey: podioKey,
                  tipoConcursoId: curTipo.id,
                  etapa: activePodio.etapa || 'UGEL',
                  updatedAt: Date.now(),
                  updatedBy: currentUser?.email || 'admin'
                });
              }

              // 3. Actualizar el registro principal
              tx.update(dbNs.collection('concursoRegistros').doc(record.id), {
                puesto: newPuesto,
                updatedAt: Date.now()
              });
            }

            // 4. Bitácora de auditoría
            const histId = genId();
            tx.set(dbNs.collection('concursoHistorial').doc(histId), {
              tipo: 'asignacion_masiva_podio',
              podioKey: activePodio.fullKey,
              podioLabel: activePodio.label,
              tipoConcursoId: curTipo.id,
              actualizaciones: planUpdates.map(u => ({ id: u.record.id, ie: u.record.institucion, de: u.oldPuesto, a: u.newPuesto })),
              usuario: currentUser?.email || 'admin',
              fecha: Date.now()
            });
          });
        } else {
          // Fallback con batch
          const batch = dbNs.batch();
          for (const item of planUpdates) {
            const { record, oldPuesto, newPuesto } = item;
            const oldNorm = normalizePuestoValue(oldPuesto);
            const newNorm = normalizePuestoValue(newPuesto);

            if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(oldNorm)) {
              const oldLockId = getPodioLockDocId(podioKey, oldNorm);
              batch.delete(dbNs.collection('concursoPodioLocks').doc(oldLockId));
            }
            if (['1.er puesto', '2.° puesto', '3.er puesto'].includes(newNorm)) {
              const newLockId = getPodioLockDocId(podioKey, newNorm);
              batch.set(dbNs.collection('concursoPodioLocks').doc(newLockId), {
                idRegistro: record.id,
                institucion: record.institucion || '',
                puesto: newNorm,
                podioKey: podioKey,
                tipoConcursoId: curTipo.id,
                etapa: activePodio.etapa || 'UGEL',
                updatedAt: Date.now(),
                updatedBy: currentUser?.email || 'admin'
              });
            }
            batch.update(dbNs.collection('concursoRegistros').doc(record.id), {
              puesto: newPuesto,
              updatedAt: Date.now()
            });
          }
          await batch.commit();
        }

        // Actualizar datos en memoria local
        planUpdates.forEach(item => {
          item.record.puesto = item.newPuesto;
          item.record.updatedAt = Date.now();
        });

        showToast(`✓ Podio guardado exitosamente (${planUpdates.length} puestos actualizados).`);
        renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);

      } catch (err) {
        console.error('Error guardando podio:', err);
        showToast(`Error al guardar podio: ${err.message || 'Error desconocido'}`);
        savePodioBtn.disabled = false;
        savePodioBtn.textContent = '💾 Guardar puestos del podio';
      }
    });
  }

  // Filtros de la matriz
  const chkPendientes = document.getElementById('ap_soloPendientes');
  if (chkPendientes) {
    chkPendientes.addEventListener('change', (e) => {
      asignarPodioState.soloPendientes = e.target.checked;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroEtapa = document.getElementById('ap_filtro_etapa');
  if (selFiltroEtapa) {
    selFiltroEtapa.addEventListener('change', (e) => {
      asignarPodioState.etapa = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroDisc = document.getElementById('ap_filtro_disciplina');
  if (selFiltroDisc) {
    selFiltroDisc.addEventListener('change', (e) => {
      asignarPodioState.disciplina = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroCat = document.getElementById('ap_filtro_categoria');
  if (selFiltroCat) {
    selFiltroCat.addEventListener('change', (e) => {
      asignarPodioState.categoria = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const selFiltroGen = document.getElementById('ap_filtro_genero');
  if (selFiltroGen) {
    selFiltroGen.addEventListener('change', (e) => {
      asignarPodioState.genero = e.target.value;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
    });
  }

  const inputFiltroQuery = document.getElementById('ap_filtro_query');
  if (inputFiltroQuery) {
    let qDebounce;
    inputFiltroQuery.addEventListener('input', (e) => {
      clearTimeout(qDebounce);
      qDebounce = setTimeout(() => {
        asignarPodioState.filtroBusqueda = e.target.value;
        renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      }, 300);
    });
  }

  // Clic en fila o botón para seleccionar podio y editarlo
  host.querySelectorAll('[data-podio-key], [data-btn-podio]').forEach(el => {
    el.addEventListener('click', (e) => {
      const key = el.dataset.podioKey || el.dataset.btnPodio;
      if (!key) return;
      asignarPodioState.activePodioKey = key;
      renderAsignarPodiosView(host, state, dbNs, isAdmin, currentUser, container, navigate);
      const editorEl = document.getElementById('podioEditorCard');
      if (editorEl) {
        editorEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* -------------------------------------------------------------
   SUB-PESTAÑA 3: TIPOS DE CONCURSO (ADMIN ONLY)
   ------------------------------------------------------------- */
function renderConcursoTiposCatalogView(host, state, dbNs, isAdmin, currentUser, container, navigate) {
  const tipos = state.tiposConcurso || [];

  const cardsHtml = tipos.map(t => {
    const cats = (t.categorias || []).map(c => '<span class="badge" style="background:var(--surface-3);font-size:10.5px;margin:2px">' + esc(c) + '</span>').join('');
    const partRoles = getConcursoParticipanteRoles(t).join(', ');
    const asesRoles = getConcursoAsesorRoles(t).join(', ');
    const formatoBadge = getFormatoPdfConcurso(t) === 'fichas_por_categoria'
      ? '<span class="badge" style="background:rgba(18,41,76,0.12);color:#12294C;font-size:11px">PDF: 📄 Fichas por categoría / equipo</span>'
      : '<span class="badge" style="background:rgba(15,23,42,0.08);color:var(--navy-900);font-size:11px">PDF: 📊 Listado tabular</span>';

    return '<div class="tipoCard">' +
      '<div class="ti">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">' +
      '<h4 style="margin:0">' + esc(t.nombre) + '</h4>' +
      '<span class="badge" style="background:var(--primary-tint);color:var(--primary);font-size:11px">' + (t.tipoParticipacion === 'individual' ? '👤 Individual' : '👥 Grupal') + '</span>' +
      formatoBadge +
      (t.tieneGenero ? '<span class="badge" style="background:rgba(14,165,233,0.15);color:#38bdf8;font-size:11px">Damas / Varones</span>' : '') +
      (t.tieneDisciplina ? '<span class="badge" style="background:rgba(168,85,247,0.15);color:#c084fc;font-size:11px">Disciplina: Sí</span>' : '') +
      (t.tieneTituloTrabajo ? '<span class="badge" style="background:rgba(245,158,11,0.15);color:#fbbf24;font-size:11px">Título / Seudónimo: Sí</span>' : '') +
      '</div>' +
      '<div style="font-size:12.5px;color:var(--ink-soft);margin-bottom:6px">Categorías: ' + (cats || '—') + '</div>' +
      '<div style="font-size:12px;color:var(--ink-soft)">Roles participantes: <strong>' + esc(partRoles) + '</strong> | Roles asesor: <strong>' + esc(asesRoles) + '</strong></div>' +
      '</div>' +
      '<div class="acts">' +
      '<button type="button" class="btn secondary small" data-tedit="' + t.id + '">✎ Editar</button>' +
      '<button type="button" class="iconBtn small" data-tdel="' + t.id + '" title="Eliminar tipo">✕</button>' +
      '</div>' +
      '</div>';
  }).join('') || '<div class="empty"><h4>Catálogo vacío</h4><p>No hay tipos de concurso configurados actualmente.</p></div>';

  host.innerHTML = '' +
    '<div class="panel">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px">' +
    '<div>' +
    '<h3 style="margin-bottom:2px">Catálogo de Tipos de Concurso</h3>' +
    '<p class="helpText" style="margin-bottom:0">Define las reglas, categorías, roles y campos dinámicos de cada concurso.</p>' +
    '</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    '<button type="button" class="btn secondary" id="btnSeedConcursos">🌱 Sembrar 6 concursos oficiales (UGEL 03)</button>' +
    '<button type="button" class="btn secondary" id="btnImportGanadoresCatalog">📥 Cargar 83 ganadores oficiales (RD)</button>' +
    '<button type="button" class="btn" id="btnNewTipoConcurso">＋ Nuevo tipo de concurso</button>' +
    '</div>' +
    '</div>' +
    cardsHtml +
    '</div>' +
    '<div id="modalTipoConcursoHost"></div>';

  // Botón Sembrar 6 concursos oficiales
  document.getElementById('btnSeedConcursos').addEventListener('click', async () => {
    if (!confirm('¿Deseas sembrar o restaurar los 6 tipos de concurso oficiales de la UGEL 03 (JMA, ONEM, El Perú Lee, Eureka, JFEN, JEDPA)? Los concursos existentes se actualizarán con los datos oficiales.')) return;
    const btn = document.getElementById('btnSeedConcursos');
    btn.disabled = true;
    btn.textContent = 'Sembrando...';
    await ejecutarSiembraConcursos(dbNs, state);
    renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
  });

  // Botón Cargar 83 ganadores oficiales (RD)
  const btnImpCat = document.getElementById('btnImportGanadoresCatalog');
  if (btnImpCat) {
    btnImpCat.addEventListener('click', () => {
      ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate);
    });
  }

  // Botón Nuevo Tipo de Concurso
  document.getElementById('btnNewTipoConcurso').addEventListener('click', () => {
    openTipoConcursoModal(null, dbNs, state, container, isAdmin, currentUser, navigate);
  });

  // Editar tipo de concurso
  host.querySelectorAll('[data-tedit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = state.tiposConcurso.find(x => x.id === btn.dataset.tedit);
      if (t) openTipoConcursoModal(t, dbNs, state, container, isAdmin, currentUser, navigate);
    });
  });

  // Eliminar tipo de concurso
  host.querySelectorAll('[data-tdel]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const t = state.tiposConcurso.find(x => x.id === btn.dataset.tdel);
      if (!t) return;
      if (!confirm('¿Eliminar el tipo de concurso "' + t.nombre + '"? Esta acción no se puede deshacer.')) return;
      try {
        await dbNs.collection('tiposConcurso').doc(t.id).delete();
        showToast('✓ Tipo de concurso eliminado.');
      } catch (err) {
        console.error('Error eliminando tipo de concurso:', err);
        showToast('No se pudo eliminar el tipo de concurso.');
      }
    });
  });
}

// Modal para Crear / Editar Tipo de Concurso
function openTipoConcursoModal(existingTipo, dbNs, state, container, isAdmin, currentUser, navigate) {
  const host = document.getElementById('modalTipoConcursoHost');
  if (!host) return;

  const isEdit = !!existingTipo;
  const modalTitle = isEdit ? 'Editar Tipo de Concurso' : 'Nuevo Tipo de Concurso';

  let categorias = isEdit ? [...(existingTipo.categorias || [])] : ['A', 'B', 'C'];
  let rolesPart = isEdit ? getConcursoParticipanteRoles(existingTipo) : ['Estudiante'];
  let rolesAses = isEdit ? getConcursoAsesorRoles(existingTipo) : ['Docente Asesor'];

  host.innerHTML = '' +
    '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:150;display:flex;align-items:center;justify-content:center;padding:20px">' +
    '<div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:620px;width:100%;max-height:90vh;overflow-y:auto;padding:26px;box-shadow:var(--shadow-lg)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">' +
    '<h3 style="margin:0">' + modalTitle + '</h3>' +
    '<button type="button" class="iconBtn" id="m_tc_close">✕</button>' +
    '</div>' +
    '<form id="m_tc_form">' +
    '<div class="field">' +
    '<label>Nombre del concurso *</label>' +
    '<input type="text" id="m_tc_nombre" value="' + esc(existingTipo ? existingTipo.nombre : '') + '" placeholder="Ej: Juegos Florales Escolares Nacionales" required>' +
    '</div>' +
    '<div class="field">' +
    '<label>Tipo de participación *</label>' +
    '<select id="m_tc_tipoPart">' +
    '<option value="individual"' + (existingTipo && existingTipo.tipoParticipacion === 'individual' ? ' selected' : '') + '>Individual (1 participante por registro)</option>' +
    '<option value="grupal"' + (existingTipo && existingTipo.tipoParticipacion === 'grupal' ? ' selected' : '') + '>Grupal (Múltiples participantes por registro)</option>' +
    '</select>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin:16px 0;background:var(--surface-2);padding:14px;border-radius:var(--radius);border:1px solid var(--line)">' +
    '<label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_tieneGenero"' + (existingTipo && existingTipo.tieneGenero ? ' checked' : '') + '> Tiene Género (Damas / Varones)' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_tieneDisciplina"' + (existingTipo && existingTipo.tieneDisciplina ? ' checked' : '') + '> Tiene Disciplina / Área' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:8px;margin:0;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_tieneTituloTrabajo"' + (existingTipo && existingTipo.tieneTituloTrabajo ? ' checked' : '') + '> Tiene Título de Trabajo' +
    '</label>' +
    '</div>' +

    '<div style="margin:14px 0;background:var(--surface-2);padding:14px;border-radius:var(--radius);border:1px solid var(--line)">' +
    '<label style="font-weight:700;margin-bottom:8px;display:block">Campos que definen un Podio único (1.°, 2.° y 3.er puesto)</label>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px">' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_cat"' + ((!existingTipo || (existingTipo.camposPodio || ['categoria']).includes('categoria')) ? ' checked' : '') + '> Categoría' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_disc"' + ((existingTipo ? (existingTipo.camposPodio || []).includes('disciplina') : existingTipo?.tieneDisciplina) ? ' checked' : '') + '> Disciplina' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_gen"' + ((existingTipo ? (existingTipo.camposPodio || []).includes('genero') : existingTipo?.tieneGenero) ? ' checked' : '') + '> Género' +
    '</label>' +
    '<label style="display:flex;align-items:center;gap:6px;font-size:12.5px;cursor:pointer">' +
    '<input type="checkbox" id="m_tc_podio_mod"' + ((existingTipo && (existingTipo.camposPodio || []).includes('modalidad')) ? ' checked' : '') + '> Modalidad' +
    '</label>' +
    '</div>' +
    '<small style="color:var(--ink-soft);display:block;margin-top:6px">Ej: En JEDPA se marcan Categoría, Disciplina y Género para que Damas y Varones tengan podios independientes.</small>' +
    '</div>' +

    '<div class="field">' +
    '<label>Categorías (separadas por comas) *</label>' +
    '<input type="text" id="m_tc_categorias" value="' + esc(categorias.join(', ')) + '" placeholder="Ej: A, B, C, D o Alfa - Nivel 1, Beta - Nivel 1" required>' +
    '<small style="color:var(--ink-soft)">Escribe las categorías separadas por coma.</small>' +
    '</div>' +

    '<div class="field">' +
    '<label>Roles de participante (separados por comas) *</label>' +
    '<input type="text" id="m_tc_rolesPart" value="' + esc(rolesPart.join(', ')) + '" placeholder="Ej: Estudiante, Deportista" required>' +
    '</div>' +

    '<div class="field">' +
    '<label>Roles de asesor / delegados (separados por comas) *</label>' +
    '<input type="text" id="m_tc_rolesAses" value="' + esc(rolesAses.join(', ')) + '" placeholder="Ej: Docente Asesor, Entrenador, Delegado" required>' +
    '</div>' +

    '<div class="field">' +
    '<label>Disciplinas sugeridas (opcional, separadas por comas)</label>' +
    '<input type="text" id="m_tc_discSugeridas" value="' + esc((existingTipo && existingTipo.disciplinasSugeridas ? existingTipo.disciplinasSugeridas : []).join(', ')) + '" placeholder="Ej: Ajedrez, Atletismo, Natación o Danza, Teatro">' +
    '</div>' +

    '<div class="field">' +
    '<label>Formato oficial de actas PDF *</label>' +
    '<select id="m_tc_formatoPdf">' +
    '<option value="tabular"' + ((!existingTipo || existingTipo.formato_pdf_actas === 'tabular' || !existingTipo.formato_pdf_actas) ? ' selected' : '') + '>Listado tabular (Estándar oficial)</option>' +
    '<option value="fichas_por_categoria"' + (existingTipo && existingTipo.formato_pdf_actas === 'fichas_por_categoria' ? ' selected' : '') + '>Fichas por categoría / equipo (Formato ficha)</option>' +
    '</select>' +
    '<small style="color:var(--ink-soft)">El formato de fichas agrupa cada institución o trabajo ganador en un bloque con su lista de participantes. Recomendado para concursos grupales (JFEN, Crea y Emprende, Eureka, etc.).</small>' +
    '</div>' +

    '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px">' +
    '<button type="button" class="btn secondary" id="m_tc_cancel">Cancelar</button>' +
    '<button type="submit" class="btn" id="m_tc_submit">' + (isEdit ? 'Actualizar' : 'Crear tipo') + '</button>' +
    '</div>' +
    '</form>' +
    '</div>' +
    '</div>';

  const closeModal = () => { host.innerHTML = ''; };
  document.getElementById('m_tc_close').addEventListener('click', closeModal);
  document.getElementById('m_tc_cancel').addEventListener('click', closeModal);

  document.getElementById('m_tc_form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('m_tc_submit');
    btn.disabled = true;

    try {
      const cats = document.getElementById('m_tc_categorias').value.split(',').map(s => s.trim()).filter(Boolean);
      const rP = document.getElementById('m_tc_rolesPart').value.split(',').map(s => s.trim()).filter(Boolean);
      const rA = document.getElementById('m_tc_rolesAses').value.split(',').map(s => s.trim()).filter(Boolean);
      const dS = document.getElementById('m_tc_discSugeridas').value.split(',').map(s => s.trim()).filter(Boolean);

      const cPodio = [];
      if (document.getElementById('m_tc_podio_cat')?.checked) cPodio.push('categoria');
      if (document.getElementById('m_tc_podio_disc')?.checked) cPodio.push('disciplina');
      if (document.getElementById('m_tc_podio_gen')?.checked) cPodio.push('genero');
      if (document.getElementById('m_tc_podio_mod')?.checked) cPodio.push('modalidad');
      if (cPodio.length === 0) cPodio.push('categoria');

      const formatoPdf = document.getElementById('m_tc_formatoPdf')?.value || 'tabular';

      const data = {
        nombre: document.getElementById('m_tc_nombre').value.trim(),
        tipoParticipacion: document.getElementById('m_tc_tipoPart').value,
        tieneGenero: document.getElementById('m_tc_tieneGenero').checked,
        tieneDisciplina: document.getElementById('m_tc_tieneDisciplina').checked,
        tieneTituloTrabajo: document.getElementById('m_tc_tieneTituloTrabajo').checked,
        camposPodio: cPodio,
        categorias: cats.length ? cats : ['Única'],
        rolesParticipante: rP.length ? rP : ['Estudiante'],
        rolesAsesor: rA.length ? rA : ['Docente Asesor'],
        disciplinasSugeridas: dS,
        formato_pdf_actas: formatoPdf,
        createdAt: isEdit ? (existingTipo.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
      };

      if (isEdit) {
        await dbNs.collection('tiposConcurso').doc(existingTipo.id).set(data, { merge: true });
        showToast('✓ Tipo de concurso actualizado.');
      } else {
        const newId = genId();
        await dbNs.collection('tiposConcurso').doc(newId).set(data);
        showToast('✓ Tipo de concurso creado.');
      }

      closeModal();
      renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
    } catch (err) {
      console.error('Error guardando tipo de concurso:', err);
      showToast('Error al guardar: [' + (err.code || 'error') + '] ' + err.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}

// Función auxiliar para sembrar los 6 concursos en Firestore desde la UI
async function ejecutarSiembraConcursos(dbNs, state) {
  try {
    for (const c of SEED_CONCURSOS_DEFAULTS) {
      const { id, ...data } = c;
      await dbNs.collection('tiposConcurso').doc(id).set({ ...data, createdAt: Date.now() }, { merge: true });
    }
    showToast('✓ 6 concursos oficiales sembrados exitosamente.');
  } catch (err) {
    console.error('Error sembrando concursos oficiales:', err);
    showToast('Error en siembra: [' + (err.code || 'error') + '] ' + err.message);
  }
}

// Mapeo normalizado de nombres a IDs oficiales de tiposConcurso
export const CONCURSO_TIPO_ID_MAP = {
  'Premio Nacional de Narrativa y Ensayo José María Arguedas': 'jma',
  'Olimpiada Nacional Escolar de Matemática (ONEM)': 'onem',
  'Concurso Nacional de Comprensión Lectora El Perú Lee': 'peru_lee',
  'Feria Escolar Nacional de Ciencia y Tecnología Eureka': 'eureka',
  'Juegos Florales Escolares Nacionales (JFEN)': 'jfen',
  'Juegos Escolares Deportivos y Paradeportivos (JEDPA)': 'jedpa'
};

// Función para importar los 83 ganadores oficiales desde el archivo JSON empaquetado en public/data/
async function ejecutarImportacionGanadores(dbNs, state, container, isAdmin, currentUser, navigate) {
  if (!confirm('¿Deseas importar los 83 registros oficiales de ganadores de concursos escolares (Resoluciones Directorales UGEL 03 - 2026)?\n\nLos registros se cargarán a la base de datos Firestore vinculando colegios y participantes evitando duplicados.')) {
    return;
  }

  try {
    showToast('Leyendo datos oficiales de concursos...');
    const resp = await fetch('./data/concurso-data.json');
    if (!resp.ok) {
      throw new Error('No se pudo cargar el archivo ./data/concurso-data.json (HTTP ' + resp.status + ')');
    }
    const rawData = await resp.json();
    if (!Array.isArray(rawData) || rawData.length === 0) {
      throw new Error('El archivo de datos no contiene registros válidos.');
    }

    // Si aún no se han sembrado los tipos de concurso, sembrarlos primero
    if (!state.tiposConcurso || state.tiposConcurso.length === 0) {
      await ejecutarSiembraConcursos(dbNs, state);
    }

    // Mapa de colegios para autocompletar código modular si falta
    const colMap = new Map();
    (state.colegios || []).forEach(c => {
      const name = c.ie || c.nombre || '';
      if (name) colMap.set(name.trim().toLowerCase(), c.codigoLocal || c.codigoModular || '');
    });

    // Deduplicación contra registros existentes en state.concursoRegistros
    const existingRegs = state.concursoRegistros || [];
    const isDuplicate = (item, tipoId, tipoNombre) => {
      const pDnis = (Array.isArray(item.participantes) ? item.participantes : []).map(p => (p.dni || '').trim()).filter(Boolean);
      return existingRegs.some(r => {
        const sameTipo = (r.tipoConcursoId === tipoId || r.tipoConcursoNombre === tipoNombre);
        const sameInst = normalizeText(r.institucion) === normalizeText(item.institucion);
        const sameCat = normalizeText(r.categoria) === normalizeText(item.categoria);
        const sameDisc = normalizeText(r.disciplina) === normalizeText(item.disciplina);
        const sameGen = normalizeGenero(r.genero) === normalizeGenero(item.genero);
        const samePuesto = normalizePuestoValue(r.puesto) === normalizePuestoValue(item.puesto);

        // Si coinciden tipo, institución, categoría, género, puesto y disciplina -> es duplicado
        if (sameTipo && sameInst && sameCat && sameDisc && sameGen && samePuesto) return true;

        // O si comparten algún DNI de participante en el mismo concurso y categoría
        if (sameTipo && sameCat && pDnis.length > 0) {
          const rDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
          if (pDnis.some(d => rDnis.includes(d))) return true;
        }
        return false;
      });
    };

    let skipped = 0;
    const toInsert = [];
    for (const item of rawData) {
      const tipoNombre = item.tipoConcurso || item.tipoConcursoNombre || '';
      const tipoId = CONCURSO_TIPO_ID_MAP[tipoNombre] || (tipoNombre ? tipoNombre.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'otro');
      if (isDuplicate(item, tipoId, tipoNombre)) {
        skipped++;
      } else {
        toInsert.push({ item, tipoId, tipoNombre });
      }
    }

    if (toInsert.length === 0) {
      showToast('Todos los ganadores oficiales ya se encuentran registrados en el sistema (0 duplicados insertados).');
      return;
    }

    let total = 0;
    const batchSize = 100;
    for (let i = 0; i < toInsert.length; i += batchSize) {
      const chunk = toInsert.slice(i, i + batchSize);
      const batch = dbNs.batch();

      for (const entry of chunk) {
        const { item, tipoId, tipoNombre } = entry;
        let codMod = formatCodigoModular(item.codigoModular || '');
        if (!codMod && item.institucion) {
          const match = colMap.get(item.institucion.trim().toLowerCase());
          if (match) codMod = formatCodigoModular(match);
        }

        const docRef = dbNs.collection('concursoRegistros').doc();
        batch.set(docRef, {
          tipoConcursoId: tipoId,
          tipoConcursoNombre: tipoNombre,
          etapa: item.etapa || 'UGEL',
          categoria: item.categoria || '',
          genero: item.genero || null,
          disciplina: item.disciplina || null,
          institucion: item.institucion || '',
          codigoModular: codMod,
          tituloTrabajo: item.tituloTrabajo || null,
          seudonimo: item.seudonimo || null,
          puesto: normalizePuestoValue(item.puesto) || item.puesto || '',
          participantes: Array.isArray(item.participantes) ? item.participantes : [],
          asesores: Array.isArray(item.asesores) ? item.asesores : [],
          resolucionRef: item.resolucionRef || '',
          fecha: item.fecha || '',
          responsable: 'RD UGEL 03 (2026)',
          importadoDesdePdf: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }

      await batch.commit();
      total += chunk.length;
    }

    showToast('✓ ' + total + ' nuevos ganadores importados' + (skipped > 0 ? ' (' + skipped + ' omitidos por ya existir)' : '') + '.');
    concursoSubTab = 'consolidado';
    concursoFilters.tipoId = ''; // Ver todos los concursos
    renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
  } catch (err) {
    console.error('Error importando ganadores oficiales:', err);
    showToast('Error en importación: [' + (err.code || 'error') + '] ' + err.message);
  }
}

// Función para sincronizar / retroalimentar UGEL y RED/REI en fichas que no los tengan
async function backfillSubmissionsUgelRed(dbNs, state) {
  const { getSubmissionResponsable } = await import('../ui.js?v=20261015_v1');
  const colegios = state.colegios || [];
  const submissions = state.submissions || [];
  if (!submissions.length) return 0;

  const colMap = new Map();
  colegios.forEach(c => {
    if (c.ie) colMap.set(normalizeText(c.ie), c);
    if (c.nombre) colMap.set(normalizeText(c.nombre), c);
  });

  const batchSize = 100;
  let updatedCount = 0;
  let currentBatch = dbNs.batch();
  let opsInBatch = 0;

  for (const sub of submissions) {
    let needUpdate = false;
    let newUgel = sub.ugel;
    let newRed = sub.red;
    let newCod = sub.codigoModular;

    let matched = null;
    if (sub.colegioId) {
      matched = colegios.find(c => c.id === sub.colegioId);
    }
    if (!matched && sub.institucion) {
      matched = colMap.get(normalizeText(sub.institucion));
    }

    if (matched) {
      let padronUgel = matched.dependencia || 'UGEL 03';
      if (padronUgel.toLowerCase().includes('sector educ')) padronUgel = 'UGEL 03';

      const padronRed = matched.rei || 'No aplica';
      const padronCod = matched.codigoLocal || matched.codigoModular || '';

      if (newUgel !== padronUgel) { newUgel = padronUgel; needUpdate = true; }
      if (newRed !== padronRed) { newRed = padronRed; needUpdate = true; }
      if (padronCod && newCod !== padronCod) { newCod = padronCod; needUpdate = true; }
    } else {
      if (!newUgel || newUgel === '—' || newUgel.toLowerCase().includes('sector educ')) {
        newUgel = 'UGEL 03';
        needUpdate = true;
      }
      if (!newRed || newRed === '—') {
        newRed = 'No aplica';
        needUpdate = true;
      }
    }

    let newColId = sub.colegioId || (matched ? matched.id : null);
    if (!sub.colegioId && newColId) needUpdate = true;

    let newResp = sub.responsable;
    if (isFichaEspecialistaJec(sub)) {
      if (newResp !== ESPECIALISTA_JEC_OFICIAL.nombresApellidos) {
        newResp = ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
        needUpdate = true;
      }
    } else if (!newResp || newResp === '—' || !newResp.trim() || /^\d+$/.test(newResp.trim())) {
      const guessedResp = getSubmissionResponsable({ ...sub, ugel: newUgel, red: newRed }, state, null);
      if (guessedResp && guessedResp !== '—') {
        newResp = guessedResp;
        needUpdate = true;
      }
    }

    if (needUpdate) {
      sub.ugel = newUgel;
      sub.red = newRed;
      sub.codigoModular = formatCodigoModular(newCod || '');
      if (newColId) sub.colegioId = newColId;
      if (newResp) sub.responsable = newResp;

      const docRef = dbNs.collection('submissions').doc(sub.id);
      const updateData = {
        ugel: newUgel,
        red: newRed,
        codigoModular: formatCodigoModular(newCod || ''),
        updatedAt: Date.now()
      };
      if (newColId) updateData.colegioId = newColId;
      if (newResp) updateData.responsable = newResp;

      currentBatch.update(docRef, updateData);
      opsInBatch++;
      updatedCount++;

      if (opsInBatch >= batchSize) {
        await currentBatch.commit();
        currentBatch = dbNs.batch();
        opsInBatch = 0;
      }
    }
  }

  if (opsInBatch > 0) {
    await currentBatch.commit();
  }

  return updatedCount;
}

// Modal para detectar y limpiar duplicados en concursos escolares
function openDuplicateDetectorModal(dbNs, state, container, isAdmin, currentUser, navigate) {
  const regs = state.concursoRegistros || [];

  // 1. Detectar duplicados exactos
  const exactGroups = [];
  const visitedExact = new Set();

  for (let i = 0; i < regs.length; i++) {
    if (visitedExact.has(regs[i].id)) continue;
    const r1 = regs[i];
    const group = [r1];
    const pDnis1 = (r1.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);

    for (let j = i + 1; j < regs.length; j++) {
      if (visitedExact.has(regs[j].id)) continue;
      const r2 = regs[j];
      const sameTipo = (r1.tipoConcursoId === r2.tipoConcursoId || (r1.tipoConcursoNombre && r1.tipoConcursoNombre === r2.tipoConcursoNombre));
      const sameEtapa = (r1.etapa || '').toUpperCase() === (r2.etapa || '').toUpperCase();
      const sameCat = normalizeText(r1.categoria) === normalizeText(r2.categoria);
      const sameInst = normalizeText(r1.institucion) === normalizeText(r2.institucion);
      const sameDisc = normalizeText(r1.disciplina) === normalizeText(r2.disciplina);
      const sameGen = normalizeGenero(r1.genero) === normalizeGenero(r2.genero);
      const samePuesto = normalizePuestoValue(r1.puesto) === normalizePuestoValue(r2.puesto);

      const pDnis2 = (r2.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean);
      const sharesDni = pDnis1.length > 0 && pDnis2.length > 0 && pDnis1.some(d => pDnis2.includes(d));

      if (sameTipo && sameEtapa && sameCat && sameInst && sameGen && (sharesDni || (sameDisc && samePuesto))) {
        group.push(r2);
        visitedExact.add(r2.id);
      }
    }

    if (group.length > 1) {
      visitedExact.add(r1.id);
      exactGroups.push(group);
    }
  }

  // 2. Detectar conflictos de puesto (respetando los campos de podio como género)
  const puestoConflicts = [];
  const topPuestos = ['1.er puesto', '2.° puesto', '3.er puesto'];
  const pMap = new Map();

  regs.forEach(r => {
    const normP = normalizePuestoValue(r.puesto);
    if (!topPuestos.includes(normP)) return;
    const rTipo = (state.tiposConcurso || []).find(t => t.id === r.tipoConcursoId || t.nombre === r.tipoConcursoNombre);
    const podKey = getPodioKey(r, rTipo);
    const key = [
      r.tipoConcursoId || r.tipoConcursoNombre,
      (r.etapa || '').toUpperCase(),
      podKey,
      normP
    ].join('|');

    if (!pMap.has(key)) pMap.set(key, []);
    pMap.get(key).push(r);
  });

  pMap.forEach((group, key) => {
    if (group.length > 1) {
      puestoConflicts.push({ key, records: group });
    }
  });

  // Modal HTML
  const modalWrap = document.createElement('div');
  modalWrap.id = 'duplicateDetectorModal';
  modalWrap.innerHTML = `
    <div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:20px">
      <div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:850px;width:100%;max-height:90vh;overflow-y:auto;padding:26px;box-shadow:var(--shadow-lg)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
          <h3 style="margin:0;display:flex;align-items:center;gap:8px">🔍 Detector de Duplicados en Concursos</h3>
          <button type="button" class="iconBtn" id="m_dup_close">✕</button>
        </div>

        <div class="cards" style="margin-bottom:18px">
          <div class="card"><div class="num">${exactGroups.length}</div><div class="lbl">Grupos duplicados exactos</div></div>
          <div class="card"><div class="num">${puestoConflicts.length}</div><div class="lbl">Conflictos de puestos (1°, 2°, 3°)</div></div>
        </div>

        ${exactGroups.length === 0 && puestoConflicts.length === 0 ? `
          <div style="text-align:center;padding:30px;color:var(--ink-soft)">
            <p style="font-size:18px;margin-bottom:6px">✓ ¡Excelente!</p>
            <p>No se detectaron registros duplicados ni puestos en conflicto en los concursos registrados.</p>
          </div>
        ` : ''}

        ${exactGroups.length > 0 ? `
          <div class="panel" style="margin-bottom:18px">
            <h4 style="color:var(--danger);margin-top:0">⚠️ Duplicados Exactos Detectados (${exactGroups.length})</h4>
            <p style="font-size:12.5px;color:var(--ink-soft)">Los siguientes registros coinciden en I.E., categoría, participantes y etapa:</p>
            ${exactGroups.map((grp, gIdx) => `
              <div style="border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--surface-2)">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
                  <strong>Grupo ${gIdx + 1}: ${esc(grp[0].institucion)} · ${esc(grp[0].tipoConcursoNombre || grp[0].tipoConcurso)} (${esc(grp[0].categoria)})</strong>
                  ${isAdmin ? `<button class="btn danger small" data-keep-first="${gIdx}">Conservar 1 y eliminar duplicados</button>` : ''}
                </div>
                <div class="tblWrap"><table style="font-size:12px">
                  <thead><tr><th>ID</th><th>Puesto</th><th>Área</th><th>Participantes</th><th>Fecha</th><th></th></tr></thead>
                  <tbody>
                    ${grp.map((r, rIdx) => `
                      <tr>
                        <td><small style="color:var(--ink-soft)">${esc(r.id)}</small></td>
                        <td>${formatPuestoBadge(r.puesto)}</td>
                        <td>${esc(r.disciplina || '—')}</td>
                        <td>${(r.participantes || []).map(p => esc([p.nombres, p.apellidos].filter(Boolean).join(' ')) + (p.dni ? ` (${esc(p.dni)})` : '')).join('<br>') || '—'}</td>
                        <td>${fmtDate(r.fecha)}</td>
                        <td>${isAdmin ? `<button class="actBtn delBtn" data-del-dup="${esc(r.id)}">✕</button>` : ''}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${puestoConflicts.length > 0 ? `
          <div class="panel" style="margin-bottom:18px">
            <h4 style="color:var(--warn);margin-top:0">⚠️ Conflictos de Puesto (Mismo puesto registrado más de una vez)</h4>
            <p style="font-size:12.5px;color:var(--ink-soft)">Existen dos o más instituciones con el mismo puesto en la misma categoría y disciplina:</p>
            ${puestoConflicts.map((conf, cIdx) => `
              <div style="border:1px solid var(--line);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--surface-2)">
                <div style="margin-bottom:8px">
                  <strong>Conflicto ${cIdx + 1}: ${esc(conf.records[0].tipoConcursoNombre || conf.records[0].tipoConcurso)} · Cat: ${esc(conf.records[0].categoria)} ${conf.records[0].disciplina ? '· ' + esc(conf.records[0].disciplina) : ''} · Puesto: ${formatPuestoBadge(conf.records[0].puesto)}</strong>
                </div>
                <div class="tblWrap"><table style="font-size:12px">
                  <thead><tr><th>Institución</th><th>Participantes</th><th>Etapa</th><th>Fecha</th><th></th></tr></thead>
                  <tbody>
                    ${conf.records.map(r => `
                      <tr>
                        <td><strong>${esc(r.institucion)}</strong></td>
                        <td>${(r.participantes || []).map(p => esc([p.nombres, p.apellidos].filter(Boolean).join(' '))).join(', ') || '—'}</td>
                        <td><span class="badge badge-etapa">${esc(r.etapa)}</span></td>
                        <td>${fmtDate(r.fecha)}</td>
                        <td>${isAdmin ? `<button class="actBtn delBtn" data-del-dup="${esc(r.id)}">✕</button>` : ''}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table></div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex;justify-content:flex-end;margin-top:16px">
          <button type="button" class="btn secondary" id="m_dup_cancel">Cerrar</button>
        </div>
      </div>
    </div>
  `;

  lockBodyScroll();
  document.body.appendChild(modalWrap);

  const onKey = (e) => {
    if (e.key === 'Escape') closeModal();
  };
  window.addEventListener('keydown', onKey);

  const closeModal = () => {
    window.removeEventListener('keydown', onKey);
    modalWrap.remove();
    unlockBodyScroll();
  };
  modalWrap.querySelector('#m_dup_close').addEventListener('click', closeModal);
  modalWrap.querySelector('#m_dup_cancel').addEventListener('click', closeModal);

  modalWrap.querySelectorAll('[data-del-dup]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este registro de concurso duplicado?')) return;
      btn.disabled = true;
      try {
        await dbNs.collection('concursoRegistros').doc(btn.dataset.delDup).delete();
        showToast('Registro duplicado eliminado.');
        closeModal();
        renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
      } catch (err) {
        console.error('Error eliminando duplicado', err);
        showToast('No se pudo eliminar el registro.');
        btn.disabled = false;
      }
    });
  });

  modalWrap.querySelectorAll('[data-keep-first]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const gIdx = Number(btn.dataset.keepFirst);
      const grp = exactGroups[gIdx];
      if (!grp || grp.length < 2) return;
      if (!confirm(`¿Deseas conservar el primer registro y eliminar los ${grp.length - 1} registros duplicados de este grupo?`)) return;
      btn.disabled = true;
      btn.textContent = 'Eliminando...';
      try {
        const batch = dbNs.batch();
        for (let k = 1; k < grp.length; k++) {
          batch.delete(dbNs.collection('concursoRegistros').doc(grp[k].id));
        }
        await batch.commit();
        showToast(`✓ Se eliminaron ${grp.length - 1} duplicados correctamente.`);
        closeModal();
        renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
      } catch (err) {
        console.error('Error eliminando lote de duplicados', err);
        showToast('Error al eliminar los duplicados.');
        btn.disabled = false;
      }
    });
  });
}

// =========================================================================
// ASISTENTE DE CONSOLIDACIÓN DE CUERPO TÉCNICO POR GRUPO (JEDPA)
// Permite asociar delegados y entrenadores a nivel de grupo de competencia,
// detectando y resolviendo discrepancias de roles de forma interactiva.
// =========================================================================
export function openConsolidarCuerpoTecnicoModal(dbNs, state, container, isAdmin, currentUser, navigate) {
  const regs = state.concursoRegistros || [];
  const tipos = state.tiposConcurso || [];

  // Filtrar registros JEDPA
  const jedpaRegs = regs.filter(r => {
    const t = tipos.find(tp => tp.id === r.tipoConcursoId || tp.nombre === r.tipoConcursoNombre);
    return isJedpaConcurso(t) || (r.tipoConcursoId || '').toLowerCase().includes('jedpa') || (r.tipoConcursoNombre || '').toLowerCase().includes('jedpa');
  });

  if (jedpaRegs.length === 0) {
    showToast('No se encontraron registros de JEDPA para analizar.');
    return;
  }

  // Agrupar registros por grupo (Etapa · Disciplina · Categoría · Género)
  const groupMap = new Map();
  jedpaRegs.forEach(r => {
    const etapa = (r.etapa || 'UGEL').trim().toUpperCase();
    const disc = (r.disciplina || 'GENERAL').trim().toUpperCase();
    const cat = (r.categoria || 'A').trim().toUpperCase();
    const gen = formatGeneroDisplay(r.genero).trim().toUpperCase();
    const groupKey = `${etapa} · ${disc} · CATEGORÍA ${cat} · ${gen}`;

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, {
        groupKey,
        etapa: (r.etapa || 'UGEL').trim(),
        disciplina: (r.disciplina || '').trim(),
        categoria: (r.categoria || '').trim(),
        genero: (r.genero || '').trim(),
        records: []
      });
    }
    groupMap.get(groupKey).records.push(r);
  });

  const groups = Array.from(groupMap.values());

  // Extraer disciplinas únicas con recuento para el filtro
  const disciplinaCounts = {};
  groups.forEach(g => {
    const d = (g.disciplina || '').trim();
    if (d) {
      disciplinaCounts[d] = (disciplinaCounts[d] || 0) + 1;
    }
  });
  const uniqueDisciplinas = Object.keys(disciplinaCounts).sort((a, b) => a.localeCompare(b));

  // Estados persistentes de filtros dentro de la sesión del modal
  let filterSearchText = '';
  let filterDisciplina = '';
  let filterEstado = 'todos'; // 'todos' | 'pendientes' | 'formalizados'

  const modalWrap = document.createElement('div');
  modalWrap.id = 'consolidarCuerpoTecnicoModal';

  // Almacenar selecciones interactivas de roles para no perderlas ante errores o re-renderizados
  const roleSelections = new Map();

  let escListenerAttached = false;
  const handleEscKey = (e) => {
    if (e.key === 'Escape' || e.keyCode === 27) {
      closeModal();
    }
  };

  const closeModal = () => {
    if (escListenerAttached) {
      window.removeEventListener('keydown', handleEscKey);
      escListenerAttached = false;
    }
    modalWrap.remove();
    renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
  };

  function renderModalBody() {
    const ctCollection = state.concursoCuerpoTecnico || [];

    const groupsHtml = groups.map((g, gIdx) => {
      // Buscar si este grupo ya está en concursoCuerpoTecnico usando ID determinístico y normalización
      const detDocId = generarConcursoCuerpoTecnicoDocId(g.etapa, g.disciplina, g.categoria, formatGeneroDisplay(g.genero));
      const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      const legacyId = `jedpa_${slug(g.etapa)}_${slug(g.disciplina)}_${slug(g.categoria)}_${slug(g.genero)}`;

      const norm = (s) => String(s || '').trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const normCat = (c) => norm(c).replace(/^CATEGORIA_?/, '').replace(/[^A-Z0-9]/g, '');
      const normGen = (val) => {
        const v = norm(val);
        if (v.startsWith('DAM') || v === 'F') return 'DAMAS';
        if (v.startsWith('VAR') || v === 'M') return 'VARONES';
        return v;
      };

      const existingDoc = ctCollection.find(d => {
        if (!d) return false;
        if (d.id === detDocId || d.id === legacyId) return true;
        if (d.id === g.groupKey || d.grupoKey === g.groupKey) return true;
        return norm(d.etapa || 'UGEL') === norm(g.etapa || 'UGEL') &&
          norm(d.disciplina || '') === norm(g.disciplina || '') &&
          normCat(d.categoria || '') === normCat(g.categoria || '') &&
          normGen(d.genero || d.rama || '') === normGen(g.genero || '');
      });

      const existingMembers = existingDoc && (
        (Array.isArray(existingDoc.miembros) && existingDoc.miembros.length > 0)
          ? existingDoc.miembros
          : (Array.isArray(existingDoc.personas) ? existingDoc.personas : [])
      );

      if (existingMembers && existingMembers.length > 0) {
        // Estado: Formalizado en concursoCuerpoTecnico
        const membersSearch = existingMembers.map(m => `${m.apellidos || ''} ${m.nombres || ''} ${m.dni || ''} ${m.rol || ''}`).join(' ');
        const searchBlob = `${g.groupKey} ${g.disciplina} ${g.categoria} ${g.genero} ${membersSearch}`.toLowerCase();

        return `
          <div class="panel m_ct_group_card" data-gidx="${gIdx}" data-disciplina="${esc(g.disciplina)}" data-categoria="${esc(g.categoria)}" data-genero="${esc(g.genero)}" data-estado="formalizado" data-searchtext="${esc(searchBlob)}" style="border:1.5px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:16px;margin-bottom:16px">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px">
              <div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                  <h4 style="margin:0;color:var(--navy-900);font-size:15px">🏅 ${esc(g.groupKey)}</h4>
                  <span class="badge" style="background:#dcfce7;color:#15803d;font-weight:700;font-size:11px">✓ Guardado en concursoCuerpoTecnico</span>
                </div>
                <p style="margin:4px 0 0;font-size:12px;color:var(--ink-soft)">
                  ${g.records.length} competidores registrados en este grupo. El cuerpo técnico está formalizado a nivel institucional.
                </p>
              </div>
              <div style="display:flex;gap:6px">
                <button type="button" class="btn secondary small" data-rollback-ct="${esc(existingDoc.id)}" data-gkey="${esc(g.groupKey)}" style="color:#b91c1c;border-color:#fca5a5" title="Eliminar registro centralizado y revertir al estado individual">
                  🗑️ Deshacer formalización (Rollback)
                </button>
              </div>
            </div>

            <table style="width:100%;font-size:12.5px;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #dcfce7">
              <thead>
                <tr style="background:#f0fdf4;border-bottom:1.5px solid #bbf7d0;color:var(--ink);text-align:left">
                  <th style="padding:6px 10px;width:140px">Rol oficial</th>
                  <th style="padding:6px 10px">Apellidos y Nombres</th>
                  <th style="padding:6px 10px;width:120px">DNI / Documento</th>
                </tr>
              </thead>
              <tbody>
                ${existingMembers.map(m => `
                  <tr style="border-bottom:1px solid #f0fdf4">
                    <td style="padding:6px 10px"><span class="badge" style="font-size:11px;font-weight:700">${esc((m.rol || 'DELEGADO').toUpperCase())}</span></td>
                    <td style="padding:6px 10px"><strong>${esc((m.apellidos || '').toUpperCase())} ${esc((m.nombres || '').toUpperCase())}</strong></td>
                    <td style="padding:6px 10px;color:var(--ink-soft)">${esc(m.dni || '—')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }

      // Estado: Pendiente de formalización (analizar miembros detectados en los registros del grupo)
      const memberMap = new Map();
      g.records.forEach(r => {
        (r.asesores || []).forEach(a => {
          const dni = (a.dni || '').trim();
          const nom = (a.nombres || '').trim().replace(/\s{2,}/g, ' ');
          const ape = (a.apellidos || '').trim().replace(/\s{2,}/g, ' ');
          const key = dni || `${ape}|${nom}`.toUpperCase();
          if (!key) return;

          if (!memberMap.has(key)) {
            memberMap.set(key, {
              key,
              dni,
              nombres: nom,
              apellidos: ape,
              rolesCount: {},
              recordsCount: 0
            });
          }

          const item = memberMap.get(key);
          item.recordsCount++;
          const curRol = (a.rol || 'Delegado').trim();
          item.rolesCount[curRol] = (item.rolesCount[curRol] || 0) + 1;
        });
      });

      const detectedMembers = Array.from(memberMap.values());

      if (detectedMembers.length === 0) {
        const searchBlob = `${g.groupKey} ${g.disciplina} ${g.categoria} ${g.genero}`.toLowerCase();
        return `
          <div class="panel m_ct_group_card" data-gidx="${gIdx}" data-disciplina="${esc(g.disciplina)}" data-categoria="${esc(g.categoria)}" data-genero="${esc(g.genero)}" data-estado="pendiente" data-searchtext="${esc(searchBlob)}" style="border:1px solid var(--line);border-radius:10px;padding:16px;margin-bottom:16px">
            <h4 style="margin:0;color:var(--navy-900);font-size:15px">🏅 ${esc(g.groupKey)}</h4>
            <p style="margin:6px 0 0;font-size:12.5px;color:var(--ink-soft)">
              Este grupo tiene ${g.records.length} registros pero no cuenta con asesores ni cuerpo técnico registrado en sus filas.
            </p>
          </div>
        `;
      }

      const rowsDetectedHtml = detectedMembers.map((m, mIdx) => {
        const rolesArr = Object.entries(m.rolesCount).sort((a, b) => b[1] - a[1]);
        const majorityRole = rolesArr[0] ? rolesArr[0][0] : 'Delegado';
        const hasConflict = rolesArr.length > 1;

        // Recuperar selección previa del usuario si ya modificó este desplegable
        const selKey = `${gIdx}_${mIdx}`;
        const activeRole = roleSelections.has(selKey) ? roleSelections.get(selKey) : majorityRole;

        let conflictNotice = '';
        if (hasConflict) {
          const conflictBreakdown = rolesArr.map(([r, c]) => `${r} (${c} registros)`).join(', ');
          conflictNotice = `
            <div style="font-size:11.5px;color:#b45309;background:#fef3c7;border:1px solid #fde68a;border-radius:6px;padding:4px 8px;margin-top:4px">
              ⚠️ <strong>Discrepancia detectada:</strong> aparece en distintos registros como: <em>${esc(conflictBreakdown)}</em>.<br>
              Se preselecciona el rol mayoritario (<strong>${esc(majorityRole)}</strong>). Puedes cambiarlo si corresponde.
            </div>
          `;
        }

        const roleOptions = ['Delegado', 'Entrenador', 'Docente Asesor'].map(rolOpt => {
          const isSel = (rolOpt.toLowerCase() === activeRole.toLowerCase());
          return `<option value="${esc(rolOpt)}" ${isSel ? 'selected' : ''}>${esc(rolOpt)}</option>`;
        }).join('');

        const fullNameUpper = `${m.apellidos ? m.apellidos.toUpperCase() + ', ' : ''}${m.nombres.toUpperCase()}`.trim();

        return `
          <tr style="border-bottom:1px solid var(--line);background:${hasConflict ? '#fffbeb' : '#fff'}" data-member-idx="${mIdx}">
            <td style="padding:8px 10px;vertical-align:top">
              <select class="m_ct_role" data-gidx="${gIdx}" data-midx="${mIdx}" style="font-weight:700;padding:4px 8px;font-size:12px">
                ${roleOptions}
              </select>
              ${conflictNotice}
            </td>
            <td style="padding:8px 10px;vertical-align:top">
              <strong style="color:var(--navy-900)">${esc(fullNameUpper)}</strong>
              <input type="hidden" class="m_ct_ape" value="${esc(m.apellidos.toUpperCase())}">
              <input type="hidden" class="m_ct_nom" value="${esc(m.nombres.toUpperCase())}">
            </td>
            <td style="padding:8px 10px;vertical-align:top">
              <span style="font-family:monospace;font-size:12px">${esc(m.dni || '—')}</span>
              <input type="hidden" class="m_ct_dni" value="${esc(m.dni)}">
            </td>
            <td style="padding:8px 10px;vertical-align:top;text-align:center;font-size:12px;color:var(--ink-soft)">
              <span class="badge" style="font-size:11px">${m.recordsCount} de ${g.records.length}</span>
            </td>
          </tr>
        `;
      }).join('');

      const membersSearch = detectedMembers.map(m => `${m.apellidos || ''} ${m.nombres || ''} ${m.dni || ''}`).join(' ');
      const searchBlob = `${g.groupKey} ${g.disciplina} ${g.categoria} ${g.genero} ${membersSearch}`.toLowerCase();

      return `
        <div class="panel m_ct_group_card" data-gidx="${gIdx}" data-disciplina="${esc(g.disciplina)}" data-categoria="${esc(g.categoria)}" data-genero="${esc(g.genero)}" data-estado="pendiente" data-searchtext="${esc(searchBlob)}" style="border:1.5px solid var(--primary-tint);border-radius:10px;padding:16px;margin-bottom:16px;background:var(--surface)">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px;margin-bottom:12px">
            <div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <h4 style="margin:0;color:var(--navy-900);font-size:15px">🏅 ${esc(g.groupKey)}</h4>
                <span class="badge" style="background:#fef3c7;color:#b45309;font-weight:700;font-size:11px">⚠️ Pendiente de consolidación</span>
              </div>
              <p style="margin:4px 0 0;font-size:12px;color:var(--ink-soft)">
                Se detectaron ${detectedMembers.length} personas actuando como cuerpo técnico en ${g.records.length} registros. Confirma el rol definitivo para registrarlos a nivel de grupo.
              </p>
            </div>
            <div>
              <button type="button" class="btn small" data-save-ct="${gIdx}" style="font-size:12px">
                💾 Guardar en concursoCuerpoTecnico
              </button>
            </div>
          </div>

          <table style="width:100%;font-size:12.5px;border-collapse:collapse;border:1px solid var(--line);border-radius:8px;overflow:hidden">
            <thead>
              <tr style="background:var(--surface-2);border-bottom:1.5px solid var(--line);color:var(--ink);text-align:left">
                <th style="padding:6px 10px;width:190px">Rol a asignar</th>
                <th style="padding:6px 10px">Apellidos y Nombres (en mayúsculas)</th>
                <th style="padding:6px 10px;width:120px">DNI / Documento</th>
                <th style="padding:6px 10px;width:110px;text-align:center">Apariciones</th>
              </tr>
            </thead>
            <tbody>
              ${rowsDetectedHtml}
            </tbody>
          </table>

          <div style="margin-top:10px;display:flex;align-items:center;gap:8px">
            <label style="font-size:11.5px;color:var(--ink-soft);display:flex;align-items:center;gap:6px;cursor:pointer">
              <input type="checkbox" data-clean-individual="${gIdx}">
              <span>Limpiar asesores redundantes en registros individuales (Opcional · Desmarcado por defecto para no modificar ningún dato existente)</span>
            </label>
          </div>
        </div>
      `;
    }).join('');

    modalWrap.innerHTML = `
      <div id="m_ct_backdrop" style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px">
        <div style="background:var(--surface);border:1.5px solid var(--line-strong);border-radius:14px;max-width:960px;width:100%;max-height:90vh;display:flex;flex-direction:column;box-shadow:var(--shadow-lg);overflow:hidden">
          
          <!-- Encabezado fijo (Sticky Top) -->
          <div style="position:sticky;top:0;z-index:10;background:var(--surface);display:flex;flex-direction:column;gap:12px;padding:18px 24px;border-bottom:1px solid var(--line);box-shadow:0 2px 4px rgba(0,0,0,0.03)">
            <div style="display:flex;justify-content:space-between;align-items:flex-start">
              <div>
                <h3 style="margin:0;display:flex;align-items:center;gap:8px;font-size:18px;color:var(--navy-900)">
                  👥 Consolidar Cuerpo Técnico por Grupo (JEDPA)
                </h3>
                <p style="margin:4px 0 0;font-size:13px;color:var(--ink-soft)">
                  Asigna el cuerpo técnico (Delegado / Entrenador) una sola vez por cada grupo de competencia. Esto optimiza el acta oficial sin duplicar información.
                </p>
              </div>
              <button type="button" class="iconBtn" id="m_ct_close" title="Cerrar modal (Esc)" style="font-size:18px;line-height:1;padding:6px 10px;cursor:pointer">✕</button>
            </div>

            <!-- Barra de búsqueda y filtros de disciplina -->
            <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:var(--surface-2);padding:10px 14px;border-radius:10px;border:1px solid var(--line)">
              <!-- Buscador de texto -->
              <div style="flex:1;min-width:240px;position:relative">
                <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:14px;color:var(--ink-soft);pointer-events:none">🔍</span>
                <input type="search" id="m_ct_search_input" placeholder="Buscar por disciplina, categoría, género, profesor o DNI..." value="${esc(filterSearchText)}" style="width:100%;padding:7px 10px 7px 32px;font-size:13px;border-radius:7px;border:1px solid var(--line);background:var(--surface);box-sizing:border-box">
              </div>

              <!-- Selector desplegable de Disciplinas -->
              <div style="min-width:190px">
                <select id="m_ct_filter_disciplina" style="width:100%;padding:7px 10px;font-size:13px;font-weight:600;border-radius:7px;border:1px solid var(--line);background:var(--surface);cursor:pointer">
                  <option value="">Todas las disciplinas (${uniqueDisciplinas.length})</option>
                  ${uniqueDisciplinas.map(d => `<option value="${esc(d)}" ${d === filterDisciplina ? 'selected' : ''}>${esc(d)} (${disciplinaCounts[d] || 0})</option>`).join('')}
                </select>
              </div>

              <!-- Filtro por Estado -->
              <div style="min-width:150px">
                <select id="m_ct_filter_estado" style="width:100%;padding:7px 10px;font-size:13px;border-radius:7px;border:1px solid var(--line);background:var(--surface);cursor:pointer">
                  <option value="todos" ${filterEstado === 'todos' ? 'selected' : ''}>Todos los estados</option>
                  <option value="pendientes" ${filterEstado === 'pendientes' ? 'selected' : ''}>⚠️ Pendientes</option>
                  <option value="formalizados" ${filterEstado === 'formalizados' ? 'selected' : ''}>✓ Formalizados</option>
                </select>
              </div>

              <!-- Botón limpiar -->
              <button type="button" class="btn secondary small" id="m_ct_clear_filters" style="font-size:12px;padding:7px 12px;white-space:nowrap" title="Restablecer filtros">
                Limpiar
              </button>
            </div>
          </div>

          <!-- Contenido central scrolleable -->
          <div id="m_ct_scroll_body" style="flex:1;overflow-y:auto;padding:20px 24px">
            <div id="m_ct_empty_filter" style="display:none;text-align:center;padding:40px 20px;color:var(--ink-soft);background:var(--surface-2);border-radius:10px;border:1px dashed var(--line);margin-bottom:16px">
              <div style="font-size:32px;margin-bottom:8px">🔍</div>
              <div style="font-weight:700;font-size:15px;color:var(--navy-900)">No se encontraron grupos</div>
              <div style="font-size:13px;margin-top:4px">No hay ningún grupo de competencia que coincida con el criterio de búsqueda o disciplina seleccionada.</div>
            </div>
            ${groupsHtml}
          </div>

          <!-- Pie fijo (Sticky Bottom) -->
          <div style="position:sticky;bottom:0;z-index:10;background:var(--surface);display:flex;justify-content:space-between;align-items:center;border-top:1px solid var(--line);padding:14px 24px">
            <div style="font-size:12px;color:var(--ink-soft)">
              <span id="m_ct_group_count_label">${groups.length} grupo${groups.length === 1 ? '' : 's'} analizado${groups.length === 1 ? '' : 's'}</span>
            </div>
            <div style="display:flex;gap:10px">
              <button type="button" class="btn secondary" id="m_ct_closeBtn">Cerrar</button>
            </div>
          </div>

        </div>
      </div>
    `;

    // Event listeners de cierre y atajo de teclado ESC
    if (!escListenerAttached) {
      window.addEventListener('keydown', handleEscKey);
      escListenerAttached = true;
    }

    const closeBtn1 = modalWrap.querySelector('#m_ct_close');
    if (closeBtn1) closeBtn1.addEventListener('click', closeModal);
    const closeBtn2 = modalWrap.querySelector('#m_ct_closeBtn');
    if (closeBtn2) closeBtn2.addEventListener('click', closeModal);

    const backdrop = modalWrap.querySelector('#m_ct_backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal();
      });
    }

    // Event listeners de búsqueda y filtrado interactivo
    function applyGroupFilters() {
      const cards = modalWrap.querySelectorAll('.m_ct_group_card');
      const emptyNotice = modalWrap.querySelector('#m_ct_empty_filter');
      const countLabel = modalWrap.querySelector('#m_ct_group_count_label');

      const q = (filterSearchText || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const discFilter = (filterDisciplina || '').trim().toUpperCase();
      const estFilter = filterEstado || 'todos';

      let visibleCount = 0;

      cards.forEach(card => {
        const cardDisc = (card.dataset.disciplina || '').trim().toUpperCase();
        const cardEstado = card.dataset.estado || 'pendiente';
        const cardSearch = (card.dataset.searchtext || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        // Filtro de disciplina
        if (discFilter && cardDisc !== discFilter) {
          card.style.display = 'none';
          return;
        }

        // Filtro de estado
        if (estFilter === 'pendientes' && cardEstado !== 'pendiente') {
          card.style.display = 'none';
          return;
        }
        if (estFilter === 'formalizados' && cardEstado !== 'formalizado') {
          card.style.display = 'none';
          return;
        }

        // Búsqueda de texto (disciplina, categoría, género, DNI, nombres de docentes)
        if (q) {
          if (!cardSearch.includes(q)) {
            card.style.display = 'none';
            return;
          }
        }

        card.style.display = '';
        visibleCount++;
      });

      if (emptyNotice) {
        emptyNotice.style.display = (visibleCount === 0) ? 'block' : 'none';
      }

      if (countLabel) {
        if (visibleCount === groups.length) {
          countLabel.textContent = `${groups.length} grupo${groups.length === 1 ? '' : 's'} analizado${groups.length === 1 ? '' : 's'}`;
        } else {
          const detail = discFilter ? ` · ${discFilter}` : '';
          countLabel.innerHTML = `Mostrando <strong>${visibleCount}</strong> de <strong>${groups.length}</strong> grupos${detail}`;
        }
      }
    }

    const searchInput = modalWrap.querySelector('#m_ct_search_input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        filterSearchText = e.target.value;
        applyGroupFilters();
      });
    }

    const discSelect = modalWrap.querySelector('#m_ct_filter_disciplina');
    if (discSelect) {
      discSelect.addEventListener('change', (e) => {
        filterDisciplina = e.target.value;
        applyGroupFilters();
      });
    }

    const estSelect = modalWrap.querySelector('#m_ct_filter_estado');
    if (estSelect) {
      estSelect.addEventListener('change', (e) => {
        filterEstado = e.target.value;
        applyGroupFilters();
      });
    }

    const clearFiltersBtn = modalWrap.querySelector('#m_ct_clear_filters');
    if (clearFiltersBtn) {
      clearFiltersBtn.addEventListener('click', () => {
        filterSearchText = '';
        filterDisciplina = '';
        filterEstado = 'todos';
        if (searchInput) searchInput.value = '';
        if (discSelect) discSelect.value = '';
        if (estSelect) estSelect.value = 'todos';
        applyGroupFilters();
      });
    }

    // Ejecutar filtro inicial por si viene de un re-renderizado
    applyGroupFilters();

    // Registrar cambios en los desplegables de rol para preservarlos
    modalWrap.querySelectorAll('.m_ct_role').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const gI = e.target.dataset.gidx;
        const mI = e.target.dataset.midx;
        roleSelections.set(`${gI}_${mI}`, e.target.value.trim());
      });
    });

    // Guardar cuerpo técnico de un grupo
    modalWrap.querySelectorAll('[data-save-ct]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const gIdx = Number(btn.dataset.saveCt);
        const group = groups[gIdx];
        if (!group) return;

        btn.disabled = true;
        btn.textContent = 'Guardando...';

        const panel = btn.closest('.panel');
        const rows = panel.querySelectorAll('tbody tr[data-member-idx]');
        const membersToSave = [];

        rows.forEach(r => {
          const rolSel = r.querySelector('.m_ct_role');
          const apeInp = r.querySelector('.m_ct_ape');
          const nomInp = r.querySelector('.m_ct_nom');
          const dniInp = r.querySelector('.m_ct_dni');

          const rolVal = rolSel ? rolSel.value.trim() : 'Delegado';
          const midx = r.dataset.memberIdx;
          if (midx !== undefined) {
            roleSelections.set(`${gIdx}_${midx}`, rolVal);
          }

          membersToSave.push({
            rol: rolVal,
            apellidos: apeInp ? apeInp.value.trim().toUpperCase() : '',
            nombres: nomInp ? nomInp.value.trim().toUpperCase() : '',
            dni: dniInp ? dniInp.value.trim() : ''
          });
        });

        if (membersToSave.length === 0) {
          showToast('No hay miembros para guardar.');
          btn.disabled = false;
          btn.textContent = '💾 Guardar en concursoCuerpoTecnico';
          return;
        }

        const ctDocId = generarConcursoCuerpoTecnicoDocId(
          group.etapa || 'UGEL',
          group.disciplina,
          group.categoria,
          formatGeneroDisplay(group.genero)
        );

        const payload = {
          tipoConcursoId: 'jedpa',
          concursoNombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
          etapa: group.etapa || 'UGEL',
          disciplina: group.disciplina,
          categoria: group.categoria,
          genero: group.genero,
          rama: formatGeneroDisplay(group.genero),
          miembros: membersToSave,
          personas: membersToSave,
          registrosCount: group.records.length,
          consolidatedAt: Date.now(),
          consolidatedBy: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Admin',
          updatedAt: Date.now()
        };

        try {
          await dbNs.collection('concursoCuerpoTecnico').doc(ctDocId).set(payload);

          // Actualizar inmediatamente el estado en memoria para reflejarlo sin recargar
          const savedDoc = { id: ctDocId, ...payload };
          const existingIdx = (state.concursoCuerpoTecnico || []).findIndex(d => d.id === ctDocId);
          if (existingIdx >= 0) {
            state.concursoCuerpoTecnico[existingIdx] = savedDoc;
          } else {
            state.concursoCuerpoTecnico = state.concursoCuerpoTecnico || [];
            state.concursoCuerpoTecnico.push(savedDoc);
          }

          // Checkbox para limpiar registros individuales (opcional)
          const cleanChk = panel.querySelector(`[data-clean-individual="${gIdx}"]`);
          if (cleanChk && cleanChk.checked) {
            try {
              const batch = dbNs.batch();
              group.records.forEach(rec => {
                const recRef = dbNs.collection('concursoRegistros').doc(rec.id);
                batch.update(recRef, { asesores: [], cuerpoTecnicoRef: ctDocId, updatedAt: Date.now() });
                rec.asesores = [];
                rec.cuerpoTecnicoRef = ctDocId;
              });
              await batch.commit();
            } catch (batchErr) {
              console.warn('[concursoRegistros:batchUpdate] Advertencia limpiando asesores individuales:', batchErr);
            }
          }

          // Registrar en logActividades de forma segura (no bloqueante)
          try {
            await dbNs.collection('logActividades').add({
              tipo: 'consolidar_cuerpo_tecnico_grupo',
              grupo: group.groupKey,
              docId: ctDocId,
              miembrosCount: membersToSave.length,
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Admin',
              fecha: Date.now()
            });
          } catch (logErr) {
            console.warn('[logActividades:add] Aviso: no se pudo escribir bitácora (no crítico):', logErr);
          }

          showToast('✓ Cuerpo técnico formalizado en concursoCuerpoTecnico.');
          renderModalBody();
          renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
        } catch (err) {
          console.error('[concursoCuerpoTecnico:set] Error guardando cuerpo técnico en ' + ctDocId + ':', err);
          const errCode = err && err.code ? ` [${err.code}]` : '';
          showToast(`Error al guardar${errCode}: ${err.message || err}`);
          btn.disabled = false;
          btn.textContent = '💾 Guardar en concursoCuerpoTecnico';
        }
      });
    });

    // Rollback de cuerpo técnico
    modalWrap.querySelectorAll('[data-rollback-ct]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const docId = btn.dataset.rollbackCt;
        const gKey = btn.dataset.gkey;
        if (!docId) return;

        if (!confirm(`¿Deseas eliminar la formalización del cuerpo técnico para ${gKey}?\n\nLos registros de los competidores individuales mantendrán intacta su información histórica.`)) {
          return;
        }

        btn.disabled = true;
        btn.textContent = 'Eliminando...';

        try {
          await dbNs.collection('concursoCuerpoTecnico').doc(docId).delete();

          // Retirar de state.concursoCuerpoTecnico local
          if (Array.isArray(state.concursoCuerpoTecnico)) {
            state.concursoCuerpoTecnico = state.concursoCuerpoTecnico.filter(d => d.id !== docId);
          }

          // Registrar rollback en logActividades de forma segura
          try {
            await dbNs.collection('logActividades').add({
              tipo: 'rollback_cuerpo_tecnico_grupo',
              grupo: gKey,
              docId: docId,
              usuario: currentUser ? (currentUser.displayName || currentUser.email || 'Admin') : 'Admin',
              fecha: Date.now()
            });
          } catch (logErr) {
            console.warn('[logActividades:add] Aviso en bitácora de rollback:', logErr);
          }

          showToast('✓ Rollback completado. Se eliminó la formalización del grupo.');
          renderModalBody();
          renderConcursosTab(container, state, dbNs, isAdmin, currentUser, navigate);
        } catch (err) {
          console.error('[concursoCuerpoTecnico:delete] Error en rollback de ' + docId + ':', err);
          const errCode = err && err.code ? ` [${err.code}]` : '';
          showToast(`Error en rollback${errCode}: ${err.message || err}`);
          btn.disabled = false;
          btn.textContent = '🗑️ Deshacer formalización (Rollback)';
        }
      });
    });
  }

  renderModalBody();
  document.body.appendChild(modalWrap);
}
