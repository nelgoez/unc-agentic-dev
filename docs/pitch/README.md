# UNC Course Kit — Estado del Proyecto

> Documento de estado actual del proyecto `unc-course-kit`, pensado como anexo a la propuesta de negocio.

---

## Resumen del estado actual

| Aspecto                  | Estado                                                                           |
| ------------------------ | -------------------------------------------------------------------------------- |
| **Propuesta de negocio** | ✅ `PROPUESTA-unc-course-kit.md` — documento completo listo para revisión        |
| **Presentación**         | ✅ `index.html` — 14 slides, interactiva, con screenshots de Gemini CLI          |
| **Código**               | ⏳ Pre-implementación — `packages/unc-course-kit/` existe pero requiere refactor |
| **Cliente/usuario**      | ⏳ En espera de decisión — el equipo prompters necesita optar                    |

---

## Lo que existe hoy (pre-implementación)

### `packages/unc-course-kit/` (v0.1.0)

Esqueleto del CLI generador. Creado como subpackage del monorepo `unc-agentic-dev`.

```
packages/unc-course-kit/
├── package.json           ← Dependencias instaladas (@inquirer/prompts, yaml)
├── tsconfig.json
├── src/
│   ├── index.ts           ← Entry point CLI
│   ├── generator.ts       ← Generador de archivos (curso.yaml, fases, QA, configs)
│   ├── schema/curso.ts    ← Tipos TypeScript para el modelo de curso
│   └── prompts/course.ts  ← Preguntas interactivas al usuario
└── test-output/           ← (eliminado, prueba exitosa)
```

**Lo que necesita cambiar antes de producción:**

- Schema: migrar de `modules[] → activities[]` a `sections[] → items[]` (schema generalizado con topics, labels, resources, activities)
- Agregar `validate-deps.ts` — validador de dependencias standalone
- Agregar `unlock_requires` al schema (dependencias entre secciones)
- Dual output: `.gemini/settings.json` + `.opencode/skills/`

### `docs/pitch/` (material de venta)

```
docs/pitch/
├── README.md                           ← Este archivo
├── PROPUESTA-unc-course-kit.md         ← Documento de propuesta (markdown, 16 KB)
├── index.html                          ← Presentación HTML interactiva (14 slides, 38 KB)
├── images/
│   ├── gemini-cli-official.png         ← Screenshot oficial Gemini CLI (226 KB)
│   └── gemini-cli-terminal.png         ← Screenshot de sesión terminal (16 KB)
└── assets/                             ← Framework de presentación (html-ppt)
    ├── base.css
    ├── runtime.js
    ├── themes/ (36 temas)
    └── animations/ (27 CSS + 20 canvas FX)
```

### Otras partes del repo relevantes

```
.context/
├── unc-overview.md                     ← Visión general del proyecto
├── cursos-activos.md                   ← Cursos actuales (IA, Python, Yoga)
├── reengagement/plan-implementacion.md ← Plan de reengagement
└── dashboard/requirements.md           ← Dashboard de activity completion

reports/
├── audit/audit-course-269.html         ← Auditoría del curso 269 (el caso crítico)
└── evidence/                           ← Screenshots del bug en curso 269
```

---

## Lo que falta para producción

### Prioridad 1 (pre-requisito para cualquier implementación)

- [ ] Decisión del equipo prompters de adoptar el proceso
- [ ] Acceso a usuario admin de Moodle para validación contra cursos reales
- [ ] Definición de un curso piloto para la prueba

### Prioridad 2 (implementación técnica — ~3 semanas)

- [ ] Schema generalizado (`sections[]` + `items[]` + `unlock_requires[]`)
- [ ] `validate-deps.ts` — validador automático de dependencias
- [ ] Validación contra Moodle real vía API (con admin)
- [ ] Dual agent output: `.gemini/` + `.opencode/`
- [ ] Generación de Mermaid diagramas estáticos
- [ ] Peer review templates y checklists

### Prioridad 3 (mejoras opt-in)

- [ ] Integración opt-in con Graphify (grafo interactivo, queries)
- [ ] Moodle activitymap plugin (visible para estudiantes en producción)
- [ ] Monitoreo post-publish con alertas automáticas

---

## Stack técnico (confirmado, todo gratis)

| Componente               | Herramienta               | Costo |
| ------------------------ | ------------------------- | ----- |
| CLI generador            | TypeScript + Bun          | $0    |
| Validación               | validate-deps.ts (TS/Bun) | $0    |
| Agente por defecto       | Gemini CLI                | $0    |
| LLM                      | Gemini API (Free Tier)    | $0    |
| Agente alternativo       | OpenCode                  | $0    |
| Grafo visual (opt-in)    | Graphify + Gemini API     | $0    |
| Grafo en Moodle (opt-in) | moodle-mod_activitymap    | $0    |
| Diagramas estáticos      | Mermaid CLI               | $0    |

---

## Contacto

Proyecto: `unc-agentic-dev` — UNC Campus Virtual
Repo: local `D:\Nahuel\Proyectos\UNC\unc-agentic-dev`
Pitch: `docs/pitch/index.html` (abrir en browser)

---

_Documento generado el 17 de junio de 2026 — Estado pre-implementación_
