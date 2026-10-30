# Revisión de arquitectura y reorganización del proyecto

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03 · **app en producción** (Firebase Hosting, sin build, ES Modules nativos)
**Fecha:** 30/10/2026
**Objetivo:** reorganizar el proyecto para que sea **escalable, liviano y fácil de entender**, clasificando por **función** para poder identificar y mejorar cada archivo.

---

## 1. Inventario actual (lo relevante)

### 1.1 Capas existentes

| Capa | Carpeta | Qué contiene |
| :-- | :-- | :-- |
| Entrada / orquestación | `public/js/` | `app.js`, `auth.js`, `firestore.js`, `portal.js`, bridges |
| Dominio de fichas | `public/js/calc/`, `public/js/` | escalas, reglas, detectores, evaluador, motor, catálogo, formularios por ficha |
| UI (pantallas) | `public/js/ui/` | dashboard, registrar, plantillas, consolidado, colegios, concursos, usuarios, responsables |
| PDF | `public/js/pdf/` + `pdf-*.js` | core, fichas, consolidado, concursos |
| Excel | `public/js/matriz/` + `exportar*.js` | matriz, tablero, concursos |
| Directorio | `public/js/directorio/` | padrón de directivos |
| Bridges (compatibilidad) | raíz de `js/` | `calcEngine.js`, `ui.js`, `pdf-template.js`, `pdf-monitoreo.js`, `matrizConfig.js`, `exportarMatriz.js`, `directorio.js` |

### 1.2 Archivos más grandes (deuda principal)

| Archivo | Líneas | Responsabilidad actual |
| :-- | --: | :-- |
| `ui/concursos-tab.js` | **6 024** | Registros + podios + nombres + tipos + UI |
| `ui/consolidado.js` | **4 279** | Filtros + KPIs + reporte por ítem + matriz + tabla + exportación |
| `ui/plantillas.js` | **3 851** | Lista + editor visual + JSON + preview + guardado |
| `pdf-concursos.js` | **3 396** | JFEN + JEDPA + actas + fichas |
| `ebr-gestion.js` | **3 116** | Formulario + cálculo + PDF de EBR |
| `ui/registrar.js` | **2 816** | Render + precarga + guardado + PDF individual |
| `ui/colegios-tab.js` | **2 249** | Padrón + importación + cobertura |
| `jec-monitoreo.js` | **1 923** | Formulario + cálculo + PDF JEC |
| `jec-1er-monitoreo.js` | **1 887** | Formulario 1er momento |
| `prite-gestion.js` | **1 821** | Formulario + cálculo + PDF PRITE |
| `cebe-gestion.js` | **1 691** | Formulario + cálculo + PDF CEBE |
| `exportarTableroEBR.js` | **1 096** | Tablero Excel EBR |
| `ui/responsables-tab.js` | **1 071** | Directorio + importación |
| `app.js` | **1 052** | Init + listeners + sanitización + auth |
| `ui/modales.js` | **1 041** | Confirmación + configurar descarga |
| `pdf/consolidado-v2.js` | **1 006** | Reporte consolidado |
| `matriz/hoja-generica.js` | **900** | Hoja matriz genérica |
| `pdf/ficha-jec.js` | **876** | PDF JEC |
| `ui/scoring.js` | **821** | Escalas + agregación + render por ítem |
| `ui/usuarios.js` | **800** | Usuarios y roles |

**Total aproximado:** ~50 000 líneas de JS en `public/js/`.

### 1.3 Estado de la unificación (ya aplicada)

✅ Ya implementado:
- `calc/score-engine.js` exporta `buildResponseValMap` y `resolveItemValue` con prioridad anti-colisión y validación de unicidad.
- `reportes-datos.js` (`computeItemAgg`) y `pdf/ficha-individual.js` ya usan esos helpers.
- `pdf/consolidado-v2.js` ya generaliza la distribución (`escala_1_3`, `nivel_1_4`, `si_no`).

⏳ Pendiente (lo que aborda esta reorganización):
- `SCALES`/`escalaDef` como registro único de escalas.
- `origen`/`schemaVersion`/`globalIdx` en las fichas creadas desde web.
- Separar la sanitización de `app.js` (solo fichas oficiales).
- Dividir los archivos gigantes y clasificar por función.
- Quitar bridges redundantes y cargar PDF/Excel de forma diferida.

---

