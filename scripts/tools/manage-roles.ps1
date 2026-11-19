# Helper script to manage Firestore roles and users directly via Google Cloud REST API using serviceAccountKey.json

function Get-GoogleAccessToken {
  $saPath = Join-Path $PSScriptRoot "..\serviceAccountKey.json"
  if (-not (Test-Path $saPath)) {
    $saPath = Join-Path $PSScriptRoot "..\..\scripts\serviceAccountKey.json"
  }
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

# 1. Update all agebre-ebr documents to role = 'admin'
$rolesUrl = "https://firestore.googleapis.com/v1/projects/sistematizacion-fichas/databases/(default)/documents/roles"
$rolesRes = Invoke-RestMethod -Uri $rolesUrl -Headers $headers -Method Get

foreach ($doc in $rolesRes.documents) {
  $id = $doc.name.Split('/')[-1]
  $email = $doc.fields.email.stringValue
  
  if ($email -eq 'agebre-ebr@ugel03.gob.pe') {
    Write-Host "Promoting $email ($id) to role 'admin'..."
    $patchUrl = "$($doc.name)?updateMask.fieldPaths=role&updateMask.fieldPaths=userType"
    $body = @{
      fields = @{
        role = @{ stringValue = "admin" }
        userType = @{ stringValue = "coordinador" }
      }
    } | ConvertTo-Json -Depth 5
    Invoke-RestMethod -Uri $patchUrl -Headers $headers -Method Patch -Body $body -ContentType "application/json" | Out-Null
    Write-Host "Successfully promoted $id to admin."
  }
}

# 2. Delete ejemplo123@gmail.com if present
$ejemploDoc = $rolesRes.documents | Where-Object { $_.fields.email.stringValue -eq 'ejemplo123@gmail.com' }
if ($ejemploDoc) {
  $delId = $ejemploDoc.name.Split('/')[-1]
  Write-Host "Deleting test user ejemplo123@gmail.com ($delId)..."
  Invoke-RestMethod -Uri $ejemploDoc.name -Headers $headers -Method Delete | Out-Null
  Write-Host "Successfully deleted ejemplo123@gmail.com."
}

# 3. Print updated roles
Write-Host "`n--- Updated Roles in Firestore ---"
$rolesRes = Invoke-RestMethod -Uri $rolesUrl -Headers $headers -Method Get
$rolesRes.documents | ForEach-Object {
  $id = $_.name.Split('/')[-1]
  $fields = $_.fields
  [PSCustomObject]@{
    ID = $id
    Email = $fields.email.stringValue
    Role = $fields.role.stringValue
    UserType = $fields.userType.stringValue
  }
} | Format-Table -AutoSize
