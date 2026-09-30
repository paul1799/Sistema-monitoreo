Add-Type -AssemblyName System.IO.Compression.FileSystem

$plantillaFile = (Resolve-Path "docs\plantillas\MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC.xlsx").Path
$outputDir = (Resolve-Path "docs\muestras").Path

# =========================================================================
# MUESTRA 1: MODELO JEC (Con correcciones de fórmulas, textos y rangos)
# =========================================================================
$temp1 = Join-Path $env:TEMP "jec_sample1"
if (Test-Path $temp1) { Remove-Item $temp1 -Recurse -Force }
[System.IO.Compression.ZipFile]::ExtractToDirectory($plantillaFile, $temp1)

# Corregir sharedStrings
$sstFile = Join-Path $temp1 "xl\sharedStrings.xml"
$sstText = [System.IO.File]::ReadAllText($sstFile, [System.Text.Encoding]::UTF8)
$sstText = $sstText -replace 'Nviel por IIEE', 'Nivel por IIEE'
$sstText = $sstText -replace 'II\. DATOS DE LOS SUB DIRECTORES', 'III. DATOS DEL SUB DIRECTOR(A)'
[System.IO.File]::WriteAllText($sstFile, $sstText, [System.Text.Encoding]::UTF8)

# Corregir sheet1.xml
$sheet1File = Join-Path $temp1 "xl\worksheets\sheet1.xml"
$s1Text = [System.IO.File]::ReadAllText($sheet1File, [System.Text.Encoding]::UTF8)
$s1Text = $s1Text -replace 'AK5:AK33', 'AK4:AK32'
$s1Text = $s1Text -replace 'AK6:AK34', 'AK4:AK32'
$s1Text = $s1Text -replace 'AL5:AL33', 'AL4:AL32'
$s1Text = $s1Text -replace 'AL6:AL34', 'AL4:AL32'
$s1Text = $s1Text -replace 'COUNTIF\(\$BW\$4:\$BW\$33,"INICIO"\)', 'COUNTIF($BW$4:$BW$32,"INICIO")'
$s1Text = $s1Text -replace 'COUNTIF\(\$BW\$4:\$BW\$33,"PROCESO"\)', 'COUNTIF($BW$4:$BW$32,"PROCESO")'
$s1Text = $s1Text -replace 'COUNTIF\(\$BW\$4:\$BW\$33,"LOGRADO"\)', 'COUNTIF($BW$4:$BW$32,"LOGRADO")'
$s1Text = $s1Text -replace 'CC6/COUNTA\(\$BW\$4:\$BW\$32\)', 'IFERROR(CC6/SUM($CC$6:$CC$8),0)'
$s1Text = $s1Text -replace 'CC7/COUNTA\(\$BW\$4:\$BW\$32\)', 'IFERROR(CC7/SUM($CC$6:$CC$8),0)'
$s1Text = $s1Text -replace 'CC8/COUNTA\(\$BW\$4:\$BW\$32\)', 'IFERROR(CC8/SUM($CC$6:$CC$8),0)'
$s1Text = $s1Text -replace 'sqref="J4"', 'sqref="J4:J32"'

# Inyectar reglas de formato condicional en columna BW si no están
if (-not ($s1Text -match 'conditionalFormatting')) {
  $cfXml = '<conditionalFormatting sqref="BW4:BW32"><cfRule type="cellIs" operator="equal" dxfId="0" priority="1"><formula>"LOGRADO"</formula></cfRule><cfRule type="cellIs" operator="equal" dxfId="1" priority="2"><formula>"PROCESO"</formula></cfRule><cfRule type="cellIs" operator="equal" dxfId="2" priority="3"><formula>"INICIO"</formula></cfRule></conditionalFormatting></worksheet>'
  $s1Text = $s1Text -replace '</worksheet>', $cfXml
}
[System.IO.File]::WriteAllText($sheet1File, $s1Text, [System.Text.Encoding]::UTF8)

