# Plan: Final Delivery — Multi-Course Audit + Email

## Global Constraints

- All tests must pass before final delivery
- Never leave test users in production (always cleanup)
- Report must clarify nelthor's admin promotion masked the original bug
- Report must state the original bug appears fixed for new users
- API token: `b6dc7d7c5d84eaa87e86fefa8aed0789`
- Base URL: `https://campus.aulavirtual.unc.edu.ar`

## Tasks

### Task 1: Discover course IDs

Create a script that logs into Moodle as admin (via Playwright browser) and navigates to the course listing at `/course/index.php`, extracts all course IDs and names, and saves them to `reports/mvp-demo/discovered-courses.json`.

Approach:

- Use Playwright with `chromium.launch({ headless: true, timeout: 30000 })`
- Login with ADMIN_USERNAME/ADMIN_PASSWORD from .env
- Navigate to `/course/index.php`
- Extract all `<a href*="course/view.php?id=...">` links
- Deduplicate by ID
- Save JSON output

If Playwright is too slow, fallback: use `core_course_get_courses_by_field` with available REST API token, or use `bun` with `fetch` to login and scrape the HTML page directly using the admin session.

Acceptance criteria:

- [ ] JSON file with course IDs and names written
- [ ] Course 269 is in the list
- [ ] At least 3 additional courses discovered

### Task 2: Audit all discovered courses

For each discovered course (except 269 which is already audited):

1. Call `api.getCourseContents(courseId)` to get structure
2. Call `api.getAvailabilityJsonBreakdown(courseId)` for restrictions
3. Call `api.findOrphanedCmIds()` for phantom detection
4. Create a fresh student via `api.createUser()` and check completion status
5. Clean up the test user
6. Log all findings per course

Output `reports/mvp-demo/multi-course-audit.json` with findings per course.

Acceptance criteria:

- [ ] Each new course has structure + restrictions + phantom analysis
- [ ] Fresh student created and cleaned up per course
- [ ] JSON output per course

### Task 3: Generate final HTML report + Allure integration

Create `reports/mvp-demo/index.html` that includes:

- Executive summary table (all courses, key metrics)
- Per-course detail sections
- Clarification box: "The original bug in course 269 appears to be fixed on UNC's side. Our previous report used nelthor (promoted to admin) which masked the issue. This report uses fresh test student accounts for real user experience data."
- Technical appendix with availability JSON examples
- Email-ready summary section

Also update `scripts/generate-report.ts` to include all courses.

Acceptance criteria:

- [ ] HTML report with all courses
- [ ] Clarification box about nelthor/admin issue
- [ ] Email-ready summary
- [ ] Allure output directory structure set up

### Task 4: Draft email body

Create `reports/mvp-demo/EMAIL-BODY.md` with a copy-paste ready email containing:

1. Subject suggestion
2. Greeting
3. Context: what we did, why
4. Key findings (summary table)
5. The nelthor clarification: admin promotion masked the bug
6. New user verification proves the fix
7. Invitation: ask UNC which other courses they'd like audited
8. Call to action: reply with course IDs or suggestions
9. Signature

Acceptance criteria:

- [ ] Ready to copy-paste
- [ ] Clear business language (for Ignacio/Patricia)
- [ ] Technical details in appendix format
- [ ] Asks for more course suggestions
