# Sistematización de Fichas de Monitoreo — versión independiente (Firebase)

## 🆕 Última actualización: padrón de colegios, cobertura de monitoreo y login rediseñado

- **Pestaña "Colegios"** (nueva): padrón de instituciones educativas con REI,
  Código local, I.E., Modalidad, Nivel de servicio, Turnos, Tipo de Gestión,
  Dependencia, Dirección y Distrito. Cualquiera con sesión la puede ver; solo
  Administrador puede importar o editar el padrón.
  - **Importar desde Excel**: pega las columnas copiadas de tu Excel (con
    encabezado) y confirma tras revisar la vista previa — los colegios con el
    mismo Código local se actualizan en vez de duplicarse.
  - **Cobertura por REI**: colegios asignados vs. monitoreados y cumplimiento
    promedio, por REI.
  - **Colegios pendientes de monitoreo**: filtro de un clic para ver (y
    exportar a CSV) los colegios del padrón sin ninguna ficha registrada.
  - **Perfil del colegio**: al hacer clic en un colegio se ve su cruce con
    TODOS los tipos de ficha (N° de visitas, última visita, % de
    cumplimiento de cada tipo) — antes "Reportes" solo mostraba un tipo de
    ficha a la vez.
- **"Registrar ficha"**: si la institución que escribes coincide con el
  padrón, la ficha queda vinculada a ese colegio automáticamente (se
  autocompletan REI y Código local) para que los reportes de cobertura
  cuadren. Las fichas ya registradas antes del padrón se siguen mostrando
  igual (el cruce también intenta emparejarlas por nombre/código).
- **"Reportes"**: filtros nuevos por Distrito y Tipo de Gestión (usan el
  padrón), además de los que ya existían (RED, UGEL, Estado).
- **Login rediseñado**: mismo correo/contraseña de siempre, pantalla más
  clara con panel de marca + tarjeta de acceso y botón para mostrar/ocultar
  la contraseña.

### Para aplicar esta actualización a un sitio ya desplegado

```bash
firebase deploy --only firestore:rules,hosting
```

No hace falta correr `seed.js` ni tocar cuentas — esta actualización no
cambia tipos de ficha ni usuarios. Entra a la pestaña **"Colegios"** con tu
cuenta Administrador y usa "Mostrar formulario de importación" para pegar tu
padrón por primera vez.

---

## Login con correo/contraseña fijos + Reportes

- El login ya **no usa Google** — ahora es correo y contraseña reales
  (protegidos por Firebase, no escritos en el código), con las cuentas que
  tú definas en `scripts/create-accounts.js` (por defecto: una cuenta
  Administrador y una General).
- Ya no hay registro abierto: solo entran las cuentas que creaste con ese
  script. Debes correr **Authentication → Sign-in method → habilita
  "Correo electrónico/contraseña"** en Firebase Console (en vez de Google).
- La pestaña que antes se llamaba "Consolidado por tipo" ahora se llama
  **"Reportes"** (mismo contenido: gráficas, avance por sección, resumen
  por institución y descarga en PDF).

### Para aplicar este cambio a un sitio ya desplegado

```bash
firebase deploy --only firestore:rules,hosting
cd scripts
npm install
node seed.js
# Edita ACCOUNTS dentro de create-accounts.js con tus correos/claves, luego:
node create-accounts.js
```

Ve a Firebase Console → Authentication → Sign-in method → habilita
**Correo electrónico/contraseña** (y puedes deshabilitar Google si estaba
activo). Luego entra a tu sitio e inicia sesión con el correo y contraseña
que pusiste en `create-accounts.js`.

---

## 🔧 Arreglo urgente: "Cannot find module 'firebase-admin'" y no veo Admin

Si te pasó esto al correr `node scripts/seed.js`, es porque no se instalaron
las dependencias de la carpeta `scripts/`. Corrige así:

```bash
cd scripts
npm install
node seed.js
node set-admin.js TU_CORREO@gmail.com
```

`set-admin.js` te asigna el rol de Administrador directo, sin depender del
"primero que entra" (por si ese proceso ya falló una vez, como en tu caso).
Después, cierra sesión en el sitio y vuelve a entrar.

## 🆕 Esta actualización agrega

- **Campo RED** en el registro de cada ficha (además de UGEL), para poder
  filtrar por ahí.
- **Filtros nuevos en "Consolidado por tipo"**: por RED, por Estado de
  avance (Logrado / En proceso / Inicio) y por institución con
  autocompletado.