$out1 = Join-Path $outputDir "MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC_MUESTRA.xlsx"
if (Test-Path $out1) { Remove-Item $out1 -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($temp1, $out1)
Remove-Item $temp1 -Recurse -Force
Write-Host "Muestra 1 creada: $out1" -ForegroundColor Green

# =========================================================================
# MUESTRA 2: COORD. TUTORIA JEC
# =========================================================================
$temp2 = Join-Path $env:TEMP "jec_sample2"
if (Test-Path $temp2) { Remove-Item $temp2 -Recurse -Force }
[System.IO.Compression.ZipFile]::ExtractToDirectory($plantillaFile, $temp2)

# Cambiar nombre de la hoja en workbook.xml
$wbFile2 = Join-Path $temp2 "xl\workbook.xml"
$wbText2 = [System.IO.File]::ReadAllText($wbFile2, [System.Text.Encoding]::UTF8)
$wbText2 = $wbText2 -replace 'name="MODELO JEC"', 'name="COORD. TUTORIA JEC"'
[System.IO.File]::WriteAllText($wbFile2, $wbText2, [System.Text.Encoding]::UTF8)

# Actualizar título en sharedStrings
$sstFile2 = Join-Path $temp2 "xl\sharedStrings.xml"
$sstText2 = [System.IO.File]::ReadAllText($sstFile2, [System.Text.Encoding]::UTF8)
$sstText2 = $sstText2 -replace 'Nviel por IIEE', 'Nivel por IIEE'
$sstText2 = $sstText2 -replace 'II\. DATOS DE LOS SUB DIRECTORES', 'III. DATOS DEL COORDINADOR(A) DE TUTORÍA'
$sstText2 = $sstText2 -replace 'DATOS DEL SUB DIRECTOR', 'DATOS DEL COORDINADOR(A) DE TUTORÍA'
[System.IO.File]::WriteAllText($sstFile2, $sstText2, [System.Text.Encoding]::UTF8)

$out2 = Join-Path $outputDir "MATRIZ_DE_SEGUIMIENTO_2026_COORD_TUTORIA_JEC_MUESTRA.xlsx"
if (Test-Path $out2) { Remove-Item $out2 -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($temp2, $out2)
Remove-Item $temp2 -Recurse -Force
Write-Host "Muestra 2 creada: $out2" -ForegroundColor Green

# =========================================================================
# MUESTRA 3: COORD. PEDAGOGICO
# =========================================================================
$temp3 = Join-Path $env:TEMP "jec_sample3"
if (Test-Path $temp3) { Remove-Item $temp3 -Recurse -Force }
[System.IO.Compression.ZipFile]::ExtractToDirectory($plantillaFile, $temp3)

# Cambiar nombre de la hoja en workbook.xml
$wbFile3 = Join-Path $temp3 "xl\workbook.xml"
$wbText3 = [System.IO.File]::ReadAllText($wbFile3, [System.Text.Encoding]::UTF8)
$wbText3 = $wbText3 -replace 'name="MODELO JEC"', 'name="COORD. PEDAGOGICO"'
[System.IO.File]::WriteAllText($wbFile3, $wbText3, [System.Text.Encoding]::UTF8)

# Actualizar título en sharedStrings
$sstFile3 = Join-Path $temp3 "xl\sharedStrings.xml"
$sstText3 = [System.IO.File]::ReadAllText($sstFile3, [System.Text.Encoding]::UTF8)
$sstText3 = $sstText3 -replace 'Nviel por IIEE', 'Nivel por IIEE'
$sstText3 = $sstText3 -replace 'II\. DATOS DE LOS SUB DIRECTORES', 'III. DATOS DEL COORDINADOR(A) PEDAGÓGICO'
$sstText3 = $sstText3 -replace 'DATOS DEL SUB DIRECTOR', 'DATOS DEL COORDINADOR(A) PEDAGÓGICO'
[System.IO.File]::WriteAllText($sstFile3, $sstText3, [System.Text.Encoding]::UTF8)

$out3 = Join-Path $outputDir "MATRIZ_DE_SEGUIMIENTO_2026_COORD_PEDAGOGICO_MUESTRA.xlsx"
if (Test-Path $out3) { Remove-Item $out3 -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($temp3, $out3)
Remove-Item $temp3 -Recurse -Force
Write-Host "Muestra 3 creada: $out3" -ForegroundColor Green

Write-Host "Todas las muestras generadas correctamente en $outputDir" -ForegroundColor Cyan
