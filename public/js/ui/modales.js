/* =========================================================================
   ui/modales.js — Diálogos modales: confirmación de salida y configurar descarga
   ========================================================================= */

import {
  esc,
  showToast,
  lockBodyScroll,
  unlockBodyScroll,
  forceResetBodyScroll,
  formatPersonName,
  resolveDirectorName
} from './core-utils.js';
import {
  formatDate,
  getLimaDateStr,
  esDisciplinaColectiva
} from '../pdf-template.js';
import { openDuplicateDetectorModal } from './concursos-tab.js';

export const DEFAULT_AREAS = [
  { id: 'agebre', nombre: 'Área de Gestión de la Educación Básica Regular y Especial', sigla: 'AGEBRE', descripcionEncabezado: 'Área de Gestión de la\nEducación Básica (2026)', logo: '', activa: true, esPredeterminada: true, orden: 1 },
  { id: 'agebatp', nombre: 'Área de Gestión de la Educación Básica Alternativa y Técnico-Productiva', sigla: 'AGEBATP', descripcionEncabezado: 'Área de Gestión de la Educ. Básica\nAlternativa y Técnico-Prod. (2026)', logo: '', activa: true, esPredeterminada: false, orden: 2 },
  { id: 'agp', nombre: 'Área de Gestión Pedagógica', sigla: 'AGP', descripcionEncabezado: 'Área de Gestión Pedagógica\nUGEL 03 (2026)', logo: '', activa: true, esPredeterminada: false, orden: 3 },
  { id: 'agi', nombre: 'Área de Gestión Institucional', sigla: 'AGI', descripcionEncabezado: 'Área de Gestión Institucional\nUGEL 03 (2026)', logo: '', activa: true, esPredeterminada: false, orden: 4 },
  { id: 'dir_ugel', nombre: 'Dirección de la UGEL N.° 03', sigla: 'DIRECCIÓN', descripcionEncabezado: 'Dirección de la Unidad de Gestión\nEducativa Local N.° 03', logo: '', activa: true, esPredeterminada: false, orden: 5 }
];

