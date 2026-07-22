import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import process from 'node:process'
import { test } from '@playwright/test'
import { createFixture } from '../components/UiFixture'
import { MoodleLogin } from '../components/ui/MoodleLogin'
import { MoodleCourse } from '../components/ui/MoodleCourse'
import { MoodleRoleSwitch, MoodleRole } from '../components/ui/MoodleRoleSwitch'
import { MoodleApiClient } from '../components/api/MoodleApiClient'
import { MoodleStudentFactory } from '../components/shared/MoodleStudentFactory'

const courseId = process.env.TEST_COURSE_ID || '269'
const moodleBaseUrl = process.env.MOODLE_BASE_URL || ''
const moodleWsToken = process.env.MOODLE_WS_TOKEN || ''

test.describe('Course Validation — Multi-Role Audit', () => {
  test(`Audit course ${courseId} across student/teacher/admin roles`, async ({ page }) => {
    const { ctx } = createFixture(page)
    const login = new MoodleLogin(page, ctx.env.baseUrl)
    const course = new MoodleCourse(page, ctx.env.baseUrl)
    const roles = new MoodleRoleSwitch(page, ctx.env.baseUrl)

    const screenshotDir = resolve('reports/audit')
    mkdirSync(screenshotDir, { recursive: true })

    let freshStudent: { userId: number; username: string; password: string } | null = null
    let factory: MoodleStudentFactory | null = null

    await test.step('0. Creación de estudiante fresco vía factory', async () => {
      await login.loginAsAdmin()
      const api = new MoodleApiClient(moodleBaseUrl, moodleWsToken)
      factory = new MoodleStudentFactory(api)
      freshStudent = await factory.createAndEnrolStudent(Number(courseId))
      if (!freshStudent) {
        console.warn('⚠️ Could not create fresh student — falling back to static student')
      }
    })

    await test.step('1. Navegación al curso como administrador', async () => {
      await course.goToCourse(courseId)
    })

    const adminView = await test.step('2. Escaneo del curso — vista administrador', async () => {
      console.log('\n=== ADMIN VIEW (source of truth) ===')
      const view = await course.analyze(courseId)
      console.log(`Sections: ${view.sections.length}, Tabs: ${view.tabs.length}`)
      return view
    })

    await test.step('3. Captura de pantallas por sección (administrador)', async () => {
      for (const section of adminView.sections) {
        await course.navigateToSection(section.number)
        await course.takeScreenshot(
          resolve(screenshotDir, `course-${courseId}-admin-section-${section.number}.png`),
        )
      }
      console.log(`Admin screenshots: ${adminView.sections.length}`)
    })

    await test.step('4. Cambio a rol docente', async () => {
      console.log('\n=== TEACHER VIEW ===')
      await roles.revertToAdmin(courseId)
      await roles.switchToTeacher(courseId)
    })

    const teacherView =
      await test.step('5. Captura de pantallas por sección (docente)', async () => {
        const view = await course.analyze(courseId)
        for (const section of view.sections) {
          await course.navigateToSection(section.number)
          await course.takeScreenshot(
            resolve(screenshotDir, `course-${courseId}-teacher-section-${section.number}.png`),
          )
        }
        console.log(`Teacher screenshots: ${view.sections.length}`)
        return view
      })

    const studentView = await test.step('6. Ingreso como estudiante fresco', async () => {
      console.log('\n=== STUDENT VIEW ===')
      if (freshStudent) {
        await login.loginAs(freshStudent.username, freshStudent.password)
      } else {
        await roles.revertToAdmin(courseId)
        await roles.switchToStudent(courseId)
      }
      const view = await course.analyze(courseId)
      console.log(`Sections: ${view.sections.length}`)
      return view
    })

    await test.step('7. Captura de pantallas por sección (estudiante)', async () => {
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
    })

    const findings = await test.step('8. Detección de actividades fantasma', async () => {
      const phantoms = course.findPhantoms(adminView)
      const criticalFindings = phantoms.filter((f) => f.severity === 'critical')
      const warningFindings = phantoms.filter((f) => f.severity === 'warning')

      console.log(`\n=== FINDINGS ===`)
      console.log(
        `Total: ${phantoms.length} | CRITICAL: ${criticalFindings.length} | WARNING: ${warningFindings.length}`,
      )
      for (const f of phantoms) {
        console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`)
      }

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
        `Admin: ${adminView.sections.length} | Teacher: ${teacherView.sections.length} | Student: ${studentView.sections.length} | Findings: ${phantoms.length}`,
      )

      return phantoms
    })

    await test.step('9. Guardado de resultados', async () => {
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

    await test.step('10. Limpieza — borrar estudiante temporal', async () => {
      if (factory && freshStudent) {
        await factory.cleanupStudent(freshStudent.userId)
        console.log(`🧹 Cleaned up student ${freshStudent.username} (ID: ${freshStudent.userId})`)
      }
    })
  })
})
