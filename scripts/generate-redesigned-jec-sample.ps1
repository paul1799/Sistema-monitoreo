# scripts/generate-redesigned-jec-sample.ps1
# Genera docs/muestras/MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC_2026-09-30.xlsx
# Con la estructura REAL de la ficha del sistema (3 componentes, 31 indicadores, SI/NO/NA, dos registros reales)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function colToLetter([int]$col) {
  $letter = ""
  while ($col -gt 0) {
    $mod = ($col - 1) % 26
    $letter = [char](65 + $mod) + $letter
    $col = [int][Math]::Floor(($col - $mod) / 26)
  }
  return $letter
}

$plantillaFile = (Resolve-Path "docs\plantillas\MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC.xlsx").Path
$outputDir = (Resolve-Path "docs\muestras").Path
$outFile = Join-Path $outputDir "MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC_2026-09-30.xlsx"
$outMuestra = Join-Path $outputDir "MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC_MUESTRA.xlsx"

$tempDir = Join-Path $env:TEMP "jec_redesign_$(Get-Random)"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
[System.IO.Compression.ZipFile]::ExtractToDirectory($plantillaFile, $tempDir)

Write-Host "Plantilla extraída en $tempDir" -ForegroundColor Cyan

# Definición de indicadores oficiales (3 componentes = 31 indicadores)
$indicadores = @(
  # Componente Pedagógico (9) - Cols X (24) a AF (32)
  @{ Col = "X"; Num = 1; Comp = "pedag"; Texto = "1. La IE cuenta con un Plan Tutorial de Aula (PTA) articulado al PAT y al PCI, considerando el diagnóstico socioemocional y las necesidades de orientación de los y las estudiantes." },
  @{ Col = "Y"; Num = 2; Comp = "pedag"; Texto = "2. El/la docente tutor/a implementa sesiones de tutoría grupal planificadas en el PTA, utilizando metodologías activas y participativas." },
  @{ Col = "Z"; Num = 3; Comp = "pedag"; Texto = "3. El/la docente tutor/a brinda orientación y acompañamiento individual a estudiantes que lo requieren o a solicitud propia." },
  @{ Col = "AA"; Num = 4; Comp = "pedag"; Texto = "4. El/la docente tutor/a mantiene comunicación regular con las familias para informar y coordinar acciones sobre el desarrollo y bienestar de sus hijos/as." },
  @{ Col = "AB"; Num = 5; Comp = "pedag"; Texto = "5. La IE promueve espacios de participación estudiantil (Municipio Escolar, Consejos Estudiantiles) articulados a la tutoría." },
  @{ Col = "AC"; Num = 6; Comp = "pedag"; Texto = "6. La IE cuenta con acuerdos o normas de convivencia consensuadas, difundidas y aplicadas oportunamente." },
  @{ Col = "AD"; Num = 7; Comp = "pedag"; Texto = "7. La IE cuenta con un plan de trabajo del Comité de Gestión del Bienestar aprobado y en ejecución." },
  @{ Col = "AE"; Num = 8; Comp = "pedag"; Texto = "8. La IE implementa acciones de prevención de la violencia escolar conforme a los protocolos vigentes." },
  @{ Col = "AF"; Num = 9; Comp = "pedag"; Texto = "9. La IE atiende y registra oportunamente los casos de violencia escolar en el portal SíseVe." },
  
  # Componente de Gestión (11) - Cols AH (34) a AR (44)
  @{ Col = "AH"; Num = 10; Comp = "gest"; Texto = "10. La IE cuenta con los Instrumentos de Gestión (PEI, PAT, PCI, RI) actualizados y alineados a la propuesta pedagógica del modelo JEC." },
  @{ Col = "AI"; Num = 11; Comp = "gest"; Texto = "11. El equipo directivo realiza el monitoreo y acompañamiento pedagógico a la totalidad de docentes según el cronograma establecido en el PAT." },
  @{ Col = "AJ"; Num = 12; Comp = "gest"; Texto = "12. La IE promueve el desarrollo de reuniones de trabajo colegiado para el fortalecimiento de la práctica pedagógica docente." },
  @{ Col = "AK"; Num = 13; Comp = "gest"; Texto = "13. La IE implementa espacios de interaprendizaje docente (GIA, pasantías o círculos de interaprendizaje) para la mejora de los aprendizajes." },
  @{ Col = "AL"; Num = 14; Comp = "gest"; Texto = "14. La IE organiza y optimiza la jornada escolar completa de 45 horas pedagógicas semanales, garantizando el cumplimiento de las horas efectivas de clase." },
  @{ Col = "AM"; Num = 15; Comp = "gest"; Texto = "15. La IE implementa estrategias institucionales de refuerzo escolar para estudiantes con necesidades de aprendizaje en áreas priorizadas." },
  @{ Col = "AN"; Num = 16; Comp = "gest"; Texto = "16. La IE gestiona y asigna oportunamente los recursos y materiales educativos proporcionados por el MINEDU." },
  @{ Col = "AO"; Num = 17; Comp = "gest"; Texto = "17. El equipo directivo lidera la autoevaluación institucional y la rendición de cuentas a la comunidad educativa." },
  @{ Col = "AP"; Num = 18; Comp = "gest"; Texto = "18. La IE promueve la participación activa de los padres y madres de familia a través de la APAFA y comités de aula en la gestión escolar." },
  @{ Col = "AQ"; Num = 19; Comp = "gest"; Texto = "19. La IE gestiona alianzas estratégicas interinstitucionales (salud, policía, gobierno local) para fortalecer el servicio educativo." },
  @{ Col = "AR"; Num = 20; Comp = "gest"; Texto = "20. La IE cuenta con un plan de gestión del riesgo de desastres actualizado, implementando simulacros y acciones de prevención." },

  # Componente de Soporte (11) - Cols AT (46) a BD (56)
  @{ Col = "AT"; Num = 21; Comp = "sop"; Texto = "21. La IE cuenta con los ambientes pedagógicos (aulas funcionales, laboratorios, talleres) implementados y en funcionamiento para el modelo JEC." },
  @{ Col = "AU"; Num = 22; Comp = "sop"; Texto = "22. La IE dispone de equipamiento tecnológico operativo (computadoras, proyectores, laptops) asignado a los ambientes de aprendizaje." },
  @{ Col = "AV"; Num = 23; Comp = "sop"; Texto = "23. La IE garantiza la conectividad a internet en las aulas de innovación pedagógica (AIP) y áreas administrativas." },
  @{ Col = "AW"; Num = 24; Comp = "sop"; Texto = "24. El Coordinador de Innovación y Soporte Tecnológico (CIST) brinda asistencia técnica y pedagógica oportuna a docentes y directivos." },
  @{ Col = "AX"; Num = 25; Comp = "sop"; Texto = "25. La IE implementa medidas de seguridad y mantenimiento preventivo para la preservación de los recursos tecnológicos y pedagógicos." },
  @{ Col = "AY"; Num = 26; Comp = "sop"; Texto = "26. La IE garantiza el acceso y uso pedagógico de plataformas educativas digitales y recursos TIC en las sesiones de aprendizaje." },
  @{ Col = "AZ"; Num = 27; Comp = "sop"; Texto = "27. Los ambientes destinados al bienestar estudiantil (tópico, espacios de psicología, comedor) se encuentran habilitados y en funcionamiento." },
  @{ Col = "BA"; Num = 28; Comp = "sop"; Texto = "28. La IE gestiona el mantenimiento de la infraestructura física básica (servicios higiénicos, agua, electricidad) asegurando condiciones de salubridad." },
  @{ Col = "BB"; Num = 29; Comp = "sop"; Texto = "29. La IE cuenta con el personal de soporte contratado y desempeñando sus funciones según su perfil (CIST, psicólogo/a, vigilante, personal de mantenimiento)." },
  @{ Col = "BC"; Num = 30; Comp = "sop"; Texto = "30. La IE promueve el uso eficiente de los recursos y materiales de apoyo socioemocional entregados para el bienestar de los estudiantes." },
  @{ Col = "BD"; Num = 31; Comp = "sop"; Texto = "31. La IE coordina con el programa de alimentación escolar u otras iniciativas para garantizar el servicio de refrigerio/almuerzo escolar." }
)