- **"Resumen por institución"**: una tabla tipo tablero de control (una
  fila por colegio, con RED, UGEL, N° de visitas, última visita y % de
  avance) — como en Power BI.
- **Botón "⬇ Descargar reporte (PDF)"** en Consolidado por tipo: descarga
  como PDF todo lo que se ve arriba de la tabla de fichas (tarjetas,
  gráfico de dona, avance por sección, evolución por visita y el resumen
  por institución), respetando los filtros que hayas aplicado.

### Para aplicar esta actualización a un sitio ya desplegado

```bash
firebase deploy --only firestore:rules
cd scripts && npm install && node seed.js && cd ..
firebase deploy --only hosting
```

---


## 🆕 Actualización: roles, alertas automáticas y gráficos

Esta versión agrega:

- **Roles reales (Administrador / General)** con Firebase Authentication —
  nada de usuario/contraseña escritos en el código. La primera persona que
  inicia sesión después de desplegar esto queda como **Administrador**
  automáticamente; todos los que entran después son **General** por
  defecto. Un administrador puede luego promover o degradar a cualquier
  otra persona desde la nueva pestaña **"Usuarios"**.
  - *Administrador*: todo lo de antes + administrar tipos de ficha +
    eliminar fichas registradas + gestionar usuarios.
  - *General*: registrar fichas y ver todos los reportes, pero no puede
    borrar datos ni tocar tipos de ficha o usuarios.
  - Esto se aplica también del lado del servidor, en `firestore.rules` —
    no es solo "ocultar botones" en la pantalla.
- **Pestaña "Alertas"**: cruza automáticamente institución + tipo de
  ficha + ítem exacto a partir de la visita más reciente de cada una, y
  marca en rojo los ítems en "Inicio" (bajo cumplimiento) o que bajaron
  fuerte respecto a la visita anterior — para saber al toque dónde
  intervenir primero.
- **Gráficos de dona** reemplazando las barras de distribución, en
  Resumen y en Consolidado por tipo (SVG nativo, sin depender de
  librerías externas).

### Para aplicar esta actualización a un sitio ya desplegado

Si ya habías desplegado una versión anterior (sin roles), hazlo en este
orden exacto:

```bash
# 1) Reglas de Firestore primero (para que los permisos ya existan)
firebase deploy --only firestore:rules

# 2) Vuelve a sembrar: esto crea meta/bootstrap sin tocar tus fichas existentes
cd scripts
npm install
node seed.js
cd ..

# 3) Publica el sitio actualizado
firebase deploy --only hosting
```

Luego, la próxima vez que entres a tu sitio y vuelvas a iniciar sesión,
quedarás como Administrador automáticamente (verás la etiqueta
"Administrador" junto a tu correo, abajo a la izquierda).

---


Esta es la misma herramienta que viste en Claude, pero convertida en un sitio
web independiente: no depende de claude.ai, corre en tu propio proyecto de
Firebase y cualquier persona con el enlace (y una cuenta autorizada) puede
usarla desde su navegador, sin instalar nada.

```
firebase-deploy/
  public/index.html      ← toda la aplicación (HTML+CSS+JS en un solo archivo)
  firebase.json           ← configuración de Hosting/Firestore
  firestore.rules         ← quién puede leer/escribir los datos
  firestore.indexes.json
  scripts/
    seed-fichaTypes.json  ← los 6 tipos de ficha que ya armamos
    seed.js                ← script para cargarlos a Firestore una sola vez
  functions/               ← OPCIONAL: lectura automática de fichas escaneadas con IA
```

## Qué necesitas

- Una cuenta de Google (para crear el proyecto de Firebase).
- Node.js instalado en tu computadora (para usar el CLI de Firebase).
- 15–20 minutos la primera vez.

No necesitas saber programar para desplegarlo — son comandos que copias y
pegas.

## 1. Tu proyecto de Firebase

Ya dejé tu configuración (`sistematizacion-fichas`) puesta en
`public/index.html` (bloque `FIREBASE_CONFIG`) y en `.firebaserc`, así que
puedes saltar directo a habilitar los servicios que la app necesita:

1. Ve a https://console.firebase.google.com → entra al proyecto
   **sistematizacion-fichas**.
2. **Firestore Database** → "Crear base de datos" → modo **producción** →
   elige una región cercana (p. ej. `southamerica-east1`).
3. **Authentication** → pestaña "Sign-in method" → habilita **Correo
   electrónico/contraseña** (Email/Password) como proveedor.

