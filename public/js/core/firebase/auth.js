/* =========================================================================
   auth.js — Lógica de inicio, registro y recuperación de sesión con Firebase Auth.
   UGEL 03 · AGEBRE
   ========================================================================= */

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  generateOtpCode,
  sendOtpEmail,
  validateInstitutionalEmail,
  verifyDomainDns,
  sendSecurityNotificationEmail
} from '../email-service.js?v=20261119_v5';

import { adminDirectResetPassword } from './admin-service.js?v=20261119_v5';

export { getAuth, signOut, sendPasswordResetEmail, generateOtpCode, sendOtpEmail, sendSecurityNotificationEmail, adminDirectResetPassword };

/**
 * Obtiene el documento completo de perfil/rol del usuario desde Firestore
 * @param {string} uid
 * @param {import('firebase/firestore').Firestore} firestoreDb
 * @returns {Promise<Object|null>}
 */
export async function getUserRoleDoc(uid, firestoreDb) {
  if (!uid || !firestoreDb) return null;
  try {
    const roleRef = doc(firestoreDb, 'roles', uid);
    const snap = await getDoc(roleRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        id: uid,
        ...data,
        estadoVerificacion: data.estadoVerificacion || 'verificado'
      };
    }
  } catch (err) {
    console.warn('No se pudo obtener el documento de rol para', uid, err);
  }
  return null;
}

/**
 * Resuelve el rol del usuario actual.
 * - Si es Coordinador o cuenta agebre, se otorga rol de Administrador (acceso total).
 * - Los especialistas entran como "general".
 * @param {import('firebase/auth').User} user
 * @param {import('firebase/firestore').Firestore} firestoreDb
 * @returns {Promise<'admin'|'general'>}
 */
