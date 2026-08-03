# Oferta de Servicio: Auditoría Automática de Cursos

> Para presentar al equipo UNC — 31 Julio 2026

---

## ¿Qué podemos auditar HOY?

Con **solo el token WS de admin** (que ya tenemos) y un **courseId**, podemos generar un reporte completo vía API REST. Sin browser, sin Playwright, sin intervención manual.

### Reporte API (Tier 1) — Instantáneo

| Dato                          | Cómo se obtiene                         | Ejemplo (curso 304)                                    |
| ----------------------------- | --------------------------------------- | ------------------------------------------------------ |
| Estructura completa           | `core_course_get_contents`              | 9 secciones, 31 actividades                            |
| Tipos de actividad            | `modplural` de cada módulo              | Pages, Quizzes, Files, Forums, Certificates, Feedback  |
| Completion tracking           | `completion` flag por módulo            | 25 automáticos, 6 sin tracking                         |
| Visibilidad admin             | `visible` flag                          | 1 oculto (Avisos)                                      |
| Visibilidad estudiante        | `uservisible` flag                      | 30 visibles para estudiantes                           |
| Puertas / condiciones         | `availability` JSON → parseado          | 6 gates detectados                                     |
| **Rendimiento por actividad** | `getAllStudentCompletionStatus`         | % de completitud por actividad, todos los estudiantes  |
| **Progreso por estudiante**   | `getActivitiesCompletionStatus(userId)` | Estado de cada actividad para un estudiante específico |
| Estudiantes inscriptos        | `getEnrolledUsers`                      | Lista completa con roles                               |

**Output:** Reporte markdown como `reports/audit/audit-304-vs-docs.md` + JSON raw.

### Reporte Full (Tier 2) — Con Playwright

Agrega al reporte anterior:

| Dato                      | Cómo se obtiene                                             |
| ------------------------- | ----------------------------------------------------------- |
| Vista admin vs estudiante | `MoodleCourse.analyze()` en ambos roles                     |
| Actividades fantasma      | `TreeOverlayAnalyzer.compare()` — 4 árboles de dependencias |
| Bug "Show More"           | `detectShowMoreBug()` en pestañas bloqueadas                |
| Screenshots por sección   | Captura visual admin/teacher/student                        |
| Delta de capas            | DB vs API admin vs API student vs UI student                |

### Debug por estudiante (Tier 3) — Con "Log in as"

Cuando un estudiante reporta un problema:

```
1. El estudiante da su email/username
2. Nosotros (admin) hacemos:
   - API: getActivitiesCompletionStatus(courseId, studentId)
     → sabemos exactamente qué completó y qué no
   - UI: "Log in as" ese estudiante
     → vemos exactamente lo que él ve
3. Comparamos contra la documentación del curso
```

**No se necesita** la contraseña del estudiante. Moodle permite al admin "log in as" cualquier usuario.

---

## Lo que ofrecemos según lo que ellos provean

| Si nos dan...                                       | Podemos entregar...                                                                           | Tiempo                                        |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Solo courseId + token actual                        | API report: estructura + completion + gates + visibilidad                                     | **Hoy — ya funciona**                         |
| CourseId + documentación (pre-montaje + validación) | API report + **cruce contra documentación**: brechas, recursos faltantes, naming mismatches   | **Semana 1** (post-reunión)                   |
| CourseId + doc + acceso a UI (Playwright)           | Reporte full: API + UI + tree overlay + Show More + screenshots                               | **Semana 1** (corre ya, emprolijamos reporte) |
| Student email/username                              | **Debug individual**: completion status, log-in-as visual, comparación contra diseño esperado | Hoy — ya funciona                             |
| Carpeta Drive compartida                            | Pipeline automático: download → parse → audit → reporte                                       | **Semana 2**                                  |

---

## Limitaciones actuales

| No podemos hacer hoy                                   | Por qué                                                                              | Lo destrabamos con...                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Ver progreso de TODOS los estudiantes sin admin token  | `getEnrolledUsers` + `getAllStudentCompletionStatus` ya lo hacen con el token actual | Nada — ya funciona                                |
| Reconciliación automática doc vs prod                  | Faltan los parsers de pre-montaje y validación                                       | **Respuesta de ellos** sobre formato y nombres    |
| Auditoría sin token WS                                 | Moodle no expone REST sin autenticación                                              | Token de servicio dedicado (robot@unc.edu.ar)     |
| StudentId-driven completo sin "log in as"              | La UI de Playwright necesita navegar como ese usuario                                | El "log in as" de Moodle + un step en el pipeline |
| Delta DB-level (visible=0 en BD pero visible=1 en API) | Requiere acceso directo a BD Moodle o endpoint específico                            | Ya se hace vía `availability` JSON parsing        |

---

## Demo en vivo

Podemos mostrarles en la reunión:

```bash
# Lo que ya corre hoy:
TEST_COURSE_ID=304 bun run test tests/e2e/api-audit.kata.ts
# → devuelve estructura, condiciones, visibilidad

# Con un estudiante específico:
# → solo necesitamos username/email
```

El audit que ya corremos contra 304 les da una muestra de lo que cualquier curso recibiría.
