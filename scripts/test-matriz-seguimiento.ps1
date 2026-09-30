# =========================================================================
# test-matriz-seguimiento.ps1 — Verificación automatizada de la
# Matriz de Seguimiento 2026 contra la estructura REAL de la ficha del sistema
# (3 componentes, 31 indicadores con escala Sí / No / N/A)
# =========================================================================

$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  TEST AUTOMATIZADO: MATRIZ DE SEGUIMIENTO 2026 (UGEL 03)" -ForegroundColor Cyan
Write-Host "  Estructura REAL de la Ficha JEC (3 componentes, Sí/No/N/A)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$passCount = 0
$failCount = 0

function Assert-Condition($testName, $condition, $detail) {
  if ($condition) {
    Write-Host "[PASO] $testName - $detail" -ForegroundColor Green
    $script:passCount++
  } else {
    Write-Host "[FALLO] $testName - $detail" -ForegroundColor Red
    $script:failCount++
  }
}

# 1. Verificar existencia de módulos generadores
$matrizConfigPath = "public\js\matrizConfig.js"
$exportarMatrizPath = "public\js\exportarMatriz.js"
$jecMonitoreoPath = "public\js\jec-monitoreo.js"

Assert-Condition "Módulo matrizConfig.js existe" (Test-Path $matrizConfigPath) "Ubicación: $matrizConfigPath"
Assert-Condition "Módulo exportarMatriz.js existe" (Test-Path $exportarMatrizPath) "Ubicación: $exportarMatrizPath"
Assert-Condition "Módulo jec-monitoreo.js existe" (Test-Path $jecMonitoreoPath) "Ubicación: $jecMonitoreoPath"

$configContent = Get-Content $matrizConfigPath -Raw -Encoding UTF8
$exportarContent = Get-Content $exportarMatrizPath -Raw -Encoding UTF8
$jecContent = Get-Content $jecMonitoreoPath -Raw -Encoding UTF8

# 2. Verificar que la definición de Ficha JEC contiene 3 componentes y 31 indicadores
$hasObtenerComponentes = $configContent.Contains("export function obtenerComponentesJec")
$hasGenerarColumnas = $configContent.Contains("export function generarItemsConColumnasJec")
$hasMapeoJec = $configContent.Contains("export const MAPEO_COLUMNAS_JEC =")
$hasItemsJec = $configContent.Contains("export const ITEMS_MODELO_JEC =")

Assert-Condition "Función obtenerComponentesJec exportada" $hasObtenerComponentes "Lee componentes dinámicamente de la ficha"
Assert-Condition "Función generarItemsConColumnasJec exportada" $hasGenerarColumnas "Calcula columnas y porcentajes dinámicamente"
Assert-Condition "Constante ITEMS_MODELO_JEC exportada" $hasItemsJec "31 indicadores oficiales"
Assert-Condition "Tabla MAPEO_COLUMNAS_JEC exportada" $hasMapeoJec "Mapeo columna Excel <-> indicador del sistema"

# 3. Verificar textos y componentes oficiales del sistema
$hasPedag = ($configContent -match "Componente pedag.*gico.*TOECE" -or $jecContent -match "Componente pedag.*gico.*TOECE")
$hasGest = ($configContent -match "Componente de gesti.*n" -or $jecContent -match "Componente de gesti.*n")
$hasSop = ($configContent -match "Componente de soporte" -or $jecContent -match "Componente de soporte")

Assert-Condition "Componente 1: Componente pedagógico (Implementación TOECE) presente" $hasPedag "9 indicadores"
Assert-Condition "Componente 2: Componente de gestión presente" $hasGest "11 indicadores"
Assert-Condition "Componente 3: Componente de soporte presente" $hasSop "11 indicadores"

# 4. Verificar eliminación del bloque inventado Condiciones (SI/NO) de la matriz
$hasOldCondiciones = $configContent.Contains("01 ASPECTO: CONDICIONES (SI/NO)")
Assert-Condition "Bloque inventado Condiciones (SI/NO) eliminado de la matriz" (-not $hasOldCondiciones) "La matriz no contiene aspectos hardcodeados ajenos"

# 5. Verificar configuración de Fichas B y C
$fichasTutoriaPresente = $configContent.Contains("ITEMS_COORD_TUTORIA_JEC") -and $configContent.Contains("COORD. TUTORIA JEC")
Assert-Condition "Configuración Ficha B (COORD. TUTORIA JEC) definida" $fichasTutoriaPresente "21 ítems en 5 aspectos"

$fichasPedagPresente = $configContent.Contains("ITEMS_COORD_PEDAGOGICO") -and $configContent.Contains("COORD. PEDAGOGICO")
Assert-Condition "Configuración Ficha C (COORD. PEDAGOGICO) definida" $fichasPedagPresente "21 ítems en 5 aspectos"

