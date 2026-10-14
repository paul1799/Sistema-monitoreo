# patch-matriz-config.ps1
$path = "public\js\matrizConfig.js"
$lines = [System.Collections.Generic.List[string]](Get-Content $path -Encoding UTF8)

$nuevoBloque = @'
/**
 * Estructura oficial de la Ficha A:
 * Monitoreo y Asistencia Técnica a la Implementación del Modelo JEC
 * (3 componentes, 31 indicadores con escala Sí / No / N/A)
 * Extraída dinámicamente de la definición de la ficha del sistema (JEC_ITEMS y JEC_SECCIONES)
 */

/**
 * Obtiene la lista de componentes e indicadores de la ficha JEC
 * Si recibe ft (fichaType de state), extrae dinámicamente sus secciones.
 * Caso contrario, usa la definición oficial de JEC_SECCIONES y JEC_ITEMS.
 * @param {Object} [ft] - Definición de la ficha en el sistema
 * @returns {Array<Object>} Lista de 3 componentes con sus indicadores
 */
export function obtenerComponentesJec(ft = null) {
  let secciones = null;
  if (ft && Array.isArray(ft.secciones) && ft.secciones.length > 0) {
    secciones = ft.secciones;
  }

  if (!secciones) {
    return JEC_SECCIONES.map((sec, secIdx) => {
      const items = (sec.itemIds || [])
        .map(id => JEC_ITEMS.find(it => it.id === id))
        .filter(Boolean)
        .map((it, itIdx) => {
          const numVal = it.numero !== undefined ? it.numero : (itIdx + 1);
          return {
            id: it.id,
            numero: numVal,
            num: String(numVal).padStart(2, '0'),
            texto: it.texto || it.descripcion || '',
            tipo: 'si_no_na',
            aliasKeys: [it.id, `item_${numVal}`, String(numVal), String(itIdx + 1).padStart(2, '0')].filter(Boolean)
          };
        });

      return {
        id: sec.id,
        nombre: sec.nombre,
        color: sec.color || (secIdx === 0 ? 'emerald' : (secIdx === 1 ? 'purple' : 'amber')),
        items
      };
    });
  }

  return secciones.map((sec, secIdx) => {
    const items = (sec.items || []).map((it, itIdx) => {
      const numVal = it.numero !== undefined ? it.numero : (itIdx + 1);
      return {
        id: it.id || `jec_${secIdx + 1}_${itIdx + 1}`,
        numero: numVal,
        num: String(numVal).padStart(2, '0'),
        texto: it.texto || it.descripcion || '',
        tipo: it.tipo || sec.tipoRespuesta || 'si_no_na',
        aliasKeys: [it.id, `item_${numVal}`, String(numVal), String(itIdx + 1).padStart(2, '0')].filter(Boolean)
      };
    });

    return {
      id: sec.id || `sec_${secIdx + 1}`,
      nombre: sec.nombre || `COMPONENTE 0${secIdx + 1}`,
      color: sec.color || (secIdx === 0 ? 'emerald' : (secIdx === 1 ? 'purple' : 'amber')),
      items
    };
  });
}

/**
 * Asigna columnas Excel (1-indexadas y letras) a los componentes e indicadores de JEC.
 * El mapeo comienza inmediatamente después de la columna separadora gris W (columna 23):
 * - Col 24 (X) a 32 (AF): Componente Pedagógico (9 indicadores)
 * - Col 33 (AG): % CUMPLIMIENTO Pedagógico
 * - Col 34 (AH) a 44 (AR): Componente de Gestión (11 indicadores)
 * - Col 45 (AS): % CUMPLIMIENTO Gestión
 * - Col 46 (AT) a 56 (BD): Componente de Soporte (11 indicadores)
 * - Col 57 (BE): % CUMPLIMIENTO Soporte
 * - Col 58 (BF): OBSERVACIONES / RECOMENDACIONES
 * - Col 59 (BG): COMPROMISO
 * - Col 60 (BH): % Cumplimiento General por IIEE
 * - Col 61 (BI): Nivel de Implementación por IIEE
 * - Cols 62 a 65 (BJ:BM): Separadores vacíos
 * - Cols 66 a 68 (BN:BP): Cuadro RESULTADO y Cuadro CUMPLIMIENTO POR COMPONENTE
 */
