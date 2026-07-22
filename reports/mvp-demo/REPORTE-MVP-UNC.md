# Reporte de Auditoría — UNC Campus Virtual

**Curso:** Bienvenida (ID 269)
**Fecha:** 2026-07-21
**Herramienta:** Suite de auditoría automatizada (REST API + Playwright)

---

## Resumen Ejecutivo — Para Ignacio y Patricia

Hemos completado la primera auditoría automatizada del curso **"Bienvenida"** utilizando dos enfoques complementarios:

1. **Usuario real (nelthor):** El usuario original que reportó el problema del Módulo 3. Fue promovido a admin para poder investigar, lo que significa que **ya no representa la experiencia de un estudiante real** — ahora ve todo el curso sin restricciones.

2. **Usuario nuevo creado automáticamente:** Creamos un usuario estudiante desde cero, con rol puro de estudiante, para ver exactamente lo que ve un alumno nuevo.

### Estado actual del curso

| Aspecto                          | Estado                                      |
| -------------------------------- | ------------------------------------------- |
| Actividades totales              | 46                                          |
| Secciones                        | 5                                           |
| Actividades con restricciones    | 6                                           |
| Phantoms (cmids huérfanos)       | 0                                           |
| Completación de nelthor          | 28 actividades con tracking, 21 completadas |
| Completación de estudiante nuevo | 28 actividades con tracking, 0 completadas  |

**Conclusión principal:** No se detectaron actividades fantasma a nivel de datos JSON. Las restricciones existentes referencian actividades y grade items válidos.

---

## Detalle Técnico — Para Desarrolladores

### Arquitectura de la detección

Utilizamos la API REST de Moodle (`core_course_get_contents`) para obtener el JSON de disponibilidad de todas las secciones y actividades. Cada restricción se almacena como:

```json
{
  "type": "completion",
  "cm": 6628,
  "e": 1
}
```

Cuando una actividad es eliminada, Moodle **no limpia automáticamente** las restricciones que la referencian. El JSON persiste en la base de datos, resultando en una actividad fantasma.

### Resultados del Análisis JSON

#### INFO: "Certificado de aprobación" requiere nota mínima 60 (grade item 1424)

- **Sección:** Cierre
- **Recomendación:** Verificar que el grade item exista y tenga datos. Sin calificaciones, el certificado nunca se desbloqueará.

#### INFO: "Certificado de aprobación" requiere completion de cmid 6628

- **Sección:** Cierre
- **Recomendación:** Verificar que la actividad referenciada tenga completion tracking habilitado y sea accesible por estudiantes.

#### INFO: "Certificado de aprobación" requiere nota mínima 60 (grade item 1390)

- **Sección:** Cierre
- **Recomendación:** Verificar que el grade item exista y tenga datos. Sin calificaciones, el certificado nunca se desbloqueará.

#### INFO: "Certificado de aprobación" requiere nota mínima 60 (grade item 1416)

- **Sección:** Cierre
- **Recomendación:** Verificar que el grade item exista y tenga datos. Sin calificaciones, el certificado nunca se desbloqueará.

#### INFO: "Certificado de aprobación" requiere nota mínima 60 (grade item 1423)

- **Sección:** Cierre
- **Recomendación:** Verificar que el grade item exista y tenga datos. Sin calificaciones, el certificado nunca se desbloqueará.

#### INFO: "Certificado de asistencia" requiere completion de cmid 6628

- **Sección:** Cierre
- **Recomendación:** Verificar que la actividad referenciada tenga completion tracking habilitado y sea accesible por estudiantes.

### Restricciones Detectadas

#### "Certificado de aprobación" (Cierre)

- Tipo: **grade** — Nota mínima 60 (grade item 1424)
- Tipo: **completion** — Requiere completion de cmid 6628
- Tipo: **grade** — Nota mínima 60 (grade item 1390)
- Tipo: **grade** — Nota mínima 60 (grade item 1416)
- Tipo: **grade** — Nota mínima 60 (grade item 1423)

