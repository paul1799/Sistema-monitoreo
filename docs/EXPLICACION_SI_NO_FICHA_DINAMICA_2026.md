# ¿Por qué falla la ficha nueva con escala Sí/No y la oficial de Materiales CEBE/PRITE no?

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03
**Fecha:** 30/10/2026
**Caso:** Ficha "Ficha de monitoreo del servicio SAANEE 2026" (creada desde la web, `tipoRespuesta: si_no`) frente a la ficha oficial "Monitoreo de la Gestión y Uso Pedagógico de los Materiales Educativos en CEBE y PRITE" (`ft_materiales_cebe`, también `si_no`).

---

## 1. Respuesta corta

**La escala Sí/No no es el problema.** La escala es exactamente la misma función para ambas fichas (`puntajeItem('SI_NO_NA', 'si'|'no')` → 1 / 0, en `public/js/calc/escalas.js:34-49`).

El problema es **la identidad del ítem**: a qué ítem se le asigna cada respuesta. La ficha oficial tiene una identidad **canónica y estable** (IDs fijos + numeración global), mientras que la ficha creada desde la web tiene una identidad **generada y ambigua** (IDs regenerables + numeración repetida por sección). Cuando la identidad falla, el sistema "adivina" con criterios de respaldo y termina asignando una respuesta al ítem equivocado — de ahí los "No" fantasma en el **4.º ítem de cada sección**.

---

## 2. Lo que comparten (y por eso no es la escala)

| Elemento | Ficha Materiales (`ft_materiales_cebe`) | Ficha SAANEE (dinámica) |
| :-- | :-- | :-- |
| `tipoRespuesta` | `si_no` | `si_no` |
| Escala de puntaje | `puntajeItem('SI_NO_NA', …)` | **idéntica** |
| Cálculo del resumen | `calcScore` | `calcScore` |
| Reporte por ítem | `computeItemAgg` | **idéntica función** |

Misma escala, misma matemática. La diferencia está en **los datos estructurales de la plantilla**.

---

## 3. Diferencias estructurales (la causa real)

| # | Aspecto | Ficha oficial Materiales CEBE/PRITE | Ficha nueva SAANEE (creada desde web) |
| :-- | :-- | :-- | :-- |
| 1 | **Definición** | Está en `PLANTILLAS_BASE_OFICIALES` (`catalogo-plantillas-base.js:473-548`); si falta en Firestore, `getFichaType` la inyecta (`app.js:90-102`). | Solo existe en Firestore. Si se edita/duplica y algo se pierde, **no hay fallback canónico**. |
| 2 | **IDs de ítem** | Canónicos y estables: `mc_1` … `mc_14`. | Generados: `sec1_it1_<genId>`. **Se regeneran** al duplicar (`plantillas.js:402-405`) o al guardar si el ID es numérico/duplicado (`plantillas.js:3735-3736`). |
| 3 | **`num` de ítem** | **No viene en la definición** → `app.js:649-669` le asigna **1…14 global** (únicos). | El editor asigna `num = iIdx + 1` **por sección** (`plantillas.js:3717/3741`) → **se repite en cada sección** (hay cuatro "num = 4"). |
| 4 | **Reparación automática** | `app.js` la repara (secciones, `num`, unificación de oficiales). | No tiene reparación específica; pasa por la rama **genérica** del reporte. |
| 5 | **Motor de reporte** | Coincide por `id` canónico (fiable). | Ante un `id` que no coincide, cae a *fallbacks* ambiguos (`num`, texto, posición) con **dos algoritmos distintos** (`calcScore` vs `computeItemAgg`). |

---

## 4. Por qué eso produce el patrón "4.º ítem de cada sección"

