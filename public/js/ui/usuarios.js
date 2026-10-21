/* =========================================================================
   ui/usuarios.js — Administración y creación de usuarios y roles del sistema
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import { esc, showToast, lockBodyScroll, unlockBodyScroll } from './core-utils.js';
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { FIREBASE_CONFIG } from '../firebase-config.js';

/* Estado local de filtros para la pestaña de usuarios */
let userFilterState = {
  searchQuery: '',
  roleFilter: 'all' // 'all' | 'admin' | 'general'
};

/**
 * Genera una contraseña segura y fácil de recordar para especialistas de la UGEL 03
 */
function generateSecurePassword() {
  const chars = '23456789abcdefhkmnprstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let extra = '';
  for (let i = 0; i < 4; i++) {
    extra += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'Ugel2026!' + extra;
}

/**
 * Renderiza la pestaña completa de Usuarios y Roles
 */
export function renderUsuariosTab(container, state, dbNs, currentUser) {
  const allRoles = Array.isArray(state?.roles) ? state.roles : [];

  // Conteo de métricas
  const totalUsers = allRoles.length;
  const adminCount = allRoles.filter(r => r.role === 'admin').length;
  const generalCount = allRoles.filter(r => r.role === 'general' || !r.role).length;

  // Filtrado reactivo en memoria
  const query = (userFilterState.searchQuery || '').trim().toLowerCase();
  const roleFilter = userFilterState.roleFilter;

  const filteredRoles = allRoles.filter(r => {
    const email = (r.email || r.id || '').toLowerCase();
    const role = (r.role || 'general').toLowerCase();
    const matchesQuery = !query || email.includes(query) || (r.id && r.id.toLowerCase().includes(query));
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    return matchesQuery && matchesRole;
  });

  // Generación de filas
  const rows = filteredRoles.map(r => {
    const isSelf = currentUser && (r.id === currentUser.uid || (r.email && r.email.toLowerCase() === (currentUser.email || '').toLowerCase()));
    const initial = (r.email || r.id || 'U').charAt(0).toUpperCase();
    const roleName = r.role === 'admin' ? 'Administrador' : 'General';
    const roleBadgeClass = r.role === 'admin' ? 'badge-admin' : 'badge-general';

    // Fecha de creación legible
    let fechaCreadoStr = '';
    if (r.createdAt) {
      try {
        const d = new Date(r.createdAt);
        fechaCreadoStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (_) {}
    }

    return `
      <tr class="userRow" data-uid="${esc(r.id)}">
        <td style="padding:14px 18px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="userAvatarCircle" title="${esc(r.email || r.id)}">${esc(initial)}</div>
            <div style="display:flex;flex-direction:column;gap:3px">
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                <strong style="color:var(--navy-900);font-size:14px">${esc(r.email || r.id)}</strong>
                ${isSelf ? '<span class="selfUserBadge">Tú (Sesión actual)</span>' : ''}
              </div>
              <div style="font-size:11.5px;color:var(--text-600);display:flex;gap:10px">
                <span>UID: <code style="font-size:10.5px">${esc((r.id || '').slice(0, 10))}...</code></span>
                ${fechaCreadoStr ? `<span>• Creado: ${fechaCreadoStr}</span>` : ''}
              </div>
            </div>
          </div>
        </td>
        <td style="padding:14px 18px;min-width:180px">
          <div style="display:flex;align-items:center;gap:8px">
            <select class="userRoleSelect" data-roleuid="${esc(r.id)}" ${isSelf ? 'disabled title="No puedes degradar tu propia cuenta activa de administrador"' : ''}>
              <option value="general"${r.role === 'general' ? ' selected' : ''}>General (Especialista)</option>
              <option value="admin"${r.role === 'admin' ? ' selected' : ''}>Administrador (Control total)</option>
            </select>
          </div>
        </td>
        <td style="padding:14px 18px;text-align:right">
          <div style="display:inline-flex;align-items:center;gap:8px;justify-content:flex-end">
            <button type="button" class="btn secondary small btnResetPass" data-resetemail="${esc(r.email || '')}" title="Enviar correo de restablecimiento de contraseña">
              🔑 Restablecer clave
            </button>
            ${!isSelf ? `
              <button type="button" class="btn danger small btnDeleteUser" data-deleteuid="${esc(r.id)}" data-deleteemail="${esc(r.email || r.id)}" title="Revocar permisos y acceso a esta cuenta">
                🗑️ Revocar
              </button>
            ` : '<span style="font-size:12px;color:var(--text-400);padding:0 8px">—</span>'}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  const emptyMessage = allRoles.length === 0
    ? '<tr><td colspan="3" style="text-align:center;color:var(--text-600);padding:36px 20px"><div style="font-size:28px;margin-bottom:8px">👥</div><strong>Aún no hay cuentas registradas.</strong><br>Haz clic en "+ Nuevo Usuario" para crear la primera cuenta.</td></tr>'
    : '<tr><td colspan="3" style="text-align:center;color:var(--text-600);padding:36px 20px"><div style="font-size:24px;margin-bottom:8px">🔍</div>No se encontraron usuarios que coincidan con la búsqueda.</td></tr>';

  container.innerHTML = `
    <!-- Estilos específicos de la sección de usuarios -->
    <style>
      .userAvatarCircle {
        width: 38px;
        height: 38px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--navy-900), var(--blue-600));
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 15px;
        flex-shrink: 0;
        box-shadow: 0 2px 4px rgba(11,27,54,0.15);
      }
      .selfUserBadge {
        background: #E0F2FE;
        color: #0369A1;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid #BAE6FD;
        display: inline-flex;
        align-items: center;
      }
      .userRoleSelect {
        padding: 7px 12px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: #FFFFFF;
        font-size: 13px;
        font-weight: 600;
        color: var(--navy-900);
        cursor: pointer;
        width: 100%;
        max-width: 210px;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .userRoleSelect:focus {
        border-color: var(--blue-600);
        outline: none;
        box-shadow: 0 0 0 3px rgba(31,95,168,0.15);
      }
      .userRoleSelect:disabled {
        background: #F1F5F9;
        color: var(--text-600);
        cursor: not-allowed;
      }
      .userKpiGrid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
        gap: 16px;
        margin-bottom: 22px;
      }
      .userKpiCard {
        background: var(--bg-card);
        border: 1px solid var(--border);
        border-radius: 10px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: var(--shadow-sm);
        position: relative;
        overflow: hidden;
      }
      .userKpiCard::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 4px;
        height: 100%;
      }
      .userKpiCard.total::after { background: var(--navy-900); }
      .userKpiCard.admins::after { background: var(--gold-500); }
      .userKpiCard.generals::after { background: var(--ok); }
      .userKpiIcon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
      }
      .userKpiCard.total .userKpiIcon { background: #EEF2F6; color: var(--navy-900); }
      .userKpiCard.admins .userKpiIcon { background: var(--gold-100); color: #B45309; }
      .userKpiCard.generals .userKpiIcon { background: var(--ok-bg); color: var(--ok); }
      .userKpiNum {
        font-family: var(--serif);
        font-size: 26px;
        font-weight: 700;
        color: var(--navy-900);
        line-height: 1.1;
      }
      .userKpiLabel {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-600);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .userToolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 16px;
      }
      .userSearchWrap {
        position: relative;
        flex: 1;
        min-width: 260px;
        max-width: 420px;
      }
      .userSearchInput {
        width: 100%;
        padding: 9px 14px 9px 36px;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 13.5px;
        background: #FFFFFF;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .userSearchInput:focus {
        border-color: var(--blue-600);
        outline: none;
        box-shadow: 0 0 0 3px rgba(31,95,168,0.12);
      }
      .userSearchIcon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-400);
        font-size: 14px;
        pointer-events: none;
      }
      .userRoleFilterSelect {
        padding: 9px 14px;
        border: 1px solid var(--border);
        border-radius: 8px;
        font-size: 13.5px;
        background: #FFFFFF;
        font-weight: 500;
        color: var(--navy-900);
      }
      .btnCrearUsuarioTop {
        background: linear-gradient(135deg, var(--navy-900) 0%, var(--navy-800) 100%);
        color: #FFFFFF;
        border: 1px solid var(--gold-500);
        box-shadow: 0 2px 6px rgba(11,27,54,0.2);
        font-weight: 600;
        padding: 10px 18px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
      }
      .btnCrearUsuarioTop:hover {
        background: linear-gradient(135deg, #162a4d 0%, var(--navy-700) 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 10px rgba(11,27,54,0.3);
      }
    </style>

    <!-- Encabezado de Página -->
    <div class="pageHead" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div>
        <h2>Gestión de Usuarios y Accesos</h2>
        <p>Administra las cuentas autorizadas para ingresar a la plataforma, crea nuevos usuarios institucionales y asigna niveles de rol.</p>
      </div>
      <div>
        <button type="button" id="btnOpenCreateUserModal" class="btnCrearUsuarioTop">
          <span style="font-size:16px">👤➕</span>
          <span>Nuevo Usuario</span>
        </button>
      </div>
    </div>

    <!-- Tarjetas de Métricas -->
    <div class="userKpiGrid">
      <div class="userKpiCard total">
        <div class="userKpiIcon">👥</div>
        <div>
          <div class="userKpiNum">${totalUsers}</div>
          <div class="userKpiLabel">Total Cuentas</div>
        </div>
      </div>
      <div class="userKpiCard admins">
        <div class="userKpiIcon">🛡️</div>
        <div>
          <div class="userKpiNum">${adminCount}</div>
          <div class="userKpiLabel">Administradores</div>
        </div>
      </div>
      <div class="userKpiCard generals">
        <div class="userKpiIcon">📝</div>
        <div>
          <div class="userKpiNum">${generalCount}</div>
          <div class="userKpiLabel">Especialistas (General)</div>
        </div>
      </div>
    </div>

    <!-- Barra de Herramientas (Buscador y Filtro) -->
    <div class="userToolbar">
      <div style="display:flex;align-items:center;gap:12px;flex:1;flex-wrap:wrap">
        <div class="userSearchWrap">
          <span class="userSearchIcon">🔍</span>
          <input type="text" id="userSearchInput" class="userSearchInput" placeholder="Buscar por correo electrónico..." value="${esc(userFilterState.searchQuery)}" />
        </div>
        <select id="userRoleFilterSelect" class="userRoleFilterSelect">
          <option value="all"${userFilterState.roleFilter === 'all' ? ' selected' : ''}>Todos los roles</option>
          <option value="admin"${userFilterState.roleFilter === 'admin' ? ' selected' : ''}>Solo Administradores</option>
          <option value="general"${userFilterState.roleFilter === 'general' ? ' selected' : ''}>Solo Especialistas (General)</option>
        </select>
      </div>
      <div style="font-size:12.5px;color:var(--text-600);font-weight:500">
        Mostrando <strong>${filteredRoles.length}</strong> de <strong>${totalUsers}</strong> cuentas
      </div>
    </div>

    <!-- Panel de Tabla -->
    <div class="panel" style="padding:0;overflow:hidden">
      <div class="tblWrap" style="margin:0">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:14px 18px;text-align:left">Usuario / Correo Institucional</th>
              <th style="padding:14px 18px;text-align:left">Rol Asignado</th>
              <th style="padding:14px 18px;text-align:right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${rows || emptyMessage}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Explicación de Roles -->
    <div style="display:flex;gap:16px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;padding:14px 18px;margin-top:14px;font-size:12.5px;color:var(--text-600);line-height:1.5">
      <span style="font-size:18px;line-height:1">ℹ️</span>
      <div>
        <strong style="color:var(--navy-900)">Permisos de acceso:</strong>
        <ul style="margin:4px 0 0;padding-left:18px">
          <li><strong>Administrador:</strong> Acceso total al sistema, creación de usuarios, configuración de plantillas, gestión de directores y eliminación de registros.</li>
          <li><strong>General (Especialista):</strong> Puede registrar fichas de monitoreo, actualizar visitas y consultar reportes y estadísticas consolidadas.</li>
        </ul>
      </div>
    </div>
  `;

  // Listener: Búsqueda reactiva
  const searchInput = container.querySelector('#userSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      userFilterState.searchQuery = e.target.value;
      renderUsuariosTab(container, state, dbNs, currentUser);
      // Restaurar el foco al input
      const newEl = container.querySelector('#userSearchInput');
      if (newEl) {
        newEl.focus();
        newEl.setSelectionRange(newEl.value.length, newEl.value.length);
      }
    });
  }

  // Listener: Filtro por rol
  const filterSelect = container.querySelector('#userRoleFilterSelect');
  if (filterSelect) {
    filterSelect.addEventListener('change', (e) => {
      userFilterState.roleFilter = e.target.value;
      renderUsuariosTab(container, state, dbNs, currentUser);
    });
  }

  // Listener: Cambio de rol en vivo
  container.querySelectorAll('.userRoleSelect[data-roleuid]').forEach(sel => {
    sel.addEventListener('change', async () => {
      const targetUid = sel.dataset.roleuid;
      const newRole = sel.value;
      const targetUser = allRoles.find(r => r.id === targetUid);
      const emailLabel = targetUser ? (targetUser.email || targetUid) : targetUid;

      try {
        sel.disabled = true;
        await dbNs.collection('roles').doc(targetUid).update({
          role: newRole,
          actualizadoPor: currentUser?.email || 'admin',
          actualizadoEn: Date.now()
        });
        showToast(`Rol actualizado a "${newRole === 'admin' ? 'Administrador' : 'General'}" para ${emailLabel}`);
      } catch (err) {
        console.error('Error al actualizar rol:', err);
        showToast('Error al actualizar el rol en Firestore.');
        // Revertir valor
        if (targetUser) sel.value = targetUser.role || 'general';
      } finally {
        sel.disabled = false;
      }
    });
  });

  // Listener: Botón Restablecer Clave
  container.querySelectorAll('.btnResetPass[data-resetemail]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = (btn.dataset.resetemail || '').trim();
      if (!email || !email.includes('@')) {
        showToast('Esta cuenta no tiene un correo electrónico válido registrado.');
        return;
      }

      const confirmed = window.confirm(
        `¿Deseas enviar un correo de restablecimiento de contraseña a:\n\n${email}?\n\nFirebase enviará un enlace oficial al correo indicado.`
      );
      if (!confirmed) return;

      try {
        btn.disabled = true;
        btn.textContent = 'Enviando...';
        const auth = getAuth();
        await sendPasswordResetEmail(auth, email);
        showToast(`Enlace de restablecimiento enviado a ${email}`);
      } catch (err) {
        console.error('Error al enviar restablecimiento:', err);
        let msg = 'No se pudo enviar el correo de restablecimiento.';
        if (err.code === 'auth/user-not-found') {
          msg = 'El usuario no fue encontrado en Firebase Authentication.';
        }
        showToast(msg);
      } finally {
        btn.disabled = false;
        btn.textContent = '🔑 Restablecer clave';
      }
    });
  });

  // Listener: Botón Revocar Acceso
  container.querySelectorAll('.btnDeleteUser[data-deleteuid]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.deleteuid;
      const email = btn.dataset.deleteemail;

      const confirmed = window.confirm(
        `¿Estás seguro de que deseas revocar el acceso a:\n\n${email}?\n\nEl usuario perderá sus permisos de acceso al sistema de inmediato.`
      );
      if (!confirmed) return;

      try {
        btn.disabled = true;
        btn.textContent = 'Revocando...';
        await dbNs.collection('roles').doc(uid).delete();
        showToast(`Acceso revocado para ${email}`);
      } catch (err) {
        console.error('Error al revocar acceso:', err);
        showToast('No se pudo revocar el acceso del usuario.');
        btn.disabled = false;
        btn.textContent = '🗑️ Revocar';
      }
    });
  });

  // Listener: Botón Abrir Modal Nuevo Usuario
  const btnOpenModal = container.querySelector('#btnOpenCreateUserModal');
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', () => {
      openCreateUserModal(dbNs, currentUser, () => {
        // Callback al cerrar/crear con éxito
        renderUsuariosTab(container, state, dbNs, currentUser);
      });
    });
  }
}

/**
 * Diálogo Modal para Crear Nuevo Usuario en Firebase Auth + Firestore
 */
function openCreateUserModal(dbNs, currentUser, onComplete) {
  const existingModal = document.getElementById('modalCrearUsuario');
  if (existingModal) existingModal.remove();

  lockBodyScroll();

  const overlay = document.createElement('div');
  overlay.id = 'modalCrearUsuario';
  overlay.className = 'downloadModalOverlay';

  const defaultSuggestedPass = generateSecurePassword();

  overlay.innerHTML = `
    <div class="downloadModalCard" style="max-width:540px">
      <!-- Cabecera -->
      <div class="downloadModalHeader">
        <div>
          <h3>Registrar Nuevo Usuario</h3>
          <div class="sub">CREACIÓN DIRECTA EN FIREBASE AUTH Y ASIGNACIÓN DE ROL</div>
        </div>
        <button type="button" class="downloadModalClose" id="btnCloseModalCreateUser" title="Cerrar ventana">✕</button>
      </div>

      <!-- Cuerpo del Modal -->
      <div class="downloadModalBody" id="createUserModalBody" style="gap:18px">
        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:12px 14px;font-size:12.5px;color:#166534;display:flex;gap:10px;line-height:1.45">
          <span style="font-size:18px;line-height:1">⚡</span>
          <div>
            <strong>Alta directa sin cerrar tu sesión:</strong> La cuenta se registrará en Firebase Authentication y se autorizará en Firestore automáticamente. Tu sesión actual permanecerá intacta.
          </div>
        </div>

        <form id="formCreateUser" style="display:flex;flex-direction:column;gap:14px">
          <!-- Campo Correo -->
          <div style="display:flex;flex-direction:column;gap:5px">
            <label for="newAccEmail" style="font-size:12.5px;font-weight:700;color:var(--navy-900)">
              Correo Electrónico Institucional o Personal <span style="color:var(--danger)">*</span>
            </label>
            <input
              type="email"
              id="newAccEmail"
              required
              placeholder="ejemplo@ugel03.gob.pe o usuario@gmail.com"
              style="padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:13.5px;width:100%"
              autocomplete="off"
            />
            <small style="color:var(--text-600);font-size:11.5px">
              Se creará la cuenta con este correo para que el especialista pueda iniciar sesión.
            </small>
          </div>

          <!-- Campo Rol -->
          <div style="display:flex;flex-direction:column;gap:5px">
            <label for="newAccRole" style="font-size:12.5px;font-weight:700;color:var(--navy-900)">
              Rol y Nivel de Acceso <span style="color:var(--danger)">*</span>
            </label>
            <select id="newAccRole" style="padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:13.5px;width:100%;font-weight:500">
              <option value="general" selected>General (Especialista) — Registro de fichas y consulta de reportes</option>
              <option value="admin">Administrador — Acceso total, configuración y gestión de usuarios</option>
            </select>
          </div>

          <!-- Campo Contraseña -->
          <div style="display:flex;flex-direction:column;gap:5px">
            <label for="newAccPass" style="font-size:12.5px;font-weight:700;color:var(--navy-900)">
              Contraseña Inicial de Acceso <span style="color:var(--danger)">*</span>
            </label>
            <div style="display:flex;gap:8px">
              <input
                type="text"
                id="newAccPass"
                required
                minlength="6"
                value="${esc(defaultSuggestedPass)}"
                style="flex:1;padding:10px 14px;border:1px solid var(--border);border-radius:8px;font-size:14px;font-family:monospace;letter-spacing:0.5px"
                placeholder="Mínimo 6 caracteres"
              />
              <button type="button" id="btnRegenPass" class="btn secondary" style="white-space:nowrap;padding:9px 12px;font-size:12.5px" title="Generar otra clave aleatoria">
                🎲 Generar
              </button>
            </div>
            <small style="color:var(--text-600);font-size:11.5px">
              Puedes conservar la contraseña generada automáticamente o escribir una propia (mínimo 6 caracteres).
            </small>
          </div>

          <div id="createUserErrorAlert" style="display:none;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#991B1B"></div>
        </form>
      </div>

      <!-- Pie del Modal -->
      <div class="downloadModalFooter" id="createUserModalFooter">
        <button type="button" class="btn secondary" id="btnCancelCreateUser">Cancelar</button>
        <button type="button" class="btn" id="btnSubmitCreateUser" style="background:var(--blue-600);border-color:var(--blue-600)">
          <span>👤➕</span>
          <span>Crear y Autorizar Cuenta</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
    unlockBodyScroll();
    if (typeof onComplete === 'function') onComplete();
  };

  // Botones de cierre
  overlay.querySelector('#btnCloseModalCreateUser').addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelCreateUser').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Generar clave aleatoria
  const passInput = overlay.querySelector('#newAccPass');
  overlay.querySelector('#btnRegenPass').addEventListener('click', () => {
    passInput.value = generateSecurePassword();
  });

  // Submit Handler
  const submitBtn = overlay.querySelector('#btnSubmitCreateUser');
  const errorAlert = overlay.querySelector('#createUserErrorAlert');
  const emailInput = overlay.querySelector('#newAccEmail');
  const roleSelect = overlay.querySelector('#newAccRole');

  const executeCreate = async () => {
    const email = (emailInput.value || '').trim().toLowerCase();
    const password = passInput.value;
    const role = roleSelect.value;

    errorAlert.style.display = 'none';
    errorAlert.textContent = '';

    // Validaciones
    if (!email || !email.includes('@') || !email.includes('.')) {
      errorAlert.textContent = 'Por favor, ingresa un correo electrónico válido.';
      errorAlert.style.display = 'block';
      emailInput.focus();
      return;
    }

    if (!password || password.length < 6) {
      errorAlert.textContent = 'La contraseña debe contener al menos 6 caracteres.';
      errorAlert.style.display = 'block';
      passInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Creando cuenta en Firebase...';

    const tempAppName = `create-user-${Date.now()}`;
    let tempApp = null;

    try {
      // 1. Inicializar app secundaria aislada para no destruir la sesión de administrador
      tempApp = initializeApp(FIREBASE_CONFIG, tempAppName);
      const tempAuth = getAuth(tempApp);

      // 2. Crear usuario en Firebase Authentication
      const userCred = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newUid = userCred.user.uid;

      // 3. Cerrar sesión en la instancia secundaria y destruirla
      try { await signOut(tempAuth); } catch (_) {}
      try { await deleteApp(tempApp); } catch (_) {}
      tempApp = null;

      // 4. Guardar rol en la colección 'roles' usando la instancia principal dbNs
      await dbNs.collection('roles').doc(newUid).set({
        email: email,
        role: role,
        createdAt: Date.now(),
        creadoPor: currentUser?.email || 'admin'
      });

      // 5. Renderizar vista de éxito con credenciales copiables
      renderModalSuccess(overlay, email, password, role, closeModal);
      showToast(`Usuario ${email} creado exitosamente.`);
    } catch (err) {
      console.error('Error al crear usuario:', err);

      if (tempApp) {
        try { await deleteApp(tempApp); } catch (_) {}
      }

      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>👤➕</span> <span>Crear y Autorizar Cuenta</span>';

      let msg = 'Ocurrió un error al registrar el usuario.';
      if (err.code === 'auth/email-already-in-use') {
        msg = `El correo ${email} ya tiene una cuenta registrada en Firebase Authentication.`;
      } else if (err.code === 'auth/invalid-email') {
        msg = 'El formato del correo electrónico no es válido.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (err.message) {
        msg = err.message;
      }

      errorAlert.innerHTML = `<strong>Error:</strong> ${esc(msg)}`;
      errorAlert.style.display = 'block';
    }
  };

  submitBtn.addEventListener('click', executeCreate);
  overlay.querySelector('#formCreateUser').addEventListener('submit', (e) => {
    e.preventDefault();
    executeCreate();
  });
}

