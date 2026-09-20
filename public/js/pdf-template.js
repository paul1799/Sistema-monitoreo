/* =========================================================================
   pdf-template.js — Generador oficial de documentos PDF institucionales
   UGEL 03 / MINEDU - Estilo Oficial "Anexo E20 - Acta de Resultados"
   V3: Soporte para Área de Firmas dinámica, 1–6 firmantes, códigos QR,
       agrupación por disciplina/categoría, y modo Orden de Mérito.
   ========================================================================= */

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
 * Formatea el nombre de una persona al estándar institucional unificado: APELLIDOS, Nombres
 * Ejemplo: "YANAPA ALMANZA, Daniela Geraldine"
 */
export function formatPersonName(person) {
  if (!person) return '';
  if (typeof person === 'string') {
    return splitRawNameToApellidosNombres(person);
  }

  const nombres = (person.nombres || '').trim();
  const apellidos = (person.apellidos || '').trim();

  if (apellidos && nombres) {
    return `${apellidos.toUpperCase()}, ${toTitleCase(nombres)}`;
  }
  if (apellidos && !nombres) {
    return apellidos.toUpperCase();
  }
  if (!apellidos && nombres) {
    return splitRawNameToApellidosNombres(nombres);
  }
  return '';
}

/**
 * Formatea y asegura guiones no separables en resoluciones oficiales
 * Ejemplo: "RD N.° 04851-2026-UGEL03" con guiones \u2011
 */
export function formatResolucionRef(res) {
  if (!res) return '—';
  let s = String(res).trim();
  if (/^RD\s+(\d+)/i.test(s)) {
    s = s.replace(/^RD\s+/i, 'RD N.° ');
  } else if (/^RD\s*N\.?°?\s*/i.test(s)) {
    s = s.replace(/^RD\s*N\.?°?\s*/i, 'RD N.° ');
  }
  return s.replace(/-/g, '\u2011');
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
  if (typeof window.QRCode === 'undefined') return null;
  return new Promise((resolve) => {
    try {
      const container = document.createElement('div');
      container.style.display = 'none';
      document.body.appendChild(container);

      new window.QRCode(container, {
        text: text,
        width: 100,
        height: 100,
        colorDark: '#0B1B36',
        colorLight: '#FFFFFF',
        correctLevel: window.QRCode.CorrectLevel.M
      });

      // Esperar un frame a que se genere el canvas o imagen
      setTimeout(() => {
        let dataUrl = null;
        const canvas = container.querySelector('canvas');
        if (canvas) {
          dataUrl = canvas.toDataURL('image/png');
        } else {
          const img = container.querySelector('img');
          if (img && img.src) dataUrl = img.src;
        }
        document.body.removeChild(container);
        resolve(dataUrl);
      }, 50);
    } catch (e) {
      console.warn('No se pudo generar QR:', e);
      resolve(null);
    }
  });
}

/**
 * Dibuja el membrete oficial institucional (4 celdas grises + línea azul marino)
 * El 4.° recuadro es dinámico según el área elegida (áreaConfig).
 */
