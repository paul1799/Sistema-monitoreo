# Revisión técnica y propuesta de mejora — Reportes PDF de JEC / Coordinación

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03
**Módulo:** Monitoreo y Seguimiento → Reportes → Reporte Consolidado (PDF)
**Fecha:** 30/10/2026
**Alcance:** dos defectos reportados en las fichas del grupo **Modelo JEC** (Coordinador Pedagógico, Coordinador de Tutoría e Implementación JEC).
**Restricción clave:** la aplicación **ya está en producción** (proyecto Firebase `sistematizacion-fichas`), por lo que todo cambio debe ser mínimo, retrocompatible y reversible.

---

## 0. Reglas de producción (obligatorias)

1. **Sin migración de datos.** Los cambios son solo de *presentación y agregación*: leen `submissions`/`fichaTypes` tal como están y **no escriben ni transforman** documentos en Firestore. No se tocan reglas, índices ni Cloud Functions.
2. **Cambios mínimos y aislados.** Solo se modifican 2 archivos: `public/js/reportes-datos.js` y `public/js/pdf/consolidado-v2.js`. No se renombran exports, no se cambian firmas de funciones, no se refactoriza nada que no sea necesario.
3. **Retrocompatible.** `computeItemAgg` conserva exactamente su estructura de retorno; `calcScore` (que calcula los puntajes oficiales) **no se toca**; los reportes existentes siguen generándose igual.
4. **Caché ya resuelto.** `firebase.json` sirve `*.js`, `*.css` y `*.html` con `Cache-Control: no-cache, no-store, must-revalidate`, por lo que **no hace falta “cache-busting”** (`?v=`): al recargar, el navegador trae el JS nuevo. (No hay Service Worker.)
5. **Validar antes de publicar** en un **canal de vista previa de Firebase Hosting**, nunca directo a `live`.
6. **Rollback inmediato**: `firebase hosting:rollback` restaura la release anterior sin downtime, y se conservan copias `.bak` de los archivos originales.
7. **Ventana de despliegue** fuera de horario de monitoreo (después de las 18:00 o fin de semana) y con visto bueno del área, porque los PDF son documentos oficiales.

---

## 1. Resumen ejecutivo

| N.° | Problema reportado | Causa raíz | Archivos a modificar |
| :-- | :-- | :-- | :-- |
| 1 | En el PDF de las fichas JEC, la sección **IV. REPORTE POR ÍTEM — CONSOLIDADO DE INDICADORES** solo muestra la cantidad de fichas por ítem; no muestra **% Cumpl.** ni **Distribución de Respuestas** (sale `—` y "Sin respuestas"), a diferencia del reporte de Gestión Escolar EBR. | La función `computeItemAgg` resuelve mal la escala `escala_1_3` (la convierte en `IPL`), por lo que `puntajeItem` devuelve `null` para respuestas `1/2/3`. Además, el render de la distribución en el PDF solo reconoce `logrado/proceso/inicio/si/no/na`. | `public/js/reportes-datos.js` y `public/js/pdf/consolidado-v2.js` |
| 2 | En la sección **III. MATRIZ COMPARATIVA POR INSTITUCIÓN Y DIMENSIÓN** de las fichas JEC, se muestra la columna **REI**; se requiere que en su lugar aparezcan los datos del **coordinador(a) pedagógico** o de **tutoría**, según corresponda la ficha. | La cabecera y la celda de la columna están fijas a `'REI'` / `formatRei(s.red)` en `consolidado-v2.js`, sin condicionar por tipo de ficha. | `public/js/pdf/consolidado-v2.js` |

> **Nota:** los dos defectos son de **presentación/agregación**; no afectan los datos guardados en Firestore ni el cálculo del nivel general (`calcScore` sí resuelve bien la escala `escala_1_3`). Ver §2.3.

---

## 2. Diagnóstico técnico

### 2.1 Flujo de generación del PDF consolidado

```
consolidado.js (botón "Exportar PDF")
  → openDownloadConfigModal()            (public/js/ui/modales.js)
  → exportConsolidadoReportPdf()          (public/js/pdf/consolidado-v1.js)
  → exportConsolidadoReportPdfV2()        (public/js/pdf/consolidado-v2.js)
       ├─ Sección III: matriz comparativa  (líneas 568-741)
       └─ Sección IV: reporte por ítem     (líneas 743-941)
            └─ computeItemAgg()            (public/js/reportes-datos.js, líneas 382-441)
```

