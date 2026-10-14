const fs = require('fs');
const path = require('path');

const uiJsPath = path.join(__dirname, '../public/js/ui.js');
let uiJs = fs.readFileSync(uiJsPath, 'utf8');

// Import from reportes-datos
if (!uiJs.includes('import * as RepDatos')) {
  uiJs = uiJs.replace(
    `import { calcScore, puntajeItem, estadoPorRegla } from './calcEngine.js?v=20260924_v5';`,
    `import { calcScore, puntajeItem, estadoPorRegla } from './calcEngine.js?v=20260924_v5';\nimport * as RepDatos from './reportes-datos.js';`
  );
}

// Modify renderConsBody to use RepDatos
// Find where it renders allTypesSummaryHtml
const searchStr = `  const visAgg = {};`;
const replaceStr = `  // --- FASE 4: 9 Gráficos y Sugerencias ---
  let fase4Html = '';
  if (!isAllMode && ft) {
    const criticosDS = RepDatos.getRankingCriticosDataset(statsList, ft);
    const heatmapDS = RepDatos.getMapaCalorDataset(statsList, ft);
    const sugerencias = RepDatos.getSugerencias(statsList, ft, criticosDS);
    
    let sugHtml = '';
    if (sugerencias.length > 0) {
      sugHtml = '<div class="panel" style="background:#FEF3C7;border:1px solid #F59E0B;border-left:4px solid #D97706;padding:16px;">' +
        '<h3 style="color:#B45309;margin-top:0">💡 Sugerencias Automáticas</h3>' +
        '<ul style="margin-bottom:0;color:#92400E;padding-left:20px">' + 
        sugerencias.map(s => '<li><strong>' + s.tipo + ':</strong> ' + s.mensaje + '</li>').join('') + 
        '</ul></div>';
    }

    let criticosHtml = '<div class="panel"><h3>Top 5 Ítems Críticos (No/Inicio)</h3>';
    if (criticosDS.length > 0) {
      criticosHtml += criticosDS.slice(0, 5).map(c => 
        '<div class="barRow"><div class="name" style="max-width:300px;white-space:normal;line-height:1.2;font-size:11px">' + c.texto + '</div>' +
        '<div class="barTrack"><div class="barFill danger" style="width:' + c.pctCritico + '%"></div></div><div class="val">' + c.pctCritico + '%</div></div>'
      ).join('');
    } else {
      criticosHtml += '<p class="helpText">No hay ítems críticos detectados.</p>';
    }
    criticosHtml += '</div>';
    
    fase4Html = sugHtml + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">' + criticosHtml + '</div>';
  }

  const visAgg = {};`;

if (!uiJs.includes('FASE 4: 9 Gráficos')) {
  uiJs = uiJs.replace(searchStr, replaceStr);
}

// Render fase4Html into the DOM right before the rows table
const renderSearch = `host.innerHTML = '<div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap">' +`;
const renderReplace = `host.innerHTML = fase4Html + '<div style="display:flex;gap:20px;margin-bottom:20px;flex-wrap:wrap">' +`;
if (!uiJs.includes('fase4Html +')) {
  // It's a bit tricky because the exact line might differ, let's use a regex
  uiJs = uiJs.replace(/host\.innerHTML = '([^']+)' \+/, `host.innerHTML = fase4Html + '$1' +`);
}

fs.writeFileSync(uiJsPath, uiJs);
console.log("Phase 4 patch applied to ui.js successfully.");
