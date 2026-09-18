/**
 * Siembra los 6 tipos de ficha (con sus secciones e ítems) en Firestore.
 * Ejecútalo UNA sola vez después de desplegar, desde la carpeta scripts/.
 *
 * 1) npm install firebase-admin
 * 2) Descarga una clave de cuenta de servicio:
 *    Firebase Console → Configuración del proyecto → Cuentas de servicio →
 *    "Generar nueva clave privada" → guarda el archivo como
 *    scripts/serviceAccountKey.json (NO lo subas a git público).
 * 3) node seed.js
 */
const fichaTypes = require('./seed-fichaTypes.json');
const serviceAccount = require('./serviceAccountKey.json');

let app;
let db;
try {
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const existing = getApps();
  app = existing.length ? existing[0] : initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore(app);
} catch (e) {
  const admin = require('firebase-admin');
  const cred = (admin.credential && admin.credential.cert) ? admin.credential.cert(serviceAccount) : serviceAccount;
  app = admin.apps && admin.apps.length ? admin.apps[0] : admin.initializeApp({ credential: cred });
  db = admin.firestore();
}

async function main() {
  const batch = db.batch();
  for (const [docId, data] of Object.entries(fichaTypes)) {
    batch.set(db.collection('fichaTypes').doc(docId), data);
  }

  // Solo crea meta/bootstrap si todavía no existe, para no reiniciar el
  // "ya hay un administrador" si vuelves a correr este script más adelante.
  const bootstrapRef = db.collection('meta').doc('bootstrap');
  const bootstrapSnap = await bootstrapRef.get();
  if (!bootstrapSnap.exists) {
    batch.set(bootstrapRef, { claimed: false });
  }

  await batch.commit();
  console.log('Listo: ' + Object.keys(fichaTypes).length + ' tipos de ficha sembrados en Firestore.');
  if (!bootstrapSnap.exists) {
    console.log('La próxima persona que inicie sesión en el sistema quedará como Administrador automáticamente.');
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('Error sembrando datos:', err);
  process.exit(1);
});
