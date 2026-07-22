Subject: 💡 Idea: herramienta de diagnóstico con usuario y curso específico desde el reporte en vivo

Hola Ignacio,

Después del último deploy se me ocurrió una funcionalidad que capaz les sirve, y quería consultarles antes de meterle horas.

Hoy el pipeline acepta solo el ID del curso. Genera un estudiante nuevo, lo enrola y audita. Pero si un estudiante real les reporta "no puedo acceder a X en el curso Y", no podemos auditar específicamente su situación.


La idea

Agregar al reporte en vivo un formulario (o link directo al trigger de GitHub Actions) que permita especificar:

  Usuario: nombre o ID de email
  Curso: ID del curso

Y que el pipeline ejecute la tri-fuerza completa contra ESE usuario real.


¿Para qué serviría?

Cuando IT Support reciba un reclamo como:
  "El usuario nagomez@mi.unc.edu.ar no puede ver el Módulo 3 del curso 269"

Pueden tirarle esa combinación al pipeline y obtener en 3 minutos el reporte completo con los 3 frentes ejecutándose contra ESE usuario puntual:

🔍 Recorrido como ese usuario (UI)
  - Capturas de lo que ESE usuario ve en cada sección (no un fresh student genérico).
  - Secciones bloqueadas vs accesibles para él/ella puntualmente.
  - Actividades que ve vs actividades que NO ve.
  - Además, el admin puede usar "Entrar como" para recorrer el curso desde los ojos del usuario, y el pipeline genera una comparación lado a lado: lo que ve el admin (fuente de verdad) vs lo que ve el usuario reportante.

🔬 Análisis del servidor (API)
  - Estado de finalización real de ESE usuario: qué completó, qué le falta.
  - Condiciones de disponibilidad que lo afectan (notas, dependencias de otras actividades).
  - Cmids huérfanos o mal referenciados en el curso.

📊 Datos del curso (DB)
  - Inscripción: rol actual del usuario, grupos a los que pertenece, cohortes.
  - Notas y calificaciones: items que tiene, notas mínimas requeridas, si cumple o no.
  - Override docente: si alguien forzó manualmente la finalización de alguna actividad para este usuario.


¿Qué necesitaríamos de su lado?

  - Confirmar que un admin de Moodle puede usar "Entrar como" para suplantar cualquier usuario. Esto ya existe en Moodle (admin > perfil del usuario > "Entrar como"). El pipeline usaría esta feature para recorrer el curso desde los ojos del usuario reportante.
  - O alternativamente, que nos pasen credenciales de un usuario "test support" con permisos para ver cursos como cualquier estudiante.


Estimación

  Agregar input de usuario al workflow CI .............. 30 min
  Modificar test para aceptar usuario existente ......... 1-2 h
  Side-by-side admin vs usuario específico ............. 1 h
  Mostrar en el reporte qué usuario se auditó .......... 30 min
  Botón/link en el reporte vivo ....................... 30 min
  Total ............................................. ~4-5 horas

Costo: $0 (stack open source existente, mismos 3 frentes).


Antes de arrancar

¿Les parece útil? ¿Tienen casos concretos donde les hubiera servido tener esto en las últimas semanas? (Ej: "el usuario X dice que no ve el Módulo Y pero nosotros vemos todo ok desde admin")

Si me confirman que el "Entrar como" está disponible y es viable para el pipeline, arrancamos.

Saludos,
Nahuel Gomez
QA Engineer — UNC Campus Virtual
https://nelthor.com.ar
