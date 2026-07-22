# Sesión 17 de Julio 2026 — State Dump

## Qué se hizo

- Se restauraron archivos históricos de git (`reports/audit/audit-course-269.html`, `reports/evidence/*.png`, `reports/informe-curso-269/`) que habían quedado fuera del HEAD.
- Se corrigió el link de Allure en el reporte: `/allure/` → `allure/` (ruta relativa) en `scripts/generate-audit-report.ts:465`.
- Se commit+push+triggerió CI. El site se rebuildió con el link funcionando.
- Se mandó mail a Ignacio sobre el pipeline funcionando.

## Issues abiertos

### findPhantoms() necesita rewrite (URGENTE)

Archivo: `tests/components/ui/MoodleCourse.ts:239-328`

Problemas:

1. Solo analiza la PRIMERA sección con restricciones. Si hay múltiples gates independientes, ignora el resto.
2. Si el admin view no muestra `restrictionText` (porque el admin bypassea restricciones), retorna 0 findings — falso negativo.
3. El regex bilingüe para extraer nombres de actividades es frágil. Produce falsos positivos (ej: "Módulo II: Actividad individual is complete and passed The activity Notebook Funciones-CEF" es un solo regex match comiéndose texto concatenado de Moodle).
4. Nunca genera findings de severidad `warning` (solo `critical` e `info`).

Fix ideal: comparar admin.sections vs student.sections directamente. Si admin ve una actividad que student no ve → finding. No parsear texto de restricciones.

### Dashboard (separado del audit pipeline)

Archivo: `.context/dashboard/requirements.md`
Responsables: Ignacio Acuña, Tadeo Otaola / Dev: Melisa Caffaratti

### Reengagement

Archivo: `.context/reengagement/plan-implementacion.md`
Falta implementar copys HTML, configuración en producción, activación de cron.

### Course Kit Pitch

Archivo: `docs/pitch/PROPUESTA-unc-course-kit.md`
Presentación: https://unc-course-kit.netlify.app/

## Archivos restaurados del histórico

- `reports/audit/audit-course-269.html` — Old failing report (3 critical, 6 warnings, Módulo 3 + Cierre locked)
- `reports/audit/course-269-section-0.png` a `course-269-section-4.png`
- `reports/evidence/01-course-landing.png` a `07-after-pdf-still-locked.png`
- `reports/informe-curso-269/` — PDF report + informe HTML

## Último commit

`ab0f900` — fix: Allure link uses relative path so it resolves under /unc-agentic-dev/ on GitHub Pages
