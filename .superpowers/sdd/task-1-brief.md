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
