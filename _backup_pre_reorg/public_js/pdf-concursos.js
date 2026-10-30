/* =========================================================================
   pdf-concursos.js — Generador oficial de documentos PDF para Concursos Educativos
   UGEL 03 · AGEBRE
   Contiene las actas y reportes oficiales de:
   - JEDPA (Juegos Escolares Deportivos y Paradeportivos)
   - JFEN (Juegos Florales Escolares Nacionales)
   - FENCYT (Feria Escolar Nacional de Ciencia y Tecnología)
   - ONEM (Olimpiada Nacional Escolar de Matemática)
   - José María Arguedas, Crea y Emprende, Tintas y Letras, etc.
   - Actas Oficiales de Orden de Mérito y Acreditación de Ganadores
   ========================================================================= */

import {
  getJsPdf,
  createOfficialPdfDocument,
  formatDate,
  toTitleCase,
  COMMON_GIVEN_NAMES,
  cleanWordForDict,
  splitRawNameToApellidosNombres,
  APELLIDOS_OBLIGATORIO,
  formatearNombre,
  proponerSeparacionNombre,
  formatPersonName,
  PALETA_ESTANDAR,
  verificarTextoPdf as _verificarTextoPdf,
  formatResolucionRef,
  dibujarPiePagina,
  generateVerificationCode,
  getCurrentDateTimeStr,
  getLimaDateStr,
  sanitizeFilename,
  plural,
  drawVectorCheckmark,
  drawVectorCheckbox,
  ensureUnicodeFont,
  sanitizePdfText,
  drawOfficialHeader
} from './pdf-core.js?v=20261014_v1';

export function verificarTextoPdf(texto, contexto = '') {
  return _verificarTextoPdf(texto, contexto);
}

export { PALETA_ESTANDAR, dibujarPiePagina };

// Pie de pagina con fecha de emision y codigo de verificacion: Emitido el fecha

/**
 * Interpreta en memoria el dato "Arte / Disciplina" separando por '/'.
 * Si no se puede separar, coloca todo en `disciplina` y '—' en `arte`.
 */
export function parseArteDisciplina(disciplinaStr) {
  if (!disciplinaStr || !String(disciplinaStr).trim()) {
    return { arte: '—', disciplina: '—', full: '—' };
  }
  const s = String(disciplinaStr).trim();
  const parts = s.split('/').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      arte: parts[0],
      disciplina: parts.slice(1).join(' / '),
      full: s
    };
  }
  return {
    arte: '—',
    disciplina: s,
    full: s
  };
}

export const JEDPA_THEME = {
  navy: '#12294C',       // [18, 41, 76] Encabezados de tabla, línea superior del documento
  title: '#0B1B36',      // [11, 27, 54] Título principal del acta
  band: '#2E4A73',       // [46, 74, 115] Franja de grupo (ej. BÁSQUET · CATEGORÍA B · VARONES)
  gold: '#E0A626',       // [224, 166, 38] Acento lateral de la franja / destacados
  goldText: '#B7791F',   // [183, 121, 31] Subtítulo (Comisión Organizadora · Filtros)
  goldSoft: '#FDF6E3',   // [253, 246, 227] Fondo suave de cuerpo técnico
  boxBg: '#EDF2F5',      // [237, 242, 245] Cajas del membrete (PERÚ, DRELM, UGEL 03, AGEBRE)
  kpiBg: '#F7FAFC',      // [247, 250, 252] Caja de indicadores (KPI)
  border: '#D9E1EA',     // [217, 225, 234] Bordes suaves
  muted: '#5F6A7B',      // [95, 106, 123] Texto secundario
  altRow: '#F7FAFC'      // Fondo alterno de filas de estudiantes
};

export const DISCIPLINAS_COLECTIVAS_DEFAULT = [
  'FUTBOL', 'FÚTBOL', 'FUTSAL', 'BASQUET', 'BÁSQUET', 'VOLEIBOL', 'VÓLEIBOL',
  'VOLEY', 'VÓLEY', 'VOLEY PLAYA', 'VÓLEY PLAYA', 'HANDBALL', 'BALONMANO'
];

/**
 * Determina si una disciplina o registro de JEDPA corresponde a una modalidad colectiva (grupal).
 * Criterios:
 * 1. Campo explícito modalidad === 'colectiva' en registro o tipoConcurso
 * 2. Si la disciplina está en DISCIPLINAS_COLECTIVAS_DEFAULT
 * 3. Respaldo: si el registro tiene más de 1 participante
 */
export function esDisciplinaColectiva(disciplina, registro = null, tipoConcurso = null) {
  if (registro && registro.modalidad) {
    const mod = String(registro.modalidad).toLowerCase().trim();
    if (mod === 'colectiva' || mod === 'grupal') return true;
    if (mod === 'individual') return false;
  }
  if (tipoConcurso && tipoConcurso.modalidad) {
    const mod = String(tipoConcurso.modalidad).toLowerCase().trim();
    if (mod === 'colectiva' || mod === 'grupal') return true;
    if (mod === 'individual') return false;
  }
  const discNorm = String(disciplina || (registro ? (registro.disciplina || registro.tituloTrabajo) : '') || '')
    .trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (DISCIPLINAS_COLECTIVAS_DEFAULT.some(d => {
    const dNorm = d.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return discNorm.includes(dNorm) || dNorm.includes(discNorm);
  })) {
    return true;
  }

  // Respaldo: si tiene más de 1 estudiante en participantes
  if (registro && Array.isArray(registro.participantes) && registro.participantes.length > 1) {
    return true;
  }

  return false;
}

export function normalizeGenero(val) {
  if (!val) return 'sin_genero';
  const s = String(val).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
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

/* =========================================================================
   CONFIGURACIÓN CENTRALIZADA POR CONCURSO (ACTAS PDF Y TABLAS)
   ========================================================================= */
export const CONCURSOS_CONFIG = {
  jedpa: {
    id: 'jedpa',
    nombreCorto: 'JEDPA',
    columna_asesor_singular: 'Delegado / Entrenador',
    etiqueta_columna_asesor: 'Delegado / Entrenador',
    etiqueta_asesor_plural: 'Cuerpo técnico',
    etiqueta_cuerpo_tecnico: 'Delegado / Entrenador',
    cuerpo_tecnico_por_grupo: true,
    formato_pdf_actas: 'tabular',
    formato_pdf_colectivo: 'fichas',
    alcance_cuerpo_tecnico: 'por_grupo',
    columnas_combinables: ['categoria', 'disciplina', 'cuerpoTecnico', 'etapa', 'resolucionRef'],
    mayusculas_cuerpo_tecnico: true,
    optimizar_filas_compactas: true,
    roles_permitidos_asesor: ['DELEGADO', 'ENTRENADOR'],
    color_fila_grupo: [47, 74, 116],        // Azul pizarra #2F4A74
    color_texto_fila_grupo: [255, 255, 255],// Blanco
    color_borde_fila_grupo: [224, 165, 38]  // Dorado #E0A526
  },
  jfen: {
    id: 'jfen',
    nombreCorto: 'JFEN',
    columna_asesor_singular: 'Docente Asesor',
    etiqueta_columna_asesor: 'Docente Asesor',
    etiqueta_asesor_plural: 'Docentes asesores',
    etiqueta_cuerpo_tecnico: 'Docente Asesor',
    cuerpo_tecnico_por_grupo: false,
    formato_pdf_actas: 'fichas_por_categoria',
    alcance_cuerpo_tecnico: 'individual',
    columnas_combinables: [],
    mayusculas_cuerpo_tecnico: false,
    optimizar_filas_compactas: false,
    roles_permitidos_asesor: ['DOCENTE ASESOR']
  },
  peru_lee: {
    id: 'peru_lee',
    nombreCorto: 'El Perú Lee',
    columna_asesor_singular: 'Docente Asesor',
    etiqueta_columna_asesor: 'Docente Asesor',
    etiqueta_asesor_plural: 'Docentes asesores',
    etiqueta_cuerpo_tecnico: 'Docente Asesor',
    cuerpo_tecnico_por_grupo: false,
    formato_pdf_actas: 'tabular',
    alcance_cuerpo_tecnico: 'individual',
    columnas_combinables: [],
    mayusculas_cuerpo_tecnico: false,
    optimizar_filas_compactas: false,
    roles_permitidos_asesor: ['DOCENTE ASESOR']
  },
  eureka: {
    id: 'eureka',
    nombreCorto: 'Eureka',
    columna_asesor_singular: 'Docente Asesor',
    etiqueta_columna_asesor: 'Docente Asesor',
    etiqueta_asesor_plural: 'Docentes asesores',
    etiqueta_cuerpo_tecnico: 'Docente Asesor',
    cuerpo_tecnico_por_grupo: false,
    formato_pdf_actas: 'tabular',
    alcance_cuerpo_tecnico: 'individual',
    columnas_combinables: [],
    mayusculas_cuerpo_tecnico: false,
    optimizar_filas_compactas: false,
    roles_permitidos_asesor: ['DOCENTE ASESOR']
  },
  onem: {
    id: 'onem',
    nombreCorto: 'ONEM',
    columna_asesor_singular: 'Docente Asesor',
    etiqueta_columna_asesor: 'Docente Asesor',
    etiqueta_asesor_plural: 'Docentes asesores',
    etiqueta_cuerpo_tecnico: 'Docente Asesor',
    cuerpo_tecnico_por_grupo: false,
    formato_pdf_actas: 'tabular',
    alcance_cuerpo_tecnico: 'individual',
    columnas_combinables: [],
    mayusculas_cuerpo_tecnico: false,
    optimizar_filas_compactas: false,
    roles_permitidos_asesor: ['DOCENTE ASESOR']
  },
  jma: {
    id: 'jma',
    nombreCorto: 'José María Arguedas',
    columna_asesor_singular: 'Docente Asesor',
    etiqueta_columna_asesor: 'Docente Asesor',
    etiqueta_asesor_plural: 'Docentes asesores',
    etiqueta_cuerpo_tecnico: 'Docente Asesor',
    cuerpo_tecnico_por_grupo: false,
    formato_pdf_actas: 'tabular',
    alcance_cuerpo_tecnico: 'individual',
    columnas_combinables: [],
    mayusculas_cuerpo_tecnico: false,
    optimizar_filas_compactas: false,
    roles_permitidos_asesor: ['DOCENTE ASESOR']
  }
};

/**
 * Obtiene la configuración consolidada para un tipo de concurso
 */
export function getConcursoConfig(tipoConcurso) {
  if (!tipoConcurso) {
    return {
      id: 'general',
      nombreCorto: 'Concursos',
      etiqueta_columna_asesor: 'Docente Asesor',
      etiqueta_cuerpo_tecnico: 'Docente Asesor',
      formato_pdf_actas: 'tabular',
      alcance_cuerpo_tecnico: 'individual',
      columnas_combinables: [],
      mayusculas_cuerpo_tecnico: false,
      optimizar_filas_compactas: false,
      roles_permitidos_asesor: ['Docente Asesor']
    };
  }

  const id = String(tipoConcurso.id || '').toLowerCase().trim();
  const nom = String(tipoConcurso.nombre || '').toLowerCase().trim();

  if (CONCURSOS_CONFIG[id]) {
    return { ...CONCURSOS_CONFIG[id], ...tipoConcurso };
  }
  if (id.includes('jedpa') || nom.includes('jedpa') || nom.includes('deportivos')) {
    return { ...CONCURSOS_CONFIG.jedpa, ...tipoConcurso };
  }
  if (id.includes('jfen') || nom.includes('jfen') || nom.includes('florales')) {
    return { ...CONCURSOS_CONFIG.jfen, ...tipoConcurso };
  }
  if (id.includes('peru_lee') || nom.includes('lee') || nom.includes('lectora')) {
    return { ...CONCURSOS_CONFIG.peru_lee, ...tipoConcurso };
  }
  if (id.includes('eureka') || nom.includes('eureka') || nom.includes('ciencia')) {
    return { ...CONCURSOS_CONFIG.eureka, ...tipoConcurso };
  }
  if (id.includes('onem') || nom.includes('onem') || nom.includes('matematica')) {
    return { ...CONCURSOS_CONFIG.onem, ...tipoConcurso };
  }
  if (id.includes('jma') || nom.includes('arguedas') || nom.includes('narrativa')) {
    return { ...CONCURSOS_CONFIG.jma, ...tipoConcurso };
  }

  return {
    id: id || 'general',
    nombreCorto: tipoConcurso.nombre || 'Concursos',
    etiqueta_columna_asesor: tipoConcurso.etiqueta_columna_asesor || 'Docente Asesor',
    etiqueta_cuerpo_tecnico: tipoConcurso.etiqueta_cuerpo_tecnico || 'Docente Asesor',
    formato_pdf_actas: tipoConcurso.formato_pdf_actas || 'tabular',
    alcance_cuerpo_tecnico: tipoConcurso.alcance_cuerpo_tecnico || 'individual',
    columnas_combinables: tipoConcurso.columnas_combinables || [],
    mayusculas_cuerpo_tecnico: Boolean(tipoConcurso.mayusculas_cuerpo_tecnico),
    optimizar_filas_compactas: Boolean(tipoConcurso.optimizar_filas_compactas),
    roles_permitidos_asesor: tipoConcurso.roles_permitidos_asesor || ['Docente Asesor'],
    ...tipoConcurso
  };
}

/**
 * Formatea el rol para presentación
 */
export function formatearRol(rol, { mayusculas = false } = {}) {
  if (!rol || !String(rol).trim()) return mayusculas ? 'ASESOR' : 'Asesor';
  const r = String(rol).trim();
  return mayusculas ? r.toUpperCase() : r;
}

/**
 * Deduplica y formatea el cuerpo técnico para presentación en actas y tablas.
 * En JEDPA:
 *   - Orden: primero Delegado(s), luego Entrenador(es); dentro de cada rol, alfabético por apellidos.
 *   - Todo en MAYÚSCULAS.
 *   - Formato en dos líneas compactas por persona:
 *       DELEGADO: ESCURRA ZAPATA SIMON
 *       DNI 09428296
 */
export function formatearCuerpoTecnicoTexto(personas, { mayusculas = true, formato = 'multiline', vacioTexto = '' } = {}) {
  if (!Array.isArray(personas) || personas.length === 0) {
    return vacioTexto || (mayusculas ? 'SIN CUERPO TÉCNICO REGISTRADO' : 'Sin docente asesor registrado');
  }

  // Deduplicar personas por DNI o por nombre completo normalizado
  const uniqueMap = new Map();
  personas.forEach(p => {
    if (!p) return;
    const nom = formatearNombre(p);
    const dni = (p.dni || '').trim();
    const key = dni ? `dni_${dni}` : `nom_${nom.toLowerCase()}`;
    if (!key || key === 'nom_') return;

    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, {
        apellidos: (p.apellidos || '').trim(),
        nombres: (p.nombres || '').trim(),
        dni: dni,
        rol: (p.rol || (mayusculas ? 'ENTRENADOR' : 'Docente Asesor')).trim()
      });
    }
  });

  const uniqueList = Array.from(uniqueMap.values());
  if (uniqueList.length === 0) {
    return vacioTexto || (mayusculas ? 'SIN CUERPO TÉCNICO REGISTRADO' : 'Sin docente asesor registrado');
  }

  // Ordenamiento: 1.° Delegados, 2.° Entrenadores, 3.° Asesores, 4.° Otros; luego alfabético por apellidos/nombres
  function getRolRank(r) {
    const s = (r || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (s.includes('delegad')) return 1;
    if (s.includes('entrenad')) return 2;
    if (s.includes('docente') || s.includes('asesor')) return 3;
    return 4;
  }

  uniqueList.sort((a, b) => {
    const rk = getRolRank(a.rol) - getRolRank(b.rol);
    if (rk !== 0) return rk;
    const nameA = formatearNombre(a);
    const nameB = formatearNombre(b);
    return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
  });

  if (formato === 'single_line') {
    return uniqueList.map(p => {
      const rolStr = mayusculas ? (p.rol || 'ENTRENADOR').toUpperCase() : (p.rol || 'Entrenador');
      const nomStr = formatearNombre(p);
      const dniStr = p.dni ? ` (DNI ${p.dni})` : '';
      return `${rolStr}: ${nomStr}${dniStr}`;
    }).join(' · ');
  }

  // Formato multiline (2 líneas compactas por persona)
  return uniqueList.map(p => {
    const rolStr = mayusculas ? (p.rol || 'ENTRENADOR').toUpperCase() : (p.rol || 'Entrenador');
    const nomStr = formatearNombre(p);
    const dniStr = p.dni ? `DNI ${p.dni}` : '';
    return dniStr ? `${rolStr}: ${nomStr}\n${dniStr}` : `${rolStr}: ${nomStr}`;
  }).join('\n\n');
}

/**
 * Formatea los filtros para el subtítulo del PDF con la etiqueta real en mayúsculas
 * (Etapa -> Disciplina -> Categoría -> Género)
 */
