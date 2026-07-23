# Task 4 Report — run-api-audit.ts — Visibility Cross-Reference

## Status

✅ Completed

## What was implemented

1. **Visibility map after `getCourseContents()`** — Builds a `visibilityMap` (`Map<number, { name, visible, uservisible, sectionName }>`) from the course contents API response.

2. **Visibility checks in completion condition loop** — In the existing orphan/phantom detection loop, after the `!exists` check:
   - `api-visibility-phantom` (critical): when `cond.cm` exists but `visible === 0` (hidden in DB)
   - `api-visibility-restricted` (critical): when `cond.cm` exists with `visible === 1` but `uservisible === false`

3. **Fresh student completion cross-check** — Iterates availability conditions and flags activities with automatic completion (`completion === 2`) that are referenced by restrictions, reporting as `api-auto-completion-check` (info).

## Files changed

| File                       | Action                         |
| -------------------------- | ------------------------------ |
| `scripts/run-api-audit.ts` | Modified (multiple insertions) |

## Verification

- `bunx tsc --noEmit` — passed (0 errors)

## Concerns

- The fresh student check had to be moved after `apiFindings` declaration to resolve a "used before declaration" error. It lives between the declaration and the orphan loop, which is correct for data flow.
- No runtime tests were run (requires live Moodle instance with API credentials).