# Actualizar xl/charts/chart1.xml para apuntar al cuadro RESULTADO en BN6:BN8 y BP6:BP8
$chartFile = Join-Path $tempDir "xl\charts\chart1.xml"
if (Test-Path $chartFile) {
  $chartXml = [System.IO.File]::ReadAllText($chartFile, [System.Text.Encoding]::UTF8)
  $chartXml = $chartXml -replace "'MODELO JEC'!\`$[A-Z]+\`$6:\`$[A-Z]+\`$8", "'MODELO JEC'!`$BP`$6:`$BP`$8"
  $chartXml = $chartXml -replace '<c:f>''MODELO JEC''!\`$[A-Z]+\`$[0-9]+:\`$[A-Z]+\`$[0-9]+</c:f>', '<c:f>''MODELO JEC''!$BP$6:$BP$8</c:f>'
  # Modificar referencias de categorías a BN6:BN8 y valores a BP6:BP8
  $chartXml = $chartXml -replace '(\<c:cat\>.*?\<c:f\>).*?(\</c:f\>)', ('$1''MODELO JEC''!$BN$6:$BN$8$2')
  $chartXml = $chartXml -replace '(\<c:val\>.*?\<c:f\>).*?(\</c:f\>)', ('$1''MODELO JEC''!$BP$6:$BP$8$2')
  [System.IO.File]::WriteAllText($chartFile, $chartXml, [System.Text.Encoding]::UTF8)
  Write-Host "xl/charts/chart1.xml actualizado a BN6:BN8 y BP6:BP8" -ForegroundColor Green
}

# Actualizar xl/drawings/drawing1.xml para anclar la dona debajo de los cuadros (col 65 BN a 71 BT, filas 16 a 29)
$drawingFile = Join-Path $tempDir "xl\drawings\drawing1.xml"
if (Test-Path $drawingFile) {
  $drawXml = [System.IO.File]::ReadAllText($drawingFile, [System.Text.Encoding]::UTF8)
  $drawXml = $drawXml -replace '<xdr:col>[0-9]+</xdr:col><xdr:colOff>[0-9]+</xdr:colOff><xdr:row>[0-9]+</xdr:row>', '<xdr:col>65</xdr:col><xdr:colOff>100000</xdr:colOff><xdr:row>16</xdr:row>'
  $drawXml = $drawXml -replace '<xdr:to><xdr:col>[0-9]+</xdr:col><xdr:colOff>[0-9]+</xdr:colOff><xdr:row>[0-9]+</xdr:row>', '<xdr:to><xdr:col>72</xdr:col><xdr:colOff>350000</xdr:colOff><xdr:row>30</xdr:row>'
  [System.IO.File]::WriteAllText($drawingFile, $drawXml, [System.Text.Encoding]::UTF8)
  Write-Host "xl/drawings/drawing1.xml actualizado a columnas BN:BT" -ForegroundColor Green
}

# Generar nuevo sheet1.xml (MODELO JEC)
$s1File = Join-Path $tempDir "xl\worksheets\sheet1.xml"

