# Prompt — Corrección del mapeo ítem↔respuesta en fichas creadas desde la web

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03 · **app en producción**
**Caso:** Ficha "Ficha de monitoreo del servicio SAANEE 2026" (creada desde el editor web)
**Fecha:** 30/10/2026

---

## 1. Evidencia (capturas)

### 1.1 Formulario de registro (lo que el usuario marcó)

| Ítems | Selección |
| :-- | :-- |
| 1–18 | **Sí** |
| **19** ("Promueve estrategias de enriquecimiento curricular.") | **NO** |
| 20–22 | **Sí** |

→ El formulario tiene **1 solo "No"**.

### 1.2 Reporte por ítem (lo que muestra el sistema)

| Sección | Ítem | Resultado mostrado |
| :-- | :-- | :-- |
| V. DIMENSIÓN 1 (6 ind) | **4** ("Cuenta con directorio actualizado de II.EE. atendidas.") | **Inicio · 0 % · No: 1 (100 %)** |
| VII. DIMENSIÓN 3 (6 ind) | **4** ("Asesora a la identificación de barreras… en docentes.") | **Inicio · 0 % · No: 1 (100 %)** |
| VIII. DIMENSIÓN 5 (4 ind) | **4** ("Promueve estrategias de enriquecimiento curricular.") | Inicio · 0 % · No: 1 (100 %) ✅ (correcto) |
| Resto | — | 100 % · Logrado |

→ El reporte muestra **3 "No"** (86 %), aunque el formulario tiene **1**.

### 1.3 Patrón detectado

Los "No" fantasma están en el **4.º ítem de cada sección con ≥4 ítems** (V, VII y VIII). Es decir, **todos los ítems con índice `itemIdx = 3`** (0-based) o con el mismo `num` intra-sección reciben el mismo valor. Esto indica una **colisión de identidad entre secciones** al guardar o al resolver las respuestas.

---

## 2. Hipótesis (a confirmar en la Fase 0)

| # | Hipótesis | Dónde se verificaría |
| :-- | :-- | :-- |
| H1 | La plantilla guarda `item.num` **reiniciado por sección** (1…N), provocando colisiones `num_4` entre secciones. | `plantillas.js:3717/3741` y `ft.secciones` |
| H2 | El mapeo de reportes usa un *fallback* por `num` **sin sección** (`valMap['num_' + num]`) o por texto ignorando sección. | `score-engine.js:148-200`, `reportes-datos.js:415-444` |
| H3 | El guardado asigna respuestas por posición y reutiliza `itemIdx` entre secciones. | `registrar.js:2348-2388` |

> El resultado actual (86 % = 19 "Sí" + 3 "No") es **incorrecto**: con 1 solo "No" el resultado debe ser **95 %** (21/22).

---

## 3. Prompt exacto (copiar y pegar)

