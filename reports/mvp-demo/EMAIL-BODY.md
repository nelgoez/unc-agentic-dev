---
subject: 'Pipeline de auditoría tri-fuerza — Buenas noticias desde Python 1'
to: Ignacio Acuña, Patricia Otaola
from: Equipo de Automatización — UNC Campus Virtual
date: 2026-07-22
---

## Asunto sugerido

**🚀 Pipeline tri-fuerza activo — Módulo 3 de Python 1 ya no está bloqueado**

---

## Cuerpo del email

Hola Ignacio y equipo,

Les comparto una **buena noticia**: el Módulo 3 de Python 1, que reportamos bloqueado para nelthor semanas atrás, **ya no aparece como bloqueado para los nuevos estudiantes**. Pudimos verificarlo gracias al nuevo approach de estudiantes frescos que implementamos.

### 🔄 Lo que cambió en el pipeline

Antes usábamos un usuario estático (nelthor) para la auditoría desde la vista estudiante. Pero nelthor fue promovido a admin, y su vista del curso ya no reflejaba fielmente la experiencia de un estudiante nuevo. Esto podía generar falsos negativos.

**Ahora creamos un estudiante nuevo en cada corrida:**
- El pipeline genera un usuario vía API
- Lo enrola en el curso automáticamente
- Ejecuta la auditoría como ese estudiante real
- Lo elimina al terminar

Esto nos dio una confirmación más confiable de que **el bloqueo del Módulo 3 fue resuelto por el equipo de Campus Virtual**. Reportamos el issue, lo solucionaron, y nosotros lo verificamos automáticamente. Así debería funcionar el ciclo.

### 🏗️ Tri-fuerza: 3 frentes en paralelo

Cada auditoría corre con 3 técnicas que se complementan:

| Frente | Técnica | Qué detecta |
|--------|---------|-------------|
| 🔍 UI | Navegador real con Playwright | Actividades fantasma, candados, diferencias entre roles |
| 🔬 API | REST API directa | Condiciones rotas en JSON, cmids huérfanos, disponibilidad |
| 📊 DB | Web services de Moodle | Cohorts, enrollment, grade items, progresión |

### 📎 Links útiles

1. **Reporte en vivo**
https://nelgoez.github.io/unc-agentic-dev/
Hallazgos cruzados UI + API, capturas lado a lado.

2. **Reporte técnico Allure**
https://nelgoez.github.io/unc-agentic-dev/allure/
Categorizado visualmente: UI, API, DB, con histórico de corridas.

3. **Ejecutar nueva auditoría**
https://github.com/nelgoez/unc-agentic-dev/actions/workflows/audit-ci.yml
ID del curso → en ~3 minutos tenés el reporte completo.

4. **Propuesta Course Kit**
https://unc-course-kit.netlify.app/#/11

### 📊 Qué encontramos en esta corrida

Curso 269 (Python 1):
- **4 hallazgos UI:** Actividades en Módulo 1 sin seguimiento de finalización, con 3 módulos bloqueados en cascada
- **4 hallazgos API:** Condiciones de nota mínima en grade items del Cierre
- **0 actividades fantasma**
- **13217 estudiantes** enrolados, 1 docente, 4 items de calificación

**Próximo paso:** ¿Agregamos más cursos al scan? Mandame los IDs y los sumamos.

Saludos,
Equipo de Automatización
