# UNC Campus Virtual — Session Context (RESUME HERE)

## Status: PROPUESTA FINALIZADA — lista para enviar (falta Nahuel: adjuntar PDF + enviar)

Propuesta de **Estrategia de Automatización** del Campus Virtual (pivote desde "auditoría de Moodle"
tras feedback de Patricia Altamirano). Email + propuesta formal + deck + PDF **pulidos, pusheados y
verificados**. Solo falta que Nahuel envíe. Queda pendiente (segundo plano) el Apps Script del
trigger de auditoría.

---

## ⚠️ IMPORTANTE — no volar el presupuesto de contexto

Hoy (19/08) se gastó presupuesto de más en un reajuste menor. Para NO repetirlo:

- **Usá `/caveman` (o el skill `caveman`) siempre** — comprime ~65% de los tokens de salida.
- **Consultá `graphify` antes de releer archivos** — `graphify-out/` YA existe: tratá toda pregunta
  sobre el codebase/arquitectura como query de graphify primero, no como `grep`/`read` sueltos.
- **No releas archivos ya conocidos** — si ya está en contexto (AGENTS.md, SESSION_CONTEXT.md,
  instrucciones), no lo leas de nuevo.
- Antes de cualquier edición, pedí el alcance exacto y usá el menor contexto posible.

---

## Dónde estamos

- Propuesta reencuadrada: de "herramienta de auditoría" → "estrategia de automatización" (capa de
  arquitectura + instrumentación).
- Email + propuesta + deck + PDF: **refinados en 1ª persona, glosario arriba, RACI con inglés**.
- Trigger de auditoría: **ya no depende de Netlify** (cuota free agotada) → botón apunta al
  `workflow_dispatch` de GitHub (manual, funciona ya). El 1-click real vuelve con Apps Script.
- **Limpieza**: propuestas descartadas eliminadas (Course Kit + QA-only + cotización de Jun). Solo
  queda la propuesta vigente.
- `bun run repo:check` en verde. `opencode.jsonc` válido.

## Entregables (archivos)

Cliente (español):

- `.context/comunicacion-patricia-ago-2026.md` — cuerpo del email (fuente, 1ª persona)
- `.context/comunicacion-patricia-ago-2026.html` — **email copy-paste ready** (abrir en browser, Ctrl+A → pegar en Gmail)
- `.context/nota-privada-patricia-ago-2026.md` — nota privada corta a Patricia (DM aparte)
- `.context/propuesta-automatizacion-unc.md` — propuesta formal (fuente del PDF)
- `docs/pitch/propuesta-automatizacion.html` — deck interactivo (10 slides, con hint de flechas)
- `docs/pitch/propuesta-automatizacion-unc.pdf` — propuesta formal en PDF (regenerado, glosario en §2)
- `docs/pitch/propuesta-automatizacion-unc.html` — propuesta formal en HTML (auto desde el .md)

Links en vivo (Netlify static + GitHub Pages):

- PDF: https://unc-course-kit.netlify.app/propuesta-automatizacion-unc.pdf
- Deck: https://unc-course-kit.netlify.app/propuesta-automatizacion.html
- Evidencia (reportes): https://nelgoez.github.io/unc-agentic-dev/audit/

Interno:

- `.context/pivot-patricia-ago-2026.md` — registro de decisión del pivote
- `docs/setup-audit-trigger-apps-script.md` — cómo reemplazar el trigger por Apps Script

## Decisiones clave (lockeadas)

- Posicionamiento: capa de arquitectura + QA de la estrategia (no iniciativa paralela).
- Fase 0 (diagnóstico + arquitectura) = **38–40 módulos UNC**, único pago, contratable ya.
- Fases 1 y 2 como visión, a cotizar post-Fase 0.
- Santex = socio de capacitación; nosotros dueños de arquitectura + integración.
- Glosario (KPI, mantenibilidad, escalabilidad, ROI, RACI, instrumentación) en email y propuesta formal.
- Email en **1ª persona singular** (yo/mi), no "nosotros".
- Destinatarios del email: Patricia + Natalia + Ignacio (Nacho) + Fernando Acosta. ~~Victoria~~ eliminada (no existía).

## Próximos pasos (en orden)

1. **Nahuel envía** el email (adjuntar `docs/pitch/propuesta-automatizacion-unc.pdf`; el link online
   ya quedó actualizado tras el push).
2. **Apps Script trigger** (segundo plano): Nahuel crea el script en script.google.com (código en
   `docs/setup-audit-trigger-apps-script.md`), agrega `GITHUB_PAT`, despliega y **me pasa la URL `/exec`**
   → cableo los botones de los reportes a `GET /exec?courseId=N` (hoy apuntan al workflow_dispatch).
3. Coordinar reunión de trabajo con Nacho + Natalia.
4. Esperar info de la UNC (7 puntos del email) → arrancar Fase 0.

## Commits pusheados

- `14f3b99` chore: eliminar propuestas descartadas (Course Kit y QA) y actualizar referencias
- `6199139` docs: pulir email y propuesta (glosario arriba, RACI inglés, 1ª persona, links deck/PDF)
- `73800d1` fix: apuntar trigger de auditoría a workflow_dispatch (cuota Netlify agotada)
- `539a06e` docs: alinear deck con propuesta refinada + hand-off de sesión
- `c7c6e2c` fix: lint + conflicto config + .gitattributes

## Al retomar: leer esto

1. Este archivo (`SESSION_CONTEXT.md`)
2. `.context/pivot-patricia-ago-2026.md` (registro de decisión)
3. `.context/comunicacion-patricia-ago-2026.md` (el email a enviar)
4. `.context/propuesta-automatizacion-unc.md` (la propuesta formal)
