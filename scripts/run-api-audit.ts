import { resolve } from 'node:path'
import { writeFileSync, mkdirSync } from 'node:fs'
import { MoodleApiClient } from '../tests/components/api/MoodleApiClient'

const _rawCourseId = process.env.TEST_COURSE_ID
const _rawBaseUrl = process.env.MOODLE_BASE_URL
if (!_rawCourseId) {
  console.error('❌ TEST_COURSE_ID is not set')
  process.exit(1)
}
if (!_rawBaseUrl) {
  console.error('❌ MOODLE_BASE_URL is not set')
  process.exit(1)
}
const courseId: string = _rawCourseId
const baseUrl: string = _rawBaseUrl
const wsToken = (process.env.MOODLE_WS_TOKEN ?? '').trim()

const api = new MoodleApiClient(baseUrl, wsToken)

async function main() {
  const outDir = resolve('reports/audit')
  mkdirSync(outDir, { recursive: true })

  const contents = await api.getCourseContents(courseId)
  const breakdown = await api.getAvailabilityJsonBreakdown(courseId)
  const orphans = await api.findOrphanedCmIds(contents)

  let nelthor = null
  let progression = null
  const dryRun = process.env.DRY_RUN !== 'false'
  try {
    const users = await api.getUsersByField('username', ['nelthor'])
    if (users[0]) {
      nelthor = { id: users[0].id, name: users[0].fullname }
      const status = await api.getActivitiesCompletionStatus(courseId, users[0].id)
      const tracked = status.filter((s: { tracking: number }) => s.tracking > 0)
      const incompleteMods = contents.flatMap(
        (s: { modules: Array<{ id: number; name: string }> }) =>
          s.modules
            .filter((m: { id: number }) => {
              const st = status.find((s: { cmid: number }) => s.cmid === m.id)
              return st && st.state === 0
            })
            .map((m: { id: number; name: string }) => ({ cmid: m.id, name: m.name })),
      )

      let completed = 0
      if (dryRun) {
        console.log('🧪 DRY RUN — progression skipped (set DRY_RUN=false to enable)')
      } else {
        for (const mod of incompleteMods.slice(0, 5)) {
          try {
            const r = await api.markActivityComplete(courseId, mod.cmid, users[0].id)
            if (r && (r as Record<string, unknown>).state === 1) completed++
          } catch (err) {
            console.warn(
              '⚠️ Mark activity complete failed:',
              err instanceof Error ? err.message : err,
            )
          }
        }
      }

      progression = {
        user: `${users[0].fullname} (id: ${users[0].id})`,
        trackedActivities: tracked.length,
        alreadyComplete: tracked.filter((s: { state: number }) => s.state === 1).length,
        autoProgressed: completed,
      }
    } else {
      console.warn('⚠️ User "nelthor" not found — progression data unavailable')
    }
  } catch (err) {
    console.warn('⚠️ Progression step failed:', err instanceof Error ? err.message : err)
  }

  const dbProbes: {
    enrollment: { total: number; students: number; teachers: number; status: string } | null
    gradeItems: { total: number; status: string } | null
    cohorts: { total: number; names: string[]; status: string } | null
  } = { enrollment: null, gradeItems: null, cohorts: null }

  try {
    const enrolled = await api.getEnrolledUsers(Number(courseId))
    if (enrolled && enrolled.length > 0) {
      const students = enrolled.filter((u) =>
        u.roles?.some((r) => r.shortname === 'student'),
      ).length
      const teachers = enrolled.filter((u) =>
        u.roles?.some((r) => r.shortname === 'editingteacher' || r.shortname === 'teacher'),
      ).length
      dbProbes.enrollment = { total: enrolled.length, students, teachers, status: 'ok' }
    } else {
      dbProbes.enrollment = { total: 0, students: 0, teachers: 0, status: 'unavailable' }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message.substring(0, 80) : String(err)
    console.warn('Enrollment unavailable (WS non-responsive):', msg)
    dbProbes.enrollment = { total: 0, students: 0, teachers: 0, status: 'error' }
  }

  try {
    const items = await api.getGradeItems(Number(courseId))
    dbProbes.gradeItems = { total: items?.length ?? 0, status: items ? 'ok' : 'unavailable' }
  } catch (err) {
    console.warn('⚠️ Grade items probe failed:', err instanceof Error ? err.message : err)
  }

  try {
    const cohorts = await api.searchCohorts(courseId.toString(), 1)
    dbProbes.cohorts = {
      total: cohorts?.cohorts?.length ?? 0,
      names: (cohorts?.cohorts ?? []).map((c) => c.name),
      status: cohorts ? 'ok' : 'unavailable',
    }
  } catch (err) {
    console.warn('⚠️ Cohorts probe failed:', err instanceof Error ? err.message : err)
  }

  const apiFindings: Array<{
    severity: string
    type: string
    section: string
    message: string
    detail: string
  }> = []

  for (const o of orphans) {
    apiFindings.push({
      severity: 'critical',
      type: 'api-orphan-cmid',
      section: o.sectionName,
      message: `cmid ${o.cmid} referenced in availability JSON does not exist`,
      detail: `La actividad referenciada (cmid ${o.cmid}) fue eliminada pero la condición de disponibilidad persiste en la base de datos. Los estudiantes verán este módulo como bloqueado permanentemente.`,
    })
  }

  for (const section of breakdown.sections) {
    for (const mod of section.modulesWithRestrictions) {
      for (const cond of mod.conditions) {
        if (cond.type === 'grade') {
          apiFindings.push({
            severity: 'info',
            type: 'api-grade-condition',
            section: section.name,
            message: `"${mod.name}" requiere nota mínima ${cond.min} (grade item ${cond.id})`,
            detail: `Verificar que el grade item exista y tenga datos asignados. Sin calificaciones, esta actividad nunca se desbloqueará.`,
          })
        }
        if (cond.type === 'completion' && cond.cm) {
          const exists = contents
            .flatMap((s: { modules: Array<{ id: number }> }) => s.modules)
            .some((m: { id: number }) => m.id === cond.cm)
          if (!exists) {
            apiFindings.push({
              severity: 'critical',
              type: 'api-phantom-completion',
              section: section.name,
              message: `"${mod.name}" requiere completion de cmid ${cond.cm} que no existe`,
              detail: `Actividad fantasma detectada a nivel de JSON de disponibilidad.`,
            })
          }
        }
      }
    }
  }

  const result = {
    courseId,
    timestamp: new Date().toISOString(),
    courseName: contents[0]?.name || `Curso ${courseId}`,
    sections: contents.length,
    totalActivities: breakdown.totalActivities,
    restrictedActivities: breakdown.restrictedActivities,
    orphansFound: orphans.length,
    apiFindings,
    breakdown,
    progression,
    dbProbes,
  }

  writeFileSync(resolve(outDir, 'api-audit-results.json'), JSON.stringify(result, null, 2))
  console.log(`✅ API audit results: ${resolve(outDir, 'api-audit-results.json')}`)
  console.log(`   Sections: ${result.sections}`)
  console.log(`   Activities: ${result.totalActivities}`)
  console.log(`   Orphans: ${result.orphansFound}`)
  console.log(`   Findings: ${result.apiFindings.length}`)
  if (progression) {
    console.log(
      `   Progression: ${progression.autoProgressed}/${progression.trackedActivities} auto-completed`,
    )
  }
  if (dbProbes.enrollment) {
    console.log(
      `   Enrollment: ${dbProbes.enrollment.total} users (${dbProbes.enrollment.students} students, ${dbProbes.enrollment.teachers} teachers)`,
    )
  }
  if (dbProbes.gradeItems) {
    console.log(`   Grade items: ${dbProbes.gradeItems.total}`)
  }
  if (dbProbes.cohorts) {
    console.log(`   Cohorts: ${dbProbes.cohorts.total}`)
  }
}

main().catch((err) => {
  console.error('❌ API audit failed:', err.message)
  process.exit(1)
})
