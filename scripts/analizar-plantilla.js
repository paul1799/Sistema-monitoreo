const ExcelJS = require('exceljs');
const path = require('path');

async function inspect(filePath, label) {
  console.log(`\n=================== ${label} ===================`);
  console.log(`Path: ${filePath}`);
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  console.log(`Worksheets (${wb.worksheets.length}):`, wb.worksheets.map(ws => ws.name));

  for (const ws of wb.worksheets) {
    console.log(`\n--- Sheet: ${ws.name} (rows: ${ws.rowCount}, cols: ${ws.columnCount}) ---`);
    console.log(`Views:`, JSON.stringify(ws.views));
    
    // Check tables in sheet
    if (ws.tables) {
      console.log(`Tables:`, Object.keys(ws.tables));
      for (const tName of Object.keys(ws.tables)) {
        const t = ws.tables[tName];
        console.log(`  Table [${tName}]: name=${t.name}, ref=${t.table?.tableRef || t.tableRef || JSON.stringify(t)}`);
      }
    }

    // Inspect first 3 rows
    for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
      const row = ws.getRow(r);
      const vals = [];
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        let v = cell.value;
        if (v && typeof v === 'object') {
          if (v.formula) v = `[FORMULA: ${v.formula} (result: ${v.result})]`;
          else if (v.richText) v = `[RICHTEXT: ${v.richText.map(t=>t.text).join('')}]`;
          else v = JSON.stringify(v);
        }
        vals.push(`C${colNumber}:${v}`);
      });
      console.log(`  Row ${r}: ${vals.slice(0, 15).join(' | ')}${vals.length > 15 ? ' ...' : ''}`);
    }

    // Check comments / notes on row 1 or 2
    for (let r = 1; r <= 2; r++) {
      const row = ws.getRow(r);
      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (cell.note) {
          console.log(`  Note on R${r}C${colNumber}:`, JSON.stringify(cell.note));
        }
      });
    }
  }
}

async function run() {
  const pOficial = path.join(__dirname, '../docs/plantillas/TABLERO_MONITOREO_GESTION_II_MOMENTO.xlsx');
  const pHoy = path.join(__dirname, '../docs/plantillas/TABLERO_MONITOREO_GESTION_EBR_II_MOMENTO_20261001.xlsx');
  await inspect(pOficial, 'PLANTILLA OFICIAL');
  await inspect(pHoy, 'ARCHIVO GENERADO HOY');
}

run().catch(console.error);
