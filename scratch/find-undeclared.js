const fs = require('fs');
const path = require('path');

const uiDir = path.resolve('public/js/ui');
const files = fs.readdirSync(uiDir).filter(f => f.endsWith('.js'));

const JS_GLOBALS = new Set([
  'window', 'document', 'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'Math', 'Date', 'String', 'Number', 'Boolean', 'Array', 'Object', 'Set', 'Map', 'RegExp', 'JSON',
  'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'Promise', 'URL', 'URLSearchParams',
  'FormData', 'Blob', 'File', 'FileReader', 'Event', 'CustomEvent', 'KeyboardEvent', 'MouseEvent',
  'alert', 'confirm', 'prompt', 'fetch', 'localStorage', 'sessionStorage', 'history', 'location',
  'navigator', 'screen', 'performance', 'crypto', 'atob', 'btoa', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'undefined', 'NaN', 'Infinity',
  'null', 'true', 'false', 'this', 'arguments', 'Infinity', 'Intl', 'requestAnimationFrame', 'cancelAnimationFrame',
  'DOMParser', 'XMLSerializer', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver', 'Node', 'Element',
  'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLButtonElement',
  'HTMLTableElement', 'HTMLTableRowElement', 'HTMLTableCellElement', 'HTMLDivElement', 'HTMLSpanElement',
  'HTMLParagraphElement', 'HTMLHeadingElement', 'HTMLAnchorElement', 'HTMLImageElement', 'HTMLFormElement',
  'HTMLDialogElement', 'Audio', 'Image', 'Option', 'self', 'globalThis', 'structuredClone', 'queueMicrotask',
  'b', 'c', 'e', 's', 'x', 'd', 'p', 'r', 't', 'k', 'v', 'i', 'j', 'm', 'n', 'u', 'el', 'ev', 'ft', 'it', 'st', 'fn', 'id', 'cb'
]);

files.forEach(file => {
  const code = fs.readFileSync(path.join(uiDir, file), 'utf8');
  
  const declared = new Set(JS_GLOBALS);
  
  // Named imports: import { a, b as c } from '...'
  const importNamedRegex = /import\s*\{([^}]+)\}\s*from/g;
  let match;
  while ((match = importNamedRegex.exec(code)) !== null) {
    match[1].split(',').forEach(item => {
      const parts = item.trim().split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      if (name) declared.add(name);
    });
  }
  
  // Namespace/default imports: import * as X from '...' or import X from '...'
  const importAllRegex = /import\s+(?:\*\s+as\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+))\s+from/g;
  while ((match = importAllRegex.exec(code)) !== null) {
    const name = match[1] || match[2];
    if (name) declared.add(name.trim());
  }

  // Top-level / inner declarations
  const declRegex = /\b(?:function\*?|const|let|var|class)\s+([a-zA-Z0-9_$]+)/g;
  while ((match = declRegex.exec(code)) !== null) {
    declared.add(match[1]);
  }

  // Function params
  const fnParamRegex = /function\s*[a-zA-Z0-9_$]*\s*\(([^)]*)\)/g;
  while ((match = fnParamRegex.exec(code)) !== null) {
    match[1].split(',').forEach(p => {
      const clean = p.trim().split(/[=:]/)[0].trim().replace(/^\.\.\./, '');
      if (clean && /^[a-zA-Z0-9_$]+$/.test(clean)) declared.add(clean);
    });
  }

  // Standalone function calls (NOT preceded by '.' or '?.' or ':')
  // We match (?<![\.\?\$a-zA-Z0-9_])([a-zA-Z0-9_$]+)\s*\(
  const callRegex = /(?<![\.\?\$a-zA-Z0-9_])([a-zA-Z0-9_$]+)\s*\(/g;
  const unknownCalls = new Set();
  const KEYWORDS = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof',
    'delete', 'void', 'import', 'await', 'new', 'yield', 'super', 'case', 'else'
  ]);

  while ((match = callRegex.exec(code)) !== null) {
    const fnName = match[1];
    if (KEYWORDS.has(fnName)) continue;
    if (!declared.has(fnName)) {
      unknownCalls.add(fnName);
    }
  }

  if (unknownCalls.size > 0) {
    console.log(`[${file}] Potentially undeclared function calls:`, Array.from(unknownCalls).join(', '));
  }
});
