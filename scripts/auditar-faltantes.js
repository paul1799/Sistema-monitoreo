const fs = require('fs');
const vm = require('vm');

const colegiosContent = fs.readFileSync('public/js/colegios.js', 'utf8');
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(colegiosContent, sandbox);
const directorioContent = fs.readFileSync('public/js/directorio.js', 'utf8');
vm.runInContext(directorioContent, sandbox);

const colegios = sandbox.window.COLEGIOS_DATA || [];
const dir = sandbox.window.DIRECTORIO_DATA || [];

const ebr = colegios.filter(c => (c.modalidad || '').toUpperCase() === 'EBR');
console.log('Total EBR:', ebr.length);

const sinDistrito = ebr.filter(c => !c.distrito || !c.distrito.trim());
console.log('Sin distrito:', sinDistrito.map(c => c.codLocal + ' ' + c.nombre));

const sinRed = ebr.filter(c => !c.red || !c.red.trim());
console.log('Sin red:', sinRed.map(c => c.codLocal + ' ' + c.nombre));

const dirMap = {};
dir.forEach(d => {
  const cl = String(d.codLocal || d.cod_local || '').trim();
  if (cl) dirMap[cl] = d;
});

const ebrSinDirector = [];
const ebrDirectorSinDni = [];
const ebrDirectorSinTel = [];
const ebrDirectorSinCorreo = [];

ebr.forEach(c => {
  const d = dirMap[String(c.codLocal).trim()];
  if (!d) {
    ebrSinDirector.push(`${c.codLocal} - ${c.nombre}`);
  } else {
    const dni = String(d.dni || '').trim();
    if (!dni || dni.length !== 8) {
      ebrDirectorSinDni.push(`${c.codLocal} - ${c.nombre} (DNI: "${dni}")`);
    }
    const tel = String(d.telefono || d.celular || '').trim();
    if (!tel) {
      ebrDirectorSinTel.push(`${c.codLocal} - ${c.nombre}`);
    }
    const mail = String(d.correo || d.email || '').trim();
    if (!mail) {
      ebrDirectorSinCorreo.push(`${c.codLocal} - ${c.nombre}`);
    }
  }
});

console.log('--- REPORTE DE FALTANTES EN PADRÓN/DIRECTORIO ---');
console.log('1. IE EBR sin Distrito en colegios.js:', sinDistrito.length);
console.log('2. IE EBR sin RED en colegios.js:', sinRed.length);
console.log('3. IE EBR sin registro en directorio.js:', ebrSinDirector.length, ebrSinDirector);
console.log('4. IE EBR cuyo Director no tiene DNI de 8 dígitos:', ebrDirectorSinDni.length, ebrDirectorSinDni);
console.log('5. IE EBR sin Teléfono de Director:', ebrDirectorSinTel.length, ebrDirectorSinTel.slice(0, 10));
console.log('6. IE EBR sin Correo de Director:', ebrDirectorSinCorreo.length, ebrDirectorSinCorreo.slice(0, 10));
