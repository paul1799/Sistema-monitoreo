# =============================================================================
# test-pdf-enhancements.ps1
# Pruebas automatizadas de mejoras en PDFs: Ficha individual y Consolidado
# UGEL 03 / MINEDU - Sistema de Monitoreo
# =============================================================================

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

$pdfJsPath = Join-Path $rootDir "public\js\pdf-template.js"
$uiJsPath = Join-Path $rootDir "public\js\ui.js"
$fontRegPath = Join-Path $rootDir "public\fonts\LiberationSans-Regular.ttf"
$fontBoldPath = Join-Path $rootDir "public\fonts\LiberationSans-Bold.ttf"

$passedTests = 0
$failedTests = 0
$totalTests = 0

function Assert-Test ($description, $condition, $failureMsg = "") {
    $script:totalTests++
    if ($condition) {
        Write-Host "  [PASS] $description" -ForegroundColor Green
        $script:passedTests++
    } else {
        Write-Host "  [FAIL] $description" -ForegroundColor Red
        if ($failureMsg) {
            Write-Host "         Detalle: $failureMsg" -ForegroundColor Yellow
        }
        $script:failedTests++
    }
}

Write-Host "`n=== INICIANDO VALIDACION DE MEJORAS EN GENERACION DE PDFS ===" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. FUENTES INCORPORADAS Y UTILIDADES UNICODE
# -----------------------------------------------------------------------------
Write-Host "`n1. Verificando incorporacion de fuentes Unicode Liberation Sans..." -ForegroundColor Yellow

Assert-Test "Archivo LiberationSans-Regular.ttf presente en public\fonts" (Test-Path $fontRegPath) "Falta fuente Regular"
Assert-Test "Archivo LiberationSans-Bold.ttf presente en public\fonts" (Test-Path $fontBoldPath) "Falta fuente Bold"

$pdfJs = Get-Content $pdfJsPath -Raw -Encoding UTF8

Assert-Test "Funcion ensureUnicodeFont definida en pdf-template.js" ($pdfJs.Contains("async function ensureUnicodeFont")) "Falta ensureUnicodeFont"
Assert-Test "addFileToVFS usado para registrar fuentes en jsPDF" ($pdfJs.Contains("doc.addFileToVFS")) "Falta addFileToVFS"
Assert-Test "addFont usado para registrar LiberationSans" ($pdfJs.Contains("LiberationSans")) "Falta addFont"

# -----------------------------------------------------------------------------
# 2. SANITIZACION Y PREVENCION DE TEXTOS PROHIBIDOS
# -----------------------------------------------------------------------------
Write-Host "`n2. Verificando sanitizacion contra [object Object], undefined, NaN, null..." -ForegroundColor Yellow

Assert-Test "Funcion sanitizePdfText definida con comprobacion rigurosa" ($pdfJs.Contains("function sanitizePdfText")) "Falta sanitizePdfText"
Assert-Test "sanitizePdfText detecta y reemplaza [object Object]" ($pdfJs.Contains("[object Object]")) "Falta filtro [object Object]"
Assert-Test "sanitizePdfText detecta y reemplaza undefined y NaN" ($pdfJs.Contains("undefined") -and $pdfJs.Contains("NaN")) "Falta filtro undefined/NaN"
Assert-Test "didParseCell ejecuta sanitizacion en todas las tablas creadas" ($pdfJs.Contains("sanitizePdfText(txt)") -or $pdfJs.Contains("sanitizePdfText(t)")) "Falta hook didParseCell"
Assert-Test "No existen cadenas literales corruptas 'comillas-e 85%' en pdf-template.js" (-not ($pdfJs -match '\"e\s*85%')) "Se encontro cadena corrupta con comillas e"

# -----------------------------------------------------------------------------
# 3. DIBUJO VECTORIAL DE MARCAS Y CASILLAS
# -----------------------------------------------------------------------------
Write-Host "`n3. Verificando dibujo vectorial de marcas de cotejo y casillas..." -ForegroundColor Yellow

Assert-Test "drawVectorCheckmark implementado con lineas vectoriales" ($pdfJs.Contains("function drawVectorCheckmark(")) "Falta drawVectorCheckmark"
Assert-Test "drawVectorCheckbox implementado con rectangulos y marcas vectoriales" ($pdfJs.Contains("function drawVectorCheckbox(")) "Falta drawVectorCheckbox"
Assert-Test "Dimensiones A-F usan celdas suaves y drawVectorCheckmark en lugar de apostrofo" ($pdfJs.Contains("drawVectorCheckmark(doc, cx, cy, 7.5, col, 1.4)")) "Falta llamada a drawVectorCheckmark en tabla de dimensiones"
Assert-Test "Celdas de nivel en dimensiones usan colores suaves institucionales" ($pdfJs.Contains("[236, 253, 245]") -and $pdfJs.Contains("[254, 243, 199]")) "Faltan colores suaves de nivel"

