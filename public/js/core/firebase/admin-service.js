/* =========================================================================
   admin-service.js — Gestión administrativa directa de Firebase Authentication
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

// Credenciales institucionales de servicio para administración de cuentas
const SERVICE_ACCOUNT = {
  projectId: "sistematizacion-fichas",
  clientEmail: "firebase-adminsdk-fbsvc@sistematizacion-fichas.iam.gserviceaccount.com",
  privateKeyPem: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDEd1vU95aYkHMC\nS4ytnbrhdfVqpXiq7q4n4mW7/9sGxuLikDjGvFXjGOCqwlqbW+v+KwVqo2pfNaOm\n038l391+MSnDJBFn28gH2NnUGOcR2z16s+aedHPGPf5x+ehezhLClHWkFmqj+UDt\nh/oypkuRHRVC/itc7HxTKTahWsB5WE01TBDeIVTaNiP4cfv6IrvbP/yQuK7J4OTs\n1dwsNjT8yBVzKF1rgAcDJsauYvwg48VZXTc6Mt6oebE4rpd22GP8VRMFyEG57W7K\neKhX8lfBguttt/LtqOl6OJZyjQ1NCx3JPAURDFU11DqjtI+g9S+E9l15hOK5OAob\nO3meRB1FAgMBAAECggEAEG4d8S3Ce6BK6fR4/5T7CbtkaoaLlJnw2ReLJAGF5udv\nlnxyrxYVhbAxK76ktqzli8Q7x/sCHJO/C6bQ0ZFK8/B3GmF0DjA4ZoWZU+5ANsNT\nvST54qMBAqFxG8WHTBRmR70EKJSSVwOzjRnLz/wNwkVBH7DjXfpN/GNsNOrCwXL+\nPP1MGy3NETmy6ah4CjEQBSyvO3xKy1Q8mhtRla3XDTE/l6QgZYEAQAZgoxOIpDbn\nFUL43WZJPQz8wcyMsObmZh6I4X1sTnIfm3wU3wMTY/xgpgqbZkUNzuu7jhSsLhj7\nv1GNVpMxB/CEmKrnAXURb7UJyx4dvPlr+DTuELwG6QKBgQDnDZFyT+lvCp5e74hN\nhHQeAugVt5gGlZKbS0mXBw5pAqy/uykKTrT/DvEZGFBN98AiWAeiwwLWD8T7e2El\nMArdBprMnymHLxJXQzLIR0n6uYr3my/TbGt6Z5Hs+pcUf6oWLkg6dO7znDD4Ro8b\ncrkhI9/M+JITYDQBwCWKq5XdHQKBgQDZrcssV3TaYK6Fq01NahTyKsBw0YNLEp2U\nSnl49QaBgn6Z9DfjLhqBkjVX8pJxQ5YJUD8YaaKOtJqbzXkMtdNjBDXj4/v7HKk6\nRlmywMa0lYrhezKLGsk947fjFMOGlhdjfbLS3BTOIkhNt5Ynhq+qbsBu46wKfRpE\nyomzUPtQSQKBgG58m3+pXPwffMnzCx/eZdRwGWFBMO59GeUu5FrXIfnvMIJi0mY+\naujI0Vvpt4UBIxyJMeWQEUwhsFV9k1/AEIHPBbkxpx8g0ElwNdl11ZeSoDR1PjKA\n1whqfGpxDkvcHI6MxTdG8XkGyJgAzbAXdRW23O9cMiYXy+bGZm1gTcK1AoGBALdk\nMl4jOHGbLq2zCqeEDi2QUx05hnHDNztuGzUKyfZmqJ6wID2n4/Dx6zszRKlkFY23\nK9E3fhrYkcFdtPQ+Y99x9q0OsIZ5OSG9j2iH/WC69IzPLGABqzYXGh+YqLEzWOm\nzPfVLzoTq/K+DyUx1eGy+TDzY0ha6by3HpgSTAjxAoGAA65oq8qVNiNKBDLkbg/k\ndspsdZTVJXwDphN2zDly7kkWMmuxyTk6dfBxyX1o0YoBg6sRfL6vCyOiSLVrVfb/\ntTWK7yyNiaUYTloT8Xzr26hQ3AFDQu3bkU9Zk/j490karRc+srDu7UcHQOcN2JSR\nrtVc+HccOcuto67DPYkiLKk=\n-----END PRIVATE KEY-----\n"
};

/**
 * Convierte un ArrayBuffer o Uint8Array a cadena Base64Url segura (RFC 7515)
 */
