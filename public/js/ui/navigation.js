/* =========================================================================
   ui/navigation.js — Navegación global, barras de pestañas y botones de cabecera
   ========================================================================= */

import { forceResetBodyScroll } from './core-utils.js';
import { clearEditMode, setAppState, getSessionUser, setRegBuiltFor } from './state.js';
import { openDownloadConfigModal } from './modales.js';
import { computeStats } from './scoring.js';
import { exportConsolidadoReportPdf } from '../pdf-template.js';
import { setRegistrarSubTab, resetRegBuiltFor } from './registrar.js';

/* ============================= NAVEGACIÓN ============================= */
export function renderForbidden(c) {
  c.innerHTML = '<div class="empty"><h4>Solo para administradores</h4><p>Tu cuenta tiene rol "General" y no tiene acceso a esta sección.</p></div>';
}

export function setupNavigation(state, renderFn) {
  if (state) setAppState(state);

  const cleanConcursoParams = (tab) => {
    if (tab !== 'concursos' && typeof window !== 'undefined' && window.location) {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('concurso') || url.searchParams.has('etapa') || url.searchParams.has('categoria')) {
          url.searchParams.delete('concurso');
          url.searchParams.delete('etapa');
          url.searchParams.delete('categoria');
          window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
        }
      } catch (e) {
        console.warn('Error limpiando parámetros de URL:', e);
      }
    }
  };

  document.querySelectorAll('.navbtn').forEach(b => {
    b.addEventListener('click', () => {
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.activeTab = b.dataset.tab;
      if (state.activeTab === 'registrar') {
        clearEditMode();
        setRegistrarSubTab('registrar');
        resetRegBuiltFor();
      }
      cleanConcursoParams(state.activeTab);
      renderFn();
    });
  });

  // Botón superior "Registrar ficha"
  const topRegBtn = document.getElementById('topRegistrarBtn');
  if (topRegBtn) {
    topRegBtn.addEventListener('click', () => {
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      state.activeTab = 'registrar';
      clearEditMode();
      setRegistrarSubTab('registrar');
      resetRegBuiltFor();
      cleanConcursoParams('registrar');
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      const btn = document.querySelector('.navbtn[data-tab="registrar"]');
      if (btn) btn.classList.add('active');
      renderFn();
    });
  }

  // Campana de alertas en la cabecera (oculta)
  const topBellBtn = document.getElementById('topBellBtn');
  if (topBellBtn) {
    topBellBtn.addEventListener('click', () => {
      forceResetBodyScroll();
      window.scrollTo({ top: 0, behavior: 'instant' });
      state.activeTab = 'dashboard';
      cleanConcursoParams('dashboard');
      document.querySelectorAll('.navbtn').forEach(x => x.classList.remove('active'));
      const btn = document.querySelector('.navbtn[data-tab="dashboard"]');
      if (btn) btn.classList.add('active');
      renderFn();
    });
  }

  // Botón superior "Exportar"
  const topExportBtn = document.getElementById('topExportBtn');
  if (topExportBtn) {
    topExportBtn.addEventListener('click', () => {
      // Abre el diálogo modal universal para exportar el consolidado general
      openDownloadConfigModal({
        documentTitle: 'REPORTE CONSOLIDADO GENERAL DE MONITOREO',
        tipoReporte: 'consolidado',
        dataRows: state.submissions || [],
        currentUser: getSessionUser() || (state && state.currentUser) || null,
        state,
        dbNs: null,
        isAdmin: false,
        onConfirm: async (cfg) => {
          const statsList = (state.submissions || []).map(s => {
            const ft = (state.fichaTypes || []).find(f => f.id === s.fichaTypeId);
            const st = ft ? computeStats(s, ft) : { pct: null };
            return { s, st };
          });
          await exportConsolidadoReportPdf(statsList, null, {}, true, cfg);
        }
      });
    });
  }
}

