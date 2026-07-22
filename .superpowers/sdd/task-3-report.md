# Task 3 Report: validate-course.kata.ts — Use Student Factory

**Status:** DONE

## Changes Made

**File:** `tests/e2e/validate-course.kata.ts`

### What was done:

1. **Added imports** for `MoodleApiClient` and `MoodleStudentFactory`
2. **Added env var reading** for `MOODLE_BASE_URL` and `MOODLE_WS_TOKEN`
3. **Added step "0"**: Logs in as admin, creates `MoodleApiClient` + `MoodleStudentFactory`, calls `createAndEnrolStudent(courseId)`, stores result in `freshStudent` variable
4. **Modified step "6"**: When `freshStudent` is available, uses `login.loginAs(freshStudent.username, freshStudent.password)` instead of `roles.switchToStudent()`. Falls back to role switching if factory returned null
5. **Added step "10"**: Cleanup — calls `factory.cleanupStudent(freshStudent.userId)` to delete the temporary student via Moodle API
6. **Added `freshStudent` and `factory` state variables** at test scope for cross-step access

### What was kept:

- `loginAsAdmin()` for admin steps 0 and 1 (unchanged)
- `MoodleRoleSwitch` for teacher role switching in step 4 (unchanged)
- All existing logic for course analysis, screenshots, phantom detection, and result saving

### Verification:

- `bun run types:check` — PASS (no errors)
- Commit: `f58119b` with message `feat(test): use MoodleStudentFactory for fresh student credentials`

### Files changed:

- `tests/e2e/validate-course.kata.ts` — 32 insertions, 4 deletions
