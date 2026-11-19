/* =========================================================================
   ui/perfil-modal.js — Modales de gestión de perfil, contraseña y restablecimiento
   UGEL 03 – AGEBRE – Sistema de Monitoreo 2026
   ========================================================================= */

import { esc, showToast, lockBodyScroll, unlockBodyScroll } from './core-utils.js';
import { getAuth, updatePassword, updateProfile } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { sendSecurityNotificationEmail } from '../core/email-service.js?v=20261119_v10';
import { adminDirectResetPassword } from '../core/firebase/admin-service.js?v=20261119_v8';

/**
 * Modal para que cualquier especialista (o usuario conectado) actualice sus datos personales
 * @param {Object} state - Estado global de la aplicación
 * @param {Object} dbNs - Adaptador de base de datos Firestore
 * @param {Object} currentUser - Usuario autenticado en Firebase
 * @param {Function} [onUpdate] - Callback al guardar
 */
export function openUserProfileModal(state, dbNs, currentUser, onUpdate) {
  const existing = document.getElementById('userProfileModalOverlay');
  if (existing) existing.remove();

  const uid = currentUser?.uid;
  if (!uid) {
    showToast('No hay una sesión activa de usuario.');
    return;
  }

  const uDoc = state?.currentUserRoleDoc ||
    (typeof window !== 'undefined' && window.state?.currentUserRoleDoc) ||
    (() => {
      try {
        const raw = sessionStorage.getItem('agebre_user_doc_' + uid);
        if (raw) return JSON.parse(raw);
      } catch (_) {}
      return null;
    })() || {};

  const currentEmail = currentUser.email || uDoc.email || '';
  const currentNombre = uDoc.nombre || currentUser.displayName || '';
  const currentCelular = uDoc.celular || uDoc.telefono || '';
  const currentCargo = uDoc.cargo || (uDoc.role === 'admin' ? 'Administrador / Coordinador' : 'Especialista');

  const overlay = document.createElement('div');
  overlay.id = 'userProfileModalOverlay';
  overlay.className = 'downloadModalOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,27,54,0.65);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

  overlay.innerHTML = `
    <div style="background:#FFFFFF;border-radius:12px;max-width:480px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);overflow:hidden;animation:fadeInModal 0.2s ease-out;display:flex;flex-direction:column;">
      <div style="background:#12294D;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">👤</span>
          <div>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#FFFFFF">Actualizar Mis Datos</h3>
            <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.75)">
              Información personal y de contacto del especialista
            </p>
          </div>
        </div>
        <button type="button" id="btnCloseProfileModal" style="background:none;border:none;color:#FFFFFF;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;opacity:0.8;">✕</button>
      </div>

      <form id="formUserProfile" style="padding:22px;display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;flex-direction:column;gap:5px;">
          <label style="font-size:12px;font-weight:700;color:var(--text-600);text-transform:uppercase;">Correo Institucional</label>
          <input type="text" value="${esc(currentEmail)}" disabled style="padding:10px 12px;border:1px solid #E2E8F0;border-radius:6px;background:#F8FAFC;color:#64748B;font-size:13.5px;cursor:not-allowed;">
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;">
          <label for="profNombre" style="font-size:12.5px;font-weight:700;color:var(--navy-900);">Nombres y Apellidos <span style="color:#DC2626">*</span></label>
          <input type="text" id="profNombre" required value="${esc(currentNombre)}" placeholder="Ej. Ana María Pérez Soto" style="padding:10px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:13.5px;">
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;">
          <label for="profCelular" style="font-size:12.5px;font-weight:700;color:var(--navy-900);">Número de Celular / Teléfono</label>
          <input type="tel" id="profCelular" value="${esc(currentCelular)}" placeholder="Ej. 987654321" style="padding:10px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:13.5px;">
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;">
          <label for="profCargo" style="font-size:12.5px;font-weight:700;color:var(--navy-900);">Cargo / Área</label>
          <input type="text" id="profCargo" value="${esc(currentCargo)}" placeholder="Ej. Especialista Pedagógico EBR" style="padding:10px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:13.5px;">
        </div>

        <div id="profErrorAlert" style="display:none;background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C;padding:10px 12px;border-radius:6px;font-size:12.5px;"></div>

        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:14px;border-top:1px solid #F1F5F9;">
          <button type="button" id="btnCancelProfile" class="btn secondary" style="padding:9px 18px;">Cancelar</button>
          <button type="submit" id="btnSaveProfile" class="btn primary" style="padding:9px 20px;font-weight:700;">💾 Guardar Cambios</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  lockBodyScroll();

  const closeModal = () => {
    overlay.remove();
    unlockBodyScroll();
  };

  overlay.querySelector('#btnCloseProfileModal')?.addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelProfile')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const form = overlay.querySelector('#formUserProfile');
  const errorAlert = overlay.querySelector('#profErrorAlert');
  const saveBtn = overlay.querySelector('#btnSaveProfile');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.style.display = 'none';

    const nuevoNombre = overlay.querySelector('#profNombre').value.trim();
    const nuevoCelular = overlay.querySelector('#profCelular').value.trim();
    const nuevoCargo = overlay.querySelector('#profCargo').value.trim();

    if (!nuevoNombre) {
      errorAlert.textContent = 'Por favor ingresa tus nombres y apellidos.';
      errorAlert.style.display = 'block';
      return;
    }

    try {
      saveBtn.disabled = true;
      saveBtn.textContent = 'Guardando...';

      // 1. Guardar en Firestore roles/{uid}
      if (dbNs && uid) {
        await dbNs.collection('roles').doc(uid).set({
          nombre: nuevoNombre,
          celular: nuevoCelular,
          telefono: nuevoCelular,
          cargo: nuevoCargo,
          actualizadoEn: Date.now()
        }, { merge: true });

        // Sincronizar en directorio de responsables si existe
        if (state?.responsables && Array.isArray(state.responsables)) {
          const respMatch = state.responsables.find(r => 
            (r.correo && r.correo.toLowerCase() === currentEmail.toLowerCase()) ||
            (r.nombresApellidos && r.nombresApellidos.toLowerCase() === currentNombre.toLowerCase())
          );
          if (respMatch && respMatch.id) {
            await dbNs.collection('responsables').doc(respMatch.id).set({
              nombresApellidos: nuevoNombre,
              celular: nuevoCelular,
              cargo: nuevoCargo,
              actualizadoEn: Date.now()
            }, { merge: true }).catch(() => {});
            respMatch.nombresApellidos = nuevoNombre;
            respMatch.celular = nuevoCelular;
            respMatch.cargo = nuevoCargo;
          }
        }
      }

      // 2. Actualizar displayName en Firebase Auth
      try {
        if (currentUser) {
          await updateProfile(currentUser, { displayName: nuevoNombre });
        }
      } catch (_) {}

      // 3. Actualizar memoria y sesión local
      if (state?.currentUserRoleDoc) {
        state.currentUserRoleDoc.nombre = nuevoNombre;
        state.currentUserRoleDoc.celular = nuevoCelular;
        state.currentUserRoleDoc.cargo = nuevoCargo;
      }
      try {
        const stored = sessionStorage.getItem('agebre_user_doc_' + uid);
        if (stored) {
          const parsed = JSON.parse(stored);
          parsed.nombre = nuevoNombre;
          parsed.celular = nuevoCelular;
          parsed.cargo = nuevoCargo;
          sessionStorage.setItem('agebre_user_doc_' + uid, JSON.stringify(parsed));
        }
      } catch (_) {}

      // 4. Actualizar visualización en barra superior
      const elName = document.getElementById('topUserName');
      if (elName) elName.textContent = nuevoNombre || currentEmail;

      showToast('Tus datos han sido actualizados con éxito.');
      closeModal();
      if (typeof onUpdate === 'function') onUpdate();
    } catch (err) {
      console.error('Error al actualizar datos de perfil:', err);
      errorAlert.textContent = 'Ocurrió un error al guardar: ' + (err.message || err);
      errorAlert.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Guardar Cambios';
    }
  });
}

/**
 * Modal para que cualquier especialista cambie su propia contraseña
 * @param {Object} currentUser - Usuario autenticado en Firebase
 * @param {Object} dbNs - Adaptador Firestore
 */
export function openChangePasswordModal(currentUser, dbNs = null) {
  const existing = document.getElementById('changePasswordModalOverlay');
  if (existing) existing.remove();

  if (!currentUser) {
    showToast('No hay una sesión activa de usuario.');
    return;
  }

  const userEmail = currentUser.email || '';

  const overlay = document.createElement('div');
  overlay.id = 'changePasswordModalOverlay';
  overlay.className = 'downloadModalOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,27,54,0.65);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

  overlay.innerHTML = `
    <div style="background:#FFFFFF;border-radius:12px;max-width:440px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);overflow:hidden;animation:fadeInModal 0.2s ease-out;display:flex;flex-direction:column;">
      <div style="background:#12294D;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">🔑</span>
          <div>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#FFFFFF">Cambiar Mi Contraseña</h3>
            <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.75)">
              Cuenta: <strong>${esc(userEmail)}</strong>
            </p>
          </div>
        </div>
        <button type="button" id="btnCloseChangePassModal" style="background:none;border:none;color:#FFFFFF;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;opacity:0.8;">✕</button>
      </div>

      <form id="formChangePassword" style="padding:22px;display:flex;flex-direction:column;gap:16px;">
        <div style="display:flex;flex-direction:column;gap:5px;">
          <label for="newPassInput" style="font-size:12.5px;font-weight:700;color:var(--navy-900);">Nueva Contraseña <span style="color:#DC2626">*</span></label>
          <div style="position:relative;display:flex;align-items:center;">
            <input type="password" id="newPassInput" required minlength="6" placeholder="Mínimo 6 caracteres" style="width:100%;padding:10px 42px 10px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:13.5px;box-sizing:border-box;">
            <button type="button" class="btnTogglePassEye" data-target="newPassInput" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:#64748B;padding:4px;">👁️</button>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:5px;">
          <label for="confirmPassInput" style="font-size:12.5px;font-weight:700;color:var(--navy-900);">Confirmar Nueva Contraseña <span style="color:#DC2626">*</span></label>
          <div style="position:relative;display:flex;align-items:center;">
            <input type="password" id="confirmPassInput" required minlength="6" placeholder="Vuelve a escribir la contraseña" style="width:100%;padding:10px 42px 10px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:13.5px;box-sizing:border-box;">
            <button type="button" class="btnTogglePassEye" data-target="confirmPassInput" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:#64748B;padding:4px;">👁️</button>
          </div>
        </div>

        <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #16A34A;padding:10px 12px;border-radius:4px;font-size:12px;color:#166534;line-height:1.4;">
          🔒 Una vez cambiada tu contraseña, recibirás una confirmación en tu correo institucional.
        </div>

        <div id="changePassErrorAlert" style="display:none;background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C;padding:10px 12px;border-radius:6px;font-size:12.5px;"></div>

        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:14px;border-top:1px solid #F1F5F9;">
          <button type="button" id="btnCancelChangePass" class="btn secondary" style="padding:9px 18px;">Cancelar</button>
          <button type="submit" id="btnSubmitChangePass" class="btn primary" style="padding:9px 20px;font-weight:700;">🔑 Actualizar Contraseña</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(overlay);
  lockBodyScroll();

  const closeModal = () => {
    overlay.remove();
    unlockBodyScroll();
  };

  overlay.querySelector('#btnCloseChangePassModal')?.addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelChangePass')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Toggle visibilidad de contraseñas
  overlay.querySelectorAll('.btnTogglePassEye').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const inp = overlay.querySelector('#' + targetId);
      if (inp) {
        if (inp.type === 'password') {
          inp.type = 'text';
          btn.textContent = '🙈';
        } else {
          inp.type = 'password';
          btn.textContent = '👁️';
        }
      }
    });
  });

  const form = overlay.querySelector('#formChangePassword');
  const errorAlert = overlay.querySelector('#changePassErrorAlert');
  const submitBtn = overlay.querySelector('#btnSubmitChangePass');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorAlert.style.display = 'none';

    const newPass = overlay.querySelector('#newPassInput').value;
    const confirmPass = overlay.querySelector('#confirmPassInput').value;

    if (!newPass || newPass.length < 6) {
      errorAlert.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      errorAlert.style.display = 'block';
      return;
    }

    if (newPass !== confirmPass) {
      errorAlert.textContent = 'Las contraseñas no coinciden. Por favor verifícalas.';
      errorAlert.style.display = 'block';
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Actualizando contraseña...';

      // 1. Actualizar contraseña directamente en Firebase Auth
      await updatePassword(currentUser, newPass);

      // 2. Despachar notificación al correo institucional vía Webhook
      try {
        await sendSecurityNotificationEmail({
          to: userEmail,
          nombre: currentUser.displayName || 'Especialista',
          subject: 'Seguridad UGEL 03: Tu contraseña ha sido actualizada',
          title: 'Contraseña Actualizada Correctamente',
          message: `Te informamos que tu contraseña de acceso a la plataforma de Sistematización de Monitoreo AGEBRE 2026 ha sido modificada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.`,
          actionUrl: window.location.origin,
          actionText: 'Ingresar al Sistema'
        });
      } catch (_) {}

      // 3. Registrar auditoría en Firestore
      if (dbNs) {
        try {
          await dbNs.collection('logActividades').add({
            tipo: 'CAMBIO_CONTRASENA_PROPIA',
            usuarioUid: currentUser.uid,
            usuarioEmail: userEmail,
            timestamp: Date.now(),
            fecha: new Date().toISOString(),
            detalle: `El usuario ${userEmail} actualizó su propia contraseña de acceso con éxito.`
          });
        } catch (_) {}
      }

      showToast('Tu contraseña ha sido actualizada correctamente.');
      closeModal();
    } catch (err) {
      console.error('Error al cambiar contraseña:', err);
      let msg = 'No se pudo actualizar la contraseña: ' + (err.message || err);
      if (err.code === 'auth/requires-recent-login') {
        msg = 'Por seguridad, debes haber iniciado sesión recientemente para cambiar tu contraseña. Por favor cierra sesión y vuelve a ingresar.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'La contraseña es muy débil. Debe tener al menos 6 caracteres con letras y números.';
      }
      errorAlert.textContent = msg;
      errorAlert.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = '🔑 Actualizar Contraseña';
    }
  });
}

