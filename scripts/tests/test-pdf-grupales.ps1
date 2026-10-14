# =========================================================================
# test-pdf-grupales.ps1 — Suite de verificación para Actas PDF Grupales
# (Crea y Emprende, Eureka, El Perú Lee, JEDPA Colectivo, JFEN)
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

Write-Host "`n=== INICIANDO VALIDACION DE ACTA PDF PARA CONCURSOS GRUPALES ===" -ForegroundColor Cyan

# 1. Paleta estándar y tokens de color en pdf-template.js
Write-Host "`n1. Verificando PALETA_ESTANDAR y tokens de diseno..." -ForegroundColor Yellow
$pdfContent = Get-Content "public\js\pdf-template.js" -Raw -Encoding UTF8

Test-Assert ($pdfContent -match 'export const PALETA_ESTANDAR\s*=') 'PALETA_ESTANDAR exportada en pdf-template.js'
Test-Assert ($pdfContent -match "'#12294C'") 'PALETA_ESTANDAR define navy institucional (#12294C)'
Test-Assert ($pdfContent -match "'#0B1B36'") 'PALETA_ESTANDAR define color de titulo (#0B1B36)'
Test-Assert ($pdfContent -match "'#2E4A73'") 'PALETA_ESTANDAR define banda de categoria (#2E4A73)'
Test-Assert ($pdfContent -match "'#E0A626'") 'PALETA_ESTANDAR define acento dorado (#E0A626)'
Test-Assert ($pdfContent -match "'#EDF2F5'") 'PALETA_ESTANDAR define fondo de etiquetas KV (#EDF2F5)'

# 2. Formato de código modular (formatCodigoModular)
Write-Host "`n2. Verificando funcion formatCodigoModular..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export function formatCodigoModular') 'Funcion formatCodigoModular definida y exportada'
Test-Assert ($pdfContent -match 'padStart\(7,\s*[''"]0[''"]\)') 'formatCodigoModular aplica padStart(7, "0") para normalizar a 7 digitos'

# 3. Detección de campos de podio (getPodioFields)
Write-Host "`n3. Verificando getPodioFields..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export function getPodioFields') 'Funcion getPodioFields definida y exportada'
Test-Assert ($pdfContent -match 'tipo\.camposPodio') 'getPodioFields respeta camposPodio configurados en el catalogo'

# 4. Construcción de filas de ficha (construirFilasFicha) y filtro de GENERAL
Write-Host "`n4. Verificando construirFilasFicha y supresion de Area/Disciplina GENERAL..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export function construirFilasFicha') 'Funcion construirFilasFicha definida y exportada'
Test-Assert ($pdfContent -match "rawDisc\.toUpperCase\(\)\s*===\s*'GENERAL'") 'construirFilasFicha suprime disciplina si el valor es GENERAL'
Test-Assert ($pdfContent -match 'tieneDisciplina') 'construirFilasFicha valida tieneDisciplina antes de agregar fila'
Test-Assert ($pdfContent -match 'formatCodigoModular\(registro\.codigoModular\)') 'construirFilasFicha formatea el codigo modular a 7 digitos'
Test-Assert ($pdfContent -match 'colSpan:\s*2') 'Filas KV estructuradas en 2 columnas virtuales con colSpan: 2'
Test-Assert ($pdfContent -match 'isPuesto:\s*true') 'Celda de puesto marcada con isPuesto para dibujo vectorial'
$fnStart = $pdfContent.IndexOf("export async function exportJedpaFichasPdf")
$subContent = if ($fnStart -ge 0) { $pdfContent.Substring($fnStart, 4000) } else { "" }
$idxEtapaDecl = $subContent.IndexOf("const etapaLabel =")
$idxEtapaUse = $subContent.IndexOf("if (etapaLabel) kwList.push")
Test-Assert ($idxEtapaDecl -ge 0 -and $idxEtapaDecl -lt $idxEtapaUse) 'etapaLabel inicializada antes de su uso en kwList (evita ReferenceError en descargas)'

# 5. Insignia vectorial de puesto (dibujarInsigniaPuesto) sin emojis
Write-Host "`n5. Verificando insignia vectorial de puesto sin emojis..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export function dibujarInsigniaPuesto') 'Funcion dibujarInsigniaPuesto definida y exportada'
Test-Assert ($pdfContent -match 'doc\.roundedRect') 'Insignia de puesto dibujada con roundedRect vectorial'
Test-Assert ($pdfContent -match 'doc\.circle') 'Medalla dibujada con circulo vectorial (evita emojis WinAnsi)'
Test-Assert ($pdfContent -match '#D4A017') 'Paleta de podio con color dorado (#D4A017)'
Test-Assert ($pdfContent -match '#9EA7B3') 'Paleta de podio con color plateado (#9EA7B3)'
Test-Assert ($pdfContent -match '#B87333') 'Paleta de podio con color bronce (#B87333)'