## 2. Diagnóstico arquitectónico

| # | Problema | Síntoma | Impacto |
| :-- | :-- | :-- | :-- |
| 1 | **Archivos gigantes con varias responsabilidades** | 4 archivos superan 3 000 líneas | Difícil de leer, revisar y testear |
| 2 | **Mezcla de capas** | Formularios (EBR/JEC/CEBE/PRITE) contienen cálculo + PDF + UI | Cambios de UI tocan lógica y viceversa |
| 3 | **Bridges permanentes** | `calcEngine.js`, `ui.js`, `pdf-template.js`, `pdf-monitoreo.js`, `matrizConfig.js`, `exportarMatriz.js`, `directorio.js` | Ruido, ciclos de importación, dos nombres para lo mismo |
| 4 | **Lógica duplicada** | `RESPONSE_OPTIONS`/`OPTION_COLORS` en `scoring.js` + `escala_1_3` en PDF + `puntajeItem` en `escalas.js` | Cambios en 3 lugares |
| 5 | **Heurísticas por nombre** | `app.js` y reportes deciden por texto (JEC/EBR/Directivo) | Fichas nuevas se ocultan o se fusionan |
| 6 | **Carga completa del PDF/Excel** | `ui.js` importa `pdf-template.js` (todo el stack) | La app carga ~7 000 líneas de PDF aunque no se exporte |
| 7 | **Versionado manual `?v=`** | Cada archivo importado lleva fecha | Fácil de olvidar; inconsistente |
| 8 | **Sin tests de arquitectura** | Existen runners `test-*.html` puntuales | No hay red de seguridad para mover archivos |

---

## 3. Arquitectura objetivo (clasificada por función)

```text
public/js/
├── app/                          # Arranque y navegación (sin lógica de fichas)
│   ├── bootstrap.js              # Firebase, listeners, render inicial
│   ├── auth-flow.js              # login/logout callbacks
│   ├── navigation.js             # tabs, módulos, rutas
│   └── catalog-sanitizer.js      # unificación/reparación SOLO de fichas oficiales
├── core/                         # Infraestructura transversal (sin DOM de fichas)
│   ├── firebase/
│   │   ├── config.js
│   │   ├── auth.js
│   │   └── firestore-adapter.js
│   ├── state/app-state.js
│   └── utils/
│       ├── text.js               # esc, normalizeText, slug
│       ├── numbers.js
│       ├── dates.js
│       └── dom.js                # toasts, modales base, scroll
├── domain/                       # Reglas puras (sin DOM) — testeables
│   ├── fichas/
│   │   ├── catalogo-base.js      # 8 plantillas oficiales
│   │   ├── detector.js           # isFichaJec / Ebr / Cebe / Prite…
│   │   ├── scales.js             # SCALES + escalaDef (registro único)
│   │   ├── rules.js              # umbrales y rangos
│   │   ├── item-identity.js      # domKey, globalIdx, num, schemaVersion
│   │   ├── engine.js             # evaluateFicha (fuente única)
│   │   └── engine-helpers.js     # buildResponseValMap, resolveItemValue
│   ├── concursos/helpers.js
│   └── directorio/normalize.js
├── features/                     # Pantallas / flujos (DOM)
│   ├── portal/index.js
│   ├── dashboard/index.js
│   ├── registrar/
│   │   ├── form-render.js
│   │   ├── preload.js
│   │   ├── save.js
│   │   └── fichas/{ebr,jec,jec-1er,cebe,prite}.js
│   ├── plantillas/
│   │   ├── list.js
│   │   ├── editor.js
│   │   ├── payload.js            # schema v2 + validación
│   │   └── preview.js
│   ├── reportes/
│   │   ├── filters.js
│   │   ├── kpis.js
│   │   ├── item-report.js
│   │   ├── matrix.js
│   │   ├── table.js
│   │   └── export.js
│   ├── colegios/{index,import,edit}.js
│   ├── responsables/index.js
│   ├── usuarios/index.js
│   ├── alertas/index.js
│   ├── concursos/{registros,podios,nombres,tipos}.js
│   └── shared/modals/{download-config,confirm,cleanup}.js
├── pdf/                          # Documentos (carga diferida)
│   ├── core.js
│   ├── fichas/{individual,ebr,jec,consolidado}.js
│   └── concursos/{jfen,jedpa,actas}.js
├── exports/                      # Excel (carga diferida)
│   ├── matriz/{index,hoja-generica,hoja-jec,orquestador}.js
│   ├── tablero/index.js
│   └── concursos/index.js
├── compat/                       # Bridges temporales de migración
│   ├── calc-engine.js
│   ├── ui.js
│   ├── pdf-template.js
│   ├── pdf-monitoreo.js
│   ├── matriz-config.js
│   ├── exportar-matriz.js
│   └── directorio.js
└── index.js                      # barrel público
```