export function formatearFiltrosSubtitulo(filters = {}, etapaLabel = 'UGEL') {
  const filtrosArr = [];
  if (filters.etapa) {
    filtrosArr.push(`Etapa ${String(filters.etapa).trim().toUpperCase()}`);
  }
  if (filters.disciplina) {
    filtrosArr.push(`Disciplina ${String(filters.disciplina).trim().toUpperCase()}`);
  }
  if (filters.categoria) {
    const cStr = Array.isArray(filters.categoria) ? filters.categoria.join(', ') : String(filters.categoria);
    if (cStr.trim()) {
      filtrosArr.push(`Categoría ${cStr.trim().toUpperCase()}`);
    }
  }
  if (filters.genero) {
    filtrosArr.push(`Género ${String(filters.genero).trim().toUpperCase()}`);
  }
  if (filtrosArr.length > 0) {
    return `Filtros: ${filtrosArr.join(' · ')}`;
  }
  return `Etapa oficial: ${String(etapaLabel || 'UGEL').trim().toUpperCase()}`;
}

/**
 * Regla de lectura unificada del cuerpo técnico para un grupo:
 * 1. Si existe en la entidad concursoCuerpoTecnico -> usar ese
 * 2. Si no -> calcular en memoria con registros del grupo (unión y deduplicación por DNI)
 *    Detecta conflictos de rol para advertir en "Datos por revisar"
/**
 * Generador de ID determinístico de documento para concursoCuerpoTecnico por grupo
 * Formato: ETAPA__DISCIPLINA__CATEGORIA__RAMA (normalizado en mayúsculas y sin acentos)
 */
export function generarConcursoCuerpoTecnicoDocId(etapa, disciplina, categoria, rama) {
  return [etapa, disciplina, categoria, rama]
    .map(v => String(v || '').trim().toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_'))
    .join('__');
}

/**
 * Regla de lectura unificada del cuerpo técnico para un grupo:
 * 1. Si existe en la entidad concursoCuerpoTecnico -> usar ese (con esGrupoFormalizado = true)
 * 2. Si no -> calcular en memoria con registros del grupo (unión y deduplicación por DNI)
 *    Detecta conflictos de rol para advertir en "Datos por revisar"
 * 
 * Soporta de manera polimórfica:
 * - llamada desde ui.js: (record, state.concursoCuerpoTecnico, filteredRecords)
 * - llamada desde pdf-template: (grupoKey, rowsInGroup, state, tipoConcurso)
 */
export function obtenerCuerpoTecnicoGrupo(target, arg2 = [], arg3 = {}, arg4 = null) {
  // Extraer cList (documentos de concursoCuerpoTecnico) y registros del grupo
  let cList = [];
  let registrosGrupo = [];

  if (Array.isArray(arg2)) {
    // Si el 2º argumento contiene documentos de concursoCuerpoTecnico (tienen miembros/personas o id estructurado)
    const looksLikeCtDocs = arg2.length === 0 || arg2.some(item => item && (item.miembros || item.personas || item.consolidatedAt || (item.id && (item.id.includes('__') || item.id.startsWith('jedpa_')))));
    if (looksLikeCtDocs && arg2.length > 0) {
      cList = arg2;
      if (Array.isArray(arg3)) {
        registrosGrupo = arg3;
      }
    } else {
      registrosGrupo = arg2;
      if (arg3 && Array.isArray(arg3.concursoCuerpoTecnico)) {
        cList = arg3.concursoCuerpoTecnico;
      }
    }
  }

  // Búsqueda de respaldo en arg3 o window.state
  if (cList.length === 0 && arg3 && Array.isArray(arg3.concursoCuerpoTecnico)) {
    cList = arg3.concursoCuerpoTecnico;
  }
  if (cList.length === 0 && typeof window !== 'undefined' && window.state && Array.isArray(window.state.concursoCuerpoTecnico)) {
    cList = window.state.concursoCuerpoTecnico;
  }

  // Desestructuración y normalización de los 4 ejes del grupo
  let etapa = '';
  let disciplina = '';
  let categoria = '';
  let genero = '';
  let targetKey = '';

  const normText = (s) => String(s || '').trim().toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const normSlug = (s) => normText(s)
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (target && typeof target === 'object') {
    etapa = target.etapa || 'UGEL';
    disciplina = target.disciplina || target.tituloTrabajo || '';
    categoria = target.categoria || '';
    genero = target.genero || target.rama || '';
    targetKey = `${etapa} · ${disciplina} · CATEGORÍA ${categoria} · ${genero}`;
  } else if (typeof target === 'string') {
    targetKey = target;
    const parts = target.split('·').map(p => p.trim());
    if (parts.length >= 4) {
      etapa = parts[0];
      disciplina = parts[1];
      categoria = parts[2].replace(/^CATEGOR[IÍ]A\s*/i, '');
      genero = parts[3];
    } else if (parts.length === 3) {
      etapa = 'UGEL';
      disciplina = parts[0];
      categoria = parts[1].replace(/^CATEGOR[IÍ]A\s*/i, '');
      genero = parts[2];
    }
  }

  const normCat = (c) => normSlug(c).replace(/^CATEGORIA_?/, '');
  const normGen = (g) => {
    const n = normText(g);
    if (n.startsWith('DAM') || n === 'F') return 'DAMAS';
    if (n.startsWith('VAR') || n === 'M') return 'VARONES';
    if (n.startsWith('MIX')) return 'MIXTO';
    return n;
  };

  const detDocId = generarConcursoCuerpoTecnicoDocId(etapa || 'UGEL', disciplina, categoria, genero);
  const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const legacyDocId = `jedpa_${slug(etapa)}_${slug(disciplina)}_${slug(categoria)}_${slug(genero)}`;

  // Buscar coincidencia en la colección centralizada
  const registrado = (cList || []).find(c => {
    if (!c) return false;
    // 1. Por ID directo (determinístico o legacy)
    if (c.id === detDocId || c.id === legacyDocId) return true;
    if (targetKey && (c.id === targetKey || c.grupoKey === targetKey)) return true;
    if (typeof target === 'string' && (c.id === target || c.grupoKey === target)) return true;

    // 2. Por coincidencia de los 4 ejes
    if (etapa || disciplina || categoria || genero) {
      const cEtapa = c.etapa || 'UGEL';
      const cDisc = c.disciplina || '';
      const cCat = c.categoria || '';
      const cGen = c.genero || c.rama || '';

      const matchE = !etapa || normText(cEtapa) === normText(etapa);
      const matchD = !disciplina || normText(cDisc) === normText(disciplina);
      const matchC = !categoria || normCat(cCat) === normCat(categoria);
      const matchG = !genero || normGen(cGen) === normGen(genero);

      if (matchE && matchD && matchC && matchG) return true;
    }
    return false;
  });

  // Si existe en concursoCuerpoTecnico
  if (registrado) {
    const rawMembers = Array.isArray(registrado.miembros) && registrado.miembros.length > 0
      ? registrado.miembros
      : (Array.isArray(registrado.personas) ? registrado.personas : []);

    if (rawMembers.length > 0) {
      const normalizedMembers = rawMembers.map(m => ({
        rol: (m.rol || 'Delegado').trim(),
        apellidos: (m.apellidos || '').trim().toUpperCase(),
        nombres: (m.nombres || '').trim().toUpperCase(),
        dni: (m.dni || '').trim()
      }));

      return {
        origen: 'concursoCuerpoTecnico',
        esGrupoFormalizado: true,
        personas: normalizedMembers,
        miembros: normalizedMembers,
        conflictos: [],
        docId: registrado.id
      };
    }
  }

  // Deduplicación en memoria de los asesores del grupo
  const groupRecs = (registrosGrupo || []).filter(rec => {
    if (!rec) return false;
    if (!disciplina && !categoria && !genero) return true;
    const matchD = !disciplina || normText(rec.disciplina || rec.tituloTrabajo) === normText(disciplina);
    const matchC = !categoria || normCat(rec.categoria) === normCat(categoria);
    const matchG = !genero || normGen(rec.genero) === normGen(genero);
    return matchD && matchC && matchG;
  });

  const personasMap = new Map();
  const conflictos = [];

  groupRecs.forEach(r => {
    if (r.tieneExcepcionCuerpoTecnico) return;
    (r.asesores || []).forEach(a => {
      const nom = formatearNombre(a);
      const dni = (a.dni || '').trim();
      const key = dni ? `dni_${dni}` : `nom_${nom.toLowerCase()}`;
      if (!key || key === 'nom_') return;

      if (!personasMap.has(key)) {
        personasMap.set(key, {
          apellidos: (a.apellidos || '').trim(),
          nombres: (a.nombres || '').trim(),
          dni: dni,
          roles: new Set([a.rol || 'Entrenador']),
          registroIds: [r.id]
        });
      } else {
        const item = personasMap.get(key);
        item.roles.add(a.rol || 'Entrenador');
        item.registroIds.push(r.id);
      }
    });
  });

  const personas = [];
  personasMap.forEach((val) => {
    const rolesArr = Array.from(val.roles);
    let rolFinal = rolesArr[0];
    if (rolesArr.length > 1) {
      rolFinal = rolesArr.join(' / ');
      conflictos.push({
        persona: formatearNombre(val),
        dni: val.dni,
        roles: rolesArr,
        mensaje: `${formatearNombre(val)} (DNI ${val.dni || '—'}) figura como ${rolesArr.join(' y ')} en diferentes registros del grupo.`
      });
    }
    personas.push({
      apellidos: val.apellidos.toUpperCase(),
      nombres: val.nombres.toUpperCase(),
      dni: val.dni,
      rol: rolFinal
    });
  });

  const hasCalculated = personas.length > 0;
  return {
    origen: hasCalculated ? 'calculado' : 'individual',
    esGrupoFormalizado: false,
    personas,
    miembros: personas,
    conflictos,
    docId: null
  };
}

/**
 * Formatea el Código Modular a texto oficial de 7 dígitos con cero inicial cuando corresponde.
 * @param {string|number} val
 * @returns {string}
 */
export function formatCodigoModular(val) {
  if (val === null || val === undefined) return '—';
  const str = String(val).trim();
  if (!str || str === '—' || str === '-') return '—';
  // Si contiene solo dígitos y tiene entre 1 y 7 caracteres, rellenar con ceros a la izquierda
  if (/^\d{1,7}$/.test(str)) {
    return str.padStart(7, '0');
  }
  return str;
}

/**
 * Obtiene el cuerpo técnico exclusivo de un equipo/institución en disciplinas colectivas de JEDPA.
 * Para disciplinas grupales, el cuerpo técnico mostrado es el de ese equipo/institución.
 * Si existe un cuerpo técnico formalizado a nivel de grupo en concursoCuerpoTecnico,
 * se toman solo los integrantes vinculados a esa institución sin mezclar otros colegios.
 * Orden: Delegado primero, luego Entrenador(es).
 */
export function obtenerCuerpoTecnicoDeEquipo(registro, state = null) {
  if (!registro) return [];

  let miembros = [];

  // 1. Asesores propios del registro del equipo
  if (Array.isArray(registro.asesores) && registro.asesores.length > 0) {
    miembros = registro.asesores.map(a => ({
      rol: (a.rol || 'Delegado').trim(),
      apellidos: (a.apellidos || '').trim().toUpperCase(),
      nombres: (a.nombres || '').trim().toUpperCase(),
      dni: (a.dni || '').trim()
    }));
  } else {
    // 2. Si no tiene asesores individuales, buscar en concursoCuerpoTecnico
    const cList = (state && Array.isArray(state.concursoCuerpoTecnico))
      ? state.concursoCuerpoTecnico
      : ((typeof window !== 'undefined' && window.state && Array.isArray(window.state.concursoCuerpoTecnico))
          ? window.state.concursoCuerpoTecnico
          : []);

    const ctGrupo = obtenerCuerpoTecnicoGrupo(registro, cList);
    if (ctGrupo && ctGrupo.personas && ctGrupo.personas.length > 0) {
      // Filtrar por institución o código modular si viene marcado
      const matching = ctGrupo.personas.filter(m => {
        if (m.codigoModular && registro.codigoModular) {
          return formatCodigoModular(m.codigoModular) === formatCodigoModular(registro.codigoModular);
        }
        if (m.institucion && registro.institucion) {
          return m.institucion.trim().toUpperCase() === registro.institucion.trim().toUpperCase();
        }
        return true;
      });
      miembros = matching.length > 0 ? matching : ctGrupo.personas;
    }
  }

  // Ordenar: Delegado primero, luego Entrenador(es), luego Docente Asesor
  const rolPriority = (rol) => {
    const r = (rol || '').toUpperCase();
    if (r.includes('DELEGAD')) return 1;
    if (r.includes('ENTRENAD')) return 2;
    if (r.includes('DOCENTE') || r.includes('ASESOR')) return 3;
    return 4;
  };

  return miembros.slice().sort((a, b) => rolPriority(a.rol) - rolPriority(b.rol));
}

/**
 * Retorna el título oficial estandarizado para los consolidados de resultados de concursos
 * @param {Object} tipoConcurso
 * @returns {string}
 */
export function getTituloConsolidadoConcurso(tipoConcurso) {
  const nombre = tipoConcurso ? (tipoConcurso.nombre || '') : 'CONCURSOS EDUCATIVOS ESCOLARES';
  return `CONSOLIDADO OFICIAL DE LOS RESULTADOS - ${nombre.toUpperCase()}`;
}

/**
 * Normaliza y formatea la etiqueta de puesto oficial
 */
export function formatPuestoLabel(p) {
  if (!p) return '—';
  const s = String(p).toLowerCase().trim();
  if (s === '1' || s === '1°' || s === '1.' || s.includes('1.er') || s.includes('1er')) return '1.er puesto';
  if (s === '2' || s === '2°' || s === '2.' || s.includes('2.°') || s.includes('2do')) return '2.° puesto';
  if (s === '3' || s === '3°' || s === '3.' || s.includes('3.er') || s.includes('3er')) return '3.er puesto';
  if (s.includes('menci') || s.includes('mh')) return 'Mención honrosa';
  return p;
}

/**
 * Retorna el rango numérico de un puesto para ordenamiento
 */
export function puestoRank(p) {
  if (!p) return 99;
  const s = String(p).toLowerCase().trim();
  if (s === '1' || s === '1°' || s === '1.' || s.includes('1.er') || s.includes('1er')) return 1;
  if (s === '2' || s === '2°' || s === '2.' || s.includes('2.°') || s.includes('2do')) return 2;
  if (s === '3' || s === '3°' || s === '3.' || s.includes('3.er') || s.includes('3er')) return 3;
  if (s.includes('menci') || s.includes('mh')) return 4;
  return 5;
}

/**
 * Obtiene los campos que definen el podio para un tipo de concurso.
 * @param {Object} tipo
 * @returns {string[]}
 */
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

/**
 * Construye dinámicamente las filas de datos de la ficha según la configuración del concurso y valores reales.
 * Evita imprimir filas vacías o campos con relleno artificial "GENERAL".
 * @param {Object} tipoConcurso
 * @param {Object} registro
 * @param {Object} [options]
 * @returns {Array<{label: string, value: string, isBold?: boolean, isItalic?: boolean, isMuted?: boolean, isPuesto?: boolean, puestoRank?: number}>}
 */
export function construirFilasFicha(tipoConcurso, registro, options = {}) {
  const rows = [];
  if (!registro) return rows;

  // 1. Título del proyecto / trabajo (solo si tieneTitulo o tieneTituloTrabajo y existe valor válido)
  const hasTituloCfg = !!(tipoConcurso && (tipoConcurso.tieneTitulo || tipoConcurso.tieneTituloTrabajo));
  const rawTitulo = (registro.tituloTrabajo || '').trim();
  if ((hasTituloCfg || rawTitulo) && rawTitulo && rawTitulo !== '—') {
    const labelTit = (tipoConcurso && tipoConcurso.etiquetaTitulo) || 'Título del proyecto / trabajo';
    rows.push({
      label: labelTit,
      value: rawTitulo.toUpperCase()
    });
  }

  // 2. Área / Disciplina (solo si tieneDisciplina y el valor no es vacío ni "GENERAL" / "SIN DISCIPLINA")
  const hasDiscCfg = tipoConcurso ? (tipoConcurso.tieneDisciplina === true || (Array.isArray(tipoConcurso.disciplinas) && tipoConcurso.disciplinas.length > 0)) : true;
  const rawDisc = (registro.disciplina || '').trim();
  const isGenericDisc = !rawDisc || rawDisc === '—' || rawDisc.toUpperCase() === 'GENERAL' || rawDisc.toUpperCase() === 'SIN DISCIPLINA';
  if (hasDiscCfg && !isGenericDisc) {
    const labelDisc = (tipoConcurso && tipoConcurso.etiquetaDisciplina) || 'Área / Disciplina';
    rows.push({
      label: labelDisc,
      value: rawDisc.toUpperCase()
    });
  }

  // 3. Género (solo si tieneGenero y el valor no es vacío ni "SIN GÉNERO")
  const hasGenCfg = !!(tipoConcurso && tipoConcurso.tieneGenero === true);
  const rawGen = formatGeneroDisplay(registro.genero).trim();
  const isGenericGen = !rawGen || rawGen === '—' || rawGen.toUpperCase() === 'SIN GÉNERO';
  if (hasGenCfg && !isGenericGen) {
    rows.push({
      label: 'Género',
      value: rawGen.toUpperCase()
    });
  }

  // 4. Modalidad (opcional, solo si se solicita explícitamente y existe valor)
  if (options.mostrarModalidad && registro.modalidad && registro.modalidad !== '—') {
    rows.push({
      label: 'Modalidad',
      value: String(registro.modalidad).trim().toUpperCase()
    });
  }

  // 5. Institución Educativa (siempre presente, mayúsculas y negrita)
  rows.push({
    label: 'Institución Educativa',
    value: (registro.institucion || '—').trim().toUpperCase(),
    isBold: true
  });

  // 6. Código Modular (siempre presente y formateado con 7 dígitos)
  rows.push({
    label: 'Código Modular',
    value: formatCodigoModular(registro.codigoModular)
  });

  // 7. Puesto obtenido (con soporte para insignia vectorial)
  const rk = puestoRank(registro.puesto);
  const pLabel = formatPuestoLabel(registro.puesto);
  rows.push({
    label: 'Puesto obtenido',
    value: pLabel,
    isPuesto: true,
    puestoRank: rk
  });

  // 8. Resolución Directoral (referencia oficial o 'Sin resolución registrada' en cursiva)
  const hasRd = !!(registro.resolucionRef && String(registro.resolucionRef).trim() !== '—' && String(registro.resolucionRef).trim() !== '');
  rows.push({
    label: 'Resolución Directoral',
    value: hasRd ? formatResolucionRef(registro.resolucionRef) : 'Sin resolución registrada',
    isItalic: !hasRd,
    isMuted: !hasRd
  });

  return rows;
}

/**
 * Dibuja una insignia vectorial de puesto con círculo de color y texto limpio (sin emojis).
 * @param {Object} doc - Instancia de jsPDF
 * @param {string|number} puesto - Puesto original o rank
 * @param {number} x - Posición X inicial
 * @param {number} y - Posición Y inicial
 * @param {number} [w] - Ancho del recuadro
 * @param {number} [h] - Alto del recuadro
 */
export function dibujarInsigniaPuesto(doc, puesto, x, y, w = 84, h = 12) {
  const rk = puestoRank(puesto);
  const rawLabel = formatPuestoLabel(puesto);
  const label = rawLabel && rawLabel !== '—' ? rawLabel : 'Pendiente de asignación';

  let bg = [248, 250, 252];
  let border = [209, 213, 219];
  let dotColor = [100, 116, 139];
  let textColor = [30, 41, 59];

  if (rk === 1) {
    bg = [254, 249, 231];      // #FEF9E7
    border = [212, 160, 23];   // #D4A017 dorado
    dotColor = [212, 160, 23]; // #D4A017
    textColor = [122, 90, 0];   // #7A5A00
  } else if (rk === 2) {
    bg = [241, 243, 245];      // #F1F3F5
    border = [158, 167, 179];  // #9EA7B3 plata
    dotColor = [158, 167, 179];// #9EA7B3
    textColor = [71, 85, 105];  // #475569
  } else if (rk === 3) {
    bg = [250, 240, 230];      // #FAF0E6
    border = [184, 115, 51];   // #B87333 bronce
    dotColor = [184, 115, 51]; // #B87333
    textColor = [120, 53, 15];  // #78350F
  } else if (!puesto || puesto === '—') {
    bg = [248, 250, 252];
    border = [226, 232, 240];
    dotColor = [148, 163, 184];
    textColor = [100, 116, 139];
  }

  doc.setFillColor(bg[0], bg[1], bg[2]);
  doc.setDrawColor(border[0], border[1], border[2]);
  doc.setLineWidth(0.6);
  doc.roundedRect(x, y, w, h, 2, 2, 'FD');

  // Punto o círculo indicador de color de podio
  doc.setFillColor(dotColor[0], dotColor[1], dotColor[2]);
  doc.circle(x + 6.5, y + h / 2, 2.4, 'F');

  // Texto del puesto
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  doc.text(label, x + 12.5, y + h / 2 + 2.3);
}

/**
 * Deduplica registros idénticos de concursos para evitar anomalías en el PDF
 */
export function deduplicateConcursoRows(rows) {
  const seen = new Set();
  const result = [];
  rows.forEach(r => {
    const pDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean).sort().join(',');
    const key = [
      (r.tipoConcursoNombre || r.tipoConcursoId || '').toLowerCase(),
      (r.etapa || '').toLowerCase(),
      (r.categoria || '').toLowerCase(),
      (r.genero || '').toLowerCase(),
      (r.disciplina || '').toLowerCase(),
      (r.institucion || '').toLowerCase(),
      (r.codigoModular || '').toLowerCase(),
      (r.puesto || '').toLowerCase(),
      pDnis
    ].join('|');

    if (!seen.has(key)) {
      seen.add(key);
      result.push(r);
    }
  });
  return result;
}