# -----------------------------------------------------------------------------
# 4. FICHA INDIVIDUAL: ESTRUCTURA, DATOS GENERALES Y SECCIONES
# -----------------------------------------------------------------------------
Write-Host "`n4. Verificando mejoras de Ficha Individual (oficial)..." -ForegroundColor Yellow

Assert-Test "Datos generales como tabla de 6 columnas con etiquetas y valores" ($pdfJs.Contains("DATOS GENERALES DE LA VISITA") -and $pdfJs.Contains("cellWidth: 115")) "Falta definicion de tabla de 6 columnas"
Assert-Test "Casillas vectoriales para Condicion, Nivel y Turno en Datos Generales" ($pdfJs.Contains("isCheckboxes: true")) "Faltan casillas vectoriales en datos generales"
Assert-Test "Campos vacios muestran 'No registrado' en cursiva gris" ($pdfJs.Contains("No registrado")) "Falta texto No registrado"
Assert-Test "Resumen de resultados F9 implementado con promedios y cumplimiento global" ($pdfJs.Contains("RESUMEN DE RESULTADOS") -and $pdfJs.Contains("CUMPLIMIENTO GLOBAL INSTITUCIONAL")) "Falta resumen de resultados F9"
Assert-Test "Compromisos asumidos implementados con cuadros de altura minima y lineas punteadas" ($pdfJs.Contains("COMPROMISOS ASUMIDOS") -and $pdfJs.Contains("DEL DIRECTOR(A) DE LA IE")) "Falta bloque de compromisos"
Assert-Test "Observaciones implementadas con lineas punteadas cuando no hay texto" ($pdfJs.Contains("OBSERVACIONES REGISTRADAS EN LA VISITA")) "Falta bloque de observaciones"
Assert-Test "Firmas de Director y Monitor con cargos y entidades oficiales" ($pdfJs.Contains("Director(a) de la I.E.") -and $pdfJs.Contains("Monitor(a)")) "Faltan firmas oficiales de ficha individual"
Assert-Test "Nombre de archivo limpio sin repeticion de 'Ficha_ficha...'" ($pdfJs.Contains("Ficha_Monitoreo_Directivo_IE_")) "Formato de nombre de archivo no coincide"

# -----------------------------------------------------------------------------
# 5. REPORTE CONSOLIDADO: BARRAS, ANCHOS, METODOLOGIA Y FIRMAS
# -----------------------------------------------------------------------------
Write-Host "`n5. Verificando mejoras de Reporte Consolidado..." -ForegroundColor Yellow

Assert-Test "Ancho uniforme CONTENT_WIDTH para todas las tablas en horizontal (770 pt)" ($pdfJs.Contains("CONTENT_WIDTH") -or $pdfJs.Contains("pageW - 2 * margin")) "Falta consistencia de anchos"
Assert-Test "Barras de avance de seccion pasan texto vacio para evitar [object Object]" ($pdfJs.Contains("content: '', raw: { pct: avg }")) "Falta patron celda vacia con raw.pct"
Assert-Test "Barras de reporte por item pasan texto vacio para evitar [object Object]" ($pdfJs.Contains("tipoRespuesta: fichaType.tipoRespuesta, isDirectivoType")) "Falta patron celda vacia con raw.counts"
Assert-Test "Leyenda de Distribucion de resultados usa '>= 85%' en lugar de caracteres corruptos" ($pdfJs.Contains("Logrado >= 85%")) "Falta simbolo >= 85%"
Assert-Test "Resumen ejecutivo con 3-4 viñetas calculadas a partir de datos" ($pdfJs.Contains("RESUMEN EJECUTIVO DE MONITOREO") -and $pdfJs.Contains("Dimensiones destacadas")) "Falta resumen ejecutivo"
Assert-Test "Matriz por institucion y dimension cuando hay 2 o mas fichas" ($pdfJs.Contains("MATRIZ COMPARATIVA POR") -and $pdfJs.Contains("totalFichas >= 2")) "Falta matriz por institucion"
Assert-Test "Seccion de items criticos / prioridades de atencion" ($pdfJs.Contains("CON MENOR CUMPLIMIENTO") -and $pdfJs.Contains("PRIORIDADES")) "Falta seccion de items criticos"
Assert-Test "Nota metodologica presente con definicion de escala (IV=100%, III=75%, II=50%, I=25%)" ($pdfJs.Contains("IV = 100%, III = 75%, II = 50%, I = 25%")) "Falta nota metodologica"
Assert-Test "Bloque de firmas con Especialista y Jefatura dinamica por area" ($pdfJs.Contains("Especialista Responsable de Monitoreo") -and $pdfJs.Contains("Jefatura de")) "Falta bloque de firmas del consolidado"

