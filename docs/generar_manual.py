# -*- coding: utf-8 -*-
"""Genera el Manual de Uso del Sistema de Sistematización de Fichas de Monitoreo
AGEBRE / UGEL 03 (2026) en formato Word (.docx)."""
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT

AZUL = RGBColor(0x12, 0x29, 0x4D)   # Azul institucional
DORADO = RGBColor(0xE0, 0xA5, 0x26)  # Dorado institucional
GRIS = RGBColor(0x44, 0x44, 0x44)

doc = Document()

# ---- Estilos base ----
normal = doc.styles['Normal']
normal.font.name = 'Calibri'
normal.font.size = Pt(11)
normal.font.color.rgb = RGBColor(0x22, 0x22, 0x22)

for hname, size, color in (('Heading 1', 18, AZUL), ('Heading 2', 14, AZUL), ('Heading 3', 12, DORADO)):
    st = doc.styles[hname]
    st.font.name = 'Calibri'
    st.font.size = Pt(size)
    st.font.bold = True
    st.font.color.rgb = color


def h1(text):
    return doc.add_heading(text, level=1)


def h2(text):
    return doc.add_heading(text, level=2)


def h3(text):
    return doc.add_heading(text, level=3)


def p(text, bold=False, italic=False, color=None):
    par = doc.add_paragraph()
    run = par.add_run(text)
    run.bold = bold
    run.italic = italic
    if color is not None:
        run.font.color.rgb = color
    return par


def bullet(text, bold_prefix=None):
    par = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        r = par.add_run(bold_prefix)
        r.bold = True
    par.add_run(text)
    return par


def step(n, text):
    par = doc.add_paragraph()
    run = par.add_run(f'{n}. ')
    run.bold = True
    par.add_run(text)
    par.paragraph_format.left_indent = Cm(0.5)
    return par


def note(text):
    par = doc.add_paragraph()
    run = par.add_run('Nota: ')
    run.bold = True
    run.font.color.rgb = DORADO
    par.add_run(text).italic = True
    return par


def table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = 'Table Grid'
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, htext in enumerate(headers):
        hdr[i].text = ''
        run = hdr[i].paragraphs[0].add_run(htext)
        run.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        # sombreado de cabecera
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:fill'), '12294D')
        hdr[i]._tc.get_or_add_tcPr().append(shd)
    for row in rows:
        cells = t.add_row().cells
        for i, val in enumerate(row):
            cells[i].text = str(val)
    if widths:
        for i, w in enumerate(widths):
            for row in t.rows:
                row.cells[i].width = Cm(w)
    return t


# ================= PORTADA =================
doc.add_paragraph()
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run('MANUAL DE USO')
run.bold = True
run.font.size = Pt(30)
run.font.color.rgb = AZUL

sub = doc.add_paragraph()
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = sub.add_run('Sistema de Sistematización de Fichas de Monitoreo y\nConcursos Escolares — AGEBRE · UGEL 03')
run.bold = True
run.font.size = Pt(14)
run.font.color.rgb = DORADO

doc.add_paragraph()
meta = doc.add_paragraph()
meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
meta.add_run('Panel de Monitoreo y Acompañamiento 2026\n'
             'DRE Lima Metropolitana · "Sistematización y reportes de avance"\n').italic = True
meta.add_run('Versión del manual: 1.0 — Octubre 2026').font.size = Pt(10)

doc.add_page_break()

# ================= 1. INTRODUCCIÓN =================
h1('1. Introducción')

h2('1.1 ¿Qué es el sistema?')
p('El sistema "Sistematización de Fichas de Monitoreo" (AGEBRE – UGEL 03) es una plataforma web compartida que '
  'permite registrar las visitas de monitoreo y acompañamiento a las instituciones educativas, cruzar el padrón de '
  'colegios con las visitas realizadas y generar reportes oficiales de avance en formatos PDF y Excel con diseño '
  'ministerial. Reúne en un solo lugar el trabajo del equipo de especialistas de la UGEL 03.')

