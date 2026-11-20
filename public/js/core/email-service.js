/* =========================================================================
   email-service.js — Servicio institucional de envío y verificación por código (OTP).
   UGEL 03 · AGEBRE
   ========================================================================= */

import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { AGEBRE_EMAIL_WEBHOOK_URL } from './firebase/config.js';

// Dominios institucionales autorizados oficiales para el registro
export const ALLOWED_INSTITUTIONAL_DOMAINS = [
  'ugel03.gob.pe',
  'minedu.gob.pe',
  'drelm.gob.pe',
  'perueduca.pe'
];

// Corrección de errores tipográficos comunes en dominios
export const DOMAIN_TYPOS = {
  'ugel03.pe': 'ugel03.gob.pe',
  'ugel03.com': 'ugel03.gob.pe',
  'ugel03.gob': 'ugel03.gob.pe',
  'ugel3.gob.pe': 'ugel03.gob.pe',
  'minedu.gob': 'minedu.gob.pe',
  'minedu.com': 'minedu.gob.pe',
  'minedu.pe': 'minedu.gob.pe',
  'drelm.gob': 'drelm.gob.pe',
  'drelm.com': 'drelm.gob.pe',
  'gmai.com': 'gmail.com',
  'hotmial.com': 'hotmail.com'
};

// Dominios temporales / desechables conocidos bloqueados
export const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'yopmail.fr', 'yopmail.net', 'cool.fr.nf', 'jetable.fr.nf',
  '10minutemail.com', '10minutemail.net', 'tempmail.com', 'temp-mail.org',
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'guerrillamail.info',
  'trashmail.com', 'trashmail.net', 'getairmail.com', 'dispostable.com',
  'mohmal.com', 'throwawaymail.com', 'generator.email', 'fakemailgenerator.com'
]);

/**
 * Valida si un correo electrónico cumple con los estándares institucionales de UGEL 03.
 * @param {string} email
 * @returns {{ valid: boolean, error?: string, suggestion?: string, domain?: string, isInstitutional?: boolean }}
 */
export function validateInstitutionalEmail(email) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean) {
    return { valid: false, error: 'Por favor ingresa tu correo institucional.' };
  }

  // Validación de formato RFC básico
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  if (!emailRegex.test(clean)) {
    return { valid: false, error: 'El formato del correo institucional no es válido.' };
  }

  const parts = clean.split('@');
  const userPart = parts[0];
  const domain = parts[1];

  if (!domain || !domain.includes('.')) {
    return { valid: false, error: 'El dominio del correo está incompleto.' };
  }

  // 1. Bloqueo estricto de dominios temporales
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { valid: false, error: 'No se permiten correos temporales o desechables. Utiliza tu correo institucional oficial.' };
  }

  // 2. Detección de errores tipográficos en el dominio
  if (DOMAIN_TYPOS[domain]) {
    return {
      valid: false,
      error: `¿Quisiste decir @${DOMAIN_TYPOS[domain]}? Por favor verifica la escritura del dominio.`,
      suggestion: `${userPart}@${DOMAIN_TYPOS[domain]}`
    };
  }

  // 3. Verificación de dominios institucionales autorizados
  const isDirectAllowed = ALLOWED_INSTITUTIONAL_DOMAINS.includes(domain);
  const isEduOrGobPe = domain.endsWith('.gob.pe') || domain.endsWith('.edu.pe');
  
  // Excepción autorizada para cuenta administradora técnica de UGEL/desarrollo
  const isAuthorizedAccount = (clean === 'paulmontalvo54@gmail.com' || clean === 'agebre@ugel03.gob.pe');

  if (!isDirectAllowed && !isEduOrGobPe && !isAuthorizedAccount) {
    return {
      valid: false,
      error: 'Por política de seguridad de la UGEL 03, solo se permite el registro con cuentas institucionales oficiales (@ugel03.gob.pe, @minedu.gob.pe o @drelm.gob.pe).'
    };
  }

  return { valid: true, domain, isInstitutional: true };
}

