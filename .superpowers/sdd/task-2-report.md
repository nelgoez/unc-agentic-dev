# Task 2 Report — MoodleStudentFactory

## What I implemented

Created `tests/components/shared/MoodleStudentFactory.ts` with:

- **`MoodleStudentFactory` class** — constructor takes `MoodleApiClient` instance
- **`createAndEnrolStudent(courseId, roleId = 5)`** — generates unique username/password via `crypto.randomUUID()`, calls `api.createUser()`, finds manual enrolment method via `api.getCourseEnrolMethods()`, builds URL-encoded formdata (`enrolid`, `userid`, `roleid`), calls `api.submitUserEnrolmentForm()`, returns `{ userId, username, password }` or `null` on failure
- **`cleanupStudent(userId)`** — calls `api.deleteUsers([userId])` wrapped in try/catch

Error handling: both methods gracefully wrap API calls in try/catch, logging warnings via `console.warn`.

## What I tested

- **TypeScript check**: `bun run types:check` — passed (0 errors)
- **ESLint**: auto-fixed by lint-staged during commit — no warnings
- **Vars check**: `bun run vars:check` — passed

No runtime tests were run (requires a live Moodle instance with API credentials).

## Files changed

| File                                              | Action                 |
| ------------------------------------------------- | ---------------------- |
| `tests/components/shared/MoodleStudentFactory.ts` | **Created** (50 lines) |

## Self-review findings

- `import type` for `MoodleApiClient` was auto-applied by eslint — correct usage (type-only in constructor parameter)
- `formdata` uses `URLSearchParams` for proper URL encoding, aligned with Moodle WS expectations
- No hardcoded credentials; uses generated random values (crypto.randomUUID)
- Commit hook ran `types:check` and `vars:check` successfully

## Concerns

- No runtime/integration tests — require a Moodle environment with manual enrolment plugin enabled
- `submitUserEnrolmentForm` WS may behave differently across Moodle versions