h2('1.2 ¿A quién está dirigido?')
bullet('al equipo de especialistas de la AGEBRE y la UGEL 03 que realizan monitoreo, acompañamiento y seguimiento.')
bullet('a los directivos de las instituciones educativas que son sujetos de monitoreo (a través de los reportes generados).')
bullet('al personal administrativo encargado de la gestión de cuentas, usuarios y catálogos del sistema.')

h2('1.3 Módulos del sistema')
p('El sistema se organiza en dos grandes módulos, a los que se accede desde un portal de inicio:')
bullet('MONITOREO Y SEGUIMIENTO — registro de fichas de monitoreo, reportes de avance, padrón de colegios, directorio de directivos y responsables, y gestión de usuarios.', bold_prefix='')
bullet('CONCURSOS ESCOLARES — gestión integral de los concursos escolares (JMA, ONEM, Perú Lee, Eureka, JFEN, JEDPA y Juegos Florales).')

h2('1.4 Requisitos de acceso')
bullet('Conexión a internet estable.')
bullet('Navegador web actualizado (se recomienda Google Chrome, Microsoft Edge o Mozilla Firefox).')
bullet('Una cuenta institucional (correo @ugel03.gob.pe) y su contraseña, asignadas por el administrador del sistema.')
bullet('Se puede usar desde una computadora, laptop o dispositivo móvil (tablet / celular).')

# ================= 2. ACCESO =================
h1('2. Acceso al sistema')

h2('2.1 Inicio de sesión')
step(1, 'Abra la dirección web del sistema en su navegador.')
step(2, 'En la pantalla "Iniciar sesión", escriba su correo institucional (por ejemplo, ejemplo@ugel03.gob.pe).')
step(3, 'Escriba su contraseña. Puede presionar el botón "Mostrar" para verificar lo que está escribiendo.')
step(4, 'Haga clic en el botón "Iniciar sesión".')
p('Si las credenciales son correctas, ingresará al Portal de Módulos. En caso de error, el sistema mostrará un '
  'mensaje en rojo; verifique su correo y contraseña e intente nuevamente.')

h2('2.2 Cerrar sesión y cambiar de usuario')
bullet('Para cerrar sesión, haga clic en el botón "✕" ubicado en la esquina superior derecha de la barra superior.')
bullet('El sistema mostrará una ventana de confirmación con dos opciones: "Cerrar sesión" y "Cambiar de usuario".')
bullet('"Cerrar sesión" lo devuelve a la pantalla de inicio de sesión.')
bullet('"Cambiar de usuario" también finaliza la sesión, pero limpia los campos para ingresar con otras credenciales.')

h2('2.3 Estado de conexión')
p('En la barra superior, junto al botón "Módulos", se muestra una pastilla con el estado de la conexión:')
table(['Estado', 'Significado', 'Qué hacer'],
      [['En línea', 'Conectado a Firebase Firestore en tiempo real.', 'Continuar trabajando normalmente.'],
       ['Conectando…', 'Estableciendo la conexión con el servidor.', 'Espere unos segundos.'],
       ['Conexión lenta', 'La conexión tarda más de lo habitual.', 'Verifique su internet; puede usar "Reintentar".'],
       ['Sin conexión', 'No hay acceso a internet.', 'Reestablezca su conexión y presione "Reintentar".']])

# ================= 3. PORTAL =================
h1('3. Portal de Módulos (pantalla de inicio)')
p('Al ingresar, verá la pantalla de bienvenida "BIENVENIDOS A LAS APLICACIONES DE AGEBRE - UGEL 03" con dos tarjetas:')
bullet('MONITOREO Y SEGUIMIENTO — ingresa al módulo de monitoreo y reportes de avance.')
bullet('Concursos — ingresa al módulo de gestión de concursos escolares.')
p('Haga clic en la tarjeta correspondiente para ingresar al módulo deseado.')
note('Para volver al Portal desde cualquier módulo, haga clic en el logotipo institucional (esquina superior izquierda) '
     'o en el botón "⊞ Módulos" de la barra superior.')

h2('3.1 Barra superior (común a todos los módulos)')
p('La barra superior permanece visible en todo el sistema y contiene:')
bullet('Logotipo y nombre del sistema ("Sistematización AGEBRE - 2026"). Al hacer clic, regresa al Portal.')
bullet('Botón "⊞ Módulos" para volver al selector de aplicaciones.')
bullet('Pastilla de estado de conexión.')
bullet('Perfil de usuario: iniciales, correo y distintivo del rol (ADMIN o GENERAL).')
bullet('Botón "✕" para cerrar sesión.')

