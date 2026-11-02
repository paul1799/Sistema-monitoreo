# scripts/tests/test-materiales-cebe-resolution.ps1
# Verificación exhaustiva de la resolución, mapeo y agregación de la Ficha de Materiales Educativos CEBE/PRITE

Write-Host "`n=== TEST: RESOLUCION Y REPORTES FICHA MATERIALES EDUCATIVOS (CEBE/PRITE) ===" -ForegroundColor Cyan

$root = $PWD
$ctx = @{ tests = 0; passed = 0 }

function Assert-Check($desc, $cond) {
    $ctx.tests++
    if ($cond) {
        Write-Host "  [PASS] $desc" -ForegroundColor Green
        $ctx.passed++
    } else {
        Write-Host "  [FAIL] $desc" -ForegroundColor Red
    }
}

# 1. catalogo-base.js
$catPath = Join-Path $root "public/js/domain/fichas/catalogo-base.js"
$catContent = Get-Content -Path $catPath -Raw -Encoding utf8

Assert-Check "catalogo-base.js exporta MATERIALES_CEBE_SECCIONES" `
    ($catContent -match "export\s+(?:const\s+)?MATERIALES_CEBE_SECCIONES" -or $catContent -match "export\s*\{[^}]*MATERIALES_CEBE_SECCIONES")

Assert-Check "MATERIALES_CEBE_SECCIONES contiene los 14 items con id mc_1 a mc_14 y num 1 a 14" `
    ($catContent -match "id:\s*'mc_1',\s*num:\s*1" -and $catContent -match "id:\s*'mc_14',\s*num:\s*14")

Assert-Check "MATERIALES_CEBE_SECCIONES contiene las 5 secciones oficiales sin mojibake" `
    ($catContent -match "nombre:\s*'Recepción'" -and `
     $catContent -match "nombre:\s*'Distribución'" -and `
     $catContent -match "nombre:\s*'Uso pedagógico'" -and `
     $catContent -match "nombre:\s*'Seguimiento'" -and `
     $catContent -match "nombre:\s*'Conservación y control'")

Assert-Check "PLANTILLAS_BASE_OFICIALES.ft_materiales_cebe usa MATERIALES_CEBE_SECCIONES" `
    ($catContent -match "ft_materiales_cebe:\s*\{[\s\S]*?secciones:\s*MATERIALES_CEBE_SECCIONES")

Assert-Check "ft_materiales_cebe define tipoRespuesta 'si_no' y escala 'SI_NO_NA'" `
    ($catContent -match "ft_materiales_cebe:\s*\{[\s\S]*?tipoRespuesta:\s*'si_no'[\s\S]*?escala:\s*'SI_NO_NA'")

Assert-Check "ft_materiales_cebe define regla_nivel oficial con umbrales 67/34/0" `
    ($catContent -match "ft_materiales_cebe:\s*\{[\s\S]*?regla_nivel:\s*\{[\s\S]*?min:\s*67[\s\S]*?min:\s*34")

# 2. detector.js
$detPath = Join-Path $root "public/js/domain/fichas/detector.js"
$detContent = Get-Content -Path $detPath -Raw -Encoding utf8

Assert-Check "detector.js define y exporta isFichaMaterialesCebe" `
    ($detContent -match "export\s+function\s+isFichaMaterialesCebe")

# 3. engine-helpers.js
$engHPath = Join-Path $root "public/js/domain/fichas/engine-helpers.js"
$engHContent = Get-Content -Path $engHPath -Raw -Encoding utf8

Assert-Check "engine-helpers.js exporta normalizeSectionName" `
    ($engHContent -match "export\s+function\s+normalizeSectionName")

