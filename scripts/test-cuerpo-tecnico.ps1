# Shim de compatibilidad: redirige a scripts\tests\test-cuerpo-tecnico.ps1
& (Join-Path $PSScriptRoot "tests\test-cuerpo-tecnico.ps1") @args
