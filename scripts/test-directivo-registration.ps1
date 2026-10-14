# Shim de compatibilidad: redirige a scripts\tests\test-directivo-registration.ps1
& (Join-Path $PSScriptRoot "tests\test-directivo-registration.ps1") @args
