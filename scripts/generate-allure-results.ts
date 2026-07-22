import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'

const RESULTS_DIR = resolve('allure-results')
const INPUT_PATH = resolve('reports/audit/api-audit-results.json')

interface ApiFinding {
  severity: string
  type: string
  section: string
  message: string
  detail: string
}

interface Progression {
  user: string
  trackedActivities: number
  alreadyComplete: number
  autoProgressed: number
}

interface DbProbeEnrollment {
  total: number
  students: number
  teachers: number
  status: string
}

interface DbProbeGradeItems {
  total: number
  status: string
}

interface DbProbeCohorts {
  total: number
  names: string[]
  status: string
}

interface ApiAuditResults {
  courseId: string
  timestamp: string
  courseName: string
  sections: number
  totalActivities: number
  restrictedActivities: number
  orphansFound: number
  apiFindings: ApiFinding[]
  progression: Progression | null
  dbProbes: {
    enrollment: DbProbeEnrollment | null
    gradeItems: DbProbeGradeItems | null
    cohorts: DbProbeCohorts | null
  }
}

interface AllureStep {
  name: string
  status: 'passed' | 'failed' | 'broken'
  stage: 'finished'
  start: number
  stop: number
}

interface AllureLabel {
  name: string
  value: string
}

interface AllureParameter {
  name: string
  value: string
}

interface AllureResult {
  name: string
  status: 'passed' | 'failed' | 'broken'
  stage: 'finished'
  description?: string
  start: number
  stop: number
  uuid: string
  historyId: string
  testCaseId: string
  fullName: string
  labels: AllureLabel[]
  parameters?: AllureParameter[]
  steps?: AllureStep[]
}

interface AllureContainer {
  uuid: string
  name: string
  children: string[]
  befores: { name: string; start: number; stop: number }[]
  afters: { name: string; start: number; stop: number }[]
}

function toStatus(severity: string): 'passed' | 'failed' | 'broken' {
  if (severity === 'critical') return 'failed'
  if (severity === 'error') return 'failed'
  if (severity === 'unavailable') return 'broken'
  return 'passed'
}

function toSeverityLabel(severity: string): string {
  if (severity === 'critical') return 'critical'
  if (severity === 'error') return 'critical'
  if (severity === 'unavailable') return 'normal'
  return 'normal'
}

function stableId(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0')
  return `${hex}-0000-0000-0000-${hex.padStart(12, '0')}`
}

function makeFindingResult(
  finding: ApiFinding,
  courseId: string,
  courseName: string,
  index: number,
  timestamp: string,
): AllureResult {
  const baseTime = new Date(timestamp).getTime()
  const uuid = randomUUID()
  const findingId = `finding-${courseId}-${index}`
  const status = toStatus(finding.severity)
  const severityLabel = toSeverityLabel(finding.severity)

  return {
    name: `Hallazgo: ${finding.message}`,
    status,
    stage: 'finished',
    description: finding.detail,
    start: baseTime + index * 100,
    stop: baseTime + index * 100 + 50,
    uuid,
    historyId: stableId(findingId),
    testCaseId: stableId(`api-${finding.type}-${courseId}-${index}`),
    fullName: `🔬 Auditoría API / ${courseName} / ${finding.section} / ${finding.message}`,
    labels: [
      { name: 'suite', value: '🔬 Auditoría API' },
      { name: 'severity', value: severityLabel },
      { name: 'courseId', value: courseId },
      { name: 'parentSuite', value: 'UNC Campus Virtual - Pipeline de Auditoría' },
      { name: 'findingType', value: finding.type },
    ],
    parameters: [
      { name: 'Curso', value: `${courseName} (${courseId})` },
      { name: 'Sección', value: finding.section },
    ],
  }
}

function makeDbProbeResult(
  name: string,
  statusStr: string,
  courseId: string,
  courseName: string,
  detail: string,
  baseTime: number,
): AllureResult {
  const uuid = randomUUID()
  const probeId = `db-${name}-${courseId}`
  const status = toStatus(statusStr)

  return {
    name: `Sonda DB: ${name}`,
    status,
    stage: 'finished',
    description: detail,
    start: baseTime,
    stop: baseTime + 50,
    uuid,
    historyId: stableId(probeId),
    testCaseId: stableId(`db-probe-${name}-${courseId}`),
    fullName: `📊 Sondas DB / ${courseName} / ${name}`,
    labels: [
      { name: 'suite', value: '📊 Sondas DB' },
      { name: 'severity', value: toSeverityLabel(statusStr) },
      { name: 'courseId', value: courseId },
      { name: 'parentSuite', value: 'UNC Campus Virtual - Pipeline de Auditoría' },
    ],
    parameters: [
      { name: 'Curso', value: `${courseName} (${courseId})` },
      { name: 'Sonda', value: name },
    ],
  }
}

