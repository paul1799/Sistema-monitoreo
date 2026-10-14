/**
 * migrate-phase1.js — Script de migración Fase 1
 * UGEL 03 · AGEBRE · Sistema de Fichas de Monitoreo
 *
 * QUÉ HACE:
 *   1. Agrega regla_nivel y version a todos los fichaTypes en Firestore
 *   2. Agrega status, visitaNumero, snapshot_ie y snapshot_directivos
 *      a todas las submissions existentes
 *   3. NO modifica los valores de respuestas (cero riesgo de pérdida de datos)
 *
 * PRERREQUISITOS:
 *   - Haber revocado y renovado serviceAccountKey.json (hallazgo S1)
 *   - GOOGLE_APPLICATION_CREDENTIALS apuntando a la nueva clave, O
 *     haber hecho: gcloud auth application-default login
 *
 * EJECUCIÓN:
 *   node scripts/migrate-phase1.js [--dry-run]
 *   (con --dry-run solo muestra lo que haría, sin escribir a Firestore)
 *
 * ROLLBACK:
 *   Los campos añadidos son NUEVOS (no sobreescriben campos existentes).
 *   Para revertir: eliminar los campos status, visitaNumero, snapshot_ie,
 *   snapshot_directivos, version, regla_nivel de cada documento.
 */

'use strict';

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

/* ─── Configuración ──────────────────────────────────────────────────── */

const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('\n⚠️  MODO DRY-RUN: No se escribirá nada en Firestore.\n');
}

/* ─── Inicialización del Admin SDK ───────────────────────────────────── */
let app;
try {
  const serviceAccount = require('./serviceAccountKey.json');
  app = initializeApp({ credential: cert(serviceAccount) });
  console.log('✅ Usando serviceAccountKey.json');
} catch (e) {
  console.error('❌ Error al inicializar con serviceAccountKey.json:', e.message);
  console.log('Intentando fallback a ADC...');
  app = initializeApp({ projectId: 'sistematizacion-fichas' });
}

const db = getFirestore(app);

/* ─── Reglas de nivel por fichaType ─────────────────────────────────── */

const REGLA_NIVEL_JEC = {
  tipo: 'conteo',
  cuenta: 'si',
  rangos: [
    { nivel: 'Implementación lograda',    min: 24, max: 31, estado_panel: 'Logrado' },
    { nivel: 'Implementación parcial',    min: 12, max: 23, estado_panel: 'En proceso' },
    { nivel: 'Implementación incipiente', min: 0,  max: 11, estado_panel: 'Inicio' },
  ],
};

const REGLA_NIVEL_GENERICA = {
  tipo: 'porcentaje',
  umbrales: [
    { nivel: 'Logrado',     min: 85, estado_panel: 'Logrado' },
    { nivel: 'En proceso',  min: 70, estado_panel: 'En proceso' },
    { nivel: 'Por mejorar', min: 0,  estado_panel: 'Inicio' },
  ],
};

/** Mapa fichaTypeId → regla_nivel */
const REGLA_POR_TIPO = {
  ft_msejec_2do:          REGLA_NIVEL_JEC,      // JEC: conteo de Sí (24-31 Logrado)
  ft_materiales_cebe:     REGLA_NIVEL_GENERICA,
  ft_coord_tutoria_jec:   REGLA_NIVEL_GENERICA,
  ft_gestion_ugel03_ebr:  REGLA_NIVEL_GENERICA,
  ft_gestion_cebe:        REGLA_NIVEL_GENERICA,
  ft_rubricas_aula:       REGLA_NIVEL_GENERICA,
  ft_directivo:           REGLA_NIVEL_GENERICA,
};

/** Mapa fichaTypeId → número de versión inicial */
const VERSION_POR_TIPO = {
  ft_msejec_2do:          { anio: 2026, momento: '2do',  estado: 'publicada' },
  ft_materiales_cebe:     { anio: 2026, momento: null,   estado: 'publicada' },
  ft_coord_tutoria_jec:   { anio: 2026, momento: null,   estado: 'publicada' },
  ft_gestion_ugel03_ebr:  { anio: 2026, momento: '2do',  estado: 'publicada' },
  ft_gestion_cebe:        { anio: 2026, momento: null,   estado: 'publicada' },
  ft_rubricas_aula:       { anio: 2026, momento: null,   estado: 'publicada' },
  ft_directivo:           { anio: 2026, momento: null,   estado: 'publicada' },
};

/* ─── Migración de fichaTypes ────────────────────────────────────────── */

