---
subject: 'Pipeline de auditoría automatizada — Tri-fuerza activo'
to: Ignacio Acuña, Patricia Otaola
from: Equipo de Automatización — UNC Campus Virtual
date: 2026-07-22
---

## Asunto sugerido

**Pipeline de auditoría tri-fuerza: UI + API + DB — ya corre en producción**

---

## Cuerpo del email

Hola Ignacio y equipo,

Actualizamos el pipeline de auditoría. Ahora corre con 3 frentes en paralelo (tri-fuerza) sobre los cursos activos. Te comparto los links:

1. **Reporte en vivo**
https://nelgoez.github.io/unc-agentic-dev/
Hallazgos, capturas admin/estudiante, guía paso a paso.

2. **Reporte técnico unificado (Allure)**
https://nelgoez.github.io/unc-agentic-dev/allure/
Ahora con categorías visuales: Auditoría UI, Auditoría API, Sondas DB. Cada corrida muestra qué encontró cada frente, con detalle técnico y severidad.

3. **Ejecutar nueva auditoría**
https://github.com/nelgoez/unc-agentic-dev/actions/workflows/audit-ci.yml
Elegís el ID del curso y en ~3 minutos tenés el reporte completo.

4. **Propuesta Course Kit**
https://unc-course-kit.netlify.app/#/11

**Qué cambió con la tri-fuerza:**

| Frente | Técnica | Qué detecta |
|--------|---------|-------------|
| 🔍 UI | Playwright (navegador real) | Actividades fantasma, candados que no deberían estar, vistas por rol |
| 🔬 API | REST API directa | Condiciones rotas en JSON de disponibilidad, cmids huérfanos |
| 📊 DB | Web services de Moodle | Cohorts, enrolment, grade items, progresión automática |

**Estudiante fresco en cada corrida:**
Cada ejecución crea un usuario nuevo vía API, lo enrola en el curso, hace la auditoría como ese estudiante, y lo elimina al terminar. Ya no dependemos de cuentas estáticas — lo que ve el reporte es exactamente lo que ve un estudiante real registrado hoy.

**Cobertura actual:** 4 cursos auditados (265, 267, 269, 276) — 0 phantoms, 12 restricciones funcionales, 127 actividades verificadas.

**Próximo paso:** ¿Agregamos más cursos? Mandame los IDs y los sumamos al próximo scan.

Saludos,
Equipo de Automatización