# Construir XML de sheet1
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>')
[void]$sb.AppendLine('<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" mc:Ignorable="x14ac" xmlns:x14ac="http://schemas.microsoft.com/office/spreadsheetml/2009/9/ac">')
[void]$sb.AppendLine('  <sheetPr><tabColor theme="8" tint="0.79998168889431442"/></sheetPr>')
[void]$sb.AppendLine('  <dimension ref="A1:BP14"/>')
[void]$sb.AppendLine('  <sheetViews>')
[void]$sb.AppendLine('    <sheetView tabSelected="1" zoomScale="70" zoomScaleNormal="70" workbookViewId="0">')
[void]$sb.AppendLine('      <pane ySplit="3" topLeftCell="A4" activePane="bottomLeft" state="frozen"/>')
[void]$sb.AppendLine('      <selection pane="bottomLeft" activeCell="A4" sqref="A4"/>')
[void]$sb.AppendLine('    </sheetView>')
[void]$sb.AppendLine('  </sheetViews>')
[void]$sb.AppendLine('  <sheetFormatPr defaultRowHeight="15" x14ac:dyDescent="0.25"/>')

# Anchos de columnas
[void]$sb.AppendLine('  <cols>')
[void]$sb.AppendLine('    <col min="1" max="1" width="5.5" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="2" max="2" width="38" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="3" max="3" width="13" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="4" max="4" width="11" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="5" max="5" width="10" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="6" max="6" width="13" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="7" max="12" width="11" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="13" max="13" width="35" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="14" max="14" width="13" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="15" max="15" width="13" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="16" max="16" width="16" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="17" max="17" width="28" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="18" max="18" width="35" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="19" max="19" width="13" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="20" max="20" width="13" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="21" max="21" width="16" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="22" max="22" width="28" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="23" max="23" width="4" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="24" max="32" width="7" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="33" max="33" width="16" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="34" max="44" width="7" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="45" max="45" width="16" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="46" max="56" width="7" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="57" max="57" width="16" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="58" max="58" width="45" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="59" max="59" width="45" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="60" max="60" width="18" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="61" max="61" width="22" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="62" max="65" width="4" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="66" max="66" width="26" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="67" max="67" width="12" customWidth="1"/>')
[void]$sb.AppendLine('    <col min="68" max="68" width="12" customWidth="1"/>')
[void]$sb.AppendLine('  </cols>')

[void]$sb.AppendLine('  <sheetData>')

# Fila 1: Títulos de Bloques y Componentes
[void]$sb.Append('    <row r="1" ht="30" customHeight="1">')
[void]$sb.Append('<c r="A1" s="116" t="inlineStr"><is><t>I. DATOS GENERALES DE LA IE</t></is></c>')
for ($c = 2; $c -le 12; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)1"" s=""116""/>") }
[void]$sb.Append('<c r="M1" s="118" t="inlineStr"><is><t>II. DATOS DEL DIRECTOR(A)</t></is></c>')
for ($c = 14; $c -le 17; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)1"" s=""118""/>") }
[void]$sb.Append('<c r="R1" s="122" t="inlineStr"><is><t>III. DATOS DEL SUB DIRECTOR(A)</t></is></c>')
for ($c = 19; $c -le 22; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)1"" s=""122""/>") }
[void]$sb.Append('<c r="W1" s="62"/>')
# Pedagógico
[void]$sb.Append('<c r="X1" s="143" t="inlineStr"><is><t>Componente pedagógico (Implementación TOECE)</t></is></c>')
for ($c = 25; $c -le 32; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)1"" s=""143""/>") }
[void]$sb.Append('<c r="AG1" s="149" t="inlineStr"><is><t>% CUMPLIMIENTO</t></is></c>')
# Gestión
[void]$sb.Append('<c r="AH1" s="144" t="inlineStr"><is><t>Componente de gestión</t></is></c>')
for ($c = 35; $c -le 44; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)1"" s=""144""/>") }
[void]$sb.Append('<c r="AS1" s="146" t="inlineStr"><is><t>% CUMPLIMIENTO</t></is></c>')
# Soporte
[void]$sb.Append('<c r="AT1" s="145" t="inlineStr"><is><t>Componente de soporte</t></is></c>')
for ($c = 47; $c -le 56; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)1"" s=""145""/>") }
[void]$sb.Append('<c r="BE1" s="133" t="inlineStr"><is><t>% CUMPLIMIENTO</t></is></c>')
# Finales
[void]$sb.Append('<c r="BF1" s="112" t="inlineStr"><is><t>OBSERVACIONES / RECOMENDACIONES</t></is></c>')
[void]$sb.Append('<c r="BG1" s="112" t="inlineStr"><is><t>COMPROMISO</t></is></c>')
[void]$sb.Append('<c r="BH1" s="112" t="inlineStr"><is><t>% Cumplimiento General por IIEE</t></is></c>')
[void]$sb.Append('<c r="BI1" s="114" t="inlineStr"><is><t>Nivel de Implementación por IIEE</t></is></c>')
[void]$sb.AppendLine('</row>')

