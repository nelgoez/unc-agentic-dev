# Session 2026-08-03 — Live Audit Quality FIX, PDF, Pricing & Proposal Delivery

## Summary

Full audit of all live assets (GitHub Pages + Netlify), fixed systemic quality issues, restructured pricing based on UNC procurement research, generated PDF proposal, improved report UX, and email sent to UNC.

**Propuesta ya enviada por mail** a Ignacio/Fernando con CC a Patricia.

---

## Phase 1 — Live Asset Audit & Quality Sweep

### GitHub Pages (nelgoez.github.io) — Before: B-, After: A

Fixes:

- **~25 tildes** added across `generateAuditHtml.ts`, `generateAuditIndex.ts` (sistemático)
- **Root page** (`reports/index.html`): viewport meta, branding, contexto, contacto
- **Contacto** (`nagomez@mi.unc.edu.ar`) in footer of every report + index
- **Findings engine** calibrated in `buildAuditData.ts`:
  - Doc mapping <30% → warning
  - Doc mapping 30-60% → info
  - Duplicate section names → info
- **"Solo en producción"** changed from flat callout → collapsible `<details>` dropdown
- **"Solo en docs"** also now auto-expands when ≤5 items

### Netlify (unc-course-kit.netlify.app) — Before: C, After: A

Fixes:

- **Pricing unified** to triple currency (Módulos UNC $48.696 + ARS + USD) across all 3 pages
- **"Scannea" → "Escanea"**, **"Elegí" → "Elija"** in `index.html`
- **Backlinks** added between all 3 pages (footer triangle: index ↔ focus ↔ 3-opciones)
- **PDF download button** on both pitch decks
- **Contact** on all pages

---

## Phase 2 — Pricing Research & Restructure

### UNC procurement modalities (verified via webfetch + Tavily)

| Finding               | Detail                                                                       |
| --------------------- | ---------------------------------------------------------------------------- |
| Módulo 2026           | **$48.696** (RESOL-2026-15-UNC-SGI#AGI) — verified against UNC official page |
| Contracting regime    | OHCS 4/2025 + OHCS 5/2012 (locación de servicios profesional independiente)  |
| Portal                | SIU-Huarpe (https://proveedores.huarpe.unc.edu.ar)                           |
| Tax regime            | Monotributista (Ley 26.565)                                                  |
| Timeline (optimistic) | ~8-12 weeks from proposal to first payment for contratación directa          |
| Module thresholds     | Up to ~75 M = contratación directa simple; 75-300 M = compulsa abreviada     |
| "No Docente"          | ❌ Not available for externals — requires concurso                           |

### Pricing restructured

**Before:** B setup 72-103 M (too close to A's 62-103 M)
**After:**
| Option | Setup | Monthly |
|---|---|---|
| A: Consultoría | 62-103 M | 16-31 M |
| B: Dinámico ★ | **50-75 M** | 8-16 M |
| Express: Piloto Pago | **25-35 M** (único pago) | — |
| C: Estándar | 41-62 M | 4-8 M |

Express = audit 5 courses, 1-week delivery, no subscription, 50% credited toward B setup if they continue.

---

## Phase 3 — PDF Generation

- Added `marked` dependency (markdown→HTML)
- Created `tests/generate-proposal-pdf.spec.ts` (Playwright test: MD→HTML→A4 PDF)
- Added `bun run pdf:proposal` package script
- PDF deployed: https://unc-course-kit.netlify.app/propuesta-qa-unc.pdf
- Footer cleaned: internal .md references removed, kept only módulo adjustment clause

---

## Phase 6 — CI Weekly Schedule + Deck Footer Fix

### audit-ci.yml

- **Added cron schedule**: `0 6 * * 1` (lunes 6am UTC) — weekly auto-audit now live
- **Switched workflow_dispatch default** from 269 → 304 (curso con docs, más representativo)
- Prompted by audit: pitch claimed "actualización semanal automática" but it wasn't implemented

### Deck footer links

- `.deck-footer` had `z-index: 10` in `base.css`, same as click overlays
- Overlays appeared later in DOM → won stacking → footer links unclickable
- Fixed: inline `z-index: 11` in both pitch deck `<style>` blocks

---

## Phase 7 — Delivery Status

- **Expandable history**: "+N más" now clickable button that reveals all history entries inline
- Before: static text "+2 mas" with no interaction
- After: inline toggle expanding hidden entries

---

## Phase 5 — Email & Delivery

### Email sent to Ignacio/Fernando with CC Patricia

Email includes:

- Pilot context (courses 304 + 269)
- PDF link + interactive pitch links
- Query about "Derechos Digitales y Seguridad Online" course ID
- UNC timeline transparency (~8-12 weeks) and how Option B works with that
- Request for 30-min meeting

### Netlify landing clarification

`propuesta-qa.html#/1` = slide 1 of 8 (overview). Slide 6 is the feature comparison table. Footer shows "← → navegar" navigation hint.

---

## Deliverables ready

| What                         | Where                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| Propuesta formal consolidada | `.context/propuesta-qa-unc-consolidada.md`                 |
| PDF propuesta                | https://unc-course-kit.netlify.app/propuesta-qa-unc.pdf    |
| Email draft (final version)  | `.context/email-propuesta-qa-unc.md`                       |
| Reports live                 | https://nelgoez.github.io/unc-agentic-dev/audit/           |
| Pitch Focus                  | https://unc-course-kit.netlify.app/propuesta-qa-focus.html |
| Pitch 3 opciones             | https://unc-course-kit.netlify.app/propuesta-qa.html       |

## Pending

- [ ] Find course ID for "Derechos Digitales y Seguridad Online" (not found via Moodle API — may be pre-launch or different name)
- [ ] Follow-up on email if no reply within ~1 week
- [ ] Implement .docx/.xlsx parsers (`mammoth` + `xlsx`) in audit CLI for Opción B
- [ ] Consider Netlify redeploy after push (it's auto — should pick up changes via GitHub hook)

## Commits

```
23b1979 fix: deck footer links unclickable — z-index below click overlays
703e7b2 fix: remove internal doc references from proposal footer
2d7f434 refactor: adjust pricing stratification + audit index navigation
2c61d70 faet: PDF proposal + audit dropdown UX improvements
1e38c42 fix: live audit quality — tildes, pricing consolidation, contact info, findings calibration
```
