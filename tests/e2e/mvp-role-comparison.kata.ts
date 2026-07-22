import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { test } from '@playwright/test'
import { createFixture } from '../components/UiFixture'
import { MoodleLogin } from '../components/ui/MoodleLogin'
import { MoodleCourse } from '../components/ui/MoodleCourse'
import { MoodleUserAdmin, MoodleRole } from '../components/ui/MoodleUserAdmin'
import type { CreatedUser } from '../components/ui/MoodleUserAdmin'
import { MoodleAuditor } from '../components/ui/MoodleAuditor'

const courseId = process.env.TEST_COURSE_ID || '269'
const outDir = resolve('reports/mvp-demo')
const screenshotsDir = resolve(outDir, 'screenshots')

test.describe('MVP — Multi-Role Comparison with Fresh Test Users', () => {
  let adminLogin: MoodleLogin
  let adminCourse: MoodleCourse
  let userAdmin: MoodleUserAdmin

  let studentUser: CreatedUser
  let teacherUser: CreatedUser
  let creatorUser: CreatedUser

  test.beforeAll(async ({ page }) => {
    mkdirSync(screenshotsDir, { recursive: true })

    const { ctx } = createFixture(page)
    adminLogin = new MoodleLogin(page, ctx.env.baseUrl)
    adminCourse = new MoodleCourse(page, ctx.env.baseUrl)
    userAdmin = new MoodleUserAdmin(page, ctx.env.baseUrl)

    await adminLogin.loginAsAdmin()

    studentUser = await userAdmin.createUser('student')
    console.log(`Created student: ${studentUser.username}`)
    await userAdmin.enrolUser(courseId, studentUser, MoodleRole.Student)

    teacherUser = await userAdmin.createUser('teacher')
    console.log(`Created teacher: ${teacherUser.username}`)
    await userAdmin.enrolUser(courseId, teacherUser, MoodleRole.Teacher)

    creatorUser = await userAdmin.createUser('creator')
    console.log(`Created content creator: ${creatorUser.username}`)
    await userAdmin.enrolUser(courseId, creatorUser, MoodleRole.EditingTeacher)
  })

  test('1 — Admin view: full course structure + phantom detection', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)

    await login.loginAsAdmin()
    const view = await course.analyze(courseId)

    for (const section of view.sections) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(resolve(screenshotsDir, `admin-section-${section.number}.png`))
    }

    const findings = course.findPhantoms(view)
    const critical = findings.filter((f) => f.severity === 'critical')

    console.log(`\n=== Admin View ===`)
    console.log(`Course: "${view.courseName}" (${courseId})`)
    console.log(`Sections: ${view.sections.length}`)
    console.log(`Findings: ${findings.length} (${critical.length} critical)`)

    for (const f of findings) {
      console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`)
    }

    for (const f of critical) {
      test.info().annotations.push({
        type: 'critical',
        description: `[CRITICAL] ${f.sectionTitle}: ${f.message}\n${f.detail}`,
      })
    }

    writeFileSync(
      resolve(outDir, 'admin-view.json'),
      JSON.stringify(
        { courseName: view.courseName, courseId, sections: view.sections, findings },
        null,
        2,
      ),
    )
  })

  test('2 — Student view: what the affected user sees', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)

    await login.loginAs(studentUser.username, studentUser.password)
    await course.goToCourse(courseId)

    const tabs = await course.getTabs()
    const lockedTabs = tabs.filter((t) => t.isDisabled)
    console.log(`\n=== Student View ===`)
    console.log(`Total tabs: ${tabs.length}, Locked: ${lockedTabs.length}`)
    for (const tab of tabs) {
      console.log(
        `  Tab ${tab.sectionNumber}: "${tab.title}" locked=${tab.isDisabled}${tab.restrictionText ? ` restriction="${tab.restrictionText.substring(0, 120)}"` : ''}`,
      )
    }

    for (const tab of tabs) {
      await course.navigateToSection(tab.sectionNumber)
      await course.takeScreenshot(
        resolve(screenshotsDir, `student-section-${tab.sectionNumber}.png`),
      )
    }

    writeFileSync(
      resolve(outDir, 'student-view.json'),
      JSON.stringify({ tabs, courseUrl: page.url() }, null, 2),
    )
  })

  test('3 — Teacher view: hidden activities visible?', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)

    await login.loginAs(teacherUser.username, teacherUser.password)
    const view = await course.analyze(courseId)

    const hiddenActivities = view.sections.flatMap((s) => s.activities.filter((a) => !a.isVisible))
    console.log(`\n=== Teacher View ===`)
    console.log(
      `Total activities: ${view.sections.reduce((sum, s) => sum + s.activities.length, 0)}`,
    )
    console.log(`Hidden activities: ${hiddenActivities.length}`)
    for (const a of hiddenActivities) {
      console.log(`  Hidden: "${a.name}" (${a.type})`)
    }

    for (const section of view.sections) {
      await course.navigateToSection(section.number)
      await course.takeScreenshot(resolve(screenshotsDir, `teacher-section-${section.number}.png`))
    }

    writeFileSync(
      resolve(outDir, 'teacher-view.json'),
      JSON.stringify({ sections: view.sections }, null, 2),
    )
  })

  test('4 — Content creator (editing teacher) view: can edit?', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)

    await login.loginAs(creatorUser.username, creatorUser.password)
    await course.goToCourse(courseId)

    const editToggleVisible = await page
      .locator(
        '#region-main input[type="checkbox"][name="setmode"], .editmode-toggle input[type="checkbox"]',
      )
      .first()
      .isVisible({ timeout: 3000 })
      .catch(() => false)

    console.log(`\n=== Content Creator View ===`)
    console.log(`Edit toggle visible: ${editToggleVisible}`)
    await page.screenshot({ path: resolve(screenshotsDir, 'creator-course-landing.png') })
  })

  test('5 — Deep audit: availability JSON extraction (Strategy 3)', async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)
    const auditor = new MoodleAuditor(page, ctx.env.baseUrl)

    await login.loginAsAdmin()
    const adminView = await course.analyze(courseId)
    const jsonFindings = await auditor.analyzeAvailabilityJson(adminView)

    const critical = jsonFindings.filter((f) => f.severity === 'critical')
    const warnings = jsonFindings.filter((f) => f.severity === 'warning')

    console.log(`\n=== Deep Audit (Availability JSON) ===`)
    console.log(
      `Findings: ${jsonFindings.length} (${critical.length} critical, ${warnings.length} warnings)`,
    )

    for (const f of jsonFindings) {
      console.log(`  [${f.severity.toUpperCase()}] ${f.conditionType}: ${f.message}`)
    }

    for (const f of critical) {
      test.info().annotations.push({
        type: 'json-critical',
        description: `[JSON CRITICAL] ${f.conditionType}: ${f.message}\n${f.detail}`,
      })
    }

    writeFileSync(
      resolve(outDir, 'deep-audit.json'),
      JSON.stringify({ courseId, findings: jsonFindings }, null, 2),
    )
  })

  test.afterAll(async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const userAdminCleanup = new MoodleUserAdmin(page, ctx.env.baseUrl)

    await login.loginAsAdmin()

    for (const user of [studentUser, teacherUser, creatorUser]) {
      if (user) {
        await userAdminCleanup.deleteUser(user.username)
        console.log(`Cleaned up: ${user.username}`)
      }
    }

    console.log(`\n=== MVP Demo Complete ===`)
    console.log(`Screenshots: ${screenshotsDir}/`)
    console.log(`Data: ${outDir}/`)
  })
})
