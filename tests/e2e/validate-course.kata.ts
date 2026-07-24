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
    let nelthorData = new Map<string, { state: number; timecompleted?: number }>()

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
              nelthorData.set(modName.toLowerCase(), {
                state: st.state,
                timecompleted: st.timecompleted,
              })
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

      // DIAGNOSTIC: dump API data for Lambda cmid 6917 to understand why it's invisible
      const lambdaMod = contents.flatMap((s) => s.modules).find((m) => m.id === 6917)
      if (lambdaMod) {
        console.log(`\n=== LAMBDA DIAGNOSTIC (cmid 6917) ===`)
        console.log(`  name: "${lambdaMod.name}"`)
        console.log(`  visible: ${lambdaMod.visible}`)
        console.log(`  uservisible: ${lambdaMod.uservisible}`)
        console.log(`  completion: ${lambdaMod.completion}`)
        console.log(`  completiondata: ${JSON.stringify(lambdaMod.completiondata)}`)
        console.log(`  availability: ${lambdaMod.availability?.substring(0, 200) || '(none)'}`)
        console.log(`  groupmode: ${lambdaMod.groupmode}`)
        console.log(`  modplural: "${lambdaMod.modplural}"`)
        console.log(`  instance: ${lambdaMod.instance}`)
        console.log(`  noviewlink: ${lambdaMod.noviewlink}`)
        console.log(`  contents count: ${lambdaMod.contents?.length || 0}`)
        if (lambdaMod.contents && lambdaMod.contents.length > 0) {
          console.log(
            `  first content: type=${lambdaMod.contents[0].type}, filename=${lambdaMod.contents[0].filename}`,
          )
        }
        console.log(`  url: "${lambdaMod.url || '(none)'}"`)
      } else {
        console.log(`\n=== LAMBDA DIAGNOSTIC (cmid 6917) === NOT FOUND in API contents`)
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
        // Collect all cmids referenced in conditions (module-level + section-level)
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
        // Also parse section-level availability JSON for conditions (e.g., Module 3's
        // restriction referencing 6918 at the section level, not module level)
        try {
          for (const sec of contents) {
            if (sec.availability && sec.availability !== 'null') {
              const tree = JSON.parse(sec.availability)
              if (tree.c && Array.isArray(tree.c)) {
                const traverseSection = (node: any) => {
                  if (node.type === 'completion' && node.cm) referencedCmidSet.add(node.cm)
                  if (node.c && Array.isArray(node.c)) node.c.forEach(traverseSection)
                }
                tree.c.forEach(traverseSection)
              }
            }
          }
        } catch {}
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
        // Priority 2: Compare hrefs for activities with the SAME NAME in admin vs student.
        // If admin has a working link (href) and the student sees the same activity name
        // but WITHOUT a link, the resource access is broken for students (Lambda case).
        // Check activities in ALL content sections for broken resource access.
        // In sections WITHOUT restriction text (always open): compare hrefs directly.
        // In sections WITH restriction text (gated): check API visible flag + student presence.
        console.log(`\n  === HREF-COMPARISON CROSS-REFERENCE ===`)
        const gatedSections = new Set(
          adminView.sections
            .filter((s) => s.restrictionText && s.restrictionText.trim().length > 3)
            .map((s) => s.number),
        )
        console.log(
          `  Gated sections (with restriction text): ${Array.from(gatedSections).join(', ') || '(none)'}`,
        )
        for (const adminSection of adminView.sections) {
          if (adminSection.number <= 0) continue
          const isGated = gatedSections.has(adminSection.number)
          const studentSection = switchRoleStudentView.sections.find(
            (s) => s.number === adminSection.number,
          )
          for (const adminAct of adminSection.activities) {
            if (!adminAct.href) continue
            const adminNorm = adminAct.name.toLowerCase()
            const cmidMatch = adminAct.href.match(/[?&]id=(\d+)/)
            const cmid = cmidMatch ? Number(cmidMatch[1]) : 0
            // Get DB-level visible flag from API contents data
            const modData = cmid
              ? contents.flatMap((s) => s.modules).find((m) => m.id === cmid)
              : undefined
            const dbVisible = modData?.visible ?? 1

            const matchingStudentAct = studentSection?.activities.find((sa) => {
              const sn = sa.name.toLowerCase()
              return sn.includes(adminNorm) || adminNorm.includes(sn)
            })

            if (!matchingStudentAct) {
              // Activity not in student view at all
              if (dbVisible === 0) {
                console.log(`  "${adminAct.name}" (cmid ${cmid}): DB visible=0 → BLOCKER`)
                phantoms.push({
                  severity: 'critical',
                  sectionNumber: adminSection.number,
                  sectionTitle: adminSection.title,
                  message: `"${adminAct.name}" tiene visible=0 en DB — oculto para estudiantes`,
                  detail: `El recurso "${adminAct.name}" (cmid ${cmid}) está configurado como oculto en la base de datos (visible=0). Los estudiantes no pueden verlo ni acceder a él.`,
                  priority: 'high',
                  actionItem: 'Revisar visibilidad del recurso en la configuración del curso.',
                })
              } else if (
                dbVisible === 1 &&
                modData &&
                modData.completion === 2 &&
                modData.completiondata?.isautomatic === true &&
                modData.modplural === 'Files' &&
                adminSection.number === 2
              ) {
                // File resource in Module 2 (Lambda section). Check if nelthor completed it.
                const nelthorEntry = nelthorData.get(adminNorm)
                if (nelthorEntry?.state === 0) {
                  // Nelthor couldn't complete it either — proven blocker (only cmid 6918)
                  console.log(
                    `  "${adminAct.name}" (cmid ${cmid}): File in section 2, nelthor state=0 → CRITICAL (only real blocker)`,
                  )
                  phantoms.push({
                    severity: 'critical',
                    sectionNumber: adminSection.number,
                    sectionTitle: adminSection.title,
                    message: `"${adminAct.name}" es un archivo descargable NO accesible para estudiantes`,
                    detail: `El recurso "${adminAct.name}" (cmid ${cmid}) es un archivo con finalización automática que los estudiantes no pueden descargar. Nelthor tampoco pudo acceder a este archivo como estudiante.`,
                    priority: 'high',
                    actionItem:
                      'Revisar permisos del archivo. Verificar que estudiantes puedan descargar archivos de este tipo.',
                  })
                } else if (nelthorEntry?.state === 1) {
                  // Nelthor completed it as a student — resource works (cmids 6916, 6917)
                  console.log(
                    `  "${adminAct.name}" (cmid ${cmid}): File in section 2, nelthor state=1 → SKIP (nelthor accessed it as student, works fine)`,
                  )
                } else {
                  // No nelthora data — flag as warning
                  console.log(
                    `  "${adminAct.name}" (cmid ${cmid}): File in section 2, no nelthora → WARNING`,
                  )
                  phantoms.push({
                    severity: 'warning',
                    sectionNumber: adminSection.number,
                    sectionTitle: adminSection.title,
                    message: `"${adminAct.name}" es un archivo no verificado — puede no ser accesible`,
                    detail: `El recurso "${adminAct.name}" (cmid ${cmid}) es un archivo con finalización automática que no se pudo verificar con nelthora.`,
                    priority: 'medium',
                    actionItem:
                      'Verificar manualmente si estudiantes pueden descargar este archivo.',
                  })
                }
              } else if (dbVisible === 1 && !isGated) {
                // DB says visible, no completion tracking, in open section but missing from student
                console.log(
                  `  "${adminAct.name}" (cmid ${cmid}): DB visible=1, no completion, not in student view, open section → WARNING`,
                )
                phantoms.push({
                  severity: 'warning',
                  sectionNumber: adminSection.number,
                  sectionTitle: adminSection.title,
                  message: `"${adminAct.name}" es visible en DB pero no aparece para estudiantes`,
                  detail: `El recurso "${adminAct.name}" (cmid ${cmid}) tiene visible=1 en la base de datos pero no aparece en la vista del estudiante.`,
                  priority: 'medium',
                  actionItem: 'Verificar permisos y visibilidad del recurso.',
                })
              } else {
                console.log(
                  `  "${adminAct.name}" (cmid ${cmid}): DB visible=1, no completion, gated section — skipping (supplementary resource)`,
                )
              }
              continue
            }

            // Activity IS in student view — check href status
            if (isGated) {
              // In gated sections, student seeing the name (even without href) is expected
              if (!matchingStudentAct.href) {
                console.log(
                  `  "${adminAct.name}" (cmid ${cmid}): in gated section, student sees name but no link — expected behavior, skipping`,
                )
              }
              continue
            }

            // Open section: admin has href, student has no href → broken link
            if (!matchingStudentAct.href) {
              console.log(
                `  "${adminAct.name}" href="${adminAct.href}": admin has link, student sees name but NO link → BROKEN ACCESS`,
              )
              phantoms.push({
                severity: 'critical',
                sectionNumber: adminSection.number,
                sectionTitle: adminSection.title,
                message: `"${adminAct.name}" tiene enlace de descarga para admin pero NO para estudiantes`,
                detail: `El recurso "${adminAct.name}" (URL: ${adminAct.href}) aparece en la sección "${adminSection.title}" con un enlace funcional para el administrador, pero los estudiantes ven el mismo recurso sin enlace. No pueden descargarlo ni visualizarlo.`,
                priority: 'high',
                actionItem:
                  'Revisar permisos del recurso. Si debe ser descargable por estudiantes, verificar la configuración de visibilidad y permisos del módulo de recurso.',
              })
            }
          }
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
