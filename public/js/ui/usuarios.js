/* =========================================================================
   ui/usuarios.js — Administración y creación de usuarios y roles del sistema
   UGEL 03 · Sistema de Monitoreo y Acompañamiento Pedagógico 2026
   ========================================================================= */

import { esc, showToast, lockBodyScroll, unlockBodyScroll } from './core-utils.js';
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signOut,

} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { FIREBASE_CONFIG } from '../firebase-config.js';
import { openAdminResetPasswordModal } from './perfil-modal.js?v=20261119_v5';

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
 * Determina si una cuenta de usuario está activa en el sistema.
 * Excluye cuentas dadas de baja, revocadas o eliminadas.
 */
function isUserActive(user) {
  if (!user) return false;
  if (user.eliminado === true) return false;
  const st = (user.estado || '').toLowerCase();
  if (st === 'inactivo' || st === 'revocado' || st === 'eliminado' || st === 'baja') return false;
  return true;
}

/**
 * Filtra los usuarios activos y deduplica por correo institucional.
 * Si existen múltiples registros del mismo usuario (por pruebas previas),
 * conserva únicamente el registro activo con mayor jerarquía o recencia.
 */
function filterAndDeduplicateActiveRoles(roles, currentUser) {
  const byEmail = new Map();
  const candidates = (roles || []).filter(isUserActive);

  for (const r of candidates) {
    const key = (r.email || r.id || '').trim().toLowerCase();
    if (!key) continue;

    if (!byEmail.has(key)) {
      byEmail.set(key, r);
    } else {
      const existing = byEmail.get(key);
      // Reglas de prioridad para mantener el registro más relevante:
      // 1. Si coincide con el UID de la sesión actual, siempre prevalece
      if (currentUser && (r.id === currentUser.uid || (r.email && r.email.toLowerCase() === (currentUser.email || '').toLowerCase()))) {
        byEmail.set(key, r);
      } else if (currentUser && (existing.id === currentUser.uid || (existing.email && existing.email.toLowerCase() === (currentUser.email || '').toLowerCase()))) {
        // Mantener el existente
      } else if (r.role === 'admin' && existing.role !== 'admin') {
        byEmail.set(key, r);
      } else if (r.estadoVerificacion === 'verificado' && existing.estadoVerificacion !== 'verificado') {
        byEmail.set(key, r);
      } else {
        const tR = r.actualizadoEn || r.createdAt || 0;
        const tE = existing.actualizadoEn || existing.createdAt || 0;
        if (tR > tE) {
          byEmail.set(key, r);
        }
      }
    }
  }

  return Array.from(byEmail.values());
}

/**
 * Renderiza la pestaña completa de Usuarios y Roles (Solo Usuarios Activos)
 */
