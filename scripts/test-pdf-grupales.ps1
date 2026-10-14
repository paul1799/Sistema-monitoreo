# Shim de compatibilidad: redirige a scripts\tests\test-pdf-grupales.ps1
& (Join-Path $PSScriptRoot "tests\test-pdf-grupales.ps1") @args
