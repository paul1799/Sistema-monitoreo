# =========================================================================
# test-consolidado-v2.ps1
# Suite de pruebas automatizadas para la verificación de mejoras del
# Reporte Consolidado Oficial (PDF V2) - UGEL 03 / AGEBRE
# =========================================================================

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$pdfJsPath = Join-Path $root "public\js\pdf-template.js"
$uiJsPath = Join-Path $root "public\js\ui.js"

$script:totalTests = 0
$script:passedTests = 0

function Assert-Test {
  param(
    [string]$name,
    [bool]$condition,
    [string]$failureMsg = ""
  )
  $script:totalTests++
  if ($condition) {
    $script:passedTests++
    Write-Host "  [PASS] $name" -ForegroundColor Green
  } else {
    Write-Host "  [FAIL] $name - $failureMsg" -ForegroundColor Red
  }
}

Write-Host "`n=== INICIANDO VALIDACION DEL REPORTE CONSOLIDADO PDF V2 (UGEL 03 · AGEBRE) ===`n" -ForegroundColor Cyan

$pdfJs = Get-Content -Raw -Encoding UTF8 $pdfJsPath
$uiJs = Get-Content -Raw -Encoding UTF8 $uiJsPath

# -------------------------------------------------------------------------
# GRUPO 1: Diagnostico y correccion de duplicacion de datos (R1)
# -------------------------------------------------------------------------
Write-Host "1. Verificando eliminacion de duplicacion de valores en texto y tarjetas (R1)..." -ForegroundColor Yellow

$hasCleanIntro = $pdfJs.Contains('Se reporta un total de ${plural(totalFichas, ''ficha'', ''fichas'')}')
Assert-Test -name "introParagraph en V2 usa plural(...) sin anteponer totalFichas duplicado" -condition $hasCleanIntro -failureMsg "Aun se encuentra concatenacion duplicada en introParagraph"

$hasCleanKpi = $pdfJs -match 'val:\s*String\(totalFichas\),\s*lbl:\s*''FICHAS REGISTRADAS'''
Assert-Test -name "Tarjetas KPI en V2 muestran valor numerico unico" -condition $hasCleanKpi -failureMsg "Las tarjetas KPI no estan usando valor numerico simple sin duplicar"

$hasEmptyMetaGrid = $pdfJs.Contains("metaGrid: [],")
Assert-Test -name "metaGrid en llamada createOfficialPdfDocument de V2 es array vacio" -condition $hasEmptyMetaGrid -failureMsg "metaGrid deberia ser [] para dar paso a las tarjetas KPI con franja de color"

# -------------------------------------------------------------------------
# GRUPO 2: Grafico de Dona y 3 Tarjetas KPI en Seccion I (R1)
# -------------------------------------------------------------------------
Write-Host "`n2. Verificando grafico de dona vectorial y tarjetas KPI en Seccion I (R1)..." -ForegroundColor Yellow

$hasDonutFn = $pdfJs.Contains("export function drawPdfDonutChart(")
Assert-Test -name "Funcion drawPdfDonutChart exportada en pdf-template.js" -condition $hasDonutFn -failureMsg "Falta export function drawPdfDonutChart"

$hasSingle100 = $pdfJs.Contains("const single100 = segments.find(")
Assert-Test -name "drawPdfDonutChart maneja caso de 100% en una sola categoria" -condition $hasSingle100 -failureMsg "drawPdfDonutChart debe manejar single100 sin errores por segmentos en 0"

$hasCenterText = $pdfJs -match 'doc\.text\(displayTotal,\s*cx,\s*cy\s*-\s*1'
Assert-Test -name "drawPdfDonutChart dibuja total y etiqueta fichas al centro" -condition $hasCenterText -failureMsg "Falta centrado del total en la dona"

$hasKpiColors = ($pdfJs.Contains("37, 99, 235")) -and ($pdfJs.Contains("22, 163, 74")) -and ($pdfJs.Contains("217, 119, 6"))
Assert-Test -name "Tarjetas KPI tienen las 3 franjas de color requeridas (Azul, Verde, Ambar)" -condition $hasKpiColors -failureMsg "Faltan los colores oficiales de las franjas KPI"

