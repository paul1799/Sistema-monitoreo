/**
 * features/registrar/save.js
 * Validación, persistencia, idempotencia y auditoría de envíos de ficha
 * UGEL 03 · AGEBRE · Fase 4 Reorganización
 */

import {
  esc,
  showToast,
  genId,
  normalizeText,
  normalizeReiNumber,
  cleanForFirestore
} from '../../core/utils/index.js';
import {
  getAppState,
  clearEditMode
} from '../../core/state/app-state.js';
import {
  getResponsableForColegio
} from '../../ui/scoring.js';
import {
  calcScore,
  isFichaCoordTutoriaJec,
  isFichaCoordPedagogico,
  isFichaEspecialistaJec,
  REGLA_NIVEL_COORD_TUTORIA_JEC,
  REGLA_NIVEL_COORD_PEDAGOGICO,
  ESPECIALISTA_JEC_OFICIAL
} from '../../calcEngine.js?v=20261103_v8';
import { syncDirectivosFromFicha } from '../../directorio.js?v=20261013_v1';
import { isFichaCebeGestion, guardarFormularioCebe } from '../../cebe-gestion.js';
import { isFichaPriteGestion, guardarFormularioPrite } from '../../prite-gestion.js';
import { isFichaEbrGestionEscolar, collectEbrGestionFormData, resetEbrFormState } from '../../ebr-gestion.js';
import { isFichaJec, collectJecFormData, resetJecFormState } from '../../jec-monitoreo.js';
import { collectJec1erFormData, resetJec1erFormState } from '../../jec-1er-monitoreo.js';
import { getSubmissionVisitaNum } from '../../domain/fichas/index.js';
import { normalizeExtras } from '../plantillas/index.js';
import {
  editingSubmissionId,
  editingSubmissionData,
  regSelectedColegioId,
  regCompromisos,
  setRegCompromisos,
  resetRegBuiltFor,
  resetRegistrationSessionState,
  currentJecVisita,
  setCurrentJecVisita
} from './state.js';