### Regla de clasificación

| Prefijo | Contiene | No contiene |
| :-- | :-- | :-- |
| `core/` | Infraestructura, utilidades, estado | Reglas de fichas |
| `domain/` | Reglas puras, sin DOM, testeables | `document`, `window` |
| `features/` | Pantallas y flujos, DOM | Cálculo puro |
| `pdf/` | Generación de documentos | UI de pantallas |
| `exports/` | Excel/CSV | UI |
| `compat/` | Re-exports de rutas antiguas | Lógica propia |

---

## 4. Reglas de migración (producción)

1. **Cero cambio de comportamiento.** Es una reorganización, no una refactorización funcional.
2. **Compatibilidad total.** Cada archivo movido deja un *bridge* en su ruta antigua que **re-exporta** lo mismo (`export * from '…'`). Nada deja de funcionar.
3. **Migración incremental y desplegable.** Una fase = un PR = un deploy.
4. **Un archivo, una responsabilidad.** Objetivo: ≤ 400 líneas por archivo; los grandes se dividen por flujo.
5. **Sin dependencias nuevas.** Vanilla ES Modules; nada de bundlers ni frameworks.
6. **Sin ciclos.** `domain/` no importa `features/`; `pdf/`/`exports/` se importan de forma diferida.
7. **Carga diferida** de PDF y Excel con `import()` dinámico al momento de exportar (reduce el peso inicial).
8. **`?v=` conservado** durante la migración (no romper caché/imports); se normaliza después.
9. **Tests por fase**: runners `test-*.html` + verificación manual de registro/reporte/PDF.
10. **Respaldos y rollback**: copia de archivos fuera de `public/` + `firebase hosting:rollback`.

---

## 5. Fases de ejecución

| Fase | Alcance | Riesgo | Entregable |
| :-- | :-- | :-- | :-- |
| **F0** | Congelar: respaldos, tag de release, checklist | Bajo | Backup + plan |
| **F1** | Crear `core/`, `domain/`; mover `calc/`, `core-utils`, `state`, `firebase` | Bajo | Dominio aislado y testeable |
| **F2** | Dividir `ui/consolidado.js` → `features/reportes/*` | Medio | 6 archivos ≤ 400 líneas |
| **F3** | Dividir `ui/plantillas.js` → `features/plantillas/*` + schema v2 | Medio | Editor modular |
| **F4** | Dividir `ui/registrar.js` + formularios por ficha | Medio | Registrar modular |
| **F5** | Dividir `ui/concursos-tab.js` → `features/concursos/*` | Medio | Concursos modular |
| **F6** | Dividir `pdf-concursos.js` y `matriz/*` por tipo | Bajo | PDF/Excel modulares |
| **F7** | Carga diferida de `pdf/` y `exports/` | Bajo | Arranque más liviano |
| **F8** | Eliminar bridges y unificar `?v=` | Bajo | Estructura limpia |
| **F9** | Tests de arquitectura por escala | Bajo | Red de seguridad |

---

## 6. El prompt senior (copiar y pegar)

