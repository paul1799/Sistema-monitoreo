/* =========================================================================
   pdf-template.js — Generador oficial de documentos PDF institucionales
   UGEL 03 / MINEDU - Estilo Oficial "Anexo E20 - Acta de Resultados"
   V3: Soporte para Área de Firmas dinámica, 1–6 firmantes, códigos QR,
       agrupación por disciplina/categoría, y modo Orden de Mérito.
   ========================================================================= */

import {
  isFichaEbrGestionEscolar,
  RUBRICAS_OBSERVACION_AULA,
  EBR_GESTION_VISITA_1_SECCIONES,
  EBR_GESTION_VISITA_2_SECCIONES,
  migrateLegacyEbrTotals
} from './ebr-gestion.js?v=20260929_v15';

import {
  isFichaJec,
  JEC_SECCIONES,
  getNivelLogroJec
} from './jec-monitoreo.js?v=20260928_v12';

import {
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  ESPECIALISTA_JEC_OFICIAL,
  getNivelCoordTutoriaJec,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  calcScore,
  getNivelEbrGestion,
  getReglaNivelEbrGestion,
  getMomentoVisitaEbr
} from './calcEngine.js?v=20260928_v12';

import {
  getHallazgosClave,
  computeItemAgg
} from './reportes-datos.js?v=20260929_v18';

export const SISTEMA_NOMBRE_OFICIAL = 'Sistema de Fichas de Monitoreo';

/**
 * Obtiene la instancia de jsPDF desde window.jspdf
 */
function getJsPdf() {
  if (typeof window.jspdf === 'undefined' || !window.jspdf.jsPDF) {
    throw new Error('La librería jsPDF no está disponible en la página.');
  }
  return window.jspdf.jsPDF;
}

/**
 * Formatea una fecha ISO o timestamp a formato legible peruano (DD/MM/AAAA)
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  const parts = String(dateStr).split('T')[0].split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Convierte un texto a formato Title Case (primera letra en mayúscula por palabra)
 */
export function toTitleCase(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/(?:^|\s|\/|-|\.)\S/g, c => c.toUpperCase());
}

/**
 * Formatea el nombre de una persona al estándar institucional unificado: APELLIDOS, Nombres
 * Ejemplo: "YANAPA ALMANZA, Daniela Geraldine"
 */
export const COMMON_GIVEN_NAMES = new Set([
  'AARON','ABEL','ABIGAIL','ABRIL','ADAN','ADELA','ADELFA','ADITA','ADRIAN','ADRIANA','AGUSTIN','AIDA','AIRI','AKEMI','AKIRA','ALBA','ALBERTO','ALDO','ALEJANDRA','ALEJANDRO','ALESSANDRA','ALESSANDRO','ALEX','ALEXA','ALEXANDER','ALEXANDRA','ALEXIS','ALFONSO','ALFREDO','ALICIA','ALONDRA','ALONSO','ALVARO','AMANDA','AMELIA','AMI','AMYLEE','ANA','ANAHI','ANALI','ANDREA','ANDRES','ANGEL','ANGELA','ANGELES','ANGELICA','ANGELINA','ANGELO','ANIBAL','ANTONELLA','ANTONIA','ANTONIO','ARACELY','ARIADNA','ARIAN','ARIANA','ARIEL','ARMANDO','ARTURO','ASTRID','AUGUSTO','AURELIO','AURORA','AYELEN','AYMAR','AYUMI','BADE','BARBARA','BEATRIZ','BELEN','BENJAMIN','BERENICE','BERTHA','BIANCA','BLANCA','BORIS','BRAJAN','BRANDON','BRAYAN','BRISA','BRUCE','BRUNA','BRUNELLA','BRUNO','BRYAN','CALEB','CAMILA','CAMILO','CARIDAD','CARINA','CARLA','CARLOS','CARMEN','CAROLINA','CATALINA','CAYETANA','CECILIA','CESAR','CHRISTIAN','CHRISTOPHER','CIELO','CINDY','CLARA','CLAUDIA','CLAUDIO','CONSUELO','CRISTIAN','CRISTINA','CRISTOBAL','CYNTHIA','DAFNE','DAHIANA','DAMIAN','DANA','DANFER','DANIEL','DANIELA','DANIELLA','DANILO','DANNA','DANNY','DANTE','DARIO','DAVID','DAYANA','DAYRA','DEBORA','DELIA','DENIS','DENISE','DIANA','DIEGO','DINA','DOMINGO','DORA','DORIS','DOUGLAS','DUANE','DYLAN','EDGAR','EDGARD','EDGARDO','EDITH','EDSON','EDUARDO','EDWARD','EDWIN','EIMER','ELENA','ELIAS','ELIO','ELISA','ELIZABETH','ELMER','ELSA','ELVIS','EMANUEL','EMILIA','EMILIANO','EMILIO','EMILY','EMMA','ENMANUEL','ENRIQUE','ERIC','ERICK','ERIKA','ERNESTO','ESTEBAN','ESTEFANIA','ESTEFANY','ESTHER','ESTRELLA','EUGENIA','EUGENIO','EVA','EVELYN','EVER','FABIAN','FABIANA','FABRICIO','FACUNDO','FATIMA','FAUSTO','FEDERICO','FELICITA','FELIPE','FELIX','FERNANDA','FERNANDO','FIORELLA','FLAVIA','FLAVIO','FLOR','FRANCISCA','FRANCISCO','FRANCO','FRANK','FRANKLIN','FREDDY','GABRIEL','GABRIELA','GAEL','GAELA','GENARO','GENESIS','GEOVANNA','GERALDO','GERALDINE','GERARDO','GERMAN','GERONIMO','GIANCARLO','GIANCARLOS','GIANFRANCO','GIANLUCA','GIANMARCO','GINA','GINO','GIOVANNA','GISELA','GISELLE','GLADYS','GLORIA','GONZALO','GRACE','GRACIELA','GRECIA','GREGORIO','GREYS','GUADALUPE','GUILLERMO','GUSTAVO','HAROLD','HAYDEE','HECTOR','HELEN','HENRY','HERNAN','HILARY','HILDA','HOMERO','HUGO','HUMBERTO','IAN','IBETH','IGNACIO','ILIANA','IMANOL','INDIRA','INES','INGRID','IRENE','IRIS','IRMA','ISAAC','ISABEL','ISABELLA','ISIDORA','ISMAEL','ISRAEL','ITA','ITURRIAGA','ITZA','ITZEL','IVAN','IVANA','IVANNA','IVONNE','JACINTO','JACOB','JACQUELINE','JAHIR','JAIME','JAIR','JAIRO','JAMES','JAMPIER','JANE','JANET','JANETH','JAVIER','JAZMIN','JEAN','JEANPIERRE','JEFFERSON','JENNIFER','JEREMY','JERRY','JESSI','JESSICA','JESUS','JEYSON','JHAMIR','JHAN','JHEISON','JHOAN','JHON','JHONATAN','JHONY','JIMMY','JOAN','JOANA','JOANNA','JOAO','JOAQUIN','JOEL','JOHAN','JOHANA','JOHANNA','JOHN','JONATHAN','JORDAN','JORGE','JOSE','JOSEFINA','JOSELYN','JOSEPH','JOSHUA','JOSSELYN','JOSUE','JUAN','JUANA','JUDITH','JULIA','JULIAN','JULIANA','JULIETA','JULIO','JUNIOR','JUSTO','KAREN','KARIM','KARIN','KARINA','KARLA','KATHERIN','KATHERINE','KATHERINI','KATIA','KATTY','KAYETANA','KEIKO','KELLY','KELVIN','KENNETH','KENNY','KEVIN','KIARA','KIMBERLY','LADY','LAURA','LAUREANO','LEANDRO','LEIDY','LEILA','LEONARDO','LEONEL','LEONIDAS','LEONOR','LEOPOLDO','LESLIE','LESLY','LEYDI','LEYLA','LIA','LIAM','LIDIA','LILIAN','LILIANA','LINA','LIZ','LIZBETH','LIZETH','LORENA','LORENZO','LOURDES','LUAN','LUANA','LUCAS','LUCIA','LUCIANA','LUCIANO','LUCILA','LUCIO','LUCRECIA','LUIS','LUISA','LURDES','LUZ','MABEL','MACARENA','MADELEINE','MADELYN','MAGALY','MAGDALENA','MAICOL','MAIKOL','MANUEL','MANUELA','MARA','MARCELA','MARCELINO','MARCELO','MARCIA','MARCIO','MARCO','MARCOS','MARGARITA','MARIA','MARIANA','MARIANO','MARIBEL','MARICARMEN','MARICIELO','MARIEL','MARIELA','MARINA','MARIO','MARISOL','MARISSA','MARITZA','MARTA','MARTHA','MARTIN','MARTINA','MARY','MATEO','MATHEO','MATHIAS','MATIAS','MATTEO','MATTHEW','MAURA','MAURICIO','MAURO','MAX','MAXIMILIANO','MAXIMO','MAYCOL','MAYRA','MAYTE','MELANIE','MELANY','MELISA','MELISSA','MERCEDES','MIA','MICAELA','MICHAEL','MICHEL','MICHELLE','MIGUEL','MILAGROS','MILENA','MILTON','MIRIAM','MIRTHA','MISAEL','MOISES','MONICA','NADIA','NAHOMI','NAIR','NANCY','NAOMI','NATALIA','NATALIE','NATALY','NATASHA','NATHALIE','NATHALY','NEFTALI','NELIDA','NELSON','NESTOR','NICOLE','NICOLAS','NICOLL','NIDIA','NIEVES','NILDA','NILSON','NILVER','NILTON','NOE','NOEL','NOELIA','NOEMI','NORA','NORBERTO','NORMA','OCTAVIO','OLGA','OLIVER','OMAR','ORLANDO','OSCAR','OSWALDO','PABLO','PALOMA','PAMELA','PAOLA','PAOLO','PATRICIA','PATRICIO','PATRIZIA','PAUL','PAULA','PAULINA','PEDRO','PERCY','PIERO','PIERINA','PILAR','RAFAEL','RAFAELA','RAHUL','RAMIRO','RAMON','RAQUEL','RAUL','RAY','REBECA','REGINA','REINA','REMY','RENATA','RENATO','RENE','RENZO','REYNA','REYNALDO','RICARDO','RIGOBERTO','RITA','ROBERTO','ROBIN','ROCIO','RODRIGO','ROGER','ROLANDO','ROMAN','ROMEL','ROMINA','RONALD','ROQUE','ROSA','ROSALIA','ROSARIO','ROSAURA','ROSE','ROSMERY','ROSSANA','ROXANA','RUBEN','RUBI','RUDY','RUTH','SABINA','SABRINA','SALOMON','SALVADOR','SAMANTHA','SAMIR','SAMUEL','SANDRA','SANDRO','SANTIAGO','SANTINO','SANTOS','SARA','SARITA','SAUL','SAYURI','SEBASTIAN','SEGUNDO','SERGIO','SHANDY','SHARON','SHEILA','SHERLYN','SHIRLEY','SILVANA','SILVIA','SILVIO','SIMON','SINDY','SIOMARA','SOCORRO','SOFIA','SOL','SOLANGE','SONIA','SOPHIA','SOPHIE','SOPHYA','STEFANO','STEPHANIE','STEPHANY','SUSAN','SUSANA','TALIA','TANIA','TATIANA','TEODORO','TEOFILO','TERESA','THALIA','THIAGO','TIAGO','TOMMY','TRAVIS','UBALDO','ULISES','VALENTINA','VALENTINO','VALERIA','VALERIE','VALERIO','VANESA','VANESSA','VERA','VERONICA','VICENTE','VICTOR','VICTORIA','VILMA','VINICIO','VIOLETA','VIRGILIO','VIRGINIA','VIVIAN','VIVIANA','WAGNER','WALDIR','WALTER','WASHINGTON','WENDY','WILDER','WILFREDO','WILLIAM','WILLIAMS','WILLY','WILMER','WILSON','XIOMARA','YADIRA','YAHIR','YAJAIRA','YAMIL','YAMILE','YAMILETH','YANET','YANIRA','YARID','YARIXA','YARIXSA','YASMIN','YAZMIN','YELITZA','YENIFER','YENNY','YESENIA','YESSENIA','YIMMY','YOHANA','YOLANDA','YONATAN','YORDAN','YOSHUA','YOSSELIN','YOVER','YOVANI','YSAIAS','YSABEL','YUDITH','YULI','YULIETH','YULISSA','YURI','YURIKO','ZAHIR','ZAIDA','ZARELA','ZORAIDA','ZULEMA'
]);

