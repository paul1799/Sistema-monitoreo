# Diagnóstico — Ficha SAANEE: opción "NO" no reflejada y ficha ausente en reportes

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03 · **app en producción**
**Ficha:** "Ficha de monitoreo del servicio SAANEE 2026" (creada desde el editor web)
**Archivos analizados:**
- `Reporte_Consolidado_ficha_de_monitoreo_del_servicio_saanee_2026-10-30_con_items.pdf` (reporte consolidado)
- `documento_oficial (1).pdf` (ficha individual oficial del registro)
- Captura del formulario en modo "Actualizar ficha"

**Método:** revisión estática del código + extracción parcial del texto de los PDF (las herramientas de ejecución de comandos siguen caídas con `0xC0000142`, por lo que no se pudieron ejecutar pruebas).

---

## 1. Evidencia extraída de los PDF

### 1.1 Ficha individual (`documento_oficial (1).pdf`)

El PDF corresponde a la **ficha individual** (título interno `FICHA DE MONITOREO DEL SERVICIO SAANEE`, tabla con columnas `N.° / Sección / Indicador / Resultado`).

Conteo de valores en la columna "Resultado":

| Valor | Ocurrencias |
| :-- | :-- |
| `(si)` | **22** |
| `(no)` | **0** |
| `(na)` | **0** |

Es decir, el documento oficial renderiza **los 22 ítems como "si"**, incluido el ítem 19 *"Promueve estrategias de enriquecimiento curricular."* (marcado como **NO** en el formulario de la captura).

> Además, el PDF muestra el valor **crudo** (`si`) y no la etiqueta legible (**Sí**), lo que hace que un "No" sea aún más difícil de distinguir.

### 1.2 Reporte consolidado (sección IV)

Se localizaron los 5 bloques de indicadores y los ítems 18–22. El ítem 19 aparece con:

| Ítem | Texto | % Cumpl. en el PDF |
| :-- | :-- | :-- |
| 18 | "Realiza seguimiento a los casos identificados." | 100% |
| **19** | **"Promueve estrategias de enriquecimiento curricular."** | **100%** |
| 20 | "participa en capacitaciones convocadas por UGEL, DRELM o MINEDU" | 100% |
| 21 | "Desarrolla trabajo colegiado." | 100% |
| 22 | "Evidencia trabajo interdisciplinario." | 100% |

Además, **no se encontró la cadena `No:`** en ninguna distribución del PDF (solo habría aparecido si algún ítem tuviera respuestas "No"). Conclusión: **el reporte se generó con un registro en el que los 22 ítems valían "si"**.

---

## 2. Interpretación

El formulario (captura) muestra el ítem 19 en **NO**, pero **ambos PDF reflejan "si"**. Puede deberse a dos escenarios:

| Escenario | Qué significa | Cómo confirmarlo |
| :-- | :-- | :-- |
| **A. PDFs generados antes de la corrección** | El registro corregido sí se guardó, pero los PDF son antiguos. | Regenerar los PDF tras guardar y recargar (F5). |
| **B. La corrección no se persistió / el reporte lee otro registro** | El formulario mostraba NO, pero Firestore conserva "si" (o hay un duplicado y el reporte toma el antiguo). | Recargar (F5) y ver si el ítem 19 sigue en NO; revisar el documento en Firestore. |

> El código de guardado genérico **sí** lee `chk.value` (`registrar.js:2352-2366`), por lo que un radio "NO" (`value="no"`) se guarda como `"no"`. El punto a verificar es la **persistencia/recarga y la lectura del reporte**, no la captura del radio.

---

## 3. Hallazgos de código relevantes (independientes del escenario)

### 3.1 ⚠️ ALTO — La ficha individual solo empareja respuestas por `id`

`public/js/pdf/ficha-individual.js:735` (rama genérica usada por fichas dinámicas):

```js
const resp = respuestas.find(r => r.id === it.id);
const val = resp ? resp.valor : 'Sin datos';
```

- No tiene *fallback* por texto, sección o posición (a diferencia de `computeItemAgg` y del precargado del formulario, que sí lo tienen).
- Si el editor **regeneró los IDs** de los ítems al guardar la plantilla, `resp` queda `undefined` → "Sin datos" (o, si los IDs coinciden por casualidad, puede tomar un valor equivocado).
- Renderiza el valor crudo (`si`/`no`/`na`) en lugar de **Sí / No / N/A** (línea 737).

### 3.2 ⚠️ ALTO — La distribución del PDF no cubre `1–3` ni `I–IV`

