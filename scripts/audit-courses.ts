import { resolve } from 'node:path'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { MoodleApiClient } from '../tests/components/api/MoodleApiClient'

const baseUrl = process.env.MOODLE_BASE_URL ?? 'https://campus.aulavirtual.unc.edu.ar'
const wsToken = (process.env.MOODLE_WS_TOKEN ?? '').trim()

if (!wsToken) {
  console.error('ERROR: MOODLE_WS_TOKEN is not set. Run with bun run opencode or set .env.')
  process.exit(1)
}

const api = new MoodleApiClient(baseUrl, wsToken)

const COURSE_IDS = [267, 265, 269, 276]
const COURSE_NAMES: Record<number, string> = {
  267: 'IA y automatización de flujos de trabajo',
  265: 'Yoga y Mindfulness para la vida cotidiana',
  269: 'Aprendiendo a caminar en Python - Certificación 1',
  276: 'Aprendiendo a caminar en Python - Certificación 2',
}

const outDir = resolve('reports/mvp-demo')
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

interface RestrictionFinding {
  activityName: string
  sectionName: string
  severity: 'critical' | 'warning' | 'info'
  conditions: Array<{ type: string; cm?: number; id?: number; min?: number; max?: number }>
  message: string
}

interface CourseAuditResult {
  name: string
  sections: number
  activities: number
  orphans: Array<{ cmid: number; sectionName: string; moduleName?: string; conditionType: string }>
  restrictions: RestrictionFinding[]
  restrictedActivitiesCount: number
  freshStudent: { created: boolean; completionEntries: number; completed: number } | null
  nelthorComparison?: {
    completionEntries: number
    completed: number
  }
  error?: string
}

interface AuditReport {
  auditDate: string
  courses: Record<string, CourseAuditResult>
  summary: {
    totalCourses: number
    coursesWithPhantoms: number
    totalRestrictions: number
    totalPhantoms: number
  }
}

function classifyRestrictions(
  conditions: Array<{ type: string; cm?: number; id?: number; min?: number; max?: number }>,
  activityName: string,
  sectionName: string,
  orphans: Array<{ cmid: number }>,
): RestrictionFinding {
  const phantomConditions = conditions.filter(
    (c) => c.type === 'completion' && c.cm && orphans.some((o) => o.cmid === c.cm),
  )
  const gradeConditions = conditions.filter((c) => c.type === 'grade')
  const normalCompletion = conditions.filter(
    (c) => c.type === 'completion' && !(c.cm && orphans.some((o) => o.cmid === c.cm)),
  )

  let severity: 'critical' | 'warning' | 'info' = 'info'
  const parts: string[] = []

  if (phantomConditions.length > 0) {
    severity = 'critical'
    parts.push(`References phantom cmid(s): ${phantomConditions.map((c) => c.cm).join(', ')}`)
  }

  for (const g of gradeConditions) {
    parts.push(`Requires min grade ${g.min ?? '?'} (grade item ${g.id})`)
  }

  for (const c of normalCompletion) {
    parts.push(`Requires completion of cmid ${c.cm}`)
  }

  const message = parts.join('; ') || `${conditions.length} condition(s)`

  return {
    activityName,
    sectionName,
    severity,
    conditions,
    message,
  }
}

