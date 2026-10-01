const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(__dirname, '..', 'public', 'js');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
let hasError = false;

for (const file of files) {
  const filePath = path.join(dir, file);
  try {
    const code = fs.readFileSync(filePath, 'utf8');
    execSync('node --check --input-type=module', { input: code, stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('✓ ' + file);
  } catch (err) {
    console.error('✗ Error in ' + file + ':', err.stderr ? err.stderr.toString() : err.message);
    hasError = true;
  }
}
if (hasError) process.exit(1);
console.log('¡Todos los archivos JS en public/js/ pasan la validación de sintaxis!');