# ================= 4. MÓDULO MONITOREO =================
h1('4. Módulo 1 — Monitoreo y Seguimiento')
p('Este módulo concentra el registro de las fichas de monitoreo, la consulta de avance institucional y la generación '
  'de reportes. Sus pestañas son:')
table(['Pestaña', 'Función'],
      [['📊 Resumen', 'Vista consolidada de monitoreo y niveles de avance institucional.'],
       ['＋ Registrar ficha', 'Crear nuevas fichas de monitoreo y asistencia técnica.'],
       ['▤ Reportes', 'Consolidados, estadísticas y exportación a PDF / Excel.'],
       ['🏫 Colegios', 'Padrón de instituciones educativas cruzado con las visitas.'],
       ['📋 Directorio', 'Directorio de directivos de las instituciones educativas.'],
       ['👥 Responsables', 'Especialistas responsables por red, distrito y modalidad.'],
       ['◈ Usuarios', 'Gestión de cuentas de usuario (solo Administrador).']])

h2('4.1 Resumen (panel de control)')
p('La pestaña "Resumen" muestra un tablero con el avance general del monitoreo: cantidad de fichas registradas, '
  'colegios visitados, niveles de logro y compromisos pendientes. Sirve para tener una visión rápida del estado del '
  'acompañamiento 2026.')

h2('4.2 Registrar ficha')
p('En la pestaña "Registrar ficha" se crean las fichas de monitoreo. El sistema cuenta con 8 plantillas oficiales:')

table(['Ficha', 'Modalidad / Destinatario', 'Visitas / Momentos'],
      [['Gestión Escolar EBR', 'Instituciones de Educación Básica Regular', 'Visita 1, 2 y 3 (tres momentos)'],
       ['Implementación del Modelo JEC', 'Instituciones con Jornada Escolar Completa', '1er, 2do y 3er momento'],
       ['Gestión Escolar CEBE', 'Centros de Educación Básica Especial', 'Visita 1, 2 y 3'],
       ['Gestión Escolar PRITE', 'Programas de Intervención Temprana', 'Visita 1, 2 y 3'],
       ['Directivo de IE', 'Directivos de IE (EBR / EBE)', 'Sin visitas (ficha única)'],
       ['Rúbricas de observación de aula', 'Docentes (desempeño en aula)', 'Sin visitas (5 rúbricas MINEDU)'],
       ['Coordinador de Tutoría (JEC)', 'Coordinadores de tutoría JEC', '2do y 3er momento'],
       ['Materiales educativos (CEBE/PRITE)', 'CEBE y PRITE', 'Sin visitas (ficha única)']])

h3('Pasos para registrar una ficha')
step(1, 'Haga clic en la pestaña "＋ Registrar ficha".')
step(2, 'Elija el tipo de ficha del catálogo según la modalidad que va a monitorear.')
step(3, 'Seleccione la institución educativa (colegio) del padrón.')
step(4, 'Complete los datos generales (REI / RED, código local, responsables, cantidades, etc.).')
step(5, 'Responda cada ítem de la ficha según el tipo de respuesta (por ejemplo: Sí/No, escala, porcentaje o niveles).')
step(6, 'Si corresponde, agregue observaciones y evidencias con los botones "💬 Observación".')
step(7, 'Registre los compromisos de mejora si la ficha lo habilita.')
step(8, 'Guarde la ficha. Los datos se sincronizan en tiempo real con la base de datos.')

h3('Visitas y momentos')
p('Las fichas de gestión escolar (EBR, JEC, CEBE, PRITE) y de Coordinador de Tutoría permiten registrar varias '
  'visitas o momentos a lo largo del año (por ejemplo, "Visita 1 · Primer momento" hasta "Visita 3 · Tercer momento '
  'de salida"). Esto permite comparar el avance de una misma institución entre un momento y otro.')