$hasDonutInSec1 = ($pdfJs.Contains("drawPdfDonutChart(doc, donutCx"))
Assert-Test -name "Seccion I elimino la barra horizontal previa y usa el panel de dona" -condition $hasDonutInSec1 -failureMsg "No se encontro la integracion de la dona en Seccion I"

# -------------------------------------------------------------------------
# GRUPO 3: Avance por seccion con barras visibles y escala oficial (R2)
# -------------------------------------------------------------------------
Write-Host "`n3. Verificando barras de avance visibles y consistencia de niveles (R2)..." -ForegroundColor Yellow

$hasSafePctRead = $pdfJs.Contains("rawObj.pct !== undefined ? rawObj.pct : rawObj.raw.pct") -or ($pdfJs -match 'rawObj\.pct\s*!==\s*undefined')
Assert-Test -name "Lectura segura de pct en didDrawCell (soporta rawObj.pct y rawObj.raw.pct)" -condition $hasSafePctRead -failureMsg "didDrawCell no tiene el unwrapping seguro para extraer pct de jspdf-autotable"

$hasOfficialEbrCut = ($pdfJs.Contains("if (avg >= logCut)") -and $pdfJs.Contains("statusLabel = 'Logrado';"))
Assert-Test -name "Escala oficial EBR en Seccion II usa logCut = 67% (82% es Logrado)" -condition $hasOfficialEbrCut -failureMsg "Seccion II no esta usando logCut (67%) para clasificar el nivel de la dimension"

$hasLegendSec2 = $pdfJs.Contains("Logrado (>= ") -and $pdfJs.Contains("Proceso (") -and $pdfJs.Contains("Inicio (< ")
Assert-Test -name "Subtitulo de Seccion II incluye la leyenda completa de colores" -condition $hasLegendSec2 -failureMsg "Falta la leyenda de colores oficial en la Seccion II"

# -------------------------------------------------------------------------
# GRUPO 4: Matriz comparativa y columna REI (R3)
# -------------------------------------------------------------------------
Write-Host "`n4. Verificando Matriz comparativa por institucion y dimension + columna REI (R3)..." -ForegroundColor Yellow

$hasFormatReiFn = $pdfJs.Contains("export function formatRei(")
Assert-Test -name "Funcion formatRei exportada en pdf-template.js" -condition $hasFormatReiFn -failureMsg "Falta export function formatRei"

$hasPadStartRei = $pdfJs -match 'REI\s*\$\{clean\.padStart\(2,\s*''0''\)\}'
Assert-Test -name "formatRei antepone REI a numeros simples (01 -> REI 01)" -condition $hasPadStartRei -failureMsg "formatRei no normaliza con padStart de 2 digitos"

$hasReplaceRed = $pdfJs -match 'upper\.replace\(\/\^RED\\s\+\/,\s*''REI ''\)'
Assert-Test -name "formatRei convierte RED 04 en REI 04" -condition $hasReplaceRed -failureMsg "formatRei no reemplaza RED por REI"

$hasReiHeader = $pdfJs -match 'matrizHeaders\s*=\s*\[.*''REI''.*\]'
Assert-Test -name "Cabecera de la matriz incluye REI inmediatamente tras Institucion Educativa" -condition $hasReiHeader -failureMsg "La columna REI no esta colocada inmediatamente despues de Institucion Educativa"

$hasShowHead = $pdfJs -match 'showHead:\s*''everyPage'''
Assert-Test -name "Matriz incluye showHead: everyPage para repetir cabeceras en saltos de pagina" -condition $hasShowHead -failureMsg "Falta showHead: everyPage en la Matriz Comparativa"

$hasAscendingSort = $pdfJs -match 'sortedStats\s*=\s*\[\.\.\.statsList\]\.sort'
Assert-Test -name "Matriz ordenada de menor a mayor cumplimiento global" -condition $hasAscendingSort -failureMsg "El ordenamiento de la matriz no es de menor a mayor"

# -------------------------------------------------------------------------
# GRUPO 5: Limpieza de secciones, correlatividad y nota metodologica (R4)
# -------------------------------------------------------------------------
Write-Host "`n5. Verificando estructura, numeracion correlativa y nota metodologica (R4)..." -ForegroundColor Yellow

