# Shim de compatibilidad: redirige a scripts\tests\audit-state-scope.ps1
& (Join-Path $PSScriptRoot "tests\audit-state-scope.ps1") @args
