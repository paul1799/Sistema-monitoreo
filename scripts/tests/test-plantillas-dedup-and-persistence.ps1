# test-plantillas-dedup-and-persistence.ps1
# Verifica la deduplicación de JEC y Directivos, persistencia de ediciones y eliminación permanente de plantillas

Write-Host "=== TEST: VERIFICACION DE DEDUPLICACION Y PERSISTENCIA DE PLANTILLAS ===" -ForegroundColor Cyan

$appJs = Get-Content -Raw "public\js\app.js"
$plantillasJs = Get-Content -Raw "public\js\ui\plantillas.js"
$catalogoJs = Get-Content -Raw "public\js\catalogo-plantillas-base.js"
$uiJs = Get-Content -Raw "public\js\ui.js"

$totalTests = 0
$passedTests = 0

function Assert-Check($title, $condition) {
    $global:totalTests++
    if ($condition) {
        $global:passedTests++
        Write-Host "  [PASS] $title" -ForegroundColor Green
    } else {
        Write-Host "  [FAIL] $title" -ForegroundColor Red
    }
}

Write-Host "`n1. Verificando catalogo-plantillas-base.js..." -ForegroundColor Yellow
Assert-Check "ft_msejec_1er no está en PLANTILLAS_BASE_OFICIALES" (-not ($catalogoJs -match "ft_msejec_1er\s*:\s*\{"))
Assert-Check "ft_jec no está en PLANTILLAS_BASE_OFICIALES" (-not ($catalogoJs -match "ft_jec\s*:\s*\{"))
Assert-Check "ft_msejec_3er no está en PLANTILLAS_BASE_OFICIALES" (-not ($catalogoJs -match "ft_msejec_3er\s*:\s*\{"))
Assert-Check "ft_msejec_2do ES la ficha unificada canónica en PLANTILLAS_BASE_OFICIALES" ($catalogoJs -match "ft_msejec_2do\s*:\s*\{")
Assert-Check "ALIAS_A_PLANTILLA_BASE contiene ft_msejec_1er -> ft_msejec_2do" ($catalogoJs -match "ft_msejec_1er\s*:\s*'ft_msejec_2do'")
Assert-Check "ALIAS_A_PLANTILLA_BASE contiene ft_msejec_3er -> ft_msejec_2do" ($catalogoJs -match "ft_msejec_3er\s*:\s*'ft_msejec_2do'")
Assert-Check "ALIAS_A_PLANTILLA_BASE contiene ft_jec -> ft_msejec_2do" ($catalogoJs -match "ft_jec\s*:\s*'ft_msejec_2do'")

Write-Host "`n2. Verificando ui\plantillas.js y ui.js..." -ForegroundColor Yellow
Assert-Check "plantillas.js exporta getDeletedFichaTypeIds" ($plantillasJs -match "export function getDeletedFichaTypeIds")
Assert-Check "plantillas.js exporta addDeletedFichaTypeId" ($plantillasJs -match "export function addDeletedFichaTypeId")
Assert-Check "ui.js exporta getDeletedFichaTypeIds" ($uiJs -match "getDeletedFichaTypeIds")
Assert-Check "confirmDeleteFichaType llama addDeletedFichaTypeId" ($plantillasJs -match "addDeletedFichaTypeId\(ft\.id\)")
Assert-Check "confirmDeleteFichaType actualiza state.fichaTypes en memoria inmediatamente" ($plantillasJs -match "state\.fichaTypes\.filter\(f => f\.id !== ft\.id\)")
Assert-Check "saveBtn sincroniza state.fichaTypes en memoria inmediatamente" ($plantillasJs -match "state\.fichaTypes\[idx\] = savedItem")
Assert-Check "saveBtn usa doc\(finalDocId\)\.set\(payload\) sin forzar merge destructivo" ($plantillasJs -match "collection\('fichaTypes'\)\.doc\(finalDocId\)\.set\(payload\)")
Assert-Check "draftBtn sincroniza state.fichaTypes en memoria inmediatamente" ($plantillasJs -match "state\.fichaTypes\[idx\] = savedItem")

Write-Host "`n3. Verificando app.js (onSnapshot y getFichaType)..." -ForegroundColor Yellow
Assert-Check "app.js importa getDeletedFichaTypeIds" ($appJs -match "getDeletedFichaTypeIds")
Assert-Check "getFichaType resuelve ft_msejec_1er y ft_msejec_3er" ($appJs -match "ft_msejec_1er.*ft_msejec_3er")
Assert-Check "app.js filtra deletedIds en snapshot" ($appJs -match "deletedIds\.has\(x\.id\)")
Assert-Check "app.js no reinyecta fichas eliminadas ni aliases" ($appJs -match "!deletedIds\.has\(id\)")
Assert-Check "app.js deduplica Modelo JEC unificando a ft_msejec_2do" ($appJs -match "isJecImplementation")
Assert-Check "app.js deduplica Directivo a 1 sola ficha activa" ($appJs -match "isDirectivoDoc")
Assert-Check "app.js no sobreescribe destructivamente PRITE en Firestore" (-not ($appJs -match "doc\('ft_prite_gestion'\)\.set\("))
Assert-Check "app.js no sobreescribe destructivamente CEBE en Firestore" (-not ($appJs -match "doc\('ft_gestion_cebe'\)\.set\("))
Assert-Check "app.js respeta secciones y visitas editadas por el usuario en EBR" ($appJs -match "ebrDoc\.secciones = Array\.isArray\(ebrDoc\.secciones\)")
Assert-Check "app.js respeta secciones y visitas editadas por el usuario en JEC" ($appJs -match "jecDoc\.secciones = Array\.isArray\(jecDoc\.secciones\)")

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $global:passedTests de $global:totalTests pruebas pasadas con éxito." -ForegroundColor Cyan
if ($global:passedTests -eq $global:totalTests) {
    Write-Host "¡TODAS LAS PRUEBAS DE DEDUPLICACION Y PERSISTENCIA PASARON AL 100%!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "AL MENOS UNA PRUEBA FALLO." -ForegroundColor Red
    exit 1
}
