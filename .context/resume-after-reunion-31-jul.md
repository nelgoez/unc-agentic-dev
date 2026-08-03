# Resume Point — Post Reunión 31 Julio 2026

> Para retomar exactamente donde dejamos.

---

## Resumen de lo que pasó antes

- Descargamos pre-montaje + validación de Violencias Digitales y Derechos Digitales desde Drive de UNC
- Corrimos audit vía API contra curso 304 (Violencias Digitales) en aulavirtual → 31 actividades, 6 gates, 1 bug potencial (certificado con availability invertida)
- Generamos reporte manual: `reports/audit/audit-304-vs-docs.md`
- Preparamos preguntas: `.context/reunion-unc-31-jul-2026.md`
- Preparamos oferta: `.context/oferta-audit-unc.md`

## Inputs que tenemos

```
../ViolenciasDigitales/
├── [Violencia Digital] Pre-Montaje .md
├── [Violencia Digital] Pre-Montaje .docx
├── VALIDACIÓN - PROYECTO VIOLENCIA DIGITAL - Hoja 1.csv
└── VALIDACIÓN - PROYECTO VIOLENCIA DIGITAL.xlsx

../DerechosDigitalesYSeguridadOnline/
├── 4. [Guzman] PRE-MONTAJE.docx.md
├── 4. [Guzman] PRE-MONTAJE.docx
└── 5. [Guzmán] DOCUMENTO DE VALIDACIÓN - Hoja 1.csv
└── 5. [Guzmán] DOCUMENTO DE VALIDACIÓN.xlsx
```

## Outputs generados

```
reports/audit/
├── course-304-api.json       (130KB, raw API)
└── audit-304-vs-docs.md      (hallazgos manuales)
```

---

## Decisiones de la reunión (completar)

- [ ] Curso piloto: Violencias Digitales (304) / otro: **\_**
- [ ] Formato de entrega: carpeta Drive / archivos sueltos / otro: **\_**
- [ ] Nombres de archivos: estandarizados / variables: **\_**
- [ ] Token WS alcanza o necesitan service account: **\_**
- [ ] Metadata adicional disponible (gates, tiempos): sí / no: **\_**
- [ ] Cómo notifican nuevos cursos: **\_**

---

## Hoja de ruta post-reunión

### Si responden: carpeta Drive + nombres fijos

```
Semana 1:
  packages/unc-course-kit/src/inputs/
    ├── parse-pre-montaje.ts     ← .md + .docx → estructura intermedia
    ├── parse-validacion.ts      ← .csv + .xlsx → recursos indexados
    ├── infer-course-type.ts     ← Tipo A (branching) vs Tipo B (estándar)
    └── map-to-cursoconfig.ts    ← estructura intermedia → CursoConfig

  packages/unc-course-kit/src/qa/
    ├── generate-report.ts       ← CursoConfig + API data → markdown
    └── reconcile.ts             ← docs vs producción → brechas

  packages/unc-course-kit/src/cli/
    └── import.ts                ← bun run import:curso <dir|--drive>

Semana 2:
  └── drive-downloader.ts       ← Google Drive API con token UNC

Tests:
  └── tests/inputs/             ← tests con Violencias Digitales reales
```

### Si responden: solo archivos locales, sin Drive

```
Misma Semana 1 sin drive-downloader.ts.
El CLI recibe directorio local: bun run import:curso ../ViolenciasDigitales
```

### Si responden: token alcanza + studentId debug

```
Agregar al pipeline:
  └── tests/components/api/student-audit.ts
      ← getActivitiesCompletionStatus(courseId, studentId)
      ← "log in as" vía Playwright
```

---

## Archivos clave para retomar

| Para qué              | Archivo                                            |
| --------------------- | -------------------------------------------------- |
| Schema del curso      | `packages/unc-course-kit/src/schema/curso.ts`      |
| Generator existente   | `packages/unc-course-kit/src/generator.ts`         |
| Moodle API client     | `tests/components/api/MoodleApiClient.ts`          |
| Audit orquestador     | `tests/e2e/validate-course.kata.ts`                |
| Tree overlay analyzer | `tests/components/shared/TreeOverlayAnalyzer.ts`   |
| Dependency graph      | `tests/components/shared/CourseDependencyGraph.ts` |
| Auditor DB-level      | `tests/components/ui/MoodleAuditor.ts`             |
| Preguntas reunión     | `.context/reunion-unc-31-jul-2026.md`              |
| Oferta a UNC          | `.context/oferta-audit-unc.md`                     |
| Inputs Violencias     | `../ViolenciasDigitales/`                          |
| Inputs Derechos       | `../DerechosDigitalesYSeguridadOnline/`            |

## Env vars relevantes

```
MOODLE_BASE_URL=https://campus.aulavirtual.unc.edu.ar
MOODLE_WS_TOKEN=372f57d5d8e35a727c1a0d3da3181538
TEST_COURSE_ID=304    (cambiar a 269 para default)
ADMIN_USERNAME=nagomez@mi.unc.edu.ar
ADMIN_PASSWORD=entroPIA01
```

---

## Comandos para retomar

```bash
# Ver estructura del curso 304 (API)
curl --insecure "https://campus.aulavirtual.unc.edu.ar/webservice/rest/server.php?wstoken=372f57d5d8e35a727c1a0d3da3181538&wsfunction=core_course_get_contents&courseid=304&moodlewsrestformat=json" | python -m json.tool | head -50

# Correr audit full (necesita Playwright)
TEST_COURSE_ID=304 bun run test tests/e2e/validate-course.kata.ts

# Correr solo API audit (sin browser)
TEST_COURSE_ID=304 bun run test tests/e2e/api-audit.kata.ts

# Construir parsers (post-reunión)
bun run build -- packages/unc-course-kit/src/inputs/
```
