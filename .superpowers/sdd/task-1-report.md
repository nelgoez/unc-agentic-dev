# Task 1 Report — MoodleApiClient: Module visibility + completion query methods

## What was implemented

1. **Interfaces added:**
   - `ModuleVisibility` — per-module visibility info (id, name, section, visible, uservisible, hascompletion, isautomatic, groupmode)
   - `ActivityCompletionAggregate` — per-cmid aggregated completion stats (cmid, name, sectionName, totalStudents, completedCount, completionRate)

2. **Method `getModuleVisibility(courseId): Promise<ModuleVisibility[]>`** (MAC-13):
   - Calls existing `this.getCourseContents(courseId)`
   - Flattens all modules across all sections into `ModuleVisibility[]`
   - Falls back to `mod.completion > 0` when `completiondata` is absent for `hascompletion`
   - Wrapped in try/catch with console.warn, returns `[]` on failure (matching pattern of `getEnrolledUsers`, `getGradeItems`)

3. **Method `getAllStudentCompletionStatus(courseId): Promise<ActivityCompletionAggregate[]>`** (MAC-14):
   - Calls existing `this.getEnrolledUsers(Number(courseId))`
   - Filters to users with `role.shortname === 'student'`
   - For each student, calls `this.getActivitiesCompletionStatus(courseId, student.id)`
   - Aggregates: counts students with `state === 1` per cmid
   - Computes `completionRate = (completedCount / totalStudents) * 100`, rounded to 2 decimals
   - Wrapped in try/catch with console.warn, returns `[]` on failure

4. **Test file `tests/e2e/module-visibility.kata.ts`:**
   - Test 1: Validates return shape for real course — every field present with correct type, logs hidden modules
   - Test 2: Empty array for invalid course (999999)
   - Test 3: Validates return shape for completion aggregates, checks invariants (count ≤ total, rate ∈ [0,100])
   - Test 4: Empty array for invalid course

## What was tested

| Test | Description                                                      | Result                                         |
| ---- | ---------------------------------------------------------------- | ---------------------------------------------- |
| 1    | `getModuleVisibility` returns correctly shaped data              | ✅ shape+types verified, hidden modules logged |
| 2    | `getModuleVisibility` returns empty for invalid course           | ✅ returns `[]`                                |
| 3    | `getAllStudentCompletionStatus` returns correctly shaped data    | ✅ shape+types verified, invariants checked    |
| 4    | `getAllStudentCompletionStatus` returns empty for invalid course | ✅ returns `[]`                                |

## Files changed

- `tests/components/api/MoodleApiClient.ts` — added 2 interfaces + 2 methods
- `tests/e2e/module-visibility.kata.ts` — new test file

## Self-review findings

- Both new methods follow existing error handling patterns (try/catch, console.warn, return `[]`)
- Both use `@atc` decorators following the convention (MAC-13, MAC-14, UNC-MVP-1, Deep Audit)
- `getModuleVisibility` correctly handles the case where `completiondata` might be undefined on a module by falling back to `mod.completion > 0`
- `getAllStudentCompletionStatus` builds a cm-id→name/section map from `getCourseContents` so the aggregate has readable names
- TypeScript `--noEmit` passes with zero errors
- All new exports at the top, all new methods inside the class body

## Issues or concerns

- Real integration tests require a live Moodle instance with `MOODLE_WS_TOKEN` set
- `getAllStudentCompletionStatus` makes N+1 API calls (1 for enrolled users + N for each student's completion status), which is acceptable for the real-time aggregation use case
