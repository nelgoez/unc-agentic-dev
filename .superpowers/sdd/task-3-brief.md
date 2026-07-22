## Task 3: validate-course.kata.ts — Use Student Factory

**File:** `tests/e2e/validate-course.kata.ts`

Changes:

1. Import `MoodleApiClient` and `MoodleStudentFactory`
2. Step "0": login as admin, create fresh student via factory
3. Login test uses the fresh student credentials instead of `loginAsStudent()`
4. Step "Revert": cleanup via `factory.cleanupStudent(userId)`
5. Move STUDENT_USERNAME/STUDENT_PASSWORD env fallback to a comment for local dev

