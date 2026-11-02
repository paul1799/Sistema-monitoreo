# scripts/tests/test-registration-save-and-visita2.ps1
# Validación del guardado de fichas, detección de Visita 2 EBR y resolución de dependencias

Write-Host "`n=== TEST: REGISTRO DE FICHAS Y RESOLUCION VISITA 2 / BORRADOR ===" -ForegroundColor Cyan

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

# 1. Verificación de save.js
$savePath = Join-Path $root "public/js/features/registrar/save.js"
$saveContent = Get-Content -Path $savePath -Raw -Encoding utf8

Assert-Check "save.js importa resetRegistrationSessionState desde ./state.js" `
    ($saveContent -match "import\s*\{[^}]*resetRegistrationSessionState[^}]*\}\s*from\s*'\./state\.js'")

Assert-Check "save.js importa setCurrentJecVisita desde ./state.js" `
    ($saveContent -match "import\s*\{[^}]*setCurrentJecVisita[^}]*\}\s*from\s*'\./state\.js'")

Assert-Check "save.js llama a setCurrentJecVisita(1) en vez de asignar a la constante importada" `
    ($saveContent -match "setCurrentJecVisita\(1\);")

Assert-Check "save.js llama a resetRegistrationSessionState() tras guardar EBR" `
    ($saveContent -match "resetEbrFormState\(\);\s*resetRegistrationSessionState\(\);")

Assert-Check "save.js llama a resetRegistrationSessionState() tras guardar CEBE" `
    ($saveContent -match "guardarFormularioCebe\([^)]+\);\s*clearEditMode\(\);\s*resetRegistrationSessionState\(\);")

Assert-Check "save.js llama a resetRegistrationSessionState() tras guardar PRITE" `
    ($saveContent -match "guardarFormularioPrite\([^)]+\);\s*clearEditMode\(\);\s*resetRegistrationSessionState\(\);")

Assert-Check "save.js llama a resetRegistrationSessionState() al final del flujo dinamico" `
    ($saveContent -match "clearEditMode\(\);\s*resetRegistrationSessionState\(\);")

Assert-Check "save.js usa optional chaining seguro para editingSubmissionData?.createdAt" `
    ($saveContent -match "editingSubmissionData\?\.createdAt")

# 2. Verificación de ebr-gestion.js
$ebrPath = Join-Path $root "public/js/ebr-gestion.js"
$ebrContent = Get-Content -Path $ebrPath -Raw -Encoding utf8

Assert-Check "collectEbrGestionFormData detecta visita 2 inspeccionando el DOM (item_ge2_)" `
    ($ebrContent -match "item_ge2_")

Assert-Check "collectEbrGestionFormData detecta visita 3 inspeccionando el DOM (item_ge3_)" `
    ($ebrContent -match "item_ge3_")

Assert-Check "collectEbrGestionFormData busca inputs radio tanto en host como en document.getElementById('regForm')" `
    ($ebrContent -match "document\.getElementById\('regForm'\)")

Assert-Check "collectEbrGestionFormData sincroniza ebrFormState.visita con la visita resuelta" `
    ($ebrContent -match "ebrFormState\.visita\s*=\s*visita")

Assert-Check "syncAllEbrFormDataFromDom sincroniza visita desde #f_visita o .ebrVisitaCard.active" `
    ($ebrContent -match "ebrFormState\.visita\s*=\s*Number\(vEl\.value\)")

Assert-Check "visitaTipo soporta adecuadamente Visita 3 (Tercer momento · Salida)" `
    ($ebrContent -match "Visita 3 · Tercer momento \(Salida\)")

# 3. Verificación de jec-monitoreo.js
$jecPath = Join-Path $root "public/js/jec-monitoreo.js"
$jecContent = Get-Content -Path $jecPath -Raw -Encoding utf8

Assert-Check "jec-monitoreo.js sincroniza radios seleccionados desde el DOM en syncJecStateFromDom" `
    ($jecContent -match "jecFormState\.respuestas\[id\]\s*=\s*r\.value\.toLowerCase\(\)")

# 4. Verificación de eliminación de ?v= en importaciones de puentes
$ebrBridge = Get-Content -Path (Join-Path $root "public/js/features/registrar/fichas/ebr.js") -Raw -Encoding utf8
Assert-Check "fichas/ebr.js importa ebr-gestion.js sin query string ?v=" `
    ($ebrBridge -match "export \* from '\.\./\.\./\.\./ebr-gestion\.js';")

$catBase = Get-Content -Path (Join-Path $root "public/js/domain/fichas/catalogo-base.js") -Raw -Encoding utf8
Assert-Check "catalogo-base.js importa ebr-gestion.js sin query string ?v=" `
    ($catBase -match "from '\.\./\.\./ebr-gestion\.js';")

Assert-Check "catalogo-base.js importa jec-monitoreo.js sin query string ?v=" `
    ($catBase -match "from '\.\./\.\./jec-monitoreo\.js';")

Assert-Check "catalogo-base.js importa cebe-gestion.js sin query string ?v=" `
    ($catBase -match "from '\.\./\.\./cebe-gestion\.js';")

Assert-Check "catalogo-base.js importa prite-gestion.js sin query string ?v=" `
    ($catBase -match "from '\.\./\.\./prite-gestion\.js';")

Write-Host "======================================================="
Write-Host "RESULTADOS: $($ctx.passed) de $($ctx.tests) pruebas pasadas con exito."
if ($ctx.passed -eq $ctx.tests) {
    Write-Host "TODAS LAS VERIFICACIONES DE GUARDADO Y VISITAS PASARON SATISFACTORIAMENTE (100%)." -ForegroundColor Green
} else {
    Write-Host "HAY $($ctx.tests - $ctx.passed) PRUEBAS FALLIDAS." -ForegroundColor Red
    exit 1
}
