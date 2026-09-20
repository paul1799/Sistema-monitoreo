import fs from 'fs';

// Lee concursos-data.json y concursos-revision.csv
const dataRaw = JSON.parse(fs.readFileSync('./scripts/concurso-data.json', 'utf8'));

// Parse CSV
const csvRaw = fs.readFileSync('./scripts/concursos-revision.csv', 'utf8').split('\n').filter(Boolean);
const csvHeaders = csvRaw[0].split(',');
const csvRows = csvRaw.slice(1).map(l => {
  const cols = l.split(',');
  return {
    tipoConcurso: cols[0],
    etapa: cols[1],
    categoria: cols[2],
    genero: cols[3],
    disciplina: cols[4]
  };
}).filter(r => (r.tipoConcurso || '').toLowerCase().includes('jedpa'));

console.log(`JEDPA en CSV: ${csvRows.length}`);


const jedpaRecords = dataRaw.filter(r => {
  const t = (r.tipoConcurso || r.tipoConcursoNombre || '').toLowerCase();
  return t.includes('jedpa') || t.includes('juegos escolares deportivos');
});

console.log(`Total registros en concurso-data.json: ${dataRaw.length}`);
console.log(`Total registros JEDPA: ${jedpaRecords.length}`);

// Analizar variantes
function analyzeField(field) {
  const variants = new Map(); // normalized -> Set of original variants
  jedpaRecords.forEach(r => {
    const val = r[field];
    const orig = val === null || val === undefined ? '(vacío)' : String(val);
    const norm = orig.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!variants.has(norm)) variants.set(norm, new Map());
    const counts = variants.get(norm);
    counts.set(orig, (counts.get(orig) || 0) + 1);
  });
  return variants;
}

console.log('\n=== ETAPAS ===');
for (const [norm, origMap] of analyzeField('etapa')) {
  console.log(`- Clave normalizada: "${norm}" -> Variantes:`, Object.fromEntries(origMap));
}

console.log('\n=== DISCIPLINAS ===');
for (const [norm, origMap] of analyzeField('disciplina')) {
  console.log(`- Clave normalizada: "${norm}" -> Variantes:`, Object.fromEntries(origMap));
}

console.log('\n=== CATEGORÍAS ===');
for (const [norm, origMap] of analyzeField('categoria')) {
  console.log(`- Clave normalizada: "${norm}" -> Variantes:`, Object.fromEntries(origMap));
}

console.log('\n=== GÉNEROS ===');
for (const [norm, origMap] of analyzeField('genero')) {
  console.log(`- Clave normalizada: "${norm}" -> Variantes:`, Object.fromEntries(origMap));
}
