# Arquitectura para que las fichas creadas desde la web funcionen sin tocar código

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03
**Objetivo:** que cualquier ficha creada desde el editor web —con la escala Sí/No o con otras escalas— funcione correctamente de inmediato (registro, resumen, Reporte por ítem, PDF y Excel) **sin modificar el código**.
**Fecha:** 30/10/2026

---

## 1. Por qué hoy se toca código

Cada nueva ficha obliga a revisar código porque el sistema tiene la **lógica de cada ficha repartida y especializada**:

| Zona | Qué hace hoy | Consecuencia |
| :-- | :-- | :-- |
| `calc/score-engine.js` | Resuelve respuestas con un `valMap` propio | Un algoritmo |
| `reportes-datos.js` → `computeItemAgg` | Resuelve respuestas con `find` y otro orden | **Otro algoritmo distinto** |
| `ui/scoring.js` | `RESPONSE_OPTIONS`/`OPTION_COLORS` por escala | Escalas listadas a mano |
| `pdf/consolidado-v2.js` | Distribución y cortes hardcodeados (`si/no`, `67/85`) | Solo cubre 2 escalas |
| `pdf/ficha-individual.js` | Empareja solo por `id`; valores crudos | Falla si cambian IDs |
| `ui/plantillas.js` | Asigna `num` por sección; regenera IDs | Colisiones |
| `app.js` | Repara/unifica fichas por heurística de nombre | Puede ocultar fichas nuevas |

Resultado: **cada ficha nueva hereda los huecos de la rama genérica** y hay que “parchear” caso por caso.

---

## 2. Principio central: **un solo motor de evaluación**

> Todo lo que hoy hace `calcScore`, `computeItemAgg` y los renderizadores debe salir de **una única función**.

```js
// public/js/calc/ficha-engine.js  (nuevo, ~150 líneas)
export function evaluateFicha(fichaType, respuestas) {
  const items = flattenItems(fichaType);        // identidad completa
  const index = buildResponseIndex(respuestas);  // id / domKey / posición / texto
  const resolved = items.map(it => ({
    ...it,
    valor: resolveValue(index, it, fichaType),   // ÚNICA resolución
  }));
  return buildResult(resolved, fichaType);       // pct, estados, conteos, distribuciones
}
```

Consumidores (todos leen **el mismo resultado**):

- Formulario (precargar / validar al guardar)
- Resumen (`calcScore` pasa a ser un *wrapper* de `evaluateFicha`)
- Reporte por ítem (`computeItemAgg` pasa a ser un *wrapper*)
- PDF consolidado (sección IV) y PDF individual
- Matriz Excel

**Garantía:** si el formulario, el resumen, el reporte y el PDF usan el mismo `evaluateFicha`, **no pueden volver a divergir**.

---

## 3. Contrato de datos de la ficha (`schemaVersion: 2`)

Al guardar desde el editor, el documento en `fichaTypes` debe quedar así:

```json
{
  "id": "auto",
  "origen": "builder",              // 'oficial' | 'builder'
  "schemaVersion": 2,
  "nombre": "Ficha de monitoreo del servicio SAANEE 2026",
  "grupo": "EBR",
  "escala": "SI_NO_NA",             // código de escala registrado
  "escalaDef": null,                // opcional: escala personalizada (ver §4)
  "regla": {
    "tipo": "porcentaje",
    "umbrales": [
      { "min": 67, "nivel": "Logrado", "estado": "Logrado" },
      { "min": 34, "nivel": "En proceso", "estado": "En proceso" },
      { "min": 0,  "nivel": "Inicio", "estado": "Inicio" }
    ]
  },
  "secciones": [
    {
      "id": "sec_<uuid>",
      "nombre": "V. DIMENSIÓN 1: ...",
      "num": "V",
      "items": [
        { "id": "it_<uuid-inmutable>", "globalIdx": 0, "num": 1, "texto": "..." }
      ]
    }
  ]
}
```

### Reglas del contrato

1. **`id` inmutable**: se genera una sola vez (UUID). **Nunca** se regenera al editar.
2. **`globalIdx`**: posición global 0…N-1 (desambigua entre secciones).
3. **`num` global**: 1…N en toda la ficha (no por sección).
4. **`origen`**: `'oficial'` para las 8 plantillas canónicas; `'builder'` para las creadas desde la web.
5. **`schemaVersion`**: permite que el motor lea fichas antiguas sin migrarlas.

---

## 4. Registro de escalas (data-driven)

Hoy la escala está repartida en 4 lugares. Debe existir un **único registro**:

