# Task 1 Report — Add enrolment WS functions to MoodleApiClient

## What was implemented

Added two new public methods to `MoodleApiClient` at `tests/components/api/MoodleApiClient.ts:362-382`:

1. **`getCourseEnrolMethods(courseId: number)`** — MAC-11
   - WS: `core_enrol_get_course_enrolment_methods`
   - Returns `Array<{id: number, type: string, name: string}>`
   - Simple delegated call via `this.call<>()` (same pattern as MAC-1)

2. **`submitUserEnrolmentForm(formdata: string)`** — MAC-12
   - WS: `core_enrol_submit_user_enrolment_form`
   - Returns `{result: boolean, error?: string}`
   - Checks the `error` field from the WS response and throws if set (per brief exception for error-field WS)

Both use `@atc` decorator with story `UNC-RE-1` and feature `Enrolment`, using IDs MAC-11 and MAC-12 (next available after existing MAC-1 through MAC-10).

## What was tested

- TypeScript type checking passed (`bun run types:check` — clean)
- The file compiles without errors with `--strict` mode (`bunx tsc --noEmit` — clean)
- Existing `repo:check` failures are pre-existing (formatting in unrelated files)

## Files changed

- `tests/components/api/MoodleApiClient.ts` — +22 lines

## Self-review findings

None. Methods follow existing patterns:

- `getCourseEnrolMethods` mirrors MAC-1 pattern (simple `this.call<>()` return)
- `submitUserEnrolmentForm` mirrors MAC-5 pattern (call + unwrap/validate response)
- `@atc` IDs MAC-11/MAC-12 are the next sequential IDs after MAC-10
- The duplicate MAC-7 on `getAvailabilityJsonBreakdown` was left untouched (pre-existing)

## Issues or concerns

None.
