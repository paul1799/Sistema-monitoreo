# Helper to perform Firebase Auth and Firestore queries via Google APIs
function Get-GoogleAccessToken {
  $saPath = (Resolve-Path "scripts\serviceAccountKey.json").Path
  $sa = Get-Content -Raw $saPath | ConvertFrom-Json

  $base64 = $sa.private_key -replace '-----BEGIN PRIVATE KEY-----', '' -replace '-----END PRIVATE KEY-----', '' -replace '\s+', ''
  $der = [Convert]::FromBase64String($base64)

  $oid = [byte[]]@(0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01)
  $oidIdx = -1
  for ($i = 0; $i -lt $der.Length - 10; $i++) {
    $match = $true
    for ($j = 0; $j -lt $oid.Length; $j++) {
      if ($der[$i + $j] -ne $oid[$j]) { $match = $false; break }
    }
    if ($match) { $oidIdx = $i; break }
  }
  $octetIdx = $oidIdx + $oid.Length + 2
  while ($octetIdx -lt $der.Length - 4 -and $der[$octetIdx] -ne 0x04) { $octetIdx++ }
  $octetIdx++
  $len = $der[$octetIdx]
  if ($len -band 0x80) {
    $numBytes = $len -band 0x7F
    $octetIdx += $numBytes + 1
  } else {
    $octetIdx++
  }
  $rsaDer = New-Object byte[] ($der.Length - $octetIdx)
  [Array]::Copy($der, $octetIdx, $rsaDer, 0, $rsaDer.Length)

  $ms = New-Object System.IO.MemoryStream(,$rsaDer)
  $br = New-Object System.IO.BinaryReader($ms)

  function ReadAsnInteger($br) {
    $tag = $br.ReadByte()
    if ($tag -ne 0x02) { throw "Expected INTEGER tag 0x02, got $tag" }
    $len = $br.ReadByte()
    if ($len -band 0x80) {
      $num = $len -band 0x7F
      $lenBytes = $br.ReadBytes($num)
      $len = 0
      foreach ($b in $lenBytes) { $len = ($len -shl 8) + $b }
    }
    $bytes = $br.ReadBytes($len)
    if ($bytes.Length -gt 0 -and $bytes[0] -eq 0) {
      $trimmed = New-Object byte[] ($bytes.Length - 1)
      [Array]::Copy($bytes, 1, $trimmed, 0, $trimmed.Length)
      return $trimmed
    }
    return $bytes
  }

  $seqTag = $br.ReadByte()
  $seqLen = $br.ReadByte()
  if ($seqLen -band 0x80) { $br.ReadBytes($seqLen -band 0x7F) | Out-Null }

  $params = New-Object System.Security.Cryptography.RSAParameters
  $version = ReadAsnInteger $br
  $params.Modulus = ReadAsnInteger $br
  $params.Exponent = ReadAsnInteger $br
  $params.D = ReadAsnInteger $br
  $params.P = ReadAsnInteger $br
  $params.Q = ReadAsnInteger $br
  $params.DP = ReadAsnInteger $br
  $params.DQ = ReadAsnInteger $br
  $params.InverseQ = ReadAsnInteger $br

  $csp = New-Object System.Security.Cryptography.RSACryptoServiceProvider
  $csp.ImportParameters($params)

  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $exp = $now + 3600

  $header = @{ alg = "RS256"; typ = "JWT" } | ConvertTo-Json -Compress
  $claim = @{
    iss = $sa.client_email
    scope = "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit"
    aud = "https://oauth2.googleapis.com/token"
    iat = $now
    exp = $exp
  } | ConvertTo-Json -Compress

  function Base64UrlEncode($bytes) {
    return [Convert]::ToBase64String($bytes).Replace('+', '-').Replace('/', '_').TrimEnd('=')
  }

  $hB64 = Base64UrlEncode([System.Text.Encoding]::UTF8.GetBytes($header))
  $cB64 = Base64UrlEncode([System.Text.Encoding]::UTF8.GetBytes($claim))
  $payload = "$hB64.$cB64"
  $sigBytes = $csp.SignData([System.Text.Encoding]::UTF8.GetBytes($payload), [System.Security.Cryptography.CryptoConfig]::MapNameToOID("SHA256"))
  $sigB64 = Base64UrlEncode($sigBytes)
  $jwt = "$payload.$sigB64"

  $tokenRes = Invoke-RestMethod -Uri "https://oauth2.googleapis.com/token" -Method Post -Body @{
    grant_type = "urn:ietf:params:oauth:grant-type:jwt-bearer"
    assertion = $jwt
  }
  return $tokenRes.access_token
}

$token = Get-GoogleAccessToken
$headers = @{ Authorization = "Bearer $token" }

Write-Host "=== FIRESTORE ROLES ==="
$rolesUrl = "https://firestore.googleapis.com/v1/projects/sistematizacion-fichas/databases/(default)/documents/roles"
$rolesRes = Invoke-RestMethod -Uri $rolesUrl -Headers $headers -Method Get
foreach ($doc in $rolesRes.documents) {
  $id = $doc.name.Split('/')[-1]
  $fields = $doc.fields
  $reisArr = @()
  if ($fields.reis.arrayValue.values) {
    $reisArr = $fields.reis.arrayValue.values | ForEach-Object { $_.stringValue }
  }
  Write-Host "ID: $id | Email: $($fields.email.stringValue) | Role: $($fields.role.stringValue) | UserType: $($fields.userType.stringValue) | Mod: $($fields.modalidad.stringValue) | Reis: $($reisArr -join ',') | Verif: $($fields.estadoVerificacion.stringValue) | Creado: $($fields.createdAt.integerValue)"
}

Write-Host "`n=== FIREBASE AUTH USERS ==="
$authUrl = "https://identitytoolkit.googleapis.com/v1/projects/sistematizacion-fichas/accounts:batchGet?maxResults=50"
$authRes = Invoke-RestMethod -Uri $authUrl -Headers $headers -Method Post -Body (@{ maxResults = 50 } | ConvertTo-Json) -ContentType "application/json"
foreach ($u in $authRes.users) {
  Write-Host "UID: $($u.localId) | Email: $($u.email) | DisplayName: $($u.displayName)"
}