- La opción **"Incluir reporte por ítem"** del modal se traduce en `downloadConfig.incluirReporteItem`.
- La sección IV se genera solo si `incluirReporteItem && statsList.length > 0 && fichaType` (`consolidado-v2.js:746-747`).
- La **vista web** "Reporte por ítem" usa la misma `computeItemAgg` pero un render distinto (`public/js/ui/scoring.js:670`, `renderItemReportHtml`), que **sí** maneja las opciones `1/2/3`; el PDF tiene su propio render hardcodeado.

### 2.2 Problema 1 — Sección IV vacía en fichas JEC

**Evidencia (capturas):**
- Ficha **Coordinador(a) Pedagógico**: `Fichas = 60`, `% Cumpl. = —`, `Distribución = "Sin respuestas"`, gráfica vacía.
- Ficha **EBR Gestión Escolar**: `% Cumpl.` con valores reales y distribución `Logrado/Proceso/Inicio/N/A`.

**Causa raíz A — resolución de escala incorrecta**

En `public/js/reportes-datos.js`, dentro de `computeItemAgg` (línea 403):

```js
// ACTUAL (con defecto)
const escala = isSiNo ? 'SI_NO_NA' : (activeFt?.escala || (tipoResp === 'ips' ? 'IPL' : (tipoResp === 'si_no' ? 'SI_NO_NA' : (tipoResp === 'nivel_1_4' ? 'NIVEL_1_4' : 'IPL'))));
```

Para las fichas de coordinación, `tipoRespuesta = 'escala_1_3'` y **no** existe un campo `escala` a nivel de ficha (la escala oficial está en `regla_nivel.escala`). La cadena de ternarios no contempla `'escala_1_3'`, por lo que cae en el valor por defecto **`'IPL'`**.

Consecuencia en `public/js/calc/escalas.js` → `puntajeItem('IPL', '1' | '2' | '3')` devuelve `null` (IPL solo acepta `logrado/proceso/inicio/si/no`), por lo que:
- `scoreCnt = 0` → `pct = null` → **`% Cumpl. = "—"`**.
- `counts = { '1': n, '2': m, '3': k }` → la distribución no reconoce esas claves.

**Contraste:** `calcScore` (motor de cálculo oficial) **sí** resuelve bien esta escala (`public/js/calc/score-engine.js:82-85`):

```js
const escala = isSiNo ? 'SI_NO_NA' : (fichaType.escala
  || LEGADO_A_ESCALA[fichaType.tipoRespuesta]
  || ((isFichaCoordPedagogico(fichaType) || isFichaCoordTutoriaJec(fichaType)) ? 'ESCALA_1_3' : 'SI_NO_NA'));
```

Es decir, `computeItemAgg` duplicó la lógica y quedó desactualizada respecto de `calcScore`.

**Causa raíz B — distribución hardcodeada en el PDF**

En `public/js/pdf/consolidado-v2.js` (líneas 809-853) la distribución solo contempla las claves:

```js
logrado · proceso · inicio · na · nc · si · no
```

Por eso, aun cuando el `% Cumpl.` se corrija, las respuestas `1/2/3` (`escala_1_3`) o `I/II/III/IV` (`nivel_1_4`) seguirían mostrando **"Sin respuestas"**.

### 2.3 Problema 2 — Columna REI en la Matriz III

En `public/js/pdf/consolidado-v2.js`:

- Línea 650 (cabecera fija):
  ```js
  const matrizHeaders = ['N.°', 'Institución Educativa', 'REI', ...(showVisitaCol ? ['Visita'] : []), ...secHeaders, 'Global', 'Estado'];
  ```
- Líneas 691-700 (celda fija):
  ```js
  return [
    String(idx + 1),
    s.institucion || '—',
    formatRei(s.red),
    ...
  ];
  ```
- Líneas 708-722 (estilos de la columna 2 con ancho de REI).

El bucle de la matriz ya recorre cada grupo de tipo de ficha (`typeGroupEntries.forEach(([tid, groupStats], gIdx) => {...})`) y ya tiene disponible `groupFt`; por tanto basta con condicionar la etiqueta y el valor según `isFichaCoordPedagogico(groupFt)` / `isFichaCoordTutoriaJec(groupFt)` (ambos detectores **ya están importados** en las líneas 20-21 del mismo archivo).

**Origen del nombre del coordinador en los datos guardados:**
- **Coordinador de Tutoría:** `s.coordTutoriaNombre` / `s.coordinadorTutoria` / `s.coordTutoria` (se guardan en `public/js/ui/registrar.js:2616-2622`).
- **Coordinador Pedagógico:** se guarda dentro de `s.extras` (arreglo `{ id, label, value }`, ver `registrar.js:2332`); los resolutores existentes (`public/js/matriz/persona-normalizer.js:272`, `public/js/ui/consolidado.js:366`) ya contemplan la búsqueda en `extras`.

