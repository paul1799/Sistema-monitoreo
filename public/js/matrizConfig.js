/**
 * matrizConfig.js — Puente de conexión (Bridge) para Configuración de la Matriz Excel
 * UGEL 03 · AGEBRE
 *
 * Este archivo actúa como puente retrocompatible para todas las importaciones
 * del sistema. La lógica modularizada se encuentra en el directorio /matriz/:
 *   - ./matriz/estilos.js          : Paleta de colores, bordes y helpers de celda
 *   - ./matriz/limites.js          : Cortes y límites de nivel por ficha
 *   - ./matriz/items-jec.js        : Indicadores y mapeos oficiales de Modelo JEC
 *   - ./matriz/items-tutoria.js    : 21 ítems oficiales de Coordinador(a) de Tutoría
 *   - ./matriz/items-pedagogico.js : 17 ítems oficiales de Coordinador(a) Pedagógico
 *   - ./matriz/config-generator.js : Generador getMatrizConfig
 */

export * from './matriz/index.js';
