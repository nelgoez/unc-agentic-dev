import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import process from 'node:process'
import { test } from '@playwright/test'
import { createFixture } from '../components/UiFixture'
import { MoodleLogin } from '../components/ui/MoodleLogin'
import { MoodleCourse } from '../components/ui/MoodleCourse'
import { MoodleRoleSwitch, MoodleRole } from '../components/ui/MoodleRoleSwitch'

const courseId = process.env.TEST_COURSE_ID || '269'

test.describe('Course Validation — Multi-Role Audit', () => {
  test(`Audit course ${courseId} across student/teacher/admin roles`, async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)
    const roles = new MoodleRoleSwitch(page, ctx.env.baseUrl)

    // 1. Login as admin (needed for role switching)
    await login.loginAsAdmin()
    await course.goToCourse(courseId)

    // 2. Scan as admin (full visibility)
    console.log('\n=== ADMIN VIEW ===')
    const adminView = await course.analyze(courseId)
    console.log(`Sections: ${adminView.sections.length}`)
    console.log(`Tabs: ${adminView.tabs.length}`)

    // 3. Switch to student and scan
    console.log('\n=== STUDENT VIEW ===')
    await roles.switchToStudent(courseId)
    const studentView = await course.analyze(courseId)
    console.log(`Sections: ${studentView.sections.length}`)
    for (const tab of studentView.tabs) {
      console.log(
        `  ${tab.title} section=${tab.sectionNumber} locked=${tab.isDisabled}${tab.restrictionText ? ` restriction="${tab.restrictionText}"` : ''}`,
      )
    }

    // 4. Phantom detection from student perspective
    const findings = course.findPhantoms(studentView)
    const criticalFindings = findings.filter((f) => f.severity === 'critical')
    const warningFindings = findings.filter((f) => f.severity === 'warning')

    console.log(`\n=== PHANTOM FINDINGS ===`)
    console.log(
      `Total: ${findings.length} | CRITICAL: ${criticalFindings.length} | WARNING: ${warningFindings.length}`,
    )
    for (const f of findings) {
      console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`)
    }

    // 5. Switch to teacher and scan
    console.log('\n=== TEACHER VIEW ===')
    await roles.revertToAdmin(courseId)
    await roles.switchToTeacher(courseId)
    const teacherView = await course.analyze(courseId)
    console.log(`Sections: ${teacherView.sections.length}`)

    // 6. Take screenshots from ALL roles for each section with differences
    const screenshotDir = resolve('reports/audit')
    const sectionsToCapture = studentView.sections.filter((s) => {
      const adminSection = adminView.sections.find((as) => as.number === s.number)
      return (
        adminSection &&
        (adminSection.activities.length !== s.activities.length ||
          s.isLocked !== adminSection.isLocked)
      )
    })
    console.log(`Sections to capture (with differences): ${sectionsToCapture.length}`)

    // Admin screenshots (source of truth)
    console.log('\n=== CAPTURING ADMIN VIEW ===')
    await roles.revertToAdmin(courseId)
    console.log(`Role: ${await roles.getCurrentRoleLabel()}`)
    for (const section of sectionsToCapture) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(
        resolve(screenshotDir, `course-${courseId}-admin-section-${section.number}.png`),
      )
    }

    // Student screenshots (what the student actually sees)
    console.log('\n=== CAPTURING STUDENT VIEW ===')
    const studentOk = await roles.switchToStudentAndVerify(courseId)
    console.log(
      `Student switch OK: ${studentOk} | Role label: ${await roles.getCurrentRoleLabel()}`,
    )
    for (const section of sectionsToCapture) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(
        resolve(screenshotDir, `course-${courseId}-student-section-${section.number}.png`),
      )
    }

    // Teacher screenshots (what the non-editing teacher sees)
    console.log('\n=== CAPTURING TEACHER VIEW ===')
    await roles.revertToAdmin(courseId)
    await roles.switchToTeacher(courseId)
    console.log(`Role: ${await roles.getCurrentRoleLabel()}`)
    for (const section of sectionsToCapture) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(
        resolve(screenshotDir, `course-${courseId}-teacher-section-${section.number}.png`),
      )
    }

    // 7. Annotate test with findings
    if (criticalFindings.length > 0) {
      test.info().annotations.push({
        type: 'critical-findings',
        description: criticalFindings
          .map((f) => `[CRITICAL] ${f.sectionTitle}: ${f.message}`)
          .join('\n'),
      })
    }

    // 8. Compare admin vs student section counts (admin sees hidden content)
    if (adminView.sections.length !== studentView.sections.length) {
      test.info().annotations.push({
        type: 'visibility-gap',
        description: `Admin sees ${adminView.sections.length} sections, student sees ${studentView.sections.length} — ${adminView.sections.length - studentView.sections.length} sections hidden from students`,
      })
    }

    console.log(`\n=== AUDIT COMPLETE ===`)
    console.log(`Admin sections: ${adminView.sections.length}`)
    console.log(`Student sections: ${studentView.sections.length}`)
    console.log(`Teacher sections: ${teacherView.sections.length}`)

    // Save audit results for the custom HTML report generator
    const auditDir = resolve('reports/audit')
    mkdirSync(auditDir, { recursive: true })
    writeFileSync(
      resolve(auditDir, 'audit-results.json'),
      JSON.stringify(
        {
          courseId,
          courseName: adminView.courseName,
          timestamp: new Date().toISOString(),
          runUrl: '',
          allureUrl: '/allure/',
          adminView,
          studentView,
          teacherView,
          findings,
        },
        null,
        2,
      ),
      'utf-8',
    )
    console.log(`📊 Audit results saved to reports/audit/audit-results.json`)
  })
})
