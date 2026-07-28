# Sesión 24-28 Julio 2026 — Neto Fixes: Report Accuracy Sprint

## Estado final

- **CI:** ✅ Verde
- **12 commits** en master
- **Reporte en vivo:** https://nelgoez.github.io/unc-agentic-dev/
- **27 unit tests** — todos pasan

## Resumen

Sprint completo de accuracy del reporte de auditoría. Arrancó con el plan-neto-fixes.md (8 problemas identificados) y se ejecutó en 4 iteraciones con subagent-driven development, agentic debate para decisiones de severidad, y role-play como cliente/Tadeo para evaluar cada entregable antes de avanzar.

## Reporte: Antes → Después

| Sección                  | Antes                              | Después                                               |
| ------------------------ | ---------------------------------- | ----------------------------------------------------- |
| **Status bar**           | 🟢 OK — Sin problemas              | 🔴 BLOQUEO — 1 bloqueo(s)                             |
| **6918**                 | ℹ️ INFO (duplicado colapsado)      | 🔴 CRITICAL — "bloquea avance al módulo siguiente"    |
| **Detalle técnico 6917** | ❌ sin acceso (por severidad)      | ✅ visible (por cmid en detail text)                  |
| **Detalle técnico 6918** | ❌ sin acceso                      | ❌ sin acceso (correcto)                              |
| **"En investigación"**   | `visible=0` (falso)                | `visible=1` + mención duplicado + Show More           |
| **nelthor**              | "completó sin problemas"           | 13 completadas, 15 bloqueadas, con explicación        |
| **Comparación visual**   | Una línea genérica                 | Guía completa con íconos y qué buscar                 |
| **Cómo reproducir**      | "Coincide con reporte de abajo"    | Inspeccionar 6918, verificar href faltante, Show More |
| **Limitaciones**         | Especulación sobre tracking dañado | Limitaciones técnicas honestas                        |
| **module.id**            | module.id=6917                     | actividad.id=6917                                     |

## Lo que se hizo

### Sprint 1A — Show More en contexto estudiante

- `detectShowMoreBug()` corría en step 10, después de revertToAdmin → siempre OK (admin)
- Movido a step 8b, entre screenshots estudiante y revertToAdmin → ahora corre como estudiante

### Sprint 1B — Condiciones de sección en overlay

- `getAvailabilityJsonBreakdown()` parseaba solo condiciones de módulo, no de sección
- Agregado `sectionConditions` al breakdown usando `traverseAvailabilityTree()`
- Consumido en validate-course.kata.ts para poblar `conditionReferencedCmids`

### Agentic Debate — Severidad de 6918

- **Opción A (WARNING):** "API confirma acceso, es bug de UI, no de permisos"
- **Opción B (CRITICAL):** "Estudiantes bloqueados, no pueden completar, Module 3 inaccesible"
- **Decisión final:** CRITICAL — porque tiene completion tracking y auto-complete, el API `core_completion_get_activities_completion_status` devuelve todos los módulos incluso los ocultos, y el estudiante no puede interactuar con 6918

### Sprint 2 — 6 fixes de wording

1. `studentApiGraph` → `studentUiGraph` en detección de duplicados
2. "En investigación": `visible=0` → `visible=1` + mención duplicado + Show More
3. Status bar: muestra REVISAR cuando hay info findings de duplicados
4. nelthor: "sin problemas" → "desde admin (switch-role)"
5. Sección Show More agregada
6. Dev note verificada

### Sprint 3 — Fixes adicionales post-Demo

- **CRITICAL auto-complete**: detecta bloquer incluso sin conditionReferencedCmids (porque condiciones de sección usan `type: "section"`, no `type: "completion"`)
- **nelthor counts**: restaurados con wording preciso (13 completadas, 15 bloqueadas)
- **Progression section**: consistente con nelthor (13/28 con contexto de reversión)
- **Cómo reproducir**: rewrite completo con pasos específicos para 6918
- **Comparación visual**: guía de íconos, qué buscar, call to action
- **Detalle técnico**: visibilidad por actividad (no por severidad), `module.id` → `actividad.id`

## Metodología

- **Subagent-driven development**: Sprints 1A y 1B en paralelo con implementer subagents
- **Agentic debate**: 2 agentes (Pragmatic vs Architect) para decisión WARNING vs CRITICAL
- **Client role-play**: cada sprint terminaba con "Tadeo abre el reporte — ¿qué ve?" como gate de aceptación
- **Auto-audit en CI**: cada commit deployeaba a GitHub Pages, verificábamos el HTML generado

## Archivos modificados (esta sesión)

| Archivo                                          | Cambios                                          |
| ------------------------------------------------ | ------------------------------------------------ |
| `tests/e2e/validate-course.kata.ts`              | Show More a step 8b, sectionConditions           |
| `tests/components/api/MoodleApiClient.ts`        | sectionConditions en breakdown                   |
| `tests/components/shared/TreeOverlayAnalyzer.ts` | studentUiGraph, CRITICAL auto-complete           |
| `scripts/generate-audit-report.ts`               | ~12 fixes acumulados (wording, severidad, guías) |

## Commits

```
bab00af chore: remove stale subagent artifacts from .superpowers/sdd/
6063d3c fix(audit): fix tech detail module visibility — per-activity, not severity-based
c0d48e4 fix(audit): rewrite reproduction guide and visual comparison to be actionable
e371d4a fix(audit): restore nelthor counts with precise wording
8fc28a7 fix(audit): remove contaminated nelthor counts, detect auto-complete dupes CRITICAL
0d6ee5a fix(audit): detect auto-complete file duplicates as CRITICAL blockers
907a40b fix(audit): promote 6918 to CRITICAL, rewrite nelthor + comparison + caveats
e53210e fix(audit): fix report wording for accuracy — 6 text changes
efe4486 fix(audit): include section-level completion conditions in condition-referenced cmid set
a37a971 fix(audit): move Show More detection from step 10 (admin) to step 8b (student context)
... (2 commits de sesión 24-jul: enrol_manual_enrol_users, cmid matching)
```
