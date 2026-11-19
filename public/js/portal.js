/**
 * portal.js — Portal de Selección de Módulos (UGEL 03 / AGEBRE)
 * -----------------------------------------------------------------------------
 * Pantalla inicial para selección del entorno de trabajo:
 *  1. MONITOREO Y SEGUIMIENTO
 *  2. CONCURSOS ESCOLARES
 *
 * Estilos definidos en portal-modulos.css según diseño institucional.
 */

export function renderPortalView(container, { onSelectModule, canAccessConcursos = true, onShowToast }) {
  if (!container) return;

  const isRestricted = !canAccessConcursos;

  container.innerHTML = `
    <div class="portalContainer">
      <div class="portalCircuitBg" aria-hidden="true"></div>
      
      <div class="portalHeaderBannerWrap">
        <div class="portalHeaderBanner">
          <h1 class="portalHeaderTitle">BIENVENIDOS A LAS APLICACIONES DE AGEBRE - UGEL 03</h1>
        </div>
      </div>

      <div class="portalCardsGrid">
        <!-- Tarjeta: MONITOREO Y SEGUIMIENTO -->
        <div class="portalCard monitoreo" id="portalCardMonitoreo" tabindex="0" role="button" aria-label="Ingresar a Monitoreo y Seguimiento">
          <div class="portalCardHeader">
            <h3>MONITOREO Y SEGUIMIENTO</h3>
          </div>
          <div class="portalCardImageWrap">
            <img class="portalCardImg" src="./images/monitoreo.png" alt="Monitoreo y Seguimiento AGEBRE - UGEL 03" loading="eager">
          </div>
        </div>

        <!-- Tarjeta: Concursos -->
        <div class="portalCard concursos ${isRestricted ? 'portalCard--restricted' : ''}" id="portalCardConcursos" tabindex="0" role="button" aria-label="${isRestricted ? 'Acceso restringido a Concursos Escolares' : 'Ingresar a Concursos Escolares'}" title="${isRestricted ? 'Acceso restringido: requiere habilitación del Administrador' : 'Ingresar a Concursos Escolares'}">
          ${isRestricted ? '<div class="portalRestrictedBadge">🔒 Requiere autorización</div>' : ''}
          <div class="portalCardHeader">
            <h3>Concursos</h3>
          </div>
          <div class="portalCardImageWrap">
            <img class="portalCardImg" src="./images/concursos.png" alt="Concursos Escolares AGEBRE - UGEL 03" loading="eager">
          </div>
          ${isRestricted ? '<div class="portalRestrictedBar"><span>🔒 Acceso restringido por el Administrador</span></div>' : ''}
        </div>
      </div>
    </div>
  `;

  const btnMonitoreo = container.querySelector('#portalCardMonitoreo');
  const btnConcursos = container.querySelector('#portalCardConcursos');

  const select = (mod) => {
    if (typeof onSelectModule === 'function') {
      onSelectModule(mod);
    }
  };

  if (btnMonitoreo) {
    btnMonitoreo.addEventListener('click', () => select('monitoreo'));
    btnMonitoreo.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        select('monitoreo');
      }
    });
  }

  if (btnConcursos) {
    const handleConcursos = (e) => {
      e.preventDefault();
      if (isRestricted) {
        const msg = '🔒 Acceso restringido: Tu cuenta de especialista actualmente solo tiene acceso a Monitoreo y Seguimiento. Para acceder a Concursos Escolares, solicita la habilitación al Administrador.';
        if (typeof onShowToast === 'function') {
          onShowToast(msg);
        } else {
          alert(msg);
        }
        return;
      }
      select('concursos');
    };

    btnConcursos.addEventListener('click', handleConcursos);
    btnConcursos.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        handleConcursos(e);
      }
    });
  }
}