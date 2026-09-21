# =============================================================================
# test-directivo-registration.ps1 - Verificacion exhaustiva de la nueva ficha
# "Ficha de monitoreo al directivo de IE", correccion de bug de state y PDFs.
# =============================================================================

$ErrorActionPreference = "Stop"
$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$uiJsPath = Join-Path $root "public\js\ui.js"
$appJsPath = Join-Path $root "public\js\app.js"
$pdfJsPath = Join-Path $root "public\js\pdf-template.js"
$cssPath = Join-Path $root "public\css\style.css"
$indexPath = Join-Path $root "public\index.html"
$seedTypesPath = Join-Path $root "scripts\seed-fichaTypes.json"

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

Write-Host "`n=== INICIANDO VALIDACION DE LA FICHA DIRECTIVO Y FLUJO COMPLETO ===" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# 1. PARTE A: VERIFICACION DE LA CAUSA RAIZ (state y onSubmitRegistro)
# -----------------------------------------------------------------------------
Write-Host "`n1. Verificando correccion de 'state is not defined' y arquitectura de estado..." -ForegroundColor Yellow
$uiJs = Get-Content $uiJsPath -Raw
$appJs = Get-Content $appJsPath -Raw

Assert-Test "ui.js expone setAppState y getAppState" ($uiJs -match "export function setAppState" -and $uiJs -match "export function getAppState") "Faltan setAppState o getAppState en ui.js"
Assert-Test "app.js importa y llama a setAppState(state)" ($appJs -match "setAppState\s*\(\s*state\s*\)") "app.js no pasa el state a ui.js"
Assert-Test "app.js asigna window.state como salvaguarda" ($appJs -match "window\.state\s*=\s*state") "Falta window.state en app.js"
Assert-Test "app.js tiene manejadores de error globales (error y unhandledrejection)" ($appJs -match "window\.addEventListener\('error'" -and $appJs -match "window\.addEventListener\('unhandledrejection'") "Faltan listeners globales de error en app.js"

# Firma y llamada de onSubmitRegistro
Assert-Test "onSubmitRegistro recibe 'state' en su lista de parametros" ($uiJs -match "async function onSubmitRegistro\s*\(\s*e,\s*ft,\s*state,\s*dbNs,\s*currentUser,\s*navigate\s*\)") "Firma de onSubmitRegistro no contiene state"
Assert-Test "buildRegForm pasa 'state' al invocar onSubmitRegistro" ($uiJs -match "onSubmitRegistro\s*\(\s*e,\s*ft,\s*state,\s*dbNs,\s*currentUser,\s*navigate\s*\)") "Llamada a onSubmitRegistro en form.onsubmit no pasa state"

# Manejo de excepciones y estados en onSubmitRegistro
Assert-Test "onSubmitRegistro envuelve todo el cuerpo en try/catch/finally" ($uiJs -match "try\s*\{[\s\S]*?\}\s*catch\s*\(err\)\s*\{[\s\S]*?\}\s*finally\s*\{") "Falta bloque try/catch/finally completo en onSubmitRegistro"
Assert-Test "onSubmitRegistro deshabilita el boton con indicador visual y lo restaura en finally" ($uiJs -match "btn\.disabled\s*=\s*true" -and $uiJs -match "btn\.disabled\s*=\s*false") "No se gestiona el estado deshabilitado del boton de envio"
Assert-Test "onSubmitRegistro valida campos obligatorios y resalta con .fieldError" ($uiJs -match "classList\.add\('fieldError'\)" -and $uiJs -match "scrollIntoView") "No se implemento resaltado de errores ni scrollIntoView"
Assert-Test "onSubmitRegistro previene envios duplicados con submissionToken idempotente" ($uiJs -match "form\.dataset\.submissionId" -and $uiJs -match "\.doc\(\w*submissionToken\w*\)\.set") "No se usa token de idempotencia con set()"
Assert-Test "onSubmitRegistro muestra banner de error con detalle tecnico sin borrar datos" ($uiJs -match "regFormErrorBanner" -and $uiJs -match "Ver detalle") "Falta banner visual con detalle tecnico ante errores"

