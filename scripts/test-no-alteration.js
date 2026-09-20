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

const files = [
  './scripts/concurso-data.json',
  './scripts/concursos-data.json',
  './scripts/concursos-revision.csv'
];

console.log('=== CHECKSUM Y CONTEO DE REGISTROS (PRUEBA DE NO ALTERACIÓN) ===\n');
for (const f of files) {
  const meta = getFileChecksum(f);
  console.log(`Archivo: ${meta.path}`);
  console.log(`Tamaño: ${meta.bytes} bytes`);
  console.log(`SHA-256: ${meta.sha256}\n`);
}

// Conteo exacto de registros en concurso-data.json
const data = JSON.parse(fs.readFileSync('./scripts/concurso-data.json', 'utf8'));
const jedpa = data.filter(r => (r.tipoConcurso || r.tipoConcursoNombre || '').toLowerCase().includes('jedpa'));
console.log(`Total registros en concurso-data.json: ${data.length}`);
console.log(`Total registros JEDPA: ${jedpa.length}`);
