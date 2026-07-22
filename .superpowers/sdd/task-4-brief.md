## Task 4: CI — Pass MOODLE_WS_TOKEN to ui-audit

**File:** `.github/workflows/audit-ci.yml`

In the `ui-audit` job, add `MOODLE_WS_TOKEN` to the env block (alongside the existing STUDENT*\*/ADMIN*\* vars).