---

## 3. Cambios propuestos (archivo por archivo)

### 3.1 `public/js/reportes-datos.js` — corregir la escala de `computeItemAgg`

**a) Ampliar el import de `calcEngine.js` (línea 1):**

```js
// ANTES
import { calcScore, puntajeItem, estadoPorRegla } from './calcEngine.js?v=20261029_v2';

// DESPUÉS
import { calcScore, puntajeItem, estadoPorRegla, LEGADO_A_ESCALA } from './calcEngine.js?v=20261029_v2';
```

**b) Reemplazar la resolución de escala (línea 403):**

```js
// ANTES
const escala = isSiNo ? 'SI_NO_NA' : (activeFt?.escala || (tipoResp === 'ips' ? 'IPL' : (tipoResp === 'si_no' ? 'SI_NO_NA' : (tipoResp === 'nivel_1_4' ? 'NIVEL_1_4' : 'IPL'))));

// DESPUÉS
const escala = isSiNo
  ? 'SI_NO_NA'
  : (activeFt?.escala
    || LEGADO_A_ESCALA[tipoResp]
    || ((isFichaCoordPedagogico(ft) || isFichaCoordTutoriaJec(ft)) ? 'ESCALA_1_3' : 'IPL'));
```

> `LEGADO_A_ESCALA` ya mapea `escala_1_3 → ESCALA_1_3`, `escala1_3 → ESCALA_1_3`, `nivel_1_4 → NIVEL_1_4`, `ips → IPL`, `si_no → SI_NO_NA` (ver `public/js/calc/escalas.js:8-14`).

**c) Importar los detectores de coordinación** (si no se usan en `reportes-datos.js` todavía). Se pueden tomar desde `./calc/detectors.js?v=20261029_v2`:

```js
import { isFichaCoordPedagogico, isFichaCoordTutoriaJec } from './calc/detectors.js?v=20261029_v2';
```

> Alternativa más limpia (recomendada a mediano plazo): extraer la resolución de escala a una función compartida en `calc/escalas.js` (p. ej. `resolverEscala(ft, tieneSiNo)`) y reutilizarla tanto en `calcScore` como en `computeItemAgg`, para evitar que vuelvan a divergir.

### 3.2 `public/js/pdf/consolidado-v2.js` — distribuir respuestas `1/2/3` y `I/II/III/IV`

Reemplazar el bloque de cálculo de distribución (líneas ~809-854) por una versión que construya la lista de claves según la escala de la ficha:

```js
// Escala efectiva de la ficha (para etiquetar la distribución)
const ftEscalaRaw = String(fichaType?.escala || fichaType?.tipoRespuesta || '').toLowerCase();
const esEscala13 = ftEscalaRaw.includes('escala_1_3') || ftEscalaRaw.includes('escala1_3');
const esNivel14 = ftEscalaRaw.includes('nivel_1_4');

const totalResp = it.totalResp || it.total || 0;
const naCnt = (it.counts.na || 0) + (it.counts.nc || 0);

const distDefs = [];
if (esEscala13) {
  if (it.counts['3']) distDefs.push({ k: '3', label: 'Logrado (3)' });
  if (it.counts['2']) distDefs.push({ k: '2', label: 'En proceso (2)' });
  if (it.counts['1']) distDefs.push({ k: '1', label: 'Inicio (1)' });
} else if (esNivel14) {
  const etiq = { '4': 'IV', '3': 'III', '2': 'II', '1': 'I' };
  ['4', '3', '2', '1'].forEach(v => { if (it.counts[v]) distDefs.push({ k: v, label: etiq[v] }); });
} else {
  if (it.counts.logrado) distDefs.push({ k: 'logrado', label: 'Logrado' });
  if (it.counts.proceso) distDefs.push({ k: 'proceso', label: 'Proceso' });
  if (it.counts.inicio) distDefs.push({ k: 'inicio', label: 'Inicio' });
  if (it.counts.si) distDefs.push({ k: 'si', label: 'Sí' });
  if (it.counts.no) distDefs.push({ k: 'no', label: 'No' });
}
if (naCnt) distDefs.push({ k: 'na', label: 'N/A' });

const pctMap = {};
if (totalResp > 0 && distDefs.length > 0) {
  let sumFl = 0;
  const withRem = distDefs.map(x => {
    const c = x.k === 'na' ? naCnt : (it.counts[x.k] || 0);
    const exact = (c / totalResp) * 100;
    const fl = Math.floor(exact);
    sumFl += fl;
    return { k: x.k, fl, rem: exact - fl };
  });
  withRem.sort((a, b) => b.rem - a.rem);
  let d = Math.round(100 - sumFl);
  withRem.forEach(r => { pctMap[r.k] = r.fl + (d > 0 ? 1 : 0); if (d > 0) d--; });
}

const distParts = distDefs.map(x => {
  const c = x.k === 'na' ? naCnt : (it.counts[x.k] || 0);
  return `${x.label}: ${c}${pctMap[x.k] !== undefined ? ` (${pctMap[x.k]}%)` : ''}`;
});
```

