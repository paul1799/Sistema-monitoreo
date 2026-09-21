# =============================================================================
# smoke-test.ps1 — Prueba de Humo y Verificación de Integridad Front-end
# Valida la sintaxis CSS, estructura HTML del layout aprobado y reglas de scroll.
# =============================================================================

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$htmlPath = Join-Path $root "public\index.html"
$cssPath  = Join-Path $root "public\css\style.css"
$appJsPath = Join-Path $root "public\js\app.js"
$uiJsPath  = Join-Path $root "public\js\ui.js"

$totalTests = 0
$passedTests = 0
$failedTests = 0

function Assert-Test([string]$name, [bool]$condition, [string]$failMessage = "") {
    $script:totalTests++
    if ($condition) {
        $script:passedTests++
        Write-Host "  [PASS] $name" -ForegroundColor Green
    } else {
        $script:failedTests++
        Write-Host "  [FAIL] $name - $failMessage" -ForegroundColor Red
    }
}

Write-Host "`n=== INICIANDO PRUEBA DE HUMO DE INTEGRIDAD FRONT-END ===" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. VERIFICACIÓN DE SINTAXIS Y BALANCE DE CSS
# -----------------------------------------------------------------------------
Write-Host "`n1. Verificando integridad de public\css\style.css..." -ForegroundColor Yellow
$css = Get-Content $cssPath -Raw
$openBraces = 0
$line = 1
$cssSyntaxOk = $true
$syntaxError = ""

for ($i = 0; $i -lt $css.Length; $i++) {
    $c = $css[$i]
    if ($c -eq "`n") { $line++; continue }
    if ($c -eq "/" -and $i + 1 -lt $css.Length -and $css[$i+1] -eq "*") {
        $end = $css.IndexOf("*/", $i + 2)
        if ($end -eq -1) { $cssSyntaxOk = $false; $syntaxError = "Comentario sin cerrar en linea $line"; break }
        $sub = $css.Substring($i, $end - $i + 2)
        $line += ($sub -split "`n").Length - 1
        $i = $end + 1
        continue
    }
    if ($c -eq "{") { $openBraces++ }
    elseif ($c -eq "}") {
        $openBraces--
        if ($openBraces -lt 0) { $cssSyntaxOk = $false; $syntaxError = "Llave de cierre extra en linea $line"; break }
    }
}
if ($openBraces -ne 0) {
    $cssSyntaxOk = $false
    $syntaxError = "Llaves desbalanceadas ($openBraces sin cerrar)"
}

Assert-Test "Balance de llaves y comentarios CSS" $cssSyntaxOk $syntaxError

# -----------------------------------------------------------------------------
# 2. AUDITORÍA DE REGLAS DE SCROLL
# -----------------------------------------------------------------------------
Write-Host "`n2. Auditando reglas de scroll en CSS..." -ForegroundColor Yellow

Assert-Test "html tiene scrollbar-gutter: stable" ($css -match "html\s*\{[^}]*scrollbar-gutter:\s*stable") "Falta scrollbar-gutter: stable en html"
Assert-Test "html tiene scroll-padding-top configurado" ($css -match "scroll-padding-top:") "Falta scroll-padding-top en html para cabecera fija"
Assert-Test "body no tiene overflow-x: hidden que rompa sticky" (-not ($css -match "body\s*\{[^}]*overflow-x:\s*hidden")) "body tiene overflow-x: hidden (rompe sticky, usar clip)"
Assert-Test "#app no tiene height: 100vh con overflow: hidden" (-not ($css -match "#app\s*\{[^}]*height:\s*100vh[^}]*overflow:\s*hidden")) "#app conserva el overflow anidado"
Assert-Test ".appBody no tiene overflow-y: auto anidado" (-not ($css -match "\.appBody\s*\{[^}]*overflow-y:\s*auto")) ".appBody tiene scroll anidado en lugar de usar ventana"
Assert-Test "Cabecera #mainHeader es sticky top 0" ($css -match "#mainHeader\s*\{[^}]*position:\s*sticky[^}]*top:\s*0") "#mainHeader debe tener position: sticky y top: 0"
Assert-Test "body.modal-open existe para bloquear scroll en dialogos" ($css -match "body\.modal-open\s*\{[^}]*overflow:\s*hidden") "Falta regla body.modal-open"

