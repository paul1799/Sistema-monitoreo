# Shim de compatibilidad: redirige a scripts\tests\audit-no-undef.ps1
& (Join-Path $PSScriptRoot "tests\audit-no-undef.ps1") @args
