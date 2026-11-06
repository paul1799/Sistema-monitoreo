# =============================================================================
# test-monitoreo-docente-template.ps1
# Validación exhaustiva de la plantilla y formulario de Monitoreo a Docentes
# =============================================================================

$root = "$PWD"
$totalTests = 0
$passedTests = 0
$failedTests = 0

function Check([string]$name, [bool]$condition, [string]$msg = "") {
    $global:totalTests++
    if ($condition) {
        $global:passedTests++
        Write-Host "  [PASS] $name" -ForegroundColor Green
    } else {
        $global:failedTests++
        Write-Host "  [FAIL] $name - $msg" -ForegroundColor Red
    }
}

$global:totalTests = 0
$global:passedTests = 0
$global:failedTests = 0

Write-Host "`n=== TEST: PLANTILLA MONITOREO PEDAGÓGICO A DOCENTES (EBR-EBA 2026) ===" -ForegroundColor Cyan

# 1. Verificación en catalogo-base.js
$catPath = Join-Path $root "public/js/domain/fichas/catalogo-base.js"
$catContent = Get-Content -Path $catPath -Raw -Encoding utf8

Check "catalogo-base.js define ft_rubricas_aula" ($catContent -match 'ft_rubricas_aula:\s*\{')
Check "ft_rubricas_aula tiene título oficial de Cuadernillo EBR-EBA 2026" ($catContent -match "CUADERNILLO DEL MONITOREO PEDAG")
Check "ft_rubricas_aula usa escala nivel_1_4" ($catContent -match "tipoRespuesta:\s*'nivel_1_4'")
Check "ft_rubricas_aula contiene Instrumento 1: Rúbricas de observación de aula (MINEDU)" ($catContent -match "INSTRUMENTO 1: R")
Check "ft_rubricas_aula contiene Instrumento 2: Planificación curricular docente (DRELM)" ($catContent -match "INSTRUMENTO 2 - PARTE III: PLANIFICACI")
Check "ft_rubricas_aula contiene los 5 ítems de Rúbricas de Aula (ra_1 a ra_5)" ($catContent -match "ra_1" -and $catContent -match "ra_2" -and $catContent -match "ra_3" -and $catContent -match "ra_4" -and $catContent -match "ra_5")
Check "ft_rubricas_aula contiene los 5 ítems de Planificación Curricular (pc_1 a pc_5)" ($catContent -match "pc_1" -and $catContent -match "pc_2" -and $catContent -match "pc_3" -and $catContent -match "pc_4" -and $catContent -match "pc_5")
Check "ft_rubricas_aula define Cuadro 2.1 Formas organizativas con checkboxes" ($catContent -match "tbl_datos_planif_2_1" -and $catContent -match "c_proyectos" -and $catContent -match "c_unidades")
Check "ft_rubricas_aula define Cuadro 2.2 Ejecución con casillas SI/NO y observaciones" ($catContent -match "tbl_datos_planif_2_2" -and $catContent -match "c_si" -and $catContent -match "c_no" -and $catContent -match "c_observaciones")
Check "ft_rubricas_aula define III. COMPROMISOS DE MEJORA tras Instrumento 1" ($catContent -match "tbl_compromisos_rubricas_aula" -and $catContent -match "c_desempeno" -and $catContent -match "c_compromiso" -and $catContent -match "III\. COMPROMISOS DE MEJORA")
Check "ft_rubricas_aula define IV. OBSERVACIONES" ($catContent -match "tbl_observaciones_docente" -and $catContent -match "IV\. OBSERVACIONES")
Check "ft_rubricas_aula define V. ASPECTOS PARA RETROALIMENTACIÓN AL DOCENTE" ($catContent -match "tbl_retroalimentacion_planificacion" -and $catContent -match "V\. ASPECTOS PARA RETROALIMENTACI")
Check "Tabla V contiene las 3 filas: FORTALEZAS, ASPECTOS DE MEJORA, COMPROMISOS" ($catContent -match "f_fortalezas" -and $catContent -match "FORTALEZAS" -and $catContent -match "f_aspectos_mejora" -and $catContent -match "ASPECTOS DE MEJORA" -and $catContent -match "f_compromisos" -and $catContent -match "COMPROMISOS")
Check "Tabla V tiene 2 columnas (Categoría fija + Detalle de retroalimentación)" ($catContent -match "sinColumnaCategoria:\s*false" -and $catContent -match "c_retroalimentacion")