# Fila 2: Subencabezados y números de indicadores
[void]$sb.Append('    <row r="2" ht="30" customHeight="1">')
$hdr2 = @(
  @{ c = "A"; t = "N°"; s = 117 }, @{ c = "B"; t = "Institución Educativa"; s = 117 }, @{ c = "C"; t = "Cod. Modular"; s = 117 },
  @{ c = "D"; t = "UGEL"; s = 117 }, @{ c = "E"; t = "RED"; s = 117 }, @{ c = "F"; t = "Fecha"; s = 117 },
  @{ c = "G"; t = "Secciones"; s = 117 }, @{ c = "H"; t = "Estudiantes"; s = 117 }, @{ c = "I"; t = "Docentes"; s = 117 },
  @{ c = "J"; t = "SFT"; s = 117 }, @{ c = "K"; t = "C.P"; s = 117 }, @{ c = "L"; t = "C.T"; s = 117 },
  @{ c = "M"; t = "Nombres y Apellidos"; s = 120 }, @{ c = "N"; t = "DNI"; s = 120 }, @{ c = "O"; t = "Teléfono"; s = 120 },
  @{ c = "P"; t = "Condición"; s = 120 }, @{ c = "Q"; t = "Correo"; s = 120 },
  @{ c = "R"; t = "Nombres y Apellidos"; s = 124 }, @{ c = "S"; t = "DNI"; s = 124 }, @{ c = "T"; t = "Teléfono"; s = 124 },
  @{ c = "U"; t = "Condición"; s = 124 }, @{ c = "V"; t = "Correo"; s = 124 },
  @{ c = "W"; t = ""; s = 62 }
)
foreach ($h in $hdr2) {
  if ($h.t) { [void]$sb.Append("<c r=""$($h.c)2"" s=""$($h.s)"" t=""inlineStr""><is><t>$($h.t)</t></is></c>") }
  else { [void]$sb.Append("<c r=""$($h.c)2"" s=""$($h.s)""/>") }
}
foreach ($ind in $indicadores) {
  $s = if ($ind.Comp -eq "pedag") { 150 } elseif ($ind.Comp -eq "gest") { 147 } else { 134 }
  [void]$sb.Append("<c r=""$($ind.Col)2"" s=""$s""><v>$($ind.Num)</v></c>")
  if ($ind.Col -eq "AF") { [void]$sb.Append('<c r="AG2" s="149"/>') }
  if ($ind.Col -eq "AR") { [void]$sb.Append('<c r="AS2" s="146"/>') }
  if ($ind.Col -eq "BD") { [void]$sb.Append('<c r="BE2" s="133"/>') }
}
[void]$sb.Append('<c r="BF2" s="112"/><c r="BG2" s="112"/><c r="BH2" s="112"/><c r="BI2" s="114"/>')
[void]$sb.AppendLine('</row>')

# Fila 3: Textos completos de indicadores (ht="177.75", texto rotado)
[void]$sb.Append('    <row r="3" ht="177.75" customHeight="1">')
for ($c = 1; $c -le 12; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)3"" s=""117""/>") }
for ($c = 13; $c -le 17; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)3"" s=""120""/>") }
for ($c = 18; $c -le 22; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)3"" s=""124""/>") }
[void]$sb.Append('<c r="W3" s="62"/>')
foreach ($ind in $indicadores) {
  $s = if ($ind.Comp -eq "pedag") { 150 } elseif ($ind.Comp -eq "gest") { 147 } else { 134 }
  $esc = [System.Security.SecurityElement]::Escape($ind.Texto)
  [void]$sb.Append("<c r=""$($ind.Col)3"" s=""$s"" t=""inlineStr""><is><t>$esc</t></is></c>")
  if ($ind.Col -eq "AF") { [void]$sb.Append('<c r="AG3" s="149"/>') }
  if ($ind.Col -eq "AR") { [void]$sb.Append('<c r="AS3" s="146"/>') }
  if ($ind.Col -eq "BD") { [void]$sb.Append('<c r="BE3" s="133"/>') }
}
[void]$sb.Append('<c r="BF3" s="112"/><c r="BG3" s="112"/><c r="BH3" s="112"/><c r="BI3" s="114"/>')
[void]$sb.AppendLine('</row>')