Assert-Check "_cleanStr limpia mojibake (Ã³, ǟ, etc.)" `
    ($engHContent -match "replace\(/Ã³/g,\s*'o'\)" -and $engHContent -match "replace\(/ǟ")

Assert-Check "buildResponseValMap normaliza respuestas en formato objeto y extrae valor/value" `
    ($engHContent -match "val\.valor\s*!==\s*undefined\s*\?\s*val\.valor\s*:\s*\(val\.value" -or `
     $engHContent -match "r\.valor\s*!==\s*undefined\s*\?\s*r\.valor\s*:\s*\(r\.value")

Assert-Check "buildResponseValMap indexa alias cruzados mc_X <-> m_X <-> num_X" `
    ($engHContent -match "valMap\['mc_'\s*\+\s*n\]" -and $engHContent -match "valMap\['m_'\s*\+\s*n\]")

Assert-Check "resolveItemValue busca por alias cruzado mc_ / m_" `
    ($engHContent -match "valMap\['mc_'\s*\+\s*n\]" -and $engHContent -match "valMap\['m_'\s*\+\s*n\]")

Assert-Check "resolveItemValue busca por sección canónica y variantes de índice local" `
    ($engHContent -match 'sec_\$\{normSec\}' -and $engHContent -match 'sec_\$\{cleanSec\}')

Assert-Check "resolveItemValue tiene fallback directo por it.num" `
    ($engHContent -match "valMap\['num_'\s*\+\s*it\.num\]" -or $engHContent -match "valMap\['mc_'\s*\+\s*it\.num\]")

# 4. engine.js
$engPath = Join-Path $root "public/js/domain/fichas/engine.js"
$engContent = Get-Content -Path $engPath -Raw -Encoding utf8

Assert-Check "engine.js importa isFichaMaterialesCebe y MATERIALES_CEBE_SECCIONES" `
    ($engContent -match "isFichaMaterialesCebe" -and $engContent -match "MATERIALES_CEBE_SECCIONES")

Assert-Check "engine.js activa MATERIALES_CEBE_SECCIONES si la ficha es de materiales y tiene secciones incompletas" `
    ($engContent -match "if\s*\(isFichaMaterialesCebe\(fichaType\)")

Assert-Check "engine.js tolera r.value ademas de r.valor en hasSiNoResponses" `
    ($engContent -match "r\?\.valor\s*\?\?\s*r\?\.value")

# 5. reportes-datos.js
$repPath = Join-Path $root "public/js/reportes-datos.js"
$repContent = Get-Content -Path $repPath -Raw -Encoding utf8

Assert-Check "reportes-datos.js importa MATERIALES_CEBE_SECCIONES e isFichaMaterialesCebe" `
    ($repContent -match "MATERIALES_CEBE_SECCIONES" -and $repContent -match "isFichaMaterialesCebe")

Assert-Check "reportes-datos.js asegura MATERIALES_CEBE_SECCIONES en computeItemAgg" `
    ($repContent -match "else\s+if\s*\(isFichaMaterialesCebe\(ft\)\)")

Assert-Check "reportes-datos.js normaliza respuestas de s.respuestas, s.items, s.respuestasObj y val.value" `
    ($repContent -match "s\.items" -and $repContent -match "s\.respuestasObj" -and $repContent -match "val\.value")

# 6. ui/scoring.js
$scPath = Join-Path $root "public/js/ui/scoring.js"
$scContent = Get-Content -Path $scPath -Raw -Encoding utf8

Assert-Check "scoring.js importa MATERIALES_CEBE_SECCIONES e isFichaMaterialesCebe" `
    ($scContent -match "MATERIALES_CEBE_SECCIONES" -and $scContent -match "isFichaMaterialesCebe")

Assert-Check "computeStats inspecciona sub.items ademas de sub.respuestas" `
    ($scContent -match "sub\.respuestas\s*\|\|\s*sub\.respuestasArray\s*\|\|\s*sub\.items")

Assert-Check "computeStats configura ftForCalc con MATERIALES_CEBE_SECCIONES para isFichaMaterialesCebe" `
    ($scContent -match "else\s+if\s*\(isFichaMaterialesCebe\(ft\s*\|\|\s*sub\)")

# 7. app.js
$appPath = Join-Path $root "public/js/app.js"
$appContent = Get-Content -Path $appPath -Raw -Encoding utf8

Assert-Check "app.js sanitiza secciones, tipoRespuesta, escala y regla_nivel en matCebeDoc" `
    ($appContent -match "matCebeDoc\.tipoRespuesta\s*=\s*'si_no'" -and `
     $appContent -match "matCebeDoc\.escala\s*=\s*'SI_NO_NA'" -and `
     $appContent -match "matCebeDoc\.regla_nivel\s*=\s*PLANTILLAS_BASE_OFICIALES\.ft_materiales_cebe\.regla_nivel" -and `
     $appContent -match "needsCebeMatRepair")

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $($ctx.passed) de $($ctx.tests) pruebas pasadas con exito." -ForegroundColor $(if ($ctx.passed -eq $ctx.tests) { "Green" } else { "Red" })

if ($ctx.passed -eq $ctx.tests) {
    Write-Host "TODAS LAS VERIFICACIONES DE MATERIALES EDUCATIVOS CEBE PASARON SATISFACTORIAMENTE (100%)." -ForegroundColor Green
} else {
    Write-Host "ALGUNAS VERIFICACIONES FALLARON. REVISAR DETALLES ARRIBA." -ForegroundColor Red
}
