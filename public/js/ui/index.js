/* =========================================================================
   ui/index.js — Punto de entrada unificado y exportaciones del subsistema UI
   ========================================================================= */

// Utilidades base del DOM, texto, fechas y scroll
export * from './core-utils.js';

// Gestión centralizada de estado de aplicación, sesión y edición
export * from './state.js';

// Reglas de puntuación, agregación y visualización de indicadores
export * from './scoring.js';

// Diálogos modales: confirmación de logout y configuración de descargas
export * from './modales.js';

// Navegación global, barras de pestañas y botones de cabecera
export * from './navigation.js';

// Panel de control y métricas resumidas globales
export * from './dashboard.js';

// Pestaña de alertas tempranas
export * from './alertas.js';

// Administración de usuarios y roles
export * from './usuarios.js';

// Directorio y gestión de directivos / responsables
export * from './responsables-tab.js';

// Directorio y gestión de colegios / instituciones educativas
export * from './colegios-tab.js';

// Concursos escolares y consolidados
export * from './concursos-tab.js?v=20261019_v2';

// Reportes y reglas JEC (3 momentos)
export * from './jec-reportes.js';

// Formulario dinámico de registro y edición de fichas
export * from './registrar.js';

// Vista consolidada, reportes ejecutivos, filtros y pendientes
export * from './consolidado.js';

// Gestor y diseñador visual de tipos de ficha y plantillas
export * from './plantillas.js';