```js
// public/js/calc/scales.js
export const SCALES = {
  SI_NO_NA: {
    label: 'Sí / No',
    opciones: [
      { v: 'si', l: 'Sí',  puntos: 1,    color: 'var(--ok)' },
      { v: 'no', l: 'No',  puntos: 0,    color: 'var(--danger)' },
      { v: 'na', l: 'N/A', puntos: null, color: 'var(--neutral)' },
    ],
    distLabels: { si: 'Sí', no: 'No', na: 'N/A' },
  },
  IPL: {
    label: 'Inicio / Proceso / Logrado',
    opciones: [
      { v: 'inicio',  l: 'Inicio',  puntos: 0,   color: 'var(--danger)' },
      { v: 'proceso', l: 'Proceso', puntos: 0.5, color: 'var(--warn)' },
      { v: 'logrado', l: 'Logrado', puntos: 1,   color: 'var(--ok)' },
      { v: 'na', l: 'N/A', puntos: null, color: 'var(--neutral)' },
    ],
    distLabels: { inicio: 'Inicio', proceso: 'Proceso', logrado: 'Logrado', na: 'N/A' },
  },
  ESCALA_1_3: { /* ... */ },
  NIVEL_1_4:  { /* ... */ },
};
```

**Que `puntajeItem`, `RESPONSE_OPTIONS`, `OPTION_COLORS`, la distribución del PDF y los cortes lean de aquí.**

### Escalas nuevas sin tocar código

Si el editor permite declarar la escala en la propia ficha:

```json
"escala": "CUSTOM",
"escalaDef": {
  "label": "Escala de madurez",
  "opciones": [
    { "v": "m1", "l": "Incipiente",    "puntos": 0 },
    { "v": "m2", "l": "En desarrollo", "puntos": 0.5 },
    { "v": "m3", "l": "Consolidado",   "puntos": 1 }
  ]
}
```

El motor usa `escalaDef` si existe; si no, busca en `SCALES`. **Resultado: escalas nuevas sin tocar código.**

---

## 5. Identidad inmutable del ítem (fin de las colisiones)

### En el editor (`ui/plantillas.js`)

| Hoy | Debe ser |
| :-- | :-- |
| Regenera `id` si es numérico/duplicado (`:3735`) | **Nunca** regenerar un `id` ya existente |
| `num = iIdx + 1` por sección (`:3717`) | `num` **global** 1…N |
| No valida duplicados | Validar `id` único, `texto` no vacío, escala soportada |
| No hay `globalIdx` | Calcular y guardar `globalIdx` |

### En el guardado (`ui/registrar.js`)

- Una respuesta **por ítem** (ni 0 ni 2).
- Comparar el `valor` leído del radio con el que se va a guardar; si no coincide, **abortar** y avisar.
- Mantener el esquema actual (`id`, `domKey`, `seccionIdx`, `itemIdx`, `num`, `seccion`, `texto`, `valor`) para no romper registros.

### En el motor (resolución determinista)

```text
prioridad: domKey exacto
         → id único
         → (seccionIdx, itemIdx)
         → (seccion, num)
         → texto normalizado SOLO si es único en toda la ficha
```

**Prohibido:** usar `num` sin sección o texto que ignore la sección (causa del “4.º ítem de cada sección”).

---

## 6. Separar fichas **oficiales** de **dinámicas**

En `app.js` (sanitización/unificación) y en los reportes:

```js
const ES_OFICIAL = ft.origen === 'oficial' || CANONICAL_IDS.has(ft.id);
if (ES_OFICIAL) { /* unificar, reparar, inyectar como hoy */ }
else            { /* pasar la ficha tal cual, sin heurísticas */ }
```

- Nunca fusionar ni eliminar una ficha `origen: 'builder'` por parecerse a “JEC/EBR/Directivo”.
- La columna especial de la matriz (REI → coordinador) debe venir de **metadatos** (`ft.coordCol`), no de heurísticas por nombre.

---

## 7. Reportes y PDF data-driven

| Componente | Hoy | Debe ser |
| :-- | :-- | :-- |
| Distribución PDF (`consolidado-v2.js`) | `logrado/proceso/inicio/si/no` fijos | Recorre `SCALES[escala].opciones` / `escalaDef` |
| Cortes de nivel | `isEbr ? 67 : 85` | `ft.regla.umbrales` |
| Ficha individual | solo `id` + valores crudos | `evaluateFicha` + etiquetas de la escala |
| Reporte por ítem web | `RESPONSE_OPTIONS[tipo]` | `SCALES[escala]` (incluye custom) |
| Matriz Excel | fallback genérico | `evaluateFicha` + `escala` |

Con esto, **una ficha nueva con cualquier escala se renderiza sola**.

---