# 2. Verificación en seed-fichaTypes.json
$seedPath = Join-Path $root "scripts/seeds/seed-fichaTypes.json"
$seedContent = Get-Content -Path $seedPath -Raw -Encoding utf8
Check "seed-fichaTypes.json contiene ft_rubricas_aula con ambas secciones y tablas 2.1, 2.2 y V" ($seedContent -match "tbl_datos_planif_2_1" -and $seedContent -match "tbl_datos_planif_2_2" -and $seedContent -match "tbl_retroalimentacion_planificacion")
Check "seed-fichaTypes.json contiene tbl_compromisos_rubricas_aula" ($seedContent -match "tbl_compromisos_rubricas_aula" -and $seedContent -match "c_desempeno" -and $seedContent -match "c_compromiso")

# 3. Verificación en app.js
$appPath = Join-Path $root "public/js/app.js"
$appContent = Get-Content -Path $appPath -Raw -Encoding utf8
Check "app.js sanitiza y sincroniza ft_rubricas_aula incluyendo tbl_compromisos_rubricas_aula" ($appContent -match "rubricasDoc" -and $appContent -match "tbl_compromisos_rubricas_aula")

# 4. Verificación en form-render.js
$formPath = Join-Path $root "public/js/features/registrar/form-render.js"
$formContent = Get-Content -Path $formPath -Raw -Encoding utf8
Check "form-render.js soporta tipo area para celdas textarea en tablas" ($formContent -match "col\.tipo === 'area'" -and $formContent -match "<textarea name=")
Check "form-render.js incluye campo universal RED en DATOS DE LA VISITA" ($formContent -match 'id="f_red"' -and $formContent -match 'selectColegio')
Check "form-render.js define bloque inst1CompromisosHtml para Instrumento 1" ($formContent -match 'inst1CompromisosHtml' -and $formContent -match 'tbl_compromisos_rubricas_aula')
Check "form-render.js intercala Instrumento 1 Compromisos, Instrumento 2 Parte II y Parte V en ft_rubricas_aula" ($formContent -match 'secCardHtml \+ inst1CompromisosHtml \+ inst2Parte2Html' -and $formContent -match 'secCardHtml \+ inst2Parte4y5Html')
Check "form-render.js incluye toggle mutuamente exclusivo para casillas SI/NO de 2.2" ($formContent -match 'chk-planif-ejecucion')

# 5. Verificación en save.js
$savePath = Join-Path $root "public/js/features/registrar/save.js"
$saveContent = Get-Content -Path $savePath -Raw -Encoding utf8
Check "save.js recolecta campo RED y soporta inputs tipo checkbox en tablas" ($saveContent -match "document\.getElementById\('f_red'\)" -and $saveContent -match "inp\.type === 'checkbox'")

# 6. Verificación en ficha-individual.js
$pdfPath = Join-Path $root "public/js/pdf/ficha-individual.js"
$pdfContent = Get-Content -Path $pdfPath -Raw -Encoding utf8
Check "ficha-individual.js distingue isDirectivoFicha de isNivel14" ($pdfContent -match "isDirectivoFicha" -and $pdfContent -match "isNivel14")
Check "ficha-individual.js renderiza tablas dinámicas especializadas (incluyendo Tabla V)" ($pdfContent -match "Array\.isArray\(fichaType\.tablas\)" -and $pdfContent -match "sub\.tablasRespuestas")

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $global:passedTests de $global:totalTests pruebas pasadas con éxito."
if ($global:failedTests -eq 0) {
    Write-Host "¡TODAS LAS COMPROBACIONES DE LA PLANTILLA DOCENTES PASARON AL 100%!" -ForegroundColor Green
} else {
    Write-Host "HAY $global:failedTests PRUEBAS FALLIDAS." -ForegroundColor Red
}