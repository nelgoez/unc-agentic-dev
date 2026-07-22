---
subject: 'Reporte de auditoría automatizada — Campus Virtual UNC'
to: Ignacio Acuña, Patricia Otaola
from: Equipo de Automatización — UNC Campus Virtual
date: 2026-07-21
---

## Asunto sugerido

**Reporte de auditoría automatizada — Campus Virtual UNC**

---

## Asunto sugerido

**Pipeline de auditoría de cursos — ya funciona, resultados y próximos pasos**

---

## Cuerpo del email

Hola Ignacio y equipo,

Tal como lo charlamos, ya tenemos el pipeline de auditoria corriendo sobre el curso 269 (Python). Te comparto los links:

1. **Reporte en vivo**
https://nelgoez.github.io/unc-agentic-dev/
Hallazgos, capturas lado a lado admin vs estudiante, guia paso a paso para reproducir.

2. **Reporte tecnico (Allure)**
https://nelgoez.github.io/unc-agentic-dev/allure/
Historial de ejecuciones y detalle técnico.

3. **Ejecutar nueva auditoria**
https://github.com/nelgoez/unc-agentic-dev/actions/workflows/audit-ci.yml
Solo el ID del curso, en ~2 minutos tienes el reporte.

4. **Propuesta completa**
https://unc-course-kit.netlify.app/#/11

**Que encontramos:**
El curso 269 detectó un bloqueo real en el Módulo 3. La condición de acceso del módulo pide una actividad que existe en Moodle pero no muestra ningún link ni acceso para el estudiante. El alumno ve el candado, ve el tooltip que dice "no disponible hasta que completes X actividad", pero no puede hacer nada porque el recurso directamente no aparece. El Cierre también queda bloqueado en cascada.
Este es exactamente el tipo de error que el pipeline busca detectar: dependencias rotas que solo se descubren cuando un estudiante las reporta.
Importante: corre sobre producción. Los hallazgos son sobre cursos reales con estudiantes reales.
Esto es un MVP — el caso del curso 269 ya demostro que el concepto funciona. Sabemos que hay margen de mejora en la detección, pero el valor está en empezar a correrlo.

**Proximo paso:** si te copa, me decis que otros cursos agregar y con que prioridad. Para cada uno solo necesito el ID.

Saludos,
