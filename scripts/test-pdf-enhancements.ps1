# Shim de compatibilidad: redirige a scripts\tests\test-pdf-enhancements.ps1
& (Join-Path $PSScriptRoot "tests\test-pdf-enhancements.ps1") @args
