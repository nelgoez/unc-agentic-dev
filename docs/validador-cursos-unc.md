# Validador de Cursos — Campus Virtual UNC

## Qué es

Una herramienta de auditoría automatizada que detecta **actividades fantasma** en cursos de Moodle: actividades que el sistema considera requeridas para avanzar pero que el estudiante **no puede ver ni completar**.

## Cómo funciona

1. Se loguea como **estudiante** en el curso
2. Escanea cada módulo/sección y registra:
   - Las actividades visibles
   - Su estado de finalización
   - Si el módulo está bloqueado
   - El texto de la condición de bloqueo
3. Cruza automáticamente las actividades requeridas (mencionadas en las restricciones de disponibilidad) contra las actividades visibles
4. Reporta en **HTML** con screenshots por módulo, semáforo rojo/verde, y explicación en lenguaje natural

## Estructura del proyecto

```
pages/
  LoginPage.ts              ← Autenticación
  StudentCoursePage.ts       ← POM: vista del estudiante
  AdminCoursePage.ts         ← POM: vista del admin (stub, necesita creds)
  CourseValidationReport.ts  ← Motor de diff + generador de reportes HTML

tests/
  validate-course.spec.ts    ← Test que orquesta la auditoría

test-results/audit-reports/  ← Reportes generados acá
```

## Variables de entorno (`.env`)

```
STUDENT_USERNAME=usuario_estudiante
STUDENT_PASSWORD=password_estudiante
ADMIN_USERNAME=usuario_admin        ← opcional (cuando esté disponible)
ADMIN_PASSWORD=password_admin       ← opcional
TEST_COURSE_ID=269                  ← ID del curso a auditar
MOODLE_BASE_URL=https://campus.aulavirtual.unc.edu.ar
```

## Cómo se usa

```bash
# Una sola línea
npx playwright test tests/validate-course.spec.ts

# El reporte queda en:
# test-results/audit-reports/audit-course-{ID}.html
```

## Resultado: Curso 269 — Python Certificación 1

**Estado: 🔴 CRÍTICO** — 1 actividad fantasma detectada (6 hallazgos informativos en cascada)

### Resumen de hallazgos

| Severidad          | Cantidad | Descripción                                                                    |
| ------------------ | -------- | ------------------------------------------------------------------------------ |
| 🔴 **Crítico**     | 1        | Actividad "Notebook Funcion-Lambda" no existe en el curso                      |
| ℹ️ **Informativo** | 6        | Actividades del Cierre no verificables (están en Módulo 3, que está bloqueado) |

### Causa raíz

**Actividad fantasma: "Notebook Funcion-Lambda"**

El Módulo 3 tiene esta restricción de disponibilidad:

> _Not available unless: The activity **Notebook Funcion-Lambda** is marked complete_

**Prueba recogida:**

1. ✅ El HTML de la página expone `data-infoid="format_onetopic_winfo_tab-..."` con el texto exacto de la restricción
2. ✅ En la **Biblioteca del curso** (sidebar) existe "Funcion Lambda" como un PDF (`pluginfile.php/293209/.../Funcion%20Lambda.pdf`) — NO es una actividad de Moodle
3. ✅ Se descargó el PDF — es solo un archivo, no tiene seguimiento de finalización
4. ✅ Después de descargar el PDF, Módulo 3 sigue bloqueado: `STILL_LOCKED`

**Causa probable:** Al construir el curso vía Gemini, se configuró una condición de finalización sobre "Notebook Funcion-Lambda" como si fuera una actividad de Moodle, pero es solo un recurso PDF en la Biblioteca. La condición quedó huérfana.

### Efecto en cascada

El Cierre requiere 6 actividades de Módulo 3 (Clases del Módulo 3, actividad individual, notebooks de Tuplas, Listas, Conjuntos, Diccionarios). Como Módulo 3 está bloqueado, esas actividades son inaccesibles. **No son fantasmas — se resuelven automáticamente al corregir la causa raíz.**

### Reportes generados

| Archivo                                               | Contenido                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 📄 `test-results/audit-reports/audit-course-269.html` | Reporte HTML con semáforo, hallazgos, screenshots por módulo                                                       |
| 📸 `test-results/evidence-269/`                       | Screenshots de: landing, tab bar con Módulo 3 bloqueado, sidebar Biblioteca, PDF descargado, verificación post-PDF |

---

## Precio estimado: rango de negociación

El valor final depende de dos factores que hoy no podemos medir sin acceso admin:

### Factor 1: Cantidad de módulos por curso

- Cursos con 3 módulos = menor esfuerzo (ej: Yoga, Python 1)
- Cursos con 4+ módulos + cierre = mayor esfuerzo (ej: IA y Automatización)
- Rango: **3 a 7 módulos por curso** según los datos del plan

### Factor 2: Complejidad de la vista admin (desconocida hoy)

- Si la vista admin tiene **"Ver como estudiante"** con un clic → la integración es directa
- Si requiere navegar a **reportes separados** (gradebook, completion report) → más desarrollo
- Si tiene **tabla de estudiantes** con enlace individual → más páginas POM que construir

### Rango estimado para Opción A (Auditoría Única)

| Cursos                              | Módulos totales | Esfuerzo estimado | Rango                 |
| ----------------------------------- | --------------- | ----------------- | --------------------- |
| 3 cursos base (como el plan actual) | ~15 módulos     | 30-50 horas       | **$600–$1.000 USD**   |
| 5 cursos                            | ~25 módulos     | 50-80 horas       | **$1.000–$1.600 USD** |
| 12 cursos (todos los nuevos)        | ~60 módulos     | 120-200 horas     | **$2.400–$4.000 USD** |

> El precio se ajusta cuando tengamos acceso admin y podamos medir la complejidad real de la vista administrativa. Es un **rango de piso**, no un presupuesto cerrado.

### Opciones futuras (sin precio, para conversación)

- **Opción B — Entrega del Tool**: La UNC se queda con la herramienta y la corre cuando quiera. Solo necesita las credenciales y ejecutar `npx playwright test`.
- **Opción C — Tool + Capacitación**: Incluye una sesión remota para que el equipo de Campus Virtual aprenda a usarlo, interpretar reportes, y agregar nuevos cursos.
