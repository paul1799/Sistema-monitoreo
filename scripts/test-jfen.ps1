# test-jfen.ps1
Write-Host "=== VERIFICACION DE REQUISITOS JFEN Y PDF ===" -ForegroundColor Cyan

$pdfTemplate = Get-Content -Raw "public/js/pdf-template.js"
$ui = Get-Content -Raw "public/js/ui.js"
$style = Get-Content -Raw "public/css/style.css"

$tests = @(
  @{ Name = "pdf-template.js exporta parseArteDisciplina"; Passed = ($pdfTemplate.Contains("export function parseArteDisciplina")) },
  @{ Name = "pdf-template.js exporta exportJfenFichasPdf"; Passed = ($pdfTemplate.Contains("export async function exportJfenFichasPdf")) },
  @{ Name = "pdf-template.js formatPersonName delega en formatearNombre"; Passed = ($pdfTemplate -match 'function formatPersonName\([^)]*\)\s*\{\s*return formatearNombre\(') },
  @{ Name = "pdf-template.js formatResolucionRef usa guion ASCII"; Passed = ($pdfTemplate.Contains("u2011") -and $pdfTemplate.Contains("'-'")) },
  @{ Name = "pdf-template.js exportConcursosReportPdf deriva a exportJfenFichasPdf"; Passed = ($pdfTemplate.Contains("exportJfenFichasPdf(cleanRows,")) },
  @{ Name = "pdf-template.js implementa safeDrawHeader con Set para evitar duplicados"; Passed = ($pdfTemplate.Contains("const drawnHeaderPages = new Set()")) },
  @{ Name = "ui.js importa parseArteDisciplina y exportJfenFichasPdf"; Passed = ($ui.Contains("parseArteDisciplina") -and $ui.Contains("exportJfenFichasPdf")) },
  @{ Name = "ui.js contiene estado concursoVistaJfen predeterminado en 'fichas'"; Passed = ($ui -match "concursoVistaJfen\s*=\s*'fichas'") },
  @{ Name = "ui.js syncConcursoFiltersToUrl soporta isJfen con arte y modalidad"; Passed = ($ui.Contains("filters.arte") -and $ui.Contains("filters.modalidad")) },
  @{ Name = "ui.js renderConcursoConsolidadoView tiene rama isJfen con cascada"; Passed = ($ui.Contains("else if (isJfen)") -and $ui.Contains("arteOptions = getFacetOptions")) },
  @{ Name = "ui.js renderConcursoConsolidadoView genera fichasHtml con tarjetas JFEN"; Passed = ($ui.Contains("jfenFichaCard") -and $ui.Contains("jfenCategoryBar")) },
  @{ Name = "ui.js renderConcursoConsolidadoView incluye conmutador Fichas | Tabla"; Passed = ($ui.Contains("btnVistaFichas") -and $ui.Contains("btnVistaTabla")) },
  @{ Name = "ui.js usa formatearNombre para participantes y asesores"; Passed = ($ui.Contains("const nom = formatearNombre(p);") -and $ui.Contains("const nom = formatearNombre(a);")) },
  @{ Name = "style.css tiene .jfenFichaCard y .jfenCategoryBar"; Passed = ($style.Contains(".jfenFichaCard") -and $style.Contains(".jfenCategoryBar")) },
  @{ Name = "style.css tiene .jfenMetaTable y .jfenParticipantsTable"; Passed = ($style.Contains(".jfenMetaTable") -and $style.Contains(".jfenParticipantsTable")) },
  @{ Name = "style.css tiene .concursoActionsRow con justify-content: space-between"; Passed = ($style -match '\.concursoActionsRow\s*\{[^}]*justify-content:\s*space-between') },
  @{ Name = "style.css tiene alineacion de welcomeBanner corregida sin margen desfasado"; Passed = ($style -match '\.welcomeBanner\s*\{[^}]*margin:\s*18px auto 0 auto') }
)

$allPassed = $true
foreach ($t in $tests) {
  if ($t.Passed) {
    Write-Host "  [PASS] $($t.Name)" -ForegroundColor Green
  } else {
    Write-Host "  [FAIL] $($t.Name)" -ForegroundColor Red
    $allPassed = $false
  }
}

if ($allPassed) {
  Write-Host "`nTODAS LAS PRUEBAS JFEN PASARON EXITOSAMENTE ($($tests.Count)/$($tests.Count))." -ForegroundColor Green
} else {
  Write-Host "`nHAY FALLOS EN LAS PRUEBAS JFEN." -ForegroundColor Red
  exit 1
}