/**
 * Determina el formato oficial de PDF de actas para un concurso.
 * Por defecto es 'tabular' para todos los concursos, excepto 'jfen' que usa 'fichas_por_categoria'.
 * @param {Object} tipoConcurso
 * @returns {'tabular' | 'fichas_por_categoria'}
 */
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

/**
 * Obtiene la paleta de colores oficial diferenciada y de alto contraste por categoría para JFEN.
 * Mantiene la armonía morado/lila/índigo institucional con contraste óptimo para texto blanco (ratio >= 4.5:1).
 * @param {string} categoria
 * @returns {{ bar: number[], altRow: number[], kvLabel: number[] }}
 */
export function colorPorCategoria(categoria) {
  const c = String(categoria || '').trim().toUpperCase();

  // Paleta institucional con tonos oscuros bien diferenciados y alto contraste con texto blanco
  const palette = {
    // Categoría A: Morado berenjena oscuro profundo (#3B1A5B) — ratio > 12:1
    'A': {
      bar: [59, 26, 91],
      altRow: [244, 239, 249], // #F4EFF9
      kvLabel: [238, 230, 246] // #EEE6F6
    },
    // Categoría B: Índigo azulado oscuro (#1E255E) — ratio > 12.5:1
    'B': {
      bar: [30, 37, 94],
      altRow: [238, 241, 250], // #EEF1FA
      kvLabel: [230, 235, 248] // #E6EBF8
    },
    // Categoría C: Violeta cobalto intenso (#581C87) — ratio > 7:1
    'C': {
      bar: [88, 28, 135],
      altRow: [246, 239, 252], // #F6EFFC
      kvLabel: [240, 228, 251] // #F0E4FB
    },
    // Categoría D: Púrpura vino oscuro (#4A154B) — ratio > 10:1
    'D': {
      bar: [74, 21, 75],
      altRow: [247, 238, 248], // #F7EEF8
      kvLabel: [243, 227, 244] // #F3E3F4
    },
    // Categoría E: Índigo medianoche profundo (#1E1B4B) — ratio > 14:1
    'E': {
      bar: [30, 27, 75],
      altRow: [238, 238, 248], // #EEEEF8
      kvLabel: [229, 229, 245] // #E5E5F5
    },
    // Categoría F: Morado real oscuro vibrante (#6B21A8) — ratio > 6:1
    'F': {
      bar: [107, 33, 168],
      altRow: [247, 239, 253], // #F7EFFD
      kvLabel: [242, 228, 252] // #F2E4FC
    },
    // Categoría H: Violeta oscuro abisal (#2E1065) — ratio > 13:1
    'H': {
      bar: [46, 16, 101],
      altRow: [241, 237, 249], // #F1EDF9
      kvLabel: [232, 225, 246] // #E8E1F6
    }
  };

  if (palette[c]) return palette[c];

  for (const key of Object.keys(palette)) {
    if (c.startsWith(key) || c.includes(` ${key}`)) {
      return palette[key];
    }
  }

  // Por defecto (Categorías no mapeadas): Morado institucional oscuro (#4C1D95) — ratio ~8.5:1
  return {
    bar: [76, 29, 149],
    altRow: [244, 239, 250],
    kvLabel: [237, 228, 247]
  };
}

/**
 * Renderizador oficial de Fichas por Categoría y Disciplina para JFEN (Juegos Florales Escolares Nacionales)
 * Formato oficial A4 Vertical con paleta morado/lila, banda de título dinámica, clave-valor institucional,
 * tabla de participantes por estudiante con celda combinada y docente asesor.
 */
