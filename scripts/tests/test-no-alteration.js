import fs from 'fs';
import crypto from 'crypto';

function getFileChecksum(filePath) {
  const content = fs.readFileSync(filePath);
  return {
    path: filePath,
    bytes: content.length,
    sha256: crypto.createHash('sha256').update(content).digest('hex')
  };
}

function resolveDataFile(filename) {
  const base = path.basename(filename);
  const candidates = [
    path.join(__dirname, '..', 'data', base),
    path.join(__dirname, '..', base),
    path.join(process.cwd(), 'scripts', 'data', base),
    path.join(process.cwd(), 'scripts', base),
    filename
  ];
  return candidates.find(p => fs.existsSync(p)) || filename;
}

const files = [
  resolveDataFile('concurso-data.json'),
  resolveDataFile('concursos-data.json'),
  resolveDataFile('concursos-revision.csv')
];

console.log('=== CHECKSUM Y CONTEO DE REGISTROS (PRUEBA DE NO ALTERACIÓN) ===\n');
for (const f of files) {
  const meta = getFileChecksum(f);
  console.log(`Archivo: ${meta.path}`);
  console.log(`Tamaño: ${meta.bytes} bytes`);
  console.log(`SHA-256: ${meta.sha256}\n`);
}

// Conteo exacto de registros en concurso-data.json
const dataPath = resolveDataFile('concurso-data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const jedpa = data.filter(r => (r.tipoConcurso || r.tipoConcursoNombre || '').toLowerCase().includes('jedpa'));
console.log(`Total registros en concurso-data.json: ${data.length}`);
console.log(`Total registros JEDPA: ${jedpa.length}`);
