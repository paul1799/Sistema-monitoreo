/**
 * scripts/seed-areas-firmantes.js
 * Script para sembrar en Firestore las colecciones iniciales de Áreas de Firma y Plantillas de Firmantes
 * para la UGEL 03 (AGEBRE, AGEBATP, AGP, AGI, DIRECCIÓN).
 */

export const INITIAL_AREAS = [
  {
    id: 'agebre',
    nombre: 'Área de Gestión de la Educación Básica Regular y Especial',
    sigla: 'AGEBRE',
    descripcionEncabezado: 'Área de Gestión de la\nEducación Básica (2026)',
    logo: '',
    activa: true,
    esPredeterminada: true,
    orden: 1
  },
  {
    id: 'agebatp',
    nombre: 'Área de Gestión de la Educación Básica Alternativa y Técnico-Productiva',
    sigla: 'AGEBATP',
    descripcionEncabezado: 'Área de Gestión de la Educ. Básica\nAlternativa y Técnico-Prod. (2026)',
    logo: '',
    activa: true,
    esPredeterminada: false,
    orden: 2
  },
  {
    id: 'agp',
    nombre: 'Área de Gestión Pedagógica',
    sigla: 'AGP',
    descripcionEncabezado: 'Área de Gestión Pedagógica\nUGEL 03 (2026)',
    logo: '',
    activa: true,
    esPredeterminada: false,
    orden: 3
  },
  {
    id: 'agi',
    nombre: 'Área de Gestión Institucional',
    sigla: 'AGI',
    descripcionEncabezado: 'Área de Gestión Institucional\nUGEL 03 (2026)',
    logo: '',
    activa: true,
    esPredeterminada: false,
    orden: 4
  },
  {
    id: 'dir_ugel',
    nombre: 'Dirección de la UGEL N.° 03',
    sigla: 'DIRECCIÓN',
    descripcionEncabezado: 'Dirección de la Unidad de Gestión\nEducativa Local N.° 03',
    logo: '',
    activa: true,
    esPredeterminada: false,
    orden: 5
  }
];

export const INITIAL_PLANTILLAS = [
  // --- Concursos ---
  {
    tipoReporte: 'concursos',
    orden: 1,
    cargo: 'Coordinador(a) del Concurso — Comisión Organizadora UGEL 03',
    nombreOpcional: '',
    entidad: 'Comisión Organizadora UGEL 03',
    leyenda: 'Firma y Sello'
  },
  {
    tipoReporte: 'concursos',
    orden: 2,
    cargo: 'Especialista de [ÁREA] / Jurado — UGEL 03 – DRELM',
    nombreOpcional: '',
    entidad: 'UGEL 03 – DRELM',
    leyenda: 'Firma y Sello'
  },
  {
    tipoReporte: 'concursos',
    orden: 3,
    cargo: 'V.° B.° Jefatura [ÁREA] — UGEL 03',
    nombreOpcional: '',
    entidad: 'UGEL 03',
    leyenda: 'Sello Institucional'
  },

  // --- Consolidado ---
  {
    tipoReporte: 'consolidado',
    orden: 1,
    cargo: 'Especialista Responsable de Monitoreo — [ÁREA] – UGEL 03',
    nombreOpcional: '',
    entidad: 'UGEL 03 – DRELM',
    leyenda: 'Firma y Sello'
  },
  {
    tipoReporte: 'consolidado',
    orden: 2,
    cargo: 'Jefatura de [ÁREA] — UGEL 03 – DRELM',
    nombreOpcional: '',
    entidad: 'UGEL 03 – DRELM',
    leyenda: 'V.° B.° y Sello'
  },

  // --- Individual ---
  {
    tipoReporte: 'individual',
    orden: 1,
    cargo: 'Especialista que monitorea — [ÁREA]',
    nombreOpcional: '',
    entidad: 'UGEL 03 – DRELM',
    leyenda: 'Firma y Sello'
  },
  {
    tipoReporte: 'individual',
    orden: 2,
    cargo: 'Director(a) / Autoridad de la I.E.',
    nombreOpcional: '',
    entidad: 'Institución Educativa',
    leyenda: 'Firma y Sello'
  },
  {
    tipoReporte: 'individual',
    orden: 3,
    cargo: 'Jefatura de [ÁREA]',
    nombreOpcional: '',
    entidad: 'UGEL 03',
    leyenda: 'V.° B.°'
  },

  // --- Avance / Por Ítem ---
  {
    tipoReporte: 'avance',
    orden: 1,
    cargo: 'Especialista Responsable — [ÁREA]',
    nombreOpcional: '',
    entidad: 'UGEL 03 – DRELM',
    leyenda: 'Firma y Sello'
  },
  {
    tipoReporte: 'avance',
    orden: 2,
    cargo: 'Jefatura de [ÁREA]',
    nombreOpcional: '',
    entidad: 'UGEL 03',
    leyenda: 'V.° B.°'
  }
];

/**
 * Función para sembrar áreas y plantillas en Firestore mediante dbNs
 */
export async function seedAreasFirmantes(dbNs) {
  if (!dbNs) throw new Error('Se requiere instancia dbNs');

  // 1. Sembrar áreas
  for (const area of INITIAL_AREAS) {
    await dbNs.collection('areasFirma').doc(area.id).set({
      ...area,
      updatedAt: Date.now()
    }, { merge: true });
  }

  // 2. Sembrar plantillas por área
  for (const area of INITIAL_AREAS) {
    for (const p of INITIAL_PLANTILLAS) {
      const pid = `${area.id}_${p.tipoReporte}_${p.orden}`;
      const cargoFinal = p.cargo.replace(/\[ÁREA\]/g, area.sigla);
      await dbNs.collection('plantillasFirmantes').doc(pid).set({
        id: pid,
        areaId: area.id,
        tipoReporte: p.tipoReporte,
        orden: p.orden,
        cargo: cargoFinal,
        nombreOpcional: p.nombreOpcional || '',
        entidad: p.entidad.replace(/\[ÁREA\]/g, area.sigla),
        leyenda: p.leyenda,
        updatedAt: Date.now()
      }, { merge: true });
    }
  }

  return { areas: INITIAL_AREAS.length, plantillas: INITIAL_AREAS.length * INITIAL_PLANTILLAS.length };
}
