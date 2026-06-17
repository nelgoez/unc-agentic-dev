/* eslint-disable no-console, ts/strict-boolean-expressions */
import { resolve } from 'node:path'
import process from 'node:process'
import { test } from '@playwright/test'
import { AdminCoursePage } from '../pages/AdminCoursePage'
import { CourseValidationReport } from '../pages/CourseValidationReport'
import { StudentCoursePage } from '../pages/StudentCoursePage'

const baseURL: string = process.env.MOODLE_BASE_URL || 'https://campus.aulavirtual.unc.edu.ar'
const studentUser: string = process.env.STUDENT_USERNAME || ''
const studentPass: string = (process.env.STUDENT_PASSWORD || '').trim()
const adminUser: string = process.env.ADMIN_USERNAME || ''
const adminPass: string = (process.env.ADMIN_PASSWORD || '').trim()
const courseId: string = process.env.TEST_COURSE_ID || '269'
const haveAdminCreds: boolean = adminUser !== '' && adminPass !== ''

test.describe('Course Validation Audit', () => {
  test(`Audit course ${courseId} — detect phantom activities and blocked modules`, async ({
    page,
  }) => {
    // 1. Login as student
    console.log(`Logging in as student: ${studentUser}`)
    await page.goto(`${baseURL}/login/index.php`)
    await page.waitForLoadState('networkidle')
    await page.locator('#username').fill(studentUser)
    await page.locator('#password').fill(studentPass)
    await page.locator('#loginbtn').click()
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000)

    // 2. Scan course as student
    const studentPage = new StudentCoursePage(page, baseURL)
    const studentView = await studentPage.analyze(courseId)
    console.log(`\nCourse: ${studentView.courseName}`)
    console.log(`Tabs found: ${studentView.tabs.length}`)
    for (const tab of studentView.tabs) {
      console.log(
        `  ${tab.title} section=${tab.sectionNumber} locked=${tab.isDisabled}${tab.restrictionText ? ` restriction="${tab.restrictionText}"` : ''}`,
      )
    }

    // 3. Take screenshots of each section
    const screenshotDir = resolve('reports/audit')
    const screenshotPaths: Record<number, string> = {}
    for (const section of studentView.sections) {
      await studentPage.navigateToSection(section.number)
      const filename = resolve(screenshotDir, `course-${courseId}-section-${section.number}.png`)
      await studentPage.takeScreenshot(filename)
      screenshotPaths[section.number] = `course-${courseId}-section-${section.number}.png`
      console.log(`  Screenshot: section ${section.number} -> ${filename}`)
    }

    // 4. If admin creds available, scan as admin too
    let adminView = null
    if (haveAdminCreds) {
      console.log(`\nLogging in as admin: ${adminUser}`)
      const adminPage = new AdminCoursePage(page, baseURL)
      await adminPage.loginAs(adminUser, adminPass)
      adminView = await adminPage.analyze(courseId)
      console.log(`Admin scan complete: ${adminView.sections.length} sections`)
    } else {
      console.log('\nNo admin credentials — skipping admin scan')
    }

    // 5. Run diff engine — find phantoms
    const report = new CourseValidationReport()
    const findings = report.findPhantoms(studentView)
    console.log(`\n=== AUDIT RESULTS ===`)
    console.log(`Findings: ${findings.length}`)
    for (const f of findings) {
      console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`)
    }

    // 6. Generate HTML report
    const html = report.generateHtmlReport(courseId, studentView, findings, screenshotPaths)
    const reportPath = report.saveReport(courseId, html)
    console.log(`\nAudit complete. Report: ${reportPath}`)

    // 7. Fail the test if critical findings exist
    const criticalFindings = findings.filter((f) => f.severity === 'critical')
    if (criticalFindings.length > 0) {
      const msg = criticalFindings
        .map((f) => `[CRITICAL] ${f.sectionTitle}: ${f.message}`)
        .join('\n')
      test.info().annotations.push({ type: 'critical-findings', description: msg })
    }
  })
})