(Si en algún momento quieres apuntar esta carpeta a otro proyecto de
Firebase, edita `.firebaserc` o corre `firebase use --add`.)

## 2. Pegar tu configuración en el código

Este paso ya está hecho — `FIREBASE_CONFIG` en `public/index.html` ya
tiene los valores de tu proyecto. Solo revísalo si en algún momento creas
otra app web dentro del mismo proyecto de Firebase y quieres usar esa
configuración en su lugar.

## 3. Instalar el CLI de Firebase

Desde una terminal, dentro de la carpeta `firebase-deploy/`:

```bash
npm install -g firebase-tools
firebase login
```

(No necesitas correr `firebase use --add`: `.firebaserc` ya apunta a
`sistematizacion-fichas`.)

## 4. Desplegar Hosting y las reglas de Firestore

```bash
firebase deploy --only hosting,firestore:rules
```

Al terminar te dará una URL parecida a `https://tu-proyecto.web.app` — esa
es la dirección final de tu sistema.

## 5. Cargar los tipos de ficha y crear las cuentas de acceso

Esto solo se hace una vez.

1. En Firebase Console → **Configuración del proyecto** → **Cuentas de
   servicio** → "Generar nueva clave privada". Guarda el archivo
   descargado como `scripts/serviceAccountKey.json`.
   ⚠️ Este archivo da acceso administrativo total a tu proyecto — no lo
   subas a un repositorio público ni lo compartas.
2. Desde la carpeta `scripts/`:
   ```bash
   npm install
   node seed.js
   ```
   Deberías ver `Listo: 6 tipos de ficha sembrados en Firestore.`
3. Abre `scripts/create-accounts.js`, edita la lista `ACCOUNTS` con los
   correos y contraseñas que quieras usar (por defecto trae
   `agebre@ugel03.gob.pe` como Administrador y `generica@ugel03.gob.pe`
   como General — cámbialas por las que prefieras), y corre:
   ```bash
   node create-accounts.js
   ```
4. Borra o guarda en un lugar seguro `serviceAccountKey.json` — ya no lo
   necesitas para el uso normal del sistema (solo si más adelante quieres
   crear o modificar cuentas de nuevo).

## 6. Usar el sistema

Entra a la URL que te dio el paso 4 e inicia sesión con el correo y la
contraseña que definiste en `create-accounts.js`. Verás las pestañas
Resumen, Registrar ficha, Reportes y Alertas — y si entras con la cuenta
que marcaste como `admin`, además Tipos de ficha y Usuarios.

Este sistema **no tiene registro abierto**: solo pueden entrar las
cuentas que tú creaste con `create-accounts.js` (o agregaste a mano desde
Firebase Console → Authentication → Users). Para agregar una cuenta más
adelante, agrégala a la lista `ACCOUNTS` de ese script y vuelve a
correrlo.

## 7. (Opcional) Lectura automática de fichas escaneadas con IA

La opción "Cargar ficha escaneada" está **oculta por defecto** en esta
versión porque requiere un backend propio con tu propia clave de la API de
Anthropic (Claude) — es un servicio de pago aparte, distinto a Firebase.
Si la quieres activar:

1. Crea una cuenta y una API key en https://console.anthropic.com.
2. Sube tu proyecto de Firebase al plan **Blaze** (pago por uso) — lo
   necesitas para que las Cloud Functions hagan llamadas a internet.
3. Guarda tu API key como secreto:
   ```bash
   firebase functions:secrets:set ANTHROPIC_API_KEY
   ```
4. Despliega la función:
   ```bash
   firebase deploy --only functions:scanFicha
   ```
5. Copia la URL que te da ese despliegue y pégala en `public/index.html`,
   en la constante `AI_SCAN_ENDPOINT` (al inicio del archivo, junto a
   `FIREBASE_CONFIG`).
6. Vuelve a desplegar el sitio: `firebase deploy --only hosting`.

Revisa `functions/index.js` — tiene comentarios explicando cada paso y
dónde confirmar el nombre de modelo vigente de Anthropic.

## Costos aproximados

Para un equipo pequeño de especialistas (decenas de fichas por semana),
Firestore y Hosting se mantienen dentro de la capa gratuita de Firebase.
El único costo real aparece si activas la función de IA del paso 7 (pagas
a Anthropic por cada imagen que se analiza) o si el uso crece mucho más
allá de un equipo de UGEL.

## Mantenimiento

Cualquier cambio futuro a `public/index.html` se publica con:
```bash
firebase deploy --only hosting
```
No hay build ni compilación — es un solo archivo HTML autocontenido.