function makeProgressionResult(
  progression: Progression,
  courseId: string,
  courseName: string,
  baseTime: number,
): AllureResult {
  const uuid = randomUUID()
  const progId = `progression-${courseId}`

  return {
    name: 'Progresión automática',
    status: 'passed',
    stage: 'finished',
    description: [
      `Usuario: ${progression.user}`,
      `Actividades monitoreadas: ${progression.trackedActivities}`,
      `Ya completadas: ${progression.alreadyComplete}`,
      `Auto-progresadas: ${progression.autoProgressed}`,
    ].join('\n'),
    start: baseTime,
    stop: baseTime + 50,
    uuid,
    historyId: stableId(progId),
    testCaseId: stableId(`progression-${courseId}`),
    fullName: `🔬 Auditoría API / ${courseName} / Progresión`,
    labels: [
      { name: 'suite', value: '🔬 Auditoría API' },
      { name: 'severity', value: 'normal' },
      { name: 'courseId', value: courseId },
      { name: 'parentSuite', value: 'UNC Campus Virtual - Pipeline de Auditoría' },
    ],
    parameters: [
      { name: 'Curso', value: `${courseName} (${courseId})` },
      { name: 'Usuario', value: progression.user },
    ],
  }
}

function main(): void {
  let data: ApiAuditResults
  try {
    const raw = readFileSync(INPUT_PATH, 'utf-8')
    data = JSON.parse(raw) as ApiAuditResults
  } catch (err) {
    console.error(
      `❌ No se pudo leer ${INPUT_PATH}: ${err instanceof Error ? err.message : String(err)}`,
    )
    console.error('   Ejecute primero scripts/run-api-audit.ts')
    process.exit(1)
  }

  mkdirSync(RESULTS_DIR, { recursive: true })

  const results: AllureResult[] = []
  const childUuids: string[] = []
  const baseTime = new Date(data.timestamp).getTime()

  for (let i = 0; i < data.apiFindings.length; i++) {
    const r = makeFindingResult(
      data.apiFindings[i],
      data.courseId,
      data.courseName,
      i,
      data.timestamp,
    )
    results.push(r)
    childUuids.push(r.uuid)
  }

  const probes = data.dbProbes ?? { enrollment: null, gradeItems: null, cohorts: null }

  if (probes.enrollment) {
    const p = probes.enrollment
    const detail = `Total: ${p.total} | Estudiantes: ${p.students} | Docentes: ${p.teachers} | Estado: ${p.status}`
    const r = makeDbProbeResult(
      'Enrollment',
      p.status,
      data.courseId,
      data.courseName,
      detail,
      baseTime + 1000,
    )
    results.push(r)
    childUuids.push(r.uuid)
  }

  if (probes.gradeItems) {
    const p = probes.gradeItems
    const detail = `Total: ${p.total} | Estado: ${p.status}`
    const r = makeDbProbeResult(
      'GradeItems',
      p.status,
      data.courseId,
      data.courseName,
      detail,
      baseTime + 2000,
    )
    results.push(r)
    childUuids.push(r.uuid)
  }

  if (probes.cohorts) {
    const p = probes.cohorts
    const names = p.names.length > 0 ? p.names.join(', ') : '(ninguno)'
    const detail = `Total: ${p.total} | Nombres: ${names} | Estado: ${p.status}`
    const r = makeDbProbeResult(
      'Cohorts',
      p.status,
      data.courseId,
      data.courseName,
      detail,
      baseTime + 3000,
    )
    results.push(r)
    childUuids.push(r.uuid)
  }

  if (data.progression) {
    const r = makeProgressionResult(
      data.progression,
      data.courseId,
      data.courseName,
      baseTime + 4000,
    )
    results.push(r)
    childUuids.push(r.uuid)
  }

  for (const result of results) {
    const outPath = resolve(RESULTS_DIR, `${result.uuid}-result.json`)
    writeFileSync(outPath, JSON.stringify(result, null, 2))
  }

  const container: AllureContainer = {
    uuid: randomUUID(),
    name: `Auditoría: ${data.courseName} (${data.courseId})`,
    children: childUuids,
    befores: [],
    afters: [],
  }
  writeFileSync(
    resolve(RESULTS_DIR, `${container.uuid}-container.json`),
    JSON.stringify(container, null, 2),
  )

  const failedCount = results.filter((r) => r.status === 'failed').length
  const passedCount = results.filter((r) => r.status === 'passed').length
  const brokenCount = results.filter((r) => r.status === 'broken').length

  console.log(`✅ Allure results generated: ${RESULTS_DIR}`)
  console.log(
    `   Findings: ${data.apiFindings.length} → ${data.apiFindings.filter((f) => f.severity === 'critical').length} failed, ${data.apiFindings.filter((f) => f.severity === 'info').length} passed`,
  )
  console.log(
    `   DB probes: ${[probes.enrollment, probes.gradeItems, probes.cohorts].filter(Boolean).length}`,
  )
  console.log(`   Progression: ${data.progression ? 'yes' : 'no'}`)
  console.log(
    `   Total results: ${results.length} (${passedCount} passed, ${failedCount} failed, ${brokenCount} broken)`,
  )
  console.log(`   Container: ${container.uuid}-container.json`)
}

main()