> El resto del bloque (`const desc = ...; return [...]`) se mantiene; solo cambia cómo se construyen `pctMap` y `distParts`.

### 3.3 `public/js/pdf/consolidado-v2.js` — columna REI → coordinador en la Matriz III

**a) Agregar un helper** (junto a los imports, antes de `exportConsolidadoReportPdfV2`):

```js
/**
 * Devuelve el nombre del coordinador(a) evaluado en una ficha de coordinación
 * (pedagógico o tutoría). Si no es ficha de coordinación, devuelve el REI formateado.
 */
function getCoordinatorCell(s, ft) {
  const extras = Array.isArray(s?.extras) ? s.extras : [];
  const extraVal = (regs) => {
    const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const e = extras.find(x => regs.every(re => re.test(norm(x?.label || x?.campo || x?.nombre))));
    return e ? String(e.value || e.valor || '').trim() : '';
  };
  if (isFichaCoordPedagogico(ft)) {
    return String(
      s?.coordPedagNombre || s?.coordinadorPedagogico || s?.coordPedag || s?.coordinadorPedagogicoNombre ||
      extraVal([/coordinador/, /pedagog/]) || '—'
    ).trim() || '—';
  }
  if (isFichaCoordTutoriaJec(ft)) {
    return String(
      s?.coordTutoriaNombre || s?.coordinadorTutoria || s?.coordTutoria ||
      extraVal([/coordinador/, /tutor/]) || '—'
    ).trim() || '—';
  }
  return formatRei(s?.red);
}
```

**b) Condicionar la cabecera (línea 650):**

```js
// ANTES
const matrizHeaders = ['N.°', 'Institución Educativa', 'REI', ...(showVisitaCol ? ['Visita'] : []), ...secHeaders, 'Global', 'Estado'];

// DESPUÉS
const isCoordPedagGroup = isFichaCoordPedagogico(groupFt);
const isCoordTutoriaGroup = isFichaCoordTutoriaJec(groupFt);
const isCoordGroup = isCoordPedagGroup || isCoordTutoriaGroup;
const coordColLabel = isCoordPedagGroup
  ? 'Coordinador(a) Pedagógico'
  : (isCoordTutoriaGroup ? 'Coordinador(a) de Tutoría' : 'REI');
const matrizHeaders = ['N.°', 'Institución Educativa', coordColLabel, ...(showVisitaCol ? ['Visita'] : []), ...secHeaders, 'Global', 'Estado'];
```

**c) Condicionar la celda (líneas 691-700):**

```js
// ANTES
return [
  String(idx + 1),
  s.institucion || '—',
  formatRei(s.red),
  ...
];

// DESPUÉS
return [
  String(idx + 1),
  s.institucion || '—',
  isCoordGroup ? getCoordinatorCell(s, groupFt) : formatRei(s.red),
  ...
];
```

**d) Ajustar el ancho de la columna 2 (líneas ~708-712)** para el nombre del coordinador:

```js
const colStyles = {
  0: { halign: 'center', cellWidth: isLandscape ? 24 : 18 },
  1: { halign: 'left', valign: 'middle' },
  2: {
    halign: 'center',
    cellWidth: isCoordGroup ? (isLandscape ? 92 : 74) : (isLandscape ? 48 : 36),
    fontStyle: 'bold',
    fontSize: isCoordGroup ? 6.4 : undefined
  },
};
```

> `isCoordGroup` se define dentro del mismo `forEach` de grupos, por lo que está en alcance de `colStyles`.

---

## 4. El prompt exacto (copiar y pegar en el agente de código)

> Copia el bloque siguiente íntegro. Está escrito para que un agente de IA lo ejecute sin contexto previo.