## 8. Validación al crear/publicar (el editor no deja pasar fichas rotas)

Antes de guardar (`Guardar ficha completa`), validar:

1. Nombre y `grupo` obligatorios.
2. Al menos 1 sección con 1 ítem.
3. `id` de ítem único y no vacío (generar UUID si falta).
4. `texto` de ítem no vacío.
5. `num` global calculado y `globalIdx` asignado.
6. Escala existente en `SCALES` **o** `escalaDef` válido.
7. `regla` (umbrales/rangos) válida.
8. Guardar `schemaVersion: 2` y `origen: 'builder'`.

Si algo falla → mensaje claro y **no se guarda**.

---

## 9. Pruebas automáticas de regresión (sin servidor)

Un *runner* de pruebas (similar a los `test-*-runner.html` existentes) que, para **cada escala**:

1. Cree una ficha sintética (2 secciones × 3 ítems).
2. Guarde respuestas conocidas.
3. Verifique:
   - `evaluateFicha` da el mismo `pct` que el resumen.
   - El Reporte por ítem coincide con `evaluateFicha`.
   - El formulario (precarga) coincide con lo guardado.
   - El PDF individual/consolidado incluye todos los ítems con la etiqueta correcta.

Esto evita que un cambio futuro vuelva a romper una escala.

---

## 10. Roadmap por fases

| Fase | Alcance | Riesgo | Efecto |
| :-- | :-- | :-- | :-- |
| **A. Robustez inmediata** | `evaluateFicha` + resolución única + IDs inmutables + `num` global + validación al guardar | Medio (se toca el núcleo) | Elimina la inconsistencia y las colisiones |
| **B. Escalas como datos** | Registro `SCALES` + `escalaDef` en la ficha | Bajo | Nuevas escalas sin código |
| **C. Reportes data-driven** | PDF/Excel consumen `evaluateFicha` y `SCALES` | Bajo | Fichas nuevas se renderizan solas |
| **D. Separación oficial/dinámica** | `origen` + `CANONICAL_IDS` en `app.js` | Medio | No se ocultan fichas nuevas |
| **E. Tests + CI** | Runner por escala | Bajo | Regresión controlada |

> **Compatibilidad:** los registros existentes se leen igual (el motor resuelve por `domKey`/`id`/posición). No hay migración de datos.

---

## 11. Resultado esperado

| Escenario | Hoy | Con la arquitectura propuesta |
| :-- | :-- | :-- |
| Crear ficha con **escala existente** | Puede requerir parches | **Funciona sin tocar código** |
| Crear ficha con **escala nueva** | Requiere tocar código | **Funciona declarando `escalaDef`** |
| Formulario vs resumen vs PDF | Pueden divergir | **Siempre coinciden** (mismo motor) |
| Editar plantilla con registros históricos | Rompe el mapeo | **No rompe** (IDs inmutables) |
| Ítems de distintas secciones | Se cruzan | **Nunca** (identidad + `globalIdx`) |

---

## 12. Prompt opcional para implementarlo

Si quieres delegar la implementación, usa esta instrucción:

```text
Implementa la arquitectura "ficha engine" en el proyecto (app en producción, sin build).
1) Crea `public/js/calc/ficha-engine.js` con `evaluateFicha(fichaType, respuestas)` que
   resuelva cada ítem con prioridad: domKey → id único → (seccionIdx,itemIdx) →
   (seccion,num) → texto solo si es único. Devuelve pct, estado, secciones e items con
   valor, puntaje, counts.
2) Crea `public/js/calc/scales.js` con el registro SCALES (SI_NO_NA, IPL, ESCALA_1_3,
   NIVEL_1_4) y soporte de `escalaDef` personalizada.
3) Refactoriza `calcScore` y `computeItemAgg` como wrappers de `evaluateFicha` sin cambiar
   sus firmas ni sus resultados actuales en fichas oficiales.
4) Actualiza `ui/plantillas.js`: IDs inmutables, `num` global, `globalIdx`, `origen`,
   `schemaVersion`, validación al guardar.
5) Actualiza los renderizadores (PDF consolidado, PDF individual, reporte por ítem web)
   para consumir `evaluateFicha`/`SCALES` (distribución y etiquetas genéricas).
6) En `app.js`, limita la unificación/reparación a fichas `origen:'oficial'`.
7) Añade un runner de pruebas por escala y verifica que EBR/CEBE/PRITE/Directivo/Rúbricas
   no cambian sus porcentajes.
Reglas: cambios mínimos y retrocompatibles; no migrar datos; respaldos fuera de `public/`;
no desplegar; entregar diff y resultados de verificación.
```

---

*Fin del documento.*
