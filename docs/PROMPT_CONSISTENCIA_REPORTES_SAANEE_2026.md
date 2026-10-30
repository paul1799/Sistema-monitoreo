# Prompt reorganizado — Consistencia entre resumen y Reporte por ítem (fichas dinámicas)

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03 · **app en producción**
**Caso:** Ficha "Ficha de monitoreo del servicio SAANEE 2026" (creada desde el editor web)
**Fecha:** 30/10/2026

---

## 1. Evidencia (capturas del Reporte de Monitoreo)

| Elemento | Valor mostrado |
| :-- | :-- |
| KPI "Cumplimiento promedio" | **86 %** |
| Dona "Distribución de resultados" | Logrado 1 (100 %) |
| Ficha registrada (tabla) | **86 % · Logrado** |
| Evolución por N.° de visita (V3) | **86 %** |
| **Reporte por ítem — todas las secciones** | **100 % · Logrado** |
| **Reporte por ítem — todos los ítems** | **"Sí: 1 (100 %) · No: 0 (0 %)"** |

**Contradicción:** el resumen calcula **86 %** (lo que implica ~3 ítems en "No" sobre 22), pero el Reporte por ítem muestra **100 % y "Sí" en los 22 ítems**. Los PDF se generan desde esta misma sección de reportes, por lo que heredan el error.

---

## 2. Causa raíz: dos motores de agregación distintos

| Ruta | Función | Uso | Resultado actual |
| :-- | :-- | :-- | :-- |
| Resumen / KPIs / tabla | `calcScore` (`public/js/calc/score-engine.js:47-327`) | `buildStatsList` → `st.pct` | **86 %** |
| Reporte por ítem + PDF sección IV | `computeItemAgg` (`public/js/reportes-datos.js:383-462`) | `consolidado.js:1912` / `consolidado-v2.js:749` | **100 %** |

Ambas reciben **las mismas `respuestas`**, pero resuelven el valor de cada ítem con algoritmos distintos:

- `calcScore` construye un mapa `valMap` (`score-engine.js:148-200`) y busca con prioridad:
  `id` → `texto` (normalizado) → posición `seccionIdx/itemIdx` → `domKey` → `seccion+num` → `id` normalizado → patrones `num_/it_/jec_`. **Para `id` gana el último valor; para texto gana el primero.**
- `computeItemAgg` usa `respuestas.find(...)` con otra prioridad (`reportes-datos.js:415-444`): `id` → `texto` → posición → `domKey` → `seccion+num` → `id` normalizado → texto. **`find` siempre toma el primero.**

Con respuestas duplicadas o con IDs de plantilla regenerados, ambos resuelven **valores distintos** → el resumen ve "no" y el ítem ve "si". Esto también afecta a la **ficha individual** (`ficha-individual.js:735`, que solo busca por `id`).

**Consecuencia:** mientras no haya una **única fuente de resolución de respuestas**, el resumen, el Reporte por ítem y los PDF seguirán divergiendo.

---

## 3. Prompt exacto (copiar y pegar)

