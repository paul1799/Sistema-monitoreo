# scripts/audit-functions-state.ps1
$lines = Get-Content "public/js/ui.js"
$lineNum = 0
$currentFn = $null
$fnParams = ""
$fnStartLine = 0
$bracketDepth = 0
$topLevelFunctions = [ordered]@{}

for ($i = 0; $i -lt $lines.Count; $i++) {
  $line = $lines[$i]
  $lineNum = $i + 1

  # Check top-level function declaration (at depth 0)
  if ($bracketDepth -eq 0 -and $line -match '^(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(([^)]*)\)') {
    $currentFn = $Matches[1]
    $fnParams = $Matches[2]
    $fnStartLine = $lineNum
    $topLevelFunctions[$currentFn] = @{
      Name = $currentFn
      Params = $fnParams
      StartLine = $fnStartLine
      UsesState = $false
      StateUsageLines = [System.Collections.Generic.List[string]]::new()
    }
  }

  # Count brackets
  $openCount = ($line -replace '[^{]', '').Length
  $closeCount = ($line -replace '[^}]', '').Length
  $bracketDepth += ($openCount - $closeCount)

  if ($currentFn -and $bracketDepth -gt 0) {
    if ($line -match '(?<![a-zA-Z0-9_$])state(?![a-zA-Z0-9_$])' -and $line -notmatch 'function\s+[a-zA-Z0-9_$]*\s*\([^)]*state') {
      $topLevelFunctions[$currentFn].UsesState = $true
      $topLevelFunctions[$currentFn].StateUsageLines.Add("$($lineNum): $($line.Trim())")
    }
  }

  if ($bracketDepth -le 0) {
    $bracketDepth = 0
    $currentFn = $null
  }
}

Write-Host "=== TOP-LEVEL FUNCTIONS THAT USE 'state' IN public/js/ui.js ===" -ForegroundColor Cyan
foreach ($fnName in $topLevelFunctions.Keys) {
  $fn = $topLevelFunctions[$fnName]
  if ($fn.UsesState) {
    $hasStateParam = $fn.Params -match '(?<![a-zA-Z0-9_$])state(?![a-zA-Z0-9_$])'
    $status = if ($hasStateParam) { "[OK: has state param]" } else { "[BUG: MISSING state param!]" }
    $color = if ($hasStateParam) { "Green" } else { "Red" }
    Write-Host "$status $($fn.Name) (line $($fn.StartLine)) - Params: ($($fn.Params))" -ForegroundColor $color
    if (-not $hasStateParam) {
      foreach ($u in $fn.StateUsageLines) {
        Write-Host "    -> $u" -ForegroundColor Yellow
      }
    }
  }
}
