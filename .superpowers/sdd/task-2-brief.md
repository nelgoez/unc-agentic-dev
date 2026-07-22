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
