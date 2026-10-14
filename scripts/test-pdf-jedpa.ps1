# Shim de compatibilidad: redirige a scripts\tests\test-pdf-jedpa.ps1
& (Join-Path $PSScriptRoot "tests\test-pdf-jedpa.ps1") @args
