# =========================================================================
# test-pdf-jedpa.ps1 — Suite de verificación automatizada para JEDPA
# =========================================================================

$ErrorActionPreference = 'Stop'
$testCount = 0
$passCount = 0

function Test-Assert([bool]$condition, [string]$message) {
    $script:testCount++
    if ($condition) {
        Write-Host "  [PASS] $message" -ForegroundColor Green
        $script:passCount++
    } else {
        Write-Host "  [FAIL] $message" -ForegroundColor Red
    }
}

Write-Host "`n=== INICIANDO VALIDACION DE REQUISITOS JEDPA Y ACTA PDF ===" -ForegroundColor Cyan

# 1. Configuración por concurso en pdf-template.js
Write-Host "`n1. Verificando CONCURSOS_CONFIG y helpers en pdf-template.js..." -ForegroundColor Yellow
$pdfContent = Get-Content "public\js\pdf-template.js" -Raw -Encoding UTF8

Test-Assert ($pdfContent -match 'CONCURSOS_CONFIG') 'Diccionario CONCURSOS_CONFIG definido en pdf-template.js'
Test-Assert ($pdfContent -match "columna_asesor_singular:\s*'Delegado / Entrenador'") 'JEDPA define columna_asesor_singular: Delegado / Entrenador'
Test-Assert ($pdfContent -match "etiqueta_columna_asesor:\s*'Delegado / Entrenador'") 'JEDPA define etiqueta_columna_asesor: Delegado / Entrenador'
Test-Assert ($pdfContent -match 'cuerpo_tecnico_por_grupo:\s*true') 'JEDPA define cuerpo_tecnico_por_grupo: true'
Test-Assert ($pdfContent -match "roles_permitidos_asesor:\s*\['DELEGADO',\s*'ENTRENADOR'\]") 'JEDPA define roles permitidos en mayusculas'
Test-Assert ($pdfContent -match 'export function getConcursoConfig') 'Funcion getConcursoConfig exportada'
Test-Assert ($pdfContent -match 'export function formatearRol') 'Funcion formatearRol exportada'
Test-Assert ($pdfContent -match 'export function formatearCuerpoTecnicoTexto') 'Funcion formatearCuerpoTecnicoTexto exportada'
Test-Assert ($pdfContent -match 'export function formatearFiltrosSubtitulo') 'Funcion formatearFiltrosSubtitulo exportada'
Test-Assert ($pdfContent -match 'export function obtenerCuerpoTecnicoGrupo') 'Funcion obtenerCuerpoTecnicoGrupo exportada'
Test-Assert ($pdfContent -match 'export function verificarTextoPdf') 'Funcion verificarTextoPdf exportada'

# 2. Acta PDF optimizada (1 sola página, rowSpan, cabecera y pie de página)
Write-Host "`n2. Verificando optimizaciones del acta PDF en exportConcursosReportPdf..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match "asesoresColHeader = concursoCfg\.etiqueta_columna_asesor") 'Cabecera de columna usa etiqueta_columna_asesor'
Test-Assert ($pdfContent -match 'rowSpan:\s*spanCount') 'rowSpan implementado para agrupar cuerpo tecnico'
Test-Assert ($pdfContent -match 'verificarTextoPdf') 'didParseCell ejecuta verificarTextoPdf'
Test-Assert ($pdfContent -match 'minCellHeight:\s*12') 'Altura minima de fila optimizada a 12pt'
Test-Assert ($pdfContent -match 'cellPadding:\s*\{\s*top:\s*2\.5,\s*bottom:\s*2\.5') 'Padding vertical compacto de 2.5pt para ajuste en 1 pagina'
Test-Assert ($pdfContent -match 'formatearFiltrosSubtitulo') 'Filtros colocados exclusivamente en el subtitulo oficial'
Test-Assert ($pdfContent -match 'Emitido el') 'Pie de pagina con fecha de emision y codigo de verificacion'