function generateSafePassword() {
  const chars = '23456789abcdefhkmnprstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  let extra = '';
  for (let i = 0; i < 4; i++) {
    extra += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'Ugel2026!' + extra;
}

/**
 * Modal para que el Administrador restablezca la clave de un especialista
 * directamente desde el sistema, actualizando Firebase Authentication de inmediato
 * y despachando UNA SOLA notificación oficial por correo con su nueva contraseña.
 *
 * @param {Object} userDoc - Documento del usuario seleccionado en roles
 * @param {Object} dbNs - Adaptador Firestore
 * @param {Object} currentUser - Administrador conectado
 * @param {Function} [onComplete] - Callback al finalizar
 */
export function openAdminResetPasswordModal(userDoc, dbNs, currentUser, onComplete) {
  const existing = document.getElementById('adminResetPasswordModalOverlay');
  if (existing) existing.remove();

  const targetEmail = (userDoc?.email || '').trim().toLowerCase();
  const targetName = userDoc?.nombre || targetEmail.split('@')[0] || 'Especialista';

  if (!targetEmail || !targetEmail.includes('@')) {
    showToast('Esta cuenta no cuenta con un correo electrónico válido registrado.');
    return;
  }

  const initialPass = generateSafePassword();

  const overlay = document.createElement('div');
  overlay.id = 'adminResetPasswordModalOverlay';
  overlay.className = 'downloadModalOverlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,27,54,0.65);backdrop-filter:blur(3px);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;';

  overlay.innerHTML = `
    <div style="background:#FFFFFF;border-radius:12px;max-width:480px;width:100%;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);overflow:hidden;animation:fadeInModal 0.2s ease-out;display:flex;flex-direction:column;">
      <div style="background:#12294D;padding:18px 22px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);">
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:22px">🔑</span>
          <div>
            <h3 style="margin:0;font-size:16px;font-weight:700;color:#FFFFFF">Restablecer Clave de Acceso</h3>
            <p style="margin:2px 0 0;font-size:12px;color:rgba(255,255,255,0.75)">
              Gestión directa de credenciales para <strong>${esc(targetEmail)}</strong>
            </p>
          </div>
        </div>
        <button type="button" id="btnCloseAdminResetModal" style="background:none;border:none;color:#FFFFFF;font-size:20px;cursor:pointer;padding:4px 8px;line-height:1;opacity:0.8;">✕</button>
      </div>

      <div id="adminResetModalBody" style="padding:22px;display:flex;flex-direction:column;gap:16px;">
        <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-left:4px solid #2563EB;padding:12px 14px;border-radius:6px;font-size:12.5px;color:#1E40AF;line-height:1.45;">
          <strong>Restablecimiento directo en el sistema:</strong><br>
          La nueva contraseña se actualizará de inmediato en Firebase Authentication y se despachará una única notificación institucional al correo del especialista con su nueva contraseña de acceso.
        </div>

        <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;gap:6px;font-size:12.5px;">
          <div><span style="color:#64748B;font-weight:600">Usuario / Correo:</span> <strong>${esc(targetEmail)}</strong></div>
          <div><span style="color:#64748B;font-weight:600">Nombre registrado:</span> <strong>${esc(targetName)}</strong></div>
          <div><span style="color:#64748B;font-weight:600">Rol asignado:</span> <strong>${esc(userDoc.role === 'admin' ? 'Administrador' : 'Especialista')}</strong></div>
          <div><span style="color:#64748B;font-weight:600">REI(s) a cargo:</span> <strong>${esc(Array.isArray(userDoc.reis) ? userDoc.reis.join(', ') : (userDoc.reis || 'TODAS'))}</strong></div>
        </div>

        <!-- Campo de Nueva Contraseña -->
        <div style="display:flex;flex-direction:column;gap:6px;">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <label for="adminNewPassInput" style="font-size:12.5px;font-weight:700;color:var(--navy-900);">
              Nueva Contraseña para el Especialista <span style="color:#DC2626">*</span>
            </label>
            <button type="button" id="btnAdminGenPass" class="btn secondary" style="padding:2px 8px;font-size:11px;">🎲 Generar otra</button>
          </div>
          <div style="position:relative;display:flex;align-items:center;">
            <input type="text" id="adminNewPassInput" required minlength="6" value="${esc(initialPass)}" style="width:100%;padding:10px 42px 10px 12px;border:1px solid #CBD5E1;border-radius:6px;font-size:14px;font-family:monospace;font-weight:700;color:#0F766E;background:#FFFFFF;box-sizing:border-box;">
            <button type="button" id="btnToggleAdminPass" style="position:absolute;right:8px;background:none;border:none;cursor:pointer;font-size:16px;color:#64748B;padding:4px;">👁️</button>
          </div>
          <small style="color:#64748B;font-size:11px;">Puedes usar la clave generada automáticamente o escribir una propia (mínimo 6 caracteres).</small>
        </div>

        <div id="adminResetErrorAlert" style="display:none;background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C;padding:10px 12px;border-radius:6px;font-size:12.5px;"></div>

        <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:8px;padding-top:14px;border-top:1px solid #F1F5F9;">
          <button type="button" id="btnCancelAdminReset" class="btn secondary" style="padding:9px 18px;">Cancelar</button>
          <button type="button" id="btnConfirmAdminReset" class="btn primary" style="padding:9px 20px;font-weight:700;">⚡ Restablecer y Notificar</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  lockBodyScroll();

  const closeModal = () => {
    overlay.remove();
    unlockBodyScroll();
  };

  overlay.querySelector('#btnCloseAdminResetModal')?.addEventListener('click', closeModal);
  overlay.querySelector('#btnCancelAdminReset')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  const passInput = overlay.querySelector('#adminNewPassInput');
  const btnGen = overlay.querySelector('#btnAdminGenPass');
  const btnEye = overlay.querySelector('#btnToggleAdminPass');

  btnGen?.addEventListener('click', () => {
    const freshPass = generateSafePassword();
    if (passInput) passInput.value = freshPass;
  });

  btnEye?.addEventListener('click', () => {
    if (passInput.type === 'text') {
      passInput.type = 'password';
      btnEye.textContent = '🙈';
    } else {
      passInput.type = 'text';
      btnEye.textContent = '👁️';
    }
  });

  const confirmBtn = overlay.querySelector('#btnConfirmAdminReset');
  const errorAlert = overlay.querySelector('#adminResetErrorAlert');

  confirmBtn?.addEventListener('click', async () => {
    errorAlert.style.display = 'none';
    const newPassword = passInput?.value?.trim() || '';

    if (!newPassword || newPassword.length < 6) {
      errorAlert.textContent = 'La contraseña debe tener al menos 6 caracteres.';
      errorAlert.style.display = 'block';
      return;
    }

    try {
      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Actualizando en Firebase...';

      // 1. Actualizar directamente en Firebase Authentication mediante el servicio administrativo
      await adminDirectResetPassword({
        email: targetEmail,
        uid: userDoc.id || userDoc.uid || null,
        newPassword: newPassword
      });

      confirmBtn.textContent = 'Enviando notificación oficial...';

      // 2. Despachar UNA SOLA notificación oficial vía Webhook al buzón del especialista con su nueva contraseña
      try {
        await sendSecurityNotificationEmail({
          to: targetEmail,
          nombre: targetName,
          subject: 'Restablecimiento de Contraseña - AGEBRE UGEL 03',
          title: 'Tu Contraseña ha sido Restablecida',
          message: `
            Estimado(a) <strong>${esc(targetName)}</strong>,<br><br>
            Te informamos que tu contraseña de acceso a la plataforma de <strong>Sistematización de Monitoreo AGEBRE 2026 (UGEL 03)</strong> ha sido restablecida con éxito por la Administración del Sistema.<br><br>
            <div style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:14px;margin:12px 0;">
              <div style="font-size:12px;color:#64748B;margin-bottom:6px;font-weight:600;">TUS NUEVAS CREDENCIALES DE ACCESO:</div>
              <div style="margin-bottom:4px;">• <strong>Usuario:</strong> ${esc(targetEmail)}</div>
              <div>• <strong>Nueva Contraseña:</strong> <span style="font-family:monospace;font-size:15px;font-weight:700;color:#0F766E;background:#FFFFFF;border:1px solid #CBD5E1;padding:4px 8px;border-radius:4px;display:inline-block;margin-top:3px;">${esc(newPassword)}</span></div>
            </div>
            Ya puedes iniciar sesión en la plataforma con tu nueva contraseña. Por seguridad institucional, te sugerimos guardar esta información en un lugar seguro.
          `,
          actionUrl: window.location.origin,
          actionText: 'Ingresar a la Plataforma'
        });
      } catch (mailErr) {
        console.warn('Aviso al despachar correo institucional:', mailErr);
      }

      // 3. Registrar auditoría institucional en Firestore
      if (dbNs) {
        try {
          await dbNs.collection('logActividades').add({
            tipo: 'RESTABLECIMIENTO_CLAVE_ADMINISTRADOR',
            usuarioUid: userDoc.id || userDoc.uid || '',
            usuarioEmail: targetEmail,
            restablecidoPor: currentUser?.email || 'admin',
            timestamp: Date.now(),
            fecha: new Date().toISOString(),
            detalle: `El administrador ${currentUser?.email || 'admin'} restableció la clave de acceso de ${targetEmail} directamente en Firebase Authentication. Notificación única despachada con éxito.`
          });
        } catch (_) {}
      }

      // 4. Mostrar pantalla de éxito con botón para copiar credenciales
      const modalBody = overlay.querySelector('#adminResetModalBody');
      modalBody.innerHTML = `
        <div style="text-align:center;padding:10px 0 6px">
          <div style="width:56px;height:56px;border-radius:50%;background:#DCFCE7;color:#16A34A;display:inline-flex;align-items:center;justify-content:center;font-size:26px;margin-bottom:12px">
            ✓
          </div>
          <h4 style="margin:0 0 6px 0;font-size:17px;color:var(--navy-900);font-weight:700;">¡Contraseña Restablecida con Éxito!</h4>
          <p style="margin:0;font-size:13px;color:var(--text-600);line-height:1.45;">
            La contraseña se actualizó directamente en <strong>Firebase Authentication</strong> y se despachó la notificación oficial al correo <strong>${esc(targetEmail)}</strong>.
          </p>
        </div>

        <div style="background:#F8FAFC;border:1px solid #CBD5E1;border-radius:8px;padding:14px;display:flex;flex-direction:column;gap:8px;">
          <div>
            <span style="font-size:11.5px;color:#64748B;">Correo Institucional:</span>
            <div style="font-size:13.5px;font-weight:700;color:var(--navy-900);">${esc(targetEmail)}</div>
          </div>
          <div>
            <span style="font-size:11.5px;color:#64748B;">Nueva Contraseña Asignada:</span>
            <div style="font-size:15px;font-weight:700;font-family:monospace;color:#0F766E;background:#FFFFFF;border:1px solid #CBD5E1;padding:6px 10px;border-radius:6px;display:inline-block;margin-top:2px;">
              ${esc(newPassword)}
            </div>
          </div>
        </div>

        <div style="display:flex;gap:10px;margin-top:6px;">
          <button type="button" id="btnAdminCopyCreds" class="btn secondary" style="flex:1;padding:10px;font-weight:600;">
            📋 Copiar Credenciales
          </button>
          <button type="button" id="btnAdminFinishReset" class="btn primary" style="flex:1;padding:10px;font-weight:700;">
            Aceptar y Finalizar
          </button>
        </div>
      `;

      const copyBtn = modalBody.querySelector('#btnAdminCopyCreds');
      copyBtn?.addEventListener('click', async () => {
        const textToCopy = [
          'SISTEMA DE MONITOREO AGEBRE 2026 - UGEL 03',
          'Credenciales de acceso actualizadas:',
          `Usuario: ${targetEmail}`,
          `Contraseña: ${newPassword}`,
          `Enlace: ${window.location.origin}`
        ].join('\n');
        try {
          await navigator.clipboard.writeText(textToCopy);
          copyBtn.textContent = '✓ ¡Copiado!';
          showToast('Credenciales copiadas al portapapeles.');
          setTimeout(() => { if (copyBtn) copyBtn.textContent = '📋 Copiar Credenciales'; }, 2000);
        } catch (_) {
          showToast('Por favor selecciona y copia las credenciales manualmente.');
        }
      });

      modalBody.querySelector('#btnAdminFinishReset')?.addEventListener('click', () => {
        closeModal();
        if (typeof onComplete === 'function') onComplete();
      });

      showToast(`✓ Contraseña de ${targetEmail} actualizada en Firebase y notificada.`);
    } catch (err) {
      console.error('Error al restablecer contraseña desde admin:', err);
      errorAlert.textContent = 'No se pudo restablecer la contraseña: ' + (err.message || err);
      errorAlert.style.display = 'block';
      confirmBtn.disabled = false;
      confirmBtn.textContent = '⚡ Restablecer y Notificar';
    }
  });
}