# =========================================================================
# test-cuerpo-tecnico.ps1 — Suite de verificación de Cuerpo Técnico JEDPA
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

Write-Host "`n=== INICIANDO VALIDACION DE CORRECCION DE CUERPO TECNICO JEDPA ===" -ForegroundColor Cyan

# 1. Verificación de firestore.rules
Write-Host "`n1. Verificando reglas de Firestore (firestore.rules)..." -ForegroundColor Yellow
$rulesContent = Get-Content "firestore.rules" -Raw -Encoding UTF8

Test-Assert ($rulesContent -match 'match /concursoCuerpoTecnico/\{docId\}') 'Regla match /concursoCuerpoTecnico/{docId} presente'
Test-Assert ($rulesContent -match 'allow read, create, update:\s*if signedIn\(\);') 'Lectura, creacion y edicion permitidas para usuarios autenticados'
Test-Assert ($rulesContent -match 'allow delete:\s*if isAdmin\(\);') 'Borrado de concursoCuerpoTecnico permitido para administradores'
Test-Assert ($rulesContent -match 'match /logActividades/\{docId\}') 'Regla match /logActividades/{docId} presente para bitacora'
Test-Assert ($rulesContent -match 'match /logActividades/\{docId\}\s*\{\s*allow read, create:\s*if signedIn\(\);') 'Bitacora logActividades permite read y create a usuarios con sesion'

# 2. Verificación de helpers y polimorfismo en pdf-template.js
Write-Host "`n2. Verificando helpers y compatibilidad en pdf-template.js..." -ForegroundColor Yellow
$pdfContent = Get-Content "public\js\pdf-template.js" -Raw -Encoding UTF8

Test-Assert ($pdfContent -match 'export function generarConcursoCuerpoTecnicoDocId') 'Funcion generarConcursoCuerpoTecnicoDocId exportada'
Test-Assert ($pdfContent -match 'export function obtenerCuerpoTecnicoGrupo') 'Funcion obtenerCuerpoTecnicoGrupo exportada'
Test-Assert ($pdfContent -match 'esGrupoFormalizado:\s*true') 'obtenerCuerpoTecnicoGrupo senala esGrupoFormalizado = true cuando existe en BD'
Test-Assert ($pdfContent -match 'miembros:\s*normalizedMembers') 'obtenerCuerpoTecnicoGrupo retorna miembros normalizados'
Test-Assert ($pdfContent -match 'personas:\s*normalizedMembers') 'obtenerCuerpoTecnicoGrupo retorna personas normalizadas'
Test-Assert ($pdfContent -match "origen:\s*'concursoCuerpoTecnico'") 'origen es concursoCuerpoTecnico cuando esta formalizado'

# 3. Verificación de ui.js
Write-Host "`n3. Verificando logica de guardado, rollback y UI en ui.js..." -ForegroundColor Yellow
$uiContent = Get-Content "public\js\ui.js" -Raw -Encoding UTF8

Test-Assert ($uiContent -match 'generarConcursoCuerpoTecnicoDocId') 'ui.js importa y usa generarConcursoCuerpoTecnicoDocId'
Test-Assert ($uiContent -match 'generarConcursoCuerpoTecnicoDocId\((\r?\n|\s)*group\.etapa') 'Generacion deterministica de docId aplicada al guardar'
Test-Assert ($uiContent -match 'personas:\s*membersToSave') 'Guardado incluye propiedad personas compatible con pdf-template.js'
Test-Assert ($uiContent -match 'miembros:\s*membersToSave') 'Guardado incluye propiedad miembros compatible con ui.js'
Test-Assert ($uiContent -match 'roleSelections\.has') 'Preservacion de selecciones de rol en roleSelections Map ante errores'
Test-Assert ($uiContent -match '\[concursoCuerpoTecnico:set\]') 'Diagnostico detallado con ruta y operacion en consola ante errores'
Test-Assert ($uiContent -match 'showToast\(`Error al guardar') 'Toast de error muestra detalle y codigo de error'
Test-Assert ($uiContent -match 'state\.concursoCuerpoTecnico\.push\(savedDoc\)') 'Actualizacion sincronica e inmediata del estado local tras guardar'
Test-Assert ($uiContent -match 'filter\(d => d\.id !== docId\)') 'Actualizacion sincronica e inmediata del estado local tras rollback'
Test-Assert ($uiContent -match 'm_ct_scroll_body') 'Modal cuenta con contenedor central con scroll independiente'
Test-Assert ($uiContent -match 'm_ct_close') 'Boton X de cierre siempre visible en encabezado sticky'
Test-Assert ($uiContent -match 'm_ct_closeBtn') 'Boton Cerrar siempre visible en pie sticky'
Test-Assert ($uiContent -match 'handleEscKey') 'Cierre del modal con tecla ESC implementado'
Test-Assert ($uiContent -match 'Formalizado') 'Etiqueta visual Formalizado aplicada en la columna Docente Asesor'
Test-Assert ($uiContent -match 'Sin cuerpo t.*cnico registrado') 'Fallback exacto "Sin cuerpo tecnico registrado" cuando no hay asesores'

# 4. Verificación del buscador y filtros de disciplinas en el modal de Cuerpo Técnico
Write-Host "`n4. Verificando buscador y filtros de disciplinas en el modal..." -ForegroundColor Yellow
Test-Assert ($uiContent -match 'uniqueDisciplinas') 'Extraccion automatica y ordenada de disciplinas unicas'
Test-Assert ($uiContent -match 'm_ct_search_input') 'Input de busqueda de disciplinas, categorias y personas presente'
Test-Assert ($uiContent -match 'm_ct_filter_disciplina') 'Selector de disciplinas con recuento de grupos implementado'
Test-Assert ($uiContent -match 'm_ct_filter_estado') 'Filtro por estado de formalizacion (todos, pendientes, formalizados)'
Test-Assert ($uiContent -match 'm_ct_clear_filters') 'Boton para limpiar y restablecer filtros con un solo clic'
Test-Assert ($uiContent -match 'applyGroupFilters') 'Funcion de filtrado en vivo en tiempo real implementada'
Test-Assert ($uiContent -match 'm_ct_group_card') 'Clase y selectores m_ct_group_card asociados a cada tarjeta de grupo'
Test-Assert ($uiContent -match 'data-searchtext') 'Atributo data-searchtext para indexar nombres, DNIs, roles y disciplinas'
Test-Assert ($uiContent -match 'm_ct_empty_filter') 'Mensaje amigable cuando la busqueda no encuentra resultados'
Test-Assert ($uiContent -match 'm_ct_group_count_label') 'Etiqueta dinamica de recuento actualizada en tiempo real'

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS CUERPO TECNICO: $passCount de $testCount pruebas pasadas con exito." -ForegroundColor Cyan
if ($passCount -eq $testCount) {
    Write-Host "TODAS LAS PRUEBAS DE CUERPO TECNICO PASARON SATISFACTORIAMENTE (100%)!`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "EXISTEN PRUEBAS FALLIDAS ($($testCount - $passCount)).`n" -ForegroundColor Red
    exit 1
}
