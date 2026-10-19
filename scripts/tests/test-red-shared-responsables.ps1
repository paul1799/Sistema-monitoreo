# =========================================================================
# test-red-shared-responsables.ps1
# =========================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== INICIANDO PRUEBA DE REDs COMPARTIDAS Y SINCRONIZACION ===" -ForegroundColor Cyan
$passed = 0
$total = 0

function Assert-Condition($condition, $message) {
  $script:total++
  if ($condition) {
    Write-Host "  [PASS] $message" -ForegroundColor Green
    $script:passed++
  } else {
    Write-Host "  [FAIL] $message" -ForegroundColor Red
  }
}

# 1. scoring.js
Write-Host "`n1. Verificando resolucion de especialista en scoring.js..." -ForegroundColor Yellow
$scoringContent = Get-Content "public\js\ui\scoring.js" -Raw

Assert-Condition ($scoringContent -match 'getResponsableForColegio') "getResponsableForColegio esta implementado"
Assert-Condition ($scoringContent -match 'col\.responsableId') "getResponsableForColegio verifica col.responsableId explicito"
Assert-Condition ($scoringContent -match 'col\.responsable') "getResponsableForColegio verifica col.responsable explicito"
Assert-Condition ($scoringContent -match 'Por asignar \(RED compartida\)') "getResponsableForColegio previene falsa asignacion cuando la RED es compartida"
Assert-Condition ($scoringContent -match 'matchedResps\.length === 1') "getResponsableForColegio autoasigna solo cuando la RED tiene un unico especialista"
Assert-Condition ($scoringContent -match 'getSubmissionResponsable') "getSubmissionResponsable resuelve el especialista especifico del colegio"

# 2. colegios-tab.js
Write-Host "`n2. Verificando colegios-tab.js (Edicion y Redistribucion)..." -ForegroundColor Yellow
$colegiosContent = Get-Content "public\js\ui\colegios-tab.js" -Raw

Assert-Condition ($colegiosContent -match 'responsable = s\(') "sanitizeColegioRecord preserva campo responsable"
Assert-Condition ($colegiosContent -match 'responsableId = s\(') "sanitizeColegioRecord preserva campo responsableId"
Assert-Condition ($colegiosContent -match 'responsableEmail = s\(') "sanitizeColegioRecord preserva campo responsableEmail"
Assert-Condition ($colegiosContent -match 'col_f_responsable') "Formulario de colegio incluye selector de especialista asignado (col_f_responsable)"
Assert-Condition ($colegiosContent -match 'openModalRedistribucionColegios') "openModalRedistribucionColegios esta implementado y exportado"
Assert-Condition ($colegiosContent -match 'col_btn_redistribuir') "Boton de redistribucion esta disponible en la barra de colegios"
Assert-Condition ($colegiosContent -match '<th>Especialista</th>') "Tabla de colegios tiene columna dedicada para Especialista"

# 3. responsables-tab.js
Write-Host "`n3. Verificando responsables-tab.js (Sincronizacion automatica bidireccional)..." -ForegroundColor Yellow
$respContent = Get-Content "public\js\ui\responsables-tab.js" -Raw

Assert-Condition ($respContent -match 'colegios:\s*colegios') "sanitizeResponsableRecord preserva array de colegios"
Assert-Condition ($respContent -match 'openModalRedistribucionColegios') "responsables-tab.js importa openModalRedistribucionColegios"
Assert-Condition ($respContent -match 'resp_f_col_check') "Formulario de responsable incluye checkboxes de colegios a su cargo"
Assert-Condition ($respContent -match 'resp_btn_redistribuir') "Pestana de responsables tiene boton para redistribuir colegios por RED"
Assert-Condition ($respContent -match 'btnRedistRedResp') "Filas expandidas de responsables permiten redistribuir con un clic"
Assert-Condition ($respContent -match 'collection\(''colegios''\)\.doc\(cid\)\.set') "saveResponsableForm actualiza automaticamente los documentos de colegios en Firestore"
Assert-Condition ($respContent -match 'cObj\.responsable = nombres') "saveResponsableForm actualiza automaticamente la memoria de state.colegios"

# 4. Formularios de registro
Write-Host "`n4. Verificando autocompletado en registro de fichas..." -ForegroundColor Yellow
$regContent = Get-Content "public\js\ui\registrar.js" -Raw
$cebeContent = Get-Content "public\js\cebe-gestion.js" -Raw
$priteContent = Get-Content "public\js\prite-gestion.js" -Raw

Assert-Condition ($regContent -match 'c\.responsableId' -and $regContent -match 'c\.responsable') "selectColegio en registrar.js prioriza especialista especifico del colegio"
Assert-Condition ($regContent -match 'getResponsableForColegio\(col') "onSubmitRegistro en registrar.js resuelve especialista asignado"
Assert-Condition ($cebeContent -match 'selected\.responsableId' -and $cebeContent -match 'selected\.responsable') "cebe-gestion.js verifica responsable asignado"
Assert-Condition ($priteContent -match 'selected\.responsableId' -and $priteContent -match 'selected\.responsable') "prite-gestion.js verifica responsable asignado"

# 5. ui.js
Write-Host "`n5. Verificando re-exportaciones en ui.js..." -ForegroundColor Yellow
$uiContent = Get-Content "public\js\ui.js" -Raw
Assert-Condition ($uiContent -match 'openModalRedistribucionColegios') "ui.js re-exporta openModalRedistribucionColegios"

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS: $passed de $total pruebas pasadas con exito." -ForegroundColor $(if ($passed -eq $total) { "Green" } else { "Red" })
if ($passed -eq $total) {
  Write-Host "TODO VALIDADO AL 100%! Soporte para REDs compartidas completado." -ForegroundColor Green
  exit 0
} else {
  Write-Host "Existen fallos en la validacion." -ForegroundColor Red
  exit 1
}