export function renderUsuariosTab(container, state, dbNs, currentUser) {
  const rawRoles = Array.isArray(state?.roles) ? state.roles : [];
  // Filtrar y deduplicar: solo usuarios estrictamente activos
  const activeRoles = filterAndDeduplicateActiveRoles(rawRoles, currentUser);

  // Conteo de métricas de usuarios activos
  const totalActiveUsers = activeRoles.length;
  const adminCount = activeRoles.filter(r => r.role === 'admin').length;
  const generalCount = activeRoles.filter(r => r.role === 'general' || !r.role).length;

  // Filtrado reactivo en memoria
  const query = (userFilterState.searchQuery || '').trim().toLowerCase();
  const roleFilter = userFilterState.roleFilter;

  const filteredRoles = activeRoles.filter(r => {
    const email = (r.email || r.id || '').toLowerCase();
    const name = (r.nombre || '').toLowerCase();
    const role = (r.role || 'general').toLowerCase();
    const matchesQuery = !query || email.includes(query) || name.includes(query) || (r.id && r.id.toLowerCase().includes(query));
    const matchesRole = roleFilter === 'all' || role === roleFilter;
    return matchesQuery && matchesRole;
  });

  // Generación de filas de la tabla
  const rows = filteredRoles.map(r => {
    const isSelf = currentUser && (r.id === currentUser.uid || (r.email && r.email.toLowerCase() === (currentUser.email || '').toLowerCase()));
    const initial = (r.email || r.id || 'U').charAt(0).toUpperCase();

    // Fecha de creación legible
    let fechaCreadoStr = '';
    if (r.createdAt) {
      try {
        const d = new Date(r.createdAt);
        fechaCreadoStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      } catch (_) {}
    }

    const userNombre = r.nombre ? `<div style="font-size:12.5px;font-weight:600;color:var(--navy-900);margin-top:1px">${esc(r.nombre)}</div>` : '';
    const userMetaPills = [];
    if (r.modalidad) userMetaPills.push(`<span style="font-size:11px;background:#F1F5F9;padding:1px 6px;border-radius:4px;color:var(--text-600)">Mod: ${esc(r.modalidad)}</span>`);
    if (r.reis && r.reis.length) {
      const reisStr = Array.isArray(r.reis) ? r.reis.join(', ') : String(r.reis);
      userMetaPills.push(`<span style="font-size:11px;background:#F1F5F9;padding:1px 6px;border-radius:4px;color:var(--text-600)">REI: ${esc(reisStr)}</span>`);
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
                <span class="activeAccountBadge" title="Cuenta activa y autorizada">Activo ✓</span>
              </div>
              ${userNombre}
              <div style="font-size:11.5px;color:var(--text-600);display:flex;gap:10px;align-items:center;flex-wrap:wrap">
                <span>UID: <code style="font-size:10.5px">${esc((r.id || '').slice(0, 10))}...</code></span>
                ${fechaCreadoStr ? `<span>• Creado: ${fechaCreadoStr}</span>` : ''}
                ${userMetaPills.join(' ')}
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
        <td style="padding:14px 18px;text-align:center">
          ${r.role === 'admin' ? `
            <span class="badge st-logrado" title="Administrador con acceso total a todos los módulos">✓ Total</span>
          ` : `
            <label class="concursoToggleLabel" style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;padding:4px 10px;border-radius:20px;background:${r.accesoConcursos ? '#ECFDF5' : '#F8FAFC'};border:1px solid ${r.accesoConcursos ? '#A7F3D0' : 'var(--border)'};transition:all 0.15s" title="Habilitar o restringir acceso al módulo de Concursos Escolares">
              <input type="checkbox" class="concursoAccessCheckbox" data-uid="${esc(r.id)}" ${r.accesoConcursos ? 'checked' : ''} style="cursor:pointer;accent-color:var(--ok)">
              <span style="font-size:12px;font-weight:700;color:${r.accesoConcursos ? '#065F46' : 'var(--text-600)'}">
                ${r.accesoConcursos ? 'Habilitado ✓' : 'Sin acceso 🔒'}
              </span>
            </label>
          `}
        </td>
        <td style="padding:14px 18px;text-align:right">
          <div style="display:inline-flex;align-items:center;gap:8px;justify-content:flex-end">
            <button type="button" class="btn secondary small btnEditJurisdiccion" data-uid="${esc(r.id)}" title="Modificar REI(s) y Modalidades asignadas">📍 Jurisdicción</button> <button type="button" class="btn secondary small btnResetPass" data-resetuid="${esc(r.id)}" data-resetemail="${esc(r.email || '')}" title="Restablecer clave de acceso">
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

  const emptyMessage = activeRoles.length === 0
    ? '<tr><td colspan="4" style="text-align:center;color:var(--text-600);padding:36px 20px"><div style="font-size:28px;margin-bottom:8px">👥</div><strong>Aún no hay cuentas activas registradas.</strong><br>Haz clic en "+ Nuevo Usuario" para crear la primera cuenta.</td></tr>'
    : '<tr><td colspan="4" style="text-align:center;color:var(--text-600);padding:36px 20px"><div style="font-size:24px;margin-bottom:8px">🔍</div>No se encontraron usuarios activos que coincidan con la búsqueda.</td></tr>';

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
      .activeAccountBadge {
        background: #DCFCE7;
        color: #15803D;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid #BBF7D0;
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
      .btnHistorialTop {
        background: #FFFFFF;
        color: var(--navy-900);
        border: 1px solid var(--border);
        box-shadow: 0 1px 3px rgba(11,27,54,0.08);
        font-weight: 600;
        padding: 10px 16px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .btnHistorialTop:hover {
        background: #F8FAFC;
        border-color: var(--navy-900);
        color: var(--navy-900);
        transform: translateY(-1px);
        box-shadow: 0 3px 8px rgba(11,27,54,0.12);
      }
    </style>

    <!-- Encabezado de Página -->
    <div class="pageHead" style="display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap">
      <div>
        <h2>Gestión de Usuarios y Accesos</h2>
        <p>Visualización de cuentas activas autorizadas en la plataforma. Utiliza el historial para consultar todas las solicitudes y validaciones.</p>
      </div>
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <button type="button" id="btnOpenHistorialRegistros" class="btnHistorialTop" title="Consultar bitácora histórica de solicitudes de registro, validaciones OTP y altas de usuarios">
          <span style="font-size:16px">📜</span>
          <span>Historial de Registros</span>
        </button>
        <button type="button" id="btnOpenCreateUserModal" class="btnCrearUsuarioTop">
          <span style="font-size:16px">👤➕</span>
          <span>Nuevo Usuario</span>
        </button>
      </div>
    </div>

    <!-- Tarjetas de Métricas (Solo Usuarios Activos) -->
    <div class="userKpiGrid">
      <div class="userKpiCard total">
        <div class="userKpiIcon">👥</div>
        <div>
          <div class="userKpiNum">${totalActiveUsers}</div>
          <div class="userKpiLabel">Usuarios Activos</div>
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
          <div class="userKpiLabel">Especialistas Activos</div>
        </div>
      </div>
    </div>

    <!-- Barra de Herramientas (Buscador y Filtro) -->
    <div class="userToolbar">
      <div style="display:flex;align-items:center;gap:12px;flex:1;flex-wrap:wrap">
        <div class="userSearchWrap">
          <span class="userSearchIcon">🔍</span>
          <input type="text" id="userSearchInput" class="userSearchInput" placeholder="Buscar por correo o especialista..." value="${esc(userFilterState.searchQuery)}" />
        </div>
        <select id="userRoleFilterSelect" class="userRoleFilterSelect">
          <option value="all"${userFilterState.roleFilter === 'all' ? ' selected' : ''}>Todos los roles activos</option>
          <option value="admin"${userFilterState.roleFilter === 'admin' ? ' selected' : ''}>Solo Administradores</option>
          <option value="general"${userFilterState.roleFilter === 'general' ? ' selected' : ''}>Solo Especialistas (General)</option>
        </select>
      </div>
      <div style="font-size:12.5px;color:var(--text-600);font-weight:500">
        Mostrando <strong>${filteredRoles.length}</strong> de <strong>${totalActiveUsers}</strong> cuentas activas
      </div>
    </div>

    <!-- Panel de Tabla -->
    <div class="panel" style="padding:0;overflow:hidden">
      <div class="tblWrap" style="margin:0">
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr>
              <th style="padding:14px 18px;text-align:left">Usuario Activo / Correo Institucional</th>
              <th style="padding:14px 18px;text-align:left">Rol Asignado</th>
              <th style="padding:14px 18px;text-align:center">Acceso a Concursos</th>
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
        <strong style="color:var(--navy-900)">Permisos de acceso para cuentas activas:</strong>
        <ul style="margin:4px 0 0;padding-left:18px">
          <li><strong>Administrador:</strong> Acceso total al sistema, creación de usuarios, revocación de accesos, configuración de plantillas y eliminación de registros.</li>
          <li><strong>General (Especialista):</strong> Puede registrar fichas de monitoreo, actualizar visitas y consultar reportes consolidados.</li>
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
      const targetUser = activeRoles.find(r => r.id === targetUid);
      const emailLabel = targetUser ? (targetUser.email || targetUid) : targetUid;

      try {
        sel.disabled = true;
        await dbNs.collection('roles').doc(targetUid).update({
          role: newRole,
          actualizadoPor: currentUser?.email || 'admin',
          actualizadoEn: Date.now()
        });

        // Registrar en logActividades
        try {
          await dbNs.collection('logActividades').add({
            tipo: 'ROL_ACTUALIZADO',
            usuarioUid: targetUid,
            usuarioEmail: emailLabel,
            nuevoRol: newRole,
            actualizadoPor: currentUser?.email || 'admin',
            timestamp: Date.now(),
            fecha: new Date().toISOString(),
            detalle: `Rol modificado a ${newRole === 'admin' ? 'Administrador' : 'General'} por ${currentUser?.email || 'admin'}`
          });
        } catch (_) {}

        showToast(`Rol actualizado a "${newRole === 'admin' ? 'Administrador' : 'General'}" para ${emailLabel}`);
      } catch (err) {
        console.error('Error al actualizar rol:', err);
        showToast('Error al actualizar el rol en Firestore.');
        if (targetUser) sel.value = targetUser.role || 'general';
      } finally {
        sel.disabled = false;
      }
    });
  });

  // Listener: Interruptor de Acceso a Concursos Escolares (Solo Especialistas)
  container.querySelectorAll('.concursoAccessCheckbox[data-uid]').forEach(cb => {
    cb.addEventListener('change', async () => {
      const targetUid = cb.dataset.uid;
      const isGranted = cb.checked;
      const targetUser = activeRoles.find(r => r.id === targetUid);
      const emailLabel = targetUser ? (targetUser.email || targetUid) : targetUid;
      const labelSpan = cb.closest('label')?.querySelector('span');

      try {
        cb.disabled = true;
        await dbNs.collection('roles').doc(targetUid).update({
          accesoConcursos: isGranted,
          actualizadoPor: currentUser?.email || 'admin',
          actualizadoEn: Date.now()
        });
        if (labelSpan) {
          labelSpan.textContent = isGranted ? 'Habilitado ✓' : 'Sin acceso 🔒';
          labelSpan.style.color = isGranted ? '#065F46' : 'var(--text-600)';
        }
        if (cb.closest('label')) {
          cb.closest('label').style.background = isGranted ? '#ECFDF5' : '#F8FAFC';
          cb.closest('label').style.borderColor = isGranted ? '#A7F3D0' : 'var(--border)';
        }
        showToast(`Acceso a Concursos ${isGranted ? 'HABILITADO' : 'REVOCADO'} para ${emailLabel}`);
      } catch (err) {
        console.error('Error al actualizar permiso de concursos:', err);
        showToast('Error al actualizar el permiso en Firestore.');
        cb.checked = !isGranted;
      } finally {
        cb.disabled = false;
      }
    });
  });

  // Listener: Botón Modificar Jurisdicción (REI y Modalidad)
  container.querySelectorAll('.btnEditJurisdiccion[data-uid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const targetUser = activeRoles.find(r => r.id === uid);
      if (!targetUser) return;
      openEditUserJurisdictionModal(targetUser, dbNs, currentUser, () => {
        renderUsuariosTab(container, state, dbNs, currentUser);
      });
    });
  });

  // Listener: Botón Restablecer Clave (Modal institucional directo sin alertas del navegador)
  container.querySelectorAll('.btnResetPass[data-resetemail]').forEach(btn => {
    btn.addEventListener('click', () => {
      const email = (btn.dataset.resetemail || '').trim().toLowerCase();
      const uid = btn.dataset.resetuid;
      const targetUser = activeRoles.find(r => r.id === uid || (r.email && r.email.toLowerCase() === email));
      if (!targetUser) {
        showToast('No se encontró el registro del usuario.');
        return;
      }
      openAdminResetPasswordModal(targetUser, dbNs, currentUser, () => {
        renderUsuariosTab(container, state, dbNs, currentUser);
      });
    });
  });
  // Listener: Botón Revocar Acceso (Eliminar/Desactivar Usuario del Sistema)
  container.querySelectorAll('.btnDeleteUser[data-deleteuid]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const uid = btn.dataset.deleteuid;
      const email = (btn.dataset.deleteemail || '').trim().toLowerCase();

      const confirmed = window.confirm(
        `¿Estás seguro de que deseas revocar el acceso a:\n\n${email}?\n\nLa cuenta perderá sus permisos de forma inmediata y pasará al Historial de Registros.`
      );
      if (!confirmed) return;

      try {
        btn.disabled = true;
        btn.textContent = 'Revocando...';

        // 1. Registrar auditoría en logActividades
        try {
          await dbNs.collection('logActividades').add({
            tipo: 'USUARIO_REVOCADO',
            usuarioUid: uid,
            usuarioEmail: email,
            revocadoPor: currentUser?.email || 'admin',
            timestamp: Date.now(),
            fecha: new Date().toISOString(),
            detalle: `Acceso revocado por el administrador (${currentUser?.email || 'admin'})`
          });
        } catch (logErr) {
          console.warn('Aviso en bitácora de auditoría:', logErr);
        }

        // 2. Marcar como revocado en Firestore (soft-delete asegurado)
        let docUpdated = false;
        try {
          await dbNs.collection('roles').doc(uid).update({
            estado: 'revocado',
            eliminado: true,
            fechaBaja: Date.now(),
            revocadoPor: currentUser?.email || 'admin',
            actualizadoEn: Date.now()
          });
          docUpdated = true;
        } catch (updErr) {
          console.warn('Aviso al marcar estado como revocado:', updErr);
        }

        // 3. Intentar eliminación física del documento en roles
        try {
          await dbNs.collection('roles').doc(uid).delete();
        } catch (delErr) {
          if (!docUpdated) throw delErr;
        }

        // 4. Actualizar memoria local eliminando todas las coincidencias
        if (state && Array.isArray(state.roles)) {
          state.roles = state.roles.filter(r => r.id !== uid && (r.email || '').toLowerCase() !== email);
        }

        showToast(`Acceso revocado exitosamente para ${email}`);

        // Re-renderizar la vista para reflejar la eliminación de inmediato
        renderUsuariosTab(container, state, dbNs, currentUser);
      } catch (err) {
        console.error('Error al revocar acceso:', err);
        showToast('No se pudo revocar el acceso del usuario: ' + (err.message || 'Error de permisos'));
        btn.disabled = false;
        btn.textContent = '🗑️ Revocar';
      }
    });
  });

  // Listener: Botón Abrir Historial de Registros
  const btnOpenHistorial = container.querySelector('#btnOpenHistorialRegistros');
  if (btnOpenHistorial) {
    btnOpenHistorial.addEventListener('click', () => {
      openHistorialRegistrosModal(dbNs, currentUser, state);
    });
  }

  // Listener: Botón Abrir Modal Nuevo Usuario
  const btnOpenModal = container.querySelector('#btnOpenCreateUserModal');
  if (btnOpenModal) {
    btnOpenModal.addEventListener('click', () => {
      openCreateUserModal(dbNs, currentUser, () => {
        renderUsuariosTab(container, state, dbNs, currentUser);
      });
    });
  }
}

