# =============================================================================
# test-monitoreo-docente-template.ps1
# Validación exhaustiva de la actualización de la plantilla
# "CUADERNILLO DEL MONITOREO PEDAGÓGICO A DOCENTES DE LIMA METROPOLITANA EBR-EBA 2026"
# =============================================================================

$root = "$PWD"
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Assert-Check([string]$name, [bool]$condition, [string]$msg = "") {
    $script:totalTests++
    if ($condition) {
        $script:passedTests++
        Write-Host "  [PASS] $name" -ForegroundColor Green
    } else {
        $script:failedTests++
        Write-Host "  [FAIL] $name - $msg" -ForegroundColor Red
    }
}

Write-Host "`n=== TEST: PLANTILLA MONITOREO PEDAGÓGICO A DOCENTES (EBR-EBA 2026) ===" -ForegroundColor Cyan

# 1. Verificación en catalogo-base.js
$catPath = Join-Path $root "public/js/domain/fichas/catalogo-base.js"
$catContent = Get-Content -Path $catPath -Raw -Encoding utf8

Assert-Check "catalogo-base.js define ft_rubricas_aula" `
    ($catContent -match "ft_rubricas_aula:\s*\{")

Assert-Check "ft_rubricas_aula tiene título oficial de Cuadernillo EBR-EBA 2026" `
    ($catContent -match "CUADERNILLO DEL MONITOREO PEDAGÓGICO A DOCENTES DE LIMA METROPOLITANA EBR-EBA 2026")

Assert-Check "ft_rubricas_aula usa escala nivel_1_4" `
    ($catContent -match "tipoRespuesta:\s*'nivel_1_4'")

Assert-Check "ft_rubricas_aula contiene Instrumento 1: Rúbricas de observación de aula (MINEDU)" `
    ($catContent -match "INSTRUMENTO 1: RÚBRICAS DE OBSERVACIÓN DE AULA \(MINEDU\)")

Assert-Check "ft_rubricas_aula contiene Instrumento 2: Planificación curricular docente (DRELM)" `
    ($catContent -match "INSTRUMENTO 2 - PARTE III: PLANIFICACIÓN CURRICULAR DOCENTE \(DRELM\)")

Assert-Check "ft_rubricas_aula contiene los 5 ítems de Rúbricas de Aula (ra_1 a ra_5)" `
    ($catContent -match "ra_1" -and $catContent -match "ra_2" -and $catContent -match "ra_3" -and $catContent -match "ra_4" -and $catContent -match "ra_5")

Assert-Check "ft_rubricas_aula contiene los 5 ítems de Planificación Curricular (pc_1 a pc_5)" `
    ($catContent -match "pc_1" -and $catContent -match "pc_2" -and $catContent -match "pc_3" -and $catContent -match "pc_4" -and $catContent -match "pc_5")

Assert-Check "ft_rubricas_aula define Tabla de Datos Informativos de Planificación Curricular" `
    ($catContent -match "tbl_datos_planificacion")

Assert-Check "ft_rubricas_aula define IV. OBSERVACIONES" `
    ($catContent -match "tbl_observaciones_docente" -and $catContent -match "IV\. OBSERVACIONES")

Assert-Check "ft_rubricas_aula define V. ASPECTOS PARA RETROALIMENTACIÓN AL DOCENTE" `
    ($catContent -match "tbl_retroalimentacion_planificacion" -and $catContent -match "V\. ASPECTOS PARA RETROALIMENTACIÓN")

Assert-Check "Tabla V contiene las 3 filas: FORTALEZAS, ASPECTOS DE MEJORA, COMPROMISOS" `
    ($catContent -match "f_fortalezas" -and $catContent -match "FORTALEZAS" -and `
     $catContent -match "f_aspectos_mejora" -and $catContent -match "ASPECTOS DE MEJORA" -and `
     $catContent -match "f_compromisos" -and $catContent -match "COMPROMISOS")

Assert-Check "Tabla V tiene 2 columnas (Categoría fija + Detalle de retroalimentación)" `
    ($catContent -match "sinColumnaCategoria:\s*false" -and $catContent -match "c_retroalimentacion")

# 2. Verificación en seed-fichaTypes.json
$seedPath = Join-Path $root "scripts/seeds/seed-fichaTypes.json"
$seedContent = Get-Content -Path $seedPath -Raw -Encoding utf8
Assert-Check "seed-fichaTypes.json contiene ft_rubricas_aula actualizado con ambas secciones y tablas" `
    ($seedContent -match "tbl_retroalimentacion_planificacion" -and $seedContent -match "FORTALEZAS")

# 3. Verificación en app.js
$appPath = Join-Path $root "public/js/app.js"
$appContent = Get-Content -Path $appPath -Raw -Encoding utf8
Assert-Check "app.js sanitiza y sincroniza ft_rubricas_aula" `
    ($appContent -match "rubricasDoc" -and $appContent -match "tbl_retroalimentacion_planificacion")

# 4. Verificación en form-render.js
$formPath = Join-Path $root "public/js/features/registrar/form-render.js"
$formContent = Get-Content -Path $formPath -Raw -Encoding utf8
Assert-Check "form-render.js soporta tipo area para celdas textarea en tablas" `
    ($formContent -match "col\.tipo === 'area'" -and $formContent -match "<textarea name=")

# 5. Verificación en ficha-individual.js
$pdfPath = Join-Path $root "public/js/pdf/ficha-individual.js"
$pdfContent = Get-Content -Path $pdfPath -Raw -Encoding utf8
Assert-Check "ficha-individual.js distingue isDirectivoFicha de isNivel14" `
    ($pdfContent -match "isDirectivoFicha" -and $pdfContent -match "isNivel14")

Assert-Check "ficha-individual.js renderiza tablas dinámicas especializadas (incluyendo Tabla V)" `
    ($pdfContent -match "Array\.isArray\(fichaType\.tablas\)" -and $pdfContent -match "sub\.tablasRespuestas")

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $passedTests de $totalTests pruebas pasadas con éxito."
if ($failedTests -eq 0) {
    Write-Host "¡TODAS LAS COMPROBACIONES DE LA PLANTILLA DOCENTES PASARON AL 100%!" -ForegroundColor Green
} else {
    Write-Host "HAY $failedTests PRUEBAS FALLIDAS." -ForegroundColor Red
}