```text
Contexto del proyecto
App web estática (HTML + JavaScript ES Modules, sin build) del "Sistema de Monitoreo
AGEBRE-UGEL 03 2026", desplegada en producción con Firebase Hosting (proyecto
`sistematizacion-fichas`). Los PDF se generan con jsPDF.
Raíz: C:\Users\agebre-ebr\Desktop\PAUL - 2026\2026\Sistema-monitoreo-main

REGLAS DE PRODUCCIÓN (obligatorias):
- No migres ni escribas datos en Firestore. Este cambio es de lectura/agregación.
- Cambios mínimos y quirúrgicos; no renombres exports públicos ni cambies firmas.
- NO cambies el resultado numérico de `calcScore` para las fichas actuales: solo extrae
  sus helpers y verifica que su salida sea idéntica.
- No toques reglas, índices, `functions/` ni `firebase.json`.
- Crea respaldos fuera de `public/` antes de editar (p. ej. `_backup_pre_produccion/`).
- No ejecutes despliegues; entrega archivos editados, diff y resultados de verificación.
- Si algo requiere migrar datos, detente y explica el riesgo.

PROBLEMA A CORREGIR (inconsistencia interna)
Ficha "Ficha de monitoreo del servicio SAANEE 2026" (creada desde el editor web, 22 ítems,
tipoRespuesta "si_no"). En Reportes:
- Resumen/KPI: 86 % (equivalente a 19 "Sí" y 3 "No" sobre 22 ítems).
- Reporte por ítem (y PDF sección IV): 100 % y "Sí: 1 (100 %)" en los 22 ítems.
El PDF individual también muestra "si" donde el formulario tiene "No".
Debe haber UNA sola verdad: resumen, Reporte por ítem y PDF deben coincidir.

FASE 1 — FUENTE ÚNICA DE RESOLUCIÓN DE RESPUESTAS (núcleo del arreglo)
1) En `public/js/calc/score-engine.js`:
   a. Extrae a funciones exportadas la construcción del mapa de respuestas (hoy en
      `calcScore`, líneas ~148-200): `buildResponseValMap(respuestas)` que devuelva
      exactamente el mismo objeto `valMap` (mismas claves y mismas reglas:
      último valor gana para `id`/`domKey`, primero gana para claves de texto).
   b. Extrae a `resolveItemValue(valMap, it, sec, sIdx, iIdx)` la búsqueda por ítem
      (hoy líneas ~216-253), con la MISMA prioridad: id → texto normalizado →
      idx_seccion_item → seccion+num → domKey → sX_iY_id → id normalizado → num_/it_/jec_.
   c. `calcScore` debe seguir usando esos helpers y producir EXACTAMENTE el mismo resultado
      que antes (verifica con un registro real: 86 % para la ficha SAANEE).
2) En `public/js/reportes-datos.js`, en `computeItemAgg`:
   a. Reemplaza el `respuestas.find(...)` (líneas ~415-444) por:
      const valMap = buildResponseValMap(s.respuestas || []);
      const valor = resolveItemValue(valMap, it, sec, sIdx, iIdx);
   b. El resto (conteos, `puntajeItem(escala, valor)`, `pct`, `avg`) se conserva.
3) En `public/js/pdf/ficha-individual.js` (rama genérica, ~línea 735):
   usa `buildResponseValMap` + `resolveItemValue` en lugar de `respuestas.find(r => r.id === it.id)`.
4) En `public/js/ui/registrar.js` (precargado de respuestas, ~línea 1795):
   usa el mismo resolver para que el formulario muestre el mismo valor que el resumen.

FASE 2 — ETIQUETAS LEGIBLES EN LA FICHA INDIVIDUAL
En `ficha-individual.js` renderiza el valor según `fichaType.tipoRespuesta`:
- si_no: si→"Sí", no→"No", na→"N/A"
- ips: inicio→"Inicio", proceso→"Proceso", logrado→"Logrado", na→"N/A"
- escala_1_3: 3→"3 (Logrado)", 2→"2 (En proceso)", 1→"1 (Inicio)", na→"N/A"
- nivel_1_4: 4→"IV", 3→"III", 2→"II", 1→"I", na→"N/A"
Si no hay respuesta: "Sin datos". Mantén el diseño actual del PDF.

FASE 3 — DISTRIBUCIÓN EN EL REPORTE CONSOLIDADO (PDF sección IV)
En `public/js/pdf/consolidado-v2.js` (bloque `distParts`/`pctMap`, ~líneas 827-871):
- si_no: conserva "Sí" / "No" (un ítem con 1 "no" debe mostrar "No: 1 (100 %)" y 0 %).
- escala_1_3: claves "3","2","1" → "Logrado (3)", "En proceso (2)", "Inicio (1)".
- nivel_1_4: claves "4","3","2","1" → "IV","III","II","I".
- N/A: `counts.na + counts.nc`.
- Mantén el redondeo por mayor residuo (suma 100 %).

FASE 4 — CONSISTENCIA DE SECCIONES
En `public/js/ui/consolidado.js`:
- La barra de cada sección del Reporte por ítem debe usar el MISMO porcentaje que la
  sección correspondiente de `calcScore` (`st.secciones[].pct`), no solo el promedio de ítems.
  Si `computeItemAgg` ya coincide tras la Fase 1, mantén el fallback existente (~líneas 1912-1921)
  y no dupliques lógica.

VERIFICACIÓN OBLIGATORIA (manual, sin servidor):
Usa la ficha SAANEE ya registrada (1 ficha, 22 ítems, 3 "No", resumen 86 %):
1. Reporte por ítem: los 3 ítems en "No" deben mostrar 0 % y "No: 1 (100 %)"; los demás 100 %.
2. El promedio de los 22 ítems debe dar 86 %, igual que el KPI y la fila de la ficha.
3. PDF consolidado (con "Incluir reporte por ítem"): sección IV debe mostrar "No" y el % correcto.
4. PDF individual: debe mostrar "No" en los ítems correspondientes y "Sí" en el resto.
5. Revisar una ficha con escala_1_3 y otra con nivel_1_4: distribución visible.
6. EBR, CEBE, PRITE, Directivo y Rúbricas: sin cambios en sus porcentajes.

CRITERIOS DE ACEPTACIÓN:
- Resumen, Reporte por ítem y PDF muestran el MISMO resultado para la misma ficha.
- La opción "No" se refleja en todos los niveles (ítem, sección, KPI, PDF).
- `calcScore` conserva sus valores actuales (verificar 86 % en la ficha SAANEE).
- Sin duplicados nuevos ni cambios en Firestore.
- Reporta archivos modificados, líneas y el diff resultante.
```

---

## 4. Checklist de verificación

| # | Prueba | Esperado |
| :- | :-- | :-- |
| 1 | Reporte por ítem de la ficha SAANEE | 3 ítems en 0 % / "No: 1 (100 %)" |
| 2 | Promedio de ítems vs KPI | Ambos **86 %** |
| 3 | Barra de secciones | Coincide con `calcScore` |
| 4 | PDF consolidado sección IV | Muestra "No" y % correcto |
| 5 | PDF individual | Muestra "Sí"/"No"/"N/A" legibles |
| 6 | Fichas EBR/CEBE/PRITE/Directivo | Sin regresiones |
| 7 | Firestore | Sin cambios de datos ni duplicados |

---

*Fin del documento.*