# 6. Verificar límites de nivel de JEC (regla oficial MINEDU por conteo de 'SI')
$limitesConteo = $configContent.Contains("tipo: 'conteo'") -and $configContent.Contains("max: 31") -and $configContent.Contains("limInicio: 11") -and $configContent.Contains("limProceso: 23")
$limitesLograda = ($configContent -match "Implementaci.*n lograda" -and $configContent -match "min:\s*24,\s*max:\s*31")
$limitesParcial = ($configContent -match "Implementaci.*n parcial" -and $configContent -match "min:\s*12,\s*max:\s*23")
$limitesIncipiente = ($configContent -match "Implementaci.*n incipiente" -and $configContent -match "min:\s*0,\s*max:\s*11")

Assert-Condition "Límites JEC: tipo conteo, max 31, limInicio 11, limProceso 23" $limitesConteo "Regla oficial por respuestas 'Sí'"
Assert-Condition "Rango Lograda: 24 a 31 respuestas 'Sí'" $limitesLograda "Implementación lograda"
Assert-Condition "Rango Parcial: 12 a 23 respuestas 'Sí'" $limitesParcial "Implementación parcial"
Assert-Condition "Rango Incipiente: 0 a 11 respuestas 'Sí'" $limitesIncipiente "Implementación incipiente"

# 7. Verificar botón y evento en ui.js
$uiContent = Get-Content "public\js\ui.js" -Raw -Encoding UTF8
Assert-Condition "Botón Exportar Excel con id exportExcel en ui.js" ($uiContent.Contains('id="exportExcel"') -and $uiContent.Contains('Exportar Excel')) "Texto e icono actualizados"
Assert-Condition "Antiguo exportCsv reemplazado en la barra de filtros" (-not ($uiContent -match 'id="exportCsv"[^>]*>Exportar CSV')) "Botón CSV eliminado del consolidado"
Assert-Condition "Importación de exportarMatrizSeguimiento en ui.js" ($uiContent.Contains("exportarMatrizSeguimiento")) "Importación verificada"

# 8. Verificar funciones de exportarMatriz.js para JEC
$hasHojaJec = $exportarContent.Contains("function _construirHojaMatrizJec")
$hasNormalizarSiNoNa = $exportarContent.Contains("export function normalizarSiNoNa")
$hasParseDateUtc = $exportarContent.Contains("export function parseDateOnlyToUtcDate")
$hasCallJec = $exportarContent.Contains("_construirHojaMatrizJec(ws, config, itemsList, state)")

Assert-Condition "Generador _construirHojaMatrizJec implementado" $hasHojaJec "Estructura de 3 componentes Sí/No/N/A"
Assert-Condition "Función normalizarSiNoNa exportada" $hasNormalizarSiNoNa "Normaliza Sí->SI, No->NO, N/A->N/A sin inventar 1-2-3"
Assert-Condition "Función parseDateOnlyToUtcDate exportada" $hasParseDateUtc "Escribe fecha real de Excel sin desfase UTC"
Assert-Condition "Llamada condicional a _construirHojaMatrizJec para MODELO JEC" $hasCallJec "Bifurcación verificada"

# 9. Verificar fórmulas de % y Nivel en _construirHojaMatrizJec
$hasPctCompFormula = $exportarContent.Contains("IFERROR(COUNTIF(") -and $exportarContent.Contains('"SI")/(COUNTIF(')
$hasPctGenFormula = $exportarContent.Contains("% Cumplimiento General por IIEE")
$hasNivelJecFormula = $exportarContent.Contains('"Implementación lograda"') -and $exportarContent.Contains('"Implementación parcial"') -and $exportarContent.Contains('"Implementación incipiente"')

Assert-Condition "Fórmula % CUMPLIMIENTO de componente: Sí / (Sí + No)" $hasPctCompFormula "Excluye N/A del cálculo"
Assert-Condition "Columna % Cumplimiento General por IIEE sobre 31 indicadores" $hasPctGenFormula "Reemplaza Puntaje Total"
Assert-Condition "Fórmula Nivel de Implementación por IIEE con etiquetas oficiales" $hasNivelJecFormula "Implementación lograda/parcial/incipiente"

# 10. Verificar bloque de estadística con 6 filas oficiales
$hasStatSi = $exportarContent.Contains("'Sí (Cumple)'")
$hasStatNo = $exportarContent.Contains("'No (No cumple)'")
$hasStatNa = $exportarContent.Contains("'N/A (No aplica)'")
$hasStatTotal = $exportarContent.Contains("'Total'")
$hasStatPctC = $exportarContent.Contains("'% Cumple'")
$hasStatPctNc = $exportarContent.Contains("'% No cumple'")

Assert-Condition "Estadística: Fila Sí (Cumple)" $hasStatSi "COUNTIF SI"
Assert-Condition "Estadística: Fila No (No cumple)" $hasStatNo "COUNTIF NO"
Assert-Condition "Estadística: Fila N/A (No aplica)" $hasStatNa "COUNTIF N/A"
Assert-Condition "Estadística: Fila Total" $hasStatTotal "SUM(Sí+No+N/A)"
Assert-Condition "Estadística: Fila % Cumple" $hasStatPctC "IFERROR(Sí/(Sí+No),0)"
Assert-Condition "Estadística: Fila % No cumple" $hasStatPctNc "IFERROR(No/(Sí+No),0)"

