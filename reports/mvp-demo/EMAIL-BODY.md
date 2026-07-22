---
subject: 'Reporte de auditoría automatizada — Campus Virtual UNC'
to: Ignacio Acuña, Patricia Otaola
from: Equipo de Automatización — UNC Campus Virtual
date: 2026-07-21
---

## Asunto sugerido

**Reporte de auditoría automatizada — Campus Virtual UNC**

---

## Cuerpo del email

Hola Ignacio y Patricia,

Esperamos que estén teniendo una buena semana.

Les escribo para compartirles los resultados de una auditoría que realizamos sobre los cursos activos del programa, inspirados por el caso que detectamos hace unas semanas en el curso "Bienvenida" (ID 269), donde un estudiante quedó bloqueado en el Módulo 3 por una actividad que ya no existía.

Refinamos nuestra metodología de revisión y la aplicamos de forma sistemática a los 4 cursos. Queremos contarles qué encontramos y cómo podemos ayudar a mantener todo funcionando sin sorpresas.

---

### Resumen de resultados

Auditamos los 4 cursos activos con una herramienta automatizada que revisa cada actividad, cada restricción y la experiencia real de un estudiante nuevo. Acá los resultados:

| Curso                  | ID  | Secciones | Actividades | Restricciones | Estado           |
| ---------------------- | --- | --------- | ----------- | ------------- | ---------------- |
| Yoga y Mindfulness     | 265 | 5         | 11          | 2             | 🟢 Sin novedades |
| IA y automatización    | 267 | 7         | 20          | 6             | 🟢 Sin novedades |
| Python Certificación 1 | 269 | 5         | 46          | 2             | 🟢 Sin novedades |
| Python Certificación 2 | 276 | 5         | 50          | 2             | 🟢 Sin novedades |

**127 actividades revisadas, 0 actividades fantasma detectadas.** Todos los cursos están limpios desde la perspectiva de un estudiante nuevo.

---

### Lo del Módulo 3 — una aclaración importante

El problema original que detectamos (Módulo 3 bloqueado por "Notebook Funcion-Lambda") **parece estar resuelto para estudiantes nuevos**. Creamos cuentas de alumno desde cero para cada curso y verificamos que el Módulo 3 es accesible sin restricciones.

Una lección importante que nos llevamos: cuando promovimos al usuario que reportó el problema (nelthor) a administrador para investigar, eso mismo ocultó el bug. Un administrador lo ve todo sin restricciones, así que desde su cuenta el problema desapareció. Ahora nuestra metodología crea **cuentas estudiantes nuevas para cada auditoría**, lo que nos da datos reales de lo que ve un alumno.

---

### Lo que podemos hacer por ustedes

La herramienta que desarrollamos nos permite:

- **Auditar todos los cursos en minutos** — revisión completa de estructura, actividades y restricciones
- **Detectar actividades fantasma** antes de que afecten a estudiantes (el clásico "no puedo avanzar y no sé por qué")
- **Verificar la experiencia de estudiante nuevo** — creamos un alumno de prueba automáticamente, recorremos el curso, y eliminamos la cuenta al terminar
- **Generar informes visuales** como el que adjuntamos, con navegación interactiva

Todo esto se puede automatizar con la frecuencia que quieran: semanal, quincenal, o bajo demanda cuando hagan cambios en los cursos.

---

### ¿Qué otros cursos deberíamos revisar?

Nos gustaría ofrecerles auditar todos los cursos que consideren críticos o donde hayan tenido reportes de estudiantes trabados. Si nos comparten una lista de IDs de curso o nos indican áreas problemáticas, podemos correr la revisión completa y enviarles un informe por curso.

También podemos coordinar una **demo en vivo** por Meet para mostrarles cómo funciona la herramienta y cómo interpretar los reportes.

Quedamos atentos a su respuesta y a disposición para lo que necesiten.

Muchas gracias por la confianza,

**Equipo de Automatización**
Campus Virtual UNC

---

## Apéndice técnico (para quien lo quiera)

_La herramienta usa la API REST de Moodle para obtener la estructura de cada curso, analiza el JSON de disponibilidad en busca de referencias huérfanas (actividades eliminadas que siguen figurando como restricción), y crea un usuario estudiante temporal para verificar la experiencia real. Los reportes se generan en HTML interactivo y Markdown. Todo el proceso es completamente automatizado y no requiere intervención manual._
