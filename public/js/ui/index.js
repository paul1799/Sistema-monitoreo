/* =========================================================================
   ui/index.js — Punto de entrada unificado y exportaciones del subsistema UI
   ========================================================================= */

// Utilidades base del DOM, texto, fechas y scroll
export * from './core-utils.js?v=20261103_v8';

// Gestión centralizada de estado de aplicación, sesión y edición
export * from './state.js';

// Reglas de puntuación, agregación y visualización de indicadores
export * from './scoring.js?v=20261103_v8';

// Diálogos modales: confirmación de logout y configuración de descargas
export * from './modales.js?v=20261103_v8';

// Navegación global, barras de pestañas y botones de cabecera
export * from './navigation.js?v=20261103_v8';

// Panel de control y métricas resumidas globales
export * from './dashboard.js?v=20261103_v8';

// Pestaña de alertas tempranas
export * from './alertas.js?v=20261103_v8';

// Administración de usuarios y roles
export * from './usuarios.js?v=20261103_v8';

// Directorio y gestión de directivos / responsables
export * from './responsables-tab.js?v=20261103_v8';

// Directorio y gestión de colegios / instituciones educativas
export * from './colegios-tab.js?v=20261103_v8';

// Concursos escolares y consolidados
export * from './concursos-tab.js?v=20261103_v8';

// Reportes y reglas JEC (3 momentos)
export * from './jec-reportes.js?v=20261103_v8';

// Formulario dinámico de registro y edición de fichas
export * from './registrar.js?v=20261112_v1';

// Vista consolidada, reportes ejecutivos, filtros y pendientes
export * from './consolidado.js?v=20261112_v1';

// Gestor y diseñador visual de tipos de ficha y plantillas
export * from './plantillas.js?v=20261103_v8';