`public/js/pdf/consolidado-v2.js:855-871` solo reconoce `logrado / proceso / inicio / si / no / na`. Para fichas dinámicas con `escala_1_3` o `nivel_1_4`, la distribución sale **"Sin respuestas"** aunque el `%` já se calcule (ya se aplicó `LEGADO_A_ESCALA` en `reportes-datos.js`).

### 3.3 ⚠️ MEDIO — Los cortes de nivel no respetan la regla de la ficha

`public/js/pdf/consolidado-v2.js:803-804` (y 659-660) fijan los cortes por heurística (`isEbr ? 67 : 85`), no por la `regla_nivel` configurada en el editor.

### 3.4 ⚠️ MEDIO — La ficha puede "desaparecer" del catálogo de reportes

`public/js/ui/consolidado.js:1084-1085`: los grupos de fichas inician **colapsados** (`isExpanded = reportesExpandedGroups.has(gName)`). Una ficha nueva creada con el `grupo` por defecto (`EBR`) queda dentro del grupo "EBR" y **no se ve hasta expandirlo**. Además, `esBorrador: true` no se filtra (`registrar.js:312` / `consolidado.js:997`), por lo que un borrador aparece como ficha usable.

### 3.5 ⚠️ MEDIO — Deduplicación de "gemelos"

`consolidado.js:426-461` elimina registros con `respuestas` **idénticas** y `createdAt` a menos de 8 s. Si un flujo de actualización generó un **duplicado** del registro (en lugar de actualizar el original), el reporte puede quedarse con la copia antigua (todas "si").

---

## 4. El prompt exacto (copiar y pegar)

