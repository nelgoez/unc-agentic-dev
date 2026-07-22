# Plan: Report Verification & Fresh Student Module 3 Check

## Global Constraints

- All tests must pass before report is considered verified
- Fresh student user must be created and deleted — never leave test users in production
- Report at `reports/mvp-demo/REPORTE-MVP-UNC.md` must be accurate based on live data
- API token: `b6dc7d7c5d84eaa87e86fefa8aed0789`
- Course ID: `269`
- Base URL: `https://campus.aulavirtual.unc.edu.ar`

## Tasks

### Task 1: Run verification suite + check Module 3 for fresh student

Create a verification script that:

1. Runs the full API audit (tests/e2e/api-audit.kata.ts) and captures output
2. Creates a fresh student user via API, enrolls in course 269, checks which sections are accessible/locked
3. Compares fresh student view vs admin view vs nelthor's current view
4. Updates the report with findings about whether Module 3 is still locked for new users
5. Cleans up the test user
6. Outputs a verification.json with structured findings

Acceptance criteria:

- [ ] api-audit tests pass (4/4)
- [ ] Fresh student user created and checked
- [ ] Module 3 status determined (locked or accessible)
- [ ] Report updated with findings
- [ ] Test user cleaned up
- [ ] Verification JSON written to reports/mvp-demo/

### Task 2: (Future — for next dispatch)
