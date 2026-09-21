# scripts/serve.ps1 - Servidor estatico HTTP en PowerShell puro
param (
  [int]$Port = 8089
)

$root = (Resolve-Path (Join-Path $PSScriptRoot "..\public")).Path
$prefix = "http://localhost:$Port/"

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
  Write-Host "Servidor escuchando en $prefix (raiz: $root)"
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
    if ([string]::IsNullOrWhiteSpace($rawPath)) { $rawPath = "index.html" }
    $filePath = Join-Path $root ($rawPath -replace '/', '\')
    
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
        ".svg"  { $contentType = "image/svg+xml" }
      }
      $response.ContentType = $contentType
      $response.ContentLength64 = $bytes.Length
      $response.Headers.Add("Access-Control-Allow-Origin", "*")
      $response.OutputStream.Write($bytes, 0, $bytes.Length)
    } else {
      $response.StatusCode = 404
      $notFoundBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
      $response.ContentLength64 = $notFoundBytes.Length
      $response.OutputStream.Write($notFoundBytes, 0, $notFoundBytes.Length)
    }
    $response.Close()
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