```text
Actúa como un ingeniero senior de frontend. Trabajas sobre una aplicación web estática
(HTML + JavaScript ES Modules nativos, SIN build, SIN bundler) del Sistema de Monitoreo
AGEBRE-UGEL 03 2026, desplegada en producción con Firebase Hosting (proyecto
`sistematizacion-fichas`).
Raíz: C:\Users\agebre-ebr\Desktop\PAUL - 2026\2026\Sistema-monitoreo-main

OBJETIVO
Reorganizar la arquitectura del proyecto para que sea ESCALABLE, LIVIANO y FÁCIL DE
ENTENDER, clasificando por función (core / domain / features / pdf / exports / compat).
Es una REORGANIZACIÓN: NO cambies el comportamiento, la UI ni los cálculos.

ESTADO ACTUAL (no lo repitas, ya está hecho)
- `calc/score-engine.js` ya exporta `buildResponseValMap` y `resolveItemValue`, y
  `reportes-datos.js` / `pdf/ficha-individual.js` ya los usan.
- `pdf/consolidado-v2.js` ya generaliza la distribución de escalas.
- El proyecto es vanilla ES Modules; los `?v=` en imports son parte del patrón actual.

PRINCIPIOS OBLIGATORIOS
1) CERO cambio de comportamiento. Solo mover, dividir y re-exportar.
2) COMPATIBILIDAD TOTAL: cada archivo movido deja un bridge en su ruta antigua que
   re-exporta exactamente lo mismo. La app debe seguir funcionando en cada fase.
3) MIGRACIÓN INCREMENTAL: una fase = un PR desplegable. No hagas todo de golpe.
4) UN ARCHIVO, UNA RESPONSABILIDAD: objetivo ≤ 400 líneas por archivo.
5) DOMINIO PURO: `domain/` no toca `document`, `window` ni `localStorage`.
   `features/` sí puede.
6) SIN CICLOS: `domain/` no importa `features/`; `features/` no importa `pdf/` de forma
   estática; `pdf/` y `exports/` se cargan con `import()` dinámico al exportar.
7) SIN DEPENDENCIAS NUEVAS ni bundlers. Solo ES Modules y rutas relativas.
8) CONSERVA los `?v=` existentes durante la migración; NO los elimines todavía.
9) TESTS POR FASE: ejecuta/abre los runners `public/test-*.html` que existan y verifica
   registro, reporte por ítem, PDF consolidado, PDF individual y matriz Excel.
10) RESPALDOS: copia los archivos a `_backup_pre_reorg/` (fuera de `public/`) antes de mover.
    No ejecutes despliegues; entrega diff y resultados.

ESTRUCTURA OBJETIVO
public/js/
├── app/          bootstrap.js, auth-flow.js, navigation.js, catalog-sanitizer.js
├── core/         firebase/{config,auth,firestore-adapter}.js, state/app-state.js,
│                 utils/{text,numbers,dates,dom}.js
├── domain/       fichas/{catalogo-base,detector,scales,rules,item-identity,engine,
│                 engine-helpers}.js, concursos/helpers.js, directorio/normalize.js
├── features/     portal/, dashboard/, registrar/{form-render,preload,save,
│                 fichas/{ebr,jec,jec-1er,cebe,prite}}.js, plantillas/{list,editor,
│                 payload,preview}.js, reportes/{filters,kpis,item-report,matrix,table,
│                 export}.js, colegios/, responsables/, usuarios/, alertas/,
│                 concursos/{registros,podios,nombres,tipos}.js,
│                 shared/modals/{download-config,confirm,cleanup}.js
├── pdf/          core.js, fichas/{individual,ebr,jec,consolidado}.js,
│                 concursos/{jfen,jedpa,actas}.js
├── exports/      matriz/, tablero/, concursos/
├── compat/       calc-engine.js, ui.js, pdf-template.js, pdf-monitoreo.js,
│                 matriz-config.js, exportar-matriz.js, directorio.js
└── index.js

MAPA DE MOVIMIENTO (resumen)
- app.js                         → app/bootstrap.js + app/catalog-sanitizer.js + app/auth-flow.js
- auth.js / firestore.js / config→ core/firebase/*
- ui/state.js                    → core/state/app-state.js
- ui/core-utils.js               → core/utils/{text,numbers,dates,dom}.js (dividir por función)
- calc/*                         → domain/fichas/* (escalas→scales, reglas→rules,
                                    detectors→detector, evaluador→evaluador,
                                    score-engine→engine + engine-helpers)
- catalogo-plantillas-base.js    → domain/fichas/catalogo-base.js
- instrumentoGestionEBR.js       → domain/fichas/instrumentos/ebr.js
- reportes-datos.js              → domain/reportes/datasets.js + domain/fichas/item-agg.js
- ui/scoring.js                  → domain/fichas/scales.js (RESPONSE_OPTIONS/COLORS,
                                    puntajeItem) + features/reportes/item-report.js
                                    (renderItemReportHtml) + domain/fichas/item-agg.js
- ui/consolidado.js              → features/reportes/{filters,kpis,item-report,matrix,
                                    table,export}.js (dividir por bloque)
- ui/plantillas.js               → features/plantillas/{list,editor,payload,preview}.js
- ui/registrar.js                → features/registrar/{form-render,preload,save}.js
- ebr-gestion.js/jec-monitoreo.js/jec-1er-monitoreo.js/cebe-gestion.js/prite-gestion.js
                                 → features/registrar/fichas/{ebr,jec,jec-1er,cebe,prite}.js
- ui/colegios-tab.js             → features/colegios/{index,import,edit}.js
- ui/responsables-tab.js         → features/responsables/index.js
- ui/usuarios.js                 → features/usuarios/index.js
- ui/dashboard.js                → features/dashboard/index.js
- ui/alertas.js + alertas.js     → features/alertas/index.js
- ui/concursos-tab.js            → features/concursos/{registros,podios,nombres,tipos}.js
- ui/jec-reportes.js             → domain/fichas/jec-reportes.js
- ui/modales.js                  → features/shared/modals/{download-config,confirm}.js +
                                    core/utils/dom.js
- ui/modales-limpieza.js         → features/shared/modals/cleanup.js
- pdf-template.js                → compat/pdf-template.js (bridge) + pdf/index.js (barrel)
- pdf-monitoreo.js               → compat/pdf-monitoreo.js (bridge)
- pdf-core.js                    → pdf/core.js
- pdf/ficha-*.js, consolidado-*.js → pdf/fichas/*
- pdf-concursos.js               → pdf/concursos/{jfen,jedpa,actas}.js
- matrizConfig.js                → compat/matriz-config.js (bridge)
- matriz/*                       → exports/matriz/*
- exportarMatriz.js              → compat/exportar-matriz.js (bridge) + exports/matriz/index.js
- exportarTableroEBR.js          → exports/tablero/index.js
- concursos-excel.js             → exports/concursos/index.js
- directorio.js                  → compat/directorio.js (bridge)
- directorio/*                   → domain/directorio/* + features/directorio/*
- portal.js                      → features/portal/index.js

FASES (ejecuta en orden, una por PR)
F1  Crear core/ y domain/; mover calc/, core-utils, state y firebase. Bridges en rutas
    antiguas. Verificar que la app carga sin errores.
F2  Dividir ui/consolidado.js en features/reportes/* (filters, kpis, item-report, matrix,
    table, export). Dejar ui/consolidado.js como bridge.
F3  Dividir ui/plantillas.js en features/plantillas/*; implementar el payload schema v2
    (origen:'builder', schemaVersion:2, globalIdx, num global, validación) SIN migrar datos.
F4  Dividir ui/registrar.js y los formularios por ficha en features/registrar/*.
F5  Dividir ui/concursos-tab.js en features/concursos/*.
F6  Dividir pdf-concursos.js y matriz/* por tipo.
F7  Carga diferida: `pdf/` y `exports/` solo con import() dinámico al exportar.
F8  Eliminar bridges, unificar barrels `index.js` y normalizar `?v=`.
F9  Añadir un runner de arquitectura: para cada escala, crear ficha sintética, registrar
    y verificar que resumen = reporte por ítem = PDF.

CRITERIOS DE ACEPTACIÓN POR FASE
- La app inicia sin errores de consola y sin imports rotos.
- Registro, Reporte por ítem, PDF consolidado, PDF individual y Matriz Excel funcionan igual.
- Ningún archivo nuevo supera ~400 líneas; ninguna carpeta mezcla capas.
- No hay ciclos de importación nuevos.
- El diff es solo de movimiento/división/re-export (sin cambios de lógica).
- Se reportan: archivos movidos, bridges creados, líneas por archivo y resultados de tests.
```

---

## 7. Resultado esperado

| Métrica | Hoy | Objetivo |
| :-- | :-- | :-- |
| Archivos > 3 000 líneas | 4 | 0 |
| Archivos > 1 000 líneas | 16 | ≤ 3 (PDF/core) |
| Líneas cargadas al iniciar | ~7 000 de PDF + Excel | Solo lo necesario (PDF/Excel diferidos) |
| Bridges | 7 permanentes | 0 tras F8 |
| Capas mezcladas | Sí (cálculo+UI+PDF por ficha) | Separadas (`domain`/`features`/`pdf`) |
| Tiempo para ubicar una función | Buscar en archivos de 3 000+ líneas | Carpeta por función y archivo ≤ 400 líneas |

---

*Fin del documento.*
