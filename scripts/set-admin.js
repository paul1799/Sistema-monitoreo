/**
 * Asigna el rol de Administrador a una persona por su correo, directamente
 * con el SDK de administrador (esto SALTA las reglas de Firestore, así que
 * funciona incluso si el bootstrap automático falló o si ya hay un
 * administrador y quieres agregar otro a mano).
 *
 * Requisitos: los mismos que seed.js — scripts/serviceAccountKey.json
 * presente, y haber corrido "npm install" dentro de scripts/.
 *
 * Uso:
 *   node set-admin.js correo@ejemplo.com
 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./serviceAccountKey.json');

const email = process.argv[2];
if (!email) {
  console.error('Uso: node set-admin.js correo@ejemplo.com');
  process.exit(1);
}

const { getAuth } = require('firebase-admin/auth');
const app = initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  const user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) {
    console.error('No encontré ningún usuario con ese correo. Esa persona debe haber iniciado sesión en el sistema web AL MENOS UNA VEZ antes de poder asignarle un rol.');
    process.exit(1);
  }

  await db.collection('roles').doc(user.uid).set(
    { email, role: 'admin', createdAt: Date.now() },
    { merge: true }
  );

  // Marca el bootstrap como reclamado, para que nadie más se vuelva admin
  // automáticamente por accidente.
  await db.collection('meta').doc('bootstrap').set({ claimed: true }, { merge: true });

  console.log('Listo: ' + email + ' ahora es Administrador. Pídele que cierre sesión y vuelva a entrar.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