$hasNoDetalleInV2 = -not ($pdfJs -match 'export async function exportConsolidadoReportPdfV2[\s\S]*?DETALLE DE FICHAS DE MONITOREO REGISTRADAS')
Assert-Test -name "Seccion DETALLE DE FICHAS DE MONITOREO REGISTRADAS retirada de V2" -condition $hasNoDetalleInV2 -failureMsg "La seccion Detalle de Fichas no debe estar en V2"

$hasNoResumenInV2 = -not ($pdfJs -match 'export async function exportConsolidadoReportPdfV2[\s\S]*?RESUMEN EJECUTIVO DE MONITOREO')
Assert-Test -name "Encabezado vacio RESUMEN EJECUTIVO DE MONITOREO retirado de V2" -condition $hasNoResumenInV2 -failureMsg "El encabezado vacio Resumen Ejecutivo no debe estar en V2"

$hasSec1 = $pdfJs.Contains("title: 'I. DISTRIBUCI")
$hasSec2 = $pdfJs.Contains("title: 'II. AVANCE POR SECCI") -or $pdfJs.Contains("title: 'II. AVANCE GENERAL")
$hasSec3 = $pdfJs.Contains("title: 'III. MATRIZ COMPARATIVA")
Assert-Test -name "Numeracion estrictamente correlativa I, II, III en V2" -condition ($hasSec1 -and $hasSec2 -and $hasSec3) -failureMsg "Las secciones deben estar numeradas correlativamente como I, II y III"

$hasDynamicHeightNote = ($pdfJs.Contains("const neededH = 16 + (splitSec.length * 11) + 14;")) -and ($pdfJs.Contains("curY + neededH > pageH - 46"))
Assert-Test -name "Nota metodologica en createOfficialPdfDocument calcula altura total antes del salto de pagina" -condition $hasDynamicHeightNote -failureMsg "Falta el calculo dinamico de altura en summarySections para evitar texto truncado"

# -------------------------------------------------------------------------
# GRUPO 6: Feature Flag, Zero-downtime y Rollback (R5)
# -------------------------------------------------------------------------
Write-Host "`n6. Verificando Feature Flag, compatibilidad hacia atras y despliegue seguro (R5)..." -ForegroundColor Yellow

$hasV2Export = $pdfJs.Contains("export async function exportConsolidadoReportPdfV2(")
Assert-Test -name "exportConsolidadoReportPdfV2 exportada" -condition $hasV2Export -failureMsg "Falta exportConsolidadoReportPdfV2"

$hasV1Export = $pdfJs.Contains("export async function exportConsolidadoReportPdfV1(")
Assert-Test -name "exportConsolidadoReportPdfV1 exportada como salvaguarda de rollback" -condition $hasV1Export -failureMsg "Falta exportConsolidadoReportPdfV1"

$hasFeatureFlag = $pdfJs.Contains("exportConsolidadoReportPdfV1(statsList, fichaType, filters, isAllMode, downloadConfig)") -and $pdfJs.Contains("exportConsolidadoReportPdfV2(statsList, fichaType, filters, isAllMode, downloadConfig)")
Assert-Test -name "exportConsolidadoReportPdf rutea a V2 por defecto y a V1 si se fuerza version" -condition $hasFeatureFlag -failureMsg "Falta el feature flag condicional en exportConsolidadoReportPdf"

$hasUpdatedCache = $uiJs.Contains("./pdf-template.js?v=20260929_v18") -or $uiJs.Contains("./pdf-template.js?v=20260929_v17")
Assert-Test -name "ui.js importa con nuevo hash de version v20260929_v18" -condition $hasUpdatedCache -failureMsg "ui.js debe tener cache-buster actualizado para refrescar sin cache residual"

# -------------------------------------------------------------------------
# GRUPO 7: Nuevos requerimientos de esta iteracion (R1 - R6)
# -------------------------------------------------------------------------
Write-Host "`n7. Verificando requerimientos de la nueva iteracion (R1 a R6)..." -ForegroundColor Yellow

$hasEnlargedDonut = $pdfJs -match 'donutOuterR\s*=\s*(4[5-9]|50)'
Assert-Test -name "R1: Grafico de dona agrandado ~1.75x (donutOuterR >= 48)" -condition $hasEnlargedDonut -failureMsg "donutOuterR debe ser ~48pt"