async function auditCourse(courseId: number): Promise<CourseAuditResult> {
  const name = COURSE_NAMES[courseId] || `Unknown Course ${courseId}`
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Auditing Course ${courseId}: "${name}"`)
  console.log(`${'='.repeat(60)}`)

  let contents: Awaited<ReturnType<typeof api.getCourseContents>> | null = null
  let breakdown: Awaited<ReturnType<typeof api.getAvailabilityJsonBreakdown>> | null = null
  let orphans: Awaited<ReturnType<typeof api.findOrphanedCmIds>> = []
  let freshStudentResult: CourseAuditResult['freshStudent'] = null

  try {
    contents = await api.getCourseContents(courseId)
    console.log(`  Sections: ${contents.length}`)

    breakdown = await api.getAvailabilityJsonBreakdown(courseId)
    console.log(`  Activities: ${breakdown.totalActivities}`)
    console.log(`  Restricted activities: ${breakdown.restrictedActivities}`)

    orphans = await api.findOrphanedCmIds(contents)
    console.log(`  Phantoms: ${orphans.length}`)

    if (orphans.length > 0) {
      console.log(`  [CRITICAL] Phantom cmids found:`)
      for (const o of orphans) {
        console.log(
          `    cmid ${o.cmid} referenced by "${o.sectionName}"${o.moduleName ? ` (module "${o.moduleName}")` : ''}`,
        )
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  [ERROR] Failed to fetch course structure: ${msg}`)
    return {
      name,
      sections: 0,
      activities: 0,
      orphans: [],
      restrictions: [],
      restrictedActivitiesCount: 0,
      freshStudent: null,
      error: msg,
    }
  }

  const restrictions: RestrictionFinding[] = []
  if (breakdown) {
    for (const section of breakdown.sections) {
      for (const mod of section.modulesWithRestrictions) {
        const finding = classifyRestrictions(mod.conditions, mod.name, section.name, orphans)
        restrictions.push(finding)

        if (finding.severity === 'critical') {
          console.log(`  [CRITICAL] ${section.name} / ${mod.name}: ${finding.message}`)
        } else if (finding.severity === 'warning') {
          console.log(`  [WARNING] ${section.name} / ${mod.name}: ${finding.message}`)
        } else {
          console.log(`  [INFO] ${section.name} / ${mod.name}: ${finding.message}`)
        }
      }
    }
  }

  const freshUsername = `audit_student_${courseId}_${Date.now()}`
  try {
    const freshUser = await api.createUser(
      freshUsername,
      'TempPass123!',
      'Audit',
      `Student${courseId}`,
      `${freshUsername}@example.com`,
    )
    console.log(`  Fresh student created: id=${freshUser.id}, username=${freshUsername}`)

    const completion = await api.getActivitiesCompletionStatus(courseId, freshUser.id)
    const completed = completion.filter((s) => s.state === 1).length
    console.log(`  Fresh student: ${completed}/${completion.length} activities completed`)

    freshStudentResult = {
      created: true,
      completionEntries: completion.length,
      completed,
    }

    await api.deleteUsers([freshUser.id])
    console.log(`  Fresh student cleaned up: id=${freshUser.id}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`  [ERROR] Fresh student lifecycle failed: ${msg}`)
    freshStudentResult = { created: false, completionEntries: 0, completed: 0 }
  }

  const result: CourseAuditResult = {
    name,
    sections: contents?.length ?? 0,
    activities: breakdown?.totalActivities ?? 0,
    orphans,
    restrictions,
    restrictedActivitiesCount: breakdown?.restrictedActivities ?? 0,
    freshStudent: freshStudentResult,
  }

  if (courseId === 269) {
    try {
      const nelthorUsers = await api.getUsersByField('username', ['nelthor'])
      if (nelthorUsers.length > 0) {
        const nelthor = nelthorUsers[0]
        const nelthorCompletion = await api.getActivitiesCompletionStatus(courseId, nelthor.id)
        const nelthorDone = nelthorCompletion.filter((s) => s.state === 1).length
        console.log(`  nelthor: ${nelthorDone}/${nelthorCompletion.length} activities completed`)
        result.nelthorComparison = {
          completionEntries: nelthorCompletion.length,
          completed: nelthorDone,
        }
      } else {
        console.log(`  nelthor user not found`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`  [ERROR] nelthor comparison failed: ${msg}`)
    }
  }

  return result
}

async function main() {
  console.log('Multi-Course Audit — UNC Campus Virtual')
  console.log(`Date: ${new Date().toISOString()}`)
  console.log(`Courses: ${COURSE_IDS.join(', ')}`)

  const courseResults: Record<string, CourseAuditResult> = {}

  for (const id of COURSE_IDS) {
    courseResults[String(id)] = await auditCourse(id)
  }

  const totalPhantoms = Object.values(courseResults).reduce((sum, c) => sum + c.orphans.length, 0)
  const coursesWithPhantoms = Object.values(courseResults).filter(
    (c) => c.orphans.length > 0,
  ).length
  const totalRestrictions = Object.values(courseResults).reduce(
    (sum, c) => sum + c.restrictions.length,
    0,
  )

  const report: AuditReport = {
    auditDate: new Date().toISOString(),
    courses: courseResults,
    summary: {
      totalCourses: COURSE_IDS.length,
      coursesWithPhantoms,
      totalRestrictions,
      totalPhantoms,
    },
  }

  const reportPath = resolve(outDir, 'multi-course-audit.json')
  writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport saved: ${reportPath}`)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`SUMMARY`)
  console.log(`${'='.repeat(60)}`)
  for (const [id, result] of Object.entries(courseResults)) {
    const nelthorLine = result.nelthorComparison
      ? ` | nelthor: ${result.nelthorComparison.completed}/${result.nelthorComparison.completionEntries}`
      : ''
    const errorLine = result.error ? ` | ERROR: ${result.error}` : ''
    console.log(
      `Course ${id} "${result.name}":\n` +
        `  Sections: ${result.sections} | Activities: ${result.activities} | Phantoms: ${result.orphans.length} | Restrictions: ${result.restrictions.length}` +
        `\n  Fresh student: ${result.freshStudent?.completed ?? '?'}/${result.freshStudent?.completionEntries ?? '?'} completed${nelthorLine}${errorLine}`,
    )
  }
  console.log(`\nTotal phantoms across all courses: ${totalPhantoms}`)
  console.log(`Courses with phantoms: ${coursesWithPhantoms}`)
  console.log(`Total restriction conditions: ${totalRestrictions}`)
  console.log(`Done.`)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
