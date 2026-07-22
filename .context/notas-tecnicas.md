# Sistema — Notas Técnicas

## Web Services no disponibles

### `core_enrol_get_enrolled_users` — Timeout consistente

**Síntoma:** La WS function `core_enrol_get_enrolled_users` con cualquier `courseid` (incluyendo el sitio course id=1) time out después de 15+ segundos sin respuesta. Otras WS functions (`core_course_get_contents`, `core_grades_get_gradeitems`, `core_cohort_search_cohorts`) responden en <500ms.

**Causa probable:** La función ejecuta una consulta SQL contra `user_enrolments` o `role_assignments` que encuentra table-level locking (InnoDB). El lock wait timeout por defecto en MySQL es 50s (`innodb_lock_wait_timeout`). Moodle no aborta la consulta antes de ese timeout, por lo que la WS function cuelga hasta entonces.

**Investigación:**

- Probado con `courseid=1` (site), `courseid=269`, `courseid=265`, `courseid=267` — todos timeout.
- Probado con `options[onlyactive]=0` y `options[limitnum]=5` — mismo resultado.
- Probado con POST y GET — mismo resultado.
- La función existe en la tabla `external_functions` (no da `invalidrecord`).
- Otras instancias Moodle reportan uso exitoso (OpenFn adaptor, Solin guide).
- Específico de esta instalación de UNC, no un bug de Moodle general.

**Alternativas:**

- Ninguna vía WS sin agregar más funciones al servicio.
- `core_user_get_users` con filtro de cohort podría ser alternativa parcial.
- Direct DB access sería la solución definitiva.

**Estado:** No disponible. Documentado como `status: 'error'` en dbProbes. Reporte muestra "Datos no disponibles".
