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

      console.log(`\n=== FINDINGS (from findPhantoms) ===`)
      console.log(
        `Total: ${phantoms.length} | CRITICAL: ${criticalFindings.length} | WARNING: ${warningFindings.length}`,
      )
      for (const f of phantoms) {
        console.log(`  [${f.severity.toUpperCase()}] ${f.sectionTitle}: ${f.message}`)
      }

      // Cross-reference: conditions + DB visible flag + admin-vs-student cmids
      console.log(`\n=== CONDITIONAL TREE CROSS-REFERENCE ===`)
      try {
        // Build student visible cmid set from switch-role view
        const studentVisibleCmidSet = new Set<number>()
        for (const section of switchRoleStudentView.sections) {
          for (const act of section.activities) {
            if (!act.href) continue
            const cmidMatch = act.href.match(/[?&]id=(\d+)/)
            if (cmidMatch) studentVisibleCmidSet.add(Number(cmidMatch[1]))
          }
        }
        // Build admin visible cmid set
        const adminCmidSet = new Set<number>()
        for (const section of adminView.sections) {
          for (const act of section.activities) {
            if (!act.href) continue
            const cmidMatch = act.href.match(/[?&]id=(\d+)/)
            if (cmidMatch) adminCmidSet.add(Number(cmidMatch[1]))
          }
        }
        // Collect all cmids referenced in conditions
        const breakdown = await api.getAvailabilityJsonBreakdown(courseId)
        const referencedCmidSet = new Set<number>()
        for (const section of breakdown.sections) {
          for (const mod of section.modulesWithRestrictions ?? []) {
            for (const cond of mod.conditions ?? []) {
              if (cond.type === 'completion' && cond.cm) {
                referencedCmidSet.add(cond.cm)
              }
            }
          }
        }
        // Priority: check each referenced cmid against DB visibility + student view
        for (const cmid of referencedCmidSet) {
          const modData = contents.flatMap((s) => s.modules).find((m) => m.id === cmid)
          if (!modData) continue
          const modName = modData.name
          const dbVisible = modData.visible ?? 1
          const inAdminView = adminCmidSet.has(cmid)
          const inStudentView = studentVisibleCmidSet.has(cmid)
          console.log(
            `  cmid ${cmid} "${modName}": DB visible=${dbVisible}, inAdminView=${inAdminView}, inStudentView=${inStudentView}`,
          )
          if (inAdminView && !inStudentView) {
            console.log(`  → REFERENCED CMID NOT IN STUDENT VIEW: cmid ${cmid} "${modName}"`)
            const nelthorEntry = nelthorData.get(modName.toLowerCase())
            const severity: 'critical' | 'info' = nelthorEntry?.state === 1 ? 'info' : 'critical'
            phantoms.push({
              severity,
              sectionNumber: 0,
              sectionTitle: '',
              message: `"${modName}" es requerida para progresar pero NO es accesible para estudiantes`,
              detail:
                `La actividad "${modName}" (cmid ${cmid}) es requerida por las condiciones de disponibilidad del curso, pero los estudiantes no pueden verla ni acceder a ella.` +
                (dbVisible === 0
                  ? ` En la base de datos tiene visible=0 (oculta).`
                  : ` No aparece en la vista de estudiante a pesar de ser visible en DB.`) +
                (nelthorEntry?.state === 1
                  ? ' [Nelthor completó esta actividad sin problemas antes de ser administrador.]'
                  : ''),
              priority: 'high',
              actionItem:
                'Revisar visibilidad y permisos del recurso en la configuración del curso. Si debe estar disponible para estudiantes, cambiar visible=1 o ajustar la condición de disponibilidad.',
            })
          }
        }
        // Priority 2: Check ALL admin cmids from content sections (number > 0)
        // against student view. Any activity in a real content section that admin sees
        // but student doesn't is a potential blocker.
        console.log(`\n  === ALL-CMID CROSS-REFERENCE ===`)
        const contentAdminCmidSet = new Set<number>()
        for (const section of adminView.sections) {
          if (section.number <= 0) continue
          for (const act of section.activities) {
            if (!act.href) continue
            const cmidMatch = act.href.match(/[?&]id=(\d+)/)
            if (cmidMatch) contentAdminCmidSet.add(Number(cmidMatch[1]))
          }
        }
        const alreadyFlagged = new Set<number>()
        for (const f of phantoms) {
          const cmidMatch = f.message.match(/cmid (\d+)/)
          if (cmidMatch) alreadyFlagged.add(Number(cmidMatch[1]))
        }
        for (const cmid of contentAdminCmidSet) {
          if (alreadyFlagged.has(cmid)) continue
          if (studentVisibleCmidSet.has(cmid)) continue
          const modData = contents.flatMap((s) => s.modules).find((m) => m.id === cmid)
          if (!modData) continue
          console.log(
            `  cmid ${cmid} "${modData.name}": in admin content section but NOT in student view → BLOCKER`,
          )
          const nelthorEntry = nelthorData.get(modData.name.toLowerCase())
          const severity: 'critical' | 'info' = nelthorEntry?.state === 1 ? 'info' : 'critical'
          phantoms.push({
            severity,
            sectionNumber: 0,
            sectionTitle: '',
            message: `"${modData.name}" (cmid ${cmid}) está en el curso pero NO es accesible para estudiantes`,
            detail:
              `La actividad "${modData.name}" (cmid ${cmid}) aparece en la sección de contenido del administrador, pero los estudiantes no pueden verla ni acceder a ella.` +
              (modData.visible === 0
                ? ` En la base de datos tiene visible=0 (oculta).`
                : ` No aparece en la vista de estudiante.`) +
              (nelthorEntry?.state === 1
                ? ' [Nelthor completó esta actividad sin problemas antes de ser administrador.]'
                : ''),
            priority: 'high',
            actionItem:
              'Revisar visibilidad y permisos del recurso en la configuración del curso. Si debe estar disponible para estudiantes, cambiar visible=1 o ajustar la finalización.',
          })
        }
      } catch (err) {
        console.warn('⚠️ Tree cross-reference failed:', err)
      }

      console.log(`\n=== FINDINGS (final after cross-reference) ===`)
      const finalCritical = phantoms.filter((f) => f.severity === 'critical')
      const finalWarning = phantoms.filter((f) => f.severity === 'warning')
      console.log(
        `Total: ${phantoms.length} | CRITICAL: ${finalCritical.length} | WARNING: ${finalWarning.length}`,
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
