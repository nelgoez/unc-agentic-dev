# Session 2026-08-03 — Live Audit Quality FIX & Proposal Finalization

## Summary

Audited all live assets (GitHub Pages + Netlify), found systemic quality issues, and fixed them across all workstreams. Consolidated formal proposal ready to send.

## Audit findings (before fix)

### GitHub Pages — Grade: B-

- **Cero tildes** en todo el español (~40 palabras sin acentos)
- Root page (C-): redirect pelado, sin viewport meta, sin branding
- Audit index (B-): funcional pero sin tildes, sin branding, sin contacto
- Reports 304/269: sin tildes, findings engine mostraba 0/0/0
- Sin contacto en ninguna página

### Netlify — Grade: C

- **3 historias de precio incompatibles**: $0 (index) vs ARS (focus) vs USD (qa)
- Typo "Scannea" en slide 11 del pitch index
- "Elegí" informal en lugar de "Elija"
- propuesta-qa.html huérfana (sin links desde las otras páginas)
- Sin contacto en ninguna página

## Fixes applied

### Bloque 1 — Tipo de cambio y propuesta consolidada

- **Pricing unificado a triple moneda**: Módulos UNC ($48.696, RESOL-2026-15-UNC-SGI#AGI) + ARS + USD
- **Verificación independiente** del valor del módulo contra página oficial UNC
- Documento consolidado: `.context/propuesta-qa-unc-consolidada.md`
- Docs anteriores marcados como superseded

### Bloque 2 — Tildes y branding (reports HTML)

- `scripts/report/generateAuditHtml.ts`: ~25 tildes corregidas + contacto + branding
- `scripts/report/buildAuditData.ts`: findings engine calibrado
  - Doc mapping <30% → warning
  - Doc mapping 30-60% → info
  - Duplicate section names → info
- `scripts/report/generateAuditIndex.ts`: tildes + contacto + singular/plural

### Bloque 3 — Pitch decks Netlify

- `docs/pitch/index.html`: "Scannea"→"Escanea", "Elegí"→"Elija", backlinks
- `docs/pitch/propuesta-qa-focus.html`: ARS→módulos+ARS, backlinks a propuesta-qa.html
- `docs/pitch/propuesta-qa.html`: USD→módulos+ARS+USD, backlinks, contacto

### Bloque 4 — Root page + findings

- `reports/index.html`: viewport meta, branding, contacto, contexto
- Findings ahora muestra 1 advertencia en 304 (mapeo al 17%)

### Bloque 5 — Email draft

- `.context/email-propuesta-qa-unc.md`: borrador para Ignacio/Fernando con CC sugerido a Patricia

### Bloque 6 — Regenerated reports

- Reportes 304 + 269 regenerados con fixes aplicados
- Historial actualizado

## Deliverables listos para enviar

| Qué                          | Dónde                                                      |
| ---------------------------- | ---------------------------------------------------------- |
| Propuesta formal consolidada | `.context/propuesta-qa-unc-consolidada.md`                 |
| Borrador de email            | `.context/email-propuesta-qa-unc.md`                       |
| Reports live (actualizados)  | https://nelgoez.github.io/unc-agentic-dev/audit/           |
| Pitch Focus                  | https://unc-course-kit.netlify.app/propuesta-qa-focus.html |
| Pitch 3 opciones             | https://unc-course-kit.netlify.app/propuesta-qa.html       |
| Course Kit pitch             | https://unc-course-kit.netlify.app/                        |

## Pending

- [ ] Find course ID for "Derechos Digitales y Seguridad Online"
- [ ] Send proposal to Ignacio/Fernando/Patricia
- [ ] Consider adding .docx/.xlsx parsers (new deps: mammoth + xlsx)
