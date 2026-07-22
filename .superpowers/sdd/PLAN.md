# Live Report Update — Sprint Plan

## Global Constraints

- **Moodle version:** 4.5.8+ (Build: 20251219)
- **Allure 2 format** for custom results (`*-result.json` in `allure-results/`)
- **TypeScript strict mode** throughout
- **WS functions already enabled on UNC Moodle** (by Ignacio Acuña)
- **Branch:** master (direct commits)
- **MOODLE_WS_TOKEN** already added to GitHub secrets
- **STUDENT_USERNAME/STUDENT_PASSWORD** will be removed from CI (replaced by Student Factory)

## Task 1: MoodleApiClient — Add enrolment WS functions

**File:** `tests/components/api/MoodleApiClient.ts`

Add two new methods to `MoodleApiClient`:

```typescript
@atc('MAC-X', { story: 'UNC-RE-1', feature: 'Enrolment' })
async getCourseEnrolMethods(courseId: number): Promise<Array<{id: number, type: string, name: string}>>
// WS: core_enrol_get_course_enrolment_methods
// Parameter: courseid (int)
// Returns: array of enrolment method objects

@atc('MAC-Y', { story: 'UNC-RE-1', feature: 'Enrolment' })
async submitUserEnrolmentForm(formdata: string): Promise<{result: boolean, error?: string}>
// WS: core_enrol_submit_user_enrolment_form
// Parameter: formdata (string) — URI encoded param string
// Example formdata: "enrolid=XX&courseid=YY&userid=ZZ&roleid=5"
// Returns: processing result with error flag
```

## Task 2: MoodleStudentFactory — Fresh student creation

**New file:** `tests/components/shared/MoodleStudentFactory.ts`

```typescript
class MoodleStudentFactory {
  constructor(private api: MoodleApiClient) {}

  async createAndEnrolStudent(
    courseId: number,
    roleId: number = 5,
  ): Promise<{
    userId: number
    username: string
    password: string
  }>
  // 1. Generate unique username/password
  // 2. api.createUser(username, password, 'Audit', 'Student', email)
  // 3. api.getCourseEnrolMethods(courseId) → find manual method
  // 4. api.submitUserEnrolmentForm(formdata)
  // 5. Return credentials

  async cleanupStudent(userId: number): Promise<void>
  // api.deleteUsers([userId])
}
```

## Task 3: validate-course.kata.ts — Use Student Factory

**File:** `tests/e2e/validate-course.kata.ts`

Changes:

1. Import `MoodleApiClient` and `MoodleStudentFactory`
2. Step "0": login as admin, create fresh student via factory
3. Login test uses the fresh student credentials instead of `loginAsStudent()`
4. Step "Revert": cleanup via `factory.cleanupStudent(userId)`
5. Move STUDENT_USERNAME/STUDENT_PASSWORD env fallback to a comment for local dev

## Task 4: CI — Pass MOODLE_WS_TOKEN to ui-audit

**File:** `.github/workflows/audit-ci.yml`

In the `ui-audit` job, add `MOODLE_WS_TOKEN` to the env block (alongside the existing STUDENT*\*/ADMIN*\* vars).

## Task 5: generate-allure-results.ts — API → Allure converter

**New file:** `scripts/generate-allure-results.ts`

Reads `reports/audit/api-audit-results.json`, generates Allure 2 compatible `*-result.json` files in `allure-results/`.

Allure result format:

```json
{
  "name": "Hallazgo: ...",
  "status": "passed" | "failed",
  "stage": "finished",
  "description": "...",
  "start": timestamp,
  "stop": timestamp,
  "labels": [
    { "name": "suite", "value": "🔬 Auditoría API" },
    { "name": "severity", "value": "critical" | "normal" }
  ],
  "parameters": [
    { "name": "Curso", "value": "269" },
    { "name": "Sección", "value": "..." }
  ]
}
```

Each finding from the API audit maps to one test result:

- Critical findings → status "failed"
- Info findings → status "passed"
- DB probe results → separate test results
- Progression data → separate test result

Also generates a suite-level container file for grouping.

## Task 6: categories.json — Allure report categories

**New file:** `allure-results/categories.json`

```json
[
  {
    "name": "🧪 Preparación",
    "matchedStatuses": ["passed", "failed", "broken"],
    "messageRegex": ".*(setup|cleanup|crear|eliminar|student|factory).*"
  },
  {
    "name": "🔍 Auditoría UI",
    "matchedStatuses": ["passed", "failed", "broken"],
    "messageRegex": ".*(login|navegar|analizar|screenshot|captura).*"
  },
  {
    "name": "🔬 Auditoría API",
    "matchedStatuses": ["passed", "failed"],
    "messageRegex": ".*(API|REST|hallazgo|huérfano|condición).*"
  },
  {
    "name": "📊 Sondas DB",
    "matchedStatuses": ["passed", "failed", "broken"],
    "messageRegex": ".*(enrollment|cohort|probe|DB|grade).*"
  },
  { "name": "⚠️ Advertencias", "matchedStatuses": ["broken"] }
]
```

## Task 7: CI — Add Allure API results step

**File:** `.github/workflows/audit-ci.yml`

In the `generate-report` job, BEFORE the `Generate Allure report` step, add:

```yaml
- name: Generate Allure API results
  run: bun scripts/generate-allure-results.ts
```