1. **Se edita/duplica la ficha** → el editor regenera los IDs de los ítems (`plantillas.js:3735-3736`, `402-405`). Las respuestas ya guardadas conservan los IDs **antiguos**.
2. Al leer el reporte, el `id` ya **no coincide** → el sistema busca la respuesta por otros criterios.
3. La ficha dinámica tiene **`num` repetidos entre secciones** (1…6 en cada una). Cualquier respaldo que use `num` (o un índice que colisione) asigna **la misma respuesta al 4.º ítem de cada sección**.
4. Además, **`calcScore` y `computeItemAgg` tienen órdenes de búsqueda distintos**:
   - `calcScore` (`score-engine.js:148-200` / `216-253`): por `id`, texto, posición, `seccion+num`, `domKey`… y en `id` **gana el último valor**.
   - `computeItemAgg` (`reportes-datos.js:415-444`): por `id`, texto, posición, `domKey`, `seccion+num`… y `find` **siempre toma el primero**.
   Por eso el **resumen** y el **Reporte por ítem** pueden ver valores distintos (el 86 % vs 100 % que observaste).

**Firma del problema:** que el error caiga siempre en el **mismo índice de ítem dentro de cada sección** es la señal de una **colisión de `num`/índice** entre secciones, no de un error de la escala.

---

## 5. Por qué la ficha oficial de Materiales no falla

1. Sus **IDs son canónicos** (`mc_1`…`mc_14`): la respuesta guardada y el ítem de la plantilla siempre coinciden por `id`.
2. Sus **`num` son globales** (los inyecta `app.js` al faltar en la definición): no hay colisiones entre secciones.
3. Está en el **catálogo oficial**: aunque Firestore tenga una copia incompleta, `getFichaType` devuelve la definición canónica y `app.js` la repara.
4. No pasa por la rama genérica con *fallbacks* relajados.

En resumen: **la escala funciona igual; lo que cambia es que en la oficial "cada ítem se llama igual siempre", y en la dinámica no.**

---

## 6. Qué se necesita para que la ficha dinámica funcione igual

1. **Identidad estable del ítem**: no regenerar IDs al editar; conservar `id` y `domKey`.
2. **`num` global** en la plantilla (o no usar `num` para emparejar). El editor debería numerar 1…N en toda la ficha, no por sección.
3. **Resolver único de respuesta** usado por el formulario, el resumen (`calcScore`), el Reporte por ítem (`computeItemAgg`) y los PDF: prioridad `domKey` → `id` → (`seccionIdx`, `itemIdx`) → (`seccion` + `num`) → texto **solo si es único**.
4. **Eliminar los respaldos ambiguos**: `num` sin sección y texto que ignora la sección.
5. **Validación al guardar**: exactamente una respuesta por ítem; si no, abortar y avisar.

> Esto es precisamente lo que cubre el prompt de corrección (`docs/PROMPT_CORRECCION_MAPEO_ITEMS_2026.md`).

---

## 7. Cómo confirmarlo en 2 minutos (diagnóstico)

Con la ficha abierta en edición, ejecuta en la consola:

```js
(() => {
  const st = window.state || {};
  const sub = (st.submissions || []).find(s => (s.fichaTypeNombre||'').toUpperCase().includes('SAANEE'));
  const ft = (st.fichaTypes || []).find(f => sub && f.id === sub.fichaTypeId);
  console.table((sub?.respuestas||[]).map(r => ({id:r.id, domKey:r.domKey, seccionIdx:r.seccionIdx, itemIdx:r.itemIdx, num:r.num, seccion:r.seccion, valor:r.valor})));
  console.table((ft?.secciones||[]).flatMap((s,si)=>(s.items||[]).map((it,ii)=>({sIdx:si, iIdx:ii, id:it.id, num:it.num}))));
  return { nResp: (sub?.respuestas||[]).length, nItems: (ft?.secciones||[]).reduce((a,s)=>a+(s.items||[]).length,0) };
})()
```

Interpretación:

| Resultado | Causa |
| :-- | :-- |
| `num` por sección (1…6 repetido) | Colisión de numeración → **causa principal**. |
| IDs de respuesta ≠ IDs de plantilla | IDs regenerados → se activó el respaldo ambiguo. |
| 3 respuestas con `valor:"no"` | El **guardado** asignó mal (además del problema de lectura). |
| 1 sola respuesta con `valor:"no"` | El **reporte** es el que asigna mal. |

---

*Fin del documento.*