```text
Contexto del proyecto
App web estática (HTML + JavaScript ES Modules, sin build) del "Sistema de Monitoreo
AGEBRE-UGEL 03 2026", desplegada en producción con Firebase Hosting (proyecto
`sistematizacion-fichas`). Los PDF se generan con jsPDF.
Raíz del proyecto: C:\Users\agebre-ebr\Desktop\PAUL - 2026\2026\Sistema-monitoreo-main

REGLAS DE PRODUCCIÓN (obligatorias):
- No migres ni escribas datos en Firestore. Los ajustes son de presentación/lectura.
- Cambios mínimos y quirúrgicos; no renombres exports ni cambies firmas públicas.
- No toques `calcScore`, reglas, índices, `functions/` ni `firebase.json`.
- Crea respaldos fuera de `public/` antes de editar (p. ej. `_backup_pre_produccion/`).
- No ejecutes despliegues; entrega los archivos editados y el diff.
- Si algo no puede hacerse sin migrar datos, detente y explica el riesgo.

PROBLEMA A REPRODUCIR
Ficha "Ficha de monitoreo del servicio SAANEE 2026" creada desde el editor de plantillas.
El ítem 19 ("Promueve estrategias de enriquecimiento curricular.") se marcó como NO.
- El PDF individual (`documento_oficial`) muestra el ítem 19 como "si".
- El Reporte Consolidado (sección IV) muestra el ítem 19 al 100% y ninguna distribución "No:".
- El formulario (modo "Actualizar ficha") sí muestra NO en el ítem 19.
- Reportado además: la ficha "no figura en la sección de reporte".

FASE 0 — DIAGNÓSTICO (obligatoria, hazlo antes de tocar código):
1. En la consola del navegador (modo edición de esa ficha), ejecuta:
   const sub = (window.state.submissions || []).find(s => (s.fichaTypeNombre||'').toUpperCase().includes('SAANEE'));
   console.log(sub && sub.id, sub && sub.respuestas && sub.respuestas.find(r => /enriquecimiento/i.test(r.texto||'')));
   Reporta: ¿el `valor` guardado es 'si' o 'no'? ¿Existen 2 documentos con el mismo contenido (duplicado)?
2. Abre el documento en Firestore y verifica `respuestas` del ítem 19.
3. Determina y reporta cuál escenario aplica:
   (A) el registro tiene 'no' pero los PDF lo ignoran → bug de lectura en el PDF; o
   (B) el registro tiene 'si' aunque el formulario mostraba 'no' → bug de guardado/persistencia.
Continúa a la Fase 1 y 2 para corregir los defectos de lectura/presentación en cualquier caso.

FASE 1 — FICHA INDIVIDUAL (`public/js/pdf/ficha-individual.js`)
1. En la rama genérica (~línea 730), reemplaza el matching `respuestas.find(r => r.id === it.id)`
   por el mismo matching robusto que usa `computeItemAgg` y el precargado del formulario:
   - por `domKey` / `id`,
   - por `texto` normalizado (sin tildes, minúsculas),
   - por `seccion` + `seccionIdx/itemIdx`,
   - por `num` + `seccion`.
   Implementa un helper local `findRespuesta(respuestas, it, sec, sIdx, iIdx)` reutilizable.
2. Renderiza etiquetas legibles según `fichaType.tipoRespuesta`:
   - si_no: si→"Sí", no→"No", na→"N/A".
   - ips: inicio→"Inicio", proceso→"Proceso", logrado→"Logrado", na→"N/A".
   - escala_1_3: 3→"3 (Logrado)", 2→"2 (En proceso)", 1→"1 (Inicio)", na→"N/A".
   - nivel_1_4: 4→"IV", 3→"III", 2→"II", 1→"I", na→"N/A".
   Si no se encuentra respuesta, usa "Sin datos" (nunca dejes vacío).
3. Mantén la estructura y el diseño actual del PDF (no rediseñes).

FASE 2 — REPORTE CONSOLIDADO (`public/js/pdf/consolidado-v2.js`)
1. En la sección IV (bloque de `distParts`/`pctMap`, ~líneas 827-871), generaliza la distribución:
   - escala_1_3: claves "3","2","1" → "Logrado (3)", "En proceso (2)", "Inicio (1)".
   - nivel_1_4: claves "4","3","2","1" → "IV","III","II","I".
   - si_no: conserva "Sí"/"No".
   - N/A: `counts.na + counts.nc`.
   Mantén el redondeo por mayor residuo (suma 100%).
2. Verifica que para `si_no` un ítem con `counts.no = 1` muestre "No: 1 (100%)" y `% Cumpl.` 0%.
3. (Opcional, solo si es de bajo riesgo) Deriva los cortes de color desde `fichaType.regla_nivel`
   con *fallback* al comportamiento actual; si implica refactor grande, NO lo hagas y documéntalo.

FASE 3 — VISIBILIDAD Y PERSISTENCIA EN REPORTES
1. Si el diagnóstico de Fase 0 muestra un DUPLICADO (dos documentos con el mismo contenido):
   - Corrige el flujo de edición para que use siempre el `id` del documento original
     (`editingSubmissionId`) y no cree uno nuevo.
   - No borres datos: solo evita la creación del duplicado.
2. En `public/js/ui/consolidado.js`:
   - Haz que el grupo de la ficha seleccionada se muestre expandido por defecto
     (`reportesExpandedGroups`) cuando `filtrosReporte.tipo` pertenece a ese grupo.
   - Mantén el resto del catálogo colapsado.
3. En `public/js/ui/registrar.js` (catálogo de registro) y selectores de reportes:
   - Filtra o marca los borradores (`esBorrador === true`) para que no se confundan con fichas publicadas.

VERIFICACIÓN OBLIGATORIA (manual, sin servidor):
1. Reabrir la ficha y recargar (F5): el ítem 19 debe seguir en NO.
2. Generar el PDF individual: debe mostrar "No" en el ítem 19.
3. Generar el Reporte Consolidado con "Incluir reporte por ítem":
   el ítem 19 debe mostrar 0% y "No: 1 (100%)".
4. Probar una ficha con escala_1_3 y otra con nivel_1_4: la distribución debe mostrarse.
5. Confirmar que EBR, CEBE, PRITE, Directivo y Rúbricas no cambian.

CRITERIOS DE ACEPTACIÓN:
- El PDF individual refleja exactamente el valor guardado (incluido "No").
- El consolidado muestra la distribución "No" y el % correcto por ítem.
- La ficha es visible en Reportes sin pasos extra.
- No hay duplicados generados por la edición.
- Se reportan archivos modificados, líneas y diff; y el resultado de la Fase 0.
```

---

## 5. Checklist de verificación posterior

| # | Prueba | Esperado |
| :- | :-- | :-- |
| 1 | Guardar ítem 19 = NO; recargar (F5) | El formulario sigue mostrando NO |
| 2 | Ficha individual PDF | Ítem 19 = "No" |
| 3 | Consolidado → sección IV | Ítem 19: 0% y "No: 1 (100%)" |
| 4 | Consolidado → catálogo | La ficha SAANEE visible sin expandir grupos |
| 5 | Fichas `escala_1_3` / `nivel_1_4` | Distribución "1/2/3" e "I/II/III/IV" |
| 6 | EBR / CEBE / PRITE / Directivo | Sin regresiones |
| 7 | Firestore | Un solo documento por visita (sin duplicados) |

---

*Fin del documento.*
