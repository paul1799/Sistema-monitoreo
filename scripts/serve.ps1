# Shim de compatibilidad: redirige a scripts\tools\serve.ps1
& (Join-Path $PSScriptRoot "tools\serve.ps1") @args
