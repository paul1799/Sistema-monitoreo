# Shim de compatibilidad: redirige a scripts\tests\test-consolidado-v2.ps1
& (Join-Path $PSScriptRoot "tests\test-consolidado-v2.ps1") @args
