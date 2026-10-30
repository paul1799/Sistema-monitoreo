# Verificación — Fichas nuevas creadas desde la web (dinámicas)

**Sistema:** Sistematización AGEBRE-2026 · UGEL 03
**Objeto:** verificar las mejoras aplicadas al flujo de **fichas creadas desde el editor de plantillas web** (fichas dinámicas/personalizadas) y dejar las brechas para la mejora continua.
**Fecha:** 30/10/2026
**Método:** revisión estática del código del workspace (el entorno de comandos `pwsh` sigue fallando con `0xC0000142`, por lo que **no** se pudieron ejecutar pruebas automáticas).

---

## 1. Resumen ejecutivo

| Estado | Hallazgo |
| :-- | :-- |
| ✅ **Aplicado** | `computeItemAgg` ya resuelve bien la escala y hace *matching* robusto de respuestas para fichas personalizadas (`reportes-datos.js`). |
| ⏳ **Pendiente** | El **PDF** de la sección IV todavía muestra "Sin respuestas" en fichas con escala `1–3` o `I–IV` (la web sí las muestra). |
| ⏳ **Pendiente** | Los cortes/niveles del PDF no respetan la `regla_nivel` elegida en el builder. |
| ⏳ **Pendiente** | Fichas nuevas con nombre parecido a JEC/EBR/Directivo pueden ser **fusionadas/ocultadas** por la sanitización de `app.js`. |
| ⏳ **Pendiente** | Borradores (`esBorrador: true`) aparecen como fichas usables en "Registrar ficha". |
| ✅ **Verificado** | Seguridad (solo admin escribe `fichaTypes`), validaciones del builder, `isFichaActiva`, cálculo de puntaje, matriz Excel genérica y PDF individual genérico. |

---

## 2. Flujo verificado (end-to-end)

```
Admin → Registrar ficha → Plantillas → Nueva ficha
   startNewPlantillaBuilder() → blankBuilder()                (plantillas.js:154-206)
   Builder visual / JSON (secciones, ítems, extras, visitas)  (plantillas.js:1593-3845)
   "Guardar borrador" / "Guardar ficha completa"             (plantillas.js:3594-3844)
        → fichaTypes.add() / .set()                            (plantillas.js:3637-3641 / 3800-3804)
        → sync en memoria + invalidación de caché del form     (plantillas.js:3647-3668 / 3810-3831)
   app.js onSnapshot('fichaTypes') → sanitiza → state.fichaTypes (app.js:400-644)
   Registrar ficha (form dinámico)                             (registrar.js)
   Reportes: getEnrichedFichaType → calcScore → computeItemAgg (consolidado.js / reportes-datos.js)
   PDF consolidado / PDF individual / Matriz Excel            (pdf/*, matriz/config-generator.js)
```

---

## 3. Estado de las mejoras aplicadas

### 3.1 ✅ Aplicado — `public/js/reportes-datos.js` (`computeItemAgg`)

Se verificó que el archivo ya incorpora las mejoras para fichas dinámicas:

- **Escala correcta** (líneas 404-408):
  ```js
  const escala = isSiNo
    ? 'SI_NO_NA'
    : (activeFt?.escala
      || LEGADO_A_ESCALA[tipoResp]
      || ((isFichaCoordPedagogico(ft) || isFichaCoordTutoriaJec(ft)) ? 'ESCALA_1_3' : 'IPL'));
  ```
  Ya no cae en `'IPL'` para `tipoRespuesta: 'escala_1_3'`.

- **Matching de respuestas ampliado a 7 criterios** (líneas 415-444): ID directo, texto normalizado (con/sin sección), posición `seccionIdx/itemIdx`, `domKey`, sección normalizada + número, ID normalizado, y texto como respaldo. El propio comentario indica: *"lo más confiable en fichas personalizadas"*.

- **Importaciones nuevas** (líneas 1-2): `LEGADO_A_ESCALA` y los detectores de coordinación.

**Efecto verificado:** las fichas nuevas con `escala_1_3` ahora calculan `% Cumpl.` en la sección IV (antes salía `—`), y el *matching* resiste que el builder regenere IDs o que se editen textos.

---

## 4. Brechas pendientes (priorizadas)

### 4.1 ⏳ ALTA — Distribución de respuestas en el PDF no cubre `1–3` ni `I–IV`

**Evidencia:** `public/js/pdf/consolidado-v2.js:855-871` solo reconoce `logrado / proceso / inicio / si / no / na`:

```js
const distParts = [];
if (it.counts.logrado) distParts.push(`Logrado: ...`);
if (it.counts.proceso) distParts.push(`Proceso: ...`);
if (it.counts.inicio)  distParts.push(`Inicio: ...`);
...
distParts.join('  ·  ') || 'Sin respuestas'
```