export async function exportJfenFichasPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  const jsPDF = getJsPdf();
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4'
  });

  const totalPagesExp = '{total_pages_count_string}';
  const pageW = doc.internal.pageSize.getWidth(); // 595.28 pt
  const pageH = doc.internal.pageSize.getHeight(); // 841.89 pt
  const margin = 36; // ~12.7 mm
  const contentW = pageW - 2 * margin; // 523.28 pt
  const headerBottomY = margin + 34 + 6; // 76 pt

  const concursoNombre = tipoConcurso ? tipoConcurso.nombre : 'Juegos Florales Escolares Nacionales (JFEN)';
  const areaConfig = downloadConfig.areaConfig || null;
  const docVerifCode = downloadConfig.verificationCode || generateVerificationCode();

  // Control para garantizar que el membrete oficial se dibuje una sola vez por página
  const drawnHeaderPages = new Set();
  const safeDrawHeader = (pageNumber) => {
    const p = pageNumber || (doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : 1);
    if (!drawnHeaderPages.has(p)) {
      drawnHeaderPages.add(p);
      return drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
    }
    return headerBottomY + 16;
  };

  // Metadatos oficiales del PDF
  const docMainTitle = getTituloConsolidadoConcurso(tipoConcurso);
  const areaAuthor = (areaConfig && areaConfig.sigla) ? `${areaConfig.sigla} · UGEL 03` : 'UGEL 03 – AGEBRE';
  doc.setProperties({
    title: docMainTitle,
    subject: `${concursoNombre} 2026 – UGEL 03`,
    author: areaAuthor,
    keywords: `${concursoNombre}, 2026, UGEL 03, MINEDU, Ganadores`,
    creator: 'Sistema de Fichas de Monitoreo · UGEL 03'
  });

  // Generar QR si está habilitado
  let qrDataUrl = null;
  if (downloadConfig.incluirQr !== false) {
    const qrPayload = `UGEL 03 - MINEDU\nDoc: ${concursoNombre} 2026\nEmitido: ${getLimaDateStr()}\nCódigo: ${docVerifCode}`;
    qrDataUrl = await generateQrDataUrl(qrPayload);
  }

  // Filtrado y deduplicación preventiva de registros
  let cleanRows = deduplicateConcursoRows(filtered);
  if (downloadConfig.soloPodio === true || downloadConfig.contenidoFiltro === 'solo_podio') {
    cleanRows = cleanRows.filter(r => {
      const rk = puestoRank(r.puesto);
      return rk >= 1 && rk <= 3;
    });
  }

  if (cleanRows.length === 0) {
    throw new Error('No hay registros de ganadores disponibles con los filtros aplicados para generar el PDF.');
  }

  // Criterios unificados de conteo
  const totalFichas = cleanRows.length;
  const uniqueColegios = new Set(cleanRows.map(r => r.codigoModular || r.institucion).filter(Boolean)).size;
  let totalParticipantes = 0;
  cleanRows.forEach(r => { totalParticipantes += (r.participantes || []).length; });
  let totalAsesores = 0;
  cleanRows.forEach(r => { totalAsesores += (r.asesores || []).length; });

  // Etapa
  const etapasPresentes = [...new Set(cleanRows.map(r => r.etapa).filter(Boolean))];
  const etapaLabel = filters.etapa
    ? filters.etapa
    : (etapasPresentes.length === 1 ? etapasPresentes[0] : (etapasPresentes.length > 1 ? etapasPresentes.join(', ') : 'UGEL 03'));

  // Categorías presentes
  const categoriasPresentes = [...new Set(cleanRows.map(r => (r.categoria || '').trim()).filter(Boolean))].sort();
  const catFilterStr = Array.isArray(filters.categoria)
    ? (filters.categoria.length === 1 ? filters.categoria[0] : '')
    : (filters.categoria || '');
  const singleCategory = catFilterStr
    ? catFilterStr.trim()
    : (categoriasPresentes.length === 1 ? categoriasPresentes[0] : null);

  // Disciplinas presentes
  const disciplinasPresentes = [...new Set(cleanRows.map(r => (r.disciplina || '').trim()).filter(Boolean))];
  const singleDisciplina = filters.disciplina
    ? filters.disciplina.trim()
    : (disciplinasPresentes.length === 1 ? disciplinasPresentes[0] : null);

  // 1. Dibujar membrete inicial en página 1
  let curY = safeDrawHeader(1);

  // 2. Banda de título dinámica (Fondo lila claro #E9E1F0, texto negro negrita)
  let titleBandText = docMainTitle;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(11, 27, 54); // #0B1B36

  const splitTitle = doc.splitTextToSize(titleBandText, contentW - 20);
  const bandPaddingY = 6;
  const lineSpacing = 13;
  const bandHeight = (splitTitle.length * lineSpacing) + (bandPaddingY * 2);

  // Rectángulo con fondo lila claro
  doc.setFillColor(233, 225, 240); // #E9E1F0
  doc.setDrawColor(209, 199, 217); // #D1C7D9
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, curY, contentW, bandHeight, 3, 3, 'FD');

  let textY = curY + bandPaddingY + 9.5;
  splitTitle.forEach(line => {
    doc.text(line, pageW / 2, textY, { align: 'center' });
    textY += lineSpacing;
  });
  curY += bandHeight + 6;

  // Filtros aplicados no redundantes (solo los que no estén ya explícitos en el título)
  const remainingFilters = [];
  if (!singleCategory && filters.categoria) {
    const catStr = Array.isArray(filters.categoria) ? filters.categoria.join(', ') : String(filters.categoria);
    if (catStr.trim()) remainingFilters.push(`Categoría: ${catStr.trim()}`);
  }
  if (!singleDisciplina && filters.disciplina) remainingFilters.push(`Disciplina: ${filters.disciplina}`);
  if (filters.query) remainingFilters.push(`Búsqueda: "${filters.query}"`);

  if (remainingFilters.length > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(91, 107, 128);
    doc.text(`Filtros aplicados: ${remainingFilters.join(' · ')}`, pageW / 2, curY, { align: 'center' });
    curY += 10;
  }

  // Párrafo introductorio opcional
  if (downloadConfig.incluirIntro === true) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 27, 45);
    const introText = `En el marco de las bases generales de ${concursoNombre} 2026 promovidos por el Ministerio de Educación y la UGEL 03, se emite la presente nómina oficial de delegaciones e instituciones educativas ganadoras en la Etapa ${etapaLabel}.`;
    const splitIntro = doc.splitTextToSize(introText, contentW);
    doc.text(splitIntro, margin, curY, { maxWidth: contentW, lineHeightFactor: 1.2 });
    curY += splitIntro.length * 10 + 6;
  }

  // Línea de resumen compacta
  if (downloadConfig.incluirResumen !== false) {
    doc.setFillColor(247, 249, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, curY, contentW, 16, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const summaryStr = `${totalFichas} fichas · ${uniqueColegios} instituciones (por código modular) · ${totalParticipantes} participantes · ${totalAsesores} docentes asesores`;
    doc.text(summaryStr, pageW / 2, curY + 11, { align: 'center' });
    curY += 21;
  }

  // Cuadro resumen opcional "Inscripciones por categoría y Arte/Disciplina" si hay más de 1 categoría
  if (downloadConfig.incluirCuadroResumen !== false && categoriasPresentes.length > 1) {
    const catDiscMap = new Map();
    cleanRows.forEach(r => {
      const c = (r.categoria || 'Sin cat.').trim();
      const d = (r.disciplina || 'General').trim();
      const k = `${c}||${d}`;
      if (!catDiscMap.has(k)) {
        catDiscMap.set(k, { categoria: c, disciplina: d, fichas: 0, individual: 0, grupal: 0 });
      }
      const entry = catDiscMap.get(k);
      entry.fichas++;
      if ((r.participantes || []).length <= 1) entry.individual++;
      else entry.grupal++;
    });

    const matrixRows = Array.from(catDiscMap.values())
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.disciplina.localeCompare(b.disciplina))
      .map(m => [
        `Categoría ${m.categoria}`,
        m.disciplina,
        String(m.fichas),
        String(m.individual),
        String(m.grupal)
      ]);

    doc.autoTable({
      head: [['Categoría', 'Arte / Disciplina', 'Fichas', 'Individual', 'Grupal']],
      body: matrixRows,
      startY: curY,
      margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 7,
        cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
        lineColor: [209, 199, 217],
        lineWidth: 0.5,
        textColor: [11, 27, 54]
      },
      headStyles: {
        fillColor: [76, 29, 149], // Morado institucional oscuro #4C1D95
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
        fontSize: 7.5
      },
      alternateRowStyles: {
        fillColor: [247, 249, 252]
      },
      columnStyles: {
        0: { cellWidth: 80, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 263, halign: 'left' },
        2: { cellWidth: 60, halign: 'center' },
        3: { cellWidth: 60, halign: 'center' },
        4: { cellWidth: 60, halign: 'center' }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          safeDrawHeader(data.pageNumber);
        }
      }
    });

    curY = doc.lastAutoTable.finalY + 14;
  }

  // Ordenar fichas por: Categoría (A -> E) -> Arte -> Disciplina -> Puesto (1°, 2°, 3°...) -> Institución
  const sortedFichas = cleanRows.slice().sort((a, b) => {
    const catA = (a.categoria || '').trim();
    const catB = (b.categoria || '').trim();
    const catCmp = catA.localeCompare(catB, 'es', { numeric: true });
    if (catCmp !== 0) return catCmp;

    const discA = (a.disciplina || '').trim();
    const discB = (b.disciplina || '').trim();
    const discCmp = discA.localeCompare(discB, 'es');
    if (discCmp !== 0) return discCmp;

    const rkA = puestoRank(a.puesto);
    const rkB = puestoRank(b.puesto);
    if (rkA !== rkB) return rkA - rkB;

    return (a.institucion || '').localeCompare(b.institucion || '', 'es');
  });

  const mostrarPuesto = downloadConfig.mostrarPuesto !== false;
  const mostrarResolucion = downloadConfig.mostrarResolucion !== false;
  const mostrarModalidad = downloadConfig.mostrarModalidad !== false;
  const ordenParticipantes = downloadConfig.ordenParticipantes || 'alfabetico';
  const iniciarCatPagNueva = downloadConfig.iniciarCadaCategoriaPaginaNueva === true;

  let lastCategory = null;

  for (let i = 0; i < sortedFichas.length; i++) {
    const r = sortedFichas[i];
    const cat = (r.categoria || 'D').trim();
    const catColors = colorPorCategoria(cat);
    const isNewCat = lastCategory !== null && lastCategory !== cat;
    lastCategory = cat;

    if (isNewCat && iniciarCatPagNueva) {
      doc.addPage();
      safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
      curY = headerBottomY + 16;
    }

    const parsedDisc = parseArteDisciplina(r.disciplina);

    // Preparar participantes y ordenarlos
    let rawParts = (r.participantes || []).slice();
    if (ordenParticipantes === 'alfabetico') {
      rawParts.sort((a, b) => {
        const nomA = formatearNombre(a);
        const nomB = formatearNombre(b);
        return nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
      });
    }

    const partCount = Math.max(rawParts.length, 1);
    const asesores = (r.asesores || []).slice();
    const asesCount = Math.max(asesores.length, 1);

    // Cálculo preventivo de altura para empaquetado inteligente sin títulos huérfanos
    const barH = 17;
    let kvRowsCount = 4;
    if (mostrarPuesto && r.puesto) kvRowsCount++;
    if (mostrarResolucion && r.resolucionRef) kvRowsCount++;
    if (mostrarModalidad) kvRowsCount++;
    const kvH = kvRowsCount * 13.5;
    const partHeadH = 14.5;
    const minStudentRows = Math.min(partCount, 3);
    const minFichaRowsH = barH + kvH + partHeadH + (minStudentRows * 13.5);

    if (curY + minFichaRowsH > (pageH - 42)) {
      doc.addPage();
      safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
      curY = headerBottomY + 16;
    }

    // 1. Bloque Clave-Valor institucional indivisible (con barra de categoría al inicio)
    const kvBody = [];
    kvBody.push([
      {
        content: `CATEGORÍA ${cat.toUpperCase()}`,
        colSpan: 3,
        styles: {
          fillColor: catColors.bar,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8.5,
          minCellHeight: 17
        }
      }
    ]);

    kvBody.push([
      { content: 'Institución Educativa', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'left' } },
      { content: (r.institucion || '—').toUpperCase(), colSpan: 2, styles: { fontStyle: 'bold', textColor: [11, 27, 54] } }
    ]);

    kvBody.push([
      { content: 'Código Modular', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'left' } },
      { content: formatCodigoModular(r.codigoModular), colSpan: 2 }
    ]);

    kvBody.push([
      { content: 'Arte', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'left' } },
      { content: parsedDisc.arte, colSpan: 2, styles: { fontStyle: 'bold', textColor: [11, 27, 54] } }
    ]);

    kvBody.push([
      { content: 'Disciplina', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'left' } },
      { content: parsedDisc.disciplina, colSpan: 2, styles: { fontStyle: 'bold', textColor: [11, 27, 54] } }
    ]);

    if (mostrarPuesto && r.puesto) {
      kvBody.push([
        { content: 'Puesto', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'left' } },
        { content: formatPuestoLabel(r.puesto), colSpan: 2, styles: { fontStyle: 'bold' } }
      ]);
    }

    if (mostrarResolucion && r.resolucionRef) {
      kvBody.push([
        { content: 'Resolución', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'left' } },
        { content: formatResolucionRef(r.resolucionRef), colSpan: 2 }
      ]);
    }

    if (mostrarModalidad) {
      const modLabel = (r.participantes || []).length > 1
        ? `Grupal · ${(r.participantes || []).length} integrantes`
        : 'Individual · 1 integrante';
      kvBody.push([
        { content: 'Modalidad', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'left' } },
        { content: modLabel, colSpan: 2 }
      ]);
    }

    doc.autoTable({
      body: kvBody,
      startY: curY,
      margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
      theme: 'plain',
      tableWidth: contentW,
      styles: {
        font: 'helvetica',
        fontSize: 7.5,
        cellPadding: { top: 3.2, bottom: 3.2, left: 5, right: 5 },
        lineColor: [209, 199, 217],
        lineWidth: 0.5,
        textColor: [11, 27, 54],
        overflow: 'linebreak',
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 118, fontStyle: 'bold' },
        1: { cellWidth: 335 },
        2: { cellWidth: 70.28, halign: 'center' }
      },
      rowPageBreak: 'avoid',
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          safeDrawHeader(data.pageNumber);
        }
      }
    });

    curY = doc.lastAutoTable.finalY;

    // 2. Preparar lista unificada de integrantes para partición continua limpia
    const itemsToRender = [];
    if (rawParts.length === 0) {
      itemsToRender.push({ isStudent: true, emptyStudent: true });
    } else {
      rawParts.forEach((p, idx) => {
        itemsToRender.push({ isStudent: true, emptyStudent: false, data: p, idx });
      });
    }

    if (asesores.length === 0) {
      itemsToRender.push({ isAsesor: true, emptyAsesor: true });
    } else {
      asesores.forEach((a, idx) => {
        itemsToRender.push({ isAsesor: true, emptyAsesor: false, data: a, idx });
      });
    }

    // 3. Renderizado continuo por tramos
    let startIdx = 0;
    let isContinuation = false;

    while (startIdx < itemsToRender.length) {
      const remainingRows = itemsToRender.length - startIdx;
      const availSpace = (pageH - 42) - curY - 14.5;
      let rowsInChunk = Math.floor(availSpace / 13.5);

      if (rowsInChunk >= remainingRows) {
        rowsInChunk = remainingRows;
      } else {
        // Regla antiviuda: no dejar exactamente 1 fila aislada en la página siguiente
        if ((remainingRows - rowsInChunk) === 1 && rowsInChunk > 2) {
          rowsInChunk--;
        }
        if (rowsInChunk < 2 && curY > (headerBottomY + 30)) {
          doc.addPage();
          safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
          curY = headerBottomY + 16;
          isContinuation = true;
          continue;
        }
        rowsInChunk = Math.max(1, rowsInChunk);
      }

      const chunkSlice = itemsToRender.slice(startIdx, startIdx + rowsInChunk);

      if (isContinuation) {
        // Barra de continuación con paleta de categoría JFEN
        const contBar = [[{
          content: `CATEGORÍA ${cat.toUpperCase()} (continuación)`,
          colSpan: 3,
          styles: {
            fillColor: catColors.bar,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center',
            valign: 'middle',
            fontSize: 8.5,
            minCellHeight: 17
          }
        }]];
        doc.autoTable({
          body: contBar,
          startY: curY,
          margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
          theme: 'plain',
          tableWidth: contentW,
          columnStyles: {
            0: { cellWidth: 118 },
            1: { cellWidth: 335 },
            2: { cellWidth: 70.28 }
          },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) safeDrawHeader(data.pageNumber);
          }
        });
        curY = doc.lastAutoTable.finalY;
      }

      const chunkBody = [];
      const chunkStudents = chunkSlice.filter(it => it.isStudent);
      const studentLabel = rawParts.length > 1 ? `Estudiantes (${rawParts.length})` : 'Estudiante';
      let studentIdxInChunk = 0;

      chunkSlice.forEach(it => {
        if (it.isStudent) {
          if (it.emptyStudent) {
            chunkBody.push([
              { content: 'Estudiante', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
              { content: 'Sin participante registrado', styles: { fontStyle: 'italic', textColor: [138, 151, 168] } },
              { content: '—', styles: { halign: 'center' } }
            ]);
          } else {
            const pIdx = it.idx;
            const rowBg = pIdx % 2 === 0 ? catColors.altRow : [255, 255, 255];
            const studentName = formatearNombre(it.data);
            const studentDni = it.data.dni ? String(it.data.dni).trim() : '—';

            if (studentIdxInChunk === 0) {
              chunkBody.push([
                {
                  content: studentLabel,
                  rowSpan: chunkStudents.length,
                  styles: {
                    fillColor: catColors.kvLabel,
                    fontStyle: 'bold',
                    halign: 'center',
                    valign: 'middle',
                    textColor: [11, 27, 54]
                  }
                },
                { content: studentName, styles: { fillColor: rowBg, halign: 'left' } },
                { content: studentDni, styles: { fillColor: rowBg, halign: 'center' } }
              ]);
            } else {
              chunkBody.push([
                { content: studentName, styles: { fillColor: rowBg, halign: 'left' } },
                { content: studentDni, styles: { fillColor: rowBg, halign: 'center' } }
              ]);
            }
            studentIdxInChunk++;
          }
        } else if (it.isAsesor) {
          if (it.emptyAsesor) {
            chunkBody.push([
              { content: 'Docente Asesor', styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
              { content: 'Sin docente asesor registrado', colSpan: 2, styles: { fontStyle: 'italic', textColor: [138, 151, 168] } }
            ]);
          } else {
            const a = it.data;
            const rolLabel = a.rol || 'Docente Asesor';
            const asesorName = formatearNombre(a);
            const asesorDni = a.dni ? String(a.dni).trim() : '—';
            chunkBody.push([
              { content: rolLabel, styles: { fillColor: catColors.kvLabel, fontStyle: 'bold', halign: 'center', valign: 'middle' } },
              { content: asesorName, styles: { fontStyle: 'normal', halign: 'left' } },
              { content: asesorDni, styles: { halign: 'center' } }
            ]);
          }
        }
      });

      doc.autoTable({
        head: [['PARTICIPANTES', 'APELLIDOS Y NOMBRES', 'DNI']],
        body: chunkBody,
        startY: curY,
        margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
        theme: 'plain',
        tableWidth: contentW,
        styles: {
          font: 'helvetica',
          fontSize: 7.5,
          cellPadding: { top: 3.2, bottom: 3.2, left: 5, right: 5 },
          lineColor: [209, 199, 217],
          lineWidth: 0.5,
          textColor: [11, 27, 54],
          overflow: 'linebreak',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [71, 85, 105],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 }
        },
        columnStyles: {
          0: { cellWidth: 118, fontStyle: 'bold', halign: 'center' },
          1: { cellWidth: 335, halign: 'left' },
          2: { cellWidth: 70.28, halign: 'center' }
        },
        rowPageBreak: 'avoid',
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            safeDrawHeader(data.pageNumber);
          }
        }
      });

      curY = doc.lastAutoTable.finalY;
      startIdx += rowsInChunk;

      if (startIdx < itemsToRender.length) {
        doc.addPage();
        safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
        curY = headerBottomY + 16;
        isContinuation = true;
      }
    }

    curY += 12; // Separación fija entre fichas
  }

  // 4. Bloque de firmas oficial (keep-together)
  const defaultSignatures = [
    { cargo: `Coordinador(a) ${concursoNombre} 2026`, entidad: 'Comisión Organizadora UGEL 03', leyenda: 'Firma y Sello' },
    { cargo: 'Especialista de AGEBRE / Jurado', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'V.° B.° Jefatura AGEBRE', entidad: 'UGEL 03', leyenda: 'Sello Institucional' }
  ];
  const signatures = downloadConfig.signatures || defaultSignatures;
  const sinFirmas = downloadConfig.sinFirmas === true;

  if (!sinFirmas && signatures && signatures.length > 0) {
    const sigCount = Math.min(signatures.length, 6);
    const isTwoRows = sigCount >= 5;
    const rowsCount = isTwoRows ? 2 : 1;
    const rowHeight = 65;
    const lugarFecha = downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`;
    const sigBlockHeight = (lugarFecha ? 18 : 0) + (rowsCount * rowHeight) + 12;

    if (curY + sigBlockHeight > pageH - 42) {
      doc.addPage();
      safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
      curY = headerBottomY + 18;
    } else {
      curY += 8;
    }

    if (lugarFecha) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(91, 107, 128);
      doc.text(lugarFecha, margin, curY);
      curY += 15;
    }

    const drawRow = (rowSignatures, startY) => {
      const count = rowSignatures.length;
      const totalW = contentW;
      let colW, gap, startX;
      if (count === 1) {
        colW = 220;
        gap = 0;
        startX = margin + (totalW - colW) / 2;
      } else {
        gap = count === 2 ? 40 : 20;
        colW = (totalW - gap * (count - 1)) / count;
        startX = margin;
      }

      rowSignatures.forEach((sig, idx) => {
        const x = startX + idx * (colW + gap);
        const lineSigY = startY + 36;

        doc.setDrawColor(138, 151, 168);
        doc.setLineWidth(0.5);
        doc.line(x + 10, lineSigY, x + colW - 10, lineSigY);

        let textY = lineSigY + 9;

        if (sig.nombre) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(11, 27, 54);
          doc.text(formatearNombre(sig.nombre), x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
          textY += 9;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(11, 27, 54);
        const splitCargo = doc.splitTextToSize(sig.cargo || 'Responsable', colW - 10);
        doc.text(splitCargo, x + colW / 2, textY, { align: 'center' });
        textY += splitCargo.length * 8.5;

        if (sig.entidad || sig.institucion) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(91, 107, 128);
          doc.text(sig.entidad || sig.institucion, x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
          textY += 8;
        }

        if (sig.leyenda) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6);
          doc.setTextColor(138, 151, 168);
          doc.text(sig.leyenda, x + colW / 2, textY, { align: 'center' });
        }
      });
    };

    if (isTwoRows) {
      const firstRow = signatures.slice(0, 3);
      const secondRow = signatures.slice(3, 6);
      drawRow(firstRow, curY);
      drawRow(secondRow, curY + rowHeight);
      curY += rowHeight * 2;
    } else {
      drawRow(signatures.slice(0, 4), curY);
      curY += rowHeight;
    }
  }

  // 5. Pie de página en todas las hojas (garantizando membrete oficial previo en cada una)
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    if (!drawnHeaderPages.has(i)) {
      doc.setPage(i);
      drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
      drawnHeaderPages.add(i);
    }
  }

  const emissionStr = getCurrentDateTimeStr();

  const faltantesJfen = downloadConfig.datosIncompletos ? ['Documento con datos por completar'] : [];
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    dibujarPiePagina(doc, {
      pageNumber: i,
      totalPagesExp,
      margin,
      pageW,
      pageH,
      emissionStr,
      docVerifCode,
      faltantes: faltantesJfen,
      qrDataUrl,
      isLastPage: (i === pageCount),
      marcaBorrador: downloadConfig.marcaBorrador
    });
  }

  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  const cleanEtapaStr = sanitizeFilename(etapaLabel || 'UGEL');
  const cleanCatStr = singleCategory ? `_${sanitizeFilename(singleCategory)}` : '';
  const cleanDateStr = getLimaDateStr();
  const cleanConcursoPrefix = sanitizeFilename(tipoConcurso?.id ? tipoConcurso.id.toUpperCase() : 'JFEN');
  const filename = downloadConfig.filename || `Consolidado_Actas_${cleanConcursoPrefix}_${cleanEtapaStr}${cleanCatStr}_${cleanDateStr}.pdf`;

  doc.save(filename);
}

/**
 * Exporta el Acta Oficial de Resultados de JEDPA para Disciplinas Colectivas (Grupales)
 * en formato FICHA POR EQUIPO/INSTITUCIÓN (A4 Vertical/Portrait).
 * - Mantiene con estricta fidelidad la paleta oficial de JEDPA (sin colores morados de JFEN).
 * - Una ficha por equipo con bloque de datos y tabla de integrantes numerados alfabéticamente.
 * - Celda "Estudiantes (N)" combinada con rowSpan en la columna Condición.
 * - Nombre y DNI en la misma fila sin saltos de línea.
 * - Fila de Cuerpo Técnico al final con fondo suave dorado (#FDF6E3) y línea separadora dorada (#E0A626).
 * - Franja de grupo con texto exacto "X equipo(s) · Y estudiantes".
 * - Paginación inteligente: ninguna ficha se corta entre páginas.
 */
export async function exportJedpaFichasPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  const jsPDF = getJsPdf();
  const orientation = downloadConfig.orientation === 'landscape' ? 'landscape' : 'portrait';
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'pt',
    format: 'a4'
  });

  const totalPagesExp = '{total_pages_count_string}';
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentW = pageW - 2 * margin;
  const headerBottomY = margin + 34 + 6;

  const concursoCfg = getConcursoConfig(tipoConcurso);
  const isJedpa = (concursoCfg.id === 'jedpa' || (tipoConcurso && (tipoConcurso.id === 'jedpa' || (tipoConcurso.nombre || '').toUpperCase().includes('JEDPA'))));
  const concursoNombre = tipoConcurso ? tipoConcurso.nombre : (isJedpa ? 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)' : 'CONCURSOS EDUCATIVOS ESCOLARES');
  const areaConfig = downloadConfig.areaConfig || null;
  const docVerifCode = downloadConfig.verificationCode || generateVerificationCode();

  const drawnHeaderPages = new Set();
  const safeDrawHeader = (pageNumber) => {
    const p = pageNumber || (doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : 1);
    if (!drawnHeaderPages.has(p)) {
      drawnHeaderPages.add(p);
      return drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
    }
    return headerBottomY + 16;
  };

  let cleanRows = deduplicateConcursoRows(filtered);
  if (downloadConfig.soloPodio === true || downloadConfig.contenidoFiltro === 'solo_podio') {
    cleanRows = cleanRows.filter(r => {
      const rk = puestoRank(r.puesto);
      return rk >= 1 && rk <= 3;
    });
  }

  if (cleanRows.length === 0) {
    throw new Error('No hay registros de delegaciones disponibles con los filtros aplicados para generar el Acta PDF.');
  }

  const etapasPresentes = [...new Set(cleanRows.map(r => r.etapa).filter(Boolean))];
  const etapaLabel = filters.etapa
    ? filters.etapa
    : (etapasPresentes.length === 1 ? etapasPresentes[0] : (etapasPresentes.length > 1 ? etapasPresentes.join(', ') : 'UGEL'));

  const areaAuthor = (areaConfig && areaConfig.sigla) ? `${areaConfig.sigla} · UGEL 03` : 'UGEL 03 – AGEBRE';
  const yaTieneAnio = (concursoNombre || '').includes('2026');
  const subjectStr = yaTieneAnio ? `${concursoNombre} – UGEL 03` : `${concursoNombre} 2026 – UGEL 03`;
  const kwList = [concursoNombre, '2026', 'UGEL 03', 'MINEDU', 'Ganadores'];
  if (etapaLabel) kwList.push(`Etapa ${etapaLabel}`);
  if (isJedpa) {
    kwList.push('JEDPA', 'Disciplinas Colectivas');
  }
  const keywordsStr = kwList.filter(Boolean).join(', ');

  const docMainTitle = getTituloConsolidadoConcurso(tipoConcurso);
  doc.setProperties({
    title: docMainTitle,
    subject: subjectStr,
    author: areaAuthor,
    keywords: keywordsStr,
    creator: 'Sistema de Fichas de Monitoreo · UGEL 03'
  });

  let qrDataUrl = null;
  if (downloadConfig.incluirQr !== false) {
    const qrPayload = `UGEL 03 - MINEDU\nDoc: ${concursoNombre.slice(0, 60)} 2026\nEmitido: ${getLimaDateStr()}\nCódigo: ${docVerifCode}`;
    qrDataUrl = await generateQrDataUrl(qrPayload);
  }

  const totalEquipos = cleanRows.length;
  const uniqueColegios = new Set(cleanRows.map(r => formatCodigoModular(r.codigoModular) || r.institucion).filter(Boolean)).size;

  const uniqueStudents = new Set();
  cleanRows.forEach(r => {
    (r.participantes || []).forEach(p => {
      const k = p.dni ? String(p.dni).trim() : `${p.apellidos || ''}|${p.nombres || ''}`.trim().toLowerCase();
      if (k) uniqueStudents.add(k);
    });
  });
  const totalEstudiantes = uniqueStudents.size;

  const uniqueTecnicos = new Set();
  cleanRows.forEach(r => {
    const ct = obtenerCuerpoTecnicoDeEquipo(r, downloadConfig.state);
    ct.forEach(a => {
      const k = a.dni ? String(a.dni).trim() : `${a.apellidos || ''}|${a.nombres || ''}`.trim().toLowerCase();
      if (k) uniqueTecnicos.add(k);
    });
  });
  const totalTecnicos = uniqueTecnicos.size;

  // 1. Membrete oficial en pág 1
  let curY = safeDrawHeader(1);

  // Línea superior azul marino #12294C
  doc.setDrawColor(18, 41, 76);
  doc.setLineWidth(1.5);
  doc.line(margin, curY, pageW - margin, curY);
  curY += 10;

  // 2. Título principal #0B1B36
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(11, 27, 54);
  const mainTitle = docMainTitle;
  const splitTitle = doc.splitTextToSize(mainTitle, contentW - 10);
  doc.text(splitTitle, pageW / 2, curY, { align: 'center' });
  curY += splitTitle.length * 13 + 3;

  // 3. Subtítulo oficial dorado #B7791F con filtros
  const subtituloFiltros = formatearFiltrosSubtitulo(filters, etapaLabel);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(183, 121, 31);
  const splitSub = doc.splitTextToSize(subtituloFiltros, contentW - 10);
  doc.text(splitSub, pageW / 2, curY, { align: 'center' });
  curY += splitSub.length * 11 + 6;

  // 4. Párrafo introductorio
  if (downloadConfig.incluirIntro !== false) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(95, 106, 123); // #5F6A7B
    const introText = isJedpa
      ? `En el marco de las bases generales de los Juegos Escolares Deportivos y Paradeportivos (JEDPA) 2026 promovidos por el Ministerio de Educación y la UGEL 03, se emite la presente Acta Oficial de Resultados y Premiaciones para la Etapa ${etapaLabel}. Se consolidan a continuación los equipos ganadores, delegaciones y cuerpo técnico reconocidos institucionalmente.`
      : `En el marco de las bases generales de los Concursos Educativos Escolares 2026 promovidos por el Ministerio de Educación y la UGEL 03, se emite la presente Acta Oficial de Resultados y Premiaciones para ${concursoNombre} en la Etapa ${etapaLabel}. Se consolidan a continuación los equipos, delegaciones y estudiantes ganadores reconocidos institucionalmente.`;
    const splitIntro = doc.splitTextToSize(introText, contentW);
    doc.text(splitIntro, margin, curY, { maxWidth: contentW, lineHeightFactor: 1.15 });
    curY += splitIntro.length * 9 + 6;
  }

  // 5. Caja de indicadores KPI (#F7FAFC con borde #D9E1EA)
  const kpiBoxH = 28;
  doc.setFillColor(247, 250, 252);
  doc.setDrawColor(217, 225, 234);
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, curY, contentW, kpiBoxH, 3, 3, 'FD');

  const asesorLabel = isJedpa ? 'Cuerpo Técnico' : (concursoCfg.etiqueta_asesor_plural || 'Docentes Asesores');
  const teamLabel = isJedpa ? 'Equipos' : 'Equipos / Grupos';
  const fullContestName = tipoConcurso ? (tipoConcurso.nombreCorto || tipoConcurso.nombre) : 'MINEDU';

  const kpis = [
    { label: 'Concurso Educativo', value: fullContestName, wRatio: 0.22, isContestName: true },
    { label: 'Etapa', value: etapaLabel, wRatio: 0.12 },
    { label: teamLabel, value: `${totalEquipos}`, wRatio: 0.13 },
    { label: 'Estudiantes', value: `${totalEstudiantes}`, wRatio: 0.14 },
    { label: 'Instituciones', value: `${uniqueColegios}`, wRatio: 0.16 },
    { label: asesorLabel, value: `${totalTecnicos} pers.`, wRatio: 0.23 }
  ];

  let kpiX = margin;
  kpis.forEach((k, idx) => {
    const kw = contentW * k.wRatio;
    if (idx > 0) {
      doc.setDrawColor(217, 225, 234);
      doc.setLineWidth(0.5);
      doc.line(kpiX, curY + 4, kpiX, curY + kpiBoxH - 4);
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(95, 106, 123);
    doc.text(k.label, kpiX + kw / 2, curY + 9, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    if (k.isContestName) {
      doc.setTextColor(11, 27, 54);
      const testSize = doc.getTextWidth(k.value);
      if (testSize > (kw - 6)) {
        doc.setFontSize(6.5);
        const splitVal = doc.splitTextToSize(k.value, kw - 4);
        if (splitVal.length > 1) {
          doc.text(splitVal.slice(0, 2), kpiX + kw / 2, curY + 18, { align: 'center', lineHeightFactor: 1.05 });
        } else {
          doc.text(k.value, kpiX + kw / 2, curY + 21, { align: 'center' });
        }
      } else {
        doc.setFontSize(7.5);
        doc.text(k.value, kpiX + kw / 2, curY + 21, { align: 'center' });
      }
    } else {
      doc.setFontSize(8);
      doc.setTextColor(11, 27, 54);
      doc.text(k.value, kpiX + kw / 2, curY + 21, { align: 'center' });
    }

    kpiX += kw;
  });

  curY += kpiBoxH + 12;

  // 6. Agrupar registros por Grupo de Competencia
  const hasDiscConfig = (tipoConcurso ? tipoConcurso.tieneDisciplina === true : isJedpa);
  const hasGenConfig = ((tipoConcurso && tipoConcurso.tieneGenero === true) || isJedpa);

  const groupMap = new Map();
  cleanRows.forEach(r => {
    const et = (r.etapa || 'UGEL').trim().toUpperCase();
    const rawDisc = (r.disciplina || '').trim().toUpperCase();
    const isGenericDisc = !rawDisc || rawDisc === '—' || rawDisc === 'GENERAL' || rawDisc === 'SIN DISCIPLINA';
    const di = (hasDiscConfig && !isGenericDisc) ? rawDisc : '';

    const caRaw = (r.categoria || 'A').trim().toUpperCase().replace(/^CATEGOR[ÍI]A\s+/i, '');
    const ca = caRaw || 'A';

    const rawGen = formatGeneroDisplay(r.genero).trim().toUpperCase();
    const isGenericGen = !rawGen || rawGen === '—' || rawGen === 'SIN GÉNERO';
    const ge = (hasGenConfig && !isGenericGen) ? rawGen : '';

    const catPart = `CATEGORÍA ${ca}`;
    const gKeyParts = [catPart];
    if (di) gKeyParts.push(di);
    if (ge) gKeyParts.push(ge);

    const groupKey = gKeyParts.join(' · ');
    const fullGroupKey = `${et} · ${groupKey}`;

    if (!groupMap.has(fullGroupKey)) {
      groupMap.set(fullGroupKey, {
        groupKey: groupKey,
        fullGroupKey: fullGroupKey,
        etapa: et,
        disciplina: di,
        categoria: ca,
        genero: ge,
        records: []
      });
    }
    groupMap.get(fullGroupKey).records.push(r);
  });

  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => a.fullGroupKey.localeCompare(b.fullGroupKey));

  // 7. Renderizado de fichas por cada grupo con flujo continuo
  for (const group of sortedGroups) {
    // Ordenar equipos del grupo por puesto (1°, 2°, 3°...) y luego alfabético
    group.records.sort((a, b) => {
      const rkA = puestoRank(a.puesto);
      const rkB = puestoRank(b.puesto);
      if (rkA !== rkB) return rkA - rkB;
      return (a.institucion || '').localeCompare(b.institucion || '', 'es');
    });

    const groupTeamsCount = group.records.length;
    const groupStudentsCount = group.records.reduce((acc, r) => acc + (r.participantes || []).length, 0);
    const bandH = 18;

    // Dibujar fichas de equipos del grupo con flujo continuo
    for (let rIdx = 0; rIdx < group.records.length; rIdx++) {
      const r = group.records[rIdx];

      // Ordenar estudiantes alfabéticamente
      const rawParts = (r.participantes || []).slice().sort((a, b) => {
        const nomA = `${a.apellidos || ''} ${a.nombres || ''}`.trim();
        const nomB = `${b.apellidos || ''} ${b.nombres || ''}`.trim();
        return nomA.localeCompare(nomB, 'es', { sensitivity: 'base' });
      });

      const ctEquipo = obtenerCuerpoTecnicoDeEquipo(r, downloadConfig.state);

      // Filas dinámicas según configuración y datos reales
      const kvRows = construirFilasFicha(tipoConcurso, r, {
        mostrarModalidad: downloadConfig.mostrarModalidad !== false && !!r.modalidad
      });

      // a) Barra de encabezado de la ficha: CATEGORÍA {X} · {PUESTO} (y podio si aplica)
      const podioFields = getPodioFields(tipoConcurso);
      const catPartFicha = `CATEGORÍA ${(r.categoria || group.categoria || 'A').toUpperCase().replace(/^CATEGOR[ÍI]A\s+/i, '')}`;
      const titleParts = [catPartFicha];

      if (podioFields.includes('disciplina') && (r.disciplina || group.disciplina)) {
        const dVal = (r.disciplina || group.disciplina).trim().toUpperCase();
        if (dVal && dVal !== 'GENERAL' && dVal !== 'SIN DISCIPLINA' && dVal !== '—') {
          titleParts.push(dVal);
        }
      }

      if (podioFields.includes('genero') && r.genero) {
        const gVal = formatGeneroDisplay(r.genero).trim().toUpperCase();
        if (gVal && gVal !== 'SIN GÉNERO' && gVal !== '—') {
          titleParts.push(gVal);
        }
      }

      const pLabel = formatPuestoLabel(r.puesto);
      if (pLabel && pLabel !== '—') {
        titleParts.push(pLabel.toUpperCase());
      }

      const fichaTitle = titleParts.join('  ·  ');

      // Reglas contra huérfanos:
      // Si es el primer equipo del grupo, el bloque mínimo incluye:
      // Franja de grupo (18 + 8) + Ficha Header (16) + Filas KV (kvRows.length * 13.5) + Encabezado de tabla (14.5) + 3 filas de participantes (3 * 13.5 = 40.5)
      const minFichaRowsH = 16 + (kvRows.length * 13.5) + 14.5 + 40.5;
      const estimatedFichaH = minFichaRowsH;
      const isFirstOfGroup = (rIdx === 0);
      const minNeededToStart = isFirstOfGroup ? (bandH + 8 + estimatedFichaH) : estimatedFichaH;

      if (curY + minNeededToStart > (pageH - 42)) {
        doc.addPage();
        safeDrawHeader(doc.internal.getNumberOfPages());
        curY = headerBottomY + 16;
      }

      // Si es el primer equipo del grupo, dibujar franja de grupo (#2E4A73 con acento dorado #E0A626)
      if (isFirstOfGroup) {
        doc.setFillColor(224, 166, 38); // Acento izquierdo #E0A626
        doc.rect(margin, curY, 4, bandH, 'F');

        doc.setFillColor(46, 74, 115); // Fondo azul pizarra #2E4A73
        doc.rect(margin + 4, curY, contentW - 4, bandH, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(255, 255, 255);
        doc.text(group.groupKey, margin + 12, curY + 12);

        const teamUnitName = isJedpa ? 'equipo' : 'equipo / grupo';
        const teamUnitPlural = isJedpa ? 'equipos' : 'equipos / grupos';
        const groupCountLabel = `${groupTeamsCount} ${groupTeamsCount === 1 ? teamUnitName : teamUnitPlural} · ${groupStudentsCount} estudiante${groupStudentsCount === 1 ? '' : 's'}`;
        doc.text(groupCountLabel, pageW - margin - 8, curY + 12, { align: 'right' });
        curY += bandH + 8;
      }

      // Preparar Bloque Clave-Valor indivisible
      const colW0 = 127;
      const colW1 = 30;
      const colW2 = 271;
      const colW3 = 95.28;

      const kvBody = [
        [
          {
            content: fichaTitle,
            colSpan: 4,
            styles: {
              fillColor: [18, 41, 76], // #12294C Azul marino estándar institucional
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              fontSize: 8.5,
              minCellHeight: 16
            }
          }
        ]
      ];

      kvRows.forEach(row => {
        kvBody.push([
          {
            content: row.label,
            colSpan: 2,
            styles: {
              fillColor: [237, 242, 245], // #EDF2F5 Gris claro institucional
              fontStyle: 'bold',
              textColor: [11, 27, 54]
            }
          },
          {
            content: row.value,
            colSpan: 2,
            _isPuestoCell: !!row.isPuesto,
            _puestoRank: row.puestoRank,
            styles: {
              fontStyle: row.isBold ? 'bold' : (row.isItalic ? 'italic' : 'normal'),
              textColor: row.isMuted ? [148, 163, 184] : [11, 27, 54]
            }
          }
        ]);
      });

      doc.autoTable({
        body: kvBody,
        startY: curY,
        margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
        theme: 'plain',
        rowPageBreak: 'avoid',
        styles: {
          font: 'helvetica',
          fontSize: 7.2,
          cellPadding: { top: 2.4, bottom: 2.4, left: 4, right: 4 },
          lineColor: [217, 225, 234], // #D9E1EA
          lineWidth: 0.5,
          textColor: [11, 27, 54]
        },
        columnStyles: {
          0: { cellWidth: colW0 },
          1: { cellWidth: colW1 },
          2: { cellWidth: colW2 },
          3: { cellWidth: colW3 }
        },
        didParseCell: (data) => {
          if (data.cell.raw && data.cell.raw._isPuestoCell) {
            data.cell.text = [''];
          }
        },
        didDrawCell: (data) => {
          if (data.cell.raw && data.cell.raw._isPuestoCell) {
            const badgeX = data.cell.x + 6;
            const badgeY = data.cell.y + (data.cell.height - 12) / 2;
            dibujarInsigniaPuesto(doc, data.cell.raw.content, badgeX, badgeY, 84, 12);
          }
        }
      });

      curY = doc.lastAutoTable.finalY;

      // Preparar lista unificada de integrantes (estudiantes y cuerpo técnico)
      const itemsToRender = [];
      if (rawParts.length === 0) {
        itemsToRender.push({
          isStudent: true,
          studentIndex: 0,
          studentTotal: 0,
          emptyStudent: true,
          fullName: 'Sin estudiantes registrados en este equipo',
          dni: '—'
        });
      } else {
        rawParts.forEach((p, idx) => {
          const ape = (p.apellidos || '').trim().toUpperCase();
          const nom = (p.nombres || '').trim().toUpperCase();
          const fullName = `${ape}${ape && nom ? ', ' : ''}${nom}`.replace(/\s{2,}/g, ' ') || '—';
          const dni = String(p.dni || '—').trim();
          itemsToRender.push({
            isStudent: true,
            studentIndex: idx,
            studentTotal: rawParts.length,
            emptyStudent: false,
            fullName,
            dni
          });
        });
      }

      const defaultRolAsesor = isJedpa ? 'Cuerpo Técnico' : (concursoCfg.etiqueta_asesor_plural || 'Docente Asesor');
      if (ctEquipo.length === 0) {
        itemsToRender.push({
          isCoach: true,
          coachIndex: 0,
          emptyCoach: true,
          rolName: defaultRolAsesor,
          fullName: `Sin ${defaultRolAsesor.toLowerCase()} registrado`,
          dni: '—',
          isCoachStart: true
        });
      } else {
        ctEquipo.forEach((a, aIdx) => {
          const rolName = (a.rol || defaultRolAsesor).trim();
          const fullName = `${(a.apellidos || '').toUpperCase()} ${(a.nombres || '').toUpperCase()}`.trim().replace(/\s{2,}/g, ' ');
          const dni = String(a.dni || '—').trim();
          itemsToRender.push({
            isCoach: true,
            coachIndex: aIdx,
            emptyCoach: false,
            rolName,
            fullName: fullName || '—',
            dni,
            isCoachStart: (aIdx === 0)
          });
        });
      }

      // Renderizado continuo por tramos de la tabla de integrantes
      let startIdx = 0;
      let isContinuation = false;

      while (startIdx < itemsToRender.length) {
        const remainingRows = itemsToRender.length - startIdx;
        const availSpace = (pageH - 42) - curY - 14.5;
        let rowsInChunk = Math.floor(availSpace / 13.5);

        if (rowsInChunk >= remainingRows) {
          rowsInChunk = remainingRows;
        } else {
          // Regla de viuda: no dejar exactamente 1 fila aislada en la página siguiente
          if ((remainingRows - rowsInChunk) === 1 && rowsInChunk > 2) {
            rowsInChunk--;
          }
          if (rowsInChunk < 2 && curY > (headerBottomY + 30)) {
            doc.addPage();
            safeDrawHeader(doc.internal.getNumberOfPages());
            curY = headerBottomY + 16;
            isContinuation = true;
            continue;
          }
          rowsInChunk = Math.max(1, rowsInChunk);
        }

        const chunkSlice = itemsToRender.slice(startIdx, startIdx + rowsInChunk);

        if (isContinuation) {
          doc.setFillColor(18, 41, 76);
          doc.rect(margin, curY, contentW, 16, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(255, 255, 255);
          doc.text(`${fichaTitle} (continuación)`, pageW / 2, curY + 11, { align: 'center' });
          curY += 16;
        }

        const chunkStudents = chunkSlice.filter(it => it.isStudent);
        const chunkBody = [];

        chunkSlice.forEach((it, sIdx) => {
          if (it.isStudent) {
            if (it.emptyStudent) {
              chunkBody.push([
                { content: 'Estudiantes', styles: { fillColor: [237, 242, 245], fontStyle: 'bold', halign: 'center', valign: 'middle' } },
                { content: '—', styles: { halign: 'center' } },
                { content: it.fullName, colSpan: 2, styles: { fontStyle: 'italic', textColor: [148, 163, 184] } }
              ]);
            } else {
              const studentLabel = it.studentTotal > 1 ? `Estudiantes (${it.studentTotal})` : 'Estudiante';
              const rowBg = it.studentIndex % 2 === 0 ? [247, 250, 252] : [255, 255, 255];

              if (sIdx === 0) {
                chunkBody.push([
                  {
                    content: studentLabel,
                    rowSpan: chunkStudents.length,
                    styles: {
                      fillColor: [237, 242, 245],
                      fontStyle: 'bold',
                      halign: 'center',
                      valign: 'middle',
                      textColor: [18, 41, 76]
                    }
                  },
                  { content: String(it.studentIndex + 1), styles: { fillColor: rowBg, halign: 'center' } },
                  { content: it.fullName, styles: { fillColor: rowBg, halign: 'left' } },
                  { content: it.dni, styles: { fillColor: rowBg, halign: 'center' } }
                ]);
              } else {
                chunkBody.push([
                  { content: String(it.studentIndex + 1), styles: { fillColor: rowBg, halign: 'center' } },
                  { content: it.fullName, styles: { fillColor: rowBg, halign: 'left' } },
                  { content: it.dni, styles: { fillColor: rowBg, halign: 'center' } }
                ]);
              }
            }
          } else if (it.isCoach) {
            if (it.emptyCoach) {
              const coachRow = [
                { content: it.rolName, styles: { fillColor: [253, 246, 227], fontStyle: 'bold', halign: 'center', textColor: [122, 90, 0] } },
                { content: '—', styles: { fillColor: [253, 246, 227], halign: 'center', textColor: [148, 163, 184] } },
                { content: it.fullName, colSpan: 2, styles: { fillColor: [253, 246, 227], fontStyle: 'italic', textColor: [148, 163, 184], halign: 'left' } }
              ];
              coachRow._isCuerpoTecnicoStart = it.isCoachStart;
              chunkBody.push(coachRow);
            } else {
              const coachRow = [
                {
                  content: it.rolName,
                  styles: {
                    fillColor: [253, 246, 227],
                    fontStyle: 'bold',
                    halign: 'center',
                    textColor: [122, 90, 0]
                  }
                },
                {
                  content: '—',
                  styles: {
                    fillColor: [253, 246, 227],
                    halign: 'center',
                    textColor: [148, 163, 184]
                  }
                },
                {
                  content: it.fullName,
                  styles: {
                    fillColor: [253, 246, 227],
                    fontStyle: 'bold',
                    textColor: [11, 27, 54],
                    halign: 'left'
                  }
                },
                {
                  content: it.dni,
                  styles: {
                    fillColor: [253, 246, 227],
                    halign: 'center',
                    textColor: [11, 27, 54]
                  }
                }
              ];
              coachRow._isCuerpoTecnicoStart = it.isCoachStart;
              chunkBody.push(coachRow);
            }
          }
        });

        doc.autoTable({
          head: [
            [
              { content: 'CONDICIÓN', styles: { fillColor: [18, 41, 76], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 7.5 } },
              { content: 'N°', styles: { fillColor: [18, 41, 76], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 7.5 } },
              { content: 'APELLIDOS Y NOMBRES', styles: { fillColor: [18, 41, 76], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left', fontSize: 7.5 } },
              { content: 'DNI / DOCUMENTO', styles: { fillColor: [18, 41, 76], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center', fontSize: 7.5 } }
            ]
          ],
          body: chunkBody,
          startY: curY,
          margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
          theme: 'plain',
          rowPageBreak: 'avoid',
          styles: {
            font: 'helvetica',
            fontSize: 7.2,
            cellPadding: { top: 2.4, bottom: 2.4, left: 4, right: 4 },
            lineColor: [217, 225, 234], // #D9E1EA
            lineWidth: 0.5,
            textColor: [11, 27, 54]
          },
          columnStyles: {
            0: { cellWidth: colW0 },
            1: { cellWidth: colW1, halign: 'center' },
            2: { cellWidth: colW2 },
            3: { cellWidth: colW3, halign: 'center' }
          },
          didParseCell: (data) => {
            if (data.cell && typeof data.cell.text === 'object' && Array.isArray(data.cell.text)) {
              data.cell.text = data.cell.text.map(t => sanitizePdfText(t, 'jedpa_ficha'));
            }
            if (data.column.index === 3 && data.cell.raw && typeof data.cell.raw === 'object' && data.cell.raw.content) {
              const val = String(data.cell.raw.content).trim();
              if (val.length > 12) {
                data.cell.styles.fontSize = 6.2;
              }
            }
          },
          didDrawCell: (data) => {
            if (data.row && data.row.raw && data.row.raw._isCuerpoTecnicoStart) {
              doc.setDrawColor(224, 166, 38); // #E0A626
              doc.setLineWidth(1.2);
              doc.line(data.cell.x, data.cell.y, data.cell.x + data.cell.width, data.cell.y);
            }
          }
        });

        curY = doc.lastAutoTable.finalY;
        startIdx += rowsInChunk;

        if (startIdx < itemsToRender.length) {
          doc.addPage();
          safeDrawHeader(doc.internal.getNumberOfPages());
          curY = headerBottomY + 16;
          isContinuation = true;
        }
      }

      curY += 12; // Separación fija entre fichas
    }
  }

  // 8. Bloque de firmas oficial
  const defaultSignatures = isJedpa ? [
    { cargo: 'Presidente(a) Comisión Organizadora', entidad: 'Comisión Organizadora JEDPA 2026', leyenda: 'Firma y Sello' },
    { cargo: 'Especialista de Educación Física – AGEBRE', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'V.° B.° Jefatura AGEBRE', entidad: 'UGEL 03', leyenda: 'Sello Institucional' }
  ] : [
    { cargo: `Comisión Organizadora — ${(tipoConcurso && (tipoConcurso.nombreCorto || tipoConcurso.nombre)) || 'Concursos'}`, entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'Especialista Responsable — AGEBRE', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'V.° B.° Jefatura AGEBRE', entidad: 'UGEL 03', leyenda: 'Sello Institucional' }
  ];
  const signatures = (downloadConfig.signatures && downloadConfig.signatures.length > 0)
    ? downloadConfig.signatures
    : defaultSignatures;
  const sinFirmas = downloadConfig.sinFirmas === true;

  if (!sinFirmas && signatures && signatures.length > 0) {
    const sigCount = Math.min(signatures.length, 3);
    const rowHeight = 65;
    const lugarFecha = downloadConfig.lugarFecha || `Lima, ${formatDate(getLimaDateStr())}`;
    const sigBlockHeight = (lugarFecha ? 18 : 0) + rowHeight + 12;

    if (curY + sigBlockHeight > pageH - 42) {
      doc.addPage();
      safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
      curY = headerBottomY + 18;
    } else {
      curY += 8;
    }

    if (lugarFecha) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(91, 107, 128);
      doc.text(lugarFecha, margin, curY);
      curY += 15;
    }

    const colW = (contentW - 20 * (sigCount - 1)) / sigCount;
    signatures.slice(0, sigCount).forEach((sig, idx) => {
      const x = margin + idx * (colW + 20);
      const lineSigY = curY + 36;

      doc.setDrawColor(138, 151, 168);
      doc.setLineWidth(0.5);
      doc.line(x + 10, lineSigY, x + colW - 10, lineSigY);

      let textY = lineSigY + 9;
      if (sig.nombre) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(11, 27, 54);
        doc.text(formatearNombre(sig.nombre), x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
        textY += 9;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(11, 27, 54);
      const splitCargo = doc.splitTextToSize(sig.cargo || 'Responsable', colW - 10);
      doc.text(splitCargo, x + colW / 2, textY, { align: 'center' });
      textY += splitCargo.length * 8.5;

      if (sig.entidad || sig.institucion) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(91, 107, 128);
        doc.text(sig.entidad || sig.institucion, x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
      }
    });

    curY += rowHeight;
  }

  // 9. Pie de página en todas las hojas con aviso constructivo de datos faltantes
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    if (!drawnHeaderPages.has(i)) {
      doc.setPage(i);
      drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
      drawnHeaderPages.add(i);
    }
  }

  const emissionStr = getCurrentDateTimeStr();
  const equiposSinPuesto = cleanRows.filter(r => !r.puesto).length;
  const equiposSinRd = cleanRows.filter(r => !r.resolucionRef).length;
  const faltantes = [];
  if (equiposSinPuesto > 0) faltantes.push(`${equiposSinPuesto} equipo${equiposSinPuesto === 1 ? '' : 's'} sin puesto asignado`);
  if (equiposSinRd > 0) faltantes.push(`${equiposSinRd} sin RD`);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    dibujarPiePagina(doc, {
      pageNumber: i,
      totalPagesExp,
      margin,
      pageW,
      pageH,
      emissionStr,
      docVerifCode,
      faltantes,
      qrDataUrl,
      isLastPage: (i === pageCount),
      marcaBorrador: downloadConfig.marcaBorrador
    });
  }

  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  const cleanEtapaStr = sanitizeFilename(etapaLabel || 'UGEL');
  const cleanDiscStr = filters.disciplina ? `_${sanitizeFilename(filters.disciplina.toUpperCase())}` : '';
  const catStrVal = filters.categoria ? (Array.isArray(filters.categoria) ? filters.categoria.join('_') : String(filters.categoria)) : '';
  const cleanCatStr = catStrVal ? `_${sanitizeFilename(catStrVal.toUpperCase())}` : '';
  const cleanGenStr = filters.genero ? `_${sanitizeFilename(filters.genero.toUpperCase())}` : '';
  const cleanDateStr = getLimaDateStr();
  const contestPrefix = isJedpa
    ? 'JEDPA'
    : (tipoConcurso ? (tipoConcurso.nombreCorto || tipoConcurso.id || 'CONCURSO').toUpperCase().replace(/[^A-Z0-9]/g, '_') : 'CONCURSO');
  const filename = downloadConfig.filename || `Consolidado_Actas_${contestPrefix}${cleanDiscStr}${cleanCatStr}${cleanGenStr}_${cleanDateStr}.pdf`;

  doc.save(filename);
}

// Alias universal para fichas grupales en cualquier concurso educativo
export const exportFichasGrupalesConcursoPdf = exportJedpaFichasPdf;

/**
 * Renderiza de manera continua los grupos de JEDPA dividiéndolos en tramos por página.
 * - Una sola fila de título por grupo con conteo de participantes exclusivamente al inicio del grupo.
 * - En páginas siguientes, las filas de participantes continúan directamente bajo el encabezado de columnas repetido.
 * - No se repite la fila de grupo ni sufijos de continuacion en ninguna disciplina.
 * - Columnas combinadas (Cat, Disciplina, Cuerpo Técnico, Etapa, Resolución si es común) repiten sus datos en la celda combinada de esa página.
 * - Medición precisa de alturas y margen de seguridad para evitar saltos prematuros y eliminar espacios en blanco.
 * - Si el cuerpo técnico es más alto que las filas de un tramo, se amplía minCellHeight equitativamente en vez de saltar de página.
 * - Regla estricta contra filas huérfanas: el título nunca queda solo al final de una página (mínimo 2 filas o salto conjunto).
 * - Garantía de encabezado institucional y cabecera de columnas en todas las páginas.
 */
async function renderJedpaContinuousTable({
  doc,
  curY,
  pageW,
  pageH,
  margin,
  CONTENT_WIDTH,
  headerBottomY,
  safeDrawHeader,
  baseFont,
  groupsData,
  tableHeaders,
  columnStyles,
  tableStyles,
  concursoCfg,
  downloadConfig = {}
}) {
  const bottomMargin = 36;
  const PAGE_BOTTOM = pageH - bottomMargin;
  const TABLE_TOP_Y = headerBottomY + 14;
  const TABLE_HEAD_HEIGHT = 20;
  const GROUP_HEAD_HEIGHT = 18;
  const SAFETY_BUFFER = 6;
  const repetirDatos = (downloadConfig?.repetir_datos_en_continuacion !== false) && (concursoCfg?.repetir_datos_en_continuacion !== false);

  let isFirstTableOnPage = true;
  let availH = PAGE_BOTTOM - curY - TABLE_HEAD_HEIGHT;

  // Pre-medir altura de cada fila en cada grupo con la tipografía y tamaño exactos
  doc.setFont(baseFont || 'helvetica', 'normal');
  doc.setFontSize(7.2);
  const lh = 7.2 * 1.15;

  groupsData.forEach(g => {
    // Texto de cuerpo técnico del grupo
    doc.setFontSize(6.8);
    const ctLinesCount = doc.splitTextToSize(g.ctTextoGrupo || '', Math.max(10, columnStyles[5].cellWidth - 8)).length;
    g._ctNeededH = Math.max(20, ctLinesCount * (6.8 * 1.15) + 5);

    doc.setFontSize(7.2);
    g.rows.forEach(r => {
      const puestoText = formatPuestoLabel(r.puesto);
      const ieText = r.codigoModular
        ? `${(r.institucion || '—').toUpperCase()}\nCód. Mod.: ${formatCodigoModular(r.codigoModular)}`
        : (r.institucion || '—').toUpperCase();

      // Participante en formato compacto (nombre en 1 línea + DNI, sin línea en blanco entre atletas)
      const partText = (r.participantes || []).map(p => {
        const nom = formatPersonName(p);
        const dni = p.dni ? `DNI ${p.dni}` : '';
        return dni ? `${nom}\n${dni}` : nom;
      }).filter(Boolean).join('\n') || 'Sin participante registrado';

      let indAsestext = '';
      if (r.tieneExcepcionCuerpoTecnico || !g.canSpanCuerpoTecnico) {
        indAsestext = formatearCuerpoTecnicoTexto(r.asesores, { mayusculas: true, formato: 'multiline' });
      }

      const hasRes = Boolean(r.resolucionRef && r.resolucionRef !== '—' && String(r.resolucionRef).trim() !== '');
      const resRefText = hasRes ? formatResolucionRef(r.resolucionRef) : 'Sin resolución registrada';

      r._puestoText = puestoText;
      r._ieText = ieText;
      r._partText = partText;
      r._indAsestext = indAsestext;
      r._hasRes = hasRes;
      r._resRefText = resRefText;

      // Calcular altura estimada
      const pLines = doc.splitTextToSize(puestoText, Math.max(10, columnStyles[0].cellWidth - 8)).length;
      const ieLines = doc.splitTextToSize(ieText, Math.max(10, columnStyles[1].cellWidth - 8)).length;
      const partLines = doc.splitTextToSize(partText, Math.max(10, columnStyles[4].cellWidth - 8)).length;
      const resLines = doc.splitTextToSize(resRefText, Math.max(10, columnStyles[7].cellWidth - 8)).length;
      let indAsLines = 1;
      if (indAsestext) {
        indAsLines = doc.splitTextToSize(indAsestext, Math.max(10, columnStyles[5].cellWidth - 8)).length;
      }

      const maxLines = Math.max(pLines, ieLines, partLines, resLines, indAsLines, 1);
      r._unspannedHeight = Math.max(12, maxLines * lh + 5);
    });
  });

  for (const g of groupsData) {
    const numRows = g.rows.length;
    let startIdx = 0;

    while (startIdx < numRows) {
      const remainingCount = numRows - startIdx;
      const isFirstOfGroup = (startIdx === 0);
      const headerH = isFirstOfGroup ? GROUP_HEAD_HEIGHT : 0;
      const minRowsNeeded = isFirstOfGroup ? Math.min(2, remainingCount) : 1;

      // Calcular altura mínima requerida para iniciar este grupo/tramo
      const minSlice = g.rows.slice(startIdx, startIdx + minRowsNeeded);
      const minSumH = minSlice.reduce((acc, r) => acc + r._unspannedHeight, 0);
      const minTramoH = headerH + Math.max(minSumH, g.canSpanCuerpoTecnico ? g._ctNeededH : 0);

      // Si no cabe el encabezado de grupo + al menos 2 filas (o el grupo unitario), pasar a nueva página
      if (availH < minTramoH) {
        doc.addPage();
        safeDrawHeader(doc.internal.getNumberOfPages());
        curY = TABLE_TOP_Y;
        isFirstTableOnPage = true;
        availH = PAGE_BOTTOM - TABLE_TOP_Y - TABLE_HEAD_HEIGHT;
      }

      // Determinar cuántas filas caben en este tramo
      let count = 0;
      for (let c = 1; c <= remainingCount; c++) {
        const testSlice = g.rows.slice(startIdx, startIdx + c);
        const sumH = testSlice.reduce((acc, r) => acc + r._unspannedHeight, 0);
        const totalH = headerH + Math.max(sumH, g.canSpanCuerpoTecnico ? g._ctNeededH : 0);
        if (totalH <= (availH - SAFETY_BUFFER)) {
          count = c;
        } else {
          break;
        }
      }

      // Regla estricta contra títulos huérfanos: si inicia el grupo y no caben al menos 2 filas
      if (isFirstOfGroup && count < minRowsNeeded) {
        doc.addPage();
        safeDrawHeader(doc.internal.getNumberOfPages());
        curY = TABLE_TOP_Y;
        isFirstTableOnPage = true;
        availH = PAGE_BOTTOM - TABLE_TOP_Y - TABLE_HEAD_HEIGHT;

        count = 0;
        for (let c = 1; c <= remainingCount; c++) {
          const testSlice = g.rows.slice(startIdx, startIdx + c);
          const sumH = testSlice.reduce((acc, r) => acc + r._unspannedHeight, 0);
          const totalH = headerH + Math.max(sumH, g.canSpanCuerpoTecnico ? g._ctNeededH : 0);
          if (totalH <= (availH - SAFETY_BUFFER)) {
            count = c;
          } else {
            break;
          }
        }
        count = Math.max(minRowsNeeded, count);
      } else if (!isFirstOfGroup && count === 0) {
        count = Math.max(1, count);
      }

      // Evitar dejar 1 sola fila huérfana en la página siguiente si quedan 3 o más en total
      if (remainingCount - count === 1 && count > 2) {
        count = count - 1;
      }

      const endIdx = startIdx + count;
      const tramoRows = g.rows.slice(startIdx, endIdx);
      const spanCount = tramoRows.length;
      const tramoSumH = tramoRows.reduce((acc, r) => acc + r._unspannedHeight, 0);

      // Fila de título de grupo: se dibuja UNA SOLA VEZ, al inicio del grupo (nunca en continuación)
      let groupHeaderCell = null;
      if (isFirstOfGroup) {
        const titleStr = g.groupName.toUpperCase();
        const countStr = g.rows.length === 1 ? '1 participante' : `${g.rows.length} participantes`;

        groupHeaderCell = {
          content: titleStr,
          colSpan: 8,
          isGroupHeader: true,
          participantCountStr: countStr,
          styles: {
            fillColor: concursoCfg.color_fila_grupo || [47, 74, 116], // #2F4A74 Azul pizarra
            textColor: concursoCfg.color_texto_fila_grupo || [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9.5,
            halign: 'left',
            cellPadding: { top: 4, bottom: 4, left: 8, right: 8 }
          }
        };
      }

      // Verificar si en este tramo la resolución es idéntica
      const firstTramoRes = (tramoRows[0].resolucionRef || '').trim();
      const tramoSameRes = tramoRows.every(r => (r.resolucionRef || '').trim() === firstTramoRes);
      const showCombined = (isFirstOfGroup || repetirDatos);

      // Construir filas del tramo para autoTable
      const tramoTableRows = [];
      tramoRows.forEach((r, idx) => {
        const rowCells = [
          { content: r._puestoText, styles: { halign: 'center', fontStyle: 'bold' } },
          { content: r._ieText, styles: { halign: 'left' } }
        ];

        // Resolución celda
        let resRefCell;
        if (r._hasRes) {
          resRefCell = { content: formatResolucionRef(r.resolucionRef), styles: { halign: 'center' } };
        } else {
          resRefCell = { content: 'Sin resolución registrada', styles: { fontStyle: 'italic', textColor: [128, 138, 150], fontSize: 6.6, halign: 'center' } };
        }

        if (idx === 0) {
          // Primera fila del tramo: celdas combinadas con rowSpan
          if (g.sameCat && spanCount > 1) {
            rowCells.push({ content: showCombined ? g.firstCat : '', rowSpan: spanCount, styles: { halign: 'center', valign: 'middle' } });
          } else {
            rowCells.push({ content: r.categoria || '—', styles: { halign: 'center' } });
          }

          if (g.sameDisc && spanCount > 1) {
            rowCells.push({ content: showCombined ? g.firstDisc : '', rowSpan: spanCount, styles: { halign: 'left', valign: 'middle' } });
          } else {
            rowCells.push({ content: r.disciplina || r.tituloTrabajo || '—', styles: { halign: 'left' } });
          }

          rowCells.push({ content: r._partText, styles: { halign: 'left' } });

          if (g.canSpanCuerpoTecnico && spanCount > 1) {
            rowCells.push({ content: showCombined ? g.ctTextoGrupo : '', rowSpan: spanCount, styles: { halign: 'left', valign: 'middle', fontSize: 6.8 } });
          } else {
            rowCells.push({ content: r._indAsestext || g.ctTextoGrupo, styles: { halign: 'left', fontSize: 6.8 } });
          }

          if (g.sameEtapa && spanCount > 1) {
            rowCells.push({ content: showCombined ? g.firstEtapa : '', rowSpan: spanCount, styles: { halign: 'center', valign: 'middle', fontStyle: 'bold' } });
          } else {
            rowCells.push({ content: r.etapa || 'UGEL', styles: { halign: 'center', fontStyle: 'bold' } });
          }

          if (tramoSameRes && spanCount > 1) {
            resRefCell.rowSpan = spanCount;
            if (resRefCell.styles) resRefCell.styles.valign = 'middle';
            if (!showCombined) resRefCell.content = '';
            rowCells.push(resRefCell);
          } else {
            rowCells.push(resRefCell);
          }
        } else {
          // Filas subsecuentes del tramo: omitir celdas combinadas
          if (!g.sameCat || spanCount <= 1) {
            rowCells.push({ content: r.categoria || '—', styles: { halign: 'center' } });
          }

          if (!g.sameDisc || spanCount <= 1) {
            rowCells.push({ content: r.disciplina || r.tituloTrabajo || '—', styles: { halign: 'left' } });
          }

          rowCells.push({ content: r._partText, styles: { halign: 'left' } });

          if (!g.canSpanCuerpoTecnico || spanCount <= 1) {
            rowCells.push({ content: r._indAsestext || g.ctTextoGrupo, styles: { halign: 'left', fontSize: 6.8 } });
          }

          if (!g.sameEtapa || spanCount <= 1) {
            rowCells.push({ content: r.etapa || 'UGEL', styles: { halign: 'center', fontStyle: 'bold' } });
          }

          if (!tramoSameRes || spanCount <= 1) {
            rowCells.push(resRefCell);
          }
        }

        tramoTableRows.push(rowCells);
      });

      // El cuerpo de la tabla incluye la fila de grupo solo si es el inicio del grupo
      const tableBody = isFirstOfGroup ? [[groupHeaderCell], ...tramoTableRows] : tramoTableRows;

      // Si el cuerpo técnico es más alto que las filas de un tramo corto, aumentar altura mínima
      const tramoMinCellH = (g.canSpanCuerpoTecnico && g._ctNeededH > tramoSumH && spanCount > 1)
        ? Math.max(12, Math.ceil(g._ctNeededH / spanCount))
        : 12;

      // Dibujar este tramo con autoTable
      doc.autoTable({
        head: isFirstTableOnPage ? [tableHeaders] : [],
        body: tableBody,
        startY: curY,
        margin: { left: margin, right: margin, top: TABLE_TOP_Y, bottom: bottomMargin },
        tableWidth: CONTENT_WIDTH,
        theme: 'plain',
        rowPageBreak: 'avoid',
        showHead: isFirstTableOnPage ? 'everyPage' : false,
        styles: Object.assign({
          font: baseFont,
          fontSize: 7.2,
          cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
          lineColor: [227, 232, 239],
          lineWidth: 0.5,
          textColor: [15, 27, 45],
          overflow: 'linebreak',
          minCellHeight: tramoMinCellH
        }, tableStyles || {}),
        headStyles: {
          fillColor: [18, 41, 77], // #12294D
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: 8
        },
        alternateRowStyles: {
          fillColor: [247, 249, 252] // #F7F9FC
        },
        columnStyles: columnStyles,
        didDrawCell: (data) => {
          if (data.cell && data.cell.raw && data.cell.raw.isGroupHeader) {
            // Borde izquierdo dorado (#E0A526, 3 pt)
            const bCol = concursoCfg.color_borde_fila_grupo || [224, 165, 38];
            doc.setFillColor(bCol[0], bCol[1], bCol[2]);
            doc.rect(data.cell.x, data.cell.y, 3, data.cell.height, 'F');

            // Conteo a la derecha
            if (data.cell.raw.participantCountStr) {
              doc.setFont(baseFont || 'helvetica', 'normal');
              doc.setFontSize(7.5);
              doc.setTextColor(220, 232, 245);
              doc.text(
                data.cell.raw.participantCountStr,
                data.cell.x + data.cell.width - 8,
                data.cell.y + data.cell.height / 2 + 2.5,
                { align: 'right' }
              );
            }
          }
        },
        didParseCell: (data) => {
          if (data.cell) {
            if (Array.isArray(data.cell.text)) {
              data.cell.text = data.cell.text.map(txt => {
                verificarTextoPdf(txt, 'autoTable');
                return sanitizePdfText(txt);
              });
            } else if (typeof data.cell.text === 'string') {
              verificarTextoPdf(data.cell.text, 'autoTable');
              data.cell.text = sanitizePdfText(data.cell.text);
            }
          }
        },
        didDrawPage: (data) => {
          const pageNum = doc.internal.getNumberOfPages();
          if (pageNum > 1) {
            safeDrawHeader(pageNum);
          }
        }
      });

      curY = doc.lastAutoTable.finalY;
      isFirstTableOnPage = false;
      startIdx = endIdx;

      if (startIdx < numRows) {
        // El grupo continúa en la página siguiente (sin fila de subtítulo repetida)
        doc.addPage();
        safeDrawHeader(doc.internal.getNumberOfPages());
        curY = TABLE_TOP_Y;
        isFirstTableOnPage = true;
        availH = PAGE_BOTTOM - TABLE_TOP_Y - TABLE_HEAD_HEIGHT;
      } else {
        // Grupo completado: actualizar espacio disponible en la página actual
        availH = PAGE_BOTTOM - curY;
      }
    }
  }

  return curY + 14;
}

/**
 * Exporta el Reporte de Concursos Escolares a PDF en orientación HORIZONTAL (Landscape)
 * Tabla agrupada por Disciplina — Categoría con filas de subtítulo y orden por puesto.
 */
export async function exportConcursosReportPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const concursoCfg = getConcursoConfig(tipoConcurso);
  const isJedpa = (concursoCfg.id === 'jedpa');
  const concursoNombre = tipoConcurso ? tipoConcurso.nombre : 'CONCURSOS EDUCATIVOS ESCOLARES';
  const title = getTituloConsolidadoConcurso(tipoConcurso);

  // Deduplicación preventiva de registros exactos para evitar conteos erróneos
  const cleanRows = deduplicateConcursoRows(filtered);
  const totalRegs = cleanRows.length;

  const formatoConcurso = getFormatoPdfConcurso(tipoConcurso);

  // Formato Fichas por Categoría: EXCLUSIVO para JFEN (paleta morada institucional)
  const isJfen = (concursoCfg.id === 'jfen' || (tipoConcurso && (tipoConcurso.id === 'jfen' || (tipoConcurso.nombre || '').toUpperCase().includes('JFEN') || (tipoConcurso.nombre || '').toUpperCase().includes('FLORALES'))));
  const debeUsarFichasJfen = isJfen &&
    (formatoConcurso === 'fichas_por_categoria' || downloadConfig.formatoConcurso === 'fichas') &&
    downloadConfig.formatoConcurso !== 'completo' &&
    downloadConfig.formatoConcurso !== 'orden_merito';

  if (debeUsarFichasJfen) {
    return await exportJfenFichasPdf(cleanRows, tipoConcurso, filters, downloadConfig);
  }

  // Fichas por equipo / grupo (paleta azul estándar institucional):
  // Aplica para JEDPA colectivo, Eureka, Crea y Emprende, El Perú Lee o cualquier concurso grupal / formato fichas
  const esConcursoGrupal = (tipoConcurso && (tipoConcurso.tipoParticipacion === 'grupal' || tipoConcurso.modalidad === 'colectiva' || tipoConcurso.modalidad === 'grupal' || tipoConcurso.formato_pdf_actas === 'fichas_por_categoria'));
  const sonTodosRegistrosGrupales = cleanRows.length > 0 && cleanRows.every(r =>
    (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso)
  );
  const esFiltroColectivo = filters.disciplina && esDisciplinaColectiva(filters.disciplina, null, tipoConcurso);
  const usuarioEligioFichas = downloadConfig.formatoConcurso === 'fichas_equipo' || downloadConfig.formatoConcurso === 'fichas' || formatoConcurso === 'fichas_por_categoria';

  if (downloadConfig.formatoConcurso !== 'completo' && downloadConfig.formatoConcurso !== 'orden_merito') {
    if (usuarioEligioFichas || esConcursoGrupal || (isJedpa && (sonTodosRegistrosGrupales || esFiltroColectivo))) {
      return await exportJedpaFichasPdf(cleanRows, tipoConcurso, filters, downloadConfig);
    }

    if (sonTodosRegistrosGrupales && cleanRows.length > 0) {
      return await exportJedpaFichasPdf(cleanRows, tipoConcurso, filters, downloadConfig);
    }
  }

  // Criterio unificado: contar instituciones por CÓDIGO MODULAR
  const uniqueColegios = new Set(cleanRows.map(r => formatCodigoModular(r.codigoModular) || r.institucion).filter(Boolean)).size;

  // Etapa real presente
  const etapasPresentes = [...new Set(cleanRows.map(r => r.etapa).filter(Boolean))];
  const etapaLabel = filters.etapa
    ? filters.etapa
    : (etapasPresentes.length === 1 ? etapasPresentes[0] : (etapasPresentes.length > 1 ? etapasPresentes.join(', ') : 'UGEL'));

  // Filtros aplicados visibles (Orden: Etapa -> Disciplina -> Categoría -> Género) con etiquetas y valores en mayúsculas
  const filtrosTexto = formatearFiltrosSubtitulo(filters, etapaLabel);

  // Párrafo introductorio sin repetición de filtros al final (se muestran exclusivamente en el subtítulo oficial)
  const introParagraph = `En el marco de las bases generales de los Concursos Educativos Escolares 2026 promovidos por el Ministerio de Educación y la UGEL 03, se emite la presente Acta Oficial de Resultados y Premiaciones para ${concursoNombre} en la Etapa ${etapaLabel}. Se consolidan a continuación los estudiantes ganadores, delegaciones e instituciones educativas reconocidas.`;

  // Tarjeta de resumen de metadatos (metaGrid)
  let metaGrid;
  if (isJedpa) {
    const uniqueTecnicos = new Set();
    cleanRows.forEach(r => {
      (r.asesores || []).forEach(a => {
        const k = a.dni ? a.dni.trim() : formatearNombre(a).toLowerCase();
        if (k) uniqueTecnicos.add(k);
      });
    });
    const totalTecnicos = uniqueTecnicos.size;

    metaGrid = [
      { label: 'Concurso Educativo', value: concursoNombre, widthRatio: 0.34 },
      { label: 'Etapa', value: etapaLabel, widthRatio: 0.12 },
      { label: 'Total Registros / Premiaciones', value: String(totalRegs), widthRatio: 0.16 },
      { label: 'Instituciones Participantes', value: String(uniqueColegios), note: '* Cuenta por código modular', widthRatio: 0.18 },
      { label: 'Delegado / Entrenador', value: String(totalTecnicos), note: '* Personas únicas', widthRatio: 0.20 }
    ];
  } else {
    metaGrid = [
      { label: 'Concurso Educativo', value: concursoNombre, widthRatio: 0.44 },
      { label: 'Etapa', value: etapaLabel, widthRatio: 0.14 },
      { label: 'Total Registros / Premiaciones', value: String(totalRegs), widthRatio: 0.20 },
      { label: 'Instituciones Participantes', value: String(uniqueColegios), note: '* Cuenta por código modular', widthRatio: 0.22 }
    ];
  }

  // Nombre de columna de cuerpo técnico según configuración por concurso
  const asesoresColHeader = concursoCfg.etiqueta_columna_asesor || 'Docente Asesor';
  const catColHeader = isJedpa ? 'Cat.' : 'Categoría';
  const tableHeaders = ['Puesto', 'Institución Educativa', catColHeader, 'Área / Disciplina', 'Participantes (DNI)', asesoresColHeader, 'Etapa', 'Resolución Ref.'];

  // Agrupar filas por: Disciplina — Categoría (y Género cuando aplique)
  const groupsMap = new Map();
  cleanRows.forEach(r => {
    const disc = (r.disciplina || r.tituloTrabajo || 'General').trim();
    const cat = (r.categoria || 'Única').trim();
    const gen = (r.genero && r.genero.trim() && r.genero.trim() !== '—') ? ` · ${r.genero.trim().toUpperCase()}` : '';
    const groupKey = `${disc} · Categoría ${cat}${gen}`;
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, []);
    }
    groupsMap.get(groupKey).push(r);
  });

  const groupKeys = Array.from(groupsMap.keys()).sort((a, b) => a.localeCompare(b));
  const jedpaGroupsData = [];
  const tableRows = [];

  groupKeys.forEach(groupName => {
    const rowsInGroup = groupsMap.get(groupName).sort((a, b) => {
      const rk = puestoRank(a.puesto) - puestoRank(b.puesto);
      if (rk !== 0) return rk;
      return (a.institucion || '').localeCompare(b.institucion || '');
    });

    if (isJedpa) {
      // JEDPA: Estructurar datos del grupo para renderizado continuo por tramos
      const ctInfo = obtenerCuerpoTecnicoGrupo(
        groupName,
        rowsInGroup,
        downloadConfig.state || (typeof window !== 'undefined' ? window.state : {}),
        tipoConcurso
      );
      const ctTextoGrupo = formatearCuerpoTecnicoTexto(ctInfo.personas, { mayusculas: true, formato: 'multiline' });

      const numRows = rowsInGroup.length;
      const firstCat = rowsInGroup[0].categoria || '—';
      const sameCat = rowsInGroup.every(r => (r.categoria || '—') === firstCat);

      const firstDisc = rowsInGroup[0].disciplina || rowsInGroup[0].tituloTrabajo || '—';
      const sameDisc = rowsInGroup.every(r => (r.disciplina || r.tituloTrabajo || '—') === firstDisc);

      const firstEtapa = rowsInGroup[0].etapa || 'UGEL';
      const sameEtapa = rowsInGroup.every(r => (r.etapa || 'UGEL') === firstEtapa);

      const firstResRef = formatResolucionRef(rowsInGroup[0].resolucionRef);
      const sameResRef = rowsInGroup.every(r => formatResolucionRef(r.resolucionRef) === firstResRef);

      const anyExcepcion = rowsInGroup.some(r => r.tieneExcepcionCuerpoTecnico);
      const canSpanCuerpoTecnico = !anyExcepcion && numRows > 1;

      jedpaGroupsData.push({
        groupName,
        rows: rowsInGroup,
        ctInfo,
        ctTextoGrupo,
        sameCat,
        firstCat,
        sameDisc,
        firstDisc,
        sameEtapa,
        firstEtapa,
        sameResRef,
        firstResRef,
        canSpanCuerpoTecnico
      });
    } else {
      // Fila de subtítulo agrupador (full width) para los demás concursos
      tableRows.push([
        {
          content: groupName.toUpperCase(),
          colSpan: 8,
          styles: {
            fillColor: [238, 241, 245], // #EEF1F5
            textColor: [11, 27, 54],    // #0B1B36
            fontStyle: 'bold',
            fontSize: 8,
            halign: 'left',
            cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
          }
        }
      ]);

      // Formato tabular tradicional para los demás concursos (100% retrocompatible)
      rowsInGroup.forEach(r => {
        const ieText = r.codigoModular
          ? `${(r.institucion || '—').toUpperCase()}\nCód. Mod.: ${formatCodigoModular(r.codigoModular)}`
          : (r.institucion || '—').toUpperCase();

        let partText = (r.participantes || []).map(p => {
          const nom = formatPersonName(p);
          const dni = p.dni ? `DNI: ${p.dni}` : '';
          return dni ? `${nom}\n${dni}` : nom;
        }).filter(Boolean).join('\n\n') || 'Sin participante registrado';

        let asestext = (r.asesores || []).map(a => {
          const nom = formatPersonName(a);
          const dni = a.dni ? `DNI: ${a.dni}` : '';
          const rol = a.rol ? `(${a.rol})` : '';
          const line2 = [dni, rol].filter(Boolean).join(' ');
          return line2 ? `${nom}\n${line2}` : nom;
        }).filter(Boolean).join('\n\n') || 'Sin docente asesor registrado';

        const resRef = formatResolucionRef(r.resolucionRef);

        tableRows.push([
          formatPuestoLabel(r.puesto),
          ieText,
          r.categoria || '—',
          r.disciplina || r.tituloTrabajo || '—',
          partText,
          asestext,
          r.etapa || 'UGEL',
          resRef
        ]);
      });
    }
  });

  let filename = downloadConfig.filename;
  if (!filename) {
    if (isJedpa) {
      const discPart = filters.disciplina ? `_${sanitizeFilename(filters.disciplina.toUpperCase())}` : '';
      const catStrVal2 = filters.categoria ? (Array.isArray(filters.categoria) ? filters.categoria.join('_') : String(filters.categoria)) : '';
      const catPart = catStrVal2 ? `_${sanitizeFilename(catStrVal2.toUpperCase())}` : '';
      const genPart = filters.genero ? `_${sanitizeFilename(filters.genero.toUpperCase())}` : '';
      filename = `Consolidado_Actas_JEDPA${discPart}${catPart}${genPart}_${getLimaDateStr()}.pdf`;
    } else {
      filename = `Consolidado_Actas_${sanitizeFilename(concursoNombre)}_${getLimaDateStr()}.pdf`;
    }
  }

  const defaultSignatures = [
    { cargo: 'Coordinador(a) del Concurso', entidad: 'Comisión Organizadora UGEL 03', leyenda: 'Firma y Sello' },
    { cargo: 'Especialista de AGEBRE / Jurado', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'V.° B.° Jefatura AGEBRE', entidad: 'UGEL 03', leyenda: 'Sello Institucional' }
  ];

  // Configuración de anchos y paddings compactos
  // JEDPA: Col 0 (50pt) para evitar partición de "Clasificado", Col 2 (35pt) con encabezado "Cat."
  // Suma total: 50 + 155 + 35 + 80 + 195 + 130 + 38 + 87 = 770 pt (CONTENT_WIDTH exacto)
  const jedpaColumnStyles = {
    0: { halign: 'center', cellWidth: 50, fontStyle: 'bold' },
    1: { halign: 'left', cellWidth: 155 },
    2: { halign: 'center', cellWidth: 35 },
    3: { halign: 'left', cellWidth: 80 },
    4: { halign: 'left', cellWidth: 195 },
    5: { halign: 'left', cellWidth: 130 },
    6: { halign: 'center', cellWidth: 38, fontStyle: 'bold' },
    7: { halign: 'center', cellWidth: 87 }
  };

  const defaultColumnStyles = {
    0: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
    1: { halign: 'left', cellWidth: 135 },
    2: { halign: 'center', cellWidth: 50 },
    3: { halign: 'left', cellWidth: 90 },
    4: { halign: 'left', cellWidth: 185 },
    5: { halign: 'left', cellWidth: 115 },
    6: { halign: 'center', cellWidth: 45, fontStyle: 'bold' },
    7: { halign: 'center', cellWidth: 95 }
  };

  const tableStyles = isJedpa ? {
    fontSize: 7.2,
    cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 },
    minCellHeight: 12
  } : {
    fontSize: 7.5,
    cellPadding: { top: 4.5, right: 5, bottom: 4.5, left: 5 },
    minCellHeight: 14
  };

  const renderCustomTable = isJedpa ? async ({
    doc,
    curY,
    pageW,
    pageH,
    margin,
    CONTENT_WIDTH,
    headerBottomY,
    safeDrawHeader,
    baseFont
  }) => {
    return await renderJedpaContinuousTable({
      doc,
      curY,
      pageW,
      pageH,
      margin,
      CONTENT_WIDTH,
      headerBottomY,
      safeDrawHeader,
      baseFont,
      groupsData: jedpaGroupsData,
      tableHeaders,
      columnStyles: jedpaColumnStyles,
      tableStyles,
      concursoCfg,
      downloadConfig
    });
  } : null;

  await createOfficialPdfDocument({
    title,
    subtitle: `Comisión Organizadora de Concursos Escolares 2026 · UGEL 03 · ${filtrosTexto}`,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows: isJedpa ? [] : tableRows,
    renderCustomTable,
    columnStyles: isJedpa ? jedpaColumnStyles : defaultColumnStyles,
    tableStyles,
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
 * Exporta el Acta Oficial en Formato "Orden de Mérito" (solo puestos 1.° a 3.° estilo Anexo E20)
 */
export async function exportActaOrdenMeritoPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const concursoNombre = tipoConcurso ? tipoConcurso.nombre : 'CONCURSOS EDUCATIVOS ESCOLARES';
  const title = getTituloConsolidadoConcurso(tipoConcurso);

  // Filtrar exclusivamente puestos 1.°, 2.°, 3.°
  const cleanRows = deduplicateConcursoRows(filtered);
  const podiumRows = cleanRows.filter(r => {
    const rk = puestoRank(r.puesto);
    return rk >= 1 && rk <= 3;
  });

  if (podiumRows.length === 0) {
    throw new Error('No se encontraron registros con 1.er, 2.° o 3.er puesto para generar el Acta de Orden de Mérito.');
  }

  const uniqueColegios = new Set(podiumRows.map(r => formatCodigoModular(r.codigoModular) || r.institucion).filter(Boolean)).size;
  const etapaLabel = filters.etapa || 'UGEL';

  const introParagraph = `En el marco de las bases generales de los Concursos Educativos Escolares 2026 promovidos por el Ministerio de Educación y la UGEL 03, se emite la presente Acta Oficial de Orden de Mérito (Podio Oficial de Ganadores) para ${concursoNombre} en la Etapa ${etapaLabel}. Se reconocen y proclaman formalmente a las delegaciones escolares que alcanzaron los primeros lugares en sus respectivas categorías y disciplinas.`;

  const metaGrid = [
    { label: 'Concurso Educativo', value: concursoNombre, widthRatio: 0.44 },
    { label: 'Etapa', value: etapaLabel, widthRatio: 0.14 },
    { label: 'Total Ganadores en Podio', value: String(podiumRows.length), widthRatio: 0.20 },
    { label: 'Instituciones Ganadoras', value: String(uniqueColegios), note: '* Cuenta por código modular', widthRatio: 0.22 }
  ];

  const concursoCfg = getConcursoConfig(tipoConcurso);
  const asesorColHeader = (concursoCfg.id === 'jedpa') ? 'Delegado / Entrenador' : 'Docente Asesor / Entrenador';
  const tableHeaders = ['Puesto', 'Institución Educativa', 'Cód. Modular', 'UGEL / DRE', 'Participante(s) Ganador(es)', asesorColHeader, 'Resolución Ref.'];

  // Agrupar por Categoría / Disciplina / Género (Podios oficiales)
  const groupsMap = new Map();
  podiumRows.forEach(r => {
    const disc = (r.disciplina || r.tituloTrabajo || 'General').trim();
    const cat = (r.categoria || 'Única').trim();
    const gen = (r.genero && r.genero.trim() && r.genero.trim() !== '—') ? ` · ${r.genero.trim().toUpperCase()}` : '';
    const groupKey = `${disc} · Categoría ${cat}${gen}`;
    if (!groupsMap.has(groupKey)) groupsMap.set(groupKey, []);
    groupsMap.get(groupKey).push(r);
  });

  const tableRows = [];
  const groupKeys = Array.from(groupsMap.keys()).sort((a, b) => a.localeCompare(b));

  groupKeys.forEach(groupName => {
    const rowsInGroup = groupsMap.get(groupName).sort((a, b) => puestoRank(a.puesto) - puestoRank(b.puesto));

    // Fila agrupador
    tableRows.push([
      {
        content: `MÉRITO OFICIAL: ${groupName.toUpperCase()}`,
        colSpan: 7,
        styles: {
          fillColor: [18, 41, 77], // Navy
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'left',
          cellPadding: { top: 5, bottom: 5, left: 8, right: 8 }
        }
      }
    ]);

    rowsInGroup.forEach(r => {
      const partText = (r.participantes || []).map(p => {
        const nom = formatPersonName(p);
        const dni = p.dni ? `DNI: ${p.dni}` : '';
        return dni ? `${nom}\n${dni}` : nom;
      }).filter(Boolean).join('\n\n') || 'Sin participante registrado';

      const asestext = formatearCuerpoTecnicoTexto(r.asesores, {
        mayusculas: concursoCfg.mayusculas_cuerpo_tecnico,
        formato: 'multiline',
        vacioTexto: 'Sin docente asesor registrado'
      });

      tableRows.push([
        formatPuestoLabel(r.puesto),
        (r.institucion || '—').toUpperCase(),
        formatCodigoModular(r.codigoModular),
        'UGEL 03\nDRELM',
        partText,
        asestext,
        formatResolucionRef(r.resolucionRef)
      ]);
    });
  });

  const summarySections = [
    {
      title: 'Disposiciones Finales de Clasificación y Cierre de Etapa',
      content: 'En esta etapa finaliza la participación de las delegaciones escolares según las bases oficiales del concurso. Se deja expresa constancia en la presente acta oficial suscrita por las autoridades competentes y el comité organizador para los fines de reconocimiento y trámite administrativo correspondiente.'
    }
  ];

  const filename = downloadConfig.filename || `Consolidado_Actas_Orden_Merito_${sanitizeFilename(concursoNombre)}_${getLimaDateStr()}.pdf`;

  const defaultSignatures = [
    { cargo: 'Coordinador(a) del Concurso', entidad: 'Comisión Organizadora UGEL 03', leyenda: 'Firma y Sello' },
    { cargo: 'Especialista de AGEBRE / Jurado', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'V.° B.° Jefatura AGEBRE', entidad: 'UGEL 03', leyenda: 'Sello Institucional' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: `Acta de Proclamación de Ganadores (1.er a 3.er Puesto) · UGEL 03`,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows,
    columnStyles: {
      0: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 160 },
      2: { halign: 'center', cellWidth: 60 },
      3: { halign: 'center', cellWidth: 65 },
      4: { halign: 'left', cellWidth: 190 },
      5: { halign: 'left', cellWidth: 130 },
      6: { halign: 'center', cellWidth: 95 }
    },
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
