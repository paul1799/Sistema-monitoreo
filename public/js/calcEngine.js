/* =========================================================================
   calcEngine.js — Puente de conexión (Bridge) del Motor de Cálculo Puro
   UGEL 03 · AGEBRE · Fase 1

   Este archivo actúa como puente retrocompatible para todas las importaciones
   del sistema. La lógica modularizada se encuentra en el directorio /calc/:
     - ./calc/escalas.js      : Escalas de respuesta y normalización de ítems
     - ./calc/reglas.js       : Reglas oficiales predefinidas (JEC, EBR, etc.)
     - ./calc/detectors.js    : Detectores y discriminadores de plantillas
     - ./calc/evaluador.js    : Evaluación de estados, rangos y descripciones
     - ./calc/score-engine.js : Motor de puntuación calcScore
   ========================================================================= */

export * from './calc/index.js';