function cleanWordForDict(w) {
  return (w || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
}

/**
 * Convierte una cadena de nombres sin estructurar al formato estándar institucional: APELLIDOS, Nombres
 */
function splitRawNameToApellidosNombres(str) {
  const s = (str || '').trim();
  if (!s) return '';
  if (s.includes(',')) {
    const parts = s.split(',');
    return `${parts[0].trim().toUpperCase()}, ${toTitleCase(parts.slice(1).join(',').trim())}`;
  }

  const words = s.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return toTitleCase(s);
  if (words.length === 2) {
    const w1Clean = cleanWordForDict(words[0]);
    const w2Clean = cleanWordForDict(words[1]);
    if (COMMON_GIVEN_NAMES.has(w1Clean) && !COMMON_GIVEN_NAMES.has(w2Clean)) {
      // Nombres Apellidos: e.g. "Evelyn Aguirre" -> "AGUIRRE, Evelyn"
      return `${words[1].toUpperCase()}, ${toTitleCase(words[0])}`;
    }
    // Asume orden Apellidos Nombres: e.g. "Castro Duané" -> "CASTRO, Duané"
    return `${words[0].toUpperCase()}, ${toTitleCase(words[1])}`;
  }

  // Si tiene 3 o más palabras (e.g. "SOPHYA VALENTINA PAUCAR CARHUAZ" o "ENRIQUEZ CASTRO DUANÉ")
  const firstWordClean = cleanWordForDict(words[0]);
  const lastWordClean = cleanWordForDict(words[words.length - 1]);

  if (COMMON_GIVEN_NAMES.has(firstWordClean)) {
    // Viene en orden NOMBRES APELLIDOS (los 2 últimos son apellidos paterno y materno)
    const aps = words.slice(-2).join(' ').toUpperCase();
    const noms = toTitleCase(words.slice(0, -2).join(' '));
    return `${aps}, ${noms}`;
  }

  if (COMMON_GIVEN_NAMES.has(lastWordClean)) {
    // Viene en orden APELLIDOS NOMBRES (los 2 primeros son apellidos)
    const aps = words.slice(0, 2).join(' ').toUpperCase();
    const noms = toTitleCase(words.slice(2).join(' '));
    return `${aps}, ${noms}`;
  }

  // Heurística por defecto para 4 palabras: asume 2 apellidos al inicio o final
  if (words.length >= 4) {
    const aps = words.slice(-2).join(' ').toUpperCase();
    const noms = toTitleCase(words.slice(0, -2).join(' '));
    return `${aps}, ${noms}`;
  }

  // 3 palabras por defecto: 1er palabra nombre, 2 últimas apellidos
  const aps = words.slice(1).join(' ').toUpperCase();
  const noms = toTitleCase(words[0]);
  return `${aps}, ${noms}`;
}

/**
 * CONSTANTE: Si es true, el campo "Apellidos" es obligatorio en el formulario
 * de registro de concursos (nuevos registros). Cambiar a false para hacerlo opcional.
 */
export const APELLIDOS_OBLIGATORIO = true;

/**
 * Formatea el nombre de una persona al nuevo estándar institucional: APELLIDOS NOMBRES
 * (todo en MAYÚSCULAS, sin coma, una sola línea).
 *
 * Reglas (en orden de prioridad):
 *  1. Registro estructurado (tiene apellidos y nombres separados):
 *     → `APELLIDOS NOMBRES` (todo MAYÚSCULAS, sin coma)
 *  2. Registro heredado con apellidos lleno pero nombres como texto libre:
 *     → `APELLIDOS TEXTO_HEREDADO` (todo MAYÚSCULAS, sin coma)
 *  3. Registro heredado sin apellidos (solo campo nombres con texto libre):
 *     → mostrar el texto tal cual en MAYÚSCULAS, SIN reordenar ni "adivinar"
 *
 * IMPORTANTE: esta función NO aplica la heurística de separación automática.
 * La heurística `splitRawNameToApellidosNombres` solo se usa en el Asistente
 * de Separación de Nombres (para proponer, nunca para guardar automáticamente).
 *
 * @param {Object|string} persona - Objeto persona {nombres, apellidos} o string heredado
 * @returns {string}
 */
export function formatearNombre(persona) {
  if (!persona) return '';

  // Si se pasa un string directamente (registro muy antiguo) → mostrar tal cual en mayúsculas
  if (typeof persona === 'string') {
    return persona.trim().toUpperCase();
  }

  const nombres   = (persona.nombres   || '').trim();
  const apellidos = (persona.apellidos || '').trim();

  // Caso 1 & 2: tiene apellidos → APELLIDOS NOMBRES (sin coma)
  if (apellidos && nombres) {
    return `${apellidos.toUpperCase()} ${nombres.toUpperCase()}`;
  }
  if (apellidos && !nombres) {
    return apellidos.toUpperCase();
  }
  // Caso 3: solo texto heredado en el campo "nombres" → mostrar tal cual en mayúsculas
  if (!apellidos && nombres) {
    return nombres.toUpperCase();
  }
  return '';
}

/**
 * Propone la separación de un texto heredado en {nombres, apellidos}.
 * Solo para uso en el Asistente de Separación — NUNCA para guardar automáticamente.
 * Devuelve { nombres, apellidos, confianza: 'alta' | 'baja' }
 * @param {Object} persona - {nombres (texto heredado), apellidos (podría tener valor)}
 */
export function proponerSeparacionNombre(persona) {
  const textHeredado = (persona.nombres   || '').trim();
  const apHeredado   = (persona.apellidos || '').trim();

  // Confianza alta: ya tiene apellidos separados en el campo antiguo
  if (apHeredado && textHeredado) {
    // Verificar si el apellido heredado ya aparece dentro del texto heredado
    const apNorm = apHeredado.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const txNorm = textHeredado.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const apYaIncluido = txNorm.includes(apNorm);
    return {
      nombres:   apYaIncluido ? textHeredado.replace(new RegExp(apHeredado, 'i'), '').trim() : textHeredado,
      apellidos: apHeredado,
      confianza: 'alta',
      nota: apYaIncluido ? 'El apellido heredado ya estaba en el texto completo.' : ''
    };
  }

  // Confianza baja: solo texto libre, aplicar la heurística como sugerencia
  if (!apHeredado && textHeredado) {
    const sugerido = splitRawNameToApellidosNombres(textHeredado);
    // La heurística devuelve "APELLIDOS, Nombres" — separar por coma
    const commaParts = sugerido.split(',');
    if (commaParts.length === 2) {
      return {
        nombres:   commaParts[1].trim(),
        apellidos: commaParts[0].trim(),
        confianza: 'baja',
        nota: 'Sugerencia automática — verifica antes de guardar.'
      };
    }
    return { nombres: textHeredado, apellidos: '', confianza: 'baja', nota: 'No se pudo separar automáticamente.' };
  }

  return { nombres: '', apellidos: '', confianza: 'baja', nota: '' };
}

/**
 * Formatea el nombre de una persona para presentación en reportes.
 * Delega en `formatearNombre` respetando el formato unificado institucional:
 * APELLIDOS NOMBRES en mayúsculas, sin coma y sin adivinanzas heurísticas.
 */
export function formatPersonName(person) {
  return formatearNombre(person);
}

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

/* =========================================================================
   PALETA ESTÁNDAR INSTITUCIONAL Y MODALIDADES OFICIALES
   ========================================================================= */
export const PALETA_ESTANDAR = {
  navy: '#12294C',       // [18, 41, 76] Encabezados de tabla, cabecera de ficha, línea superior
  navyRgb: [18, 41, 76],
  title: '#0B1B36',      // [11, 27, 54] Título principal del acta
  titleRgb: [11, 27, 54],
  band: '#2E4A73',       // [46, 74, 115] Franja de grupo / sección
  bandRgb: [46, 74, 115],
  gold: '#E0A626',       // [224, 166, 38] Acento lateral de la franja / podio oro
  goldRgb: [224, 166, 38],
  goldText: '#B7791F',   // [183, 121, 31] Subtítulo oficial
  goldSoft: '#FDF6E3',   // [253, 246, 227] Fondo suave de cuerpo técnico / asesor
  goldSoftRgb: [253, 246, 227],
  kvLabel: '#EDF2F5',    // [237, 242, 245] Gris claro en etiquetas de la ficha
  kvLabelRgb: [237, 242, 245],
  kpiBg: '#F7FAFC',      // [247, 250, 252] Caja de indicadores (KPI)
  border: '#D9E1EA',     // [217, 225, 234] Bordes suaves
  borderRgb: [217, 225, 234],
  muted: '#5F6A7B',      // [95, 106, 123] Texto secundario
  mutedRgb: [95, 106, 123],
  altRow: '#F7FAFC',     // Fondo alterno de filas de participantes
  altRowRgb: [247, 250, 252],
  podioOro: '#D4A017',
  podioPlata: '#9EA7B3',
  podioBronce: '#B87333',
  podioOroBg: '#FEF9E7',
  podioPlataBg: '#F1F3F5',
  podioBronceBg: '#FAF0E6'
};

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
 * Verificación automática contra textos corruptos en el PDF
 */
export function verificarTextoPdf(texto, contexto = '') {
  if (texto === null || texto === undefined) return '';
  const s = String(texto);
  const prohibidos = ['[object Object]', 'undefined', 'NaN', 'null'];
  for (const p of prohibidos) {
    if (s.includes(p)) {
      const msg = `[PDF Check] Texto prohibido detectado ("${p}") en ${contexto || 'documento'}: "${s.slice(0, 100)}"`;
      console.warn(msg);
      if (typeof process !== 'undefined' && process.env?.NODE_ENV === 'test') {
        throw new Error(msg);
      }
    }
  }
  return s;
}

/**
 * Formatea y asegura guiones estándar en resoluciones oficiales en una sola línea.
 * Ejemplo: "RD N.° 05200-2026-UGEL03"
 */
export function formatResolucionRef(res) {
  if (!res) return '—';
  let s = String(res).trim();
  if (/^RD\s+(\d+)/i.test(s)) {
    s = s.replace(/^RD\s+/i, 'RD N.° ');
  } else if (/^RD\s*N\.?°?\s*/i.test(s)) {
    s = s.replace(/^RD\s*N\.?°?\s*/i, 'RD N.° ');
  }
  // Limpiar posibles caracteres de guion Unicode a ASCII estándar '-' para compatibilidad con fuentes Helvetica
  return s.replace(/[\u2010\u2011\u2012\u2013\u2014]/g, '-');
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
 * Dibuja el pie de página oficial en 2 líneas sin colisión ni superposiciones.
 * @param {Object} doc - Instancia de jsPDF
 * @param {Object} datos - Datos del documento y página
 */
export function dibujarPiePagina(doc, datos) {
  const {
    pageNumber,
    totalPagesExp,
    margin,
    pageW,
    pageH,
    emissionStr,
    docVerifCode,
    faltantes = [],
    qrDataUrl = null,
    isLastPage = false,
    marcaBorrador = false
  } = datos;

  if (marcaBorrador) {
    doc.saveGraphicsState && doc.saveGraphicsState();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(55);
    doc.setTextColor(220, 225, 235);
    doc.text('BORRADOR', pageW / 2, pageH / 2, { align: 'center', angle: 45 });
    doc.restoreGraphicsState && doc.restoreGraphicsState();
  }

  // Línea separadora
  doc.setDrawColor(227, 232, 239);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 28, pageW - margin, pageH - 28);

  const qrOffset = (qrDataUrl && isLastPage) ? 24 : 0;
  if (qrDataUrl && isLastPage) {
    try {
      doc.addImage(qrDataUrl, 'PNG', margin, pageH - 52, 20, 20);
    } catch (e) { }
  }

  // Línea 1 (izquierda: sistema y fecha; derecha: página)
  const line1Y = pageH - 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(138, 151, 168);
  const sysText = `Documento generado por el Sistema de Fichas de Monitoreo · UGEL 03 · Emitido el ${emissionStr}`;
  doc.text(sysText, margin + qrOffset, line1Y);

  const pageStr = `Página ${pageNumber} de ${totalPagesExp}`;
  doc.text(pageStr, pageW - margin, line1Y, { align: 'right' });

  // Línea 2 (izquierda: código de verificación y datos pendientes si los hay)
  const line2Y = pageH - 9;
  const verifText = `Cód. Verif: ${docVerifCode}`;
  doc.text(verifText, margin + qrOffset, line2Y);

  if (faltantes && faltantes.length > 0) {
    const verifWidth = doc.getTextWidth(verifText);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9); // Ámbar oscuro #B45309 para aviso constructivo
    const faltantesText = `  ·  Datos por completar: ${faltantes.join(' · ')}`;
    doc.text(faltantesText, margin + qrOffset + verifWidth, line2Y);
  }
}

/**
 * Genera un código de verificación único para el documento
 * Ejemplo: "UGEL03-2026-A7K92F"
 */
export function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `UGEL03-2026-${rand}`;
}

/**
 * Retorna la fecha y hora actual en zona horaria America/Lima (UTC-5)
 */
