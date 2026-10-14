# Shim de compatibilidad: redirige a scripts\tests\test-jfen.ps1
& (Join-Path $PSScriptRoot "tests\test-jfen.ps1") @args