**Efecto:** en una ficha nueva con `tipoRespuesta: 'escala_1_3'` (o `nivel_1_4`), el PDF mostrará el `%` ya corregido pero la columna **"Distribución de Respuestas" seguirá diciendo "Sin respuestas"**. La **vista web** sí las muestra (usa `RESPONSE_OPTIONS` en `scoring.js:35-40`), por lo que queda una **inconsistencia web vs. PDF**.

**Acción:** generalizar `distParts` y `pctMap` para reconocer:
- `escala_1_3`: claves `3/2/1` → "Logrado (3) / En proceso (2) / Inicio (1)".
- `nivel_1_4`: claves `4/3/2/1` → "IV / III / II / I".
- Caso actual: `logrado / proceso / inicio / si / no`.
- `N/A`: `counts.na + counts.nc`.

El parche exacto está en `docs/REVISION_MEJORA_REPORTES_JEC_2026.md` §3.2; sirve igual para fichas dinámicas.

### 4.2 ⏳ ALTA — Los cortes de nivel del PDF no respetan la `regla_nivel` del builder

**Evidencia:** `consolidado-v2.js:659-660` y `802-804` fijan los cortes por heurística:

```js
const gLogCut = groupIsEbr ? 67 : 85;
const gProcCut = groupIsEbr ? 34 : 70;
...
const secCut = isEbr ? 67 : 85;
```

**Efecto:** si el administrador crea una ficha con `regla_nivel: 'conteo_rangos'` o con umbrales propios, el PDF puede colorear/mostrar el estado con 67/34 u 85/70 en lugar de la regla elegida. El nivel general (`calcScore`/`estadoPorRegla`) sí puede diferir del estado mostrado en la sección IV → **inconsistencia interna**.

**Acción:** derivar los cortes de `regla_nivel` (o de `tipoRespuesta`) mediante un helper único, con *fallback* al comportamiento actual para no romper fichas oficiales.

### 4.3 ⏳ ALTA — Sanitización de `app.js` puede ocultar fichas nuevas

**Evidencia:** `app.js:599-640` unifica/descarta por heurística de nombre/ID:

- `isJecImplementation(item)` → si el nombre contiene "modelo jec", "implementación…jec", etc., la ficha **no se agrega** a `loaded`; se muestra `jecDoc` (`ft_msejec_2do`).
- `isFichaEbrGestionEscolar(item)` → si el nombre contiene "gestión escolar" + "ebr", se reemplaza por `ebrDoc`.
- `isDirectivoDoc(item)` → nombre exacto "ficha de monitoreo al directivo de ie".

**Efecto:** una ficha **nueva** llamada, por ejemplo, *"Monitoreo al Modelo JEC 2027"* o *"Ficha de Monitoreo al Directivo de IE 2027"* **desaparece del catálogo** (se muestra la canónica). Es el riesgo más relevante para "ir creando fichas nuevas".

**Acción:** marcar las fichas creadas por el builder (`origen: 'builder'` o `esCustom: true`) y excluirlas de la unificación/dedupe en `app.js` (y del borrado de duplicados). Alternativa: restringir la unificación solo a los IDs canónicos.

### 4.4 ⏳ MEDIA — Borradores visibles en "Registrar ficha"

**Evidencia:** `plantillas.js:3629-3630` guarda `esBorrador: true`; `registrar.js:312` solo filtra `isFichaActiva`:

```js
const allTypes = (state.fichaTypes || []).filter(isFichaActiva);
```

**Efecto:** un borrador aparece como ficha usable, lo que puede generar registros sobre plantillas incompletas.

**Acción:** filtrar `ft.esBorrador !== true` en el catálogo de registro (y en selectores de reportes), o mostrar un distintivo "BORRADOR" con confirmación.

### 4.5 ⏳ MEDIA — El builder no persiste `escala` (v2)

**Evidencia:** `plantillas.js` guarda `tipoRespuesta` (líneas 3617/3780) pero no `escala`. Funciona gracias a `LEGADO_A_ESCALA`, pero el contrato v2 queda implícito.

**Acción:** añadir `escala: LEGADO_A_ESCALA[bs.tipoRespuesta]` al payload (higiene de datos, sin cambiar comportamiento).

### 4.6 ⏳ MEDIA — `regla_nivel` se guarda como texto, no como objeto

**Evidencia:** `plantillas.js:3618/3781` guarda `regla_nivel: 'porcentaje'` (string). El motor tolera el string (cae a umbrales 67/34), pero **no aplica umbrales personalizados** salvo que se use `conteo_rangos` con `regla_nivel_config`.

**Acción:** normalizar a objeto (`{ tipo: 'porcentaje', umbrales: [...] }`) o exponer umbrales editables y validarlos.

### 4.7 ⏳ BAJA — Modo JSON permite `tipoRespuesta` no soportado

