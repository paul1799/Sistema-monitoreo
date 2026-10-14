# Organización de Scripts — Sistema de Monitoreo UGEL 03

Para facilitar la auditoría, mantenimiento y extensibilidad del sistema, los archivos de la carpeta `scripts/` están agrupados por tipo en subcarpetas especializadas, manteniendo shims de compatibilidad en la raíz de `scripts/` para que ningún comando ni automatización pierda conexión.

---

## Estructura de Subcarpetas

### 1. `scripts/seeds/` — Siembra de Datos Iniciales en Firestore
Scripts y archivos JSON utilizados para inicializar o actualizar las colecciones base de la base de datos Firestore:
- `seed.js`: Script principal de siembra de fichas base (EBR, directivo, JEC, rúbricas).
- `seed-fichaTypes.json`: Definición completa de tipos de ficha base.
- `seed-plantillas-fase2.js`: Siembra de fichas de Fase 2 (PRITE, CEBE Lectora, EBR 1er Momento).
- `seed-plantillas-fase2.json`: Esquema JSON oficial de las 3 plantillas de Fase 2.
- `seed-concursos.js`: Siembra de tipos de concurso escolar en la colección `tiposConcurso`.
- `seed-concursos.json`: Configuración de modalidades, categorías y roles de concursos.
- `seed-areas-firmantes.js`: Siembra de áreas de firma y plantillas de firmantes institucionales.
- `migrate-phase1.js`: Script de migración estructural de fichas Fase 1.

### 2. `scripts/data/` — Fuentes de Datos e Insumos
Archivos de datos brutos, tablas maestras y credenciales:
- `concurso-data.json`: Base de datos de registros de concursos escolares.
- `concursos-data.json`: Archivo complementario de datos de concursos.
- `concursos-revision.csv`: Archivo tabular para auditoría y validación de concursos.
- `serviceAccountKey.json`: Clave privada de cuenta de servicio de Firebase Admin.

### 3. `scripts/tests/` — Pruebas Automatizadas y Auditorías
Suites de prueba en JavaScript, MJS y PowerShell para validar la integridad del sistema:
- `smoke-test.ps1`: Prueba de humo de integridad front-end, layout y sintaxis CSS.
- `test-tablero-ebr.js`: Validación de la ficha EBR y extracción de datos Excel.
- `test-directivo-registration.ps1`: Verificación de registro de directivos, rúbricas y estados.
- `test-jfen.ps1`: Comprobación de filtros en cascada y exportación PDF de JFEN.
- `test-calc-engine.mjs`: Pruebas unitarias del motor de cálculo de porcentajes y escalas.
- `test-ebr-visitas-responsable.mjs`: Validación de visitas 1 y 2 con responsables independientes.
- `test-reportes-acordeon.mjs`: Validación del acordeón por ítem en reportes estadísticos.
- `test-matriz-seguimiento.ps1`: Validación de exportación y matriz de seguimiento.
- `test-pdf-*.ps1` / `test-pdf-*.js`: Pruebas de generación y flujo continuo de documentos PDF.
- `audit-*.ps1` / `auditar-faltantes.js`: Auditorías de estado, funciones no definidas y alcance.
- `test-no-alteration.js`: Control de sumas SHA-256 e integridad de datos.

### 4. `scripts/tools/` — Herramientas Administrativas y Utilidades
Utilidades para administración del sistema, generación de muestras y servidores de prueba:
- `create-accounts.js`: Creación y actualización de cuentas de usuario en Firebase Auth.
- `set-admin.js`: Asignación directa del rol Administrador a un usuario por correo.
- `import-concursos.js`: Importador masivo de participantes de concursos hacia Firestore.
- `check-syntax.js`: Verificación rápida de sintaxis de archivos JavaScript.
- `debug-ugel.js`: Inspección de datos y consistencia de códigos modulares UGEL.
- `serve.ps1`: Servidor estático HTTP ligero en PowerShell puro para pruebas locales.
- `analizar-plantilla.js`: Análisis e inspección de estructura en plantillas Excel.
- `generar-pdfs-muestra.js`: Generación de PDFs de muestra oficiales (Visitas 1 y 2).
- `build-sample-files.ps1` / `generate-redesigned-jec-sample.ps1`: Generadores de archivos de muestra JEC.

### 5. `scripts/patches/` — Parches y Correcciones Históricas
Scripts de aplicación de parches y refactorizaciones previas:
- `patch-ui.js`: Parche de mejoras en interfaz de usuario.
- `patch-exportar-matriz.ps1`: Parche para lógica de exportación de matriz.
- `patch-matriz-config.ps1`: Configuración de estilos y formato de matriz.
- `phase3_patch.js` / `phase4_patch.js`: Parches acumulativos de fases de desarrollo.
- `fix-lines.js`: Utilidad para ajuste de líneas y saltos de texto.

---

## Shims de Conexión y Compatibilidad

Para garantizar que comandos existentes no fallen (por ejemplo `node scripts/seed.js` o `npm run seed`), en la raíz de `scripts/` se mantienen archivos puente (*shims*) que redirigen la ejecución al módulo correspondiente dentro de la subcarpeta adecuada.