# -----------------------------------------------------------------------------
# 3. VERIFICACIÓN DEL DOM APROBADO EN public\index.html
# -----------------------------------------------------------------------------
Write-Host "`n3. Verificando estructura del DOM en public\index.html..." -ForegroundColor Yellow
$html = Get-Content $htmlPath -Raw

# Elementos obsoletos que no deben existir
Assert-Test "No existe elemento obsoleto <nav id=`"sidebar`">" (-not ($html -match 'id="sidebar"')) "Se encontro nav#sidebar antiguo"
Assert-Test "No existe elemento obsoleto <div id=`"sidebarFoot`">" (-not ($html -match 'id="sidebarFoot"')) "Se encontro #sidebarFoot antiguo"
Assert-Test "Subtitulo tiene texto institucional correcto" ($html -match "UGEL 03 · Sistematización y reportes de avance") "Subtitulo no coincide con version aprobada"

# Elementos requeridos
Assert-Test "Existe cabecera <header id=`"mainHeader`">" ($html -match 'id="mainHeader"') "Falta #mainHeader"
Assert-Test "Existe boton Exportar #topExportBtn" ($html -match 'id="topExportBtn"') "Falta #topExportBtn"
Assert-Test "Existe boton Registrar ficha #topRegistrarBtn" ($html -match 'id="topRegistrarBtn"') "Falta #topRegistrarBtn"
Assert-Test "Existe campana de alertas #topBellBtn" ($html -match 'id="topBellBtn"') "Falta #topBellBtn"
Assert-Test "Existe perfil de usuario #topUserName y avatar" ($html -match 'id="topUserName"' -and $html -match 'id="topUserAvatar"') "Faltan elementos de perfil de usuario"
Assert-Test "Existe pastilla de conexion #connectionStatusPill" ($html -match 'id="connectionStatusPill"') "Falta #connectionStatusPill"
Assert-Test "Existe barra de navegacion horizontal #subNavBar" ($html -match 'id="subNavBar"') "Falta #subNavBar"
Assert-Test "Existe banner de bienvenida #welcomeBanner" ($html -match 'id="welcomeBanner"') "Falta #welcomeBanner"
Assert-Test "Existe contenedor de alerta de reintento #connectionAlert" ($html -match 'id="connectionAlert"') "Falta #connectionAlert"
Assert-Test "Contenedor principal #main y #tabContent presentes" ($html -match 'id="main"' -and $html -match 'id="tabContent"') "Falta #main o #tabContent"

# -----------------------------------------------------------------------------
# 4. VERIFICACIÓN DE CONTROLADORES JS
# -----------------------------------------------------------------------------
Write-Host "`n4. Verificando helpers de scroll y navegacion en JS..." -ForegroundColor Yellow
$uiJs = Get-Content $uiJsPath -Raw
$appJs = Get-Content $appJsPath -Raw

Assert-Test "ui.js exporta lockBodyScroll y unlockBodyScroll" ($uiJs -match "export function lockBodyScroll" -and $uiJs -match "export function unlockBodyScroll") "Faltan helpers de scroll en ui.js"
Assert-Test "ui.js exporta forceResetBodyScroll" ($uiJs -match "export function forceResetBodyScroll") "Falta forceResetBodyScroll en ui.js"
Assert-Test "app.js importa forceResetBodyScroll" ($appJs -match "forceResetBodyScroll") "app.js no importa forceResetBodyScroll"
Assert-Test "app.js gestiona setConnectionState" ($appJs -match "function setConnectionState") "Falta setConnectionState en app.js"

# -----------------------------------------------------------------------------
# RESUMEN FINAL
# -----------------------------------------------------------------------------
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $passedTests de $totalTests pruebas pasadas con exito." -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
if ($failedTests -gt 0) {
    Write-Host "Hubo $failedTests pruebas fallidas. Revisa los mensajes arriba." -ForegroundColor Red
    exit 1
} else {
    Write-Host "Todas las comprobaciones pasaron satisfactoriamente. Interfaz estable." -ForegroundColor Green
    exit 0
}