```text
Contexto del proyecto
App web estática (HTML + JavaScript ES Modules, sin build) del "Sistema de Monitoreo
AGEBRE-UGEL 03 2026", desplegada en producción con Firebase Hosting (proyecto
`sistematizacion-fichas`). Los PDF se generan desde la sección Reportes (jsPDF).
Raíz: C:\Users\agebre-ebr\Desktop\PAUL - 2026\2026\Sistema-monitoreo-main

REGLAS DE PRODUCCIÓN (obligatorias):
- No migres ni reescribas datos en Firestore. El arreglo debe ser compatible con los
  registros ya existentes (no cambiar el esquema de `respuestas`).
- Cambios mínimos y quirúrgicos; no renombres exports públicos ni cambies firmas.
- No toques reglas, índices, `functions/` ni `firebase.json`.
- Crea respaldos fuera de `public/` antes de editar (p. ej. `_backup_pre_produccion/`).
- No ejecutes despliegues; entrega archivos editados, diff y resultados de verificación.
- Si algo requiere migrar datos, detente y explica el riesgo.

PROBLEMA A CORREGIR (mapeo ítem↔respuesta en fichas dinámicas)
Ficha "Ficha de monitoreo del servicio SAANEE 2026" (22 ítems, tipoRespuesta "si_no",
5 secciones de 6/3/6/4/3 ítems). En el formulario de registro SOLO el ítem 19 (4.º de la
sección VIII) está en "No"; todos los demás en "Sí".
Sin embargo, el Reporte por ítem muestra como "No" el 4.º ítem de las secciones V, VII
y VIII (3 "No"), y el resumen da 86 % cuando debería dar 95 % (21/22).
Patrón: TODOS los ítems con el mismo índice intra-sección (4.º) reciben el mismo valor.
Esto indica colisión de identidad entre secciones (por `num` o `itemIdx` reutilizados).

FASE 0 — DIAGNÓSTICO OBLIGATORIO (antes de tocar código)
1. En la consola del navegador, con la ficha abierta en modo edición, ejecuta y adjunta
   la salida completa de:
   (() => {
     const st = window.state || {};
     const sub = (st.submissions || []).find(s => (s.fichaTypeNombre||'').toUpperCase().includes('SAANEE'));
     const ft = (st.fichaTypes || []).find(f => sub && f.id === sub.fichaTypeId);
     console.table((sub?.respuestas||[]).map(r => ({id:r.id, domKey:r.domKey, seccionIdx:r.seccionIdx, itemIdx:r.itemIdx, num:r.num, seccion:r.seccion, valor:r.valor, texto:(r.texto||'').slice(0,40)})));
     console.table((ft?.secciones||[]).flatMap((s,si)=>(s.items||[]).map((it,ii)=>({sIdx:si, iIdx:ii, id:it.id, num:it.num, texto:(it.texto||'').slice(0,40)}))));
     return {subId: sub?.id, nResp: (sub?.respuestas||[]).length, nItems: (ft?.secciones||[]).reduce((a,s)=>a+(s.items||[]).length,0)};
   })()
2. Responde explícitamente:
   a) ¿Cuántas respuestas con `valor:"no"` hay en Firestore y en qué ítems (seccionIdx/itemIdx)?
   b) ¿Los `num` de `ft.secciones` son GLOBALES (1..22) o POR SECCIÓN (1..6 en cada una)?
   c) ¿Hay IDs de ítem duplicados o vacíos?
   d) ¿El `itemIdx`/`seccionIdx` guardado coincide con la posición real en `ft.secciones`?
3. Con base en (2), determina la causa y aplica SOLO la fase correspondiente:
   - Si Firestore tiene 1 solo "no" y el reporte muestra 3 → causa en la LECTURA/reporte (Fase 1).
   - Si Firestore tiene 3 "no" → causa en el GUARDADO (Fase 2).

FASE 1 — RESOLUCIÓN ÚNICA Y DETERMINISTA DE RESPUESTAS (lectura)
1. En `public/js/calc/score-engine.js`:
   a. Extrae y exporta `buildResponseValMap(respuestas)` (hoy dentro de `calcScore`,
      líneas ~148-200) conservando las MISMAS claves y reglas actuales.
   b. Extrae y exporta `resolveItemValue(valMap, it, sec, sIdx, iIdx)` con esta prioridad:
      1) `domKey` exacto `s{sIdx+1}_i{iIdx+1}_{it.id||iIdx}`;
      2) `id` del ítem (solo si es único en la ficha);
      3) (`seccionIdx`, `itemIdx`) exactos;
      4) (`seccion` + `num`) exactos;
      5) `texto` normalizado SOLO si es único en toda la ficha;
      Elimina el fallback por `num` SIN sección y cualquier match de texto que ignore la
      sección cuando el texto no sea único.
   c. `calcScore` debe seguir produciendo el mismo resultado para las fichas oficiales.
2. En `public/js/reportes-datos.js` (`computeItemAgg`):
   - Reemplaza el `respuestas.find(...)` (líneas ~415-444) por el resolver anterior.
   - Prohíbe el match por `num` sin sección y el match de texto entre secciones.
3. En `public/js/pdf/ficha-individual.js` (rama genérica, ~línea 735): usa el resolver.
4. En `public/js/ui/registrar.js` (precargado, ~línea 1795): usa el resolver para que el
   formulario muestre exactamente lo guardado.

FASE 2 — GUARDADO CONSISTENTE (solo si la Fase 0 muestra datos mal guardados)
En `public/js/ui/registrar.js`, al recolectar `respuestas` (~líneas 2348-2388):
1. Usa como identidad primaria el `domKey` renderizado; asegúrate de que cada ítem
   produzca EXACTAMENTE una respuesta (ni 0 ni 2).
2. Guarda además `globalIdx` (contador global 0..N-1) para desambiguar entre secciones.
3. Antes de escribir en Firestore, verifica que:
   - `respuestas.length === totalItems`;
   - cada `respuestas[i].domKey` es único;
   - el `valor` leído del radio coincide con lo que se va a guardar.
   Si algo no cuadra, muestra un error y NO guardes (evita datos corruptos).
4. Mantén el esquema actual (`id`, `domKey`, `seccionIdx`, `itemIdx`, `num`, `seccion`,
   `texto`, `valor`, `evidencia`) para no romper registros existentes.

FASE 3 — NORMALIZACIÓN DE `num` EN LA PLANTILLA (sin migrar datos)
En `public/js/ui/plantillas.js` (payload ~líneas 3715-3745): guarda `it.num` como
**número global** (1..N en toda la ficha) y conserva `seccionIdx`/`itemIdx` como posición.
Esto evita futuras colisiones. Los registros históricos no se modifican; el resolver de
la Fase 1 los sigue leyendo por `domKey`/`id`/posición.

VERIFICACIÓN OBLIGATORIA (manual):
1. Con la ficha SAANEE (1 "No" en el ítem 19):
   - Reporte por ítem: exactamente 1 ítem en 0 % / "No: 1 (100 %)" y el resto 100 %.
   - Resumen/KPI: 95 % (21/22), coincidente con el Reporte por ítem.
2. Ítems 4.º de las secciones V y VII: deben mostrar 100 % / "Sí: 1 (100 %)".
3. PDF consolidado (sección IV) y PDF individual: reflejan 1 solo "No".
4. Fichas oficiales (EBR, CEBE, PRITE, Directivo, Rúbricas): mismos porcentajes que antes.
5. Recargar (F5) y reabrir la ficha: el formulario sigue mostrando el mismo estado.

CRITERIOS DE ACEPTACIÓN:
- El formulario, el Reporte por ítem y el resumen muestran el MISMO resultado.
- Ningún ítem recibe el valor de otro ítem de otra sección.
- No se alteran los registros existentes ni el esquema de `submissions`.
- Sin cambios en fichas oficiales ni en Firestore rules.
- Reporta: resultado de la Fase 0, archivos modificados, líneas y diff.
```

---

## 4. Checklist de verificación

| # | Prueba | Esperado |
| :- | :-- | :-- |
| 1 | Fase 0: respuestas `valor:"no"` en Firestore | Debe ser **1** (ítem 19) |
| 2 | Reporte por ítem | **1** ítem en 0 %; resto 100 % |
| 3 | KPI / resumen | **95 %** (21/22) |
| 4 | Ítems 4.º de V y VII | 100 % (no 0 %) |
| 5 | PDF consolidado / individual | 1 solo "No" |
| 6 | Fichas oficiales | Sin regresiones |
| 7 | Recarga (F5) | Formulario y reporte coinciden |

---

*Fin del documento.*
