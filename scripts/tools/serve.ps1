# scripts/serve.ps1 - Servidor estatico HTTP en PowerShell puro
param (
  [int]$Port = 5000
)

$root = if (Test-Path (Join-Path $PSScriptRoot "..\public")) { (Resolve-Path (Join-Path $PSScriptRoot "..\public")).Path } else { (Resolve-Path (Join-Path $PSScriptRoot "..\..\public")).Path }

$listener = New-Object System.Net.HttpListener
$prefixes = @("http://localhost:$Port/")
if ($Port -ne 8089) { $prefixes += "http://localhost:8089/" }
if ($Port -ne 5000) { $prefixes += "http://localhost:5000/" }

foreach ($p in $prefixes) {
  try { $listener.Prefixes.Add($p) } catch {}
}

try {
  $listener.Start()
  Write-Host "Servidor escuchando en $($prefixes -join ' y ') (raiz: $root)"
} catch {
  Write-Host "Error iniciando listener: $_"
  exit 1
}

try {
  while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    
    $rawPath = $request.Url.LocalPath.TrimStart('/')
    if ($request.HttpMethod -eq "POST" -and $rawPath -eq "save-sample") {
      try {
        $fileName = $request.Headers["X-File-Name"]
        if ([string]::IsNullOrWhiteSpace($fileName)) { $fileName = "MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC_2026-09-30.xlsx" }
        $destDir = (Resolve-Path (Join-Path $PSScriptRoot "..\docs\muestras")).Path
        $destPath = Join-Path $destDir $fileName
        $fs = [System.IO.File]::Create($destPath)
        $request.InputStream.CopyTo($fs)
        $fs.Close()
        $respBytes = [System.Text.Encoding]::UTF8.GetBytes("OK")
        $response.StatusCode = 200
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.OutputStream.Write($respBytes, 0, $respBytes.Length)
      } catch {
        $response.StatusCode = 500
        $errBytes = [System.Text.Encoding]::UTF8.GetBytes("Error: $_")
        $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
      } finally {
        $response.Close()
      }
      continue
    }

    if ([string]::IsNullOrWhiteSpace($rawPath)) { $rawPath = "index.html" }
    $filePath = Join-Path $root ($rawPath -replace '/', '\')

    try {
      if (Test-Path $filePath -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($filePath)
        $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
        $contentType = "application/octet-stream"
        switch ($ext) {
          ".html" { $contentType = "text/html; charset=utf-8" }
          ".js"   { $contentType = "application/javascript; charset=utf-8" }
          ".css"  { $contentType = "text/css; charset=utf-8" }
          ".json" { $contentType = "application/json; charset=utf-8" }
          ".png"  { $contentType = "image/png" }
          ".jpg"  { $contentType = "image/jpeg" }
          ".jpeg" { $contentType = "image/jpeg" }
          ".svg"   { $contentType = "image/svg+xml" }
          ".ico"   { $contentType = "image/x-icon" }
          ".ttf"   { $contentType = "font/ttf" }
          ".woff"  { $contentType = "font/woff" }
          ".woff2" { $contentType = "font/woff2" }
        }
        $response.ContentType = $contentType
        $response.Headers.Add("Cache-Control", "no-cache, no-store, must-revalidate")
        $response.Headers.Add("Pragma", "no-cache")
        $response.Headers.Add("Expires", "0")
        $response.Headers.Add("Access-Control-Allow-Origin", "*")
        $response.OutputStream.Write($bytes, 0, $bytes.Length)
      } else {
        $response.StatusCode = 404
        $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
        $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
      }
    } catch {
      Write-Host "Error respondiendo petición: $_"
    } finally {
      try { $response.Close() } catch {}
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