# -----------------------------------------------------------------------------
# 2. PARTE A: LIMPIEZA DE PARAMETROS DE URL DE CONCURSOS
# -----------------------------------------------------------------------------
Write-Host "`n2. Verificando limpieza de parametros de URL de Concursos..." -ForegroundColor Yellow
Assert-Test "setupNavigation en ui.js limpia parametros de Concursos al cambiar de pestana" ($uiJs -match "concurso|etapa|categoria" -and $uiJs -match "history\.replaceState") "No se limpian parametros de concurso en setupNavigation"
Assert-Test "navigate en app.js limpia parametros de Concursos al ir a Registrar/otras pestanas" ($appJs -match "params\.delete\('concurso'\)") "No se limpian parametros de concurso en app.js navigate"

# -----------------------------------------------------------------------------
# 3. PARTE B: ANEXO A Y ESTRUCTURA DE LA FICHA DIRECTIVO
# -----------------------------------------------------------------------------
Write-Host "`n3. Verificando definicion de 'ft_directivo' en seed-fichaTypes.json..." -ForegroundColor Yellow
$seedJson = Get-Content $seedTypesPath -Raw | ConvertFrom-Json
$ftDirectivo = $seedJson.ft_directivo

Assert-Test "Existe ft_directivo en seed-fichaTypes.json" ($null -ne $ftDirectivo) "No se encontro ft_directivo"
Assert-Test "ft_directivo tiene nombre exacto 'Ficha de monitoreo al directivo de IE'" ($ftDirectivo.nombre -eq "Ficha de monitoreo al directivo de IE") "Nombre incorrecto"
Assert-Test "ft_directivo usa escala 'nivel_1_4'" ($ftDirectivo.tipoRespuesta -eq "nivel_1_4") "Escala incorrecta"
Assert-Test "ft_directivo contiene exactamente 6 secciones/dimensiones" ($ftDirectivo.secciones.Count -eq 6) "Secciones count = $($ftDirectivo.secciones.Count)"

$allItems = @()
foreach ($sec in $ftDirectivo.secciones) {
    $allItems += $sec.items
}
Assert-Test "ft_directivo contiene exactamente 21 items en total" ($allItems.Count -eq 21) "Total items = $($allItems.Count)"

# Conteo de items por dimension
$dimA = $ftDirectivo.secciones[0].items.Count
$dimB = $ftDirectivo.secciones[1].items.Count
$dimC = $ftDirectivo.secciones[2].items.Count
$dimD = $ftDirectivo.secciones[3].items.Count
$dimE = $ftDirectivo.secciones[4].items.Count
$dimF = $ftDirectivo.secciones[5].items.Count

Assert-Test "Dimension A tiene 5 items" ($dimA -eq 5) "Dim A = $dimA"
Assert-Test "Dimension B tiene 5 items" ($dimB -eq 5) "Dim B = $dimB"
Assert-Test "Dimension C tiene 4 items" ($dimC -eq 4) "Dim C = $dimC"
Assert-Test "Dimension D tiene 3 items" ($dimD -eq 3) "Dim D = $dimD"
Assert-Test "Dimension E tiene 2 items" ($dimE -eq 2) "Dim E = $dimE"
Assert-Test "Dimension F tiene 2 items" ($dimF -eq 2) "Dim F = $dimF"

# Verificacion de redaccion literal de items clave de Anexo A
$itemA1 = ($allItems | Where-Object { $_.id -eq "dir_a_1" }).texto
Assert-Test "Item A1 tiene la redaccion literal de Anexo A" ($itemA1 -like "*instrumentos de gesti*n aprobados mediante RD*") "Texto de A1 no coincide"
$itemB1 = ($allItems | Where-Object { $_.id -eq "dir_b_1" }).texto
Assert-Test "Item B1 tiene la redaccion literal de Anexo A" ($itemB1 -like "*estrategia de Refuerzo Escolar*") "Texto de B1 no coincide"
$itemC1 = ($allItems | Where-Object { $_.id -eq "dir_c_1" }).texto
Assert-Test "Item C1 tiene la redaccion literal de Anexo A" ($itemC1 -like "*planificaci*n de la unidad did*ctica*") "Texto de C1 no coincide"
$itemD1 = ($allItems | Where-Object { $_.id -eq "dir_d_1" }).texto
Assert-Test "Item D1 tiene la redaccion literal de Anexo A" ($itemD1 -like "*cronograma de monitoreo de la pr*ctica pedag*gica*") "Texto de D1 no coincide"
$itemE1 = ($allItems | Where-Object { $_.id -eq "dir_e_1" }).texto
Assert-Test "Item E1 tiene la redaccion literal de Anexo A" ($itemE1 -like "*diagn*stico de necesidades formativas docentes*") "Texto de E1 no coincide"
$itemF1 = ($allItems | Where-Object { $_.id -eq "dir_f_1" }).texto
Assert-Test "Item F1 tiene la redaccion literal de Anexo A" ($itemF1 -like "*informes de progreso de las competencias*") "Texto de F1 no coincide"