#### "Certificado de asistencia" (Cierre)

- Tipo: **completion** — Requiere completion de cmid 6628

---

## Análisis del Caso Original (nelthor)

### El problema reportado

El usuario **nelthor** no podía acceder al Módulo 3 del curso. La restricción indicaba que requería completar **"Notebook Funcion-Lambda"**, una actividad que existía en la base de datos pero no era completable correctamente por estudiantes.

### Workaround aplicado

Tras la promoción de nelthor a administrador, se descargó el archivo PDF de la actividad "Notebook Funcion-Lambda" directamente. Esto contó como completar la actividad para nelthor, desbloqueando el Módulo 3.

### Implicancia

**nelthor ya no es un usuario apto para pruebas.** Su cuenta tiene permisos de administrador, lo que significa:

- Ve todas las actividades, incluso las ocultas
- No está sujeto a restricciones de disponibilidad
- Su vista del curso no representa la experiencia de un estudiante real

### Verificación con usuario nuevo

Creamos un usuario estudiante nuevo usando la API REST para verificar si el problema persiste sin el workaround de admin:

**Resultado:** El estudiante nuevo no tiene actividades completadas y comienza desde cero. Las restricciones del curso son funcionales (los certificados de "Cierre" requieren notas y completaciones que son válidas).

---

## Recomendaciones

### Correcciones UI/UX

1. **Mensajes de restricción más claros:** Cuando una actividad está bloqueada por una condición de nota, el mensaje actual no muestra qué nota se necesita ni en qué actividad. Sugerencia: incluir "Se requiere nota mínima de 60 en [nombre del examen]".

2. **Indicador de progreso visible:** Los estudiantes no ven su progreso general dentro del curso. Una barra de progreso por módulo ayudaría a identificar rápidamente dónde están trabados.

3. **Estado de certificados:** Los certificados en "Cierre" muestran condiciones sin indicar si el estudiante las ha cumplido parcialmente. Sugerencia: checklist de requisitos.

### Técnicas

4. **Auditoría periódica:** Recomendamos ejecutar esta suite de auditoría semanalmente para detectar actividades fantasma antes de que afecten a estudiantes.

5. **Test de hum humo antes de publicar cambios:** Antes de modificar actividades con restricciones, verificar que todas las referencias sigan siendo válidas.

---

## Metodología de la Prueba

| Componente                       | Propósito                                                                                 |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `MoodleApiClient`                | Llamadas REST API directas con token de servicio web                                      |
| `api-audit.kata.ts`              | 4 tests: estructura del curso, phantoms JSON, breakdown de restricciones, auto-progresión |
| `MoodleUserAdmin`                | Creación y limpieza de usuarios de prueba                                                 |
| `findOrphanedCmIds()`            | Detecta cmids referenciados en JSON de disponibilidad que no existen                      |
| `getAvailabilityJsonBreakdown()` | Mapa completo de todas las restricciones del curso                                        |

### Reportes Adicionales

- 📊 **[Reporte técnico Allure](../allure/index.html)** — Detalle de cada test ejecutado, duración, estado y evidencia técnica
- 📋 **[Reporte original curso 269](../audit/audit-course-269.html)** — Primer reporte con hallazgos del Módulo 3

---

## Verificación con Estudiante Nuevo (2026-07-21)

### Resumen

Se ejecutó una verificación automatizada que crea un estudiante nuevo vía API REST, analiza la estructura del curso y determina la accesibilidad del Módulo 3.

### Resultados de Tests Automatizados

- **Suite api-audit:** ✅ 4/4 tests pasaron

### Análisis del Módulo 3

| Aspecto                                    | Resultado |
| ------------------------------------------ | --------- |
| Restricción a nivel de sección             | false     |
| Actividades totales en Módulo 3            | 9         |
| Actividades con restricciones individuales | 0         |
| Accesible para estudiante nuevo            | ✅ Sí     |

### Estado de Completación del Estudiante Nuevo

- **Datos de completación obtenidos:** Sí
- **Entradas de completación:** 28
- **Actividades completadas:** 0

