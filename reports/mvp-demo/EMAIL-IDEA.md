Subject: 💡 Idea: herramienta de diagnóstico con usuario y curso específico desde el reporte en vivo

Hola Ignacio,

Después del último deploy se me ocurrió una funcionalidad que capaz les sirve, y quería consultarles antes de meterle horas.

Hoy el pipeline acepta solo el ID del curso. Genera un estudiante nuevo, lo enrola y audita. Pero si un estudiante real les reporta "no puedo acceder a X en el curso Y", no podemos auditar específicamente su situación.

**La idea:** Agregar al reporte en vivo un formulario (o link directo al trigger de GitHub Actions) que permita especificar:

  Usuario: nombre o ID de email
  Curso: ID del curso

Y que el pipeline:

1. Tome el usuario real (no cree uno nuevo)
2. Se loguee como ese usuario (si tenemos sus credenciales, o si el admin puede suplantarlo)
3. Recorra el curso desde SUS ojos
4. Genere el reporte con sus restricciones puntuales

**¿Para qué serviría?**

Cuando IT Support reciba un reclamo como:
  "El usuario nagomez@mi.unc.edu.ar no puede ver el Módulo 3 del curso 269"

Pueden tirarle esa combinación al pipeline y obtener en 3 minutos:
  - Capturas de lo que ESE usuario ve (no un fresh student genérico)
  - Sus restricciones activas
  - Su progreso actual
  - Si hay overrides docentes activos

**¿Qué necesitaríamos de su lado?**

- Confirmar que un admin de Moodle puede suplantar/loguearse como cualquier usuario para auditar. En Moodle esto es posible vía "Entrar como" (admin → perfil del usuario → "Entrar como"). Nuestro test podría usar esa feature.
- O alternativamente, que nos pasen credenciales de un usuario "test support" con permisos para ver cursos como cualquier estudiante.

**Estimación para implementarlo:**

| Componente | Tiempo |
|-----------|--------|
| Agregar input de usuario al workflow CI | 30 min |
| Modificar test para aceptar usuario existente (login como ese user) | 1-2 h |
| Mostrar en el reporte qué usuario se auditó | 30 min |
| Botón/link en el reporte vivo para abrir el trigger con curso + usuario | 30 min |
| **Total** | **~3-4 horas** |

**Costo: $0** (son cambios sobre el pipeline existente, mismo stack open source).

**Antes de arrancar:** ¿Les parece útil? ¿Tienen casos concretos donde les hubiera servido tener esta herramienta en las últimas semanas? Si me confirman que el "Entrar como" de admin está disponible, lo implementamos.

Saludos,
Nahuel Gomez
QA Engineer — UNC Campus Virtual
https://nelthor.com.ar
