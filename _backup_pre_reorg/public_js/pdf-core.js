/* =========================================================================
   pdf-core.js — Motor base y utilidades gráficas oficiales para documentos PDF
   UGEL 03 · AGEBRE
   Contiene el motor de renderizado institucional, tipografías Unicode,
   membrete oficial, pie de página, códigos de verificación y formateadores estándar.
   ========================================================================= */

/**
 * Obtiene la instancia de jsPDF desde window.jspdf
 */
export function getJsPdf() {
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

export function cleanWordForDict(w) {
  return (w || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z]/g, '');
}

/**
 * Convierte una cadena de nombres sin estructurar al formato estándar institucional: APELLIDOS, Nombres
 */
export function splitRawNameToApellidosNombres(str) {
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
      return `${words[1].toUpperCase()}, ${toTitleCase(words[0])}`;
    }
    return `${words[0].toUpperCase()}, ${toTitleCase(words[1])}`;
  }

  const firstWordClean = cleanWordForDict(words[0]);
  const lastWordClean = cleanWordForDict(words[words.length - 1]);

  if (COMMON_GIVEN_NAMES.has(firstWordClean)) {
    const aps = words.slice(-2).join(' ').toUpperCase();
    const noms = toTitleCase(words.slice(0, -2).join(' '));
    return `${aps}, ${noms}`;
  }

  if (COMMON_GIVEN_NAMES.has(lastWordClean)) {
    const aps = words.slice(0, 2).join(' ').toUpperCase();
    const noms = toTitleCase(words.slice(2).join(' '));
    return `${aps}, ${noms}`;
  }

  if (words.length >= 4) {
    const aps = words.slice(-2).join(' ').toUpperCase();
    const noms = toTitleCase(words.slice(0, -2).join(' '));
    return `${aps}, ${noms}`;
  }

  const aps = words.slice(1).join(' ').toUpperCase();
  const noms = toTitleCase(words[0]);
  return `${aps}, ${noms}`;
}

export const APELLIDOS_OBLIGATORIO = true;

/**
 * Formatea el nombre de una persona al nuevo estándar institucional: APELLIDOS NOMBRES
 * (todo en MAYÚSCULAS, sin coma, una sola línea).
 */