```text
Contexto del proyecto
Trabajas sobre una aplicación web estática (HTML + JavaScript ES Modules, sin build) del
"Sistema de Monitoreo AGEBRE-UGEL 03 2026". Los reportes PDF se generan con jsPDF.
Directorio raíz del proyecto: C:\Users\agebre-ebr\Desktop\PAUL - 2026\2026\Sistema-monitoreo-main

REGLAS DE PRODUCCIÓN (la app YA está desplegada y en uso real; no hay margen para roturas):
- No migres ni escribas datos en Firestore. Este cambio es solo de presentación/agregación.
- Cambios mínimos y quirúrgicos: solo los archivos indicados. No renombres exports, no cambies
  firmas, no refactorices, no toques CSS/HTML ni `calcScore`.
- Mantén retrocompatibilidad total: la estructura de retorno de `computeItemAgg` debe quedar
  idéntica; los reportes de EBR, CEBE, PRITE, Directivo, Rúbricas y JEC institucional no deben
  cambiar su comportamiento.
- No modifiques `firebase.json`, reglas, índices ni `functions/`.
- Antes de editar, crea copias de respaldo fuera de `public/` (p. ej. `_backup_pre_produccion/`).
- No ejecutes despliegues (`firebase deploy`) ni `firebase hosting:channel:deploy`; solo entrega
  los archivos editados y el diff.
- Si algo no puede hacerse sin romper compatibilidad, detente y explica el riesgo en lugar de
  proponer una solución que requiera migración de datos.

OBJETIVO (dos correcciones en el Reporte Consolidado PDF):

PROBLEMA 1 — La sección "IV. REPORTE POR ÍTEM — CONSOLIDADO DE INDICADORES" del PDF, en las
fichas del grupo Modelo JEC (Coordinador Pedagógico y Coordinador de Tutoría, que usan
tipoRespuesta "escala_1_3" con respuestas "1", "2", "3" y "na"), muestra la columna "Fichas"
poblada pero "% Cumpl." sale "—" y "Distribución de Respuestas" sale "Sin respuestas". En las
fichas EBR sí funciona. Hay que lograr que calcule y muestre el % de cumplimiento y la
distribución también en esas fichas.

CAUSA: `computeItemAgg` en `public/js/reportes-datos.js` resuelve mal la escala. La línea ~403
usa una cadena de ternarios que no contempla "escala_1_3" y devuelve "IPL"; con escala "IPL",
`puntajeItem('IPL', '1')` devuelve null y por eso el % queda nulo y los conteos "1/2/3" no se
renderizan. La función oficial `calcScore` en `public/js/calc/score-engine.js` (líneas ~82-85)
ya resuelve bien la escala usando `LEGADO_A_ESCALA` y un caso especial para fichas de
coordinación.

CAMBIOS PARA EL PROBLEMA 1:
1) En `public/js/reportes-datos.js`:
   a. Amplía el import de `./calcEngine.js` para incluir `LEGADO_A_ESCALA`.
   b. Importa `isFichaCoordPedagogico` e `isFichaCoordTutoriaJec` desde
      `./calc/detectors.js` (o desde `./calcEngine.js`, que re-exporta los detectores).
   c. En `computeItemAgg`, reemplaza la resolución de `const escala = ...` por:
      const escala = isSiNo
        ? 'SI_NO_NA'
        : (activeFt?.escala
          || LEGADO_A_ESCALA[tipoResp]
          || ((isFichaCoordPedagogico(ft) || isFichaCoordTutoriaJec(ft)) ? 'ESCALA_1_3' : 'IPL'));
      (Conserva el resto del cuerpo de `computeItemAgg` intacto.)
2) En `public/js/pdf/consolidado-v2.js`, dentro del bucle que arma las filas de la sección IV
   (bloque de plata donde se construyen `totalResp`, `pctMap` y `distParts`, aprox. líneas
   809-854), generaliza la distribución para que reconozca:
   - escala_1_3: claves de conteo "3", "2", "1" con etiquetas "Logrado (3)", "En proceso (2)",
     "Inicio (1)".
   - nivel_1_4: claves "4", "3", "2", "1" con etiquetas "IV", "III", "II", "I".
   - comportamiento actual: logrado/proceso/inicio/si/no.
   - N/A: suma de `counts.na + counts.nc`.
   Mantén el redondeo por mayor residuo para que los porcentajes sumen 100%. La lógica exacta
   sugerida está más abajo en "CÓDIGO DE REFERENCIA".

PROBLEMA 2 — En la sección "III. MATRIZ COMPARATIVA POR INSTITUCIÓN Y DIMENSIÓN" del PDF, para
las fichas de coordinación (Coordinador Pedagógico y Coordinador de Tutoría) la columna
"REI" debe reemplazarse por los datos del coordinador(a) evaluado: encabezado
"Coordinador(a) Pedagógico" o "Coordinador(a) de Tutoría" según la ficha, y en cada fila el
nombre del coordinador. Para el resto de fichas (Implementación JEC, EBR, etc.) la columna
"REI" se mantiene igual.

CAMBIOS PARA EL PROBLEMA 2 (en `public/js/pdf/consolidado-v2.js`):
1) Agrega un helper `getCoordinatorCell(s, ft)` antes de `exportConsolidadoReportPdfV2`:
   - Si `isFichaCoordPedagogico(ft)`: devuelve `s.coordPedagNombre || s.coordinadorPedagogico
     || s.coordPedag`, o el valor de `s.extras` cuyo label contenga "coordinador" y "pedagog"
     (normaliza sin tildes y en minúsculas), o "—".
   - Si `isFichaCoordTutoriaJec(ft)`: devuelve `s.coordTutoriaNombre || s.coordinadorTutoria
     || s.coordTutoria`, o el valor de `s.extras` cuyo label contenga "coordinador" y "tutor",
     o "—".
   - En otro caso: `formatRei(s.red)`.
   Los helpers `isFichaCoordPedagogico` e `isFichaCoordTutoriaJec` YA están importados en la
   parte superior de `consolidado-v2.js`; reutilízalos. `formatRei` también ya está importado.
2) En el bucle de la Matriz III (donde se define `matrizHeaders`, línea ~650), calcula:
   const isCoordPedagGroup = isFichaCoordPedagogico(groupFt);
   const isCoordTutoriaGroup = isFichaCoordTutoriaJec(groupFt);
   const isCoordGroup = isCoordPedagGroup || isCoordTutoriaGroup;
   const coordColLabel = isCoordPedagGroup ? 'Coordinador(a) Pedagógico'
     : (isCoordTutoriaGroup ? 'Coordinador(a) de Tutoría' : 'REI');
   y usa `coordColLabel` en lugar del literal 'REI' en `matrizHeaders`.
3) En la fila de cada institución (aproximadamente línea 691-700, donde hoy aparece
   `formatRei(s.red)`), usa:
   isCoordGroup ? getCoordinatorCell(s, groupFt) : formatRei(s.red)
4) Ajusta el estilo de la columna 2 en `colStyles` (aprox. línea 711) para que, cuando
   `isCoordGroup` sea true, el ancho sea mayor y la fuente menor:
   cellWidth: isCoordGroup ? (isLandscape ? 92 : 74) : (isLandscape ? 48 : 36),
   fontSize: isCoordGroup ? 6.4 : undefined
   Mantén el resto de `colStyles` sin cambios.

CÓDIGO DE REFERENCIA (puedes adaptarlo, respetando el estilo del archivo):

--- En reportes-datos.js (imports) ---
import { calcScore, puntajeItem, estadoPorRegla, LEGADO_A_ESCALA } from './calcEngine.js';
import { isFichaCoordPedagogico, isFichaCoordTutoriaJec } from './calc/detectors.js';

--- En reportes-datos.js (dentro de computeItemAgg, reemplaza SOLO la línea de `const escala`) ---
const escala = isSiNo
  ? 'SI_NO_NA'
  : (activeFt?.escala
    || LEGADO_A_ESCALA[tipoResp]
    || ((isFichaCoordPedagogico(ft) || isFichaCoordTutoriaJec(ft)) ? 'ESCALA_1_3' : 'IPL'));

--- En consolidado-v2.js (distribución de la sección IV) ---
const ftEscalaRaw = String(fichaType?.escala || fichaType?.tipoRespuesta || '').toLowerCase();
const esEscala13 = ftEscalaRaw.includes('escala_1_3') || ftEscalaRaw.includes('escala1_3');
const esNivel14 = ftEscalaRaw.includes('nivel_1_4');
const totalResp = it.totalResp || it.total || 0;
const naCnt = (it.counts.na || 0) + (it.counts.nc || 0);
const distDefs = [];
if (esEscala13) {
  if (it.counts['3']) distDefs.push({ k: '3', label: 'Logrado (3)' });
  if (it.counts['2']) distDefs.push({ k: '2', label: 'En proceso (2)' });
  if (it.counts['1']) distDefs.push({ k: '1', label: 'Inicio (1)' });
} else if (esNivel14) {
  const etiq = { '4': 'IV', '3': 'III', '2': 'II', '1': 'I' };
  ['4', '3', '2', '1'].forEach(v => { if (it.counts[v]) distDefs.push({ k: v, label: etiq[v] }); });
} else {
  if (it.counts.logrado) distDefs.push({ k: 'logrado', label: 'Logrado' });
  if (it.counts.proceso) distDefs.push({ k: 'proceso', label: 'Proceso' });
  if (it.counts.inicio) distDefs.push({ k: 'inicio', label: 'Inicio' });
  if (it.counts.si) distDefs.push({ k: 'si', label: 'Sí' });
  if (it.counts.no) distDefs.push({ k: 'no', label: 'No' });
}
if (naCnt) distDefs.push({ k: 'na', label: 'N/A' });
const pctMap = {};
if (totalResp > 0 && distDefs.length > 0) {
  let sumFl = 0;
  const withRem = distDefs.map(x => {
    const c = x.k === 'na' ? naCnt : (it.counts[x.k] || 0);
    const exact = (c / totalResp) * 100;
    const fl = Math.floor(exact);
    sumFl += fl;
    return { k: x.k, fl, rem: exact - fl };
  });
  withRem.sort((a, b) => b.rem - a.rem);
  let d = Math.round(100 - sumFl);
  withRem.forEach(r => { pctMap[r.k] = r.fl + (d > 0 ? 1 : 0); if (d > 0) d--; });
}
const distParts = distDefs.map(x => {
  const c = x.k === 'na' ? naCnt : (it.counts[x.k] || 0);
  return `${x.label}: ${c}${pctMap[x.k] !== undefined ? ` (${pctMap[x.k]}%)` : ''}`;
});

--- En consolidado-v2.js (helper) ---
function getCoordinatorCell(s, ft) {
  const extras = Array.isArray(s?.extras) ? s.extras : [];
  const extraVal = (regs) => {
    const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const e = extras.find(x => regs.every(re => re.test(norm(x?.label || x?.campo || x?.nombre))));
    return e ? String(e.value || e.valor || '').trim() : '';
  };
  if (isFichaCoordPedagogico(ft)) {
    return String(s?.coordPedagNombre || s?.coordinadorPedagogico || s?.coordPedag
      || extraVal([/coordinador/, /pedagog/]) || '—').trim() || '—';
  }
  if (isFichaCoordTutoriaJec(ft)) {
    return String(s?.coordTutoriaNombre || s?.coordinadorTutoria || s?.coordTutoria
      || extraVal([/coordinador/, /tutor/]) || '—').trim() || '—';
  }
  return formatRei(s?.red);
}

VERIFICACIÓN OBLIGATORIA (sin servidor; el proyecto es estático):
1) Revisa que `computeItemAgg` siga devolviendo la misma estructura
   `{nombre, items:[{texto,id,counts,total,pct}], avg}`.
2) Revisa que `LEGADO_A_ESCALA` esté realmente exportado por `calcEngine.js` (vía
   `calc/index.js` → `escalas.js`); si no, importa `LEGADO_A_ESCALA` directamente desde
   `./calc/escalas.js`.
3) Confirma que no haya rutas de import rotas ni dependencias circulares nuevas.
4) Si el proyecto tiene tests en `scripts/tests/`, ejecuta los relevantes
   (p. ej. `node scripts/tests/test-reportes-ebr-jec-calc-sync.mjs`) SOLO si el entorno de
   comandos funciona; si no, deja constancia de que no se pudieron ejecutar.

CRITERIOS DE ACEPTACIÓN:
- En el PDF de Coordinador(a) Pedagógico y Coordinador(a) de Tutoría, la sección IV muestra
  "% Cumpl." con número real (no "—") y "Distribución de Respuestas" con conteos y porcentajes
  (p. ej. "Logrado (3): 20 (33%) · En proceso (2): 30 (50%) · Inicio (1): 10 (17%)").
- En la sección III de esas mismas fichas, la columna se titula "Coordinador(a) Pedagógico" o
  "Coordinador(a) de Tutoría" y muestra el nombre del coordinador (o "—" si no hay dato).
- En las fichas EBR, JEC institucional, CEBE, PRITE, Directivo y Rúbricas, el comportamiento de
  las secciones III y IV no debe cambiar (salvo que mejore la distribución de nivel_1_4).
- No debe romperse la vista web del Reporte por Ítem (`renderItemReportHtml`).
- Reporta al final: archivos modificados, líneas cambiadas y el fragmento diff resultante.
```

