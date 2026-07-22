# Task 2 Report: Multi-Course Audit

**Date:** 2026-07-21
**Script:** `scripts/audit-courses.ts`
**Output:** `reports/mvp-demo/multi-course-audit.json`

## Results per Course

### Course 267 — IA y automatización de flujos de trabajo

- Sections: 7 | Activities: 20 | Phantoms: 0 | Restrictions: 6
- Fresh student: 0/19 completed
- All 6 restrictions are sequential completion gates (mod quizzes requiring prior module material). Normal structure — no phantoms.

### Course 265 — Yoga y Mindfulness para la vida cotidiana

- Sections: 5 | Activities: 11 | Phantoms: 0 | Restrictions: 2
- Fresh student: 0/8 completed
- 2 restricted activities: certificates in "Cierre del curso" requiring grade ≥60 on 4 grade items + completion of cmid 6759. All references valid.

### Course 269 — Aprendiendo a caminar en Python - Certificación 1

- Sections: 5 | Activities: 46 | Phantoms: 0 | Restrictions: 2
- Fresh student: 0/28 completed | nelthor: 26/28
- Certificates require grades ≥60 on 4 grade items + completion of cmid 6628. The previously-reported phantom (Notebook Funcion-Lambda) no longer appears in the availability JSON — the cmid references are now clean.

### Course 276 — Aprendiendo a caminar en Python - Certificación 2

- Sections: 5 | Activities: 50 | Phantoms: 0 | Restrictions: 2
- Fresh student: 0/17 completed
- Certificates require grades ≥60 on 4 grade items + completion of cmid 6968. All valid.

## Summary

| Metric                              | Value              |
| ----------------------------------- | ------------------ |
| Total courses audited               | 4                  |
| Total phantoms found                | **0**              |
| Courses with phantoms               | 0                  |
| Total restriction conditions        | 12                 |
| Fresh students created & cleaned up | 4 (all successful) |

## Conclusions

- **No phantoms detected** in any of the 4 courses. All availability JSON references point to valid cmids.
- Course 269 (Python 1) is now clean — the previously-reported phantom from the original audit (Notebook Funcion-Lambda) has been resolved.
- All courses follow a similar pattern: module quizzes gated by prior activity completion, and certificates in a "Cierre" section gated by grade conditions.
- nelthor (course 269) has 26/28 activities completed, confirming active progression.