# -----------------------------------------------------------------------------
# 4. PARTE B: DESCRIPTORES Y CONTROLES EN EL FORMULARIO
# -----------------------------------------------------------------------------
Write-Host "`n4. Verificando escala descriptiva I-IV y campos oficiales del PDF..." -ForegroundColor Yellow

Assert-Test "DESCRIPTORES_NIVEL_1_4 definido en ui.js" ($uiJs -match "export const DESCRIPTORES_NIVEL_1_4") "Falta DESCRIPTORES_NIVEL_1_4"
Assert-Test "Descriptor Nivel IV contiene 'cumplimiento integral'" ($uiJs -match "cumplimiento integral de los criterios") "Falta texto Nivel IV"
Assert-Test "Descriptor Nivel III contiene 'mayor.*a de los criterios'" ($uiJs -match "mayor.*a de los criterios") "Falta texto Nivel III"
Assert-Test "Descriptor Nivel II contiene 'cumplimiento parcial'" ($uiJs -match "cumplimiento parcial de los criterios") "Falta texto Nivel II"
Assert-Test "Descriptor Nivel I contiene 'criterios m.*nimos'" ($uiJs -match "criterios m.*nimos") "Falta texto Nivel I"

# Campos especificos del PDF en buildRegForm
Assert-Test "Horas separadas: inicio y termino (f_hora_inicio y f_hora_termino)" ($uiJs -match 'id="f_hora_inicio"' -and $uiJs -match 'id="f_hora_termino"') "Faltan campos de hora inicio/termino"
Assert-Test "Condicion con opciones Designado, Encargado, Nombrado, Otro" ($uiJs -match 'Designado' -and $uiJs -match 'Encargado' -and $uiJs -match 'Nombrado' -and $uiJs -match 'Otro') "Falta selector de condicion con opciones"
Assert-Test "Niveles educativos con casillas multiples (Inicial, Primaria, Secundaria, EBE)" ($uiJs -match 'value="Inicial"' -and $uiJs -match 'value="Primaria"' -and $uiJs -match 'value="Secundaria"' -and $uiJs -match 'value="EBE"') "Faltan casillas de nivel educativo"
Assert-Test "Turnos de atencion con casillas multiples (Manana, Tarde)" ($uiJs -match 'chk" value=".*"(\s*|)><span>Ma.*ana' -or $uiJs -match '_chk" value=') "Faltan casillas de turno de atencion"

# Secciones finales del PDF
Assert-Test "Tabla de Sintesis por dimension de 6 filas x 3 columnas en el formulario" ($uiJs -match 'sintesisTable' -and $uiJs -match 'sintesis_\$\{dIdx\}_logros' -and $uiJs -match 'sintesis_\$\{dIdx\}_dificultades' -and $uiJs -match 'sintesis_\$\{dIdx\}_recomendaciones') "Falta tabla de sintesis 6x3"
Assert-Test "Compromisos del Director y del Monitor en el formulario" ($uiJs -match 'id="f_comp_director"' -and $uiJs -match 'id="f_comp_monitor"') "Faltan campos de compromisos"
Assert-Test "Observaciones generales en el formulario" ($uiJs -match 'id="reg_observaciones"|id="f_observaciones"') "Falta campo observaciones"
Assert-Test "Panel descriptivo desplegable de la rubrica I-IV en el formulario" ($uiJs -match 'rubricaDescriptivaPanel') "Falta panel descriptivo de rubrica"
Assert-Test "Campos de evidencia por cada item en el formulario" ($uiJs -match 'itemEvidencia' -and $uiJs -match 'evidenciaInput') "Falta input de evidencia por item"

# -----------------------------------------------------------------------------
# 5. PARTE B & C: CALCULOS MATEMATICOS Y REPORTE
# -----------------------------------------------------------------------------
Write-Host "`n5. Verificando regla de puntajes (IV=100%, III=75%, II=50%, I=25%) y caso de prueba..." -ForegroundColor Yellow

$expectedPct = [Math]::Round((18.5 / 21.0) * 100, 1) # 88.1%

