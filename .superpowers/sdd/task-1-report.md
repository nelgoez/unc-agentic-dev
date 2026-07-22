# Task 1: Discover Course IDs

**Status:** DONE_WITH_CONCERNS

**Executed:** 2026-07-21

## Summary

Discovered 166 unique courses from the UNC Moodle instance (`campus.aulavirtual.unc.edu.ar`) via fetch-based web scraping with admin session cookies.

## Approach

**Plan A (Playwright) — FAILED.** All browser engines (Chromium, Firefox, WebKit) time out on launch in this Windows environment. The processes start but Playwright cannot connect via `--remote-debugging-pipe`. Likely a Windows security/Defender restriction on the debugging pipe connection.

**Final approach — fetch-based web form login:**

1. GET `/login/index.php` to extract CSRF `logintoken` from the HTML form
2. POST credentials (`username`, `password`, `logintoken`) to same endpoint
3. Capture `MoodleSession` cookie from `Set-Cookie` response header
4. Follow redirect to establish session, then navigate `/course/index.php`
5. Parse HTML with regex for `course/view.php?id=N` links
6. Browse all category pages (found via `/course/index.php`) to discover additional courses
7. Also scrape `/my/` dashboard as supplementary source
8. Deduplicate by course ID

## Results

| Metric                           | Value                                      |
| -------------------------------- | ------------------------------------------ |
| Total unique courses             | **166**                                    |
| Duplicates                       | 0                                          |
| Course 269 found                 | **YES**                                    |
| Course 267 (IA y Automatización) | **YES**                                    |
| Course 265 (Yoga y Mindfulness)  | **YES**                                    |
| Output file                      | `reports/mvp-demo/discovered-courses.json` |

## Key Target Courses

| ID  | Name                                                                                        |
| --- | ------------------------------------------------------------------------------------------- |
| 265 | Yoga y Mindfulness para la vida cotidiana                                                   |
| 267 | IA y automatización de flujos de trabajo: aprende a automatizar de forma eficaz y eficiente |
| 269 | Aprendiendo a caminar en Python - Certificación 1                                           |

## Concerns

1. **Playwright inoperable in this environment.** Chromium processes launch but timeout on Playwright's `--remote-debugging-pipe` connection. This may affect future tasks that need browser automation. Consider fixing the root cause (sandbox/permissions on `C:\Users\Nahuel\AppData\Local\ms-playwright\chromium_headless_shell-1228\chrome-headless-shell-win64\chrome-headless-shell.exe`), or use the fetch-based approach as the primary for all scraping tasks.

2. **Course 1 is a "Switch role to..." item** — likely a UI element rather than a real course. Should be filtered out in downstream processing.

3. **Some course names include suffixes like "(Verano 2024)"** — there are apparent duplicates with the same root name but different years (e.g., IDs 13 vs 159 both mention IA). These are correctly treated as separate courses since they have different IDs.

## Acceptance Criteria

- [x] JSON file with course IDs and names written
- [x] Course 269 is in the list
- [x] At least 3 additional courses discovered (166 total)
