/* =========================================================================
   core/utils/clean.js — Sanitización y limpieza de datos para Firestore
   UGEL 03 · Sistema de Monitoreo y Acompañamiento 2026
   ========================================================================= */

import { fixUtf8Mojibake } from './text.js';

/** Limpia recursivamente un objeto para Firestore: convierte undefined en "", NaN en 0 y sanea mojibake UTF-8 */
export function cleanForFirestore(val) {
  if (val === undefined) return '';
  if (typeof val === 'string') {
    return fixUtf8Mojibake(val);
  }
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (val === null || typeof val !== 'object') {
    return val;
  }
  if (val instanceof Date) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => cleanForFirestore(item));
  }
  const res = {};
  for (const k of Object.keys(val)) {
    const v = val[k];
    if (v === undefined) {
      res[k] = '';
    } else if (typeof v === 'number' && isNaN(v)) {
      res[k] = 0;
    } else if (v !== null && typeof v === 'object') {
      res[k] = cleanForFirestore(v);
    } else {
      res[k] = v;
    }
  }
  return res;
}