# Fila 4: IE 24 ROSA IRENE INFANTES DE CANALES
[void]$sb.Append('    <row r="4" ht="20">')
[void]$sb.Append('<c r="A4" s="34"><v>1</v></c>')
[void]$sb.Append('<c r="B4" s="34" t="inlineStr"><is><t>ROSA IRENE INFANTES DE CANALES</t></is></c>')
[void]$sb.Append('<c r="C4" s="34" t="inlineStr"><is><t>0337766</t></is></c>')
[void]$sb.Append('<c r="D4" s="34" t="inlineStr"><is><t>UGEL 03</t></is></c>')
[void]$sb.Append('<c r="E4" s="34" t="inlineStr"><is><t>REI 02</t></is></c>')
[void]$sb.Append('<c r="F4" s="83"><v>46294</v></c>') # 2026-09-29
[void]$sb.Append('<c r="G4" s="34"><v>18</v></c>')
[void]$sb.Append('<c r="H4" s="34"><v>520</v></c>')
[void]$sb.Append('<c r="I4" s="34"><v>33</v></c>')
[void]$sb.Append('<c r="J4" s="34" t="inlineStr"><is><t>SI</t></is></c>')
[void]$sb.Append('<c r="K4" s="34"><v>3</v></c>')
[void]$sb.Append('<c r="L4" s="34"><v>2</v></c>')
[void]$sb.Append('<c r="M4" s="34" t="inlineStr"><is><t>ALVAREZ ROBLES ISABELA</t></is></c>')
[void]$sb.Append('<c r="N4" s="34" t="inlineStr"><is><t>66932770</t></is></c>')
[void]$sb.Append('<c r="O4" s="34"/>')
[void]$sb.Append('<c r="P4" s="34" t="inlineStr"><is><t>Designado(a)</t></is></c>')
[void]$sb.Append('<c r="Q4" s="34" t="inlineStr"><is><t>misabela28@hotmail.com</t></is></c>')
[void]$sb.Append('<c r="R4" s="34"/><c r="S4" s="34"/><c r="T4" s="34"/><c r="U4" s="34"/><c r="V4" s="34"/>')
[void]$sb.Append('<c r="W4" s="62"/>')
# Respuestas Canales:
# Pedagógico (9 SI)
for ($c = 24; $c -le 32; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)4"" s=""34"" t=""inlineStr""><is><t>SI</t></is></c>") }
[void]$sb.Append('<c r="AG4" s="40"><f>IFERROR(COUNTIF(X4:AF4,"SI")/(COUNTIF(X4:AF4,"SI")+COUNTIF(X4:AF4,"NO")),"")</f><v>1</v></c>')
# Gestión (10 SI, 1 NO en AR)
for ($c = 34; $c -le 43; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)4"" s=""34"" t=""inlineStr""><is><t>SI</t></is></c>") }
[void]$sb.Append('<c r="AR4" s="34" t="inlineStr"><is><t>NO</t></is></c>')
[void]$sb.Append('<c r="AS4" s="40"><f>IFERROR(COUNTIF(AH4:AR4,"SI")/(COUNTIF(AH4:AR4,"SI")+COUNTIF(AH4:AR4,"NO")),"")</f><v>0.91</v></c>')
# Soporte (10 SI, 1 N/A en BD)
for ($c = 46; $c -le 55; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)4"" s=""34"" t=""inlineStr""><is><t>SI</t></is></c>") }
[void]$sb.Append('<c r="BD4" s="34" t="inlineStr"><is><t>N/A</t></is></c>')
[void]$sb.Append('<c r="BE4" s="40"><f>IFERROR(COUNTIF(AT4:BD4,"SI")/(COUNTIF(AT4:BD4,"SI")+COUNTIF(AT4:BD4,"NO")),"")</f><v>1</v></c>')
# Observaciones y Compromiso
[void]$sb.Append('<c r="BF4" s="34" t="inlineStr"><is><t>Visita de asistencia técnica desarrollada con normalidad.</t></is></c>')
[void]$sb.Append('<c r="BG4" s="34" t="inlineStr"><is><t>• Directivo: Actualizar las carpetas pedagógicas de los docentes.&#10;• Especialista: Brindar acompañamiento en trabajo colegiado.</t></is></c>')
[void]$sb.Append('<c r="BH4" s="40"><f>IFERROR((COUNTIF(X4:AF4,"SI")+COUNTIF(AH4:AR4,"SI")+COUNTIF(AT4:BD4,"SI"))/(COUNTIF(X4:AF4,"SI")+COUNTIF(X4:AF4,"NO")+COUNTIF(AH4:AR4,"SI")+COUNTIF(AH4:AR4,"NO")+COUNTIF(AT4:BD4,"SI")+COUNTIF(AT4:BD4,"NO")),"")</f><v>0.97</v></c>')
[void]$sb.Append('<c r="BI4" s="34"><f>IF((COUNTIF(X4:AF4,"SI")+COUNTIF(AH4:AR4,"SI")+COUNTIF(AT4:BD4,"SI"))&gt;=24,"Implementación lograda",IF((COUNTIF(X4:AF4,"SI")+COUNTIF(AH4:AR4,"SI")+COUNTIF(AT4:BD4,"SI"))&gt;=12,"Implementación parcial","Implementación incipiente"))</f><v>Implementación lograda</v></c>')
# Cuadro RESULTADO - Fila 4: Título
[void]$sb.Append('<c r="BN4" s="116" t="inlineStr"><is><t>RESULTADO</t></is></c><c r="BO4" s="116"/><c r="BP4" s="116"/>')
[void]$sb.AppendLine('</row>')

