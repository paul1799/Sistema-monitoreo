Add-Type -AssemblyName System.IO.Compression.FileSystem

$zipPath = (Resolve-Path "docs\muestras\MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC_MUESTRA.xlsx").Path
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, [System.IO.Compression.ZipArchiveMode]::Update)

# 1. Update sharedStrings if needed (Nviel -> Nivel, II. DATOS DE LOS SUB DIRECTORES -> III. DATOS DEL SUB DIRECTOR(A))
$sstEntry = $zip.GetEntry('xl/sharedStrings.xml')
$sstStream = $sstEntry.Open()
$sstReader = [System.IO.StreamReader]::new($sstStream)
$sstContent = $sstReader.ReadToEnd()
$sstStream.Dispose()

$sstContent = $sstContent -replace 'Nviel por IIEE', 'Nivel por IIEE'
$sstContent = $sstContent -replace 'II\. DATOS DE LOS SUB DIRECTORES', 'III. DATOS DEL SUB DIRECTOR(A)'
$sstContent = $sstContent -replace 'II\. DATOS DEL SUB DIRECTOR', 'III. DATOS DEL SUB DIRECTOR'

$sstEntry.Delete()
$newSstEntry = $zip.CreateEntry('xl/sharedStrings.xml')
$newSstStream = $newSstEntry.Open()
$sstWriter = [System.IO.StreamWriter]::new($newSstStream)
$sstWriter.Write($sstContent)
$sstWriter.Flush()
$newSstStream.Dispose()

# 2. Update sheet1.xml (Correcciones de fórmulas y rangos)
$sheet1Entry = $zip.GetEntry('xl/worksheets/sheet1.xml')
$sheet1Stream = $sheet1Entry.Open()
$sheet1Reader = [System.IO.StreamReader]::new($sheet1Stream)
$sheet1Content = $sheet1Reader.ReadToEnd()
$sheet1Stream.Dispose()

# Corregir fórmulas desplazadas en AK y AL
$sheet1Content = $sheet1Content -replace 'AK5:AK33', 'AK4:AK32'
$sheet1Content = $sheet1Content -replace 'AK6:AK34', 'AK4:AK32'
$sheet1Content = $sheet1Content -replace 'AL5:AL33', 'AL4:AL32'
$sheet1Content = $sheet1Content -replace 'AL6:AL34', 'AL4:AL32'

# Corregir fórmulas de RESULTADO en CC y CD
$sheet1Content = $sheet1Content -replace 'COUNTIF\(\$BW\$4:\$BW\$33,"INICIO"\)', 'COUNTIF($BW$4:$BW$32,"INICIO")'
$sheet1Content = $sheet1Content -replace 'COUNTIF\(\$BW\$4:\$BW\$33,"PROCESO"\)', 'COUNTIF($BW$4:$BW$32,"PROCESO")'
$sheet1Content = $sheet1Content -replace 'COUNTIF\(\$BW\$4:\$BW\$33,"LOGRADO"\)', 'COUNTIF($BW$4:$BW$32,"LOGRADO")'

$sheet1Content = $sheet1Content -replace 'CC6/COUNTA\(\$BW\$4:\$BW\$32\)', 'IFERROR(CC6/SUM($CC$6:$CC$8),0)'
$sheet1Content = $sheet1Content -replace 'CC7/COUNTA\(\$BW\$4:\$BW\$32\)', 'IFERROR(CC7/SUM($CC$6:$CC$8),0)'
$sheet1Content = $sheet1Content -replace 'CC8/COUNTA\(\$BW\$4:\$BW\$32\)', 'IFERROR(CC8/SUM($CC$6:$CC$8),0)'

# Corregir validación en columna J (extender a J4:J32)
$sheet1Content = $sheet1Content -replace 'sqref="J4"', 'sqref="J4:J32"'

$sheet1Entry.Delete()
$newSheet1Entry = $zip.CreateEntry('xl/worksheets/sheet1.xml')
$newSheet1Stream = $newSheet1Entry.Open()
$sheet1Writer = [System.IO.StreamWriter]::new($newSheet1Stream)
$sheet1Writer.Write($sheet1Content)
$sheet1Writer.Flush()
$newSheet1Stream.Dispose()

$zip.Dispose()
Write-Host "Muestra 1 (MODELO JEC) actualizada con éxito." -ForegroundColor Green
