/* =========================================================================
   ui/usuarios.js — Administración de usuarios y roles del sistema
   ========================================================================= */

import { esc, showToast } from './core-utils.js';

/* ============================= USUARIOS TAB ============================= */
export function renderUsuariosTab(container, state, dbNs, currentUser) {
  const rows = state.roles.map(r => {
    const isSelf = currentUser && r.id === currentUser.uid;
    return '<tr><td>' + esc(r.email || r.id) + (isSelf ? ' <span class="helpText" style="display:inline">(tú)</span>' : '') + '</td>' +
      '<td><select data-roleuid="' + r.id + '" ' + (isSelf ? 'disabled title="No puedes cambiar tu propio rol desde aquí"' : '') + '>' +
      '<option value="general"' + (r.role === 'general' ? ' selected' : '') + '>General</option>' +
      '<option value="admin"' + (r.role === 'admin' ? ' selected' : '') + '>Administrador</option>' +
      '</select></td></tr>';
  }).join('') || '<tr><td colspan="2" style="text-align:center;color:var(--ink-soft);padding:22px">Aún no hay cuentas creadas. Créalas con scripts/create-accounts.js (ver README).</td></tr>';

  container.innerHTML = '' +
    '<div class="pageHead"><h2>Usuarios y roles</h2><p>Cambia el rol (Administrador/General) de las cuentas ya creadas. Para crear cuentas nuevas usa <code>scripts/create-accounts.js</code>.</p></div>' +
    '<div class="panel"><div class="tblWrap"><table><thead><tr><th>Correo</th><th>Rol</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
    '<p class="helpText">Administrador: acceso total. General: puede registrar fichas y ver reportes, pero no puede eliminar datos ni administrar tipos de ficha o usuarios.</p>';

  container.querySelectorAll('[data-roleuid]').forEach(sel => {
    sel.addEventListener('change', async () => {
      try { await dbNs.collection('roles').doc(sel.dataset.roleuid).update({ role: sel.value }); showToast('Rol actualizado.'); }
      catch (err) { console.error(err); showToast('No se pudo actualizar el rol.'); }
    });
  });
}

