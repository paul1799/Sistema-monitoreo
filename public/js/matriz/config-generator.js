/**
 * public/js/matriz/config-generator.js
 * Generador de configuración estructural para la Matriz Excel
 * UGEL 03 · AGEBRE
 */

import {
  isFichaJec,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico
} from '../calc/detectors.js';

import { PALETA_MATRIZ } from './estilos.js';
import { LIMITES_NIVEL_FICHAS } from './limites.js';
import { obtenerComponentesJec, generarItemsConColumnasJec } from './items-jec.js';
import { ITEMS_COORD_TUTORIA_JEC } from './items-tutoria.js';
import { ITEMS_COORD_PEDAGOGICO } from './items-pedagogico.js';

/**
 * Detecta si la ficha corresponde al Cuadernillo de Monitoreo Pedagógico a Docentes (EBR-EBA)
 */
export function isFichaMonitoreoDocente(ft, state = null) {
  if (!ft) return false;
  const id = String(ft.id || '').toLowerCase();
  const nom = String(ft.nombre || '').toLowerCase();
  const mod = String(ft.modalidad || '').toLowerCase();
  return id === 'ft_rubricas_aula' || id.includes('rubricas_aula') || nom.includes('cuadernillo del monitoreo pedag') || nom.includes('monitoreo a docentes') || (mod === 'docentes' && id.includes('docente'));
}

/**
 * Genera la configuración completa para una ficha según su tipo o plantilla dinámica
 * @param {Object} ft - Definición de la ficha en el sistema (state.fichaTypes) o submission
 * @param {Object} [state] - Estado global de la app
 * @returns {Object} Configuración para el generador Excel
 */
