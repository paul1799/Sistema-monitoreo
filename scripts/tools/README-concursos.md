# Datos de Concursos extraídos de las Resoluciones Directorales (UGEL 03, 2026)

## Qué contiene esta carpeta

- **concursos-revision.csv** — ábrelo en Excel para revisar todo antes de importar. Una fila por registro (institución + categoría), con los participantes y asesores en columnas de texto.
- **concurso-data.json** — los mismos datos, en el formato que espera Firestore (usado por el script de importación).
- **import-concursos.js** — script para cargar todo a tu base de datos de un solo golpe (mismo patrón que `scripts/seed.js`).

## Resumen de lo extraído

| Concurso | Registros | Personas |
|---|---|---|
| Premio Nacional José María Arguedas | 4 | 8 |
| Olimpiada Nacional Escolar de Matemática (ONEM) | 24 | 48 |
| Concurso Nacional de Comprensión Lectora El Perú Lee | 5 | 18 |
| Feria Escolar Nacional de Ciencia y Tecnología Eureka | 6 | 18 |
| Juegos Florales Escolares Nacionales (JFEN) | 29 | ~90 |
| Juegos Escolares Deportivos y Paradeportivos (JEDPA) | 112 | ~368 |
| **Total** | **180** | **~626** |

Cada registro trae: tipo de concurso, etapa (todos "UGEL", ya que son los ganadores de esa etapa acreditados para pasar a la siguiente), categoría, género y disciplina/área cuando aplica, institución educativa, título del trabajo/proyecto cuando aplica, puesto, y las listas de participantes y asesores con su DNI.

## ⚠️ Puntos clave de compatibilidad

1. **JEDPA: dos resoluciones modifican los datos base.**
   - `RD 05307-2026-UGEL03` corrige el **delegado** de Natación Categoría B (Damas y Varones).
   - `RD 05320-2026-UGEL03` agrega entrenadores y delegados que se habían omitido en Natación Categoría A (Damas y Varones) y en varios otros bloques de Categoría C.
2. **DNIs**: Extraídos de las tablas oficiales de las Resoluciones Directorales.
3. **Puestos**: En Perú Lee y JEDPA las resoluciones acreditan a los clasificados, por lo que el campo puesto queda vacío.
4. **Cruce con padrón de instituciones**: En JMA, ONEM y Perú Lee las resoluciones solo incluyen el nombre de la IE; el script y la UI cruzan automáticamente con el padrón para vincular código modular, RED y distrito.

## Cómo importar

### Opción A (Desde la Web UI - 1 Clic):
En la pestaña **🏆 Concursos** -> **Ver consolidado** o **Tipos de concurso**, haz clic en el botón:
`📥 Importar ganadores oficiales (RD UGEL 03)`

### Opción B (Con Node.js CLI):
```bash
node scripts/import-concursos.js
```
*(Requiere colocar `serviceAccountKey.json` en la carpeta `scripts/`)*