export async function onSubmitRegistro(e, ft, state, dbNs, currentUser, navigate) {
  e.preventDefault();
  const activeState = state || getAppState() || (typeof window !== 'undefined' ? window.state : null) || {};
  const form = document.getElementById('regForm');
  const btn = (e.target && e.target.querySelector('button[type=submit]')) || document.getElementById('saveFormBtn');
  const isEdit = !!editingSubmissionId;

  // Limpiar clases y mensajes de error previos
  document.querySelectorAll('.fieldError').forEach(el => el.classList.remove('fieldError'));
  document.querySelectorAll('.fieldErrorText').forEach(el => el.remove());
  const prevBanner = document.getElementById('regFormErrorBanner');
  if (prevBanner) prevBanner.remove();

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = isEdit ? '⏳ Actualizando ficha...' : '⏳ Guardando ficha...';
  }

  try {
    if (!dbNs) {
      throw new Error('No hay conexión activa con la base de datos Firestore. Verifica tu estado de conexión a internet.');
    }
    if (!ft) {
      throw new Error('No se encontró la configuración del tipo de ficha seleccionado.');
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - CEBE"
    if (isFichaCebeGestion(ft)) {
      const targetForm = (form && form.id === 'regForm') ? form : (document.getElementById('regForm') || document.getElementById('regFormHost')?.querySelector('#regForm'));
      await guardarFormularioCebe(targetForm, ft, activeState, dbNs, currentUser, navigate, isEdit);
      clearEditMode();
      resetRegistrationSessionState();
      return;
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar - PRITE"
    if (isFichaPriteGestion(ft)) {
      const targetForm = (form && form.id === 'regForm') ? form : (document.getElementById('regForm') || document.getElementById('regFormHost')?.querySelector('#regForm'));
      await guardarFormularioPrite(targetForm, ft, activeState, dbNs, currentUser, navigate, isEdit);
      clearEditMode();
      resetRegistrationSessionState();
      return;
    }

    // Interceptar guardado de Ficha "Monitoreo y Asistencia Técnica a la Gestión Escolar – UGEL 03 EBR"
    if (isFichaEbrGestionEscolar(ft)) {
      const ebrData = collectEbrGestionFormData(form || document.getElementById('regFormHost'), ft, isEdit);
      let submissionToken = isEdit ? editingSubmissionId : ((form && form.dataset.submissionId) || genId());
      if (form) form.dataset.submissionId = submissionToken;

      const fallbackResp = (currentUser && (currentUser.nombre || currentUser.displayName || currentUser.email)) || '';
      let finalResp = (ebrData.responsable && ebrData.responsable.trim()) || '';
      if (!finalResp && (ebrData.colegioId || regSelectedColegioId)) {
        const cId = ebrData.colegioId || regSelectedColegioId;
        const col = (activeState.colegios || []).find(c => c.id === cId);
        if (col) {
          const rCol = getResponsableForColegio(col, ft, activeState);
          if (rCol && rCol !== 'Por asignar' && !rCol.includes('compartida') && rCol !== '—') {
            finalResp = rCol;
          }
        }
      }
      if (!finalResp && ebrData.red && activeState.responsables && activeState.responsables.length) {
        const cReiNum = normalizeReiNumber(ebrData.red);
        const cReiNorm = normalizeText(ebrData.red);
        const redMatches = activeState.responsables.filter(r => {
          if (!r.red) return false;
          if (cReiNum) {
            const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
            if (rNums.includes(cReiNum)) return true;
          }
          const rRedNorm = normalizeText(r.red);
          return rRedNorm.includes(cReiNorm) || cReiNorm.includes(rRedNorm);
        });
        if (redMatches.length === 1) {
          finalResp = (redMatches[0].nombresApellidos || redMatches[0].especialista || '').trim();
        }
      }
      if (!finalResp) {
        finalResp = fallbackResp;
      }

      const docData = {
        ...ebrData,
        colegioId: ebrData.colegioId || regSelectedColegioId || null,
        responsable: finalResp,
        createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
        createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now()
      };

      const cleanedDocData = cleanForFirestore(docData);

      if (isEdit) {
        await Promise.race([
          dbNs.collection('submissions').doc(editingSubmissionId).set(cleanedDocData, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha EBR actualizada correctamente.');
      } else {
        await Promise.race([
          dbNs.collection('submissions').doc(submissionToken).set(cleanedDocData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast('✓ Ficha EBR registrada correctamente.');
      }

      // Sincronizar directorio de directivos
      try {
        const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
        if (syncRes && syncRes.summary) {
          showToast(`Ficha guardada. Directorio actualizado.`);
        }
      } catch (syncErr) {
        console.warn('Error sincronizando directorio desde ficha EBR:', syncErr);
      }

      const targetId = isEdit ? editingSubmissionId : submissionToken;
      if (activeState.submissions) {
        const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
        if (existingIdx >= 0) {
          activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
        } else {
          activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
        }
      }

      if (form) form.dataset.submissionId = '';
      clearEditMode();
      resetEbrFormState();
      resetRegistrationSessionState();

      if (navigate) {
        navigate('consolidado');
      }
      return;
    }

    // Interceptar guardado de Ficha Unificada de Implementación del Modelo JEC (1er, 2do y 3er momento)
    if (isFichaJec(ft) && !isFichaCoordTutoriaJec(ft) && !isFichaCoordPedagogico(ft)) {
      const activeVis = currentJecVisita || (editingSubmissionData ? getSubmissionVisitaNum(editingSubmissionData, ft) : 2);
      let jecData;
      if (activeVis === 1) {
        jecData = collectJec1erFormData(form || document.getElementById('regFormHost'), ft, isEdit);
      } else {
        jecData = collectJecFormData(form || document.getElementById('regFormHost'), ft, isEdit, activeVis);
      }

      jecData.visita = Number(activeVis);
      jecData.momento = Number(activeVis);
      jecData.fichaTypeId = 'ft_msejec_2do';
      jecData.fichaTypeNombre = 'Monitoreo a la Implementación del Modelo JEC';

      let submissionToken = isEdit ? editingSubmissionId : ((form && form.dataset.submissionId) || genId());
      if (form) form.dataset.submissionId = submissionToken;

      const docData = {
        ...jecData,
        createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
        createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
        updatedAt: Date.now(),
        updatedBy: currentUser?.uid || currentUser?.email || ''
      };

      const cleanedDocData = cleanForFirestore(docData);

      if (isEdit) {
        await Promise.race([
          dbNs.collection('submissions').doc(editingSubmissionId).set(cleanedDocData, { merge: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast(`✓ Ficha JEC (${activeVis === 1 ? '1er Monitoreo' : (activeVis === 2 ? '2do Monitoreo' : '3er Monitoreo')}) actualizada correctamente.`);
      } else {
        await Promise.race([
          dbNs.collection('submissions').doc(submissionToken).set(cleanedDocData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado al guardar en Firestore.')), 25000))
        ]);
        showToast(`✓ Ficha JEC (${activeVis === 1 ? '1er Monitoreo' : (activeVis === 2 ? '2do Monitoreo' : '3er Monitoreo')}) registrada correctamente.`);
      }

      // Sincronizar directorio de directivos
      try {
        const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
        if (syncRes && syncRes.summary) {
          showToast('Ficha guardada. Directorio de directivos actualizado.');
        }
      } catch (errSync) {
        console.warn('Error al sincronizar directorio desde Ficha JEC:', errSync);
      }

      const targetId = isEdit ? editingSubmissionId : submissionToken;
      if (activeState.submissions) {
        const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
        if (existingIdx >= 0) {
          activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
        } else {
          activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
        }
      }

      // Limpiar estados
      if (form) form.dataset.submissionId = '';
      clearEditMode();
      resetJec1erFormState();
      resetJecFormState();
      setCurrentJecVisita(1);
      resetRegistrationSessionState();

      if (navigate) {
        navigate('consolidado');
      }
      return;
    }

    const isDirectivo = (ft.tipoRespuesta === 'nivel_1_4') || (ft.id === 'ft_directivo') || (ft.nombre || '').toLowerCase().includes('directivo');

    let firstErrorEl = null;
    const markError = (inputEl, message) => {
      if (!inputEl) return;
      inputEl.classList.add('fieldError');
      const errSpan = document.createElement('span');
      errSpan.className = 'fieldErrorText';
      errSpan.textContent = message;
      if (inputEl.parentElement) {
        inputEl.parentElement.appendChild(errSpan);
      }
      if (!firstErrorEl) firstErrorEl = inputEl;
    };

    // Validar campos obligatorios generales
    const instEl = document.getElementById('f_institucion');
    const fechaEl = document.getElementById('f_fecha');
    const visitaEl = document.getElementById('f_visita');

    const instVal = instEl ? instEl.value.trim() : '';
    if (!instVal) {
      markError(instEl, 'La institución educativa es obligatoria.');
    }

    const fechaVal = fechaEl ? fechaEl.value : '';
    if (!fechaVal) {
      markError(fechaEl, 'La fecha de la visita es obligatoria.');
    }

    const visitaVal = visitaEl ? Number(visitaEl.value) : 1;
    if (!visitaVal || visitaVal < 1) {
      markError(visitaEl, 'Ingresa un número de visita válido (mínimo 1).');
    }

    // Validar horas si se indicaron
    const horaInicioEl = document.getElementById('f_hora_inicio');
    const horaTerminoEl = document.getElementById('f_hora_termino');
    const horaInicioVal = horaInicioEl ? horaInicioEl.value.trim() : '';
    const horaTerminoVal = horaTerminoEl ? horaTerminoEl.value.trim() : '';

    if (horaInicioVal && horaTerminoVal && horaTerminoVal <= horaInicioVal) {
      markError(horaTerminoEl, 'La hora de término debe ser posterior a la hora de inicio.');
    }

    // Validar campos extra configurados como obligatorios
    const normExtras = normalizeExtras(ft.extras);
    const extrasCollected = [];

    for (let i = 0; i < normExtras.length; i++) {
      const ex = normExtras[i];
      let val = '';
      if (ex.tipo === 'si_no') {
        const chk = document.querySelector('input[name="extra_' + ex.id + '"]:checked');
        val = chk ? chk.value : '';
      } else {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        if (inp) {
          if (inp.tagName === 'SELECT' && inp.value === 'Otro') {
            const otroInp = document.getElementById(inp.id + '_otro');
            val = otroInp && otroInp.value.trim() ? otroInp.value.trim() : 'Otro';
          } else {
            val = inp.value.trim();
          }
        }
      }

      if (ex.required && !val) {
        const inp = document.querySelector('[data-extra-id="' + ex.id + '"]') || document.querySelector('[data-extra-idx="' + i + '"]');
        markError(inp, 'El campo "' + ex.label + '" es obligatorio.');
      }
      extrasCollected.push({ id: ex.id, label: ex.label, value: val, tipo: ex.tipo });
    }

    if (firstErrorEl) {
      firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstErrorEl.focus();
      showToast('Por favor completa o corrige los campos obligatorios.');
      return;
    }

    // Recolectar respuestas y verificar completitud de indicadores
    const respuestas = [];
    let answeredCount = 0;
    let totalItems = 0;
    let firstUnansweredEl = null;

    (ft.secciones || []).forEach((sec, sIdx) => {
      sec.items.forEach((it, iIdx) => {
        totalItems++;
        const itemDomKey = `s${sIdx + 1}_i${iIdx + 1}_${it.id || iIdx}`;
        const chk = document.querySelector('input[name="item_' + itemDomKey + '"]:checked') || document.querySelector('input[name="item_' + it.id + '"]:checked');
        const evidInp = document.getElementById('evid_' + itemDomKey) || document.getElementById('evid_' + it.id) || document.querySelector('textarea[name="evidencia_' + itemDomKey + '"]');
        const evidencia = evidInp ? evidInp.value.trim() : '';

        if (chk) {
          answeredCount++;
          respuestas.push({
            id: it.id,
            domKey: itemDomKey,
            globalIdx: totalItems - 1,
            seccionIdx: sIdx,
            itemIdx: iIdx,
            num: it.num || totalItems,
            texto: it.texto,
            seccion: sec.nombre,
            valor: chk.value,
            evidencia: evidencia
          });
        } else {
          if (!firstUnansweredEl) {
            firstUnansweredEl = document.querySelector('input[name="item_' + itemDomKey + '"]') || evidInp;
          }
          if (evidencia) {
            respuestas.push({
              id: it.id,
              domKey: itemDomKey,
              globalIdx: totalItems - 1,
              seccionIdx: sIdx,
              itemIdx: iIdx,
              num: it.num || totalItems,
              texto: it.texto,
              seccion: sec.nombre,
              valor: null,
              evidencia: evidencia
            });
          }
        }
      });
    });

    // Control de ficha incompleta / borrador
    let esBorrador = false;
    if (answeredCount < totalItems) {
      const confirmDraft = confirm(
        'Atención: Hay ' + (totalItems - answeredCount) + ' de ' + totalItems + ' indicadores sin calificar.\n\n' +
        '¿Deseas guardar la ficha como BORRADOR (incompleta)?\n' +
        'Se calculará el avance únicamente sobre los indicadores respondidos y podrás completarla luego.'
      );
      if (!confirmDraft) {
        if (firstUnansweredEl) {
          const itemRow = firstUnansweredEl.closest('.itemRow');
          if (itemRow) itemRow.classList.add('fieldError');
          firstUnansweredEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          firstUnansweredEl.focus();
        }
        showToast('Completa los indicadores pendientes para registrar la ficha completa.');
        return;
      }
      esBorrador = true;
    }

    // Extracción de datos para compatibilidad de tablas y reportes
    let ugelVal = '', redVal = '', codigoVal = '', responsableVal = '', directorVal = '';
    let directorDniVal = '', directorCondicionVal = '', directorCorreoVal = '', condicionVal = '', nivelAtencionVal = '', turnoAtencionVal = '', turnoVisitadoVal = '', monitorDniVal = '';
    let coordTutoriaVal = '', coordTutoriaDniVal = '', coordTutoriaCondicionVal = '', coordTutoriaEspVal = '', coordTutoriaCorreoVal = '', docentesTutoresVal = '', horasVisitaVal = '';
    let docenteObsVal = '', docenteDniVal = '', docenteNivelVal = '', docenteGradoVal = '', docenteSeccionVal = '', docenteAreaVal = '';
    let docenteEstMatriculadosVal = '', docenteEstAsistentesVal = '', docenteEstDiscapacidadVal = '', docenteMonitorVal = '';

    extrasCollected.forEach(ex => {
      const l = (ex.label || '').toLowerCase();
      const xid = (ex.id || '').toLowerCase();
      if (l.includes('ugel') && !ugelVal) ugelVal = ex.value;
      if ((l.includes('red') || l.includes('rei')) && !redVal) redVal = ex.value;
      if ((l.includes('código') || l.includes('codigo')) && !codigoVal) codigoVal = ex.value;
      if ((xid === 'ex_dir_nombre' || (l.includes('director') && (l.includes('nombre') || !l.includes('dni')) && !l.includes('cond') && !l.includes('corr'))) && !directorVal) directorVal = ex.value;
      if ((xid === 'ex_dir_dni' || (l.includes('director') && l.includes('dni'))) && !directorDniVal) directorDniVal = ex.value;
      if ((xid === 'ex_dir_condicion' || (l.includes('director') && l.includes('condici'))) && !directorCondicionVal) directorCondicionVal = ex.value;
      if ((xid === 'ex_dir_correo' || (l.includes('director') && (l.includes('correo') || l.includes('email')))) && !directorCorreoVal) directorCorreoVal = ex.value;
      if ((xid === 'ex_coord' || (l.includes('coordinador') && l.includes('tutor') && !l.includes('dni') && !l.includes('esp') && !l.includes('cond') && !l.includes('corr'))) && !coordTutoriaVal) coordTutoriaVal = ex.value;
      if ((xid === 'ex_coord_dni' || (l.includes('coordinador') && l.includes('dni'))) && !coordTutoriaDniVal) coordTutoriaDniVal = ex.value;
      if ((xid === 'ex_coord_condicion' || (l.includes('coordinador') && l.includes('condici'))) && !coordTutoriaCondicionVal) coordTutoriaCondicionVal = ex.value;
      if ((xid === 'ex_coord_esp' || l.includes('especialidad')) && !coordTutoriaEspVal) coordTutoriaEspVal = ex.value;
      if ((xid === 'ex_coord_correo' || (l.includes('coordinador') && (l.includes('correo') || l.includes('email')))) && !coordTutoriaCorreoVal) coordTutoriaCorreoVal = ex.value;
      if ((xid === 'ex_cant_tut' || l.includes('tutores')) && !docentesTutoresVal) docentesTutoresVal = ex.value;
      if ((xid === 'ex_horas_visita' || l.includes('horas')) && !horasVisitaVal) horasVisitaVal = ex.value;
      if (l.includes('condici') && !condicionVal) condicionVal = ex.value;
      if (l.includes('nivel') && !nivelAtencionVal) nivelAtencionVal = ex.value;
      if (l.includes('turno') && l.includes('atenci') && !turnoAtencionVal) turnoAtencionVal = ex.value;
      if (l.includes('turno') && l.includes('visit') && !turnoVisitadoVal) turnoVisitadoVal = ex.value;
      if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && !l.includes('dni') && !responsableVal) responsableVal = ex.value;
      if ((l.includes('responsable') || l.includes('especialista') || l.includes('monitor')) && l.includes('dni') && !monitorDniVal) monitorDniVal = ex.value;

      // Campos específicos de Docente Monitoreado
      if ((xid === 'ex_docente' || (l.includes('docente') && (l.includes('observ') || l.includes('nombre') || !l.includes('dni')))) && !docenteObsVal) docenteObsVal = ex.value;
      if ((xid === 'ex_dni' || (l.includes('docente') && l.includes('dni')) || l === 'dni del docente') && !docenteDniVal) docenteDniVal = ex.value;
      if ((xid === 'ex_nivel' || l.includes('nivel educativo')) && !docenteNivelVal) docenteNivelVal = ex.value;
      if ((xid === 'ex_grado' || l === 'grado') && !docenteGradoVal) docenteGradoVal = ex.value;
      if ((xid === 'ex_seccion' || l === 'sección' || l === 'seccion') && !docenteSeccionVal) docenteSeccionVal = ex.value;
      if ((xid === 'ex_area' || l.includes('área curricular') || l.includes('area curricular')) && !docenteAreaVal) docenteAreaVal = ex.value;
      if ((xid === 'ex_est_matriculados' || l.includes('matriculados')) && !docenteEstMatriculadosVal) docenteEstMatriculadosVal = ex.value;
      if ((xid === 'ex_est_asistentes' || l.includes('asistentes')) && !docenteEstAsistentesVal) docenteEstAsistentesVal = ex.value;
      if ((xid === 'ex_est_discapacidad' || l.includes('discapacidad')) && !docenteEstDiscapacidadVal) docenteEstDiscapacidadVal = ex.value;
      if ((xid === 'ex_monitor' || l.includes('observador/monitor') || l.includes('observador')) && !docenteMonitorVal) docenteMonitorVal = ex.value;
    });

    const redEl = document.getElementById('f_red');
    if (redEl && redEl.value.trim() && (!redVal || redVal === 'No aplica')) {
      redVal = redEl.value.trim();
    }

    // Vincular con padrón
    let matchedCol = null;
    if (regSelectedColegioId) {
      matchedCol = (activeState.colegios || []).find(c => c.id === regSelectedColegioId);
    }
    if (!matchedCol && instVal) {
      const instNorm = normalizeText(instVal);
      matchedCol = (activeState.colegios || []).find(c => normalizeText(c.ie) === instNorm);
    }

    if (matchedCol) {
      if (!ugelVal || ugelVal.toLowerCase().includes('sector educ')) { ugelVal = matchedCol.dependencia || 'UGEL 03'; if (ugelVal.toLowerCase().includes('sector educ')) ugelVal = 'UGEL 03'; }
      if (!redVal) redVal = normalizeReiNumber(matchedCol.rei) || matchedCol.rei || '';
      if (!codigoVal) codigoVal = matchedCol.codigoLocal || matchedCol.codigoModular || '';
      if (!directorVal && matchedCol.director && matchedCol.director.nombre) directorVal = matchedCol.director.nombre;
      if (!directorDniVal && matchedCol.director && matchedCol.director.dni) directorDniVal = matchedCol.director.dni;
      if (!condicionVal && matchedCol.tipoGestion) condicionVal = matchedCol.tipoGestion;
      if (!nivelAtencionVal && matchedCol.nivelServicio) nivelAtencionVal = matchedCol.nivelServicio;
      if (!turnoAtencionVal && matchedCol.turnos) turnoAtencionVal = matchedCol.turnos;
    }
    if (!ugelVal || ugelVal.toLowerCase().includes('sector educ')) ugelVal = 'UGEL 03';
    if (redVal && redVal !== 'No aplica') {
      redVal = normalizeReiNumber(redVal) || redVal;
    } else if (!redVal) {
      redVal = 'No aplica';
    }

    // Recolectar Síntesis por dimensión si es directivo
    const sintesisCollected = [];
    if (isDirectivo) {
      const sintesisDimensions = [
        'A. DIMENSIÓN ESTRATÉGICA',
        'B. DIMENSIÓN PEDAGÓGICA: ESTRATEGIAS PRIORIZADAS',
        'C. PLANIFICACIÓN CURRICULAR',
        'D. MONITOREO DE LA PRÁCTICA PEDAGÓGICA EN AULA',
        'E. FORTALECIMIENTO DE LAS COMPETENCIAS DOCENTES',
        'F. SEGUIMIENTO AL PROGRESO DE LOS APRENDIZAJES'
      ];
      sintesisDimensions.forEach((dim, dIdx) => {
        const logrosEl = document.querySelector(`textarea[name="sintesis_${dIdx}_logros"]`);
        const difEl = document.querySelector(`textarea[name="sintesis_${dIdx}_dificultades"]`);
        const recEl = document.querySelector(`textarea[name="sintesis_${dIdx}_recomendaciones"]`);
        sintesisCollected.push({
          dimension: dim,
          logros: logrosEl ? logrosEl.value.trim() : '',
          dificultades: difEl ? difEl.value.trim() : '',
          recomendaciones: recEl ? recEl.value.trim() : ''
        });
      });
    }

    // Recolectar compromisos del directivo y monitor
    const compDirectorEl = document.getElementById('f_comp_director');
    const compMonitorEl = document.getElementById('f_comp_monitor');
    const compDirectorVal = compDirectorEl ? compDirectorEl.value.trim() : '';
    const compMonitorVal = compMonitorEl ? compMonitorEl.value.trim() : '';

    const allCompromisos = [...regCompromisos.filter(c => c.texto && c.texto.trim())];
    if (compDirectorVal) {
      allCompromisos.unshift({ texto: compDirectorVal, responsable: 'Director(a) de la IE', plazo: 'Año escolar 2026' });
    }
    if (compMonitorVal) {
      allCompromisos.push({
        texto: compMonitorVal,
        responsable: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : 'Monitor / Especialista',
        plazo: 'Seguimiento continuo'
      });
    }

    // Token de idempotencia en cliente para prevenir duplicados en caso de reintento o doble clic
    let submissionToken = (form && form.dataset.submissionId) || genId();
    if (form) form.dataset.submissionId = submissionToken;

    if (isFichaEspecialistaJec(ft)) {
      // Las 3 fichas JEC son atendidas exclusivamente por la Especialista de JEC oficial
      responsableVal = ESPECIALISTA_JEC_OFICIAL.nombresApellidos;
    } else {
      const fallbackResp = (currentUser && (currentUser.nombre || currentUser.displayName || currentUser.email)) || '';
      if (!responsableVal || !responsableVal.trim() || /^\d+$/.test(responsableVal.trim())) {
        const cId = form.dataset.selectedColegioId || regSelectedColegioId;
        if (cId) {
          const col = (activeState.colegios || []).find(c => c.id === cId);
          if (col) {
            const rCol = getResponsableForColegio(col, ft, activeState);
            if (rCol && rCol !== 'Por asignar' && !rCol.includes('compartida') && rCol !== '—') {
              responsableVal = rCol;
            }
          }
        }
      }
      if (!responsableVal || !responsableVal.trim() || /^\d+$/.test(responsableVal.trim())) {
        if (redVal && redVal !== 'No aplica' && activeState.responsables && activeState.responsables.length) {
          const redNum = normalizeReiNumber(redVal);
          const redNorm = normalizeText(redVal);
          const redMatches = activeState.responsables.filter(r => {
            if (!r.red) return false;
            if (redNum) {
              const rNums = (String(r.red).match(/\d+/g) || []).map(n => normalizeReiNumber(n));
              if (rNums.includes(redNum)) return true;
            }
            const rRedNorm = normalizeText(r.red);
            return rRedNorm.includes(redNorm) || redNorm.includes(rRedNorm);
          });
          if (redMatches.length === 1 && (redMatches[0].nombresApellidos || redMatches[0].especialista)) {
            responsableVal = (redMatches[0].nombresApellidos || redMatches[0].especialista).trim();
          }
        }
      }
      if (!responsableVal || !responsableVal.trim() || /^\d+$/.test(responsableVal.trim())) {
        responsableVal = fallbackResp;
      }
    }

    let tutoriaExtraData = {};
    if (isFichaCoordTutoriaJec(ft)) {
      const stats = calcScore(respuestas, { ...ft, regla_nivel: ft.regla_nivel || REGLA_NIVEL_COORD_TUTORIA_JEC });
      tutoriaExtraData = {
        puntaje: stats.puntaje,
        puntaje_maximo: 63,
        nivel_cumplimiento: stats.estado.nivel,
        descripcion_cumplimiento: stats.estado.descripcion || '',
        estado_panel: stats.estado.estado_panel || 'Inicio'
      };
    } else if (isFichaCoordPedagogico(ft)) {
      const stats = calcScore(respuestas, { ...ft, regla_nivel: REGLA_NIVEL_COORD_PEDAGOGICO });
      tutoriaExtraData = {
        puntaje: stats.puntaje,
        puntaje_maximo: 51,
        nivel_cumplimiento: stats.estado.nivel,
        descripcion_cumplimiento: stats.estado.descripcion || '',
        estado_panel: stats.estado.estado_panel || 'Inicio'
      };
    }

    // Recolectar datos de tablas cuantitativas especializadas si existen
    const tablasRespuestas = {};
    if (Array.isArray(ft.tablas)) {
      ft.tablas.forEach((tbl, ti) => {
        const tblId = tbl.id || ti;
        tablasRespuestas[tblId] = {};
        const rows = (tbl.filas && tbl.filas.length > 0) ? tbl.filas : [{ etiqueta: 'Fila 1' }, { etiqueta: 'Fila 2' }];
        rows.forEach((r, ri) => {
          const fId = r.id || ('f_' + ri);
          tablasRespuestas[tblId][fId] = {};
          (tbl.columnas || []).forEach((col, ci) => {
            const cId = col.id || ('c_' + ci);
            const inp = form.querySelector(`[name="tbl_${tblId}_${fId}_${cId}"]`);
            if (inp) {
              if (inp.type === 'checkbox') {
                tablasRespuestas[tblId][fId][cId] = inp.checked ? (inp.value || '1') : '';
              } else if (inp.type === 'radio') {
                tablasRespuestas[tblId][fId][cId] = inp.checked ? inp.value : '';
              } else {
                tablasRespuestas[tblId][fId][cId] = inp.value.trim();
              }
            }
          });
        });
      });
    }

    const docData = {
      fichaTypeId: ft.id || '',
      fichaTypeNombre: ft.nombre || '',
      tipoRespuesta: ft.tipoRespuesta || '',
      institucion: instVal || '',
      colegioId: (matchedCol && matchedCol.id) || regSelectedColegioId || (isEdit && editingSubmissionData && editingSubmissionData.colegioId) || null,
      fecha: fechaVal || '',
      visita: Number(visitaVal) || 1,
      ugel: ugelVal || 'UGEL 03',
      red: redVal || 'No aplica',
      codigoModular: codigoVal || '',
      responsable: responsableVal || '',
      responsableCargo: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.cargo : '',
      monitorJec: isFichaEspecialistaJec(ft) ? ESPECIALISTA_JEC_OFICIAL.nombresApellidos : '',
      director: directorVal || '',
      directorDni: directorDniVal || '',
      directorCondicion: directorCondicionVal || condicionVal || '',
      dirCondicion: directorCondicionVal || condicionVal || '',
      directorCorreo: directorCorreoVal || '',
      dirCorreo: directorCorreoVal || '',
      coordinadorTutoria: coordTutoriaVal || '',
      coordTutoria: coordTutoriaVal || '',
      coordTutoriaNombre: coordTutoriaVal || '',
      coordTutoriaDni: coordTutoriaDniVal || '',
      coordTutoriaCondicion: coordTutoriaCondicionVal || '',
      coordTutoriaEspecialidad: coordTutoriaEspVal || '',
      coordTutoriaCorreo: coordTutoriaCorreoVal || '',
      docentesTutores: docentesTutoresVal || '',
      docente: docenteObsVal || '',
      docenteNombre: docenteObsVal || '',
      docenteDni: docenteDniVal || '',
      docenteNivel: docenteNivelVal || '',
      docenteGrado: docenteGradoVal || '',
      docenteSeccion: docenteSeccionVal || '',
      docenteArea: docenteAreaVal || '',
      docenteEstMatriculados: docenteEstMatriculadosVal || '',
      docenteEstAsistentes: docenteEstAsistentesVal || '',
      docenteEstDiscapacidad: docenteEstDiscapacidadVal || '',
      docenteMonitor: docenteMonitorVal || responsableVal || '',
      docenteHoraInicio: horaInicioVal || '',
      docenteHoraFin: horaTerminoVal || '',
      horasVisita: horasVisitaVal || '',
      condicion: condicionVal || directorCondicionVal || '',
      nivelAtencion: nivelAtencionVal || '',
      turnoAtencion: turnoAtencionVal || '',
      turnoVisitado: turnoVisitadoVal || '',
      monitorDni: monitorDniVal || '',
      horaInicio: horaInicioVal || '',
      horaTermino: horaTerminoVal || '',
      extras: extrasCollected || [],
      respuestas: respuestas || [],
      sintesis: sintesisCollected || [],
      compromisoDirector: compDirectorVal || '',
      compromisoMonitor: compMonitorVal || '',
      observaciones: document.getElementById('f_observaciones') ? document.getElementById('f_observaciones').value.trim() : ((tablasRespuestas && (tablasRespuestas.tbl_observaciones_docente?.f_obs_planif?.c_detalle_obs || tablasRespuestas.tbl_tbl_observaciones_docente_f_obs_planif?.c_detalle_obs)) || ''),
      tablasRespuestas: tablasRespuestas || {},
      compromisos: allCompromisos || [],
      esBorrador: esBorrador || false,
      ...tutoriaExtraData,
      createdBy: isEdit ? (editingSubmissionData?.createdBy || currentUser.uid) : currentUser.uid,
      createdAt: isEdit ? (editingSubmissionData?.createdAt || Date.now()) : Date.now(),
      updatedAt: Date.now()
    };

    const targetId = isEdit ? editingSubmissionId : submissionToken;
    const cleanedDocData = cleanForFirestore(docData);
    const batch = dbNs.batch();
    batch.set(dbNs.collection('submissions').doc(targetId), cleanedDocData, { merge: true });

    allCompromisos.forEach((comp, idx) => {
      if (comp.plazo && comp.plazo.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const compId = targetId + '_c' + idx;
        const cData = {
          fichaId: targetId,
          institucion: instVal || '',
          ugel: ugelVal || 'UGEL 03',
          red: redVal || 'No aplica',
          responsableFicha: responsableVal || '',
          responsableFichaDni: monitorDniVal || '',
          texto: comp.texto || '',
          responsable: comp.responsable || '',
          plazo: comp.plazo || '',
          createdBy: currentUser.uid,
          updatedAt: Date.now()
        };
        if (!isEdit) {
          cData.estado = 'Pendiente';
          cData.createdAt = Date.now();
        }
        batch.set(dbNs.collection('compromisos').doc(compId), cleanForFirestore(cData), { merge: true });
      }
    });

    // Timeout preventivo de 25 segundos para asegurar que si la conexión tiene microcortes, no deje la UI congelada
    const commitPromise = batch.commit();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('La conexión con la base de datos tardó más de lo esperado al guardar. Por favor verifica tu red e inténtalo nuevamente.')), 25000)
    );
    await Promise.race([commitPromise, timeoutPromise]);
    showToast(isEdit ? 'Ficha actualizada correctamente.' : 'Ficha registrada correctamente.');

    // Sincronizar directorio de directivos
    try {
      const syncRes = await syncDirectivosFromFicha(dbNs, { id: isEdit ? editingSubmissionId : submissionToken, ...cleanedDocData }, activeState, currentUser);
      if (syncRes && syncRes.summary) {
        showToast(`Ficha guardada. Directorio actualizado.`);
      }
    } catch (syncErr) {
      console.warn('Error sincronizando directorio desde ficha:', syncErr);
    }

    // Actualizar cache local para respuesta instantánea de KPIs y tablas
    if (activeState.submissions) {
      const existingIdx = activeState.submissions.findIndex(s => s.id === targetId);
      if (existingIdx >= 0) {
        activeState.submissions[existingIdx] = { id: targetId, ...cleanedDocData };
      } else {
        activeState.submissions.unshift({ id: targetId, ...cleanedDocData });
      }
    }

    // Limpiar estado tras guardado exitoso
    if (form) form.dataset.submissionId = '';
    clearEditMode();
    resetRegistrationSessionState();

    if (navigate) {
      navigate('consolidado');
    }
  } catch (err) {
    console.error('Error al guardar submission:', err);
    const errDetails = esc(err.stack || err.message || String(err));
    const errBanner = document.createElement('div');
    errBanner.id = 'regFormErrorBanner';
    errBanner.className = 'banner';
    errBanner.style.cssText = 'background:#FEF2F2;border:1.5px solid #DC2626;color:#991B1B;padding:14px 18px;margin-bottom:18px;border-radius:8px;';
    errBanner.innerHTML = `
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">⚠️ No se pudo guardar la ficha</div>
      <div style="font-size:13px;margin-bottom:8px">Sus datos se conservaron en el formulario; intente nuevamente.</div>
      <details style="font-size:11.5px;color:#7F1D1D;cursor:pointer">
        <summary style="font-weight:600">Ver detalle técnico</summary>
        <pre style="white-space:pre-wrap;background:#FFF;padding:8px;border-radius:4px;margin-top:6px;border:1px solid #FECACA">${errDetails}</pre>
      </details>
    `;
    const formHost = document.getElementById('regFormHost') || form;
    if (formHost) formHost.insertBefore(errBanner, formHost.firstChild);
    showToast('No se pudo guardar la ficha. Sus datos se conservaron.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = isEdit ? 'Actualizar ficha' : 'Guardar ficha';
    }
  }
}