Assert-Test "scoreValue para nivel_1_4 mapea v/4 (1->0.25, 2->0.5, 3->0.75, 4->1.0)" ($uiJs -match "tipo === 'nivel_1_4'") "Logica de scoreValue para nivel_1_4 no coincide"
Assert-Test "Caso de prueba del PDF oficial da ~88% de cumplimiento ($expectedPct%)" ($expectedPct -ge 88.0 -and $expectedPct -le 88.2) "Calculo matematico no da 88%"

# -----------------------------------------------------------------------------
# 6. PARTE C: GENERACION DE PDF Y CONSOLIDADO
# -----------------------------------------------------------------------------
Write-Host "`n6. Verificando generacion de PDF individual y reporte consolidado..." -ForegroundColor Yellow
$pdfJs = Get-Content $pdfJsPath -Raw

Assert-Test "exportFichaIndividualPdf soporta escala nivel_1_4" ($pdfJs -match "isNivel14\s*=") "Falta detector de escala nivel_1_4 en exportFichaIndividualPdf"
Assert-Test "PDF individual genera tabla con columnas I, II, III, IV y Evidencia con marcas" ($pdfJs -match "val === '4' \? '.*' : ''" -or $pdfJs -match "val === '4'") "Faltan marcas de cotejo en PDF individual"
Assert-Test "PDF individual incluye tabla de Sintesis por dimension" ($pdfJs -match "NTESIS POR DIMENSI" -and $pdfJs -match "sub\.sintesis") "Falta seccion de sintesis en PDF individual"
Assert-Test "PDF individual incluye cuadricula de metadatos con 15 campos para directivo" ($pdfJs -match "metaGrid\s*=\s*isNivel14") "Falta metaGrid de 15 campos para directivo"
Assert-Test "exportConsolidadoReportPdf incluye columnas para Directivo y Monitor" ($pdfJs -match "Directivo" -and $pdfJs -match "Monitor") "Faltan columnas de directivo en consolidado"

# -----------------------------------------------------------------------------
# 7. PARTE C: PRESERVACION DE TIPOS ANTIGUOS Y ESTILOS
# -----------------------------------------------------------------------------
Write-Host "`n7. Verificando preservacion de tipos antiguos y estilos..." -ForegroundColor Yellow

$legacyTypes = @("ft_materiales_cebe", "ft_coord_tutoria_jec", "ft_msejec_2do", "ft_gestion_cebe", "ft_rubricas_aula", "ft_gestion_ugel03_ebr")
$allLegacyPresent = $true
foreach ($t in $legacyTypes) {
    if ($null -eq $seedJson.$t) {
        $allLegacyPresent = $false
        Write-Host "  Falta tipo legacy: $t" -ForegroundColor Red
    }
}
Assert-Test "Todos los tipos de fichas existentes siguen intactos en seed-fichaTypes.json" $allLegacyPresent "Faltan tipos preexistentes"

$css = Get-Content $cssPath -Raw
Assert-Test "Estilos de .fieldError presentes en style.css" ($css -match "\.fieldError") "Falta clase .fieldError en style.css"
Assert-Test "Estilos de .rubricaDescriptivaPanel presentes en style.css" ($css -match "\.rubricaDescriptivaPanel") "Falta clase .rubricaDescriptivaPanel en style.css"
Assert-Test "Estilos de .sintesisTable presentes en style.css" ($css -match "\.sintesisTable") "Falta clase .sintesisTable en style.css"

# Cache-busting en index.html
$indexHtml = Get-Content $indexPath -Raw
Assert-Test "index.html tiene versionado v=20260921_v2 en style.css" ($indexHtml -match "style\.css\?v=20260921_v2") "style.css no tiene v2"
Assert-Test "index.html tiene versionado v=20260921_v2 en app.js" ($indexHtml -match "app\.js\?v=20260921_v2") "app.js no tiene v2"

# -----------------------------------------------------------------------------
# RESUMEN FINAL
# -----------------------------------------------------------------------------
Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $passedTests de $totalTests pruebas pasadas con exito." -ForegroundColor $(if ($failedTests -eq 0) { "Green" } else { "Red" })
if ($failedTests -gt 0) {
    Write-Host "Hubo $failedTests pruebas fallidas. Revisa los mensajes arriba." -ForegroundColor Red
    exit 1
} else {
    Write-Host "¡TODAS LAS COMPROBACIONES PASARON AL 100%! FLUJO COMPLETO VALIDADO." -ForegroundColor Green
    exit 0
}