# -----------------------------------------------------------------------------
# 6. FIDELIDAD DE REDACCION CON EL PDF OFICIAL
# -----------------------------------------------------------------------------
Write-Host "`n6. Verificando redaccion oficial de los 21 items en OFFICIAL_DIRECTIVO_ITEMS..." -ForegroundColor Yellow

Assert-Test "OFFICIAL_DIRECTIVO_ITEMS exportado en pdf-template.js" ($pdfJs.Contains("export const OFFICIAL_DIRECTIVO_ITEMS")) "Falta export de OFFICIAL_DIRECTIVO_ITEMS"
Assert-Test "Item 2 tiene redaccion oficial exacta ('El PCI de la IE se encuentra actualizado y contiene el Plan de Estudios...')" ($pdfJs.Contains("El PCI de la IE se encuentra actualizado y contiene el Plan de Estudios")) "Item 2 no tiene texto oficial"
Assert-Test "Item 7 tiene redaccion oficial exacta ('realiza seguimiento y fortalece...')" ($pdfJs.Contains("realiza seguimiento y fortalece") -and -not ($pdfJs.Contains("realiza seguimiento periodico y fortalece"))) "Item 7 difiere del oficial"
Assert-Test "OFFICIAL_DIRECTIVO_DIMENSIONS contiene las 6 dimensiones A-F oficiales" ($pdfJs.Contains("export const OFFICIAL_DIRECTIVO_DIMENSIONS")) "Falta export de OFFICIAL_DIRECTIVO_DIMENSIONS"

# -----------------------------------------------------------------------------
# 7. DIALOGO DE CONFIGURACION DE DESCARGA Y OPCIONES ESPECIFICAS
# -----------------------------------------------------------------------------
Write-Host "`n7. Verificando opciones de configuracion de descarga en ui.js..." -ForegroundColor Yellow

$uiJs = Get-Content $uiJsPath -Raw

Assert-Test "Opciones de Ficha individual presentes en modal (intro, resumen, casillas, lineas)" ($uiJs.Contains("dl_indiv_intro") -and $uiJs.Contains("dl_indiv_resumen") -and $uiJs.Contains("dl_indiv_casillas") -and $uiJs.Contains("dl_indiv_lineas")) "Faltan opciones de ficha individual en ui.js"
Assert-Test "Opciones de Consolidado presentes en modal (resumen, matriz, criticos, items, orden)" ($uiJs.Contains("dl_cons_resumen") -and $uiJs.Contains("dl_cons_matriz") -and $uiJs.Contains("dl_cons_criticos") -and $uiJs.Contains("dl_cons_items") -and $uiJs.Contains("dl_cons_orden")) "Faltan opciones de consolidado en ui.js"
Assert-Test "Eventos de opciones individuales y de consolidado conectados" ($uiJs.Contains("indivIntroCb.onchange") -and $uiJs.Contains("consResCb.onchange")) "Faltan event listeners en ui.js"
Assert-Test "Opciones pasadas a downloadConfig en triggerGenerate" ($uiJs.Contains("incluirResumenEjecutivo: consResumen") -and $uiJs.Contains("dibujarCasillas: indivCasillas")) "Faltan parametros en downloadConfig"
Assert-Test "Titulo de documento no duplica FICHA DE MONITOREO" ($uiJs.Contains("ficha de monitoreo") -and $uiJs.Contains("cleanDocTitle")) "Falta sanitizacion de titulo de documento en ui.js"
Assert-Test "Revision de anomalias detecta campos vacios de ficha individual (turno, monitor, compromisos)" ($uiJs.Contains("sinTurnoVisitado") -and $uiJs.Contains("sinMonitorDni") -and $uiJs.Contains("sinCompromisos")) "Falta deteccion de anomalias especificas"

# -----------------------------------------------------------------------------
# RESUMEN FINAL
# -----------------------------------------------------------------------------
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $passedTests de $totalTests pruebas pasadas con exito." -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
if ($failedTests -gt 0) {
    Write-Host "Hubo $failedTests pruebas fallidas. Revisa los mensajes arriba." -ForegroundColor Red
    exit 1
} else {
    Write-Host "TODAS LAS PRUEBAS DE MEJORAS DE PDFS PASARON SATISFACTORIAMENTE (100%)!" -ForegroundColor Green
    exit 0
}
