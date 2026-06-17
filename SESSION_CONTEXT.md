# UNC Campus Virtual — Session Context

## Status: WAITING — UNC response pending

Awaiting UNC answers to onboarding checklist (access, credentials, point of contact).

## Session log

### 2026-06-02

**Setup:**
- Created `unc-agentic-dev/` — agentic dev infrastructure based on `agentic-diplo-track-sys` patterns
- `bun opencode` command using `dotenv-cli` to load `.env` before launching OpenCode
- `opencode.jsonc` with MCP servers (context7, tavily, playwright, supabase), permissions, custom commands
- `.opencode/` extensions: commands (`/resume`, `/reengagement`, `/dashboard`, `/start`), tools (`at-file.ts`), plugins (`at-resolver.ts`)
- `.context/` directory with UNC project documentation from PDFs
- `cli/doctor.ts` — health check, `scripts/lint-vars.ts` — env var validation
- tsconfig.json, .gitignore, .prettierrc, eslint.config.js — all configured
- Dependencies installed (`bun install` passed, doctor reports OK)

**PDF analysis:**
- PDF #1 "Plan de implementación Reengagement" — sub-project of PDF #2, detailed Moodle plugin config plan
- PDF #2 "Proyecto Automatización" — umbrella project with 4 workstreams

**Deliverable estimates for UNC:**
- 8 email templates: 4 weeks
- Reengagement plugin DEV+PROD: 5 weeks
- Activity dashboard: 3 weeks
- Analytics query + Module 0: 2 weeks
- **Total: 14 weeks (~3.5 months)** — finishes mid-August 2026

**Comparison with UNC schedule:**
- UNC original plan targeted May 2026 completion (already passed)
- All dates in PDFs are behind schedule before developer joined
- August delivery is realistic given current June baseline

**Pending from UNC (onboarding checklist):**
1. Code repository URL + access
2. Moodle URL (dev/staging) + API token
3. PostgreSQL credentials (dev)
4. Confirmation of technical point of contact
5. Where work is tracked (Jira, Trello, etc.)
6. Branch strategy and PR approval process
7. Code conventions (linter, formatter)

**Key contacts identified in PDFs:**
Tadeo Otaola, Ignacio Acuña, Melisa Caffaratti (dashboard), Verónica Gonzalez, Laura Carpio, Matías Salvatierra (induction), Fernando Acosta (Module 0)

## Project files
- `.context/onboarding-checklist.html` — clean checklist for UNC (without contact names)
- `.context/entregables-tiempos.html` — deliverable timeline for UNC

## Next session
When UNC responds: pick up with `/start` or `/resume`, load relevant context, begin Sprint 1.
