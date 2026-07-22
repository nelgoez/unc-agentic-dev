# Plan: Phase 3 — DB Probes via Web Services

## Global Constraints

- No direct SQL — all DB data via Moodle REST API WS functions
- Must not break existing UI + API layers
- Graceful degradation if a probe fails (report shows "data unavailable")
- Spanish output for non-IT audience
- DRY_RUN guard for any write operations

## Available WS Functions (UNC Auditor service)

- core_course_get_contents
- core_completion_get_activities_completion_status
- core_completion_override_activity_completion_status
- core_user_create_users / core_user_delete_users
- core_user_get_users_by_field

## Needed WS Functions (to add to service)

Add these in Moodle admin → Server → Web services → External services → UNC Auditor → Functions:

- `core_enrol_get_enrolled_users` — enrollment data
- `core_grades_get_gradeitems` — grade items structure (no student scores, just item names/IDs)
- `core_cohort_search_cohorts` — cohort/group data

Note from QA research:

- `core_grades_get_grades` ❌ DOES NOT EXIST in Moodle WS API. Use `core_grades_get_gradeitems` instead.
- `core_cohort_search_cohorts` requires a `context` object param with `{contextid: N}`, not just a query string.
- `core_enrol_get_enrolled_users` with `onlyactive: true` requires `moodle/course:enrolreview` capability on the token.
- Default `limitnum` on cohort search is 25 — pass a higher value for complete data.

## Tasks

### Task 1: Add DB probe WS methods to MoodleApiClient

Add typed methods to `tests/components/api/MoodleApiClient.ts`:

- `getEnrolledUsers(courseId)` — calls `core_enrol_get_enrolled_users`. Returns enrollment count + role distribution. Handle SEPARATEGROUPS mode (empty array = no data), onlyactive option.
- `getGradeItems(courseId)` — calls `core_grades_get_gradeitems`. Returns grade items (names, IDs, categories). No student score data needed.
- `searchCohorts(query, contextId)` — calls `core_cohort_search_cohorts` with query + context object. Handle default limitnum.

Each method must:

- Handle empty results gracefully (empty array → null, no crash)
- Network errors: logged warning, null return
- WS exceptions: logged warning, null return
- Follow existing patterns: typed interfaces, `this.call<T>()`

### Task 2: Add DB probes to run-api-audit.ts

Add DB probe section after existing API audit findings, in this priority order:

1. Enrollment (highest value)
2. Grade items (medium value)
3. Cohorts (nice-to-have)

Each probe is independent — one failing doesn't block others.

Output format in api-audit-results.json:

```json
{
  "dbProbes": {
    "enrollment": { "total": 45, "students": 40, "teachers": 3, "admins": 2, "status": "ok" },
    "gradeItems": { "total": 12, "countByCategory": {...}, "status": "ok" },
    "cohorts": { "total": 2, "names": ["2026-Python", "2026-IA"], "status": "ok" }
  }
}
```

Each probe has a `status` field: "ok", "unavailable" (WS not in service), or "error".

### Task 3: Show DB probes in unified report

Update `scripts/generate-audit-report.ts` to render a new section:
"🔬 Sondas de base de datos" with enrollment, grade items, and cohort data.

Graceful: if dbProbes is null/missing, skip the section. If a specific probe is "unavailable", show "Datos no disponibles — función no agregada al servicio".
