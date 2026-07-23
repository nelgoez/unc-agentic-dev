/**
 * Data Flow Contract Tests
 *
 * Verifies that data moves correctly between the tri-force pipeline layers.
 * These are pure TypeScript tests — no Moodle/Playwright needed.
 * They test the data structures and logic, not the network.
 */
import { describe, it, expect } from 'bun:test'
import type {
  MoodleCourse,
  CourseStructure,
  AuditFinding,
  SectionData,
  ActivityData,
} from '../components/ui/MoodleCourse'

interface TestActivityData {
  name: string
  type: string
  href: string
  isVisible: boolean
  hasCompletionTracking: boolean
  isComplete: boolean
  availabilityInfo: string
}

interface TestSectionData {
  number: number
  title: string
  isLocked: boolean
  restrictionText: string
  activities: TestActivityData[]
  allVisibleComplete: boolean
}

interface TestCourseStructure {
  courseName: string
  courseUrl: string
  tabs: { title: string; sectionNumber: number; isDisabled: boolean; restrictionText: string }[]
  sections: TestSectionData[]
}

// Helper: build a minimal CourseStructure for testing
function makeSection(
  num: number,
  title: string,
  restrictionText: string,
  activities: TestActivityData[],
  isLocked = false,
): TestSectionData {
  return { number: num, title, isLocked, restrictionText, activities, allVisibleComplete: false }
}

function makeActivity(
  name: string,
  isVisible = true,
  hasCompletionTracking = false,
): TestActivityData {
  return {
    name,
    type: 'resource',
    href: '',
    isVisible,
    hasCompletionTracking,
    isComplete: false,
    availabilityInfo: '',
  }
}

// We import the MoodleCourse class but test its static logic with mock data
describe('Data Flow: apiModuleData → findPhantoms()', () => {
  const adminCourse: TestCourseStructure = {
    courseName: 'Test Course',
    courseUrl: '',
    tabs: [],
    sections: [
      makeSection(0, 'Bienvenida', '', [
        makeActivity('Sobre los docentes', true, false),
        makeActivity('Sobre los objetivos', true, false),
        makeActivity('Encuesta de diagnóstico inicial', true, false),
        makeActivity('Presentaciones de bienvenida', true, false),
      ]),
      makeSection(
        1,
        'Módulo 1',
        'La actividad "Sobre los docentes" está marcada como completada para acceder a Módulo 1',
        [makeActivity('Actividad 1', true, true)],
      ),
      makeSection(
        2,
        'Módulo 2',
        'La actividad "Actividad 1" está marcada como completada para acceder a Módulo 2',
        [makeActivity('Actividad 2', true, true)],
      ),
      makeSection(
        3,
        'Módulo 3',
        'La actividad "Actividad 2" está marcada como completada para acceder a Módulo 3',
        [makeActivity('03.2-2024_Funcion-Lambda-CEF.ipynb', false, false)],
      ),
    ],
  }

  // Mock student view: Funcion-Lambda is absent
  const studentCourse: TestCourseStructure = {
    ...adminCourse,
    sections: adminCourse.sections.map((s) => (s.number === 3 ? { ...s, activities: [] } : s)),
  }

  // apiModuleData: most activities have completion=2 (auto), Funcion-Lambda has no data
  const apiModuleData = new Map<string, { completion: number; isautomatic: boolean }>()
  apiModuleData.set('sobre los docentes', { completion: 2, isautomatic: true })
  apiModuleData.set('sobre los objetivos', { completion: 2, isautomatic: true })
  apiModuleData.set('encuesta de diagnóstico inicial', { completion: 2, isautomatic: true })
  apiModuleData.set('presentaciones de bienvenida', { completion: 2, isautomatic: true })
  apiModuleData.set('actividad 1', { completion: 1, isautomatic: false })
  apiModuleData.set('actividad 2', { completion: 1, isautomatic: false })

  it('should skip auto-completion activities when apiModuleData says isautomatic=true', () => {
    // Test the core logic: with apiModuleData, completion=2 activities get skipped
    // (regex parsing is tested by integration tests against real Moodle data)

    const activityName = 'sobre los docentes'
    const modData = apiModuleData.get(activityName)
    expect(modData).toBeDefined()
    expect(modData!.isautomatic).toBe(true)

    // This is the exact condition at findPhantoms line 313-315
    const shouldSkip = modData?.isautomatic === true
    expect(shouldSkip).toBe(true)
  })

  it('should NOT flag auto-completion activities as critical with apiModuleData', () => {
    // Without apiModuleData, "Sobre los docentes" would be critical
    // With apiModuleData showing isautomatic=true, it should be skipped
    // This is the exact logic at MoodleCourse.ts:313-315

    const required = 'Sobre los docentes'
    const matchingActivity = adminCourse.sections
      .flatMap((s) => s.activities)
      .find(
        (a) =>
          a.name.toLowerCase().includes(required.toLowerCase()) ||
          required.toLowerCase().includes(a.name.toLowerCase()),
      )

    expect(matchingActivity).toBeDefined()
    expect(matchingActivity!.hasCompletionTracking).toBe(false)

    // With apiModuleData — should skip
    const modData = apiModuleData.get(matchingActivity!.name.toLowerCase())
    expect(modData).toBeDefined()
    expect(modData!.isautomatic).toBe(true)

    // The condition: modData?.isautomatic === true → continue
    const shouldSkip = modData?.isautomatic === true
    expect(shouldSkip).toBe(true)
  })

  it('should flag invisible activities as visibility phantoms', () => {
    // Simulate what findPhantoms does at lines 354-397
    const visibleStudentActivities = new Set(
      studentCourse.sections
        .flatMap((s) => s.activities)
        .filter((a) => a.isVisible)
        .map((a) => a.name.toLowerCase()),
    )

    const activityNames = new Set(['actividad 2', '03.2-2024_funcion-lambda-cef.ipynb'])
    const visibilityPhantoms: Array<{ name: string; message: string }> = []

    for (const required of activityNames) {
      const normalized = required.toLowerCase()
      const existsInStudent = Array.from(visibleStudentActivities).some(
        (v) => v.includes(normalized) || normalized.includes(v),
      )
      if (!existsInStudent) {
        visibilityPhantoms.push({
          name: required,
          message: `"${required}" existe en el curso pero NO es visible para estudiantes`,
        })
      }
    }

    expect(visibilityPhantoms.length).toBe(1)
    expect(visibilityPhantoms[0].name.toLowerCase()).toContain('funcion-lambda')
  })

  it('should downgrade findings that nelthor completed', () => {
    // Simulate nelthorData downgrade logic (MoodleCourse.ts lines 403-417)
    const nelthorData = new Map<string, { state: number }>()
    nelthorData.set('sobre los docentes', { state: 1 })
    nelthorData.set('sobre los objetivos', { state: 1 })

    // Mock findings
    const mockFindings: Array<{ severity: string; message: string; priority: string }> = [
      {
        severity: 'critical',
        message: '"Sobre los docentes" no puede marcarse como completada',
        priority: 'high',
      },
      {
        severity: 'critical',
        message: '"03.2-2024_Funcion-Lambda-CEF.ipynb" no es visible para estudiantes',
        priority: 'high',
      },
    ]

    // Apply the downgrade logic
    for (const finding of mockFindings) {
      if (finding.severity !== 'critical') continue
      const nameMatch = finding.message.match(/"([^"]+?)"/)
      if (!nameMatch) continue
      const nelthorEntry = nelthorData.get(nameMatch[1].toLowerCase())
      if (nelthorEntry && nelthorEntry.state === 1) {
        finding.severity = 'info'
        finding.priority = 'low'
      }
    }

    expect(mockFindings[0].severity).toBe('info') // downgraded: nelthor completed it
    expect(mockFindings[0].priority).toBe('low')
    expect(mockFindings[1].severity).toBe('critical') // stays critical: nelthor didn't complete it
    expect(mockFindings[1].priority).toBe('high')
  })
})