---

## 5. Checklist de verificación manual

| # | Caso | Resultado esperado |
| :- | :-- | :-- |
| 1 | PDF → Coordinador Pedagógico → "Incluir reporte por ítem" | Sección IV con `% Cumpl.` numérico y distribución 1/2/3 |
| 2 | PDF → Coordinador de Tutoría → "Incluir reporte por ítem" | Sección IV con `% Cumpl.` numérico y distribución 1/2/3 |
| 3 | PDF → Coordinador Pedagógico → Matriz III | Encabezado "Coordinador(a) Pedagógico" y nombre en la columna 3 |
| 4 | PDF → Coordinador de Tutoría → Matriz III | Encabezado "Coordinador(a) de Tutoría" y nombre en la columna 3 |
| 5 | PDF → Implementación JEC | Matriz III conserva "REI"; sección IV conserva "Sí/No" |
| 6 | PDF → EBR Gestión Escolar | Sin regresiones (distribución Logrado/Proceso/Inicio/N/A) |
| 7 | Vista web Reportes → "Reporte por Ítem" | % y distribución correctos en fichas de coordinación |

---

## 6. Plan de despliegue y rollback seguro (producción)

### 6.1 Antes de tocar código
1. Copia de respaldo **fuera de `public/`** (para que no se publique con el sitio):
   ```bat
   mkdir _backup_pre_produccion
   copy public\js\reportes-datos.js _backup_pre_produccion\reportes-datos.js.bak
   copy public\js\pdf\consolidado-v2.js _backup_pre_produccion\consolidado-v2.js.bak
   ```