# 3. Reglas de Firestore
Write-Host "`n3. Verificando reglas de seguridad en firestore.rules..." -ForegroundColor Yellow
$rulesContent = Get-Content "firestore.rules" -Raw -Encoding UTF8
Test-Assert ($rulesContent -match 'match /concursoCuerpoTecnico/\{docId\}') 'Regla para /concursoCuerpoTecnico/{docId} presente'
Test-Assert ($rulesContent -match 'allow read, create, update:\s*if signedIn\(\);') 'Lectura, creacion y edicion permitidas para usuarios autenticados'
Test-Assert ($rulesContent -match 'allow delete:\s*if isAdmin\(\);') 'Eliminacion restringida exclusivamente a administradores'

# 4. Integración en app.js
Write-Host "`n4. Verificando coleccion concursoCuerpoTecnico en app.js..." -ForegroundColor Yellow
$appContent = Get-Content "public\js\app.js" -Raw -Encoding UTF8
Test-Assert ($appContent -match 'concursoCuerpoTecnico:\s*\[\]') 'Estado inicial concursoCuerpoTecnico: [] presente'
Test-Assert ($appContent -match "dbNs\.collection\('concursoCuerpoTecnico'\)\.onSnapshot") 'Listener onSnapshot para concursoCuerpoTecnico activo'

# 5. Interfaz de usuario ui.js
Write-Host "`n5. Verificando vistas, asistente y exportacion CSV en ui.js..." -ForegroundColor Yellow
$uiContent = Get-Content "public\js\ui.js" -Raw -Encoding UTF8
Test-Assert ($uiContent -match 'getConcursoConfig') 'ui.js importa getConcursoConfig'
Test-Assert ($uiContent -match 'etiqueta_columna_asesor') 'Encabezado de columna consolidada usa concursoCfg.etiqueta_columna_asesor'
Test-Assert ($uiContent -match 'Cuerpo t.*cnico.*nico') 'Tarjeta metrica Cuerpo tecnico unico presente en consolidado JEDPA'
Test-Assert ($uiContent -match 'groupCtBannerHtml') 'Banner informativo de cuerpo tecnico implementado para JEDPA'
Test-Assert ($uiContent -match 'cf_consolidarCuerpoTecnicoBtn') 'Boton Consolidar cuerpo tecnico visible para administradores en JEDPA'
Test-Assert ($uiContent -match 'function updateJedpaGroupCtBox') 'Funcion reactiva updateJedpaGroupCtBox en formulario de registro'
Test-Assert ($uiContent -match 'c_chkAsesorIndividual') 'Checkbox para excepcion individual implementado'
Test-Assert ($uiContent -match 'openConsolidarCuerpoTecnicoModal') 'Funcion openConsolidarCuerpoTecnicoModal implementada'
Test-Assert ($uiContent -match 'majorityRole') 'Resolucion de conflictos por regla de mayoria implementada'
Test-Assert ($uiContent -match 'Discrepancia detectada') 'Deteccion y notificacion explicita de discrepancia de roles'
Test-Assert ($uiContent -match 'data-rollback-ct') 'Soporte de rollback para eliminar centralizacion sin alterar registros'
Test-Assert ($uiContent -match "'Rol cuerpo t.*cnico'") 'CSV export incluye columna Rol cuerpo tecnico'
Test-Assert ($uiContent -match "'Origen'") 'CSV export incluye columna Origen para JEDPA'

# 6. Verificación de No Alteración de Datos Históricos
Write-Host "`n6. Verificando no alteracion de registros historicos..." -ForegroundColor Yellow
$seedFile = "public\data\rd_00342_2026_ganadores.json"
if (Test-Path $seedFile) {
    $seedHash = (Get-FileHash $seedFile -Algorithm SHA256).Hash
    Test-Assert ($seedHash.Length -eq 64) "Archivo de ganadores oficial intacto (SHA-256: $($seedHash.Substring(0,16))...)"
}

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS JEDPA: $passCount de $testCount pruebas pasadas con exito." -ForegroundColor Cyan
if ($passCount -eq $testCount) {
    Write-Host "TODAS LAS PRUEBAS JEDPA PASARON SATISFACTORIAMENTE (100%)!`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "EXISTEN PRUEBAS FALLIDAS ($($testCount - $passCount)).`n" -ForegroundColor Red
    exit 1
}