export function getMatrizConfig(ft, state = null) {
  if (isFichaJec(ft, state)) {
    const componentes = obtenerComponentesJec(ft);
    const { items } = generarItemsConColumnasJec(componentes);
    return {
      sheetName: 'MODELO JEC',
      tituloDocumento: 'MATRIZ DE SEGUIMIENTO 2026 — MODELO JEC',
      tipoFicha: 'A',
      esJecReal: true,
      componentes: componentes,
      limites: LIMITES_NIVEL_FICHAS.MODELO_JEC,
      items: items,
      datosGeneralesCampos: [
        { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
        { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
        { key: 'ugel', header: 'UGEL', width: 9.0, isText: true },
        { key: 'red', header: 'RED', width: 8.6, isText: true },
        { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
        { key: 'secciones', header: 'SECCIONES', width: 6.7 },
        { key: 'estudiantes', header: 'Cantidad de estudiantes', width: 6.7 },
        { key: 'docentes', header: 'Cantidad de docentes', width: 6.7 },
        { key: 'formacionTecnica', header: 'IE implementa el modelo de Servicio Educativo Secundaria con Formación Técnica', width: 6.7, isSiNo: true },
        { key: 'cantidadCp', header: 'Cantidad de C.P', width: 6.7 },
        { key: 'cantidadCt', header: 'Cantidad de C.T', width: 6.7 }
      ],
      bloquesPersonas: [
        {
          titulo: 'II. DATOS DEL DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona1Header,
          fillSubheader: PALETA_MATRIZ.persona1Subheader,
          fillData: PALETA_MATRIZ.persona1Data,
          campos: [
            { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
            { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
            { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'dirCondicion', header: 'Condición', width: 12.1 },
            { key: 'dirCorreo', header: 'Correo', width: 26.7 }
          ]
        },
        {
          titulo: 'III. DATOS DEL SUB DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona2Header,
          fillSubheader: PALETA_MATRIZ.persona2Subheader,
          fillData: PALETA_MATRIZ.persona2Data,
          campos: [
            { key: 'subNombre', header: 'Nombres y Apellidos', width: 26.7 },
            { key: 'subDni', header: 'DNI', width: 11.3, isText: true },
            { key: 'subTelefono', header: 'Teléfono', width: 12.4, isText: true },
            { key: 'subCondicion', header: 'Condición', width: 12.0 },
            { key: 'subCorreo', header: 'Correo', width: 18.1 }
          ]
        }
      ]
    };
  }

  // B) Coordinador(a) de Tutoría JEC
  if (isFichaCoordTutoriaJec(ft, state)) {
    // Si la ficha en state tiene secciones e ítems propios, usar los de la ficha
    const items = (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0)
      ? _extraerItemsDeSecciones(ft.secciones)
      : ITEMS_COORD_TUTORIA_JEC;

    return {
      sheetName: 'COORD. TUTORIA JEC',
      tituloDocumento: 'MATRIZ DE SEGUIMIENTO 2026 — COORDINADOR(A) DE TUTORÍA (JEC)',
      tipoFicha: 'B',
      limites: (ft && ft.regla_nivel && ft.regla_nivel.rangos)
        ? _calcularLimitesDesdeRangos(ft.regla_nivel, items.length)
        : LIMITES_NIVEL_FICHAS.COORD_TUTORIA_JEC,
      items: items,
      datosGeneralesCampos: [
        { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
        { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
        { key: 'ugel', header: 'UGEL', width: 9.0, isText: true },
        { key: 'red', header: 'RED', width: 10.0, isText: true },
        { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
        { key: 'visita', header: 'Visita', width: 8.0 },
        { key: 'docentesTutores', header: 'N° de docentes tutores a cargo', width: 12.0 }
      ],
      bloquesPersonas: [
        {
          titulo: 'II. DATOS DEL DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona1Header,
          fillSubheader: PALETA_MATRIZ.persona1Subheader,
          fillData: PALETA_MATRIZ.persona1Data,
          campos: [
            { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
            { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
            { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'dirCondicion', header: 'Condición', width: 12.1 },
            { key: 'dirCorreo', header: 'Correo', width: 26.7 }
          ]
        },
        {
          titulo: 'III. DATOS DEL COORDINADOR(A) DE TUTORÍA',
          fillHeader: PALETA_MATRIZ.persona2Header,
          fillSubheader: PALETA_MATRIZ.persona2Subheader,
          fillData: PALETA_MATRIZ.persona2Data,
          campos: [
            { key: 'coordTutoriaNombre', header: 'Nombres y Apellidos', width: 28.0 },
            { key: 'coordTutoriaDni', header: 'DNI', width: 11.5, isText: true },
            { key: 'coordTutoriaTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'coordTutoriaCondicion', header: 'Condición', width: 12.0 },
            { key: 'coordTutoriaCorreo', header: 'Correo', width: 22.0 }
          ]
        }
      ]
    };
  }

  // C) Coordinador(a) Pedagógico
  if (isFichaCoordPedagogico(ft, state)) {
    const items = (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0)
      ? _extraerItemsDeSecciones(ft.secciones)
      : ITEMS_COORD_PEDAGOGICO;

    // Regla oficial Coordinador Pedagógico JEC (17 ítems, escala 1-3, máx 51 pts):
    // Cumple: 41 a 51 (max: 51) | Cumple parcialmente: 28 a 40 (limProceso: 40) | No cumple: 17 a 27 (limInicio: 27)
    // Se protege contra cualquier plantilla que haya heredado erróneamente los límites de Tutoría (63/52/41).
    let limites = LIMITES_NIVEL_FICHAS.COORD_PEDAGOGICO;
    if (ft && ft.regla_nivel && ft.regla_nivel.rangos && ft.regla_nivel.maxPuntaje && ft.regla_nivel.maxPuntaje !== 63) {
      limites = _calcularLimitesDesdeRangos(ft.regla_nivel, items.length);
    } else if (items.length !== 17 && items.length > 0) {
      const maxPts = items.length * 3;
      limites = {
        max: maxPts,
        limInicio: Math.round(maxPts * 27 / 51),
        limProceso: Math.round(maxPts * 40 / 51)
      };
    }

    return {
      sheetName: 'COORD. PEDAGOGICO',
      tituloDocumento: 'MATRIZ DE SEGUIMIENTO 2026 — COORDINADOR(A) PEDAGÓGICO',
      tipoFicha: 'C',
      limites: limites,
      items: items,
      datosGeneralesCampos: [
        { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
        { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
        { key: 'ugel', header: 'UGEL', width: 9.0, isText: true },
        { key: 'red', header: 'RED', width: 10.0, isText: true },
        { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
        { key: 'visita', header: 'Visita', width: 8.0 },
        { key: 'docentesACargo', header: 'N° de docentes a cargo', width: 12.0 }
      ],
      bloquesPersonas: [
        {
          titulo: 'II. DATOS DEL DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona1Header,
          fillSubheader: PALETA_MATRIZ.persona1Subheader,
          fillData: PALETA_MATRIZ.persona1Data,
          campos: [
            { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
            { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
            { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'dirCondicion', header: 'Condición', width: 12.1 },
            { key: 'dirCorreo', header: 'Correo', width: 26.7 }
          ]
        },
        {
          titulo: 'III. DATOS DEL COORDINADOR(A) PEDAGÓGICO',
          fillHeader: PALETA_MATRIZ.persona2Header,
          fillSubheader: PALETA_MATRIZ.persona2Subheader,
          fillData: PALETA_MATRIZ.persona2Data,
          campos: [
            { key: 'coordPedagNombre', header: 'Nombres y Apellidos', width: 28.0 },
            { key: 'coordPedagDni', header: 'DNI', width: 11.5, isText: true },
            { key: 'coordPedagTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'coordPedagCondicion', header: 'Condición', width: 12.0 },
            { key: 'coordPedagCorreo', header: 'Correo', width: 22.0 }
          ]
        }
      ]
    };
  }

  // D) Ficha de Monitoreo Pedagógico a Docentes (EBR-EBA)
  if (isFichaMonitoreoDocente(ft, state)) {
    const items = (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0)
      ? _extraerItemsDeSecciones(ft.secciones)
      : [];

    return {
      sheetName: 'MONITOREO A DOCENTES',
      tituloDocumento: 'MATRIZ DE SEGUIMIENTO 2026 — CUADERNILLO DE MONITOREO PEDAGÓGICO A DOCENTES (EBR-EBA)',
      tipoFicha: 'DOCENTE',
      esEscala1_4: true,
      limites: {
        max: items.length * 4,
        limInicio: Math.round((items.length * 4) * 0.50),
        limProceso: Math.round((items.length * 4) * 0.75)
      },
      items: items,
      datosGeneralesCampos: [
        { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
        { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
        { key: 'ugel', header: 'UGEL', width: 9.0, isText: true },
        { key: 'red', header: 'RED', width: 8.6, isText: true },
        { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
        { key: 'visita', header: 'Visita', width: 8.0 }
      ],
      bloquesPersonas: [
        {
          titulo: 'II. DATOS DEL DIRECTOR(A)',
          fillHeader: PALETA_MATRIZ.persona1Header,
          fillSubheader: PALETA_MATRIZ.persona1Subheader,
          fillData: PALETA_MATRIZ.persona1Data,
          campos: [
            { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
            { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
            { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
            { key: 'dirCondicion', header: 'Condición', width: 12.1 },
            { key: 'dirCorreo', header: 'Correo', width: 26.7 }
          ]
        },
        {
          titulo: 'III. DATOS DEL DOCENTE OBSERVADO',
          fillHeader: PALETA_MATRIZ.persona2Header,
          fillSubheader: PALETA_MATRIZ.persona2Subheader,
          fillData: PALETA_MATRIZ.persona2Data,
          campos: [
            { key: 'docenteNombre', header: 'Docente Observado (Nombres y Apellidos)', width: 30.0 },
            { key: 'docenteDni', header: 'DNI del Docente', width: 12.0, isText: true },
            { key: 'docenteNivel', header: 'Nivel Educativo', width: 14.0 },
            { key: 'docenteGrado', header: 'Grado', width: 10.0 },
            { key: 'docenteSeccion', header: 'Sección', width: 10.0 },
            { key: 'docenteArea', header: 'Área Curricular Observada', width: 25.0 },
            { key: 'docenteEstMatriculados', header: 'N° Est. Matriculados', width: 12.0 },
            { key: 'docenteEstAsistentes', header: 'N° Est. Asistentes', width: 12.0 },
            { key: 'docenteEstDiscapacidad', header: 'Est. con Discapacidad', width: 12.0 },
            { key: 'docenteHoraInicio', header: 'Hora Inicio', width: 11.0 },
            { key: 'docenteHoraFin', header: 'Hora Término', width: 11.0 },
            { key: 'docenteMonitor', header: 'Observador / Monitor', width: 25.0 }
          ]
        }
      ]
    };
  }

  // Fallback genérico para cualquier otra ficha del sistema
  const sheetNameRaw = (ft && ft.nombre) ? ft.nombre.slice(0, 28) : 'MONITOREO';
  const cleanSheetName = sheetNameRaw.replace(/[:\\/?*\[\]]/g, '').trim().toUpperCase() || 'MONITOREO';
  const items = (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0)
    ? _extraerItemsDeSecciones(ft.secciones)
    : [];

  const maxPts = items.length * 3;
  return {
    sheetName: cleanSheetName,
    tituloDocumento: `MATRIZ DE SEGUIMIENTO 2026 — ${cleanSheetName}`,
    tipoFicha: 'GENERICA',
    limites: {
      max: maxPts,
      limInicio: Math.round(maxPts * 56 / 111),
      limProceso: Math.round(maxPts * 83 / 111)
    },
    items: items,
    datosGeneralesCampos: [
      { key: 'institucion', header: 'Número y/o nombre de la Institución Educativa', width: 32.4 },
      { key: 'codigoModular', header: 'Código Modular', width: 16, isText: true },
      { key: 'ugel', header: 'UGEL', width: 8.0, isText: true },
      { key: 'red', header: 'RED', width: 10.0, isText: true },
      { key: 'fecha', header: 'Fecha', width: 12.4, isDate: true },
      { key: 'visita', header: 'Visita', width: 8.0 }
    ],
    bloquesPersonas: [
      {
        titulo: 'II. DATOS DEL DIRECTOR(A)',
        fillHeader: PALETA_MATRIZ.persona1Header,
        fillSubheader: PALETA_MATRIZ.persona1Subheader,
        fillData: PALETA_MATRIZ.persona1Data,
        campos: [
          { key: 'dirNombre', header: 'Nombres y Apellidos', width: 29.9 },
          { key: 'dirDni', header: 'DNI', width: 11.7, isText: true },
          { key: 'dirTelefono', header: 'Teléfono', width: 12.0, isText: true },
          { key: 'dirCondicion', header: 'Condición', width: 12.1 },
          { key: 'dirCorreo', header: 'Correo', width: 26.7 }
        ]
      }
    ]
  };
}

/**
 * Extrae ítems numerados a partir de las secciones de un fichaType
 */
function _extraerItemsDeSecciones(secciones) {
  const result = [];
  let itemCounter = 1;
  secciones.forEach((sec, secIdx) => {
    const secNombre = sec.nombre || `ASPECTO 0${secIdx + 1}`;
    (sec.items || []).forEach(it => {
      const numStr = itemCounter < 10 ? `0${itemCounter}` : String(itemCounter);
      result.push({
        id: it.id || `item_${itemCounter}`,
        num: numStr,
        aspectoIndex: secIdx,
        aspectoNombre: secNombre,
        tipo: it.tipo || sec.tipoRespuesta || 'escala_1_3',
        texto: it.texto || it.descripcion || ''
      });
      itemCounter++;
    });
  });
  return result;
}

/**
 * Calcula límites de puntaje si la regla_nivel define rangos
 */
function _calcularLimitesDesdeRangos(reglaNivel, totalItems) {
  const max = reglaNivel.maxPuntaje || (totalItems * 3);
  const rangos = reglaNivel.rangos || [];
  const rIni = rangos.find(r => (r.nivel || '').toLowerCase().includes('inicio') || (r.nivel || '').toLowerCase().includes('no cumple'));
  const rProc = rangos.find(r => (r.nivel || '').toLowerCase().includes('proceso') || (r.nivel || '').toLowerCase().includes('parcial'));

  return {
    max: max,
    limInicio: rIni ? rIni.max : Math.round(max * 56 / 111),
    limProceso: rProc ? rProc.max : Math.round(max * 83 / 111)
  };
}
