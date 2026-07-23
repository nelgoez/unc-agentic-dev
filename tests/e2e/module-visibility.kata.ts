import { test, expect } from '@playwright/test'
import { MoodleApiClient } from '../components/api/MoodleApiClient'

const courseId = process.env.TEST_COURSE_ID || '269'
const baseUrl = process.env.MOODLE_BASE_URL ?? 'https://campus.aulavirtual.unc.edu.ar'
const wsToken = (process.env.MOODLE_WS_TOKEN ?? '').trim()

function createApi(): MoodleApiClient {
  return new MoodleApiClient(baseUrl, wsToken)
}

test.describe('Module Visibility & Completion Aggregation', () => {
  test('1 — getModuleVisibility returns correctly shaped data', async () => {
    const api = createApi()
    const modules = await api.getModuleVisibility(courseId)

    console.log(`\n=== Module Visibility for Course ${courseId} ===`)
    console.log(`Total modules: ${modules.length}`)

    expect(Array.isArray(modules)).toBe(true)
    expect(modules.length).toBeGreaterThan(0)

    for (const mod of modules) {
      expect(mod).toHaveProperty('id')
      expect(mod).toHaveProperty('name')
      expect(mod).toHaveProperty('section')
      expect(mod).toHaveProperty('sectionName')
      expect(mod).toHaveProperty('visible')
      expect(mod).toHaveProperty('uservisible')
      expect(mod).toHaveProperty('hascompletion')
      expect(mod).toHaveProperty('isautomatic')
      expect(mod).toHaveProperty('groupmode')

      expect(typeof mod.id).toBe('number')
      expect(typeof mod.name).toBe('string')
      expect(typeof mod.section).toBe('number')
      expect(typeof mod.sectionName).toBe('string')
      expect(typeof mod.visible).toBe('number')
      expect(typeof mod.uservisible).toBe('boolean')
      expect(typeof mod.hascompletion).toBe('boolean')
      expect(typeof mod.isautomatic).toBe('boolean')
      expect(typeof mod.groupmode).toBe('number')
    }

    const hiddenModules = modules.filter((m) => m.visible === 0)
    console.log(`Hidden modules (visible=0): ${hiddenModules.length}`)
    for (const hm of hiddenModules) {
      console.log(`  🚫 ${hm.name} (id: ${hm.id}) — section ${hm.section}: "${hm.sectionName}"`)
      test.info().annotations.push({
        type: 'hidden-module',
        description: `Module "${hm.name}" (cmid ${hm.id}) is hidden (visible=0) in section "${hm.sectionName}"`,
      })
    }
  })

  test('2 — getModuleVisibility returns empty array for invalid course', async () => {
    const api = createApi()
    const modules = await api.getModuleVisibility(999999)
    expect(Array.isArray(modules)).toBe(true)
    expect(modules.length).toBe(0)
  })

  test('3 — getAllStudentCompletionStatus returns correctly shaped data', async () => {
    const api = createApi()
    const aggregations = await api.getAllStudentCompletionStatus(courseId)

    console.log(`\n=== Completion Aggregation for Course ${courseId} ===`)
    console.log(`Total activities with completions: ${aggregations.length}`)

    expect(Array.isArray(aggregations)).toBe(true)

    for (const agg of aggregations) {
      expect(agg).toHaveProperty('cmid')
      expect(agg).toHaveProperty('name')
      expect(agg).toHaveProperty('sectionName')
      expect(agg).toHaveProperty('totalStudents')
      expect(agg).toHaveProperty('completedCount')
      expect(agg).toHaveProperty('completionRate')

      expect(typeof agg.cmid).toBe('number')
      expect(typeof agg.name).toBe('string')
      expect(typeof agg.sectionName).toBe('string')
      expect(typeof agg.totalStudents).toBe('number')
      expect(typeof agg.completedCount).toBe('number')
      expect(typeof agg.completionRate).toBe('number')

      expect(agg.completedCount).toBeLessThanOrEqual(agg.totalStudents)
      expect(agg.completionRate).toBeGreaterThanOrEqual(0)
      expect(agg.completionRate).toBeLessThanOrEqual(100)
    }

    console.log('\nPer-activity completion rates:')
    for (const agg of aggregations) {
      console.log(
        `  ${agg.name} (cmid: ${agg.cmid}) — ${agg.completedCount}/${agg.totalStudents} (${agg.completionRate}%)`,
      )
    }

    if (aggregations.length > 0) {
      expect(aggregations[0].totalStudents).toBeGreaterThan(0)
    }
  })

  test('4 — getAllStudentCompletionStatus returns empty for invalid course', async () => {
    const api = createApi()
    const aggregations = await api.getAllStudentCompletionStatus(999999)
    expect(Array.isArray(aggregations)).toBe(true)
    expect(aggregations.length).toBe(0)
  })
})