export function formatearNombre(persona) {
  if (!persona) return '';
  if (typeof persona === 'string') {
    const s = persona.trim();
    if (s === '[object Object]' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined' || s === '—') return '';
    return s.toUpperCase();
  }
  if (typeof persona === 'object') {
    const nombres = (persona.nombres || persona.nombre || persona.nombresApellidos || persona.nombreCompleto || '').trim();
    const apellidos = (persona.apellidos || [persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' ') || '').trim();

    if (apellidos && nombres) {
      return `${apellidos.toUpperCase()} ${nombres.toUpperCase()}`;
    }
    if (apellidos && !nombres) {
      return apellidos.toUpperCase();
    }
    if (!apellidos && nombres) {
      return nombres.toUpperCase();
    }
  }
  return '';
}

/**
 * Extrae y normaliza de forma segura la información del director(a) desde una ficha
 * de monitoreo (submission) y/o los datos del colegio, soportando objetos { nombre, dni, ... },
 * strings, propiedades planas (directorNombre, dirNombre) y campos extras sin generar '[object Object]'.
 */
export function resolveDirectorData(sub = null, colegio = null) {
  if (!sub && !colegio) {
    return { nombre: '—', dni: '—', telefono: '—', condicion: '—', correo: '—' };
  }

  const dirSource = (sub && sub.director !== undefined && sub.director !== null) ? sub.director : null;
  const colDir = (colegio && colegio.director) ? colegio.director : null;

  let nombre = '';
  let dni = '';
  let telefono = '';
  let condicion = '';
  let correo = '';

  // 1. Extraer desde sub.director
  if (dirSource && typeof dirSource === 'object') {
    nombre = dirSource.nombre || dirSource.nombres || dirSource.nombresApellidos || dirSource.nombreCompleto || '';
    if (!nombre && (dirSource.apellidos || dirSource.apellidoPaterno)) {
      nombre = [dirSource.apellidoPaterno || dirSource.apellidos, dirSource.apellidoMaterno, dirSource.nombres].filter(Boolean).join(' ').trim();
    }
    dni = dirSource.dni || '';
    telefono = dirSource.telefono || dirSource.celular || '';
    condicion = dirSource.condicion || '';
    correo = dirSource.correo || dirSource.email || '';
  } else if (typeof dirSource === 'string') {
    const s = dirSource.trim();
    if (s && s !== '[object Object]' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined' && s !== '—') {
      nombre = s;
    }
  }

  // 2. Fallbacks desde propiedades planas de sub
  if (sub) {
    if (!nombre) {
      nombre = sub.directorNombre || sub.dirNombre || sub.director_nombre || '';
    }
    if (!dni) {
      dni = sub.directorDni || sub.dirDni || sub.director_dni || '';
    }
    if (!telefono) {
      telefono = sub.directorTelefono || sub.dirTelefono || sub.telefonoDirector || '';
    }
    if (!condicion) {
      condicion = sub.directorCondicion || sub.dirCondicion || sub.condicion || '';
    }
    if (!correo) {
      correo = sub.directorCorreo || sub.dirCorreo || sub.correoDirector || '';
    }

    // Si aún no hay DNI, condición o nombre, buscar en sub.extras
    if (Array.isArray(sub.extras) && (!dni || !condicion || !nombre)) {
      const getExtra = (pattern) => {
        const found = sub.extras.find(x => x && x.label && x.label.toLowerCase().includes(pattern.toLowerCase()));
        return (found && found.value !== undefined && found.value !== null) ? String(found.value).trim() : '';
      };
      if (!nombre) nombre = getExtra('director') || getExtra('directivo que brinda');
      if (!dni) dni = getExtra('dni del directivo') || getExtra('dni directivo') || getExtra('dni director');
      if (!condicion) condicion = getExtra('condición') || getExtra('condicion');
    }
  }

  // 3. Fallbacks desde colegio
  if (colDir && typeof colDir === 'object') {
    if (!nombre) {
      nombre = colDir.nombre || colDir.nombres || colDir.nombresApellidos || colDir.nombreCompleto || '';
      if (!nombre && (colDir.apellidos || colDir.apellidoPaterno)) {
        nombre = [colDir.apellidoPaterno || colDir.apellidos, colDir.apellidoMaterno, colDir.nombres].filter(Boolean).join(' ').trim();
      }
    }
    if (!dni) dni = colDir.dni || '';
    if (!telefono) telefono = colDir.telefono || colDir.celular || '';
    if (!condicion) condicion = colDir.condicion || (colegio ? colegio.tipoGestion : '') || '';
    if (!correo) correo = colDir.correo || colDir.email || '';
  } else if (typeof colDir === 'string' && !nombre) {
    const s = colDir.trim();
    if (s && s !== '[object Object]' && s.toLowerCase() !== 'null' && s.toLowerCase() !== 'undefined') {
      nombre = s;
    }
  }

  const cleanStr = (val) => {
    if (!val || typeof val !== 'string') return '—';
    const s = val.trim();
    if (!s || s === '[object Object]' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') {
      return '—';
    }
    return s;
  };

  return {
    nombre: cleanStr(nombre),
    dni: cleanStr(dni),
    telefono: cleanStr(telefono),
    condicion: cleanStr(condicion),
    correo: cleanStr(correo)
  };
}

export function resolveDirectorName(sub = null, colegio = null) {
  const d = resolveDirectorData(sub, colegio);
  return d.nombre;
}

/**
 * Propone la separación de un texto heredado en {nombres, apellidos}.
 */
export function proponerSeparacionNombre(persona) {
  const textHeredado = (persona.nombres   || '').trim();
  const apHeredado   = (persona.apellidos || '').trim();

  if (apHeredado && textHeredado) {
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

  if (!apHeredado && textHeredado) {
    const sugerido = splitRawNameToApellidosNombres(textHeredado);
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

export function formatPersonName(person) {
  return formatearNombre(person);
}

export const PALETA_ESTANDAR = {
  navy: '#12294C',
  navyRgb: [18, 41, 76],
  title: '#0B1B36',
  titleRgb: [11, 27, 54],
  band: '#2E4A73',
  bandRgb: [46, 74, 115],
  gold: '#E0A626',
  goldRgb: [224, 166, 38],
  goldText: '#B7791F',
  goldSoft: '#FDF6E3',
  goldSoftRgb: [253, 246, 227],
  kvLabel: '#EDF2F5',
  kvLabelRgb: [237, 242, 245],
  kpiBg: '#F7FAFC',
  border: '#D9E1EA',
  borderRgb: [217, 225, 234],
  muted: '#5F6A7B',
  mutedRgb: [95, 106, 123],
  altRow: '#F7FAFC',
  altRowRgb: [247, 250, 252],
  podioOro: '#D4A017',
  podioPlata: '#9EA7B3',
  podioBronce: '#B87333',
  podioOroBg: '#FEF9E7',
  podioPlataBg: '#F1F3F5',
  podioBronceBg: '#FAF0E6'
};

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

  doc.setDrawColor(227, 232, 239);
  doc.setLineWidth(0.5);
  doc.line(margin, pageH - 28, pageW - margin, pageH - 28);

  const qrOffset = (qrDataUrl && isLastPage) ? 24 : 0;
  if (qrDataUrl && isLastPage) {
    try {
      doc.addImage(qrDataUrl, 'PNG', margin, pageH - 52, 20, 20);
    } catch (e) { }
  }

  const line1Y = pageH - 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(138, 151, 168);
  const sysText = `Documento generado por el Sistema de Fichas de Monitoreo · UGEL 03 · Emitido el ${emissionStr}`;
  doc.text(sysText, margin + qrOffset, line1Y);

  const pageStr = `Página ${pageNumber} de ${totalPagesExp}`;
  doc.text(pageStr, pageW - margin, line1Y, { align: 'right' });

  const line2Y = pageH - 9;
  const verifText = `Cód. Verif: ${docVerifCode}`;
  doc.text(verifText, margin + qrOffset, line2Y);

  if (faltantes && faltantes.length > 0) {
    const verifWidth = doc.getTextWidth(verifText);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 83, 9);
    const faltantesText = `  ·  Datos por completar: ${faltantes.join(' · ')}`;
    doc.text(faltantesText, margin + qrOffset + verifWidth, line2Y);
  }
}

export function generateVerificationCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `UGEL03-2026-${rand}`;
}

export function getCurrentDateTimeStr() {
  const now = new Date();
  const dStr = now.toLocaleDateString('es-PE', { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' });
  const tStr = now.toLocaleTimeString('es-PE', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
  return `${dStr} a las ${tStr}`;
}

export function getLimaDateStr() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function sanitizeFilename(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_\-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
}

export async function generateQrDataUrl(text) {
  if (typeof window === 'undefined' || typeof window.QRCode === 'undefined') return null;
  return new Promise((resolve) => {
    let container = null;
    try {
      container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);

      const safeText = String(text || '').slice(0, 150);

      new window.QRCode(container, {
        text: safeText,
        width: 100,
        height: 100,
        colorDark: '#0B1B36',
        colorLight: '#FFFFFF',
        correctLevel: (window.QRCode && window.QRCode.CorrectLevel && window.QRCode.CorrectLevel.L) || 1
      });

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

export function plural(n, singular, pluralForm) {
  const count = Number(n) || 0;
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

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
      doc.setLineWidth(1.1);
      doc.line(x + 1.8, y + 1.8, x + size - 1.8, y + size - 1.8);
      doc.line(x + size - 1.8, y + 1.8, x + 1.8, y + size - 1.8);
    }
  }
  doc.restoreGraphicsState && doc.restoreGraphicsState();
}

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
    console.warn('Uso de helvetica estándar como fallback tipográfico.');
  }
}

export function sanitizePdfText(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/\[object Object\]/g, '')
    .replace(/\bundefined\b/g, '')
    .replace(/\bNaN\b/g, '')
    .replace(/\bnull\b/g, '')
    .replace(/≥/g, '>=');
}

export function drawOfficialHeader(doc, pageW, margin, pageH, areaConfig = null, customTopY = null) {
  const headerY = customTopY !== null ? customTopY : margin;
  const headerH = 34;
  const colCount = 4;
  const colGap = 4;
  const totalGap = colGap * (colCount - 1);
  const colW = (pageW - 2 * margin - totalGap) / colCount;

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

    doc.setFillColor(238, 241, 245);
    doc.setDrawColor(211, 221, 231);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, headerY, colW, headerH, 2, 2, 'FD');

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
      } catch (e) { }
    }

    doc.setFontSize(7.5);
    doc.setTextColor(11, 27, 54);
    doc.text(cell[0], x + colW / 2, headerY + 11, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(91, 107, 128);
    doc.text(cell[1], x + colW / 2, headerY + 19, { align: 'center', lineHeightFactor: 1.15 });
    doc.setFont('helvetica', 'bold');
  });

  const lineY = headerY + headerH + 6;
  doc.setDrawColor(18, 41, 77);
  doc.setLineWidth(2.5);
  doc.line(margin, lineY, pageW - margin, lineY);

  return lineY + 16;
}