export function generarItemsConColumnasJec(componentes) {
  let currCol = 24; // Col X
  const items = [];
  componentes.forEach((comp, compIdx) => {
    comp.startCol = currCol;
    comp.startColLetra = colToLetter(currCol);
    comp.items.forEach(it => {
      const itCol = currCol;
      const colLetra = colToLetter(itCol);
      const enriched = {
        ...it,
        colIndex: itCol,
        colLetra: colLetra,
        aspectoIndex: compIdx,
        aspectoNombre: comp.nombre
      };
      items.push(enriched);
      currCol++;
    });
    comp.endCol = currCol - 1;
    comp.endColLetra = colToLetter(currCol - 1);
    comp.pctCol = currCol;
    comp.pctColLetra = colToLetter(currCol);
    currCol++; // Avanzar para la columna % CUMPLIMIENTO del componente
  });

  return { items, finalCol: currCol };
}

/**
 * 31 indicadores oficiales de la Ficha A JEC en el sistema
 */
export const ITEMS_MODELO_JEC = generarItemsConColumnasJec(obtenerComponentesJec()).items;

/**
 * Tabla explícita de mapeo de las columnas oficiales de la Matriz JEC
 * Permite verificar y documentar columna Excel ↔ clave guardada en ficha
 */
export const MAPEO_COLUMNAS_JEC = ITEMS_MODELO_JEC.map(it => ({
  columna: it.colLetra,
  num: it.num,
  id: it.id,
  aspectoNombre: it.aspectoNombre,
  tipo: it.tipo,
  aliasKeys: it.aliasKeys,
  texto: it.texto
}));
'@

$startIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'export const ITEMS_MODELO_JEC = \[') {
    $startIdx = $i - 5 # start at /**
    break
  }
}

$endIdx = -1
for ($i = $startIdx; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'export const ITEMS_COORD_TUTORIA_JEC = \[') {
    $endIdx = $i - 4 # stop before /** of Ficha B
    break
  }
}

Write-Host "Reemplazando desde línea $startIdx hasta $endIdx" -ForegroundColor Yellow
$lines.RemoveRange($startIdx, $endIdx - $startIdx)
$nuevoBloqueLines = [string[]]($nuevoBloque -split "`r?`n")
$lines.InsertRange($startIdx, $nuevoBloqueLines)

# Ahora actualizar getMatrizConfig
$jecConfigIdx = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
  if ($lines[$i] -match 'if \(isFichaJec\(ft, state\)\) \{') {
    $jecConfigIdx = $i
    break
  }
}

if ($jecConfigIdx -ge 0) {
  Write-Host "Actualizando getMatrizConfig en línea $jecConfigIdx" -ForegroundColor Yellow
  $itemsIdx = -1
  for ($j = $jecConfigIdx; $j -lt $jecConfigIdx + 15; $j++) {
    if ($lines[$j] -match 'items: ITEMS_MODELO_JEC,') {
      $itemsIdx = $j
      break
    }
  }
  if ($itemsIdx -ge 0) {
    $lines.RemoveRange($jecConfigIdx + 1, $itemsIdx - $jecConfigIdx)
    $configLines = [string[]]@(
      '    const componentes = obtenerComponentesJec(ft);',
      '    const { items } = generarItemsConColumnasJec(componentes);',
      '    return {',
      '      sheetName: ''MODELO JEC'',',
      '      tituloDocumento: ''MATRIZ DE SEGUIMIENTO 2026 — MODELO JEC'',',
      '      tipoFicha: ''A'',',
      '      esJecReal: true,',
      '      componentes: componentes,',
      '      limites: LIMITES_NIVEL_FICHAS.MODELO_JEC,',
      '      items: items,'
    )
    $lines.InsertRange($jecConfigIdx + 1, $configLines)
    Write-Host "getMatrizConfig actualizado con éxito" -ForegroundColor Green
  }
}

[System.IO.File]::WriteAllLines((Resolve-Path $path).Path, $lines, [System.Text.Encoding]::UTF8)
Write-Host "matrizConfig.js guardado exitosamente" -ForegroundColor Cyan
