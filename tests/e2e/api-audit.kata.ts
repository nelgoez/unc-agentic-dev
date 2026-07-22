import { test, expect } from '@playwright/test'
import { MoodleApiClient } from '../components/api/MoodleApiClient'

const courseId = process.env.TEST_COURSE_ID || '269'
const baseUrl = process.env.MOODLE_BASE_URL ?? 'https://campus.aulavirtual.unc.edu.ar'
const wsToken = (process.env.MOODLE_WS_TOKEN ?? '').trim()

function createApi(): MoodleApiClient {
  return new MoodleApiClient(baseUrl, wsToken)
}

test.describe('REST API Audit — Zero Navigation Deep Scan', () => {
  test('1 — Fetch course contents + availability JSON in one request', async () => {
    const api = createApi()
    const sections = await api.getCourseContents(courseId)

    console.log(`\n=== Course ${courseId} ===`)
    console.log(`Sections: ${sections.length}`)

    for (const section of sections) {
      console.log(`\n  Section ${section.section}: "${section.name}"`)
      console.log(`    Modules: ${section.modules.length}`)
      console.log(
        `    Has section restriction: ${!!(section.availability && section.availability !== 'null')}`,
      )

      for (const mod of section.modules) {
        if (mod.availability && mod.availability !== 'null') {
          console.log(`    🔒 ${mod.name} (cmid: ${mod.id}) — has availability conditions`)
        }
      }
    }

    expect(sections.length).toBeGreaterThan(0)
  })

  test('2 — Find orphaned cmids from availability JSON', async () => {
    const api = createApi()
    const sections = await api.getCourseContents(courseId)
    const orphans = await api.findOrphanedCmIds(sections)

    console.log(`\n=== Orphaned cmids ===`)
    console.log(`Total referenced in availability JSON but do NOT exist: ${orphans.length}`)

    for (const o of orphans) {
      console.log(
        `  🚨 cmid ${o.cmid} referenced by "${o.sectionName}"${o.moduleName ? ` (via module "${o.moduleName}")` : ''} — ${o.conditionType} condition`,
      )
      test.info().annotations.push({
        type: 'orphan-cmid',
        description: `Phantom cmid ${o.cmid} in section "${o.sectionName}"${o.moduleName ? `, module "${o.moduleName}"` : ''}. Referenced in availability JSON but no matching activity exists.`,
      })
    }
  })

  test('3 — Get availability breakdown (all restrictions at a glance)', async () => {
    const api = createApi()
    const breakdown = await api.getAvailabilityJsonBreakdown(courseId)

    console.log(`\n=== Availability Breakdown ===`)
    console.log(`Total activities: ${breakdown.totalActivities}`)
    console.log(`Activities with restrictions: ${breakdown.restrictedActivities}`)

    for (const section of breakdown.sections) {
      console.log(`\n  Section ${section.section}: "${section.name}"`)
      console.log(`    Activities: ${section.moduleCount}`)
      console.log(`    Section-level restrictions: ${section.hasSectionRestriction}`)
      console.log(`    Restricted modules: ${section.modulesWithRestrictions.length}`)

      for (const mod of section.modulesWithRestrictions) {
        console.log(`      🔒 ${mod.name} (cmid: ${mod.id})`)
        for (const cond of mod.conditions) {
          console.log(
            `        - type: ${cond.type}${cond.cm ? `, requires cm: ${cond.cm}` : ''}${cond.id ? `, grade item: ${cond.id}` : ''}${cond.min !== undefined ? `, min: ${cond.min}` : ''}`,
          )
        }
      }
    }
  })

  test('4 — Auto-progression: mark activities complete via REST API', async () => {
    const api = createApi()
    const sections = await api.getCourseContents(courseId)

    const adminUsers = await api.getUsersByField('username', ['nelthor'])
    const nelthor = adminUsers[0]

    expect(nelthor).toBeDefined()
    console.log(`\nUser: ${nelthor.fullname} (id: ${nelthor.id})`)

    const beforeStatus = await api.getActivitiesCompletionStatus(courseId, nelthor.id)

    const incompleteModules = sections.flatMap((s) =>
      s.modules
        .filter((m) => {
          const status = beforeStatus.find((st) => st.cmid === m.id)
          return status && status.state === 0 && m.completion > 0
        })
        .map((m) => ({ cmid: m.id, name: m.name, section: s.section })),
    )

    console.log(`Incomplete tracked activities: ${incompleteModules.length}`)

    let completed = 0
    for (const mod of incompleteModules.slice(0, 5)) {
      try {
        const result = await api.markActivityComplete(courseId, mod.cmid, nelthor.id)
        if (result && result.state === 1) {
          console.log(`  ✅ Marked "${mod.name}" (cmid ${mod.cmid}) complete`)
          completed++
        }
      } catch (err) {
        console.log(
          `  ❌ Failed to mark "${mod.name}": ${err instanceof Error ? err.message : err}`,
        )
      }
    }

    console.log(`\nAuto-progressed ${completed} activities for user ${nelthor.fullname}`)

    if (completed > 0) {
      const afterStatus = await api.getActivitiesCompletionStatus(courseId, nelthor.id)
      const nowComplete = afterStatus.filter(
        (st) => beforeStatus.find((bs) => bs.cmid === st.cmid)?.state === 0 && st.state === 1,
      )
      console.log(`Verified: ${nowComplete.length} activities now complete`)
    }
  })
})