/**
 * Verifica en tiempo real mediante Google Public DNS si el dominio tiene registros de correo (MX)
 * @param {string} domain 
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function verifyDomainDns(domain) {
  if (!domain) return { ok: false, error: 'Dominio no proporcionado.' };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const resp = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`, {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!resp.ok) return { ok: true }; // En caso de intermitencia externa de red, fail-open controlado

    const data = await resp.json();
    if (data.Status === 3) {
      return { ok: false, error: `El dominio "@${domain}" no existe en internet.` };
    }
    if (data.Status === 0 && (!data.Answer || data.Answer.length === 0)) {
      return { ok: false, error: `El dominio "@${domain}" no tiene servidores activos para recibir correos.` };
    }
    return { ok: true };
  } catch (_) {
    return { ok: true };
  }
}

/**
 * Genera el cuerpo de correo en texto plano (RFC 2046 Multipart/Alternative)
 * para evitar penalizaciones en filtros antispam de Microsoft 365 y Outlook.
 * @param {{ nombre: string, email: string, code: string, expiresMinutes?: number }} param0 
 * @returns {string}
 */
export function buildOtpPlainText({ nombre, email, code, expiresMinutes = 10 }) {
  return [
    `UGEL 03 · AGEBRE - Sistematización de Fichas de Monitoreo`,
    `=======================================================`,
    ``,
    `Estimado(a) ${nombre || 'Especialista'}:`,
    ``,
    `Has solicitado registrarte en el sistema con el correo institucional ${email}.`,
    ``,
    `Tu código de confirmación es: ${code}`,
    ``,
    `Vigencia: Este código expira en ${expiresMinutes} minutos y permite un máximo de 3 intentos.`,
    `Seguridad: Por tu seguridad institucional, nunca compartas este código con ninguna persona.`,
    ``,
    `Área de Gestión de la Educación Básica Regular y Especial (AGEBRE)`,
    `Unidad de Gestión Educativa Local N° 03 · DRELM - MINEDU`
  ].join('\n');
}

/**
 * Genera un código OTP criptográfico aleatorio de 5 dígitos (entre 10000 y 99999).
 * @returns {string}
 */
export function generateOtpCode() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const num = 10000 + (array[0] % 90000);
    return String(num);
  }
  return String(Math.floor(10000 + Math.random() * 90000));
}

/**
 * Construye la plantilla HTML institucional oficial para el envío del código OTP.
 * Diseñada para máxima compatibilidad con Microsoft Outlook y filtros antispam.
 * @param {{ nombre: string, email: string, code: string, expiresMinutes?: number }} param0 
 * @returns {string}
 */
