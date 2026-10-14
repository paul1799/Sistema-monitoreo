# Shim de compatibilidad: redirige a scripts\tests\audit-functions-state.ps1
& (Join-Path $PSScriptRoot "tests\audit-functions-state.ps1") @args