h3('Compromisos de mejora')
p('Cuando una ficha identifica aspectos por mejorar, el sistema permite registrar compromisos con un texto, un plazo y '
  'un estado de seguimiento, tanto para el directivo como para el especialista.')

h2('4.3 Reportes (consolidado)')
p('La pestaña "▤ Reportes" reúne los consolidados y estadísticas del monitoreo. Desde aquí puede:')
bullet('Filtrar por tipo de ficha, institución, red/REI, responsable, visita o fecha.')
bullet('Consultar el avance por institución y el detalle de cada ficha registrada.')
bullet('Editar una ficha existente mediante el botón "Editar".')
bullet('Exportar reportes en PDF (con formato ministerial y código QR de verificación) o en Excel (matrices y tableros de seguimiento).')

h2('4.4 Colegios')
p('La pestaña "🏫 Colegios" muestra el padrón de instituciones educativas de la UGEL 03, cruzado con las visitas '
  'realizadas. Permite identificar rápidamente qué colegios ya fueron visitados, cuántas fichas tienen y cuáles '
  'están pendientes dentro de cada REI / RED.')

h2('4.5 Directorio')
p('La pestaña "📋 Directorio" contiene la relación de directivos de las instituciones educativas: cargo, apellidos y '
  'nombres, DNI, teléfono, correo, condición y estado. Es una agenda de contacto actualizada para el equipo de monitoreo.')

h2('4.6 Responsables')
p('La pestaña "👥 Responsables" lista a los especialistas responsables por red, distrito y modalidad, con su cargo, '
  'celular y correo. Permite saber quién atiende cada ámbito para coordinar las visitas.')

h2('4.7 Usuarios (solo Administrador)')
p('La pestaña "◈ Usuarios" está disponible únicamente para el rol Administrador. Desde aquí se crean, editan o '
  'desactivan las cuentas de usuario y se asigna el rol (Administrador o Especialista General).')

# ================= 5. MÓDULO CONCURSOS =================
h1('5. Módulo 2 — Concursos Escolares')
p('Este módulo gestiona los concursos escolares 2026. Sus pestañas son:')
table(['Pestaña', 'Función'],
      [['📊 Ver consolidado', 'Listado general de participantes y registros por concurso.'],
       ['➕ Registrar participante', 'Ingresar un nuevo participante o equipo.'],
       ['🏆 Asignar puestos', 'Registrar los puestos / podios de cada categoría.'],
       ['🔤 Revisar nombres', 'Verificar la escritura de nombres para diplomas y constancias.'],
       ['⚙ Tipos de concurso', 'Configurar modalidades, categorías y roles (solo Administrador).']])

h2('5.1 Ver consolidado')
p('Muestra el consolidado de todos los registros, con filtros por concurso, etapa, categoría, género, disciplina y '
  'área. Permite localizar participantes, revisar sus datos y exportar listados.')

h2('5.2 Registrar participante')
p('Permite ingresar un nuevo registro de concurso: tipo de concurso, etapa, categoría, institución educativa, '
  'participantes y asesores (con sus DNIs), título del trabajo o proyecto cuando aplica, y disciplina o género '
  'cuando corresponda.')

h2('5.3 Asignar puestos')
p('Permite registrar el puesto o podio obtenido por cada participante o equipo en su categoría, para la emisión de '
  'resoluciones y constancias.')

h2('5.4 Revisar nombres')
p('Herramienta de verificación de la escritura correcta de los nombres y apellidos, fundamental para la emisión de '
  'diplomas, constancias y resoluciones sin errores.')

h2('5.5 Tipos de concurso (solo Administrador)')
p('Permite configurar los tipos de concurso: modalidades, categorías, si tienen género, disciplina o título de '
  'trabajo, y los roles (participantes, asesores, delegados, entrenadores, etc.).')

h2('5.6 Importar ganadores oficiales (RD UGEL 03)')
p('Desde "Ver consolidado" o "Tipos de concurso", el botón "📥 Importar ganadores oficiales (RD UGEL 03)" carga '
  'automáticamente los ganadores acreditados según las Resoluciones Directorales de la UGEL 03. Los concursos '
  'incluidos son:')
