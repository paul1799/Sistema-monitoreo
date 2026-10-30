# MANUAL DE USO

## Sistema de Sistematización de Fichas de Monitoreo y Concursos Escolares — AGEBRE · UGEL 03

**Panel de Monitoreo y Acompañamiento 2026** · DRE Lima Metropolitana · *"Sistematización y reportes de avance"*

Versión del manual: 1.0 — Octubre 2026

---

## Contenido

1. [Introducción](#1-introducción)
2. [Acceso al sistema](#2-acceso-al-sistema)
3. [Portal de Módulos](#3-portal-de-módulos-pantalla-de-inicio)
4. [Módulo 1 — Monitoreo y Seguimiento](#4-módulo-1--monitoreo-y-seguimiento)
5. [Módulo 2 — Concursos Escolares](#5-módulo-2--concursos-escolares)
6. [Roles y permisos](#6-roles-y-permisos)
7. [Exportación de reportes](#7-exportación-de-reportes-pdf-y-excel)
8. [Preguntas frecuentes](#8-preguntas-frecuentes-y-solución-de-problemas)
9. [Glosario](#9-glosario)

---

## 1. Introducción

### 1.1 ¿Qué es el sistema?

El sistema **"Sistematización de Fichas de Monitoreo" (AGEBRE – UGEL 03)** es una plataforma web compartida que permite:

- Registrar las visitas de monitoreo y acompañamiento a las instituciones educativas.
- Cruzar el padrón de colegios con las visitas realizadas.
- Generar reportes oficiales de avance en formatos **PDF** y **Excel** con diseño ministerial.

Reúne en un solo lugar el trabajo del equipo de especialistas de la UGEL 03, con sincronización en tiempo real.

### 1.2 ¿A quién está dirigido?

- Al **equipo de especialistas** de la AGEBRE y la UGEL 03 que realiza monitoreo, acompañamiento y seguimiento.
- A los **directivos** de las instituciones educativas (a través de los reportes generados).
- Al **personal administrativo** encargado de la gestión de cuentas, usuarios y catálogos.

### 1.3 Módulos del sistema

El sistema se organiza en dos grandes módulos, a los que se accede desde un portal de inicio:

| Módulo | Descripción |
| --- | --- |
| **MONITOREO Y SEGUIMIENTO** | Registro de fichas de monitoreo, reportes de avance, padrón de colegios, directorio de directivos y responsables, y gestión de usuarios. |
| **CONCURSOS ESCOLARES** | Gestión integral de los concursos escolares: JMA, ONEM, Perú Lee, Eureka, JFEN, JEDPA y Juegos Florales. |

### 1.4 Requisitos de acceso

- Conexión a internet estable.
- Navegador web actualizado (se recomienda Google Chrome, Microsoft Edge o Mozilla Firefox).
- Una cuenta institucional (correo `@ugel03.gob.pe`) y su contraseña, asignadas por el administrador.
- Funciona desde computadora, laptop, tablet o celular.

---

## 2. Acceso al sistema

### 2.1 Inicio de sesión

1. Abra la dirección web del sistema en su navegador.
2. En la pantalla **"Iniciar sesión"**, escriba su correo institucional (por ejemplo, `ejemplo@ugel03.gob.pe`).
3. Escriba su contraseña. Puede presionar **"Mostrar"** para verificar lo que está escribiendo.
4. Haga clic en **"Iniciar sesión"**.

Si las credenciales son correctas, ingresará al **Portal de Módulos**. En caso de error, el sistema mostrará un mensaje en rojo; verifique su correo y contraseña e intente nuevamente.

### 2.2 Cerrar sesión y cambiar de usuario

- Para cerrar sesión, haga clic en el botón **"✕"** de la esquina superior derecha.
- El sistema muestra una ventana de confirmación con dos opciones:
  - **"Cerrar sesión"**: lo devuelve a la pantalla de inicio de sesión.
  - **"Cambiar de usuario"**: finaliza la sesión y limpia los campos para ingresar con otras credenciales.

### 2.3 Estado de conexión

En la barra superior, junto al botón "Módulos", se muestra una pastilla con el estado de la conexión:

| Estado | Significado | Qué hacer |
| --- | --- | --- |
| **En línea** | Conectado a Firebase Firestore en tiempo real. | Continuar trabajando normalmente. |
| **Conectando…** | Estableciendo la conexión con el servidor. | Espere unos segundos. |
| **Conexión lenta** | La conexión tarda más de lo habitual. | Verifique su internet; puede usar "Reintentar". |
| **Sin conexión** | No hay acceso a internet. | Reestablezca su conexión y presione "Reintentar". |

---

## 3. Portal de Módulos (pantalla de inicio)

Al ingresar, verá la pantalla **"BIENVENIDOS A LAS APLICACIONES DE AGEBRE - UGEL 03"** con dos tarjetas:

- **MONITOREO Y SEGUIMIENTO** — ingresa al módulo de monitoreo y reportes de avance.
- **Concursos** — ingresa al módulo de gestión de concursos escolares.

Haga clic en la tarjeta correspondiente para ingresar al módulo deseado.

> **Nota:** para volver al Portal desde cualquier módulo, haga clic en el logotipo institucional (esquina superior izquierda) o en el botón **"⊞ Módulos"** de la barra superior.

### 3.1 Barra superior (común a todos los módulos)

La barra superior permanece visible en todo el sistema y contiene:

- **Logotipo y nombre** del sistema ("Sistematización AGEBRE - 2026"). Al hacer clic, regresa al Portal.
- Botón **"⊞ Módulos"** para volver al selector de aplicaciones.
- **Pastilla de estado de conexión**.
- **Perfil de usuario**: iniciales, correo y distintivo del rol (ADMIN o GENERAL).
- Botón **"✕"** para cerrar sesión.

---

## 4. Módulo 1 — Monitoreo y Seguimiento

Este módulo concentra el registro de las fichas de monitoreo, la consulta de avance institucional y la generación de reportes. Sus pestañas son:

| Pestaña | Función |
| --- | --- |
| 📊 **Resumen** | Vista consolidada de monitoreo y niveles de avance institucional. |
| ＋ **Registrar ficha** | Crear nuevas fichas de monitoreo y asistencia técnica. |
| ▤ **Reportes** | Consolidados, estadísticas y exportación a PDF / Excel. |
| 🏫 **Colegios** | Padrón de instituciones educativas cruzado con las visitas. |
| 📋 **Directorio** | Directorio de directivos de las instituciones educativas. |
| 👥 **Responsables** | Especialistas responsables por red, distrito y modalidad. |
| ◈ **Usuarios** | Gestión de cuentas de usuario (solo Administrador). |

### 4.1 Resumen (panel de control)

La pestaña **"Resumen"** muestra un tablero con el avance general del monitoreo: cantidad de fichas registradas, colegios visitados, niveles de logro y compromisos pendientes. Sirve para tener una visión rápida del estado del acompañamiento 2026.

### 4.2 Registrar ficha

En la pestaña **"Registrar ficha"** se crean las fichas de monitoreo. El sistema cuenta con **8 plantillas oficiales**:

| Ficha | Modalidad / Destinatario | Visitas / Momentos |
| --- | --- | --- |
| Gestión Escolar EBR | Instituciones de Educación Básica Regular | Visita 1, 2 y 3 (tres momentos) |
| Implementación del Modelo JEC | Instituciones con Jornada Escolar Completa | 1er, 2do y 3er momento |
| Gestión Escolar CEBE | Centros de Educación Básica Especial | Visita 1, 2 y 3 |
| Gestión Escolar PRITE | Programas de Intervención Temprana | Visita 1, 2 y 3 |
| Directivo de IE | Directivos de IE (EBR / EBE) | Sin visitas (ficha única) |
| Rúbricas de observación de aula | Docentes (desempeño en aula) | Sin visitas (5 rúbricas MINEDU) |
| Coordinador de Tutoría (JEC) | Coordinadores de tutoría JEC | 2do y 3er momento |
| Materiales educativos (CEBE/PRITE) | CEBE y PRITE | Sin visitas (ficha única) |

#### Pasos para registrar una ficha

1. Haga clic en la pestaña **"＋ Registrar ficha"**.
2. Elija el **tipo de ficha** del catálogo según la modalidad que va a monitorear.
3. Seleccione la **institución educativa** (colegio) del padrón.
4. Complete los **datos generales** (REI / RED, código local, responsables, cantidades, etc.).
5. Responda cada **ítem** de la ficha según el tipo de respuesta (Sí/No, escala, porcentaje o niveles).
6. Si corresponde, agregue **observaciones y evidencias** con los botones "💬 Observación".
7. Registre los **compromisos de mejora** si la ficha lo habilita.
8. **Guarde** la ficha. Los datos se sincronizan en tiempo real con la base de datos.

#### Visitas y momentos

Las fichas de gestión escolar (EBR, JEC, CEBE, PRITE) y de Coordinador de Tutoría permiten registrar varias visitas o momentos a lo largo del año (por ejemplo, desde "Visita 1 · Primer momento" hasta "Visita 3 · Tercer momento de salida"). Esto permite comparar el avance de una misma institución entre un momento y otro.

#### Compromisos de mejora

Cuando una ficha identifica aspectos por mejorar, el sistema permite registrar **compromisos** con un texto, un plazo y un estado de seguimiento, tanto para el directivo como para el especialista.

### 4.3 Reportes (consolidado)

La pestaña **"▤ Reportes"** reúne los consolidados y estadísticas del monitoreo. Desde aquí puede:

- **Filtrar** por tipo de ficha, institución, red/REI, responsable, visita o fecha.
- Consultar el **avance por institución** y el detalle de cada ficha registrada.
- **Editar** una ficha existente mediante el botón "Editar".
- **Exportar** reportes en PDF (con formato ministerial y código QR de verificación) o en Excel (matrices y tableros de seguimiento).

### 4.4 Colegios

La pestaña **"🏫 Colegios"** muestra el padrón de instituciones educativas de la UGEL 03, cruzado con las visitas realizadas. Permite identificar rápidamente qué colegios ya fueron visitados, cuántas fichas tienen y cuáles están pendientes dentro de cada REI / RED.

### 4.5 Directorio

La pestaña **"📋 Directorio"** contiene la relación de directivos de las instituciones educativas: cargo, apellidos y nombres, DNI, teléfono, correo, condición y estado. Es una agenda de contacto actualizada para el equipo de monitoreo.

### 4.6 Responsables

La pestaña **"👥 Responsables"** lista a los especialistas responsables por red, distrito y modalidad, con su cargo, celular y correo. Permite saber quién atiende cada ámbito para coordinar las visitas.

### 4.7 Usuarios (solo Administrador)

La pestaña **"◈ Usuarios"** está disponible únicamente para el rol Administrador. Desde aquí se crean, editan o desactivan las cuentas de usuario y se asigna el rol (Administrador o Especialista General).

---

## 5. Módulo 2 — Concursos Escolares

Este módulo gestiona los concursos escolares 2026. Sus pestañas son:

| Pestaña | Función |
| --- | --- |
| 📊 **Ver consolidado** | Listado general de participantes y registros por concurso. |
| ➕ **Registrar participante** | Ingresar un nuevo participante o equipo. |
| 🏆 **Asignar puestos** | Registrar los puestos / podios de cada categoría. |
| 🔤 **Revisar nombres** | Verificar la escritura de nombres para diplomas y constancias. |
| ⚙ **Tipos de concurso** | Configurar modalidades, categorías y roles (solo Administrador). |

### 5.1 Ver consolidado

Muestra el consolidado de todos los registros, con filtros por concurso, etapa, categoría, género, disciplina y área. Permite localizar participantes, revisar sus datos y exportar listados.

### 5.2 Registrar participante

Permite ingresar un nuevo registro de concurso: tipo de concurso, etapa, categoría, institución educativa, participantes y asesores (con sus DNIs), título del trabajo o proyecto cuando aplica, y disciplina o género cuando corresponda.

### 5.3 Asignar puestos

Permite registrar el puesto o podio obtenido por cada participante o equipo en su categoría, para la emisión de resoluciones y constancias.

### 5.4 Revisar nombres

Herramienta de verificación de la escritura correcta de los nombres y apellidos, fundamental para la emisión de diplomas, constancias y resoluciones sin errores.

### 5.5 Tipos de concurso (solo Administrador)

Permite configurar los tipos de concurso: modalidades, categorías, si tienen género, disciplina o título de trabajo, y los roles (participantes, asesores, delegados, entrenadores, etc.).

### 5.6 Importar ganadores oficiales (RD UGEL 03)

Desde **"Ver consolidado"** o **"Tipos de concurso"**, el botón **"📥 Importar ganadores oficiales (RD UGEL 03)"** carga automáticamente los ganadores acreditados según las Resoluciones Directorales de la UGEL 03. Los concursos incluidos son:

- Premio Nacional **José María Arguedas (JMA)**
- Olimpiada Nacional Escolar de Matemática (**ONEM**)
- Concurso Nacional de Comprensión Lectora **"El Perú Lee"**
- Feria Escolar Nacional de Ciencia y Tecnología **Eureka**
- Juegos Florales Escolares Nacionales (**JFEN**)
- Juegos Escolares Deportivos y Paradeportivos (**JEDPA**)

---

## 6. Roles y permisos

| Rol | Permisos principales |
| --- | --- |
| **Administrador** | Acceso completo. Gestión de usuarios, configuración de plantillas de fichas, tipos de concurso, áreas y firmantes, e importación masiva de datos. |
| **Especialista General** | Registro de fichas y participantes, consulta de consolidados, directorios y reportes, y exportación de documentos. No gestiona usuarios ni catálogos administrativos. |

> **Nota:** todos los especialistas con acceso ven la misma información consolidada, lo que garantiza un trabajo compartido y en tiempo real.

---

## 7. Exportación de reportes (PDF y Excel)

### 7.1 Exportar a PDF

Los reportes y fichas pueden exportarse a **PDF** con formato ministerial. Los documentos incluyen un **código QR** que permite verificar su autenticidad. Utilice esta opción para imprimir o compartir informes oficiales.

### 7.2 Exportar a Excel

Las **matrices de seguimiento** y los **tableros de monitoreo** se exportan a Excel (`.xlsx`) con estilos, colores y formatos oficiales. Útil para análisis posterior o para adjuntar en informes institucionales.

---

## 8. Preguntas frecuentes y solución de problemas

| Situación | Solución sugerida |
| --- | --- |
| No puedo iniciar sesión. | Verifique su correo y contraseña. Si persiste, contacte al administrador para restablecer su contraseña. |
| Aparece "Conexión lenta" o "Sin conexión". | Revise su acceso a internet y presione "Reintentar". |
| No veo la pestaña "Usuarios". | Esa pestaña es exclusiva del rol Administrador. |
| Quiero corregir una ficha ya guardada. | Vaya a "Reportes", localice la ficha y use el botón "Editar". |
| Quiero saber qué colegios faltan visitar. | Consulte la pestaña "Colegios", que cruza el padrón con las visitas. |
| Necesito los nombres exactos para diplomas. | Use la pestaña "Revisar nombres" del módulo Concursos. |

---

## 9. Glosario

| Sigla / término | Significado |
| --- | --- |
| **AGEBRE** | Área de Gestión de la Educación Básica Regular y Especial. |
| **UGEL** | Unidad de Gestión Educativa Local. |
| **DRE** | Dirección Regional de Educación. |
| **EBR** | Educación Básica Regular. |
| **JEC** | Jornada Escolar Completa. |
| **CEBE** | Centro de Educación Básica Especial. |
| **PRITE** | Programa de Intervención Temprana. |
| **REI / RED** | Red Educativa Institucional (agrupación de colegios). |
| **IE** | Institución Educativa. |
| **SAANEE** | Servicio de Apoyo y Asesoramiento a las Necesidades Educativas Especiales. |
| **RD / RM / RVM** | Resolución Directoral / Ministerial / Viceministerial. |
| **JMA** | Premio Nacional José María Arguedas. |
| **ONEM** | Olimpiada Nacional Escolar de Matemática. |
| **JFEN** | Juegos Florales Escolares Nacionales. |
| **JEDPA** | Juegos Escolares Deportivos y Paradeportivos. |

---

*— Fin del manual —*