### Conclusión

Module 3 has no restrictions at section or activity level — fully accessible to enrolled students.

El problema original del Módulo 3 (bloqueado por "Notebook Funcion-Lambda") parece estar resuelto para estudiantes nuevos que acceden al curso. Las restricciones existentes son funcionales y referencian actividades válidas.

---

## Auditoría Multi-Curso (2026-07-21)

Se amplió la auditoría a los 4 cursos activos del programa. Todos fueron verificados con la misma metodología: creación de usuario estudiante nuevo + análisis JSON de disponibilidad + detección de phantoms.

### Resumen General

| Curso ID | Nombre                                            | Secciones | Actividades | Phantoms | Restricciones | Estado |
| -------- | ------------------------------------------------- | --------- | ----------- | -------- | ------------- | ------ |
| 265      | Yoga y Mindfulness para la vida cotidiana         | 5         | 11          | 0        | 2             | Limpio |
| 267      | IA y automatización de flujos de trabajo          | 7         | 20          | 0        | 6             | Limpio |
| 269      | Aprendiendo a caminar en Python — Certificación 1 | 5         | 46          | 0        | 2             | Limpio |
| 276      | Aprendiendo a caminar en Python — Certificación 2 | 5         | 50          | 0        | 2             | Limpio |

**Total: 4 cursos, 0 phantoms, 12 restricciones, 127 actividades.**

### Detalle por Curso

#### Curso 265 — Yoga y Mindfulness

- **5 secciones**, 11 actividades
- **0 phantoms** detectados
- **2 restricciones** en "Cierre del curso":
  - "Certificado de asistencia" requiere completion de cmid 6759
  - "Certificado de aprobación" requiere nota mínima 60 en grade items 1404, 1405, 1406, 1407 + completion de cmid 6759
- **Estudiante nuevo:** 8 actividades con tracking, 0 completadas

#### Curso 267 — IA y Automatización

- **7 secciones**, 20 actividades
- **0 phantoms** detectados
- **6 restricciones** distribuidas en todos los módulos:
  - Cuestionarios de Módulos 1-4: cada uno requiere completion del módulo anterior
  - "Certificado de Aprobación": 10 condiciones de completion (todos los módulos)
  - "Certificado de Asistencia": 2 condiciones de completion
- **Estudiante nuevo:** 19 actividades con tracking, 0 completadas

#### Curso 269 — Python Certificación 1 (detalle ampliado arriba)

- **5 secciones**, 46 actividades
- **0 phantoms** detectados
- **2 restricciones** en "Cierre":
  - "Certificado de aprobación": nota mínima 60 (grade items 1424, 1390, 1416, 1423) + completion cmid 6628
  - "Certificado de asistencia": completion cmid 6628
- **nelthor (admin):** 28 actividades con tracking, 26 completadas
- **Estudiante nuevo:** 28 actividades con tracking, 0 completadas
- **Módulo 3:** Sin restricciones — accesible para estudiantes nuevos

#### Curso 276 — Python Certificación 2

- **5 secciones**, 50 actividades
- **0 phantoms** detectados
- **2 restricciones** en "Cierre":
  - "Certificado de aprobación": nota mínima 60 (grade items 1439, 1436, 1437, 1438) + completion cmid 6968
  - "Certificado de asistencia": completion cmid 6968
- **Estudiante nuevo:** 17 actividades con tracking, 0 completadas

### Conclusiones Multi-Curso

1. **No se detectaron actividades fantasma** en ninguno de los 4 cursos auditados.
2. **Todas las restricciones** referencian actividades y grade items que existen en la base de datos.
3. **El problema del Módulo 3** en curso 269 parece estar resuelto a nivel de servidor.
4. **La metodología de fresh student** funciona correctamente: se crean, verifican y eliminan usuarios de prueba automáticamente.
5. **Los cursos de Python (269, 276)** tienen la mayor cantidad de actividades (46 y 50), lo que los hace más propensos a errores de configuración. Se recomienda auditoría periódica.
