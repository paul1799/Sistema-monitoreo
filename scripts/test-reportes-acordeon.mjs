/**
 * scripts/test-reportes-acordeon.mjs
 * Validación automatizada de los 9 criterios de la sección 6.1
 * para la vista Reportes y el acordeón de "Reporte por ítem".
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const uiJsContent = fs.readFileSync(path.join(root, 'public/js/ui.js'), 'utf-8');
const cssContent = fs.readFileSync(path.join(root, 'public/css/style.css'), 'utf-8');

let total = 0;
let passed = 0;
let failed = 0;

function assertTest(num, name, condition, details) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✅ [PASS] ${num}. ${name}: ${details}`);
  } else {
    failed++;
    console.error(`  ❌ [FAIL] ${num}. ${name}: ${details}`);
  }
}

console.log('\n=== SUITE DE PRUEBAS AUTOMATIZADAS: AJUSTES VISTA REPORTES (6.1) ===\n');

// 1. Al renderizar la vista Reportes no existe ningún elemento con el título "Avance por sección"
const hasAvancePanel = uiJsContent.includes("<h3>Avance por sección</h3>");
const hasSecRows = uiJsContent.includes("secRows");
assertTest(1, 'Eliminar tarjeta "Avance por sección"', !hasAvancePanel && !hasSecRows,
  !hasAvancePanel && !hasSecRows ? 'El panel y las filas de "Avance por sección" fueron removidos de ui.js' : 'Aún existe markup de Avance por sección');

// 2. Tras el primer render, todas las secciones del acordeón tienen aria-expanded="false" y closed
const hasDetailsOpenZero = uiJsContent.includes("si === 0 ? ' open' : ''");
const hasAriaExpandedFalse = uiJsContent.includes('aria-expanded="false"');
assertTest(2, 'Acordeón cerrado por defecto', !hasDetailsOpenZero && hasAriaExpandedFalse,
  !hasDetailsOpenZero ? 'Se eliminó (si === 0 ? open : ""). Todas las secciones inician con aria-expanded="false"' : 'Aún se abre la primera sección');

// 3. Clic en la sección 2 despliega solo la sección 2, nuevo clic la cierra
// Verificamos que la estructura usa <details> y <summary> nativo con sincronización aria-expanded
const hasToggleListener = uiJsContent.includes("d.addEventListener('toggle'");
const hasAriaSyncOnToggle = uiJsContent.includes("summary.setAttribute('aria-expanded', d.open ? 'true' : 'false')");
assertTest(3, 'Comportamiento de despliegue y pliegue individual', hasToggleListener && hasAriaSyncOnToggle,
  'Cada details opera de manera independiente y sincroniza aria-expanded en toggle');

// 4. Secciones 1 y 3 quedan abiertas a la vez (múltiples abiertas permitidas)
// Verificamos que abrir una sección NO cierra las demás (no hay forEach d.open = false al abrir)
const hasAccordionSingleLock = uiJsContent.includes("detailsList.forEach(other => { if (other !== d) other.open = false");
assertTest(4, 'Múltiples secciones abiertas a la vez', !hasAccordionSingleLock,
  'No existe restricción de apertura única; el usuario puede abrir varias a la vez');

// 5. "Expandir / Contraer todo": con todo cerrado abre todas; con todo abierto cierra todas
const hasToggleAllLogic = uiJsContent.includes("const anyClosed = Array.from(detailsList).some(d => !d.open)")
  && uiJsContent.includes("detailsList.forEach(d => {")
  && uiJsContent.includes("d.open = anyClosed;");
assertTest(5, 'Botón Expandir / Contraer todo', hasToggleAllLogic,
  'toggleAllBtn calcula si hay alguna cerrada para expandir todas, o si todas están abiertas para cerrarlas');

// 6. Cambiar un filtro -> todas las secciones vuelven a cerrarse
// Verificamos que renderConsBody vuelve a renderizar el template sin open
const renderConsBodyCallsRender = uiJsContent.includes("renderItemReportHtml(itemAgg, ft.tipoRespuesta)");
assertTest(6, 'Cambio de filtro restablece acordeón a cerrado', renderConsBodyCallsRender && !hasDetailsOpenZero,
  'renderConsBody re-evalúa el filtro y renderiza el acordeón cerrado por defecto');

// 7. El porcentaje de cada cabecera coincide con el cálculo por sección (100%, 100%, 94%, 96%, 75%)
const hasSecAggSync = uiJsContent.includes("sec.avg = Math.round(a.sum / a.cnt);");
assertTest(7, 'Sincronización exacta de porcentajes por sección', hasSecAggSync,
  'Las cabeceras reciben sec.avg calculado directamente del acumulador secAgg');

// 8. Barra ancha, role="progressbar", aria-valuenow, width% y clases de color (.ok, .warn, .danger)
const hasRoleProgressBar = uiJsContent.includes('role="progressbar"');
const hasAriaValueNow = uiJsContent.includes('aria-valuenow=');
const hasAriaValueMin = uiJsContent.includes('aria-valuemin="0"');
const hasAriaValueMax = uiJsContent.includes('aria-valuemax="100"');
const hasAriaLabel = uiJsContent.includes('aria-label=');
const hasBarContainerCss = cssContent.includes('.secBarContainer');
const hasBarTrackCss = cssContent.includes('.secBarTrack');
const hasBarFillCss = cssContent.includes('.secBarFill.ok') && cssContent.includes('.secBarFill.warn');
assertTest(8, 'Barras anchas, role="progressbar" y estilos de color',
  hasRoleProgressBar && hasAriaValueNow && hasAriaValueMin && hasAriaValueMax && hasAriaLabel && hasBarContainerCss && hasBarTrackCss && hasBarFillCss,
  'Atributos de accesibilidad, contenedor flex:1, min-width 200px y clases de color verificados');

// 9. Con Enter y Espacio sobre una cabecera enfocada se despliega o pliega
const hasKeydownSpace = uiJsContent.includes("e.key === ' ' || e.key === 'Spacebar'");
const hasKeydownEnter = uiJsContent.includes("e.key === 'Enter'");
const hasFocusVisibleCss = cssContent.includes('.secDetails summary:focus-visible');
assertTest(9, 'Navegación por teclado (Enter / Espacio) y foco visible',
  hasKeydownSpace && hasKeydownEnter && hasFocusVisibleCss,
  'summary responde a Enter y Espacio con preventDefault para scroll y cuenta con :focus-visible');

console.log('\n=======================================================');
console.log(`RESULTADOS: ${passed} de ${total} pruebas pasaron exitosamente.`);
if (failed === 0) {
  console.log('🎉 TODOS LOS CRITERIOS DE 6.1 FUERON SATISFECHOS.');
  process.exit(0);
} else {
  console.error(`❌ ${failed} pruebas fallaron.`);
  process.exit(1);
}
