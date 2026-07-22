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