/**
 * Muestra la vista de éxito con las credenciales creadas y botón para copiar
 */
function renderModalSuccess(overlay, email, password, role, onClose) {
  const modalBody = overlay.querySelector('#createUserModalBody');
  const modalFooter = overlay.querySelector('#createUserModalFooter');

  const roleLabel = role === 'admin' ? 'Administrador (Control Total)' : 'General (Especialista)';
  const loginUrl = window.location.origin + window.location.pathname;

  modalBody.innerHTML = `
    <div style="text-align:center;padding:10px 0 6px">
      <div style="width:58px;height:58px;border-radius:50%;background:#DCFCE7;color:#16A34A;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:12px">
        ✓
      </div>
      <h4 style="margin:0 0 6px 0;font-size:18px;color:var(--navy-900);font-family:var(--serif)">¡Cuenta Creada Exitosamente!</h4>
      <p style="margin:0;font-size:13px;color:var(--text-600)">
        El usuario ha sido registrado en Firebase Authentication y autorizado en el sistema de monitoreo.
      </p>
    </div>

    <!-- Tarjeta de Credenciales -->
    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:10px;padding:16px 18px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #E2E8F0;padding-bottom:8px">
        <span style="font-size:12px;color:var(--text-600);font-weight:600">DATOS DE ACCESO</span>
        <span class="badge" style="background:#E0F2FE;color:#0369A1;font-weight:700;font-size:11px;padding:3px 8px;border-radius:6px">${esc(roleLabel)}</span>
      </div>
      <div>
        <div style="font-size:11.5px;color:var(--text-600);margin-bottom:2px">Correo Electrónico:</div>
        <div style="font-size:14px;font-weight:700;color:var(--navy-900)">${esc(email)}</div>
      </div>
      <div>
        <div style="font-size:11.5px;color:var(--text-600);margin-bottom:2px">Contraseña Asignada:</div>
        <div style="font-size:14.5px;font-weight:700;color:#0F766E;font-family:monospace;background:#FFFFFF;border:1px solid #CBD5E1;padding:6px 10px;border-radius:6px;display:inline-block">
          ${esc(password)}
        </div>
      </div>
      <div>
        <div style="font-size:11.5px;color:var(--text-600);margin-bottom:2px">Enlace de Inicio de Sesión:</div>
        <div style="font-size:12px;color:var(--blue-600);word-break:break-all">${esc(loginUrl)}</div>
      </div>
    </div>

    <div style="display:flex;gap:10px">
      <button type="button" id="btnCopyCreds" class="btn secondary" style="flex:1;padding:10px">
        📋 Copiar Credenciales
      </button>
    </div>
  `;

  modalFooter.innerHTML = `
    <button type="button" class="btn" id="btnAcceptSuccess" style="background:var(--navy-900);border-color:var(--navy-900);color:#FFFFFF">
      Aceptar y Finalizar
    </button>
  `;

  // Copiar datos al portapapeles
  const btnCopy = modalBody.querySelector('#btnCopyCreds');
  btnCopy.addEventListener('click', async () => {
    const textToCopy = [
      'SISTEMA DE MONITOREO Y ACOMPAÑAMIENTO 2026 — UGEL 03',
      'Acceso al Sistema Web:',
      `URL: ${loginUrl}`,
      `Correo: ${email}`,
      `Contraseña: ${password}`,
      `Rol: ${roleLabel}`,
      '-------------------------------------------------------',
      'Por seguridad, te recomendamos guardar estas credenciales en un lugar seguro.'
    ].join('\n');

    try {
      await navigator.clipboard.writeText(textToCopy);
      btnCopy.textContent = '✅ ¡Credenciales Copiadas!';
      showToast('Datos copiados al portapapeles.');
      setTimeout(() => { btnCopy.textContent = '📋 Copiar Credenciales'; }, 2500);
    } catch (_) {
      showToast('No se pudo copiar automáticamente. Por favor selecciónalas manualmente.');
    }
  });

  modalFooter.querySelector('#btnAcceptSuccess').addEventListener('click', onClose);
}