export const DEFAULT_PLANTILLAS = [
  // Concursos
  { tipoReporte: 'concursos', orden: 1, cargo: 'Coordinador(a) del Concurso — Comisión Organizadora UGEL 03', nombreOpcional: '', entidad: 'Comisión Organizadora UGEL 03', leyenda: 'Firma y Sello' },
  { tipoReporte: 'concursos', orden: 2, cargo: 'Especialista de [ÁREA] / Jurado — UGEL 03 – DRELM', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'concursos', orden: 3, cargo: 'V.° B.° Jefatura [ÁREA] — UGEL 03', nombreOpcional: '', entidad: 'UGEL 03', leyenda: 'Sello Institucional' },
  // Consolidado
  { tipoReporte: 'consolidado', orden: 1, cargo: 'Especialista Responsable de Monitoreo — [ÁREA] – UGEL 03', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'consolidado', orden: 2, cargo: 'Jefatura de [ÁREA] — UGEL 03 – DRELM', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' },
  // Individual
  { tipoReporte: 'individual', orden: 1, cargo: 'Especialista que monitorea — [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'individual', orden: 2, cargo: 'Director(a) / Autoridad de la I.E.', nombreOpcional: '', entidad: 'Institución Educativa', leyenda: 'Firma y Sello' },
  { tipoReporte: 'individual', orden: 3, cargo: 'Jefatura de [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03', leyenda: 'V.° B.°' },
  // Avance
  { tipoReporte: 'avance', orden: 1, cargo: 'Especialista Responsable — [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
  { tipoReporte: 'avance', orden: 2, cargo: 'Jefatura de [ÁREA]', nombreOpcional: '', entidad: 'UGEL 03', leyenda: 'V.° B.°' }
];

/* (lockBodyScroll, unlockBodyScroll, forceResetBodyScroll importados de ./ui/core-utils.js) */

/**
 * Diálogo modal accesible de confirmación antes de cerrar sesión o cambiar de usuario.
 * @param {{ currentUser: Object, isAdmin: boolean, onConfirmLogout: Function, onSwitchUser: Function }} options
 */
export function openLogoutConfirmModal({
  currentUser = null,
  isAdmin = false,
  onConfirmLogout = null,
  onSwitchUser = null
} = {}) {
  const oldModal = document.getElementById('logoutConfirmModal');
  if (oldModal) {
    oldModal.remove();
    unlockBodyScroll();
  }

  const modalWrap = document.createElement('div');
  modalWrap.id = 'logoutConfirmModal';
  modalWrap.className = 'downloadModalOverlay';
  modalWrap.setAttribute('role', 'dialog');
  modalWrap.setAttribute('aria-modal', 'true');
  modalWrap.setAttribute('aria-labelledby', 'm_logout_title');

  const emailStr = (currentUser && currentUser.email) ? currentUser.email : 'Usuario';
  const roleLabel = isAdmin ? 'Administrador' : 'Especialista General';
  const roleBadgeCls = isAdmin ? 'st-logrado' : 'st-none';
  const initial = emailStr.charAt(0).toUpperCase();

  modalWrap.innerHTML = `
    <div class="downloadModalCard" style="max-width:480px;box-shadow:0 24px 38px 3px rgba(11,27,54,0.22),0 9px 46px 8px rgba(11,27,54,0.12)">
      <div class="downloadModalHeader" style="background:#0B1B36;padding:16px 20px;display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px;line-height:1">🚪</span>
          <h3 id="m_logout_title" style="color:#FFFFFF;margin:0;font-size:16px;font-weight:700">¿Cerrar sesión?</h3>
        </div>
        <button type="button" class="downloadModalClose" id="m_logout_close" title="Cerrar ventana" style="color:#CBD5E1;font-size:18px;background:none;border:none;cursor:pointer">✕</button>
      </div>

      <div class="downloadModalBody" style="padding:22px 24px">
        <!-- Tarjeta de usuario activo -->
        <div style="display:flex;align-items:center;gap:12px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:12px 14px;margin-bottom:16px">
          <div style="width:42px;height:42px;border-radius:50%;background:#12294C;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:17px;flex-shrink:0">
            ${initial}
          </div>
          <div style="min-width:0;flex:1">
            <div style="font-weight:600;font-size:13.5px;color:#0F172A;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(emailStr)}">
              ${esc(emailStr)}
            </div>
            <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
              <span class="badge ${roleBadgeCls}" style="font-size:11px;padding:2px 7px">${roleLabel}</span>
              <span style="font-size:11.5px;color:#64748B">Sesión activa</span>
            </div>
          </div>
        </div>

        <p style="font-size:13.5px;color:#334155;line-height:1.55;margin:0 0 12px 0">
          ¿Deseas salir del sistema o cambiar a otra cuenta de usuario?
        </p>

        <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:10px 12px;font-size:12px;color:#92400E;display:flex;gap:8px;align-items:flex-start">
          <span style="font-size:14px;line-height:1">ℹ️</span>
          <span>Asegúrate de haber guardado tus cambios o fichas en edición antes de salir.</span>
        </div>
      </div>

      <div class="downloadModalFooter" style="background:#F1F5F9;padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn secondary" id="m_logout_cancel" style="padding:8px 14px;font-size:13px">
          Cancelar
        </button>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <button type="button" class="btn" id="m_logout_switch" style="background:#2E4A73;color:#FFFFFF;border:none;padding:8px 14px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px">
            <span>👤</span> Cambiar de usuario
          </button>
          <button type="button" class="btn danger" id="m_logout_confirm" style="padding:8px 14px;font-size:13px;font-weight:600;border-radius:6px;cursor:pointer;display:flex;align-items:center;gap:6px">
            <span>🚪</span> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  `;

  lockBodyScroll();
  document.body.appendChild(modalWrap);

  const close = () => {
    modalWrap.remove();
    unlockBodyScroll();
    document.removeEventListener('keydown', onKeyDown);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', onKeyDown);

  modalWrap.addEventListener('click', (e) => {
    if (e.target === modalWrap) close();
  });

  const closeBtn = modalWrap.querySelector('#m_logout_close');
  const cancelBtn = modalWrap.querySelector('#m_logout_cancel');
  const switchBtn = modalWrap.querySelector('#m_logout_switch');
  const confirmBtn = modalWrap.querySelector('#m_logout_confirm');

  if (closeBtn) closeBtn.onclick = close;
  if (cancelBtn) cancelBtn.onclick = close;

  if (switchBtn) {
    switchBtn.onclick = () => {
      close();
      if (onSwitchUser) onSwitchUser();
    };
  }

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      close();
      if (onConfirmLogout) onConfirmLogout();
    };
  }
}

/**
 * Abre el diálogo modal universal "Configurar descarga" con selección de área de firmas,
 * firmantes reordenables, revisión previa de datos (Parte D), opciones y vista previa en vivo.
 */
export function openDownloadConfigModal({
  documentTitle = 'DOCUMENTO OFICIAL',
  tipoReporte = 'concursos', // 'concursos' | 'consolidado' | 'individual' | 'avance' | 'colegios'
  dataRows = [],
  currentUser = null,
  state = {},
  dbNs = null,
  isAdmin = false,
  isJfen = false,
  isJedpa = false,
  tipoConcurso = null,
  filters = {},
  formatoPdfActas = null,
  onConfirm = async (downloadConfig) => { }
}) {
  const isJfenReport = isJfen || (tipoConcurso && (tipoConcurso.id === 'jfen' || (tipoConcurso.nombre || '').toUpperCase().includes('JFEN') || (tipoConcurso.nombre || '').toUpperCase().includes('FLORALES'))) || (tipoReporte === 'concursos' && (documentTitle.toUpperCase().includes('JFEN') || documentTitle.toUpperCase().includes('FLORALES')));
  const isJedpaReport = isJedpa || (tipoReporte === 'concursos' && (documentTitle.toUpperCase().includes('JEDPA') || documentTitle.toUpperCase().includes('DEPORTIVOS')));

  const esConcursoGrupal = (tipoConcurso && (tipoConcurso.tipoParticipacion === 'grupal' || tipoConcurso.modalidad === 'colectiva' || tipoConcurso.modalidad === 'grupal')) ||
    (Array.isArray(dataRows) && dataRows.length > 0 && dataRows.some(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso)));
  const todosGrupales = (tipoConcurso && tipoConcurso.tipoParticipacion === 'grupal') ||
    (Array.isArray(dataRows) && dataRows.length > 0 && dataRows.every(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso)));

  const tieneColectivas = (isJedpaReport || esConcursoGrupal) && Array.isArray(dataRows) && dataRows.some(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso));
  const todasColectivas = (isJedpaReport || esConcursoGrupal) && Array.isArray(dataRows) && dataRows.length > 0 && dataRows.every(r => (Array.isArray(r.participantes) && r.participantes.length > 1) || esDisciplinaColectiva(r.disciplina, r, tipoConcurso));

  const oldModal = document.getElementById('downloadConfigModal');
  if (oldModal) {
    oldModal.remove();
    unlockBodyScroll();
  }

  const areasList = (state.areasFirma && state.areasFirma.length > 0)
    ? state.areasFirma.filter(a => a.activa !== false)
    : DEFAULT_AREAS;

  let savedPref = null;
  try {
    const raw = localStorage.getItem('download_pref_' + tipoReporte);
    if (raw) savedPref = JSON.parse(raw);
  } catch (e) { }

  let currentAreaId = (savedPref && savedPref.areaId) ? savedPref.areaId : 'agebre';
  if (!areasList.some(a => a.id === currentAreaId) && currentAreaId !== 'personalizado' && currentAreaId !== 'sin_firmas') {
    const defArea = areasList.find(a => a.esPredeterminada) || areasList[0];
    currentAreaId = defArea ? defArea.id : 'agebre';
  }

  let sinFirmas = currentAreaId === 'sin_firmas' || (savedPref && savedPref.sinFirmas === true);
  let mostrarEncabezadoArea = savedPref ? (savedPref.mostrarEncabezadoArea !== false) : true;
  let incluirQr = savedPref ? (savedPref.incluirQr !== false) : true;
  let orientationChoice = savedPref ? (savedPref.orientation || 'auto') : 'auto';

  // Formato por defecto: 'fichas' para JFEN; 'fichas_equipo' para JEDPA colectivo o concursos grupales / fichas; 'completo' (tabular) para individual u otros
  let defaultFormato = 'completo';
  if (isJfenReport) {
    defaultFormato = 'fichas';
  } else if (formatoPdfActas === 'fichas_por_categoria' || todosGrupales || todasColectivas || esConcursoGrupal || (filters && filters.disciplina && esDisciplinaColectiva(filters.disciplina, null, tipoConcurso))) {
    defaultFormato = 'fichas_equipo';
  }
  let formatoConcurso = savedPref ? (savedPref.formatoConcurso || defaultFormato) : defaultFormato;
  if (!isJfenReport && formatoConcurso === 'fichas') {
    formatoConcurso = 'fichas_equipo';
  }
  if (!isJedpaReport && !esConcursoGrupal && !tieneColectivas && formatoPdfActas !== 'fichas_por_categoria' && formatoConcurso === 'fichas_equipo') {
    formatoConcurso = 'completo';
  }
  let jfenOrden = (savedPref && savedPref.ordenParticipantes) ? savedPref.ordenParticipantes : 'alfabetico';
  let jfenRepetirBarra = savedPref ? (savedPref.repetirBarraCategoria !== false) : true;
  let jfenPuestoRes = savedPref ? (savedPref.mostrarPuesto !== false) : true;
  let jfenModalidad = savedPref ? (savedPref.mostrarModalidad !== false) : true;
  let jfenResumen = savedPref ? (savedPref.incluirResumen !== false) : true;
  let jfenCuadro = savedPref ? (savedPref.incluirCuadroResumen !== false) : true;
  let jfenIntro = savedPref ? (savedPref.incluirIntro === true) : false;

  let indivIntro = savedPref ? (savedPref.incluirIntro !== false) : true;
  let indivResumen = savedPref ? (savedPref.incluirResumen !== false) : true;
  let indivCasillas = savedPref ? (savedPref.dibujarCasillas !== false) : true;
  let indivLineas = savedPref ? (savedPref.imprimirLineas !== false) : true;

  let consResumen = savedPref ? (savedPref.incluirResumenEjecutivo !== false) : true;
  let consMatriz = savedPref ? (savedPref.incluirMatriz !== false) : true;
  let consCriticos = savedPref ? (savedPref.incluirCriticos !== false) : true;
  let consItems = savedPref ? (savedPref.incluirReporteItem === true) : false;
  let consOrden = (savedPref && savedPref.ordenDetalle) ? savedPref.ordenDetalle : 'menor_cumplimiento';

  let recordarEleccion = true;

  let lugar = (savedPref && savedPref.lugar) ? savedPref.lugar : 'Lima';
  let fecha = (savedPref && savedPref.fecha) ? savedPref.fecha : formatDate(getLimaDateStr());

  let customAreaNombre = (savedPref && savedPref.customAreaNombre) || '';
  let customAreaSigla = (savedPref && savedPref.customAreaSigla) || '';
  let customAreaDesc = (savedPref && savedPref.customAreaDesc) || '';
  let guardarEnCatalogo = false;

  function getSignersForArea(areaId) {
    if (savedPref && savedPref.areaId === areaId && Array.isArray(savedPref.firmantes) && savedPref.firmantes.length > 0) {
      return JSON.parse(JSON.stringify(savedPref.firmantes));
    }

    const areaObj = areasList.find(a => a.id === areaId);
    const sigla = areaObj ? areaObj.sigla : (customAreaSigla || 'AGEBRE');

    const plantillasDb = (state.plantillasFirmantes || []).filter(p => p.areaId === areaId && p.tipoReporte === tipoReporte);
    if (plantillasDb.length > 0) {
      return plantillasDb.sort((a, b) => (a.orden || 99) - (b.orden || 99)).map(p => ({
        cargo: p.cargo.replace(/\[ÁREA\]/g, sigla),
        nombre: p.nombreOpcional || '',
        entidad: p.entidad ? p.entidad.replace(/\[ÁREA\]/g, sigla) : 'UGEL 03 – DRELM',
        leyenda: p.leyenda || 'Firma y Sello'
      }));
    }

    if (tipoReporte === 'individual') {
      const sub0 = (dataRows && dataRows[0]) ? dataRows[0] : null;
      const dirResolved = sub0 ? resolveDirectorName(sub0) : '';
      const dirName = (dirResolved && dirResolved !== '—') ? dirResolved : '';
      const monName = sub0 ? (sub0.responsable && sub0.responsable !== '—' ? sub0.responsable : '') : '';
      const ieName = sub0 ? (sub0.institucion || 'Institución Educativa') : 'Institución Educativa';
      return [
        { cargo: 'Director(a) de la I.E.', nombre: dirName, entidad: ieName, leyenda: 'Firma y Sello' },
        { cargo: `Monitor(a) — ${sigla}`, nombre: monName, entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
        { cargo: `V.° B.° Jefatura de ${sigla}`, nombre: '', entidad: 'UGEL 03', leyenda: 'V.° B.°' }
      ];
    }

    if (tipoReporte === 'consolidado') {
      return [
        { cargo: `Especialista Responsable de Monitoreo — ${sigla}`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
        { cargo: `Jefatura de ${sigla} — UGEL 03 – DRELM`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
      ];
    }

    const defaults = DEFAULT_PLANTILLAS.filter(p => p.tipoReporte === tipoReporte);
    if (defaults.length > 0) {
      return defaults.map(p => ({
        cargo: p.cargo.replace(/\[ÁREA\]/g, sigla),
        nombre: p.nombreOpcional || '',
        entidad: p.entidad.replace(/\[ÁREA\]/g, sigla),
        leyenda: p.leyenda
      }));
    }

    return [
      { cargo: `Especialista Responsable — ${sigla}`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'Firma y Sello' },
      { cargo: `Jefatura de ${sigla}`, nombre: '', entidad: 'UGEL 03 – DRELM', leyenda: 'V.° B.° y Sello' }
    ];
  }

  let firmantesList = getSignersForArea(currentAreaId);

  // PARTE D: Análisis de datos y revisión de completitud
  const anomalies = {
    sinPuesto: 0,
    sinAsesor: 0,
    sinParticipante: 0,
    sinResolucion: 0,
    posiblesDuplicados: 0,
    dniInvalido: 0,
    sinUgelRed: 0,
    sinTurnoVisitado: 0,
    sinMonitorDni: 0,
    sinCompromisos: 0,
    sinEvidencias: 0,
    sinRespuestas: 0
  };

  if (tipoReporte === 'concursos' && Array.isArray(dataRows)) {
    const seenDup = new Set();
    dataRows.forEach(r => {
      if (!r.puesto || r.puesto === '—' || r.puesto === '') anomalies.sinPuesto++;
      const hasAsesor = r.asesores && r.asesores.length > 0 && r.asesores.some(a => (a.nombres || a.apellidos || '').trim());
      if (!hasAsesor) anomalies.sinAsesor++;
      const hasPart = r.participantes && r.participantes.length > 0 && r.participantes.some(p => (p.nombres || p.apellidos || '').trim());
      if (!hasPart) anomalies.sinParticipante++;
      if (!r.resolucionRef || r.resolucionRef === '—' || r.resolucionRef === '') anomalies.sinResolucion++;

      [...(r.participantes || []), ...(r.asesores || [])].forEach(p => {
        if (p.dni && (p.dni.length !== 8 || !/^\d+$/.test(p.dni))) anomalies.dniInvalido++;
      });

      const pDnis = (r.participantes || []).map(p => (p.dni || '').trim()).filter(Boolean).sort().join(',');
      const dupKey = [(r.tipoConcursoNombre || r.tipoConcursoId || '').toLowerCase(), (r.etapa || '').toLowerCase(), (r.categoria || '').toLowerCase(), (r.disciplina || '').toLowerCase(), (r.institucion || '').toLowerCase(), pDnis].join('|');
      if (seenDup.has(dupKey)) {
        anomalies.posiblesDuplicados++;
      } else {
        seenDup.add(dupKey);
      }
    });
  } else if (tipoReporte === 'individual' && Array.isArray(dataRows)) {
    dataRows.forEach(s => {
      const subExtras = s.extras || [];
      const getExtraVal = (pattern) => {
        const found = subExtras.find(x => x && x.label && x.label.toLowerCase().includes(pattern.toLowerCase()));
        return found ? found.value : '';
      };
      const turnoVisitado = s.turnoVisitado || getExtraVal('turno visitado');
      if (!turnoVisitado || turnoVisitado === '—' || turnoVisitado.trim() === '') anomalies.sinTurnoVisitado++;
      const monitorDni = s.monitorDni || getExtraVal('dni del monitor');
      if (!monitorDni || monitorDni === '—' || monitorDni.trim() === '') anomalies.sinMonitorDni++;
      if (!s.compromisoDirector && !s.compromisoMonitor && (!s.compromisos || (Array.isArray(s.compromisos) ? s.compromisos.length === 0 : true))) anomalies.sinCompromisos++;
      const resps = s.respuestas || [];
      if (resps.length === 0) anomalies.sinRespuestas++;
      const hasEvid = resps.some(r => r.evidencia && r.evidencia !== '—' && r.evidencia.trim() !== '');
      if (!hasEvid && resps.length > 0) anomalies.sinEvidencias++;
    });
  } else if (tipoReporte === 'consolidado' && Array.isArray(dataRows)) {
    dataRows.forEach(x => {
      const s = x.s || x;
      if (!s.ugel || s.ugel === '—' || !s.red || s.red === '—') anomalies.sinUgelRed++;
      const resps = s.respuestas || [];
      if (resps.length === 0) anomalies.sinRespuestas++;
    });
  }

  const totalAnomalies = Object.values(anomalies).reduce((a, b) => a + b, 0);

  const overlay = document.createElement('div');
  overlay.id = 'downloadConfigModal';
  overlay.className = 'downloadModalOverlay';

  function renderModalContent() {
    const isCustom = currentAreaId === 'personalizado';
    const isSinFirmas = currentAreaId === 'sin_firmas' || sinFirmas;

    overlay.innerHTML = `
      <div class="downloadModalCard" role="dialog" aria-modal="true" aria-labelledby="dl_title">
        <div class="downloadModalHeader">
          <div>
            <h3 id="dl_title">Configurar descarga</h3>
            <div class="sub">${esc(documentTitle)}</div>
          </div>
          <button type="button" class="downloadModalClose" id="dl_close_btn" aria-label="Cerrar">✕</button>
        </div>

        <div class="downloadModalBody">
          ${totalAnomalies > 0 ? `
            <div class="downloadReviewAlert">
              <h5>⚠️ Revisión previa de datos: Se detectaron campos pendientes o no registrados:</h5>
              <ul>
                ${anomalies.sinPuesto > 0 ? `<li><strong>${anomalies.sinPuesto}</strong> registro(s) sin puesto asignado (se mostrará como "—")</li>` : ''}
                ${anomalies.sinAsesor > 0 ? `<li><strong>${anomalies.sinAsesor}</strong> registro(s) sin docente asesor (se mostrará "Sin docente asesor registrado")</li>` : ''}
                ${anomalies.sinParticipante > 0 ? `<li><strong>${anomalies.sinParticipante}</strong> registro(s) sin participantes (se mostrará "Sin participante registrado")</li>` : ''}
                ${anomalies.sinResolucion > 0 ? `<li><strong>${anomalies.sinResolucion}</strong> registro(s) sin resolución de referencia</li>` : ''}
                ${anomalies.posiblesDuplicados > 0 ? `<li><strong>${anomalies.posiblesDuplicados}</strong> posible(s) registro(s) duplicado(s) detectado(s)</li>` : ''}
                ${anomalies.dniInvalido > 0 ? `<li><strong>${anomalies.dniInvalido}</strong> DNI(s) con formato no estándar (diferente de 8 dígitos numéricos)</li>` : ''}
                ${anomalies.sinUgelRed > 0 ? `<li><strong>${anomalies.sinUgelRed}</strong> ficha(s) sin UGEL o RED asignada</li>` : ''}
                ${anomalies.sinTurnoVisitado > 0 ? `<li><strong>${anomalies.sinTurnoVisitado}</strong> ficha(s) sin "Turno visitado" registrado (se mostrarán casillas en blanco)</li>` : ''}
                ${anomalies.sinMonitorDni > 0 ? `<li><strong>${anomalies.sinMonitorDni}</strong> ficha(s) sin DNI del monitor(a) (se mostrará como "No registrado")</li>` : ''}
                ${anomalies.sinCompromisos > 0 ? `<li><strong>${anomalies.sinCompromisos}</strong> ficha(s) sin compromisos registrados (se imprimirán líneas para llenado manual)</li>` : ''}
                ${anomalies.sinEvidencias > 0 ? `<li><strong>${anomalies.sinEvidencias}</strong> ficha(s) sin evidencias redactadas (las celdas quedarán en blanco)</li>` : ''}
                ${anomalies.sinRespuestas > 0 ? `<li><strong>${anomalies.sinRespuestas}</strong> ficha(s) sin respuestas registradas</li>` : ''}
              </ul>
              <div class="downloadReviewActions">
                <button type="button" class="btn secondary small" id="dl_btn_fix">🔍 Ver y corregir</button>
                <button type="button" class="btn small" id="dl_btn_anyway" style="background:#B45309;color:#FFF">⬇ Descargar de todos modos (con marca de datos por completar)</button>
              </div>
            </div>
          ` : ''}

          <div class="downloadModalSection">
            <label class="secLabel" for="dl_area_select">Área que firma *</label>
            <select id="dl_area_select" style="padding:8px 10px;font-size:13.5px;font-weight:600;border:1.5px solid var(--primary);border-radius:7px">
              ${areasList.map(a => `
                <option value="${esc(a.id)}" ${a.id === currentAreaId ? 'selected' : ''}>
                  ${esc(a.sigla)} — ${esc(a.nombre)} ${a.esPredeterminada ? '(Predeterminada)' : ''}
                </option>
              `).join('')}
              <option value="personalizado" ${currentAreaId === 'personalizado' ? 'selected' : ''}>✍️ Personalizado…</option>
              <option value="sin_firmas" ${currentAreaId === 'sin_firmas' ? 'selected' : ''}>🚫 Sin bloque de firmas</option>
            </select>
          </div>

          ${isCustom ? `
            <div style="background:#F1F5F9;border:1px solid #CBD5E1;border-radius:8px;padding:12px;display:flex;flex-direction:column;gap:8px">
              <div style="display:grid;grid-template-columns:2fr 1fr;gap:8px">
                <div>
                  <label class="secLabel">Nombre completo del área *</label>
                  <input type="text" id="dl_custom_nombre" placeholder="Ej: Comisión Especial de Monitoreo" value="${esc(customAreaNombre)}" style="width:100%;padding:6px 8px">
                </div>
                <div>
                  <label class="secLabel">Sigla *</label>
                  <input type="text" id="dl_custom_sigla" placeholder="Ej: CEM" value="${esc(customAreaSigla)}" style="width:100%;padding:6px 8px">
                </div>
              </div>
              <div>
                <label class="secLabel">Descripción para el encabezado</label>
                <input type="text" id="dl_custom_desc" placeholder="Ej: Comisión Especial de Monitoreo (2026)" value="${esc(customAreaDesc)}" style="width:100%;padding:6px 8px">
              </div>
              ${isAdmin ? `
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                  <input type="checkbox" id="dl_custom_save" ${guardarEnCatalogo ? 'checked' : ''}>
                  Guardar como nueva plantilla en el catálogo global de áreas
                </label>
              ` : ''}
            </div>
          ` : ''}

          ${!isSinFirmas ? `
            <div class="downloadModalSection">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <label class="secLabel">Firmantes (${firmantesList.length}/6)</label>
                ${firmantesList.length < 6 ? `
                  <button type="button" class="btn secondary small" id="dl_add_firmante_btn" style="padding:2px 8px;font-size:11px">＋ Agregar firmante</button>
                ` : ''}
              </div>

              <div class="downloadFirmantesList" id="dl_firmantes_container">
                ${firmantesList.map((sig, idx) => `
                  <div class="downloadFirmanteItem" data-idx="${idx}">
                    <div class="reorderBtns">
                      <button type="button" class="btnUp" data-up="${idx}" ${idx === 0 ? 'disabled' : ''} title="Subir">▲</button>
                      <button type="button" class="btnDown" data-down="${idx}" ${idx === firmantesList.length - 1 ? 'disabled' : ''} title="Bajar">▼</button>
                    </div>
                    <div class="fieldsWrap">
                      <div>
                        <input type="text" class="fCargo" data-idx="${idx}" placeholder="Cargo *" value="${esc(sig.cargo)}" required title="Cargo (obligatorio)">
                      </div>
                      <div>
                        <input type="text" class="fNombre" data-idx="${idx}" placeholder="Nombre (opcional)" value="${esc(sig.nombre || '')}" title="Nombre">
                      </div>
                      <div>
                        <input type="text" class="fEntidad" data-idx="${idx}" placeholder="Entidad / Área" value="${esc(sig.entidad || '')}" title="Entidad / Área">
                      </div>
                      <div>
                        <select class="fLeyenda" data-idx="${idx}" title="Leyenda">
                          <option value="Firma y Sello" ${sig.leyenda === 'Firma y Sello' ? 'selected' : ''}>Firma y Sello</option>
                          <option value="V.° B.° y Sello" ${sig.leyenda === 'V.° B.° y Sello' ? 'selected' : ''}>V.° B.° y Sello</option>
                          <option value="Sello Institucional" ${sig.leyenda === 'Sello Institucional' ? 'selected' : ''}>Sello Institucional</option>
                          <option value="V.° B.°" ${sig.leyenda === 'V.° B.°' ? 'selected' : ''}>V.° B.°</option>
                          <option value="" ${!sig.leyenda ? 'selected' : ''}>Ninguna</option>
                        </select>
                      </div>
                    </div>
                    <button type="button" class="delFirmanteBtn" data-del="${idx}" title="Eliminar firmante">✕</button>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${!isSinFirmas ? `
            <div class="downloadModalSection">
              <label class="secLabel">Lugar y Fecha</label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                <input type="text" id="dl_lugar" placeholder="Ciudad (Ej: Lima)" value="${esc(lugar)}" style="padding:6px 8px">
                <input type="text" id="dl_fecha" placeholder="Fecha (Ej: 19/09/2026)" value="${esc(fecha)}" style="padding:6px 8px">
              </div>
            </div>
          ` : ''}

          <div class="downloadModalSection">
            <label class="secLabel">Opciones</label>
            <div class="downloadModalOptionsList" style="display:flex;flex-direction:column;gap:8px">
              <label class="dlCheckLabel" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_encabezado" style="margin-top:2px;flex-shrink:0" ${mostrarEncabezadoArea ? 'checked' : ''}>
                <span>Mostrar logo y nombre del área en el encabezado (4.° recuadro)</span>
              </label>
              <label class="dlCheckLabel" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_qr" style="margin-top:2px;flex-shrink:0" ${incluirQr ? 'checked' : ''}>
                <span>Incluir código y QR oficial de verificación</span>
              </label>
              <label class="dlCheckLabel" style="display:flex;align-items:flex-start;gap:8px;cursor:pointer">
                <input type="checkbox" id="dl_opt_sin_firmas" style="margin-top:2px;flex-shrink:0" ${isSinFirmas ? 'checked' : ''}>
                <span>Sin bloque de firmas</span>
              </label>

              <div class="downloadOrientationRow" style="display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin-top:4px">
                <span style="font-size:12px;font-weight:600;color:var(--ink-soft)">Orientación:</span>
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                  <input type="radio" name="dl_orientation" value="auto" ${orientationChoice === 'auto' ? 'checked' : ''}> Automática
                </label>
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                  <input type="radio" name="dl_orientation" value="portrait" ${orientationChoice === 'portrait' ? 'checked' : ''}> Vertical
                </label>
                <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                  <input type="radio" name="dl_orientation" value="landscape" ${orientationChoice === 'landscape' ? 'checked' : ''}> Horizontal
                </label>
              </div>

              ${tipoReporte === 'concursos' ? `
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px;margin-top:6px">
                  <div style="font-size:12px;font-weight:600;color:var(--ink-soft);margin-bottom:4px">Formato del documento:</div>
                  <div style="display:flex;gap:16px;flex-wrap:wrap">
                    ${isJfenReport ? `
                      <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                        <input type="radio" name="dl_formato_concurso" value="fichas" ${formatoConcurso === 'fichas' ? 'checked' : ''}>
                        <strong>Fichas por categoría (oficial JFEN)</strong>
                      </label>
                    ` : ''}
                    ${(isJedpaReport || esConcursoGrupal || !isJfenReport) ? `
                      <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                        <input type="radio" name="dl_formato_concurso" value="fichas_equipo" ${formatoConcurso === 'fichas_equipo' ? 'checked' : ''}>
                        <strong>Fichas por equipo / grupo ${todosGrupales ? '(oficial grupal)' : isJedpaReport ? '(colectivo JEDPA)' : '(formato ficha)'}</strong>
                      </label>
                    ` : ''}
                    <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                      <input type="radio" name="dl_formato_concurso" value="completo" ${formatoConcurso === 'completo' ? 'checked' : ''}>
                      Listado tabular ${isJfenReport ? '(alternativo)' : isJedpaReport ? '(individuales / continuo)' : '(estándar oficial)'}
                    </label>
                    <label style="display:flex;align-items:center;gap:4px;font-size:12.5px;cursor:pointer">
                      <input type="radio" name="dl_formato_concurso" value="orden_merito" ${formatoConcurso === 'orden_merito' ? 'checked' : ''}>
                      Consolidado de orden de mérito (solo 1.° a 3.° puesto)
                    </label>
                  </div>

                  ${isJfenReport && formatoConcurso === 'fichas' ? `
                    <div style="margin-top:10px;padding:10px;background:#FBF9FD;border:1px solid #E9E1F0;border-radius:6px;display:flex;flex-direction:column;gap:6px">
                      <div style="font-size:12px;font-weight:700;color:#7030A0;margin-bottom:2px">Opciones de formato JFEN:</div>
                      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                        <span style="font-size:12px;color:var(--ink-soft);font-weight:600">Orden participantes:</span>
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                          <input type="radio" name="dl_jfen_orden" value="alfabetico" ${jfenOrden === 'alfabetico' ? 'checked' : ''}> Alfabético por apellidos
                        </label>
                        <label style="display:flex;align-items:center;gap:4px;font-size:12px;cursor:pointer">
                          <input type="radio" name="dl_jfen_orden" value="registro" ${jfenOrden === 'registro' ? 'checked' : ''}> Orden de registro
                        </label>
                      </div>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_repetir_barra" ${jfenRepetirBarra ? 'checked' : ''}> Repetir barra de categoría en cada ficha
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_puesto_res" ${jfenPuestoRes ? 'checked' : ''}> Mostrar filas Puesto y Resolución
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_modalidad" ${jfenModalidad ? 'checked' : ''}> Mostrar fila Modalidad (Individual / Grupal)
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_resumen" ${jfenResumen ? 'checked' : ''}> Incluir línea de resumen
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_cuadro" ${jfenCuadro ? 'checked' : ''}> Incluir cuadro "Inscripciones por categoría y Arte/Disciplina"
                      </label>
                      <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                        <input type="checkbox" id="dl_jfen_intro" ${jfenIntro ? 'checked' : ''}> Incluir párrafo introductorio ("En el marco de las bases…")
                      </label>
                    </div>
                  ` : ''}
                </div>
              ` : ''}

              ${tipoReporte === 'individual' ? `
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px;margin-top:6px;display:flex;flex-direction:column;gap:6px">
                  <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:2px">Opciones de Ficha Individual:</div>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_intro" ${indivIntro ? 'checked' : ''}> Incluir párrafo introductorio ("En el marco del monitoreo...")
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_resumen" ${indivResumen ? 'checked' : ''}> Incluir resumen de resultados (cumplimiento por dimensión y global)
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_casillas" ${indivCasillas ? 'checked' : ''}> Dibujar casillas para Condición, Nivel y Turno
                  </label>
                  <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_indiv_lineas" ${indivLineas ? 'checked' : ''}> Imprimir líneas para llenado a mano si Compromisos/Observaciones están vacíos
                  </label>
                </div>
              ` : ''}

              ${tipoReporte === 'consolidado' ? `
                <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:8px 10px;margin-top:6px;display:flex;flex-direction:column;gap:6px">
                  <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:2px">Contenido a exportar:</div>
                  <label style="display:flex;align-items:center;gap:8px;font-size:12px;color:var(--ink-soft);cursor:default">
                    <input type="checkbox" checked disabled>
                    <span><strong>Reporte consolidado</strong> (siempre incluido: Tarjetas KPI, dona, avance por sección y matriz)</span>
                  </label>
                  <label style="display:flex;align-items:center;gap:8px;font-size:12px;cursor:pointer">
                    <input type="checkbox" id="dl_cons_items" ${consItems ? 'checked' : ''}>
                    <span>Incluir reporte por ítem (consolidado de indicadores)</span>
                  </label>
                </div>
              ` : ''}

              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-top:4px">
                <input type="checkbox" id="dl_opt_recordar" ${recordarEleccion ? 'checked' : ''}>
                Recordar mi elección para este tipo de reporte
              </label>
            </div>
          </div>

          ${!isSinFirmas && firmantesList.length > 0 ? `
            <div class="downloadModalSection">
              <label class="secLabel">Vista previa de firmas</label>
              <div class="downloadSigPreview">
                <div class="previewDate">${esc(lugar)}, ${esc(fecha)}</div>
                <div class="downloadSigPreviewGrid" style="grid-template-columns:repeat(${Math.min(firmantesList.length, 3)}, 1fr)">
                  ${firmantesList.map(sig => `
                    <div class="downloadSigPreviewBox">
                      ${sig.nombre ? `<div class="pNom">${esc(formatPersonName(sig.nombre))}</div>` : ''}
                      <div class="pCargo">${esc(sig.cargo || 'Cargo')}</div>
                      ${sig.entidad ? `<div class="pEnt">${esc(sig.entidad)}</div>` : ''}
                      ${sig.leyenda ? `<div class="pLey">${esc(sig.leyenda)}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="downloadModalFooter">
          <button type="button" class="btn secondary" id="dl_cancel_btn">Cancelar</button>
          <button type="button" class="btn" id="dl_confirm_btn" style="display:flex;align-items:center;gap:6px">
            <span>⬇</span> Descargar
          </button>
        </div>
      </div>
    `;

    attachModalEvents();
  }

  function attachModalEvents() {
    let onKey = null;
    const close = () => {
      if (onKey) window.removeEventListener('keydown', onKey);
      overlay.remove();
      unlockBodyScroll();
    };
    document.getElementById('dl_close_btn').onclick = close;
    document.getElementById('dl_cancel_btn').onclick = close;

    document.getElementById('dl_area_select').onchange = (e) => {
      currentAreaId = e.target.value;
      if (currentAreaId === 'sin_firmas') {
        sinFirmas = true;
      } else {
        sinFirmas = false;
        firmantesList = getSignersForArea(currentAreaId);
      }
      renderModalContent();
    };

    const customNom = document.getElementById('dl_custom_nombre');
    if (customNom) customNom.oninput = (e) => { customAreaNombre = e.target.value; };
    const customSig = document.getElementById('dl_custom_sigla');
    if (customSig) {
      customSig.oninput = (e) => {
        customAreaSigla = e.target.value;
        firmantesList = getSignersForArea('personalizado');
      };
    }
    const customDesc = document.getElementById('dl_custom_desc');
    if (customDesc) customDesc.oninput = (e) => { customAreaDesc = e.target.value; };
    const customSave = document.getElementById('dl_custom_save');
    if (customSave) customSave.onchange = (e) => { guardarEnCatalogo = e.target.checked; };

    const sinFirmasCb = document.getElementById('dl_opt_sin_firmas');
    if (sinFirmasCb) {
      sinFirmasCb.onchange = (e) => {
        sinFirmas = e.target.checked;
        if (sinFirmas) currentAreaId = 'sin_firmas';
        else if (currentAreaId === 'sin_firmas') currentAreaId = 'agebre';
        renderModalContent();
      };
    }

    const lugarInp = document.getElementById('dl_lugar');
    if (lugarInp) {
      lugarInp.oninput = (e) => {
        lugar = e.target.value;
        const pDate = overlay.querySelector('.previewDate');
        if (pDate) pDate.textContent = `${lugar}, ${fecha}`;
      };
    }
    const fechaInp = document.getElementById('dl_fecha');
    if (fechaInp) {
      fechaInp.oninput = (e) => {
        fecha = e.target.value;
        const pDate = overlay.querySelector('.previewDate');
        if (pDate) pDate.textContent = `${lugar}, ${fecha}`;
      };
    }

    overlay.querySelectorAll('.fCargo').forEach(inp => {
      inp.oninput = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].cargo = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });
    overlay.querySelectorAll('.fNombre').forEach(inp => {
      inp.oninput = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].nombre = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });
    overlay.querySelectorAll('.fEntidad').forEach(inp => {
      inp.oninput = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].entidad = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });
    overlay.querySelectorAll('.fLeyenda').forEach(sel => {
      sel.onchange = (e) => {
        firmantesList[parseInt(e.target.dataset.idx, 10)].leyenda = e.target.value;
        updatePreviewBox(parseInt(e.target.dataset.idx, 10));
      };
    });

    function updatePreviewBox(idx) {
      const boxes = overlay.querySelectorAll('.downloadSigPreviewBox');
      if (boxes[idx] && firmantesList[idx]) {
        const sig = firmantesList[idx];
        boxes[idx].innerHTML = `
          ${sig.nombre ? `<div class="pNom">${esc(formatPersonName(sig.nombre))}</div>` : ''}
          <div class="pCargo">${esc(sig.cargo || 'Cargo')}</div>
          ${sig.entidad ? `<div class="pEnt">${esc(sig.entidad)}</div>` : ''}
          ${sig.leyenda ? `<div class="pLey">${esc(sig.leyenda)}</div>` : ''}
        `;
      }
    }

    overlay.querySelectorAll('.btnUp').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.up, 10);
        if (idx > 0) {
          const temp = firmantesList[idx - 1];
          firmantesList[idx - 1] = firmantesList[idx];
          firmantesList[idx] = temp;
          renderModalContent();
        }
      };
    });
    overlay.querySelectorAll('.btnDown').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.down, 10);
        if (idx < firmantesList.length - 1) {
          const temp = firmantesList[idx + 1];
          firmantesList[idx + 1] = firmantesList[idx];
          firmantesList[idx] = temp;
          renderModalContent();
        }
      };
    });
    overlay.querySelectorAll('.delFirmanteBtn').forEach(b => {
      b.onclick = () => {
        const idx = parseInt(b.dataset.del, 10);
        firmantesList.splice(idx, 1);
        renderModalContent();
      };
    });

    const addBtn = document.getElementById('dl_add_firmante_btn');
    if (addBtn) {
      addBtn.onclick = () => {
        if (firmantesList.length < 6) {
          firmantesList.push({
            cargo: 'Especialista',
            nombre: '',
            entidad: 'UGEL 03 – DRELM',
            leyenda: 'Firma y Sello'
          });
          renderModalContent();
        }
      };
    }

    const encCb = document.getElementById('dl_opt_encabezado');
    if (encCb) encCb.onchange = (e) => { mostrarEncabezadoArea = e.target.checked; };
    const qrCb = document.getElementById('dl_opt_qr');
    if (qrCb) qrCb.onchange = (e) => { incluirQr = e.target.checked; };
    const recCb = document.getElementById('dl_opt_recordar');
    if (recCb) recCb.onchange = (e) => { recordarEleccion = e.target.checked; };

    overlay.querySelectorAll('input[name="dl_orientation"]').forEach(r => {
      r.onchange = (e) => { orientationChoice = e.target.value; };
    });
    overlay.querySelectorAll('input[name="dl_formato_concurso"]').forEach(r => {
      r.onchange = (e) => {
        formatoConcurso = e.target.value;
        renderModalContent();
      };
    });
    overlay.querySelectorAll('input[name="dl_jfen_orden"]').forEach(r => {
      r.onchange = (e) => { jfenOrden = e.target.value; };
    });
    const repBarCb = document.getElementById('dl_jfen_repetir_barra');
    if (repBarCb) repBarCb.onchange = (e) => { jfenRepetirBarra = e.target.checked; };
    const pResCb = document.getElementById('dl_jfen_puesto_res');
    if (pResCb) pResCb.onchange = (e) => { jfenPuestoRes = e.target.checked; };
    const modCb = document.getElementById('dl_jfen_modalidad');
    if (modCb) modCb.onchange = (e) => { jfenModalidad = e.target.checked; };
    const resCb = document.getElementById('dl_jfen_resumen');
    if (resCb) resCb.onchange = (e) => { jfenResumen = e.target.checked; };
    const cuadCb = document.getElementById('dl_jfen_cuadro');
    if (cuadCb) cuadCb.onchange = (e) => { jfenCuadro = e.target.checked; };
    const introCb = document.getElementById('dl_jfen_intro');
    if (introCb) introCb.onchange = (e) => { jfenIntro = e.target.checked; };

    const indivIntroCb = document.getElementById('dl_indiv_intro');
    if (indivIntroCb) indivIntroCb.onchange = (e) => { indivIntro = e.target.checked; };
    const indivResCb = document.getElementById('dl_indiv_resumen');
    if (indivResCb) indivResCb.onchange = (e) => { indivResumen = e.target.checked; };
    const indivCasCb = document.getElementById('dl_indiv_casillas');
    if (indivCasCb) indivCasCb.onchange = (e) => { indivCasillas = e.target.checked; };
    const indivLinCb = document.getElementById('dl_indiv_lineas');
    if (indivLinCb) indivLinCb.onchange = (e) => { indivLineas = e.target.checked; };

    const consResCb = document.getElementById('dl_cons_resumen');
    if (consResCb) consResCb.onchange = (e) => { consResumen = e.target.checked; };
    const consMatCb = document.getElementById('dl_cons_matriz');
    if (consMatCb) consMatCb.onchange = (e) => { consMatriz = e.target.checked; };
    const consCritCb = document.getElementById('dl_cons_criticos');
    if (consCritCb) consCritCb.onchange = (e) => { consCriticos = e.target.checked; };
    const consItCb = document.getElementById('dl_cons_items');
    if (consItCb) consItCb.onchange = (e) => { consItems = e.target.checked; };
    const consOrdSel = document.getElementById('dl_cons_orden');
    if (consOrdSel) consOrdSel.onchange = (e) => { consOrden = e.target.value; };

    const fixBtn = document.getElementById('dl_btn_fix');
    if (fixBtn) {
      fixBtn.onclick = () => {
        close();
        if (anomalies.posiblesDuplicados > 0 && typeof openDuplicateDetectorModal === 'function') {
          openDuplicateDetectorModal(dbNs, state, document.getElementById('main'), isAdmin, currentUser, null);
        } else {
          showToast('Revisa los registros señalados en la tabla para completar los datos faltantes.');
        }
      };
    }

    const anywayBtn = document.getElementById('dl_btn_anyway');
    if (anywayBtn) {
      anywayBtn.onclick = () => { triggerGenerate(true); };
    }

    const confirmBtn = document.getElementById('dl_confirm_btn');
    confirmBtn.onclick = () => { triggerGenerate(false); };

    async function triggerGenerate(forceWithIncomplete = false) {
      if (!sinFirmas) {
        const invalidSig = firmantesList.find(s => !(s.cargo || '').trim());
        if (invalidSig) {
          showToast('Cada firmante debe tener un cargo especificado.');
          return;
        }
      }

      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span>⏳</span> Generando PDF...';

      let areaFinal = null;
      if (currentAreaId === 'personalizado') {
        areaFinal = {
          id: 'custom_' + Date.now(),
          nombre: customAreaNombre || 'Área Personalizada',
          sigla: customAreaSigla || 'ÁREA',
          descripcionEncabezado: customAreaDesc || customAreaNombre
        };
        if (isAdmin && guardarEnCatalogo && dbNs) {
          try {
            await dbNs.collection('areasFirma').doc(areaFinal.id).set({
              ...areaFinal,
              activa: true,
              esPredeterminada: false,
              createdAt: Date.now()
            });
          } catch (e) {
            console.warn('No se pudo guardar área en catálogo:', e);
          }
        }
      } else if (currentAreaId !== 'sin_firmas') {
        areaFinal = areasList.find(a => a.id === currentAreaId) || null;
      }

      if (recordarEleccion) {
        try {
          const prefData = {
            areaId: currentAreaId,
            sinFirmas,
            mostrarEncabezadoArea,
            incluirQr,
            orientation: orientationChoice,
            formatoConcurso: (!isJfenReport && !isJedpaReport && !esConcursoGrupal && (formatoConcurso === 'fichas' || formatoConcurso === 'fichas_equipo')) ? 'completo' : formatoConcurso,
            lugar,
            fecha,
            firmantes: firmantesList,
            customAreaNombre,
            customAreaSigla,
            customAreaDesc,
            indivIntro,
            indivResumen,
            indivCasillas,
            indivLineas,
            consResumen,
            consMatriz,
            consCriticos,
            consItems,
            consOrden
          };
          localStorage.setItem('download_pref_' + tipoReporte, JSON.stringify(prefData));
          if (currentUser && dbNs) {
            dbNs.collection('preferenciasDescarga').doc(`${currentUser.uid}_${tipoReporte}`).set({
              usuarioId: currentUser.uid,
              tipoReporte,
              prefData,
              updatedAt: Date.now()
            }, { merge: true }).catch(() => { });
          }
        } catch (e) { }
      }

      const downloadConfig = {
        areaConfig: mostrarEncabezadoArea ? areaFinal : null,
        signatures: sinFirmas ? [] : firmantesList,
        lugarFecha: sinFirmas ? '' : `${lugar}, ${fecha}`,
        sinFirmas,
        incluirQr,
        orientation: orientationChoice === 'auto' ? null : orientationChoice,
        formatoConcurso,
        ordenParticipantes: jfenOrden,
        repetirBarraCategoria: jfenRepetirBarra,
        mostrarPuesto: jfenPuestoRes,
        mostrarResolucion: jfenPuestoRes,
        mostrarModalidad: jfenModalidad,
        incluirResumen: jfenResumen,
        incluirCuadroResumen: jfenCuadro,
        incluirIntro: tipoReporte === 'individual' ? indivIntro : jfenIntro,
        incluirResumen: tipoReporte === 'individual' ? indivResumen : jfenResumen,
        dibujarCasillas: indivCasillas,
        imprimirLineas: indivLineas,
        incluirResumenEjecutivo: consResumen,
        incluirMatriz: consMatriz,
        incluirCriticos: consCriticos,
        incluirReporteItem: consItems,
        incluir_items: consItems,
        ordenDetalle: consOrden,
        datosIncompletos: forceWithIncomplete || (totalAnomalies > 0),
        marcaBorrador: forceWithIncomplete && (anomalies.sinPuesto > 0 || anomalies.sinAsesor > 0)
      };

      try {
        await onConfirm(downloadConfig);
        showToast('✓ Documento PDF generado exitosamente.');
        close();
      } catch (err) {
        console.error('Error generando PDF con configuración:', err);
        showToast('Error al generar PDF: ' + (err.message || 'Error desconocido'));
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<span>⬇</span> Descargar';
      }
    }

    onKey = (e) => {
      if (e.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('keydown', onKey);
  }

  lockBodyScroll();
  document.body.appendChild(overlay);
  renderModalContent();

  setTimeout(() => {
    const sel = document.getElementById('dl_area_select');
    if (sel) sel.focus();
  }, 50);
}

