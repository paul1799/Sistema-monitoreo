/**
 * seed-plantillas-fase2.js — Siembra los 3 nuevos fichaTypes de Fase 2
 * UGEL 03 · AGEBRE · Sistema de Fichas de Monitoreo
 *
 * Nuevas plantillas:
 *   ft_ebr_gestion_1er  — EBR Gestión Escolar 1er momento (19 ítems + matriz rúbricas)
 *   ft_prite_gestion    — PRITE Gestión Escolar (16 ítems, multi-visita V1/V2/V3)
 *   ft_cebe_lectora     — CEBE Experiencia Lectora (15 ítems, multi-visita V1/V2/V3)
 *
 * EJECUCIÓN:
 *   node scripts/seed-plantillas-fase2.js [--dry-run]
 *
 * IDEMPOTENTE: si el documento ya existe, solo agrega 'bloques[]' y 'regla_nivel'
 * si no los tiene. No sobreescribe datos existentes de otro modo.
 */

'use strict';

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const path      = require('path');
const plantillas = require('./seed-plantillas-fase2.json');

const DRY_RUN = process.argv.includes('--dry-run');

if (DRY_RUN) {
  console.log('\n⚠️  MODO DRY-RUN: No se escribirá nada en Firestore.\n');
}

/* ─── Inicialización ──────────────────────────────────────────────────── */
let app;
try {
  const key = require('./serviceAccountKey.json');
  app = initializeApp({ credential: cert(key) });
  console.log('✅ Usando credenciales de serviceAccountKey.json');
} catch (e) {
  console.error('❌ Error al inicializar con serviceAccountKey.json:', e.message);
  console.log('Intentando fallback a ADC...');
  app = initializeApp({ projectId: 'sistematizacion-fichas' });
}

const db = getFirestore(app);

/* ─── Siembra ─────────────────────────────────────────────────────────── */
async function main() {
  console.log('\n════════════════════════════════════════════════════════');
  console.log('  Seed Fase 2 — 3 nuevos fichaTypes');
  console.log(`  Modo: ${DRY_RUN ? 'DRY-RUN' : 'ESCRITURA REAL'}`);
  console.log('════════════════════════════════════════════════════════\n');

  const ids = Object.keys(plantillas);
  let creados = 0;
  let actualizados = 0;

  for (const id of ids) {
    const data = plantillas[id];
    const docRef = db.collection('fichaTypes').doc(id);

    console.log(`📄 ${id}`);
    console.log(`   Nombre : ${data.nombre}`);
    console.log(`   Ítems  : ${data.secciones.reduce((s, sec) => s + sec.items.length, 0)} (${data.secciones.length} secciones)`);
    console.log(`   Bloques: ${data.bloques ? data.bloques.length : 0}`);

    if (!DRY_RUN) {
      const snap = await docRef.get();

      if (!snap.exists) {
        // Documento nuevo: crear con todos los campos
        await docRef.set({
          ...data,
          creadoEn: FieldValue.serverTimestamp(),
          seedFase2: true,
        });
        console.log(`   ✅ Creado\n`);
        creados++;
      } else {
        // Documento existe: solo agregar bloques y regla_nivel si faltan
        const existing = snap.data();
        const updates = {};

        if (!existing.bloques && data.bloques) {
          updates.bloques = data.bloques;
        }
        if (!existing.regla_nivel && data.regla_nivel) {
          updates.regla_nivel = data.regla_nivel;
        }
        if (!existing.version && data.version) {
          updates.version = data.version;
        }

        if (Object.keys(updates).length > 0) {
          updates.actualizadoFase2 = FieldValue.serverTimestamp();
          await docRef.update(updates);
          console.log(`   ✏️  Actualizado (campos: ${Object.keys(updates).join(', ')})\n`);
          actualizados++;
        } else {
          console.log(`   ⏭  Sin cambios (ya tiene todos los campos)\n`);
        }
      }
    } else {
      console.log(`   🔍 (dry-run: no se escribe)\n`);
      creados++;
    }
  }

  console.log('════════════════════════════════════════════════════════');
  console.log(`  ✅ ${creados} creados · ${actualizados} actualizados`);
  if (!DRY_RUN) {
    console.log('\n  Para verificar, abre la consola de Firebase Firestore:');
    console.log('  https://console.firebase.google.com/ → fichaTypes');
  }
  console.log('════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n❌ Error fatal:', err.message);
  process.exit(1);
});
