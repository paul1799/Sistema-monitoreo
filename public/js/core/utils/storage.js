/**
 * storage.js — Utilidad de almacenamiento seguro con fallback en memoria
 * UGEL 03 · AGEBRE
 *
 * Protege contra bloqueos de 'Tracking Prevention' (Microsoft Edge),
 * modo incógnito estricto y restricciones de almacenamiento de terceros.
 */

const memoryStore = new Map();

export const safeStorage = {
  getItem(key, defaultValue = null) {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        const val = window.sessionStorage.getItem(key);
        if (val !== null && val !== undefined) return val;
      }
    } catch (_) {}
    return memoryStore.has(key) ? memoryStore.get(key) : defaultValue;
  },

  setItem(key, value) {
    const strVal = String(value);
    memoryStore.set(key, strVal);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, strVal);
      }
    } catch (_) {}
  },

  removeItem(key) {
    memoryStore.delete(key);
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (_) {}
  },

  clear() {
    memoryStore.clear();
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (_) {}
  }
};

export function safeSessionGet(key, defaultValue = null) {
  return safeStorage.getItem(key, defaultValue);
}

export function safeSessionSet(key, value) {
  safeStorage.setItem(key, value);
}

export function safeSessionRemove(key) {
  safeStorage.removeItem(key);
}
