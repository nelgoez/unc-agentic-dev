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

| Curso               | Módulos    | Punto de Rescate    | Punto de Mantenimiento |
| ------------------- | ---------- | ------------------- | ---------------------- |
| IA y Automatización | 4 + cierre | Actividad 1 (Mod 1) | Actividad 2 (Mod 2)    |
| Python 1            | 3 + cierre | Actividad 1 (Mod 1) | Actividad 2 (Mod 2)    |
| Yoga y Mindfulness  | 3 + cierre | Actividad 1 (Mod 1) | Actividad 2 (Mod 2)    |

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

| Herramienta                         | Responsable                       |
| ----------------------------------- | --------------------------------- |
| Tour de Automatriculación           | Verónica Gonzalez                 |
| Tour de Autoregistro                | Verónica Gonzalez                 |
| Video de bienvenida                 | Laura Carpio + Matías Salvatierra |
| Mail confirmación Autoregistro      | Verónica Gonzalez + Laura Carpio  |
| Mail confirmación Automatriculación | Verónica Gonzalez + Laura Carpio  |
| Módulo 0 en todos los cursos        | Fernando Acosta                   |

## Development Conventions

- Code in English, UI in Spanish (default) with English option
- TypeScript strict mode
- Environment variables loaded via `dotenv-cli` (see .env.example)
- Secrets NEVER committed — use `{env:VAR}` in opencode.jsonc
- Follow existing patterns in `../diploma-tracking-system/`
- **Non-Dev First** — toda optimización debe requerir cero configuración del prompter. Split de prompts, compresión, y validación deben ser automágicas.

## Testing Conventions (KATA)

Tests follow the **Komponent Action Test Architecture** (KATA):

```
tests/
├── components/
│   ├── TestContext.ts     # Layer 1: config, env, data generation
│   ├── UiFixture.ts       # Layer 4: Playwright + TestContext DI
│   └── ui/                # Layer 3: UI ATCs with @atc decorators
├── e2e/                   # E2E tests using KATA components
└── utils/
    └── decorators.ts      # @atc, @step decorators
```

### KATA rules:

- **No `waitForTimeout`** — ever. Use `waitForSelector`, `waitForURL`, `waitForResponse`, or `locator.waitFor({ state: 'visible' })`.
- **No `waitForLoadState('networkidle')`** — prefer `'load'` or `'domcontentloaded'`. `networkidle` hangs when there's polling.
- **Each ATC = one unique expected outcome** — test methods decorated with `@atc('ID', { story, feature })`.
- **Inline locators** — no separate locator files. Selectors live with the component.
- **No ATC calls another ATC** — components are independent.
- **Fixtures via `createFixture()`** — never instantiate components manually in tests.

## Git Flow

See `docs/workflows/git-flow.md` — branch structure (main → staging → feature/\*), semantic commits (feat/fix/refactor/test/docs), PR flow.

## Multi-Agent Workflow

See `docs/workflows/multi-agent-sprint.md` for the full cycle (Debate → Sprint → Present).

The pattern established:

1. **Plan & Debate** — parallel agents research options (Tavily + Context7), synthesize, human decides
2. **Implementation Sprint** — Implementer → QA Auditor → Hot-Fixer → EM Reviewer (sequential per task)
3. **Present & Refine** — show results, get feedback, iterate if needed

Each task generates: brief → implementer report → review package → QA findings → fixes → EM validation → ledger.

## Session Rules

### Clean up after yourself

On "by" or any termination signal from me, the agent MUST:

1. Remove any temp/test files created during the session (`test-output/`, `_deploy/`, `_zipcheck/`, temp scripts in `scripts/`, etc.)
2. Commit and push if any meaningful work was done
3. Verify the repo is clean (`git status` shows nothing unexpected)
4. Summarize what was done and what state things are left in

### Time milestones are for organization, not deadlines

- Milestones are reference points so I can track progress, not promises or pressure points
- **Attention to detail over speed** — there is no rush
- If more time is needed to do something properly, say so. Always prefer correctness over speed.
- I'd rather have fewer things done well than many things done poorly.

### Work rhythm

- When in doubt, ask. I prefer clarifying questions to assumptions.
- Think before acting. Read the relevant context before making changes.
- Leave things better than you found them — clean formatting, clear structure, no loose ends.

## Verification Checklist

- [ ] `bun run repo:check` passes
- [ ] No hardcoded credentials
- [ ] OpenCode config validates (`opencode.jsonc` schema)
- [ ] `.env` entries match `.env.example` structure
- [ ] Context files updated for current sprint
- [ ] Temp files cleaned, repo is clean
- [ ] KATA conventions followed (no `waitForTimeout`, no `networkidle`)