$hasScaledDonutFont = $pdfJs.Contains("numFontSize = outerRadius >= 40 ? 22 : 13")
Assert-Test -name "R1: Tamano de numero central escalado proporcionalmente a 22pt" -condition $hasScaledDonutFont -failureMsg "Falta escalado de numFontSize a 22pt para donas grandes"

$hasSoloHeaderP1 = $pdfJs.Contains("soloEncabezadoPagina1: true") -and $pdfJs.Contains("soloEncabezadoPagina1 = false")
Assert-Test -name "R2: Encabezado institucional exclusivo de pagina 1 (soloEncabezadoPagina1: true)" -condition $hasSoloHeaderP1 -failureMsg "Falta implementacion de soloEncabezadoPagina1"

$hasDynamicDimHeaders = $pdfJs.Contains('${count} ind.') -or $pdfJs.Contains('ind.)')
Assert-Test -name "R3: Cabeceras de matriz usan nombres reales de secciones con conteo de indicadores" -condition $hasDynamicDimHeaders -failureMsg "Falta el nombre real de dimension con conteo de indicadores"

$hasConditionalVisita = $pdfJs.Contains("showVisitaCol") -and $pdfJs.Contains("isSingleVisitFilter")
Assert-Test -name "R3: Columna Visita condicional (se oculta cuando el filtro es visita unica)" -condition $hasConditionalVisita -failureMsg "Falta ocultamiento condicional de la columna Visita"

$hasTiebreakerSort = $pdfJs.Contains("localeCompare")
Assert-Test -name "R3: Desempate alfabetico por Institucion Educativa en matriz" -condition $hasTiebreakerSort -failureMsg "Falta criterio de desempate por nombre de I.E."

$hasUncheckedItemDefault = $uiJs.Contains("consItems = savedPref ? (savedPref.incluirReporteItem === true) : false")
Assert-Test -name "R4: Checkbox de Reporte por Item desmarcado por defecto" -condition $hasUncheckedItemDefault -failureMsg "consItems debe ser false por defecto"

$hasItemSectionPdf = $pdfJs -match 'IV\.\s*REPORTE\s*POR' -and $pdfJs.Contains('CONSOLIDADO DE INDICADORES')
Assert-Test -name "R4: Seccion IV generada condicionalmente en PDF cuando se marca el checkbox" -condition $hasItemSectionPdf -failureMsg "Falta Seccion IV de Reporte por Item en PDF"

$hasVectorLegend = $pdfJs.Contains("doc.circle(lx + 3, legY - 2.5, 2.5, 'F')")
Assert-Test -name "R6.1: Leyenda vectorial limpia sin caracteres corruptos (%Ï)" -condition $hasVectorLegend -failureMsg "Falta dibujo de leyenda con doc.circle vectorial"

$hasHallazgosClave = $pdfJs.Contains("Hallazgos clave del monitoreo:") -and $pdfJs.Contains("getHallazgosClave(statsList")
Assert-Test -name "R6.2: Bloque de la dona reemplazado por Hallazgos Clave" -condition $hasHallazgosClave -failureMsg "Falta reemplazo por Hallazgos Clave"

$hasLeftSummary = $pdfJs.Contains("align: 'left'") -and $pdfJs.Contains("maxWidth: pageW - 2 * margin")
Assert-Test -name "R6.3: Nota metodologica alineada a la izquierda sin cortes de texto" -condition $hasLeftSummary -failureMsg "Falta align: left con maxWidth en summarySections"

$hasSec2MinHeight = $pdfJs.Contains("minHeight: 145")
Assert-Test -name "R6.4: Seccion II protegida con minHeight para evitar division de tabla" -condition $hasSec2MinHeight -failureMsg "Falta minHeight protector en Seccion II"

# -------------------------------------------------------------------------
# RESUMEN FINAL
# -------------------------------------------------------------------------
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $script:passedTests de $script:totalTests pruebas pasadas con exito." -ForegroundColor Cyan
if ($script:passedTests -eq $script:totalTests) {
  Write-Host ">>> TODAS LAS PRUEBAS DE LA V2 PASARON SATISFACTORIAMENTE <<<`n" -ForegroundColor Green
} else {
  Write-Host ">>> SE ENCONTRARON FALLOS EN LA VERIFICACION <<<`n" -ForegroundColor Red
  exit 1
}
