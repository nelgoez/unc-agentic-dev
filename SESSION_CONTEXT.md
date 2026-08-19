# UNC Campus Virtual — Session Context (RESUME HERE)

## Status: PROPOSAL PIVOT DONE — pending Nahuel's review before sending to UNC

Patricia Altamirano (Directora del Campus) pidió un enfoque más amplio que la propuesta de
"auditoría de Moodle": partir de los problemas/procesos, no de la herramienta. Reencuadramos nuestra
oferta como la **capa de arquitectura + instrumentación de QA** de la Estrategia de Automatización
del Campus, produjimos email + propuesta formal + deck + PDF, y quedó todo pusheado.

## Dónde estamos

- Propuesta reencuadrada: de "herramienta de auditoría" → "estrategia de automatización".
- Todos los artefactos escritos, refinados y pusheados a `master` (4 commits).
- `bun run repo:check` en verde (format + lint + types + vars).
- **Todavía NO se envió a la UNC** — falta que Nahuel revise y envíe.

## Entregables (archivos)

Cliente (español):

- `.context/comunicacion-patricia-ago-2026.md` — **cuerpo del email** (para Patricia + Natalia + Nacho + Fer + Victoria)
- `.context/nota-privada-patricia-ago-2026.md` — nota privada corta a Patricia (DM aparte)
- `.context/propuesta-automatizacion-unc.md` — propuesta formal (fuente del PDF)
- `docs/pitch/propuesta-automatizacion.html` — deck interactivo (10 slides)
- `docs/pitch/propuesta-automatizacion-unc.pdf` — propuesta formal en PDF (generado)
- `docs/setup-audit-trigger-apps-script.md` — reemplazo Apps Script del trigger de auditoría (segundo plano)

Interno:

- `.context/pivot-patricia-ago-2026.md` — registro de decisión del pivote

## Decisiones clave (lockeadas)

- Posicionamiento: capa de arquitectura + QA de la estrategia (no iniciativa paralela).
- Fase 0 (diagnóstico + arquitectura) = **38–40 módulos UNC**, único pago, contratable ya.
- Fases 1 y 2 como visión, a cotizar post-Fase 0.
- Santex = socio de capacitación; nosotros dueños de arquitectura + integración.
- Glosario (KPI, mantenibilidad, escalabilidad, ROI, RACI, instrumentación) en email y propuesta formal.
- Trigger de auditoría: Google Apps Script (cuota free de Netlify agotada).

## Tooling arreglado (leveling up)

- `.gitattributes` (`* text=auto eol=lf`) — arregló el pre-commit hook roto (lint-staged `git stash create` se rompía con warnings CRLF).
- `eslint.config.js` — desactivada `jsonc/comma-dangle` (chocaba con prettier `trailingComma: all`).
- `.prettierignore` + `.gitignore` — excluidos artefactos generados (test-results, .playwright-mcp).
- 22 errores de lint preexistentes resueltos (código muerto, regex, while→for, callbacks tipados).

## Próximos pasos (en orden)

1. Nahuel revisa y **envía** el email + nota privada a Patricia (con links a deck y PDF).
2. Coordinar la reunión de trabajo con Nacho + Natalia.
3. Esperar la info de la UNC (los 7 puntos del email) → arrancar Fase 0.
4. Opcional: verificar que el deck renderiza bien en el browser (abrir `propuesta-automatizacion.html`).

## Commits pusheados

- `c7c6e2c` fix: lint + conflicto config + .gitattributes
- `1d8e4fe` docs: artefactos de propuesta iniciales
- `e5ea53b` docs: refinar propuesta (cómo de Fase 0, relevamiento, glosario)
- `fd371bd` chore: prettierignore/gitignore artefactos generados

## Al retomar: leer esto

1. Este archivo (`SESSION_CONTEXT.md`)
2. `.context/pivot-patricia-ago-2026.md` (registro de decisión)
3. `.context/comunicacion-patricia-ago-2026.md` (el email a enviar)
4. `.context/propuesta-automatizacion-unc.md` (la propuesta formal)