/**
 * Diálogo Modal: Historial de Registros y Auditoría de Cuentas
 * Muestra la bitácora histórica de solicitudes web, validaciones OTP,
 * altas directas por administradores y cuentas revocadas.
 */
async function openHistorialRegistrosModal(dbNs, currentUser, state) {
  const existingModal = document.getElementById('modalHistorialRegistros');
  if (existingModal) existingModal.remove();

  lockBodyScroll();

  const overlay = document.createElement('div');
  overlay.id = 'modalHistorialRegistros';
  overlay.className = 'downloadModalOverlay';

  overlay.innerHTML = `
    <div class="downloadModalCard" style="max-width:980px;width:95%;max-height:92vh;display:flex;flex-direction:column;padding:0;overflow:hidden">
      <!-- Cabecera -->
      <div class="downloadModalHeader" style="padding:18px 24px;border-bottom:1px solid var(--border)">
        <div>
          <h3 style="display:flex;align-items:center;gap:8px;margin:0;font-size:18px;color:var(--navy-900)">
            <span>📜</span> Historial de Registros y Auditoría de Usuarios
          </h3>
          <div class="sub" style="font-size:11.5px;color:var(--text-600);margin-top:3px">
            BITÁCORA COMPLETA DE SOLICITUDES, CÓDIGOS OTP, ALTAS Y AUDITORÍA DE CUENTAS
          </div>
        </div>
        <button type="button" class="downloadModalClose" id="btnCloseHistorialModal" title="Cerrar ventana">✕</button>
      </div>

      <!-- Estado inicial de carga -->
      <div id="historialModalContent" style="padding:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:260px">
        <div style="font-size:28px">⏳</div>
        <div style="font-size:14px;font-weight:600;color:var(--navy-900)">Cargando bitácora histórica de usuarios...</div>
        <div style="font-size:12px;color:var(--text-600)">Consultando eventos en Firestore y verificaciones de seguridad.</div>
      </div>

      <!-- Pie del Modal -->
      <div class="downloadModalFooter" id="historialModalFooter" style="padding:14px 24px;border-top:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">
        <div id="historialCounterText" style="font-size:12.5px;color:var(--text-600);font-weight:500">Cargando datos...</div>
        <button type="button" class="btn secondary" id="btnCloseHistorialFooter">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
    unlockBodyScroll();
  };

  overlay.querySelector('#btnCloseHistorialModal').addEventListener('click', closeModal);
  overlay.querySelector('#btnCloseHistorialFooter').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const contentArea = overlay.querySelector('#historialModalContent');
  const footerCounter = overlay.querySelector('#historialCounterText');

  try {
    // 1. Consultar colecciones en paralelo
    const [logsSnap, verifsSnap] = await Promise.all([
      dbNs.collection('logActividades').get().catch(() => ({ docs: [] })),
      dbNs.collection('verificaciones').get().catch(() => ({ docs: [] }))
    ]);

    // 2. Indexar verificaciones OTP por correo
    const verifsMap = new Map();
    (verifsSnap.docs || []).forEach(doc => {
      const data = doc.data();
      const email = (data.email || '').trim().toLowerCase();
      if (email) {
        verifsMap.set(email, { id: doc.id, ...data });
      }
    });

    // 3. Indexar roles actuales en memoria
    const rawRoles = Array.isArray(state?.roles) ? state.roles : [];
    const rolesMap = new Map();
    rawRoles.forEach(r => {
      const email = (r.email || r.id || '').trim().toLowerCase();
      if (email) rolesMap.set(email, r);
    });

    // 4. Procesar y normalizar eventos
    const allEvents = [];

    // 4.1. Eventos desde logActividades
    (logsSnap.docs || []).forEach(doc => {
      const d = doc.data();
      const tipo = (d.tipo || '').toUpperCase();
      // Filtrar solo los logs pertinentes a registros, usuarios o revocaciones
      if (tipo === 'REGISTRO_NUEVO_USUARIO' || tipo === 'CREACION_USUARIO_ADMIN' || tipo === 'USUARIO_REVOCADO' || tipo === 'REVOCACION_USUARIO' || tipo.includes('USUARIO') || tipo.includes('REGISTRO')) {
        const email = (d.usuarioEmail || d.email || '').trim().toLowerCase();
        const verif = verifsMap.get(email);
        const roleDoc = rolesMap.get(email);

        let statusKey = 'pendiente';
        let statusBadgeHtml = '<span class="histBadge histBadgePendiente">Pendiente OTP ⏳</span>';

        if (tipo === 'USUARIO_REVOCADO' || tipo === 'REVOCACION_USUARIO' || (roleDoc && (roleDoc.eliminado || roleDoc.estado === 'revocado'))) {
          statusKey = 'revocado';
          statusBadgeHtml = '<span class="histBadge histBadgeRevocado">Revocado 🚫</span>';
        } else if (tipo === 'CREACION_USUARIO_ADMIN') {
          statusKey = 'verificado';
          statusBadgeHtml = '<span class="histBadge histBadgeAdmin">Alta Admin ⚡</span>';
        } else if ((verif && verif.estado === 'verificado') || (roleDoc && roleDoc.estadoVerificacion === 'verificado') || (roleDoc && isUserActive(roleDoc))) {
          statusKey = 'verificado';
          statusBadgeHtml = '<span class="histBadge histBadgeVerificado">Verificado ✓</span>';
        }

        const t = d.timestamp || (d.fecha ? new Date(d.fecha).getTime() : 0) || Date.now();
        const fechaD = new Date(t);
        const fechaStr = fechaD.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const horaStr = fechaD.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        allEvents.push({
          id: doc.id,
          timestamp: t,
          fechaStr: `${fechaStr} ${horaStr}`,
          email: email || '—',
          nombre: d.usuarioNombre || d.nombre || '—',
          rol: d.rolSolicitado || d.role || (roleDoc?.role === 'admin' ? 'Administrador' : 'Especialista'),
          modalidad: d.modalidad || roleDoc?.modalidad || 'EBR',
          reis: Array.isArray(d.reis) ? d.reis.join(', ') : (d.reis || roleDoc?.reis || 'TODAS'),
          tipo: tipo,
          statusKey: statusKey,
          statusBadgeHtml: statusBadgeHtml,
          detalle: d.detalle || (tipo === 'REGISTRO_NUEVO_USUARIO' ? 'Solicitud de registro web con código OTP' : 'Actividad de usuario')
        });
      }
    });

    // 4.2. Agregar verificaciones que no tengan registro en logActividades
    verifsMap.forEach((v, email) => {
      const alreadyHas = allEvents.some(e => e.email === email && e.tipo === 'REGISTRO_NUEVO_USUARIO');
      if (!alreadyHas) {
        const roleDoc = rolesMap.get(email);
        const t = v.createdAt || Date.now();
        const fechaD = new Date(t);
        const isVerif = v.estado === 'verificado' || (roleDoc && roleDoc.estadoVerificacion === 'verificado');
        const isRevoked = roleDoc && (roleDoc.eliminado || roleDoc.estado === 'revocado');

        let statusKey = isVerif ? 'verificado' : 'pendiente';
        let statusBadgeHtml = isVerif
          ? '<span class="histBadge histBadgeVerificado">Verificado ✓</span>'
          : '<span class="histBadge histBadgePendiente">Pendiente OTP ⏳</span>';

        if (isRevoked) {
          statusKey = 'revocado';
          statusBadgeHtml = '<span class="histBadge histBadgeRevocado">Revocado 🚫</span>';
        }

        allEvents.push({
          id: v.id || ('verif_' + email),
          timestamp: t,
          fechaStr: `${fechaD.toLocaleDateString('es-PE')} ${fechaD.toLocaleTimeString('es-PE')}`,
          email: email,
          nombre: roleDoc?.nombre || '—',
          rol: roleDoc?.role === 'admin' ? 'Administrador' : 'Especialista',
          modalidad: roleDoc?.modalidad || 'EBR',
          reis: Array.isArray(roleDoc?.reis) ? roleDoc.reis.join(', ') : (roleDoc?.reis || 'TODAS'),
          tipo: 'REGISTRO_NUEVO_USUARIO',
          statusKey: statusKey,
          statusBadgeHtml: statusBadgeHtml,
          detalle: `Verificación OTP institucional (${v.estado || 'pendiente'})`
        });
      }
    });

    // 4.3. Agregar cuentas existentes en roles que fueron creadas directamente
    rawRoles.forEach(r => {
      const email = (r.email || r.id || '').trim().toLowerCase();
      if (!email) return;
      const alreadyHas = allEvents.some(e => e.email === email);
      if (!alreadyHas) {
        const isRevoked = r.eliminado === true || r.estado === 'revocado';
        const t = r.createdAt || Date.now();
        const fechaD = new Date(t);

        allEvents.push({
          id: r.id,
          timestamp: t,
          fechaStr: `${fechaD.toLocaleDateString('es-PE')} ${fechaD.toLocaleTimeString('es-PE')}`,
          email: email,
          nombre: r.nombre || '—',
          rol: r.role === 'admin' ? 'Administrador' : 'Especialista',
          modalidad: r.modalidad || 'EBR',
          reis: Array.isArray(r.reis) ? r.reis.join(', ') : (r.reis || 'TODAS'),
          tipo: 'ALTA_SISTEMA',
          statusKey: isRevoked ? 'revocado' : 'verificado',
          statusBadgeHtml: isRevoked
            ? '<span class="histBadge histBadgeRevocado">Revocado 🚫</span>'
            : '<span class="histBadge histBadgeVerificado">Activo ✓</span>',
          detalle: r.creadoPor ? `Creado por ${r.creadoPor}` : 'Cuenta base del sistema'
        });
      }
    });

    // Ordenar cronológicamente descendente (más recientes primero)
    allEvents.sort((a, b) => b.timestamp - a.timestamp);

    // Métricas del Historial
    const totalEvents = allEvents.length;
    const verifiedEvents = allEvents.filter(e => e.statusKey === 'verificado').length;
    const pendingEvents = allEvents.filter(e => e.statusKey === 'pendiente').length;
    const revokedEvents = allEvents.filter(e => e.statusKey === 'revocado').length;

    // Renderizar cuerpo del modal con datos cargados
    contentArea.style.padding = '18px 24px';
    contentArea.style.alignItems = 'stretch';
    contentArea.style.justifyContent = 'flex-start';

    contentArea.innerHTML = `
      <style>
        .histBadge {
          padding: 3px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .histBadgeVerificado { background: #DCFCE7; color: #15803D; border: 1px solid #BBF7D0; }
        .histBadgePendiente { background: #FEF3C7; color: #B45309; border: 1px solid #FDE68A; }
        .histBadgeRevocado { background: #FEE2E2; color: #B91C1C; border: 1px solid #FECACA; }
        .histBadgeAdmin { background: #E0E7FF; color: #4338CA; border: 1px solid #C7D2FE; }
        .histKpiGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        @media (max-width: 768px) {
          .histKpiGrid { grid-template-columns: repeat(2, 1fr); }
        }
        .histKpiCard {
          background: #F8FAFC;
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .histKpiNum {
          font-size: 20px;
          font-weight: 700;
          color: var(--navy-900);
          line-height: 1;
        }
        .histKpiLbl {
          font-size: 11px;
          color: var(--text-600);
          text-transform: uppercase;
          font-weight: 600;
          margin-top: 2px;
        }
        .histSearchInput {
          padding: 8px 12px 8px 32px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          flex: 1;
          min-width: 200px;
        }
        .histSelect {
          padding: 8px 12px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 13px;
          background: #FFFFFF;
          color: var(--navy-900);
        }
        .histTable th {
          position: sticky;
          top: 0;
          background: #F1F5F9;
          z-index: 2;
          font-size: 12px;
          font-weight: 700;
          color: var(--navy-900);
          border-bottom: 2px solid var(--border);
        }
        .histTable td {
          font-size: 12.5px;
          border-bottom: 1px solid #F1F5F9;
        }
      </style>

      <!-- Resumen KPI de la Bitácora -->
      <div class="histKpiGrid">
        <div class="histKpiCard">
          <span style="font-size:22px">📋</span>
          <div>
            <div class="histKpiNum">${totalEvents}</div>
            <div class="histKpiLbl">Total Registros</div>
          </div>
        </div>
        <div class="histKpiCard" style="border-left:3px solid #16A34A">
          <span style="font-size:22px">✅</span>
          <div>
            <div class="histKpiNum" style="color:#16A34A">${verifiedEvents}</div>
            <div class="histKpiLbl">Verificados / Activos</div>
          </div>
        </div>
        <div class="histKpiCard" style="border-left:3px solid #D97706">
          <span style="font-size:22px">⏳</span>
          <div>
            <div class="histKpiNum" style="color:#D97706">${pendingEvents}</div>
            <div class="histKpiLbl">Pendientes OTP</div>
          </div>
        </div>
        <div class="histKpiCard" style="border-left:3px solid #DC2626">
          <span style="font-size:22px">🚫</span>
          <div>
            <div class="histKpiNum" style="color:#DC2626">${revokedEvents}</div>
            <div class="histKpiLbl">Cuentas Revocadas</div>
          </div>
        </div>
      </div>

      <!-- Barra de Filtros y Búsqueda -->
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px">
        <div style="display:flex;align-items:center;gap:10px;flex:1;flex-wrap:wrap">
          <div style="position:relative;flex:1;min-width:240px">
            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--text-400)">🔍</span>
            <input type="text" id="histSearchInput" class="histSearchInput" placeholder="Buscar por correo, nombre o detalle..." />
          </div>
          <select id="histStatusFilter" class="histSelect">
            <option value="all">Todos los estados</option>
            <option value="verificado">Solo Verificados / Activos</option>
            <option value="pendiente">Solo Pendientes de OTP</option>
            <option value="revocado">Solo Cuentas Revocadas</option>
          </select>
        </div>
        <div>
          <button type="button" id="btnExportHistorialCsv" class="btn secondary" style="font-size:12.5px;padding:8px 14px;display:inline-flex;align-items:center;gap:6px">
            <span>⬇</span> <span>Exportar a CSV</span>
          </button>
        </div>
      </div>

      <!-- Tabla de Eventos con Scroll -->
      <div style="flex:1;overflow-y:auto;border:1px solid var(--border);border-radius:8px;max-height:48vh;background:#FFFFFF">
        <table class="histTable" style="width:100%;border-collapse:collapse;text-align:left">
          <thead>
            <tr>
              <th style="padding:10px 14px">Fecha / Hora</th>
              <th style="padding:10px 14px">Usuario / Correo</th>
              <th style="padding:10px 14px">Nombre / Especialista</th>
              <th style="padding:10px 14px">Rol / REI</th>
              <th style="padding:10px 14px;text-align:center">Estado</th>
              <th style="padding:10px 14px">Acción / Detalle</th>
            </tr>
          </thead>
          <tbody id="histTableBody">
            <!-- Filas inyectadas dinámicamente -->
          </tbody>
        </table>
      </div>
    `;

    const tableBody = contentArea.querySelector('#histTableBody');
    const searchHistInput = contentArea.querySelector('#histSearchInput');
    const filterHistSelect = contentArea.querySelector('#histStatusFilter');
    const btnExportCsv = contentArea.querySelector('#btnExportHistorialCsv');

    // Función para renderizar filas filtradas
    const renderFilteredHistory = () => {
      const q = (searchHistInput?.value || '').trim().toLowerCase();
      const statusF = filterHistSelect?.value || 'all';

      const filtered = allEvents.filter(ev => {
        const matchesQ = !q || ev.email.toLowerCase().includes(q) || ev.nombre.toLowerCase().includes(q) || ev.detalle.toLowerCase().includes(q);
        const matchesStatus = statusF === 'all' || ev.statusKey === statusF;
        return matchesQ && matchesStatus;
      });

      footerCounter.textContent = `Mostrando ${filtered.length} de ${allEvents.length} registros auditados.`;

      if (filtered.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center;padding:32px 14px;color:var(--text-600)">
              <div style="font-size:22px;margin-bottom:6px">🔍</div>
              No se encontraron registros que coincidan con los filtros aplicados.
            </td>
          </tr>
        `;
        return;
      }

      tableBody.innerHTML = filtered.map(ev => `
        <tr style="transition:background 0.15s" onmouseover="this.style.background='#F8FAFC'" onmouseout="this.style.background='transparent'">
          <td style="padding:10px 14px;white-space:nowrap;color:var(--navy-900);font-weight:600;font-size:12px">
            ${esc(ev.fechaStr)}
          </td>
          <td style="padding:10px 14px;font-weight:600;color:var(--navy-900)">
            ${esc(ev.email)}
          </td>
          <td style="padding:10px 14px;color:var(--text-600)">
            ${esc(ev.nombre)}
          </td>
          <td style="padding:10px 14px;font-size:12px;color:var(--text-600)">
            <strong>${esc(ev.rol)}</strong>
            <div style="font-size:11px;color:var(--text-400)">Mod: ${esc(ev.modalidad)} • REI: ${esc(ev.reis)}</div>
          </td>
          <td style="padding:10px 14px;text-align:center">
            ${ev.statusBadgeHtml}
          </td>
          <td style="padding:10px 14px;color:var(--text-600);font-size:12px">
            ${esc(ev.detalle)}
          </td>
        </tr>
      `).join('');
    };

    // Listeners de búsqueda y filtrado
    searchHistInput.addEventListener('input', renderFilteredHistory);
    filterHistSelect.addEventListener('change', renderFilteredHistory);

    // Exportación a CSV
    btnExportCsv.addEventListener('click', () => {
      const q = (searchHistInput?.value || '').trim().toLowerCase();
      const statusF = filterHistSelect?.value || 'all';

      const dataToExport = allEvents.filter(ev => {
        const matchesQ = !q || ev.email.toLowerCase().includes(q) || ev.nombre.toLowerCase().includes(q) || ev.detalle.toLowerCase().includes(q);
        const matchesStatus = statusF === 'all' || ev.statusKey === statusF;
        return matchesQ && matchesStatus;
      });

      if (!dataToExport.length) {
        showToast('No hay registros para exportar con los filtros actuales.');
        return;
      }

      const headers = ['Fecha y Hora', 'Correo Institucional', 'Nombre', 'Rol', 'Modalidad', 'REIs', 'Estado', 'Detalle'];
      const csvRows = [headers.join(';')];

      dataToExport.forEach(row => {
        const line = [
          `"${row.fechaStr}"`,
          `"${row.email.replace(/"/g, '""')}"`,
          `"${row.nombre.replace(/"/g, '""')}"`,
          `"${row.rol.replace(/"/g, '""')}"`,
          `"${row.modalidad.replace(/"/g, '""')}"`,
          `"${row.reis.replace(/"/g, '""')}"`,
          `"${row.statusKey.toUpperCase()}"`,
          `"${row.detalle.replace(/"/g, '""')}"`
        ];
        csvRows.push(line.join(';'));
      });

      // Añadir BOM (\uFEFF) para garantizar compatibilidad con acentos y tildes en Microsoft Excel
      const csvContent = '\uFEFF' + csvRows.join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `UGEL03_Historial_Usuarios_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Exportados ${dataToExport.length} registros a formato CSV.`);
    });

    // Renderizar inicialmente
    renderFilteredHistory();

  } catch (err) {
    console.error('Error al cargar historial de usuarios:', err);
    contentArea.innerHTML = `
      <div style="text-align:center;padding:36px 20px;color:var(--danger)">
        <div style="font-size:32px;margin-bottom:8px">⚠️</div>
        <strong>No se pudo cargar la bitácora de usuarios.</strong>
        <p style="font-size:12.5px;color:var(--text-600);margin:8px 0 0">${esc(err.message || 'Error de conexión con la base de datos')}</p>
      </div>
    `;
    footerCounter.textContent = 'Error al consultar Firestore.';
  }
}

/**
 * Diálogo Modal para Crear Nuevo Usuario en Firebase Auth + Firestore
 */
/**
 * Modal para modificar la jurisdicción (REIs y Modalidades) de un especialista desde la interfaz
 */
export function openEditUserJurisdictionModal(userDoc, dbNs, currentUser, onComplete) {
  const existingModal = document.getElementById('editJurisdictionModalOverlay');
  if (existingModal) existingModal.remove();

  lockBodyScroll();

  const rawMods = userDoc.modalidades || userDoc.modalidad || 'EBR';
  const userMods = Array.isArray(rawMods) ? rawMods : String(rawMods).split(/[,\s/]+/).map(s => s.trim().toUpperCase());
  
  const rawReis = userDoc.reis || ['01'];
  const userReis = Array.isArray(rawReis) ? rawReis.map(normalizeReiNumber) : String(rawReis).split(/[,\s/]+/).map(normalizeReiNumber);
  const isTodas = Array.isArray(rawReis) ? rawReis.includes('TODAS') : String(rawReis).toUpperCase().includes('TODAS');

  const overlay = document.createElement('div');
  overlay.className = 'downloadModalOverlay';
  overlay.id = 'editJurisdictionModalOverlay';

  const reisNumbers = Array.from({ length: 16 }, (_, i) => String(i + 1).padStart(2, '0'));

  overlay.innerHTML = `
    <div class="downloadModalContent" style="max-width:540px;border-radius:14px;box-shadow:0 20px 40px rgba(11,27,54,0.3)">
      <div class="downloadModalHeader" style="background:var(--navy-900);color:#FFFFFF;border-top-left-radius:14px;border-top-right-radius:14px;padding:16px 20px">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">📍</span>
          <div>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#FFFFFF">Modificar Jurisdicción de Especialista</h3>
            <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.75)">
              Asignación de REDes y Modalidades para <strong>${esc(userDoc.email || userDoc.id)}</strong>
            </p>
          </div>
        </div>
        <button type="button" class="closeDownloadModal" id="btnCloseModalJurisdiction" style="color:#FFFFFF;opacity:0.8" title="Cerrar">✕</button>
      </div>

      <div class="downloadModalBody" style="padding:20px;max-height:75vh;overflow-y:auto">
        <form id="editJurisdictionForm" style="display:flex;flex-direction:column;gap:18px" onsubmit="return false;">
          
          <!-- Modalidad(es) -->
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <label style="font-size:13px;font-weight:700;color:var(--navy-900)">
                Modalidad(es) a su cargo <span style="color:var(--danger)">*</span>
              </label>
              <small style="color:var(--text-400);font-size:11px">Puede abarcar más de una (ej. EBR + EBE)</small>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px">
              <label style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;cursor:pointer">
                <input type="checkbox" name="editMod" value="EBR" ${userMods.includes('EBR') ? 'checked' : ''} style="accent-color:var(--primary);cursor:pointer">
                <span style="font-size:12.5px;font-weight:600;color:var(--navy-900)">EBR</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;cursor:pointer">
                <input type="checkbox" name="editMod" value="EBE" ${userMods.includes('EBE') ? 'checked' : ''} style="accent-color:var(--primary);cursor:pointer">
                <span style="font-size:12.5px;font-weight:600;color:var(--navy-900)">EBE</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;padding:8px 10px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px;cursor:pointer">
                <input type="checkbox" name="editMod" value="JEC" ${userMods.includes('JEC') ? 'checked' : ''} style="accent-color:var(--primary);cursor:pointer">
                <span style="font-size:12.5px;font-weight:600;color:var(--navy-900)">JEC</span>
              </label>
            </div>
          </div>

          <!-- REDes Educativas (REI) -->
          <div style="display:flex;flex-direction:column;gap:8px">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
              <label style="font-size:13px;font-weight:700;color:var(--navy-900)">
                RED(es) Educativas asignadas <span style="color:var(--danger)">*</span>
              </label>
              <div style="display:flex;gap:6px">
                <button type="button" id="btnEditSelectAllReis" class="btn secondary" style="padding:2px 8px;font-size:11px">Todas</button>
                <button type="button" id="btnEditClearAllReis" class="btn secondary" style="padding:2px 8px;font-size:11px">Limpiar</button>
              </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:8px;max-height:180px;overflow-y:auto;padding:6px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px" id="editReisGrid">
              ${reisNumbers.map(n => {
                const checked = isTodas || userReis.includes(n);
                return `
                  <label style="display:flex;align-items:center;gap:5px;padding:6px 8px;background:#FFFFFF;border:1px solid var(--border);border-radius:6px;cursor:pointer">
                    <input type="checkbox" name="editRei" value="${n}" ${checked ? 'checked' : ''} style="accent-color:var(--primary);cursor:pointer">
                    <span style="font-size:12px;font-weight:600;color:var(--navy-900)">REI ${n}</span>
                  </label>
                `;
              }).join('')}
            </div>
            <small style="color:var(--text-600);font-size:11.5px">
              El especialista visualizará exclusivamente los colegios y fichas pertenecientes a las REIs marcadas.
            </small>
          </div>

          <!-- Permiso de Concursos -->
          <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px">
            <input type="checkbox" id="editConcursosAccess" ${userDoc.accesoConcursos ? 'checked' : ''} style="cursor:pointer;accent-color:var(--ok)">
            <label for="editConcursosAccess" style="font-size:12.5px;font-weight:600;color:var(--navy-900);cursor:pointer">
              Habilitar acceso directo al Módulo de Concursos Escolares
            </label>
          </div>

          <div id="editJurisdictionErrorAlert" style="display:none;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:8px;padding:10px 14px;font-size:12.5px;color:#991B1B"></div>
        </form>
      </div>

      <div class="downloadModalFooter" style="padding:14px 20px;border-top:1px solid var(--border);display:flex;justify-content:flex-end;gap:10px">
        <button type="button" class="btn secondary" id="btnCancelEditJurisdiction">Cancelar</button>
        <button type="button" class="btn" id="btnSaveJurisdiction" style="background:var(--blue-600);border-color:var(--blue-600)">
          <span>💾</span>
          <span>Guardar Cambios</span>
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  const closeModal = () => {
    overlay.remove();
    unlockBodyScroll();
  };

  overlay.querySelector('#btnCloseModalJurisdiction').addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelEditJurisdiction').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const reiCheckboxes = Array.from(overlay.querySelectorAll('input[name="editRei"]'));
  overlay.querySelector('#btnEditSelectAllReis').addEventListener('click', () => {
    reiCheckboxes.forEach(cb => cb.checked = true);
  });
  overlay.querySelector('#btnEditClearAllReis').addEventListener('click', () => {
    reiCheckboxes.forEach(cb => cb.checked = false);
  });

  const errorAlert = overlay.querySelector('#editJurisdictionErrorAlert');
  const saveBtn = overlay.querySelector('#btnSaveJurisdiction');

  saveBtn.addEventListener('click', async () => {
    errorAlert.style.display = 'none';
    errorAlert.textContent = '';

    const selectedMods = Array.from(overlay.querySelectorAll('input[name="editMod"]:checked')).map(cb => cb.value);
    const selectedReis = reiCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    const hasConcursos = overlay.querySelector('#editConcursosAccess')?.checked || false;

    if (selectedMods.length === 0) {
      errorAlert.textContent = 'Debes seleccionar al menos una modalidad a cargo del especialista.';
      errorAlert.style.display = 'block';
      return;
    }

    if (selectedReis.length === 0) {
      errorAlert.textContent = 'Debes seleccionar al menos una REI a cargo del especialista.';
      errorAlert.style.display = 'block';
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<span>⏳</span> Guardando en Firestore...';

      const modalidadStr = selectedMods.join(', ');
      const reisToSave = (selectedReis.length === 16) ? ['TODAS'] : selectedReis;

      await dbNs.collection('roles').doc(userDoc.id).set({
        modalidad: modalidadStr,
        modalidades: selectedMods,
        reis: reisToSave,
        accesoConcursos: hasConcursos,
        actualizadoPor: currentUser?.email || 'admin',
        actualizadoEn: Date.now()
      }, { merge: true });

      // Registrar auditoría en logActividades
      try {
        await dbNs.collection('logActividades').add({
          tipo: 'MODIFICACION_JURISDICCION_ESPECIALISTA',
          usuarioUid: userDoc.id,
          usuarioEmail: userDoc.email || userDoc.id,
          modalidad: modalidadStr,
          modalidades: selectedMods,
          reis: reisToSave,
          modificadoPor: currentUser?.email || 'admin',
          timestamp: Date.now(),
          fecha: new Date().toISOString(),
          detalle: `Se modificó la jurisdicción de ${userDoc.email || userDoc.id}: Modalidad(es) [${modalidadStr}], REI(s) [${reisToSave.join(', ')}] por ${currentUser?.email || 'admin'}`
        });
      } catch (_) {}

      if (typeof window !== 'undefined' && window.state && window.state.currentUserRoleDoc && window.state.currentUserRoleDoc.id === userDoc.id) {
        window.state.currentUserRoleDoc.modalidad = modalidadStr;
        window.state.currentUserRoleDoc.modalidades = selectedMods;
        window.state.currentUserRoleDoc.reis = reisToSave;
        window.state.currentUserRoleDoc.accesoConcursos = hasConcursos;
        try {
          sessionStorage.setItem('agebre_user_doc_' + userDoc.id, JSON.stringify(window.state.currentUserRoleDoc));
        } catch (_) {}
      }

      showToast(`Jurisdicción de ${userDoc.email || 'usuario'} actualizada con éxito.`);
      closeModal();
      if (typeof onComplete === 'function') onComplete();
    } catch (err) {
      console.error('Error al guardar jurisdicción:', err);
      errorAlert.textContent = 'Ocurrió un error al guardar en Firestore: ' + (err.message || err);
      errorAlert.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.innerHTML = '<span>💾</span> <span>Guardar Cambios</span>';
    }
  });
}


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

                    <!-- Jurisdicción condicional para Especialista -->
          <div id="newAccJurisdiccionWrap" style="display:flex;flex-direction:column;gap:12px;background:#F8FAFC;padding:12px;border:1px solid var(--border);border-radius:8px">
            <div style="display:flex;flex-direction:column;gap:6px">
              <label style="font-size:12.5px;font-weight:700;color:var(--navy-900)">
                Modalidad(es) a su cargo <span style="color:var(--danger)">*</span>
              </label>
              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:6px">
                <label style="display:flex;align-items:center;gap:5px;padding:6px 8px;background:#FFFFFF;border:1px solid var(--border);border-radius:6px;cursor:pointer">
                  <input type="checkbox" name="newAccMod" value="EBR" checked style="accent-color:var(--primary);cursor:pointer">
                  <span style="font-size:12px;font-weight:600">EBR</span>
                </label>
                <label style="display:flex;align-items:center;gap:5px;padding:6px 8px;background:#FFFFFF;border:1px solid var(--border);border-radius:6px;cursor:pointer">
                  <input type="checkbox" name="newAccMod" value="EBE" style="accent-color:var(--primary);cursor:pointer">
                  <span style="font-size:12px;font-weight:600">EBE</span>
                </label>
                <label style="display:flex;align-items:center;gap:5px;padding:6px 8px;background:#FFFFFF;border:1px solid var(--border);border-radius:6px;cursor:pointer">
                  <input type="checkbox" name="newAccMod" value="JEC" style="accent-color:var(--primary);cursor:pointer">
                  <span style="font-size:12px;font-weight:600">JEC</span>
                </label>
              </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:6px">
              <div style="display:flex;justify-content:space-between;align-items:center">
                <label style="font-size:12.5px;font-weight:700;color:var(--navy-900)">
                  RED(es) Educativas asignadas <span style="color:var(--danger)">*</span>
                </label>
                <div style="display:flex;gap:4px">
                  <button type="button" id="btnNewAccAllReis" class="btn secondary" style="padding:1px 6px;font-size:10.5px">Todas</button>
                  <button type="button" id="btnNewAccClearReis" class="btn secondary" style="padding:1px 6px;font-size:10.5px">Limpiar</button>
                </div>
              </div>
              <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;max-height:120px;overflow-y:auto;padding:4px;background:#FFFFFF;border:1px solid var(--border);border-radius:6px" id="newAccReisGrid">
                ${Array.from({length: 16}, (_, i) => String(i + 1).padStart(2, '0')).map(n => `
                  <label style="display:flex;align-items:center;gap:4px;padding:4px 6px;background:#F8FAFC;border:1px solid var(--border);border-radius:4px;cursor:pointer">
                    <input type="checkbox" name="newAccRei" value="${n}" ${n === '01' ? 'checked' : ''} style="accent-color:var(--primary);cursor:pointer">
                    <span style="font-size:11px;font-weight:600">REI ${n}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Permiso de Concursos -->


          <div style="display:flex;align-items:center;gap:8px;padding:10px 12px;background:#F8FAFC;border:1px solid var(--border);border-radius:8px">
            <input type="checkbox" id="newAccConcursos" style="cursor:pointer;accent-color:var(--ok)">
            <label for="newAccConcursos" style="font-size:12.5px;font-weight:600;color:var(--navy-900);cursor:pointer">
              Habilitar acceso directo al Módulo de Concursos Escolares
            </label>
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

  overlay.querySelector('#btnCloseModalCreateUser').addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelCreateUser').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const passInput = overlay.querySelector('#newAccPass');
  overlay.querySelector('#btnRegenPass').addEventListener('click', () => {
    passInput.value = generateSecurePassword();
  });

  const submitBtn = overlay.querySelector('#btnSubmitCreateUser');
  const errorAlert = overlay.querySelector('#createUserErrorAlert');
  const emailInput = overlay.querySelector('#newAccEmail');
  const roleSelect = overlay.querySelector('#newAccRole');
  const jurisdiccionWrap = overlay.querySelector('#newAccJurisdiccionWrap');
  const newReiCbs = Array.from(overlay.querySelectorAll('input[name="newAccRei"]'));

  overlay.querySelector('#btnNewAccAllReis')?.addEventListener('click', () => {
    newReiCbs.forEach(cb => cb.checked = true);
  });
  overlay.querySelector('#btnNewAccClearReis')?.addEventListener('click', () => {
    newReiCbs.forEach(cb => cb.checked = false);
  });

  roleSelect?.addEventListener('change', () => {
    if (jurisdiccionWrap) {
      jurisdiccionWrap.style.display = (roleSelect.value === 'admin') ? 'none' : 'flex';
    }
  });

  const executeCreate = async () => {
    const email = (emailInput.value || '').trim().toLowerCase();
    const password = passInput.value;
    const role = roleSelect.value;

    errorAlert.style.display = 'none';
    errorAlert.textContent = '';

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

    const selectedMods = (role === 'admin')
      ? ['TODAS']
      : Array.from(overlay.querySelectorAll('input[name="newAccMod"]:checked')).map(cb => cb.value);
    const selectedReis = (role === 'admin')
      ? ['TODAS']
      : newReiCbs.filter(cb => cb.checked).map(cb => cb.value);

    if (role !== 'admin') {
      if (selectedMods.length === 0) {
        errorAlert.textContent = 'Debes seleccionar al menos una modalidad a su cargo (ej. EBR, EBE o JEC).';
        errorAlert.style.display = 'block';
        return;
      }
      if (selectedReis.length === 0) {
        errorAlert.textContent = 'Debes seleccionar al menos una RED Educativa a su cargo (o marcar Todas).';
        errorAlert.style.display = 'block';
        return;
      }
    }

    const modalidadStr = (role === 'admin') ? 'TODAS' : selectedMods.join(', ');
    const reisToSave = (role === 'admin' || selectedReis.length === 16) ? ['TODAS'] : selectedReis;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span>⏳</span> Creando cuenta en Firebase...';

    const tempAppName = `create-user-${Date.now()}`;
    let tempApp = null;

    try {
      // 1. App secundaria para no cerrar la sesión del admin actual
      tempApp = initializeApp(FIREBASE_CONFIG, tempAppName);
      const tempAuth = getAuth(tempApp);

      // 2. Crear usuario en Firebase Auth
      const userCred = await createUserWithEmailAndPassword(tempAuth, email, password);
      const newUid = userCred.user.uid;

      // 3. Cerrar sesión en app secundaria
      try { await signOut(tempAuth); } catch (_) {}
      try { await deleteApp(tempApp); } catch (_) {}
      tempApp = null;

      // 4. Guardar rol en la colección 'roles' con Modalidad y REIs asignadas
      const hasConcursos = Boolean(document.getElementById('newAccConcursos')?.checked || role === 'admin');

      await dbNs.collection('roles').doc(newUid).set({
        email: email,
        role: role,
        accesoConcursos: hasConcursos,
        userType: role === 'admin' ? 'coordinador' : 'especialista',
        modalidad: modalidadStr,
        modalidades: (role === 'admin') ? ['TODAS'] : selectedMods,
        reis: reisToSave,
        estado: 'activo',
        estadoVerificacion: 'verificado',
        createdAt: Date.now(),
        creadoPor: currentUser?.email || 'admin'
      });

      // 5. Registrar en logActividades para el Historial
      try {
        await dbNs.collection('logActividades').add({
          tipo: 'CREACION_USUARIO_ADMIN',
          usuarioUid: newUid,
          usuarioEmail: email,
          usuarioNombre: email.split('@')[0],
          rolSolicitado: role === 'admin' ? 'coordinador' : 'especialista',
          modalidad: modalidadStr,
          modalidades: (role === 'admin') ? ['TODAS'] : selectedMods,
          reis: reisToSave,
          creadoPor: currentUser?.email || 'admin',
          timestamp: Date.now(),
          fecha: new Date().toISOString(),
          detalle: `Usuario creado y autorizado directamente por el administrador (${currentUser?.email || 'admin'}) con rol ${role}. Modalidad(es): [${modalidadStr}], REI(s): [${reisToSave.join(', ')}]`
        });
      } catch (logErr) {
        console.warn('Aviso al registrar log de creación:', logErr);
      }

      // 6. Vista de éxito
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
