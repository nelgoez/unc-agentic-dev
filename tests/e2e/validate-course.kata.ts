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

    const screenshotDir = resolve('reports/audit')
    mkdirSync(screenshotDir, { recursive: true })

    // 1. Login as admin (source of truth)
    await login.loginAsAdmin()
    await course.goToCourse(courseId)

    // 2. Scan as admin + take screenshots of ALL sections
    console.log('\n=== ADMIN VIEW (source of truth) ===')
    const adminView = await course.analyze(courseId)
    console.log(`Sections: ${adminView.sections.length}, Tabs: ${adminView.tabs.length}`)
    for (const section of adminView.sections) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(
        resolve(screenshotDir, `course-${courseId}-admin-section-${section.number}.png`),
      )
    }
    console.log(`Admin screenshots: ${adminView.sections.length}`)

    // 3. Switch to teacher + scan + screenshots
    console.log('\n=== TEACHER VIEW ===')
    await roles.revertToAdmin(courseId)
    await roles.switchToTeacher(courseId)
    const teacherView = await course.analyze(courseId)
    for (const section of teacherView.sections) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(
        resolve(screenshotDir, `course-${courseId}-teacher-section-${section.number}.png`),
      )
    }
    console.log(`Teacher screenshots: ${teacherView.sections.length}`)

    // 4. Switch to student + scan + screenshots
    console.log('\n=== STUDENT VIEW ===')
    await roles.revertToAdmin(courseId)
    const studentOk = await roles.switchToStudent(courseId)
    const studentView = await course.analyze(courseId)
    console.log(`Sections: ${studentView.sections.length} (switch OK: ${studentOk})`)
    for (const tab of studentView.tabs) {
      console.log(
        `  ${tab.title} section=${tab.sectionNumber} locked=${tab.isDisabled}${tab.restrictionText ? ` restriction="${tab.restrictionText}"` : ''}`,
      )
    }
    for (const section of studentView.sections) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(
        resolve(screenshotDir, `course-${courseId}-student-section-${section.number}.png`),
      )
    }
    console.log(`Student screenshots: ${studentView.sections.length}`)

    // 5. Phantom detection (use admin view — admins see restrictions as info)
    const findings = course.findPhantoms(adminView)
    const criticalFindings = findings.filter((f) => f.severity === 'critical')
    const warningFindings = findings.filter((f) => f.severity === 'warning')

    console.log(`\n=== FINDINGS ===`)
    console.log(
      `Total: ${findings.length} | CRITICAL: ${criticalFindings.length} | WARNING: ${warningFindings.length}`,
    )
    for (const f of findings) {
      console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`)
    }

    // 6. Annotations
    if (criticalFindings.length > 0) {
      test.info().annotations.push({
        type: 'critical-findings',
        description: criticalFindings
          .map((f) => `[CRITICAL] ${f.sectionTitle}: ${f.message}`)
          .join('\n'),
      })
    }
    if (adminView.sections.length !== studentView.sections.length) {
      test.info().annotations.push({
        type: 'visibility-gap',
        description: `Admin sees ${adminView.sections.length} sections, student sees ${studentView.sections.length} — ${adminView.sections.length - studentView.sections.length} hidden`,
      })
    }

    console.log(`\n=== AUDIT COMPLETE ===`)
    console.log(
      `Admin: ${adminView.sections.length} | Teacher: ${teacherView.sections.length} | Student: ${studentView.sections.length} | Findings: ${findings.length}`,
    )

    // Save results
    writeFileSync(
      resolve(screenshotDir, 'audit-results.json'),
      JSON.stringify(
        {
          courseId,
          courseName: adminView.courseName,
          timestamp: new Date().toISOString(),
          runUrl: '',
          allureUrl: '/allure/',
          adminView,
          teacherView,
          studentView,
          findings,
        },
        null,
        2,
      ),
      'utf-8',
    )
    console.log(`📊 Data saved to reports/audit/audit-results.json`)
  })
})