2. (Recomendado) Verifica en un registro real que la ficha de coordinación tenga el nombre del coordinador guardado (`coordTutoriaNombre` o dentro de `extras`), para que la nueva columna no salga vacía. Si faltara, mostrará "—".

### 6.2 Validación local (sin desplegar)
- Abre en el navegador los runners de prueba incluidos (son estáticos):
  `public/test-reportes-redesign-runner.html`, `public/test-reportes-runner.html`,
  `public/test-ebr-score-runner.html`.
- Genera un PDF de prueba de Coordinador Pedagógico y de Coordinador de Tutoría y verifica:
  sección IV con % y distribución; matriz III con la columna del coordinador.
- Genera también un PDF de EBR y de Implementación JEC para confirmar que **no hay regresiones**.

### 6.3 Despliegue en canal de vista previa (obligatorio)
```bat
firebase hosting:channel:deploy tst-jec-fix --expires 7d --project sistematizacion-fichas
```
Prueba en la URL del canal con datos reales (misma base de producción, sin afectar a los usuarios).

### 6.4 Promoción a producción
```bat
firebase hosting:channel:deploy live --project sistematizacion-fichas
```
(o `firebase deploy --only hosting --project sistematizacion-fichas`).
> No ejecutes `firebase deploy` sin `--only hosting`: `functions/` y reglas no cambian y no deben republicarse.

