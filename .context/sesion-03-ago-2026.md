# Session 2026-08-03 — Audit Infrastructure & QA Proposal

## Summary

Built complete audit infrastructure for Moodle courses with deployment to GitHub Pages + Netlify.

## Deliverables

### Audit CLI (`bun run audit:curso <id> [docsDir] [--name "Name"]`)

- `cli/audit-curso.ts` — CLI entry point
- `scripts/parsers/parseValidacion.ts` — CSV validacion parser
- `scripts/parsers/parsePreMontaje.ts` — MD pre-montaje parser
- `scripts/reconcile/reconcileDocsToProd.ts` — fuzzy doc↔production matching
- `scripts/report/buildAuditData.ts` — shared data computation
- `scripts/report/generateAuditMd.ts` — markdown output
- `scripts/report/generateAuditHtml.ts` — self-contained HTML output
- `scripts/report/generateAuditIndex.ts` — index with historial + trigger
- `scripts/store/saveReport.ts` — historic storage

### Reports deployed

- `reports/audit/304/` — Violencias Digitales (with docs)
- `reports/audit/269/` — Python 1 (API-only)
- `reports/audit/index.html` — Landing with trigger button + historial
- `reports/index.html` — Root redirect to /audit/

### Pitch decks

- `docs/pitch/propuesta-qa-focus.html` — 6-slide QA proposal (B→A ladder)
- `docs/pitch/propuesta-qa.html` — 8-slide 3-option comparison

### Proposal docs

- `.context/propuesta-qa-unc.md` — 3-option proposal
- `.context/propuesta-formal-qa-unc.md` — Formal document for Ignacio/Patricia

### Fixes applied

- `tests/components/ui/MoodleAuditor.ts` — Completion state enum (e=0..3)
- `tests/components/api/MoodleApiClient.ts` — Propagate `e` field in availability callbacks
- `reports/audit/audit-304-vs-docs.md` — False CRITICAL corrected

### CI changes

- `.github/workflows/audit-ci.yml` — course-audit job, artifact paths, landing page copy
- `.gitignore` — Allow `reports/audit/` deployment

### Netlify

- `netlify.toml` — Functions + redirects + CORS
- `docs/pitch/netlify/functions/trigger-audit.mjs` — One-click CI trigger
- `docs/setup-rerun-button.md` — Activation guide

### Navigation

```
/ → redirect → /audit/ → [304, 269] → ← Volver al indice → /audit/
```

## URLs

- Landing: https://nelgoez.github.io/unc-agentic-dev/
- Audit index: https://nelgoez.github.io/unc-agentic-dev/audit/
- 304 report: https://nelgoez.github.io/unc-agentic-dev/audit/304/latest.html
- Pitch (Netlify): https://unc-course-kit.netlify.app/propuesta-qa-focus.html

## Pending

- Review `.context/propuesta-formal-qa-unc.md` before sending to Ignacio/Patricia
- Find course ID for "Derechos Digitales y Seguridad Online"