bullet('Premio Nacional José María Arguedas (JMA)')
bullet('Olimpiada Nacional Escolar de Matemática (ONEM)')
bullet('Concurso Nacional de Comprensión Lectora "El Perú Lee"')
bullet('Feria Escolar Nacional de Ciencia y Tecnología Eureka')
bullet('Juegos Florales Escolares Nacionales (JFEN)')
bullet('Juegos Escolares Deportivos y Paradeportivos (JEDPA)')

# ================= 6. ROLES =================
h1('6. Roles y permisos')
table(['Rol', 'Permisos principales'],
      [['Administrador', 'Acceso completo. Gestión de usuarios, configuración de plantillas de fichas, tipos de concurso, '
        'áreas y firmantes, e importación masiva de datos.'],
       ['Especialista General', 'Registro de fichas y participantes, consulta de consolidados, directorios y '
        'reportes, y exportación de documentos. No gestiona usuarios ni catálogos administrativos.']])
note('Todos los especialistas con acceso ven la misma información consolidada, lo que garantiza un trabajo compartido '
     'y en tiempo real.')

# ================= 7. EXPORTACIÓN =================
h1('7. Exportación de reportes (PDF y Excel)')
h2('7.1 Exportar a PDF')
p('Los reportes y fichas pueden exportarse a PDF con formato ministerial. Los documentos incluyen un código QR que '
  'permite verificar su autenticidad. Utilice esta opción para imprimir o compartir informes oficiales.')
h2('7.2 Exportar a Excel')
p('Las matrices de seguimiento y los tableros de monitoreo se exportan a Excel (.xlsx) con estilos, colores y '
  'formatos oficiales. Útil para análisis posterior o para adjuntar en informes institucionales.')

# ================= 8. FAQ =================
h1('8. Preguntas frecuentes y solución de problemas')
table(['Situación', 'Solución sugerida'],
      [['No puedo iniciar sesión.', 'Verifique su correo y contraseña. Si persiste, contacte al administrador para '
        'restablecer su contraseña.'],
       ['Aparece "Conexión lenta" o "Sin conexión".', 'Revise su acceso a internet y presione "Reintentar".'],
       ['No veo la pestaña "Usuarios".', 'Esa pestaña es exclusiva del rol Administrador.'],
       ['Quiero corregir una ficha ya guardada.', 'Vaya a "Reportes", localice la ficha y use el botón "Editar".'],
       ['Quiero saber qué colegios faltan visitar.', 'Consulte la pestaña "Colegios", que cruza el padrón con las visitas.'],
       ['Necesito los nombres exactos para diplomas.', 'Use la pestaña "Revisar nombres" del módulo Concursos.']])

# ================= 9. GLOSARIO =================
h1('9. Glosario')
table(['Sigla / término', 'Significado'],
      [['AGEBRE', 'Área de Gestión de la Educación Básica Regular y Especial.'],
       ['UGEL', 'Unidad de Gestión Educativa Local.'],
       ['DRE', 'Dirección Regional de Educación.'],
       ['EBR', 'Educación Básica Regular.'],
       ['JEC', 'Jornada Escolar Completa.'],
       ['CEBE', 'Centro de Educación Básica Especial.'],
       ['PRITE', 'Programa de Intervención Temprana.'],
       ['REI / RED', 'Red Educativa Institucional (agrupación de colegios).'],
       ['IE', 'Institución Educativa.'],
       ['SAANEE', 'Servicio de Apoyo y Asesoramiento a las Necesidades Educativas Especiales.'],
       ['RD / RM / RVM', 'Resolución Directoral / Ministerial / Viceministerial.'],
       ['JMA', 'Premio Nacional José María Arguedas.'],
       ['ONEM', 'Olimpiada Nacional Escolar de Matemática.'],
       ['JFEN', 'Juegos Florales Escolares Nacionales.'],
       ['JEDPA', 'Juegos Escolares Deportivos y Paradeportivos.']])

doc.add_paragraph()
end = doc.add_paragraph()
end.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = end.add_run('— Fin del manual —')
run.italic = True
run.font.color.rgb = GRIS

out = 'MANUAL_DE_USO_AGEBRE_2026.docx'
doc.save(out)
print('Generado:', out)