function base64UrlEncode(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Convierte una cadena Base64 estándar a Uint8Array
 */
function base64ToUint8Array(base64) {
  const binaryString = atob(base64.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Genera un token OAuth2 de Google firmado con la cuenta de servicio institucional
 */
async function getGoogleServiceAccessToken() {
  const cleanKey = SERVICE_ACCOUNT.privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const binaryKey = base64ToUint8Array(cleanKey);

  // Importar clave privada en formato PKCS#8 estándar con Web Crypto API
  const cryptoKey = await window.crypto.subtle.importKey(
    'pkcs8',
    binaryKey.buffer,
    {
      name: 'RSASSA-PKCS1v1_5',
      hash: 'SHA-256'
    },
    false,
    ['sign']
  );

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: SERVICE_ACCOUNT.clientEmail,
    sub: SERVICE_ACCOUNT.clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase'
  };

  const textEncoder = new TextEncoder();
  const encodedHeader = base64UrlEncode(textEncoder.encode(JSON.stringify(header)));
  const encodedClaim = base64UrlEncode(textEncoder.encode(JSON.stringify(claim)));
  const dataToSign = textEncoder.encode(`${encodedHeader}.${encodedClaim}`);

  const signature = await window.crypto.subtle.sign('RSASSA-PKCS1v1_5', cryptoKey, dataToSign);
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${encodedHeader}.${encodedClaim}.${encodedSignature}`;

  // Canjear JWT por token de acceso OAuth2
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
          '&assertion=' + encodeURIComponent(jwt)
  });

  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error_description || tokenData.error || 'No se pudo autorizar la operación administrativa con Google.');
  }

  return tokenData.access_token;
}

/**
 * Restablece y actualiza directamente la contraseña de un usuario en Firebase Authentication
 * sin enviar correos genéricos de Google ni requerir enlaces de verificación externos.
 * 
 * @param {Object} params
 * @param {string} params.email - Correo del usuario a actualizar
 * @param {string} [params.uid] - UID del usuario si se conoce
 * @param {string} params.newPassword - Nueva contraseña a asignar
 * @returns {Promise<{ ok: boolean, email: string, localId: string }>}
 */
export async function adminDirectResetPassword({ email, uid = null, newPassword }) {
  const targetEmail = (email || '').trim().toLowerCase();
  if (!targetEmail || !targetEmail.includes('@')) {
    throw new Error('El correo del usuario no es válido.');
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  }

  // 1. Obtener token de administración autorizado
  const accessToken = await getGoogleServiceAccessToken();
  const projectId = SERVICE_ACCOUNT.projectId;

  // 2. Si no tenemos UID, buscar al usuario por correo
  let targetUid = uid;
  if (!targetUid) {
    const lookupRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: [targetEmail] })
      }
    );
    const lookupData = await lookupRes.json();
    if (lookupData.users && lookupData.users.length > 0) {
      targetUid = lookupData.users[0].localId;
    } else {
      throw new Error(`No se encontró una cuenta de acceso registrada en Firebase Authentication para ${targetEmail}.`);
    }
  }

  // 3. Actualizar la contraseña directamente en Firebase Authentication
  const updateRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        localId: targetUid,
        email: targetEmail,
        password: newPassword
      })
    }
  );

  const updateData = await updateRes.json();
  if (!updateRes.ok || updateData.error) {
    const msg = updateData.error?.message || 'Error al actualizar la contraseña en Firebase Authentication.';
    throw new Error(msg);
  }

  return {
    ok: true,
    email: updateData.email || targetEmail,
    localId: updateData.localId || targetUid
  };
}
