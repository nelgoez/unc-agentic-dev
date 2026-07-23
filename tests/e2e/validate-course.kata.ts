import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { test } from '@playwright/test'
import { MoodleApiClient } from '../components/api/MoodleApiClient'
import { MoodleStudentFactory } from '../components/shared/MoodleStudentFactory'
import { MoodleCourse } from '../components/ui/MoodleCourse'
import { MoodleLogin } from '../components/ui/MoodleLogin'
import { MoodleRoleSwitch } from '../components/ui/MoodleRoleSwitch'
import { createFixture } from '../components/UiFixture'

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
    let nelthorData = new Map<string, { state: number }>()

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

    const switchRoleStudentView =
      await test.step('4. Switch role a Estudiante — vista desde admin como estudiante', async () => {
        console.log('\n=== SWITCH ROLE STUDENT VIEW ===')
        await roles.revertToAdmin(courseId)
        await roles.switchToStudent(courseId)
        const view = await course.analyze(courseId)
        for (const section of view.sections) {
          await course.navigateToSection(section.number)
          await course.takeScreenshot(
            resolve(screenshotDir, `course-${courseId}-switchrole-section-${section.number}.png`),
          )
        }
        console.log(
          `Switch-role student: ${view.sections.length} sections, ${view.sections.reduce((s, sec) => s + sec.activities.length, 0)} activities`,
        )
        return view
      })

    await test.step('5. Cambio a rol docente', async () => {
      console.log('\n=== TEACHER VIEW ===')
      await roles.revertToAdmin(courseId)
      await roles.switchToTeacher(courseId)
    })

    const teacherView =
      await test.step('6. Captura de pantallas por sección (docente)', async () => {
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

    const studentView = await test.step('7. Ingreso como estudiante fresco', async () => {
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

    await test.step('8. Captura de pantallas por sección (estudiante)', async () => {
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

    const completionReport =
      await test.step('9. Reporte de Activity Completion (admin)', async () => {
        console.log('\n=== ACTIVITY COMPLETION REPORT ===')
        await roles.revertToAdmin(courseId)
        const report = await course.getActivityCompletionReport(courseId)
        console.log(`Activity Completion: ${report.length} activities tracked`)
        console.log(`  Students: ${report[0]?.totalStudents || 0}`)
        const neverCompleted = report.filter((r) => r.completedCount === 0)
        if (neverCompleted.length > 0) {
          console.log(
            `  Activities with 0 completions: ${neverCompleted.map((r) => r.activityName).join(', ')}`,
          )
        }
        return report
      })

    const findings = await test.step('10. Detección de actividades fantasma', async () => {
      const api = new MoodleApiClient(moodleBaseUrl, moodleWsToken)
      const contents = await api.getCourseContents(courseId)
      const apiModuleData = new Map<string, { completion: number; isautomatic: boolean }>()
      for (const section of contents) {
        for (const mod of section.modules) {
          if (mod.name) {
            apiModuleData.set(mod.name.toLowerCase(), {
              completion: mod.completion ?? 0,
              isautomatic: mod.completiondata?.isautomatic ?? false,
            })
          }
        }
      }

      nelthorData = new Map<string, { state: number }>()
      try {
        const nelthorUsers = await api.getUsersByField('username', ['nelthor'])
        if (nelthorUsers.length > 0) {
          const nelthorStatus = await api.getActivitiesCompletionStatus(
            Number(courseId),
            nelthorUsers[0].id,
          )
          for (const st of nelthorStatus) {
            const modName = contents.flatMap((s) => s.modules).find((m) => m.id === st.cmid)?.name
            if (modName !== undefined) {
              nelthorData.set(modName.toLowerCase(), { state: st.state })
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Nelthor data fetch failed:', err)
      }

      const phantoms = course.findPhantoms(
        adminView,
        switchRoleStudentView,
        apiModuleData,
        nelthorData,
      )
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

    await test.step('11. Guardado de resultados', async () => {
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
            switchRoleStudentView,
            completionReport,
            findings,
            nelthorData: Object.fromEntries(nelthorData),
          },
          null,
          2,
        ),
        'utf-8',
      )
      console.log(`📊 Data saved to reports/audit/audit-results.json`)
    })

    await test.step('12. Limpieza — borrar estudiante temporal', async () => {
      if (factory && freshStudent) {
        await factory.cleanupStudent(freshStudent.userId)
        console.log(`🧹 Cleaned up student ${freshStudent.username} (ID: ${freshStudent.userId})`)
      }
    })
  })
})
