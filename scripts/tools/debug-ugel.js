const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function run() {
  const subs = await db.collection('submissions').get();
  subs.forEach(d => {
    console.log('SUB:', d.id, d.data().institucion, '| UGEL:', d.data().ugel, '| RED:', d.data().red);
  });
  const cols = await db.collection('colegios').get();
  cols.forEach(d => {
    if (d.data().ie && d.data().ie.includes('GUADALUPE')) {
      console.log('COL:', d.data().ie, '| DEP:', d.data().dependencia, '| REI:', d.data().rei, '| GESTION:', d.data().tipoGestion);
    }
  });
}
run().catch(console.error);
