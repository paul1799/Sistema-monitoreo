import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

console.log('=== TEST 1: Verificación de eliminación de botón duplicado de cambiar ficha en CEBE y PRITE ===');
const cebeJs = fs.readFileSync('public/js/cebe-gestion.js', 'utf8');
const priteJs = fs.readFileSync('public/js/prite-gestion.js', 'utf8');

assert(!cebeJs.includes('id="btnCambiarFichaDesdeCebe"'), 'CEBE no debe tener btnCambiarFichaDesdeCebe en el banner');
assert(!priteJs.includes('id="btnCambiarFichaDesdePrite"'), 'PRITE no debe tener btnCambiarFichaDesdePrite en el banner');
console.log('✓ TEST 1 PASSED: Botón duplicado eliminado de encabezados de CEBE y PRITE.');

console.log('=== TEST 2: Verificación de eliminación de datalist negro en 1er Momento JEC ===');
const jec1Js = fs.readFileSync('public/js/jec-1er-monitoreo.js', 'utf8');

assert(!jec1Js.includes('dl_colegios_jec1'), 'JEC 1er Momento no debe tener datalist ni atributo list');
assert(!jec1Js.includes('<datalist'), 'JEC 1er Momento no debe contener etiquetas <datalist>');
assert(jec1Js.includes('id="jec1_ie_dropdown"'), 'JEC 1er Momento debe conservar su dropdown limpio personalizado');
console.log('✓ TEST 2 PASSED: Datalist nativo negro eliminado de JEC 1er Momento.');

console.log('=== TEST 3: Verificación de banner en vivo estilo 2do Momento en 1er Momento JEC ===');
assert(jec1Js.includes('id="jec1_live_header"'), 'JEC 1er Momento debe tener el contenedor del banner flotante #jec1_live_header');
assert(jec1Js.includes('id="jec1_live_badge"'), 'JEC 1er Momento debe tener la insignia de nivel en vivo');
assert(jec1Js.includes('id="jec1_live_count_text"'), 'JEC 1er Momento debe tener el texto de conteo de puntos');
assert(jec1Js.includes('id="jec1_live_progress_bar"'), 'JEC 1er Momento debe tener la barra de progreso de avance');
assert(!jec1Js.includes('jec1-live-badge-bar'), 'JEC 1er Momento ya no debe tener el antiguo banner oscuro jec1-live-badge-bar');
console.log('✓ TEST 3 PASSED: Banner en vivo estilo 2do Momento implementado correctamente.');

console.log('=== TEST 4: Verificación de eliminación de resultado redundante en cuadro de valoraciones ===');
assert(!jec1Js.includes('jec1-scale-level-box'), 'JEC 1er Momento no debe tener el cuadro redundante jec1-scale-level-box debajo de la tabla');
console.log('✓ TEST 4 PASSED: Resultado redundante eliminado del cuadro de valoraciones.');

console.log('=== TEST 5: Verificación de barra inferior fija flotante (formBottomBar) en 1er Momento JEC ===');
assert(jec1Js.includes('class="formBottomBar"'), 'JEC 1er Momento debe usar la barra inferior .formBottomBar');
assert(jec1Js.includes('id="regProgressBadge"'), 'JEC 1er Momento debe tener el indicador de avance #regProgressBadge en la barra');
assert(jec1Js.includes('id="cancelFormBtn"'), 'JEC 1er Momento debe tener el botón Cancelar #cancelFormBtn');
assert(jec1Js.includes('id="saveFormBtn"'), 'JEC 1er Momento debe tener el botón Guardar #saveFormBtn');
assert(!jec1Js.includes('onsubmit="return false;"'), 'JEC 1er Momento no debe tener onsubmit="return false;" en su formulario');
console.log('✓ TEST 5 PASSED: Barra inferior fija flotante implementada correctamente.');

console.log('=== TEST 6: Verificación de auto-población de Director y Subdirectores en 1er Momento JEC ===');
assert(jec1Js.includes('getDirectivosActivosForColegio'), 'JEC 1er Momento debe invocar getDirectivosActivosForColegio al seleccionar colegio');
assert(jec1Js.includes('jec1erState.director = dirData'), 'JEC 1er Momento debe asignar dirData al estado de directores');
assert(jec1Js.includes('jec1erState.subdirectores = subList'), 'JEC 1er Momento debe asignar subList al estado de subdirectores');
assert(jec1Js.includes('subTbody.innerHTML = renderSubdirectoresRowsHtml(subList)'), 'JEC 1er Momento debe re-renderizar la tabla de subdirectores');
console.log('✓ TEST 6 PASSED: Auto-población de Director y Subdirectores verificada.');

console.log('\n======================================================');
console.log('🎉 TODOS LOS 6 TESTS DE VALIDACIÓN PASARON EXITOSAMENTE');
console.log('======================================================');