export function getCurrentDateTimeStr() {
  const now = new Date();
  const dStr = now.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
  const tStr = now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dStr} a las ${tStr}`;
}

/**
 * Retorna la fecha actual en formato YYYY-MM-DD en zona horaria America/Lima
 */
export function getLimaDateStr() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/**
 * Limpia y normaliza un texto para nombres de archivo seguros en ASCII (sin tildes ni ñ)
 */
export function sanitizeFilename(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

/**
 * Genera una imagen Data URL para un código QR usando QRCode.js si está disponible
 */
async function generateQrDataUrl(text) {
  if (typeof window === 'undefined' || typeof window.QRCode === 'undefined') return null;
  return new Promise((resolve) => {
    let container = null;
    try {
      container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);

      // Limitar a 150 caracteres para evitar overflow en librerías QRCode.js estándar
      const safeText = String(text || '').slice(0, 150);

      new window.QRCode(container, {
        text: safeText,
        width: 100,
        height: 100,
        colorDark: '#0B1B36',
        colorLight: '#FFFFFF',
        correctLevel: (window.QRCode && window.QRCode.CorrectLevel && window.QRCode.CorrectLevel.L) || 1
      });

      // Esperar un frame a que se genere el canvas o imagen
      setTimeout(() => {
        let dataUrl = null;
        try {
          const canvas = container.querySelector('canvas');
          if (canvas) {
            dataUrl = canvas.toDataURL('image/png');
          } else {
            const img = container.querySelector('img');
            if (img && img.src) dataUrl = img.src;
          }
        } catch (canvasErr) { }
        try {
          if (container && container.parentNode) {
            document.body.removeChild(container);
          }
        } catch (domErr) { }
        resolve(dataUrl);
      }, 50);
    } catch (e) {
      try {
        if (container && container.parentNode) {
          document.body.removeChild(container);
        }
      } catch (domErr) { }
      resolve(null);
    }
  });
}

/**
 * Función de concordancia gramatical dinámica (singular/plural)
 */
export function plural(n, singular, pluralForm) {
  const count = Number(n) || 0;
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

/**
 * Dibuja un visto bueno vectorial (✓) centrado, nítido y 100% independiente de fuentes
 */
export function drawVectorCheckmark(doc, centerX, centerY, size = 9, color = [5, 150, 105], lineWidth = 1.3) {
  doc.saveGraphicsState && doc.saveGraphicsState();
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(lineWidth);
  doc.setLineCap && doc.setLineCap('round');
  doc.setLineJoin && doc.setLineJoin('round');

  const x1 = centerX - size * 0.38;
  const y1 = centerY - size * 0.05;
  const x2 = centerX - size * 0.08;
  const y2 = centerY + size * 0.32;
  const x3 = centerX + size * 0.42;
  const y3 = centerY - size * 0.38;

  doc.line(x1, y1, x2, y2);
  doc.line(x2, y2, x3, y3);
  doc.restoreGraphicsState && doc.restoreGraphicsState();
}

/**
 * Dibuja una casilla de verificación vectorial ☒ o ☐ con borde nítido y relleno opcional
 */
export function drawVectorCheckbox(doc, x, y, size = 8.5, checked = false, mark = 'X', color = [15, 27, 45]) {
  doc.saveGraphicsState && doc.saveGraphicsState();
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(0.75);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, size, size, 'FD');

  if (checked) {
    if (mark === '✓') {
      drawVectorCheckmark(doc, x + size / 2, y + size / 2, size * 0.85, [5, 150, 105], 1.15);
    } else {
      // Cruz 'X'
      doc.setLineWidth(1.1);
      doc.line(x + 1.8, y + 1.8, x + size - 1.8, y + size - 1.8);
      doc.line(x + size - 1.8, y + 1.8, x + 1.8, y + size - 1.8);
    }
  }
  doc.restoreGraphicsState && doc.restoreGraphicsState();
}

/**
 * Carga e incrusta la fuente Unicode (Liberation Sans) en el VFS de jsPDF para soporte completo
 * de tildes, eñes, símbolos (≥, —, ·, °) y compatibilidad métrica idéntica con Helvetica/Arial.
 */
export async function ensureUnicodeFont(doc) {
  if (typeof window === 'undefined') return;
  if (window.__unicodeFontsLoaded) {
    try {
      doc.addFileToVFS('LiberationSans-Regular.ttf', window.__unicodeFontRegular);
      doc.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal');
      doc.addFileToVFS('LiberationSans-Bold.ttf', window.__unicodeFontBold);
      doc.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold');
      doc.setFont('LiberationSans');
      return;
    } catch (e) { }
  }

  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('./fonts/LiberationSans-Regular.ttf'),
      fetch('./fonts/LiberationSans-Bold.ttf')
    ]);

    if (regRes.ok && boldRes.ok) {
      const [regBuf, boldBuf] = await Promise.all([
        regRes.arrayBuffer(),
        boldRes.arrayBuffer()
      ]);

      const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
      };

      window.__unicodeFontRegular = arrayBufferToBase64(regBuf);
      window.__unicodeFontBold = arrayBufferToBase64(boldBuf);
      window.__unicodeFontsLoaded = true;

      doc.addFileToVFS('LiberationSans-Regular.ttf', window.__unicodeFontRegular);
      doc.addFont('LiberationSans-Regular.ttf', 'LiberationSans', 'normal');
      doc.addFileToVFS('LiberationSans-Bold.ttf', window.__unicodeFontBold);
      doc.addFont('LiberationSans-Bold.ttf', 'LiberationSans', 'bold');
      doc.setFont('LiberationSans');
    }
  } catch (err) {
    // Si no está disponible en el entorno local/offline, se mantiene helvetica estándar
    console.warn('Uso de helvetica estándar como fallback tipográfico.');
  }
}

/**
 * Limpia y sanea cadenas para prevenir inyección de [object Object], undefined, NaN o glifos no soportados
 */
export function sanitizePdfText(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/\[object Object\]/g, '')
    .replace(/\bundefined\b/g, '')
    .replace(/\bNaN\b/g, '')
    .replace(/\bnull\b/g, '')
    .replace(/≥/g, '>='); // Garantiza que ≥ nunca se transforme en "e en codificaciones WinAnsi
}

/**
 * Dibuja el membrete oficial institucional (4 celdas grises + línea azul marino)
 * El 4.° recuadro es dinámico según el área elegida (áreaConfig).
 */
export function drawOfficialHeader(doc, pageW, margin, pageH, areaConfig = null, customTopY = null) {
  const headerY = customTopY !== null ? customTopY : margin;
  const headerH = 34;
  const colCount = 4;
  const colGap = 4;
  const totalGap = colGap * (colCount - 1);
  const colW = (pageW - 2 * margin - totalGap) / colCount;

  // 4.° recuadro dinámico según áreaConfig
  const areaSigla = (areaConfig && areaConfig.sigla) ? areaConfig.sigla : 'AGEBRE';
  const areaDesc = (areaConfig && areaConfig.descripcionEncabezado)
    ? areaConfig.descripcionEncabezado
    : ((areaConfig && areaConfig.nombre) ? areaConfig.nombre : 'Área de Gestión de la\nEducación Básica (2026)');

  const headerCells = [
    ['PERÚ', 'Ministerio de\nEducación'],
    ['DRELM', 'Dirección Regional de\nEducación de Lima Metrop.'],
    ['UGEL 03', 'Unidad de Gestión\nEducativa Local N.° 03'],
    [areaSigla, areaDesc]
  ];

  doc.setFont('helvetica', 'bold');
  headerCells.forEach((cell, idx) => {
    const x = margin + idx * (colW + colGap);

    // Fondo gris claro
    doc.setFillColor(238, 241, 245); // #EEF1F5
    doc.setDrawColor(211, 221, 231); // #D3DDD7
    doc.setLineWidth(0.5);
    doc.roundedRect(x, headerY, colW, headerH, 2, 2, 'FD');

    // Si es el 4.° recuadro y tiene un logo personalizado en base64/URL
    if (idx === 3 && areaConfig && areaConfig.logo) {
      try {
        doc.addImage(areaConfig.logo, 'PNG', x + 4, headerY + 4, 26, 26);
        doc.setFontSize(7.5);
        doc.setTextColor(11, 27, 54);
        doc.text(cell[0], x + 34, headerY + 11);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(91, 107, 128);
        doc.text(cell[1], x + 34, headerY + 19, { lineHeightFactor: 1.15 });
        doc.setFont('helvetica', 'bold');
        return;
      } catch (e) {
        // Fallback a texto normal
      }
    }

    // Texto de la celda
    doc.setFontSize(7.5);
    doc.setTextColor(11, 27, 54); // #0B1B36
    doc.text(cell[0], x + colW / 2, headerY + 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(91, 107, 128); // #5B6B80
    doc.text(cell[1], x + colW / 2, headerY + 19, { align: 'center', lineHeightFactor: 1.15 });
    doc.setFont('helvetica', 'bold');
  });

  // Línea gruesa azul marino debajo del membrete
  const lineY = headerY + headerH + 6;
  doc.setDrawColor(18, 41, 77); // #12294D
  doc.setLineWidth(2.5);
  doc.line(margin, lineY, pageW - margin, lineY);

  return lineY + 16;
}

/**
 * Plantilla base para generar cualquier documento PDF oficial
 */
export async function createOfficialPdfDocument({
  title = 'DOCUMENTO OFICIAL',
  subtitle = 'Monitoreo y Acompañamiento 2026 · UGEL 03',
  orientation = 'portrait', // 'portrait' | 'landscape'
  introParagraph = '',
  soloEncabezadoPagina1 = false,
  metaGrid = [], // Array de { label, value, note }
  tableHeaders = [],
  tableRows = [],
  columnStyles = {},
  tableStyles = {},
  customTables = [], // Array de { title, subtitle, minHeight, pageBreak, beforeDraw, tableHeaders, tableRows, columnStyles, didDrawCell, didParseCell, styles, headStyles, alternateRowStyles }
  renderCustomTable = null, // Función personalizada de renderizado de tabla (ej: JEDPA continuo)
  summarySections = [], // { title, content }
  signatures = [], // Array de { cargo, nombre, entidad, leyenda }
  lugarFecha = '', // Texto de lugar y fecha para firmas (ej: "Lima, 19 de septiembre de 2026")
  sinFirmas = false, // Opción de no imprimir bloque de firmas
  areaConfig = null, // Configuración del área de firma
  incluirQr = true, // Generar y adjuntar código QR de verificación
  verificationCode = null, // Código predefinido o auto-generado
  datosIncompletos = false, // Marca de alerta en pie si se descargó con datos pendientes
  marcaBorrador = false, // Marca de agua BORRADOR muy tenue
  filename = 'documento_oficial.pdf'
}) {
  const jsPDF = getJsPdf();
  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'l' : 'p',
    unit: 'pt',
    format: 'a4'
  });

  // Asegurar tipografía Unicode incrustada (Liberation Sans / Arimo)
  const unicodeReady = await ensureUnicodeFont(doc);
  const baseFont = unicodeReady ? 'LiberationSans' : 'helvetica';

  const totalPagesExp = '{total_pages_count_string}';
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = orientation === 'landscape' ? 36 : 42; // ~13mm a 15mm
  const CONTENT_WIDTH = pageW - 2 * margin;

  const headerTopY = (soloEncabezadoPagina1) ? (orientation === 'landscape' ? 24 : 26) : margin;
  const headerBottomY = headerTopY + 34 + 6; // Posición inferior de la línea azul del encabezado
  const topMarginSubsequent = soloEncabezadoPagina1 ? (orientation === 'landscape' ? 32 : 36) : (headerBottomY + 16);

  // Código de verificación oficial
  const docVerifCode = verificationCode || generateVerificationCode();

  // Metadatos oficiales del PDF
  const areaAuthor = (areaConfig && areaConfig.sigla) ? `${areaConfig.sigla} · UGEL 03` : 'UGEL 03 – AGEBRE';
  doc.setProperties({
    title: title,
    subject: subtitle || 'Documento Oficial de la UGEL N.° 03',
    author: areaAuthor,
    keywords: 'UGEL 03, MINEDU, Monitoreo, Concursos, 2026, Lima Metropolitana',
    creator: 'Sistema de Fichas de Monitoreo · UGEL 03'
  });

  // Generar QR si está habilitado
  let qrDataUrl = null;
  if (incluirQr) {
    const qrPayload = `UGEL 03 - MINEDU\nDoc: ${title}\nEmitido: ${getLimaDateStr()}\nCódigo: ${docVerifCode}`;
    qrDataUrl = await generateQrDataUrl(qrPayload);
  }

  // 1. Control para garantizar que el membrete oficial se dibuje una sola vez por página
  const drawnHeaderPages = new Set();
  const safeDrawHeader = (pageNumber) => {
    const p = pageNumber || (doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : 1);
    if (!drawnHeaderPages.has(p)) {
      drawnHeaderPages.add(p);
      if (soloEncabezadoPagina1 && p > 1) {
        return topMarginSubsequent;
      }
      const customTopY = (soloEncabezadoPagina1 && p === 1) ? headerTopY : null;
      return drawOfficialHeader(doc, pageW, margin, pageH, areaConfig, customTopY);
    }
    return (soloEncabezadoPagina1 && p > 1) ? topMarginSubsequent : (headerBottomY + 16);
  };

  let curY = safeDrawHeader(1);

  // 2. Título centrado en mayúsculas y negrita (con espacio adecuado desde la línea azul)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 27, 54); // #0B1B36
  const splitTitle = doc.splitTextToSize(title.toUpperCase(), pageW - 2 * margin);
  doc.text(splitTitle, pageW / 2, curY, { align: 'center' });
  curY += splitTitle.length * 15;

  // 3. Subtítulo centrado
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(183, 121, 31); // Dorado institucional (#B7791F / #E0A526)
    doc.text(subtitle, pageW / 2, curY, { align: 'center' });
    curY += 16;
  }

  // Línea divisoria suave
  doc.setDrawColor(227, 232, 239);
  doc.setLineWidth(0.75);
  doc.line(margin + 40, curY, pageW - margin - 40, curY);
  curY += 14;

  // 4. Párrafo introductorio (respetando ancho imprimible estricto)
  if (introParagraph) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 27, 45); // #0F1B2D
    const splitIntro = doc.splitTextToSize(introParagraph, pageW - 2 * margin);
    doc.text(splitIntro, margin, curY, { maxWidth: pageW - 2 * margin, lineHeightFactor: 1.25 });
    curY += splitIntro.length * 11 + 12;
  }

  // 5. Cuadrícula de metadatos (tarjetas de resumen)
  if (metaGrid && metaGrid.length > 0) {
    const boxW = pageW - 2 * margin;
    const numItems = metaGrid.length;

    // Distribución proporcional de anchos para evitar solapamientos
    const hasCustomRatios = metaGrid.some(item => typeof item.widthRatio === 'number' && item.widthRatio > 0);
    let ratios;
    if (hasCustomRatios) {
      const sum = metaGrid.reduce((acc, it) => acc + (it.widthRatio || (1 / numItems)), 0);
      ratios = metaGrid.map(it => (it.widthRatio || (1 / numItems)) / sum);
    } else if (numItems === 4 && metaGrid[0].label && metaGrid[0].label.toLowerCase().includes('concurso')) {
      // 44% Concurso Educativo, 14% Etapa, 20% Total Registros, 22% Instituciones
      ratios = [0.44, 0.14, 0.20, 0.22];
    } else {
      ratios = metaGrid.map(() => 1 / numItems);
    }

    // Pre-calcular posiciones horizontales y ajustar textos con wrap estricto
    let colAccX = margin;
    const preparedItems = metaGrid.map((item, idx) => {
      const colW = boxW * ratios[idx];
      const colX = colAccX;
      colAccX += colW;

      // Margen de seguridad interno para el texto
      const maxTextW = Math.max(20, colW - 14);

      doc.setFont(baseFont || 'helvetica', 'bold');
      doc.setFontSize(7);
      const labelLines = doc.splitTextToSize((item.label || '').toUpperCase(), maxTextW);

      doc.setFont(baseFont || 'helvetica', 'normal');
      doc.setFontSize(8.5);
      const valStr = String(item.value !== undefined && item.value !== null ? item.value : '—');
      const valueLines = doc.splitTextToSize(valStr, maxTextW);

      let noteLines = [];
      if (item.note) {
        doc.setFontSize(6.5);
        noteLines = doc.splitTextToSize(item.note, maxTextW);
      }

      return {
        colX,
        colW,
        maxTextW,
        labelLines,
        valueLines,
        noteLines,
        item
      };
    });

    // Calcular altura dinámica de la tarjeta (boxH) si el texto ocupa más de 1 línea
    let maxContentBottom = 34;
    preparedItems.forEach(p => {
      const valStartY = 11 + (p.labelLines.length * 8) + 3;
      const valEndY = valStartY + ((p.valueLines.length - 1) * 9.5);
      let itemBottom = valEndY + 4;
      if (p.noteLines.length > 0) {
        const noteStartY = Math.max(valEndY + 8, 30);
        itemBottom = noteStartY + ((p.noteLines.length - 1) * 7.5) + 4;
      }
      if (itemBottom > maxContentBottom) {
        maxContentBottom = itemBottom;
      }
    });

    const boxH = Math.max(34, Math.ceil(maxContentBottom));

    doc.setFillColor(247, 249, 252);
    doc.setDrawColor(227, 232, 239);
    doc.roundedRect(margin, curY, boxW, boxH, 3, 3, 'FD');

    preparedItems.forEach(p => {
      const textX = p.colX + 7;

      // Etiqueta
      doc.setFont(baseFont || 'helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(91, 107, 128);
      let labelY = curY + 11;
      p.labelLines.forEach(line => {
        doc.text(line, textX, labelY);
        labelY += 8;
      });

      // Valor
      doc.setFont(baseFont || 'helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(11, 27, 54);
      let valY = curY + 11 + (p.labelLines.length * 8) + 3;
      if (p.labelLines.length === 1) valY = curY + 22;
      p.valueLines.forEach(line => {
        doc.text(line, textX, valY);
        valY += 9.5;
      });

      // Nota (si existe)
      if (p.noteLines.length > 0) {
        doc.setFontSize(6.5);
        doc.setTextColor(138, 151, 168);
        let noteY = (p.valueLines.length === 1 && p.labelLines.length === 1)
          ? (curY + 30)
          : (valY - 9.5 + 8);
        p.noteLines.forEach(line => {
          doc.text(line, textX, noteY);
          noteY += 7.5;
        });
      }
    });
    curY += boxH + 10;
  }

  // 6. Tablas principales mediante autoTable (soporte para renderCustomTable, customTables múltiples o tabla única)
  if (typeof renderCustomTable === 'function') {
    curY = await renderCustomTable({
      doc,
      curY,
      pageW,
      pageH,
      margin,
      CONTENT_WIDTH,
      headerBottomY,
      safeDrawHeader,
      baseFont
    });
  } else if (customTables && customTables.length > 0) {
    if (typeof doc.autoTable !== 'function') {
      console.warn('doc.autoTable no está disponible.');
    } else {
      for (const t of customTables) {
        const neededSpace = t.minHeight || (t.tableHeaders && t.tableRows ? 80 : 40);
        if (t.pageBreak === 'before' || curY + neededSpace > pageH - 50) {
          doc.addPage();
          if (!soloEncabezadoPagina1) {
            safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
            curY = headerBottomY + 16;
          } else {
            curY = topMarginSubsequent;
          }
        }

        if (t.title) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.setTextColor(18, 41, 77);
          doc.text(t.title, margin, curY);
          curY += 13;
        }

        if (t.subtitle) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(91, 107, 128);
          const splitSub = doc.splitTextToSize(t.subtitle, pageW - 2 * margin);
          doc.text(splitSub, margin, curY);
          curY += splitSub.length * 9.5 + 4;
        }

        if (typeof t.beforeDraw === 'function') {
          const resY = t.beforeDraw(doc, curY, pageW, margin, pageH, headerBottomY);
          if (typeof resY === 'number') curY = resY;
        }

        if ((t.head || t.tableHeaders) && t.tableRows && t.tableRows.length > 0) {
          doc.autoTable({
            head: t.head ? t.head : (Array.isArray(t.tableHeaders[0]) ? t.tableHeaders : [t.tableHeaders]),
            body: t.tableRows,
            startY: curY,
            margin: { left: margin, right: margin, top: soloEncabezadoPagina1 ? (orientation === 'landscape' ? 32 : 36) : (headerBottomY + 14), bottom: 42 },
            tableWidth: t.tableWidth || 'auto',
            theme: 'plain',
            rowPageBreak: t.rowPageBreak || 'avoid',
            showHead: t.showHead || 'everyPage',
            styles: Object.assign({
              font: baseFont,
              fontSize: orientation === 'landscape' ? 7.5 : 8,
              cellPadding: { top: 4.5, right: 5, bottom: 4.5, left: 5 },
              lineColor: [227, 232, 239],
              lineWidth: 0.5,
              textColor: [15, 27, 45],
              overflow: 'linebreak'
            }, t.styles || {}),
            headStyles: Object.assign({
              fillColor: [18, 41, 77],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              halign: 'center',
              valign: 'middle',
              fontSize: orientation === 'landscape' ? 8 : 8.5
            }, t.headStyles || {}),
            alternateRowStyles: Object.assign({
              fillColor: [247, 249, 252]
            }, t.alternateRowStyles || {}),
            columnStyles: t.columnStyles || {},
            didDrawCell: t.didDrawCell || null,
            didParseCell: (data) => {
              if (data.cell) {
                if (Array.isArray(data.cell.text)) {
                  data.cell.text = data.cell.text.map(txt => sanitizePdfText(txt));
                } else if (typeof data.cell.text === 'string') {
                  data.cell.text = sanitizePdfText(data.cell.text);
                }
              }
              if (typeof t.didParseCell === 'function') {
                t.didParseCell(data);
              }
            },
            didDrawPage: (data) => {
              if (data.pageNumber > 1 && !soloEncabezadoPagina1) {
                safeDrawHeader(data.pageNumber);
              }
            }
          });
          curY = doc.lastAutoTable.finalY + 16;
        }
      }
    }
  } else if (tableHeaders.length > 0 && tableRows.length > 0) {
    if (typeof doc.autoTable !== 'function') {
      console.warn('doc.autoTable no está disponible.');
    } else {
      doc.autoTable({
        head: [tableHeaders],
        body: tableRows,
        startY: curY,
        margin: { left: margin, right: margin, top: soloEncabezadoPagina1 ? (orientation === 'landscape' ? 32 : 36) : (headerBottomY + 14), bottom: 42 },
        tableWidth: tableStyles.tableWidth || 'auto',
        theme: 'plain',
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
        styles: Object.assign({
          font: baseFont,
          fontSize: orientation === 'landscape' ? 7.5 : 8,
          cellPadding: { top: 5, right: 5, bottom: 5, left: 5 },
          lineColor: [227, 232, 239],
          lineWidth: 0.5,
          textColor: [15, 27, 45],
          overflow: 'linebreak',
        }, tableStyles || {}),
        headStyles: {
          fillColor: [18, 41, 77], // #12294D
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: orientation === 'landscape' ? 8 : 8.5,
        },
        alternateRowStyles: {
          fillColor: [247, 249, 252], // #F7F9FC
        },
        columnStyles: columnStyles,
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
          // Membrete oficial en páginas subsecuentes
          if (data.pageNumber > 1 && !soloEncabezadoPagina1) {
            safeDrawHeader(data.pageNumber);
          }
        }
      });

      curY = doc.lastAutoTable.finalY + 18;
    }
  }

  // 7. Secciones de resumen / compromisos / observaciones
  if (summarySections && summarySections.length > 0) {
    summarySections.forEach(sec => {
      const splitSec = doc.splitTextToSize(sec.content, pageW - 2 * margin);
      const neededH = 16 + (splitSec.length * 11) + 14;
      if (curY + neededH > pageH - 46) {
        doc.addPage();
        if (!soloEncabezadoPagina1) {
          safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
          curY = headerBottomY + 16;
        } else {
          curY = topMarginSubsequent;
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(18, 41, 77);
      doc.text(sec.title.toUpperCase(), margin, curY);
      curY += 13;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 27, 45);
      doc.text(splitSec, margin, curY, { align: 'left', maxWidth: pageW - 2 * margin, lineHeightFactor: 1.25 });
      curY += splitSec.length * 10 + 14;
    });
  }

  // 8. Bloque de firmas (dinámico, 1–6 firmantes, keep-together)
  if (!sinFirmas && signatures && signatures.length > 0) {
    const sigCount = Math.min(signatures.length, 6);
    const isTwoRows = sigCount >= 5;
    const rowsCount = isTwoRows ? 2 : 1;
    const rowHeight = 72; // Espacio para firma (22mm ~ 62pt) + textos
    const sigBlockHeight = (lugarFecha ? 20 : 0) + (rowsCount * rowHeight) + 15;

    // Regla "keep-together": si no cabe en la página actual, pasar a una nueva
    if (curY + sigBlockHeight > pageH - 42) {
      doc.addPage();
      safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
      curY = headerBottomY + 18;
    } else {
      curY += 12;
    }

    // Lugar y fecha sobre las firmas
    if (lugarFecha) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(91, 107, 128);
      doc.text(lugarFecha, margin, curY);
      curY += 18;
    }

    // Dibujar firmantes (1 fila si <= 4; 2 filas si 5 o 6)
    const drawRow = (rowSignatures, startY) => {
      const count = rowSignatures.length;
      const totalW = pageW - 2 * margin;

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
        const lineSigY = startY + 40;

        // Línea de firma (0.5 pt)
        doc.setDrawColor(138, 151, 168);
        doc.setLineWidth(0.5);
        doc.line(x + 10, lineSigY, x + colW - 10, lineSigY);

        let textY = lineSigY + 10;

        // Nombre (negrita, si existe)
        if (sig.nombre) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(11, 27, 54);
          doc.text(formatPersonName(sig.nombre), x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
          textY += 10;
        }

        // Cargo (negrita)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(11, 27, 54);
        const splitCargo = doc.splitTextToSize(sig.cargo || 'Responsable', colW - 10);
        doc.text(splitCargo, x + colW / 2, textY, { align: 'center' });
        textY += splitCargo.length * 9;

        // Entidad / Área (gris, 7.5 pt)
        if (sig.entidad || sig.institucion) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(91, 107, 128);
          doc.text(sig.entidad || sig.institucion, x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
          textY += 9;
        }

        // Leyenda (cursiva, gris)
        if (sig.leyenda) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
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

  // 9. Pie de página en todas las hojas con código de verificación y QR
  const pageCount = doc.internal.getNumberOfPages();
  const emissionStr = getCurrentDateTimeStr();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Marca de agua "BORRADOR" si está habilitada
    if (marcaBorrador) {
      doc.saveGraphicsState && doc.saveGraphicsState();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(55);
      doc.setTextColor(220, 225, 235);
      // Rotar y centrar texto borrador
      const rad = 45 * Math.PI / 180;
      doc.text('BORRADOR', pageW / 2, pageH / 2, {
        align: 'center',
        angle: 45
      });
      doc.restoreGraphicsState && doc.restoreGraphicsState();
    }

    // Línea divisoria del pie
    doc.setDrawColor(227, 232, 239);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 26, pageW - margin, pageH - 26);

    // QR en la esquina inferior izquierda (si está habilitado)
    if (qrDataUrl && i === pageCount) {
      try {
        doc.addImage(qrDataUrl, 'PNG', margin, pageH - 52, 22, 22);
      } catch (e) {
        // Fallback silencioso
      }
    }

    doc.setFont(baseFont, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(138, 151, 168); // #8A97A8

    const qrOffset = (qrDataUrl && i === pageCount) ? 26 : 0;
    const footerLeft = `Documento generado por el Sistema de Fichas de Monitoreo · UGEL 03 · Emitido el ${emissionStr} · Cód. Verif: ${docVerifCode}`;
    let footerRight = `Página ${i} de ${totalPagesExp}`;
    if (datosIncompletos) {
      footerRight = `[ ! Datos incompletos ] · ${footerRight}`;
    }

    const availW = (pageW - 2 * margin) - qrOffset;
    const leftW = doc.getTextWidth(footerLeft);
    const rightW = doc.getTextWidth(footerRight);

    if (leftW + rightW + 20 <= availW) {
      doc.text(footerLeft, margin + qrOffset, pageH - 14);
      doc.text(footerRight, pageW - margin, pageH - 14, { align: 'right' });
    } else {
      // Si no caben en una línea, disponer en dos líneas para evitar superposición
      doc.text(footerLeft, margin + qrOffset, pageH - 17);
      doc.text(footerRight, pageW - margin, pageH - 8, { align: 'right' });
    }
  }

  // Reemplazar total_pages_count_string
  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  // Guardar archivo
  doc.save(filename);
}

/**
 * Exporta una Ficha de Monitoreo Individual a PDF en orientación VERTICAL (Portrait)
 */
/**
 * Textos oficiales verbatim de los 21 ítems de la Ficha de Monitoreo al Directivo de IE
 * Fuente: Instrumento oficial UGEL 03 / MINEDU 2026
 */
export const OFFICIAL_DIRECTIVO_ITEMS = {
  1: "La IE cuenta con instrumentos de gestión aprobados mediante RD y evidencia la articulación entre el PEI y el PAT, de modo que el diagnóstico, los objetivos y las metas institucionales se traducen en acciones planificadas para el año escolar.",
  2: "El PCI de la IE se encuentra actualizado y contiene el Plan de Estudios y orientaciones para la planificación, mediación y evaluación formativa, en correspondencia con las características y necesidades de los estudiantes.",
  3: "El PAT de la IE articula los objetivos y metas del PEI con la programación de actividades para cada compromiso de gestión escolar y la calendarización de las horas lectivas.",
  4: "En la IE se cuenta con evidencia de seguimiento periódico a las actividades planificadas en el PAT y se registra su avance.",
  5: "En la IE se evalúa y se toman decisiones para mejorar o reajustar las actividades del PAT a partir de un proceso de evaluación continua.",
  6: "El directivo realiza seguimiento periódico a la estrategia de Refuerzo Escolar y verifica la implementación de las acciones previstas.",
  7: "El directivo implementa, realiza seguimiento y fortalece el uso de los materiales educativos (textos y cuadernos de trabajo entregados en el año en curso).",
  8: "El directivo planifica, da seguimiento y evalúa la implementación del Plan Lector de la IE.",
  9: "El directivo planifica, da seguimiento y evalúa la implementación del Proyecto Educativo Ambiental Integrado (PEAI) de la IE.",
  10: "El directivo planifica, implementa y evalúa la Gestión del Riesgo de Desastres (GRD) en la IE, incluyendo acciones de prevención, mitigación y preparación para la respuesta.",
  11: "Los docentes de la IE cuentan con la planificación de la unidad didáctica correspondiente al grado y sección a su cargo, vigente para el periodo en curso.",
  12: "Los docentes de la IE cuentan con la planificación de sus sesiones o actividades de aprendizaje correspondientes al grado y sección a su cargo, vigente para el periodo en curso y articulada con la unidad didáctica correspondiente.",
  13: "El directivo brinda asesoría pedagógica a los docentes para mejorar la planificación curricular, orientándola hacia el desarrollo de las competencias de los estudiantes.",
  14: "En la IE se promueve que los docentes realicen la planificación curricular de manera colegiada (programación anual y unidades didácticas) evidenciando acuerdos pedagógicos.",
  15: "En la IE se cuenta con un cronograma de monitoreo de la práctica pedagógica en el aula del presente año y se han ejecutado las visitas programadas.",
  16: "En la IE se organiza e interpreta la información obtenida a partir del monitoreo, identificando logros y oportunidades de mejora de la práctica pedagógica docente.",
  17: "En la IE se identifican, plantean e implementan propuestas de mejora que atienden las dificultades identificadas en la práctica pedagógica a partir del monitoreo.",
  18: "En la IE se realiza un diagnóstico de necesidades formativas docentes y se implementa al menos una acción de fortalecimiento que responde a una necesidad identificada en el diagnóstico.",
  19: "La IE planifica e implementa (o viene implementando) al menos un proyecto de innovación pedagógica formulado, cuyos resultados son verificables y se difunden a la comunidad educativa.",
  20: "El directivo gestiona la entrega oportuna de los informes de progreso de las competencias de los estudiantes que contienen el nivel de logro alcanzado en cada competencia y, cuando corresponde, las conclusiones descriptivas de los aprendizajes.",
  21: "En la IE se analizan los resultados de aprendizaje y, a partir de ellos, se implementan estrategias pedagógicas para la mejora de los aprendizajes."
};

export const OFFICIAL_DIRECTIVO_DIMENSIONS = [
  { id: 'A', nombre: 'A. INSTRUMENTOS DE GESTIÓN ESCOLAR', itemsCount: 5, startIdx: 1 },
  { id: 'B', nombre: 'B. IMPLEMENTACIÓN DE ESTRATEGIAS Y RECURSOS EDUCATIVOS', itemsCount: 5, startIdx: 6 },
  { id: 'C', nombre: 'C. PLANIFICACIÓN CURRICULAR', itemsCount: 4, startIdx: 11 },
  { id: 'D', nombre: 'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA', itemsCount: 3, startIdx: 15 },
  { id: 'E', nombre: 'E. FORMACIÓN CONTINUA E INNOVACIÓN EDUCATIVA', itemsCount: 2, startIdx: 18 },
  { id: 'F', nombre: 'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES', itemsCount: 2, startIdx: 20 }
];

/**
 * Exporta la Ficha oficial "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
 * reproduciendo con exactitud la ficha física institucional para Visita 1 o Visita 2.
 */
export async function exportEbrGestionFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  const visitaNum = Number(sub.visita) || 1;
  const isV1 = visitaNum === 1;
  const isV2 = visitaNum === 2;

  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const codLocal = (sub.ie && sub.ie.codigoLocal) || sub.codigoModular || (colegio ? (colegio.codigoLocal || colegio.codigoModular) : '') || '—';
  const red = (sub.ie && sub.ie.red) || sub.red || (colegio ? colegio.rei : '') || '—';
  const ugel = sub.ugel || 'UGEL 03';
  const formacionTecnica = (sub.ie && sub.ie.formacionTecnica !== undefined) ? sub.ie.formacionTecnica : (sub.formacionTecnica === true);

  const title = 'FICHA DE MONITOREO Y ASISTENCIA TÉCNICA A LA GESTIÓN ESCOLAR UGEL-03-EBR';
  const subtitle = `En el marco de la RM N.° 501-2025-MINEDU · ${isV1 ? 'Visita 1 (Primer momento)' : 'Visita 2 (Segundo momento)'}`;

  const metaGrid = [
    { label: 'INSTITUCIÓN EDUCATIVA', value: ieName },
    { label: 'CÓDIGO DE LOCAL', value: codLocal },
    { label: 'UGEL', value: ugel },
    { label: 'RED EDUCATIVA', value: red ? `RED ${red}` : '—' },
    { label: 'FECHA DE VISITA', value: fechaVisita },
    { label: 'SEC. FORMACIÓN TÉCNICA', value: formacionTecnica ? 'Sí' : 'No' }
  ];

  const customTables = [];

  // -------------------------------------------------------------------------
  // II. DATOS DEL DIRECTOR(A)
  // -------------------------------------------------------------------------
  const dirObj = sub.director && typeof sub.director === 'object' ? sub.director : {};
  const dirNombre = dirObj.nombres || (typeof sub.director === 'string' ? sub.director : '') || (colegio && colegio.director ? colegio.director.nombre : '—');
  const dirDni = dirObj.dni || sub.directorDni || (colegio && colegio.director ? colegio.director.dni : '—') || '—';
  const dirTel = dirObj.telefono || '—';
  const dirCond = dirObj.condicion === 'D' ? 'Designado (D)' : (dirObj.condicion === 'E' ? 'Encargado (E)' : (dirObj.condicion || sub.condicion || '—'));
  const dirCorreo = dirObj.correo || '—';

  customTables.push({
    title: 'II. DATOS DEL DIRECTOR(A)',
    minHeight: 45,
    tableHeaders: ['Apellidos y Nombres', 'DNI', 'Teléfono / Celular', 'Condición', 'Correo Electrónico'],
    tableRows: [
      [
        formatPersonName(dirNombre),
        dirDni,
        dirTel,
        dirCond,
        dirCorreo
      ]
    ],
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold' },
      1: { cellWidth: 65, halign: 'center' },
      2: { cellWidth: 75, halign: 'center' },
      3: { cellWidth: 85, halign: 'center' },
      4: { cellWidth: 126 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // III. DATOS DE LOS SUBDIRECTORES
  // -------------------------------------------------------------------------
  const subdirectores = Array.isArray(sub.subdirectores) && sub.subdirectores.length > 0 ? sub.subdirectores : [];
  const subdirRows = subdirectores.length > 0
    ? subdirectores.map((sd, i) => [
        String(i + 1),
        formatPersonName(sd.nombres || '—'),
        sd.dni || '—',
        sd.telefono || '—',
        sd.condicion === 'D' ? 'Designado (D)' : (sd.condicion === 'E' ? 'Encargado (E)' : (sd.condicion || '—')),
        sd.correo || '—'
      ])
    : [['—', 'No se consignaron subdirectores en esta visita.', '—', '—', '—', '—']];

  customTables.push({
    title: 'III. DATOS DE LOS SUBDIRECTORES',
    minHeight: 45,
    tableHeaders: ['N.°', 'Apellidos y Nombres', 'DNI', 'Teléfono / Celular', 'Condición', 'Correo Electrónico'],
    tableRows: subdirRows,
    columnStyles: {
      0: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 156 },
      2: { cellWidth: 60, halign: 'center' },
      3: { cellWidth: 70, halign: 'center' },
      4: { cellWidth: 75, halign: 'center' },
      5: { cellWidth: 126 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // TABLAS DE DOCENTES MONITOREADOS (SOLO VISITA 2)
  // -------------------------------------------------------------------------
  if (isV2) {
    let docData = sub.docentes;
    if (!docData || (!docData.momento1 && !docData.momento2)) {
      docData = migrateLegacyEbrTotals(sub);
    }

    const buildDocTable = (momentoRows, momentoNum, secRomano, titleText) => {
      const rows = momentoRows && momentoRows.length ? momentoRows : [];
      let totTotal = 0, totMonit = 0, totNoMonit = 0;
      const rubSums = {
        R1: [0, 0, 0, 0],
        R2: [0, 0, 0, 0],
        R3: [0, 0, 0, 0],
        R4: [0, 0, 0, 0],
        R5: [0, 0, 0, 0]
      };

      const tableRows = rows.map(r => {
        if (r.noAplica) {
          return [r.nivel, 'N/A', 'N/A', 'N/A', ...Array(20).fill('—')];
        }
        const t = Number(r.total) || 0;
        const m = Number(r.monitoreados) || 0;
        const nm = Math.max(0, t - m);
        totTotal += t;
        totMonit += m;
        totNoMonit += nm;

        const getRubCells = (rubId) => {
          const arr = Array.isArray(r[rubId]) ? r[rubId] : ['', '', '', ''];
          return [0, 1, 2, 3].map(idx => {
            const v = Number(arr[idx]) || 0;
            rubSums[rubId][idx] += v;
            return v > 0 ? String(v) : (arr[idx] === 0 || arr[idx] === '0' ? '0' : '—');
          });
        };

        return [
          r.nivel,
          t > 0 ? String(t) : '—',
          m > 0 ? String(m) : '—',
          nm > 0 ? String(nm) : (t > 0 ? '0' : '—'),
          ...getRubCells('R1'),
          ...getRubCells('R2'),
          ...getRubCells('R3'),
          ...getRubCells('R4'),
          ...getRubCells('R5')
        ];
      });

      // Fila TOTAL
      tableRows.push([
        { content: 'TOTAL', styles: { fontStyle: 'bold', fillColor: [240, 243, 248] } },
        { content: String(totTotal), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: String(totMonit), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        { content: String(totNoMonit), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } },
        ...rubSums.R1.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R2.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R3.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R4.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } })),
        ...rubSums.R5.map(v => ({ content: String(v), styles: { fontStyle: 'bold', halign: 'center', fillColor: [240, 243, 248] } }))
      ]);

      const docColumnStyles = {
        0: { cellWidth: 55, fontStyle: 'bold', fontSize: 6.8 },
        1: { cellWidth: 23, halign: 'center', fontSize: 6.5 },
        2: { cellWidth: 23, halign: 'center', fontSize: 6.5 },
        3: { cellWidth: 23, halign: 'center', fontSize: 6.5 }
      };
      for (let c = 4; c < 24; c++) {
        docColumnStyles[c] = { cellWidth: 19.3, halign: 'center', fontSize: 6.2 };
      }

      customTables.push({
        title: `${secRomano}. ${titleText}`,
        subtitle: 'Rúbricas: R1 Involucra activamente · R2 Razonamiento y creatividad · R3 Evalúa y retroalimenta · R4 Clima de respeto · R5 Regula positivamente (Niveles I, II, III y IV)',
        minHeight: 85,
        head: [
          [
            { content: 'NIVEL', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'TOTAL', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'MONIT.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'NO MON.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
            { content: 'R1', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
            { content: 'R2', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
            { content: 'R3', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
            { content: 'R4', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
            { content: 'R5', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } }
          ],
          [
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV',
            'I', 'II', 'III', 'IV'
          ]
        ],
        tableRows: tableRows,
        columnStyles: docColumnStyles,
        styles: {
          cellPadding: { top: 3.5, right: 2, bottom: 3.5, left: 2 }
        }
      });
    };

    buildDocTable(
      (docData && docData.momento1) || [],
      1,
      'IV',
      'DATA DE DOCENTES MONITOREADOS DEL PRIMER MOMENTO POR NIVEL A LA FECHA DE LA VISITA'
    );

    buildDocTable(
      (docData && docData.momento2) || [],
      2,
      'V',
      'DATA DE DOCENTES MONITOREADOS DEL SEGUNDO MOMENTO POR NIVEL A LA FECHA DE LA VISITA'
    );
  }

  // -------------------------------------------------------------------------
  // ASPECTOS E INDICADORES (ESCALA: INICIO / PROCESO / LOGRADO)
  // -------------------------------------------------------------------------
  const secAspectosRomano = isV1 ? 'IV' : 'VI';
  const seccionesDef = isV1
    ? (fichaType.seccionesVisita1 || EBR_GESTION_VISITA_1_SECCIONES)
    : (fichaType.seccionesVisita2 || EBR_GESTION_VISITA_2_SECCIONES);

  const respuestas = sub.respuestas || [];
  const projsInnovacion = Array.isArray(sub.proyectosInnovacion) ? sub.proyectosInnovacion.filter(p => p && p.trim()) : [];

  let globalItemIdx = 1;

  seccionesDef.forEach((sec, sIdx) => {
    let iniCount = 0, procCount = 0, logCount = 0, naCount = 0;

    const secRows = (sec.items || []).map(it => {
      const itemNum = it.num || globalItemIdx;
      globalItemIdx++;

      const resp = respuestas.find(r => r.id === it.id || r.num === itemNum) || {};
      const val = (resp.valor || '').toLowerCase();
      const obs = resp.observaciones ? resp.observaciones.trim() : '';

      if (val === 'inicio') iniCount++;
      else if (val === 'proceso') procCount++;
      else if (val === 'logrado') logCount++;
      else if (val === 'na') naCount++;

      const makeCell = (colVal, markColor) => {
        if (val === colVal) {
          return {
            content: '',
            raw: { isCheckmark: true, color: markColor },
            styles: { halign: 'center', valign: 'middle' }
          };
        }
        return { content: '', styles: { halign: 'center' } };
      };

      // Si es ítem de innovación y hay proyectos registrados
      let itemDescription = it.texto;
      if (it.evidencias) {
        itemDescription += `\n• Evidencias: ${it.evidencias}`;
      }
      if ((it.id === 'ge1_19' || it.id === 'ge2_17' || it.texto.toLowerCase().includes('innovación')) && projsInnovacion.length > 0) {
        itemDescription += `\n★ Proyectos / Buenas Prácticas: ${projsInnovacion.join('; ')}`;
      }

      return [
        String(itemNum),
        itemDescription,
        makeCell('inicio', [220, 38, 38]),
        makeCell('proceso', [217, 119, 6]),
        makeCell('logrado', [5, 150, 105]),
        makeCell('na', [71, 85, 105]),
        obs || '—'
      ];
    });

    // Fila resumen de sección
    secRows.push([
      {
        content: `TOTAL SECCIÓN — Inicio: ${iniCount}  ·  Proceso: ${procCount}  ·  Logrado: ${logCount}  ·  N/A: ${naCount}`,
        colSpan: 7,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [247, 249, 252],
          textColor: [18, 41, 77],
          fontSize: 7.8
        }
      }
    ]);

    const prefixNum = isV1 ? `4.${sIdx + 1}` : `6.${sIdx + 1}`;
    customTables.push({
      title: `${prefixNum} ${sec.nombre.toUpperCase()}`,
      minHeight: 70,
      tableHeaders: ['N.°', 'Aspecto / Criterio de Evaluación', 'Inicio', 'Proceso', 'Logrado', 'N/A', 'Observaciones'],
      tableRows: secRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 226, fontSize: 7.2 },
        2: { halign: 'center', cellWidth: 25 },
        3: { halign: 'center', cellWidth: 25 },
        4: { halign: 'center', cellWidth: 25 },
        5: { halign: 'center', cellWidth: 25 },
        6: { halign: 'left', cellWidth: 163, fontSize: 7 }
      },
      headStyles: {
        fillColor: [18, 41, 77],
        fontSize: 8,
        fontStyle: 'bold'
      },
      didDrawCell: (data) => {
        if (data.cell && data.cell.raw && data.cell.raw.isCheckmark) {
          const doc = data.doc;
          if (!doc) return;
          const cx = data.cell.x + data.cell.width / 2;
          const cy = data.cell.y + data.cell.height / 2;
          const col = data.cell.raw.color || [5, 150, 105];
          drawVectorCheckmark(doc, cx, cy, 7.5, col, 1.4);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // RESULTADO Y NIVEL DE CUMPLIMIENTO OFICIAL (UGEL 03 EBR)
  // -------------------------------------------------------------------------
  const ebrVisitaNum = isV2 ? 2 : 1;
  const maxPtsOficial = isV2 ? 69 : 57;
  let ebrPuntaje = (sub.puntaje !== undefined && sub.puntaje !== null) ? Number(sub.puntaje) : null;
  if (ebrPuntaje === null && Array.isArray(sub.respuestas) && sub.respuestas.length > 0) {
    let pSum = 0;
    sub.respuestas.forEach(r => {
      const vL = String(r?.valor || '').toLowerCase();
      if (vL === 'logrado' || vL === 'si') pSum += 3;
      else if (vL === 'proceso') pSum += 2;
      else if (vL === 'inicio' || vL === 'no') pSum += 1;
    });
    ebrPuntaje = pSum;
  }
  if (ebrPuntaje === null) ebrPuntaje = 0;
  const ebrNivelObj = getNivelEbrGestion(ebrPuntaje, ebrVisitaNum);
  const momentoSubTitle = isV2
    ? 'Escala oficial 2do Momento: Inicio (0–23 pts) · Proceso (24–46 pts) · Logrado (47–69 pts)'
    : 'Escala oficial 1er Momento: Inicio (0–19 pts) · Proceso (20–38 pts) · Logrado (39–57 pts)';

  const isLogradoRow = ebrPuntaje >= (isV2 ? 47 : 39);
  const isProcesoRow = ebrPuntaje >= (isV2 ? 24 : 20) && ebrPuntaje <= (isV2 ? 46 : 38);
  const isInicioRow = ebrPuntaje <= (isV2 ? 23 : 19);

  customTables.push({
    title: 'NIVEL DE CUMPLIMIENTO OFICIAL (SEGÚN PUNTAJE OBTENIDO)',
    subtitle: `${momentoSubTitle} — Puntaje obtenido: ${ebrPuntaje} de ${maxPtsOficial} puntos (${ebrNivelObj.pct}%) · Nivel: ${ebrNivelObj.nivel.toUpperCase()}`,
    minHeight: 70,
    tableHeaders: ['Nivel de cumplimiento', 'Rango oficial', 'Puntaje obtenido', 'Criterio pedagógico'],
    tableRows: [
      [
        { content: 'LOGRADO' + (isLogradoRow ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255], textColor: [4, 120, 87] } },
        { content: isV2 ? 'De 47 a 69 pts' : 'De 39 a 57 pts', styles: { halign: 'center', fontStyle: 'bold', fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255] } },
        { content: isLogradoRow ? `${ebrPuntaje} pts (${ebrNivelObj.pct}%)` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255] } },
        { content: 'Evidencia un nivel óptimo en las condiciones y compromisos de gestión escolar.', styles: { fontSize: 7.2, fillColor: isLogradoRow ? [209, 250, 229] : [255, 255, 255] } }
      ],
      [
        { content: 'PROCESO' + (isProcesoRow ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255], textColor: [180, 83, 9] } },
        { content: isV2 ? 'De 24 a 46 pts' : 'De 20 a 38 pts', styles: { halign: 'center', fontStyle: 'bold', fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255] } },
        { content: isProcesoRow ? `${ebrPuntaje} pts (${ebrNivelObj.pct}%)` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255] } },
        { content: 'En proceso de implementación; requiere consolidar acciones de mejora.', styles: { fontSize: 7.2, fillColor: isProcesoRow ? [254, 243, 199] : [255, 255, 255] } }
      ],
      [
        { content: 'INICIO' + (isInicioRow ? '  ✓ (OBTENIDO)' : ''), styles: { halign: 'center', fontStyle: 'bold', fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255], textColor: [185, 28, 28] } },
        { content: isV2 ? 'De 0 a 23 pts' : 'De 0 a 19 pts', styles: { halign: 'center', fontStyle: 'bold', fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255] } },
        { content: isInicioRow ? `${ebrPuntaje} pts (${ebrNivelObj.pct}%)` : '—', styles: { halign: 'center', fontStyle: 'bold', fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255] } },
        { content: 'Requiere asistencia técnica prioritaria para el cumplimiento de las condiciones de gestión.', styles: { fontSize: 7.2, fillColor: isInicioRow ? [254, 226, 226] : [255, 255, 255] } }
      ]
    ],
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 80 },
      2: { cellWidth: 80 },
      3: { cellWidth: 231 }
    }
  });

  // -------------------------------------------------------------------------
  // LOGROS, ASPECTOS POR MEJORAR Y RECOMENDACIONES
  // -------------------------------------------------------------------------
  const secLogrosRomano = isV1 ? 'V' : 'VII';
  const logrosVal = sub.logros || (sub.sintesis && sub.sintesis[0] && sub.sintesis[0].logros) || '—';
  const aspectosVal = sub.aspectosMejora || (sub.sintesis && sub.sintesis[0] && (sub.sintesis[0].dificultades || sub.sintesis[0].aspectosMejora)) || '—';
  const recsVal = sub.recomendaciones || (sub.sintesis && sub.sintesis[0] && sub.sintesis[0].recomendaciones) || '—';

  customTables.push({
    title: `${secLogrosRomano}. LOGROS, ASPECTOS POR MEJORAR Y RECOMENDACIONES`,
    minHeight: 50,
    tableHeaders: ['Política Regional', 'Logros', 'Aspectos de mejora', 'Recomendaciones'],
    tableRows: [
      [
        'P1 Instituciones educativas que aseguran aprendizajes',
        logrosVal,
        aspectosVal,
        recsVal
      ]
    ],
    columnStyles: {
      0: { cellWidth: 110, fontStyle: 'bold', fontSize: 7.5 },
      1: { cellWidth: 133, fontSize: 7.2 },
      2: { cellWidth: 133, fontSize: 7.2 },
      3: { cellWidth: 135, fontSize: 7.2 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // COMPROMISOS
  // -------------------------------------------------------------------------
  const secCompRomano = isV1 ? 'VI' : 'VIII';
  const compDirVal = (sub.compromisos && sub.compromisos.directivo) || sub.compromisoDirector || '—';
  const compEspVal = (sub.compromisos && sub.compromisos.especialista) || sub.compromisoMonitor || '—';

  customTables.push({
    title: `${secCompRomano}. COMPROMISOS ASUMIDOS`,
    minHeight: 50,
    tableHeaders: ['Actor Responsable', 'Compromiso Asumido'],
    tableRows: [
      ['Del directivo de la I.E.', compDirVal],
      ['Del especialista / monitor UGEL 03', compEspVal]
    ],
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold', fontSize: 8 },
      1: { cellWidth: 351, fontSize: 7.5 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // FIRMAS DINÁMICAS
  // -------------------------------------------------------------------------
  const signaturesList = [];
  // 1. Director
  signaturesList.push({
    cargo: 'Director(a) de la Institución Educativa',
    nombre: formatPersonName(dirNombre),
    entidad: ieName,
    leyenda: `DNI: ${dirDni}`
  });

  // 2. Subdirectores
  subdirectores.forEach(sd => {
    signaturesList.push({
      cargo: 'Subdirector(a) de la I.E.',
      nombre: formatPersonName(sd.nombres || 'Subdirector(a)'),
      entidad: ieName,
      leyenda: `DNI: ${sd.dni || '—'}`
    });
  });

  // 3. Especialista
  signaturesList.push({
    cargo: 'Especialista / Monitor de Gestión Escolar',
    nombre: formatPersonName(sub.responsable || 'Especialista UGEL 03'),
    entidad: 'UGEL 03 · AGEBRE',
    leyenda: `DNI: ${sub.monitorDni || '—'}`
  });

  const pdfFilename = `Ficha_Gestion_EBR_${isV1 ? 'Visita1' : 'Visita2'}_${(ieName || 'IE').replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`;

  // Invocar creador oficial de documento PDF
  return await createOfficialPdfDocument({
    title,
    subtitle,
    orientation: 'portrait',
    introParagraph: `En Lima, a la fecha ${fechaVisita}, se aplicó la Ficha de Monitoreo y Asistencia Técnica a la Gestión Escolar en la IE ${ieName} (${codLocal}), correspondiente a la ${isV1 ? 'Visita 1 (Primer momento)' : 'Visita 2 (Segundo momento)'}.`,
    metaGrid,
    customTables,
    signatures: signaturesList,
    lugarFecha: `Lima, ${fechaVisita}`,
    filename: pdfFilename,
    marcaBorrador: sub.esBorrador === true
  });
}

/**
 * Exporta la Ficha oficial "Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC"
 * a PDF en formato vertical oficial, reproduciendo con exactitud las secciones III, IV, V (R1-R5),
 * VI (31 Indicadores con Hallazgos) y VII (Tabla Oficial de Nivel MSE JEC)
 */
export async function exportJecFichaPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const codModular = sub.codigoModular || (sub.ie && sub.ie.codigoModular) || (colegio ? (colegio.codigoModular || colegio.codigoLocal) : '') || '—';
  const rei = sub.rei || sub.red || (sub.ie && (sub.ie.rei || sub.ie.red)) || (colegio ? colegio.rei : '') || '—';
  const ugel = sub.ugel || 'UGEL 03';

  // Extras
  const subExtras = sub.extras || [];
  const getExtraVal = (pattern) => {
    const found = subExtras.find(x => x && x.label && norm(x.label).includes(norm(pattern)));
    return found ? found.value : '';
  };

  const secciones = sub.secciones || getExtraVal('secciones') || '—';
  const estudiantes = sub.estudiantes || getExtraVal('estudiantes') || '—';
  const docentesTotal = sub.docentesTotal || getExtraVal('docentes') || '—';

  let formacionTecnica = false;
  if (sub.formacionTecnica !== undefined) formacionTecnica = sub.formacionTecnica === true;
  else if (sub.ie && sub.ie.formacionTecnica !== undefined) formacionTecnica = sub.ie.formacionTecnica === true;
  else {
    const ftVal = getExtraVal('formacion tecnica') || getExtraVal('técnica');
    formacionTecnica = ftVal === 'Sí' || ftVal === 'si' || ftVal === true;
  }

  const title = 'FICHA DE MONITOREO Y ASISTENCIA TÉCNICA A LA IMPLEMENTACIÓN DEL MODELO JEC';
  const subtitle = 'Modelo de Servicio Educativo Jornada Escolar Completa — UGEL 03 · Lima Metropolitana';

  const metaGrid = [
    { label: 'INSTITUCIÓN EDUCATIVA', value: ieName },
    { label: 'CÓDIGO MODULAR', value: codModular },
    { label: 'UGEL', value: ugel },
    { label: 'REI', value: rei ? `REI ${rei}` : '—' },
    { label: 'FECHA DE VISITA', value: fechaVisita },
    { label: 'SECCIONES', value: String(secciones) },
    { label: 'CANTIDAD ESTUDIANTES', value: String(estudiantes) },
    { label: 'CANTIDAD DOCENTES', value: String(docentesTotal) },
    { label: 'SEC. FORMACIÓN TÉCNICA', value: formacionTecnica ? 'Sí' : 'No' }
  ];

  const customTables = [];

  const jecRespName = (sub.responsable && !/^\d+$/.test(String(sub.responsable).trim()))
    ? sub.responsable
    : ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
  const jecRespCargo = sub.responsableCargo || ESPECIALISTA_JEC_OFICIAL.cargo;

  // -------------------------------------------------------------------------
  // III. DATOS DEL ESPECIALISTA QUE REALIZA EL MONITOREO Y ASISTENCIA TÉCNICA
  // -------------------------------------------------------------------------
  customTables.push({
    title: 'III. DATOS DEL ESPECIALISTA QUE REALIZA EL MONITOREO Y ASISTENCIA TÉCNICA',
    minHeight: 35,
    tableHeaders: ['Especialista Responsable', 'Cargo', 'Dependencia / Entidad'],
    tableRows: [
      [
        formatPersonName(jecRespName || ESPECIALISTA_JEC_OFICIAL.nombresApellidos),
        jecRespCargo,
        ESPECIALISTA_JEC_OFICIAL.entidad
      ]
    ],
    columnStyles: {
      0: { cellWidth: 200, fontStyle: 'bold' },
      1: { cellWidth: 150 },
      2: { cellWidth: 151 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // IV. DATOS DEL DIRECTIVO QUE BRINDA LA INFORMACIÓN SOLICITADA
  // -------------------------------------------------------------------------
  const dirObj = sub.director && typeof sub.director === 'object' ? sub.director : {};
  const dirNombre = dirObj.nombres || (typeof sub.director === 'string' ? sub.director : '') || (colegio && colegio.director ? colegio.director.nombre : '—');
  const dirDni = dirObj.dni || sub.directorDni || (colegio && colegio.director ? colegio.director.dni : '—') || '—';
  const dirTel = dirObj.telefono || '—';
  const dirCorreo = dirObj.correo || '—';

  customTables.push({
    title: 'IV. DATOS DEL DIRECTIVO QUE BRINDA LA INFORMACIÓN SOLICITADA',
    minHeight: 45,
    tableHeaders: ['Nombres y Apellido', 'DNI', 'Teléfono celular', 'Correo Electrónico'],
    tableRows: [
      [
        formatPersonName(dirNombre),
        dirDni,
        dirTel,
        dirCorreo
      ]
    ],
    columnStyles: {
      0: { cellWidth: 180, fontStyle: 'bold' },
      1: { cellWidth: 70, halign: 'center' },
      2: { cellWidth: 80, halign: 'center' },
      3: { cellWidth: 181 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // V. DATA DE DOCENTES MONITOREADOS A LA FECHA DE LA VISITA NIVEL SECUNDARIA
  // -------------------------------------------------------------------------
  const docData = sub.docentes || sub.docentesMonitoreo || {};

  const buildJecDocTable = (momentoKey, letraSub, titleText) => {
    let row = docData[momentoKey] || {};
    if (Array.isArray(row)) {
      row = row.find(r => r.nivel === 'Secundaria') || row[0] || {};
    }
    const t = Number(row.total) || 0;
    const m = Number(row.monitoreados) || 0;
    const nm = Math.max(0, t - m);

    const pctM = t > 0 ? Math.round((m / t) * 100) + '%' : '—';
    const pctNm = t > 0 ? Math.round((nm / t) * 100) + '%' : '—';

    const rubKeys = ['R1', 'R2', 'R3', 'R4', 'R5'];

    // Fila 1: Cantidades
    const cantCells = rubKeys.flatMap(rId => {
      const arr = Array.isArray(row[rId]) ? row[rId] : ['', '', '', ''];
      return [0, 1, 2, 3].map(idx => {
        const val = arr[idx] !== undefined && arr[idx] !== '' ? String(arr[idx]) : '—';
        return { content: val, styles: { halign: 'center' } };
      });
    });

    // Fila 2: Porcentajes
    const pctCells = rubKeys.flatMap(rId => {
      const arr = Array.isArray(row[rId]) ? row[rId] : ['', '', '', ''];
      return [0, 1, 2, 3].map(idx => {
        const val = Number(arr[idx]) || 0;
        const p = (val > 0 && t > 0) ? Math.round((val / t) * 100) + '%' : (arr[idx] !== '' && arr[idx] !== undefined ? '0%' : '—');
        return { content: p, styles: { halign: 'center', fontSize: 6.2, fontStyle: 'italic', textColor: [70, 70, 70] } };
      });
    });

    const tableRows = [
      [
        { content: t > 0 ? String(t) : '—', styles: { halign: 'center', fontStyle: 'bold' } },
        { content: `${m > 0 ? m : '—'}\n(${pctM})`, styles: { halign: 'center', fontStyle: 'bold' } },
        { content: `${nm > 0 ? nm : (t > 0 ? '0' : '—')}\n(${pctNm})`, styles: { halign: 'center', fontStyle: 'bold' } },
        ...cantCells
      ],
      [
        { content: 'PORCENTAJE', styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.2, fillColor: [245, 247, 250] } },
        { content: pctM, styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.2, fillColor: [245, 247, 250] } },
        { content: pctNm, styles: { halign: 'center', fontStyle: 'bold', fontSize: 6.2, fillColor: [245, 247, 250] } },
        ...pctCells
      ]
    ];

    const docColStyles = {
      0: { cellWidth: 42, halign: 'center', fontSize: 6.8 },
      1: { cellWidth: 46, halign: 'center', fontSize: 6.5 },
      2: { cellWidth: 46, halign: 'center', fontSize: 6.5 }
    };
    for (let c = 3; c < 23; c++) {
      docColStyles[c] = { cellWidth: 18.85, halign: 'center', fontSize: 6.2 };
    }

    customTables.push({
      title: `V. DATA DE DOCENTES MONITOREADOS A LA FECHA DE LA VISITA NIVEL SECUNDARIA — ${letraSub}) ${titleText}`,
      subtitle: 'Rúbricas oficiales: R1 Involucra · R2 Razonamiento · R3 Retroalimenta · R4 Respeto · R5 Comportamiento (Niveles I, II, III y IV)',
      minHeight: 55,
      head: [
        [
          { content: 'TOTAL DOCENTES', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
          { content: 'DOCENTES MONIT.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
          { content: 'DOCENTES NO MON.', rowSpan: 2, styles: { halign: 'center', valign: 'middle', fillColor: [18, 41, 77] } },
          { content: 'R1 INVOLUCRA', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
          { content: 'R2 RAZONAMIENTO', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
          { content: 'R3 RETROALIMENTA', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } },
          { content: 'R4 RESPETO', colSpan: 4, styles: { halign: 'center', fillColor: [20, 75, 120] } },
          { content: 'R5 COMPORTAMIENTO', colSpan: 4, styles: { halign: 'center', fillColor: [24, 55, 100] } }
        ],
        [
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV',
          'I', 'II', 'III', 'IV'
        ]
      ],
      tableRows,
      columnStyles: docColStyles,
      styles: {
        cellPadding: { top: 3, right: 1.5, bottom: 3, left: 1.5 }
      }
    });
  };

  buildJecDocTable('momento1', 'a', '1er monitoreo');
  buildJecDocTable('momento2', 'b', '2do monitoreo');

  // -------------------------------------------------------------------------
  // VI. COMPONENTES E INDICADORES DE MONITOREO (31 ÍTEMS CON HALLAZGOS)
  // -------------------------------------------------------------------------
  const respuestas = sub.respuestas || [];
  const hallazgosMap = sub.observacionesItems || {};
  let totalSi = 0;
  let totalNo = 0;

  JEC_SECCIONES.forEach(sec => {
    let secSi = 0, secNo = 0;

    const secRows = (sec.items || []).map(it => {
      const resp = respuestas.find(r => r.id === it.id || Number(r.num) === Number(it.num)) || {};
      const val = (resp.valor || '').toLowerCase();
      const hallazgo = resp.hallazgos || resp.observaciones || hallazgosMap[it.id] || '—';

      const isSi = val === 'si' || val === 'sí';
      const isNo = val === 'no';

      if (isSi) { secSi++; totalSi++; }
      else if (isNo) { secNo++; totalNo++; }

      const makeCheckCell = (active, color) => {
        if (active) {
          return {
            content: '',
            raw: { isCheckmark: true, color },
            styles: { halign: 'center', valign: 'middle' }
          };
        }
        return { content: '', styles: { halign: 'center' } };
      };

      let itemDesc = it.texto;
      if (it.evidencia) {
        itemDesc += `\n• Evidencia sugerida: ${it.evidencia}`;
      }

      return [
        String(it.num),
        itemDesc,
        makeCheckCell(isSi, [5, 150, 105]),
        makeCheckCell(isNo, [220, 38, 38]),
        hallazgo || '—'
      ];
    });

    // Fila resumen por componente
    secRows.push([
      {
        content: `TOTAL ${sec.nombre.toUpperCase()} — Sí: ${secSi}  ·  No: ${secNo}`,
        colSpan: 5,
        styles: {
          halign: 'right',
          fontStyle: 'bold',
          fillColor: [240, 244, 250],
          textColor: [18, 41, 77],
          fontSize: 7.5
        }
      }
    ]);

    customTables.push({
      title: `VI. ${sec.nombre.toUpperCase()}`,
      subtitle: 'Registra en la columna "Hallazgos" información breve y objetiva sobre lo verificado en cada ítem.',
      minHeight: 70,
      tableHeaders: ['N.°', 'Indicador / Aspecto Verificado', 'Sí', 'No', 'Hallazgos'],
      tableRows: secRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: 260, fontSize: 7.2 },
        2: { halign: 'center', cellWidth: 26 },
        3: { halign: 'center', cellWidth: 26 },
        4: { halign: 'left', cellWidth: 177, fontSize: 7 }
      },
      headStyles: {
        fillColor: [18, 41, 77],
        fontSize: 8,
        fontStyle: 'bold'
      },
      didDrawCell: (data) => {
        if (data.cell && data.cell.raw && data.cell.raw.isCheckmark) {
          const doc = data.doc;
          if (!doc) return;
          const cx = data.cell.x + data.cell.width / 2;
          const cy = data.cell.y + data.cell.height / 2;
          const col = data.cell.raw.color || [5, 150, 105];
          drawVectorCheckmark(doc, cx, cy, 7.5, col, 1.4);
        }
      }
    });
  });

  // -------------------------------------------------------------------------
  // VII. NIVEL DE IMPLEMENTACIÓN DEL MSE JEC (TABLA OFICIAL DE RESULTADOS)
  // -------------------------------------------------------------------------
  const conteoFinalSi = sub.conteo_si !== undefined ? sub.conteo_si : totalSi;
  const nivelFinal = getNivelLogroJec(conteoFinalSi);

  customTables.push({
    title: 'VII. NIVEL DE IMPLEMENTACIÓN DEL MSE JEC',
    subtitle: 'Nota: El nivel de implementación se determina a partir del total de respuestas afirmativas registradas en la ficha (MINEDU).',
    minHeight: 50,
    tableHeaders: ['Nivel de Implementación', 'Rango Oficial de Respuestas "Sí"', 'Resultado Obtenido'],
    tableRows: [
      [
        'Implementación lograda',
        'De 24 a 31 respuestas "Sí"',
        conteoFinalSi >= 24 ? `✓ NIVEL ALCANZADO (${conteoFinalSi} respuestas "Sí")` : '—'
      ],
      [
        'Implementación parcial',
        'De 12 a 23 respuestas "Sí"',
        (conteoFinalSi >= 12 && conteoFinalSi <= 23) ? `✓ NIVEL ALCANZADO (${conteoFinalSi} respuestas "Sí")` : '—'
      ],
      [
        'Implementación incipiente',
        'De 0 a 11 respuestas "Sí"',
        conteoFinalSi <= 11 ? `✓ NIVEL ALCANZADO (${conteoFinalSi} respuestas "Sí")` : '—'
      ]
    ],
    columnStyles: {
      0: { cellWidth: 170, fontStyle: 'bold' },
      1: { cellWidth: 170, halign: 'center' },
      2: { cellWidth: 171, halign: 'center', fontStyle: 'bold' }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    },
    didParseCell: (data) => {
      // Resaltar la fila ganadora
      if (data.section === 'body') {
        const isTargetRow = (data.row.index === 0 && conteoFinalSi >= 24) ||
                            (data.row.index === 1 && conteoFinalSi >= 12 && conteoFinalSi <= 23) ||
                            (data.row.index === 2 && conteoFinalSi <= 11);
        if (isTargetRow) {
          data.cell.styles.fillColor = conteoFinalSi >= 24 ? [220, 252, 231] : (conteoFinalSi >= 12 ? [254, 243, 199] : [254, 226, 226]);
          data.cell.styles.textColor = conteoFinalSi >= 24 ? [21, 128, 61] : (conteoFinalSi >= 12 ? [180, 83, 9] : [185, 28, 28]);
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // -------------------------------------------------------------------------
  // VIII. COMPROMISOS Y OBSERVACIONES
  // -------------------------------------------------------------------------
  const compDir = sub.compromisoDirector || (sub.compromisos && sub.compromisos.directivo) || '—';
  const compEsp = sub.compromisoMonitor || (sub.compromisos && sub.compromisos.especialista) || '—';
  const obsGen = sub.observaciones || '—';

  customTables.push({
    title: 'VIII. COMPROMISOS ASUMIDOS Y OBSERVACIONES GENERALES',
    minHeight: 45,
    tableHeaders: ['Actor / Aspecto', 'Compromiso / Detalle Registrado'],
    tableRows: [
      ['Compromiso del Directivo de la I.E.', compDir],
      ['Compromiso del Especialista / Monitor UGEL 03', compEsp],
      ['Observaciones Generales de la Visita', obsGen]
    ],
    columnStyles: {
      0: { cellWidth: 160, fontStyle: 'bold', fontSize: 8 },
      1: { cellWidth: 351, fontSize: 7.5 }
    },
    headStyles: {
      fillColor: [18, 41, 77],
      fontSize: 8,
      fontStyle: 'bold'
    }
  });

  // -------------------------------------------------------------------------
  // FIRMAS
  // -------------------------------------------------------------------------
  const signaturesList = [
    {
      cargo: 'Director(a) de la Institución Educativa',
      nombre: formatPersonName(dirNombre),
      entidad: ieName,
      leyenda: `DNI: ${dirDni}`
    },
    {
      cargo: 'Especialista de JEC',
      nombre: formatPersonName(jecRespName || ESPECIALISTA_JEC_OFICIAL.nombresApellidos),
      entidad: ESPECIALISTA_JEC_OFICIAL.entidad,
      leyenda: `Cargo: ${jecRespCargo}`
    }
  ];

  const pdfFilename = `Ficha_JEC_${(ieName || 'IE').replace(/[^a-zA-Z0-9]/g, '_')}_2026.pdf`;

  return await createOfficialPdfDocument({
    title,
    subtitle,
    orientation: 'portrait',
    introParagraph: `En Lima, a la fecha ${fechaVisita}, se procedió a realizar la jornada de monitoreo y asistencia técnica a la implementación del Modelo de Servicio Educativo Jornada Escolar Completa (JEC) en la IE ${ieName} (${codModular}), a cargo de la especialista de JEC ${jecRespName || ESPECIALISTA_JEC_OFICIAL.nombresApellidos}.`,
    metaGrid,
    customTables,
    signatures: signaturesList,
    lugarFecha: `Lima, ${fechaVisita}`,
    filename: pdfFilename,
    marcaBorrador: sub.esBorrador === true
  });
}

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
    : ((sub.responsable && !/^\d+$/.test(String(sub.responsable).trim())) ? sub.responsable : 'Especialista UGEL 03');
  const director = sub.director || (colegio && colegio.director ? colegio.director.nombre : '—');
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

  const directorDni = sub.directorDni || getExtraVal('dni del directivo') || (colegio && colegio.director ? colegio.director.dni : '') || '';
  const monitorDni = sub.monitorDni || getExtraVal('dni del monitor') || '';
  const condicion = sub.condicion || getExtraVal('condición') || getExtraVal('condicion') || (colegio ? colegio.tipoGestion : '') || '';
  const nivelAtencion = sub.nivelAtencion || getExtraVal('nivel educativo') || (colegio ? (colegio.nivelServicio || colegio.modalidad) : '') || '';
  const turnoAtencion = sub.turnoAtencion || getExtraVal('turno de atención') || getExtraVal('turno de atencion') || (colegio ? colegio.turnos : '') || '';
  const turnoVisitado = sub.turnoVisitado || getExtraVal('turno visitado') || '';
  const horaInicio = sub.horaInicio || getExtraVal('hora de inicio') || '';
  const horaTermino = sub.horaTermino || getExtraVal('hora de término') || getExtraVal('hora de termino') || '';
  const horarioStr = (horaInicio && horaTermino) ? `${horaInicio} – ${horaTermino}` : (horaInicio || horaTermino || '—');
  const codLocal = sub.codigoModular || (colegio ? (colegio.codigoLocal || colegio.codigoModular) : '') || '';

  const isCoordTutoria = isFichaCoordTutoriaJec(fichaType);
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

    tableHeaders = isCoordTutoria
      ? ['N.°', 'Sección / Función Monitoreada', 'Calificación (1–3)']
      : ['N.°', 'Sección / Indicador de Evaluación', 'Resultado'];
    let itemCounter = 1;

    if (fichaType.secciones && fichaType.secciones.length > 0) {
      fichaType.secciones.forEach(sec => {
        (sec.items || []).forEach(it => {
          const resp = respuestas.find(r => r.id === it.id);
          const val = resp ? resp.valor : 'Sin datos';
          const valText = (isCoordTutoria && val && val !== 'Sin datos') ? `${val} pts` : val;
          tableRows.push([
            String(itemCounter++),
            `${sec.nombre}\n${it.texto}`,
            valText
          ]);
        });
      });
    } else {
      respuestas.forEach(r => {
        const valText = (isCoordTutoria && r.valor && r.valor !== '—') ? `${r.valor} pts` : (r.valor || '—');
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
    ] : [])
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

/**
 * Normaliza y formatea el valor de Red Educativa / REI institucional
 * Ejemplos: "01" -> "REI 01", "RED 04" -> "REI 04", "REI 05" -> "REI 05", null/vacío -> "—"
 */
export function formatRei(redVal) {
  if (!redVal || redVal === '—' || redVal === 'No aplica' || redVal === 'null' || redVal === 'undefined') {
    return '—';
  }
  const clean = String(redVal).trim();
  if (!clean || clean === '-') return '—';
  const upper = clean.toUpperCase();
  if (upper.startsWith('REI ') || upper.startsWith('RED ')) {
    return upper.replace(/^RED\s+/, 'REI ');
  }
  if (/^\d+$/.test(clean)) {
    return `REI ${clean.padStart(2, '0')}`;
  }
  return `REI ${clean}`;
}

/**
 * Dibuja un gráfico de dona vectorial nativo en jsPDF con leyenda a la derecha
 * y total centrado ("12 fichas"). Si todas las fichas están en una categoría,
 * dibuja el anillo completo sin errores por segmentos en 0.
 */
export function drawPdfDonutChart(doc, cx, cy, outerRadius, innerRadius, segments, totalLabel = '', subLabel = 'fichas') {
  const total = segments.reduce((sum, s) => sum + (Number(s.val) || 0), 0);
  const numFontSize = outerRadius >= 40 ? 22 : 13;
  const subFontSize = outerRadius >= 40 ? 8.5 : 7;
  const yNumOffset = outerRadius >= 40 ? 3 : 1;
  const ySubOffset = outerRadius >= 40 ? 12 : 9;

  if (total === 0) {
    // Anillo vacío en gris claro
    doc.setFillColor(229, 231, 235); // #E5E7EB
    doc.circle(cx, cy, outerRadius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(numFontSize);
    doc.setTextColor(15, 23, 42);
    doc.text('0', cx, cy - yNumOffset, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(subFontSize);
    doc.setTextColor(100, 116, 139);
    doc.text(subLabel, cx, cy + ySubOffset, { align: 'center' });
    return;
  }

  // Verificar si un solo segmento concentra el 100%
  const single100 = segments.find(s => s.val === total);
  if (single100) {
    doc.setFillColor(single100.color[0], single100.color[1], single100.color[2]);
    doc.circle(cx, cy, outerRadius, 'F');
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
  } else {
    // Dibujar sectores mediante abanico poligonal de triángulos
    let currentAngle = -Math.PI / 2; // Iniciar arriba (12 en punto)
    const step = Math.PI / 45; // paso de 4 grados (suave y nítido)

    segments.forEach(seg => {
      const val = Number(seg.val) || 0;
      if (val <= 0) return;

      const span = (val / total) * 2 * Math.PI;
      const endAngle = currentAngle + span;
      doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);

      let a = currentAngle;
      while (a < endAngle) {
        const nextA = Math.min(a + step, endAngle);
        const x1 = cx + outerRadius * Math.cos(a);
        const y1 = cy + outerRadius * Math.sin(a);
        const x2 = cx + outerRadius * Math.cos(nextA);
        const y2 = cy + outerRadius * Math.sin(nextA);
        doc.triangle(cx, cy, x1, y1, x2, y2, 'F');
        a = nextA;
      }
      currentAngle = endAngle;
    });

    // Recorte interior blanco para formar el anillo de la dona
    doc.setFillColor(255, 255, 255);
    doc.circle(cx, cy, innerRadius, 'F');
  }

  // Texto centrado: Total y etiqueta ("12 fichas")
  const displayTotal = totalLabel !== '' ? String(totalLabel) : String(total);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(numFontSize);
  doc.setTextColor(15, 23, 42);
  doc.text(displayTotal, cx, cy - 1 - (outerRadius >= 40 ? 2 : 0), { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(subFontSize);
  doc.setTextColor(100, 116, 139);
  doc.text(subLabel, cx, cy + ySubOffset, { align: 'center' });
}

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

  // Escala oficial unificada (EBR Gestión Escolar / IPL: Logrado >= 67%, Proceso >= 34%, Inicio < 34%)
  const isEbr = isFichaEbrGestionEscolar(fichaType)
    || (fichaType?.escala === 'IPL')
    || (fichaType?.tipoRespuesta === 'ips')
    || (!fichaType && statsList.some(x => isFichaEbrGestionEscolar(x.s)));
  const logCut = isEbr ? 67 : 85;
  const procCut = isEbr ? 34 : 70;

  // 1. CÁLCULO DE DISTRIBUCIÓN DE RESULTADOS (FUENTE ÚNICA)
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    if (x.st.pct === null || x.st.pct === undefined) dist.none++;
    else {
      if (isEbr) {
        if (x.st.pct >= logCut) dist.logrado++;
        else if (x.st.pct >= procCut) dist.proceso++;
        else dist.inicio++;
      } else {
        const lbl = (x.st?.estado?.estado_panel || x.st?.estado?.label || '').toLowerCase();
        if (lbl.includes('no cumple') || lbl.includes('inici') || lbl.includes('incipient') || lbl.includes('mejorar')) dist.inicio++;
        else if (lbl.includes('parcial') || lbl.includes('proces')) dist.proceso++;
        else if (lbl.includes('lograd') || lbl.includes('cumple')) dist.logrado++;
        else if (x.st.pct >= logCut) dist.logrado++;
        else if (x.st.pct >= procCut) dist.proceso++;
        else dist.inicio++;
      }
    }
  });

  const pctLogrado = totalFichas ? Math.round((dist.logrado / totalFichas) * 100) : 0;
  const pctProceso = totalFichas ? Math.round((dist.proceso / totalFichas) * 100) : 0;
  const pctInicio  = totalFichas ? Math.round((dist.inicio / totalFichas) * 100) : 0;
  const pctNone    = totalFichas ? Math.round((dist.none / totalFichas) * 100) : 0;

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

      // 1. TRES TARJETAS KPI EN UNA FILA CON FRANJA INFERIOR DE COLOR
      const cardGap = isLandscape ? 14 : 10;
      const cardW = Math.floor((CONTENT_WIDTH - 2 * cardGap) / 3);
      const cardH = 42;

      const cardsData = [
        { val: String(totalFichas), lbl: 'FICHAS REGISTRADAS', color: [37, 99, 235] }, // Franja Azul (#2563EB)
        { val: String(instCount), lbl: 'INSTITUCIONES', color: [22, 163, 74] },        // Franja Verde (#16A34A)
        { val: avgPct === '—' || avgPct === null ? '—' : `${avgPct}%`, lbl: 'CUMPLIMIENTO PROMEDIO', color: [217, 119, 6] } // Franja Ámbar (#D97706)
      ];

      cardsData.forEach((c, idx) => {
        const cX = margin + idx * (cardW + cardGap);
        const cY = curY;
        // Fondo blanco con borde sutil
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.75);
        doc.roundedRect(cX, cY, cardW, cardH, 3.5, 3.5, 'FD');

        // Franja inferior de color (3.5pt)
        doc.setFillColor(c.color[0], c.color[1], c.color[2]);
        doc.roundedRect(cX, cY + cardH - 3.5, cardW, 3.5, 1.5, 1.5, 'F');

        // Número grande (una sola vez)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? 17 : 15);
        doc.setTextColor(15, 23, 42); // Navy 900
        doc.text(c.val, cX + 12, cY + 19);

        // Etiqueta en mayúsculas
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text(c.lbl, cX + 12, cY + 31);
      });

      curY += cardH + 12;

      // 2. PANEL DE GRÁFICO DE DONA (AGRANDADA 1.75X) + LEYENDA + HALLAZGOS CLAVE
      const panelH = isLandscape ? 114 : 118;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.75);
      doc.roundedRect(margin, curY, CONTENT_WIDTH, panelH, 4, 4, 'FD');

      // Título de la dona
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('Distribución de resultados', margin + 14, curY + 15);

      // Gráfica de dona más grande (~1.72x diámetro: radio exterior 48pt, radio interior 29pt)
      const donutCx = margin + 70;
      const donutCy = curY + 62;
      const donutOuterR = 48;
      const donutInnerR = 29;

      const donutSegments = [
        { val: dist.logrado, color: [22, 163, 74], label: 'Logrado' },
        { val: dist.proceso, color: [217, 119, 6], label: 'En proceso' },
        { val: dist.inicio,  color: [220, 38, 38], label: 'Inicio' },
        ...(dist.none > 0 ? [{ val: dist.none, color: [148, 163, 184], label: 'Sin datos' }] : [])
      ];

      drawPdfDonutChart(doc, donutCx, donutCy, donutOuterR, donutInnerR, donutSegments, String(totalFichas), totalFichas === 1 ? 'ficha' : 'fichas');

      // Leyenda vertical proporcional a la derecha de la dona
      const legX = donutCx + donutOuterR + 24;
      let legY = curY + 44;
      donutSegments.forEach(s => {
        doc.setFillColor(s.color[0], s.color[1], s.color[2]);
        doc.circle(legX + 5, legY - 3, 4, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(`${s.label} (${s.val})`, legX + 14, legY);
        legY += 16;
      });

      // R6.2: Hallazgos clave calculados automáticamente en lugar de resumen repetido
      const hallazgos = getHallazgosClave(statsList, fichaType, isEbr);
      if (isLandscape && CONTENT_WIDTH > 480 && hallazgos.length > 0) {
        const noteX = margin + 275;
        const noteW = CONTENT_WIDTH - 285;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(18, 41, 77);
        doc.text('Hallazgos clave del monitoreo:', noteX, curY + 28);

        let hY = curY + 44;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        hallazgos.forEach(h => {
          const splitH = doc.splitTextToSize(`• ${h}`, noteW);
          doc.text(splitH, noteX, hY, { maxWidth: noteW, lineHeightFactor: 1.2 });
          hY += splitH.length * 10 + 4;
        });
      }

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
          { content: 'Sin datos', styles: { textColor: [100, 116, 139] } },
          '—',
          String(dist.none),
          `${pctNone}%`,
          'Fichas sin respuestas o con indicadores no evaluados'
        ]
      ] : []),
      [
        { content: 'TOTAL', styles: { fontStyle: 'bold' } },
        '—',
        { content: String(totalFichas), styles: { fontStyle: 'bold' } },
        { content: '100%', styles: { fontStyle: 'bold' } },
        'Total consolidado de visitas de monitoreo procesadas'
      ]
    ] : [
      [
        { content: 'Sin datos', colSpan: 5, styles: { halign: 'center', textColor: [100, 116, 139], fontStyle: 'italic' } }
      ]
    ],
    columnStyles: isLandscape ? {
      0: { fontStyle: 'bold', cellWidth: 110 },
      1: { halign: 'center', cellWidth: 100 },
      2: { halign: 'center', cellWidth: 85, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 75, fontStyle: 'bold' },
      4: { halign: 'left' }
    } : {
      0: { fontStyle: 'bold', cellWidth: 95 },
      1: { halign: 'center', cellWidth: 85 },
      2: { halign: 'center', cellWidth: 60, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
      4: { halign: 'left' }
    }
  });

  // ==========================================
  // SECCIÓN II: AVANCE POR SECCIÓN / DIMENSIÓN EVALUADA
  // ==========================================
  if (!isAllMode && fichaType) {
    let seccionesParaAgg = (fichaType.secciones && fichaType.secciones.length > 0)
      ? fichaType.secciones
      : [];
    if (isEbr) {
      const hasV2 = statsList.some(x => Number(x.s.visita) === 2);
      seccionesParaAgg = hasV2 ? EBR_GESTION_VISITA_2_SECCIONES : EBR_GESTION_VISITA_1_SECCIONES;
    }

    const secAgg = {};
    seccionesParaAgg.forEach(sec => {
      secAgg[sec.nombre] = { sum: 0, cnt: 0, itemsCount: (sec.items || []).length };
    });

    statsList.forEach(x => {
      (x.st.secciones || []).forEach(sc => {
        if (sc.pct !== null && secAgg[sc.nombre]) {
          secAgg[sc.nombre].sum += sc.pct;
          secAgg[sc.nombre].cnt++;
        }
      });
    });

    const secTableRows = seccionesParaAgg.map((sec, idx) => {
      const a = secAgg[sec.nombre] || { sum: 0, cnt: 0, itemsCount: (sec.items || []).length };
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      let statusLabel = 'Sin datos';
      let badgeBg = [243, 244, 246];
      let badgeText = [107, 114, 128];

      if (avg !== null) {
        if (avg >= logCut) {
          statusLabel = 'Logrado';
          badgeBg = [236, 253, 245];
          badgeText = [4, 120, 87];
        } else if (avg >= procCut) {
          statusLabel = 'En proceso';
          badgeBg = [254, 243, 199];
          badgeText = [180, 83, 9];
        } else {
          statusLabel = 'Por mejorar';
          badgeBg = [254, 226, 226];
          badgeText = [185, 28, 28];
        }
      }

      return [
        String(idx + 1),
        sec.nombre,
        String(a.itemsCount),
        avg !== null ? `${avg}%` : '—',
        { content: '', pct: avg, raw: { pct: avg } },
        { content: statusLabel, styles: { halign: 'center', fontStyle: 'bold', fillColor: badgeBg, textColor: badgeText } }
      ];
    });

    customTables.push({
      title: 'II. AVANCE POR SECCIÓN / DIMENSIÓN EVALUADA',
      subtitle: 'Nivel de cumplimiento promedio obtenido en cada una de las dimensiones que integran el instrumento.',
      minHeight: 145, // R6.4: Espacio suficiente para no dividirse entre páginas
      beforeDraw: (doc, curY, pageW, margin) => {
        // R6.1: Leyenda vectorial limpia (doc.circle) para evitar glifos corruptos
        const legY = curY + 2;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Leyenda:', margin, legY);

        let lx = margin + 46;
        const legendItems = [
          { label: `Logrado (>= ${logCut}%): Cumplido`, color: [22, 163, 74] },
          { label: `Proceso (${procCut}%–${logCut - 1}%): En proceso`, color: [217, 119, 6] },
          { label: `Inicio (< ${procCut}%): Por mejorar`, color: [220, 38, 38] },
          { label: 'N/A: No aplica', color: [148, 163, 184] }
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
      tableHeaders: ['N.°', 'Sección / Dimensión Evaluada', 'N.° Indicadores', '% Cumpl.', 'Gráfica de Avance', 'Nivel Alcanzado'],
      tableRows: secTableRows.length > 0 ? secTableRows : [
        [{ content: 'Sin secciones registradas', colSpan: 6, styles: { halign: 'center', textColor: [100, 116, 139] } }]
      ],
      styles: {
        cellPadding: { top: 4, right: 5, bottom: 4, left: 5 }
      },
      columnStyles: isLandscape ? {
        0: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 75 },
        3: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 210 },
        5: { halign: 'center', cellWidth: 105, fontStyle: 'bold' }
      } : {
        0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
        1: { halign: 'left' },
        2: { halign: 'center', cellWidth: 55 },
        3: { halign: 'center', cellWidth: 48, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: 130 },
        5: { halign: 'center', cellWidth: 79, fontStyle: 'bold' }
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

      let groupIsEbr = isFichaEbrGestionEscolar(groupFt)
        || (groupFt?.escala === 'IPL')
        || (groupFt?.tipoRespuesta === 'ips')
        || groupStats.some(x => isFichaEbrGestionEscolar(x.s));

      let seccionesParaAgg = (groupFt?.secciones && groupFt.secciones.length > 0)
        ? groupFt.secciones
        : [];
      if (groupIsEbr) {
        const hasV2 = groupStats.some(x => Number(x.s.visita) === 2);
        seccionesParaAgg = hasV2 ? EBR_GESTION_VISITA_2_SECCIONES : EBR_GESTION_VISITA_1_SECCIONES;
      } else if (isFichaJec(groupFt)) {
        seccionesParaAgg = (groupFt?.secciones && groupFt.secciones.length === JEC_SECCIONES.length) ? groupFt.secciones : JEC_SECCIONES;
      }

      if (seccionesParaAgg.length === 0 && groupStats[0]?.st?.secciones) {
        seccionesParaAgg = groupStats[0].st.secciones.map(sc => ({ nombre: sc.nombre, items: [] }));
      }

      if (seccionesParaAgg.length > 0) {
        // R3: Nombres reales de dimensiones con salto de línea y número de indicadores
        const secHeaders = seccionesParaAgg.map(s => {
          const count = s.items ? s.items.length : 0;
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

        const matrizRows = sortedStats.map((x, idx) => {
          const s = x.s;
          const st = x.st;
          const secMap = {};
          (st.secciones || []).forEach(sc => { secMap[sc.nombre] = sc.pct; });

          const secCells = seccionesParaAgg.map(sec => {
            const p = secMap[sec.nombre];
            if (p === undefined || p === null) return '—';
            let bg = [255, 255, 255];
            let col = [15, 27, 45];
            if (p >= gLogCut) { bg = [236, 253, 245]; col = [4, 120, 87]; }
            else if (p >= gProcCut) { bg = [254, 243, 199]; col = [180, 83, 9]; }
            else { bg = [254, 226, 226]; col = [185, 28, 28]; }
            return { content: `${p}%`, styles: { halign: 'center', fillColor: bg, textColor: col, fontStyle: 'bold' } };
          });

          const globPct = st.pct !== null && st.pct !== undefined ? `${st.pct}%` : '—';
          const globStatus = st.pct === null || st.pct === undefined ? 'Sin datos' : (st.pct >= gLogCut ? 'Logrado' : (st.pct >= gProcCut ? 'En proceso' : 'Por mejorar'));
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
            { label: 'Inicio: Por mejorar', color: [220, 38, 38] },
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
          else { secStatus = 'Por mejorar'; secBg = [254, 226, 226]; secCol = [185, 28, 28]; }
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
            else { itemStatus = 'Por mejorar'; itemBg = [254, 226, 226]; itemCol = [185, 28, 28]; }
          }

          // R4: Distribución: conteo por nivel con su color. Omitir los niveles con 0.
          const distParts = [];
          if (it.counts.logrado) distParts.push(`Logrado: ${it.counts.logrado}`);
          if (it.counts.proceso) distParts.push(`Proceso: ${it.counts.proceso}`);
          if (it.counts.inicio) distParts.push(`Inicio: ${it.counts.inicio}`);
          if (it.counts.na || it.counts.nc) distParts.push(`N/A: ${(it.counts.na || 0) + (it.counts.nc || 0)}`);
          if (it.counts.si) distParts.push(`Sí: ${it.counts.si}`);
          if (it.counts.no) distParts.push(`No: ${it.counts.no}`);
          const distString = distParts.length ? distParts.join('  ·  ') : '—';

          return [
            String(iIdx + 1),
            it.texto || `Ítem ${it.id}`,
            { content: itemStatus, styles: { halign: 'center', fontStyle: 'bold', fillColor: itemBg, textColor: itemCol } },
            distString,
            it.pct !== null ? `${it.pct}%` : '—'
          ];
        });

        customTables.push({
          title: secBannerTitle,
          subtitle: secSubtitle,
          minHeight: 50,
          showHead: 'everyPage',
          tableHeaders: ['N.°', 'Indicador / Ítem', 'Resultado', `Distribución (n = ${totalFichas})`, '%'],
          tableRows: itemRows,
          styles: { fontSize: 7, cellPadding: { top: 3.5, right: 4, bottom: 3.5, left: 4 }, valign: 'middle' },
          columnStyles: isLandscape ? {
            0: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 80, fontStyle: 'bold' },
            3: { halign: 'center', cellWidth: 210 },
            4: { halign: 'center', cellWidth: 48, fontStyle: 'bold' }
          } : {
            0: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
            1: { halign: 'left' },
            2: { halign: 'center', cellWidth: 68, fontStyle: 'bold' },
            3: { halign: 'center', cellWidth: 140 },
            4: { halign: 'center', cellWidth: 40, fontStyle: 'bold' }
          }
        });
      });
    }
  }

  // ==========================================
  // NOTA METODOLÓGICA COMPLETA (SIN TRUNCAR)
  // ==========================================
  const summarySections = [
    {
      title: 'Nota Metodológica',
      content: isEbr
        ? 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar se determina según la escala oficial UGEL 03 EBR: Logrado (47–69 pts en V2, 39–57 pts en V1 / 67%–100%), En proceso (24–46 pts en V2, 20–38 pts en V1 / 34%–66%), Inicio (0–23 pts en V2, 0–19 pts en V1 / 0%–33%). Cada indicador se evalúa en escala Inicio (1 pt / 33%), Proceso (2 pts / 66%) y Logrado (3 pts / 100%), excluyendo del cálculo los indicadores con No Aplica (N/A).'
        : 'El cumplimiento de cada ítem se calcula mediante la conversión: IV = 100%, III = 75%, II = 50%, I = 25%; el porcentaje de cada dimensión corresponde al promedio aritmético de sus ítems y el global corresponde al promedio de todos los ítems evaluados en la visita. Escala de valoración institucional: Logrado >= 85%, En proceso 70% – 84%, Por mejorar < 70%.'
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

  const isEbr = isFichaEbrGestionEscolar(fichaType) || (fichaType?.escala === 'IPL') || (fichaType?.tipoRespuesta === 'ips');
  const logCut = isEbr ? 67 : 85;
  const procCut = isEbr ? 34 : 70;

  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    if (x.st.pct === null) dist.none++;
    else {
      if (isEbr) {
        if (x.st.pct >= logCut) dist.logrado++;
        else if (x.st.pct >= procCut) dist.proceso++;
        else dist.inicio++;
      } else {
        const lbl = (x.st?.estado?.estado_panel || x.st?.estado?.label || '').toLowerCase();
        if (lbl.includes('no cumple') || lbl.includes('inici') || lbl.includes('incipient') || lbl.includes('mejorar')) dist.inicio++;
        else if (lbl.includes('parcial') || lbl.includes('proces')) dist.proceso++;
        else if (lbl.includes('lograd') || lbl.includes('cumple')) dist.logrado++;
        else if (x.st.pct >= logCut) dist.logrado++;
        else if (x.st.pct >= procCut) dist.proceso++;
        else dist.inicio++;
      }
    }
  });

  const pctLogrado = totalFichas ? Math.round((dist.logrado / totalFichas) * 100) : 0;
  const pctProceso = totalFichas ? Math.round((dist.proceso / totalFichas) * 100) : 0;
  const pctInicio  = totalFichas ? Math.round((dist.inicio / totalFichas) * 100) : 0;
  const pctNone    = totalFichas ? Math.round((dist.none / totalFichas) * 100) : 0;

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

  const summarySections = [
    {
      title: 'Nota Metodológica',
      content: isEbr
        ? 'El cumplimiento de la Ficha de Monitoreo a la Gestión Escolar se determina según la escala oficial UGEL 03 EBR: Logrado (47–69 pts en V2, 39–57 pts en V1 / 67%–100%), En proceso (24–46 pts en V2, 20–38 pts en V1 / 34%–66%), Inicio (0–23 pts en V2, 0–19 pts en V1 / 0%–33%). Cada indicador se evalúa en escala Inicio (1 pt / 33%), Proceso (2 pts / 66%) y Logrado (3 pts / 100%).'
        : 'El cumplimiento de cada ítem se calcula mediante la conversión: IV = 100%, III = 75%, II = 50%, I = 25%; el porcentaje de cada dimensión corresponde al promedio aritmético de sus ítems y el global corresponde al promedio de todos los ítems evaluados en la visita. Escala de valoración institucional: Logrado >= 85%, En proceso 70% – 84%, Por mejorar < 70%.'
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

/**
 * Exporta el Padrón de Instituciones Educativas a PDF en orientación HORIZONTAL (Landscape)
 */
export async function exportColegiosReportPdf(colegios, stats = {}, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const title = 'PADRÓN OFICIAL DE INSTITUCIONES EDUCATIVAS MONITOREADAS';
  const introParagraph = `El presente reporte detalla el padrón general de instituciones educativas correspondientes a la jurisdicción de la Unidad de Gestión Educativa Local N.° 03 (UGEL 03), registrando la cobertura de monitoreo alcanzada a la fecha y los datos de gestión directiva.`;

  const metaGrid = [
    { label: 'Total Colegios en Padrón', value: String(colegios.length) },
    { label: 'REI / Redes Educativas', value: String(stats.totalReis || '—') },
    { label: 'Colegios Monitoreados', value: String(stats.monitoreados || '—') },
    { label: 'Cobertura Alcanzada', value: stats.cobertura ? `${stats.cobertura}%` : '—' }
  ];

  const tableHeaders = ['REI', 'Cód. Local', 'Institución Educativa', 'Distrito', 'Gestión', 'Director(a)', 'N.° Monitoreos', 'Última Visita'];

  const tableRows = colegios.map(c => [
    c.rei || '—',
    c.codigoLocal || '—',
    c.ie || '—',
    c.distrito || '—',
    c.tipoGestion || '—',
    c.director ? c.director.nombre : '—',
    String(c._subsCount || 0),
    c._lastVisit ? formatDate(c._lastVisit) : '—'
  ]);

  const filename = `Padron_Colegios_UGEL03_${getLimaDateStr()}.pdf`;

  const defaultSignatures = [
    { cargo: 'Responsable del Padrón de Instituciones', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'Jefatura de AGEBRE', entidad: 'UGEL 03', leyenda: 'V.° B.°' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: 'Padrón de Instituciones Educativas y Cobertura 2026 · UGEL 03',
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows,
    columnStyles: {
      0: { halign: 'center', cellWidth: 45, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 55 },
      2: { halign: 'left' },
      3: { halign: 'left', cellWidth: 75 },
      4: { halign: 'center', cellWidth: 65 },
      6: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 65 }
    },
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