# Fila 5: IE 022 REPUBLICA DE GUATEMALA
[void]$sb.Append('    <row r="5" ht="20">')
[void]$sb.Append('<c r="A5" s="34"><v>2</v></c>')
[void]$sb.Append('<c r="B5" s="34" t="inlineStr"><is><t>022 REPUBLICA DE GUATEMALA</t></is></c>')
[void]$sb.Append('<c r="C5" s="34" t="inlineStr"><is><t>0345678</t></is></c>')
[void]$sb.Append('<c r="D5" s="34" t="inlineStr"><is><t>UGEL 03</t></is></c>')
[void]$sb.Append('<c r="E5" s="34" t="inlineStr"><is><t>REI 03</t></is></c>')
[void]$sb.Append('<c r="F5" s="83"><v>46289</v></c>') # 2026-09-24
[void]$sb.Append('<c r="G5" s="34"><v>12</v></c>')
[void]$sb.Append('<c r="H5" s="34"><v>360</v></c>')
[void]$sb.Append('<c r="I5" s="34"><v>24</v></c>')
[void]$sb.Append('<c r="J5" s="34" t="inlineStr"><is><t>NO</t></is></c>')
[void]$sb.Append('<c r="K5" s="34"><v>2</v></c>')
[void]$sb.Append('<c r="L5" s="34"><v>1</v></c>')
[void]$sb.Append('<c r="M5" s="34" t="inlineStr"><is><t>PINEDO VEGA LUIS ALBERTO</t></is></c>')
[void]$sb.Append('<c r="N5" s="34" t="inlineStr"><is><t>29672110</t></is></c>')
[void]$sb.Append('<c r="O5" s="34" t="inlineStr"><is><t>933483306</t></is></c>')
[void]$sb.Append('<c r="P5" s="34" t="inlineStr"><is><t>Designado(a)</t></is></c>')
[void]$sb.Append('<c r="Q5" s="34"/>')
[void]$sb.Append('<c r="R5" s="34"/><c r="S5" s="34"/><c r="T5" s="34"/><c r="U5" s="34"/><c r="V5" s="34"/>')
[void]$sb.Append('<c r="W5" s="62"/>')
# Respuestas Guatemala:
# Pedagógico (6 SI, 3 NO)
for ($c = 24; $c -le 29; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)5"" s=""34"" t=""inlineStr""><is><t>SI</t></is></c>") }
for ($c = 30; $c -le 32; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)5"" s=""34"" t=""inlineStr""><is><t>NO</t></is></c>") }
[void]$sb.Append('<c r="AG5" s="40"><f>IFERROR(COUNTIF(X5:AF5,"SI")/(COUNTIF(X5:AF5,"SI")+COUNTIF(X5:AF5,"NO")),"")</f><v>0.67</v></c>')
# Gestión (7 SI, 4 NO)
for ($c = 34; $c -le 40; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)5"" s=""34"" t=""inlineStr""><is><t>SI</t></is></c>") }
for ($c = 41; $c -le 44; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)5"" s=""34"" t=""inlineStr""><is><t>NO</t></is></c>") }
[void]$sb.Append('<c r="AS5" s="40"><f>IFERROR(COUNTIF(AH5:AR5,"SI")/(COUNTIF(AH5:AR5,"SI")+COUNTIF(AH5:AR5,"NO")),"")</f><v>0.64</v></c>')
# Soporte (6 SI, 5 NO)
for ($c = 46; $c -le 51; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)5"" s=""34"" t=""inlineStr""><is><t>SI</t></is></c>") }
for ($c = 52; $c -le 56; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)5"" s=""34"" t=""inlineStr""><is><t>NO</t></is></c>") }
[void]$sb.Append('<c r="BE5" s="40"><f>IFERROR(COUNTIF(AT5:BD5,"SI")/(COUNTIF(AT5:BD5,"SI")+COUNTIF(AT5:BD5,"NO")),"")</f><v>0.55</v></c>')
# Observaciones y Compromiso
[void]$sb.Append('<c r="BF5" s="34" t="inlineStr"><is><t>El directivo cuenta con los planes TOECE al día.</t></is></c>')
[void]$sb.Append('<c r="BG5" s="34" t="inlineStr"><is><t>• Directivo: Reunión semanal con el equipo de psicólogos y CIST.&#10;• Especialista: Monitoreo de soporte técnico.</t></is></c>')
[void]$sb.Append('<c r="BH5" s="40"><f>IFERROR((COUNTIF(X5:AF5,"SI")+COUNTIF(AH5:AR5,"SI")+COUNTIF(AT5:BD5,"SI"))/(COUNTIF(X5:AF5,"SI")+COUNTIF(X5:AF5,"NO")+COUNTIF(AH5:AR5,"SI")+COUNTIF(AH5:AR5,"NO")+COUNTIF(AT5:BD5,"SI")+COUNTIF(AT5:BD5,"NO")),"")</f><v>0.61</v></c>')
[void]$sb.Append('<c r="BI5" s="34"><f>IF((COUNTIF(X5:AF5,"SI")+COUNTIF(AH5:AR5,"SI")+COUNTIF(AT5:BD5,"SI"))&gt;=24,"Implementación lograda",IF((COUNTIF(X5:AF4,"SI")+COUNTIF(AH5:AR5,"SI")+COUNTIF(AT5:BD5,"SI"))&gt;=12,"Implementación parcial","Implementación incipiente"))</f><v>Implementación parcial</v></c>')
# Cuadro RESULTADO - Fila 5: Encabezados cant, %
[void]$sb.Append('<c r="BN5" s="117" t="inlineStr"><is><t>NIVEL DE IMPLEMENTACIÓN</t></is></c><c r="BO5" s="117" t="inlineStr"><is><t>cant</t></is></c><c r="BP5" s="117" t="inlineStr"><is><t>%</t></is></c>')
[void]$sb.AppendLine('</row>')

# Fila 6: Estadística - Sí (Cumple) y RESULTADO Incipiente
[void]$sb.Append('    <row r="6" ht="20">')
[void]$sb.Append('<c r="A6" s="116" t="inlineStr"><is><t>% TOTAL</t></is></c>')
for ($c = 2; $c -le 22; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)6"" s=""116""/>") }
[void]$sb.Append('<c r="W6" s="62" t="inlineStr"><is><t>Sí (Cumple)</t></is></c>')
foreach ($ind in $indicadores) {
  [void]$sb.Append("<c r=""$($ind.Col)6"" s=""34""><f>COUNTIF($($ind.Col)`$4:$($ind.Col)`$5,&quot;SI&quot;)</f></c>")
}
[void]$sb.Append('<c r="BN6" s="34" t="inlineStr"><is><t>Implementación incipiente</t></is></c>')
[void]$sb.Append('<c r="BO6" s="34"><f>COUNTIF($BI$4:$BI$5,"Implementación incipiente")</f><v>0</v></c>')
[void]$sb.Append('<c r="BP6" s="40"><f>IFERROR(BO6/SUM($BO$6:$BO$8),0)</f><v>0</v></c>')
[void]$sb.AppendLine('</row>')

# Fila 7: Estadística - No (No cumple) y RESULTADO Parcial
[void]$sb.Append('    <row r="7" ht="20">')
for ($c = 1; $c -le 22; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)7"" s=""116""/>") }
[void]$sb.Append('<c r="W7" s="62" t="inlineStr"><is><t>No (No cumple)</t></is></c>')
foreach ($ind in $indicadores) {
  [void]$sb.Append("<c r=""$($ind.Col)7"" s=""34""><f>COUNTIF($($ind.Col)`$4:$($ind.Col)`$5,&quot;NO&quot;)</f></c>")
}
[void]$sb.Append('<c r="BN7" s="34" t="inlineStr"><is><t>Implementación parcial</t></is></c>')
[void]$sb.Append('<c r="BO7" s="34"><f>COUNTIF($BI$4:$BI$5,"Implementación parcial")</f><v>1</v></c>')
[void]$sb.Append('<c r="BP7" s="40"><f>IFERROR(BO7/SUM($BO$6:$BO$8),0)</f><v>0.5</v></c>')
[void]$sb.AppendLine('</row>')