export async function resolveRole(user, firestoreDb) {
  const userEmail = (user.email || '').toLowerCase();
  const isMasterAdmin = (userEmail === 'agebre@ugel03.gob.pe' || userEmail === 'paulmontalvo54@gmail.com');

  // 1. Si ya se resolvió en esta sesión, responder inmediatamente (0ms)
  try {
    const cachedRole = sessionStorage.getItem('agebre_role_' + user.uid);
    if (cachedRole === 'admin' || cachedRole === 'general') {
      getDoc(doc(firestoreDb, 'roles', user.uid)).then(snap => {
        if (snap.exists()) {
          const data = snap.data();
          const isCoord = (data.role === 'admin' || data.userType === 'coordinador' || isMasterAdmin);
          const effectiveRole = isCoord ? 'admin' : (data.role || 'general');
          if (effectiveRole !== cachedRole) {
            sessionStorage.setItem('agebre_role_' + user.uid, effectiveRole);
          }
          sessionStorage.setItem('agebre_user_doc_' + user.uid, JSON.stringify({
            id: user.uid,
            ...data,
            userType: isCoord ? 'coordinador' : (data.userType || 'especialista'),
            role: isCoord ? 'admin' : (data.role || 'general'),
            accesoConcursos: isCoord ? true : Boolean(data.accesoConcursos),
            modalidad: isCoord ? 'TODAS' : (data.modalidad || 'EBR'),
            reis: isCoord ? ['TODAS'] : (Array.isArray(data.reis) && data.reis.length ? data.reis : []),
            estadoVerificacion: data.estadoVerificacion || 'verificado'
          }));
        }
      }).catch(() => {});
      return isMasterAdmin ? 'admin' : cachedRole;
    }
  } catch (_) {}

  // 2. Verificar si el documento ya existe en Firestore
  const roleRef = doc(firestoreDb, 'roles', user.uid);
  const existing = await getDoc(roleRef).catch(() => null);

  if (existing && existing.exists()) {
    const data = existing.data();
    const isCoord = (data.role === 'admin' || data.userType === 'coordinador' || isMasterAdmin);
    const role = isCoord ? 'admin' : (data.role || 'general');
    const enrichedDoc = {
      id: user.uid,
      ...data,
      userType: isCoord ? 'coordinador' : (data.userType || 'especialista'),
      role: role,
      accesoConcursos: isCoord ? true : Boolean(data.accesoConcursos),
      modalidad: isCoord ? 'TODAS' : (data.modalidad || 'EBR'),
      reis: isCoord ? ['TODAS'] : (Array.isArray(data.reis) && data.reis.length ? data.reis : []),
      estadoVerificacion: data.estadoVerificacion || 'verificado'
    };
    try {
      sessionStorage.setItem('agebre_role_' + user.uid, role);
      sessionStorage.setItem('agebre_user_doc_' + user.uid, JSON.stringify(enrichedDoc));
    } catch (_) {}
    return role;
  }

  // 3. Si no existe, revisar si hay datos de registro pendientes en sessionStorage
  let pendingData = null;
  try {
    const pStr = sessionStorage.getItem('agebre_pending_reg_' + userEmail);
    if (pStr) {
      pendingData = JSON.parse(pStr);
    }
  } catch (_) {}

  const bootstrapRef = doc(firestoreDb, 'meta', 'bootstrap');
  const bootstrapSnap = await getDoc(bootstrapRef).catch(() => null);
  const alreadyClaimed = bootstrapSnap && bootstrapSnap.exists() && bootstrapSnap.data().claimed;

  const isCoordinador = (pendingData && pendingData.userType === 'coordinador') || (!pendingData && isMasterAdmin);

  // En Firestore rules: allow create: if role == 'general' || (role == 'admin' && !alreadyClaimed)
  // Guardamos role: (!alreadyClaimed && isCoordinador) ? 'admin' : 'general' para no violar la regla de creación
  const firestoreRole = (!alreadyClaimed && isCoordinador) ? 'admin' : (pendingData?.role || (isCoordinador ? 'admin' : 'general'));

  const newDoc = {
    uid: user.uid,
    email: userEmail,
    nombre: (pendingData && pendingData.nombre) || user.displayName || (isCoordinador ? 'Coordinador AGEBRE' : 'Especialista'),
    userType: isCoordinador ? 'coordinador' : (pendingData?.userType || 'especialista'),
    role: firestoreRole,
    solicitudRol: isCoordinador ? 'coordinador' : (pendingData?.solicitudRol || 'especialista'),
    modalidad: isCoordinador ? 'TODAS' : (pendingData?.modalidad || 'EBR'),
    modalidades: isCoordinador ? ['TODAS'] : (pendingData?.modalidades || [pendingData?.modalidad || 'EBR']),
    reis: isCoordinador ? ['TODAS'] : (Array.isArray(pendingData?.reis) && pendingData.reis.length ? pendingData.reis : []),
    accesoConcursos: isCoordinador ? true : Boolean(pendingData?.accesoConcursos),
    estado: 'activo',
    estadoVerificacion: pendingData?.estadoVerificacion || 'pendiente',
    createdAt: Date.now(),
    actualizadoEn: Date.now()
  };

  try {
    await setDoc(roleRef, newDoc);
    if (!alreadyClaimed && isCoordinador) {
      await setDoc(bootstrapRef, { claimed: true }, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('Aviso al guardar documento inicial de rol:', err);
  }

  const finalAppRole = isCoordinador ? 'admin' : firestoreRole;
  try {
    sessionStorage.setItem('agebre_role_' + user.uid, finalAppRole);
    sessionStorage.setItem('agebre_user_doc_' + user.uid, JSON.stringify({ id: user.uid, ...newDoc, role: finalAppRole }));
  } catch (_) {}

  return finalAppRole;
}

/**
 * Registra los listeners de autenticación (onAuthStateChanged, vistas login/registro/recuperación).
 * @param {import('firebase/auth').Auth} auth
 * @param {import('firebase/firestore').Firestore} firestoreDb
 * @param {{ onLogin: Function, onLogout: Function }} callbacks
 */
export function setupAuthListeners(auth, firestoreDb, { onLogin, onLogout }) {
  const loginSection = document.getElementById('loginViewSection');
  const registerSection = document.getElementById('registerViewSection');
  const forgotSection = document.getElementById('forgotViewSection');
  const verifyOtpSection = document.getElementById('verifyOtpSection');

  // Elementos de la vista de Verificación OTP
  const otpDisplayEmail = document.getElementById('otpDisplayEmail');
  const otpBoxesRow = document.getElementById('otpBoxesRow');
  const otpBoxInputs = Array.from(document.querySelectorAll('.otpBoxInput'));
  const otpTimerDisplay = document.getElementById('otpTimerDisplay');
  const otpAttemptsDisplay = document.getElementById('otpAttemptsDisplay');
  const otpCooldownDisplay = document.getElementById('otpCooldownDisplay');
  const btnConfirmOtp = document.getElementById('btnConfirmOtp');
  const btnResendOtp = document.getElementById('btnResendOtp');
  const btnBackFromOtp = document.getElementById('btnBackFromOtp');
  const otpError = document.getElementById('otpError');
  const otpSuccess = document.getElementById('otpSuccess');

  // Estado activo de la verificación OTP
  let activeOtpState = null;
  try {
    const savedOtp = sessionStorage.getItem('agebre_active_otp');
    if (savedOtp) {
      const parsed = JSON.parse(savedOtp);
      if (parsed && parsed.expiresAt > Date.now()) {
        activeOtpState = parsed;
      } else {
        sessionStorage.removeItem('agebre_active_otp');
      }
    }
  } catch (_) {}

  let otpCountdownTimer = null;
  let resendCooldownTimer = null;
  let resendCooldownSecs = 0;

  function showSection(section) {
    if (loginSection) loginSection.style.display = 'none';
    if (registerSection) registerSection.style.display = 'none';
    if (forgotSection) forgotSection.style.display = 'none';
    if (verifyOtpSection) verifyOtpSection.style.display = 'none';
    if (section) section.style.display = 'block';
  }

  function stopOtpTimers() {
    if (otpCountdownTimer) {
      clearInterval(otpCountdownTimer);
      otpCountdownTimer = null;
    }
    if (resendCooldownTimer) {
      clearInterval(resendCooldownTimer);
      resendCooldownTimer = null;
    }
  }

  function startOtpCountdown(expiresAt) {
    if (otpCountdownTimer) clearInterval(otpCountdownTimer);

    function tick() {
      const remainingMs = Math.max(0, expiresAt - Date.now());
      const totalSecs = Math.floor(remainingMs / 1000);
      const mins = Math.floor(totalSecs / 60);
      const secs = totalSecs % 60;
      if (otpTimerDisplay) {
        otpTimerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      if (remainingMs <= 0) {
        clearInterval(otpCountdownTimer);
        otpCountdownTimer = null;
        if (otpError) {
          otpError.textContent = 'El código de 5 dígitos ha caducado. Por favor haz clic en "¿No recibiste el código? Reenviar" para solicitar uno nuevo.';
        }
        otpBoxInputs.forEach(inp => inp.disabled = true);
        if (btnConfirmOtp) btnConfirmOtp.disabled = true;
      }
    }
    tick();
    otpCountdownTimer = setInterval(tick, 1000);
  }

  function startResendCooldown(seconds = 60) {
    if (resendCooldownTimer) clearInterval(resendCooldownTimer);
    resendCooldownSecs = seconds;
    if (btnResendOtp) {
      btnResendOtp.disabled = true;
      btnResendOtp.style.opacity = '0.6';
      btnResendOtp.style.cursor = 'not-allowed';
    }
    if (otpCooldownDisplay) otpCooldownDisplay.textContent = String(resendCooldownSecs);

    resendCooldownTimer = setInterval(() => {
      resendCooldownSecs--;
      if (otpCooldownDisplay) otpCooldownDisplay.textContent = String(Math.max(0, resendCooldownSecs));
      if (resendCooldownSecs <= 0) {
        clearInterval(resendCooldownTimer);
        resendCooldownTimer = null;
        if (btnResendOtp) {
          btnResendOtp.disabled = false;
          btnResendOtp.style.opacity = '1';
          btnResendOtp.style.cursor = 'pointer';
        }
      }
    }, 1000);
  }

  function resetOtpInputs() {
    otpBoxInputs.forEach(inp => {
      inp.value = '';
      inp.disabled = false;
      inp.classList.remove('error', 'filled');
    });
    if (otpError) otpError.textContent = '';
    if (otpSuccess) otpSuccess.textContent = '';
    if (btnConfirmOtp) {
      btnConfirmOtp.disabled = false;
      btnConfirmOtp.textContent = 'Validar y Acceder al Sistema';
    }
    setTimeout(() => {
      const first = otpBoxInputs[0];
      if (first) first.focus();
    }, 120);
  }

  // Comportamiento interactivo de las 5 casillas de dígitos (Validación estrictamente manual)
  otpBoxInputs.forEach((input, idx) => {
    // 1. Escritura de dígitos y avance automático
    input.addEventListener('input', () => {
      const val = input.value.replace(/[^0-9]/g, '');
      input.value = val ? val.slice(-1) : '';
      if (input.value) {
        input.classList.add('filled');
        input.classList.remove('error');
        if (idx < otpBoxInputs.length - 1) {
          otpBoxInputs[idx + 1].focus();
        } else {
          // Última casilla: enfocar el botón para que el usuario valide manualmente
          const fullCode = otpBoxInputs.map(i => i.value).join('');
          if (fullCode.length === 5 && btnConfirmOtp) {
            btnConfirmOtp.focus();
          }
        }
      } else {
        input.classList.remove('filled');
      }
    });

    // 2. Tecla Enter (valida manualmente), Retroceso (Backspace) y navegación con flechas
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleValidateOtp();
      } else if (e.key === 'Backspace') {
        if (!input.value && idx > 0) {
          otpBoxInputs[idx - 1].focus();
          otpBoxInputs[idx - 1].value = '';
          otpBoxInputs[idx - 1].classList.remove('filled');
          e.preventDefault();
        }
      } else if (e.key === 'ArrowLeft' && idx > 0) {
        otpBoxInputs[idx - 1].focus();
      } else if (e.key === 'ArrowRight' && idx < otpBoxInputs.length - 1) {
        otpBoxInputs[idx + 1].focus();
      }
    });

    // 3. Pegar el código de 5 dígitos directamente (Ctrl + V) - requiere validación manual
    input.addEventListener('paste', (e) => {
      e.preventDefault();
      const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim();
      const digits = pastedData.replace(/[^0-9]/g, '').slice(0, 5);
      if (digits.length > 0) {
        digits.split('').forEach((char, dIdx) => {
          if (otpBoxInputs[dIdx]) {
            otpBoxInputs[dIdx].value = char;
            otpBoxInputs[dIdx].classList.add('filled');
            otpBoxInputs[dIdx].classList.remove('error');
          }
        });
        const lastIdx = Math.min(digits.length, otpBoxInputs.length) - 1;
        if (otpBoxInputs[lastIdx]) otpBoxInputs[lastIdx].focus();
        if (digits.length === 5 && btnConfirmOtp) {
          btnConfirmOtp.focus();
        }
      }
    });
  });

  // Validación de código OTP con los 5 Escudos de Seguridad
  async function handleValidateOtp() {
    if (otpError) otpError.textContent = '';
    if (otpSuccess) otpSuccess.textContent = '';

    const enteredCode = otpBoxInputs.map(i => i.value).join('').trim();
    if (enteredCode.length !== 5) {
      if (otpError) otpError.textContent = 'Por favor ingresa los 5 dígitos del código de confirmación.';
      return;
    }

    if (!activeOtpState) {
      try {
        const stored = sessionStorage.getItem('agebre_active_otp');
        if (stored) activeOtpState = JSON.parse(stored);
      } catch (_) {}
    }

    if (!activeOtpState) {
      if (otpError) otpError.textContent = 'No se encontró una sesión de verificación activa. Por favor regístrate nuevamente.';
      return;
    }

    // Escudo 2: Verificación de expiración (10 minutos)
    if (Date.now() > activeOtpState.expiresAt) {
      if (otpError) otpError.textContent = 'El código ha expirado (límite 10 minutos). Solicita un nuevo código con el botón "Reenviar".';
      otpBoxInputs.forEach(i => i.classList.add('error'));
      return;
    }

    // Escudo 1: Límite estricto de intentos (Máximo 3)
    if (activeOtpState.attemptsLeft <= 0) {
      if (otpError) otpError.textContent = 'Has superado el máximo de 3 intentos permitidos. Por seguridad institucional, solicita un nuevo código.';
      otpBoxInputs.forEach(i => { i.disabled = true; i.classList.add('error'); });
      if (btnConfirmOtp) btnConfirmOtp.disabled = true;
      return;
    }

    // Comparación segura del código
    if (enteredCode !== String(activeOtpState.code)) {
      activeOtpState.attemptsLeft--;
      try {
        sessionStorage.setItem('agebre_active_otp', JSON.stringify(activeOtpState));
      } catch (_) {}

      if (otpAttemptsDisplay) {
        otpAttemptsDisplay.textContent = `${activeOtpState.attemptsLeft} restante${activeOtpState.attemptsLeft === 1 ? '' : 's'}`;
        if (activeOtpState.attemptsLeft <= 1) otpAttemptsDisplay.classList.add('danger');
      }

      otpBoxInputs.forEach(i => i.classList.add('error'));

      if (activeOtpState.attemptsLeft <= 0) {
        if (otpError) otpError.textContent = 'Código incorrecto. Has superado los 3 intentos permitidos. Por seguridad, debes reenviar un nuevo código.';
        otpBoxInputs.forEach(i => i.disabled = true);
        if (btnConfirmOtp) btnConfirmOtp.disabled = true;
      } else {
        if (otpError) otpError.textContent = `Código incorrecto. Te queda${activeOtpState.attemptsLeft === 1 ? '' : 'n'} ${activeOtpState.attemptsLeft} intento(s).`;
      }
      return;
    }

    // ¡Código Correcto! Validación y acceso automático al sistema
    if (btnConfirmOtp) {
      btnConfirmOtp.disabled = true;
      btnConfirmOtp.textContent = 'Validando acceso...';
    }

    if (otpSuccess) {
      otpSuccess.textContent = '✓ ¡Código verificado con éxito! Ingresando al sistema...';
    }

    stopOtpTimers();
    activeOtpState.verified = true;

    // Asegurar que el usuario esté autenticado en el cliente de Firebase antes de escribir en Firestore
    let user = auth.currentUser;
    if (!user && activeOtpState?.email && activeOtpState?.password) {
      try {
        const cred = await signInWithEmailAndPassword(auth, activeOtpState.email, activeOtpState.password);
        user = cred.user;
      } catch (_) {}
    }

    const currentUid = user?.uid || activeOtpState?.uid;
    if (currentUid && firestoreDb) {
      try {
        const rRef = doc(firestoreDb, 'roles', currentUid);
        let prof = activeOtpState?.profile;
        if (!prof && currentUid) {
          try {
            const cached = sessionStorage.getItem('agebre_pending_reg_' + (user?.email || activeOtpState?.email || '').toLowerCase());
            if (cached) prof = JSON.parse(cached);
          } catch (_) {}
        }
        const updatePayload = {
          estadoVerificacion: 'verificado',
          role: prof?.role || 'general',
          verificadoEn: Date.now(),
          actualizadoEn: Date.now()
        };
        if (prof?.nombre) updatePayload.nombre = prof.nombre;
        if (prof?.email) updatePayload.email = prof.email;
        if (prof?.userType) updatePayload.userType = prof.userType;
        if (prof?.modalidad) updatePayload.modalidad = prof.modalidad;
        if (prof?.modalidades) updatePayload.modalidades = prof.modalidades;
        if (prof?.reis) updatePayload.reis = prof.reis;
        if (typeof prof?.accesoConcursos === 'boolean') updatePayload.accesoConcursos = prof.accesoConcursos;
        if (prof?.estado) updatePayload.estado = prof.estado;

        await setDoc(rRef, updatePayload, { merge: true });

        const vRef = doc(firestoreDb, 'verificaciones', currentUid);
        await setDoc(vRef, {
          estado: 'verificado',
          verificadoEn: Date.now()
        }, { merge: true }).catch(() => {});
      } catch (err) {
        console.warn('Aviso al actualizar verificación en Firestore:', err);
      }
    }

    try {
      sessionStorage.removeItem('agebre_active_otp');
      sessionStorage.removeItem('agebre_user_doc_' + currentUid);
    } catch (_) {}

    // Transición suave hacia la aplicación principal
    setTimeout(async () => {
      const user = auth.currentUser;
      if (user) {
        let role = 'general';
        let userRoleDoc = null;
        try {
          role = await resolveRole(user, firestoreDb);
          userRoleDoc = await getUserRoleDoc(user.uid, firestoreDb);
        } catch (_) {}
        onLogin(user, role, userRoleDoc);
      } else if (activeOtpState.email && activeOtpState.password) {
        try {
          const cred = await signInWithEmailAndPassword(auth, activeOtpState.email, activeOtpState.password);
          const role = await resolveRole(cred.user, firestoreDb);
          const uDoc = await getUserRoleDoc(cred.user.uid, firestoreDb);
          onLogin(cred.user, role, uDoc);
        } catch (_) {
          showSection(loginSection);
        }
      }
    }, 700);
  }

  if (btnConfirmOtp) {
    btnConfirmOtp.addEventListener('click', handleValidateOtp);
  }

  // Reenviar código OTP con cooldown de 60 segundos
  if (btnResendOtp) {
    btnResendOtp.addEventListener('click', async () => {
      if (resendCooldownSecs > 0) return;
      if (!activeOtpState) {
        try {
          const stored = sessionStorage.getItem('agebre_active_otp');
          if (stored) activeOtpState = JSON.parse(stored);
        } catch (_) {}
      }
      if (!activeOtpState) return;

      const newCode = generateOtpCode();
      activeOtpState.code = newCode;
      activeOtpState.attemptsLeft = 3;
      activeOtpState.expiresAt = Date.now() + 10 * 60 * 1000;
      activeOtpState.verified = false;

      try {
        sessionStorage.setItem('agebre_active_otp', JSON.stringify(activeOtpState));
      } catch (_) {}

      resetOtpInputs();
      if (otpAttemptsDisplay) {
        otpAttemptsDisplay.textContent = '3 restantes';
        otpAttemptsDisplay.classList.remove('danger');
      }

      startOtpCountdown(activeOtpState.expiresAt);
      startResendCooldown(60);

// Codigo no mostrado en pantalla por seguridad institucional

      await sendOtpEmail({
        firestoreDb,
        uid: activeOtpState.uid || auth.currentUser?.uid,
        email: activeOtpState.email,
        nombre: activeOtpState.nombre,
        code: newCode,
        profile: activeOtpState.profile
      });

      if (otpSuccess) {
        otpSuccess.textContent = '✓ Se ha enviado un nuevo código de 5 dígitos a tu correo.';
      }
    });
  }

  // Volver / Corregir correo desde OTP
  if (btnBackFromOtp) {
    btnBackFromOtp.addEventListener('click', async () => {
      stopOtpTimers();
      try {
        sessionStorage.removeItem('agebre_active_otp');
      } catch (_) {}
      if (auth.currentUser) {
        try {
          await signOut(auth);
        } catch (_) {}
      }
      showSection(registerSection);
    });
  }

  // Navegación entre vistas
  const btnToForgot = document.getElementById('btnToForgot');
  if (btnToForgot) {
    btnToForgot.addEventListener('click', () => {
      const forgotErr = document.getElementById('forgotError');
      const forgotSuc = document.getElementById('forgotSuccess');
      if (forgotErr) forgotErr.textContent = '';
      if (forgotSuc) forgotSuc.textContent = '';
      const emailVal = document.getElementById('loginEmail')?.value || '';
      const fEmail = document.getElementById('forgotEmail');
      if (fEmail && emailVal) fEmail.value = emailVal;
      showSection(forgotSection);
    });
  }

  const btnToRegister = document.getElementById('btnToRegister');
  if (btnToRegister) {
    btnToRegister.addEventListener('click', () => {
      const regErr = document.getElementById('regError');
      const regSuc = document.getElementById('regSuccess');
      if (regErr) regErr.textContent = '';
      if (regSuc) regSuc.textContent = '';
      showSection(registerSection);
    });
  }

  const btnBackFromReg = document.getElementById('btnBackToLoginFromReg');
  if (btnBackFromReg) {
    btnBackFromReg.addEventListener('click', () => showSection(loginSection));
  }

  const btnBackFromForgot = document.getElementById('btnBackToLoginFromForgot');
  if (btnBackFromForgot) {
    btnBackFromForgot.addEventListener('click', () => showSection(loginSection));
  }

  // Toggle mostrar contraseña en Login
  const pwToggleBtn = document.getElementById('pwToggleBtn');
  if (pwToggleBtn) {
    pwToggleBtn.addEventListener('click', () => {
      const pw = document.getElementById('loginPassword');
      if (!pw) return;
      const showing = pw.type === 'text';
      pw.type = showing ? 'password' : 'text';
      pwToggleBtn.textContent = showing ? 'Mostrar' : 'Ocultar';
    });
  }

  // Toggle mostrar contraseña en Registro
  const regPwToggleBtn = document.getElementById('regPwToggleBtn');
  if (regPwToggleBtn) {
    regPwToggleBtn.addEventListener('click', () => {
      const pw1 = document.getElementById('regPassword');
      const pw2 = document.getElementById('regPasswordConfirm');
      if (!pw1) return;
      const showing = pw1.type === 'text';
      pw1.type = showing ? 'password' : 'text';
      if (pw2) pw2.type = showing ? 'password' : 'text';
      regPwToggleBtn.textContent = showing ? 'Mostrar' : 'Ocultar';
    });
  }

  // Selección de Rol en Registro (Especialista vs Coordinador)
  const roleCardEsp = document.getElementById('roleCardEspecialista');
  const roleCardCoord = document.getElementById('roleCardCoordinador');
  const espFields = document.getElementById('regEspecialistaFields');
  const coordNotice = document.getElementById('regCoordinadorNotice');

  function updateRoleSelection(selectedRole) {
    if (selectedRole === 'coordinador') {
      if (roleCardCoord) roleCardCoord.classList.add('active');
      if (roleCardEsp) roleCardEsp.classList.remove('active');
      if (espFields) espFields.style.display = 'none';
      if (coordNotice) coordNotice.style.display = 'flex';
      const rCoord = document.querySelector('input[name="regRole"][value="coordinador"]');
      if (rCoord) rCoord.checked = true;
    } else {
      if (roleCardEsp) roleCardEsp.classList.add('active');
      if (roleCardCoord) roleCardCoord.classList.remove('active');
      if (espFields) espFields.style.display = 'block';
      if (coordNotice) coordNotice.style.display = 'none';
      const rEsp = document.querySelector('input[name="regRole"][value="especialista"]');
      if (rEsp) rEsp.checked = true;
    }
  }

  if (roleCardEsp) {
    roleCardEsp.addEventListener('click', () => updateRoleSelection('especialista'));
  }
  if (roleCardCoord) {
    roleCardCoord.addEventListener('click', () => updateRoleSelection('coordinador'));
  }
  document.querySelectorAll('input[name="regRole"]').forEach(radio => {
    radio.addEventListener('change', (e) => updateRoleSelection(e.target.value));
  });

  // Botones rápidos de selección de REIs
  const btnSelectAllReis = document.getElementById('btnSelectAllReis');
  const btnClearAllReis = document.getElementById('btnClearAllReis');
  if (btnSelectAllReis) {
    btnSelectAllReis.addEventListener('click', () => {
      document.querySelectorAll('#regReiGrid input[name="regRei"]').forEach(cb => {
        cb.checked = true;
        cb.closest('.reiChip')?.classList.add('active');
      });
    });
  }
  if (btnClearAllReis) {
    btnClearAllReis.addEventListener('click', () => {
      document.querySelectorAll('#regReiGrid input[name="regRei"]').forEach(cb => {
        cb.checked = false;
        cb.closest('.reiChip')?.classList.remove('active');
      });
    });
  }

  // Cambio de estilo reactivo al marcar/desmarcar chips de REI
  document.querySelectorAll('#regReiGrid input[name="regRei"]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) {
        cb.closest('.reiChip')?.classList.add('active');
      } else {
        cb.closest('.reiChip')?.classList.remove('active');
      }
    });
  });

  // Modalidad JEC: comportamiento especial
  const regModalidad = document.getElementById('regModalidad');
  const regReiHelp = document.getElementById('regReiHelp');
  if (regModalidad) {
    regModalidad.addEventListener('change', () => {
      if (regModalidad.value === 'JEC') {
        if (regReiHelp) {
          regReiHelp.textContent = '⭐ Modalidad JEC: Se asociará automáticamente a todas las II.EE. JEC de la UGEL 03.';
          regReiHelp.style.color = 'var(--blue-600)';
        }
      } else {
        if (regReiHelp) {
          regReiHelp.textContent = 'Selecciona una o más REDes Educativas asignadas.';
          regReiHelp.style.color = '';
        }
      }
    });
  }

  // Formulario 1: Inicio de sesión
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const loginError = document.getElementById('loginError');
      if (loginError) loginError.textContent = '';
      const email = document.getElementById('loginEmail')?.value.trim() || '';
      const password = document.getElementById('loginPassword')?.value || '';
      const btn = document.getElementById('loginBtn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Ingresando...';
      }
      try {
        if (!email || !email.includes('@') || !email.includes('.')) {
          throw { code: 'auth/invalid-email' };
        }
        await signInWithEmailAndPassword(auth, email, password);
      } catch (err) {
        console.error('Error al iniciar sesión:', err);
        let msg = 'No se pudo iniciar sesión.';
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found')
          msg = 'Correo o contraseña incorrectos.';
        else if (err.code === 'auth/too-many-requests')
          msg = 'Demasiados intentos. Espera un momento y vuelve a intentar.';
        else if (err.code === 'auth/invalid-email')
          msg = 'Ese correo no es válido.';
        else if (err.code === 'auth/invalid-domain')
          msg = 'Solo se permiten correos institucionales (@ugel03.gob.pe).';
        if (loginError) loginError.textContent = msg;
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Iniciar sesión';
        }
      }
    });
  }

  // Validación en tiempo real del correo institucional en el formulario de registro
  const regEmailInput = document.getElementById('regEmail');
  const regEmailFeedback = document.getElementById('regEmailFeedback');
  if (regEmailInput && regEmailFeedback) {
    const handleEmailLiveCheck = () => {
      const val = regEmailInput.value.trim();
      if (!val) {
        regEmailFeedback.style.display = 'none';
        regEmailFeedback.textContent = '';
        return;
      }
      const res = validateInstitutionalEmail(val);
      regEmailFeedback.style.display = 'block';
      if (!res.valid) {
        regEmailFeedback.style.color = '#DC2626';
        regEmailFeedback.textContent = '⚠️ ' + res.error;
      } else {
        regEmailFeedback.style.color = '#16A34A';
        regEmailFeedback.textContent = `✓ Dominio institucional autorizado (@${res.domain})`;
      }
    };
    regEmailInput.addEventListener('input', handleEmailLiveCheck);
    regEmailInput.addEventListener('blur', handleEmailLiveCheck);
  }

  // Formulario 2: Registro de nuevo usuario con Verificación OTP de 5 dígitos
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const regError = document.getElementById('regError');
      const regSuccess = document.getElementById('regSuccess');
      if (regError) regError.textContent = '';
      if (regSuccess) regSuccess.textContent = '';

      const nombre = document.getElementById('regNombre')?.value.trim() || '';
      const email = document.getElementById('regEmail')?.value.trim() || '';
      const password = document.getElementById('regPassword')?.value || '';
      const passwordConfirm = document.getElementById('regPasswordConfirm')?.value || '';
      const selectedRole = document.querySelector('input[name="regRole"]:checked')?.value || 'especialista';
      const selectedMods = Array.from(document.querySelectorAll('#regModalidadGrid input[name="regModalidad"]:checked')).map(cb => cb.value);
      const singleMod = document.getElementById('regModalidad')?.value || 'EBR';
      const modalidadesArr = selectedMods.length ? selectedMods : [singleMod];
      const modalidadStr = modalidadesArr.join(', ');
      const submitBtn = document.getElementById('regSubmitBtn');

      // Validaciones básicas de campos
      if (!nombre || nombre.length < 3) {
        if (regError) regError.textContent = 'Por favor ingresa tus nombres y apellidos completos.';
        return;
      }

      // Validación estricta de correo institucional UGEL 03
      const emailValidation = validateInstitutionalEmail(email);
      if (!emailValidation.valid) {
        if (regError) regError.textContent = emailValidation.error;
        return;
      }

      // Verificación en tiempo real del dominio mediante Google Public DNS
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Verificando dominio institucional...';
      }
      const dnsCheck = await verifyDomainDns(emailValidation.domain);
      if (!dnsCheck.ok) {
        if (regError) regError.textContent = dnsCheck.error;
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta institucional';
        }
        return;
      }

      if (password.length < 6) {
        if (regError) regError.textContent = 'La contraseña debe tener al menos 6 caracteres.';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta institucional';
        }
        return;
      }
      if (password !== passwordConfirm) {
        if (regError) regError.textContent = 'Las contraseñas no coinciden. Por favor verifícalas.';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta institucional';
        }
        return;
      }

      if (selectedRole === 'especialista' && modalidadesArr.length === 0) {
        if (regError) regError.textContent = 'Debes seleccionar al menos una modalidad a tu cargo (ej. EBR, EBE o JEC).';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta institucional';
        }
        return;
      }

      // Checkboxes de REI
      const selectedReis = Array.from(document.querySelectorAll('#regReiGrid input[name="regRei"]:checked')).map(cb => cb.value);
      if (selectedRole === 'especialista' && selectedReis.length === 0) {
        if (regError) regError.textContent = 'Debes seleccionar al menos una REI a tu cargo (o marcar "Todas").';
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta institucional';
        }
        return;
      }

      const isCoordinador = (selectedRole === 'coordinador');
      const pendingProfile = {
        email: email.toLowerCase(),
        nombre: nombre,
        userType: selectedRole,
        role: isCoordinador ? 'admin' : 'general',
        solicitudRol: selectedRole,
        modalidad: isCoordinador ? 'TODAS' : modalidadStr,
        modalidades: isCoordinador ? ['TODAS'] : modalidadesArr,
        reis: isCoordinador ? ['TODAS'] : (selectedReis.length ? selectedReis : ['TODAS']),
        accesoConcursos: isCoordinador ? true : false,
        estado: 'activo',
        estadoVerificacion: 'pendiente',
        createdAt: Date.now(),
        actualizadoEn: Date.now()
      };

      // 1. Generar código OTP seguro de 5 dígitos (Escudo de Seguridad UGEL 03)
      const otpCode = generateOtpCode();
      const otpState = {
        code: otpCode,
        email: email.toLowerCase(),
        nombre: nombre,
        password: password,
        profile: pendingProfile,
        attemptsLeft: 3,
        expiresAt: Date.now() + 10 * 60 * 1000,
        verified: false
      };
      activeOtpState = otpState;

      try {
        sessionStorage.setItem('agebre_pending_reg_' + email.toLowerCase(), JSON.stringify(pendingProfile));
        sessionStorage.setItem('agebre_active_otp', JSON.stringify(otpState));
      } catch (_) {}

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creando cuenta y generando código...';
      }

      try {
        // 2. Crear usuario en Firebase Auth
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        const user = cred.user;
        if (!activeOtpState) {
          activeOtpState = otpState;
        }
        activeOtpState.uid = user.uid;
        try {
          sessionStorage.setItem('agebre_active_otp', JSON.stringify(activeOtpState));
        } catch (_) {}

        // Registrar perfil inicial en colección 'roles'
        try {
          const rRef = doc(firestoreDb, 'roles', user.uid);
          await setDoc(rRef, {
            ...pendingProfile,
            role: isCoordinador ? 'admin' : 'general',
            estadoVerificacion: 'pendiente',
            createdAt: Date.now()
          }, { merge: true });
        } catch (rErr) {
          console.warn('Aviso al guardar perfil inicial en roles:', rErr);
        }

        // 3. Enviar correo institucional con el código de 5 dígitos (OTP)
        await sendOtpEmail({
          firestoreDb,
          uid: user.uid,
          email: email,
          nombre: nombre,
          code: otpCode,
          profile: pendingProfile
        });

        // 4. Mostrar pantalla de verificación OTP
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        if (otpDisplayEmail) otpDisplayEmail.textContent = email;
        if (otpAttemptsDisplay) {
          otpAttemptsDisplay.textContent = '3 restantes';
          otpAttemptsDisplay.classList.remove('danger');
        }
        // Codigo no mostrado en pantalla por seguridad institucional
        const targetExpiry = (activeOtpState && activeOtpState.expiresAt) || otpState.expiresAt;
        startOtpCountdown(targetExpiry);
        startResendCooldown(60);
        resetOtpInputs();
        showSection(verifyOtpSection);

      } catch (err) {
        console.error('Error al registrar usuario:', err);
        let msg = 'No se pudo registrar la cuenta.';
        if (err.code === 'auth/email-already-in-use') {
          msg = `El correo "${email}" ya se encuentra registrado. Ingresa tus datos en la pestaña "Iniciar sesión" o usa "Recuperar contraseña".`;
          const loginEmailEl = document.getElementById('loginEmail');
          const loginPassEl = document.getElementById('loginPassword');
          if (loginEmailEl) loginEmailEl.value = email;
          if (loginPassEl) loginPassEl.value = password;
        } else if (err.code === 'auth/invalid-email') {
          msg = 'El formato del correo institucional no es válido.';
        } else if (err.code === 'auth/weak-password') {
          msg = 'La contraseña es muy débil. Usa al menos 6 caracteres.';
        } else if (err.message) {
          msg = err.message;
        }
        if (regError) regError.textContent = msg;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Crear cuenta institucional';
        }
      }
    });
  }

  // Formulario 3: Recuperación de contraseña ("Olvidó su contraseña")
  const forgotForm = document.getElementById('forgotForm');
  if (forgotForm) {
    forgotForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const forgotError = document.getElementById('forgotError');
      const forgotSuccess = document.getElementById('forgotSuccess');
      if (forgotError) forgotError.textContent = '';
      if (forgotSuccess) forgotSuccess.textContent = '';

      const email = document.getElementById('forgotEmail')?.value.trim() || '';
      const submitBtn = document.getElementById('forgotSubmitBtn');

      if (!email || !email.includes('@') || !email.includes('.')) {
        if (forgotError) forgotError.textContent = 'Por favor ingresa un correo institucional válido.';
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Enviando enlace...';
      }

      try {
        await sendPasswordResetEmail(auth, email);
        if (forgotSuccess) {
          forgotSuccess.innerHTML = '✓ Se ha enviado el enlace de restablecimiento a <strong>' + email + '</strong>.<br>Por favor revisa tu bandeja de entrada o spam para restablecer tu clave institucional.';
        }
      } catch (err) {
        console.error('Error al enviar correo de recuperación:', err);
        let msg = 'No se pudo enviar el correo de recuperación.';
        if (err.code === 'auth/user-not-found') {
          msg = 'No se encontró ninguna cuenta registrada con este correo.';
        } else if (err.code === 'auth/invalid-email') {
          msg = 'El correo ingresado no es válido.';
        } else if (err.code === 'auth/too-many-requests') {
          msg = 'Demasiados intentos. Espera un momento antes de volver a solicitarlo.';
        }
        if (forgotError) forgotError.textContent = msg;
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Enviar enlace de recuperación';
        }
      }
    });
  }

  // Observador de estado de autenticación con Escudo de Verificación OTP
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      let role;
      let userRoleDoc = null;
      try {
        role = await resolveRole(user, firestoreDb);
        userRoleDoc = await getUserRoleDoc(user.uid, firestoreDb);
      } catch (e) {
        console.error('No se pudo resolver el rol del usuario', e);
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        const loginError = document.getElementById('loginError');
        if (loginError) {
          loginError.textContent = 'No se pudo verificar tu acceso. Revisa tu conexión o inténtalo de nuevo.';
        }
        return;
      }

      // 1. Escudo de Verificación: Comprobar si la cuenta ya está verificada y autorizada
      const userEmail = (user.email || '').toLowerCase();
      const isMasterAdmin = (userEmail === 'agebre@ugel03.gob.pe' || userEmail === 'paulmontalvo54@gmail.com');
      const isPending = (userRoleDoc?.estadoVerificacion === 'pendiente');
      const isAlreadyVerified = !isPending && Boolean(
        userRoleDoc?.estadoVerificacion === 'verificado' ||
        isMasterAdmin
      );

      // Si la cuenta ya está verificada o es administradora: acceso directo al sistema
      if (isAlreadyVerified) {
        // Limpiar cualquier residuo de OTP de sessionStorage para evitar interferencias
        activeOtpState = null;
        try {
          sessionStorage.removeItem('agebre_active_otp');
          sessionStorage.removeItem('agebre_pending_reg_' + userEmail);
        } catch (_) {}

        // Ocultar pantallas de login/OTP y asegurar visibilidad de la aplicación
        if (verifyOtpSection) verifyOtpSection.style.display = 'none';
        const loginScreenEl = document.getElementById('loginScreen');
        if (loginScreenEl) loginScreenEl.style.display = 'none';
        const appEl = document.getElementById('app');
        if (appEl) appEl.style.display = 'block';

        onLogin(user, role, userRoleDoc);
        return;
      }

      // 2. Si la cuenta aún no está verificada, revisar si tiene OTP pendiente
      let currentOtp = activeOtpState;
      if (!currentOtp) {
        try {
          const s = sessionStorage.getItem('agebre_active_otp');
          if (s) {
            const parsed = JSON.parse(s);
            if (parsed && parsed.email === userEmail && parsed.expiresAt > Date.now()) {
              currentOtp = parsed;
            } else {
              sessionStorage.removeItem('agebre_active_otp');
            }
          }
        } catch (_) {}
      }

      const isOtpPending = Boolean(
        (isPending && !currentOtp?.verified) ||
        (currentOtp && !currentOtp.verified && currentOtp.email === userEmail)
      );

      if (isOtpPending) {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('app').style.display = 'none';
        showSection(verifyOtpSection);
        if (otpDisplayEmail) otpDisplayEmail.textContent = user.email || '';

        // Solo generar y despachar nuevo correo si NO existe ya un código vigente
        if (!currentOtp || currentOtp.expiresAt <= Date.now()) {
          const newCode = generateOtpCode();
          currentOtp = {
            code: newCode,
            email: userEmail,
            nombre: userRoleDoc?.nombre || user.displayName || 'Usuario',
            uid: user.uid,
            attemptsLeft: 3,
            expiresAt: Date.now() + 10 * 60 * 1000,
            verified: false
          };
          activeOtpState = currentOtp;
          try {
            sessionStorage.setItem('agebre_active_otp', JSON.stringify(currentOtp));
          } catch (_) {}

          sendOtpEmail({
            firestoreDb,
            uid: user.uid,
            email: user.email,
            nombre: currentOtp.nombre,
            code: newCode,
            profile: userRoleDoc
          });
        }

        activeOtpState = currentOtp;
        startOtpCountdown(currentOtp.expiresAt);
        startResendCooldown(60);
        resetOtpInputs();
        return; // Detiene el acceso para cuentas no verificadas
      }

      onLogin(user, role, userRoleDoc);
    } else {
      // Usuario sin sesión activa (arranque o cierre de sesión)
      showSection(loginSection);
      activeOtpState = null;
      try {
        sessionStorage.removeItem('agebre_active_otp');
      } catch (_) {}
      const loginError = document.getElementById('loginError');
      if (loginError) loginError.textContent = '';
      const loginScreenEl = document.getElementById('loginScreen');
      if (loginScreenEl) loginScreenEl.style.display = 'flex';
      const appEl = document.getElementById('app');
      if (appEl) appEl.style.display = 'none';
      onLogout();
    }
  });
}

/**
 * Verifica la contraseña del administrador actual mediante Firebase Auth
 * @param {string} password 
 * @param {string} [email]
 * @returns {Promise<boolean>}
 */
export async function verifyAdminPassword(password, email) {
  if (!password || !password.trim()) {
    throw new Error('Debes ingresar la contraseña de administrador.');
  }
  const auth = getAuth();
  const targetEmail = email || auth?.currentUser?.email;
  if (!targetEmail) {
    throw new Error('No hay una sesión activa de administrador.');
  }

  try {
    await signInWithEmailAndPassword(auth, targetEmail, password.trim());
    return true;
  } catch (err) {
    console.warn('Error al verificar contraseña de administrador:', err);
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      throw new Error('Contraseña incorrecta. Por favor verifica tu clave.');
    } else if (err.code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos fallidos. Por seguridad, espera un momento antes de volver a intentar.');
    } else if (err.code === 'auth/network-request-failed') {
      throw new Error('No se pudo conectar con el servidor de autenticación. Verifica tu conexión.');
    }
    throw new Error(err.message || 'Error al verificar la contraseña.');
  }
}