# 11. Verificar cuadros RESULTADO y CUMPLIMIENTO POR COMPONENTE
$hasCuadroRes = $exportarContent.Contains("RESULTADO") -and $exportarContent.Contains("Implementación lograda")
$hasCuadroComp = $exportarContent.Contains("CUMPLIMIENTO POR COMPONENTE")

Assert-Condition "Cuadro RESULTADO con niveles oficiales del sistema" $hasCuadroRes "Incipiente / Parcial / Lograda"
Assert-Condition "Cuadro CUMPLIMIENTO POR COMPONENTE con % agregados y estado" $hasCuadroComp "Pedagógico, Gestión, Soporte y General"

# 12. Verificar función normalizarPersona y catálogo de condiciones
$exportarHasNormalizar = $exportarContent.Contains("export function normalizarPersona")
$exportarHasCatalogo = $exportarContent.Contains("CATALOGO_CONDICION") -and $exportarContent.Contains("'Designado(a)'")
$exportarHasFormatDni = $exportarContent.Contains("export function formatDni") -and $exportarContent.Contains("padStart(8, '0')")
$exportarHasCleanEmail = $exportarContent.Contains("export function cleanEmail")
$exportarHasPlaceholder = $exportarContent.Contains("isPlaceholderPersona")

Assert-Condition "Función normalizarPersona exportada" $exportarHasNormalizar "Función única para todas las personas"
Assert-Condition "Catálogo oficial de condiciones configurado" $exportarHasCatalogo "D, E, N, C -> Designado(a), Encargado(a), Nombrado(a), Contratado(a)"
Assert-Condition "Formateador formatDni con 8 dígitos y padding" $exportarHasFormatDni "DNI de 7 dígitos se completa con cero inicial"
Assert-Condition "Limpieza de correo electrónico cleanEmail" $exportarHasCleanEmail "Correos limpios en minúsculas sin espacios"
Assert-Condition "Detector de placeholders isPlaceholderPersona" $exportarHasPlaceholder "Detecta 'NO CUENTA', 'SIN SUBDIRECTOR', '-', 'null', '[object Object]'"

# 13. Verificar orden de prioridad y enriquecimiento desde Directorio / Colegios
$exportarHasPrioridad = $exportarContent.Contains("_enriquecerConDirectorioYColegios") -and $exportarContent.Contains("state.directivos")
$exportarNoMezclaDni = $exportarContent.Contains("fichaDni !== dirDni") -or $exportarContent.Contains("fichaDni === dirDni")
Assert-Condition "Enriquecimiento desde Directorio y Colegios" $exportarHasPrioridad "Fallback a state.directivos y state.colegios"
Assert-Condition "Regla estricta de no mezclar datos si DNI difiere" $exportarNoMezclaDni "Verifica coincidencia de DNI antes de complementar"

# 14. Verificar protección de celdas contra objetos y JSON
$exportarHasCellGuard = $exportarContent.Contains("export function setSafeCellValue")
Assert-Condition "Protección general setSafeCellValue implementada" $exportarHasCellGuard "Evita que objetos, arrays o JSON strings lleguen a celdas"

# 15. Verificar formateadores de observaciones y compromisos
$exportarHasObs = $exportarContent.Contains("export function formatObservaciones")
$exportarHasComp = $exportarContent.Contains("export function formatCompromisos")
Assert-Condition "Función formatObservaciones implementada" $exportarHasObs "Une observaciones de cierre y hallazgos por aspecto"
Assert-Condition "Función formatCompromisos implementada" $exportarHasComp "Soporta objeto {directivo, especialista} y listas con viñetas"

# 16. Verificar construcción de la hoja MONITOREO DOCENTE JEC
$exportarHasHojaDoc = $exportarContent.Contains("function _construirHojaMonitoreoDocente")
$exportarCreatesHojaDoc = $exportarContent.Contains("workbook.addWorksheet('MONITOREO DOCENTE JEC'")
Assert-Condition "Generador de hoja MONITOREO DOCENTE JEC implementado" $exportarHasHojaDoc "Tabla por momentos y rúbricas R1-R5 por niveles I-IV"
Assert-Condition "Hoja MONITOREO DOCENTE JEC agregada al libro" $exportarCreatesHojaDoc "Segunda hoja generada condicionalmente para JEC"

# 17. Verificar orden de hojas: Listas al final y oculta
$exportarListasAtEnd = $exportarContent.IndexOf("workbook.addWorksheet('MONITOREO DOCENTE JEC'") -lt $exportarContent.IndexOf("workbook.addWorksheet('Listas'")
$listasHasNa = $exportarContent.Contains("wsListas.getCell('B4').value = 'N/A'")
Assert-Condition "Hoja Listas ubicada después de las hojas de datos" $exportarListasAtEnd "MODELO JEC es la primera hoja y Listas está al final"
Assert-Condition "Hoja Listas incluye opción N/A" $listasHasNa "SI, NO, N/A"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RESUMEN: $passCount pruebas PASADAS, $failCount pruebas FALLIDAS" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host "============================================================" -ForegroundColor Cyan

if ($failCount -gt 0) {
  exit 1
}