# Fila 8: Estadística - N/A (No aplica) y RESULTADO Lograda
[void]$sb.Append('    <row r="8" ht="20">')
for ($c = 1; $c -le 22; $c++) { [void]$sb.Append("<c r=""$(colToLetter $c)8"" s=""116""/>") }
[void]$sb.Append('<c r="W8" s="62" t="inlineStr"><is><t>N/A (No aplica)</t></is></c>')
foreach ($ind in $indicadores) {
  [void]$sb.Append("<c r=""$($ind.Col)8"" s=""34""><f>COUNTIF($($ind.Col)`$4:$($ind.Col)`$5,&quot;N/A&quot;)</f></c>")
}
[void]$sb.Append('<c r="BN8" s="34" t="inlineStr"><is><t>Implementación lograda</t></is></c>')
[void]$sb.Append('<c r="BO8" s="34"><f>COUNTIF($BI$4:$BI$5,"Implementación lograda")</f><v>1</v></c>')
[void]$sb.Append('<c r="BP8" s="40"><f>IFERROR(BO8/SUM($BO$6:$BO$8),0)</f><v>0.5</v></c>')
[void]$sb.AppendLine('</row>')

# Fila 9: Estadística - Total
[void]$sb.Append('    <row r="9" ht="20">')
[void]$sb.Append('<c r="W9" s="62" t="inlineStr"><is><t>Total</t></is></c>')
foreach ($ind in $indicadores) {
  [void]$sb.Append("<c r=""$($ind.Col)9"" s=""34""><f>SUM($($ind.Col)6:$($ind.Col)8)</f></c>")
}
[void]$sb.AppendLine('</row>')

# Fila 10: Separador / Título CUMPLIMIENTO POR COMPONENTE
[void]$sb.Append('    <row r="10" ht="20">')
[void]$sb.Append('<c r="BN10" s="116" t="inlineStr"><is><t>CUMPLIMIENTO POR COMPONENTE</t></is></c><c r="BO10" s="116"/><c r="BP10" s="116"/>')
[void]$sb.AppendLine('</row>')

# Fila 11: % Cumple y Pedagógico
[void]$sb.Append('    <row r="11" ht="20">')
[void]$sb.Append('<c r="W11" s="62" t="inlineStr"><is><t>% Cumple</t></is></c>')
foreach ($ind in $indicadores) {
  [void]$sb.Append("<c r=""$($ind.Col)11"" s=""40""><f>IFERROR($($ind.Col)6/($($ind.Col)6+$($ind.Col)7),0)</f></c>")
}
# Agregados en columnas % de componentes:
[void]$sb.Append('<c r="AG11" s="40"><f>IFERROR(COUNTIF(X$4:AF$5,"SI")/(COUNTIF(X$4:AF$5,"SI")+COUNTIF(X$4:AF$5,"NO")),0)</f><v>0.83</v></c>')
[void]$sb.Append('<c r="AS11" s="40"><f>IFERROR(COUNTIF(AH$4:AR$5,"SI")/(COUNTIF(AH$4:AR$5,"SI")+COUNTIF(AH$4:AR$5,"NO")),0)</f><v>0.77</v></c>')
[void]$sb.Append('<c r="BE11" s="40"><f>IFERROR(COUNTIF(AT$4:BD$5,"SI")/(COUNTIF(AT$4:BD$5,"SI")+COUNTIF(AT$4:BD$5,"NO")),0)</f><v>0.76</v></c>')
[void]$sb.Append('<c r="BH11" s="40"><f>IFERROR((COUNTIF(X$4:AF$5,"SI")+COUNTIF(AH$4:AR$5,"SI")+COUNTIF(AT$4:BD$5,"SI"))/(COUNTIF(X$4:AF$5,"SI")+COUNTIF(X$4:AF$5,"NO")+COUNTIF(AH$4:AR$5,"SI")+COUNTIF(AH$4:AR$5,"NO")+COUNTIF(AT$4:BD$5,"SI")+COUNTIF(AT$4:BD$5,"NO")),0)</f><v>0.79</v></c>')
# Cuadro CUMPLIMIENTO - Fila 11: Pedagógico
[void]$sb.Append('<c r="BN11" s="34" t="inlineStr"><is><t>Componente pedagógico</t></is></c>')
[void]$sb.Append('<c r="BO11" s="40"><f>AG$11</f><v>0.83</v></c>')
[void]$sb.Append('<c r="BP11" s="34"><f>IF(BO11&gt;=0.8,"Implementación lograda",IF(BO11&gt;=0.5,"Implementación parcial","Implementación incipiente"))</f><v>Implementación lograda</v></c>')
[void]$sb.AppendLine('</row>')

# Fila 12: % No cumple y Gestión
[void]$sb.Append('    <row r="12" ht="20">')
[void]$sb.Append('<c r="W12" s="62" t="inlineStr"><is><t>% No cumple</t></is></c>')
foreach ($ind in $indicadores) {
  [void]$sb.Append("<c r=""$($ind.Col)12"" s=""40""><f>IFERROR($($ind.Col)7/($($ind.Col)6+$($ind.Col)7),0)</f></c>")
}
# Cuadro CUMPLIMIENTO - Fila 12: Gestión
[void]$sb.Append('<c r="BN12" s="34" t="inlineStr"><is><t>Componente de gestión</t></is></c>')
[void]$sb.Append('<c r="BO12" s="40"><f>AS$11</f><v>0.77</v></c>')
[void]$sb.Append('<c r="BP12" s="34"><f>IF(BO12&gt;=0.8,"Implementación lograda",IF(BO12&gt;=0.5,"Implementación parcial","Implementación incipiente"))</f><v>Implementación parcial</v></c>')
[void]$sb.AppendLine('</row>')

# Fila 13: Cuadro CUMPLIMIENTO - Soporte
[void]$sb.Append('    <row r="13" ht="20">')
[void]$sb.Append('<c r="BN13" s="34" t="inlineStr"><is><t>Componente de soporte</t></is></c>')
[void]$sb.Append('<c r="BO13" s="40"><f>BE$11</f><v>0.76</v></c>')
[void]$sb.Append('<c r="BP13" s="34"><f>IF(BO13&gt;=0.8,"Implementación lograda",IF(BO13&gt;=0.5,"Implementación parcial","Implementación incipiente"))</f><v>Implementación parcial</v></c>')
[void]$sb.AppendLine('</row>')