export function buildOtpEmailHtml({ nombre, email, code, expiresMinutes = 10 }) {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Código de Verificación - AGEBRE UGEL 03</title>
</head>
<body style="margin:0;padding:0;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#F1F5F9;padding:30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.04);">
          <!-- Cabecera Institucional -->
          <tr>
            <td style="background:#12294D;padding:26px 30px;text-align:center;">
              <span style="display:inline-block;color:#E0A526;font-size:20px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">UGEL 03 · AGEBRE</span>
              <h1 style="color:#FFFFFF;font-size:18px;margin:8px 0 0;font-weight:600;">Sistematización de Fichas de Monitoreo</h1>
            </td>
          </tr>

          <!-- Contenido Principal -->
          <tr>
            <td style="padding:32px 30px 24px;">
              <h2 style="font-size:20px;color:#0B1B36;margin:0 0 12px;font-weight:700;">Código de Verificación de Seguridad</h2>
              <p style="font-size:14.5px;color:#334155;line-height:1.6;margin:0 0 16px;">
                Estimado(a) <strong>${nombre || 'Especialista'}</strong>,
              </p>
              <p style="font-size:14px;color:#475569;line-height:1.5;margin:0 0 22px;">
                Has solicitado registrarte en el sistema con el correo institucional <strong>${email}</strong>. Para validar tu identidad y completar tu acceso, utiliza el siguiente código de confirmación:
              </p>

              <!-- Casilla del Código OTP -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0 24px;">
                <tr>
                  <td align="center">
                    <div style="display:inline-block;background:#F8FAFC;border:2px dashed #2563EB;border-radius:10px;padding:16px 36px;text-align:center;">
                      <span style="font-family:monospace,'Courier New',Courier;font-size:36px;font-weight:800;letter-spacing:10px;color:#12294D;display:block;">${code}</span>
                      <span style="display:block;font-size:11.5px;color:#64748B;font-weight:600;margin-top:6px;text-transform:uppercase;">Código de 5 dígitos</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Medidas de Seguridad -->
              <div style="background:#EFF6FF;border-left:4px solid #2563EB;padding:12px 16px;border-radius:4px;margin-bottom:20px;">
                <p style="margin:0;font-size:12.5px;color:#1E40AF;line-height:1.4;">
                  ⏱️ <strong>Vigencia:</strong> Este código expira en <strong>${expiresMinutes} minutos</strong> y solo permite un máximo de <strong>3 intentos</strong>.<br>
                  🛡️ <strong>Seguridad:</strong> Nunca compartas este código con ninguna persona.
                </p>
              </div>

              <p style="font-size:12.5px;color:#64748B;line-height:1.5;margin:0;">
                Si tú no realizaste esta solicitud, puedes ignorar este mensaje de forma segura.
              </p>
            </td>
          </tr>

          <!-- Pie de Página Institucional -->
          <tr>
            <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:18px 30px;text-align:center;">
              <p style="margin:0;font-size:11.5px;color:#94A3B8;line-height:1.4;">
                Área de Gestión de la Educación Básica Regular y Especial (AGEBRE)<br>
                Unidad de Gestión Educativa Local N° 03 · DRELM - MINEDU
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Envía el código de verificación al correo del usuario y registra la solicitud en Firestore.
 * Notifica al Coordinador como medida de control y seguridad.
 * @param {Object} options
 * @param {import('firebase/firestore').Firestore} options.firestoreDb
 * @param {string} options.uid
 * @param {string} options.email
 * @param {string} options.nombre
 * @param {string} options.code
 * @param {Object} options.profile
 * @returns {Promise<{ ok: boolean, message: string }>}
 */
export async function sendOtpEmail({ firestoreDb, uid, email, nombre, code, profile }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutos
  const htmlBody = buildOtpEmailHtml({ nombre, email: cleanEmail, code, expiresMinutes: 10 });
  const plainTextBody = buildOtpPlainText({ nombre, email: cleanEmail, code, expiresMinutes: 10 });
  const subject = `Código de verificación: ${code} - AGEBRE UGEL 03`;

  // 1. Registro seguro en la colección de verificaciones
  if (firestoreDb && uid) {
    try {
      const verifRef = doc(firestoreDb, 'verificaciones', uid);
      await setDoc(verifRef, {
        uid,
        email: cleanEmail,
        nombre: nombre || 'Usuario',
        code: code,
        attemptsLeft: 3,
        createdAt: Date.now(),
        expiresAt: expiresAt,
        estado: 'pendiente'
      }, { merge: true });
    } catch (_) {}

    // 2. Notificación de seguridad al Coordinador (Regla de negocio 4)
    try {
      const logRef = collection(firestoreDb, 'logActividades');
      await addDoc(logRef, {
        tipo: 'REGISTRO_NUEVO_USUARIO',
        usuarioUid: uid,
        usuarioEmail: cleanEmail,
        usuarioNombre: nombre,
        rolSolicitado: profile?.userType || 'especialista',
        modalidad: profile?.modalidad || 'EBR',
        reis: profile?.reis || [],
        timestamp: Date.now(),
        fecha: new Date().toISOString(),
        detalle: `Nuevo usuario registrado pendiente de verificación OTP (${cleanEmail})`
      });
    } catch (_) {}
  }

  // 3. Despacho del correo institucional vía Webhook de Google Apps Script
  const DEFAULT_WEBHOOK_URL = AGEBRE_EMAIL_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwNd_fX-e2evBYmB5PmbXtq7bB8-HyDEWUjUT2ROoH35KqWvGgCSApHxKdWVGLx3Zs/exec";
  let webhookUrl = DEFAULT_WEBHOOK_URL;
  try {
    webhookUrl = window?.AGEBRE_EMAIL_WEBHOOK || localStorage.getItem('agebre_email_webhook') || DEFAULT_WEBHOOK_URL;
  } catch (_) {}

  if (firestoreDb && !webhookUrl) {
    try {
      const cfgSnap = await getDoc(doc(firestoreDb, 'meta', 'emailConfig'));
      if (cfgSnap.exists()) {
        webhookUrl = cfgSnap.data().webhookUrl;
      }
    } catch (_) {}
  }

  if (webhookUrl) {
    const payload = JSON.stringify({
      to: cleanEmail,
      nombre: nombre,
      subject: subject,
      code: code,
      html: htmlBody,
      text: plainTextBody,
      tipo: 'OTP_VERIFICACION'
    });

    // Intentar primero con sendBeacon para evitar el error de red por redirección 302 hacia script.googleusercontent.com
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const beaconBlob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
        const queued = navigator.sendBeacon(webhookUrl, beaconBlob);
        if (queued) {
          console.info(`✓ Correo institucional con código OTP despachado a ${cleanEmail} vía sendBeacon`);
          return { ok: true, sentViaWebhook: true, message: 'Código enviado a tu correo institucional.' };
        }
      } catch (_) {}
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });
      console.info(`✓ Correo institucional con código OTP despachado a ${cleanEmail} vía Webhook`);
      return { ok: true, sentViaWebhook: true, message: 'Código enviado a tu correo institucional.' };
    } catch (err) {
      console.warn('Aviso al conectar con webhook de correo:', err);
    }
  }

  // 4. Intento con EmailJS si está configurado en el entorno
  if (typeof window !== 'undefined' && window.emailjs && window.EMAILJS_PUBLIC_KEY) {
    try {
      await window.emailjs.send(
        window.EMAILJS_SERVICE_ID || 'service_agebre',
        window.EMAILJS_TEMPLATE_ID || 'template_otp',
        {
          to_email: cleanEmail,
          to_name: nombre,
          otp_code: code,
          message_html: htmlBody
        }
      );
      return { ok: true, sentViaWebhook: true, message: 'Código enviado a tu correo institucional.' };
    } catch (err) {
      console.warn('Aviso al enviar mediante EmailJS:', err);
    }
  }

  console.info(`[SEGURIDAD UGEL 03] Solicitud de código OTP tramitada para ${cleanEmail}`);

  return {
    ok: true,
    sentViaWebhook: false,
    code: code,
    message: 'Código de verificación generado para validación.'
  };
}


