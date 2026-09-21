# scripts/audit-state-scope.ps1
param(
  [string]$FilePath = "public/js/ui.js"
)

$content = Get-Content -Raw $FilePath
$lines = Get-Content $FilePath

Write-Host "=== AUDITANDO USOS DE 'state' EN $FilePath ===" -ForegroundColor Cyan

# Parse functions and track whether 'state' is a parameter or enclosed
# We can find all occurrences of 'state.' or 'state[' or standalone 'state'
$matches = [regex]::Matches($content, '(?<![a-zA-Z0-9_$])state(?![a-zA-Z0-9_$])')
Write-Host "Total de referencias a 'state': $($matches.Count)"

# Let's inspect function scopes in ui.js
# We will check line by line what function we are currently inside
$functionStack = [System.Collections.Generic.List[string]]::new()
$lineNum = 0
$issues = @()

foreach ($line in $lines) {
  $lineNum++
  
  # Check function definitions
  if ($line -match 'function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)') {
    $fnName = $Matches[1]
    $params = $Matches[2]
    # Write-Host "L$lineNum: function $fnName ($params)"
  }
  
  # Check if line uses 'state'
  if ($line -match '(?<![a-zA-Z0-9_$])state(?![a-zA-Z0-9_$])') {
    # Check if 'state' is declared in this line (e.g. param or let state)
    if ($line -notmatch 'function\s+[a-zA-Z0-9_$]*\s*\([^)]*state' -and
        $line -notmatch 'let\s+state' -and
        $line -notmatch 'const\s+state' -and
        $line -notmatch 'state\s*=\s*\{\}' -and
        $line -notmatch 'state\s*:' ) {
      # This is a usage of state. Let's record it.
      # Write-Host "L$lineNum: $line"
    }
  }
}
