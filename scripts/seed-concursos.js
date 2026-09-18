/**
 * scripts/seed-concursos.js
 * Siembra los 6 tipos de concurso oficiales de la UGEL 03 (2026) en Firestore.
 * Colección: tiposConcurso
 *
 * Uso:
 *   node seed-concursos.js
 */

let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {}

let app;
let db;
try {
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const existing = getApps();
  const options = serviceAccount ? { credential: cert(serviceAccount) } : {};
  app = existing.length ? existing[0] : initializeApp(options);
  db = getFirestore(app);
} catch (e) {
  const admin = require('firebase-admin');
  const cred = serviceAccount
    ? ((admin.credential && admin.credential.cert) ? admin.credential.cert(serviceAccount) : serviceAccount)
    : undefined;
  app = admin.apps && admin.apps.length ? admin.apps[0] : admin.initializeApp(cred ? { credential: cred } : {});
  db = admin.firestore();
}

const SEED_TIPOS_CONCURSO = [
  {
    id: 'jma',
    nombre: 'Premio Nacional de Narrativa y Ensayo José María Arguedas',
    tipoParticipacion: 'individual',
    tieneGenero: false,
    tieneDisciplina: false,
    tieneTituloTrabajo: true,
    etiquetaTitulo: 'Título del trabajo',
    categorias: ['A - Fábula', 'B - Cuento (EBA)', 'C - Ensayo (EBR)', 'D - Ensayo (EBA)'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: [],
  },
  {
    id: 'onem',
    nombre: 'Olimpiada Nacional Escolar de Matemática (ONEM)',
    tipoParticipacion: 'individual',
    tieneGenero: false,
    tieneDisciplina: false,
    tieneTituloTrabajo: false,
    categorias: [
      'Alfa - Nivel 1',
      'Alfa - Nivel 2',
      'Alfa - Nivel 3',
      'Beta - Nivel 1',
      'Beta - Nivel 2',
      'Beta - Nivel 3'
    ],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: [],
  },
  {
    id: 'peru_lee',
    nombre: 'Concurso Nacional de Comprensión Lectora El Perú Lee',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: false,
    tieneTituloTrabajo: false,
    categorias: ['A', 'B', 'C', 'D', 'E'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
    disciplinasSugeridas: [],
  },
  {
    id: 'eureka',
    nombre: 'Feria Escolar Nacional de Ciencia y Tecnología Eureka',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Área de participación',
    tieneTituloTrabajo: true,
    etiquetaTitulo: 'Título del proyecto',
    categorias: ['D', 'E'],
    disciplinasSugeridas: ['Indagación Científica', 'Soluciones Tecnológicas', 'Indagación Social'],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor(a)'],
  },
  {
    id: 'jfen',
    nombre: 'Juegos Florales Escolares Nacionales (JFEN)',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Arte / Disciplina',
    tieneTituloTrabajo: false,
    categorias: ['D', 'E', 'F', 'H'],
    disciplinasSugeridas: [
      'Artes escénicas / Danza tradicional',
      'Artes escénicas / Danza moderna',
      'Artes escénicas / Teatro',
      'Artes musicales / Canto solista',
      'Artes musicales / Ensamble instrumental',
      'Artes visuales / Pintura',
      'Artes visuales / Fotografía',
      'Artes visuales / Escultura',
      'Artes literarias / Poesía',
      'Artes digitales / Cortometraje'
    ],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
  },
  {
    id: 'jedpa',
    nombre: 'Juegos Escolares Deportivos y Paradeportivos (JEDPA)',
    tipoParticipacion: 'individual',
    tieneGenero: true,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Disciplina deportiva',
    tieneTituloTrabajo: false,
    categorias: ['A', 'B', 'C'],
    disciplinasSugeridas: [
      'Ajedrez',
      'Atletismo',
      'Natación',
      'Gimnasia',
      'Tenis de Mesa',
      'Judo',
      'Karate',
      'Taekwondo',
      'Bádminton',
      'Paraatletismo',
      'Paranatación'
    ],
    rolesParticipante: ['Deportista'],
    rolesAsesor: ['Entrenador', 'Delegado'],
  }
];

async function main() {
  const batch = db.batch();
  for (const c of SEED_TIPOS_CONCURSO) {
    const docRef = db.collection('tiposConcurso').doc(c.id);
    const { id, ...data } = c;
    batch.set(docRef, { ...data, createdAt: Date.now() }, { merge: true });
  }

  await batch.commit();
  console.log('Listo: 6 tipos de concurso oficiales sembrados exitosamente en Firestore.');
  process.exit(0);
}

main().catch(err => {
  console.error('Error sembrando concursos:', err);
  process.exit(1);
});

module.exports = { SEED_TIPOS_CONCURSO };