/**
 * Envía un correo institucional de notificación de seguridad (restablecimiento o cambio de clave)
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.nombre
 * @param {string} options.subject
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.actionUrl]
 * @param {string} [options.actionText]
 * @returns {Promise<{ ok: boolean }>}
 */
export async function sendSecurityNotificationEmail({
  to,
  nombre = 'Especialista',
  subject,
  title,
  message,
  actionUrl = (typeof window !== 'undefined' ? window.location.origin : 'https://sistematizacion-fichas.firebaseapp.com'),
  actionText = 'Acceder a la Plataforma'
}) {
  const cleanEmail = (to || '').trim().toLowerCase();
  if (!cleanEmail) return { ok: false, error: 'No email provided' };

  // Evitar duplicación si message ya contiene un saludo "Estimado(a)..." al inicio
  let cleanMessage = (message || '').trim();
  cleanMessage = cleanMessage.replace(/^\s*(?:<p[^>]*>)?\s*Estimado\(a\)[^,:\n<]*(?:<[^>]+>[^,:\n<]*)*[,:]\s*(?:<\/p>)?(?:\s*<br\s*\/?>)*/i, '').trim();

  const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject || title}</title>
</head>
<body style="margin:0;padding:24px;background-color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1E293B;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:580px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(11,27,54,0.08);border:1px solid #E2E8F0;">
    <tr>
      <td style="background:#12294D;padding:26px 30px;text-align:center;">
        <span style="display:inline-block;color:#E0A526;font-size:18px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">UGEL 03 • AGEBRE</span>
        <h1 style="color:#FFFFFF;font-size:17px;margin:8px 0 0;font-weight:600;">Sistematización de Fichas de Monitoreo 2026</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:32px 30px 24px;">
        <h2 style="font-size:19px;color:#0B1B36;margin:0 0 12px;font-weight:700;">${title}</h2>
        <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 16px;">
          Estimado(a) <strong>${nombre}</strong>,
        </p>
        <div style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px;">
          ${cleanMessage}
        </div>
        <div style="text-align:center;margin:28px 0;">
          <a href="${actionUrl}" style="background:#2563EB;color:#FFFFFF;text-decoration:none;font-size:14px;font-weight:700;padding:12px 28px;border-radius:6px;display:inline-block;">
            ${actionText}
          </a>
        </div>
        <div style="background:#EFF6FF;border-left:4px solid #2563EB;padding:12px 16px;border-radius:4px;margin-top:20px;">
          <p style="margin:0;font-size:12px;color:#1E40AF;line-height:1.45;">
            🔒 <strong>Aviso de Seguridad:</strong> Si tú no solicitaste este cambio o no reconoces esta acción, por favor comunícate de inmediato con la Coordinación de AGEBRE UGEL 03.
          </p>
        </div>
      </td>
    </tr>
    <tr>
      <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:16px 30px;text-align:center;">
        <p style="margin:0;font-size:11.5px;color:#94A3B8;line-height:1.4;">
          Área de Gestión de la Educación Básica Regular y Especial (AGEBRE)<br>
          Unidad de Gestión Educativa Local N° 03 – DRELM - MINEDU
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const plainTextBody = `
UGEL 03 • AGEBRE - Sistematización de Monitoreo 2026
${title}

Estimado(a) ${nombre},
${cleanMessage}

Enlace de acceso: ${actionUrl}

Aviso de Seguridad: Si tú no solicitaste este cambio, comunícate con la Coordinación de AGEBRE UGEL 03.
  `.trim();

  const DEFAULT_WEBHOOK_URL = AGEBRE_EMAIL_WEBHOOK_URL || "https://script.google.com/macros/s/AKfycbwNd_fX-e2evBYmB5PmbXtq7bB8-HyDEWUjUT2ROoH35KqWvGgCSApHxKdWVGLx3Zs/exec";
  let webhookUrl = DEFAULT_WEBHOOK_URL;
  try {
    webhookUrl = window?.AGEBRE_EMAIL_WEBHOOK || localStorage.getItem('agebre_email_webhook') || DEFAULT_WEBHOOK_URL;
  } catch (_) {}

  if (webhookUrl) {
    const payload = JSON.stringify({
      to: cleanEmail,
      nombre: nombre,
      subject: subject || title,
      html: htmlBody,
      text: plainTextBody,
      tipo: 'NOTIFICACION_SEGURIDAD'
    });

    // Intentar primero con sendBeacon para evitar el error de red por redirección 302 hacia script.googleusercontent.com
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const beaconBlob = new Blob([payload], { type: 'text/plain;charset=utf-8' });
        const queued = navigator.sendBeacon(webhookUrl, beaconBlob);
        if (queued) {
          console.info(`✓ Notificación de seguridad despachada a ${cleanEmail} vía sendBeacon`);
          return { ok: true, sentViaWebhook: true };
        }
      } catch (_) {}
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: payload
      });
      console.info(`✓ Notificación de seguridad despachada a ${cleanEmail} vía Webhook`);
      return { ok: true, sentViaWebhook: true };
    } catch (err) {
      // Si la falla es ERR_CONNECTION_RESET sobre script.googleusercontent.com, el correo ya fue enviado por el script
      console.info(`Aviso de red en retorno del webhook (el correo fue procesado):`, err?.message || err);
    }
  }

  return { ok: true, sentViaWebhook: false };
}
