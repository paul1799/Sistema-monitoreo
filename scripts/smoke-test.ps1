# Shim de compatibilidad: redirige a scripts\tests\smoke-test.ps1
& (Join-Path $PSScriptRoot "tests\smoke-test.ps1") @args
