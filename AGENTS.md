# UNC Campus Virtual — Agent Guidelines

## Overview

UNC Campus Virtual automation & student success platform. Three workstreams:

1. **Moodle Reengagement** — Plugin `mod_reengagement` config for automated rescue emails
   across 3 courses (IA y Automatización, Python 1, Yoga y Mindfulness).
2. **Activity Analysis Dashboard** — Built with Moodle Configurable Reports plugin.
   Tracks activity completion rates, alerts on at-risk activities.
3. **Diploma Tracking System** — Student progress tracking with Moodle + Guaraní integration.
   React + Express + TypeORM app under `../diploma-tracking-system/`.

## Key Commands

- `bun run opencode` — Launch OpenCode with .env vars loaded
- `bun run repo:check` — Full quality gate (format + lint + types + vars)
- `bun run vars:check` — Validate project variable declarations
- `bun install` — Install dependencies (runs from any subdirectory)

## Project Structure

```
unc-agentic-dev/           # This repo — agentic infrastructure
├── .opencode/             # OpenCode extensions (commands, tools, plugins)
├── scripts/               # Maintenance scripts (lint-vars, etc.)
├── cli/                   # CLI tools (doctor, install)
├── .context/              # Project documentation & specs
├── opencode.jsonc         # OpenCode shared config
└── .env                   # Local secrets (gitignored)

../diploma-tracking-system/  # The app (separate repo)
├── server/                # Express + TypeORM backend
├── client/                # React + Vite frontend
└── ...
```

## Moodle Reengagement — Key Data Points

Courses and their rescue/maintenance trigger points:

| Curso                  | Módulos | Punto de Rescate  | Punto de Mantenimiento |
|------------------------|---------|--------------------|------------------------|
| IA y Automatización    | 4 + cierre | Actividad 1 (Mod 1) | Actividad 2 (Mod 2)  |
| Python 1               | 3 + cierre | Actividad 1 (Mod 1) | Actividad 2 (Mod 2)  |
| Yoga y Mindfulness     | 3 + cierre | Actividad 1 (Mod 1) | Actividad 2 (Mod 2)  |

**KPIs tracked:**
- Tasa de Reactivación (%) — inactivos que completaron Actividad 1 tras email
- Tiempo Medio de Respuesta — horas hasta completar la actividad
- Tiempo promedio de resolución Módulo 2 vs cohortes anteriores
- Clics en enlaces del correo vs finalización de actividad

**Moodle events for analytics:**
- `\mod_reengagement\event\email_sent` — email dispatch
- `\core\event\course_module_completion_updated` — activity completion

## Activity Dashboard

- Built on Moodle `configurable_reports` plugin
- Tracks per-course activity completion rates
- Alert thresholds for under/over-performing activities
- Responsables: Ignacio Acuña, Tadeo Otaola / Dev: Melisa Caffaratti

## Student Induction (Subproyecto Automatización)

| Herramienta                 | Responsable       |
|-----------------------------|-------------------|
| Tour de Automatriculación   | Verónica Gonzalez |
| Tour de Autoregistro        | Verónica Gonzalez |
| Video de bienvenida         | Laura Carpio + Matías Salvatierra |
| Mail confirmación Autoregistro | Verónica Gonzalez + Laura Carpio |
| Mail confirmación Automatriculación | Verónica Gonzalez + Laura Carpio |
| Módulo 0 en todos los cursos | Fernando Acosta |

## Development Conventions

- Code in English, UI in Spanish (default) with English option
- TypeScript strict mode
- Environment variables loaded via `dotenv-cli` (see .env.example)
- Secrets NEVER committed — use `{env:VAR}` in opencode.jsonc
- Follow existing patterns in `../diploma-tracking-system/`

## Verification Checklist

- [ ] `bun run repo:check` passes
- [ ] No hardcoded credentials
- [ ] OpenCode config validates (`opencode.jsonc` schema)
- [ ] `.env` entries match `.env.example` structure
- [ ] Context files updated for current sprint
