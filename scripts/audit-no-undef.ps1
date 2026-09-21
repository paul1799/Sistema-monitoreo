# scripts/audit-no-undef.ps1
param(
  [string]$File = "public/js/ui.js"
)

Write-Host "=== AUDITANDO VARIABLES INDEFINIDAS EN $File ===" -ForegroundColor Cyan

# We can run a static verification on the file
$code = Get-Content -Raw $File

# Extract all exported and imported symbols
$imports = [System.Collections.Generic.HashSet[string]]::new()
$regexImports = [regex]'import\s+\{([^}]+)\}\s+from'
foreach ($m in $regexImports.Matches($code)) {
  foreach ($item in $m.Groups[1].Value -split ',') {
    $clean = ($item -replace 'as\s+.*', '').Trim()
    if ($clean) { [void]$imports.Add($clean) }
  }
}

Write-Host "Simbolos importados: $($imports.Count)"

# Also let's check known globals in our project
# In app.js, ui.js, pdf-template.js
# Let's see if we can check syntax by analyzing all variable accesses in onSubmitRegistro
