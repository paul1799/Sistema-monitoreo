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
  'Headers', 'Request', 'Response'
]);

function stripCode(src) {
  // Strip block comments /* ... */
  let s = src.replace(/\/\*[\s\S]*?\*\//g, ' ');
  // Strip line comments // ...
  s = s.replace(/\/\/.*$/gm, ' ');
  
  // Replace string literals with spaces (preserving length / newlines)
  // Simple state machine to strip strings and template literals
  let out = '';
  let inStr = null; // '"', "'", '`'
  let isEscaped = false;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (isEscaped) {
        isEscaped = false;
        out += ' ';
      } else if (ch === '\\') {
        isEscaped = true;
        out += ' ';
      } else if (ch === inStr) {
        inStr = null;
        out += ' ';
      } else {
        // In template string, check for ${
        if (inStr === '`' && ch === '$' && s[i+1] === '{') {
          // We can just keep the interpolation! But for now let's keep it simple
        }
        out += (ch === '\n' ? '\n' : ' ');
      }
    } else {
      if (ch === '"' || ch === "'" || ch === '`') {
        inStr = ch;
        out += ' ';
      } else {
        out += ch;
      }
    }
  }
  return out;
}

files.forEach(file => {
  const rawCode = fs.readFileSync(path.join(uiDir, file), 'utf8');
  
  const declared = new Set(JS_GLOBALS);

  // 1. Collect named imports
  const importNamedRegex = /import\s*\{([^}]+)\}\s*from\s*['"][^'"]+['"]/g;
  let match;
  while ((match = importNamedRegex.exec(rawCode)) !== null) {
    match[1].split(',').forEach(item => {
      const parts = item.trim().split(/\s+as\s+/);
      const name = (parts[1] || parts[0]).trim();
      if (name) declared.add(name);
    });
  }

  // 2. Collect default / star imports
  const importAllRegex = /import\s+(?:\*\s+as\s+([a-zA-Z0-9_$]+)|([a-zA-Z0-9_$]+))\s+from/g;
  while ((match = importAllRegex.exec(rawCode)) !== null) {
    const name = (match[1] || match[2]).trim();
    if (name) declared.add(name);
  }

  // 3. Collect declarations
  const declRegex = /\b(?:function\*?|const|let|var|class)\s+([a-zA-Z0-9_$]+)/g;
  while ((match = declRegex.exec(rawCode)) !== null) {
    declared.add(match[1]);
  }

  // 4. Collect function params
  const fnParamRegex = /function\s*[a-zA-Z0-9_$]*\s*\(([^)]*)\)/g;
  while ((match = fnParamRegex.exec(rawCode)) !== null) {
    match[1].split(',').forEach(p => {
      const clean = p.trim().split(/[=:]/)[0].trim().replace(/^\.\.\./, '');
      if (clean && /^[a-zA-Z0-9_$]+$/.test(clean)) declared.add(clean);
    });
  }

  // Also catch destructuring in const { a, b } = ...
  const destrRegex = /(?:const|let|var)\s*\{([^}]+)\}\s*=/g;
  while ((match = destrRegex.exec(rawCode)) !== null) {
    match[1].split(',').forEach(p => {
      const parts = p.trim().split(':');
      const clean = (parts[1] || parts[0]).trim().split('=')[0].trim();
      if (clean && /^[a-zA-Z0-9_$]+$/.test(clean)) declared.add(clean);
    });
  }

  // Strip code to find standalone function calls in stripped code
  const stripped = stripCode(rawCode);

  const callRegex = /(?<![\.\?\$a-zA-Z0-9_])([a-zA-Z0-9_$]+)\s*\(/g;
  const KEYWORDS = new Set([
    'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof',
    'delete', 'void', 'import', 'await', 'new', 'yield', 'super', 'case', 'else'
  ]);

  const unknownCalls = new Set();
  while ((match = callRegex.exec(stripped)) !== null) {
    const fnName = match[1];
    if (KEYWORDS.has(fnName)) continue;
    if (!declared.has(fnName)) {
      unknownCalls.add(fnName);
    }
  }

  if (unknownCalls.size > 0) {
    console.log(`[${file}] Undeclared function calls:`, Array.from(unknownCalls).join(', '));
  }
});