**Evidencia:** el modo JSON hace `Object.assign(bs, parsed)` sin validar (`plantillas.js:210-221`); `scoring.js:35-40` solo define `si_no`, `ips`, `escala_1_3`, `nivel_1_4`.

**Efecto:** un valor no soportado deja el formulario **sin opciones de respuesta**.

**Acción:** validar `tipoRespuesta` contra las 4 escalas al importar JSON y al guardar.

### 4.8 ⏳ BAJA — Sin historial/auditoría de cambios de plantilla

**Evidencia:** el payload guarda `version` y `updatedAt`, pero no `updatedBy` ni historial.

**Acción:** añadir `updatedBy` (uid) y, opcionalmente, una colección `fichaTypesHistorial`.

---

## 5. Fortalezas verificadas ✅

| Aspecto | Evidencia |
| :-- | :-- |
| Solo admin crea/edita/borra fichas | `firestore.rules:43-46` |
| Validación de al menos 1 sección con 1 ítem | `plantillas.js:3753-3756` |
| IDs de ítem únicos (regenera colisiones/numéricos) | `plantillas.js:3710-3745` |
| Sincronización inmediata en memoria + invalidación de caché del form | `plantillas.js:3647-3668`, `3810-3831` |
| Fichas inactivas se ocultan en registro/dashboard/reportes | `registrar.js:312`, `dashboard.js:13`, `consolidado.js:997` |
| `calcScore` resuelve las 4 escalas | `score-engine.js:82-85` |
| Matriz comparativa III dinámica (secciones reales) | `consolidado-v2.js:568-741` |
| Matriz Excel con *fallback* genérico | `matriz/config-generator.js:203-244` |
| PDF individual con ruta genérica | `pdf/ficha-individual.js:63+` |
| Agrupación/orden con *fallbacks* | `consolidado.js:118-179` |

---

## 6. Plan de mejora priorizado

| Fase | Acción | Archivos | Riesgo |
| :-- | :-- | :-- | :-- |
| **1. Consistencia del PDF** | Distribución `1–3` / `I–IV` y cortes derivados de `regla_nivel` | `pdf/consolidado-v2.js` | Bajo (solo presentación) |
| **2. Estabilidad de fichas nuevas** | Marca `origen: 'builder'` y exclusión de la unificación; filtro de borradores | `plantillas.js`, `app.js`, `registrar.js` | Medio (toca el listener de fichas) |
| **3. Calidad de datos** | Persistir `escala`; validar `tipoRespuesta` en JSON | `plantillas.js` | Bajo |
| **4. Gobernanza** | `updatedBy` + historial de plantillas | `plantillas.js` | Bajo |

> Todas las fases mantienen compatibilidad: las fichas oficiales y sus IDs canónicos no cambian.

---

## 7. Checklist de validación para cada ficha nueva

Ejecutar manualmente (el entorno de comandos no está disponible para automatizar):

| # | Prueba | Resultado esperado |
| :- | :-- | :-- |
| 1 | Crear ficha nueva (2 secciones, 5 ítems, `ips`), guardar completa | Aparece en "Registrar ficha" |
| 2 | Registrar una visita con respuestas | Se guarda y aparece en "Reportes" |
| 3 | Abrir "Reporte por ítem" (web) | % y distribución correctos |
| 4 | Descargar PDF consolidado con "Incluir reporte por ítem" | Sección IV con % y distribución |
| 5 | Repetir 1–4 con `escala_1_3` | % correcto; distribución **1/2/3** visible (si se aplica §4.1) |
| 6 | Repetir 1–4 con `nivel_1_4` | % correcto; distribución **I/II/III/IV** visible |
| 7 | Descargar PDF individual | Ficha completa con respuestas |
| 8 | Exportar Matriz Excel | Hoja genérica con los ítems |
| 9 | Desactivar la ficha (`activo: false`) | Desaparece de registro y reportes |
| 10 | Editar un ítem (cambiar texto) y revisar fichas históricas | Las históricas mantienen su % (matching por ID) |
| 11 | Crear ficha con nombre "Modelo JEC 2027" | **Debe** aparecer como ficha propia (hoy se fusiona — §4.3) |

---

## 8. Conclusión

Las mejoras aplicadas en `reportes-datos.js` **corrigen la base** del problema para fichas dinámicas: ahora se calcula el `%` con la escala correcta y el *matching* de respuestas es robusto. Sin embargo, la verificación revela que **el PDF aún no refleja la distribución** de escalas `1–3`/`I–IV`, que **los cortes no siguen la regla configurada** y que **la sanitización de `app.js` puede ocultar fichas nuevas** con nombres parecidos a las oficiales.

Aplicar las fases 1 y 2 del plan (§6) deja el flujo de fichas dinámicas **coherente entre web y PDF** y **seguro para producción**, sin migración de datos ni cambios en las fichas oficiales.

---

*Fin del documento.*
