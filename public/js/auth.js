/* =========================================================================
   auth.js — Lógica de inicio y cierre de sesión con Firebase Auth.
   ========================================================================= */

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

export { getAuth, signOut };

/**
 * Resuelve el rol del usuario actual.
 * - Si es el primer usuario en entrar al sistema (meta/bootstrap no reclamado),
 *   se convierte automáticamente en Administrador.
 * - Los siguientes usuarios entran como "general" por defecto.
 * - Un admin puede cambiar roles desde la pestaña Usuarios.
 * @param {import('firebase/auth').User} user
 * @param {import('firebase/firestore').Firestore} firestoreDb
 * @returns {Promise<'admin'|'general'>}
 */
export async function resolveRole(user, firestoreDb) {
  const roleRef = doc(firestoreDb, 'roles', user.uid);
  const existing = await getDoc(roleRef);
  if (existing.exists()) return existing.data().role || 'general';

  const bootstrapRef = doc(firestoreDb, 'meta', 'bootstrap');
  const bootstrapSnap = await getDoc(bootstrapRef).catch(() => null);
  const alreadyClaimed = bootstrapSnap && bootstrapSnap.exists() && bootstrapSnap.data().claimed;

  if (!alreadyClaimed) {
    try {
      await setDoc(roleRef, { email: user.email || '', role: 'admin', createdAt: Date.now() });
      await setDoc(bootstrapRef, { claimed: true }, { merge: true });
      return 'admin';
    } catch (e) {
      console.error('No se pudo reclamar el rol de administrador, se asigna general', e);
    }
  }

  await setDoc(roleRef, { email: user.email || '', role: 'general', createdAt: Date.now() });
  return 'general';
}

/**
 * Registra los listeners de autenticación (onAuthStateChanged, login form, password toggle).
 * Llama a los callbacks onLogin/onLogout cuando cambia el estado de autenticación.
 * @param {import('firebase/auth').Auth} auth
 * @param {import('firebase/firestore').Firestore} firestoreDb
 * @param {{ onLogin: Function, onLogout: Function }} callbacks
 */
export function setupAuthListeners(auth, firestoreDb, { onLogin, onLogout }) {
  // Botón mostrar/ocultar contraseña
  document.getElementById('pwToggleBtn').addEventListener('click', () => {
    const pw = document.getElementById('loginPassword');
    const btn = document.getElementById('pwToggleBtn');
    const showing = pw.type === 'text';
    pw.type = showing ? 'password' : 'text';
    btn.textContent = showing ? 'Mostrar' : 'Ocultar';
  });

  // Formulario de inicio de sesión
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    document.getElementById('loginError').textContent = '';
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.textContent = 'Ingresando...';
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      console.error(e);
      let msg = 'No se pudo iniciar sesión.';
      if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found')
        msg = 'Correo o contraseña incorrectos.';
      else if (e.code === 'auth/too-many-requests')
        msg = 'Demasiados intentos. Espera un momento y vuelve a intentar.';
      else if (e.code === 'auth/invalid-email')
        msg = 'Ese correo no es válido.';
      document.getElementById('loginError').textContent = msg;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Iniciar sesión';
    }
  });

  // Observador de estado de autenticación
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let role;
      try {
        role = await resolveRole(user, firestoreDb);
      } catch (e) {
        console.error('No se pudo resolver el rol del usuario', e);
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        document.getElementById('loginError').textContent =
          'No se pudo verificar tu acceso. Revisa firestore.rules o inténtalo de nuevo.';
        return;
      }
      onLogin(user, role);
    } else {
      onLogout();
    }
  });
}