async function migrarFichaTypes() {
  console.log('\n── PASO 1: Migrar fichaTypes ──────────────────────────────');
  const snap = await db.collection('fichaTypes').get();

  let actualizados = 0;
  let omitidos = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = doc.id;

    const yaActualizado = !!data.regla_nivel;

    if (yaActualizado) {
      console.log(`  ⏭  ${id}: ya tiene regla_nivel — omitido`);
      omitidos++;
      continue;
    }

    const regla_nivel = REGLA_POR_TIPO[id] || REGLA_NIVEL_GENERICA;
    const version = VERSION_POR_TIPO[id] || { anio: 2026, momento: null, estado: 'publicada' };

    const cambios = {
      regla_nivel,
      version,
      migradoFase1: true,
      migradoFase1At: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log(`  ✏️  ${id}: agregaré regla_nivel (tipo: ${regla_nivel.tipo}) y version`);

    if (!DRY_RUN) {
      await db.collection('fichaTypes').doc(id).update(cambios);
    }

    actualizados++;
  }

  console.log(`\n  ✅ fichaTypes: ${actualizados} actualizados · ${omitidos} omitidos`);
  return actualizados;
}

/* ─── Migración de submissions ───────────────────────────────────────── */

async function migrarSubmissions() {
  console.log('\n── PASO 2: Migrar submissions ─────────────────────────────');
  const snap = await db.collection('submissions').get();

  let actualizados = 0;
  let omitidos = 0;
  let errores = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const id = doc.id;

    // Detectar si ya fue migrado
    const yaActualizado = data.status !== undefined && data.visitaNumero !== undefined;
    if (yaActualizado) {
      console.log(`  ⏭  ${id.slice(0, 10)}…: ya tiene status/visitaNumero — omitido`);
      omitidos++;
      continue;
    }

    // Construir snapshot_ie con los datos disponibles en el documento
    const snapshot_ie = {
      ie:           data.ie || '',
      codigoLocal:  data.codigoLocal || data.codigo || '',
      codigoModular: data.codigoModular || '',
      rei:          data.rei || data.red || '',
      distrito:     data.distrito || '',
    };

    // Construir snapshot_directivos con lo que tengamos (mínimo)
    const snapshot_directivos = data.director
      ? [{ apellidosNombres: data.director, cargo: 'Director(a)', fuente: 'snapshot_fase1' }]
      : [];

    const cambios = {
      status:               'enviada',      // todas las existentes = ya enviadas
      visitaNumero:         1,              // asumir primera visita (D3 pendiente)
      snapshot_ie,
      snapshot_directivos,
      migradoFase1:         true,
      migradoFase1At:       admin.firestore.FieldValue.serverTimestamp(),
    };

    const ie = data.ie || '(IE desconocida)';
    const ft = data.fichaTypeId || '(tipo desconocido)';
    console.log(`  ✏️  ${id.slice(0, 10)}…: ${ie} · ${ft}`);

    if (!DRY_RUN) {
      try {
        await db.collection('submissions').doc(id).update(cambios);
        actualizados++;
      } catch (err) {
        console.error(`  ❌ Error en ${id}: ${err.message}`);
        errores++;
      }
    } else {
      actualizados++;
    }
  }

  console.log(`\n  ✅ submissions: ${actualizados} actualizadas · ${omitidos} omitidas · ${errores} errores`);
  return { actualizados, errores };
}

/* ─── Validación posterior ───────────────────────────────────────────── */

async function validar() {
  console.log('\n── PASO 3: Validación ─────────────────────────────────────');
  const snap = await db.collection('submissions').get();

  let sinStatus = 0;
  let sinVisita = 0;

  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.status)        sinStatus++;
    if (!d.visitaNumero)  sinVisita++;
  }

  if (sinStatus + sinVisita === 0) {
    console.log('  ✅ Todas las submissions tienen status y visitaNumero');
  } else {
    console.warn(`  ⚠️  ${sinStatus} sin status · ${sinVisita} sin visitaNumero`);
  }
}

/* ─── Punto de entrada ───────────────────────────────────────────────── */

async function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('  Migración Fase 1 — Fichas de Monitoreo UGEL 03');
  console.log(`  Modo: ${DRY_RUN ? 'DRY-RUN (sin escritura)' : 'ESCRITURA REAL'}`);
  console.log('════════════════════════════════════════════════════════');

  try {
    await migrarFichaTypes();
    const { errores } = await migrarSubmissions();
    if (!DRY_RUN) await validar();

    console.log('\n════════════════════════════════════════════════════════');
    if (errores > 0) {
      console.error('  ⛔ Migración completada CON ERRORES. Revisar arriba.');
      process.exit(1);
    } else {
      console.log(`  🎉 Migración ${DRY_RUN ? '(dry-run) ' : ''}completada exitosamente.`);
    }
  } catch (err) {
    console.error('\n❌ Error fatal durante la migración:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