# Fila 14: Cuadro CUMPLIMIENTO - General
[void]$sb.Append('    <row r="14" ht="20">')
[void]$sb.Append('<c r="BN14" s="34" t="inlineStr"><is><t>GENERAL</t></is></c>')
[void]$sb.Append('<c r="BO14" s="40"><f>BH$11</f><v>0.79</v></c>')
[void]$sb.Append('<c r="BP14" s="34"><f>IF(BO14&gt;=0.8,"Implementación lograda",IF(BO14&gt;=0.5,"Implementación parcial","Implementación incipiente"))</f><v>Implementación parcial</v></c>')
[void]$sb.AppendLine('</row>')

[void]$sb.AppendLine('  </sheetData>')

# Merges
[void]$sb.AppendLine('  <mergeCells>')
[void]$sb.AppendLine('    <mergeCell ref="A1:L1"/>')
[void]$sb.AppendLine('    <mergeCell ref="M1:Q1"/>')
[void]$sb.AppendLine('    <mergeCell ref="R1:V1"/>')
[void]$sb.AppendLine('    <mergeCell ref="W1:W3"/>')
[void]$sb.AppendLine('    <mergeCell ref="X1:AF1"/>')
[void]$sb.AppendLine('    <mergeCell ref="AG1:AG3"/>')
[void]$sb.AppendLine('    <mergeCell ref="AH1:AR1"/>')
[void]$sb.AppendLine('    <mergeCell ref="AS1:AS3"/>')
[void]$sb.AppendLine('    <mergeCell ref="AT1:BD1"/>')
[void]$sb.AppendLine('    <mergeCell ref="BE1:BE3"/>')
[void]$sb.AppendLine('    <mergeCell ref="BF1:BF3"/>')
[void]$sb.AppendLine('    <mergeCell ref="BG1:BG3"/>')
[void]$sb.AppendLine('    <mergeCell ref="BH1:BH3"/>')
[void]$sb.AppendLine('    <mergeCell ref="BI1:BI3"/>')
[void]$sb.AppendLine('    <mergeCell ref="A6:V8"/>')
[void]$sb.AppendLine('    <mergeCell ref="BN4:BP4"/>')
[void]$sb.AppendLine('    <mergeCell ref="BN10:BP10"/>')
[void]$sb.AppendLine('  </mergeCells>')

# Validaciones de datos: SI, NO, N/A para columnas de indicadores
[void]$sb.AppendLine('  <dataValidations count="1">')
[void]$sb.AppendLine('    <dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="X4:AF5 AH4:AR5 AT4:BD5">')
[void]$sb.AppendLine('      <formula1>&quot;SI,NO,N/A&quot;</formula1>')
[void]$sb.AppendLine('    </dataValidation>')
[void]$sb.AppendLine('  </dataValidations>')

# Formato Condicional (SI = verde, NO = rojo, N/A = gris; y Nivel)
[void]$sb.AppendLine('  <conditionalFormatting sqref="X4:AF5 AH4:AR5 AT4:BD5">')
[void]$sb.AppendLine('    <cfRule type="cellIs" operator="equal" priority="1">')
[void]$sb.AppendLine('      <formula>&quot;SI&quot;</formula>')
[void]$sb.AppendLine('    </cfRule>')
[void]$sb.AppendLine('    <cfRule type="cellIs" operator="equal" priority="2">')
[void]$sb.AppendLine('      <formula>&quot;NO&quot;</formula>')
[void]$sb.AppendLine('    </cfRule>')
[void]$sb.AppendLine('    <cfRule type="cellIs" operator="equal" priority="3">')
[void]$sb.AppendLine('      <formula>&quot;N/A&quot;</formula>')
[void]$sb.AppendLine('    </cfRule>')
[void]$sb.AppendLine('  </conditionalFormatting>')

# DrawingML
[void]$sb.AppendLine('  <drawing r:id="rId1"/>')
[void]$sb.AppendLine('</worksheet>')

[System.IO.File]::WriteAllText($s1File, $sb.ToString(), [System.Text.Encoding]::UTF8)
Write-Host "sheet1.xml reescrito con éxito" -ForegroundColor Green

# Actualizar sheet3.xml (Listas) con N/A
$s3File = Join-Path $tempDir "xl\worksheets\sheet3.xml"
if (Test-Path $s3File) {
  $s3Xml = [System.IO.File]::ReadAllText($s3File, [System.Text.Encoding]::UTF8)
  if (-not ($s3Xml.Contains('N/A'))) {
    $s3Xml = $s3Xml -replace '(<c r="B3"[^>]*>.*?</c>)', "`$1<c r=""B4"" t=""inlineStr""><is><t>N/A</t></is></c>"
    [System.IO.File]::WriteAllText($s3File, $s3Xml, [System.Text.Encoding]::UTF8)
    Write-Host "sheet3.xml (Listas) actualizado con N/A" -ForegroundColor Green
  }
}

# Comprimir a docs/muestras/MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC_2026-09-30.xlsx y MUESTRA
if (Test-Path $outFile) { Remove-Item $outFile -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $outFile)
Write-Host "Archivo generado con éxito: $outFile" -ForegroundColor Green

if (Test-Path $outMuestra) { Remove-Item $outMuestra -Force }
[System.IO.File]::Copy($outFile, $outMuestra)
Write-Host "Muestra sincronizada: $outMuestra" -ForegroundColor Green

Remove-Item $tempDir -Recurse -Force
Write-Host "Limpieza completada. Proceso exitoso." -ForegroundColor Cyan