export function drawOfficialHeader(doc, pageW, margin, pageH, areaConfig = null) {
  const headerY = margin;
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
  metaGrid = [], // Array de { label, value, note }
  tableHeaders = [],
  tableRows = [],
  columnStyles = {},
  customTables = [], // Array de { title, subtitle, minHeight, pageBreak, beforeDraw, tableHeaders, tableRows, columnStyles, didDrawCell, didParseCell, styles, headStyles, alternateRowStyles }
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

  const totalPagesExp = '{total_pages_count_string}';
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = orientation === 'landscape' ? 36 : 42; // ~13mm a 15mm

  const headerBottomY = margin + 34 + 6; // Posición inferior de la línea azul del encabezado

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

  // 1. Dibujar membrete inicial
  let curY = drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);

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
    const itemW = boxW / numItems;
    const boxH = 34;

    doc.setFillColor(247, 249, 252);
    doc.setDrawColor(227, 232, 239);
    doc.roundedRect(margin, curY, boxW, boxH, 3, 3, 'FD');

    metaGrid.forEach((item, idx) => {
      const x = margin + idx * itemW + 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(91, 107, 128);
      doc.text(item.label.toUpperCase(), x, curY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(11, 27, 54);
      doc.text(String(item.value || '—'), x, curY + 22);

      if (item.note) {
        doc.setFontSize(6.5);
        doc.setTextColor(138, 151, 168);
        doc.text(item.note, x, curY + 30);
      }
    });
    curY += boxH + 10;
  }

  // 6. Tablas principales mediante autoTable (soporte para customTables múltiples o tabla única)
  if (customTables && customTables.length > 0) {
    if (typeof doc.autoTable !== 'function') {
      console.warn('doc.autoTable no está disponible.');
    } else {
      for (const t of customTables) {
        const neededSpace = t.minHeight || (t.tableHeaders && t.tableRows ? 80 : 40);
        if (t.pageBreak === 'before' || curY + neededSpace > pageH - 50) {
          doc.addPage();
          drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
          curY = headerBottomY + 16;
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

        if (t.tableHeaders && t.tableRows && t.tableRows.length > 0) {
          doc.autoTable({
            head: [t.tableHeaders],
            body: t.tableRows,
            startY: curY,
            margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
            theme: 'plain',
            rowPageBreak: t.rowPageBreak || 'avoid',
            showHead: t.showHead || 'everyPage',
            styles: Object.assign({
              font: 'helvetica',
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
            didParseCell: t.didParseCell || null,
            didDrawPage: (data) => {
              if (data.pageNumber > 1) {
                drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
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
        margin: { left: margin, right: margin, top: headerBottomY + 14, bottom: 42 },
        theme: 'plain',
        rowPageBreak: 'avoid',
        showHead: 'everyPage',
        styles: {
          font: 'helvetica',
          fontSize: orientation === 'landscape' ? 7.5 : 8,
          cellPadding: { top: 5, right: 5, bottom: 5, left: 5 },
          lineColor: [227, 232, 239],
          lineWidth: 0.5,
          textColor: [15, 27, 45],
          overflow: 'linebreak',
        },
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
        didDrawPage: (data) => {
          // Membrete oficial en páginas subsecuentes
          if (data.pageNumber > 1) {
            drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
          }
        }
      });

      curY = doc.lastAutoTable.finalY + 18;
    }
  }

  // 7. Secciones de resumen / compromisos / observaciones
  if (summarySections && summarySections.length > 0) {
    summarySections.forEach(sec => {
      if (curY + 60 > pageH - 80) {
        doc.addPage();
        drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
        curY = headerBottomY + 16;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(18, 41, 77);
      doc.text(sec.title.toUpperCase(), margin, curY);
      curY += 12;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 27, 45);
      const splitSec = doc.splitTextToSize(sec.content, pageW - 2 * margin);
      doc.text(splitSec, margin, curY, { align: 'justify', lineHeightFactor: 1.2 });
      curY += splitSec.length * 11 + 14;
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
      drawOfficialHeader(doc, pageW, margin, pageH, areaConfig);
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

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(138, 151, 168); // #8A97A8

    const qrOffset = (qrDataUrl && i === pageCount) ? 26 : 0;
    let footerLeft = `Documento generado por el Sistema de Fichas de Monitoreo · UGEL 03 · Emitido el ${emissionStr} · Cód. Verif: ${docVerifCode}`;
    if (datosIncompletos) {
      footerLeft += '  [ ! Documento con datos por completar ]';
    }

    doc.text(footerLeft, margin + qrOffset, pageH - 14);

    const pageStr = `Página ${i} de ${totalPagesExp}`;
    doc.text(pageStr, pageW - margin, pageH - 14, { align: 'right' });
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
export async function exportFichaIndividualPdf(sub, fichaType, colegio = null, downloadConfig = {}) {
  if (!sub || !fichaType) {
    throw new Error('Ficha o Tipo de Ficha no definido');
  }

  const title = `FICHA DE MONITOREO — ${fichaType.nombre || 'EVALUACIÓN'}`;
  const ieName = sub.institucion || (colegio ? colegio.ie : 'Institución Educativa');
  const fechaVisita = formatDate(sub.fecha);
  const numVisita = sub.visita ? `Visita N.° ${sub.visita}` : 'Visita única';
  const responsable = sub.responsable || 'Especialista UGEL 03';
  const director = sub.director || (colegio && colegio.director ? colegio.director.nombre : '—');
  const ugel = sub.ugel || 'UGEL 03';
  const red = sub.red || (colegio ? colegio.rei : '—');

  const introParagraph = `En la ciudad de Lima, con fecha ${fechaVisita}, se procedió a realizar la jornada de monitoreo y acompañamiento institucional correspondiente a la ${numVisita} en la institución educativa ${ieName}, perteneciente a la ${ugel} y ${red ? 'RED/REI ' + red : 'jurisdicción asignada'}, a cargo del especialista ${responsable}, con la presencia y coordinación de la dirección escolar a cargo de ${director}. A continuación, se detallan los resultados obtenidos y los compromisos asumidos.`;

  const metaGrid = [
    { label: 'Institución Educativa', value: ieName },
    { label: 'Fecha de Monitoreo', value: fechaVisita },
    { label: 'N.° de Visita', value: numVisita },
    { label: 'Especialista / Monitor', value: responsable },
    { label: 'Director(a)', value: director },
    { label: 'Código Modular / Local', value: sub.codigoModular || (colegio ? colegio.codigoLocal : '—') }
  ];

  // Armar tabla de respuestas
  const tableHeaders = ['N.°', 'Sección / Indicador de Evaluación', 'Resultado'];
  const tableRows = [];

  const respuestas = sub.respuestas || [];
  let itemCounter = 1;

  if (fichaType.secciones && fichaType.secciones.length > 0) {
    fichaType.secciones.forEach(sec => {
      (sec.items || []).forEach(it => {
        const resp = respuestas.find(r => r.id === it.id);
        const val = resp ? resp.valor : 'Sin datos';
        tableRows.push([
          String(itemCounter++),
          `${sec.nombre}\n${it.texto}`,
          val
        ]);
      });
    });
  } else {
    respuestas.forEach(r => {
      tableRows.push([
        String(itemCounter++),
        `${r.seccion || 'General'}\n${r.texto || 'Indicador'}`,
        r.valor || '—'
      ]);
    });
  }

  const summarySections = [];
  if (sub.observaciones) {
    summarySections.push({
      title: 'Observaciones Registradas en la Visita',
      content: sub.observaciones
    });
  }

  if (sub.compromisos && sub.compromisos.length > 0) {
    const compText = sub.compromisos.map((c, i) =>
      `${i + 1}. ${c.texto}${c.responsable ? ' (Responsable: ' + c.responsable + ')' : ''}${c.plazo ? ' [Plazo: ' + c.plazo + ']' : ''}`
    ).join('\n');
    summarySections.push({
      title: 'Compromisos de Mejora Institucional Acordados',
      content: compText
    });
  }

  const filename = `Ficha_${sanitizeFilename(fichaType.nombre)}_${sanitizeFilename(ieName)}_${getLimaDateStr()}.pdf`;

  const defaultSignatures = [
    { cargo: 'Especialista que monitorea — AGEBRE', entidad: 'UGEL 03 – DRELM', nombre: responsable, leyenda: 'Firma y Sello' },
    { cargo: 'Director(a) / Autoridad de la I.E.', entidad: ieName, nombre: director !== '—' ? director : '', leyenda: 'Firma y Sello' },
    { cargo: 'Jefatura de AGEBRE', entidad: 'UGEL 03', nombre: '', leyenda: 'V.° B.°' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: 'Monitoreo y Acompañamiento 2026 · UGEL 03',
    orientation: downloadConfig.orientation || 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows,
    columnStyles: {
      0: { halign: 'center', cellWidth: 32, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 'auto' },
      2: { halign: 'center', cellWidth: 90, fontStyle: 'bold' }
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
 * Exporta el Reporte Consolidado de Monitoreo a PDF con todas sus secciones y gráficas:
 * 1. Distribución de resultados (gráfica de barras segmentadas + tabla de distribución)
 * 2. Avance por sección / dimensión (tabla con barras de avance)
 * 3. Reporte por ítem (indicadores con gráficas de distribución de respuestas y porcentajes)
 * 4. Detalle consolidado de fichas registradas
 */
export async function exportConsolidadoReportPdf(statsList, fichaType, filters = {}, isAllMode = false, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const title = isAllMode
    ? 'REPORTE CONSOLIDADO GENERAL DE MONITOREO'
    : `REPORTE CONSOLIDADO — ${fichaType ? fichaType.nombre.toUpperCase() : 'MONITOREO'}`;

  const totalFichas = statsList.length;
  const instCount = new Set(statsList.map(x => x.s.institucion || '')).size;
  const withPct = statsList.filter(x => x.st.pct !== null);
  const avgPct = withPct.length ? Math.round(withPct.reduce((a, x) => a + x.st.pct, 0) / withPct.length) : '—';

  // Subtítulo con filtros aplicados visibles
  const filtrosAplicados = [];
  if (filters.institucion) filtrosAplicados.push(`I.E.: ${filters.institucion}`);
  if (filters.red) filtrosAplicados.push(`RED: ${filters.red}`);
  if (filters.visita) filtrosAplicados.push(`Visita: ${filters.visita}`);
  if (filters.responsable) filtrosAplicados.push(`Responsable: ${filters.responsable}`);
  if (filters.distrito) filtrosAplicados.push(`Distrito: ${filters.distrito}`);
  if (filters.desde || filters.hasta) filtrosAplicados.push(`Período: ${filters.desde || 'inicio'} a ${filters.hasta || 'fin'}`);
  const filterSubtitle = filtrosAplicados.length ? `Filtros: ${filtrosAplicados.join(' · ')}` : 'Todos los registros consolidables';

  const introParagraph = `El presente documento consolida la información de las visitas de monitoreo registradas en el Sistema de Gestión Institucional UGEL 03 para el año lectivo 2026. Se reportan un total de ${totalFichas} fichas de monitoreo aplicadas en ${instCount} instituciones educativas, con un nivel de cumplimiento promedio general del ${avgPct}%. ${filterSubtitle}.`;

  const metaGrid = [
    { label: 'Total Fichas Registradas', value: String(totalFichas) },
    { label: 'Instituciones Educativas', value: String(instCount) },
    { label: 'Cumplimiento Promedio', value: avgPct === '—' ? '—' : `${avgPct}%` },
    { label: 'Jurisdicción', value: 'UGEL 03 / DRELM' }
  ];

  // 1. CÁLCULO DE DISTRIBUCIÓN DE RESULTADOS
  const dist = { logrado: 0, proceso: 0, inicio: 0, none: 0 };
  statsList.forEach(x => {
    if (x.st.pct === null) dist.none++;
    else if (x.st.pct >= 85) dist.logrado++;
    else if (x.st.pct >= 70) dist.proceso++;
    else dist.inicio++;
  });

  const pctLogrado = totalFichas ? Math.round((dist.logrado / totalFichas) * 100) : 0;
  const pctProceso = totalFichas ? Math.round((dist.proceso / totalFichas) * 100) : 0;
  const pctInicio  = totalFichas ? Math.round((dist.inicio / totalFichas) * 100) : 0;
  const pctNone    = totalFichas ? Math.round((dist.none / totalFichas) * 100) : 0;

  const customTables = [];

  // ==========================================
  // SECCIÓN 1: DISTRIBUCIÓN DE RESULTADOS
  // ==========================================
  customTables.push({
    title: 'I. DISTRIBUCIÓN DE RESULTADOS',
    subtitle: 'Categorización porcentual y numérica de las fichas de monitoreo según el nivel de logro alcanzado.',
    minHeight: 120,
    beforeDraw: (doc, curY, pageW, margin) => {
      const barW = pageW - 2 * margin;
      const barH = 14;
      const barY = curY + 2;

      // Dibujar fondo de barra
      doc.setFillColor(235, 238, 242);
      doc.roundedRect(margin, barY, barW, barH, 3, 3, 'F');

      if (totalFichas > 0) {
        let segX = margin;
        const segments = [
          { val: dist.logrado, pct: pctLogrado, color: [5, 150, 105], label: 'Logrado' },
          { val: dist.proceso, pct: pctProceso, color: [217, 119, 6], label: 'En proceso' },
          { val: dist.inicio,  pct: pctInicio,  color: [220, 38, 38],  label: 'Por mejorar' },
          { val: dist.none,    pct: pctNone,    color: [156, 163, 175], label: 'Sin datos' }
        ];

        segments.forEach((seg, sIdx) => {
          if (seg.val > 0) {
            const segW = (seg.val / totalFichas) * barW;
            doc.setFillColor(seg.color[0], seg.color[1], seg.color[2]);
            if (sIdx === 0 && segments.every((s, i) => i === 0 || s.val === 0)) {
              doc.roundedRect(segX, barY, segW, barH, 3, 3, 'F');
            } else if (sIdx === 0) {
              doc.roundedRect(segX, barY, segW, barH, 3, 3, 'F');
              doc.rect(segX + 3, barY, segW - 3, barH, 'F');
            } else if (sIdx === segments.length - 1 || segments.slice(sIdx + 1).every(s => s.val === 0)) {
              doc.roundedRect(segX, barY, segW, barH, 3, 3, 'F');
              doc.rect(segX, barY, Math.max(0, segW - 3), barH, 'F');
            } else {
              doc.rect(segX, barY, segW, barH, 'F');
            }

            if (segW > 28) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7.5);
              doc.setTextColor(255, 255, 255);
              doc.text(`${seg.pct}%`, segX + segW / 2, barY + 10, { align: 'center' });
            }
            segX += segW;
          }
        });
      }

      // Leyenda gráfica debajo de la barra
      const legendY = barY + barH + 10;
      doc.setFontSize(7.5);

      const legItems = [
        { label: `Logrado (≥ 85%): ${dist.logrado} (${pctLogrado}%)`, color: [5, 150, 105] },
        { label: `En proceso (70%–84%): ${dist.proceso} (${pctProceso}%)`, color: [217, 119, 6] },
        { label: `Por mejorar (< 70%): ${dist.inicio} (${pctInicio}%)`, color: [220, 38, 38] },
        { label: `Sin datos: ${dist.none} (${pctNone}%)`, color: [156, 163, 175] }
      ];

      const legW = barW / 4;
      legItems.forEach((it, idx) => {
        const lx = margin + idx * legW;
        doc.setFillColor(it.color[0], it.color[1], it.color[2]);
        doc.circle(lx + 4, legendY - 2.5, 3, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(18, 41, 77);
        doc.text(it.label, lx + 10, legendY);
      });

      return legendY + 10;
    },
    tableHeaders: ['Nivel de Logro', 'Rango de Cumplimiento', 'Cantidad de Fichas', 'Porcentaje (%)', 'Interpretación Institucional'],
    tableRows: [
      ['Logrado', '≥ 85%', String(dist.logrado), `${pctLogrado}%`, 'Nivel óptimo; cumple satisfactoriamente los estándares evaluados'],
      ['En proceso', '70% – 84%', String(dist.proceso), `${pctProceso}%`, 'En desarrollo; requiere fortalecimiento de prácticas pedagógicas'],
      ['Por mejorar', '< 70%', String(dist.inicio), `${pctInicio}%`, 'Requiere asistencia técnica focalizada y acompañamiento prioritario'],
      ['Sin datos', '—', String(dist.none), `${pctNone}%`, 'Fichas sin respuestas o con indicadores no evaluados'],
      ['TOTAL', '—', String(totalFichas), '100%', 'Total consolidado de visitas de monitoreo procesadas']
    ],
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 95 },
      1: { halign: 'center', cellWidth: 95 },
      2: { halign: 'center', cellWidth: 70, fontStyle: 'bold' },
      3: { halign: 'center', cellWidth: 65, fontStyle: 'bold' },
      4: { halign: 'left' }
    }
  });

  // ==========================================
  // SECCIÓN 2: AVANCE POR SECCIÓN / DIMENSIÓN
  // ==========================================
  if (!isAllMode && fichaType && fichaType.secciones && fichaType.secciones.length > 0) {
    const secAgg = {};
    fichaType.secciones.forEach(sec => {
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

    const secTableRows = fichaType.secciones.map((sec, idx) => {
      const a = secAgg[sec.nombre];
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      const statusLabel = avg === null ? 'Sin datos' : (avg >= 85 ? 'Logrado' : (avg >= 70 ? 'En proceso' : 'Por mejorar'));
      return [
        String(idx + 1),
        sec.nombre,
        String(a.itemsCount),
        avg !== null ? `${avg}%` : '—',
        { pct: avg },
        statusLabel
      ];
    });

    customTables.push({
      title: 'II. AVANCE POR SECCIÓN / DIMENSIÓN EVALUADA',
      subtitle: 'Nivel de cumplimiento promedio obtenido en cada una de las dimensiones que integran el instrumento de monitoreo.',
      minHeight: 100,
      tableHeaders: ['N.°', 'Sección / Dimensión Evaluada', 'N.° Indicadores', '% Cumpl.', 'Gráfica de Avance', 'Nivel Alcanzado'],
      tableRows: secTableRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: isLandscape ? 220 : 160 },
        2: { halign: 'center', cellWidth: 65 },
        3: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: isLandscape ? 180 : 120 },
        5: { halign: 'center', cellWidth: 70, fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const doc = data.doc;
          if (!doc) return;
          const rawObj = data.cell.raw;
          const pct = rawObj && rawObj.pct !== undefined ? rawObj.pct : null;
          if (pct !== null) {
            const trackX = data.cell.x + 6;
            const trackY = data.cell.y + (data.cell.height - 8) / 2;
            const trackW = data.cell.width - 12;
            const trackH = 8;
            doc.setFillColor(235, 238, 242);
            doc.roundedRect(trackX, trackY, trackW, trackH, 2, 2, 'F');
            const fillW = Math.max(2, trackW * (Math.min(pct, 100) / 100));
            if (pct >= 85) doc.setFillColor(5, 150, 105);
            else if (pct >= 70) doc.setFillColor(217, 119, 6);
            else doc.setFillColor(220, 38, 38);
            doc.roundedRect(trackX, trackY, fillW, trackH, 2, 2, 'F');
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
      if (x.st.pct !== null) { a.sum += x.st.pct; a.cnt++; }
      if (x.st.pct >= 85) a.logrado++;
      else if (x.st.pct >= 70) a.proceso++;
      else if (x.st.pct !== null) a.inicio++;
    });

    const typeRows = Object.values(typeAgg).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((a, idx) => {
      const avg = a.cnt ? Math.round(a.sum / a.cnt) : null;
      return [
        String(idx + 1),
        a.nombre,
        String(a.total),
        avg !== null ? `${avg}%` : '—',
        { pct: avg },
        `L: ${a.logrado}  ·  P: ${a.proceso}  ·  I: ${a.inicio}`
      ];
    });

    customTables.push({
      title: 'II. AVANCE GENERAL POR TIPO DE FICHA',
      subtitle: 'Promedio de cumplimiento y distribución de estados comparativos por cada tipo de ficha registrada.',
      minHeight: 100,
      tableHeaders: ['N.°', 'Tipo de Ficha de Monitoreo', 'Fichas Registradas', '% Cumpl.', 'Gráfica de Avance', 'Distribución (L / P / I)'],
      tableRows: typeRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: isLandscape ? 220 : 160 },
        2: { halign: 'center', cellWidth: 70 },
        3: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
        4: { halign: 'center', cellWidth: isLandscape ? 170 : 110 },
        5: { halign: 'center', cellWidth: 95, fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const doc = data.doc;
          if (!doc) return;
          const rawObj = data.cell.raw;
          const pct = rawObj && rawObj.pct !== undefined ? rawObj.pct : null;
          if (pct !== null) {
            const trackX = data.cell.x + 6;
            const trackY = data.cell.y + (data.cell.height - 8) / 2;
            const trackW = data.cell.width - 12;
            const trackH = 8;
            doc.setFillColor(235, 238, 242);
            doc.roundedRect(trackX, trackY, trackW, trackH, 2, 2, 'F');
            const fillW = Math.max(2, trackW * (Math.min(pct, 100) / 100));
            if (pct >= 85) doc.setFillColor(5, 150, 105);
            else if (pct >= 70) doc.setFillColor(217, 119, 6);
            else doc.setFillColor(220, 38, 38);
            doc.roundedRect(trackX, trackY, fillW, trackH, 2, 2, 'F');
          }
        }
      }
    });
  }

  // ==========================================
  // SECCIÓN 3: REPORTE POR ÍTEM (INDICADORES)
  // ==========================================
  if (!isAllMode && fichaType && fichaType.secciones && fichaType.secciones.length > 0) {
    const itemReportRows = [];
    const subs = statsList.map(x => x.s);

    fichaType.secciones.forEach((sec, sIdx) => {
      // Calcular promedio de sección
      let secScoreSum = 0, secScoreCnt = 0;
      const itemsData = (sec.items || []).map((it, itIdx) => {
        const counts = {};
        let scoreSum = 0, scoreCnt = 0, total = 0;
        subs.forEach(s => {
          const r = (s.respuestas || []).find(x => x.id === it.id);
          if (r && r.valor !== undefined && r.valor !== null && r.valor !== '') {
            counts[r.valor] = (counts[r.valor] || 0) + 1;
            total++;
            let sc = null;
            const v = r.valor;
            const tipo = fichaType.tipoRespuesta;
            if (tipo === 'si_no') sc = v === 'si' ? 1 : (v === 'no' ? 0 : null);
            else if (tipo === 'escala_1_3') sc = Math.max(0, Math.min(1, Number(v) / 3));
            else if (tipo === 'nivel_1_4') sc = Math.max(0, Math.min(1, Number(v) / 4));
            else if (tipo === 'ips') sc = v === 'logrado' ? 1 : (v === 'proceso' ? 0.5 : (v === 'inicio' ? 0 : null));

            if (sc !== null) {
              scoreSum += sc;
              scoreCnt++;
              secScoreSum += sc;
              secScoreCnt++;
            }
          }
        });
        const pct = scoreCnt ? Math.round((scoreSum / scoreCnt) * 100) : null;
        return { it, itIdx, counts, total, pct };
      });

      const secAvg = secScoreCnt ? Math.round((secScoreSum / secScoreCnt) * 100) : null;
      const secStatus = secAvg === null ? 'Sin datos' : (secAvg >= 85 ? 'Logrado' : (secAvg >= 70 ? 'En proceso' : 'Por mejorar'));

      // Fila de encabezado de dimensión / sección (banner azul)
      itemReportRows.push([
        {
          content: `DIMENSIÓN ${sIdx + 1}: ${sec.nombre.toUpperCase()}  (Promedio: ${secAvg !== null ? secAvg + '%' : '—'} · ${secStatus})`,
          colSpan: 6,
          styles: {
            fillColor: [18, 41, 77],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'left',
            fontSize: 8
          }
        }
      ]);

      // Filas para cada indicador
      itemsData.forEach(({ it, itIdx, counts, total, pct }) => {
        const respParts = [];
        const optKeys = Object.keys(counts);
        optKeys.forEach(k => {
          let label = k;
          if (k === 'si') label = 'Sí';
          else if (k === 'no') label = 'No';
          else if (k === 'na') label = 'N/A';
          else if (k === 'logrado') label = 'Logrado';
          else if (k === 'proceso') label = 'Proceso';
          else if (k === 'inicio') label = 'Inicio';
          respParts.push(`${label}: ${counts[k]}`);
        });
        const respSummary = respParts.length ? respParts.join('  ·  ') : 'Sin respuestas';
        const itStatus = pct === null ? 'Sin datos' : (pct >= 85 ? 'Logrado' : (pct >= 70 ? 'En proceso' : 'Por mejorar'));

        itemReportRows.push([
          `${sIdx + 1}.${itIdx + 1}`,
          it.texto,
          respSummary,
          { counts, total, tipoRespuesta: fichaType.tipoRespuesta },
          pct !== null ? `${pct}%` : '—',
          itStatus
        ]);
      });
    });

    customTables.push({
      title: 'III. REPORTE POR ÍTEM (EVALUACIÓN DETALLADA DE CADA INDICADOR)',
      subtitle: 'Desglose de respuestas registradas, distribución proporcional y porcentaje de logro por cada indicador evaluado.',
      minHeight: 120,
      tableHeaders: ['N.°', 'Indicador / Ítem Evaluado', 'Respuestas Registradas', 'Distribución Visual', '% Cumpl.', 'Estado'],
      tableRows: itemReportRows,
      columnStyles: {
        0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
        1: { halign: 'left', cellWidth: isLandscape ? 220 : 160 },
        2: { halign: 'left', cellWidth: isLandscape ? 140 : 95 },
        3: { halign: 'center', cellWidth: isLandscape ? 110 : 80 },
        4: { halign: 'center', cellWidth: 48, fontStyle: 'bold' },
        5: { halign: 'center', cellWidth: 65, fontStyle: 'bold' }
      },
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const doc = data.doc;
          if (!doc) return;
          const rawObj = data.cell.raw;
          if (rawObj && rawObj.counts && rawObj.total > 0) {
            const { counts, total } = rawObj;
            const trackX = data.cell.x + 4;
            const trackY = data.cell.y + (data.cell.height - 8) / 2;
            const trackW = data.cell.width - 8;
            const trackH = 8;

            doc.setFillColor(235, 238, 242);
            doc.roundedRect(trackX, trackY, trackW, trackH, 1.5, 1.5, 'F');

            let curX = trackX;
            const optKeys = Object.keys(counts);
            optKeys.forEach(val => {
              const cnt = counts[val] || 0;
              if (cnt > 0) {
                const segW = (cnt / total) * trackW;
                let col = [156, 163, 175]; // gris por defecto
                const vLower = String(val).toLowerCase();
                if (vLower === 'si' || vLower === '3' || vLower === '4' || vLower === 'logrado') col = [5, 150, 105]; // verde
                else if (vLower === '2' || vLower === 'proceso') col = [217, 119, 6]; // ámbar
                else if (vLower === 'no' || vLower === '1' || vLower === 'inicio') col = [220, 38, 38]; // rojo
                doc.setFillColor(col[0], col[1], col[2]);
                doc.rect(curX, trackY, segW, trackH, 'F');
                curX += segW;
              }
            });
          }
        }
      }
    });
  }

  // ==========================================
  // SECCIÓN 4: DETALLE DE FICHAS REGISTRADAS
  // ==========================================
  const detailTableHeaders = isAllMode
    ? ['N.°', 'Fecha', 'Institución Educativa', 'Tipo de Ficha', 'UGEL / RED', 'Visita', 'Especialista', '% Cumpl.', 'Estado']
    : ['N.°', 'Fecha', 'Institución Educativa', 'UGEL / RED', 'Visita', 'Responsable', '% Cumpl.', 'Estado'];

  const detailTableRows = statsList.map((x, idx) => {
    const s = x.s;
    const st = x.st;
    const pctVal = st.pct !== null ? `${st.pct}%` : '—';
    const statusLabel = st.pct === null ? 'Sin datos' : (st.pct >= 85 ? 'Logrado' : (st.pct >= 70 ? 'En proceso' : 'Por mejorar'));
    const ugelText = s.ugel || 'UGEL 03';
    const redText = s.red ? (s.red.toLowerCase().includes('red') || s.red.toLowerCase().includes('rei') ? s.red : 'RED ' + s.red) : 'No aplica';
    const ugelRed = `${ugelText}\n${redText}`;

    if (isAllMode) {
      return [
        String(idx + 1),
        formatDate(s.fecha),
        s.institucion || '—',
        s.fichaTypeNombre || '—',
        ugelRed,
        s.visita ? `V${s.visita}` : '—',
        s.responsable || '—',
        pctVal,
        statusLabel
      ];
    } else {
      return [
        String(idx + 1),
        formatDate(s.fecha),
        s.institucion || '—',
        ugelRed,
        s.visita ? `V${s.visita}` : '—',
        s.responsable || '—',
        pctVal,
        statusLabel
      ];
    }
  });

  const sectionNum = customTables.length + 1;
  const romanNums = ['I', 'II', 'III', 'IV', 'V'];
  const secRoman = romanNums[sectionNum - 1] || `${sectionNum}`;

  customTables.push({
    title: `${secRoman}. DETALLE DE FICHAS DE MONITOREO REGISTRADAS`,
    subtitle: 'Relación individualizada de las visitas de monitoreo registradas con los filtros aplicados.',
    minHeight: 120,
    tableHeaders: detailTableHeaders,
    tableRows: detailTableRows,
    columnStyles: isAllMode ? {
      0: { halign: 'center', cellWidth: 26, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 55 },
      2: { halign: 'left', cellWidth: 150 },
      3: { halign: 'left', cellWidth: 110 },
      4: { halign: 'center', cellWidth: 80 },
      5: { halign: 'center', cellWidth: 38 },
      6: { halign: 'left', cellWidth: 120 },
      7: { halign: 'center', cellWidth: 50, fontStyle: 'bold' },
      8: { halign: 'center', cellWidth: 65, fontStyle: 'bold' }
    } : {
      0: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 60 },
      2: { halign: 'left', cellWidth: 210 },
      3: { halign: 'center', cellWidth: 95 },
      4: { halign: 'center', cellWidth: 45 },
      5: { halign: 'left', cellWidth: 145 },
      6: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 70, fontStyle: 'bold' }
    }
  });

  const safeName = sanitizeFilename(isAllMode ? 'general' : (fichaType ? fichaType.nombre : 'reporte'));
  const filename = `Reporte_Consolidado_${safeName}_${getLimaDateStr()}.pdf`;

  const defaultSignatures = [
    { cargo: 'Especialista Responsable de Monitoreo — [ÁREA] – UGEL 03', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'Jefatura de [ÁREA] — UGEL 03 – DRELM', entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: `Consolidado Oficial de Monitoreo y Acompañamiento 2026 · UGEL 03 · ${filterSubtitle}`,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid,
    customTables, // Array completo de tablas con gráficos vectoriales y barras
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
 * Exporta el Reporte de Concursos Escolares a PDF en orientación HORIZONTAL (Landscape)
 * Tabla agrupada por Disciplina — Categoría con filas de subtítulo y orden por puesto.
 */
export async function exportConcursosReportPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const concursoNombre = tipoConcurso ? tipoConcurso.nombre : 'CONCURSOS EDUCATIVOS ESCOLARES';
  const title = `ACTA OFICIAL DE RESULTADOS — ${concursoNombre.toUpperCase()}`;

  // Deduplicación preventiva de registros exactos para evitar conteos erróneos
  const cleanRows = deduplicateConcursoRows(filtered);
  const totalRegs = cleanRows.length;

  // Criterio unificado: contar instituciones por CÓDIGO MODULAR
  const uniqueColegios = new Set(cleanRows.map(r => r.codigoModular || r.institucion).filter(Boolean)).size;

  // Etapa real presente
  const etapasPresentes = [...new Set(cleanRows.map(r => r.etapa).filter(Boolean))];
  const etapaLabel = filters.etapa
    ? filters.etapa
    : (etapasPresentes.length === 1 ? etapasPresentes[0] : (etapasPresentes.length > 1 ? etapasPresentes.join(', ') : 'UGEL'));

  // Filtros aplicados visibles (Orden: Etapa -> Disciplina -> Categoría -> Género)
  const filtrosArr = [];
  if (filters.etapa) filtrosArr.push(`Etapa: ${filters.etapa}`);
  if (filters.disciplina) filtrosArr.push(`Disciplina: ${filters.disciplina}`);
  if (filters.categoria) filtrosArr.push(`Categoría: ${filters.categoria}`);
  if (filters.genero) filtrosArr.push(`Género: ${filters.genero}`);
  const filtrosTexto = filtrosArr.length ? `Filtros: ${filtrosArr.join(' · ')}` : `Etapa oficial: ${etapaLabel}`;

  const introParagraph = `En el marco de las bases generales de los Concursos Educativos Escolares 2026 promovidos por el Ministerio de Educación y la UGEL 03, se emite la presente Acta Oficial de Resultados y Premiaciones para ${concursoNombre} en la Etapa ${etapaLabel}. Se consolidan a continuación los estudiantes ganadores, delegaciones e instituciones educativas reconocidas. ${filtrosTexto}.`;

  const metaGrid = [
    { label: 'Concurso Educativo', value: concursoNombre },
    { label: 'Etapa', value: etapaLabel },
    { label: 'Total Registros / Premiaciones', value: String(totalRegs) },
    { label: 'Instituciones Participantes', value: String(uniqueColegios), note: '* Cuenta por código modular' }
  ];

  const tableHeaders = ['Puesto', 'Institución Educativa', 'Categoría', 'Área / Disciplina', 'Participantes (DNI)', 'Docente Asesor', 'Etapa', 'Resolución Ref.'];

  // Agrupar filas por: Disciplina — Categoría
  const groupsMap = new Map();
  cleanRows.forEach(r => {
    const disc = (r.disciplina || r.tituloTrabajo || 'General').trim();
    const cat = (r.categoria || 'Única').trim();
    const groupKey = `${disc} · Categoría ${cat}`;
    if (!groupsMap.has(groupKey)) {
      groupsMap.set(groupKey, []);
    }
    groupsMap.get(groupKey).push(r);
  });

  // Dentro de cada grupo, ordenar por Puesto (1, 2, 3, menciones, sin puesto) y luego por Institución
  const tableRows = [];
  const groupKeys = Array.from(groupsMap.keys()).sort((a, b) => a.localeCompare(b));

  groupKeys.forEach(groupName => {
    const rowsInGroup = groupsMap.get(groupName).sort((a, b) => {
      const rk = puestoRank(a.puesto) - puestoRank(b.puesto);
      if (rk !== 0) return rk;
      return (a.institucion || '').localeCompare(b.institucion || '');
    });

    // Fila de subtítulo agrupador (full width)
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

    rowsInGroup.forEach(r => {
      const ieText = r.codigoModular
        ? `${(r.institucion || '—').toUpperCase()}\nCód. Mod.: ${r.codigoModular}`
        : (r.institucion || '—').toUpperCase();

      // Participantes en formato unificado: APELLIDOS, Nombres
      let partText = (r.participantes || []).map(p => {
        const nom = formatPersonName(p);
        const dni = p.dni ? `DNI: ${p.dni}` : '';
        return dni ? `${nom}\n${dni}` : nom;
      }).filter(Boolean).join('\n\n');

      if (!partText) {
        partText = 'Sin participante registrado';
      }

      // Docente asesor en formato unificado: APELLIDOS, Nombres
      let asestext = (r.asesores || []).map(a => {
        const nom = formatPersonName(a);
        const dni = a.dni ? `DNI: ${a.dni}` : '';
        const rol = a.rol ? `(${a.rol})` : '';
        const line2 = [dni, rol].filter(Boolean).join(' ');
        return line2 ? `${nom}\n${line2}` : nom;
      }).filter(Boolean).join('\n\n');

      if (!asestext) {
        asestext = 'Sin docente asesor registrado';
      }

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
  });

  const filename = `Acta_Resultados_${sanitizeFilename(concursoNombre)}_${getLimaDateStr()}.pdf`;

  const defaultSignatures = [
    { cargo: 'Coordinador(a) del Concurso', entidad: 'Comisión Organizadora UGEL 03', leyenda: 'Firma y Sello' },
    { cargo: 'Especialista de AGEBRE / Jurado', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
    { cargo: 'V.° B.° Jefatura AGEBRE', entidad: 'UGEL 03', leyenda: 'Sello Institucional' }
  ];

  await createOfficialPdfDocument({
    title,
    subtitle: `Comisión Organizadora de Concursos Escolares 2026 · UGEL 03 · ${filtrosTexto}`,
    orientation: isLandscape ? 'landscape' : 'portrait',
    introParagraph,
    metaGrid,
    tableHeaders,
    tableRows,
    columnStyles: {
      0: { halign: 'center', cellWidth: 55, fontStyle: 'bold' },
      1: { halign: 'left', cellWidth: 135 },
      2: { halign: 'center', cellWidth: 50 },
      3: { halign: 'left', cellWidth: 90 },
      4: { halign: 'left', cellWidth: 185 },
      5: { halign: 'left', cellWidth: 115 },
      6: { halign: 'center', cellWidth: 45, fontStyle: 'bold' },
      7: { halign: 'center', cellWidth: 95 }
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

/**
 * Exporta el Acta Oficial en Formato "Orden de Mérito" (solo puestos 1.° a 3.° estilo Anexo E20)
 */
export async function exportActaOrdenMeritoPdf(filtered, tipoConcurso, filters = {}, downloadConfig = {}) {
  const isLandscape = downloadConfig.orientation ? (downloadConfig.orientation === 'landscape') : true;
  const concursoNombre = tipoConcurso ? tipoConcurso.nombre : 'CONCURSOS EDUCATIVOS ESCOLARES';
  const title = `ACTA DE ORDEN DE MÉRITO — ${concursoNombre.toUpperCase()}`;

  // Filtrar exclusivamente puestos 1.°, 2.°, 3.°
  const cleanRows = deduplicateConcursoRows(filtered);
  const podiumRows = cleanRows.filter(r => {
    const rk = puestoRank(r.puesto);
    return rk >= 1 && rk <= 3;
  });

  if (podiumRows.length === 0) {
    throw new Error('No se encontraron registros con 1.er, 2.° o 3.er puesto para generar el Acta de Orden de Mérito.');
  }

  const uniqueColegios = new Set(podiumRows.map(r => r.codigoModular || r.institucion).filter(Boolean)).size;
  const etapaLabel = filters.etapa || 'UGEL';

  const introParagraph = `En el marco de las bases generales de los Concursos Educativos Escolares 2026 promovidos por el Ministerio de Educación y la UGEL 03, se emite la presente Acta Oficial de Orden de Mérito (Podio Oficial de Ganadores) para ${concursoNombre} en la Etapa ${etapaLabel}. Se reconocen y proclaman formalmente a las delegaciones escolares que alcanzaron los primeros lugares en sus respectivas categorías y disciplinas.`;

  const metaGrid = [
    { label: 'Concurso Educativo', value: concursoNombre },
    { label: 'Etapa', value: etapaLabel },
    { label: 'Total Ganadores en Podio', value: String(podiumRows.length) },
    { label: 'Instituciones Ganadoras', value: String(uniqueColegios), note: '* Cuenta por código modular' }
  ];

  const tableHeaders = ['Puesto', 'Institución Educativa', 'Cód. Modular', 'UGEL / DRE', 'Participante(s) Ganador(es)', 'Docente Asesor / Entrenador', 'Resolución Ref.'];

  // Agrupar por Categoría / Disciplina
  const groupsMap = new Map();
  podiumRows.forEach(r => {
    const disc = (r.disciplina || r.tituloTrabajo || 'General').trim();
    const cat = (r.categoria || 'Única').trim();
    const groupKey = `${disc} — Categoría ${cat}`;
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

      const asestext = (r.asesores || []).map(a => {
        const nom = formatPersonName(a);
        const dni = a.dni ? `DNI: ${a.dni}` : '';
        return dni ? `${nom}\n${dni}` : nom;
      }).filter(Boolean).join('\n\n') || 'Sin docente asesor registrado';

      tableRows.push([
        formatPuestoLabel(r.puesto),
        (r.institucion || '—').toUpperCase(),
        r.codigoModular || '—',
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

  const filename = `Acta_Orden_Merito_${sanitizeFilename(concursoNombre)}_${getLimaDateStr()}.pdf`;

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
