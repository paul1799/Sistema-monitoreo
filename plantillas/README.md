# Directorio de Plantillas — Sistema de Monitoreo UGEL 03 (2026)

Este directorio contiene todas las plantillas oficiales del sistema, tanto en formatos estructurados **JSON** (para carga directa e importación en Firestore y el motor de fichas dinámicas) como en formatos **Excel (.xlsx)** (para matrices maestras y tableros de seguimiento).

---

## 1. Plantillas de Ficha en Formato JSON

| Archivo | ID de Ficha | Denominación Oficial | Marco Normativo |
| :--- | :--- | :--- | :--- |
| t_gestion_ugel03_ebr.json | t_gestion_ugel03_ebr | Monitoreo a la Gestión Escolar EBR (5 Compromisos de Gestión) | RVM N° 045-2022-MINEDU |
| t_ebr_gestion_1er.json | t_ebr_gestion_1er | Ficha de Monitoreo a la Gestión Escolar EBR - 1er Momento | UGEL 03 / MINEDU |
| t_directivo.json | t_directivo | Ficha de Monitoreo al Desempeño del Directivo | RM N° 587-2023-MINEDU |
| t_rubricas_aula.json | t_rubricas_aula | Rúbricas de Observación de Aula para la Evaluación Docente | MINEDU / CNE |
| t_gestion_cebe.json | t_gestion_cebe | Ficha de Monitoreo a la Gestión Escolar CEBE (EBE) | RM N° 501-2025-MINEDU |
| t_cebe_lectora.json | t_cebe_lectora | Monitoreo a la Estrategia Lectora en CEBE | UGEL 03 / EBE |
| t_materiales_cebe.json | t_materiales_cebe | Verificación de Materiales Educativos y Adaptaciones CEBE | UGEL 03 / EBE |
| t_prite_gestion.json | t_prite_gestion | Ficha de Gestión Escolar PRITE — Monitoreo Multi-Visita (3 Visitas) | RM N° 501-2025-MINEDU |
| t_msejec_2do.json | t_msejec_2do | Ficha de Monitoreo a la Gestión del Modelo de Servicio Educativo JEC | RVM N° 326-2019-MINEDU |
| t_coord_tutoria_jec.json | t_coord_tutoria_jec | Monitoreo al Coordinador de Tutoría y Orientación Educativa JEC | RVM N° 326-2019-MINEDU |
| plantilla_concursos_escolares.json | concursos | Configuración de Concursos Escolares (JEDPA, JFEN, ONEM, JMA, etc.) | Directivas MINEDU 2026 |
| catalogo_maestro_plantillas.json | *Todos* | Consolidado maestro con todas las plantillas del sistema para siembra | Sistema UGEL 03 |

---

## 2. Plantillas de Tableros y Matrices en Formato Excel (.xlsx)

| Archivo | Descripción | Uso en el Sistema |
| :--- | :--- | :--- |
| MATRIZ_DE_SEGUIMIENTO_2026_MODELO_JEC.xlsx | Matriz oficial de seguimiento de metas e indicadores del Modelo JEC | Insumo para generación y exportación masiva JEC |
| TABLERO_MONITOREO_GESTION_EBR_II_MOMENTO_20261001.xlsx | Tablero de monitoreo de gestión EBR - II Momento actualizado (2026) | Base del motor de cálculo EBR y Visitas 1 y 2 |
| TABLERO_MONITOREO_GESTION_II_MOMENTO.xlsx | Tablero de monitoreo de gestión consolidado histórico y comparativo | Validación y control de regresión de datos |

---

## 3. Uso y Conectividad

- **Carga en Firestore**: Los archivos JSON pueden sembrarse en Firestore usando el script scripts/seeds/seed.js o scripts/seeds/seed-plantillas-fase2.js.
- **Motor Web Dinámico**: public/js/plantillaEngine.js y public/js/ui.js leen las definiciones de bloques (cuadro_estudiantes, cuadro_personal, escala_licert, compromisos_visita, etc.).
- **Auditoría**: Cualquier ajuste en el número de ítems, peso o redacción de indicadores puede auditarse directamente inspeccionando el archivo .json correspondiente.