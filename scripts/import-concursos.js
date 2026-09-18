/**
 * scripts/import-concursos.js
 * 
 * Script completo y listo para producción que:
 * 1) Verifica e inicializa las credenciales de Firebase Admin (serviceAccountKey.json).
 * 2) Siembra automáticamente los 6 tipos de concurso oficiales en Firestore (colección: tiposConcurso) si no existen.
 * 3) Cruza y autocompleta los códigos modulares faltantes con el padrón de colegios de la UGEL 03.
 * 4) Importa y normaliza los 83 ganadores oficiales (Resoluciones Directorales 2026) a la colección: concursoRegistros.
 * 5) Utiliza IDs deterministas para evitar duplicaciones si el script se ejecuta más de una vez.
 *
 * Uso:
 *   node import-concursos.js
 *   o
 *   npm run import-concursos
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// 1. Ubicar la clave de cuenta de servicio (serviceAccountKey.json)
let serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
}
if (!fs.existsSync(serviceAccountPath)) {
  console.error('\n❌ ERROR: No se encontró "serviceAccountKey.json" en scripts/ ni en la raíz del proyecto.');
  console.error('Descárgalo desde Firebase Console -> Configuración del proyecto -> Cuentas de servicio -> Generar nueva clave privada.');
  console.error('Guarda el archivo como "scripts/serviceAccountKey.json" y vuelve a ejecutar este comando.\n');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);

// 2. Ubicar archivo de datos de concursos (soporta concurso-data.json o concursos-data.json)
let registrosRaw = null;
let sourceFileName = '';
const posiblesDatos = [
  path.join(__dirname, 'concursos-data.json'),
  path.join(__dirname, 'concurso-data.json'),
  path.join(__dirname, '..', 'public', 'data', 'concurso-data.json')
];

for (const p of posiblesDatos) {
  if (fs.existsSync(p)) {
    try {
      registrosRaw = JSON.parse(fs.readFileSync(p, 'utf8'));
      sourceFileName = path.basename(p);
      break;
    } catch (e) {
      console.warn(`Aviso: Error leyendo ${p}:`, e.message);
    }
  }
}

if (!Array.isArray(registrosRaw) || registrosRaw.length === 0) {
  console.error('\n❌ ERROR: No se pudo cargar la lista de ganadores de concursos.');
  console.error('Asegúrate de que exista "scripts/concurso-data.json" con formato JSON válido.\n');
  process.exit(1);
}

// 3. Inicializar Firebase Admin (compatible con Firebase Admin v14+ y versiones anteriores)
let app;
let db;

try {
  // Para firebase-admin v10+ y v14+ (modular estándar)
  const { initializeApp, cert, getApps } = require('firebase-admin/app');
  const { getFirestore } = require('firebase-admin/firestore');
  const existingApps = getApps();
  app = existingApps.length > 0 ? existingApps[0] : initializeApp({
    credential: cert(serviceAccount)
  });
  db = getFirestore(app);
} catch (eMod) {
  // Fallback para versiones clásicas de firebase-admin
  const admin = require('firebase-admin');
  const cred = (admin.credential && typeof admin.credential.cert === 'function')
    ? admin.credential.cert(serviceAccount)
    : (typeof admin.cert === 'function' ? admin.cert(serviceAccount) : serviceAccount);
  const apps = typeof admin.getApps === 'function' ? admin.getApps() : (admin.apps || []);
  app = apps.length > 0 ? apps[0] : admin.initializeApp({ credential: cred });
  db = typeof admin.firestore === 'function' ? admin.firestore() : require('firebase-admin/firestore').getFirestore(app);
}

// 4. Catálogo oficial de tipos de concurso (UGEL 03 - 2026)
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
    etiquetaDisciplina: 'Área de indagación',
    tieneTituloTrabajo: true,
    etiquetaTitulo: 'Título del proyecto',
    categorias: ['D', 'E'],
    disciplinasSugeridas: [
      'Indagación Científica',
      'Soluciones Tecnológicas',
      'Indagación Social'
    ],
    rolesParticipante: ['Estudiante'],
    rolesAsesor: ['Docente Asesor'],
  },
  {
    id: 'jfen',
    nombre: 'Juegos Florales Escolares Nacionales (JFEN)',
    tipoParticipacion: 'grupal',
    tieneGenero: false,
    tieneDisciplina: true,
    etiquetaDisciplina: 'Disciplina artística',
    tieneTituloTrabajo: false,
    categorias: ['D', 'E', 'F', 'H'],
    disciplinasSugeridas: [
      'Artes escénicas / Danza tradicional',
      'Artes escénicas / Danza moderna',
      'Artes escénicas / Teatro',
      'Artes escénicas / Baile urbano',
      'Artes musicales / Canto solista',
      'Artes musicales / Ensamble instrumental',
      'Artes musicales / Banda escolar de música',
      'Artes visuales / Pintura',
      'Artes visuales / Fotografía',
      'Artes visuales / Escultura',
      'Artes visuales / Arte tradicional',
      'Artes visuales / Corto Audiovisual',
      'Artes literarias / Poesía',
      'Arte, diseño y tecnología / Historietas interactivas'
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
      'Básquet',
      'Fútbol',
      'Futsal',
      'Handball',
      'Voleibol',
      'Judo',
      'Karate',
      'Taekwondo'
    ],
    rolesParticipante: ['Deportista'],
    rolesAsesor: ['Entrenador', 'Delegado'],
  }
];

// Mapeo normalizado de nombres a IDs
const TIPO_ID_MAP = {
  'Premio Nacional de Narrativa y Ensayo José María Arguedas': 'jma',
  'Olimpiada Nacional Escolar de Matemática (ONEM)': 'onem',
  'Concurso Nacional de Comprensión Lectora El Perú Lee': 'peru_lee',
  'Feria Escolar Nacional de Ciencia y Tecnología Eureka': 'eureka',
  'Juegos Florales Escolares Nacionales (JFEN)': 'jfen',
  'Juegos Escolares Deportivos y Paradeportivos (JEDPA)': 'jedpa'
};

// Generador de ID determinista para evitar duplicados en re-ejecuciones
function generateDocId(r, index) {
  const tipo = r.tipoConcursoId || 'tc';
  const res = (r.resolucionRef || '').replace(/[^0-9]/g, '').slice(0, 8);
  const cat = (r.categoria || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8);
  const ie = (r.institucion || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 12);
  const disc = (r.disciplina || '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 8);
  const gen = (r.genero || '').slice(0, 1).toLowerCase();
  const p1 = (r.participantes && r.participantes[0] && r.participantes[0].dni)
    ? r.participantes[0].dni.replace(/[^0-9]/g, '')
    : (r.participantes && r.participantes[0] && r.participantes[0].nombres)
      ? r.participantes[0].nombres.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 10)
      : String(index + 1);

  return `rd2026_${tipo}_${res}_${cat}_${disc}_${gen}_${ie}_${p1}`.replace(/_+/g, '_');
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log('\n============================================================');
  console.log('   INICIANDO IMPORTACIÓN DE CONCURSOS ESCOLARES (UGEL 03)  ');
  console.log('============================================================\n');
  console.log(`✓ Archivo de datos: ${sourceFileName} (${registrosRaw.length} registros cargados)`);

  // Paso 1: Asegurar que el catálogo de tipos de concurso esté sembrado en Firestore
  console.log('\n[1/3] Verificando catálogo oficial en Firestore ("tiposConcurso")...');
  try {
    const tiposSnap = await db.collection('tiposConcurso').get();
    if (tiposSnap.empty) {
      console.log('  -> Colección vacía. Sembrando los 6 tipos de concurso oficiales...');
      const batchTipos = db.batch();
      for (const t of SEED_TIPOS_CONCURSO) {
        const { id, ...data } = t;
        batchTipos.set(db.collection('tiposConcurso').doc(id), {
          ...data,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      await batchTipos.commit();
      console.log('  ✓ 6 tipos de concurso creados exitosamente en "tiposConcurso".');
    } else {
      console.log(`  ✓ Catálogo listo con ${tiposSnap.size} tipos de concurso existentes.`);
    }
  } catch (err) {
    console.warn('  ⚠️ Aviso verificando tiposConcurso:', err.message);
  }

  // Paso 2: Cargar padrón de instituciones para autocompletar código modular si falta
  console.log('\n[2/3] Cargando padrón de colegios para enriquecer código modular...');
  const colMap = new Map();
  try {
    let colSnap = await db.collection('colegios').get();
    if (colSnap.empty) {
      colSnap = await db.collection('instituciones').get();
    }
    colSnap.forEach(doc => {
      const d = doc.data();
      const name = d.ie || d.nombre || '';
      if (name) colMap.set(name.trim().toLowerCase(), d.codigoLocal || d.codigoModular || '');
    });
    console.log(`  ✓ Padrón cargado: ${colMap.size} instituciones registradas.`);
  } catch (err) {
    console.warn('  ⚠️ Aviso: no se pudo precargar padrón de colegios:', err.message);
  }

  // Paso 3: Normalizar registros
  console.log('\n[3/3] Normalizando e importando registros a "concursoRegistros"...');
  let codigosCompletados = 0;

  const registrosNormalizados = registrosRaw.map((r, idx) => {
    const tipoNombre = r.tipoConcurso || r.tipoConcursoNombre || '';
    const tipoId = TIPO_ID_MAP[tipoNombre] || (tipoNombre ? tipoNombre.toLowerCase().replace(/[^a-z0-9]+/g, '_') : 'otro');

    // Completar código modular si no venía en la resolución
    let codMod = r.codigoModular || '';
    if (!codMod && r.institucion) {
      const match = colMap.get(r.institucion.trim().toLowerCase());
      if (match) {
        codMod = match;
        codigosCompletados++;
      }
    }

    const docId = generateDocId({ ...r, tipoConcursoId: tipoId }, idx);

    return {
      docId,
      data: {
        tipoConcursoId:     tipoId,
        tipoConcursoNombre: tipoNombre,
        etapa:              r.etapa || 'UGEL',
        categoria:          r.categoria || '',
        genero:             r.genero || null,
        disciplina:         r.disciplina || null,
        institucion:        r.institucion || '',
        codigoModular:      codMod,
        tituloTrabajo:      r.tituloTrabajo || null,
        seudonimo:          r.seudonimo || null,
        puesto:             r.puesto || '',
        participantes:      Array.isArray(r.participantes) ? r.participantes : [],
        asesores:           Array.isArray(r.asesores) ? r.asesores : [],
        resolucionRef:      r.resolucionRef || '',
        fecha:              r.fecha || '',
        responsable:        'Importación RD UGEL 03 (2026)',
        importadoDesdePdf:  true,
        createdAt:          Date.now(),
        updatedAt:          Date.now()
      }
    };
  });

  // Escritura por lotes (batches de hasta 350 para no superar el límite de 500)
  const chunks = chunk(registrosNormalizados, 350);
  let total = 0;

  for (const group of chunks) {
    const batch = db.batch();
    for (const item of group) {
      const docRef = db.collection('concursoRegistros').doc(item.docId);
      batch.set(docRef, item.data, { merge: true });
    }
    await batch.commit();
    total += group.length;
    console.log(`  ... ${total}/${registrosNormalizados.length} registros guardados en Firestore.`);
  }

  console.log('\n============================================================');
  console.log('            ✓ IMPORTACIÓN COMPLETADA EXITOSAMENTE           ');
  console.log('============================================================');
  console.log(`Total registros procesados: ${total}`);
  if (codigosCompletados > 0) {
    console.log(`Códigos modulares autocompletados desde padrón: ${codigosCompletados}`);
  }

  // Resumen por concurso
  const counts = {};
  for (const r of registrosNormalizados) {
    counts[r.data.tipoConcursoNombre] = (counts[r.data.tipoConcursoNombre] || 0) + 1;
  }
  console.log('\nResumen de registros por tipo de concurso:');
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  • ${k}: ${v} registros`);
  }
  console.log('\nLos datos están listos en la base de datos Firestore y visibles en tu app web.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n❌ ERROR DURANTE LA IMPORTACIÓN:', err);
  process.exit(1);
});