### 6.5 Verificación post-despliegue
- Abre la app en producción, descarga un PDF de Coordinador Pedagógico y otro de Coordinador de Tutoría y confirma los criterios de aceptación (§5).
- Revisa la consola del navegador: no debe haber errores de import.

### 6.6 Rollback (si algo falla)
| Nivel | Acción | Efecto |
| :-- | :-- | :-- |
| 1 (contención, sin redeploy) | Consola del navegador: `window.__REPORT_PDF_V1 = true` antes de descargar | Fuerza el reporte V1 legado. **Ojo:** V1 es una maqueta más simple (solo sección I + nota metodológica + firmas), **no tiene secciones III/IV**; úsalo solo como contención. |
| 2 (recomendado) | `firebase hosting:rollback --project sistematizacion-fichas` | Restaura la release anterior al instante (sin downtime). |
| 3 (código) | Restaurar los `*.bak` de `_backup_pre_produccion/` y volver a desplegar | Vuelve exactamente al estado previo. |

### 6.7 Riesgos residuales y su mitigación
| Riesgo | Probabilidad | Mitigación |
| :-- | :-- | :-- |
| La columna del coordinador sale "—" por falta de dato en registros antiguos | Media | El helper cae a "—" (igual que hoy con REI vacío). Verificar datos antes (§6.1.2). |
| `computeItemAgg` mejora también el % en la **vista web** "Reporte por Ítem" de coordinación | Alta (esperado) | Es la mejora deseada; validar con `test-reportes-redesign-runner.html`. |
| Cambio visual en PDFs oficiales ya emitidos | Nula | Los PDF ya emitidos no se regeneran; el cambio solo aplica a nuevas descargas. |
| Caché del navegador sirviendo JS viejo | Nula | `firebase.json` ya fuerza `no-store`. |
| Errores por `LEGADO_A_ESCALA` no exportado | Baja | Verificación §4 punto 2; si no está, importarlo desde `./calc/escalas.js`. |

---

*Fin del documento.*