# 6. Pie de página no superpuesto (dibujarPiePagina)
Write-Host "`n6. Verificando funcion de pie de pagina unificada dibujarPiePagina..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export function dibujarPiePagina') 'Funcion dibujarPiePagina definida y exportada'
Test-Assert ($pdfContent -match 'Documento generado por el Sistema de Fichas de Monitoreo') 'Pie de pagina incluye leyenda institucional y trazabilidad'
Test-Assert ($pdfContent -match 'Cód\. Verif:|C.d\. Verif:') 'Pie de pagina incluye codigo de verificacion oficial'
Test-Assert ($pdfContent -match 'totalPagesExp') 'Pie de pagina numera paginas dinamicamente con totalPagesExp'

# 7. Motor de generación exportJedpaFichasPdf y anchos de columnas
Write-Host "`n7. Verificando exportJedpaFichasPdf y anchos de tabla..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'export async function exportJedpaFichasPdf') 'exportJedpaFichasPdf implementada como async'
Test-Assert ($pdfContent -match 'export const exportFichasGrupalesConcursoPdf\s*=\s*exportJedpaFichasPdf') 'Alias exportFichasGrupalesConcursoPdf disponible'
Test-Assert ($pdfContent -match 'const colW0\s*=\s*127') 'Columna 0 fijada en 127 pt'
Test-Assert ($pdfContent -match 'const colW1\s*=\s*30') 'Columna 1 fijada en 30 pt'
Test-Assert ($pdfContent -match 'const colW2\s*=\s*271') 'Columna 2 fijada en 271 pt'
Test-Assert ($pdfContent -match 'const colW3\s*=\s*95\.28') 'Columna 3 fijada en 95.28 pt (soporta DNIs de 14-15 caracteres)'
Test-Assert ($pdfContent -match 'isContestName') 'KPI detecta nombre de concurso'
Test-Assert ($pdfContent -match 'splitTextToSize\(k\.value') 'Nombre de concurso en KPI ajusta fuente dinamicamente sin truncar con puntos suspensivos'
Test-Assert ($pdfContent -match 'titleParts\.join') 'Encabezado de ficha une dinamicamente partes de categoria y puesto'

# 8. Desacoplamiento de JFEN y Concursos Grupales
Write-Host "`n8. Verificando desacoplamiento y enrutamiento en exportConcursosReportPdf..." -ForegroundColor Yellow
Test-Assert ($pdfContent -match 'debeUsarFichasJfen') 'JFEN detectado con variable debeUsarFichasJfen'
Test-Assert ($pdfContent -match 'exportJfenFichasPdf\(cleanRows') 'JFEN enruta a exportJfenFichasPdf'
Test-Assert ($pdfContent -match 'exportJedpaFichasPdf\(cleanRows') 'Concursos grupales con formato ficha enrutan a exportJedpaFichasPdf con PALETA_ESTANDAR'

# 9. Interfaz de usuario (ui.js) y catálogo
Write-Host "`n9. Verificando ui.js y catalogo de concursos..." -ForegroundColor Yellow
$uiContent = Get-Content "public\js\ui.js" -Raw -Encoding UTF8

Test-Assert ($uiContent -match 'formatCodigoModular') 'ui.js importa formatCodigoModular'
Test-Assert ($uiContent -match 'exportFichasGrupalesConcursoPdf') 'ui.js importa exportFichasGrupalesConcursoPdf'
Test-Assert ($uiContent -match 'PALETA_ESTANDAR') 'ui.js importa PALETA_ESTANDAR'
Test-Assert ($uiContent -match 'formatCodigoModular\(codModInp\.value\)') 'ui.js normaliza codigo modular a 7 digitos al guardar'
Test-Assert ($uiContent -match 'const esJfenConcurso\s*=\s*isJfen;') 'ui.js restringe esJfenConcurso a isJfen genuino'
Test-Assert ($uiContent -match 'Fichas por categor.a / equipo') 'Badge en catalogo de tipos muestra Fichas por categoria / equipo'
Test-Assert ($uiContent -match 'Fichas por categor.a / equipo \(Formato ficha\)') 'Select de catalogo ofrece Fichas por categoria / equipo (Formato ficha)'
Test-Assert (-not ($uiContent -match 'Exclusivo JFEN')) 'ui.js no contiene la etiqueta obsoleta Exclusivo JFEN'
Test-Assert ($uiContent -match 'formatCodigoModular\(item\.codigoModular') 'ui.js normaliza codigo modular al importar ganadores masivos'

Write-Host "`n=======================================================" -ForegroundColor Cyan
Write-Host "RESULTADOS CONCURSOS GRUPALES: $passCount de $testCount pruebas pasadas con exito." -ForegroundColor Cyan
if ($passCount -eq $testCount) {
    Write-Host "TODAS LAS PRUEBAS DE ACTAS PDF GRUPALES PASARON SATISFACTORIAMENTE (100%)!`n" -ForegroundColor Green
} else {
    Write-Host "EXISTEN PRUEBAS FALLIDAS. REVISE EL REPORTE SUPERIOR.`n" -ForegroundColor Red
}
