# scripts/test-pdf-flujo-continuo.ps1
# Valida los requerimientos de Flujo Continuo sin espacios en blanco y Titulo/Nombre Universal

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

function Test-Assert {
    param([bool]$condition, [string]$message)
    if ($condition) {
        Write-Host "  [PASS] $message" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $message" -ForegroundColor Red
        $script:hasFailed = $true
    }
}

$script:hasFailed = $false
$pdfTemplatePath = Join-Path $PSScriptRoot "..\public\js\pdf-template.js"
$uiPath = Join-Path $PSScriptRoot "..\public\js\ui.js"

$pdfContent = Get-Content $pdfTemplatePath -Raw -Encoding UTF8
$uiContent = Get-Content $uiPath -Raw -Encoding UTF8

Write-Host "`n=== VALIDACION: FLUJO CONTINUO Y TITULO/NOMBRE UNIVERSAL DE CONSOLIDADOS ===" -ForegroundColor Cyan

# 1. Funcion getTituloConsolidadoConcurso
Write-Host "`n1. Verificando getTituloConsolidadoConcurso..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export function getTituloConsolidadoConcurso') 'Funcion getTituloConsolidadoConcurso definida y exportada'
Test-Assert ($pdfContent -match 'CONSOLIDADO OFICIAL DE LOS RESULTADOS - ') 'getTituloConsolidadoConcurso formatea con prefijo oficial CONSOLIDADO OFICIAL DE LOS RESULTADOS - '

# 2. Titulo universal en todos los generadores
Write-Host "`n2. Verificando titulo universal en generadores de PDF..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export async function exportJedpaFichasPdf[\s\S]*?docMainTitle\s*=\s*getTituloConsolidadoConcurso') 'exportJedpaFichasPdf usa getTituloConsolidadoConcurso'
Test-Assert ($pdfContent -match 'export async function exportJfenFichasPdf[\s\S]*?docMainTitle\s*=\s*getTituloConsolidadoConcurso') 'exportJfenFichasPdf usa getTituloConsolidadoConcurso'
Test-Assert ($pdfContent -match 'export async function exportConcursosReportPdf[\s\S]*?title\s*=\s*getTituloConsolidadoConcurso') 'exportConcursosReportPdf usa getTituloConsolidadoConcurso'
Test-Assert ($pdfContent -match 'export async function exportActaOrdenMeritoPdf[\s\S]*?title\s*=\s*getTituloConsolidadoConcurso') 'exportActaOrdenMeritoPdf usa getTituloConsolidadoConcurso'

# 3. Metadatos de PDF (Title)
Write-Host "`n3. Verificando metadatos PDF (doc.setProperties)..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export async function exportJedpaFichasPdf[\s\S]*?doc\.setProperties\(\{\s*title:\s*docMainTitle') 'exportJedpaFichasPdf asigna docMainTitle a Title en doc.setProperties'
Test-Assert ($pdfContent -match 'export async function exportJfenFichasPdf[\s\S]*?doc\.setProperties\(\{\s*title:\s*docMainTitle') 'exportJfenFichasPdf asigna docMainTitle a Title en doc.setProperties'

# 4. Nombre de archivo descargado (Consolidado_Actas_...)
Write-Host "`n4. Verificando prefijo de nombre de archivo (Consolidado_Actas_...)..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export async function exportJedpaFichasPdf[\s\S]*?Consolidado_Actas_\$\{contestPrefix\}') 'exportJedpaFichasPdf genera nombre con Consolidado_Actas_'
Test-Assert ($pdfContent -match 'export async function exportJfenFichasPdf[\s\S]*?Consolidado_Actas_\$\{cleanConcursoPrefix\}') 'exportJfenFichasPdf genera nombre con Consolidado_Actas_'
Test-Assert ($pdfContent -match 'export async function exportConcursosReportPdf[\s\S]*?Consolidado_Actas_JEDPA') 'exportConcursosReportPdf genera nombre JEDPA con Consolidado_Actas_'
Test-Assert ($pdfContent -match 'export async function exportConcursosReportPdf[\s\S]*?Consolidado_Actas_\$\{sanitizeFilename\(concursoNombre\)\}') 'exportConcursosReportPdf genera nombre general con Consolidado_Actas_'
Test-Assert ($pdfContent -match 'export async function exportActaOrdenMeritoPdf[\s\S]*?Consolidado_Actas_Orden_Merito_') 'exportActaOrdenMeritoPdf genera nombre con Consolidado_Actas_Orden_Merito_'

# 5. Flujo continuo sin espacios en blanco en fichas grupales (JEDPA y JFEN)
Write-Host "`n5. Verificando reglas de flujo continuo y particion limpia..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'minNeededToStart\s*=\s*isFirstOfGroup\s*\?\s*\(bandH\s*\+\s*8\s*\+\s*estimatedFichaH\)\s*:\s*estimatedFichaH') 'Regla anti-huerfano en JEDPA colectivo (evalua cabecera + KV + 3 filas de participantes)'
Test-Assert ($pdfContent -match 'minFichaRowsH\s*=\s*barH\s*\+\s*kvH\s*\+\s*partHeadH\s*\+\s*\(minStudentRows\s*\*\s*13\.5\)') 'Regla anti-huerfano en JFEN (evalua cabecera + KV + 3 filas de participantes)'
Test-Assert ($pdfContent -match '\(continuaci.*n\)') 'Barra de continuacion implementada en saltos de pagina'
Test-Assert ($pdfContent -match 'remainingRows\s*-\s*rowsInChunk\)\s*===\s*1\s*&&\s*rowsInChunk\s*>\s*2') 'Regla anti-viuda implementada (evita dejar exactamente 1 fila en pagina siguiente)'
Test-Assert ($pdfContent -match 'startIdx\s*<\s*itemsToRender\.length') 'Bucle de particion por tramos de itemsToRender activo'
Test-Assert ($pdfContent -match "curY\s*\+=\s*12;\s*//\s*Separaci.*n fija entre fichas") 'Separacion fija de 12 pt entre fichas consecutivas sin saltos innecesarios'

# 6. Actualizaciones en interfaz (ui.js)
Write-Host "`n6. Verificando integracion en interfaz (ui.js)..." -ForegroundColor Yellow
Test-Assert ($uiContent -match 'getTituloConsolidadoConcurso') 'ui.js importa getTituloConsolidadoConcurso de pdf-template.js'
Test-Assert ($uiContent -match 'documentTitle:\s*getTituloConsolidadoConcurso\(tipo\)') 'ui.js usa getTituloConsolidadoConcurso para documentTitle'
Test-Assert ($uiContent -match "concursos:\s*'Consolidado Oficial de Resultados de Concursos'") 'ui.js usa Consolidado Oficial de Resultados de Concursos en REPORT_NAMES'

Write-Host "`n=======================================================" -ForegroundColor Cyan
if ($script:hasFailed) {
    Write-Host "EXISTEN PRUEBAS FALLIDAS." -ForegroundColor Red
    exit 1
} else {
    Write-Host "TODAS LAS PRUEBAS DE FLUJO CONTINUO Y TITULO UNIVERSAL PASARON CON EXITO!" -ForegroundColor Green
    exit 0
}
