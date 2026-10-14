const fs = require('fs');
let lines = fs.readFileSync('public/js/ui.js', 'utf8').split('\n');
// We want to replace lines 12302 to 12338 (0-indexed 12301 to 12337)
// Line 12302 in 1-based is index 12301
// It currently is:       if (!newRed || newRed === '—') {
// We want to insert the proper closing.
const newLines = [
  "        newRed = 'No aplica';",
  "        needUpdate = true;",
  "      }",
  "    }"
];
lines.splice(12302, 36, ...newLines);
fs.writeFileSync('public/js/ui.js', lines.join('\n'), 'utf8');
console.log('Spliced lines successfully');