export async function createOfficialPdfDocument({
  title = 'DOCUMENTO OFICIAL',
  subtitle = 'Monitoreo y Acompañamiento 2026 · UGEL 03',
  orientation = 'portrait',
  introParagraph = '',
  soloEncabezadoPagina1 = false,
  metaGrid = [],
  tableHeaders = [],
  tableRows = [],
  columnStyles = {},
  tableStyles = {},
  customTables = [],
  renderCustomTable = null,
  summarySections = [],
  signatures = [],
  lugarFecha = '',
  sinFirmas = false,
  areaConfig = null,
  incluirQr = true,
  verificationCode = null,
  datosIncompletos = false,
  marcaBorrador = false,
  filename = 'documento_oficial.pdf'
}) {
  const jsPDF = getJsPdf();
  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'l' : 'p',
    unit: 'pt',
    format: 'a4'
  });

  const unicodeReady = await ensureUnicodeFont(doc);
  const baseFont = unicodeReady ? 'LiberationSans' : 'helvetica';

  const totalPagesExp = '{total_pages_count_string}';
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = orientation === 'landscape' ? 36 : 42;
  const CONTENT_WIDTH = pageW - 2 * margin;

  const headerTopY = (soloEncabezadoPagina1) ? (orientation === 'landscape' ? 24 : 26) : margin;
  const headerBottomY = headerTopY + 34 + 6;
  const topMarginSubsequent = soloEncabezadoPagina1 ? (orientation === 'landscape' ? 32 : 36) : (headerBottomY + 16);

  const docVerifCode = verificationCode || generateVerificationCode();

  const areaAuthor = (areaConfig && areaConfig.sigla) ? `${areaConfig.sigla} · UGEL 03` : 'UGEL 03 – AGEBRE';
  doc.setProperties({
    title: title,
    subject: subtitle || 'Documento Oficial de la UGEL N.° 03',
    author: areaAuthor,
    keywords: 'UGEL 03, MINEDU, Monitoreo, Concursos, 2026, Lima Metropolitana',
    creator: 'Sistema de Fichas de Monitoreo · UGEL 03'
  });

  let qrDataUrl = null;
  if (incluirQr) {
    const qrPayload = `UGEL 03 - MINEDU\nDoc: ${title}\nEmitido: ${getLimaDateStr()}\nCódigo: ${docVerifCode}`;
    qrDataUrl = await generateQrDataUrl(qrPayload);
  }

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

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(11, 27, 54);
  const splitTitle = doc.splitTextToSize(title.toUpperCase(), pageW - 2 * margin);
  doc.text(splitTitle, pageW / 2, curY, { align: 'center' });
  curY += splitTitle.length * 15;

  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(183, 121, 31);
    doc.text(subtitle, pageW / 2, curY, { align: 'center' });
    curY += 16;
  }

  doc.setDrawColor(227, 232, 239);
  doc.setLineWidth(0.75);
  doc.line(margin + 40, curY, pageW - margin - 40, curY);
  curY += 14;

  if (introParagraph) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 27, 45);
    const cleanIntro = sanitizePdfText(introParagraph);
    const splitIntro = doc.splitTextToSize(cleanIntro, pageW - 2 * margin);
    doc.text(splitIntro, margin, curY, { maxWidth: pageW - 2 * margin, lineHeightFactor: 1.25 });
    curY += splitIntro.length * 11 + 12;
  }

  if (metaGrid && metaGrid.length > 0) {
    const boxW = pageW - 2 * margin;
    const numItems = metaGrid.length;

    const hasCustomRatios = metaGrid.some(item => typeof item.widthRatio === 'number' && item.widthRatio > 0);
    let ratios;
    if (hasCustomRatios) {
      const sum = metaGrid.reduce((acc, it) => acc + (it.widthRatio || (1 / numItems)), 0);
      ratios = metaGrid.map(it => (it.widthRatio || (1 / numItems)) / sum);
    } else if (numItems === 4 && metaGrid[0].label && metaGrid[0].label.toLowerCase().includes('concurso')) {
      ratios = [0.44, 0.14, 0.20, 0.22];
    } else {
      ratios = metaGrid.map(() => 1 / numItems);
    }

    let colAccX = margin;
    const preparedItems = metaGrid.map((item, idx) => {
      const colW = boxW * ratios[idx];
      const colX = colAccX;
      colAccX += colW;

      const maxTextW = Math.max(20, colW - 14);

      doc.setFont(baseFont || 'helvetica', 'bold');
      doc.setFontSize(7);
      const labelLines = doc.splitTextToSize((item.label || '').toUpperCase(), maxTextW);

      doc.setFont(baseFont || 'helvetica', 'normal');
      doc.setFontSize(8.5);
      let valStr = '—';
      if (item.value !== undefined && item.value !== null) {
        if (typeof item.value === 'object') {
          valStr = (item.value.nombre || item.value.nombres || item.value.nombresApellidos || formatearNombre(item.value) || '—').trim();
        } else {
          valStr = String(item.value).trim();
          if (valStr === '[object Object]' || valStr.toLowerCase() === 'null' || valStr.toLowerCase() === 'undefined') {
            valStr = '—';
          }
        }
      }
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

      doc.setFont(baseFont || 'helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(91, 107, 128);
      let labelY = curY + 11;
      p.labelLines.forEach(line => {
        doc.text(line, textX, labelY);
        labelY += 8;
      });

      doc.setFont(baseFont || 'helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(11, 27, 54);
      let valY = curY + 11 + (p.labelLines.length * 8) + 3;
      if (p.labelLines.length === 1) valY = curY + 22;
      p.valueLines.forEach(line => {
        doc.text(line, textX, valY);
        valY += 9.5;
      });

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
          fillColor: [18, 41, 77],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
          valign: 'middle',
          fontSize: orientation === 'landscape' ? 8 : 8.5,
        },
        alternateRowStyles: {
          fillColor: [247, 249, 252],
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
          if (data.pageNumber > 1 && !soloEncabezadoPagina1) {
            safeDrawHeader(data.pageNumber);
          }
        }
      });

      curY = doc.lastAutoTable.finalY + 18;
    }
  }

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
      doc.text(splitSec, margin, curY, { align: 'left', lineHeightFactor: 1.25 });
      curY += splitSec.length * 10 + 14;
    });
  }

  if (!sinFirmas && signatures && signatures.length > 0) {
    const sigCount = Math.min(signatures.length, 6);
    const isTwoRows = sigCount >= 5;
    const rowsCount = isTwoRows ? 2 : 1;
    const rowHeight = 72;
    const sigBlockHeight = (lugarFecha ? 20 : 0) + (rowsCount * rowHeight) + 15;

    if (curY + sigBlockHeight > pageH - 42) {
      doc.addPage();
      safeDrawHeader(doc.internal.getCurrentPageInfo ? doc.internal.getCurrentPageInfo().pageNumber : null);
      curY = headerBottomY + 18;
    } else {
      curY += 12;
    }

    if (lugarFecha) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(91, 107, 128);
      doc.text(lugarFecha, margin, curY);
      curY += 18;
    }

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

        doc.setDrawColor(138, 151, 168);
        doc.setLineWidth(0.5);
        doc.line(x + 10, lineSigY, x + colW - 10, lineSigY);

        let textY = lineSigY + 10;

        if (sig.nombre) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(11, 27, 54);
          doc.text(formatPersonName(sig.nombre), x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
          textY += 10;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(11, 27, 54);
        const splitCargo = doc.splitTextToSize(sig.cargo || 'Responsable', colW - 10);
        doc.text(splitCargo, x + colW / 2, textY, { align: 'center' });
        textY += splitCargo.length * 9;

        if (sig.entidad || sig.institucion) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(91, 107, 128);
          doc.text(sig.entidad || sig.institucion, x + colW / 2, textY, { align: 'center', maxWidth: colW - 10 });
          textY += 9;
        }

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

  const pageCount = doc.internal.getNumberOfPages();
  const emissionStr = getCurrentDateTimeStr();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    if (marcaBorrador) {
      doc.saveGraphicsState && doc.saveGraphicsState();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(55);
      doc.setTextColor(220, 225, 235);
      doc.text('BORRADOR', pageW / 2, pageH / 2, {
        align: 'center',
        angle: 45
      });
      doc.restoreGraphicsState && doc.restoreGraphicsState();
    }

    doc.setDrawColor(227, 232, 239);
    doc.setLineWidth(0.5);
    doc.line(margin, pageH - 26, pageW - margin, pageH - 26);

    if (qrDataUrl && i === pageCount) {
      try {
        doc.addImage(qrDataUrl, 'PNG', margin, pageH - 52, 22, 22);
      } catch (e) { }
    }

    doc.setFont(baseFont, 'normal');
    doc.setFontSize(7);
    doc.setTextColor(138, 151, 168);

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
      doc.text(footerLeft, margin + qrOffset, pageH - 17);
      doc.text(footerRight, pageW - margin, pageH - 8, { align: 'right' });
    }
  }

  if (typeof doc.putTotalPages === 'function') {
    doc.putTotalPages(totalPagesExp);
  }

  doc.save(filename);
}