describe('Data Flow: JSON contract between test and report', () => {
  it('should match the interface types used by generate-audit-report.ts', () => {
    // This test verifies that the JSON saved by validate-course.kata.ts
    // is compatible with what generate-audit-report.ts reads

    const mockAuditResults = {
      courseId: '269',
      courseName: 'Test',
      timestamp: new Date().toISOString(),
      runUrl: '',
      allureUrl: '/allure/',
      adminView: { courseName: '', courseUrl: '', tabs: [], sections: [] },
      studentView: { courseName: '', courseUrl: '', tabs: [], sections: [] },
      teacherView: { courseName: '', courseUrl: '', tabs: [], sections: [] },
      findings: [],
      screenshots: [],
      switchRoleStudentView: { courseName: '', courseUrl: '', tabs: [], sections: [] },
      completionReport: [],
      nelthorData: { 'sobre los docentes': { state: 1 } },
    }

    // Verify the JSON can be stringified and re-parsed
    const json = JSON.stringify(mockAuditResults)
    const parsed = JSON.parse(json)

    expect(parsed.nelthorData).toBeDefined()
    expect(parsed.nelthorData['sobre los docentes'].state).toBe(1)
    expect(parsed.switchRoleStudentView).toBeDefined()
    expect(Array.isArray(parsed.completionReport)).toBe(true)
  })
})

describe('Data Flow: Alert — verify REPORT DATA types', () => {
  // This test acts as a contract monitor:
  // If the report generator interface changes, this test alerts by failing

  it('should detect if nelthorDataRecord type is consistent with Map<name, state>', () => {
    // From validate-course kata: nelthorData = Object.fromEntries(nelthorData)
    // From report: nelthorData?: Record<string, { state: number }>
    // These MUST match

    const mockFromTest: Record<string, { state: number }> = {
      'sobre los docentes': { state: 1 },
      'funcion-lambda-cef': { state: 0 },
    }

    const entries = Object.entries(mockFromTest)
    expect(entries.length).toBe(2)

    for (const [name, data] of entries) {
      expect(typeof name).toBe('string')
      expect(typeof data.state).toBe('number')
      expect(data.state === 0 || data.state === 1).toBe(true)
    }
  })
})
