# Shim de compatibilidad: redirige a scripts\tools\build-sample-files.ps1
& (Join-Path $PSScriptRoot "tools\build-sample-files.ps1") @args
