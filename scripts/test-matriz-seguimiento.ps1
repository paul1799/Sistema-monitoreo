# Shim de compatibilidad: redirige a scripts\tests\test-matriz-seguimiento.ps1
& (Join-Path $PSScriptRoot "tests\test-matriz-seguimiento.ps1") @args
